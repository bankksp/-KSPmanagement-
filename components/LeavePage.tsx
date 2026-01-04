
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
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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
            const matchesName = (r.personnelName || '').toLowerCase().includes(searchName.toLowerCase());
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setCurrentRecord(prev => ({
                ...prev,
                files: Array.from(e.target.files!)
            }));
        }
    };

    const handleSaveRecord = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation for mandatory file (Optional logic, let's keep it advisory for now)
        const files = safeParseArray(currentRecord.files);
        if (files.length === 0 && !currentRecord.id) {
            if (!window.confirm('คุณยังไม่ได้แนบไฟล์เอกสารประกอบ ยืนยันการส่งใบลาหรือไม่?')) return;
        }

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

    // --- Export All Records to Excel ---
    const handleExportExcel = () => {
        const header = ['วันที่ยื่น', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'ประเภทการลา', 'เริ่มวันที่', 'ถึงวันที่', 'จำนวนวัน', 'เหตุผล', 'สถานะ'];
        const rows = displayRecords.map(r => [
            r.submissionDate,
            r.personnelName,
            r.position,
            r.type,
            r.startDate,
            r.endDate,
            r.daysCount,
            r.reason,
            getStatusLabel(r.status)
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += header.map(h => `"${h}"`).join(",") + "\r\n";
        rows.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `รายงานการลาบุคลากร_${getCurrentThaiDate().replace(/\//g,'-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    // --- Generate Official Memorandum (Word) ---
    const handleDownloadMemoWord = (record: LeaveRecord) => {
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <style>
                    @font-face { font-family: 'TH Sarabun New'; }
                    body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.25; }
                    .header { font-size: 20pt; font-weight: bold; text-align: left; display: flex; align-items: center; }
                    .header-img { width: 50px; margin-right: 15px; }
                    .title { font-size: 24pt; font-weight: bold; text-align: center; margin-top: -40px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    td { vertical-align: top; padding: 5px 0; }
                    .bold { font-weight: bold; }
                    .dotted { border-bottom: 1px dotted #000; flex-grow: 1; padding: 0 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img class="header-img" src="https://img5.pic.in.th/file/secure-sv1/Garuda-logo.png" />
                    <span>บันทึกข้อความ</span>
                </div>
                <br/>
                <p><span class="bold">ส่วนราชการ</span> <span class="dotted">${settings.schoolName}</span></p>
                <p>
                    <span class="bold">ที่</span> <span class="dotted">............ / ............</span> 
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span class="bold">วันที่</span> <span class="dotted">${formatThaiDate(record.submissionDate)}</span>
                </p>
                <p><span class="bold">เรื่อง</span> <span class="dotted">ขออนุญาต${record.type}</span></p>
                <br/>
                <p><span class="bold">เรียน</span> ผู้อำนวยการ${settings.schoolName}</p>
                <br/>
                <p style="text-indent: 2.5cm;">
                    ด้วยข้าพเจ้า ${record.personnelName} ตำแหน่ง ${record.position} สังกัด${settings.schoolName} 
                    มีความประสงค์ขอ${record.type} เนื่องจาก ${record.reason} 
                    ตั้งแต่วันที่ ${formatThaiDate(record.startDate)} ถึงวันที่ ${formatThaiDate(record.endDate)} 
                    เป็นเวลา ${record.daysCount} วัน ในระหว่างลาสามารถติดต่อได้ที่ ${record.contactPhone || '-'}
                </p>
                <p style="text-indent: 2.5cm;">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>
                <br/><br/>
                <table style="width: 100%;">
                    <tr>
                        <td width="50%"></td>
                        <td align="center">
                            <p>(ลงชื่อ).......................................................</p>
                            <p>(${record.personnelName})</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `บันทึกข้อความการลา_${record.personnelName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const COLORS_LIST = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#8B5CF6', '#EC4899'];

    return (
        <div className="space-y-6 animate-fade-in font-sarabun pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <div>
                    <h2 className="text-3xl font-black text-navy tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-inner">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        ระบบการลาบุคลากร
                    </h2>
                    <p className="text-gray-500 font-medium mt-1 ml-1">Digital Leave Management & Automation</p>
                </div>
                
                <div className="flex gap-2">
                    {isAdmin && (
                         <div className="relative">
                            <button 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Export ข้อมูล
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                                    <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">📊</div>
                                        Excel (.csv)
                                    </button>
                                </div>
                            )}
                         </div>
                    )}
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="bg-primary-blue text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        ยื่นใบลาใหม่
                    </button>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 w-fit no-print flex-wrap gap-1 shadow-sm">
                <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>สถิติการลา</button>
                <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>ทะเบียนรายการลา</button>
                {isApprover && (
                    <button onClick={() => setActiveTab('approval')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'approval' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
                        พิจารณาอนุมัติ
                        {pendingApprovals.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">{pendingApprovals.length}</span>}
                    </button>
                )}
            </div>

            {/* STATS TAB */}
            {activeTab === 'stats' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-10">
                        <div className="flex-grow">
                             <h3 className="text-xl font-black text-navy mb-8 flex items-center gap-2">
                                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                                จำนวนวันลาตามประเภท
                             </h3>
                             <div className="h-64">
                                {stats.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.chartData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                            <Bar dataKey="value" name="จำนวนวัน" radius={[0, 10, 10, 0]} isAnimationActive={false}>
                                                {stats.chartData.map((_, index) => <Cell key={index} fill={COLORS_LIST[index % COLORS_LIST.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">ยังไม่มีข้อมูลการลาที่ผ่านการอนุมัติ</div>}
                             </div>
                        </div>
                        <div className="w-full md:w-64 space-y-4 flex flex-col justify-center">
                            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
                                <p className="text-emerald-800 font-black text-xs uppercase tracking-widest mb-1">อนุมัติแล้ว</p>
                                <h4 className="text-4xl font-black text-emerald-600">{stats.approved}</h4>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
                                <p className="text-blue-800 font-black text-xs uppercase tracking-widest mb-1">เสนอทั้งหมด</p>
                                <h4 className="text-4xl font-black text-blue-600">{stats.total}</h4>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-30">📂</div>
                        <h4 className="font-black text-navy text-lg leading-tight">ระบบจัดเก็บเอกสารลาอิเล็กทรอนิกส์</h4>
                        <p className="text-gray-400 text-xs mt-2 leading-relaxed">ช่วยลดขั้นตอนการเดินทางของเอกสาร และรวบรวมสถิติเพื่อใช้ประกอบการประเมินผลการปฏิบัติงาน</p>
                    </div>
                </div>
            )}

            {/* LIST TAB */}
            {activeTab === 'list' && (
                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden animate-fade-in no-print">
                    <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-wrap gap-4 w-full md:w-auto">
                            <div className="relative flex-grow min-w-[200px]">
                                <input type="text" placeholder="ค้นหาชื่อ..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary-blue shadow-inner" />
                            </div>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-navy shadow-inner">
                                <option value="">ทุกประเภท</option>
                                {settings.leaveTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-navy shadow-inner">
                                <option value="">ทุกสถานะ</option>
                                <option value="pending">รออนุมัติ</option>
                                <option value="approved">อนุมัติแล้ว</option>
                                <option value="rejected">ไม่อนุมัติ</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[900px]">
                            <thead className="bg-gray-50/50 text-gray-400 font-black border-b border-gray-100 uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="p-8">วันที่ยื่น</th>
                                    <th className="p-8">รายชื่อ/ตำแหน่ง</th>
                                    <th className="p-8">ประเภท/ระยะเวลา</th>
                                    <th className="p-8 text-center">หลักฐาน</th>
                                    <th className="p-8 text-center">สถานะ</th>
                                    <th className="p-8 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {displayRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50/30 transition-all group">
                                        <td className="p-8 whitespace-nowrap">
                                            <div className="font-bold text-gray-400 text-xs">{r.submissionDate}</div>
                                        </td>
                                        <td className="p-8">
                                            <div className="font-black text-navy text-lg group-hover:text-primary-blue transition-colors leading-tight">{r.personnelName}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{r.position}</div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-4 bg-primary-blue rounded-full"></span>
                                                <span className="font-black text-navy">{r.type}</span>
                                            </div>
                                            <div className="text-gray-500 font-medium mt-1">
                                                {r.startDate} ถึง {r.endDate} ({r.daysCount} วัน)
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            {safeParseArray(r.files).length > 0 ? (
                                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-tighter shadow-sm">มีไฟล์แนบ ✓</span>
                                            ) : (
                                                <span className="text-gray-300 text-[10px] font-bold italic">- ไม่มี -</span>
                                            )}
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${getStatusColor(r.status)}`}>
                                                {getStatusLabel(r.status)}
                                            </span>
                                        </td>
                                        <td className="p-8 text-center">
                                            <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="bg-white border border-gray-200 text-navy hover:bg-gray-50 px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95">ดูข้อมูล</button>
                                        </td>
                                    </tr>
                                ))}
                                {displayRecords.length === 0 && (
                                    <tr><td colSpan={6} className="p-40 text-center text-gray-300 font-black italic text-lg opacity-40">ไม่พบรายการข้อมูลการลา</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* APPROVAL TAB */}
            {activeTab === 'approval' && isApprover && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-orange-500/10">✒️</div>
                        <div>
                            <h3 className="text-2xl font-black text-navy">พิจารณาคำขอลาบุคลากร</h3>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Found {pendingApprovals.length} Pending Tasks</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pendingApprovals.map(r => (
                            <div key={r.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-300 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-0 text-orange-500">
                                    <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                </div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h4 className="text-2xl font-black text-navy tracking-tight">{r.personnelName}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">{r.position}</p>
                                        </div>
                                        <div className="bg-orange-50 text-orange-600 text-[10px] px-4 py-1.5 rounded-full font-black uppercase border border-orange-100 shadow-sm">{r.type}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
                                            <p className="font-black text-navy text-sm leading-tight">{r.startDate} - {r.endDate}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Days</p>
                                            <p className="font-black text-indigo-600 text-lg leading-tight">{r.daysCount} <span className="text-[10px] font-normal text-gray-400">วัน</span></p>
                                        </div>
                                        <div className="col-span-2 pt-4 border-t border-gray-200 mt-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason</p>
                                            <p className="text-sm font-medium text-gray-700 italic">"{r.reason}"</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-auto">
                                        <button onClick={() => handleApprove(r, 'approved')} className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-sm uppercase tracking-widest">อนุมัติ</button>
                                        <button onClick={() => { const msg = prompt('ระบุเหตุผลที่ไม่อนุมัติ:'); if(msg) handleApprove(r, 'rejected', msg); }} className="flex-1 py-4 bg-white border-2 border-rose-500 text-rose-500 font-black rounded-2xl hover:bg-rose-50 transition-all active:scale-95 text-sm uppercase tracking-widest">ไม่อนุมัติ</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {pendingApprovals.length === 0 && (
                            <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border border-dashed border-gray-200 text-gray-300 font-black italic text-lg opacity-40">ไม่พบคำขอที่รอการพิจารณา</div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: SUBMIT LEAVE */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-primary-blue text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black">ยื่นใบลาอิเล็กทรอนิกส์</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Official Digital Leave Form</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="relative z-20 hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSaveRecord} className="p-10 overflow-y-auto space-y-8 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทการลา</label>
                                    <select value={currentRecord.type} onChange={e => setCurrentRecord({...currentRecord, type: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black text-navy" required>
                                        {settings.leaveTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ตั้งแต่วันที่</label>
                                    <input type="date" required value={buddhistToISO(currentRecord.startDate)} onChange={e => setCurrentRecord({...currentRecord, startDate: isoToBuddhist(e.target.value)})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ถึงวันที่</label>
                                    <input type="date" required value={buddhistToISO(currentRecord.endDate)} onChange={e => setCurrentRecord({...currentRecord, endDate: isoToBuddhist(e.target.value)})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ช่วงเวลา</label>
                                    <div className="flex gap-2 p-2 bg-slate-200/50 rounded-[1.5rem]">
                                        {['full', 'morning', 'afternoon'].map(ses => (
                                            <button key={ses} type="button" onClick={() => setCurrentRecord({...currentRecord, session: ses as LeaveSession})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${currentRecord.session === ses ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-500'}`}>
                                                {ses === 'full' ? 'เต็มวัน' : ses === 'morning' ? 'ครึ่งเช้า' : 'ครึ่งบ่าย'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เหตุผลการลา</label>
                                    <textarea required rows={4} value={currentRecord.reason} onChange={e => setCurrentRecord({...currentRecord, reason: e.target.value})} className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-6 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-navy shadow-inner" placeholder="ระบุเหตุผลความจำเป็น..." />
                                </div>
                                
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เอกสารประกอบ (ใบรับรองแพทย์/ภาพถ่ายใบลา)</label>
                                    <div className="bg-white border-4 border-dashed border-gray-100 rounded-[2rem] p-8 flex flex-col items-center justify-center group hover:border-blue-300 transition-all cursor-pointer relative shadow-inner">
                                        <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl mb-2 group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Click to upload files</p>
                                        <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        {safeParseArray(currentRecord.files).length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                {safeParseArray(currentRecord.files).map((f: any, i: number) => (
                                                    <span key={i} className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black shadow-lg">{(f as File).name || 'เอกสารแนบ'}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-200">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ที่อยู่/เบอร์โทรติดต่อขณะลา</label>
                                        <input type="text" value={currentRecord.contactAddress} onChange={e => setCurrentRecord({...currentRecord, contactAddress: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 font-bold text-navy" placeholder="ระบุสถานที่ที่สามารถติดต่อได้..." />
                                    </div>
                                    <input type="tel" value={currentRecord.contactPhone} onChange={e => setCurrentRecord({...currentRecord, contactPhone: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 font-bold text-navy" placeholder="เบอร์โทรศัพท์..." />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-10">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4.5 rounded-[2rem] font-black tracking-widest uppercase hover:bg-gray-50 transition-all active:scale-95">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-navy text-white py-4.5 rounded-[2rem] font-black tracking-widest uppercase shadow-2xl shadow-blue-900/30 hover:bg-blue-950 transition-all active:scale-95 disabled:grayscale">ส่งใบเสนอขออนุมัติลา</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW MODAL */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[80] p-4 no-print" onClick={() => { setIsViewModalOpen(false); setViewRecord(null); }}>
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-10 bg-slate-900 text-white flex justify-between items-start shrink-0 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                             <div className="relative z-10">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${getStatusColor(viewRecord.status)}`}>{getStatusLabel(viewRecord.status)}</span>
                                <h3 className="text-4xl font-black tracking-tighter mt-4">{viewRecord.personnelName}</h3>
                                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{viewRecord.position}</p>
                             </div>
                             <button onClick={() => { setIsViewModalOpen(false); setViewRecord(null); }} className="relative z-20 bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all active:scale-90"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-12 bg-gray-50/50 space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Leave Type</label>
                                    <p className="text-xl font-black text-navy">{viewRecord.type}</p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Days</label>
                                    <p className="text-xl font-black text-indigo-600">{viewRecord.daysCount} <span className="text-sm font-normal text-gray-400">วัน</span></p>
                                </div>
                                <div className="col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Duration Period</label>
                                    <p className="text-lg font-black text-navy leading-tight">{viewRecord.startDate} - {viewRecord.endDate}</p>
                                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase">Session: {viewRecord.session === 'full' ? 'Full Day' : viewRecord.session === 'morning' ? 'Morning Shift' : 'Afternoon Shift'}</p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4 block">Personal Reason</label>
                                <div className="text-gray-700 font-medium leading-relaxed italic text-lg">"{viewRecord.reason}"</div>
                            </div>

                            {/* Files Section */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-navy uppercase tracking-[0.3em] border-b pb-3">Evidence & Files</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {safeParseArray(viewRecord.files).map((f: any, i: number) => (
                                        <a key={i} href={getDirectDriveImageSrc(f)} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all group">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📄</div>
                                            <div className="min-w-0">
                                                <p className="font-black text-navy text-xs truncate">เปิดไฟล์หลักฐานที่ {i+1}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Click to view file</p>
                                            </div>
                                        </a>
                                    ))}
                                    {safeParseArray(viewRecord.files).length === 0 && <p className="col-span-full text-center text-gray-400 italic py-4">ไม่มีไฟล์แนบ</p>}
                                </div>
                            </div>

                            {/* Approver Response */}
                            {viewRecord.approverName && (
                                <div className="p-8 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-[2.5rem] border border-emerald-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Approver Response</h4>
                                        <span className="text-[9px] font-bold text-emerald-500">{viewRecord.approvedDate}</span>
                                    </div>
                                    <p className="text-sm font-black text-emerald-900 leading-tight">พิจารณาโดย: {viewRecord.approverName}</p>
                                    <div className="bg-white/50 p-4 rounded-xl text-gray-600 text-xs italic">"{viewRecord.comment || 'ไม่มีความเห็นเพิ่มเติม'}"</div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end items-center">
                            {/* Download Memorandum Buttons */}
                            <div className="flex bg-indigo-50 p-1.5 rounded-2xl gap-2 mr-auto">
                                <button onClick={() => handleDownloadMemoWord(viewRecord)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 font-black text-xs rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                                    บันทึกข้อความ (Word)
                                </button>
                                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    พิมพ์ใบลา (PDF)
                                </button>
                            </div>

                            <button onClick={() => { setIsViewModalOpen(false); setViewRecord(null); }} className="bg-gray-100 text-gray-500 px-8 py-3 rounded-2xl font-black text-xs hover:bg-gray-200 transition-all uppercase tracking-widest">ปิดหน้าต่าง</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavePage;
