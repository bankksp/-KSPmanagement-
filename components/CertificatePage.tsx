
import React, { useState, useMemo, useEffect } from 'react';
import { CertificateRequest, Personnel } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, toThaiNumerals } from '../utils';

interface CertificatePageProps {
    currentUser: Personnel;
    requests: CertificateRequest[];
    onSave: (request: CertificateRequest) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
}

const CertificatePage: React.FC<CertificatePageProps> = ({ currentUser, requests = [], onSave, onDelete, isSaving }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    // Form State
    const [formData, setFormData] = useState<Partial<CertificateRequest>>({
        requesterName: '',
        date: getCurrentThaiDate(),
        activityName: '',
        peopleCount: 1,
        academicYear: (new Date().getFullYear() + 543).toString(),
        activityNo: '',
        prefix: 'กส.ปญ',
        note: ''
    });

    // Stats Logic
    const stats = useMemo(() => {
        const safeRequests = Array.isArray(requests) ? requests : [];
        const total = safeRequests.length;
        const currentYear = (new Date().getFullYear() + 543).toString();
        const thisYearCount = safeRequests.filter(r => String(r.academicYear) === currentYear).length;

        // Group by Year
        const yearCounts: Record<string, number> = {};
        safeRequests.forEach(r => {
            const y = r.academicYear || 'ไม่ระบุ';
            yearCounts[y] = (yearCounts[y] || 0) + 1;
        });

        const chartData = Object.entries(yearCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { total, thisYearCount, chartData };
    }, [requests]);

    // Auto-fill requester name if new form
    useEffect(() => {
        if (!formData.id && currentUser) {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setFormData(prev => ({
                ...prev,
                requesterName: `${title}${currentUser.personnelName}`
            }));
        }
    }, [currentUser, formData.id]);

    const filteredRequests = useMemo(() => {
        const safeRequests = Array.isArray(requests) ? requests : [];
        const lowerSearch = searchTerm.toLowerCase().trim();
        
        return safeRequests.filter(req => {
            const rName = (req.requesterName || '').toLowerCase();
            const aName = (req.activityName || '').toLowerCase();
            const gNum = (req.generatedNumber || '').toLowerCase();
            
            return rName.includes(lowerSearch) || 
                   aName.includes(lowerSearch) || 
                   gNum.includes(lowerSearch);
        }).sort((a, b) => Number(b.id) - Number(a.id));
    }, [requests, searchTerm]);

    const handleOpenModal = (req?: CertificateRequest) => {
        if (req) {
            setFormData(req);
        } else {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setFormData({
                requesterName: `${title}${currentUser.personnelName}`,
                date: getCurrentThaiDate(),
                activityName: '',
                peopleCount: 1,
                academicYear: (new Date().getFullYear() + 543).toString(),
                activityNo: '',
                prefix: 'กส.ปญ',
                note: ''
            });
        }
        setIsModalOpen(true);
    };

    const generateCertNumber = (prefix: string, count: number, activityNo: string, year: string) => {
        if (!activityNo || !year) return '-';
        let range = '1';
        if (count > 1) range = `1-${count}`;
        return `${prefix} ${range}/${activityNo}/${year}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const certNumber = generateCertNumber(
            formData.prefix || 'กส.ปญ',
            Number(formData.peopleCount) || 1,
            formData.activityNo || '',
            formData.academicYear || ''
        );

        const requestToSave: CertificateRequest = {
            id: formData.id || Date.now(),
            requesterName: formData.requesterName || '',
            date: formData.date || '',
            activityName: formData.activityName || '',
            peopleCount: Number(formData.peopleCount) || 1,
            academicYear: formData.academicYear || '',
            activityNo: formData.activityNo || '',
            prefix: formData.prefix || 'กส.ปญ',
            generatedNumber: certNumber,
            note: formData.note || ''
        };

        onSave(requestToSave);
        setIsModalOpen(false);
    };

    const handleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size > 0 && window.confirm(`ยืนยันการลบ ${selectedIds.size} รายการ?`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const COLORS_PALETTE = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#2563EB'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
                    <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                    ระบบขอเลขเกียรติบัตร
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-primary-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    ขอเลขเกียรติบัตรใหม่
                </button>
            </div>

            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติการใช้งาน
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    ทะเบียนคุมเลขเกียรติบัตร
                </button>
            </div>

            {/* --- TAB: STATS --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">เกียรติบัตรทั้งหมด</p>
                                <h3 className="text-4xl font-black text-navy mt-1">{stats.total} <span className="text-sm font-normal text-gray-400">รายการ</span></h3>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">ปีการศึกษา {new Date().getFullYear() + 543}</p>
                                <h3 className="text-4xl font-black text-green-600 mt-1">{stats.thisYearCount} <span className="text-sm font-normal text-gray-400">รายการ</span></h3>
                            </div>
                            <div className="p-4 bg-green-50 rounded-2xl text-green-600 shadow-inner">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-navy mb-6">สถิติจำนวนเกียรติบัตรแยกตามปีการศึกษา</h3>
                        <div className="h-80 w-full">
                            {stats.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontWeight: 'bold'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                                        <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                        <Bar dataKey="value" name="จำนวน (รายการ)" radius={[8, 8, 0, 0]} barSize={40}>
                                            {stats.chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS_PALETTE[index % COLORS_PALETTE.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                    <svg className="w-16 h-16 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    <p className="font-bold">ยังไม่มีข้อมูลในระบบ</p>
                                    <button onClick={() => handleOpenModal()} className="mt-4 text-blue-600 font-bold text-sm underline">คลิกเพื่อเพิ่มรายการแรก</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: LIST --- */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-grow">
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อผู้ขอ, กิจกรรม, หรือเลขที่เกียรติบัตร..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-blue outline-none transition-all shadow-inner bg-gray-50/50"
                            />
                            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        {selectedIds.size > 0 && (
                            <button onClick={handleDeleteSelected} className="bg-red-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-200 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                ลบ {selectedIds.size} รายการ
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-navy text-white font-bold">
                                <tr>
                                    <th className="p-4 text-center w-10"><input type="checkbox" className="rounded bg-transparent border-white/30" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRequests.map(r => r.id)) : new Set())} /></th>
                                    <th className="p-4 whitespace-nowrap">วันที่ขอ</th>
                                    <th className="p-4">ผู้ขอ/กิจกรรม</th>
                                    <th className="p-4 text-center">คน/ปี/ลำดับ</th>
                                    <th className="p-4 text-center">เลขที่เกียรติบัตร</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-blue-50/30 transition-all">
                                        <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.has(req.id)} onChange={() => handleSelect(req.id)} className="rounded border-gray-300" /></td>
                                        <td className="p-4 whitespace-nowrap font-medium text-gray-500">
                                            {/* Fix Date Formatting to Thai */}
                                            {formatThaiDate(req.date)}
                                        </td>
                                        <td className="p-4 min-w-[200px]">
                                            <div className="font-black text-navy text-base leading-tight">{req.requesterName}</div>
                                            <div className="text-xs text-blue-600 font-bold mt-1 leading-snug">{req.activityName}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {/* Fix Layout for Count/Year/Seq */}
                                            <div className="flex flex-col items-center gap-1.5 py-1">
                                                <div className="w-10 h-10 flex flex-col items-center justify-center bg-gray-100 rounded-full border border-gray-200">
                                                    <span className="text-xs font-black text-gray-700 leading-none">{req.peopleCount}</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">คน</span>
                                                </div>
                                                <div className="text-[11px] font-black text-gray-500 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm">
                                                    ปี {req.academicYear} | ลำดับ {req.activityNo}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="bg-blue-50 border border-blue-100 text-primary-blue font-mono font-black py-2 px-4 rounded-xl text-xs inline-block shadow-sm">
                                                {toThaiNumerals(req.generatedNumber)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleOpenModal(req)} className="bg-amber-100 text-amber-800 text-xs font-black px-4 py-2 rounded-xl hover:bg-amber-200 transition-colors shadow-sm">แก้ไข</button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-gray-400 font-bold">
                                            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                                            ไม่พบรายการที่ต้องการค้นหา
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black">{formData.id ? 'แก้ไขข้อมูล' : 'ขอเลขเกียรติบัตรใหม่'}</h3>
                                <p className="text-xs opacity-70 uppercase tracking-widest font-bold">Certificate Registration</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-2 transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ผู้ขอเลขเกียรติบัตร</label>
                                    <input type="text" required value={formData.requesterName} onChange={e => setFormData({...formData, requesterName: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-blue shadow-sm font-bold text-navy outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่ขอ</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={buddhistToISO(formData.date)} 
                                        onChange={e => setFormData({...formData, date: isoToBuddhist(e.target.value)})} 
                                        className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-blue shadow-sm font-bold outline-none transition-all" 
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อกิจกรรม/โครงการ</label>
                                    <input type="text" required value={formData.activityName} onChange={e => setFormData({...formData, activityName: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-blue shadow-sm font-black text-navy outline-none transition-all" placeholder="ระบุชื่อกิจกรรมให้ชัดเจน" />
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ปีการศึกษา</label>
                                    <input type="text" required value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl font-black text-navy outline-none" placeholder="เช่น 2568" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">กิจกรรมลำดับที่</label>
                                    <input type="number" required value={formData.activityNo} onChange={e => setFormData({...formData, activityNo: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl font-black text-navy outline-none" placeholder="0" />
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนคน (เป้าหมาย)</label>
                                    <input type="number" required min="1" value={formData.peopleCount} onChange={e => setFormData({...formData, peopleCount: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl font-black text-navy outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">อักษรย่อส่วนราชการ</label>
                                    <input type="text" required value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl font-black text-navy outline-none uppercase" />
                                </div>

                                <div className="md:col-span-2 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border-2 border-dashed border-blue-200 text-center space-y-2 shadow-inner">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">รูปแบบเลขที่เกียรติบัตรที่จะได้รับ</label>
                                    <div className="text-2xl font-black text-primary-blue tracking-tight">
                                        {generateCertNumber(formData.prefix || 'กส.ปญ', Number(formData.peopleCount) || 1, formData.activityNo || '?', formData.academicYear || '?')}
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุ (ถ้ามี)</label>
                                    <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl outline-none" rows={2} placeholder="ระบุเพิ่มเติม..." />
                                </div>
                            </div>
                        </form>

                        <div className="p-6 bg-white border-t flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-gray-100 text-gray-400 rounded-2xl font-black transition-all hover:bg-gray-200 active:scale-95">ยกเลิก</button>
                            <button type="submit" onClick={handleSubmit} disabled={isSaving} className="px-12 py-3 bg-navy text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-900 active:scale-95 disabled:opacity-50">
                                {isSaving ? 'กำลังบันทึก...' : 'ยืนยันบันทึกข้อมูล'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CertificatePage;
