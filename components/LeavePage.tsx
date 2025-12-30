
import React, { useState, useMemo, useEffect } from 'react';
import { LeaveRecord, Personnel, Settings, LeaveStatus, LeaveSession } from '../types';
import { 
    getCurrentThaiDate, 
    formatThaiDate, 
    buddhistToISO, 
    isoToBuddhist, 
    normalizeDate, 
    toThaiNumerals,
    formatThaiDateTime,
    getDirectDriveImageSrc,
    safeParseArray
} from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface LeavePageProps {
    currentUser: Personnel;
    records: LeaveRecord[];
    onSave: (record: LeaveRecord) => void;
    onDelete: (ids: number[]) => void;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
    isSaving: boolean;
    personnel: Personnel[];
}

const LeavePage: React.FC<LeavePageProps> = ({ 
    currentUser, records, onSave, onDelete, settings, onSaveSettings, isSaving, personnel 
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'approval' | 'settings'>('stats');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<Partial<LeaveRecord>>({});
    const [viewRecord, setViewRecord] = useState<LeaveRecord | null>(null);

    // Filters
    const [searchName, setSearchName] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    const isAdmin = currentUser.role === 'admin';
    const isApprover = isAdmin || currentUser.specialRank === 'director' || currentUser.specialRank === 'deputy' || (settings.leaveApproverIds || []).includes(currentUser.id);

    // --- Computed Data ---
    const myRecords = useMemo(() => records.filter(r => r.personnelId === currentUser.id).sort((a, b) => b.id - a.id), [records, currentUser.id]);
    
    const displayRecords = useMemo(() => {
        const base = isAdmin || isApprover ? records : myRecords;
        return base.filter(r => {
            const matchesName = r.personnelName.toLowerCase().includes(searchName.toLowerCase());
            const matchesType = !filterType || r.type === filterType;
            const matchesStatus = !filterStatus || r.status === filterStatus;
            return matchesName && matchesType && matchesStatus;
        }).sort((a, b) => b.id - a.id);
    }, [records, myRecords, isAdmin, isApprover, searchName, filterType, filterStatus]);

    const pendingApprovals = useMemo(() => records.filter(r => r.status === 'pending').sort((a, b) => b.id - a.id), [records]);

    const stats = useMemo(() => {
        const source = isAdmin || isApprover ? records : myRecords;
        const total = source.length;
        const approved = source.filter(r => r.status === 'approved').length;
        
        const typeCounts: Record<string, number> = {};
        source.filter(r => r.status === 'approved').forEach(r => {
            typeCounts[r.type] = (typeCounts[r.type] || 0) + (r.daysCount || 0);
        });
        const chartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

        return { total, approved, chartData };
    }, [records, myRecords, isAdmin, isApprover]);

    // --- Handlers ---
    const handleOpenModal = (record?: LeaveRecord) => {
        if (record) {
            setCurrentRecord({ ...record });
        } else {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setCurrentRecord({
                personnelId: currentUser.id,
                personnelName: `${title}${currentUser.personnelName}`,
                position: currentUser.position,
                type: settings.leaveTypes?.[0] || 'ลาป่วย',
                startDate: getCurrentThaiDate(),
                endDate: getCurrentThaiDate(),
                session: 'full' as LeaveSession,
                reason: '',
                status: 'pending' as LeaveStatus,
                submissionDate: getCurrentThaiDate(),
                files: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveRecord = (e: React.FormEvent) => {
        e.preventDefault();
        const start = normalizeDate(currentRecord.startDate);
        const end = normalizeDate(currentRecord.endDate);
        
        let days = 0;
        if (start && end) {
            const diffTime = Math.abs(end.getTime() - start.getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (currentRecord.session !== 'full') days = 0.5;
        }

        const recordToSave = {
            ...currentRecord,
            id: currentRecord.id || Date.now(),
            daysCount: days,
            submissionDate: currentRecord.submissionDate || getCurrentThaiDate()
        } as LeaveRecord;
        
        onSave(recordToSave);
        setIsModalOpen(false);
    };

    const handleApprove = (record: LeaveRecord, status: LeaveStatus, comment: string = '') => {
        onSave({
            ...record,
            status,
            comment,
            approverName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            approvedDate: getCurrentThaiDate()
        });
        alert(`ดำเนินการ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}เรียบร้อย`);
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'pending': return 'รออนุมัติ';
            case 'approved': return 'อนุมัติแล้ว';
            case 'rejected': return 'ไม่อนุมัติ';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100';
        }
    };

    const COLORS_LIST = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    ระบบการลาบุคลากร
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm md:text-base">ยื่นใบลา</button>
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print border border-gray-100">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>สถิติการลา</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>รายการลา</button>
                {isApprover && <button onClick={() => setActiveTab('approval')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'approval' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                    พิจารณาอนุมัติ
                    {pendingApprovals.length > 0 && <span className="bg-white text-orange-600 px-1.5 py-0.5 rounded-full text-[10px] animate-pulse">{pendingApprovals.length}</span>}
                </button>}
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] shadow border border-emerald-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนจำนวนวันลาแยกตามประเภท</h3>
                            <div className="h-64">
                                {stats.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                                {stats.chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_LIST[index % COLORS_LIST.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 italic">ไม่มีข้อมูลการลาที่อนุมัติ</div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-6 rounded-3xl shadow border-l-4 border-blue-500"><p className="text-gray-500 text-sm font-bold">การลายื่นเสนอทั้งหมด</p><p className="text-3xl font-black text-navy mt-1">{stats.total} ครั้ง</p></div>
                            <div className="bg-white p-6 rounded-3xl shadow border-l-4 border-green-500"><p className="text-gray-500 text-sm font-bold">อนุมัติเรียบร้อย</p><p className="text-3xl font-black text-green-600 mt-1">{stats.approved} ครั้ง</p></div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-3xl shadow border border-gray-100 animate-fade-in no-print">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <input type="text" placeholder="ค้นหาชื่อ..." value={searchName} onChange={e => setSearchName(e.target.value)} className="border rounded-xl px-4 py-2 text-sm flex-grow" />
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-xl px-4 py-2 text-sm">
                            <option value="">ทุกประเภท</option>
                            {settings.leaveTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-xl px-4 py-2 text-sm">
                            <option value="">ทุกสถานะ</option>
                            <option value="pending">รออนุมัติ</option>
                            <option value="approved">อนุมัติแล้ว</option>
                            <option value="rejected">ไม่อนุมัติ</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-4">วันที่ยื่น</th>
                                    <th className="p-4">ชื่อ-นามสกุล</th>
                                    <th className="p-4">ประเภท</th>
                                    <th className="p-4">ระยะเวลา</th>
                                    <th className="p-4 text-center">สถานะ</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRecords.map(r => (
                                    <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-gray-500">{r.submissionDate}</td>
                                        <td className="p-4 font-bold text-navy">{r.personnelName}</td>
                                        <td className="p-4">{r.type}</td>
                                        <td className="p-4">
                                            <div className="font-bold">{r.startDate} - {r.endDate}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-tighter">จำนวน {r.daysCount} วัน ({r.session === 'full' ? 'เต็มวัน' : r.session === 'morning' ? 'ครึ่งเช้า' : 'ครึ่งบ่าย'})</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(r.status)}`}>{getStatusLabel(r.status)}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="text-blue-600 font-bold hover:underline">ดูรายละเอียด</button>
                                        </td>
                                    </tr>
                                ))}
                                {displayRecords.length === 0 && (
                                    <tr><td colSpan={6} className="p-12 text-center text-gray-400">ไม่พบรายการข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'approval' && isApprover && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-xl font-black text-orange-800 flex items-center gap-2">
                        <span className="p-2 bg-orange-100 rounded-xl">🖋️</span> รายการรอการพิจารณา ({pendingApprovals.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingApprovals.map(r => (
                            <div key={r.id} className="bg-white p-6 rounded-3xl shadow-xl border border-orange-100 hover:shadow-2xl transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-lg font-black text-navy">{r.personnelName}</h4>
                                        <p className="text-xs text-gray-400 font-bold">{r.position}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase border border-blue-100">{r.type}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl mb-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400 font-bold">วันที่ลา</span>
                                        <span className="font-bold text-navy">{r.startDate} - {r.endDate}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400 font-bold">จำนวนวัน</span>
                                        <span className="font-bold text-indigo-600">{r.daysCount} วัน</span>
                                    </div>
                                    <div className="text-sm pt-2 border-t border-slate-200">
                                        <p className="text-gray-400 font-bold mb-1">เหตุผลการลา</p>
                                        <p className="text-gray-700 italic">"{r.reason}"</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApprove(r, 'approved')} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95">อนุมัติ</button>
                                    <button onClick={() => { const msg = prompt('ระบุเหตุผลที่ไม่อนุมัติ:'); if(msg) handleApprove(r, 'rejected', msg); }} className="flex-1 py-3 bg-white border-2 border-rose-500 text-rose-500 font-black rounded-xl hover:bg-rose-50 transition-all active:scale-95">ไม่อนุมัติ</button>
                                </div>
                            </div>
                        ))}
                        {pendingApprovals.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">ไม่มีรายการค้างพิจารณา</div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: SUBMIT LEAVE */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b bg-primary-blue text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold">ยื่นใบลาอิเล็กทรอนิกส์</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSaveRecord} className="p-8 overflow-y-auto space-y-5 bg-[#F8F9FB]">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทการลา</label>
                                    <select value={currentRecord.type} onChange={e => setCurrentRecord({...currentRecord, type: e.target.value})} className="w-full border rounded-2xl px-4 py-3 bg-white shadow-sm font-bold text-navy" required>
                                        {settings.leaveTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ตั้งแต่วันที่</label>
                                    <input type="date" required value={buddhistToISO(currentRecord.startDate)} onChange={e => setCurrentRecord({...currentRecord, startDate: isoToBuddhist(e.target.value)})} className="w-full border rounded-2xl px-4 py-3 shadow-sm font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ถึงวันที่</label>
                                    <input type="date" required value={buddhistToISO(currentRecord.endDate)} onChange={e => setCurrentRecord({...currentRecord, endDate: isoToBuddhist(e.target.value)})} className="w-full border rounded-2xl px-4 py-3 shadow-sm font-bold" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ช่วงเวลา</label>
                                    <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl">
                                        <button type="button" onClick={() => setCurrentRecord({...currentRecord, session: 'full'})} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${currentRecord.session === 'full' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>เต็มวัน</button>
                                        <button type="button" onClick={() => setCurrentRecord({...currentRecord, session: 'morning'})} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${currentRecord.session === 'morning' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>ครึ่งเช้า</button>
                                        <button type="button" onClick={() => setCurrentRecord({...currentRecord, session: 'afternoon'})} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${currentRecord.session === 'afternoon' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>ครึ่งบ่าย</button>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เหตุผลการลา</label>
                                    <textarea required rows={3} value={currentRecord.reason} onChange={e => setCurrentRecord({...currentRecord, reason: e.target.value})} className="w-full border rounded-2xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-primary-blue" placeholder="ระบุเหตุผลความจำเป็น..." />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ที่อยู่/เบอร์โทรติดต่อขณะลา</label>
                                    <input type="text" value={currentRecord.contactAddress} onChange={e => setCurrentRecord({...currentRecord, contactAddress: e.target.value})} className="w-full border rounded-2xl px-4 py-3 shadow-sm mb-2" placeholder="ที่อยู่..." />
                                    <input type="tel" value={currentRecord.contactPhone} onChange={e => setCurrentRecord({...currentRecord, contactPhone: e.target.value})} className="w-full border rounded-2xl px-4 py-3 shadow-sm" placeholder="เบอร์โทรศัพท์..." />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white border-2 border-gray-200 text-gray-400 px-8 py-3 rounded-2xl font-black transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="bg-primary-blue text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                                    {isSaving ? 'กำลังส่ง...' : 'ส่งใบลา'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: VIEW DETAILS */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black">รายละเอียดใบลา</h3>
                            <button onClick={() => setIsViewModalOpen(false)} className="bg-white/20 p-2 rounded-full">&times;</button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto bg-gray-50">
                            <div className="text-center pb-6 border-b border-dashed border-gray-300">
                                <h4 className="text-2xl font-black text-navy">{viewRecord.personnelName}</h4>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{viewRecord.position}</p>
                                <div className="mt-4 inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-black text-sm border border-blue-200 uppercase">{viewRecord.type}</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">วันที่ลา</p>
                                    <p className="font-black text-navy">{viewRecord.startDate} - {viewRecord.endDate}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">จำนวนวัน</p>
                                    <p className="font-black text-blue-600">{viewRecord.daysCount} วัน</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">เหตุผล</p>
                                    <div className="bg-white p-4 rounded-2xl border italic text-gray-700 text-sm">"{viewRecord.reason}"</div>
                                </div>
                                <div className="col-span-2 pt-4 border-t border-gray-200 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">สถานะรายการ</p>
                                        <ResultBadge type={viewRecord.status as any} />
                                    </div>
                                    {viewRecord.approverName && (
                                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-xs">
                                            <p className="font-black text-emerald-800 mb-1">ผลการพิจารณา</p>
                                            <p className="text-emerald-600">โดย: {viewRecord.approverName} เมื่อวันที่ {viewRecord.approvedDate}</p>
                                            {viewRecord.comment && <p className="mt-2 text-gray-600 font-bold italic">"{viewRecord.comment}"</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-white flex justify-end gap-2">
                             <button onClick={() => setIsViewModalOpen(false)} className="bg-slate-100 text-slate-500 px-6 py-3 rounded-2xl font-black">ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal result badge for status
const ResultBadge = ({ type }: { type: LeaveStatus }) => {
    const labels = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };
    const colors = { 
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
        approved: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
        rejected: 'bg-rose-100 text-rose-700 border-rose-200' 
    };
    return <span className={`px-4 py-1 rounded-full text-xs font-black uppercase border ${colors[type]}`}>{labels[type]}</span>;
};

export default LeavePage;
