
import React, { useState, useMemo } from 'react';
import { Report } from '../types';
import { formatThaiDateTime } from '../utils';

interface ReportTableProps {
    reports: Report[];
    deleteReports: (ids: number[]) => void;
    onViewReport: (report: Report) => void;
    onEditReport: (report: Report) => void;
}

const ReportTable: React.FC<ReportTableProps> = ({ reports, deleteReports, onViewReport, onEditReport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmCode, setConfirmCode] = useState('');

    const filteredReports = useMemo(() => {
        return reports.filter(report =>
            report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.dormitory.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [reports, searchTerm]);

    const handleSelect = (id: number) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredReports.map(r => r.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleDeleteClick = () => {
        if(selectedIds.size > 0) {
            setShowConfirm(true);
        }
    }
    
    const handleConfirmDelete = () => {
        if (confirmCode === 'ksp1234') {
            deleteReports(Array.from(selectedIds));
            setSelectedIds(new Set());
            setShowConfirm(false);
            setConfirmCode('');
            alert('ลบข้อมูลสำเร็จ');
        } else {
            alert('รหัสไม่ถูกต้อง');
        }
    }

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 no-print">
                <input
                    type="text"
                    placeholder="ค้นหาชื่อ หรือ เรือนนอน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue text-sm"
                />
                 {selectedIds.size > 0 && (
                     <button 
                        onClick={handleDeleteClick}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 text-sm"
                    >
                         ลบ {selectedIds.size} รายการ
                    </button>
                 )}
            </div>
            
             {showConfirm && (
                <div className="my-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg flex flex-col sm:flex-row items-center gap-4 no-print">
                    <input
                        type="password"
                        placeholder="กรอกรหัสยืนยัน"
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button onClick={handleConfirmDelete} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">ยืนยัน</button>
                    <button onClick={() => setShowConfirm(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">ยกเลิก</button>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full bg-white">
                    <thead className="bg-navy text-white">
                        <tr>
                            <th className="p-2 md:p-3 text-left no-print w-8"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredReports.length} /></th>
                            <th className="p-2 md:p-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap">วัน เวลา</th>
                            <th className="p-2 md:p-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap">เรือนนอน</th>
                            <th className="p-2 md:p-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap">ผู้รายงาน</th>
                            <th className="p-2 md:p-3 text-center text-xs md:text-sm font-semibold whitespace-nowrap">มา/ป่วย</th>
                            <th className="p-2 md:p-3 text-center no-print text-xs md:text-sm font-semibold whitespace-nowrap">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReports.map((report) => (
                            <tr key={report.id} className="border-b hover:bg-gray-50">
                                <td className="p-2 md:p-3 no-print"><input type="checkbox" checked={selectedIds.has(report.id)} onChange={() => handleSelect(report.id)} /></td>
                                <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">
                                    {formatThaiDateTime(report.reportDate, report.reportTime)}
                                </td>
                                <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{report.dormitory}</td>
                                <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap max-w-[100px] md:max-w-[200px] truncate">{report.reporterName}</td>
                                <td className="p-2 md:p-3 text-center text-xs md:text-sm whitespace-nowrap">
                                    {report.dormitory !== 'เรือนพยาบาล' ? (
                                        <span>
                                            <span className="text-green-600 font-bold">{report.presentCount}</span> / <span className="text-red-600 font-bold">{report.sickCount}</span>
                                        </span>
                                    ) : (
                                        <span className="text-red-600 font-bold">{report.sickCount} (ป่วย)</span>
                                    )}
                                </td>
                                <td className="p-2 md:p-3 text-center no-print whitespace-nowrap">
                                    <div className="flex justify-center items-center gap-2">
                                        <button 
                                          onClick={() => onViewReport(report)}
                                          className="text-xs md:text-sm bg-sky-100 text-sky-800 font-semibold py-1 px-2 md:px-3 rounded-md hover:bg-sky-200 transition-colors"
                                        >
                                          ดู
                                        </button>
                                        <button 
                                          onClick={() => onEditReport(report)}
                                          className="text-xs md:text-sm bg-amber-100 text-amber-800 font-semibold py-1 px-2 md:px-3 rounded-md hover:bg-amber-200 transition-colors"
                                        >
                                          แก้
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredReports.length === 0 && <p className="text-center p-4 text-gray-500 text-sm">ไม่พบข้อมูล</p>}
            </div>
        </div>
    );
};

export default ReportTable;
