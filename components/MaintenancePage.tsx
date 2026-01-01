
import React, { useState, useMemo, useEffect } from 'react';
import { MaintenanceRequest, MaintenanceStatus, Personnel } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getDirectDriveImageSrc, getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate } from '../utils';

interface MaintenancePageProps {
    currentUser: Personnel;
    requests: MaintenanceRequest[];
    onSave: (request: MaintenanceRequest) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ currentUser, requests, onSave, onDelete, isSaving }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    
    // Form State
    const [currentItem, setCurrentItem] = useState<Partial<MaintenanceRequest>>({});
    
    // Stats
    const stats = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'pending').length;
        const inProgress = requests.filter(r => r.status === 'in_progress').length;
        const completed = requests.filter(r => r.status === 'completed').length;
        const cannotRepair = requests.filter(r => r.status === 'cannot_repair').length;
        const totalCost = requests.reduce((sum, r) => sum + (r.cost || 0), 0);

        const statusData = [
            { name: 'รอรับงาน', value: pending, color: '#9CA3AF' },
            { name: 'กำลังดำเนินการ', value: inProgress, color: '#F59E0B' },
            { name: 'ซ่อมแล้ว', value: completed, color: '#10B981' },
            { name: 'ซ่อมไม่ได้', value: cannotRepair, color: '#EF4444' },
        ].filter(d => d.value > 0);

        return { total, pending, inProgress, completed, cannotRepair, totalCost, statusData };
    }, [requests]);

    // Filtering
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesSearch = 
                req.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !filterStatus || req.status === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => b.id - a.id);
    }, [requests, searchTerm, filterStatus]);

    const handleOpenModal = (request?: MaintenanceRequest) => {
        if (request) {
            setCurrentItem({ ...request });
        } else {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setCurrentItem({
                date: getCurrentThaiDate(),
                requesterName: `${title}${currentUser.personnelName}`,
                status: 'pending',
                itemName: '',
                description: '',
                location: '',
                cost: 0,
                image: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const requestToSave = {
            ...currentItem,
            id: currentItem.id || Date.now(),
            cost: Number(currentItem.cost) || 0,
        } as MaintenanceRequest;
        
        onSave(requestToSave);
        setIsModalOpen(false);
    };

    const handleStatusChange = (request: MaintenanceRequest, newStatus: MaintenanceStatus) => {
        // If completing, set completion date
        let updates: Partial<MaintenanceRequest> = { status: newStatus };
        if (newStatus === 'completed' && !request.completionDate) {
            updates.completionDate = getCurrentThaiDate();
        }
        onSave({ ...request, ...updates });
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'pending': return 'รอรับงาน';
            case 'in_progress': return 'กำลังดำเนินการ';
            case 'completed': return 'ซ่อมแล้ว';
            case 'cannot_repair': return 'ซ่อมไม่ได้';
            default: return status;
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-gray-100 text-gray-600';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cannot_repair': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100';
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCurrentItem(prev => ({ ...prev, image: [e.target.files![0]] }));
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                    สถิติการซ่อม
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    รายการแจ้งซ่อม
                </button>
                <div className="flex-grow flex justify-end">
                    <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        แจ้งซ่อมใหม่
                    </button>
                </div>
            </div>

            {/* DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-sm text-gray-500">แจ้งซ่อมทั้งหมด</p>
                            <p className="text-3xl font-bold text-navy">{stats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-green-100">
                            <p className="text-sm text-green-600">ซ่อมเสร็จแล้ว</p>
                            <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-yellow-100">
                            <p className="text-sm text-yellow-600">กำลังดำเนินการ</p>
                            <p className="text-3xl font-bold text-yellow-700">{stats.inProgress}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-red-100">
                            <p className="text-sm text-red-600">ซ่อมไม่ได้</p>
                            <p className="text-3xl font-bold text-red-700">{stats.cannotRepair}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สถานะการดำเนินงาน</h3>
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
                                        <Legend verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow flex flex-col justify-center items-center">
                            <div className="text-center">
                                <div className="p-4 bg-blue-50 rounded-full inline-block mb-4">
                                    <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-600">งบประมาณการซ่อมบำรุงรวม</h3>
                                <p className="text-4xl font-bold text-primary-blue mt-2">{stats.totalCost.toLocaleString()} บาท</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
                        <h2 className="text-xl font-bold text-navy">รายการแจ้งซ่อม</h2>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input 
                                type="text" 
                                placeholder="ค้นหารายการ, ผู้แจ้ง..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue flex-grow"
                            />
                            <select 
                                value={filterStatus} 
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue"
                            >
                                <option value="">ทุกสถานะ</option>
                                <option value="pending">รอรับงาน</option>
                                <option value="in_progress">กำลังดำเนินการ</option>
                                <option value="completed">ซ่อมแล้ว</option>
                                <option value="cannot_repair">ซ่อมไม่ได้</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b text-sm text-gray-600">
                                <tr>
                                    <th className="p-4">วันที่แจ้ง</th>
                                    <th className="p-4">รายการ/อาการ</th>
                                    <th className="p-4">สถานที่</th>
                                    <th className="p-4">ผู้แจ้ง</th>
                                    <th className="p-4 text-center">สถานะ</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filteredRequests.map(req => (
                                    <tr key={req.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 whitespace-nowrap">{formatThaiDate(req.date)}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-navy">{req.itemName}</div>
                                            <div className="text-xs text-gray-500">{req.description}</div>
                                            {req.image && req.image.length > 0 && (
                                                <a href={getDirectDriveImageSrc(req.image[0])} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    ดูรูปภาพ
                                                </a>
                                            )}
                                        </td>
                                        <td className="p-4">{req.location}</td>
                                        <td className="p-4">{req.requesterName}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(req.status)}`}>
                                                {getStatusLabel(req.status)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <button onClick={() => handleOpenModal(req)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold w-full">
                                                    แก้ไข/ดู
                                                </button>
                                                {/* Quick Status Change */}
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleStatusChange(req, 'in_progress')} className="w-6 h-6 rounded bg-yellow-100 text-yellow-600 hover:bg-yellow-200 flex items-center justify-center" title="กำลังดำเนินการ">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleStatusChange(req, 'completed')} className="w-6 h-6 rounded bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center" title="ซ่อมเสร็จ">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                    <button onClick={() => handleStatusChange(req, 'cannot_repair')} className="w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center" title="ซ่อมไม่ได้">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRequests.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentItem.id ? 'แก้ไขข้อมูลแจ้งซ่อม' : 'แจ้งซ่อมพัสดุ/ครุภัณฑ์'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-grow">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่แจ้ง</label>
                                    <input 
                                        type="date" 
                                        value={buddhistToISO(currentItem.date)} 
                                        onChange={e => setCurrentItem({...currentItem, date: isoToBuddhist(e.target.value)})} 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ผู้แจ้ง</label>
                                    <input type="text" value={currentItem.requesterName} onChange={e => setCurrentItem({...currentItem, requesterName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รายการที่ชำรุด/เสียหาย *</label>
                                <input type="text" required value={currentItem.itemName} onChange={e => setCurrentItem({...currentItem, itemName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" placeholder="เช่น เครื่องปรับอากาศ, หลอดไฟ" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">อาการ/รายละเอียด *</label>
                                <textarea required value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" rows={3} placeholder="ระบุอาการเสีย..." />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">สถานที่ *</label>
                                <input type="text" required value={currentItem.location} onChange={e => setCurrentItem({...currentItem, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" placeholder="เช่น ห้องพักครูหมวดวิทย์" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพประกอบ</label>
                                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                            </div>

                            {/* Admin/Technician Fields */}
                            <div className="border-t pt-4 mt-4 bg-gray-50 p-3 rounded-lg border-gray-200">
                                <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">ส่วนของเจ้าหน้าที่</h4>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">สถานะ</label>
                                        <select value={currentItem.status} onChange={e => setCurrentItem({...currentItem, status: e.target.value as MaintenanceStatus})} className="w-full px-3 py-2 border rounded-lg text-sm">
                                            <option value="pending">รอรับงาน</option>
                                            <option value="in_progress">กำลังดำเนินการ</option>
                                            <option value="completed">ซ่อมแล้ว</option>
                                            <option value="cannot_repair">ซ่อมไม่ได้</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">ค่าใช้จ่าย (บาท)</label>
                                        <input type="number" min="0" value={currentItem.cost} onChange={e => setCurrentItem({...currentItem, cost: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">ผู้ดำเนินการซ่อม</label>
                                    <input type="text" value={currentItem.repairerName || ''} onChange={e => setCurrentItem({...currentItem, repairerName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="ระบุชื่อช่าง/ร้านค้า" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 text-gray-700">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenancePage;
