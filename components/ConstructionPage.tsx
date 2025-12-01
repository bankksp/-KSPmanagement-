


import React, { useState, useMemo, useEffect } from 'react';
import { ConstructionRecord, Personnel, ConstructionStatus } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getFirstImageSource } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ConstructionPageProps {
    currentUser: Personnel;
    records: ConstructionRecord[];
    onSave: (record: ConstructionRecord) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
    // We need personnel list for supervisor selection
    personnel?: Personnel[]; 
}

const COLORS = ['#9CA3AF', '#3B82F6', '#10B981', '#EF4444']; // gray, blue, green, red

const ConstructionPage: React.FC<ConstructionPageProps> = ({ currentUser, records, onSave, onDelete, isSaving, personnel = [] }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form State
    const [currentRecord, setCurrentRecord] = useState<Partial<ConstructionRecord>>({});
    
    // View/Export State
    const [viewRecord, setViewRecord] = useState<ConstructionRecord | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Supervisor Selection State
    const [supervisorSearch, setSupervisorSearch] = useState('');
    const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false);

    // --- Stats Logic ---
    const stats = useMemo(() => {
        const total = records.length;
        const totalBudget = records.reduce((sum, r) => sum + (r.budget || 0), 0);
        const active = records.filter(r => r.status === 'in_progress').length;
        const completed = records.filter(r => r.status === 'completed').length;

        const statusCounts = {
            not_started: 0,
            in_progress: 0,
            completed: 0,
            delayed: 0
        };

        records.forEach(r => {
            if (statusCounts[r.status] !== undefined) {
                statusCounts[r.status]++;
            }
        });

        const pieData = [
            { name: 'ยังไม่เริ่ม', value: statusCounts.not_started, color: '#9CA3AF' },
            { name: 'กำลังดำเนินการ', value: statusCounts.in_progress, color: '#3B82F6' },
            { name: 'เสร็จสิ้น', value: statusCounts.completed, color: '#10B981' },
            { name: 'ล่าช้า', value: statusCounts.delayed, color: '#EF4444' }
        ].filter(d => d.value > 0);

        const progressData = records.map(r => ({
            name: r.projectName.length > 15 ? r.projectName.substring(0, 15) + '...' : r.projectName,
            progress: r.progress
        })).sort((a, b) => b.progress - a.progress).slice(0, 10);

        return { total, totalBudget, active, completed, pieData, progressData };
    }, [records]);

    // --- Filtered Data ---
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch = r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  r.contractor.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !filterStatus || r.status === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [records, searchTerm, filterStatus]);

    // --- Handlers ---
    const handleOpenModal = (record?: ConstructionRecord) => {
        if (record) {
            setCurrentRecord({ ...record });
        } else {
            setCurrentRecord({
                date: new Date().toLocaleDateString('th-TH'),
                projectName: '',
                contractor: '',
                location: '',
                progress: 0,
                status: 'not_started',
                contractorWork: '', // New
                materials: '', // New
                workers: '', // New
                description: '', // This is "Daily Work"
                problems: '', // New
                startDate: '',
                endDate: '',
                budget: 0,
                media: [],
                reporter: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                supervisors: [currentUser.id] // Default to current user as one supervisor
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const recordToSave = {
            ...currentRecord,
            id: currentRecord.id || Date.now(),
            progress: Number(currentRecord.progress),
            budget: Number(currentRecord.budget),
            // Ensure fields are initialized
            contractorWork: currentRecord.contractorWork || '',
            materials: currentRecord.materials || '',
            workers: currentRecord.workers || '',
            problems: currentRecord.problems || '',
            supervisors: currentRecord.supervisors || []
        } as ConstructionRecord;
        onSave(recordToSave);
        setIsModalOpen(false);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size > 0 && window.confirm(`ยืนยันการลบ ${selectedIds.size} รายการ?`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setCurrentRecord(prev => ({
                ...prev,
                media: [...(prev.media || []), ...newFiles]
            }));
        }
    };

    const handleRemoveMedia = (index: number) => {
        setCurrentRecord(prev => ({
            ...prev,
            media: (prev.media || []).filter((_, i) => i !== index)
        }));
    };

    // Supervisor Handlers
    const toggleSupervisor = (personId: number) => {
        setCurrentRecord(prev => {
            const current = prev.supervisors || [];
            if (current.includes(personId)) {
                return { ...prev, supervisors: current.filter(id => id !== personId) };
            } else {
                return { ...prev, supervisors: [...current, personId] };
            }
        });
    };

    const filteredSupervisors = useMemo(() => {
        return personnel.filter(p => 
            `${p.personnelTitle}${p.personnelName}`.toLowerCase().includes(supervisorSearch.toLowerCase())
        );
    }, [personnel, supervisorSearch]);

    // Helper for Status Badge
    const getStatusBadge = (status: ConstructionStatus) => {
        const map = {
            not_started: { label: 'ยังไม่เริ่ม', class: 'bg-gray-100 text-gray-600' },
            in_progress: { label: 'กำลังดำเนินการ', class: 'bg-blue-100 text-blue-700' },
            completed: { label: 'เสร็จสิ้น', class: 'bg-green-100 text-green-700' },
            delayed: { label: 'ล่าช้า', class: 'bg-red-100 text-red-700' }
        };
        const conf = map[status] || map.not_started;
        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${conf.class}`}>{conf.label}</span>;
    };

    // Helper to check if file is video
    const isVideo = (file: File | string) => {
        if (file instanceof File) return file.type.startsWith('video/');
        const url = String(file).toLowerCase();
        return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
    };

    // --- Export Functions ---
    const handlePrint = () => {
        window.print();
    };

    const exportToWord = () => {
        if (!viewRecord) return;
        
        const supervisorsList = (viewRecord.supervisors || [])
            .map(id => personnel.find(p => p.id === id))
            .filter(Boolean);

        const signaturesHtml = supervisorsList.map(p => `
            <div style="text-align: center; margin-top: 30px; display: inline-block; width: 45%; vertical-align: top;">
                <p>ลงชื่อ ........................................................... ผู้ควบคุมงาน</p>
                <p>(${p?.personnelTitle}${p?.personnelName})</p>
                <p>ตำแหน่ง ${p?.position}</p>
            </div>
        `).join('');

        const imagesHtml = safeParseArray(viewRecord.media).map(m => {
             const src = getDirectDriveImageSrc(m);
             return `<img src="${src}" style="width: 300px; height: auto; margin: 10px; border: 1px solid #ccc;" />`;
        }).join('');

        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Construction Report</title>
                <style>
                    @page { size: A4; margin: 2cm; }
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 16pt; line-height: 1.4; }
                    h1 { font-size: 29pt; font-weight: bold; text-align: center; margin-bottom: 0; }
                    .header-info { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    td, th { border: 1px solid black; padding: 5px; vertical-align: top; }
                    .label { font-weight: bold; }
                </style>
            </head>
            <body>
                <div style="text-align: center;">
                    <img src="https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png" width="60" />
                    <h1>บันทึกข้อความ</h1>
                </div>
                <div class="header-info">
                    <p><strong>ส่วนราชการ:</strong> โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์</p>
                    <p><strong>ที่:</strong> ................................................... <strong>วันที่:</strong> ${viewRecord.date}</p>
                    <p><strong>เรื่อง:</strong> รายงานผลการปฏิบัติงานก่อสร้างประจำวัน</p>
                    <p><strong>เรียน:</strong> ผู้อำนวยการโรงเรียนกาฬสินธุ์ปัญญานุกูล</p>
                </div>
                
                <p>ขอรายงานผลการปฏิบัติงานก่อสร้าง โครงการ <strong>${viewRecord.projectName}</strong> ดังนี้:</p>
                
                <table>
                    <tr>
                        <td width="30%" class="label">ผู้รับจ้าง</td>
                        <td>${viewRecord.contractor}</td>
                    </tr>
                    <tr>
                        <td class="label">รายการปฏิบัติงานของผู้รับจ้าง</td>
                        <td>${viewRecord.contractorWork || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">งานที่ดำเนินการก่อสร้างประจำวัน</td>
                        <td>${viewRecord.description || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">วัสดุที่นำเข้าในการก่อสร้าง</td>
                        <td>${viewRecord.materials || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">คนงาน</td>
                        <td>${viewRecord.workers || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">ปัญหา/อุปสรรค</td>
                        <td>${viewRecord.problems || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">ความคืบหน้า</td>
                        <td>${viewRecord.progress}%</td>
                    </tr>
                </table>

                <div style="margin-top: 20px; text-align: center;">
                    ${signaturesHtml}
                </div>

                ${imagesHtml ? `<div style="margin-top: 40px; page-break-before: always;"><h3>ภาคผนวก (รูปภาพประกอบ)</h3>${imagesHtml}</div>` : ''}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `รายงานการก่อสร้าง_${viewRecord.date.replace(/\//g, '-')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        if (!viewRecord) return;
        const supervisorsList = (viewRecord.supervisors || [])
            .map(id => personnel.find(p => p.id === id)?.personnelName)
            .join(', ');

        const data = [
            ['วันที่', viewRecord.date],
            ['โครงการ', viewRecord.projectName],
            ['ผู้รับจ้าง', viewRecord.contractor],
            ['รายการปฏิบัติงาน', viewRecord.contractorWork],
            ['งานที่ทำวันนี้', viewRecord.description],
            ['วัสดุเข้า', viewRecord.materials],
            ['คนงาน', viewRecord.workers],
            ['ปัญหา/อุปสรรค', viewRecord.problems],
            ['ความคืบหน้า', `${viewRecord.progress}%`],
            ['ผู้คุมงาน', supervisorsList]
        ];

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        data.forEach(row => {
            csvContent += row.map(e => `"${(e || '').toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `construction_report_${viewRecord.date.replace(/\//g,'-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <style>{`
                @media print {
                    @page { size: A4; margin: 2cm; }
                    body * { visibility: hidden; }
                    #print-construction-doc, #print-construction-doc * { visibility: visible; }
                    #print-construction-doc { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    สถิติการก่อสร้าง
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    บันทึกข้อมูล
                </button>
            </div>

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in no-print">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-gray-500 text-sm">โครงการทั้งหมด</p>
                            <p className="text-3xl font-bold text-navy">{stats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-gray-500 text-sm">งบประมาณรวม</p>
                            <p className="text-3xl font-bold text-green-600">{stats.totalBudget.toLocaleString()} <span className="text-sm font-normal text-gray-400">บาท</span></p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-gray-500 text-sm">กำลังดำเนินการ</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-gray-500 text-sm">เสร็จสิ้นแล้ว</p>
                            <p className="text-3xl font-bold text-gray-600">{stats.completed}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">สถานะโครงการ</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {stats.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">ความคืบหน้าโครงการ (10 อันดับ)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.progressData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="progress" fill="#3B82F6" radius={[0, 4, 4, 0]} name="ความคืบหน้า (%)" />
                                    </BarChart>
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
                        <h2 className="text-xl font-bold text-navy">รายการงานก่อสร้าง</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            เพิ่มรายงานประจำวัน
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4 items-center bg-gray-50 p-4 rounded-lg">
                        <input 
                            type="text" 
                            placeholder="ค้นหาโครงการ, ผู้รับเหมา..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border rounded-lg px-4 py-2 flex-grow focus:ring-2 focus:ring-primary-blue"
                        />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-4 py-2">
                            <option value="">ทุกสถานะ</option>
                            <option value="not_started">ยังไม่เริ่ม</option>
                            <option value="in_progress">กำลังดำเนินการ</option>
                            <option value="completed">เสร็จสิ้น</option>
                            <option value="delayed">ล่าช้า</option>
                        </select>
                        {selectedIds.size > 0 && (
                            <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700">
                                ลบ {selectedIds.size} รายการ
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="p-3 w-10 text-center"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRecords.map(r => r.id)) : new Set())} /></th>
                                    <th className="p-3">วันที่บันทึก</th>
                                    <th className="p-3">ชื่อโครงการ</th>
                                    <th className="p-3">งานประจำวัน</th>
                                    <th className="p-3" style={{width: '150px'}}>ความคืบหน้า</th>
                                    <th className="p-3 text-center">สถานะ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleSelect(r.id)} /></td>
                                        <td className="p-3 whitespace-nowrap">{r.date}</td>
                                        <td className="p-3 font-medium text-navy">{r.projectName}</td>
                                        <td className="p-3 text-gray-600 truncate max-w-[200px]">{r.description}</td>
                                        <td className="p-3">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-300">
                                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${r.progress}%` }}></div>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-1 block text-right">{r.progress}%</span>
                                        </td>
                                        <td className="p-3 text-center">{getStatusBadge(r.status)}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }} className="p-1.5 bg-sky-100 text-sky-700 rounded hover:bg-sky-200" title="ดูรายละเอียด/Export"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => handleOpenModal(r)} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200" title="แก้ไข"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
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

            {/* EDIT/ADD MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 no-print">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentRecord.id ? 'แก้ไขข้อมูล' : 'บันทึกงานก่อสร้างใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                            {/* Row 1: Dates & Project */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่บันทึก (วว/ดด/ปปปป)</label>
                                    <input type="text" value={currentRecord.date} onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อโครงการ</label>
                                    <input type="text" value={currentRecord.projectName} onChange={e => setCurrentRecord({...currentRecord, projectName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
                                </div>
                            </div>

                            {/* Row 2: Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ผู้รับจ้าง/บริษัท</label>
                                    <input type="text" value={currentRecord.contractor} onChange={e => setCurrentRecord({...currentRecord, contractor: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ความคืบหน้า (%)</label>
                                    <input type="number" min="0" max="100" value={currentRecord.progress} onChange={e => setCurrentRecord({...currentRecord, progress: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">สถานะ</label>
                                    <select value={currentRecord.status} onChange={e => setCurrentRecord({...currentRecord, status: e.target.value as ConstructionStatus})} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="not_started">ยังไม่เริ่ม</option>
                                        <option value="in_progress">กำลังดำเนินการ</option>
                                        <option value="completed">เสร็จสิ้น</option>
                                        <option value="delayed">ล่าช้า</option>
                                    </select>
                                </div>
                            </div>

                            {/* Detailed Text Areas */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รายการปฏิบัติงานของผู้รับจ้าง (Contractor Work)</label>
                                <textarea rows={2} value={currentRecord.contractorWork} onChange={e => setCurrentRecord({...currentRecord, contractorWork: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="ระบุรายการที่ผู้รับเหมาแจ้งทำ..."></textarea>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">งานที่ดำเนินการก่อสร้างประจำวัน (Daily Work)</label>
                                <textarea rows={3} value={currentRecord.description} onChange={e => setCurrentRecord({...currentRecord, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="รายละเอียดเนื้องานที่เกิดขึ้นจริง..."></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วัสดุที่นำเข้า (Materials)</label>
                                    <textarea rows={2} value={currentRecord.materials} onChange={e => setCurrentRecord({...currentRecord, materials: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="ปูน, ทราย, เหล็ก..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">คนงาน (Workers)</label>
                                    <textarea rows={2} value={currentRecord.workers} onChange={e => setCurrentRecord({...currentRecord, workers: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="จำนวนคน, ประเภทช่าง..."></textarea>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ปัญหา/อุปสรรค (Problems)</label>
                                <textarea rows={2} value={currentRecord.problems} onChange={e => setCurrentRecord({...currentRecord, problems: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="ฝนตก, ของขาด..."></textarea>
                            </div>

                            {/* Supervisor Selector */}
                            <div className="relative">
                                <label className="block text-sm font-bold text-gray-700 mb-1">ผู้คุมงาน/ผู้ลงนาม (เลือกได้หลายคน)</label>
                                <div className="border rounded-lg p-2 bg-white">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {(currentRecord.supervisors || []).map(id => {
                                            const p = personnel.find(per => per.id === id);
                                            return p ? (
                                                <span key={id} className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                    {p.personnelTitle}{p.personnelName}
                                                    <button type="button" onClick={() => toggleSupervisor(id)} className="text-red-500 hover:text-red-700">&times;</button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="พิมพ์ชื่อเพื่อค้นหาและเพิ่ม..." 
                                        value={supervisorSearch}
                                        onChange={e => {
                                            setSupervisorSearch(e.target.value);
                                            setIsSupervisorDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsSupervisorDropdownOpen(true)}
                                        className="w-full px-2 py-1 outline-none text-sm"
                                    />
                                    {isSupervisorDropdownOpen && supervisorSearch && (
                                        <div className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto mt-1 left-0">
                                            {filteredSupervisors.map(p => (
                                                <div 
                                                    key={p.id} 
                                                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                    onClick={() => {
                                                        toggleSupervisor(p.id);
                                                        setSupervisorSearch('');
                                                        setIsSupervisorDropdownOpen(false);
                                                    }}
                                                >
                                                    {p.personnelTitle}{p.personnelName} ({p.position})
                                                </div>
                                            ))}
                                            {filteredSupervisors.length === 0 && <div className="p-2 text-gray-500 text-sm">ไม่พบรายชื่อ</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Media Upload */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                                <label className="block text-sm font-bold text-gray-700 mb-2">แนบรูปภาพ/วิดีโอ (ประกอบรายงาน)</label>
                                <input type="file" multiple accept="image/*,video/*" onChange={handleMediaChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                                
                                {currentRecord.media && currentRecord.media.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {currentRecord.media.map((file, idx) => {
                                            const src = file instanceof File ? URL.createObjectURL(file) : getDirectDriveImageSrc(file);
                                            return (
                                                <div key={idx} className="relative w-20 h-20 border rounded overflow-hidden group bg-black">
                                                    {isVideo(file) ? (
                                                        <video src={src} className="w-full h-full object-cover opacity-80" />
                                                    ) : (
                                                        <img src={src} className="w-full h-full object-cover" />
                                                    )}
                                                    <button type="button" onClick={() => handleRemoveMedia(idx)} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW MODAL & EXPORT */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up">
                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-white no-print">
                            <h2 className="text-xl font-bold text-navy">{viewRecord.projectName} - {viewRecord.date}</h2>
                            <div className="flex gap-2">
                                <button onClick={exportToWord} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Word</button>
                                <button onClick={exportToExcel} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Excel</button>
                                <button onClick={handlePrint} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800">Print</button>
                                <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-300">ปิด</button>
                            </div>
                        </div>

                        {/* Report Content (Scrollable for preview) */}
                        <div className="flex-grow overflow-y-auto p-8 bg-gray-100 flex justify-center">
                            {/* PAPER PREVIEW */}
                            <div id="print-construction-doc" className="bg-white w-[210mm] min-h-[297mm] p-[2cm] shadow-lg text-black font-sarabun text-base leading-normal">
                                <div className="text-center mb-6">
                                    <img src="https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png" width="60" className="mx-auto mb-2" />
                                    <h1 className="text-2xl font-bold m-0">บันทึกข้อความ</h1>
                                </div>
                                
                                <div className="mb-4">
                                    <div className="flex">
                                        <span className="font-bold w-24">ส่วนราชการ</span>
                                        <span>โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์</span>
                                    </div>
                                    <div className="flex">
                                        <div className="w-1/2 flex"><span className="font-bold w-24">ที่</span><span>........................................</span></div>
                                        <div className="w-1/2 flex"><span className="font-bold w-12">วันที่</span><span>{viewRecord.date}</span></div>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24">เรื่อง</span>
                                        <span>รายงานผลการปฏิบัติงานก่อสร้างประจำวัน</span>
                                    </div>
                                    <div className="flex mt-2">
                                        <span className="font-bold w-24">เรียน</span>
                                        <span>ผู้อำนวยการโรงเรียนกาฬสินธุ์ปัญญานุกูล</span>
                                    </div>
                                </div>

                                <p className="indent-8 mb-4">
                                    ขอรายงานผลการปฏิบัติงานก่อสร้าง โครงการ <strong>{viewRecord.projectName}</strong> ประจำวันที่ {viewRecord.date} มีรายละเอียดดังนี้
                                </p>

                                <table className="w-full border-collapse border border-black mb-6">
                                    <tbody>
                                        <tr>
                                            <td className="border border-black p-2 font-bold bg-gray-50 w-1/3">1. ผู้รับจ้าง</td>
                                            <td className="border border-black p-2">{viewRecord.contractor}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-2 font-bold bg-gray-50">2. รายการปฏิบัติงานของผู้รับจ้าง</td>
                                            <td className="border border-black p-2">{viewRecord.contractorWork || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-2 font-bold bg-gray-50">3. วัสดุที่นำเข้า</td>
                                            <td className="border border-black p-2">{viewRecord.materials || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-2 font-bold bg-gray-50">4. คนงาน</td>
                                            <td className="border border-black p-2">{viewRecord.workers || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-2 font-bold bg-gray-50">5. งานที่ดำเนินการก่อสร้าง</td>
                                            <td className="border border-black p-2">{viewRecord.description || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-2 font-bold bg-gray-50">6. ปัญหา/อุปสรรค</td>
                                            <td className="border border-black p-2">{viewRecord.problems || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-2 font-bold bg-gray-50">7. ความคืบหน้า (%)</td>
                                            <td className="border border-black p-2">{viewRecord.progress} %</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <p className="indent-8 mb-8">จึงเรียนมาเพื่อโปรดทราบ</p>

                                {/* Signatures */}
                                <div className="flex flex-wrap justify-around gap-y-8 mt-8 avoid-break">
                                    {(viewRecord.supervisors || []).map(id => {
                                        const p = personnel.find(per => per.id === id);
                                        return p ? (
                                            <div key={id} className="text-center w-1/2 px-2">
                                                <p className="mb-4">ลงชื่อ ........................................................... ผู้ควบคุมงาน</p>
                                                <p>({p.personnelTitle}{p.personnelName})</p>
                                                <p>ตำแหน่ง {p.position}</p>
                                            </div>
                                        ) : null;
                                    })}
                                </div>

                                {/* Appendix: Images */}
                                {safeParseArray(viewRecord.media).length > 0 && (
                                    <div className="mt-8 page-break-before-always">
                                        <h3 className="font-bold text-lg mb-4 text-center">ภาพประกอบการดำเนินงาน</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {safeParseArray(viewRecord.media).map((m, i) => {
                                                const src = getDirectDriveImageSrc(m);
                                                return (
                                                    <div key={i} className="border p-2">
                                                        {isVideo(m) ? (
                                                            <div className="bg-gray-100 h-48 flex items-center justify-center text-gray-500">[Video Attached]</div>
                                                        ) : (
                                                            <img src={src} className="w-full h-auto object-cover max-h-60" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConstructionPage;