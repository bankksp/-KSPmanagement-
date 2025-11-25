
import React, { useState, useMemo, useEffect } from 'react';
import { DurableGood, DurableGoodStatus, Personnel } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getFirstImageSource, getDirectDriveImageSrc, prepareDataForApi } from '../utils';

interface DurableGoodsPageProps {
    currentUser: Personnel;
    durableGoods: DurableGood[];
    onSave: (item: DurableGood) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
}

const DurableGoodsPage: React.FC<DurableGoodsPageProps> = ({ currentUser, durableGoods, onSave, onDelete, isSaving }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'categories'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<DurableGood>>({});
    const [viewItem, setViewItem] = useState<DurableGood | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Category Management State (Mock)
    const [categories, setCategories] = useState<string[]>(['ยานพาหนะ', 'อุปกรณ์อิเล็กทรอนิกส์', 'เครื่องใช้สำนักงาน', 'เฟอร์นิเจอร์', 'อุปกรณ์ห้องประชุม']);
    const [newCategory, setNewCategory] = useState('');

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
        const inUse = durableGoods.filter(i => i.status === 'in_use').length;
        const repair = durableGoods.filter(i => i.status === 'repair').length;
        const writeOff = durableGoods.filter(i => i.status === 'write_off').length;
        const totalValue = durableGoods.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

        const statusData = [
            { name: 'พร้อมใช้งาน', value: available, color: '#10B981' }, // Green
            { name: 'กำลังใช้งาน', value: inUse, color: '#3B82F6' }, // Blue
            { name: 'ซ่อมบำรุง', value: repair, color: '#F59E0B' }, // Orange
            { name: 'แทงจำหน่าย', value: writeOff, color: '#EF4444' }, // Red
        ].filter(d => d.value > 0);

        // Category Data
        const categoryCount: Record<string, number> = {};
        durableGoods.forEach(item => {
            categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        });
        
        // Category Value Data
        const categoryValue: Record<string, number> = {};
        durableGoods.forEach(item => {
             categoryValue[item.category] = (categoryValue[item.category] || 0) + (Number(item.price) || 0);
        });

        const categoryData = Object.entries(categoryCount).map(([name, count]) => ({
            name,
            count,
            value: categoryValue[name] || 0
        })).sort((a, b) => b.value - a.value); // Sort by value

        return { total, available, inUse, repair, writeOff, totalValue, statusData, categoryData };
    }, [durableGoods]);

    // --- Handlers ---

    const handleSaveCategory = () => {
        if (newCategory.trim() && !categories.includes(newCategory)) {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory('');
        }
    };

    const handleDeleteCategory = (cat: string) => {
        if (window.confirm(`ยืนยันการลบหมวดหมู่ ${cat}?`)) {
            setCategories(categories.filter(c => c !== cat));
        }
    };

    const handleOpenModal = (item?: DurableGood) => {
        if (item) {
            setCurrentItem({ ...item });
        } else {
            setCurrentItem({
                code: '', name: '', category: categories[0] || '', 
                price: 0, acquisitionDate: new Date().toLocaleDateString('th-TH'), 
                status: 'available', location: '', description: '', image: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const itemToSave = {
            ...currentItem,
            id: currentItem.id || Date.now(),
            price: Number(currentItem.price),
        } as DurableGood;
        onSave(itemToSave);
        setIsModalOpen(false);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size > 0 && window.confirm(`ยืนยันการลบ ${selectedIds.size} รายการ?`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredGoods.map(i => i.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleExportExcel = () => {
        const header = ['รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'หมวดหมู่', 'วันที่ได้มา', 'ราคา', 'สถานะ', 'สถานที่เก็บ'];
        const rows = filteredGoods.map(i => [
            `"${i.code}"`,
            `"${i.name}"`,
            `"${i.category}"`,
            `"${i.acquisitionDate}"`,
            i.price,
            `"${getStatusLabel(i.status)}"`,
            `"${i.location}"`
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += header.join(",") + "\r\n";
        rows.forEach(row => {
            csvContent += row.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `durable_goods_${new Date().toLocaleDateString('th-TH')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    return (
        <div className="space-y-6">
            {/* Sidebar/Tabs - mimicking design in screenshot */}
            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    หน้าหลัก
                </button>
                <button 
                    onClick={() => setActiveTab('categories')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'categories' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    หมวดหมู่ครุภัณฑ์
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    ข้อมูลครุภัณฑ์
                </button>
                {/* Fake Report Tab to match image */}
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-gray-400 cursor-not-allowed">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    รายงาน
                </button>
            </div>

            {/* ==================== DASHBOARD TAB ==================== */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-navy">ยินดีต้อนรับเข้าสู่ระบบจัดเก็บครุภัณฑ์</h2>
                        <img src="https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png" className="h-12 w-auto opacity-80 grayscale hover:grayscale-0 transition-all" alt="Logo" />
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">ครุภัณฑ์ทั้งหมด</p>
                                <p className="text-2xl font-bold text-navy">{stats.total} รายการ</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">พร้อมใช้งาน</p>
                                <p className="text-2xl font-bold text-green-600">{stats.available} รายการ</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg text-green-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">กำลังใช้งาน</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.inUse} รายการ</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">มูลค่ารวมทั้งสิ้น</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.totalValue.toLocaleString()} บาท</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-gray-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Chart 1: Status Pie */}
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนครุภัณฑ์ตามสถานะ</h3>
                            <div className="h-64">
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
                                        >
                                            {stats.statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                {stats.statusData.map((d, i) => (
                                    <div key={i} className="flex justify-between border-b pb-1">
                                        <span className="text-gray-600">{d.name}</span>
                                        <span className="font-bold">{d.value} รายการ</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chart 2: Category Bar */}
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สรุปตามหมวดหมู่</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} fontSize={12} tick={{fill: '#4B5563'}} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                        <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} name="มูลค่ารวม (บาท)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="overflow-y-auto max-h-40 mt-4">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 text-left">
                                            <th className="pb-2">หมวดหมู่</th>
                                            <th className="pb-2 text-right">จำนวน</th>
                                            <th className="pb-2 text-right">มูลค่ารวม (บาท)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.categoryData.map((d, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="py-2">{d.name}</td>
                                                <td className="py-2 text-right">{d.count}</td>
                                                <td className="py-2 text-right font-semibold">{d.value.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-blue-50 font-bold">
                                            <td className="py-2 pl-2 rounded-l-lg">รวมทั้งหมด</td>
                                            <td className="py-2 text-right">{stats.total}</td>
                                            <td className="py-2 text-right pr-2 rounded-r-lg">{stats.totalValue.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== CATEGORIES TAB ==================== */}
            {activeTab === 'categories' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <h2 className="text-2xl font-bold text-navy mb-4">จัดการหมวดหมู่ครุภัณฑ์</h2>
                    
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={newCategory} 
                            onChange={(e) => setNewCategory(e.target.value)} 
                            placeholder="ชื่อหมวดหมู่ใหม่..." 
                            className="border rounded-lg px-4 py-2 flex-grow focus:ring-2 focus:ring-primary-blue"
                        />
                        <button onClick={handleSaveCategory} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">+ เพิ่มหมวดหมู่</button>
                    </div>

                    <div className="bg-white border rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-bold text-gray-700 w-16">ลำดับ</th>
                                    <th className="p-4 font-bold text-gray-700">ชื่อหมวดหมู่</th>
                                    <th className="p-4 font-bold text-gray-700">จำนวนครุภัณฑ์</th>
                                    <th className="p-4 font-bold text-gray-700 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat, idx) => {
                                    const count = durableGoods.filter(i => i.category === cat).length;
                                    return (
                                        <tr key={cat} className="border-b hover:bg-gray-50">
                                            <td className="p-4">{idx + 1}</td>
                                            <td className="p-4 font-medium">{cat}</td>
                                            <td className="p-4 text-center w-32">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">{count} รายการ</span>
                                            </td>
                                            <td className="p-4 text-center w-48">
                                                <div className="flex justify-center gap-2">
                                                    <button className="bg-sky-100 text-sky-700 px-3 py-1 rounded hover:bg-sky-200 text-sm">แก้ไข</button>
                                                    <button onClick={() => handleDeleteCategory(cat)} className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-sm">ลบ</button>
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

            {/* ==================== LIST TAB ==================== */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-navy">รายการครุภัณฑ์ทั้งหมด</h2>
                        <div className="flex gap-2">
                            <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                ส่งออก Excel
                            </button>
                            <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                เพิ่มครุภัณฑ์ใหม่
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
                            <input 
                                type="text" 
                                placeholder="ระบุรหัส หรือ ชื่อครุภัณฑ์..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกหมวดหมู่</label>
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                <option value="">ทั้งหมด</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกสถานะ</label>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                <option value="">ทั้งหมด</option>
                                <option value="available">พร้อมใช้งาน</option>
                                <option value="in_use">กำลังใช้งาน</option>
                                <option value="repair">ซ่อมบำรุง</option>
                                <option value="write_off">แทงจำหน่าย</option>
                            </select>
                        </div>
                        <button onClick={() => {setSearchTerm(''); setFilterCategory(''); setFilterStatus('');}} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">ล้างค่า</button>
                        
                        {selectedIds.size > 0 && (
                            <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm ml-auto">
                                ลบ {selectedIds.size} รายการ
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-700 text-sm">
                                <tr>
                                    <th className="p-3 w-10 text-center"><input type="checkbox" onChange={handleSelectAll} checked={filteredGoods.length > 0 && selectedIds.size === filteredGoods.length} /></th>
                                    <th className="p-3">ลำดับ</th>
                                    <th className="p-3">รหัสครุภัณฑ์</th>
                                    <th className="p-3">ชื่อครุภัณฑ์</th>
                                    <th className="p-3">หมวดหมู่</th>
                                    <th className="p-3">วันที่ได้มา</th>
                                    <th className="p-3 text-right">มูลค่า (บาท)</th>
                                    <th className="p-3 text-center">สถานะ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filteredGoods.map((item, idx) => (
                                    <tr key={item.id} className={`border-b hover:bg-blue-50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => {
                                            const newSet = new Set(selectedIds);
                                            if(newSet.has(item.id)) newSet.delete(item.id);
                                            else newSet.add(item.id);
                                            setSelectedIds(newSet);
                                        }} /></td>
                                        <td className="p-3">{idx + 1}</td>
                                        <td className="p-3 font-mono text-gray-600">{item.code}</td>
                                        <td className="p-3 font-medium text-navy">{item.name}</td>
                                        <td className="p-3 text-gray-500">{item.category}</td>
                                        <td className="p-3 text-gray-500">{item.acquisitionDate}</td>
                                        <td className="p-3 text-right">{item.price.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(item.status)}`}>
                                                {getStatusLabel(item.status)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => {setViewItem(item); setIsViewModalOpen(true);}} className="p-1 bg-sky-100 text-sky-700 rounded hover:bg-sky-200" title="ดูรายละเอียด"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => handleOpenModal(item)} className="p-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200" title="แก้ไข"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={() => onDelete([item.id])} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200" title="ลบ"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredGoods.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-gray-500">ไม่พบรายการครุภัณฑ์</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-sm text-gray-500 flex justify-between">
                        <span>แสดง {1} ถึง {filteredGoods.length} จาก {durableGoods.length} แถว</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>ก่อนหน้า</button>
                            <button className="px-3 py-1 bg-primary-blue text-white rounded">1</button>
                            <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>ถัดไป</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== ADD/EDIT MODAL ==================== */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-primary-blue text-white rounded-t-xl">
                            <h3 className="text-xl font-bold">{currentItem.id ? 'แก้ไขข้อมูลครุภัณฑ์' : 'เพิ่มครุภัณฑ์ใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รหัสครุภัณฑ์ *</label>
                                    <input type="text" required value={currentItem.code} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อครุภัณฑ์ *</label>
                                    <input type="text" required value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ *</label>
                                    <select required value={currentItem.category} onChange={e => setCurrentItem({...currentItem, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="">-- เลือกหมวดหมู่ --</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ *</label>
                                    <select required value={currentItem.status} onChange={e => setCurrentItem({...currentItem, status: e.target.value as DurableGoodStatus})} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="available">พร้อมใช้งาน</option>
                                        <option value="in_use">กำลังใช้งาน</option>
                                        <option value="repair">ซ่อมบำรุง</option>
                                        <option value="write_off">แทงจำหน่าย</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ได้มา</label>
                                    <input type="text" value={currentItem.acquisitionDate} onChange={e => setCurrentItem({...currentItem, acquisitionDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="วว/ดด/ปปปป (พ.ศ.)" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่า (บาท)</label>
                                    <input type="number" value={currentItem.price} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่จัดเก็บ</label>
                                    <input type="text" value={currentItem.location} onChange={e => setCurrentItem({...currentItem, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="เช่น ห้องทำงาน 101" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดเพิ่มเติม</label>
                                    <textarea rows={3} value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพ</label>
                                    <input type="file" accept="image/*" onChange={e => {
                                        if (e.target.files && e.target.files[0]) setCurrentItem({...currentItem, image: [e.target.files[0]]});
                                    }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                                </div>
                            </div>
                        </form>
                        <div className="p-6 border-t flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold">ยกเลิก</button>
                            <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 font-bold shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== VIEW MODAL ==================== */}
            {isViewModalOpen && viewItem && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-t-xl">
                            <h3 className="text-xl font-bold">ข้อมูลครุภัณฑ์</h3>
                            <button onClick={() => setIsViewModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-grow flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-1/2">
                                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border">
                                    {viewItem.image && viewItem.image.length > 0 ? (
                                        <img src={getDirectDriveImageSrc(viewItem.image[0])} alt={viewItem.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    )}
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 space-y-4">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">รหัสครุภัณฑ์</span>
                                    <p className="text-xl font-mono font-bold text-navy">{viewItem.code}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">ชื่อรายการ</span>
                                    <p className="text-lg font-semibold text-gray-800">{viewItem.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">หมวดหมู่</span>
                                        <p className="font-medium">{viewItem.category}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">สถานะ</span>
                                        <p><span className={`px-2 py-0.5 rounded text-sm font-bold ${getStatusColor(viewItem.status)}`}>{getStatusLabel(viewItem.status)}</span></p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">วันที่ได้มา</span>
                                        <p className="font-medium">{viewItem.acquisitionDate}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">มูลค่า</span>
                                        <p className="font-medium">{viewItem.price.toLocaleString()} บาท</p>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">สถานที่จัดเก็บ</span>
                                    <p className="font-medium bg-gray-50 p-2 rounded border">{viewItem.location || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">รายละเอียดเพิ่มเติม</span>
                                    <p className="text-sm text-gray-600">{viewItem.description || '-'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                            <button className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                พิมพ์ป้ายทรัพย์สิน (QR)
                            </button>
                            <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow hover:bg-blue-700">ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DurableGoodsPage;