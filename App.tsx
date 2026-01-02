
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import WorkflowPage from './components/WorkflowPage';

import { Report, Student, Personnel, Settings, StudentAttendance, PersonnelAttendance, Page, AcademicPlan, PlanStatus, SupplyItem, SupplyRequest, DurableGood, CertificateRequest, MaintenanceRequest, PerformanceReport, SARReport, Document, HomeVisit, ServiceRecord, ConstructionRecord, ProjectProposal, SDQRecord, MealPlan, Ingredient, DutyRecord, LeaveRecord, WorkflowDocument } from './types';
import { DEFAULT_SETTINGS, DEFAULT_INGREDIENTS } from './constants';
import { prepareDataForApi, postToGoogleScript, isoToBuddhist, normalizeDate, safeParseArray, getCurrentThaiDate, toStrictThaiDateString } from './utils';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('stats');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false); 
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasInitialData, setHasInitialData] = useState(false);
    
    const lastSaveTime = useRef<number>(0);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); 

    const [reports, setReports] = useState<Report[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
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
    const [workflowDocuments, setWorkflowDocuments] = useState<WorkflowDocument[]>([]);
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
    
    const [viewingReport, setViewingReport] = useState<Report | null>(null);
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [viewingPersonnel, setViewingPersonnel] = useState<Personnel | null>(null);
    const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

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
                if (idStr === '1469900181659') user.role = 'admin';
                setCurrentUser(user);
                setIsAuthenticated(true);
            } catch (e) {
                localStorage.removeItem('dschool_user');
                setIsAuthenticated(false);
            }
        }
    }, []);

    const fetchData = useCallback(async (isBackground: boolean = false) => {
        if (!isAuthenticated || isSaving || (Date.now() - lastSaveTime.current < 5000)) return;

        if (isBackground) setIsSyncing(true);
        else if (!hasInitialData) {
            setIsLoading(true);
            setFetchError(null);
        }
        
        try {
            const response = await postToGoogleScript({ action: 'getAllData' });
            const data = response.data || {};
            
            // Normalize all dates immediately after fetching
            setReports((data.reports || []).map((r: any) => ({
                ...r,
                reportDate: toStrictThaiDateString(r.reportDate),
                studentDetails: (r.studentDetails && typeof r.studentDetails !== 'string') ? JSON.stringify(r.studentDetails) : r.studentDetails
            })));

            setStudents(data.students || []);
            
            let fetchedPersonnel: Personnel[] = data.personnel || [];
            fetchedPersonnel = fetchedPersonnel.map(p => {
                const idStr = p.idCard ? String(p.idCard).replace(/[^0-9]/g, '') : '';
                if (idStr === '1469900181659') p.role = 'admin';
                p.dob = toStrictThaiDateString(p.dob);
                p.appointmentDate = toStrictThaiDateString(p.appointmentDate);
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

            setStudentAttendance((data.studentAttendance || []).map((r: any) => ({ ...r, date: toStrictThaiDateString(r.date) })));
            setPersonnelAttendance((data.personnelAttendance || []).map((r: any) => ({ ...r, date: toStrictThaiDateString(r.date) })));
            
            setDutyRecords((data.dutyRecords || []).map((r: any) => ({ ...r, date: toStrictThaiDateString(r.date) })));
            setLeaveRecords((data.leaveRecords || []).map((r: any) => ({
                ...r,
                date: toStrictThaiDateString(r.date),
                startDate: toStrictThaiDateString(r.startDate),
                endDate: toStrictThaiDateString(r.endDate),
                submissionDate: toStrictThaiDateString(r.submissionDate),
                approvedDate: toStrictThaiDateString(r.approvedDate)
            })));

            setAcademicPlans(data.academicPlans || []);
            setSupplyItems(data.supplyItems || []);
            setSupplyRequests(data.supplyRequests || []);
            setDurableGoods(data.durableGoods || []); 
            setCertificateRequests(data.certificateRequests || []); 
            setMaintenanceRequests(data.maintenanceRequests || []);
            setPerformanceReports(data.performanceReports || []);
            setSarReports(data.sarReports || []);
            setDocuments(data.generalDocuments || data.documents || []); 
            setWorkflowDocuments(data.workflowDocuments || []);
            setServiceRecords(data.serviceRecords || []);
            setConstructionRecords(data.constructionRecords || []); 
            setProjectProposals(data.projectProposals || []); 
            setHomeVisits((data.homeVisits || []).map((v: any) => ({ ...v, date: toStrictThaiDateString(v.date), image: safeParseArray(v.image) })));
            setSdqRecords((data.sdqRecords || []).map((r: any) => ({ ...r, date: toStrictThaiDateString(r.date), scores: typeof r.scores === 'string' ? JSON.parse(r.scores) : (r.scores || {}) })));
            setMealPlans((data.mealPlans || []).map((p:any) => ({ ...p, date: toStrictThaiDateString(p.date) })));
            if (data.ingredients) setIngredients(data.ingredients);
            if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            
            setHasInitialData(true);
            setFetchError(null);
        } catch (error: any) {
            console.error("Fetch Data Failed:", error);
            if (!isBackground) setFetchError(error.message || "Unknown error");
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    }, [isAuthenticated, currentUser?.id, hasInitialData, isSaving]);

    useEffect(() => {
        if (isAuthenticated) fetchData(false);
    }, [isAuthenticated, fetchData]);

    useEffect(() => {
        if (!isAuthenticated || isSaving || isReportModalOpen || isStudentModalOpen || isPersonnelModalOpen) return;
        const intervalId = setInterval(() => {
            if (!document.hidden) fetchData(true);
        }, 60000); 
        return () => clearInterval(intervalId);
    }, [fetchData, isAuthenticated, isSaving, isReportModalOpen, isStudentModalOpen, isPersonnelModalOpen]);

    const handleSaveAttendance = async (t: 'student' | 'personnel', d: any) => { 
        setIsSaving(true);
        lastSaveTime.current = Date.now();
        try {
            const action = t === 'student' ? 'saveStudentAttendance' : 'savePersonnelAttendance';
            const response = await postToGoogleScript({ action, data: d });
            if (response.status === 'success') {
                const saved = (Array.isArray(response.data) ? response.data : [response.data])
                    .map((r:any) => ({ ...r, date: toStrictThaiDateString(r.date) }));
                
                if(t === 'student') {
                    setStudentAttendance(prev => {
                        const ids = new Set(saved.map((x:any) => String(x.id)));
                        return [...prev.filter(r => !ids.has(String(r.id))), ...saved];
                    });
                } else {
                    setPersonnelAttendance(prev => {
                        const ids = new Set(saved.map((x:any) => String(x.id)));
                        return [...prev.filter(r => !ids.has(String(r.id))), ...saved];
                    });
                }
            }
        } catch(e) { 
            console.error(e);
            alert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleGenericSave = async (action: string, data: any, setter: any) => {
        setIsSaving(true);
        lastSaveTime.current = Date.now();
        try {
            const apiPayload = await prepareDataForApi(data);
            const response = await postToGoogleScript({ action, data: apiPayload });
            if (response.status === 'success') {
                let saved = response.data;
                if (['saveLeaveRecord', 'saveDutyRecord', 'saveSDQRecord', 'saveHomeVisit'].includes(action)) {
                    saved.date = toStrictThaiDateString(saved.date);
                }
                setter((prev: any[]) => {
                    const index = prev.findIndex(item => String(item.id) === String(saved.id));
                    if (index >= 0) { const n = [...prev]; n[index] = saved; return n; }
                    return [...prev, saved];
                });
            }
        } catch(e) { alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล'); } finally { setIsSaving(false); }
    };

    const handleGenericDelete = async (action: string, ids: number[], setter: any) => {
        if (!window.confirm('ยืนยันการลบข้อมูล?')) return;
        try { 
            await postToGoogleScript({ action, ids }); 
            setter((prev: any[]) => prev.filter(i => !ids.map(String).includes(String(i.id)))); 
            alert('ลบเรียบร้อย'); 
        } catch(e) { alert('Error deleting'); }
    };

    const handleLoginSuccess = (user: Personnel) => {
        const idStr = user.idCard ? String(user.idCard).replace(/[^0-9]/g, '') : '';
        if (idStr === '1469900181659') user.role = 'admin';
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('dschool_user', JSON.stringify(user));
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setHasInitialData(false);
        localStorage.removeItem('dschool_user');
        setCurrentPage('stats');
    };

    const navigateTo = (page: Page) => {
        if (page === 'admin' && currentUser?.role !== 'admin') {
            alert('เฉพาะผู้ดูแลระบบเท่านั้น');
            return;
        }
        setCurrentPage(page);
        setIsSidebarOpen(false); 
    };

    const renderPage = () => {
        if (isLoading && !hasInitialData) return (
            <div className="flex flex-col justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-blue mb-4"></div><p className="text-xl font-bold text-navy">กำลังเตรียมข้อมูล...</p></div>
        );
        if (fetchError && !hasInitialData) return (
            <div className="flex flex-col justify-center items-center h-full text-center p-8"><h3 className="text-2xl font-bold text-red-500 mb-2">ไม่สามารถเชื่อมต่อได้</h3><p className="text-gray-500 mb-6">{fetchError}</p><button onClick={() => fetchData()} className="bg-primary-blue text-white px-6 py-2 rounded-lg">ลองใหม่อีกครั้ง</button></div>
        );
        
        switch(currentPage) {
            case 'stats': return <Dashboard reports={reports} students={students} personnel={personnel} dormitories={settings.dormitories} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} studentAttendance={studentAttendance} personnelAttendance={personnelAttendance} homeVisits={homeVisits} />;
            case 'attendance': return <AttendancePage mode="student" students={students} personnel={personnel} studentAttendance={studentAttendance} personnelAttendance={personnelAttendance} onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)} onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)} onDeleteAttendance={(t, ids) => handleGenericDelete(t === 'student' ? 'deleteStudentAttendance' : 'deletePersonnelAttendance', ids.map(Number), t === 'student' ? setStudentAttendance : setPersonnelAttendance)} isSaving={isSaving} currentUser={currentUser} settings={settings} onRefresh={() => fetchData(true)} />;
            case 'attendance_personnel': return <AttendancePage mode="personnel" students={students} personnel={personnel} studentAttendance={studentAttendance} personnelAttendance={personnelAttendance} onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)} onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)} isSaving={isSaving} currentUser={currentUser} settings={settings} onRefresh={() => fetchData(true)} />;
            case 'reports': return <ReportPage reports={reports} deleteReports={(ids) => handleGenericDelete('deleteReports', ids, setReports)} onViewReport={setViewingReport} onEditReport={(r) => { setEditingReport(r); setIsReportModalOpen(true); }} onAddReport={() => { setEditingReport(null); setIsReportModalOpen(true); }} />;
            case 'students': return <StudentPage students={students} dormitories={settings.dormitories} studentClasses={settings.studentClasses} studentClassrooms={settings.studentClassrooms} onAddStudent={() => { setEditingStudent(null); setIsStudentModalOpen(true); }} onEditStudent={(s) => { setEditingStudent(s); setIsStudentModalOpen(true); }} onViewStudent={setViewingStudent} onDeleteStudents={(ids) => handleGenericDelete('deleteStudents', ids, setStudents)} />;
            case 'personnel': return <PersonnelPage personnel={personnel} positions={settings.positions} onAddPersonnel={() => { setEditingPersonnel(null); setIsPersonnelModalOpen(true); }} onEditPersonnel={(p) => { setEditingPersonnel(p); setIsPersonnelModalOpen(true); }} onViewPersonnel={setViewingPersonnel} onDeletePersonnel={(ids) => handleGenericDelete('deletePersonnel', ids, setPersonnel)} currentUser={currentUser} />;
            case 'admin': return <AdminDashboard settings={settings} onSave={(s) => handleGenericSave('updateSettings', s, (x: any) => setSettings(x))} onExit={() => setCurrentPage('stats')} isSaving={isSaving} />;
            case 'profile': return currentUser ? <ProfilePage user={currentUser} onSave={(p) => handleGenericSave('updatePersonnel', p, setPersonnel)} isSaving={isSaving} /> : null;
            case 'personnel_leave': return currentUser ? <LeavePage currentUser={currentUser} records={leaveRecords} onSave={(r) => handleGenericSave('saveLeaveRecord', r, setLeaveRecords)} onDelete={(ids) => handleGenericDelete('deleteLeaveRecords', ids, setLeaveRecords)} settings={settings} onSaveSettings={(s) => handleGenericSave('updateSettings', s, (x:any) => setSettings(x))} isSaving={isSaving} personnel={personnel} /> : null;
            case 'personnel_duty': return currentUser ? <DutyPage currentUser={currentUser} records={dutyRecords} onSave={(r) => handleGenericSave('saveDutyRecord', r, setDutyRecords)} onDelete={(ids) => handleGenericDelete('deleteDutyRecords', ids, setDutyRecords)} settings={settings} onSaveSettings={(s) => handleGenericSave('updateSettings', s, (x:any) => setSettings(x))} isSaving={isSaving} /> : null;
            case 'student_home_visit': return currentUser ? <StudentHomeVisitPage currentUser={currentUser} students={students} visits={homeVisits} onSave={(v) => handleGenericSave('saveHomeVisit', v, setHomeVisits)} studentClasses={settings.studentClasses} studentClassrooms={settings.studentClassrooms} academicYears={settings.academicYears} isSaving={isSaving} /> : null;
            case 'student_sdq': return currentUser ? <SDQPage currentUser={currentUser} students={students} records={sdqRecords} onSave={(r) => handleGenericSave('saveSDQRecord', r, setSdqRecords)} onDelete={(ids) => handleGenericDelete('deleteSDQRecords', ids, setSdqRecords)} academicYears={settings.academicYears} isSaving={isSaving} studentClasses={settings.studentClasses} studentClassrooms={settings.studentClassrooms} /> : null;
            case 'workflow_docs': return <WorkflowPage currentUser={currentUser!} personnel={personnel} documents={workflowDocuments} onSave={(d) => handleGenericSave('saveWorkflowDoc', d, setWorkflowDocuments)} onDelete={(ids) => handleGenericDelete('deleteWorkflowDocs', ids, setWorkflowDocuments)} isSaving={isSaving} />;
            default: return null;
        }
    };

    if (!isAuthenticated) return <LandingPage onLoginSuccess={handleLoginSuccess} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} />;

    return (
        <div className="flex h-screen overflow-hidden bg-[#F3F4F6] font-sarabun">
            <Sidebar onNavigate={navigateTo} currentPage={currentPage} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} currentUser={currentUser} personnel={personnel} isOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} isDesktopOpen={isDesktopSidebarOpen} />
            <div className={`flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
                <Header onReportClick={() => setIsReportModalOpen(true)} onNavigate={navigateTo} currentPage={currentPage} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} currentUser={currentUser} onLoginClick={() => setIsLoginModalOpen(true)} onLogoutClick={handleLogout} personnel={personnel} onToggleSidebar={() => setIsSidebarOpen(true)} isDesktopSidebarOpen={isDesktopSidebarOpen} onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} isSyncing={isSyncing} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-0">
                    <div className="max-w-7xl mx-auto">{renderPage()}</div>
                    <div className="h-10"></div> 
                    <Footer />
                </main>
            </div>
            {isReportModalOpen && <ReportModal onClose={() => setIsReportModalOpen(false)} onSave={(r) => handleGenericSave(editingReport ? 'updateReport' : 'addReport', r, setReports)} reportToEdit={editingReport} academicYears={settings.academicYears} dormitories={settings.dormitories} positions={settings.positions} isSaving={isSaving} personnel={personnel} currentUser={currentUser} students={students} />}
            {isStudentModalOpen && <StudentModal onClose={() => setIsStudentModalOpen(false)} onSave={(s) => handleGenericSave(editingStudent ? 'updateStudent' : 'addStudent', s, setStudents)} studentToEdit={editingStudent} dormitories={settings.dormitories} studentClasses={settings.studentClasses} studentClassrooms={settings.studentClassrooms} personnel={personnel} isSaving={isSaving} />}
            {isPersonnelModalOpen && <PersonnelModal onClose={() => setIsPersonnelModalOpen(false)} onSave={(p) => handleGenericSave(editingPersonnel ? 'updatePersonnel' : 'addPersonnel', p, setPersonnel)} personnelToEdit={editingPersonnel} positions={settings.positions} students={students} isSaving={isSaving} currentUserRole={currentUser?.role} currentUser={currentUser} />}
            {viewingReport && <ViewReportModal report={viewingReport} onClose={() => setViewingReport(null)} students={students} />}
            {viewingStudent && <ViewStudentModal student={viewingStudent} onClose={() => setViewingStudent(null)} personnel={personnel} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} />}
            {viewingPersonnel && <ViewPersonnelModal personnel={viewingPersonnel} onClose={() => setViewingPersonnel(null)} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} />}
        </div>
    );
};

export default App;
