import React, { useState, useEffect, useMemo } from 'react';
import { Personnel, Student, SpecialRank, Settings, EducationBackground } from '../types';
import { getFirstImageSource, buddhistToISO, isoToBuddhist, safeParseArray } from '../utils';
import AddressSelector from './AddressSelector';
import { EDUCATION_LEVELS } from '../constants';

interface PersonnelModalProps {
    onClose: () => void;
    onSave: (personnel: Personnel) => void;
    personnelToEdit: Personnel | null;
    positions: string[];
    students: Student[];
    isSaving: boolean;
    currentUserRole?: string;
    currentUser?: Personnel | null;
    settings: Settings;
}

const initialFormData: Omit<Personnel, 'id'> = {
    personnelTitle: 'นาย',
    personnelTitleOther: '',
    personnelName: '',
    position: '',
    academicStanding: '',
    educationBackgrounds: [],
    dob: '',
    idCard: '',
    email: '',
    isEmailVerified: false,
    appointmentDate: '',
    positionNumber: '',
    phone: '',
    address: '',
    profileImage: [],
    advisoryClasses: [],
    role: 'user',
    status: 'approved',
    isSarabanAdmin: false,
    specialRank: 'staff',
    highestDecoration: '',
    highestDecorationDate: ''
};

const PersonnelModal: React.FC<PersonnelModalProps> = ({ onClose, onSave, personnelToEdit, positions, students, isSaving, currentUserRole, currentUser, settings }) => {
    const [formData, setFormData] = useState<Partial<Personnel>>(initialFormData as Partial<Personnel>);
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

    const isEditing = !!personnelToEdit;
    const personnelTitles = ['นาย', 'นาง', 'นางสาว', 'อื่นๆ'];
    
    const allClasses = useMemo(() => 
        Array.from(new Set(students.map(s => s.studentClass))).sort()
    , [students]);
    
    const profileImageUrl = useMemo(() => {
        const file = safeParseArray(formData.profileImage)[0];
        if (file instanceof File) return URL.createObjectURL(file);
        return getFirstImageSource(formData.profileImage);
    }, [formData.profileImage]);

    useEffect(() => {
        if (personnelToEdit) {
            setFormData({
                ...personnelToEdit,
                profileImage: personnelToEdit.profileImage || [],
                role: personnelToEdit.role || 'user',
                status: personnelToEdit.status || 'approved',
                password: personnelToEdit.password,
                address: (personnelToEdit as any).address || '',
                isSarabanAdmin: personnelToEdit.isSarabanAdmin || false,
                specialRank: personnelToEdit.specialRank || 'staff',
                advisoryClasses: safeParseArray(personnelToEdit.advisoryClasses),
                educationBackgrounds: safeParseArray(personnelToEdit.educationBackgrounds),
                academicStanding: personnelToEdit.academicStanding || '',
            });
        } else {
            setFormData({ ...initialFormData, position: positions[0] || '' } as Partial<Personnel>);
        }
    }, [personnelToEdit, positions]);
    
    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev: any) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev: any) => {
                const newState = { ...prev, [name]: value };
                if (name === 'personnelTitle' && value !== 'อื่นๆ') {
                    newState.personnelTitleOther = '';
                }
                return newState;
            });
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: isoToBuddhist(value) }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files.length > 0) {
            setFormData((prev: any) => ({ ...prev, [name]: [files[0]] }));
        } else {
            setFormData((prev: any) => ({...prev, [name]: []}));
        }
    };
    
    const handleAdvisoryClassChange = (className: string) => {
        const currentClasses = safeParseArray(formData.advisoryClasses);
        const newClasses = currentClasses.includes(className)
            ? currentClasses.filter((c: string) => c !== className)
            : [...currentClasses, className];
        setFormData((prev: any) => ({ ...prev, advisoryClasses: newClasses }));
    };

    const handleAddressChange = (val: string) => {
        setFormData((prev: any) => ({ ...prev, address: val }));
    };

    const handleEducationChange = (index: number, field: keyof EducationBackground, value: string) => {
        const updated = [...(formData.educationBackgrounds || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(prev => ({ ...prev, educationBackgrounds: updated }));
    };

    const addEducation = () => {
        const newEducation: EducationBackground = { level: EDUCATION_LEVELS[0], faculty: '', major: '' };
        setFormData(prev => ({ ...prev, educationBackgrounds: [...(prev.educationBackgrounds || []), newEducation] }));
    };

    const removeEducation = (index: number) => {
        setFormData(prev => ({ ...prev, educationBackgrounds: (prev.educationBackgrounds || []).filter((_: any, i: number) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.email && !formData.email.includes('@')) {
            alert('กรุณากรอกรูปแบบอีเมลที่ถูกต้อง');
            return;
        }

        const personnelData: Personnel = {
            ...formData as Personnel,
            id: isEditing ? personnelToEdit!.id : Date.now(),
            password: formData.password || formData.idCard,
        };
        onSave(personnelData);
    };
    
    const effectiveRole = currentUserRole || currentUser?.role;
    const currentAdvisoryClasses = safeParseArray(formData.advisoryClasses);
    const educationBackgrounds = safeParseArray(formData.educationBackgrounds);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-navy">{isEditing ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มข้อมูลบุคลากร'}</h2>
                </div>
                <form id="personnel-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Section 1: Personal and Professional Info */}
                    <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-bold text-navy px-2">ข้อมูลส่วนตัวและตำแหน่งงาน</legend>
                        <div className="flex flex-col sm:flex-row gap-6 items-start mt-2">
                            <div className="flex-shrink-0 space-y-4 w-full sm:w-auto">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รูปโปรไฟล์</label>
                                    <div className="mt-1 relative">
                                        <div className="w-32 h-40 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border shadow-sm">
                                            {profileImageUrl ? (
                                                <img src={profileImageUrl} alt="Profile Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <svg className="w-20 h-20 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            )}
                                        </div>
                                        <label htmlFor="personnelProfileImage-upload" className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <input id="personnelProfileImage-upload" name="profileImage" type="file" onChange={handleImageChange} accept="image/*" className="sr-only" />
                                        </label>
                                    </div>
                                </div>
                                
                                {effectiveRole === 'admin' && (
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                            <label className="block text-sm font-bold text-blue-800 mb-1">สิทธิ์การใช้งาน</label>
                                            <select name="role" value={formData.role || 'user'} onChange={handleChange} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                                                <option value="user">User</option>
                                                <option value="pro">Pro</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                                            <label className="block text-sm font-bold text-purple-800 mb-1">ระดับบริหาร (Rank)</label>
                                            <select name="specialRank" value={formData.specialRank || 'staff'} onChange={handleChange} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                                                <option value="staff">Staff (เจ้าหน้าที่)</option>
                                                <option value="head">Head (หัวหน้างาน)</option>
                                                <option value="deputy">Deputy (รองผู้อำนวยการ)</option>
                                                <option value="director">Director (ผู้อำนวยการ)</option>
                                            </select>
                                        </div>
                                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                                            <label className="block text-sm font-bold text-orange-800 mb-1">สถานะผู้ใช้</label>
                                            <select name="status" value={formData.status || 'approved'} onChange={handleChange} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                                                <option value="approved">อนุมัติแล้ว</option>
                                                <option value="pending">รออนุมัติ</option>
                                                <option value="blocked">ระงับ</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center pt-2">
                                            <input type="checkbox" id="isSarabanAdmin" name="isSarabanAdmin" checked={formData.isSarabanAdmin || false} onChange={handleChange} className="h-4 w-4 rounded" />
                                            <label htmlFor="isSarabanAdmin" className="ml-2 text-sm font-medium text-gray-700">เจ้าหน้าที่สารบรรณ</label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า *</label>
                                    <select name="personnelTitle" value={formData.personnelTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required>
                                        {personnelTitles.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                                    <input type="text" name="personnelName" value={formData.personnelName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง *</label>
                                    <select name="position" value={formData.position} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required>
                                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วิทยฐานะ</label>
                                    <select name="academicStanding" value={formData.academicStanding || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="">-- ไม่ระบุ --</option>
                                        {(settings.academicStandings || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ตำแหน่ง</label>
                                    <input type="text" name="positionNumber" value={formData.positionNumber || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่บรรจุแต่งตั้ง</label>
                                    <input type="date" name="appointmentDate" value={buddhistToISO(formData.appointmentDate)} onChange={handleDateChange} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เครื่องราชอิสริยาภรณ์สูงสุด</label>
                                    <input type="text" name="highestDecoration" value={formData.highestDecoration || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="เช่น ท.ช., ป.ม." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ได้รับเครื่องราชฯ</label>
                                    <input type="date" name="highestDecorationDate" value={buddhistToISO(formData.highestDecorationDate)} onChange={handleDateChange} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน *</label>
                                    <input type="text" name="idCard" value={formData.idCard} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันเดือนปีเกิด *</label>
                                    <input type="date" name="dob" value={buddhistToISO(formData.dob)} onChange={handleDateChange} className="w-full px-3 py-2 border rounded-lg" required />
                                </div>
                            </div>
                        </div>
                    </fieldset>
                    
                    {/* Section 2: Education */}
                    <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-bold text-navy px-2">ประวัติการศึกษา</legend>
                        <div className="space-y-3 mt-2">
                            {educationBackgrounds.map((edu: EducationBackground, index: number) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg items-center">
                                    <select value={edu.level} onChange={(e) => handleEducationChange(index, 'level', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                                        {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <input type="text" placeholder="คณะ" value={edu.faculty} onChange={(e) => handleEducationChange(index, 'faculty', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                    <input type="text" placeholder="วิชาเอก" value={edu.major} onChange={(e) => handleEducationChange(index, 'major', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                    <button type="button" onClick={() => removeEducation(index)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">ลบ</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addEducation} className="mt-3 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold">+ เพิ่มวุฒิการศึกษา</button>
                    </fieldset>

                    {/* Section 3: Contact & System */}
                    <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-bold text-navy px-2">ข้อมูลติดต่อและระบบ</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ *</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gmail *</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="example@gmail.com" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                                <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="เว้นว่างเพื่อใช้เลขบัตร ปชช." />
                            </div>
                            <div className="lg:col-span-3">
                                <AddressSelector label="ที่อยู่ปัจจุบัน" value={formData.address || ''} onChange={handleAddressChange} />
                            </div>
                            <div className="relative lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ครูที่ปรึกษา / ประจำชั้น</label>
                                <button type="button" onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} className="w-full px-3 py-2 border rounded-lg bg-white text-left flex justify-between items-center text-sm">
                                    <span className="truncate">{currentAdvisoryClasses.length > 0 ? currentAdvisoryClasses.join(', ') : 'เลือกชั้นเรียน...'}</span>
                                </button>
                                {isClassDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {allClasses.map(cls => (
                                            <div key={cls} className="flex items-center p-2 hover:bg-blue-50 cursor-pointer" onClick={() => handleAdvisoryClassChange(cls)}>
                                                <input type="checkbox" checked={currentAdvisoryClasses.includes(cls)} readOnly className="h-4 w-4 rounded" />
                                                <span className="ml-2 text-sm text-gray-700">{cls}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </fieldset>
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
