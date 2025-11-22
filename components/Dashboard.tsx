
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
            displayDate: `ข้อมูลวันที่ ${displayDateString}`,
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

    const exportToCSV = () => {
        const headers = ['เรือนนอน', 'มาเรียน', 'ป่วย', 'อยู่บ้าน'];
        const rows = dormitoryData.map(d => [d.name, d.present, d.sick, d.home]);
        
        const csvContent = "\uFEFF" 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `report_stats_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handleExportWord = () => {
        const preHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Export Stats to Word</title>
                <style>
                    @page Section1 {
                        size: 21.0cm 29.7cm;
                        margin: 1.5cm 1.5cm 1.5cm 1.5cm;
                        mso-header-margin: 35.4pt;
                        mso-footer-margin: 35.4pt;
                        mso-paper-source: 0;
                    }
                    div.Section1 { page:Section1; }
                    body { font-family: 'TH SarabunPSK', 'TH Sarabun New', sans-serif; }
                    
                    .header { text-align: center; margin-bottom: 20px; }
                    .title { font-size: 18pt; font-weight: bold; margin: 0; }
                    .subtitle { font-size: 16pt; font-weight: bold; margin: 0; }
                    .date { font-size: 16pt; margin: 5px 0; }
                    
                    h3 { font-size: 18pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; }
                    
                    table { width: 100%; border-collapse: collapse; font-size: 16pt; margin-bottom: 10px; }
                    th, td { border: 1px solid black; padding: 4px; text-align: center; }
                    th { background-color: #f0f0f0; font-weight: bold; }
                    .text-left { text-align: left; padding-left: 8px; }
                    .text-right { text-align: right; padding-right: 8px; }
                    
                    .signature-section { margin-top: 50px; text-align: right; font-size: 16pt; }
                    .signature-box { display: inline-block; text-align: center; width: 250px; }
                    
                    .summary-box { border: 1px solid #000; padding: 10px; text-align: center; width: 23%; display: inline-block; margin-right: 1%; vertical-align: top; }
                </style>
            </head>
            <body><div class="Section1">
        `;

        // 1. Summary Section
        const summaryHtml = `
            <div class="header">
                <div class="title">${schoolName}</div>
                <div class="subtitle">รายงานสถิติประจำวัน</div>
                <div class="date">${displayDate}</div>
            </div>
            
            <h3>ภาพรวมสถิติ</h3>
            <table>
                <thead>
                    <tr>
                        <th>นักเรียนทั้งหมด</th>
                        <th>มาเรียน</th>
                        <th>ป่วย</th>
                        <th>อยู่บ้าน</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${students.length}</td>
                        <td style="color: green; font-weight: bold;">${totalStudentsReport}</td>
                        <td style="color: red; font-weight: bold;">${totalSick}</td>
                        <td>${totalHome}</td>
                    </tr>
                </tbody>
            </table>
        `;

        // 2. Attendance Stats (Student)
        const studentStatsRows = attendanceStatsData.studentStats.map(s => `
            <tr>
                <td class="text-left">${s.period}</td>
                <td>${s.present}</td>
                <td>${s.absent}</td>
                <td>${s.sick}</td>
                <td>${s.leave}</td>
            </tr>
        `).join('');
        
        const studentStatsHtml = `
            <h3>สถิตินักเรียน</h3>
            <table>
                <thead>
                    <tr>
                        <th>ช่วงเวลา</th>
                        <th>มา</th>
                        <th>ขาด</th>
                        <th>ป่วย</th>
                        <th>ลา</th>
                    </tr>
                </thead>
                <tbody>${studentStatsRows}</tbody>
            </table>
        `;

        // 3. Attendance Stats (Personnel)
        const personnelStatsRows = attendanceStatsData.personnelStats.map(s => `
            <tr>
                <td class="text-left">${s.period}</td>
                <td>${s.present}</td>
                <td>${s.absent}</td>
                <td>${s.leave}</td>
                <td>${s.tidy} / ${s.untidy}</td>
            </tr>
        `).join('');

        const personnelStatsHtml = `
            <h3>สถิติบุคลากร</h3>
            <table>
                <thead>
                    <tr>
                        <th>ช่วงเวลา</th>
                        <th>มา</th>
                        <th>ขาด</th>
                        <th>ลา</th>
                        <th>แต่งกาย (เรียบร้อย/ไม่)</th>
                    </tr>
                </thead>
                <tbody>${personnelStatsRows}</tbody>
            </table>
        `;

        // 4. Dormitory Stats
        const dormRows = dormitoryData.map(d => `
            <tr>
                <td class="text-left">${d.name}</td>
                <td>${d.present}</td>
                <td>${d.sick}</td>
                <td>${d.home}</td>
                <td>${d.total}</td>
            </tr>
        `).join('');

        const dormTableHtml = `
            <h3>สถิติจำนวนนักเรียนรายเรือนนอน</h3>
            <table>
                <thead>
                    <tr>
                        <th>เรือนนอน</th>
                        <th>มาเรียน</th>
                        <th>ป่วย</th>
                        <th>อยู่บ้าน</th>
                        <th>รวม</th>
                    </tr>
                </thead>
                <tbody>
                    ${dormRows}
                    <tr style="font-weight: bold; background-color: #f9f9f9;">
                        <td class="text-right">รวม</td>
                        <td>${totalStudentsReport}</td>
                        <td>${totalSick}</td>
                        <td>${totalHome}</td>
                        <td>${totalStudentsReport + totalSick + totalHome}</td>
                    </tr>
                </tbody>
            </table>
        `;

        // 5. History Trends
        const historyRows = historyData.map(h => `
            <tr>
                <td class="text-left">${h.date}</td>
                <td>${h.sickDorm}</td>
                <td>${h.sickInfirmary}</td>
                <td>${h.sickDorm + h.sickInfirmary}</td>
            </tr>
        `).join('');

        const historyHtml = `
            <h3>แนวโน้มสถิติผู้ป่วย (7 วันย้อนหลัง)</h3>
            <table>
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>ป่วย (ตามเรือนนอน)</th>
                        <th>ป่วย (เรือนพยาบาล)</th>
                        <th>รวม</th>
                    </tr>
                </thead>
                <tbody>${historyRows}</tbody>
            </table>
        `;

        const signatureHtml = `
            <div class="signature-section">
                <div class="signature-box">
                    <p>ลงชื่อ ........................................................... ผู้รายงาน</p>
                    <p>(...........................................................)</p>
                    <p>วันที่ ........./........./.............</p>
                </div>
            </div>
        `;

        const content = summaryHtml + studentStatsHtml + personnelStatsHtml + dormTableHtml + historyHtml + signatureHtml;
        const html = preHtml + content + "</div></body></html>";
        
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `full_stats_report_${selectedDate}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    return (
        <div className="space-y-6 md:space-y-8">
             {/* ---------------- PRINT LAYOUT (A4) ---------------- */}
             <div className="hidden print:block font-sarabun text-black">
                <div className="text-center mb-6">
                    <h1 className="text-[18pt] font-bold">{schoolName}</h1>
                    <h2 className="text-[18pt] font-bold">รายงานสถิติประจำวัน</h2>
                    <p className="text-[16pt]">{displayDate}</p>
                </div>

                {/* 1. Summary */}
                <div className="mb-6 border border-black p-4">
                    <div className="grid grid-cols-4 gap-4 text-center text-[16pt]">
                        <div>
                            <div className="font-bold">นักเรียนทั้งหมด</div>
                            <div>{students.length} คน</div>
                        </div>
                        <div>
                            <div className="font-bold">มาเรียน</div>
                            <div>{totalStudentsReport} คน</div>
                        </div>
                        <div>
                            <div className="font-bold text-red-600">ป่วย</div>
                            <div>{totalSick} คน</div>
                        </div>
                        <div>
                            <div className="font-bold">อยู่บ้าน</div>
                            <div>{totalHome} คน</div>
                        </div>
                    </div>
                </div>

                {/* 2. Attendance Tables */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 className="text-[18pt] font-bold border-b border-black mb-2">สถิตินักเรียน</h3>
                        <table className="w-full text-[16pt] border-collapse border border-black">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-1">เวลา</th>
                                    <th className="border border-black p-1">มา</th>
                                    <th className="border border-black p-1">ขาด</th>
                                    <th className="border border-black p-1">ป่วย</th>
                                    <th className="border border-black p-1">ลา</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceStatsData.studentStats.map(s => (
                                    <tr key={s.period}>
                                        <td className="border border-black p-1 text-center">{s.period}</td>
                                        <td className="border border-black p-1 text-center">{s.present}</td>
                                        <td className="border border-black p-1 text-center">{s.absent}</td>
                                        <td className="border border-black p-1 text-center">{s.sick}</td>
                                        <td className="border border-black p-1 text-center">{s.leave}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-[18pt] font-bold border-b border-black mb-2">สถิติบุคลากร</h3>
                         <table className="w-full text-[16pt] border-collapse border border-black">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-1">เวลา</th>
                                    <th className="border border-black p-1">มา</th>
                                    <th className="border border-black p-1">ขาด</th>
                                    <th className="border border-black p-1">ลา</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceStatsData.personnelStats.map(s => (
                                    <tr key={s.period}>
                                        <td className="border border-black p-1 text-center">{s.period}</td>
                                        <td className="border border-black p-1 text-center">{s.present}</td>
                                        <td className="border border-black p-1 text-center">{s.absent}</td>
                                        <td className="border border-black p-1 text-center">{s.leave}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Dorm Stats (Table + Chart placeholder if needed, but table is better for report) */}
                 <div className="mb-6">
                    <h3 className="text-[18pt] font-bold border-b border-black mb-2">สถิติจำนวนนักเรียนรายเรือนนอน</h3>
                    <table className="w-full border-collapse border border-black text-[16pt]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1">เรือนนอน</th>
                                <th className="border border-black p-1">มาเรียน</th>
                                <th className="border border-black p-1">ป่วย</th>
                                <th className="border border-black p-1">อยู่บ้าน</th>
                                <th className="border border-black p-1">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dormitoryData.map(d => (
                                <tr key={d.name}>
                                    <td className="border border-black p-1 text-left pl-2">{d.name}</td>
                                    <td className="border border-black p-1 text-center">{d.present}</td>
                                    <td className="border border-black p-1 text-center">{d.sick}</td>
                                    <td className="border border-black p-1 text-center">{d.home}</td>
                                    <td className="border border-black p-1 text-center">{d.total}</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                                <td className="border border-black p-1 text-right pr-2">รวม</td>
                                <td className="border border-black p-1 text-center">{totalStudentsReport}</td>
                                <td className="border border-black p-1 text-center">{totalSick}</td>
                                <td className="border border-black p-1 text-center">{totalHome}</td>
                                <td className="border border-black p-1 text-center">{totalStudentsReport + totalSick + totalHome}</td>
                            </tr>
                        </tbody>
                    </table>
                    {/* Re-render chart for print if desired, but keep table as primary data source */}
                    <div className="mt-4 h-[300px] border border-gray-200 p-2 page-break-inside-avoid">
                         <ReportChart data={dormitoryData} />
                    </div>
                </div>
                
                {/* 4. Trends */}
                <div className="mb-6 page-break-inside-avoid">
                    <h3 className="text-[18pt] font-bold border-b border-black mb-2">แนวโน้มสถิติผู้ป่วย</h3>
                    <div className="h-[300px] border border-gray-200 p-2">
                        <InfirmaryChart data={historyData} />
                    </div>
                    <table className="w-full border-collapse border border-black text-[16pt] mt-4">
                         <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1">วันที่</th>
                                <th className="border border-black p-1">ป่วย (ตามเรือนนอน)</th>
                                <th className="border border-black p-1">ป่วย (เรือนพยาบาล)</th>
                                <th className="border border-black p-1">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyData.map((h, i) => (
                                <tr key={i}>
                                    <td className="border border-black p-1 text-center">{h.date}</td>
                                    <td className="border border-black p-1 text-center">{h.sickDorm}</td>
                                    <td className="border border-black p-1 text-center">{h.sickInfirmary}</td>
                                    <td className="border border-black p-1 text-center font-bold">{h.sickDorm + h.sickInfirmary}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                 <div className="mt-12 flex justify-end text-[16pt] page-break-inside-avoid">
                    <div className="text-center w-64">
                        <div className="border-b border-dotted border-black mb-2"></div>
                        <p>ลงชื่อผู้รายงาน</p>
                        <p className="mt-6">(...........................................................)</p>
                        <p className="mt-1">วันที่ ........./........./.............</p>
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
                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                                title="Export"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-20 border border-gray-100 overflow-hidden">
                                    <button onClick={() => { window.print(); setIsExportMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50">
                                        พิมพ์ / PDF
                                    </button>
                                    <button onClick={handleExportWord} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50">
                                        Word (DOC)
                                    </button>
                                    <button onClick={exportToCSV} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                                        Excel (CSV)
                                    </button>
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
            <div className="space-y-6 print:hidden">
                {/* Attendance Stats (Screen View) */}
                <div>
                    <AttendanceStats 
                        stats={attendanceStatsData}
                        selectedDate={buddhistDate}
                    />
                </div>
                
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ReportChart data={dormitoryData} />
                    <InfirmaryChart data={historyData} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
