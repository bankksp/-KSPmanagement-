
import React, { useState, useMemo } from 'react';
import { Report, Student, Personnel, StudentAttendance, PersonnelAttendance } from '../types';
import StatsCard from './StatsCard';
import ReportChart from './ReportChart';
import InfirmaryChart from './InfirmaryChart';
import AttendanceStats from './AttendanceStats';
import { getDirectDriveImageSrc } from '../utils';

interface DashboardProps {
    reports: Report[];
    students: Student[];
    personnel: Personnel[];
    dormitories: string[];
    schoolName: string;
    schoolLogo: string;
    studentAttendance?: StudentAttendance[];
    personnelAttendance?: PersonnelAttendance[];
}

const parseThaiDate = (dateString: string): Date => {
    const parts = dateString.split('/');
    if (parts.length !== 3) return new Date(0);
    const [day, month, year] = parts.map(Number);
    const gregorianYear = year - 543;
    return new Date(gregorianYear, month - 1, day);
};

const Dashboard: React.FC<DashboardProps> = ({ 
    reports, students, personnel, dormitories, schoolName, schoolLogo,
    studentAttendance = [], personnelAttendance = []
}) => {
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const { dormitoryData, totalStudentsReport, totalSick, displayDate, buddhistDate } = useMemo(() => {
        const [yearStr, monthStr, dayStr] = selectedDate.split('-');
        const targetDay = parseInt(dayStr);
        const targetMonth = parseInt(monthStr) - 1; 
        const targetYear = parseInt(yearStr);

        const buddhistYear = targetYear + 543;
        const displayDateString = `${targetDay}/${targetMonth + 1}/${buddhistYear}`;

        const filterFn = (r: Report) => {
            const d = parseThaiDate(r.reportDate);
            return d.getDate() === targetDay && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        };

        const filteredReports = reports.filter(filterFn);
        
        const aggregatedByDorm = filteredReports.reduce((acc, report) => {
            if (report.dormitory === 'เรือนพยาบาล') {
                if(!acc['เรือนพยาบาล']) acc['เรือนพยาบาล'] = { presentCount: 0, sickCount: 0 };
                acc['เรือนพยาบาล'].sickCount += report.sickCount;
                return acc;
            }

            if (!acc[report.dormitory]) {
                acc[report.dormitory] = { presentCount: 0, sickCount: 0 };
            }
            acc[report.dormitory].presentCount += report.presentCount;
            acc[report.dormitory].sickCount += report.sickCount;
            return acc;
        }, {} as Record<string, { presentCount: number, sickCount: number }>);


        const finalDormitoryData = dormitories.filter(d => d !== "เรือนพยาบาล").map(dormName => {
            const stats = aggregatedByDorm[dormName];
            return {
                name: dormName,
                total: stats ? stats.presentCount + stats.sickCount : 0,
                sick: stats ? stats.sickCount : 0,
            };
        });

        const finalTotalStudents = Object.values(aggregatedByDorm).reduce((sum, dorm) => sum + (dorm.presentCount || 0), 0);
        const finalTotalSick = Object.values(aggregatedByDorm).reduce((sum, dorm) => sum + (dorm.sickCount || 0), 0);

        return {
            dormitoryData: finalDormitoryData,
            totalStudentsReport: finalTotalStudents,
            totalSick: finalTotalSick,
            displayDate: `ข้อมูลวันที่ ${displayDateString}`,
            buddhistDate: displayDateString
        };

    }, [reports, dormitories, selectedDate]);
    
    // Calculate 7 Days History for Infirmary/Dorm Sickness
    const historyData = useMemo(() => {
        const history = [];
        const current = new Date(selectedDate); 
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(current);
            d.setDate(d.getDate() - i);
            
            const year = d.getFullYear();
            // To match Buddhist Date String Format DD/MM/YYYY
            const buddhistYear = year + 543;
            const day = String(d.getDate()).padStart(2, '0'); // Ensure 2 digits
            // In parseThaiDate/Report, month is 1-indexed? Yes "month - 1" in parse. So string format likely "D/M/YYYY" or "DD/MM/YYYY"
            // But reports.reportDate comes from modal: date.getMonth() + 1
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure 2 digits just in case, but reportModal does not pad? 
            // Actually reportModal: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543}` (No padding)
            // Let's try both or assume no padding for matching if needed, but best to be consistent.
            // Let's construct exact string as ReportModal does.
            const matchDate = `${d.getDate()}/${d.getMonth() + 1}/${buddhistYear}`;
            
            // Filter reports for this date
            const dayReports = reports.filter(r => r.reportDate === matchDate);
            
            let sickDorm = 0;
            let sickInfirmary = 0;
            
            dayReports.forEach(r => {
                if (r.dormitory === 'เรือนพยาบาล') {
                    sickInfirmary += r.sickCount;
                } else {
                    sickDorm += r.sickCount;
                }
            });
            
            history.push({
                date: `${d.getDate()}/${d.getMonth() + 1}`,
                sickDorm,
                sickInfirmary
            });
        }
        return history;
    }, [reports, selectedDate]);

    const logoSrc = getDirectDriveImageSrc(schoolLogo);

    // --- Export Functions (Simplified for brevity, same logic) ---
    const exportToCSV = () => {
        // ... existing csv logic
         const headers = ['เรือนนอน', 'จำนวนนักเรียนมา', 'จำนวนป่วย'];
        const rows = dormitoryData.map(d => [d.name, d.total, d.sick]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + "\uFEFF" 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_stats_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header Section */}
            <div className="hidden print:block text-center my-8">
                <div className="flex justify-center items-center gap-4">
                    <img 
                        src={logoSrc} 
                        alt="School Logo" 
                        className="h-20 w-20 object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                    />
                    <div>
                        <h1 className="text-2xl font-bold text-navy">{schoolName}</h1>
                        <h2 className="text-xl font-semibold text-secondary-gray">รายงานสถิติประจำวัน</h2>
                    </div>
                </div>
                 <p className="text-lg mt-4">{displayDate}</p>
            </div>
            
            {/* Overview Statistics Section */}
            <div className="no-print">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <div>
                         <h2 className="text-2xl font-bold text-navy">ภาพรวมสถิติ</h2>
                         <p className="text-sm text-gray-500">{displayDate}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-transparent"
                        />
                        
                        <div className="relative">
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                                title="Export"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-20 border border-gray-100 overflow-hidden">
                                    <button onClick={() => { window.print(); setIsExportMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50">พิมพ์ / PDF</button>
                                    <button onClick={exportToCSV} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">Excel (CSV)</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     <StatsCard 
                        title="นักเรียนทั้งหมด" 
                        value={`${students.length} คน`} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>}
                        color="bg-blue-500"
                    />
                    <StatsCard 
                        title="บุคลากรทั้งหมด" 
                        value={`${personnel.length} คน`}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>}
                        color="bg-purple-500"
                    />
                    <StatsCard 
                        title="นักเรียนมาเรียน" 
                        value={`${totalStudentsReport} คน`} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        color="bg-green-500"
                        description={`วันที่ ${buddhistDate}`}
                    />
                    <StatsCard 
                        title="นักเรียนป่วย" 
                        value={`${totalSick} คน`} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        color="bg-red-500"
                        description={`วันที่ ${buddhistDate}`}
                    />
                </div>
            </div>

            {/* Content Section */}
            <div className="space-y-6">
                {/* Attendance Stats */}
                <div className="no-print">
                    <AttendanceStats 
                        studentAttendance={studentAttendance}
                        personnelAttendance={personnelAttendance}
                        students={students}
                        personnel={personnel}
                        selectedDate={buddhistDate}
                    />
                </div>
                
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ReportChart data={dormitoryData} />
                    <InfirmaryChart data={historyData} />
                </div>

                {/* Data Table for Print View (Hidden on Screen) */}
                <div className="hidden print:block mt-8">
                     <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2">เรือนนอน</th>
                                <th className="border border-gray-300 p-2">จำนวนนักเรียน</th>
                                <th className="border border-gray-300 p-2">ป่วย</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dormitoryData.map(d => (
                                <tr key={d.name}>
                                    <td className="border border-gray-300 p-2">{d.name}</td>
                                    <td className="border border-gray-300 p-2 text-center">{d.total}</td>
                                    <td className="border border-gray-300 p-2 text-center text-red-600">{d.sick}</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                                <td className="border border-gray-300 p-2 text-right">รวม</td>
                                <td className="border border-gray-300 p-2 text-center">{totalStudentsReport}</td>
                                <td className="border border-gray-300 p-2 text-center">{totalSick}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
