
import React, { useState, useMemo, useEffect } from 'react';
import { ConstructionRecord, Personnel, ConstructionStatus } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, parseThaiDateForSort } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ConstructionPageProps {
    currentUser: Personnel;
    records: ConstructionRecord[];
    onSave: (record: ConstructionRecord) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
    personnel?: Personnel[]; 
}

const ConstructionPage: React.FC<ConstructionPageProps> = ({ currentUser, records, onSave, onDelete, isSaving, personnel = [] }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<Partial<ConstructionRecord>>({});
    const [viewRecord, setViewProject] = useState<ConstructionRecord | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const stats = useMemo(() => {
        const total = records.length;
        const totalBudget = records.reduce((sum, r) => sum + (r.budget || 0), 0);
        const active = records.filter(r => r.status === 'in_progress').length;
        const completed = records.filter(r => r.status === 'completed').length;
        const statusCounts = { not_started: 0, in_progress: 0, completed: 0, delayed: 0 };
        records.forEach(r => { if (statusCounts[r.status] !== undefined) statusCounts[r.status]++; });
        const pieData = [
            { name: 'ยังไม่เริ่ม', value: statusCounts.not_started, color: '#9CA3AF' },
            { name: 'กำลังดำเนินการ', value: statusCounts.in_progress, color: '#3B82F6' },
            { name: 'เสร็จสิ้น', value: statusCounts.completed, color: '#10B981' },
            { name: 'ล่าช้า', value: statusCounts.delayed, color: '#EF4444' }
        ].filter(d => d.value > 0);
        const progressData = records.map(r => ({ name: r.projectName.substring(0, 15), progress: r.progress })).sort((a, b) => b.progress - a.progress).slice(0, 10);
        return { total, totalBudget, active, completed, pieData, progressData };
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            return (r.projectName.includes(searchTerm) || r.contractor.includes(searchTerm)) && (!filterStatus || r.status === filterStatus);
        }).sort((a, b) => parseThaiDateForSort(b.date) - parseThaiDateForSort(a.date));
    }, [records, searchTerm, filterStatus]);

    useEffect(() => {
        if (isViewModalOpen) setCurrentSlide(0);
    }, [isViewModalOpen]);

    const handleOpenModal = (record?: ConstructionRecord) => {
        setCurrentRecord(record ? { ...record } : {
            date: getCurrentThaiDate(), projectName: '', contractor: '', location: '', progress: 0, status: 'not_started',
            contractorWork: '', materials: '', workers: '', description: '', problems: '', budget: 0, media: [],
            reporter: `${currentUser.personnelTitle}${currentUser.personnelName}`, supervisors: [currentUser.id]
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...currentRecord,
            id: currentRecord.id || Date.now(),
            progress: Number(currentRecord.progress),
            budget: Number(currentRecord.budget),
            contractorWork: currentRecord.contractorWork || '',
            supervisors: currentRecord.supervisors || []
        } as ConstructionRecord);
        setIsModalOpen(false);
    };

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setCurrentRecord(prev => ({ ...prev, media: [...(prev.media || []), ...Array.from(e.target.files!)] }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'dashboard' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600'}`}>สถิติการก่อสร้าง</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600'}`}>บันทึกข้อมูล</button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in no-print">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">โครงการ</p><p className="text-3xl font-bold">{stats.total}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">งบประมาณ</p><p className="text-2xl font-bold text-green-600">{stats.totalBudget.toLocaleString()}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">กำลังทำ</p><p className="text-3xl font-bold text-blue-600">{stats.active}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">เสร็จแล้ว</p><p className="text-3xl font-bold text-gray-600">{stats.completed}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} isAnimationActive={false}><Cell fill="#8884d8"/></Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>
                        <div className="bg-white p-6 rounded-xl shadow h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.progressData} layout="vertical" margin={{left: 40}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}}/><Tooltip/><Bar dataKey="progress" fill="#3B82F6" isAnimationActive={false}/></BarChart></ResponsiveContainer></div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-xl font-bold text-navy">รายการงานก่อสร้าง</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg">เพิ่มรายงาน</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100"><tr><th className="p-3">วันที่</th><th className="p-3">โครงการ</th><th className="p-3">ความคืบหน้า</th><th className="p-3">สถานะ</th><th className="p-3">จัดการ</th></tr></thead>
                            <tbody>
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="border-b">
                                        <td className="p-3">{formatThaiDate(r.date)}</td>
                                        <td className="p-3">{r.projectName}</td>
                                        <td className="p-3">{r.progress}%</td>
                                        <td className="p-3">{r.status}</td>
                                        <td className="p-3"><button onClick={() => handleOpenModal(r)} className="text-amber-600">แก้ไข</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-3xl p-6">
                        <h3 className="text-lg font-bold mb-4">{currentRecord.id ? 'แก้ไข' : 'เพิ่ม'} รายงาน</h3>
                        <form onSubmit={handleSave} className="space-y-3">
                            <input type="date" value={buddhistToISO(currentRecord.date)} onChange={e => setCurrentRecord({...currentRecord, date: isoToBuddhist(e.target.value)})} className="border rounded px-3 py-2 w-full" />
                            <input type="text" placeholder="ชื่อโครงการ" value={currentRecord.projectName} onChange={e => setCurrentRecord({...currentRecord, projectName: e.target.value})} className="border rounded px-3 py-2 w-full" required />
                            <input type="text" placeholder="ผู้รับเหมา" value={currentRecord.contractor} onChange={e => setCurrentRecord({...currentRecord, contractor: e.target.value})} className="border rounded px-3 py-2 w-full" required />
                            <textarea placeholder="รายละเอียดงาน" value={currentRecord.contractorWork} onChange={e => setCurrentRecord({...currentRecord, contractorWork: e.target.value})} className="border rounded px-3 py-2 w-full" />
                            <input type="number" placeholder="ความคืบหน้า (%)" value={currentRecord.progress} onChange={e => setCurrentRecord({...currentRecord, progress: Number(e.target.value)})} className="border rounded px-3 py-2 w-full" />
                            <select value={currentRecord.status} onChange={e => setCurrentRecord({...currentRecord, status: e.target.value as ConstructionStatus})} className="border rounded px-3 py-2 w-full">
                                <option value="not_started">ยังไม่เริ่ม</option>
                                <option value="in_progress">กำลังดำเนินการ</option>
                                <option value="completed">เสร็จสิ้น</option>
                            </select>
                            <input type="file" multiple accept="image/*" onChange={handleMediaChange} className="w-full" />
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded">ยกเลิก</button>
                                <button type="submit" className="bg-primary-blue text-white px-4 py-2 rounded">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConstructionPage;
