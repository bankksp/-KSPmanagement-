
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Personnel, StudentAttendance, PersonnelAttendance, TimePeriod, AttendanceStatus, Settings } from '../types';
import { DEFAULT_ATTENDANCE_PERIODS } from '../constants';
import { getFirstImageSource, buddhistToISO, isoToBuddhist, getCurrentThaiDate, toStrictThaiDateString, formatThaiDate } from '../utils';

interface AttendancePageProps {
    mode: 'student' | 'personnel';
    students: Student[];
    personnel: Personnel[];
    studentAttendance: StudentAttendance[];
    personnelAttendance: PersonnelAttendance[];
    onSaveStudentAttendance: (data: StudentAttendance[]) => Promise<void>;
    onSavePersonnelAttendance: (data: PersonnelAttendance[]) => Promise<void>;
    onDeleteAttendance?: (t: 'student' | 'personnel', ids: string[]) => void;
    isSaving: boolean;
    currentUser: Personnel | null;
    settings?: Settings;
    onRefresh?: () => void;
}

const AttendancePage: React.FC<AttendancePageProps> = ({
    mode, students, personnel, studentAttendance, personnelAttendance, 
    onSaveStudentAttendance, onSavePersonnelAttendance, onDeleteAttendance, 
    isSaving, settings, onRefresh
}) => {
    // --- State Management ---
    const [activeTab, setActiveTab] = useState<'checkin' | 'summary' | 'history'>('checkin');
    const [selectedDate, setSelectedDate] = useState(getCurrentThaiDate());
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('morning_act');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [localAttendance, setLocalAttendance] = useState<Record<number, AttendanceStatus>>({});
    
    // State สำหรับ Modal รายชื่อละเอียด
    const [detailModal, setDetailModal] = useState<{ isOpen: boolean; className: string; periodLabel: string; periodId: string } | null>(null);

    // บังคับให้วันที่เลือกอยู่ในรูปแบบ 01/01/2569 เสมอ
    const unifiedDate = useMemo(() => toStrictThaiDateString(selectedDate), [selectedDate]);

    const enabledPeriods = useMemo(() => {
        return (settings?.attendancePeriods || DEFAULT_ATTENDANCE_PERIODS).filter(p => p.enabled);
    }, [settings]);

    const allClassrooms = useMemo(() => {
        return Array.from(new Set(students.map(s => s.studentClass))).sort();
    }, [students]);

    // ข้อมูลดิบตามโหมด (นักเรียน/บุคลากร)
    const rawData = mode === 'student' ? studentAttendance : personnelAttendance;
    
    const activeTargetList = useMemo(() => {
        if (mode === 'personnel') return personnel;
        return students.filter(s => !selectedClass || s.studentClass === selectedClass);
    }, [students, personnel, selectedClass, mode]);

    // โหลดข้อมูลเก่าเข้าสู่สถานะท้องถิ่น (Local State) เพื่อแก้ไข
    useEffect(() => {
        if (activeTab !== 'checkin') return;
        const newLocal: Record<number, AttendanceStatus> = {};
        const currentRecords = rawData.filter(r => r.date === unifiedDate && r.period === selectedPeriod);
        
        activeTargetList.forEach(item => {
            const match = currentRecords.find(r => {
                const rId = mode === 'student' ? (r as StudentAttendance).studentId : (r as PersonnelAttendance).personnelId;
                return String(rId) === String(item.id);
            });
            newLocal[item.id] = match ? match.status : 'present';
        });
        setLocalAttendance(newLocal);
    }, [unifiedDate, selectedPeriod, selectedClass, mode, activeTargetList, rawData, activeTab]);

    // --- Handlers ---
    const handleBatchSave = async () => {
        if (activeTargetList.length === 0) return;

        try {
            if (mode === 'student') {
                const data: StudentAttendance[] = activeTargetList.map(s => ({
                    id: `std-${s.id}-${unifiedDate.replace(/\//g,'')}-${selectedPeriod}`,
                    date: unifiedDate,
                    period: selectedPeriod,
                    studentId: s.id,
                    status: localAttendance[s.id] || 'present'
                }));
                await onSaveStudentAttendance(data);
            } else {
                const data: PersonnelAttendance[] = activeTargetList.map(p => ({
                    id: `per-${p.id}-${unifiedDate.replace(/\//g,'')}-${selectedPeriod}`,
                    date: unifiedDate,
                    period: selectedPeriod,
                    personnelId: p.id,
                    status: localAttendance[p.id] || 'present'
                }));
                await onSavePersonnelAttendance(data);
            }
            alert('บันทึกสำเร็จ');
            if (onRefresh) onRefresh();
            setActiveTab('summary');
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    const handleExportDailyExcel = () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        const header = ["ห้องเรียน", ...enabledPeriods.map(p => p.label)].join(",");
        csvContent += header + "\r\n";

        allClassrooms.forEach(cls => {
            const row = [cls];
            enabledPeriods.forEach(p => {
                const classStudents = students.filter(s => s.studentClass === cls);
                const records = studentAttendance.filter(r => r.date === unifiedDate && r.period === p.id);
                const classRecords = records.filter(r => classStudents.some(s => String(s.id) === String(r.studentId)));
                
                if (classRecords.length === 0) {
                    row.push("-");
                } else {
                    const present = classRecords.filter(r => r.status === 'present' || r.status === 'activity').length;
                    row.push(`${present}/${classStudents.length}`);
                }
            });
            csvContent += row.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `summary_attendance_${unifiedDate.replace(/\//g,'-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusInfo = (status: AttendanceStatus) => {
        switch(status) {
            case 'present': return { label: 'มา', color: 'bg-emerald-500', text: 'text-emerald-600', lightColor: 'bg-emerald-50' };
            case 'absent': return { label: 'ขาด', color: 'bg-rose-500', text: 'text-rose-600', lightColor: 'bg-rose-50' };
            case 'leave': return { label: 'ลา', color: 'bg-amber-500', text: 'text-amber-600', lightColor: 'bg-amber-50' };
            case 'sick': return { label: 'ป่วย', color: 'bg-orange-500', text: 'text-orange-600', lightColor: 'bg-orange-50' };
            case 'activity': return { label: 'กิจกรรม', color: 'bg-blue-500', text: 'text-blue-600', lightColor: 'bg-blue-50' };
            case 'home': return { label: 'กลับบ้าน', color: 'bg-slate-500', text: 'text-slate-600', lightColor: 'bg-slate-50' };
            default: return { label: '-', color: 'bg-gray-200', text: 'text-gray-400', lightColor: 'bg-gray-50' };
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in font-sarabun text-sm">
            {/* --- GLOBAL FILTERS --- */}
            <div className="bg-white/80 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] shadow-xl border border-white/50 flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${mode === 'student' ? 'bg-blue-600 shadow-blue-200' : 'bg-purple-600 shadow-purple-200'} text-white shadow-lg`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-navy tracking-tight leading-none">ระบบเช็คชื่อ{mode === 'student' ? 'นักเรียน' : 'บุคลากร'}</h2>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Attendance Management</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow lg:flex-grow-0">
                        <input 
                            type="date" 
                            value={buddhistToISO(selectedDate)}
                            onChange={(e) => setSelectedDate(isoToBuddhist(e.target.value))}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-navy focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                        />
                        <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    {onRefresh && (
                        <button onClick={onRefresh} className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-blue-50 text-blue-600 transition-all shadow-md active:scale-90">
                            <svg className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* --- TAB NAVIGATION --- */}
            <div className="flex bg-white/40 backdrop-blur-md p-1 rounded-2xl border border-white/50 w-fit shadow-sm">
                {[
                    { id: 'checkin', label: 'เช็คชื่อ', icon: '✍️' },
                    { id: 'summary', label: 'สรุปวันนี้รายห้อง', icon: '🏢' },
                    { id: 'history', label: 'ประวัติย้อนหลัง', icon: '📅' }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-navy shadow-md' : 'text-gray-500 hover:text-navy'}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* --- TAB: CHECK-IN --- */}
            {activeTab === 'checkin' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-end gap-6">
                        <div className="w-full md:w-48 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เลือกรอบเวลา</label>
                            <select 
                                value={selectedPeriod} 
                                onChange={e => setSelectedPeriod(e.target.value as TimePeriod)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-black text-navy outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none shadow-inner"
                            >
                                {enabledPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                            </select>
                        </div>
                        {mode === 'student' && (
                            <div className="flex-grow space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เลือกห้องเรียน</label>
                                <select 
                                    value={selectedClass} 
                                    onChange={e => setSelectedClass(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3 font-black text-navy outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none shadow-inner"
                                >
                                    <option value="">-- ทุกห้องเรียน --</option>
                                    {allClassrooms.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                        <button 
                            onClick={() => {
                                const next = { ...localAttendance };
                                activeTargetList.forEach(i => next[i.id] = 'present');
                                setLocalAttendance(next);
                            }}
                            className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            มาเรียนทั้งหมด
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/80 text-gray-400 font-black text-[9px] uppercase tracking-widest border-b">
                                    <tr>
                                        <th className="p-4 text-center w-16">#</th>
                                        <th className="p-4">ข้อมูลนักเรียน</th>
                                        <th className="p-4 text-center">สถานะการลงชื่อ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {activeTargetList.map((item, idx) => {
                                        const status = localAttendance[item.id] || 'present';
                                        const info = getStatusInfo(status);
                                        const profileImg = getFirstImageSource(mode === 'student' ? (item as Student).studentProfileImage : (item as Personnel).profileImage);
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-blue-50/20 transition-all group">
                                                <td className="p-4 text-center font-black text-gray-300">{idx + 1}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                                                            {profileImg ? <img src={profileImg} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black">{(mode === 'student' ? (item as Student).studentName : (item as Personnel).personnelName).charAt(0)}</div>}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-navy text-sm leading-tight truncate">
                                                                {mode === 'student' ? `${(item as Student).studentTitle}${(item as Student).studentName}` : `${(item as Personnel).personnelTitle}${(item as Personnel).personnelName}`}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                                                                {mode === 'student' ? (item as Student).studentClass : (item as Personnel).position}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-1 flex-wrap max-w-md mx-auto">
                                                        {['present', 'absent', 'leave', 'sick', 'activity', 'home'].map(opt => {
                                                            const optInfo = getStatusInfo(opt as any);
                                                            const isActive = status === opt;
                                                            return (
                                                                <button 
                                                                    key={opt}
                                                                    onClick={() => setLocalAttendance({ ...localAttendance, [item.id]: opt as AttendanceStatus })}
                                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? `${optInfo.color} text-white shadow-lg scale-105 z-10` : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                                                >
                                                                    {optInfo.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-center sm:justify-end">
                            <button 
                                onClick={handleBatchSave}
                                disabled={isSaving}
                                className="bg-navy text-white px-12 py-4 rounded-[1.5rem] font-black text-base shadow-2xl shadow-blue-900/30 hover:bg-blue-950 transition-all flex items-center gap-3 disabled:opacity-50"
                            >
                                {isSaving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทั้งหมด'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: SUMMARY MATRIX --- */}
            {activeTab === 'summary' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-navy leading-none">สรุปรายห้อง</h3>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Matrix View ({unifiedDate})</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleExportDailyExcel}
                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21.17 3.25Q21.5 3.25 21.76 3.5 22.04 3.73 22.04 4.13V19.87Q22.04 20.27 21.76 20.5 21.5 20.75 21.17 20.75H14.83Q14.5 20.75 14.26 20.5 14 20.27 14 19.87V4.13Q14 3.73 14 19.87V4.13Q14 3.73 14.26 3.5 14.5 3.25 14.83 3.25H21.17M12 3.25Q12.33 3.25 12.59 3.5 12.87 3.73 12.87 4.13V19.87Q12.87 20.27 12.59 20.5 12.33 20.75 12 20.75H2.83Q2.5 20.75 2.26 20.5 2 20.27 2 19.87V4.13Q2 3.73 2.26 3.5 2.5 3.25 2.83 3.25H12M4 5V19H11V5H4M16 5V19H20V5H16Z" /></svg>
                                    Export Daily Excel
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-[2rem] border border-gray-100">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-navy text-white font-bold text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th className="p-5 sticky left-0 bg-navy z-10 min-w-[150px]">ห้องเรียน</th>
                                        {enabledPeriods.map(p => (
                                            <th key={p.id} className="p-5 text-center min-w-[120px] border-l border-white/10">{p.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allClassrooms.map(cls => (
                                        <tr key={cls} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-5 font-black text-navy sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r">{cls}</td>
                                            {enabledPeriods.map(period => {
                                                const records = studentAttendance.filter(r => r.date === unifiedDate && r.period === period.id);
                                                const classStudents = students.filter(s => s.studentClass === cls);
                                                const classRecords = records.filter(r => classStudents.some(s => String(s.id) === String(r.studentId)));
                                                
                                                if (classRecords.length === 0) return <td key={period.id} className="p-5 text-center text-gray-300 italic text-[10px] bg-gray-50/30">รอดำเนินการ</td>;
                                                
                                                const present = classRecords.filter(r => r.status === 'present' || r.status === 'activity').length;
                                                const absent = classRecords.filter(r => r.status === 'absent').length;
                                                const leave = classRecords.filter(r => r.status === 'leave' || r.status === 'sick').length;
                                                const percent = Math.round((present / classStudents.length) * 100);

                                                return (
                                                    <td key={period.id} className="p-5 text-center border-l border-gray-50">
                                                        <button 
                                                            onClick={() => setDetailModal({ isOpen: true, className: cls, periodLabel: period.label, periodId: period.id })}
                                                            className="flex flex-col items-center gap-1 w-full hover:bg-blue-50/50 p-2 rounded-xl transition-all active:scale-95"
                                                        >
                                                            <div className="text-sm font-black text-navy">{present} <span className="text-[10px] text-gray-300">/ {classStudents.length}</span></div>
                                                            <div className="flex gap-1">
                                                                {absent > 0 && <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md text-[8px] font-black">-{absent}</span>}
                                                                {leave > 0 && <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md text-[8px] font-black">ล{leave}</span>}
                                                            </div>
                                                            <div className="w-10 bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                                                                <div className={`h-full ${percent > 90 ? 'bg-emerald-500' : percent > 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${percent}%`}}></div>
                                                            </div>
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: HISTORY --- */}
            {activeTab === 'history' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="text-2xl font-black text-navy mb-8 tracking-tight">ประวัติย้อนหลัง</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(() => {
                                const groups: Record<string, any> = {};
                                rawData.forEach(r => {
                                    let groupName = 'บุคลากร';
                                    if (mode === 'student') {
                                        const s = students.find(std => String(std.id) === String((r as StudentAttendance).studentId));
                                        groupName = s ? s.studentClass : 'ไม่ระบุ';
                                    }
                                    const key = `${r.date}-${groupName}`;
                                    if (!groups[key]) groups[key] = { date: r.date, name: groupName, stats: { present: 0, total: 0 }, periods: new Set() };
                                    
                                    groups[key].periods.add(r.period);
                                    groups[key].stats.total++;
                                    if (r.status === 'present' || r.status === 'activity') groups[key].stats.present++;
                                });

                                return Object.values(groups)
                                    .sort((a: any, b: any) => {
                                        const da = a.date.split('/').reverse().join('');
                                        const db = b.date.split('/').reverse().join('');
                                        return db.localeCompare(da);
                                    })
                                    .map((g: any, i) => (
                                        <div key={i} className="bg-gray-50/50 border border-gray-100 p-6 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all group relative overflow-hidden">
                                            <div className="relative z-10">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{g.date}</p>
                                                <h4 className="text-lg font-black text-navy mb-4 tracking-tight leading-tight">{g.name}</h4>
                                                <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-gray-300 uppercase mb-0.5">Periods</p>
                                                        <p className="text-base font-black text-primary-blue">{g.periods.size}</p>
                                                    </div>
                                                    <div className="w-[1px] h-6 bg-gray-100"></div>
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-gray-300 uppercase mb-0.5">Attend</p>
                                                        <p className="text-base font-black text-emerald-500">{Math.round((g.stats.present / g.stats.total) * 100)}%</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => { setSelectedDate(g.date); setSelectedClass(g.name === 'บุคลากร' ? '' : g.name); setActiveTab('summary'); }}
                                                    className="w-full mt-4 py-2 bg-white text-navy font-black text-[9px] uppercase tracking-widest rounded-lg border border-gray-200 hover:bg-navy hover:text-white transition-all shadow-sm"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: STUDENT ATTENDANCE DETAIL --- */}
            {detailModal?.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-fade-in-up">
                        <div className="p-6 md:p-8 bg-navy text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black">{detailModal.className}</h3>
                                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">
                                    {detailModal.periodLabel} | {unifiedDate}
                                </p>
                            </div>
                            <button onClick={() => setDetailModal(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">
                            {(() => {
                                const classStudents = students.filter(s => s.studentClass === detailModal.className);
                                const records = studentAttendance.filter(r => r.date === unifiedDate && r.period === detailModal.periodId);
                                
                                const groups: Record<AttendanceStatus, Student[]> = {
                                    present: [], absent: [], leave: [], sick: [], activity: [], home: []
                                };
                                
                                classStudents.forEach(student => {
                                    const rec = records.find(r => String(r.studentId) === String(student.id));
                                    const status = rec ? rec.status : 'absent'; // หรือตาม Logic คุณ
                                    if (groups[status]) groups[status].push(student);
                                });

                                return (['present', 'absent', 'leave', 'sick', 'activity', 'home'] as AttendanceStatus[]).map(status => {
                                    const studentsInGroup = groups[status];
                                    if (studentsInGroup.length === 0) return null;
                                    const info = getStatusInfo(status);

                                    return (
                                        <div key={status} className="space-y-3">
                                            <div className="flex items-center gap-2 px-2">
                                                <span className={`w-2 h-2 rounded-full ${info.color}`}></span>
                                                <h4 className="font-black text-navy text-xs uppercase tracking-widest">{info.label} ({studentsInGroup.length})</h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {studentsInGroup.map(s => (
                                                    <div key={s.id} className={`${info.lightColor} p-3 rounded-2xl border border-white flex items-center gap-3 shadow-sm`}>
                                                        <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex-shrink-0 shadow-sm border border-gray-50">
                                                            {getFirstImageSource(s.studentProfileImage) ? (
                                                                <img src={getFirstImageSource(s.studentProfileImage)!} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-sm">{s.studentName.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-navy text-xs truncate leading-none mb-1">{s.studentTitle}{s.studentName}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase truncate">#{s.studentNickname || '-'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        
                        <div className="p-6 border-t border-gray-50 flex justify-center bg-gray-50/50 rounded-b-[2.5rem]">
                            <button onClick={() => setDetailModal(null)} className="px-10 py-2.5 bg-white border border-gray-200 text-navy font-bold rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-xs">ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
