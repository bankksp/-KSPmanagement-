
import React, { useState, useMemo, useEffect } from 'react';
import { Personnel, MealPlan, Ingredient, NutritionTargetGroup, Student } from '../types';
import { NUTRITION_STANDARDS } from '../constants';
import { getCurrentThaiDate, buddhistToISO, isoToBuddhist, getFirstImageSource } from '../utils';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    RadialBarChart, RadialBar, PolarAngleAxis 
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
    // Props for Personal Calc
    students?: Student[]; // Optional if not provided by parent yet, but needed for new tab
}

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

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

    // Personal Calculation State
    const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
    const [personalData, setPersonalData] = useState({
        weight: 0,
        height: 0,
        age: 0,
        gender: 'male', // default
        activity: 'moderate' as ActivityLevel
    });
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // --- Computed Data ---

    const dailyPlans = useMemo(() => {
        return mealPlans.filter(p => p.date === filterDate && p.targetGroup === filterGroup);
    }, [mealPlans, filterDate, filterGroup]);

    const dailyNutrition = useMemo(() => {
        let cal = 0, pro = 0, fat = 0, carbs = 0;
        dailyPlans.forEach(plan => {
            // Re-calculate based on current ingredients in case prices/values changed
            plan.items.forEach(item => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                if (ing) {
                    cal += ing.calories * item.amount;
                    pro += ing.protein * item.amount;
                    fat += ing.fat * item.amount;
                    carbs += ing.carbs * item.amount;
                }
            });
        });
        return { cal, pro, fat, carbs };
    }, [dailyPlans, ingredients]);

    const targetStandard = NUTRITION_STANDARDS[filterGroup];

    // --- Chart Data ---
    const gaugeData = [
        { name: 'Calories', value: dailyNutrition.cal, fill: '#10B981' }
    ];
    
    const macroData = [
        { name: 'โปรตีน (g)', current: dailyNutrition.pro, target: targetStandard.protein },
        { name: 'ไขมัน (g)', current: dailyNutrition.fat, target: targetStandard.fat },
        { name: 'คาร์บฯ (g)', current: dailyNutrition.carbs, target: targetStandard.carbs },
    ];

    // --- Personal Calculation Logic ---
    const calculateAge = (dobString: string): number => {
        if (!dobString) return 0;
        const parts = dobString.split('/');
        if (parts.length !== 3) return 0;
        const [day, month, year] = parts.map(Number);
        const gregorianYear = year > 2400 ? year - 543 : year;
        const birthDate = new Date(gregorianYear, month - 1, day);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const handleStudentSelect = (id: string) => {
        const studentId = Number(id);
        setSelectedStudentId(studentId);
        const student = students.find(s => s.id === studentId);
        if (student) {
            const age = calculateAge(student.studentDob);
            const isMale = ['เด็กชาย', 'นาย'].includes(student.studentTitle);
            setPersonalData({
                weight: student.weight || 0,
                height: student.height || 0,
                age: age || 0, // Ensure no NaN
                gender: isMale ? 'male' : 'female',
                activity: 'moderate' // default
            });
        }
    };

    const calculatedNeeds = useMemo(() => {
        const { weight, height, age, gender, activity } = personalData;
        // Require valid numbers to calculate
        if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) return null;

        // Harris-Benedict Equation
        let bmr = 0;
        if (gender === 'male') {
            bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
            bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }

        const multipliers: Record<ActivityLevel, number> = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725
        };

        const tdee = bmr * multipliers[activity];
        
        // BMI
        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);

        return {
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            bmi: parseFloat(bmi.toFixed(1)),
            protein: Math.round((tdee * 0.15) / 4), // 15% from protein
            fat: Math.round((tdee * 0.30) / 9),     // 30% from fat
            carbs: Math.round((tdee * 0.55) / 4),   // 55% from carbs
            water: Math.round(weight * 33) // approx 33ml per kg
        };
    }, [personalData]);

    const getBMIStatus = (bmi: number) => {
        if (bmi < 18.5) return { label: 'น้ำหนักน้อย', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        if (bmi < 23) return { label: 'สมส่วน (ปกติ)', color: 'text-green-600', bg: 'bg-green-100' };
        if (bmi < 25) return { label: 'ท้วม', color: 'text-orange-600', bg: 'bg-orange-100' };
        if (bmi < 30) return { label: 'อ้วน', color: 'text-red-600', bg: 'bg-red-100' };
        return { label: 'อ้วนมาก', color: 'text-red-800', bg: 'bg-red-200' };
    };

    // --- Handlers ---

    // Meal Plan Handlers
    const handleOpenMenuModal = (plan?: MealPlan) => {
        if (plan) {
            setCurrentPlan({ ...plan });
        } else {
            setCurrentPlan({
                date: filterDate, // Default to currently viewed date
                targetGroup: filterGroup,
                menuName: '',
                mealType: 'lunch',
                items: []
            });
        }
        setIsMenuModalOpen(true);
    };

    const handleAddIngredientToPlan = () => {
        setCurrentPlan(prev => ({
            ...prev,
            items: [...(prev.items || []), { ingredientId: ingredients[0]?.id || 0, amount: 1 }]
        }));
    };

    const handleUpdatePlanItem = (index: number, field: 'ingredientId' | 'amount', value: number) => {
        const newItems = [...(currentPlan.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setCurrentPlan(prev => ({ ...prev, items: newItems }));
    };

    const handleRemovePlanItem = (index: number) => {
        const newItems = [...(currentPlan.items || [])];
        newItems.splice(index, 1);
        setCurrentPlan(prev => ({ ...prev, items: newItems }));
    };

    const handleSavePlan = (e: React.FormEvent) => {
        e.preventDefault();
        const planToSave = {
            ...currentPlan,
            id: currentPlan.id || Date.now(),
            totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 // Will be calc on view
        } as MealPlan;
        onSaveMealPlan(planToSave);
        setIsMenuModalOpen(false);
    };

    const handleDeletePlan = (id: number) => {
        if(window.confirm('ยืนยันลบเมนูนี้?')) onDeleteMealPlan([id]);
    };

    // Ingredient Handlers
    const handleSaveIng = (e: React.FormEvent) => {
        e.preventDefault();
        const ingToSave = {
            ...currentIng,
            id: currentIng.id || Date.now(),
            calories: Number(currentIng.calories),
            protein: Number(currentIng.protein),
            fat: Number(currentIng.fat),
            carbs: Number(currentIng.carbs),
            price: Number(currentIng.price) || 0
        } as Ingredient;
        onSaveIngredient(ingToSave);
        setIsIngModalOpen(false);
    };

    // Shopping List Generation
    const shoppingList = useMemo(() => {
        const list: Record<number, number> = {};
        dailyPlans.forEach(p => {
            p.items.forEach(i => {
                list[i.ingredientId] = (list[i.ingredientId] || 0) + i.amount;
            });
        });
        return Object.entries(list).map(([id, amount]) => {
            const ing = ingredients.find(i => i.id === Number(id));
            if (!ing) return null;
            return { 
                ...ing, 
                totalAmount: amount,
                totalPrice: amount * (ing.price || 0)
            };
        }).filter(Boolean);
    }, [dailyPlans, ingredients]);

    const handleExportShoppingList = (type: 'doc' | 'print') => {
        setIsExportMenuOpen(false);
        const grandTotal = shoppingList.reduce((sum, item) => sum + (item?.totalPrice || 0), 0);
        
        // Simple table format as requested (not purchase order form)
        const content = `
            <div style="font-family: 'Sarabun', sans-serif; padding: 20px;">
                <h2 style="text-align: center; margin-bottom: 10px;">รายการวัตถุดิบ (Shopping List)</h2>
                <p style="text-align: center; margin-top: 0; font-size: 14px;">วันที่ ${filterDate}</p>
                <br/>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 50px;">ลำดับ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: left;">รายการ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right;">จำนวน</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center;">หน่วย</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right;">ราคา/หน่วย</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right;">รวมเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shoppingList.map((item, index) => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
                                <td style="border: 1px solid #000; padding: 8px;">${item?.name}</td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${item?.totalAmount.toLocaleString()}</td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item?.unit}</td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item?.price || 0).toLocaleString()}</td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item?.totalPrice || 0).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">รวมเป็นเงินทั้งสิ้น</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${grandTotal.toLocaleString()} บาท</td>
                        </tr>
                    </tfoot>
                </table>
                <br/><br/>
                <div style="text-align: right; margin-top: 20px; font-size: 14px;">
                    <p>ผู้จัดทำ: ${currentUser.personnelName}</p>
                </div>
            </div>
        `;

        if (type === 'print') {
            const win = window.open('', '_blank', 'width=800,height=600');
            if (win) {
                win.document.write(`
                    <html>
                        <head>
                            <title>Shopping List</title>
                            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                            <style>body { font-family: 'Sarabun', sans-serif; }</style>
                        </head>
                        <body onload="window.print()">${content}</body>
                    </html>
                `);
                win.document.close();
            }
        } else {
            const html = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>Shopping List</title></head>
                <body>${content}</body></html>
            `;
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `shopping_list_${filterDate.replace(/\//g, '-')}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-emerald-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        ภาพรวม
                    </button>
                    <button onClick={() => setActiveTab('personal')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'personal' ? 'bg-emerald-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        รายบุคคล
                    </button>
                    <button onClick={() => setActiveTab('planner')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'planner' ? 'bg-emerald-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        จัดเมนูอาหาร
                    </button>
                    <button onClick={() => setActiveTab('ingredients')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'ingredients' ? 'bg-emerald-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        ฐานข้อมูลวัตถุดิบ
                    </button>
                </div>
                
                {/* Global Filters */}
                {activeTab !== 'personal' && (
                    <div className="flex gap-2 items-center">
                        <input 
                            type="date" 
                            value={buddhistToISO(filterDate)} 
                            onChange={(e) => setFilterDate(isoToBuddhist(e.target.value))}
                            className="border rounded-lg px-2 py-1.5 text-sm"
                        />
                        <select 
                            value={filterGroup} 
                            onChange={(e) => setFilterGroup(e.target.value as NutritionTargetGroup)}
                            className="border rounded-lg px-2 py-1.5 text-sm font-bold text-emerald-700 bg-emerald-50"
                        >
                            <option value="kindergarten">อนุบาล (3-5 ปี)</option>
                            <option value="primary">ประถม (6-12 ปี)</option>
                            <option value="secondary">มัธยม (13-18 ปี)</option>
                        </select>
                    </div>
                )}
            </div>

            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Goal Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Calories Gauge */}
                        <div className="bg-white p-6 rounded-xl shadow border border-emerald-100 flex flex-col items-center justify-center">
                            <h3 className="text-lg font-bold text-navy mb-2">พลังงานรวม (Kcal)</h3>
                            <div className="h-40 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart 
                                        innerRadius="70%" 
                                        outerRadius="100%" 
                                        data={[{ value: (dailyNutrition.cal / targetStandard.calories) * 100, fill: dailyNutrition.cal > targetStandard.calories ? '#EF4444' : '#10B981' }]} 
                                        startAngle={180} 
                                        endAngle={0}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                        <RadialBar background dataKey="value" cornerRadius={10} isAnimationActive={false} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                                    <span className="text-3xl font-bold text-navy">{Math.round(dailyNutrition.cal)}</span>
                                    <span className="text-xs text-gray-500">เป้าหมาย: {targetStandard.calories}</span>
                                </div>
                            </div>
                        </div>

                        {/* Macros Chart */}
                        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow border border-emerald-100">
                            <h3 className="text-lg font-bold text-navy mb-4">สารอาหารหลัก (Macronutrients)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={macroData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB"/>
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="current" name="ที่ได้รับวันนี้" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
                                        <Bar dataKey="target" name="เป้าหมาย (แนะนำ)" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Menu Summary */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <h3 className="text-lg font-bold text-navy mb-4">เมนูอาหารวันนี้ ({filterDate})</h3>
                        {dailyPlans.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">ยังไม่มีการจัดเมนูสำหรับวันนี้</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dailyPlans.map(plan => (
                                    <div key={plan.id} className="border border-emerald-100 bg-emerald-50/30 p-4 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{plan.mealType}</span>
                                        </div>
                                        <h4 className="font-bold text-lg text-navy">{plan.menuName}</h4>
                                        <ul className="mt-2 text-sm text-gray-600 space-y-1">
                                            {plan.items.slice(0, 3).map((item, i) => {
                                                const ing = ingredients.find(ig => ig.id === item.ingredientId);
                                                return ing ? <li key={i}>• {ing.name} ({item.amount} {ing.unit})</li> : null;
                                            })}
                                            {plan.items.length > 3 && <li className="text-xs text-gray-400">+ อีก {plan.items.length - 3} รายการ</li>}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* ... Rest of the component ... */}
        </div>
    );
};

// Added missing default export
export default NutritionPage;
