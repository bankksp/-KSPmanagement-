
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
                    className="w-full sm:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
                 {selectedIds.size > 0 && (
                     <button 
                        onClick={handleDelete}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300"
                    >
                         ลบ {selectedIds.size} รายการ
                    </button>
                 )}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-navy text-white">
                        <tr>
                            <th className="p-3 text-left"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredStudents.length} /></th>
                            <th className="p-3 text-left">รูปโปรไฟล์</th>
                            <th className="p-3 text-left">ชื่อ-นามสกุล</th>
                            <th className="p-3 text-left">ชื่อเล่น</th>
                            <th className="p-3 text-left">ชั้น</th>
                            <th className="p-3 text-left">เรือนนอน</th>
                            <th className="p-3 text-left">เลขบัตรประชาชน</th>
                            <th className="p-3 text-center">การกระทำ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => {
                            const profileImageUrl = getFirstImageSource(student.studentProfileImage);

                            return (
                                <tr key={student.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => handleSelect(student.id)} /></td>
                                    <td className="p-3">
                                        <div className="w-10 h-12 rounded-md bg-gray-200 flex items-center justify-center overflow-hidden">
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
                                    <td className="p-3">{`${student.studentTitle || ''} ${student.studentName || ''}`}</td>
                                    <td className="p-3">{student.studentNickname}</td>
                                    <td className="p-3">{student.studentClass}</td>
                                    <td className="p-3">{student.dormitory}</td>
                                    <td className="p-3">{student.studentIdCard}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center items-center gap-2">
                                            <button 
                                              onClick={() => onViewStudent(student)}
                                              className="text-sm bg-sky-100 text-sky-800 font-semibold py-1 px-3 rounded-md hover:bg-sky-200 transition-colors"
                                            >
                                              ดู
                                            </button>
                                            <button 
                                              onClick={() => onEditStudent(student)}
                                              className="text-sm bg-amber-100 text-amber-800 font-semibold py-1 px-3 rounded-md hover:bg-amber-200 transition-colors"
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
                 {filteredStudents.length === 0 && <p className="text-center p-4">ไม่พบข้อมูลนักเรียน</p>}
            </div>
        </div>
    );
};

export default StudentTable;
