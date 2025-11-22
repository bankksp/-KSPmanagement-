
import React, { useState, useMemo } from 'react';
import { Report, Student, Personnel, StudentAttendance, PersonnelAttendance, DormitoryStat } from '../types';
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

    const { dormitoryData, totalStudentsReport, totalSick, totalHome, displayDate, buddhistDate } = useMemo(() => {
        const [yearStr, monthStr, dayStr] = selectedDate.split('-');
        const targetDay = parseInt(dayStr);
        const targetMonth = parseInt(monthStr) - 1; 
        const targetYear = parseInt(yearStr);

        const buddhistYear = targetYear + 543;
        const displayDateString = `${targetDay}/${targetMonth + 1}/${buddhistYear}`;

        // 1. Filter reports for the selected date
        const dayReports = reports.filter(r => {
            const d = parseThaiDate(r.reportDate);
            return d.getDate() === targetDay && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });

        // 2. Deduplicate: Use the LATEST report for each dormitory
        // Assuming reports with higher IDs are newer (or later in the array)
        const latestReportsMap = new Map<string, Report>();
        
        dayReports.forEach(report => {
            // If map already has this dorm, overwrite it (assuming loop order is oldest to newest or ID based)
            // If reports are not sorted, we might need to sort by ID first.
            // Let's assume the API returns them roughly in order, or check ID.
            const existing = latestReportsMap.get(report.dormitory);
            if (!existing || report.id > existing.id) {
                latestReportsMap.set(report.dormitory, report);
            }
        });

        const uniqueReports = Array.from(latestReportsMap.values());
        
        // 3. Aggregate Data
        const aggregatedStats = {
            present: 0,
            sick: 0,
            home: 0
        };
        
        // Helper to get total students in a dorm for fallback calculation
        const getDormStudentCount = (dormName: string) => students.filter(s => s.dormitory === dormName).length;

        const finalDormitoryData: DormitoryStat[] = dormitories.map(dormName => {
             // Skip Infirmary for the main bar chart usually, but user might want it. 
             // Usually Infirmary is separate chart, but let's include if it's in dormitories list.
             if (dormName === "เรือนพยาบาล") return null;

             const report = latestReportsMap.get(dormName);
             
             let present = 0;
             let sick = 0;
             let home = 0;

             if (report) {
                 present = report.presentCount || 0;
                 sick = report.sickCount || 0;
                 
                 // Use homeCount from report if available, otherwise calculate fallback
                 if (report.homeCount !== undefined) {
                     home = report.homeCount;
                 } else {
                     // Fallback for old records: Total Students - Present - Sick
                     const totalInDorm = getDormStudentCount(dormName);
                     home = Math.max(0, totalInDorm - present - sick);
                 }
             } else {
                 // No report for this dorm today, everything is 0 or handle as "No Data"
                 // Let's show as 0 to keep chart clean
             }

             return {
                 name: dormName,
                 present,
                 sick,
                 home,
                 total: present + sick + home
             };
        }).filter(Boolean) as DormitoryStat[];

        // Calculate totals from the Unique Reports (including Infirmary logic if needed)
        uniqueReports.forEach(r => {
            if (r.dormitory === 'เรือนพยาบาล') {
                // Infirmary just adds to sick count usually
                aggregatedStats.sick += r.sickCount;
            } else {
                aggregatedStats.present += r.presentCount;
                aggregatedStats.sick += r.sickCount;
                // Logic for home count
                if (r.homeCount !== undefined) {
                    aggregatedStats.home += r.homeCount;
                } else {
                    const totalInDorm = getDormStudentCount(r.dormitory);
                    aggregatedStats.home += Math.max(0, totalInDorm - r.presentCount - r.sickCount);
                }
            }
        });

        return {
            dormitoryData: finalDormitoryData,
            totalStudentsReport: aggregatedStats.present,
            totalSick: aggregatedStats.sick,
            totalHome: aggregatedStats.home,
            displayDate: `ข้อมูลวันที่ ${displayDateString}`,
            buddhistDate: displayDateString
        };

    }, [reports, dormitories, selectedDate, students]);
    
    // Calculate 7 Days History for Infirmary/Dorm Sickness (Same logic, just ensuring deduplication if needed)
    const historyData = useMemo(() => {
        const history = [];
        const current = new Date(selectedDate); 
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(current);
            d.setDate(d.getDate() - i);
            
            const year = d.getFullYear();
            const buddhistYear = year + 543;
            const matchDate = `${d.getDate()}/${d.getMonth() + 1}/${buddhistYear}`;
            
            // Filter reports for this date
            const dayReports = reports.filter(r => r.reportDate === matchDate);
            
            // Deduplicate for history too
            const uniqueDayReports = new Map<string, Report>();
            dayReports.forEach(r => {
                 const existing = uniqueDayReports.get(r.dormitory);
                 if (!existing || r.id > existing.id) uniqueDayReports.set(r.dormitory, r);
            });

            let sickDorm = 0;
            let sickInfirmary = 0;
            
            uniqueDayReports.forEach(r => {
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

    const exportToCSV = () => {
         const headers = ['เรือนนอน', 'มาเรียน', 'ป่วย', 'อยู่บ้าน'];
        const rows = dormitoryData.map(d => [d.name, d.present, d.sick, d.home]);
        
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
                        title="มาเรียน" 
                        value={`${totalStudentsReport} คน`} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        color="bg-green-500"
                        description={`วันที่ ${buddhistDate}`}
                    />
                    <StatsCard 
                        title="ป่วย" 
                        value={`${totalSick} คน`} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        color="bg-red-500"
                        description={`วันที่ ${buddhistDate}`}
                    />
                     <StatsCard 
                        title="อยู่บ้าน" 
                        value={`${totalHome} คน`}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>}
                        color="bg-gray-500"
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
                                <th className="border border-gray-300 p-2">มาเรียน</th>
                                <th className="border border-gray-300 p-2">ป่วย</th>
                                <th className="border border-gray-300 p-2">อยู่บ้าน</th>
                                <th className="border border-gray-300 p-2">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dormitoryData.map(d => (
                                <tr key={d.name}>
                                    <td className="border border-gray-300 p-2">{d.name}</td>
                                    <td className="border border-gray-300 p-2 text-center text-green-700 font-bold">{d.present}</td>
                                    <td className="border border-gray-300 p-2 text-center text-red-600 font-bold">{d.sick}</td>
                                    <td className="border border-gray-300 p-2 text-center text-gray-600">{d.home}</td>
                                    <td className="border border-gray-300 p-2 text-center font-semibold">{d.total}</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                                <td className="border border-gray-300 p-2 text-right">รวม</td>
                                <td className="border border-gray-300 p-2 text-center text-green-700">{totalStudentsReport}</td>
                                <td className="border border-gray-300 p-2 text-center text-red-600">{totalSick}</td>
                                <td className="border border-gray-300 p-2 text-center text-gray-600">{totalHome}</td>
                                <td className="border border-gray-300 p-2 text-center">{totalStudentsReport + totalSick + totalHome}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
