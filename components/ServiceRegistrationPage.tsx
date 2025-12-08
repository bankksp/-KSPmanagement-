
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, Personnel, Student } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getFirstImageSource, buddhistToISO, isoToBuddhist, getCurrentThaiDate, formatThaiDate, parseThaiDateForSort } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ServiceRegistrationPageProps {
    currentUser: Personnel;
    students: Student[];
    personnel: Personnel[];
    records: ServiceRecord[];
    onSaveRecord: (record: ServiceRecord) => void;
    onDeleteRecord: (ids: number[]) => void;
    serviceLocations: string[];
    onUpdateLocations: (locations: string[]) => void;
    isSaving: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const ServiceRegistrationPage: React.FC<ServiceRegistrationPageProps> = ({ 
    currentUser, students, personnel, records, onSaveRecord, onDeleteRecord, 
    serviceLocations, onUpdateLocations, isSaving 
}) => {
    // Set 'stats' as default tab
    const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'settings'>('stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Stats Filtering
    const currentYear = new Date().getFullYear() + 543;
    const currentMonth = new Date().getMonth() + 1;
    const [statsMonth, setStatsMonth] = useState<number>(currentMonth);
    const [statsYear, setStatsYear] = useState<number>(currentYear);
    const [filterLocation, setFilterLocation] = useState<string>(''); 

    // View Modal State
    const [viewRecord, setViewRecord] = useState<ServiceRecord | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExportSingleMenuOpen, setIsExportSingleMenuOpen] = useState(false);

    const [currentRecord, setCurrentRecord] = useState<Partial<ServiceRecord>>({});
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Settings State
    const [newLocation, setNewLocation] = useState('');
    
    // Export State (Global)
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // --- Stats Calculations ---
    const stats = useMemo(() => {
        // Robust Date Parsing
        const getRecordDateParts = (dateStr: string) => {
            if (!dateStr) return { d: 0, m: 0, y: 0 };
            
            let d = 0, m = 0, y = 0;
            // Normalize separators
            const normalized = dateStr.replace(/-/g, '/');
            const parts = normalized.split('/');
            
            if (parts.length === 3) {
                if (parts[0].length === 4) { // YYYY/MM/DD
                    y = parseInt(parts[0]);
                    m = parseInt(parts[1]);
                    d = parseInt(parts[2]);
                } else { // DD/MM/YYYY
                    d = parseInt(parts[0]);
                    m = parseInt(parts[1]);
                    y = parseInt(parts[2]);
                }
            }
            
            // Adjust Gregorian to Buddhist if necessary
            if (y > 1900 && y < 2400) {
                y += 543;
            }
            
            return { d, m, y };
        };

        // Filter records by Month/Year AND Location (if selected)
        const filteredByDate = records.filter(r => {
            const { m, y } = getRecordDateParts(r.date);
            const matchDate = m === statsMonth && y === statsYear;
            const matchLoc = filterLocation === '' || r.location === filterLocation;
            return matchDate && matchLoc;
        });

        const totalRequests = filteredByDate.length;
        const totalStudentsServed = filteredByDate.reduce((sum, r) => sum + (r.students?.length || (r.studentId ? 1 : 0)), 0);
        
        // 1. Daily Usage (Bar Chart)
        const daysInMonth = new Date(statsYear - 543, statsMonth, 0).getDate();
        const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const count = filteredByDate.filter(r => getRecordDateParts(r.date).d === day).length;
            return { day: day.toString(), count };
        });

        // 2. Location Usage (Pie Chart)
        const locationStats: Record<string, number> = {};
        filteredByDate.forEach(r => {
            const loc = r.location || 'ไม่ระบุ';
            locationStats[loc] = (locationStats[loc] || 0) + 1;
        });
        
        const locationData = Object.entries(locationStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 3. Top Locations (Summary)
        const topLocations = [...locationData].slice(0, 5);

        return { 
            totalRequests, 
            totalStudentsServed, 
            dailyData, 
            locationData, 
            topLocations,
            filteredByDate // Pass filtered data for export
        };
    }, [records, statsMonth, statsYear, filterLocation]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const searchLower = searchTerm.toLowerCase();
            return r.purpose.toLowerCase().includes(searchLower) ||
                   r.teacherName.toLowerCase().includes(searchLower) ||
                   r.location.toLowerCase().includes(searchLower);
        }).sort((a, b) => {
            // Sort by date desc using robust parser
            const dateA = parseThaiDateForSort(a.date);
            const dateB = parseThaiDateForSort(b.date);
            if (dateA !== dateB) return dateB - dateA;
            return b.time.localeCompare(a.time);
        });
    }, [records, searchTerm]);

    // Reset slide on open
    useEffect(() => {
        if (isViewModalOpen) {
            setCurrentSlide(0);
            setIsExportSingleMenuOpen(false);
        }
    }, [isViewModalOpen]);

    // --- Handlers ---
    const handleOpenModal = (record?: ServiceRecord) => {
        if (record) {
            setCurrentRecord({ ...record });
        } else {
            setCurrentRecord({
                date: getCurrentThaiDate(),
                time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                location: serviceLocations[0] || '',
                purpose: '',
                teacherId: currentUser.id,
                teacherName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                students: [],
                images: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const recordToSave = {
            ...currentRecord,
            id: currentRecord.id || Date.now(),
            // Backward compatibility
            studentId: currentRecord.students?.[0]?.id || 0,
            studentName: currentRecord.students?.[0]?.name || '',
            studentClass: currentRecord.students?.[0]?.class || '',
        } as ServiceRecord;
        
        onSaveRecord(recordToSave);
        setIsModalOpen(false);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size > 0 && window.confirm(`ยืนยันการลบ ${selectedIds.size} รายการ?`)) {
            onDeleteRecord(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setCurrentRecord(prev => ({
                ...prev,
                images: [...(prev.images || []), ...newFiles]
            }));
        }
    };

    const handleAddStudent = (studentId: string) => {
        const student = students.find(s => String(s.id) === studentId);
        if (student) {
            const newStudentObj = {
                id: student.id,
                name: `${student.studentTitle}${student.studentName}`,
                class: student.studentClass,
                nickname: student.studentNickname
            };
            // Prevent duplicates
            if (!currentRecord.students?.some(s => s.id === student.id)) {
                setCurrentRecord(prev => ({
                    ...prev,
                    students: [...(prev.students || []), newStudentObj]
                }));
            }
        }
    };

    const handleRemoveStudent = (studentId: number) => {
        setCurrentRecord(prev => ({
            ...prev,
            students: (prev.students || []).filter(s => s.id !== studentId)
        }));
    };

    // Settings Handlers
    const handleAddLocation = () => {
        if (newLocation && !serviceLocations.includes(newLocation)) {
            onUpdateLocations([...serviceLocations, newLocation]);
            setNewLocation('');
        }
    };

    const handleRemoveLocation = (loc: string) => {
        if (window.confirm(`ต้องการลบสถานที่ "${loc}" หรือไม่?`)) {
            onUpdateLocations(serviceLocations.filter(l => l !== loc));
        }
    };

    // --- EXPORT HANDLERS ---

    const handlePrint = () => {
        setIsExportMenuOpen(false);
        window.print();
    };

    const getExportContent = () => {
        const content = document.getElementById('print-service-stats');
        return content ? content.innerHTML : '';
    };

    const handleExportWord = () => {
        setIsExportMenuOpen(false);
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>รายงานสถิติการใช้บริการ</title>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                    td, th { border: 1px solid #000; padding: 5px; vertical-align: top; }
                    th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
                    .header { text-align: center; font-weight: bold; font-size: 20pt; margin-bottom: 20px; }
                    .sub-header { font-weight: bold; font-size: 18pt; margin-top: 15px; margin-bottom: 5px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body>
                ${getExportContent()}
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `service_stats_${statsMonth}_${statsYear}_${filterLocation || 'all'}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        setIsExportMenuOpen(false);
        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #000; padding: 5px; vertical-align: top; }
                    th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                ${getExportContent()}
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `service_stats_${statsMonth}_${statsYear}_${filterLocation || 'all'}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Single Record Export ---
    const handleExportSingleRecordWord = () => {
        if (!viewRecord) return;
        
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>บันทึกการใช้บริการ</title>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; line-height: 1.5; }
                    .header { text-align: center; font-weight: bold; font-size: 20pt; margin-bottom: 20px; }
                    .content { margin-bottom: 8px; }
                    .label { font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid black; padding: 5px; }
                    th { background-color: #f0f0f0; }
                </style>
            </head>
            <body>
                <div class="header">บันทึกการขอใช้บริการแหล่งเรียนรู้</div>
                <div class="content"><span class="label">วันที่:</span> ${formatThaiDate(viewRecord.date)} <span class="label">เวลา:</span> ${viewRecord.time} น.</div>
                <div class="content"><span class="label">สถานที่:</span> ${viewRecord.location}</div>
                <div class="content"><span class="label">วัตถุประสงค์:</span> ${viewRecord.purpose}</div>
                <div class="content"><span class="label">ครูผู้ดูแล:</span> ${viewRecord.teacherName}</div>
                
                <div class="content" style="margin-top: 20px;"><span class="label">รายชื่อนักเรียน (${viewRecord.students?.length || (viewRecord.studentId ? 1 : 0)} คน):</span></div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%;">ลำดับ</th>
                            <th>ชื่อ-สกุล</th>
                            <th style="width: 20%;">ชั้น</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(viewRecord.students || []).map((s, i) => `
                            <tr>
                                <td style="text-align: center;">${i + 1}</td>
                                <td>${(s as any).name}</td>
                                <td style="text-align: center;">${(s as any).class || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `service_record_${viewRecord.date.replace(/\//g, '-')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportSingleMenuOpen(false);
    };

    const handlePrintSingleRecord = () => {
        if (!viewRecord) return;
        const width = 800;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const win = window.open('', '_blank', `width=${width},height=${height},top=${top},left=${left}`);
        if (!win) return;

        const studentsHtml = (viewRecord.students || []).map((s, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${(s as any).name}</td>
                <td style="text-align: center;">${(s as any).class || '-'}</td>
            </tr>
        `).join('');

        win.document.write(`
            <html>
            <head>
                <title>พิมพ์บันทึกการใช้บริการ</title>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Sarabun', sans-serif; padding: 20px; }
                    .header { text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 20px; }
                    .content-row { margin-bottom: 10px; display: flex; }
                    .label { font-weight: bold; width: 100px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { background-color: #f0f0f0; text-align: center; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="header">บันทึกการขอใช้บริการแหล่งเรียนรู้</div>
                <div class="content-row"><span class="label">วันที่:</span> ${formatThaiDate(viewRecord.date)} &nbsp;&nbsp; <span class="label">เวลา:</span> ${viewRecord.time} น.</div>
                <div class="content-row"><span class="label">สถานที่:</span> ${viewRecord.location}</div>
                <div class="content-row"><span class="label">วัตถุประสงค์:</span> ${viewRecord.purpose}</div>
                <div class="content-row"><span class="label">ครูผู้ดูแล:</span> ${viewRecord.teacherName}</div>
                
                <h3 style="margin-top: 20px; font-size: 18px;">รายชื่อนักเรียน (${viewRecord.students?.length || 0} คน)</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">ลำดับ</th>
                            <th>ชื่อ-สกุล</th>
                            <th style="width: 150px;">ชั้น</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentsHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        win.document.close();
        setIsExportSingleMenuOpen(false);
    };

    // --- Render View Modal (Updated Design) ---
    const renderViewModal = () => {
        if (!isViewModalOpen || !viewRecord) return null;
        const images = safeParseArray(viewRecord.images);
        const hasImages = images.length > 0;

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    
                    {/* 1. Header Image / Slideshow */}
                    <div className="relative h-56 bg-gray-100 flex items-center justify-center">
                        {hasImages ? (
                            <>
                                <img 
                                    src={getDirectDriveImageSrc(images[currentSlide])} 
                                    alt="Activity" 
                                    className="w-full h-full object-cover"
                                />
                                {/* Navigation Arrows */}
                                {images.length > 1 && (
                                    <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev - 1 + images.length) % images.length); }}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev + 1) % images.length); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                        {/* Counter */}
                                        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-mono">
                                            {currentSlide + 1} / {images.length}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm">ไม่มีรูปภาพ</span>
                            </div>
                        )}
                        
                        {/* Close Button on Image */}
                        <button 
                            onClick={() => setIsViewModalOpen(false)} 
                            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* 2. Content Area */}
                    <div className="p-6 overflow-y-auto bg-gray-50 flex-grow">
                        
                        {/* Info Cards Row */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {/* Date */}
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold">วันที่</span>
                                <span className="text-xs font-bold text-navy">{formatThaiDate(viewRecord.date)}</span>
                            </div>
                            
                            {/* Time */}
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold">เวลา</span>
                                <span className="text-xs font-bold text-navy">{viewRecord.time} น.</span>
                            </div>

                            {/* Location */}
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold">สถานที่</span>
                                <span className="text-xs font-bold text-navy truncate w-full">{viewRecord.location}</span>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="space-y-3 mb-6">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 mb-1">วัตถุประสงค์การใช้งาน</h4>
                                        <p className="text-sm font-semibold text-gray-800 leading-relaxed">{viewRecord.purpose}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 mb-1">ครูผู้ดูแล</h4>
                                        <p className="text-sm font-semibold text-gray-800">{viewRecord.teacherName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Student List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h4 className="font-bold text-primary-blue flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    รายชื่อนักเรียน
                                </h4>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {viewRecord.students?.length || 0} คน
                                </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {(viewRecord.students || []).map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-sm font-bold text-gray-800 truncate">{(s as any).name}</p>
                                            </div>
                                            {(s as any).nickname && <p className="text-xs text-gray-500">ชื่อเล่น: {(s as any).nickname}</p>}
                                        </div>
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                                            {(s as any).class}
                                        </span>
                                    </div>
                                ))}
                                {(!viewRecord.students || viewRecord.students.length === 0) && (
                                    <div className="p-4 text-center text-gray-400 text-sm">ไม่มีรายชื่อนักเรียน</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. Footer Actions */}
                    <div className="p-4 bg-white border-t flex items-center justify-between gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="relative">
                            <button 
                                onClick={() => setIsExportSingleMenuOpen(!isExportSingleMenuOpen)}
                                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-sm"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                <span>ดาวน์โหลด</span>
                            </button>
                            {isExportSingleMenuOpen && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30 animate-fade-in-up">
                                    <button onClick={handleExportSingleRecordWord} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 border-b border-gray-100">
                                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                                        ไฟล์ Word (.doc)
                                    </button>
                                    <button onClick={handlePrintSingleRecord} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                        พิมพ์ / PDF
                                    </button>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setIsViewModalOpen(false)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-6 rounded-xl transition-all active:scale-95 text-sm"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Sidebar / Tabs */}
            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm no-print">
                <button 
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติการใช้บริการ
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    ลงทะเบียน / ประวัติ
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    ตั้งค่า
                </button>
            </div>

            {/* DASHBOARD TAB */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in no-print">
                    <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500">เดือน:</span>
                            <select value={statsMonth} onChange={(e) => setStatsMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm bg-gray-50">
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500">ปี:</span>
                            <select value={statsYear} onChange={(e) => setStatsYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm bg-gray-50">
                                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500">สถานที่:</span>
                            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-gray-50">
                                <option value="">ทั้งหมด</option>
                                {serviceLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                        
                        <div className="ml-auto relative">
                            <button 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-green-700 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                ส่งออกรายงาน
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in-up">
                                    <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-b border-gray-100">Word (.doc)</button>
                                    <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 border-b border-gray-100">Excel (.xls)</button>
                                    <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">พิมพ์ / PDF</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* KPI Cards */}
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm font-medium">จำนวนครั้งที่ใช้บริการ</p>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-4xl font-bold text-navy">{stats.totalRequests}</span>
                                <span className="text-sm text-gray-400 mb-1">ครั้ง</span>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                            <p className="text-gray-500 text-sm font-medium">จำนวนนักเรียนที่เข้าร่วม</p>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-4xl font-bold text-green-600">{stats.totalStudentsServed}</span>
                                <span className="text-sm text-gray-400 mb-1">คน</span>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                            <p className="text-gray-500 text-sm font-medium">สถานที่ยอดนิยม</p>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-lg font-bold text-purple-600 truncate">{stats.topLocations[0]?.name || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Daily Usage Chart */}
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สถิติการใช้บริการรายวัน</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.dailyData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="day" fontSize={10} tick={{fill: '#9CA3AF'}} interval={0} />
                                        <YAxis fontSize={12} tick={{fill: '#9CA3AF'}} allowDecimals={false} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                        <Bar dataKey="count" name="จำนวนครั้ง" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Location Pie Chart */}
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนการใช้บริการแยกตามสถานที่</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.locationData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.locationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST TAB */}
            {activeTab === 'list' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in no-print">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-navy">ประวัติการลงทะเบียน</h2>
                        <div className="flex gap-2">
                            {selectedIds.size > 0 && (
                                <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-red-700">
                                    ลบ {selectedIds.size} รายการ
                                </button>
                            )}
                            <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                ลงทะเบียนใหม่
                            </button>
                        </div>
                    </div>

                    <div className="mb-4 relative">
                        <input 
                            type="text" 
                            placeholder="ค้นหาวัตถุประสงค์, สถานที่, หรือชื่อครู..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                                <tr>
                                    <th className="p-4 w-10 text-center"><input type="checkbox" onChange={(e) => {
                                        if (e.target.checked) setSelectedIds(new Set(filteredRecords.map(r => r.id)));
                                        else setSelectedIds(new Set());
                                    }} /></th>
                                    <th className="p-4">วันที่/เวลา</th>
                                    <th className="p-4">สถานที่</th>
                                    <th className="p-4">วัตถุประสงค์</th>
                                    <th className="p-4">จำนวน นร.</th>
                                    <th className="p-4">ผู้ดูแล</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.map(record => (
                                    <tr key={record.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.has(record.id)} onChange={() => handleSelect(record.id)} /></td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="font-bold text-navy">{formatThaiDate(record.date)}</div>
                                            <div className="text-xs text-gray-500">{record.time} น.</div>
                                        </td>
                                        <td className="p-4 font-medium">{record.location}</td>
                                        <td className="p-4 text-gray-600 truncate max-w-[200px]">{record.purpose}</td>
                                        <td className="p-4 text-center">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                                                {record.students?.length || (record.studentId ? 1 : 0)} คน
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">{record.teacherName}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => { setViewRecord(record); setIsViewModalOpen(true); }}
                                                    className="bg-sky-100 text-sky-700 p-1.5 rounded hover:bg-sky-200 transition-colors" 
                                                    title="ดูรายละเอียด"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenModal(record)}
                                                    className="bg-amber-100 text-amber-700 p-1.5 rounded hover:bg-amber-200 transition-colors" 
                                                    title="แก้ไข"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in max-w-2xl mx-auto no-print">
                    <h2 className="text-xl font-bold text-navy mb-4">จัดการสถานที่ให้บริการ</h2>
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={newLocation} 
                            onChange={(e) => setNewLocation(e.target.value)} 
                            placeholder="ระบุชื่อสถานที่ใหม่..." 
                            className="border rounded-lg px-4 py-2 flex-grow focus:ring-2 focus:ring-primary-blue"
                        />
                        <button onClick={handleAddLocation} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">เพิ่ม</button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-bold text-gray-600 mb-3">รายชื่อสถานที่ปัจจุบัน</h3>
                        <div className="flex flex-wrap gap-2">
                            {serviceLocations.map(loc => (
                                <span key={loc} className="bg-white border border-gray-200 px-3 py-1.5 rounded-full text-sm text-gray-700 flex items-center gap-2 shadow-sm">
                                    {loc}
                                    <button onClick={() => handleRemoveLocation(loc)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 no-print">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentRecord.id ? 'แก้ไขข้อมูล' : 'ลงทะเบียนเข้าใช้บริการ'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={buddhistToISO(currentRecord.date)} 
                                        onChange={e => setCurrentRecord({...currentRecord, date: isoToBuddhist(e.target.value)})} 
                                        className="w-full px-3 py-2 border rounded-lg" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เวลา</label>
                                    <input type="time" required value={currentRecord.time} onChange={e => setCurrentRecord({...currentRecord, time: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">สถานที่</label>
                                    <select required value={currentRecord.location} onChange={e => setCurrentRecord({...currentRecord, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="">-- เลือกสถานที่ --</option>
                                        {serviceLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ครูผู้ดูแล</label>
                                    <select value={currentRecord.teacherId} onChange={e => {
                                        const t = personnel.find(p => p.id === Number(e.target.value));
                                        if(t) setCurrentRecord({...currentRecord, teacherId: t.id, teacherName: `${t.personnelTitle}${t.personnelName}`});
                                    }} className="w-full px-3 py-2 border rounded-lg">
                                        {personnel.map(p => <option key={p.id} value={p.id}>{p.personnelTitle}{p.personnelName}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">วัตถุประสงค์การใช้งาน</label>
                                <textarea rows={2} required value={currentRecord.purpose} onChange={e => setCurrentRecord({...currentRecord, purpose: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="เช่น สืบค้นข้อมูล, เรียนรู้นอกเวลา..."></textarea>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">รายชื่อนักเรียน ({currentRecord.students?.length || 0})</label>
                                <div className="flex gap-2 mb-2">
                                    <select id="student-select" className="flex-grow px-3 py-2 border rounded-lg text-sm" onChange={(e) => handleAddStudent(e.target.value)} value="">
                                        <option value="">-- เลือกนักเรียนเพื่อเพิ่ม --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.studentTitle}{s.studentName} ({s.studentClass})</option>)}
                                    </select>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {(currentRecord.students || []).map((s, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-sm">
                                            <span>{i+1}. {s.name} <span className="text-gray-400 text-xs">({s.class})</span></span>
                                            <button type="button" onClick={() => handleRemoveStudent(s.id)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                                        </div>
                                    ))}
                                    {(!currentRecord.students || currentRecord.students.length === 0) && <p className="text-gray-400 text-sm text-center py-2">ยังไม่มีรายชื่อนักเรียน</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพประกอบ (ถ้ามี)</label>
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW DETAIL MODAL */}
            {renderViewModal()}

            {/* Hidden Print Content */}
            <div id="print-service-stats" className="hidden">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">รายงานสถิติการใช้บริการแหล่งเรียนรู้</h1>
                    <p>ประจำเดือน {new Date(0, statsMonth - 1).toLocaleString('th-TH', { month: 'long' })} ปี {statsYear}</p>
                    {filterLocation && <p>สถานที่: {filterLocation}</p>}
                </div>
                <div className="flex justify-between mb-4 text-lg">
                    <p><b>จำนวนครั้งที่ใช้บริการ:</b> {stats.totalRequests} ครั้ง</p>
                    <p><b>จำนวนนักเรียนที่เข้าร่วม:</b> {stats.totalStudentsServed} คน</p>
                </div>
                <table className="w-full border-collapse border border-black text-left">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-2">ลำดับ</th>
                            <th className="border border-black p-2">วันที่</th>
                            <th className="border border-black p-2">เวลา</th>
                            <th className="border border-black p-2">สถานที่</th>
                            <th className="border border-black p-2">ผู้ดูแล</th>
                            <th className="border border-black p-2 text-center">จำนวน นร.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.filteredByDate.map((r, i) => (
                            <tr key={i}>
                                <td className="border border-black p-2 text-center">{i + 1}</td>
                                <td className="border border-black p-2">{formatThaiDate(r.date)}</td>
                                <td className="border border-black p-2">{r.time}</td>
                                <td className="border border-black p-2">{r.location}</td>
                                <td className="border border-black p-2">{r.teacherName}</td>
                                <td className="border border-black p-2 text-center">{r.students?.length || (r.studentId ? 1 : 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 text-right">
                    <p>ลงชื่อ ........................................................... ผู้รายงาน</p>
                    <p>( {currentUser.personnelName} )</p>
                    <p>ตำแหน่ง {currentUser.position}</p>
                </div>
            </div>
        </div>
    );
};

export default ServiceRegistrationPage;
