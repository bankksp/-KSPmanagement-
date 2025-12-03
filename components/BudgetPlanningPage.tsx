
import React, { useState, useMemo } from 'react';
import { ProjectProposal, Personnel, Settings, ProjectStatus, ProjectProcessStatus } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getFirstImageSource } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface BudgetPlanningPageProps {
    currentUser: Personnel;
    proposals: ProjectProposal[];
    personnel: Personnel[];
    settings: Settings;
    onSave: (proposal: ProjectProposal) => void;
    onDelete: (ids: number[]) => void;
    onUpdateSettings: (settings: Settings) => void;
    onUpdatePersonnel: (person: Personnel) => void;
    isSaving: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const parseBudget = (val: string | number | undefined): number => {
    if (!val) return 0;
    return Number(val);
};

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
    switch (status) {
        case 'approved': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">อนุมัติแล้ว</span>;
        case 'rejected': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">ไม่อนุมัติ</span>;
        default: return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">รออนุมัติ</span>;
    }
};

const ProcessStatusBadge = ({ status }: { status: ProjectProcessStatus }) => {
    switch (status) {
        case 'in_progress': return <span className="text-blue-600 text-xs font-bold">กำลังดำเนินงาน</span>;
        case 'completed': return <span className="text-green-600 text-xs font-bold">เสร็จสิ้น</span>;
        default: return <span className="text-gray-500 text-xs font-bold">ยังไม่เริ่ม</span>;
    }
};

const FileLink: React.FC<{ file: File | string }> = ({ file }) => {
    const url = file instanceof File ? URL.createObjectURL(file) : getDirectDriveImageSrc(file);
    const name = file instanceof File ? file.name : 'เอกสารแนบ';
    return (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            {name.length > 15 ? name.substring(0, 15) + '...' : name}
        </a>
    );
};

