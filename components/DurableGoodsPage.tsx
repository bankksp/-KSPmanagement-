
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

/* Fix: Implemented DurableGoodsPage component and added default export to fix "Module has no default export" error in App.tsx line 23 */
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
    const [isScanning, setIsScanning] = useState(false); 
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

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            ...currentItem, 
            id: currentItem.id || Date.now(),
            status: currentItem.status || 'available',
            category: currentItem.category || categories[0]
        } as DurableGood);
        setIsModalOpen(false);
    };

    const handleDeleteItem = (id: number) => {
        if (window.confirm('ยืนยันการลบรายการครุภัณฑ์นี้หรือไม่?')) {
            onDelete([id]);
        }
    };

    const handleViewItem = (item: DurableGood) => {
        setViewItem(item);
        setIsViewModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-navy">ระบบจัดการครุภัณฑ์</h2>
                <div className="flex bg-white/50 p-1 rounded-xl border border-gray-200 shadow-sm no-print">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>แดชบอร์ด</button>
                    <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>รายการครุภัณฑ์</button>
                    <button onClick={() => setActiveTab('scanner')} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'scanner' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>QR Scanner</button>
                </div>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-sm text-gray-500">ครุภัณฑ์ทั้งหมด</p>
                            <p className="text-3xl font-bold text-navy">{stats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-green-100">
                            <p className="text-sm text-green-600">พร้อมใช้งาน</p>
                            <p className="text-3xl font-bold text-green-700">{stats.available}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-yellow-100">
                            <p className="text-sm text-yellow-600">ซ่อมบำรุง</p>
                            <p className="text-3xl font-bold text-yellow-700">{stats.repair}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-sm text-gray-500">มูลค่ารวม</p>
                            <p className="text-2xl font-bold text-navy">{stats.totalValue.toLocaleString()} บ.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนตามสถานะ</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                            {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-navy">ทะเบียนครุภัณฑ์</h3>
                        <button onClick={() => { setCurrentItem({}); setIsModalOpen(true); }} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            เพิ่มครุภัณฑ์ใหม่
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <input type="text" placeholder="ค้นหารหัส, ชื่อ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue" />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                            <option value="">ทุกสถานะ</option>
                            <option value="available">พร้อมใช้งาน</option>
                            <option value="in_use">กำลังใช้งาน</option>
                            <option value="repair">ซ่อมบำรุง</option>
                            <option value="write_off">แทงจำหน่าย</option>
                        </select>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                            <option value="">ทุกหมวดหมู่</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-50 border-b text-gray-600">
                                <tr>
                                    <th className="p-3">รหัส</th>
                                    <th className="p-3">ชื่อครุภัณฑ์</th>
                                    <th className="p-3">หมวดหมู่</th>
                                    <th className="p-3">ราคา</th>
                                    <th className="p-3">สถานะ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGoods.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-mono">{item.code}</td>
                                        <td className="p-3 font-bold text-navy">{item.name}</td>
                                        <td className="p-3">{item.category}</td>
                                        <td className="p-3">{(Number(item.price) || 0).toLocaleString()}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                                item.status === 'available' ? 'bg-green-100 text-green-700' :
                                                item.status === 'repair' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleViewItem(item)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => { setCurrentItem(item); setIsModalOpen(true); }} className="text-amber-600 hover:bg-amber-50 p-1 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'scanner' && (
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center">
                    <div className="w-64 h-64 bg-gray-100 rounded-3xl border-4 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                        <p className="text-center p-4">QR Scanner Area<br/>(ฟังก์ชันสแกนตรวจสอบ)</p>
                    </div>
                    <p className="mt-6 text-gray-500 font-bold">สแกน QR Code ประจำครุภัณฑ์เพื่อตรวจสอบข้อมูล</p>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentItem.id ? 'แก้ไขข้อมูล' : 'เพิ่มครุภัณฑ์ใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รหัสครุภัณฑ์ *</label>
                                <input type="text" required value={currentItem.code || ''} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อรายการ *</label>
                                <input type="text" required value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">หมวดหมู่</label>
                                    <select value={currentItem.category || categories[0]} onChange={e => setCurrentItem({...currentItem, category: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">สถานะ</label>
                                    <select value={currentItem.status || 'available'} onChange={e => setCurrentItem({...currentItem, status: e.target.value as DurableGoodStatus})} className="w-full border rounded-lg px-3 py-2">
                                        <option value="available">พร้อมใช้งาน</option>
                                        <option value="in_use">กำลังใช้งาน</option>
                                        <option value="repair">ซ่อมบำรุง</option>
                                        <option value="write_off">แทงจำหน่าย</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ราคา (บาท)</label>
                                <input type="number" value={currentItem.price || ''} onChange={e => setCurrentItem({...currentItem, price: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียด</label>
                                <textarea rows={2} value={currentItem.description || ''} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isViewModalOpen && viewItem && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
                        <div className="p-5 border-b bg-navy text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">รายละเอียดครุภัณฑ์</h3>
                            <button onClick={() => setIsViewModalOpen(false)} className="hover:bg-white/20 rounded-full p-1">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-xs text-gray-500 font-bold uppercase">รหัส</p><p className="font-mono">{viewItem.code}</p></div>
                                <div><p className="text-xs text-gray-500 font-bold uppercase">หมวดหมู่</p><p>{viewItem.category}</p></div>
                            </div>
                            <div><p className="text-xs text-gray-500 font-bold uppercase">ชื่อ</p><p className="text-lg font-bold text-navy">{viewItem.name}</p></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-xs text-gray-500 font-bold uppercase">ราคา</p><p>{(Number(viewItem.price) || 0).toLocaleString()} บาท</p></div>
                                <div><p className="text-xs text-gray-500 font-bold uppercase">สถานะ</p><p>{viewItem.status}</p></div>
                            </div>
                            <div className="flex justify-end pt-4 border-t">
                                <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-gray-200 rounded-lg">ปิด</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DurableGoodsPage;
