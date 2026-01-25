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
import WorkflowPage from './components/WorkflowPage';
import AchievementPage from './components/AchievementPage';
import AIChatPopup from './components/AIChatPopup'; // New Import
import LoadingModal from './components/LoadingModal'; // New Import

import { Report, Student, Personnel, Settings, StudentAttendance, PersonnelAttendance, Page, AcademicPlan, PlanStatus, SupplyItem, SupplyRequest, DurableGood, CertificateRequest, MaintenanceRequest, PerformanceReport, SARReport, Document, HomeVisit, ServiceRecord, ConstructionRecord, ProjectProposal, SDQRecord, MealPlan, Ingredient, DutyRecord, LeaveRecord, WorkflowDocument, CertificateProject, ProcurementRecord, Achievement } from './types';
import { DEFAULT_SETTINGS, DEFAULT_INGREDIENTS } from './constants';
import { prepareDataForApi, postToGoogleScript, isoToBuddhist, normalizeDate, safeParseArray, getCurrentThaiDate } from './utils';

// Helper for safe JSON parsing
const safeJsonParse = (input: any) => {
    if (typeof input === 'string') {
        try {
            return JSON.parse(input);
        } catch (e) {
            console.warn("Error parsing JSON:", input);
            return []; // Return empty array on failure
        }
    }
    return input;
};

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('stats');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Set to true initially for dashboard load
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
    const [procurementRecords, setProcurementRecords] = useState<ProcurementRecord[]>([]); // New State
    const [durableGoods, setDurableGoods] = useState<DurableGood[]>([]);
    const [certificateProjects, setCertificateProjects] = useState<CertificateProject[]>([]);
    const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
    const [performanceReports, setPerformanceReports] = useState<PerformanceReport[]>([]);
    const [salaryPromotionReports, setSalaryPromotionReports] = useState<PerformanceReport[]>([]);
    const [sarReports, setSarReports] = useState<SARReport[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
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
    const [showSyncToast, setShowSyncToast] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', settings.themeColors.primary);
        root.style.setProperty('--color-primary-hover', settings.themeColors.primaryHover);
        
        if (settings.autoHideSidebar) {
            setIsDesktopSidebarOpen(false);
        } else {
            setIsDesktopSidebarOpen(true);
        }
    }, [settings.themeColors, settings.autoHideSidebar]);
    
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

    useEffect(() => {
        if (!settings.autoHideSidebar) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (e.clientX <= 30) {
                setIsDesktopSidebarOpen(true);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [settings.autoHideSidebar]);

    const normalizeDateString = (dateInput: any): string => {
        if (!dateInput) return '';
        const d = normalizeDate(dateInput);
        if (!d) return String(dateInput).trim();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    };

    const fetchDashboardData = useCallback(async () => {
        if (!isAuthenticated) return;
        if (hasInitialData) { setIsLoading(false); return; } // Don't re-fetch initial data

        setIsLoading(true);
        setFetchError(null);
        
        try {
            const response = await postToGoogleScript({ action: 'getDashboardData' });
            const data = response.data || {};

            // PERSONNEL first to find current user
            let fetchedPersonnel: Personnel[] = (data.personnel || []).map((p: any) => {
                if (String(p.idCard).replace(/[^0-9]/g, '') === '1469900181659') {
                    return { ...p, role: 'admin' as const, status: 'approved' as const };
                }
                if (!p.status) p.status = 'approved';
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
            
            setReports((data.reports || []).map((r: any) => ({...r, reportDate: normalizeDateString(r.reportDate)})));
            setStudents(data.students || []);
            setStudentAttendance((data.studentAttendance || []).map((r: any) => ({ ...r, date: normalizeDateString(r.date) })));
            setPersonnelAttendance((data.personnelAttendance || []).map((r: any) => ({ ...r, date: normalizeDateString(r.date) })));
            setHomeVisits((data.homeVisits || []).map((v: any) => ({...v, date: normalizeDateString(v.date)})));

            if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            
            setHasInitialData(true);
            setFetchError(null);

        } catch (error: any) {
            console.error("Failed to fetch initial data:", error);
            setFetchError(error instanceof Error ? error.message : "Unknown network error");
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, hasInitialData, currentUser]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDashboardData();
        }
    }, [isAuthenticated, fetchDashboardData]);
    
    const fetchDataForPage = useCallback(async (page: Page) => {
        if (!isAuthenticated) return;

        const getActionAndSetter = () => {
            switch (page) {
                case 'students': return students.length === 0 ? { action: 'getStudents', setter: setStudents } : null;
                case 'personnel': return personnel.length === 0 ? { action: 'getPersonnel', setter: setPersonnel } : null;
                case 'reports': return reports.length === 0 ? { action: 'getReports', setter: setReports } : null;
                case 'attendance': case 'attendance_personnel':
                     return (studentAttendance.length === 0 || personnelAttendance.length === 0) 
                     ? { action: 'getAttendanceData', setter: (d: any) => { setStudentAttendance(d.studentAttendance || []); setPersonnelAttendance(d.personnelAttendance || []); } } : null;
                case 'personnel_duty': return dutyRecords.length === 0 ? { action: 'getDutyRecords', setter: setDutyRecords } : null;
                case 'personnel_leave': return leaveRecords.length === 0 ? { action: 'getLeaveRecords', setter: setLeaveRecords } : null;
                case 'personnel_achievements': return achievements.length === 0 ? { action: 'getAchievements', setter: setAchievements } : null;
                case 'academic_plans': return academicPlans.length === 0 ? { action: 'getAcademicPlans', setter: setAcademicPlans } : null;
                case 'academic_service': return serviceRecords.length === 0 ? { action: 'getServiceRecords', setter: setServiceRecords } : null;
                case 'finance_supplies': return procurementRecords.length === 0 ? { action: 'getSupplyRequests', setter: setProcurementRecords } : null;
                case 'finance_projects': return projectProposals.length === 0 ? { action: 'getProjectProposals', setter: setProjectProposals } : null;
                case 'durable_goods': return durableGoods.length === 0 ? { action: 'getDurableGoods', setter: setDurableGoods } : null;
                case 'personnel_report': return performanceReports.length === 0 ? { action: 'getPerformanceReports', setter: setPerformanceReports } : null;
                case 'personnel_salary_report': return salaryPromotionReports.length === 0 ? { action: 'getSalaryPromotionReports', setter: setSalaryPromotionReports } : null;
                case 'personnel_sar': return sarReports.length === 0 ? { action: 'getSarReports', setter: setSarReports } : null;
                case 'general_docs': return documents.length === 0 ? { action: 'getGeneralDocuments', setter: setDocuments } : null;
                case 'general_repair': return maintenanceRequests.length === 0 ? { action: 'getMaintenanceRequests', setter: setMaintenanceRequests } : null;
                case 'general_certs': return (certificateProjects.length === 0 || certificateRequests.length === 0) ? { action: 'getCertificateData', setter: (d: any) => { setCertificateProjects(d.projects || []); setCertificateRequests(d.requests || []); } } : null;
                case 'general_construction': return constructionRecords.length === 0 ? { action: 'getConstructionRecords', setter: setConstructionRecords } : null;
                case 'general_nutrition': return mealPlans.length === 0 ? { action: 'getNutritionData', setter: (d: any) => { setMealPlans(d.mealPlans || []); setIngredients(d.ingredients || DEFAULT_INGREDIENTS); } } : null;
                case 'student_home_visit': return homeVisits.length === 0 ? { action: 'getHomeVisits', setter: setHomeVisits } : null;
                case 'student_sdq': return sdqRecords.length === 0 ? { action: 'getSdqRecords', setter: setSdqRecords } : null;
                case 'workflow_docs': return workflowDocuments.length === 0 ? { action: 'getWorkflowDocs', setter: setWorkflowDocuments } : null;
                default: return null;
            }
        };

        const config = getActionAndSetter();
        if (!config) return;

        setIsLoading(true);
        try {
            const response = await postToGoogleScript({ action: config.action });
            if (response.data) {
                config.setter(response.data);
            }
        } catch (error) {
            console.error(`Failed to fetch data for ${page}:`, error);
            alert(`ไม่สามารถโหลดข้อมูลสำหรับหน้านี้ได้: ${error}`);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, students, personnel, reports, studentAttendance, personnelAttendance, dutyRecords, leaveRecords, achievements, academicPlans, serviceRecords, procurementRecords, projectProposals, durableGoods, performanceReports, salaryPromotionReports, sarReports, documents, maintenanceRequests, certificateProjects, certificateRequests, constructionRecords, mealPlans, homeVisits, sdqRecords, workflowDocuments]);


    const handleSaveAttendance = async (t: 'student' | 'personnel', d: any) => { 
        setIsSaving(true);
        try {
            const action = t === 'student' ? 'saveStudentAttendance' : 'savePersonnelAttendance';
            const response = await postToGoogleScript({ action, data: d });
            const savedRaw = Array.isArray(response.data) ? response.data : [response.data];
            const saved = savedRaw.map((r:any) => ({ ...r, date: normalizeDateString(r.date) }));
            
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
            return Promise.resolve(); 
        } catch(e) { 
            console.error(e); 
            return Promise.reject(e); 
        } finally { 
            setIsSaving(false); 
        }
    }; 
    
    const handleSaveAdminSettings = async (newSettings: Settings, redirect: boolean = true) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(newSettings);
            const response = await postToGoogleScript({ action: 'updateSettings', data: apiPayload });
            
            const savedSettings = { ...response.data };
            if (typeof savedSettings.autoHideSidebar === 'string') {
                savedSettings.autoHideSidebar = savedSettings.autoHideSidebar.toLowerCase() === 'true';
            }
            setSettings(savedSettings);
            
            if (redirect) { 
                setCurrentPage('stats'); 
                alert('บันทึกการตั้งค่าเรียบร้อยแล้ว'); 
            }
        } catch (error) { 
            console.error(error); 
            alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'); 
        } finally { 
            setIsSaving(false); 
        }
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

    const handleCloseReportModal = () => {
        setIsReportModalOpen(false);
        setEditingReport(null);
    };

    const handleSaveReport = async (report: Report) => { 
        setIsSaving(true);
        try {
            const isEditing = !!editingReport;
            const action = isEditing ? 'updateReport' : 'addReport';
            const apiPayload = await prepareDataForApi(report);
            const response = await postToGoogleScript({ action, data: apiPayload });
            const savedData = response.data;
            const normalize = (r: any) => ({
                ...r,
                reportDate: normalizeDateString(r.reportDate),
                studentDetails: (r.studentDetails && typeof r.studentDetails !== 'string') ? JSON.stringify(r.studentDetails) : r.studentDetails
            });
            
            let processed = Array.isArray(savedData) ? savedData : [savedData];
            if (isEditing) {
                setReports(prev => prev.map(r => String(r.id) === String(processed[0].id) ? normalize(processed[0]) : r));
            } else {
                setReports(prev => [...prev, ...processed.map(normalize)]);
            }
            handleCloseReportModal();
        } catch(e) { console.error(e); alert('Error saving report'); } finally { setIsSaving(false); }
    };

    const handleDeleteAttendance = async (t: 'student' | 'personnel', ids: string[]) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรายการนี้?')) return;
        try {
            const action = t === 'student' ? 'deleteStudentAttendance' : 'deletePersonnelAttendance';
            await postToGoogleScript({ action, ids });
            if(t === 'student') {
                setStudentAttendance(prev => prev.filter(r => !ids.includes(String(r.id))));
            } else {
                setPersonnelAttendance(prev => prev.filter(r => !ids.includes(String(r.id))));
            }
            alert('ลบข้อมูลเรียบร้อย');
        } catch(e) {
            alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    };

    const handleGenericSave = async (action: string, data: any, setter: any) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(data);
            const response = await postToGoogleScript({ action, data: apiPayload });
            const responseData = response.data;
            
            const items = Array.isArray(responseData) ? responseData : [responseData];
            
            const processedItems = items.map((saved: any) => {
                if (!saved) return null;
                const newSaved = { ...saved };
                 if (action === 'saveLeaveRecord' || action === 'saveDutyRecord' || action === 'saveAchievement') {
                    newSaved.date = normalizeDateString(newSaved.date);
                    if (newSaved.startDate) newSaved.startDate = normalizeDateString(newSaved.startDate);
                    if (newSaved.endDate) newSaved.endDate = normalizeDateString(newSaved.endDate);
                } else if (action === 'savePerformanceReport' || action === 'saveSARReport' || action === 'saveSalaryPromotionReport') {
                    newSaved.submissionDate = normalizeDateString(newSaved.submissionDate);
                    if (newSaved.academicYear) {
                        newSaved.academicYear = String(newSaved.academicYear);
                    }
                }
                if (action === 'saveSupplyRequest') {
                    newSaved.items = safeJsonParse(newSaved.items) || [];
                }
                return newSaved;
            }).filter(Boolean); // Filter out any null items

            setter((prev: any[]) => {
                let newPrev = [...prev];
                processedItems.forEach((saved: any) => {
                    const index = newPrev.findIndex(item => String(item.id) === String(saved.id));
                    if (index >= 0) { 
                        newPrev[index] = saved; 
                    } else {
                        newPrev.push(saved);
                    }
                });
                return newPrev;
            });
            // Removed alert from generic save to allow specific alerts in components
            return true;
        } catch(e: any) { 
            console.error("Generic Save Error:", e); 
            const errorMessage = e.message || 'Unknown error';
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล:\n' + errorMessage + '\n\nอาจเกิดจากไฟล์ขนาดใหญ่หรือการเชื่อมต่ออินเทอร์เน็ตมีปัญหา กรุณาลองใหม่อีกครั้ง'); 
            return false;
        } finally { setIsSaving(false); }
    };

    const handleGenericDelete = async (action: string, ids: number[], setter: any) => {
        try { 
            await postToGoogleScript({ action, ids }); 
            setter((prev: any[]) => prev.filter(i => !ids.map(String).includes(String(i.id)))); 
            alert('ลบเรียบร้อย'); 
        } catch(e) { alert('Error deleting'); }
    };

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
                    <button onClick={() => fetchDashboardData()} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow shadow-blue-200 transition">
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            )
        }

        if (isLoading) {
            return (
                <div className="flex flex-col justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-blue mb-4"></div>
                    <p className="text-lg text-secondary-gray font-medium">กำลังโหลดข้อมูลหน้า...</p>
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
            case 'attendance':
                return <AttendancePage mode="student" students={students} personnel={personnel} studentAttendance={studentAttendance} personnelAttendance={personnelAttendance} onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)} onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)} onDeleteAttendance={(type, ids) => handleDeleteAttendance(type, ids)} isSaving={isSaving} currentUser={currentUser} settings={settings} onRefresh={() => fetchDataForPage('attendance')} />;
            case 'attendance_personnel':
                return <AttendancePage mode="personnel" students={students} personnel={personnel} studentAttendance={studentAttendance} personnelAttendance={personnelAttendance} onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)} onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)} onDeleteAttendance={(type, ids) => handleDeleteAttendance(type, ids)} isSaving={isSaving} currentUser={currentUser} settings={settings} onRefresh={() => fetchDataForPage('attendance_personnel')} />;
            case 'reports':
                return <ReportPage reports={reports} deleteReports={(ids) => handleGenericDelete('deleteReports', ids, setReports)} onViewReport={(r) => setViewingReport(r)} onEditReport={(r) => { setEditingReport(r); setIsReportModalOpen(true); }} onAddReport={() => { setEditingReport(null); setIsReportModalOpen(true); }} />;
            case 'students':
                return <StudentPage students={students} dormitories={settings.dormitories} studentClasses={settings.studentClasses} studentClassrooms={settings.studentClassrooms} onAddStudent={() => { setEditingStudent(null); setIsStudentModalOpen(true); }} onEditStudent={(s) => { setEditingStudent(s); setIsStudentModalOpen(true); }} onViewStudent={(s) => setViewingStudent(s)} onDeleteStudents={(ids) => handleGenericDelete('deleteStudents', ids, setStudents)} />;
            case 'personnel':
                return <PersonnelPage personnel={personnel} positions={settings.positions} onAddPersonnel={() => { setEditingPersonnel(null); setIsPersonnelModalOpen(true); }} onEditPersonnel={(p) => { setEditingPersonnel(p); setIsPersonnelModalOpen(true); }} onViewPersonnel={(p) => setViewingPersonnel(p)} onDeletePersonnel={(ids) => handleGenericDelete('deletePersonnel', ids, setPersonnel)} currentUser={currentUser} />;
            case 'admin':
                return <AdminDashboard settings={settings} onSave={handleSaveAdminSettings} onExit={() => setCurrentPage('stats')} isSaving={isSaving} />
            case 'profile':
                return currentUser ? (
                    <ProfilePage user={currentUser} onSave={(p) => handleGenericSave('updatePersonnel', p, setPersonnel)} isSaving={isSaving} />
                ) : null;
            case 'academic_plans':
                return currentUser ? (
                    <AcademicPage currentUser={currentUser} personnel={personnel} plans={academicPlans} onSavePlan={(p) => handleGenericSave('saveAcademicPlan', p, setAcademicPlans)} onUpdateStatus={async (id, status, comment) => { await postToGoogleScript({ action: 'updateAcademicPlanStatus', data: { id, status, comment, approverName: currentUser?.personnelName, approvedDate: getCurrentThaiDate() } }); setAcademicPlans(prev => prev.map(p => String(p.id) === String(id) ? { ...p, status, comment } : p)); }} isSaving={isSaving} />
                ) : null;
            case 'academic_service': 
                return currentUser ? (
                    <ServiceRegistrationPage currentUser={currentUser} students={students} personnel={personnel} records={serviceRecords} onSaveRecord={(r) => handleGenericSave('saveServiceRecord', r, setServiceRecords)} onDeleteRecord={(ids) => handleGenericDelete('deleteServiceRecords', ids, setServiceRecords)} serviceLocations={settings.serviceLocations || []} onUpdateLocations={async (locations) => { const newSettings = { ...settings, serviceLocations: locations }; await handleSaveAdminSettings(newSettings, false); }} isSaving={isSaving} />
                ) : null;
            case 'finance_supplies':
                return currentUser ? (
                    <SupplyPage 
                        currentUser={currentUser} 
                        personnel={personnel} 
                        records={procurementRecords}
                        onSaveRecord={(r) => handleGenericSave('saveSupplyRequest', r, setProcurementRecords)}
                        onDeleteRecord={(ids) => handleGenericDelete('deleteSupplyRequests', ids, setProcurementRecords)}
                        settings={settings} 
                        onSaveSettings={(s) => handleSaveAdminSettings(s, false)} 
                        isSaving={isSaving}
                    />
                ) : null;
            case 'finance_projects': 
                return currentUser ? (
                    <BudgetPlanningPage currentUser={currentUser} proposals={projectProposals} personnel={personnel} settings={settings} onSave={(p) => handleGenericSave('saveProjectProposal', p, setProjectProposals)} onDelete={(ids) => handleGenericDelete('deleteProjectProposals', ids, setProjectProposals)} onUpdateSettings={(s) => handleSaveAdminSettings(s, false)} onUpdatePersonnel={(p) => handleGenericSave('updatePersonnel', p, setPersonnel)} isSaving={isSaving} />
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
                        onSaveSettings={(s) => handleSaveAdminSettings(s, false)}
                    />
                ) : null;
            case 'general_docs': 
                return currentUser ? (
                    <GeneralDocsPage currentUser={currentUser} personnel={personnel} documents={documents} onSave={(d) => handleGenericSave('saveDocument', d, setDocuments)} onDelete={(ids) => handleGenericDelete('deleteDocuments', ids, setDocuments)} isSaving={isSaving} />
                ) : null;
            case 'general_repair':
                return currentUser ? (
                    <MaintenancePage currentUser={currentUser} requests={maintenanceRequests} onSave={(r) => handleGenericSave('saveMaintenanceRequest', r, setMaintenanceRequests)} onDelete={(ids) => handleGenericDelete('deleteMaintenanceRequests', ids, setMaintenanceRequests)} isSaving={isSaving} />
                ) : null;
            case 'general_construction': 
                return currentUser ? (
                    <ConstructionPage currentUser={currentUser} records={constructionRecords} onSave={(r) => handleGenericSave('saveConstructionRecord', r, setConstructionRecords)} onDelete={(ids) => handleGenericDelete('deleteConstructionRecords', ids, setConstructionRecords)} isSaving={isSaving} personnel={personnel} />
                ) : null;
            case 'general_nutrition':
                return currentUser ? (
                    <NutritionPage currentUser={currentUser} mealPlans={mealPlans} ingredients={ingredients} onSaveMealPlan={(mp) => handleGenericSave('saveMealPlan', mp, setMealPlans)} onDeleteMealPlan={(ids) => handleGenericDelete('deleteMealPlans', ids, setMealPlans)} onSaveIngredient={(ing) => handleGenericSave('saveIngredient', ing, setIngredients)} onDeleteIngredient={(ids) => handleGenericDelete('deleteIngredients', ids, setIngredients)} isSaving={isSaving} students={students} />
                ) : null;
            case 'general_certs': 
                return currentUser ? (
                    <CertificatePage currentUser={currentUser} projects={certificateProjects} requests={certificateRequests} onSaveProject={(p) => handleGenericSave('saveCertificateProject', p, setCertificateProjects)} onDeleteProject={(ids) => handleGenericDelete('deleteCertificateProjects', ids, setCertificateProjects)} onSaveRequest={(r) => handleGenericSave('saveCertificateRequest', r, setCertificateRequests)} onDeleteRequest={(ids) => handleGenericDelete('deleteCertificateRequests', ids, setCertificateRequests)} isSaving={isSaving} settings={settings} />
                ) : null;
            case 'student_home_visit':
                return currentUser ? (
                    <StudentHomeVisitPage currentUser={currentUser} students={students} visits={homeVisits} onSave={(v) => handleGenericSave('saveHomeVisit', v, setHomeVisits)} studentClasses={settings.studentClasses} studentClassrooms={settings.studentClassrooms} academicYears={settings.academicYears} isSaving={isSaving} />
                ) : null;
            case 'student_sdq':
                return currentUser ? (
                    <SDQPage currentUser={currentUser} students={students} records={sdqRecords} onSave={(r) => handleGenericSave('saveSDQRecord', r, setSdqRecords)} onDelete={(ids) => handleGenericDelete('deleteSDQRecords', ids, setSdqRecords)} academicYears={settings.academicYears} isSaving={isSaving} studentClasses={settings.studentClasses} studentClassrooms={settings.studentClassrooms} />
                ) : null;
            case 'personnel_report':
                return currentUser ? (
                    <PersonnelReportPage
                        mode="pa" 
                        currentUser={currentUser} 
                        personnel={personnel} 
                        reports={performanceReports} 
                        onSave={(r) => handleGenericSave('savePerformanceReport', r, setPerformanceReports)} 
                        onDelete={(ids) => handleGenericDelete('deletePerformanceReports', ids, setPerformanceReports)} 
                        academicYears={settings.academicYears} 
                        isSaving={isSaving} 
                        settings={settings}
                        onSaveSettings={(s) => handleSaveAdminSettings(s, false)}
                    />
                ) : null;
            case 'personnel_salary_report':
                return currentUser ? (
                    <PersonnelReportPage
                        mode="salary_promotion"
                        currentUser={currentUser} 
                        personnel={personnel} 
                        reports={salaryPromotionReports} 
                        onSave={(r) => handleGenericSave('saveSalaryPromotionReport', r, setSalaryPromotionReports)} 
                        onDelete={(ids) => handleGenericDelete('deleteSalaryPromotionReports', ids, setSalaryPromotionReports)} 
                        academicYears={settings.academicYears} 
                        isSaving={isSaving} 
                        settings={settings}
                        onSaveSettings={(s) => handleSaveAdminSettings(s, false)}
                    />
                ) : null;
            case 'personnel_sar': 
                return currentUser ? (
                    <PersonnelSARPage currentUser={currentUser} personnel={personnel} reports={sarReports} onSave={(r) => handleGenericSave('saveSARReport', r, setSarReports)} onDelete={(ids) => handleGenericDelete('deleteSARReports', ids, setSarReports)} academicYears={settings.academicYears} positions={settings.positions} isSaving={isSaving} settings={settings} />
                ) : null;
             case 'personnel_achievements':
                return currentUser ? (
                    <AchievementPage
                        currentUser={currentUser}
                        personnel={personnel}
                        achievements={achievements}
                        onSave={(a) => handleGenericSave('saveAchievement', a, setAchievements)}
                        onDelete={(ids) => handleGenericDelete('deleteAchievements', ids, setAchievements)}
                        isSaving={isSaving}
                        academicYears={settings.academicYears}
                    />
                ) : null;
            case 'personnel_duty':
                return currentUser ? (
                    <DutyPage currentUser={currentUser} records={dutyRecords} onSave={(r) => handleGenericSave('saveDutyRecord', r, setDutyRecords)} onDelete={(ids) => handleGenericDelete('deleteDutyRecords', ids, setDutyRecords)} settings={settings} onSaveSettings={(s) => handleSaveAdminSettings(s, false)} isSaving={isSaving} />
                ) : null;
            case 'personnel_leave':
                return currentUser ? (
                    <LeavePage currentUser={currentUser} records={leaveRecords} onSave={(r) => handleGenericSave('saveLeaveRecord', r, setLeaveRecords)} onDelete={(ids) => handleGenericDelete('deleteLeaveRecords', ids, setLeaveRecords)} settings={settings} onSaveSettings={(s) => handleSaveAdminSettings(s, false)} isSaving={isSaving} personnel={personnel} />
                ) : null;
            case 'workflow_docs':
                return currentUser ? (
                    <WorkflowPage currentUser={currentUser} personnel={personnel} documents={workflowDocuments} onSave={(d) => handleGenericSave('saveWorkflowDoc', d, setWorkflowDocuments)} onDelete={(ids) => handleGenericDelete('deleteWorkflowDocs', ids, setWorkflowDocuments)} isSaving={isSaving} />
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

    const navigateTo = async (page: Page) => {
        if (page === 'admin' && currentUser?.role !== 'admin') {
            alert('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
            return;
        }

        // Fetch data for the new page if it's not already loaded
        await fetchDataForPage(page);

        setCurrentPage(page);
        setIsSidebarOpen(false); 
        if (settings.autoHideSidebar) {
            setIsDesktopSidebarOpen(false);
        }
    };

    const handleSidebarMouseEnter = () => {
        if (settings.autoHideSidebar) {
            setIsDesktopSidebarOpen(true);
        }
    };

    const handleSidebarMouseLeave = () => {
        if (settings.autoHideSidebar) {
            setIsDesktopSidebarOpen(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F3F4F6] font-sarabun text-navy">
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
                onMouseEnter={handleSidebarMouseEnter}
                onMouseLeave={handleSidebarMouseLeave}
            />
            <div className={`flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
                <header className="no-print">
                <Header onReportClick={() => setIsReportModalOpen(true)} onNavigate={navigateTo} currentPage={currentPage} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} currentUser={currentUser} onLoginClick={() => setIsLoginModalOpen(true)} onLogoutClick={handleLogout} personnel={personnel} onToggleSidebar={() => setIsSidebarOpen(true)} isDesktopSidebarOpen={isDesktopSidebarOpen} onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} isSyncing={isSyncing} />
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
                    <div className="max-w-7xl mx-auto">{renderPage()}</div>
                    <div className="h-10"></div> 
                    <Footer />
                </main>
                <AIChatPopup 
                    currentUser={currentUser}
                    students={students} 
                    personnel={personnel} 
                    reports={reports} 
                    settings={settings} 
                    studentAttendance={studentAttendance} 
                />
            </div>
            {showSyncToast && (
                <div className="fixed bottom-20 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in-up z-[1200] border-2 border-white/50">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span className="font-bold text-sm">ข้อมูลได้รับการอัปเดตแล้ว</span>
                </div>
            )}
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleSessionLogin} personnelList={personnel} onRegisterClick={() => { setIsLoginModalOpen(false); setIsRegisterModalOpen(true); }} />
            <RegisterModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} onRegister={async (p) => { 
                const success = await handleGenericSave('addPersonnel', p, setPersonnel); 
                if (success) { 
                    setIsRegisterModalOpen(false); 
                    alert('ลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติ'); 
                } 
            }} positions={settings.positions} isSaving={isSaving} />
            {isReportModalOpen && (
                <ReportModal onClose={handleCloseReportModal} onSave={handleSaveReport} reportToEdit={editingReport} academicYears={settings.academicYears} dormitories={settings.dormitories} positions={settings.positions} isSaving={isSaving} personnel={personnel} currentUser={currentUser} students={students} />
            )}
            {viewingReport && <ViewReportModal report={viewingReport} onClose={() => setViewingReport(null)} students={students} />}
            {isStudentModalOpen && (
                <StudentModal 
                    onClose={() => setIsStudentModalOpen(false)} 
                    onSave={async (s) => { 
                        const success = await handleGenericSave(editingStudent ? 'updateStudent' : 'addStudent', s, setStudents);
                        if (success) setIsStudentModalOpen(false);
                    }} 
                    studentToEdit={editingStudent} 
                    dormitories={settings.dormitories} 
                    studentClasses={settings.studentClasses} 
                    studentClassrooms={settings.studentClassrooms} 
                    personnel={personnel} 
                    isSaving={isSaving} 
                />
            )}
            {viewingStudent && <ViewStudentModal student={viewingStudent} onClose={() => setViewingStudent(null)} personnel={personnel} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} currentUser={currentUser} />}
            {isPersonnelModalOpen && (
                <PersonnelModal onClose={() => setIsPersonnelModalOpen(false)} onSave={async (p) => { 
                    const success = await handleGenericSave(editingPersonnel ? 'updatePersonnel' : 'addPersonnel', p, setPersonnel); 
                    if (success) setIsPersonnelModalOpen(false); 
                }} personnelToEdit={editingPersonnel} positions={settings.positions} students={students} isSaving={isSaving} currentUserRole={currentUser?.role} currentUser={currentUser} settings={settings} />
            )}
            {viewingPersonnel && (
                <ViewPersonnelModal 
                    personnel={viewingPersonnel} 
                    onClose={() => setViewingPersonnel(null)} 
                    schoolName={settings.schoolName} 
                    schoolLogo={settings.schoolLogo} 
                    currentUser={currentUser}
                    students={students}
                    leaveRecords={leaveRecords}
                    performanceReports={[...performanceReports, ...salaryPromotionReports]}
                    sarReports={sarReports}
                    academicPlans={academicPlans}
                    achievements={achievements}
                    academicYears={settings.academicYears}
                />
            )}
            <LoadingModal isOpen={isSaving} />
        </div>
    );
};

export default App;