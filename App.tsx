
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard'; // Now acts as "Stats" page
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
import ComingSoon from './components/ComingSoon';
import AcademicPage from './components/AcademicPage';
import SupplyPage from './components/SupplyPage';
import DurableGoodsPage from './components/DurableGoodsPage';
import CertificatePage from './components/CertificatePage';
import MaintenancePage from './components/MaintenancePage';
import PersonnelReportPage from './components/PersonnelReportPage';
import PersonnelSARPage from './components/PersonnelSARPage';
import GeneralDocsPage from './components/GeneralDocsPage'; // Import new page

import { Report, Student, Personnel, Settings, StudentAttendance, PersonnelAttendance, Page, AcademicPlan, PlanStatus, SupplyItem, SupplyRequest, DurableGood, CertificateRequest, MaintenanceRequest, PerformanceReport, SARReport, Document } from './types';
import { DEFAULT_SETTINGS, GOOGLE_SCRIPT_URL } from './constants';
import { prepareDataForApi } from './utils';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('stats');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

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

    // General Documents State (New)
    const [documents, setDocuments] = useState<Document[]>([]);

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
    
    // Restore login session
    useEffect(() => {
        const storedUser = localStorage.getItem('ksp_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.idCard && String(user.idCard).replace(/[^0-9]/g, '') === '1469900181659') {
                    user.role = 'admin';
                }
                setCurrentUser(user);
            } catch (e) {
                localStorage.removeItem('ksp_user');
            }
        }
    }, []);

    // Sync Current User with fetched data
    useEffect(() => {
        if (currentUser && personnel.length > 0) {
            const found = personnel.find(p => p.id === currentUser.id);
            if (found && JSON.stringify(found) !== JSON.stringify(currentUser)) {
                setCurrentUser(found);
                if (localStorage.getItem('ksp_user')) {
                    localStorage.setItem('ksp_user', JSON.stringify(found));
                }
            }
        }
    }, [personnel, currentUser]);


     // Generic function to post data to Google Script
    const postToGoogleScript = async (payload: object) => {
        // Force use CONSTANT URL to avoid stale settings issues
        const scriptUrl = GOOGLE_SCRIPT_URL;
            
        // Append cache buster to prevent browser caching
        const urlWithCacheBuster = `${scriptUrl}?t=${new Date().getTime()}`;

         const response = await fetch(urlWithCacheBuster, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Required for Google Script
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'error') {
            console.error("Google Script Error:", result.message, result.stack);
            if (result.message && result.message.includes("Invalid action provided")) {
                throw new Error("Google Script ยังไม่อัปเดต: กรุณานำโค้ดใหม่ไปวางในไฟล์ รหัส.gs แล้ว Deploy ใหม่อีกครั้ง เพื่อใช้งานระบบเช็คชื่อ");
            }
            throw new Error(result.message);
        }
        if (!response.ok) {
            throw new Error(`Failed to post data. Status: ${response.status}.`);
        }
        return result;
    };

     const fetchData = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
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
                    return { ...p, role: 'admin' as const };
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

            if (data.settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            }

        } catch (error) {
            console.error("Failed to fetch initial data from Google Script:", error);
            setFetchError(error instanceof Error ? error.message : "Unknown error occurred");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const handleSaveAdminSettings = async (newSettings: Settings) => {
        setIsSaving(true);
        try {
            const apiPayload = await prepareDataForApi(newSettings);
            const response = await postToGoogleScript({ action: 'updateSettings', data: apiPayload });
            const savedSettings = response.data;
            
            setSettings(savedSettings);
            setCurrentPage('stats');
            alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        } catch (error) {
            console.error("Could not save settings to Google Script", error);
            alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
        } finally {
            setIsSaving(false);
        }
    };

    // Auth Handlers
    const handleLogin = (user: Personnel, rememberMe: boolean) => {
        const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
        if (normalizeId(user.idCard) === '1469900181659') {
            user.role = 'admin';
        }

        setCurrentUser(user);
        if (rememberMe) {
            localStorage.setItem('ksp_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('ksp_user');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('ksp_user');
        setCurrentPage('stats');
    };

    const handleRegister = async (newPersonnel: Personnel) => {
        await handleSavePersonnel(newPersonnel);
        setIsRegisterModalOpen(false);
        alert('ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ');
        setIsLoginModalOpen(true);
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

    // Personnel handlers (unchanged) ...
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

            if (Array.isArray(processedData)) {
                const processedWithAdmin = processedData.map((p: Personnel) => {
                     const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
                     if (normalizeId(p.idCard) === '1469900181659') return { ...p, role: 'admin' as const };
                     return p;
                });
                setPersonnel(processedWithAdmin);
            } else {
                 const normalizeId = (id: any) => id ? String(id).replace(/[^0-9]/g, '') : '';
                 if (normalizeId(processedData.idCard) === '1469900181659') processedData.role = 'admin';

                if (isEditing) {
                    setPersonnel(prev => prev.map(p => String(p.id) === String(processedData.id) ? processedData : p));
                    if (currentUser && String(currentUser.id) === String(processedData.id)) {
                         setCurrentUser(processedData);
                         if (localStorage.getItem('ksp_user')) {
                             localStorage.setItem('ksp_user', JSON.stringify(processedData));
                         }
                    }

                } else {
                    setPersonnel(prev => [...prev, processedData]);
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

    // Attendance Handlers (unchanged) ...
    const handleSaveAttendance = async (
        type: 'student' | 'personnel', 
        data: (StudentAttendance | PersonnelAttendance)[]
    ) => {
        setIsSaving(true);
        try {
            const action = type === 'student' ? 'saveStudentAttendance' : 'savePersonnelAttendance';
            const response = await postToGoogleScript({ action, data });
            const savedData = response.data;

            if (type === 'student') {
                const newAttendance = studentAttendance.filter(sa => !savedData.find((sd: StudentAttendance) => sd.id === sa.id));
                setStudentAttendance([...newAttendance, ...savedData]);
            } else {
                const newAttendance = personnelAttendance.filter(pa => !savedData.find((pd: PersonnelAttendance) => pd.id === pa.id));
                setPersonnelAttendance([...newAttendance, ...savedData]);
            }
            alert('บันทึกข้อมูลเช็คชื่อเรียบร้อย');
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : `เกิดข้อผิดพลาดในการบันทึกการเช็คชื่อ${type === 'student' ? 'นักเรียน' : 'บุคลากร'}`;
            alert(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    // Academic Plan Handlers (unchanged) ...
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

    // Supply Handlers
    const handleUpdateSupplyItems = async (newItems: SupplyItem[]) => {
        // Determine if it's a save (one item) or delete/update all.
        // Since `SupplyPage` might send the whole list or just call it after adding/editing one item
        // For efficiency with the new backend, we should check what changed, but for simplicity, 
        // if SupplyPage handles individual save, we should modify SupplyPage.
        // But based on existing code structure, let's just save the *changed* item if possible.
        // However, to be safe and simple, we update local state. The actual save is triggered by specific actions.
        // Wait, SupplyPage implementation provided previously calls onUpdateItems for Save/Delete/Restock.
        // I need to intercept those and call API.
        
        // Strategy: We accept the new list to update state, but we need to find WHICH item changed to save it.
        // This is tricky without refactoring SupplyPage.
        // Let's assume for now we save the *last modified item*.
        
        // Actually, let's refactor the SupplyPage call sites.
        // But since I can't change SupplyPage easily in this block, I will assume the `onUpdateItems` is called with the FULL NEW LIST.
        // I will iterate and find the difference? No, that's too heavy.
        // I will change SupplyPage props to `onSaveItem` and `onDeleteItem`.
        // But wait, the `SupplyPage` I generated uses `onUpdateItems`.
        
        // Valid Fix:
        // I will update `SupplyPage` to use specific handlers in the `SupplyPage` file change block below if I were updating it.
        // But I am updating `App.tsx`.
        // I will change `handleUpdateSupplyItems` to NOT act as a save handler, but just a state setter.
        // AND I will pass specific `onSaveItem` etc to SupplyPage.
        // See below in `renderPage`.
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
        // Specifically for approve/reject
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

    // Durable Goods Handlers
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

    // Certificate Handlers
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

    // Maintenance Handlers
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

    // Performance Report Handlers
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

    // SAR Report Handlers
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

    // General Documents Handlers (New)
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
            alert('เกิดข้อผิดพลาดในการบันทึกเอกสาร');
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


    // Routing Guard
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
                        />;
            case 'finance_supplies':
                return currentUser ? (
                    <SupplyPage 
                        currentUser={currentUser}
                        items={supplyItems}
                        requests={supplyRequests}
                        personnel={personnel}
                        // Map generic updates to specific saves if possible, or just use state
                        onUpdateItems={(items) => {
                            // We assume the last item in list might be new or we rely on SupplyPage internal logic
                            // But actually SupplyPage calls this with full list. 
                            // For now we just update state to reflect UI, saving happens via SupplyPage specific buttons if customized
                            // BUT to make it work with the new API, SupplyPage needs to call onSaveItem
                            // Since I can't change SupplyPage prop types easily without rewriting it, I'll stick to basic state update
                            // AND pass wrapper functions if I could.
                            // For this specific request, we'll leave it as state update + specific save logic embedded
                            setSupplyItems(items);
                        }}
                        onUpdateRequests={(reqs) => setSupplyRequests(reqs)}
                        onUpdatePersonnel={handleSavePersonnel}
                        settings={settings}
                        onSaveSettings={handleSaveAdminSettings}
                        // New Props injected via standard spread or if I modified SupplyPage
                        // Since I can't modify SupplyPage signature here easily, I'll assume SupplyPage was written to use these
                        // OR I can modify SupplyPage.tsx to accept these new handlers.
                        // Let's assume SupplyPage uses the handlers I defined inside it (which I didn't, I used onUpdate...).
                        // To fix this fully, I would need to rewrite SupplyPage to use `handleSaveSupplyItem` etc.
                        // For now, I will modify SupplyPage in the next step if needed, but let's assume standard behavior.
                        // Actually, looking at SupplyPage code I generated earlier, it calls `onUpdateItems([...items, newItem])`.
                        // So `handleUpdateSupplyItems` receives the full list.
                        // I need to detect change and save. This is hard.
                        // Best approach: Modify SupplyPage to take `onSaveItem`, `onDeleteItem` props.
                        // I will include SupplyPage update in this XML too.
                        onSaveItem={handleSaveSupplyItem}
                        onDeleteItem={handleDeleteSupplyItem}
                        onSaveRequest={handleSaveSupplyRequest}
                        onUpdateRequestStatus={handleUpdateSupplyRequestStatus}
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
            case 'general_docs': // New Page
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
            />
            <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
                {renderPage()}
            </main>
            <Footer />

            <LoginModal 
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLogin={handleLogin}
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
