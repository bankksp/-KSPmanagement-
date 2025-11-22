
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
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
    
    const handleDeleteClick = () => {
        if (selectedIds.size > 0) {
            setShowDeleteConfirm(true);
        }
    }

    const confirmDelete = () => {
        onDeletePersonnel(Array.from(selectedIds));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
    }

    return (
        <div className="w-full relative">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                 <div className="text-sm text-gray-500 font-medium">
                    {selectedIds.size > 0 ? `เลือก ${selectedIds.size} รายการ` : `ทั้งหมด ${personnel.length} รายการ`}
                 </div>
                 {selectedIds.size > 0 && (
                     <button 
                        onClick={handleDeleteClick}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 flex items-center justify-center gap-2"
                    >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         ลบ {selectedIds.size} รายการ
                    </button>
                 )}
             </div>

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up transform transition-all scale-100">
                        <div className="text-center mb-4">
                            <div className="bg-red-100 p-3 rounded-full inline-block mb-3">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">ยืนยันการลบข้อมูล</h3>
                            <p className="text-gray-500 mt-2">
                                คุณต้องการลบข้อมูลบุคลากรจำนวน <span className="font-bold text-red-600">{selectedIds.size}</span> รายการ ใช่หรือไม่?
                            </p>
                            <p className="text-xs text-gray-400 mt-1">การกระทำนี้ไม่สามารถเรียกคืนข้อมูลได้</p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow transition-colors"
                            >
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full bg-white">
                    <thead className="bg-navy text-white">
                        <tr>
                            <th className="p-3 text-left w-10"><input type="checkbox" onChange={handleSelectAll} checked={personnel.length > 0 && selectedIds.size === personnel.length} className="rounded text-primary-blue focus:ring-primary-blue h-4 w-4" /></th>
                            <th className="p-3 text-left">รูปโปรไฟล์</th>
                            <th className="p-3 text-left">ชื่อ-นามสกุล</th>
                            <th className="p-3 text-left">ตำแหน่ง</th>
                            <th className="p-3 text-center">อายุ</th>
                            <th className="p-3 text-left">เบอร์โทร</th>
                            <th className="p-3 text-center">การกระทำ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {personnel.map((person) => {
                            const profileImageUrl = getFirstImageSource(person.profileImage);
                            const title = person.personnelTitle === 'อื่นๆ' ? (person.personnelTitleOther || '') : (person.personnelTitle || '');
                            const fullName = `${title} ${person.personnelName || ''}`;

                            return (
                                <tr key={person.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.has(person.id) ? 'bg-blue-50' : ''}`}>
                                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(person.id)} onChange={() => handleSelect(person.id)} className="rounded text-primary-blue focus:ring-primary-blue h-4 w-4" /></td>
                                    <td className="p-3">
                                        <div className="w-10 h-12 rounded-md bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-200">
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
                                    <td className="p-3 font-medium text-gray-800">{fullName}</td>
                                    <td className="p-3 text-gray-600">{person.position}</td>
                                    <td className="p-3 text-center text-gray-600">{calculateAge(person.dob)}</td>
                                    <td className="p-3 text-gray-600">{person.phone}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center items-center gap-2">
                                            <button 
                                              onClick={() => onViewPersonnel(person)}
                                              className="text-xs bg-sky-100 text-sky-800 font-semibold py-1.5 px-3 rounded-md hover:bg-sky-200 transition-colors"
                                            >
                                              ดู
                                            </button>
                                            <button 
                                              onClick={() => onEditPersonnel(person)}
                                              className="text-xs bg-amber-100 text-amber-800 font-semibold py-1.5 px-3 rounded-md hover:bg-amber-200 transition-colors"
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
                 {personnel.length === 0 && <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-b-lg">ไม่พบข้อมูลบุคลากร</div>}
            </div>
        </div>
    );
};

export default PersonnelTable;
