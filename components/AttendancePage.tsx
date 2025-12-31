
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Personnel, StudentAttendance, PersonnelAttendance, TimePeriod, AttendanceStatus, Settings } from '../types';
import { DEFAULT_ATTENDANCE_PERIODS } from '../constants';
import { getFirstImageSource, buddhistToISO, isoToBuddhist, getCurrentThaiDate, formatThaiDate } from '../utils';
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
    sick: '#F97316',
    activity: '#3B82F6'
};

const AttendancePage: React.FC<AttendancePageProps> = ({
    mode, students, personnel, studentAttendance, personnelAttendance, 
    onSaveStudentAttendance, onSavePersonnelAttendance, onDeleteAttendance, 
    isSaving, settings, onRefresh, currentUser
}) => {
    const [subTab, setSubTab] = useState<'checkin' | 'log' | 'history' | 'stats'>('checkin');
    const [selectedDate, setSelectedDate] = useState(getCurrentThaiDate());
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('morning_act');
    
    // Search & Filter States
    const [historySearchName, setHistorySearchName] = useState('');
    const [historyFilterDate, setHistoryFilterDate] = useState(''); // เริ่มต้นเป็นว่างเพื่อให้เห็นข้อมูลทั้งหมด
    const [historyFilterClass, setHistoryFilterClass] = useState('');
    const [historyFilterPeriod, setHistoryFilterPeriod] = useState('');
    
    // For Student Mode (Check-in)
    const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
    const [localAttendance, setLocalAttendance] = useState<Record<number, AttendanceStatus>>({});

    const enabledPeriods = useMemo(() => {
        const periods = (settings?.attendancePeriods || DEFAULT_ATTENDANCE_PERIODS).filter(p => p.enabled);
        return periods.length > 0 ? periods : DEFAULT_ATTENDANCE_PERIODS;
    }, [settings]);

    const activeList = useMemo(() => {
        if (mode === 'personnel') return personnel;
        if (!selectedClassroom) return [];
        return students.filter(s => s.studentClass === selectedClassroom);
    }, [mode, students, personnel, selectedClassroom]);

    // JOIN DATA FOR HISTORY (Fix: Robust ID comparison)
    const joinedHistory = useMemo(() => {
        const rawData = mode === 'student' ? studentAttendance : personnelAttendance;
        return rawData.map(record => {
            if (mode === 'student') {
                const sRecord = record as StudentAttendance;
                const student = students.find(s => String(s.id) === String(sRecord.studentId));
                return {
                    ...sRecord,
                    name: student ? `${student.studentTitle}${student.studentName}` : 'ไม่พบข้อมูลนักเรียน (ลบแล้ว)',
                    subInfo: student ? student.studentClass : '-',
                    image: student ? student.studentProfileImage : []
                };
            } else {
                const pRecord = record as PersonnelAttendance;
                const person = personnel.find(p => String(p.id) === String(pRecord.personnelId));
                return {
                    ...pRecord,
                    name: person ? `${person.personnelTitle}${person.personnelName}` : 'ไม่พบข้อมูลบุคลากร (ลบแล้ว)',
                    subInfo: person ? person.position : '-',
                    image: person ? person.profileImage : []
                };
            }
        });
    }, [mode, studentAttendance, personnelAttendance, students, personnel]);

    // FILTERED HISTORY (Fix: Date filter is now optional)
    const filteredHistory = useMemo(() => {
        return joinedHistory.filter(item => {
            const matchesName = item.name.toLowerCase().includes(historySearchName.toLowerCase());
            const matchesDate = !historyFilterDate || item.date === historyFilterDate;
            const matchesClass = !historyFilterClass || item.subInfo === historyFilterClass;
            const matchesPeriod = !historyFilterPeriod || item.period === historyFilterPeriod;
            return matchesName && matchesDate && matchesClass && matchesPeriod;
        }).sort((a, b) => {
            // Sort by Date (Descending) and then by ID
            const dateA = a.date.split('/').reverse().join('');
            const dateB = b.date.split('/').reverse().join('');
            if (dateB !== dateA) return dateB.localeCompare(dateA);
            return b.id.toString().localeCompare(a.id.toString());
        });
    }, [joinedHistory, historySearchName, historyFilterDate, historyFilterClass, historyFilterPeriod]);

    // --- AUTO-RETRIEVE DATA FOR SELECTED DAY ---
    useEffect(() => {
        if (activeList.length === 0) return;

        const newLocal: Record<number, AttendanceStatus> = {};
        const dayRecords = (mode === 'student' ? studentAttendance : personnelAttendance)
            .filter(r => r.date === selectedDate && r.period === selectedPeriod);

        activeList.forEach(item => {
            const match = dayRecords.find(r => {
                const rId = mode === 'student' ? (r as StudentAttendance).studentId : (r as PersonnelAttendance).personnelId;
                return String(rId) === String(item.id);
            });
            if (match) newLocal[item.id] = match.status;
        });
        setLocalAttendance(newLocal);
    }, [selectedDate, selectedPeriod, selectedClassroom, mode, activeList, studentAttendance, personnelAttendance]);

    // Summary Logs - บันทึกประวัติวันนี้
    const summaryLogs = useMemo(() => {
        const data = mode === 'student' ? studentAttendance : personnelAttendance;
        const groups: Record<string, any> = {};
        const filteredData = data.filter(r => r.date === selectedDate);

        filteredData.forEach(r => {
            let groupKey = '';
            if (mode === 'student') {
                const sId = (r as StudentAttendance).studentId;
                const person = students.find(s => String(s.id) === String(sId));
                groupKey = person ? person.studentClass : 'ไม่ระบุชั้นเรียน';
            } else {
                groupKey = 'บุคลากรทั้งหมด';
            }
            
            const key = `${r.period}-${groupKey}`;
            if (!groups[key]) {
                groups[key] = { period: r.period, group: groupKey, present: 0, absent: 0, leave: 0, sick: 0, activity: 0, total: 0, ids: [] };
            }
            groups[key].total++;
            groups[key].ids.push(r.id);
            if (r.status in groups[key]) groups[key][r.status]++;
        });

        return Object.values(groups).sort((a, b) => {
            const order = enabledPeriods.findIndex(p => p.id === a.period) - enabledPeriods.findIndex(p => p.id === b.period);
            if (order !== 0) return order;
            return a.group.localeCompare(b.group);
        });
    }, [mode, studentAttendance, personnelAttendance, students, personnel, selectedDate, enabledPeriods]);

    const handleBatchSave = () => {
        if (activeList.length === 0) return;
        
        if (mode === 'student') {
            const records: StudentAttendance[] = activeList.map(s => ({
                id: `sa-${s.id}-${selectedDate.replace(/\//g,'')}-${selectedPeriod}`,
                date: selectedDate,
                period: selectedPeriod,
                studentId: s.id,
                status: localAttendance[s.id] || 'present'
            }));
            onSaveStudentAttendance(records);
        } else {
            const records: PersonnelAttendance[] = activeList.map(p => ({
                id: `pa-${p.id}-${selectedDate.replace(/\//g,'')}-${selectedPeriod}`,
                date: selectedDate,
                period: selectedPeriod,
                personnelId: p.id,
                status: localAttendance[p.id] || 'present'
            }));
            onSavePersonnelAttendance(records);
        }
        alert('บันทึกข้อมูลเรียบร้อย');
    };

    const studentClasses = useMemo(() => Array.from(new Set(students.map(s => s.studentClass))).sort(), [students]);
    const personnelPositions = useMemo(() => Array.from(new Set(personnel.map(p => p.position))).sort(), [personnel]);

    const getStatusText = (status: string) => {
        switch(status) {
            case 'present': return 'มา';
            case 'absent': return 'ขาด';
            case 'leave': return 'ลา';
            case 'sick': return 'ป่วย';
            case 'activity': return 'กิจกรรม';
            default: return status;
        }
    };

    return (
        <div className="space-y-6 font-sarabun pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-black text-navy tracking-tight">
                        {mode === 'student' ? 'เช็คชื่อนักเรียน' : 'เช็คชื่อบุคลากร'}
                    </h2>
                    <p className="text-gray-500 text-sm">การจัดการและบันทึกเวลาปฏิบัติงาน/เรียน</p>
                </div>
                <div className="flex gap-2">
                    {subTab !== 'history' && (
                        <input 
                            type="date" 
                            value={buddhistToISO(selectedDate)}
                            onChange={(e) => setSelectedDate(isoToBuddhist(e.target.value))}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-primary-blue shadow-sm outline-none"
                        />
                    )}
                    {onRefresh && (
                        <button onClick={onRefresh} className="p-2 bg-white border rounded-xl hover:bg-gray-50 text-gray-400" title="รีเฟรชข้อมูล">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white/50 p-1 rounded-2xl border border-gray-200 w-fit no-print shadow-sm overflow-x-auto max-w-full">
                <button onClick={() => setSubTab('checkin')} className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${subTab === 'checkin' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ลงทะเบียนใหม่</button>
                <button onClick={() => setSubTab('log')} className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${subTab === 'log' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>สรุปวันนี้</button>
                <button onClick={() => setSubTab('history')} className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${subTab === 'history' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ประวัติย้อนหลัง</button>
                <button onClick={() => setSubTab('stats')} className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${subTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>สถิติ</button>
            </div>

            {/* CHECK-IN VIEW */}
            {subTab === 'checkin' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ช่วงเวลา</label>
                            <div className="grid grid-cols-2 gap-2">
                                {enabledPeriods.map(p => (
                                    <button 
                                        key={p.id} 
                                        onClick={() => setSelectedPeriod(p.id as TimePeriod)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedPeriod === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {mode === 'student' && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ชั้นเรียน</label>
                                <select 
                                    value={selectedClassroom || ''} 
                                    onChange={e => setSelectedClassroom(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-navy outline-none focus:ring-2 focus:ring-primary-blue"
                                >
                                    <option value="">-- เลือกชั้นเรียน --</option>
                                    {studentClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="md:col-span-2 lg:col-span-1 flex flex-col justify-end">
                             <button 
                                onClick={() => {
                                    const next = { ...localAttendance };
                                    activeList.forEach(item => next[item.id] = 'present');
                                    setLocalAttendance(next);
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95 text-sm"
                                disabled={activeList.length === 0}
                             >
                                ทำเครื่องหมาย "มาเรียนทั้งหมด"
                             </button>
                        </div>
                    </div>

                    {activeList.length > 0 ? (
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b">
                                    <tr>
                                        <th className="p-5 text-center w-16">#</th>
                                        <th className="p-5">ข้อมูลพื้นฐาน</th>
                                        <th className="p-5 text-center">สถานะการเช็คชื่อ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {activeList.map((item, idx) => {
                                        const status = localAttendance[item.id] || 'present';
                                        const profileImg = getFirstImageSource(mode === 'student' ? (item as Student).studentProfileImage : (item as Personnel).profileImage);
                                        return (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="p-5 text-center font-bold text-gray-300">{idx + 1}</td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                                            {profileImg ? (
                                                                <img src={profileImg} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-xs font-bold text-gray-400">{(mode === 'student' ? (item as Student).studentName : (item as Personnel).personnelName).charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-navy">
                                                                {mode === 'student' ? `${(item as Student).studentTitle}${(item as Student).studentName}` : `${(item as Personnel).personnelTitle}${(item as Personnel).personnelName}`}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                                {mode === 'student' ? (item as Student).studentNickname : (item as Personnel).position}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex justify-center gap-1">
                                                        {[
                                                            { id: 'present', label: 'มา', color: 'bg-emerald-500' },
                                                            { id: 'sick', label: 'ป่วย', color: 'bg-orange-500' },
                                                            { id: 'leave', label: 'ลา', color: 'bg-amber-500' },
                                                            { id: 'absent', label: 'ขาด', color: 'bg-rose-500' },
                                                            ...(mode === 'personnel' ? [{ id: 'activity', label: 'กิจกรรม', color: 'bg-blue-500' }] : [])
                                                        ].map(opt => (
                                                            <button 
                                                                key={opt.id}
                                                                onClick={() => setLocalAttendance({ ...localAttendance, [item.id]: opt.id as AttendanceStatus })}
                                                                className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${status === opt.id ? `${opt.color} text-white shadow-md scale-105` : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="p-8 bg-gray-50 flex justify-end">
                                <button 
                                    onClick={handleBatchSave}
                                    disabled={isSaving}
                                    className="bg-navy text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกรายการ'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200 text-gray-300">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <p className="font-black italic text-lg tracking-tight">กรุณาเลือก{mode === 'student' ? 'ชั้นเรียน' : 'ฝ่าย'}ที่ต้องการจัดการข้อมูล</p>
                        </div>
                    )}
                </div>
            )}

            {/* HISTORY TAB (Fix: Now defaults to showing all historical data) */}
            {subTab === 'history' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ค้นหาชื่อ</label>
                            <input 
                                type="text" 
                                value={historySearchName}
                                onChange={e => setHistorySearchName(e.target.value)}
                                placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-blue outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">วันที่ (เลือกได้)</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={historyFilterDate ? buddhistToISO(historyFilterDate) : ''}
                                    onChange={e => setHistoryFilterDate(e.target.value ? isoToBuddhist(e.target.value) : '')}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-navy"
                                />
                                {historyFilterDate && <button onClick={() => setHistoryFilterDate('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">&times;</button>}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{mode === 'student' ? 'ชั้นเรียน' : 'ตำแหน่ง'}</label>
                            <select 
                                value={historyFilterClass}
                                onChange={e => setHistoryFilterClass(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-navy"
                            >
                                <option value="">แสดงทั้งหมด</option>
                                {(mode === 'student' ? studentClasses : personnelPositions).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ช่วงเวลา</label>
                            <select 
                                value={historyFilterPeriod}
                                onChange={e => setHistoryFilterPeriod(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-navy"
                            >
                                <option value="">แสดงทั้งหมด</option>
                                {enabledPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">ประวัติการเช็คชื่อทั้งหมด ({filteredHistory.length} รายการ)</span>
                            <button onClick={onRefresh} className="text-xs font-bold text-primary-blue hover:underline">รีเฟรชข้อมูลล่าสุด</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100/50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b">
                                    <tr>
                                        <th className="p-5">วันที่</th>
                                        <th className="p-5">รายชื่อ</th>
                                        <th className="p-5">{mode === 'student' ? 'ชั้นเรียน' : 'ฝ่าย'}</th>
                                        <th className="p-5">ช่วงเวลา</th>
                                        <th className="p-5 text-center">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredHistory.map((item, idx) => {
                                        const profileImg = getFirstImageSource(item.image);
                                        return (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="p-5 whitespace-nowrap">
                                                    <div className="font-bold text-navy">{item.date}</div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                                            {profileImg ? (
                                                                <img src={profileImg} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-[10px] font-bold text-gray-400">{item.name.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-gray-700">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-gray-500 font-medium">{item.subInfo}</td>
                                                <td className="p-5 font-medium text-gray-400">{enabledPeriods.find(p => p.id === item.period)?.label || item.period}</td>
                                                <td className="p-5 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                                        item.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        item.status === 'absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        item.status === 'sick' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                        {getStatusText(item.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredHistory.length === 0 && (
                                        <tr><td colSpan={5} className="p-24 text-center text-gray-300 font-black italic text-lg tracking-tight">ไม่พบประวัติการเช็คชื่อตามเงื่อนไขที่ค้นหา</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* LOG VIEW (Today Summary) */}
            {subTab === 'log' && (
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-navy text-xl tracking-tight">สรุปข้อมูลประจำวันที่ {selectedDate}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100/50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b">
                                <tr>
                                    <th className="p-5">ช่วงเวลา</th>
                                    <th className="p-5">{mode === 'student' ? 'ชั้นเรียน' : 'กลุ่ม'}</th>
                                    <th className="p-5 text-center">มาเรียน</th>
                                    <th className="p-5 text-center">ป่วย/ลา</th>
                                    <th className="p-5 text-center">ขาด</th>
                                    <th className="p-5 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {summaryLogs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-5 font-bold text-navy">{enabledPeriods.find(p => p.id === log.period)?.label || log.period}</td>
                                        <td className="p-5 font-medium text-gray-600">{log.group}</td>
                                        <td className="p-5 text-center font-black text-emerald-500">{log.present + log.activity} <span className="text-[10px] text-gray-400 font-normal">/ {log.total}</span></td>
                                        <td className="p-5 text-center font-black text-orange-500">{log.sick + log.leave}</td>
                                        <td className="p-5 text-center font-black text-rose-500">{log.absent}</td>
                                        <td className="p-5 text-center">
                                            <button 
                                                onClick={() => onDeleteAttendance?.(mode, log.ids)}
                                                className="text-rose-500 hover:text-rose-700 font-black text-xs uppercase tracking-widest"
                                            >
                                                ลบรายการ
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {summaryLogs.length === 0 && (
                                    <tr><td colSpan={6} className="p-24 text-center text-gray-300 font-black italic text-lg tracking-tight">ยังไม่มีการบันทึกข้อมูลในวันนี้</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STATS VIEW */}
            {subTab === 'stats' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center">
                        <h3 className="text-xl font-black text-navy mb-8">สัดส่วนวันนี้ ({selectedDate})</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={[
                                            { name: 'มา', value: summaryLogs.reduce((s,l) => s + l.present + l.activity, 0) || 0, color: COLORS.present },
                                            { name: 'ป่วย/ลา', value: summaryLogs.reduce((s,l) => s + l.sick + l.leave, 0), color: COLORS.leave },
                                            { name: 'ขาด', value: summaryLogs.reduce((s,l) => s + l.absent, 0), color: COLORS.absent }
                                        ].filter(d => d.value > 0)} 
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}
                                    >
                                        <Cell fill={COLORS.present} />
                                        <Cell fill={COLORS.leave} />
                                        <Cell fill={COLORS.absent} />
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-navy mb-8">สรุปตามรายคาบ ({selectedDate})</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summaryLogs}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="period" tick={{fontSize: 10}} />
                                    <YAxis />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                    <Bar dataKey="present" name="มา" fill={COLORS.present} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                    <Bar dataKey="absent" name="ขาด" fill={COLORS.absent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
