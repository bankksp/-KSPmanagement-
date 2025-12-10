
import React, { useState, useMemo } from 'react';
import { Student, Personnel, SDQRecord, SDQResultType } from '../types';
import { getCurrentThaiDate, getFirstImageSource } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface SDQPageProps {
    currentUser: Personnel;
    students: Student[];
    records: SDQRecord[];
    onSave: (record: SDQRecord) => void;
    onDelete: (ids: number[]) => void;
    academicYears: string[];
    isSaving: boolean;
    studentClasses: string[];
    studentClassrooms: string[];
}

// SDQ Questions (Thai Teacher Version)
const SDQ_QUESTIONS = [
    { id: 1, text: "ห่วงใยความรู้สึกคนอื่น", scale: "prosocial" },
    { id: 2, text: "อยู่ไม่นิ่ง ไม่สามารถนั่งนิ่งๆ ได้นาน", scale: "hyper" },
    { id: 3, text: "มักจะบ่นว่าปวดศีรษะ ปวดท้อง หรือไม่สบาย", scale: "emotional" },
    { id: 4, text: "เต็มใจแบ่งปันสิ่งของให้เพื่อน (ของกิน ของเล่น ปากกา เป็นต้น)", scale: "prosocial" },
    { id: 5, text: "มักจะอาละวาด หรือโมโหร้าย", scale: "conduct" },
    { id: 6, text: "ค่อนข้างแยกตัว ชอบเล่นคนเดียว", scale: "peer" },
    { id: 7, text: "เชื่อฟัง มักจะทำตามที่ผู้ใหญ่สั่ง", scale: "conduct" }, // Reverse logic handled in calculation if needed, but standard Thai form usually asks direct positive/negative. Let's assume standard wording where 0=Not, 1=Somewhat, 2=Certainly implies symptom severity usually. EXCEPT Prosocial and some Conduct reverse items.
    // NOTE: Standard scoring: 
    // Conduct: 5, 7(Rev), 12, 18, 22. 
    // Hyper: 2, 10, 15, 21, 25(Rev). - Wait, item 25 is attention span "Good attention"? Yes.
    // Peer: 6, 11(Rev), 14(Rev), 19, 23.
    // Prosocial: 1, 4, 9, 17, 20.
    // Emotional: 3, 8, 13, 16, 24.
    { id: 8, text: "ขี้กังวล หรือมีเรื่องกังวลใจอยู่เสมอ", scale: "emotional" },
    { id: 9, text: "เป็นที่พึ่งได้เวลาคนอื่นเสียใจ อารมณ์ไม่ดี หรือไม่สบายใจ", scale: "prosocial" },
    { id: 10, text: "อยู่ไม่สุข วุ่นวาย", scale: "hyper" },
    { id: 11, text: "มีเพื่อนสนิท", scale: "peer" }, // Rev
    { id: 12, text: "มักมีเรื่องทะเลาะวิวาท หรือรังแกเด็กอื่น", scale: "conduct" },
    { id: 13, text: "ดูไม่มีความสุข ท้อแท้", scale: "emotional" },
    { id: 14, text: "เป็นที่ชื่นชอบของเพื่อน", scale: "peer" }, // Rev
    { id: 15, text: "วอกแวกง่าย สมาธิสั้น", scale: "hyper" },
    { id: 16, text: "ขี้กลัว หรือขี้ขลาดเวลาเจอสถานการณ์ใหม่ๆ", scale: "emotional" },
    { id: 17, text: "เมตตาอารีกับเด็กที่เล็กกว่า", scale: "prosocial" },
    { id: 18, text: "มักโกหก หรือขี้โกง", scale: "conduct" },
    { id: 19, text: "ถูกเด็กอื่นรังแก หรือล้อเลียน", scale: "peer" },
    { id: 20, text: "ชอบอาสาช่วยเหลือผู้อื่น (พ่อแม่ ครู เด็กอื่น)", scale: "prosocial" },
    { id: 21, text: "คิดก่อนทำ", scale: "hyper" }, // Rev
    { id: 22, text: "ขโมยของ", scale: "conduct" },
    { id: 23, text: "เข้ากับผู้ใหญ่ได้ดีกว่าเด็กวัยเดียวกัน", scale: "peer" },
    { id: 24, text: "ขี้กลัว สิ่งต่างๆ ได้ง่าย", scale: "emotional" },
    { id: 25, text: "ทำงานได้จนเสร็จ มีสมาธิดี", scale: "hyper" } // Rev
];

