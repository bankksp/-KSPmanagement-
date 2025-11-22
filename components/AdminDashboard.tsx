
import React, { useState } from 'react';
import { Settings } from '../types';
import { getDirectDriveImageSrc } from '../utils';

interface AdminDashboardProps {
    settings: Settings;
    onSave: (settings: Settings) => void;
    onExit: () => void;
    isSaving: boolean;
}

type AdminTab = 'general' | 'appearance' | 'lists' | 'system';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ settings, onSave, onExit, isSaving }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('general');
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
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
                                <input type="file" onChange={handleLogoUpload} accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary-blue hover:file:bg-blue-100"/>
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
            case 'system':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Script URL</label>
                            <input type="text" name="googleScriptUrl" value={localSettings.googleScriptUrl} onChange={handleSettingsChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านระบบ (System Password)</label>
                            <input type="password" name="adminPassword" value={localSettings.adminPassword || ''} onChange={handleSettingsChange} placeholder="กำหนดรหัสผ่านสำหรับยืนยันการลบ" className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                            <p className="text-xs text-gray-500 mt-1">ใช้สำหรับการยืนยันการลบข้อมูลสำคัญ</p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="md:w-1/4">
                    <h2 className="text-xl font-bold text-navy mb-4">เมนูตั้งค่า</h2>
                    <nav className="space-y-2">
                        {(['general', 'appearance', 'lists', 'system'] as AdminTab[]).map(tab => {
                            const labels: Record<AdminTab, string> = { general: 'ทั่วไป', appearance: 'หน้าตาเว็บ', lists: 'รายการข้อมูล', system: 'ระบบ' };
                            return (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === tab ? 'bg-accent-blue text-primary-blue font-semibold' : 'hover:bg-gray-100'}`}>
                                    {labels[tab]}
                                </button>
                            )
                        })}
                    </nav>
                </aside>
                {/* Main Content */}
                <main className="md:w-3/4">
                    <div className="mb-6 pb-4 border-b">
                         <h2 className="text-2xl font-bold text-navy">
                             {
                                {general: 'ตั้งค่าทั่วไป', appearance: 'ปรับแต่งหน้าตาเว็บ', lists: 'จัดการรายการข้อมูล', system: 'ตั้งค่าระบบ'}[activeTab]
                             }
                        </h2>
                    </div>
                    <div className="space-y-6">
                        {renderContent()}
                    </div>
                </main>
            </div>
            <div className="mt-8 pt-4 border-t flex justify-end items-center space-x-3">
                <button type="button" onClick={onExit} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                    ออกจากหน้าตั้งค่า
                </button>
                <button 
                    type="button" 
                    onClick={() => onSave(localSettings)} 
                    disabled={isSaving}
                    className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;