
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
}> = ({ records, onEdit, onDelete, onPrint, settings }) => {
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

    const documentOptions = useMemo(() => {
        if (!onPrint) return []; // Should be printModalRecord, but that's local state. Let's assume onPrint is passed to a child with the record.

        // This is a simplified version for the main component. The logic will be in the modal itself.
        // Let's assume the user wants the dynamic name based on the record being printed.
        const getOptionsForRecord = (record: ProcurementRecord | null) => {
            if (!record) return [];

            const isHire = ['จ้างเหมาบริการ', 'ที่ดิน/สิ่งก่อสร้าง', 'ก่อสร้าง', 'เช่า'].includes(record.procurementType || '');
            
            const options = [
                { type: 'report', label: '1. บันทึกข้อความ (รายงานขอซื้อ)' },
                isHire 
                    ? { type: 'approval', label: '2. ใบขออนุมัติจัดจ้าง' }
                    : { type: 'approval', label: '2. บันทึกข้อความ (ขออนุมัติจัดซื้อ)' },
                { type: 'details', label: '3. รายละเอียดพัสดุ (แนบท้าย)' },
                { type: 'payment', label: '4. บันทึกข้อความ (ขออนุมัติจ่ายเงิน)' },
                { type: 'disbursement', label: '5. ใบเบิกพัสดุ' },
                { type: 'receipt', label: '6. ใบตรวจรับพัสดุ' },
                { type: 'po', label: '7. ใบสั่งซื้อ/จ้าง' },
                { type: 'quotation', label: '8. ใบเสนอราคา' },
            ];
            
            return options;
        };
        
        return getOptionsForRecord; // Return a function to be used dynamically
    }, [onPrint]);

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

const MaterialDashboard: React.FC<{ categories: MaterialCategory[] }> = ({ categories }) => {
    const chartData = useMemo(() => {
        return categories.map(c => ({
            name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
            value: (c.subCategories?.length || 0) + 1, 
            life: c.usefulLife
        })).sort((a,b) => b.value - a.value).slice(0, 10);
    }, [categories]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">หมวดหมู่หลัก</p>
                        <h3 className="text-3xl font-black text-navy">{categories.length}</h3>
                    </div>
                    <div className="text-3xl opacity-20">📂</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">รายการย่อยทั้งหมด</p>
                        <h3 className="text-3xl font-black text-green-600">
                            {categories.reduce((acc, c) => acc + (c.subCategories?.length || 0), 0)}
                        </h3>
                    </div>
                    <div className="text-3xl opacity-20">📑</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">อายุใช้งานเฉลี่ย</p>
                        <h3 className="text-3xl font-black text-purple-600">
                            {Math.round(categories.reduce((acc, c) => acc + c.usefulLife, 0) / (categories.length || 1))} <span className="text-sm font-normal text-gray-400">ปี</span>
                        </h3>
                    </div>
                    <div className="text-3xl opacity-20">⏳</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-navy mb-4">สัดส่วนจำนวนรายการในแต่ละหมวด</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-navy mb-4">อายุการใช้งานตามมาตรฐาน (ปี)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} />
                                <Tooltip />
                                <Bar dataKey="life" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GenericCrudPage: React.FC<{
    title: string, 
    itemLabel: string, 
    placeholder: string, 
    items: string[],
    onUpdate: (newItems: string[]) => void
}> = ({ title, itemLabel, placeholder, items, onUpdate }) => {
    const [newItemName, setNewItemName] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItemName.trim() && !items.includes(newItemName.trim())) {
            onUpdate([...items, newItemName.trim()]);
            setNewItemName('');
        }
    };

    const handleDelete = (index: number) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
            const newItems = items.filter((_, i) => i !== index);
            onUpdate(newItems);
        }
    };
    
    const handleSaveEdit = (index: number) => {
        if (editingName.trim()) {
            const newItems = [...items];
            newItems[index] = editingName.trim();
            onUpdate(newItems);
            setEditingIndex(null);
            setEditingName('');
        }
    };

    return (
         <div className="animate-fade-in space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-navy mb-4">{title}</h2>
                <div className="bg-green-600 text-white p-4 -mx-6 -mt-2 mb-6">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        เพิ่มรายการ{itemLabel}
                    </h3>
                </div>
                <form onSubmit={handleAdd} className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={placeholder}
                            className="flex-grow border-gray-300 rounded-md shadow-sm w-full"
                        />
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-md font-bold whitespace-nowrap">เพิ่ม</button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                 <div className="bg-blue-600 text-white p-4 -mx-6 -mt-2 mb-6">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        รายการ{itemLabel}ทั้งหมด ({items.length})
                    </h3>
                </div>
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 gap-2">
                            {editingIndex === index ? (
                                <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="flex-grow border-gray-300 rounded w-full sm:w-auto mb-2 sm:mb-0" autoFocus />
                            ) : (
                                <span className="font-medium text-gray-700 w-full sm:w-auto break-all">{item}</span>
                            )}
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                {editingIndex === index ? (
                                    <>
                                        <button onClick={() => handleSaveEdit(index)} className="bg-green-500 text-white px-3 py-1 rounded text-xs whitespace-nowrap">บันทึก</button>
                                        <button onClick={() => setEditingIndex(null)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs whitespace-nowrap">ยกเลิก</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setEditingIndex(index); setEditingName(item); }} className="bg-amber-100 text-amber-700 px-3 py-1 rounded text-xs whitespace-nowrap">แก้ไข</button>
                                        <button onClick={() => handleDelete(index)} className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs whitespace-nowrap">ลบ</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-center text-gray-400 py-4">ยังไม่มีข้อมูล</p>}
                </div>
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
        let filenamePart = `เอกสารจัดซื้อจัดจ้าง`;
    
        const fileMappings: Record<string, string> = {
            'report': 'บันทึกข้อความ (รายงานขอซื้อ)',
            'details': 'รายละเอียดพัสดุ (แนบท้าย)',
            'payment': 'บันทึกข้อความ (ขออนุมัติจ่ายเงิน)',
            'disbursement': 'ใบเบิกพัสดุ',
            'receipt': 'ใบตรวจรับพัสดุ',
            'po': 'ใบสั่งซื้อ-จ้าง',
            'quotation': 'ใบเสนอราคา',
        };
    
        if (type === 'approval') {
            const isHire = ['จ้างเหมาบริการ', 'ที่ดิน/สิ่งก่อสร้าง', 'ก่อสร้าง', 'เช่า'].includes(record.procurementType || '');
            filenamePart = isHire ? 'ใบขออนุมัติจัดจ้าง' : 'บันทึกข้อความ (ขออนุมัติจัดซื้อ)';
        } else if (fileMappings[type]) {
            filenamePart = fileMappings[type];
        }
    
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
                case 'approval': return <ApprovalMemo {...props} />;
                case 'details': return <ProcurementDetailsMemo {...props} />;
                case 'payment': return <PaymentMemo {...props} />;
                case 'disbursement': return <DisbursementForm {...props} />;
                case 'receipt': return <ReceiptForm {...props} />;
                case 'po': return <PurchaseOrder {...props} />;
                case 'quotation': return <QuotationForm {...props} />;
                default: return <div className="p-10 text-center">Form not found</div>;
            }
        }

        switch (activeSubPage) {
            case 'report_dashboard':
                return <MaterialDashboard categories={materialCategories} />;
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
                        />
                        {printModalRecord && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md transform scale-100 transition-transform">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                        <h3 className="text-lg font-bold text-navy">เลือกพิมพ์เอกสาร : <span className="text-blue-600">{printModalRecord.docNumber}</span></h3>
                                        <button onClick={() => setPrintModalRecord(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
                                    </div>
                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                                        {(
                                            () => {
                                                const isHire = ['จ้างเหมาบริการ', 'ที่ดิน/สิ่งก่อสร้าง', 'ก่อสร้าง', 'เช่า'].includes(printModalRecord.procurementType || '');
                                                return [
                                                    { type: 'report', label: '1. บันทึกข้อความ (รายงานขอซื้อ)' },
                                                    { type: 'approval', label: isHire ? '9. ใบขออนุมัติจัดจ้าง' : '2. บันทึกข้อความ (ขออนุมัติจัดซื้อ)' },
                                                    { type: 'details', label: '3. รายละเอียดพัสดุ (แนบท้าย)' },
                                                    { type: 'payment', label: '4. บันทึกข้อความ (ขออนุมัติจ่ายเงิน)' },
                                                    { type: 'disbursement', label: '5. ใบเบิกพัสดุ' },
                                                    { type: 'receipt', label: '6. ใบตรวจรับพัสดุ' },
                                                    { type: 'po', label: '7. ใบสั่งซื้อ/จ้าง' },
                                                    { type: 'quotation', label: '8. ใบเสนอราคา' },
                                                ].sort((a,b) => parseInt(a.label) - parseInt(b.label));
                                            }
                                        )().map(doc => (
                                            <button 
                                                key={doc.type + doc.label}
                                                onClick={() => { setViewingMemo({ type: doc.type, record: printModalRecord }); setPrintModalRecord(null); }}
                                                className="w-full text-left p-3.5 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all border border-gray-100 text-sm font-bold flex items-center gap-3 group"
                                            >
                                                <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-500">📄</span>
                                                {doc.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setPrintModalRecord(null)} className="mt-6 w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors">ปิดหน้าต่าง</button>
                                </div>
                            </div>
                        )}
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
          { id: 'report_dashboard', label: 'Dashboard พัสดุ' },
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
        </div>
    );
};

// ... [Existing Memo Components: ProcurementMemo, ApprovalMemo, etc. go here unchanged] ...
// Dummy definitions to allow compilation if copied directly (In real project, these are the full components)
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
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/984268e97bdba24a5271a040112e2aef.jpg';
    const totalPrice = (record.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg text-blue-600">📄</span>
                    แสดงตัวอย่าง: บันทึกข้อความ
                </h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        พิมพ์
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl mx-auto print-area-memo" style={{ width: '100%', minHeight: '297mm', padding: '2cm 2cm', boxSizing: 'border-box' }}>
                <div className="text-center mb-6">
                    <img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-16 h-auto mx-auto mb-4" />
                    <h2 className="font-bold text-2xl">บันทึกข้อความ</h2>
                </div>
                <div className="text-base leading-loose">
                    <div className="flex flex-wrap"><span className="font-bold w-24">ส่วนราชการ</span> <span>{settings.schoolName}</span></div>
                    <div className="flex flex-wrap"><span className="font-bold w-24">ที่</span> <span className="flex-grow border-b border-dotted border-black px-2">..................................................</span> <span className="font-bold w-12 text-right pr-2">วันที่</span> <span className="border-b border-dotted border-black px-2">{formatThaiDate(record.docDate)}</span></div>
                    <div className="flex flex-wrap"><span className="font-bold w-24">เรื่อง</span> <span>{record.subject}</span></div>
                    <div className="my-4 border-b border-black"></div>
                    <div><span className="font-bold">เรียน</span> ผู้อำนวยการ{settings.schoolName}</div>
                    
                    <p className="indent-8 mt-4 text-justify leading-relaxed">
                        ด้วย {record.department} มีความประสงค์จะดำเนินการ{record.procurementType} โดยวิธี{record.procurementMethod} 
                        เพื่อใช้ใน{record.reason} จำนวน {record.items.length} รายการ 
                        รวมเป็นเงินทั้งสิ้น {totalPrice.toLocaleString()} บาท ({toThaiWords(totalPrice)}) ดังรายละเอียดแนบท้ายนี้
                    </p>
                    <p className="indent-8 mt-2">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>
                </div>

                <div className="mt-12 flex justify-end px-4">
                    <div className="text-center w-64">
                        <p>(ลงชื่อ).......................................................</p>
                        <p className="mt-2">({record.requesterName})</p>
                        <p>เจ้าหน้าที่/ผู้รายงาน</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ApprovalMemo = ProcurementMemo; 
const ProcurementDetailsMemo = ProcurementMemo; 
const PaymentMemo = ProcurementMemo; 
const DisbursementForm = ProcurementMemo; 
const ReceiptForm = ProcurementMemo; 
const PurchaseOrder = ProcurementMemo; 
const QuotationForm = ProcurementMemo; 

export default SupplyPage;
