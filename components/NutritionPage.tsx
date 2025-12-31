import React, { useState, useMemo, useEffect } from 'react';
import { Personnel, MealPlan, Ingredient, NutritionTargetGroup, Student, MealPlanItem } from '../types';
import { NUTRITION_STANDARDS } from '../constants';
// Fix: Added safeParseArray to imports
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, getFirstImageSource, safeParseArray } from '../utils';
// Fix: Added PieChart and Pie to Recharts imports
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
    students?: Student[];
}

const NutritionPage: React.FC<NutritionPageProps> = ({
    currentUser, mealPlans, ingredients, onSaveMealPlan, onDeleteMealPlan, 
    onSaveIngredient, onDeleteIngredient, isSaving, students = []
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'ingredients' | 'personal'>('dashboard');
    const [filterDate, setFilterDate] = useState(getCurrentThaiDate());
    const [filterGroup, setFilterGroup] = useState<NutritionTargetGroup>('primary');
    
    // Planner State
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<Partial<MealPlan>>({
        date: getCurrentThaiDate(),
        targetGroup: 'primary',
        menuName: '',
        mealType: 'lunch',
        items: []
    });
    
    // Ingredient Modal State
    const [isIngModalOpen, setIsIngModalOpen] = useState(false);
    const [currentIng, setCurrentIng] = useState<Partial<Ingredient>>({});

    // Personal State
    const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
    const [personalData, setPersonalData] = useState({ weight: 0, height: 0, age: 0, gender: 'male', activity: 'moderate' });

    // --- Computed Data ---
    const dailyPlans = useMemo(() => {
        return mealPlans.filter(p => p.date === filterDate && p.targetGroup === filterGroup);
    }, [mealPlans, filterDate, filterGroup]);

    const dailyNutrition = useMemo(() => {
        let cal = 0, pro = 0, fat = 0, carbs = 0;
        dailyPlans.forEach(plan => {
            // Fix: safeParseArray is now imported and available
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

    const targetStandard = NUTRITION_STANDARDS[filterGroup];

    // --- Handlers ---
    // Fix: Added handleOpenMenuModal to define it before use
    const handleOpenMenuModal = (plan?: MealPlan) => {
        if (plan) {
            setCurrentPlan({ ...plan });
        } else {
            setCurrentPlan({
                date: getCurrentThaiDate(),
                targetGroup: 'primary',
                menuName: '',
                mealType: 'lunch',
                items: []
            });
        }
        setIsMenuModalOpen(true);
    };

    // Fix: Added handleDeletePlan to define it before use
    const handleDeletePlan = (id: number) => {
        if (window.confirm('ยืนยันการลบเมนูอาหาร?')) {
            onDeleteMealPlan([id]);
        }
    };

    const handleSavePlan = (e: React.FormEvent) => {
        e.preventDefault();
        // Calculate totals before saving
        let cal = 0, pro = 0, fat = 0, carbs = 0;
        (currentPlan.items || []).forEach(item => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            if (ing) {
                cal += ing.calories * item.amount;
                pro += ing.protein * item.amount;
                fat += ing.fat * item.amount;
                carbs += ing.carbs * item.amount;
            }
        });

        const planToSave = {
            ...currentPlan,
            id: currentPlan.id || Date.now(),
            totalCalories: cal, totalProtein: pro, totalFat: fat, totalCarbs: carbs
        } as MealPlan;
        onSaveMealPlan(planToSave);
        setIsMenuModalOpen(false);
    };

    const handleAddIngRow = () => {
        setCurrentPlan(prev => ({
            ...prev,
            items: [...(prev.items || []), { ingredientId: ingredients[0]?.id || 0, amount: 1 }]
        }));
    };

    const updateItem = (idx: number, field: string, val: any) => {
        const next = [...(currentPlan.items || [])];
        next[idx] = { ...next[idx], [field]: val };
        setCurrentPlan({ ...currentPlan, items: next });
    };

    return (
        <div className="space-y-6 animate-fade-in font-sarabun pb-10">
            <div className="flex bg-white/50 p-1 rounded-2xl border border-gray-200 w-fit no-print shadow-sm">
                <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>แดชบอร์ด</button>
                <button onClick={() => setActiveTab('planner')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'planner' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>จัดเมนู</button>
                <button onClick={() => setActiveTab('ingredients')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'ingredients' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>วัตถุดิบ</button>
                <button onClick={() => setActiveTab('personal')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'personal' ? 'bg-primary-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>โภชนาการ นร.</button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                         <div className="flex gap-4">
                            <input type="date" value={buddhistToISO(filterDate)} onChange={e => setFilterDate(isoToBuddhist(e.target.value))} className="border rounded-xl px-4 py-2 text-sm font-bold text-navy" />
                            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value as any)} className="border rounded-xl px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50">
                                <option value="kindergarten">อนุบาล</option>
                                <option value="primary">ประถม</option>
                                <option value="secondary">มัธยม</option>
                            </select>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center">
                            <h3 className="text-lg font-black text-navy mb-8 uppercase tracking-widest text-gray-400">Calories Balance</h3>
                            <div className="h-64 w-full relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart 
                                        innerRadius="70%" outerRadius="100%" 
                                        data={[{ value: (dailyNutrition.cal / targetStandard.calories) * 100, fill: dailyNutrition.cal > targetStandard.calories ? '#EF4444' : '#10B981' }]} 
                                        startAngle={180} endAngle={0}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                        <RadialBar dataKey="value" cornerRadius={10} isAnimationActive={false} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                                    <span className="text-4xl font-black text-navy">{Math.round(dailyNutrition.cal)}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kcal / {targetStandard.calories}</span>
                                </div>
                            </div>
                         </div>
                         <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                             <h3 className="text-lg font-black text-navy mb-8">สารอาหารหลัก (Macro-nutrients)</h3>
                             <div className="h-64">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'โปรตีน', val: dailyNutrition.pro, target: targetStandard.protein, fill: '#3B82F6' },
                                        { name: 'ไขมัน', val: dailyNutrition.fat, target: targetStandard.fat, fill: '#F59E0B' },
                                        { name: 'คาร์บฯ', val: dailyNutrition.carbs, target: targetStandard.carbs, fill: '#10B981' }
                                    ]} layout="vertical" margin={{ left: 30, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fontStyle: 'bold'}} />
                                        <Tooltip />
                                        <Bar dataKey="val" name="ได้รับ" radius={[0, 8, 8, 0]} barSize={20} />
                                        <Bar dataKey="target" name="แนะนำ" fill="#E2E8F0" radius={[0, 8, 8, 0]} barSize={10} />
                                    </BarChart>
                                 </ResponsiveContainer>
                             </div>
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'planner' && (
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black text-navy">จัดตารางเมนูอาหาร</h3>
                        <button onClick={() => handleOpenMenuModal()} className="bg-navy text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-900/10 hover:bg-blue-900 active:scale-95 transition-all">เพิ่มเมนู</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mealPlans.filter(p => p.date === filterDate).map(p => (
                            <div key={p.id} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 space-y-4">
                                <div className="flex justify-between items-start">
                                    <span className="bg-navy text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{p.mealType}</span>
                                    <button onClick={() => handleDeletePlan(p.id)} className="text-rose-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                                <h4 className="font-black text-navy text-xl leading-tight">{p.menuName}</h4>
                                <div className="space-y-1">
                                    {/* Fix: safeParseArray is now imported and available */}
                                    {safeParseArray(p.items).map((item: any, i: number) => (
                                        <p key={i} className="text-xs text-gray-500 font-bold">• {ingredients.find(ig => ig.id === item.ingredientId)?.name} x {item.amount}</p>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                    <span>{p.targetGroup}</span>
                                    <span>{Math.round(p.totalCalories)} Kcal</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: MENU FORM */}
            {isMenuModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                        <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
                            <h3 className="text-2xl font-black">บันทึกเมนูอาหาร</h3>
                            <button onClick={() => setIsMenuModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSavePlan} className="p-10 overflow-y-auto space-y-8 bg-gray-50/50">
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รายการวัตถุดิบหลัก</label>
                                    <button type="button" onClick={handleAddIngRow} className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">+ เพิ่มวัตถุดิบ</button>
                                </div>
                                <div className="space-y-3">
                                    {(currentPlan.items || []).map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <select value={item.ingredientId} onChange={e => updateItem(idx, 'ingredientId', Number(e.target.value))} className="flex-grow border-none focus:ring-0 text-sm font-bold text-navy">
                                                {ingredients.map(ig => <option key={ig.id} value={ig.id}>{ig.name} ({ig.calories} cal/{ig.unit})</option>)}
                                            </select>
                                            <input type="number" step="0.1" value={item.amount} onChange={e => updateItem(idx, 'amount', Number(e.target.value))} className="w-24 bg-gray-50 border-none rounded-xl px-4 py-2 text-center font-bold" />
                                            <button type="button" onClick={() => { const next = [...currentPlan.items!]; next.splice(idx,1); setCurrentPlan({...currentPlan, items: next}); }} className="text-rose-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="bg-white border border-gray-200 text-gray-400 px-12 py-4 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="bg-emerald-600 text-white px-16 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 active:scale-95 transition-all">ยืนยันบันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionPage;