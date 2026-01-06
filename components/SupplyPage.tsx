
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Personnel, Settings, ProcurementRecord, ProcurementItem, ProcurementType, ProcurementMethod, DurableGood, MaintenanceLog } from '../types';
import { getCurrentThaiDate, formatThaiDate, toThaiWords, toThaiNumerals } from '../utils';

interface SupplyPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
}

type SubPage = 
    | 'create_request' 
    | 'edit_request' 
    | 'receive_items' 
    | 'maintenance_log' 
    | 'dispose_items'
    | 'manage_supply_types'
    | 'manage_categories'
    | 'manage_departments'
    | 'manage_funds'
    | 'settings_org'
    | 'settings_budget'
    | 'settings_form'
    | 'report_procurement'
    | 'report_budget_usage';

// Fix: Moved PagePlaceholder outside the main component to make it accessible to helper components.
const PagePlaceholder: React.FC<{ title: string, children?: React.ReactNode }> = ({ title, children }) => (
    <div className="animate-fade-in">
        <div className="bg-blue-600 text-white p-4 rounded-t-lg shadow-md">
            <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="bg-white p-6 rounded-b-lg shadow-md">
            {children || <p className="text-gray-500">ส่วนนี้อยู่ระหว่างการพัฒนา</p>}
        </div>
    </div>
);