// IDs of questions that are "Strengths" or need reverse scoring for "Difficulty" sum
// Normal scoring: Not True=0, Somewhat=1, Certainly=2
// Reverse scoring: Not True=2, Somewhat=1, Certainly=0
const REVERSE_ITEMS = [7, 11, 14, 21, 25];

const calculateScore = (scores: Record<number, number>) => {
    let emotional = 0, conduct = 0, hyper = 0, peer = 0, prosocial = 0;

    SDQ_QUESTIONS.forEach(q => {
        let val = scores[q.id] || 0;
        // Apply reverse logic if needed
        if (REVERSE_ITEMS.includes(q.id)) {
            val = val === 0 ? 2 : val === 2 ? 0 : 1;
        }

        switch(q.scale) {
            case 'emotional': emotional += val; break;
            case 'conduct': conduct += val; break;
            case 'hyper': hyper += val; break;
            case 'peer': peer += val; break;
            case 'prosocial': prosocial += val; break;
        }
    });

    const totalDifficulties = emotional + conduct + hyper + peer;

    // Interpretation (Thai Teacher Norms)
    const interpret = (score: number, type: string): SDQResultType => {
        if (type === 'total') {
            if (score <= 11) return 'normal';
            if (score <= 15) return 'risk';
            return 'problem';
        }
        // Specific Scales (simplified thresholds for demo - standard Thai norms vary slightly by age/gender but generalized here)
        // Emotional: 0-3 Normal, 4 Risk, 5-10 Problem
        if (type === 'emotional') return score <= 3 ? 'normal' : score === 4 ? 'risk' : 'problem';
        // Conduct: 0-2 Normal, 3 Risk, 4-10 Problem
        if (type === 'conduct') return score <= 2 ? 'normal' : score === 3 ? 'risk' : 'problem';
        // Hyper: 0-5 Normal, 6 Risk, 7-10 Problem
        if (type === 'hyper') return score <= 5 ? 'normal' : score === 6 ? 'risk' : 'problem';
        // Peer: 0-2 Normal, 3 Risk, 4-10 Problem
        if (type === 'peer') return score <= 2 ? 'normal' : score === 3 ? 'risk' : 'problem';
        // Prosocial: 6-10 Normal, 5 Risk, 0-4 Problem (Strength is inverted)
        if (type === 'prosocial') return score >= 6 ? 'normal' : score === 5 ? 'risk' : 'problem';
        
        return 'normal';
    };

    return {
        emotional, conduct, hyper, peer, prosocial, totalDifficulties,
        resTotal: interpret(totalDifficulties, 'total'),
        resEmotional: interpret(emotional, 'emotional'),
        resConduct: interpret(conduct, 'conduct'),
        resHyper: interpret(hyper, 'hyper'),
        resPeer: interpret(peer, 'peer'),
        resProsocial: interpret(prosocial, 'prosocial'),
    };
};

const COLORS = { normal: '#10B981', risk: '#F59E0B', problem: '#EF4444' };

