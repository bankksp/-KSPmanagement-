import React, { useState, useMemo, useEffect } from 'react';
import { Personnel, Settings, ProcurementRecord, ProcurementItem, MaterialCategory } from '../types';
import { getCurrentThaiDate, formatThaiDate, toThaiWords, buddhistToISO, isoToBuddhist } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DEFAULT_MATERIAL_CATEGORIES } from '../constants';

interface SupplyPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    records: ProcurementRecord[];
    onSaveRecord: (record: ProcurementRecord) => Promise<boolean | void>;
    onDeleteRecord: (ids: number[]) => void;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
    isSaving: boolean;
}

type SubPage = 
    | 'report_dashboard'
    | 'create_request' 
    | 'edit_request' 
    | 'receive_items' 
    | 'manage_materials'
    | 'manage_supply_types'
    | 'manage_methods'
    | 'manage_categories'
    | 'manage_departments'
    | 'manage_funds'
    | 'settings_budget';

// --- Extracted Components ---

const CreateRequestForm: React.FC<{
    currentUser: Personnel;
    settings: Settings;
    editingRecord: ProcurementRecord | null;
    onSave: (record: ProcurementRecord) => Promise<boolean | void>;
    onCancel: () => void;
    isSaving: boolean;
}> = ({ currentUser, settings, editingRecord, onSave, onCancel, isSaving }) => {
    // Form Data State
    const [formData, setFormData] = useState<Partial<ProcurementRecord>>({
        reason: 'เพื่อความคล่องตัวในการดำเนินงานตามโครงการจะได้มีประสิทธิภาพ',
        docNumber: '', 
        requesterName: `${currentUser.personnelTitle}${currentUser.personnelName}`, 
        subject: 'รายงานขอซื้อ/จ้างพัสดุ',
        docDate: getCurrentThaiDate(),
        department: settings.departments?.[0] || '',
        project: settings.budgetSources?.[0] || '',
        supplierName: '',
        managerName: settings.directorName || 'ผู้อำนวยการโรงเรียน',
        procurementType: (settings.supplyTypes && settings.supplyTypes.length > 0) ? settings.supplyTypes[0] : 'วัสดุ',
        procurementMethod: (settings.procurementMethods && settings.procurementMethods.length > 0) ? settings.procurementMethods[0] : 'เฉพาะเจาะจง',
        neededDate: getCurrentThaiDate(),
        approvedBudget: 0,
        status: 'pending'
    });

    // Items Table State
    const [items, setItems] = useState<ProcurementItem[]>([
        { id: 1, type: '', description: '', quantity: 1, unit: '', unitPrice: 0, location: '' },
    ]);

    // Effect to load editing data
    useEffect(() => {
        if (editingRecord) {
            setFormData({ ...editingRecord });
            setItems(editingRecord.items || []);
        }
    }, [editingRecord]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: isoToBuddhist(value) }));
    }

    const handleItemChange = (id: number, field: keyof ProcurementItem, value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), type: '', description: '', quantity: 1, unit: '', unitPrice: 0, location: '' }]);
    };
    
    const handleRemoveItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const total = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    }, [items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const recordToSave: ProcurementRecord = {
            ...formData as ProcurementRecord,
            id: editingRecord ? editingRecord.id : Date.now(),
            items: items,
            totalPrice: total
        };
        await onSave(recordToSave);
    };

    return (
        <div className="animate-fade-in w-full">
             <div className="bg-blue-600 text-white p-4 rounded-t-2xl shadow-md flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold">{editingRecord ? 'แก้ไขรายการ' : 'บันทึกข้อมูลขอซื้อ/ขอจ้าง'}</h2>
                {editingRecord && <button onClick={onCancel} className="text-xs md:text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30 whitespace-nowrap">ยกเลิกแก้ไข</button>}
            </div>
            <div className="bg-white p-4 md:p-6 rounded-b-2xl shadow-lg border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                        <div className="md:col-span-2">
                            <label className="font-bold block mb-1">เหตุผลความจำเป็น</label>
                            <input type="text" name="reason" value={formData.reason} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div><label className="font-bold block mb-1">เลขที่เอกสาร:</label><input type="text" name="docNumber" value={formData.docNumber} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" placeholder="เช่น PO-66/001" /></div>
                        <div><label className="font-bold block mb-1">ผู้ขอเบิก:</label><input type="text" name="requesterName" value={formData.requesterName} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" /></div>
                        
                        <div className="md:col-span-2"><label className="font-bold block mb-1">เรื่อง:</label><input type="text" name="subject" value={formData.subject} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" /></div>
                        <div><label className="font-bold block mb-1">วันที่:</label><input type="date" name="docDate" value={buddhistToISO(formData.docDate)} onChange={handleDateChange} className="w-full border-gray-300 rounded-lg shadow-sm" /></div>
                        
                        <div>
                            <label className="font-bold block mb-1">กลุ่มสาระ/หน่วยงาน:</label>
                            <select name="department" value={formData.department} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                <option value="">-- เลือก --</option>
                                {(settings.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="font-bold block mb-1">แหล่งเงิน/โครงการ (Source):</label>
                            <select name="project" value={formData.project} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                <option value="">-- เลือก --</option>
                                {(settings.budgetSources || []).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        
                        <div className="md:col-span-2"><label className="font-bold block mb-1">ร้านค้า/ผู้รับจ้าง:</label><input type="text" name="supplierName" value={formData.supplierName} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" /></div>
                        <div><label className="font-bold block mb-1">เสนอผู้บริหาร:</label><input type="text" name="managerName" value={formData.managerName} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <fieldset className="border p-4 rounded-xl bg-gray-50">
                            <legend className="font-bold px-2 text-primary-blue bg-white rounded-lg shadow-sm text-xs">ประเภท (Type)</legend>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {(settings.supplyTypes || []).map(type => (
                                    <label key={type} className="flex items-center cursor-pointer">
                                        <input type="radio" name="procurementType" value={type} checked={formData.procurementType === type} onChange={handleFormChange} className="mr-2 text-primary-blue focus:ring-primary-blue" />
                                        {type}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <fieldset className="border p-4 rounded-xl bg-gray-50">
                            <legend className="font-bold px-2 text-primary-blue bg-white rounded-lg shadow-sm text-xs">วิธีจัดหา (Method)</legend>
                             <div className="grid grid-cols-2 gap-2 text-xs">
                                {(settings.procurementMethods || []).map(method => (
                                    <label key={method} className="flex items-center cursor-pointer">
                                        <input type="radio" name="procurementMethod" value={method} checked={formData.procurementMethod === method} onChange={handleFormChange} className="mr-2 text-primary-blue focus:ring-primary-blue" />
                                        {method}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="font-bold block mb-1">วันที่ต้องการใช้:</label><input type="date" name="neededDate" value={buddhistToISO(formData.neededDate)} onChange={handleDateChange} className="w-full border-gray-300 rounded-lg shadow-sm" /></div>
                        <div><label className="font-bold block mb-1">วงเงินอนุมัติ (บาท):</label><input type="number" name="approvedBudget" value={formData.approvedBudget} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm font-bold text-green-600" /></div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-navy">รายการพัสดุ</h3>
                            <button type="button" onClick={handleAddItem} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold hover:bg-blue-200">+ เพิ่มรายการ</button>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-300">
                            <table className="min-w-full bg-white text-xs">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 w-10 text-center">#</th>
                                        <th className="p-2 min-w-[150px]">รายการ (ชื่อ/ขนาด/ยี่ห้อ)</th>
                                        <th className="p-2 w-16">จำนวน</th>
                                        <th className="p-2 w-16">หน่วย</th>
                                        <th className="p-2 w-24 text-right">ราคา/หน่วย</th>
                                        <th className="p-2 w-24 text-right">รวมเงิน</th>
                                        <th className="p-2 w-10 text-center">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="border-b last:border-0">
                                            <td className="p-2 text-center">{index + 1}</td>
                                            <td className="p-2"><input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                            <td className="p-2"><input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="w-full border-gray-300 rounded text-center px-1 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                            <td className="p-2"><input type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                            <td className="p-2"><input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', Number(e.target.value))} className="w-full border-gray-300 rounded text-right px-2 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                            <td className="p-2"><input type="text" readOnly value={((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()} className="w-full border-transparent bg-transparent text-right px-2 py-1 font-bold text-gray-700"/></td>
                                            <td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 font-bold">×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold">
                                    <tr>
                                        <td colSpan={5} className="p-3 text-right text-gray-600">รวมเป็นเงินทั้งสิ้น:</td>
                                        <td colSpan={2} className="p-3 text-right text-blue-700 text-sm">{total.toLocaleString()} บาท</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-6 border-t gap-3">
                        <button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-green-500/30 font-bold disabled:opacity-50 transition-all transform active:scale-95">
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditRequestListPage: React.FC<{
    records: ProcurementRecord[];
    onEdit: (record: ProcurementRecord) => void;
    onDelete: (ids: number[]) => void;
    onPrint: (record: ProcurementRecord) => void;
    settings: Settings;
    currentUser: Personnel;
    onSaveRecord: (record: ProcurementRecord) => void;
}> = ({ records, onEdit, onDelete, onPrint, settings, currentUser, onSaveRecord }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterType, setFilterType] = useState('');

    // Filtering Logic
    const filteredRecords = useMemo(() => {
        if (!records) return [];
        return records.filter(r => {
            const lowerSearch = searchTerm.toLowerCase().trim();
            const matchSearch = 
                String(r.docNumber || '').toLowerCase().includes(lowerSearch) ||
                (r.subject || '').toLowerCase().includes(lowerSearch) ||
                (r.supplierName || '').toLowerCase().includes(lowerSearch);
            
            const dept = r.department || '';
            const matchDept = !filterDept || dept === filterDept;
            const type = r.procurementType || '';
            const matchType = !filterType || type === filterType;

            return matchSearch && matchDept && matchType;
        }).sort((a, b) => b.id - a.id); // Sort Newest to Oldest
    }, [records, searchTerm, filterDept, filterType]);

    return (
        <div className="animate-fade-in space-y-6 w-full">
            <h2 className="text-xl font-bold text-navy">ทะเบียนคุมการจัดซื้อ/จัดจ้าง</h2>
            
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:flex-grow">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">ค้นหาเอกสาร</label>
                    <input 
                        type="text" 
                        placeholder="เลขที่เอกสาร, ชื่อเรื่อง, ร้านค้า..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue"
                    />
                </div>
                <div className="w-full md:w-48">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">กลุ่มสาระ/งาน</label>
                    <select 
                        value={filterDept} 
                        onChange={e => setFilterDept(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">ทั้งหมด</option>
                        {(settings.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-40">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">ประเภท</label>
                    <select 
                        value={filterType} 
                        onChange={e => setFilterType(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">ทั้งหมด</option>
                        {(settings.supplyTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-auto pb-1">
                    <button onClick={() => { setSearchTerm(''); setFilterDept(''); setFilterType(''); }} className="text-xs text-gray-500 hover:text-red-500 underline">ล้างค่า</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-green-600 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        รายการทั้งหมด ({filteredRecords.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-gray-500 uppercase tracking-wider text-xs">
                                <th className="px-6 py-3 text-left font-bold">วันที่</th>
                                <th className="px-6 py-3 text-left font-bold">เลขที่เอกสาร</th>
                                <th className="px-6 py-3 text-left font-bold">เรื่อง / รายการ</th>
                                <th className="px-6 py-3 text-left font-bold">ผู้ขาย</th>
                                <th className="px-6 py-3 text-right font-bold">ยอดรวม</th>
                                <th className="px-6 py-3 text-center font-bold">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredRecords.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.docDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{item.docNumber || '-'}</span>
                                        {item.status === 'pending' && <span className="ml-2 text-[10px] text-orange-500 bg-orange-50 px-1 rounded border border-orange-100">รออนุมัติ</span>}
                                        {item.status === 'approved' && <span className="ml-2 text-[10px] text-green-500 bg-green-50 px-1 rounded border border-green-100">อนุมัติแล้ว</span>}
                                        {item.status === 'rejected' && <span className="ml-2 text-[10px] text-red-500 bg-red-50 px-1 rounded border border-red-100">ไม่อนุมัติ</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-bold text-navy text-base">{item.subject}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{(item.items || []).length} รายการ</span>
                                            <span>•</span>
                                            <span>{item.department}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{item.supplierName}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-700 whitespace-nowrap">{(item.totalPrice || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center items-center gap-2">
                                            {item.status === 'pending' && (currentUser.role === 'admin' || currentUser.specialRank === 'director') && (
                                                <>
                                                    <button
                                                        onClick={() => onSaveRecord({ ...item, status: 'approved', approverName: `${currentUser.personnelTitle}${currentUser.personnelName}`, approvedDate: getCurrentThaiDate() })}
                                                        className="bg-emerald-100 text-emerald-700 p-2 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm" title="อนุมัติ"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => onSaveRecord({ ...item, status: 'rejected', approverName: `${currentUser.personnelTitle}${currentUser.personnelName}`, approvedDate: getCurrentThaiDate() })}
                                                        className="bg-rose-100 text-rose-700 p-2 rounded-lg hover:bg-rose-200 transition-colors shadow-sm" title="ไม่อนุมัติ"
                                                    >
                                                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => onEdit(item)} 
                                                className="bg-amber-100 text-amber-700 p-2 rounded-lg hover:bg-amber-200 transition-colors shadow-sm" title="แก้ไข"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => onPrint(item)} 
                                                className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 transition-colors shadow-sm" title="พิมพ์เอกสาร"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => { if(window.confirm('ลบรายการนี้?')) onDelete([item.id]); }} 
                                                className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors shadow-sm" title="ลบ"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-400 font-medium italic">
                                        {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่พบรายการจัดซื้อจัดจ้าง'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MaterialCategoryManager: React.FC<{
    categories: MaterialCategory[];
    onUpdate: (newCategories: MaterialCategory[]) => void;
}> = ({ categories, onUpdate }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formState, setFormState] = useState<Partial<MaterialCategory>>({});
    const [parentId, setParentId] = useState<string | null>(null); 

    const handleEdit = (category: MaterialCategory, pId: string | null) => {
        setEditingId(category.id);
        setParentId(pId);
        setFormState({ ...category });
    };

    const handleAddNew = (pId: string | null) => {
        setEditingId('new');
        setParentId(pId);
        setFormState({ 
            id: Date.now().toString(), 
            code: '', 
            name: '', 
            usefulLife: 5, 
            depreciationRate: 20, 
            subCategories: [] 
        });
    };

    const handleSave = () => {
        if (!formState.name || !formState.code) return alert('กรุณากรอกรหัสและชื่อหมวดหมู่');
        
        let newCats = [...categories];
        
        if (parentId === null) {
            if (editingId === 'new') {
                newCats.push(formState as MaterialCategory);
            } else {
                newCats = newCats.map(c => c.id === editingId ? { ...c, ...formState } : c);
            }
        } else {
            newCats = newCats.map(c => {
                if (c.id === parentId) {
                    const subs = c.subCategories || [];
                    let newSubs = [...subs];
                    if (editingId === 'new') {
                        newSubs.push(formState as MaterialCategory);
                    } else {
                        newSubs = newSubs.map(s => s.id === editingId ? { ...s, ...formState } : s);
                    }
                    return { ...c, subCategories: newSubs };
                }
                return c;
            });
        }
        
        onUpdate(newCats);
        setEditingId(null);
        setFormState({});
    };

    const handleDelete = (id: string, pId: string | null) => {
        if (!window.confirm('ยืนยันการลบหมวดหมู่นี้?')) return;
        
        let newCats = [...categories];
        if (pId === null) {
            newCats = newCats.filter(c => c.id !== id);
        } else {
            newCats = newCats.map(c => {
                if (c.id === pId) {
                    return { ...c, subCategories: (c.subCategories || []).filter(s => s.id !== id) };
                }
                return c;
            });
        }
        onUpdate(newCats);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-navy">ผังบัญชีวัสดุและครุภัณฑ์ (มาตรฐาน)</h3>
                <button onClick={() => handleAddNew(null)} className="bg-primary-blue text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700">+ เพิ่มหมวดหลัก</button>
            </div>

            {editingId && (
                <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 mb-6 animate-fade-in">
                    <h4 className="font-bold text-navy mb-3">{editingId === 'new' ? 'เพิ่มรายการใหม่' : 'แก้ไขรายการ'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">รหัส</label>
                            <input type="text" value={formState.code || ''} onChange={e => setFormState({...formState, code: e.target.value})} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อรายการ</label>
                            <input type="text" value={formState.name || ''} onChange={e => setFormState({...formState, name: e.target.value})} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">อายุ (ปี)</label>
                                <input type="number" value={formState.usefulLife || 0} onChange={e => setFormState({...formState, usefulLife: Number(e.target.value)})} className="w-full border rounded px-2 py-1" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">เสื่อม (%)</label>
                                <input type="number" value={formState.depreciationRate || 0} onChange={e => setFormState({...formState, depreciationRate: Number(e.target.value)})} className="w-full border rounded px-2 py-1" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setEditingId(null)} className="px-4 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">ยกเลิก</button>
                        <button onClick={handleSave} className="px-4 py-1 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700">บันทึก</button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {categories.map(mainCat => (
                    <div key={mainCat.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="bg-gray-50 p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-navy text-white text-xs font-black px-2 py-1 rounded">{mainCat.code}</span>
                                <span className="font-bold text-navy">{mainCat.name}</span>
                                <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">(อายุ {mainCat.usefulLife} ปี | {mainCat.depreciationRate}%)</span>
                            </div>
                            <div className="flex gap-1 w-full sm:w-auto justify-end">
                                <button onClick={() => handleAddNew(mainCat.id)} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded border border-green-200 hover:bg-green-100">+ ย่อย</button>
                                <button onClick={() => handleEdit(mainCat, null)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">แก้ไข</button>
                                <button onClick={() => handleDelete(mainCat.id, null)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200 hover:bg-red-100">ลบ</button>
                            </div>
                        </div>
                        
                        {mainCat.subCategories && mainCat.subCategories.length > 0 ? (
                            <div className="p-2 bg-white">
                                {mainCat.subCategories.map(sub => (
                                    <div key={sub.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 hover:bg-gray-50 border-b last:border-0 border-gray-100 ml-0 sm:ml-6 sm:border-l-2 sm:pl-3 gap-2">
                                        <div className="flex items-center gap-2 text-sm flex-wrap">
                                            <span className="font-mono text-gray-500 font-bold">{sub.code}</span>
                                            <span className="text-gray-700">{sub.name}</span>
                                            <span className="text-xs text-gray-400">({sub.usefulLife} ปี / {sub.depreciationRate}%)</span>
                                        </div>
                                        <div className="flex gap-1 w-full sm:w-auto justify-end">
                                            <button onClick={() => handleEdit(sub, mainCat.id)} className="text-[10px] text-blue-500 hover:underline">แก้ไข</button>
                                            <button onClick={() => handleDelete(sub.id, mainCat.id)} className="text-[10px] text-red-500 hover:underline">ลบ</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-2 text-center text-xs text-gray-300 italic">ไม่มีหมวดหมู่ย่อย</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProcurementDashboard: React.FC<{
    records: ProcurementRecord[];
}> = ({ records }) => {
    
    const stats = useMemo(() => {
        const buyingTypes = ['วัตถุ', 'ครุภัณฑ์', 'ที่ดิน', 'อื่นๆ'];
        const hiringTypes = ['ก่อสร้าง', 'จ้างเหมาบริการ', 'เช่า'];

        let buyingCount = 0;
        let hiringCount = 0;
        let totalApprovedBudget = 0;
        
        const statusCounts = { pending: 0, approved: 0, received: 0, completed: 0 };
        const typeBudgets: Record<string, number> = {};

        records.forEach(r => {
            if (buyingTypes.includes(r.procurementType)) {
                buyingCount++;
            } else if (hiringTypes.includes(r.procurementType)) {
                hiringCount++;
            }
            
            totalApprovedBudget += Number(r.approvedBudget) || 0;
            
            const statusKey = r.status as keyof typeof statusCounts;
            if (statusCounts[statusKey] !== undefined) {
                statusCounts[statusKey]++;
            }

            const type = r.procurementType || 'ไม่ระบุ';
            typeBudgets[type] = (typeBudgets[type] || 0) + (Number(r.totalPrice) || 0);
        });

        const statusData = [
            { name: 'รออนุมัติ', value: statusCounts.pending, color: '#F59E0B' },
            { name: 'อนุมัติแล้ว', value: statusCounts.approved, color: '#10B981' },
            { name: 'รับของแล้ว', value: statusCounts.received, color: '#3B82F6' },
            { name: 'เสร็จสิ้น', value: statusCounts.completed, color: '#6B7280' },
        ].filter(d => d.value > 0);

        const typeBudgetData = Object.entries(typeBudgets).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        return {
            total: records.length,
            buyingCount,
            hiringCount,
            totalApprovedBudget,
            statusData,
            typeBudgetData
        };
    }, [records]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ทะเบียนคุมทั้งหมด</p><h3 className="text-4xl font-black text-navy mt-1">{stats.total}</h3></div>
                    <div className="text-4xl opacity-10">📂</div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">รายการจัดซื้อ</p><h3 className="text-4xl font-black text-blue-600 mt-1">{stats.buyingCount}</h3></div>
                    <div className="text-4xl opacity-10">🛒</div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">รายการจัดจ้าง</p><h3 className="text-4xl font-black text-orange-500 mt-1">{stats.hiringCount}</h3></div>
                    <div className="text-4xl opacity-10">👷</div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">งบประมาณอนุมัติรวม</p><h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.totalApprovedBudget.toLocaleString()} <span className="text-xs">บาท</span></h3></div>
                    <div className="text-4xl opacity-10">💰</div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-96">
                    <h3 className="text-lg font-black text-navy mb-6">สัดส่วนสถานะโครงการ</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                            <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                                {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-96">
                    <h3 className="text-lg font-black text-navy mb-6">งบประมาณตามประเภท</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={stats.typeBudgetData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                            <Bar dataKey="value" name="งบประมาณ" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={30} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// Fix: Define GenericCrudPage component for managing simple settings lists.
interface GenericCrudPageProps {
    title: string;
    itemLabel: string;
    placeholder: string;
    items: string[];
    onUpdate: (items: string[]) => void;
}

const GenericCrudPage: React.FC<GenericCrudPageProps> = ({ title, itemLabel, placeholder, items, onUpdate }) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (newItem.trim() && !items.includes(newItem.trim())) {
            onUpdate([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    const handleRemove = (itemToRemove: string) => {
        if (window.confirm(`ต้องการลบ "${itemToRemove}"?`)) {
            onUpdate(items.filter(item => item !== itemToRemove));
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-navy mb-4">{title}</h2>
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">{itemLabel}</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        placeholder={placeholder}
                        className="border rounded-lg px-3 py-2 flex-grow"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    />
                    <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">เพิ่ม</button>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                {items.length > 0 ? items.map((item, index) => (
                    <span key={index} className="bg-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        {item}
                        <button onClick={() => handleRemove(item)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                    </span>
                )) : <p className="text-sm text-gray-400 italic">ไม่มีรายการ</p>}
            </div>
        </div>
    );
};


const SupplyPage: React.FC<SupplyPageProps> = ({ 
    currentUser, personnel, records, onSaveRecord, onDeleteRecord, settings, onSaveSettings, isSaving 
}) => {
    const [activeSubPage, setActiveSubPage] = useState<SubPage>('report_dashboard');
    const [viewingMemo, setViewingMemo] = useState<{ type: string, record: ProcurementRecord } | null>(null);
    const [editingRecord, setEditingRecord] = useState<ProcurementRecord | null>(null);
    const [printModalRecord, setPrintModalRecord] = useState<ProcurementRecord | null>(null);

    // Initial load check for material categories
    const materialCategories = useMemo(() => settings.materialCategories || DEFAULT_MATERIAL_CATEGORIES, [settings.materialCategories]);

    const handlePrintMemo = (type: string, record: ProcurementRecord) => {
        const originalTitle = document.title;
        
        const fileMappings: Record<string, string> = {
            'report': 'บันทึกข้อความ (รายงานขอซื้อ-จ้าง)',
            'approval_memo': 'บันทึกข้อความ (ขออนุมัติจัดซื้อ-จ้าง)',
            'details': 'รายละเอียดพัสดุ (แนบท้าย)',
            'payment': 'บันทึกข้อความ (ขออนุมัติจ่ายเงิน)',
            'disbursement': 'ใบเบิกพัสดุ',
            'receipt': 'ใบตรวจรับพัสดุ',
            'po': 'ใบสั่งซื้อ-จ้าง',
            'quotation': 'ใบเสนอราคา',
            'hiring_form': 'ใบขออนุมัติจัดจ้าง',
        };
    
        const filenamePart = fileMappings[type] || 'เอกสารจัดซื้อจัดจ้าง';
    
        const docIdentifier = record.docNumber || record.id;
        document.title = `${filenamePart}-${docIdentifier}`;
        
        const afterPrint = () => {
            document.title = originalTitle;
            window.removeEventListener('afterprint', afterPrint);
        };
        window.addEventListener('afterprint', afterPrint);
        
        window.print();
    };

    const handleSaveAndNavigate = async (record: ProcurementRecord) => {
        const success = await onSaveRecord(record);
        if (success !== false) {
            setEditingRecord(null);
            // Always ensure we go back to list, and because records prop updates, the list should refresh.
            setActiveSubPage('edit_request'); 
        }
    };

    const renderSubPage = () => {
        
        if (viewingMemo) {
            const props = { 
                record: viewingMemo.record, 
                settings, 
                onBack: () => setViewingMemo(null), 
                isEditable: true, 
                onPrint: handlePrintMemo,
                type: viewingMemo.type
            };
            // Mapping existing components (assuming they are defined below or imported)
            switch(viewingMemo.type) {
                case 'report': return <ProcurementMemo {...props} />;
                case 'approval_memo': return <ApprovalMemo {...props} />;
                case 'details': return <ProcurementDetailsMemo {...props} />;
                case 'payment': return <PaymentMemo {...props} />;
                case 'disbursement': return <DisbursementForm {...props} />;
                case 'receipt': return <ReceiptForm {...props} />;
                case 'po': return <PurchaseOrder {...props} />;
                case 'quotation': return <QuotationForm {...props} />;
                case 'hiring_form': return <HiringApprovalForm {...props} />;
                default: return <div className="p-10 text-center">Form not found</div>;
            }
        }

        switch (activeSubPage) {
            case 'report_dashboard':
                return <ProcurementDashboard records={records} />;
            case 'create_request': 
                return <CreateRequestForm 
                            currentUser={currentUser} 
                            settings={settings} 
                            editingRecord={editingRecord} 
                            onSave={handleSaveAndNavigate} 
                            onCancel={() => { setEditingRecord(null); setActiveSubPage('edit_request'); }}
                            isSaving={isSaving}
                        />;
            case 'edit_request': 
                return (
                    <div className="animate-fade-in space-y-6 w-full">
                        <EditRequestListPage 
                            records={records}
                            onEdit={(item) => { setEditingRecord(item); setActiveSubPage('create_request'); }}
                            onDelete={(ids) => onDeleteRecord(ids)}
                            onPrint={(item) => setPrintModalRecord(item)}
                            settings={settings}
                            currentUser={currentUser}
                            onSaveRecord={onSaveRecord}
                        />
                    </div>
                );
            case 'manage_materials':
                return <MaterialCategoryManager categories={materialCategories} onUpdate={(cats) => onSaveSettings({...settings, materialCategories: cats})} />;
            case 'manage_supply_types': 
                return <GenericCrudPage title="จัดการประเภทพัสดุ (Supply Types)" itemLabel="ชื่อประเภท" placeholder="เช่น วัสดุสำนักงาน..." items={settings.supplyTypes || []} onUpdate={(items) => onSaveSettings({...settings, supplyTypes: items})} />;
            case 'manage_methods': 
                return <GenericCrudPage title="จัดการวิธีจัดหา (Procurement Methods)" itemLabel="ชื่อวิธี" placeholder="เช่น เฉพาะเจาะจง..." items={settings.procurementMethods || []} onUpdate={(items) => onSaveSettings({...settings, procurementMethods: items})} />;
            case 'manage_departments': 
                return <GenericCrudPage title="จัดการหน่วยงาน/กลุ่มสาระ" itemLabel="ชื่อหน่วยงาน" placeholder="เช่น กลุ่มสาระฯ คณิตศาสตร์..." items={settings.departments || []} onUpdate={(items) => onSaveSettings({...settings, departments: items})} />;
            case 'manage_funds': 
                return <GenericCrudPage title="จัดการแหล่งเงิน/โครงการ" itemLabel="ชื่อแหล่งเงิน" placeholder="เช่น อุดหนุนรายหัว..." items={settings.budgetSources || []} onUpdate={(items) => onSaveSettings({...settings, budgetSources: items})} />;
            case 'receive_items': return <div className="p-10 text-center text-gray-400">ระบบตรวจรับ (กำลังปรับปรุงเชื่อมโยง)</div>; 
            default: return <div className="p-10">Select a menu</div>;
        }
    };
    
    // Menu definitions
    const menuGroups = [
      { key: 'report', label: 'ภาพรวม', items: [
          { id: 'report_dashboard', label: 'Dashboard จัดซื้อจัดจ้าง' },
      ]},
      { key: 'main', label: 'จัดซื้อจัดจ้าง', items: [
          { id: 'create_request', label: 'สร้างรายการสั่งซื้อ/จ้าง' },
          { id: 'edit_request', label: 'ทะเบียนคุม/พิมพ์เอกสาร' },
      ]},
      { key: 'data', label: 'ตั้งค่าข้อมูลพื้นฐาน', items: [
          { id: 'manage_materials', label: 'มาตรฐานบัญชีวัสดุ (Tree)' },
          { id: 'manage_departments', label: 'หน่วยงาน/กลุ่มสาระ' },
          { id: 'manage_funds', label: 'แหล่งเงิน/โครงการ' },
          { id: 'manage_supply_types', label: 'ประเภทพัสดุ (Type)' },
          { id: 'manage_methods', label: 'วิธีจัดหา (Method)' },
      ]},
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-6 -m-4 sm:-m-6 lg:-m-8 min-h-[80vh]">
            {/* Sidebar Navigation */}
            <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 p-4 lg:py-8 lg:pl-8 ${viewingMemo ? 'no-print' : ''}`}>
                
                {/* Info Card */}
                <div className="bg-white rounded-[2rem] shadow-lg border border-white/50 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">📦</div>
                        <h2 className="font-black text-navy text-lg leading-tight">ระบบบริหารงานพัสดุ</h2>
                        <p className="text-xs text-gray-500 font-bold mt-1">{settings.schoolName}</p>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="bg-white rounded-[2rem] shadow-lg border border-white/50 p-4 space-y-6 flex-grow">
                    {menuGroups.map(group => (
                        <div key={group.key}>
                            <div className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{group.label}</div>
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSubPage(item.id as SubPage)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-3 ${
                                            activeSubPage === item.id 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 transform scale-105' 
                                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeSubPage === item.id ? 'bg-white' : 'bg-gray-300'}`}></span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className={`flex-grow p-4 lg:p-8 bg-[#f8fafc] overflow-x-hidden ${viewingMemo ? 'print-container print-memo-mode' : 'rounded-[3rem] lg:rounded-l-[3rem] lg:rounded-r-none my-4 lg:my-8 mr-4 lg:mr-8 shadow-inner border border-gray-100'}`}>
                {renderSubPage()}
            </div>
            
            {printModalRecord && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 no-print">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg transform scale-100 transition-transform">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                            <h3 className="text-lg font-bold text-navy">เลือกพิมพ์เอกสาร : <span className="text-blue-600">{printModalRecord.docNumber || printModalRecord.id}</span></h3>
                            <button onClick={() => setPrintModalRecord(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {[
                                { type: 'report', label: 'บันทึกข้อความ (รายงานขอซื้อ/จ้าง)' },
                                { type: 'approval_memo', label: 'บันทึกข้อความ (ขออนุมัติจัดซื้อ/จ้าง)' },
                                { type: 'details', label: 'รายละเอียดพัสดุ (แนบท้าย)' },
                                { type: 'payment', label: 'บันทึกข้อความ (ขออนุมัติจ่ายเงิน)' },
                                { type: 'disbursement', label: 'ใบเบิกพัสดุ' },
                                { type: 'receipt', label: 'ใบตรวจรับพัสดุ' },
                                { type: 'po', label: 'ใบสั่งซื้อ/จ้าง' },
                                { type: 'quotation', label: 'ใบเสนอราคา' },
                                { type: 'hiring_form', label: 'ใบขออนุมัติจัดจ้าง' },
                            ].map((doc, index) => (
                                <button 
                                    key={doc.type}
                                    onClick={() => { setViewingMemo({ type: doc.type, record: printModalRecord }); setPrintModalRecord(null); }}
                                    className="w-full text-left p-3.5 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all border border-gray-100 text-sm font-bold flex items-center gap-3 group"
                                >
                                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-500">📄</span>
                                    {index + 1}. {doc.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setPrintModalRecord(null)} className="mt-6 w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors">ปิดหน้าต่าง</button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface ProcurementMemoProps {
    record: ProcurementRecord;
    settings: Settings;
    onBack: () => void;
    isEditable?: boolean;
    fontFamily?: string;
    onPrint: (type: string, record: ProcurementRecord) => void;
    type: string;
}

const ProcurementMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily, onPrint, type }) => {
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/0272bb364e0dce8d02.webp';
    const totalPrice = useMemo(() => (record.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0), [record.items]);

    // Create a list of items for the table, padded with empty rows up to 5
    const tableItems = useMemo(() => {
        const items = record.items || [];
        const padded = [...items];
        while (padded.length < 5) {
            padded.push({ id: `empty-${padded.length}`, description: '', quantity: 0, unit: '', unitPrice: 0 } as any);
        }
        return padded;
    }, [record.items]);

    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg text-blue-600">📄</span>
                    แสดงตัวอย่าง: บันทึกข้อความ (รายงานขอซื้อ)
                </h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        พิมพ์
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <div className="flex justify-between items-start mb-4">
                    <img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-20 h-auto" />
                    <p className="font-bold pt-2">ที่..........................................</p>
                </div>
                
                <h2 className="font-bold text-2xl text-center mt-[-1.5rem]">บันทึกข้อความ</h2>
                
                <div className="text-base leading-relaxed mt-6 space-y-1">
                    <div className="flex flex-wrap"><span className="font-bold w-32">ส่วนราชการ</span> <span>{settings.schoolName}</span></div>
                    <div className="flex flex-wrap items-baseline">
                        <span className="font-bold w-[30px]">ที่</span> 
                        <span className="flex-grow border-b border-dotted border-black px-2">..................................................................................................</span> 
                        <span className="font-bold w-16 text-right pr-2">วันที่</span> 
                        <span className="border-b border-dotted border-black px-2 w-48 text-center">{formatThaiDate(record.docDate)}</span>
                    </div>
                    <div className="flex flex-wrap items-baseline"><span className="font-bold w-32">เรื่อง</span> <span>{record.subject}</span></div>
                </div>
                
                <hr className="border-black my-4" />

                <div className="text-base leading-relaxed">
                    <p><span className="font-bold">เรียน</span> {record.managerName || `ผู้อำนวยการ${settings.schoolName}`}</p>
                    
                    <p className="indent-8 mt-4 text-justify leading-relaxed">
                        ด้วย {record.department} มีความประสงค์ขออนุมัติดำเนินการจัดซื้อ
                        เพื่อใช้ในการจัดการเรียนการสอน มีกำหนดใช้งานภายใน 3 วัน ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 56 วรรคหนึ่ง (2) (ข) และระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 22 ข้อ 79 ข้อ 25 (5) และกฎกระทรวงกำหนดวงเงินการจัดซื้อจัดจ้างพัสดุโดยวิธีเฉพาะเจาะจง วงเงินการจัดซื้อจัดจ้างที่ไม่ทำข้อตกลงเป็นหนังสือ และวงเงินการจัดซื้อจัดจ้างในการแต่งตั้งผู้ตรวจรับพัสดุ พ.ศ. 2560 ข้อ 1 และข้อ 5
                    </p>
                    <p className="indent-8 mt-2">มีรายละเอียดดังนี้</p>
                </div>

                <table className="w-full border-collapse border border-black text-center text-sm mt-4">
                    <thead>
                        <tr className="font-bold">
                            <td className="border border-black p-1 w-12">ลำดับที่</td>
                            <td className="border border-black p-1">รายการ พัสดุ / ซื้อ / จ้าง<br/>(ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</td>
                            <td colSpan={2} className="border border-black p-1">ปริมาณ</td>
                            <td colSpan={2} className="border border-black p-1">ราคา</td>
                            <td className="border border-black p-1 w-20">หมายเหตุ</td>
                        </tr>
                        <tr className="font-bold">
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1 w-16">จำนวน</td>
                            <td className="border border-black p-1 w-16">หน่วย</td>
                            <td className="border border-black p-1 w-24">ต่อหน่วย</td>
                            <td className="border border-black p-1 w-24">เป็นเงิน</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {tableItems.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border border-black p-1">{item.quantity > 0 ? index + 1 : ''}</td>
                                <td className="border border-black p-1 text-left">{item.description}</td>
                                <td className="border border-black p-1">{item.quantity > 0 ? item.quantity : ''}</td>
                                <td className="border border-black p-1">{item.unit}</td>
                                <td className="border border-black p-1 text-right">{item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ''}</td>
                                <td className="border border-black p-1 text-right">{item.quantity * item.unitPrice > 0 ? (item.quantity * item.unitPrice).toFixed(2) : ''}</td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} className="border border-black p-1 text-left font-bold">
                                (ส่วนลด 0.00 บาท จาก {totalPrice.toFixed(2)} บาท เหลือ {totalPrice.toFixed(2)} บาท) รวม
                            </td>
                            <td colSpan={3} className="border border-black p-1 font-bold">มูลค่าสินค้าก่อนคิด VAT</td>
                            <td className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                        <tr>
                            <td colSpan={2} className="border border-black p-1 text-left font-bold">
                                
                            </td>
                            <td colSpan={3} className="border border-black p-1 font-bold">ภาษีมูลค่าเพิ่ม 0 %</td>
                            <td className="border border-black p-1 text-right font-bold">0.00</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                        <tr>
                            <td colSpan={2} className="border border-black p-1 text-center font-bold">
                                {toThaiWords(totalPrice)}
                            </td>
                            <td colSpan={3} className="border border-black p-1 font-bold">รวมทั้งสิ้น</td>
                            <td className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-4 text-base">
                    <p className="font-bold">จึงเรียนมาเพื่อโปรดพิจารณา</p>
                    <p className="ml-4">1.เห็นชอบในรายงานขอซื้อ</p>
                    <p className="ml-4">2.แต่งตั้งบุคคลต่อไปนี้ เป็นคณะกรรมการตรวจรับพัสดุ / ผู้ตรวจรับ</p>
                    <div className="ml-12">
                        <div className="flex items-baseline"><span className="w-8">2.1</span> <span className="border-b border-dotted border-black flex-grow">นายทองคำ มากมี</span> <span className="w-20 ml-2">ตำแหน่ง</span> <span className="border-b border-dotted border-black w-48">ครู</span></div>
                        <div className="flex items-baseline mt-1"><span className="w-8">2.2</span> <span className="border-b border-dotted border-black flex-grow">...................................................</span> <span className="w-20 ml-2">ตำแหน่ง</span> <span className="border-b border-dotted border-black w-48">กรรมการ</span></div>
                        <div className="flex items-baseline mt-1"><span className="w-8">2.3</span> <span className="border-b border-dotted border-black flex-grow">...................................................</span> <span className="w-20 ml-2">ตำแหน่ง</span> <span className="border-b border-dotted border-black w-48">กรรมการ</span></div>
                    </div>
                </div>

                <div className="mt-8 text-base leading-tight flex justify-between">
                    <div className="w-1/2 space-y-12 text-center">
                        <div>
                            <p>ลงชื่อ .......................................................</p>
                            <p className="mt-2">( {record.requesterName} )</p>
                            <p>เจ้าหน้าที่พัสดุ</p>
                            <p>กลุ่ม/งาน</p>
                        </div>
                        <div>
                            <p>ลงชื่อ .......................................................</p>
                            <p className="mt-2">( นายกัญญา รัตน์อำนวย )</p>
                            <p>หัวหน้าเจ้าหน้าที่พัสดุ</p>
                            <p>โรงเรียน</p>
                        </div>
                        <div>
                            <p>ลงชื่อ .......................................................</p>
                            <p className="mt-2">( นางนิธิวดี วรเดช )</p>
                            <p>รองผู้อำนวยการกลุ่มบริหารงบประมาณ</p>
                        </div>
                    </div>
                    <div className="w-1/2 text-center mt-20">
                        <div className="mb-8">
                            <p>1) เห็นชอบ</p>
                            <p>2) อนุมัติ</p>
                        </div>
                        <div>
                            <p>ลงชื่อ........................................................</p>
                            <p className="mt-2">( {record.managerName} )</p>
                            <p>ผู้อำนวยการ{settings.schoolName}</p>
                            <p>{record.approvedDate ? formatThaiDate(record.approvedDate) : '........................................................'}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const ApprovalMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, onPrint, type }) => {
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/0272bb364e0dce8d02.webp';
    
    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg text-blue-600">📄</span>
                    แสดงตัวอย่าง: บันทึกข้อความ (ขออนุมัติจัดซื้อ/จ้าง)
                </h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        พิมพ์
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <div className="flex justify-between items-start mb-4">
                    <img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-20 h-auto" />
                    <p className="font-bold pt-2">เลขที่..........................................</p>
                </div>
                
                <h2 className="font-bold text-2xl text-center mt-[-1.5rem]">บันทึกข้อความ</h2>
                
                <div className="text-base leading-relaxed mt-6 space-y-1">
                    <div className="flex flex-wrap"><span className="font-bold w-32">ส่วนราชการ</span> <span>{settings.schoolName}</span></div>
                    <div className="flex flex-wrap items-baseline">
                        <span className="font-bold w-[30px]">ที่</span> 
                        <span className="flex-grow border-b border-dotted border-black px-2">..................................................................................................</span> 
                        <span className="font-bold w-16 text-right pr-2">วันที่</span> 
                        <span className="border-b border-dotted border-black px-2 w-48 text-center">{formatThaiDate(record.docDate)}</span>
                    </div>
                    <div className="flex flex-wrap items-baseline"><span className="font-bold w-32">เรื่อง</span> <span>ขออนุมัติจัดซื้อ</span></div>
                </div>
                
                <hr className="border-black my-4" />

                <div className="text-base leading-relaxed">
                    <p><span className="font-bold">เรียน</span> {record.managerName || `ผู้อำนวยการ${settings.schoolName}`}</p>
                    
                    <p className="indent-8 mt-4 text-justify leading-relaxed flex flex-wrap">
                        ด้วย {record.requesterName} มีความประสงค์ขอดำเนินการจัดซื้อ เพื่อใช้ในการจัดการเรียนการสอน ซึ่งได้รับอนุมัติเงินจาก 
                        <span className="border-b border-dotted border-black flex-grow px-2 mx-2">{record.project}</span> 
                        โดยใช้เงินอุดหนุนรายหัว จำนวนเงิน {record.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท 
                        ({toThaiWords(record.totalPrice)}) (รายละเอียดรายการดังแนบ)
                    </p>
                    <p className="indent-8 mt-4">จึงเรียนมาเพื่อโปรดพิจารณา</p>
                </div>

                <div className="mt-8 text-base flex justify-end">
                    <div className="w-1/2 text-center space-y-1">
                        <p>ลงชื่อ ..........................................</p>
                        <p>( นางสาววารุณี ศรีใจ )</p>
                        <p>หัวหน้ากลุ่มสาระฯ/หัวหน้างาน</p>
                    </div>
                </div>

                <div className="mt-6 border-t border-black pt-4 text-base">
                    <p className="font-bold">ความเห็นของหัวหน้างานนโยบายและแผนงาน</p>
                    <div className="ml-8 mt-2 space-y-1">
                        <p><input type="checkbox" className="mr-2 align-middle" defaultChecked /> มีแผนปฏิบัติการประจำปี เงินอุดหนุนรายหัว</p>
                        <p><input type="checkbox" className="mr-2 align-middle" /> ไม่อยู่ในแผนปฏิบัติการ</p>
                    </div>
                    <table className="w-full border-collapse border border-black text-center text-sm mt-4">
                        <thead>
                            <tr className="font-bold">
                                <td className="border border-black p-1">จำนวนเงินที่ได้รับจัดสรร</td>
                                <td className="border border-black p-1">เบิกจ่ายแล้ว</td>
                                <td className="border border-black p-1">ขอเบิกครั้งนี้</td>
                                <td className="border border-black p-1">คงเหลือ</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 h-10"></td>
                                <td className="border border-black p-2"></td>
                                <td className="border border-black p-2 font-bold">{record.totalPrice > 0 ? record.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00'}</td>
                                <td className="border border-black p-2"></td>
                            </tr>
                        </tbody>
                    </table>
                     <div className="mt-6 text-base flex justify-end">
                        <div className="w-1/2 text-center space-y-1">
                            <p>ลงชื่อ .......................................... หัวหน้างานนโยบายและแผนงาน</p>
                            <p>( นางอรทิพย์ ธานะ )</p>
                            <p>{formatThaiDate(record.docDate)}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t border-black pt-4 text-base">
                    <p className="font-bold">ความเห็นของรองผู้อำนวยการโรงเรียนกลุ่มบริหารการเงินและทรัพย์สิน</p>
                    <div className="ml-8 mt-2 flex gap-8">
                        <p><input type="checkbox" className="mr-2 align-middle" /> เห็นควรอนุมัติ</p>
                        <p><input type="checkbox" className="mr-2 align-middle" /> เห็นควรไม่อนุมัติ</p>
                    </div>
                    <div className="flex items-baseline mt-1"><span className="font-bold">เหตุผล</span><span className="border-b border-dotted border-black flex-grow ml-2">...................................................................................................................</span></div>
                    <div className="mt-6 text-base flex justify-end">
                        <div className="w-1/2 text-center space-y-1">
                            <p>ลงชื่อ ..........................................</p>
                            <p>( นางนิธิวดี วรเดช )</p>
                            <p>รองผู้อำนวยการฯ กลุ่มบริหารงบประมาณ</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t border-black pt-4 text-base">
                    <p className="font-bold">ความเห็นของผู้อำนวยการโรงเรียนกลุ่มบริหารการเงินและทรัพย์สิน</p>
                    <div className="ml-8 mt-2 flex gap-8">
                        <p><input type="checkbox" className="mr-2 align-middle" /> อนุมัติ</p>
                        <p><input type="checkbox" className="mr-2 align-middle" /> ไม่อนุมัติ</p>
                    </div>
                    <div className="flex items-baseline mt-1"><span className="font-bold">เหตุผล</span><span className="border-b border-dotted border-black flex-grow ml-2">...................................................................................................................</span></div>
                    <div className="mt-6 text-base flex justify-end">
                        <div className="w-1/2 text-center space-y-1">
                            <p>ลงชื่อ ..........................................</p>
                            <p>( {record.managerName || 'นายสุรชัย โสภาพรม'} )</p>
                            <p>ผู้อำนวยการ{settings.schoolName}</p>
                            <p>{formatThaiDate(record.docDate)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProcurementDetailsMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, onPrint, type }) => {
    const totalPrice = useMemo(() => (record.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0), [record.items]);
    
    // Pad items to a minimum of 10 rows for a full-page look
    const tableItems = useMemo(() => {
        const items = record.items || [];
        const padded = [...items];
        while (padded.length < 10) {
            padded.push({ id: `empty-${padded.length}`, description: '', quantity: 0, unit: '', unitPrice: 0 } as any);
        }
        return padded;
    }, [record.items]);

    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg text-blue-600">📄</span>
                    แสดงตัวอย่าง: รายละเอียดแนบท้าย
                </h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        พิมพ์
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <h2 className="font-bold text-xl text-center">รายละเอียดแนบท้ายรายงานขอซื้อ/ขอจ้าง</h2>
                <p className="text-center text-base">ตามหนังสือ ที่ {record.docNumber || '................'} ลงวันที่ {formatThaiDate(record.docDate)}</p>

                <table className="w-full border-collapse border border-black text-center text-sm mt-6">
                    <thead>
                        <tr className="font-bold">
                            <td className="border border-black p-1 w-12">ลำดับที่</td>
                            <td className="border border-black p-1">รายการ</td>
                            <td className="border border-black p-1 w-20">จำนวน</td>
                            <td className="border border-black p-1 w-20">หน่วย</td>
                            <td className="border border-black p-1 w-28">ราคาต่อหน่วย</td>
                            <td className="border border-black p-1 w-28">เป็นเงิน</td>
                            <td className="border border-black p-1 w-24">หมายเหตุ</td>
                        </tr>
                    </thead>
                    <tbody>
                        {tableItems.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border border-black p-1 h-8">{item.quantity > 0 ? index + 1 : ''}</td>
                                <td className="border border-black p-1 text-left">{item.description}</td>
                                <td className="border border-black p-1">{item.quantity > 0 ? item.quantity : ''}</td>
                                <td className="border border-black p-1">{item.unit}</td>
                                <td className="border border-black p-1 text-right">{item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ''}</td>
                                <td className="border border-black p-1 text-right">{item.quantity * item.unitPrice > 0 ? (item.quantity * item.unitPrice).toFixed(2) : ''}</td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold">
                            <td colSpan={5} className="border border-black p-2 text-right">รวมเป็นเงินทั้งสิ้น</td>
                            <td className="border border-black p-2 text-right">{totalPrice.toFixed(2)}</td>
                            <td className="border border-black p-2"></td>
                        </tr>
                        <tr className="font-bold">
                            <td colSpan={7} className="border border-black p-2 text-center">
                                {toThaiWords(totalPrice)}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-16 text-base grid grid-cols-2 gap-16">
                    <div className="text-center">
                        <p>ลงชื่อ .......................................................</p>
                        <p className="mt-2">( {record.requesterName} )</p>
                        <p>ตำแหน่ง เจ้าหน้าที่</p>
                    </div>
                    <div className="text-center">
                        <p>ลงชื่อ .......................................................</p>
                        <p className="mt-2">( นายกัญญา รัตน์อำนวย )</p>
                        <p>ตำแหน่ง หัวหน้าเจ้าหน้าที่</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaymentMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, onPrint, type }) => {
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/0272bb364e0dce8d02.webp';
    const totalPrice = record.totalPrice || 0;
    
    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg text-blue-600">📄</span>
                    แสดงตัวอย่าง: บันทึกข้อความ (ขออนุมัติจ่ายเงิน)
                </h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">พิมพ์</button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <div className="flex justify-between items-start mb-4">
                    <img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-20 h-auto" />
                    <div className="text-right text-base leading-tight">
                        <p>ส่วนราชการ {settings.schoolName}</p>
                        <p>ที่ โรงเรียน{settings.schoolName}</p>
                    </div>
                </div>
                
                <h2 className="font-bold text-2xl text-center mt-[-1.5rem]">บันทึกข้อความ</h2>
                
                <div className="text-base mt-6">
                    <p className="text-right">วันที่ {formatThaiDate(record.docDate)}</p>
                    <p><span className="font-bold">เรื่อง</span> ขออนุมัติจ่ายเงินค่าพัสดุ</p>
                </div>
                
                <hr className="border-black my-4" />

                <div className="text-base leading-relaxed">
                    <p><span className="font-bold">เรียน</span> {record.managerName || `ผู้อำนวยการ${settings.schoolName}`}</p>
                    
                    <p className="indent-8 mt-4 text-justify leading-relaxed">
                        ตามที่งานพัสดุ {settings.schoolName} ได้จัดซื้อพัสดุ จำนวน {(record.items || []).length} รายการ
                        เป็นเงิน {totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ({toThaiWords(totalPrice)})
                        บัดนี้ ผู้ส่งของ ได้ส่งของ ตาม ใบส่งของ/ใบแจ้งนี้/ใบเสร็จรับเงิน เล่มที่/เลขที่ ............
                        ลงวันที่ {formatThaiDate(record.docDate)} และคณะกรรมการตรวจรับพัสดุเรียบร้อยแล้ว
                    </p>
                    <p className="indent-8 mt-4">จึงเรียนมาเพื่อโปรด</p>
                    
                    <div className="ml-12 mt-2 space-y-1">
                        <p>อนุมัติจ่ายเงินให้แก่</p>
                        <div className="flex items-center">
                            <input type="checkbox" checked readOnly className="mr-2 align-middle border-2" /> ร้าน {record.supplierName} ................................................................ ผู้ขาย
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" className="mr-2 align-middle border-2" /> ................................................................................................ ผู้ทดรองจ่าย
                        </div>
                    </div>
                    <p className="ml-12 mt-2">เป็นเงิน {totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                </div>

                <div className="w-1/2 ml-auto mt-6 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span>ส่วนลด 0.00 จาก 0.00</span> <span className="text-right">เหลือ 0.00 บาท</span>
                        <span>มูลค่าสินค้าหรือบริการ</span> <span className="text-right border-b border-black">{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        <span>บวก ภาษีมูลค่าเพิ่ม</span> <span className="text-right border-b border-black">0.00 บาท</span>
                        <span className="font-bold">จำนวนเงินที่ขอเบิกทั้งสิ้น</span> <span className="text-right border-b border-black font-bold">{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        <span>หัก ภาษี ณ ที่จ่าย</span> <span className="text-right border-b border-black">0.00 บาท</span>
                        <span>ค่าปรับ</span> <span className="text-right border-b border-black">- บาท</span>
                        <span className="font-bold">คงเหลือจ่ายจริง</span> <span className="text-right border-b-4 border-double border-black font-bold">{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                     <p className="text-center mt-2 font-bold">{toThaiWords(totalPrice)}</p>
                </div>

                <div className="mt-8 text-base grid grid-cols-2 gap-8">
                    <div className="space-y-16 text-center">
                        <div>
                            <p>ลงชื่อ..................................</p>
                            <p className="mt-1">(นางปิยธิดา อบมาลัย)</p>
                            <p>เจ้าหน้าที่การเงิน</p>
                        </div>
                         <div>
                            <p>ลงชื่อ..................................</p>
                            <p className="mt-1">(นางนิธิวดี วรเดช)</p>
                            <p>รองผู้อำนวยการฯ กลุ่มบริหารงบประมาณ</p>
                        </div>
                    </div>
                     <div className="text-center">
                        <div className="mt-20 space-y-1">
                            <p>1. ทราบ</p>
                            <p>2. อนุมัติจ่ายเงิน</p>
                        </div>
                        <div className="mt-12 space-y-1">
                            <p>ลงชื่อ..................................</p>
                            <p>({record.managerName || 'นายสุรชัย โสภาพรม'})</p>
                            <p>ผู้อำนวยการ{settings.schoolName}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DisbursementForm: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, onPrint, type }) => {
    const totalPrice = useMemo(() => (record.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0), [record.items]);
    
    // Pad items to a minimum of 10 rows for a full-page look
    const tableItems = useMemo(() => {
        const items = record.items || [];
        const padded = [...items];
        while (padded.length < 10) {
            padded.push({ id: `empty-${padded.length}`, description: '', quantity: 0, unit: '', unitPrice: 0 } as any);
        }
        return padded;
    }, [record.items]);

    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg text-blue-600">📄</span>
                    แสดงตัวอย่าง: ใบเบิกพัสดุ
                </h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">พิมพ์</button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <div className="flex justify-between items-start text-base">
                    <h2 className="font-bold text-2xl">ใบเบิกพัสดุ</h2>
                    <div className="text-right">
                        <p>ที่........./.........</p>
                        <p>วันที่ {formatThaiDate(record.docDate)}</p>
                        <p>{settings.schoolName}</p>
                    </div>
                </div>
                
                <div className="mt-4 text-base space-y-1">
                    <p>ข้าพเจ้าขอเบิกสิ่งของต่อไปนี้ เพื่อ <span className="border-b border-dotted border-black px-4">{record.reason}</span></p>
                    <p>โดยใช้เงิน <span className="border-b border-dotted border-black px-4">{record.project}</span> หัวหน้างาน <span className="border-b border-dotted border-black px-4">{record.department}</span></p>
                    <p>หน่วยงานที่ใช้งาน <span className="border-b border-dotted border-black px-4">{record.department}</span></p>
                </div>

                <table className="w-full border-collapse border border-black text-center text-sm mt-4">
                    <thead>
                        <tr className="font-bold">
                            <td className="border border-black p-1 w-12">ลำดับที่</td>
                            <td className="border border-black p-1">รายการ</td>
                            <td className="border border-black p-1 w-20">จำนวน</td>
                            <td className="border border-black p-1 w-20">หน่วย</td>
                            <td className="border border-black p-1 w-24">ราคา/หน่วย</td>
                            <td className="border border-black p-1 w-24">เป็นเงิน</td>
                            <td className="border border-black p-1 w-20">หมายเหตุ</td>
                        </tr>
                    </thead>
                    <tbody>
                        {tableItems.map((item, index) => (
                             <tr key={item.id}>
                                <td className="border border-black p-1 h-8">{item.quantity > 0 ? index + 1 : ''}</td>
                                <td className="border border-black p-1 text-left">{item.description}</td>
                                <td className="border border-black p-1">{item.quantity > 0 ? item.quantity : ''}</td>
                                <td className="border border-black p-1">{item.unit}</td>
                                <td className="border border-black p-1 text-right">{item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ''}</td>
                                <td className="border border-black p-1 text-right">{item.quantity * item.unitPrice > 0 ? (item.quantity * item.unitPrice).toFixed(2) : ''}</td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                         <tr>
                            <td colSpan={4} className="border border-black p-1 text-left font-bold">
                                (ส่วนลด 0.00 บาท จาก {totalPrice.toFixed(2)} บาท เหลือ {totalPrice.toFixed(2)} บาท) รวมมูลค่า
                            </td>
                            <td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="border border-black p-1 font-bold">สินค้าก่อนคิด VAT</td>
                            <td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="border border-black p-1 font-bold">ภาษีมูลค่าเพิ่ม 0 %</td>
                            <td colSpan={2} className="border border-black p-1 text-right font-bold">0.00</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="border border-black p-1 font-bold">รวมทั้งสิ้น</td>
                            <td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div className="mt-8 grid grid-cols-2 gap-8 text-base">
                    <div className="space-y-4">
                        <p className="font-bold">ได้รับของถูกต้องครบถ้วนแล้ว</p>
                        <p className="mt-12">ลงชื่อ .......................................... ผู้รับ</p>
                        <p>(..........................................)</p>
                    </div>
                     <div className="space-y-4 text-right">
                        <p className="font-bold">อนุญาตให้เบิกได้</p>
                        <p className="mt-12">ลงชื่อ .......................................... ผู้สั่งจ่าย</p>
                        <p>(..........................................)</p>
                    </div>
                </div>

                 <div className="mt-8 grid grid-cols-2 gap-8 text-base">
                    <div className="text-center">
                        <p>ลงชื่อ .......................................... ผู้เบิก</p>
                        <p>({record.requesterName})</p>
                    </div>
                     <div className="text-center">
                        <p>ลงชื่อ .......................................... ผู้เห็นชอบ</p>
                        <p>(..........................................)</p>
                    </div>
                </div>
                 <p className="text-right mt-4 text-base">วันที่ {formatThaiDate(record.docDate)}</p>

            </div>
        </div>
    );
};

const ReceiptForm: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, onPrint, type }) => {
    const totalPrice = record.totalPrice || 0;
    
    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy">แสดงตัวอย่าง: ใบตรวจรับพัสดุ</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">พิมพ์</button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="font-bold text-2xl">ใบตรวจรับพัสดุ</h2>
                    <div className="text-right text-base leading-tight">
                        <p>ที่........./.........</p>
                        <p>{settings.schoolName}</p>
                    </div>
                </div>
                <p className="text-right text-base">วันที่ {formatThaiDate(record.docDate)}</p>
                
                <div className="text-base mt-4 leading-relaxed space-y-2">
                    <p>ด้วย บริษัท/ห้างหุ้นส่วน/ร้าน {record.supplierName} ได้ส่งมอบพัสดุ {(record.items || []).length} รายการ</p>
                    <p className="flex items-center gap-2">ตาม <input type="checkbox" className="align-middle" /> ตกลงราคา <input type="checkbox" className="align-middle" defaultChecked /> ใบสั่งซื้อเลขที่ {record.docNumber || '.........................'} ลงวันที่ {formatThaiDate(record.docDate)}</p>
                    <p>ครบกำหนดส่งมอบ {formatThaiDate(record.neededDate || record.docDate)} ให้ไว้แก่ {settings.schoolName} ตามรายการต่อไปนี้</p>
                </div>
                
                <div className="text-base mt-4 leading-relaxed indent-8">
                    <p>เพื่อให้คณะกรรมการตรวจรับพัสดุ ทำการตรวจรับแล้ว ปรากฏผล ดังนี้</p>
                    <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li>ครบกำหนดส่งมอบ วันที่ {formatThaiDate(record.neededDate || record.docDate)}</li>
                        <li>ส่งมอบเมื่อ วันที่ {formatThaiDate(record.docDate)}</li>
                        <li>ได้ตรวจรับพัสดุตาม ใบส่งของ/ใบแจ้งหนี้/ใบเสร็จรับเงิน เล่มที่/เลขที่ ................... ลงวันที่ {formatThaiDate(record.docDate)} ณ {settings.schoolName}</li>
                        <li>ได้ตรวจรับและถือว่า <input type="checkbox" defaultChecked /> ถูกต้อง จำนวน {(record.items || []).length} รายการ <input type="checkbox" /> ไม่ถูกต้อง จำนวน ........... รายการ</li>
                        <li>ได้เชิญผู้ชำนาญการหรือผู้ทรงคุณวุฒิมาปรึกษาด้วย คือ นายชัชธิศัพท์ ทรงสมบูรณ์</li>
                        <li>ได้มอบไว้ให้แก่ เจ้าหน้าที่พัสดุ</li>
                    </ol>
                    <p className="mt-2">จึงรายงานต่อผู้อำนวยการ{settings.schoolName} เพื่อโปรดทราบผลการตรวจรับ ตามนัยข้อ 175 แห่งระเบียบสำนัก กระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560</p>
                </div>
                
                <div className="mt-8 space-y-6 text-base">
                    <div className="flex justify-end"><div className="w-1/2 text-center">(ลงชื่อ)................................................... ประธานกรรมการ/ผู้ตรวจรับ<br/>( นายทองคำ มากมี )</div></div>
                    <div className="flex justify-end"><div className="w-1/2 text-center">(ลงชื่อ)................................................... กรรมการ<br/>( ................................................. )</div></div>
                    <div className="flex justify-end"><div className="w-1/2 text-center">(ลงชื่อ)................................................... กรรมการ<br/>( ................................................. )</div></div>
                </div>

                <div className="mt-8 text-base">
                    <p><span className="font-bold">เรียน</span> ผู้อำนวยการ{settings.schoolName}</p>
                    <p className="indent-8 mt-2">คณะกรรมการตรวจรับพัสดุถูกต้องและได้รับมอบพัสดุดังกล่าวแล้วซึ่งจะต้องจ่ายเงินให้แก่ผู้ขายเป็นเงิน {totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                </div>

                <div className="w-1/2 ml-auto mt-4 text-sm space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 items-baseline">
                        <span>ส่วนลด 0.00 จาก 0.00</span><span className="text-right">เหลือ 0.00 บาท</span>
                        <span>มูลค่าสินค้าหรือบริการ</span><span className="text-right border-b border-black">{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        <span>บวก ภาษีมูลค่าเพิ่ม</span><span className="text-right border-b border-black">0.00 บาท</span>
                        <span className="font-bold">จำนวนที่ขอเบิกทั้งสิ้น</span><span className="text-right border-b border-black font-bold">{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        <span>หัก ภาษี ณ ที่จ่าย</span><span className="text-right border-b border-black">0.00 บาท</span>
                        <span>ค่าปรับ</span><span className="text-right border-b border-black">- บาท</span>
                        <span className="font-bold">คงเหลือจ่ายจริง</span><span className="text-right border-b-4 border-double border-black font-bold">{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-8 text-base">
                    <div className="space-y-12 text-center">
                        <div><p>(ลงชื่อ)...................................... เจ้าหน้าที่พัสดุ</p><p>(นายวิมลวรรณ พิลาคุณ)</p></div>
                        <div><p>(ลงชื่อ)......................................</p><p>(นางนิธิวดี วรเดช)</p><p>รองผู้อำนวยการกลุ่มบริหารงบประมาณ</p></div>
                    </div>
                    <div className="space-y-12 text-center">
                        <div><p>(ลงชื่อ)...................................... หัวหน้าเจ้าหน้าที่พัสดุ</p><p>(นายกัญญารัตน์ อำนวย)</p></div>
                        <div><p>1) เห็น .............................. 2) อนุมัติ</p><p className="mt-6">(ลงชื่อ)......................................</p><p>({record.managerName || 'นายสุรชัย โสภาพรม'})</p><p>ผู้อำนวยการ{settings.schoolName}</p><p>{formatThaiDate(record.docDate)}</p></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const PurchaseOrder: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, onPrint, type }) => {
    const totalPrice = useMemo(() => (record.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0), [record.items]);
    const isHiring = record.procurementType.includes('จ้าง');
    
    // Pad items to a minimum of 8 rows
    const tableItems = useMemo(() => {
        const items = record.items || [];
        const padded = [...items];
        while (padded.length < 8) {
            padded.push({ id: `empty-${padded.length}`, description: '', quantity: 0, unit: '', unitPrice: 0 } as any);
        }
        return padded;
    }, [record.items]);

    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy">แสดงตัวอย่าง: {isHiring ? 'ใบสั่งจ้าง' : 'ใบสั่งซื้อ'}</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">พิมพ์</button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <div className="flex justify-between items-start mb-4">
                    <p className="font-bold">เลขที่ {record.docNumber || '.........................'}</p>
                    <div className="text-center">
                        <h2 className="font-bold text-2xl">{isHiring ? 'ใบสั่งจ้าง' : 'ใบสั่งซื้อ'}</h2>
                    </div>
                    <div className="text-right text-base">
                        <p>เขียนที่ {settings.schoolName}</p>
                        <p>วันที่ {formatThaiDate(record.docDate)}</p>
                    </div>
                </div>
                
                <div className="text-base mt-4 leading-relaxed space-y-2">
                    <p><span className="font-bold">เรียน</span> {record.supplierName}</p>
                    <p className="indent-8 text-justify">
                        เนื่องด้วย {settings.schoolName} โดยได้รับมอบอำนาจจากสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน มีความประสงค์จะซื้อสิ่งของจากท่าน ตามที่ตกลง ขาย ตามรายการเป็นเงินทั้งสิ้น {totalPrice.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท ({toThaiWords(totalPrice)}) ดังมีรายการต่อไปนี้
                    </p>
                </div>

                <table className="w-full border-collapse border border-black text-center text-sm mt-4">
                    <thead className="font-bold">
                        <tr>
                            <td rowSpan={2} className="border border-black p-1 w-12">ลำดับที่</td>
                            <td rowSpan={2} className="border border-black p-1">รายการ</td>
                            <td colSpan={2} className="border border-black p-1">ปริมาณ</td>
                            <td colSpan={2} className="border border-black p-1">ราคา</td>
                            <td rowSpan={2} className="border border-black p-1 w-20">หมายเหตุ</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 w-16">จำนวน</td>
                            <td className="border border-black p-1 w-16">หน่วย</td>
                            <td className="border border-black p-1 w-24">ต่อหน่วย</td>
                            <td className="border border-black p-1 w-24">เป็นเงิน</td>
                        </tr>
                    </thead>
                    <tbody>
                        {tableItems.map((item, index) => (
                             <tr key={item.id}>
                                <td className="border border-black p-1 h-8">{item.quantity > 0 ? index + 1 : ''}</td>
                                <td className="border border-black p-1 text-left">{item.description}</td>
                                <td className="border border-black p-1">{item.quantity > 0 ? item.quantity : ''}</td>
                                <td className="border border-black p-1">{item.unit}</td>
                                <td className="border border-black p-1 text-right">{item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ''}</td>
                                <td className="border border-black p-1 text-right">{item.quantity * item.unitPrice > 0 ? (item.quantity * item.unitPrice).toFixed(2) : ''}</td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr><td colSpan={4} className="border border-black p-1 text-left font-bold">(ส่วนลด 0.00 บาท จาก {totalPrice.toFixed(2)} บาท) รวมมูลค่า</td><td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td><td className="border border-black p-1"></td></tr>
                        <tr><td colSpan={4} className="border border-black p-1 font-bold">สินค้าก่อนคิด VAT</td><td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td><td className="border border-black p-1"></td></tr>
                        <tr><td colSpan={4} className="border border-black p-1 font-bold">ภาษีมูลค่าเพิ่ม 0 %</td><td colSpan={2} className="border border-black p-1 text-right font-bold">0.00</td><td className="border border-black p-1"></td></tr>
                        <tr><td colSpan={4} className="border border-black p-1 font-bold">รวมทั้งสิ้น</td><td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td><td className="border border-black p-1"></td></tr>
                    </tfoot>
                </table>

                <div className="mt-4 text-base leading-relaxed text-justify space-y-2">
                    <p>จึงขอให้ท่านส่งมอบพัสดุดังกล่าวให้ {settings.schoolName} ณ ห้องพัสดุ {settings.schoolName} ภายในวันที่ {formatThaiDate(record.neededDate || record.docDate)}</p>
                    <p>ถ้าส่งมอบพัสดุเกินระยะเวลาที่กำหนด ผู้ขายจะต้องชำระค่าปรับเป็นรายวันให้กับผู้ซื้อในอัตราร้อยละ 0.2 ของราคาพัสดุที่ยังมิได้ส่งมอบ จนกว่าจะส่งมอบถูกต้องครบถ้วน</p>
                    <p>ในกรณีที่ไม่สามารถปฏิบัติตามใบสั่งซื้อได้ และจะต้องมีการปรับตามใบสั่งซื้อนี้ หากจำนวนเงินค่าปรับจะเกินร้อยละสิบ ของวงเงินค่าพัสดุดังกล่าว ผู้ซื้ออาจพิจารณา ดำเนินการยกเลิกใบสั่งซื้อนี้ เว้นแต่ผู้ขายจะได้ยอมเสียค่าปรับให้แก่ทางราชการ โดยไม่มีเงื่อนไขใดๆ ทั้งสิ้น ผู้ซื้ออาจพิจารณาผ่อนปรนการยกเลิกใบสั่งซื้อได้เท่าที่จำเป็น</p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-8 text-base text-center">
                    <div>
                        <p>ลงชื่อ.........................................ผู้สั่งซื้อ</p>
                        <p>(นายทองคำ มากมี)</p>
                        <p>หัวหน้าเจ้าหน้าที่พัสดุโรงเรียน</p>
                    </div>
                    <div>
                        <p>ลงชื่อ.........................................ผู้ขาย</p>
                        <p>(.........................................)</p>
                        <p>............../........................./.........................</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuotationForm: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, onPrint, type }) => {
    const totalPrice = useMemo(() => (record.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0), [record.items]);
    
    // Pad items to a minimum of 8 rows
    const tableItems = useMemo(() => {
        const items = record.items || [];
        const padded = [...items];
        while (padded.length < 8) {
            padded.push({ id: `empty-${padded.length}`, description: '', quantity: 0, unit: '', unitPrice: 0 } as any);
        }
        return padded;
    }, [record.items]);

    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy">แสดงตัวอย่าง: ใบเสนอราคา</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">พิมพ์</button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '1.5cm 2cm', boxSizing: 'border-box', fontSize: '16pt' }}>
                <div className="flex justify-between items-start mb-4">
                    <p className="font-bold">เลขที่ {record.docNumber || '.........................'}</p>
                    <h2 className="font-bold text-2xl">ใบเสนอราคา</h2>
                    <div className="text-right text-base">
                        <p>เขียนที่ {settings.schoolName}</p>
                        <p>วันที่ {formatThaiDate(record.docDate)}</p>
                    </div>
                </div>
                
                <div className="text-base mt-4 leading-relaxed space-y-2">
                    <p><span className="font-bold">เรียน</span> ผู้อำนวยการ{settings.schoolName}</p>
                    <p className="indent-8 text-justify">1. ข้าพเจ้า ร้าน {record.supplierName} ที่อยู่ ............................ เลขประจำตัวผู้เสียภาษี ............................ ข้าพเจ้าเป็นผู้มีคุณสมบัติครบถ้วนตามที่กำหนดและไม่เป็นผู้ทิ้งงานราชการ</p>
                    <p className="indent-8 text-justify">2. ข้าพเจ้าขอเสนอราคาพัสดุ รวมทั้งบริการ ซึ่งกำหนดไว้ตามราคาและเวลาส่งมอบ ดังต่อไปนี้ ซึ่งเป็นราคาที่รวมภาษีมูลค่าเพิ่มรวมทั้งภาษีอากรอื่นและค่าใช้จ่ายทั้งปวงไว้ด้วยแล้ว</p>
                </div>

                <table className="w-full border-collapse border border-black text-center text-sm mt-4">
                    <thead className="font-bold">
                        <tr>
                            <td rowSpan={2} className="border border-black p-1 w-12">ลำดับที่</td>
                            <td rowSpan={2} className="border border-black p-1">รายการ</td>
                            <td colSpan={2} className="border border-black p-1">ปริมาณ</td>
                            <td colSpan={2} className="border border-black p-1">ราคา</td>
                            <td rowSpan={2} className="border border-black p-1 w-20">หมายเหตุ</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 w-16">จำนวน</td>
                            <td className="border border-black p-1 w-16">หน่วย</td>
                            <td className="border border-black p-1 w-24">ต่อหน่วย</td>
                            <td className="border border-black p-1 w-24">เป็นเงิน</td>
                        </tr>
                    </thead>
                    <tbody>
                        {tableItems.map((item, index) => (
                             <tr key={item.id}>
                                <td className="border border-black p-1 h-8">{item.quantity > 0 ? index + 1 : ''}</td>
                                <td className="border border-black p-1 text-left">{item.description}</td>
                                <td className="border border-black p-1">{item.quantity > 0 ? item.quantity : ''}</td>
                                <td className="border border-black p-1">{item.unit}</td>
                                <td className="border border-black p-1 text-right">{item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ''}</td>
                                <td className="border border-black p-1 text-right">{item.quantity * item.unitPrice > 0 ? (item.quantity * item.unitPrice).toFixed(2) : ''}</td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr><td colSpan={4} className="border border-black p-1 text-left font-bold">(ส่วนลด 0.00 บาท จาก {totalPrice.toFixed(2)} บาท เหลือ {totalPrice.toFixed(2)} บาท) รวม</td><td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td><td className="border border-black p-1"></td></tr>
                        <tr><td colSpan={4} className="border border-black p-1 font-bold">มูลค่าสินค้าก่อนคิด VAT</td><td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td><td className="border border-black p-1"></td></tr>
                        <tr><td colSpan={4} className="border border-black p-1 font-bold">ภาษีมูลค่าเพิ่ม 0 %</td><td colSpan={2} className="border border-black p-1 text-right font-bold">0.00</td><td className="border border-black p-1"></td></tr>
                        <tr><td colSpan={4} className="border border-black p-1 font-bold">รวมทั้งสิ้น</td><td colSpan={2} className="border border-black p-1 text-right font-bold">{totalPrice.toFixed(2)}</td><td className="border border-black p-1"></td></tr>
                    </tfoot>
                </table>

                <div className="mt-4 text-base leading-relaxed text-justify space-y-2">
                    <p>3. คำเสนอนี้จะยืนอยู่เป็นระยะ 30 วันนับแต่วันที่ได้ยื่นใบเสนอราคา</p>
                    <p>4. กำหนดส่งมอบพัสดุตามรายการข้างต้น ภายใน 3 วันนับถัดจากวันลงนามซื้อ</p>
                    <p>เสนอมา ณ วันที่ {formatThaiDate(record.docDate)}</p>
                </div>

                <div className="mt-16 grid grid-cols-2 gap-8 text-base text-center">
                    <div>
                        <p>ลงชื่อ...................................................</p>
                        <p className="mt-2">(นายกัญญารัตน์ อำนวย)</p>
                        <p>หัวหน้าเจ้าหน้าที่พัสดุโรงเรียน</p>
                    </div>
                    <div>
                        <p>ลงชื่อ...................................................</p>
                        <p className="mt-2">(...................................................)</p>
                        <p>ตำแหน่ง...................................................</p>
                        <p>ประทับตราประจำห้าง/ร้าน/บริษัท</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HiringApprovalForm = ProcurementMemo;

export default SupplyPage;