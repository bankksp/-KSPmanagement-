
import React from 'react';

interface ComingSoonProps {
    title: string;
    icon?: React.ReactNode;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, icon }) => {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-xl shadow-lg p-8 text-center animate-fade-in-up">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
                {icon || (
                    <svg className="w-16 h-16 text-primary-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                )}
            </div>
            <h2 className="text-3xl font-bold text-navy mb-2">{title}</h2>
            <p className="text-gray-500 text-lg max-w-md">
                ระบบส่วนนี้กำลังอยู่ระหว่างการพัฒนา <br/>
                พร้อมเปิดใช้งานเร็วๆ นี้
            </p>
        </div>
    );
};

export default ComingSoon;
