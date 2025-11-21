
import React, { useState, useMemo } from 'react';
import { Personnel } from '../types';
import PersonnelTable from './PersonnelTable';

interface PersonnelPageProps {
    personnel: Personnel[];
    positions: string[];
    onAddPersonnel: () => void;
    onEditPersonnel: (person: Personnel) => void;
    onViewPersonnel: (person: Personnel) => void;
    onDeletePersonnel: (ids: number[]) => void;
}

const PersonnelPage: React.FC<PersonnelPageProps> = ({ personnel, positions, onAddPersonnel, onEditPersonnel, onViewPersonnel, onDeletePersonnel }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('');

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

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-navy">จัดการข้อมูลบุคลากร</h2>
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

                <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end">
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


                <PersonnelTable 
                    personnel={filteredPersonnel} 
                    onViewPersonnel={onViewPersonnel}
                    onEditPersonnel={onEditPersonnel}
                    onDeletePersonnel={onDeletePersonnel}
                />
            </div>
        </div>
    );
};

export default PersonnelPage;
