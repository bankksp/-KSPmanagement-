
import React, { useState, useMemo } from 'react';
import { Report, Student, Personnel } from '../types';
import StatsCard from './StatsCard';
import ReportChart from './ReportChart';
import { getDirectDriveImageSrc } from '../utils';

interface DashboardProps {
    reports: Report[];
    students: Student[];
    personnel: Personnel[];
    dormitories: string[];
    schoolName: string;
    schoolLogo: string;
}

const parseThaiDate = (dateString: string): Date => {
    const parts = dateString.split('/');
    if (parts.length !== 3) return new Date(0); // Return an invalid date for comparison
    const [day, month, year] = parts.map(Number);
    const gregorianYear = year - 543;
    return new Date(gregorianYear, month - 1, day);
};

const Dashboard: React.FC<DashboardProps> = ({ 
    reports, students, personnel, dormitories, schoolName, schoolLogo
}) => {
    // Default to today's date in YYYY-MM-DD format for the input
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const { dormitoryData, totalStudentsReport, totalSick, titleSuffix, displayDate } = useMemo(() => {
        const [yearStr, monthStr, dayStr] = selectedDate.split('-');
        const targetDay = parseInt(dayStr);
        const targetMonth = parseInt(monthStr) - 1; 
        const targetYear = parseInt(yearStr);

        // Convert selected date to Buddhist year for display
        const buddhistYear = targetYear + 543;
        const displayDateString = `${targetDay}/${targetMonth + 1}/${buddhistYear}`;

        const filterFn = (r: Report) => {
            const d = parseThaiDate(r.reportDate);
            return d.getDate() === targetDay && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        };

        const filteredReports = reports.filter(filterFn);
        
        const aggregatedByDorm = filteredReports.reduce((acc, report) => {
            if (report.dormitory === 'เรือนพยาบาล') {
                if(!acc['เรือนพยาบาล']) acc['เรือนพยาบาล'] = { presentCount: 0, sickCount: 0 };
                acc['เรือนพยาบาล'].sickCount += report.sickCount;
                return acc;
            }

            if (!acc[report.dormitory]) {
                acc[report.dormitory] = { presentCount: 0, sickCount: 0 };
            }
            acc[report.dormitory].presentCount += report.presentCount;
            acc[report.dormitory].sickCount += report.sickCount;
            return acc;
        }, {} as Record<string, { presentCount: number, sickCount: number }>);


        const finalDormitoryData = dormitories.filter(d => d !== "เรือนพยาบาล").map(dormName => {
            const stats = aggregatedByDorm[dormName];
            return {
                name: dormName,
                total: stats ? stats.presentCount + stats.sickCount : 0,
                sick: stats ? stats.sickCount : 0,
            };
        });

        const finalTotalStudents = Object.values(aggregatedByDorm).reduce((sum, dorm) => sum + (dorm.presentCount || 0), 0);
        const finalTotalSick = Object.values(aggregatedByDorm).reduce((sum, dorm) => sum + (dorm.sickCount || 0), 0);

        return {
            dormitoryData: finalDormitoryData,
            totalStudentsReport: finalTotalStudents,
            totalSick: finalTotalSick,
            titleSuffix: `(ประจำวันที่ ${displayDateString})`,
            displayDate: `ข้อมูลวันที่ ${displayDateString}`
        };

    }, [reports, dormitories, selectedDate]);
    
    const logoSrc = getDirectDriveImageSrc(schoolLogo);

    // --- Export Functions ---

    const exportToCSV = () => {
        const headers = ['เรือนนอน', 'จำนวนนักเรียนมา', 'จำนวนป่วย'];
        const rows = dormitoryData.map(d => [d.name, d.total, d.sick]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + "\uFEFF" // BOM for Thai char support
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        // Add Summary rows
        csvContent += `\nรวมทั้งหมด,${totalStudentsReport},${totalSick}`;
        csvContent += `\n\nข้อมูลวันที่,${displayDate}`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_stats_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    const exportToDoc = () => {
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
        const postHtml = "</body></html>";
        
        const content = `
            <div style="text-align:center; font-family: 'TH Sarabun New', sans-serif;">
                <h1>${schoolName}</h1>
                <h2>รายงานสถิติจำนวนนักเรียน แยกประเภทตามเรือนนอน</h2>
                <h3>${displayDate}</h3>
                <br/>
                <table border="1" style="border-collapse: collapse; width: 100%; text-align: center;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 10px;">เรือนนอน</th>
                            <th style="padding: 10px;">จำนวนนักเรียน</th>
                            <th style="padding: 10px;">ป่วย</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dormitoryData.map(d => `
                            <tr>
                                <td style="padding: 8px;">${d.name}</td>
                                <td style="padding: 8px;">${d.total}</td>
                                <td style="padding: 8px; color: red;">${d.sick}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight: bold; background-color: #e6e6e6;">
                            <td style="padding: 8px;">รวม</td>
                            <td style="padding: 8px;">${totalStudentsReport}</td>
                            <td style="padding: 8px;">${totalSick}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const html = preHtml + content + postHtml;
        const blob = new Blob(['\ufeff', html], {
            type: 'application/msword'
        });
        
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const link = document.createElement("a");
        link.href = url;
        link.download = `report_stats_${selectedDate}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="hidden print:block text-center my-8">
                <div className="flex justify-center items-center gap-4">
                    <img 
                        src={logoSrc} 
                        alt="School Logo" 
                        className="h-20 w-20 object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                    />
                    <div>
                        <h1 className="text-2xl font-bold text-navy">{schoolName}</h1>
                        <h2 className="text-xl font-semibold text-secondary-gray">รายงานสถิติจำนวนนักเรียน แยกประเภทตามเรือนนอน</h2>
                    </div>
                </div>
                 <p className="text-lg mt-4">{displayDate}</p>
            </div>
            
            {/* Overall Statistics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
                 <div className="bg-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-transform">
                    <h3 className="text-lg font-semibold opacity-90">นักเรียนทั้งหมดในระบบ</h3>
                    <p className="text-4xl font-bold mt-2">{students.length} คน</p>
                </div>
                <div className="bg-purple-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-transform">
                    <h3 className="text-lg font-semibold opacity-90">บุคลากรทั้งหมดในระบบ</h3>
                    <p className="text-4xl font-bold mt-2">{personnel.length} คน</p>
                </div>
                <StatsCard title={`นักเรียนมา (${titleSuffix})`} value={totalStudentsReport.toString()} />
                <StatsCard title={`นักเรียนป่วย (${titleSuffix})`} value={totalSick.toString()} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg printable-content">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-navy shrink-0">ภาพรวมนักเรียนแต่ละเรือนนอน {titleSuffix}</h2>
                        <p className="text-sm text-gray-500 no-print">{displayDate}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 no-print w-full xl:w-auto">
                        <label className="text-sm font-medium text-gray-700">ข้อมูลประจำเดือน:</label>
                        {/* Date Picker */}
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        />

                        {/* Export Dropdown */}
                        <div className="relative ml-2">
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>บันทึกข้อมูล</span>
                            </button>
                            
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                    <div className="py-1">
                                        <button onClick={() => { window.print(); setIsExportMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            พิมพ์ / บันทึกเป็น PDF
                                        </button>
                                        <button onClick={exportToCSV} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            ดาวน์โหลด Excel (CSV)
                                        </button>
                                        <button onClick={exportToDoc} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            ดาวน์โหลด Word (DOC)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <ReportChart data={dormitoryData} />

                {/* Data Table for Print View (Hidden on Screen) */}
                <div className="hidden print:block mt-8">
                     <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2">เรือนนอน</th>
                                <th className="border border-gray-300 p-2">จำนวนนักเรียน</th>
                                <th className="border border-gray-300 p-2">ป่วย</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dormitoryData.map(d => (
                                <tr key={d.name}>
                                    <td className="border border-gray-300 p-2">{d.name}</td>
                                    <td className="border border-gray-300 p-2 text-center">{d.total}</td>
                                    <td className="border border-gray-300 p-2 text-center text-red-600">{d.sick}</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                                <td className="border border-gray-300 p-2 text-right">รวม</td>
                                <td className="border border-gray-300 p-2 text-center">{totalStudentsReport}</td>
                                <td className="border border-gray-300 p-2 text-center">{totalSick}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
