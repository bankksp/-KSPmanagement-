
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Report, Student, Personnel, StudentAttendance, PersonnelAttendance, DormitoryStat, HomeVisit, TimePeriod } from '../types';
import ReportChart from './ReportChart';
import InfirmaryChart from './InfirmaryChart';
import AttendanceStats from './AttendanceStats';
import { getDirectDriveImageSrc, buddhistToISO, isoToBuddhist, getFirstImageSource, normalizeDate } from '../utils';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
    reports: Report[];
    students: Student[];
    personnel: Personnel[];
    dormitories: string[];
    schoolName: string;
    schoolLogo: string;
    studentAttendance?: StudentAttendance[];
    personnelAttendance?: PersonnelAttendance[];
    homeVisits?: HomeVisit[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
    reports, students, personnel, dormitories, schoolName, schoolLogo,
    studentAttendance = [], personnelAttendance = [], homeVisits = []
}) => {
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear() + 543;
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
    });
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const mapRef = useRef<any>(null);

    // --- Data Processing ---

    const { dormitoryData, totalStudentsReport, totalSick, totalHome, displayDate, buddhistDate } = useMemo(() => {
        const targetDateObj = normalizeDate(selectedDate);
        if (!targetDateObj) {
            return {
                dormitoryData: [],
                totalStudentsReport: 0, totalSick: 0, totalHome: 0,
                displayDate: '', buddhistDate: selectedDate
            };
        }

        const targetDay = targetDateObj.getDate();
        const targetMonth = targetDateObj.getMonth();
        const targetYear = targetDateObj.getFullYear();
        
        const bYear = targetYear + 543;
        const bDateStr = `${String(targetDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${bYear}`;

        const dayReports = reports.filter(r => {
            const d = normalizeDate(r.reportDate);
            if (!d) return false;
            return d.getDate() === targetDay && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });

        const latestReportsMap = new Map<string, Report>();
        dayReports.forEach(report => {
            const existing = latestReportsMap.get(report.dormitory);
            if (!existing || Number(report.id) > Number(existing.id)) {
                latestReportsMap.set(report.dormitory, report);
            }
        });

        const getDormStudentCount = (dormName: string) => students.filter(s => s.dormitory === dormName).length;

        let accPresent = 0, accSick = 0, accHome = 0;

        const finalDormitoryData: DormitoryStat[] = dormitories
            .filter(d => d !== "เรือนพยาบาล")
            .map(dormName => {
                const report = latestReportsMap.get(dormName);
                let present = 0, sick = 0, home = 0;
                
                if (report) {
                    present = Number(report.presentCount) || 0;
                    sick = Number(report.sickCount) || 0;
                    if (report.homeCount !== undefined && report.homeCount !== null && String(report.homeCount) !== "") {
                        home = Number(report.homeCount);
                    } else {
                        const totalInDorm = getDormStudentCount(dormName);
                        home = Math.max(0, totalInDorm - present - sick);
                    }
                } else {
                    // If no report for this dorm today, default to 0 but show in list
                }

                accPresent += present;
                accSick += sick;
                accHome += home;

                return { name: dormName, present, sick, home, total: present + sick + home };
            });

        // Add Infirmary Sick to Total Sick
        const infirmaryReport = latestReportsMap.get("เรือนพยาบาล");
        if (infirmaryReport) {
            accSick += (Number(infirmaryReport.sickCount) || 0);
        }

        return {
            dormitoryData: finalDormitoryData,
            totalStudentsReport: accPresent,
            totalSick: accSick,
            totalHome: accHome,
            displayDate: `ประจำวันที่ ${bDateStr}`,
            buddhistDate: bDateStr
        };
    }, [reports, dormitories, selectedDate, students]);
    
    // AI Summary Generation
    const generateAiSummary = async () => {
        setIsGeneratingAi(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `You are a school administrator. Analyze the following attendance data for ${buddhistDate} at ${schoolName} and provide a concise, professional summary in Thai. 
            Data:
            - Total Students: ${students.length}
            - Students present: ${totalStudentsReport}
            - Students sick: ${totalSick}
            - Students away/home: ${totalHome}
            - Dormitory breakdown: ${JSON.stringify(dormitoryData.map(d => ({ name: d.name, present: d.present, sick: d.sick, home: d.home })))}
            
            Format: Provide a summary of the health status, identify any dorms with high sickness rates (>10% of their total), and give a brief positive recommendation for the administration.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            setAiSummary(response.text || "ไม่สามารถสรุปข้อมูลได้ในขณะนี้");
        } catch (error) {
            console.error("AI Generation Error:", error);
            setAiSummary("เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูลด้วย AI");
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Attendance Stats
    const attendanceStatsData = useMemo(() => {
        const periods = ['morning_act', 'lunch_act', 'evening_act'] as TimePeriod[];
        const periodNames: Record<string, string> = { morning_act: 'เช้า', lunch_act: 'กลางวัน', evening_act: 'เย็น' };
        
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
                // Add home property to satisfy CalculatedStats type
                home: records.filter(r => r.status === 'home').length,
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
                // Add home property to satisfy CalculatedStats type
                home: records.filter(r => r.status === 'home').length,
                tidy: presentOrActivity.filter(r => r.dressCode !== 'untidy').length, 
                untidy: presentOrActivity.filter(r => r.dressCode === 'untidy').length
            };
        });
        return { studentStats, personnelStats };
    }, [studentAttendance, personnelAttendance, students.length, personnel.length, buddhistDate]);

    // Map Effect
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const L = (window as any).L;
            if (!L) return;

            const timer = setTimeout(() => {
                const mapContainer = document.getElementById('dashboard-map');
                if (mapContainer) {
                    if (mapRef.current) {
                        mapRef.current.remove();
                        mapRef.current = null;
                    }

                    const map = L.map('dashboard-map', { zoomControl: false, attributionControl: false }).setView([16.4322, 103.5061], 10);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    
                    const validStudents = students.filter(s => s.latitude && s.longitude);
                    const markers: any[] = [];
                    const validPoints: [number, number][] = [];

                    validStudents.forEach(s => {
                        if (s.latitude && s.longitude) {
                            const name = `${s.studentTitle}${s.studentName}`;
                            const imgUrl = getFirstImageSource(s.studentProfileImage);
                            
                            const icon = L.divIcon({
                                className: 'student-marker',
                                html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4)); width: 100%; height: 100%;">
                                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
                                        <circle cx="12" cy="10" r="3" fill="white"></circle>
                                       </svg>`,
                                iconSize: [36, 36],
                                iconAnchor: [18, 36],
                                popupAnchor: [0, -34]
                            });

                            const popupContent = `
                                <div class="text-center">
                                    <div class="w-10 h-10 rounded-full bg-gray-200 mx-auto mb-1 overflow-hidden">
                                        ${imgUrl ? `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;" />` : ''}
                                    </div>
                                    <strong class="text-xs text-navy">${name}</strong><br/>
                                    <span class="text-[10px] text-gray-500">${s.dormitory}</span>
                                </div>
                            `;

                            const marker = L.marker([s.latitude, s.longitude], { icon })
                                .addTo(map)
                                .bindPopup(popupContent);
                            markers.push(marker);
                            validPoints.push([s.latitude, s.longitude]);
                        }
                    });

                    if (validPoints.length > 0) {
                        const bounds = L.latLngBounds(validPoints);
                        map.fitBounds(bounds, { padding: [30, 30] });
                    }
                    mapRef.current = map;
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [students]);

    // --- Export Functions ---

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        document.body.classList.add('printing-dashboard');
        window.print();
        document.body.classList.remove('printing-dashboard');
    };

    const handleExportExcel = () => {
        setIsExportMenuOpen(false);
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += `รายงานภาพรวมสถานศึกษา,${schoolName}\n`;
        csvContent += `วันที่,${buddhistDate}\n\n`;
        csvContent += `สถิติรวม\n`;
        csvContent += `นักเรียนทั้งหมด,${students.length},คน\n`;
        csvContent += `บุคลากรทั้งหมด,${personnel.length},คน\n`;
        csvContent += `มาเรียน,${totalStudentsReport},คน\n`;
        csvContent += `ป่วย,${totalSick},คน\n`;
        csvContent += `ลา/ขาด/อยู่บ้าน,${totalHome},คน\n\n`;
        csvContent += `รายละเอียดตามเรือนนอน\n`;
        csvContent += `เรือนนอน,มา (คน),ป่วย (คน),อยู่บ้าน (คน),รวม (คน)\n`;
        dormitoryData.forEach(row => {
            csvContent += `"${row.name}",${row.present},${row.sick},${row.home},${row.total}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `dashboard_report_${buddhistDate.replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportWord = () => {
        setIsExportMenuOpen(false);
        const rows = dormitoryData.map(d => `
            <tr>
                <td style="text-align:left; padding:5px;">${d.name}</td>
                <td style="text-align:center; padding:5px;">${d.present}</td>
                <td style="text-align:center; padding:5px; color:red;">${d.sick}</td>
                <td style="text-align:center; padding:5px;">${d.home}</td>
                <td style="text-align:center; padding:5px;">${d.total}</td>
            </tr>
        `).join('');

        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Dashboard Report</title>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { font-size: 20pt; margin: 0; }
                    .header p { margin: 5px 0; }
                    .stats-box { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                    .stat-item { margin-bottom: 5px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid black; padding: 8px; font-size: 14pt; }
                    th { background-color: #f0f0f0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${getDirectDriveImageSrc(schoolLogo)}" height="80" style="margin-bottom:10px;" />
                    <h1>${schoolName}</h1>
                    <p>รายงานภาพรวมสถานศึกษา</p>
                    <p>ประจำวันที่ ${buddhistDate}</p>
                </div>
                <h3>1. ข้อมูลสถิติรวม</h3>
                <div class="stats-box">
                    <p class="stat-item">นักเรียนทั้งหมด: ${students.length} คน</p>
                    <p class="stat-item">บุคลากรทั้งหมด: ${personnel.length} คน</p>
                    <hr/>
                    <p>มาเรียน: ${totalStudentsReport} คน</p>
                    <p>ป่วย: ${totalSick} คน</p>
                    <p>ลา/ขาด/อยู่บ้าน: ${totalHome} คน</p>
                </div>
                <h3>2. รายละเอียดตามเรือนนอน</h3>
                <table>
                    <thead>
                        <tr>
                            <th width="40%">เรือนนอน</th>
                            <th width="15%">มา</th>
                            <th width="15%">ป่วย</th>
                            <th width="15%">อยู่บ้าน</th>
                            <th width="15%">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <br/><br/>
                <div style="text-align: right; margin-top: 30px;">
                    <p>ลงชื่อ ........................................................... ผู้รายงาน</p>
                    <p>(...........................................................)</p>
                    <p>วันที่ ${buddhistDate}</p>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard_report_${buddhistDate.replace(/\//g, '-')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 md:space-y-8 font-sarabun">
             {/* ---------------- PRINT LAYOUT ---------------- */}
             <div id="print-dashboard" className="hidden print:block print-visible font-sarabun text-black leading-relaxed">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">{schoolName}</h1>
                    <h2 className="text-xl">รายงานสถานภาพนักเรียนประจำวัน</h2>
                    <p>วันที่ {buddhistDate}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 text-lg">
                    <div><b>จำนวนนักเรียนทั้งหมด:</b> {students.length} คน</div>
                    <div><b>จำนวนบุคลากร:</b> {personnel.length} คน</div>
                </div>
                <div className="border border-black p-4 mb-4">
                    <h3 className="font-bold border-b border-black mb-2">สรุปยอดประจำวัน</h3>
                    <div className="flex justify-between">
                        <span>มาเรียน: {totalStudentsReport}</span>
                        <span>ป่วย: {totalSick}</span>
                        <span>ลา/ขาด: {totalHome}</span>
                    </div>
                </div>
                <table className="w-full border-collapse border border-black">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-2 text-left">เรือนนอน</th>
                            <th className="border border-black p-2 text-center">มา</th>
                            <th className="border border-black p-2 text-center">ป่วย</th>
                            <th className="border border-black p-2 text-center">อยู่บ้าน</th>
                            <th className="border border-black p-2 text-center">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dormitoryData.map((d, i) => (
                            <tr key={i}>
                                <td className="border border-black p-2">{d.name}</td>
                                <td className="border border-black p-2 text-center">{d.present}</td>
                                <td className="border border-black p-2 text-center">{d.sick}</td>
                                <td className="border border-black p-2 text-center">{d.home}</td>
                                <td className="border border-black p-2 text-center">{d.total}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ---------------- SCREEN LAYOUT ---------------- */}
            <div className="print:hidden space-y-6">
                {/* Top Section: Welcome & Date Picker & Export */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-navy tracking-tight">ภาพรวมสถานศึกษา</h2>
                        <p className="text-gray-500 text-sm mt-1">ข้อมูลประจำวันที่ {buddhistDate}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                         {/* AI Analysis Button */}
                        <button 
                            onClick={generateAiSummary}
                            disabled={isGeneratingAi}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all text-sm disabled:opacity-50"
                        >
                            {isGeneratingAi ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                            {isGeneratingAi ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ด้วย AI'}
                        </button>

                        <input 
                            type="date" 
                            value={buddhistToISO(selectedDate)}
                            onChange={(e) => {
                                const newDate = isoToBuddhist(e.target.value);
                                if(newDate) setSelectedDate(newDate);
                            }}
                            className="pl-4 pr-4 py-2 bg-white/80 border border-white/50 backdrop-blur-sm rounded-full shadow-sm text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        />
                        
                        <div className="relative">
                            <button 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="flex items-center gap-2 bg-white/80 hover:bg-white text-gray-700 font-bold py-2 px-4 rounded-full shadow-sm border border-white/50 transition-all text-sm"
                            >
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                ดาวน์โหลด
                            </button>
                            
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                                    <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 border-b border-gray-100 transition-colors">
                                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                                        Word (.doc)
                                    </button>
                                    <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2 border-b border-gray-100 transition-colors">
                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21.17 3.25Q21.5 3.25 21.76 3.5 22.04 3.73 22.04 4.13V19.87Q22.04 20.27 21.76 20.5 21.5 20.75 21.17 20.75H14.83Q14.5 20.75 14.26 20.5 14 20.27 14 19.87V4.13Q14 3.73 14 19.87V4.13Q14 3.73 14.26 3.5 14.5 3.25 14.83 3.25H21.17M12 3.25Q12.33 3.25 12.59 3.5 12.87 3.73 12.87 4.13V19.87Q12.87 20.27 12.59 20.5 12.33 20.75 12 20.75H2.83Q2.5 20.75 2.26 20.5 2 20.27 2 19.87V4.13Q2 3.73 2.26 3.5 2.5 3.25 2.83 3.25H12M4 5V19H11V5H4M16 5V19H20V5H16Z" /></svg>
                                        Excel (.csv)
                                    </button>
                                    <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 transition-colors">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                        พิมพ์ / PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Summary Banner */}
                {aiSummary && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 shadow-sm animate-fade-in-up relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-md">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h3 className="text-indigo-900 font-bold text-lg">AI Report Summary (สรุปรายงานโดย AI)</h3>
                            <button onClick={() => setAiSummary(null)} className="ml-auto text-indigo-400 hover:text-indigo-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="text-indigo-800 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                            {aiSummary}
                        </div>
                    </div>
                )}

                {/* Hero Section: Stats & Map */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Colorful Stat Cards */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-300/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                            <div className="relative z-10">
                                <p className="text-blue-100 text-sm font-medium mb-1">นักเรียนทั้งหมด</p>
                                <h3 className="text-4xl font-extrabold">{students.length} <span className="text-lg font-medium opacity-80">คน</span></h3>
                                <div className="mt-4 flex gap-4 text-xs font-medium opacity-90">
                                    <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">ชาย: {students.filter(s => ['เด็กชาย', 'นาย'].includes(s.studentTitle)).length}</div>
                                    <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">หญิง: {students.filter(s => ['เด็กหญิง', 'นางสาว', 'นาง'].includes(s.studentTitle)).length}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-pink-400 to-rose-500 rounded-3xl p-6 text-white shadow-xl shadow-pink-300/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                            </div>
                            <div className="relative z-10">
                                <p className="text-pink-100 text-sm font-medium mb-1">บุคลากร</p>
                                <h3 className="text-4xl font-extrabold">{personnel.length} <span className="text-lg font-medium opacity-80">คน</span></h3>
                                <div className="mt-4 flex gap-4 text-xs font-medium opacity-90">
                                    <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">ตำแหน่ง: {new Set(personnel.map(p=>p.position)).size}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl p-6 text-white shadow-xl shadow-cyan-300/50 relative overflow-hidden group">
                             <div className="relative z-10">
                                <p className="text-cyan-100 text-sm font-medium mb-2">สถานะรายวัน</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                                        <div className="text-2xl font-bold">{totalStudentsReport}</div>
                                        <div className="text-[10px] opacity-80">มาเรียน</div>
                                    </div>
                                    <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                                        <div className="text-2xl font-bold">{totalSick}</div>
                                        <div className="text-[10px] opacity-80">ป่วย</div>
                                    </div>
                                    <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                                        <div className="text-2xl font-bold">{totalHome}</div>
                                        <div className="text-[10px] opacity-80">ลา/ขาด</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Map Widget */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden h-full border border-white/50 relative group">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm">
                                <h3 className="text-navy font-bold text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" /></svg>
                                    แผนที่ติดตามนักเรียน (GPS)
                                </h3>
                            </div>
                            <div id="dashboard-map" className="w-full h-full min-h-[400px] bg-gray-100 z-0"></div>
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
                        </div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg p-6 border border-white/50">
                        <ReportChart data={dormitoryData} />
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg p-6 border border-white/50">
                        <InfirmaryChart data={[]} />
                    </div>
                </div>

                {/* Detailed Attendance Table */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-white/50 p-6">
                    <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        รายละเอียดการเช็คชื่อ ({buddhistDate})
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
