
import { GOOGLE_SCRIPT_URL } from './constants';

export const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_SHORT_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Converts Arabic numerals to Thai numerals
 */
export const toThaiNumerals = (str: string | number | undefined): string => {
    if (str === undefined || str === null) return '';
    const s = String(str);
    const id = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return s.replace(/[0-9]/g, (digit) => id[parseInt(digit)]);
};

/**
 * Extract time from string
 */
export const formatOnlyTime = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    const s = String(timeStr).trim();
    
    if (s.includes('T')) {
        try {
            const date = new Date(s);
            if (!isNaN(date.getTime())) {
                const h = date.getHours().toString().padStart(2, '0');
                const m = date.getMinutes().toString().padStart(2, '0');
                return `${h}:${m}`;
            }
        } catch (e) {}
    }
    
    const match = s.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    
    return s;
};

export const getDriveId = (url: any): string | null => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim().replace(/[\[\]"'\\]/g, '');
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                  cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

export const getDirectDriveImageSrc = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) return URL.createObjectURL(url);
    const id = getDriveId(url);
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    return String(url).trim().replace(/[\[\]"\\]/g, '').replace(/^'|'$/g, '');
};

export const getDriveDownloadUrl = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) return URL.createObjectURL(url);
    const id = getDriveId(url);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    return String(url).trim().replace(/[\[\]"']/g, '');
};

export const getDriveViewUrl = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) return URL.createObjectURL(url);
    const id = getDriveId(url);
    if (id) return `https://drive.google.com/file/d/${id}/view?usp=sharing`;
    return String(url).trim().replace(/[\[\]"']/g, '');
};

export const getDrivePreviewUrl = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) return URL.createObjectURL(url);
    const id = getDriveId(url);
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
    return String(url).trim().replace(/[\[\]"']/g, '');
};

export const getFirstImageSource = (source: any): string | null => {
    if (!source) return null;
    if (Array.isArray(source)) {
        if (source.length === 0) return null;
        return getDirectDriveImageSrc(source[0]);
    }
    if (typeof source === 'string') {
        let trimmed = source.trim();
        while (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            trimmed = trimmed.substring(1, trimmed.length - 1).trim();
        }
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed) && parsed.length > 0) return getDirectDriveImageSrc(parsed[0]);
            } catch (e) {
                const match = trimmed.match(/"([^"]+)"/);
                if (match) return getDirectDriveImageSrc(match[1]);
            }
        }
        return getDirectDriveImageSrc(trimmed);
    }
    return null;
};

export const safeParseArray = (input: any): any[] => {
    if (input === undefined || input === null) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
        let clean = input.trim();
        if (clean.startsWith('[') && clean.endsWith(']')) {
            try {
               if (clean.includes("'")) clean = clean.replace(/'/g, '"');
               const parsed = JSON.parse(clean);
               if (Array.isArray(parsed)) return parsed;
            } catch(e) {}
        }
        return [clean];
    }
    return [];
};

/**
 * ปรับปรุงให้รองรับวันที่หลากหลายรูปแบบมากขึ้น รวมถึง ISO String
 */
export const normalizeDate = (input: any): Date | null => {
    if (!input) return null;
    if (input instanceof Date) {
        if (isNaN(input.getTime())) return null;
        // หากปีเป็น พ.ศ. (เช่น 2569) ให้ลบ 543 เพื่อเป็น ค.ศ. สำหรับ JavaScript Date
        if (input.getFullYear() > 2400) {
            return new Date(input.getFullYear() - 543, input.getMonth(), input.getDate());
        }
        return input;
    }
    
    const str = String(input).trim();
    if (!str) return null;

    // 1. ISO Format (2025-01-03T...)
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            // ป้องกันปัญหาการเก็บปีเป็น พ.ศ. ในรูปแบบ ISO String จากบาง Library
            let year = d.getFullYear();
            if (year > 2400) year -= 543;
            return new Date(year, d.getMonth(), d.getDate());
        }
    }

    // 2. YYYY-MM-DD or DD/MM/YYYY
    const separators = /[-/.]/;
    const parts = str.split(separators);
    if (parts.length === 3) {
        let d, m, y;
        if (parts[0].length === 4) { // YYYY-MM-DD
            y = parseInt(parts[0]); m = parseInt(parts[1]) - 1; d = parseInt(parts[2]);
        } else { // DD/MM/YYYY
            d = parseInt(parts[0]); m = parseInt(parts[1]) - 1; y = parseInt(parts[2]);
        }
        if (y > 2400) y -= 543;
        const dateObj = new Date(y, m, d);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    // 3. Fallback to Date.parse
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        let year = d.getFullYear();
        if (year > 2400) year -= 543;
        return new Date(year, d.getMonth(), d.getDate());
    }
    
    return null;
};

