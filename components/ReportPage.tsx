
import React, { useMemo } from 'react';
import { Report } from '../types';
import ReportTable from './ReportTable';
import StatsCard from './StatsCard';
import { normalizeDate } from '../utils';

interface ReportPageProps {
    reports: Report[];
    deleteReports: (ids: number[]) => void;
    onViewReport: (report: Report) => void;
    onEditReport: (report: Report) => void;
    onAddReport: () => void;
}

const ReportPage: React.FC<ReportPageProps> = ({ reports, deleteReports, onViewReport, onEditReport, onAddReport }) => {

    // Calculate simple statistics for the report page
    const stats = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Filter for today's reports
        const todaysReports = reports.filter(r => {
            const d = normalizeDate(r.reportDate);
            if (!d) return false;
            return d.getDate() === currentDay && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalReportsToday = todaysReports.length;
        const sickToday = todaysReports.reduce((sum, r) => sum + r.sickCount, 0);
        
        return { totalReportsToday, sickToday, totalAllTime: reports.length };
    }, [reports]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h2 className="text-2xl font-bold text-navy">รายงานเรือนนอน</h2>
                 <button
                        onClick={onAddReport}
                        className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>เพิ่มรายงาน</span>
                </button>
            </div>

            {/* Summary Stats for Reporting System */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <StatsCard title="รายงานวันนี้" value={stats.totalReportsToday.toString()} />
                 <StatsCard title="ยอดป่วยวันนี้" value={stats.sickToday.toString()} />
                 <StatsCard title="รายงานทั้งหมดในระบบ" value={stats.totalAllTime.toString()} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-navy mb-4">รายการรายงานทั้งหมด</h2>
                <ReportTable 
                    reports={reports} 
                    deleteReports={deleteReports} 
                    onViewReport={onViewReport} 
                    onEditReport={onEditReport} 
                />
            </div>
        </div>
    );
};

export default ReportPage;
