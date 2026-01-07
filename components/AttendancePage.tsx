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
    onSaveStudentAttendance: (data: StudentAttendance[]) => Promise<void>;
    onSavePersonnelAttendance: (data: PersonnelAttendance[]) => Promise<void>;
    onDeleteAttendance: (t: 'student' | 'personnel', ids: string[]) => void;
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
    activity: '#3B82F6',
    home: '#6366F1' // Indigo for Home
};

const AttendancePage: React.FC<AttendancePageProps> = ({
    mode, students, personnel, studentAttendance, personnelAttendance, 
    onSaveStudentAttendance, onSavePersonnelAttendance, onDeleteAttendance, 
    isSaving, settings, onRefresh, currentUser
}) => {
    const [subTab, setSubTab] = useState<'checkin' | 'log' | 'history' | 'stats'>('stats');
    const [selectedDate, setSelectedDate] = useState(getCurrentThaiDate());
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('morning_act');
    
    // For Student Mode (Check-in)
    const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
    const [localAttendance, setLocalAttendance] = useState<Record<number, AttendanceStatus>>({});

    // History & Group Edit State
    const [historySearch, setHistorySearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('');
    const [selectedHistoryGroups, setSelectedHistoryGroups] = useState<Set<string>>(new Set());
    
    const [editingGroup, setEditingGroup] = useState<{ date: string, period: string, groupKey: string, ids: string[] } | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editListAttendance, setEditListAttendance] = useState<Record<number, AttendanceStatus>>({});

    const enabledPeriods = useMemo(() => {
        const periods = (settings?.attendancePeriods || DEFAULT_ATTENDANCE_PERIODS).filter(p => p.enabled);
        return periods.length > 0 ? periods : DEFAULT_ATTENDANCE_PERIODS;
    }, [settings]);

    const activeList = useMemo(() => {
        if (mode === 'personnel') return personnel;
        if (!selectedClassroom) return [];
        return students.filter(s => s.studentClass === selectedClassroom);
    }, [mode, students, personnel, selectedClassroom]);

    // Grouping History Logic
    const groupedHistory = useMemo(() => {
        const rawData = mode === 'student' ? studentAttendance : personnelAttendance;
        const groups: Record<string, any> = {};

        rawData.forEach(r => {
            let groupKey = '';
            if (mode === 'student') {
                const sId = (r as StudentAttendance).studentId;
                const person = students.find(s => String(s.id) === String(sId));
                groupKey = person ? person.studentClass : 'ไม่ระบุชั้นเรียน';
            } else {
                groupKey = 'บุคลากรทั้งหมด';
            }
            
            const key = `${r.date}-${r.period}-${groupKey}`;
            if (!groups[key]) {
                groups[key] = { 
                    key: key,
                    date: r.date, 
                    period: r.period, 
                    groupKey: groupKey, 
                    present: 0, absent: 0, leave: 0, sick: 0, activity: 0, home: 0, total: 0, 
                    ids: [] 
                };
            }
            groups[key].total++;
            groups[key].ids.push(r.id);
            if (r.status in groups[key]) groups[key][r.status]++;
        });

        return Object.values(groups).sort((a: any, b: any) => {
            const dateA = a.date.split('/').reverse().join('');
            const dateB = b.date.split('/').reverse().join('');
            if (dateB !== dateA) return dateB.localeCompare(dateA);
            const pOrderA = enabledPeriods.findIndex(p => p.id === a.period);
            const pOrderB = enabledPeriods.findIndex(p => p.id === b.period);
            return pOrderB - pOrderA;
        });
    }, [mode, studentAttendance, personnelAttendance, students, enabledPeriods]);

    const filteredGroupedHistory = useMemo(() => {
        return groupedHistory.filter((g: any) => {
            const matchesSearch = g.groupKey.toLowerCase().includes(historySearch.toLowerCase()) ||
                                g.date.includes(historySearch);
            const matchesClass = !filterClass || g.groupKey === filterClass;
            const matchesPeriod = !filterPeriod || g.period === filterPeriod;
            
            return matchesSearch && matchesClass && matchesPeriod;
        });
    }, [groupedHistory, historySearch, filterClass, filterPeriod]);

    // --- Effects ---
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
            else newLocal[item.id] = 'present';
        });
        setLocalAttendance(newLocal);
    }, [selectedDate, selectedPeriod, selectedClassroom, mode, activeList, studentAttendance, personnelAttendance]);

    // --- Actions ---
    const handleBatchSave = async (isEditing: boolean = false) => {
        const listToUse = isEditing && editingGroup ? (mode === 'student' ? students.filter(s => s.studentClass === editingGroup.groupKey) : personnel) : activeList;
        const attendanceMap = isEditing ? editListAttendance : localAttendance;
        const dateToUse = isEditing && editingGroup ? editingGroup.date : selectedDate;
        const periodToUse = (isEditing && editingGroup ? editingGroup.period : selectedPeriod) as TimePeriod;

        if (listToUse.length === 0) return;
        
        try {
            if (mode === 'student') {
                const records: StudentAttendance[] = listToUse.map(s => ({
                    id: `sa-${s.id}-${dateToUse.replace(/\//g,'')}-${periodToUse}`,
                    date: dateToUse,
                    period: periodToUse,
                    studentId: s.id,
                    status: attendanceMap[s.id] || 'present'
                }));
                await onSaveStudentAttendance(records);
            } else {
                const records: PersonnelAttendance[] = listToUse.map(p => ({
                    id: `pa-${p.id}-${dateToUse.replace(/\//g,'')}-${periodToUse}`,
                    date: dateToUse,
                    period: periodToUse,
                    personnelId: p.id,
                    status: attendanceMap[p.id] || 'present'
                }));
                await onSavePersonnelAttendance(records);
            }
            
            if (isEditing) {
                setIsEditModalOpen(false);
            } else {
                setSubTab('history');
            }
            alert('บันทึกข้อมูลเรียบร้อย');
        } catch (error) {
            console.error("Save Error:", error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
        }
    };

    const handleToggleSelectGroup = (key: string) => {
        const next = new Set(selectedHistoryGroups);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setSelectedHistoryGroups(next);
    };

    const handleSelectAllFiltered = (checked: boolean) => {
        if (checked) {
            setSelectedHistoryGroups(new Set(filteredGroupedHistory.map(g => g.key)));
        } else {
            setSelectedHistoryGroups(new Set());
        }
    };

    const handleExportExcel = () => {
        if (selectedHistoryGroups.size === 0) {
            alert('กรุณาเลือกรายการที่ต้องการส่งออก');
            return;
        }

        const selectedData = groupedHistory.filter(g => selectedHistoryGroups.has(g.key));
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        // Header
        const headers = ["วันที่", "ช่วงเวลา", mode === 'student' ? "ชั้นเรียน" : "ฝ่าย", "ทั้งหมด", "มา", "ป่วย", "ลา", "ขาด", "อยู่บ้าน"];
        csvContent += headers.join(",") + "\r\n";

        // Rows
        selectedData.forEach(g => {
            const periodLabel = enabledPeriods.find(p => p.id === g.period)?.label || g.period;
            const row = [
                g.date,
                periodLabel,
                g.groupKey,
                g.total,
                g.present + (g.activity || 0),
                g.sick,
                g.leave,
                g.absent,
                g.home
            ];
            csvContent += row.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_report_${getCurrentThaiDate().replace(/\//g,'-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenEditGroup = (group: any) => {
        setEditingGroup(group);
        const newEditAttendance: Record<number, AttendanceStatus> = {};
        const rawData = mode === 'student' ? studentAttendance : personnelAttendance;
        
        const groupRecords = rawData.filter(r => r.date === group.date && r.period === group.period);
        
        groupRecords.forEach(r => {
            const personId = mode === 'student' ? (r as StudentAttendance).studentId : (r as PersonnelAttendance).personnelId;
            newEditAttendance[personId] = r.status;
        });
        
        setEditListAttendance(newEditAttendance);
        setIsEditModalOpen(true);
    };

    const studentClasses = useMemo(() => Array.from(new Set(students.map(s => s.studentClass))).sort(), [students]);

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
                <div className="flex gap-2 no-print">
                    <input 
                        type="date" 
                        value={buddhistToISO(selectedDate)}
                        onChange={(e) => setSelectedDate(isoToBuddhist(e.target.value))}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-primary-blue shadow-sm outline-none"
                    />
                    {onRefresh && (
                        <button onClick={onRefresh} className="p-2 bg-white border rounded-xl hover:bg-gray-50 text-gray-400" title="รีเฟรชข้อมูล">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white/50 p-1 rounded-2xl border border-gray-200 w-fit no-print shadow-sm overflow-x-auto max-w-full">
                <button onClick={() => setSubTab('stats')} className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${subTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>สถิติ</button>
                <button onClick={() => setSubTab('history')} className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${subTab === 'history' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ประวัติย้อนหลัง</button>
                <button onClick={() => setSubTab('checkin')} className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${subTab === 'checkin' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ลงทะเบียนใหม่</button>
            </div>

            {/* CHECK-IN VIEW */}
            {subTab === 'checkin' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ช่วงเวลา</label>
                            <select 
                                value={selectedPeriod} 
                                onChange={e => setSelectedPeriod(e.target.value as TimePeriod)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-navy outline-none focus:ring-2 focus:ring-primary-blue"
                            >
                                {enabledPeriods.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                            </select>
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
                            <div className="overflow-x-auto">
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
                                                                { id: 'home', label: 'อยู่บ้าน', color: 'bg-indigo-500' },
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
                            </div>
                            <div className="p-8 bg-gray-50 flex justify-end">
                                <button 
                                    onClick={() => handleBatchSave(false)}
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

            {/* HISTORY VIEW (Grouped) */}
            {subTab === 'history' && (
                <div className="space-y-6 animate-fade-in no-print">
                    {/* Filters & Actions Bar */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-grow w-full space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">คำค้นหา</label>
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อชั้นเรียน..." 
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary-blue shadow-inner"
                            />
                        </div>
                        {mode === 'student' && (
                            <div className="w-full md:w-48 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ชั้นเรียน</label>
                                <select 
                                    value={filterClass}
                                    onChange={e => setFilterClass(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold text-navy shadow-inner"
                                >
                                    <option value="">ทั้งหมด</option>
                                    {studentClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="w-full md:w-48 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ช่วงเวลา</label>
                            <select 
                                value={filterPeriod}
                                onChange={e => setFilterPeriod(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold text-navy shadow-inner"
                            >
                                <option value="">ทั้งหมด</option>
                                {enabledPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                            </select>
                        </div>
                        <button 
                            onClick={handleExportExcel}
                            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export Excel
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[1000px]">
                                <thead className="bg-gray-50/50 text-gray-400 font-black border-b border-gray-100 uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="p-6 w-16 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-gray-300"
                                                onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                                                checked={filteredGroupedHistory.length > 0 && selectedHistoryGroups.size >= filteredGroupedHistory.length}
                                            />
                                        </th>
                                        <th className="p-6">วันที่/เวลา</th>
                                        <th className="p-6">{mode === 'student' ? 'ห้องเรียน' : 'ฝ่าย'}</th>
                                        <th className="p-6 text-center">มาเรียน</th>
                                        <th className="p-6 text-center">ป่วย/ลา</th>
                                        <th className="p-6 text-center">อยู่บ้าน</th>
                                        <th className="p-6 text-center">ขาด</th>
                                        <th className="p-6 text-center">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredGroupedHistory.map((log: any, idx: number) => (
                                        <tr key={idx} className={`transition-all group ${selectedHistoryGroups.has(log.key) ? 'bg-blue-50/50' : 'hover:bg-blue-50/20'}`}>
                                            <td className="p-6 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-300"
                                                    checked={selectedHistoryGroups.has(log.key)}
                                                    onChange={() => handleToggleSelectGroup(log.key)}
                                                />
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-navy leading-tight">{log.date}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{enabledPeriods.find(p => p.id === log.period)?.label || log.period}</div>
                                            </td>
                                            <td className="p-6 font-bold text-gray-600">{log.groupKey}</td>
                                            <td className="p-6 text-center font-black text-emerald-500">
                                                {log.present + log.activity} <span className="text-[10px] text-gray-300 font-normal">/ {log.total}</span>
                                            </td>
                                            <td className="p-6 text-center font-black text-orange-500">{log.sick + log.leave}</td>
                                            <td className="p-6 text-center font-black text-indigo-500">{log.home}</td>
                                            <td className="p-6 text-center font-black text-rose-500">{log.absent}</td>
                                            <td className="p-6 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleOpenEditGroup(log)} className="bg-white border border-gray-200 text-primary-blue hover:bg-primary-blue hover:text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95">ดู/แก้ไข</button>
                                                    <button onClick={() => onDeleteAttendance(mode, log.ids)} className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95">ลบ</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredGroupedHistory.length === 0 && (
                                        <tr><td colSpan={8} className="p-40 text-center text-gray-300 font-black italic text-lg opacity-40">ไม่พบประวัติข้อมูล</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* STATS VIEW */}
            {subTab === 'stats' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in no-print">
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center">
                        <h3 className="text-xl font-black text-navy mb-8">สัดส่วนวันนี้ ({selectedDate})</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={[
                                            { name: 'มา', value: groupedHistory.filter(g => g.date === selectedDate).reduce((s,l) => s + l.present + l.activity, 0) || 0, color: COLORS.present },
                                            { name: 'ป่วย/ลา', value: groupedHistory.filter(g => g.date === selectedDate).reduce((s,l) => s + l.sick + l.leave, 0), color: COLORS.leave },
                                            { name: 'อยู่บ้าน', value: groupedHistory.filter(g => g.date === selectedDate).reduce((s,l) => s + l.home, 0), color: COLORS.home },
                                            { name: 'ขาด', value: groupedHistory.filter(g => g.date === selectedDate).reduce((s,l) => s + l.absent, 0), color: COLORS.absent }
                                        ].filter(d => d.value > 0)} 
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}
                                    >
                                        <Cell fill={COLORS.present} />
                                        <Cell fill={COLORS.leave} />
                                        <Cell fill={COLORS.home} />
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
                                <BarChart data={groupedHistory.filter(g => g.date === selectedDate)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="period" tick={{fontSize: 10}} />
                                    <YAxis />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                    <Bar dataKey="present" name="มา" fill={COLORS.present} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                    <Bar dataKey="home" name="อยู่บ้าน" fill={COLORS.home} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                    <Bar dataKey="absent" name="ขาด" fill={COLORS.absent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && editingGroup && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 no-print">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-primary-blue text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black">แก้ไขข้อมูลประวัติการเช็คชื่อ</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">
                                    {editingGroup.groupKey} | {editingGroup.date} | {enabledPeriods.find(p => p.id === editingGroup.period)?.label || editingGroup.period}
                                </p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-0 overflow-y-auto bg-gray-50 flex-grow">
                             <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-6 w-16 text-center font-black text-gray-400 uppercase text-[10px] tracking-widest border-b">#</th>
                                        <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b">รายชื่อ</th>
                                        <th className="p-6 text-center font-black text-gray-400 uppercase text-[10px] tracking-widest border-b">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(mode === 'student' ? students.filter(s => s.studentClass === editingGroup.groupKey) : personnel).map((item, idx) => {
                                        const status = editListAttendance[item.id] || 'present';
                                        const profileImg = getFirstImageSource(mode === 'student' ? (item as Student).studentProfileImage : (item as Personnel).profileImage);
                                        return (
                                            <tr key={item.id} className="bg-white hover:bg-blue-50/30 transition-all">
                                                <td className="p-6 text-center font-bold text-gray-300">{idx + 1}</td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-100 overflow-hidden flex-shrink-0">
                                                            {profileImg ? <img src={profileImg} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">?</div>}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-navy truncate">{mode === 'student' ? `${(item as Student).studentTitle}${(item as Student).studentName}` : `${(item as Personnel).personnelTitle}${(item as Personnel).personnelName}`}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{mode === 'student' ? (item as Student).studentNickname : (item as Personnel).position}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex justify-center gap-1">
                                                        {[
                                                            { id: 'present', label: 'มา', color: 'bg-emerald-500' },
                                                            { id: 'sick', label: 'ป่วย', color: 'bg-orange-500' },
                                                            { id: 'leave', label: 'ลา', color: 'bg-amber-500' },
                                                            { id: 'absent', label: 'ขาด', color: 'bg-rose-500' },
                                                            { id: 'home', label: 'อยู่บ้าน', color: 'bg-indigo-500' },
                                                            ...(mode === 'personnel' ? [{ id: 'activity', label: 'กิจกรรม', color: 'bg-blue-500' }] : [])
                                                        ].map(opt => (
                                                            <button 
                                                                key={opt.id}
                                                                onClick={() => setEditListAttendance({ ...editListAttendance, [item.id]: opt.id as AttendanceStatus })}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${status === opt.id ? `${opt.color} text-white shadow-md scale-105` : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
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
                        </div>
                        <div className="p-8 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-3 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all active:scale-95">ยกเลิก</button>
                            <button onClick={() => handleBatchSave(true)} disabled={isSaving} className="px-12 py-3 bg-navy text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-900/20 hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50">
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขประวัติ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;