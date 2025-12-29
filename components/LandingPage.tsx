
import React, { useState } from 'react';
import { Personnel } from '../types';
import { postToGoogleScript, prepareDataForApi } from '../utils';
import RegisterModal from './RegisterModal';
import { POSITIONS, PROGRAM_LOGO } from '../constants';

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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] p-4 font-sarabun">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-white relative overflow-hidden">
                {/* Branding Signature Accent */}
                <div className="absolute top-0 right-0 p-6 opacity-5">
                    <img src={PROGRAM_LOGO} className="w-20 h-20" alt="" />
                </div>

                <div className="text-center mb-8 relative z-10">
                    <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
                        <img src={schoolLogo} className="w-24 h-24 mx-auto object-contain relative" alt="Logo" />
                    </div>
                    <h1 className="text-2xl font-bold text-navy">{schoolName}</h1>
                    <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-bold">D-school System</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 ml-1 uppercase tracking-tight">เลขบัตรประชาชน หรือ Gmail</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all shadow-inner"
                            placeholder="146XXXXXXXXXX"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 ml-1 uppercase tracking-tight">รหัสผ่าน</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all shadow-inner"
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
                        className="w-full bg-navy hover:bg-blue-900 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2 text-lg"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="mt-10 text-center border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-500">
                        ยังไม่มีบัญชีบุคลากร? 
                        <button onClick={() => setIsRegisterOpen(true)} className="text-primary-blue hover:underline font-black ml-1">ลงทะเบียนใหม่</button>
                    </p>
                </div>
            </div>

            {/* PROGRAM SIGNATURE FOOTER */}
            <div className="mt-8 flex flex-col items-center gap-2 animate-fade-in opacity-50 hover:opacity-100 transition-opacity">
                <img src={PROGRAM_LOGO} className="h-8 w-auto grayscale" alt="D-school Logo" />
                <div className="text-center leading-none">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">D-school Management Platform</span>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">Smart System for Modern Education</p>
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
