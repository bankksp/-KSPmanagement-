
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
    const [showPassword, setShowPassword] = useState(false);
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
                setError('คุณกรอกเลขบัตรประชาชนหรืออีเมล รหัสผ่านผิด กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err: any) {
            setError('คุณกรอกเลขบัตรประชาชนหรืออีเมล รหัสผ่านผิด กรุณาลองใหม่อีกครั้ง');
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
        <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4 font-kanit">
            <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-xl w-full max-w-lg border border-gray-100 relative overflow-hidden">
                <img src="https://img5.pic.in.th/file/secure-sv1/Blue-and-White-Modern-Gradient-D-Logo.png" className="absolute top-6 right-6 w-12 h-12 opacity-10" alt="D-School Logo" />
                
                <div className="text-center mb-10">
                    <img src={schoolLogo} className="w-20 h-20 mx-auto object-contain mb-4" alt="School Logo" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-navy">{schoolName}</h1>
                    <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-bold">D-SCHOOL SYSTEM</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">เลขบัตรประชาชน หรือ GMAIL</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all shadow-inner text-gray-700"
                            placeholder="146XXXXXXXXXXXX"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all shadow-inner pr-12 text-gray-700"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-blue"
                                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {error && (
                        <div className={`flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-sm font-bold animate-shake`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-navy hover:bg-blue-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2 text-lg"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-gray-100 pt-6">
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
