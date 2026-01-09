import React from 'react';

interface CalculatedStats {
    studentStats: {
        period: string;
        present: number;
        absent: number;
        sick: number;
        leave: number;
        home: number;
    }[];
    personnelStats: {
        period: string;
        present: number;
        absent: number;
        sick: number;
        leave: number;
        home: number;
    }[];
}

interface AttendanceStatsProps {
    stats: CalculatedStats;
    selectedDate: string;
}

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className="text-center">
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
);

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ stats, selectedDate }) => {
    return (
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-navy mb-4">สถิติการเช็คชื่อรายคาบ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        </div>
                        <h4 className="font-bold text-blue-800">นักเรียน</h4>
                    </div>
                    {stats.studentStats.map(stat => (
                        <div key={stat.period} className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                            <p className="font-bold text-xs text-gray-500 mb-2">{stat.period}</p>
                            <div className="grid grid-cols-5 gap-1">
                                <StatItem label="มา" value={stat.present} color="text-emerald-600" />
                                <StatItem label="บ้าน" value={stat.home} color="text-indigo-500" />
                                <StatItem label="ขาด" value={stat.absent} color="text-rose-500" />
                                <StatItem label="ป่วย" value={stat.sick} color="text-amber-500" />
                                <StatItem label="ลา" value={stat.leave} color="text-yellow-500" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Personnel Section */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </div>
                        <h4 className="font-bold text-purple-800">บุคลากร</h4>
                    </div>
                    {stats.personnelStats.map(stat => (
                        <div key={stat.period} className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                            <p className="font-bold text-xs text-gray-500 mb-2">{stat.period}</p>
                            <div className="grid grid-cols-4 gap-1">
                                <StatItem label="มา" value={stat.present} color="text-emerald-600" />
                                <StatItem label="ขาด" value={stat.absent} color="text-rose-500" />
                                <StatItem label="ป่วย" value={stat.sick} color="text-amber-500" />
                                <StatItem label="ลา" value={stat.leave} color="text-yellow-500" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;
