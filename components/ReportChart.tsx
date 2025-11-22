
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DormitoryStat } from '../types';

interface ReportChartProps {
  data: DormitoryStat[];
}

const ReportChart: React.FC<ReportChartProps> = ({ data }) => {
  // Vibrant color palette for dormitories
  const COLORS = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', 
    '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'
  ];

  return (
    <div className="w-full h-[350px] bg-white p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            สถิติจำนวนนักเรียนรายเรือนนอน
        </h3>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 20,
                }}
                barSize={40}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                    dataKey="name" 
                    angle={-30} 
                    textAnchor="end" 
                    height={60} 
                    fontSize={12} 
                    tick={{ fill: '#4B5563' }}
                    interval={0}
                />
                <YAxis fontSize={12} tick={{ fill: '#4B5563' }} />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: '#F3F4F6' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="total" name="จำนวนนักเรียน" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
                <Bar dataKey="sick" name="ป่วย" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ReportChart;
