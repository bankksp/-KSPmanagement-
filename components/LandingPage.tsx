
import React, { useState } from 'react';
import { Personnel } from '../types';
import { postToGoogleScript, prepareDataForApi } from '../utils';
import RegisterModal from './RegisterModal';
import { POSITIONS } from '../constants';

interface LandingPageProps {
    onLoginSuccess: (user: Personnel) => void;
    schoolName: string;
    schoolLogo: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess, schoolName, schoolLogo }) => {
    const [identifier, setIdentifier] = useState(''); // Accepts ID Card or Email
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await postToGoogleScript({
                action: 'login',
                identifier: identifier.trim(), 
                password: password.trim()
            });

            if (response.status === 'success' && response.data) {
                onLoginSuccess(response.data);
            } else {
                setError(response.message || 'ข้อมูลไม่ถูกต้อง หรือบัญชียังไม่ได้รับอนุมัติ');
            }
        } catch (err: any) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (newPersonnel: Personnel) => {
        setIsRegistering(true);
        try {
            const apiPayload = await prepareDataForApi(newPersonnel);
            const response = await postToGoogleScript({ action: 'addPersonnel', data: apiPayload });
            
            if (response.status === 'success') {
                alert('ลงทะเบียนสำเร็จ! กรุณารอการอนุมัติสิทธิ์จากผู้ดูแลระบบ');
                setIsRegisterOpen(false);
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        } catch (error: any) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4 font-sarabun">
            <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-white">
                <div className="text-center mb-8">
                    <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
                        <img src={schoolLogo} className="w-24 h-24 mx-auto object-contain relative" alt="Logo" />
                    </div>
                    <h1 className="text-2xl font-bold text-navy">{schoolName}</h1>
                    <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-bold">KSP Management System</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 ml-1 uppercase">เลขบัตรประชาชน หรือ Gmail</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all shadow-inner"
                            placeholder="146XXXXXXXXXX หรือ name@gmail.com"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 ml-1 uppercase">รหัสผ่าน</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all shadow-inner"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 animate-pulse font-bold">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-navy hover:bg-blue-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400 tracking-widest"><span className="px-3 bg-white">เชื่อมต่อภายนอก</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 border border-gray-200 py-3 rounded-2xl hover:bg-gray-50 transition-colors font-bold text-sm text-gray-700">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="G" />
                        Google
                    </button>
                    <button className="flex items-center justify-center gap-2 border border-gray-200 py-3 rounded-2xl hover:bg-gray-50 transition-colors font-bold text-sm text-gray-700">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                    </button>
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        ยังไม่มีบัญชีบุคลากร? 
                        <button onClick={() => setIsRegisterOpen(true)} className="text-primary-blue hover:underline font-bold ml-1">ลงทะเบียนใหม่</button>
                    </p>
                </div>
            </div>

            <RegisterModal 
                isOpen={isRegisterOpen} 
                onClose={() => setIsRegisterOpen(false)} 
                onRegister={handleRegisterSubmit} 
                positions={POSITIONS} 
                isSaving={isRegistering} 
            />
        </div>
    );
};

export default LandingPage;
