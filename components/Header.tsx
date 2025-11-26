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
    // const mobileSubMenuClass = "pl-2 pr-2 py-2 space-y-1 mt-1 mb-2 bg-gray-50/80 rounded-xl border border-gray-100 mx-2 shadow-inner";
    // const mobileSubItemClass = "block w-full text-left px-4 py-3 text-sm text-gray-600 hover:text-primary-blue hover:bg-white rounded-lg transition-all active:bg-gray-100 flex items-center gap-2";

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
                { label: 'รายงานเรือนนอน', page: 'reports' as Page },
                { label: 'เยี่ยมบ้านนักเรียน', page: 'student_home_visit' as Page }
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
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors border-t mt-1"
                                         >
                                             ออกจากระบบ
                                         </button>
                                    </div>
                                )}
                             </div>
                         ) : (
                             <button 
                                onClick={onLoginClick}
                                className="ml-2 bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-white/30"
                             >
                                 เข้าสู่ระบบ
                             </button>
                         )}
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-xl border-t border-gray-100 p-4 max-h-[85vh] overflow-y-auto z-40 animate-fade-in-down">
                        <div className="space-y-2 pb-4">
                            <button 
                                onClick={() => handleNav('stats')}
                                className={currentPage === 'stats' ? mobileActiveNavLinkClass : mobileNavLinkClass}
                            >
                                หน้าหลัก
                            </button>
                            
                            {currentUser && menuStructure.map((menu) => (
                                <div key={menu.key} className="border-b border-gray-50 last:border-0 pb-2">
                                    <div className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {menu.label}
                                    </div>
                                    <div className="space-y-1">
                                        {menu.items.map(item => (
                                            <button
                                                key={item.page}
                                                onClick={() => handleNav(item.page)}
                                                className={`${mobileNavLinkClass} ${currentPage === item.page ? 'bg-blue-50 text-primary-blue font-bold' : ''}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {currentUser && currentUser.role === 'admin' && (
                                <button 
                                    onClick={() => handleNav('admin')}
                                    className={currentPage === 'admin' ? mobileActiveNavLinkClass : mobileNavLinkClass}
                                >
                                    ตั้งค่าระบบ
                                </button>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            {currentUser ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 px-5 py-2">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                            {userProfileImg ? (
                                                <img src={userProfileImg} alt="User" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-500 font-bold">{currentUser.personnelName.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{currentUser.personnelName}</div>
                                            <div className="text-xs text-gray-500">{currentUser.position}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleNav('profile')}
                                        className="block w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                                    >
                                        แก้ไขข้อมูลส่วนตัว
                                    </button>
                                    <button 
                                        onClick={() => { onLogoutClick(); setIsMobileMenuOpen(false); }}
                                        className="block w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                                    >
                                        ออกจากระบบ
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                                    className="w-full bg-primary-blue text-white font-bold py-3 rounded-xl shadow-md"
                                >
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