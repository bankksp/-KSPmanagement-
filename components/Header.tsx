
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getFirstImageSource } from '../utils';
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
    onToggleSidebar?: () => void;
    isDesktopSidebarOpen?: boolean;
    onToggleDesktopSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, currentUser, onLoginClick, onLogoutClick,
    onToggleSidebar, onToggleDesktopSidebar
}) => {
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    const userProfileImg = useMemo(() => currentUser ? getFirstImageSource(currentUser.profileImage) : null, [currentUser]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="w-full px-4 md:px-6 py-4 flex justify-between items-center z-40 bg-transparent no-print">
            {/* Left: Sidebar Toggle */}
            <div className="flex items-center">
                <button
                    onClick={() => {
                        // Toggle logic handled by App.tsx props
                        if (window.innerWidth < 1024) {
                            if (onToggleSidebar) onToggleSidebar();
                        } else {
                            if (onToggleDesktopSidebar) onToggleDesktopSidebar();
                        }
                    }}
                    className="p-2.5 bg-white rounded-xl shadow-sm text-gray-600 hover:text-primary-blue hover:shadow-md transition-all border border-gray-100 group"
                    aria-label="Toggle Sidebar"
                >
                    <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Right: User Profile / Login */}
            <div className="flex items-center gap-3">
                {currentUser ? (
                    <div className="relative" ref={profileDropdownRef}>
                        <button 
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center gap-3 bg-white pl-4 pr-1.5 py-1.5 rounded-full shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                        >
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-gray-800 leading-tight group-hover:text-primary-blue transition-colors">{currentUser.personnelName}</div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{currentUser.role === 'admin' ? 'ADMIN' : currentUser.position}</div>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                                {userProfileImg ? (
                                    <img src={userProfileImg} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-sm font-bold text-gray-400">{currentUser.personnelName.charAt(0)}</div>
                                )}
                            </div>
                        </button>

                        {/* Dropdown */}
                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100 animate-fade-in-up">
                                <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                                    <p className="text-sm font-bold text-gray-800 truncate">{currentUser.personnelName}</p>
                                    <p className="text-xs text-gray-500 truncate">{currentUser.position}</p>
                                </div>
                                <button 
                                    onClick={() => { onNavigate('profile'); setIsProfileDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-blue transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    ข้อมูลส่วนตัว
                                </button>
                                <div className="border-t border-gray-50 my-1"></div>
                                <button 
                                    onClick={() => { onLogoutClick(); setIsProfileDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
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
                        className="bg-white text-navy border border-gray-200 hover:bg-primary-blue hover:text-white hover:border-primary-blue px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" /></svg>
                        เข้าสู่ระบบ
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
