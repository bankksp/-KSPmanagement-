
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Student, Personnel, LeaveRecord, PerformanceReport, SARReport, AcademicPlan, Page, EducationBackground } from '../types';
import { getFirstImageSource, safeParseArray, formatThaiDate, getDriveViewUrl, getCurrentThaiDate, normalizeDate, toThaiNumerals, getDriveDownloadUrl, getDirectDriveImageSrc } from '../utils';

type Tab = 'profile' | 'advisory' | 'leave' | 'pa' | 'sar' | 'plans';

interface ViewPersonnelModalProps {
    personnel: Personnel;
    onClose: () => void;
    schoolName: string;
    schoolLogo: string;
    currentUser: Personnel | null;
    students: Student[];
    leaveRecords: LeaveRecord[];
    performanceReports: PerformanceReport[];
    sarReports: SARReport[];
    academicPlans: AcademicPlan[];
}

const ViewPersonnelModal: React.FC<ViewPersonnelModalProps> = ({ 
    personnel, onClose, schoolName, schoolLogo, currentUser,
    students, leaveRecords, performanceReports, sarReports, academicPlans
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Data Filtering
    const myAdvisoryStudents = useMemo(() => students.filter(s => safeParseArray(s.homeroomTeachers).includes(personnel.id)), [students, personnel.id]);
    const myLeaveRecords = useMemo(() => leaveRecords.filter(r => r.personnelId === personnel.id).sort((a,b) => b.id - a.id), [leaveRecords, personnel.id]);
    const myPaReports = useMemo(() => performanceReports.filter(r => r.personnelId === personnel.id).sort((a,b) => b.id - a.id), [performanceReports, personnel.id]);
    const mySarReports = useMemo(() => sarReports.filter(r => r.personnelId === personnel.id).sort((a,b) => b.id - a.id), [sarReports, personnel.id]);
    const myAcademicPlans = useMemo(() => academicPlans.filter(p => p.teacherId === personnel.id).sort((a,b) => b.id - a.id), [academicPlans, personnel.id]);

    const profileImageUrl = useMemo(() => getFirstImageSource(personnel.profileImage), [personnel.profileImage]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    // --- Export Handlers ---
    const handlePrint = () => { window.print(); setIsExportMenuOpen(false); };
    
    const handleExportExcel = () => {
        const headers = ['ID', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'วิทยฐานะ', 'เลขบัตรประชาชน', 'วันเกิด', 'เบอร์โทร', 'อีเมล', 'วันที่บรรจุ'];
        const p = personnel;
        const row = [p.id, p.personnelTitle, p.personnelName, p.position, p.academicStanding, p.idCard, p.dob, p.phone, p.email, p.appointmentDate];
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.join(",") + "\r\n";
        csvContent += row.map(d => `"${String(d || '').replace(/"/g, '""')}"`).join(",") + "\r\n";

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `personnel_${p.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    const handleExportWord = () => {
         const htmlContent = `
            <html><head><meta charset='utf-8'><title>Personnel Profile</title><style>body { font-family: 'TH SarabunPSK', sans-serif; font-size: 16pt; } .label { font-weight: bold; }</style></head>
            <body>
                <h1 align="center">ข้อมูลประวัติบุคลากร</h1>
                <p><span class="label">ชื่อ-สกุล:</span> ${personnel.personnelName}</p>
                <p><span class="label">ตำแหน่ง:</span> ${personnel.position}</p>
                <p><span class="label">วิทยฐานะ:</span> ${personnel.academicStanding || '-'}</p>
                <p><span class="label">เบอร์โทร:</span> ${personnel.phone}</p>
            </body></html>
        `;
        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `personnel_profile_${personnel.id}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    const handlePrintCard = () => {
        setIsExportMenuOpen(false);
        const logoSrc = getDirectDriveImageSrc(schoolLogo);
        const photoSrc = profileImageUrl || '';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>บัตรประจำตัว - ${personnel.personnelName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    @page { size: 8.6cm 5.4cm; margin: 0; }
                    body { margin: 0; font-family: 'Kanit', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .card { 
                        width: 8.6cm; height: 5.4cm; 
                        background-color: #f0f2f5; 
                        position: relative; overflow: hidden;
                        display: flex; flex-direction: column;
                    }
                    .card::before {
                        content: ''; position: absolute;
                        top: -4cm; right: -5cm;
                        width: 10cm; height: 10cm;
                        background-color: #e9ecef;
                        border-radius: 50%;
                        z-index: 0;
                    }
                    .header {
                        position: absolute; top: 0.3cm; left: 0.6cm; right: 0.6cm;
                        display: flex; justify-content: space-between; align-items: flex-start; z-index: 10;
                    }
                    .logo { width: 0.8cm; height: 0.8cm; }
                    .header-text { text-align: right; }
                    .org-name { font-size: 5pt; font-weight: 500; color: #495057; }
                    .school-name { font-size: 11pt; font-weight: 700; color: #2d3748; line-height: 1; }
                    .province { font-size: 7pt; font-weight: 600; color: #4a5568; }
                    .body {
                        position: relative; z-index: 5; flex-grow: 1;
                        padding: 0.6cm; padding-top: 1.5cm;
                        display: flex; gap: 0.5cm; align-items: center;
                    }
                    .photo {
                        width: 2.3cm; height: 2.8cm; border-radius: 0.3cm;
                        object-fit: cover; flex-shrink: 0; border: 3px solid white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    .info { flex-grow: 1; }
                    .name { font-size: 13pt; font-weight: 700; color: #212529; margin: 0 0 0.3cm 0; line-height: 1.2; }
                    .details-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.1cm 0.3cm; font-size: 7pt; }
                    .label { font-weight: 500; color: #6c757d; }
                    .value { font-weight: 600; color: #343a40; }
                    .footer {
                        margin-top: auto; height: 0.8cm; background: #2d3748; color: #ffffff;
                        display: flex; justify-content: space-between; align-items: center;
                        padding: 0 0.6cm; font-size: 7pt; font-weight: 500; z-index: 10;
                    }
                </style>
            </head>
            <body onload="window.print()">
                <div class="card">
                    <div class="card::before"></div>
                    <div class="header">
                        <img src="${logoSrc}" class="logo">
                        <div class="header-text">
                            <div class="org-name">สำนักบริหารงานการศึกษาพิเศษ</div>
                            <div class="school-name">${schoolName}</div>
                            <div class="province">จังหวัดกาฬสินธุ์</div>
                        </div>
                    </div>
                    <div class="body">
                        <img src="${photoSrc}" class="photo" onerror="this.style.opacity=0">
                        <div class="info">
                            <div class="name">${personnel.personnelName}</div>
                            <div class="details-grid">
                                <div class="label">ID Card</div>
                                <div class="value">${personnel.idCard || '-'}</div>
                                <div class="label">เบอร์โทร</div>
                                <div class="value">${personnel.phone || '-'}</div>
                                <div class="label">บรรจุเมื่อ</div>
                                <div class="value">${formatThaiDate(personnel.appointmentDate)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        <span>ผู้ออกบัตร: ผู้อำนวยการสถานศึกษา</span>
                        <span>โทร. 043-840842</span>
                    </div>
                </div>
            </body>
            </html>`;

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    // UI Components
    const TabButton = ({ tab, label, icon }: { tab: Tab, label: string, icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === tab ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
        >
            {icon} {label}
        </button>
    );

    const DetailItem = ({ label, value }: { label: string, value?: string | number | null }) => (
        <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
            <p className="text-sm font-medium text-gray-800 break-words">{value || '-'}</p>
        </div>
    );

    const StatusBadge = ({ status }: { status: string }) => {
        const style = {
            approved: 'bg-green-100 text-green-700',
            pending: 'bg-yellow-100 text-yellow-700',
            rejected: 'bg-red-100 text-red-700',
            needs_edit: 'bg-red-100 text-red-700',
        }[status] || 'bg-gray-100 text-gray-700';
        const label = {
            approved: 'อนุมัติแล้ว',
            pending: 'รอตรวจสอบ',
            rejected: 'ไม่อนุมัติ',
            needs_edit: 'ต้องแก้ไข',
        }[status] || status;
        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${style}`}>{label}</span>;
    };

    // Render Functions for each Tab
    const renderProfileTab = () => {
        const educationBackgrounds = safeParseArray(personnel.educationBackgrounds) as EducationBackground[];

        return (
            <div className="space-y-6">
                <h3 className="font-bold text-lg text-navy">ข้อมูลส่วนตัวและตำแหน่งงาน</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DetailItem label="คำนำหน้า" value={personnel.personnelTitle === 'อื่นๆ' ? personnel.personnelTitleOther : personnel.personnelTitle} />
                    <DetailItem label="ชื่อ-นามสกุล" value={personnel.personnelName} />
                    <DetailItem label="ตำแหน่ง" value={personnel.position} />
                    <DetailItem label="วิทยฐานะ" value={personnel.academicStanding} />
                    <DetailItem label="เลขที่ตำแหน่ง" value={personnel.positionNumber} />
                    <DetailItem label="วันที่บรรจุ" value={formatThaiDate(personnel.appointmentDate)} />
                    <DetailItem label="เลขบัตรประชาชน" value={personnel.idCard} />
                    <DetailItem label="วันเกิด" value={formatThaiDate(personnel.dob)} />
                    <DetailItem label="เบอร์โทรศัพท์" value={personnel.phone} />
                    <DetailItem label="Email" value={personnel.email} />
                    <DetailItem label="ที่อยู่" value={(personnel as any).address} />
                </div>
                <div className="mt-6">
                    <h4 className="font-bold text-gray-700 mb-2">ประวัติการศึกษา</h4>
                    {educationBackgrounds.length > 0 ? (
                        <div className="space-y-3">
                            {educationBackgrounds.map((edu, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                                    <p className="font-bold text-sm text-navy">{edu.level}</p>
                                    <p className="text-xs text-gray-600">คณะ: {edu.faculty || '-'}</p>
                                    <p className="text-xs text-gray-600">วิชาเอก: {edu.major || '-'}</p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-500 italic">ไม่มีข้อมูล</p>}
                </div>
            </div>
        )
    };

    const renderAdvisoryTab = () => (
        <div>
            <h3 className="font-bold text-lg text-navy mb-4">นักเรียนในที่ปรึกษา ({myAdvisoryStudents.length} คน)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAdvisoryStudents.map(student => (
                    <div key={student.id} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                        <img src={getFirstImageSource(student.studentProfileImage) || ''} onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${student.studentName}&background=random`} alt={student.studentName} className="w-12 h-12 rounded-full object-cover"/>
                        <div>
                            <p className="font-bold text-sm text-gray-800">{student.studentName}</p>
                            <p className="text-xs text-gray-500">{student.studentClass}</p>
                        </div>
                    </div>
                ))}
                {myAdvisoryStudents.length === 0 && <p className="text-gray-500 col-span-full">ไม่พบข้อมูลนักเรียนในที่ปรึกษา</p>}
            </div>
        </div>
    );

    const renderLeaveTab = () => (
        <div>
            <h3 className="font-bold text-lg text-navy mb-4">ประวัติการลา</h3>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="p-2">ประเภท</th><th className="p-2">ช่วงเวลา</th><th className="p-2">จำนวนวัน</th><th className="p-2">สถานะ</th></tr></thead>
                    <tbody>
                        {myLeaveRecords.map(r => (
                            <tr key={r.id} className="border-b"><td className="p-2">{r.type}</td><td className="p-2">{r.startDate} - {r.endDate}</td><td className="p-2">{r.daysCount}</td><td className="p-2"><StatusBadge status={r.status}/></td></tr>
                        ))}
                    </tbody>
                </table>
                 {myLeaveRecords.length === 0 && <p className="text-gray-500 p-4 text-center">ไม่พบข้อมูลการลา</p>}
            </div>
        </div>
    );
    
    const renderPaTab = () => (
        <div>
            <h3 className="font-bold text-lg text-navy mb-4">ประวัติการส่งรายงาน PA</h3>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                     <thead className="bg-gray-50"><tr><th className="p-2">ปีการศึกษา</th><th className="p-2">รอบ</th><th className="p-2">หัวข้อ</th><th className="p-2">สถานะ</th></tr></thead>
                     <tbody>
                        {myPaReports.map(r => (
                            <tr key={r.id} className="border-b"><td className="p-2">{r.academicYear}</td><td className="p-2">{r.round}</td><td className="p-2">{r.agreementTitle}</td><td className="p-2"><StatusBadge status={r.status}/></td></tr>
                        ))}
                     </tbody>
                </table>
                {myPaReports.length === 0 && <p className="text-gray-500 p-4 text-center">ไม่พบข้อมูลรายงาน PA</p>}
            </div>
        </div>
    );
    
    const renderSarTab = () => (
         <div>
            <h3 className="font-bold text-lg text-navy mb-4">ประวัติการส่งรายงาน SAR</h3>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                     <thead className="bg-gray-50"><tr><th className="p-2">ปีการศึกษา</th><th className="p-2">วันที่ส่ง</th><th className="p-2">ไฟล์</th><th className="p-2">สถานะ</th></tr></thead>
                     <tbody>
                        {mySarReports.map(r => (
                            <tr key={r.id} className="border-b"><td className="p-2">{r.academicYear}</td><td className="p-2">{r.submissionDate}</td><td className="p-2"><a href={getDriveViewUrl(safeParseArray(r.file)[0])} target="_blank" className="text-blue-600 hover:underline">ดูไฟล์</a></td><td className="p-2"><StatusBadge status={r.status}/></td></tr>
                        ))}
                     </tbody>
                </table>
                 {mySarReports.length === 0 && <p className="text-gray-500 p-4 text-center">ไม่พบข้อมูลรายงาน SAR</p>}
            </div>
        </div>
    );

    const renderPlansTab = () => (
        <div>
            <h3 className="font-bold text-lg text-navy mb-4">ประวัติการส่งแผนการสอน</h3>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                     <thead className="bg-gray-50"><tr><th className="p-2">วิชา</th><th className="p-2">วันที่ส่ง</th><th className="p-2">ไฟล์แนบ</th><th className="p-2">สถานะ</th></tr></thead>
                     <tbody>
                        {myAcademicPlans.map(p => (
                            <tr key={p.id} className="border-b">
                                <td className="p-2">{p.subjectName}</td>
                                <td className="p-2">{p.date}</td>
                                <td className="p-2 flex gap-2">
                                    <a href={getDriveViewUrl(safeParseArray(p.courseStructureFile)[0])} target="_blank" className="text-blue-600 hover:underline">โครงสร้าง</a>
                                    <a href={getDriveViewUrl(safeParseArray(p.lessonPlanFile)[0])} target="_blank" className="text-blue-600 hover:underline">แผนฯ</a>
                                </td>
                                <td className="p-2"><StatusBadge status={p.status}/></td>
                            </tr>
                        ))}
                     </tbody>
                </table>
                {myAcademicPlans.length === 0 && <p className="text-gray-500 p-4 text-center">ไม่พบข้อมูลแผนการสอน</p>}
            </div>
        </div>
    );

// FIX: Renamed the 'key' property in the tabs array to 'tab' to avoid type conflicts.
    const tabs = [
        { tab: 'profile' as Tab, label: 'ประวัติส่วนตัว', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        { tab: 'advisory' as Tab, label: 'ครูที่ปรึกษา', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { tab: 'leave' as Tab, label: 'ประวัติการลา', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { tab: 'pa' as Tab, label: 'รายงาน PA', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { tab: 'sar' as Tab, label: 'รายงาน SAR', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { tab: 'plans' as Tab, label: 'แผนการสอน', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[70] p-2 sm:p-4 font-sarabun print-container" onClick={onClose}>
            <div 
                className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-md md:max-w-3xl lg:max-w-5xl max-h-[95vh] flex flex-col print:hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Screen-only content */}
                <div className="p-6 border-b bg-white rounded-t-2xl flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                        <img src={profileImageUrl || ''} onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${personnel.personnelName}`} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"/>
                        <div>
                            <h2 className="text-2xl font-bold text-navy">{personnel.personnelName}</h2>
                            <p className="text-gray-500">{personnel.position}</p>
                            <div className="flex gap-2 mt-2">
                                {personnel.role === 'admin' && <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded">Admin</span>}
                                {personnel.isSarabanAdmin && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Saraban</span>}
                                {personnel.specialRank && personnel.specialRank !== 'staff' && <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded">{personnel.specialRank}</span>}
                            </div>
                        </div>
                    </div>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="flex border-b bg-white overflow-x-auto no-scrollbar p-2">
                    {tabs.map((item) => <TabButton key={item.tab} tab={item.tab} label={item.label} icon={item.icon} />)}
                </div>

                <div className="flex-grow overflow-y-auto p-4 sm:p-6">
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'advisory' && renderAdvisoryTab()}
                    {activeTab === 'leave' && renderLeaveTab()}
                    {activeTab === 'pa' && renderPaTab()}
                    {activeTab === 'sar' && renderSarTab()}
                    {activeTab === 'plans' && renderPlansTab()}
                </div>
                 <div className="p-4 border-t bg-light-gray rounded-b-xl flex justify-end items-center gap-3">
                    <div className="relative" ref={exportMenuRef}>
                        <button 
                            type="button" 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            ดาวน์โหลด / ส่งออก
                        </button>
                         {isExportMenuOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                                <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-blue flex items-center gap-3 transition-colors border-b"><svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>พิมพ์ / บันทึก PDF</button>
                                <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors border-b"><svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>ส่งออก Word (.doc)</button>
                                <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-3 transition-colors border-b"><svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>ส่งออก Excel (.csv)</button>
                                <button onClick={handlePrintCard} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-orange-600 flex items-center gap-3 transition-colors"><svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>บัตรประจำตัวบุคลากร</button>
                            </div>
                         )}
                    </div>
                    <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        ปิด
                    </button>
                </div>
            </div>

            {/* Print-only content - Replaced with official form style */}
            <div className="hidden print:block font-sarabun text-black print-area-memo" style={{ padding: '1.5cm', fontSize: '16pt' }}>
                <div className="text-center mb-6">
                    <img src={getDirectDriveImageSrc(schoolLogo)} alt="logo" className="w-20 h-20 object-contain mx-auto mb-2" />
                    <h1 className="text-xl font-bold">{schoolName}</h1>
                    <h2 className="text-lg font-bold">แบบบันทึกข้อมูลบุคลากรรายบุคคล</h2>
                </div>

                <div className="flex gap-6">
                    <div className="flex-grow space-y-3 text-base">
                        <div className="flex items-baseline"><span className="font-bold w-32">ชื่อ-นามสกุล:</span><div className="border-b border-dotted border-black flex-grow px-2">{`${personnel.personnelTitle || ''} ${personnel.personnelName}`}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">ตำแหน่ง:</span><div className="border-b border-dotted border-black flex-grow px-2">{personnel.position}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">เลขบัตรประชาชน:</span><div className="border-b border-dotted border-black flex-grow px-2">{personnel.idCard}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">วันเกิด:</span><div className="border-b border-dotted border-black flex-grow px-2">{formatThaiDate(personnel.dob)}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">วิทยฐานะ:</span><div className="border-b border-dotted border-black flex-grow px-2">{personnel.academicStanding || '-'}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">เลขที่ตำแหน่ง:</span><div className="border-b border-dotted border-black flex-grow px-2">{personnel.positionNumber || '-'}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">เบอร์โทร:</span><div className="border-b border-dotted border-black flex-grow px-2">{personnel.phone}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">ที่อยู่:</span><div className="border-b border-dotted border-black flex-grow px-2">{personnel.address || '-'}</div></div>
                        <div className="flex items-baseline"><span className="font-bold w-32">วันที่บรรจุ:</span><div className="border-b border-dotted border-black flex-grow px-2">{formatThaiDate(personnel.appointmentDate)}</div></div>
                    </div>
                    <div className="w-[3.5cm] flex-shrink-0 flex flex-col items-center">
                        <div className="w-[3.5cm] h-[4.5cm] border-2 border-black flex items-center justify-center bg-gray-100 overflow-hidden p-0.5">
                            {profileImageUrl ? <img src={profileImageUrl} alt="profile" className="w-full h-full object-cover" /> : <span className="text-sm text-gray-400">รูปถ่าย</span>}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <h3 className="font-bold text-lg border-b-2 border-black mb-3 inline-block">ข้อมูลการศึกษา</h3>
                    <div className="space-y-3">
                        {(safeParseArray(personnel.educationBackgrounds) as EducationBackground[]).map((edu, index) => (
                            <div key={index} className="flex items-baseline">
                                <span className="font-bold w-36">{edu.level}:</span>
                                <div className="border-b border-dotted border-black flex-grow px-2">{edu.faculty}{edu.major ? `, สาขา ${edu.major}` : ''}</div>
                            </div>
                        ))}
                        {(safeParseArray(personnel.educationBackgrounds).length === 0) && <p className="text-gray-500 italic">ไม่มีข้อมูล</p>}
                    </div>
                </div>
                
                 <div className="mt-8">
                    <h3 className="font-bold text-lg border-b-2 border-black mb-3 inline-block">ข้อมูลการปฏิบัติงาน</h3>
                    <div className="space-y-3">
                         <div className="flex items-baseline"><span className="font-bold w-36">อีเมล:</span><div className="border-b border-dotted border-black flex-grow px-2">{personnel.email}</div></div>
                         <div className="flex items-baseline"><span className="font-bold w-36">ชั้นเรียนในที่ปรึกษา:</span><div className="border-b border-dotted border-black flex-grow px-2">{safeParseArray(personnel.advisoryClasses).join(', ') || '-'}</div></div>
                    </div>
                </div>

                <div className="mt-24 flex justify-end">
                    <div className="text-center w-80 space-y-2">
                        <p>...........................................................</p>
                        <p>(...........................................................)</p>
                        <p>ผู้รับรองข้อมูล</p>
                        <p>วันที่ ......... เดือน ......................... พ.ศ. .............</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewPersonnelModal;