const SDQPage: React.FC<SDQPageProps> = ({ 
    currentUser, students, records, onSave, onDelete, 
    academicYears, isSaving, studentClasses, studentClassrooms
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'assessment'>('stats');
    const [filterClass, setFilterClass] = useState('');
    const [filterRoom, setFilterRoom] = useState('');
    const [filterYear, setFilterYear] = useState((new Date().getFullYear() + 543).toString());
    const [filterTerm, setFilterTerm] = useState('1');
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [scores, setScores] = useState<Record<number, number>>({});

    // --- Computed Data ---
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const [cls, room] = s.studentClass.split('/');
            const matchClass = !filterClass || cls === filterClass;
            const matchRoom = !filterRoom || room === filterRoom;
            const matchSearch = s.studentName.includes(searchTerm) || s.studentNickname.includes(searchTerm);
            return matchClass && matchRoom && matchSearch;
        });
    }, [students, filterClass, filterRoom, searchTerm]);

    const recordMap = useMemo(() => {
        const map = new Map<number, SDQRecord>();
        records.forEach(r => {
            if (String(r.academicYear) === String(filterYear) && String(r.term) === String(filterTerm)) {
                map.set(Number(r.studentId), r);
            }
        });
        return map;
    }, [records, filterYear, filterTerm]);

    const stats = useMemo(() => {
        let total = 0, assessed = 0;
        let groupTotal = { normal: 0, risk: 0, problem: 0 };
        // Detail scales
        let emo = { normal: 0, risk: 0, problem: 0 };
        let con = { normal: 0, risk: 0, problem: 0 };
        let hyp = { normal: 0, risk: 0, problem: 0 };
        let pee = { normal: 0, risk: 0, problem: 0 };
        let pro = { normal: 0, risk: 0, problem: 0 };

        filteredStudents.forEach(s => {
            total++;
            const rec = recordMap.get(s.id);
            if (rec) {
                assessed++;
                groupTotal[rec.resultTotal]++;
                emo[rec.resultEmotional]++;
                con[rec.resultConduct]++;
                hyp[rec.resultHyper]++;
                pee[rec.resultPeer]++;
                pro[rec.resultProsocial]++;
            }
        });

        const pieData = [
            { name: 'ปกติ', value: groupTotal.normal, color: COLORS.normal },
            { name: 'เสี่ยง', value: groupTotal.risk, color: COLORS.risk },
            { name: 'มีปัญหา', value: groupTotal.problem, color: COLORS.problem }
        ].filter(d => d.value > 0);

        const barData = [
            { name: 'อารมณ์', normal: emo.normal, risk: emo.risk, problem: emo.problem },
            { name: 'ความประพฤติ', normal: con.normal, risk: con.risk, problem: con.problem },
            { name: 'ไม่อยู่นิ่ง', normal: hyp.normal, risk: hyp.risk, problem: hyp.problem },
            { name: 'เพื่อน', normal: pee.normal, risk: pee.risk, problem: pee.problem },
            { name: 'สังคม', normal: pro.normal, risk: pro.risk, problem: pro.problem },
        ];

        return { total, assessed, pending: total - assessed, pieData, barData };
    }, [filteredStudents, recordMap]);

    // --- Handlers ---
    const handleOpenAssessment = (student: Student) => {
        setCurrentStudent(student);
        const existing = recordMap.get(student.id);
        if (existing) {
            setScores(existing.scores || {});
        } else {
            // Default all to 0
            const initialScores: Record<number, number> = {};
            SDQ_QUESTIONS.forEach(q => initialScores[q.id] = 0);
            setScores(initialScores);
        }
        setIsModalOpen(true);
    };

    const handleScoreChange = (qId: number, val: number) => {
        setScores(prev => ({ ...prev, [qId]: val }));
    };

    const handleSave = () => {
        if (!currentStudent) return;
        const calc = calculateScore(scores);
        
        const record: SDQRecord = {
            id: recordMap.get(currentStudent.id)?.id || Date.now(),
            studentId: currentStudent.id,
            studentName: `${currentStudent.studentTitle}${currentStudent.studentName}`,
            academicYear: filterYear,
            term: filterTerm,
            evaluatorId: currentUser.id,
            evaluatorName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            date: getCurrentThaiDate(),
            scores: scores,
            
            scoreEmotional: calc.emotional,
            scoreConduct: calc.conduct,
            scoreHyper: calc.hyper,
            scorePeer: calc.peer,
            scoreProsocial: calc.prosocial,
            scoreTotalDifficulties: calc.totalDifficulties,
            
            resultEmotional: calc.resEmotional,
            resultConduct: calc.resConduct,
            resultHyper: calc.resHyper,
            resultPeer: calc.resPeer,
            resultProsocial: calc.resProsocial,
            resultTotal: calc.resTotal
        };
        onSave(record);
        setIsModalOpen(false);
    };

    const handleExportCSV = () => {
        const header = ['ชื่อ-สกุล', 'ชั้น', 'อารมณ์', 'ประพฤติ', 'ไม่อยู่นิ่ง', 'เพื่อน', 'สังคม', 'รวม(ปัญหา)', 'ผลประเมิน'];
        const rows = filteredStudents.map(s => {
            const r = recordMap.get(s.id);
            if (!r) return [`"${s.studentTitle}${s.studentName}"`, `"${s.studentClass}"`, '-', '-', '-', '-', '-', '-', 'ยังไม่ประเมิน'];
            return [
                `"${s.studentTitle}${s.studentName}"`,
                `"${s.studentClass}"`,
                r.scoreEmotional,
                r.scoreConduct,
                r.scoreHyper,
                r.scorePeer,
                r.scoreProsocial,
                r.scoreTotalDifficulties,
                `"${r.resultTotal === 'normal' ? 'ปกติ' : r.resultTotal === 'risk' ? 'เสี่ยง' : 'มีปัญหา'}"`
            ];
        });

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += header.join(",") + "\r\n";
        rows.forEach(row => csvContent += row.join(",") + "\r\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sdq_report_${filterYear}_${filterTerm}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Result Badge Component
    const ResultBadge = ({ type }: { type: SDQResultType | undefined }) => {
        if (!type) return <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded">รอประเมิน</span>;
        const color = type === 'normal' ? 'bg-green-100 text-green-700' : type === 'risk' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
        const label = type === 'normal' ? 'ปกติ' : type === 'risk' ? 'เสี่ยง' : 'มีปัญหา';
        return <span className={`${color} text-xs px-2 py-1 rounded font-bold`}>{label}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="bg-white p-3 rounded-xl shadow-sm flex flex-wrap gap-4 justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'stats' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        สถิติภาพรวม
                    </button>
                    <button onClick={() => setActiveTab('assessment')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'assessment' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        แบบประเมินรายบุคคล
                    </button>
                </div>
                <div className="flex gap-2 items-center">
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
                        {academicYears.map(y => <option key={y} value={y}>ปี {y}</option>)}
                    </select>
                    <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
                        <option value="1">เทอม 1</option>
                        <option value="2">เทอม 2</option>
                    </select>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-end">
                <div className="w-full sm:w-auto">
                    <label className="block text-xs font-bold text-gray-500 mb-1">ระดับชั้น</label>
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">ทั้งหมด</option>
                        {studentClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="w-full sm:w-auto">
                    <label className="block text-xs font-bold text-gray-500 mb-1">ห้อง</label>
                    <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">ทั้งหมด</option>
                        {studentClassrooms.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="flex-grow">
                    <label className="block text-xs font-bold text-gray-500 mb-1">ค้นหา</label>
                    <input type="text" placeholder="ชื่อนักเรียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
            </div>

            {/* --- DASHBOARD --- */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500 text-center">
                            <p className="text-gray-500">นักเรียนทั้งหมด</p>
                            <p className="text-4xl font-bold text-navy mt-2">{stats.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500 text-center">
                            <p className="text-gray-500">ประเมินแล้ว</p>
                            <p className="text-4xl font-bold text-green-600 mt-2">{stats.assessed}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-gray-300 text-center">
                            <p className="text-gray-500">ยังไม่ประเมิน</p>
                            <p className="text-4xl font-bold text-gray-400 mt-2">{stats.pending}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">ผลการประเมินรวม (Total Difficulties)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-lg font-bold text-navy mb-4">จำแนกรายด้าน</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                                        <Tooltip />
                                        <Bar dataKey="normal" name="ปกติ" stackId="a" fill={COLORS.normal} />
                                        <Bar dataKey="risk" name="เสี่ยง" stackId="a" fill={COLORS.risk} />
                                        <Bar dataKey="problem" name="มีปัญหา" stackId="a" fill={COLORS.problem} />
                                        <Legend />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ASSESSMENT LIST --- */}
            {activeTab === 'assessment' && (
                <div className="bg-white p-6 rounded-xl shadow animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-navy">รายชื่อนักเรียน</h2>
                        <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Export CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStudents.map(student => {
                            const record = recordMap.get(student.id);
                            const img = getFirstImageSource(student.studentProfileImage);
                            
                            return (
                                <div key={student.id} className={`p-4 rounded-xl border transition-all hover:shadow-md flex gap-4 ${record ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="w-14 h-14 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden border">
                                        {img && <img src={img} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-navy truncate">{student.studentTitle}{student.studentName}</h4>
                                            <ResultBadge type={record?.resultTotal} />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">{student.studentNickname} • {student.studentClass}</p>
                                        <button 
                                            onClick={() => handleOpenAssessment(student)}
                                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${record ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-primary-blue text-white hover:bg-blue-700 shadow-sm'}`}
                                        >
                                            {record ? 'ดูผล / แก้ไข' : 'เริ่มประเมิน'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- ASSESSMENT MODAL --- */}
            {isModalOpen && currentStudent && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold">แบบประเมินพฤติกรรมนักเรียน (SDQ)</h3>
                                <p className="text-sm opacity-90">{currentStudent.studentTitle}{currentStudent.studentName} ({currentStudent.studentClass})</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-grow bg-gray-50">
                            <div className="sticky top-0 bg-white border-b px-6 py-2 grid grid-cols-12 text-xs font-bold text-gray-500 text-center z-10 shadow-sm">
                                <div className="col-span-6 text-left pl-2">พฤติกรรม</div>
                                <div className="col-span-2">ไม่จริง (0)</div>
                                <div className="col-span-2">จริงบ้าง (1)</div>
                                <div className="col-span-2">จริงแน่นอน (2)</div>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {SDQ_QUESTIONS.map((q, idx) => (
                                    <div key={q.id} className={`grid grid-cols-12 items-center px-6 py-3 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <div className="col-span-6 text-sm font-medium text-gray-800 pr-2">
                                            {q.id}. {q.text}
                                        </div>
                                        {[0, 1, 2].map(val => (
                                            <div key={val} className="col-span-2 flex justify-center">
                                                <label className="cursor-pointer p-2">
                                                    <input 
                                                        type="radio" 
                                                        name={`q_${q.id}`} 
                                                        checked={scores[q.id] === val} 
                                                        onChange={() => handleScoreChange(q.id, val)}
                                                        className="w-5 h-5 text-primary-blue focus:ring-primary-blue"
                                                    />
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Real-time Calculation Footer */}
                        <div className="p-4 border-t bg-white">
                            <div className="flex flex-wrap gap-4 justify-between items-center mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                {(() => {
                                    const res = calculateScore(scores);
                                    return (
                                        <>
                                            <div className="flex gap-4 text-xs md:text-sm">
                                                <div>อารมณ์: <b>{res.emotional}</b> <ResultBadge type={res.resEmotional}/></div>
                                                <div>ประพฤติ: <b>{res.conduct}</b> <ResultBadge type={res.resConduct}/></div>
                                                <div>ไม่อยู่นิ่ง: <b>{res.hyper}</b> <ResultBadge type={res.resHyper}/></div>
                                                <div>เพื่อน: <b>{res.peer}</b> <ResultBadge type={res.resPeer}/></div>
                                                <div>สังคม: <b>{res.prosocial}</b> <ResultBadge type={res.resProsocial}/></div>
                                            </div>
                                            <div className="text-sm font-bold border-l pl-4 border-blue-200">
                                                รวม (มีปัญหา): <span className="text-lg text-primary-blue">{res.totalDifficulties}</span> <ResultBadge type={res.resTotal}/>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold">ยกเลิก</button>
                                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 font-bold shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกผลการประเมิน'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SDQPage;
