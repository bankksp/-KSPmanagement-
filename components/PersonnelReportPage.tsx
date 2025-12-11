
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
    // Set 'stats' as default
    const [activeTab, setActiveTab] = useState<'submit' | 'stats'>('stats');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewReport, setViewReport] = useState<PerformanceReport | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('');
    
    // Form State
    const [formData, setFormData] = useState<Partial<PerformanceReport>>({
        academicYear: (new Date().getFullYear() + 543).toString(),
        round: '1',
        note: '',
        file: [],
        status: 'pending'
    });

    const isAdminOrPro = currentUser.role === 'admin' || currentUser.role === 'pro';

    // Auto-fill user info
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

    // Stats / Filtered List
    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  r.position.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = !filterYear || r.academicYear === filterYear;
            return matchesSearch && matchesYear;
        }).sort((a, b) => b.id - a.id);
    }, [reports, searchTerm, filterYear]);

    // Dashboard Statistics Calculation
    const dashboardStats = useMemo(() => {
        const totalReports = reports.length;
        const uniqueTeachers = new Set(reports.map(r => r.personnelId)).size;
        const approvedCount = reports.filter(r => r.status === 'approved').length;
        const pendingCount = reports.filter(r => r.status === 'pending').length;
        const needsEditCount = reports.filter(r => r.status === 'needs_edit').length;

        // Pie Chart Data
        const statusData = [
            { name: 'อนุมัติแล้ว', value: approvedCount, color: '#10B981' },
            { name: 'รอตรวจสอบ', value: pendingCount, color: '#F59E0B' },
            { name: 'ปรับปรุง', value: needsEditCount, color: '#EF4444' },
        ].filter(d => d.value > 0);

        // Bar Chart Data (Reports by Position)
        const positionCount: Record<string, number> = {};
        reports.forEach(r => {
            positionCount[r.position] = (positionCount[r.position] || 0) + 1;
        });
        const positionData = Object.entries(positionCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 positions

        return {
            totalReports,
            uniqueTeachers,
            approvedCount,
            pendingCount,
            statusData,
            positionData
        };
    }, [reports]);

    // Handlers
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
        // Reset form if new
        if (!formData.id) {
            setFormData({
                ...formData,
                note: '',
                file: [],
                round: '1',
                status: 'pending'
            });
            alert('ส่งรายงานเรียบร้อย');
        } else {
            setIsViewModalOpen(false);
            alert('บันทึกการแก้ไขเรียบร้อย');
        }
    };

    const handleOpenView = (report: PerformanceReport) => {
        setViewReport(report);
        // If user is owner or admin, populate form for potential edit
        if (isAdminOrPro || report.personnelId === currentUser.id) {
            setFormData(report);
        }
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
            {/* Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                <button 
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stats' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติการส่ง
                </button>
                <button 
                    onClick={() => setActiveTab('submit')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'submit' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    ส่งรายงาน
                </button>
            </div>

            {/* --- STATS TAB (DEFAULT) --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Dashboard Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-500 font-medium">จำนวนรายงานทั้งหมด</p>
                            <div className="flex justify-between items-end">
                                <p className="text-3xl font-bold text-navy">{dashboardStats.totalReports}</p>
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-500 font-medium">ครูส่งรายงาน</p>
                            <div className="flex justify-between items-end">
                                <p className="text-3xl font-bold text-purple-600">{dashboardStats.uniqueTeachers} <span className="text-sm text-gray-400 font-normal">คน</span></p>
                                <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-green-100 hover:shadow-md transition-shadow">
                            <p className="text-sm text-green-600 font-medium">ตรวจสอบแล้ว (อนุมัติ)</p>
                            <div className="flex justify-between items-end">
                                <p className="text-3xl font-bold text-green-700">{dashboardStats.approvedCount}</p>
                                <div className="bg-green-50 p-2 rounded-lg text-green-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-yellow-100 hover:shadow-md transition-shadow">
                            <p className="text-sm text-yellow-600 font-medium">ยังไม่ตรวจสอบ</p>
                            <div className="flex justify-between items-end">
                                <p className="text-3xl font-bold text-yellow-700">{dashboardStats.pendingCount}</p>
                                <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Pie Chart */}
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สถานะรายงาน</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dashboardStats.statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {dashboardStats.statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '8px'}} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Position Bar Chart */}
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-4">จำนวนรายงานแยกตามตำแหน่ง</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={dashboardStats.positionData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/>
                                        <XAxis type="number" tick={{fill: '#6B7280', fontSize: 12}} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fill: '#6B7280', fontSize: 11}} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                        <Bar dataKey="value" name="จำนวนรายงาน" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h2 className="text-xl font-bold text-navy">รายการรายงานทั้งหมด</h2>
                            <div className="flex gap-2 w-full md:w-auto">
                                <input 
                                    type="text" 
                                    placeholder="ค้นหาชื่อ, ตำแหน่ง..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="border rounded-lg px-3 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-primary-blue"
                                />
                                <select 
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    className="border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">ทุกปีการศึกษา</option>
                                    {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                                    <tr>
                                        <th className="p-4">ชื่อ-นามสกุล</th>
                                        <th className="p-4">ตำแหน่ง</th>
                                        <th className="p-4 text-center">ปีการศึกษา</th>
                                        <th className="p-4 text-center">ครั้งที่</th>
                                        <th className="p-4 text-center">คะแนน</th>
                                        <th className="p-4 text-center">ไฟล์งาน</th>
                                        <th className="p-4 text-center">สถานะ</th>
                                        <th className="p-4 text-center">วันที่ส่ง</th>
                                        <th className="p-4 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredReports.map(report => (
                                        <tr key={report.id} className="hover:bg-blue-50 transition-colors">
                                            <td className="p-4 font-medium">{report.name}</td>
                                            <td className="p-4 text-gray-600">{report.position}</td>
                                            <td className="p-4 text-center">{report.academicYear}</td>
                                            <td className="p-4 text-center">{report.round}</td>
                                            <td className="p-4 text-center font-bold text-primary-blue">{report.score || '-'}</td>
                                            <td className="p-4 text-center">
                                                {report.file && report.file.length > 0 ? (
                                                    <a 
                                                        href={getDirectDriveImageSrc(report.file[0])} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="text-red-500 hover:text-red-700 flex justify-center"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                    </a>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4 text-center">{getStatusBadge(report.status)}</td>
                                            <td className="p-4 text-center text-gray-500">{report.submissionDate}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleOpenView(report)}
                                                        className="bg-sky-100 text-sky-700 p-1.5 rounded hover:bg-sky-200 transition-colors" 
                                                        title="ดูข้อมูล"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </button>
                                                    {isAdminOrPro && (
                                                        <button 
                                                            onClick={() => handleDelete(report.id)}
                                                            className="bg-red-100 text-red-700 p-1.5 rounded hover:bg-red-200 transition-colors" 
                                                            title="ลบ"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredReports.length === 0 && (
                                        <tr><td colSpan={9} className="p-8 text-center text-gray-500">ไม่พบข้อมูลรายงาน</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUBMIT TAB --- */}
            {activeTab === 'submit' && (
                <div className="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
                    <h2 className="text-xl font-bold text-navy mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        แบบฟอร์มรายงานการปฏิบัติงาน
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                                <select 
                                    value={formData.position} 
                                    onChange={e => setFormData({...formData, position: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    <option value="">-- เลือกตำแหน่ง --</option>
                                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา</label>
                                <select 
                                    value={formData.academicYear} 
                                    onChange={e => setFormData({...formData, academicYear: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ครั้งที่</label>
                                <select 
                                    value={formData.round} 
                                    onChange={e => setFormData({...formData, round: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    <option value="1">ครั้งที่ 1 (ภาคเรียนที่ 1)</option>
                                    <option value="2">ครั้งที่ 2 (ภาคเรียนที่ 2)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">แนบไฟล์งาน (PDF/รูปภาพ)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-blue hover:text-blue-500 focus-within:outline-none">
                                                <span>อัปโหลดไฟล์</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,image/*" />
                                            </label>
                                            <p className="pl-1">หรือลากไฟล์มาวาง</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                                        {formData.file && formData.file.length > 0 && (
                                            <p className="text-sm text-green-600 font-bold mt-2">
                                                เลือกไฟล์แล้ว: {formData.file[0] instanceof File ? formData.file[0].name : 'ไฟล์เดิม'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                                <textarea 
                                    value={formData.note} 
                                    onChange={e => setFormData({...formData, note: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    rows={3}
                                ></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="bg-primary-blue text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- VIEW/EDIT MODAL --- */}
            {isViewModalOpen && viewReport && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="p-5 border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">รายละเอียดรายงาน</h3>
                            <button onClick={() => setIsViewModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* Read-Only View for Regular Users (unless owning the report), Editable for Admin/Pro */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="block text-gray-500 text-xs font-bold uppercase">ชื่อ-นามสกุล</label>
                                    <p className="font-semibold text-lg text-gray-800">{viewReport.name}</p>
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs font-bold uppercase">ตำแหน่ง</label>
                                    <p className="font-semibold text-gray-800">{viewReport.position}</p>
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs font-bold uppercase">ปีการศึกษา</label>
                                    <p className="font-semibold text-gray-800">{viewReport.academicYear}</p>
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs font-bold uppercase">ครั้งที่</label>
                                    <p className="font-semibold text-gray-800">{viewReport.round}</p>
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs font-bold uppercase">วันที่ส่ง</label>
                                    <p className="font-semibold text-gray-800">{viewReport.submissionDate}</p>
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs font-bold uppercase">สถานะ</label>
                                    <div className="mt-1">{getStatusBadge(formData.status || viewReport.status)}</div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-gray-500 text-xs font-bold uppercase">ไฟล์แนบ</label>
                                    {viewReport.file && viewReport.file.length > 0 ? (
                                        <a href={getDirectDriveImageSrc(viewReport.file[0])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:underline mt-1 p-2 bg-blue-50 rounded border border-blue-100">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            เปิดดูไฟล์แนบ
                                        </a>
                                    ) : <span className="text-gray-400">ไม่มีไฟล์</span>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-gray-500 text-xs font-bold uppercase">หมายเหตุ</label>
                                    <p className="text-gray-700 bg-gray-50 p-2 rounded">{viewReport.note || '-'}</p>
                                </div>
                            </div>

                            {/* Admin/Pro Controls */}
                            {isAdminOrPro && (
                                <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
                                    <h4 className="text-md font-bold text-purple-700 mb-3 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ส่วนสำหรับเจ้าหน้าที่/ผู้ดูแล
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">ให้คะแนน</label>
                                            <input 
                                                type="number" 
                                                value={formData.score || ''} 
                                                onChange={e => setFormData({...formData, score: Number(e.target.value)})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                                placeholder="0-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">สถานะ</label>
                                            <select 
                                                value={formData.status} 
                                                onChange={e => setFormData({...formData, status: e.target.value as any})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="pending">รอตรวจสอบ</option>
                                                <option value="approved">อนุมัติ (ผ่าน)</option>
                                                <option value="needs_edit">ส่งคืน (ปรับปรุง)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button 
                                onClick={() => setIsViewModalOpen(false)} 
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
                            >
                                ปิด
                            </button>
                            {/* Show Save button if Admin or Owner */}
                            {(isAdminOrPro || viewReport.personnelId === currentUser.id) && (
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 font-bold shadow"
                                >
                                    {isSaving ? 'บันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelReportPage;
