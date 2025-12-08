
import React, { useState, useMemo } from 'react';
import { Report, Student, Personnel, StudentAttendance, PersonnelAttendance, DormitoryStat } from '../types';
import ReportChart from './ReportChart';
import InfirmaryChart from './InfirmaryChart';
import AttendanceStats from './AttendanceStats';
import { getDirectDriveImageSrc, buddhistToISO, isoToBuddhist } from '../utils';

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
        const year = now.getFullYear() + 543;
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
    });
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // --- Data Processing ---

    const { dormitoryData, totalStudentsReport, totalSick, totalHome, displayDate, buddhistDate } = useMemo(() => {
        const parts = selectedDate.split('/');
        let targetDay = 0, targetMonth = 0, targetYear = 0;
        
        if (parts.length === 3) {
            targetDay = parseInt(parts[0]);
            targetMonth = parseInt(parts[1]) - 1; 
            targetYear = parseInt(parts[2]) - 543;
        }

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
        const parts = selectedDate.split('/');
        if (parts.length !== 3) return [];
        
        const current = new Date(parseInt(parts[2]) - 543, parseInt(parts[1]) - 1, parseInt(parts[0]));
        
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

    // Demographics
    const schoolDemographics = useMemo(() => {
        const studentMale = students.filter(s => ['เด็กชาย', 'นาย'].includes(s.studentTitle)).length;
        const studentFemale = students.filter(s => ['เด็กหญิง', 'นางสาว', 'นาง'].includes(s.studentTitle)).length;
        
        const personnelMale = personnel.filter(p => p.personnelTitle === 'นาย').length;
        const personnelFemale = personnel.filter(p => ['นาง', 'นางสาว'].includes(p.personnelTitle)).length;

        return {
            student: { total: students.length, male: studentMale, female: studentFemale },
            personnel: { total: personnel.length, male: personnelMale, female: personnelFemale }
        };
    }, [students, personnel]);

    const logoSrc = getDirectDriveImageSrc(schoolLogo);

    // --- Export Functions ---

    const exportToExcel = () => {
        const printContent = document.getElementById('print-dashboard');
        if (!printContent) return;
        
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
        link.download = `report_stats_${selectedDate.replace(/\//g, '-')}.xls`;
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
        link.download = `report_stats_${selectedDate.replace(/\//g, '-')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        document.body.classList.add('printing-dashboard');
        window.print();
        document.body.classList.remove('printing-dashboard');
    };

    return (
        <div className="space-y-6 md:space-y-8">
             {/* ---------------- PRINT LAYOUT (Official A4 Government Style - Memo) ---------------- */}
             <div id="print-dashboard" className="hidden print:block print-visible font-sarabun text-black leading-relaxed">
                {/* ... Print layout content same as before ... */}
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
            <div className="print:hidden space-y-8">
                {/* Modern Header with Date Picker */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
                            <span className="bg-primary-blue text-white p-2 rounded-lg shadow-md">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </span>
                            ภาพรวมสถิติ
                        </h2>
                        <p className="text-gray-500 mt-1 text-sm">ข้อมูลประจำวันที่ {buddhistDate}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <input 
                                type="date" 
                                value={buddhistToISO(selectedDate)}
                                onChange={(e) => {
                                    const newDate = isoToBuddhist(e.target.value);
                                    if(newDate) setSelectedDate(newDate);
                                }}
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-all shadow-inner font-medium"
                            />
                        </div>
                        
                        <div className="relative">
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
                            >
                                <span>ส่งออก</span>
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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

                {/* --- NEW SECTION: GENERAL SCHOOL STATS (Population) MOVED UP HERE --- */}
                <div>
                    <h3 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        ข้อมูลพื้นฐานโรงเรียน
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Students Stats */}
                        <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <div className="flex items-center gap-3 mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <h4 className="text-xl font-bold">สถิตินักเรียน</h4>
                                <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{buddhistDate.split('/')[2]}</span>
                            </div>
                            
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <span className="text-blue-100 text-sm">ทั้งหมด</span>
                                    <div className="text-4xl font-bold">{schoolDemographics.student.total.toLocaleString()} <span className="text-lg font-normal">คน</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold">{schoolDemographics.student.male}</div>
                                    <div className="text-xs text-blue-100">ชาย</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{schoolDemographics.student.female}</div>
                                    <div className="text-xs text-blue-100">หญิง</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{dormitories.filter(d => d !== 'เรือนพยาบาล').length}</div>
                                    <div className="text-xs text-blue-100">เรือนนอน</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{new Set(students.map(s => s.studentClass.split('/')[0])).size}</div>
                                    <div className="text-xs text-blue-100">ระดับชั้น</div>
                                </div>
                            </div>
                        </div>

                        {/* Personnel Stats */}
                        <div className="bg-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <div className="flex items-center gap-3 mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <h4 className="text-xl font-bold">สถิติบุคลากร</h4>
                                <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{buddhistDate.split('/')[2]}</span>
                            </div>
                            
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <span className="text-purple-100 text-sm">ทั้งหมด</span>
                                    <div className="text-4xl font-bold">{schoolDemographics.personnel.total.toLocaleString()} <span className="text-lg font-normal">คน</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold">{schoolDemographics.personnel.male}</div>
                                    <div className="text-xs text-purple-100">ชาย</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{schoolDemographics.personnel.female}</div>
                                    <div className="text-xs text-purple-100">หญิง</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{new Set(personnel.map(p => p.position)).size}</div>
                                    <div className="text-xs text-purple-100">ตำแหน่ง</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">0</div>
                                    <div className="text-xs text-purple-100">เกษียณ</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Status Stats Grid (Reordered per request to show check-in data prominently) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Student Present */}
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-green-50 p-2 rounded-lg">
                                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">มาเรียนวันนี้</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-navy">{totalStudentsReport}</h3>
                            <span className="text-sm text-gray-400">คน</span>
                        </div>
                    </div>

                    {/* Student Sick */}
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-red-50 p-2 rounded-lg">
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">ป่วยวันนี้</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-navy">{totalSick}</h3>
                            <span className="text-sm text-gray-400">คน</span>
                        </div>
                    </div>

                    {/* Student Home/Leave */}
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            </div>
                            <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">อยู่บ้าน/ลา</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-navy">{totalHome}</h3>
                            <span className="text-sm text-gray-400">คน</span>
                        </div>
                    </div>

                    {/* Report Status */}
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-purple-50 p-2 rounded-lg">
                                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            </div>
                            <span className="text-xs font-bold text-purple-500 bg-purple-50 px-2 py-1 rounded-full">เรือนที่รายงาน</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-navy">{dormitoryData.length}</h3>
                            <span className="text-sm text-gray-400">/ {dormitories.length - 1}</span>
                        </div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-2 border border-gray-100">
                        <ReportChart data={dormitoryData} />
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-2 border border-gray-100">
                        <InfirmaryChart data={historyData} />
                    </div>
                </div>

                {/* Attendance Detailed Tables */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xl font-bold text-navy mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        ข้อมูลการเช็คชื่อวันนี้
                    </h3>
                    <AttendanceStats 
                        stats={attendanceStatsData} 
                        selectedDate={buddhistDate}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
