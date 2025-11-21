
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Personnel, StudentAttendance, PersonnelAttendance, TimePeriod, AttendanceStatus } from '../types';
import { STUDENT_CLASSES, STUDENT_CLASSROOMS } from '../constants';
import AttendanceStats from './AttendanceStats';
import { getFirstImageSource } from '../utils';

interface AttendancePageProps {
    students: Student[];
    personnel: Personnel[];
    dormitories: string[];
    studentAttendance: StudentAttendance[];
    personnelAttendance: PersonnelAttendance[];
    onSaveStudentAttendance: (data: StudentAttendance[]) => void;
    onSavePersonnelAttendance: (data: PersonnelAttendance[]) => void;
    isSaving: boolean;
}

// Helper for current Buddhist date
const getTodayBuddhist = () => {
    const date = new Date();
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543}`;
};

// Convert Buddhist Date (DD/MM/YYYY) to ISO Date (YYYY-MM-DD) for input[type="date"]
const buddhistToISO = (buddhistDate: string) => {
    if (!buddhistDate) return '';
    const parts = buddhistDate.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts.map(Number);
    const isoYear = year - 543;
    return `${isoYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Convert ISO Date (YYYY-MM-DD) to Buddhist Date (DD/MM/YYYY) for system storage
const isoToBuddhist = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts.map(Number);
    const buddhistYear = year + 543;
    return `${day}/${month}/${buddhistYear}`;
};

