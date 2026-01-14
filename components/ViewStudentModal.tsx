
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Student, Personnel } from '../types';
import { getFirstImageSource, safeParseArray, formatThaiDate, getDriveViewUrl, getCurrentThaiDate, normalizeDate, toThaiNumerals, getDriveDownloadUrl, getDirectDriveImageSrc } from '../utils';

interface ViewStudentModalProps {
    student: Student;
    onClose: () => void;
    personnel: Personnel[];
    schoolName: string;
    schoolLogo: string;
    currentUser: Personnel | null;
}

const ViewStudentModal: React.FC<ViewStudentModalProps> = ({ student, onClose, personnel, schoolName, schoolLogo, currentUser }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'family' | 'health' | 'iep' | 'docs'>('general');
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const profileImageUrl = useMemo(() => {
        return getFirstImageSource(student.studentProfileImage);
    }, [student.studentProfileImage]);

    const homeroomTeacherNames = useMemo(() => {
        return (student.homeroomTeachers || [])
            .map(id => {
                const teacher = personnel.find(p => p.id === id);
                if (!teacher) return null;
                const title = teacher.personnelTitle === 'อื่นๆ' ? teacher.personnelTitleOther : teacher.personnelTitle;
                return `${title} ${teacher.personnelName}`;
            })
            .filter(Boolean)
            .join(', ');
    }, [student.homeroomTeachers, personnel]);

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

    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);

    const DetailSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
        <div className="mb-6">
            <h3 className="text-lg font-bold text-navy border-b-2 border-navy pb-1 mb-3">{title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {children}
            </div>
        </div>
    );

    const DetailItem: React.FC<{ label: string; value?: string | number; fullWidth?: boolean }> = ({ label, value, fullWidth = false }) => (
        <div className={fullWidth ? 'sm:col-span-2 md:col-span-3' : ''}>
            <p className="text-sm font-medium text-secondary-gray">{label}</p>
            <p className="text-md font-semibold text-gray-800 break-words">{value || '-'}</p>
        </div>
    );
    
    const DocumentViewer: React.FC<{ title: string, files?: (File|string)[]}> = ({ title, files }) => {
        const safeFiles = safeParseArray(files);

        const getFileIcon = (fileName: string) => {
            const nameLower = String(fileName).toLowerCase();
            if (/\.(pdf)/i.test(nameLower)) return 'https://img.icons8.com/plasticine/100/pdf.png';
            if (/\.(doc|docx)/i.test(nameLower)) return 'https://img.icons8.com/plasticine/100/ms-word.png';
            if (/\.(xls|xlsx)/i.test(nameLower)) return 'https://img.icons8.com/plasticine/100/ms-excel.png';
            return 'https://img.icons8.com/plasticine/100/file.png';
        };

        const renderFile = (file: File | string, index: number) => {
            const isImage = file instanceof File ? file.type.startsWith('image/') : /\.(jpg|jpeg|png|gif|webp)$/i.test(String(file));
            
            const baseName = title.replace('เอกสาร', '').trim();
            const displayName = file instanceof File ? file.name : (safeFiles.length > 1 ? `${baseName} ${index + 1}` : baseName);
            const actualFileName = file instanceof File ? file.name : String(file);

            const previewUrl = getFirstImageSource(file);
            
            if (isImage) {
                return (
                    <a key={index} href={previewUrl || '#'} target="_blank" rel="noreferrer" className="block relative group">
                        <img src={previewUrl || ''} alt={displayName} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" /></svg>
                        </div>
                    </a>
                );
            }

            return (
                 <a key={index} href={getDriveViewUrl(file)} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white text-gray-800 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
                    <img src={getFileIcon(actualFileName)} className="w-6 h-6 object-contain" alt="file-icon" />
                    <span className="text-xs truncate font-semibold">{displayName}</span>
                </a>
            );
        };


        if (!safeFiles || safeFiles.length === 0) {
            return (
                <div className="p-3 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                    <h4 className="font-semibold text-gray-700 text-sm">{title}</h4>
                    <p className="text-xs text-gray-400 mt-1">ไม่มีไฟล์</p>
                </div>
            );
        }

        return (
            <div className="space-y-2 p-3 border border-gray-100 rounded-lg bg-white shadow-sm">
                <h4 className="font-semibold text-navy text-sm mb-2">{title}</h4>
                <div className="grid grid-cols-2 gap-2">
                    {safeFiles.map(renderFile)}
                </div>
            </div>
        );
    }
    
    const calculateAge = (dobString: string): { years: number, months: number } => {
        const birthDate = normalizeDate(dobString);
        if (!birthDate) return { years: 0, months: 0 };
        
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        
        if (today.getDate() < birthDate.getDate()) {
            months--;
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        return { years, months };
    };

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        window.print();
    };
    
    const handleExportExcel = () => {
        const header = ['ID', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'ชั้น', 'เรือนนอน', 'เลขบัตรประชาชน', 'วันเกิด', 'ที่อยู่', 'เบอร์โทร'];
        const row = [
            student.id, student.studentTitle, student.studentName, student.studentNickname, student.studentClass,
            student.dormitory, student.studentIdCard, student.studentDob, student.studentAddress, student.studentPhone
        ];
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel
        csvContent += header.join(",") + "\r\n";
        csvContent += row.map(d => `"${String(d || '').replace(/"/g, '""')}"`).join(",") + "\r\n";

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `student_info_${student.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };
    
    const handleExportWord = () => {
        const photoUrl = profileImageUrl ? getDirectDriveImageSrc(profileImageUrl) : '';
        const logoUrl = getDirectDriveImageSrc(schoolLogo);

        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Student Profile</title>
                <style>
                    @page { size: A4 portrait; margin: 2cm; }
                    body { font-family: 'TH SarabunPSK', 'TH Sarabun New', sans-serif; font-size: 16pt; }
                    table { width: 100%; border-collapse: collapse; border: none; }
                    td { padding: 4px; vertical-align: bottom; }
                    .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
                    .logo { width: 80px; height: 80px; }
                    .school-name { font-size: 20pt; margin-top: 5px; }
                    .doc-title { font-size: 18pt; margin-top: 5px; }
                    .photo-box { width: 1.5in; height: 1.8in; border: 1px solid #000; text-align: center; vertical-align: middle; }
                    .label { font-weight: bold; }
                    .dotted-line { border-bottom: 1px dotted #000; display: inline-block; width: 100%; min-height: 22px; text-align: left; padding-left: 5px; }
                    .section-header { font-weight: bold; font-size: 18pt; margin-top: 15px; margin-bottom: 5px; text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${logoUrl}" class="logo" /><br/>
                    <div class="school-name">โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์</div>
                    <div class="doc-title">แบบบันทึกข้อมูลนักเรียนรายบุคคล</div>
                </div>

                <table style="width: 100%;">
                    <tr>
                        <td style="width: 70%; vertical-align: top;">
                            <!-- Personal Info -->
                            <table>
                                <tr>
                                    <td width="90" class="label">ชื่อ-นามสกุล:</td>
                                    <td><span class="dotted-line">${student.studentTitle} ${student.studentName}</span></td>
                                </tr>
                            </table>
                            <table>
                                <tr>
                                    <td width="60" class="label">ชื่อเล่น:</td>
                                    <td width="120"><span class="dotted-line">${student.studentNickname || '-'}</span></td>
                                    <td width="120" class="label" align="right">เลขบัตรประชาชน:</td>
                                    <td><span class="dotted-line">${student.studentIdCard || '-'}</span></td>
                                </tr>
                            </table>
                            <table>
                                <tr>
                                    <td width="60" class="label">วันเกิด:</td>
                                    <td width="150"><span class="dotted-line">${formatThaiDate(student.studentDob)}</span></td>
                                    <td width="70" class="label" align="right">ระดับชั้น:</td>
                                    <td><span class="dotted-line">${student.studentClass}</span></td>
                                </tr>
                            </table>
                            <table>
                                <tr>
                                    <td width="70" class="label">เรือนนอน:</td>
                                    <td width="140"><span class="dotted-line">${student.dormitory}</span></td>
                                    <td width="70" class="label" align="right">เบอร์โทร:</td>
                                    <td><span class="dotted-line">${student.studentPhone || '-'}</span></td>
                                </tr>
                            </table>
                            <table>
                                <tr>
                                    <td width="50" class="label">ที่อยู่:</td>
                                    <td><span class="dotted-line">${student.studentAddress || '-'}</span></td>
                                </tr>
                            </table>
                            <table>
                                <tr>
                                    <td width="90" class="label">ครูประจำชั้น:</td>
                                    <td><span class="dotted-line">${homeroomTeacherNames || '-'}</span></td>
                                </tr>
                            </table>
                        </td>
                        <td style="width: 30%; text-align: right; vertical-align: top; padding-left: 10px;">
                            ${photoUrl ? `<img src="${photoUrl}" style="width: 1.5in; height: 1.8in; object-fit: cover; border: 1px solid #000;" />` : '<div class="photo-box">รูปถ่าย<br/>1.5 นิ้ว</div>'}
                        </td>
                    </tr>
                </table>

                <div class="section-header">ข้อมูลครอบครัว</div>
                
                <table>
                    <tr>
                        <td width="50" class="label">บิดา:</td>
                        <td><span class="dotted-line">${student.fatherName || '-'}</span></td>
                        <td width="40" class="label" align="right">โทร:</td>
                        <td width="150"><span class="dotted-line">${student.fatherPhone || '-'}</span></td>
                    </tr>
                    <tr>
                        <td width="50" class="label">มารดา:</td>
                        <td><span class="dotted-line">${student.motherName || '-'}</span></td>
                        <td width="40" class="label" align="right">โทร:</td>
                        <td width="150"><span class="dotted-line">${student.motherPhone || '-'}</span></td>
                    </tr>
                    <tr>
                        <td width="80" class="label">ผู้ปกครอง:</td>
                        <td><span class="dotted-line">${student.guardianName || '-'}</span></td>
                        <td width="40" class="label" align="right">โทร:</td>
                        <td width="150"><span class="dotted-line">${student.guardianPhone || '-'}</span></td>
                    </tr>
                    <tr>
                        <td width="100" class="label">ที่อยู่ผู้ปกครอง:</td>
                        <td colspan="3"><span class="dotted-line">${student.guardianAddress || '-'}</span></td>
                    </tr>
                </table>

                <br/><br/>
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 50%;"></td>
                        <td style="width: 50%; text-align: center;">
                            <p>ลงชื่อ ...........................................................</p>
                            <p>(...........................................................)</p>
                            <p>...........................................................</p>
                            <p>ผู้บันทึกข้อมูล</p>
                            <p>วันที่ ........./........./.............</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `student_profile_${student.id}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };
    
    const handlePrintCard = () => {
        setIsExportMenuOpen(false);
        const logoSrc = getDirectDriveImageSrc(schoolLogo);
        const photoSrc = profileImageUrl || '';
        
        // Format dates dd/mm/yy (BE)
        const formatDateShort = (date: Date) => {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = String((date.getFullYear() + 543)).slice(-2);
            return `${d}/${m}/${y}`;
        };

        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const issueDate = formatDateShort(today);
        const expDate = formatDateShort(nextYear);

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>บัตรนักเรียน - ${student.studentName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    @page { size: 8.6cm 5.4cm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Kanit', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #fff; }
                    .card-container { 
                        width: 8.6cm; height: 5.4cm; position: relative; overflow: hidden; background: #fff; border: 1px solid #e5e7eb; box-sizing: border-box; 
                    }
                    /* Background Graphics */
                    .bg-curve {
                        position: absolute;
                        top: -80px;
                        right: -50px;
                        width: 250px;
                        height: 380px;
                        background: radial-gradient(circle at center, #dcfce7 0%, #d1fae5 40%, rgba(255,255,255,0) 70%);
                        border-radius: 50%;
                        z-index: 0;
                        opacity: 0.8;
                    }
                    .bg-overlay {
                        position: absolute; right: 0; top: 0; bottom: 0; width: 60%;
                        background: linear-gradient(135deg, transparent 20%, #ecfdf5 100%);
                        clip-path: polygon(40% 0, 100% 0, 100% 100%, 0% 100%);
                        z-index: 0;
                    }

                    .header { position: relative; z-index: 10; padding: 8px 12px 0 12px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .logo { width: 40px; height: 40px; object-fit: contain; }
                    .header-text { text-align: right; }
                    .org-name { font-size: 8px; color: #64748b; font-weight: 500; }
                    .school-name { font-size: 13px; font-weight: 800; color: #047857; margin-top: 0px; line-height: 1.1; }
                    .province { font-size: 9px; color: #059669; font-weight: 500; }

                    .content { position: relative; z-index: 10; display: flex; padding: 6px 12px; gap: 10px; align-items: center; }
                    
                    /* Photo styling */
                    .photo-container {
                        width: 2.3cm; height: 2.8cm;
                        background: #f1f5f9;
                        border-radius: 10px;
                        border: 3px solid #fff;
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
                        overflow: hidden;
                        flex-shrink: 0;
                    }
                    .photo-container img { width: 100%; height: 100%; object-fit: cover; }

                    .info-col { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                    .student-name { 
                        font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.1; 
                        margin-bottom: 4px; white-space: nowrap; 
                        font-family: 'Sarabun', sans-serif;
                    }
                    .badge {
                        display: inline-block;
                        background: #15803d;
                        color: #fff;
                        font-size: 7px;
                        font-weight: 700;
                        text-transform: uppercase;
                        padding: 2px 8px;
                        border-radius: 4px;
                        margin-bottom: 6px;
                        width: fit-content;
                        letter-spacing: 0.5px;
                    }
                    
                    .details-grid {
                        display: grid;
                        grid-template-columns: auto 1fr;
                        gap: 2px 8px;
                        font-size: 9px;
                        color: #334155;
                    }
                    .label { font-weight: 700; color: #64748b; }
                    .value { font-weight: 600; color: #0f172a; font-family: 'Sarabun', sans-serif; }

                    .teacher-row { grid-column: 1 / -1; display: flex; gap: 4px; margin-top: 1px; }
                    .teacher-label { font-weight: 700; color: #64748b; min-width: 50px; }
                    .teacher-value { font-weight: 600; color: #0f172a; font-family: 'Sarabun', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

                    .footer { 
                        position: absolute; bottom: 0; left: 0; width: 100%; height: 22px; 
                        background: #064e3b; 
                        color: #fff; display: flex; justify-content: space-between; align-items: center; 
                        padding: 0 12px; font-size: 8px; font-weight: 400; z-index: 20;
                    }
                    .footer-left { font-weight: 500; opacity: 0.9; }
                    .footer-right { font-weight: 600; }
                </style>
            </head>
            <body onload="window.print()">
                <div class="card-container">
                    <div class="bg-overlay"></div>
                    <div class="bg-curve"></div>
                    
                    <div class="header">
                        <img src="${logoSrc}" class="logo" onerror="this.style.opacity=0">
                        <div class="header-text">
                            <div class="org-name">สำนักบริหารงานการศึกษาพิเศษ</div>
                            <div class="school-name">โรงเรียนกาฬสินธุ์ปัญญานุกูล</div>
                            <div class="province">จังหวัดกาฬสินธุ์</div>
                        </div>
                    </div>

                    <div class="content">
                        <div class="photo-container">
                             ${photoSrc ? `<img src="${photoSrc}">` : ''}
                        </div>
                        <div class="info-col">
                            <div class="student-name">${student.studentTitle}${student.studentName}</div>
                            <div class="badge">นักเรียน STUDENT</div>
                            
                            <div class="details-grid">
                                <div class="label">เลขประจำตัว</div>
                                <div class="value">${student.studentIdCard || '-'}</div>
                                
                                <div class="label">ชั้นเรียน</div>
                                <div class="value">${student.studentClass}</div>
                                
                                <div class="label">เรือนนอน</div>
                                <div class="value">${student.dormitory}</div>

                                <div class="teacher-row">
                                    <div class="teacher-label">ครูประจำชั้น:</div>
                                    <div class="teacher-value">${homeroomTeacherNames || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <div class="footer-left">ออกบัตร: ${issueDate} | หมดอายุ: ${expDate}</div>
                        <div class="footer-right">โทร. 043-840842</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        const win = window.open('', '_blank', 'width=600,height=400');
        if (win) { 
            win.document.write(html); 
            win.document.close(); 
        }
    };

    const TabButton: React.FC<{ label: string, tabKey: typeof activeTab }> = ({ label, tabKey }) => (
        <button
            onClick={() => setActiveTab(tabKey)}
            className={`px-3 sm:px-4 py-2 sm:py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tabKey ? 'border-primary-blue text-primary-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            {label}
        </button>
    );
    
    const { years } = calculateAge(student.studentDob);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-2 sm:p-4 font-sarabun print-container" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-md md:max-w-3xl lg:max-w-5xl max-h-[95vh] flex flex-col print:hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Screen-only content */}
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-navy">รายละเอียดข้อมูลนักเรียน</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start mb-6">
                            <div className="flex-shrink-0">
                                <div className="w-32 h-40 sm:w-40 sm:h-52 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden mx-auto shadow-md">
                                    {profileImageUrl ? <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" /> : <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                                </div>
                            </div>
                            <div className="flex-grow w-full sm:w-auto">
                                <h3 className="text-2xl sm:text-3xl font-bold text-navy text-center sm:text-left">{`${student.studentTitle} ${student.studentName}`}</h3>
                                <p className="text-lg sm:text-xl text-secondary-gray mb-4 text-center sm:text-left">{student.studentNickname}</p>
                            </div>
                        </div>
                        <div className="border-b border-gray-200 no-print">
                            <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">
                                <TabButton label="ข้อมูลทั่วไป" tabKey="general" />
                                <TabButton label="ข้อมูลครอบครัว" tabKey="family" />
                                <TabButton label="ข้อมูลสุขภาพ" tabKey="health" />
                                <TabButton label="ข้อมูลด้านการจัดการศึกษา" tabKey="iep" />
                                <TabButton label="เอกสาร" tabKey="docs" />
                            </nav>
                        </div>
                        <div className="pt-6">
                            {activeTab === 'general' && ( <DetailSection title="ข้อมูลทั่วไปของนักเรียน"> <DetailItem label="ชั้น" value={student.studentClass} /> <DetailItem label="เรือนนอน" value={student.dormitory} /> <DetailItem label="ประเภทความพิการ" value={student.disabilityType} /> <DetailItem label="เลขบัตรประชาชน" value={student.studentIdCard} /> <DetailItem label="วันเกิด" value={formatThaiDate(student.studentDob)} /> <DetailItem label="เบอร์โทร" value={student.studentPhone} /> <DetailItem label="ครูประจำชั้น" value={homeroomTeacherNames} fullWidth /> <DetailItem label="ที่อยู่" value={student.studentAddress} fullWidth/> </DetailSection> )}
                            {activeTab === 'family' && ( <DetailSection title="ข้อมูลครอบครัว"> <DetailItem label="ชื่อ-นามสกุลบิดา" value={student.fatherName} /> <DetailItem label="เลขบัตรประชาชนบิดา" value={student.fatherIdCard} /> <DetailItem label="เบอร์โทรบิดา" value={student.fatherPhone} /> <DetailItem label="ที่อยู่บิดา" value={student.fatherAddress} fullWidth/> <DetailItem label="ชื่อ-นามสกุลมารดา" value={student.motherName} /> <DetailItem label="เลขบัตรประชาชนมารดา" value={student.motherIdCard} /> <DetailItem label="เบอร์โทรมารดา" value={student.motherPhone} /> <DetailItem label="ที่อยู่มารดา" value={student.motherAddress} fullWidth/> <DetailItem label="ชื่อ-นามสกุลผู้ปกครอง" value={student.guardianName} /> <DetailItem label="เลขบัตรประชาชนผู้ปกครอง" value={student.guardianIdCard} /> <DetailItem label="เบอร์โทรผู้ปกครอง" value={student.guardianPhone} /> <DetailItem label="ที่อยู่ผู้ปกครอง" value={student.guardianAddress} fullWidth/> </DetailSection> )}
                            {activeTab === 'health' && ( <DetailSection title="ข้อมูลทางการแพทย์และสุขภาพ"> <DetailItem label="โรคประจำตัว" value={student.chronicDisease} fullWidth /> <DetailItem label="ประวัติการแพ้ยา" value={student.drugAllergy} fullWidth /> <DetailItem label="โรคภูมิแพ้" value={student.allergies} fullWidth /> <DetailItem label="ผลการตรวจทางการแพทย์" value={student.medicalExamResults} fullWidth /> <DetailItem label="ข้อจำกัดอื่น ๆ" value={student.otherLimitations} fullWidth /> </DetailSection> )}
                            {activeTab === 'iep' && ( <div className="space-y-6"> <DocumentViewer title="แผนการจัดการศึกษาเฉพาะบุคคล (IEP)" files={student.iepFiles} /> <DocumentViewer title="แผนการสอนเฉพาะบุคคล (IIP)" files={student.iipFiles} /> </div> )}
                            {activeTab === 'docs' && ( 
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
                                    <DocumentViewer title="บัตรประชาชนนักเรียน" files={student.studentIdCardImage} /> 
                                    <DocumentViewer title="ทะเบียนบ้านนักเรียน" files={student.studentHouseRegFile} />
                                    <DocumentViewer title="สูจิบัตรนักเรียน" files={student.birthCertificateFile} />
                                    <DocumentViewer title="บัตรคนพิการ" files={student.studentDisabilityCardImage} /> 
                                    
                                    <DocumentViewer title="บัตรประชาชนผู้ปกครอง" files={student.guardianIdCardImage} /> 
                                    <DocumentViewer title="ทะเบียนบ้านผู้ปกครอง" files={student.guardianHouseRegFile} />
                                    
                                    <DocumentViewer title="เอกสารมอบฉันทะ" files={student.proxyFile} />
                                    <DocumentViewer title="เอกสารมอบอำนาจ" files={student.powerOfAttorneyFile} />
                                </div> 
                            )}
                        </div>
                </div>
                 <div className="p-4 border-t bg-light-gray rounded-b-xl flex justify-end items-center gap-3 no-print">
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
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                                <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-blue flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                    พิมพ์ / บันทึก PDF
                                </button>
                                <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1.01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    ส่งออก Word (.doc)
                                </button>
                                <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    ส่งออก Excel (.csv)
                                </button>
                                <button onClick={handlePrintCard} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-orange-600 flex items-center gap-3 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                                    บัตรนักเรียน
                                </button>
                            </div>
                         )}
                    </div>
                    <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        ปิด
                    </button>
                </div>
            </div>

            {/* Print-only content - Specific Layout for Individual Student Record */}
            <div className="hidden print:block font-sarabun text-black text-base print-area-memo" style={{ padding: '1.5cm' }}>
                <div className="text-center mb-6">
                    <img src={getDirectDriveImageSrc(schoolLogo)} alt="logo" className="w-20 h-20 object-contain mx-auto mb-2" />
                    <h1 className="text-xl font-bold">โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์</h1>
                    <h2 className="text-lg font-bold">แบบบันทึกข้อมูลนักเรียนรายบุคคล</h2>
                </div>

                {/* Main Content Layout */}
                <div className="flex gap-6">
                    {/* Left Column: Data Fields */}
                    <div className="flex-grow space-y-2">
                        {/* Row 1 */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold whitespace-nowrap w-24">ชื่อ-นามสกุล:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{`${student.studentTitle} ${student.studentName}`}</div>
                        </div>
                        
                        {/* Row 2 */}
                        <div className="flex items-baseline gap-4">
                            <div className="flex items-baseline flex-grow">
                                <span className="font-bold whitespace-nowrap w-16">ชื่อเล่น:</span>
                                <div className="border-b border-dotted border-black flex-grow px-2">{student.studentNickname || '-'}</div>
                            </div>
                            <div className="flex items-baseline flex-grow">
                                <span className="font-bold whitespace-nowrap">เลขบัตรประชาชน:</span>
                                <div className="border-b border-dotted border-black flex-grow px-2">{student.studentIdCard || '-'}</div>
                            </div>
                        </div>

                        {/* Row 3 */}
                        <div className="flex items-baseline gap-4">
                            <div className="flex items-baseline flex-grow">
                                <span className="font-bold whitespace-nowrap w-16">วันเกิด:</span>
                                <div className="border-b border-dotted border-black flex-grow px-2">{formatThaiDate(student.studentDob)}</div>
                            </div>
                            <div className="flex items-baseline flex-grow">
                                <span className="font-bold whitespace-nowrap">ระดับชั้น:</span>
                                <div className="border-b border-dotted border-black flex-grow px-2">{student.studentClass}</div>
                            </div>
                        </div>

                        {/* Row 4 */}
                        <div className="flex items-baseline gap-4">
                            <div className="flex items-baseline flex-grow">
                                <span className="font-bold whitespace-nowrap w-20">เรือนนอน:</span>
                                <div className="border-b border-dotted border-black flex-grow px-2">{student.dormitory}</div>
                            </div>
                            <div className="flex items-baseline flex-grow">
                                <span className="font-bold whitespace-nowrap">เบอร์โทร:</span>
                                <div className="border-b border-dotted border-black flex-grow px-2">{student.studentPhone || '""'}</div>
                            </div>
                        </div>

                        {/* New Row for Disability Type */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold whitespace-nowrap w-32">ประเภทความพิการ:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{student.disabilityType || '-'}</div>
                        </div>

                        {/* Row 5 */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold whitespace-nowrap w-12">ที่อยู่:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{student.studentAddress || '-'}</div>
                        </div>

                        {/* Row 6 */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold whitespace-nowrap w-24">ครูประจำชั้น:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{homeroomTeacherNames}</div>
                        </div>
                    </div>

                    {/* Right Column: Photo */}
                    <div className="w-[3.5cm] flex-shrink-0 flex flex-col items-center">
                        <div className="w-[3.5cm] h-[4.5cm] border border-black flex items-center justify-center bg-gray-100 overflow-hidden">
                            {profileImageUrl ? (
                                <img src={profileImageUrl} alt="student" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm text-gray-400">รูปถ่าย</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Family Info Section */}
                <div className="mt-6">
                    <h3 className="font-bold text-lg border-b border-black mb-2 inline-block">ข้อมูลครอบครัว</h3>
                    
                    <div className="space-y-2">
                        {/* Father */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold w-16">บิดา:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{student.fatherName || '-'}</div>
                            <span className="font-bold whitespace-nowrap">โทร:</span>
                            <div className="border-b border-dotted border-black w-40 px-2">{student.fatherPhone || '-'}</div>
                        </div>

                        {/* Mother */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold w-16">มารดา:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{student.motherName || '-'}</div>
                            <span className="font-bold whitespace-nowrap">โทร:</span>
                            <div className="border-b border-dotted border-black w-40 px-2">{student.motherPhone || '-'}</div>
                        </div>

                        {/* Guardian */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold w-20">ผู้ปกครอง:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{student.guardianName || '-'}</div>
                            <span className="font-bold whitespace-nowrap">โทร:</span>
                            <div className="border-b border-dotted border-black w-40 px-2">{student.guardianPhone || '-'}</div>
                        </div>

                        {/* Guardian Address */}
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold w-24">ที่อยู่ผู้ปกครอง:</span>
                            <div className="border-b border-dotted border-black flex-grow px-2">{student.guardianAddress || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Signature Section */}
                <div className="mt-16 flex justify-end">
                    <div className="text-center w-64 space-y-4">
                        <div>
                            <p className="font-bold">ลงชื่อ</p>
                            <div className="border-b border-dotted border-black h-6 w-full mx-auto mt-2"></div>
                            <p className="mt-1">...................................................... ผู้</p>
                            <p>บันทึกข้อมูล</p>
                        </div>
                        <div>
                            <p>(...........................................................)</p>
                            <p className="mt-2">วันที่ ........./........./.............</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewStudentModal;
