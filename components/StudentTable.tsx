
import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { getFirstImageSource } from '../utils';

interface StudentTableProps {
    students: Student[];
    onViewStudent: (student: Student) => void;
    onEditStudent: (student: Student) => void;
    onDeleteStudents: (ids: number[]) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({ students, onViewStudent, onEditStudent, onDeleteStudents }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    const filteredStudents = useMemo(() => {
        return students.filter(student =>
            ((student.studentTitle || '') + (student.studentName || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.studentIdCard || '').includes(searchTerm)
        );
    }, [students, searchTerm]);

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
            setSelectedIds(new Set(filteredStudents.map(s => s.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleDelete = () => {
        if (selectedIds.size > 0) {
            if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedIds.size} รายการที่เลือก?`)) {
                onDeleteStudents(Array.from(selectedIds));
                setSelectedIds(new Set());
            }
        }
    }

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <input
                    type="text"
                    placeholder="ค้นหาชื่อ หรือ เลขบัตรประชาชน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/3 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue shadow-sm"
                />
                 {selectedIds.size > 0 && (
                     <button 
                        onClick={handleDelete}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl shadow transition duration-300 flex items-center justify-center gap-2"
                    >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         ลบ {selectedIds.size} รายการ
                    </button>
                 )}
            </div>

            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full bg-white">
                    <thead className="bg-navy text-white">
                        <tr>
                            <th className="p-4 text-left"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredStudents.length} className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue" /></th>
                            <th className="p-4 text-left font-semibold">รูปโปรไฟล์</th>
                            <th className="p-4 text-left font-semibold">ชื่อ-นามสกุล</th>
                            <th className="p-4 text-left font-semibold">ชื่อเล่น</th>
                            <th className="p-4 text-left font-semibold">ชั้น</th>
                            <th className="p-4 text-left font-semibold">เรือนนอน</th>
                            <th className="p-4 text-left font-semibold">เลขบัตรประชาชน</th>
                            <th className="p-4 text-center font-semibold">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map((student) => {
                            const profileImageUrl = getFirstImageSource(student.studentProfileImage);

                            return (
                                <tr key={student.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4"><input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => handleSelect(student.id)} className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue" /></td>
                                    <td className="p-4">
                                        <div className="w-10 h-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                                            {profileImageUrl ? (
                                                <img 
                                                    src={profileImageUrl} 
                                                    alt={student.studentName} 
                                                    className="w-full h-full object-cover" 
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.parentElement?.classList.add('fallback-icon');
                                                    }}
                                                />
                                            ) : (
                                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-gray-900 whitespace-nowrap">{`${student.studentTitle || ''} ${student.studentName || ''}`}</td>
                                    <td className="p-4 text-gray-600 whitespace-nowrap">{student.studentNickname}</td>
                                    <td className="p-4 whitespace-nowrap"><span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">{student.studentClass}</span></td>
                                    <td className="p-4 whitespace-nowrap"><span className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold">{student.dormitory}</span></td>
                                    <td className="p-4 text-gray-500 font-mono text-sm whitespace-nowrap">{student.studentIdCard}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <button 
                                              onClick={() => onViewStudent(student)}
                                              className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800 font-bold py-1.5 px-3 rounded-lg transition-colors"
                                            >
                                              ดู
                                            </button>
                                            <button 
                                              onClick={() => onEditStudent(student)}
                                              className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800 font-bold py-1.5 px-3 rounded-lg transition-colors"
                                            >
                                              แก้ไข
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {filteredStudents.length === 0 && <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-b-xl border-t border-gray-100">ไม่พบข้อมูลนักเรียน</div>}
            </div>

            {/* Mobile Card View (Visible on Mobile) */}
            <div className="md:hidden space-y-4">
                {filteredStudents.map((student) => {
                    const profileImageUrl = getFirstImageSource(student.studentProfileImage);
                    const isSelected = selectedIds.has(student.id);

                    return (
                        <div key={student.id} className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${isSelected ? 'border-primary-blue ring-1 ring-primary-blue' : 'border-gray-100'}`}>
                            <div className="flex items-start gap-4">
                                {/* Checkbox & Image */}
                                <div className="flex flex-col items-center gap-3 pt-1">
                                     <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        onChange={() => handleSelect(student.id)} 
                                        className="w-5 h-5 rounded text-primary-blue focus:ring-primary-blue" 
                                    />
                                    <div className="w-16 h-20 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
                                        {profileImageUrl ? (
                                            <img 
                                                src={profileImageUrl} 
                                                alt={student.studentName} 
                                                className="w-full h-full object-cover" 
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement?.classList.add('fallback-icon');
                                                }}
                                            />
                                        ) : (
                                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-navy leading-tight mb-1">
                                        {student.studentTitle}{student.studentName}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        ชื่อเล่น: <span className="font-semibold text-gray-800">{student.studentNickname || '-'}</span>
                                    </p>
                                    
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                            {student.studentClass}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                            {student.dormitory}
                                        </span>
                                    </div>
                                    
                                    <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                        {student.studentIdCard || '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3">
                                <button 
                                    onClick={() => onViewStudent(student)}
                                    className="flex-1 bg-sky-50 text-sky-700 hover:bg-sky-100 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    ดูข้อมูล
                                </button>
                                <button 
                                    onClick={() => onEditStudent(student)}
                                    className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-100 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    แก้ไข
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {filteredStudents.length === 0 && (
                    <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">ไม่พบข้อมูลนักเรียน</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTable;
