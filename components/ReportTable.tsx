
import React, { useState, useMemo } from 'react';
import { Report } from '../types';

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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 no-print">
                <input
                    type="text"
                    placeholder="ค้นหาชื่อผู้รายงานหรือเรือนนอน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
                 {selectedIds.size > 0 && (
                     <button 
                        onClick={handleDeleteClick}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300"
                    >
                         ลบ {selectedIds.size} รายการที่เลือก
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

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-navy text-white">
                        <tr>
                            <th className="p-3 text-left no-print"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredReports.length} /></th>
                            <th className="p-3 text-left">วันที่/เวลา</th>
                            <th className="p-3 text-left">เรือนนอน</th>
                            <th className="p-3 text-left">ชื่อผู้รายงาน</th>
                            <th className="p-3 text-center">มา</th>
                            <th className="p-3 text-center">ป่วย</th>
                            <th className="p-3 text-center">เรือนพยาบาล</th>
                            <th className="p-3 text-center no-print">การกระทำ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReports.map((report) => (
                            <tr key={report.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 no-print"><input type="checkbox" checked={selectedIds.has(report.id)} onChange={() => handleSelect(report.id)} /></td>
                                <td className="p-3">{report.reportDate}{report.reportTime ? ` ${report.reportTime} น.` : ''}</td>
                                <td className="p-3">{report.dormitory}</td>
                                <td className="p-3">{report.reporterName}</td>
                                <td className="p-3 text-center">{report.dormitory !== 'เรือนพยาบาล' ? report.presentCount : '-'}</td>
                                <td className="p-3 text-center">{report.sickCount}</td>
                                <td className="p-3 text-center">{report.dormitory === 'เรือนพยาบาล' ? report.sickCount : '-'}</td>
                                <td className="p-3 text-center no-print">
                                    <div className="flex justify-center items-center gap-2">
                                        <button 
                                          onClick={() => onViewReport(report)}
                                          className="text-sm bg-sky-100 text-sky-800 font-semibold py-1 px-3 rounded-md hover:bg-sky-200 transition-colors"
                                        >
                                          ดู
                                        </button>
                                        <button 
                                          onClick={() => onEditReport(report)}
                                          className="text-sm bg-amber-100 text-amber-800 font-semibold py-1 px-3 rounded-md hover:bg-amber-200 transition-colors"
                                        >
                                          แก้ไข
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredReports.length === 0 && <p className="text-center p-4">ไม่พบข้อมูล</p>}
            </div>
        </div>
    );
};

export default ReportTable;