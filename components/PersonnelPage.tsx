
import React, { useState, useMemo } from 'react';
import { Personnel } from '../types';
import PersonnelTable from './PersonnelTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PersonnelPageProps {
    personnel: Personnel[];
    positions: string[];
    onAddPersonnel: () => void;
    onEditPersonnel: (person: Personnel) => void;
    onViewPersonnel: (person: Personnel) => void;
    onDeletePersonnel: (ids: number[]) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const PersonnelPage: React.FC<PersonnelPageProps> = ({ personnel, positions, onAddPersonnel, onEditPersonnel, onViewPersonnel, onDeletePersonnel }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('');

    // --- Stats Logic ---
    const stats = useMemo(() => {
        const total = personnel.length;
        const male = personnel.filter(p => p.personnelTitle === 'นาย').length;
        const female = personnel.filter(p => ['นาง', 'นางสาว'].includes(p.personnelTitle)).length;

        // Position Distribution
        const posCounts: Record<string, number> = {};
        personnel.forEach(p => {
             const pos = p.position || 'ไม่ระบุ';
             posCounts[pos] = (posCounts[pos] || 0) + 1;
        });
        const posData = Object.entries(posCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { total, male, female, posData };
    }, [personnel]);

    const filteredPersonnel = useMemo(() => {
        return personnel.filter(person => {
            const title = person.personnelTitle === 'อื่นๆ' ? (person.personnelTitleOther || '') : (person.personnelTitle || '');
            const name = person.personnelName || '';
            const fullName = title + name;
            
            const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (person.idCard || '').includes(searchTerm) ||
                                  (person.position || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesPosition = !positionFilter || person.position === positionFilter;

            return matchesSearch && matchesPosition;
        });
    }, [personnel, searchTerm, positionFilter]);

    const exportToExcel = () => {
        const header = ['ชื่อ-นามสกุล', 'ตำแหน่ง', 'เลขที่ตำแหน่ง', 'เลขบัตรประชาชน', 'วันเกิด', 'เบอร์โทร', 'วันที่บรรจุ'];
        const rows = filteredPersonnel.map(p => {
             const title = p.personnelTitle === 'อื่นๆ' ? (p.personnelTitleOther || '') : (p.personnelTitle || '');
             return [
                `${title}${p.personnelName}`,
                p.position,
                p.positionNumber,
                p.idCard,
                p.dob,
                p.phone,
                p.appointmentDate
            ];
        });

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += header.map(h => `"${h}"`).join(",") + "\r\n";
        
        rows.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `รายชื่อบุคลากร_${new Date().toLocaleDateString('th-TH')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-navy">ข้อมูลบุคลากร</h2>
            </div>

            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm mb-4">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติ (จำนวน/ชาย-หญิง/ตำแหน่ง)
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    จัดการข้อมูลครู
                </button>
            </div>

            {/* --- STATS VIEW --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                            <p className="text-gray-500">บุคลากรทั้งหมด</p>
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

                    <div className="bg-white p-6 rounded-xl shadow">
                        <h3 className="text-lg font-bold text-navy mb-4">จำนวนบุคลากรแยกตามตำแหน่ง</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.posData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/>
                                    <XAxis type="number" tick={{fontSize: 12}} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                    <Bar dataKey="value" name="จำนวน" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={25}>
                                        {stats.posData.map((entry, index) => (
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
                        <h2 className="text-xl font-bold text-navy">จัดการข้อมูลบุคลากร</h2>
                        
                        <div className="flex gap-2 no-print">
                             <button
                                onClick={exportToExcel}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span>Excel</span>
                            </button>
                            <button
                                onClick={onAddPersonnel}
                                className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>เพิ่มบุคลากร</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end no-print">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, เลขบัตร, ตำแหน่ง..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                            <select
                                value={positionFilter}
                                onChange={(e) => setPositionFilter(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
                            >
                                <option value="">ทั้งหมด</option>
                                {positions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <button onClick={() => { setSearchTerm(''); setPositionFilter(''); }} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg self-end">ล้างค่า</button>
                    </div>

                    <div className="printable-content">
                        <div className="hidden print:block text-center mb-4">
                            <h1 className="text-2xl font-bold">ทะเบียนบุคลากร</h1>
                        </div>
                        <PersonnelTable 
                            personnel={filteredPersonnel} 
                            onViewPersonnel={onViewPersonnel} 
                            onEditPersonnel={onEditPersonnel} 
                            onDeletePersonnel={onDeletePersonnel}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelPage;
