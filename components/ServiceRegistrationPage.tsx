
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
                if (parts[0].length === 4) { 
                    y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]); 
                } else { 
                    d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); 
                }
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

        const popularLocation = locationData.length > 0 ? locationData[0].name : '-';

        return { totalRequests, totalStudentsServed, dailyData, locationData, popularLocation, filteredByDate };
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
            return (b.time || '').localeCompare(a.time || '');
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

    const handleOpenModal = (record?: ServiceRecord) => {
        setStudentSearchTerm('');
        if (record) {
            const formattedTime = formatDisplayTime(record.time);
            setCurrentRecord({ ...record, time: formattedTime });
        } else {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
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

    /**
     * Fix: Added missing handleImageChange function to handle activity image uploads.
     */
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setCurrentRecord(prev => ({
                ...prev,
                images: [...(safeParseArray(prev.images)), ...newFiles]
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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6 font-sarabun">
            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm no-print">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    สถิติการใช้บริการ
                </button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    ลงทะเบียน / ประวัติ
                </button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    ตั้งค่าสถานที่
                </button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in no-print">
                    <div className="flex flex-wrap gap-4 items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 justify-between">
                        <div className="flex gap-4">
                            <select value={statsMonth} onChange={(e) => setStatsMonth(Number(e.target.value))} className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold">
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select value={statsYear} onChange={(e) => setStatsYear(Number(e.target.value))} className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold">
                                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-blue-500">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">การใช้บริการรวม</p>
                            <h3 className="text-3xl font-black text-navy mt-1">{stats.totalRequests.toLocaleString()} ครั้ง</h3>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-emerald-500">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">นักเรียนรับบริการรวม</p>
                            <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.totalStudentsServed.toLocaleString()} คน</h3>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-orange-500">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">สถานที่ยอดนิยม</p>
                            <h3 className="text-2xl font-black text-orange-600 mt-1 truncate">{stats.popularLocation}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-96">
                            <h3 className="text-lg font-black text-navy mb-6">จำนวนนักเรียนในแต่ละวัน</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={stats.dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="day" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                    <Bar dataKey="students" name="จำนวนนักเรียน" fill="#3B82F6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-96">
                            <h3 className="text-lg font-black text-navy mb-6">สัดส่วนการใช้สถานที่</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <PieChart>
                                    <Pie data={stats.locationData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                        {stats.locationData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in no-print">
                    <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
                        <h2 className="text-2xl font-black text-navy">ทะเบียนประวัติการเข้าใช้แหล่งเรียนรู้</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                            ลงทะเบียนการใช้งานใหม่
                        </button>
                    </div>
                    
                    <div className="mb-6">
                        <input type="text" placeholder="ค้นหาตามสถานที่, ผู้ดูแล หรือวัตถุประสงค์..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary-blue shadow-inner" />
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-gray-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b">
                                <tr>
                                    <th className="p-5 w-10 text-center">
                                        <input type="checkbox" className="rounded" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRecords.map(r => r.id)) : new Set())} />
                                    </th>
                                    <th className="p-5">วัน/เวลา</th>
                                    <th className="p-5">สถานที่</th>
                                    <th className="p-5">ผู้ดูแล</th>
                                    <th className="p-5 text-center">นร. (คน)</th>
                                    <th className="p-5 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50/30 transition-all">
                                        <td className="p-5 text-center">
                                            <input type="checkbox" className="rounded" checked={selectedIds.has(r.id)} onChange={() => {
                                                const next = new Set(selectedIds);
                                                if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                                                setSelectedIds(next);
                                            }} />
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-navy leading-tight">{formatThaiDate(r.date)}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{formatDisplayTime(r.time)} น.</div>
                                        </td>
                                        <td className="p-5 font-bold text-gray-700">{r.location}</td>
                                        <td className="p-5 text-gray-500 font-medium">{r.teacherName}</td>
                                        <td className="p-5 text-center">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black text-xs">{r.students?.length || 0}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="p-2.5 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all"><svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => handleOpenModal(r)} className="p-2.5 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all"><svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && (
                                    <tr><td colSpan={6} className="p-20 text-center text-gray-300 font-black italic text-lg opacity-40">ไม่พบประวัติการใช้งานแหล่งเรียนรู้</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {selectedIds.size > 0 && (
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleDeleteSelected} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95">ลบ {selectedIds.size} รายการที่เลือก</button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 animate-fade-in no-print">
                    <h3 className="text-2xl font-black text-navy mb-8 flex items-center gap-3">
                         <span className="p-3 bg-gray-100 rounded-2xl text-gray-600">⚙️</span>
                         ตั้งค่าแหล่งเรียนรู้ / สถานที่
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เพิ่มสถานที่ใหม่</label>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={newLocation} 
                                    onChange={e => setNewLocation(e.target.value)} 
                                    placeholder="เช่น ห้องสมุด ICT, สระว่ายน้ำ..." 
                                    className="flex-grow bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold" 
                                />
                                <button onClick={handleAddLocation} className="bg-primary-blue text-white px-8 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">เพิ่ม</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">รายชื่อสถานที่ปัจจุบัน</label>
                            <div className="grid grid-cols-1 gap-2">
                                {serviceLocations.map(loc => (
                                    <div key={loc} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all group">
                                        <span className="font-bold text-navy">{loc}</span>
                                        <button onClick={() => handleRemoveLocation(loc)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                                {serviceLocations.length === 0 && <p className="text-center py-10 text-gray-400 italic">ยังไม่ได้กำหนดสถานที่</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FORM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-primary-blue text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black">{currentRecord.id ? 'แก้ไขข้อมูลการใช้บริการ' : 'ลงทะเบียนเข้าใช้บริการแหล่งเรียนรู้'}</h3>
                                <p className="text-xs font-bold opacity-70 uppercase tracking-widest mt-1">Learning Resource Service Registration</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-10 overflow-y-auto space-y-10 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">สถานที่ / แหล่งเรียนรู้</label>
                                    <select value={currentRecord.location} onChange={e => setCurrentRecord({...currentRecord, location: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black text-navy" required>
                                        {serviceLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">วันที่</label>
                                        <input type="date" required value={buddhistToISO(currentRecord.date)} onChange={e => setCurrentRecord({...currentRecord, date: isoToBuddhist(e.target.value)})} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-bold outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เวลา</label>
                                        <input type="time" required value={currentRecord.time} onChange={e => setCurrentRecord({...currentRecord, time: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-bold outline-none" />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">วัตถุประสงค์การใช้งาน / กิจกรรม</label>
                                    <input type="text" required value={currentRecord.purpose} onChange={e => setCurrentRecord({...currentRecord, purpose: e.target.value})} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-navy" placeholder="เช่น ศึกษาค้นคว้าอิสระ, จัดกิจกรรมคริสต์มาส..." />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-[11px] font-black text-navy uppercase tracking-[0.2em]">รายชื่อนักเรียนที่เข้าร่วม ({currentRecord.students?.length || 0} คน)</h4>
                                    <div className="relative w-48 sm:w-64">
                                        <input type="text" placeholder="พิมพ์ค้นหาชื่อ นร./ชั้น..." value={studentSearchTerm} onChange={e => setStudentSearchTerm(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-2 text-xs shadow-sm focus:ring-2 focus:ring-primary-blue" />
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden h-72 shadow-inner relative">
                                    <div className="absolute inset-0 overflow-y-auto p-4 custom-scrollbar">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {modalFilteredStudents.map(s => {
                                                const isSelected = (currentRecord.students || []).some(sel => sel.id === s.id);
                                                return (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => toggleStudentSelection(s)}
                                                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isSelected ? 'bg-blue-50 border-primary-blue shadow-sm' : 'bg-white border-gray-50 hover:bg-gray-50'}`}
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center font-black text-[10px] text-gray-400 overflow-hidden">
                                                            {getFirstImageSource(s.studentProfileImage) ? <img src={getFirstImageSource(s.studentProfileImage)!} className="w-full h-full object-cover" /> : s.studentName.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-black truncate ${isSelected ? 'text-blue-700' : 'text-navy'}`}>{s.studentTitle}{s.studentName}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{s.studentClass}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {(currentRecord.students || []).map(s => (
                                        <span key={s.id} className="bg-primary-blue text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 shadow-lg shadow-blue-500/20">
                                            {s.name}
                                            <button type="button" onClick={() => setCurrentRecord(prev => ({...prev, students: prev.students?.filter(x => x.id !== s.id)}))} className="hover:text-red-200 transition-colors">&times;</button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">รูปภาพประกอบกิจกรรม</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <label className="aspect-square bg-white border-4 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                                        <svg className="w-8 h-8 text-gray-200 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-2">Upload Photo</span>
                                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                    {safeParseArray(currentRecord.images).map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm group">
                                            <img src={img instanceof File ? URL.createObjectURL(img) : getDirectDriveImageSrc(img)} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            <button type="button" onClick={() => setCurrentRecord(prev => ({...prev, images: safeParseArray(prev.images).filter((_, i) => i !== idx)}))} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-10">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4.5 rounded-[2rem] font-black tracking-widest uppercase hover:bg-gray-50 transition-all active:scale-95">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-navy text-white py-4.5 rounded-[2rem] font-black tracking-widest uppercase shadow-2xl shadow-blue-900/30 hover:bg-blue-950 transition-all active:scale-95 disabled:grayscale">บันทึกข้อมูลการให้บริการ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW MODAL */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] p-4 flex items-center justify-center no-print" onClick={() => setIsViewModalOpen(false)}>
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-10 bg-navy text-white flex justify-between items-start shrink-0 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                             <div className="relative z-10">
                                <span className="bg-white/20 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] mb-3 inline-block">{viewRecord.location}</span>
                                <h3 className="text-4xl font-black tracking-tighter leading-tight max-w-2xl">{viewRecord.purpose}</h3>
                                <div className="flex items-center gap-4 mt-6 text-blue-200 text-sm font-bold">
                                    <span className="flex items-center gap-1.5">📅 {formatThaiDate(viewRecord.date)}</span>
                                    <span className="flex items-center gap-1.5">🕒 {formatDisplayTime(viewRecord.time)} น.</span>
                                    <span className="flex items-center gap-1.5">👨‍🏫 {viewRecord.teacherName}</span>
                                </div>
                             </div>
                             <button onClick={() => setIsViewModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all active:scale-90"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <div className="flex flex-col lg:flex-row overflow-hidden flex-grow bg-gray-50/50">
                            <div className="flex-grow p-12 overflow-y-auto space-y-12">
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black text-navy uppercase tracking-[0.3em] border-b pb-4">นักเรียนที่ใช้บริการ ({viewRecord.students?.length || 0} คน)</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {(viewRecord.students || []).map(s => (
                                            <div key={s.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase">{s.name.charAt(0)}</div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black text-navy truncate leading-tight">{s.name}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">{s.class}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black text-navy uppercase tracking-[0.3em] border-b pb-4">รูปภาพกิจกรรม</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {safeParseArray(viewRecord.images).map((img, idx) => (
                                            <a key={idx} href={getDirectDriveImageSrc(img)} target="_blank" rel="noreferrer" className="aspect-square rounded-[2rem] overflow-hidden border border-gray-100 shadow-lg group">
                                                <img src={getDirectDriveImageSrc(img)} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            </a>
                                        ))}
                                        {safeParseArray(viewRecord.images).length === 0 && <p className="col-span-full text-center py-10 text-gray-400 italic">ไม่มีรูปภาพประกอบ</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceRegistrationPage;
