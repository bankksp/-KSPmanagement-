




import React, { useState, useMemo } from 'react';
import { ProjectProposal, Personnel, Settings, ProjectStatus, ProjectProcessStatus } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getFirstImageSource } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface BudgetPlanningPageProps {
    currentUser: Personnel;
    proposals: ProjectProposal[];
    personnel: Personnel[];
    settings: Settings;
    onSave: (project: ProjectProposal) => void;
    onDelete: (ids: number[]) => void;
    onUpdateSettings: (settings: Settings) => void;
    onUpdatePersonnel: (person: Personnel) => void;
    isSaving: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const BudgetPlanningPage: React.FC<BudgetPlanningPageProps> = ({
    currentUser, proposals, personnel, settings, onSave, onDelete, onUpdateSettings, onUpdatePersonnel, isSaving
}) => {
    const isAdmin = currentUser.role === 'admin';
    const isManager = (settings.projectManagerIds || []).includes(currentUser.id) || isAdmin;

    const [activeTab, setActiveTab] = useState<'stats' | 'my_projects' | 'approvals' | 'all_projects' | 'settings'>('stats');
    const [filterYear, setFilterYear] = useState<string>(settings.academicYears?.[0] || (new Date().getFullYear() + 543) + "");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<Partial<ProjectProposal>>({});
    const [isExportOpen, setIsExportOpen] = useState(false);
    
    // For All Projects Tab
    const [filterGroup, setFilterGroup] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Settings State
    const [newGroupName, setNewGroupName] = useState('');
    const [newYear, setNewYear] = useState('');

    // --- Stats Logic ---
    const stats = useMemo(() => {
        const yearProjects = proposals.filter(p => p.fiscalYear === filterYear);
        const total = yearProjects.length;
        const totalBudget = yearProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
        const completed = yearProjects.filter(p => p.processStatus === 'completed').length;
        const pending = yearProjects.filter(p => p.status === 'pending_approval').length;

        // Group Chart
        const groupDataMap: Record<string, number> = {};
        yearProjects.forEach(p => {
            groupDataMap[p.group] = (groupDataMap[p.group] || 0) + p.budget;
        });
        const groupData = Object.entries(groupDataMap).map(([name, value]) => ({ name, value }));

        // Status Chart
        const statusDataMap = {
            not_started: 0,
            in_progress: 0,
            completed: 0
        };
        yearProjects.filter(p => p.status === 'approved').forEach(p => {
            if (statusDataMap[p.processStatus] !== undefined) statusDataMap[p.processStatus]++;
        });
        const statusData = [
            { name: 'ยังไม่เริ่ม', value: statusDataMap.not_started, color: '#9CA3AF' },
            { name: 'กำลังดำเนินการ', value: statusDataMap.in_progress, color: '#3B82F6' },
            { name: 'เสร็จสิ้น', value: statusDataMap.completed, color: '#10B981' }
        ].filter(d => d.value > 0);

        return { total, totalBudget, completed, pending, groupData, statusData };
    }, [proposals, filterYear]);

    // --- Filtered Lists ---
    const myProjects = useMemo(() => {
        return proposals.filter(p => p.responsiblePersonId === currentUser.id).sort((a, b) => b.id - a.id);
    }, [proposals, currentUser.id]);

    const pendingApprovals = useMemo(() => {
        return proposals.filter(p => p.status === 'pending_approval').sort((a, b) => b.id - a.id);
    }, [proposals]);

    const allProjectsFiltered = useMemo(() => {
        return proposals.filter(p => {
            const matchYear = !filterYear || p.fiscalYear === filterYear;
            const matchGroup = !filterGroup || p.group === filterGroup;
            const matchStatus = !filterStatus || p.status === filterStatus;
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                p.responsiblePersonName.toLowerCase().includes(searchTerm.toLowerCase());
            return matchYear && matchGroup && matchStatus && matchSearch;
        }).sort((a, b) => b.id - a.id);
    }, [proposals, filterYear, filterGroup, filterStatus, searchTerm]);

    // --- Handlers ---

    const handleOpenModal = (project?: ProjectProposal) => {
        if (project) {
            setCurrentProject({ ...project });
        } else {
            setCurrentProject({
                name: '',
                fiscalYear: filterYear,
                group: settings.projectGroups?.[0] || '',
                budget: 0,
                responsiblePersonId: currentUser.id,
                responsiblePersonName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                status: 'pending_approval',
                processStatus: 'not_started',
                description: '',
                files: [],
                images: [],
                createdDate: new Date().toLocaleDateString('th-TH')
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveProject = (e: React.FormEvent) => {
        e.preventDefault();
        const projectToSave = {
            ...currentProject,
            id: currentProject.id || Date.now(),
            budget: Number(currentProject.budget),
            // Ensure array fields initialized
            files: currentProject.files || [],
            images: currentProject.images || []
        } as ProjectProposal;
        
        onSave(projectToSave);
        setIsModalOpen(false);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('ยืนยันการลบโครงการ?')) {
            onDelete([id]);
        }
    };

    const handleApprove = (id: number, approved: boolean) => {
        const project = proposals.find(p => p.id === id);
        if (!project) return;
        
        const updates: Partial<ProjectProposal> = {
            status: approved ? 'approved' : 'rejected',
            approverName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            approvedDate: new Date().toLocaleDateString('th-TH')
        };
        
        if (!approved) {
            const reason = prompt('ระบุเหตุผลที่ไม่อนุมัติ (ถ้ามี):');
            if (reason) updates.rejectReason = reason;
        }

        onSave({ ...project, ...updates });
    };

    const handleChangeProcessStatus = (project: ProjectProposal, status: ProjectProcessStatus) => {
        onSave({ ...project, processStatus: status });
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

    // --- Settings Handlers ---
    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            if (settings.projectGroups?.includes(newGroupName.trim())) {
                alert('มีกลุ่มงานนี้อยู่แล้ว');
                return;
            }
            const newGroups = [...(settings.projectGroups || []), newGroupName.trim()];
            onUpdateSettings({ ...settings, projectGroups: newGroups });
            setNewGroupName('');
        }
    };

    const handleRemoveGroup = (name: string) => {
        if (confirm(`ยืนยันการลบกลุ่มงาน "${name}"?`)) {
            const newGroups = (settings.projectGroups || []).filter(g => g !== name);
            onUpdateSettings({ ...settings, projectGroups: newGroups });
        }
    };

    const handleAddYear = () => {
        if (newYear.trim() && !settings.academicYears.includes(newYear.trim())) {
            const newYears = [...settings.academicYears, newYear.trim()].sort();
            onUpdateSettings({ ...settings, academicYears: newYears });
            setNewYear('');
        }
    };

    const handleToggleManager = (personId: number) => {
        const currentManagers = settings.projectManagerIds || [];
        let newManagers: number[];
        if (currentManagers.includes(personId)) {
            newManagers = currentManagers.filter(id => id !== personId);
        } else {
            newManagers = [...currentManagers, personId];
        }
        onUpdateSettings({ ...settings, projectManagerIds: newManagers });
    };

    // --- Export Mock ---
    const handleExport = (type: 'pdf' | 'doc' | 'xls') => {
        alert(`ระบบกำลังประมวลผลรายงานสถิติแบบ ${type.toUpperCase()} สำหรับปีงบประมาณ ${filterYear}`);
        setIsExportOpen(false);
    };

    // --- Helper Components ---
    const StatusBadge = ({ status }: { status: ProjectStatus }) => {
        switch (status) {
            case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">อนุมัติแล้ว</span>;
            case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">ไม่อนุมัติ</span>;
            default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">รออนุมัติ</span>;
        }
    };

    const ProcessStatusBadge = ({ status }: { status: ProjectProcessStatus }) => {
        switch (status) {
            case 'completed': return <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">ดำเนินการแล้ว</span>;
            case 'in_progress': return <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">กำลังดำเนินการ</span>;
            default: return <span className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-bold">ยังไม่ดำเนินการ</span>;
        }
    };

    // Toggle Switch Component
    const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled: boolean }) => (
        <button 
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${checked ? 'bg-primary-blue' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm ${checked ? 'right-1' : 'left-1'}`}></div>
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 items-center">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติ
                </button>
                <button onClick={() => setActiveTab('my_projects')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'my_projects' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    โครงการของฉัน
                </button>
                {isManager && (
                    <>
                        <button onClick={() => setActiveTab('approvals')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-orange-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            อนุมัติ ({pendingApprovals.length})
                        </button>
                        <button onClick={() => setActiveTab('all_projects')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'all_projects' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            จัดการโครงการ
                        </button>
                    </>
                )}
                {isAdmin && (
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'settings' ? 'bg-gray-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        ตั้งค่า
                    </button>
                )}
            </div>

            {/* TAB 1: STATS */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700">ปีงบประมาณ:</span>
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded-lg px-3 py-1 bg-gray-50 focus:ring-2 focus:ring-primary-blue">
                                {settings.academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <button 
                                onClick={() => setIsExportOpen(!isExportOpen)}
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Export
                                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {isExportOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-20 border border-gray-100 overflow-hidden">
                                    <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                                        <span className="text-red-500 font-bold">PDF</span> รายงาน PDF
                                    </button>
                                    <button onClick={() => handleExport('doc')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                                        <span className="text-blue-500 font-bold">DOC</span> ไฟล์ Word
                                    </button>
                                    <button onClick={() => handleExport('xls')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                                        <span className="text-green-500 font-bold">XLS</span> ไฟล์ Excel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm">จำนวนโครงการ</p>
                            <p className="text-3xl font-bold text-navy mt-1">{stats.total} <span className="text-sm font-normal text-gray-400">โครงการ</span></p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                            <p className="text-gray-500 text-sm">งบประมาณรวม</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalBudget.toLocaleString()} <span className="text-sm font-normal text-gray-400">บาท</span></p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                            <p className="text-gray-500 text-sm">ดำเนินการแล้วเสร็จ</p>
                            <p className="text-3xl font-bold text-purple-600 mt-1">{stats.completed} <span className="text-sm font-normal text-gray-400">โครงการ</span></p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500">
                            <p className="text-gray-500 text-sm">รออนุมัติ</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending} <span className="text-sm font-normal text-gray-400">โครงการ</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">งบประมาณตามกลุ่มงาน</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.groupData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" name="งบประมาณ" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สถานะการดำเนินงาน (เฉพาะที่อนุมัติ)</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {stats.statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: MY PROJECTS */}
            {activeTab === 'my_projects' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-navy">โครงการของฉัน</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            เสนอโครงการใหม่
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="p-3">ชื่อโครงการ</th>
                                    <th className="p-3">ปีงบฯ</th>
                                    <th className="p-3 text-right">งบประมาณ</th>
                                    <th className="p-3 text-center">สถานะอนุมัติ</th>
                                    <th className="p-3 text-center">สถานะดำเนินงาน</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {myProjects.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium text-navy">{p.name} <div className="text-xs text-gray-500">{p.group}</div></td>
                                        <td className="p-3">{p.fiscalYear}</td>
                                        <td className="p-3 text-right">{p.budget.toLocaleString()}</td>
                                        <td className="p-3 text-center"><StatusBadge status={p.status} /></td>
                                        <td className="p-3 text-center">
                                            {p.status === 'approved' ? (
                                                <select 
                                                    value={p.processStatus} 
                                                    onChange={(e) => handleChangeProcessStatus(p, e.target.value as ProjectProcessStatus)}
                                                    className={`border rounded px-2 py-1 text-xs font-bold ${p.processStatus === 'completed' ? 'text-green-600 border-green-200 bg-green-50' : p.processStatus === 'in_progress' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-500'}`}
                                                >
                                                    <option value="not_started">ยังไม่ดำเนินการ</option>
                                                    <option value="in_progress">ระหว่างดำเนินการ</option>
                                                    <option value="completed">ดำเนินการแล้ว</option>
                                                </select>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleOpenModal(p)} className="text-amber-500 hover:text-amber-700 mx-1">แก้ไข</button>
                                            <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 mx-1">ลบ</button>
                                        </td>
                                    </tr>
                                ))}
                                {myProjects.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">ยังไม่มีโครงการ</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: APPROVALS */}
            {activeTab === 'approvals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {pendingApprovals.map(p => (
                        <div key={p.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">{p.fiscalYear}</span>
                                <span className="text-gray-500 text-xs">{p.createdDate}</span>
                            </div>
                            <h3 className="text-lg font-bold text-navy mb-2">{p.name}</h3>
                            <p className="text-sm text-gray-600 mb-4 flex-grow">{p.description || 'ไม่มีรายละเอียด'}</p>
                            
                            <div className="space-y-2 text-sm text-gray-700 mb-6">
                                <div className="flex justify-between"><span>ผู้รับผิดชอบ:</span> <span className="font-semibold">{p.responsiblePersonName}</span></div>
                                <div className="flex justify-between"><span>กลุ่มงาน:</span> <span className="font-semibold">{p.group}</span></div>
                                <div className="flex justify-between"><span>งบประมาณ:</span> <span className="font-bold text-green-600">{p.budget.toLocaleString()} บ.</span></div>
                            </div>

                            <div className="flex gap-3 mt-auto">
                                <button onClick={() => handleApprove(p.id, true)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold shadow transition-colors">อนุมัติ</button>
                                <button onClick={() => handleApprove(p.id, false)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 py-2 rounded-lg font-bold transition-colors">ไม่อนุมัติ</button>
                            </div>
                        </div>
                    ))}
                    {pendingApprovals.length === 0 && (
                        <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-xl shadow">ไม่มีโครงการรออนุมัติ</div>
                    )}
                </div>
            )}

            {/* TAB 4: ALL PROJECTS (Admin) */}
            {activeTab === 'all_projects' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <h2 className="text-xl font-bold text-navy mb-4">จัดการโครงการทั้งหมด</h2>
                    
                    <div className="flex flex-wrap gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded px-3 py-2 text-sm">
                            <option value="">ทุกปีงบฯ</option>
                            {settings.academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="border rounded px-3 py-2 text-sm">
                            <option value="">ทุกกลุ่มงาน</option>
                            {settings.projectGroups?.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded px-3 py-2 text-sm">
                            <option value="">ทุกสถานะอนุมัติ</option>
                            <option value="approved">อนุมัติแล้ว</option>
                            <option value="pending_approval">รออนุมัติ</option>
                            <option value="rejected">ไม่อนุมัติ</option>
                        </select>
                        <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded px-3 py-2 text-sm flex-grow" />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-navy text-white">
                                <tr>
                                    <th className="p-3">โครงการ</th>
                                    <th className="p-3">ผู้รับผิดชอบ</th>
                                    <th className="p-3 text-right">งบประมาณ</th>
                                    <th className="p-3 text-center">สถานะอนุมัติ</th>
                                    <th className="p-3 text-center">สถานะงาน</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {allProjectsFiltered.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="p-3">
                                            <div className="font-bold">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.group} | {p.fiscalYear}</div>
                                        </td>
                                        <td className="p-3">{p.responsiblePersonName}</td>
                                        <td className="p-3 text-right">{p.budget.toLocaleString()}</td>
                                        <td className="p-3 text-center"><StatusBadge status={p.status} /></td>
                                        <td className="p-3 text-center"><ProcessStatusBadge status={p.processStatus} /></td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleOpenModal(p)} className="text-blue-600 hover:underline text-xs mr-2">แก้ไข</button>
                                            <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">ลบ</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 5: SETTINGS (Admin) */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow space-y-6">
                        <h3 className="font-bold text-navy text-lg border-b pb-2 text-blue-800">ตั้งค่าทั่วไป</h3>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">ปีงบประมาณ</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {settings.academicYears.map(y => (
                                    <span key={y} className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-700 font-medium">{y}</span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="ระบุปี พ.ศ." className="border rounded px-3 py-1.5 text-sm flex-grow" />
                                <button type="button" onClick={handleAddYear} disabled={isSaving} className="bg-primary-blue text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50">เพิ่ม</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">กลุ่มงานยุทธศาสตร์</label>
                            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                                {(settings.projectGroups || []).map(g => (
                                    <div key={g} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                        <span className="text-sm font-medium text-gray-700">{g}</span>
                                        <button type="button" onClick={() => handleRemoveGroup(g)} disabled={isSaving} className="text-red-500 text-xs hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded hover:bg-red-100">ลบ</button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="ชื่อกลุ่มงานใหม่..." className="border rounded px-3 py-1.5 text-sm flex-grow" />
                                <button type="button" onClick={handleAddGroup} disabled={isSaving} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50">+ เพิ่มกลุ่มงาน</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow flex flex-col h-[600px]">
                        <h3 className="font-bold text-navy text-lg border-b pb-2 mb-4 text-blue-800">แต่งตั้งผู้ดูแลระบบแผนงาน</h3>
                        <div className="overflow-y-auto flex-grow space-y-2 pr-2">
                            {personnel.map(p => {
                                const isProjMgr = (settings.projectManagerIds || []).includes(p.id);
                                return (
                                    <div key={p.id} className={`flex items-center justify-between p-3 border rounded transition-colors ${isProjMgr ? 'bg-purple-50 border-purple-100' : 'hover:bg-gray-50 border-gray-100'}`}>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{p.personnelTitle}{p.personnelName}</p>
                                            <p className="text-xs text-gray-500">{p.position}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isProjMgr ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {isProjMgr ? 'ผู้ดูแล' : 'ครู'}
                                            </span>
                                            <ToggleSwitch 
                                                checked={isProjMgr} 
                                                onChange={() => handleToggleManager(p.id)}
                                                disabled={isSaving}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentProject.id ? 'แก้ไขโครงการ' : 'เสนอโครงการใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSaveProject} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ปีงบประมาณ</label>
                                    <select 
                                        value={currentProject.fiscalYear} 
                                        onChange={e => setCurrentProject({...currentProject, fiscalYear: e.target.value})} 
                                        className="w-full border rounded px-3 py-2"
                                    >
                                        {settings.academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">กลุ่มงาน</label>
                                    <select 
                                        value={currentProject.group} 
                                        onChange={e => setCurrentProject({...currentProject, group: e.target.value})} 
                                        className="w-full border rounded px-3 py-2"
                                        required
                                    >
                                        <option value="">-- เลือกกลุ่มงาน --</option>
                                        {settings.projectGroups?.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อโครงการ</label>
                                <input 
                                    type="text" 
                                    value={currentProject.name} 
                                    onChange={e => setCurrentProject({...currentProject, name: e.target.value})} 
                                    className="w-full border rounded px-3 py-2" 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">งบประมาณ (บาท)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={currentProject.budget} 
                                    onChange={e => setCurrentProject({...currentProject, budget: Number(e.target.value)})} 
                                    className="w-full border rounded px-3 py-2" 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียดสังเขป</label>
                                <textarea 
                                    rows={3} 
                                    value={currentProject.description} 
                                    onChange={e => setCurrentProject({...currentProject, description: e.target.value})} 
                                    className="w-full border rounded px-3 py-2"
                                ></textarea>
                            </div>

                            <div className="border-t pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">เอกสารแนบ (PDF/Doc/Excel)</label>
                                <input type="file" multiple onChange={e => handleFileChange(e, 'files')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                <div className="mt-2 space-y-1">
                                    {(currentProject.files || []).map((f, i) => (
                                        <div key={i} className="flex items-center text-xs bg-gray-50 p-1 rounded">
                                            <span className="truncate flex-grow">{f instanceof File ? f.name : 'File'}</span>
                                            <button type="button" onClick={() => removeFile(i, 'files')} className="text-red-500 ml-2">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">รูปภาพกิจกรรม (ไม่เกิน 10 รูป)</label>
                                <input type="file" multiple accept="image/*" onChange={e => handleFileChange(e, 'images')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                                <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                                    {(currentProject.images || []).map((img, i) => (
                                        <div key={i} className="relative w-16 h-16 flex-shrink-0">
                                            <img src={img instanceof File ? URL.createObjectURL(img) : getDirectDriveImageSrc(img)} className="w-full h-full object-cover rounded border" />
                                            <button type="button" onClick={() => removeFile(i, 'images')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg shadow disabled:opacity-50">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetPlanningPage;
