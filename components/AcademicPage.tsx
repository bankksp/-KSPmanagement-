import React, { useState, useMemo, useEffect } from 'react';
import { AcademicPlan, Personnel, PlanStatus } from '../types';
import { LEARNING_AREAS } from '../constants';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { safeParseArray, getDriveViewUrl, getCurrentThaiDate } from '../utils';

interface AcademicPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    plans: AcademicPlan[];
    onSavePlan: (plan: AcademicPlan) => void;
    onUpdateStatus: (id: number, status: PlanStatus, comment?: string) => void;
    isSaving: boolean;
}

// --- MODAL COMPONENT ---
interface AcademicPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (plan: AcademicPlan) => void;
    isSaving: boolean;
    planToEdit: Partial<AcademicPlan> | null;
    personnel: Personnel[];
    currentUser: Personnel;
}

const AcademicPlanModal: React.FC<AcademicPlanModalProps> = ({ isOpen, onClose, onSave, isSaving, planToEdit, personnel, currentUser }) => {
    const [formData, setFormData] = useState<Partial<AcademicPlan>>({});
    const [structureFile, setStructureFile] = useState<File[]>([]);
    const [planFile, setPlanFile] = useState<File[]>([]);

    useEffect(() => {
        if (planToEdit) {
            setFormData(planToEdit);
            setStructureFile([]);
            setPlanFile([]);
        } else {
            const teacher = currentUser;
            setFormData({
                learningArea: LEARNING_AREAS[0],
                teacherId: teacher.id,
                teacherName: `${teacher.personnelTitle}${teacher.personnelName}`,
                subjectCode: '',
                subjectName: '',
                additionalLink: '',
                status: 'pending',
            });
            setStructureFile([]);
            setPlanFile([]);
        }
    }, [planToEdit, currentUser, isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'structure' | 'plan') => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            if (file.size > 15 * 1024 * 1024) { // 15MB limit
                alert('ขนาดไฟล์ต้องไม่เกิน 15MB');
                return;
            }
            if (type === 'structure') setStructureFile([file]);
            else setPlanFile([file]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalPlan: AcademicPlan = {
            ...formData,
            id: formData.id || Date.now(),
            date: formData.date || getCurrentThaiDate(),
            courseStructureFile: structureFile,
            lessonPlanFile: planFile,
        } as AcademicPlan;
        onSave(finalPlan);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-navy">{formData.id ? 'แก้ไขแผนการสอน' : 'ส่งแผนการสอนใหม่'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มสาระ</label>
                            <select value={formData.learningArea} onChange={e => setFormData(p => ({...p, learningArea: e.target.value}))} className="w-full border rounded-lg px-3 py-2 bg-gray-50" required>
                                {LEARNING_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้สอน</label>
                            <input type="text" value={formData.teacherName} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสวิชา *</label>
                            <input type="text" value={formData.subjectCode} onChange={e => setFormData(p => ({...p, subjectCode: e.target.value}))} className="w-full border rounded-lg px-3 py-2" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อวิชา *</label>
                            <input type="text" value={formData.subjectName} onChange={e => setFormData(p => ({...p, subjectName: e.target.value}))} className="w-full border rounded-lg px-3 py-2" required />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์โครงสร้างรายวิชา</label>
                        <input type="file" onChange={e => handleFileChange(e, 'structure')} className="w-full text-sm" />
                        {safeParseArray(formData.courseStructureFile).length > 0 && !structureFile.length && <span className="text-xs text-gray-500 italic">มีไฟล์เดิมอยู่แล้ว</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์แผนการสอน</label>
                        <input type="file" onChange={e => handleFileChange(e, 'plan')} className="w-full text-sm" />
                        {safeParseArray(formData.lessonPlanFile).length > 0 && !planFile.length && <span className="text-xs text-gray-500 italic">มีไฟล์เดิมอยู่แล้ว</span>}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AcademicPage: React.FC<AcademicPageProps> = ({ 
    currentUser, personnel, plans, onSavePlan, onUpdateStatus, isSaving 
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'approval'>('stats');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<AcademicPlan | null>(null);

    const [filterTeacher, setFilterTeacher] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterStatus, setFilterStatus] = useState<PlanStatus | ''>('');

    const canApprove = currentUser.role === 'admin' || currentUser.role === 'pro';

    const allPlansSorted = useMemo(() => {
        return [...plans].sort((a, b) => b.id - a.id);
    }, [plans]);

    const filteredPlans = useMemo(() => {
        return allPlansSorted.filter(p => {
            const teacherMatch = !filterTeacher || p.teacherName.toLowerCase().includes(filterTeacher.toLowerCase());
            const subjectMatch = !filterSubject || p.subjectName.toLowerCase().includes(filterSubject.toLowerCase());
            const statusMatch = !filterStatus || p.status === filterStatus;
            return teacherMatch && subjectMatch && statusMatch;
        });
    }, [allPlansSorted, filterTeacher, filterSubject, filterStatus]);
    
    const pendingPlans = useMemo(() => allPlansSorted.filter(p => p.status === 'pending'), [allPlansSorted]);

    const stats = useMemo(() => {
        const statusCounts: Record<PlanStatus, number> = { pending: 0, approved: 0, needs_edit: 0 };
        const areaCounts: Record<string, number> = {};

        plans.forEach(p => {
            statusCounts[p.status]++;
            areaCounts[p.learningArea] = (areaCounts[p.learningArea] || 0) + 1;
        });

        const statusData = [
            { name: 'รอตรวจ', value: statusCounts.pending, color: '#F59E0B' },
            { name: 'อนุมัติแล้ว', value: statusCounts.approved, color: '#10B981' },
            { name: 'รอแก้ไข', value: statusCounts.needs_edit, color: '#EF4444' },
        ].filter(d => d.value > 0);

        const areaData = Object.entries(areaCounts).map(([name, value]) => ({ name, value }));

        return { total: plans.length, ...statusCounts, statusData, areaData };
    }, [plans]);
    
    const handleOpenModal = (plan: AcademicPlan | null) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleSave = (plan: AcademicPlan) => {
        onSavePlan(plan);
        setIsModalOpen(false);
    };

    const StatusBadge: React.FC<{ status: PlanStatus }> = ({ status }) => {
        const styles = {
            approved: 'bg-green-100 text-green-800 border-green-200',
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            needs_edit: 'bg-red-100 text-red-800 border-red-200',
        };
        const labels = { approved: 'อนุมัติแล้ว', pending: 'รอตรวจ', needs_edit: 'รอแก้ไข' };
        return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>{labels[status]}</span>;
    };
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-navy">ระบบแผนการจัดการเรียนรู้</h2>
            
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>สถิติการส่ง</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>รายการส่งแผนทั้งหมด</button>
                {canApprove && <button onClick={() => setActiveTab('approval')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'approval' ? 'bg-primary-blue text-white' : 'text-gray-600'}`}>เมนูตรวจแผน {pendingPlans.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingPlans.length}</span>}</button>}
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500"><p className="text-sm">ทั้งหมด</p><p className="text-3xl font-bold">{stats.total}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500"><p className="text-sm">รอตรวจ</p><p className="text-3xl font-bold">{stats.pending}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500"><p className="text-sm">อนุมัติแล้ว</p><p className="text-3xl font-bold">{stats.approved}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500"><p className="text-sm">รอแก้ไข</p><p className="text-3xl font-bold">{stats.needs_edit}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow h-80"><h3 className="font-bold mb-2">สถานะแผนการสอน</h3><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{stats.statusData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                        <div className="bg-white p-6 rounded-xl shadow h-80"><h3 className="font-bold mb-2">จำนวนตามกลุ่มสาระ</h3><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.areaData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize: 10}}/><YAxis/><Tooltip/><Bar dataKey="value" name="จำนวน">{stats.areaData.map((e,i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
                    </div>
                </div>
            )}
            
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <h2 className="text-xl font-bold text-navy">รายการส่งแผนทั้งหมด</h2>
                        <button onClick={() => handleOpenModal(null)} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                             ส่งแผนเพิ่ม
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                        <input type="text" placeholder="ค้นหาชื่อครู, วิชา..." value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                            <option value="">ทุกสถานะ</option><option value="pending">รอตรวจ</option><option value="approved">อนุมัติแล้ว</option><option value="needs_edit">รอแก้ไข</option>
                        </select>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600"><tr><th className="p-3">วันที่ส่ง</th><th className="p-3">ชื่อผู้สอน</th><th className="p-3">กลุ่มสาระ/วิชา</th><th className="p-3">ไฟล์แนบ</th><th className="p-3 text-center">สถานะ</th><th className="p-3 text-center">จัดการ</th></tr></thead>
                            <tbody>
                                {filteredPlans.map(p => (
                                    <tr key={p.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3">{p.date}</td>
                                        <td className="p-3 font-medium">{p.teacherName}</td>
                                        <td className="p-3"><div>{p.learningArea}</div><div className="text-xs text-gray-500">{p.subjectName}</div></td>
                                        <td className="p-3"><a href={getDriveViewUrl(safeParseArray(p.lessonPlanFile)[0])} target="_blank" className="text-blue-500 hover:underline">ดูไฟล์</a></td>
                                        <td className="p-3 text-center"><StatusBadge status={p.status} /></td>
                                        <td className="p-3 text-center"><button onClick={() => handleOpenModal(p)} className="text-blue-600 hover:underline text-xs font-bold">ดู/แก้ไข</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'approval' && canApprove && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <h2 className="text-xl font-bold text-navy mb-4">รายการรออนุมัติ ({pendingPlans.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingPlans.map(p => (
                            <div key={p.id} className="bg-white border border-yellow-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div><div className="font-bold">{p.teacherName}</div><div className="text-xs text-gray-500">{p.date}</div></div>
                                    <StatusBadge status={p.status} />
                                </div>
                                <div className="text-sm font-medium">{p.subjectName}</div>
                                <div className="flex gap-2 mt-3 pt-3 border-t">
                                    <a href={getDriveViewUrl(safeParseArray(p.lessonPlanFile)[0])} target="_blank" className="text-blue-500 hover:underline text-xs font-bold">ดูไฟล์แผนฯ</a>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => onUpdateStatus(p.id, 'approved')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm">อนุมัติ</button>
                                    <button onClick={() => { const reason = prompt("เหตุผล:"); if(reason) onUpdateStatus(p.id, 'needs_edit', reason); }} className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg font-bold text-sm">ส่งคืนแก้ไข</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AcademicPlanModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                isSaving={isSaving}
                planToEdit={editingPlan}
                personnel={personnel}
                currentUser={currentUser}
            />
        </div>
    );
};

export default AcademicPage;
