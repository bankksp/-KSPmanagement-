

import { Settings, Ingredient, NutritionTargetGroup, AttendancePeriodConfig, MaterialCategory, AchievementLevel } from "./types";

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

export const ACADEMIC_STANDINGS = ["ไม่มี", "ครูชำนาญการ", "ครูชำนาญการพิเศษ", "ครูเชี่ยวชาญ", "ครูเชี่ยวชาญพิเศษ"];

export const ACHIEVEMENT_LEVELS: { id: AchievementLevel; label: string }[] = [
  { id: 'school', label: 'ระดับสถานศึกษา' },
  { id: 'district', label: 'ระดับเขตพื้นที่' },
  { id: 'province', label: 'ระดับจังหวัด' },
  { id: 'nation', label: 'ระดับประเทศ' },
];

export const EDUCATION_LEVELS = [
  "ต่ำกว่าปริญญาตรี",
  "ปริญญาตรี",
  "ปริญญาโท",
  "ปริญญาเอก"
];

export const LEAVE_TYPES = [
  "ลาป่วย", "ลากิจส่วนตัว", "ลาพักผ่อน", "ลาคลอดบุตร", "ลาไปช่วยเหลือภริยาที่คลอดบุตร", "ลาอุปสมบทหรือไปประกอบพิธีฮัจญ์", "ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล", "ลาไปศึกษา ฝึกอบรม ดูงาน หรือปฏิบัติการวิจัย"
];

export const STUDENT_CLASSES = [
  "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6",
  "มัธยมศึกษาปีที่ 1", "มัธยมศึกษาปีที่ 2", "มัธยมศึกษาปีที่ 3", "มัธยมศึกษาปีที่ 4", "มัธยมศึกษาปีที่ 5", "มัธยมศึกษาปีที่ 6"
];

export const STUDENT_CLASSROOMS = Array.from({ length: 8 }, (_, i) => (i + 1).toString());

export const DISABILITY_TYPES = [
  "1. พิการทางการเห็น",
  "2. พิการทางการได้ยินหรือสื่อความหมาย",
  "3. พิการทางการเคลื่อนไหวหรือทางร่างกาย",
  "4. พิการทางจิตใจหรือพฤติกรรม",
  "5. พิการทางสติปัญญา",
  "6. พิการทางการเรียนรู้ (Learning Disabilities)",
  "7. พิการออทิสติก (Autistic Spectrum Disorder)",
  "8. พิการทางการพูดและภาษา",
  "9. พิการซ้อน"
];

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

