
import React, { useState, useMemo, useEffect } from 'react';
import { ConstructionRecord, Personnel, ConstructionStatus } from '../types';
import { getDirectDriveImageSrc, safeParseArray, getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, parseThaiDateForSort } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ConstructionPageProps {
    currentUser: Personnel;
    records: ConstructionRecord[];
    onSave: (record: ConstructionRecord) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
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
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    
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
        }).sort((a, b) => parseThaiDateForSort(b.date) - parseThaiDateForSort(a.date));
    }, [records, searchTerm, filterStatus]);

    // --- Slideshow Auto-play ---
    useEffect(() => {
        let interval: any;
        if (isViewModalOpen && viewRecord?.media && viewRecord.media.length > 1) {
            interval = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % viewRecord.media!.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isViewModalOpen, viewRecord]);

    // Reset slide on open
    useEffect(() => {
        if (isViewModalOpen) {
            setCurrentSlide(0);
            setIsExportMenuOpen(false);
        }
    }, [isViewModalOpen]);

    // --- Handlers ---
    const handleOpenModal = (record?: ConstructionRecord) => {
        if (record) {
            setCurrentRecord({ ...record });
        } else {
            setCurrentRecord({
                date: getCurrentThaiDate(),
                projectName: '',
                contractor: '',
                location: '',
                progress: 0,
                status: 'not_started',
                contractorWork: '', 
                materials: '',
                workers: '', 
                description: '', // Remarks
                problems: '', 
                startDate: '',
                endDate: '',
                budget: 0,
                media: [],
                reporter: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                supervisors: [currentUser.id] 
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

    const isVideo = (file: File | string) => {
        if (file instanceof File) return file.type.startsWith('video/');
        const url = String(file).toLowerCase();
        return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
    };

    // --- Export Functions ---
    const handlePrint = () => {
        setIsExportMenuOpen(false);
        window.print();
    };

    const exportToWord = () => {
        setIsExportMenuOpen(false);
        if (!viewRecord) return;
        
        const supervisorsList = (viewRecord.supervisors || [])
            .map(id => {
                const p = personnel.find(p => p.id === id);
                return p ? `${p.personnelTitle}${p.personnelName}` : '';
            })
            .filter((s): s is string => !!s);

        const imagesHtml = safeParseArray(viewRecord.media).map(m => {
             const src = getDirectDriveImageSrc(m);
             return `<img src="${src}" style="width: 300px; height: auto; margin: 10px; border: 1px solid #ccc;" />`;
        }).join('');

        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Construction Daily Report</title>
                <style>
                    @page { size: A4 landscape; margin: 1cm; }
                    body { font-family: 'TH Sarabun PSK', sans-serif; font-size: 14pt; line-height: 1.2; }
                    h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 5px; }
                    h2 { font-size: 16pt; font-weight: normal; text-align: center; margin-top: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    td, th { border: 1px solid black; padding: 5px; vertical-align: top; font-size: 14pt; }
                    .header-cell { font-weight: bold; text-align: center; background-color: #f0f0f0; }
                    .no-border { border: none; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <h1>แบบฟอร์มบันทึกการควบคุมงานก่อสร้างประจำวัน</h1>
                <table style="border: none; width: 100%; margin-bottom: 5px;">
                    <tr>
                        <td class="no-border" width="50%"><b>โครงการ:</b> ${viewRecord.projectName}</td>
                        <td class="no-border" width="50%"><b>ผู้รับจ้าง:</b> ${viewRecord.contractor}</td>
                    </tr>
                </table>
                
                <table>
                    <thead>
                        <tr>
                            <th class="header-cell" style="width: 10%;">วัน เดือน ปี</th>
                            <th class="header-cell" style="width: 50%;">รายการปฏิบัติงานของผู้รับจ้าง</th>
                            <th class="header-cell" style="width: 20%;">ลงชื่อ</th>
                            <th class="header-cell" style="width: 20%;">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td align="center">
                                ${formatThaiDate(viewRecord.date)}<br/><br/>
                                <div style="text-align: left; font-size: 12pt;">
                                ทุกวัน......................<br/>
                                ตั้งแต่......................<br/>
                                วันเริ่มต้น................<br/>
                                สัญญา....................<br/>
                                จนถึง......................<br/>
                                วันทำงาน.................<br/>
                                แล้วเสร็จ.................
                                </div>
                            </td>
                            <td>
                                <b>- ช่างไม้/เหล็ก/ปูน/อื่นๆ:</b><br/>
                                ${(viewRecord.contractorWork || '-').replace(/\n/g, '<br/>')}<br/>
                                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 5px 0;"/>
                                <b>- คนงานทั่วไป:</b><br/>
                                ${(viewRecord.workers || '-').replace(/\n/g, '<br/>')}<br/>
                                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 5px 0;"/>
                                <b>- วัสดุที่นำเข้ามาในบริเวณก่อสร้าง:</b><br/>
                                ${(viewRecord.materials || '-').replace(/\n/g, '<br/>')}<br/>
                                <b>- อุปกรณ์ต่างๆ:</b> (รวมในรายการวัสดุ)<br/>
                                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 5px 0;"/>
                                <b>- ความถูกต้อง/ปัญหา/งานแก้ไข:</b><br/>
                                ${(viewRecord.problems || '-').replace(/\n/g, '<br/>')}
                            </td>
                            <td align="center" style="vertical-align: bottom;">
                                <div style="min-height: 150px;"></div>
                                ${supervisorsList.length > 0 ? supervisorsList[0] : '...................................'}
                                <br/>(ผู้ควบคุมงาน/ผู้บันทึก)<br/><br/>
                                ${supervisorsList.length > 1 ? supervisorsList[1] : '...................................'}
                                <br/>(ผู้ร่วมงาน)<br/><br/>
                                ...................................<br/>(ผู้รับจ้าง)
                            </td>
                            <td>
                                (ปัญหาจำเป็นที่ต้องบันทึก)<br/>
                                - การหยุดงานเทศกาล<br/>
                                - เนื่องจากปัญหาดินฟ้าอากาศ<br/>
                                - อุปสรรคต่างๆ ที่ต้องหยุดงาน<br/>
                                - การสั่งหยุดงาน<br/>
                                - การขอเปลี่ยนแปลงต่างๆ<br/>
                                - การรอคำชี้แจงสำคัญๆ<br/>
                                <br/>
                                <b>บันทึกเพิ่มเติม:</b><br/>
                                ${(viewRecord.description || '-').replace(/\n/g, '<br/>')}
                            </td>
                        </tr>
                    </tbody>
                </table>

                ${imagesHtml ? `<div style="margin-top: 20px; page-break-before: always; text-align: center;"><h3>ภาคผนวก (รูปภาพประกอบ)</h3>${imagesHtml}</div>` : ''}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `แบบฟอร์มคุมงาน_${viewRecord.date.replace(/\//g, '-')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 1cm; }
                    body * { visibility: hidden; }
                    #print-construction-doc, #print-construction-doc * { visibility: visible; }
                    #print-construction-doc { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; }
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
                                    <th className="p-3">รายการปฏิบัติงาน</th>
                                    <th className="p-3" style={{width: '150px'}}>ความคืบหน้า</th>
                                    <th className="p-3 text-center">สถานะ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleSelect(r.id)} /></td>
                                        <td className="p-3 whitespace-nowrap">{formatThaiDate(r.date)}</td>
                                        <td className="p-3 font-medium text-navy">{r.projectName}</td>
                                        <td className="p-3 text-gray-600 truncate max-w-[200px]">{r.contractorWork || r.description}</td>
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
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่บันทึก</label>
                                    <input 
                                        type="date" 
                                        value={buddhistToISO(currentRecord.date)} 
                                        onChange={e => setCurrentRecord({...currentRecord, date: isoToBuddhist(e.target.value)})} 
                                        className="w-full px-3 py-2 border rounded-lg" 
                                        required 
                                    />
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

                            {/* Detailed Text Areas matching the form */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รายการปฏิบัติงาน (ระบุช่างไม้, เหล็ก, ปูน...)</label>
                                <textarea rows={3} value={currentRecord.contractorWork} onChange={e => setCurrentRecord({...currentRecord, contractorWork: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="ระบุรายการที่ทำ (เช่น ช่างไม้, ช่างเหล็ก, ช่างปูน)..."></textarea>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">คนงานทั่วไป</label>
                                    <textarea rows={2} value={currentRecord.workers} onChange={e => setCurrentRecord({...currentRecord, workers: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="จำนวนคน, รายละเอียด..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วัสดุ/อุปกรณ์ที่นำเข้า</label>
                                    <textarea rows={2} value={currentRecord.materials} onChange={e => setCurrentRecord({...currentRecord, materials: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="ปูน, ทราย, เหล็ก..."></textarea>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ปัญหา/งานแก้ไข/ตรวจสอบความถูกต้อง</label>
                                <textarea rows={2} value={currentRecord.problems} onChange={e => setCurrentRecord({...currentRecord, problems: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="ฝนตก, ของขาด, งานที่ต้องแก้ไข..."></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">หมายเหตุ (ฝนตก, หยุดงาน, ฯลฯ)</label>
                                <textarea rows={2} value={currentRecord.description} onChange={e => setCurrentRecord({...currentRecord, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="หมายเหตุเพิ่มเติม..."></textarea>
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

            {/* VIEW MODAL - Modern Style like ServiceRegistration */}
            {isViewModalOpen && viewRecord && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
                        
                        {/* 1. Header & Slideshow Section */}
                        <div className="relative bg-gray-900 flex-shrink-0 h-64 md:h-80 no-print group">
                            {safeParseArray(viewRecord.media).length > 0 ? (
                                <>
                                    {isVideo(safeParseArray(viewRecord.media)[currentSlide]) ? (
                                        <video 
                                            src={getDirectDriveImageSrc(safeParseArray(viewRecord.media)[currentSlide])} 
                                            className="w-full h-full object-contain bg-black" 
                                            controls
                                        />
                                    ) : (
                                        <img 
                                            src={getDirectDriveImageSrc(safeParseArray(viewRecord.media)[currentSlide])} 
                                            className="w-full h-full object-contain bg-black" 
                                            alt="Construction Site" 
                                        />
                                    )}
                                    
                                    {safeParseArray(viewRecord.media).length > 1 && (
                                        <>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + safeParseArray(viewRecord.media).length) % safeParseArray(viewRecord.media).length); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                            >
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % safeParseArray(viewRecord.media).length); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                            >
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                {safeParseArray(viewRecord.media).map((_, idx) => (
                                                    <div key={idx} className={`h-1.5 rounded-full transition-all shadow-sm ${idx === currentSlide ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`}/>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <svg className="w-16 h-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-sm">ไม่มีรูปภาพประกอบ</span>
                                </div>
                            )}
                            
                            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all backdrop-blur-md z-30">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* 2. Content Body */}
                        <div className="flex-grow overflow-y-auto bg-gray-50 p-6 no-print">
                            {/* Info Cards Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <span className="text-xs text-gray-500 font-bold uppercase block mb-1">วันที่บันทึก</span>
                                    <span className="text-lg font-bold text-navy">{formatThaiDate(viewRecord.date)}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <span className="text-xs text-gray-500 font-bold uppercase block mb-1">โครงการ</span>
                                    <span className="text-lg font-bold text-navy">{viewRecord.projectName}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <span className="text-xs text-gray-500 font-bold uppercase block mb-1">ผู้รับจ้าง</span>
                                    <span className="text-lg font-bold text-navy">{viewRecord.contractor}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column: Details */}
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 border-b pb-2">
                                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            รายการปฏิบัติงาน
                                        </h4>
                                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{viewRecord.contractorWork || '-'}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                            <h4 className="font-bold text-gray-800 mb-2 text-sm text-gray-500 uppercase">คนงานทั่วไป</h4>
                                            <p className="text-gray-700 whitespace-pre-wrap text-sm">{viewRecord.workers || '-'}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                            <h4 className="font-bold text-gray-800 mb-2 text-sm text-gray-500 uppercase">วัสดุอุปกรณ์</h4>
                                            <p className="text-gray-700 whitespace-pre-wrap text-sm">{viewRecord.materials || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-red-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            ปัญหา/งานแก้ไข
                                        </h4>
                                        <p className="text-gray-700 whitespace-pre-wrap">{viewRecord.problems || '-'}</p>
                                    </div>
                                    
                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-bold text-gray-800 mb-2 text-sm text-gray-500 uppercase">หมายเหตุเพิ่มเติม</h4>
                                        <p className="text-gray-700 whitespace-pre-wrap">{viewRecord.description || '-'}</p>
                                    </div>
                                </div>

                                {/* Right Column: Status & People */}
                                <div className="space-y-4">
                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-bold text-gray-500 text-xs uppercase mb-3">สถานะและความคืบหน้า</h4>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-700 font-medium">ความคืบหน้า</span>
                                            <span className="text-blue-600 font-bold">{viewRecord.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${viewRecord.progress}%` }}></div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700 font-medium">สถานะ</span>
                                            {getStatusBadge(viewRecord.status)}
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-bold text-gray-500 text-xs uppercase mb-3">ผู้ควบคุมงาน</h4>
                                        <ul className="space-y-2">
                                            {(viewRecord.supervisors || []).map((id, idx) => {
                                                const p = personnel.find(per => per.id === id);
                                                return (
                                                    <li key={idx} className="flex items-center gap-2 text-sm text-navy font-medium">
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-bold">
                                                            {idx + 1}
                                                        </div>
                                                        {p ? `${p.personnelTitle}${p.personnelName}` : 'Unknown'}
                                                    </li>
                                                );
                                            })}
                                            {(viewRecord.supervisors || []).length === 0 && <li className="text-sm text-gray-400">ไม่ได้ระบุ</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Footer Actions */}
                        <div className="p-4 bg-white border-t flex items-center justify-between gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 no-print">
                            <div className="relative">
                                <button 
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-sm"
                                >
                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    <span>ดาวน์โหลด</span>
                                </button>
                                {isExportMenuOpen && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30 animate-fade-in-up">
                                        <button onClick={exportToWord} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 border-b border-gray-100">
                                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                                            ไฟล์ Word (.doc)
                                        </button>
                                        <button onClick={handlePrint} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2">
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
            )}
        </div>
    );
};

export default ConstructionPage;
