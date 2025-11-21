
import { Settings } from "./types";

export const ACADEMIC_YEARS = Array.from({ length: 11 }, (_, i) => (2560 + i).toString());

export const DORMITORIES = [
  "แพรวา", "ภูไท", "ฟ้าแดด", "ลำปาว", "โปงลาง", "ภูพาน", 
  "สงยาง", "ไดโนเสาร์", "ไดโนเสาร์ 2", "มะหาด", "พะยอม", "เรือนพยาบาล"
];

export const POSITIONS = [
  "งานสารบัญ",
  "พนักงานราชการ", "ครูผู้ช่วย", "ครู", "ครูชำนาญการ", 
  "ครูชำนาญการพิเศษ", "รองผู้อำนวยการชำนาญการ", "รองผู้อำนวยการชำนาญการพิเศษ"
];

export const STUDENT_CLASSES = [
  "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6",
  "มัธยมศึกษาปีที่ 1", "มัธยมศึกษาปีที่ 2", "มัธยมศึกษาปีที่ 3", "มัธยมศึกษาปีที่ 4", "มัธยมศึกษาปีที่ 5", "มัธยมศึกษาปีที่ 6"
];

export const STUDENT_CLASSROOMS = Array.from({ length: 8 }, (_, i) => (i + 1).toString());

// Updated URL based on user request
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPULly51wnfwG5MgS2VItYEt9Olp1RXBUmdSk8yvsgMViMr5u4iTNVZ6BlNcAheen9CA/exec';

export const DEFAULT_SETTINGS: Settings = {
    schoolName: 'โรงเรียนกาฬสินธุ์ปัญญานุกูล',
    schoolLogo: 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png', // Default URL
    themeColors: {
        primary: '#3B82F6',
        primaryHover: '#2563EB',
    },
    dormitories: DORMITORIES,
    positions: POSITIONS,
    academicYears: ACADEMIC_YEARS,
    googleScriptUrl: GOOGLE_SCRIPT_URL,
    adminPassword: 'ksp'
};