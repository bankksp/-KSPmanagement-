
import React, { useState, useMemo, useEffect } from 'react';
import { CertificateRequest, Personnel } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate } from '../utils';

interface CertificatePageProps {
    currentUser: Personnel;
    requests: CertificateRequest[];
    onSave: (request: CertificateRequest) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
}

const CertificatePage: React.FC<CertificatePageProps> = ({ currentUser, requests, onSave, onDelete, isSaving }) => {
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
        const total = requests.length;
        const currentYear = (new Date().getFullYear() + 543).toString();
        const thisYearCount = requests.filter(r => r.academicYear === currentYear).length;

        // Group by Year
        const yearCounts: Record<string, number> = {};
        requests.forEach(r => {
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
        return requests.filter(req => 
            req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.generatedNumber.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => b.id - a.id);
    }, [requests, searchTerm]);

    const handleOpenModal = (req?: CertificateRequest) => {
        if (req) {
            setFormData(req);
        } else {
            // Reset form for new entry
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
        if (count > 1) {
            range = `1-${count}`;
        }
        
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

    return (
        <div className="space-y-6">
            {/* Page Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
                    <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                    ระบบขอเลขเกียรติบัตร
                </h2>
            </div>

            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติ (จำนวน/ปี)
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    จัดการระบบขอเลขเกียรติบัตร
                </button>
            </div>

            {/* --- TAB 1: STATS --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500">เกียรติบัตรทั้งหมด</p>
                                <h3 className="text-3xl font-bold text-navy">{stats.total} <span className="text-sm font-normal text-gray-400">รายการ</span></h3>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500">ปีการศึกษา {new Date().getFullYear() + 543}</p>
                                <h3 className="text-3xl font-bold text-green-600">{stats.thisYearCount} <span className="text-sm font-normal text-gray-400">รายการ</span></h3>
                            </div>
                            <div className="p-3 bg-green-50 rounded-full text-green-600">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <h3 className="text-xl font-bold text-navy mb-4">สถิติจำนวนเกียรติบัตรแยกตามปีการศึกษา</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{fill: '#6B7280'}} />
                                    <YAxis tick={{fill: '#6B7280'}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                                    <Bar dataKey="value" name="จำนวน (รายการ)" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={50}>
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#60A5FA'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: LIST (MANAGEMENT) --- */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-navy">รายการขอเลขเกียรติบัตร</h2>
                        <button 
                            onClick={() => handleOpenModal()}
                            className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            ขอเลขเกียรติบัตรใหม่
                        </button>
                    </div>

                    <div className="flex gap-4 mb-4 items-center bg-gray-50 p-4 rounded-lg">
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อ, กิจกรรม, เลขที่..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border rounded-lg px-4 py-2 flex-grow focus:ring-2 focus:ring-primary-blue"
                        />
                        {selectedIds.size > 0 && (
                            <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700">
                                ลบ {selectedIds.size} รายการ
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-navy text-white">
                                <tr>
                                    <th className="p-3 text-center w-10"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRequests.map(r => r.id)) : new Set())} /></th>
                                    <th className="p-3 whitespace-nowrap">วันที่</th>
                                    <th className="p-3 whitespace-nowrap">ชื่อ-สกุลผู้ขอ</th>
                                    <th className="p-3">ชื่อกิจกรรม</th>
                                    <th className="p-3 text-center whitespace-nowrap">จำนวนคน</th>
                                    <th className="p-3 text-center whitespace-nowrap">ปีการศึกษา</th>
                                    <th className="p-3 text-center whitespace-nowrap">กิจกรรมที่</th>
                                    <th className="p-3 text-center whitespace-nowrap">เลขที่เกียรติบัตร</th>
                                    <th className="p-3">หมายเหตุ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-blue-50">
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(req.id)} onChange={() => handleSelect(req.id)} /></td>
                                        <td className="p-3 whitespace-nowrap">{formatThaiDate(req.date)}</td>
                                        <td className="p-3 font-medium">{req.requesterName}</td>
                                        <td className="p-3">{req.activityName}</td>
                                        <td className="p-3 text-center">{req.peopleCount}</td>
                                        <td className="p-3 text-center">{req.academicYear}</td>
                                        <td className="p-3 text-center">{req.activityNo}</td>
                                        <td className="p-3 text-center font-mono font-bold text-primary-blue whitespace-nowrap">{req.generatedNumber}</td>
                                        <td className="p-3 text-gray-500 text-xs">{req.note || '-'}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleOpenModal(req)} className="text-amber-600 hover:bg-amber-100 p-1 rounded mr-1">แก้ไข</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{formData.id ? 'แก้ไขข้อมูล' : 'ขอเลขเกียรติบัตรใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อ-สกุลผู้ขอ</label>
                                    <input type="text" required value={formData.requesterName} onChange={e => setFormData({...formData, requesterName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={buddhistToISO(formData.date)} 
                                        onChange={e => setFormData({...formData, date: isoToBuddhist(e.target.value)})} 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อกิจกรรม</label>
                                    <input type="text" required value={formData.activityName} onChange={e => setFormData({...formData, activityName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ปีการศึกษา</label>
                                    <input type="text" required value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="เช่น 2568" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">กิจกรรมที่ (ลำดับ)</label>
                                    <input type="number" required value={formData.activityNo} onChange={e => setFormData({...formData, activityNo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="เช่น 4" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนคน</label>
                                    <input type="number" required min="1" value={formData.peopleCount} onChange={e => setFormData({...formData, peopleCount: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                                    <p className="text-xs text-gray-500 mt-1">ระบบจะคำนวณช่วงเลข 1 - [จำนวน]</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">อักษรย่อ</label>
                                    <input type="text" required value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>

                                <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <label className="block text-xs font-bold text-blue-800 mb-1">ตัวอย่างเลขที่จะได้</label>
                                    <div className="text-lg font-mono font-bold text-primary-blue text-center">
                                        {generateCertNumber(formData.prefix || 'กส.ปญ', Number(formData.peopleCount) || 1, formData.activityNo || '?', formData.academicYear || '?')}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">หมายเหตุ</label>
                                    <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2}></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 text-gray-700">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CertificatePage;
