
import React, { useState, useMemo } from 'react';
import { Personnel } from '../types';
import { getFirstImageSource } from '../utils';
import { THAI_PROVINCES } from '../constants'; // Import

interface PersonnelTableProps {
    personnel: Personnel[];
    onViewPersonnel: (person: Personnel) => void;
    onEditPersonnel: (person: Personnel) => void;
    onDeletePersonnel: (ids: number[]) => void;
    currentUser: Personnel | null;
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

const PersonnelTable: React.FC<PersonnelTableProps> = ({ personnel, onViewPersonnel, onEditPersonnel, onDeletePersonnel, currentUser }) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [filterProvince, setFilterProvince] = useState(''); // New filter state
    
    // Filtered logic here needs to be aware of parent search, but parent search is in Page component.
    // The previous implementation relied on the parent filtering by text.
    // However, PersonnelTable receives the *already filtered* list based on text search from PersonnelPage.
    // To implement Province filter properly inside Table component (like StudentTable), we might need to apply it locally to the received list.
    
    const displayPersonnel = useMemo(() => {
        if (!filterProvince) return personnel;
        return personnel.filter(p => {
            const addr = String((p as any).address || '').toLowerCase(); // Type assertion for safety if address not in all records
            return addr.includes(`จ.${filterProvince}`) || addr.includes(filterProvince);
        });
    }, [personnel, filterProvince]);

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
            setSelectedIds(new Set(displayPersonnel.map(p => p.id)));
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
                 <div className="flex items-center gap-4 w-full sm:w-auto">
                     <div className="text-sm text-gray-500 font-medium whitespace-nowrap">
                        {selectedIds.size > 0 ? `เลือก ${selectedIds.size} รายการ` : `ทั้งหมด ${displayPersonnel.length} รายการ`}
                     </div>
                     
                     <select
                        value={filterProvince}
                        onChange={(e) => setFilterProvince(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue shadow-sm bg-white text-sm"
                    >
                        <option value="">ทุกจังหวัด</option>
                        {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                 </div>

                 {selectedIds.size > 0 && (
                     <button 
                        onClick={handleDeleteClick}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow transition duration-300 flex items-center justify-center gap-2"
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

            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full bg-white">
                    <thead className="bg-navy text-white">
                        <tr>
                            <th className="p-4 text-left w-10"><input type="checkbox" onChange={handleSelectAll} checked={displayPersonnel.length > 0 && selectedIds.size === displayPersonnel.length} className="rounded text-primary-blue focus:ring-primary-blue h-4 w-4" /></th>
                            <th className="p-4 text-left font-semibold">รูปโปรไฟล์</th>
                            <th className="p-4 text-left font-semibold">ชื่อ-นามสกุล</th>
                            <th className="p-4 text-left font-semibold">ตำแหน่ง</th>
                            <th className="p-4 text-center font-semibold">อายุ</th>
                            <th className="p-4 text-left font-semibold">เบอร์โทร</th>
                            <th className="p-4 text-left font-semibold">รหัสผ่าน</th>
                            <th className="p-4 text-center font-semibold">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {displayPersonnel.map((person) => {
                            const profileImageUrl = getFirstImageSource(person.profileImage);
                            const title = person.personnelTitle === 'อื่นๆ' ? (person.personnelTitleOther || '') : (person.personnelTitle || '');
                            const fullName = `${title} ${person.personnelName || ''}`;
                            const showPassword = currentUser?.role === 'admin' || currentUser?.id === person.id;

                            return (
                                <tr key={person.id} className={`hover:bg-blue-50/50 transition-colors ${selectedIds.has(person.id) ? 'bg-blue-50' : ''}`}>
                                    <td className="p-4"><input type="checkbox" checked={selectedIds.has(person.id)} onChange={() => handleSelect(person.id)} className="rounded text-primary-blue focus:ring-primary-blue h-4 w-4" /></td>
                                    <td className="p-4">
                                        <div className="w-10 h-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
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
                                    <td className="p-4 font-medium text-gray-900 whitespace-nowrap">{fullName}</td>
                                    <td className="p-4 text-gray-600 whitespace-nowrap">{person.position}</td>
                                    <td className="p-4 text-center text-gray-600">{calculateAge(person.dob)}</td>
                                    <td className="p-4 text-gray-600 whitespace-nowrap">{person.phone}</td>
                                    <td className="p-4 text-gray-600 whitespace-nowrap font-mono text-xs">
                                        {showPassword ? (person.password || person.idCard) : '••••••'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <button 
                                              onClick={() => onViewPersonnel(person)}
                                              className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800 font-bold py-1.5 px-3 rounded-lg transition-colors"
                                            >
                                              ดู
                                            </button>
                                            <button 
                                              onClick={() => onEditPersonnel(person)}
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
                 {displayPersonnel.length === 0 && <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-b-xl border-t border-gray-100">ไม่พบข้อมูลบุคลากร</div>}
            </div>

            {/* Mobile Card View (Visible on Mobile) */}
            <div className="md:hidden space-y-4">
                {displayPersonnel.map((person) => {
                    const profileImageUrl = getFirstImageSource(person.profileImage);
                    const title = person.personnelTitle === 'อื่นๆ' ? (person.personnelTitleOther || '') : (person.personnelTitle || '');
                    const fullName = `${title} ${person.personnelName || ''}`;
                    const isSelected = selectedIds.has(person.id);
                    const showPassword = currentUser?.role === 'admin' || currentUser?.id === person.id;

                    return (
                        <div key={person.id} className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${isSelected ? 'border-primary-blue ring-1 ring-primary-blue' : 'border-gray-100'}`}>
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center gap-3 pt-1">
                                     <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        onChange={() => handleSelect(person.id)} 
                                        className="w-5 h-5 rounded text-primary-blue focus:ring-primary-blue" 
                                    />
                                    <div className="w-16 h-20 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
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
                                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-navy leading-tight mb-1">{fullName}</h3>
                                    <div className="inline-block bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded-full border border-blue-100 mb-2">
                                        {person.position}
                                    </div>
                                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        {person.phone || '-'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        อายุ: {calculateAge(person.dob)} ปี
                                    </p>
                                    {showPassword && (
                                        <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-1 rounded border border-gray-200 inline-block">
                                            รหัสผ่าน: <span className="font-mono font-bold">{person.password || person.idCard}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3">
                                <button 
                                    onClick={() => onViewPersonnel(person)}
                                    className="flex-1 bg-sky-50 text-sky-700 hover:bg-sky-100 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    ดูข้อมูล
                                </button>
                                <button 
                                    onClick={() => onEditPersonnel(person)}
                                    className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-100 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    แก้ไข
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {displayPersonnel.length === 0 && (
                    <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">ไม่พบข้อมูลบุคลากร</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonnelTable;
