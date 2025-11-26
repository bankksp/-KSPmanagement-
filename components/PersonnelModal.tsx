
import React, { useState, useEffect, useMemo } from 'react';
import { Personnel, Student } from '../types';
import { getFirstImageSource } from '../utils';

interface PersonnelModalProps {
    onClose: () => void;
    onSave: (personnel: Personnel) => void;
    personnelToEdit: Personnel | null;
    positions: string[];
    students: Student[];
    isSaving: boolean;
    currentUserRole?: string;
    currentUser?: Personnel | null;
}

const initialFormData: Omit<Personnel, 'id'> = {
    personnelTitle: 'นาย',
    personnelTitleOther: '',
    personnelName: '',
    position: '',
    dob: '',
    idCard: '',
    appointmentDate: '',
    positionNumber: '',
    phone: '',
    profileImage: [],
    advisoryClasses: [],
    role: 'user'
};

// Helper function to convert Buddhist date string (DD/MM/BBBB) to ISO string (YYYY-MM-DD)
const buddhistToISO = (buddhistDate: string): string => {
    if (!buddhistDate || typeof buddhistDate !== 'string') return '';
    const parts = buddhistDate.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year) || year < 543) return '';
    const gregorianYear = year - 543;
    return `${gregorianYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

// Helper function to convert ISO string (YYYY-MM-DD) to Buddhist date string (DD/MM/BBBB)
const isoToBuddhist = (isoDate: string): string => {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    const buddhistYear = year + 543;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${buddhistYear}`;
};


// Define props for the new standalone InputField component
interface InputFieldProps {
    name: keyof Omit<Personnel, 'id'>;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    wrapperClass?: string;
    type?: string;
}

// Define the InputField component outside the PersonnelModal component to prevent focus loss on re-renders
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


