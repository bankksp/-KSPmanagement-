import React from 'react';

interface StatsCardProps {
    title: string;
    value: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg text-center transition-transform transform hover:scale-105 border-l-4 border-primary-blue">
            <h3 className="text-md font-semibold text-secondary-gray">{title}</h3>
            <p className="text-4xl font-bold text-navy mt-2">{value}</p>
        </div>
    );
};

export default StatsCard;