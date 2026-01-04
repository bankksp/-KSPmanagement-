import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDirectDriveImageSrc, getFirstImageSource } from '../utils';
import { Personnel, Page } from '../types';

interface HeaderProps {
    onReportClick: () => void;
    onNavigate: (page: Page) => void;
    currentPage: Page;
    schoolName: string;
    schoolLogo: string;
    currentUser: Personnel | null;
    onLoginClick: () => void;
    onLogoutClick: () => void;
    personnel?: Personnel[]; // Added prop
}

type MenuKey = 'academic' | 'personnel' | 'finance' | 'general' | 'studentAffairs' | 'data' | null;

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, currentPage, schoolName, schoolLogo, 
    currentUser, onLoginClick, onLogoutClick, personnel = []
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<MenuKey>(null);
    const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    // Calculate pending approvals count
    const pendingCount = useMemo(() => {
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'pro')) return 0;
        return personnel.filter(p => p.status === 'pending').length;
    }, [personnel, currentUser]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = (key: MenuKey) => {
        if (activeDropdown === key) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(key);
        }
    };

    const toggleMobileSubmenu = (key: string) => {
        if (mobileExpandedMenu === key) {
            setMobileExpandedMenu(null);
        } else {
            setMobileExpandedMenu(key);
        }
    };

    const handleNav = (page: Page) => {
        onNavigate(page);
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
        setMobileExpandedMenu(null);
    };

    const logoSrc = getDirectDriveImageSrc(schoolLogo);
    const userProfileImg = useMemo(() => currentUser ? getFirstImageSource(currentUser.profileImage) : null, [currentUser]);

    // Styles
    const navLinkClass = "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1 text-white/90 hover:bg-white/20 hover:text-white hover:shadow-sm relative";
    const activeNavLinkClass = "bg-white/25 text-white shadow-inner " + navLinkClass;
    
    const dropdownClass = "absolute left-0 mt-2 w-56 bg-white/90 backdrop-blur-md rounded-xl shadow-xl py-2 z-30 text-gray-800 border border-white/50 animate-fade-in-up ring-1 ring-black/5";
    const dropdownItemClass = "block w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-primary-blue transition-colors font-medium relative";
    
    // Glassy Button Style
    const glassBtnBase = "backdrop-blur-md transition-all duration-300 border shadow-sm flex items-center justify-center gap-2";
    // More transparent background as requested
    const glassBtnPrimary = `${glassBtnBase} bg-white/20 hover:bg-white/30 border-white/40 text-white`; 
    
    // Menu Structure
    const menuStructure = [
        {
            key: 'academic',
            label: 'งานวิชาการ',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            ),
            items: [
                { label: 'แผนการสอน', page: 'academic_plans' as Page },
                { label: 'ลงทะเบียนเข้าใช้บริการ', page: 'academic_service' as Page }
            ]
        },
        {
            key: 'personnel',
            label: 'งานบุคคล',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            ),
            items: [
                { label: 'รายงานการปฏิบัติงาน', page: 'personnel_report' as Page },
                { label: 'รายงานผลการประเมินตนเอง SAR', page: 'personnel_sar' as Page }
            ]
        },
        {
            key: 'finance',
            label: 'งานงบประมาณและแผนงาน',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ),
            items: [
                { label: 'ระบบแผนงาน', page: 'finance_projects' as Page },
                { label: 'ระบบพัสดุ (วัสดุสิ้นเปลือง)', page: 'finance_supplies' as Page },
                { label: 'ระบบครุภัณฑ์', page: 'durable_goods' as Page }
            ]
        },
        {
            key: 'general',
            label: 'งานทั่วไป',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            ),
            items: [
                { label: 'หนังสือ/คำสั่ง', page: 'general_docs' as Page },
                { label: 'แจ้งซ่อม', page: 'general_repair' as Page },
                { label: 'บันทึกงานก่อสร้าง', page: 'general_construction' as Page },
                { label: 'ระบบเกียรติบัตร', page: 'general_certs' as Page }
            ]
        },
        {
            key: 'studentAffairs',
            label: 'กิจการนักเรียน',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ),
            items: [
                { label: 'เช็คชื่อนักเรียน', page: 'attendance' as Page },
                { label: 'เช็คชื่อครู', page: 'attendance_personnel' as Page },
                { label: 'รายงานเรือนนอน', page: 'reports' as Page },
                { label: 'เยี่ยมบ้านนักเรียน', page: 'student_home_visit' as Page }
            ]
        },
        {
            key: 'data',
            label: 'ข้อมูลพื้นฐาน',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            ),
            items: [
                { label: 'ข้อมูลนักเรียน', page: 'students' as Page },
                { label: 'ข้อมูลบุคลากร', page: 'personnel' as Page }
            ]
        }
    ];

    return (
        <header className="bg-gradient-to-r from-primary-blue to-blue-700 text-white shadow-lg sticky top-0 z-50 no-print border-b border-white/10 backdrop-blur-sm bg-opacity-95">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center relative">
                {/* Logo & School Name */}
                <div className="flex items-center gap-3 overflow-hidden flex-shrink-0 cursor-pointer group" onClick={() => onNavigate('stats')}>
                    <div className="relative">
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:bg-white/30 transition-all"></div>
                        <img 
                            src={logoSrc} 
                            alt="School Logo" 
                            className="h-10 w-10 md:h-11 md:w-11 object-contain bg-white p-1 rounded-full relative shadow-md group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                        />
                    </div>
                     <div className="flex flex-col">
                        <h1 className="text-sm sm:text-base md:text-lg font-bold whitespace-nowrap leading-tight tracking-tight drop-shadow-sm">{schoolName}</h1>
                        <span className="text-[10px] sm:text-xs text-blue-100 font-medium">ระบบสารสนเทศเพื่อการบริหารจัดการ</span>
                     </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1 flex-grow justify-end" ref={dropdownRef}>
                         <button 
                            onClick={() => onNavigate('stats')}
                            className={currentPage === 'stats' ? activeNavLinkClass : navLinkClass}
                         >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                             หน้าหลัก
                         </button>
                         
                         {currentUser && menuStructure.map((menu) => (
                             <div key={menu.key} className="relative group">
                                 <button
                                    onClick={() => toggleDropdown(menu.key as MenuKey)}
                                    className={`${navLinkClass} ${activeDropdown === menu.key ? 'bg-white/20 text-white' : ''}`}
                                 >
                                     {menu.label}
                                     <svg className={`w-3 h-3 transition-transform duration-200 ${activeDropdown === menu.key ? 'rotate-180' : 'group-hover:rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                     {menu.key === 'data' && pendingCount > 0 && (
                                         <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] text-white justify-center items-center font-bold">{pendingCount}</span>
                                         </span>
                                     )}
                                 </button>
                                 
                                 {activeDropdown === menu.key && (
                                     <div className={dropdownClass}>
                                         <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{menu.label}</div>
                                         {menu.items.map(item => (
                                             <button
                                                key={item.page}
                                                onClick={() => { handleNav(item.page); }}
                                                className={`${dropdownItemClass} ${currentPage === item.page ? 'text-primary-blue font-bold bg-blue-50 border-l-4 border-primary-blue' : 'border-l-4 border-transparent'}`}
                                             >
                                                 {item.label}
                                                 {item.page === 'personnel' && pendingCount > 0 && (
                                                     <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                                                 )}
                                             </button>
                                         ))}
                                     </div>
                                 )}
                             </div>
                         ))}
                         
                         {currentUser && currentUser.role === 'admin' && (
                            <button 
                                onClick={() => onNavigate('admin')}
                                className={`${navLinkClass} ${currentPage === 'admin' ? activeNavLinkClass : ''}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                ตั้งค่า
                            </button>
                         )}

                         {/* User Profile / Login - Desktop */}
                         {currentUser ? (
                             <div className="relative ml-3 pl-3 border-l border-white/20" ref={profileDropdownRef}>
                                <button 
                                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    className={`flex items-center gap-2 py-1 px-1.5 pr-3 rounded-full transition-all duration-200 ${isProfileDropdownOpen ? 'bg-white/20 shadow-inner' : 'hover:bg-white/10'}`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-white overflow-hidden border-2 border-white/50 shadow-sm relative group">
                                        {userProfileImg ? (
                                            <img src={userProfileImg} alt="User" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-sm font-bold text-primary-blue">{currentUser.personnelName.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div className="hidden xl:block text-left">
                                        <div className="text-xs font-medium leading-none text-white">{currentUser.personnelName}</div>
                                        <div className="text-[10px] text-blue-100 leading-tight mt-0.5 opacity-80">{currentUser.position}</div>
                                    </div>
                                    <svg className={`w-3 h-3 text-blue-100 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                
                                {isProfileDropdownOpen && (
                                    <div className={dropdownClass.replace('left-0', 'right-0')}>
                                         <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl -mt-2 mb-1">
                                            <p className="text-sm font-bold text-gray-800 truncate">{currentUser.personnelName}</p>
                                            <p className="text-xs text-gray-500 truncate">{currentUser.position}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${currentUser.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                    {currentUser.role || 'USER'}
                                                </span>
                                            </div>
                                         </div>
                                         <button 
                                            onClick={() => { handleNav('profile'); setIsProfileDropdownOpen(false); }}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 hover:text-primary-blue transition-colors flex items-center gap-2"
                                         >
                                             <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                             ข้อมูลส่วนตัว
                                         </button>
                                         <div className="border-t border-gray-100 my-1"></div>
                                         <button 
                                            onClick={() => { onLogoutClick(); setIsProfileDropdownOpen(false); }}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors flex items-center gap-2"
                                         >
                                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                             ออกจากระบบ
                                         </button>
                                    </div>
                                )}
                             </div>
                         ) : (
                             <button 
                                onClick={onLoginClick}
                                className={`${glassBtnPrimary} ml-3 px-5 py-2 rounded-full text-sm font-bold`}
                             >
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                 เข้าสู่ระบบ
                             </button>
                         )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`p-2 rounded-xl transition-all duration-300 ${isMobileMenuOpen ? 'bg-white/30 rotate-90 shadow-inner' : 'hover:bg-white/10'} text-white shadow-sm relative`}
                            aria-label="Open navigation menu"
                        >
                             {pendingCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                             )}
                             {isMobileMenuOpen ? (
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                             ) : (
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                             )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay - Enhanced Glassmorphism & Accordion */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden absolute top-full left-0 right-0 bg-white/85 backdrop-blur-lg shadow-2xl border-t border-white/40 p-4 max-h-[85vh] overflow-y-auto z-40 animate-fade-in-down rounded-b-3xl m-2 mt-1 border border-gray-100/50">
                        <div className="space-y-2 pb-4">
                            {/* Home Link */}
                            <button 
                                onClick={() => handleNav('stats')}
                                className={`block w-full text-left px-5 py-3.5 rounded-xl text-base font-medium transition-all duration-200 active:scale-[0.98] flex items-center gap-3 ${currentPage === 'stats' ? 'bg-blue-50/80 text-primary-blue font-bold shadow-inner border border-blue-100' : 'text-gray-700 hover:bg-white/50'}`}
                            >
                                <div className={`p-2 rounded-lg ${currentPage === 'stats' ? 'bg-white shadow-sm text-primary-blue' : 'bg-gray-100 text-gray-500'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                </div>
                                หน้าหลัก
                            </button>
                            
                            {/* Accordion Menus */}
                            {currentUser && menuStructure.map((menu) => {
                                const isExpanded = mobileExpandedMenu === menu.key;
                                const isActive = menu.items.some(i => i.page === currentPage);
                                
                                return (
                                    <div key={menu.key} className={`rounded-xl overflow-hidden transition-all duration-300 border ${isExpanded ? 'bg-white/60 border-blue-100 shadow-sm' : 'border-transparent hover:bg-white/40'}`}>
                                        <button
                                            onClick={() => toggleMobileSubmenu(menu.key as string)}
                                            className={`w-full flex items-center justify-between px-5 py-3.5 text-base font-medium ${isActive ? 'text-primary-blue' : 'text-gray-700'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100 text-primary-blue' : 'bg-gray-100/80 text-gray-500'}`}>
                                                    {menu.icon}
                                                </div>
                                                <span>{menu.label}</span>
                                                {menu.key === 'data' && pendingCount > 0 && (
                                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
                                                )}
                                            </div>
                                            <svg 
                                                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary-blue' : ''}`} 
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        
                                        {/* Submenu Content with Smooth Expansion */}
                                        <div 
                                            className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                        >
                                            <div className="bg-white/40 py-2 px-4 space-y-1 border-t border-gray-100/50 backdrop-blur-sm m-2 rounded-lg">
                                                {menu.items.map(item => (
                                                    <button
                                                        key={item.page}
                                                        onClick={() => handleNav(item.page)}
                                                        className={`block w-full text-left px-4 py-3 text-sm rounded-lg transition-all flex items-center justify-between ${currentPage === item.page ? 'bg-white text-primary-blue font-bold shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-white/80 hover:text-primary-blue'}`}
                                                    >
                                                        {item.label}
                                                        {currentPage === item.page ? (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-blue"></div>
                                                        ) : (
                                                            item.page === 'personnel' && pendingCount > 0 && (
                                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                                                            )
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {currentUser && currentUser.role === 'admin' && (
                                <button 
                                    onClick={() => handleNav('admin')}
                                    className={`block w-full text-left px-5 py-3.5 rounded-xl text-base font-medium transition-all duration-200 flex items-center gap-3 ${currentPage === 'admin' ? 'bg-blue-50/80 text-primary-blue font-bold shadow-inner border border-blue-100' : 'text-gray-700 hover:bg-white/50'}`}
                                >
                                    <div className={`p-2 rounded-lg ${currentPage === 'admin' ? 'bg-white shadow-sm text-primary-blue' : 'bg-gray-100 text-gray-500'}`}>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                    ตั้งค่าระบบ
                                </button>
                            )}
                        </div>

                        <div className="pt-4 mt-2 border-t border-gray-200/60">
                            {currentUser ? (
                                <div className="space-y-3 bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm backdrop-blur-sm">
                                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200/50">
                                        <div className="w-12 h-12 rounded-full bg-white overflow-hidden border-2 border-white shadow-md">
                                            {userProfileImg ? (
                                                <img src={userProfileImg} alt="User" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-lg font-bold text-gray-400">{currentUser.personnelName.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 text-lg">{currentUser.personnelName}</div>
                                            <div className="text-xs text-gray-500 font-medium">{currentUser.position}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => handleNav('profile')}
                                            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition-all active:scale-[0.95]"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            ข้อมูลส่วนตัว
                                        </button>
                                        <button 
                                            onClick={() => { onLogoutClick(); setIsMobileMenuOpen(false); }}
                                            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-red-500/90 hover:bg-red-600 rounded-xl border border-red-400 shadow-sm transition-all active:scale-[0.95] backdrop-blur-md"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                                    className="w-full bg-gradient-to-r from-primary-blue/90 to-blue-600/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200/50 active:scale-[0.95] transition-transform flex items-center justify-center gap-2 text-lg backdrop-blur-sm border border-white/20"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    เข้าสู่ระบบ
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;