const SupplyPage: React.FC<SupplyPageProps> = ({ currentUser, personnel, settings }) => {
    const [activeSubPage, setActiveSubPage] = useState<SubPage>('create_request');
    const [isSubmenuOpen, setIsSubmenuOpen] = useState<string | null>('data');
    const [viewingMemo, setViewingMemo] = useState<{ type: 'report' | 'approval' | 'details' | 'payment' | 'disbursement' | 'receipt' | 'po' | 'quotation' | 'approval_form', record: ProcurementRecord } | null>(null);

    const renderSubPage = () => {
        // Placeholder components for each sub-page
        const CreateRequestForm = () => {
            type ItemRow = { id: number; type: string; description: string; quantity: string; unit: string; unitPrice: string; location: string; };
            
            // State for the main form data to prevent data loss
            const [mainFormData, setMainFormData] = useState({
                reason: 'เพื่อความคล่องตัวในการดำเนินงานตามโครงการจะได้มีประสิทธิภาพ',
                docNumber: '', // เลขที่เบิก
                requesterName: `${currentUser.personnelTitle} ${currentUser.personnelName}`, // Default to current user
                subject: 'โรงเรียนบ้านป่าหวาย',
                docDate: new Date().toISOString().split('T')[0],
                department: 'กลุ่มสาระไทย',
                project: '',
                supplier: '',
                managerName: '',
                procurementType: '',
                procurementMethod: '',
                neededDate: '',
                approvedBudget: ''
            });

            // State for the items table
            const [items, setItems] = useState<ItemRow[]>([
                { id: 1, type: '', description: '', quantity: '', unit: '', unitPrice: '', location: '' },
            ]);

            // States for personnel search dropdowns
            const [requesterSearch, setRequesterSearch] = useState('');
            const [isRequesterDropdownOpen, setIsRequesterDropdownOpen] = useState(false);
            const requesterRef = useRef<HTMLDivElement>(null);

            const [managerSearch, setManagerSearch] = useState('');
            const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
            const managerRef = useRef<HTMLDivElement>(null);

            // Click outside handler for dropdowns
            useEffect(() => {
                const handleClickOutside = (event: MouseEvent) => {
                    if (requesterRef.current && !requesterRef.current.contains(event.target as Node)) {
                        setIsRequesterDropdownOpen(false);
                    }
                    if (managerRef.current && !managerRef.current.contains(event.target as Node)) {
                        setIsManagerDropdownOpen(false);
                    }
                };
                document.addEventListener('mousedown', handleClickOutside);
                return () => document.removeEventListener('mousedown', handleClickOutside);
            }, []);

            const handleMainFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
                const { name, value } = e.target;
                setMainFormData(prev => ({ ...prev, [name]: value }));
            };
        
            const handleItemChange = (id: number, field: keyof ItemRow, value: string) => {
                setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
            };
        
            const handleAddItem = () => {
                setItems([...items, { id: Date.now(), type: '', description: '', quantity: '', unit: '', unitPrice: '', location: '' }]);
            };
        
            const total = useMemo(() => {
                return items.reduce((sum, item) => {
                    const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return sum + amount;
                }, 0);
            }, [items]);

            const filteredRequesters = useMemo(() => {
                if (!requesterSearch) return personnel;
                return personnel.filter(p => `${p.personnelTitle} ${p.personnelName}`.toLowerCase().includes(requesterSearch.toLowerCase()));
            }, [personnel, requesterSearch]);

            const filteredManagers = useMemo(() => {
                if (!managerSearch) return personnel;
                return personnel.filter(p => `${p.personnelTitle} ${p.personnelName}`.toLowerCase().includes(managerSearch.toLowerCase()));
            }, [personnel, managerSearch]);
        
            return (
                <div className="animate-fade-in">
                     <div className="bg-blue-600 text-white p-3 rounded-t-lg shadow-md">
                        <h2 className="text-xl font-bold">บันทึกข้อมูลขอซื้อ/ขอจ้าง</h2>
                    </div>
                    <div className="bg-white p-6 rounded-b-lg shadow-lg">
                        <form className="space-y-6 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <div className="md:col-span-2">
                                    <label className="font-bold">เหตุผลขอซื้อขอจ้าง</label>
                                    <input type="text" name="reason" value={mainFormData.reason} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" />
                                </div>
                                <div><label className="font-bold">เลขที่เบิก:</label><input type="text" name="docNumber" value={mainFormData.docNumber} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                                <div ref={requesterRef}>
                                    <label className="font-bold">ผู้ขอเบิก:</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="mt-1 w-full border-gray-300 rounded-md"
                                            value={mainFormData.requesterName}
                                            onChange={(e) => {
                                                setMainFormData(prev => ({ ...prev, requesterName: e.target.value }));
                                                setRequesterSearch(e.target.value);
                                                setIsRequesterDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsRequesterDropdownOpen(true)}
                                            placeholder="ค้นหารายชื่อ..."
                                        />
                                        {isRequesterDropdownOpen && (
                                            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                                                {filteredRequesters.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => {
                                                            const fullName = `${p.personnelTitle} ${p.personnelName}`;
                                                            setMainFormData(prev => ({ ...prev, requesterName: fullName }));
                                                            setIsRequesterDropdownOpen(false);
                                                        }}
                                                        className="p-2 hover:bg-blue-100 cursor-pointer text-xs"
                                                    >
                                                        {p.personnelTitle} {p.personnelName}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="font-bold">เรื่อง:</label><input type="text" name="subject" value={mainFormData.subject} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                                <div><label className="font-bold">วันที่:</label><input type="date" name="docDate" value={mainFormData.docDate} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                                <div className="md:col-span-2">
                                    <label className="font-bold">กลุ่มสาระ:</label>
                                    <select name="department" value={mainFormData.department} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md">
                                        <option>กลุ่มสาระไทย</option>
                                        <option>กลุ่มสาระคณิตศาสตร์</option>
                                    </select>
                                </div>
                                <div><label className="font-bold">สำหรับ(โครงการ):</label><input type="text" name="project" value={mainFormData.project} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                                <div className="md:col-span-2"><label className="font-bold">ผู้ขาย:</label><input type="text" name="supplier" value={mainFormData.supplier} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                                <div ref={managerRef}>
                                    <label className="font-bold">ผู้บริหาร:</label>
                                    <div className="relative">
                                         <input 
                                            type="text" 
                                            className="mt-1 w-full border-gray-300 rounded-md"
                                            value={mainFormData.managerName}
                                            onChange={(e) => {
                                                setMainFormData(prev => ({ ...prev, managerName: e.target.value }));
                                                setManagerSearch(e.target.value);
                                                setIsManagerDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsManagerDropdownOpen(true)}
                                            placeholder="ค้นหารายชื่อผู้บริหาร..."
                                        />
                                        {isManagerDropdownOpen && (
                                            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                                                {filteredManagers.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => {
                                                            const fullName = `${p.personnelTitle} ${p.personnelName}`;
                                                            setMainFormData(prev => ({ ...prev, managerName: fullName }));
                                                            setIsManagerDropdownOpen(false);
                                                        }}
                                                        className="p-2 hover:bg-blue-100 cursor-pointer text-xs"
                                                    >
                                                        {p.personnelTitle} {p.personnelName}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <fieldset className="border p-3 rounded-md">
                                    <legend className="font-bold px-2">ชนิดการจัดหา</legend>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {['วัตถุ', 'ครุภัณฑ์', 'ที่ดิน', 'ก่อสร้าง', 'จ้างทำของ', 'เช่าทรัพย์สิน', 'บริการ', 'อื่นๆ'].map(type => (
                                            <label key={type} className="flex items-center">
                                                <input type="radio" name="procurementType" value={type} checked={mainFormData.procurementType === type} onChange={handleMainFormChange} className="mr-2" />
                                                {type}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <fieldset className="border p-3 rounded-md">
                                    <legend className="font-bold px-2">วิธีจัดหา</legend>
                                     <div className="grid grid-cols-2 gap-2 text-xs">
                                        {['ตกลงราคา', 'สอบราคา', 'ประกวดราคา', 'พิเศษ', 'กรณีพิเศษ', 'e-market', 'e-bidding'].map(method => (
                                            <label key={method} className="flex items-center">
                                                <input type="radio" name="procurementMethod" value={method} checked={mainFormData.procurementMethod === method} onChange={handleMainFormChange} className="mr-2" />
                                                {method}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="font-bold">วันที่ต้องการใช้งาน:</label><input type="date" name="neededDate" value={mainFormData.neededDate} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                                <div><label className="font-bold">วงเงินที่ได้รับอนุมัติ:</label><input type="number" name="approvedBudget" value={mainFormData.approvedBudget} onChange={handleMainFormChange} className="mt-1 w-full border-gray-300 rounded-md" placeholder="บาท" /></div>
                            </div>
        
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h3 className="font-bold mb-2">รายการพัสดุ</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white text-xs">
                                        <thead className="bg-gray-200">
                                            <tr>
                                                <th className="p-2 w-12 text-center">ลำดับ</th><th className="p-2">ประเภท</th>
                                                <th className="p-2 min-w-[200px]">รายการพัสดุ/งานจ้าง (ระบุขนาด/ลักษณะ/ยี่ห้อ)</th>
                                                <th className="p-2 w-20">จำนวน</th><th className="p-2 w-20">หน่วย</th>
                                                <th className="p-2 w-24">ราคาต่อหน่วย</th><th className="p-2 w-24">เป็นเงิน</th>
                                                <th className="p-2 w-40">สถานที่ใช้งาน</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={item.id} className="border-b">
                                                    <td className="p-1 text-center">{index + 1}</td>
                                                    <td className="p-1"><input type="text" value={item.type} onChange={e => handleItemChange(item.id, 'type', e.target.value)} className="w-full border-gray-300 rounded"/></td>
                                                    <td className="p-1"><input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full border-gray-300 rounded"/></td>
                                                    <td className="p-1"><input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full border-gray-300 rounded text-center"/></td>
                                                    <td className="p-1"><input type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full border-gray-300 rounded"/></td>
                                                    <td className="p-1"><input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} className="w-full border-gray-300 rounded text-right"/></td>
                                                    <td className="p-1"><input type="text" readOnly value={((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString()} className="w-full border-gray-300 rounded bg-gray-100 text-right"/></td>
                                                    <td className="p-1"><input type="text" value={item.location} onChange={e => handleItemChange(item.id, 'location', e.target.value)} className="w-full border-gray-300 rounded"/></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="font-bold">
                                                <td colSpan={6} className="p-2 text-right">รวมเงิน:</td>
                                                <td colSpan={2} className="p-2"><input type="text" readOnly value={total.toLocaleString() + ' บาท'} className="w-full border-gray-300 rounded bg-gray-100 text-right font-bold"/></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-4 border-t">
                                <div className="flex gap-2">
                                    <button type="button" onClick={handleAddItem} className="bg-green-500 text-white px-4 py-2 rounded-md shadow-sm">+ เพิ่มรายการ</button>
                                    <button type="button" className="bg-yellow-500 text-white px-4 py-2 rounded-md shadow-sm">พิมพ์ใบเสนอราคา</button>
                                </div>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md shadow-md">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        };
        
        const EditRequestListPage = () => {
            const mockData: (ProcurementRecord & { department?: string, type?: string, vendor?: string })[] = useMemo(() => [
                { 
                    id: 4, docNumber: 'PO-2569-001', subject: 'รายงานขอซื้อวัสดุคอมพิวเตอร์เพื่อใช้ในการเรียนการสอน', docDate: '06/01/2569',
                    recipient: 'ผู้อำนวยการโรงเรียนบ้านป่าเลา', approvedBudget: 15000, procurementType: 'ครุภัณฑ์', procurementMethod: 'เฉพาะเจาะจง',
                    supplierName: 'ร้าน สมาร์ท ไอที', totalPrice: 3490, department: 'กลุ่มสาระไทย', type: 'ครุภัณฑ์', vendor: 'admin',
                    items: [
                        { id: 101, type: 'วัสดุ', description: 'เมาส์ไร้สาย Logitech M185 (สีดำ)', unitPrice: 3490, quantity: 1, unit: 'อัน', location: 'ห้องคอมพิวเตอร์' },
                    ]
                },
                { 
                    id: 3, docNumber: 'PO-2568-015', subject: 'รายงานขอจ้างซ่อมบำรุงเครื่องปรับอากาศ', docDate: '24/12/2568',
                    recipient: 'ผู้อำนวยการโรงเรียนบ้านป่าเลา', approvedBudget: 5000, procurementType: 'จ้างเหมาบริการ', procurementMethod: 'เฉพาะเจาะจง',
                    supplierName: 'ร้าน แอร์ เซอร์วิส', totalPrice: 4500, department: 'กลุ่มสาระไทย', type: 'วัสดุ', vendor: 'admin',
                    items: [
                        { id: 201, type: 'บริการ', description: 'ค่าบริการล้างเครื่องปรับอากาศ', unitPrice: 500, quantity: 9, unit: 'เครื่อง', location: 'อาคารเรียน 1' },
                    ]
                 },
            ], []);

            const [printModalRecord, setPrintModalRecord] = useState<ProcurementRecord | null>(null);
        
            return (
                <div className="animate-fade-in space-y-6">
                    <h2 className="text-xl font-bold text-navy">จัดการรายการคำสั่งซื้อ</h2>
                    
                    <div className="bg-white rounded-lg shadow-lg">
                        <div className="bg-blue-600 text-white p-3 rounded-t-lg">
                            <h3 className="font-bold">ข้อมูลค้นหาตามหมวด</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end text-sm">
                            <div className="md:col-span-2">
                                <label className="block font-medium mb-1">เลขที่คำสั่งซื้อ</label>
                                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">วันที่</label>
                                <input type="date" className="w-full border-gray-300 rounded-md shadow-sm" defaultValue="2016-01-05"/>
                            </div>
                            <div>
                                <label className="block font-medium mb-1">เลขที่เบิก</label>
                                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <button className="bg-blue-600 text-white py-2 px-6 rounded-md shadow-md h-fit">ค้นหา</button>
                        </div>
                    </div>
        
                    <div className="bg-white rounded-lg shadow-lg">
                        <div className="bg-green-600 text-white p-3 rounded-t-lg">
                            <h3 className="font-bold">รายการคำสั่งซื้อ</h3>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr className="text-sm text-gray-600">
                                        <th className="px-4 py-2 text-left">ลำดับ</th><th className="px-4 py-2 text-left">เลขที่</th>
                                        <th className="px-4 py-2 text-left">วันที่รับ</th><th className="px-4 py-2 text-left">กลุ่มสาระ</th>
                                        <th className="px-4 py-2 text-center">ประเภท</th><th className="px-4 py-2 text-left">ผู้ขาย</th>
                                        <th className="px-4 py-2 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                    {mockData.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-center font-bold">{item.id}</td>
                                            <td className="px-4 py-3">{item.docNumber}</td>
                                            <td className="px-4 py-3">{item.docDate}</td>
                                            <td className="px-4 py-3">{item.department}</td>
                                            <td className="px-4 py-3 text-center"><span className="p-2 text-lg">{item.procurementType === 'ครุภัณฑ์' ? '🏢' : '📋'}</span></td>
                                            <td className="px-4 py-3">{item.supplierName}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center items-center gap-2">
                                                    <button className="bg-green-500 text-white p-2 rounded-md font-bold text-xs" title="ดู/อนุมัติ">A</button>
                                                    <button onClick={() => setPrintModalRecord(item)} className="bg-blue-500 text-white p-2 rounded-md" title="พิมพ์">🖨️</button>
                                                    <button className="bg-red-500 text-white p-2 rounded-md" title="ลบ">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t text-sm text-gray-500">
                            ทั้งหมด {mockData.length} รายการ
                        </div>
                    </div>

                    {printModalRecord && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg text-center">
                                <h3 className="text-lg font-bold text-navy mb-6">เลือกเอกสารที่ต้องการพิมพ์</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                                    {[
                                        { type: 'report', label: 'บันทึกข้อความ (รายงานขอซื้อ)' },
                                        { type: 'approval', label: 'บันทึกข้อความ (ขออนุมัติจัดซื้อ)' },
                                        { type: 'details', label: 'รายละเอียดพัสดุ (แนบท้าย)' },
                                        { type: 'payment', label: 'บันทึกข้อความ (ขออนุมัติจ่ายเงิน)' },
                                        { type: 'disbursement', label: 'ใบเบิกพัสดุ' },
                                        { type: 'receipt', label: 'ใบตรวจรับพัสดุ' },
                                        { type: 'po', label: 'ใบสั่งซื้อ/จ้าง' },
                                        { type: 'quotation', label: 'ใบเสนอราคา' },
                                        { type: 'approval_form', label: 'ใบขออนุมัติจัดจ้าง' },
                                    ].map(doc => (
                                        <button 
                                            key={doc.type}
                                            onClick={() => { setViewingMemo({ type: doc.type as any, record: printModalRecord }); setPrintModalRecord(null); }}
                                            className="w-full text-left p-4 bg-gray-100 rounded-lg hover:bg-blue-100 transition-colors font-semibold flex items-center gap-3"
                                        >
                                            📄 <span>{doc.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setPrintModalRecord(null)} className="mt-6 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold">
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        };
        
        const ReceiveAndDisbursePage = () => {
            const [activeTab, setActiveTab] = useState<'receive' | 'disburse'>('receive');
        
            const mockProcurementRecords: (ProcurementRecord & { status: 'pending' | 'received' })[] = useMemo(() => [
                {
                    id: 1, docNumber: 'PO-2567-001', subject: 'จัดซื้ออุปกรณ์คอมพิวเตอร์', docDate: '01/07/2567',
                    recipient: 'ผู้อำนวยการ', approvedBudget: 50000, procurementType: 'ครุภัณฑ์', procurementMethod: 'เฉพาะเจาะจง',
                    supplierName: 'บริษัท คอมพิวเตอร์ จำกัด', status: 'pending', totalPrice: 48500,
                    items: [
                        { id: 101, type: 'ครุภัณฑ์', description: 'เมาส์ไร้สาย', unitPrice: 350, quantity: 10, unit: 'อัน', location: 'ห้องคอมพิวเตอร์' },
                        { id: 102, type: 'ครุภัณฑ์', description: 'คีย์บอร์ดไร้สาย', unitPrice: 500, quantity: 10, unit: 'อัน', location: 'ห้องคอมพิวเตอร์' },
                    ]
                },
                {
                    id: 2, docNumber: 'PO-2567-002', subject: 'จัดซื้อวัสดุสำนักงาน', docDate: '02/07/2567',
                    recipient: 'ผู้อำนวยการ', approvedBudget: 5000, procurementType: 'วัตถุ', procurementMethod: 'เฉพาะเจาะจง',
                    supplierName: 'ร้านเครื่องเขียน', status: 'received', totalPrice: 4500,
                    items: [
                        { id: 201, type: 'วัตถุ', description: 'กระดาษ A4', unitPrice: 120, quantity: 20, unit: 'รีม', location: 'ห้องธุรการ' },
                    ]
                }
            ], []);
        
            const mockSupplyItems = useMemo(() => [
                { id: 1, name: 'กระดาษ A4 (รีม)', unit: 'รีม', inStock: 50 },
                { id: 2, name: 'ปากกาเคมี (ด้าม)', unit: 'ด้าม', inStock: 120 },
                { id: 3, name: 'แฟ้มเอกสาร (อัน)', unit: 'อัน', inStock: 80 },
            ], []);
        
            const ReceiveItems = () => {
                const [selectedPO, setSelectedPO] = useState<number | null>(null);
                const po = mockProcurementRecords.find(p => p.id === selectedPO);
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select onChange={e => setSelectedPO(Number(e.target.value))} className="md:col-span-2 border-gray-300 rounded-md shadow-sm">
                                <option>-- เลือกใบสั่งซื้อ (PO) เพื่อตรวจรับ --</option>
                                {mockProcurementRecords.filter(p => p.status === 'pending').map(p => <option key={p.id} value={p.id}>{p.docNumber} - {p.subject}</option>)}
                            </select>
                            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="border-gray-300 rounded-md shadow-sm" />
                        </div>
        
                        {po && (
                            <div className="border rounded-lg p-4 bg-gray-50 animate-fade-in">
                                <h3 className="font-bold text-navy mb-2">รายการในใบสั่งซื้อ: {po.docNumber}</h3>
                                <p className="text-sm text-gray-500 mb-4">ผู้ขาย: {po.supplierName}</p>
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2">รายการ</th>
                                            <th className="p-2 text-center">จำนวนสั่ง</th>
                                            <th className="p-2 text-center">จำนวนรับ</th>
                                            <th className="p-2 text-center">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {po.items.map(item => (
                                            <tr key={item.id}>
                                                <td className="p-2">{item.description}</td>
                                                <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                                                <td className="p-1"><input type="number" defaultValue={item.quantity} className="w-20 text-center border-gray-300 rounded" /></td>
                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded" placeholder="..." /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex justify-end mt-4">
                                    <button className="bg-blue-600 text-white px-6 py-2 rounded-md shadow-md">บันทึกการตรวจรับ</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            };
        
            const DisburseItems = () => {
                const [items, setItems] = useState([{ itemId: 1, quantity: 1 }]);
                const addItem = () => setItems([...items, { itemId: 1, quantity: 1 }]);
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" readOnly value={`ผู้เบิก: ${currentUser.personnelName}`} className="bg-gray-100 border-gray-300 rounded-md shadow-sm" />
                            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <textarea placeholder="เหตุผลการเบิก..." className="w-full border-gray-300 rounded-md shadow-sm" rows={2}></textarea>
                        
                        <h3 className="font-bold text-navy">รายการที่ต้องการเบิก</h3>
                        <div className="space-y-2">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <select className="flex-grow border-gray-300 rounded">
                                        {mockSupplyItems.map(s => <option key={s.id} value={s.id}>{s.name} (คงเหลือ: {s.inStock})</option>)}
                                    </select>
                                    <input type="number" defaultValue={item.quantity} className="w-24 border-gray-300 rounded" />
                                </div>
                            ))}
                        </div>
                        <button onClick={addItem} className="text-sm text-blue-600">+ เพิ่มรายการ</button>
        
                        <div className="flex justify-end mt-4">
                            <button className="bg-blue-600 text-white px-6 py-2 rounded-md shadow-md">ส่งใบเบิก</button>
                        </div>
                    </div>
                );
            };
        
            return (
                <div className="animate-fade-in">
                    <div className="bg-blue-600 text-white p-4 rounded-t-lg shadow-md mb-4">
                        <h2 className="text-xl font-bold">ตรวจรับ/เบิกจ่ายพัสดุ</h2>
                    </div>
                    <div className="bg-white p-6 rounded-b-lg shadow-md">
                        <div className="flex border-b mb-4">
                            <button onClick={() => setActiveTab('receive')} className={`px-4 py-2 font-semibold ${activeTab === 'receive' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>ตรวจรับพัสดุ</button>
                            <button onClick={() => setActiveTab('disburse')} className={`px-4 py-2 font-semibold ${activeTab === 'disburse' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>เบิกจ่ายพัสดุ</button>
                        </div>
                        {activeTab === 'receive' ? <ReceiveItems /> : <DisburseItems />}
                    </div>
                </div>
            );
        };
        
        const MaintenanceLogPage = () => {
            const [mockDurableGoods, setMockDurableGoods] = useState<DurableGood[]>([
                {
                    id: 1, code: 'KSP-66-001', name: 'โต๊ะทำงาน', category: 'เฟอร์นิเจอร์', price: 1500,
                    acquisitionDate: '01/01/2566', location: 'ห้องธุรการ', status: 'available',
                    maintenanceHistory: [
                        { id: 101, date: '15/03/2566', description: 'ซ่อมขาโต๊ะ', cost: 200, technician: 'ช่างภายนอก' }
                    ]
                },
                {
                    id: 2, code: 'KSP-65-012', name: 'เครื่องปรับอากาศ', category: 'อุปกรณ์อิเล็กทรอนิกส์', price: 25000,
                    acquisitionDate: '10/06/2565', location: 'ห้องผู้อำนวยการ', status: 'in_use',
                    maintenanceHistory: []
                }
            ]);
        
            const [scannedCode, setScannedCode] = useState('');
            const [foundItem, setFoundItem] = useState<DurableGood | null>(null);
            const [isScanning, setIsScanning] = useState(false);
            const videoRef = useRef<HTMLVideoElement>(null);
            const streamRef = useRef<MediaStream | null>(null);
            const [newLog, setNewLog] = useState<Partial<MaintenanceLog>>({ date: getCurrentThaiDate(), description: '', cost: 0, technician: '' });
        
            useEffect(() => {
                if (isScanning) {
                    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                        .then(stream => {
                            if (videoRef.current) videoRef.current.srcObject = stream;
                            streamRef.current = stream;
                        })
                        .catch(err => {
                            console.error("Camera error:", err);
                            setIsScanning(false);
                            alert("ไม่สามารถเข้าถึงกล้องได้");
                        });
                } else if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                return () => {
                    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
                };
            }, [isScanning]);
        
            const handleSearch = () => {
                const item = mockDurableGoods.find(d => d.code.toLowerCase() === scannedCode.toLowerCase().trim());
                setFoundItem(item || null);
                if (!item) alert('ไม่พบครุภัณฑ์รหัสนี้');
            };
        
            const handleSaveLog = (e: React.FormEvent) => {
                e.preventDefault();
                if (!foundItem || !newLog.description) return;
                const updatedHistory = [...(foundItem.maintenanceHistory || []), { ...newLog, id: Date.now() } as MaintenanceLog];
                const updatedItem = { ...foundItem, maintenanceHistory: updatedHistory, status: 'repair' as const };
                setMockDurableGoods(prev => prev.map(d => d.id === updatedItem.id ? updatedItem : d));
                setFoundItem(updatedItem);
                setNewLog({ date: getCurrentThaiDate(), description: '', cost: 0, technician: '' });
                alert('บันทึกประวัติการซ่อมสำเร็จ');
            };
        
            return (
                <div className="animate-fade-in">
                    <div className="bg-blue-600 text-white p-4 rounded-t-lg shadow-md mb-4">
                        <h2 className="text-xl font-bold">ลงประวัติซ่อมบำรุง</h2>
                    </div>
                    <div className="bg-white p-6 rounded-b-lg shadow-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-navy">ค้นหาครุภัณฑ์</h3>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="สแกนหรือป้อนรหัสครุภัณฑ์..." value={scannedCode} onChange={e => setScannedCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="flex-grow border-gray-300 rounded-md shadow-sm" />
                                    <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md">ค้นหา</button>
                                </div>
                                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center text-white relative">
                                    {isScanning ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" /> : <div className="text-center p-4"><p className="text-sm">เปิดกล้องเพื่อสแกน QR Code</p><p className="text-xs opacity-60">(ยังไม่รองรับการอ่านโค้ดอัตโนมัติ)</p></div>}
                                </div>
                                <button type="button" onClick={() => setIsScanning(!isScanning)} className="w-full px-4 py-2 bg-gray-200 rounded-md">{isScanning ? 'ปิดกล้อง' : 'เปิดกล้อง'}</button>
                            </div>
        
                            <div>
                                {foundItem ? (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="font-bold text-navy text-lg">{foundItem.name}</h3>
                                            <p className="text-sm text-gray-500 font-mono">{foundItem.code}</p>
                                            <div className="mt-2 text-xs grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                                                <span><strong>หมวดหมู่:</strong> {foundItem.category}</span>
                                                <span><strong>สถานที่:</strong> {foundItem.location}</span>
                                                <span><strong>วันที่รับ:</strong> {foundItem.acquisitionDate}</span>
                                                <span><strong>ราคา:</strong> {foundItem.price.toLocaleString()} บาท</span>
                                            </div>
                                        </div>
        
                                        <form onSubmit={handleSaveLog} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="font-bold mb-2">บันทึกการซ่อมใหม่</h4>
                                            <div className="space-y-2">
                                                <input type="date" value={new Date().toISOString().split('T')[0]} onChange={e => setNewLog({...newLog, date: e.target.value})} className="w-full border-gray-300 rounded text-sm" />
                                                <textarea value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} required placeholder="รายละเอียดการซ่อม..." rows={2} className="w-full border-gray-300 rounded text-sm"></textarea>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input type="number" value={newLog.cost || ''} onChange={e => setNewLog({...newLog, cost: Number(e.target.value)})} placeholder="ค่าใช้จ่าย" className="w-full border-gray-300 rounded text-sm" />
                                                    <input type="text" value={newLog.technician || ''} onChange={e => setNewLog({...newLog, technician: e.target.value})} placeholder="ชื่อช่าง/ร้าน" className="w-full border-gray-300 rounded text-sm" />
                                                </div>
                                                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-md shadow-md text-sm">บันทึก</button>
                                            </div>
                                        </form>
        
                                        <div>
                                            <h4 className="font-bold mb-2">ประวัติการซ่อม</h4>
                                            <div className="max-h-48 overflow-y-auto border rounded-lg">
                                                <table className="min-w-full text-xs">
                                                    <thead className="bg-gray-50 sticky top-0"><tr><th className="p-2">วันที่</th><th className="p-2">รายละเอียด</th><th className="p-2 text-right">ค่าใช้จ่าย</th></tr></thead>
                                                    <tbody className="divide-y">
                                                        {foundItem.maintenanceHistory && foundItem.maintenanceHistory.length > 0 ? [...foundItem.maintenanceHistory].reverse().map(log => (
                                                            <tr key={log.id}>
                                                                <td className="p-2 whitespace-nowrap">{formatThaiDate(log.date)}</td>
                                                                <td className="p-2">{log.description} <em className="text-gray-400">({log.technician})</em></td>
                                                                <td className="p-2 text-right">{log.cost.toLocaleString()}</td>
                                                            </tr>
                                                        )) : <tr><td colSpan={3} className="p-4 text-center text-gray-400">ไม่มีประวัติ</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg text-gray-400"><p>กรุณาค้นหาครุภัณฑ์เพื่อดูประวัติ</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const BudgetSettingsPage = () => {
            const [selectedGroup, setSelectedGroup] = useState('');
            const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear() + 543).slice(-2));
            const [showData, setShowData] = useState(false);
            
            return (
                <div className="animate-fade-in">
                    <div className="bg-white rounded-lg shadow-lg">
                        <div className="p-4 border-b">
                            <h2 className="text-xl font-bold text-navy">ตั้งค่างบประมาณ</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-blue-600 text-white p-4 rounded-lg shadow-md flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                <h3 className="font-bold">เลือกหน่วยงานและปีงบประมาณ</h3>
                            </div>
        
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มงาน/หน่วยงาน</label>
                                    <div className="flex gap-2">
                                        <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                            <option value="">-- เลือกหน่วยงาน --</option>
                                            <option>กลุ่มบริหารงานวิชาการ</option>
                                            <option>กลุ่มบริหารงานบุคคล</option>
                                            <option>กลุ่มบริหารงานงบประมาณ</option>
                                            <option>กลุ่มบริหารงานทั่วไป</option>
                                        </select>
                                        <button className="px-4 py-2 border rounded-md text-sm whitespace-nowrap flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                            เพิ่มหน่วยงานใหม่
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ปีงบประมาณ (ปป.พ.ศ.)</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" />
                                        <button onClick={() => setShowData(!!selectedGroup)} className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-md">แสดงข้อมูล</button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">กรอกเฉพาะ 2 หลักสุดท้าย เช่น 67</p>
                                </div>
                            </div>
                            
                            {!showData && (
                                <div className="mt-8 pt-8 border-t border-dashed text-center">
                                     <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-500 rounded-full mb-4">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                     </div>
                                     <h3 className="text-lg font-bold text-gray-700">กรุณาเลือกหน่วยงานและปีงบประมาณ</h3>
                                     <p className="text-sm text-gray-500">เลือกหน่วยงานและปีงบประมาณจากด้านบนเพื่อเริ่มต้นตั้งงบประมาณ</p>
                                </div>
                            )}
                            
                            {showData && (
                                <div className="mt-8 pt-8 border-t">
                                    <h3 className="text-lg font-bold text-navy mb-4">งบประมาณสำหรับ: {selectedGroup} ปี {fiscalYear}</h3>
                                    <div className="text-center p-8 bg-gray-100 rounded-lg">
                                        <p className="text-gray-500">พื้นที่สำหรับแสดงผลและจัดการงบประมาณ</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        const ManageSupplyTypesPage = () => {
            const [supplyTypes, setSupplyTypes] = useState([
                { id: 1, name: 'วัสดุสำนักงาน' },
                { id: 2, name: 'วัสดุไฟฟ้าและวิทยุ' },
                { id: 3, name: 'วัสดุคอมพิวเตอร์' },
                { id: 4, name: 'วัสดุการเกษตร' },
            ]);
            const [newTypeName, setNewTypeName] = useState('');
            const [editingId, setEditingId] = useState<number | null>(null);
            const [editingName, setEditingName] = useState('');
        
            const handleAdd = () => {
                if (newTypeName.trim()) {
                    setSupplyTypes([...supplyTypes, { id: Date.now(), name: newTypeName.trim() }]);
                    setNewTypeName('');
                }
            };
        
            const handleDelete = (id: number) => {
                if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบประเภทนี้?')) {
                    setSupplyTypes(supplyTypes.filter(t => t.id !== id));
                }
            };
            
            const handleEdit = (type: {id: number, name: string}) => {
                setEditingId(type.id);
                setEditingName(type.name);
            };
        
            const handleSaveEdit = () => {
                setSupplyTypes(supplyTypes.map(t => t.id === editingId ? { ...t, name: editingName } : t));
                setEditingId(null);
                setEditingName('');
            };
        
            return (
                <div className="animate-fade-in">
                    <div className="bg-blue-600 text-white p-4 rounded-t-lg shadow-md mb-4">
                        <h2 className="text-xl font-bold">กำหนดประเภทพัสดุ</h2>
                    </div>
                    <div className="bg-white p-6 rounded-b-lg shadow-md max-w-2xl mx-auto">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-navy mb-2">เพิ่มประเภทพัสดุใหม่</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    placeholder="เช่น วัสดุก่อสร้าง..."
                                    className="flex-grow border-gray-300 rounded-md shadow-sm"
                                />
                                <button onClick={handleAdd} className="bg-blue-600 text-white px-6 py-2 rounded-md shadow-md">เพิ่ม</button>
                            </div>
                        </div>
        
                        <h3 className="text-lg font-bold text-navy mb-2 border-t pt-4">รายการประเภทพัสดุที่มีอยู่</h3>
                        <div className="space-y-2">
                            {supplyTypes.map(type => (
                                <div key={type.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    {editingId === type.id ? (
                                        <input 
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="flex-grow border-gray-300 rounded-md"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-medium text-gray-700">{type.name}</span>
                                    )}
                                    <div className="flex gap-2">
                                        {editingId === type.id ? (
                                            <>
                                                <button onClick={handleSaveEdit} className="text-sm bg-green-500 text-white px-3 py-1 rounded">บันทึก</button>
                                                <button onClick={() => setEditingId(null)} className="text-sm bg-gray-200 px-3 py-1 rounded">ยกเลิก</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEdit(type)} className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded">แก้ไข</button>
                                                <button onClick={() => handleDelete(type.id)} className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded">ลบ</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        };
        
        // Generic CRUD Page Component
        const GenericCrudPage: React.FC<{title: string, itemLabel: string, placeholder: string, initialItems: {id: number, name: string}[]}> = ({title, itemLabel, placeholder, initialItems}) => {
            const [items, setItems] = useState(initialItems);
            const [newItemName, setNewItemName] = useState('');
            const [editingId, setEditingId] = useState<number | null>(null);
            const [editingName, setEditingName] = useState('');
        
            const handleAdd = (e: React.FormEvent) => {
                e.preventDefault();
                if (newItemName.trim()) {
                    setItems([...items, { id: Date.now(), name: newItemName.trim() }]);
                    setNewItemName('');
                }
            };
        
            const handleDelete = (id: number) => {
                if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
                    setItems(items.filter(item => item.id !== id));
                }
            };
            
            const handleEdit = (item: {id: number, name: string}) => {
                setEditingId(item.id);
                setEditingName(item.name);
            };
        
            const handleSaveEdit = (id: number) => {
                setItems(items.map(item => (item.id === id ? { ...item, name: editingName } : item)));
                setEditingId(null);
                setEditingName('');
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{itemLabel} *</label>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full border-gray-300 rounded-md shadow-sm"
                                />
                            </div>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md">
                                เพิ่มรายการ
                            </button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-lg">
                         <div className="bg-blue-600 text-white p-4 -mx-6 -mt-2 mb-6">
                            <h3 className="font-bold flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                รายการ{itemLabel}ทั้งหมด
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{itemLabel}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4">{item.id}</td>
                                            <td className="px-6 py-4">
                                                {editingId === item.id ? (
                                                    <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="border-gray-300 rounded" autoFocus />
                                                ) : item.name}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingId === item.id ? (
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => handleSaveEdit(item.id)} className="text-sm bg-green-500 text-white px-3 py-1 rounded">บันทึก</button>
                                                        <button onClick={() => setEditingId(null)} className="text-sm bg-gray-200 px-3 py-1 rounded">ยกเลิก</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => handleEdit(item)} className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded">แก้ไข</button>
                                                        <button onClick={() => handleDelete(item.id)} className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded">ลบ</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        };

        const FormEditorPage = () => {
            const formList = [
                { key: 'report', label: 'บันทึกข้อความ (รายงานขอซื้อ)' },
                { key: 'approval', label: 'บันทึกข้อความ (ขออนุมัติจัดซื้อ)' },
                { key: 'details', label: 'รายละเอียดพัสดุ (แนบท้าย)' },
                { key: 'payment', label: 'บันทึกข้อความ (ขออนุมัติจ่ายเงิน)' },
                { key: 'disbursement', label: 'ใบเบิกพัสดุ' },
                { key: 'receipt', label: 'ใบตรวจรับพัสดุ' },
                { key: 'po', label: 'ใบสั่งซื้อ/จ้าง' },
                { key: 'quotation', label: 'ใบเสนอราคา' },
                { key: 'approval_form', label: 'ใบขออนุมัติจัดจ้าง' },
            ];

            const [selectedFormKey, setSelectedFormKey] = useState(formList[0].key);
            const [selectedFont, setSelectedFont] = useState('Sarabun');
            const availableFonts = ['Sarabun', 'Kanit', 'Inter'];
            
            // Fix: Define mock data for form editor preview
            const mockRecordForEditor: ProcurementRecord = {
                id: 9999,
                docNumber: 'PO-DEMO-001',
                subject: 'รายงานขอซื้อวัสดุตัวอย่างสำหรับแสดงผล',
                docDate: getCurrentThaiDate(),
                recipient: `ผู้อำนวยการ${settings.schoolName}`,
                approvedBudget: 20000,
                procurementType: 'ครุภัณฑ์',
                procurementMethod: 'เฉพาะเจาะจง',
                supplierName: 'ร้านค้าตัวอย่าง',
                items: [
                    { id: 1, type: 'ครุภัณฑ์', description: 'เมาส์ไร้สายสำหรับสำนักงาน', unitPrice: 450, quantity: 10, unit: 'อัน', location: 'ห้องธุรการ' },
                    { id: 2, type: 'วัสดุ', description: 'กระดาษ A4 (80 แกรม)', unitPrice: 125, quantity: 20, unit: 'รีม', location: 'ห้องธุรการ' },
                ],
                totalPrice: (450 * 10) + (125 * 20),
                department: 'กลุ่มบริหารงานทั่วไป',
            };
        
            const FormPreview: React.FC<{ formKey: string, font: string }> = ({ formKey, font }) => {
                const props = {
                    record: mockRecordForEditor,
                    settings: settings,
                    onBack: () => {},
                    isEditable: true,
                    fontFamily: font,
                };
        
                switch (formKey) {
                    case 'report': return <ProcurementMemo {...props} />;
                    case 'approval': return <ApprovalMemo {...props} />;
                    case 'details': return <ProcurementDetailsMemo {...props} />;
                    case 'payment': return <PaymentMemo {...props} />;
                    case 'disbursement': return <DisbursementForm {...props} />;
                    case 'receipt': return <ReceiptForm {...props} />;
                    case 'po': return <PurchaseOrder {...props} />;
                    case 'quotation': return <QuotationForm {...props} />;
                    case 'approval_form': return <ApprovalRequestForm {...props} />;
                    default: return <div className="p-8 text-center text-gray-500">กรุณาเลือกแบบฟอร์ม</div>;
                }
            };

            return (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-navy flex items-center gap-3">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            ตัวแก้ไขแบบฟอร์มเอกสาร
                        </h2>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
                            <label className="text-sm font-bold text-gray-600">เลือกฟอนต์:</label>
                             <select 
                                value={selectedFont} 
                                onChange={(e) => setSelectedFont(e.target.value)}
                                className="border-gray-300 rounded-lg text-sm font-semibold"
                                style={{ fontFamily: selectedFont }}
                            >
                                {availableFonts.map(font => (
                                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                ))}
                            </select>
                        </div>
                    </div>
        
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg border">
                            <h3 className="font-bold text-navy p-2">เลือกแบบฟอร์ม</h3>
                             <div className="space-y-1 mt-2">
                                {formList.map(form => (
                                    <button
                                        key={form.key}
                                        onClick={() => setSelectedFormKey(form.key)}
                                        className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center gap-3 ${selectedFormKey === form.key ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-gray-600 hover:bg-blue-50'}`}
                                    >
                                        📄 <span className="flex-grow">{form.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-3 bg-gray-600 p-8 rounded-xl shadow-inner overflow-x-auto">
                             <div className="w-fit mx-auto transform scale-90 origin-top">
                                <FormPreview formKey={selectedFormKey} font={selectedFont} />
                             </div>
                        </div>
                    </div>
                </div>
            );
        };
        
        const ProcurementReportPage = () => {
            return (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold text-navy mb-4">รายงานสรุปครุภัณฑ์และวัสดุ</h2>
                        
                        <div className="bg-blue-600 text-white p-4 -mx-6 -mt-2 mb-6">
                            <h3 className="font-bold flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                ค้นหารายงาน
                            </h3>
                        </div>
        
                        <div className="space-y-6 text-sm">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="font-semibold block mb-2">ค้นหาจาก</label>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        <label className="flex items-center"><input type="radio" name="search_by" defaultChecked className="mr-2"/> ทั้งหมด</label>
                                        <label className="flex items-center"><input type="radio" name="search_by" className="mr-2"/> ตามวัน</label>
                                        <label className="flex items-center"><input type="radio" name="search_by" className="mr-2"/> ตามเดือน</label>
                                    </div>
                                </div>
                                <div>
                                    <label className="font-semibold block mb-2">สถานะ</label>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        <label className="flex items-center"><input type="radio" name="status_type" defaultChecked className="mr-2"/> ครุภัณฑ์</label>
                                        <label className="flex items-center"><input type="radio" name="status_type" className="mr-2"/> ชนิดใช้งานได้</label>
                                        <label className="flex items-center"><input type="radio" name="status_type" className="mr-2"/> แทงจำหน่าย</label>
                                        <label className="flex items-center"><input type="radio" name="status_type" className="mr-2"/> อื่นๆ</label>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                <div>
                                    <label className="font-semibold block mb-2">ประเภท</label>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        <label className="flex items-center"><input type="radio" name="display_type" defaultChecked className="mr-2"/> แสดงทั้งหมด (ครุภัณฑ์)</label>
                                        <label className="flex items-center"><input type="radio" name="display_type" className="mr-2"/> ไม่แสดง</label>
                                    </div>
                                </div>
                                <div>
                                    <label className="font-semibold block mb-2">ประเภท</label>
                                    <select className="w-full border-gray-300 rounded-md mt-1 p-2">
                                        <option>ครุภัณฑ์</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end pt-4 border-t">
                                <div className="flex gap-2 items-center">
                                    <label className="whitespace-nowrap font-semibold">ตั้งแต่วันที่</label>
                                    <input type="date" className="w-full border-gray-300 rounded-md p-2"/>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <label className="whitespace-nowrap font-semibold">ถึงวันที่</label>
                                    <input type="date" className="w-full border-gray-300 rounded-md p-2"/>
                                </div>
                                <div>
                                    <button className="w-full bg-blue-600 text-white py-2.5 rounded-md shadow-md hover:bg-blue-700">ค้นหา</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg min-h-[300px]">
                    </div>
                </div>
            );
        };
        
        const BudgetUsageReportPage = () => {
            const [selectedGroup, setSelectedGroup] = useState('');
            const [fiscalYear, setFiscalYear] = useState('');
            const [showReport, setShowReport] = useState(false);
        
            const handleViewReport = () => {
                if (selectedGroup && fiscalYear) {
                    setShowReport(true);
                } else {
                    alert('กรุณาเลือกหน่วยงานและปีงบประมาณ');
                }
            };
            
            return (
                <div className="animate-fade-in space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold text-navy mb-4">รายงานการใช้งบประมาณ</h2>
                        
                        <div className="bg-blue-600 text-white p-4 -mx-6 -mt-2 mb-6">
                            <h3 className="font-bold flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                เลือกหน่วยงานและปีงบประมาณ
                            </h3>
                        </div>
        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="md:col-span-1">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">เลือกหน่วยงาน</label>
                                 <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">-- เลือกหน่วยงาน --</option>
                                    <option>กลุ่มบริหารงานบุคคล</option>
                                    <option>กลุ่มบริหารงานวิชาการ</option>
                                    <option>กลุ่มบริหารงานงบประมาณ</option>
                                    <option>กลุ่มบริหารงานทั่วไป</option>
                                </select>
                            </div>
                             <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ปีงบประมาณ (พ.ศ.)</label>
                                <input type="text" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" placeholder="66" />
                            </div>
                            <div className="md:col-span-1">
                                <button onClick={handleViewReport} className="w-full bg-blue-600 text-white py-2 rounded-md shadow-md">ดูรายงาน</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-lg min-h-[300px]">
                        {!showReport ? (
                            <div className="text-center py-10">
                                 <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-500 rounded-full mb-4">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 </div>
                                 <h3 className="text-lg font-bold text-gray-700">กรุณาเลือกหน่วยงานและปีงบประมาณ</h3>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                <p>พื้นที่สำหรับแสดงผลรายงานงบประมาณของ {selectedGroup} ปี {fiscalYear}</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        if (viewingMemo) {
            if (viewingMemo.type === 'report') return <ProcurementMemo record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'approval') return <ApprovalMemo record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'details') return <ProcurementDetailsMemo record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'payment') return <PaymentMemo record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'disbursement') return <DisbursementForm record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'receipt') return <ReceiptForm record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'po') return <PurchaseOrder record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'quotation') return <QuotationForm record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
            if (viewingMemo.type === 'approval_form') return <ApprovalRequestForm record={viewingMemo.record} onBack={() => setViewingMemo(null)} settings={settings} />;
        }

        switch (activeSubPage) {
            case 'create_request': return <CreateRequestForm />;
            case 'edit_request': return <EditRequestListPage />;
            case 'receive_items': return <ReceiveAndDisbursePage />;
            case 'maintenance_log': return <MaintenanceLogPage />;
            case 'manage_supply_types': return <ManageSupplyTypesPage />;
            case 'manage_categories': return <GenericCrudPage title="จัดการหมวดหมู่ประเภทพัสดุ" itemLabel="ชื่อหมวดหมู่" placeholder="เช่น ครุภัณฑ์สำนักงาน..." initialItems={[{id: 1, name: 'ครุภัณฑ์คอมพิวเตอร์'}, {id: 2, name: 'ครุภัณฑ์การศึกษา'}]} />;
            case 'manage_departments': return <GenericCrudPage title="จัดการข้อมูลกลุ่มสาระการเรียนรู้" itemLabel="ชื่อกลุ่มสาระฯ" placeholder="เช่น กลุ่มสาระฯ คณิตศาสตร์..." initialItems={[{id: 1, name: 'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา'}, {id: 2, name: 'กลุ่มสาระการเรียนรู้การงานอาชีพ'}, {id: 3, name: 'กลุ่มสาระการเรียนรู้ภาษาไทย'}]} />;
            case 'manage_funds': return <GenericCrudPage title="จัดการข้อมูลรายการเงินงบประมาณ" itemLabel="ชื่อรายการเงิน" placeholder="เช่น อุดหนุนรายหัว..." initialItems={[{id: 1, name: 'อุดหนุนรายหัว'}, {id: 2, name: 'รายได้สถานศึกษา'}, {id: 3, name: 'งบประมาณ'}, {id: 4, name: 'เงินบริจาค'}]} />;
            case 'settings_budget': return <BudgetSettingsPage />;
            case 'settings_form': return <FormEditorPage />;
            case 'report_procurement': return <ProcurementReportPage />;
            case 'report_budget_usage': return <BudgetUsageReportPage />;
            case 'settings_org': return <PagePlaceholder title="ตั้งค่าหน่วยงาน"><p>ฟอร์มสำหรับตั้งค่าชื่อหน่วยงาน ที่อยู่ และข้อมูลพื้นฐานอื่นๆ</p></PagePlaceholder>;
            default: return <PagePlaceholder title={activeSubPage.replace(/_/g, ' ').toUpperCase()} />;
        }
    };
    
    const menuGroups = [
      { key: 'main', label: 'เมนูหลัก', items: [
          { id: 'create_request', label: 'สร้างรายการสั่งซื้อ/จ้าง' },
          { id: 'edit_request', label: 'แก้ไขรายการ/พิมพ์ใบสั่งซื้อ' },
          { id: 'receive_items', label: 'ตรวจรับ/เบิกวัสดุ/พัสดุ' },
          { id: 'maintenance_log', label: 'ลงประวัติซ่อมบำรุง' },
          { id: 'dispose_items', label: 'จำหน่าย' },
      ]},
      { key: 'data', label: 'จัดการข้อมูล', items: [
          { id: 'manage_supply_types', label: 'กำหนดประเภทพัสดุ' },
          { id: 'manage_categories', label: 'จัดการหมวดหมู่ประเภท' },
          { id: 'manage_departments', label: 'จัดการข้อมูลกลุ่มสาระ' },
          { id: 'manage_funds', label: 'จัดการข้อมูลรายการเงิน' },
      ]},
      { key: 'settings', label: 'ตั้งค่าระบบ', items: [
          { id: 'settings_org', label: 'ตั้งค่าหน่วยงาน' },
          { id: 'settings_budget', label: 'ตั้งค่างบประมาณ' },
          { id: 'settings_form', label: 'แก้ไขแบบฟอร์ม' },
      ]},
      { key: 'reports', label: 'รายงาน', items: [
          { id: 'report_procurement', label: 'ดูรายงาน จัดซื้อ/จ้าง' },
          { id: 'report_budget_usage', label: 'ดูรายงานการใช้งบฯ' },
      ]},
    ];

    const isLandscape = viewingMemo?.type === 'disbursement';

    return (
        <div className="flex gap-6 -m-4 sm:-m-6 lg:-m-8" style={{minHeight: 'calc(100vh - 100px)'}}>
            <div className={`w-64 bg-[#2f353a] text-white flex-shrink-0 p-4 flex flex-col font-kanit ${viewingMemo ? 'no-print' : ''}`}>
                <div className="text-center mb-6 border-b border-gray-600 pb-4">
                    <h2 className="font-bold text-lg">ระบบสั่งซื้อ/จ้าง</h2>
                    <p className="text-xs text-gray-400">โรงเรียนกาฬสินธุ์ปัญญานุกูล</p>
                </div>
                <nav className="flex-grow space-y-2">
                    {menuGroups.map(group => (
                        <div key={group.key}>
                            {group.key !== 'main' && !viewingMemo ? (
                                <button 
                                    onClick={() => setIsSubmenuOpen(isSubmenuOpen === group.key ? null : group.key)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase flex justify-between items-center"
                                >
                                    {group.label}
                                    <svg className={`w-4 h-4 transition-transform ${isSubmenuOpen === group.key ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </button>
                            ) : null}
                            <div className={`space-y-1 ${viewingMemo ? 'hidden' : (group.key !== 'main' && isSubmenuOpen !== group.key ? 'hidden' : '')}`}>
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSubPage(item.id as SubPage)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSubPage === item.id ? 'bg-blue-600 font-semibold' : 'hover:bg-gray-700'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            <div className={`flex-grow p-6 bg-[#f4f6f9] overflow-y-auto ${viewingMemo ? `print-container ${isLandscape ? 'print-landscape-mode' : 'print-memo-mode'}` : ''}`}>
                {renderSubPage()}
            </div>
        </div>
    );
};

interface ProcurementMemoProps {
    record: ProcurementRecord;
    settings: Settings;
    onBack: () => void;
    isEditable?: boolean;
    fontFamily?: string;
}

const ProcurementMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => {
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/984268e97bdba24a5271a040112e2aef.jpg';
    const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);
    const vat = totalPrice * 0.0;
    const grandTotal = totalPrice + vat;

    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: บันทึกข้อความ (รายงานขอซื้อ)</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>

            <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '2cm', boxSizing: 'border-box' }}>
                <div className="text-center">
                    <img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-28 h-auto mx-auto" style={{ pointerEvents: isEditable ? 'none' : 'auto' }} />
                    <h2 className="font-bold text-2xl mt-4 editable-text" contentEditable={isEditable} suppressContentEditableWarning>บันทึกข้อความ</h2>
                </div>

                <div className="mt-6 text-base leading-relaxed">
                    <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่วนราชการ</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>โรงเรียนบ้านป่าเลา</span></p>
                    <div className="flex justify-between">
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ที่</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>............................................</span></p>
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{formatThaiDate(record.docDate)}</span></p>
                    </div>
                    <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรื่อง</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{record.subject}</span></p>
                </div>

                <div className="mt-4 border-t border-black pt-4">
                    <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรียน</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{record.recipient}</span></p>
                </div>

                <p className="mt-4 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>
                    ด้วย { record.department || 'กลุ่มงานบริหาร'} มีความประสงค์ขอดำเนินการจัดซื้อ/จัดจ้าง
                    เพื่อใช้ในการจัดการเรียนการสอน มีกำหนดใช้งานภายใน 3 วัน ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 56 วรรคหนึ่ง (2) (ข) และระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 22 ข้อ 79 ข้อ 25 (5) และกฎกระทรวงกำหนดวงเงินการจัดซื้อจัดจ้างพัสดุโดยวิธีเฉพาะเจาะจง วงเงินการจัดซื้อจัดจ้างที่ไม่ทำข้อตกลงเป็นหนังสือ และวงเงินการจัดซื้อจัดจ้างในการแต่งตั้งผู้ตรวจรับพัสดุ พ.ศ. 2560 ข้อ 1 และข้อ 5 0.00 บาท มีรายละเอียดดังนี้
                </p>

                <table className="w-full mt-4 border-collapse border border-black text-sm">
                    <thead>
                        <tr className="font-bold text-center">
                            <td className="border border-black p-1 w-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลำดับที่</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>รายการ พัสดุ / ซื้อ / จ้าง<br/>(ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</td>
                            <td className="border border-black p-1 editable-text" colSpan={2} contentEditable={isEditable} suppressContentEditableWarning>ปริมาณ</td>
                            <td className="border border-black p-1 editable-text" colSpan={2} contentEditable={isEditable} suppressContentEditableWarning>ราคา</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>หมายเหตุ</td>
                        </tr>
                        <tr className="font-bold text-center">
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1 w-16 editable-text" contentEditable={isEditable} suppressContentEditableWarning>จำนวน</td>
                            <td className="border border-black p-1 w-16 editable-text" contentEditable={isEditable} suppressContentEditableWarning>หน่วย</td>
                            <td className="border border-black p-1 w-24 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ต่อหน่วย</td>
                            <td className="border border-black p-1 w-24 editable-text" contentEditable={isEditable} suppressContentEditableWarning>เป็นเงิน</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {record.items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border border-black p-1 text-center editable-text" contentEditable={isEditable} suppressContentEditableWarning>{index + 1}</td>
                                <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.description}</td>
                                <td className="border border-black p-1 text-center editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.quantity}</td>
                                <td className="border border-black p-1 text-center editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.unit}</td>
                                <td className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.unitPrice.toFixed(2)}</td>
                                <td className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning></td>
                            </tr>
                        ))}
                         {[...Array(Math.max(0, 5 - record.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}><td className="border border-black p-1 h-8" colSpan={7}></td></tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="p-1 text-center font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiWords(grandTotal)}</td>
                            <td className="p-1 text-right font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>{grandTotal.toFixed(2)}</td>
                            <td className="p-1"></td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-6">
                    <p className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>จึงเรียนมาเพื่อโปรดพิจารณา</p>
                    <div className="flex ml-8 mt-2">
                        <p className="w-1/2 editable-text" contentEditable={isEditable} suppressContentEditableWarning>1.เห็นชอบในรายงานขอซื้อ</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2.แต่งตั้งบุคคลต่อไปนี้เป็นคณะกรรมการตรวจรับพัสดุ / ผู้ตรวจรับ</p>
                    </div>
                    <div className="ml-16 mt-2 space-y-1">
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2.1 นายทองคำ มากมี ตำแหน่ง ครู ......................................... ประธานกรรมการ/ผู้ตรวจรับ</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2.2 .................................... ตำแหน่ง ......................................... กรรมการ</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2.3 .................................... ตำแหน่ง ......................................... กรรมการ</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-end text-center text-sm">
                    <div className="w-1/3 space-y-6">
                        <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ ..........................................</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายวิมล พลคุณ)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เจ้าหน้าที่พัสดุ</p></div>
                        <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ ..........................................</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายกัญญา รัตน์ อ่าวย)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัวหน้าเจ้าหน้าที่พัสดุ</p></div>
                         <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ ..........................................</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นางนิธิวดี วรเดช)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>รองผู้อำนวยการกลุ่มบริหารงบประมาณ</p></div>
                    </div>
                    <div className="w-1/3"></div>
                    <div className="w-1/3 space-y-2">
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>1) เห็นชอบ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2) อนุมัติ</p>
                        <p className="mt-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ..........................................</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายสุรชัย โสภาพรม)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนบ้านป่าเลา</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่ {formatThaiDate(record.docDate)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ApprovalMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => {
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/984268e97bdba24a5271a040112e2aef.jpg';
    const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);

    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: บันทึกข้อความ (ขออนุมัติจัดซื้อ)</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>

            <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '2cm', boxSizing: 'border-box' }}>
                <div className="text-center"><img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-28 h-auto mx-auto" /><h2 className="font-bold text-2xl mt-4 editable-text" contentEditable={isEditable} suppressContentEditableWarning>บันทึกข้อความ</h2></div>
                
                <div className="mt-6 text-base leading-relaxed">
                    <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่วนราชการ</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>โรงเรียนบ้านป่าเลา</span></p>
                    <div className="flex justify-between">
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ที่</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>............................................</span></p>
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{formatThaiDate(record.docDate)}</span></p>
                    </div>
                    <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรื่อง</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ขออนุมัติจัดซื้อ</span></p>
                </div>

                <div className="mt-4 border-t border-black pt-4"><p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรียน</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนบ้านป่าเลา</span></p></div>

                <p className="mt-4 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>
                    ด้วย {record.department || 'กลุ่มสาระการเรียนรู้'} มีความประสงค์ขอดำเนินการจัดซื้อ เพื่อใช้ในการจัดการเรียนการสอน ซึ่งได้รับการอนุมัติเงินจาก......................... โดยใช้เงินอุดหนุนรายหัว จำนวนเงิน {totalPrice.toFixed(2)} บาท {toThaiWords(totalPrice)} (รายละเอียดดังแนบ)
                </p>
                <p className="mt-4 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>จึงเรียนมาเพื่อโปรดพิจารณา</p>
                
                <div className="mt-12 flex justify-end">
                    <div className="w-1/2 text-center space-y-2">
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................................</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>( นางสาววราวุฒิ ศรีใจ )</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัวหน้ากลุ่มสาระฯ/หัวหน้างาน</p>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-400 space-y-8">
                    {/* Policy Head */}
                    <div className="space-y-2">
                        <p className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ความเห็นของหัวหน้างานนโยบายและแผนงาน</p>
                        <div className="flex gap-6 ml-8">
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>☑ มีแผนปฏิบัติการประจำปีใช้เงิน อุดหนุนรายหัว</p>
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>☐ ไม่อยู่ในแผนปฏิบัติการ</p>
                        </div>
                        <div className="flex justify-end mt-4"><div className="w-1/2 text-center space-y-2">
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................................</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>( นางธารทิพย์ ธานะ )</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัวหน้างานนโยบายและแผนงาน</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{formatThaiDate(record.docDate)}</p>
                        </div></div>
                    </div>

                    {/* Deputy Director */}
                    <div className="space-y-2">
                        <p className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ความเห็นของรองผู้อำนวยการโรงเรียนกลุ่มบริหารการเงินและทรัพย์สิน</p>
                        <div className="flex gap-6 ml-8">
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>☐ เห็นควรอนุมัติ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>☐ เห็นควรไม่อนุมัติ</p>
                        </div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เหตุผล......................................................................................................................................</p>
                        <div className="flex justify-end mt-4"><div className="w-1/2 text-center space-y-2">
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................................</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>( นางนิธิวดี วรเดช )</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>รองผู้อำนวยการฯ กลุ่มบริหารงบประมาณ</p>
                        </div></div>
                    </div>

                    {/* Director */}
                    <div className="space-y-2">
                        <p className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ความเห็นของผู้อำนวยการโรงเรียนกลุ่มบริหารการเงินและทรัพย์สิน</p>
                        <div className="flex gap-6 ml-8">
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>☐ อนุมัติ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>☐ ไม่อนุมัติ</p>
                        </div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เหตุผล......................................................................................................................................</p>
                        <div className="flex justify-end mt-4"><div className="w-1/2 text-center space-y-2">
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................................</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>( นายสุรชัย โสภาพรม )</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนบ้านป่าเลา</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{formatThaiDate(record.docDate)}</p>
                        </div></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const ProcurementDetailsMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => {
    const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);
    const emptyRowsCount = 12;

    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: รายละเอียดพัสดุ</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>

            <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '2cm', boxSizing: 'border-box' }}>
                <div className="text-center">
                    <h2 className="font-bold text-xl mt-4 editable-text" contentEditable={isEditable} suppressContentEditableWarning>รายละเอียดรายการพัสดุจัดซื้อ/จัดจ้าง</h2>
                </div>

                <table className="w-full mt-6 border-collapse border border-black text-sm">
                    <thead>
                        <tr className="font-bold text-center">
                            <td rowSpan={2} className="border border-black p-1 w-12 align-bottom editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลำดับที่</td>
                            <td rowSpan={2} className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>รายการ พัสดุ / ซื้อ / จ้าง<br/>(ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</td>
                            <td colSpan={2} className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ปริมาณ</td>
                            <td colSpan={2} className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ราคา</td>
                            <td rowSpan={2} className="border border-black p-1 align-bottom editable-text" contentEditable={isEditable} suppressContentEditableWarning>หมายเหตุ</td>
                        </tr>
                        <tr className="font-bold text-center">
                            <td className="border border-black p-1 w-16 editable-text" contentEditable={isEditable} suppressContentEditableWarning>จำนวน</td>
                            <td className="border border-black p-1 w-16 editable-text" contentEditable={isEditable} suppressContentEditableWarning>หน่วย</td>
                            <td className="border border-black p-1 w-24 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ต่อหน่วย</td>
                            <td className="border border-black p-1 w-24 editable-text" contentEditable={isEditable} suppressContentEditableWarning>เป็นเงิน</td>
                        </tr>
                    </thead>
                    <tbody>
                        {record.items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border border-black p-1 text-center h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{index + 1}</td>
                                <td className="border border-black p-1 h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.description}</td>
                                <td className="border border-black p-1 text-center h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.quantity}</td>
                                <td className="border border-black p-1 text-center h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.unit}</td>
                                <td className="border border-black p-1 text-right h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.unitPrice.toFixed(2)}</td>
                                <td className="border border-black p-1 text-right h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                <td className="border border-black p-1 h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning></td>
                            </tr>
                        ))}
                        {[...Array(Math.max(0, emptyRowsCount - record.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}><td className="border border-black p-1 h-8" colSpan={7}></td></tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="p-1 border-x border-black text-left font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>
                                (ส่วนลด 0.00 บาท จาก 0.00 บาท เหลือ 0.00 บาท) รวมมูลค่า
                            </td>
                            <td className="p-1 text-right font-bold border border-black editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td>
                            <td className="border-r border-black"></td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="p-1 border-x border-black text-right font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>สินค้าก่อนคิด VAT</td>
                            <td className="p-1 text-right font-bold border border-black editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td>
                            <td className="border-r border-black"></td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="p-1 border-x border-black text-right font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ภาษีมูลค่าเพิ่ม 0%</td>
                            <td className="p-1 text-right font-bold border border-black editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td>
                            <td className="border-r border-black"></td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="p-1 border border-black text-right font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>รวมทั้งสิ้น</td>
                            <td className="p-1 text-right font-bold border border-black editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td>
                            <td className="border-r border-b border-black"></td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-8 flex justify-between items-start text-sm leading-relaxed">
                    <div className="w-1/2 text-center space-y-1">
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ .......................................... ผู้ขออนุมัติจัดซื้อ</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายทองคำ มากมี)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{formatThaiDate(record.docDate)}</p>
                    </div>
                    <div className="w-1/2 space-y-1">
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>โดยเสนอรายชื่อกรรมการตรวจรับพัสดุ/ผู้ตรวจรับ ดังนี้</p>
                        <div className="ml-4">
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>1. นายทองคำ มากมี ................ ประธานกรรมการ/ผู้ตรวจรับ</p>
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2. ........................................................... กรรมการ</p>
                            <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>3. ........................................................... กรรมการ</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ===================================
// NEW FORMS ADDED BELOW
// ===================================

const PaymentMemo: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => {
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/984268e97bdba24a5271a040112e2aef.jpg';
    const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);

    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: บันทึกข้อความ (ขออนุมัติจ่ายเงิน)</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>
             <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '2cm', boxSizing: 'border-box' }}>
                <div className="text-center"><img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-28 h-auto mx-auto" /><h2 className="font-bold text-2xl mt-4 editable-text" contentEditable={isEditable} suppressContentEditableWarning>บันทึกข้อความ</h2></div>
                <div className="mt-6 text-base leading-relaxed">
                    <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่วนราชการ</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>โรงเรียนบ้านป่าเลา</span></p>
                    <div className="flex justify-between">
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ที่</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>............................................</span></p>
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{formatThaiDate(record.docDate)}</span></p>
                    </div>
                    <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรื่อง</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ขออนุมัติจ่ายเงินค่าพัสดุ</span></p>
                </div>

                <div className="mt-4 border-t border-black pt-4"><p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรียน</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนบ้านป่าเลา</span></p></div>

                <p className="mt-4 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>
                    ตามที่งานพัสดุโรงเรียนบ้านป่าเลา ได้จัดซื้อพัสดุ จำนวน {record.items.length} รายการเป็นเงิน {totalPrice.toFixed(2)} บาท ({toThaiWords(totalPrice)})
                    บัดนี้ผู้ส่งของได้ส่งของตาม ใบส่งของ/ใบแจ้งบิล/ใบเสร็จรับเงิน เล่มที่/เลขที่ ............ ลงวันที่ {formatThaiDate(record.docDate)} และคณะกรรมการตรวจรับพัสดุเรียบร้อยแล้ว
                </p>
                 <p className="mt-4 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>จึงเรียนมาเพื่อโปรด ☐ ร้าน TMTM ☐ ผู้ขาย ☐ ผู้จ่าย อนุมัติจ่ายเงินให้แก่ ................................................</p>
                <div className="flex justify-end mt-4"><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เป็นเงิน {toThaiWords(totalPrice)}</p></div>

                <table className="w-full mt-4 text-base">
                    <tbody>
                        <tr><td className="w-1/2 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่วนลด {toThaiNumerals('0.00')} จาก {toThaiNumerals('0.00')}</td><td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>เหลือ {toThaiNumerals('0.00')} บาท</td></tr>
                        <tr><td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>มูลค่าสินค้าหรือบริการ</td><td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('0.00')} บาท</td></tr>
                        <tr><td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>บวก ภาษีมูลค่าเพิ่ม</td><td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('0.00')} บาท</td></tr>
                        <tr><td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>จำนวนเงินทั้งสิ้น</td><td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('0.00')} บาท</td></tr>
                        <tr><td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัก ภาษี ณ ที่จ่าย</td><td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('0.00')} บาท</td></tr>
                        <tr><td className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>คงเหลือจ่ายจริง</td><td className="text-right font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('0.00')} บาท</td></tr>
                    </tbody>
                </table>
                <p className="text-center mt-2 editable-text" contentEditable={isEditable} suppressContentEditableWarning>({toThaiWords(0)})</p>

                <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
                    <div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................เจ้าหน้าที่การเงิน</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นางปิยธิดา อบมาลัย)</p>
                    </div>
                    <div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................รองผู้อำนวยการฯ</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นางนิธิวดี วรเดช)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>กลุ่มบริหารงบประมาณ</p>
                    </div>
                </div>
                 <div className="mt-8 text-center text-sm">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>1. ทราบ</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2. อนุมัติจ่ายเงิน</p>
                    <p className="mt-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................................</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นามีเกียรติ นาสมตรึก)</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนกาฬสินธุ์ปัญญานุกูล</p>
                </div>
            </div>
        </div>
    );
};

const DisbursementForm: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => {
     const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);
     const emptyRows = 10;
    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: ใบเบิกพัสดุ</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร (แนวนอน)</button>
                </div>
            </div>
            <div className="bg-white shadow-lg mx-auto print-area-memo landscape" style={{ boxSizing: 'border-box' }}>
                <div className="text-center"><h2 className="font-bold text-2xl editable-text" contentEditable={isEditable} suppressContentEditableWarning>ใบเบิกพัสดุ</h2></div>
                <div className="flex justify-between mt-4 text-base">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ที่................./..................</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>โรงเรียนกาฬสินธุ์ปัญญานุกูล</p>
                </div>
                <div className="flex justify-between mt-2 text-base">
                    <p></p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่ {formatThaiDate(record.docDate)}</p>
                </div>
                <p className="mt-4 text-base editable-text" contentEditable={isEditable} suppressContentEditableWarning>ข้าพเจ้าขอเบิกสิ่งของต่อไปนี้ เพื่อใช้ดำเนินงานการเรียนการสอนกลุ่มสาระ {toThaiNumerals(record.department || 'ไทย')} โดยใช้เงิน อุดหนุนรายหัว</p>

                 <table className="w-full mt-4 border-collapse border border-black text-sm">
                    <thead>
                        <tr className="font-bold text-center">
                            <td className="border border-black p-1 w-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลำดับที่</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>รายการ พัสดุ / ซื้อ / จ้าง<br/>(ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</td>
                            <td colSpan={2} className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ปริมาณ</td>
                            <td colSpan={2} className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ราคา</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>หมายเหตุ</td>
                        </tr>
                        <tr className="font-bold text-center">
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1 w-16 editable-text" contentEditable={isEditable} suppressContentEditableWarning>จำนวน</td><td className="border border-black p-1 w-16 editable-text" contentEditable={isEditable} suppressContentEditableWarning>หน่วย</td>
                            <td className="border border-black p-1 w-24 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ต่อหน่วย</td><td className="border border-black p-1 w-24 editable-text" contentEditable={isEditable} suppressContentEditableWarning>เป็นเงิน</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {record.items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border border-black p-1 text-center h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{index + 1}</td>
                                <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.description}</td>
                                <td className="border border-black p-1 text-center editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.quantity}</td>
                                <td className="border border-black p-1 text-center editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.unit}</td>
                                <td className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.unitPrice.toFixed(2)}</td>
                                <td className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning></td>
                            </tr>
                        ))}
                         {[...Array(Math.max(0, emptyRows - record.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}><td className="border border-black p-1 h-8" colSpan={7}></td></tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-between mt-8 text-sm">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ได้รับของถูกต้องครบถ้วนแล้ว</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>อนุมัติให้เบิกได้</p>
                </div>
                <div className="mt-20 grid grid-cols-4 gap-4 text-center text-sm">
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................ผู้เบิก</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(.......................................)</p></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................ผู้รับ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(.......................................)</p></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................ผู้สั่งจ่าย</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(.......................................)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัวหน้าหน่วยพัสดุ</p></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ.......................................ผู้อนุมัติ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(.......................................)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียน</p></div>
                </div>
            </div>
        </div>
    );
};

const ReceiptForm: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => {
    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: ใบตรวจรับพัสดุ</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>
            <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '1.5cm', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-start text-lg">
                    <h2 className="font-bold text-xl editable-text" contentEditable={isEditable} suppressContentEditableWarning>ใบตรวจรับพัสดุ</h2>
                    <div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ที่........./.........</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{settings.schoolName}</p>
                    </div>
                </div>
                <div className="text-right mt-2"><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่ {formatThaiDate(record.docDate)}</p></div>
                
                <div className="mt-4 space-y-2 text-base">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ด้วย บริษัท/ห้างหุ้นส่วน/ร้าน/หน่วยงาน {record.supplierName} ได้ส่งมอบพัสดุ {record.items.length} รายการ</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>☐ ตกลงราคา ☐ ใบสั่งซื้อเลขที่ .................. ลงวันที่ {formatThaiDate(record.docDate)} ครบกำหนดส่งมอบ 09 มกราคม 2569</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ไว้แก่โรงเรียนบ้านป่าเลา ตามรายการต่อไปนี้</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เพื่อให้คณะกรรมการตรวจรับพัสดุ ทำการตรวจรับแล้ว ปรากฏผล ดังนี้</p>
                    <ol className="list-decimal list-inside ml-4 space-y-1">
                        <li className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ครบกำหนดส่งมอบ วันที่ 09 มกราคม 2569</li>
                        <li className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่งมอบเมื่อ วันที่ {formatThaiDate(record.docDate)}</li>
                        <li className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ได้ตรวจรับพัสดุตาม ใบส่งของ/ใบแจ้งหนี้/ใบเสร็จรับเงิน เล่มที่/เลขที่..........................................ลงวันที่ {formatThaiDate(record.docDate)} ณ โรงเรียนบ้านป่าเลา</li>
                        <li className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ได้ตรวจรับและให้ถือว่า [☑] ถูกต้อง จำนวน {record.items.length} รายการ [☐] ไม่ถูกต้อง จำนวน ........................ รายการ</li>
                        <li className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ได้เชิญผู้ชำนาญการหรือผู้ทรงคุณวุฒิมาปรึกษาด้วย คือ นายธิติ ทรงสมบูรณ์</li>
                        <li className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ได้มอบไว้ให้แก่ เจ้าหน้าที่พัสดุ</li>
                    </ol>
                    <p className="pt-2 editable-text" contentEditable={isEditable} suppressContentEditableWarning>จึงรายงานต่อผู้อำนวยการโรงเรียน เพื่อโปรดทราบผลการตรวจรับ ตามนัยข้อ 175 แห่งระเบียบสำนักนายกรัฐมนตรีว่าด้วยการพัสดุ พ.ศ. 2535 และที่แก้ไขเพิ่มเติม และระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560</p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-x-4 text-sm text-center">
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ลงชื่อ)....................................ประธานกรรมการ/ผู้ตรวจรับ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายทองคำ มากมี)</p></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ลงชื่อ)....................................กรรมการ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(...................................)</p></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ลงชื่อ)....................................กรรมการ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(...................................)</p></div>
                </div>
                
                <div className="mt-4 pt-4 border-t-2 border-dashed">
                    <div className="flex justify-between">
                        <p className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรียนผู้อำนวยการโรงเรียนกาฬสินธุ์ปัญญานุกูล</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่วนลด 0.00 จาก 0.00</p>
                    </div>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>คณะกรรมการตรวจรับพัสดุถูกต้องและได้มอบพัสดุดังกล่าวแล้วซึ่งจะต้องจ่ายเงิน ให้แก่ผู้ขายเป็นเงิน 0.00 บาท</p>
                    <div className="mt-2 grid grid-cols-2 text-sm">
                        <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>มูลค่าสินค้าหรือบริการ</span><span className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00 บาท</span>
                        <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>บวก ภาษีมูลค่าเพิ่ม</span><span className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00 บาท</span>
                        <span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>จำนวนเงินทั้งสิ้น</span><span className="text-right font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00 บาท</span>
                        <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัก ภาษี ณ ที่จ่าย</span><span className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>- บาท</span>
                        <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ค่าปรับ</span><span className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>- บาท</span>
                        <span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>คงเหลือจ่ายจริง</span><span className="text-right font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00 บาท</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-y-8 gap-x-4 text-center text-sm">
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ลงชื่อ)...................................เจ้าหน้าที่พัสดุ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายวิมล พลคุณ)</p></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เห็นชอบ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ลงชื่อ)...................................อนุมัติ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายสุรชัย โสภาพรม)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนบ้านป่าเลา</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{formatThaiDate(record.docDate)}</p></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ลงชื่อ)...................................หัวหน้าเจ้าหน้าที่พัสดุ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายกัญญารัตน์ อำนวย)</p></div>
                    <div></div>
                    <div><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ลงชื่อ)...................................รองผู้อำนวยการฯ</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นางนิธิวดี วรเดช)</p><p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>กลุ่มบริหารงบประมาณ</p></div>
                </div>
            </div>
        </div>
    );
};
const PurchaseOrder: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => { 
    const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);
    const emptyRowsCount = 10;
    
    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: ใบสั่งซื้อ/จ้าง</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>
            <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '1.5cm', boxSizing: 'border-box' }}>
                <div className="grid grid-cols-3 text-sm">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เลขที่</p>
                    <p className="font-bold text-center text-lg editable-text" contentEditable={isEditable} suppressContentEditableWarning>ใบสั่งซื้อ</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เขียนที่ {settings.schoolName}</p>
                    <p></p><p></p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่ {formatThaiDate('06/01/2569')}</p>
                </div>
                <p className="mt-4 editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรื่อง {record.subject}</p>
                <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรียน ร้าน {record.supplierName}</p>
                <p className="mt-2 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>
                    เนื่องด้วย {settings.schoolName} โดยได้รับมอบอำนาจจากสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน มีความประสงค์จะซื้อสิ่งของจากท่าน ตามที่ตกลงราคา ตามรายการดังต่อไปนี้
                </p>

                <table className="w-full mt-4 border-collapse border border-black text-sm">
                    <thead>
                        <tr className="font-bold text-center">
                            <td className="border border-black p-1 w-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลำดับที่</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>รายการ พัสดุ / ซื้อ / จ้าง<br/>(ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ปริมาณ<br/>หน่วย</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ราคา<br/>ต่อหน่วย</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>เป็นเงิน</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>หมายเหตุ</td>
                        </tr>
                    </thead>
                    <tbody>
                        {record.items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border border-black p-1 text-center h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{index + 1}</td>
                                <td className="border border-black p-1 h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.description}</td>
                                <td className="border border-black p-1 text-center h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.quantity} {item.unit}</td>
                                <td className="border border-black p-1 text-right h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{item.unitPrice.toFixed(2)}</td>
                                <td className="border border-black p-1 text-right h-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                <td className="border border-black p-1 h-8"></td>
                            </tr>
                        ))}
                        {[...Array(Math.max(0, emptyRowsCount - record.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}><td className="border border-black p-1 h-8" colSpan={6}></td></tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold">
                            <td colSpan={3} className="border border-black p-1 text-center editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ส่วนลด {toThaiNumerals('0.00')} บาท จาก {toThaiNumerals('0.00')} บาท) รวมมูลค่า</td>
                            <td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td>
                            <td className="border border-black p-1"></td>
                        </tr>
                        <tr className="font-bold"><td colSpan={3} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>สินค้าก่อนคิด VAT</td><td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td><td className="border border-black p-1"></td></tr>
                        <tr className="font-bold"><td colSpan={3} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>ภาษีมูลค่าเพิ่ม 0 %</td><td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td><td className="border border-black p-1"></td></tr>
                        <tr className="font-bold"><td colSpan={3} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>รวมทั้งสิ้น</td><td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td><td className="border border-black p-1"></td></tr>
                    </tfoot>
                </table>

                <p className="mt-4 editable-text" contentEditable={isEditable} suppressContentEditableWarning>จึงขอให้ท่านส่งมอบพัสดุดังกล่าวให้ {settings.schoolName} ณ ห้องพัสดุโรงเรียนบ้านป่าเลา ภายในวันที่ 09 มกราคม 2569</p>
                <div className="mt-2 text-sm space-y-1">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ถ้าส่งมอบพัสดุเกินเวลาที่กำหนด ผู้ขายจะต้องชำระค่าปรับเป็นรายวันในอัตราร้อยละ 0.2 ของราคาสิ่งของที่ยังมิได้รับมอบ</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>จนกว่าจะได้รับมอบถูกต้องครบถ้วน</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ในกรณีที่ไม่สามารถปฏิบัติตามใบสั่งซื้อได้ และจะต้องมีการปรับตามใบสั่งซื้อ หากจำนวนเงินค่าปรับจะเกินร้อยละ 10 ของวงเงินค่าพัสดุที่จะซื้อ ผู้ขายอาจพิจารณาดำเนินการบอกเลิกใบสั่งซื้อได้เท่าที่จำเป็น</p>
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-8 text-center text-sm">
                    <div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ .......................................... ผู้สั่งซื้อ</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายทองคำ มากมี)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัวหน้าเจ้าหน้าที่พัสดุโรงเรียน</p>
                    </div>
                     <div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>.......................................... ผู้ขาย</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(..........................................)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>................/................/................</p>
                    </div>
                </div>
            </div>
        </div>
    ); 
};
const QuotationForm: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => { 
    const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);
    const emptyRowsCount = 10;
    
    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: ใบเสนอราคา</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>
            <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '1.5cm', boxSizing: 'border-box' }}>
                <h2 className="text-center font-bold text-2xl editable-text" contentEditable={isEditable} suppressContentEditableWarning>ใบเสนอราคา</h2>
                <div className="mt-4 text-sm space-y-1">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรียน ผู้อำนวยการโรงเรียนบ้านป่าเลา</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>1. ข้าพเจ้า ร้าน TMTM ที่อยู่ 127 หมู่ 1 ตำบลกุดสิมคุ้มเก่า อำเภอเขาวง จังหวัดกาฬสินธุ์</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เลขประจำตัวผู้เสียภาษี/เลขประจำตัวประชาชน 3320700067584 ข้าพเจ้าเป็นผู้มีคุณสมบัติครบถ้วนตามที่กำหนดและไม่เป็นผู้ทิ้งงานราชการ</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2. ข้าพเจ้าขอเสนอราคาพัสดุ รวมทั้งบริการ ซึ่งกำหนดไว้ตามราคาและเวลาส่งมอบ ดังต่อไปนี้ ซึ่งเป็นราคาที่รวมภาษีมูลค่าเพิ่มภาษีอากรอื่นๆและค่าใช้จ่ายทั้งปวงไว้ด้วยแล้ว</p>
                </div>

                <table className="w-full mt-4 border-collapse border border-black text-sm">
                     <thead>
                        <tr className="font-bold text-center">
                            <td className="border border-black p-1 w-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลำดับที่</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>รายการ พัสดุ / ซื้อ / จ้าง<br/>(ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ปริมาณ<br/>จำนวน หน่วย</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ราคา<br/>ต่อหน่วย</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>เป็นเงิน</td>
                            <td className="border border-black p-1 editable-text" contentEditable={isEditable} suppressContentEditableWarning>หมายเหตุ</td>
                        </tr>
                    </thead>
                     <tbody>
                        {[...Array(emptyRowsCount)].map((_, i) => (
                            <tr key={`empty-${i}`}><td className="border border-black p-1 h-8" colSpan={6}></td></tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold"><td colSpan={3} className="border border-black p-1 text-center editable-text" contentEditable={isEditable} suppressContentEditableWarning>(ส่วนลด 10.00 บาท จาก 0.00 บาท เหลือ -10.00 บาท) รวม</td><td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>-10.00</td><td className="border border-black p-1"></td></tr>
                        <tr className="font-bold"><td colSpan={3} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>มูลค่าสินค้าก่อนคิด VAT</td><td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>0.00</td><td className="border border-black p-1"></td></tr>
                        <tr className="font-bold"><td colSpan={3} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>ภาษีมูลค่าเพิ่ม 0 %</td><td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>-10.00</td><td className="border border-black p-1"></td></tr>
                        <tr className="font-bold"><td colSpan={3} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>รวมทั้งสิ้น</td><td colSpan={2} className="border border-black p-1 text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>ร้อยสิบสี่บาท</td><td className="border border-black p-1"></td></tr>
                    </tfoot>
                </table>
                
                <div className="mt-4 text-sm space-y-1">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>3. คำเสนอนี้จะยืนอยู่เป็นระยะเวลา 30 วันนับแต่วันที่ได้ยื่นใบเสนอราคา</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>4. กำหนดส่งมอบพัสดุตามรายการข้างต้น ภายใน 3 วันนับถัดจากวันลงนามซื้อ</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เสนอมา ณ วันที่ 06 มกราคม 2569</p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-8 text-center text-sm">
                    <div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ..........................................</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายกัญญารัตน์ อำนวย)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัวหน้าเจ้าหน้าที่พัสดุโรงเรียน</p>
                    </div>
                     <div>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้ตก<br/>ราคา/ลงชื่อ..........................................ผู้<br/>เสนอ<br/>รอง<br/>ราคา</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(..........................................)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ตำแหน่ง..........................................</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ประทับตราประจำห้าง/บริษัท</p>
                    </div>
                </div>
            </div>
        </div>
    ); 
};
const ApprovalRequestForm: React.FC<ProcurementMemoProps> = ({ record, settings, onBack, isEditable, fontFamily }) => {
    const GARUDA_IMAGE_URL = 'https://img5.pic.in.th/file/secure-sv1/984268e97bdba24a5271a040112e2aef.jpg';
    const totalPrice = useMemo(() => record.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [record.items]);
    const discount = 349.00; 
    const afterDiscount = totalPrice - discount;

    return (
        <div className="font-sarabun" style={{ fontFamily: fontFamily || 'Sarabun' }}>
            <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex justify-between items-center no-print">
                <h3 className="font-bold text-lg">แสดงตัวอย่าง: บันทึกข้อความ (ขออนุมัติจ่ายเงิน)</h3>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-md">ย้อนกลับ</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">พิมพ์เอกสาร</button>
                </div>
            </div>
            <div className="bg-white shadow-lg mx-auto print-area-memo" style={{ width: '210mm', minHeight: '297mm', padding: '2cm', boxSizing: 'border-box' }}>
                <div className="text-center">
                    <img src={GARUDA_IMAGE_URL} alt="ตราครุฑ" className="w-24 h-auto mx-auto" />
                </div>
                <div className="flex justify-between items-end mt-4">
                    <div className="text-lg">
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่วนราชการ</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>{settings.schoolName}</span></p>
                        <p><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>ที่</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>โรงเรียนบ้านป่าเลา</span></p>
                    </div>
                    <div className="text-lg text-right">
                        <p className="editable-text font-bold" contentEditable={isEditable} suppressContentEditableWarning>บันทึกข้อความ</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>วันที่ {formatThaiDate('28/12/2568')}</p>
                    </div>
                </div>
                <p className="text-lg mt-2"><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรื่อง</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ขออนุมัติจ่ายเงินค่าพัสดุ</span></p>
                <hr className="border-t-2 border-black my-2" />
                <p className="text-lg"><span className="font-bold editable-text" contentEditable={isEditable} suppressContentEditableWarning>เรียน</span> <span className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนบ้านป่าเลา</span></p>
                
                <p className="mt-4 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>
                    ตามที่งานพัสดุโรงเรียนบ้านป่าเลา ได้จัดซื้อพัสดุ จำนวน {toThaiNumerals(record.items.length)} รายการเป็นเงิน {toThaiNumerals(totalPrice.toFixed(2))} บาท ({toThaiWords(totalPrice)})
                    บัดนี้ ผู้ส่งของได้ส่งของตาม ใบส่งของ/ใบแจ้งหนี้/ใบเสร็จรับเงิน เล่มที่/เลขที่ ..........................
                    ลงวันที่ {formatThaiDate('28/12/2568')} และคณะกรรมการตรวจรับพัสดุเรียบร้อยแล้ว
                </p>

                <p className="mt-4 editable-text" style={{ textIndent: '2.5rem' }} contentEditable={isEditable} suppressContentEditableWarning>
                    จึงเรียนมาเพื่อโปรด <span className="inline-flex items-center mx-1"><input type="checkbox" defaultChecked className="mr-1" />ร้าน {record.supplierName}</span> อนุมัติจ่ายเงินให้แก่ ................................
                </p>

                <p className="mt-4 ml-8 editable-text" contentEditable={isEditable} suppressContentEditableWarning>เป็นเงิน {toThaiNumerals(totalPrice.toFixed(2))} บาท</p>

                <div className="mt-4 ml-16 w-3/4">
                    <table className="w-full text-lg">
                        <tbody>
                            <tr>
                                <td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ส่วนลด {toThaiNumerals(discount.toFixed(2))} จาก {toThaiNumerals(totalPrice.toFixed(2))}</td>
                                <td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>เหลือ {toThaiNumerals(afterDiscount.toFixed(2))} บาท</td>
                            </tr>
                            <tr>
                                <td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>มูลค่าสินค้าหรือบริการ</td>
                                <td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('3,141.00')} บาท</td>
                            </tr>
                            <tr>
                                <td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>บวก ภาษีมูลค่าเพิ่ม</td>
                                <td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('0.00')} บาท</td>
                            </tr>
                             <tr>
                                <td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>จำนวนเงินที่ขอเบิกทั้งสิ้น</td>
                                <td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('3,490.00')} บาท</td>
                            </tr>
                             <tr>
                                <td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>หัก ภาษี ณ ที่จ่าย</td>
                                <td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('0.00')} บาท</td>
                            </tr>
                             <tr>
                                <td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ค่าปรับ</td>
                                <td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>- บาท</td>
                            </tr>
                             <tr className="font-bold">
                                <td className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>คงเหลือจ่ายจริง</td>
                                <td className="text-right editable-text" contentEditable={isEditable} suppressContentEditableWarning>{toThaiNumerals('3,490.00')} บาท</td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="text-center mt-2 editable-text" contentEditable={isEditable} suppressContentEditableWarning>({toThaiWords(totalPrice)})</p>
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-8 text-center text-sm">
                     <div className="space-y-12">
                        <p className="mt-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ ..........................................</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นางปิยธิดา อบมาลัย)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>เจ้าหน้าที่การเงิน</p>
                    </div>
                     <div className="space-y-12">
                        <p className="mt-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ ..........................................</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นางนิธิวดี วรเดช)</p>
                        <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>รองผู้อำนวยการฯ กลุ่มบริหารงบประมาณ</p>
                    </div>
                </div>

                <div className="mt-8 text-center text-lg">
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>1. ทราบ</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>2. อนุมัติจ่ายเงิน</p>
                    <p className="mt-12 editable-text" contentEditable={isEditable} suppressContentEditableWarning>ลงชื่อ ..........................................</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>(นายมีเกียรติ นาสมตรึก)</p>
                    <p className="editable-text" contentEditable={isEditable} suppressContentEditableWarning>ผู้อำนวยการโรงเรียนกาฬสินธุ์ปัญญานุกูล</p>
                </div>

            </div>
        </div>
    );
};

export default SupplyPage;
