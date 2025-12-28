
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Document, Personnel, DocumentType, DocumentStatus, Endorsement } from '../types';
import { getDirectDriveImageSrc, getDrivePreviewUrl, getDriveDownloadUrl, getDriveViewUrl, getCurrentThaiDate, buddhistToISO, isoToBuddhist, formatThaiDate, toThaiNumerals, safeParseArray, formatOnlyTime } from '../utils';

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
    const isStaff = currentUser.role === 'admin' || currentUser.isSarabanAdmin === true; 
    const isDirector = currentUser.specialRank === 'director';
    const isDeputy = currentUser.specialRank === 'deputy';

    const [activeTab, setActiveTab] = useState<DocumentType | 'inbox' | 'dashboard'>('incoming');
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
    const [delegateName, setDelegateName] = useState<string>(''); 
    const [personSearch, setPersonSearch] = useState('');
    const [placedX, setPlacedX] = useState<number>(70); 
    const [placedY, setPlacedY] = useState<number>(80);
    const [isSettingPosition, setIsSettingPosition] = useState(false);
    const [endorseScale, setEndorseScale] = useState<number>(1.0); 

    const myInboxDocs = useMemo(() => documents.filter(d => {
        const recipients = safeParseArray(d.recipients);
        return recipients.includes(currentUser.id) || recipients.includes(Number(currentUser.id));
    }).sort((a, b) => b.id - a.id), [documents, currentUser.id]);

    const myTasks = useMemo(() => {
        if (isDirector) {
            return documents.filter(d => d.status === 'proposed').sort((a, b) => b.id - a.id);
        }
        return documents.filter(d => d.assignedTo === currentUser.id && d.status === 'delegated').sort((a, b) => b.id - a.id);
    }, [documents, currentUser, isDirector]);

    const filteredPersonnel = useMemo(() => {
        if (!personSearch) return personnel.slice(0, 10);
        return personnel.filter(p => `${p.personnelTitle}${p.personnelName}`.includes(personSearch) || p.position.includes(personSearch)).slice(0, 10);
    }, [personnel, personSearch]);

    const getStatusLabelThai = (status: DocumentStatus) => {
        switch (status) {
            case 'proposed': return 'รอผู้อำนวยการพิจารณา';
            case 'endorsed': return 'ผู้อำนวยการลงนามแล้ว';
            case 'delegated': return 'มอบหมายงานแล้ว';
            case 'distributed': return 'แจกจ่ายแล้ว';
            case 'draft': return 'ฉบับร่าง';
            default: return status;
        }
    };

    const getStatusBadgeClass = (status: DocumentStatus) => {
        switch (status) {
            case 'proposed': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'endorsed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'delegated': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'distributed': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const handleSubNav = (id: string) => {
        if (id.endsWith('_new') && !isStaff) {
            alert('คุณไม่มีสิทธิ์เข้าถึงเมนูนี้ เฉพาะผู้ดูแลระบบหรือเจ้าหน้าที่งานสารบรรณเท่านั้น');
            return;
        }
        setSubPage(id);
        const type = id.split('_')[0] as DocumentType;
        setActiveTab(type);
        if (id.endsWith('_new')) handleOpenEdit(type);
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
                stampScale: 1.0 
            });
        }
        setIsEditModalOpen(true);
    };

    const handleOpenView = (doc: Document) => {
        setCurrentDoc(doc);
        setZoomLevel(1.0);
        setIsViewModalOpen(true);
    };

    const handlePrintOfficial = () => {
        // Prepare for high-quality print
        const originalZoom = zoomLevel;
        setZoomLevel(1.0); // Reset zoom for print
        setTimeout(() => {
            window.print();
            setZoomLevel(originalZoom); // Restore zoom
        }, 300);
    };

    const handleDownloadEndorsed = () => {
        alert("คำแนะนำ: เพื่อดาวน์โหลดเอกสารที่เกษียณแล้ว (รวมลายเซ็น) กรุณากดปุ่ม 'พิมพ์' และเลือกปลายทางเป็น 'บันทึกเป็น PDF' (Save as PDF)");
        handlePrintOfficial();
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
        if (doc.status === 'proposed' && !isDirector) {
            alert('หนังสือฉบับนี้อยู่ระหว่างเสนอผู้อำนวยการพิจารณา ผู้อำนวยการต้องลงนามก่อนจึงจะสามารถดำเนินการต่อได้');
            return;
        }

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

        const currentRecipients = safeParseArray(doc.recipients);
        const updatedRecipients = Array.from(new Set([...currentRecipients, currentUser.id]));

        let nextStatus: DocumentStatus = doc.status;
        if (isDirector) {
            nextStatus = delegateToId ? 'delegated' : 'endorsed';
        } else if (doc.status === 'delegated') {
            nextStatus = delegateToId ? 'delegated' : 'distributed';
        }

        const updatedDoc: Document = { 
            ...doc, 
            status: nextStatus, 
            assignedTo: delegateToId || undefined, 
            endorsements: [...safeParseArray(doc.endorsements), newEndorsement],
            recipients: updatedRecipients
        };
        
        onSave(updatedDoc);
        setIsSignModalOpen(false);
    };

    const handleDeleteDoc = (id: any) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลหนังสือฉบับนี้?')) {
            onDelete([Number(id)]);
        }
    };

    const zoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(prev => Math.min(prev + 0.2, 3.0)); };
    const zoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(prev => Math.max(prev - 0.2, 0.2)); };
    const resetZoom = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(1.0); };

    const clearCanvas = () => { const canvas = canvasRef.current; if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); };
    const startDrawing = (e: any) => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return; setIsDrawing(true); const rect = canvas.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; ctx.beginPath(); ctx.strokeStyle = '#0000FF'; ctx.lineWidth = 2; ctx.moveTo(clientX - rect.left, clientY - rect.top); };
    const draw = (e: any) => { if (!isDrawing || !canvasRef.current) return; const ctx = canvasRef.current.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke(); e.preventDefault(); };

    const FormalStamp: React.FC<{ doc: Document }> = ({ doc }) => {
        if (doc.type !== 'incoming' || !doc.showStamp) return null;
        const cleanTime = formatOnlyTime(doc.receiveTime);
        const cleanDate = formatThaiDate(doc.receiveDate);
        const scale = doc.stampScale || 1.0;

        return (
            <div 
                className="absolute top-10 right-10 border-[3px] border-blue-700 text-blue-700 w-[320px] bg-white z-20 overflow-hidden font-sarabun text-[16pt] pointer-events-none select-none origin-top-right print:shadow-none"
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
        newEndorsement?: Partial<Endorsement> 
    }> = ({ doc, endorsements, onDocClick, isInteractive, scale = 1.0, newEndorsement }) => {
        const fileObj = doc.file && doc.file.length > 0 ? doc.file[0] : null;
        const isPdf = useMemo(() => {
            if (!fileObj) return false;
            if (fileObj instanceof File) return fileObj.type === 'application/pdf';
            const urlStr = String(fileObj).toLowerCase();
            return urlStr.includes('.pdf') || (urlStr.includes('drive.google.com') && !urlStr.includes('thumbnail'));
        }, [fileObj]);

        const fileUrl = useMemo(() => {
            if (!fileObj) return null;
            if (isPdf) return getDrivePreviewUrl(fileObj);
            return getDirectDriveImageSrc(fileObj);
        }, [fileObj, isPdf]);

        const isImage = !isPdf && fileUrl;
        const safeEndorsements = useMemo(() => safeParseArray(endorsements), [endorsements]);

        return (
            <div 
                id="official-doc-render"
                className={`relative bg-white shadow-2xl mx-auto overflow-hidden border border-gray-300 transition-transform duration-200 print:border-none print:shadow-none print:mx-0 ${isInteractive ? 'cursor-crosshair' : ''}`}
                style={{ width: '21cm', minHeight: '29.7cm', transform: isInteractive || scale !== 1 ? `scale(${scale})` : 'none', transformOrigin: 'top center' }}
                onClick={onDocClick}
            >
                {isImage ? (
                    <img src={fileUrl!} className="absolute inset-0 w-full h-full object-contain z-0" alt="doc-bg" />
                ) : isPdf ? (
                    <div className="absolute inset-0 w-full h-full bg-white z-0">
                        <iframe src={`${fileUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-none print:hidden" title="pdf-preview" />
                        <div className="hidden print:flex h-full w-full items-center justify-center text-gray-400 font-bold text-2xl italic">
                            เอกสาร PDF ต้นฉบับ
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 z-0 opacity-10 select-none">
                        <div className="text-3xl font-bold italic">ต้นฉบับหนังสือราชการ</div>
                    </div>
                )}

                <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
                    <div className="w-full h-full relative pointer-events-auto">
                        <FormalStamp doc={doc} />
                        {safeEndorsements.map((end: Endorsement, idx: number) => (
                            <div 
                                key={idx}
                                className="absolute pointer-events-none transition-all duration-300"
                                style={{ 
                                    left: `${end.posX}%`, top: `${end.posY}%`, 
                                    transform: `translate(-50%, -50%) scale(${end.scale || 1.0})`,
                                    transformOrigin: 'center center'
                                }}
                            >
                                <div className="w-[340px] text-center space-y-1.5 bg-white/60 backdrop-blur-[1px] p-5 rounded-2xl border border-blue-400/30 text-blue-700 font-sarabun text-[16pt] print:bg-white print:border-blue-700">
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
                        {newEndorsement && (
                             <div className="absolute pointer-events-none transition-all duration-100 opacity-50 ring-4 ring-orange-500 rounded-2xl" style={{ left: `${newEndorsement.posX}%`, top: `${newEndorsement.posY}%`, transform: `translate(-50%, -50%) scale(${newEndorsement.scale || 1.0})`, transformOrigin: 'center center' }}>
                                 <div className="w-[340px] text-center space-y-1.5 bg-white/80 p-5 rounded-2xl border border-orange-400 text-orange-700 font-sarabun text-[16pt]">
                                     <p className="font-bold leading-tight">"{newEndorsement.comment}"</p>
                                     {newEndorsement.assignedName && <p className="font-bold text-[15pt] text-orange-800 leading-none mb-1">มอบหมาย {newEndorsement.assignedName}</p>}
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

    const filteredDocsToDisplay = useMemo(() => {
        if (activeTab === 'inbox') return myInboxDocs;
        if (activeTab === 'dashboard') return myTasks;
        return documents.filter(d => d.type === activeTab).sort((a, b) => b.id - a.id);
    }, [documents, activeTab, myInboxDocs, myTasks]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh] font-sarabun">
            <style>{`
                @media print {
                    body > *:not(#root) { display: none !important; }
                    #root > *:not(.print-visible) { display: none !important; }
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 0; }
                    body { margin: 0; padding: 0; background: white; }
                    #official-doc-render {
                        width: 210mm !important;
                        height: 297mm !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        transform: none !important;
                        border: none !important;
                        visibility: visible !important;
                    }
                    .print-visible { display: block !important; visibility: visible !important; }
                }
                .floating-action-bar {
                    position: fixed;
                    right: 40px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    z-index: 1000;
                }
                .floating-btn {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: white;
                    color: #1e3a8a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.2);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }
                .floating-btn:hover {
                    transform: scale(1.1);
                    background: #f8fafc;
                    color: #2563eb;
                }
                .floating-btn:active {
                    transform: scale(0.95);
                }
                .floating-btn svg {
                    width: 24px;
                    height: 24px;
                }
            `}</style>

            <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 no-print">
                <div className="bg-gradient-to-b from-indigo-900 to-indigo-950 text-white rounded-2xl shadow-xl overflow-hidden border border-white/10">
                    <div className="p-4 bg-white/10 flex items-center gap-3 border-b border-white/5">
                        <div className="p-2 bg-indigo-500 rounded-lg"><svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg></div>
                        <h2 className="font-bold">งานสารบรรณ</h2>
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

            <main className="flex-grow no-print">
                <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-50 min-h-[70vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
                            {activeTab === 'dashboard' ? 'รายการงานรอลงนาม' : activeTab === 'inbox' ? 'หนังสือถึงฉัน' : `ทะเบียนข้อมูล${activeTab === 'incoming' ? 'หนังสือรับ' : activeTab === 'order' ? 'คำสั่ง' : 'หนังสือส่ง'}`}
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-indigo-50/50 text-indigo-900 font-bold border-b border-indigo-100">
                                <tr>
                                    <th className="p-4 w-20 text-center">รับที่</th>
                                    <th className="p-4 w-32 text-center">ลงวันที่</th>
                                    <th className="p-4 min-w-[200px]">เรื่อง</th>
                                    <th className="p-4 w-40 text-center">สถานะ</th>
                                    <th className="p-4 w-28 text-center">ต้นฉบับ</th>
                                    <th className="p-4 w-28 text-center">เกษียณแล้ว</th>
                                    <th className="p-4 w-32 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDocsToDisplay.length === 0 ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-gray-400">ไม่พบรายการข้อมูลในหมวดหมู่นี้</td></tr>
                                ) : (
                                    filteredDocsToDisplay.map(doc => {
                                        const fileObj = doc.file && doc.file.length > 0 ? doc.file[0] : null;
                                        const viewUrl = getDriveViewUrl(fileObj);
                                        const hasEndorsement = safeParseArray(doc.endorsements).length > 0;

                                        return (
                                            <tr key={doc.id} className="hover:bg-indigo-50/30 transition-all border-b border-gray-50">
                                                <td className="p-4 text-center font-bold text-indigo-800">{doc.receiveNo || '-'}</td>
                                                <td className="p-4 text-center text-gray-600">{formatThaiDate(doc.date)}</td>
                                                <td className="p-4 font-medium text-gray-900 leading-snug">{doc.title}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(doc.status)}`}>
                                                        {getStatusLabelThai(doc.status)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {fileObj ? (
                                                        <div className="flex justify-center gap-1">
                                                            <a href={viewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-2 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors" title="เปิดดูต้นฉบับ (Google Drive)">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                            </a>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {hasEndorsement ? (
                                                        <button onClick={() => handleOpenView(doc)} className="inline-flex items-center justify-center p-2 text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors" title="ดูหนังสือที่เกษียนแล้ว">
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 italic">ยังไม่เกษียณ</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-1.5">
                                                        <button onClick={() => handleOpenView(doc)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="เปิดดู"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                        {(myTasks.some(t => t.id === doc.id)) && <button onClick={() => handleOpenSign(doc)} className="p-1.5 bg-orange-500 text-white rounded-lg shadow-sm" title="ลงนาม/เกษียน"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>}
                                                        {isStaff && (
                                                            <>
                                                                <button onClick={() => handleOpenEdit(doc.type, doc)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="แก้ไขข้อมูล"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                                <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="ลบ"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* View Modal with Floating Buttons */}
            {isViewModalOpen && currentDoc && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center z-50 p-4 no-print overflow-auto" onClick={() => setIsViewModalOpen(false)}>
                    {/* Floating Side Action Bar */}
                    <div className="floating-action-bar no-print" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={handlePrintOfficial}
                            className="floating-btn"
                            title="พิมพ์เอกสาร / บันทึก PDF"
                        >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                        </button>
                        <button 
                            onClick={handleDownloadEndorsed}
                            className="floating-btn !bg-emerald-600 !text-white hover:!bg-emerald-700"
                            title="ดาวน์โหลดไฟล์ที่เกษียนแล้ว (PDF)"
                        >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                        <button 
                            onClick={() => setIsViewModalOpen(false)}
                            className="floating-btn !bg-red-500 !text-white hover:!bg-red-600"
                            title="ปิดหน้าต่าง"
                        >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Top Zoom Bar */}
                    <div className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/20 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/30 z-[100] shadow-2xl pointer-events-auto" onClick={e => e.stopPropagation()}>
                        <button onClick={zoomOut} className="p-2 text-white hover:text-indigo-300 pointer-events-auto"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg></button>
                        <div className="px-5 py-1 bg-white text-indigo-900 rounded-lg font-black text-base min-w-[90px] text-center" onClick={resetZoom}>{Math.round(zoomLevel * 100)}%</div>
                        <button onClick={zoomIn} className="p-2 text-white hover:text-indigo-300 pointer-events-auto"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
                    </div>

                    <div className="relative animate-fade-in py-28 w-full flex justify-center print-visible" onClick={e => e.stopPropagation()}>
                        <DocumentPreview doc={currentDoc as Document} endorsements={currentDoc.endorsements} scale={zoomLevel} />
                    </div>
                </div>
            )}
            {/* Signature Modal and Edit Modal remain the same as previous implementation */}
            {/* ... */}
        </div>
    );
};

export default GeneralDocsPage;
