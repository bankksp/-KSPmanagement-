
import React, { useState } from 'react';
import { Personnel } from '../types';
import { postToGoogleScript } from '../utils';

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
        isEmailVerified: false
    });
    
    const [otpCode, setOtpCode] = useState('');
    const [sentOtp, setSentOtp] = useState<boolean>(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSendOtp = async () => {
        if (!formData.email || !formData.email.includes('@gmail.com')) {
            alert('กรุณากรอก Gmail ที่ถูกต้อง (@gmail.com เท่านั้น)');
            return;
        }
        if (!formData.idCard || formData.idCard.length !== 13) {
            alert('กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง');
            return;
        }

        setIsSendingOtp(true);
        try {
            const response = await postToGoogleScript({ 
                action: 'checkDuplicateAndSendOTP', 
                email: formData.email,
                idCard: formData.idCard
            });

            if (response.status === 'success') {
                setSentOtp(true);
                alert('รหัสยืนยัน (OTP) 6 หลัก ถูกส่งไปยัง Gmail ของท่านแล้ว');
            } else {
                alert('ไม่สามารถลงทะเบียนได้: ' + response.message);
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length !== 6) {
            alert('กรุณากรอกรหัส 6 หลัก');
            return;
        }
        setIsVerifying(true);
        try {
            const response = await postToGoogleScript({ 
                action: 'verifyEmailCode', 
                email: formData.email,
                code: otpCode
            });
            if (response.status === 'success') {
                setFormData(prev => ({ ...prev, isEmailVerified: true }));
                alert('ยืนยันตัวตนสำเร็จ! กรุณากรอกข้อมูลที่เหลือ');
            } else {
                alert('รหัสยืนยันไม่ถูกต้อง หรือรหัสหมดอายุ');
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการตรวจสอบ');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.isEmailVerified) {
            alert('กรุณายืนยัน Gmail ก่อนลงทะเบียน');
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
            isEmailVerified: true
        };

        onRegister(newPersonnel);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-white">
                <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-navy">ลงทะเบียนบุคลากร</h3>
                        <p className="text-sm text-gray-400 mt-1">ยืนยันตัวตนผ่าน Gmail เพื่อเริ่มต้นการใช้งาน</p>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors text-3xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                    {/* Step 1: Verification Box */}
                    <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest ml-1">เลขบัตรประชาชน (13 หลัก)</label>
                            <input 
                                type="text" 
                                name="idCard" 
                                value={formData.idCard} 
                                onChange={handleChange} 
                                disabled={sentOtp}
                                className="w-full px-4 py-3.5 bg-white border border-blue-200 rounded-2xl focus:ring-2 focus:ring-primary-blue disabled:bg-gray-100 font-mono tracking-[0.2em]" 
                                maxLength={13} 
                                required 
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest ml-1">Gmail ผูกกับระบบ</label>
                            <div className="flex gap-2">
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    disabled={formData.isEmailVerified}
                                    className={`flex-grow px-4 py-3.5 bg-white border border-blue-200 rounded-2xl outline-none ${formData.isEmailVerified ? 'bg-green-50 text-green-700 border-green-200 font-bold' : ''}`}
                                    placeholder="yourname@gmail.com" 
                                    required 
                                />
                                {!formData.isEmailVerified && (
                                    <button 
                                        type="button" 
                                        onClick={handleSendOtp}
                                        disabled={isSendingOtp || sentOtp}
                                        className="bg-navy text-white px-5 py-3.5 rounded-2xl text-xs font-bold whitespace-nowrap disabled:opacity-50 hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/10"
                                    >
                                        {isSendingOtp ? '...' : (sentOtp ? 'ส่งแล้ว' : 'ส่งรหัส')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {sentOtp && !formData.isEmailVerified && (
                            <div className="pt-2 animate-bounce-in space-y-2">
                                <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest ml-1 text-center block">รหัสยืนยัน 6 หลักจากอีเมล</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="flex-grow px-4 py-3 border-2 border-blue-400 rounded-2xl text-center font-bold text-2xl tracking-[0.5em] focus:border-primary-blue outline-none shadow-inner"
                                        placeholder="000000"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleVerifyOtp}
                                        disabled={isVerifying}
                                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                                    >
                                        {isVerifying ? '...' : 'ยืนยัน'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Personal Info (Unlocked after verification) */}
                    <div className={`space-y-4 transition-all duration-700 ${formData.isEmailVerified ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-20 scale-95 pointer-events-none'}`}>
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
                                <input type="text" name="personnelName" value={formData.personnelName} onChange={handleChange} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" required />
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
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" required />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-50 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 transition-colors">ยกเลิก</button>
                        <button 
                            type="submit" 
                            disabled={isSaving || !formData.isEmailVerified} 
                            className="flex-1 bg-primary-blue text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 disabled:opacity-50 hover:bg-blue-700 transition-all"
                        >
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterModal;
