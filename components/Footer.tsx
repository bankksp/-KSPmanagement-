
import React from 'react';
import { PROGRAM_LOGO } from '../constants';

const Footer: React.FC = () => {
    return (
        <footer className="bg-white/50 backdrop-blur-sm mt-8 py-6 shadow-inner no-print border-t border-gray-100">
            <div className="container mx-auto px-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                    <img src={PROGRAM_LOGO} className="h-6 w-auto grayscale opacity-40" alt="D" />
                    <div className="h-4 w-[1px] bg-gray-300"></div>
                    <p className="text-xs text-secondary-gray font-bold">
                        พัฒนาโดย ครูนันทพัทธ์ แสงสุดตา <span className="mx-2 text-gray-300">|</span> โรงเรียนกาฬสินธุ์ปัญญานุกูล
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">© 2025 D-school Smart Management Platform</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
