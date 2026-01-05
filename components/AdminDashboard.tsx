
import React, { useState } from 'react';
import { Settings, AttendancePeriodConfig } from '../types';
import { getDirectDriveImageSrc, postToGoogleScript } from '../utils';

interface AdminDashboardProps {
    settings: Settings;
    onSave: (settings: Settings) => void;
    onExit: () => void;
    isSaving: boolean;
}

type AdminTab = 'general' | 'appearance' | 'lists' | 'attendance' | 'system';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ settings, onSave, onExit, isSaving }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('general');
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [scriptVersion, setScriptVersion] = useState<string>('');
    const [checkingVersion, setCheckingVersion] = useState(false);
    
    const [newItem, setNewItem] = useState({ 
        dormitory: '', 
        position: '', 
        academicYear: '',
        studentClass: '',
        studentClassroom: ''
    });

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };
    
    const handleThemeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({
            ...prev,
            themeColors: {
                ...prev.themeColors,
                [name]: value,
            }
        }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setLocalSettings(prev => ({...prev, schoolLogo: reader.result as string}));
            };
        }
    };
    
    const togglePeriod = (id: string) => {
        const periods = [...(localSettings.attendancePeriods || [])];
        const idx = periods.findIndex(p => p.id === id);
        if (idx !== -1) {
            periods[idx] = { ...periods[idx], enabled: !periods[idx].enabled };
            setLocalSettings(prev => ({ ...prev, attendancePeriods: periods }));
        }
    };

    const handleTestWebhook = async (field: keyof Settings, label: string) => {
        const url = localSettings[field] as string;
        if (!url) {
            alert('กรุณากรอก Webhook URL ก่อนทดสอบ');
            return;
        }
        
        setIsTesting(field);
        try {
            const response = await postToGoogleScript({
                action: 'testWebhook',
                data: { url, label }
            });
            if (response.status === 'success') {
                alert(`✅ เชื่อมต่อสำเร็จ! Google Chat ควรจะเด้งแจ้งเตือนแล้ว\nข้อความจากระบบ: ${response.message || 'OK'}`);
            } else {
                throw new Error(response.message);
            }
        } catch (error: any) {
            alert('❌ การทดสอบล้มเหลว: ' + error.message + '\n\nสาเหตุที่เป็นไปได้:\n1. URL ผิด หรือยังไม่ได้กดบันทึก\n2. คุณยังไม่ได้ Redeploy Code ล่าสุด (สำคัญ!)\n3. สคริปต์ยังไม่มีสิทธิ์ (Re-authorize)');
        } finally {
            setIsTesting(null);
        }
    };

    const checkBackendVersion = async () => {
        setCheckingVersion(true);
        try {
            const res = await postToGoogleScript({ action: 'checkVersion' });
            if (res.version) {
                setScriptVersion(res.version);
                alert(`Backend Version: ${res.version}\nเชื่อมต่อได้ปกติ`);
            } else {
                setScriptVersion('Unknown');
                alert('ไม่พบเลขเวอร์ชั่น (อาจเป็นโค้ดเก่า)');
            }
        } catch(e) {
            alert('ไม่สามารถเชื่อมต่อ Backend ได้');
        } finally {
            setCheckingVersion(false);
        }
    };

    const handleAddItem = (
        key: 'dormitories' | 'positions' | 'academicYears' | 'studentClasses' | 'studentClassrooms', 
        valueKey: 'dormitory' | 'position' | 'academicYear' | 'studentClass' | 'studentClassroom'
    ) => {
        const value = newItem[valueKey].trim();
        if (value && !localSettings[key].includes(value)) {
            setLocalSettings(prev => ({
                ...prev,
                [key]: [...prev[key], value]
            }));
            setNewItem(prev => ({ ...prev, [valueKey]: '' }));
        }
    };

    const handleRemoveItem = (
        key: 'dormitories' | 'positions' | 'academicYears' | 'studentClasses' | 'studentClassrooms', 
        index: number
    ) => {
        setLocalSettings(prev => ({
            ...prev,
            [key]: prev[key].filter((_, i) => i !== index)
        }));
    };
    
    const ListEditor: React.FC<{ 
        title: string; 
        items: string[]; 
        itemKey: 'dormitories' | 'positions' | 'academicYears' | 'studentClasses' | 'studentClassrooms'; 
        valueKey: 'dormitory' | 'position' | 'academicYear' | 'studentClass' | 'studentClassroom'; 
    }> = ({ title, items, itemKey, valueKey }) => (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded-lg max-h-40 overflow-y-auto">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        <span>{item}</span>
                        <button type="button" onClick={() => handleRemoveItem(itemKey, index)} className="ml-2 text-blue-600 hover:text-blue-800 font-bold">&times;</button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    name={valueKey}
                    value={newItem[valueKey]}
                    onChange={(e) => setNewItem(prev => ({ ...prev, [valueKey]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(itemKey, valueKey); } }}
                    placeholder={`เพิ่ม${title}ใหม่`}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button type="button" onClick={() => handleAddItem(itemKey, valueKey)} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg">เพิ่ม</button>
            </div>
        </div>
    );

    const WebhookInput: React.FC<{ label: string; name: keyof Settings }> = ({ label, name }) => (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    name={name} 
                    value={(localSettings[name] as string) || ''} 
                    onChange={handleSettingsChange} 
                    placeholder="https://chat.googleapis.com/..." 
                    className="flex-grow px-4 py-2 text-xs border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-300 font-mono" 
                />
                <button 
                    type="button" 
                    onClick={() => handleTestWebhook(name, label)}
                    disabled={isTesting === name}
                    className="bg-white border border-indigo-200 text-indigo-600 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                    {isTesting === name ? '...' : 'ทดสอบ'}
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                const logoSrc = getDirectDriveImageSrc(localSettings.schoolLogo);
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโรงเรียน</label>
                            <input type="text" name="schoolName" value={localSettings.schoolName} onChange={handleSettingsChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">โลโก้โรงเรียน</label>
                            <div className="flex items-center gap-4">
                                <img 
                                    src={logoSrc} 
                                    alt="Logo Preview" 
                                    className="h-20 w-20 object-contain bg-gray-100 p-2 rounded-md border"
                                    onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                                />
                                <div className="flex-grow">
                                    <input 
                                        type="text" 
                                        name="schoolLogo" 
                                        value={localSettings.schoolLogo} 
                                        onChange={handleSettingsChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                                        placeholder="วาง URL รูปภาพที่นี่ (หรืออัปโหลดด้านล่าง)"
                                    />
                                    <input type="file" onChange={handleLogoUpload} accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100"/>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">สีหลัก (Primary Color)</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" name="primary" value={localSettings.themeColors.primary} onChange={handleThemeColorChange} className="h-10 w-10 p-1 border rounded-lg"/>
                                    <input type="text" name="primary" value={localSettings.themeColors.primary} onChange={handleThemeColorChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">สีหลักเมื่อวางเมาส์ (Primary Hover)</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" name="primaryHover" value={localSettings.themeColors.primaryHover} onChange={handleThemeColorChange} className="h-10 w-10 p-1 border rounded-lg"/>
                                    <input type="text" name="primaryHover" value={localSettings.themeColors.primaryHover} onChange={handleThemeColorChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'lists':
                 return (
                    <div className="space-y-6">
                        <ListEditor title="เรือนนอน" items={localSettings.dormitories} itemKey="dormitories" valueKey="dormitory" />
                        <ListEditor title="ชั้นเรียน" items={localSettings.studentClasses} itemKey="studentClasses" valueKey="studentClass" />
                        <ListEditor title="ห้องเรียน" items={localSettings.studentClassrooms} itemKey="studentClassrooms" valueKey="studentClassroom" />
                        <ListEditor title="ตำแหน่ง" items={localSettings.positions} itemKey="positions" valueKey="position" />
                        <ListEditor title="ปีการศึกษา" items={localSettings.academicYears} itemKey="academicYears" valueKey="academicYear" />
                    </div>
                );
            case 'attendance':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                            <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ตั้งค่าช่วงเวลาการเช็คชื่อ
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">เปิด/ปิด ช่วงเวลาที่ต้องการให้แสดงในระบบเช็คชื่อนักเรียนและบุคลากร</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {(localSettings.attendancePeriods || []).map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => togglePeriod(p.id)}
                                        className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${p.enabled ? 'bg-white border-blue-500 text-blue-700 shadow-md ring-4 ring-blue-50' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}
                                    >
                                        <span className="font-bold">{p.label}</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${p.enabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${p.enabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} style={{left: 0}}></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'system':
                return (
                    <div className="space-y-6">
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="text-orange-500 text-xl">⚠️</div>
                                <div>
                                    <h4 className="font-bold text-orange-800">สำคัญ: เมื่ออัปเดตโค้ดใน Script Editor</h4>
                                    <p className="text-sm text-orange-700 mt-1">
                                        ทุกครั้งที่มีการแก้โค้ด <code>Code.gs</code> คุณต้องกด <b>Deploy &gt; New Deployment</b> และเลือก type เป็น <b>Web app</b> เสมอ
                                        (Execute as: Me / Access: Anyone) เพื่อให้ระบบอัปเดตความสามารถใหม่ๆ
                                    </p>
                                    <button 
                                        onClick={checkBackendVersion} 
                                        disabled={checkingVersion}
                                        className="mt-3 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-orange-700 transition-all"
                                    >
                                        {checkingVersion ? 'Checking...' : 'ตรวจสอบเวอร์ชั่นปัจจุบัน'}
                                    </button>
                                    {scriptVersion && <p className="text-xs font-mono mt-2 text-gray-500">Current Version: {scriptVersion}</p>}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Script URL</label>
                            <input type="text" name="googleScriptUrl" value={localSettings.googleScriptUrl} onChange={handleSettingsChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                        </div>

                        <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm space-y-4">
                            <h3 className="text-lg font-black text-indigo-900 tracking-tight flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                ตั้งค่าการแจ้งเตือน Google Chat
                            </h3>
                            <p className="text-xs text-indigo-500 mb-4">
                                * ต้องนำลิ้งค์ Webhook จาก Google Chat มาใส่ให้ครบ และกดปุ่ม <b>"ทดสอบ"</b> เพื่อยืนยันว่าระบบทำงานได้
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <WebhookInput label="ระบบเช็คชื่อ (Attendance)" name="webhookAttendance" />
                                <WebhookInput label="รายงานเรือนนอน (Dormitory)" name="webhookDormitory" />
                                <WebhookInput label="งานวิชาการ (Academic)" name="webhookAcademic" />
                                <WebhookInput label="งบประมาณ/พัสดุ (Finance/Supply)" name="webhookFinance" />
                                <WebhookInput label="งานทั่วไป/แจ้งซ่อม (General)" name="webhookGeneral" />
                                <WebhookInput label="ดูแลช่วยเหลือ (Student Support)" name="webhookStudentSupport" />
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านระบบ (System Password)</label>
                            <input type="password" name="adminPassword" value={localSettings.adminPassword || ''} onChange={handleSettingsChange} placeholder="กำหนดรหัสผ่านสำหรับยืนยันการลบ" className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 mt-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-600 text-white rounded-2xl shadow-lg">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">ซ่อนแถบเมนูอัตโนมัติ (Auto-Hide Sidebar)</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">ระบบจะซ่อนเมนูเมื่อใช้งานหน้าจอกว้าง และแสดงเมื่อนำเมาส์ไปวางที่ขอบจอ</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLocalSettings(prev => ({ ...prev, autoHideSidebar: !prev.autoHideSidebar }))}
                                    className={`w-16 h-8 rounded-full relative transition-all duration-500 ease-in-out flex-shrink-0 shadow-inner ${localSettings.autoHideSidebar ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-500 transform ${localSettings.autoHideSidebar ? 'translate-x-9' : 'translate-x-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-100 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4">
                    <h2 className="text-xl font-bold text-navy mb-6 px-4">เมนูตั้งค่า</h2>
                    <nav className="space-y-1">
                        {(['general', 'appearance', 'lists', 'attendance', 'system'] as AdminTab[]).map(tab => {
                            const labels: Record<AdminTab, string> = { general: 'ทั่วไป', appearance: 'หน้าตาเว็บ', lists: 'จัดการข้อมูล', attendance: 'เช็คชื่อ', system: 'ระบบ' };
                            return (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-4 py-3 rounded-2xl transition-all ${activeTab === tab ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {labels[tab]}
                                </button>
                            )
                        })}
                    </nav>
                </aside>
                <main className="md:w-3/4">
                    <div className="mb-8 pb-4 border-b">
                         <h2 className="text-2xl font-black text-navy tracking-tight">
                             {
                                {general: 'ตั้งค่าทั่วไป', appearance: 'ปรับแต่งหน้าตาเว็บ', lists: 'จัดการรายการข้อมูล', attendance: 'ตั้งค่าระบบเช็คชื่อ', system: 'ตั้งค่าระบบ'}[activeTab]
                             }
                        </h2>
                    </div>
                    <div className="space-y-6">
                        {renderContent()}
                    </div>
                </main>
            </div>
            <div className="mt-12 pt-6 border-t flex justify-end items-center space-x-3">
                <button type="button" onClick={onExit} className="bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-2.5 px-6 rounded-2xl transition-all">
                    ยกเลิก
                </button>
                <button 
                    type="button" 
                    onClick={() => onSave(localSettings)} 
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-10 rounded-2xl shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95 transition-all"
                >
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;
