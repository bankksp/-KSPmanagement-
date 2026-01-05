
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, HomeVisit, Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc, getCurrentThaiDate, buddhistToISO, isoToBuddhist } from '../utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StudentHomeVisitPageProps {
    currentUser: Personnel;
    students: Student[];
    visits: HomeVisit[];
    onSave: (visit: HomeVisit) => void;
    studentClasses: string[];
    studentClassrooms: string[];
    academicYears: string[];
    isSaving: boolean;
}

const StudentHomeVisitPage: React.FC<StudentHomeVisitPageProps> = ({
    currentUser, students, visits, onSave, 
    studentClasses, studentClassrooms, academicYears, isSaving
}) => {
    // State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
    const [filterClass, setFilterClass] = useState('');
    const [filterRoom, setFilterRoom] = useState('');
    const [filterYear, setFilterYear] = useState((new Date().getFullYear() + 543).toString());
    const [filterTerm, setFilterTerm] = useState('1');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [visitForm, setVisitForm] = useState<Partial<HomeVisit>>({
        date: getCurrentThaiDate(),
        notes: '',
        image: [],
        locationName: '',
        latitude: undefined,
        longitude: undefined
    });
    const [isLocating, setIsLocating] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Map Reference
    const mapRef = useRef<any>(null);
    const miniMapRef = useRef<any>(null);

    // --- Data Processing ---
    
    // Get latest visit for each student in current year/term
    const visitMap = useMemo(() => {
        const map = new Map<number, HomeVisit>();
        visits.forEach(v => {
            // Use String comparison to handle potential type mismatches from JSON
            if (String(v.academicYear) === String(filterYear) && String(v.term) === String(filterTerm)) {
                map.set(Number(v.studentId), v);
            }
        });
        return map;
    }, [visits, filterYear, filterTerm]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const [cls, room] = s.studentClass.split('/');
            const matchClass = !filterClass || cls === filterClass;
            const matchRoom = !filterRoom || room === filterRoom;
            const matchSearch = (s.studentName.includes(searchTerm) || 
                                 s.studentNickname.includes(searchTerm));
            return matchClass && matchRoom && matchSearch;
        });
    }, [students, filterClass, filterRoom, searchTerm]);

    const stats = useMemo(() => {
        const total = filteredStudents.length;
        let visited = 0;
        const visitedList: { student: Student, visit: HomeVisit }[] = [];

        filteredStudents.forEach(s => {
            if (visitMap.has(s.id)) {
                visited++;
                visitedList.push({ student: s, visit: visitMap.get(s.id)! });
            }
        });
        const pending = total - visited;
        const percentage = total > 0 ? Math.round((visited / total) * 100) : 0;

        const pieData = [
            { name: 'เยี่ยมแล้ว', value: visited, color: '#10B981' },
            { name: 'ยังไม่เยี่ยม', value: pending, color: '#E5E7EB' }
        ];

        return { total, visited, pending, percentage, pieData, visitedList };
    }, [filteredStudents, visitMap]);

    // --- Map Effect (Dashboard) ---
    useEffect(() => {
        if (activeTab === 'dashboard' && typeof window !== 'undefined') {
            const L = (window as any).L;
            if (!L) return; 

            const timer = setTimeout(() => {
                const mapContainer = document.getElementById('visit-map');
                if (mapContainer) {
                    if (mapRef.current) {
                        mapRef.current.remove();
                        mapRef.current = null;
                    }

                    const map = L.map('visit-map').setView([16.4322, 103.5061], 9);
                    
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);

                    const validPoints: [number, number][] = [];

                    stats.visitedList.forEach(item => {
                        if (item.visit.latitude && item.visit.longitude) {
                            const lat = item.visit.latitude;
                            const lng = item.visit.longitude;
                            
                            const imgUrl = getFirstImageSource(item.student.studentProfileImage);
                            const popupContent = `
                                <div class="text-center">
                                    <div class="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-2 overflow-hidden">
                                        ${imgUrl ? `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;" />` : ''}
                                    </div>
                                    <strong class="text-sm text-navy">${item.student.studentTitle}${item.student.studentName}</strong><br/>
                                    <span class="text-xs text-gray-500">${item.student.studentClass}</span>
                                </div>
                            `;

                            L.marker([lat, lng])
                                .addTo(map)
                                .bindPopup(popupContent);
                            
                            validPoints.push([lat, lng]);
                        }
                    });

                    if (validPoints.length > 0) {
                        try {
                            const bounds = L.latLngBounds(validPoints);
                            map.fitBounds(bounds, { padding: [50, 50] });
                        } catch (e) {
                            console.warn("fitBounds failed in home visit", e);
                        }
                    }

                    mapRef.current = map;
                }
            }, 100);

            return () => {
                clearTimeout(timer);
                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }
            };
        }
    }, [activeTab, stats.visitedList]);

    // --- Mini Map Effect (Modal) ---
    useEffect(() => {
        if (isModalOpen && visitForm.latitude && visitForm.longitude) {
             const L = (window as any).L;
             if (!L) return;

             const timer = setTimeout(() => {
                const container = document.getElementById('mini-map');
                if (container) {
                    if (miniMapRef.current) {
                        miniMapRef.current.remove();
                        miniMapRef.current = null;
                    }
                    const map = L.map('mini-map', { zoomControl: false, attributionControl: false }).setView([visitForm.latitude, visitForm.longitude], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    L.marker([visitForm.latitude, visitForm.longitude]).addTo(map);
                    miniMapRef.current = map;
                }
             }, 100);
             return () => {
                 clearTimeout(timer);
                 if(miniMapRef.current) {
                     miniMapRef.current.remove();
                     miniMapRef.current = null;
                 }
             };
        }
    }, [isModalOpen, visitForm.latitude, visitForm.longitude]);


    // --- Handlers ---

    const handleOpenVisit = (student: Student) => {
        setCurrentStudent(student);
        setCurrentSlideIndex(0);
        const existingVisit = visitMap.get(student.id);
        if (existingVisit) {
            setVisitForm({
                ...existingVisit,
                image: Array.isArray(existingVisit.image) ? existingVisit.image : (existingVisit.image ? [existingVisit.image] : [])
            });
        } else {
            setVisitForm({
                date: getCurrentThaiDate(),
                notes: '',
                image: [],
                locationName: student.studentAddress || '',
                latitude: undefined,
                longitude: undefined
            });
        }
        setIsModalOpen(true);
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setVisitForm(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setIsLocating(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาเปิด GPS หรืออนุญาตการเข้าถึงตำแหน่ง');
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setVisitForm(prev => ({
                ...prev,
                image: [...(prev.image || []), ...newFiles]
            }));
        }
    };

    const handleRemoveImage = (index: number) => {
        setVisitForm(prev => ({
            ...prev,
            image: (prev.image || []).filter((_, i) => i !== index)
        }));
        if (currentSlideIndex >= index && currentSlideIndex > 0) {
            setCurrentSlideIndex(currentSlideIndex - 1);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentStudent) return;

        const visitToSave: HomeVisit = {
            id: visitForm.id || Date.now(),
            studentId: Number(currentStudent.id),
            visitorId: Number(currentUser.id),
            visitorName: `${currentUser.personnelTitle}${currentUser.personnelName}`,
            academicYear: filterYear,
            term: filterTerm,
            status: 'visited',
            date: visitForm.date || getCurrentThaiDate(),
            notes: visitForm.notes || '',
            locationName: visitForm.locationName || '',
            image: visitForm.image,
            latitude: visitForm.latitude,
            longitude: visitForm.longitude
        };

        onSave(visitToSave);
        setIsModalOpen(false);
    };

    const getPreviewSrc = (item: File | string) => {
        if (item instanceof File) {
            return URL.createObjectURL(item);
        }
        return getDirectDriveImageSrc(item);
    };

    const images = visitForm.image || [];

    return (
        <div className="space-y-6">
            {/* Header / Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2 items-center">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    ภาพรวม
                </button>
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'list' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    บันทึกการเยี่ยมบ้าน
                </button>
                
                <div className="ml-auto flex gap-2 items-center overflow-x-auto">
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                        {academicYears.map(y => <option key={y} value={y}>ปี {y}</option>)}
                    </select>
                    <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                        <option value="1">เทอม 1</option>
                        <option value="2">เทอม 2</option>
                    </select>
                </div>
            </div>

            {/* Filter Bar (Global) */}
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
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Stats Cards */}
                        <div className="bg-white p-6 rounded-xl shadow flex flex-col justify-center items-center border-l-4 border-blue-500">
                            <p className="text-gray-500">นักเรียนทั้งหมด</p>
                            <p className="text-4xl font-bold text-navy mt-2">{stats.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow flex flex-col justify-center items-center border-l-4 border-green-500">
                            <p className="text-gray-500">เยี่ยมแล้ว</p>
                            <p className="text-4xl font-bold text-green-600 mt-2">{stats.visited}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow flex flex-col justify-center items-center border-l-4 border-gray-300">
                            <p className="text-gray-500">คงเหลือ</p>
                            <p className="text-4xl font-bold text-gray-400 mt-2">{stats.pending}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Map Section */}
                        <div className="w-full">
                            <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                แผนที่การเยี่ยมบ้าน (GPS)
                            </h3>
                            <div id="visit-map" className="w-full h-80 bg-gray-100 rounded-xl border border-gray-300 shadow-inner z-0 relative"></div>
                            <p className="text-xs text-gray-500 mt-2 text-right">* แสดงเฉพาะนักเรียนที่มีการบันทึกพิกัด GPS</p>
                        </div>

                        {/* Progress & Chart */}
                        <div className="flex flex-col gap-6">
                            <div>
                                <h3 className="text-lg font-bold text-navy mb-4">ความคืบหน้า</h3>
                                <div className="w-full bg-gray-200 rounded-full h-6 mb-2 overflow-hidden">
                                    <div 
                                        className="bg-green-500 h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-center text-xs text-white font-bold shadow-inner" 
                                        style={{ width: `${stats.percentage}%` }}
                                    >
                                        {stats.percentage > 5 && `${stats.percentage}%`}
                                    </div>
                                </div>
                                <p className="text-gray-500 text-sm">ปีการศึกษา {filterYear} ภาคเรียนที่ {filterTerm}</p>
                            </div>
                            
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LIST VIEW --- */}
            {activeTab === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                    {filteredStudents.map(student => {
                        const visit = visitMap.get(student.id);
                        const profileImg = getFirstImageSource(student.studentProfileImage);
                        const visitImgCount = visit && Array.isArray(visit.image) ? visit.image.length : (visit?.image ? 1 : 0);
                        
                        return (
                            <div key={student.id} className={`bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow ${visit ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden border border-gray-300">
                                        {profileImg ? (
                                            <img src={profileImg} className="w-full h-full object-cover" alt="student" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-navy truncate">{student.studentTitle}{student.studentName}</h4>
                                            {visit ? (
                                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">เยี่ยมแล้ว</span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">รอเยี่ยม</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">{student.studentNickname} • {student.studentClass}</p>
                                        {visit && (
                                            <div className="text-xs text-green-700 bg-green-100/50 p-1 rounded mb-2">
                                                <div><span className="font-semibold">วันที่:</span> {visit.date}</div>
                                                {visitImgCount > 0 && <div className="mt-0.5 text-[10px] text-green-600 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/></svg> มีรูปภาพ {visitImgCount} รูป</div>}
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => handleOpenVisit(student)}
                                            className={`w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                visit 
                                                ? 'bg-white border border-green-500 text-green-600 hover:bg-green-50' 
                                                : 'bg-primary-blue text-white hover:bg-blue-700 shadow-sm'
                                            }`}
                                        >
                                            {visit ? 'ดู/แก้ไขข้อมูล' : 'บันทึกการเยี่ยม'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredStudents.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                            ไม่พบรายชื่อนักเรียน
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && currentStudent && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="p-5 border-b bg-primary-blue text-white rounded-t-xl flex justify-between items-center">
                            <h3 className="text-xl font-bold">บันทึกการเยี่ยมบ้าน</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border mb-4 flex gap-3 items-center">
                                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                    {getFirstImageSource(currentStudent.studentProfileImage) && <img src={getFirstImageSource(currentStudent.studentProfileImage)!} className="w-full h-full object-cover" />}
                                </div>
                                <div>
                                    <p className="font-bold text-navy">{currentStudent.studentTitle}{currentStudent.studentName}</p>
                                    <p className="text-xs text-gray-500">{currentStudent.studentClass} • บ้านเลขที่: {currentStudent.studentAddress}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่เยี่ยมบ้าน</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={buddhistToISO(visitForm.date)} 
                                        onChange={e => setVisitForm({...visitForm, date: isoToBuddhist(e.target.value)})}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">พิกัด GPS (Lat, Long)</label>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={handleGetLocation} 
                                            disabled={isLocating}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-bold flex-grow flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {isLocating ? (
                                                <span className="animate-pulse">กำลังระบุ...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    จับพิกัด GPS
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {visitForm.latitude && (
                                        <div className="text-[10px] text-gray-500 mt-1 text-center">
                                            {visitForm.latitude.toFixed(6)}, {visitForm.longitude?.toFixed(6)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">สถานที่/รายละเอียดเพิ่มเติม</label>
                                <input 
                                    type="text" 
                                    value={visitForm.locationName} 
                                    onChange={e => setVisitForm({...visitForm, locationName: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                                    placeholder="จุดสังเกต หรือ รายละเอียดที่อยู่"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">บันทึกการเยี่ยม/สภาพความเป็นอยู่</label>
                                <textarea 
                                    rows={3}
                                    value={visitForm.notes} 
                                    onChange={e => setVisitForm({...visitForm, notes: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue"
                                    placeholder="บันทึกสิ่งที่พบเห็น..."
                                ></textarea>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-bold text-gray-700">อัลบั้มรูปภาพการเยี่ยมบ้าน</label>
                                    <label className="cursor-pointer bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        เพิ่มรูปภาพ
                                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                </div>

                                {images.length > 0 ? (
                                    <div className="space-y-3">
                                        {/* Slideshow / Main Preview */}
                                        <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden border shadow-inner flex items-center justify-center group">
                                            <img src={getPreviewSrc(images[currentSlideIndex])} className="w-full h-full object-contain" alt="Slide" />
                                            
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveImage(currentSlideIndex)}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
                                                title="ลบรูปนี้"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>

                                            {/* Nav buttons */}
                                            {images.length > 1 && (
                                                <>
                                                    <button type="button" onClick={() => setCurrentSlideIndex((currentSlideIndex - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full">
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                    </button>
                                                    <button type="button" onClick={() => setCurrentSlideIndex((currentSlideIndex + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full">
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                    </button>
                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                                        {currentSlideIndex + 1} / {images.length}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Thumbnails */}
                                        <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                                            {images.map((img, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => setCurrentSlideIndex(idx)}
                                                    className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden cursor-pointer border-2 transition-all snap-start ${currentSlideIndex === idx ? 'border-primary-blue ring-2 ring-blue-200' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                                >
                                                    <img src={getPreviewSrc(img)} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
                                        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm">ยังไม่มีรูปภาพ</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 text-gray-700">ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-blue text-white rounded-lg font-bold hover:bg-blue-700 shadow">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentHomeVisitPage;
