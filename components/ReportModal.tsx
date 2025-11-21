
import React, { useState, useEffect } from 'react';
import { Report, Personnel } from '../types';

interface ReportModalProps {
    onClose: () => void;
    onSave: (report: Report) => void;
    reportToEdit?: Report | null;
    academicYears: string[];
    dormitories: string[];
    positions: string[];
    isSaving: boolean;
    personnel: Personnel[];
}

const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const ReportModal: React.FC<ReportModalProps> = ({ 
    onClose, 
    onSave, 
    reportToEdit,
    academicYears,
    dormitories,
    positions,
    isSaving,
    personnel,
 }) => {
    const [formData, setFormData] = useState({
        reporterName: '',
        position: '',
        academicYear: (new Date().getFullYear() + 543).toString(),
        dormitory: '',
        presentCount: 0,
        sickCount: 0,
        log: '',
    });
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const isEditing = !!reportToEdit;

    useEffect(() => {
        if (reportToEdit) {
            setFormData({
                reporterName: reportToEdit.reporterName,
                position: reportToEdit.position,
                academicYear: reportToEdit.academicYear,
                dormitory: reportToEdit.dormitory,
                presentCount: reportToEdit.presentCount,
                sickCount: reportToEdit.sickCount,
                log: reportToEdit.log,
            });
            // Note: Editing existing images from Drive is complex and not handled here.
            // This implementation assumes new images can be added, but doesn't show old ones.
            setImages([]);
        } else {
            const firstPersonnel = personnel[0];
            const defaultReporterName = firstPersonnel 
                ? `${firstPersonnel.personnelTitle === 'อื่นๆ' ? firstPersonnel.personnelTitleOther : firstPersonnel.personnelTitle} ${firstPersonnel.personnelName}` 
                : '';
            const defaultPosition = firstPersonnel ? firstPersonnel.position : '';

            setFormData({
                reporterName: defaultReporterName,
                position: defaultPosition,
                academicYear: (new Date().getFullYear() + 543).toString(),
                dormitory: dormitories.filter(d => d !== 'เรือนพยาบาล')[0] || '',
                presentCount: 0,
                sickCount: 0,
                log: '',
            });
             setImages([]);
        }
    }, [reportToEdit, personnel, dormitories]);
    
    const isInfirmary = formData.dormitory === "เรือนพยาบาล";

    const getBuddhistDate = () => {
        const date = new Date();
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543}`;
    };

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
            const isNowInfirmary = value === 'เรือนพยาบาล';
            setFormData(prev => ({
                ...prev,
                dormitory: value,
                presentCount: isNowInfirmary ? 0 : prev.presentCount,
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: name === 'presentCount' || name === 'sickCount' ? parseInt(value) || 0 : value }));
        }
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
        
        const savedReport: Report = {
           ...formData,
           id: isEditing ? reportToEdit.id : Date.now(), // ID is temporary for client, GSheets will assign its own
           reportDate: isEditing ? reportToEdit.reportDate : getBuddhistDate(),
           reportTime: isEditing ? reportToEdit.reportTime : getCurrentTime(),
           images,
        };
        onSave(savedReport);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-navy">{isEditing ? 'แก้ไขข้อมูลรายงาน' : 'บันทึกข้อมูลรายงาน'}</h2>
                    <p className="text-secondary-gray">
                        วันที่รายงาน: {isEditing ? reportToEdit?.reportDate : getBuddhistDate()} 
                        {isEditing 
                            ? (reportToEdit?.reportTime ? ` เวลา ${reportToEdit.reportTime} น.` : '')
                            : ` เวลา ${getCurrentTime()} น.`}
                    </p>
                </div>
                <form id="report-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้รายงาน (ชื่อ-นามสกุล)</label>
                             <select name="reporterName" value={formData.reporterName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
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
                            <select name="dormitory" value={formData.dormitory} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                {dormitories.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isInfirmary ? (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนนักเรียนป่วย (ในเรือนพยาบาล)</label>
                                <input 
                                    type="number" 
                                    name="sickCount" 
                                    value={formData.sickCount} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                                    required 
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ป่วย</label>
                                    <input 
                                        type="number" 
                                        name="sickCount" 
                                        value={formData.sickCount} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                                        required 
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">บันทึกเหตุการณ์ประจำวัน</label>
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
                <div className="p-6 border-t flex justify-end items-center space-x-3">
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