const PersonnelModal: React.FC<PersonnelModalProps> = ({ onClose, onSave, personnelToEdit, positions, students, isSaving, currentUserRole, currentUser }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

    const isEditing = !!personnelToEdit;
    const personnelTitles = ['นาย', 'นาง', 'นางสาว', 'อื่นๆ'];

    const allClasses = useMemo(() => 
        Array.from(new Set(students.map(s => s.studentClass))).sort()
    , [students]);

    useEffect(() => {
        if (personnelToEdit) {
            setFormData({
                ...personnelToEdit,
                profileImage: personnelToEdit.profileImage || [],
                role: personnelToEdit.role || 'user',
                // Ensure password is preserved even if not shown/edited directly here
                password: personnelToEdit.password 
            });
        } else {
            setFormData({ ...initialFormData, position: positions[0] || '' });
        }
    }, [personnelToEdit, positions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'personnelTitle' && value !== 'อื่นๆ') {
                newState.personnelTitleOther = '';
            }
            return newState;
        });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: isoToBuddhist(value) }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files.length > 0) {
            setFormData(prev => ({ ...prev, [name]: [files[0]] }));
        } else {
            setFormData(prev => ({...prev, [name]: []}));
        }
    };
    
    const handleAdvisoryClassChange = (className: string) => {
        const currentClasses = formData.advisoryClasses || [];
        const newClasses = currentClasses.includes(className)
            ? currentClasses.filter(c => c !== className)
            : [...currentClasses, className];
        setFormData(prev => ({ ...prev, advisoryClasses: newClasses }));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const personnelData: Personnel = {
            ...formData,
            id: isEditing ? personnelToEdit.id : Date.now(),
            // If new user, default password is ID Card (if password field was empty/not shown)
            password: formData.password || formData.idCard,
        };
        onSave(personnelData);
    };

    const profileImageUrl = useMemo(() => {
        return getFirstImageSource(formData.profileImage);
    }, [formData.profileImage]);

    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);
    
    // Use either the prop passed explicitly or derive from currentUser object
    const effectiveRole = currentUserRole || currentUser?.role;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-navy">{isEditing ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มข้อมูลบุคลากร'}</h2>
                </div>
                <form id="personnel-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
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
                                <label htmlFor="profileImage-upload" className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <input id="profileImage-upload" name="profileImage" type="file" onChange={handleImageChange} accept="image/*" className="sr-only" />
                                </label>
                            </div>
                            {effectiveRole === 'admin' && (
                                <div className="mt-4 space-y-3">
                                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                        <label className="block text-sm font-bold text-blue-800 mb-1">สิทธิ์การใช้งาน (Role)</label>
                                        <select 
                                            name="role" 
                                            value={formData.role} 
                                            onChange={handleChange} 
                                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-navy bg-white"
                                        >
                                            <option value="user">User (ทั่วไป)</option>
                                            <option value="pro">Pro (เจ้าหน้าที่)</option>
                                            <option value="admin">Admin KSP (ผู้ดูแลระบบ)</option>
                                        </select>
                                    </div>
                                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                        <label className="block text-sm font-bold text-yellow-800 mb-1">แก้ไขรหัสผ่าน</label>
                                        <input 
                                            type="text" 
                                            name="password" 
                                            value={formData.password || ''} 
                                            onChange={handleChange} 
                                            placeholder="รหัสผ่านใหม่"
                                            className="w-full px-2 py-1 border border-yellow-300 rounded text-sm text-navy bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                                    <select name="personnelTitle" value={formData.personnelTitle} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                                        {personnelTitles.map(title => <option key={title} value={title}>{title}</option>)}
                                    </select>
                                </div>
                                {formData.personnelTitle === 'อื่นๆ' && (
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ระบุคำนำหน้า</label>
                                        <input type="text" name="personnelTitleOther" value={formData.personnelTitleOther || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                                    </div>
                                )}
                                <InputField 
                                    name="personnelName" 
                                    label="ชื่อ-นามสกุล" 
                                    required 
                                    value={String(formData.personnelName || '')} 
                                    onChange={handleChange}
                                    wrapperClass={formData.personnelTitle === 'อื่นๆ' ? 'col-span-1' : 'col-span-2'} 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                                <select name="position" value={formData.position} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันเดือนปีเกิด</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={buddhistToISO(formData.dob)}
                                    onChange={handleDateChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <InputField name="idCard" label="เลขบัตรประชาชน" value={String(formData.idCard || '')} onChange={handleChange}/>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่บรรจุ</label>
                                <input
                                    type="date"
                                    name="appointmentDate"
                                    value={buddhistToISO(formData.appointmentDate)}
                                    onChange={handleDateChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <InputField name="positionNumber" label="เลขตำแหน่ง" value={String(formData.positionNumber || '')} onChange={handleChange}/>
                            <InputField name="phone" label="เบอร์โทร" value={String(formData.phone || '')} onChange={handleChange}/>

                             <div className="relative lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ครูที่ปรึกษาชั้น/ห้อง</label>
                                <button type="button" onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left">
                                    เลือกชั้นเรียน...
                                </button>
                                {isClassDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {allClasses.map(c => (
                                            <div key={c} className="flex items-center p-2 hover:bg-gray-100">
                                                <input
                                                    type="checkbox"
                                                    id={`class-${c}`}
                                                    checked={(formData.advisoryClasses || []).includes(c)}
                                                    onChange={() => handleAdvisoryClassChange(c)}
                                                    className="h-4 w-4 rounded border-gray-300 text-primary-blue focus:ring-primary-blue"
                                                />
                                                <label htmlFor={`class-${c}`} className="ml-2 text-sm text-gray-700">{c}</label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(formData.advisoryClasses || []).map(c => (
                                        <div key={c} className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                                            <span>{c}</span>
                                            <button type="button" onClick={() => handleAdvisoryClassChange(c)} className="ml-2 text-green-600 hover:text-green-800 font-bold">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end items-center space-x-3 bg-light-gray rounded-b-xl">
                    <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        ยกเลิก
                    </button>
                    <button type="submit" form="personnel-form" disabled={isSaving} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonnelModal;
