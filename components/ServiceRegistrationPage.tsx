
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, Personnel, Student } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getFirstImageSource } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ServiceRegistrationPageProps {
    currentUser: Personnel;
    students: Student[];
    personnel: Personnel[];
    records: ServiceRecord[];
    onSaveRecord: (record: ServiceRecord) => void;
    onDeleteRecord: (ids: number[]) => void;
    serviceLocations: string[];
    onUpdateLocations: (locations: string[]) => void;
    isSaving: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const ServiceRegistrationPage: React.FC<ServiceRegistrationPageProps> = ({ 
    currentUser, students, personnel, records, onSaveRecord, onDeleteRecord, 
    serviceLocations, onUpdateLocations, isSaving 
}) => {
    // Set 'stats' as default tab
    const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'settings'>('stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Stats Filtering
    const currentYear = new Date().getFullYear() + 543;
    const currentMonth = new Date().getMonth() + 1;
    const [statsMonth, setStatsMonth] = useState<number>(currentMonth);
    const [statsYear, setStatsYear] = useState<number>(currentYear);

    // View Modal State
    const [viewRecord, setViewRecord] = useState<ServiceRecord | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    const [currentRecord, setCurrentRecord] = useState<Partial<ServiceRecord>>({});
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Settings State
    const [newLocation, setNewLocation] = useState('');
    
    // Export State
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // --- Stats Calculations ---
    const stats = useMemo(() => {
        // Filter records by Month/Year
        const filteredByDate = records.filter(r => {
            const [d, m, y] = r.date.split('/').map(Number);
            return m === statsMonth && y === statsYear;
        });

        const totalRequests = filteredByDate.length;
        const totalStudentsServed = filteredByDate.reduce((sum, r) => sum + (r.students?.length || (r.studentId ? 1 : 0)), 0);
        
        // 1. Daily Usage (Bar Chart)
        const daysInMonth = new Date(statsYear - 543, statsMonth, 0).getDate();
        const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const count = filteredByDate.filter(r => parseInt(r.date.split('/')[0]) === day).length;
            return { day: day.toString(), count };
        });

        // 2. Location Usage (Pie Chart)
        const locationStats: Record<string, number> = {};
        filteredByDate.forEach(r => {
            locationStats[r.location] = (locationStats[r.location] || 0) + 1;
        });
        const locationData = Object.entries(locationStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 3. Top Locations (Summary)
        const topLocations = [...locationData].slice(0, 3);

        return { 
            totalRequests, 
            totalStudentsServed, 
            dailyData, 
            locationData, 
            topLocations,
            filteredByDate // Pass filtered data for export
        };
    }, [records, statsMonth, statsYear]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const searchLower = searchTerm.toLowerCase();
            return r.purpose.toLowerCase().includes(searchLower) ||
                   r.teacherName.toLowerCase().includes(searchLower) ||
                   r.location.toLowerCase().includes(searchLower);
        }).sort((a, b) => {
            // Sort by date desc, time desc
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            if (dateA.getTime() !== dateB.getTime()) return dateB.getTime() - dateA.getTime();
            return b.time.localeCompare(a.time);
        });
    }, [records, searchTerm]);

    // --- Slideshow Auto-play ---
    useEffect(() => {
        let interval: any;
        if (isViewModalOpen && viewRecord?.images && viewRecord.images.length > 1) {
            interval = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % viewRecord.images!.length);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isViewModalOpen, viewRecord]);

    // Reset slide on open
    useEffect(() => {
        if (isViewModalOpen) setCurrentSlide(0);
    }, [isViewModalOpen]);

    // --- Handlers ---
    const handleOpenModal = (record?: ServiceRecord) => {
        if (record) {
            setCurrentRecord({ ...record });
        } else {
            setCurrentRecord({
                date: new Date().toLocaleDateString('th-TH'),
                time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                location: serviceLocations[0] || '',
                purpose: '',
                teacherId: currentUser.id,
                teacherName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                students: [],
                images: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const recordToSave = {
            ...currentRecord,
            id: currentRecord.id || Date.now(),
            // Backward compatibility
            studentId: currentRecord.students?.[0]?.id || 0,
            studentName: currentRecord.students?.[0]?.name || '',
            studentClass: currentRecord.students?.[0]?.class || '',
        } as ServiceRecord;
        
        onSaveRecord(recordToSave);
        setIsModalOpen(false);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size > 0 && window.confirm(`ยืนยันการลบ ${selectedIds.size} รายการ?`)) {
            onDeleteRecord(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setCurrentRecord(prev => ({
                ...prev,
                images: [...(prev.images || []), ...newFiles]
            }));
        }
    };

    const handleAddStudent = (studentId: string) => {
        const student = students.find(s => String(s.id) === studentId);
        if (student) {
            const newStudentObj = {
                id: student.id,
                name: `${student.studentTitle}${student.studentName}`,
                class: student.studentClass,
                nickname: student.studentNickname
            };
            // Prevent duplicates
            if (!currentRecord.students?.some(s => s.id === student.id)) {
                setCurrentRecord(prev => ({
                    ...prev,
                    students: [...(prev.students || []), newStudentObj]
                }));
            }
        }
    };

    const handleRemoveStudent = (studentId: number) => {
        setCurrentRecord(prev => ({
            ...prev,
            students: (prev.students || []).filter(s => s.id !== studentId)
        }));
    };

    // Settings Handlers
    const handleAddLocation = () => {
        if (newLocation && !serviceLocations.includes(newLocation)) {
            onUpdateLocations([...serviceLocations, newLocation]);
            setNewLocation('');
        }
    };

    const handleRemoveLocation = (loc: string) => {
        if (window.confirm(`ต้องการลบสถานที่ "${loc}" หรือไม่?`)) {
            onUpdateLocations(serviceLocations.filter(l => l !== loc));
        }
    };

    // --- EXPORT HANDLERS ---

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        window.print();
    };

    const getExportContent = () => {
        const content = document.getElementById('print-service-stats');
        return content ? content.innerHTML : '';
    };

    const handleExportWord = () => {
        setIsExportMenuOpen(false);
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>รายงานสถิติการใช้บริการ</title>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                    td, th { border: 1px solid #000; padding: 5px; vertical-align: top; }
                    th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
                    .header { text-align: center; font-weight: bold; font-size: 20pt; margin-bottom: 20px; }
                    .sub-header { font-weight: bold; font-size: 18pt; margin-top: 15px; margin-bottom: 5px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body>
                ${getExportContent()}
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `service_stats_${statsMonth}_${statsYear}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        setIsExportMenuOpen(false);
        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #000; padding: 5px; vertical-align: top; }
                    th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                ${getExportContent()}
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `service_stats_${statsMonth}_${statsYear}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            
            {/* PRINT LAYOUT (Hidden by default) */}
            <div id="print-service-stats" className="hidden print:block print:visible font-sarabun text-black bg-white p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">รายงานสถิติการเข้าใช้บริการแหล่งเรียนรู้</h1>
                    <h2 className="text-xl">ประจำเดือน {new Date(0, statsMonth - 1).toLocaleString('th-TH', { month: 'long' })} ปีการศึกษา {statsYear}</h2>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-bold border-b border-black pb-1 mb-2">1. สรุปภาพรวม</h3>
                    <table className="w-full border border-black">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-center">รายการ</th>
                                <th className="border border-black p-2 text-center">จำนวน</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2">จำนวนครั้งที่เข้าใช้บริการ</td>
                                <td className="border border-black p-2 text-center">{stats.totalRequests} ครั้ง</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2">จำนวนนักเรียนที่เข้าใช้บริการรวม</td>
                                <td className="border border-black p-2 text-center">{stats.totalStudentsServed} คน</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-bold border-b border-black pb-1 mb-2">2. สถิติแยกตามสถานที่</h3>
                    <table className="w-full border border-black">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-center">ลำดับ</th>
                                <th className="border border-black p-2 text-left">สถานที่</th>
                                <th className="border border-black p-2 text-center">จำนวนครั้ง</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.locationData.map((loc, idx) => (
                                <tr key={idx}>
                                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                                    <td className="border border-black p-2">{loc.name}</td>
                                    <td className="border border-black p-2 text-center">{loc.value}</td>
                                </tr>
                            ))}
                            {stats.locationData.length === 0 && <tr><td colSpan={3} className="border border-black p-2 text-center">ไม่มีข้อมูล</td></tr>}
                        </tbody>
                    </table>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-bold border-b border-black pb-1 mb-2">3. สถิติรายวัน</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <table className="w-full border border-black">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-1 text-center">วันที่</th>
                                    <th className="border border-black p-1 text-center">จำนวนครั้ง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.dailyData.slice(0, 16).map((d, i) => (
                                    <tr key={i}>
                                        <td className="border border-black p-1 text-center">{d.day}</td>
                                        <td className="border border-black p-1 text-center">{d.count > 0 ? d.count : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <table className="w-full border border-black">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-1 text-center">วันที่</th>
                                    <th className="border border-black p-1 text-center">จำนวนครั้ง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.dailyData.slice(16).map((d, i) => (
                                    <tr key={i}>
                                        <td className="border border-black p-1 text-center">{d.day}</td>
                                        <td className="border border-black p-1 text-center">{d.count > 0 ? d.count : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="page-break-before">
                    <h3 className="text-lg font-bold border-b border-black pb-1 mb-2">4. รายละเอียดการเข้าใช้บริการ</h3>
                    <table className="w-full border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-center" style={{width: '12%'}}>ว/ด/ป เวลา</th>
                                <th className="border border-black p-2 text-left" style={{width: '15%'}}>สถานที่</th>
                                <th className="border border-black p-2 text-left" style={{width: '20%'}}>วัตถุประสงค์</th>
                                <th className="border border-black p-2 text-left" style={{width: '15%'}}>ครูผู้ดูแล</th>
                                <th className="border border-black p-2 text-center" style={{width: '8%'}}>จำนวน</th>
                                <th className="border border-black p-2 text-left">รายชื่อนักเรียน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.filteredByDate.map((r, idx) => (
                                <tr key={idx}>
                                    <td className="border border-black p-2 text-center">
                                        {r.date}<br/>{r.time} น.
                                    </td>
                                    <td className="border border-black p-2">{r.location}</td>
                                    <td className="border border-black p-2">{r.purpose}</td>
                                    <td className="border border-black p-2">{r.teacherName}</td>
                                    <td className="border border-black p-2 text-center">
                                        {r.students ? r.students.length : (r.studentId ? 1 : 0)}
                                    </td>
                                    <td className="border border-black p-2">
                                        {r.students && r.students.length > 0 ? (
                                            r.students.map(s => s.name).join(', ')
                                        ) : (
                                            r.studentName || '-'
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {stats.filteredByDate.length === 0 && <tr><td colSpan={6} className="border border-black p-4 text-center">ไม่มีข้อมูล</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>สถิติการใช้งาน</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>รายการทั้งหมด</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'settings' ? 'bg-gray-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>ตั้งค่าสถานที่</button>
            </div>

            {/* STATS TAB (New Default) */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in no-print">
                    
                    {/* Control Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm gap-4">
                        <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            สถิติประจำเดือน
                        </h2>
                        <div className="flex gap-2 items-center relative">
                            <select 
                                value={statsMonth} 
                                onChange={(e) => setStatsMonth(Number(e.target.value))}
                                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-gray-50"
                            >
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>เดือน {new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select 
                                value={statsYear} 
                                onChange={(e) => setStatsYear(Number(e.target.value))}
                                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-gray-50"
                            >
                                {Array.from({length: 5}, (_, i) => currentYear - 2 + i).map(y => (
                                    <option key={y} value={y}>ปี {y}</option>
                                ))}
                            </select>
                            
                            <div className="relative">
                                <button 
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 shadow flex items-center gap-1 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    ส่งออก (Export)
                                </button>
                                {isExportMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-20 border border-gray-100 overflow-hidden animate-fade-in-up">
                                        <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-red-600 flex items-center gap-3 transition-colors border-b border-gray-50 text-sm font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            พิมพ์ / PDF
                                        </button>
                                        <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors border-b border-gray-50 text-sm font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Word (.doc)
                                        </button>
                                        <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-3 transition-colors text-sm font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Excel (.xls)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                            <p className="text-blue-100 text-sm mb-1">ยอดเข้าใช้บริการ (ครั้ง)</p>
                            <p className="text-4xl font-bold">{stats.totalRequests}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                            <p className="text-purple-100 text-sm mb-1">จำนวนนักเรียนที่ใช้ (คน)</p>
                            <p className="text-4xl font-bold">{stats.totalStudentsServed}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <p className="text-gray-500 text-sm mb-2">สถานที่ยอดนิยม</p>
                            <div className="space-y-2">
                                {stats.topLocations.slice(0, 2).map((loc, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <span className="font-bold text-navy text-sm truncate">{idx+1}. {loc.name}</span>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">{loc.value} ครั้ง</span>
                                    </div>
                                ))}
                                {stats.topLocations.length === 0 && <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>}
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Daily Usage Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สถิติการใช้งานรายวัน</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="day" tick={{fontSize: 12}} />
                                        <YAxis tick={{fontSize: 12}} allowDecimals={false} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            cursor={{ fill: '#F3F4F6' }}
                                        />
                                        <Bar dataKey="count" name="จำนวนครั้ง" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                            {stats.dailyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#3B82F6' : '#E5E7EB'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Location Pie Chart */}
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนตามสถานที่</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.locationData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.locationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST TAB */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            รายการการรายงานทั้งหมด
                        </h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            บันทึกการใช้บริการ
                        </button>
                    </div>

                    <div className="flex gap-4 mb-4 items-center bg-gray-50 p-3 rounded-lg">
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อ, สถานที่, ครู..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border rounded-lg px-4 py-2 flex-grow focus:ring-2 focus:ring-primary-blue"
                        />
                        {selectedIds.size > 0 && (
                            <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700">
                                ลบ {selectedIds.size} รายการ
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-navy text-white">
                                <tr>
                                    <th className="p-3 w-10 text-center"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRecords.map(r => r.id)) : new Set())} /></th>
                                    <th className="p-3 whitespace-nowrap">วันที่ / เวลา</th>
                                    <th className="p-3 text-center">จำนวนนักเรียน</th>
                                    <th className="p-3">สถานที่</th>
                                    <th className="p-3">วัตถุประสงค์</th>
                                    <th className="p-3">ครูผู้ดูแล</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleSelect(r.id)} /></td>
                                        <td className="p-3 whitespace-nowrap">
                                            <div className="font-bold text-navy">{r.date}</div>
                                            <div className="text-xs text-gray-500">{r.time} น.</div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-green-600">
                                            {r.students ? r.students.length : 1} คน
                                        </td>
                                        <td className="p-3 font-medium text-blue-600">{r.location}</td>
                                        <td className="p-3 max-w-xs truncate">{r.purpose}</td>
                                        <td className="p-3 text-gray-600">{r.teacherName}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="p-1.5 bg-sky-100 text-sky-700 rounded hover:bg-sky-200" title="ดู"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => handleOpenModal(r)} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200" title="แก้ไข"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={() => { if(window.confirm('ลบ?')) onDeleteRecord([r.id]) }} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="ลบ"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-xs text-gray-400 text-right">แสดง {filteredRecords.length} รายการ</div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-xl shadow max-w-2xl mx-auto animate-fade-in no-print">
                    <h2 className="text-xl font-bold text-navy mb-4">ตั้งค่าสถานที่ให้บริการ</h2>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={newLocation} 
                            onChange={e => setNewLocation(e.target.value)} 
                            placeholder="ระบุชื่อสถานที่ใหม่..." 
                            className="border rounded-lg px-4 py-2 flex-grow focus:ring-2 focus:ring-primary-blue"
                        />
                        <button onClick={handleAddLocation} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">เพิ่ม</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {serviceLocations.map((loc, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-gray-200">
                                {loc}
                                <button onClick={() => handleRemoveLocation(loc)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ================== VIEW MODAL ================== */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsViewModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        
                        {/* 1. Header & Slideshow Section */}
                        <div className="relative bg-gray-900 flex-shrink-0">
                            <button 
                                onClick={() => setIsViewModalOpen(false)} 
                                className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all backdrop-blur-md"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="w-full h-64 md:h-80 bg-gray-100 relative flex items-center justify-center group">
                                {viewRecord.images && viewRecord.images.length > 0 ? (
                                    <>
                                        <img 
                                            src={getDirectDriveImageSrc(viewRecord.images[currentSlide])} 
                                            className="w-full h-full object-cover transition-opacity duration-500" 
                                            alt="Activity" 
                                        />
                                        {viewRecord.images.length > 1 && (
                                            <>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + viewRecord.images!.length) % viewRecord.images!.length); }}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                                >
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % viewRecord.images!.length); }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                                >
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                    {viewRecord.images.map((_, idx) => (
                                                        <div key={idx} className={`h-1.5 rounded-full transition-all shadow-sm ${idx === currentSlide ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`}/>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-md font-mono">
                                            {currentSlide + 1} / {viewRecord.images.length}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-16 h-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm">ไม่มีรูปภาพกิจกรรม</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Content Section */}
                        <div className="p-6 overflow-y-auto bg-gray-50 flex-grow">
                            <div className="max-w-3xl mx-auto space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <span className="text-xs text-gray-500 font-bold uppercase">วันที่</span>
                                        <span className="text-sm font-semibold text-navy">{viewRecord.date}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <span className="text-xs text-gray-500 font-bold uppercase">เวลา</span>
                                        <span className="text-sm font-semibold text-navy">{viewRecord.time} น.</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center md:col-span-2">
                                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <span className="text-xs text-gray-500 font-bold uppercase">สถานที่</span>
                                        <span className="text-base font-bold text-green-700">{viewRecord.location}</span>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-purple-100 text-purple-600 p-1.5 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700">วัตถุประสงค์การใช้งาน</h4>
                                            <p className="text-gray-600 text-sm mt-1 leading-relaxed">{viewRecord.purpose}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 pt-3 flex items-center gap-3">
                                        <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase">ครูผู้ดูแล</h4>
                                            <p className="text-sm font-semibold text-navy">{viewRecord.teacherName}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <h4 className="font-bold text-navy flex items-center gap-2">
                                            <svg className="w-5 h-5 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            รายชื่อนักเรียน
                                        </h4>
                                        <span className="bg-primary-blue/10 text-primary-blue text-xs font-bold px-2 py-1 rounded-full">
                                            {viewRecord.students ? viewRecord.students.length : (viewRecord.studentId ? 1 : 0)} คน
                                        </span>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                                            {viewRecord.students ? viewRecord.students.map((s, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                                            {(s as any).name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-800">{(s as any).name}</p>
                                                            <p className="text-xs text-gray-500">{(s as any).nickname ? `น้อง${(s as any).nickname}` : '-'} </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{(s as any).class}</span>
                                                </div>
                                            )) : (
                                                viewRecord.studentName && (
                                                    <div className="flex items-center justify-between p-3">
                                                        <span className="text-sm font-medium text-gray-800">{viewRecord.studentName}</span>
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{viewRecord.studentClass}</span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400">ปิด</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================== EDIT MODAL ================== */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentRecord.id ? 'แก้ไขข้อมูล' : 'บันทึกการใช้บริการ'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่</label>
                                    <input 
                                        type="text" 
                                        value={currentRecord.date} 
                                        onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})} 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                                        placeholder="วว/ดด/ปปปป"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เวลา</label>
                                    <input 
                                        type="time" 
                                        value={currentRecord.time} 
                                        onChange={e => setCurrentRecord({...currentRecord, time: e.target.value})} 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">สถานที่</label>
                                <select 
                                    value={currentRecord.location} 
                                    onChange={e => setCurrentRecord({...currentRecord, location: e.target.value})} 
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                                >
                                    <option value="" disabled>-- เลือกสถานที่ --</option>
                                    {serviceLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">วัตถุประสงค์</label>
                                <textarea 
                                    rows={3} 
                                    value={currentRecord.purpose} 
                                    onChange={e => setCurrentRecord({...currentRecord, purpose: e.target.value})} 
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                                    placeholder="เช่น สืบค้นข้อมูล, ทำรายงาน..."
                                ></textarea>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <label className="block text-sm font-bold text-gray-700 mb-2">รายชื่อนักเรียน ({currentRecord.students?.length || 0} คน)</label>
                                <div className="flex gap-2 mb-3">
                                    <select id="studentSelect" className="flex-grow border rounded-lg px-3 py-2 text-sm" onChange={(e) => handleAddStudent(e.target.value)} value="">
                                        <option value="">-- เลือกนักเรียนเพิ่ม --</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.studentTitle}{s.studentName} ({s.studentNickname}) - {s.studentClass}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                    {currentRecord.students?.map((s, idx) => (
                                        <span key={idx} className="bg-white border border-gray-300 rounded-full px-3 py-1 text-sm flex items-center gap-2">
                                            {(s as any).name}
                                            <button type="button" onClick={() => handleRemoveStudent(s.id)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                                        </span>
                                    ))}
                                    {(!currentRecord.students || currentRecord.students.length === 0) && <span className="text-gray-400 text-sm">ยังไม่ได้เลือกนักเรียน</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพกิจกรรม</label>
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                                <div className="flex gap-2 mt-2 overflow-x-auto">
                                    {currentRecord.images && currentRecord.images.map((img, idx) => (
                                        <div key={idx} className="relative w-16 h-16 flex-shrink-0">
                                            <img src={img instanceof File ? URL.createObjectURL(img) : getDirectDriveImageSrc(img)} className="w-full h-full object-cover rounded-lg border" />
                                            <button type="button" onClick={() => setCurrentRecord(prev => ({...prev, images: prev.images?.filter((_, i) => i !== idx)}))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 text-gray-700">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceRegistrationPage;
