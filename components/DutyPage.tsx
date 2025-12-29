
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
    parseThaiDateForSort
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
    
    // Check-in location state
    const [currentGeo, setCurrentGeo] = useState<{ lat: number, lng: number, distance: number } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [checkInType, setCheckInType] = useState<'check_in' | 'check_out'>('check_in');

    // List Filtering State
    const [searchName, setSearchName] = useState('');
    const [filterPos, setFilterPos] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isAdmin = currentUser.role === 'admin';

    // --- Formatting Helpers for Table ---
    const displayDate = (dateVal: string) => formatThaiDate(dateVal);
    const displayTime = (timeVal: string) => formatOnlyTime(timeVal);

    // --- Filtering Logic ---
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            // Name search
            const matchesName = r.personnelName.toLowerCase().includes(searchName.toLowerCase());
            
            // Date Range
            const recordTime = normalizeDate(r.date)?.getTime() || 0;
            const startLimit = startDate ? new Date(startDate).getTime() : 0;
            const endLimit = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
            const matchesDate = recordTime >= startLimit && recordTime <= endLimit;

            // Position (requires finding personnel info or searching text if position is in name)
            const matchesPos = !filterPos || r.personnelName.toLowerCase().includes(filterPos.toLowerCase());

            return matchesName && matchesDate && matchesPos;
        }).sort((a, b) => b.id - a.id);
    }, [records, searchName, filterPos, startDate, endDate]);

    // Haversine formula
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
                video: { 
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            if (videoRef.current) { 
                videoRef.current.srcObject = stream; 
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setCameraActive(true);
                };
            }
        } catch (err) { 
            alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึง'); 
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setCameraActive(false);
        }
    };

    const captureFace = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                // Flip horizontally for natural mirror image
                context.translate(canvasRef.current.width, 0);
                context.scale(-1, 1);
                context.drawImage(videoRef.current, 0, 0);
                setCapturedImage(canvasRef.current.toDataURL('image/jpeg', 0.8));
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
        if (!currentGeo) { alert('กรุณายืนยันพิกัด GPS'); return; }
        setIsProcessing(true);
        
        // Final capture
        if (cameraActive) captureFace();

        setTimeout(() => {
            const status = currentGeo.distance <= (settings.checkInRadius || 200) ? 'within_range' : 'out_of_range';
            if (status === 'out_of_range' && !window.confirm(`อยู่นอกระยะ (${currentGeo.distance} ม.) ยืนยันหรือไม่?`)) {
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
            alert('บันทึกข้อมูลเรียบร้อย');
            setIsProcessing(false); setCapturedImage(null); setCurrentGeo(null); stopCamera();
        }, 1000);
    };

    // --- Export Functions ---
    const exportExcel = () => {
        setIsExportMenuOpen(false);
        const header = ['วันที่', 'เวลา', 'ชื่อ-นามสกุล', 'รายการ', 'พิกัด Lat', 'พิกัด Lng', 'ระยะห่าง(เมตร)', 'สถานะ'];
        const rows = filteredRecords.map(r => [
            `"${displayDate(r.date)}"`, 
            `"${displayTime(r.time)} น."`, 
            `"${r.personnelName}"`, 
            `"${r.type === 'check_in' ? 'เริ่มปฏิบัติหน้าที่' : 'สิ้นสุดหน้าที่'}"`,
            r.latitude,
            r.longitude,
            r.distance, 
            `"${r.status === 'within_range' ? 'ในเขต' : 'นอกเขต'}"`
        ]);
        let csv = "data:text/csv;charset=utf-8,\uFEFF" + header.join(",") + "\n";
        rows.forEach(row => { csv += row.join(",") + "\n"; });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", `DutyReport_${getCurrentThaiDate().replace(/\//g,'-')}.csv`);
        link.click();
    };

    const exportWord = () => {
        setIsExportMenuOpen(false);
        const content = `
            <div style="font-family: 'Sarabun', sans-serif;">
                <h2 style="text-align:center;">รายงานการปฏิบัติหน้าที่บุคลากร</h2>
                <p style="text-align:center;">ข้อมูล ณ วันที่ ${getCurrentThaiDate()}</p>
                <table border="1" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f3f4f6;">
                            <th style="padding:8px;">วันที่/เวลา</th>
                            <th style="padding:8px;">ชื่อ-นามสกุล</th>
                            <th style="padding:8px;">รายการ</th>
                            <th style="padding:8px;">ระยะห่าง</th>
                            <th style="padding:8px;">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredRecords.map(r => `
                            <tr>
                                <td style="padding:8px; text-align:center;">${displayDate(r.date)}<br/>${displayTime(r.time)} น.</td>
                                <td style="padding:8px;">${r.personnelName}</td>
                                <td style="padding:8px; text-align:center;">${r.type === 'check_in' ? 'เริ่มปฏิบัติหน้าที่' : 'สิ้นสุดหน้าที่'}</td>
                                <td style="padding:8px; text-align:center;">${r.distance} ม.</td>
                                <td style="padding:8px; text-align:center;">${r.status === 'within_range' ? 'ในเขต' : 'นอกเขต'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        const blob = new Blob(['\ufeff', `<html><body>${content}</body></html>`], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Report_Duty.doc`;
        link.click();
    };

    const handleAdminGetLocation = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onSaveSettings({ ...settings, schoolLat: pos.coords.latitude, schoolLng: pos.coords.longitude });
                setIsLocating(false);
                alert('อัปเดตพิกัดโรงเรียนสำเร็จ');
            },
            () => setIsLocating(false)
        );
    };

    useEffect(() => { return () => stopCamera(); }, []);

    return (
        <div className="space-y-6 animate-fade-in font-sarabun pb-10">
            {/* Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print border border-gray-100">
                <button onClick={() => setActiveTab('checkin')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'checkin' ? 'bg-primary-blue text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                    บันทึกเวลาปฏิบัติหน้าที่
                </button>
                <button onClick={() => setActiveTab('list')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                    ประวัติการปฏิบัติหน้าที่
                </button>
                {isAdmin && (
                    <button onClick={() => setActiveTab('settings')} className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                        ตั้งค่าระยะ GPS
                    </button>
                )}
            </div>

            {/* --- CHECK-IN TAB --- */}
            {activeTab === 'checkin' && (
                <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <h2 className="text-2xl font-black text-navy mb-1 tracking-tight">ลงเวลาปฏิบัติหน้าที่</h2>
                        <p className="text-[10px] text-gray-400 mb-8 uppercase tracking-widest font-black">Identity & Location Verified</p>

                        {/* Camera Container Fixed Styling */}
                        <div className="relative aspect-[3/4] w-full max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border-4 border-white mb-8 group z-0">
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
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        className="w-full h-full object-cover scale-x-[-1] absolute inset-0" 
                                    />
                                    {/* Scan Line Overlay */}
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
                                <div className="relative w-full h-full animate-fade-in z-20">
                                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                                    <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none border-4 border-emerald-500/50 rounded-3xl"></div>
                                    <button onClick={() => setCapturedImage(null)} className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                            )}
                        </div>

                        {/* GPS Button and Coordinates Display */}
                        <div className="space-y-4 mb-8">
                            <button onClick={verifyLocation} disabled={isLocating} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 border-2 transition-all ${currentGeo ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner' : 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50'}`}>
                                {isLocating ? <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                {currentGeo ? 'ยืนยันพิกัด GPS สำเร็จ ✓' : 'กดปุ่มยืนยันพิกัด GPS'}
                            </button>
                            
                            {currentGeo && (
                                <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 text-left animate-slide-up shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Coordinate Data</span>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${currentGeo.distance <= (settings.checkInRadius || 200) ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                            {currentGeo.distance <= (settings.checkInRadius || 200) ? 'อยู่ในพื้นที่' : 'อยู่นอกพื้นที่'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-blue-300">LATITUDE</p>
                                            <p className="text-sm font-mono font-bold text-blue-900">{currentGeo.lat.toFixed(6)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-blue-300">LONGITUDE</p>
                                            <p className="text-sm font-mono font-bold text-blue-900">{currentGeo.lng.toFixed(6)}</p>
                                        </div>
                                    </div>
                                    <p className="text-center mt-3 pt-3 border-t border-blue-200/50 text-xl font-black text-blue-700">ห่างจากศูนย์กลาง {currentGeo.distance} เมตร</p>
                                </div>
                            )}
                        </div>

                        {/* Submit Controls */}
                        <div className="space-y-4">
                            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                                <button onClick={() => setCheckInType('check_in')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${checkInType === 'check_in' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>เริ่มปฏิบัติหน้าที่</button>
                                <button onClick={() => setCheckInType('check_out')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${checkInType === 'check_out' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>สิ้นสุดหน้าที่</button>
                            </div>
                            <button onClick={handleConfirmCheckIn} disabled={isProcessing || !currentGeo} className={`w-full py-4.5 rounded-2xl font-black text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isProcessing ? 'bg-slate-300' : (!currentGeo ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : (checkInType === 'check_in' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'))}`}>
                                {isProcessing ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันลงชื่อปฏิบัติหน้าที่'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LIST TAB --- */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-fade-in no-print overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-navy tracking-tight">ประวัติการมาปฏิบัติหน้าที่</h2>
                            <p className="text-sm text-gray-400 mt-1">รายการบันทึกเวลาของบุคลากรรายบุคคล</p>
                        </div>
                        <div className="relative group self-end md:self-auto">
                            <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg flex items-center gap-2 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                ดาวน์โหลดรายงาน
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1">
                                    <button onClick={exportExcel} className="w-full text-left px-4 py-3 hover:bg-emerald-50 text-sm text-gray-700 font-bold flex items-center gap-3 border-b border-gray-50"><span className="text-green-600">📊</span> Excel (.csv)</button>
                                    <button onClick={exportWord} className="w-full text-left px-4 py-3 hover:bg-emerald-50 text-sm text-gray-700 font-bold flex items-center gap-3 border-b border-gray-50"><span className="text-blue-600">📝</span> Word (.doc)</button>
                                    <button onClick={() => window.print()} className="w-full text-left px-4 py-3 hover:bg-emerald-50 text-sm text-gray-700 font-bold flex items-center gap-3"><span>🖨️</span> พิมพ์ PDF</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Filter Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ค้นหาชื่อบุคลากร</label>
                            <input type="text" placeholder="พิมพ์ชื่อเพื่อค้นหา..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">กรองตำแหน่ง</label>
                            <input type="text" placeholder="ระบุตำแหน่ง..." value={filterPos} onChange={e => setFilterPos(e.target.value)} className="w-full border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ตั้งแต่วันที่</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ถึงวันที่</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-500 uppercase tracking-tighter">
                                <tr>
                                    <th className="p-4 w-20 text-center font-black">PHOTO</th>
                                    <th className="p-4 font-black">วัน/เวลา</th>
                                    <th className="p-4 font-black">ชื่อ-นามสกุล</th>
                                    <th className="p-4 font-black">รายการ</th>
                                    <th className="p-4 font-black">ระยะห่าง</th>
                                    <th className="p-4 text-center font-black">สถานะ GPS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-3">
                                            <div className="w-14 h-16 rounded-xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm mx-auto group">
                                                {r.image ? (
                                                    <img src={getDirectDriveImageSrc(r.image as string)} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Face" />
                                                ) : <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-navy">{displayDate(r.date)}</div>
                                            <div className="text-[11px] font-bold text-blue-500 mt-0.5">{displayTime(r.time)} น.</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700 leading-tight">
                                            {r.personnelName}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${r.type === 'check_in' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                {r.type === 'check_in' ? 'เริ่มปฏิบัติหน้าที่' : 'สิ้นสุดหน้าที่'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs font-bold text-slate-600">ห่างโรงเรียน {r.distance} ม.</div>
                                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${r.status === 'within_range' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-500 bg-rose-50 border border-rose-100'}`}>
                                                <div className={`w-2 h-2 rounded-full ${r.status === 'within_range' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                                                {r.status === 'within_range' ? 'ในเขต' : 'นอกเขต'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && (
                                    <tr><td colSpan={6} className="p-24 text-center text-slate-400 font-bold italic">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- PRINT ONLY LAYOUT --- */}
            <div className="hidden print:block font-sarabun p-12 print-visible">
                <div className="text-center mb-10 border-b-2 border-black pb-6">
                    <h1 className="text-3xl font-bold">โรงเรียนกาฬสินธุ์ปัญญานุกูล</h1>
                    <h2 className="text-xl font-bold mt-2 uppercase">รายงานสรุปการมาปฏิบัติหน้าที่บุคลากร</h2>
                    <p className="mt-1">ข้อมูลวันที่ {getCurrentThaiDate()}</p>
                </div>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-3">วันที่/เวลา</th>
                            <th className="border border-black p-3 text-left">ชื่อ-นามสกุล</th>
                            <th className="border border-black p-3">รายการ</th>
                            <th className="border border-black p-3">ระยะห่าง</th>
                            <th className="border border-black p-3">สถานะ GPS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map(r => (
                            <tr key={r.id}>
                                <td className="border border-black p-3 text-center">{displayDate(r.date)}<br/>{displayTime(r.time)} น.</td>
                                <td className="border border-black p-3">{r.personnelName}</td>
                                <td className="border border-black p-3 text-center">{r.type === 'check_in' ? 'เริ่มปฏิบัติหน้าที่' : 'สิ้นสุดหน้าที่'}</td>
                                <td className="border border-black p-3 text-center">{r.distance} ม.</td>
                                <td className="border border-black p-3 text-center">{r.status === 'within_range' ? 'ในเขต' : 'นอกเขต'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-20 flex justify-end">
                    <div className="text-center w-72">
                        <p className="mb-12">ลงชื่อ ........................................................... ผู้รายงาน</p>
                        <p>(...........................................................)</p>
                        <p>ตำแหน่ง ...........................................................</p>
                    </div>
                </div>
            </div>

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && isAdmin && (
                <div className="max-w-lg mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border border-purple-50 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-50 rounded-full -mr-20 -mt-20"></div>
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h2 className="text-2xl font-black text-purple-900 flex items-center gap-3">
                            <div className="p-2.5 bg-purple-100 rounded-2xl text-purple-600 shadow-inner"><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                            ตั้งค่าจุดศูนย์กลาง
                        </h2>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="bg-purple-600 p-8 rounded-[2rem] shadow-2xl shadow-purple-200 border border-purple-400 group">
                            <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-center">Automatic Location Setup</p>
                            <button onClick={handleAdminGetLocation} disabled={isLocating} className="w-full bg-white hover:bg-purple-50 text-purple-700 font-black py-4.5 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                                {isLocating ? <span className="animate-pulse">กำลังระบุพิกัดปัจจุบัน...</span> : 'ดึงพิกัดปัจจุบันเป็นจุดศูนย์กลาง'}
                            </button>
                            <p className="text-[10px] text-purple-200 mt-4 text-center italic font-medium">* ยืน ณ จุดกึ่งกลางโรงเรียนแล้วกดปุ่มเพื่อตั้งค่า</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Latitude</label>
                                <input type="number" step="0.000001" value={settings.schoolLat} onChange={e => onSaveSettings({ ...settings, schoolLat: parseFloat(e.target.value) })} className="w-full border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-navy focus:ring-4 focus:ring-purple-100 shadow-inner bg-slate-50 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Longitude</label>
                                <input type="number" step="0.000001" value={settings.schoolLng} onChange={e => onSaveSettings({ ...settings, schoolLng: parseFloat(e.target.value) })} className="w-full border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-navy focus:ring-4 focus:ring-purple-100 shadow-inner bg-slate-50 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ระยะรัศมีที่อนุญาต (เมตร)</label>
                            <input type="number" value={settings.checkInRadius} onChange={e => onSaveSettings({ ...settings, checkInRadius: parseInt(e.target.value) })} className="w-full border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-navy focus:ring-4 focus:ring-purple-100 shadow-inner bg-slate-50 transition-all" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DutyPage;
