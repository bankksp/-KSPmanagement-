
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
            const searchLower = (searchTerm || '').toLowerCase();
            return (r.purpose || '').toLowerCase().includes(searchLower) ||
                   (r.teacherName || '').toLowerCase().includes(searchLower) ||
                   (r.location || '').toLowerCase().includes(searchLower);
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
            (s.studentName || '').toLowerCase().includes(term) || 
            (s.studentNickname || '').toLowerCase().includes(term) ||
            (s.studentClass || '').toLowerCase().includes(term)
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
            
            {/* ... rest of component stays the same */}
        </div>
    );
};

export default ServiceRegistrationPage;
