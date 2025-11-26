
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Document, Personnel, DocumentType, DocumentStatus } from '../types';
import { getDirectDriveImageSrc } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface GeneralDocsPageProps {
    currentUser: Personnel;
    personnel: Personnel[];
    documents: Document[];
    onSave: (doc: Document) => void;
    onDelete: (ids: number[]) => void;
    isSaving: boolean;
}

const GeneralDocsPage: React.FC<GeneralDocsPageProps> = ({ 
    currentUser, personnel, documents, onSave, onDelete, isSaving 
}) => {
    // Access Level: Admin or 'Pro' (e.g. Saraban) can manage docs.
    const isStaff = currentUser.role === 'admin' || currentUser.role === 'pro'; 
    const isDirector = currentUser.role === 'admin'; // Simplifying: Only Admin can "Sign" in this demo

    const [activeTab, setActiveTab] = useState<'incoming' | 'orders' | 'director_sign' | 'inbox'>('incoming');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
    
    const [currentDoc, setCurrentDoc] = useState<Partial<Document>>({});
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
    const [selectedRecipients, setSelectedRecipients] = useState<Set<number>>(new Set());

    // Signature Canvas Ref
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [endorseComment, setEndorseComment] = useState('');

    // --- Data Processing ---
    const incomingDocs = useMemo(() => documents.filter(d => d.type === 'incoming').sort((a, b) => b.id - a.id), [documents]);
    const orderDocs = useMemo(() => documents.filter(d => d.type === 'order').sort((a, b) => b.id - a.id), [documents]);
    
    const pendingSignDocs = useMemo(() => 
        documents.filter(d => d.type === 'incoming' && d.status === 'proposed').sort((a, b) => b.id - a.id)
    , [documents]);

    const myInboxDocs = useMemo(() => 
        documents.filter(d => d.recipients.includes(currentUser.id)).sort((a, b) => b.id - a.id)
    , [documents, currentUser.id]);

    const stats = useMemo(() => {
        return {
            totalIncoming: incomingDocs.length,
            totalOrders: orderDocs.length,
            pendingSign: pendingSignDocs.length,
            myInbox: myInboxDocs.length
        };
    }, [incomingDocs, orderDocs, pendingSignDocs, myInboxDocs]);

    // --- Handlers ---

    // 1. Edit/Create Handler
    const handleOpenEdit = (type: DocumentType, doc?: Document) => {
        if (doc) {
            setCurrentDoc(doc);
        } else {
            setCurrentDoc({
                type: type,
                number: '',
                date: new Date().toLocaleDateString('th-TH'),
                title: '',
                from: '',
                to: type === 'order' ? 'บุคลากรทุกคน' : 'ผู้อำนวยการโรงเรียน',
                status: type === 'order' ? 'distributed' : 'proposed', // Default status
                recipients: [],
                file: []
            });
        }
        setIsEditModalOpen(true);
    };

    const handleSaveDoc = (e: React.FormEvent) => {
        e.preventDefault();
        // Ensure type is correctly set from currentDoc state or fallback
        const docToSave: Document = {
            ...currentDoc as Document,
            id: currentDoc.id || Date.now(),
            createdDate: currentDoc.createdDate || new Date().toISOString(),
            // Ensure array fields are initialized
            recipients: currentDoc.recipients || [], 
            file: currentDoc.file || []
        } as Document; 
        
        onSave(docToSave);
        setIsEditModalOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCurrentDoc(prev => ({ ...prev, file: [e.target.files![0]] }));
        }
    };

    // 2. Signing Handler (Canvas)
    const handleOpenSign = (doc: Document) => {
        setSelectedDocId(doc.id);
        setEndorseComment('ทราบ / มอบงานสารบัญ'); // Default text
        setIsSignModalOpen(true);
        setTimeout(clearCanvas, 100); // Clear canvas after render
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.closePath();
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        if ((e as React.TouchEvent).touches) {
            const rect = canvas.getBoundingClientRect();
            return {
                offsetX: (e as React.TouchEvent).touches[0].clientX - rect.left,
                offsetY: (e as React.TouchEvent).touches[0].clientY - rect.top
            };
        }
        return {
            offsetX: (e as React.MouseEvent).nativeEvent.offsetX,
            offsetY: (e as React.MouseEvent).nativeEvent.offsetY
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleSaveSignature = () => {
        const doc = documents.find(d => d.id === selectedDocId);
        if (!doc) return;

        const canvas = canvasRef.current;
        const signatureImage = canvas ? canvas.toDataURL('image/png') : '';

        const updatedDoc: Document = {
            ...doc,
            status: 'endorsed',
            endorsement: {
                signature: signatureImage,
                comment: endorseComment,
                date: new Date().toLocaleDateString('th-TH'),
                signerName: `${currentUser.personnelTitle}${currentUser.personnelName}`
            }
        };
        onSave(updatedDoc);
        setIsSignModalOpen(false);
    };

    // 3. Distribution Handler
    const handleOpenDistribute = (doc: Document) => {
        setSelectedDocId(doc.id);
        setSelectedRecipients(new Set(doc.recipients));
        setIsDistributeModalOpen(true);
    };

    const handleSaveDistribution = () => {
        const doc = documents.find(d => d.id === selectedDocId);
        if (!doc) return;

        const updatedDoc: Document = {
            ...doc,
            recipients: Array.from(selectedRecipients),
            status: 'distributed'
        };
        onSave(updatedDoc);
        setIsDistributeModalOpen(false);
    };

    const toggleRecipient = (id: number) => {
        const newSet = new Set(selectedRecipients);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRecipients(newSet);
    };

    const toggleAllRecipients = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRecipients(new Set(personnel.map(p => p.id)));
        } else {
            setSelectedRecipients(new Set());
        }
    };

    // --- UI Components ---

    const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
        switch (status) {
            case 'draft': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">ร่าง</span>;
            case 'proposed': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">เสนอ ผอ.</span>;
            case 'endorsed': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">เกษียนแล้ว</span>;
            case 'distributed': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">แจ้งแล้ว</span>;
            default: return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{status}</span>;
        }
    };

    const FileLink: React.FC<{ file?: (File | string)[] }> = ({ file }) => {
        if (!file || file.length === 0) return <span className="text-gray-400 text-xs">ไม่มีไฟล์</span>;
        const url = getDirectDriveImageSrc(file[0]);
        return (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-red-600 hover:underline text-xs font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                PDF
            </a>
        );
    };

    const DocTable: React.FC<{ docs: Document[], type: DocumentType, showActions?: boolean }> = ({ docs, type, showActions = true }) => (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700 border-b">
                    <tr>
                        <th className="p-3 whitespace-nowrap">ที่ / ลงวันที่</th>
                        <th className="p-3">เรื่อง</th>
                        <th className="p-3 whitespace-nowrap">จาก / ถึง</th>
                        <th className="p-3 text-center">ไฟล์</th>
                        <th className="p-3 text-center">สถานะ</th>
                        {type === 'incoming' && <th className="p-3 text-center">การเกษียน</th>}
                        {showActions && <th className="p-3 text-center">จัดการ</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {docs.map(doc => (
                        <tr key={doc.id} className="hover:bg-blue-50 transition-colors">
                            <td className="p-3 whitespace-nowrap">
                                <div className="font-bold text-navy">{doc.number}</div>
                                <div className="text-xs text-gray-500">{doc.date}</div>
                            </td>
                            <td className="p-3 min-w-[200px]">{doc.title}</td>
                            <td className="p-3 whitespace-nowrap text-xs">
                                <div><span className="font-bold text-gray-500">จาก:</span> {doc.from}</div>
                                <div><span className="font-bold text-gray-500">ถึง:</span> {doc.to}</div>
                            </td>
                            <td className="p-3 text-center"><FileLink file={doc.file} /></td>
                            <td className="p-3 text-center"><StatusBadge status={doc.status} /></td>
                            {type === 'incoming' && (
                                <td className="p-3 text-xs">
                                    {doc.endorsement ? (
                                        <div className="bg-green-50 p-2 rounded border border-green-100 max-w-[150px]">
                                            <div className="font-bold text-green-800">{doc.endorsement.comment}</div>
                                            <div className="text-gray-500 mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {doc.endorsement.signerName}
                                            </div>
                                            {/* Mock signature display */}
                                            {doc.endorsement.signature && <img src={doc.endorsement.signature} alt="sig" className="h-6 mt-1 opacity-70" />}
                                        </div>
                                    ) : <span className="text-gray-400 text-center block">-</span>}
                                </td>
                            )}
                            {showActions && (
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={() => handleOpenEdit(type, doc)} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200" title="แก้ไข">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        {type === 'incoming' && doc.status === 'endorsed' && (
                                            <button onClick={() => handleOpenDistribute(doc)} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="ส่งหนังสือ">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            </button>
                                        )}
                                        <button onClick={() => { if(window.confirm('ลบ?')) onDelete([doc.id]) }} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="ลบ">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                    {docs.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Sidebar / Tabs */}
            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm">
                <button onClick={() => setActiveTab('incoming')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'incoming' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    หนังสือเข้า
                </button>
                <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    คำสั่ง
                </button>
                {isDirector && (
                    <button onClick={() => setActiveTab('director_sign')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'director_sign' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        รอลงนาม {stats.pendingSign > 0 && <span className="bg-white text-orange-600 text-xs rounded-full px-1.5">{stats.pendingSign}</span>}
                    </button>
                )}
                <button onClick={() => setActiveTab('inbox')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'inbox' ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                    หนังสือรับ {stats.myInbox > 0 && <span className="bg-white text-green-700 text-xs rounded-full px-1.5">{stats.myInbox}</span>}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                    <p className="text-sm text-gray-500">หนังสือเข้าทั้งหมด</p>
                    <p className="text-2xl font-bold text-navy">{stats.totalIncoming}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border border-yellow-100">
                    <p className="text-sm text-yellow-600">รอเกษียน/ลงนาม</p>
                    <p className="text-2xl font-bold text-yellow-700">{stats.pendingSign}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border border-green-100">
                    <p className="text-sm text-green-600">รับแล้ว (Inbox)</p>
                    <p className="text-2xl font-bold text-green-700">{stats.myInbox}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border border-blue-100">
                    <p className="text-sm text-blue-600">คำสั่งโรงเรียน</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.totalOrders}</p>
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-navy">
                        {activeTab === 'incoming' ? 'ทะเบียนหนังสือเข้า' : 
                         activeTab === 'orders' ? 'คำสั่งโรงเรียน' : 
                         activeTab === 'director_sign' ? 'หนังสือรอลงนาม/เกษียน' : 'หนังสือรับของฉัน'}
                    </h2>
                    {isStaff && (activeTab === 'incoming' || activeTab === 'orders') && (
                        <button 
                            onClick={() => handleOpenEdit(activeTab === 'orders' ? 'order' : 'incoming')} 
                            className="bg-primary-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            เพิ่ม{activeTab === 'incoming' ? 'หนังสือเข้า' : 'คำสั่ง'}
                        </button>
                    )}
                </div>

                {/* Filter Search */}
                <div className="mb-4">
                    <input 
                        type="text" 
                        placeholder="ค้นหาเลขที่, เรื่อง..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border rounded-lg px-4 py-2 w-full md:w-1/3 focus:ring-2 focus:ring-primary-blue"
                    />
                </div>

                {/* Content Tables */}
                {activeTab === 'incoming' && <DocTable docs={incomingDocs.filter(d => d.title.includes(searchTerm))} type="incoming" showActions={isStaff} />}
                {activeTab === 'orders' && <DocTable docs={orderDocs.filter(d => d.title.includes(searchTerm))} type="order" showActions={isStaff} />}
                {activeTab === 'inbox' && <DocTable docs={myInboxDocs.filter(d => d.title.includes(searchTerm))} type="incoming" showActions={false} />}
                
                {activeTab === 'director_sign' && (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-orange-50 text-orange-800 border-b border-orange-200">
                                <tr>
                                    <th className="p-3">ที่ / วันที่</th>
                                    <th className="p-3">เรื่อง</th>
                                    <th className="p-3">จาก</th>
                                    <th className="p-3 text-center">ไฟล์แนบ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingSignDocs.filter(d => d.title.includes(searchTerm)).map(doc => (
                                    <tr key={doc.id} className="hover:bg-orange-50/30">
                                        <td className="p-3 whitespace-nowrap">
                                            <div className="font-bold">{doc.number}</div>
                                            <div className="text-xs text-gray-500">{doc.date}</div>
                                        </td>
                                        <td className="p-3 font-medium">{doc.title}</td>
                                        <td className="p-3">{doc.from}</td>
                                        <td className="p-3 text-center"><FileLink file={doc.file} /></td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => handleOpenSign(doc)} 
                                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg shadow font-bold text-xs flex items-center gap-1 mx-auto"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                ลงนาม/เกษียน
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pendingSignDocs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">ไม่มีหนังสือรอลงนาม</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ---------------- MODALS ---------------- */}

            {/* 1. Add/Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentDoc.id ? 'แก้ไข' : 'เพิ่ม'}{currentDoc.type === 'incoming' ? 'หนังสือเข้า' : 'คำสั่ง'}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSaveDoc} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เลขที่หนังสือ/คำสั่ง</label>
                                    <input type="text" required value={currentDoc.number || ''} onChange={e => setCurrentDoc({...currentDoc, number: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ลงวันที่</label>
                                    <input type="text" required value={currentDoc.date || ''} onChange={e => setCurrentDoc({...currentDoc, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="วว/ดด/ปปปป" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">เรื่อง</label>
                                <input type="text" required value={currentDoc.title || ''} onChange={e => setCurrentDoc({...currentDoc, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">จาก (หน่วยงาน)</label>
                                    <input type="text" required value={currentDoc.from || ''} onChange={e => setCurrentDoc({...currentDoc, from: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">เรียน (ถึงใคร)</label>
                                    <input type="text" required value={currentDoc.to || ''} onChange={e => setCurrentDoc({...currentDoc, to: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">แนบไฟล์ (PDF)</label>
                                <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Sign/Endorse Modal */}
            {isSignModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
                        <div className="p-5 border-b bg-orange-500 text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                ลงนาม / เกษียนหนังสือ
                            </h3>
                            <button onClick={() => setIsSignModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-grow">
                            {/* Doc Details Summary */}
                            <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 text-sm">
                                <p><strong>เรื่อง:</strong> {documents.find(d => d.id === selectedDocId)?.title}</p>
                                <p><strong>จาก:</strong> {documents.find(d => d.id === selectedDocId)?.from} <strong>ถึง:</strong> {documents.find(d => d.id === selectedDocId)?.to}</p>
                                <div className="mt-2">
                                    <FileLink file={documents.find(d => d.id === selectedDocId)?.file} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ความเห็น / ข้อสั่งการ (เกษียนหนังสือ)</label>
                                    <textarea 
                                        value={endorseComment} 
                                        onChange={(e) => setEndorseComment(e.target.value)} 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" 
                                        rows={3}
                                    ></textarea>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ลายมือชื่อ (วาดในช่องสี่เหลี่ยม)</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative cursor-crosshair h-48 w-full">
                                        <canvas
                                            ref={canvasRef}
                                            className="w-full h-full block"
                                            width={600}
                                            height={200}
                                            onMouseDown={startDrawing}
                                            onMouseUp={stopDrawing}
                                            onMouseMove={draw}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchEnd={stopDrawing}
                                            onTouchMove={draw}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={clearCanvas} 
                                            className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs px-2 py-1 rounded"
                                        >
                                            ล้างลายเซ็น
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">ใช้นิ้ว หรือ เมาส์ วาดลายเซ็นลงในกรอบ</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setIsSignModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">ยกเลิก</button>
                            <button onClick={handleSaveSignature} className="px-6 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 shadow">ยืนยันการลงนาม</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Distribute Modal */}
            {isDistributeModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-blue-600 text-white rounded-t-xl">
                            <h3 className="text-xl font-bold">ส่งหนังสือ / แจ้งเวียน</h3>
                        </div>
                        <div className="p-4 flex-grow overflow-y-auto">
                            <div className="mb-3 flex justify-between items-center">
                                <span className="font-bold text-gray-700">เลือกผู้รับ:</span>
                                <label className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
                                    <input type="checkbox" onChange={toggleAllRecipients} checked={selectedRecipients.size === personnel.length} />
                                    เลือกทั้งหมด
                                </label>
                            </div>
                            <div className="space-y-1 max-h-64 overflow-y-auto border rounded p-2">
                                {personnel.map(p => (
                                    <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleRecipient(p.id)}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedRecipients.has(p.id)} 
                                            onChange={() => {}} // handled by div click
                                            className="rounded text-blue-600 pointer-events-none"
                                        />
                                        <span className="text-sm text-gray-700">{p.personnelTitle}{p.personnelName} ({p.position})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3">
                            <button onClick={() => setIsDistributeModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                            <button onClick={handleSaveDistribution} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700">ส่งหนังสือ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralDocsPage;
