
import React, { useState } from 'react';
import { getDirectDriveImageSrc } from '../utils';

type Page = 'stats' | 'attendance' | 'reports' | 'students' | 'personnel' | 'admin';

interface HeaderProps {
    onReportClick: () => void; // Kept for interface compatibility if needed, but unused in UI
    onNavigate: (page: Page) => void;
    currentPage: Page;
    schoolName: string;
    schoolLogo: string;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, schoolName, schoolLogo }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const navButtonStyle = "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap";
    const activeNavButtonStyle = "bg-white/20";
    const inactiveNavButtonStyle = "hover:bg-white/10";
    
    const handleMobileNav = (page: Page) => {
        onNavigate(page);
        setIsMobileMenuOpen(false);
    };

    const logoSrc = getDirectDriveImageSrc(schoolLogo);

    return (
        <header className="bg-gradient-to-r from-primary-blue to-blue-700 text-white shadow-lg sticky top-0 z-20 no-print">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar w-full">
                    <div className="flex-shrink-0 flex items-center gap-2 mr-2">
                        <img 
                            src={logoSrc} 
                            alt="School Logo" 
                            className="h-10 w-10 object-contain bg-white p-1 rounded-full"
                            onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                        />
                         <h1 className="text-lg font-bold hidden lg:block whitespace-nowrap">{schoolName}</h1>
                    </div>
                    
                    <div className="sm:hidden ml-auto">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-md hover:bg-white/20 transition-colors"
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
                    <div className="hidden sm:flex items-center gap-1 overflow-x-auto flex-grow justify-end">
                         <button 
                            onClick={() => onNavigate('stats')}
                            className={`${navButtonStyle} ${currentPage === 'stats' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             สถิติข้อมูลการรายงาน
                         </button>
                         <button 
                            onClick={() => onNavigate('attendance')}
                            className={`${navButtonStyle} ${currentPage === 'attendance' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ระบบเช็คชื่อ
                         </button>
                         <button 
                            onClick={() => onNavigate('reports')}
                            className={`${navButtonStyle} ${currentPage === 'reports' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ระบบรายงาน
                         </button>
                         <button 
                            onClick={() => onNavigate('students')}
                            className={`${navButtonStyle} ${currentPage === 'students' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ข้อมูลนักเรียน
                         </button>
                         <button 
                            onClick={() => onNavigate('personnel')}
                            className={`${navButtonStyle} ${currentPage === 'personnel' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ข้อมูลบุคลากร
                         </button>
                         <button 
                            onClick={() => onNavigate('admin')}
                            className={`${navButtonStyle} ${currentPage === 'admin' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ระบบ Admin
                         </button>
                    </div>
                </div>
            </div>
            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="sm:hidden bg-primary-blue/95 backdrop-blur-sm shadow-lg">
                    <div className="container mx-auto px-2 pt-2 pb-3 space-y-1">
                         <button 
                            onClick={() => handleMobileNav('stats')}
                            className={`${navButtonStyle} w-full text-left ${currentPage === 'stats' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             สถิติข้อมูลการรายงาน
                         </button>
                         <button 
                            onClick={() => handleMobileNav('attendance')}
                            className={`${navButtonStyle} w-full text-left ${currentPage === 'attendance' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ระบบเช็คชื่อ
                         </button>
                         <button 
                            onClick={() => handleMobileNav('reports')}
                            className={`${navButtonStyle} w-full text-left ${currentPage === 'reports' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ระบบรายงาน
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
                          <button 
                            onClick={() => handleMobileNav('admin')}
                            className={`${navButtonStyle} w-full text-left ${currentPage === 'admin' ? activeNavButtonStyle : inactiveNavButtonStyle}`}
                         >
                             ระบบ Admin
                         </button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
