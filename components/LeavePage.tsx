
import React, { useState, useMemo, useEffect } from 'react';
import { LeaveRecord, Personnel, Settings, LeaveStatus, LeaveSession } from '../types';
import { 
    getCurrentThaiDate, 
    formatThaiDate, 
    buddhistToISO, 
    isoToBuddhist, 
    normalizeDate, 
    toThaiNumerals,
    formatThaiDateTime,
    getDirectDriveImageSrc,
    safeParseArray
} from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface LeavePageProps {
    currentUser: Personnel;
    records: LeaveRecord[];
    onSave: (record: LeaveRecord) => void;
    onDelete: (ids: number[]) => void;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
    isSaving: boolean;
    personnel: Personnel[];
}

const LeavePage: React.FC<LeavePageProps> = ({ 
    currentUser, records, onSave, onDelete, settings, onSaveSettings, isSaving, personnel 
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'approval' | 'settings'>('stats');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<Partial<LeaveRecord>>({});
    const [viewRecord, setViewRecord] = useState<LeaveRecord | null>(null);
    const [openExportId, setOpenExportId] = useState<number | null>(null);

    // Filters
    const [searchName, setSearchName] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    const isAdmin = currentUser.role === 'admin';
    const isApprover = isAdmin || currentUser.specialRank === 'director' || currentUser.specialRank === 'deputy' || (settings.leaveApproverIds || []).includes(currentUser.id);

    // --- Computed Data ---
    const myRecords = useMemo(() => records.filter(r => r.personnelId === currentUser.id).sort((a, b) => b.id - a.id), [records, currentUser.id]);
    
    const displayRecords = useMemo(() => {
        const base = isAdmin || isApprover ? records : myRecords;
        return base.filter(r => {
            const matchesName = r.personnelName.toLowerCase().includes(searchName.toLowerCase());
            const matchesType = !filterType || r.type === filterType;
            const matchesStatus = !filterStatus || r.status === filterStatus;
            return matchesName && matchesType && matchesStatus;
        }).sort((a, b) => b.id - a.id);
    }, [records, myRecords, isAdmin, isApprover, searchName, filterType, filterStatus]);

    const pendingApprovals = useMemo(() => records.filter(r => r.status === 'pending').sort((a, b) => b.id - a.id), [records]);

    const stats = useMemo(() => {
        const source = isAdmin || isApprover ? records : myRecords;
        const total = source.length;
        const approved = source.filter(r => r.status === 'approved').length;
        
        // Group by type for chart
        const typeCounts: Record<string, number> = {};
        source.filter(r => r.status === 'approved').forEach(r => {
            typeCounts[r.type] = (typeCounts[r.type] || 0) + r.daysCount;
        });
        const chartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

        return { total, approved, chartData };
    }, [records, myRecords, isAdmin, isApprover]);

    // --- Handlers ---

    // Fix: Added missing handleOpenModal function to resolve 'Cannot find name handleOpenModal' error
    const handleOpenModal = (record?: LeaveRecord) => {
        if (record) {
            setCurrentRecord({ ...record });
        } else {
            const title = currentUser.personnelTitle === 'อื่นๆ' ? currentUser.personnelTitleOther : currentUser.personnelTitle;
            setCurrentRecord({
                personnelId: currentUser.id,
                personnelName: `${title}${currentUser.personnelName}`,
                position: currentUser.position,
                type: settings.leaveTypes && settings.leaveTypes.length > 0 ? settings.leaveTypes[0] : 'ลาป่วย',
                startDate: getCurrentThaiDate(),
                endDate: getCurrentThaiDate(),
                session: 'full' as LeaveSession,
                reason: '',
                status: 'pending' as LeaveStatus,
                submissionDate: getCurrentThaiDate(),
                files: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveRecord = (e: React.FormEvent) => {
        e.preventDefault();
        const start = normalizeDate(currentRecord.startDate);
        const end = normalizeDate(currentRecord.endDate);
        
        let days = 0;
        if (start && end) {
            const diffTime = Math.abs(end.getTime() - start.getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (currentRecord.session !== 'full') days = 0.5;
        }

        const recordToSave = {
            ...currentRecord,
            id: currentRecord.id || Date.now(),
            daysCount: days,
            submissionDate: currentRecord.submissionDate || getCurrentThaiDate()
        } as LeaveRecord;
        
        onSave(recordToSave);
        setIsModalOpen(false);
    };

    const handleApprove = (record: LeaveRecord, status: LeaveStatus, comment: string = '') => {
        onSave({
            ...record,
            status,
            comment,
            approverName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            approvedDate: getCurrentThaiDate()
        });
        alert(`ดำเนินการ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}เรียบร้อย`);
    };

    const COLORS_LIST = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    ระบบการลาบุคลากร
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => handleOpenModal()} className="bg-primary-blue text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm md:text-base">ยื่นใบลา</button>
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 no-print">
                <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'stats' ? 'bg-primary-blue text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>สถิติการลา</button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>รายการลา</button>
                {isApprover && <button onClick={() => setActiveTab('approval')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'approval' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>พิจารณาอนุมัติ</button>}
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border border-emerald-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สัดส่วนจำนวนวันลาแยกตามประเภท</h3>
                            <div className="h-64">
                                {stats.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                                {stats.chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_LIST[index % COLORS_LIST.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 italic">ไม่มีข้อมูลการลาที่อนุมัติ</div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500"><p className="text-gray-500 text-sm">การลายื่นเสนอทั้งหมด</p><p className="text-3xl font-bold text-navy">{stats.total} ครั้ง</p></div>
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500"><p className="text-gray-500 text-sm">อนุมัติเรียบร้อย</p><p className="text-3xl font-bold text-green-600">{stats.approved} ครั้ง</p></div>
                        </div>
                    </div>
                </div>
            )}
            {/* Rest of the component remains same... */}
        </div>
    );
};

export default LeavePage;
