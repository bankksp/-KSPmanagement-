
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
    personnel?: Personnel[]; 
    onToggleSidebar: () => void;
    isDesktopSidebarOpen?: boolean;
    onToggleDesktopSidebar?: () => void;
}

type MenuKey = 'academic' | 'personnel' | 'finance' | 'general' | 'studentAffairs' | 'data' | null;

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, currentPage, schoolName, schoolLogo, 
    currentUser, onLoginClick, onLogoutClick, personnel = [],
    onToggleSidebar, onToggleDesktopSidebar
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
                { label: 'ขอเลขเกียรติบัตร', page: 'general_certs' as Page }
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
        <header className="bg-transparent pt-4 px-4 md:px-8 pb-2 flex justify-between items-center z-40 sticky top-0">
            <div className="flex items-center gap-4">
                {/* Mobile Toggle */}
                <div className="lg:hidden">
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 rounded-xl bg-white/80 backdrop-blur-md shadow-sm text-gray-600 hover:text-primary-blue transition-colors border border-white/50"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>

                {/* Desktop Sidebar Toggle */}
                <div className="hidden lg:block">
                    <button
                        onClick={onToggleDesktopSidebar}
                        className="p-2 rounded-xl bg-white/80 backdrop-blur-md shadow-sm text-gray-600 hover:text-primary-blue transition-colors border border-white/50"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Right Side: Profile / Login */}
            <div className="flex items-center gap-4 ml-auto">
                {currentUser ? (
                    <div className="relative group">
                        <button className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all border border-white/50">
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-bold text-gray-800">{currentUser.personnelName}</div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{currentUser.role || 'USER'}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-white shadow-sm overflow-hidden">
                                {userProfileImg ? (
                                    <img src={userProfileImg} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-lg font-bold text-primary-blue">{currentUser.personnelName.charAt(0)}</div>
                                )}
                            </div>
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-md rounded-xl shadow-xl py-2 border border-white/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                            <button 
                                onClick={() => onNavigate('profile')}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-primary-blue transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                ข้อมูลส่วนตัว
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button 
                                onClick={onLogoutClick}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={onLoginClick}
                        className="bg-white/80 backdrop-blur-md hover:bg-white text-primary-blue font-bold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all border border-white/50 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" /></svg>
                        เข้าสู่ระบบ
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
