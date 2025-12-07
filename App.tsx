
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
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
import ServiceRegistrationPage from './components/ServiceRegistrationPage'; 
import ConstructionPage from './components/ConstructionPage';
import BudgetPlanningPage from './components/BudgetPlanningPage';
import LandingPage from './components/LandingPage';

import { Report, Student, Personnel, Settings, StudentAttendance, PersonnelAttendance, Page, AcademicPlan, PlanStatus, SupplyItem, SupplyRequest, DurableGood, CertificateRequest, MaintenanceRequest, PerformanceReport, SARReport, Document, HomeVisit, ServiceRecord, ConstructionRecord, ProjectProposal } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { prepareDataForApi, postToGoogleScript } from './utils';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('stats');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Initially false, we wait for login
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Report states
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [viewingReport, setViewingReport] = useState<Report | null>(null);
    const [editingReport, setEditingReport] = useState<Report | null>(null);

    // Student states
    const [students, setStudents] = useState<Student[]>([]);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    
    // Personnel states
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [viewingPersonnel, setViewingPersonnel] = useState<Personnel | null>(null);
    const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

    // Attendance states
    const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>([]);
    const [personnelAttendance, setPersonnelAttendance] = useState<PersonnelAttendance[]>([]);

    // Academic Plan state
    const [academicPlans, setAcademicPlans] = useState<AcademicPlan[]>([]);

    // Supply State
    const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
    const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);

    // Durable Goods State
    const [durableGoods, setDurableGoods] = useState<DurableGood[]>([]);

    // Certificate Requests State
    const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);

    // Maintenance Requests State
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);

    // Personnel Performance Reports State
    const [performanceReports, setPerformanceReports] = useState<PerformanceReport[]>([]);

    // SAR Reports State
    const [sarReports, setSarReports] = useState<SARReport[]>([]);

    // General Documents State
    const [documents, setDocuments] = useState<Document[]>([]);

    // Home Visit State (New)
    const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);

    // Service Registration State (New)
    const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);

    // Construction Records State (New)
    const [constructionRecords, setConstructionRecords] = useState<ConstructionRecord[]>([]);

    // Project Proposals (New)
    const [projectProposals, setProjectProposals] = useState<ProjectProposal[]>([]);

    // Admin state
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

    // Auth State
    const [currentUser, setCurrentUser] = useState<Personnel | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', settings.themeColors.primary);
        root.style.setProperty('--color-primary-hover', settings.themeColors.primaryHover);
    }, [settings.themeColors]);
    
    // Auth Check on Mount
    useEffect(() => {
        const storedUser = localStorage.getItem('ksp_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.idCard && String(user.idCard).replace(/[^0-9]/g, '') === '1469900181659') {
                    user.role = 'admin';
                }
                setCurrentUser(user);
                setIsAuthenticated(true);
            } catch (e) {
                localStorage.removeItem('ksp_user');
                setIsAuthenticated(false);
            }
        } else {
            setIsAuthenticated(false);
        }
    }, []);

    // Fetch Data ONLY if authenticated
    const fetchData = useCallback(async (isBackground: boolean = false) => {
        if (!isAuthenticated) return;

        // Only show loading spinner on initial load or manual refresh
        if (!isBackground) {
            setIsLoading(true);
            setFetchError(null);
        }
        
        try {
            // postToGoogleScript now handles auth injection from localStorage inside utils.ts
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
            setStudentAttendance(data.studentAttendance || []);
            setPersonnelAttendance(data.personnelAttendance || []);
            setAcademicPlans(data.academicPlans || []);
            setSupplyItems(data.supplyItems || []);
            setSupplyRequests(data.supplyRequests || []);
            setDurableGoods(data.durableGoods || []); 
            setCertificateRequests(data.certificateRequests || []); 
            setMaintenanceRequests(data.maintenanceRequests || []);
            setPerformanceReports(data.performanceReports || []);
            setSarReports(data.sarReports || []);
            setDocuments(data.documents || []); 
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

            if (data.settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            }

        } catch (error: any) {
            console.error("Failed to fetch data from Google Script:", error);
            if (!isBackground) {
                // If error is authentication related, logout
                if (error.message && (error.message.includes("Unauthorized") || error.message.includes("Session expired"))) {
                    handleLogout();
                    alert("เซสชั่นหมดอายุหรือไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่");
                } else {
                    setFetchError(error instanceof Error ? error.message : "Unknown error occurred");
                }
            }
        } finally {
            if (!isBackground) {
                setIsLoading(false);
            }
        }
    }, [isAuthenticated]);

    // Check if any critical modal is open to pause polling
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
        // Only fetch if authenticated
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
            const savedSettings = response.data;
            
            setSettings(savedSettings);
            
            if (redirect) {
                setCurrentPage('stats');
                alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
            }
        } catch (error) {
            console.error("Could not save settings to Google Script", error);
            alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateServiceLocations = async (locations: string[]) => {
        setIsSaving(true);
        try {
            const newSettings = { ...settings, serviceLocations: locations };
            const apiPayload = await prepareDataForApi(newSettings);
            const response = await postToGoogleScript({ action: 'updateSettings', data: apiPayload });
            setSettings(response.data);
        } catch (error) {
            console.error("Could not update locations", error);
            alert('เกิดข้อผิดพลาดในการบันทึกสถานที่');
        } finally {
            setIsSaving(false);
        }
    };

    // --- AUTH Handlers ---

    // Called from LandingPage
    const handleLoginSuccess = (user: Personnel) => {
        // Add Admin bypass check
        const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
        if (normalizeId(user.idCard) === '1469900181659') {
            user.role = 'admin';
        }
        
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('ksp_user', JSON.stringify(user));
    };

    // Called from LoginModal (Session refresh / switch user)
    const handleSessionLogin = (user: Personnel, rememberMe: boolean) => {
        const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
        if (normalizeId(user.idCard) === '1469900181659') {
            user.role = 'admin';
        }

        setCurrentUser(user);
        if (rememberMe) {
            localStorage.setItem('ksp_user', JSON.stringify(user));
        }
        // Note: We don't remove item if not rememberMe, to keep session active until browser close
        // But for explicit logout we do.
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('ksp_user');
        setCurrentPage('stats');
        setReports([]); // Clear sensitive data
        setStudents([]);
        setPersonnel([]);
    };

    const handleRegister = async (newPersonnel: Personnel) => {
        await handleSavePersonnel(newPersonnel);
        setIsRegisterModalOpen(false);
    };


    // Report handlers (unchanged) ...
    const handleOpenReportModal = () => {
      setEditingReport(null);
      setIsReportModalOpen(true);
    };
    const handleCloseReportModal = () => {
      setIsReportModalOpen(false);
      setEditingReport(null);
    };
    const handleViewReport = (report: Report) => setViewingReport(report);
    const handleCloseViewReportModal = () => setViewingReport(null);
    const handleEditReport = (report: Report) => {
        setEditingReport(report);
        setIsReportModalOpen(true);
    };
    const handleSaveReport = async (report: Report) => {
        setIsSaving(true);
        try {
            const isEditing = !!editingReport;
            const action = isEditing ? 'updateReport' : 'addReport';
            const apiPayload = await prepareDataForApi(report);
            
            const response = await postToGoogleScript({ action, data: apiPayload });
            const savedData = response.data;

            const normalizeReport = (r: any) => {
                 if (r.studentDetails && typeof r.studentDetails !== 'string') {
                    return { ...r, studentDetails: JSON.stringify(r.studentDetails) };
                 }
                 return r;
            };

            let processedData = savedData;
            if (Array.isArray(savedData) && savedData.length === 1 && reports.length > 1) {
                 processedData = savedData[0];
            }
            
            if (Array.isArray(processedData)) {
                setReports(processedData.map(normalizeReport));
            } else {
                 const normalizedSingle = normalizeReport(processedData);
                 if (isEditing) {
                    setReports(prev => prev.map(r => String(r.id) === String(normalizedSingle.id) ? normalizedSingle : r));
                } else {
                    setReports(prev => [...prev, normalizedSingle]);
                }
            }
            handleCloseReportModal();
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการบันทึกรายงาน');
        } finally {
            setIsSaving(false);
        }
    };
    const deleteReports = async (ids: number[]) => {
      try {
        await postToGoogleScript({ action: 'deleteReports', ids });
        setReports(prev => prev.filter(r => !ids.includes(r.id)));
      } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการลบรายงาน');
      }
    };

    // Student handlers (unchanged) ...
    const handleOpenStudentModal = () => {
        setEditingStudent(null);
        setIsStudentModalOpen(true);
    };
    const handleCloseStudentModal = () => {
        setIsStudentModalOpen(false);
        setEditingStudent(null);
    };
    const handleViewStudent = (student: Student) => setViewingStudent(student);
    const handleCloseViewStudentModal = () => setViewingStudent(null);
    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
        setIsStudentModalOpen(true);
    };
    const handleSaveStudent = async (student: Student) => {
        setIsSaving(true);
        try {
            const isEditing = !!editingStudent;
            const action = isEditing ? 'updateStudent' : 'addStudent';
            const apiPayload = await prepareDataForApi(student);
            
            const response = await postToGoogleScript({ action, data: apiPayload });
            const savedData = response.data;

             let processedData = savedData;
             if (Array.isArray(savedData) && savedData.length === 1 && students.length > 1) {
                  processedData = savedData[0];
             }

             if (Array.isArray(processedData)) {
                 setStudents(processedData);
             } else {
                if (isEditing) {
                    setStudents(prev => prev.map(s => String(s.id) === String(processedData.id) ? processedData : s));
                } else {
                    setStudents(prev => [...prev, processedData]);
                }
            }
            handleCloseStudentModal();
        } catch (error) {
             console.error(error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลนักเรียน');
        } finally {
            setIsSaving(false);
        }
    };
    const deleteStudents = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteStudents', ids });
            setStudents(prev => prev.filter(s => !ids.includes(s.id)));
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการลบข้อมูลนักเรียน');
        }
    };

    // Personnel handlers
    const handleOpenPersonnelModal = () => {
        setEditingPersonnel(null);
        setIsPersonnelModalOpen(true);
    };
    const handleClosePersonnelModal = () => {
        setIsPersonnelModalOpen(false);
        setEditingPersonnel(null);
    };
    const handleViewPersonnel = (person: Personnel) => setViewingPersonnel(person);
    const handleCloseViewPersonnelModal = () => setViewingPersonnel(null);
    const handleEditPersonnel = (person: Personnel) => {
        setEditingPersonnel(person);
        setIsPersonnelModalOpen(true);
    };
    const handleSavePersonnel = async (person: Personnel) => {
        setIsSaving(true);
        try {
            const isEditing = personnel.some(p => p.id === person.id);
            const action = isEditing ? 'updatePersonnel' : 'addPersonnel';
            const apiPayload = await prepareDataForApi(person);
            
            const response = await postToGoogleScript({ action, data: apiPayload });
            const savedData = response.data;

            let processedData = savedData;
            if (Array.isArray(savedData) && savedData.length === 1 && personnel.length > 1) {
                 processedData = savedData[0];
            }

            if (!Array.isArray(processedData) && person.password) {
                 if (!processedData.password || processedData.password !== person.password) {
                     processedData = { ...processedData, password: person.password };
                 }
            }

            const processPerson = (p: Personnel) => {
                const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
                if (normalizeId(p.idCard) === '1469900181659') {
                    return { ...p, role: 'admin' as const, status: 'approved' as const };
                }
                if (!p.status) p.status = 'approved'; 
                return p;
            };

            if (Array.isArray(processedData)) {
                setPersonnel(processedData.map(processPerson));
            } else {
                const finalPerson = processPerson(processedData);

                if (isEditing) {
                    setPersonnel(prev => prev.map(p => String(p.id) === String(finalPerson.id) ? finalPerson : p));
                    if (currentUser && String(currentUser.id) === String(finalPerson.id)) {
                         setCurrentUser(finalPerson);
                         if (localStorage.getItem('ksp_user')) {
                             localStorage.setItem('ksp_user', JSON.stringify(finalPerson));
                         }
                    }

                } else {
                    setPersonnel(prev => [...prev, finalPerson]);
                }
            }
            handleClosePersonnelModal();
        } catch (error) {
             console.error(error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลบุคลากร');
        } finally {
            setIsSaving(false);
        }
    };
    const deletePersonnel = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deletePersonnel', ids });
            setPersonnel(prev => prev.filter(p => !ids.includes(p.id)));
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการลบข้อมูลบุคลากร');
        }
    };

    const handleSaveAttendance = async (
        type: 'student' | 'personnel', 
        newData: (StudentAttendance | PersonnelAttendance)[]
    ) => {
        const currentRecordsMap = new Map<string, StudentAttendance | PersonnelAttendance>(
            (type === 'student' ? studentAttendance : personnelAttendance)
            .map(r => [r.id, r] as [string, StudentAttendance | PersonnelAttendance])
        );

        const changedRecords = newData.filter(newRecord => {
            const oldRecord = currentRecordsMap.get(newRecord.id);
            if (!oldRecord) return true;
            if (oldRecord.status !== newRecord.status) return true;
            if (type === 'personnel' && (oldRecord as PersonnelAttendance).dressCode !== (newRecord as PersonnelAttendance).dressCode) return true;
            return false;
        });

        if (changedRecords.length === 0) return; 

        setIsSaving(true);
        try {
            const action = type === 'student' ? 'saveStudentAttendance' : 'savePersonnelAttendance';
            const response = await postToGoogleScript({ action, data: changedRecords });
            const savedData = response.data;

            if (type === 'student') {
                setStudentAttendance(prev => {
                    const ids = new Set(savedData.map((d: any) => d.id));
                    const filtered = prev.filter(r => !ids.has(r.id));
                    return [...filtered, ...savedData];
                });
            } else {
                setPersonnelAttendance(prev => {
                    const ids = new Set(savedData.map((d: any) => d.id));
                    const filtered = prev.filter(r => !ids.has(r.id));
                    return [...filtered, ...savedData];
                });
            }
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : `เกิดข้อผิดพลาดในการบันทึกการเช็คชื่อ${type === 'student' ? 'นักเรียน' : 'บุคลากร'}`;
            alert(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAcademicPlan = async (plan: AcademicPlan) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(plan);
            const response = await postToGoogleScript({ action: 'saveAcademicPlan', data: apiPayload });
            const savedPlan = response.data;

            if (Array.isArray(savedPlan)) {
                setAcademicPlans(savedPlan);
            } else {
                setAcademicPlans(prev => [...prev, savedPlan]);
            }
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการบันทึกแผนการสอน');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateAcademicPlanStatus = async (id: number, status: PlanStatus, comment?: string) => {
        setIsSaving(true);
        try {
            const response = await postToGoogleScript({ 
                action: 'updateAcademicPlanStatus', 
                data: { id, status, comment, approverName: currentUser?.personnelName, approvedDate: new Date().toLocaleDateString('th-TH') } 
            });
            
            setAcademicPlans(prev => prev.map(p => p.id === id ? { ...p, status, comment } : p));
            alert('อัปเดตสถานะเรียบร้อย');
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProjectProposal = async (proposal: ProjectProposal) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(proposal);
            const response = await postToGoogleScript({ action: 'saveProjectProposal', data: apiPayload });
            const savedProposal = response.data;
            
            setProjectProposals(prev => {
                const index = prev.findIndex(p => p.id === savedProposal.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedProposal;
                    return newList;
                }
                return [...prev, savedProposal];
            });
            alert('บันทึกโครงการเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึกโครงการ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProjectProposal = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteProjectProposals', ids });
            setProjectProposals(prev => prev.filter(p => !ids.includes(p.id)));
            alert('ลบโครงการเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleSaveServiceRecord = async (record: ServiceRecord) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(record);
            const response = await postToGoogleScript({ action: 'saveServiceRecord', data: apiPayload });
            const savedRecord = response.data;
            
            setServiceRecords(prev => {
                const index = prev.findIndex(r => r.id === savedRecord.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedRecord;
                    return newList;
                }
                return [...prev, savedRecord];
            });
            alert('บันทึกการใช้บริการเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteServiceRecord = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteServiceRecords', ids });
            setServiceRecords(prev => prev.filter(r => !ids.includes(r.id)));
            alert('ลบรายการเรียบร้อย');
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleUpdateSupplyItems = async (newItems: SupplyItem[]) => {
        setSupplyItems(newItems);
    };

    const handleSaveSupplyItem = async (item: SupplyItem) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(item);
            const response = await postToGoogleScript({ action: 'saveSupplyItem', data: apiPayload });
            const savedItem = response.data;
            setSupplyItems(prev => {
                const index = prev.findIndex(i => i.id === savedItem.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedItem;
                    return newList;
                }
                return [...prev, savedItem];
            });
            alert('บันทึกข้อมูลพัสดุเรียบร้อย');
        } catch(e) { console.error(e); alert('เกิดข้อผิดพลาด'); } 
        finally { setIsSaving(false); }
    }

    const handleDeleteSupplyItem = async (id: number) => {
        try {
            await postToGoogleScript({ action: 'deleteSupplyItems', ids: [id] });
            setSupplyItems(prev => prev.filter(i => i.id !== id));
        } catch(e) { console.error(e); alert('เกิดข้อผิดพลาด'); }
    }

    const handleSaveSupplyRequest = async (req: SupplyRequest) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(req);
            const response = await postToGoogleScript({ action: 'saveSupplyRequest', data: apiPayload });
            const savedReq = response.data;
            setSupplyRequests(prev => {
                const index = prev.findIndex(r => r.id === savedReq.id);
                if(index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedReq;
                    return newList;
                }
                return [...prev, savedReq];
            });
            alert('บันทึกใบเบิกเรียบร้อย');
        } catch(e) { console.error(e); alert('เกิดข้อผิดพลาด'); }
        finally { setIsSaving(false); }
    }

    const handleUpdateSupplyRequestStatus = async (req: SupplyRequest) => {
        setIsSaving(true);
        try {
             const response = await postToGoogleScript({ action: 'updateSupplyRequestStatus', data: req });
             const savedReq = response.data;
             setSupplyRequests(prev => prev.map(r => r.id === savedReq.id ? savedReq : r));
        } catch(e) { console.error(e); alert('เกิดข้อผิดพลาด'); }
        finally { setIsSaving(false); }
    }

    const handleUpdateSupplyRequests = (requests: SupplyRequest[]) => {
        setSupplyRequests(requests);
    }

    const handleSaveDurableGood = async (item: DurableGood) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(item);
            const response = await postToGoogleScript({ action: 'saveDurableGood', data: apiPayload });
            const savedItem = response.data;
            
            setDurableGoods(prev => {
                const index = prev.findIndex(i => i.id === savedItem.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedItem;
                    return newList;
                }
                return [...prev, savedItem];
            });
            alert('บันทึกข้อมูลครุภัณฑ์เรียบร้อย');
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDurableGoods = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteDurableGoods', ids });
            setDurableGoods(prev => prev.filter(i => !ids.includes(i.id)));
            alert('ลบรายการเรียบร้อย');
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleSaveCertificateRequest = async (request: CertificateRequest) => {
        setIsSaving(true);
        try {
            const response = await postToGoogleScript({ action: 'saveCertificateRequest', data: request });
            const savedReq = response.data;
            setCertificateRequests(prev => {
                const index = prev.findIndex(r => r.id === savedReq.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedReq;
                    return newList;
                }
                return [...prev, savedReq];
            });
            alert('บันทึกคำขอเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCertificateRequests = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteCertificateRequests', ids });
            setCertificateRequests(prev => prev.filter(r => !ids.includes(r.id)));
            alert('ลบรายการเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleSaveMaintenanceRequest = async (request: MaintenanceRequest) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(request);
            const response = await postToGoogleScript({ action: 'saveMaintenanceRequest', data: apiPayload });
            const savedReq = response.data;
            setMaintenanceRequests(prev => {
                const index = prev.findIndex(r => r.id === savedReq.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedReq;
                    return newList;
                }
                return [...prev, savedReq];
            });
            alert('บันทึกรายการแจ้งซ่อมเรียบร้อย');
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMaintenanceRequests = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteMaintenanceRequests', ids });
            setMaintenanceRequests(prev => prev.filter(r => !ids.includes(r.id)));
            alert('ลบรายการเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleSavePerformanceReport = async (report: PerformanceReport) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(report);
            const response = await postToGoogleScript({ action: 'savePerformanceReport', data: apiPayload });
            const savedReport = response.data;
            setPerformanceReports(prev => {
                const index = prev.findIndex(r => r.id === savedReport.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedReport;
                    return newList;
                }
                return [...prev, savedReport];
            });
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePerformanceReport = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deletePerformanceReports', ids });
            setPerformanceReports(prev => prev.filter(r => !ids.includes(r.id)));
            alert('ลบรายการเรียบร้อย');
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleSaveSARReport = async (report: SARReport) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(report);
            const response = await postToGoogleScript({ action: 'saveSARReport', data: apiPayload });
            const savedReport = response.data;
            setSarReports(prev => {
                const index = prev.findIndex(r => r.id === savedReport.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedReport;
                    return newList;
                }
                return [...prev, savedReport];
            });
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSARReport = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteSARReports', ids });
            setSarReports(prev => prev.filter(r => !ids.includes(r.id)));
            alert('ลบรายการเรียบร้อย');
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleSaveDocument = async (doc: Document) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(doc);
            const response = await postToGoogleScript({ action: 'saveDocument', data: apiPayload });
            const savedDoc = response.data;
            setDocuments(prev => {
                const index = prev.findIndex(d => d.id === savedDoc.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedDoc;
                    return newList;
                }
                return [...prev, savedDoc];
            });
        } catch(e) {
            console.error(e);
            alert(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDocument = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteDocuments', ids });
            setDocuments(prev => prev.filter(d => !ids.includes(d.id)));
            alert('ลบเอกสารเรียบร้อย');
        } catch(e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleSaveConstructionRecord = async (record: ConstructionRecord) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(record);
            const response = await postToGoogleScript({ action: 'saveConstructionRecord', data: apiPayload });
            const savedRecord = response.data;
            setConstructionRecords(prev => {
                const index = prev.findIndex(r => r.id === savedRecord.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedRecord;
                    return newList;
                }
                return [...prev, savedRecord];
            });
            alert('บันทึกข้อมูลงานก่อสร้างเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConstructionRecords = async (ids: number[]) => {
        try {
            await postToGoogleScript({ action: 'deleteConstructionRecords', ids });
            setConstructionRecords(prev => prev.filter(r => !ids.includes(r.id)));
            alert('ลบรายการเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleSaveHomeVisit = async (visit: HomeVisit) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(visit);
            const response = await postToGoogleScript({ action: 'saveHomeVisit', data: apiPayload });
            const savedVisit = response.data;
            
            if (savedVisit.image) {
                if (typeof savedVisit.image === 'string') {
                    if (savedVisit.image.startsWith('[')) {
                        try { 
                            const parsed = JSON.parse(savedVisit.image);
                            savedVisit.image = Array.isArray(parsed) ? parsed : [parsed];
                        } catch(e) { 
                            savedVisit.image = []; 
                        }
                    } else {
                        savedVisit.image = [savedVisit.image];
                    }
                } else if (!Array.isArray(savedVisit.image)) {
                    savedVisit.image = [];
                }
            }
            if (savedVisit.studentId) savedVisit.studentId = Number(savedVisit.studentId);
            if (savedVisit.id) savedVisit.id = Number(savedVisit.id);

            setHomeVisits(prev => {
                const index = prev.findIndex(v => v.id === savedVisit.id);
                if (index >= 0) {
                    const newList = [...prev];
                    newList[index] = savedVisit;
                    return newList;
                }
                return [...prev, savedVisit];
            });
            alert('บันทึกการเยี่ยมบ้านเรียบร้อย');
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };


    const navigateTo = (page: Page) => {
        if (page === 'stats') {
            setCurrentPage('stats');
            return;
        }

        if (!currentUser) {
            alert('กรุณาเข้าสู่ระบบเพื่อใช้งานเมนูนี้');
            setIsLoginModalOpen(true);
            return;
        }

        if (page === 'admin') {
            if (currentUser.role !== 'admin') {
                alert('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
                return;
            }
        }
        
        setCurrentPage(page);
    };


    const renderPage = () => {
        if (isLoading) {
             return (
                <div className="flex flex-col justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-blue mb-4"></div>
                    <p className="text-xl text-secondary-gray font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            )
        }

        if (fetchError) {
             return (
                 <div className="flex flex-col justify-center items-center h-96 text-center p-8 bg-white rounded-xl shadow-lg">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">ไม่สามารถดึงข้อมูลได้</h3>
                    <p className="text-gray-600 mb-6 max-w-md">{fetchError}</p>
                    <button onClick={() => window.location.reload()} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow transition">
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
                        onSaveRecord={handleSaveServiceRecord}
                        onDeleteRecord={handleDeleteServiceRecord}
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
                            dormitories={settings.dormitories}
                            studentAttendance={studentAttendance}
                            personnelAttendance={personnelAttendance}
                            onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)}
                            onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)}
                            isSaving={isSaving}
                            currentUser={currentUser}
                        />;
            case 'attendance_personnel':
                return <AttendancePage
                            mode="personnel"
                            students={students}
                            personnel={personnel}
                            dormitories={settings.dormitories}
                            studentAttendance={studentAttendance}
                            personnelAttendance={personnelAttendance}
                            onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)}
                            onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)}
                            isSaving={isSaving}
                            currentUser={currentUser}
                        />;
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
                        onUpdateItems={(items) => {
                            setSupplyItems(items);
                        }}
                        onUpdateRequests={(reqs) => setSupplyRequests(reqs)}
                        onUpdatePersonnel={handleSavePersonnel}
                        settings={settings}
                        onSaveSettings={handleSaveAdminSettings}
                        onSaveItem={handleSaveSupplyItem}
                        onDeleteItem={handleDeleteSupplyItem}
                        onSaveRequest={handleSaveSupplyRequest}
                        onUpdateRequestStatus={handleUpdateSupplyRequestStatus}
                    />
                ) : null;
            case 'finance_projects': 
                return currentUser ? (
                    <BudgetPlanningPage 
                        currentUser={currentUser}
                        proposals={projectProposals}
                        personnel={personnel}
                        settings={settings}
                        onSave={handleSaveProjectProposal}
                        onDelete={handleDeleteProjectProposal}
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
                        onSave={handleSaveDurableGood}
                        onDelete={handleDeleteDurableGoods}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'general_certs':
                return currentUser ? (
                    <CertificatePage 
                        currentUser={currentUser}
                        requests={certificateRequests}
                        onSave={handleSaveCertificateRequest}
                        onDelete={handleDeleteCertificateRequests}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'general_repair':
                return currentUser ? (
                    <MaintenancePage 
                        currentUser={currentUser}
                        requests={maintenanceRequests}
                        onSave={handleSaveMaintenanceRequest}
                        onDelete={handleDeleteMaintenanceRequests}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'general_docs': 
                return currentUser ? (
                    <GeneralDocsPage 
                        currentUser={currentUser}
                        personnel={personnel}
                        documents={documents}
                        onSave={handleSaveDocument}
                        onDelete={handleDeleteDocument}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'general_construction': 
                return currentUser ? (
                    <ConstructionPage 
                        currentUser={currentUser}
                        records={constructionRecords}
                        onSave={handleSaveConstructionRecord}
                        onDelete={handleDeleteConstructionRecords}
                        isSaving={isSaving}
                        personnel={personnel}
                    />
                ) : null;
            case 'student_home_visit':
                return currentUser ? (
                    <StudentHomeVisitPage 
                        currentUser={currentUser}
                        students={students}
                        visits={homeVisits}
                        onSave={handleSaveHomeVisit}
                        studentClasses={settings.studentClasses}
                        studentClassrooms={settings.studentClassrooms}
                        academicYears={settings.academicYears}
                        isSaving={isSaving}
                    />
                ) : null;
            case 'personnel_report':
                return currentUser ? (
                    <PersonnelReportPage 
                        currentUser={currentUser}
                        personnel={personnel}
                        reports={performanceReports}
                        onSave={handleSavePerformanceReport}
                        onDelete={handleDeletePerformanceReport}
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
                        onSave={handleSaveSARReport}
                        onDelete={handleDeleteSARReport}
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

    // --- MAIN RENDER ---
    
    if (!isAuthenticated) {
        return (
            <LandingPage 
                onLoginSuccess={handleLoginSuccess}
                schoolName={settings.schoolName}
                schoolLogo={settings.schoolLogo}
            />
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
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
            />
            <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
                {renderPage()}
            </main>
            <Footer />

            {/* This LoginModal is for session refresh or user switch inside app */}
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
            {viewingReport && (
                <ViewReportModal 
                    report={viewingReport}
                    onClose={handleCloseViewReportModal}
                    students={students}
                />
            )}
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
            {viewingStudent && (
                <ViewStudentModal
                    student={viewingStudent}
                    onClose={handleCloseViewStudentModal}
                    personnel={personnel}
                    schoolName={settings.schoolName}
                    schoolLogo={settings.schoolLogo}
                />
            )}
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
            {viewingPersonnel && (
                <ViewPersonnelModal
                    personnel={viewingPersonnel}
                    onClose={handleCloseViewPersonnelModal}
                    schoolName={settings.schoolName}
                    schoolLogo={settings.schoolLogo}
                />
            )}
        </div>
    );
};

export default App;
