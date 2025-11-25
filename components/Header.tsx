
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
}

type MenuKey = 'academic' | 'personnel' | 'finance' | 'general' | 'studentAffairs' | 'data' | null;

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, currentPage, schoolName, schoolLogo, 
    currentUser, onLoginClick, onLogoutClick 
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<MenuKey>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

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

    const handleNav = (page: Page) => {
        onNavigate(page);
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
    };

    const logoSrc = getDirectDriveImageSrc(schoolLogo);
    const userProfileImg = useMemo(() => currentUser ? getFirstImageSource(currentUser.profileImage) : null, [currentUser]);

    // Styles
    const navLinkClass = "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 hover:bg-white/10";
    const activeNavLinkClass = "bg-white/20 " + navLinkClass;
    const dropdownClass = "absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg py-1 z-30 text-gray-800 border border-gray-100 animate-fade-in-up";
    const dropdownItemClass = "block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 hover:text-primary-blue transition-colors";
    
    // Mobile Styles - Updated for modern look
    const mobileNavLinkClass = "block w-full text-left px-5 py-4 rounded-xl text-base font-medium text-gray-700 hover:bg-blue-50/80 hover:text-primary-blue transition-all duration-200 active:scale-[0.99] flex justify-between items-center";
    const mobileActiveNavLinkClass = "block w-full text-left px-5 py-4 rounded-xl text-base font-bold text-primary-blue bg-blue-50 border border-blue-100 shadow-sm flex justify-between items-center";
    const mobileSubMenuClass = "pl-2 pr-2 py-2 space-y-1 mt-1 mb-2 bg-gray-50/80 rounded-xl border border-gray-100 mx-2 shadow-inner";
    const mobileSubItemClass = "block w-full text-left px-4 py-3 text-sm text-gray-600 hover:text-primary-blue hover:bg-white rounded-lg transition-all active:bg-gray-100 flex items-center gap-2";

    // Menu Structure Definition
    const menuStructure = [
        {
            key: 'academic',
            label: 'งานวิชาการ',
            items: [
                { label: 'แผนการสอน', page: 'academic_plans' as Page }
            ]
        },
        {
            key: 'personnel',
            label: 'งานบุคลากร',
            items: [
                { label: 'รายงานการปฏิบัติงาน', page: 'personnel_report' as Page },
                { label: 'รายงานผลการประเมินตนเอง SAR', page: 'personnel_sar' as Page }
            ]
        },
        {
            key: 'finance',
            label: 'การเงิน/พัสดุ',
            items: [
                { label: 'ระบบพัสดุ (วัสดุสิ้นเปลือง)', page: 'finance_supplies' as Page },
                { label: 'ระบบครุภัณฑ์', page: 'durable_goods' as Page }
            ]
        },
        {
            key: 'general',
            label: 'งานทั่วไป',
            items: [
                { label: 'หนังสือ/คำสั่ง', page: 'general_docs' as Page },
                { label: 'แจ้งซ่อม', page: 'general_repair' as Page },
                { label: 'ขอเลขเกียรติบัตร', page: 'general_certs' as Page }
            ]
        },
        {
            key: 'studentAffairs',
            label: 'กิจการนักเรียน',
            items: [
                { label: 'เช็คชื่อนักเรียน', page: 'attendance' as Page },
                { label: 'เช็คชื่อครู', page: 'attendance_personnel' as Page },
                { label: 'รายงานเรือนนอน', page: 'reports' as Page }
            ]
        },
        {
            key: 'data',
            label: 'ข้อมูลนักเรียน/ครู',
            items: [
                { label: 'ข้อมูลนักเรียน', page: 'students' as Page },
                { label: 'ข้อมูลบุคลากร', page: 'personnel' as Page }
            ]
        }
    ];

    return (
        <header className="bg-gradient-to-r from-primary-blue to-blue-700 text-white shadow-lg sticky top-0 z-50 no-print">
            <div className="container mx-auto px-3 py-2 md:py-3 flex justify-between items-center relative">
                {/* Logo & School Name */}
                <div className="flex items-center gap-2 overflow-hidden flex-shrink-0 cursor-pointer max-w-[70%] md:max-w-none" onClick={() => onNavigate('stats')}>
                    <img 
                        src={logoSrc} 
                        alt="School Logo" 
                        className="h-8 w-8 md:h-10 md:w-10 object-contain bg-white p-1 rounded-full flex-shrink-0 shadow-md"
                        onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                    />
                     <h1 className="text-xs sm:text-sm md:text-lg font-bold whitespace-normal leading-tight md:whitespace-nowrap truncate">{schoolName}</h1>
                </div>
                
                <div className="flex items-center">
                    {/* Mobile Menu Button */}
                    <div className="lg:hidden ml-2">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`p-2 rounded-lg transition-all duration-200 ${isMobileMenuOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
                            aria-label="Open navigation menu"
                        >
                             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1 flex-grow justify-end" ref={dropdownRef}>
                         <button 
                            onClick={() => onNavigate('stats')}
                            className={currentPage === 'stats' ? activeNavLinkClass : navLinkClass}
                         >
                             หน้าหลัก
                         </button>
                         
                         {currentUser && menuStructure.map((menu) => (
                             <div key={menu.key} className="relative">
                                 <button
                                    onClick={() => toggleDropdown(menu.key as MenuKey)}
                                    className={`${navLinkClass} ${activeDropdown === menu.key ? 'bg-white/10' : ''}`}
                                 >
                                     {menu.label}
                                     <svg className={`w-3 h-3 transition-transform duration-200 ${activeDropdown === menu.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                 </button>
                                 
                                 {activeDropdown === menu.key && (
                                     <div className={dropdownClass}>
                                         {menu.items.map(item => (
                                             <button
                                                key={item.page}
                                                onClick={() => { handleNav(item.page); }}
                                                className={`${dropdownItemClass} ${currentPage === item.page ? 'text-primary-blue font-bold bg-gray-50' : ''}`}
                                             >
                                                 {item.label}
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
                                ตั้งค่าระบบ
                            </button>
                         )}

                         {/* User Profile / Login */}
                         {currentUser ? (
                             <div className="relative ml-2" ref={profileDropdownRef}>
                                <button 
                                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    className="flex items-center gap-2 hover:bg-white/10 py-1 px-2 rounded-full transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden border border-white/50">
                                        {userProfileImg ? (
                                            <img src={userProfileImg} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs font-bold">{currentUser.personnelName.charAt(0)}</div>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium max-w-[100px] truncate">{currentUser.personnelName}</span>
                                </button>
                                
                                {isProfileDropdownOpen && (
                                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-30 text-gray-800 border border-gray-100 animate-fade-in-up">
                                         <div className="px-4 py-2 text-xs text-gray-500 border-b mb-1">
                                            สถานะ: <span className="font-bold text-primary-blue uppercase">{currentUser.role || 'USER'}</span>
                                         </div>
                                         <button 
                                            onClick={() => { handleNav('profile'); setIsProfileDropdownOpen(false); }}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-primary-blue transition-colors"
                                         >
                                             โปรไฟล์
                                         </button>
                                         <button 
                                            onClick={() => { onLogoutClick(); setIsProfileDropdownOpen(false); }}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                                         >
                                             ออกจากระบบ
                                         </button>
                                    </div>
                                )}
                             </div>
                         ) : (
                            <button 
                                onClick={onLoginClick}
                                className="ml-2 bg-white text-primary-blue hover:bg-blue-50 font-bold py-1.5 px-4 rounded-full text-sm transition-colors shadow-sm"
                            >
                                เข้าสู่ระบบ
                            </button>
                         )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden animate-fade-in"
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{ top: '60px' }} // Approx header height
                    ></div>

                    {/* Menu Content */}
                    <div className="lg:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl shadow-2xl border-t border-white/20 z-50 max-h-[85vh] overflow-y-auto rounded-b-3xl pb-6 transition-all duration-300 ease-out origin-top animate-slide-in-down">
                        <div className="container mx-auto px-4 pt-4 space-y-2">
                            {currentUser && (
                                <div className="flex items-center gap-4 p-4 mb-4 rounded-2xl bg-gradient-to-r from-blue-50 to-white border border-blue-100 shadow-sm">
                                     <div className="w-14 h-14 rounded-full bg-white overflow-hidden border-2 border-white shadow-md">
                                        {userProfileImg ? (
                                            <img src={userProfileImg} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xl font-bold text-gray-400 bg-gray-100">{currentUser.personnelName.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-bold text-lg text-navy truncate">{currentUser.personnelName}</div>
                                        <div className="text-xs font-semibold text-primary-blue bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-wide">
                                            {currentUser.role || 'USER'}
                                        </div>
                                    </div>
                                </div>
                            )}

                             <button 
                                onClick={() => handleNav('stats')}
                                className={currentPage === 'stats' ? mobileActiveNavLinkClass : mobileNavLinkClass}
                             >
                                 <div className="flex items-center gap-3">
                                    <span className="bg-blue-100 p-1.5 rounded-lg text-primary-blue"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></span>
                                    หน้าหลัก
                                 </div>
                             </button>
                             
                             {currentUser && menuStructure.map((menu) => (
                                 <div key={menu.key} className="bg-white rounded-xl border border-transparent hover:border-gray-100 transition-colors">
                                    <button
                                        onClick={() => toggleDropdown(menu.key as MenuKey)}
                                        className={`${mobileNavLinkClass} ${activeDropdown === menu.key ? 'bg-gray-50 text-primary-blue font-bold' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Icon placeholder based on key could go here, generic for now */}
                                            <span className={`p-1.5 rounded-lg ${activeDropdown === menu.key ? 'bg-blue-100 text-primary-blue' : 'bg-gray-100 text-gray-500'}`}>
                                                {activeDropdown === menu.key 
                                                    ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                    : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                                                }
                                            </span>
                                            {menu.label}
                                        </div>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${activeDropdown === menu.key ? 'rotate-180 text-primary-blue' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    
                                    {/* Submenu with animation */}
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${activeDropdown === menu.key ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className={mobileSubMenuClass}>
                                            {menu.items.map(item => (
                                                <button
                                                    key={item.page}
                                                    onClick={() => handleNav(item.page)}
                                                    className={`${mobileSubItemClass} ${currentPage === item.page ? 'font-bold text-primary-blue bg-white shadow-sm' : ''}`}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                 </div>
                             ))}
                             
                             {currentUser && currentUser.role === 'admin' && (
                                  <button 
                                    onClick={() => handleNav('admin')}
                                    className={currentPage === 'admin' ? mobileActiveNavLinkClass : mobileNavLinkClass}
                                 >
                                    <div className="flex items-center gap-3">
                                        <span className="bg-gray-100 p-1.5 rounded-lg text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span>
                                        ตั้งค่าระบบ
                                    </div>
                                 </button>
                             )}

                             <div className="pt-4 mt-4 border-t border-gray-100">
                                {currentUser ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => handleNav('profile')}
                                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            โปรไฟล์
                                        </button>
                                        <button 
                                            onClick={() => { onLogoutClick(); setIsMobileMenuOpen(false); }}
                                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                                        className="w-full bg-gradient-to-r from-primary-blue to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 mt-2 text-center flex items-center justify-center gap-2 transition-all transform active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        เข้าสู่ระบบ
                                    </button>
                                )}
                             </div>
                        </div>
                    </div>
                </>
            )}
        </header>
    );
};

export default Header;
