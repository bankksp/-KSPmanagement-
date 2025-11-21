
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-8">
            {/* Student Stats */}
            <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-blue-500">
                <h3 className="text-sm md:text-lg font-bold text-navy mb-3 flex justify-between items-center">
                    <span className="truncate">สถิตินักเรียน ({selectedDate})</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap">{students.length} คน</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 text-center">
                    {stats.studentStats.map(stat => (
                        <div key={stat.period} className="bg-gray-50 p-2 md:p-3 rounded-lg">
                            <p className="font-bold text-gray-700 mb-1 text-xs md:text-base">{stat.period}</p>
                            <div className="text-xs md:text-sm space-y-0.5 md:space-y-1">
                                <p className="text-green-600">มา: {stat.present}</p>
                                <p className="text-red-500">ขาด: {stat.absent}</p>
                                <p className="text-amber-500">ลา/ป่วย: {stat.sick + stat.leave}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Personnel Stats */}
             <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-purple-500">
                <h3 className="text-sm md:text-lg font-bold text-navy mb-3 flex justify-between items-center">
                    <span className="truncate">สถิติคณะครู ({selectedDate})</span>
                     <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full whitespace-nowrap">{personnel.length} คน</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 text-center">
                    {stats.personnelStats.map(stat => (
                        <div key={stat.period} className="bg-gray-50 p-2 md:p-3 rounded-lg">
                            <p className="font-bold text-gray-700 mb-1 text-xs md:text-base">{stat.period}</p>
                            <div className="text-xs md:text-sm space-y-0.5 md:space-y-1">
                                <p className="text-green-600">ร่วม: {stat.present}</p>
                                <p className="text-red-500">ขาด: {stat.absent}</p>
                                <p className="text-amber-500">ลา/ป่วย: {stat.sick + stat.leave}</p>
                                <div className="flex justify-center gap-2 text-[10px] md:text-xs mt-1 pt-1 border-t border-gray-200">
                                    <span className="text-blue-600" title="แต่งกายเรียบร้อย">✓ {stat.tidy}</span>
                                    <span className="text-gray-500" title="แต่งกายไม่เรียบร้อย">✕ {stat.untidy}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;
