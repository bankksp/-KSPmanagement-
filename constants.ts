
import { Settings, Ingredient, NutritionTargetGroup, AttendancePeriodConfig } from "./types";

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

export const LEAVE_TYPES = [
  "ลาป่วย", "ลากิจส่วนตัว", "ลาพักผ่อน", "ลาคลอดบุตร", "ลาไปช่วยเหลือภริยาที่คลอดบุตร", "ลาอุปสมบทหรือไปประกอบพิธีฮัจญ์", "ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล", "ลาไปศึกษา ฝึกอบรม ดูงาน หรือปฏิบัติการวิจัย"
];

export const STUDENT_CLASSES = [
  "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6",
  "มัธยมศึกษาปีที่ 1", "มัธยมศึกษาปีที่ 2", "มัธยมศึกษาปีที่ 3", "มัธยมศึกษาปีที่ 4", "มัธยมศึกษาปีที่ 5", "มัธยมศึกษาปีที่ 6"
];

export const STUDENT_CLASSROOMS = Array.from({ length: 8 }, (_, i) => (i + 1).toString());

export const LEARNING_AREAS = [
  "ภาษาไทย",
  "คณิตศาสตร์",
  "วิทยาศาสตร์และเทคโนโลยี",
  "สังคมศึกษา ศาสนา และวัฒนธรรม",
  "สุขศึกษาและพลศึกษา",
  "ศิลปะ",
  "การงานอาชีพ",
  "ภาษาต่างประเทศ",
  "กิจกรรมพัฒนาผู้เรียน"
];

export const DEFAULT_ATTENDANCE_PERIODS: AttendancePeriodConfig[] = [
    { id: 'morning_act', label: 'กิจกรรมเช้า', enabled: true },
    { id: 'p1', label: 'ชั่วโมงที่ 1', enabled: true },
    { id: 'p2', label: 'ชั่วโมงที่ 2', enabled: true },
    { id: 'p3', label: 'ชั่วโมงที่ 3', enabled: true },
    { id: 'lunch_act', label: 'กิจกรรมเที่ยง', enabled: true },
    { id: 'p4', label: 'ชั่วโมงที่ 4', enabled: true },
    { id: 'p5', label: 'ชั่วโมงที่ 5', enabled: true },
    { id: 'p6', label: 'ชั่วโมงที่ 6', enabled: true },
    { id: 'evening_act', label: 'กิจกรรมเย็น', enabled: true },
];

export const PROGRAM_LOGO = 'https://img5.pic.in.th/file/secure-sv1/Blue-and-White-Modern-Gradient-D-Logo.png';

export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPULly51wnfwG5MgS2VItYEt9Olp1RXBUmdSk8yvsgMViMr5u4iTNVZ6BlNcAheen9CA/exec';

export const DEFAULT_SETTINGS: Settings = {
    schoolName: 'โรงเรียนกาฬสินธุ์ปัญญานุกูล',
    schoolLogo: 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png', 
    themeColors: {
        primary: '#3B82F6',
        primaryHover: '#2563EB',
    },
    dormitories: DORMITORIES,
    positions: POSITIONS,
    academicYears: ACADEMIC_YEARS,
    studentClasses: STUDENT_CLASSES,
    studentClassrooms: STUDENT_CLASSROOMS,
    googleScriptUrl: GOOGLE_SCRIPT_URL,
    durableGoodsCategories: ['ยานพาหนะ', 'อุปกรณ์อิเล็กทรอนิกส์', 'เครื่องใช้สำนักงาน', 'เฟอร์นิเจอร์', 'อุปกรณ์ห้องประชุม', 'ครุภัณฑ์การเกษตร', 'ครุภัณฑ์โฆษณาและเผยแพร่'],
    // Initialize Webhooks as empty strings
    webhookAttendance: '',
    webhookDormitory: '',
    webhookAcademic: '',
    webhookFinance: '',
    webhookGeneral: '',
    webhookStudentSupport: '',
    
    adminPassword: 'ksp',
    schoolLat: 16.4322,
    schoolLng: 103.5061,
    checkInRadius: 200,
    leaveTypes: LEAVE_TYPES,
    leaveApproverIds: [],
    attendancePeriods: DEFAULT_ATTENDANCE_PERIODS,
    autoHideSidebar: false
};

export const THAI_PROVINCES = [
    "กระบี่", "กรุงเทพมหานคร", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท",
    "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม",
    "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
    "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์",
    "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง",
    "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
    "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย",
    "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
].sort();

export const NUTRITION_STANDARDS: Record<NutritionTargetGroup, { calories: number, protein: number, fat: number, carbs: number }> = {
    kindergarten: { calories: 1200, protein: 35, fat: 40, carbs: 175 },
    primary: { calories: 1600, protein: 45, fat: 53, carbs: 230 },
    secondary: { calories: 2100, protein: 60, fat: 70, carbs: 300 }
};

export const DEFAULT_INGREDIENTS: Ingredient[] = [
    { id: 1, name: 'ข้าวสวย (สุก)', unit: 'ทัพพี', calories: 80, protein: 1.5, fat: 0.2, carbs: 18, price: 5 },
    { id: 2, name: 'ไข่ไก่ (เบอร์ 2)', unit: 'ฟอง', calories: 72, protein: 6.3, fat: 4.8, carbs: 0.4, price: 4 },
    { id: 3, name: 'เนื้อหมู (ไม่ติดมัน)', unit: 'ขีด (100g)', calories: 143, protein: 26, fat: 3.5, carbs: 0, price: 25 },
    { id: 4, name: 'เนื้อไก่ (อก)', unit: 'ขีด (100g)', calories: 120, protein: 23, fat: 2.5, carbs: 0, price: 15 },
    { id: 5, name: 'ผักบุ้ง', unit: 'กำ (100g)', calories: 20, protein: 2, fat: 0.2, carbs: 3, price: 10 },
    { id: 6, name: 'น้ำมันพืช', unit: 'ช้อนชา', calories: 45, protein: 0, fat: 5, carbs: 0, price: 1 },
    { id: 7, name: 'นมวัว (จืด)', unit: 'กล่อง (200ml)', calories: 130, protein: 8, fat: 7, carbs: 10, price: 10 },
    { id: 8, name: 'กล้วยน้ำว้า', unit: 'ผล', calories: 60, protein: 0.8, fat: 0.2, carbs: 15, price: 3 },
    { id: 9, name: 'ปลาทู (นึ่ง)', unit: 'ตัว', calories: 140, protein: 20, fat: 6, carbs: 0, price: 15 },
    { id: 10, name: 'เส้นก๋วยเตี๋ยว (ลวก)', unit: 'ถ้วย', calories: 150, protein: 2, fat: 0.5, carbs: 33, price: 5 },
];
