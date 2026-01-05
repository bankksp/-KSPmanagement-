
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Personnel, ChatMessage, Student, Report, Settings, StudentAttendance } from '../types';
import { postToGoogleScript, formatOnlyTime, getFirstImageSource, prepareDataForApi, safeParseArray } from '../utils';
import { GoogleGenAI } from "@google/genai";

interface ChatPopupProps {
    currentUser: Personnel | null;
    students: Student[];
    personnel: Personnel[];
    reports: Report[];
    settings: Settings;
    studentAttendance: StudentAttendance[];
}

const QUICK_QUESTIONS = [
    { q: "ระบบทำอะไรได้บ้าง?", a: "D-school เป็นระบบบริหารจัดการสถานศึกษา มีเมนูหลักคือ:\n- กิจการนักเรียน: เช็คชื่อ, รายงานเรือนนอน, เยี่ยมบ้าน\n- วิชาการ: ส่งแผนการสอน, บริการแหล่งเรียนรู้\n- งบประมาณ: ระบบพัสดุ, ครุภัณฑ์, แผนงาน\n- บริหารทั่วไป: งานสารบรรณ, แจ้งซ่อม" },
    { q: "วิธีเช็คชื่อนักเรียน", a: "ไปที่เมนู 'เช็คชื่อนักเรียน' เลือกชั้นเรียน และช่วงเวลาที่ต้องการ จากนั้นทำเครื่องหมายหน้าชื่อและกดบันทึกครับ" },
    { q: "ส่งแผนการสอนยังไง?", a: "เลือกเมนู 'งานวิชาการ' > 'แผนการสอน' กรอกรายละเอียดวิชาและแนบไฟล์ PDF/Word จากนั้นกดส่งได้ทันทีครับ" },
];

