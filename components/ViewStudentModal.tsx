import React, { useMemo, useEffect } from 'react';
import { Student, Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc, safeParseArray } from '../utils';

interface ViewStudentModalProps {
    student: Student;
    onClose: () => void;
    personnel: Personnel[];
}

const ViewStudentModal: React.FC<ViewStudentModalProps> = ({ student, onClose, personnel }) => {

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
        window.print();
    };

    const handleExportCSV = () => {
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
         const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
        const postHtml = "</body></html>";
        
        // Using Table layout for Word to enforce the "Image Right" design
        const content = `
            <div style="font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; padding: 20px; line-height: 1.2;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 24pt; font-weight: bold;">โรงเรียนกาฬสินธุ์ปัญญานุกูล</h1>
                    <h2 style="margin: 0; font-size: 20pt; font-weight: bold;">ระเบียนประวัตินักเรียน</h2>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; border: none;">
                    <tr style="vertical-align: top;">
                        <td>
                            <table style="width: 100%; font-size: 16pt;">
                                <tr>
                                    <td style="font-weight: bold; width: 120px;">ชื่อ-นามสกุล:</td>
                                    <td style="border-bottom: 1px dotted #000;">${student.studentTitle} ${student.studentName}</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold;">ชื่อเล่น:</td>
                                    <td style="border-bottom: 1px dotted #000;">${student.studentNickname || '-'}</td>
                                </tr>
                                 <tr>
                                    <td style="font-weight: bold;">ชั้นเรียน:</td>
                                    <td style="border-bottom: 1px dotted #000;">${student.studentClass}</td>
                                </tr>
                                 <tr>
                                    <td style="font-weight: bold;">เรือนนอน:</td>
                                    <td style="border-bottom: 1px dotted #000;">${student.dormitory}</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold;">รหัสประจำตัว:</td>
                                    <td style="border-bottom: 1px dotted #000;">${student.studentIdCard}</td>
                                </tr>
                            </table>
                        </td>
                        <td style="width: 160px; text-align: right; vertical-align: top; padding-left: 20px;">
                             <!-- Image Placeholder for Word -->
                             <div style="width: 1.5in; height: 2in; border: 1px solid #000; display: flex; align-items: center; justify-content: center; text-align: center;">
                                ${profileImageUrl ? `<img src="${profileImageUrl}" width="144" height="192" style="object-fit: cover;" />` : 'รูปถ่าย'}
                             </div>
                        </td>
                    </tr>
                </table>

                <br/>

                <table style="width: 100%; font-size: 16pt; border-collapse: collapse;">
                    <tr>
                         <td style="font-weight: bold; width: 120px;">วันเกิด:</td>
                         <td style="border-bottom: 1px dotted #000;">${student.studentDob}</td>
                         <td style="font-weight: bold; width: 100px; padding-left: 20px;">เบอร์โทร:</td>
                         <td style="border-bottom: 1px dotted #000;">${student.studentPhone || '-'}</td>
                    </tr>
                </table>
                
                <div style="margin-top: 10px; font-size: 16pt;">
                    <span style="font-weight: bold;">ที่อยู่: </span>
                    <span style="border-bottom: 1px dotted #000; display: inline-block; width: 85%;">${student.studentAddress || '-'}</span>
                </div>

                <div style="margin-top: 10px; font-size: 16pt;">
                    <span style="font-weight: bold;">ครูประจำชั้น: </span>
                    <span style="border-bottom: 1px dotted #000; display: inline-block; width: 80%;">${homeroomTeacherNames || '-'}</span>
                </div>

                <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 30px; font-size: 18pt; font-weight: bold;">ข้อมูลครอบครัว</h3>
                
                <table style="width: 100%; font-size: 16pt; border-collapse: collapse;">
                    <tr>
                        <td style="font-weight: bold; width: 150px; padding-top: 10px;">บิดา:</td>
                        <td style="border-bottom: 1px dotted #000; padding-top: 10px;">${student.fatherName || '-'}</td>
                         <td style="font-weight: bold; width: 80px; padding-top: 10px; padding-left: 10px;">โทร:</td>
                        <td style="border-bottom: 1px dotted #000; padding-top: 10px;">${student.fatherPhone || '-'}</td>
                    </tr>
                     <tr>
                        <td style="font-weight: bold; padding-top: 10px;">มารดา:</td>
                        <td style="border-bottom: 1px dotted #000; padding-top: 10px;">${student.motherName || '-'}</td>
                        <td style="font-weight: bold; padding-top: 10px; padding-left: 10px;">โทร:</td>
                        <td style="border-bottom: 1px dotted #000; padding-top: 10px;">${student.motherPhone || '-'}</td>
                    </tr>
                     <tr>
                        <td style="font-weight: bold; padding-top: 10px;">ผู้ปกครอง:</td>
                        <td style="border-bottom: 1px dotted #000; padding-top: 10px;">${student.guardianName || '-'}</td>
                        <td style="font-weight: bold; padding-top: 10px; padding-left: 10px;">โทร:</td>
                        <td style="border-bottom: 1px dotted #000; padding-top: 10px;">${student.guardianPhone || '-'}</td>
                    </tr>
                </table>
                <br/>
                <div style="text-align: right; margin-top: 50px; font-size: 16pt;">
                     <p>ลงชื่อ ........................................................... ผู้บันทึก</p>
                     <p>(...........................................................)</p>
                     <p>วันที่ ........./........./.............</p>
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
                            <h1 className="text-4xl font-bold">โรงเรียนกาฬสินธุ์ปัญญานุกูล</h1>
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

                 <div className="p-4 border-t bg-light-gray rounded-b-xl flex flex-col sm:flex-row justify-between gap-2 print:hidden">
                     <div className="flex gap-2">
                        <button onClick={handlePrint} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-1">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                             พิมพ์ / PDF
                        </button>
                        <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                             Excel (CSV)
                        </button>
                        <button onClick={handleExportWord} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                             Word (DOC)
                        </button>
                    </div>
                    <button type="button" onClick={onClose} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg">
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewStudentModal;