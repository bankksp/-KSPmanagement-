
import React, { useMemo } from 'react';
import { StudentAttendance, PersonnelAttendance, Student, Personnel } from '../types';

interface AttendanceStatsProps {
    studentAttendance: StudentAttendance[];
    personnelAttendance: PersonnelAttendance[];
    students: Student[];
    personnel: Personnel[];
    selectedDate: string;
}

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ 
    studentAttendance, 
    personnelAttendance, 
    students, 
    personnel,
    selectedDate 
}) => {
    
    const stats = useMemo(() => {
        const periods = ['morning', 'lunch', 'evening'] as const;
        const periodNames = { morning: 'เช้า', lunch: 'กลางวัน', evening: 'เย็น' };

        const studentStats = periods.map(period => {
            const records = studentAttendance.filter(r => r.date === selectedDate && r.period === period);
            return {
                period: periodNames[period],
                total: students.length,
                checked: records.length, 
                present: records.filter(r => r.status === 'present').length,
                absent: records.filter(r => r.status === 'absent').length,
                sick: records.filter(r => r.status === 'sick').length,
                leave: records.filter(r => r.status === 'leave').length,
            };
        });

        const personnelStats = periods.map(period => {
            const records = personnelAttendance.filter(r => r.date === selectedDate && r.period === period);
            const presentOrActivity = records.filter(r => r.status === 'present' || r.status === 'activity');
            return {
                period: periodNames[period],
                total: personnel.length,
                checked: records.length,
                present: presentOrActivity.length, 
                absent: records.filter(r => r.status === 'absent').length,
                sick: records.filter(r => r.status === 'sick').length,
                leave: records.filter(r => r.status === 'leave').length,
                tidy: presentOrActivity.filter(r => r.dressCode !== 'untidy').length, 
                untidy: presentOrActivity.filter(r => r.dressCode === 'untidy').length
            };
        });

        return { studentStats, personnelStats };
    }, [studentAttendance, personnelAttendance, students.length, personnel.length, selectedDate]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            {/* Student Stats */}
            <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-blue-500">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-navy truncate">นร. ({selectedDate})</h3>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap">{students.length} คน</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                    {stats.studentStats.map(stat => (
                        <div key={stat.period} className="bg-gray-50 p-1.5 rounded-md">
                            <p className="font-bold text-gray-700 mb-0.5 text-[10px]">{stat.period}</p>
                            <div className="text-[10px] flex flex-wrap justify-center gap-x-2">
                                <span className="text-green-600">มา {stat.present}</span>
                                <span className="text-red-500">ขาด {stat.absent}</span>
                                <span className="text-amber-500">ป่วย {stat.sick + stat.leave}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Personnel Stats */}
             <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-purple-500">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-navy truncate">ครู ({selectedDate})</h3>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full whitespace-nowrap">{personnel.length} คน</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                    {stats.personnelStats.map(stat => (
                        <div key={stat.period} className="bg-gray-50 p-1.5 rounded-md">
                            <p className="font-bold text-gray-700 mb-0.5 text-[10px]">{stat.period}</p>
                            <div className="text-[10px] flex flex-wrap justify-center gap-x-2">
                                <span className="text-green-600">มา {stat.present}</span>
                                <span className="text-red-500">ขาด {stat.absent}</span>
                                <span className="text-blue-600" title="เรียบร้อย">✓{stat.tidy}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;