const AIChatPopup: React.FC<ChatPopupProps> = ({ 
    currentUser, 
    personnel, 
    settings,
    students,
    reports,
    studentAttendance
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'chat' | 'search'>('list');
    const [selectedContact, setSelectedContact] = useState<Personnel | 'all' | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
    const [showActionsId, setShowActionsId] = useState<number | null>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // คำนวณจำนวนข้อความที่ยังไม่ได้อ่าน (ที่ไม่ได้ส่งโดยตัวเอง)
    const unreadCount = useMemo(() => {
        if (!currentUser) return 0;
        return messages.filter(m => !m.isRead && m.senderId !== currentUser.id && !m.isDeleted).length;
    }, [messages, currentUser]);

    // Get all personnel except current user
    const allContacts = useMemo(() => {
        return personnel.filter(p => p.id !== currentUser?.id);
    }, [personnel, currentUser]);

    // Filtering for the "Search New Person" view
    const filteredSearch = useMemo(() => {
        if (!searchTerm) return allContacts;
        const lowerSearch = searchTerm.toLowerCase();
        return allContacts.filter(c => 
            (c.personnelName || '').toLowerCase().includes(lowerSearch) || 
            (c.position || '').toLowerCase().includes(lowerSearch)
        );
    }, [allContacts, searchTerm]);

    // Polling for messages
    useEffect(() => {
        if (!currentUser || !isOpen) return;

        const checkMessages = async () => {
            try {
                const response = await postToGoogleScript({ 
                    action: 'getChatMessages', 
                    userId: currentUser.id 
                });
                if (response.status === 'success' && response.data) {
                    const incomingMsgs = response.data as ChatMessage[];
                    if (incomingMsgs.length !== messages.length) {
                        setMessages(incomingMsgs);
                    }
                }
            } catch (e) {
                console.error("Chat sync error", e);
            }
        };

        const interval = setInterval(checkMessages, 5000);
        return () => clearInterval(interval);
    }, [currentUser, isOpen, messages.length]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, view, selectedContact]);

    // Filter messages for current view
    const activeMessages = useMemo(() => {
        if (!selectedContact) return [];
        if (selectedContact === 'all') {
            return messages.filter(m => m.receiverId === 'all' && !m.isDeleted);
        }
        return messages.filter(m => 
            !m.isDeleted && (
                (m.senderId === currentUser?.id && m.receiverId === selectedContact.id) ||
                (m.senderId === selectedContact.id && m.receiverId === currentUser?.id)
            )
        );
    }, [messages, selectedContact, currentUser]);

    // Grouping for the "Inbox" (Recent Conversations only)
    const recentConversations = useMemo(() => {
        const groups: Record<string, ChatMessage> = {};
        messages.forEach(m => {
            if (m.receiverId === 'all') {
                groups['all'] = m;
                return;
            }
            const otherId = m.senderId === currentUser?.id ? m.receiverId : m.senderId;
            if (otherId === 'admin' || otherId === 0) return; 

            if (!groups[otherId] || new Date(m.timestamp) > new Date(groups[otherId].timestamp)) {
                groups[otherId] = m;
            }
        });
        return groups;
    }, [messages, currentUser]);

    // List of people to show in the main Inbox
    const inboxList = useMemo(() => {
        const list: { person: Personnel | 'all', lastMsg: ChatMessage }[] = [];
        
        if (recentConversations['all']) {
            list.push({ person: 'all', lastMsg: recentConversations['all'] });
        }

        Object.keys(recentConversations).forEach(id => {
            if (id === 'all') return;
            const p = personnel.find(per => String(per.id) === id);
            if (p) {
                list.push({ person: p, lastMsg: recentConversations[id] });
            }
        });

        return list.sort((a, b) => new Date(b.lastMsg.timestamp).getTime() - new Date(a.lastMsg.timestamp).getTime());
    }, [recentConversations, personnel]);

    const handleSend = async (files?: FileList) => {
        if ((!input.trim() && (!files || files.length === 0)) || isSending || !currentUser || !selectedContact) return;

        const userText = input.trim();
        const receiverId = selectedContact === 'all' ? 'all' : selectedContact.id;
        setIsSending(true);

        const newId = Date.now();
        const userMsg: Partial<ChatMessage> = {
            id: editingMsgId || newId,
            senderId: currentUser.id,
            senderName: currentUser.personnelName,
            receiverId: receiverId as any,
            text: userText,
            timestamp: new Date().toISOString(),
            isRead: false,
            isEdited: !!editingMsgId
        };

        if (files && files.length > 0) {
            userMsg.attachments = Array.from(files) as any;
        }

        try {
            const apiPayload = await prepareDataForApi(userMsg);
            await postToGoogleScript({
                action: editingMsgId ? 'editChatMessage' : 'sendChatMessage',
                data: apiPayload
            });

            setInput('');
            setEditingMsgId(null);

            if (!editingMsgId && selectedContact !== 'all' && userText.toLowerCase().includes('bot')) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `User asks: ${userText}. Context: ${settings.schoolName} admin assistant.`
                });
                if (response.text) {
                    const botMsg: ChatMessage = {
                        id: Date.now() + 1,
                        senderId: 0,
                        senderName: "D-Bot",
                        receiverId: currentUser.id,
                        text: response.text,
                        timestamp: new Date().toISOString(),
                        isRead: true
                    };
                    await postToGoogleScript({ action: 'sendChatMessage', data: botMsg });
                }
            }
        } catch (error) {
            console.error("Send message error:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async (msgId: number) => {
        if (!window.confirm('คุณต้องการลบข้อความนี้ใช่หรือไม่?')) return;
        try {
            const msg = messages.find(m => m.id === msgId);
            if (msg) {
                const updatedMsg = { ...msg, isDeleted: true };
                await postToGoogleScript({ action: 'deleteChatMessage', data: updatedMsg });
            }
        } catch (e) {
            console.error("Delete error", e);
        }
    };

    const handleSelectChat = (contact: Personnel | 'all') => {
        setSelectedContact(contact);
        setView('chat');
        setSearchTerm('');
    };

    const renderAttachments = (attachments?: string[]) => {
        const list = safeParseArray(attachments);
        if (list.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-1 mt-2">
                {list.map((url, i) => {
                    const isImg = /\.(jpg|jpeg|png|webp|gif|svg)/i.test(url) || url.includes('googleusercontent.com');
                    const isVideo = /\.(mp4|mov|avi|webm)/i.test(url);
                    if (isImg) return <img key={i} src={url} className="max-w-full h-32 rounded-lg object-cover border" alt="" />;
                    if (isVideo) return <video key={i} src={url} controls className="max-w-full h-32 rounded-lg border" />;
                    return (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border text-xs">
                            📂 File {i+1}
                        </a>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1100] font-sarabun no-print">
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[360px] sm:w-[450px] h-[600px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up">
                    
                    {/* --- HEADER --- */}
                    <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm z-20">
                        {view === 'chat' ? (
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setView('list'); setEditingMsgId(null); setInput(''); }} className="p-1.5 hover:bg-gray-100 rounded-full text-primary-blue transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden border-2 border-white shadow-sm relative">
                                        {selectedContact === 'all' ? (
                                            <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-lg">📢</div>
                                        ) : (
                                            <img src={getFirstImageSource(selectedContact?.profileImage) || ''} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + selectedContact?.personnelName)} alt="" />
                                        )}
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="leading-tight">
                                        <h3 className="font-black text-navy text-sm truncate max-w-[150px]">{selectedContact === 'all' ? 'ประกาศสาธารณะ' : selectedContact?.personnelName}</h3>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Active Now</p>
                                    </div>
                                </div>
                            </div>
                        ) : view === 'search' ? (
                            <div className="flex items-center gap-3 w-full">
                                <button onClick={() => { setView('list'); setSearchTerm(''); }} className="p-1.5 hover:bg-gray-100 rounded-full text-primary-blue transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h2 className="text-xl font-black text-navy tracking-tight">New Message</h2>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-2xl font-black text-navy tracking-tight">Messenger</h2>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setView('search')}
                                        className="p-2 bg-gray-100 rounded-full text-primary-blue hover:bg-blue-100 transition-colors shadow-sm"
                                        title="New Message"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    </button>
                                    <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- INBOX (LIST) VIEW --- */}
                    {view === 'list' && (
                        <div className="flex-grow flex flex-col overflow-hidden bg-white">
                            <div className="px-2 py-4 overflow-x-auto flex gap-4 no-scrollbar border-b border-gray-50">
                                {allContacts.slice(0, 15).map(p => (
                                    <button key={p.id} onClick={() => handleSelectChat(p)} className="flex-shrink-0 flex flex-col items-center gap-1.5 px-1 w-16 group">
                                        <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden relative ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                                            <img src={getFirstImageSource(p.profileImage) || ''} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + p.personnelName)} alt="" />
                                            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-600 truncate w-full text-center">{(p.personnelName || '').split(' ')[0]}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                <div className="px-5 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/30">Chats</div>
                                <div className="divide-y divide-gray-50">
                                    {inboxList.map(({ person, lastMsg }) => (
                                        <button 
                                            key={person === 'all' ? 'all' : person.id} 
                                            onClick={() => handleSelectChat(person)} 
                                            className="w-full px-5 py-5 flex items-center gap-4 hover:bg-blue-50/50 transition-all text-left group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-100 overflow-hidden flex-shrink-0 relative">
                                                {person === 'all' ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-2xl">📢</div>
                                                ) : (
                                                    <img src={getFirstImageSource(person.profileImage) || ''} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + person.personnelName)} alt="" />
                                                )}
                                                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className="font-black text-navy text-base truncate group-hover:text-primary-blue transition-colors">
                                                        {person === 'all' ? 'ประกาศสาธารณะ' : person.personnelName}
                                                    </h4>
                                                    <span className="text-[10px] text-gray-400 font-bold">{formatOnlyTime(lastMsg.timestamp)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className={`text-sm truncate ${!lastMsg.isRead && lastMsg.senderId !== currentUser?.id ? 'font-black text-gray-900' : 'text-gray-500 font-medium'}`}>
                                                        {lastMsg.senderId === currentUser?.id ? 'You: ' : ''}{lastMsg.text || 'Shared a file'}
                                                    </p>
                                                    {!lastMsg.isRead && lastMsg.senderId !== currentUser?.id && (
                                                        <div className="w-2.5 h-2.5 bg-primary-blue rounded-full flex-shrink-0"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {inboxList.length === 0 && (
                                        <div className="p-20 text-center flex flex-col items-center opacity-30">
                                            <div className="text-5xl mb-4">📫</div>
                                            <p className="font-black text-navy uppercase tracking-widest text-xs">No conversations yet</p>
                                            <button onClick={() => setView('search')} className="mt-4 text-primary-blue font-bold text-sm hover:underline">Tap to find someone</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SEARCH VIEW --- */}
                    {view === 'search' && (
                        <div className="flex-grow flex flex-col overflow-hidden bg-white">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        autoFocus
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search by name or position" 
                                        className="w-full bg-white border border-gray-200 rounded-2xl px-12 py-3.5 text-sm font-bold text-navy focus:ring-4 focus:ring-blue-100 focus:border-primary-blue transition-all shadow-sm" 
                                    />
                                    <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            </div>

                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                <div className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Results</div>
                                <div className="divide-y divide-gray-50">
                                    <button 
                                        onClick={() => handleSelectChat('all')} 
                                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-blue-50/50 transition-all text-left"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl shadow-md border-2 border-white">📢</div>
                                        <div>
                                            <h4 className="font-black text-navy text-sm">ประกาศสาธารณะ (ทั้งหมด)</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Public Broadcast</p>
                                        </div>
                                    </button>
                                    {filteredSearch.map(c => (
                                        <button key={c.id} onClick={() => handleSelectChat(c)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-blue-50/50 transition-all text-left">
                                            <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-100 overflow-hidden flex-shrink-0">
                                                <img src={getFirstImageSource(c.profileImage) || ''} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + c.personnelName)} alt="" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-navy text-sm truncate">{c.personnelName}</h4>
                                                <p className="text-[10px] text-gray-500 truncate font-bold uppercase tracking-tighter">{c.position}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredSearch.length === 0 && (
                                        <div className="p-20 text-center text-gray-300 font-bold italic">ไม่พบรายชื่อที่ค้นหา</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CHAT VIEW --- */}
                    {view === 'chat' && (
                        <div className="flex-grow flex flex-col overflow-hidden bg-white relative">
                            <div ref={scrollRef} className="flex-grow p-5 overflow-y-auto space-y-4 bg-gray-50/30">
                                {activeMessages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-40">
                                        <div className="text-4xl mb-4">💬</div>
                                        <p className="text-sm font-black text-navy uppercase tracking-widest leading-tight">Start a conversation<br/>with {selectedContact === 'all' ? 'everyone' : (selectedContact as Personnel).personnelName}</p>
                                    </div>
                                )}
                                {activeMessages.map((m) => {
                                    const isMe = m.senderId === currentUser?.id;
                                    const isActionsOpen = showActionsId === m.id;
                                    return (
                                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                                {!isMe && selectedContact === 'all' && (
                                                    <span className="text-[10px] font-black text-gray-400 ml-2 mb-1">{m.senderName}</span>
                                                )}
                                                <div 
                                                    onClick={() => isMe && setShowActionsId(isActionsOpen ? null : m.id)}
                                                    className={`px-4 py-3 rounded-[1.5rem] text-sm shadow-sm cursor-pointer transition-all ${
                                                        isMe 
                                                        ? 'bg-primary-blue text-white rounded-tr-none' 
                                                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                    } ${isActionsOpen ? 'ring-4 ring-blue-100' : ''}`}
                                                >
                                                    <div className="whitespace-pre-wrap font-medium leading-relaxed">{m.text}</div>
                                                    {renderAttachments(m.attachments)}
                                                    <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
                                                        {m.isEdited && <span className="text-[7px] font-black uppercase tracking-tighter">Edited</span>}
                                                        <p className={`text-[8px] font-black ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                            {formatOnlyTime(m.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isMe && isActionsOpen && (
                                                    <div className="flex gap-2 mt-2 animate-fade-in">
                                                        <button onClick={() => { setEditingMsgId(m.id); setInput(m.text); setShowActionsId(null); }} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-[10px] font-black text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">แก้ไข</button>
                                                        <button onClick={() => handleDelete(m.id)} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-[10px] font-black text-rose-600 hover:bg-rose-50 transition-colors shadow-sm">ลบ</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {selectedContact !== 'all' && activeMessages.length < 5 && (
                                    <div className="pt-4 space-y-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase px-2 tracking-widest">Suggestions:</p>
                                        <div className="flex flex-wrap gap-2 px-1">
                                            {QUICK_QUESTIONS.map((item, idx) => (
                                                <button key={idx} onClick={() => setInput(item.q)} className="text-[11px] bg-white border border-blue-100 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-all font-black shadow-sm">
                                                    {item.q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100 z-10">
                                {editingMsgId && (
                                    <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                                        <span className="text-xs text-blue-700 font-bold">กำลังแก้ไขข้อความ...</span>
                                        <button onClick={() => { setEditingMsgId(null); setInput(''); }} className="text-blue-500 hover:text-blue-700"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 text-primary-blue hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
                                        title="Attach File"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                    <input 
                                        type="file" 
                                        multiple 
                                        ref={fileInputRef} 
                                        onChange={(e) => handleSend(e.target.files!)} 
                                        className="hidden" 
                                    />
                                    <div className="flex-grow flex gap-2 bg-gray-100 p-1.5 rounded-[2rem] border border-transparent focus-within:bg-white focus-within:border-blue-100 focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-inner">
                                        <input 
                                            type="text" 
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder="Type a message..."
                                            className="flex-grow bg-transparent border-none px-4 py-2 text-sm outline-none font-bold text-navy"
                                        />
                                        <button 
                                            onClick={() => handleSend()}
                                            disabled={(!input.trim() && !isSending) || isSending}
                                            className="bg-primary-blue text-white p-2 rounded-full hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all shadow-md flex-shrink-0"
                                        >
                                            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Trigger Button */}
            <div className="relative group">
                {/* Notification Badge - อยู่นอกปุ่มเพื่อให้แสดงผลเต็มไม่ถูกขอบตัด */}
                {unreadCount > 0 && !isOpen && (
                    <div className="absolute -top-1 -right-1 z-20 flex h-7 w-7 pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-7 w-7 bg-red-500 border-2 border-white text-[11px] font-black text-white items-center justify-center shadow-lg">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </div>
                )}
                
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 transform hover:scale-110 active:scale-95 relative ${isOpen ? 'bg-rose-500 rotate-[360deg]' : 'bg-primary-blue'}`}
                >
                    {isOpen ? (
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AIChatPopup;
