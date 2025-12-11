
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
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" /></svg>
                        ภาพรวม
                    </button>
                    <button onClick={() => setActiveTab('personal')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'personal' ? 'bg-emerald-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        รายบุคคล
                    </button>
                    <button onClick={() => setActiveTab('planner')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'planner' ? 'bg-emerald-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
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
                                        <RadialBar background dataKey="value" cornerRadius={10} />
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
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="current" name="ที่ได้รับวันนี้" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                                        <Bar dataKey="target" name="เป้าหมาย (แนะนำ)" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={20} />
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

            {/* --- PERSONAL CALCULATION TAB --- */}
            {activeTab === 'personal' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <h2 className="text-xl font-bold text-navy mb-6">คำนวณโภชนาการรายบุคคล</h2>
                    
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Input Section */}
                        <div className="w-full lg:w-1/3 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">ค้นหานักเรียน</label>
                                <div className="relative">
                                    <select 
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                                        value={selectedStudentId}
                                        onChange={(e) => handleStudentSelect(e.target.value)}
                                    >
                                        <option value="">-- เลือกนักเรียน --</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.studentTitle}{s.studentName} ({s.studentNickname})</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedStudentId && (
                                    <div className="mt-4 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden border">
                                            <img src={getFirstImageSource(students.find(s=>s.id===selectedStudentId)?.studentProfileImage) || ''} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-navy">{students.find(s=>s.id===selectedStudentId)?.studentName}</p>
                                            <p className="text-xs text-gray-500">
                                                ข้อมูลจากระบบ: {students.find(s=>s.id===selectedStudentId)?.weight || '-'}kg / {students.find(s=>s.id===selectedStudentId)?.height || '-'}cm
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">น้ำหนัก (kg)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded-lg px-3 py-2" 
                                        value={personalData.weight}
                                        onChange={e => setPersonalData({...personalData, weight: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">ส่วนสูง (cm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded-lg px-3 py-2" 
                                        value={personalData.height}
                                        onChange={e => setPersonalData({...personalData, height: Number(e.target.value)})}
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm text-gray-600 mb-1">อายุ (ปี)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded-lg px-3 py-2" 
                                        value={personalData.age}
                                        onChange={e => setPersonalData({...personalData, age: Number(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">กิจกรรมทางกาย</label>
                                <select 
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    value={personalData.activity}
                                    onChange={e => setPersonalData({...personalData, activity: e.target.value as ActivityLevel})}
                                >
                                    <option value="sedentary">น้อยมาก (ไม่ออกกำลังกาย)</option>
                                    <option value="light">เบา (ออกกำลังกาย 1-3 วัน/สัปดาห์)</option>
                                    <option value="moderate">ปานกลาง (ออกกำลังกาย 3-5 วัน/สัปดาห์)</option>
                                    <option value="active">หนัก (ออกกำลังกาย 6-7 วัน/สัปดาห์)</option>
                                </select>
                            </div>
                        </div>

                        {/* Result Section */}
                        <div className="w-full lg:w-2/3">
                            {calculatedNeeds ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* BMI Card */}
                                        <div className={`p-6 rounded-xl border ${getBMIStatus(calculatedNeeds.bmi).bg} flex flex-col items-center justify-center`}>
                                            <p className="text-gray-500 text-sm font-bold uppercase">BMI (ดัชนีมวลกาย)</p>
                                            <p className={`text-4xl font-extrabold my-2 ${getBMIStatus(calculatedNeeds.bmi).color}`}>{calculatedNeeds.bmi}</p>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white ${getBMIStatus(calculatedNeeds.bmi).color}`}>
                                                {getBMIStatus(calculatedNeeds.bmi).label}
                                            </span>
                                        </div>

                                        {/* TDEE Card */}
                                        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 flex flex-col items-center justify-center">
                                            <p className="text-emerald-800 text-sm font-bold uppercase">พลังงานที่ต้องการต่อวัน (TDEE)</p>
                                            <p className="text-4xl font-extrabold my-2 text-emerald-600">{calculatedNeeds.tdee} <span className="text-base font-normal text-gray-500">kcal</span></p>
                                            <p className="text-xs text-gray-500">BMR (เผาผลาญพื้นฐาน): {calculatedNeeds.bmr} kcal</p>
                                        </div>
                                    </div>

                                    {/* Macro Breakdown */}
                                    <div className="bg-white border rounded-xl p-6">
                                        <h3 className="font-bold text-navy mb-4">สัดส่วนสารอาหารที่แนะนำ</h3>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="h-2 bg-blue-100 rounded-full mb-2 overflow-hidden"><div className="h-full bg-blue-500 w-full"></div></div>
                                                <p className="font-bold text-gray-800">{calculatedNeeds.protein} g</p>
                                                <p className="text-xs text-gray-500">โปรตีน (15%)</p>
                                            </div>
                                            <div>
                                                <div className="h-2 bg-yellow-100 rounded-full mb-2 overflow-hidden"><div className="h-full bg-yellow-500 w-full"></div></div>
                                                <p className="font-bold text-gray-800">{calculatedNeeds.fat} g</p>
                                                <p className="text-xs text-gray-500">ไขมัน (30%)</p>
                                            </div>
                                            <div>
                                                <div className="h-2 bg-green-100 rounded-full mb-2 overflow-hidden"><div className="h-full bg-green-500 w-full"></div></div>
                                                <p className="font-bold text-gray-800">{calculatedNeeds.carbs} g</p>
                                                <p className="text-xs text-gray-500">คาร์โบไฮเดรต (55%)</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t text-center">
                                            <p className="text-sm text-gray-600">ควรดื่มน้ำประมาณ <span className="font-bold text-blue-600">{calculatedNeeds.water} มล.</span> ต่อวัน</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">
                                    <svg className="w-16 h-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <p className="text-center">
                                        กรุณาเลือกนักเรียนและระบุน้ำหนัก/ส่วนสูง/อายุให้ครบถ้วน<br/>
                                        <span className="text-xs">(หากข้อมูลไม่ขึ้นอัตโนมัติ ให้กรอกเองได้เลย)</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- PLANNER TAB --- */}
            {activeTab === 'planner' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Menu List */}
                        <div className="w-full md:w-2/3 bg-white p-6 rounded-xl shadow">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-navy">รายการเมนูอาหาร</h3>
                                <button onClick={() => handleOpenMenuModal()} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-600 shadow-sm">+ เพิ่มเมนู</button>
                            </div>
                            
                            <div className="space-y-3">
                                {dailyPlans.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                                        ยังไม่ได้จัดเมนู<br/>กดปุ่ม "เพิ่มเมนู" เพื่อเริ่มวางแผน
                                    </div>
                                ) : (
                                    dailyPlans.map(plan => (
                                        <div key={plan.id} className="flex justify-between items-center p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">{plan.mealType}</span>
                                                    <h4 className="font-bold text-navy">{plan.menuName}</h4>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{plan.items.length} วัตถุดิบ</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleOpenMenuModal(plan)} className="text-amber-500 hover:bg-amber-50 p-2 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => handleDeletePlan(plan.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Shopping List */}
                        <div className="w-full md:w-1/3 bg-orange-50 p-6 rounded-xl shadow border border-orange-100 relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    รายการจ่ายตลาด
                                </h3>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 shadow-sm max-h-[500px] overflow-y-auto">
                                {shoppingList.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center">ไม่มีรายการ</p>
                                ) : (
                                    <ul className="space-y-2 text-sm">
                                        {shoppingList.map((item, i) => (
                                            <li key={i} className="flex justify-between border-b border-dashed pb-1">
                                                <span>{item?.name}</span>
                                                <div className="text-right">
                                                    <span className="font-bold text-orange-600 block">{item?.totalAmount} {item?.unit}</span>
                                                    <span className="text-[10px] text-gray-400">{item?.totalPrice?.toLocaleString()} บ.</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            
                            <div className="mt-4 relative">
                                <button 
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 shadow text-sm flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    พิมพ์รายการซื้อของ
                                </button>
                                
                                {isExportMenuOpen && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-10">
                                        <button onClick={() => handleExportShoppingList('print')} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            พิมพ์ (PDF)
                                        </button>
                                        <button onClick={() => handleExportShoppingList('doc')} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2 border-t border-gray-50">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            ดาวน์โหลด Word
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- INGREDIENTS TAB --- */}
            {activeTab === 'ingredients' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-navy">ฐานข้อมูลวัตถุดิบ</h3>
                        <button onClick={() => { setCurrentIng({}); setIsIngModalOpen(true); }} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-600 shadow-sm">+ เพิ่มวัตถุดิบ</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-emerald-50 text-emerald-800">
                                <tr>
                                    <th className="p-3">ชื่อวัตถุดิบ</th>
                                    <th className="p-3">หน่วย</th>
                                    <th className="p-3">Cal (kcal)</th>
                                    <th className="p-3">Protein (g)</th>
                                    <th className="p-3">Fat (g)</th>
                                    <th className="p-3">Carb (g)</th>
                                    <th className="p-3">ราคา/หน่วย</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {ingredients.map(ing => (
                                    <tr key={ing.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{ing.name}</td>
                                        <td className="p-3 text-gray-500">{ing.unit}</td>
                                        <td className="p-3">{ing.calories}</td>
                                        <td className="p-3">{ing.protein}</td>
                                        <td className="p-3">{ing.fat}</td>
                                        <td className="p-3">{ing.carbs}</td>
                                        <td className="p-3 font-bold text-orange-600">{ing.price} บ.</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => { setCurrentIng(ing); setIsIngModalOpen(true); }} className="text-amber-500 hover:text-amber-700 mx-1">แก้ไข</button>
                                            <button onClick={() => { if(window.confirm('ลบ?')) onDeleteIngredient([ing.id]); }} className="text-red-500 hover:text-red-700 mx-1">ลบ</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            
            {/* Menu Modal */}
            {isMenuModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-emerald-500 text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentPlan.id ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h3>
                            <button onClick={() => setIsMenuModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleSavePlan} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่</label>
                                    <input type="date" value={buddhistToISO(currentPlan.date)} onChange={e => setCurrentPlan({...currentPlan, date: isoToBuddhist(e.target.value)})} className="w-full border rounded px-3 py-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">มื้ออาหาร</label>
                                    <select value={currentPlan.mealType} onChange={e => setCurrentPlan({...currentPlan, mealType: e.target.value as any})} className="w-full border rounded px-3 py-2">
                                        <option value="breakfast">เช้า</option>
                                        <option value="lunch">กลางวัน</option>
                                        <option value="dinner">เย็น</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อเมนูอาหาร</label>
                                <input type="text" value={currentPlan.menuName} onChange={e => setCurrentPlan({...currentPlan, menuName: e.target.value})} className="w-full border rounded px-3 py-2" placeholder="เช่น ข้าวมันไก่" required />
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h4 className="text-sm font-bold text-gray-700 mb-2">ส่วนประกอบ (Ingredients)</h4>
                                {currentPlan.items?.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-end">
                                        <div className="flex-grow">
                                            <select 
                                                value={item.ingredientId} 
                                                onChange={e => handleUpdatePlanItem(idx, 'ingredientId', Number(e.target.value))}
                                                className="w-full border rounded px-2 py-1 text-sm"
                                            >
                                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <input 
                                                type="number" 
                                                min="0.1" step="0.1"
                                                value={item.amount} 
                                                onChange={e => handleUpdatePlanItem(idx, 'amount', Number(e.target.value))}
                                                className="w-full border rounded px-2 py-1 text-sm" 
                                                placeholder="จำนวน"
                                            />
                                        </div>
                                        <button type="button" onClick={() => handleRemovePlanItem(idx)} className="text-red-500 bg-white border p-1 rounded hover:bg-red-50">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddIngredientToPlan} className="text-xs font-bold text-emerald-600 hover:underline">+ เพิ่มวัตถุดิบ</button>
                            </div>

                            <div className="flex justify-end pt-4 border-t gap-3">
                                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-700 font-bold">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-600 shadow">บันทึกเมนู</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Ingredient Modal */}
            {isIngModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="p-5 border-b bg-gray-100 rounded-t-xl">
                            <h3 className="text-lg font-bold">{currentIng.id ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}</h3>
                        </div>
                        <form onSubmit={handleSaveIng} className="p-6 space-y-3">
                            <input type="text" value={currentIng.name || ''} onChange={e => setCurrentIng({...currentIng, name: e.target.value})} placeholder="ชื่อวัตถุดิบ" className="w-full border rounded px-3 py-2" required />
                            <div className="flex gap-2">
                                <input type="text" value={currentIng.unit || ''} onChange={e => setCurrentIng({...currentIng, unit: e.target.value})} placeholder="หน่วยนับ (เช่น กิโลกรัม, ฟอง)" className="w-full border rounded px-3 py-2" required />
                                <input type="number" step="0.1" value={currentIng.price || ''} onChange={e => setCurrentIng({...currentIng, price: Number(e.target.value)})} placeholder="ราคาต่อหน่วย (บาท)" className="w-full border rounded px-3 py-2" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" step="0.1" value={currentIng.calories || ''} onChange={e => setCurrentIng({...currentIng, calories: Number(e.target.value)})} placeholder="Calories (kcal)" className="border rounded px-3 py-2" />
                                <input type="number" step="0.1" value={currentIng.protein || ''} onChange={e => setCurrentIng({...currentIng, protein: Number(e.target.value)})} placeholder="Protein (g)" className="border rounded px-3 py-2" />
                                <input type="number" step="0.1" value={currentIng.fat || ''} onChange={e => setCurrentIng({...currentIng, fat: Number(e.target.value)})} placeholder="Fat (g)" className="border rounded px-3 py-2" />
                                <input type="number" step="0.1" value={currentIng.carbs || ''} onChange={e => setCurrentIng({...currentIng, carbs: Number(e.target.value)})} placeholder="Carbs (g)" className="border rounded px-3 py-2" />
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsIngModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">ยกเลิก</button>
                                <button type="submit" className="px-6 py-2 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-600">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionPage;
