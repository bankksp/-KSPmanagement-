import React, { useState, useMemo, useEffect } from 'react';
import { SARReport, Personnel, Settings } from '../types';
import { getCurrentThaiDate, formatThaiDate, getDriveViewUrl, safeParseArray, buddhistToISO, isoToBuddhist } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import StatsCard from './StatsCard'; // Import the new component

interface SARReportModalProps {
    onSave: (report: SARReport) => Promise<boolean | void>;
    onClose: () => void;
    isSaving: boolean;
    currentUser: Personnel;
    academicYears: string[];
    reportToEdit: SARReport | null;
}

const SARReportModal: React.FC<SARReportModalProps> = ({ onSave, onClose, isSaving, currentUser, academicYears, reportToEdit }) => {
    const [formData, setFormData] = useState<Partial<SARReport>>({});
    const [file, setFile] = useState<File[]>([]);

    useEffect(() => {
        if (reportToEdit) {
            setFormData(reportToEdit);
            setFile([]);
        } else {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setFormData({
                academicYear: (new Date().getFullYear() + 543).toString(),
                round: '1',
                note: '',
                file: [],
                status: 'pending',
                personnelId: currentUser.id,
                name: `${title}${currentUser.personnelName}`,
                position: currentUser.position,
                submissionDate: getCurrentThaiDate(),
            });
            setFile([]);
        }
    }, [reportToEdit, currentUser, academicYears]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile([e.target.files[0]]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const reportData: SARReport = {
            id: formData.id || Date.now(),
            personnelId: formData.personnelId!,
            name: formData.name!,
            position: formData.position!,
            academicYear: formData.academicYear!,
            round: formData.round!,
            status: formData.status!,
            submissionDate: formData.submissionDate || getCurrentThaiDate(),
            note: formData.note,
            file: file.length > 0 ? file : formData.file,
        };
        
        await onSave(reportData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b bg-primary-blue text-white rounded-t-2xl">
                    <h2 className="text-xl font-bold">{formData.id ? 'แก้ไขรายงาน SAR' : 'ส่งรายงาน SAR'}</h2>
                </div>
                <form id="sar-report-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto bg-gray-50/50">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p><span className="font-bold">ผู้รายงาน:</span> {formData.name}</p>
                        <p><span className="font-bold">ตำแหน่ง:</span> {formData.position}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา</label>
                            <select value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รอบการประเมิน</label>
                            <select value={formData.round} onChange={e => setFormData({...formData, round: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                                <option value="1">สิ้นสุดปีการศึกษา</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">แนบไฟล์รายงาน SAR (PDF เท่านั้น)</label>
                        <input type="file" onChange={handleFileChange} accept=".pdf" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                        {safeParseArray(formData.file).length > 0 && !file.length && <span className="text-xs text-gray-500 italic">มีไฟล์เดิมอยู่แล้ว</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุเพิ่มเติม</label>
                        <textarea value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="ระบุรายละเอียดเพิ่มเติม..." />
                    </div>
                </form>
                <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 text-gray-700">ยกเลิก</button>
                    <button type="submit" form="sar-report-form" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow disabled:opacity-50 hover:bg-primary-hover">
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface PersonnelSARPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    reports: SARReport[];
    onSave: (report: SARReport) => Promise<boolean | void>;
    onDelete: (ids: number[]) => void;
    academicYears: string[];
    positions: string[];
    isSaving: boolean;
    settings: Settings;
}

const PersonnelSARPage: React.FC<PersonnelSARPageProps> = ({ 
    currentUser, personnel, reports, onSave, onDelete, 
    academicYears, positions, isSaving, settings 
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<SARReport | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    const isAdminOrPro = currentUser.role === 'admin' || currentUser.role === 'pro';

    const submissionStatus = useMemo(() => {
        const now = new Date();
        const checkDateRange = (startStr?: string, endStr?: string) => {
            if (!startStr || !endStr) return true;
            try {
                const start = new Date(buddhistToISO(startStr));
                const end = new Date(buddhistToISO(endStr));
                end.setHours(23, 59, 59, 999);
                return now >= start && now <= end;
            } catch (e) { return true; }
        };
        const isOpen = settings.isSarOpen && checkDateRange(settings.sarStartDate, settings.sarEndDate);
        return { isOpen, start: settings.sarStartDate, end: settings.sarEndDate };
    }, [settings]);

    const dashboardStats = useMemo(() => {
        const totalReports = reports.length;
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
            .sort((a, b) => b.value - a.value);

        return { totalReports, approvedCount, pendingCount, needsEditCount, statusData, positionData };
    }, [reports]);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = !filterYear || r.academicYear === filterYear;
            return matchesSearch && matchesYear;
        }).sort((a, b) => b.id - a.id);
    }, [reports, searchTerm, filterYear]);
    
    const handleOpenModal = (report?: SARReport) => {
        if (!submissionStatus.isOpen) {
            alert('อยู่นอกช่วงเวลาที่กำหนดให้ส่งรายงาน SAR');
            return;
        }
        setEditingReport(report || null);
        setIsModalOpen(true);
    };

    const handleSave = async (report: SARReport) => {
        const success = await onSave(report);
        if (success) {
            setIsModalOpen(false);
            setEditingReport(null);
        }
    };

    const handleDelete = () => {
        if (selectedIds.size > 0 && window.confirm(`ยืนยันการลบ ${selectedIds.size} รายการ?`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };
    
    const handleStatusUpdate = (reportId: number, newStatus: SARReport['status']) => {
        const reportToUpdate = reports.find(r => r.id === reportId);
        if (reportToUpdate) {
            onSave({ ...reportToUpdate, status: newStatus });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200">อนุมัติแล้ว</span>;
            case 'needs_edit': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200">ปรับปรุง</span>;
            default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold border border-yellow-200">รอตรวจสอบ</span>;
        }
    };
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-navy">ระบบรายงานผลการประเมินตนเอง (SAR)</h2>
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>ภาพรวมสถิติ</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>ทะเบียนรายการส่ง</button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard title="รายงานทั้งหมด" value={dashboardStats.totalReports.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} color="bg-blue-500" />
                        <StatsCard title="รอตรวจสอบ" value={dashboardStats.pendingCount.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-yellow-500" />
                        <StatsCard title="อนุมัติแล้ว" value={dashboardStats.approvedCount.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-green-500" />
                        <StatsCard title="ต้องปรับปรุง" value={dashboardStats.needsEditCount.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} color="bg-red-500" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-96">
                            <h3 className="font-bold text-navy mb-4">สถานะรายงาน</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dashboardStats.statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                        {dashboardStats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-96">
                            <h3 className="font-bold text-navy mb-4">จำนวนตามตำแหน่ง</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dashboardStats.positionData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize: 10}} /><YAxis /><Tooltip /><Bar dataKey="value" name="จำนวน" fill="#8884d8" /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'list' && (
                <div className="animate-fade-in space-y-4">
                     <div className={`p-4 rounded-lg mb-4 text-sm ${submissionStatus.isOpen ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <p className="font-bold">{submissionStatus.isOpen ? '🟢 ระบบเปิดรับรายงาน SAR' : '🔴 ระบบปิดรับรายงาน SAR'}</p>
                        <ul className="list-disc list-inside mt-1 text-xs">
                           <li>ช่วงเวลา: {submissionStatus.start && submissionStatus.end ? `${formatThaiDate(submissionStatus.start)} ถึง ${formatThaiDate(submissionStatus.end)}` : 'ไม่ได้กำหนด'}</li>
                           {!submissionStatus.isOpen && <li>กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดระบบ</li>}
                        </ul>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <input type="text" placeholder="ค้นหาชื่อ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-grow"/>
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="">ทุกปีการศึกษา</option>
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button onClick={() => handleOpenModal()} disabled={!submissionStatus.isOpen} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm flex-grow sm:flex-grow-0 disabled:bg-gray-400">
                            เพิ่มรายงาน
                        </button>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                        {selectedIds.size > 0 && isAdminOrPro && <div className="mb-4 flex justify-end"><button onClick={handleDelete} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">ลบ {selectedIds.size} รายการ</button></div>}
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="p-3 w-8"><input type="checkbox" className="rounded" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredReports.map(r=>r.id)) : new Set())}/></th>
                                        <th className="p-3">ปีการศึกษา</th>
                                        <th className="p-3">วันที่ส่ง</th>
                                        <th className="p-3">ชื่อ-สกุล</th>
                                        <th className="p-3">ตำแหน่ง</th>
                                        <th className="p-3">ไฟล์</th>
                                        <th className="p-3 text-center">สถานะ</th>
                                        <th className="p-3 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredReports.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            <td className="p-3"><input type="checkbox" className="rounded" checked={selectedIds.has(r.id)} onChange={() => {const next = new Set(selectedIds); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); setSelectedIds(next);}} /></td>
                                            <td className="p-3">{r.academicYear}</td>
                                            <td className="p-3">{formatThaiDate(r.submissionDate)}</td>
                                            <td className="p-3 font-medium text-navy">{r.name}</td>
                                            <td className="p-3">{r.position}</td>
                                            <td className="p-3"><a href={getDriveViewUrl(safeParseArray(r.file)[0])} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">ดูไฟล์</a></td>
                                            <td className="p-3 text-center">
                                                {isAdminOrPro ? (
                                                    <select 
                                                        value={r.status} 
                                                        onChange={(e) => handleStatusUpdate(r.id, e.target.value as SARReport['status'])}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`text-xs font-bold border-2 rounded-full px-2 py-1 outline-none appearance-none focus:ring-2 focus:ring-offset-1
                                                            ${r.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                                              r.status === 'needs_edit' ? 'bg-red-100 text-red-700 border-red-200' :
                                                              'bg-yellow-100 text-yellow-700 border-yellow-200'}`}
                                                    >
                                                        <option value="pending">รอตรวจสอบ</option>
                                                        <option value="approved">อนุมัติแล้ว</option>
                                                        <option value="needs_edit">ปรับปรุง</option>
                                                    </select>
                                                ) : getStatusBadge(r.status)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleOpenModal(r)} className="text-blue-600 hover:underline text-xs font-bold">ดู/แก้ไข</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {isModalOpen && (
                <SARReportModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    isSaving={isSaving}
                    currentUser={currentUser}
                    academicYears={academicYears}
                    reportToEdit={editingReport}
                />
            )}
        </div>
    );
};

export default PersonnelSARPage;