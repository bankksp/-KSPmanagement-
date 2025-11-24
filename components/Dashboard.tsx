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

    // --- Data Processing ---

    const { dormitoryData, totalStudentsReport, totalSick, totalHome, displayDate, buddhistDate } = useMemo(() => {
        const [yearStr, monthStr, dayStr] = selectedDate.split('-');
        const targetDay = parseInt(dayStr);
        const targetMonth = parseInt(monthStr) - 1; 
        const targetYear = parseInt(yearStr);

        const buddhistYear = targetYear + 543;
        const displayDateString = `${targetDay}/${targetMonth + 1}/${buddhistYear}`;

        const dayReports = reports.filter(r => {
            const d = parseThaiDate(r.reportDate);
            return d.getDate() === targetDay && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });

        const latestReportsMap = new Map<string, Report>();
        dayReports.forEach(report => {
            const existing = latestReportsMap.get(report.dormitory);
            if (!existing || report.id > existing.id) {
                latestReportsMap.set(report.dormitory, report);
            }
        });

        const uniqueReports = Array.from(latestReportsMap.values());
        
        const aggregatedStats = { present: 0, sick: 0, home: 0 };
        const getDormStudentCount = (dormName: string) => students.filter(s => s.dormitory === dormName).length;

        const finalDormitoryData: DormitoryStat[] = dormitories.map(dormName => {
             if (dormName === "เรือนพยาบาล") return null;

             const report = latestReportsMap.get(dormName);
             let present = 0, sick = 0, home = 0;

             if (report) {
                 present = report.presentCount || 0;
                 sick = report.sickCount || 0;
                 if (report.homeCount !== undefined) {
                     home = report.homeCount;
                 } else {
                     const totalInDorm = getDormStudentCount(dormName);
                     home = Math.max(0, totalInDorm - present - sick);
                 }
             }

             return {
                 name: dormName,
                 present,
                 sick,
                 home,
                 total: present + sick + home
             };
        }).filter(Boolean) as DormitoryStat[];

        uniqueReports.forEach(r => {
            if (r.dormitory === 'เรือนพยาบาล') {
                aggregatedStats.sick += r.sickCount;
            } else {
                aggregatedStats.present += r.presentCount;
                aggregatedStats.sick += r.sickCount;
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
            displayDate: `ประจำวันที่ ${displayDateString}`,
            buddhistDate: displayDateString
        };

    }, [reports, dormitories, selectedDate, students]);
    
    const historyData = useMemo(() => {
        const history = [];
        const current = new Date(selectedDate); 
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(current);
            d.setDate(d.getDate() - i);
            
            const year = d.getFullYear();
            const buddhistYear = year + 543;
            const matchDate = `${d.getDate()}/${d.getMonth() + 1}/${buddhistYear}`;
            
            const dayReports = reports.filter(r => r.reportDate === matchDate);
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

    // Calculate Attendance Stats for Export
    const attendanceStatsData = useMemo(() => {
        const periods = ['morning', 'lunch', 'evening'] as const;
        const periodNames = { morning: 'เช้า', lunch: 'กลางวัน', evening: 'เย็น' };

        const studentStats = periods.map(period => {
            const records = studentAttendance.filter(r => r.date === buddhistDate && r.period === period);
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
            const records = personnelAttendance.filter(r => r.date === buddhistDate && r.period === period);
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
    }, [studentAttendance, personnelAttendance, students.length, personnel.length, buddhistDate]);

    const logoSrc = getDirectDriveImageSrc(schoolLogo);

    // --- Export Functions ---

    const exportToExcel = () => {
        const printContent = document.getElementById('print-dashboard');
        if (!printContent) return;
        
        // Extract tables from print view for better formatting
        const htmlString = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
            <style>
                body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                table { border-collapse: collapse; width: 100%; }
                td, th { border: 1px solid black; padding: 5px; text-align: center; }
                .header { text-align: center; font-weight: bold; font-size: 20pt; }
            </style>
        </head>
        <body>
            ${printContent.innerHTML}
        </body>
        </html>`;

        const blob = new Blob([htmlString], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_stats_${selectedDate}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const exportToWord = () => {
        const printContent = document.getElementById('print-dashboard');
        if (!printContent) return;

        const htmlString = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Report</title>
                <style>
                    @page {
                        size: A4;
                        margin: 2cm;
                        mso-page-orientation: portrait;
                    }
                    body { 
                        font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif; 
                        font-size: 16pt; 
                        line-height: 1.5;
                    }
                    table { 
                        border-collapse: collapse; 
                        width: 100%; 
                        margin-bottom: 10pt;
                    }
                    td, th { 
                        border: 1px solid black; 
                        padding: 4pt; 
                        text-align: center; 
                        vertical-align: middle;
                    }
                    .header-title { font-size: 29pt; font-weight: bold; text-align: center; }
                    .content-header { font-size: 20pt; font-weight: bold; margin-bottom: 5pt; }
                    .signature-section { margin-top: 30pt; text-align: right; }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlString], {
            type: 'application/msword'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_stats_${selectedDate}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        // Add a class to body to isolate this print view
        document.body.classList.add('printing-dashboard');
        window.print();
        document.body.classList.remove('printing-dashboard');
    };

    return (
        <div className="space-y-6 md:space-y-8">
             {/* ---------------- PRINT LAYOUT (Official A4 Government Style - Memo) ---------------- */}
             <div id="print-dashboard" className="hidden print:block print-visible font-sarabun text-black leading-relaxed">
                
                {/* Official Header with Garuda/Logo */}
                <div className="flex flex-col items-center mb-4">
                    <img 
                        src={logoSrc} 
                        alt="Logo" 
                        className="h-24 w-auto mb-2 object-contain" 
                        onError={(e) => (e.currentTarget.style.display = 'none')} 
                    />
                    <h1 className="text-2xl font-bold mt-2">บันทึกข้อความ</h1>
                </div>

                <div className="mb-2 px-1 text-xl">
                    <div className="flex gap-2 mb-1 items-baseline">
                        <span className="font-bold w-20 flex-shrink-0">ส่วนราชการ</span>
                        <span className="border-b-2 border-dotted border-gray-400 flex-grow px-2">{schoolName}</span>
                    </div>
                    <div className="flex gap-4 mb-1">
                        <div className="flex gap-2 w-1/2 items-baseline">
                            <span className="font-bold w-10 flex-shrink-0">ที่</span>
                            <span className="border-b-2 border-dotted border-gray-400 flex-grow px-2">..............................</span>
                        </div>
                        <div className="flex gap-2 w-1/2 items-baseline">
                            <span className="font-bold w-10 flex-shrink-0">วันที่</span>
                            <span className="border-b-2 border-dotted border-gray-400 flex-grow px-2">{buddhistDate}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 mb-2 items-baseline">
                        <span className="font-bold w-12 flex-shrink-0">เรื่อง</span>
                        <span className="border-b-2 border-dotted border-gray-400 flex-grow px-2">รายงานสรุปสถิติการมาเรียนและสุขภาพอนามัยนักเรียน</span>
                    </div>
                </div>

                <div className="border-t border-black w-full mb-4 opacity-50"></div>
                
                <div className="mb-4 text-xl">
                    <p className="font-bold mb-2">เรียน ผู้อำนวยการสถานศึกษา</p>
                    <p className="indent-[2.5cm] text-justify leading-relaxed">
                        ด้วยข้าพเจ้าได้รับมอบหมายให้ปฏิบัติหน้าที่เวรประจำวัน ได้ทำการสำรวจข้อมูลการมาเรียนและสุขภาพอนามัยของนักเรียน
                        ประจำวันที่ {buddhistDate} จึงขอรายงานสรุปผลการดำเนินงานดังนี้
                    </p>
                </div>

                {/* 1. Summary Box */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">1. สรุปภาพรวม</h3>
                    <table className="w-full border border-black text-center text-xl print-table">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-black p-2">นักเรียนทั้งหมด</th>
                                <th className="border border-black p-2">มาเรียน</th>
                                <th className="border border-black p-2">ป่วย</th>
                                <th className="border border-black p-2">อยู่บ้าน/ลา</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2">{students.length}</td>
                                <td className="border border-black p-2">{totalStudentsReport}</td>
                                <td className="border border-black p-2">{totalSick}</td>
                                <td className="border border-black p-2">{totalHome}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 2. Attendance Statistics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold mb-2">2. สถิตินักเรียน</h3>
                        <table className="w-full border border-black text-center text-xl print-table">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border border-black p-1">ช่วงเวลา</th>
                                    <th className="border border-black p-1">มา</th>
                                    <th className="border border-black p-1">ขาด</th>
                                    <th className="border border-black p-1">ป่วย</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceStatsData.studentStats.map(s => (
                                    <tr key={s.period}>
                                        <td className="border border-black p-1">{s.period}</td>
                                        <td className="border border-black p-1">{s.present}</td>
                                        <td className="border border-black p-1">{s.absent}</td>
                                        <td className="border border-black p-1">{s.sick}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold mb-2">3. สถิติบุคลากร</h3>
                         <table className="w-full border border-black text-center text-xl print-table">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border border-black p-1">ช่วงเวลา</th>
                                    <th className="border border-black p-1">มา</th>
                                    <th className="border border-black p-1">ขาด</th>
                                    <th className="border border-black p-1">ลา</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceStatsData.personnelStats.map(s => (
                                    <tr key={s.period}>
                                        <td className="border border-black p-1">{s.period}</td>
                                        <td className="border border-black p-1">{s.present}</td>
                                        <td className="border border-black p-1">{s.absent}</td>
                                        <td className="border border-black p-1">{s.leave}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Dorm Stats Table */}
                 <div className="mb-8 avoid-break">
                    <h3 className="text-xl font-bold mb-2">4. ข้อมูลเรือนนอน</h3>
                    <table className="w-full border border-black text-center text-xl print-table">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-black p-1 text-left pl-4">เรือนนอน</th>
                                <th className="border border-black p-1">มาเรียน</th>
                                <th className="border border-black p-1">ป่วย</th>
                                <th className="border border-black p-1">อยู่บ้าน</th>
                                <th className="border border-black p-1">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dormitoryData.map(d => (
                                <tr key={d.name}>
                                    <td className="border border-black p-1 text-left pl-4">{d.name}</td>
                                    <td className="border border-black p-1">{d.present}</td>
                                    <td className="border border-black p-1">{d.sick}</td>
                                    <td className="border border-black p-1">{d.home}</td>
                                    <td className="border border-black p-1 font-semibold">{d.total}</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-100">
                                <td className="border border-black p-1 text-right pr-4">รวมทั้งหมด</td>
                                <td className="border border-black p-1">{totalStudentsReport}</td>
                                <td className="border border-black p-1">{totalSick}</td>
                                <td className="border border-black p-1">{totalHome}</td>
                                <td className="border border-black p-1">{totalStudentsReport + totalSick + totalHome}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                 <div className="mb-4 text-xl">
                    <p className="indent-[2.5cm] text-justify">
                        จึงเรียนมาเพื่อโปรดทราบ
                    </p>
                </div>

                 <div className="mt-16 flex justify-end text-xl signature-section avoid-break">
                    <div className="text-center w-80">
                        <p className="mb-6">ลงชื่อ ........................................................... ผู้รายงาน</p>
                        <p className="mb-2">(...........................................................)</p>
                        <p className="mb-2">ตำแหน่ง ...........................................................</p>
                    </div>
                </div>
            </div>

            {/* ---------------- SCREEN LAYOUT ---------------- */}
            <div className="print:hidden">
                {/* Header Section */}
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
                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                                title="Export Options"
                            >
                                <span>ส่งออก</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-20 border border-gray-100 overflow-hidden animate-fade-in-up">
                                    <button onClick={handlePrint} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-blue flex items-center gap-3 transition-colors border-b border-gray-50">
                                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                        พิมพ์ / PDF
                                    </button>
                                    <button onClick={exportToWord} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        ส่งออก Word (.doc)
                                    </button>
                                    <button onClick={exportToExcel} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-3 transition-colors">
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        ส่งออก Excel (.xls)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
                    <StatsCard 
                        title="มาเรียนวันนี้" 
                        value={totalStudentsReport.toString()} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>}
                        color="bg-gradient-to-br from-green-400 to-green-600"
                    />
                    <StatsCard 
                        title="ป่วยวันนี้" 
                        value={totalSick.toString()} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        color="bg-gradient-to-br from-red-400 to-red-600"
                    />
                    <StatsCard 
                        title="อยู่บ้าน/ลา" 
                        value={totalHome.toString()} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>}
                        color="bg-gradient-to-br from-blue-400 to-blue-600"
                    />
                    <StatsCard 
                        title="เรือนที่รายงาน" 
                        value={`${dormitoryData.length}/${dormitories.length-1}`} 
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>}
                        color="bg-gradient-to-br from-purple-400 to-purple-600"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                     <ReportChart data={dormitoryData} />
                     <InfirmaryChart data={historyData} />
                </div>

                <h3 className="text-xl font-bold text-navy mb-4">ข้อมูลการเช็คชื่อวันนี้</h3>
                <AttendanceStats 
                    stats={attendanceStatsData} 
                    selectedDate={buddhistDate}
                />
            </div>
        </div>
    );
};

export default Dashboard;