
import React, { useMemo, useEffect, useState } from 'react';
import { Student, Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc, safeParseArray } from '../utils';

interface ViewStudentModalProps {
    student: Student;
    onClose: () => void;
    personnel: Personnel[];
    schoolName: string;
    schoolLogo: string;
}

const ViewStudentModal: React.FC<ViewStudentModalProps> = ({ student, onClose, personnel, schoolName, schoolLogo }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);

    const DetailSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
        <div className="mb-6 print:hidden">
            <h3 className="text-lg font-bold text-navy border-b-2 border-navy pb-1 mb-3">{title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
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
        if (!safeFiles || safeFiles.length === 0) {
            return (
                <div>
                    <h4 className="font-semibold text-gray-700">{title}</h4>
                    <p className="text-sm text-gray-500">ไม่มีไฟล์</p>
                </div>
            );
        }

        let file = safeFiles[0];
        
        if (typeof file === 'string') {
             const cleanUrl = getDirectDriveImageSrc(file);
             const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(cleanUrl) || cleanUrl.includes('googleusercontent.com');
             
             return (
                <div>
                     <h4 className="font-semibold text-gray-700">{title}</h4>
                    {isImage ? (
                         <a href={cleanUrl} target="_blank" rel="noopener noreferrer"><img src={cleanUrl} alt={title} className="mt-1 max-w-full h-auto rounded-lg border"/></a>
                    ) : (
                        <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline">ดูเอกสาร</a>
                    )}
                </div>
            )
        }

        if (file instanceof File) {
            const isImage = file.type.startsWith('image/');
            const url = URL.createObjectURL(file);
    
            useEffect(() => {
                return () => URL.revokeObjectURL(url);
            }, [url]);

            return (
                <div>
                     <h4 className="font-semibold text-gray-700">{title}</h4>
                    {isImage ? (
                         <img src={url} alt={title} className="mt-1 max-w-full h-auto rounded-lg border"/>
                    ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline">{file.name}</a>
                    )}
                </div>
            )
        }
        return null;
    }

    // --- Export Functions ---

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        window.print();
    };

    const handleExportIDCard = () => {
        setIsExportMenuOpen(false);
        const logoSrc = getDirectDriveImageSrc(schoolLogo);
        const photoSrc = profileImageUrl || '';
        
        const today = new Date();
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        
        const formatDate = (date: Date) => {
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${(date.getFullYear() + 543).toString().slice(-2)}`;
        };

        const issueDate = formatDate(today);
        const expiryDate = formatDate(expiry);
        
        // Get teachers list
        const teachers = (student.homeroomTeachers || [])
            .map(id => personnel.find(p => p.id === id))
            .filter(p => !!p)
            .map(p => `${p?.personnelTitle === 'อื่นๆ' ? p?.personnelTitleOther : p?.personnelTitle}${p?.personnelName}`);
        
        // Generate teachers HTML structure
        let teachersHtml = '';
        if (teachers.length > 0) {
            teachersHtml = teachers.map((name, index) => `<div class="teacher-name">${name}</div>`).join('');
        } else {
            teachersHtml = '<div class="teacher-name">-</div>';
        }

        // Logic to fix duplicated student class string if it occurs (e.g., "M2/4M2/4")
        let displayClass = student.studentClass || '-';
        if (displayClass.length > 5 && displayClass.length % 2 === 0) {
            const halfIndex = displayClass.length / 2;
            const firstHalf = displayClass.substring(0, halfIndex);
            const secondHalf = displayClass.substring(halfIndex);
            if (firstHalf === secondHalf) {
                displayClass = firstHalf;
            }
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>บัตรประจำตัวนักเรียน - ${student.studentName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    @page { size: 8.6cm 5.4cm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Kanit', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #f3f4f6; }
                    
                    .card-container {
                        width: 8.6cm; height: 5.4cm; 
                        position: relative; overflow: hidden;
                        background: #fff;
                        border: 1px solid #e5e7eb;
                        box-sizing: border-box;
                    }
                    
                    /* Background Graphic */
                    .bg-graphic {
                        position: absolute;
                        top: 0; left: 0; width: 100%; height: 100%;
                        z-index: 0;
                        background: linear-gradient(120deg, #ffffff 40%, #f0fdf4 40%, #dcfce7 100%);
                    }
                    .circle-deco {
                        position: absolute;
                        right: -30px; top: -30px;
                        width: 150px; height: 150px;
                        background: rgba(22, 163, 74, 0.1);
                        border-radius: 50%;
                    }

                    /* Header */
                    .header {
                        position: relative; z-index: 10;
                        padding: 10px 14px 0 14px;
                        display: flex; justify-content: space-between; align-items: flex-start;
                    }
                    .logo { width: 42px; height: 42px; object-fit: contain; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1)); }
                    
                    .header-text { text-align: right; }
                    .org-name { font-size: 8px; color: #6b7280; font-weight: 500; letter-spacing: 0.3px; }
                    .school-name { font-size: 13px; font-weight: 700; color: #15803d; line-height: 1.1; margin-top: 2px; }
                    .province { font-size: 9px; color: #16a34a; font-weight: 500; margin-top: 1px; }
                    
                    /* Content Grid */
                    .content {
                        position: relative; z-index: 10;
                        display: flex;
                        padding: 8px 14px;
                        gap: 12px;
                    }
                    
                    /* Photo */
                    .photo-box {
                        width: 2.2cm; height: 2.7cm;
                        background: #e5e7eb;
                        border-radius: 8px;
                        border: 2px solid #fff;
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                        overflow: hidden;
                        flex-shrink: 0;
                    }
                    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
                    
                    /* Info */
                    .info-col { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                    
                    .student-name { 
                        font-size: 15px; font-weight: 700; color: #111827; 
                        line-height: 1.1; margin-bottom: 3px;
                        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                        max-width: 170px;
                    }
                    .role-badge {
                        display: inline-block;
                        background: linear-gradient(to right, #16a34a, #15803d);
                        color: white;
                        font-size: 8px; font-weight: 600; text-transform: uppercase;
                        padding: 2px 8px; border-radius: 4px;
                        margin-bottom: 6px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                        width: fit-content;
                    }
                    
                    .data-row {
                        display: flex; align-items: baseline;
                        font-size: 9px; line-height: 1.4;
                        color: #374151;
                    }
                    .label { font-weight: 600; color: #4b5563; width: 55px; flex-shrink: 0; }
                    .value { font-weight: 500; }
                    
                    /* Teacher Grid for alignment */
                    .teacher-container {
                        display: grid;
                        grid-template-columns: 55px 1fr;
                        margin-top: 2px;
                        font-size: 9px; line-height: 1.2;
                        color: #374151;
                    }
                    .teacher-label { font-weight: 600; color: #4b5563; }
                    .teacher-list { display: flex; flex-direction: column; gap: 1px; }
                    .teacher-name { font-weight: 500; font-size: 8px; }

                    /* Footer */
                    .footer {
                        position: absolute; bottom: 0; left: 0; width: 100%;
                        height: 24px;
                        background: #14532d; /* Dark Green */
                        color: rgba(255,255,255,0.9);
                        display: flex; justify-content: space-between; align-items: center;
                        padding: 0 6px; /* Adjusted padding to ensure text fits */
                        font-size: 8px; font-weight: 400;
                        z-index: 20;
                    }
                    .phone-container {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    font-weight: 400;
    color: #fff;
    font-size: 9px;
    white-space: nowrap;
    width: 130px;     /* ลดลงให้พอดีกับพื้นที่จริง */
    flex-shrink: 0;
    text-align: right;
    margin-right: 8px; /* ถอยออกจากขอบด้านขวา */
}
                    </style>
            </head>
            <body onload="window.print()">
                <div class="card-container">
                    <div class="bg-graphic"></div>
                    <div class="circle-deco"></div>
                    
                    <div class="header">
                        <img src="${logoSrc}" class="logo" onerror="this.style.opacity=0">
                        <div class="header-text">
                            <div class="org-name">สำนักบริหารงานการศึกษาพิเศษ</div>
                            <div class="school-name">โรงเรียนกาฬสินธุ์ปัญญานุกูล</div>
                            <div class="province">จังหวัดกาฬสินธุ์</div>
                        </div>
                    </div>
                    
                    <div class="content">
                        <div class="photo-box">
                             ${photoSrc ? `<img src="${photoSrc}">` : ''}
                        </div>
                        <div class="info-col">
                            <div class="student-name">${student.studentTitle}${student.studentName}</div>
                            <div class="role-badge">นักเรียน Student</div>
                            
                            <div class="data-row">
                                <span class="label">เลขประจำตัว</span>
                                <span class="value">${student.studentIdCard}</span>
                            </div>
                             <div class="data-row">
                                <span class="label">ชั้นเรียน</span>
                                <span class="value">${displayClass}</span>
                            </div>
                            <div class="data-row">
                                <span class="label">เรือนนอน</span>
                                <span class="value">${student.dormitory}</span>
                            </div>
                            
                            <div class="teacher-container">
                                <div class="teacher-label">ครูประจำชั้น:</div>
                                <div class="teacher-list">
                                    ${teachersHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div>ออกบัตร: ${issueDate}  |  หมดอายุ: ${expiryDate}</div>
                        <div class="phone-container">
                            โทร. 043-840842
                        </div>
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

    const handleExportCSV = () => {
        setIsExportMenuOpen(false);
        const headers = ['คำนำหน้า', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'ชั้น', 'เรือนนอน', 'เลขบัตรประชาชน', 'วันเกิด', 'เบอร์โทร', 'บิดา', 'มารดา', 'ผู้ปกครอง', 'เบอร์ผู้ปกครอง'];
        const row = [
            student.studentTitle,
            student.studentName,
            student.studentNickname,
            student.studentClass,
            student.dormitory,
            `"${student.studentIdCard}"`,
            student.studentDob,
            `"${student.studentPhone}"`,
            student.fatherName,
            student.motherName,
            student.guardianName,
            `"${student.guardianPhone}"`
        ];
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + "\uFEFF" // BOM
            + headers.join(",") + "\n" 
            + row.join(",");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `student_${student.studentName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportWord = () => {
        setIsExportMenuOpen(false);
         const preHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Export HTML to Word</title>
                <style>
                    @page Section1 {
                        size: 21.0cm 29.7cm;
                        margin: 1.5cm 1.5cm 1.5cm 1.5cm;
                        mso-header-margin: 35.4pt;
                        mso-footer-margin: 35.4pt;
                        mso-paper-source: 0;
                    }
                    div.Section1 { page:Section1; }
                    body {
                        font-family: 'TH SarabunPSK', 'TH Sarabun New', sans-serif;
                    }
                    .header { text-align: center; margin-bottom: 20px; }
                    .title { font-size: 22pt; font-weight: bold; margin: 0; }
                    .subtitle { font-size: 20pt; font-weight: bold; margin: 0; }
                    
                    .section-title { 
                        font-size: 18pt; 
                        font-weight: bold; 
                        border-bottom: 1px solid #000; 
                        margin-top: 20px; 
                        margin-bottom: 10px; 
                    }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
                    td { vertical-align: bottom; padding: 2px 4px; }
                    
                    .label { 
                        font-size: 18pt; 
                        font-weight: bold; 
                        white-space: nowrap;
                        width: 1%; /* Auto shrink */
                    }
                    
                    .value { 
                        font-size: 16pt; 
                        border-bottom: 1px dotted #000; 
                        padding-left: 5px;
                    }
                    
                    .photo-box { 
                        border: 1px solid #000; 
                        width: 120px; 
                        height: 150px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        margin-left: auto; 
                    }
                </style>
            </head>
            <body><div class="Section1">
        `;
        const postHtml = "</div></body></html>";
        
        const content = `
            <div style="padding: 10px;">
                <div class="header">
                    <div class="title">${schoolName}</div>
                    <div class="subtitle">ระเบียนประวัตินักเรียน</div>
                    <div style="text-align: right; font-size: 16pt;">สถานะ: กำลังศึกษา</div>
                </div>
                
                <table style="margin-bottom: 20px;">
                    <tr>
                        <td style="vertical-align: top; padding-right: 20px;">
                            <!-- Personal Info Table -->
                            <table>
                                <tr>
                                    <td class="label">ชื่อ-นามสกุล:</td>
                                    <td class="value">${student.studentTitle} ${student.studentName}</td>
                                </tr>
                                <tr>
                                    <td class="label">ชื่อเล่น:</td>
                                    <td class="value">${student.studentNickname || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">เลขบัตรฯ:</td>
                                    <td class="value">${student.studentIdCard}</td>
                                </tr>
                                 <tr>
                                    <td class="label">ระดับชั้น:</td>
                                    <td class="value">${student.studentClass}</td>
                                </tr>
                                 <tr>
                                    <td class="label">เรือนนอน:</td>
                                    <td class="value">${student.dormitory}</td>
                                </tr>
                            </table>
                        </td>
                        <td style="width: 130px; text-align: right; vertical-align: top;">
                             <div class="photo-box">
                                ${profileImageUrl ? `<img src="${profileImageUrl}" width="120" height="150" style="object-fit: cover;" />` : '<span style="font-size: 14pt;">รูปถ่าย</span>'}
                             </div>
                        </td>
                    </tr>
                </table>

                <!-- Details Row 1 -->
                <table>
                    <tr>
                         <td class="label">วันเกิด:</td>
                         <td class="value" style="width: 35%;">${student.studentDob}</td>
                         <td class="label" style="padding-left: 15px;">เบอร์โทร:</td>
                         <td class="value">${student.studentPhone || '-'}</td>
                    </tr>
                </table>
                
                <!-- Details Row 2 -->
                <table>
                    <tr>
                        <td class="label">ที่อยู่:</td>
                        <td class="value">${student.studentAddress || '-'}</td>
                    </tr>
                </table>

                <!-- Details Row 3 -->
                <table>
                    <tr>
                        <td class="label">ครูประจำชั้น:</td>
                        <td class="value">${homeroomTeacherNames || '-'}</td>
                    </tr>
                </table>

                <div class="section-title">ข้อมูลครอบครัว</div>
                
                <table>
                    <tr>
                        <td class="label">บิดา:</td>
                        <td class="value" style="width: 40%;">${student.fatherName || '-'}</td>
                        <td class="label" style="padding-left: 15px;">โทร:</td>
                        <td class="value">${student.fatherPhone || '-'}</td>
                    </tr>
                     <tr>
                        <td class="label">มารดา:</td>
                        <td class="value" style="width: 40%;">${student.motherName || '-'}</td>
                        <td class="label" style="padding-left: 15px;">โทร:</td>
                        <td class="value">${student.motherPhone || '-'}</td>
                    </tr>
                     <tr>
                        <td class="label">ผู้ปกครอง:</td>
                        <td class="value" style="width: 40%;">${student.guardianName || '-'}</td>
                        <td class="label" style="padding-left: 15px;">โทร:</td>
                        <td class="value">${student.guardianPhone || '-'}</td>
                    </tr>
                </table>
                
                <br/><br/>
                
                <div style="text-align: right; margin-top: 30px;">
                     <p style="font-size: 16pt; margin: 5px 0;">ลงชื่อ ........................................................... ผู้บันทึกข้อมูล</p>
                     <p style="font-size: 16pt; margin: 5px 0;">(...........................................................)</p>
                     <p style="font-size: 16pt; margin: 5px 0;">วันที่ ........./........./.............</p>
                </div>
            </div>
        `;

        const html = preHtml + content + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const link = document.createElement("a");
        link.href = url;
        link.download = `profile_${student.studentName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col print:fixed print:inset-0 print:w-full print:h-full print:max-w-none print:rounded-none print:z-[100] print:bg-white" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b flex justify-between items-center print:hidden">
                    <h2 className="text-2xl font-bold text-navy">รายละเอียดข้อมูลนักเรียน</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 print:overflow-visible print:p-8">
                    
                    {/* ---------------- PRINT LAYOUT (Application Form Style - TH Sarabun) ---------------- */}
                    <div id="print-section" className="hidden print:block font-sarabun text-black leading-tight">
                        <div className="text-center mb-6">
                            <h1 className="text-4xl font-bold">{schoolName}</h1>
                            <h2 className="text-2xl font-bold mt-2">ระเบียนประวัตินักเรียน</h2>
                            <div className="text-right text-xl mt-2">สถานะ: กำลังศึกษา</div>
                        </div>

                        <div className="flex justify-between items-start gap-8">
                            {/* Left Data Column */}
                            <div className="flex-grow space-y-2 text-xl">
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">ชื่อ-นามสกุล:</div>
                                    <div className="col-span-10 border-b border-dotted border-black pb-1">{student.studentTitle} {student.studentName}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">ชื่อเล่น:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.studentNickname || '-'}</div>
                                    <div className="col-span-2 font-bold text-right">เลขบัตรฯ:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.studentIdCard}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">ระดับชั้น:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.studentClass}</div>
                                    <div className="col-span-2 font-bold text-right">เรือนนอน:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.dormitory}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">วันเกิด:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.studentDob}</div>
                                    <div className="col-span-2 font-bold text-right">เบอร์โทร:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.studentPhone || '-'}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">ที่อยู่:</div>
                                    <div className="col-span-10 border-b border-dotted border-black pb-1">{student.studentAddress || '-'}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">ครูประจำชั้น:</div>
                                    <div className="col-span-10 border-b border-dotted border-black pb-1">{homeroomTeacherNames || '-'}</div>
                                </div>
                            </div>

                            {/* Right Image Column */}
                            <div className="flex-shrink-0">
                                <div className="w-[1.5in] h-[2in] border border-black flex items-center justify-center overflow-hidden">
                                     {profileImageUrl ? (
                                        <img src={profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
                                    ) : (
                                        <span className="text-lg text-gray-400">ติดรูปถ่าย</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Family Section */}
                        <div className="mt-8">
                            <h3 className="text-2xl font-bold border-b border-black pb-1 mb-4">ข้อมูลครอบครัว</h3>
                            <div className="space-y-2 text-xl">
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">บิดา:</div>
                                    <div className="col-span-5 border-b border-dotted border-black pb-1">{student.fatherName || '-'}</div>
                                    <div className="col-span-1 font-bold text-right">โทร:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.fatherPhone || '-'}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">มารดา:</div>
                                    <div className="col-span-5 border-b border-dotted border-black pb-1">{student.motherName || '-'}</div>
                                    <div className="col-span-1 font-bold text-right">โทร:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.motherPhone || '-'}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2 font-bold">ผู้ปกครอง:</div>
                                    <div className="col-span-5 border-b border-dotted border-black pb-1">{student.guardianName || '-'}</div>
                                    <div className="col-span-1 font-bold text-right">โทร:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{student.guardianPhone || '-'}</div>
                                </div>
                            </div>
                        </div>

                         {/* Signature Section */}
                         <div className="mt-16 flex justify-end text-xl">
                            <div className="text-center w-64">
                                <div className="border-b border-dotted border-black mb-2"></div>
                                <p>ลงชื่อผู้บันทึกข้อมูล</p>
                                <p className="mt-6">(...........................................................)</p>
                                <p className="mt-1">วันที่ ........./........./.............</p>
                            </div>
                        </div>
                    </div>


                    {/* ---------------- SCREEN LAYOUT ---------------- */}
                    <div className="print:hidden">
                        <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
                            <div className="flex-shrink-0 w-full sm:w-40">
                                <div className="w-40 h-52 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden mx-auto shadow-md">
                                    {profileImageUrl ? (
                                        <img 
                                            src={profileImageUrl} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                target.onerror = null; 
                                                target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                target.outerHTML = `<svg class="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
                                            }}
                                        />
                                    ) : (
                                        <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    )}
                                </div>
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-3xl font-bold text-navy">{`${student.studentTitle} ${student.studentName}`}</h3>
                                <p className="text-xl text-secondary-gray mb-4">{student.studentNickname}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                    <DetailItem label="ชั้น" value={student.studentClass} />
                                    <DetailItem label="เรือนนอน" value={student.dormitory} />
                                    <DetailItem label="เลขบัตรประชาชน" value={student.studentIdCard} />
                                    <DetailItem label="วันเกิด" value={student.studentDob} />
                                    <DetailItem label="เบอร์โทร" value={student.studentPhone} />
                                    <DetailItem label="ครูประจำชั้น" value={homeroomTeacherNames} />
                                    <DetailItem label="ที่อยู่" value={student.studentAddress} fullWidth/>
                                </div>
                            </div>
                        </div>
                        

                        <DetailSection title="ข้อมูลครอบครัว">
                            <DetailItem label="ชื่อ-นามสกุลบิดา" value={student.fatherName} />
                            <DetailItem label="เลขบัตรประชาชนบิดา" value={student.fatherIdCard} />
                            <DetailItem label="เบอร์โทรบิดา" value={student.fatherPhone} />
                            <DetailItem label="ที่อยู่บิดา" value={student.fatherAddress} fullWidth/>

                            <DetailItem label="ชื่อ-นามสกุลมารดา" value={student.motherName} />
                            <DetailItem label="เลขบัตรประชาชนมารดา" value={student.motherIdCard} />
                            <DetailItem label="เบอร์โทรมารดา" value={student.motherPhone} />
                            <DetailItem label="ที่อยู่มารดา" value={student.motherAddress} fullWidth/>

                            <DetailItem label="ชื่อ-นามสกุลผู้ปกครอง" value={student.guardianName} />
                            <DetailItem label="เลขบัตรประชาชนผู้ปกครอง" value={student.guardianIdCard} />
                            <DetailItem label="เบอร์โทรผู้ปกครอง" value={student.guardianPhone} />
                            <DetailItem label="ที่อยู่ผู้ปกครอง" value={student.guardianAddress} fullWidth/>
                        </DetailSection>

                        <DetailSection title="เอกสารแนบ">
                            <DocumentViewer title="บัตรประชาชนนักเรียน" files={student.studentIdCardImage} />
                            <DocumentViewer title="บัตรคนพิการ" files={student.studentDisabilityCardImage} />
                            <DocumentViewer title="บัตรประชาชนผู้ปกครอง" files={student.guardianIdCardImage} />
                        </DetailSection>
                    </div>
                </div>

                 <div className="p-4 border-t bg-light-gray rounded-b-xl flex justify-end items-center gap-3 print:hidden">
                    <div className="relative">
                        <button 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-md transition-all"
                        >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                             ดาวน์โหลด / ส่งออก
                        </button>
                        
                        {isExportMenuOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                                <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-blue flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                    พิมพ์ / PDF
                                </button>
                                <button onClick={handleExportIDCard} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-orange-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                                    บัตรนักเรียน
                                </button>
                                <button onClick={handleExportCSV} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Excel (CSV)
                                </button>
                                <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Word (DOC)
                                </button>
                            </div>
                        )}
                    </div>

                    <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewStudentModal;
