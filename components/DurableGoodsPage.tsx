
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DurableGood, DurableGoodStatus, Personnel, MaintenanceLog, Settings } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getFirstImageSource, getDirectDriveImageSrc, getCurrentThaiDate, buddhistToISO, isoToBuddhist } from '../utils';

interface DurableGoodsPageProps {
    currentUser: Personnel;
    durableGoods: DurableGood[];
    onSave: (item: DurableGood) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
    settings: Settings;
}

const DurableGoodsPage: React.FC<DurableGoodsPageProps> = ({ currentUser, durableGoods, onSave, onDelete, isSaving, settings }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'categories' | 'scanner'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    
    const [currentItem, setCurrentItem] = useState<Partial<DurableGood>>({});
    const [viewItem, setViewItem] = useState<DurableGood | null>(null);
    const [maintenanceForm, setMaintenanceForm] = useState<Partial<MaintenanceLog>>({
        date: getCurrentThaiDate(),
        description: '',
        cost: 0,
        technician: ''
    });
    
    // Camera & Scanner States
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [isScanning, setIsScanning] = useState(false); // New state for QR Scanner
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [categories, setCategories] = useState<string[]>(['ยานพาหนะ', 'อุปกรณ์อิเล็กทรอนิกส์', 'เครื่องใช้สำนักงาน', 'เฟอร์นิเจอร์', 'อุปกรณ์ห้องประชุม']);
    const qrScannerRef = useRef<any>(null);

    // --- Computed Data ---
    const filteredGoods = useMemo(() => {
        return durableGoods.filter(item => {
            const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !filterStatus || item.status === filterStatus;
            const matchesCategory = !filterCategory || item.category === filterCategory;
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [durableGoods, searchTerm, filterStatus, filterCategory]);

    const stats = useMemo(() => {
        const total = durableGoods.length;
        const available = durableGoods.filter(i => i.status === 'available').length;
        const repair = durableGoods.filter(i => i.status === 'repair').length;
        const totalValue = durableGoods.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

        const statusData = [
            { name: 'พร้อมใช้งาน', value: available, color: '#10B981' },
            { name: 'กำลังใช้งาน', value: durableGoods.filter(i => i.status === 'in_use').length, color: '#3B82F6' },
            { name: 'ซ่อมบำรุง', value: repair, color: '#F59E0B' },
            { name: 'แทงจำหน่าย', value: durableGoods.filter(i => i.status === 'write_off').length, color: '#EF4444' },
        ].filter(d => d.value > 0);

        return { total, available, repair, totalValue, statusData };
    }, [durableGoods]);

    // --- QR Scanner Implementation ---
    const startScanner = async () => {
        if (isScanning) return;

        const qrElement = document.getElementById("qr-reader");
        if (!qrElement) return;

        try {
            const html5QrCode = new (window as any).Html5Qrcode("qr-reader");
            qrScannerRef.current = html5QrCode;
            setIsScanning(true);

            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText: string) => {
                    const item = durableGoods.find(i => i.code === decodedText);
                    if (item) {
                        stopScanner();
                        setViewItem(item);
                        setIsViewModalOpen(true);
                        setActiveTab('list');
                    } else {
                        alert(`ไม่พบรหัสครุภัณฑ์: ${decodedText}`);
                    }
                },
                (errorMessage: string) => {}
            );
        } catch (err) {
            console.error("Scanner start error:", err);
            setIsScanning(false);
            alert("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง");
        }
    };

    const stopScanner = async () => {
        if (qrScannerRef.current && isScanning) {
            try {
                await qrScannerRef.current.stop();
                qrScannerRef.current = null;
                setIsScanning(false);
            } catch (err) {
                console.error("Scanner stop error:", err);
            }
        }
    };

    // ปรับปรุง useEffect เพื่อล้างสถานะเมื่อเปลี่ยนหน้า
    useEffect(() => {
        if (activeTab !== 'scanner') {
            stopScanner();
        }
        return () => {
            stopScanner();
        };
    }, [activeTab]);

    // --- Manual Camera Logic (For Photo Upload) ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            setCameraStream(stream);
            setIsCameraOpen(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            alert('ไม่สามารถเข้าถึงกล้องได้: ' + err);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCurrentItem(prev => ({ ...prev, image: [dataUrl] }));
                stopCamera();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCurrentItem(prev => ({ ...prev, image: [file] }));
        }
    };

    const getHealthRecommendation = (item: DurableGood) => {
        const history = item.maintenanceHistory || [];
        const repairCount = history.length;
        const totalMaintenanceCost = history.reduce((sum, h) => sum + (h.cost || 0), 0);
        const price = Number(item.price) || 0;

        if (item.status === 'write_off') return { text: 'จำหน่ายออกแล้ว', color: 'text-gray-500', icon: '🗑️' };
        if (repairCount > 4 || (price > 0 && totalMaintenanceCost > price * 0.6)) {
            return { text: 'ควรพิจารณาเปลี่ยนใหม่ (ซ่อมบ่อย/ไม่คุ้มซ่อม)', color: 'text-red-600', icon: '⚠️' };
        }
        if (repairCount >= 3) {
            return { text: 'เฝ้าระวัง (เริ่มเสื่อมสภาพ)', color: 'text-orange-600', icon: '🧐' };
        }
        return { text: 'สภาพดี', color: 'text-green-600', icon: '✅' };
    };

    const handleSaveMaintenance = (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewItem) return;

        const newLog: MaintenanceLog = {
            id: Date.now(),
            date: maintenanceForm.date || getCurrentThaiDate(),
            description: maintenanceForm.description || '',
            cost: Number(maintenanceForm.cost) || 0,
            technician: maintenanceForm.technician || ''
        };

        const updatedItem: DurableGood = {
            ...viewItem,
            maintenanceHistory: [...(viewItem.maintenanceHistory || []), newLog]
        };

        onSave(updatedItem);
        setViewItem(updatedItem);
        setIsMaintenanceModalOpen(false);
        setMaintenanceForm({ date: getCurrentThaiDate(), description: '', cost: 0, technician: '' });
    };

    const handleOpenModal = (item?: DurableGood) => {
        if (item) {
            setCurrentItem({ ...item });
        } else {
            setCurrentItem({
                code: '',
                name: '',
                category: categories[0] || '',
                price: 0,
                acquisitionDate: getCurrentThaiDate(),
                location: '',
                status: 'available' as DurableGoodStatus,
                maintenanceHistory: [],
                image: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const itemToSave = {
            ...currentItem,
            id: currentItem.id || Date.now(),
            price: Number(currentItem.price) || 0,
            acquisitionDate: currentItem.acquisitionDate || getCurrentThaiDate(),
            maintenanceHistory: currentItem.maintenanceHistory || []
        } as DurableGood; 
        onSave(itemToSave);
        setIsModalOpen(false);
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'available': return 'พร้อมใช้งาน';
            case 'in_use': return 'กำลังใช้งาน';
            case 'repair': return 'ซ่อมบำรุง';
            case 'write_off': return 'จำหน่ายออก';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'available': return 'bg-green-100 text-green-700';
            case 'in_use': return 'bg-blue-100 text-blue-700';
            case 'repair': return 'bg-orange-100 text-orange-700';
            case 'write_off': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getQrUrl = (code: string, size: number = 200) => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm no-print border border-gray-100">
                <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2-2v-2z" /></svg>
                    หน้าหลัก
                </button>
                <button onClick={() => setActiveTab('scanner')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'scanner' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 11v1m4-12h1m-1 12h1M4 4h1m-1 12h1m1.414-9.414l.707.707m1.414 1.414l.707.707m-4.242 0l.707-.707m1.414-1.414l.707-.707M14.95 9.15l.707.707M14.95 14.95l.707-.707M9.15 9.15l-.707.707M9.15 14.95l-.707-.707" /></svg>
                    สแกน QR Code
                </button>
                <button onClick={() => setActiveTab('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    ข้อมูลครุภัณฑ์
                </button>
                <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'categories' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    หมวดหมู่
                </button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in no-print">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">ทั้งหมด</p>
                                <p className="text-2xl font-bold text-navy">{stats.total} รายการ</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">พร้อมใช้</p>
                                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-orange-500 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">รอซ่อม</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.repair}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-indigo-500 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">มูลค่ารวม</p>
                                <p className="text-xl font-bold text-navy">{stats.totalValue.toLocaleString()} บ.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow h-80">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนครุภัณฑ์</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={stats.statusData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={80} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                                <span className="p-1 bg-red-100 text-red-600 rounded">🔔</span>
                                ครุภัณฑ์ที่เสื่อมสภาพสูง
                            </h3>
                            <div className="space-y-3 overflow-y-auto max-h-60 pr-2 custom-scrollbar">
                                {durableGoods.filter(i => (i.maintenanceHistory?.length || 0) >= 3).map(item => {
                                    const recommendation = getHealthRecommendation(item);
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm truncate">{item.name}</p>
                                                <p className="text-xs text-red-600">{recommendation.icon} {recommendation.text}</p>
                                            </div>
                                            <button onClick={() => { setViewItem(item); setIsViewModalOpen(true); }} className="text-xs font-bold bg-white text-red-600 px-2 py-1 rounded shadow-sm">ดู</button>
                                        </div>
                                    );
                                })}
                                {durableGoods.filter(i => (i.maintenanceHistory?.length || 0) >= 3).length === 0 && (
                                    <p className="text-center py-8 text-gray-400 italic">ไม่มีข้อมูลครุภัณฑ์ที่ต้องเฝ้าระวัง</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'scanner' && (
                <div className="bg-white p-6 rounded-3xl shadow-xl animate-fade-in no-print text-center max-w-2xl mx-auto border border-gray-100">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-navy">สแกน QR Code ครุภัณฑ์</h2>
                        <p className="text-gray-500 text-sm mt-1 tracking-tight">ส่องกล้องไปที่รหัส QR Code บนป้ายครุภัณฑ์เพื่อดูข้อมูล</p>
                    </div>
                    
                    <div className="max-w-md mx-auto overflow-hidden rounded-3xl border-4 border-indigo-600 shadow-2xl bg-slate-900 aspect-square flex items-center justify-center relative">
                        <div id="qr-reader" className="w-full h-full"></div>
                        
                        {!isScanning && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/80 backdrop-blur-sm p-8 space-y-4">
                                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m0 11v1m4-12h1m-1 12h1M4 4h1m-1 12h1m1.414-9.414l.707.707m1.414 1.414l.707.707m-4.242 0l.707-.707m1.414-1.414l.707-.707M14.95 9.15l.707.707M14.95 14.95l.707-.707M9.15 9.15l-.707.707M9.15 14.95l-.707-.707" /></svg>
                                </div>
                                <button 
                                    onClick={startScanner} 
                                    className="bg-white text-indigo-600 px-8 py-3 rounded-full font-black text-sm shadow-xl hover:bg-indigo-50 transition-all active:scale-95"
                                >
                                    เปิดกล้องสแกน
                                </button>
                            </div>
                        )}

                        {isScanning && (
                            <div className="absolute inset-0 pointer-events-none z-10">
                                <div className="w-full h-1 bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,1)] absolute animate-scan-line"></div>
                                <div className="absolute inset-0 border-[40px] border-slate-900/40 rounded-3xl"></div>
                            </div>
                        )}
                    </div>

                    {isScanning && (
                        <div className="mt-8">
                            <button 
                                onClick={stopScanner} 
                                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 mx-auto"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                ปิดกล้องสแกน
                            </button>
                        </div>
                    )}

                    <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {isScanning ? 'กำลังสแกน...' : 'ระบบสแกนยังไม่ทำงาน'}
                    </p>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-navy">รายการครุภัณฑ์</h2>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm font-bold">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                เพิ่มรายการ
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end">
                        <div className="flex-grow">
                            <input type="text" placeholder="ระบุรหัส หรือ ชื่อครุภัณฑ์..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" />
                        </div>
                        <div className="w-full sm:w-48">
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                                <option value="">ทุกสถานะ</option>
                                <option value="available">พร้อมใช้งาน</option>
                                <option value="repair">ซ่อมบำรุง</option>
                                <option value="write_off">จำหน่ายออก</option>
                            </select>
                        </div>
                        <button onClick={() => {setSearchTerm(''); setFilterStatus('');}} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">ล้างค่า</button>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="p-3">รหัส/QR</th>
                                    <th className="p-3">รูปภาพ</th>
                                    <th className="p-3">ชื่อครุภัณฑ์</th>
                                    <th className="p-3">สถานที่</th>
                                    <th className="p-3 text-center">สถานะ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGoods.map((item) => {
                                    const imgUrl = getFirstImageSource(item.image);
                                    return (
                                        <tr key={item.id} className="border-b hover:bg-blue-50 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <img src={getQrUrl(item.code, 100)} className="w-10 h-10 border p-0.5 bg-white rounded shadow-sm" alt="QR" />
                                                    <span className="font-mono text-xs font-bold text-gray-700">{item.code}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="w-12 h-12 rounded bg-gray-100 border overflow-hidden">
                                                    {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">ไม่มีรูป</div>}
                                                </div>
                                            </td>
                                            <td className="p-3 font-medium text-navy">{item.name}</td>
                                            <td className="p-3 text-gray-500">{item.location}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(item.status)}`}>
                                                    {getStatusLabel(item.status)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => {setViewItem(item); setIsViewModalOpen(true);}} className="p-1.5 bg-sky-100 text-sky-700 rounded hover:bg-sky-200" title="ดูข้อมูล/QR"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                    <button onClick={() => handleOpenModal(item)} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print border border-gray-100">
                    <h2 className="text-xl font-bold text-navy mb-6">หมวดหมู่ครุภัณฑ์</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {categories.map(cat => {
                            const count = durableGoods.filter(i => i.category === cat).length;
                            return (
                                <div key={cat} onClick={() => { setFilterCategory(cat); setActiveTab('list'); }} className="p-6 bg-gray-50 border rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group">
                                    <p className="text-sm font-bold text-gray-500 uppercase">{cat}</p>
                                    <p className="text-2xl font-black text-navy mt-1 group-hover:text-primary-blue">{count} <span className="text-xs font-normal text-gray-400">รายการ</span></p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- ADD/EDIT MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-primary-blue text-white rounded-t-xl">
                            <h3 className="text-xl font-bold">{currentItem.id ? 'แก้ไขข้อมูลครุภัณฑ์' : 'เพิ่มครุภัณฑ์ใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-grow">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">รูปถ่ายครุภัณฑ์ *</label>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                        <div className="w-32 h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                                            {currentItem.image && currentItem.image.length > 0 ? (
                                                <img src={getFirstImageSource(currentItem.image)!} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            )}
                                        </div>
                                        <div className="space-y-2 w-full">
                                            <div className="flex gap-2">
                                                <button type="button" onClick={startCamera} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg border border-blue-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    เปิดกล้อง
                                                </button>
                                                <label className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer text-center">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    อัปโหลดรูป
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-gray-400">* กรุณาถ่ายรูปให้ชัดเจน</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รหัสครุภัณฑ์ *</label>
                                    <input type="text" required value={currentItem.code} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" placeholder="ระบุรหัสทรัพย์สิน" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรายการ *</label>
                                    <input type="text" required value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                                    <select value={currentItem.category} onChange={e => setCurrentItem({...currentItem, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                                    <select value={currentItem.status} onChange={e => setCurrentItem({...currentItem, status: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="available">พร้อมใช้งาน</option>
                                        <option value="in_use">กำลังใช้งาน</option>
                                        <option value="repair">ซ่อมบำรุง</option>
                                        <option value="write_off">แทงจำหน่าย</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่จัดเก็บ</label>
                                    <input type="text" value={currentItem.location} onChange={e => setCurrentItem({...currentItem, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                             </div>
                        </form>
                        <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold">ยกเลิก</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-8 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 font-bold shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW MODAL --- */}
            {isViewModalOpen && viewItem && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm no-print" onClick={() => setIsViewModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-navy to-blue-800 text-white">
                            <div>
                                <h3 className="text-xl font-bold">{viewItem.name}</h3>
                                <p className="text-blue-100 text-xs font-mono">{viewItem.code}</p>
                            </div>
                            <button onClick={() => setIsViewModalOpen(false)} className="hover:bg-white/20 rounded-full p-2"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                            <div className="w-full md:w-1/3 flex flex-col items-center">
                                <div className="w-full aspect-square bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden mb-6 shadow-inner">
                                    {getFirstImageSource(viewItem.image) ? (
                                        <img src={getFirstImageSource(viewItem.image)!} className="w-full h-full object-cover" alt="Asset" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="text-xs">ไม่มีรูปภาพประกอบ</span>
                                        </div>
                                    )}
                                </div>

                                <div id="asset-label" className="bg-white p-4 border-2 border-dashed border-gray-200 rounded-xl text-center shadow-inner mb-6 flex flex-col items-center w-full">
                                    <p className="text-[10px] font-black text-navy uppercase tracking-tighter mb-2">ครุภัณฑ์โรงเรียน</p>
                                    <img src={getQrUrl(viewItem.code, 250)} className="w-44 h-44 border p-2 mb-2 bg-white shadow-sm" alt="QR Code" />
                                    <p className="font-mono font-bold text-sm bg-gray-100 px-2 py-1 rounded w-full border border-gray-200">{viewItem.code}</p>
                                    <p className="text-[10px] text-gray-400 mt-2 truncate max-w-full italic">{viewItem.name}</p>
                                </div>
                                <button onClick={() => window.print()} className="w-full bg-navy text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-900 transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    พิมพ์ป้ายครุภัณฑ์ (QR)
                                </button>
                            </div>

                            <div className="flex-grow space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase">สถานะ</label>
                                        <p className="font-bold text-navy">{getStatusLabel(viewItem.status)}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase">สถานที่จัดเก็บ</label>
                                        <p className="font-bold text-navy truncate">{viewItem.location || 'ไม่ระบุ'}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-navy">ประวัติการซ่อมบำรุง ({viewItem.maintenanceHistory?.length || 0} ครั้ง)</h4>
                                        <button onClick={() => setIsMaintenanceModalOpen(true)} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">+ เพิ่มประวัติซ่อม</button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {viewItem.maintenanceHistory?.length ? (
                                            viewItem.maintenanceHistory.map((log, idx) => (
                                                <div key={log.id} className="p-3 border rounded-xl flex justify-between items-start bg-white hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">{log.description}</p>
                                                        <p className="text-[10px] text-gray-400">{log.date} • ช่าง: {log.technician || '-'}</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-blue-600">-{log.cost.toLocaleString()} บ.</span>
                                                </div>
                                            )).reverse()
                                        ) : (
                                            <div className="py-10 text-center text-gray-400 italic text-sm border-2 border-dashed rounded-xl">ยังไม่เคยมีประวัติการซ่อม</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CAMERA OVERLAY (For Asset Photo) --- */}
            {isCameraOpen && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-md aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 pointer-events-none border-[30px] border-black/20"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="mt-8 flex gap-6 items-center">
                        <button onClick={stopCamera} className="bg-red-500 text-white p-4 rounded-full shadow-lg"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <button onClick={capturePhoto} className="bg-white text-navy w-20 h-20 rounded-full shadow-2xl border-4 border-blue-500 flex items-center justify-center transition-transform active:scale-90"><div className="w-14 h-14 bg-navy rounded-full"></div></button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* --- PRINTABLE QR TAG (HIDDEN ON SCREEN) --- */}
            <div className="hidden print:block print-visible">
                {viewItem && (
                    <div className="asset-tag-print">
                         <img src={getDirectDriveImageSrc(settings.schoolLogo)} className="h-14 w-auto mb-3" alt="Logo" />
                         <p style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 10px 0' }}>{settings.schoolName}</p>
                         <p style={{ fontSize: '11pt', margin: '0 0 15px 0', borderBottom: '1px solid #000', width: '100%', textAlign: 'center', paddingBottom: '5px' }}>
                            รหัสครุภัณฑ์: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{viewItem.code}</span>
                         </p>
                         <img src={getQrUrl(viewItem.code, 400)} className="w-56 h-56 border-4 border-white shadow-sm mb-4" alt="QR" />
                         <p style={{ fontSize: '14pt', fontWeight: 'bold', maxWidth: '300px', textAlign: 'center', lineHeight: '1.2' }}>{viewItem.name}</p>
                    </div>
                )}
            </div>

            {isMaintenanceModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">🛠️ บันทึกการซ่อมบำรุง</h3>
                        <form onSubmit={handleSaveMaintenance} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" value={maintenanceForm.date} onChange={e => setMaintenanceForm({...maintenanceForm, date: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" placeholder="วันที่" />
                                <input type="number" value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm, cost: Number(e.target.value)})} className="border rounded-lg px-3 py-2 text-sm" placeholder="ค่าซ่อม" />
                            </div>
                            <textarea required rows={2} value={maintenanceForm.description} onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="รายละเอียดงานที่ซ่อม" />
                            <input type="text" value={maintenanceForm.technician} onChange={e => setMaintenanceForm({...maintenanceForm, technician: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ช่างผู้ซ่อม" />
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500">ยกเลิก</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md">บันทึกประวัติ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DurableGoodsPage;
