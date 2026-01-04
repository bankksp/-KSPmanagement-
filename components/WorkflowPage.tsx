
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WorkflowDocument, Personnel, WorkflowStep, WorkflowStage } from '../types';
import { getCurrentThaiDate, formatThaiDate, getDirectDriveImageSrc, safeParseArray, toThaiNumerals, getFirstImageSource } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface WorkflowPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    documents: WorkflowDocument[];
    onSave: (doc: WorkflowDocument) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
}

const DOCUMENT_GROUPS = ["งานบริหารงบประมาณ", "งานบริหารงานบุคคล", "งานบริหารงานวิชาการ", "งานบริหารงานทั่วไป", "งานกิจการนักเรียน"];
const DOCUMENT_CATEGORIES = ["รายงานผลการดำเนินงาน", "บันทึกข้อความ", "ขออนุมัติโครงการ/กิจกรรม", "ขออนุญาตไปราชการ/ลา/อบรม", "ขออนุมัติเบิกจ่าย/เคลียร์เงินยืม", "อื่นๆ"];

const WorkflowPage: React.FC<WorkflowPageProps> = ({ 
    currentUser, personnel, documents, onSave, onDelete, isSaving 
}) => {
    // Roles check
    const isDirector = currentUser.specialRank === 'director';
    const isAdmin = currentUser.role === 'admin';

    const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'my_tasks' | 'my_approvals' | 'my_history' | 'create'>('dashboard');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    
    // Create Form State
    const [createForm, setCreateForm] = useState<Partial<WorkflowDocument>>({
        title: '',
        group: DOCUMENT_GROUPS[0],
        category: DOCUMENT_CATEGORIES[0],
        description: '',
        file: [],
        currentApproverId: 0
    });

    const [approverSearch, setApproverSearch] = useState('');
    const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);

    const [viewDoc, setViewDoc] = useState<WorkflowDocument | null>(null);
    const [approveDoc, setApproveDoc] = useState<WorkflowDocument | null>(null);
    
    // Approval State
    const [comment, setComment] = useState('ทราบ / ดำเนินการตามเสนอ');
    const [nextApproverId, setNextApproverId] = useState<number>(0);
    const [nextApproverSearch, setNextApproverSearch] = useState('');
    const [isNextApproverDropdownOpen, setIsNextApproverDropdownOpen] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Filters
    const mySubmissions = useMemo(() => documents.filter(d => d.submitterId === currentUser.id).sort((a,b) => b.id - a.id), [documents, currentUser.id]);
    const myTasks = useMemo(() => documents.filter(d => d.currentApproverId === currentUser.id && d.status === 'pending').sort((a,b) => b.id - a.id), [documents, currentUser.id]);
    
    const myApprovals = useMemo(() => {
        return documents.filter(d => {
            const history = safeParseArray(d.history);
            return history.some((step: WorkflowStep) => step.signerId === currentUser.id);
        }).sort((a, b) => b.id - a.id);
    }, [documents, currentUser.id]);

    const allDocs = useMemo(() => [...documents].sort((a,b) => b.id - a.id), [documents]);

    const stats = useMemo(() => {
        const total = documents.length;
        const approved = documents.filter(d => d.status === 'approved').length;
        const pending = documents.filter(d => d.status === 'pending').length;
        const rejected = documents.filter(d => d.status === 'rejected').length;

        const categoryCounts: Record<string, number> = {};
        DOCUMENT_CATEGORIES.forEach(cat => categoryCounts[cat] = 0);
        documents.forEach(d => {
            if (categoryCounts[d.category] !== undefined) categoryCounts[d.category]++;
        });
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        const statusData = [
            { name: 'อนุมัติเสร็จสิ้น', value: approved, color: '#10B981' },
            { name: 'อยู่ระหว่างพิจารณา', value: pending, color: '#F59E0B' },
            { name: 'ตีกลับแก้ไข', value: rejected, color: '#EF4444' }
        ].filter(d => d.value > 0);

        return { total, approved, pending, rejected, myTaskCount: myTasks.length, categoryData, statusData };
    }, [documents, myTasks]);

    const getFilteredPersonnel = (search: string) => {
        const term = search.toLowerCase();
        return personnel.filter(p => 
            (p.personnelName || '').toLowerCase().includes(term) || 
            ((p.personnelTitleOther || p.personnelTitle) || '').toLowerCase().includes(term) ||
            (p.position || '').toLowerCase().includes(term)
        );
    };

    const filteredPersonnelList = useMemo(() => getFilteredPersonnel(approverSearch), [personnel, approverSearch]);

    const filteredNextApproverList = useMemo(() => {
        if (!approveDoc) return [];
        const term = nextApproverSearch.toLowerCase();
        
        let targetRank: string = '';
        if (approveDoc.currentStage === 'head') targetRank = 'deputy';
        else if (approveDoc.currentStage === 'deputy') targetRank = 'director';

        let list = personnel.filter(p => p.specialRank === targetRank);
        if (list.length === 0) list = personnel;

        return list.filter(p => 
            (p.personnelName || '').toLowerCase().includes(term) || 
            ((p.personnelTitleOther || p.personnelTitle) || '').toLowerCase().includes(term) ||
            (p.position || '').toLowerCase().includes(term)
        );
    }, [personnel, nextApproverSearch, approveDoc]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCreateForm(prev => ({ ...prev, file: [e.target.files![0]] }));
        }
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.currentApproverId) return alert('กรุณาระบุผู้ที่จะส่งให้ตรวจสอบ');

        const newDoc: WorkflowDocument = {
            id: Date.now(),
            date: getCurrentThaiDate(),
            title: createForm.title || '',
            group: createForm.group || DOCUMENT_GROUPS[0],
            category: createForm.category || DOCUMENT_CATEGORIES[0],
            description: createForm.description || '',
            file: createForm.file || [],
            submitterId: currentUser.id,
            submitterName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            currentStage: 'head',
            currentApproverId: createForm.currentApproverId,
            status: 'pending',
            history: []
        };
        onSave(newDoc);
        setCreateForm({ title: '', group: DOCUMENT_GROUPS[0], category: DOCUMENT_CATEGORIES[0], description: '', file: [], currentApproverId: 0 });
        setApproverSearch('');
        setActiveTab('my_history');
    };

    const handleOpenApprove = (doc: WorkflowDocument) => {
        setApproveDoc(doc);
        setComment('ทราบ / ดำเนินการตามเสนอ');
        setNextApproverId(0);
        setNextApproverSearch('');
        setIsNextApproverDropdownOpen(false);
        setIsApproveModalOpen(true);
        setTimeout(clearCanvas, 100);
    };

    const clearCanvas = () => { const canvas = canvasRef.current; if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); };
    const startDrawing = (e: any) => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return; setIsDrawing(true); const rect = canvas.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; ctx.beginPath(); ctx.strokeStyle = '#0000FF'; ctx.lineWidth = 2; ctx.moveTo(clientX - rect.left, clientY - rect.top); };
    const draw = (e: any) => { if (!isDrawing || !canvasRef.current) return; const ctx = canvasRef.current.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke(); e.preventDefault(); };

    const processApproval = (status: 'approved' | 'rejected') => {
        if (!approveDoc) return;
        const canvas = canvasRef.current;
        const sig = canvas ? canvas.toDataURL('image/png') : '';
        
        if (status === 'approved' && !isDirector && !nextApproverId) return alert('กรุณาเลือกผู้พิจารณาคนถัดไป');

        const newStep: WorkflowStep = {
            role: approveDoc.currentStage as any,
            signerId: currentUser.id,
            signerName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            signerPosition: currentUser.position,
            comment: comment,
            signature: sig,
            date: getCurrentThaiDate(),
            status
        };

        let nextStage: WorkflowStage = approveDoc.currentStage;
        let nextApprover = approveDoc.currentApproverId;
        let finalStatus = approveDoc.status;

        if (status === 'rejected') {
            finalStatus = 'rejected';
            nextStage = 'completed';
        } else {
            if (approveDoc.currentStage === 'head') {
                nextStage = 'deputy';
                nextApprover = nextApproverId;
            } else if (approveDoc.currentStage === 'deputy') {
                nextStage = 'director';
                nextApprover = nextApproverId;
            } else if (approveDoc.currentStage === 'director') {
                nextStage = 'completed';
                finalStatus = 'approved';
            }
        }

        const updatedDoc: WorkflowDocument = {
            ...approveDoc,
            history: [...safeParseArray(approveDoc.history), newStep],
            currentStage: nextStage,
            currentApproverId: nextApprover,
            status: finalStatus
        };

        onSave(updatedDoc);
        setIsApproveModalOpen(false);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'รอพิจารณา';
            case 'approved': return 'อนุมัติแล้ว';
            case 'rejected': return 'ตีกลับแก้ไข';
            default: return status;
        }
    };

    const getStageLabel = (stage: WorkflowStage) => {
        switch (stage) {
            case 'head': return 'ระดับหัวหน้างาน';
            case 'deputy': return 'ระดับรองผู้อำนวยการ';
            case 'director': return 'ระดับผู้อำนวยการ';
            case 'completed': return 'กระบวนการเสร็จสิ้น';
            default: return stage;
        }
    };

    const getListToDisplay = () => {
        if (activeTab === 'all') return allDocs;
        if (activeTab === 'my_tasks') return myTasks;
        if (activeTab === 'my_approvals') return myApprovals;
        if (activeTab === 'my_history') return mySubmissions;
        return [];
    };

    return (
        <div className="space-y-6 font-sarabun pb-12">
            {/* Page Header */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-navy tracking-tight">เสนอแฟ้มเอกสาร</h2>
                    <p className="text-gray-500 font-medium mt-1">ระบบติดตามกระบวนการอนุมัติหนังสือและโครงการแบบดิจิทัล</p>
                </div>
                <button 
                    onClick={() => setActiveTab('create')} 
                    className="bg-navy hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    สร้างใบนำเสนอใหม่
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 w-fit no-print flex-wrap gap-1 shadow-sm">
                <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>แผงควบคุม</button>
                {(isDirector || isAdmin) && (
                    <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'all' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>หนังสือทั้งหมด</button>
                )}
                <button onClick={() => setActiveTab('my_tasks')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'my_tasks' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
                    งานรอตรวจ
                    {stats.myTaskCount > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">{stats.myTaskCount}</span>}
                </button>
                <button onClick={() => setActiveTab('my_approvals')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'my_approvals' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>ที่เคยอนุมัติ</button>
                <button onClick={() => setActiveTab('my_history')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'my_history' ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>ประวัติที่ฉันเสนอ</button>
            </div>

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'เอกสารทั้งหมด', val: stats.total, color: 'from-blue-500 to-indigo-600', icon: '📂' },
                            { label: 'รอดำเนินการ', val: stats.pending, color: 'from-amber-400 to-orange-500', icon: '⏳' },
                            { label: 'อนุมัติเสร็จสิ้น', val: stats.approved, color: 'from-emerald-400 to-green-600', icon: '✅' },
                            { label: 'งานรอฉันตรวจ', val: stats.myTaskCount, color: 'from-rose-400 to-red-600', icon: '🖋️' }
                        ].map((card, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-xl transition-all">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-5 rounded-bl-full`}></div>
                                <div className="relative z-10">
                                    <div className="text-3xl mb-4">{card.icon}</div>
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none">{card.label}</p>
                                    <h3 className="text-5xl font-black text-navy mt-2 tracking-tighter">{card.val}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                            <h3 className="text-xl font-black text-navy mb-8 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-navy rounded-full"></span>
                                สถิติการเสนอตามหมวดหมู่
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.categoryData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} />
                                        <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}} />
                                        <Bar dataKey="value" name="จำนวนรายการ" fill="#1e3a8a" radius={[0, 10, 10, 0]} barSize={28} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-xl font-black text-navy mb-8 text-center">สถานะปัจจุบัน</h3>
                            <div className="h-64 w-full flex-grow relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" isAnimationActive={false}>
                                            {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                    <span className="text-3xl font-black text-navy">{stats.total}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-8">
                                {stats.statusData.map(item => (
                                    <div key={item.name} className="flex flex-col items-center text-center">
                                        <div className="w-2 h-2 rounded-full mb-2" style={{backgroundColor: item.color}}></div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase leading-tight">{item.name}</span>
                                        <span className="text-sm font-bold text-navy">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST TABLES VIEW */}
            {activeTab !== 'dashboard' && activeTab !== 'create' && (
                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                    <div className="p-10 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-navy tracking-tight">
                                {activeTab === 'all' ? 'หนังสือทั้งหมด' : 
                                 activeTab === 'my_tasks' ? 'หนังสือรอดำเนินการ' : 
                                 activeTab === 'my_approvals' ? 'รายการที่ฉันพิจารณา' : 
                                 'ประวัติที่ส่งเสนอ'}
                            </h3>
                            <p className="text-gray-400 text-xs mt-1 uppercase font-bold tracking-widest">พบทั้งหมด {getListToDisplay().length} รายการ</p>
                        </div>
                        <div className="relative w-full sm:w-64">
                             <input type="text" placeholder="ค้นหาตามหัวข้อ..." className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary-blue" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[900px]">
                            <thead className="bg-gray-50/50 text-gray-400 font-black border-b border-gray-100 uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="p-8">ลำดับ/วันที่</th>
                                    <th className="p-8">หัวข้อเรื่อง</th>
                                    <th className="p-8">ขั้นตอนปัจจุบัน</th>
                                    <th className="p-8 text-center">สถานะ</th>
                                    <th className="p-8 text-center">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {getListToDisplay().map((doc, idx) => (
                                    <tr key={doc.id} className="hover:bg-blue-50/30 transition-all group">
                                        <td className="p-8 whitespace-nowrap">
                                            <div className="font-black text-navy">{idx + 1}</div>
                                            <div className="text-[10px] text-gray-400 font-bold mt-1">{formatThaiDate(doc.date)}</div>
                                        </td>
                                        <td className="p-8">
                                            <div className="font-black text-navy text-lg group-hover:text-primary-blue transition-colors leading-tight">{doc.title}</div>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">{doc.group}</span>
                                                <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">{doc.category}</span>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                <span className="font-bold text-gray-600 text-xs">{getStageLabel(doc.currentStage)}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium mt-1">ผู้เสนอ: {doc.submitterName}</p>
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${
                                                doc.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                doc.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                                'bg-amber-50 text-amber-600 border-amber-100 shadow-sm'
                                            }`}>
                                                {getStatusLabel(doc.status)}
                                            </span>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setViewDoc(doc); setIsViewModalOpen(true); }} className="bg-white border border-gray-200 text-navy hover:bg-gray-50 px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95">ดูข้อมูล</button>
                                                {(doc.currentApproverId === currentUser.id && doc.status === 'pending') && (
                                                    <button onClick={() => handleOpenApprove(doc)} className="bg-navy text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 hover:bg-blue-900 active:scale-95 transition-all">ลงนาม</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {getListToDisplay().length === 0 && (
                                    <tr><td colSpan={5} className="p-40 text-center text-gray-300 font-black italic text-lg opacity-40">ไม่พบรายการเอกสารในหมวดหมู่นี้</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CREATE TAB UI (Redesigned) */}
            {activeTab === 'create' && (
                <div className="max-w-4xl mx-auto animate-fade-in-up">
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 space-y-10">
                        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                            <div className="w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center text-2xl shadow-xl shadow-blue-900/20">📄</div>
                            <div>
                                <h3 className="text-2xl font-black text-navy">เขียนใบนำเสนอหนังสือ/โครงการ</h3>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Submit Document to Workflow</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">กลุ่มงาน</label>
                                    <select value={createForm.group} onChange={e => setCreateForm({...createForm, group: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-navy">
                                        {DOCUMENT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทเอกสาร</label>
                                    <select value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-navy">
                                        {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">หัวข้อเรื่อง</label>
                                <input type="text" required value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="พิมพ์ระบุชื่อเรื่องที่ต้องการเสนอ..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black text-navy text-xl shadow-inner" />
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เสนอให้ใครตรวจสอบ (ขั้นแรก)</label>
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        value={approverSearch} 
                                        onFocus={() => setIsApproverDropdownOpen(true)} 
                                        onChange={e => { setApproverSearch(e.target.value); setIsApproverDropdownOpen(true); }} 
                                        placeholder="พิมพ์ค้นชื่อหัวหน้างาน/หัวหน้าช่วงชั้น..." 
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-14 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-navy shadow-inner" 
                                    />
                                    <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-navy transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    
                                    {isApproverDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-3 bg-white border border-gray-100 rounded-3xl shadow-2xl max-h-64 overflow-y-auto p-2">
                                            {filteredPersonnelList.length > 0 ? filteredPersonnelList.map(h => (
                                                <div key={h.id} onClick={() => { setCreateForm({...createForm, currentApproverId: h.id}); setApproverSearch(`${h.personnelTitle || ''}${h.personnelName || ''} (${h.position || ''})`); setIsApproverDropdownOpen(false); }} className="px-6 py-4 hover:bg-blue-50/50 rounded-2xl cursor-pointer flex items-center gap-4 transition-all">
                                                    <div className="w-10 h-10 rounded-full bg-navy/5 text-navy flex items-center justify-center font-black text-sm uppercase">{(h.personnelName || '?').charAt(0)}</div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-navy truncate">{(h.personnelTitle || '')}{(h.personnelName || '')}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase truncate tracking-widest">{(h.position || '')}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-12 text-center text-gray-300 italic font-bold">ไม่พบรายชื่อในระบบ</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">แนบเอกสารต้นฉบับ (.PDF)</label>
                                <div className="border-4 border-dashed border-gray-100 rounded-[3rem] p-16 flex flex-col items-center justify-center bg-gray-50/30 group hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer relative shadow-inner">
                                    <div className="p-8 bg-white text-rose-500 rounded-[2rem] mb-6 shadow-xl group-hover:scale-110 transition-transform"><svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V7h2v2z"/></svg></div>
                                    <div className="text-center"><h4 className="font-black text-navy text-lg">คลิกเพื่ออัปโหลดไฟล์ PDF</h4><p className="text-[10px] text-gray-400 mt-2 uppercase font-black tracking-[0.2em]">Portable Document Format Required</p></div>
                                    <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {createForm.file && createForm.file.length > 0 && (
                                        <div className="mt-8 p-4 bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-3 border border-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce-subtle"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>{createForm.file[0] instanceof File ? createForm.file[0].name : 'ไฟล์ได้รับการเลือกแล้ว'}</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">รายละเอียดเพิ่มเติม</label>
                                <textarea rows={6} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="ระบุเหตุผลความจำเป็น หรือรายละเอียดอื่นๆ..." className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] px-8 py-6 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-navy shadow-inner" />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setActiveTab('dashboard')} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-5 rounded-[2rem] font-black tracking-widest uppercase hover:bg-gray-50 transition-all active:scale-95">ยกเลิก</button>
                                <button type="submit" disabled={isSaving || !createForm.title || !createForm.currentApproverId} className="flex-[2] bg-navy text-white py-5 rounded-[2rem] font-black tracking-widest uppercase shadow-2xl shadow-blue-900/30 hover:bg-blue-950 transition-all active:scale-95 disabled:grayscale">ส่งหนังสือเข้ากระบวนการ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW MODAL (Enhanced Stepper Timeline) */}
            {isViewModalOpen && viewDoc && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] p-4 flex items-center justify-center overflow-auto no-print" onClick={() => { setIsViewModalOpen(false); setViewDoc(null); }}>
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-10 bg-navy text-white flex justify-between items-start shrink-0 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                             <div className="relative z-10">
                                <span className="bg-white/20 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] mb-3 inline-block">{viewDoc.category}</span>
                                <h3 className="text-4xl font-black tracking-tighter leading-tight max-w-2xl">{viewDoc.title}</h3>
                                <div className="flex items-center gap-4 mt-6 text-blue-200 text-sm font-bold">
                                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> ผู้เสนอ: {viewDoc.submitterName}</span>
                                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> วันที่: {formatThaiDate(viewDoc.date)}</span>
                                </div>
                             </div>
                             <button onClick={() => { setIsViewModalOpen(false); setViewDoc(null); }} className="relative z-20 bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all active:scale-90"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <div className="flex flex-col lg:flex-row overflow-hidden flex-grow bg-gray-50/30">
                            {/* Left Content Area */}
                            <div className="flex-grow p-12 overflow-y-auto space-y-12">
                                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative group">
                                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-6">Description</h4>
                                    <div className="text-gray-700 font-medium leading-relaxed italic text-lg">"{viewDoc.description || 'ไม่มีรายละเอียดเพิ่มเติม'}"</div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] border-b pb-4">Digital Documents</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {viewDoc.file && viewDoc.file.length > 0 ? (
                                            <a href={getDirectDriveImageSrc(viewDoc.file[0])} target="_blank" rel="noreferrer" className="flex items-center gap-6 p-8 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 hover:border-navy hover:shadow-xl transition-all group">
                                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📄</div>
                                                <div>
                                                    <p className="font-black text-navy text-lg leading-tight">ต้นฉบับหนังสือ .PDF</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">คลิกเพื่อเปิดดูหรือพิมพ์</p>
                                                </div>
                                            </a>
                                        ) : (
                                            <div className="p-10 bg-gray-100 rounded-[2.5rem] flex items-center justify-center text-gray-400 italic">ไม่พบไฟล์เอกสารแนบ</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Timeline Sidebar */}
                            <div className="w-full lg:w-[450px] bg-white border-l border-gray-100 p-10 overflow-y-auto shrink-0 relative">
                                <h4 className="text-[11px] font-black text-navy uppercase tracking-[0.3em] mb-10 border-b border-gray-50 pb-6 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Approval Process Tracking
                                </h4>
                                
                                <div className="space-y-12 relative pl-10">
                                    <div className="absolute left-10 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-gray-200"></div>
                                    
                                    {safeParseArray(viewDoc.history).map((step, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className="absolute -left-12 top-0 w-10 h-10 rounded-full bg-white border-4 border-indigo-500 text-indigo-500 flex items-center justify-center font-black text-xs shadow-lg z-10">✓</div>
                                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 group-hover:bg-white group-hover:shadow-xl transition-all duration-300">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="font-black text-navy text-base">{(step.signerName || '')}</p>
                                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mt-1">{(step.signerPosition || '')}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${step.status === 'approved' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                        {step.status === 'approved' ? 'อนุมัติ' : 'ตีกลับ'}
                                                    </span>
                                                </div>
                                                <div className="bg-white p-4 rounded-2xl border border-gray-100 text-gray-600 italic text-xs leading-relaxed shadow-inner">"{step.comment || 'ไม่มีความเห็นเพิ่มเติม'}"</div>
                                                {step.signature && (
                                                    <div className="h-14 flex items-center justify-start mt-4 bg-white/50 p-1.5 rounded-xl border border-gray-50 w-fit">
                                                        <img src={step.signature} alt="signature" className="max-h-full opacity-60 mix-blend-multiply grayscale hover:grayscale-0 transition-all" />
                                                    </div>
                                                )}
                                                <p className="text-[9px] text-gray-400 font-bold mt-4 text-right">{toThaiNumerals(formatThaiDate(step.date))}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {viewDoc.status === 'pending' && (
                                        <div className="relative">
                                             <div className="absolute -left-12 top-0 w-10 h-10 rounded-full bg-white border-4 border-gray-200 text-gray-300 flex items-center justify-center font-black text-xs z-10 animate-pulse">?</div>
                                             <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50 text-center">
                                                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Next Step</p>
                                                 <p className="text-xs font-bold text-gray-400 mt-2">รอดำเนินการตรวจสอบโดย</p>
                                                 <p className="text-sm font-black text-navy mt-1">
                                                     {personnel.find(p => p.id === viewDoc.currentApproverId)?.personnelName || 'ผู้มีอำนาจลงนาม'}
                                                 </p>
                                             </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* APPROVE MODAL (Redesigned Signing Room) */}
            {isApproveModalOpen && approveDoc && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[80] p-4 flex items-center justify-center">
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-indigo-700 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black">พิจารณาและลงนามหนังสือ</h3>
                                <p className="text-[10px] opacity-70 font-bold uppercase tracking-[0.3em] mt-1">Digital Signing Gateway</p>
                            </div>
                            <button onClick={() => setIsApproveModalOpen(false)} className="relative z-20 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all active:scale-90"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="p-10 overflow-y-auto space-y-10 flex-grow bg-gray-50/40">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-0"><svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V7h2v2z"/></svg></div>
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 block">Document Subject</label>
                                <h4 className="text-2xl font-black text-navy leading-snug tracking-tight">{approveDoc.title}</h4>
                                <div className="flex gap-2 mt-6">
                                    <span className="bg-indigo-50 text-indigo-600 text-[10px] px-4 py-1.5 rounded-full font-black uppercase border border-indigo-100 tracking-wider shadow-sm">{approveDoc.category}</span>
                                    <span className="bg-slate-900 text-white text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-wider shadow-lg shadow-slate-900/10">{approveDoc.group}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ความเห็นประกอบการพิจารณา</label>
                                <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} className="w-full border-none rounded-[2rem] px-8 py-6 bg-white outline-none focus:ring-4 focus:ring-indigo-100 shadow-inner font-bold text-navy text-lg" />
                            </div>

                            {!isDirector && (
                                <div className="space-y-3 relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">มอบหมายพิจารณาต่อ (ลำดับถัดไป)</label>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            value={nextApproverSearch} 
                                            onFocus={() => setIsNextApproverDropdownOpen(true)}
                                            onChange={e => { setNextApproverSearch(e.target.value); setIsNextApproverDropdownOpen(true); }}
                                            placeholder="ค้นหาผู้พิจารณาลำดับถัดไป..." 
                                            className="w-full border-none rounded-[2rem] px-16 py-5 bg-white outline-none font-black text-navy shadow-inner focus:ring-4 focus:ring-indigo-100 transition-all text-lg" 
                                        />
                                        <svg className="w-8 h-8 absolute left-6 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        
                                        {isNextApproverDropdownOpen && (
                                            <div className="absolute z-50 w-full mt-4 bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl max-h-64 overflow-y-auto p-4 border border-indigo-100">
                                                {filteredNextApproverList.length > 0 ? filteredNextApproverList.map(h => (
                                                    <div key={h.id} onClick={() => { setNextApproverId(h.id); setNextApproverSearch(`${h.personnelTitle || ''}${h.personnelName || ''} (${h.position || ''})`); setIsNextApproverDropdownOpen(false); }} className="px-6 py-4 hover:bg-indigo-50/50 rounded-2xl cursor-pointer flex items-center gap-5 transition-all mb-1 border border-transparent hover:border-indigo-100">
                                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-black text-sm uppercase shadow-lg shadow-indigo-500/20">{(h.personnelName || '?').charAt(0)}</div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-navy truncate text-base">{(h.personnelTitle || '')}{(h.personnelName || '')}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-widest">{(h.position || '')}</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="p-16 text-center text-gray-300 italic font-black text-lg opacity-40">ไม่พบรายชื่อในฐานข้อมูล</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ลงลายมือชื่อดิจิทัล</label>
                                <div className="border-none bg-white rounded-[3rem] h-56 relative overflow-hidden shadow-inner group ring-4 ring-indigo-50/50">
                                    <canvas ref={canvasRef} width={600} height={224} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} className="w-full h-full cursor-pencil mix-blend-multiply grayscale-0" />
                                    <div className="absolute top-4 left-6 pointer-events-none text-[8px] font-black text-gray-300 uppercase tracking-[0.5em] opacity-40">Signature Canvas</div>
                                    <button type="button" onClick={clearCanvas} className="absolute bottom-6 right-8 text-[10px] text-red-500 font-black uppercase tracking-widest bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-red-50 transition-all active:scale-90">ล้างลายเซ็น</button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-10">
                                <button type="button" onClick={() => processApproval('rejected')} className="flex-1 bg-white border-2 border-rose-100 text-rose-500 py-5 rounded-[2.5rem] font-black tracking-widest uppercase transition-all hover:bg-rose-50 active:scale-95 shadow-lg shadow-rose-500/5">ตีกลับให้แก้ไข</button>
                                <button type="button" onClick={() => processApproval('approved')} className="flex-[2] bg-indigo-600 text-white py-5 rounded-[2.5rem] font-black tracking-widest uppercase shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">ยืนยันและอนุมัติส่งต่อ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkflowPage;
