
import React, { useState, useMemo, useEffect } from 'react';
import { Achievement, Personnel, AchievementLevel } from '../types';
import { ACHIEVEMENT_LEVELS } from '../constants';
import { getCurrentThaiDate, getFirstImageSource, safeParseArray, buddhistToISO, isoToBuddhist, formatThaiDate, getDirectDriveImageSrc } from '../utils';

interface AchievementPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    achievements: Achievement[];
    onSave: (achievement: Achievement) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
    academicYears: string[];
}

// --- MODAL: View Achievement ---
const ViewAchievementModal: React.FC<{
    achievement: Achievement | null;
    onClose: () => void;
    onEdit: (achievement: Achievement) => void;
    onDelete: (id: number) => void;
}> = ({ achievement, onClose, onEdit, onDelete }) => {
    if (!achievement) return null;

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const attachments = useMemo(() => safeParseArray(achievement.attachments), [achievement.attachments]);
    const hasMultipleImages = attachments.length > 1;

    useEffect(() => {
        setCurrentImageIndex(0); // Reset index when a new item is viewed
    }, [achievement]);

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev + 1) % attachments.length);
    };
    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev - 1 + attachments.length) % attachments.length);
    };

    const levelLabel = ACHIEVEMENT_LEVELS.find(l => l.id === achievement.level)?.label;
    const currentAttachment = attachments[currentImageIndex];
    const isPdf = typeof currentAttachment === 'string' && currentAttachment.toLowerCase().includes('.pdf');

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-navy truncate">{achievement.title}</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-grow overflow-hidden grid grid-cols-1 md:grid-cols-5">
                    <div className="md:col-span-3 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                        {attachments.length > 0 ? (
                            <>
                                {isPdf ? (
                                    <div className="text-center text-white p-8">
                                        <a href={getDirectDriveImageSrc(currentAttachment)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-4 hover:bg-white/10 rounded-lg p-8">
                                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                            <span className="font-bold">เปิดไฟล์ PDF</span>
                                        </a>
                                    </div>
                                ) : (
                                    <img src={getDirectDriveImageSrc(currentAttachment)} alt={achievement.title} className="max-w-full max-h-full object-contain"/>
                                )}
                                
                                {hasMultipleImages && (
                                    <>
                                        <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{currentImageIndex + 1} / {attachments.length}</div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-500">ไม่มีรูปภาพ</div>
                        )}
                    </div>
                    <div className="md:col-span-2 p-6 overflow-y-auto space-y-4">
                        <h2 className="text-2xl font-bold text-navy">{achievement.title}</h2>
                        <div className="flex flex-wrap gap-2">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold rounded-full border border-blue-100 flex items-center gap-1.5"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1V3a1 1 0 112 0v1h2V3a1 1 0 112 0v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-2v1a1 1 0 11-2 0V6H6v1a1 1 0 11-2 0V6H3a1 1 0 01-1-1V4a1 1 0 011-1h2zm0 6h14v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" clipRule="evenodd" /></svg>{formatThaiDate(achievement.date)}</span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 text-xs font-bold rounded-full border">ปี {achievement.academicYear}</span>
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-bold rounded-full border border-indigo-100">{levelLabel}</span>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-gray-600 whitespace-pre-wrap">{achievement.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-3">
                    <button onClick={() => onEdit(achievement)} className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-lg font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        แก้ไข
                    </button>
                    <button onClick={() => { if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผลงานนี้?')) onDelete(achievement.id) }} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        ลบ
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MODAL: Add/Edit Achievement ---
const EditAchievementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (achievement: Achievement) => void;
    isSaving: boolean;
    currentUser: Personnel;
    achievementToEdit: Partial<Achievement> | null;
    academicYears: string[];
}> = ({ isOpen, onClose, onSave, isSaving, currentUser, achievementToEdit, academicYears }) => {
    const [formData, setFormData] = useState<Partial<Achievement>>({});

    React.useEffect(() => {
        if (achievementToEdit) {
            setFormData(achievementToEdit);
        } else {
            setFormData({
                date: getCurrentThaiDate(),
                level: 'school',
                personnelId: currentUser.id,
                personnelName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                attachments: [],
                academicYear: academicYears[academicYears.length - 1] || (new Date().getFullYear() + 543).toString(),
            });
        }
    }, [achievementToEdit, currentUser, isOpen, academicYears]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFormData(prev => ({ ...prev, attachments: [...safeParseArray(prev.attachments), ...Array.from(e.target.files)] }));
        }
    };
    
    const handleRemoveFile = (index: number) => {
        setFormData(prev => ({ ...prev, attachments: safeParseArray(prev.attachments).filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: formData.id || Date.now() } as Achievement);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h3 className="p-6 text-xl font-bold text-navy border-b">{formData.id ? 'แก้ไขผลงาน' : 'เพิ่มผลงานใหม่'}</h3>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Form fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">วันที่ได้รับ</label>
                            <input type="date" required value={buddhistToISO(formData.date)} onChange={e => setFormData({...formData, date: isoToBuddhist(e.target.value)})} className="w-full border rounded-lg px-3 py-2 mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">ปีการศึกษา</label>
                            <select value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1 bg-white">
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">ระดับผลงาน</label>
                            <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value as AchievementLevel})} className="w-full border rounded-lg px-3 py-2 mt-1 bg-white">
                                {ACHIEVEMENT_LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">ชื่อผลงาน/เรื่อง</label>
                        <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
                        <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full border rounded-lg px-3 py-2 mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">แนบไฟล์เกียรติบัตร (รูปภาพ/PDF)</label>
                        <input type="file" multiple onChange={handleFileChange} className="w-full text-sm mt-1" />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {safeParseArray(formData.attachments).map((f, i) => (
                                <div key={i} className="bg-gray-100 text-xs px-2 py-1 rounded flex items-center gap-1">
                                    <span className="truncate max-w-[100px]">{f instanceof File ? f.name : 'ไฟล์เดิม'}</span>
                                    <button type="button" onClick={() => handleRemoveFile(i)} className="text-red-500 font-bold">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const AchievementPage: React.FC<AchievementPageProps> = ({ currentUser, personnel, achievements, onSave, onDelete, isSaving, academicYears }) => {
    const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState<Partial<Achievement> | null>(null);
    const [viewingAchievement, setViewingAchievement] = useState<Achievement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState<string>('');
    const [myFilterYear, setMyFilterYear] = useState<string>('');

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'pro';

    const myAchievements = useMemo(() => {
        return achievements.filter(a => a.personnelId === currentUser.id);
    }, [achievements, currentUser.id]);
    
    const myFilteredAndGroupedAchievements = useMemo(() => {
        const filtered = myAchievements.filter(ach => !myFilterYear || String(ach.academicYear) === String(myFilterYear));

        const groups: Record<string, Achievement[]> = {};
        filtered.forEach(ach => {
            const year = ach.academicYear || 'ไม่ระบุ';
            if (!groups[year]) {
                groups[year] = [];
            }
            groups[year].push(ach);
        });
        
        return Object.entries(groups).sort(([yearA], [yearB]) => yearB.localeCompare(yearA));
    }, [myAchievements, myFilterYear]);
    
    const filteredAllAchievements = useMemo(() => {
        return achievements.filter(ach => {
            const matchesYear = !filterYear || String(ach.academicYear) === String(filterYear);
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch = !lowerSearch || 
                (ach.personnelName || '').toLowerCase().includes(lowerSearch) || 
                (ach.title || '').toLowerCase().includes(lowerSearch);
            return matchesYear && matchesSearch;
        }).sort((a,b) => new Date(buddhistToISO(a.date)!).getTime() - new Date(buddhistToISO(a.date)!).getTime());
    }, [achievements, filterYear, searchTerm]);

    const handleExportExcel = () => {
        if (filteredAllAchievements.length === 0) {
            alert('ไม่มีข้อมูลให้ส่งออก');
            return;
        }
        const headers = ['วันที่', 'ปีการศึกษา', 'ชื่อ-สกุล', 'เรื่อง/รายการ', 'ระดับผลงาน', 'คำอธิบาย'];
        const rows = filteredAllAchievements.map(ach => [
            ach.date,
            ach.academicYear,
            ach.personnelName,
            ach.title,
            ACHIEVEMENT_LEVELS.find(l => l.id === ach.level)?.label || ach.level,
            ach.description || ''
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";
        rows.forEach(row => {
            csvContent += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        const yearSuffix = filterYear ? filterYear : 'all-years';
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `achievements_export_${yearSuffix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenEditModal = (item?: Achievement) => {
        setEditingAchievement(item || null);
        setIsEditModalOpen(true);
    };

    const handleSave = (item: Achievement) => {
        onSave(item);
        setIsEditModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-navy">ระบบเก็บผลงาน (Portfolio)</h2>
                <button onClick={() => handleOpenEditModal()} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    เพิ่มผลงาน
                </button>
            </div>

            <div className="bg-gray-100 p-1.5 rounded-full flex flex-wrap gap-2 w-fit">
                <button onClick={() => setActiveTab('my')} className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'my' ? 'bg-primary-blue text-white shadow' : 'bg-white text-gray-600 shadow-sm'}`}>ผลงานของฉัน</button>
                {isAdmin && (
                    <button onClick={() => setActiveTab('all')} className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'all' ? 'bg-primary-blue text-white shadow' : 'bg-white text-gray-600 shadow-sm'}`}>ผลงานทั้งหมด</button>
                )}
            </div>
            
            {activeTab === 'my' && (
                <>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <label className="text-sm font-bold text-gray-700">ปีการศึกษา:</label>
                        <select value={myFilterYear} onChange={e => setMyFilterYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                            <option value="">ทั้งหมด</option>
                            {[...academicYears].reverse().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="space-y-6">
                        {myFilteredAndGroupedAchievements.map(([year, achievementsInYear]) => (
                            <div key={year}>
                                <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">ผลงานปีการศึกษา {year}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {achievementsInYear.map(ach => {
                                        const firstAttachment = getFirstImageSource(ach.attachments);
                                        const isPdf = safeParseArray(ach.attachments).some(f => typeof f === 'string' && f.toLowerCase().includes('.pdf'));
                                        return(
                                            <div key={ach.id} className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden group border border-gray-200 shadow-sm cursor-pointer" onClick={() => setViewingAchievement(ach)}>
                                                {firstAttachment ? (
                                                    <img src={firstAttachment} alt={ach.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">{isPdf ? '📄' : '🏆'}</div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <h4 className="font-bold text-white text-sm leading-tight line-clamp-2">{ach.title}</h4>
                                                    <p className="text-xs text-gray-300 mt-1">{formatThaiDate(ach.date)}</p>
                                                </div>
                                                {safeParseArray(ach.attachments).length > 1 && (
                                                    <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">+{safeParseArray(ach.attachments).length}</div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                        {myFilteredAndGroupedAchievements.length === 0 && <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">ไม่พบผลงาน{myFilterYear ? ` ในปีการศึกษา ${myFilterYear}` : ''}</div>}
                    </div>
                </>
            )}

            {activeTab === 'all' && isAdmin && (
                <div className="bg-white p-4 rounded-xl shadow-lg space-y-4 animate-fade-in">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-grow">
                            <label className="text-xs font-medium text-gray-500">ค้นหา</label>
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="ค้นหาชื่อ, เรื่อง..."
                                className="w-full border rounded-lg px-3 py-2 mt-1"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="text-xs font-medium text-gray-500">ปีการศึกษา</label>
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 bg-white">
                                <option value="">ทั้งหมด</option>
                                {[...academicYears].reverse().map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm h-fit shadow-sm hover:bg-green-700 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 font-semibold text-left text-gray-600">วันที่</th>
                                    <th className="p-3 font-semibold text-left text-gray-600">ปีการศึกษา</th>
                                    <th className="p-3 font-semibold text-left text-gray-600">ชื่อ-สกุล</th>
                                    <th className="p-3 font-semibold text-left text-gray-600">เรื่อง</th>
                                    <th className="p-3 font-semibold text-left text-gray-600">ระดับ</th>
                                    <th className="p-3 font-semibold text-center text-gray-600">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredAllAchievements.map(ach => (
                                    <tr key={ach.id} className="hover:bg-gray-50">
                                        <td className="p-3 whitespace-nowrap text-gray-700">{formatThaiDate(ach.date)}</td>
                                        <td className="p-3 whitespace-nowrap text-gray-700">{ach.academicYear}</td>
                                        <td className="p-3 whitespace-nowrap font-medium text-gray-900">{ach.personnelName}</td>
                                        <td className="p-3 whitespace-nowrap text-gray-800">{ach.title}</td>
                                        <td className="p-3 whitespace-nowrap text-gray-700">{ACHIEVEMENT_LEVELS.find(l=>l.id===ach.level)?.label}</td>
                                        <td className="p-3 text-center whitespace-nowrap">
                                            <button onClick={() => setViewingAchievement(ach)} className="text-blue-600 hover:underline text-xs font-bold">ดู</button>
                                            <button onClick={() => onDelete([ach.id])} className="text-red-500 hover:underline text-xs font-bold ml-4">ลบ</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredAllAchievements.length === 0 && <div className="text-center text-gray-500 py-8">ไม่พบผลงาน</div>}
                </div>
            )}
            
            <EditAchievementModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSave}
                isSaving={isSaving}
                currentUser={currentUser}
                achievementToEdit={editingAchievement}
                academicYears={academicYears}
            />

            {viewingAchievement && (
                <ViewAchievementModal
                    achievement={viewingAchievement}
                    onClose={() => setViewingAchievement(null)}
                    onEdit={(item) => {
                        setViewingAchievement(null);
                        handleOpenEditModal(item);
                    }}
                    onDelete={(id) => {
                        onDelete([id]);
                        setViewingAchievement(null);
                    }}
                />
            )}
        </div>
    );
};

export default AchievementPage;
