
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Personnel, StudentAttendance, PersonnelAttendance, TimePeriod, AttendanceStatus, Settings } from '../types';
import { DEFAULT_ATTENDANCE_PERIODS } from '../constants';
import { getFirstImageSource, buddhistToISO, isoToBuddhist, getCurrentThaiDate } from '../utils';
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
}

const COLORS = {
    present: '#10B981', // Emerald 500
    absent: '#EF4444',  // Rose 500
    leave: '#F59E0B',   // Amber 500
    sick: '#F97316'     // Orange 500
};

const AttendancePage: React.FC<AttendancePageProps> = ({
    mode, students, personnel, studentAttendance, personnelAttendance, 
    onSaveStudentAttendance, onSavePersonnelAttendance, onDeleteAttendance, 
    isSaving, settings
}) => {
    const [subTab, setSubTab] = useState<'stats' | 'log' | 'checkin'>('stats');
    const [selectedDate, setSelectedDate] = useState(getCurrentThaiDate());
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('morning_act');
    
    // UI Drill-down State for Log tab
    const [selectedLogClassroom, setSelectedLogClassroom] = useState<string | null>(null);
    
    const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
    const [localAttendance, setLocalAttendance] = useState<Record<number, AttendanceStatus>>({});

    const enabledPeriods = useMemo(() => {
        return (settings?.attendancePeriods || DEFAULT_ATTENDANCE_PERIODS).filter(p => p.enabled);
    }, [settings]);

    const studentClasses = useMemo(() => settings?.studentClasses || [], [settings]);

    // --- 1. STATISTICS CALCULATION ---
    const classStats = useMemo(() => {
        const stats: Record<string, any> = {};
        students.forEach(s => {
            const className = s.studentClass.split('/')[0];
            if (!stats[className]) stats[className] = { name: className, present: 0, absent: 0, leave: 0, sick: 0, total: 0 };
            stats[className].total++;
            const record = studentAttendance.find(r => r.date === selectedDate && r.period === selectedPeriod && r.studentId === s.id);
            if (record) {
                if (record.status === 'present' || record.status === 'activity') stats[className].present++;
                else stats[className][record.status]++;
            } else {
                stats[className].absent++;
            }
        });
        return Object.values(stats).sort((a, b) => studentClasses.indexOf(a.name) - studentClasses.indexOf(b.name));
    }, [students, studentAttendance, selectedDate, selectedPeriod, studentClasses]);

    // --- 2. LOG DATA GROUPED BY CLASSROOM ---
    const classroomsChecked = useMemo(() => {
        const roomsMap = new Map<string, { present: number, absent: number, leave: number, sick: number, total: number }>();
        
        // Filter attendance for selected day/period
        const currentRecords = studentAttendance.filter(r => r.date === selectedDate && r.period === selectedPeriod);
        
        currentRecords.forEach(r => {
            const student = students.find(s => s.id === r.studentId);
            if (student) {
                const room = student.studentClass;
                if (!roomsMap.has(room)) roomsMap.set(room, { present: 0, absent: 0, leave: 0, sick: 0, total: 0 });
                const stats = roomsMap.get(room)!;
                stats.total++;
                if (r.status === 'present') stats.present++;
                else if (r.status === 'absent') stats.absent++;
                else if (r.status === 'leave') stats.leave++;
                else if (r.status === 'sick') stats.sick++;
            }
        });
        
        return Array.from(roomsMap.entries()).map(([room, stats]) => ({ room, ...stats }))
            .sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true }));
    }, [studentAttendance, selectedDate, selectedPeriod, students]);

    const logStudentsForClass = useMemo(() => {
        if (!selectedLogClassroom) return [];
        return studentAttendance
            .filter(r => r.date === selectedDate && r.period === selectedPeriod)
            .map(r => {
                const student = students.find(s => s.id === r.studentId);
                return { ...r, student };
            })
            .filter(item => item.student?.studentClass === selectedLogClassroom)
            .sort((a, b) => (a.student?.studentName || '').localeCompare(b.student?.studentName || ''));
    }, [studentAttendance, selectedDate, selectedPeriod, students, selectedLogClassroom]);

    // --- 3. CLASSROOM SELECTOR DATA ---
    const allClassrooms = useMemo(() => {
        const rooms = new Set<string>();
        students.forEach(s => rooms.add(s.studentClass));
        return Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [students]);

    const classroomStatus = useMemo(() => {
        const statusMap: Record<string, { total: number, checked: number }> = {};
        allClassrooms.forEach(room => {
            const roomStudents = students.filter(s => s.studentClass === room);
            const checkedCount = studentAttendance.filter(r => 
                r.date === selectedDate && r.period === selectedPeriod && 
                roomStudents.some(s => s.id === r.studentId)
            ).length;
            statusMap[room] = { total: roomStudents.length, checked: checkedCount };
        });
        return statusMap;
    }, [allClassrooms, students, studentAttendance, selectedDate, selectedPeriod]);

    // --- HANDLERS ---
    const handleExportExcel = () => {
        const periodLabel = enabledPeriods.find(p => p.id === selectedPeriod)?.label || selectedPeriod;
        const currentRecords = studentAttendance.filter(r => r.date === selectedDate && r.period === selectedPeriod);
        
        if (currentRecords.length === 0) {
            alert('ไม่มีข้อมูลให้ Export สำหรับวันที่และช่วงเวลานี้');
            return;
        }

        // CSV Header
        let csvContent = "\uFEFF"; // Add BOM for Thai characters in Excel
        csvContent += "ลำดับ,ชื่อ-นามสกุล,ชั้น/ห้อง,สถานะ,วันที่,ช่วงเวลา,หมายเหตุ\n";

        // Build Rows
        const rows = currentRecords.map((r, index) => {
            const student = students.find(s => s.id === r.studentId);
            const studentName = student ? `${student.studentTitle}${student.studentName}` : 'ไม่พบข้อมูล';
            const studentClass = student ? student.studentClass : '-';
            const statusThai = r.status === 'present' ? 'มา' : r.status === 'absent' ? 'ขาด' : r.status === 'leave' ? 'ลา' : 'ป่วย';
            
            return `${index + 1},"${studentName}","${studentClass}","${statusThai}","${r.date}","${periodLabel}","${r.note || '-'}"`;
        });

        csvContent += rows.join("\n");

        // Download trigger
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `เช็คชื่อ_${selectedDate.replace(/\//g, '-')}_${periodLabel}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEditFromLog = (classroom: string) => {
        setSelectedClassroom(classroom);
        setSubTab('checkin');
    };

    const handleDeleteFromLog = (ids: string[]) => {
        if (onDeleteAttendance) onDeleteAttendance('student', ids);
    };

    const handleSaveAttendance = () => {
        if (!selectedClassroom) return;
        const currentRoomStudents = students.filter(s => s.studentClass === selectedClassroom);
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
            students.filter(s => s.studentClass === selectedClassroom).forEach(s => {
                const existing = studentAttendance.find(r => r.id === `${selectedDate}_${selectedPeriod}_${s.id}`);
                map[s.id] = existing ? existing.status : 'present';
            });
            setLocalAttendance(map);
        }
    }, [selectedClassroom, selectedDate, selectedPeriod, students, studentAttendance]);

    return (
        <div className="space-y-6 font-sarabun">
            {/* Main Header Card */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-navy flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-2xl">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            </div>
                            ระบบเช็คชื่อนักเรียน
                        </h2>
                        <div className="flex gap-4 mt-2">
                            <input type="date" value={buddhistToISO(selectedDate)} onChange={(e) => setSelectedDate(isoToBuddhist(e.target.value))} className="px-3 py-1 bg-gray-50 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)} className="px-3 py-1 bg-gray-50 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                {enabledPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                        <button onClick={() => setSubTab('stats')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${subTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>สถิติ</button>
                        <button onClick={() => {setSubTab('log'); setSelectedLogClassroom(null);}} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${subTab === 'log' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>ข้อมูลทั้งหมด</button>
                        <button onClick={() => {setSubTab('checkin'); setSelectedClassroom(null);}} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${subTab === 'checkin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>เช็คชื่อ</button>
                    </div>
                </div>
            </div>

            {/* --- TAB: STATISTICS --- */}
            {subTab === 'stats' && (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in">
                    <h3 className="text-lg font-bold text-navy mb-6">ภาพรวมความคืบหน้าการเช็คชื่อ</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={classStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="present" name="มา" stackId="a" fill={COLORS.present} />
                                <Bar dataKey="absent" name="ขาด" stackId="a" fill={COLORS.absent} />
                                <Bar dataKey="leave" name="ลา" stackId="a" fill={COLORS.leave} />
                                <Bar dataKey="sick" name="ป่วย" stackId="a" fill={COLORS.sick} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* --- TAB: LOG (RE-DESIGNED) --- */}
            {subTab === 'log' && (
                <div className="animate-fade-in space-y-6">
                    {!selectedLogClassroom ? (
                        <>
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleExportExcel}
                                    className="bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-6 rounded-2xl shadow-xl shadow-green-100 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Export Excel
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classroomsChecked.length > 0 ? classroomsChecked.map(roomData => (
                                    <button 
                                        key={roomData.room}
                                        onClick={() => setSelectedLogClassroom(roomData.room)}
                                        className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 text-left group hover:shadow-md transition-all active:scale-95"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            </div>
                                            <span className="text-[10px] font-black uppercase bg-gray-100 px-2 py-1 rounded-full text-gray-500">Checked</span>
                                        </div>
                                        <h4 className="text-xl font-black text-navy mb-1">ชั้น {roomData.room}</h4>
                                        <p className="text-sm text-gray-400 font-bold mb-4">เช็คแล้ว {roomData.total} คน</p>
                                        <div className="flex gap-2">
                                            <div className="bg-green-50 text-green-600 text-[10px] px-2 py-1 rounded-lg font-bold">มา {roomData.present}</div>
                                            {roomData.absent > 0 && <div className="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded-lg font-bold">ขาด {roomData.absent}</div>}
                                            {(roomData.leave > 0 || roomData.sick > 0) && <div className="bg-amber-50 text-amber-600 text-[10px] px-2 py-1 rounded-lg font-bold">ลา/ป่วย {roomData.leave + roomData.sick}</div>}
                                        </div>
                                    </button>
                                )) : (
                                    <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed">
                                        <div className="text-gray-400 font-bold">ยังไม่มีข้อมูลการเช็คชื่อในวันนี้</div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 animate-slide-up">
                            <div className="p-6 bg-navy text-white flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedLogClassroom(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <div>
                                        <h3 className="text-xl font-black">ชั้น {selectedLogClassroom}</h3>
                                        <p className="text-xs opacity-70">ประวัติการเช็คชื่อ: {selectedDate} | {enabledPeriods.find(p=>p.id===selectedPeriod)?.label}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditFromLog(selectedLogClassroom)} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all">แก้ไขห้องนี้</button>
                                    <button onClick={() => { if(window.confirm('ลบประวัติทั้งห้อง?')) handleDeleteFromLog(logStudentsForClass.map(r=>r.id)); }} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-bold transition-all">ลบประวัติ</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-4">รูปภาพ</th>
                                            <th className="p-4">ชื่อ-นามสกุล</th>
                                            <th className="p-4 text-center">สถานะ</th>
                                            <th className="p-4 text-center">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logStudentsForClass.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border">
                                                        {getFirstImageSource(item.student?.studentProfileImage) && <img src={getFirstImageSource(item.student?.studentProfileImage)!} className="w-full h-full object-cover" />}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-navy">{item.student?.studentTitle}{item.student?.studentName}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                                        item.status === 'present' ? 'bg-green-50 text-green-600 border-green-200' :
                                                        item.status === 'absent' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                        {item.status === 'present' ? 'มา' : item.status === 'absent' ? 'ขาด' : 'ลา/ป่วย'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => handleDeleteFromLog([item.id])} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: CHECK-IN --- */}
            {subTab === 'checkin' && (
                <>
                    {!selectedClassroom ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-fade-in">
                            {allClassrooms.map(room => {
                                const st = classroomStatus[room];
                                const isDone = st.checked >= st.total && st.total > 0;
                                return (
                                    <button key={room} onClick={() => setSelectedClassroom(room)} className={`p-5 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-2 shadow-sm active:scale-95 ${isDone ? 'bg-green-50 border-green-500' : 'bg-white border-gray-100 hover:border-blue-400'}`}>
                                        <div className={`p-3 rounded-2xl ${isDone ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                                        <h4 className="font-black text-navy">{room}</h4>
                                        <p className={`text-[10px] font-bold ${isDone ? 'text-green-600' : 'text-gray-400'}`}>{isDone ? 'เช็คครบแล้ว' : `เช็คแล้ว ${st.checked}/${st.total}`}</p>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 animate-slide-up">
                            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedClassroom(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                                    <div><h3 className="text-xl font-black">ชั้น {selectedClassroom}</h3><p className="text-xs opacity-80">{selectedDate} | {enabledPeriods.find(p=>p.id===selectedPeriod)?.label}</p></div>
                                </div>
                                <button onClick={() => { const newMap = {...localAttendance}; students.filter(s => s.studentClass === selectedClassroom).forEach(s => newMap[s.id] = 'present'); setLocalAttendance(newMap); }} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all">เช็คมาทั้งหมด</button>
                            </div>
                            <div className="p-6">
                                <div className="divide-y divide-gray-100">
                                    {students.filter(s => s.studentClass === selectedClassroom).map((s, idx) => (
                                        <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-black text-gray-300 w-6">{idx + 1}</span>
                                                <div className="w-12 h-12 rounded-2xl bg-gray-100 border overflow-hidden relative">
                                                    {getFirstImageSource(s.studentProfileImage) ? <img src={getFirstImageSource(s.studentProfileImage)!} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-400 font-bold">{s.studentName.charAt(0)}</div>}
                                                </div>
                                                <div><p className="font-bold text-navy">{s.studentTitle}{s.studentName}</p><p className="text-xs text-gray-400">ชื่อเล่น: {s.studentNickname || '-'}</p></div>
                                            </div>
                                            <div className="flex gap-2">
                                                {['present', 'absent', 'leave', 'sick'].map(st => (
                                                    <button key={st} onClick={() => setLocalAttendance(prev => ({...prev, [s.id]: st as AttendanceStatus}))} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${localAttendance[s.id] === st ? (st === 'present' ? 'bg-green-500 text-white border-green-600' : st === 'absent' ? 'bg-red-500 text-white border-red-600' : 'bg-amber-500 text-white border-amber-600') : 'bg-white text-gray-400 border-gray-200 hover:border-blue-400'}`}>
                                                        {st === 'present' ? 'มา' : st === 'absent' ? 'ขาด' : st === 'leave' ? 'ลา' : 'ป่วย'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 flex justify-end gap-3">
                                    <button onClick={() => setSelectedClassroom(null)} className="px-8 py-3 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">ยกเลิก</button>
                                    <button onClick={handleSaveAttendance} disabled={isSaving} className="px-10 py-3 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
                                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AttendancePage;