export const DEFAULT_MATERIAL_CATEGORIES: MaterialCategory[] = [
    { id: '1', code: '1', name: 'อาคารถาวร', usefulLife: 25, depreciationRate: 4, subCategories: [] },
    { id: '2', code: '2', name: 'อาคารชั่วคราว/โรงเรือน', usefulLife: 10, depreciationRate: 10, subCategories: [] },
    { 
        id: '3', code: '3', name: 'ครุภัณฑ์สำนักงาน', usefulLife: 8, depreciationRate: 12.5,
        subCategories: [
            { id: '3.01', code: '3.01', name: 'โต๊ะ', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.02', code: '3.02', name: 'โต๊ะทำงาน', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.03', code: '3.03', name: 'โต๊ะพิมพ์ดีด', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.04', code: '3.04', name: 'โต๊ะประชุม', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.05', code: '3.05', name: 'โต๊ะวางเครื่องคอมพิวเตอร์', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.19', code: '3.19', name: 'ตู้', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.33', code: '3.33', name: 'เครื่องถ่ายเอกสาร', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.36', code: '3.36', name: 'เครื่องปรับอากาศ', usefulLife: 8, depreciationRate: 12.5 },
            { id: '3.37', code: '3.37', name: 'พัดลม', usefulLife: 8, depreciationRate: 12.5 },
        ]
    },
    {
        id: '4', code: '4', name: 'วัสดุถาวร (ราคาไม่เกิน 5,000 บาท)', usefulLife: 5, depreciationRate: 20,
        subCategories: [
            { id: '4.01', code: '4.01', name: 'วิทยุ/เทป/ซีดี', usefulLife: 5, depreciationRate: 20 },
            { id: '4.02', code: '4.02', name: 'อุปกรณ์คอมพิวเตอร์', usefulLife: 5, depreciationRate: 20 },
            { id: '4.06', code: '4.06', name: 'โทรทัศน์', usefulLife: 5, depreciationRate: 20 },
            { id: '4.08', code: '4.08', name: 'โต๊ะ/เก้าอี้', usefulLife: 5, depreciationRate: 20 },
        ]
    },
    {
        id: '5', code: '5', name: 'ครุภัณฑ์ยานพาหนะและขนส่ง', usefulLife: 5, depreciationRate: 20,
        subCategories: [
            { id: '5.01', code: '5.01', name: 'รถยนต์นั่ง', usefulLife: 5, depreciationRate: 20 },
            { id: '5.05', code: '5.05', name: 'รถบรรทุก', usefulLife: 5, depreciationRate: 20 },
            { id: '5.06', code: '5.06', name: 'รถจักรยานยนต์', usefulLife: 5, depreciationRate: 20 },
        ]
    },
    { id: '6', code: '6', name: 'ครุภัณฑ์ไฟฟ้าและวิทยุ', usefulLife: 5, depreciationRate: 20, subCategories: [] },
    { id: '7', code: '7', name: 'ครุภัณฑ์โฆษณาและเผยแพร่', usefulLife: 5, depreciationRate: 20, subCategories: [] },
    { id: '8', code: '8', name: 'ครุภัณฑ์การเกษตร', usefulLife: 0, depreciationRate: 0, subCategories: [] },
    { id: '9', code: '9', name: 'ครุภัณฑ์โรงงาน', usefulLife: 0, depreciationRate: 0, subCategories: [] },
    { id: '10', code: '10', name: 'ครุภัณฑ์ก่อสร้าง', usefulLife: 0, depreciationRate: 0, subCategories: [] },
    { id: '11', code: '11', name: 'ครุภัณฑ์สำรวจ', usefulLife: 8, depreciationRate: 12.5, subCategories: [] },
    { id: '12', code: '12', name: 'ครุภัณฑ์วิทยาศาสตร์และการแพทย์', usefulLife: 5, depreciationRate: 20, subCategories: [] },
    { 
        id: '13', code: '13', name: 'ครุภัณฑ์คอมพิวเตอร์', usefulLife: 3, depreciationRate: 33.33,
        subCategories: [
            { id: '13.01', code: '13.01', name: 'มอร์นิเตอร์', usefulLife: 3, depreciationRate: 33.33 },
            { id: '13.12', code: '13.12', name: 'เครื่องพิมพ์', usefulLife: 3, depreciationRate: 33.33 },
            { id: '13.13', code: '13.13', name: 'ชุดเครื่องคอมพิวเตอร์', usefulLife: 3, depreciationRate: 33.33 },
        ]
    },
    { id: '14', code: '14', name: 'ครุภัณฑ์ดนตรี', usefulLife: 3, depreciationRate: 33.33, subCategories: [] },
    { id: '15', code: '15', name: 'ครุภัณฑ์งานบ้านงานครัว', usefulLife: 5, depreciationRate: 20, subCategories: [] },
    { id: '16', code: '16', name: 'ครุภัณฑ์กีฬา', usefulLife: 3, depreciationRate: 33.33, subCategories: [] },
    { id: '17', code: '17', name: 'ครุภัณฑ์สนาม', usefulLife: 5, depreciationRate: 20, subCategories: [] },
    { id: '18', code: '18', name: 'ครุภัณฑ์การศึกษา', usefulLife: 8, depreciationRate: 12.5, subCategories: [] },
];

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
    materialCategories: DEFAULT_MATERIAL_CATEGORIES,
    formTemplates: {},
    supplyTypes: ['วัสดุ', 'ครุภัณฑ์', 'ที่ดิน/สิ่งก่อสร้าง', 'จ้างเหมาบริการ'],
    procurementMethods: ['เฉพาะเจาะจง', 'คัดเลือก', 'e-bidding', 'e-market'],
    procurementCategories: ['วัสดุ', 'วัสดุถาวร', 'ครุภัณฑ์', 'หนังสือ', 'ทำวัสดุ', 'ทำวัสดุถาวร', 'ทำครุภัณฑ์', 'เหมาซ่อมแซม', 'เหมาปรับปรุง'],
    academicStandings: ACADEMIC_STANDINGS,
    // New PA Settings
    paRound1StartDate: '',
    paRound1EndDate: '',
    isPaRound1Open: true,
    paRound2StartDate: '',
    paRound2EndDate: '',
    isPaRound2Open: true,
    // New Salary Report Settings
    salaryReportStartDate: '',
    salaryReportEndDate: '',
    isSalaryReportOpen: true,
    // New SAR Report Settings
    sarStartDate: '',
    sarEndDate: '',
    isSarOpen: true,
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
    autoHideSidebar: false,
    
    // New: Default names for procurement forms
    procurementStaffName: 'นายวิมลวรรณ พิลาคุณ',
    procurementHeadName: 'นายกัญญา รัตน์อำนวย',
    financeHeadName: 'นางนิธิวดี วรเดช',
    financeStaffName: 'นางปิยธิดา อบมาลัย',
    policyHeadName: 'นางอรทิพย์ ธานะ',
    committeeChairmanName: 'นายทองคำ มากมี',
    committeeMember1Name: '...................................................',
    committeeMember2Name: '...................................................',
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
