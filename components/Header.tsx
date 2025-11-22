
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDirectDriveImageSrc, getFirstImageSource } from '../utils';
import { Personnel } from '../types';

// Update type to include the new route
type Page = 'stats' | 'attendance' | 'attendance_personnel' | 'reports' | 'students' | 'personnel' | 'admin' | 'profile';

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

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, currentPage, schoolName, schoolLogo, 
    currentUser, onLoginClick, onLogoutClick 
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAttendanceDropdownOpen, setIsAttendanceDropdownOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    
    // Ref for click outside
    const attendanceDropdownRef = useRef<HTMLDivElement>(null);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    const navButtonStyle = "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap";
    const activeNavButtonStyle = "bg-white/20";
    const inactiveNavButtonStyle = "hover:bg-white/10";
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (attendanceDropdownRef.current && !attendanceDropdownRef.current.contains(event.target as Node)) {
                setIsAttendanceDropdownOpen(false);
            }
             if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMobileNav = (page: Page) => {
        onNavigate(page);
        setIsMobileMenuOpen(false);
        setIsAttendanceDropdownOpen(false);
    };

    const logoSrc = getDirectDriveImageSrc(schoolLogo);
    const userProfileImg = useMemo(() => currentUser ? getFirstImageSource(currentUser.profileImage) : null, [currentUser]);

    return (
        <header className="bg-gradient-to-r from-primary-blue to-blue-700 text-white shadow-lg sticky top-0 z-20 no-print">
            <div className="container mx-auto px-3 py-2 md:py-3 flex justify-between items-center">
                <div className="flex items-center gap-2 overflow-hidden flex-shrink">
                    <img 
                        src={logoSrc} 
                        alt="School Logo" 
                        className="h-8 w-8 md:h-10 md:w-10 object-contain bg-white p-1 rounded-full flex-shrink-0"
                        onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                    />
                     <h1 className="text-sm md:text-lg font-bold whitespace-nowrap truncate max-w-[140px] sm:max-w-md">{schoolName}</h1>
                </div>
                
                <div className="flex items-center">
                    <div className="md:hidden ml-2">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
                            aria-label="Open navigation menu"
                        >
                             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1 flex-grow justify-end">
                         <button 
                            onClick={() => onNavigate('stats')}
                            className={`${navButtonStyle} ${currentPage === 'stats' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             สถิติ
                         </button>
                         
                         {currentUser && (
                            <>
                                {/* Attendance Dropdown */}
                                <div className="relative" ref={attendanceDropdownRef}>
                                    <button 
                                        className={`${navButtonStyle} ${currentPage === 'attendance' || currentPage === 'attendance_personnel' ? activeNavButtonStyle : inactiveNavButtonStyle} flex items-center gap-1`}
                                        onClick={() => setIsAttendanceDropdownOpen(!isAttendanceDropdownOpen)}
                                    >
                                        ระบบเช็คชื่อ
                                        <svg className={`w-4 h-4 transition-transform duration-200 ${isAttendanceDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    
                                    {isAttendanceDropdownOpen && (
                                        <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-30 text-gray-800 origin-top-left border border-gray-100">
                                            <button 
                                                onClick={() => { onNavigate('attendance'); setIsAttendanceDropdownOpen(false); }}
                                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-primary-blue transition-colors"
                                            >
                                                เช็คชื่อนักเรียน
                                            </button>
                                            <button 
                                                onClick={() => { onNavigate('attendance_personnel'); setIsAttendanceDropdownOpen(false); }}
                                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-purple-600 font-medium transition-colors"
                                            >
                                                เช็คชื่อครู
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => onNavigate('reports')}
                                    className={`${navButtonStyle} ${currentPage === 'reports' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                >
                                    รายงาน
                                </button>
                                <button 
                                    onClick={() => onNavigate('students')}
                                    className={`${navButtonStyle} ${currentPage === 'students' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                >
                                    นักเรียน
                                </button>
                                <button 
                                    onClick={() => onNavigate('personnel')}
                                    className={`${navButtonStyle} ${currentPage === 'personnel' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                >
                                    บุคลากร
                                </button>
                                
                                {currentUser?.role === 'admin' && (
                                    <button 
                                        onClick={() => onNavigate('admin')}
                                        className={`${navButtonStyle} ${currentPage === 'admin' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                    >
                                        ตั้งค่าระบบ
                                    </button>
                                )}
                            </>
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
                                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-30 text-gray-800 border border-gray-100">
                                         <div className="px-4 py-2 text-xs text-gray-500 border-b mb-1">
                                            สถานะ: <span className="font-bold text-primary-blue uppercase">{currentUser.role || 'USER'}</span>
                                         </div>
                                         <button 
                                            onClick={() => { onNavigate('profile'); setIsProfileDropdownOpen(false); }}
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

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-primary-blue/95 backdrop-blur-sm shadow-lg border-t border-white/10 absolute w-full left-0 z-30 max-h-[90vh] overflow-y-auto">
                    <div className="container mx-auto px-2 pt-2 pb-3 space-y-1">
                        {currentUser && (
                            <div className="flex items-center gap-3 p-3 border-b border-white/20 mb-2">
                                 <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden border border-white/50">
                                    {userProfileImg ? (
                                        <img src={userProfileImg} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-sm font-bold">{currentUser.personnelName.charAt(0)}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold">{currentUser.personnelName}</div>
                                    <div className="text-xs opacity-80 uppercase">Role: {currentUser.role || 'USER'}</div>
                                </div>
                            </div>
                        )}

                         <button 
                            onClick={() => handleMobileNav('stats')}
                            className={`${navButtonStyle} w-full text-left ${currentPage === 'stats' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             สถิติทั้งหมด
                         </button>
                         
                         {currentUser && (
                            <>
                                 <div className="pl-4 space-y-1 border-l-2 border-white/20 ml-2 my-1">
                                    <p className="text-xs text-blue-200 px-3 py-1 font-semibold opacity-75">ระบบเช็คชื่อ</p>
                                    <button 
                                        onClick={() => handleMobileNav('attendance')}
                                        className={`${navButtonStyle} w-full text-left ${currentPage === 'attendance' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                    >
                                        - เช็คชื่อนักเรียน
                                    </button>
                                    <button 
                                        onClick={() => handleMobileNav('attendance_personnel')}
                                        className={`${navButtonStyle} w-full text-left ${currentPage === 'attendance_personnel' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                    >
                                        - เช็คชื่อครู
                                    </button>
                                 </div>

                                 <button 
                                    onClick={() => handleMobileNav('reports')}
                                    className={`${navButtonStyle} w-full text-left ${currentPage === 'reports' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                 >
                                     รายงานเรือนนอน
                                 </button>
                                 <button 
                                    onClick={() => handleMobileNav('students')}
                                    className={`${navButtonStyle} w-full text-left ${currentPage === 'students' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                 >
                                     ข้อมูลนักเรียน
                                 </button>
                                 <button 
                                    onClick={() => handleMobileNav('personnel')}
                                    className={`${navButtonStyle} w-full text-left ${currentPage === 'personnel' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                 >
                                     ข้อมูลบุคลากร
                                 </button>
                                 
                                 {currentUser?.role === 'admin' && (
                                      <button 
                                        onClick={() => handleMobileNav('admin')}
                                        className={`${navButtonStyle} w-full text-left ${currentPage === 'admin' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                     >
                                         ตั้งค่าระบบ
                                     </button>
                                 )}
                            </>
                         )}

                         <div className="border-t border-white/20 pt-2 mt-2">
                            {currentUser ? (
                                <>
                                    <button 
                                        onClick={() => handleMobileNav('profile')}
                                        className={`${navButtonStyle} w-full text-left ${currentPage === 'profile' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                                    >
                                        โปรไฟล์
                                    </button>
                                    <button 
                                        onClick={() => { onLogoutClick(); setIsMobileMenuOpen(false); }}
                                        className={`${navButtonStyle} w-full text-left hover:bg-red-500/20 text-red-200`}
                                    >
                                        ออกจากระบบ
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                                    className="w-full bg-white text-primary-blue font-bold py-2 rounded-md shadow-sm mt-2"
                                >
                                    เข้าสู่ระบบ
                                </button>
                            )}
                         </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