export const formatThaiDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = normalizeDate(dateString);
    if (!date) return String(dateString).split('T')[0]; // หาก Parse ไม่ได้จริงๆ ให้ตัดเอาแค่ส่วนวันที่
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear() + 543;
    return `${d} ${THAI_MONTHS[m]} ${y}`;
};

export const formatThaiDateTime = (dateStr: string, timeStr?: string): string => {
    if (!dateStr) return '-';
    const date = normalizeDate(dateStr);
    if (!date) return dateStr;
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear() + 543;
    const cleanTime = formatOnlyTime(timeStr || (dateStr.includes('T') ? dateStr : ''));
    return `${d} ${THAI_SHORT_MONTHS[m]} ${y}${cleanTime ? ' ' + cleanTime + ' น.' : ''}`;
};

export const prepareDataForApi = async (data: any) => {
    if (Array.isArray(data)) {
        return Promise.all(data.map(async (item) => await prepareDataForApi(item)));
    }

    const apiData: any = { ...data }; 
    for (const key in data) {
        const value = data[key];
        if (value instanceof File) apiData[key] = await fileToObject(value);
        else if (Array.isArray(value)) {
             apiData[key] = await Promise.all(value.map(async (item) => {
                 if (item instanceof File) return await fileToObject(item);
                 return item;
             }));
        }
    }
    return apiData;
};

export const fileToObject = async (file: File): Promise<{ filename: string, mimeType: string, data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({ filename: file.name, mimeType: file.type, data: result.split(',')[1] });
        };
        reader.onerror = error => reject(error);
    });
};

export const postToGoogleScript = async (payload: any, retries = 3) => {
    const scriptUrl = GOOGLE_SCRIPT_URL;
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(scriptUrl, {
                method: 'POST',
                mode: 'cors', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            const result = JSON.parse(text);
            if (result.status === 'error') throw new Error(result.message);
            return result;
        } catch (error: any) {
            lastError = error;
            if (i < retries - 1) await new Promise(res => setTimeout(res, 1000 * (i + 1))); 
        }
    }
    throw lastError;
};

export const getCurrentThaiDate = (): string => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = (date.getFullYear() + 543).toString();
    return `${day}/${month}/${year}`;
};

export const buddhistToISO = (buddhistDate: string | undefined): string => {
    if (!buddhistDate) return '';
    const date = normalizeDate(buddhistDate);
    if (!date) return '';
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const isoToBuddhist = (isoDate: string | undefined): string => {
    if (!isoDate) return '';
    const parts = String(isoDate).split('-');
    if (parts.length !== 3) return isoDate;
    const buddhistYear = parseInt(parts[0]) + 543;
    return `${parts[2].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${buddhistYear}`;
};

export const parseThaiDateForSort = (dateString: string): number => {
    const date = normalizeDate(dateString);
    return date ? date.getTime() : 0;
};

export const toThaiWords = (num: number): string => {
    const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    let numStr = String(Math.floor(num));
    let decimalStr = String(num.toFixed(2)).split('.')[1] || '00';

    if (num === 0) return '(ศูนย์บาทถ้วน)';

    let result = '';
    let len = numStr.length;

    for (let i = 0; i < len; i++) {
        let n = parseInt(numStr[i]);
        if (n === 0) continue;

        let unit = units[len - 1 - i];
        
        if (n === 1) {
            if (len - 1 - i === 1) { // สิบ
                // No need to say 'หนึ่ง'
            } else if (len - 1 - i === 0 && len > 1) { // หน่วย
                if (parseInt(numStr[len - 2]) !== 0) {
                    result += 'เอ็ด';
                } else {
                    result += 'หนึ่ง';
                }
            } else {
                result += 'หนึ่ง';
            }
        } else if (n === 2 && len - 1 - i === 1) { // ยี่สิบ
            result += 'ยี่';
        } else {
            result += digits[n];
        }

        result += unit;
    }

    result += 'บาท';

    if (parseInt(decimalStr) === 0) {
        result += 'ถ้วน';
    } else {
        numStr = decimalStr;
        len = numStr.length;
        let satangResult = '';
        for (let i = 0; i < len; i++) {
            let n = parseInt(numStr[i]);
            if (n === 0) continue;
            let unit = units[len - 1 - i];
            if (n === 1) {
                if (len - 1 - i === 1) {}
                else if (len - 1 - i === 0 && len > 1 && parseInt(numStr[len - 2]) !== 0) satangResult += 'เอ็ด';
                else satangResult += 'หนึ่ง';
            } else if (n === 2 && len - 1 - i === 1) {
                satangResult += 'ยี่';
            } else {
                satangResult += digits[n];
            }
            satangResult += unit;
        }
        result += satangResult + 'สตางค์';
    }
    return `(${result})`;
}
