
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Personnel, Page } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc } from '../utils';

interface HeaderProps {
    onReportClick?: () => void;
    onNavigate: (page: Page) => void;
    currentPage: Page;
    schoolName: string;
    schoolLogo: string;
    currentUser: Personnel | null;
    onLoginClick: () => void;
    onLogoutClick: () => void;
    personnel?: Personnel[];
    onToggleSidebar: () => void;
    isDesktopSidebarOpen: boolean;
    onToggleDesktopSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, 
    currentUser, 
    onLoginClick, 
    onLogoutClick, 
    onToggleSidebar,
    onToggleDesktopSidebar,
    isDesktopSidebarOpen,
    schoolName,
    schoolLogo
}) => {
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userProfileImg = useMemo(() => currentUser ? getFirstImageSource(currentUser.profileImage) : null, [currentUser]);
    const logoSrc = getDirectDriveImageSrc(schoolLogo);

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:px-8 transition-all print:hidden bg-transparent pointer-events-none">
            {/* Left Side: Toggles - Pointer events auto to allow interaction */}
            <div className="flex items-center gap-4 pointer-events-auto">
                {/* Mobile Toggle */}
                <button 
                    onClick={onToggleSidebar}
                    className="lg:hidden p-2.5 rounded-xl bg-white/80 backdrop-blur-md shadow-sm border border-white/50 text-gray-600 hover:text-primary-blue hover:shadow-md transition-all active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Desktop Toggle */}
                <button 
                    onClick={onToggleDesktopSidebar}
                    className="hidden lg:flex p-2.5 rounded-xl bg-white/80 backdrop-blur-md shadow-sm border border-white/50 text-gray-500 hover:text-primary-blue hover:shadow-md transition-all active:scale-95 items-center justify-center"
                    title={isDesktopSidebarOpen ? "ย่อเมนู" : "ขยายเมนู"}
                >
                    <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopSidebarOpen ? 'rotate-0' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </button>
                
                {/* Mobile Logo Display (Hidden on Desktop) */}
                <div className="lg:hidden flex items-center gap-3 bg-white/80 backdrop-blur-md py-1.5 px-3 rounded-xl shadow-sm border border-white/50">
                     <img 
                        src={logoSrc} 
                        alt="logo" 
                        className="h-8 w-8 object-contain" 
                        onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')} 
                    />
                    <span className="font-bold text-navy text-sm truncate max-w-[150px]">{schoolName}</span>
                </div>
            </div>

            {/* Right Side: User Profile - Pointer events auto */}
            <div className="flex items-center gap-3 pointer-events-auto">
                {currentUser ? (
                    <div className="relative" ref={profileDropdownRef}>
                        <button 
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-white/90 backdrop-blur-xl shadow-sm border border-white/60 hover:shadow-md hover:bg-white transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-inner">
                                {userProfileImg ? (
                                    <img src={userProfileImg} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                ) : (
                                    <span className="font-bold text-lg text-primary-blue">{currentUser.personnelName.charAt(0)}</span>
                                )}
                            </div>
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-bold text-gray-800 leading-none group-hover:text-primary-blue transition-colors">{currentUser.personnelName}</div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">{currentUser.role || 'USER'}</div>
                            </div>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden py-1 animate-fade-in-up origin-top-right ring-1 ring-black/5">
                                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 md:hidden">
                                    <p className="text-sm font-bold text-gray-800 truncate">{currentUser.personnelName}</p>
                                    <p className="text-xs text-gray-500">{currentUser.role || 'USER'}</p>
                                </div>
                                <button 
                                    onClick={() => { onNavigate('profile'); setIsProfileDropdownOpen(false); }}
                                    className="w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-primary-blue flex items-center gap-3 transition-colors font-medium"
                                >
                                    <div className="p-1.5 bg-blue-100 rounded-lg text-primary-blue">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    ข้อมูลส่วนตัว
                                </button>
                                <div className="border-t border-gray-100/50 my-1"></div>
                                <button 
                                    onClick={() => { onLogoutClick(); setIsProfileDropdownOpen(false); }}
                                    className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                                >
                                    <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    </div>
                                    ออกจากระบบ
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button 
                        onClick={onLoginClick}
                        className="bg-white/90 backdrop-blur-md hover:bg-white text-primary-blue px-6 py-2.5 rounded-full font-bold shadow-sm hover:shadow-md border border-white/50 transition-all text-sm flex items-center gap-2 group"
                    >
                        <div className="bg-blue-100 p-1 rounded-full group-hover:bg-primary-blue group-hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" /></svg>
                        </div>
                        เข้าสู่ระบบ
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
