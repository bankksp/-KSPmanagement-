
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
        { role: 'model', text: 'สวัสดีครับ! ผมคือ AI ผู้ช่วยประจำ D-school ยินดีให้คำแนะนำทั้งเรื่องสถิตินักเรียน หรือวิธีการใช้งานเมนูต่างๆ สอบถามได้เลยครับ' }
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

    const getSystemInstruction = () => {
        const today = new Date().toLocaleDateString('th-TH');
        const dorms = settings.dormitories?.join(', ') || '';
        
        return `
            You are "D-Bot", an AI assistant for D-school Smart Management Platform (โรงเรียนกาฬสินธุ์ปัญญานุกูล).
            Current Context:
            - School Name: ${settings.schoolName}
            - Today's Date: ${today}
            - Total Students: ${students.length}
            - Total Personnel: ${personnel.length}
            - Dormitories: ${dorms}
            - App Sections: Dashboard, Student Records, Attendance (Student/Staff), Reports, Academic Plans, Finance/Supplies, Durable Goods, General Documents, Repair Requests, Construction, Nutrition.
            
            Guidelines:
            1. Answer in Thai language professionally and helpfully.
            2. For stats questions, use the provided context.
            3. If asked about how to use, guide them to the specific menu (e.g., "ไปที่เมนู 'งานบริหารทั่วไป' -> 'งานสารบัญ'").
            4. Keep answers concise but complete.
            5. ALWAYS start the interaction with the user's message.
        `;
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        const newMessages = [...messages, { role: 'user' as const, text: userMessage }];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            // ดึง API Key จากสภาพแวดล้อม รองรับทั้งชื่อมาตรฐาน และชื่อที่ผู้ใช้ตั้งใน Vercel
            const apiKey = process.env.API_KEY || process.env.GOOGLE_API_KEY;
            
            if (!apiKey) {
                throw new Error("Missing API Key. Please configure API_KEY or GOOGLE_API_KEY in environment variables.");
            }

            // เริ่มต้นใช้งาน SDK ตาม Coding Guidelines
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const modelName = 'gemini-3-flash-preview';
            
            // เตรียมรูปแบบ Content ให้ Gemini โดยตัด greeting แรกที่เป็น model ออกถ้าเป็นข้อความเริ่ม
            const apiContents = newMessages
                .filter((m, i) => !(i === 0 && m.role === 'model'))
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));

            const responseStream = await ai.models.generateContentStream({
                model: modelName,
                contents: apiContents,
                config: {
                    systemInstruction: getSystemInstruction(),
                    temperature: 0.7,
                }
            });

            let fullText = '';
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            
            for await (const chunk of responseStream) {
                const chunkText = chunk.text;
                if (chunkText) {
                    fullText += chunkText;
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1] = { role: 'model', text: fullText };
                        return newMsgs;
                    });
                }
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: 'ขออภัยครับ ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้ กรุณาตรวจสอบสถานะของ API Key ใน Google AI Studio และตรวจสอบการตั้งค่า GOOGLE_API_KEY ใน Vercel อีกครั้ง' 
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-sarabun no-print">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[550px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col overflow-hidden animate-fade-in-up ring-1 ring-black/5">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-navy to-blue-700 text-white flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl animate-pulse">🤖</div>
                            <div>
                                <h3 className="font-black text-sm leading-tight">D-Bot Assistant</h3>
                                <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold">Smart AI Helper</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-4 bg-gray-50/30 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                                    m.role === 'user' 
                                    ? 'bg-primary-blue text-white border-blue-400 rounded-tr-none' 
                                    : 'bg-white text-navy border-gray-100 rounded-tl-none'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary-blue focus-within:bg-white transition-all">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="สอบถาม AI ได้ที่นี่..."
                                className="flex-grow bg-transparent border-none px-4 py-2 text-sm outline-none font-medium text-navy placeholder:text-gray-400"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="bg-navy text-white p-2 rounded-xl hover:bg-blue-900 active:scale-90 transition-all disabled:opacity-30"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-2 font-bold uppercase tracking-tighter">AI may generate inaccurate information. Check important info.</p>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 transform hover:scale-110 active:scale-90 border-2 border-white/50 group ${isOpen ? 'bg-rose-500 rotate-90' : 'bg-navy'}`}
            >
                {isOpen ? (
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <div className="relative">
                        <span className="text-3xl group-hover:animate-bounce inline-block">🤖</span>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-50 border-2 border-white rounded-full"></div>
                    </div>
                )}
            </button>
        </div>
    );
};

export default AIChatPopup;
