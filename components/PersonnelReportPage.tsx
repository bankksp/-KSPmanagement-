
import React, { useState, useMemo, useEffect } from 'react';
import { PerformanceReport, Personnel, Settings } from '../types';
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, getDriveViewUrl, safeParseArray } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- MODAL COMPONENT (Re-used) ---
interface PerformanceReportModalProps {
    onSave: (report: PerformanceReport) => void;
    onClose: () => void;
    isSaving: boolean;
    currentUser: Personnel;
    academicYears: string[];
    academicStandings: string[];
    reportToEdit: PerformanceReport | null;
}

const PerformanceReportModal: React.FC<PerformanceReportModalProps> = ({
    onSave, onClose, isSaving, currentUser, academicYears, academicStandings, reportToEdit
}) => {
    const [formData, setFormData] = useState<Partial<PerformanceReport>>({});
    
    useEffect(() => {
        if (reportToEdit) {
            setFormData(reportToEdit);
        } else {
            setFormData({
                academicYear: (new Date().getFullYear() + 543).toString(),
                round: '1',
                personnelId: currentUser.id,
                name: currentUser.personnelName,
                position: currentUser.position,
                academicStanding: currentUser.academicStanding || '',
                major: currentUser.educationBackgrounds?.[0]?.major || '',
                agreementTitle: '',
                file: [],
                status: 'pending',
                submissionDate: getCurrentThaiDate(),
            });
        }
    }, [reportToEdit, currentUser, academicYears]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, file: [e.target.files![0]] }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newReport: PerformanceReport = {
            ...formData,
            id: formData.id || Date.now(),
            submissionDate: formData.submissionDate || getCurrentThaiDate(),
        } as PerformanceReport;
        onSave(newReport);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-navy">{formData.id ? 'แก้ไขรายงาน' : 'เพิ่มรายงานการปฏิบัติงาน (PA)'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา</label>
                            <select value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-gray-50">
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รอบการประเมิน</label>
                            <select value={formData.round} onChange={e => setFormData({...formData, round: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-gray-50">
                                <option value="1">รอบที่ 1 (1 ต.ค. - 31 มี.ค.)</option>
                                <option value="2">รอบที่ 2 (1 เม.ย. - 30 ก.ย.)</option>
                            </select>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p><span className="font-bold">วันที่ส่ง:</span> {formData.submissionDate}</p>
                        <p><span className="font-bold">ชื่อผู้รายงาน:</span> {formData.name}</p>
                        <p><span className="font-bold">ตำแหน่ง:</span> {formData.position}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วิทยฐานะ</label>
                        <select value={formData.academicStanding || ''} onChange={e => setFormData({...formData, academicStanding: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-gray-100">
                             <option value="">-- ไม่ระบุ --</option>
                            {(academicStandings || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วิชาเอก</label>
                        <input type="text" value={formData.major || ''} onChange={e => setFormData({...formData, major: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-gray-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเรื่องข้อตกลงในการพัฒนางาน</label>
                        <input type="text" value={formData.agreementTitle || ''} onChange={e => setFormData({...formData, agreementTitle: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์รายงาน (PDF, Word)</label>
                        <input type="file" onChange={handleFileChange} className="w-full text-sm" />
                         {safeParseArray(formData.file).length > 0 && <p className="mt-2 text-xs text-green-600 font-bold">✓ เลือกไฟล์เรียบร้อย: { (formData.file![0] as File).name || 'ไฟล์เดิม'}</p>}
                    </div>
                </form>
                <div className="p-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow disabled:opacity-50">
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT (Redesigned) ---
const PersonnelReportPage: React.FC<{
    currentUser: Personnel;
    personnel: Personnel[];
    reports: PerformanceReport[];
    onSave: (report: PerformanceReport) => void;
    onDelete: (ids: number[]) => void;
    academicYears: string[];
    isSaving: boolean;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
}> = ({ currentUser, personnel, reports, onSave, onDelete, academicYears, isSaving, settings, onSaveSettings }) => {
    
    const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<PerformanceReport | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterPosition, setFilterPosition] = useState('');
    const [filterRound, setFilterRound] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const isAdminOrPro = currentUser.role === 'admin' || currentUser.role === 'pro';

    const submissionStatus = useMemo(() => {
        const now = new Date();
        const { isPaRound1Open, paRound1StartDate, paRound1EndDate, isPaRound2Open, paRound2StartDate, paRound2EndDate } = settings;
        
        const checkDateRange = (startStr?: string, endStr?: string) => {
            if (!startStr || !endStr) return true; // If no dates set, assume open
            try {
                const start = new Date(buddhistToISO(startStr));
                const end = new Date(buddhistToISO(endStr));
                end.setHours(23, 59, 59, 999); // Include the whole end day
                return now >= start && now <= end;
            } catch (e) {
                return true; // Failsafe if date is invalid
            }
        };

        let round1Open = isPaRound1Open && checkDateRange(paRound1StartDate, paRound1EndDate);
        let round2Open = isPaRound2Open && checkDateRange(paRound2StartDate, paRound2EndDate);
        
        return { 
            isOpen: round1Open || round2Open || isAdminOrPro,
            round1: { isOpen: isPaRound1Open, start: paRound1StartDate, end: paRound1EndDate },
            round2: { isOpen: isPaRound2Open, start: paRound2StartDate, end: paRound2EndDate },
        };

    }, [settings, isAdminOrPro]);

    const stats = useMemo(() => {
        const total = reports.length;
        const statusCounts: { [key in 'pending' | 'approved' | 'needs_edit']: number } = { pending: 0, approved: 0, needs_edit: 0 };
        const academicStandingCounts: Record<string, number> = {};
        
        reports.forEach(r => {
            if (r.status in statusCounts) {
                statusCounts[r.status]++;
            }
            const standing = r.academicStanding || 'ไม่ระบุ';
            academicStandingCounts[standing] = (academicStandingCounts[standing] || 0) + 1;
        });

        const statusData = [
            { name: 'รอตรวจสอบ', value: statusCounts.pending, color: '#F59E0B' },
            { name: 'อนุมัติแล้ว', value: statusCounts.approved, color: '#10B981' },
            { name: 'ต้องแก้ไข', value: statusCounts.needs_edit, color: '#EF4444' },
        ].filter(d => d.value > 0);

        const standingData = Object.entries(academicStandingCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value);
        
        return { total, ...statusCounts, statusData, standingData };
    }, [reports]);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesSearch = 
                (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.agreementTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = !filterYear || r.academicYear === filterYear;
            const matchesPosition = !filterPosition || r.position === filterPosition;
            const matchesRound = !filterRound || r.round === filterRound;
            return matchesSearch && matchesYear && matchesPosition && matchesRound;
        }).sort((a, b) => b.id - a.id);
    }, [reports, searchTerm, filterYear, filterPosition, filterRound]);
    
    const handleOpenModal = (report?: PerformanceReport) => {
        if (!submissionStatus.isOpen) {
            alert('อยู่นอกช่วงเวลาที่กำหนดให้ส่งรายงาน PA');
            return;
        }
        setEditingReport(report || null);
        setIsModalOpen(true);
    };
    
    const handleSaveReport = (report: PerformanceReport) => {
        onSave(report);
        setIsModalOpen(false);
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
            const statusLabels: Record<PerformanceReport['status'], string> = { 'pending': 'รอตรวจสอบ', 'approved': 'อนุมัติ', 'needs_edit': 'ปรับปรุง' };
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
        const headers = ['ลำดับ', 'ชื่อ-สกุล', 'ตำแหน่ง', 'วิทยฐานะ', 'วิชาเอก', 'ปีการศึกษา', 'รอบ', 'ชื่อเรื่องข้อตกลงในการพัฒนางาน'];
        const rows = filteredReports.map((r, index) => [
            index + 1,
            r.name,
            r.position,
            r.academicStanding || '-',
            r.major || '-',
            r.academicYear,
            r.round,
            r.agreementTitle || '-'
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";
        rows.forEach(row => {
            csvContent += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",") + "\r\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `รายงาน-PA-${getCurrentThaiDate().replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            <h2 className="text-2xl font-bold text-navy">ระบบรายงานการปฏิบัติงาน (Performance Agreement - PA)</h2>
            
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>ภาพรวมสถิติ</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>ทะเบียนรายการส่ง</button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><p className="text-sm text-gray-500">ทั้งหมด</p><p className="text-3xl font-bold text-navy">{stats.total}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-yellow-100"><p className="text-sm text-yellow-600">รอตรวจสอบ</p><p className="text-3xl font-bold text-yellow-700">{stats.pending}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-green-100"><p className="text-sm text-green-600">อนุมัติแล้ว</p><p className="text-3xl font-bold text-green-700">{stats.approved}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-red-100"><p className="text-sm text-red-600">ต้องแก้ไข</p><p className="text-3xl font-bold text-red-700">{stats.needs_edit}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow h-80"><h3 className="font-bold mb-2">สถานะรายงาน</h3><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>{stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                        <div className="bg-white p-6 rounded-xl shadow h-80"><h3 className="font-bold mb-2">จำนวนตามวิทยฐานะ</h3><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.standingData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize: 12}} /><YAxis /><Tooltip /><Bar dataKey="value" name="จำนวน" fill="#8884d8" /></BarChart></ResponsiveContainer></div>
                    </div>
                </div>
            )}
            
            {activeTab === 'list' && (
                <div className="animate-fade-in space-y-4">
                    <div className={`p-4 rounded-lg mb-4 text-sm ${submissionStatus.isOpen ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <p className="font-bold">{submissionStatus.isOpen ? '🟢 ระบบเปิดรับรายงาน PA' : '🔴 ระบบปิดรับรายงาน PA'}</p>
                        <ul className="list-disc list-inside mt-1 text-xs">
                            {submissionStatus.round1.isOpen && <li>รอบที่ 1: เปิดรับ {submissionStatus.round1.start && submissionStatus.round1.end ? `ตั้งแต่ ${formatThaiDate(submissionStatus.round1.start)} ถึง ${formatThaiDate(submissionStatus.round1.end)}` : ''}</li>}
                            {submissionStatus.round2.isOpen && <li>รอบที่ 2: เปิดรับ {submissionStatus.round2.start && submissionStatus.round2.end ? `ตั้งแต่ ${formatThaiDate(submissionStatus.round2.start)} ถึง ${formatThaiDate(submissionStatus.round2.end)}` : ''}</li>}
                            {!submissionStatus.isOpen && !isAdminOrPro && <li>กรุณารอช่วงเวลาที่กำหนด หรือติดต่อผู้ดูแลระบบ</li>}
                            {isAdminOrPro && <li className="text-purple-700">ผู้ดูแลระบบสามารถส่งรายงานได้ตลอดเวลา</li>}
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
                        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 w-8"><input type="checkbox" className="rounded" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredReports.map(r=>r.id)) : new Set())}/></th><th className="p-3">ปี/รอบ</th><th className="p-3">วันที่ส่ง</th><th className="p-3">ชื่อ-สกุล</th><th className="p-3">ตำแหน่ง/วิทยฐานะ</th><th className="p-3">หัวข้อข้อตกลง</th><th className="p-3">ไฟล์</th><th className="p-3 text-center">สถานะ</th><th className="p-3 text-center">จัดการ</th></tr></thead><tbody className="divide-y">{filteredReports.map(r => (<tr key={r.id} className="hover:bg-gray-50"><td className="p-3"><input type="checkbox" className="rounded" checked={selectedIds.has(r.id)} onChange={() => {const next = new Set(selectedIds); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); setSelectedIds(next);}} /></td><td className="p-3 whitespace-nowrap"><div>{r.academicYear}</div><div className="text-xs text-gray-500">รอบที่ {r.round}</div></td><td className="p-3 whitespace-nowrap">{formatThaiDate(r.submissionDate)}</td><td className="p-3 font-medium text-navy">{r.name}</td><td className="p-3"><div>{r.position}</div><div className="text-xs text-blue-600">{r.academicStanding || '-'}</div></td><td className="p-3 text-gray-600 max-w-xs truncate">{r.agreementTitle || '-'}</td><td className="p-3"><a href={getDriveViewUrl(safeParseArray(r.file)[0])} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">ดูไฟล์</a></td>
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
                                    <option value="pending">รอตรวจสอบ</option>
                                    <option value="approved">อนุมัติแล้ว</option>
                                    <option value="needs_edit">ปรับปรุง</option>
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
                />
            )}
        </div>
    );
};

export default PersonnelReportPage;