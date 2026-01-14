// This is a new component for the entire procurement module.
// It was not present in the original file list but is required by App.tsx.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Personnel, Settings, ProcurementRecord, ProcurementItem, MaterialCategory } from '../types';
// FIX: import toThaiNumerals from utils to resolve reference errors
import { getCurrentThaiDate, formatThaiDate, toThaiWords, buddhistToISO, isoToBuddhist, toThaiNumerals } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DEFAULT_MATERIAL_CATEGORIES } from '../constants';
import { DEFAULT_FORM_TEMPLATES } from './procurement/DefaultFormTemplates';

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
    | 'settings_budget'
    | 'manage_forms';

// --- Extracted Components ---

const CreateRequestForm: React.FC<{
    currentUser: Personnel;
    personnel: Personnel[];
    settings: Settings;
    editingRecord: ProcurementRecord | null;
    onSave: (record: ProcurementRecord) => Promise<boolean | void>;
    onCancel: () => void;
    isSaving: boolean;
}> = ({ currentUser, personnel, settings, editingRecord, onSave, onCancel, isSaving }) => {
    // Form Data State
    const [formData, setFormData] = useState<Partial<ProcurementRecord>>({
        reason: 'เพื่อความคล่องตัวในการดำเนินงานตามโครงการจะได้มีประสิทธิภาพ',
        docNumber: `ที่ ศธ ๐๔๐๐๗.๐๖/`,
        requesterName: `${currentUser.personnelTitle}${currentUser.personnelName}`, 
        subject: 'รายงานขอซื้อ/จ้างพัสดุ',
        docDate: getCurrentThaiDate(),
        department: settings.departments?.[0] || '',
        departmentHeadName: '',
        project: settings.budgetSources?.[0] || '',
        supplierName: '',
        managerName: settings.directorName || 'ผู้อำนวยการโรงเรียน',
        procurementType: (settings.supplyTypes && settings.supplyTypes.length > 0) ? settings.supplyTypes[0] : 'วัสดุ',
        procurementMethod: (settings.procurementMethods && settings.procurementMethods.length > 0) ? settings.procurementMethods[0] : 'เฉพาะเจาะจง',
        neededDate: getCurrentThaiDate(),
        approvedBudget: 0,
        status: 'pending',
        receiptControlNumber: '',
        receiptNumber: '',
        purchaseOrderNumber: '',
        procurementCategory: settings.procurementCategories?.[0] || '',
        currency: 'บาท',
    });

    // Items Table State
    const [items, setItems] = useState<ProcurementItem[]>([
        { id: 1, type: '', description: '', quantity: 1, unit: '', unitPrice: 0, location: '' },
    ]);
    
    const departmentHeads = useMemo(() => personnel, [personnel]);
    const directorsAndDeputies = useMemo(() => personnel.filter(p => p.specialRank === 'director' || p.specialRank === 'deputy'), [personnel]);

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

    const handleItemTypeChange = (id: number, level: 'main' | 'sub', value: string) => {
        setItems(items.map(item => {
            if (item.id === id) {
                if (level === 'main') {
                    // When main category changes, reset sub category
                    return { ...item, type: value };
                } else { // level === 'sub'
                    const mainCategory = item.type.split(' > ')[0];
                    // If a sub-category is selected, form the full type string
                    // If 'select' option for sub is chosen (value is empty), revert to just main category
                    const newType = value ? `${mainCategory} > ${value}` : mainCategory;
                    return { ...item, type: newType };
                }
            }
            return item;
        }));
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), type: '', description: '', quantity: 1, unit: '', unitPrice: 0, location: '' }]);
    };
    
    const handleRemoveItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleClearItems = () => {
        if (window.confirm('คุณต้องการล้างรายการพัสดุทั้งหมดหรือไม่?')) {
            setItems([{ id: Date.now(), type: '', description: '', quantity: 1, unit: '', unitPrice: 0, location: '' }]);
        }
    };

    const handleImportItems = () => {
        alert('ฟังก์ชันนำเข้ารายการยังไม่พร้อมใช้งาน');
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
                    {/* Section 1: Document Info */}
                    <fieldset className="border p-4 rounded-lg space-y-4">
                        <legend className="font-bold px-2 text-gray-600">ข้อมูลเอกสาร</legend>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                            <div>
                                <label className="font-bold block mb-1">ที่ (เลขที่เอกสาร):</label>
                                <input type="text" name="docNumber" value={formData.docNumber} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" placeholder="เช่น ที่ ศธ ๐๔๐๐๗.๐๖/..." />
                            </div>
                             <div>
                                <label className="font-bold block mb-1">วันที่:</label>
                                <input type="date" name="docDate" value={buddhistToISO(formData.docDate)} onChange={handleDateChange} className="w-full border-gray-300 rounded-lg shadow-sm" />
                                <p className="text-xs text-gray-500 mt-1">ควรกำหนดก่อนวันรับของอย่างน้อย 3 วัน</p>
                            </div>
                            <div>
                                <label className="font-bold block mb-1">เรื่อง:</label>
                                <select name="subject" value={formData.subject} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                    <option value="รายงานขอซื้อ/จ้างพัสดุ">รายงานขอซื้อ/จ้างพัสดุ</option>
                                    <option value="ขออนุมัติจัดซื้อ">ขออนุมัติจัดซื้อ</option>
                                    <option value="ขออนุมัติจัดจ้าง">ขออนุมัติจัดจ้าง</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-bold block mb-1">เรียน (ถึง):</label>
                                <select name="managerName" value={formData.managerName} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                    <option value="">-- เลือก --</option>
                                    {directorsAndDeputies.map(p => <option key={p.id} value={`${p.personnelTitle}${p.personnelName}`}>{p.personnelTitle}{p.personnelName}</option>)}
                                </select>
                            </div>
                        </div>
                    </fieldset>
                    
                    {/* Section 2: Requester Info */}
                    <fieldset className="border p-4 rounded-lg space-y-4">
                        <legend className="font-bold px-2 text-gray-600">ข้อมูลผู้ขอ</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                            <div>
                                <label className="font-bold block mb-1">ผู้ขอเบิก:</label>
                                <input type="text" name="requesterName" value={formData.requesterName} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm bg-gray-100" readOnly />
                            </div>
                            <div>
                                <label className="font-bold block mb-1">กลุ่มสาระ/หน่วยงาน:</label>
                                <select name="department" value={formData.department} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                    <option value="">-- เลือก --</option>
                                    {(settings.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">หากต้องการเพิ่มกลุ่มสาระ กรุณาติดต่อ Admin</p>
                            </div>
                            <div>
                                <label className="font-bold block mb-1">ชื่อหัวหน้ากลุ่มสาระ/งาน:</label>
                                <select name="departmentHeadName" value={formData.departmentHeadName} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                    <option value="">-- เลือก --</option>
                                    {departmentHeads.map(p => <option key={p.id} value={`${p.personnelTitle}${p.personnelName}`}>{p.personnelTitle}{p.personnelName}</option>)}
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    {/* Section: Procurement Details */}
                    <fieldset className="border p-4 rounded-lg space-y-4">
                        <legend className="font-bold px-2 text-gray-600">รายละเอียดการจัดซื้อ/จ้าง</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="font-bold block mb-1">มีความประสงค์จัดซื้อ/จ้าง:</label>
                                <select name="procurementCategory" value={formData.procurementCategory} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                    <option value="">-- เลือก --</option>
                                    {(settings.procurementCategories || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-bold block mb-1">โดยใช้เงิน:</label>
                                <select name="project" value={formData.project} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm">
                                    <option value="">-- เลือก --</option>
                                    {(settings.budgetSources || []).map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">หากต้องการเพิ่มตัวเลือก กรุณาติดต่อ Admin</p>
                            </div>
                            <div>
                                <label className="font-bold block mb-1">ซื้อด้วยสกุลเงิน:</label>
                                <input type="text" name="currency" value={formData.currency} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" />
                            </div>
                        </div>
                    </fieldset>

                    {/* Section 3: Financial Info */}
                    <fieldset className="border p-4 rounded-lg space-y-4">
                        <legend className="font-bold px-2 text-gray-600">ข้อมูลทางการเงิน (ถ้ามี)</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="font-bold block mb-1">เลขคุมทะเบียนใบเสร็จ:</label>
                                <input type="text" name="receiptControlNumber" value={formData.receiptControlNumber} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" />
                                <p className="text-xs text-gray-500 mt-1">มีผลกับการหักงบประมาณ</p>
                            </div>
                             <div>
                                <label className="font-bold block mb-1">เลขที่ใบเสร็จ:</label>
                                <input type="text" name="receiptNumber" value={formData.receiptNumber} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" />
                            </div>
                             <div>
                                <label className="font-bold block mb-1">เลขที่ใบสั่งซื้อ:</label>
                                <input type="text" name="purchaseOrderNumber" value={formData.purchaseOrderNumber} onChange={handleFormChange} className="w-full border-gray-300 rounded-lg shadow-sm" />
                            </div>
                        </div>
                    </fieldset>

                    {/* Items Table */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-navy">รายการพัสดุ</h3>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-300">
                            <table className="min-w-full bg-white text-xs">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 w-10 text-center">ลำดับที่</th>
                                        <th className="p-2 min-w-[200px]">ประเภท</th>
                                        <th className="p-2 min-w-[250px]">รายการ พัสดุ / ซื้อ / จ้าง (ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</th>
                                        <th className="p-2 w-16">จำนวน</th>
                                        <th className="p-2 w-16">หน่วย</th>
                                        <th className="p-2 w-24 text-right">ราคา/หน่วย</th>
                                        <th className="p-2 w-24 text-right">เป็นเงิน</th>
                                        <th className="p-2 min-w-[120px]">สถานที่ใช้งาน</th>
                                        <th className="p-2 w-10 text-center">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => {
                                        const [mainCatName, subCatName] = item.type.split(' > ');
                                        const subCategories = settings.materialCategories?.find(c => c.name === mainCatName)?.subCategories || [];

                                        return (
                                            <tr key={item.id} className="border-b last:border-0">
                                                <td className="p-2 text-center">{index + 1}</td>
                                                <td className="p-1 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        <select
                                                            value={mainCatName || ''}
                                                            onChange={(e) => handleItemTypeChange(item.id, 'main', e.target.value)}
                                                            className="w-full border-gray-300 rounded px-2 py-1 text-xs"
                                                        >
                                                            <option value="">-- เลือกประเภท --</option>
                                                            {(settings.materialCategories || []).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                                        </select>
                                                        <select
                                                            value={subCatName || ''}
                                                            onChange={(e) => handleItemTypeChange(item.id, 'sub', e.target.value)}
                                                            className="w-full border-gray-300 rounded px-2 py-1 text-xs"
                                                            disabled={subCategories.length === 0}
                                                        >
                                                            <option value="">-- เลือกชนิด --</option>
                                                            {subCategories.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="p-2 align-top"><input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                                <td className="p-2 align-top"><input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="w-full border-gray-300 rounded text-center px-1 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                                <td className="p-2 align-top"><input type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                                <td className="p-2 align-top"><input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', Number(e.target.value))} className="w-full border-gray-300 rounded text-right px-2 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                                <td className="p-2 align-top"><input type="text" readOnly value={((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()} className="w-full border-transparent bg-transparent text-right px-2 py-1 font-bold text-gray-700"/></td>
                                                <td className="p-2 align-top"><input type="text" value={item.location} onChange={e => handleItemChange(item.id, 'location', e.target.value)} className="w-full border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"/></td>
                                                <td className="p-2 align-top text-center"><button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 font-bold">×</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold">
                                    <tr>
                                        <td colSpan={6} className="p-3 text-right text-gray-600">รวมเป็นเงินทั้งสิ้น:</td>
                                        <td colSpan={3} className="p-3 text-right text-blue-700 text-sm">{total.toLocaleString()} บาท</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-6 border-t">
                        <div className="flex gap-2">
                            <button type="button" onClick={handleAddItem} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 text-xs shadow-sm">+ เพิ่มรายการ</button>
                            <button type="button" onClick={handleImportItems} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600 text-xs shadow-sm">นำเข้ารายการ</button>
                            <button type="button" onClick={handleClearItems} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 text-xs shadow-sm">ล้างข้อมูล</button>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300">ยกเลิก</button>
                            <button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-green-500/30 font-bold disabled:opacity-50 transition-all transform active:scale-95">
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                            </button>
                        </div>
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
                                            {(currentUser.role === 'admin' || currentUser.isSarabanAdmin === true) && (
                                                <button 
                                                    onClick={() => { if(window.confirm('ลบรายการนี้?')) onDelete([item.id]); }} 
                                                    className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors shadow-sm" title="ลบ"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
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

// FIX: Define FormTemplateEditor component to resolve 'Cannot find name' error.
interface FormTemplateEditorProps {
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
    isSaving: boolean;
}

const FormTemplateEditor: React.FC<FormTemplateEditorProps> = ({ settings, onSaveSettings, isSaving }) => {
    const templateOptions = [
        { key: 'procurement_report', label: 'บันทึกข้อความ (รายงานขอซื้อ-จ้าง)' },
        { key: 'approval_memo', label: 'บันทึกข้อความ (ขออนุมัติจัดซื้อ-จ้าง)' },
        { key: 'details_memo', label: 'รายละเอียดพัสดุ (แนบท้าย)' },
        { key: 'payment_memo', label: 'บันทึกข้อความ (ขออนุมัติจ่ายเงิน)' },
        { key: 'disbursement_form', label: 'ใบเบิกพัสดุ' },
        { key: 'receipt_form', label: 'ใบตรวจรับพัสดุ' },
        { key: 'po_form', label: 'ใบสั่งซื้อ-จ้าง' },
        { key: 'quotation_form', label: 'ใบเสนอราคา' },
        { key: 'hiring_form', label: 'ใบขออนุมัติจัดจ้าง' },
    ];

    const allVariables = [
        'schoolName', 'docDate', 'subject', 'managerName', 'department', 'totalPriceWords', 
        'totalPrice', 'requesterName', 'approvedDate', 'items_table_rows', 'docNumber',
        'project', 'reason', 'supplierName', 'neededDate', 'procurementStaffName', 
        'procurementHeadName', 'financeHeadName', 'financeStaffName', 'policyHeadName', 
        'committeeChairmanName', 'committeeMember1Name', 'committeeMember2Name', 'directorName'
    ];
    
    const [localSettings, setLocalSettings] = useState(settings);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState(templateOptions[0].key);
    const [templateContent, setTemplateContent] = useState('');

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);
    
    // FIX: This effect now only runs when the user selects a new template from the dropdown.
    // It no longer depends on `settings` or `localSettings`, which prevents background data fetches from
    // overwriting the user's unsaved changes in the textarea.
    useEffect(() => {
        setTemplateContent(settings.formTemplates?.[selectedTemplateKey] || DEFAULT_FORM_TEMPLATES[selectedTemplateKey] || '');
    }, [selectedTemplateKey, settings.formTemplates]);

    const handlePersonnelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const newTemplates = {
            ...(localSettings.formTemplates || {}),
            [selectedTemplateKey]: templateContent
        };
        onSaveSettings({ ...localSettings, formTemplates: newTemplates });
        alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    };
    
    const restoreDefault = () => {
        if(window.confirm('ต้องการคืนค่าแบบฟอร์มนี้เป็นค่าเริ่มต้นหรือไม่?')) {
            setTemplateContent(DEFAULT_FORM_TEMPLATES[selectedTemplateKey] || '');
        }
    };

    const PersonnelInput: React.FC<{ name: keyof Settings, label: string }> = ({ name, label }) => (
         <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
            <input 
                type="text"
                name={name}
                value={localSettings[name] as string || ''}
                onChange={handlePersonnelChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
            />
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow animate-fade-in space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-navy">ตั้งค่าเอกสารและผู้รับผิดชอบ</h2>
                <p className="text-sm text-gray-500 mt-1">จัดการรายชื่อผู้ลงนามและแก้ไขแบบฟอร์มเอกสารสำหรับพิมพ์</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">จัดการรายชื่อผู้รับผิดชอบ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <PersonnelInput name="directorName" label="ผู้อำนวยการ" />
                    <PersonnelInput name="financeHeadName" label="รองฯ ฝ่ายงบประมาณ" />
                    <PersonnelInput name="policyHeadName" label="หัวหน้างานนโยบายและแผน" />
                    <PersonnelInput name="procurementHeadName" label="หัวหน้าเจ้าหน้าที่พัสดุ" />
                    <PersonnelInput name="procurementStaffName" label="เจ้าหน้าที่พัสดุ" />
                    <PersonnelInput name="financeStaffName" label="เจ้าหน้าที่การเงิน" />
                    <PersonnelInput name="committeeChairmanName" label="ประธานกรรมการตรวจรับ" />
                    <PersonnelInput name="committeeMember1Name" label="กรรมการตรวจรับ 1" />
                    <PersonnelInput name="committeeMember2Name" label="กรรมการตรวจรับ 2" />
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">แก้ไขแบบฟอร์มเอกสาร (HTML)</h3>
                <p className="text-xs text-gray-500 mb-4">
                    คุณสามารถแก้ไขโครงสร้าง HTML ของเอกสารที่จะพิมพ์ได้ที่นี่ ใช้ตัวแปรในรูปแบบ <code>{"{{variable_name}}"}</code> เพื่อแทรกข้อมูล.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-grow">
                        <label className="block text-sm font-bold text-gray-700 mb-2">เลือกแบบฟอร์ม:</label>
                        <select 
                            value={selectedTemplateKey} 
                            onChange={e => setSelectedTemplateKey(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 bg-white"
                        >
                            {templateOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="self-end">
                        <button onClick={restoreDefault} className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-200">
                            คืนค่าเริ่มต้น
                        </button>
                    </div>
                </div>

                <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs font-bold text-blue-700 mb-2">ตัวแปรที่ใช้ได้:</p>
                    <div className="flex flex-wrap gap-2">
                        {allVariables.map(v => (
                            <code key={v} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{`{{${v}}}`}</code>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">โค้ด HTML:</label>
                    <textarea
                        value={templateContent}
                        onChange={e => setTemplateContent(e.target.value)}
                        className="w-full h-96 border rounded-lg p-3 font-mono text-xs bg-gray-900 text-green-400"
                        placeholder="โค้ด HTML ของแบบฟอร์ม..."
                    />
                </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-200">
                <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 text-lg shadow-lg">
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}
                </button>
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

    const canManageSettings = currentUser.role === 'admin' || currentUser.isSarabanAdmin === true;

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
        const settingsPages: SubPage[] = [
            'manage_materials', 'manage_departments', 'manage_funds', 
            'manage_supply_types', 'manage_methods', 'manage_forms'
        ];

        if (settingsPages.includes(activeSubPage) && !canManageSettings) {
            return (
                <div className="p-10 text-center text-red-500 font-bold bg-white rounded-2xl shadow-md h-full flex flex-col justify-center items-center">
                    <p className="text-4xl mb-4">🚫</p>
                    <p className="text-xl">ขออภัย, คุณไม่มีสิทธิ์เข้าถึงส่วนการตั้งค่านี้</p>
                    <p className="text-sm text-gray-500 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
                </div>
            );
        }
        
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
                            personnel={personnel}
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
            case 'manage_forms':
                return <FormTemplateEditor settings={settings} onSaveSettings={onSaveSettings} isSaving={isSaving} />;
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
      ...(canManageSettings ? [{
          key: 'data', label: 'ตั้งค่าข้อมูลพื้นฐาน', items: [
              { id: 'manage_materials', label: 'มาตรฐานบัญชีวัสดุ (Tree)' },
              { id: 'manage_departments', label: 'หน่วยงาน/กลุ่มสาระ' },
              { id: 'manage_funds', label: 'แหล่งเงิน/โครงการ' },
              { id: 'manage_supply_types', label: 'ประเภทพัสดุ (Type)' },
              { id: 'manage_methods', label: 'วิธีจัดหา (Method)' },
              { id: 'manage_forms', label: 'แก้ไขแบบฟอร์มเอกสาร' },
          ]
      }] : []),
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

const populateTemplate = (templateKey: string, record: ProcurementRecord, settings: Settings) => {
    let template = settings.formTemplates?.[templateKey] || DEFAULT_FORM_TEMPLATES[templateKey];
    if (!template) return `<div>Template "${templateKey}" not found.</div>`;

    const totalPrice = (record.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    const tableItems = [...(record.items || [])];
    while (tableItems.length < 5) {
        tableItems.push({ id: `empty-${tableItems.length}`, description: '', quantity: 0, unit: '', unitPrice: 0 } as any);
    }
    const tableRowsHtml = tableItems.map((item, index) => `
        <tr>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${item.quantity > 0 ? toThaiNumerals(index + 1) : ''}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: left;">${item.description}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${item.quantity > 0 ? toThaiNumerals(item.quantity) : ''}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${item.unit}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: right;">${item.unitPrice > 0 ? toThaiNumerals(item.unitPrice.toFixed(2)) : ''}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: right;">${item.quantity * item.unitPrice > 0 ? toThaiNumerals((item.quantity * item.unitPrice).toFixed(2)) : ''}</td>
            <td style="border: 1px solid black; padding: 4px;"></td>
        </tr>
    `).join('');

    return template
        .replace(/{{schoolName}}/g, settings.schoolName || '')
        .replace(/{{docDate}}/g, formatThaiDate(record.docDate))
        .replace(/{{subject}}/g, record.subject || '')
        .replace(/{{managerName}}/g, record.managerName || `ผู้อำนวยการ${settings.schoolName}`)
        .replace(/{{department}}/g, record.department || '')
        .replace(/{{totalPriceWords}}/g, toThaiWords(totalPrice))
        .replace(/{{totalPrice}}/g, toThaiNumerals(totalPrice.toFixed(2)))
        .replace(/{{requesterName}}/g, record.requesterName || '')
        .replace(/{{approvedDate}}/g, record.approvedDate ? formatThaiDate(record.approvedDate) : '........................................................')
        .replace(/{{items_table_rows}}/g, tableRowsHtml)
        .replace(/{{docNumber}}/g, record.docNumber || '.........................')
        .replace(/{{project}}/g, record.project || '')
        .replace(/{{reason}}/g, record.reason || '')
        .replace(/{{supplierName}}/g, record.supplierName || '')
        .replace(/{{neededDate}}/g, record.neededDate ? formatThaiDate(record.neededDate) : '')
        .replace(/{{procurementStaffName}}/g, settings.procurementStaffName || '')
        .replace(/{{procurementHeadName}}/g, settings.procurementHeadName || '')
        .replace(/{{financeHeadName}}/g, settings.financeHeadName || '')
        .replace(/{{financeStaffName}}/g, settings.financeStaffName || '')
        .replace(/{{policyHeadName}}/g, settings.policyHeadName || '')
        .replace(/{{committeeChairmanName}}/g, settings.committeeChairmanName || '')
        .replace(/{{committeeMember1Name}}/g, settings.committeeMember1Name || '')
        .replace(/{{committeeMember2Name}}/g, settings.committeeMember2Name || '')
        .replace(/{{directorName}}/g, settings.directorName || '');
};

const MemoComponent: React.FC<ProcurementMemoProps & { templateKey: string, title: string }> = ({ record, settings, onBack, onPrint, type, templateKey, title }) => {
    const populatedHtml = useMemo(() => populateTemplate(templateKey, record, settings), [record, settings, templateKey]);

    return (
        <div className="font-sarabun text-black w-full max-w-[210mm] mx-auto">
            <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center no-print">
                <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg text-blue-600">📄</span>
                    แสดงตัวอย่าง: {title}
                </h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">ย้อนกลับ</button>
                    <button onClick={() => onPrint(type, record)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        พิมพ์
                    </button>
                </div>
            </div>
             <div 
                className="bg-white shadow-2xl mx-auto print-area-memo"
                style={{ width: '210mm', minHeight: '297mm', padding: '0', boxSizing: 'border-box' }}
                dangerouslySetInnerHTML={{ __html: populatedHtml }}
             />
        </div>
    );
};

const ProcurementMemo: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="procurement_report" title="บันทึกข้อความ (รายงานขอซื้อ/จ้าง)" />;
const ApprovalMemo: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="approval_memo" title="บันทึกข้อความ (ขออนุมัติจัดซื้อ/จ้าง)" />;
const ProcurementDetailsMemo: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="details_memo" title="รายละเอียดพัสดุ (แนบท้าย)" />;
const PaymentMemo: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="payment_memo" title="บันทึกข้อความ (ขออนุมัติจ่ายเงิน)" />;
const DisbursementForm: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="disbursement_form" title="ใบเบิกพัสดุ" />;
const ReceiptForm: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="receipt_form" title="ใบตรวจรับพัสดุ" />;
const PurchaseOrder: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="po_form" title="ใบสั่งซื้อ/จ้าง" />;
const QuotationForm: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="quotation_form" title="ใบเสนอราคา" />;
const HiringApprovalForm: React.FC<ProcurementMemoProps> = (props) => <MemoComponent {...props} templateKey="hiring_form" title="ใบขออนุมัติจัดจ้าง" />;

export default SupplyPage;
