

export interface Report {
  id: number;
  reportDate: string;
  reportTime?: string;
  reporterName: string;
  position: string;
  academicYear: string;
  dormitory: string;
  presentCount: number;
  sickCount: number;
  homeCount?: number; // New field
  log: string;
  studentDetails?: string; // JSON string storing detailed status [{name, nickname, status}]
  images?: (File | string)[];
}

export interface DormitoryStat {
  name: string;
  present: number;
  sick: number;
  home: number;
  total: number;
}

export interface Student {
  id: number;
  studentTitle: string;
  studentName: string;
  studentNickname: string;
  studentClass: string;
  dormitory: string;
  studentIdCard: string;
  studentDob: string;
  studentAddress: string;
  studentPhone: string;
  fatherName: string;
  fatherPhone: string;
  fatherIdCard: string;
  fatherAddress: string;
  motherName: string;
  motherPhone: string;
  motherIdCard: string;
  motherAddress: string;
  guardianName: string;
  guardianPhone: string;
  guardianIdCard: string;
  guardianAddress: string;
  homeroomTeachers?: number[];
  studentProfileImage?: (File | string)[];
  studentIdCardImage?: (File | string)[];
  studentDisabilityCardImage?: (File | string)[];
  guardianIdCardImage?: (File | string)[];
}

export interface Personnel {
  id: number;
  personnelTitle: string;
  personnelTitleOther?: string;
  personnelName: string;
  position: string;
  dob: string;
  idCard: string;
  appointmentDate: string;
  positionNumber: string;
  phone: string;
  profileImage?: (File | string)[];
  advisoryClasses?: string[];
  password?: string;
  role?: 'user' | 'pro' | 'admin';
  status?: 'pending' | 'approved' | 'blocked'; // New field for approval system
}


export interface ThemeColors {
  primary: string;
  primaryHover: string;
}

export interface Settings {
    schoolName: string;
    schoolLogo: string; // URL or Base64 string
    themeColors: ThemeColors;
    dormitories: string[];
    positions: string[];
    academicYears: string[];
    studentClasses: string[];
    studentClassrooms: string[];
    googleScriptUrl: string;
    adminPassword?: string;
    serviceLocations?: string[]; // New: Service locations
}

// --- New Attendance Types ---

export type TimePeriod = 'morning' | 'lunch' | 'evening';
export type AttendanceStatus = 'present' | 'sick' | 'leave' | 'absent' | 'activity'; // activity is mostly for personnel

export interface StudentAttendance {
    id: string; // Composite key: date_period_studentId
    date: string; // DD/MM/YYYY (Buddhist)
    period: TimePeriod;
    studentId: number;
    status: AttendanceStatus;
    note?: string;
}

export interface PersonnelAttendance {
    id: string; // Composite key: date_period_personnelId
    date: string; // DD/MM/YYYY (Buddhist)
    period: TimePeriod;
    personnelId: number;
    status: AttendanceStatus;
    dressCode?: 'tidy' | 'untidy';
    note?: string;
}

// --- Academic Work Types ---

export type PlanStatus = 'pending' | 'approved' | 'needs_edit';

export interface AcademicPlan {
  id: number;
  date: string; // Submission date
  teacherId: number;
  teacherName: string;
  learningArea: string; // กลุ่มสาระ
  subjectCode: string;
  subjectName: string;
  courseStructureFile?: (File | string)[]; // PDF
  lessonPlanFile?: (File | string)[]; // PDF
  additionalLink?: string;
  status: PlanStatus;
  comment?: string; // For feedback when requesting edits
  approverName?: string;
  approvedDate?: string;
}

// --- Service Registration Types (New) ---

export interface ServiceStudent {
    id: number;
    name: string;
    class: string;
    nickname?: string;
}

export interface ServiceRecord {
  id: number;
  date: string; // DD/MM/YYYY
  time: string; // HH:mm
  
  // Group Fields
  students: ServiceStudent[];
  
  // Backward compatibility fields (optional)
  studentId?: number;
  studentName?: string;
  studentClass?: string;

  location: string;
  purpose: string;
  teacherId: number;
  teacherName: string;
  images?: (File | string)[];
}

// --- Supply Management Types ---

export interface SupplyItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  initialStock: number; // Opening balance
  addedStock: number; // Total purchased/added
}

export interface SupplyRequestItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
  price: number; // Snapshot of price at request time
}

export interface SupplyRequest {
  id: number;
  date: string; // DD/MM/YYYY
  requesterId: number;
  requesterName: string;
  position: string;
  department: string; // ฝ่าย/กลุ่มสาระ/โครงการ
  reason: string;
  items: SupplyRequestItem[];
  status: 'pending' | 'approved' | 'rejected';
  note?: string; // Admin note
  approverName?: string;
  approvedDate?: string;
}

// --- Durable Goods Types (New) ---

export type DurableGoodStatus = 'available' | 'in_use' | 'repair' | 'write_off';

