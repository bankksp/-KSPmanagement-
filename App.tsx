
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import ReportModal from './components/ReportModal';
import ViewReportModal from './components/ViewReportModal';
import AdminDashboard from './components/AdminDashboard';
import StudentPage from './components/StudentPage';
import StudentModal from './components/StudentModal';
import ViewStudentModal from './components/ViewStudentModal';
import PersonnelPage from './components/PersonnelPage';
import PersonnelModal from './components/PersonnelModal';
import ViewPersonnelModal from './components/ViewPersonnelModal';
import AttendancePage from './components/AttendancePage';
import ReportPage from './components/ReportPage';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import ProfilePage from './components/ProfilePage';
import AcademicPage from './components/AcademicPage';
import SupplyPage from './components/SupplyPage';
import DurableGoodsPage from './components/DurableGoodsPage';
import CertificatePage from './components/CertificatePage';
import MaintenancePage from './components/MaintenancePage';
import PersonnelReportPage from './components/PersonnelReportPage';
import PersonnelSARPage from './components/PersonnelSARPage';
import GeneralDocsPage from './components/GeneralDocsPage'; 
import StudentHomeVisitPage from './components/StudentHomeVisitPage'; 
import SDQPage from './components/SDQPage'; 
import ServiceRegistrationPage from './components/ServiceRegistrationPage'; 
import ConstructionPage from './components/ConstructionPage';
import BudgetPlanningPage from './components/BudgetPlanningPage';
import LandingPage from './components/LandingPage';
import NutritionPage from './components/NutritionPage';
import DutyPage from './components/DutyPage';
import LeavePage from './components/LeavePage';

