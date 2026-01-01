
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
    const [showPassword, setShowPassword] = useState(false);
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
                // Check Status (New Security Feature)
                if (user.status === 'pending') {
                    setError('บัญชีของท่านอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ');
                    return;
                }
                if (user.status === 'blocked') {
                    setError('บัญชีของท่านถูกระงับการใช้งาน');
                    return;
                }

                onLogin(user, rememberMe);
                onClose();
                setIdCard('');
                setPassword('');
                setRememberMe(false);
                setShowPassword(false);
            } else {
                setError('รหัสผ่านไม่ถูกต้อง');
            }
        } else {
            setError('ไม่พบเลขบัตรประชาชนนี้ในระบบ');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 transform transition-all scale-100 border border-white/20">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4 shadow-sm text-primary-blue">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-navy">เข้าสู่ระบบ</h3>
                    <p className="text-sm text-gray-500 mt-1">D-school System</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                        <input
                            type="text"
                            value={idCard}
                            onChange={(e) => setIdCard(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-all"
                            placeholder="เลขบัตรประชาชน 13 หลัก"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none pr-10 transition-all"
                                placeholder="รหัสผ่าน"
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-blue focus:outline-none transition-colors p-1"
                                tabIndex={-1}
                                title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-primary-blue focus:ring-primary-blue border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                                จำรหัสผ่าน
                            </label>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-sm animate-shake">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-primary-blue hover:bg-primary-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex justify-center"
                    >
                        เข้าสู่ระบบ
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-600">
                        ยังไม่มีบัญชี?{' '}
                        <button onClick={() => { onClose(); onRegisterClick(); }} className="text-primary-blue hover:text-blue-700 hover:underline font-bold transition-colors">
                            ลงทะเบียนบุคลากรใหม่
                        </button>
                    </p>
                </div>
                
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

export default LoginModal;
