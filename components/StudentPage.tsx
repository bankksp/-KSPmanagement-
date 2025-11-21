
import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import StudentTable from './StudentTable';
import { STUDENT_CLASSES, STUDENT_CLASSROOMS } from '../constants';

interface StudentPageProps {
    students: Student[];
    dormitories: string[];
    onAddStudent: () => void;
    onEditStudent: (student: Student) => void;
    onViewStudent: (student: Student) => void;
    onDeleteStudents: (ids: number[]) => void;
}

const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const parts = dobString.split('/');
    if (parts.length !== 3) return 0;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;

    const buddhistYear = year;
    const gregorianYear = buddhistYear - 543;
    
    const birthDate = new Date(gregorianYear, month - 1, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const ageRanges = ["ทั้งหมด", "ต่ำกว่า 7 ปี", "7-10 ปี", "11-14 ปี", "15-18 ปี", "มากกว่า 18 ปี"];

const StudentPage: React.FC<StudentPageProps> = ({ students, dormitories, onAddStudent, onEditStudent, onViewStudent, onDeleteStudents }) => {
    const [filters, setFilters] = useState({
        class: '',
        classroom: '',
        dormitory: '',
        age: '',
    });

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const [studentClass, studentClassroom] = student.studentClass.split('/');

            if (filters.class && studentClass !== filters.class) {
                return false;
            }
            if (filters.classroom && studentClassroom !== filters.classroom) {
                return false;
            }
            if (filters.dormitory && student.dormitory !== filters.dormitory) {
                return false;
            }
            if (filters.age && filters.age !== 'ทั้งหมด') {
                const age = calculateAge(student.studentDob);
                if (filters.age === "ต่ำกว่า 7 ปี" && age >= 7) return false;
                if (filters.age === "7-10 ปี" && (age < 7 || age > 10)) return false;
                if (filters.age === "11-14 ปี" && (age < 11 || age > 14)) return false;
                if (filters.age === "15-18 ปี" && (age < 15 || age > 18)) return false;
                if (filters.age === "มากกว่า 18 ปี" && age <= 18) return false;
            }
            return true;
        });
    }, [students, filters]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({ class: '', classroom: '', dormitory: '', age: '' });
    };

    const FilterSelect: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode, disabled?: boolean}> = 
    ({label, name, value, onChange, children, disabled = false}) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select name={name} value={value} onChange={onChange} disabled={disabled} className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue disabled:bg-gray-200">
                {children}
            </select>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-navy">จัดการข้อมูลนักเรียน</h2>
                    <button
                        onClick={onAddStudent}
                        className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>เพิ่มนักเรียน</span>
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end">
                    <FilterSelect label="ชั้น" name="class" value={filters.class} onChange={handleFilterChange}>
                         <option value="">ทั้งหมด</option>
                         {STUDENT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </FilterSelect>
                    <FilterSelect label="ห้อง" name="classroom" value={filters.classroom} onChange={handleFilterChange}>
                        <option value="">ทั้งหมด</option>
                        {STUDENT_CLASSROOMS.map(c => <option key={c} value={c}>{c}</option>)}
                    </FilterSelect>
                    <FilterSelect label="เรือนนอน" name="dormitory" value={filters.dormitory} onChange={handleFilterChange}>
                        <option value="">ทั้งหมด</option>
                        {dormitories.filter(d => d !== 'เรือนพยาบาล').map(d => <option key={d} value={d}>{d}</option>)}
                    </FilterSelect>
                    <FilterSelect label="อายุ" name="age" value={filters.age} onChange={handleFilterChange}>
                         {ageRanges.map(a => <option key={a} value={a === 'ทั้งหมด' ? '' : a}>{a}</option>)}
                    </FilterSelect>
                    <button onClick={resetFilters} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg self-end">ล้างค่า</button>
                </div>

                <StudentTable 
                    students={filteredStudents} 
                    onViewStudent={onViewStudent}
                    onEditStudent={onEditStudent}
                    onDeleteStudents={onDeleteStudents}
                />
            </div>
        </div>
    );
};

export default StudentPage;