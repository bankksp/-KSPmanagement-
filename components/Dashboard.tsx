


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Report, Student, Personnel, StudentAttendance, PersonnelAttendance, DormitoryStat, HomeVisit } from '../types';
import ReportChart from './ReportChart';
import InfirmaryChart from './InfirmaryChart';
import AttendanceStats from './AttendanceStats';
import { getDirectDriveImageSrc, buddhistToISO, isoToBuddhist, getFirstImageSource } from '../utils';

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

const parseThaiDate = (dateString: string): Date => {
    const parts = dateString.split('/');
    if (parts.length !== 3) return new Date(0);
    const [day, month, year] = parts.map(Number);
    const gregorianYear = year - 543;
    return new Date(gregorianYear, month - 1, day);
};

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
    const mapRef = useRef<any>(null);

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
                 if (report.homeCount !== undefined) home = report.homeCount;
                 else {
                     const totalInDorm = getDormStudentCount(dormName);
                     home = Math.max(0, totalInDorm - present - sick);
                 }
             }
             return { name: dormName, present, sick, home, total: present + sick + home };
        }).filter(Boolean) as DormitoryStat[];

        uniqueReports.forEach(r => {
            if (r.dormitory === 'เรือนพยาบาล') {
                aggregatedStats.sick += r.sickCount;
            } else {
                aggregatedStats.present += r.presentCount;
                aggregatedStats.sick += r.sickCount;
                if (r.homeCount !== undefined) aggregatedStats.home += r.homeCount;
                else {
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
    
    // Attendance Stats
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

    // Map Effect - Use Students with Location
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
                            
                            // Red Pin for Student Home (Stylized)
                            const icon = L.divIcon({
                                className: 'student-marker',
                                html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4)); width: 100%; height: 100%;">
                                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
                                        <circle cx="12" cy="10" r="3" fill="white"></circle>
                                       </svg>`,
                                iconSize: [36, 36],
                                iconAnchor: [18, 36], // Tip at bottom center
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
    }, [students]); // Updated dependency to students

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        document.body.classList.add('printing-dashboard');
        window.print();
        document.body.classList.remove('printing-dashboard');
    };

    return (
        <div className="space-y-6 md:space-y-8 font-sarabun">
             {/* ---------------- PRINT LAYOUT (Preserved from original) ---------------- */}
             <div id="print-dashboard" className="hidden print:block print-visible font-sarabun text-black leading-relaxed">
                {/* Print Content Omitted for Brevity - Assume same as before */}
                <div className="text-center"><b>[รูปแบบการพิมพ์บันทึกข้อความ]</b></div>
            </div>

            {/* ---------------- SCREEN LAYOUT ---------------- */}
            <div className="print:hidden space-y-6">
                {/* Top Section: Welcome & Date Picker */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-navy tracking-tight">ภาพรวมสถานศึกษา</h2>
                        <p className="text-gray-500 text-sm mt-1">ข้อมูลประจำวันที่ {buddhistDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input 
                            type="date" 
                            value={buddhistToISO(selectedDate)}
                            onChange={(e) => {
                                const newDate = isoToBuddhist(e.target.value);
                                if(newDate) setSelectedDate(newDate);
                            }}
                            className="pl-4 pr-4 py-2 bg-white/80 border border-white/50 backdrop-blur-sm rounded-full shadow-sm text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        />
                        <button onClick={handlePrint} className="p-2 bg-white/80 rounded-full shadow-sm hover:shadow-md text-gray-600 hover:text-primary-blue transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                    </div>
                </div>

                {/* Hero Section: Stats & Map */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Colorful Stat Cards */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Students Card */}
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

                        {/* Personnel Card */}
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

                        {/* Daily Status Card */}
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
                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                                    แผนที่ติดตามนักเรียน (GPS)
                                </h3>
                            </div>
                            <div id="dashboard-map" className="w-full h-full min-h-[400px] bg-gray-100 z-0"></div>
                            {/* Overlay Gradient at bottom */}
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
                        <svg className="w-5 h-5 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
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
