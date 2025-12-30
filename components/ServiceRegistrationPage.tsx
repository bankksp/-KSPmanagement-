
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, Personnel, Student, ServiceStudent } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getCurrentThaiDate, formatThaiDate, parseThaiDateForSort, buddhistToISO, isoToBuddhist, getFirstImageSource } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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

    // Form Modal States
    const [currentRecord, setCurrentRecord] = useState<Partial<ServiceRecord>>({});
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
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
        const totalStudentsServed = filteredByDate.reduce((sum, r) => sum + (r.students?.length || 0), 0);
        
        const daysInMonth = new Date(statsYear - 543, statsMonth, 0).getDate();
        const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const recordsForDay = filteredByDate.filter(r => getRecordDateParts(r.date).d === day);
            const studentCount = recordsForDay.reduce((sum, r) => sum + (r.students?.length || 0), 0);
            return { day: day.toString(), students: studentCount };
        });

        const locationStats: Record<string, number> = {};
        filteredByDate.forEach(r => {
            const loc = r.location || 'ไม่ระบุ';
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

    const modalFilteredStudents = useMemo(() => {
        if (!studentSearchTerm.trim()) return students;
        const term = studentSearchTerm.toLowerCase();
        return students.filter(s => 
            s.studentName.toLowerCase().includes(term) || 
            s.studentNickname?.toLowerCase().includes(term) ||
            s.studentClass.toLowerCase().includes(term)
        );
    }, [students, studentSearchTerm]);

    useEffect(() => {
        if (isViewModalOpen) {
            setCurrentSlide(0);
        }
    }, [isViewModalOpen]);

    const handleOpenModal = (record?: ServiceRecord) => {
        setStudentSearchTerm('');
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

    const toggleStudentSelection = (student: Student) => {
        const currentSelected = currentRecord.students || [];
        const isSelected = currentSelected.some(s => s.id === student.id);
        
        if (isSelected) {
            setCurrentRecord(prev => ({
                ...prev,
                students: currentSelected.filter(s => s.id !== student.id)
            }));
        } else {
            const newStudent: ServiceStudent = {
                id: student.id,
                name: `${student.studentTitle}${student.studentName}`,
                class: student.studentClass,
                nickname: student.studentNickname
            };
            setCurrentRecord(prev => ({
                ...prev,
                students: [...currentSelected, newStudent]
            }));
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const recordToSave = {
            ...currentRecord,
            id: currentRecord.id || Date.now(),
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

    const handleRecordSelect = (id: number) => {
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

    const handleExportWord = () => {
        setIsExportMenuOpen(false);
        const rows = stats.filteredByDate.map((r, i) => `
            <tr>
                <td style="text-align:center; padding:5px; border:1px solid black;">${i + 1}</td>
                <td style="padding:5px; border:1px solid black;">${formatThaiDate(r.date)}</td>
                <td style="padding:5px; border:1px solid black;">${formatDisplayTime(r.time)} น.</td>
                <td style="padding:5px; border:1px solid black;">${r.location}</td>
                <td style="padding:5px; border:1px solid black;">${r.teacherName}</td>
                <td style="text-align:center; padding:5px; border:1px solid black;">${r.students?.length || 0}</td>
            </tr>
        `).join('');

        const content = `
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="font-size:24px; font-weight:bold; margin:0;">รายงานสถิติการใช้บริการแหล่งเรียนรู้</h1>
                <p style="margin:5px 0;">ประจำเดือน ${new Date(0, statsMonth - 1).toLocaleString('th-TH', { month: 'long' })} ปี ${statsYear}</p>
            </div>
            <table style="width:100%; border-collapse:collapse;">
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
                <tbody>${rows}</tbody>
            </table>
        `;

        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><style>body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }</style></head>
            <body>${content}</body></html>
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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm no-print">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    สถิติการใช้บริการ
                </button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ลงทะเบียน / ประวัติ
                </button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'settings' ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ตั้งค่าสถานที่
                </button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in no-print">
                    <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 justify-between">
                        <div className="flex gap-2">
                            <select value={statsMonth} onChange={(e) => setStatsMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })}</option>)}
                            </select>
                            <select value={statsYear} onChange={(e) => setStatsYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button onClick={handleExportWord} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Export Word
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm font-medium">จำนวนครั้งที่ใช้บริการ</p>
                            <p className="text-3xl font-bold text-navy mt-1">{stats.totalRequests.toLocaleString()} ครั้ง</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                            <p className="text-gray-500 text-sm font-medium">จำนวนนักเรียนที่เข้าร่วม</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalStudentsServed.toLocaleString()} คน</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                            <p className="text-gray-500 text-sm font-medium">สถานที่ยอดนิยม</p>
                            <p className="text-xl font-bold text-orange-600 mt-2 truncate">{stats.popularLocation}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-4">จำนวนนักเรียนในแต่ละวัน</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="day" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="students" name="จำนวนนักเรียน" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนการใช้สถานที่</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.locationData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                            {stats.locationData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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

            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-xl font-bold">ประวัติการใช้งาน</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            ลงทะเบียน
                        </button>
                    </div>
                    <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg px-4 py-2 w-full mb-4 focus:ring-2 focus:ring-primary-blue" />
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-3 w-10 text-center"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRecords.map(r => r.id)) : new Set())} /></th>
                                    <th className="p-3">วันที่</th>
                                    <th className="p-3">เวลา</th>
                                    <th className="p-3">สถานที่</th>
                                    <th className="p-3">ผู้ดูแล</th>
                                    <th className="p-3">จำนวนนักเรียน</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleRecordSelect(r.id)} /></td>
                                        <td className="p-3">{formatThaiDate(r.date)}</td>
                                        <td className="p-3">{formatDisplayTime(r.time)}</td>
                                        <td className="p-3">{r.location}</td>
                                        <td className="p-3">{r.teacherName}</td>
                                        <td className="p-3">{r.students?.length || 0} คน</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-2 py-1 rounded">ดู</button>
                                                <button onClick={() => handleOpenModal(r)} className="text-amber-600 hover:text-amber-800 font-bold text-xs bg-amber-50 px-2 py-1 rounded">แก้ไข</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">ไม่พบประวัติการใช้งาน</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {selectedIds.size > 0 && <button onClick={handleDeleteSelected} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 shadow font-bold text-sm">ลบ {selectedIds.size} รายการที่เลือก</button>}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print">
                    <h2 className="text-xl font-bold mb-4">ตั้งค่าสถานที่</h2>
                    <div className="flex gap-2 mb-4">
                        <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="border rounded-lg px-4 py-2 flex-grow" placeholder="ชื่อสถานที่ใหม่..." />
                        <button onClick={handleAddLocation} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">เพิ่ม</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {serviceLocations.map(loc => (
                            <span key={loc} className="bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border">
                                {loc} <button onClick={() => handleRemoveLocation(loc)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden animate-fade-in-up">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-lg font-bold">{currentRecord.id ? 'แก้ไขข้อมูลการเข้าใช้บริการ' : 'ลงทะเบียนเข้าใช้บริการแหล่งเรียนรู้'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-grow">
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
                                <select value={currentRecord.location} onChange={e => setCurrentRecord({...currentRecord, location: e.target.value})} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-blue" required>
                                    {serviceLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">วัตถุประสงค์</label>
                                <input type="text" value={currentRecord.purpose} onChange={e => setCurrentRecord({...currentRecord, purpose: e.target.value})} placeholder="เช่น เพื่อการสืบค้นข้อมูล..." className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-blue" required />
                            </div>

                            {/* Student Selection Section */}
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-navy">เลือกนักเรียน ({currentRecord.students?.length || 0} คน)</label>
                                    <div className="relative w-1/2">
                                        <input 
                                            type="text" 
                                            placeholder="ค้นหาชื่อนักเรียน..." 
                                            value={studentSearchTerm}
                                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 border rounded-full text-xs focus:ring-2 focus:ring-primary-blue"
                                        />
                                        <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                </div>
                                
                                <div className="max-h-60 overflow-y-auto border rounded-xl bg-gray-50 divide-y divide-gray-200">
                                    {modalFilteredStudents.length > 0 ? modalFilteredStudents.map(student => {
                                        const isSelected = (currentRecord.students || []).some(s => s.id === student.id);
                                        return (
                                            <div 
                                                key={student.id} 
                                                onClick={() => toggleStudentSelection(student)}
                                                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-white'}`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    readOnly 
                                                    className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue"
                                                />
                                                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-white">
                                                    <img src={getFirstImageSource(student.studentProfileImage) || ''} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display='none'} />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{student.studentTitle}{student.studentName}</p>
                                                    <p className="text-[10px] text-gray-500">{student.studentClass} {student.studentNickname ? `(${student.studentNickname})` : ''}</p>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="p-8 text-center text-gray-400 text-sm">ไม่พบนักเรียนที่ค้นหา</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพประกอบ (ไม่เกิน 5 รูป)</label>
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                {currentRecord.images && currentRecord.images.length > 0 && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {safeParseArray(currentRecord.images).map((img, i) => (
                                            <div key={i} className="w-12 h-12 rounded border overflow-hidden relative">
                                                <img src={getDirectDriveImageSrc(img)} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-300">ยกเลิก</button>
                                <button type="submit" disabled={isSaving || (currentRecord.students || []).length === 0} className="bg-primary-blue text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50">
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="relative h-56 bg-gray-100 flex items-center justify-center">
                            {safeParseArray(viewRecord.images).length > 0 ? (
                                <>
                                    <img src={getDirectDriveImageSrc(safeParseArray(viewRecord.images)[currentSlide])} alt="Activity" className="w-full h-full object-cover" />
                                    {safeParseArray(viewRecord.images).length > 1 && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev - 1 + safeParseArray(viewRecord.images).length) % safeParseArray(viewRecord.images).length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-2">&#10094;</button>
                                            <button onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev + 1) % safeParseArray(viewRecord.images).length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-2">&#10095;</button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span>ไม่มีรูปภาพกิจกรรม</span>
                                </div>
                            )}
                            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-1">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-gray-50 flex-grow">
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-white p-3 rounded-xl border text-center">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">วันที่</span>
                                    <span className="text-xs font-bold text-navy block">{formatThaiDate(viewRecord.date)}</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border text-center">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">เวลา</span>
                                    <span className="text-xs font-bold text-navy block">{formatDisplayTime(viewRecord.time)} น.</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border text-center">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">สถานที่</span>
                                    <span className="text-xs font-bold text-navy block truncate" title={viewRecord.location}>{viewRecord.location}</span>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border mb-4">
                                <h4 className="text-xs font-bold text-gray-400 mb-1 uppercase">วัตถุประสงค์</h4>
                                <p className="text-sm font-semibold text-gray-800">{viewRecord.purpose}</p>
                            </div>
                            <div className="bg-white rounded-xl border overflow-hidden">
                                <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50/50">
                                    <h4 className="font-bold text-primary-blue text-sm">รายชื่อนักเรียน ({viewRecord.students?.length || 0} คน)</h4>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                    {(viewRecord.students || []).map((s, i) => (
                                        <div key={i} className="flex justify-between p-3 text-xs">
                                            <span className="font-medium text-gray-700">{i+1}. {s.name}</span>
                                            <span className="text-gray-400 font-mono">{s.class}</span>
                                        </div>
                                    ))}
                                    {(viewRecord.students || []).length === 0 && (
                                        <div className="p-6 text-center text-gray-400 text-xs italic">ไม่ระบุรายชื่อ</div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-gray-400 text-right italic">
                                บันทึกโดย: {viewRecord.teacherName}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-white flex justify-end">
                            <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-200 text-gray-700 font-bold py-2 px-8 rounded-xl">ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceRegistrationPage;
