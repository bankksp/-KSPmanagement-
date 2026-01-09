import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DormitoryStat } from '../types';

interface ReportChartProps {
  data: DormitoryStat[];
}

const ReportChart: React.FC<ReportChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart
            data={data}
            margin={{
                top: 10,
                right: 10,
                left: -20,
                bottom: 50,
            }}
            barGap={2}
        >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70} 
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
            <Bar dataKey="present" name="มา" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="sick" name="ป่วย" fill="#EF4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="home" name="อยู่บ้าน" fill="#9CA3AF" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
    </ResponsiveContainer>
  );
};

export default ReportChart;
