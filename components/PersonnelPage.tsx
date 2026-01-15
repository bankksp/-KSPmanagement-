
import React, { useState, useMemo } from 'react';
import { Personnel } from '../types';
import PersonnelTable from './PersonnelTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { THAI_PROVINCES } from '../constants';
import { safeParseArray } from '../utils';

interface PersonnelPageProps {
    personnel: Personnel[];
    positions: string[];
    onAddPersonnel: () => void;
    onEditPersonnel: (person: Personnel) => void;
    onViewPersonnel: (person: Personnel) => void;
    onDeletePersonnel: (ids: number[]) => void;
    currentUser: Personnel | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const PersonnelPage: React.FC<PersonnelPageProps> = ({ personnel, positions, onAddPersonnel, onEditPersonnel, onViewPersonnel, onDeletePersonnel, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('');

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'pro';

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

        // Province Distribution
        const provinceCounts: Record<string, number> = {};
        personnel.forEach(p => {
            const addr = (p as any).address || '';
            const foundProvince = THAI_PROVINCES.find(prov => addr.includes(prov));
            const key = foundProvince || 'ไม่ระบุ';
            provinceCounts[key] = (provinceCounts[key] || 0) + 1;
        });

        const provinceData = Object.entries(provinceCounts)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value);

        return { total, male, female, posData, provinceData };
    }, [personnel]);

    const filteredPersonnel = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase().trim();

        return personnel.filter(person => {
            const title = person.personnelTitle === 'อื่นๆ' ? (person.personnelTitleOther || '') : (person.personnelTitle || '');
            const name = person.personnelName || '';
            const idCard = String(person.idCard || '');
            const position = person.position || '';
            const positionNumber = String(person.positionNumber || '');
            const phone = String(person.phone || '');

            const fullNameNoSpace = `${title}${name}`.toLowerCase();
            const fullNameWithSpace = `${title} ${name}`.toLowerCase();
            const justName = name.toLowerCase();
            
            const matchesSearch = !lowerTerm || 
                                  fullNameNoSpace.includes(lowerTerm) ||
                                  fullNameWithSpace.includes(lowerTerm) ||
                                  justName.includes(lowerTerm) ||
                                  idCard.includes(lowerTerm) ||
                                  position.toLowerCase().includes(lowerTerm) ||
                                  positionNumber.includes(lowerTerm) ||
                                  phone.includes(lowerTerm);

            const matchesPosition = !positionFilter || person.position === positionFilter;

            return matchesSearch && matchesPosition;
        });
    }, [personnel, searchTerm, positionFilter]);

    const pendingUsers = useMemo(() => {
        return personnel.filter(p => p.status === 'pending');
    }, [personnel]);

    const handleApproveUser = (user: Personnel) => {
        if (window.confirm(`ยืนยันการอนุมัติ ${user.personnelName} เข้าใช้งานระบบ?`)) {
            onEditPersonnel({ ...user, status: 'approved' });
        }
    };

    const handleRejectUser = (user: Personnel) => {
        if (window.confirm(`ต้องการลบคำขอลงทะเบียนของ ${user.personnelName} ใช่หรือไม่?`)) {
            onDeletePersonnel([user.id]);
        }
    };

    const exportToExcel = () => {
        const header = [
            'ID', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'วิทยฐานะ', 'เลขที่ตำแหน่ง',
            'เลขบัตรประชาชน', 'วันเกิด', 'เบอร์โทร', 'อีเมล', 'วันที่บรรจุ',
            'เครื่องราชฯ', 'วันที่ได้รับ', 'ที่อยู่', 'ชั้นเรียนที่ปรึกษา',
            'วุฒิการศึกษา', 'สถานะ', 'สิทธิ์'
        ];
        
        const rows = filteredPersonnel.map(p => {
            const education = safeParseArray(p.educationBackgrounds)
                .map((edu: any) => `${edu.level || ''}: ${edu.faculty || ''} (${edu.major || ''})`)
                .join('; ');
            const advisory = safeParseArray(p.advisoryClasses).join(', ');

            return [
                p.id,
                p.personnelTitle === 'อื่นๆ' ? p.personnelTitleOther : p.personnelTitle,
                p.personnelName,
                p.position,
                p.academicStanding || '-',
                p.positionNumber || '-',
                p.idCard,
                p.dob,
                p.phone,
                p.email,
                p.appointmentDate,
                p.highestDecoration || '-',
                p.highestDecorationDate || '-',
                (p.address || '').replace(/,/g, ' '), // remove commas from address to not break CSV
                advisory,
                education,
                p.status || 'approved',
                p.role || 'user'
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
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-navy">ข้อมูลบุคลากร</h2>
            </div>

            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm mb-4">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติ
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    จัดการข้อมูลครู
                </button>
            </div>

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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">จำนวนบุคลากรแยกตามตำแหน่ง</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.posData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/>
                                        <XAxis type="number" tick={{fontSize: 12}} />
                                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                        <Bar dataKey="value" name="จำนวน" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={25} isAnimationActive={false}>
                                            {stats.posData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">จำนวนบุคลากรแยกตามจังหวัด</h3>
                            <div className="h-80">
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
                </div>
            )}

            {activeTab === 'list' && (
                <div className="space-y-6">
                    {isAdmin && pendingUsers.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2 mb-4">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                รายการรออนุมัติเข้าใช้งาน ({pendingUsers.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingUsers.map(user => (
                                    <div key={user.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex flex-col gap-2">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold">
                                                {user.personnelName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{user.personnelTitle}{user.personnelName}</p>
                                                <p className="text-xs text-gray-500">{user.position} | ID: {user.idCard}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleApproveUser(user)} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm">อนุมัติ</button>
                                            <button onClick={() => handleRejectUser(user)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-1.5 px-3 rounded">ลบคำขอ</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-xl font-bold text-navy">จัดการข้อมูลบุคลากร</h2>
                            <div className="flex gap-2 no-print">
                                <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2"><span>Excel</span></button>
                                <button onClick={onAddPersonnel} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2"><span>เพิ่มบุคลากร</span></button>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end no-print">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
                                <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                                <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg bg-white">
                                    <option value="">ทั้งหมด</option>
                                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <button onClick={() => { setSearchTerm(''); setPositionFilter(''); }} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg self-end">ล้างค่า</button>
                        </div>

                        <PersonnelTable personnel={filteredPersonnel} onViewPersonnel={onViewPersonnel} onEditPersonnel={onEditPersonnel} onDeletePersonnel={onDeletePersonnel} currentUser={currentUser} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelPage;