const AttendancePage: React.FC<AttendancePageProps> = ({
    students, personnel, dormitories, 
    studentAttendance, personnelAttendance,
    onSaveStudentAttendance, onSavePersonnelAttendance, isSaving
}) => {
    const [activeTab, setActiveTab] = useState<'student' | 'personnel'>('student');
    const [selectedDate, setSelectedDate] = useState(getTodayBuddhist());
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('morning');
    
    // Filters for Students
    const [filterClass, setFilterClass] = useState('');
    const [filterRoom, setFilterRoom] = useState('');
    const [filterDorm, setFilterDorm] = useState('');

    // Filters for Personnel
    const [personnelSearch, setPersonnelSearch] = useState('');

    // Local state for editing attendance before saving
    const [localStudentAttendance, setLocalStudentAttendance] = useState<Record<number, AttendanceStatus>>({});
    const [localPersonnelAttendance, setLocalPersonnelAttendance] = useState<Record<number, AttendanceStatus>>({});
    // Local state for Personnel Dress Code
    const [localPersonnelDressCode, setLocalPersonnelDressCode] = useState<Record<number, 'tidy' | 'untidy'>>({});

    // Helper to generate composite ID
    const generateId = (date: string, period: string, id: number) => `${date}_${period}_${id}`;

    // --- Data Preparation ---

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (filterDorm && s.dormitory !== filterDorm) return false;
            const [cls, room] = s.studentClass.split('/');
            if (filterClass && cls !== filterClass) return false;
            if (filterRoom && room !== filterRoom) return false;
            return true;
        });
    }, [students, filterClass, filterRoom, filterDorm]);

    const filteredPersonnel = useMemo(() => {
        if (!personnelSearch) return personnel;
        return personnel.filter(p => {
            const title = p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle;
            const pName = p.personnelName || '';
            const pPos = p.position || '';
            const fullName = `${title || ''} ${pName}`.toLowerCase();
            return fullName.includes(personnelSearch.toLowerCase()) || pPos.toLowerCase().includes(personnelSearch.toLowerCase());
        });
    }, [personnel, personnelSearch]);

    // --- EFFECT: Load/Reset Local State on Context Change ---
    useEffect(() => {
        // 1. Prepare Student State
        const stMap: Record<number, AttendanceStatus> = {};
        students.forEach(s => {
            const id = generateId(selectedDate, selectedPeriod, s.id);
            const record = studentAttendance.find(r => r.id === id);
            stMap[s.id] = record ? record.status : 'absent'; 
        });
        
        // 2. Prepare Personnel State
        const psMap: Record<number, AttendanceStatus> = {};
        const psDressMap: Record<number, 'tidy' | 'untidy'> = {};
        personnel.forEach(p => {
            const id = generateId(selectedDate, selectedPeriod, p.id);
            const record = personnelAttendance.find(r => r.id === id);
            // Default to 'absent' (ไม่เข้าร่วม)
            psMap[p.id] = record ? record.status : 'absent';
            psDressMap[p.id] = record?.dressCode || 'tidy';
        });

        setLocalStudentAttendance(stMap);
        setLocalPersonnelAttendance(psMap);
        setLocalPersonnelDressCode(psDressMap);

    }, [selectedDate, selectedPeriod, activeTab, studentAttendance, personnelAttendance, students, personnel]);


    // --- Handlers ---

    const handleStudentStatusChange = (studentId: number, status: AttendanceStatus) => {
        setLocalStudentAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handlePersonnelStatusChange = (personnelId: number, status: AttendanceStatus) => {
        setLocalPersonnelAttendance(prev => ({ ...prev, [personnelId]: status }));
    };

    const handlePersonnelDressCodeChange = (personnelId: number, code: 'tidy' | 'untidy') => {
        setLocalPersonnelDressCode(prev => ({ ...prev, [personnelId]: code }));
    };

    // --- Bulk Actions ---
    const setAllStudentStatus = (status: AttendanceStatus) => {
        const newStatusMap = { ...localStudentAttendance };
        filteredStudents.forEach(s => {
            newStatusMap[s.id] = status;
        });
        setLocalStudentAttendance(newStatusMap);
    };

    const setAllPersonnelStatus = (status: AttendanceStatus) => {
        const newStatusMap = { ...localPersonnelAttendance };
        filteredPersonnel.forEach(p => {
            newStatusMap[p.id] = status;
        });
        setLocalPersonnelAttendance(newStatusMap);
    };
    
    const handleSave = () => {
        if (activeTab === 'student') {
            const recordsToSave: StudentAttendance[] = students.map(s => ({
                id: generateId(selectedDate, selectedPeriod, s.id),
                date: selectedDate,
                period: selectedPeriod,
                studentId: s.id,
                status: localStudentAttendance[s.id] || 'absent' 
            }));
            onSaveStudentAttendance(recordsToSave);
        } else {
            const recordsToSave: PersonnelAttendance[] = personnel.map(p => ({
                id: generateId(selectedDate, selectedPeriod, p.id),
                date: selectedDate,
                period: selectedPeriod,
                personnelId: p.id,
                status: localPersonnelAttendance[p.id] || 'absent',
                dressCode: localPersonnelDressCode[p.id] || 'tidy'
            }));
            onSavePersonnelAttendance(recordsToSave);
        }
    };

    const periodOptions: { value: TimePeriod, label: string }[] = [
        { value: 'morning', label: 'ช่วงเช้า (เข้าแถว)' },
        { value: 'lunch', label: 'ช่วงกลางวัน' },
        { value: 'evening', label: 'ช่วงเย็น (กลับหอ/กลับบ้าน)' },
    ];

    // Inline render function for status buttons to ensure reliable event handling
    const renderStatusButtons = (
        id: number, 
        currentStatus: AttendanceStatus, 
        type: 'student' | 'personnel'
    ) => {
        const options = type === 'student' ? [
            { val: 'present', label: 'มา', colorClass: 'bg-green-500 border-green-600 ring-green-200', activeClass: 'bg-green-500 text-white ring-2 border-green-600', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' },
            { val: 'leave', label: 'ลา', colorClass: 'bg-yellow-400 border-yellow-500 ring-yellow-200', activeClass: 'bg-yellow-400 text-white ring-2 border-yellow-500', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' },
            { val: 'sick', label: 'ป่วย', colorClass: 'bg-orange-400 border-orange-500 ring-orange-200', activeClass: 'bg-orange-400 text-white ring-2 border-orange-500', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' },
            { val: 'absent', label: 'ขาด', colorClass: 'bg-red-500 border-red-600 ring-red-200', activeClass: 'bg-red-500 text-white ring-2 border-red-600', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' }
        ] : [
            { val: 'present', label: 'เข้าร่วม', colorClass: 'bg-green-500 border-green-600 ring-green-200', activeClass: 'bg-green-500 text-white ring-2 border-green-600', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' },
            { val: 'leave', label: 'ลา', colorClass: 'bg-yellow-400 border-yellow-500 ring-yellow-200', activeClass: 'bg-yellow-400 text-white ring-2 border-yellow-500', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' },
            { val: 'sick', label: 'ป่วย', colorClass: 'bg-orange-400 border-orange-500 ring-orange-200', activeClass: 'bg-orange-400 text-white ring-2 border-orange-500', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' },
            { val: 'absent', label: 'ไม่เข้าร่วม', colorClass: 'bg-red-500 border-red-600 ring-red-200', activeClass: 'bg-red-500 text-white ring-2 border-red-600', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' }
        ];

        return (
            <div className="flex gap-2 flex-nowrap">
                {options.map((opt) => {
                    const isSelected = currentStatus === opt.val || (opt.val === 'present' && currentStatus === 'activity');
                    return (
                        <button
                            key={opt.val}
                            type="button"
                            onClick={() => type === 'student' 
                                ? handleStudentStatusChange(id, opt.val as AttendanceStatus) 
                                : handlePersonnelStatusChange(id, opt.val as AttendanceStatus)
                            }
                            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-150 border shadow-sm whitespace-nowrap cursor-pointer ${isSelected ? opt.activeClass : opt.inactiveClass}`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            
             {/* Top Navigation Tabs */}
             <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-xl shadow-sm">
                <div className="flex bg-gray-100 rounded-lg p-1 w-full md:w-auto">
                    <button 
                        onClick={() => setActiveTab('student')}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-md text-lg font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'student' ? 'bg-white shadow-md text-primary-blue ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        เช็คชื่อนักเรียน
                    </button>
                    <button 
                        onClick={() => setActiveTab('personnel')}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-md text-lg font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'personnel' ? 'bg-white shadow-md text-purple-600 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        เช็คชื่อครู/บุคลากร
                    </button>
                </div>

                 <div className="flex flex-wrap gap-2 items-center w-full md:w-auto justify-end">
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">วันที่</label>
                        <input 
                            type="date" 
                            value={buddhistToISO(selectedDate)} 
                            onChange={(e) => {
                                const newDate = isoToBuddhist(e.target.value);
                                if (newDate) setSelectedDate(newDate);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-center bg-white focus:ring-2 focus:ring-primary-blue focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">ช่วงเวลา</label>
                        <select 
                            value={selectedPeriod} 
                            onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-blue focus:outline-none"
                        >
                            {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Statistics Section */}
            <AttendanceStats 
                studentAttendance={studentAttendance}
                personnelAttendance={personnelAttendance}
                students={students}
                personnel={personnel}
                selectedDate={selectedDate}
            />

            <div className={`bg-white p-6 rounded-xl shadow-lg border-t-4 ${activeTab === 'student' ? 'border-primary-blue' : 'border-purple-600'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-xl md:text-2xl font-bold ${activeTab === 'student' ? 'text-navy' : 'text-purple-800'}`}>
                        {activeTab === 'student' ? 'บันทึกการมาเรียน (นักเรียน)' : 'บันทึกการปฏิบัติหน้าที่ (ครู/บุคลากร)'}
                    </h2>
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                        {activeTab === 'student' ? `${filteredStudents.length} คน` : `${filteredPersonnel.length} คน`}
                    </div>
                </div>

                {/* --- STUDENT VIEW --- */}
                {activeTab === 'student' && (
                    <div className="">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
                                    <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:outline-none">
                                        <option value="">ทั้งหมด</option>
                                        {STUDENT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ห้อง</label>
                                    <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:outline-none">
                                        <option value="">ทั้งหมด</option>
                                        {STUDENT_CLASSROOMS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เรือนนอน</label>
                                    <select value={filterDorm} onChange={(e) => setFilterDorm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:outline-none">
                                        <option value="">ทั้งหมด</option>
                                        {dormitories.filter(d => d !== 'เรือนพยาบาล').map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Bulk Actions for Students */}
                            <div className="flex flex-wrap items-center gap-2 py-2">
                                <span className="text-sm font-bold text-gray-700 mr-2 whitespace-nowrap">เลือกด่วน:</span>
                                <button onClick={() => setAllStudentStatus('present')} className="bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกมาทั้งหมด
                                </button>
                                <button onClick={() => setAllStudentStatus('leave')} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกลาทั้งหมด
                                </button>
                                <button onClick={() => setAllStudentStatus('sick')} className="bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกป่วยทั้งหมด
                                </button>
                                <button onClick={() => setAllStudentStatus('absent')} className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกขาดทั้งหมด
                                </button>
                            </div>
                        </div>

                        {/* Student Table */}
                        <div className="overflow-x-auto mt-2 rounded-lg border border-gray-200">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-left text-sm font-bold text-navy w-20 whitespace-nowrap">รูป</th>
                                        <th className="p-4 text-left text-sm font-bold text-navy whitespace-nowrap">ชื่อ-นามสกุล</th>
                                        <th className="p-4 text-left text-sm font-bold text-navy whitespace-nowrap">ชั้น/ห้อง</th>
                                        <th className="p-4 text-center text-sm font-bold text-navy whitespace-nowrap">สถานะ (เลือกสถานะ)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.length === 0 ? (
                                        <tr><td colSpan={4} className="p-12 text-center text-gray-500">ไม่พบข้อมูลนักเรียนตามเงื่อนไข</td></tr>
                                    ) : (
                                        filteredStudents.map(s => {
                                            const profileImg = getFirstImageSource(s.studentProfileImage);
                                            const status = localStudentAttendance[s.id] || 'absent';
                                            
                                            return (
                                                <tr key={`st_${s.id}`} className={`hover:bg-gray-50 transition-colors ${status === 'absent' ? 'bg-red-50/30' : ''}`}>
                                                    <td className="p-3 whitespace-nowrap">
                                                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-200 shadow-sm">
                                                            {profileImg ? (
                                                                <img 
                                                                    src={profileImg} 
                                                                    className="w-full h-full object-cover"
                                                                    referrerPolicy="no-referrer"
                                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                                />
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-sm font-medium text-gray-800 whitespace-nowrap">{s.studentTitle}{s.studentName}</td>
                                                    <td className="p-3 text-sm text-gray-500 whitespace-nowrap">{s.studentClass}</td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        {renderStatusButtons(s.id, status, 'student')}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- PERSONNEL VIEW --- */}
                {activeTab === 'personnel' && (
                     <div className="">
                         <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหาชื่อบุคลากร</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="พิมพ์ชื่อ หรือตำแหน่ง..." 
                                        value={personnelSearch}
                                        onChange={(e) => setPersonnelSearch(e.target.value)}
                                        className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:outline-none"
                                    />
                                    {personnelSearch && (
                                        <button onClick={() => setPersonnelSearch('')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 whitespace-nowrap">
                                            ล้าง
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                             {/* Bulk Actions for Personnel */}
                             <div className="flex flex-wrap items-center gap-2 py-2">
                                <span className="text-sm font-bold text-gray-700 mr-2 whitespace-nowrap">เลือกด่วน:</span>
                                <button onClick={() => setAllPersonnelStatus('present')} className="bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกเข้าร่วมทั้งหมด
                                </button>
                                <button onClick={() => setAllPersonnelStatus('leave')} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกลาทั้งหมด
                                </button>
                                <button onClick={() => setAllPersonnelStatus('sick')} className="bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกป่วยทั้งหมด
                                </button>
                                <button onClick={() => setAllPersonnelStatus('absent')} className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap">
                                    เลือกไม่เข้าร่วมทั้งหมด
                                </button>
                            </div>
                        </div>

                        {/* Personnel Table */}
                        <div className="overflow-x-auto mt-2 rounded-lg border border-gray-200">
                            <table className="min-w-full bg-white">
                                <thead className="bg-purple-50 border-b border-purple-200">
                                    <tr>
                                        <th className="p-4 text-left text-sm font-bold text-purple-800 w-20 whitespace-nowrap">รูป</th>
                                        <th className="p-4 text-left text-sm font-bold text-purple-800 whitespace-nowrap">ชื่อ-นามสกุล</th>
                                        <th className="p-4 text-left text-sm font-bold text-purple-800 whitespace-nowrap">ตำแหน่ง</th>
                                        <th className="p-4 text-center text-sm font-bold text-purple-800 whitespace-nowrap">เช็คชื่อ (เลือกสถานะ)</th>
                                        <th className="p-4 text-center text-sm font-bold text-purple-800 whitespace-nowrap">การแต่งกาย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPersonnel.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                    <p className="text-lg font-medium">ไม่พบข้อมูลบุคลากร</p>
                                                    <p className="text-sm mt-1">ลองล้างคำค้นหา หรือเพิ่มข้อมูลในเมนูบุคลากร</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPersonnel.map(p => {
                                            const profileImg = getFirstImageSource(p.profileImage);
                                            const status = localPersonnelAttendance[p.id] || 'absent';
                                            const isPresent = status === 'present' || status === 'activity';
                                            const dressCode = localPersonnelDressCode[p.id] || 'tidy';
                                            const title = p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle;
                                            
                                            return (
                                                <tr key={`ps_${p.id}`} className={`hover:bg-gray-50 transition-colors ${status === 'absent' ? 'bg-red-50/30' : ''}`}>
                                                    <td className="p-3 whitespace-nowrap">
                                                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-200 shadow-sm">
                                                            {profileImg ? (
                                                                <img 
                                                                    src={profileImg} 
                                                                    className="w-full h-full object-cover"
                                                                    referrerPolicy="no-referrer"
                                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                                />
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-sm font-medium text-gray-800 whitespace-nowrap">{title} {p.personnelName}</td>
                                                    <td className="p-3 text-sm text-gray-500 whitespace-nowrap">{p.position}</td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        {renderStatusButtons(p.id, status, 'personnel')}
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        {isPresent && (
                                                            <div className="flex justify-center gap-2 flex-nowrap">
                                                                <button 
                                                                    onClick={() => handlePersonnelDressCodeChange(p.id, 'tidy')}
                                                                    className={`px-3 py-1.5 rounded-lg border text-xs transition whitespace-nowrap ${dressCode === 'tidy' ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                                                >
                                                                    เรียบร้อย
                                                                </button>
                                                                <button 
                                                                    onClick={() => handlePersonnelDressCodeChange(p.id, 'untidy')}
                                                                    className={`px-3 py-1.5 rounded-lg border text-xs transition whitespace-nowrap ${dressCode === 'untidy' ? 'bg-gray-500 text-white border-gray-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                                                >
                                                                    ไม่เรียบร้อย
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="mt-8 flex justify-end border-t pt-6">
                     <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transform transition hover:-translate-y-1"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                <span className="text-lg">บันทึกการเช็คชื่อ</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendancePage;
