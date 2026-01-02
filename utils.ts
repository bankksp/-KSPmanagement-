
import { GOOGLE_SCRIPT_URL } from './constants';

export const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_SHORT_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const toThaiNumerals = (str: string | number | undefined): string => {
    if (str === undefined || str === null) return '';
    const s = String(str);
    const id = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return s.replace(/[0-9]/g, (digit) => id[parseInt(digit)]);
};

export const formatOnlyTime = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    const s = String(timeStr).trim();
    if (s.includes('T')) {
        try {
            const date = new Date(s);
            if (!isNaN(date.getTime())) {
                return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            }
        } catch (e) {}
    }
    const match = s.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return s;
};

export const getDriveId = (url: any): string | null => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim().replace(/[\[\]"'\\]/g, '');
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

export const getDirectDriveImageSrc = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) return URL.createObjectURL(url);
    const id = getDriveId(url);
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    return String(url).trim().replace(/[\[\]"\\]/g, '').replace(/^'|'$/g, '');
};

export const getFirstImageSource = (source: any): string | null => {
    if (!source) return null;
    if (Array.isArray(source)) {
        if (source.length === 0) return null;
        return getDirectDriveImageSrc(source[0]);
    }
    if (typeof source === 'string') {
        let trimmed = source.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed) && parsed.length > 0) return getDirectDriveImageSrc(parsed[0]);
            } catch (e) {}
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
               const parsed = JSON.parse(clean);
               if (Array.isArray(parsed)) return parsed;
            } catch(e) {}
        }
        return [clean];
    }
    return [];
};

/**
 * ปรับปรุงการจัดการรูปแบบวันที่ (Date Normalization)
 * บังคับให้เป็นรูปแบบ DD/MM/YYYY (พ.ศ.) เสมอ เพื่อความแม่นยำในการเปรียบเทียบ String
 */
export const normalizeDate = (input: any): Date | null => {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    
    const str = String(input).trim();
    
    // 1. Handle DD/MM/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
        let d = parseInt(parts[0]);
        let m = parseInt(parts[1]) - 1;
        let y = parseInt(parts[2]);
        if (y > 2400) y -= 543;
        const dateObj = new Date(y, m, d);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    // 2. Handle YYYY-MM-DD
    const isoParts = str.split('-');
    if (isoParts.length === 3 && isoParts[0].length === 4) {
        let y = parseInt(isoParts[0]);
        let m = parseInt(isoParts[1]) - 1;
        let d = parseInt(isoParts[2]);
        if (y > 2400) y -= 543;
        const dateObj = new Date(y, m, d);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        if (d.getFullYear() > 2400) return new Date(d.getFullYear() - 543, d.getMonth(), d.getDate());
        return d;
    }
    return null;
};

/**
 * บังคับรูปแบบวันที่ให้เป็น 01/01/2569 (มี 0 นำหน้าเสมอ)
 */
export const toStrictThaiDateString = (input: any): string => {
    const d = normalizeDate(input);
    if (!d) return String(input);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
};

export const formatThaiDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = normalizeDate(dateString);
    if (!date) return dateString;
    return `${date.getDate()} ${THAI_SHORT_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
};

export const getCurrentThaiDate = (): string => {
    return toStrictThaiDateString(new Date());
};

export const buddhistToISO = (buddhistDate: string | undefined): string => {
    if (!buddhistDate) return '';
    const date = normalizeDate(buddhistDate);
    if (!date) return '';
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

export const isoToBuddhist = (isoDate: string | undefined): string => {
    if (!isoDate) return '';
    const parts = String(isoDate).split('-');
    if (parts.length !== 3) return isoDate;
    return toStrictThaiDateString(isoDate);
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
            if (i < retries - 1) await new Promise(res => setTimeout(res, 1000)); 
        }
    }
    throw lastError;
};

export const parseThaiDateForSort = (dateString: string): number => {
    const date = normalizeDate(dateString);
    return date ? date.getTime() : 0;
};

// Fix: Added missing prepareDataForApi utility function
/**
 * แปลงไฟล์ในอ็อบเจกต์ข้อมูลให้เป็น Base64 เพื่อส่งไปยัง API
 */
export const prepareDataForApi = async (data: any): Promise<any> => {
    if (data === null || data === undefined) return data;

    if (data instanceof File) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(data);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    if (Array.isArray(data)) {
        const results = await Promise.all(data.map(item => prepareDataForApi(item)));
        return results;
    }

    if (typeof data === 'object') {
        const result: any = {};
        for (const key in data) {
            result[key] = await prepareDataForApi(data[key]);
        }
        return result;
    }

    return data;
};

// Fix: Added missing formatThaiDateTime utility function
/**
 * รูปแบบ วันที่ และ เวลา แบบไทย
 */
export const formatThaiDateTime = (dateString: string | undefined, timeString?: string): string => {
    if (!dateString) return '-';
    const datePart = formatThaiDate(dateString);
    const timePart = formatOnlyTime(timeString);
    return `${datePart}${timePart ? ' ' + timePart + ' น.' : ''}`;
};

// Fix: Added missing getDrivePreviewUrl utility function
/**
 * รับ URL ของ Google Drive แล้วสร้าง Preview URL
 */
export const getDrivePreviewUrl = (source: any): string => {
    const id = getDriveId(source);
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
    return String(source);
};

// Fix: Added missing getDriveDownloadUrl utility function
/**
 * รับ URL ของ Google Drive แล้วสร้าง Download URL
 */
export const getDriveDownloadUrl = (source: any): string => {
    const id = getDriveId(source);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    return String(source);
};

// Fix: Added missing getDriveViewUrl utility function
/**
 * รับ URL ของ Google Drive แล้วสร้าง View URL
 */
export const getDriveViewUrl = (source: any): string => {
    const id = getDriveId(source);
    if (id) return `https://drive.google.com/file/d/${id}/view?usp=sharing`;
    return String(source);
};
