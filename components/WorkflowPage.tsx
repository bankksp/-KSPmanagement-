
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WorkflowDocument, Personnel, WorkflowStep, WorkflowStage } from '../types';
import { getCurrentThaiDate, formatThaiDate, getDirectDriveImageSrc, safeParseArray, toThaiNumerals } from '../utils';
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
    const isDeputy = currentUser.specialRank === 'deputy';
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
            { name: 'อนุมัติ', value: approved, color: '#10B981' },
            { name: 'รออนุมัติ', value: pending, color: '#F59E0B' },
            { name: 'ตีกลับ', value: rejected, color: '#EF4444' }
        ].filter(d => d.value > 0);

        return { total, approved, pending, rejected, myTaskCount: myTasks.length, categoryData, statusData };
    }, [documents, myTasks]);

    // Enhanced Search personnel logic
    const getFilteredPersonnel = (search: string) => {
        const term = search.toLowerCase();
        return personnel.filter(p => 
            (p.personnelName || '').toLowerCase().includes(term) || 
            ((p.personnelTitleOther || p.personnelTitle) || '').toLowerCase().includes(term) ||
            (p.position || '').toLowerCase().includes(term)
        );
    };

    const filteredPersonnelList = useMemo(() => getFilteredPersonnel(approverSearch), [personnel, approverSearch]);

    // Next approvers logic for Approval Modal
    const filteredNextApproverList = useMemo(() => {
        if (!approveDoc) return [];
        const term = nextApproverSearch.toLowerCase();
        
        let targetRank: string = '';
        if (approveDoc.currentStage === 'head') targetRank = 'deputy';
        else if (approveDoc.currentStage === 'deputy') targetRank = 'director';

        let list = personnel.filter(p => p.specialRank === targetRank);
        
        // Fallback: If no one has the specific rank, allow searching from all personnel
        if (list.length === 0) {
            list = personnel;
        }

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
            case 'head': return 'หัวหน้าช่วงชั้น/หัวหน้างาน';
            case 'deputy': return 'รองผู้อำนวยการ';
            case 'director': return 'ผู้อำนวยการ';
            case 'completed': return 'เสร็จสิ้น';
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
        <div className="space-y-6 font-sarabun max-w-full overflow-x-hidden">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-navy tracking-tight">ระบบเสนอแฟ้มเอกสาร</h2>
                <p className="text-gray-500 text-sm">ติดตามสถานะการพิจารณาหนังสือราชการและโครงการต่างๆ</p>
            </div>

            <div className="flex bg-white/50 p-1 rounded-2xl border border-gray-200 w-fit no-print flex-wrap gap-1 shadow-sm">
                <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>แดชบอร์ด</button>
                {(isDirector || isAdmin) && (
                    <button onClick={() => setActiveTab('all')} className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'all' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>หนังสือทั้งหมด</button>
                )}
                <button onClick={() => setActiveTab('my_tasks')} className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'my_tasks' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                    งานรอฉันตรวจ
                    {stats.myTaskCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black">{stats.myTaskCount}</span>}
                </button>
                <button onClick={() => setActiveTab('my_approvals')} className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'my_approvals' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ที่ฉันเคยอนุมัติ</button>
                <button onClick={() => setActiveTab('my_history')} className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'my_history' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ประวัติที่ฉันเสนอ</button>
                <button onClick={() => setActiveTab('create')} className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    สร้างใหม่
                </button>
            </div>

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">เอกสารทั้งหมด</p>
                            <h3 className="text-4xl font-black text-navy mt-1 tracking-tighter">{stats.total}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">รอดำเนินการ</p>
                            <h3 className="text-4xl font-black text-amber-500 mt-1 tracking-tighter">{stats.pending}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">อนุมัติเสร็จสิ้น</p>
                            <h3 className="text-4xl font-black text-emerald-500 mt-1 tracking-tighter">{stats.approved}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">งานรอฉันตรวจ</p>
                            <h3 className="text-4xl font-black text-rose-500 mt-1 tracking-tighter">{stats.myTaskCount}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-6">สถิติแยกตามประเภท</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.categoryData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} />
                                        <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                        <Bar dataKey="value" name="จำนวนเอกสาร" fill="#1e3a8a" radius={[0, 8, 8, 0]} barSize={24} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-lg font-bold text-navy mb-6 text-center">สถานะรวมระบบ</h3>
                            <div className="h-64 w-full flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                            {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-4 flex-wrap">
                                {stats.statusData.map(item => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.color}}></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE TAB */}
            {activeTab === 'create' && (
                <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-10">
                        <div className="space-y-8">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <h3 className="font-black text-gray-700">ข้อมูลเอกสาร</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">กลุ่มงาน</label>
                                    <select value={createForm.group} onChange={e => setCreateForm({...createForm, group: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue transition-all font-bold text-navy">
                                        {DOCUMENT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทเอกสาร</label>
                                    <select value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue transition-all font-bold text-navy">
                                        {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หัวข้อเรื่อง</label>
                                <input type="text" value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="ระบุหัวข้อเรื่อง..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue transition-all font-black text-navy text-lg" />
                            </div>

                            <div className="space-y-1 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">มอบให้ใครตรวจ (หัวหน้าช่วงชั้น/หัวหน้างาน)</label>
                                <div className="relative">
                                    <input type="text" value={approverSearch} onFocus={() => setIsApproverDropdownOpen(true)} onChange={e => { setApproverSearch(e.target.value); setIsApproverDropdownOpen(true); }} placeholder="พิมพ์ชื่อเพื่อค้นหาบุคลากร..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-12 py-4 outline-none focus:ring-2 focus:ring-primary-blue transition-all font-bold text-navy" />
                                    <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    
                                    {isApproverDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                                            {filteredPersonnelList.length > 0 ? filteredPersonnelList.map(h => (
                                                <div key={h.id} onClick={() => { setCreateForm({...createForm, currentApproverId: h.id}); setApproverSearch(`${h.personnelTitle || ''}${h.personnelName || ''} (${h.position || ''})`); setIsApproverDropdownOpen(false); }} className="px-6 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center gap-4 transition-colors">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{(h.personnelName || '?').charAt(0)}</div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-navy truncate text-sm">{(h.personnelTitle || '')}{(h.personnelName || '')}</p>
                                                        <p className="text-[10px] text-gray-400 truncate uppercase">{(h.position || '')}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-10 text-center text-gray-300 italic text-sm font-bold">ไม่พบรายชื่อในระบบ</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">แนบไฟล์ PDF ต้นฉบับ</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-gray-50/50 group hover:border-blue-400 transition-all cursor-pointer relative">
                                    <div className="p-5 bg-red-50 text-red-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V7h2v2z"/></svg></div>
                                    <div className="text-center"><h4 className="font-black text-gray-700">อัปโหลดไฟล์ PDF</h4><p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Supports .pdf documents</p></div>
                                    <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {createForm.file && createForm.file.length > 0 && (
                                        <div className="mt-4 p-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black flex items-center gap-2 border border-emerald-100 animate-fade-in"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>{createForm.file[0] instanceof File ? createForm.file[0].name : 'ไฟล์เดิม'}</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รายละเอียดเพิ่มเติม</label>
                                <textarea rows={5} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="ระบุรายละเอียดหรือข้อความเพิ่มเติม..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue transition-all font-medium text-navy shadow-inner" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6">
                            <button onClick={() => setActiveTab('dashboard')} className="bg-white border border-gray-200 text-gray-400 px-12 py-4 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all">ยกเลิก</button>
                            <button onClick={handleCreateSubmit} disabled={isSaving || !createForm.title || !createForm.currentApproverId} className="bg-navy text-white px-16 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>ยืนยันส่งหนังสือ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST TABLES (All, Tasks, Approvals, History) */}
            {(activeTab === 'all' || activeTab === 'my_tasks' || activeTab === 'my_approvals' || activeTab === 'my_history') && (
                <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden animate-fade-in border border-gray-100">
                    <div className="p-10 border-b border-gray-100">
                        <h3 className="text-2xl font-black text-navy">
                            {activeTab === 'all' ? 'หนังสือทั้งหมดในระบบ' : 
                             activeTab === 'my_tasks' ? 'หนังสือรอฉันตรวจสอบ' : 
                             activeTab === 'my_approvals' ? 'หนังสือที่ฉันเคยลงนาม' : 
                             'ประวัติการเสนอหนังสือ'}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 uppercase font-bold tracking-widest">พบรายการทั้งหมด {getListToDisplay().length} รายการ</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-400 font-black border-b border-gray-100 uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="p-8 whitespace-nowrap">วันที่เสนอ</th>
                                    <th className="p-8">เรื่อง / กลุ่มงาน</th>
                                    <th className="p-8 whitespace-nowrap">ขั้นตอนปัจจุบัน</th>
                                    <th className="p-8 text-center whitespace-nowrap">สถานะ</th>
                                    <th className="p-8 text-center whitespace-nowrap">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {getListToDisplay().map(doc => (
                                    <tr key={doc.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-8 text-gray-500 font-bold whitespace-nowrap">
                                            {formatThaiDate(doc.date)}
                                        </td>
                                        <td className="p-8">
                                            <div className="font-black text-navy text-lg tracking-tight leading-tight">{doc.title}</div>
                                            <div className="text-[10px] text-blue-500 font-black uppercase mt-1 tracking-widest">{doc.group} &bull; {doc.category}</div>
                                        </td>
                                        <td className="p-8 whitespace-nowrap">
                                            <div className="text-xs font-black text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 inline-block whitespace-nowrap">
                                                {getStageLabel(doc.currentStage)}
                                            </div>
                                        </td>
                                        <td className="p-8 text-center whitespace-nowrap">
                                            <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 whitespace-nowrap ${doc.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : doc.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {getStatusLabel(doc.status)}
                                            </span>
                                        </td>
                                        <td className="p-8 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setViewDoc(doc); setIsViewModalOpen(true); }} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all whitespace-nowrap">ดูข้อมูล</button>
                                                {(activeTab === 'my_tasks' || (doc.currentApproverId === currentUser.id && doc.status === 'pending')) && (
                                                    <button onClick={() => handleOpenApprove(doc)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all whitespace-nowrap">ลงนาม</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {getListToDisplay().length === 0 && (
                                    <tr><td colSpan={5} className="p-40 text-center text-gray-300 font-black italic text-lg">ไม่พบข้อมูลในรายการนี้</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW MODAL */}
            {isViewModalOpen && viewDoc && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setIsViewModalOpen(false)}>
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-10 bg-navy text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter leading-tight">{viewDoc.title}</h3>
                                <p className="text-[10px] opacity-70 font-black uppercase tracking-[0.2em] mt-1">รายละเอียดและประวัติสถานะหนังสือ</p>
                            </div>
                            <button onClick={() => setIsViewModalOpen(false)} className="hover:bg-white/20 rounded-full p-2 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-12 overflow-y-auto space-y-12 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ผู้เสนอ</label>
                                            <p className="font-black text-navy text-lg">{viewDoc.submitterName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">กลุ่มงาน</label>
                                            <p className="font-bold text-gray-700">{viewDoc.group}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">รายละเอียดเพิ่มเติม</label>
                                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-inner italic text-gray-600 leading-relaxed text-sm">
                                            {viewDoc.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                                    <div className="p-8 bg-red-50 rounded-full mb-6">
                                        <svg className="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V7h2v2z"/></svg>
                                    </div>
                                    {viewDoc.file && viewDoc.file.length > 0 ? (
                                        <a href={getDirectDriveImageSrc(viewDoc.file[0])} target="_blank" rel="noreferrer" className="bg-navy text-white px-12 py-4 rounded-2xl font-black text-sm shadow-2xl hover:bg-blue-900 transition-all flex items-center gap-3">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            เปิดดูไฟล์ PDF
                                        </a>
                                    ) : (
                                        <p className="text-gray-400 font-bold italic">ไม่พบไฟล์เอกสารแนบ</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-4">Approval Timeline</h5>
                                <div className="space-y-6 relative pl-6">
                                    <div className="absolute left-[34px] top-6 bottom-6 w-0.5 bg-gray-100"></div>
                                    {safeParseArray(viewDoc.history).map((step, idx) => (
                                        <div key={idx} className="relative flex items-start gap-10 group">
                                            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-sm z-10">
                                                {step.status === 'approved' ? '✓' : '✖'}
                                            </div>
                                            <div className="flex-grow bg-white p-8 rounded-3xl border border-gray-100 shadow-sm group-hover:border-indigo-200 transition-all">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <p className="font-black text-navy text-xl">{(step.signerName || '')}</p>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{(step.signerPosition || '')}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${step.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {step.status === 'approved' ? 'อนุมัติ' : 'ตีกลับ'}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400 font-bold whitespace-nowrap">{formatThaiDate(step.date)}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50/50 p-6 rounded-2xl border-2 border-dotted border-gray-200 text-gray-700 italic text-sm">"{step.comment || 'ไม่มีความเห็นเพิ่มเติม'}"</div>
                                                {step.signature && (
                                                    <div className="h-20 flex items-center justify-start mt-6 bg-white/50 p-2 rounded-xl border border-gray-100 shadow-inner w-fit">
                                                        <img src={step.signature} alt="signature" className="max-h-full opacity-80 mix-blend-multiply" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {safeParseArray(viewDoc.history).length === 0 && (
                                        <div className="p-32 text-center text-gray-300 border-2 border-dashed rounded-[3rem] bg-white/50">
                                            <p className="font-black italic text-lg">รอดำเนินการตรวจสอบในลำดับแรก</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-10 bg-white border-t flex justify-end shrink-0">
                            <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-100 text-gray-500 px-16 py-4 rounded-[1.5rem] font-black text-sm hover:bg-gray-200 transition-all">ปิดหน้าต่าง</button>
                        </div>
                    </div>
                </div>
            )}

            {/* APPROVE MODAL */}
            {isApproveModalOpen && approveDoc && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black">ตรวจสอบและลงนาม</h3>
                                <p className="text-[10px] opacity-70 font-bold uppercase tracking-[0.2em] mt-1">Digital Approval Gateway</p>
                            </div>
                            <button onClick={() => setIsApproveModalOpen(false)} className="hover:bg-white/20 rounded-full p-2 transition-colors"><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-10 overflow-y-auto space-y-8 flex-grow bg-gray-50/30">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5"><svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V7h2v2z"/></svg></div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">หัวข้อเรื่องที่เสนอ</label>
                                <h4 className="text-xl font-black text-navy leading-snug">{approveDoc.title}</h4>
                                <div className="flex gap-2 mt-4">
                                    <span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-indigo-100">{approveDoc.category}</span>
                                    <span className="bg-gray-50 text-gray-500 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-gray-200">{approveDoc.group}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ข้อความประกอบการพิจารณา</label>
                                <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} className="w-full border border-gray-200 rounded-[2rem] px-8 py-5 bg-white outline-none focus:ring-4 focus:ring-indigo-100 shadow-inner font-bold text-navy" />
                            </div>

                            {!isDirector && (
                                <div className="space-y-1 pt-2 relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ส่งพิจารณาต่อ (ลำดับถัดไป)</label>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            value={nextApproverSearch} 
                                            onFocus={() => setIsNextApproverDropdownOpen(true)}
                                            onChange={e => { setNextApproverSearch(e.target.value); setIsNextApproverDropdownOpen(true); }}
                                            placeholder="พิมพ์ชื่อเพื่อค้นหาผู้พิจารณาลำดับถัดไป..." 
                                            className="w-full border border-gray-200 rounded-[1.5rem] px-14 py-4 bg-white outline-none font-black text-navy shadow-sm focus:ring-4 focus:ring-indigo-100 transition-all" 
                                        />
                                        <svg className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        
                                        {isNextApproverDropdownOpen && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                                                {filteredNextApproverList.length > 0 ? filteredNextApproverList.map(h => (
                                                    <div key={h.id} onClick={() => { setNextApproverId(h.id); setNextApproverSearch(`${h.personnelTitle || ''}${h.personnelName || ''} (${h.position || ''})`); setIsNextApproverDropdownOpen(false); }} className="px-6 py-3 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 flex items-center gap-4 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{(h.personnelName || '?').charAt(0)}</div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-navy truncate text-sm">{(h.personnelTitle || '')}{(h.personnelName || '')}</p>
                                                            <p className="text-[10px] text-gray-400 truncate uppercase">{(h.position || '')}</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="p-10 text-center text-gray-300 italic text-sm font-bold">ไม่พบรายชื่อที่ต้องการ</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-bold italic ml-2 mt-1">* กรุณาค้นหาและเลือกรายชื่อผู้ที่จะตรวจลำดับต่อไป</p>
                                </div>
                            )}

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ลงลายมือชื่อดิจิทัล</label>
                                <div className="border-4 border-indigo-50 bg-white rounded-[2.5rem] h-48 relative overflow-hidden shadow-inner group">
                                    <canvas ref={canvasRef} width={600} height={192} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} className="w-full h-full cursor-pencil mix-blend-multiply" />
                                    <button type="button" onClick={clearCanvas} className="absolute bottom-6 right-6 text-[10px] text-red-500 font-black uppercase tracking-widest bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-red-100 opacity-0 group-hover:opacity-100 transition-all active:scale-95">ล้างลายเซ็น</button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-8">
                                <button type="button" onClick={() => processApproval('rejected')} className="flex-1 bg-white border-4 border-rose-500 text-rose-500 py-5 rounded-[2rem] font-black text-sm transition-all hover:bg-rose-50 active:scale-95 shadow-xl shadow-rose-500/10">ตีกลับแก้ไข</button>
                                <button type="button" onClick={() => processApproval('approved')} className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">อนุมัติและส่งต่อ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkflowPage;
