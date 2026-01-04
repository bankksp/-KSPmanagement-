
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Student, Personnel, Report, Settings, StudentAttendance } from '../types';

interface AIChatPopupProps {
    students: Student[];
    personnel: Personnel[];
    reports: Report[];
    settings: Settings;
    studentAttendance: StudentAttendance[];
}

const AIChatPopup: React.FC<AIChatPopupProps> = ({ 
    students, personnel, reports, settings, studentAttendance 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        { role: 'model', text: 'สวัสดีครับ! ผมคือ "D-Bot" AI ผู้ช่วยส่วนตัวประจำแอป D-school ยินดีที่ได้พบคุณครับ มีอะไรให้ผมช่วยวิเคราะห์ข้อมูล หรือแนะนำการใช้งานเมนูไหนไหมครับ?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const generateSystemInstruction = () => {
        const today = new Date().toLocaleDateString('th-TH');
        const dorms = settings.dormitories?.join(', ') || '';
        const studentCount = students.length;
        const personnelCount = personnel.length;
        
        return `
            You are "D-Bot", a high-end AI assistant for the D-school Smart Management Platform (โรงเรียนกาฬสินธุ์ปัญญานุกูล).
            You have access to current school data provided in the prompt context.
            
            Current School Context:
            - School Name: ${settings.schoolName}
            - Today's Date: ${today}
            - Total Students: ${studentCount}
            - Total Personnel: ${personnelCount}
            - Dormitories: ${dorms}
            
            Guidelines for answering:
            1. Language: ALWAYS answer in Thai. Use polite particles like "ครับ".
            2. Style: Professional, friendly, helpful, and concise.
            3. Data Source: Use the provided counts for accuracy.
            4. Guidance: If users ask "how to...", explain which menu to click.
            5. Limitations: You cannot modify data directly.
        `;
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        const newMessages = [...messages, { role: 'user' as const, text: userMessage }];
        
        setInput('');
        setMessages(newMessages);
        setIsTyping(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Format history for Gemini API correctly
            const chatContents = newMessages.map(m => ({
                role: m.role === 'model' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));

            const responseStream = await ai.models.generateContentStream({
                model: 'gemini-3-flash-preview',
                contents: chatContents,
                config: {
                    systemInstruction: generateSystemInstruction(),
                    temperature: 0.7,
                    maxOutputTokens: 800,
                }
            });

            let fullText = '';
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            
            for await (const chunk of responseStream) {
                const chunkText = chunk.text;
                if (chunkText) {
                    fullText += chunkText;
                    setMessages(prev => {
                        const newMsgList = [...prev];
                        newMsgList[newMsgList.length - 1] = { role: 'model', text: fullText };
                        return newMsgList;
                    });
                }
            }
        } catch (error: any) {
            console.error("D-Bot Error:", error);
            const errorMessage = 'ขออภัยครับ การสื่อสารกับสมองกลขัดข้องชั่วคราว โปรดลองใหม่อีกครั้ง';
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1100] font-sarabun no-print">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] sm:w-[420px] h-[600px] bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 flex flex-col overflow-hidden animate-fade-in-up ring-1 ring-black/5">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-navy to-indigo-700 text-white flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-[1.25rem] flex items-center justify-center text-2xl animate-pulse border border-white/30">🤖</div>
                            <div>
                                <h3 className="font-black text-base leading-tight">D-Bot Assistant</h3>
                                <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">Powered by Gemini AI</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2.5 rounded-full transition-all active:scale-90 bg-black/5">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-5 bg-gray-50/50 custom-scrollbar relative">
                        <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-gray-50/50 to-transparent pointer-events-none z-10"></div>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                <div className={`max-w-[90%] px-5 py-3.5 rounded-[1.5rem] text-sm leading-relaxed shadow-sm border ${
                                    m.role === 'user' 
                                    ? 'bg-primary-blue text-white border-blue-400 rounded-tr-none shadow-blue-500/10' 
                                    : 'bg-white text-navy border-gray-100 rounded-tl-none'
                                }`}>
                                    <div className="whitespace-pre-wrap">{m.text}</div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 px-5 py-3 rounded-[1.5rem] rounded-tl-none shadow-sm flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Thinking</span>
                                </div>
                            </div>
                        )}
                        <div className="h-4"></div>
                    </div>

                    {/* Input Area */}
                    <div className="p-5 bg-white border-t border-gray-100">
                        <div className="flex gap-2 bg-gray-100 p-2 rounded-[1.5rem] border border-gray-200 focus-within:ring-4 focus-within:ring-primary-blue/10 focus-within:bg-white focus-within:border-primary-blue transition-all shadow-inner">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="ถามสถิตินักเรียน หรือวิธีใช้งาน..."
                                className="flex-grow bg-transparent border-none px-4 py-2 text-sm outline-none font-bold text-navy placeholder:text-gray-400"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="bg-navy text-white p-3 rounded-[1.25rem] hover:bg-blue-900 active:scale-90 transition-all disabled:opacity-30 shadow-lg shadow-blue-900/10"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-500 transform hover:scale-110 active:scale-95 border-2 border-white/50 group relative ${isOpen ? 'bg-rose-500 rotate-90' : 'bg-navy'}`}
            >
                {isOpen ? (
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <div className="relative">
                        <span className="text-3xl group-hover:animate-bounce inline-block filter drop-shadow-md">🤖</span>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                    </div>
                )}
            </button>
        </div>
    );
};

export default AIChatPopup;
