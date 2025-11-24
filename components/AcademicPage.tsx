
import React, { useState, useMemo } from 'react';
import { AcademicPlan, Personnel, PlanStatus } from '../types';
import { LEARNING_AREAS } from '../constants';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { safeParseArray } from '../utils';

interface AcademicPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    plans: AcademicPlan[];
    onSavePlan: (plan: AcademicPlan) => void;
    onUpdateStatus: (id: number, status: PlanStatus, comment?: string) => void;
    isSaving: boolean;
}

const AcademicPage: React.FC<AcademicPageProps> = ({ 
    currentUser, personnel, plans, onSavePlan, onUpdateStatus, isSaving 
}) => {
    const [activeTab, setActiveTab] = useState<'submit' | 'stats' | 'approval'>('submit');
    
    // Check roles
    const canApprove = currentUser.role === 'admin' || currentUser.role === 'pro';

    // --- Submission Form State ---
    const [formData, setFormData] = useState<Partial<AcademicPlan>>({
        learningArea: '',
        teacherId: currentUser.id,
        subjectCode: '',
        subjectName: '',
        additionalLink: '',
    });
    const [structureFile, setStructureFile] = useState<File[]>([]);
    const [planFile, setPlanFile] = useState<File[]>([]);

    // --- Filter State for Approval ---
    const [filterTeacher, setFilterTeacher] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    // --- Computed Data ---
    const myPlans = useMemo(() => plans.filter(p => p.teacherId === currentUser.id).sort((a, b) => b.id - a.id), [plans, currentUser.id]);
    
    // Sort plans for approval: Pending first, then by ID descending
    const allPlansSorted = useMemo(() => {
        return [...plans].sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return b.id - a.id;
        });
    }, [plans]);

    const filteredPlans = useMemo(() => {
        return allPlansSorted.filter(p => {
            const teacherMatch = p.teacherName.toLowerCase().includes(filterTeacher.toLowerCase());
            const subjectMatch = p.subjectName.toLowerCase().includes(filterSubject.toLowerCase()) || 
                                 p.subjectCode.toLowerCase().includes(filterSubject.toLowerCase());
            return teacherMatch && subjectMatch;
        });
    }, [allPlansSorted, filterTeacher, filterSubject]);

    // Statistics
    const stats = useMemo(() => {
        const teacherIds = new Set(plans.map(p => p.teacherId));
        const totalApproved = plans.filter(p => p.status === 'approved').length;
        
        // Group by Learning Area
        const areaStats: Record<string, number> = {};
        LEARNING_AREAS.forEach(area => areaStats[area] = 0);
        plans.forEach(p => {
            if (areaStats[p.learningArea] !== undefined) {
                areaStats[p.learningArea]++;
            }
        });

        const chartData = Object.entries(areaStats)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));

        return {
            teachersCount: teacherIds.size,
            totalPlans: plans.length,
            totalApproved,
            chartData
        };
    }, [plans]);

    // --- Handlers ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'structure' | 'plan') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                alert('กรุณาอัปโหลดไฟล์ PDF เท่านั้น');
                return;
            }
            if (type === 'structure') setStructureFile([file]);
            else setPlanFile([file]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Find teacher info (in case admin submits for someone else, though currently UI defaults to self)
        const teacher = personnel.find(p => p.id === Number(formData.teacherId)) || currentUser;

        const newPlan: AcademicPlan = {
            id: Date.now(),
            date: new Date().toLocaleDateString('th-TH'),
            teacherId: teacher.id,
            teacherName: `${teacher.personnelTitle}${teacher.personnelName}`,
            learningArea: formData.learningArea || '',
            subjectCode: formData.subjectCode || '',
            subjectName: formData.subjectName || '',
            additionalLink: formData.additionalLink || '',
            status: 'pending',
            courseStructureFile: structureFile,
            lessonPlanFile: planFile,
        };

        onSavePlan(newPlan);
        
        // Reset form
        setFormData({
            learningArea: '',
            teacherId: currentUser.id,
            subjectCode: '',
            subjectName: '',
            additionalLink: '',
        });
        setStructureFile([]);
        setPlanFile([]);
        alert('ส่งแผนการสอนเรียบร้อยแล้ว');
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

    // Render Logic for "Latest" Badge
    const isLatest = (plan: AcademicPlan) => {
        // Find all plans for this subject and teacher
        const sameSubjectPlans = plans.filter(p => 
            p.teacherId === plan.teacherId && 
            p.subjectCode === plan.subjectCode
        );
        // Sort by ID descending
        sameSubjectPlans.sort((a, b) => b.id - a.id);
        // Check if current plan is the first one
        return sameSubjectPlans.length > 0 && sameSubjectPlans[0].id === plan.id;
    };

    const FileLink: React.FC<{ files?: (File|string)[], label: string }> = ({ files, label }) => {
        const safe = safeParseArray(files);
        if (!safe || safe.length === 0) return <span className="text-gray-400 text-xs">ไม่มีไฟล์</span>;
        
        // If it's a File object (local preview before refresh) or URL string
        let url = '';
        
        if (safe[0] instanceof File) {
            url = URL.createObjectURL(safe[0]);
        } else if (typeof safe[0] === 'string') {
            url = safe[0]; // Assuming it's a viewable URL
        }

        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-blue hover:underline text-xs bg-blue-50 px-2 py-1.5 rounded border border-blue-100 mb-1 mr-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                {label}
            </a>
        );
    };

    const StatusBadge: React.FC<{ status: PlanStatus, comment?: string }> = ({ status, comment }) => {
        if (status === 'approved') return (
            <div className="flex flex-col items-start gap-1">
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> อนุมัติแล้ว
                </span>
            </div>
        );
        if (status === 'pending') return (
             <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> รอตรวจ
            </span>
        );
        if (status === 'needs_edit') return (
            <div className="flex flex-col items-start gap-1">
                 <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> รอแก้ไข
                </span>
                {comment && <span className="text-red-500 text-xs break-words max-w-[150px]">"{comment}"</span>}
            </div>
        );
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Header Tabs */}
            <div className="flex flex-wrap justify-center gap-2 bg-white p-2 rounded-xl shadow-sm mb-6">
                <button
                    onClick={() => setActiveTab('submit')}
                    className={`flex items-center gap-2 px-3 md:px-6 py-2 rounded-lg font-bold text-sm md:text-base transition-all ${activeTab === 'submit' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    ส่งงาน
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-3 md:px-6 py-2 rounded-lg font-bold text-sm md:text-base transition-all ${activeTab === 'stats' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติ
                </button>
                {canApprove && (
                    <button
                        onClick={() => setActiveTab('approval')}
                        className={`flex items-center gap-2 px-3 md:px-6 py-2 rounded-lg font-bold text-sm md:text-base transition-all ${activeTab === 'approval' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        ผู้บริหาร
                    </button>
                )}
            </div>

            {/* --- TAB 1: SUBMISSION FORM --- */}
            {activeTab === 'submit' && (
                <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                    <h2 className="text-xl font-bold text-primary-blue mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        ส่งแผนการสอน
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">1. เลือกกลุ่มสาระ</label>
                                <select 
                                    value={formData.learningArea} 
                                    onChange={(e) => setFormData(prev => ({...prev, learningArea: e.target.value}))}
                                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-blue focus:bg-white text-sm md:text-base"
                                    required
                                >
                                    <option value="" disabled>เลือกกลุ่มสาระ...</option>
                                    {LEARNING_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">2. เลือกชื่อ-นามสกุล</label>
                                <select 
                                    value={formData.teacherId} 
                                    onChange={(e) => setFormData(prev => ({...prev, teacherId: Number(e.target.value)}))}
                                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-blue focus:bg-white text-sm md:text-base"
                                    required
                                >
                                    {personnel.map(p => (
                                        <option key={p.id} value={p.id}>{p.personnelTitle}{p.personnelName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสวิชา</label>
                                <input 
                                    type="text" 
                                    value={formData.subjectCode}
                                    onChange={(e) => setFormData(prev => ({...prev, subjectCode: e.target.value}))}
                                    className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue text-sm md:text-base"
                                    placeholder="เช่น ว11101"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อวิชา</label>
                                <input 
                                    type="text" 
                                    value={formData.subjectName}
                                    onChange={(e) => setFormData(prev => ({...prev, subjectName: e.target.value}))}
                                    className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue text-sm md:text-base"
                                    placeholder="เช่น วิทยาการคำนวณ"
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-red-500 mb-3 flex items-center gap-1 text-sm md:text-base">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                แนบไฟล์ (.pdf เท่านั้น)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">โครงสร้างและคำอธิบายรายวิชา</label>
                                    <div className="flex items-center">
                                        <label className="cursor-pointer bg-white border border-gray-300 rounded-l-lg px-3 py-2 md:px-4 hover:bg-gray-50 text-sm font-medium text-gray-700 whitespace-nowrap">
                                            เลือกไฟล์
                                            <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e, 'structure')} />
                                        </label>
                                        <div className="bg-gray-100 border-y border-r border-gray-300 rounded-r-lg px-3 py-2 md:px-4 flex-grow text-xs md:text-sm text-gray-500 truncate">
                                            {structureFile.length > 0 ? structureFile[0].name : 'ไม่ได้เลือกไฟล์ใด'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">แผนการจัดการเรียนรู้</label>
                                    <div className="flex items-center">
                                        <label className="cursor-pointer bg-white border border-gray-300 rounded-l-lg px-3 py-2 md:px-4 hover:bg-gray-50 text-sm font-medium text-gray-700 whitespace-nowrap">
                                            เลือกไฟล์
                                            <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e, 'plan')} />
                                        </label>
                                        <div className="bg-gray-100 border-y border-r border-gray-300 rounded-r-lg px-3 py-2 md:px-4 flex-grow text-xs md:text-sm text-gray-500 truncate">
                                            {planFile.length > 0 ? planFile[0].name : 'ไม่ได้เลือกไฟล์ใด'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ลิงก์เพิ่มเติม (ถ้ามี)</label>
                            <input 
                                type="url" 
                                value={formData.additionalLink}
                                onChange={(e) => setFormData(prev => ({...prev, additionalLink: e.target.value}))}
                                className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue text-sm md:text-base"
                                placeholder="https://..."
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="w-full bg-primary-blue hover:bg-primary-hover text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm md:text-base"
                        >
                            {isSaving ? 'กำลังส่งข้อมูล...' : 'ยืนยันการส่งข้อมูล'}
                        </button>
                    </form>

                    {/* My Plans List */}
                    <div className="mt-8 pt-8 border-t">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">ประวัติการส่งงานของคุณ</h3>
                        <div className="flex flex-col gap-4">
                            {myPlans.length === 0 ? (
                                <div className="text-center text-gray-500 py-4 bg-gray-50 rounded-lg text-sm">ยังไม่มีประวัติการส่ง</div>
                            ) : (
                                myPlans.map(plan => (
                                    <div key={plan.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-bold text-gray-900">{plan.subjectName}</div>
                                                <div className="text-xs text-gray-500">{plan.subjectCode} • {plan.date}</div>
                                            </div>
                                            <StatusBadge status={plan.status} comment={plan.comment} />
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                                            <FileLink files={plan.courseStructureFile} label="โครงสร้าง" />
                                            <FileLink files={plan.lessonPlanFile} label="แผนฯ" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: STATS --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold text-navy mb-6 flex items-center gap-2">
                             <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                            แดชบอร์ดภาพรวม
                        </h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                                <p className="text-xs md:text-sm opacity-80">ครูส่งงาน</p>
                                <p className="text-2xl md:text-3xl font-bold mt-1">{stats.teachersCount} <span className="text-sm font-normal">คน</span></p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                                <p className="text-xs md:text-sm opacity-80">จำนวนแผนฯ</p>
                                <p className="text-2xl md:text-3xl font-bold mt-1">{stats.totalPlans} <span className="text-sm font-normal">รายการ</span></p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg col-span-2 md:col-span-1">
                                <p className="text-xs md:text-sm opacity-80">อนุมัติแล้ว</p>
                                <p className="text-2xl md:text-3xl font-bold mt-1">{stats.totalApproved} <span className="text-sm font-normal">รายการ</span></p>
                            </div>
                        </div>

                        <div className="h-[300px] md:h-[400px] w-full bg-gray-50 rounded-xl p-2 md:p-4 flex flex-col items-center justify-center">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 3: APPROVAL (EXECUTIVE) --- */}
            {activeTab === 'approval' && (
                <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                        <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                             <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             ผู้บริหารอนุมัติ
                        </h2>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] md:text-xs">
                             รายการที่มีสัญลักษณ์ <span className="inline-block bg-green-100 text-green-800 px-1 rounded mx-1">ล่าสุด ✓</span> คือไฟล์ใหม่ที่สุด
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อครู..." 
                                value={filterTeacher}
                                onChange={(e) => setFilterTeacher(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue text-sm"
                            />
                        </div>
                        <div className="relative">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </span>
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อวิชา..." 
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {filteredPlans.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">ไม่พบรายการ</div>
                        ) : (
                            filteredPlans.map(plan => {
                                const latest = isLatest(plan);
                                return (
                                    <div key={plan.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        {/* Card Header */}
                                        <div className="p-4 bg-gray-50/50 flex justify-between items-start border-b border-gray-100">
                                            <div>
                                                <div className="font-bold text-gray-900 text-base md:text-lg flex items-center gap-2">
                                                    {plan.teacherName}
                                                    {latest && <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">ล่าสุด</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">{plan.date} • {plan.learningArea}</div>
                                            </div>
                                            <StatusBadge status={plan.status} comment={plan.comment} />
                                        </div>
                                        
                                        {/* Card Body */}
                                        <div className="p-4">
                                            <div className="mb-3">
                                                <div className="text-sm font-semibold text-gray-800">{plan.subjectName}</div>
                                                <div className="text-xs text-gray-500">{plan.subjectCode}</div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <FileLink files={plan.courseStructureFile} label="1. โครงสร้าง" />
                                                <FileLink files={plan.lessonPlanFile} label="2. แผนฯ" />
                                                {plan.additionalLink && (
                                                     <a href={plan.additionalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:underline text-xs px-2 py-1.5 rounded border border-blue-100 bg-blue-50 mb-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                        ลิงก์
                                                     </a>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            {plan.status !== 'approved' && plan.status !== 'needs_edit' && (
                                                <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                                                    <button 
                                                        onClick={() => onUpdateStatus(plan.id, 'approved')}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-sm transition-colors"
                                                    >
                                                        อนุมัติ
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const reason = prompt("ระบุเหตุผลที่ต้องแก้ไข:");
                                                            if(reason) onUpdateStatus(plan.id, 'needs_edit', reason);
                                                        }}
                                                        className="flex-1 bg-white border border-red-200 text-red-500 hover:bg-red-50 font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                                                    >
                                                        ส่งคืนแก้ไข
                                                    </button>
                                                </div>
                                            )}
                                             {/* If approved/needs edit, allow re-action */}
                                            {(plan.status === 'approved' || plan.status === 'needs_edit') && (
                                                <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2 justify-end">
                                                     <button 
                                                        onClick={() => onUpdateStatus(plan.id, 'approved')}
                                                        className="text-xs bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 px-3 py-1 rounded border border-gray-200"
                                                    >
                                                        อนุมัติซ้ำ
                                                    </button>
                                                     <button 
                                                        onClick={() => {
                                                            const reason = prompt("ระบุเหตุผลที่ต้องแก้ไข:");
                                                            if(reason) onUpdateStatus(plan.id, 'needs_edit', reason);
                                                        }}
                                                        className="text-xs bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 px-3 py-1 rounded border border-gray-200"
                                                    >
                                                        แก้ซ้ำ
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcademicPage;
