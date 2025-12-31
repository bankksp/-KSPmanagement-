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
    const [viewRecord, setViewRecord] = useState<ConstructionRecord | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const stats = useMemo(() => {
        const total = records.length;
        const totalBudget = records.reduce((sum, r) => sum + (Number(r.budget) || 0), 0);
        const active = records.filter(r => r.status === 'in_progress').length;
        
        const statusCounts = { not_started: 0, in_progress: 0, completed: 0, delayed: 0 };
        records.forEach(r => { if (statusCounts[r.status] !== undefined) statusCounts[r.status]++; });
        
        const pieData = [
            { name: 'ยังไม่เริ่ม', value: statusCounts.not_started, color: '#9CA3AF' },
            { name: 'กำลังดำเนินการ', value: statusCounts.in_progress, color: '#3B82F6' },
            { name: 'เสร็จสิ้น', value: statusCounts.completed, color: '#10B981' },
            { name: 'ล่าช้า', value: statusCounts.delayed, color: '#EF4444' }
        ].filter(d => d.value > 0);

        return { total, totalBudget, active, pieData };
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const searchLower = (searchTerm || '').toLowerCase();
            const matchesSearch = (r.projectName || '').toLowerCase().includes(searchLower) || 
                                  (r.contractor || '').toLowerCase().includes(searchLower);
            const matchesStatus = !filterStatus || r.status === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => parseThaiDateForSort(b.date) - parseThaiDateForSort(a.date));
    }, [records, searchTerm, filterStatus]);

    const handleOpenModal = (record?: ConstructionRecord) => {
        if (record) setCurrentRecord({ ...record });
        else setCurrentRecord({
            date: getCurrentThaiDate(),
            projectName: '',
            contractor: '',
            location: '',
            progress: 0,
            status: 'not_started',
            contractorWork: '',
            materials: '',
            workers: '',
            description: '',
            budget: 0,
            media: [],
            reporter: `${currentUser.personnelTitle}${currentUser.personnelName}`
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const recordToSave = {
            ...currentRecord,
            id: currentRecord.id || Date.now(),
            budget: Number(currentRecord.budget) || 0,
            progress: Number(currentRecord.progress) || 0,
        } as ConstructionRecord;
        onSave(recordToSave);
        setIsModalOpen(false);
    };

    const getStatusLabel = (s: ConstructionStatus) => {
        switch(s) {
            case 'not_started': return 'ยังไม่เริ่ม';
            case 'in_progress': return 'กำลังดำเนินการ';
            case 'completed': return 'เสร็จสิ้น';
            case 'delayed': return 'ล่าช้า';
            default: return s;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in font-sarabun pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-black text-navy tracking-tight">ระบบควบคุมงานก่อสร้าง</h2>
                <div className="flex gap-2 bg-white/50 p-1 rounded-2xl border border-gray-200 shadow-sm no-print">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>แดชบอร์ด</button>
                    <button onClick={() => setActiveTab('list')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>โครงการ</button>
                </div>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 border-l-8 border-l-blue-500">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">งบประมาณรวม</p>
                            <h3 className="text-3xl font-black text-navy mt-1 tracking-tight">{stats.totalBudget.toLocaleString()} <span className="text-sm font-normal text-gray-400">บาท</span></h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 border-l-8 border-l-amber-500">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">โครงการกำลังดำเนินการ</p>
                            <h3 className="text-3xl font-black text-amber-500 mt-1 tracking-tight">{stats.active} <span className="text-sm font-normal text-gray-400">รายการ</span></h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 border-l-8 border-l-emerald-500">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">ทั้งหมดในระบบ</p>
                            <h3 className="text-3xl font-black text-emerald-500 mt-1 tracking-tight">{stats.total} <span className="text-sm font-normal text-gray-400">รายการ</span></h3>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-navy mb-10 text-center">สรุปสถานะงานก่อสร้างและซ่อมบำรุง</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={10} dataKey="value" isAnimationActive={false}>
                                        {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <h3 className="text-2xl font-black text-navy">ทะเบียนคุมงานก่อสร้าง</h3>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                             เริ่มบันทึกงานใหม่
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-gray-50 p-4 rounded-3xl">
                        <input type="text" placeholder="ค้นหาชื่อโครงการ/ผู้รับเหมา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-white border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary-blue shadow-sm" />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border-none rounded-2xl px-5 py-3 text-sm font-bold text-navy shadow-sm">
                            <option value="">ทุกสถานะ</option>
                            <option value="not_started">ยังไม่เริ่ม</option>
                            <option value="in_progress">กำลังดำเนินการ</option>
                            <option value="completed">เสร็จสิ้น</option>
                            <option value="delayed">ล่าช้า</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecords.map(r => (
                            <div key={r.id} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col h-full">
                                <div className="p-6 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 ${r.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {getStatusLabel(r.status)}
                                        </span>
                                        <p className="text-[10px] text-gray-400 font-bold">{formatThaiDate(r.date)}</p>
                                    </div>
                                    <h4 className="font-black text-navy text-lg leading-tight mb-2 truncate" title={r.projectName}>{r.projectName}</h4>
                                    <div className="space-y-1 mb-4">
                                        <p className="text-xs text-gray-500 font-bold"><span className="text-gray-300">ผู้รับเหมา:</span> {r.contractor}</p>
                                        <p className="text-xs text-gray-500 font-bold"><span className="text-gray-300">งบประมาณ:</span> {Number(r.budget).toLocaleString()} บ.</p>
                                    </div>
                                    
                                    <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden shadow-inner">
                                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${r.progress}%` }}></div>
                                    </div>
                                    <p className="text-[10px] font-black text-indigo-600 text-right uppercase tracking-widest">Progress: {r.progress}%</p>
                                </div>
                                <div className="p-4 bg-gray-50/50 border-t border-gray-50 flex gap-2">
                                    <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="flex-1 bg-white border border-gray-200 text-navy py-2.5 rounded-xl font-bold text-xs hover:bg-white hover:shadow-md transition-all active:scale-95">ดูรายละเอียด</button>
                                    <button onClick={() => handleOpenModal(r)} className="p-2.5 bg-white border border-gray-200 text-amber-500 rounded-xl hover:bg-white hover:shadow-md transition-all active:scale-95"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                    <button onClick={() => onDelete([r.id])} className="p-2.5 bg-white border border-gray-200 text-rose-500 rounded-xl hover:bg-white hover:shadow-md transition-all active:scale-95"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 no-print">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-primary-blue text-white flex justify-between items-center">
                            <h3 className="text-2xl font-black">{currentRecord.id ? 'แก้ไขข้อมูลโครงการ' : 'เพิ่มโครงการก่อสร้างใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-2 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-10 overflow-y-auto space-y-8 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อโครงการก่อสร้าง/ปรับปรุง *</label>
                                    <input type="text" required value={currentRecord.projectName} onChange={e => setCurrentRecord({...currentRecord, projectName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue shadow-sm font-black text-navy" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ผู้รับจ้าง/บริษัท *</label>
                                    <input type="text" required value={currentRecord.contractor} onChange={e => setCurrentRecord({...currentRecord, contractor: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue shadow-sm font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">งบประมาณตามสัญญา (บาท)</label>
                                    {/* Fix: Wrap e.target.value with Number() to match number type */}
                                    <input type="number" value={currentRecord.budget} onChange={e => setCurrentRecord({...currentRecord, budget: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none shadow-sm font-black text-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ความคืบหน้า (%)</label>
                                    <input type="range" min="0" max="100" value={currentRecord.progress} onChange={e => setCurrentRecord({...currentRecord, progress: Number(e.target.value)})} className="w-full h-10 accent-blue-600" />
                                    <p className="text-right text-xs font-black text-blue-500">{currentRecord.progress}%</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะโครงการ</label>
                                    <select value={currentRecord.status} onChange={e => setCurrentRecord({...currentRecord, status: e.target.value as any})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none font-bold">
                                        <option value="not_started">ยังไม่เริ่ม</option>
                                        <option value="in_progress">กำลังดำเนินการ</option>
                                        <option value="completed">เสร็จสิ้น</option>
                                        <option value="delayed">ล่าช้า</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่รายงาน</label>
                                    <input type="date" value={buddhistToISO(currentRecord.date)} onChange={e => setCurrentRecord({...currentRecord, date: isoToBuddhist(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none font-bold" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รายละเอียดงาน/วัสดุที่ใช้</label>
                                <textarea rows={4} value={currentRecord.description} onChange={e => setCurrentRecord({...currentRecord, description: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue shadow-inner" placeholder="ระบุสิ่งที่ทำในวันนี้..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white border border-gray-200 text-gray-400 px-12 py-4 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="bg-navy text-white px-16 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-900/20 hover:bg-blue-900 active:scale-95 transition-all">บันทึกข้อมูล</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: VIEW DETAILS */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setIsViewModalOpen(false)}>
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-10 bg-navy text-white text-center">
                            <h3 className="text-2xl font-black mb-2">{viewRecord.projectName}</h3>
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-70">{viewRecord.contractor}</p>
                        </div>
                        <div className="p-10 overflow-y-auto bg-gray-50 space-y-6">
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                                     <p className="text-[10px] font-black text-gray-400 uppercase mb-1">งบประมาณสัญญา</p>
                                     <p className="text-2xl font-black text-green-600">{Number(viewRecord.budget).toLocaleString()} บ.</p>
                                 </div>
                                 <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                                     <p className="text-[10px] font-black text-gray-400 uppercase mb-1">สถานะโครงการ</p>
                                     <p className="text-xl font-black text-navy">{getStatusLabel(viewRecord.status)}</p>
                                 </div>
                             </div>
                             <div className="p-8 bg-white rounded-[2rem] border border-gray-100 space-y-4">
                                 <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">รายละเอียดความคืบหน้า</h5>
                                 <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                                     <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${viewRecord.progress}%` }}></div>
                                 </div>
                                 <p className="text-right font-black text-indigo-600">{viewRecord.progress}% Complete</p>
                                 <div className="pt-4 border-t border-gray-50 italic text-gray-600 text-sm leading-relaxed">
                                     "{viewRecord.description || 'ไม่มีข้อมูลเพิ่มเติม'}"
                                 </div>
                             </div>
                             <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">
                                 <span>ผู้รายงาน: {viewRecord.reporter}</span>
                                 <span>วันที่: {viewRecord.date}</span>
                             </div>
                        </div>
                        <div className="p-6 border-t flex justify-center bg-white">
                             <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-100 text-gray-500 px-16 py-3 rounded-2xl font-black transition-all hover:bg-gray-200">ปิดหน้าต่าง</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConstructionPage;