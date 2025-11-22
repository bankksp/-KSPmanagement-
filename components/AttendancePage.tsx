
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Personnel, StudentAttendance, PersonnelAttendance, TimePeriod, AttendanceStatus } from '../types';
import { STUDENT_CLASSES, STUDENT_CLASSROOMS } from '../constants';
import { getFirstImageSource } from '../utils';

interface AttendancePageProps {
    mode: 'student' | 'personnel';
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
    mode,
    students, personnel, dormitories, 
    studentAttendance, personnelAttendance,
    onSaveStudentAttendance, onSavePersonnelAttendance, isSaving
}) => {
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
        if (mode === 'student') {
            const stMap: Record<number, AttendanceStatus> = {};
            students.forEach(s => {
                const id = generateId(selectedDate, selectedPeriod, s.id);
                const record = studentAttendance.find(r => r.id === id);
                stMap[s.id] = record ? record.status : 'absent'; 
            });
            setLocalStudentAttendance(stMap);
        } else {
            const psMap: Record<number, AttendanceStatus> = {};
            const psDressMap: Record<number, 'tidy' | 'untidy'> = {};
            personnel.forEach(p => {
                const id = generateId(selectedDate, selectedPeriod, p.id);
                const record = personnelAttendance.find(r => r.id === id);
                // Default to 'absent' (ไม่เข้าร่วม)
                psMap[p.id] = record ? record.status : 'absent';
                psDressMap[p.id] = record?.dressCode || 'tidy';
            });
            setLocalPersonnelAttendance(psMap);
            setLocalPersonnelDressCode(psDressMap);
        }

    }, [selectedDate, selectedPeriod, mode, studentAttendance, personnelAttendance, students, personnel]);


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
        if (mode === 'student') {
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
        { value: 'morning', label: 'เช้า' },
        { value: 'lunch', label: 'กลางวัน' },
        { value: 'evening', label: 'เย็น' },
    ];

    // Inline render function for status buttons to ensure reliable event handling
    const renderStatusButtons = (
        id: number, 
        currentStatus: AttendanceStatus, 
        type: 'student' | 'personnel'
    ) => {
        const options = type === 'student' ? [
            { val: 'present', label: 'มา', colorClass: 'bg-green-500', activeClass: 'bg-green-500 text-white ring-1 ring-green-600 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' },
            { val: 'leave', label: 'ลา', colorClass: 'bg-yellow-400', activeClass: 'bg-yellow-400 text-white ring-1 ring-yellow-500 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' },
            { val: 'sick', label: 'ป่วย', colorClass: 'bg-orange-400', activeClass: 'bg-orange-400 text-white ring-1 ring-orange-500 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' },
            { val: 'absent', label: 'ขาด', colorClass: 'bg-red-500', activeClass: 'bg-red-500 text-white ring-1 ring-red-600 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' }
        ] : [
            { val: 'present', label: 'มา', colorClass: 'bg-green-500', activeClass: 'bg-green-500 text-white ring-1 ring-green-600 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' },
            { val: 'leave', label: 'ลา', colorClass: 'bg-yellow-400', activeClass: 'bg-yellow-400 text-white ring-1 ring-yellow-500 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' },
            { val: 'sick', label: 'ป่วย', colorClass: 'bg-orange-400', activeClass: 'bg-orange-400 text-white ring-1 ring-orange-500 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' },
            { val: 'absent', label: 'ขาด', colorClass: 'bg-red-500', activeClass: 'bg-red-500 text-white ring-1 ring-red-600 shadow-inner', inactiveClass: 'bg-white text-gray-500 border-gray-200' }
        ];

        return (
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 snap-x">
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
                            className={`snap-start px-2 py-1 md:px-3 md:py-1.5 rounded-md text-[10px] md:text-sm font-bold transition-all duration-150 border whitespace-nowrap flex-shrink-0 ${isSelected ? opt.activeClass : opt.inactiveClass}`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-3 md:space-y-6">
             {/* Page Header & Controls */}
             <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                     <h2 className={`text-lg md:text-xl font-bold ${mode === 'student' ? 'text-primary-blue' : 'text-purple-600'}`}>
                        {mode === 'student' ? 'เช็คชื่อนักเรียน' : 'เช็คชื่อครู'}
                    </h2>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{selectedDate}</span>
                </div>

                 <div className="flex gap-2 items-center">
                    <div className="flex-grow">
                        <label className="block text-[10px] text-gray-400 mb-0.5">วันที่</label>
                        <input 
                            type="date" 
                            value={buddhistToISO(selectedDate)} 
                            onChange={(e) => {
                                const newDate = isoToBuddhist(e.target.value);
                                if (newDate) setSelectedDate(newDate);
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-center bg-white focus:ring-1 focus:ring-primary-blue focus:outline-none text-xs md:text-sm"
                        />
                    </div>
                    <div className="flex-grow">
                        <label className="block text-[10px] text-gray-400 mb-0.5">ช่วงเวลา</label>
                        <select 
                            value={selectedPeriod} 
                            onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-primary-blue focus:outline-none text-xs md:text-sm"
                        >
                            {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className={`bg-white p-2 md:p-6 rounded-xl shadow-lg border-t-4 ${mode === 'student' ? 'border-primary-blue' : 'border-purple-600'}`}>
                {/* --- STUDENT VIEW --- */}
                {mode === 'student' && (
                    <div className="">
                        <div className="space-y-2">
                            {/* Compact Filter Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-2 rounded-lg">
                                <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-lg text-[10px] md:text-sm">
                                    <option value="">ทุกชั้น</option>
                                    {STUDENT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-lg text-[10px] md:text-sm">
                                    <option value="">ทุกห้อง</option>
                                    {STUDENT_CLASSROOMS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={filterDorm} onChange={(e) => setFilterDorm(e.target.value)} className="col-span-2 md:col-span-1 w-full px-2 py-1 border border-gray-300 rounded-lg text-[10px] md:text-sm">
                                    <option value="">ทุกเรือน</option>
                                    {dormitories.filter(d => d !== 'เรือนพยาบาล').map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            
                            {/* Scrollable Bulk Actions */}
                            <div className="flex items-center gap-2 py-1 overflow-x-auto no-scrollbar bg-white border-b md:border-0">
                                <span className="text-[10px] font-bold text-gray-500 mr-1 whitespace-nowrap">เลือกด่วน:</span>
                                <div className="flex gap-2">
                                    {[
                                        { label: 'มาครบ', action: () => setAllStudentStatus('present'), color: 'green' },
                                        { label: 'ลาครบ', action: () => setAllStudentStatus('leave'), color: 'yellow' },
                                        { label: 'ป่วยครบ', action: () => setAllStudentStatus('sick'), color: 'orange' },
                                        { label: 'ขาดครบ', action: () => setAllStudentStatus('absent'), color: 'red' }
                                    ].map(btn => (
                                        <button 
                                            key={btn.label}
                                            onClick={btn.action} 
                                            className={`bg-${btn.color}-100 text-${btn.color}-800 text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap border border-${btn.color}-200`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Student Table */}
                        <div className="overflow-x-auto mt-2 rounded-lg border border-gray-200">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-2 text-left text-xs font-bold text-navy w-8 whitespace-nowrap">รูป</th>
                                        <th className="p-2 text-left text-xs font-bold text-navy whitespace-nowrap">ชื่อ-สกุล</th>
                                        <th className="p-2 text-center text-xs font-bold text-navy whitespace-nowrap">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.length === 0 ? (
                                        <tr><td colSpan={3} className="p-4 text-center text-gray-500 text-xs">ไม่พบข้อมูล</td></tr>
                                    ) : (
                                        filteredStudents.map(s => {
                                            const profileImg = getFirstImageSource(s.studentProfileImage);
                                            const status = localStudentAttendance[s.id] || 'absent';
                                            
                                            return (
                                                <tr key={`st_${s.id}`} className={`hover:bg-gray-50 transition-colors ${status === 'absent' ? 'bg-red-50/30' : ''}`}>
                                                    <td className="p-2 whitespace-nowrap w-8">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                                                            {profileImg && <img src={profileImg} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-xs font-medium text-gray-800 whitespace-nowrap max-w-[120px] truncate">
                                                        <div>{s.studentTitle}{s.studentName}</div>
                                                        <div className="text-[10px] text-gray-400">{s.studentClass}</div>
                                                    </td>
                                                    <td className="p-2 whitespace-nowrap">
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
                {mode === 'personnel' && (
                     <div className="">
                         <div className="space-y-2">
                            <div className="bg-gray-50 p-2 rounded-lg flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    placeholder="ค้นหาชื่อ..." 
                                    value={personnelSearch}
                                    onChange={(e) => setPersonnelSearch(e.target.value)}
                                    className="flex-grow px-2 py-1 border border-gray-300 rounded-lg text-[10px] md:text-sm"
                                />
                                {personnelSearch && (
                                    <button onClick={() => setPersonnelSearch('')} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold">ล้าง</button>
                                )}
                            </div>
                            
                             {/* Bulk Actions for Personnel */}
                             <div className="flex items-center gap-2 py-1 overflow-x-auto no-scrollbar bg-white border-b md:border-0">
                                <span className="text-[10px] font-bold text-gray-500 mr-1 whitespace-nowrap">เลือกด่วน:</span>
                                <div className="flex gap-2">
                                     {[
                                        { label: 'มาครบ', action: () => setAllPersonnelStatus('present'), color: 'green' },
                                        { label: 'ลาครบ', action: () => setAllPersonnelStatus('leave'), color: 'yellow' },
                                        { label: 'ป่วยครบ', action: () => setAllPersonnelStatus('sick'), color: 'orange' },
                                        { label: 'ขาดครบ', action: () => setAllPersonnelStatus('absent'), color: 'red' }
                                    ].map(btn => (
                                        <button 
                                            key={btn.label}
                                            onClick={btn.action} 
                                            className={`bg-${btn.color}-100 text-${btn.color}-800 text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap border border-${btn.color}-200`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Personnel Table */}
                        <div className="overflow-x-auto mt-2 rounded-lg border border-gray-200">
                            <table className="min-w-full bg-white">
                                <thead className="bg-purple-50 border-b border-purple-200">
                                    <tr>
                                        <th className="p-2 text-left text-xs font-bold text-purple-800 w-8 whitespace-nowrap">รูป</th>
                                        <th className="p-2 text-left text-xs font-bold text-purple-800 whitespace-nowrap">ชื่อ-สกุล</th>
                                        <th className="p-2 text-center text-xs font-bold text-purple-800 whitespace-nowrap">สถานะ</th>
                                        <th className="p-2 text-center text-xs font-bold text-purple-800 whitespace-nowrap">แต่งกาย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPersonnel.length === 0 ? (
                                        <tr><td colSpan={4} className="p-4 text-center text-xs text-gray-500">ไม่พบข้อมูล</td></tr>
                                    ) : (
                                        filteredPersonnel.map(p => {
                                            const profileImg = getFirstImageSource(p.profileImage);
                                            const status = localPersonnelAttendance[p.id] || 'absent';
                                            const isPresent = status === 'present' || status === 'activity';
                                            const dressCode = localPersonnelDressCode[p.id] || 'tidy';
                                            const title = p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle;
                                            
                                            return (
                                                <tr key={`ps_${p.id}`} className={`hover:bg-gray-50 transition-colors ${status === 'absent' ? 'bg-red-50/30' : ''}`}>
                                                    <td className="p-2 whitespace-nowrap w-8">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                                                            {profileImg && <img src={profileImg} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-xs font-medium text-gray-800 whitespace-nowrap max-w-[120px] truncate">
                                                        <div>{title} {p.personnelName}</div>
                                                    </td>
                                                    <td className="p-2 whitespace-nowrap">
                                                        {renderStatusButtons(p.id, status, 'personnel')}
                                                    </td>
                                                    <td className="p-2 whitespace-nowrap text-center">
                                                        {isPresent && (
                                                            <div className="flex justify-center gap-1 flex-nowrap">
                                                                <button onClick={() => handlePersonnelDressCodeChange(p.id, 'tidy')} className={`px-1.5 py-0.5 rounded text-[10px] border ${dressCode === 'tidy' ? 'bg-blue-500 text-white' : 'bg-white'}`}>เรียบร้อย</button>
                                                                <button onClick={() => handlePersonnelDressCodeChange(p.id, 'untidy')} className={`px-1.5 py-0.5 rounded text-[10px] border ${dressCode === 'untidy' ? 'bg-gray-500 text-white' : 'bg-white'}`}>ไม่</button>
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
                <div className="mt-4 flex justify-end border-t pt-3">
                     <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full text-white font-bold py-2.5 px-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm ${mode === 'student' ? 'bg-primary-blue hover:bg-primary-hover' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendancePage;
