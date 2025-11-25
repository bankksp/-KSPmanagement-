
import React, { useState, useMemo } from 'react';
import { Personnel, Settings, SupplyItem, SupplyRequest, SupplyRequestItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDirectDriveImageSrc } from '../utils';

interface SupplyPageProps {
    currentUser: Personnel;
    items: SupplyItem[];
    requests: SupplyRequest[];
    personnel: Personnel[];
    onUpdateItems: (items: SupplyItem[]) => void;
    onUpdateRequests: (requests: SupplyRequest[]) => void;
    onUpdatePersonnel: (person: Personnel) => void;
    settings: Settings;
    onSaveSettings: (settings: Settings) => void;
    // New Props for API integration
    onSaveItem?: (item: SupplyItem) => void;
    onDeleteItem?: (id: number) => void;
    onSaveRequest?: (req: SupplyRequest) => void;
    onUpdateRequestStatus?: (req: SupplyRequest) => void;
}

const SupplyPage: React.FC<SupplyPageProps> = ({
    currentUser, items, requests, personnel,
    onUpdateItems, onUpdateRequests, onUpdatePersonnel,
    settings, onSaveSettings,
    onSaveItem, onDeleteItem, onSaveRequest, onUpdateRequestStatus
}) => {
    const isAdmin = currentUser.role === 'admin';
    
    // Default View State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'requests' | 'stock' | 'items' | 'users' | 'manage_requests' | 'ledger' | 'settings'>('dashboard');

    // --- Stats Calculations ---
    const stats = useMemo(() => {
        // General
        const myRequests = requests.filter(r => r.requesterId === currentUser.id);
        const approvedRequests = requests.filter(r => r.status === 'approved');
        const pendingRequests = requests.filter(r => r.status === 'pending');
        const rejectedRequests = requests.filter(r => r.status === 'rejected');
        
        // Admin specific
        const totalValueRemaining = items.reduce((sum, item) => {
            // Calculate used stock for this item
            const used = approvedRequests.reduce((uSum, req) => {
                const line = req.items.find(i => i.itemId === item.id);
                return uSum + (line ? line.quantity : 0);
            }, 0);
            const remaining = item.initialStock + item.addedStock - used;
            return sum + (remaining * item.unitPrice);
        }, 0);

        const totalUsedItems = approvedRequests.reduce((sum, r) => sum + r.items.reduce((is, i) => is + i.quantity, 0), 0);
        const lowStockItems = items.filter(item => {
             const used = approvedRequests.reduce((uSum, req) => {
                const line = req.items.find(i => i.itemId === item.id);
                return uSum + (line ? line.quantity : 0);
            }, 0);
            const remaining = item.initialStock + item.addedStock - used;
            return remaining <= 5;
        });

        // Charts Data
        const statusData = [
            { name: 'อนุมัติ', value: approvedRequests.length, color: '#10B981' },
            { name: 'รออนุมัติ', value: pendingRequests.length, color: '#F59E0B' },
            { name: 'ปฏิเสธ', value: rejectedRequests.length, color: '#EF4444' },
        ];

        // Top Items (Admin)
        const itemUsage: Record<string, number> = {};
        approvedRequests.forEach(req => {
            req.items.forEach(i => {
                itemUsage[i.itemName] = (itemUsage[i.itemName] || 0) + i.quantity;
            });
        });
        const topItemsData = Object.entries(itemUsage)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        return {
            myTotal: myRequests.length,
            myApproved: myRequests.filter(r => r.status === 'approved').length,
            myPending: myRequests.filter(r => r.status === 'pending').length,
            myRejected: myRequests.filter(r => r.status === 'rejected').length,
            totalItems: items.length,
            totalValueRemaining,
            totalUsedItems,
            lowStockCount: lowStockItems.length,
            lowStockList: lowStockItems,
            statusData,
            topItemsData,
            approvedCount: approvedRequests.length,
            pendingCount: pendingRequests.length,
            rejectedCount: rejectedRequests.length
        };
    }, [items, requests, currentUser.id]);

    // --- Form States ---
    // Request Form
    const [requestForm, setRequestForm] = useState<{
        department: string,
        reason: string,
        items: { itemId: number, quantity: number }[]
    }>({
        department: '',
        reason: '',
        items: [{ itemId: 0, quantity: 1 }]
    });

    // Item Management Form
    const [itemForm, setItemForm] = useState<Partial<SupplyItem>>({
        code: '', name: '', unit: '', unitPrice: 0, initialStock: 0, addedStock: 0
    });
    const [isEditingItem, setIsEditingItem] = useState(false);
    
    // Restock Form
    const [restockForm, setRestockForm] = useState({ itemId: 0, quantity: 0 });

    // User Management Search
    const [userSearch, setUserSearch] = useState('');

    // --- Handlers ---

    // Request
    const handleAddRequestRow = () => {
        setRequestForm(prev => ({ ...prev, items: [...prev.items, { itemId: 0, quantity: 1 }] }));
    };
    const handleRemoveRequestRow = (index: number) => {
        setRequestForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };
    const handleRequestItemChange = (index: number, field: 'itemId' | 'quantity', value: number) => {
        setRequestForm(prev => {
            const newItems = [...prev.items];
            newItems[index] = { ...newItems[index], [field]: value };
            return { ...prev, items: newItems };
        });
    };
    
    const calculateCurrentStock = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return 0;
        const used = requests
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => {
                const line = r.items.find(i => i.itemId === itemId);
                return sum + (line ? line.quantity : 0);
            }, 0);
        return item.initialStock + item.addedStock - used;
    };

    const submitRequest = (e: React.FormEvent) => {
        e.preventDefault();
        // Validate Stock
        for (const line of requestForm.items) {
            if (line.itemId === 0) { alert('กรุณาเลือกพัสดุให้ครบถ้วน'); return; }
            const stock = calculateCurrentStock(line.itemId);
            if (line.quantity > stock) {
                alert(`พัสดุบางรายการมีจำนวนไม่พอ (รหัส: ${items.find(i=>i.id===line.itemId)?.code})`);
                return;
            }
            if (line.quantity <= 0) { alert('จำนวนต้องมากกว่า 0'); return; }
        }

        const newRequest: SupplyRequest = {
            id: Date.now(),
            date: new Date().toLocaleDateString('th-TH'),
            requesterId: currentUser.id,
            requesterName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            position: currentUser.position,
            department: requestForm.department,
            reason: requestForm.reason,
            status: 'pending',
            items: requestForm.items.map(line => {
                const item = items.find(i => i.id === line.itemId)!;
                return {
                    itemId: item.id,
                    itemName: item.name,
                    quantity: line.quantity,
                    unit: item.unit,
                    price: item.unitPrice
                };
            })
        };
        
        if (onSaveRequest) {
            onSaveRequest(newRequest);
        } else {
            onUpdateRequests([...requests, newRequest]); // Fallback
        }
        
        setRequestForm({ department: '', reason: '', items: [{ itemId: 0, quantity: 1 }] });
    };

    // Item Management
    const saveItem = (e: React.FormEvent) => {
        e.preventDefault();
        const newItem = { 
            ...itemForm, 
            id: itemForm.id || Date.now(), 
            addedStock: itemForm.addedStock || 0 
        } as SupplyItem;

        if (onSaveItem) {
            onSaveItem(newItem);
        } else {
            if (isEditingItem && itemForm.id) {
                onUpdateItems(items.map(i => i.id === itemForm.id ? newItem : i));
            } else {
                onUpdateItems([...items, newItem]);
            }
        }
        setItemForm({ code: '', name: '', unit: '', unitPrice: 0, initialStock: 0, addedStock: 0 });
        setIsEditingItem(false);
    };

    const deleteItem = (id: number) => {
        if(window.confirm('ยืนยันการลบพัสดุ?')) {
            if (onDeleteItem) {
                onDeleteItem(id);
            } else {
                onUpdateItems(items.filter(i => i.id !== id));
            }
        }
    };

    // Restock
    const handleRestock = () => {
        if(restockForm.itemId === 0 || restockForm.quantity <= 0) return;
        const item = items.find(i => i.id === Number(restockForm.itemId));
        if (item) {
            const updatedItem = { ...item, addedStock: item.addedStock + Number(restockForm.quantity) };
            if (onSaveItem) {
                onSaveItem(updatedItem);
            } else {
                onUpdateItems(items.map(i => i.id === item.id ? updatedItem : i));
            }
            alert('เพิ่มจำนวนสต็อกเรียบร้อย');
            setRestockForm({ itemId: 0, quantity: 0 });
        }
    };

    // Request Management (Admin)
    const handleApproveReject = (reqId: number, status: 'approved' | 'rejected') => {
        // If approving, check stock again strictly
        if (status === 'approved') {
            const req = requests.find(r => r.id === reqId);
            if(req) {
                for(const line of req.items) {
                    const stock = calculateCurrentStock(line.itemId);
                    if (line.quantity > stock) {
                        alert(`ไม่สามารถอนุมัติได้ เนื่องจากพัสดุ ${line.itemName} ไม่พอจ่าย`);
                        return;
                    }
                }
            }
        }
        
        const updatedReq = requests.find(r => r.id === reqId);
        if (updatedReq) {
            const finalReq = { ...updatedReq, status, approverName: currentUser.personnelName, approvedDate: new Date().toLocaleDateString('th-TH') };
            if (onUpdateRequestStatus) {
                onUpdateRequestStatus(finalReq);
            } else {
                onUpdateRequests(requests.map(r => r.id === reqId ? finalReq : r));
            }
        }
    };

    // Ledger Calculation Logic (unchanged)
    const ledgerData = useMemo(() => {
        return items.map(item => {
            const approvedLines = requests
                .filter(r => r.status === 'approved')
                .map(r => r.items.find(i => i.itemId === item.id))
                .filter(Boolean) as SupplyRequestItem[];
            
            const totalUsedQty = approvedLines.reduce((sum, l) => sum + l.quantity, 0);
            const openingValue = item.initialStock * item.unitPrice;
            const purchasedValue = item.addedStock * item.unitPrice;
            const usedValue = totalUsedQty * item.unitPrice;
            const remainingQty = item.initialStock + item.addedStock - totalUsedQty;
            const remainingValue = remainingQty * item.unitPrice;

            return {
                ...item,
                openingValue,
                purchasedValue,
                totalUsedQty,
                usedValue,
                remainingQty,
                remainingValue
            };
        });
    }, [items, requests]);

    // Ledger Totals (unchanged)
    const ledgerTotals = useMemo(() => {
        return ledgerData.reduce((acc, curr) => ({
            initialStock: acc.initialStock + curr.initialStock,
            openingValue: acc.openingValue + curr.openingValue,
            addedStock: acc.addedStock + curr.addedStock,
            purchasedValue: acc.purchasedValue + curr.purchasedValue,
            totalUsedQty: acc.totalUsedQty + curr.totalUsedQty,
            usedValue: acc.usedValue + curr.usedValue,
            remainingQty: acc.remainingQty + curr.remainingQty,
            remainingValue: acc.remainingValue + curr.remainingValue,
        }), { initialStock: 0, openingValue: 0, addedStock: 0, purchasedValue: 0, totalUsedQty: 0, usedValue: 0, remainingQty: 0, remainingValue: 0 });
    }, [ledgerData]);

    // Settings Handler
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                onSaveSettings({ ...settings, schoolLogo: reader.result as string });
            };
        }
    };

    return (
        <div className="space-y-6">
            {/* --- Sidebar / Menu Tabs --- */}
            <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-wrap gap-2 justify-center md:justify-start">
                {/* Teacher Menu */}
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    แดชบอร์ด
                </button>
                
                {!isAdmin && (
                    <>
                        <button onClick={() => setActiveTab('form')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'form' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            ขอเบิกพัสดุ
                        </button>
                        <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'requests' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ประวัติการเบิก
                        </button>
                    </>
                )}

                {isAdmin && (
                    <>
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            ผู้ใช้งาน
                        </button>
                        <button onClick={() => setActiveTab('items')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'items' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            จัดการพัสดุ
                        </button>
                        <button onClick={() => setActiveTab('manage_requests')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'manage_requests' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            อนุมัติคำขอ
                        </button>
                        <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'ledger' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            บัญชีพัสดุ
                        </button>
                        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'settings' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            ตั้งค่า
                        </button>
                    </>
                )}
                
                <button onClick={() => setActiveTab('stock')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'stock' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    พัสดุใกล้หมด
                </button>
            </div>

            {/* ================== DASHBOARD ================== */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Cards */}
                        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <p className="text-gray-500 text-xs">{isAdmin ? 'มูลค่าคงเหลือ' : 'ขอเบิกทั้งหมด'}</p>
                            <p className="text-2xl font-bold text-navy">{isAdmin ? stats.totalValueRemaining.toLocaleString() + ' บ.' : stats.myTotal}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl shadow border border-green-100">
                            <p className="text-green-600 text-xs">{isAdmin ? 'วัสดุใช้ไป (ชิ้น)' : 'อนุมัติแล้ว'}</p>
                            <p className="text-2xl font-bold text-green-700">{isAdmin ? stats.totalUsedItems.toLocaleString() : stats.myApproved}</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-xl shadow border border-yellow-100">
                            <p className="text-yellow-600 text-xs">{isAdmin ? 'คำขอรออนุมัติ' : 'รออนุมัติ'}</p>
                            <p className="text-2xl font-bold text-yellow-700">{isAdmin ? stats.pendingCount : stats.myPending}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl shadow border border-red-100">
                            <p className="text-red-600 text-xs">{isAdmin ? 'พัสดุใกล้หมด' : 'ปฏิเสธ'}</p>
                            <p className="text-2xl font-bold text-red-700">{isAdmin ? stats.lowStockCount : stats.myRejected}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-xl shadow h-80">
                            <h3 className="font-bold mb-4 text-gray-700">สถานะการเบิกจ่าย</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow h-80">
                            <h3 className="font-bold mb-4 text-gray-700">{isAdmin ? '10 อันดับพัสดุเบิกสูงสุด' : 'รายการเบิกของฉัน'}</h3>
                            {isAdmin ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.topItemsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={80} fontSize={12} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">กราฟแสดงข้อมูลส่วนตัว</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ================== REQUISITION FORM (User) ================== */}
            {activeTab === 'form' && !isAdmin && (
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-navy mb-6 border-b pb-2">แบบฟอร์มขอเบิกพัสดุ</h2>
                    <form onSubmit={submitRequest} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">วันที่</label>
                                <input type="text" value={new Date().toLocaleDateString('th-TH')} disabled className="w-full p-2 bg-gray-100 border rounded-lg text-gray-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ฝ่าย/กลุ่มสาระฯ/โครงการ</label>
                                <input type="text" required value={requestForm.department} onChange={e => setRequestForm({...requestForm, department: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อ-สกุล</label>
                                <input type="text" value={`${currentUser.personnelTitle}${currentUser.personnelName}`} disabled className="w-full p-2 bg-gray-100 border rounded-lg text-gray-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ตำแหน่ง</label>
                                <input type="text" value={currentUser.position} disabled className="w-full p-2 bg-gray-100 border rounded-lg text-gray-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">มีความจำเป็นต้องเบิกพัสดุเพื่อ</label>
                            <textarea required value={requestForm.reason} onChange={e => setRequestForm({...requestForm, reason: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-blue" rows={2}></textarea>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-bold mb-2">รายการพัสดุ</h3>
                            {requestForm.items.map((line, index) => {
                                const selectedItem = items.find(i => i.id === line.itemId);
                                const currentStock = selectedItem ? calculateCurrentStock(selectedItem.id) : 0;
                                
                                return (
                                    <div key={index} className="flex gap-2 mb-2 items-end">
                                        <div className="flex-grow">
                                            <label className="text-xs text-gray-500">เลือกพัสดุ</label>
                                            <select 
                                                value={line.itemId} 
                                                onChange={e => handleRequestItemChange(index, 'itemId', Number(e.target.value))}
                                                className="w-full p-2 border rounded-lg text-sm"
                                            >
                                                <option value={0}>-- เลือก --</option>
                                                {items.map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} (คงเหลือ: {calculateCurrentStock(item.id)} {item.unit})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs text-gray-500">รหัส</label>
                                            <input type="text" disabled value={selectedItem?.code || '-'} className="w-full p-2 bg-gray-100 border rounded-lg text-sm text-center" />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs text-gray-500">จำนวนขอเบิก</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max={currentStock}
                                                value={line.quantity} 
                                                onChange={e => handleRequestItemChange(index, 'quantity', Number(e.target.value))}
                                                className="w-full p-2 border rounded-lg text-sm text-center"
                                            />
                                        </div>
                                        <button type="button" onClick={() => handleRemoveRequestRow(index)} className="bg-red-100 text-red-500 p-2 rounded-lg hover:bg-red-200 mb-[1px]">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                );
                            })}
                            <button type="button" onClick={handleAddRequestRow} className="mt-2 text-sm text-primary-blue font-bold flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                เพิ่มรายการ
                            </button>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow">บันทึกใบขอเบิก</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ================== MY REQUESTS (User) ================== */}
            {activeTab === 'requests' && !isAdmin && (
                <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
                    <h2 className="text-xl font-bold text-navy mb-4">รายการขอเบิกของฉัน</h2>
                    <table className="w-full min-w-[600px] text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b text-sm text-gray-600">
                                <th className="p-3">วันที่</th>
                                <th className="p-3">ฝ่าย/โครงการ</th>
                                <th className="p-3">วัตถุประสงค์</th>
                                <th className="p-3">รายการ</th>
                                <th className="p-3 text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.filter(r => r.requesterId === currentUser.id).map(req => (
                                <tr key={req.id} className="border-b hover:bg-gray-50 text-sm">
                                    <td className="p-3">{req.date}</td>
                                    <td className="p-3">{req.department}</td>
                                    <td className="p-3">{req.reason}</td>
                                    <td className="p-3">
                                        <ul className="list-disc list-inside text-xs text-gray-600">
                                            {req.items.map((i, idx) => <li key={idx}>{i.itemName} x {i.quantity} {i.unit}</li>)}
                                        </ul>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                            req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {req.status === 'approved' ? 'อนุมัติ' : req.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ================== LOW STOCK (Shared) ================== */}
            {activeTab === 'stock' && (
                <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
                    <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        พัสดุที่หมดสต็อก/ใกล้หมด (น้อยกว่า 5)
                    </h2>
                    <table className="w-full min-w-[600px] text-left border-collapse">
                        <thead>
                            <tr className="bg-red-50 border-b border-red-200 text-sm text-red-800">
                                <th className="p-3">รหัส</th>
                                <th className="p-3">ชื่อพัสดุ</th>
                                <th className="p-3 text-right">คงเหลือ</th>
                                <th className="p-3">หน่วยนับ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.lowStockList.map(item => (
                                <tr key={item.id} className="border-b hover:bg-red-50 text-sm">
                                    <td className="p-3 font-mono">{item.code}</td>
                                    <td className="p-3 font-bold">{item.name}</td>
                                    <td className="p-3 text-right font-bold text-red-600">{calculateCurrentStock(item.id)}</td>
                                    <td className="p-3 text-gray-500">{item.unit}</td>
                                </tr>
                            ))}
                            {stats.lowStockList.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">ไม่มีรายการพัสดุใกล้หมด</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ================== MANAGE ITEMS (Admin) ================== */}
            {activeTab === 'items' && isAdmin && (
                <div className="space-y-6">
                    {/* Add/Edit Form */}
                    <div className="bg-white p-4 rounded-xl shadow border-l-4 border-purple-500">
                        <h3 className="font-bold text-lg mb-4">{isEditingItem ? 'แก้ไขข้อมูลพัสดุ' : 'เพิ่มพัสดุใหม่'}</h3>
                        <form onSubmit={saveItem} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div className="md:col-span-1">
                                <label className="block text-xs mb-1">รหัสพัสดุ</label>
                                <input type="text" required value={itemForm.code} onChange={e => setItemForm({...itemForm, code: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs mb-1">ชื่อพัสดุ</label>
                                <input type="text" required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs mb-1">หน่วยนับ</label>
                                <input type="text" required value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs mb-1">ราคา/หน่วย</label>
                                <input type="number" min="0" required value={itemForm.unitPrice} onChange={e => setItemForm({...itemForm, unitPrice: Number(e.target.value)})} className="w-full p-2 border rounded" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs mb-1">จำนวนเริ่มต้น</label>
                                <input type="number" min="0" required disabled={isEditingItem} value={itemForm.initialStock} onChange={e => setItemForm({...itemForm, initialStock: Number(e.target.value)})} className="w-full p-2 border rounded bg-gray-50" />
                            </div>
                            <div className="md:col-span-6 flex gap-2 justify-end mt-2">
                                {isEditingItem && <button type="button" onClick={() => {setIsEditingItem(false); setItemForm({code: '', name: '', unit: '', unitPrice: 0, initialStock: 0, addedStock: 0})}} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">ยกเลิก</button>}
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">บันทึกข้อมูล</button>
                            </div>
                        </form>
                    </div>

                    {/* Restock Form */}
                    <div className="bg-green-50 p-4 rounded-xl shadow border border-green-200 flex flex-wrap items-end gap-4">
                        <div className="flex-grow">
                            <label className="block text-xs mb-1 font-bold text-green-800">ซื้อเพิ่ม (Restock)</label>
                            <select value={restockForm.itemId} onChange={e => setRestockForm({...restockForm, itemId: Number(e.target.value)})} className="w-full p-2 border rounded">
                                <option value={0}>-- เลือกพัสดุ --</option>
                                {items.map(i => <option key={i.id} value={i.id}>{i.name} (คงเหลือ: {calculateCurrentStock(i.id)})</option>)}
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="block text-xs mb-1 text-green-800">จำนวนที่ซื้อ</label>
                            <input type="number" min="1" value={restockForm.quantity} onChange={e => setRestockForm({...restockForm, quantity: Number(e.target.value)})} className="w-full p-2 border rounded" />
                        </div>
                        <button onClick={handleRestock} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow">บันทึกการซื้อ</button>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-3">รหัส</th>
                                    <th className="p-3">ชื่อพัสดุ</th>
                                    <th className="p-3">หน่วยนับ</th>
                                    <th className="p-3 text-right">ราคา/หน่วย</th>
                                    <th className="p-3 text-right">คงเหลือ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50 text-sm">
                                        <td className="p-3">{item.code}</td>
                                        <td className="p-3">{item.name}</td>
                                        <td className="p-3">{item.unit}</td>
                                        <td className="p-3 text-right">{item.unitPrice}</td>
                                        <td className="p-3 text-right font-bold text-blue-600">{calculateCurrentStock(item.id)}</td>
                                        <td className="p-3 text-center flex justify-center gap-2">
                                            <button onClick={() => { setItemForm(item); setIsEditingItem(true); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                            <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================== MANAGE REQUESTS (Admin) ================== */}
            {activeTab === 'manage_requests' && isAdmin && (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-100 p-4 rounded-lg text-center border border-green-200">
                            <span className="block text-green-800 font-bold text-xl">{stats.approvedCount}</span>
                            <span className="text-green-600 text-sm">อนุมัติแล้ว</span>
                        </div>
                        <div className="bg-yellow-100 p-4 rounded-lg text-center border border-yellow-200">
                            <span className="block text-yellow-800 font-bold text-xl">{stats.pendingCount}</span>
                            <span className="text-yellow-600 text-sm">รออนุมัติ</span>
                        </div>
                        <div className="bg-red-100 p-4 rounded-lg text-center border border-red-200">
                            <span className="block text-red-800 font-bold text-xl">{stats.rejectedCount}</span>
                            <span className="text-red-600 text-sm">ปฏิเสธ</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-3">วันที่</th>
                                    <th className="p-3">ผู้เบิก/ตำแหน่ง</th>
                                    <th className="p-3">วัตถุประสงค์</th>
                                    <th className="p-3">รายการ</th>
                                    <th className="p-3 text-center">สถานะ/จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.sort((a,b) => b.id - a.id).map(req => (
                                    <tr key={req.id} className={`border-b text-sm ${req.status === 'pending' ? 'bg-yellow-50' : ''}`}>
                                        <td className="p-3">{req.date}</td>
                                        <td className="p-3">
                                            <div className="font-bold">{req.requesterName}</div>
                                            <div className="text-xs text-gray-500">{req.position}</div>
                                            <div className="text-xs text-gray-500">({req.department})</div>
                                        </td>
                                        <td className="p-3">{req.reason}</td>
                                        <td className="p-3">
                                            <ul className="list-disc list-inside text-xs text-gray-600">
                                                {req.items.map((i, idx) => <li key={idx}>{i.itemName} ({i.quantity} {i.unit})</li>)}
                                            </ul>
                                        </td>
                                        <td className="p-3 text-center">
                                            {req.status === 'pending' ? (
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleApproveReject(req.id, 'approved')} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">อนุมัติ</button>
                                                    <button onClick={() => handleApproveReject(req.id, 'rejected')} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">ปฏิเสธ</button>
                                                </div>
                                            ) : (
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {req.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================== LEDGER (Admin) ================== */}
            {activeTab === 'ledger' && isAdmin && (
                <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                        <div className="bg-white p-2 rounded shadow border">พัสดุทั้งหมด: <b>{stats.totalItems}</b></div>
                        <div className="bg-white p-2 rounded shadow border">มูลค่าคงเหลือ: <b>{stats.totalValueRemaining.toLocaleString()}</b></div>
                        <div className="bg-white p-2 rounded shadow border">วัสดุใช้ไป: <b>{stats.totalUsedItems}</b></div>
                        <div className="bg-white p-2 rounded shadow border text-red-600">ใกล้หมด: <b>{stats.lowStockCount}</b></div>
                    </div>

                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
                            <thead className="bg-gray-200 text-gray-700">
                                <tr>
                                    <th className="p-2 border" rowSpan={2}>รหัส</th>
                                    <th className="p-2 border" rowSpan={2}>รายการ</th>
                                    <th className="p-2 border text-center bg-blue-50" colSpan={4}>ยอดยกมา</th>
                                    <th className="p-2 border text-center bg-green-50" colSpan={3}>จัดซื้อ</th>
                                    <th className="p-2 border text-center bg-orange-50" colSpan={3}>วัสดุใช้ไป</th>
                                    <th className="p-2 border text-center bg-gray-50" colSpan={2}>วัสดุคงเหลือ</th>
                                </tr>
                                <tr>
                                    {/* Opening */}
                                    <th className="p-2 border bg-blue-50">จำนวน</th>
                                    <th className="p-2 border bg-blue-50">หน่วย</th>
                                    <th className="p-2 border bg-blue-50">ราคา</th>
                                    <th className="p-2 border bg-blue-50">รวมเงิน</th>
                                    {/* Purchase */}
                                    <th className="p-2 border bg-green-50">จำนวน</th>
                                    <th className="p-2 border bg-green-50">ราคา</th>
                                    <th className="p-2 border bg-green-50">รวมเงิน</th>
                                    {/* Used */}
                                    <th className="p-2 border bg-orange-50">จำนวน</th>
                                    <th className="p-2 border bg-orange-50">ราคา</th>
                                    <th className="p-2 border bg-orange-50">รวมเงิน</th>
                                    {/* Remaining */}
                                    <th className="p-2 border bg-gray-50">จำนวน</th>
                                    <th className="p-2 border bg-gray-50">รวมเงิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledgerData.map(row => (
                                    <tr key={row.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2 border">{row.code}</td>
                                        <td className="p-2 border">{row.name}</td>
                                        <td className="p-2 border text-right">{row.initialStock}</td>
                                        <td className="p-2 border text-center">{row.unit}</td>
                                        <td className="p-2 border text-right">{row.unitPrice}</td>
                                        <td className="p-2 border text-right">{row.openingValue.toLocaleString()}</td>
                                        <td className="p-2 border text-right">{row.addedStock}</td>
                                        <td className="p-2 border text-right">{row.unitPrice}</td>
                                        <td className="p-2 border text-right">{row.purchasedValue.toLocaleString()}</td>
                                        <td className="p-2 border text-right">{row.totalUsedQty}</td>
                                        <td className="p-2 border text-right">{row.unitPrice}</td>
                                        <td className="p-2 border text-right">{row.usedValue.toLocaleString()}</td>
                                        <td className="p-2 border text-right font-bold">{row.remainingQty}</td>
                                        <td className="p-2 border text-right font-bold">{row.remainingValue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-200 font-bold">
                                <tr>
                                    <td className="p-2 border text-center" colSpan={2}>รวมทั้งสิ้น</td>
                                    <td className="p-2 border text-right">{ledgerTotals.initialStock.toLocaleString()}</td>
                                    <td className="p-2 border"></td>
                                    <td className="p-2 border"></td>
                                    <td className="p-2 border text-right">{ledgerTotals.openingValue.toLocaleString()}</td>
                                    <td className="p-2 border text-right">{ledgerTotals.addedStock.toLocaleString()}</td>
                                    <td className="p-2 border"></td>
                                    <td className="p-2 border text-right">{ledgerTotals.purchasedValue.toLocaleString()}</td>
                                    <td className="p-2 border text-right">{ledgerTotals.totalUsedQty.toLocaleString()}</td>
                                    <td className="p-2 border"></td>
                                    <td className="p-2 border text-right">{ledgerTotals.usedValue.toLocaleString()}</td>
                                    <td className="p-2 border text-right">{ledgerTotals.remainingQty.toLocaleString()}</td>
                                    <td className="p-2 border text-right">{ledgerTotals.remainingValue.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ================== USERS (Admin) ================== */}
            {activeTab === 'users' && isAdmin && (
                <div className="bg-white p-6 rounded-xl shadow">
                    <h2 className="text-xl font-bold text-navy mb-4">จัดการผู้ใช้งานระบบพัสดุ</h2>
                    <div className="mb-4">
                        <input type="text" placeholder="ค้นหาชื่อ..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="p-2 border rounded w-full md:w-1/3" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-purple-50 border-b border-purple-200 text-sm text-purple-800">
                                <tr>
                                    <th className="p-3">ชื่อ-นามสกุล</th>
                                    <th className="p-3">ตำแหน่ง</th>
                                    <th className="p-3">สิทธิ์ (Role)</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {personnel
                                    .filter(p => `${p.personnelName}`.includes(userSearch))
                                    .map(p => (
                                    <tr key={p.id} className="border-b hover:bg-gray-50 text-sm">
                                        <td className="p-3">{p.personnelTitle}{p.personnelName}</td>
                                        <td className="p-3">{p.position}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${p.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {p.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครู (User)'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <select 
                                                value={p.role || 'user'} 
                                                onChange={e => onUpdatePersonnel({ ...p, role: e.target.value as 'user' | 'admin' | 'pro' })}
                                                className="border rounded p-1 text-xs"
                                            >
                                                <option value="user">ครู</option>
                                                <option value="admin">ผู้ดูแลระบบ</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================== SETTINGS (Admin) ================== */}
            {activeTab === 'settings' && isAdmin && (
                <div className="bg-white p-6 rounded-xl shadow max-w-lg mx-auto">
                    <h2 className="text-xl font-bold text-navy mb-4">ตั้งค่าระบบพัสดุ</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ชื่อโรงเรียน</label>
                            <input type="text" value={settings.schoolName} onChange={e => onSaveSettings({...settings, schoolName: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">โลโก้โรงเรียน</label>
                            <div className="flex items-center gap-4 mt-2">
                                <img src={getDirectDriveImageSrc(settings.schoolLogo)} className="h-16 w-16 object-contain border p-1 rounded" alt="Logo" />
                                <input type="file" onChange={handleLogoUpload} className="text-sm" />
                            </div>
                        </div>
                        <button onClick={() => onSaveSettings(settings)} className="w-full bg-primary-blue text-white font-bold py-2 rounded hover:bg-primary-hover">บันทึกการตั้งค่า</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplyPage;
