import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Report, Student, Personnel, StudentAttendance, PersonnelAttendance, DormitoryStat, HomeVisit, TimePeriod } from '../types';
import ReportChart from './ReportChart';
import AttendanceStats from './AttendanceStats';
import { getDirectDriveImageSrc, buddhistToISO, isoToBuddhist, getFirstImageSource, normalizeDate, formatThaiDate } from '../utils';

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
    
    // Map Filtering States
    const [mapSearch, setMapSearch] = useState('');
    const [mapFilterClass, setMapFilterClass] = useState('');
    
    const mapRef = useRef<any>(null);

    // --- Data Processing ---
    const { dormitoryData, totalStudentsReport, totalSick, totalHome, buddhistDate, infirmaryPatients } = useMemo(() => {
        const targetDateObj = normalizeDate(selectedDate);
        if (!targetDateObj) return { dormitoryData: [], totalStudentsReport: 0, totalSick: 0, totalHome: 0, buddhistDate: selectedDate, infirmaryPatients: [] };

        const targetDay = targetDateObj.getDate();
        const targetMonth = targetDateObj.getMonth();
        const targetYear = targetDateObj.getFullYear();
        const bDateStr = `${String(targetDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${targetYear + 543}`;

        const dayReports = reports.filter(r => {
            const d = normalizeDate(r.reportDate);
            return d && d.getDate() === targetDay && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });

        const latestReportsMap = new Map<string, Report>();
        dayReports.forEach(report => {
            const existing = latestReportsMap.get(report.dormitory);
            if (!existing || Number(report.id) > Number(existing.id)) latestReportsMap.set(report.dormitory, report);
        });

        const getDormStudentCount = (dormName: string) => students.filter(s => s.dormitory === dormName).length;
        let accPresent = 0, accSick = 0, accHome = 0;

        const finalDormitoryData = dormitories.filter(d => d !== "เรือนพยาบาล").map(dormName => {
            const report = latestReportsMap.get(dormName);
            let present = 0, sick = 0, home = 0;
            if (report) {
                present = Number(report.presentCount) || 0;
                sick = Number(report.sickCount) || 0;
                if (report.homeCount !== undefined && report.homeCount !== null && String(report.homeCount) !== "") {
                    home = Number(report.homeCount);
                } else {
                    const dormTotal = getDormStudentCount(dormName);
                    home = Math.max(0, (dormTotal > 0 ? dormTotal : (present + sick)) - present - sick);
                }
            }
            accPresent += present; accSick += sick; accHome += home;
            return { name: dormName, present, sick, home, total: getDormStudentCount(dormName) };
        });

        const infirmaryReport = latestReportsMap.get("เรือนพยาบาล");
        let patients = [];
        if (infirmaryReport) {
            accSick += (Number(infirmaryReport.sickCount) || 0);
             if (infirmaryReport.studentDetails) {
                try {
                    let details = JSON.parse(infirmaryReport.studentDetails);
                    if (Array.isArray(details)) {
                        patients = details
                            .filter(p => p.status === 'sick')
                            .map(p => {
                                const studentInfo = students.find(s => String(s.id) === String(p.id));
                                return {
                                    id: p.id,
                                    name: p.name,
                                    studentClass: studentInfo ? studentInfo.studentClass : 'N/A'
                                };
                            });
                    }
                } catch (e) {
                    console.error("Could not parse infirmary student details", e);
                }
            }
        }

        return { dormitoryData: finalDormitoryData, totalStudentsReport: accPresent, totalSick: accSick, totalHome: accHome, buddhistDate: bDateStr, infirmaryPatients: patients };
    }, [reports, dormitories, selectedDate, students]);

    const personnelStatsSummary = useMemo(() => {
        const records = personnelAttendance.filter(r => r.date === buddhistDate && r.period === 'morning_act');
        return {
            present: records.filter(r => r.status === 'present' || r.status === 'activity').length,
            absent: records.filter(r => r.status === 'absent' || r.status === 'sick' || r.status === 'leave').length
        };
    }, [personnelAttendance, buddhistDate]);
    
    const highSickDorms = useMemo(() => {
        return dormitoryData.filter(d => d.sick > 3).map(d => `${d.name} (${d.sick} คน)`);
    }, [dormitoryData]);

    const attendanceStatsData = useMemo(() => {
        const periods = ['morning_act', 'lunch_act', 'evening_act'] as TimePeriod[];
        const periodNames: Record<string, string> = { morning_act: 'เช้า', lunch_act: 'กลางวัน', evening_act: 'เย็น' };
        const studentStats = periods.map(period => {
            const records = studentAttendance.filter(r => r.date === buddhistDate && r.period === period);
            return { period: periodNames[period], total: students.length, checked: records.length, present: records.filter(r => r.status === 'present').length, absent: records.filter(r => r.status === 'absent').length, sick: records.filter(r => r.status === 'sick').length, leave: records.filter(r => r.status === 'leave').length, home: records.filter(r => r.status === 'home').length };
        });
        const personnelStats = periods.map(period => {
            const records = personnelAttendance.filter(r => r.date === buddhistDate && r.period === period);
            const presentOrActivity = records.filter(r => r.status === 'present' || r.status === 'activity');
            return { period: periodNames[period], total: personnel.length, checked: records.length, present: presentOrActivity.length, absent: records.filter(r => r.status === 'absent').length, sick: records.filter(r => r.status === 'sick').length, leave: records.filter(r => r.status === 'leave').length, home: records.filter(r => r.status === 'home').length, tidy: presentOrActivity.filter(r => r.dressCode !== 'untidy').length, untidy: presentOrActivity.filter(r => r.dressCode === 'untidy').length };
        });
        return { studentStats, personnelStats };
    }, [studentAttendance, personnelAttendance, students.length, personnel.length, buddhistDate]);

    // --- Map Logic ---
    const allStudentClasses = useMemo(() => Array.from(new Set(students.map(s => s.studentClass))).sort(), [students]);
    const filteredMapStudents = useMemo(() => students.filter(s => {
        if (!s.latitude || !s.longitude) return false;
        const matchSearch = !mapSearch || s.studentName.includes(mapSearch) || s.studentNickname.includes(mapSearch);
        const matchClass = !mapFilterClass || s.studentClass === mapFilterClass;
        return matchSearch && matchClass;
    }), [students, mapSearch, mapFilterClass]);

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
                    
                    const map = L.map('dashboard-map', { 
                        zoomControl: false, 
                        attributionControl: false 
                    }).setView([16.4322, 103.5061], 10);
                    
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    
                    const validPoints: [number, number][] = [];
                    filteredMapStudents.forEach(s => {
                        const icon = L.divIcon({
                            className: 'student-marker',
                            html: `<div class="relative group"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5" style="filter: drop-shadow(0 3px 4px rgba(0,0,0,0.3)); width: 34px; height: 34px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg></div>`,
                            iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32]
                        });
                        const imgUrl = getFirstImageSource(s.studentProfileImage);
                        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;
                        const popupContent = `<div class="relative font-sarabun p-0 flex flex-col items-center"><div class="w-full h-14 bg-gradient-to-br from-blue-600 to-indigo-700 absolute top-0 left-0"></div><div class="w-16 h-16 rounded-full bg-white border-2 border-white mt-6 mb-2 overflow-hidden shadow-lg z-10">${imgUrl ? `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;" />` : `<div class="flex items-center justify-center h-full text-gray-300 text-xl font-bold">${s.studentName.charAt(0)}</div>`}</div><div class="text-center px-4 pb-4"><h4 class="text-base font-black text-slate-900 leading-tight">${s.studentTitle}${s.studentName}</h4><p class="text-xs text-blue-600 font-bold mt-0.5">(${s.studentNickname || 'ไม่มีชื่อเล่น'})</p><div class="grid grid-cols-2 gap-1.5 mt-4"><div class="bg-slate-100/60 p-1.5 rounded-xl text-center"><p class="text-[8px] text-slate-400 font-black uppercase">ชั้นเรียน</p><p class="text-[10px] font-bold text-slate-700">${s.studentClass}</p></div><div class="bg-slate-100/60 p-1.5 rounded-xl text-center"><p class="text-[8px] text-slate-400 font-black uppercase">เรือนนอน</p><p class="text-[10px] font-bold text-slate-700">${s.dormitory}</p></div></div><a href="${googleMapsUrl}" target="_blank" class="block w-full bg-slate-900 text-white mt-4 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-transform active:scale-95 no-underline shadow-md">Google Maps</a></div></div>`;
                        L.marker([s.latitude!, s.longitude!], { icon }).addTo(map).bindPopup(popupContent, { className: 'custom-leaflet-popup' });
                        validPoints.push([s.latitude!, s.longitude!]);
                    });
                    
                    if (validPoints.length > 0) {
                        try {
                            map.fitBounds(L.latLngBounds(validPoints), { padding: [80, 80] });
                        } catch (e) {
                            console.warn("fitBounds failed", e);
                        }
                    }
                    mapRef.current = map;
                }
            }, 500);
            
            return () => {
                clearTimeout(timer);
                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }
            };
        }
    }, [filteredMapStudents]);

    return (
        <div className="space-y-6 md:space-y-8 font-sarabun">
            {/* Header Ticker */}
            <div className="print:hidden bg-navy overflow-hidden py-2 px-4 rounded-2xl shadow-lg border border-white/10 flex items-center gap-4">
                <div className="flex-shrink-0 bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">LATEST</div>
                <div className="flex-grow overflow-hidden whitespace-nowrap">
                    <div className="inline-block animate-marquee">
                        {reports.slice(-5).reverse().map((r, i) => (
                            <span key={i} className="mx-8 text-white font-medium text-sm">📢 [{r.dormitory}] {r.reporterName}: มา {r.presentCount}, ป่วย {r.sickCount} ({r.reportDate})</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Stats Header */}
            <div className="print:hidden flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-navy tracking-tight">ภาพรวมสถานศึกษา</h2>
                    <p className="text-gray-500 text-sm mt-1 font-medium">ข้อมูลประจำวันที่ {formatThaiDate(buddhistDate)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <input type="date" value={buddhistToISO(selectedDate)} onChange={(e) => setSelectedDate(isoToBuddhist(e.target.value))} className="pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl shadow-sm text-navy font-bold text-sm outline-none focus:ring-2 focus:ring-primary-blue" />
                </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-white animate-fade-in-up relative overflow-hidden border">
                <div className="relative z-10 flex items-start gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-wider text-navy">สรุปสำหรับผู้บริหาร</h3>
                        <ul className="text-gray-600 mt-2 leading-relaxed font-medium space-y-2 list-disc list-inside">
                            <li>ข้อมูลนักเรียนประจำวันที่ {buddhistDate}: มาเรียน {totalStudentsReport} คน, ป่วย {totalSick} คน, กลับบ้าน/อื่นๆ {totalHome} คน จากทั้งหมด {students.length} คน</li>
                            <li>ข้อมูลบุคลากร: มาปฏิบัติหน้าที่ {personnelStatsSummary.present} คน, ลา/ขาด {personnelStatsSummary.absent} คน จากทั้งหมด {personnel.length} คน</li>
                            {highSickDorms.length > 0 ? (
                                <li>
                                    <span className="font-bold text-amber-600">ข้อควรระวัง:</span> เรือนนอนที่มีนักเรียนป่วยจำนวนมาก ได้แก่ {highSickDorms.join(', ')}
                                </li>
                            ) : (
                                <li>สถานการณ์จำนวนนักเรียนป่วยในเรือนนอนอยู่ในเกณฑ์ปกติ</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">นักเรียนทั้งหมด</p>
                        <h3 className="text-5xl font-black text-navy">{students.length}</h3>
                        <div className="mt-4 flex gap-2">
                            <div className="bg-blue-50 px-3 py-1 rounded-lg text-[10px] font-bold text-blue-600">ชาย: {students.filter(s => ['เด็กชาย', 'นาย'].includes(s.studentTitle)).length}</div>
                            <div className="bg-pink-50 px-3 py-1 rounded-lg text-[10px] font-bold text-pink-600">หญิง: {students.filter(s => ['เด็กหญิง', 'นางสาว'].includes(s.studentTitle)).length}</div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">บุคลากรทั้งหมด</p>
                        <h3 className="text-5xl font-black text-navy">{personnel.length}</h3>
                         <div className="mt-4 flex gap-2">
                            <div className="bg-indigo-50 px-3 py-1 rounded-lg text-[10px] font-bold text-indigo-600">ชาย: {personnel.filter(p => p.personnelTitle === 'นาย').length}</div>
                            <div className="bg-purple-50 px-3 py-1 rounded-lg text-[10px] font-bold text-purple-600">หญิง: {personnel.filter(p => ['นาง', 'นางสาว'].includes(p.personnelTitle)).length}</div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">สถานะวันนี้</p>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 mb-1">นักเรียน</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-emerald-50 p-2 rounded-xl"><p className="text-lg font-black text-emerald-600">{totalStudentsReport}</p><p className="text-[9px] font-bold text-emerald-500">มา</p></div>
                                    <div className="bg-rose-50 p-2 rounded-xl"><p className="text-lg font-black text-rose-600">{totalSick}</p><p className="text-[9px] font-bold text-rose-500">ป่วย</p></div>
                                    <div className="bg-slate-50 p-2 rounded-xl"><p className="text-lg font-black text-slate-600">{totalHome}</p><p className="text-[9px] font-bold text-slate-500">อื่นๆ</p></div>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-gray-50">
                                <p className="text-[10px] font-bold text-gray-500 mb-1">บุคลากร</p>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="bg-blue-50 p-2 rounded-xl flex items-center justify-between px-3"><span className="text-[9px] font-bold text-blue-500">มาปฏิบัติงาน</span><p className="text-lg font-black text-blue-600">{personnelStatsSummary.present}</p></div>
                                    <div className="bg-orange-50 p-2 rounded-xl flex items-center justify-between px-3"><span className="text-[9px] font-bold text-orange-500">ลา/ขาด</span><p className="text-lg font-black text-orange-600">{personnelStatsSummary.absent}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 relative h-full min-h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-200 z-0">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-lg pointer-events-none">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/40 p-2 rounded-full shadow-2xl flex items-center gap-2 pointer-events-auto ring-1 ring-black/5">
                            <div className="flex-shrink-0 bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"><div className="w-2 h-2 bg-white rounded-full animate-ping"></div><span className="text-[10px] font-black uppercase tracking-widest">LIVE GPS</span></div>
                            <input type="text" hide-focus="true" placeholder="ค้นหาชื่อนักเรียน..." value={mapSearch} onChange={e => setMapSearch(e.target.value)} className="flex-grow bg-transparent border-none px-4 py-2 text-sm text-navy placeholder:text-navy/50 font-bold focus:ring-0" />
                            <div className="flex gap-1 pr-2"><select value={mapFilterClass} onChange={e => setMapFilterClass(e.target.value)} className="bg-white/40 border-none rounded-full px-3 py-1.5 text-[10px] font-black text-navy outline-none"><option value="">ทุกชั้น</option>{allStudentClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        </div>
                    </div>
                    <div className="absolute bottom-6 left-6 z-[400] bg-white/20 backdrop-blur-lg border border-white/30 px-4 py-2 rounded-2xl shadow-xl"><div className="flex items-center gap-3"><div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div><span className="text-[10px] font-black text-navy uppercase">Student Home</span></div><div className="w-px h-3 bg-navy/20"></div><p className="text-[9px] font-bold text-navy/60">พิกัด GPS ล่าสุดจากการเยี่ยมบ้าน</p></div></div>
                    <div id="dashboard-map" className="w-full h-full z-0"></div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy mb-4">สถิตินักเรียนรายเรือนนอน</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[350px]">
                        <ReportChart data={dormitoryData} />
                    </div>
                    <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
                        {dormitoryData.map(d => (
                            <div key={d.name} className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-bold text-sm text-gray-800">{d.name}</p>
                                    <p className="text-xs text-gray-400">ทั้งหมด: {d.total} คน</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-green-100/50 p-1 rounded"><span className="text-green-700 font-bold">{d.present}</span><span className="text-green-500"> มา</span></div>
                                    <div className="bg-red-100/50 p-1 rounded"><span className="text-red-700 font-bold">{d.sick}</span><span className="text-red-500"> ป่วย</span></div>
                                    <div className="bg-gray-200/50 p-1 rounded"><span className="text-gray-700 font-bold">{d.home}</span><span className="text-gray-500"> บ้าน</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AttendanceStats stats={attendanceStatsData} selectedDate={buddhistDate} />
            
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span>ข้อมูลผู้ป่วยในเรือนพยาบาล</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center justify-center bg-red-50 p-6 rounded-2xl border border-red-100">
                        <p className="text-sm font-bold text-red-500">จำนวนผู้ป่วยปัจจุบัน</p>
                        <p className="text-7xl font-black text-red-600 my-2">{infirmaryPatients.length}</p>
                        <p className="text-sm font-bold text-red-500">คน</p>
                    </div>
                    <div className="md:col-span-2 max-h-[250px] overflow-y-auto space-y-2 pr-2">
                        {infirmaryPatients.length > 0 ? (
                            infirmaryPatients.map(patient => (
                                <div key={patient.id} className="bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <p className="font-bold text-sm text-gray-800">{patient.name}</p>
                                    <p className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-md">{patient.studentClass}</p>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-center text-gray-400">
                                <p>ไม่มีผู้ป่วยในเรือนพยาบาลในวันที่เลือก</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
