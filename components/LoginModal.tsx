
import React, { useState } from 'react';
import { Personnel } from '../types';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (user: Personnel, rememberMe: boolean) => void;
    personnelList: Personnel[];
    onRegisterClick: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, personnelList, onRegisterClick }) => {
    const [idCard, setIdCard] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Remove spaces or dashes just in case
        const cleanId = idCard.replace(/[^0-9]/g, '');
        const cleanPass = password.trim();

        const user = personnelList.find(p => {
             const pId = p.idCard ? String(p.idCard).replace(/[^0-9]/g, '') : '';
             return pId === cleanId;
        });

        if (user) {
            // Default password is idCard if user.password is not set
            const userPassword = user.password || String(user.idCard);
            
            if (userPassword === cleanPass) {
                onLogin(user, rememberMe);
                onClose();
                setIdCard('');
                setPassword('');
                setRememberMe(false);
            } else {
                setError('รหัสผ่านไม่ถูกต้อง');
            }
        } else {
            setError('ไม่พบเลขบัตรประชาชนนี้ในระบบ');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-navy">เข้าสู่ระบบ</h3>
                    <p className="text-sm text-gray-500">KSP Management</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                        <input
                            type="text"
                            value={idCard}
                            onChange={(e) => setIdCard(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue focus:outline-none"
                            placeholder="เลขบัตรประชาชน 13 หลัก"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue focus:outline-none"
                            placeholder="รหัสผ่าน (ค่าเริ่มต้น: เลขบัตรประชาชน)"
                            required
                        />
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-primary-blue focus:ring-primary-blue border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                จำรหัสผ่าน
                            </label>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 rounded-lg shadow-md transition-colors"
                    >
                        เข้าสู่ระบบ
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        ยังไม่มีบัญชี?{' '}
                        <button onClick={() => { onClose(); onRegisterClick(); }} className="text-primary-blue hover:underline font-semibold">
                            ลงทะเบียนบุคลากรใหม่
                        </button>
                    </p>
                </div>
                
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

export default LoginModal;
