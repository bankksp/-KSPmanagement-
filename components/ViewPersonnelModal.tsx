
import React, { useMemo, useEffect, useState } from 'react';
import { Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc } from '../utils';

interface ViewPersonnelModalProps {
    personnel: Personnel;
    onClose: () => void;
    schoolName: string;
    schoolLogo: string;
}

const calculateAge = (dobString: string): string => {
    if (!dobString) return '-';
    const parts = dobString.split('/');
    if (parts.length !== 3) return '-';
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '-';

    const buddhistYear = year;
    const gregorianYear = buddhistYear - 543;
    
    const birthDate = new Date(gregorianYear, month - 1, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age > 0 ? age.toString() : '-';
};

const ViewPersonnelModal: React.FC<ViewPersonnelModalProps> = ({ personnel, onClose, schoolName, schoolLogo }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const profileImageUrl = useMemo(() => {
        return getFirstImageSource(personnel.profileImage);
    }, [personnel.profileImage]);

    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);
    
    const advisoryClassesText = useMemo(() => {
        const classes: unknown = personnel.advisoryClasses;
        if (Array.isArray(classes)) {
            return classes.length > 0 ? classes.join(', ') : '-';
        }
        if (typeof classes === 'string' && classes.trim() !== '') {
            return classes;
        }
        return '-';
    }, [personnel.advisoryClasses]);

    const fullName = useMemo(() => {
        const title = personnel.personnelTitle === 'อื่นๆ' ? personnel.personnelTitleOther : personnel.personnelTitle;
        return `${title || ''} ${personnel.personnelName || ''}`.trim();
    }, [personnel]);


    const DetailItem: React.FC<{ label: string; value?: string | number; fullWidth?: boolean }> = ({ label, value, fullWidth = false }) => (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <p className="text-sm font-medium text-secondary-gray">{label}</p>
            <p className="text-md font-semibold text-gray-800 break-words">{value || '-'}</p>
        </div>
    );
    
    // --- Export Functions ---

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        window.print();
    };

    const exportToWord = () => {
        const logoSrc = getDirectDriveImageSrc(schoolLogo);
        // Photo size approx 1.5 inches wide (3.81 cm) by 2 inches high (5.08 cm)
        const photoHtml = profileImageUrl 
            ? `<img src="${profileImageUrl}" style="width: 3.81cm; height: 5.08cm; object-fit: cover; border: 1px solid #000;">` 
            : `<div style="width: 3.81cm; height: 5.08cm; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 14pt;">รูปถ่าย</div>`;

        const htmlString = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Personnel Record - ${personnel.personnelName}</title>
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
                    <p class="header-sub">ประวัติข้าราชการครูและบุคลากรทางการศึกษา</p>
                </div>

                 <table style="width: 100%;">
                    <tr>
                        <td valign="top">
                            <p><span class="label">ชื่อ-นามสกุล:</span> <span class="value">${fullName}</span></p>
                            <p>
                                <span class="label">ตำแหน่ง:</span> <span class="value">${personnel.position}</span>
                                &nbsp;&nbsp;
                                <span class="label">เลขที่ตำแหน่ง:</span> <span class="value">${personnel.positionNumber || '-'}</span>
                            </p>
                             <p>
                                <span class="label">วันเดือนปีเกิด:</span> <span class="value">${personnel.dob || '-'}</span>
                                &nbsp;&nbsp;
                                <span class="label">อายุ:</span> <span class="value">${calculateAge(personnel.dob)} ปี</span>
                            </p>
                            <p>
                                <span class="label">เลขบัตรประชาชน:</span> <span class="value">${personnel.idCard || '-'}</span>
                            </p>
                             <p>
                                <span class="label">วันที่บรรจุแต่งตั้ง:</span> <span class="value">${personnel.appointmentDate || '-'}</span>
                            </p>
                             <p>
                                <span class="label">เบอร์โทรศัพท์:</span> <span class="value">${personnel.phone || '-'}</span>
                            </p>
                        </td>
                        <td class="photo-cell" valign="top">
                            ${photoHtml}
                        </td>
                    </tr>
                </table>

                <div class="section-title">ภาระงาน</div>
                 <p><span class="label">ครูที่ปรึกษา:</span> <span class="value">${advisoryClassesText}</span></p>

                 <br/><br/><br/>
                 <table style="width: 100%; text-align: right;">
                    <tr>
                        <td>
                            <p>ลงชื่อ ........................................................... เจ้าของประวัติ</p>
                            <p>(${fullName})</p>
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
        link.download = `ประวัติบุคลากร_${personnel.personnelName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const exportToExcel = () => {
         const data = [
            ['หัวข้อ', 'ข้อมูล'],
            ['ชื่อ-นามสกุล', fullName],
            ['ตำแหน่ง', personnel.position],
            ['เลขที่ตำแหน่ง', personnel.positionNumber],
            ['เลขบัตรประชาชน', personnel.idCard],
            ['วันเดือนปีเกิด', personnel.dob],
            ['อายุ', calculateAge(personnel.dob)],
            ['เบอร์โทร', personnel.phone],
            ['วันที่บรรจุ', personnel.appointmentDate],
            ['ครูที่ปรึกษา', advisoryClassesText]
        ];

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        data.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ข้อมูลบุคลากร_${personnel.personnelName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    }

    const handleExportIDCard = () => {
        setIsExportMenuOpen(false);
        const logoSrc = getDirectDriveImageSrc(schoolLogo);
        const photoSrc = profileImageUrl || '';
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>บัตรประจำตัวบุคลากร - ${personnel.personnelName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    @page { size: 8.6cm 5.4cm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Kanit', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #f3f4f6; }
                    .card-container { width: 8.6cm; height: 5.4cm; position: relative; overflow: hidden; background: #fff; border: 1px solid #e5e7eb; box-sizing: border-box; }
                    .bg-graphic { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; background: linear-gradient(120deg, #f8fafc 40%, #e2e8f0 40%, #cbd5e1 100%); }
                    .circle-deco { position: absolute; right: -30px; top: -30px; width: 150px; height: 150px; background: rgba(30, 58, 138, 0.05); border-radius: 50%; }
                    .header { position: relative; z-index: 10; padding: 10px 14px 0 14px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .logo { width: 42px; height: 42px; object-fit: contain; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1)); }
                    .header-text { text-align: right; }
                    .org-name { font-size: 8px; color: #64748b; font-weight: 500; letter-spacing: 0.3px; }
                    .school-name { font-size: 13px; font-weight: 700; color: #1e3a8a; line-height: 1.1; margin-top: 2px; }
                    .province { font-size: 9px; color: #1e40af; font-weight: 500; margin-top: 1px; }
                    .content { position: relative; z-index: 10; display: flex; padding: 8px 14px; gap: 12px; }
                    .photo-box { width: 2.2cm; height: 2.7cm; background: #e2e8f0; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; flex-shrink: 0; }
                    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
                    .info-col { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                    .person-name { font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.1; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
                    .role-badge { display: inline-block; background: linear-gradient(to right, #fbbf24, #f59e0b); color: #78350f; font-size: 8px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: fit-content; }
                    .data-row { display: flex; align-items: baseline; font-size: 9px; line-height: 1.4; color: #334155; }
                    .label { font-weight: 600; color: #64748b; width: 55px; flex-shrink: 0; }
                    .value { font-weight: 500; }
                    .footer { position: absolute; bottom: 0; left: 0; width: 100%; height: 24px; background: #1e293b; color: rgba(255,255,255,0.9); display: flex; justify-content: space-between; align-items: center; padding: 0 6px; font-size: 8px; font-weight: 400; z-index: 20; }
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
                            <div class="person-name">${fullName}</div>
                            <div class="role-badge">${personnel.position}</div>
                            <div class="data-row"><span class="label">ID Card</span><span class="value">${personnel.idCard}</span></div>
                            <div class="data-row"><span class="label">เบอร์โทร</span><span class="value">${personnel.phone}</span></div>
                            <div class="data-row"><span class="label">บรรจุเมื่อ</span><span class="value">${personnel.appointmentDate || '-'}</span></div>
                        </div>
                    </div>
                    <div class="footer">
                         <div>ผู้ออกบัตร: ผู้อำนวยการสถานศึกษา</div>
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
            {/* Style isolation to ensure only this modal prints when open */}
            <style>{`
                @media print {
                    #print-dashboard { display: none !important; }
                    #print-section-personnel { display: block !important; }
                    @page { size: A4 portrait; margin: 2cm; }
                    body { font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif; font-size: 16pt; }
                    .print-dotted-line { border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 5px; padding-left: 5px; }
                }
            `}</style>
            
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col print:fixed print:inset-0 print:w-full print:h-full print:max-w-none print:rounded-none print:z-[100] print:bg-white" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b flex justify-between items-center print:hidden">
                    <h2 className="text-2xl font-bold text-navy">รายละเอียดข้อมูลบุคลากร</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 print:overflow-visible print:p-8">
                    
                    {/* ---------------- PRINT LAYOUT (Official A4 Government Record) ---------------- */}
                    <div id="print-section-personnel" className="hidden print:block print-visible font-sarabun text-black leading-normal">
                        
                        <div className="text-center mb-6">
                             <img src={getDirectDriveImageSrc(schoolLogo)} alt="logo" className="h-20 w-auto mx-auto mb-2" />
                             <h1 className="text-2xl font-bold">{schoolName}</h1>
                             <h2 className="text-xl font-bold mt-1">ประวัติข้าราชการครูและบุคลากรทางการศึกษา</h2>
                        </div>

                        <div className="flex justify-between items-start">
                            {/* Info Column */}
                            <div className="flex-grow pr-8 space-y-2 text-lg w-2/3">
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">ชื่อ-นามสกุล:</span>
                                    <span className="print-dotted-line">{fullName}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">ตำแหน่ง:</span>
                                    <span className="print-dotted-line">{personnel.position}</span>
                                    <span className="font-bold shrink-0 ml-4">เลขที่ตำแหน่ง:</span>
                                    <span className="print-dotted-line">{personnel.positionNumber || '-'}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">วันเดือนปีเกิด:</span>
                                    <span className="print-dotted-line">{personnel.dob || '-'}</span>
                                    <span className="font-bold shrink-0 ml-4">อายุ:</span>
                                    <span className="print-dotted-line">{calculateAge(personnel.dob)} ปี</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">เลขบัตรประชาชน:</span>
                                    <span className="print-dotted-line">{personnel.idCard || '-'}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">วันที่บรรจุแต่งตั้ง:</span>
                                    <span className="print-dotted-line">{personnel.appointmentDate || '-'}</span>
                                 </div>
                                 <div className="flex items-baseline">
                                    <span className="font-bold shrink-0">เบอร์โทรศัพท์:</span>
                                    <span className="print-dotted-line">{personnel.phone || '-'}</span>
                                 </div>
                            </div>

                            {/* Photo Column (Top Right) - Fixed Size ~1.5x2 inch */}
                            <div className="w-[4cm] h-[5.2cm] border border-black flex items-center justify-center bg-gray-50 shrink-0 mb-4 self-start">
                                {profileImageUrl ? (
                                    <img src={profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <span className="text-gray-400 text-sm">รูปถ่าย</span>
                                )}
                            </div>
                        </div>

                        {/* Work Info Header */}
                        <div className="mt-8 mb-4 border-b border-black">
                            <h3 className="text-lg font-bold pb-1">ภาระงาน</h3>
                        </div>
                        
                         <div className="space-y-2 text-lg">
                             <div className="flex items-baseline">
                                <span className="font-bold shrink-0">ครูที่ปรึกษา:</span>
                                <span className="print-dotted-line">{advisoryClassesText}</span>
                            </div>
                        </div>

                         <div className="mt-16 flex justify-end text-lg">
                            <div className="text-center w-72">
                                <p className="mb-8">ลงชื่อ ........................................................... เจ้าของประวัติ</p>
                                <p className="mb-2">({fullName})</p>
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
                                                target.onerror = null; // prevent looping
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
                                <h3 className="text-3xl font-bold text-navy">{fullName}</h3>
                                <p className="text-xl text-secondary-gray mb-4">{personnel.position}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                    <DetailItem label="วันเดือนปีเกิด" value={personnel.dob} />
                                    <DetailItem label="อายุ" value={`${calculateAge(personnel.dob)} ปี`} />
                                    <DetailItem label="เลขบัตรประชาชน" value={personnel.idCard} />
                                    <DetailItem label="เบอร์โทร" value={personnel.phone} />
                                    <DetailItem label="วันที่บรรจุ" value={personnel.appointmentDate} />
                                    <DetailItem label="เลขตำแหน่ง" value={personnel.positionNumber} />
                                    <DetailItem label="ครูที่ปรึกษา" value={advisoryClassesText} fullWidth />
                                </div>
                            </div>
                        </div>
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
                                    พิมพ์ / บันทึก PDF
                                </button>
                                <button onClick={exportToWord} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    ส่งออก Word (.doc)
                                </button>
                                <button onClick={exportToExcel} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    ส่งออก Excel (.csv)
                                </button>
                                <button onClick={handleExportIDCard} className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-orange-600 flex items-center gap-3 transition-colors border-b border-gray-50">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                                    บัตรประจำตัวบุคลากร
                                </button>
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg">
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewPersonnelModal;
