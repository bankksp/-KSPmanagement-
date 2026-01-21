

import React, { useState } from 'react';
import { Page, Personnel } from '../types';
import { getDirectDriveImageSrc } from '../utils';
import { PROGRAM_LOGO } from '../constants';

interface SidebarProps {
    onNavigate: (page: Page) => void;
    currentPage: Page;
    schoolName: string;
    schoolLogo: string;
    currentUser: Personnel | null;
    personnel: Personnel[];
    isOpen: boolean;
    onCloseMobile: () => void;
    isDesktopOpen: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    onNavigate, currentPage, schoolName, schoolLogo, 
    currentUser, personnel, isOpen, onCloseMobile, isDesktopOpen,
    onMouseEnter, onMouseLeave
}) => {
    const [expandedMenu, setExpandedMenu] = useState<string | null>('studentAffairs');

    const pendingCount = personnel.filter(p => p.status === 'pending').length;

    const menuStructure = [
        {
            key: 'main',
            label: 'ภาพรวม',
            items: [
                { label: 'หน้าแรก (Dashboard)', page: 'stats' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
            ]
        },
        {
            key: 'workflow',
            label: 'ระบบงานแฟ้มเอกสาร',
            items: [
                { label: 'ระบบเสนอแฟ้มเอกสาร', page: 'workflow_docs' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> }
            ]
        },
        {
            key: 'studentAffairs',
            label: 'งานกิจการนักเรียน',
            items: [
                { label: 'ข้อมูลนักเรียน', page: 'students' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                { label: 'เช็คชื่อนักเรียน', page: 'attendance' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
                { label: 'รายงานเรือนนอน', page: 'reports' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                { label: 'เยี่ยมบ้าน (GPS)', page: 'student_home_visit' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                { label: 'ประเมิน SDQ', page: 'student_sdq' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
            ]
        },
        {
            key: 'academic',
            label: 'งานวิชาการ',
            items: [
                { label: 'แผนการสอน', page: 'academic_plans' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
                { label: 'บริการแหล่งเรียนรู้', page: 'academic_service' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> }
            ]
        },
        {
            key: 'personnel',
            label: 'งานบุคคล',
            items: [
                { label: 'ข้อมูลบุคลากร', page: 'personnel' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                { label: 'ระบบเก็บผลงาน', page: 'personnel_achievements' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
                { label: 'ระบบการลา', page: 'personnel_leave' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { label: 'ลงเวลาปฏิบัติงาน', page: 'personnel_duty' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
                { label: 'เช็คชื่อครู', page: 'attendance_personnel' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                { label: 'รายงานการปฏิบัติงาน (PA)', page: 'personnel_report' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                { label: 'ผลการปฏิบัติงาน', page: 'personnel_salary_report' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                { label: 'รายงาน SAR', page: 'personnel_sar' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
            ]
        },
        {
            key: 'general',
            label: 'งานบริหารทั่วไป',
            items: [
                { label: 'งานสารบัญ', page: 'general_docs' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
                { label: 'แจ้งซ่อม', page: 'general_repair' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
                { label: 'งานก่อสร้าง', page: 'general_construction' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                { label: 'ระบบโภชนาการ', page: 'general_nutrition' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                { label: 'ระบบเกียรติบัตร', page: 'general_certs' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> }
            ]
        },
        {
            key: 'finance',
            label: 'งานแผนงานและงบประมาณ',
            items: [
                { label: 'ระบบแผนงาน', page: 'finance_projects' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
                { label: 'ระบบสั่งซื้อ/จ้างพัสดุ', page: 'finance_supplies' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                { label: 'ระบบครุภัณฑ์', page: 'durable_goods' as Page, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> }
            ]
        }
    ];

    const toggleAccordion = (key: string) => {
        setExpandedMenu(expandedMenu === key ? null : key);
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 z-[1050] lg:hidden backdrop-blur-sm transition-opacity" onClick={onCloseMobile}></div>
            )}

            <div 
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className={`
                    fixed top-0 left-0 h-full bg-white/90 backdrop-blur-xl border-r border-white/50 shadow-2xl z-[1060] w-72 transition-transform duration-300 ease-out flex flex-col
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${isDesktopOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
                `}
            >
                {/* Sidebar Header: School Brand */}
                <div className="p-6 flex flex-col items-center justify-center border-b border-gray-100 shrink-0">
                    <div className="relative group cursor-pointer" onClick={() => { onNavigate('stats'); onCloseMobile(); }}>
                        <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl group-hover:bg-blue-400/30 transition-all"></div>
                        <img 
                            src={getDirectDriveImageSrc(schoolLogo)} 
                            alt="Logo" 
                            className="w-20 h-20 object-contain relative drop-shadow-md transform transition-transform group-hover:scale-105"
                            onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                        />
                    </div>
                    <h1 className="mt-4 font-bold text-navy text-lg text-center leading-tight tracking-tight">{schoolName}</h1>
                    <p className="text-xs text-gray-500 font-medium mt-1">ระบบบริหารจัดการสถานศึกษา</p>
                </div>

                {/* Sidebar Navigation */}
                <nav className="p-4 overflow-y-auto flex-grow custom-scrollbar space-y-1">
                    {menuStructure.map(group => {
                        const isExpanded = expandedMenu === group.key || group.key === 'main';
                        return (
                            <div key={group.key} className="mb-2">
                                {group.key !== 'main' && (
                                    <button 
                                        onClick={() => toggleAccordion(group.key)}
                                        className="w-full flex justify-between items-center px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-primary-blue transition-colors"
                                    >
                                        {group.label}
                                        <svg className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                )}
                                
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {group.items.map(item => {
                                        const isActive = currentPage === item.page;
                                        return (
                                            <button
                                                key={item.page}
                                                onClick={() => { onNavigate(item.page); onCloseMobile(); }}
                                                className={`
                                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                                                    ${isActive 
                                                        ? 'bg-gradient-to-r from-primary-blue to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                                        : 'text-gray-600 hover:bg-blue-50 hover:text-primary-blue'
                                                    }
                                                `}
                                            >
                                                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                    {item.icon}
                                                </div>
                                                <span>{item.label}</span>
                                                {item.page === 'personnel' && pendingCount > 0 && (
                                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">{pendingCount}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Sidebar Footer: Program Branding Signature */}
                <div className="shrink-0 p-4 border-t border-gray-100 bg-gray-50/50 backdrop-blur-md">
                     {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => { onNavigate('admin'); onCloseMobile(); }}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 mb-4 ${currentPage === 'admin' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            ตั้งค่าระบบ
                        </button>
                    )}
                    
                    {/* FIXED PROGRAM SIGNATURE */}
                    <div className="flex flex-col items-center justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                        <img src={PROGRAM_LOGO} className="h-6 w-auto grayscale contrast-125" alt="D-school" />
                        <div className="text-center">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">Powered by D-school</p>
                            <p className="text-[8px] text-gray-400 font-bold mt-0.5">© 2025 All Rights Reserved</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
