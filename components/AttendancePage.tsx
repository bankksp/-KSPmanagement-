
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Personnel, StudentAttendance, PersonnelAttendance, TimePeriod, AttendanceStatus, Settings } from '../types';
import { DEFAULT_ATTENDANCE_PERIODS } from '../constants';
import { getFirstImageSource, buddhistToISO, isoToBuddhist, getCurrentThaiDate, normalizeDate } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AttendancePageProps {
    mode: 'student' | 'personnel';
    students: Student[];
    personnel: Personnel[];
    studentAttendance: StudentAttendance[];
    personnelAttendance: PersonnelAttendance[];
    onSaveStudentAttendance: (data: StudentAttendance[]) => void;
    onSavePersonnelAttendance: (data: PersonnelAttendance[]) => void;
    onDeleteAttendance?: (t: 'student' | 'personnel', ids: string[]) => void;
    isSaving: boolean;
    currentUser: Personnel | null;
    settings?: Settings;
    onRefresh?: () => void;
}

const COLORS = {
    present: '#10B981', 
    absent: '#EF4444',  
    leave: '#F59E0B',   
    sick: '#F97316'     
};

const AttendancePage: React.FC<AttendancePageProps> = ({
    mode, students, personnel, studentAttendance, personnelAttendance, 
    onSaveStudentAttendance, onSavePersonnelAttendance, onDeleteAttendance, 
    isSaving, settings, onRefresh, currentUser
}) => {
    const [subTab, setSubTab] = useState<'stats' | 'log' | 'checkin'>('log');
    const [selectedDate, setSelectedDate] = useState(getCurrentThaiDate());
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('morning_act');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
    const [localAttendance, setLocalAttendance] = useState<Record<number, AttendanceStatus>>({});

    const enabledPeriods = useMemo(() => {
        return (settings?.attendancePeriods || DEFAULT_ATTENDANCE_PERIODS).filter(p => p.enabled);
    }, [settings]);

    const isSameDay = (date1: string, date2: string) => {
        if (!date1 || !date2) return false;
        return date1.trim() === date2.trim();
    };

    // --- 1. สถิติสำหรับการ์ดด้านบน ---
    const topStats = useMemo(() => {
        const todayRecords = studentAttendance.filter(r => isSameDay(r.date, selectedDate));
        const checkedCount = todayRecords.length;
        const absentOrLeave = todayRecords.filter(r => ['absent', 'leave', 'sick'].includes(r.status)).length;
        
        const checkedRooms = new Set();
        todayRecords.forEach(r => {
            const s = students.find(std => std.id === r.studentId);
            if (s) checkedRooms.add(`${s.studentClass}-${r.period}`);
        });

        return {
            checkedCount,
            absentOrLeave,
            roomsCount: checkedRooms.size
        };
    }, [studentAttendance, selectedDate, students]);

    // --- 2. ข้อมูลสำหรับการแสดงผลในตาราง LOG ---
    const sessionLogs = useMemo(() => {
        const groups: Record<string, {
            id: string,
            date: string,
            period: string,
            classroom: string,
            present: number,
            absent: number,
            sick: number,
            leave: number,
            total: number,
            ids: string[]
        }> = {};

        studentAttendance.forEach(r => {
            const student = students.find(s => s.id === r.studentId);
            if (!student) return;
            
            const key = `${r.date}-${r.period}-${student.studentClass}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    date: r.date,
                    period: r.period,
                    classroom: student.studentClass,
                    present: 0,
                    absent: 0,
                    sick: 0,
                    leave: 0,
                    total: 0,
                    ids: []
                };
            }
            
            groups[key].total++;
            groups[key].ids.push(r.id);
            if (r.status === 'present' || r.status === 'activity') groups[key].present++;
            else if (r.status === 'absent') groups[key].absent++;
            else if (r.status === 'sick') groups[key].sick++;
            else if (r.status === 'leave') groups[key].leave++;
        });

        return Object.values(groups)
            .filter(g => {
                const searchLower = searchTerm.toLowerCase();
                return g.classroom.toLowerCase().includes(searchLower) || g.date.includes(searchLower);
            })
            .sort((a, b) => b.id.localeCompare(a.id));
    }, [studentAttendance, students, searchTerm]);

    // --- 3. ข้อมูลสำหรับหน้าสถิติ (Charts) ---
    const chartStats = useMemo(() => {
        const todayRecords = studentAttendance.filter(r => isSameDay(r.date, selectedDate));
        
        const statusData = [
            { name: 'มาเรียน', value: todayRecords.filter(r => r.status === 'present' || r.status === 'activity').length, color: COLORS.present },
            { name: 'ขาดเรียน', value: todayRecords.filter(r => r.status === 'absent').length, color: COLORS.absent },
            { name: 'ลา', value: todayRecords.filter(r => r.status === 'leave').length, color: COLORS.leave },
            { name: 'ป่วย', value: todayRecords.filter(r => r.status === 'sick').length, color: COLORS.sick },
        ].filter(d => d.value > 0);

        // สรุปรายห้อง
        const roomGroups: Record<string, number> = {};
        todayRecords.forEach(r => {
            const student = students.find(s => s.id === r.studentId);
            if (student) {
                roomGroups[student.studentClass] = (roomGroups[student.studentClass] || 0) + 1;
            }
        });
        const barData = Object.entries(roomGroups).map(([name, value]) => ({ name, value }));

        return { statusData, barData };
    }, [studentAttendance, selectedDate, students]);

    const handleExportExcel = () => {
        if (sessionLogs.length === 0) {
            alert('ไม่มีข้อมูลสำหรับดาวน์โหลด');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "วันที่,คาบ,ชั้น/ห้อง,มาเรียน,ขาด,ป่วย,ลา,รวม\n";

        sessionLogs.forEach(log => {
            const periodLabel = enabledPeriods.find(p => p.id === log.period)?.label || log.period;
            csvContent += `"${log.date}","${periodLabel}","${log.classroom}",${log.present},${log.absent},${log.sick},${log.leave},${log.total}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_report_${selectedDate.replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEditSession = (log: any) => {
        setSelectedDate(log.date);
        setSelectedPeriod(log.period as TimePeriod);
        setSelectedClassroom(log.classroom);
        setSubTab('checkin');
    };

    const handleSaveAttendance = () => {
        if (!selectedClassroom) return;
        const currentRoomStudents = students.filter(s => (s.studentClass || 'ไม่ระบุ') === selectedClassroom);
        const records: StudentAttendance[] = currentRoomStudents.map(s => ({
            id: `${selectedDate}_${selectedPeriod}_${s.id}`,
            date: selectedDate,
            period: selectedPeriod,
            studentId: s.id,
            status: localAttendance[s.id] || 'present'
        }));
        onSaveStudentAttendance(records);
        setSelectedClassroom(null);
        setSubTab('log');
    };

    useEffect(() => {
        if (selectedClassroom) {
            const map: Record<number, AttendanceStatus> = {};
            students.filter(s => (s.studentClass || 'ไม่ระบุ') === selectedClassroom).forEach(s => {
                const existing = studentAttendance.find(r => 
                    isSameDay(r.date, selectedDate) && 
                    r.period === selectedPeriod && 
                    Number(r.studentId) === Number(s.id)
                );
                map[s.id] = existing ? existing.status : 'present';
            });
            setLocalAttendance(map);
        }
    }, [selectedClassroom, selectedDate, selectedPeriod, students, studentAttendance]);

    return (
        <div className="space-y-6 font-sarabun">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-navy">ระบบเช็คชื่อนักเรียน</h2>
                    <input 
                        type="date" 
                        value={buddhistToISO(selectedDate)}
                        onChange={(e) => setSelectedDate(isoToBuddhist(e.target.value))}
                        className="px-4 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-primary-blue outline-none shadow-sm"
                    />
                </div>
                <button 
                    onClick={() => { setSubTab('checkin'); setSelectedClassroom(null); }}
                    className="bg-primary-blue hover:bg-primary-hover text-white font-black py-2.5 px-6 rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    เช็คชื่อใหม่
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 no-print">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-bold">เช็คแล้ว ({selectedDate})</p>
                        <h4 className="text-4xl font-black text-navy mt-1">{topStats.checkedCount}</h4>
                    </div>
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-bold">ขาด/ลา/ป่วย</p>
                        <h4 className="text-4xl font-black text-red-500 mt-1">{topStats.absentOrLeave}</h4>
                    </div>
                    <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-bold">ความคืบหน้า (คาบ)</p>
                        <h4 className="text-4xl font-black text-indigo-600 mt-1">{topStats.roomsCount}</h4>
                    </div>
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[60vh]">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-black text-navy">รายการเช็คชื่อ</h3>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setSubTab('log')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${subTab === 'log' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>รายการ</button>
                            <button onClick={() => setSubTab('stats')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${subTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>สถิติ</button>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {subTab === 'log' && (
                            <button 
                                onClick={handleExportExcel}
                                className="bg-green-600 hover:bg-green-700 text-white font-black py-2 px-4 rounded-xl shadow-md flex items-center gap-2 text-sm transition-all active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                ดาวน์โหลด Excel
                            </button>
                        )}
                        <input 
                            type="text" 
                            placeholder="ค้นหา..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow md:w-64 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-blue outline-none"
                        />
                        {onRefresh && (
                            <button onClick={onRefresh} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                <svg className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* --- TAB: LOG --- */}
                {subTab === 'log' && (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-navy text-white font-bold">
                                <tr>
                                    <th className="p-4 w-12"><input type="checkbox" className="rounded border-white/20 bg-transparent" /></th>
                                    <th className="p-4">วัน เวลา</th>
                                    <th className="p-4">ชั้น/ห้อง</th>
                                    <th className="p-4 text-center">มาเรียน</th>
                                    <th className="p-4 text-center">ขาด/ลา/ป่วย</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sessionLogs.length > 0 ? sessionLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                                        <td className="p-4">
                                            <div className="font-bold text-navy">{log.date}</div>
                                            <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">
                                                {enabledPeriods.find(p => p.id === log.period)?.label || log.period}
                                            </div>
                                        </td>
                                        <td className="p-4 font-black text-indigo-900">{log.classroom}</td>
                                        <td className="p-4 text-center">
                                            <span className="text-green-600 font-black text-base">{log.present}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="inline-flex gap-1.5 font-black text-base">
                                                <span className="text-red-500">{log.absent + log.sick + log.leave}</span>
                                                <span className="text-gray-300">/</span>
                                                <span className="text-gray-400">{log.total}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEditSession(log)} className="bg-sky-100 text-sky-800 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-sky-200 transition-colors">ดู</button>
                                                <button onClick={() => handleEditSession(log)} className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors">แก้</button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-gray-400 font-bold">
                                            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                            ไม่พบข้อมูลการเช็คชื่อ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- TAB: STATS --- */}
                {subTab === 'stats' && (
                    <div className="animate-fade-in space-y-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Pie Chart */}
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <h4 className="text-center font-bold text-navy mb-4">สัดส่วนสถานะการมาเรียน ({selectedDate})</h4>
                                <div className="h-64 w-full">
                                    {chartStats.statusData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartStats.statusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    isAnimationActive={false}
                                                >
                                                    {chartStats.statusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 italic">ไม่มีข้อมูลแสดงในวันที่เลือก</div>
                                    )}
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <h4 className="text-center font-bold text-navy mb-4">จำนวนนักเรียนที่เช็คชื่อแล้วแยกตามห้อง</h4>
                                <div className="h-64 w-full">
                                    {chartStats.barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartStats.barData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="value" name="จำนวนคน" fill="#3B82F6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 italic">ไม่มีข้อมูลแสดงในวันที่เลือก</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: CHECK-IN --- */}
                {subTab === 'checkin' && (
                    <div className="animate-fade-in">
                        {!selectedClassroom ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                {Array.from(new Set(students.map(s => s.studentClass))).sort().map(room => (
                                    <button 
                                        key={room} 
                                        onClick={() => setSelectedClassroom(room)}
                                        className="p-6 rounded-[2rem] border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center gap-3 shadow-sm group active:scale-95"
                                    >
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        </div>
                                        <h4 className="font-black text-navy text-lg">{room}</h4>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Select Room</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="animate-slide-up bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-2xl">
                                <div className="p-6 bg-navy text-white flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setSelectedClassroom(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <div>
                                            <h3 className="text-xl font-black">ชั้น {selectedClassroom}</h3>
                                            <p className="text-xs opacity-70">กำลังบันทึกข้อมูล: {selectedDate} | คาบ: {enabledPeriods.find(p=>p.id===selectedPeriod)?.label}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { const newMap = {...localAttendance}; students.filter(s => (s.studentClass || 'ไม่ระบุ') === selectedClassroom).forEach(s => newMap[s.id] = 'present'); setLocalAttendance(newMap); }} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all">มาทั้งหมด</button>
                                </div>
                                <div className="p-8">
                                    <div className="divide-y divide-gray-100">
                                        {students.filter(s => s.studentClass === selectedClassroom).map((s, idx) => (
                                            <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-black text-gray-300 w-6">{idx + 1}</span>
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 border overflow-hidden">
                                                        {getFirstImageSource(s.studentProfileImage) ? <img src={getFirstImageSource(s.studentProfileImage)!} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-400 font-bold">{s.studentName.charAt(0)}</div>}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-navy">{s.studentTitle}{s.studentName}</p>
                                                        <p className="text-xs text-gray-400">ชื่อเล่น: {s.studentNickname || '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {['present', 'absent', 'leave', 'sick'].map(st => (
                                                        <button 
                                                            key={st} 
                                                            onClick={() => setLocalAttendance(prev => ({...prev, [s.id]: st as AttendanceStatus}))} 
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${localAttendance[s.id] === st ? (st === 'present' ? 'bg-green-500 text-white border-green-600' : st === 'absent' ? 'bg-red-500 text-white border-red-600' : 'bg-amber-500 text-white border-amber-600') : 'bg-white text-gray-400 border-gray-200 hover:border-blue-400'}`}
                                                        >
                                                            {st === 'present' ? 'มา' : st === 'absent' ? 'ขาด' : st === 'leave' ? 'ลา' : 'ป่วย'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-12 flex justify-end gap-3">
                                        <button onClick={() => setSelectedClassroom(null)} className="px-8 py-3 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">ยกเลิก</button>
                                        <button onClick={handleSaveAttendance} disabled={isSaving} className="px-12 py-3 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
                                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเช็คชื่อ'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendancePage;
