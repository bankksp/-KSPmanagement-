
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DutyRecord, Personnel, Settings } from '../types';
import { getCurrentThaiDate, formatThaiDate, buddhistToISO, isoToBuddhist } from '../utils';

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

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isAdmin = currentUser.role === 'admin';

    // Filter Records for current user (unless admin)
    const displayRecords = useMemo(() => {
        return [...records].sort((a, b) => b.id - a.id);
    }, [records]);

    // Haversine formula to calculate distance in meters
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง');
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
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
            }
        }
    };

    const verifyLocation = () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ของคุณไม่รองรับ GPS');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const dist = calculateDistance(
                    lat, lng, 
                    settings.schoolLat || 16.4322, 
                    settings.schoolLng || 103.5061
                );
                setCurrentGeo({ lat, lng, distance: dist });
                setIsLocating(false);
            },
            (err) => {
                alert('ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS และอนุญาตสิทธิ์การเข้าถึงตำแหน่ง');
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleConfirmCheckIn = () => {
        if (!currentGeo) {
            alert('กรุณากดปุ่มยืนยันพิกัด GPS ก่อน');
            return;
        }

        setIsProcessing(true);
        
        // Capture Image if camera active
        if (cameraActive) {
            captureFace();
        }

        // Wait a moment for visual feedback
        setTimeout(() => {
            const status = currentGeo.distance <= (settings.checkInRadius || 200) ? 'within_range' : 'out_of_range';
            
            if (status === 'out_of_range') {
                if (!window.confirm(`คุณอยู่นอกระยะที่กำหนด (${currentGeo.distance} เมตร) ยืนยันการลงชื่อหรือไม่?`)) {
                    setIsProcessing(false);
                    return;
                }
            }

            const now = new Date();
            const record: DutyRecord = {
                id: Date.now(),
                date: getCurrentThaiDate(),
                time: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
                personnelId: currentUser.id,
                personnelName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                type: checkInType,
                latitude: currentGeo.lat,
                longitude: currentGeo.lng,
                distance: currentGeo.distance,
                image: canvasRef.current?.toDataURL('image/jpeg') || capturedImage || '',
                status: status
            };

            onSave(record);
            alert('บันทึกข้อมูลเรียบร้อย');
            setIsProcessing(false);
            setCapturedImage(null);
            setCurrentGeo(null);
            stopCamera();
        }, 800);
    };

    const handleAdminGetLocation = () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ของคุณไม่รองรับ GPS');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onSaveSettings({ 
                    ...settings, 
                    schoolLat: parseFloat(pos.coords.latitude.toFixed(6)), 
                    schoolLng: parseFloat(pos.coords.longitude.toFixed(6)) 
                });
                setIsLocating(false);
                alert('ดึงพิกัดปัจจุบันสำเร็จ');
            },
            (err) => {
                alert('ไม่สามารถระบุตำแหน่งได้');
                setIsLocating(false);
            }
        );
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print">
                <button 
                    onClick={() => setActiveTab('checkin')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'checkin' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    ลงชื่อปฏิบัติงาน
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    รายการมาปฏิบัติงาน
                </button>
                {isAdmin && (
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        ตั้งค่าพิกัดโรงเรียน
                    </button>
                )}
            </div>

            {/* --- CHECK-IN TAB --- */}
            {activeTab === 'checkin' && (
                <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-white text-center">
                        <h2 className="text-2xl font-black text-navy mb-2">ลงเวรปฏิบัติงาน</h2>
                        <p className="text-sm text-gray-500 mb-6">กรุณาสแกนหน้าและยืนยันพิกัด GPS</p>

                        {/* Scanner UI */}
                        <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-gray-900 shadow-2xl border-4 border-white mb-6 group">
                            {!cameraActive && !capturedImage && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
                                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <button onClick={startCamera} className="bg-white text-navy px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-50">เริ่มสแกนหน้า</button>
                                </div>
                            )}

                            {cameraActive && (
                                <>
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                    {/* Scan Line Animation */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="w-full h-1 bg-primary-blue shadow-[0_0_15px_rgba(59,130,246,0.8)] absolute animate-scan-line"></div>
                                        <div className="absolute inset-0 border-[40px] border-black/40 rounded-full"></div>
                                    </div>
                                    <button onClick={captureFace} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-navy p-2 rounded-full shadow-lg"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                                </>
                            )}

                            {capturedImage && (
                                <div className="relative w-full h-full">
                                    <img src={capturedImage} className="w-full h-full object-cover scale-x-[-1]" alt="Captured" />
                                    <button onClick={() => setCapturedImage(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                            )}
                        </div>

                        <canvas ref={canvasRef} className="hidden" />

                        {/* GPS Verification UI */}
                        <div className="space-y-4 mb-6">
                            <button 
                                onClick={verifyLocation}
                                disabled={isLocating}
                                className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${currentGeo ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50'}`}
                            >
                                {isLocating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        กำลังระบุพิกัด...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {currentGeo ? 'ระบุพิกัดแล้ว ✓' : 'กดเพื่อยืนยันพิกัด GPS'}
                                    </>
                                )}
                            </button>

                            {currentGeo && (
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-left animate-fade-in">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Current Location</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentGeo.distance <= (settings.checkInRadius || 200) ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {currentGeo.distance <= (settings.checkInRadius || 200) ? 'อยู่ในระยะ' : 'อยู่นอกระยะ'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-mono text-blue-900">Lat: {currentGeo.lat.toFixed(6)}</p>
                                    <p className="text-xs font-mono text-blue-900">Lng: {currentGeo.lng.toFixed(6)}</p>
                                    <p className="text-sm font-bold text-blue-700 mt-1">ระยะห่าง: {currentGeo.distance} เมตร</p>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="space-y-4">
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                                <button 
                                    onClick={() => setCheckInType('check_in')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${checkInType === 'check_in' ? 'bg-white text-primary-blue shadow-sm' : 'text-gray-500'}`}
                                >
                                    เข้าเวร
                                </button>
                                <button 
                                    onClick={() => setCheckInType('check_out')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${checkInType === 'check_out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    ออกเวร
                                </button>
                            </div>

                            <button 
                                onClick={handleConfirmCheckIn}
                                disabled={isProcessing || !currentGeo}
                                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isProcessing ? 'bg-gray-300' : (!currentGeo ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : (checkInType === 'check_in' ? 'bg-primary-blue text-white' : 'bg-red-600 text-white'))}`}
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ยืนยันการลงเวร
                                    </>
                                )}
                            </button>
                            
                            <p className="text-[10px] text-gray-400">
                                พิกัดโรงเรียนที่ตั้งไว้: {settings.schoolLat?.toFixed(4)}, {settings.schoolLng?.toFixed(4)} <br/>
                                ระยะที่อนุญาต: {settings.checkInRadius} เมตร
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LIST TAB --- */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-navy">ประวัติการลงเวรปฏิบัติงาน</h2>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 w-20">ภาพถ่าย</th>
                                    <th className="p-4">วันที่/เวลา</th>
                                    <th className="p-4">ชื่อ-สกุล</th>
                                    <th className="p-4">ประเภท</th>
                                    <th className="p-4">ระยะห่าง</th>
                                    <th className="p-4">สถานะ GPS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRecords.map(r => (
                                    <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-2">
                                            <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden border">
                                                {r.image ? (
                                                    <img src={r.image as string} className="w-full h-full object-cover" alt="face" />
                                                ) : '-'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold">{r.date}</div>
                                            <div className="text-xs text-gray-400">{r.time} น.</div>
                                        </td>
                                        <td className="p-4">{r.personnelName}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.type === 'check_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {r.type === 'check_in' ? 'เข้าเวร' : 'ออกเวร'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600">{r.distance} เมตร</td>
                                        <td className="p-4">
                                            <span className={`flex items-center gap-1 font-bold ${r.status === 'within_range' ? 'text-green-600' : 'text-red-500'}`}>
                                                <div className={`w-2 h-2 rounded-full ${r.status === 'within_range' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                {r.status === 'within_range' ? 'ในเขต' : 'นอกเขต'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {displayRecords.length === 0 && (
                                    <tr><td colSpan={6} className="p-12 text-center text-gray-400">ไม่พบประวัติการลงเวร</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && isAdmin && (
                <div className="max-w-lg mx-auto bg-white p-8 rounded-3xl shadow-xl border border-purple-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            ตั้งค่าจุดศูนย์กลางโรงเรียน
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 mb-4">
                            <button 
                                onClick={handleAdminGetLocation}
                                disabled={isLocating}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLocating ? (
                                    <span className="animate-pulse">กำลังระบุพิกัด...</span>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        ดึงพิกัดปัจจุบันเป็นจุดศูนย์กลาง
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-purple-600 mt-2 text-center">* ยืน ณ จุดกึ่งกลางโรงเรียนแล้วกดปุ่มเพื่อตั้งค่าพิกัดปัจจุบัน</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">LATITUDE</label>
                                <input 
                                    type="number" 
                                    step="0.000001"
                                    value={settings.schoolLat}
                                    onChange={e => onSaveSettings({ ...settings, schoolLat: parseFloat(e.target.value) })}
                                    className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">LONGITUDE</label>
                                <input 
                                    type="number" 
                                    step="0.000001"
                                    value={settings.schoolLng}
                                    onChange={e => onSaveSettings({ ...settings, schoolLng: parseFloat(e.target.value) })}
                                    className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">ระยะห่างที่ยอมรับได้ (เมตร)</label>
                            <input 
                                type="number" 
                                value={settings.checkInRadius}
                                onChange={e => onSaveSettings({ ...settings, checkInRadius: parseInt(e.target.value) })}
                                className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-xs text-purple-700 mt-4">
                            <strong>คำแนะนำ:</strong> <br/>
                            1. ใช้ปุ่ม "ดึงพิกัดปัจจุบัน" หากคุณอยู่หน้างาน <br/>
                            2. หรือเปิด Google Maps ค้นหาสถานที่ แล้วคัดลอกพิกัดมาวางได้ <br/>
                            3. กำหนดรัศมี (เมตร) เพื่อตรวจสอบว่าบุคลากรลงชื่อภายในเขตโรงเรียนหรือไม่
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DutyPage;
