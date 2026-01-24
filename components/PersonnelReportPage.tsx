import React, { useState, useMemo, useEffect } from 'react';
import { PerformanceReport, Personnel, Settings } from '../types';
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, getDriveViewUrl, safeParseArray } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import StatsCard from './StatsCard';

interface PerformanceReportModalProps {
    onSave: (report: PerformanceReport) => Promise<boolean | void>;
    onClose: () => void;
    isSaving: boolean;
    currentUser: Personnel;
    academicYears: string[];
    academicStandings: string[];
    reportToEdit: PerformanceReport | null;
    mode: 'pa' | 'salary_promotion';
}

const PerformanceReportModal: React.FC<PerformanceReportModalProps> = ({
    onSave, onClose, isSaving, currentUser, academicYears, academicStandings, reportToEdit, mode
}) => {
    const [formData, setFormData] = useState<Partial<PerformanceReport>>({});
    
    useEffect(() => {
        if (reportToEdit) {
            setFormData(reportToEdit);
        } else {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setFormData({
                academicYear: (new Date().getFullYear() + 543).toString(),
                round: '1',
                personnelId: currentUser.id,
                name: `${title} ${currentUser.personnelName}`,
                position: currentUser.position,
                academicStanding: currentUser.academicStanding || '',
                major: currentUser.educationBackgrounds?.[0]?.major || '',
                file: [],
                status: 'pending',
                submissionDate: getCurrentThaiDate(),
                reportType: mode,
            });
        }
    }, [reportToEdit, currentUser, academicYears, mode]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, file: [e.target.files![0]] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newReport: PerformanceReport = {
            ...formData,
            id: formData.id || Date.now(),
            submissionDate: formData.submissionDate || getCurrentThaiDate(),
            reportType: mode,
        } as PerformanceReport;
        
        await onSave(newReport);
    };

    const modalTitle = mode === 'pa' 
        ? 'รายงานการปฏิบัติงาน (PA)' 
        : 'รายงานผลการปฏิบัติงาน (เพื่อเลื่อนเงินเดือน)';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b bg-primary-blue text-white rounded-t-2xl">
                    <h2 className="text-xl font-bold">{formData.id ? 'แก้ไขรายงาน' : `เพิ่ม${modalTitle}`}</h2>
                </div>
                <form id="performance-report-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto bg-gray-50/50">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p><span className="font-bold">วันที่ส่ง:</span> {formData.submissionDate}</p>
                        <p><span className="font-bold">ชื่อผู้รายงาน:</span> {formData.name}</p>
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
                                <option value="1">รอบที่ 1 (1 ต.ค. - 31 มี.ค.)</option>
                                <option value="2">รอบที่ 2 (1 เม.ย. - 30 ก.ย.)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วิทยฐานะ</label>
                        <select value={formData.academicStanding || ''} onChange={e => setFormData({...formData, academicStanding: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                             <option value="">-- ไม่ระบุ --</option>
                            {(academicStandings || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วิชาเอก</label>
                        <input type="text" value={formData.major || ''} onChange={e => setFormData({...formData, major: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์รายงาน (PDF, Word)</label>
                        <input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                         {safeParseArray(formData.file).length > 0 && <p className="mt-2 text-xs text-green-600 font-bold">✓ เลือกไฟล์เรียบร้อย: { (formData.file![0] as File).name || 'ไฟล์เดิม'}</p>}
                    </div>
                </form>
                <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 text-gray-700">ยกเลิก</button>
                    <button type="submit" form="performance-report-form" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow disabled:opacity-50 hover:bg-primary-hover">
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};


interface PersonnelReportPageProps {
    mode: 'pa' | 'salary_promotion';
    currentUser: Personnel;
    personnel: Personnel[];
    reports: PerformanceReport[];
    onSave: (report: PerformanceReport) => Promise<boolean | void>;
    onDelete: (ids: number[]) => void;
    academicYears: string[];
    isSaving: boolean;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
}

const PersonnelReportPage: React.FC<PersonnelReportPageProps> = ({
    mode, currentUser, personnel, reports, onSave, onDelete, academicYears, isSaving, settings, onSaveSettings
}) => {
    
    const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<PerformanceReport | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterPosition, setFilterPosition] = useState('');
    const [filterRound, setFilterRound] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const isAdminOrPro = currentUser.role === 'admin' || currentUser.role === 'pro';

    const pageConfig = {
        pa: {
            title: "ระบบรายงานการปฏิบัติงาน (PA)",
            reportType: 'pa'
        },
        salary_promotion: {
            title: "ระบบรายงานผลการปฏิบัติงาน (เพื่อเลื่อนเงินเดือน)",
            reportType: 'salary_promotion'
        }
    };
    
    const currentConfig = pageConfig[mode];

    const relevantReports = useMemo(() => {
        return reports.filter(r => {
            if (mode === 'pa') return r.reportType === 'pa' || !r.reportType;
            return r.reportType === mode;
        });
    }, [reports, mode]);

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

        if (mode === 'salary_promotion') {
            const isOpen = settings.isSalaryReportOpen && checkDateRange(settings.salaryReportStartDate, settings.salaryReportEndDate);
            return { isOpen: isOpen, round1: { isOpen, start: settings.salaryReportStartDate, end: settings.salaryReportEndDate }, round2: { isOpen: false } };
        }
        
        const round1Open = settings.isPaRound1Open && checkDateRange(settings.paRound1StartDate, settings.paRound1EndDate);
        const round2Open = settings.isPaRound2Open && checkDateRange(settings.paRound2StartDate, settings.paRound2EndDate);
        
        return { 
            isOpen: round1Open || round2Open,
            round1: { isOpen: settings.isPaRound1Open, start: settings.paRound1StartDate, end: settings.paRound1EndDate },
            round2: { isOpen: settings.isPaRound2Open, start: settings.paRound2StartDate, end: settings.paRound2EndDate },
        };

    }, [settings, mode]);

    const stats = useMemo(() => {
        const total = relevantReports.length;
        const statusCounts: { [key in 'pending' | 'approved' | 'needs_edit']: number } = { pending: 0, approved: 0, needs_edit: 0 };
        const academicStandingCounts: Record<string, number> = {};
        
        relevantReports.forEach(r => {
            if (r.status in statusCounts) {
                statusCounts[r.status]++;
            }
            const standing = r.academicStanding || 'ไม่ระบุ';
            academicStandingCounts[standing] = (academicStandingCounts[standing] || 0) + 1;
        });

        const statusData = [
            { name: 'รอตรวจ', value: statusCounts.pending, color: '#F59E0B' },
            { name: 'ผ่าน', value: statusCounts.approved, color: '#10B981' },
            { name: 'ไม่ผ่าน', value: statusCounts.needs_edit, color: '#EF4444' },
        ].filter(d => d.value > 0);

        const standingData = Object.entries(academicStandingCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value);
        
        return { total, ...statusCounts, statusData, standingData };
    }, [relevantReports]);

    const filteredReports = useMemo(() => {
        return relevantReports.filter(r => {
            const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = !filterYear || r.academicYear === filterYear;
            const matchesPosition = !filterPosition || r.position === filterPosition;
            const matchesRound = !filterRound || r.round === filterRound;
            return matchesSearch && matchesYear && matchesPosition && matchesRound;
        }).sort((a, b) => b.id - a.id);
    }, [relevantReports, searchTerm, filterYear, filterPosition, filterRound]);
    
    const handleOpenModal = (report?: PerformanceReport) => {
        if (!submissionStatus.isOpen) {
            alert('อยู่นอกช่วงเวลาที่กำหนดให้ส่งรายงาน');
            return;
        }
        setEditingReport(report || null);
        setIsModalOpen(true);
    };
    
    const handleSaveReport = async (report: PerformanceReport) => {
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

    const handleStatusUpdate = (reportId: number, newStatus: PerformanceReport['status']) => {
        const reportToUpdate = reports.find(r => r.id === reportId);
        if (reportToUpdate) {
            const statusLabels: Record<PerformanceReport['status'], string> = { 'pending': 'รอตรวจ', 'approved': 'ผ่าน', 'needs_edit': 'ไม่ผ่าน' };
            if (window.confirm(`ต้องการเปลี่ยนสถานะของ ${reportToUpdate.name} เป็น "${statusLabels[newStatus]}" หรือไม่?`)) {
                onSave({ ...reportToUpdate, status: newStatus });
            }
        }
    };

    const handleExportExcel = () => {
        if (filteredReports.length === 0) {
            alert('ไม่มีข้อมูลให้ส่งออก');
            return;
        }
        const headers = ['ลำดับ', 'ชื่อ-สกุล', 'ตำแหน่ง', 'วิทยฐานะ', 'วิชาเอก', 'ปีการศึกษา', 'รอบ'];
        const rows = filteredReports.map((r, index) => [
            index + 1,
            r.name,
            r.position,
            r.academicStanding || '-',
            r.major || '-',
            r.academicYear,
            r.round
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";
        rows.forEach(row => {
            csvContent += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",") + "\r\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `รายงาน-${currentConfig.reportType}-${getCurrentThaiDate().replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200">ผ่าน</span>;
            case 'needs_edit': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200">ไม่ผ่าน</span>;
            default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold border border-yellow-200">รอตรวจ</span>;
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-navy">{currentConfig.title}</h2>
            
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>ภาพรวมสถิติ</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>ทะเบียนรายการส่ง</button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard title="รายงานทั้งหมด" value={stats.total.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} color="bg-blue-500" />
                        <StatsCard title="รอตรวจสอบ" value={stats.pending.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-yellow-500" />
                        <StatsCard title="ผ่านการประเมิน" value={stats.approved.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-green-500" />
                        <StatsCard title="ต้องแก้ไข/ไม่ผ่าน" value={stats.needs_edit.toString()} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} color="bg-red-500" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-96">
                            <h3 className="font-bold text-navy mb-4">สถานะรายงาน</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                        {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-96">
                            <h3 className="font-bold text-navy mb-4">จำนวนตามวิทยฐานะ</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.standingData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize: 12}} /><YAxis /><Tooltip /><Bar dataKey="value" name="จำนวน" fill="#8884d8" /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'list' && (
                <div className="animate-fade-in space-y-4">
                    <div className={`p-4 rounded-lg text-sm ${submissionStatus.isOpen ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <p className="font-bold">{submissionStatus.isOpen ? '🟢 ระบบเปิดรับรายงาน' : '🔴 ระบบปิดรับรายงาน'}</p>
                        <ul className="list-disc list-inside mt-1 text-xs">
                            {mode === 'pa' ? (
                                <>
                                    <li>รอบที่ 1: {submissionStatus.round1.isOpen ? 'เปิด' : 'ปิด'} {submissionStatus.round1.start && submissionStatus.round1.end ? `(${formatThaiDate(submissionStatus.round1.start)} - ${formatThaiDate(submissionStatus.round1.end)})` : ''}</li>
                                    <li>รอบที่ 2: {submissionStatus.round2.isOpen ? 'เปิด' : 'ปิด'} {submissionStatus.round2.start && submissionStatus.round2.end ? `(${formatThaiDate(submissionStatus.round2.start)} - ${formatThaiDate(submissionStatus.round2.end)})` : ''}</li>
                                </>
                            ) : (
                                <li>ช่วงเวลา: {submissionStatus.round1.start && submissionStatus.round1.end ? `${formatThaiDate(submissionStatus.round1.start)} ถึง ${formatThaiDate(submissionStatus.round1.end)}` : 'ไม่ได้กำหนด'}</li>
                            )}
                            {!submissionStatus.isOpen && <li>กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดระบบ</li>}
                        </ul>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <input type="text" placeholder="ค้นหาชื่อ, หัวข้อ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-grow"/>
                            <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="">ทุกตำแหน่ง</option>
                                {(settings.positions || []).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="">ทุกปีการศึกษา</option>
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={filterRound} onChange={e => setFilterRound(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="">ทุกรอบ</option>
                                <option value="1">รอบที่ 1</option>
                                <option value="2">รอบที่ 2</option>
                            </select>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm">
                                Excel
                            </button>
                            <button onClick={() => handleOpenModal()} disabled={!submissionStatus.isOpen} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm flex-grow disabled:bg-gray-400 disabled:cursor-not-allowed">
                                เพิ่มรายงาน
                            </button>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                        {selectedIds.size > 0 && isAdminOrPro && <div className="mb-4 flex justify-end"><button onClick={handleDelete} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">ลบ {selectedIds.size} รายการ</button></div>}
                        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 w-8"><input type="checkbox" className="rounded" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredReports.map(r=>r.id)) : new Set())}/></th><th className="p-3">ปี/รอบ</th><th className="p-3">วันที่ส่ง</th><th className="p-3">ชื่อ-สกุล</th><th className="p-3">ตำแหน่ง/วิทยฐานะ</th><th className="p-3">ไฟล์</th><th className="p-3 text-center">สถานะ</th><th className="p-3 text-center">จัดการ</th></tr></thead><tbody className="divide-y">{filteredReports.map(r => (<tr key={r.id} className="hover:bg-gray-50"><td className="p-3"><input type="checkbox" className="rounded" checked={selectedIds.has(r.id)} onChange={() => {const next = new Set(selectedIds); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); setSelectedIds(next);}} /></td><td className="p-3 whitespace-nowrap"><div>{r.academicYear}</div><div className="text-xs text-gray-500">รอบที่ {r.round}</div></td><td className="p-3 whitespace-nowrap">{formatThaiDate(r.submissionDate)}</td><td className="p-3 font-medium text-navy whitespace-nowrap">{r.name}</td><td className="p-3"><div className="whitespace-nowrap">{r.position}</div><div className="text-xs text-blue-600 whitespace-nowrap">{r.academicStanding || '-'}</div></td><td className="p-3"><a href={getDriveViewUrl(safeParseArray(r.file)[0])} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">ดูไฟล์</a></td>
                        <td className="p-3 text-center">
                            {isAdminOrPro ? (
                                <select 
                                    value={r.status} 
                                    onChange={(e) => handleStatusUpdate(r.id, e.target.value as PerformanceReport['status'])}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`text-xs font-bold border-2 rounded-full px-2 py-1 outline-none appearance-none focus:ring-2 focus:ring-offset-1
                                        ${r.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200 focus:ring-green-400' :
                                          r.status === 'needs_edit' ? 'bg-red-100 text-red-700 border-red-200 focus:ring-red-400' :
                                          'bg-yellow-100 text-yellow-700 border-yellow-200 focus:ring-yellow-400'}`}
                                >
                                    <option value="pending">รอตรวจ</option>
                                    <option value="approved">ผ่าน</option>
                                    <option value="needs_edit">ไม่ผ่าน</option>
                                </select>
                            ) : (
                                getStatusBadge(r.status)
                            )}
                        </td>
                        <td className="p-3 text-center"><button onClick={() => handleOpenModal(r)} className="text-blue-600 hover:underline text-xs font-bold">ดู/แก้ไข</button></td></tr>))}</tbody></table></div>
                    </div>
                </div>
            )}
            
            {isModalOpen && (
                <PerformanceReportModal 
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveReport}
                    isSaving={isSaving}
                    currentUser={currentUser}
                    academicYears={academicYears}
                    academicStandings={settings.academicStandings || []}
                    reportToEdit={editingReport}
                    mode={mode}
                />
            )}
        </div>
    );
};

export default PersonnelReportPage;