import { Report, Student, Personnel, Settings, StudentAttendance, PersonnelAttendance, Page, AcademicPlan, PlanStatus, SupplyItem, SupplyRequest, DurableGood, CertificateRequest, MaintenanceRequest, PerformanceReport, SARReport, Document, HomeVisit, ServiceRecord, ConstructionRecord, ProjectProposal, SDQRecord, MealPlan, Ingredient, DutyRecord, LeaveRecord } from './types';
import { DEFAULT_SETTINGS, DEFAULT_INGREDIENTS } from './constants';
import { prepareDataForApi, postToGoogleScript } from './utils';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('stats');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false); 
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasInitialData, setHasInitialData] = useState(false);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); 

    const [reports, setReports] = useState<Report[]>([]);
    const [viewingReport, setViewingReport] = useState<Report | null>(null);
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const [students, setStudents] = useState<Student[]>([]);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [viewingPersonnel, setViewingPersonnel] = useState<Personnel | null>(null);
    const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

    const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>([]);
    const [personnelAttendance, setPersonnelAttendance] = useState<PersonnelAttendance[]>([]);
    const [dutyRecords, setDutyRecords] = useState<DutyRecord[]>([]);
    const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
    const [academicPlans, setAcademicPlans] = useState<AcademicPlan[]>([]);
    const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
    const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
    const [durableGoods, setDurableGoods] = useState<DurableGood[]>([]);
    const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
    const [performanceReports, setPerformanceReports] = useState<PerformanceReport[]>([]);
    const [sarReports, setSarReports] = useState<SARReport[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);
    const [sdqRecords, setSdqRecords] = useState<SDQRecord[]>([]);
    const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>(DEFAULT_INGREDIENTS);
    const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
    const [constructionRecords, setConstructionRecords] = useState<ConstructionRecord[]>([]);
    const [projectProposals, setProjectProposals] = useState<ProjectProposal[]>([]);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

    const [currentUser, setCurrentUser] = useState<Personnel | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', settings.themeColors.primary);
        root.style.setProperty('--color-primary-hover', settings.themeColors.primaryHover);
    }, [settings.themeColors]);
    
    useEffect(() => {
        const storedUser = localStorage.getItem('dschool_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                const idStr = user.idCard ? String(user.idCard).replace(/[^0-9]/g, '') : '';
                if (idStr === '1469900181659') {
                    user.role = 'admin';
                }
                setCurrentUser(user);
                setIsAuthenticated(true);
            } catch (e) {
                localStorage.removeItem('dschool_user');
                setIsAuthenticated(false);
            }
        } else {
            setIsAuthenticated(false);
        }
    }, []);

    const fetchData = useCallback(async (isBackground: boolean = false) => {
        if (!isAuthenticated) return;

        if (isBackground) {
            setIsSyncing(true);
        } else if (!hasInitialData) {
            setIsLoading(true);
            setFetchError(null);
        }
        
        try {
            const response = await postToGoogleScript({ action: 'getAllData' });
            const data = response.data || {};
            
            const normalizedReports = (data.reports || []).map((r: any) => {
                if (r.studentDetails && typeof r.studentDetails !== 'string') {
                    return { ...r, studentDetails: JSON.stringify(r.studentDetails) };
                }
                return r;
            });
            
            setReports(normalizedReports);
            setStudents(data.students || []);
            
            let fetchedPersonnel: Personnel[] = data.personnel || [];
            fetchedPersonnel = fetchedPersonnel.map(p => {
                const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
                if (normalizeId(p.idCard) === '1469900181659') {
                    return { ...p, role: 'admin' as const, status: 'approved' as const };
                }
                if (!p.status) {
                    p.status = 'approved';
                }
                return p;
            });

            setPersonnel(fetchedPersonnel);

            if (currentUser) {
                const updatedMe = fetchedPersonnel.find(p => p.id === currentUser.id);
                if (updatedMe) {
                    setCurrentUser(prev => ({ ...prev, ...updatedMe }));
                    localStorage.setItem('dschool_user', JSON.stringify({ ...currentUser, ...updatedMe }));
                }
            }

            setStudentAttendance(data.studentAttendance || []);
            setPersonnelAttendance(data.personnelAttendance || []);
            setDutyRecords(data.dutyRecords || []);
            setLeaveRecords(data.leaveRecords || []);
            setAcademicPlans(data.academicPlans || []);
            setSupplyItems(data.supplyItems || []);
            setSupplyRequests(data.supplyRequests || []);
            setDurableGoods(data.durableGoods || []); 
            setCertificateRequests(data.certificateRequests || []); 
            setMaintenanceRequests(data.maintenanceRequests || []);
            setPerformanceReports(data.performanceReports || []);
            setSarReports(data.sarReports || []);
            setDocuments(data.generalDocuments || data.documents || []); 
            setServiceRecords(data.serviceRecords || []);
            setConstructionRecords(data.constructionRecords || []); 
            setProjectProposals(data.projectProposals || []); 
            
            const normalizedHomeVisits = (data.homeVisits || []).map((v: any) => {
                if (v.studentId) v.studentId = Number(v.studentId);
                if (v.id) v.id = Number(v.id);
                if (v.visitorId) v.visitorId = Number(v.visitorId);

                if (v.image) {
                    if (typeof v.image === 'string') {
                        if (v.image.trim().startsWith('[')) {
                            try { 
                                const parsed = JSON.parse(v.image);
                                v.image = Array.isArray(parsed) ? parsed : [parsed];
                            } catch(e) { 
                                v.image = [v.image]; 
                            }
                        } else {
                            v.image = [v.image];
                        }
                    } else if (!Array.isArray(v.image)) {
                        v.image = [];
                    }
                } else {
                    v.image = [];
                }
                return v;
            });
            setHomeVisits(normalizedHomeVisits);

            if (data.sdqRecords) {
                 const normSDQ = data.sdqRecords.map((r: any) => {
                     if (typeof r.scores === 'string') {
                         try { r.scores = JSON.parse(r.scores); } catch(e) { r.scores = {}; }
                     }
                     return r;
                 });
                 setSdqRecords(normSDQ);
            } else {
                setSdqRecords([]);
            }

            if (data.mealPlans) setMealPlans(data.mealPlans);
            if (data.ingredients) setIngredients(data.ingredients);

            if (data.settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            }
            
            setHasInitialData(true);

        } catch (error: any) {
            console.error("Failed to fetch data:", error);
            if (!isBackground) {
                if (error.message && (error.message.includes("Unauthorized") || error.message.includes("Session expired"))) {
                    handleLogout();
                    alert("เซสชั่นหมดอายุหรือไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่");
                } else {
                    setFetchError(error instanceof Error ? error.message : "Unknown error occurred");
                }
            }
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    }, [isAuthenticated, currentUser?.id, hasInitialData]);

    const isUIBusy = useMemo(() => {
        return isReportModalOpen || 
               isStudentModalOpen || 
               isPersonnelModalOpen || 
               isLoginModalOpen || 
               isRegisterModalOpen ||
               !!editingReport ||
               !!editingStudent ||
               !!editingPersonnel;
    }, [
        isReportModalOpen, isStudentModalOpen, isPersonnelModalOpen, 
        isLoginModalOpen, isRegisterModalOpen, 
        editingReport, editingStudent, editingPersonnel
    ]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData(false);
        }
    }, [isAuthenticated, fetchData]);

    useEffect(() => {
        if (!isAuthenticated || isUIBusy) return;
        const intervalId = setInterval(() => {
            if (!document.hidden) {
                fetchData(true);
            }
        }, 45000); 
        return () => clearInterval(intervalId);
    }, [fetchData, isUIBusy, isAuthenticated]);

    const handleSaveAdminSettings = async (newSettings: Settings, redirect: boolean = true) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(newSettings);
            const response = await postToGoogleScript({ action: 'updateSettings', data: apiPayload });
            setSettings(response.data);
            if (redirect) { setCurrentPage('stats'); alert('บันทึกการตั้งค่าเรียบร้อยแล้ว'); }
        } catch (error) { console.error(error); alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'); } finally { setIsSaving(false); }
    };
    
    const handleUpdateServiceLocations = async (locations: string[]) => {
        setIsSaving(true);
        try {
            const newSettings = { ...settings, serviceLocations: locations };
            const apiPayload = await prepareDataForApi(newSettings);
            const response = await postToGoogleScript({ action: 'updateSettings', data: apiPayload });
            setSettings(response.data);
        } catch (error) { console.error(error); alert('เกิดข้อผิดพลาด'); } finally { setIsSaving(false); }
    };

    const handleLoginSuccess = (user: Personnel) => {
        const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
        if (normalizeId(user.idCard) === '1469900181659') user.role = 'admin';
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('dschool_user', JSON.stringify(user));
    };

    const handleSessionLogin = (user: Personnel, rememberMe: boolean) => {
        const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
        if (normalizeId(user.idCard) === '1469900181659') user.role = 'admin';
        setCurrentUser(user);
        if (rememberMe) localStorage.setItem('dschool_user', JSON.stringify(user));
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setHasInitialData(false);
        localStorage.removeItem('dschool_user');
        setCurrentPage('stats');
        setReports([]); setStudents([]); setPersonnel([]);
    };

    const handleRegister = async (newPersonnel: Personnel) => {
        await handleSavePersonnel(newPersonnel);
        setIsRegisterModalOpen(false);
    };

    const handleSaveReport = async (report: Report) => { 
        setIsSaving(true);
        try {
            const isEditing = !!editingReport;
            const action = isEditing ? 'updateReport' : 'addReport';
            const apiPayload = await prepareDataForApi(report);
            const response = await postToGoogleScript({ action, data: apiPayload });
            const savedData = response.data;
            const normalize = (r: any) => r.studentDetails && typeof r.studentDetails !== 'string' ? { ...r, studentDetails: JSON.stringify(r.studentDetails) } : r;
            
            let processed = Array.isArray(savedData) ? savedData : [savedData];
            if (isEditing) {
                setReports(prev => prev.map(r => String(r.id) === String(processed[0].id) ? normalize(processed[0]) : r));
            } else {
                setReports(prev => [...prev, ...processed.map(normalize)]);
            }
            handleCloseReportModal();
        } catch(e) { console.error(e); alert('Error saving report'); } finally { setIsSaving(false); }
    };

    const deleteReports = async (ids: number[]) => { 
        try { await postToGoogleScript({ action: 'deleteReports', ids }); setReports(prev => prev.filter(r => !ids.map(String).includes(String(r.id)))); } catch(e) { console.error(e); alert('Error deleting'); }
    };
    
    const handleSaveStudent = async (student: Student) => { 
        setIsSaving(true);
        try {
            const isEditing = !!editingStudent;
            const action = isEditing ? 'updateStudent' : 'addStudent';
            const apiPayload = await prepareDataForApi(student);
            const response = await postToGoogleScript({ action, data: apiPayload });
            const saved = response.data;
            let processed = Array.isArray(saved) ? saved : [saved];
            if (isEditing) setStudents(prev => prev.map(s => String(s.id) === String(processed[0].id) ? processed[0] : s));
            else setStudents(prev => [...prev, ...processed]);
            handleCloseStudentModal();
        } catch(e) { console.error(e); alert('Error'); } finally { setIsSaving(false); }
    };

    const deleteStudents = async (ids: number[]) => { try { await postToGoogleScript({ action: 'deleteStudents', ids }); setStudents(prev => prev.filter(s => !ids.map(String).includes(String(s.id)))); } catch(e) { alert('Error'); } };
    
    const handleSavePersonnel = async (person: Personnel) => { 
        setIsSaving(true);
        try {
            const isEditing = personnel.some(p => p.id === person.id);
            const action = isEditing ? 'updatePersonnel' : 'addPersonnel';
            const apiPayload = await prepareDataForApi(person);
            const response = await postToGoogleScript({ action, data: apiPayload });
            const saved = response.data;
            let processed = Array.isArray(saved) ? saved : [saved];
            const fixAdmin = (p: Personnel) => {
                 if(String(p.idCard).replace(/[^0-9]/g, '') === '1469900181659') return {...p, role: 'admin' as const, status: 'approved' as const};
                 if(!p.status) p.status = 'approved';
                 return p;
            };
            const finalP = processed.map(fixAdmin);
            if(isEditing) {
                setPersonnel(prev => prev.map(p => String(p.id) === String(finalP[0].id) ? finalP[0] : p));
                if(currentUser && String(currentUser.id) === String(finalP[0].id)) {
                    setCurrentUser(finalP[0]);
                    localStorage.setItem('dschool_user', JSON.stringify(finalP[0]));
                }
            } else setPersonnel(prev => [...prev, ...finalP]);
            handleClosePersonnelModal();
        } catch(e) { console.error(e); alert('Error'); } finally { setIsSaving(false); }
    };

    const deletePersonnel = async (ids: number[]) => { try { await postToGoogleScript({ action: 'deletePersonnel', ids }); setPersonnel(prev => prev.filter(p => !ids.map(String).includes(String(p.id)))); } catch(e) { alert('Error'); } };

    const handleSaveAttendance = async (t: 'student' | 'personnel', d: any) => { 
        setIsSaving(true);
        try {
            const action = t === 'student' ? 'saveStudentAttendance' : 'savePersonnelAttendance';
            const response = await postToGoogleScript({ action, data: d });
            const saved = Array.isArray(response.data) ? response.data : [response.data];
            
            if(t === 'student') {
                setStudentAttendance(prev => {
                    const ids = new Set(saved.map((x:any) => x.id));
                    return [...prev.filter(r => !ids.has(r.id)), ...saved];
                });
            } else {
                setPersonnelAttendance(prev => {
                    const ids = new Set(saved.map((x:any) => x.id));
                    return [...prev.filter(r => !ids.has(r.id)), ...saved];
                });
            }
            alert('บันทึกข้อมูลเรียบร้อย');
        } catch(e) { 
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally { 
            setIsSaving(false); 
        }
    }; 

    const handleDeleteAttendance = async (t: 'student' | 'personnel', ids: string[]) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลประวัติการเช็คชื่อรายการนี้?')) return;
        try {
            const action = t === 'student' ? 'deleteStudentAttendance' : 'deletePersonnelAttendance';
            await postToGoogleScript({ action, ids });
            if(t === 'student') {
                setStudentAttendance(prev => prev.filter(r => !ids.includes(r.id)));
            } else {
                setPersonnelAttendance(prev => prev.filter(r => !ids.includes(r.id)));
            }
            alert('ลบข้อมูลเรียบร้อย');
        } catch(e) {
            alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    };

    const handleSaveAcademicPlan = async (p: AcademicPlan) => { 
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(p);
            const response = await postToGoogleScript({ action: 'saveAcademicPlan', data: apiPayload });
            setAcademicPlans(prev => [...prev, response.data]);
        } catch(e) { alert('Error'); } finally { setIsSaving(false); }
    };

    const handleUpdateAcademicPlanStatus = async (id: number, status: PlanStatus, comment?: string) => { 
        setIsSaving(true);
        try {
            await postToGoogleScript({ action: 'updateAcademicPlanStatus', data: { id, status, comment, approverName: currentUser?.personnelName, approvedDate: new Date().toLocaleDateString('th-TH') } });
            setAcademicPlans(prev => prev.map(p => String(p.id) === String(id) ? { ...p, status, comment } : p));
        } catch(e) { alert('Error'); } finally { setIsSaving(false); }
    };
    
    const handleGenericSave = async (action: string, data: any, setter: any) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(data);
            const response = await postToGoogleScript({ action, data: apiPayload });
            const saved = response.data;
            setter((prev: any[]) => {
                const index = prev.findIndex(item => String(item.id) === String(saved.id));
                if (index >= 0) { const n = [...prev]; n[index] = saved; return n; }
                return [...prev, saved];
            });
            alert('บันทึกเรียบร้อย');
        } catch(e) { console.error(e); alert('Error saving: ' + e); } finally { setIsSaving(false); }
    };

    const handleGenericDelete = async (action: string, ids: number[], setter: any) => {
        try { 
            await postToGoogleScript({ action, ids }); 
            setter((prev: any[]) => prev.filter(i => !ids.map(String).includes(String(i.id)))); 
            alert('ลบเรียบร้อย'); 
        } catch(e) { alert('Error deleting: ' + e); }
    };

    const handleOpenReportModal = () => { setEditingReport(null); setIsReportModalOpen(true); };
    const handleCloseReportModal = () => { setIsReportModalOpen(false); setEditingReport(null); };
    const handleViewReport = (r: Report) => setViewingReport(r);
    const handleCloseViewReportModal = () => setViewingReport(null);
    const handleEditReport = (r: Report) => { setEditingReport(r); setIsReportModalOpen(true); };

    const handleOpenStudentModal = () => { setEditingStudent(null); setIsStudentModalOpen(true); };
    const handleCloseStudentModal = () => { setIsStudentModalOpen(false); setEditingStudent(null); };
    const handleViewStudent = (s: Student) => setViewingStudent(s);
    const handleCloseViewStudentModal = () => setViewingStudent(null);
    const handleEditStudent = (s: Student) => { setEditingStudent(s); setIsStudentModalOpen(true); };

    const handleOpenPersonnelModal = () => { setEditingPersonnel(null); setIsPersonnelModalOpen(true); };
    const handleClosePersonnelModal = () => { setIsPersonnelModalOpen(false); setEditingPersonnel(null); };
    const handleViewPersonnel = (p: Personnel) => setViewingPersonnel(p);
    const handleCloseViewPersonnelModal = () => setViewingPersonnel(null);
    const handleEditPersonnel = (p: Personnel) => { setEditingPersonnel(p); setIsPersonnelModalOpen(true); };

    const renderPage = () => {
        if (isLoading && !hasInitialData) {
             return (
                <div className="flex flex-col justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-blue mb-4"></div>
                    <p className="text-xl text-secondary-gray font-medium">กำลังเตรียมข้อมูล...</p>
                </div>
            )
        }

        if (fetchError && !hasInitialData) {
             return (
                 <div className="flex flex-col justify-center items-center h-full text-center p-8">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">ไม่สามารถดึงข้อมูลได้</h3>
                    <p className="text-gray-600 mb-6 max-w-md">{fetchError}</p>
                    <button onClick={() => fetchData()} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow transition">
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            )
        }
        
        switch(currentPage) {
            case 'stats':
                return <Dashboard 
                            reports={reports}
                            students={students}
                            personnel={personnel} 
                            dormitories={settings.dormitories}
                            schoolName={settings.schoolName}
                            schoolLogo={settings.schoolLogo}
                            studentAttendance={studentAttendance}
                            personnelAttendance={personnelAttendance}
                            homeVisits={homeVisits} 
                        />;
            case 'academic_plans':
                return currentUser ? (
                    <AcademicPage 
                        currentUser={currentUser}
                        personnel={personnel}
                        plans={academicPlans}
                        onSavePlan={handleSaveAcademicPlan}
                        onUpdateStatus={handleUpdateAcademicPlanStatus}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'academic_service': 
                return currentUser ? (
                    <ServiceRegistrationPage 
                        currentUser={currentUser}
                        students={students}
                        personnel={personnel}
                        records={serviceRecords}
                        onSaveRecord={(r) => handleGenericSave('saveServiceRecord', r, setServiceRecords)}
                        onDeleteRecord={(ids) => handleGenericDelete('deleteServiceRecords', ids, setServiceRecords)}
                        serviceLocations={settings.serviceLocations || []}
                        onUpdateLocations={handleUpdateServiceLocations}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'attendance':
                return <AttendancePage
                            mode="student"
                            students={students}
                            personnel={personnel}
                            studentAttendance={studentAttendance}
                            personnelAttendance={personnelAttendance}
                            onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)}
                            onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)}
                            onDeleteAttendance={(type, ids) => handleDeleteAttendance(type, ids)}
                            isSaving={isSaving}
                            currentUser={currentUser}
                            settings={settings}
                        />;
            case 'attendance_personnel':
                return <AttendancePage
                            mode="personnel"
                            students={students}
                            personnel={personnel}
                            studentAttendance={studentAttendance}
                            personnelAttendance={personnelAttendance}
                            onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)}
                            onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)}
                            onDeleteAttendance={(type, ids) => handleDeleteAttendance(type, ids)}
                            isSaving={isSaving}
                            currentUser={currentUser}
                            settings={settings}
                        />;
            case 'personnel_duty':
                return currentUser ? (
                    <DutyPage 
                        currentUser={currentUser}
                        records={dutyRecords}
                        onSave={(r) => handleGenericSave('saveDutyRecord', r, setDutyRecords)}
                        onDelete={(ids) => handleGenericDelete('deleteDutyRecords', ids, setDutyRecords)}
                        settings={settings}
                        onSaveSettings={(s) => handleSaveAdminSettings(s, false)}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'personnel_leave':
                return currentUser ? (
                    <LeavePage 
                        currentUser={currentUser}
                        records={leaveRecords}
                        onSave={(r) => handleGenericSave('saveLeaveRecord', r, setLeaveRecords)}
                        onDelete={(ids) => handleGenericDelete('deleteLeaveRecords', ids, setLeaveRecords)}
                        settings={settings}
                        onSaveSettings={(s) => handleSaveAdminSettings(s, false)}
                        isSaving={isSaving}
                        personnel={personnel}
                    />
                ) : null;
            case 'reports':
                return <ReportPage
                            reports={reports}
                            deleteReports={deleteReports}
                            onViewReport={handleViewReport}
                            onEditReport={handleEditReport}
                            onAddReport={handleOpenReportModal}
                        />;
            case 'students':
                return <StudentPage 
                            students={students}
                            dormitories={settings.dormitories}
                            studentClasses={settings.studentClasses}
                            studentClassrooms={settings.studentClassrooms}
                            onAddStudent={handleOpenStudentModal}
                            onEditStudent={handleEditStudent}
                            onViewStudent={handleViewStudent}
                            onDeleteStudents={deleteStudents}
                        />;
            case 'personnel':
                return <PersonnelPage 
                            personnel={personnel}
                            positions={settings.positions}
                            onAddPersonnel={handleOpenPersonnelModal}
                            onEditPersonnel={handleEditPersonnel}
                            onViewPersonnel={handleViewPersonnel}
                            onDeletePersonnel={deletePersonnel}
                            currentUser={currentUser}
                        />;
            case 'finance_supplies':
                return currentUser ? (
                    <SupplyPage 
                        currentUser={currentUser}
                        items={supplyItems}
                        requests={supplyRequests}
                        personnel={personnel}
                        onUpdateItems={(items) => { setSupplyItems(items); }}
                        onUpdateRequests={(reqs) => setSupplyRequests(reqs)}
                        onUpdatePersonnel={handleSavePersonnel}
                        settings={settings}
                        onSaveSettings={(s) => handleSaveAdminSettings(s)}
                        onSaveItem={(i) => handleGenericSave('saveSupplyItem', i, setSupplyItems)}
                        onDeleteItem={(id) => handleGenericDelete('deleteSupplyItems', [id], setSupplyItems)}
                        onSaveRequest={(r) => handleGenericSave('saveSupplyRequest', r, setSupplyRequests)}
                        onUpdateRequestStatus={(r) => { handleGenericSave('updateSupplyRequestStatus', r, setSupplyRequests); }}
                    />
                ) : null;
            case 'finance_projects': 
                return currentUser ? (
                    <BudgetPlanningPage 
                        currentUser={currentUser}
                        proposals={projectProposals}
                        personnel={personnel}
                        settings={settings}
                        onSave={(p) => handleGenericSave('saveProjectProposal', p, setProjectProposals)}
                        onDelete={(ids) => handleGenericDelete('deleteProjectProposals', ids, setProjectProposals)}
                        onUpdateSettings={(s) => handleSaveAdminSettings(s, false)}
                        onUpdatePersonnel={handleSavePersonnel} 
                        isSaving={isSaving}
                    />
                ) : null;
            case 'durable_goods': 
                return currentUser ? (
                    <DurableGoodsPage 
                        currentUser={currentUser}
                        durableGoods={durableGoods}
                        onSave={(i) => handleGenericSave('saveDurableGood', i, setDurableGoods)}
                        onDelete={(ids) => handleGenericDelete('deleteDurableGoods', ids, setDurableGoods)}
                        isSaving={isSaving}
                        settings={settings}
                    />
                ) : null;
            case 'general_certs':
                return currentUser ? (
                    <CertificatePage 
                        currentUser={currentUser}
                        requests={certificateRequests}
                        onSave={(r) => handleGenericSave('saveCertificateRequest', r, setCertificateRequests)}
                        onDelete={(ids) => handleGenericDelete('deleteCertificateRequests', ids, setCertificateRequests)}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'general_repair':
                return currentUser ? (
                    <MaintenancePage 
                        currentUser={currentUser}
                        requests={maintenanceRequests}
                        onSave={(r) => handleGenericSave('saveMaintenanceRequest', r, setMaintenanceRequests)}
                        onDelete={(ids) => handleGenericDelete('deleteMaintenanceRequests', ids, setMaintenanceRequests)}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'general_docs': 
                return currentUser ? (
                    <GeneralDocsPage 
                        currentUser={currentUser}
                        personnel={personnel}
                        documents={documents}
                        onSave={(d) => handleGenericSave('saveDocument', d, setDocuments)}
                        onDelete={(ids) => handleGenericDelete('deleteDocuments', ids, setDocuments)}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'general_construction': 
                return currentUser ? (
                    <ConstructionPage 
                        currentUser={currentUser}
                        records={constructionRecords}
                        onSave={(r) => handleGenericSave('saveConstructionRecord', r, setConstructionRecords)}
                        onDelete={(ids) => handleGenericDelete('deleteConstructionRecords', ids, setConstructionRecords)}
                        isSaving={isSaving}
                        personnel={personnel}
                    />
                ) : null;
            case 'general_nutrition':
                return currentUser ? (
                    <NutritionPage 
                        currentUser={currentUser}
                        mealPlans={mealPlans}
                        ingredients={ingredients}
                        onSaveMealPlan={(mp) => handleGenericSave('saveMealPlan', mp, setMealPlans)}
                        onDeleteMealPlan={(ids) => handleGenericDelete('deleteMealPlans', ids, setMealPlans)}
                        onSaveIngredient={(ing) => handleGenericSave('saveIngredient', ing, setIngredients)}
                        onDeleteIngredient={(ids) => handleGenericDelete('deleteIngredients', ids, setIngredients)}
                        isSaving={isSaving}
                        students={students}
                    />
                ) : null;
            case 'student_home_visit':
                return currentUser ? (
                    <StudentHomeVisitPage 
                        currentUser={currentUser}
                        students={students}
                        visits={homeVisits}
                        onSave={(v) => handleGenericSave('saveHomeVisit', v, setHomeVisits)}
                        studentClasses={settings.studentClasses}
                        studentClassrooms={settings.studentClassrooms}
                        academicYears={settings.academicYears}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'student_sdq':
                return currentUser ? (
                    <SDQPage
                        currentUser={currentUser}
                        students={students}
                        records={sdqRecords}
                        onSave={(r) => handleGenericSave('saveSDQRecord', r, setSdqRecords)}
                        onDelete={(ids) => handleGenericDelete('deleteSDQRecords', ids, setSdqRecords)}
                        academicYears={settings.academicYears}
                        isSaving={isSaving}
                        studentClasses={settings.studentClasses}
                        studentClassrooms={settings.studentClassrooms}
                    />
                ) : null;
            case 'personnel_report':
                return currentUser ? (
                    <PersonnelReportPage 
                        currentUser={currentUser}
                        personnel={personnel}
                        reports={performanceReports}
                        onSave={(r) => handleGenericSave('savePerformanceReport', r, setPerformanceReports)}
                        onDelete={(ids) => handleGenericDelete('deletePerformanceReports', ids, setPerformanceReports)}
                        academicYears={settings.academicYears}
                        positions={settings.positions}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'personnel_sar': 
                return currentUser ? (
                    <PersonnelSARPage 
                        currentUser={currentUser}
                        personnel={personnel}
                        reports={sarReports}
                        onSave={(r) => handleGenericSave('saveSARReport', r, setSarReports)}
                        onDelete={(ids) => handleGenericDelete('deleteSARReports', ids, setSarReports)}
                        academicYears={settings.academicYears}
                        positions={settings.positions}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'admin':
                return <AdminDashboard 
                            settings={settings}
                            onSave={handleSaveAdminSettings}
                            onExit={() => setCurrentPage('stats')}
                            isSaving={isSaving}
                        />
            case 'profile':
                return currentUser ? (
                    <ProfilePage 
                        user={currentUser}
                        onSave={handleSavePersonnel}
                        isSaving={isSaving}
                    />
                ) : null;
                
            default:
                return null;
        }
    };

    if (!isAuthenticated) {
        return (
            <LandingPage 
                onLoginSuccess={handleLoginSuccess}
                schoolName={settings.schoolName}
                schoolLogo={settings.schoolLogo}
            />
        );
    }

    const navigateTo = (page: Page) => {
        if (page === 'admin' && currentUser?.role !== 'admin') {
            alert('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
            return;
        }
        setCurrentPage(page);
        setIsSidebarOpen(false); 
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F3F4F6] font-sarabun">
            <Sidebar 
                onNavigate={navigateTo}
                currentPage={currentPage}
                schoolName={settings.schoolName}
                schoolLogo={settings.schoolLogo}
                currentUser={currentUser}
                personnel={personnel}
                isOpen={isSidebarOpen}
                onCloseMobile={() => setIsSidebarOpen(false)}
                isDesktopOpen={isDesktopSidebarOpen}
            />

            <div className={`flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
                <Header 
                    onReportClick={handleOpenReportModal} 
                    onNavigate={navigateTo}
                    currentPage={currentPage}
                    schoolName={settings.schoolName}
                    schoolLogo={settings.schoolLogo}
                    currentUser={currentUser}
                    onLoginClick={() => setIsLoginModalOpen(true)}
                    onLogoutClick={handleLogout}
                    personnel={personnel} 
                    onToggleSidebar={() => setIsSidebarOpen(true)}
                    isDesktopSidebarOpen={isDesktopSidebarOpen}
                    onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                    isSyncing={isSyncing}
                />
                
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-0">
                    <div className="max-w-7xl mx-auto">
                        {renderPage()}
                    </div>
                    <div className="h-10"></div> 
                    <Footer />
                </main>
            </div>

            <LoginModal 
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLogin={handleSessionLogin}
                personnelList={personnel}
                onRegisterClick={() => {
                    setIsLoginModalOpen(false);
                    setIsRegisterModalOpen(true);
                }}
            />

            <RegisterModal 
                isOpen={isRegisterModalOpen} 
                onClose={() => setIsRegisterModalOpen(false)} 
                onRegister={handleRegister} 
                positions={settings.positions} 
                isSaving={isSaving} 
            />

            {isReportModalOpen && (
                <ReportModal 
                    onClose={handleCloseReportModal} 
                    onSave={handleSaveReport}
                    reportToEdit={editingReport}
                    academicYears={settings.academicYears}
                    dormitories={settings.dormitories}
                    positions={settings.positions}
                    isSaving={isSaving}
                    personnel={personnel}
                    currentUser={currentUser}
                    students={students}
                />
            )}
            {viewingReport && <ViewReportModal report={viewingReport} onClose={handleCloseViewReportModal} students={students} />}
            {isStudentModalOpen && (
                <StudentModal
                    onClose={handleCloseStudentModal}
                    onSave={handleSaveStudent}
                    studentToEdit={editingStudent}
                    dormitories={settings.dormitories}
                    studentClasses={settings.studentClasses}
                    studentClassrooms={settings.studentClassrooms}
                    personnel={personnel}
                    isSaving={isSaving}
                />
            )}
            {viewingStudent && <ViewStudentModal student={viewingStudent} onClose={handleCloseViewStudentModal} personnel={personnel} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} />}
            {isPersonnelModalOpen && (
                <PersonnelModal
                    onClose={handleClosePersonnelModal}
                    onSave={handleSavePersonnel}
                    personnelToEdit={editingPersonnel}
                    positions={settings.positions}
                    students={students}
                    isSaving={isSaving}
                    currentUserRole={currentUser?.role}
                    currentUser={currentUser}
                />
            )}
            {viewingPersonnel && <ViewPersonnelModal personnel={viewingPersonnel} onClose={handleCloseViewPersonnelModal} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} />}
        </div>
    );
};

export default App;
