
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
import ReportPage from './components/ReportPage'; // New component
import { Report, Student, Personnel, Settings, StudentAttendance, PersonnelAttendance } from './types';
import { DEFAULT_SETTINGS, GOOGLE_SCRIPT_URL } from './constants';

// Helper to convert a File to a Base64 string object for Google Script
const fileToObject = (file: File): Promise<{ filename: string, mimeType: string, data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({
                filename: file.name,
                mimeType: file.type,
                data: result.split(',')[1] // remove data:mime/type;base64, part
            });
        };
        reader.onerror = error => reject(error);
    });
};

// Helper to prepare data for API submission, converting all File objects
const prepareDataForApi = async (data: any) => {
    // FIX: Create a shallow copy first. We must iterate over the ORIGINAL data keys 
    // because JSON.stringify() destroys File objects (turns them into {}), 
    // making 'instanceof File' checks fail on a cloned object.
    const apiData: any = { ...data }; 

    for (const key in data) {
        const value = data[key];

        if (value instanceof File) {
            apiData[key] = await fileToObject(value);
        } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
             apiData[key] = await Promise.all(value.map(fileToObject));
        } else if (key === 'schoolLogo' && typeof value === 'string' && value.startsWith('data:image')) {
            const result = value;
            const mimeType = result.match(/data:(.*);/)?.[1] || 'image/png';
            apiData[key] = {
                filename: 'school_logo_' + Date.now() + '.png',
                mimeType: mimeType,
                data: result.split(',')[1]
            };
        }
    }
    return apiData;
};


const App: React.FC = () => {
    // Updated page types
    const [currentPage, setCurrentPage] = useState<'stats' | 'attendance' | 'reports' | 'students' | 'personnel' | 'admin'>('stats');
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

    // Admin state
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', settings.themeColors.primary);
        root.style.setProperty('--color-primary-hover', settings.themeColors.primaryHover);
    }, [settings.themeColors]);
    
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
            // Check for specific error about invalid action to guide user
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
            
            // FIX: Access .data property from the response wrapper
            const data = response.data || {};
            
            setReports(data.reports || []);
            setStudents(data.students || []);
            setPersonnel(data.personnel || []);
            setStudentAttendance(data.studentAttendance || []);
            setPersonnelAttendance(data.personnelAttendance || []);

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

    // Report handlers
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
            const savedReport = response.data;

            if (isEditing) {
                setReports(prev => prev.map(r => r.id === savedReport.id ? savedReport : r));
            } else {
                setReports(prev => [...prev, savedReport]);
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

    // Student handlers
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
            const savedStudent = response.data;

             if (isEditing) {
                setStudents(prev => prev.map(s => s.id === savedStudent.id ? savedStudent : s));
            } else {
                setStudents(prev => [...prev, savedStudent]);
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
            const isEditing = !!editingPersonnel;
            const action = isEditing ? 'updatePersonnel' : 'addPersonnel';
            const apiPayload = await prepareDataForApi(person);
            
            const response = await postToGoogleScript({ action, data: apiPayload });
            const savedPersonnel = response.data;

            if (isEditing) {
                setPersonnel(prev => prev.map(p => p.id === savedPersonnel.id ? savedPersonnel : p));
            } else {
                setPersonnel(prev => [...prev, savedPersonnel]);
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

    // Attendance Handlers
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
                // Update local state: remove old entries for the same IDs and add new ones
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


    const renderPage = () => {
        if (isLoading) {
             return (
                <div className="flex flex-col justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-blue mb-4"></div>
                    <p className="text-xl text-secondary-gray font-medium">กำลังโหลดข้อมูล...</p>
                    <p className="text-sm text-gray-500 mt-2">กรุณารอสักครู่ ระบบกำลังเชื่อมต่อกับฐานข้อมูล</p>
                </div>
            )
        }

        if (fetchError) {
            return (
                 <div className="flex flex-col justify-center items-center h-96 text-center p-8 bg-white rounded-xl shadow-lg">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">ไม่สามารถดึงข้อมูลได้</h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                        {fetchError === "Failed to fetch" 
                            ? "เกิดปัญหาการเชื่อมต่อเครือข่าย หรือ URL ของ Google Script ไม่ถูกต้อง" 
                            : `เกิดข้อผิดพลาด: ${fetchError}`}
                    </p>
                    <div className="flex gap-4">
                         <button 
                            onClick={() => window.location.reload()} 
                            className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow transition"
                        >
                            ลองใหม่อีกครั้ง
                        </button>
                         <button 
                            onClick={() => {
                                // Reset to default settings to allow recovery if the URL was bad
                                setSettings(DEFAULT_SETTINGS);
                                setCurrentPage('admin');
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg shadow transition"
                        >
                            รีเซ็ตการตั้งค่า
                        </button>
                    </div>
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
                        />;
            case 'attendance':
                return <AttendancePage
                            students={students}
                            personnel={personnel}
                            dormitories={settings.dormitories}
                            studentAttendance={studentAttendance}
                            personnelAttendance={personnelAttendance}
                            onSaveStudentAttendance={(data) => handleSaveAttendance('student', data)}
                            onSavePersonnelAttendance={(data) => handleSaveAttendance('personnel', data)}
                            isSaving={isSaving}
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
            case 'admin':
                return <AdminDashboard 
                            settings={settings}
                            onSave={handleSaveAdminSettings}
                            onExit={() => setCurrentPage('stats')}
                            isSaving={isSaving}
                        />
            default:
                return null;
        }
    };


    return (
        <div className="min-h-screen flex flex-col">
            <Header 
                onReportClick={handleOpenReportModal} 
                onNavigate={setCurrentPage}
                currentPage={currentPage}
                schoolName={settings.schoolName}
                schoolLogo={settings.schoolLogo}
            />
            <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
                {renderPage()}
            </main>
            <Footer />
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
                />
            )}
            {viewingReport && (
                <ViewReportModal 
                    report={viewingReport}
                    onClose={handleCloseViewReportModal}
                />
            )}
            {isStudentModalOpen && (
                <StudentModal
                    onClose={handleCloseStudentModal}
                    onSave={handleSaveStudent}
                    studentToEdit={editingStudent}
                    dormitories={settings.dormitories}
                    personnel={personnel}
                    isSaving={isSaving}
                />
            )}
            {viewingStudent && (
                <ViewStudentModal
                    student={viewingStudent}
                    onClose={handleCloseViewStudentModal}
                    personnel={personnel}
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
                />
            )}
            {viewingPersonnel && (
                <ViewPersonnelModal
                    personnel={viewingPersonnel}
                    onClose={handleCloseViewPersonnelModal}
                />
            )}
        </div>
    );
};

export default App;
