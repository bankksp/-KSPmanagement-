
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DurableGood, DurableGoodStatus, Personnel, MaintenanceLog, Settings } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getFirstImageSource, getDirectDriveImageSrc, getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, safeParseArray } from '../utils';

interface DurableGoodsPageProps {
    currentUser: Personnel;
    durableGoods: DurableGood[];
    onSave: (item: DurableGood) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
}

const DurableGoodsPage: React.FC<DurableGoodsPageProps> = ({ currentUser, durableGoods = [], onSave, onDelete, isSaving, settings, onSaveSettings }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'settings' | 'scanner'>('dashboard');
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
    
    // Settings States
    const [newCategory, setNewCategory] = useState('');
    const [newLocation, setNewLocation] = useState('');
    
    // Scanner States
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [scannedCode, setScannedCode] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'pro';
    const categories = useMemo(() => settings.durableGoodsCategories || ['ยานพาหนะ', 'อุปกรณ์อิเล็กทรอนิกส์', 'เครื่องใช้สำนักงาน', 'เฟอร์นิเจอร์'], [settings.durableGoodsCategories]);
    const locations = useMemo(() => settings.serviceLocations || [], [settings.serviceLocations]);

    // --- Helpers ---
    const getStatusLabel = (status: DurableGoodStatus): string => {
        const labels: Record<DurableGoodStatus, string> = {
            available: 'พร้อมใช้งาน',
            in_use: 'กำลังใช้งาน',
            repair: 'ซ่อมบำรุง',
            write_off: 'แทงจำหน่าย'
        };
        return labels[status] || status;
    };

    const getStatusBadgeClass = (status: DurableGoodStatus): string => {
        const classes: Record<DurableGoodStatus, string> = {
            available: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            in_use: 'bg-blue-50 text-blue-600 border-blue-100',
            repair: 'bg-amber-50 text-amber-600 border-amber-100',
            write_off: 'bg-rose-50 text-rose-600 border-rose-100'
        };
        return `px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${classes[status] || 'bg-gray-50 text-gray-600 border-gray-100'}`;
    };

    // --- Data Processing ---
    const filteredGoods = useMemo(() => {
        return (durableGoods || []).filter(item => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = (item.name || '').toLowerCase().includes(search) || 
                                  (item.code || '').toLowerCase().includes(search) ||
                                  (item.location || '').toLowerCase().includes(search);
            const matchesStatus = !filterStatus || item.status === filterStatus;
            const matchesCategory = !filterCategory || item.category === filterCategory;
            return matchesSearch && matchesStatus && matchesCategory;
        }).sort((a,b) => b.id - a.id);
    }, [durableGoods, searchTerm, filterStatus, filterCategory]);

    const stats = useMemo(() => {
        const statusData = [
            { name: 'พร้อมใช้งาน', value: 0, color: '#10B981' },
            { name: 'กำลังใช้งาน', value: 0, color: '#3B82F6' },
            { name: 'ซ่อมบำรุง', value: 0, color: '#F59E0B' },
            { name: 'แทงจำหน่าย', value: 0, color: '#EF4444' },
        ];
        
        let totalValue = 0;
        (durableGoods || []).forEach(item => {
            if (item.status === 'available') statusData[0].value++;
            else if (item.status === 'in_use') statusData[1].value++;
            else if (item.status === 'repair') statusData[2].value++;
            else if (item.status === 'write_off') statusData[3].value++;
            totalValue += (Number(item.price) || 0);
        });

        return { total: (durableGoods || []).length, totalValue, statusData: statusData.filter(d => d.value > 0) };
    }, [durableGoods]);

    // --- Handlers ---
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            ...currentItem, 
            id: currentItem.id || Date.now(),
            status: currentItem.status || 'available',
            category: currentItem.category || categories[0],
            acquisitionDate: currentItem.acquisitionDate || getCurrentThaiDate()
        } as DurableGood);
        setIsModalOpen(false);
    };

    const handleSearchFromScanner = () => {
        const code = scannedCode.trim().toUpperCase();
        if (!code) return;
        const item = durableGoods.find(i => (i.code || '').toUpperCase() === code);
        if (item) {
            setViewItem(item);
            setIsViewModalOpen(true);
            setScannedCode('');
        } else {
            alert('ไม่พบครุภัณฑ์รหัสนี้ในระบบ');
        }
    };

    const handleAddMaintenance = (e: React.FormEvent) => {
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
            maintenanceHistory: [...(safeParseArray(viewItem.maintenanceHistory)), newLog],
            status: 'repair' 
        };

        onSave(updatedItem);
        setViewItem(updatedItem);
        setMaintenanceForm({ date: getCurrentThaiDate(), description: '', cost: 0, technician: '' });
        setIsMaintenanceModalOpen(false);
    };

    const handleExportExcel = () => {
        const header = ['รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'หมวดหมู่', 'สถานที่ตั้ง', 'ราคาทุน', 'วันที่ได้รับ', 'สถานะ'];
        const rows = filteredGoods.map(item => [
            item.code || '',
            item.name || '',
            item.category || '',
            item.location || '',
            Number(item.price || 0).toLocaleString(),
            item.acquisitionDate || '',
            getStatusLabel(item.status)
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += header.join(",") + "\r\n";
        rows.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ทะเบียนครุภัณฑ์_${getCurrentThaiDate().replace(/\//g,'-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddCategory = () => {
        if (newCategory && !categories.includes(newCategory)) {
            onSaveSettings({ ...settings, durableGoodsCategories: [...categories, newCategory] });
            setNewCategory('');
        }
    };

    const handleRemoveCategory = (cat: string) => {
        if (window.confirm(`ต้องการลบหมวดหมู่ "${cat}"?`)) {
            onSaveSettings({ ...settings, durableGoodsCategories: categories.filter(c => c !== cat) });
        }
    };

    const handleAddLocation = () => {
        if (newLocation && !locations.includes(newLocation)) {
            onSaveSettings({ ...settings, serviceLocations: [...locations, newLocation] });
            setNewLocation('');
        }
    };

    const handleRemoveLocation = (loc: string) => {
        if (window.confirm(`ต้องการลบสถานที่ "${loc}" หรือไม่?`)) {
            onSaveSettings({ ...settings, serviceLocations: locations.filter(l => l !== loc) });
        }
    };

    // --- Scanner Logic ---
    useEffect(() => {
        if (activeTab === 'scanner' && isCameraOpen) {
            const start = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    streamRef.current = stream;
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (err) {
                    alert('ไม่สามารถเข้าถึงกล้องได้');
                    setIsCameraOpen(false);
                }
            };
            start();
        } else if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        return () => streamRef.current?.getTracks().forEach(track => track.stop());
    }, [activeTab, isCameraOpen]);

    return (
        <div className="space-y-8 font-sarabun pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
                <div>
                    <h2 className="text-3xl font-black text-navy tracking-tight">คลังครุภัณฑ์ดิจิทัล</h2>
                    <p className="text-gray-500 font-medium mt-1">Durable Goods Smart Inventory System</p>
                </div>
                <div className="flex bg-white/60 p-1.5 rounded-2xl border border-white/50 shadow-sm backdrop-blur-xl">
                    {[
                        { id: 'dashboard', label: 'ภาพรวม', icon: '📊' },
                        { id: 'list', label: 'รายการครุภัณฑ์', icon: '📋' },
                        { id: 'scanner', label: 'สแกน QR', icon: '🔍' },
                        { id: 'settings', label: 'ตั้งค่า', icon: '⚙️' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-primary-blue text-white shadow-lg' : 'text-gray-500 hover:bg-white'}`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">รายการทั้งหมด</p>
                            <h3 className="text-5xl font-black text-navy">{stats.total}</h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">มูลค่ารวม (บาท)</p>
                            <h3 className="text-3xl font-black text-emerald-600">{(stats.totalValue || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">รอดำเนินการซ่อม</p>
                            <h3 className="text-5xl font-black text-amber-500">{stats.statusData.find(s=>s.name === 'ซ่อมบำรุง')?.value || 0}</h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">ตัดจำหน่ายแล้ว</p>
                            <h3 className="text-5xl font-black text-rose-500">{stats.statusData.find(s=>s.name === 'แทงจำหน่าย')?.value || 0}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 h-[450px]">
                        <h3 className="text-xl font-black text-navy mb-10 flex items-center gap-2"><span className="w-1.5 h-6 bg-primary-blue rounded-full"></span>สัดส่วนสถานะครุภัณฑ์ปัจจุบัน</h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" isAnimationActive={false}>
                                    {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* LIST TAB (Table View) */}
            {activeTab === 'list' && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                        <div className="flex-grow flex gap-3 w-full md:w-auto">
                            <div className="relative flex-grow max-w-md">
                                <input type="text" placeholder="ค้นหารหัส, ชื่อ, สถานที่..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-12 py-4 text-sm focus:ring-4 focus:ring-blue-100 shadow-inner transition-all" />
                                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-black text-navy focus:ring-2 focus:ring-primary-blue">
                                <option value="">ทุกหมวดหมู่</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Export Excel
                            </button>
                            <button onClick={() => { setCurrentItem({}); setIsModalOpen(true); }} className="bg-primary-blue text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                เพิ่มครุภัณฑ์
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-gray-100">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b border-gray-100">
                                <tr>
                                    <th className="p-6 w-24">รูปภาพ</th>
                                    <th className="p-6">ข้อมูลครุภัณฑ์</th>
                                    <th className="p-6">หมวดหมู่ / สถานที่</th>
                                    <th className="p-6 text-right">ราคา (บาท)</th>
                                    <th className="p-6 text-center">สถานะ</th>
                                    <th className="p-6 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredGoods.map(item => (
                                    <tr key={item.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="p-6">
                                            <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100 shadow-sm flex-shrink-0">
                                                {getFirstImageSource(item.image) ? (
                                                    <img src={getFirstImageSource(item.image)!} className="w-full h-full object-cover" alt="" />
                                                ) : <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">📦</div>}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-mono text-[11px] font-black text-blue-500 tracking-tighter mb-1 uppercase bg-blue-50 w-fit px-2 py-0.5 rounded">{item.code}</p>
                                            <h4 className="font-black text-navy text-base leading-tight group-hover:text-primary-blue transition-colors">{item.name}</h4>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-bold text-gray-700 text-sm">{item.category}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                                {item.location}
                                            </p>
                                        </td>
                                        <td className="p-6 text-right font-black text-navy">{(Number(item.price) || 0).toLocaleString()}</td>
                                        <td className="p-6 text-center">
                                            <span className={getStatusBadgeClass(item.status)}>{getStatusLabel(item.status)}</span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setViewItem(item); setIsViewModalOpen(true); }} className="p-2.5 bg-white border border-gray-100 rounded-xl text-blue-600 hover:shadow-md transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => { setCurrentItem(item); setIsModalOpen(true); }} className="p-2.5 bg-white border border-gray-100 rounded-xl text-amber-500 hover:shadow-md transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                {isAdmin && <button onClick={() => { if(window.confirm('ลบครุภัณฑ์นี้?')) onDelete([item.id]); }} className="p-2.5 bg-white border border-gray-100 rounded-xl text-rose-500 hover:shadow-md transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredGoods.length === 0 && <div className="p-20 text-center text-gray-300 font-bold italic">ไม่พบรายการครุภัณฑ์</div>}
                    </div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in no-print">
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
                        <h3 className="text-xl font-black text-navy flex items-center gap-3"><span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">📁</span> จัดการหมวดหมู่ครุภัณฑ์</h3>
                        <div className="flex gap-2">
                            <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="เช่น อุปกรณ์กีฬา, สื่อการเรียน..." className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-navy shadow-inner focus:ring-4 focus:ring-indigo-50 transition-all" />
                            <button onClick={handleAddCategory} className="bg-indigo-600 text-white px-8 rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">เพิ่ม</button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {categories.map(c => (
                                <div key={c} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                                    <span className="font-bold text-navy">{c}</span>
                                    <button onClick={() => handleRemoveCategory(c)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
                        <h3 className="text-xl font-black text-navy flex items-center gap-3"><span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">📍</span> จัดการสถานที่ (อาคาร/ห้อง)</h3>
                        <div className="flex gap-2">
                            <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="เช่น อาคารเรียน 1, ห้องประชุม..." className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-navy shadow-inner focus:ring-4 focus:ring-emerald-50 transition-all" />
                            <button onClick={handleAddLocation} className="bg-emerald-600 text-white px-8 rounded-2xl font-black text-sm hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">เพิ่ม</button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {locations.map(l => (
                                <div key={l} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                                    <span className="font-bold text-navy">{l}</span>
                                    <button onClick={() => handleRemoveLocation(l)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SCANNER TAB */}
            {activeTab === 'scanner' && (
                <div className="max-w-xl mx-auto animate-fade-in no-print">
                    <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-white text-center space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                        <div>
                            <h2 className="text-3xl font-black text-navy tracking-tight">สแกนตรวจสอบครุภัณฑ์</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2">Visual ID Verification System</p>
                        </div>

                        <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-[3rem] overflow-hidden bg-slate-950 shadow-2xl border-[12px] border-white ring-8 ring-blue-50/50 group">
                            {!isCameraOpen ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-10 space-y-6">
                                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl shadow-inner">📸</div>
                                    <button onClick={() => setIsCameraOpen(true)} className="bg-navy text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-900 active:scale-95">เปิดกล้องสแกน</button>
                                </div>
                            ) : (
                                <div className="w-full h-full relative">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                                        <div className="w-64 h-64 border-2 border-white/20 rounded-[2rem] relative">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl"></div>
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl"></div>
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl"></div>
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl"></div>
                                        </div>
                                        <div className="w-full h-1 bg-blue-400/50 shadow-[0_0_40px_rgba(96,165,250,1)] absolute animate-scan-line"></div>
                                    </div>
                                    <button onClick={() => setIsCameraOpen(false)} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/20 backdrop-blur-xl text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase border border-white/30 active:scale-95">ยกเลิก</button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">ระบุรหัสครุภัณฑ์โดยตรง</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="เช่น 123-66-001" 
                                    value={scannedCode} 
                                    onChange={e => setScannedCode(e.target.value)} 
                                    className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-5 text-center font-black text-navy text-2xl shadow-inner focus:ring-4 focus:ring-blue-100 transition-all uppercase"
                                />
                                <button onClick={handleSearchFromScanner} className="bg-navy text-white px-8 rounded-2xl font-black hover:bg-blue-900 transition-all active:scale-95">ค้นหา</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADD/EDIT FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] p-4 flex items-center justify-center no-print">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-primary-blue text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black">{currentItem.id ? 'แก้ไขข้อมูล' : 'ลงทะเบียนครุภัณฑ์'}</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Asset Information Entry</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-10 overflow-y-auto space-y-8 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รหัสครุภัณฑ์ *</label>
                                    <input type="text" required value={currentItem.code || ''} onChange={e=>setCurrentItem({...currentItem, code: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black text-navy text-xl shadow-sm uppercase" placeholder="เช่น กส.66.001" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อครุภัณฑ์ *</label>
                                    <input type="text" required value={currentItem.name || ''} onChange={e=>setCurrentItem({...currentItem, name: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-navy shadow-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หมวดหมู่</label>
                                    <select value={currentItem.category || categories[0]} onChange={e=>setCurrentItem({...currentItem, category: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none font-bold text-navy shadow-sm">
                                        {categories.map(c=><option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ราคาทุน (บาท)</label>
                                    <input type="number" value={currentItem.price || ''} onChange={e=>setCurrentItem({...currentItem, price: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none font-black text-emerald-600 shadow-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานที่ตั้ง/อาคาร/ห้อง</label>
                                    <select value={currentItem.location || locations[0]} onChange={e=>setCurrentItem({...currentItem, location: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none font-bold text-navy shadow-sm">
                                        <option value="">-- เลือกสถานที่ --</option>
                                        {locations.map(l=><option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะ</label>
                                    <select value={currentItem.status || 'available'} onChange={e=>setCurrentItem({...currentItem, status: e.target.value as DurableGoodStatus})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none font-bold text-navy shadow-sm">
                                        <option value="available">พร้อมใช้งาน</option>
                                        <option value="in_use">กำลังใช้งาน</option>
                                        <option value="repair">ซ่อมบำรุง</option>
                                        <option value="write_off">แทงจำหน่าย</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รูปภาพประกอบ</label>
                                <div className="border-4 border-dashed border-gray-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center bg-white group hover:border-blue-300 transition-all cursor-pointer relative shadow-inner">
                                    <svg className="w-10 h-10 text-gray-200 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    <span className="text-[10px] font-black text-gray-300 uppercase mt-4">Upload Asset Photo</span>
                                    <input type="file" accept="image/*" onChange={e => { if(e.target.files?.[0]) setCurrentItem({...currentItem, image: [e.target.files[0]]}) }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {currentItem.image && safeParseArray(currentItem.image).length > 0 && <p className="mt-4 text-xs text-emerald-600 font-bold bg-emerald-50 px-4 py-1 rounded-full">✓ เลือกไฟล์เรียบร้อย</p>}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all active:scale-95">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-navy text-white py-4.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-900/30 hover:bg-blue-900 transition-all active:scale-95 disabled:grayscale">บันทึกข้อมูลครุภัณฑ์</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: VIEW DETAILS (QR + Maintenance History) */}
            {isViewModalOpen && viewItem && (
                 <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[90] p-4 flex items-center justify-center overflow-auto no-print" onClick={() => { setIsViewModalOpen(false); setViewItem(null); }}>
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-12 bg-navy text-white flex justify-between items-start shrink-0 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                             <div className="relative z-10 flex gap-10 items-center">
                                <div className="w-36 h-48 bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-white shrink-0">
                                    {getFirstImageSource(viewItem.image) ? <img src={getFirstImageSource(viewItem.image)!} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-gray-100 text-5xl">🪑</div>}
                                </div>
                                <div className="flex-grow">
                                    <span className="bg-white/20 text-white text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] mb-4 inline-block">{viewItem.category}</span>
                                    <h3 className="text-5xl font-black tracking-tighter leading-none max-w-3xl">{viewItem.name}</h3>
                                    <p className="text-blue-300 text-xl font-bold font-mono mt-4 tracking-wider">{viewItem.code}</p>
                                    <div className="flex gap-6 mt-8">
                                        <div className="text-center bg-white/5 px-6 py-2 rounded-2xl border border-white/10"><p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">Status</p><p className="font-bold">{getStatusLabel(viewItem.status)}</p></div>
                                        <div className="text-center bg-white/5 px-6 py-2 rounded-2xl border border-white/10"><p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">Location</p><p className="font-bold">{viewItem.location}</p></div>
                                        <div className="text-center bg-white/5 px-6 py-2 rounded-2xl border border-white/10"><p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">Cost</p><p className="font-bold">{(Number(viewItem.price) || 0).toLocaleString()} ฿</p></div>
                                    </div>
                                </div>
                             </div>
                             <button onClick={() => { setIsViewModalOpen(false); setViewItem(null); }} className="relative z-20 bg-white/10 hover:bg-white/20 p-4 rounded-full transition-all active:scale-90"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <div className="flex flex-col lg:flex-row overflow-hidden flex-grow bg-gray-50/40">
                            {/* Left: Maintenance Logs */}
                            <div className="flex-grow p-12 overflow-y-auto space-y-10 custom-scrollbar">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                                    <div>
                                        <h4 className="text-2xl font-black text-navy tracking-tight">ประวัติการซ่อมบำรุง</h4>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Total {safeParseArray(viewItem.maintenanceHistory).length} Repair Sessions</p>
                                    </div>
                                    <button onClick={() => setIsMaintenanceModalOpen(true)} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center gap-2 active:scale-95">+ แจ้งงานซ่อมใหม่</button>
                                </div>
                                
                                <div className="space-y-6">
                                    {safeParseArray(viewItem.maintenanceHistory).length > 0 ? safeParseArray(viewItem.maintenanceHistory).map((log: MaintenanceLog, idx: number) => (
                                        <div key={log.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:rotate-0 text-navy"><svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg></div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-300 text-lg">#{safeParseArray(viewItem.maintenanceHistory).length - idx}</div>
                                                    <div><p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Maintenance Date</p><p className="text-navy font-black text-lg">{formatThaiDate(log.date)}</p></div>
                                                </div>
                                                <div className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-full font-black text-sm border border-emerald-100 shadow-sm">{(Number(log.cost) || 0).toLocaleString()} ฿</div>
                                            </div>
                                            <p className="text-gray-700 font-medium leading-relaxed italic text-base">"{log.description}"</p>
                                            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-inner">👨‍🔧</div>
                                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Technician: <span className="text-navy">{log.technician || 'ช่างประจำโรงเรียน'}</span></span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Logged by System</span>
                                            </div>
                                        </div>
                                    )).reverse() : (
                                        <div className="p-24 text-center bg-white rounded-[3.5rem] border-4 border-dashed border-gray-100 text-gray-300 font-black italic opacity-30">
                                            <div className="text-6xl mb-6">🛠️</div>
                                            ยังไม่เคยมีประวัติการแจ้งซ่อมบำรุง
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: QR & Intelligent Stats */}
                            <div className="w-full lg:w-[400px] bg-white border-l border-gray-100 p-12 flex flex-col shrink-0">
                                <div className="bg-gray-50 p-12 rounded-[3.5rem] border border-gray-100 flex flex-col items-center justify-center shadow-inner group">
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl transform transition-transform group-hover:scale-105 duration-700 ring-8 ring-white/50">
                                        <img src={`https://quickchart.io/qr?text=${viewItem.code}&size=300&margin=2&ecLevel=H`} className="w-40 h-40" alt="Asset QR" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mt-8">Digital Passport</p>
                                    <p className="font-black text-navy text-2xl tracking-tighter mt-2">{viewItem.code}</p>
                                </div>

                                <div className="mt-12 space-y-8">
                                    <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.4em] border-b border-gray-50 pb-6 text-center">Summary Intelligence</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 text-center shadow-sm">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">ซ่อมบำรุงรวม</p>
                                            <p className="text-4xl font-black text-indigo-600">{safeParseArray(viewItem.maintenanceHistory).length}</p>
                                            <p className="text-[9px] font-bold text-indigo-300 mt-2 uppercase">Times</p>
                                        </div>
                                        <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 text-center shadow-sm">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">จ่ายเงินสะสม</p>
                                            <p className="text-2xl font-black text-emerald-600">{safeParseArray(viewItem.maintenanceHistory).reduce((s,l)=>s+Number(l.cost), 0).toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-emerald-300 mt-2 uppercase">Thai Baht</p>
                                        </div>
                                    </div>
                                    <button onClick={() => window.print()} className="w-full bg-navy text-white py-5 rounded-[2rem] font-black shadow-2xl shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center justify-center gap-4 active:scale-95">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                        พิมพ์บัตรครุภัณฑ์
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADD MAINTENANCE LOG */}
            {isMaintenanceModalOpen && viewItem && (
                 <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] p-4 flex items-center justify-center no-print">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-amber-500 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black">บันทึกข้อมูลการซ่อม</h3>
                                <p className="text-xs font-bold opacity-70">Maintenance Entry Mode</p>
                            </div>
                            <button onClick={() => setIsMaintenanceModalOpen(false)} className="bg-white/20 p-2 rounded-full transition-colors active:scale-90">×</button>
                        </div>
                        <form onSubmit={handleAddMaintenance} className="p-10 space-y-8 bg-gray-50/50">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่ดำเนินการ</label>
                                    <input type="date" required value={buddhistToISO(maintenanceForm.date)} onChange={e=>setMaintenanceForm({...maintenanceForm, date: isoToBuddhist(e.target.value)})} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-black text-navy outline-none shadow-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ค่าใช้จ่าย (บาท)</label>
                                    <input type="number" required value={maintenanceForm.cost || ''} onChange={e=>setMaintenanceForm({...maintenanceForm, cost: Number(e.target.value)})} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-black outline-none shadow-sm text-emerald-600" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ช่างผู้ดำเนินการ / บริษัท</label>
                                <input type="text" required value={maintenanceForm.technician || ''} onChange={e=>setMaintenanceForm({...maintenanceForm, technician: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none font-bold text-navy shadow-sm" placeholder="ระบุชื่อช่างหรือร้านค้า..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รายละเอียดงานซ่อมบำรุง</label>
                                <textarea required rows={4} value={maintenanceForm.description || ''} onChange={e=>setMaintenanceForm({...maintenanceForm, description: e.target.value})} className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-6 outline-none focus:ring-4 focus:ring-amber-100 transition-all font-medium text-navy shadow-inner" placeholder="อธิบายสิ่งที่ซ่อมแซมหรือเปลี่ยนอะไหล่..." />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4.5 rounded-2xl font-black uppercase tracking-widest text-xs">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-amber-500 text-white py-4.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-900/20 active:scale-95 transition-all">บันทึกประวัติลงระบบ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DurableGoodsPage;
