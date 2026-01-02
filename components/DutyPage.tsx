
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DutyRecord, Personnel, Settings } from '../types';
import { 
    getCurrentThaiDate, 
    formatThaiDate, 
    buddhistToISO, 
    isoToBuddhist, 
    getDirectDriveImageSrc,
    formatOnlyTime,
    normalizeDate
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
    
    // Local settings state to prevent constant API calls
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    
    // Check-in location state
    const [currentGeo, setCurrentGeo] = useState<{ lat: number, lng: number, distance: number } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [checkInType, setCheckInType] = useState<'check_in' | 'check_out'>('check_in');

    // List Filtering State
    const [searchName, setSearchName] = useState('');
    const [filterPos, setFilterPos] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isAdmin = currentUser.role === 'admin';

    // Sync local settings when props change
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // --- Effect to attach stream when video element is ready ---
    useEffect(() => {
        if (cameraActive && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(e => console.error("Video play failed", e));
            };
        }
    }, [cameraActive, cameraStream]);

    // --- Filtering Logic ---
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesName = r.personnelName.toLowerCase().includes(searchName.toLowerCase());
            
            const recordDateObj = normalizeDate(r.date);
            const recordTime = recordDateObj?.getTime() || 0;
            const startLimit = startDate ? new Date(startDate).getTime() : 0;
            const endLimit = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
            
            const matchesDate = recordTime >= startLimit && recordTime <= endLimit;
            const matchesPos = !filterPos || r.personnelName.includes(filterPos);

            return matchesName && matchesDate && matchesPos;
        }).sort((a, b) => b.id - a.id);
    }, [records, searchName, filterPos, startDate, endDate]);

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
        onSave({
            id: Date.now(),
            date: getCurrentThaiDate(),
            time: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
            personnelId: currentUser.id,
            personnelName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
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
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition((pos) => {
            setLocalSettings(prev => ({ ...prev, schoolLat: pos.coords.latitude, schoolLng: pos.coords.longitude }));
            setIsLocating(false);
            alert('ดึงพิกัดสำเร็จ อย่าลืมกดปุ่ม "บันทึกการตั้งค่า" ด้านล่าง');
        }, () => setIsLocating(false));
    };

    const handleSaveLocalSettings = () => {
        onSaveSettings(localSettings);
    };

    useEffect(() => { return () => stopCamera(); }, []);

    return (
        <div className="space-y-6 animate-fade-in font-sarabun pb-10">
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print border border-gray-100">
                <button onClick={() => setActiveTab('checkin')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'checkin' ? 'bg-primary-blue text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                    ลงเวลาปฏิบัติงาน
                </button>
                <button onClick={() => setActiveTab('list')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                    ประวัติปฏิบัติหน้าที่
                </button>
                {isAdmin && (
                    <button onClick={() => setActiveTab('settings')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                        ตั้งค่าพิกัดโรงเรียน
                    </button>
                )}
            </div>

            {activeTab === 'checkin' && (
                <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <h2 className="text-2xl font-black text-navy mb-1">ลงเวลาปฏิบัติหน้าที่</h2>
                        <p className="text-[10px] text-gray-400 mb-8 uppercase tracking-widest font-black">Identity & Location Verified</p>

                        <div className="relative aspect-[3/4] w-full max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border-4 border-white mb-8 group">
                            {!cameraActive && !capturedImage && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 space-y-4">
                                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                                        <svg className="w-10 h-10 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                    <button onClick={startCamera} className="bg-white text-navy px-8 py-3 rounded-full font-black text-sm shadow-xl hover:bg-blue-50 transition-all active:scale-95">เปิดกล้องยืนยันตัวตน</button>
                                </div>
                            )}

                            {cameraActive && (
                                <div className="w-full h-full relative">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        <div className="w-full h-1 bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)] absolute animate-scan-line"></div>
                                        <div className="absolute inset-0 border-[40px] border-slate-900/40 rounded-full"></div>
                                    </div>
                                    <button onClick={captureFace} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/90 text-navy p-4 rounded-full shadow-2xl backdrop-blur-sm transition-transform active:scale-90 border-2 border-white">
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                            )}

                            {capturedImage && (
                                <div className="relative w-full h-full animate-fade-in z-20 bg-black">
                                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                                    <button onClick={() => { setCapturedImage(null); startCamera(); }} className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 mb-8">
                            <button onClick={verifyLocation} disabled={isLocating} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 border-2 transition-all ${currentGeo ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-blue-500 text-blue-600'}`}>
                                {isLocating ? <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                {currentGeo ? 'ยืนยันพิกัด GPS สำเร็จ ✓' : 'กดปุ่มยืนยันพิกัด GPS'}
                            </button>
                            {currentGeo && (
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center animate-slide-up">
                                    <p className="text-xs font-bold text-blue-900">ระยะห่างจากศูนย์กลางโรงเรียน: {currentGeo.distance} เมตร</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                                <button onClick={() => setCheckInType('check_in')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${checkInType === 'check_in' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>เริ่มปฏิบัติหน้าที่</button>
                                <button onClick={() => setCheckInType('check_out')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${checkInType === 'check_out' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>สิ้นสุดหน้าที่</button>
                            </div>
                            <button onClick={handleConfirmCheckIn} disabled={isProcessing || !currentGeo} className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${isProcessing ? 'bg-slate-300' : (!currentGeo ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : (checkInType === 'check_in' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'))}`}>
                                {isProcessing ? 'กำลังประมวลผล...' : 'ยืนยันบันทึกเวลา'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-fade-in no-print">
                    <h2 className="text-xl font-black text-navy mb-6">ประวัติปฏิบัติหน้าที่</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-4">รูปภาพ</th>
                                    <th className="p-4">วัน/เวลา</th>
                                    <th className="p-4">ชื่อ-นามสกุล</th>
                                    <th className="p-4">รายการ</th>
                                    <th className="p-4">ระยะห่าง</th>
                                    <th className="p-4">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                                        <td className="p-3">
                                            <div className="w-12 h-14 bg-slate-100 rounded overflow-hidden border">
                                                {r.image ? <img src={getDirectDriveImageSrc(r.image as string)} className="w-full h-full object-cover" /> : null}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col text-xs md:text-sm">
                                                <span className="font-medium text-gray-500 leading-tight mb-1">{formatThaiDate(r.date)}</span>
                                                <span className="font-bold text-navy">{formatOnlyTime(r.time)} น.</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold">{r.personnelName}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${r.type === 'check_in' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-rose-100 text-rose-600 border border-rose-200'}`}>{r.type === 'check_in' ? 'เริ่มงาน' : 'เลิกงาน'}</span></td>
                                        <td className="p-4">{r.distance} ม.</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${r.status === 'within_range' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{r.status === 'within_range' ? 'ในเขต' : 'นอกเขต'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && isAdmin && (
                <div className="max-w-lg mx-auto bg-white p-8 rounded-[2.5rem] shadow-2xl border animate-fade-in">
                    <h2 className="text-2xl font-black text-purple-900 mb-6 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-xl text-purple-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                        ตั้งค่าพิกัดโรงเรียน
                    </h2>

                    <div className="space-y-6">
                        <div className="bg-purple-600 p-6 rounded-2xl shadow-lg text-white">
                            <p className="text-xs font-bold opacity-80 mb-3">ดึงตำแหน่งปัจจุบันอัตโนมัติ</p>
                            <button onClick={handleAdminGetLocation} disabled={isLocating} className="w-full bg-white text-purple-700 font-black py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50">
                                {isLocating ? 'กำลังค้นหา...' : 'ดึงพิกัดที่ฉันยืนอยู่ตอนนี้'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">Latitude</label>
                                <input type="number" step="0.000001" value={localSettings.schoolLat || ''} onChange={e => setLocalSettings({...localSettings, schoolLat: parseFloat(e.target.value)})} className="w-full border rounded-xl px-4 py-3 font-mono text-sm" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">Longitude</label>
                                <input type="number" step="0.000001" value={localSettings.schoolLng || ''} onChange={e => setLocalSettings({...localSettings, schoolLng: parseFloat(e.target.value)})} className="w-full border rounded-xl px-4 py-3 font-mono text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">ระยะรัศมีที่อนุญาต (เมตร)</label>
                            <input type="number" value={localSettings.checkInRadius || ''} onChange={e => setLocalSettings({...localSettings, checkInRadius: parseInt(e.target.value)})} className="w-full border rounded-xl px-4 py-3 font-bold" />
                        </div>

                        <button 
                            onClick={handleSaveLocalSettings} 
                            disabled={isSaving}
                            className="w-full bg-purple-700 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-purple-800 transition-all disabled:opacity-50"
                        >
                            {isSaving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการตั้งค่า'}
                        </button>
                    </div>
                </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default DutyPage;
