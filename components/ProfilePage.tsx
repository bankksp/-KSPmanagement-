
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
    const [address, setAddress] = useState(''); // Placeholder, as address isn't in Personnel type yet properly, assuming we just use existing fields
    const [newImage, setNewImage] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Change Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passError, setPassError] = useState('');

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
            // Assuming we might add address later, for now just phone and image
            profileImage: newImage ? [newImage] : user.profileImage
        };
        onSave(updatedUser);
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setPassError('');

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
        alert('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary-blue to-blue-800 p-6 text-white">
                    <h2 className="text-2xl font-bold">ข้อมูลส่วนตัว</h2>
                    <p className="opacity-90">จัดการข้อมูลและรหัสผ่านของคุณ</p>
                </div>

                <div className="flex border-b">
                    <button 
                        className={`flex-1 py-4 text-center font-semibold ${activeTab === 'info' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('info')}
                    >
                        ข้อมูลทั่วไป
                    </button>
                    <button 
                        className={`flex-1 py-4 text-center font-semibold ${activeTab === 'password' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500 hover:bg-gray-50'}`}
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
                                    <label className="mt-3 inline-block cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                                        <span>เปลี่ยนรูปภาพ</span>
                                        <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                </div>
                                
                                <div className="flex-grow space-y-4 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">ชื่อ-นามสกุล</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800">
                                                {user.personnelTitle === 'อื่นๆ' ? user.personnelTitleOther : user.personnelTitle} {user.personnelName}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">เลขบัตรประชาชน</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800">{user.idCard}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">ตำแหน่ง</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800">{user.position}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">สถานะ (Role)</label>
                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 uppercase font-bold text-primary-blue">{user.role || 'USER'}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                        <input 
                                            type="tel" 
                                            value={phone} 
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-blue focus:border-primary-blue"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow-md disabled:opacity-50"
                                >
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleChangePassword} className="max-w-md mx-auto space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านปัจจุบัน</label>
                                <input 
                                    type="password" 
                                    value={currentPassword} 
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-blue focus:border-primary-blue"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-blue focus:border-primary-blue"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-blue focus:border-primary-blue"
                                    required
                                />
                            </div>

                            {passError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{passError}</p>}

                            <div className="pt-4">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg shadow-md disabled:opacity-50"
                                >
                                    {isSaving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
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
