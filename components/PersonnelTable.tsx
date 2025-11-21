
import React, { useState } from 'react';
import { Personnel } from '../types';
import { getFirstImageSource } from '../utils';

interface PersonnelTableProps {
    personnel: Personnel[];
    onViewPersonnel: (person: Personnel) => void;
    onEditPersonnel: (person: Personnel) => void;
    onDeletePersonnel: (ids: number[]) => void;
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

const PersonnelTable: React.FC<PersonnelTableProps> = ({ personnel, onViewPersonnel, onEditPersonnel, onDeletePersonnel }) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
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
            setSelectedIds(new Set(personnel.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleDelete = () => {
        if (selectedIds.size > 0) {
            if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedIds.size} รายการที่เลือก?`)) {
                onDeletePersonnel(Array.from(selectedIds));
                setSelectedIds(new Set());
            }
        }
    }

    return (
        <div className="w-full">
             {selectedIds.size > 0 && (
                <div className="mb-4">
                     <button 
                        onClick={handleDelete}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300"
                    >
                         ลบ {selectedIds.size} รายการ
                    </button>
                </div>
             )}

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-navy text-white">
                        <tr>
                            <th className="p-3 text-left"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === personnel.length} /></th>
                            <th className="p-3 text-left">รูปโปรไฟล์</th>
                            <th className="p-3 text-left">ชื่อ-นามสกุล</th>
                            <th className="p-3 text-left">ตำแหน่ง</th>
                            <th className="p-3 text-center">อายุ</th>
                            <th className="p-3 text-left">เบอร์โทร</th>
                            <th className="p-3 text-center">การกระทำ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {personnel.map((person) => {
                            const profileImageUrl = getFirstImageSource(person.profileImage);
                            
                            const title = person.personnelTitle === 'อื่นๆ' ? (person.personnelTitleOther || '') : (person.personnelTitle || '');
                            const fullName = `${title} ${person.personnelName || ''}`;

                            return (
                                <tr key={person.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(person.id)} onChange={() => handleSelect(person.id)} /></td>
                                    <td className="p-3">
                                        <div className="w-10 h-12 rounded-md bg-gray-200 flex items-center justify-center overflow-hidden">
                                            {profileImageUrl ? (
                                                <img 
                                                    src={profileImageUrl} 
                                                    alt={person.personnelName} 
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
                                    <td className="p-3">{fullName}</td>
                                    <td className="p-3">{person.position}</td>
                                    <td className="p-3 text-center">{calculateAge(person.dob)}</td>
                                    <td className="p-3">{person.phone}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center items-center gap-2">
                                            <button 
                                              onClick={() => onViewPersonnel(person)}
                                              className="text-sm bg-sky-100 text-sky-800 font-semibold py-1 px-3 rounded-md hover:bg-sky-200 transition-colors"
                                            >
                                              ดู
                                            </button>
                                            <button 
                                              onClick={() => onEditPersonnel(person)}
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
                 {personnel.length === 0 && <p className="text-center p-4">ไม่พบข้อมูลบุคลากร</p>}
            </div>
        </div>
    );
};

export default PersonnelTable;
