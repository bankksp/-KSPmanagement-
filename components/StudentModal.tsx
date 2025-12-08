
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Personnel } from '../types';
import { getFirstImageSource, safeParseArray, buddhistToISO, isoToBuddhist } from '../utils';

interface StudentModalProps {
    onClose: () => void;
    onSave: (student: Student) => void;
    studentToEdit: Student | null;
    dormitories: string[];
    studentClasses: string[];
    studentClassrooms: string[];
    personnel: Personnel[];
    isSaving: boolean;
}

const initialFormData: Omit<Student, 'id' | 'studentClass'> = {
    studentTitle: 'เด็กชาย',
    studentName: '', studentNickname: '', dormitory: '', studentIdCard: '',
    studentDob: '', studentAddress: '', studentPhone: '', fatherName: '',
    fatherPhone: '', fatherIdCard: '', fatherAddress: '', motherName: '',
    motherPhone: '', motherIdCard: '', motherAddress: '', guardianName: '',
    guardianPhone: '', guardianIdCard: '', guardianAddress: '',
    homeroomTeachers: [],
    studentProfileImage: [],
    studentIdCardImage: [], studentDisabilityCardImage: [], guardianIdCardImage: []
};

// --- Sub-components defined OUTSIDE to prevent re-mounts and focus loss ---

const FormSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <fieldset className="border p-4 rounded-lg">
        <legend className="text-lg font-bold text-navy px-2">{title}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {children}
        </div>
    </fieldset>
);

interface InputFieldProps {
    name: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    wrapperClass?: string;
    type?: string;
}

const InputField: React.FC<InputFieldProps> = ({ name, label, value, onChange, required = false, wrapperClass = '', type = 'text' }) => (
    <div className={wrapperClass}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input 
            type={type}
            name={name} 
            value={value} 
            onChange={onChange} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
            required={required} 
        />
    </div>
);

