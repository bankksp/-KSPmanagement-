
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DormitoryStat } from '../types';

interface ReportChartProps {
  data: DormitoryStat[];
}

const ReportChart: React.FC<ReportChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <BarChart
                data={data}
                margin={{
                    top: 5,
                    right: 20,
                    left: 0,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#0A2240" name="จำนวนนักเรียน" />
                <Bar dataKey="sick" fill="#EF4444" name="ป่วย" />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ReportChart;
