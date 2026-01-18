
import React from 'react';

const LoadingModal: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-[9999] animate-fade-in font-sarabun">
            <div className="bg-white/90 p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 text-center">
                {/* Cute SVG Animation */}
                <div className="w-24 h-24">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <style>{`
                            .cloud-body { fill: #EBF5FF; stroke: #3B82F6; stroke-width: 2; animation: float 3s ease-in-out infinite; }
                            .eye { fill: #1E3A8A; }
                            .mouth { fill: none; stroke: #1E3A8A; stroke-width: 2; stroke-linecap: round; }
                            .arrow { fill: #3B82F6; animation: upload 1.5s ease-in-out infinite; }
                            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                            @keyframes upload { 0% { opacity: 0; transform: translateY(10px); } 50% { opacity: 1; transform: translateY(-5px); } 100% { opacity: 0; transform: translateY(-20px); } }
                        `}</style>
                        <g className="cloud-body">
                            <path d="M 30,70 A 20,20 0 0 1 30,30 H 70 A 20,20 0 0 1 70,70 H 60 A 10,10 0 0 1 60,50 H 40 A 10,10 0 0 1 40,70 Z" />
                        </g>
                        <circle className="eye" cx="45" cy="50" r="3" />
                        <circle className="eye" cx="65" cy="50" r="3" />
                        <path className="mouth" d="M 50 60 Q 55 65 60 60" />
                        <g className="arrow">
                            <path d="M 55 40 L 55 20 L 60 25 M 55 20 L 50 25" stroke="#3B82F6" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                        </g>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-navy">กำลังอัปโหลด กรุณารอสักครู่...</h3>
                <p className="text-sm text-gray-500 max-w-xs">ข้อมูลของคุณกำลังถูกบันทึกอย่างปลอดภัย<br/>รอก่อนนะ!</p>
            </div>
        </div>
    );
};

export default LoadingModal;
