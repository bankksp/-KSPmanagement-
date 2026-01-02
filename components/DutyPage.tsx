
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DutyRecord, Personnel, Settings } from '../types';
import { 
    getCurrentThaiDate, 
    formatThaiDate, 
    buddhistToISO, 
    isoToBuddhist, 
    getDirectDriveImageSrc,
    formatOnlyTime,
    normalizeDate,
    getFirstImageSource
} from '../utils';

interface DutyPageProps {
    currentUser: Personnel;
    records: DutyRecord[];
    onSave: (record: DutyRecord) => void;
    onDelete: (ids: number[]) => void;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
    isSaving: boolean;
}

const DutyPage: React.FC<DutyPageProps> = ({ 
    currentUser, records, onSave, onDelete, settings, onSaveSettings, isSaving 
}) => {
    const [activeTab, setActiveTab] = useState<'checkin' | 'list' | 'settings'>('checkin');
    const [cameraActive, setCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    
    // Local settings state
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    
    // Check-in location state
    const [currentGeo, setCurrentGeo] = useState<{ lat: number, lng: number, distance: number } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [checkInType, setCheckInType] = useState<'check_in' | 'check_out'>('check_in');

    // List Filtering State
    const [searchName, setSearchName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isAdmin = currentUser.role === 'admin';

    // Sync local settings when props change
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Effect to attach stream when video element is ready
    useEffect(() => {
        if (cameraActive && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(e => console.error("Video play failed", e));
            };
        }
    }, [cameraActive, cameraStream]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; 
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            setCameraStream(stream);
            setCameraActive(true);
            setCapturedImage(null);
        } catch (err) { 
            alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง'); 
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setCameraActive(false);
    };

    const captureFace = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.save();
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                context.restore();
                setCapturedImage(canvas.toDataURL('image/jpeg', 0.7));
                stopCamera();
            }
        }
    };

    const verifyLocation = () => {
        if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ GPS'); return; }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const dist = calculateDistance(lat, lng, settings.schoolLat || 16.4322, settings.schoolLng || 103.5061);
                setCurrentGeo({ lat, lng, distance: dist });
                setIsLocating(false);
            },
            () => { alert('ระบุตำแหน่งไม่ได้ กรุณาเปิด GPS'); setIsLocating(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleConfirmCheckIn = () => {
        if (!currentGeo) { alert('กรุณายืนยันพิกัด GPS ก่อนบันทึก'); return; }
        setIsProcessing(true);
        const status = currentGeo.distance <= (settings.checkInRadius || 200) ? 'within_range' : 'out_of_range';
        
        if (status === 'out_of_range' && !window.confirm(`อยู่นอกระยะ (${currentGeo.distance} ม.) ยืนยันลงชื่อหรือไม่?`)) {
            setIsProcessing(false); return;
        }
        
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
        
        onSave({
            id: Date.now(),
            date: getCurrentThaiDate(),
            time: timeStr,
            personnelId: currentUser.id,
            personnelName: `${title}${currentUser.personnelName}`,
            type: checkInType,
            latitude: currentGeo.lat,
            longitude: currentGeo.lng,
            distance: currentGeo.distance,
            image: capturedImage || '',
            status: status
        });
        
        alert('บันทึกเวลาปฏิบัติหน้าที่สำเร็จ');
        setIsProcessing(false); 
        setCapturedImage(null); 
        setCurrentGeo(null); 
        stopCamera();
    };

    const handleAdminGetLocation = () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ไม่รองรับ GPS');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocalSettings(prev => ({
                    ...prev,
                    schoolLat: pos.coords.latitude,
                    schoolLng: pos.coords.longitude
                }));
                alert('ดึงพิกัดปัจจุบันเรียบร้อย');
            },
            () => alert('ไม่สามารถระบุตำแหน่งได้')
        );
    };

    const handleSaveLocalSettings = () => {
        onSaveSettings(localSettings);
        alert('บันทึกการตั้งค่าพิกัดเรียบร้อย');
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesName = (r.personnelName || '').toLowerCase().includes(searchName.toLowerCase());
            const recordDateObj = normalizeDate(r.date);
            const recordTime = recordDateObj?.getTime() || 0;
            const startLimit = startDate ? new Date(startDate).getTime() : 0;
            const endLimit = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
            const matchesDate = recordTime >= startLimit && recordTime <= endLimit;
            return matchesName && matchesDate;
        }).sort((a, b) => b.id - a.id);
    }, [records, searchName, startDate, endDate]);

    const handleExportExcel = () => {
        const header = ['วันที่', 'เวลา', 'ชื่อ-นามสกุล', 'ประเภท', 'พิกัด Latitude', 'พิกัด Longitude', 'ระยะห่าง (ม.)', 'สถานะพิกัด'];
        const rows = filteredRecords.map(r => [
            r.date,
            r.time,
            r.personnelName,
            r.type === 'check_in' ? 'เริ่มงาน' : 'เลิกงาน',
            r.latitude,
            r.longitude,
            r.distance,
            r.status === 'within_range' ? 'ในระยะ' : 'นอกระยะ'
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += header.map(h => `"${h}"`).join(",") + "\r\n";
        
        rows.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ประวัติการลงเวลา_${getCurrentThaiDate().replace(/\//g,'-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 font-sarabun pb-20">
            {/* Nav Tabs */}
            <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 w-fit no-print flex-wrap gap-1 shadow-sm mx-auto">
                <button onClick={() => setActiveTab('checkin')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'checkin' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>ลงเวลาปฏิบัติงาน</button>
                <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>ประวัติปฏิบัติหน้าที่</button>
                {isAdmin && (
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>ตั้งค่าพิกัดโรงเรียน</button>
                )}
            </div>

            {/* CHECK-IN TAB (Updated to match design) */}
            {activeTab === 'checkin' && (
                <div className="max-w-xl mx-auto animate-fade-in px-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden relative border-t-8 border-blue-500">
                        <div className="p-8 pt-10 flex flex-col items-center">
                            {/* Title & Subtitle */}
                            <h2 className="text-3xl font-black text-navy text-center mb-1">ลงเวลาปฏิบัติหน้าที่</h2>
                            <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] mb-10 text-center uppercase">Identity & Location Verified</p>

                            {/* Camera Area */}
                            <div className="w-full aspect-[3/4] bg-[#0F172A] rounded-[2.5rem] overflow-hidden relative mb-8 flex flex-col items-center justify-center group shadow-xl">
                                {capturedImage ? (
                                    <img src={capturedImage} className="w-full h-full object-cover transform -scale-x-100" alt="Identity Preview" />
                                ) : cameraActive ? (
                                    <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" autoPlay playsInline muted />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-10 text-center">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-white/20">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    </div>
                                )}
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Camera Toggle / Capture Button */}
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full px-10">
                                    {!capturedImage && !cameraActive ? (
                                        <button 
                                            onClick={startCamera}
                                            className="w-full bg-white text-navy font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-base flex items-center justify-center"
                                        >
                                            เปิดกล้องยืนยันตัวตน
                                        </button>
                                    ) : cameraActive ? (
                                        <button 
                                            onClick={captureFace}
                                            className="w-full bg-white text-navy font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-base flex items-center justify-center"
                                        >
                                            ถ่ายรูปยืนยันตัวตน
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={startCamera}
                                            className="w-full bg-white/20 backdrop-blur-md text-white border border-white/30 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-base flex items-center justify-center"
                                        >
                                            ถ่ายใหม่
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* GPS Verify Button */}
                            <button 
                                onClick={verifyLocation}
                                disabled={isLocating}
                                className={`w-full py-5 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all border-2 mb-6 ${currentGeo ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-blue-600 border-blue-500 hover:bg-blue-50'}`}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {isLocating ? 'กำลังค้นหาพิกัด...' : currentGeo ? `ยืนยันพิกัดเรียบร้อย (${currentGeo.distance} ม.)` : 'กดปุ่มยืนยันพิกัด GPS'}
                            </button>

                            {/* Start/End Duty Toggle Pills */}
                            <div className="w-full flex bg-gray-100/80 p-1.5 rounded-2xl mb-8">
                                <button 
                                    onClick={() => setCheckInType('check_in')} 
                                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${checkInType === 'check_in' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-400'}`}
                                >
                                    เริ่มปฏิบัติหน้าที่
                                </button>
                                <button 
                                    onClick={() => setCheckInType('check_out')} 
                                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${checkInType === 'check_out' ? 'bg-white text-rose-600 shadow-md scale-105' : 'text-gray-400'}`}
                                >
                                    สิ้นสุดหน้าที่
                                </button>
                            </div>

                            {/* Final Confirm Button */}
                            <button 
                                onClick={handleConfirmCheckIn}
                                disabled={isProcessing || !capturedImage || !currentGeo}
                                className={`w-full py-5 rounded-3xl font-black text-lg transition-all active:scale-[0.98] ${
                                    isProcessing || !capturedImage || !currentGeo 
                                    ? 'bg-[#E5E7EB] text-[#9CA3AF]' 
                                    : 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 hover:bg-blue-700'
                                }`}
                            >
                                {isProcessing ? 'กำลังบันทึก...' : 'ยืนยันบันทึกเวลา'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST TAB */}
            {activeTab === 'list' && (
                <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end no-print">
                        <div className="flex-grow min-w-[200px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">ค้นหาชื่อบุคลากร</label>
                            <input type="text" placeholder="พิมพ์ชื่อเพื่อค้นหา..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-blue outline-none font-bold" />
                        </div>
                        <button 
                            onClick={handleExportExcel}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Export Excel
                        </button>
                    </div>

                    <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[900px]">
                                <thead className="bg-gray-50 text-gray-400 font-black border-b border-gray-100 uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="p-8">รูปภาพ</th>
                                        <th className="p-8">วัน/เวลา</th>
                                        <th className="p-8">ชื่อ-นามสกุล</th>
                                        <th className="p-8">ประเภท</th>
                                        <th className="p-8">ระยะห่าง</th>
                                        {isAdmin && <th className="p-8 text-center">จัดการ</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredRecords.map(r => (
                                        <tr key={r.id} className="hover:bg-blue-50/30 transition-all font-bold">
                                            <td className="p-8">
                                                <div className="w-12 h-14 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                                                    {r.image ? (
                                                        <img src={getDirectDriveImageSrc(r.image)} className="w-full h-full object-cover" />
                                                    ) : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 italic">N/A</div>}
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="text-gray-400 text-[11px] leading-tight mb-1">{r.date}</div>
                                                <div className="text-navy text-base">{formatOnlyTime(r.time)} น.</div>
                                            </td>
                                            <td className="p-8">
                                                <div className="text-navy text-base leading-tight">{r.personnelName}</div>
                                            </td>
                                            <td className="p-8">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest border ${r.type === 'check_in' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    {r.type === 'check_in' ? 'เริ่มงาน' : 'เลิกงาน'}
                                                </span>
                                            </td>
                                            <td className="p-8">
                                                <div className={`text-sm ${r.status === 'within_range' ? 'text-emerald-600' : 'text-rose-500'}`}>{r.distance} ม.</div>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-8 text-center">
                                                    <button onClick={() => onDelete([r.id])} className="p-2 text-rose-300 hover:text-rose-600 transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && isAdmin && (
                <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 animate-fade-in no-print">
                    <h3 className="text-2xl font-black text-navy mb-8">ตั้งค่าพิกัดโรงเรียน (GPS Center)</h3>
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Latitude</label><input type="number" step="any" value={localSettings.schoolLat} onChange={e => setLocalSettings({...localSettings, schoolLat: parseFloat(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold" /></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Longitude</label><input type="number" step="any" value={localSettings.schoolLng} onChange={e => setLocalSettings({...localSettings, schoolLng: parseFloat(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold" /></div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">ระยะอนุญาต (เมตร)</label>
                            <input type="number" value={localSettings.checkInRadius} onChange={e => setLocalSettings({...localSettings, checkInRadius: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold" />
                        </div>
                        <div className="pt-6 flex gap-4">
                            <button onClick={handleAdminGetLocation} className="flex-1 py-4 bg-white border-2 border-blue-500 text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all">ดึงพิกัดปัจจุบัน</button>
                            <button onClick={handleSaveLocalSettings} disabled={isSaving} className="flex-[2] py-4 bg-navy text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-900 transition-all">{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DutyPage;
