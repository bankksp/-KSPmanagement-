
import React, { useMemo, useEffect, useState } from 'react';
import { Student, Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc, safeParseArray, formatThaiDate } from '../utils';

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

    const exportToWord = () => {
        const logoSrc = getDirectDriveImageSrc(schoolLogo);
        const photoHtml = profileImageUrl 
            ? `<img src="${profileImageUrl}" style="width: 3.81cm; height: 5.08cm; object-fit: cover; border: 1px solid #000;">` 
            : `<div style="width: 3.81cm; height: 5.08cm; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 14pt;">รูปถ่าย</div>`;

        const htmlString = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Student Record - ${student.studentName}</title>
                <style>
                    @page { size: A4; margin: 2cm; mso-page-orientation: portrait; }
                    body { font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.4; }
                    .header-title { font-size: 22pt; font-weight: bold; text-align: center; margin: 0; }
                    .header-sub { font-size: 18pt; font-weight: bold; text-align: center; margin: 0; }
                    table { width: 100%; border-collapse: collapse; border: none; }
                    td { vertical-align: top; padding: 4px 0; }
                    .label { font-weight: bold; margin-right: 5px; }
                    .value { border-bottom: 1px dotted #000; padding: 0 5px; display: inline-block; min-width: 50px; }
                    .section-title { font-weight: bold; font-size: 18pt; border-bottom: 1px solid #000; margin-top: 20px; margin-bottom: 10px; }
                    .photo-cell { text-align: right; vertical-align: top; padding-left: 20px; width: 4.5cm; }
                </style>
            </head>
            <body>
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${logoSrc}" width="80" height="80" style="margin-bottom: 10px;" />
                    <p class="header-title">${schoolName}</p>
                    <p class="header-sub">แบบบันทึกข้อมูลนักเรียนรายบุคคล</p>
                </div>
                
                <table style="width: 100%;">
                    <tr>
                        <td valign="top">
                            <p><span class="label">ชื่อ-นามสกุล:</span> <span class="value">${student.studentTitle} ${student.studentName}</span></p>
                            <p>
                                <span class="label">ชื่อเล่น:</span> <span class="value">${student.studentNickname || '-'}</span>
                                &nbsp;&nbsp;
                                <span class="label">เลขประจำตัวประชาชน:</span> <span class="value">${student.studentIdCard || '-'}</span>
                            </p>
                            <p>
                                <span class="label">วันเกิด:</span> <span class="value">${formatThaiDate(student.studentDob) || '-'}</span>
                                &nbsp;&nbsp;
                                <span class="label">ระดับชั้น:</span> <span class="value">${student.studentClass || '-'}</span>
                            </p>
                             <p>
                                <span class="label">เรือนนอน:</span> <span class="value">${student.dormitory || '-'}</span>
                                &nbsp;&nbsp;
                                <span class="label">เบอร์โทร:</span> <span class="value">${student.studentPhone || '-'}</span>
                            </p>
                            <p><span class="label">ที่อยู่:</span> <span class="value">${student.studentAddress || '-'}</span></p>
                            <p><span class="label">ครูประจำชั้น:</span> <span class="value">${homeroomTeacherNames || '-'}</span></p>
                        </td>
                        <td class="photo-cell" valign="top">
                            ${photoHtml}
                        </td>
                    </tr>
                </table>

                <div class="section-title">ข้อมูลครอบครัว</div>
                
                <table>
                    <tr>
                        <td width="60%">
                             <span class="label">บิดา:</span> <span class="value">${student.fatherName || '-'}</span>
                        </td>
                         <td width="40%">
                             <span class="label">เบอร์โทร:</span> <span class="value">${student.fatherPhone || '-'}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                             <span class="label">มารดา:</span> <span class="value">${student.motherName || '-'}</span>
                        </td>
                         <td>
                             <span class="label">เบอร์โทร:</span> <span class="value">${student.motherPhone || '-'}</span>
                        </td>
                    </tr>
                     <tr>
                        <td>
                             <span class="label">ผู้ปกครอง:</span> <span class="value">${student.guardianName || '-'}</span>
                        </td>
                         <td>
                             <span class="label">เบอร์โทร:</span> <span class="value">${student.guardianPhone || '-'}</span>
                        </td>
                    </tr>
                     <tr>
                        <td colspan="2">
                             <span class="label">ที่อยู่ผู้ปกครอง:</span> <span class="value">${student.guardianAddress || '-'}</span>
                        </td>
                    </tr>
                </table>

                 <br/><br/><br/>
                 <table style="width: 100%; text-align: right;">
                    <tr>
                        <td>
                            <p>ลงชื่อ ........................................................... ผู้บันทึกข้อมูล</p>
                            <p>(...........................................................)</p>
                            <p>วันที่ ........./........./.............</p>
                        </td>
                    </tr>
                 </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlString], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ระเบียนประวัติ_${student.studentName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const exportToExcel = () => {
        const data = [
            ['หัวข้อ', 'ข้อมูล'],
            ['ชื่อ-นามสกุล', `${student.studentTitle} ${student.studentName}`],
            ['ชื่อเล่น', student.studentNickname],
            ['เลขประจำตัว', student.studentIdCard],
            ['วันเกิด', formatThaiDate(student.studentDob)],
            ['เบอร์โทร', student.studentPhone],
            ['ชั้นเรียน', student.studentClass],
            ['เรือนนอน', student.dormitory],
            ['ที่อยู่', student.studentAddress],
            ['ครูประจำชั้น', homeroomTeacherNames],
            ['', ''],
            ['ข้อมูลบิดา', student.fatherName],
            ['เบอร์โทรบิดา', student.fatherPhone],
            ['ข้อมูลมารดา', student.motherName],
            ['เบอร์โทรมารดา', student.motherPhone],
            ['ข้อมูลผู้ปกครอง', student.guardianName],
            ['เบอร์โทรผู้ปกครอง', student.guardianPhone],
            ['ที่อยู่ผู้ปกครอง', student.guardianAddress],
        ];

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        data.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ข้อมูลนักเรียน_${student.studentName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
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
        
        const teachers = (student.homeroomTeachers || [])
            .map(id => personnel.find(p => p.id === id))
            .filter(p => !!p)
            .map(p => `${p?.personnelTitle === 'อื่นๆ' ? p?.personnelTitleOther : p?.personnelTitle}${p?.personnelName}`);
        
        let teachersHtml = '';
        if (teachers.length > 0) {
            teachersHtml = teachers.map((name, index) => `<div class="teacher-name">${name}</div>`).join('');
        } else {
            teachersHtml = '<div class="teacher-name">-</div>';
        }

        let displayClass = student.studentClass || '-';
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
                    .card-container { width: 8.6cm; height: 5.4cm; position: relative; overflow: hidden; background: #fff; border: 1px solid #e5e7eb; box-sizing: border-box; }
                    .bg-graphic { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; background: linear-gradient(120deg, #ffffff 40%, #f0fdf4 40%, #dcfce7 100%); }
                    .circle-deco { position: absolute; right: -30px; top: -30px; width: 150px; height: 150px; background: rgba(22, 163, 74, 0.1); border-radius: 50%; }
                    .header { position: relative; z-index: 10; padding: 10px 14px 0 14px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .logo { width: 42px; height: 42px; object-fit: contain; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1)); }
                    .header-text { text-align: right; }
                    .org-name { font-size: 8px; color: #6b7280; font-weight: 500; letter-spacing: 0.3px; }
                    .school-name { font-size: 13px; font-weight: 700; color: #15803d; line-height: 1.1; margin-top: 2px; }
                    .province { font-size: 9px; color: #16a34a; font-weight: 500; margin-top: 1px; }
                    .content { position: relative; z-index: 10; display: flex; padding: 8px 14px; gap: 12px; }
                    .photo-box { width: 2.2cm; height: 2.7cm; background: #e5e7eb; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; flex-shrink: 0; }
                    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
                    .info-col { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                    .student-name { font-size: 15px; font-weight: 700; color: #111827; line-height: 1.1; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
                    .role-badge { display: inline-block; background: linear-gradient(to right, #16a34a, #15803d); color: white; font-size: 8px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: fit-content; }
                    .data-row { display: flex; align-items: baseline; font-size: 9px; line-height: 1.4; color: #374151; }
                    .label { font-weight: 600; color: #4b5563; width: 55px; flex-shrink: 0; }
                    .value { font-weight: 500; }
                    .teacher-container { display: grid; grid-template-columns: 55px 1fr; margin-top: 2px; font-size: 9px; line-height: 1.2; color: #374151; }
                    .teacher-label { font-weight: 600; color: #4b5563; }
                    .teacher-list { display: flex; flex-direction: column; gap: 1px; }
                    .teacher-name { font-weight: 500; font-size: 8px; }
                    .footer { position: absolute; bottom: 0; left: 0; width: 100%; height: 24px; background: #14532d; color: rgba(255,255,255,0.9); display: flex; justify-content: space-between; align-items: center; padding: 0 6px; font-size: 8px; font-weight: 400; z-index: 20; }
                    .phone-container { display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-weight: 400; color: #fff; font-size: 9px; white-space: nowrap; width: 130px; flex-shrink: 0; text-align: right; margin-right: 7px; }
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
                            <div class="data-row"><span class="label">เลขประจำตัว</span><span class="value">${student.studentIdCard}</span></div>
                             <div class="data-row"><span class="label">ชั้นเรียน</span><span class="value">${displayClass}</span></div>
                            <div class="data-row"><span class="label">เรือนนอน</span><span class="value">${student.dormitory}</span></div>
                            <div class="teacher-container"><div class="teacher-label">ครูประจำชั้น:</div><div class="teacher-list">${teachersHtml}</div></div>
                        </div>
                    </div>
                    <div class="footer">
                        <div>ออกบัตร: ${issueDate}  |  หมดอายุ: ${expiryDate}</div>
                        <div class="phone-container">โทร. 043-840842</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        const win = window.open('', '_blank', 'width=600,height=400');
        if (win) { win.document.write(html); win.document.close(); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4" onClick={onClose}>
            <style>{`
                @media print {
                    #print-dashboard { display: none !important; }
                    #print-section-student { display: block !important; }
                    @page { size: A4 portrait; margin: 2cm; }
                    body { font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif; font-size: 16pt; }
                    .print-dotted-line { border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 5px; padding-left: 5px; }
                }
            `}</style>
            
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
                    
                    {/* ---------------- PRINT LAYOUT (Official Document Style) ---------------- */}
                    <div id="print-section-student" className="hidden print:block print-visible font-sarabun text-black leading-normal">
                        
                        <div className="text-center mb-6">
                             <img src={getDirectDriveImageSrc(schoolLogo)} alt="logo" className="h-20 w-auto mx-auto mb-2" />
                             <h1 className="text-2xl font-bold">{schoolName}</h1>
                             <h2 className="text-xl font-bold mt-1">แบบบันทึกข้อมูลนักเรียนรายบุคคล</h2>
                        </div>

                        <div className="flex justify-between items-start relative">
                            <div className="flex-grow pr-8 space-y-2 text-lg w-2/3">
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">ชื่อ-นามสกุล:</span>
                                    <span className="print-dotted-line">{student.studentTitle} {student.studentName}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">ชื่อเล่น:</span>
                                    <span className="print-dotted-line">{student.studentNickname || '-'}</span>
                                    <span className="font-bold shrink-0 ml-4">เลขบัตรประชาชน:</span>
                                    <span className="print-dotted-line">{student.studentIdCard || '-'}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">วันเกิด:</span>
                                    <span className="print-dotted-line">{formatThaiDate(student.studentDob) || '-'}</span>
                                    <span className="font-bold shrink-0 ml-4">ระดับชั้น:</span>
                                    <span className="print-dotted-line">{student.studentClass || '-'}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">เรือนนอน:</span>
                                    <span className="print-dotted-line">{student.dormitory || '-'}</span>
                                    <span className="font-bold shrink-0 ml-4">เบอร์โทร:</span>
                                    <span className="print-dotted-line">{student.studentPhone || '-'}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">ที่อยู่:</span>
                                    <span className="print-dotted-line">{student.studentAddress || '-'}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">ครูประจำชั้น:</span>
                                    <span className="print-dotted-line">{homeroomTeacherNames || '-'}</span>
                                 </div>
                            </div>

                            <div className="w-[4cm] h-[5.2cm] border border-black flex items-center justify-center bg-gray-50 shrink-0 mb-4 self-start">
                                {profileImageUrl ? (
                                    <img src={profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <span className="text-gray-400 text-sm">รูปถ่าย</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 mb-4 border-b border-black">
                            <h3 className="text-lg font-bold pb-1">ข้อมูลครอบครัว</h3>
                        </div>

                        <div className="space-y-2 text-lg">
                             <div className="flex gap-4">
                                 <div className="flex items-baseline flex-grow">
                                    <span className="font-bold shrink-0">บิดา:</span>
                                    <span className="print-dotted-line">{student.fatherName || '-'}</span>
                                </div>
                                <div className="flex items-baseline w-1/3">
                                    <span className="font-bold shrink-0">โทร:</span>
                                    <span className="print-dotted-line">{student.fatherPhone || '-'}</span>
                                </div>
                             </div>
                             <div className="flex gap-4">
                                 <div className="flex items-baseline flex-grow">
                                    <span className="font-bold shrink-0">มารดา:</span>
                                    <span className="print-dotted-line">{student.motherName || '-'}</span>
                                </div>
                                <div className="flex items-baseline w-1/3">
                                    <span className="font-bold shrink-0">โทร:</span>
                                    <span className="print-dotted-line">{student.motherPhone || '-'}</span>
                                </div>
                             </div>
                             <div className="flex gap-4">
                                 <div className="flex items-baseline flex-grow">
                                    <span className="font-bold shrink-0">ผู้ปกครอง:</span>
                                    <span className="print-dotted-line">{student.guardianName || '-'}</span>
                                </div>
                                <div className="flex items-baseline w-1/3">
                                    <span className="font-bold shrink-0">โทร:</span>
                                    <span className="print-dotted-line">{student.guardianPhone || '-'}</span>
                                </div>
                             </div>
                             <div className="flex items-baseline">
                                <span className="font-bold shrink-0">ที่อยู่ผู้ปกครอง:</span>
                                <span className="print-dotted-line">{student.guardianAddress || '-'}</span>
                             </div>
                        </div>

                         <div className="mt-16 flex justify-end text-lg">
                            <div className="text-center w-72">
                                <p className="mb-8">ลงชื่อ ........................................................... ผู้บันทึกข้อมูล</p>
                                <p className="mb-2">(...........................................................)</p>
                                <p>วันที่ ........./........./.............</p>
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
                                    <DetailItem label="วันเกิด" value={formatThaiDate(student.studentDob)} />
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
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                             ดาวน์โหลด / ส่งออก
                        </button>
                        
                        {isExportMenuOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                                <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-blue flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                    พิมพ์ / บันทึก PDF
                                </button>
                                <button onClick={exportToWord} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    ส่งออก Word (.doc)
                                </button>
                                <button onClick={exportToExcel} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    ส่งออก Excel (.csv)
                                </button>
                                <button onClick={handleExportIDCard} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-orange-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
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
        </div>
    );
};

export default ViewStudentModal;
