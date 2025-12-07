
import React, { useState } from 'react';
import { Personnel } from '../types';

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
        phone: '',
        position: positions[0] || '',
        role: 'user' // Default role
    });
    const [profileImage, setProfileImage] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProfileImage(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.idCard || formData.idCard.length !== 13) {
            alert('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
            return;
        }

        const newPersonnel: Personnel = {
            ...formData as Personnel,
            id: Date.now(),
            dob: '', // Default empty
            appointmentDate: '', // Default empty
            positionNumber: '', // Default empty
            password: formData.idCard, // Default password is ID Card
            profileImage: profileImage ? [profileImage] : [],
            role: 'user',
            status: 'pending' // Default status for new registration is Pending
        };

        onRegister(newPersonnel);
        alert('ลงทะเบียนสำเร็จ กรุณารอการอนุมัติจากผู้ดูแลระบบก่อนเข้าใช้งาน');
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h3 className="text-2xl font-bold text-navy">ลงทะเบียนบุคลากรใหม่</h3>
                    <p className="text-sm text-gray-500">กรอกข้อมูลเพื่อเพิ่มชื่อในระบบ</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                     <div className="flex gap-4">
                        <div className="w-1/3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                            <select 
                                name="personnelTitle" 
                                value={formData.personnelTitle} 
                                onChange={handleChange} 
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="นาย">นาย</option>
                                <option value="นาง">นาง</option>
                                <option value="นางสาว">นางสาว</option>
                                <option value="อื่นๆ">อื่นๆ</option>
                            </select>
                        </div>
                        <div className="w-2/3">
                             <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                            <input
                                type="text"
                                name="personnelName"
                                value={formData.personnelName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน (ใช้เป็นรหัสผ่าน)</label>
                        <input
                            type="text"
                            name="idCard"
                            value={formData.idCard}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg"
                            maxLength={13}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                        />
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                        <select 
                            name="position" 
                            value={formData.position} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="" disabled>เลือกตำแหน่ง</option>
                            {positions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รูปโปรไฟล์</label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange} 
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" 
                        />
                    </div>

                    <div className="pt-2 text-xs text-center space-y-1">
                        <p className="text-red-500 font-bold">** ท่านต้องรอให้ Admin อนุมัติสิทธิ์การใช้งานก่อน จึงจะสามารถ Login เข้าระบบได้</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded-lg"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 rounded-lg shadow-md disabled:opacity-50"
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
