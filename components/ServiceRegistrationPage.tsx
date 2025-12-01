
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, Student, Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { STUDENT_CLASSES, STUDENT_CLASSROOMS } from '../constants';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const isoToBuddhist = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-').map(Number);
    return `${day}/${month}/${year + 543}`;
};

const buddhistToIso = (buddhistDate: string): string => {
    if(!buddhistDate) return '';
    const parts = buddhistDate.split('/');
    if(parts.length !== 3) return '';
    const [day, month, year] = parts.map(Number);
    return `${year - 543}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const ServiceRegistrationPage: React.FC<ServiceRegistrationPageProps> = ({
    currentUser, students, personnel, records, onSaveRecord, onDeleteRecord,
    serviceLocations, onUpdateLocations, isSaving
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'register' | 'settings'>('stats');
    
    // --- Registration State ---
    const [formData, setFormData] = useState<Partial<ServiceRecord>>({
        date: new Date().toLocaleDateString('th-TH'),
        time: new Date().toTimeString().slice(0, 5),
        location: '',
        purpose: '',
        images: []
    });
    
    // Student Selection State (Table based)
    const [filterClass, setFilterClass] = useState('');
    const [filterRoom, setFilterRoom] = useState('');
    const [filterDorm, setFilterDorm] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | 0>(0);

    // --- View Modal State ---
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewRecord, setViewRecord] = useState<ServiceRecord | null>(null);

    // --- Settings State ---
    const [newLocation, setNewLocation] = useState('');

    // --- Export & Report State ---
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [reportLocation, setReportLocation] = useState('');

    // --- Data Processing ---
    
    // Filter Students for Registration Table
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const [cls, room] = s.studentClass.split('/');
            const matchClass = !filterClass || cls === filterClass;
            const matchRoom = !filterRoom || room === filterRoom;
            const matchDorm = !filterDorm || s.dormitory === filterDorm;
            const matchSearch = !studentSearch || 
                s.studentName.includes(studentSearch) || 
                s.studentNickname.includes(studentSearch) ||
                s.studentIdCard.includes(studentSearch);
            
            return matchClass && matchRoom && matchDorm && matchSearch;
        });
    }, [students, filterClass, filterRoom, filterDorm, studentSearch]);

    const stats = useMemo(() => {
        const locationCounts: Record<string, number> = {};
        const studentSet = new Set<number>();

        records.forEach(r => {
            locationCounts[r.location] = (locationCounts[r.location] || 0) + 1;
            studentSet.add(r.studentId);
        });

        const graphData = Object.entries(locationCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return {
            totalUsage: records.length,
            uniqueStudents: studentSet.size,
            graphData
        };
    }, [records]);

    const dailyRecords = useMemo(() => {
        return [...records].sort((a, b) => b.id - a.id);
    }, [records]);

    const reportRecords = useMemo(() => {
        const targetDate = isoToBuddhist(reportDate);
        return records.filter(r => {
            const dateMatch = r.date === targetDate;
            const locMatch = !reportLocation || r.location === reportLocation;
            return dateMatch && locMatch;
        }).sort((a, b) => a.time.localeCompare(b.time));
    }, [records, reportDate, reportLocation]);

    // --- Handlers ---

    const handleSelectStudent = (id: number) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudentIds(newSet);
    };

    const handleSelectAllStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
        } else {
            setSelectedStudentIds(new Set());
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const currentImages = formData.images || [];
            if (currentImages.length + files.length > 10) {
                alert('สามารถอัปโหลดรูปภาพได้สูงสุด 10 รูป');
                return;
            }
            setFormData(prev => ({ ...prev, images: [...currentImages, ...files] }));
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: (prev.images || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedStudentIds.size === 0) {
            alert('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
            return;
        }
        if (!formData.location || !selectedTeacherId) {
            alert('กรุณาระบุสถานที่และครูผู้ดูแล');
            return;
        }

        const teacher = personnel.find(p => p.id === selectedTeacherId);
        
        // Create a record for each selected student
        Array.from(selectedStudentIds).forEach(studentId => {
            const student = students.find(s => s.id === studentId);
            if (!student) return;

            const recordToSave: ServiceRecord = {
                id: Date.now() + Math.random(), // Ensure unique ID
                date: formData.date || new Date().toLocaleDateString('th-TH'),
                time: formData.time || '',
                studentId: student.id,
                studentName: `${student.studentTitle}${student.studentName}`,
                studentClass: student.studentClass,
                location: formData.location || '',
                purpose: formData.purpose || '',
                teacherId: selectedTeacherId,
                teacherName: teacher ? `${teacher.personnelTitle}${teacher.personnelName}` : '',
                images: formData.images || []
            };
            onSaveRecord(recordToSave);
        });

        alert(`บันทึกข้อมูลเรียบร้อย ${selectedStudentIds.size} รายการ`);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toTimeString().slice(0, 5),
            location: '',
            purpose: '',
            images: []
        });
        setSelectedStudentIds(new Set());
        setSelectedTeacherId(0);
        // Don't reset filters to allow continuous entry
    };

    // View Modal
    const handleView = (record: ServiceRecord) => {
        setViewRecord(record);
        setIsViewModalOpen(true);
    };

    // Settings
    const handleAddLocation = () => {
        if (newLocation.trim() && !serviceLocations.includes(newLocation.trim())) {
            onUpdateLocations([...serviceLocations, newLocation.trim()]);
            setNewLocation('');
        }
    };

    const handleRemoveLocation = (loc: string) => {
        if (window.confirm(`ต้องการลบสถานที่ "${loc}" ใช่หรือไม่?`)) {
            onUpdateLocations(serviceLocations.filter(l => l !== loc));
        }
    };

    // --- Export Handlers ---

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = () => {
        const title = `รายงานการใช้ห้อง_${reportLocation || 'รวม'}_${isoToBuddhist(reportDate)}`;
        const header = ['วันที่', 'เวลา', 'ชื่อ-สกุล', 'ชั้นเรียน', 'สถานที่', 'วัตถุประสงค์', 'ครูผู้ดูแล'];
        const rows = reportRecords.map(r => [
            r.date, r.time, r.studentName, r.studentClass, r.location, r.purpose, r.teacherName
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += `${title}\r\n\r\n`;
        csvContent += header.map(h => `"${h}"`).join(",") + "\r\n";
        rows.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${title}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportWord = () => {
        const title = `รายงานการใช้ห้อง${reportLocation ? ` ${reportLocation}` : ''}`;
        const dateStr = isoToBuddhist(reportDate);
        
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${title}</title>
                <style>
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    td, th { border: 1px solid black; padding: 5px; text-align: left; }
                    th { background-color: #f0f0f0; text-align: center; }
                    .header { text-align: center; font-weight: bold; font-size: 20pt; }
                    .subheader { text-align: center; font-size: 16pt; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">แบบบันทึกการเข้าใช้บริการห้องปฏิบัติการ/ศูนย์การเรียนรู้</div>
                <div class="subheader">ประจำวันที่ ${dateStr} ${reportLocation ? `สถานที่: ${reportLocation}` : ''}</div>
                
                <table>
                    <thead>
                        <tr>
                            <th width="10%">เวลา</th>
                            <th width="20%">ชื่อ-สกุล</th>
                            <th width="10%">ชั้น</th>
                            <th width="15%">สถานที่</th>
                            <th width="25%">วัตถุประสงค์</th>
                            <th width="20%">ครูผู้ดูแล</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportRecords.map(r => `
                            <tr>
                                <td align="center">${r.time}</td>
                                <td>${r.studentName}</td>
                                <td align="center">${r.studentClass}</td>
                                <td>${r.location}</td>
                                <td>${r.purpose}</td>
                                <td>${r.teacherName}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${reportRecords.length === 0 ? '<p style="text-align:center; margin-top:20px;">- ไม่มีรายการ -</p>' : ''}
                
                <br/><br/>
                <div style="text-align: right; padding-right: 50px;">
                    <p>ลงชื่อ ........................................................... ผู้รายงาน</p>
                    <p>(...........................................................)</p>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title}_${dateStr}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <style>{`
                @media print {
                    @page { size: A4; margin: 2cm; }
                    body * { visibility: hidden; }
                    #print-service-report, #print-service-report * { visibility: visible; }
                    #print-service-report { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm no-print">
                <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติ & รายงาน
                </button>
                <button onClick={() => setActiveTab('register')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'register' ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    ลงทะเบียนการใช้ห้อง
                </button>
                <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    ตั้งค่าสถานที่
                </button>
            </div>

            {/* --- TAB 1: STATS & EXPORT --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in no-print">
                    {/* Export Controls */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
                        <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            ส่งออกรายงาน (Export Report)
                        </h3>
                        <div className="flex flex-wrap gap-4 items-end bg-indigo-50 p-4 rounded-lg">
                            <div>
                                <label className="block text-sm font-bold text-indigo-900 mb-1">1. เลือกวันที่</label>
                                <input 
                                    type="date" 
                                    value={reportDate} 
                                    onChange={(e) => setReportDate(e.target.value)} 
                                    className="border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 w-48"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-indigo-900 mb-1">2. เลือกห้อง/สถานที่</label>
                                <select 
                                    value={reportLocation} 
                                    onChange={(e) => setReportLocation(e.target.value)} 
                                    className="border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                                >
                                    <option value="">ทั้งหมด</option>
                                    {serviceLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <button onClick={handleExportExcel} disabled={reportRecords.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow disabled:opacity-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Excel
                                </button>
                                <button onClick={handleExportWord} disabled={reportRecords.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow disabled:opacity-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Word
                                </button>
                                <button onClick={handlePrint} disabled={reportRecords.length === 0} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow disabled:opacity-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> PDF
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-600">
                            พบข้อมูลจำนวน: <span className="font-bold text-indigo-600">{reportRecords.length}</span> รายการ
                        </div>
                    </div>

                    {/* Stats Graphs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                            <p className="text-gray-500">การเข้าใช้บริการทั้งหมด</p>
                            <h3 className="text-4xl font-bold text-navy mt-2">{stats.totalUsage} <span className="text-lg text-gray-400 font-normal">ครั้ง</span></h3>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                            <p className="text-gray-500">จำนวนนักเรียนที่มาใช้</p>
                            <h3 className="text-4xl font-bold text-green-600 mt-2">{stats.uniqueStudents} <span className="text-lg text-gray-400 font-normal">คน</span></h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow">
                        <h3 className="text-xl font-bold text-navy mb-6">กราฟแสดงจำนวนการเข้าใช้แต่ละห้อง</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{fill: '#6B7280'}} />
                                    <YAxis tick={{fill: '#6B7280'}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                                    <Bar dataKey="value" name="จำนวนครั้ง" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={50}>
                                        {stats.graphData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: REGISTRATION (Improved) --- */}
            {activeTab === 'register' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in no-print">
                    
                    {/* Left Column: Student Selection Table */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[800px]">
                        <div className="p-4 bg-gray-50 border-b space-y-3">
                            <h3 className="font-bold text-navy flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                1. เลือกนักเรียน ({selectedStudentIds.size} คน)
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                    <option value="">ทุกระดับชั้น</option>
                                    {STUDENT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                    <option value="">ทุกห้อง</option>
                                    {STUDENT_CLASSROOMS.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                                </select>
                                <select value={filterDorm} onChange={e => setFilterDorm(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                    <option value="">ทุกเรือนนอน</option>
                                    {Array.from(new Set(students.map(s => s.dormitory))).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อ..." 
                                value={studentSearch} 
                                onChange={e => setStudentSearch(e.target.value)} 
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        
                        <div className="overflow-y-auto flex-grow">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 w-10 text-center">
                                            <input type="checkbox" onChange={handleSelectAllStudents} checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length} className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                        </th>
                                        <th className="p-3">ชื่อ-นามสกุล</th>
                                        <th className="p-3 text-center">ชั้น</th>
                                        <th className="p-3">เรือน</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className={`hover:bg-green-50 cursor-pointer ${selectedStudentIds.has(student.id) ? 'bg-green-50' : ''}`} onClick={() => handleSelectStudent(student.id)}>
                                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedStudentIds.has(student.id)} onChange={() => handleSelectStudent(student.id)} className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                            </td>
                                            <td className="p-3 font-medium">
                                                {student.studentTitle}{student.studentName}
                                                <div className="text-xs text-gray-500">{student.studentNickname}</div>
                                            </td>
                                            <td className="p-3 text-center text-xs">{student.studentClass}</td>
                                            <td className="p-3 text-xs">{student.dormitory}</td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">ไม่พบนักเรียน</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
                            แสดง {filteredStudents.length} รายการ
                        </div>
                    </div>

                    {/* Right Column: Registration Form & History */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-600 sticky top-4">
                            <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                2. บันทึกข้อมูล ({selectedStudentIds.size} คน)
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">สถานที่/ห้อง</label>
                                    <select required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500">
                                        <option value="">-- เลือก --</option>
                                        {serviceLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">วันที่</label>
                                        <input type="text" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm text-center" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">เวลา</label>
                                        <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm text-center" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">วัตถุประสงค์</label>
                                    <textarea rows={2} value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="เช่น ทำการบ้าน, สืบค้นข้อมูล"></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">ครูผู้ดูแล</label>
                                    <select required value={selectedTeacherId} onChange={e => setSelectedTeacherId(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                                        <option value={0}>-- เลือกครู --</option>
                                        {personnel.map(p => <option key={p.id} value={p.id}>{p.personnelTitle}{p.personnelName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">รูปภาพ (ไม่เกิน 10 รูป)</label>
                                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                                    {formData.images && formData.images.length > 0 && (
                                        <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                                            {formData.images.map((img, idx) => (
                                                <div key={idx} className="relative w-12 h-12 flex-shrink-0">
                                                    <img src={img instanceof File ? URL.createObjectURL(img) : getDirectDriveImageSrc(img)} className="w-full h-full object-cover rounded border" />
                                                    <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button type="submit" disabled={isSaving || selectedStudentIds.size === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow disabled:opacity-50 transition-colors">
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเข้าใช้'}
                                </button>
                            </form>
                        </div>

                        {/* Recent History Mini Table */}
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                            <h3 className="font-bold text-gray-700 mb-2 text-sm">ประวัติล่าสุด (วันนี้)</h3>
                            <div className="overflow-y-auto max-h-60">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="p-2">เวลา</th>
                                            <th className="p-2">ชื่อ</th>
                                            <th className="p-2">ห้อง</th>
                                            <th className="p-2 text-center">ลบ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {dailyRecords.slice(0, 10).map(r => (
                                            <tr key={r.id}>
                                                <td className="p-2 text-gray-500">{r.time}</td>
                                                <td className="p-2 font-medium truncate max-w-[100px]">{r.studentName}</td>
                                                <td className="p-2 text-gray-500">{r.location}</td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => {if(window.confirm('ลบ?')) onDeleteRecord([r.id])}} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 3: SETTINGS --- */}
            {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-xl shadow-lg animate-fade-in max-w-2xl mx-auto no-print">
                    <h2 className="text-xl font-bold text-navy mb-6">ตั้งค่าสถานที่ให้บริการ</h2>
                    <div className="flex gap-2 mb-6">
                        <input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="flex-grow px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" placeholder="ระบุชื่อห้อง/สถานที่..." />
                        <button onClick={handleAddLocation} disabled={isSaving} className="bg-primary-blue text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow disabled:opacity-50">เพิ่ม</button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                        {serviceLocations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">ยังไม่มีข้อมูลสถานที่</div>
                        ) : (
                            <ul className="divide-y">
                                {serviceLocations.map((loc, idx) => (
                                    <li key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                        <span className="font-medium text-gray-800">{loc}</span>
                                        <button onClick={() => handleRemoveLocation(loc)} disabled={isSaving} className="text-red-500 hover:bg-red-100 p-2 rounded-full disabled:opacity-50"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* --- PRINT LAYOUT --- */}
            <div id="print-service-report" className="hidden print:block font-sarabun">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">บันทึกการเข้าใช้บริการห้องปฏิบัติการ/ศูนย์การเรียนรู้</h1>
                    <h2 className="text-xl">ประจำวันที่ {isoToBuddhist(reportDate)}</h2>
                    {reportLocation && <h3 className="text-lg">สถานที่: {reportLocation}</h3>}
                </div>
                
                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-2 text-center" style={{ width: "10%" }}>เวลา</th>
                            <th className="border border-black p-2" style={{ width: "20%" }}>ชื่อ-สกุล</th>
                            <th className="border border-black p-2 text-center" style={{ width: "10%" }}>ชั้น</th>
                            <th className="border border-black p-2" style={{ width: "15%" }}>สถานที่</th>
                            <th className="border border-black p-2" style={{ width: "25%" }}>วัตถุประสงค์</th>
                            <th className="border border-black p-2" style={{ width: "20%" }}>ครูผู้ดูแล</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportRecords.map((r, idx) => (
                            <tr key={idx}>
                                <td className="border border-black p-2 text-center">{r.time}</td>
                                <td className="border border-black p-2">{r.studentName}</td>
                                <td className="border border-black p-2 text-center">{r.studentClass}</td>
                                <td className="border border-black p-2">{r.location}</td>
                                <td className="border border-black p-2">{r.purpose}</td>
                                <td className="border border-black p-2">{r.teacherName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {reportRecords.length === 0 && <p className="text-center mt-4">- ไม่มีรายการ -</p>}

                <div className="mt-16 flex justify-end">
                    <div className="text-center">
                        <p className="mb-8">ลงชื่อ ........................................................... ผู้รายงาน</p>
                        <p>(...........................................................)</p>
                        <p>ตำแหน่ง ...........................................................</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceRegistrationPage;
