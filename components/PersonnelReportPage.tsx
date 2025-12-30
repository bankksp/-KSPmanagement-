
import React, { useState, useMemo, useEffect } from 'react';
import { PerformanceReport, Personnel } from '../types';
import { getDirectDriveImageSrc, safeParseArray } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PersonnelReportPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    reports: PerformanceReport[];
    onSave: (report: PerformanceReport) => void;
    onDelete: (ids: number[]) => void;
    academicYears: string[];
    positions: string[];
    isSaving: boolean;
}

const PersonnelReportPage: React.FC<PersonnelReportPageProps> = ({ 
    currentUser, personnel, reports, onSave, onDelete, 
    academicYears, positions, isSaving 
}) => {
    const [activeTab, setActiveTab] = useState<'submit' | 'stats'>('stats');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewReport, setViewReport] = useState<PerformanceReport | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('');
    
    const [formData, setFormData] = useState<Partial<PerformanceReport>>({
        academicYear: (new Date().getFullYear() + 543).toString(),
        round: '1',
        note: '',
        file: [],
        status: 'pending'
    });

    const isAdminOrPro = currentUser.role === 'admin' || currentUser.role === 'pro';

    useEffect(() => {
        if (!formData.id) {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setFormData(prev => ({
                ...prev,
                personnelId: currentUser.id,
                name: `${title}${currentUser.personnelName}`,
                position: currentUser.position
            }));
        }
    }, [currentUser, formData.id]);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  r.position.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = !filterYear || r.academicYear === filterYear;
            return matchesSearch && matchesYear;
        }).sort((a, b) => b.id - a.id);
    }, [reports, searchTerm, filterYear]);

    const dashboardStats = useMemo(() => {
        const totalReports = reports.length;
        const uniqueTeachers = new Set(reports.map(r => r.personnelId)).size;
        const approvedCount = reports.filter(r => r.status === 'approved').length;
        const pendingCount = reports.filter(r => r.status === 'pending').length;
        const needsEditCount = reports.filter(r => r.status === 'needs_edit').length;

        const statusData = [
            { name: 'อนุมัติแล้ว', value: approvedCount, color: '#10B981' },
            { name: 'รอตรวจสอบ', value: pendingCount, color: '#F59E0B' },
            { name: 'ปรับปรุง', value: needsEditCount, color: '#EF4444' },
        ].filter(d => d.value > 0);

        const positionCount: Record<string, number> = {};
        reports.forEach(r => {
            positionCount[r.position] = (positionCount[r.position] || 0) + 1;
        });
        const positionData = Object.entries(positionCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        return { totalReports, uniqueTeachers, approvedCount, pendingCount, statusData, positionData };
    }, [reports]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, file: [e.target.files![0]] }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newReport: PerformanceReport = {
            ...formData as PerformanceReport,
            id: formData.id || Date.now(),
            submissionDate: formData.submissionDate || new Date().toLocaleDateString('th-TH'),
            score: formData.score || 0
        };
        onSave(newReport);
        if (!formData.id) {
            setFormData({ ...formData, note: '', file: [], round: '1', status: 'pending' });
            alert('ส่งรายงานเรียบร้อย');
        } else {
            setIsViewModalOpen(false);
            alert('บันทึกการแก้ไขเรียบร้อย');
        }
    };

    const handleOpenView = (report: PerformanceReport) => {
        setViewReport(report);
        if (isAdminOrPro || report.personnelId === currentUser.id) setFormData(report);
        setIsViewModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('ยืนยันการลบรายงาน?')) {
            onDelete([id]);
            setIsViewModalOpen(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200">อนุมัติแล้ว</span>;
            case 'needs_edit': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200">ปรับปรุง</span>;
            default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold border border-yellow-200">รอตรวจสอบ</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stats' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>สถิติการส่ง</button>
                <button onClick={() => setActiveTab('submit')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'submit' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>ส่งรายงาน</button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><p className="text-sm text-gray-500 font-medium">ทั้งหมด</p><p className="text-3xl font-bold text-navy">{dashboardStats.totalReports}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><p className="text-sm text-gray-500 font-medium">ครูที่ส่ง</p><p className="text-3xl font-bold text-purple-600">{dashboardStats.uniqueTeachers}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-green-100"><p className="text-sm text-green-600 font-medium">อนุมัติแล้ว</p><p className="text-3xl font-bold text-green-700">{dashboardStats.approvedCount}</p></div>
                        <div className="bg-white p-4 rounded-xl shadow border border-yellow-100"><p className="text-sm text-yellow-600 font-medium">รอดำเนินการ</p><p className="text-3xl font-bold text-yellow-700">{dashboardStats.pendingCount}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dashboardStats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>{dashboardStats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboardStats.positionData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} /><Tooltip /><Bar dataKey="value" name="จำนวน" fill="#3B82F6" radius={[0, 4, 4, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
                    </div>
                </div>
            )}
            {/* Rest of the component remains the same... */}
        </div>
    );
};

export default PersonnelReportPage;
