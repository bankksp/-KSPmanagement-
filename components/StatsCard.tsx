
import React from 'react';

interface StatsCardProps {
    title: string;
    value: string;
    icon?: React.ReactNode;
    color?: string; // Tailwind bg color class (e.g., 'bg-blue-500')
    description?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color = 'bg-blue-500', description }) => {
    return (
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-500 font-medium mb-1 truncate">{title}</p>
                <h4 className="text-2xl md:text-3xl font-bold text-gray-800 truncate">{value}</h4>
                {description && <p className="text-[10px] md:text-xs text-gray-400 mt-1 truncate">{description}</p>}
            </div>
            <div className={`p-2 md:p-3 rounded-xl text-white shadow-lg ${color} bg-opacity-90 flex items-center justify-center flex-shrink-0`}>
                {icon || (
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
