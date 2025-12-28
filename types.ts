
export interface Endorsement {
  signature?: string; 
  comment: string; 
  date: string;
  signerName: string;
  signerPosition?: string;
  posX?: number;
  posY?: number;
  scale?: number;
  assignedName?: string;
}

export type DocumentType = 'incoming' | 'order' | 'outgoing'; 
export type DocumentStatus = 'draft' | 'proposed' | 'delegated' | 'endorsed' | 'distributed'; 

export interface Document {
  id: number;
  type: DocumentType;
  receiveNo?: string; 
  number: string; 
  date: string; 
  receiveDate?: string; 
  receiveTime?: string; 
  title: string; 
  from: string; 
  to: string; 
  file?: (File | string)[]; 
  status: DocumentStatus;
  endorsements?: Endorsement[];
  assignedTo?: number; 
  recipients: number[]; 
  createdDate: string;
  totalPages?: number;
  signatoryPage?: number;
  note?: string;
  showStamp?: boolean;
  stampScale?: number;
}

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
  homeCount?: number; 
  log: string;
  studentDetails?: string; 
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
  latitude?: number;
  longitude?: number;
  weight?: number; 
  height?: number; 
}

export interface Personnel {
  id: number;
  personnelTitle: string;
  personnelTitleOther?: string;
  personnelName: string;
  position: string;
  dob: string;
  idCard: string;
  email: string; 
  isEmailVerified: boolean; 
  authProvider?: 'manual' | 'google' | 'facebook';
  appointmentDate: string;
  positionNumber: string;
  phone: string;
  address?: string; 
  profileImage?: (File | string)[];
  advisoryClasses?: string[];
  password?: string;
  role?: 'user' | 'pro' | 'admin';
  status?: 'pending' | 'approved' | 'blocked';
  isProjectManager?: boolean; 
  isSarabanAdmin?: boolean; 
  token?: string; 
}

export interface ThemeColors {
  primary: string;
  primaryHover: string;
}

export interface Settings {
    schoolName: string;
    schoolLogo: string; 
    themeColors: ThemeColors;
    dormitories: string[];
    positions: string[];
    academicYears: string[];
    studentClasses: string[];
    studentClassrooms: string[];
    googleScriptUrl: string;
    adminPassword?: string;
    serviceLocations?: string[]; 
    projectGroups?: string[]; 
    projectManagerIds?: number[]; 
}

export type TimePeriod = 'morning' | 'lunch' | 'evening';
export type AttendanceStatus = 'present' | 'sick' | 'leave' | 'absent' | 'activity'; 

export interface StudentAttendance {
    id: string; 
    date: string; 
    period: TimePeriod;
    studentId: number;
    status: AttendanceStatus;
    note?: string;
}

export interface PersonnelAttendance {
    id: string; 
    date: string; 
    period: TimePeriod;
    personnelId: number;
    status: AttendanceStatus;
    dressCode?: 'tidy' | 'untidy';
    note?: string;
}

export type PlanStatus = 'pending' | 'approved' | 'needs_edit';

export interface AcademicPlan {
  id: number;
  date: string; 
  teacherId: number;
  teacherName: string;
  learningArea: string; 
  subjectCode: string;
  subjectName: string;
  courseStructureFile?: (File | string)[]; 
  lessonPlanFile?: (File | string)[]; 
  additionalLink?: string;
  status: PlanStatus;
  comment?: string; 
  approverName?: string;
  approvedDate?: string;
}

export interface ServiceStudent {
    id: number;
    name: string;
    class: string;
    nickname?: string;
}

export interface ServiceRecord {
  id: number;
  date: string; 
  time: string; 
  students: ServiceStudent[];
  studentId?: number;
  studentName?: string;
  studentClass?: string;
  location: string;
  purpose: string;
  teacherId: number;
  teacherName: string;
  images?: (File | string)[];
}

export interface SupplyItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  initialStock: number; 
  addedStock: number; 
}

export interface SupplyRequestItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
  price: number; 
}

export interface SupplyRequest {
  id: number;
  date: string; 
  requesterId: number;
  requesterName: string;
  position: string;
  department: string; 
  reason: string;
  items: SupplyRequestItem[];
  status: 'pending' | 'approved' | 'rejected';
  note?: string; 
  approverName?: string;
  approvedDate?: string;
}

export type DurableGoodStatus = 'available' | 'in_use' | 'repair' | 'write_off';

