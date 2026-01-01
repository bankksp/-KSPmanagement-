
import React, { useState, useEffect, useMemo } from 'react';
import { Report, Personnel, Student } from '../types';
import { buddhistToISO, isoToBuddhist, getCurrentThaiDate } from '../utils';

interface ReportModalProps {
    onClose: () => void;
    onSave: (report: Report) => void;
    reportToEdit?: Report | null;
    academicYears: string[];
    dormitories: string[];
    positions: string[];
    isSaving: boolean;
    personnel: Personnel[];
    currentUser: Personnel | null;
    students: Student[];
}

const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

type StudentStatus = 'present' | 'sick' | 'home' | 'recovered';

const ReportModal: React.FC<ReportModalProps> = ({ 
    onClose, 
    onSave, 
    reportToEdit,
    academicYears,
    dormitories,
    positions,
    isSaving,
    personnel,
    currentUser,
    students
 }) => {
    const [formData, setFormData] = useState<{
        id?: number;
        reportDate: string;
        reportTime: string;
        reporterName: string;
        position: string;
        academicYear: string;
        dormitory: string;
        presentCount: number | string; 
        sickCount: number | string;
        homeCount: number | string;
        log: string;
    }>({
        reportDate: getCurrentThaiDate(),
        reportTime: getCurrentTime(),
        reporterName: '',
        position: '',
        academicYear: (new Date().getFullYear() + 543).toString(),
        dormitory: '',
        presentCount: '', 
        sickCount: '',  
        homeCount: '',
        log: '',
    });
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    
    // New states for student selection
    const [studentStatuses, setStudentStatuses] = useState<Record<number, StudentStatus>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const isEditing = !!reportToEdit;
    const isInfirmary = formData.dormitory === "เรือนพยาบาล";

    useEffect(() => {
        if (reportToEdit) {
            setFormData({
                id: reportToEdit.id,
                reportDate: reportToEdit.reportDate,
                reportTime: reportToEdit.reportTime || getCurrentTime(),
                reporterName: reportToEdit.reporterName,
                position: reportToEdit.position,
                academicYear: reportToEdit.academicYear,
                dormitory: reportToEdit.dormitory,
                presentCount: reportToEdit.presentCount,
                sickCount: reportToEdit.sickCount,
                homeCount: reportToEdit.homeCount || 0,
                log: reportToEdit.log,
            });
            setImages([]);
            
            // Try to restore student selections if available in studentDetails
            if (reportToEdit.studentDetails) {
                try {
                    let details: any = reportToEdit.studentDetails;
                    if (typeof details === 'string') {
                        details = JSON.parse(details);
                    }
                    if (Array.isArray(details)) {
                         const statusMap: Record<number, StudentStatus> = {};
                         details.forEach((d: any) => {
                            if (d.id && d.status) statusMap[d.id] = d.status;
                        });
                        setStudentStatuses(statusMap);
                    }
                } catch (e) {
                    console.error("Failed to parse student details", e);
                }
            }
        } else {
            // Default initialization for new report
            let defaultReporterName = '';
            let defaultPosition = '';

            if (currentUser) {
                const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
                defaultReporterName = `${title} ${currentUser.personnelName}`.trim();
                defaultPosition = currentUser.position;
            } else {
                const firstPersonnel = personnel[0];
                 defaultReporterName = firstPersonnel 
                    ? `${firstPersonnel.personnelTitle === 'อื่นๆ' ? firstPersonnel.personnelTitleOther : firstPersonnel.personnelTitle} ${firstPersonnel.personnelName}` 
                    : '';
                defaultPosition = firstPersonnel ? firstPersonnel.position : '';
            }

            const defaultDorm = dormitories.filter(d => d !== 'เรือนพยาบาล')[0] || '';

            setFormData({
                reportDate: getCurrentThaiDate(),
                reportTime: getCurrentTime(),
                reporterName: defaultReporterName,
                position: defaultPosition,
                academicYear: (new Date().getFullYear() + 543).toString(),
                dormitory: defaultDorm,
                presentCount: 0,
                sickCount: 0,
                homeCount: 0,
                log: '',
            });
             setImages([]);
        }
    }, [reportToEdit, personnel, dormitories, currentUser]);

    // Filter students based on dormitory selection (or search for Infirmary)
    const relevantStudents = useMemo(() => {
        if (!formData.dormitory) return [];

        if (isInfirmary) {
            if (!searchTerm) return students;
            const lowerSearch = searchTerm.toLowerCase();
            return students.filter(s => 
                (s.studentName?.toLowerCase().includes(lowerSearch)) ||
                (s.studentNickname?.toLowerCase().includes(lowerSearch)) ||
                (s.studentClass?.toLowerCase().includes(lowerSearch))
            );
        } else {
            return students.filter(s => s.dormitory === formData.dormitory);
        }
    }, [students, formData.dormitory, isInfirmary, searchTerm]);
    
    useEffect(() => {
        let pCount = 0;
        let sCount = 0;
        let hCount = 0;
        const sickNames: string[] = [];
        const recoveredNames: string[] = [];
        const homeNames: string[] = [];

        relevantStudents.forEach(student => {
            const status = studentStatuses[student.id] || (isInfirmary ? undefined : 'home');
            
            if (status === 'present') pCount++;
            if (status === 'sick') {
                sCount++;
                sickNames.push(`${student.studentTitle}${student.studentName}`);
            }
            if (status === 'recovered') recoveredNames.push(`${student.studentTitle}${student.studentName}`);
            if (status === 'home') {
                hCount++;
                homeNames.push(`${student.studentTitle}${student.studentName}`);
            }
        });

        setFormData(prev => ({
            ...prev,
            presentCount: pCount,
            sickCount: sCount,
            homeCount: hCount
        }));

        let logText = '';
        if (isInfirmary) {
             if (sickNames.length > 0) logText += `ป่วย: ${sickNames.join(', ')}\n`;
             if (recoveredNames.length > 0) logText += `หายป่วย: ${recoveredNames.join(', ')}`;
        } else {
             if (sickNames.length > 0) logText += `ป่วย: ${sickNames.join(', ')}\n`;
             if (homeNames.length > 0) logText += `อยู่บ้าน: ${homeNames.join(', ')}`;
        }
        
        setFormData(prev => ({ ...prev, log: logText.trim() }));

    }, [studentStatuses, relevantStudents, isInfirmary]);

    useEffect(() => {
        const newImageUrls = images.map(file => URL.createObjectURL(file));
        setImagePreviews(newImageUrls);
        return () => newImageUrls.forEach(url => URL.revokeObjectURL(url));
    }, [images]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === 'reporterName') {
            const selectedPerson = personnel.find(p => {
                const fullName = `${p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle} ${p.personnelName}`;
                return fullName === value;
            });
            setFormData(prev => ({ 
                ...prev, 
                reporterName: value,
                position: selectedPerson ? selectedPerson.position : '' 
            }));
        } else if (name === 'dormitory') {
            setFormData(prev => ({
                ...prev,
                dormitory: value,
                presentCount: 0,
                sickCount: 0,
                homeCount: 0,
                log: ''
            }));
            setStudentStatuses({}); 
            setSearchTerm('');
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, reportDate: isoToBuddhist(e.target.value) }));
    };

    const handleStatusChange = (studentId: number, status: StudentStatus) => {
        setStudentStatuses(prev => {
            return { ...prev, [studentId]: status };
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            if (images.length + filesArray.length > 10) {
                alert('คุณสามารถอัปโหลดได้ไม่เกิน 10 รูป');
                return;
            }
            setImages(prev => [...prev, ...filesArray]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const studentDetailsArray = relevantStudents.map(student => ({
            id: student.id,
            name: `${student.studentTitle}${student.studentName}`,
            nickname: student.studentNickname || '',
            status: studentStatuses[student.id] || (isInfirmary ? 'unknown' : 'home')
        })).filter(item => item.status !== 'unknown');
        
        const savedReport: Report = {
           ...formData,
           presentCount: Number(formData.presentCount),
           sickCount: Number(formData.sickCount),
           homeCount: Number(formData.homeCount),
           id: isEditing && reportToEdit ? reportToEdit.id : Date.now(),
           studentDetails: JSON.stringify(studentDetailsArray), 
           images,
        };
        onSave(savedReport);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
                <div className="p-6 border-b flex-shrink-0">
                    <h2 className="text-2xl font-bold text-navy">{isEditing ? 'แก้ไขข้อมูลรายงาน' : 'บันทึกข้อมูลรายงาน'}</h2>
                </div>
                <form id="report-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รายงาน</label>
                            <input 
                                type="date"
                                name="reportDate"
                                value={buddhistToISO(formData.reportDate)}
                                onChange={handleDateChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลา</label>
                            <input 
                                type="time"
                                name="reportTime"
                                value={formData.reportTime}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้รายงาน (ชื่อ-นามสกุล)</label>
                             <select 
                                name="reporterName" 
                                value={formData.reporterName} 
                                onChange={handleChange} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                                required
                            >
                                <option value="" disabled>-- เลือกผู้รายงาน --</option>
                                {personnel.map(p => {
                                    const fullName = `${p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle} ${p.personnelName}`;
                                    return <option key={p.id} value={fullName}>{fullName}</option>;
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                            <input 
                                type="text"
                                name="position"
                                value={formData.position}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา</label>
                            <select name="academicYear" value={formData.academicYear} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เรือนนอน</label>
                            <select name="dormitory" value={formData.dormitory} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                                <option value="" disabled>-- เลือกเรือนนอน --</option>
                                {dormitories.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {/* Student Selection Section */}
                    {formData.dormitory && (
                        <div className="border rounded-lg p-4 bg-gray-50 mt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold text-navy">
                                    {isInfirmary ? 'รายชื่อนักเรียน (ค้นหา)' : `รายชื่อนักเรียนเรือน${formData.dormitory}`}
                                </h3>
                                {isInfirmary && (
                                    <input 
                                        type="text" 
                                        placeholder="ค้นหาชื่อ..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:outline-none"
                                    />
                                )}
                            </div>
                            
                            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-2 text-left text-navy font-semibold border-b">ชื่อ-สกุล</th>
                                            <th className="p-2 text-left text-navy font-semibold border-b w-24">ชื่อเล่น</th>
                                            <th className="p-2 text-center text-navy font-semibold border-b">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {relevantStudents.length > 0 ? relevantStudents.map(student => {
                                            const status = studentStatuses[student.id];
                                            return (
                                                <tr key={student.id} className="hover:bg-blue-50 transition-colors">
                                                    <td className="p-2">{student.studentTitle}{student.studentName}</td>
                                                    <td className="p-2 text-gray-500">{student.studentNickname}</td>
                                                    <td className="p-2">
                                                        <div className="flex justify-center gap-2">
                                                            {isInfirmary ? (
                                                                <>
                                                                    <label className={`cursor-pointer px-3 py-1 rounded border text-xs font-bold transition-all ${status === 'sick' ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-600 hover:bg-red-50'}`}>
                                                                        <input type="radio" name={`status_${student.id}`} className="hidden" checked={status === 'sick'} onChange={() => handleStatusChange(student.id, 'sick')} />
                                                                        ป่วย
                                                                    </label>
                                                                    <label className={`cursor-pointer px-3 py-1 rounded border text-xs font-bold transition-all ${status === 'recovered' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-600 hover:bg-green-50'}`}>
                                                                        <input type="radio" name={`status_${student.id}`} className="hidden" checked={status === 'recovered'} onChange={() => handleStatusChange(student.id, 'recovered')} />
                                                                        หายป่วย
                                                                    </label>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <label className={`cursor-pointer px-3 py-1 rounded border text-xs font-bold transition-all ${status === 'present' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-600 hover:bg-green-50'}`}>
                                                                        <input type="radio" name={`status_${student.id}`} className="hidden" checked={status === 'present'} onChange={() => handleStatusChange(student.id, 'present')} />
                                                                        มา
                                                                    </label>
                                                                    <label className={`cursor-pointer px-3 py-1 rounded border text-xs font-bold transition-all ${status === 'sick' ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-600 hover:bg-red-50'}`}>
                                                                        <input type="radio" name={`status_${student.id}`} className="hidden" checked={status === 'sick'} onChange={() => handleStatusChange(student.id, 'sick')} />
                                                                        ป่วย
                                                                    </label>
                                                                    <label className={`cursor-pointer px-3 py-1 rounded border text-xs font-bold transition-all ${(!status || status === 'home') ? 'bg-gray-500 text-white border-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                                                                        <input type="radio" name={`status_${student.id}`} className="hidden" checked={!status || status === 'home'} onChange={() => handleStatusChange(student.id, 'home')} />
                                                                        อยู่บ้าน
                                                                    </label>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-400">ไม่พบข้อมูลนักเรียน</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">* ระบบจะคำนวณยอดและบันทึกรายชื่อให้อัตโนมัติ</p>
                        </div>
                    )}

                    {/* Counts Display (Read-Only auto-calc) */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {isInfirmary ? (
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนนักเรียนป่วย (ในเรือนพยาบาล)</label>
                                <input 
                                    type="number" 
                                    name="sickCount" 
                                    value={formData.sickCount} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" 
                                    required 
                                    readOnly
                                />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนมาเรียน</label>
                                    <input 
                                        type="number" 
                                        name="presentCount" 
                                        value={formData.presentCount} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" 
                                        required 
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ป่วย</label>
                                    <input 
                                        type="number" 
                                        name="sickCount" 
                                        value={formData.sickCount} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" 
                                        required 
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">อยู่บ้าน</label>
                                    <input 
                                        type="number" 
                                        name="homeCount" 
                                        value={formData.homeCount} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" 
                                        required 
                                        readOnly
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">บันทึกเหตุการณ์ประจำวัน (รายชื่อผู้ป่วย/ขาด)</label>
                        <textarea name="log" value={formData.log} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">อัปโหลดภาพ (ไม่เกิน 10 รูป)</label>
                        <input type="file" onChange={handleImageChange} multiple accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                    </div>
                    {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                    <img src={preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-lg"/>
                                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                </form>
                <div className="p-6 border-t flex justify-end items-center space-x-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        ยกเลิก
                    </button>
                    <button type="submit" form="report-form" disabled={isSaving} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลรายงาน')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
