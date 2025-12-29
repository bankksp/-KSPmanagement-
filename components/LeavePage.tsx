
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
    const [openExportId, setOpenExportId] = useState<number | null>(null);

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
        
        // Group by type for chart
        const typeCounts: Record<string, number> = {};
        source.filter(r => r.status === 'approved').forEach(r => {
            typeCounts[r.type] = (typeCounts[r.type] || 0) + r.daysCount;
        });
        const chartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

        return { total, approved, chartData };
    }, [records, myRecords, isAdmin, isApprover]);

    // --- Handlers ---
    const handleOpenModal = (record?: LeaveRecord) => {
        if (record) {
            setCurrentRecord({ ...record });
        } else {
            setCurrentRecord({
                personnelId: currentUser.id,
                personnelName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                position: currentUser.position,
                type: settings.leaveTypes?.[0] || 'ลาป่วย',
                startDate: getCurrentThaiDate(),
                endDate: getCurrentThaiDate(),
                session: 'full',
                daysCount: 1,
                reason: '',
                status: 'pending',
                submissionDate: getCurrentThaiDate(),
                files: []
            });
        }
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setCurrentRecord(prev => ({
                ...prev,
                files: [...(prev.files || []), ...newFiles]
            }));
        }
    };

    const handleRemoveFile = (index: number) => {
        setCurrentRecord(prev => ({
            ...prev,
            files: (prev.files || []).filter((_, i) => i !== index)
        }));
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

    const generateMemorandumHtml = (record: LeaveRecord) => {
        return `
            <html>
                <head>
                    <title>ใบลา - ${record.personnelName}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        @page { size: A4; margin: 2cm; }
                        body { font-family: 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.5; color: black; padding: 0; margin: 0; }
                        .header { text-align: center; position: relative; margin-bottom: 30px; margin-top: 10px; }
                        .memo-title { font-size: 24pt; font-weight: bold; border: 2px solid black; display: inline-block; padding: 5px 20px; }
                        .meta-section { margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px; }
                        .meta-row { display: flex; gap: 20px; margin-bottom: 5px; }
                        .label { font-weight: bold; }
                        .content-body { margin-top: 20px; text-indent: 2.5cm; text-align: justify; }
                        .signature-block { margin-top: 50px; float: right; text-align: center; width: 60%; }
                        .approver-section { margin-top: 150px; border-top: 1px dashed #666; padding-top: 20px; }
                        .checkbox-box { display: inline-block; width: 15px; height: 15px; border: 1px solid black; text-align: center; line-height: 15px; font-size: 12pt; vertical-align: middle; }
                        .no-print { display: none; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="memo-title">บันทึกข้อความ</div>
                    </div>
                    <div class="meta-section">
                        <div class="meta-row">
                            <span class="label">ส่วนราชการ</span> ${settings.schoolName}
                        </div>
                        <div class="meta-row">
                            <span class="label">ที่</span> ........................................................... 
                            <span class="label" style="margin-left:auto;">วันที่</span> ${toThaiNumerals(formatThaiDate(record.submissionDate))}
                        </div>
                        <div class="meta-row">
                            <span class="label">เรื่อง</span> ขอ${record.type}
                        </div>
                    </div>
                    <p><span class="label">เรียน</span> ผู้อำนวยการ${settings.schoolName}</p>
                    
                    <div class="content-body">
                        ข้าพเจ้า ${record.personnelName} ตำแหน่ง ${record.position} สังกัด${settings.schoolName} 
                        มีความประสงค์ขอ${record.type} เนื่องจาก ${record.reason || 'มีภารกิจจำเป็น'} 
                        ตั้งแต่วันที่ ${toThaiNumerals(formatThaiDate(record.startDate))} ถึงวันที่ ${toThaiNumerals(formatThaiDate(record.endDate))} 
                        มีกำหนด ${toThaiNumerals(record.daysCount)} วัน 
                        ในระหว่างลาสามารถติดต่อข้าพเจ้าได้ที่ ${record.contactAddress || '-'} โทรศัพท์ ${record.contactPhone || '-'}
                    </div>

                    <div class="content-body">
                        จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
                    </div>

                    <div class="signature-block">
                        <p>(ลงชื่อ)...........................................................</p>
                        <p>(${record.personnelName})</p>
                        <p>ตำแหน่ง ${record.position}</p>
                    </div>

                    <div style="clear: both;"></div>

                    <div class="approver-section">
                        <p><span class="label">ความเห็นของเจ้าหน้าที่</span></p>
                        <p>......................................................................................................................................................................</p>
                        <br/>
                        <p><span class="label">คำสั่ง / ผลการพิจารณา</span></p>
                        <p><span class="checkbox-box">${record.status === 'approved' ? '✓' : ''}</span> อนุมัติ &nbsp;&nbsp; <span class="checkbox-box">${record.status === 'rejected' ? '✓' : ''}</span> ไม่อนุมัติ</p>
                        <br/>
                        <div class="signature-block">
                            <p>(ลงชื่อ)...........................................................</p>
                            <p>(${record.approverName || '...........................................................'})</p>
                            <p>ตำแหน่ง ผู้อำนวยการ${settings.schoolName}</p>
                            <p>วันที่ ${record.approvedDate ? toThaiNumerals(formatThaiDate(record.approvedDate)) : '........./........./.............'}</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    const handleExport = (record: LeaveRecord, type: 'print' | 'doc') => {
        const html = generateMemorandumHtml(record);
        setOpenExportId(null);

        if (type === 'print') {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.write('<script>setTimeout(() => { window.print(); }, 500);</script>');
                win.document.close();
            }
        } else {
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ใบลา_${record.personnelName}_${record.id}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
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
                    <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm md:text-base">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        ยื่นใบลา
                    </button>
                </div>
            </div>

            {/* Menu Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                    สถิติการลา
                </button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                    รายการลา
                </button>
                {isApprover && (
                    <button onClick={() => setActiveTab('approval')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'approval' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                        พิจารณาอนุมัติ
                        {pendingApprovals.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingApprovals.length}</span>}
                    </button>
                )}
                {isAdmin && (
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                        ตั้งค่าประเภทลา
                    </button>
                )}
            </div>

            {/* --- STATS TAB --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border border-emerald-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนจำนวนวันลาแยกตามประเภท (ที่อนุมัติแล้ว)</h3>
                            <div className="h-64">
                                {stats.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                                <p className="text-gray-500 text-sm">การลายื่นเสนอทั้งหมด</p>
                                <p className="text-3xl font-bold text-navy">{stats.total} ครั้ง</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                                <p className="text-gray-500 text-sm">อนุมัติเรียบร้อย</p>
                                <p className="text-3xl font-bold text-green-600">{stats.approved} ครั้ง</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LIST TAB --- */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-grow flex gap-2">
                            <input type="text" placeholder="ค้นหาชื่อ..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full md:w-64 border rounded-lg px-3 py-2 text-sm" />
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                                <option value="">ทุกประเภท</option>
                                {settings.leaveTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                                <option value="">ทุกสถานะ</option>
                                <option value="pending">รออนุมัติ</option>
                                <option value="approved">อนุมัติแล้ว</option>
                                <option value="rejected">ไม่อนุมัติ</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-3">วันที่ยื่น</th>
                                    <th className="p-3">ชื่อ-นามสกุล</th>
                                    <th className="p-3">ประเภท</th>
                                    <th className="p-3">ช่วงวันที่</th>
                                    <th className="p-3 text-center">จำนวนวัน</th>
                                    <th className="p-3 text-center">สถานะ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRecords.map(r => {
                                    const canDelete = isAdmin || (r.personnelId === currentUser.id && r.status === 'pending');
                                    const canEdit = r.personnelId === currentUser.id && r.status === 'pending';

                                    return (
                                        <tr key={r.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 whitespace-nowrap">{formatThaiDate(r.submissionDate)}</td>
                                            <td className="p-3 font-medium">{r.personnelName}</td>
                                            <td className="p-3">{r.type}</td>
                                            <td className="p-3 text-xs">
                                                {formatThaiDate(r.startDate)} - {formatThaiDate(r.endDate)}
                                                <div className="text-[10px] text-gray-400">({r.session === 'full' ? 'เต็มวัน' : r.session === 'morning' ? 'ครึ่งวันเช้า' : r.session === 'afternoon' ? 'ครึ่งวันบ่าย' : 'เต็มวัน'})</div>
                                            </td>
                                            <td className="p-3 text-center font-bold text-blue-600">{r.daysCount}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {r.status === 'approved' ? 'อนุมัติ' : r.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="text-blue-500 hover:text-blue-700 font-bold px-2 py-1 bg-blue-50 rounded">ดู</button>
                                                    
                                                    {/* Split Action for Print/Word */}
                                                    <div className="relative inline-block text-left">
                                                        <button 
                                                            onClick={() => setOpenExportId(openExportId === r.id ? null : r.id)}
                                                            className="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded flex items-center gap-1"
                                                        >
                                                            ใบลา
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                        
                                                        {openExportId === r.id && (
                                                            <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                                                <button onClick={() => handleExport(r, 'print')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 flex items-center gap-2">
                                                                    <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                                    PDF / พิมพ์
                                                                </button>
                                                                <button onClick={() => handleExport(r, 'doc')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 flex items-center gap-2 border-t">
                                                                    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                    Word (.doc)
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {canEdit && <button onClick={() => handleOpenModal(r)} className="text-amber-500 hover:text-amber-700 font-bold px-2 py-1 bg-amber-50 rounded">แก้</button>}
                                                    {canDelete && <button onClick={() => onDelete([r.id])} className="text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded">ลบ</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {displayRecords.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- APPROVAL TAB --- */}
            {activeTab === 'approval' && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-xl font-bold text-orange-600 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        พิจารณาใบลาค้างจ่าย ({pendingApprovals.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingApprovals.map(r => (
                            <div key={r.id} className="bg-white p-5 rounded-xl shadow-md border-l-4 border-orange-400">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-navy">{r.personnelName}</h4>
                                        <p className="text-xs text-gray-500">{r.position}</p>
                                    </div>
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{r.type}</span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">วันที่ลา:</span>
                                        <span className="font-medium">{formatThaiDate(r.startDate)} ถึง {formatThaiDate(r.endDate)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">จำนวน:</span>
                                        <span className="font-bold text-blue-600">{r.daysCount} วัน</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-500 block">เหตุผล:</span>
                                        <p className="bg-gray-50 p-2 rounded mt-1 border border-gray-100">{r.reason}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApprove(r, 'approved')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700">อนุมัติ</button>
                                    <button onClick={() => {
                                        const c = prompt("ระบุเหตุผลที่ไม่อนุมัติ:");
                                        if (c !== null) handleApprove(r, 'rejected', c);
                                    }} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold border border-red-200">ไม่อนุมัติ</button>
                                </div>
                            </div>
                        ))}
                        {pendingApprovals.length === 0 && <div className="col-span-2 py-20 text-center bg-white rounded-xl border-2 border-dashed text-gray-400">ไม่มีใบลาค้างพิจารณา</div>}
                    </div>
                </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow animate-fade-in">
                    <h3 className="text-xl font-bold text-navy mb-6">ตั้งค่าประเภทการลา</h3>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input id="new-type" type="text" placeholder="ระบุประเภทลาใหม่..." className="flex-grow border rounded-lg px-4 py-2" />
                            <button onClick={() => {
                                const input = document.getElementById('new-type') as HTMLInputElement;
                                if (input.value && !settings.leaveTypes?.includes(input.value)) {
                                    onSaveSettings({ ...settings, leaveTypes: [...(settings.leaveTypes || []), input.value] });
                                    input.value = '';
                                }
                            }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">เพิ่ม</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {settings.leaveTypes?.map(t => (
                                <span key={t} className="bg-gray-100 px-3 py-1.5 rounded-full text-sm border flex items-center gap-2">
                                    {t}
                                    <button onClick={() => onSaveSettings({ ...settings, leaveTypes: (settings.leaveTypes || []).filter(x => x !== t) })} className="text-red-500 font-bold">&times;</button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentRecord.id ? 'แก้ไขใบลา' : 'ยื่นใบขออนุญาตลา'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1">&times;</button>
                        </div>
                        <form onSubmit={handleSaveRecord} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ประเภทการลา</label>
                                    <select value={currentRecord.type} onChange={e => setCurrentRecord({...currentRecord, type: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                                        {settings.leaveTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">รูปแบบเวลาลา</label>
                                    <select value={currentRecord.session} onChange={e => setCurrentRecord({...currentRecord, session: e.target.value as LeaveSession})} className="w-full border rounded-lg px-3 py-2">
                                        <option value="full">ลาเต็มวัน</option>
                                        <option value="morning">ลาครึ่งวันเช้า</option>
                                        <option value="afternoon">ลาครึ่งวันบ่าย</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เริ่มวันที่</label>
                                    <input type="date" value={buddhistToISO(currentRecord.startDate)} onChange={e => setCurrentRecord({...currentRecord, startDate: isoToBuddhist(e.target.value)})} className="w-full border rounded-lg px-3 py-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ถึงวันที่</label>
                                    <input type="date" value={buddhistToISO(currentRecord.endDate)} onChange={e => setCurrentRecord({...currentRecord, endDate: isoToBuddhist(e.target.value)})} className="w-full border rounded-lg px-3 py-2" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">เนื่องจาก/เหตุผล</label>
                                <textarea required value={currentRecord.reason} onChange={e => setCurrentRecord({...currentRecord, reason: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="ระบุเหตุผลความจำเป็น..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ที่อยู่ที่ติดต่อได้</label>
                                    <input type="text" value={currentRecord.contactAddress} onChange={e => setCurrentRecord({...currentRecord, contactAddress: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                                    <input type="tel" value={currentRecord.contactPhone} onChange={e => setCurrentRecord({...currentRecord, contactPhone: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>

                            {/* File Upload Section */}
                            <div className="border-t pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">แนบไฟล์เอกสาร/รูปภาพ (เช่น ใบรับรองแพทย์)</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*,application/pdf" 
                                    onChange={handleFileChange} 
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" 
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(currentRecord.files || []).map((file, idx) => (
                                        <div key={idx} className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border">
                                            <span className="truncate max-w-[150px]">{file instanceof File ? file.name : 'ไฟล์แนบ'}</span>
                                            <button type="button" onClick={() => handleRemoveFile(idx)} className="text-red-500 font-bold hover:text-red-700">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between border border-blue-100">
                                <span className="text-blue-800 font-bold">สรุปวันลา:</span>
                                <span className="text-xl font-black text-blue-600">
                                    {(() => {
                                        const start = normalizeDate(currentRecord.startDate);
                                        const end = normalizeDate(currentRecord.endDate);
                                        if (start && end) {
                                            if (currentRecord.session !== 'full') return '0.5 วัน';
                                            const diff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                            return `${diff} วัน`;
                                        }
                                        return '-';
                                    })()}
                                </span>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow hover:bg-blue-700">{isSaving ? 'กำลังบันทึก...' : 'ยื่นใบลา'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-up max-h-[90vh] flex flex-col">
                        <div className={`p-5 text-white rounded-t-xl flex justify-between items-center ${viewRecord.status === 'approved' ? 'bg-green-600' : viewRecord.status === 'rejected' ? 'bg-red-600' : 'bg-amber-600'}`}>
                            <h3 className="text-xl font-bold">รายละเอียดการลา</h3>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1">&times;</button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                                    {viewRecord.personnelName.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-navy">{viewRecord.personnelName}</h4>
                                    <p className="text-xs text-gray-500">{viewRecord.position}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div><p className="text-gray-400 font-bold uppercase text-[10px]">ประเภท</p><p className="font-bold">{viewRecord.type}</p></div>
                                <div><p className="text-gray-400 font-bold uppercase text-[10px]">จำนวนวัน</p><p className="font-bold text-blue-600 text-lg">{viewRecord.daysCount} วัน</p></div>
                                <div className="col-span-2"><p className="text-gray-400 font-bold uppercase text-[10px]">ช่วงเวลา</p><p className="font-medium">{formatThaiDate(viewRecord.startDate)} ถึง {formatThaiDate(viewRecord.endDate)} ({viewRecord.session === 'full' ? 'เต็มวัน' : 'ครึ่งวัน'})</p></div>
                                <div className="col-span-2"><p className="text-gray-400 font-bold uppercase text-[10px]">เหตุผล</p><p className="font-medium bg-gray-50 p-2 rounded">{viewRecord.reason}</p></div>
                                
                                {/* Attached Files Section */}
                                {safeParseArray(viewRecord.files).length > 0 && (
                                    <div className="col-span-2">
                                        <p className="text-gray-400 font-bold uppercase text-[10px] mb-2">เอกสารแนบ / หลักฐาน</p>
                                        <div className="flex flex-wrap gap-2">
                                            {safeParseArray(viewRecord.files).map((file, idx) => {
                                                const url = getDirectDriveImageSrc(file);
                                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('googleusercontent.com');
                                                
                                                return (
                                                    <div key={idx} className="group relative">
                                                        {isImage ? (
                                                            <a href={url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:ring-2 hover:ring-primary-blue transition-all">
                                                                <img src={url} alt="attachment" className="w-full h-full object-cover" />
                                                            </a>
                                                        ) : (
                                                            <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center w-16 h-16 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-all shadow-sm">
                                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {viewRecord.comment && <div className="col-span-2"><p className="text-red-400 font-bold uppercase text-[10px]">หมายเหตุจากผู้อนุมัติ</p><p className="font-bold text-red-600">{viewRecord.comment}</p></div>}
                            </div>
                            <div className="pt-4 border-t flex flex-col items-center gap-2">
                                <span className={`px-4 py-1.5 rounded-full font-bold text-sm ${viewRecord.status === 'approved' ? 'bg-green-100 text-green-700' : viewRecord.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    สถานะ: {viewRecord.status === 'approved' ? 'อนุมัติเรียบร้อย' : viewRecord.status === 'rejected' ? 'ไม่ได้รับการอนุมัติ' : 'รอพิจารณา'}
                                </span>
                                {viewRecord.approverName && <p className="text-xs text-gray-400">ตรวจสอบโดย {viewRecord.approverName} เมื่อ {formatThaiDate(viewRecord.approvedDate)}</p>}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t rounded-b-xl flex justify-center">
                            <button onClick={() => setIsViewModalOpen(false)} className="px-10 py-2 bg-gray-200 font-bold rounded-lg hover:bg-gray-300 text-gray-700">ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavePage;