export interface DurableGood {
  id: number;
  code: string; // รหัสครุภัณฑ์
  name: string; // ชื่อครุภัณฑ์
  category: string; // หมวดหมู่
  price: number; // ราคา
  acquisitionDate: string; // วันที่ได้มา
  location: string; // สถานที่จัดเก็บ
  status: DurableGoodStatus; // สถานะ
  description?: string;
  image?: (File | string)[];
}

// --- Certificate Request Types ---

export interface CertificateRequest {
  id: number;
  requesterName: string; // ชื่อ-สกุลผู้ขอ
  date: string; // วันที่
  activityName: string; // ชื่อกิจกรรม
  peopleCount: number; // จำนวนคน
  academicYear: string; // ปีการศึกษา
  activityNo: string; // กิจกรรมที่
  prefix: string; // อักษรย่อ (default กส.ปญ)
  generatedNumber: string; // เลขที่เกียรติบัตร (Auto-generated)
  note?: string; // หมายเหตุ
}

// --- Maintenance Request Types ---

export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cannot_repair';

export interface MaintenanceRequest {
  id: number;
  date: string; // Request date
  requesterName: string; // Who requested
  itemName: string; // What is broken
  description: string; // Detail
  location: string; // Where
  status: MaintenanceStatus;
  image?: (File | string)[];
  repairerName?: string; // Who fixed it
  completionDate?: string;
  cost?: number; // Cost of repair
  remark?: string;
}

// --- Personnel Performance Report Types ---

export interface PerformanceReport {
  id: number;
  personnelId: number;
  name: string;
  position: string;
  academicYear: string;
  round: string; // '1' or '2'
  file?: (File | string)[];
  score?: number;
  status: 'pending' | 'approved' | 'needs_edit';
  submissionDate: string;
  note?: string;
}

// --- SAR Report Types (New) ---

export interface SARReport {
  id: number;
  personnelId: number;
  name: string;
  position: string;
  academicYear: string;
  round: string; // '1' or '2'
  file?: (File | string)[];
  score?: number;
  status: 'pending' | 'approved' | 'needs_edit';
  submissionDate: string;
  note?: string;
}

// --- Document & Order Types (New) ---

export type DocumentType = 'incoming' | 'order'; // หนังสือเข้า | คำสั่ง
export type DocumentStatus = 'draft' | 'proposed' | 'endorsed' | 'distributed'; // ร่าง | เสนอ ผอ. | เกษียนแล้ว | ส่งแล้ว

export interface Endorsement {
  signature?: string; // Base64 image of signature
  comment: string; // ข้อความเกษียน
  date: string;
  signerName: string;
}

export interface Document {
  id: number;
  type: DocumentType;
  number: string; // เลขที่หนังสือ
  date: string; // ลงวันที่
  title: string; // เรื่อง
  from: string; // จาก
  to: string; // ถึง
  file?: (File | string)[]; // ไฟล์แนบ (PDF)
  status: DocumentStatus;
  endorsement?: Endorsement; // การเกษียนหนังสือ
  recipients: number[]; // IDs of personnel who received this doc
  createdDate: string;
}

// --- Construction Work Types (New) ---

export type ConstructionStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export interface ConstructionRecord {
  id: number;
  date: string; // Recording date
  projectName: string;
  contractor: string; // ผู้รับเหมา
  location: string;
  progress: number; // 0-100
  status: ConstructionStatus;
  
  // Detailed Report Fields
  contractorWork: string; // รายการปฏิบัติงานของผู้รับจ้าง
  materials: string; // วัสดุที่นำเข้าในการก่อสร้าง
  workers: string; // คนงาน (จำนวน หรือ รายละเอียด)
  description: string; // งานที่ดำเนินการก่อสร้างประจำวัน (Detailed Description)
  problems: string; // ปัญหาอุสรรค์ต่างๆ
  
  startDate: string;
  endDate: string;
  budget?: number;
  media?: (File | string)[]; // Images and Videos
  
  reporter: string; // Who recorded (can be redundant if using supervisors[0])
  supervisors: number[]; // IDs of personnel who signed/supervised
}

// --- Home Visit Types ---

export interface HomeVisit {
  id: number;
  studentId: number;
  date: string;
  term: string; // ภาคเรียนที่
  academicYear: string; // ปีการศึกษา
  visitorId: number;
  visitorName: string;
  image?: (File | string)[];
  notes?: string;
  locationName?: string;
  status: 'visited' | 'pending';
  latitude?: number;
  longitude?: number;
}

// Navigation Types
export type Page = 
    | 'stats' 
    | 'attendance' 
    | 'attendance_personnel' 
    | 'reports' 
    | 'students' 
    | 'personnel' 
    | 'admin' 
    | 'profile'
    // New Pages
    | 'academic_plans'
    | 'academic_service' // ลงทะเบียนเข้าใช้บริการ
    | 'finance_supplies'
    | 'durable_goods'
    | 'personnel_report'
    | 'personnel_sar'
    | 'general_docs'
    | 'general_repair'
    | 'general_certs' // ขอเลขเกียรติบัตร
    | 'general_construction' // บันทึกงานก่อสร้าง
    | 'student_home_visit'; // เยี่ยมบ้านนักเรียน