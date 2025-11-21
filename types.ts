
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
  log: string;
  images?: (File | string)[];
}

export interface DormitoryStat {
  name: string;
  total: number;
  sick: number;
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
    googleScriptUrl: string;
    adminPassword?: string;
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