export interface DurableGood {
  id: number;
  code: string; 
  name: string; 
  category: string; 
  price: number; 
  acquisitionDate: string; 
  location: string; 
  status: DurableGoodStatus; 
  description?: string;
  image?: (File | string)[];
}

export interface CertificateRequest {
  id: number;
  requesterName: string; 
  date: string; 
  activityName: string; 
  peopleCount: number; 
  academicYear: string; 
  activityNo: string; 
  prefix: string; 
  generatedNumber: string; 
  note?: string; 
}

export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cannot_repair';

export interface MaintenanceRequest {
  id: number;
  date: string; 
  requesterName: string; 
  itemName: string; 
  description: string; 
  location: string; 
  status: MaintenanceStatus;
  image?: (File | string)[];
  repairerName?: string; 
  completionDate?: string;
  cost?: number; 
  remark?: string;
}

export interface PerformanceReport {
  id: number;
  personnelId: number;
  name: string;
  position: string;
  academicYear: string;
  round: string; 
  file?: (File | string)[];
  score?: number;
  status: 'pending' | 'approved' | 'needs_edit';
  submissionDate: string;
  note?: string;
}

export interface SARReport {
  id: number;
  personnelId: number;
  name: string;
  position: string;
  academicYear: string;
  round: string; 
  file?: (File | string)[];
  score?: number;
  status: 'pending' | 'approved' | 'needs_edit';
  submissionDate: string;
  note?: string;
}

export type SDQResultType = 'normal' | 'risk' | 'problem';

export interface SDQRecord {
    id: number;
    studentId: number;
    studentName: string; 
    academicYear: string;
    term: string; 
    evaluatorId: number;
    evaluatorName: string;
    date: string;
    scores: Record<number, number>; 
    scoreEmotional: number;
    scoreConduct: number;
    scoreHyper: number;
    scorePeer: number;
    scoreProsocial: number;
    scoreTotalDifficulties: number; 
    resultEmotional: SDQResultType;
    resultConduct: SDQResultType;
    resultHyper: SDQResultType;
    resultPeer: SDQResultType;
    resultProsocial: SDQResultType;
    resultTotal: SDQResultType;
}

export type NutritionTargetGroup = 'kindergarten' | 'primary' | 'secondary';

export interface Ingredient {
    id: number;
    name: string;
    unit: string;
    calories: number; 
    protein: number; 
    fat: number; 
    carbs: number; 
    price?: number; 
}

export interface MealPlanItem {
    ingredientId: number;
    amount: number; 
}

export interface MealPlan {
    id: number;
    date: string; 
    targetGroup: NutritionTargetGroup;
    menuName: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    items: MealPlanItem[];
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
}

export type Page = 
    | 'stats' 
    | 'attendance' 
    | 'attendance_personnel' 
    | 'reports' 
    | 'students' 
    | 'personnel' 
    | 'admin' 
    | 'profile'
    | 'academic_plans'
    | 'academic_service' 
    | 'finance_supplies'
    | 'finance_projects' 
    | 'durable_goods'
    | 'personnel_report'
    | 'personnel_sar'
    | 'general_docs'
    | 'general_repair'
    | 'general_certs' 
    | 'general_construction' 
    | 'general_nutrition' 
    | 'student_home_visit' 
    | 'student_sdq';

export interface HomeVisit {
  id: number;
  studentId: number;
  visitorId: number;
  visitorName: string;
  academicYear: string;
  term: string;
  status: 'visited' | 'pending';
  date: string;
  notes: string;
  locationName: string;
  image: (File | string)[];
  latitude?: number;
  longitude?: number;
}

export type ConstructionStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export interface ConstructionRecord {
  id: number;
  date: string;
  projectName: string;
  contractor: string;
  location: string;
  progress: number;
  status: ConstructionStatus;
  contractorWork: string;
  materials: string;
  workers: string;
  description: string;
  problems: string;
  budget: number;
  media: (File | string)[];
  reporter: string;
  supervisors: number[];
}

export type ProjectStatus = 'pending_approval' | 'approved' | 'rejected';
export type ProjectProcessStatus = 'not_started' | 'in_progress' | 'completed';

export interface ProjectProposal {
  id: number;
  fiscalYear: string;
  name: string;
  group: string;
  budget: number;
  responsiblePersonId: number;
  responsiblePersonName: string;
  status: ProjectStatus;
  processStatus: ProjectProcessStatus;
  description: string;
  files: (File | string)[];
  images: (File | string)[];
  createdDate: string;
  approverName?: string;
  approvedDate?: string;
}
