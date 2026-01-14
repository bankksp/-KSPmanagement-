
import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import StudentTable from './StudentTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { THAI_PROVINCES, DISABILITY_TYPES } from '../constants';

interface StudentPageProps {
    students: Student[];
    dormitories: string[];
    studentClasses: string[];
    studentClassrooms: string[];
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
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const StudentPage: React.FC<StudentPageProps> = ({ 
    students, dormitories, studentClasses, studentClassrooms, 
    onAddStudent, onEditStudent, onViewStudent, onDeleteStudents 
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');
    const [filters, setFilters] = useState({
        class: '',
        classroom: '',
        dormitory: '',
        age: '',
        disabilityType: '',
    });

    // --- Stats Logic ---
    const stats = useMemo(() => {
        const total = students.length;
        const male = students.filter(s => ['เด็กชาย', 'นาย'].includes(s.studentTitle)).length;
        const female = students.filter(s => ['เด็กหญิง', 'นางสาว', 'นาง'].includes(s.studentTitle)).length;

        // Class Distribution
        const classCounts: Record<string, number> = {};
        students.forEach(s => {
            const cls = s.studentClass.split('/')[0] || 'ไม่ระบุ';
            classCounts[cls] = (classCounts[cls] || 0) + 1;
        });
        // Sort classes roughly by level
        const sortedClassData = Object.entries(classCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => {
                const order = studentClasses.indexOf(a.name);
                return order === -1 ? 1 : order - studentClasses.indexOf(b.name);
            });

        // Dormitory Distribution
        const dormCounts: Record<string, number> = {};
        students.forEach(s => {
            const d = s.dormitory || 'ไม่ระบุ';
            dormCounts[d] = (dormCounts[d] || 0) + 1;
        });
        const dormData = Object.entries(dormCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Province Distribution
        const provinceCounts: Record<string, number> = {};
        students.forEach(s => {
            const addr = s.studentAddress || '';
            // Find which province is in the address string
            const foundProvince = THAI_PROVINCES.find(p => addr.includes(p));
            const key = foundProvince || 'ไม่ระบุ';
            provinceCounts[key] = (provinceCounts[key] || 0) + 1;
        });
        
        const provinceData = Object.entries(provinceCounts)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value); // Sort max to min

        return { total, male, female, classData: sortedClassData, dormData, provinceData };
    }, [students, studentClasses]);

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
            if (filters.disabilityType && student.disabilityType !== filters.disabilityType) {
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
        setFilters({ class: '', classroom: '', dormitory: '', age: '', disabilityType: '' });
    };

    const exportToExcel = () => {
        // Headers
        const header = ['ชื่อ-นามสกุล', 'ชื่อเล่น', 'ชั้นเรียน', 'เรือนนอน', 'เลขบัตรประชาชน', 'วันเกิด', 'เบอร์โทร', 'ที่อยู่', 'บิดา', 'เบอร์โทรบิดา', 'มารดา', 'เบอร์โทรมารดา', 'ผู้ปกครอง', 'เบอร์โทรผู้ปกครอง'];
        
        // Data Rows
        const rows = filteredStudents.map(s => [
            `${s.studentTitle}${s.studentName}`,
            s.studentNickname,
            s.studentClass,
            s.dormitory,
            s.studentIdCard,
            s.studentDob,
            s.studentPhone,
            s.studentAddress,
            s.fatherName,
            s.fatherPhone,
            s.motherName,
            s.motherPhone,
            s.guardianName,
            s.guardianPhone
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += header.map(h => `"${h}"`).join(",") + "\r\n";
        
        rows.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `รายชื่อนักเรียน_${new Date().toLocaleDateString('th-TH')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-navy">ข้อมูลนักเรียน</h2>
            </div>

            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm mb-4">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติ (จำนวน/ชาย-หญิง/ภูมิลำเนา)
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    จัดการข้อมูลนักเรียน
                </button>
            </div>

            {/* --- STATS VIEW --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                            <p className="text-gray-500">นักเรียนทั้งหมด</p>
                            <h3 className="text-4xl font-bold text-navy">{stats.total} <span className="text-lg text-gray-400 font-normal">คน</span></h3>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-cyan-500">
                            <p className="text-gray-500">ชาย</p>
                            <h3 className="text-4xl font-bold text-cyan-600">{stats.male} <span className="text-lg text-gray-400 font-normal">คน</span></h3>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-pink-500">
                            <p className="text-gray-500">หญิง</p>
                            <h3 className="text-4xl font-bold text-pink-600">{stats.female} <span className="text-lg text-gray-400 font-normal">คน</span></h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">จำนวนนักเรียนแยกตามระดับชั้น</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.classData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/>
                                        <XAxis type="number" tick={{fontSize: 12}} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                        <Bar dataKey="value" name="จำนวน" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                                            {stats.classData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">จำนวนนักเรียนแยกตามเรือนนอน</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.dormData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            isAnimationActive={false}
                                        >
                                            {stats.dormData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '8px'}} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Province Stats Chart */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <h3 className="text-lg font-bold text-navy mb-4">จำนวนนักเรียนแยกตามจังหวัด (ตามที่อยู่)</h3>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.provinceData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/>
                                    <XAxis type="number" tick={{fontSize: 12}} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                    <Bar dataKey="value" name="จำนวน" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                                        {stats.provinceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LIST VIEW --- */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h2 className="text-xl font-bold text-navy">รายชื่อนักเรียน</h2>
                        
                        <div className="flex gap-2 no-print">
                            <button
                                onClick={exportToExcel}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span>Excel</span>
                            </button>
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
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end no-print">
                        <FilterSelect label="ชั้น" name="class" value={filters.class} onChange={handleFilterChange}>
                             <option value="">ทั้งหมด</option>
                             {studentClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </FilterSelect>
                        <FilterSelect label="ห้อง" name="classroom" value={filters.classroom} onChange={handleFilterChange}>
                            <option value="">ทั้งหมด</option>
                            {studentClassrooms.map(c => <option key={c} value={c}>{c}</option>)}
                        </FilterSelect>
                        <FilterSelect label="เรือนนอน" name="dormitory" value={filters.dormitory} onChange={handleFilterChange}>
                            <option value="">ทั้งหมด</option>
                            {dormitories.filter(d => d !== 'เรือนพยาบาล').map(d => <option key={d} value={d}>{d}</option>)}
                        </FilterSelect>
                        <FilterSelect label="ประเภทความพิการ" name="disabilityType" value={filters.disabilityType} onChange={handleFilterChange}>
                            <option value="">ทั้งหมด</option>
                            {DISABILITY_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                        </FilterSelect>
                        <FilterSelect label="อายุ" name="age" value={filters.age} onChange={handleFilterChange}>
                             {ageRanges.map(a => <option key={a} value={a === 'ทั้งหมด' ? '' : a}>{a}</option>)}
                        </FilterSelect>
                        <button onClick={resetFilters} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg self-end">ล้างค่า</button>
                    </div>

                    <div className="printable-content">
                         {/* Simple print header */}
                        <div className="hidden print:block text-center mb-4">
                            <h1 className="text-2xl font-bold">รายชื่อนักเรียน</h1>
                        </div>

                        <StudentTable 
                            students={filteredStudents} 
                            onViewStudent={onViewStudent}
                            onEditStudent={onEditStudent}
                            onDeleteStudents={onDeleteStudents}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentPage;