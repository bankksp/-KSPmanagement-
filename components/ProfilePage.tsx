
import React, { useState, useMemo } from 'react';
import { Personnel } from '../types';
import { getFirstImageSource } from '../utils';

interface ProfilePageProps {
    user: Personnel;
    onSave: (updatedUser: Personnel) => void;
    isSaving: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onSave, isSaving }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
    
    // Edit Info State
    const [phone, setPhone] = useState(user.phone);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Change Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passError, setPassError] = useState('');
    
    // Password Visibility State
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const profileImageUrl = useMemo(() => {
        if (previewImage) return previewImage;
        return getFirstImageSource(user.profileImage);
    }, [user.profileImage, previewImage]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewImage(file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleSaveInfo = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedUser: Personnel = {
            ...user,
            phone: phone,
            profileImage: newImage ? [newImage] : user.profileImage
        };
        onSave(updatedUser);
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setPassError('');

        // Fallback to ID Card if password is not set (first time user)
        const actualCurrentPass = user.password || user.idCard;

        if (currentPassword !== actualCurrentPass) {
            setPassError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
            return;
        }
        if (newPassword.length < 4) {
            setPassError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
            return;
        }
        if (newPassword === user.idCard) {
            setPassError('กรุณาตั้งรหัสผ่านใหม่ที่ไม่ใช่เลขบัตรประชาชนเดิม');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPassError('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        const updatedUser: Personnel = {
            ...user,
            password: newPassword
        };
        onSave(updatedUser);
        
        // Reset fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPass(false);
        setShowNewPass(false);
        setShowConfirmPass(false);
        alert('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาจำรหัสผ่านใหม่ของท่าน');
    };

    // Helper for toggle button
    const ToggleButton = ({ show, setShow }: { show: boolean, setShow: (v: boolean) => void }) => (
        <button 
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-blue focus:outline-none transition-colors p-1"
            tabIndex={-1}
            title={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
            {show ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            )}
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary-blue to-blue-800 p-6 text-white">
                    <h2 className="text-2xl font-bold">ข้อมูลส่วนตัว</h2>
                    <p className="opacity-90">จัดการข้อมูลและรหัสผ่านของคุณ</p>
                </div>

                <div className="flex border-b">
                    <button 
                        className={`flex-1 py-4 text-center font-semibold transition-colors ${activeTab === 'info' ? 'text-primary-blue border-b-2 border-primary-blue bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('info')}
                    >
                        ข้อมูลทั่วไป
                    </button>
                    <button 
                        className={`flex-1 py-4 text-center font-semibold transition-colors ${activeTab === 'password' ? 'text-primary-blue border-b-2 border-primary-blue bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('password')}
                    >
                        เปลี่ยนรหัสผ่าน
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'info' ? (
                        <form onSubmit={handleSaveInfo} className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                <div className="flex-shrink-0 text-center">
                                    <div className="w-32 h-40 bg-gray-200 rounded-lg overflow-hidden mx-auto border shadow-sm">
                                        {profileImageUrl ? (
                                            <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                        )}
                                    </div>
                                    <label className="mt-3 inline-block cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                                        <span>เปลี่ยนรูปภาพ</span>
                                        <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                </div>
                                
                                <div className="flex-grow space-y-4 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">ชื่อ-นามสกุล</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 border border-gray-200">
                                                {user.personnelTitle === 'อื่นๆ' ? user.personnelTitleOther : user.personnelTitle} {user.personnelName}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">เลขบัตรประชาชน</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 border border-gray-200">{user.idCard}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">ตำแหน่ง</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 border border-gray-200">{user.position}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">สถานะ (Role)</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 uppercase font-bold text-primary-blue border border-gray-200">{user.role || 'USER'}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                        <input 
                                            type="tel" 
                                            value={phone} 
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow-md disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleChangePassword} className="max-w-md mx-auto space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านปัจจุบัน</label>
                                <div className="relative">
                                    <input 
                                        type={showCurrentPass ? "text" : "password"}
                                        value={currentPassword} 
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none pr-10 transition-all"
                                        required
                                    />
                                    <ToggleButton show={showCurrentPass} setShow={setShowCurrentPass} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                                <div className="relative">
                                    <input 
                                        type={showNewPass ? "text" : "password"}
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none pr-10 transition-all"
                                        required
                                    />
                                    <ToggleButton show={showNewPass} setShow={setShowNewPass} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                                <div className="relative">
                                    <input 
                                        type={showConfirmPass ? "text" : "password"}
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none pr-10 transition-all"
                                        required
                                    />
                                    <ToggleButton show={showConfirmPass} setShow={setShowConfirmPass} />
                                </div>
                            </div>

                            {passError && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{passError}</span>
                                </div>
                            )}

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 transition-all active:scale-95 flex justify-center items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            กำลังบันทึก...
                                        </>
                                    ) : 'เปลี่ยนรหัสผ่าน'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
