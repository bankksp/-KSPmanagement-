
import React, { useState, useMemo, useEffect } from 'react';
import { PerformanceReport, Personnel } from '../types';
import { getDirectDriveImageSrc, safeParseArray } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PersonnelReportPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    reports: PerformanceReport[];
    onSave: (report: PerformanceReport) => void;
    onDelete: (ids: number[]) => void;
    academicYears: string[];
    positions: string[];
    isSaving: boolean;
}

const PersonnelReportPage: React.FC<PersonnelReportPageProps> = ({ 
    currentUser, personnel, reports, onSave, onDelete, 
    academicYears, positions, isSaving 
}) => {
    const [activeTab, setActiveTab] = useState<'submit' | 'stats'>('stats');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewReport, setViewReport] = useState<PerformanceReport | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('');
    
    const [formData, setFormData] = useState<Partial<PerformanceReport>>({
        academicYear: (new Date().getFullYear() + 543).toString(),
        round: '1',
        note: '',
        file: [],
        status: 'pending'
    });

    const isAdminOrPro = currentUser.role === 'admin' || currentUser.role === 'pro';

    useEffect(() => {
        if (!formData.id) {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setFormData(prev => ({
                ...prev,
                personnelId: currentUser.id,
                name: `${title}${currentUser.personnelName}`,
                position: currentUser.position
            }));
        }
    }, [currentUser, formData.id]);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (r.position || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = !filterYear || r.academicYear === filterYear;
            return matchesSearch && matchesYear;
        }).sort((a, b) => b.id - a.id);
    }, [reports, searchTerm, filterYear]);

    const dashboardStats = useMemo(() => {
        const totalReports = reports.length;
        const uniqueTeachers = new Set(reports.map(r => r.personnelId)).size;
        const approvedCount = reports.filter(r => r.status === 'approved').length;
        const pendingCount = reports.filter(r => r.status === 'pending').length;
        const needsEditCount = reports.filter(r => r.status === 'needs_edit').length;

        const statusData = [
            { name: 'อนุมัติแล้ว', value: approvedCount, color: '#10B981' },
            { name: 'รอตรวจสอบ', value: pendingCount, color: '#F59E0B' },
            { name: 'ปรับปรุง', value: needsEditCount, color: '#EF4444' },
        ].filter(d => d.value > 0);

        const positionCount: Record<string, number> = {};
        reports.forEach(r => {
            positionCount[r.position] = (positionCount[r.position] || 0) + 1;
        });
        const positionData = Object.entries(positionCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        return { totalReports, uniqueTeachers, approvedCount, pendingCount, statusData, positionData };
    }, [reports]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, file: [e.target.files![0]] }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newReport: PerformanceReport = {
            ...formData as PerformanceReport,
            id: formData.id || Date.now(),
            submissionDate: formData.submissionDate || new Date().toLocaleDateString('th-TH'),
            score: formData.score || 0
        };
        onSave(newReport);
        if (!formData.id) {
            setFormData({ ...formData, note: '', file: [], round: '1', status: 'pending' });
            alert('ส่งรายงานเรียบร้อย');
        } else {
            setIsViewModalOpen(false);
            alert('บันทึกการแก้ไขเรียบร้อย');
        }
    };

    const handleOpenView = (report: PerformanceReport) => {
        setViewReport(report);
        if (isAdminOrPro || report.personnelId === currentUser.id) setFormData(report);
        setIsViewModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('ยืนยันการลบรายงาน?')) {
            onDelete([id]);
            setIsViewModalOpen(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200">อนุมัติแล้ว</span>;
            case 'needs_edit': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200">ปรับปรุง</span>;
            default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold border border-yellow-200">รอตรวจสอบ</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stats' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>สถิติการส่ง</button>
                <button onClick={() => setActiveTab('submit')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'submit' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>ส่งรายงาน</button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><p className="text-sm text-gray-500 font-medium">ทั้งหมด</p><p className="text-3xl font-bold text-navy">{dashboardStats.totalReports}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><p className="text-sm text-gray-500 font-medium">ครูที่ส่ง</p><p className="text-3xl font-bold text-purple-600">{dashboardStats.uniqueTeachers}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-green-100"><p className="text-sm text-green-600 font-medium">อนุมัติแล้ว</p><p className="text-3xl font-bold text-green-700">{dashboardStats.approvedCount}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-yellow-100"><p className="text-sm text-yellow-600 font-medium">รอดำเนินการ</p><p className="text-3xl font-bold text-yellow-700">{dashboardStats.pendingCount}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dashboardStats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>{dashboardStats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboardStats.positionData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} /><Tooltip /><Bar dataKey="value" name="จำนวน" fill="#3B82F6" radius={[0, 4, 4, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
                    </div>
                </div>
            )}
            
            {activeTab === 'submit' && (
                <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-fade-in">
                    <h2 className="text-2xl font-black text-navy mb-6">ส่งรายงานการปฏิบัติงาน</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ปีการศึกษา</label>
                                <select value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:bg-white transition-all outline-none">
                                    {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">รอบการประเมิน</label>
                                <select value={formData.round} onChange={e => setFormData({...formData, round: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:bg-white transition-all outline-none">
                                    <option value="1">รอบที่ 1 (ต.ค. - มี.ค.)</option>
                                    <option value="2">รอบที่ 2 (เม.ย. - ก.ย.)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">แนบไฟล์รายงาน (PDF, Word, Zip)</label>
                            <input type="file" onChange={handleFileChange} className="w-full text-sm" />
                            {formData.file && safeParseArray(formData.file).length > 0 && <p className="mt-2 text-xs text-green-600 font-bold">✓ เลือกไฟล์เรียบร้อย</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุเพิ่มเติม</label>
                            <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} rows={3} className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:bg-white transition-all outline-none" placeholder="ระบุรายละเอียดเพิ่มเติม..." />
                        </div>
                        <button type="submit" disabled={isSaving} className="w-full py-4 bg-primary-blue text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50">
                            {isSaving ? 'กำลังส่งข้อมูล...' : 'ยืนยันส่งรายงาน'}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-gray-100">
                         <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-6">ประวัติการส่งของคุณ</h3>
                         <div className="space-y-4">
                            {reports.filter(r => r.personnelId === currentUser.id).map(r => (
                                <div key={r.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-200">
                                    <div>
                                        <p className="font-bold text-navy">ปี {r.academicYear} | รอบที่ {r.round}</p>
                                        <p className="text-xs text-gray-400 mt-1">ส่งเมื่อ: {r.submissionDate}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(r.status)}
                                        <button onClick={() => handleOpenView(r)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-navy transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                    </div>
                                </div>
                            ))}
                            {reports.filter(r => r.personnelId === currentUser.id).length === 0 && <p className="text-center py-10 text-gray-400 italic">ยังไม่มีประวัติการส่งรายงาน</p>}
                         </div>
                    </div>
                </div>
            )}

            {isViewModalOpen && viewReport && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-navy text-white flex justify-between items-center shrink-0">
                            <div><h3 className="text-2xl font-black">{viewReport.name}</h3><p className="text-blue-100 text-xs mt-1 font-bold">ปีการศึกษา {viewReport.academicYear} | รอบที่ {viewReport.round}</p></div>
                            <button onClick={() => setIsViewModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-10 overflow-y-auto space-y-10 flex-grow bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">ตำแหน่ง</label><p className="font-bold text-navy">{viewReport.position}</p></div>
                                    <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">วันที่ส่ง</label><p className="font-bold text-navy">{viewReport.submissionDate}</p></div>
                                </div>
                                <div className="p-8 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center group">
                                    <div className="p-5 bg-blue-50 text-blue-600 rounded-full mb-4 group-hover:scale-110 transition-transform"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                                    {safeParseArray(viewReport.file).length > 0 ? <a href={getDirectDriveImageSrc(safeParseArray(viewReport.file)[0])} target="_blank" rel="noreferrer" className="bg-navy text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:bg-blue-900 transition-all">เปิดดูไฟล์รายงาน</a> : <p className="text-gray-400 font-bold italic">ไม่พบไฟล์แนบ</p>}
                                </div>
                            </div>
                            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 border-b pb-2">ความคิดเห็นจากผู้บริหาร / หมายเหตุ</label><p className="text-gray-700 italic">"{viewReport.note || 'ไม่มีข้อมูล'}"</p></div>
                            <div className="p-10 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2.5rem] border border-blue-100 flex items-center justify-between">
                                <div><h4 className="text-2xl font-black text-navy">สถานะรายงาน</h4><p className="text-xs text-gray-500 font-bold uppercase mt-1">Status Verification</p></div>
                                <div className="scale-150 transform-gpu">{getStatusBadge(viewReport.status)}</div>
                            </div>
                            {isAdminOrPro && (
                                <div className="pt-6 border-t border-gray-200 space-y-6">
                                    <h4 className="font-black text-gray-400 uppercase tracking-[0.2em] text-center">Admin Controls</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => onSave({...viewReport, status: 'approved'})} className="py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all active:scale-95">อนุมัติรายงาน</button>
                                        <button onClick={() => { const reason = prompt('ระบุสาเหตุที่ต้องแก้ไข:'); if(reason) onSave({...viewReport, status: 'needs_edit', note: reason}) }} className="py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-all active:scale-95">ตีกลับให้แก้ไข</button>
                                    </div>
                                    <button onClick={() => handleDelete(viewReport.id)} className="w-full py-4 text-rose-500 font-black hover:bg-rose-50 rounded-2xl transition-colors">ลบรายการถาวร</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelReportPage;
