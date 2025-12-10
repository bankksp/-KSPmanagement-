
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, Personnel, Student } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getCurrentThaiDate, formatThaiDate, parseThaiDateForSort, buddhistToISO, isoToBuddhist } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';

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

const ServiceRegistrationPage: React.FC<ServiceRegistrationPageProps> = ({ 
    currentUser, students, personnel, records, onSaveRecord, onDeleteRecord, 
    serviceLocations, onUpdateLocations, isSaving 
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'settings'>('stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Stats Filtering
    const currentYear = new Date().getFullYear() + 543;
    const currentMonth = new Date().getMonth() + 1;
    const [statsMonth, setStatsMonth] = useState<number>(currentMonth);
    const [statsYear, setStatsYear] = useState<number>(currentYear);
    const [filterLocation, setFilterLocation] = useState<string>(''); 

    // View Modal State
    const [viewRecord, setViewRecord] = useState<ServiceRecord | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExportSingleMenuOpen, setIsExportSingleMenuOpen] = useState(false);

    const [currentRecord, setCurrentRecord] = useState<Partial<ServiceRecord>>({});
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Settings State
    const [newLocation, setNewLocation] = useState('');
    
    // Export State (Global)
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // --- Helper for Time Formatting ---
    const formatDisplayTime = (time?: string) => {
        if (!time) return '-';
        if (time.includes('T')) {
            const timePart = time.split('T')[1]; 
            if (timePart) {
                const [h, m] = timePart.split(':');
                if (h && m) return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
            }
        }
        if (time.includes(':')) {
            const parts = time.split(':');
            if (parts.length >= 2 && parts[0].trim().length <= 2) {
                return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
        }
        return time;
    };

    // --- Stats Calculations ---
    const stats = useMemo(() => {
        const getRecordDateParts = (dateStr: string) => {
            if (!dateStr) return { d: 0, m: 0, y: 0 };
            let d = 0, m = 0, y = 0;
            const normalized = dateStr.replace(/-/g, '/');
            const parts = normalized.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]); }
                else { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
            }
            if (y > 1900 && y < 2400) y += 543;
            return { d, m, y };
        };

        const filteredByDate = records.filter(r => {
            const { m, y } = getRecordDateParts(r.date);
            const matchDate = m === statsMonth && y === statsYear;
            const matchLoc = filterLocation === '' || r.location === filterLocation;
            return matchDate && matchLoc;
        });

        const totalRequests = filteredByDate.length;
        const totalStudentsServed = filteredByDate.reduce((sum, r) => sum + (r.students?.length || (r.studentId ? 1 : 0)), 0);
        
        const daysInMonth = new Date(statsYear - 543, statsMonth, 0).getDate();
        const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            // Filter records for this specific day
            const recordsForDay = filteredByDate.filter(r => getRecordDateParts(r.date).d === day);
            // Sum students
            const studentCount = recordsForDay.reduce((sum, r) => sum + (r.students?.length || (r.studentId ? 1 : 0)), 0);
            return { day: day.toString(), students: studentCount };
        });

        const locationStats: Record<string, number> = {};
        filteredByDate.forEach(r => {
            const loc = r.location || 'ไม่ระบุ';
            // Count requests per location
            locationStats[loc] = (locationStats[loc] || 0) + 1;
        });
        
        const locationData = Object.entries(locationStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const topLocations = [...locationData].slice(0, 5);
        const popularLocation = topLocations.length > 0 ? topLocations[0].name : '-';

        return { totalRequests, totalStudentsServed, dailyData, locationData, topLocations, popularLocation, filteredByDate };
    }, [records, statsMonth, statsYear, filterLocation]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const searchLower = searchTerm.toLowerCase();
            return r.purpose.toLowerCase().includes(searchLower) ||
                   r.teacherName.toLowerCase().includes(searchLower) ||
                   r.location.toLowerCase().includes(searchLower);
        }).sort((a, b) => {
            const dateA = parseThaiDateForSort(a.date);
            const dateB = parseThaiDateForSort(b.date);
            if (dateA !== dateB) return dateB - dateA;
            return b.time.localeCompare(a.time);
        });
    }, [records, searchTerm]);

    useEffect(() => {
        if (isViewModalOpen) {
            setCurrentSlide(0);
            setIsExportSingleMenuOpen(false);
        }
    }, [isViewModalOpen]);

    const handleOpenModal = (record?: ServiceRecord) => {
        if (record) {
            const formattedTime = formatDisplayTime(record.time);
            setCurrentRecord({ ...record, time: formattedTime });
        } else {
            const now = new Date();
            const currentHours = now.getHours().toString().padStart(2, '0');
            const currentMinutes = now.getMinutes().toString().padStart(2, '0');
            const timeString = `${currentHours}:${currentMinutes}`;

            setCurrentRecord({
                date: getCurrentThaiDate(),
                time: timeString,
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

    const getExportContent = () => {
        const rows = stats.filteredByDate.map((r, i) => `
            <tr>
                <td style="text-align:center; padding:5px; border:1px solid black;">${i + 1}</td>
                <td style="padding:5px; border:1px solid black;">${formatThaiDate(r.date)}</td>
                <td style="padding:5px; border:1px solid black;">${formatDisplayTime(r.time)} น.</td>
                <td style="padding:5px; border:1px solid black;">${r.location}</td>
                <td style="padding:5px; border:1px solid black;">${r.teacherName}</td>
                <td style="text-align:center; padding:5px; border:1px solid black;">${r.students?.length || (r.studentId ? 1 : 0)}</td>
            </tr>
        `).join('');

        return `
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="font-size:24px; font-weight:bold; margin:0;">รายงานสถิติการใช้บริการแหล่งเรียนรู้</h1>
                <p style="margin:5px 0;">ประจำเดือน ${new Date(0, statsMonth - 1).toLocaleString('th-TH', { month: 'long' })} ปี ${statsYear}</p>
                ${filterLocation ? `<p style="margin:5px 0;">สถานที่: ${filterLocation}</p>` : ''}
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:18px;">
                <p><b>จำนวนครั้งที่ใช้บริการ:</b> ${stats.totalRequests} ครั้ง</p>
                <p><b>จำนวนนักเรียนที่เข้าร่วม:</b> ${stats.totalStudentsServed} คน</p>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:16px;">
                <thead>
                    <tr style="background-color:#f0f0f0;">
                        <th style="border:1px solid black; padding:5px;">ลำดับ</th>
                        <th style="border:1px solid black; padding:5px;">วันที่</th>
                        <th style="border:1px solid black; padding:5px;">เวลา</th>
                        <th style="border:1px solid black; padding:5px;">สถานที่</th>
                        <th style="border:1px solid black; padding:5px;">ผู้ดูแล</th>
                        <th style="border:1px solid black; padding:5px;">จำนวน นร.</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <div style="margin-top:40px; text-align:right;">
                <p>ลงชื่อ ........................................................... ผู้รายงาน</p>
                <p>( ${currentUser.personnelName} )</p>
                <p>ตำแหน่ง ${currentUser.position}</p>
            </div>
        `;
    };

    const handleExportWord = () => {
        setIsExportMenuOpen(false);
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                    td, th { border: 1px solid #000; padding: 5px; vertical-align: top; }
                    th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
                </style>
            </head>
            <body>${getExportContent()}</body></html>
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

    const renderViewModal = () => {
        if (!isViewModalOpen || !viewRecord) return null;
        const images = safeParseArray(viewRecord.images);
        const hasImages = images.length > 0;

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <div className="relative h-56 bg-gray-100 flex items-center justify-center">
                        {hasImages ? (
                            <>
                                <img src={getDirectDriveImageSrc(images[currentSlide])} alt="Activity" className="w-full h-full object-cover" />
                                {images.length > 1 && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev - 1 + images.length) % images.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-2">&#10094;</button>
                                        <button onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-2">&#10095;</button>
                                    </>
                                )}
                            </>
                        ) : (
                            <span className="text-gray-400">ไม่มีรูปภาพ</span>
                        )}
                        <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-1">&times;</button>
                    </div>
                    <div className="p-6 overflow-y-auto bg-gray-50 flex-grow">
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-white p-3 rounded-xl border text-center">
                                <span className="text-[10px] text-gray-500 font-bold">วันที่</span>
                                <span className="text-xs font-bold text-navy block">{formatThaiDate(viewRecord.date)}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border text-center">
                                <span className="text-[10px] text-gray-500 font-bold">เวลา</span>
                                <span className="text-xs font-bold text-navy block">{formatDisplayTime(viewRecord.time)} น.</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border text-center">
                                <span className="text-[10px] text-gray-500 font-bold">สถานที่</span>
                                <span className="text-xs font-bold text-navy block truncate">{viewRecord.location}</span>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border mb-3">
                            <h4 className="text-xs font-bold text-gray-500 mb-1">วัตถุประสงค์</h4>
                            <p className="text-sm font-semibold text-gray-800">{viewRecord.purpose}</p>
                        </div>
                        <div className="bg-white rounded-xl border overflow-hidden">
                            <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50/50">
                                <h4 className="font-bold text-primary-blue">รายชื่อนักเรียน</h4>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{viewRecord.students?.length || 0} คน</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {(viewRecord.students || []).map((s, i) => (
                                    <div key={i} className="flex justify-between p-3 text-sm">
                                        <span>{i+1}. {(s as any).name}</span>
                                        <span className="text-gray-500">{(s as any).class}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-white flex justify-end">
                        <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg">ปิด</button>
                    </div>
                </div>
            </div>
        );
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm no-print">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติการใช้บริการ
                </button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    ลงทะเบียน / ประวัติ
                </button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'settings' ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    ตั้งค่าสถานที่
                </button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in no-print">
                    
                    {/* Header Controls */}
                    <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 justify-between">
                        <div className="flex gap-2">
                            <select value={statsMonth} onChange={(e) => setStatsMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue outline-none">
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })}</option>)}
                            </select>
                            <select value={statsYear} onChange={(e) => setStatsYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue outline-none">
                                {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button onClick={handleExportWord} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Export Word
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm font-medium">จำนวนครั้งที่ใช้บริการ</p>
                            <p className="text-3xl font-bold text-navy mt-1">{stats.totalRequests.toLocaleString()} <span className="text-sm font-normal text-gray-400">ครั้ง</span></p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                            <p className="text-gray-500 text-sm font-medium">จำนวนนักเรียนที่เข้าร่วม</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalStudentsServed.toLocaleString()} <span className="text-sm font-normal text-gray-400">คน</span></p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                            <p className="text-gray-500 text-sm font-medium">สถานที่ยอดนิยม</p>
                            <p className="text-xl font-bold text-orange-600 mt-2 truncate" title={stats.popularLocation}>{stats.popularLocation}</p>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Daily Stats (Students) */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                จำนวนนักเรียนในแต่ละวัน
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.4}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="day" tick={{fontSize: 12}} />
                                        <YAxis tick={{fontSize: 12}} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            cursor={{ fill: '#F3F4F6' }}
                                            formatter={(value: any) => [`${value} คน`, 'จำนวนนักเรียน']}
                                            labelFormatter={(label) => `วันที่ ${label}`}
                                        />
                                        <Bar 
                                            dataKey="students" 
                                            name="จำนวนนักเรียน" 
                                            fill="url(#colorStudents)" 
                                            radius={[4, 4, 0, 0]} 
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Location Stats */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col">
                            <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                สถิติการใช้สถานที่
                            </h3>
                            <div className="flex-grow flex flex-col md:flex-row gap-4 items-center">
                                <div className="h-64 w-full md:w-1/2">
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
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full md:w-1/2 text-sm space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {stats.locationData.map((loc, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                                                <span className="truncate max-w-[120px]" title={loc.name}>{loc.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-700">{loc.value} ครั้ง</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-xl font-bold">ประวัติการใช้งาน</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            ลงทะเบียน
                        </button>
                    </div>
                    <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg px-4 py-2 w-full mb-4 focus:ring-2 focus:ring-primary-blue outline-none" />
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-3 w-10 text-center"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRecords.map(r => r.id)) : new Set())} /></th>
                                    <th className="p-3">วันที่</th>
                                    <th className="p-3">เวลา</th>
                                    <th className="p-3">สถานที่</th>
                                    <th className="p-3">ผู้ดูแล</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleSelect(r.id)} /></td>
                                        <td className="p-3 whitespace-nowrap">{formatThaiDate(r.date)}</td>
                                        <td className="p-3 font-mono">{formatDisplayTime(r.time)}</td>
                                        <td className="p-3">{r.location}</td>
                                        <td className="p-3">{r.teacherName}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-2 py-1 rounded">ดู</button>
                                                <button onClick={() => handleOpenModal(r)} className="text-amber-600 hover:text-amber-800 font-bold text-xs bg-amber-50 px-2 py-1 rounded">แก้ไข</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">ไม่พบประวัติการใช้งาน</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {selectedIds.size > 0 && <button onClick={handleDeleteSelected} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 shadow font-bold text-sm">ลบ {selectedIds.size} รายการที่เลือก</button>}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-xl shadow">
                    <h2 className="text-xl font-bold mb-4">ตั้งค่าสถานที่</h2>
                    <div className="flex gap-2 mb-4">
                        <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="border rounded-lg px-4 py-2 flex-grow focus:ring-2 focus:ring-primary-blue outline-none" placeholder="ชื่อสถานที่ใหม่..." />
                        <button onClick={handleAddLocation} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow">เพิ่ม</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {serviceLocations.map(loc => (
                            <span key={loc} className="bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border border-gray-200">
                                {loc} <button onClick={() => handleRemoveLocation(loc)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Components */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl">
                            <h3 className="text-lg font-bold">{currentRecord.id ? 'แก้ไขข้อมูล' : 'ลงทะเบียนใหม่'}</h3>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่</label>
                                    <input type="date" value={buddhistToISO(currentRecord.date)} onChange={e => setCurrentRecord({...currentRecord, date: isoToBuddhist(e.target.value)})} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-blue" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เวลา</label>
                                    <input type="time" value={currentRecord.time} onChange={e => setCurrentRecord({...currentRecord, time: e.target.value})} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-blue" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">สถานที่</label>
                                <select value={currentRecord.location} onChange={e => setCurrentRecord({...currentRecord, location: e.target.value})} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-blue">
                                    {serviceLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">วัตถุประสงค์</label>
                                <input type="text" value={currentRecord.purpose} onChange={e => setCurrentRecord({...currentRecord, purpose: e.target.value})} placeholder="เช่น เพื่อการเรียนการสอน..." className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-blue" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพกิจกรรม</label>
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">ยกเลิก</button>
                                <button type="submit" className="bg-primary-blue text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {renderViewModal()}
        </div>
    );
};

export default ServiceRegistrationPage;
