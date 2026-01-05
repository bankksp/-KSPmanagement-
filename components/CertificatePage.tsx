
import React, { useState, useMemo, useEffect } from 'react';
import { CertificateRequest, Personnel, Settings, SpeakerConfig, CertificateProject } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, toThaiNumerals, getDirectDriveImageSrc, normalizeDate, safeParseArray } from '../utils';

interface CertificatePageProps {
    currentUser: Personnel;
    projects: CertificateProject[];
    requests: CertificateRequest[];
    onSaveProject: (project: CertificateProject) => void;
    onDeleteProject: (ids: number[]) => void;
    onSaveRequest: (request: CertificateRequest | CertificateRequest[]) => void;
    onDeleteRequest: (ids: number[]) => void;
    isSaving: boolean;
    settings: Settings;
}

const DEFAULT_BG = "https://img5.pic.in.th/file/secure-sv1/Frame-Gold.png";

const CertificatePage: React.FC<CertificatePageProps> = ({ 
    currentUser, projects = [], requests = [], 
    onSaveProject, onDeleteProject, onSaveRequest, onDeleteRequest, 
    isSaving, settings 
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'projects' | 'actual_registry' | 'number_registry' | 'approval'>('stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewItem, setViewItem] = useState<CertificateRequest | null>(null);
    
    const [requestType, setRequestType] = useState<'number_only' | 'actual_cert' | null>(null);
    
    // State สำหรับการเลือกรายการในหน้าอนุมัติ
    const [selectedApprovalIds, setSelectedApprovalIds] = useState<Set<number>>(new Set());

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'pro';

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'อนุมัติแล้ว';
            case 'rejected': return 'ไม่อนุมัติ';
            case 'pending': return 'รออนุมัติ';
            default: return status;
        }
    };

    // --- State สำหรับฟอร์มขอเลข ---
    const [requestForm, setRequestForm] = useState<Partial<CertificateRequest>>({
        projectId: 0,
        requesterName: '',
        activityName: '',
        date: getCurrentThaiDate(),
        startDate: getCurrentThaiDate(),
        endDate: getCurrentThaiDate(),
        peopleCount: 1,
        academicYear: (new Date().getFullYear() + 543).toString(),
        prefix: 'กส.ปญ',
        note: ''
    });

    useEffect(() => {
        if (currentUser && isRequestModalOpen) {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setRequestForm(prev => ({ 
                ...prev, 
                requesterName: `${title}${currentUser.personnelName}`,
                academicYear: (new Date().getFullYear() + 543).toString(),
                date: getCurrentThaiDate(),
                startDate: getCurrentThaiDate(),
                endDate: getCurrentThaiDate(),
                peopleCount: 1,
                prefix: 'กส.ปญ',
                activityName: '',
                note: ''
            }));
        }
    }, [currentUser, isRequestModalOpen]);

    const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);

    const nextActivityNo = useMemo(() => {
        const year = requestForm.academicYear || '';
        const yearRequests = requests.filter(r => String(r.academicYear) === String(year));
        if (yearRequests.length === 0) return 1;
        const maxNo = yearRequests.reduce((max, r) => {
            const currentNo = parseInt(r.activityNo || "0");
            return currentNo > max ? currentNo : max;
        }, 0);
        return maxNo + 1;
    }, [requests, requestForm.academicYear]);

    const previewGeneratedNumber = useMemo(() => {
        const prefix = requestForm.prefix || 'กส.ปญ';
        const count = Number(requestForm.peopleCount) || 1;
        const range = count > 1 ? `1-${count}` : '1';
        const year = requestForm.academicYear || '';
        return `${prefix} ${range}/${nextActivityNo}/${year}`;
    }, [requestForm.prefix, requestForm.peopleCount, requestForm.academicYear, nextActivityNo]);

    const stats = useMemo(() => {
        const approved = requests.filter(r => r.status === 'approved');
        const yearCounts: Record<string, number> = {};
        approved.forEach(r => {
            const year = r.academicYear || 'ไม่ระบุ';
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });
        const chartData = Object.entries(yearCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => a.name.localeCompare(b.name));
        return { total: approved.length, chartData, pending: requests.filter(r => r.status === 'pending').length };
    }, [requests]);

    const filteredActualRequests = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return requests.filter(r => r.certType === 'actual_cert' && (
            (r.requesterName || '').toLowerCase().includes(term) || 
            (r.activityName || '').toLowerCase().includes(term) || 
            (r.generatedNumber || '').toLowerCase().includes(term)
        )).sort((a, b) => b.id - a.id);
    }, [requests, searchTerm]);

    const filteredNumberRequests = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return requests.filter(r => (r.certType === 'number_only' || !r.certType) && (
            (r.requesterName || '').toLowerCase().includes(term) || 
            (r.activityName || '').toLowerCase().includes(term) || 
            (r.generatedNumber || '').toLowerCase().includes(term)
        )).sort((a, b) => b.id - a.id);
    }, [requests, searchTerm]);

    const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending').sort((a,b) => b.id - a.id), [requests]);

    // --- Project Management (Admin) ---
    const [projectForm, setProjectForm] = useState<Partial<CertificateProject>>({
        year: (new Date().getFullYear() + 543).toString(),
        title: '',
        prefix: 'กส.ปญ',
        directorName: settings.directorName || 'ผู้อำนวยการสถานศึกษา',
        directorSignature: [],
        speakers: [],
        status: 'active'
    });

    const handleSaveProjectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveProject({ ...projectForm, id: projectForm.id || Date.now() } as CertificateProject);
        setIsProjectModalOpen(false);
    };

    const handleSaveRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalPrefix = requestForm.prefix || 'กส.ปญ';
        let actNo = nextActivityNo.toString();
        let activityTitle = requestForm.activityName;

        if (requestType === 'actual_cert') {
            const project = projects.find(p => p.id === Number(requestForm.projectId));
            if (!project) return alert('กรุณาเลือกโครงการ');
            finalPrefix = project.prefix;
            activityTitle = project.title;
        }

        const count = Number(requestForm.peopleCount) || 1;
        const range = count > 1 ? `1-${count}` : '1';
        const generatedNumber = `${finalPrefix} ${range}/${actNo}/${requestForm.academicYear}`;

        const diffDays = Math.ceil(Math.abs(normalizeDate(requestForm.endDate)!.getTime() - normalizeDate(requestForm.startDate)!.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const requestToSave: CertificateRequest = {
            ...requestForm,
            id: Date.now(),
            activityNo: actNo,
            prefix: finalPrefix,
            activityName: activityTitle,
            generatedNumber,
            totalDays: diffDays,
            status: 'pending',
            certType: requestType as any
        } as CertificateRequest;

        onSaveRequest(requestToSave);
        setIsRequestModalOpen(false);
        setRequestType(null);
    };

    // ฟังก์ชันจัดการการอนุมัติ/ปฏิเสธ แบบกลุ่ม (Updated for Batch)
    const handleBatchApprovalAction = (status: 'approved' | 'rejected') => {
        if (selectedApprovalIds.size === 0) return alert('กรุณาเลือกรายการที่ต้องการดำเนินการ');
        
        const confirmMsg = status === 'approved' ? 'ยืนยันการอนุมัติรายการที่เลือก?' : 'ยืนยันการปฏิเสธรายการที่เลือก?';
        if (!window.confirm(confirmMsg)) return;

        const selectedItems = requests.filter(r => selectedApprovalIds.has(r.id));
        const updates = selectedItems.map(item => ({
            ...item,
            status,
            approverName: currentUser.personnelName,
            approvedDate: getCurrentThaiDate()
        }));

        // Send array to batch save
        onSaveRequest(updates);

        setSelectedApprovalIds(new Set());
    };

    const toggleSelectApproval = (id: number) => {
        const next = new Set(selectedApprovalIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedApprovalIds(next);
    };

    const CertificateRender = ({ item }: { item: CertificateRequest }) => {
        const project = projects.find(p => p.id === Number(item.projectId));
        if (!project) return <div className="p-10 text-center">ไม่พบข้อมูลโครงการต้นฉบับ</div>;

        const bg = (safeParseArray(project.background).length > 0) ? getDirectDriveImageSrc(safeParseArray(project.background)[0]) : DEFAULT_BG;
        const directorSig = getDirectDriveImageSrc(safeParseArray(project.directorSignature)[0]);
        
        const speakers = safeParseArray(project.speakers).filter(s => s.name);
        const signers = [
            { name: project.directorName, pos: `ผู้อำนวยการ${settings.schoolName}`, sig: directorSig },
            ...speakers.map(s => ({ name: s.name, pos: s.position, sig: getDirectDriveImageSrc(safeParseArray(s.signature)[0]) }))
        ];

        return (
            <div className="bg-white shadow-2xl mx-auto relative overflow-hidden print-area" style={{ width: '297mm', height: '210mm', minWidth: '297mm', WebkitPrintColorAdjust: 'exact' }}>
                <img src={bg} className="absolute inset-0 w-full h-full object-fill z-0" alt="bg" style={{ display: 'block' }} />
                <div className="relative z-10 flex flex-col items-center h-full pt-14 px-20 text-center font-sarabun text-navy">
                    <div className="absolute top-10 right-14 text-right">
                        <p className="text-xl font-bold text-gray-800">เลขที่ {toThaiNumerals(item.generatedNumber)}</p>
                    </div>
                    <img src={getDirectDriveImageSrc(settings.schoolLogo)} className="w-40 h-40 mb-3 object-contain" alt="logo" />
                    <h1 className="text-4xl font-black mb-1 leading-none">{settings.schoolName}</h1>
                    <h2 className="text-lg font-bold text-gray-600 mb-6 underline decoration-double underline-offset-4">สังกัดสำนักบริหารงานการศึกษาพิเศษ</h2>
                    <p className="text-2xl font-medium text-gray-700 mt-2">มอบเกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</p>
                    <h3 className="text-5xl font-black my-5 pb-1 border-b-2 border-gray-100 min-w-[50%] leading-tight">{item.requesterName}</h3>
                    <div className="text-xl text-gray-800 leading-[1.3] max-w-5xl space-y-0.5">
                        <p>ได้เข้าผ่าน{item.activityName}</p>
                        <p>ระหว่างวันที่ {toThaiNumerals(formatThaiDate(item.startDate))} ถึง {toThaiNumerals(formatThaiDate(item.endDate))}</p>
                        <p>รวมระยะเวลา {toThaiNumerals(item.totalDays)} วัน</p>
                    </div>
                    <p className="text-lg text-gray-600 mt-5">ขอให้มีความสุขสวัสดิ์ ประสบผลสำเร็จในหน้าที่การงานสืบไป</p>
                    <p className="text-lg text-gray-800 mt-1">ให้ไว้ ณ วันที่ {toThaiNumerals(formatThaiDate(item.approvedDate || item.date))}</p>
                    
                    <div className="absolute bottom-14 left-0 right-0 px-16 flex justify-center items-end gap-10">
                        {signers.map((s, i) => (
                            <div key={i} className="flex flex-col items-center min-w-[200px]">
                                {s.sig && item.status === 'approved' && <img src={s.sig} className="h-20 mb-[-25px] relative z-20 mix-blend-multiply" alt="sig" style={{ display: 'block' }} />}
                                <div className="relative z-10 border-t border-gray-400 pt-2 w-full">
                                    <p className="text-xl font-bold text-gray-800 leading-none">({s.name})</p>
                                    <p className="text-xs text-gray-500 mt-1">{s.pos}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 font-sarabun pb-20">
            {/* Page Header */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shadow-inner">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-navy tracking-tight">ระบบเกียรติบัตร</h2>
                        <p className="text-gray-500 font-medium">Digital Certification & Registry</p>
                    </div>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 overflow-x-auto max-w-full">
                    <button onClick={() => setActiveTab('stats')} className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>สถิติ</button>
                    {isAdmin && <button onClick={() => setActiveTab('projects')} className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${activeTab === 'projects' ? 'bg-white text-navy shadow-md' : 'text-gray-500'}`}>ตั้งค่าโครงการใบจริง</button>}
                    <button onClick={() => setActiveTab('actual_registry')} className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${activeTab === 'actual_registry' ? 'bg-white text-navy shadow-md' : 'text-gray-500'}`}>ทะเบียนเกียรติบัตรจริง</button>
                    <button onClick={() => setActiveTab('number_registry')} className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${activeTab === 'number_registry' ? 'bg-white text-navy shadow-md' : 'text-gray-500'}`}>ทะเบียนเลขเกียรติบัตร</button>
                    {isAdmin && <button onClick={() => setActiveTab('approval')} className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap ${activeTab === 'approval' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>รออนุมัติ {stats.pending > 0 && <span className="bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center">{stats.pending}</span>}</button>}
                </div>
            </div>

            {/* STATS VIEW */}
            {activeTab === 'stats' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in no-print">
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between">
                            <div><p className="text-gray-400 text-xs font-black uppercase tracking-widest">อนุมัติแล้วรวม</p><h3 className="text-5xl font-black text-navy mt-2">{toThaiNumerals(stats.total)} <span className="text-base font-normal text-gray-400">ใบ</span></h3></div>
                            <div className="text-5xl opacity-20">📜</div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => { setRequestType('number_only'); setIsRequestModalOpen(true); }} className="w-full py-5 bg-white border-2 border-navy text-navy rounded-[2rem] font-bold hover:bg-navy hover:text-white transition-all flex items-center justify-center gap-3">
                                🔢 ขอเลขทะเบียนเกียรติบัตร
                            </button>
                            <button onClick={() => { setRequestType('actual_cert'); setIsRequestModalOpen(true); }} className="w-full py-5 bg-navy text-white rounded-[2rem] font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-950 transition-all flex items-center justify-center gap-3">
                                🎨 ขอเกียรติบัตรฉบับจริง
                            </button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-navy mb-8">สถิติจำนวนแยกตามปีการศึกษา</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData} margin={{bottom: 20}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontWeight: 'bold'}}/><YAxis hide/><Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}/><Bar dataKey="value" name="จำนวน" radius={[8, 8, 0, 0]} barSize={40}><Cell fill="#3B82F6"/></Bar></BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* REGISTRY VIEWS */}
            {(activeTab === 'actual_registry' || activeTab === 'number_registry') && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in no-print">
                    <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
                        <h3 className="text-2xl font-black text-navy">
                            {activeTab === 'actual_registry' ? 'ทะเบียนเกียรติบัตรฉบับจริง' : 'ทะเบียนเลขเกียรติบัตร'}
                        </h3>
                        <div className="relative w-full sm:w-80">
                            <input type="text" placeholder="ค้นหาชื่อ, กิจกรรม, เลขที่..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-primary-blue shadow-inner" />
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-[2rem] border border-gray-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-navy text-white">
                                <tr>
                                    <th className="p-5 text-center w-16">#</th>
                                    <th className="p-5">วัน/เดือน/ปี</th>
                                    <th className="p-5">ชื่อผู้รับ / กิจกรรม</th>
                                    <th className="p-5 text-center">จำนวน/ปี</th>
                                    <th className="p-5">เลขที่อ้างอิง</th>
                                    <th className="p-5 text-center">สถานะ</th>
                                    <th className="p-5 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(activeTab === 'actual_registry' ? filteredActualRequests : filteredNumberRequests).map((r, idx) => (
                                    <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="p-5 text-center font-bold text-gray-300">{idx + 1}</td>
                                        <td className="p-5 text-gray-500 font-bold whitespace-nowrap">{formatThaiDate(r.date)}</td>
                                        <td className="p-5">
                                            <p className="font-black text-navy text-base leading-tight">{r.requesterName}</p>
                                            <p className="text-xs text-primary-blue font-bold mt-1 uppercase tracking-tighter line-clamp-1">{r.activityName}</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="bg-gray-100 py-1 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest">{r.peopleCount} คน | {r.academicYear}</div>
                                        </td>
                                        <td className="p-5 font-mono text-xs font-bold text-gray-700 bg-gray-50/50">{r.generatedNumber}</td>
                                        <td className="p-5 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${getStatusColor(r.status)}`}>{getStatusLabel(r.status)}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex justify-center gap-2">
                                                {r.status === 'approved' && r.certType === 'actual_cert' && (
                                                    <>
                                                        <button onClick={() => { setViewItem(r); setIsViewModalOpen(true); }} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 transition-all">เปิดดู</button>
                                                        <button onClick={() => { setViewItem(r); setIsViewModalOpen(true); setTimeout(() => window.print(), 500); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-blue-700 transition-all flex items-center gap-1 shadow-md">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                            ดาวน์โหลด PDF
                                                        </button>
                                                    </>
                                                )}
                                                {isAdmin && <button onClick={() => onDeleteRequest([r.id])} className="p-2 text-rose-300 hover:text-rose-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* APPROVAL VIEW (หน้าใหม่ที่แก้ไข) */}
            {activeTab === 'approval' && isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in no-print">
                    <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-navy">รายการรอการพิจารณาอนุมัติ</h3>
                            <p className="text-sm text-gray-400">เลือกรายการเกียรติบัตรที่ต้องการอนุมัติหรือปฏิเสธ</p>
                        </div>
                        {selectedApprovalIds.size > 0 && (
                            <div className="flex gap-2 animate-fade-in">
                                <button 
                                    onClick={() => handleBatchApprovalAction('approved')}
                                    disabled={isSaving}
                                    className="bg-emerald-600 text-white px-6 py-2 rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    ✅ อนุมัติ ({selectedApprovalIds.size})
                                </button>
                                <button 
                                    onClick={() => handleBatchApprovalAction('rejected')}
                                    disabled={isSaving}
                                    className="bg-rose-600 text-white px-6 py-2 rounded-2xl font-bold shadow-lg hover:bg-rose-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    ❌ ปฏิเสธ
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-gray-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b">
                                <tr>
                                    <th className="p-5 text-center w-12">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300"
                                            checked={pendingRequests.length > 0 && selectedApprovalIds.size === pendingRequests.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedApprovalIds(new Set(pendingRequests.map(r => r.id)));
                                                else setSelectedApprovalIds(new Set());
                                            }}
                                        />
                                    </th>
                                    <th className="p-5">ผู้ยื่นคำขอ / กิจกรรม</th>
                                    <th className="p-5">วันเวลาที่ขอ</th>
                                    <th className="p-5 text-center">ประเภท</th>
                                    <th className="p-5">เลขที่อ้างอิง</th>
                                    <th className="p-5 text-center">พรีวิว</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pendingRequests.map(r => (
                                    <tr key={r.id} className={`hover:bg-blue-50/20 transition-all ${selectedApprovalIds.has(r.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="p-5 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-gray-300"
                                                checked={selectedApprovalIds.has(r.id)}
                                                onChange={() => toggleSelectApproval(r.id)}
                                            />
                                        </td>
                                        <td className="p-5">
                                            <p className="font-black text-navy text-base leading-tight">{r.requesterName}</p>
                                            <p className="text-xs text-primary-blue font-bold mt-1 uppercase tracking-tighter">{r.activityName}</p>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-gray-600">{formatThaiDate(r.date)}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{r.academicYear}</div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${r.certType === 'actual_cert' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {r.certType === 'actual_cert' ? 'ใบจริง' : 'ขอเลข'}
                                            </span>
                                        </td>
                                        <td className="p-5 font-mono text-xs font-bold text-gray-400">{r.generatedNumber}</td>
                                        <td className="p-5 text-center">
                                            {r.certType === 'actual_cert' ? (
                                                <button onClick={() => { setViewItem(r); setIsViewModalOpen(true); }} className="text-primary-blue hover:underline font-bold text-xs">พรีวิวบัตร</button>
                                            ) : (
                                                <span className="text-gray-300 italic text-xs">ไม่มีพรีวิว</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {pendingRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-gray-300 font-black italic text-lg opacity-40">
                                            ไม่มีรายการที่รออนุมัติในขณะนี้
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PROJECTS MANAGEMENT */}
            {activeTab === 'projects' && isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in no-print">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-navy">จัดการโครงการสำหรับเกียรติบัตรใบจริง</h3>
                            <p className="text-sm text-gray-400">กำหนดพื้นหลังและผู้ลงนามเฉพาะแต่ละกิจกรรม</p>
                        </div>
                        <button onClick={() => { 
                            setProjectForm({ 
                                year: (new Date().getFullYear()+543).toString(), 
                                title: '', 
                                prefix: 'กส.ปญ', 
                                directorName: settings.directorName || 'ผู้อำนวยการสถานศึกษา', 
                                directorSignature: [],
                                speakers: Array(2).fill(null).map(() => ({ name: '', position: '', signature: [] })), 
                                status: 'active' 
                            }); 
                            setIsProjectModalOpen(true); 
                        }} className="bg-primary-blue text-white px-8 py-3 rounded-2xl font-bold shadow hover:bg-blue-700 transition-all">+ สร้างโครงการใหม่</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(p => (
                            <div key={p.id} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 flex flex-col justify-between group">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">ปี {p.year}</span>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{p.status === 'active' ? 'เปิดรับ' : 'ปิดแล้ว'}</span>
                                    </div>
                                    <h4 className="font-black text-navy text-lg leading-tight mb-2">{p.title}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">อักษรย่อ: {p.prefix}</p>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button onClick={() => { setProjectForm(p); setIsProjectModalOpen(true); }} className="flex-1 bg-white border border-gray-200 text-navy py-2 rounded-xl text-xs font-bold hover:shadow-md transition-all">แก้ไข</button>
                                    <button onClick={() => onDeleteProject([p.id])} className="p-2 text-rose-300 hover:text-rose-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: PROJECT MANAGEMENT (อัพลายเซ็น) */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] p-4 flex items-center justify-center no-print">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-primary-blue text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black">{projectForm.id ? 'แก้ไขโครงการ' : 'สร้างโครงการเกียรติบัตร'}</h3>
                                <p className="text-xs font-bold opacity-70 uppercase tracking-widest mt-1">Certificate Template Management</p>
                            </div>
                            <button onClick={() => setIsProjectModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSaveProjectSubmit} className="p-10 overflow-y-auto space-y-6 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ปีการศึกษา</label>
                                    <input type="text" required value={projectForm.year} onChange={e=>setProjectForm({...projectForm, year: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 font-bold outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">อักษรย่อส่วนราชการ</label>
                                    <input type="text" required value={projectForm.prefix} onChange={e=>setProjectForm({...projectForm, prefix: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 font-bold outline-none" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อโครงการกิจกรรม</label>
                                <input type="text" required value={projectForm.title} onChange={e=>setProjectForm({...projectForm, title: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 font-bold outline-none" placeholder="เช่น การอบรมครูดีเด่น..." />
                            </div>

                            {/* Main Director Signer */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4 shadow-sm">
                                <label className="text-[10px] font-black text-primary-blue uppercase tracking-widest ml-1">ผู้ลงนามหลัก (ผู้อำนวยการ)</label>
                                <div className="grid grid-cols-1 gap-4">
                                    <input type="text" required value={projectForm.directorName} onChange={e=>setProjectForm({...projectForm, directorName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold" placeholder="ชื่อ-นามสกุล" />
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400">อัปโหลดลายเซ็น ผอ. (.png พื้นหลังใส)</label>
                                        <input type="file" onChange={e => { if(e.target.files?.[0]) setProjectForm({...projectForm, directorSignature: [e.target.files[0]]}) }} className="w-full text-xs" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Joint Signers (Speakers) */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ผู้ร่วมลงนามเพิ่มเติม (ถ้ามี)</label>
                                    <button type="button" onClick={() => setProjectForm({...projectForm, speakers: [...(projectForm.speakers || []), { name: '', position: '', signature: [] }]})} className="text-xs text-primary-blue font-bold hover:underline">+ เพิ่มผู้ลงนาม</button>
                                </div>
                                {safeParseArray(projectForm.speakers).map((s, i) => (
                                    <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 space-y-3 relative shadow-sm">
                                        <button type="button" onClick={() => { const next = [...projectForm.speakers!]; next.splice(i,1); setProjectForm({...projectForm, speakers: next}); }} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500">×</button>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="ชื่อ-นามสกุล" value={s.name} onChange={e => {
                                                const next = [...safeParseArray(projectForm.speakers)];
                                                next[i] = { ...s, name: e.target.value };
                                                setProjectForm({...projectForm, speakers: next});
                                            }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm" />
                                            <input type="text" placeholder="ตำแหน่ง" value={s.position} onChange={e => {
                                                const next = [...safeParseArray(projectForm.speakers)];
                                                next[i] = { ...s, position: e.target.value };
                                                setProjectForm({...projectForm, speakers: next});
                                            }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-gray-400">อัปโหลดลายเซ็น (.png พื้นหลังใส)</label>
                                            <input type="file" onChange={e => {
                                                if(e.target.files?.[0]) {
                                                    const next = [...safeParseArray(projectForm.speakers)];
                                                    next[i] = { ...s, signature: [e.target.files[0]] };
                                                    setProjectForm({...projectForm, speakers: next});
                                                }
                                            }} className="w-full text-xs" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ภาพพื้นหลังเกียรติบัตร (A4 Landscape)</label>
                                    <input type="file" onChange={e => { if(e.target.files?.[0]) setProjectForm({...projectForm, background: [e.target.files[0]]}) }} className="w-full text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะโครงการ</label>
                                    <select value={projectForm.status} onChange={e=>setProjectForm({...projectForm, status: e.target.value as any})} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-2 font-bold outline-none">
                                        <option value="active">เปิดใช้งาน</option>
                                        <option value="archived">ปิดการใช้งาน</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4 rounded-[2rem] font-black tracking-widest uppercase hover:bg-gray-50 transition-all active:scale-95">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-primary-blue text-white py-4 rounded-[2rem] font-black tracking-widest uppercase shadow-2xl transition-all active:scale-95">
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกโครงการ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REQUEST MODAL */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] p-4 flex items-center justify-center no-print">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className={`p-8 ${requestType === 'actual_cert' ? 'bg-emerald-600' : 'bg-navy'} text-white flex justify-between items-center shrink-0`}>
                            <div>
                                <h3 className="text-2xl font-black">{requestType === 'actual_cert' ? 'ขอออกเกียรติบัตรฉบับจริง' : 'ขอเลขทะเบียนเกียรติบัตร'}</h3>
                            </div>
                            <button onClick={() => { setIsRequestModalOpen(false); setRequestType(null); }} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSaveRequestSubmit} className="p-10 overflow-y-auto space-y-8 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่ขอ</label>
                                    <div className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-400 select-none">{requestForm.date}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ปีการศึกษา</label>
                                    <select value={requestForm.academicYear} onChange={e=>setRequestForm({...requestForm, academicYear: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-50">
                                        {settings.academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>

                            {requestType === 'actual_cert' ? (
                                <>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกโครงการต้นฉบับ *</label>
                                        <select required value={requestForm.projectId} onChange={e=>setRequestForm({...requestForm, projectId: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none font-black text-navy shadow-sm focus:ring-4 focus:ring-emerald-50">
                                            <option value={0}>-- เลือกรายการ --</option>
                                            {activeProjects.map(p => <option key={p.id} value={p.id}>{p.title} (ปี {p.year})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล ผู้รับประกาศ *</label>
                                        <input type="text" required value={requestForm.requesterName} onChange={e=>setRequestForm({...requestForm, requesterName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none font-black text-navy text-xl shadow-inner" placeholder="ระบุชื่อผู้รับใบประกาศ..." />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อกิจกรรม/โครงการ *</label>
                                        <input type="text" required value={requestForm.activityName} onChange={e=>setRequestForm({...requestForm, activityName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none font-black text-navy text-lg shadow-inner" placeholder="พิมพ์ชื่อกิจกรรม..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ลำดับกิจกรรมที่ (อัตโนมัติ)</label>
                                            <div className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-5 py-4 font-black text-indigo-600 select-none">{nextActivityNo}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนคน</label>
                                            <input type="number" min="1" value={requestForm.peopleCount} onChange={e=>setRequestForm({...requestForm, peopleCount: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-50" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เริ่มวันที่</label><input type="date" required value={buddhistToISO(requestForm.startDate)} onChange={e=>setRequestForm({...requestForm, startDate: isoToBuddhist(e.target.value)})} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-bold outline-none" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สิ้นสุดวันที่</label><input type="date" required value={buddhistToISO(requestForm.endDate)} onChange={e=>setRequestForm({...requestForm, endDate: isoToBuddhist(e.target.value)})} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-bold outline-none" /></div>
                            </div>

                            <div className="p-6 bg-indigo-50 rounded-[2rem] border-2 border-dashed border-indigo-200 text-center">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">ตัวอย่างรูปแบบเลขที่เกียรติบัตร</p>
                                <h4 className="text-2xl font-black text-indigo-700 tracking-tighter">{toThaiNumerals(previewGeneratedNumber)}</h4>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => { setIsRequestModalOpen(false); setRequestType(null); }} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4.5 rounded-[2rem] font-black tracking-widest uppercase hover:bg-gray-50 transition-all active:scale-95">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className={`flex-[2] text-white py-4.5 rounded-[2rem] font-black tracking-widest uppercase shadow-2xl transition-all active:scale-95 ${requestType === 'actual_cert' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-navy hover:bg-blue-950 shadow-blue-900/20'}`}>ส่งคำขอลงทะเบียน</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW MODAL (Print Preview) */}
            {isViewModalOpen && viewItem && (activeTab === 'actual_registry' || activeTab === 'approval') && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] p-4 flex items-center justify-center overflow-auto no-print" onClick={() => setIsViewModalOpen(false)}>
                    <div className="fixed right-10 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[110] no-print">
                        <button onClick={() => window.print()} className="w-16 h-16 bg-emerald-500 text-white rounded-full flex flex-col items-center justify-center shadow-2xl hover:bg-emerald-600 hover:scale-110 transition-all active:scale-90 group" title="พิมพ์ / บันทึก PDF">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            <span className="text-[8px] font-black uppercase mt-1">PRINT</span>
                        </button>
                        <button onClick={() => setIsViewModalOpen(false)} className="w-16 h-16 bg-white/10 backdrop-blur-xl text-white rounded-full flex flex-col items-center justify-center border border-white/20 shadow-2xl hover:bg-white/20 hover:scale-110 transition-all active:scale-90" title="ปิดหน้าต่าง">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            <span className="text-[8px] font-black uppercase mt-1">CLOSE</span>
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-8 w-full max-w-[320mm] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="w-full overflow-visible flex justify-center py-10 scale-[0.35] sm:scale-[0.5] md:scale-[0.6] lg:scale-[0.8] xl:scale-100 origin-top">
                            <CertificateRender item={viewItem} />
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Section for Printing */}
            <div className="hidden print:block print-visible">
                {viewItem && <CertificateRender item={viewItem} />}
            </div>
        </div>
    );
};

export default CertificatePage;

function getStatusColor(status: string) {
    switch (status) {
        case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
        default: return 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm';
    }
}
