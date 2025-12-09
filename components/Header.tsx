
import React, { useMemo } from 'react';
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
    onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, currentUser, onLoginClick, onLogoutClick, onToggleSidebar
}) => {
    const userProfileImg = useMemo(() => currentUser ? getFirstImageSource(currentUser.profileImage) : null, [currentUser]);

    return (
        <header className="bg-transparent pt-4 px-4 md:px-8 pb-2 flex justify-between items-center z-40 sticky top-0">
            {/* Mobile Toggle */}
            <div className="lg:hidden">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-xl bg-white/80 backdrop-blur-md shadow-sm text-gray-600 hover:text-primary-blue transition-colors border border-white/50"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </div>

            {/* Title / Breadcrumb (Desktop) */}
            <div className="hidden lg:block">
               {/* Optional: Add Breadcrumbs here if needed */}
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
