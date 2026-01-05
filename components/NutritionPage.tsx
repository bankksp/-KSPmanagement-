
import React, { useState, useMemo } from 'react';
import { Personnel, MealPlan, Ingredient, NutritionTargetGroup, Student, MealPlanItem } from '../types';
import { NUTRITION_STANDARDS } from '../constants';
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, safeParseArray, formatThaiDate } from '../utils';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    RadialBarChart, RadialBar, PolarAngleAxis, Cell, PieChart, Pie
} from 'recharts';

interface NutritionPageProps {
    currentUser: Personnel;
    mealPlans: MealPlan[];
    ingredients: Ingredient[];
    onSaveMealPlan: (plan: MealPlan) => void;
    onDeleteMealPlan: (ids: number[]) => void;
    onSaveIngredient: (ingredient: Ingredient) => void;
    onDeleteIngredient: (ids: number[]) => void;
    isSaving: boolean;
    students: Student[];
}

const NutritionPage: React.FC<NutritionPageProps> = ({
    currentUser, mealPlans, ingredients, onSaveMealPlan, onDeleteMealPlan, 
    onSaveIngredient, onDeleteIngredient, isSaving, students = []
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'ingredients' | 'shopping_list'>('dashboard');
    const [filterDate, setFilterDate] = useState(getCurrentThaiDate());
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear() + 543);
    const [studentCount, setStudentCount] = useState(students.length || 100);
    const [targetGroup, setTargetGroup] = useState<NutritionTargetGroup>('primary');
    
    // Planner State
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<Partial<MealPlan>>({
        date: getCurrentThaiDate(),
        targetGroup: 'primary',
        menuName: '',
        mealType: 'lunch',
        items: []
    });

    // Fix: Added missing state variables for ingredient management
    // Ingredient State
    const [isIngModalOpen, setIsIngModalOpen] = useState(false);
    const [currentIng, setCurrentIng] = useState<Partial<Ingredient>>({});

    // --- Derived Data ---
    const monthPlans = useMemo(() => {
        return mealPlans.filter(p => {
            const parts = p.date.split('/');
            return Number(parts[1]) === filterMonth && Number(parts[2]) === filterYear;
        });
    }, [mealPlans, filterMonth, filterYear]);

    const dailyPlans = useMemo(() => {
        return mealPlans.filter(p => p.date === filterDate);
    }, [mealPlans, filterDate]);

    // คำนวณรายการซื้อของประจำเดือน (หรือวันที่เลือก)
    const shoppingList = useMemo(() => {
        const itemMap: Record<number, { name: string, unit: string, amount: number, price: number }> = {};
        
        // กรองตามแท็บ ถ้าอยู่ที่ planner/dashboard ให้ดูเป็นวัน ถ้าอยู่ที่ shopping_list ให้ดูเป็นเดือน
        const targetPlans = activeTab === 'shopping_list' ? monthPlans : dailyPlans;

        targetPlans.forEach(plan => {
            safeParseArray(plan.items).forEach((item: MealPlanItem) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                if (ing) {
                    const totalNeeded = (item.amount || 0) * studentCount;
                    if (!itemMap[ing.id]) {
                        itemMap[ing.id] = { 
                            name: ing.name, 
                            unit: ing.unit, 
                            amount: 0, 
                            price: ing.price || 0 
                        };
                    }
                    itemMap[ing.id].amount += totalNeeded;
                }
            });
        });

        return Object.entries(itemMap).map(([id, data]) => ({
            id: Number(id),
            ...data,
            totalPrice: data.amount * data.price
        })).sort((a, b) => b.totalPrice - a.totalPrice);
    }, [monthPlans, dailyPlans, ingredients, studentCount, activeTab]);

    const totalEstimatedCost = useMemo(() => {
        return shoppingList.reduce((sum, item) => sum + item.totalPrice, 0);
    }, [shoppingList]);

    const dailyNutrition = useMemo(() => {
        let cal = 0, pro = 0, fat = 0, carbs = 0;
        dailyPlans.forEach(plan => {
            safeParseArray(plan.items).forEach((item: MealPlanItem) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                if (ing) {
                    cal += (ing.calories || 0) * (item.amount || 0);
                    pro += (ing.protein || 0) * (item.amount || 0);
                    fat += (ing.fat || 0) * (item.amount || 0);
                    carbs += (ing.carbs || 0) * (item.amount || 0);
                }
            });
        });
        return { cal, pro, fat, carbs };
    }, [dailyPlans, ingredients]);

    const handleOpenMenuModal = (plan?: MealPlan, type?: 'breakfast' | 'lunch' | 'dinner') => {
        if (plan) {
            setCurrentPlan({ ...plan });
        } else {
            setCurrentPlan({
                date: filterDate,
                targetGroup: targetGroup,
                menuName: '',
                mealType: type || 'lunch',
                items: []
            });
        }
        setIsMenuModalOpen(true);
    };

    const handleSavePlan = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveMealPlan({ ...currentPlan, id: currentPlan.id || Date.now() } as MealPlan);
        setIsMenuModalOpen(false);
    };

    const handleAddIngRow = () => {
        setCurrentPlan(prev => ({
            ...prev,
            items: [...(prev.items || []), { ingredientId: ingredients[0]?.id || 0, amount: 1 }]
        }));
    };

    return (
        <div className="space-y-6 font-sarabun pb-10">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <div className="flex bg-white/50 p-1 rounded-2xl border border-gray-200 shadow-sm">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>แดชบอร์ด</button>
                    <button onClick={() => setActiveTab('planner')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'planner' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>วางแผนเมนู 3 มื้อ</button>
                    <button onClick={() => setActiveTab('shopping_list')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'shopping_list' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ใบสั่งซื้อวัตถุดิบ</button>
                    <button onClick={() => setActiveTab('ingredients')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'ingredients' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>คลังข้อมูลวัตถุดิบ</button>
                </div>

                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">จำนวนนักเรียน:</span>
                    <input 
                        type="number" 
                        value={studentCount} 
                        onChange={e => setStudentCount(Number(e.target.value))} 
                        className="w-20 text-center font-black text-navy border-none focus:ring-0"
                    />
                </div>
            </div>

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">งบประมาณที่ต้องใช้ (วันนี้)</p>
                            <h3 className="text-3xl font-black text-navy">{totalEstimatedCost.toLocaleString()} <span className="text-xs font-normal">บาท</span></h3>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">เมนูที่จัดแล้ว (วันนี้)</p>
                            <h3 className="text-3xl font-black text-blue-600">{dailyPlans.length} / 3</h3>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">พลังงานรวมต่อคน</p>
                            <h3 className="text-3xl font-black text-emerald-600">{Math.round(dailyNutrition.cal)} <span className="text-xs font-normal">Kcal</span></h3>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">กลุ่มเป้าหมาย</p>
                            <select value={targetGroup} onChange={e => setTargetGroup(e.target.value as any)} className="w-full mt-1 border-none font-bold text-navy p-0 focus:ring-0 cursor-pointer">
                                <option value="kindergarten">อนุบาล</option>
                                <option value="primary">ประถม</option>
                                <option value="secondary">มัธยม</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 h-96">
                            <h3 className="text-lg font-black text-navy mb-6">ความเหมาะสมของสารอาหารประจำวัน</h3>
                            <ResponsiveContainer width="100%" height="80%">
                                <BarChart data={[
                                    { name: 'โปรตีน', val: dailyNutrition.pro, target: NUTRITION_STANDARDS[targetGroup].protein, fill: '#3B82F6' },
                                    { name: 'ไขมัน', val: dailyNutrition.fat, target: NUTRITION_STANDARDS[targetGroup].fat, fill: '#F59E0B' },
                                    { name: 'คาร์บฯ', val: dailyNutrition.carbs, target: NUTRITION_STANDARDS[targetGroup].carbs, fill: '#10B981' }
                                ]} layout="vertical" margin={{ left: 30, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                    <Tooltip />
                                    <Bar dataKey="val" name="ได้รับ" radius={[0, 8, 8, 0]} barSize={24} />
                                    <Bar dataKey="target" name="แนะนำ" fill="#E2E8F0" radius={[0, 8, 8, 0]} barSize={10} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                            <h3 className="text-lg font-black text-navy mb-6">เมนูอาหารวันนี้ ({filterDate})</h3>
                            <div className="space-y-4">
                                {['breakfast', 'lunch', 'dinner'].map(type => {
                                    const plan = dailyPlans.find(p => p.mealType === type);
                                    return (
                                        <div key={type} className={`flex items-center justify-between p-4 rounded-2xl border ${plan ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-dashed border-gray-200 opacity-60'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-lg">
                                                    {type === 'breakfast' ? '🌅' : type === 'lunch' ? '☀️' : '🌙'}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{type === 'breakfast' ? 'เช้า' : type === 'lunch' ? 'กลางวัน' : 'เย็น'}</p>
                                                    <p className="font-black text-navy">{plan?.menuName || 'ยังไม่ได้กำหนดเมนู'}</p>
                                                </div>
                                            </div>
                                            {plan && <span className="text-xs font-bold text-blue-600">{Math.round(plan.totalCalories)} Kcal</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PLANNER TAB */}
            {activeTab === 'planner' && (
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-navy tracking-tight">ปฏิทินเมนูอาหาร</h3>
                            <p className="text-gray-400 text-xs font-bold mt-1">วางแผนอาหาร 3 มื้อเพื่อโภชนาการที่ดี</p>
                        </div>
                        <div className="flex gap-2">
                             <input type="date" value={buddhistToISO(filterDate)} onChange={e => setFilterDate(isoToBuddhist(e.target.value))} className="border rounded-2xl px-6 py-3 font-bold text-navy focus:ring-4 focus:ring-blue-50" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['breakfast', 'lunch', 'dinner'].map(type => {
                            const plan = dailyPlans.find(p => p.mealType === type);
                            return (
                                <div key={type} className="flex flex-col h-full bg-gray-50/50 rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-inner p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-black text-navy uppercase tracking-[0.2em] text-xs">{type}</h4>
                                        {plan && (
                                            <button onClick={() => onDeleteMealPlan([plan.id])} className="text-rose-400 hover:text-rose-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                    
                                    {plan ? (
                                        <div className="flex-grow space-y-6 animate-fade-in">
                                            <div className="relative group">
                                                <h5 className="text-2xl font-black text-navy leading-tight group-hover:text-primary-blue transition-colors">{plan.menuName}</h5>
                                                <div className="h-1 w-12 bg-primary-blue mt-3 rounded-full"></div>
                                            </div>
                                            <div className="space-y-3 bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">ส่วนประกอบหลัก</p>
                                                {safeParseArray(plan.items).map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-600 font-bold">{ingredients.find(ig => ig.id === item.ingredientId)?.name}</span>
                                                        <span className="text-navy font-black">x {item.amount}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-auto pt-6 flex justify-between items-end">
                                                <div className="text-center">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Energy</p>
                                                    <p className="text-xl font-black text-emerald-500">{Math.round(plan.totalCalories)}</p>
                                                </div>
                                                <button onClick={() => handleOpenMenuModal(plan, type as any)} className="bg-white text-navy px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:shadow-md transition-all active:scale-95">แก้ไขเมนู</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm opacity-40">🍽️</div>
                                            <p className="text-gray-400 font-bold italic text-sm">ยังไม่ได้กำหนดเมนู</p>
                                            <button onClick={() => handleOpenMenuModal(undefined, type as any)} className="bg-navy text-white px-8 py-3 rounded-2xl font-black text-xs hover:bg-blue-900 shadow-xl shadow-blue-900/10 active:scale-95 transition-all">+ เพิ่มเมนู</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SHOPPING LIST TAB (The Bill Section) */}
            {activeTab === 'shopping_list' && (
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 no-print">
                        <div>
                            <h3 className="text-2xl font-black text-navy tracking-tight">ใบสั่งซื้อวัตถุดิบ (ประจำเดือน)</h3>
                            <p className="text-gray-400 text-xs font-bold mt-1">สรุปรายการและปริมาณที่ต้องจัดซื้อทั้งหมด</p>
                        </div>
                        <div className="flex gap-4">
                            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-2xl px-6 py-3 font-bold text-navy focus:ring-4 focus:ring-blue-50">
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>เดือน{new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })}</option>
                                ))}
                            </select>
                            <button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                พิมพ์ใบสั่งซื้อ
                            </button>
                        </div>
                    </div>

                    <div id="shopping-bill" className="space-y-8">
                        {/* Bill Header (Visible on print) */}
                        <div className="hidden print:block text-center border-b-2 border-navy pb-6 mb-8">
                            <h1 className="text-2xl font-black text-navy">{currentUser.position}</h1>
                            <h2 className="text-xl font-bold">ใบสรุปรายการจัดซื้อวัตถุดิบประกอบอาหาร</h2>
                            <p className="text-sm">ประจำเดือน {new Date(0, filterMonth - 1).toLocaleString('th-TH', { month: 'long' })} ปี {filterYear}</p>
                            <p className="text-xs mt-2 text-gray-500">คำนวณสำหรับนักเรียน {studentCount} คน</p>
                        </div>

                        <div className="bg-gray-50/50 rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-inner">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-navy text-white">
                                    <tr>
                                        <th className="p-6 text-center w-16">#</th>
                                        <th className="p-6">รายการวัตถุดิบ</th>
                                        <th className="p-6 text-right">ปริมาณรวม</th>
                                        <th className="p-6 text-center">หน่วย</th>
                                        <th className="p-6 text-right">ราคา/หน่วย</th>
                                        <th className="p-6 text-right">รวมเงิน (บ.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {shoppingList.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors bg-white">
                                            <td className="p-6 text-center font-bold text-gray-300">{idx + 1}</td>
                                            <td className="p-6 font-black text-navy">{item.name}</td>
                                            <td className="p-6 text-right font-black text-indigo-600">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td className="p-6 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">{item.unit}</td>
                                            <td className="p-6 text-right font-bold text-gray-600">{item.price.toLocaleString()}</td>
                                            <td className="p-6 text-right font-black text-navy">{item.totalPrice.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {shoppingList.length === 0 && (
                                        <tr><td colSpan={6} className="p-20 text-center text-gray-300 italic">ไม่มีรายการที่ต้องจัดซื้อในเดือนนี้</td></tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-navy/5">
                                    <tr>
                                        <td colSpan={5} className="p-8 text-right font-black text-navy uppercase tracking-widest text-base">รวมงบประมาณทั้งสิ้น</td>
                                        <td className="p-8 text-right font-black text-navy text-2xl">{totalEstimatedCost.toLocaleString()} บ.</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Bill Footer (Signatures - visible on print) */}
                        <div className="hidden print:grid grid-cols-2 gap-20 mt-20 text-center">
                            <div className="space-y-12">
                                <p className="font-bold">ลงชื่อ.......................................................ผู้จัดทำ<br/>({currentUser.personnelName})</p>
                            </div>
                            <div className="space-y-12">
                                <p className="font-bold">ลงชื่อ.......................................................ผู้เห็นชอบ<br/>(เจ้าหน้าที่โภชนาการ)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* INGREDIENTS TAB */}
            {activeTab === 'ingredients' && (
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black text-navy">คลังข้อมูลวัตถุดิบและราคา</h3>
                        <button onClick={() => { setCurrentIng({}); setIsIngModalOpen(true); }} className="bg-primary-blue text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">เพิ่มวัตถุดิบใหม่</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ingredients.map(ing => (
                            <div key={ing.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">🥬</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setCurrentIng(ing); setIsIngModalOpen(true); }} className="p-2 text-gray-300 hover:text-blue-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                        <button onClick={() => onDeleteIngredient([ing.id])} className="p-2 text-gray-300 hover:text-rose-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                </div>
                                <h4 className="font-black text-navy text-lg leading-tight mb-4">{ing.name}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Energy</p>
                                        <p className="font-black text-navy text-sm">{ing.calories} <span className="text-[9px] font-normal">Kcal/{ing.unit}</span></p>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded-xl">
                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Price</p>
                                        <p className="font-black text-emerald-600 text-sm">{ing.price} <span className="text-[9px] font-normal">บ./{ing.unit}</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: MENU FORM */}
            {isMenuModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-primary-blue text-white flex justify-between items-center">
                            <h3 className="text-2xl font-black">บันทึกเมนูอาหาร</h3>
                            <button onClick={() => setIsMenuModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSavePlan} className="p-10 overflow-y-auto space-y-8 bg-gray-50/50 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อเมนู *</label>
                                    <input type="text" required value={currentPlan.menuName} onChange={e => setCurrentPlan({...currentPlan, menuName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-blue shadow-sm font-black text-navy" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">มื้ออาหาร</label>
                                    <select value={currentPlan.mealType} onChange={e => setCurrentPlan({...currentPlan, mealType: e.target.value as any})} className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none font-bold">
                                        <option value="breakfast">มื้อเช้า</option>
                                        <option value="lunch">มื้อกลางวัน</option>
                                        <option value="dinner">มื้อเย็น</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รายการวัตถุดิบหลัก (ปริมาณต่อคน)</label>
                                    <button type="button" onClick={handleAddIngRow} className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">+ เพิ่มวัตถุดิบ</button>
                                </div>
                                <div className="space-y-3">
                                    {safeParseArray(currentPlan.items).map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <select 
                                                value={item.ingredientId} 
                                                onChange={e => {
                                                    const next = [...safeParseArray(currentPlan.items)];
                                                    next[idx] = { ...item, ingredientId: Number(e.target.value) };
                                                    setCurrentPlan({ ...currentPlan, items: next });
                                                }} 
                                                className="flex-grow border-none focus:ring-0 text-sm font-bold text-navy"
                                            >
                                                {ingredients.map(ig => <option key={ig.id} value={ig.id}>{ig.name} ({ig.unit})</option>)}
                                            </select>
                                            <input 
                                                type="number" 
                                                step="0.1" 
                                                value={item.amount} 
                                                onChange={e => {
                                                    const next = [...safeParseArray(currentPlan.items)];
                                                    next[idx] = { ...item, amount: Number(e.target.value) };
                                                    setCurrentPlan({ ...currentPlan, items: next });
                                                }} 
                                                className="w-24 bg-gray-50 border-none rounded-xl px-4 py-2 text-center font-bold" 
                                            />
                                            <button type="button" onClick={() => { 
                                                const next = safeParseArray(currentPlan.items).filter((_, i) => i !== idx); 
                                                setCurrentPlan({...currentPlan, items: next}); 
                                            }} className="text-rose-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-emerald-600 text-white px-16 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 active:scale-95 transition-all">บันทึกเมนู</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: INGREDIENT FORM */}
            {isIngModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-navy text-white flex justify-between items-center">
                            <h3 className="text-2xl font-black">ข้อมูลวัตถุดิบ</h3>
                            <button onClick={() => setIsIngModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); onSaveIngredient({...currentIng, id: currentIng.id || Date.now()} as Ingredient); setIsIngModalOpen(false); }} className="p-10 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อวัตถุดิบ *</label>
                                <input type="text" required value={currentIng.name || ''} onChange={e => setCurrentIng({...currentIng, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หน่วยนับ</label>
                                    <input type="text" required value={currentIng.unit || ''} onChange={e => setCurrentIng({...currentIng, unit: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold" placeholder="กรัม, ผล, กล่อง..." />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ราคาต่อหน่วย</label>
                                    <input type="number" required value={currentIng.price || ''} onChange={e => setCurrentIng({...currentIng, price: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">แคลอรี่ต่อหน่วย</label>
                                    <input type="number" required value={currentIng.calories || ''} onChange={e => setCurrentIng({...currentIng, calories: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">โปรตีน (g)</label>
                                    <input type="number" step="0.1" value={currentIng.protein || ''} onChange={e => setCurrentIng({...currentIng, protein: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold" />
                                </div>
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full bg-navy text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-950 transition-all active:scale-95">บันทึกข้อมูลวัตถุดิบ</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionPage;
