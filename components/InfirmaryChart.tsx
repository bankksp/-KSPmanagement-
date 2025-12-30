
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface InfirmaryChartProps {
    data: { date: string; sickDorm: number; sickInfirmary: number }[];
}

const InfirmaryChart: React.FC<InfirmaryChartProps> = ({ data }) => {
    return (
        <div className="w-full h-[350px] bg-white p-4 rounded-xl shadow-lg">
             <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                แนวโน้มสถิติผู้ป่วย (7 วันย้อนหลัง)
             </h3>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorDorm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorInfirmary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" fontSize={12} tick={{ fill: '#4B5563' }} />
                    <YAxis fontSize={12} tick={{ fill: '#4B5563' }} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Area 
                        type="monotone" 
                        dataKey="sickDorm" 
                        name="ป่วย (ตามเรือนนอน)" 
                        stroke="#3B82F6" 
                        fillOpacity={1} 
                        fill="url(#colorDorm)" 
                        strokeWidth={2}
                        isAnimationActive={false}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="sickInfirmary" 
                        name="ป่วย (เรือนพยาบาล)" 
                        stroke="#EF4444" 
                        fillOpacity={1} 
                        fill="url(#colorInfirmary)" 
                        strokeWidth={2}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
export default InfirmaryChart;