const BudgetPlanningPage: React.FC<BudgetPlanningPageProps> = ({
    currentUser, proposals, personnel, settings, onSave, onDelete, onUpdateSettings, isSaving
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'settings' | 'approval'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<Partial<ProjectProposal>>({});
    const [viewProject, setViewProject] = useState<ProjectProposal | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Settings State
    const [newGroup, setNewGroup] = useState('');

    const isAdmin = currentUser.role === 'admin';

    // --- Stats ---
    const stats = useMemo(() => {
        const total = proposals.length;
        const totalBudget = proposals.reduce((sum, p) => sum + parseBudget(p.budget), 0);
        const approvedBudget = proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + parseBudget(p.budget), 0);
        
        const statusCounts = { pending: 0, approved: 0, rejected: 0 };
        proposals.forEach(p => {
            if (p.status === 'pending_approval') statusCounts.pending++;
            else if (p.status === 'approved') statusCounts.approved++;
            else if (p.status === 'rejected') statusCounts.rejected++;
        });

        const statusData = [
            { name: 'รออนุมัติ', value: statusCounts.pending, color: '#F59E0B' },
            { name: 'อนุมัติ', value: statusCounts.approved, color: '#10B981' },
            { name: 'ไม่อนุมัติ', value: statusCounts.rejected, color: '#EF4444' },
        ].filter(d => d.value > 0);

        // Group Budget Data
        const groupBudgets: Record<string, number> = {};
        proposals.forEach(p => {
            const g = p.group || 'ไม่ระบุ';
            groupBudgets[g] = (groupBudgets[g] || 0) + parseBudget(p.budget);
        });
        const groupData = Object.entries(groupBudgets).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        return { total, totalBudget, approvedBudget, statusData, groupData, pendingCount: statusCounts.pending };
    }, [proposals]);

    // --- Filtered Data ---
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  p.responsiblePersonName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !filterStatus || p.status === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => b.id - a.id);
    }, [proposals, searchTerm, filterStatus]);

    const pendingProposals = useMemo(() => {
        return proposals.filter(p => p.status === 'pending_approval').sort((a, b) => b.id - a.id);
    }, [proposals]);

    // --- Handlers ---
    const handleOpenModal = (project?: ProjectProposal) => {
        if (project) {
            setCurrentProject({ ...project });
        } else {
            setCurrentProject({
                fiscalYear: (new Date().getFullYear() + 543).toString(),
                name: '',
                group: settings.projectGroups?.[0] || '',
                budget: 0,
                responsiblePersonId: currentUser.id,
                responsiblePersonName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                status: 'pending_approval',
                processStatus: 'not_started',
                description: '',
                files: [],
                images: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const projectToSave = {
            ...currentProject,
            id: currentProject.id || Date.now(),
            budget: Number(currentProject.budget),
            createdDate: currentProject.createdDate || new Date().toLocaleDateString('th-TH')
        } as ProjectProposal;
        onSave(projectToSave);
        setIsModalOpen(false);
    };

    const handleQuickAction = (proposal: ProjectProposal, status: ProjectStatus) => {
        const actionText = status === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ';
        if (window.confirm(`ต้องการ${actionText}โครงการ "${proposal.name}" ใช่หรือไม่?`)) {
            const updatedProposal: ProjectProposal = {
                ...proposal,
                status: status,
                approverName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                approvedDate: new Date().toLocaleDateString('th-TH')
            };
            onSave(updatedProposal);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size > 0 && window.confirm(`ยืนยันการลบ ${selectedIds.size} รายการ?`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'files' | 'images') => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setCurrentProject(prev => ({
                ...prev,
                [field]: [...(prev[field] || []), ...newFiles]
            }));
        }
    };

    const removeFile = (index: number, field: 'files' | 'images') => {
        setCurrentProject(prev => ({
            ...prev,
            [field]: (prev[field] || []).filter((_, i) => i !== index)
        }));
    };

    // Settings Handlers
    const addGroup = () => {
        if (newGroup && !settings.projectGroups?.includes(newGroup)) {
            const updatedGroups = [...(settings.projectGroups || []), newGroup];
            onUpdateSettings({ ...settings, projectGroups: updatedGroups });
            setNewGroup('');
        }
    };

    const removeGroup = (group: string) => {
        if (window.confirm(`ต้องการลบกลุ่มงาน "${group}" หรือไม่?`)) {
            const updatedGroups = (settings.projectGroups || []).filter(g => g !== group);
            onUpdateSettings({ ...settings, projectGroups: updatedGroups });
        }
    };

    // --- Render View Modal ---
    const renderViewModal = () => {
        if (!isViewModalOpen || !viewProject) return null; 
        const images = safeParseArray(viewProject.images);
        const files = safeParseArray(viewProject.files);

        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsViewModalOpen(false)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-navy">{viewProject.name}</h2>
                            <p className="text-gray-500 text-sm mt-1">ปีงบประมาณ {viewProject.fiscalYear} • กลุ่มงาน{viewProject.group}</p>
                        </div>
                        <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-6">
                        {/* Status Cards */}
                        <div className="flex gap-4 flex-wrap">
                            <div className="flex-1 min-w-[150px] bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <span className="text-xs text-gray-500 font-bold uppercase">สถานะอนุมัติ</span>
                                <div className="mt-1"><StatusBadge status={viewProject.status} /></div>
                            </div>
                            <div className="flex-1 min-w-[150px] bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <span className="text-xs text-gray-500 font-bold uppercase">สถานะดำเนินงาน</span>
                                <div className="mt-1"><ProcessStatusBadge status={viewProject.processStatus} /></div>
                            </div>
                            <div className="flex-1 min-w-[150px] bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <span className="text-xs text-gray-500 font-bold uppercase">งบประมาณ</span>
                                <div className="mt-1 text-lg font-bold text-green-600">{parseBudget(viewProject.budget).toLocaleString()} บาท</div>
                            </div>
                        </div>
                        
                        {/* Quick Actions for Admin in View Modal */}
                        {isAdmin && viewProject.status === 'pending_approval' && (
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => { handleQuickAction(viewProject, 'approved'); setIsViewModalOpen(false); }}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 shadow-sm"
                                >
                                    อนุมัติโครงการ
                                </button>
                                <button 
                                    onClick={() => { handleQuickAction(viewProject, 'rejected'); setIsViewModalOpen(false); }}
                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 shadow-sm"
                                >
                                    ไม่อนุมัติ
                                </button>
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-gray-700">ผู้รับผิดชอบโครงการ</label>
                                <p className="text-gray-900">{viewProject.responsiblePersonName}</p>
                            </div>
                            {viewProject.status !== 'pending_approval' && (
                                <div>
                                    <label className="text-sm font-bold text-gray-700">ผลการพิจารณา</label>
                                    <p className="text-gray-900">{viewProject.approverName ? `โดย ${viewProject.approverName}` : '-'}</p>
                                    <p className="text-xs text-gray-500">{viewProject.approvedDate}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700">รายละเอียดโครงการ</label>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded border mt-1 whitespace-pre-wrap">{viewProject.description || '-'}</p>
                        </div>

                        {/* Files */}
                        {files.length > 0 && (
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">เอกสารแนบ</label>
                                <div className="flex flex-wrap gap-2">
                                    {files.map((f, i) => <FileLink key={i} file={f} />)}
                                </div>
                            </div>
                        )}

                        {/* Images Grid */}
                        {images.length > 0 && (
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">รูปภาพกิจกรรม</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {images.map((img, idx) => (
                                        <a key={idx} href={getDirectDriveImageSrc(img)} target="_blank" rel="noreferrer" className="block relative aspect-square group overflow-hidden rounded-lg border">
                                            <img src={getDirectDriveImageSrc(img)} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Activity" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400">ปิด</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'dashboard' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600'}`}>แดชบอร์ด</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600'}`}>โครงการ</button>
                {isAdmin && (
                    <button 
                        onClick={() => setActiveTab('approval')} 
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'approval' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        พิจารณาอนุมัติ
                        {stats.pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm animate-pulse">{stats.pendingCount}</span>
                        )}
                    </button>
                )}
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'settings' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600'}`}>ตั้งค่า</button>
            </div>

            {/* DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm">จำนวนโครงการ</p>
                            <p className="text-3xl font-bold text-navy">{stats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
                            <p className="text-gray-500 text-sm">งบประมาณอนุมัติ</p>
                            <p className="text-3xl font-bold text-green-600">{stats.approvedBudget.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-purple-500">
                            <p className="text-gray-500 text-sm">งบประมาณขอตั้งรวม</p>
                            <p className="text-3xl font-bold text-purple-600">{stats.totalBudget.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สถานะโครงการ</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">งบประมาณแยกตามกลุ่มงาน</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.groupData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-navy">โครงการทั้งหมด</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            เสนอโครงการ
                        </button>
                    </div>

                    <div className="flex gap-4 mb-4">
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อโครงการ, ผู้รับผิดชอบ..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border rounded-lg px-4 py-2 flex-grow"
                        />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-4 py-2">
                            <option value="">ทุกสถานะ</option>
                            <option value="pending_approval">รออนุมัติ</option>
                            <option value="approved">อนุมัติ</option>
                            <option value="rejected">ไม่อนุมัติ</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="p-3">ปีงบฯ</th>
                                    <th className="p-3">ชื่อโครงการ</th>
                                    <th className="p-3">กลุ่มงาน</th>
                                    <th className="p-3 text-right">งบประมาณ</th>
                                    <th className="p-3 text-center">สถานะ</th>
                                    <th className="p-3 text-center">ดำเนินงาน</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProposals.map(p => (
                                    <tr key={p.id} className="border-b hover:bg-blue-50">
                                        <td className="p-3">{p.fiscalYear}</td>
                                        <td className="p-3 font-medium text-navy">{p.name}</td>
                                        <td className="p-3 text-gray-600">{p.group}</td>
                                        <td className="p-3 text-right">{parseBudget(p.budget).toLocaleString()}</td>
                                        <td className="p-3 text-center"><StatusBadge status={p.status} /></td>
                                        <td className="p-3 text-center"><ProcessStatusBadge status={p.processStatus} /></td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => { setViewProject(p); setIsViewModalOpen(true); }} className="p-1.5 bg-sky-100 text-sky-700 rounded hover:bg-sky-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => handleOpenModal(p)} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={() => { if(window.confirm('ลบ?')) onDelete([p.id]) }} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* APPROVAL TAB (ADMIN) */}
            {activeTab === 'approval' && isAdmin && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <h2 className="text-xl font-bold text-navy mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        รายการรอการอนุมัติ ({pendingProposals.length})
                    </h2>

                    <div className="flex flex-col gap-4">
                        {pendingProposals.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500 border border-dashed border-gray-300">
                                ไม่มีโครงการที่รออนุมัติในขณะนี้
                            </div>
                        ) : (
                            pendingProposals.map(p => (
                                <div key={p.id} className="bg-white border border-orange-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-all">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-bold">รออนุมัติ</span>
                                                <span className="text-xs text-gray-500">{p.createdDate}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-navy">{p.name}</h3>
                                            <p className="text-sm text-gray-600">ผู้เสนอ: {p.responsiblePersonName}</p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                งบประมาณ: <span className="font-bold text-green-600">{parseBudget(p.budget).toLocaleString()} บาท</span> • กลุ่มงาน: {p.group}
                                            </p>
                                            {p.description && <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded line-clamp-2">{p.description}</p>}
                                        </div>
                                        <div className="flex flex-col gap-2 justify-center min-w-[120px]">
                                            <button 
                                                onClick={() => { setViewProject(p); setIsViewModalOpen(true); }}
                                                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                ดูข้อมูล
                                            </button>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleQuickAction(p, 'approved')}
                                                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-green-700 shadow-sm"
                                                >
                                                    อนุมัติ
                                                </button>
                                                <button 
                                                    onClick={() => handleQuickAction(p, 'rejected')}
                                                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm"
                                                >
                                                    ไม่อนุมัติ
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in max-w-2xl mx-auto">
                    <h2 className="text-xl font-bold text-navy mb-4">ตั้งค่าระบบแผนงาน</h2>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">กลุ่มงาน / ยุทธศาสตร์</label>
                        <div className="flex gap-2 mb-3">
                            <input type="text" value={newGroup} onChange={e => setNewGroup(e.target.value)} className="border rounded px-3 py-2 flex-grow" placeholder="ชื่อกลุ่มงานใหม่..." />
                            <button onClick={addGroup} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">เพิ่ม</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(settings.projectGroups || []).map(group => (
                                <span key={group} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    {group}
                                    <button onClick={() => removeGroup(group)} className="text-red-500 hover:text-red-700">&times;</button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentProject.id ? 'แก้ไขโครงการ' : 'เสนอโครงการใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อโครงการ</label>
                                    <input type="text" required value={currentProject.name} onChange={e => setCurrentProject({...currentProject, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ปีงบประมาณ</label>
                                    <input type="text" required value={currentProject.fiscalYear} onChange={e => setCurrentProject({...currentProject, fiscalYear: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">กลุ่มงาน</label>
                                    <select value={currentProject.group} onChange={e => setCurrentProject({...currentProject, group: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                                        <option value="">-- เลือกกลุ่มงาน --</option>
                                        {(settings.projectGroups || []).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">งบประมาณ (บาท)</label>
                                    <input type="number" min="0" value={currentProject.budget} onChange={e => setCurrentProject({...currentProject, budget: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียดโครงการ</label>
                                <textarea rows={4} value={currentProject.description} onChange={e => setCurrentProject({...currentProject, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="หลักการและเหตุผล, วัตถุประสงค์..."></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">แนบไฟล์โครงการ (PDF, Doc)</label>
                                    <input type="file" multiple accept=".pdf,.doc,.docx" onChange={e => handleFileChange(e, 'files')} className="w-full text-sm" />
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {(currentProject.files || []).map((f, i) => (
                                            <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                                {f instanceof File ? f.name : 'ไฟล์แนบ'}
                                                <button type="button" onClick={() => removeFile(i, 'files')} className="text-red-500 font-bold">&times;</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพกิจกรรม</label>
                                    <input type="file" multiple accept="image/*" onChange={e => handleFileChange(e, 'images')} className="w-full text-sm" />
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {(currentProject.images || []).map((f, i) => (
                                            <div key={i} className="relative w-10 h-10 border rounded overflow-hidden">
                                                <img src={f instanceof File ? URL.createObjectURL(f) : getDirectDriveImageSrc(f)} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeFile(i, 'images')} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-xs">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Admin Section */}
                            {isAdmin && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">ส่วนสำหรับผู้ดูแลระบบ</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">สถานะอนุมัติ</label>
                                            <select value={currentProject.status} onChange={e => setCurrentProject({...currentProject, status: e.target.value as ProjectStatus})} className="w-full border rounded px-2 py-1 text-sm">
                                                <option value="pending_approval">รออนุมัติ</option>
                                                <option value="approved">อนุมัติ</option>
                                                <option value="rejected">ไม่อนุมัติ</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">สถานะดำเนินงาน</label>
                                            <select value={currentProject.processStatus} onChange={e => setCurrentProject({...currentProject, processStatus: e.target.value as ProjectProcessStatus})} className="w-full border rounded px-2 py-1 text-sm">
                                                <option value="not_started">ยังไม่เริ่ม</option>
                                                <option value="in_progress">กำลังดำเนินงาน</option>
                                                <option value="completed">เสร็จสิ้น</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {renderViewModal()}
        </div>
    );
};

export default BudgetPlanningPage;
