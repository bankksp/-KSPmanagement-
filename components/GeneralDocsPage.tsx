
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Document, Personnel, DocumentType, DocumentStatus, Endorsement } from '../types';
import { getDirectDriveImageSrc, getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, toThaiNumerals, safeParseArray, formatOnlyTime } from '../utils';

const sarabanMenus = [
  { title: 'หนังสือรับ', items: [ { id: 'incoming_list', label: 'ทะเบียนหนังสือรับ', icon: '📂' }, { id: 'incoming_new', label: 'ลงทะเบียนรับใหม่', icon: '🆕' } ] },
  { title: 'คำสั่ง', items: [ { id: 'order_list', label: 'ทะเบียนคำสั่ง', icon: '📜' }, { id: 'order_new', label: 'สร้างคำสั่งใหม่', icon: '🆕' } ] },
  { title: 'หนังสือส่ง', items: [ { id: 'outgoing_list', label: 'ทะเบียนหนังสือส่ง', icon: '📤' }, { id: 'outgoing_new', label: 'สร้างหนังสือส่งใหม่', icon: '🆕' } ] }
];

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
    // สิทธิ์เฉพาะ Admin หรือ ผู้ได้รับมอบหมายงานสารบัญ (isSarabanAdmin)
    const isStaff = currentUser.role === 'admin' || currentUser.isSarabanAdmin === true; 

    const [activeTab, setActiveTab] = useState<'incoming' | 'orders' | 'outgoing' | 'inbox' | 'dashboard'>('incoming');
    const [subPage, setSubPage] = useState<string>('incoming_list');
    
    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Zoom State
    const [zoomLevel, setZoomLevel] = useState(1.0);
    
    const [currentDoc, setCurrentDoc] = useState<Partial<Document>>({});
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [endorseComment, setEndorseComment] = useState('ทราบ / ดำเนินการตามเสนอ');
    const [delegateToId, setDelegateToId] = useState<number | null>(null);
    const [delegateName, setDelegateName] = useState<string>(''); // เก็บชื่อผู้ถูกมอบหมาย
    const [personSearch, setPersonSearch] = useState('');
    const [placedX, setPlacedX] = useState<number>(70); 
    const [placedY, setPlacedY] = useState<number>(80);
    const [isSettingPosition, setIsSettingPosition] = useState(false);
    const [endorseScale, setEndorseScale] = useState<number>(1.0); // ขนาดเกษียนหนังสือใน Modal

    const myInboxDocs = useMemo(() => documents.filter(d => d.recipients.includes(currentUser.id)).sort((a, b) => b.id - a.id), [documents, currentUser.id]);
    const myTasks = useMemo(() => {
        const directorTasks = (currentUser.role === 'admin') ? documents.filter(d => d.status === 'proposed') : [];
        const assignedTasks = documents.filter(d => d.assignedTo === currentUser.id && d.status === 'delegated');
        return Array.from(new Set([...directorTasks, ...assignedTasks])).sort((a, b) => b.id - a.id);
    }, [documents, currentUser]);

    const filteredPersonnel = useMemo(() => {
        if (!personSearch) return personnel.slice(0, 10);
        return personnel.filter(p => `${p.personnelTitle}${p.personnelName}`.includes(personSearch) || p.position.includes(personSearch)).slice(0, 10);
    }, [personnel, personSearch]);

    const handleSubNav = (id: string) => {
        if (id.endsWith('_new') && !isStaff) {
            alert('คุณไม่มีสิทธิ์เข้าถึงเมนูนี้ เฉพาะผู้รับผิดชอบงานสารบัญหรือผู้ดูแลระบบเท่านั้น');
            return;
        }

        setSubPage(id);
        if (id.includes('incoming')) setActiveTab('incoming');
        else if (id.includes('order')) setActiveTab('orders');
        else if (id.includes('outgoing')) setActiveTab('outgoing');
        
        if (id.endsWith('_new')) handleOpenEdit(id.split('_')[0] as DocumentType);
    };

    const handleOpenEdit = (type: DocumentType, doc?: Document) => {
        if (!doc && !isStaff) return;

        if (doc) setCurrentDoc(doc); 
        else {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
            let nextReceiveNo = '';
            if (type === 'incoming') {
                const incomingDocs = documents.filter(d => d.type === 'incoming');
                const maxNo = incomingDocs.reduce((max, d) => {
                    const num = parseInt(d.receiveNo || '0');
                    return isNaN(num) ? max : Math.max(max, num);
                }, 0);
                nextReceiveNo = (maxNo + 1).toString();
            }
            setCurrentDoc({
                type, 
                receiveNo: nextReceiveNo, 
                number: type === 'incoming' ? 'ศธ 04007.06/' : '', 
                date: getCurrentThaiDate(), 
                receiveDate: getCurrentThaiDate(), 
                receiveTime: timeStr, 
                title: '', 
                from: type === 'incoming' ? 'สำนักบริหารงานการศึกษาพิเศษ' : '', 
                to: 'ผู้อำนวยการโรงเรียนกาฬสินธุ์ปัญญานุกูล',
                status: 'proposed', 
                recipients: [], 
                file: [], 
                showStamp: true,
                totalPages: 1,
                signatoryPage: 1,
                note: '',
                stampScale: 1.0 // Default scale for stamp
            });
        }
        setIsEditModalOpen(true);
    };

    const handleOpenView = (doc: Document) => {
        setCurrentDoc(doc);
        setZoomLevel(1.0);
        setIsViewModalOpen(true);
    };

    const handleSaveDoc = (e: React.FormEvent) => {
        e.preventDefault();
        const docToSave = { 
            ...currentDoc, 
            id: currentDoc.id || Date.now(), 
            createdDate: currentDoc.createdDate || getCurrentThaiDate(), 
            status: currentDoc.status || 'proposed', 
            recipients: currentDoc.recipients || [],
            totalPages: Number(currentDoc.totalPages) || 1,
            signatoryPage: Number(currentDoc.signatoryPage) || 1,
            stampScale: Number(currentDoc.stampScale) || 1.0
        } as Document;
        onSave(docToSave);
        setIsEditModalOpen(false);
    };

    const handleOpenSign = (doc: Document) => {
        setSelectedDocId(doc.id);
        setEndorseComment('ทราบ / ดำเนินการตามเสนอ');
        setDelegateToId(null);
        setDelegateName('');
        setPersonSearch('');
        setIsSettingPosition(false);
        setEndorseScale(1.0);
        setIsSignModalOpen(true);
        setTimeout(clearCanvas, 100); 
    };

    const handleDocumentClickForPlacement = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isSettingPosition) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPlacedX(x);
        setPlacedY(y);
    };

    const handleSaveSignature = () => {
        const doc = documents.find(d => d.id === selectedDocId);
        if (!doc) return;
        const canvas = canvasRef.current;
        const signatureImage = canvas ? canvas.toDataURL('image/png') : '';
        
        const newEndorsement: Endorsement = { 
            signature: signatureImage, 
            comment: endorseComment, 
            date: getCurrentThaiDate(), 
            signerName: `${currentUser.personnelTitle}${currentUser.personnelName}`, 
            signerPosition: currentUser.position, 
            posX: placedX, 
            posY: placedY,
            scale: endorseScale,
            assignedName: delegateName 
        };

        // เพิ่ม ID ของผู้ลงนามเข้าในรายชื่อผู้เกี่ยวข้อง (recipients) เพื่อให้แสดงผลใน "หนังสือถึงฉัน"
        const currentRecipients = safeParseArray(doc.recipients);
        const updatedRecipients = Array.from(new Set([...currentRecipients, currentUser.id]));

        const updatedDoc: Document = { 
            ...doc, 
            status: delegateToId ? 'delegated' : 'endorsed', 
            assignedTo: delegateToId || undefined, 
            endorsements: [...safeParseArray(doc.endorsements), newEndorsement],
            recipients: updatedRecipients
        };
        
        onSave(updatedDoc);
        setIsSignModalOpen(false);
    };

    const zoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(prev => Math.min(prev + 0.2, 3.0)); };
    const zoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(prev => Math.max(prev - 0.2, 0.2)); };
    const resetZoom = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(1.0); };

    const clearCanvas = () => { const canvas = canvasRef.current; if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); };
    const startDrawing = (e: any) => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return; setIsDrawing(true); const rect = canvas.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; ctx.beginPath(); ctx.strokeStyle = '#0000FF'; ctx.lineWidth = 2; ctx.moveTo(clientX - rect.left, clientY - rect.top); };
    const draw = (e: any) => { if (!isDrawing || !canvasRef.current) return; const ctx = canvasRef.current.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke(); e.preventDefault(); };

    // --- Formal Stamp Component (BLUE 16pt) ---
    const FormalStamp: React.FC<{ doc: Document; previewScale?: number }> = ({ doc, previewScale = 1.0 }) => {
        if (doc.type !== 'incoming' || !doc.showStamp) return null;
        const cleanTime = formatOnlyTime(doc.receiveTime);
        const cleanDate = formatThaiDate(doc.receiveDate);
        const scale = doc.stampScale || 1.0;

        return (
            <div 
                className="absolute top-10 right-10 border-[3px] border-blue-700 text-blue-700 w-[320px] bg-white shadow-xl z-20 overflow-hidden font-sarabun text-[16pt] pointer-events-none select-none origin-top-right"
                style={{ transform: `scale(${scale})` }}
            >
                <div className="text-center font-bold border-b-[3px] border-blue-700 py-1.5 bg-blue-50/20 leading-snug">
                    โรงเรียนกาฬสินธุ์ปัญญานุกูล
                </div>
                <div className="px-4 py-2 flex items-center border-b-[1.5px] border-blue-500 gap-2">
                    <span className="shrink-0 font-bold">รับที่</span>
                    <div className="flex-grow border-b-2 border-dotted border-blue-500 text-center font-bold min-h-[34px] flex items-center justify-center">
                        {toThaiNumerals(doc.receiveNo)}
                    </div>
                </div>
                <div className="px-4 py-2 flex items-center border-b-[1.5px] border-blue-500 gap-2">
                    <span className="shrink-0 font-bold">วันที่</span>
                    <div className="flex-grow border-b-2 border-dotted border-blue-500 text-center font-bold min-h-[34px] flex items-center justify-center">
                        {toThaiNumerals(cleanDate)}
                    </div>
                </div>
                <div className="px-4 py-2 flex items-center gap-2">
                    <span className="shrink-0 font-bold">เวลา</span>
                    <div className="flex-grow border-b-2 border-dotted border-blue-500 text-center font-bold min-h-[34px] flex items-center justify-center">
                        {toThaiNumerals(cleanTime)}
                    </div>
                    <span className="shrink-0 font-bold">น.</span>
                </div>
            </div>
        );
    };

    const DocumentPreview: React.FC<{ 
        doc: Document; 
        endorsements?: any; 
        onDocClick?: (e: any) => void; 
        isInteractive?: boolean; 
        scale?: number;
        newEndorsement?: Partial<Endorsement> // For real-time placement feedback
    }> = ({ doc, endorsements, onDocClick, isInteractive, scale = 1.0, newEndorsement }) => {
        const fileUrl = useMemo(() => doc.file && doc.file.length > 0 ? getDirectDriveImageSrc(doc.file[0]) : null, [doc.file]);
        const isImage = fileUrl && (fileUrl.includes('thumbnail') || fileUrl.startsWith('data:image'));
        const safeEndorsements = useMemo(() => safeParseArray(endorsements), [endorsements]);

        return (
            <div 
                className={`relative bg-white shadow-2xl mx-auto overflow-hidden print:shadow-none print:m-0 border border-gray-300 transition-transform duration-200 ${isInteractive ? 'cursor-crosshair' : ''}`}
                style={{ 
                    width: '21cm', minHeight: '29.7cm', 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'top center' 
                }}
                onClick={onDocClick}
            >
                {isImage ? (
                    <img src={fileUrl} className="absolute inset-0 w-full h-full object-contain z-0" alt="doc-bg" />
                ) : fileUrl ? (
                    <div className="absolute inset-0 w-full h-full bg-white z-0">
                        <iframe src={`${fileUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-none" title="pdf-preview" />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 z-0 opacity-10 select-none">
                        <div className="text-3xl font-bold italic">ต้นฉบับหนังสือราชการ</div>
                    </div>
                )}

                <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
                    <div className="w-full h-full relative pointer-events-auto">
                        <FormalStamp doc={doc} />
                        
                        {/* Render existing endorsements */}
                        {safeEndorsements.map((end: Endorsement, idx: number) => (
                            <div 
                                key={idx}
                                className="absolute pointer-events-none transition-all duration-300"
                                style={{ 
                                    left: `${end.posX}%`, 
                                    top: `${end.posY}%`, 
                                    transform: `translate(-50%, -50%) scale(${end.scale || 1.0})`,
                                    transformOrigin: 'center center'
                                }}
                            >
                                <div className="w-[340px] text-center space-y-1.5 bg-white/60 backdrop-blur-[1px] p-5 rounded-2xl border border-blue-400/30 text-blue-700 font-sarabun text-[16pt]">
                                    <p className="font-bold leading-tight">"{end.comment}"</p>
                                    {end.assignedName && (
                                        <p className="font-bold text-[15pt] text-blue-800 leading-none mb-1">มอบหมาย {end.assignedName}</p>
                                    )}
                                    <div className="h-18 flex items-center justify-center">
                                        {end.signature && <img src={end.signature} alt="sig" className="max-h-full" style={{ filter: 'invert(31%) sepia(94%) saturate(1352%) hue-rotate(204deg) brightness(91%) contrast(97%)' }} />}
                                    </div>
                                    <p className="font-bold">({toThaiNumerals(end.signerName)})</p>
                                    <p className="text-[14pt] font-medium leading-none">{end.signerPosition}</p>
                                    <p className="text-[12pt] opacity-80">{toThaiNumerals(end.date)}</p>
                                </div>
                            </div>
                        ))}

                        {/* Rendering preview for new endorsement during placement */}
                        {newEndorsement && (
                             <div 
                             className="absolute pointer-events-none transition-all duration-100 opacity-50 ring-4 ring-orange-500 rounded-2xl"
                             style={{ 
                                 left: `${newEndorsement.posX}%`, 
                                 top: `${newEndorsement.posY}%`, 
                                 transform: `translate(-50%, -50%) scale(${newEndorsement.scale || 1.0})`,
                                 transformOrigin: 'center center'
                             }}
                         >
                             <div className="w-[340px] text-center space-y-1.5 bg-white/80 p-5 rounded-2xl border border-orange-400 text-orange-700 font-sarabun text-[16pt]">
                                 <p className="font-bold leading-tight">"{newEndorsement.comment}"</p>
                                 {newEndorsement.assignedName && (
                                     <p className="font-bold text-[15pt] text-orange-800 leading-none mb-1">มอบหมาย {newEndorsement.assignedName}</p>
                                 )}
                                 <div className="h-18 flex items-center justify-center bg-gray-100 rounded italic text-xs">พื้นที่ลายเซ็น</div>
                                 <p className="font-bold">({newEndorsement.signerName})</p>
                                 <p className="text-[14pt]">{newEndorsement.signerPosition}</p>
                             </div>
                         </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh] font-sarabun">
            <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 no-print">
                <div className="bg-gradient-to-b from-indigo-900 to-indigo-950 text-white rounded-2xl shadow-xl overflow-hidden border border-white/10">
                    <div className="p-4 bg-white/10 flex items-center gap-3 border-b border-white/5">
                        <div className="p-2 bg-indigo-500 rounded-lg"><svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg></div>
                        <h2 className="font-bold">งานสารบัญ</h2>
                    </div>
                    <nav className="p-2 space-y-4 py-4">
                        {sarabanMenus.map((group, gIdx) => (
                            <div key={gIdx}>
                                <div className="px-3 text-[10px] font-bold text-indigo-300 uppercase mb-1 opacity-70 tracking-widest">{group.title}</div>
                                {group.items
                                    .filter(item => isStaff || !item.id.endsWith('_new'))
                                    .map(item => (
                                    <button key={item.id} onClick={() => handleSubNav(item.id)} className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-all ${subPage === item.id ? 'bg-white text-indigo-900 font-bold shadow-md' : 'text-indigo-100 hover:bg-white/10'}`}>
                                        <span className="text-base">{item.icon}</span>{item.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </nav>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow border border-indigo-50 space-y-3">
                    <button onClick={() => setActiveTab('inbox')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all ${activeTab === 'inbox' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-50 text-gray-700 hover:bg-emerald-50'}`}>
                        <span>📨 หนังสือถึงฉัน</span><span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{myInboxDocs.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all ${activeTab === 'dashboard' ? 'bg-orange-500 text-white shadow-lg animate-pulse' : 'bg-gray-50 text-gray-700 hover:bg-orange-50'}`}>
                        <span>🖋️ งานรอลงนาม</span><span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{myTasks.length}</span>
                    </button>
                </div>
            </aside>

            <main className="flex-grow">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-50 min-h-[70vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-indigo-900 tracking-tight">{activeTab === 'dashboard' ? 'รายการงานรอลงนาม' : activeTab === 'inbox' ? 'หนังสือถึงฉัน' : 'ทะเบียนข้อมูลสารบัญ'}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-indigo-50/50 text-indigo-900">
                                <tr>
                                    <th className="p-4 font-bold border-b w-32 text-center">ที่ / วันที่</th>
                                    <th className="p-4 font-bold border-b">เรื่อง</th>
                                    <th className="p-4 font-bold border-b text-center">สถานะ</th>
                                    <th className="p-4 font-bold border-b text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {documents.filter(d => activeTab === 'inbox' ? myInboxDocs.includes(d) : activeTab === 'dashboard' ? myTasks.includes(d) : d.type === activeTab).map(doc => (
                                    <tr key={doc.id} className="hover:bg-indigo-50/30 transition-all">
                                        <td className="p-4 text-center">
                                            <div className="font-bold text-indigo-800">{doc.receiveNo || '-'}</div>
                                            <div className="text-[10px] text-gray-500">{formatThaiDate(doc.date)}</div>
                                        </td>
                                        <td className="p-4 font-medium text-gray-900">{doc.title}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${doc.status === 'endorsed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{doc.status}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenView(doc)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                {myTasks.includes(doc) && <button onClick={() => handleOpenSign(doc)} className="p-2 bg-orange-500 text-white rounded-lg shadow-md"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Registration Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-fade-in">
                        <div className="bg-[#3C4B64] p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📄</span>
                                <h3 className="font-bold">ลงทะเบียนและแก้ไขข้อมูลหนังสือ</h3>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-white text-3xl leading-none">&times;</button>
                        </div>
                        
                        <form onSubmit={handleSaveDoc} className="p-8 space-y-5 bg-[#F8F9FB]">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">เลขทะเบียนรับ/ส่ง</label>
                                        <input type="text" value={currentDoc.receiveNo} onChange={e=>setCurrentDoc({...currentDoc, receiveNo: e.target.value})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 font-bold text-blue-700 focus:ring-2 focus:ring-indigo-500" placeholder="123" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">ที่หนังสือ</label>
                                        <input type="text" value={currentDoc.number} onChange={e=>setCurrentDoc({...currentDoc, number: e.target.value})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="ศธ 04007.06/..." />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">ลงวันที่ / วันที่รับ</label>
                                        <input type="date" value={buddhistToISO(currentDoc.receiveDate)} onChange={e=>setCurrentDoc({...currentDoc, receiveDate: isoToBuddhist(e.target.value)})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">หนังสือจาก</label>
                                        <input type="text" value={currentDoc.from} onChange={e=>setCurrentDoc({...currentDoc, from: e.target.value})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="ระบุหน่วยงานต้นทาง" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">เรียน</label>
                                        <input type="text" value={currentDoc.to} onChange={e=>setCurrentDoc({...currentDoc, to: e.target.value})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="ระบุผู้รับ" />
                                    </div>

                                    <div className="col-span-1 md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">เรื่อง</label>
                                        <input type="text" value={currentDoc.title} onChange={e=>setCurrentDoc({...currentDoc, title: e.target.value})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 shadow-inner bg-blue-50/30" placeholder="ระบุชื่อเรื่อง" />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">จำนวนหน้าทั้งหมด</label>
                                        <input type="number" min="1" value={currentDoc.totalPages} onChange={e=>setCurrentDoc({...currentDoc, totalPages: Number(e.target.value)})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">ผู้บริหารลงนามอยู่ที่หน้า</label>
                                        <input type="number" min="1" value={currentDoc.signatoryPage} onChange={e=>setCurrentDoc({...currentDoc, signatoryPage: Number(e.target.value)})} className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">ไฟล์แนบ (PDF/IMAGE)</label>
                                        <input type="file" onChange={e=> {if(e.target.files?.[0]) setCurrentDoc({...currentDoc, file: [e.target.files[0]]})}} className="w-full text-xs" />
                                    </div>

                                    {currentDoc.type === 'incoming' && (
                                        <div className="col-span-1 md:col-span-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-blue-700 uppercase">ปรับขนาดตราประทับรับ (Scale)</label>
                                                <span className="text-sm font-bold text-blue-800">{Math.round((currentDoc.stampScale || 1.0) * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.5" 
                                                max="1.5" 
                                                step="0.05" 
                                                value={currentDoc.stampScale || 1.0} 
                                                onChange={e => setCurrentDoc({...currentDoc, stampScale: parseFloat(e.target.value)})}
                                                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-blue-400 mt-1 font-bold">
                                                <span>เล็ก (0.5x)</span>
                                                <span>ปกติ (1.0x)</span>
                                                <span>ใหญ่ (1.5x)</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-span-1 md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">หมายเหตุ</label>
                                        <textarea value={currentDoc.note} onChange={e=>setCurrentDoc({...currentDoc, note: e.target.value})} className="w-full border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500" rows={2} placeholder="เพิ่มเติมข้อมูลอื่น ๆ"></textarea>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-200">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-8 py-3 rounded-xl font-bold bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-12 py-3 rounded-xl font-bold shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center gap-2">
                                    {isSaving ? 'กำลังประมวลผล...' : '💾 บันทึกข้อมูลหนังสือ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Signature & Visual Placement Modal */}
            {isSignModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-gray-100 rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden animate-zoom-in relative my-auto">
                        <div className="p-4 bg-orange-500 text-white flex justify-between items-center shadow-lg shrink-0">
                            <div><h3 className="text-xl font-bold">การเกษียนหนังสือและวางตำแหน่ง</h3><p className="text-xs opacity-90">ระบุพิกัดเกษียนบนเอกสาร</p></div>
                            <button onClick={() => setIsSignModalOpen(false)} className="bg-white/20 p-2 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="flex flex-col lg:flex-row overflow-hidden h-[80vh]">
                            <div className="flex-grow bg-gray-500 overflow-auto p-4 flex justify-center items-start relative">
                                <div className="origin-top scale-75">
                                    <DocumentPreview 
                                        doc={documents.find(d => d.id === selectedDocId)!} 
                                        endorsements={documents.find(d => d.id === selectedDocId)?.endorsements} 
                                        onDocClick={handleDocumentClickForPlacement} 
                                        isInteractive={isSettingPosition}
                                        newEndorsement={isSettingPosition ? {
                                            posX: placedX,
                                            posY: placedY,
                                            comment: endorseComment,
                                            signerName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
                                            signerPosition: currentUser.position,
                                            scale: endorseScale,
                                            assignedName: delegateName // แสดงชื่อผู้รับมอบหมายในพรีวิวด้วย
                                        } : undefined}
                                    />
                                </div>
                            </div>
                            <div className="w-full lg:w-96 bg-white border-l shadow-2xl p-6 overflow-y-auto space-y-6">
                                <div className="space-y-4 text-blue-700">
                                    <button onClick={() => setIsSettingPosition(!isSettingPosition)} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${isSettingPosition ? 'bg-orange-600 text-white shadow-inner animate-pulse' : 'bg-white border-2 border-orange-500 text-orange-600 shadow-sm'}`}>
                                        {isSettingPosition ? '📍 คลิกที่ว่างในเอกสารได้เลย' : '🎯 ระบุพิกัดตำแหน่งวาง'}
                                    </button>
                                    
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-blue-700 uppercase">ปรับขนาดตรายางเกษียน</label>
                                            <span className="text-sm font-bold text-blue-800">{Math.round(endorseScale * 100)}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.5" 
                                            max="1.5" 
                                            step="0.05" 
                                            value={endorseScale} 
                                            onChange={e => setEndorseScale(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <div className="flex justify-between text-[10px] text-blue-400 mt-1 font-bold">
                                            <span>ย่อ (0.5x)</span>
                                            <span>ปกติ (1.0x)</span>
                                            <span>ขยาย (1.5x)</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">ข้อความเกษียน</label>
                                        <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-blue-500 font-sarabun" rows={2} value={endorseComment} onChange={(e) => setEndorseComment(e.target.value)} />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">มอบหมายงานต่อ (ถ้ามี)</label>
                                        <div className="relative">
                                            <input type="text" placeholder="พิมพ์ชื่อเพื่อมอบหมายงาน..." value={personSearch} onChange={(e) => setPersonSearch(e.target.value)} className="w-full pl-4 pr-10 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" />
                                            {personSearch && (
                                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-xl shadow-2xl z-20 max-h-40 overflow-y-auto">
                                                    {filteredPersonnel.map(p => (
                                                        <button key={p.id} type="button" onClick={() => { 
                                                            setDelegateToId(p.id); 
                                                            const fullName = `${p.personnelTitle}${p.personnelName}`;
                                                            setDelegateName(fullName); 
                                                            setPersonSearch(fullName); 
                                                        }} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs border-b last:border-0"><div className="font-bold">{p.personnelTitle}{p.personnelName}</div><div className="text-[9px] text-gray-400">{p.position}</div></button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">ลงลายมือชื่อ (เซ็นที่นี่)</label>
                                        <div className="border-4 border-dashed border-gray-100 bg-gray-50 rounded-2xl h-40 relative overflow-hidden group">
                                            <canvas ref={canvasRef} width={400} height={160} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} className="w-full h-full cursor-pencil" />
                                            <button onClick={clearCanvas} className="absolute bottom-2 right-2 text-[10px] font-bold text-red-500 bg-white px-2 py-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">ล้างลายเซ็น</button>
                                        </div>
                                    </div>

                                    <button onClick={handleSaveSignature} disabled={isSaving} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-xl hover:bg-indigo-700 transform active:scale-95 transition-all">{isSaving ? 'กำลังบันทึกข้อมูล...' : '✅ เกษียนทราบ / จบเรื่อง'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isViewModalOpen && currentDoc && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center z-50 p-4 no-print overflow-auto" onClick={() => setIsViewModalOpen(false)}>
                    <div 
                        className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/20 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/30 z-[100] shadow-2xl pointer-events-auto" 
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={zoomOut} className="p-2 text-white hover:text-indigo-300 transition-colors pointer-events-auto" title="ย่อ"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg></button>
                        <div className="px-5 py-1 bg-white text-indigo-900 rounded-lg font-black text-base min-w-[90px] text-center shadow-inner cursor-pointer" onClick={resetZoom}>
                            {Math.round(zoomLevel * 100)}%
                        </div>
                        <button onClick={zoomIn} className="p-2 text-white hover:text-indigo-300 transition-colors pointer-events-auto" title="ขยาย"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
                        <div className="w-[1.5px] h-6 bg-white/30 mx-2"></div>
                        <button onClick={resetZoom} className="text-white text-xs font-bold hover:text-indigo-200 uppercase tracking-widest">Reset</button>
                    </div>

                    <div className="relative animate-fade-in py-28 w-full flex justify-center" onClick={e => e.stopPropagation()}>
                        <DocumentPreview doc={currentDoc as Document} endorsements={currentDoc.endorsements} scale={zoomLevel} />
                        
                        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-[100]">
                            <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); setIsViewModalOpen(false); }} className="p-4 bg-white text-gray-500 rounded-full shadow-2xl hover:bg-gray-100 flex items-center justify-center"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralDocsPage;
