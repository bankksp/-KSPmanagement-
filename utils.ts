
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
 * Extract time from Google Sheets date string
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

/**
 * Extracts Google Drive ID from various URL formats
 */
export const getDriveId = (url: any): string | null => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim().replace(/[\[\]"'\\]/g, '');
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                  cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

/**
 * URL for embedding images or small previews.
 */
export const getDirectDriveImageSrc = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) {
        return URL.createObjectURL(url);
    }
    
    const id = getDriveId(url);
    if (id) {
        return `https://lh3.googleusercontent.com/d/${id}`;
    }
    
    return String(url).trim().replace(/[\[\]"\\]/g, '').replace(/^'|'$/g, '');
};

/**
 * URL for downloading files directly.
 */
export const getDriveDownloadUrl = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) return URL.createObjectURL(url);
    
    const id = getDriveId(url);
    if (id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return String(url).trim().replace(/[\[\]"']/g, '');
};

/**
 * URL for opening the file in Google Drive's native viewer.
 */
export const getDriveViewUrl = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) return URL.createObjectURL(url);
    
    const id = getDriveId(url);
    if (id) {
        return `https://drive.google.com/file/d/${id}/view?usp=sharing`;
    }
    return String(url).trim().replace(/[\[\]"']/g, '');
};

/**
 * Gets a preview URL for Google Drive documents.
 */
export const getDrivePreviewUrl = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) {
        return URL.createObjectURL(url);
    }

    const id = getDriveId(url);
    if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
    }
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
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return getDirectDriveImageSrc(parsed[0]);
                }
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
        while (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1).trim();
        }
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
 * Normalizes date from various formats avoiding Timezone shifts and double BE offsets
 */
export const normalizeDate = (input: any): Date | null => {
    if (!input) return null;
    if (input instanceof Date) {
        if (isNaN(input.getTime())) return null;
        // If the date object already has a BE year, correct it to Gregorian
        if (input.getFullYear() > 2400) {
            return new Date(input.getFullYear() - 543, input.getMonth(), input.getDate(), input.getHours(), input.getMinutes());
        }
        return input;
    }
    
    const str = String(input).trim();
    
    // 1. Handle full ISO string (from Google Script)
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            // Check if ISO year was accidentally saved as BE
            if (d.getFullYear() > 2400) {
                return new Date(d.getFullYear() - 543, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
            }
            return d;
        }
    }

    // 2. Handle plain YYYY-MM-DD (BE or Gregorian)
    const isoMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (isoMatch) {
        let y = parseInt(isoMatch[1]);
        const m = parseInt(isoMatch[2]);
        const d = parseInt(isoMatch[3]);
        if (y > 2400) y -= 543;
        const dateObj = new Date(y, m - 1, d);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    // 3. Handle Thai format (DD/MM/YYYY)
    const thaiMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (thaiMatch) {
        const d = parseInt(thaiMatch[1]);
        const m = parseInt(thaiMatch[2]) - 1;
        let y = parseInt(thaiMatch[3]);
        if (y > 2400) y -= 543;
        const dateObj = new Date(y, m, d);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    // 4. Final fallback
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        if (d.getFullYear() > 2400) {
            return new Date(d.getFullYear() - 543, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
        }
        return d;
    }
    
    return null;
};

export const formatThaiDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = normalizeDate(dateString);
    if (!date) return dateString;
    
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear() + 543;
    return `${d} ${THAI_SHORT_MONTHS[m]} ${y}`;
};

export const formatThaiDateTime = (dateStr: string, timeStr?: string): string => {
    if (!dateStr) return '-';
    const date = normalizeDate(dateStr);
    if (!date) return dateStr;
    
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear() + 543;
    
    let hourStr = '';
    let minuteStr = '';

    const cleanTime = formatOnlyTime(timeStr || (dateStr.includes('T') ? dateStr : ''));
    if (cleanTime && cleanTime.includes(':')) {
        [hourStr, minuteStr] = cleanTime.split(':');
    }

    let timePart = '';
    if (hourStr && minuteStr && (hourStr !== '00' || minuteStr !== '00')) {
        timePart = ` ${hourStr}:${minuteStr} น.`;
    }
    
    return `${d} ${THAI_SHORT_MONTHS[m]} ${y}${timePart}`;
};

export const prepareDataForApi = async (data: any) => {
    const apiData: any = { ...data }; 
    for (const key in data) {
        const value = data[key];
        if (value instanceof File) {
            apiData[key] = await fileToObject(value);
        } else if (Array.isArray(value)) {
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
            resolve({
                filename: file.name,
                mimeType: file.type,
                data: result.split(',')[1] 
            });
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
                headers: { 
                    'Content-Type': 'text/plain;charset=utf-8' 
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            
            if (text.trim().startsWith('<!DOCTYPE')) {
                throw new Error('Google Script session expired or restricted access. Please check script deployment permissions.');
            }
            
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
