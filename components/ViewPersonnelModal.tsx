import React, { useMemo, useEffect } from 'react';
import { Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc } from '../utils';

interface ViewPersonnelModalProps {
    personnel: Personnel;
    onClose: () => void;
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

const ViewPersonnelModal: React.FC<ViewPersonnelModalProps> = ({ personnel, onClose }) => {

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
        window.print();
    };

    const handleExportCSV = () => {
        const headers = ['คำนำหน้า', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'เลขตำแหน่ง', 'วันเกิด', 'เลขบัตรประชาชน', 'เบอร์โทร', 'วันที่บรรจุ'];
        const title = personnel.personnelTitle === 'อื่นๆ' ? personnel.personnelTitleOther : personnel.personnelTitle;
        const row = [
            title,
            personnel.personnelName,
            personnel.position,
            personnel.positionNumber,
            personnel.dob,
            `"${personnel.idCard}"`,
            `"${personnel.phone}"`,
            personnel.appointmentDate
        ];
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + "\uFEFF" // BOM
            + headers.join(",") + "\n" 
            + row.join(",");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `personnel_${personnel.personnelName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportWord = () => {
         const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
        const postHtml = "</body></html>";
        
        const content = `
            <div style="font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; padding: 20px; line-height: 1.2;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 24pt; font-weight: bold;">โรงเรียนกาฬสินธุ์ปัญญานุกูล</h1>
                    <h2 style="margin: 0; font-size: 20pt; font-weight: bold;">ประวัติบุคลากร</h2>
                </div>

                <table style="width: 100%; border-collapse: collapse; border: none;">
                    <tr style="vertical-align: top;">
                        <td>
                            <table style="width: 100%; font-size: 16pt;">
                                <tr>
                                    <td style="font-weight: bold; width: 120px;">ชื่อ-นามสกุล:</td>
                                    <td style="border-bottom: 1px dotted #000;">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold;">ตำแหน่ง:</td>
                                    <td style="border-bottom: 1px dotted #000;">${personnel.position}</td>
                                </tr>
                                 <tr>
                                    <td style="font-weight: bold;">เลขตำแหน่ง:</td>
                                    <td style="border-bottom: 1px dotted #000;">${personnel.positionNumber || '-'}</td>
                                </tr>
                                 <tr>
                                    <td style="font-weight: bold;">วันเกิด:</td>
                                    <td style="border-bottom: 1px dotted #000;">${personnel.dob}</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold;">เลขบัตรประชาชน:</td>
                                    <td style="border-bottom: 1px dotted #000;">${personnel.idCard}</td>
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
                         <td style="font-weight: bold; width: 120px;">วันที่บรรจุ:</td>
                         <td style="border-bottom: 1px dotted #000;">${personnel.appointmentDate}</td>
                         <td style="font-weight: bold; width: 100px; padding-left: 20px;">เบอร์โทร:</td>
                         <td style="border-bottom: 1px dotted #000;">${personnel.phone || '-'}</td>
                    </tr>
                </table>

                <div style="margin-top: 10px; font-size: 16pt;">
                    <span style="font-weight: bold;">ครูที่ปรึกษา: </span>
                    <span style="border-bottom: 1px dotted #000; display: inline-block; width: 80%;">${advisoryClassesText}</span>
                </div>

                <br/><br/>
                <div style="text-align: right; margin-top: 50px; font-size: 16pt;">
                     <p>ลงชื่อ ........................................................... เจ้าของประวัติ</p>
                     <p>(${fullName})</p>
                     <p>วันที่ ........./........./.............</p>
                </div>
            </div>
        `;

        const html = preHtml + content + postHtml;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const link = document.createElement("a");
        link.href = url;
        link.download = `profile_${personnel.personnelName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4" onClick={onClose}>
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
                    
                    {/* ---------------- PRINT LAYOUT (Application Form Style - TH Sarabun) ---------------- */}
                    <div id="print-section" className="hidden print:block font-sarabun text-black leading-tight">
                        <div className="text-center mb-6">
                            <h1 className="text-4xl font-bold">โรงเรียนกาฬสินธุ์ปัญญานุกูล</h1>
                            <h2 className="text-2xl font-bold mt-2">ประวัติบุคลากร</h2>
                        </div>

                        <div className="flex justify-between items-start gap-8">
                            {/* Left Data Column */}
                            <div className="flex-grow space-y-2 text-xl">
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">ชื่อ-นามสกุล:</div>
                                    <div className="col-span-9 border-b border-dotted border-black pb-1">{fullName}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">ตำแหน่ง:</div>
                                    <div className="col-span-9 border-b border-dotted border-black pb-1">{personnel.position}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">เลขตำแหน่ง:</div>
                                    <div className="col-span-9 border-b border-dotted border-black pb-1">{personnel.positionNumber || '-'}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">วันเกิด:</div>
                                    <div className="col-span-4 border-b border-dotted border-black pb-1">{personnel.dob}</div>
                                    <div className="col-span-2 font-bold text-right">อายุ:</div>
                                    <div className="col-span-3 border-b border-dotted border-black pb-1">{calculateAge(personnel.dob)} ปี</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">เลขบัตรประชาชน:</div>
                                    <div className="col-span-9 border-b border-dotted border-black pb-1">{personnel.idCard}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">วันที่บรรจุ:</div>
                                    <div className="col-span-9 border-b border-dotted border-black pb-1">{personnel.appointmentDate}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">เบอร์โทร:</div>
                                    <div className="col-span-9 border-b border-dotted border-black pb-1">{personnel.phone}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3 font-bold">ครูที่ปรึกษา:</div>
                                    <div className="col-span-9 border-b border-dotted border-black pb-1">{advisoryClassesText}</div>
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

                         {/* Signature Section */}
                         <div className="mt-16 flex justify-end text-xl">
                            <div className="text-center w-64">
                                <div className="border-b border-dotted border-black mb-2"></div>
                                <p>ลงชื่อเจ้าของประวัติ</p>
                                <p className="mt-6">({fullName})</p>
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

export default ViewPersonnelModal;