interface AddressFieldProps {
    name: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const AddressField: React.FC<AddressFieldProps> = ({ name, label, value, onChange }) => (
    <div className="md:col-span-2 lg:col-span-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea 
            name={name} 
            value={value} 
            onChange={onChange} 
            rows={2} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
        />
    </div>
);

const renderImagePreview = (files: (File | string)[] | undefined) => {
    const safeFiles = safeParseArray(files);
    if (!safeFiles || safeFiles.length === 0) return <p className="text-xs text-gray-500">ยังไม่มีไฟล์</p>;
    return safeFiles.map((file, index) => {
            const fileName = file instanceof File ? file.name : 'ไฟล์ที่มีอยู่แล้ว';
            return <div key={index} className="text-xs text-green-700 truncate">{fileName}</div>
    });
};

interface FileUploadFieldProps {
    name: string;
    label: string;
    files: (File | string)[] | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({ name, label, files, onChange }) => (
    <div className="lg:col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input 
            type="file" 
            name={name} 
            onChange={onChange} 
            accept="image/*,application/pdf" 
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" 
        />
        <div className="mt-1">{renderImagePreview(files)}</div>
    </div>
);

// --- Main Component ---

const StudentModal: React.FC<StudentModalProps> = ({ 
    onClose, onSave, studentToEdit, 
    dormitories, studentClasses, studentClassrooms,
    personnel, isSaving 
}) => {
    const [formData, setFormData] = useState<Omit<Student, 'id' | 'studentClass'>>(initialFormData);
    const [currentClass, setCurrentClass] = useState(studentClasses[0] || '');
    const [currentRoom, setCurrentRoom] = useState(studentClassrooms[0] || '');
    const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
    const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

    const isEditing = !!studentToEdit;
    const studentTitles = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'];
    
    // Ensure custom or existing titles are selectable
    const displayTitles = useMemo(() => {
        if (formData.studentTitle && !studentTitles.includes(formData.studentTitle)) {
            return [...studentTitles, formData.studentTitle];
        }
        return studentTitles;
    }, [formData.studentTitle]);


    useEffect(() => {
        if (studentToEdit) {
            const { studentClass, ...rest } = studentToEdit;
            const [cls, room] = studentClass.split('/');
            setFormData({
                ...rest,
                studentTitle: studentToEdit.studentTitle || 'เด็กชาย',
                studentProfileImage: studentToEdit.studentProfileImage || [],
                studentIdCardImage: studentToEdit.studentIdCardImage || [],
                studentDisabilityCardImage: studentToEdit.studentDisabilityCardImage || [],
                guardianIdCardImage: studentToEdit.guardianIdCardImage || [],
            });
            setCurrentClass(cls || studentClasses[0] || '');
            setCurrentRoom(room || studentClassrooms[0] || '');
        } else {
            const defaultDorm = dormitories.filter(d => d !== 'เรือนพยาบาล')[0] || '';
            setFormData({ ...initialFormData, dormitory: defaultDorm });
            setCurrentClass(studentClasses[0] || '');
            setCurrentRoom(studentClassrooms[0] || '');
        }
    }, [studentToEdit, dormitories, studentClasses, studentClassrooms]);

    // Clear search term when dropdown closes
    useEffect(() => {
        if (!isTeacherDropdownOpen) {
            setTeacherSearchTerm('');
        }
    }, [isTeacherDropdownOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: isoToBuddhist(value) }));
    };
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files) {
            const filesArray = name === 'studentProfileImage' ? (files.length > 0 ? [files[0]] : []) : Array.from(files);
            setFormData(prev => ({ ...prev, [name]: filesArray as File[] }));
        }
    };
    
    const handleHomeroomTeacherChange = (teacherId: number) => {
        const currentTeachers = formData.homeroomTeachers || [];
        const newTeachers = currentTeachers.includes(teacherId)
            ? currentTeachers.filter(id => id !== teacherId)
            : [...currentTeachers, teacherId];
        setFormData(prev => ({ ...prev, homeroomTeachers: newTeachers }));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const studentData: Student = {
            ...(formData as Omit<Student, 'id'>),
            id: isEditing ? studentToEdit.id : Date.now(),
            studentClass: `${currentClass}/${currentRoom}`,
        };
        onSave(studentData);
    };

    const profileImageUrl = useMemo(() => {
        return getFirstImageSource(formData.studentProfileImage);
    }, [formData.studentProfileImage]);
    
    const selectedTeachers = useMemo(() => {
        return (formData.homeroomTeachers || [])
            .map(id => personnel.find(p => p.id === id))
            .filter((p): p is Personnel => !!p);
    }, [formData.homeroomTeachers, personnel]);

    const filteredPersonnel = useMemo(() => {
        if (!teacherSearchTerm) return personnel;
        const term = teacherSearchTerm.toLowerCase();
        return personnel.filter(p => {
            const title = p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle;
            const fullName = `${title} ${p.personnelName}`;
            return fullName.toLowerCase().includes(term);
        });
    }, [personnel, teacherSearchTerm]);


    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-navy">{isEditing ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มข้อมูลนักเรียน'}</h2>
                </div>
                <form id="student-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                     <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-bold text-navy px-2">ข้อมูลนักเรียน</legend>
                        <div className="flex flex-col sm:flex-row gap-6 items-start mt-2">
                            <div className="flex-shrink-0">
                                <label className="block text-sm font-medium text-gray-700 mb-1">รูปโปรไฟล์</label>
                                <div className="mt-1 relative">
                                    <div className="w-32 h-40 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                                        {profileImageUrl ? (
                                            <img src={profileImageUrl} alt="Profile Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <svg className="w-20 h-20 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        )}
                                    </div>
                                    <label htmlFor="studentProfileImage-upload" className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <input id="studentProfileImage-upload" name="studentProfileImage" type="file" onChange={handleImageChange} accept="image/*" className="sr-only" />
                                    </label>
                                </div>
                            </div>
                            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                                        <select name="studentTitle" value={formData.studentTitle} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                                            {displayTitles.map(title => <option key={title} value={title}>{title}</option>)}
                                        </select>
                                    </div>
                                    <InputField 
                                        name="studentName" 
                                        label="ชื่อ-นามสกุล" 
                                        value={String(formData.studentName || '')} 
                                        onChange={handleChange} 
                                        required 
                                        wrapperClass="col-span-2"
                                    />
                                </div>
                                <InputField 
                                    name="studentNickname" 
                                    label="ชื่อเล่น" 
                                    value={String(formData.studentNickname || '')} 
                                    onChange={handleChange} 
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชั้น</label>
                                    <select value={currentClass} onChange={(e) => setCurrentClass(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        {studentClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ห้อง</label>
                                    <select value={currentRoom} onChange={(e) => setCurrentRoom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        {studentClassrooms.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เรือนนอน</label>
                                    <select name="dormitory" value={formData.dormitory} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                                        <option value="" disabled>-- เลือกเรือนนอน --</option>
                                        {dormitories.filter(d => d !== 'เรือนพยาบาล').map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <InputField 
                                    name="studentIdCard" 
                                    label="เลขบัตรประชาชน" 
                                    value={String(formData.studentIdCard || '')} 
                                    onChange={handleChange} 
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
                                    <input
                                        type="date"
                                        name="studentDob"
                                        value={buddhistToISO(String(formData.studentDob || ''))}
                                        onChange={handleDateChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <InputField 
                                    name="studentPhone" 
                                    label="เบอร์โทร" 
                                    value={String(formData.studentPhone || '')} 
                                    onChange={handleChange} 
                                />
                                <div className="relative lg:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ครูประจำชั้น</label>
                                    <button type="button" onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center">
                                        <span className="truncate text-gray-700">
                                            {selectedTeachers.length > 0 
                                                ? `เลือกแล้ว ${selectedTeachers.length} ท่าน` 
                                                : 'เลือกครู...'}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>
                                    {isTeacherDropdownOpen && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                                            <div className="p-2 bg-gray-50 border-b">
                                                <input 
                                                    type="text" 
                                                    placeholder="ค้นหาชื่อครู..." 
                                                    value={teacherSearchTerm}
                                                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="overflow-y-auto flex-grow">
                                                {filteredPersonnel.length > 0 ? filteredPersonnel.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 border-gray-100"
                                                        onClick={() => handleHomeroomTeacherChange(p.id)}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            id={`teacher-${p.id}`}
                                                            checked={(formData.homeroomTeachers || []).includes(p.id)}
                                                            onChange={() => {}} 
                                                            className="h-4 w-4 rounded border-gray-300 text-primary-blue focus:ring-primary-blue pointer-events-none"
                                                        />
                                                        <label htmlFor={`teacher-${p.id}`} className="ml-2 text-sm text-gray-700 pointer-events-none select-none">
                                                            {`${p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle} ${p.personnelName}`}
                                                        </label>
                                                    </div>
                                                )) : (
                                                    <div className="p-4 text-center text-gray-500 text-sm">ไม่พบรายชื่อ</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedTeachers.map(p => (
                                            <div key={p.id} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                                                <span>{`${p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle} ${p.personnelName}`}</span>
                                                <button type="button" onClick={() => handleHomeroomTeacherChange(p.id)} className="ml-2 text-blue-600 hover:text-blue-800 font-bold">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <AddressField 
                                    name="studentAddress" 
                                    label="ที่อยู่" 
                                    value={String(formData.studentAddress || '')} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>
                    </fieldset>

                    <FormSection title="ข้อมูลบิดา">
                        <InputField name="fatherName" label="ชื่อ-นามสกุลบิดา" value={String(formData.fatherName || '')} onChange={handleChange} />
                        <InputField name="fatherIdCard" label="เลขบัตรประชาชนบิดา" value={String(formData.fatherIdCard || '')} onChange={handleChange} />
                        <InputField name="fatherPhone" label="เบอร์โทรบิดา" value={String(formData.fatherPhone || '')} onChange={handleChange} />
                        <AddressField name="fatherAddress" label="ที่อยู่บิดา" value={String(formData.fatherAddress || '')} onChange={handleChange} />
                    </FormSection>
                    
                    <FormSection title="ข้อมูลมารดา">
                        <InputField name="motherName" label="ชื่อ-นามสกุลมารดา" value={String(formData.motherName || '')} onChange={handleChange} />
                        <InputField name="motherIdCard" label="เลขบัตรประชาชนมารดา" value={String(formData.motherIdCard || '')} onChange={handleChange} />
                        <InputField name="motherPhone" label="เบอร์โทรมารดา" value={String(formData.motherPhone || '')} onChange={handleChange} />
                        <AddressField name="motherAddress" label="ที่อยู่มารดา" value={String(formData.motherAddress || '')} onChange={handleChange} />
                    </FormSection>

                    <FormSection title="ข้อมูลผู้ปกครอง">
                        <InputField name="guardianName" label="ชื่อ-นามสกุลผู้ปกครอง" value={String(formData.guardianName || '')} onChange={handleChange} />
                        <InputField name="guardianIdCard" label="เลขบัตรประชาชนผู้ปกครอง" value={String(formData.guardianIdCard || '')} onChange={handleChange} />
                        <InputField name="guardianPhone" label="เบอร์โทรผู้ปกครอง" value={String(formData.guardianPhone || '')} onChange={handleChange} />
                        <AddressField name="guardianAddress" label="ที่อยู่ผู้ปกครอง" value={String(formData.guardianAddress || '')} onChange={handleChange} />
                    </FormSection>

                    <FormSection title="เอกสาร">
                       <FileUploadField name="studentIdCardImage" label="บัตรประชาชนนักเรียน" files={formData.studentIdCardImage} onChange={handleImageChange} />
                       <FileUploadField name="studentDisabilityCardImage" label="บัตรคนพิการ" files={formData.studentDisabilityCardImage} onChange={handleImageChange} />
                       <FileUploadField name="guardianIdCardImage" label="บัตรประชาชนผู้ปกครอง" files={formData.guardianIdCardImage} onChange={handleImageChange} />
                    </FormSection>

                </form>
                <div className="p-6 border-t flex justify-end items-center space-x-3 bg-light-gray rounded-b-xl">
                    <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        ยกเลิก
                    </button>
                    <button type="submit" form="student-form" disabled={isSaving} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentModal;
