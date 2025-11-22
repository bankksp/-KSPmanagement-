
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

    const StatRow = ({ period, present, absent, sick, leave, color }: { period: string, present: number, absent: number, sick?: number, leave: number, color: string }) => (
        <div className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="w-16 font-semibold text-gray-700">{period}</div>
            <div className="flex-1 flex justify-end gap-2 md:gap-4 text-xs md:text-sm">
                <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-green-600 font-bold text-lg">{present}</span>
                    <span className="text-gray-400 text-[10px]">มา</span>
                </div>
                <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-red-500 font-bold text-lg">{absent}</span>
                    <span className="text-gray-400 text-[10px]">ขาด</span>
                </div>
                {sick !== undefined && (
                     <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-orange-500 font-bold text-lg">{sick}</span>
                        <span className="text-gray-400 text-[10px]">ป่วย</span>
                    </div>
                )}
                <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-yellow-500 font-bold text-lg">{leave}</span>
                    <span className="text-gray-400 text-[10px]">ลา</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Student Stats Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <h3 className="font-bold">สถิตินักเรียน</h3>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{selectedDate}</span>
                </div>
                <div className="p-4">
                    {stats.studentStats.map(stat => (
                        <StatRow 
                            key={stat.period} 
                            period={stat.period} 
                            present={stat.present} 
                            absent={stat.absent} 
                            sick={stat.sick}
                            leave={stat.leave}
                            color="blue" 
                        />
                    ))}
                </div>
            </div>

            {/* Personnel Stats Card */}
             <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <h3 className="font-bold">สถิติบุคลากร</h3>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{selectedDate}</span>
                </div>
                <div className="p-4">
                    {stats.personnelStats.map(stat => (
                        <StatRow 
                            key={stat.period} 
                            period={stat.period} 
                            present={stat.present} 
                            absent={stat.absent} 
                            leave={stat.leave}
                            sick={stat.sick} // Add sick just in case
                            color="purple" 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;
