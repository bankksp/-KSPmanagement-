
import React, { useState } from 'react';
import { Personnel } from '../types';
import { postToGoogleScript, prepareDataForApi } from '../utils';

interface RegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRegister: (personnel: Personnel) => void;
    positions: string[];
    isSaving: boolean;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onRegister, positions, isSaving }) => {
    const [formData, setFormData] = useState<Partial<Personnel>>({
        personnelTitle: 'นาย',
        personnelName: '',
        idCard: '',
        email: '',
        phone: '',
        position: positions[0] || '',
        role: 'user',
    });

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Validation for Gmail and ID Card
    const isFormValid = () => {
        const isEmailValid = formData.email?.toLowerCase().endsWith('@gmail.com');
        const isIdValid = formData.idCard?.length === 13;
        const isNameValid = (formData.personnelName || '').trim().length > 0;
        const isPhoneValid = (formData.phone || '').trim().length >= 9;
        
        return isEmailValid && isIdValid && isNameValid && isPhoneValid;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.email?.toLowerCase().endsWith('@gmail.com')) {
            alert('กรุณากรอก Gmail ที่ถูกต้อง (@gmail.com เท่านั้น)');
            return;
        }

        if (formData.idCard?.length !== 13) {
            alert('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก');
            return;
        }

        const newPersonnel: Personnel = {
            ...formData as Personnel,
            id: Date.now(),
            dob: '', 
            appointmentDate: '', 
            positionNumber: '', 
            password: formData.idCard, 
            profileImage: [],
            role: 'user',
            status: 'pending',
            authProvider: 'manual',
            isEmailVerified: true // Set to true as we bypass OTP
        };

        onRegister(newPersonnel);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100] p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-white">
                <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-navy">ลงทะเบียนบุคลากร</h3>
                        <p className="text-sm text-gray-400 mt-1">กรอกข้อมูลให้ครบถ้วนเพื่อขอสิทธิ์เข้าใช้งานระบบ</p>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors text-3xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                    {/* Basic Info Group */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขบัตรประชาชน (ใช้เป็นรหัสผ่านเริ่มต้น)</label>
                            <input 
                                type="text" 
                                name="idCard" 
                                value={formData.idCard} 
                                onChange={(e) => setFormData({...formData, idCard: e.target.value.replace(/[^0-9]/g, '')})} 
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all font-mono tracking-[0.2em]" 
                                maxLength={13} 
                                placeholder="146XXXXXXXXXX"
                                required 
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gmail (สำหรับกู้คืนรหัสผ่าน)</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                className={`w-full px-4 py-3.5 border rounded-2xl outline-none transition-all ${formData.email?.toLowerCase().endsWith('@gmail.com') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary-blue'}`}
                                placeholder="example@gmail.com" 
                                required 
                            />
                            {!formData.email?.toLowerCase().endsWith('@gmail.com') && formData.email && (
                                <p className="text-[10px] text-red-500 font-bold ml-1">* ต้องเป็น @gmail.com เท่านั้น</p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">คำนำหน้า</label>
                                <select name="personnelTitle" value={formData.personnelTitle} onChange={handleChange} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold">
                                    <option value="นาย">นาย</option>
                                    <option value="นาง">นาง</option>
                                    <option value="นางสาว">นางสาว</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล</label>
                                <input type="text" name="personnelName" value={formData.personnelName} onChange={handleChange} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" placeholder="ระบุชื่อและนามสกุล" required />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ตำแหน่ง</label>
                            <select name="position" value={formData.position} onChange={handleChange} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" required>
                                {positions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" placeholder="0XXXXXXXXX" required />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-50 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 transition-colors">ยกเลิก</button>
                        <button 
                            type="submit" 
                            disabled={isSaving || !isFormValid()} 
                            className="flex-1 bg-navy hover:bg-blue-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                        >
                            {isSaving ? 'กำลังบันทึก...' : 'ลงทะเบียน'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterModal;
