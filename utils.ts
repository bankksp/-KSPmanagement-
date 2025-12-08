
import { GOOGLE_SCRIPT_URL } from './constants';

export const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const getDirectDriveImageSrc = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) {
        return URL.createObjectURL(url);
    }
    if (typeof url !== 'string') return '';

    let cleanUrl = url.trim();

    // 1. Recursive unwrap of JSON/Quotes
    let attempts = 0;
    while ((cleanUrl.startsWith('[') || cleanUrl.startsWith('"') || cleanUrl.startsWith("'")) && attempts < 5) {
        try {
            if (cleanUrl.startsWith("'") || (cleanUrl.startsWith("[") && cleanUrl.includes("'"))) {
                 cleanUrl = cleanUrl.replace(/'/g, '"');
            }
            
            const parsed = JSON.parse(cleanUrl);
            
            if (Array.isArray(parsed)) {
                if (parsed.length > 0) cleanUrl = parsed[0];
                else return ''; 
            } else if (typeof parsed === 'string') {
                cleanUrl = parsed;
            } else {
                cleanUrl = String(parsed);
            }
        } catch (e) {
             cleanUrl = cleanUrl.replace(/^["'\[]+|["'\]]+$/g, '');
             break; 
        }
        attempts++;
    }

    cleanUrl = cleanUrl.replace(/[\[\]"']/g, '').trim();

    if (cleanUrl.startsWith('data:')) return cleanUrl;

    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                  cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }

    return cleanUrl;
};

export const getFirstImageSource = (source: any): string | null => {
    if (!source) return null;
    if (Array.isArray(source)) {
        if (source.length === 0) return null;
        return getDirectDriveImageSrc(source[0]);
    }
    if (typeof source === 'string') {
        return getDirectDriveImageSrc(source);
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
               if (clean.includes("'")) {
                   clean = clean.replace(/'/g, '"');
               }
               const parsed = JSON.parse(clean);
               if (Array.isArray(parsed)) return parsed;
            } catch(e) {}
        }
        return [input];
    }
    return [];
};

export const resizeAndCompressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                } else {
                    reject(new Error("Canvas context is null"));
                }
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const fileToObject = async (file: File): Promise<{ filename: string, mimeType: string, data: string }> => {
    if (file.type.startsWith('image/')) {
        try {
            const compressedDataUrl = await resizeAndCompressImage(file, 1024, 1024, 0.7);
            return {
                filename: file.name.replace(/\.[^/.]+$/, "") + ".jpg", 
                mimeType: 'image/jpeg',
                data: compressedDataUrl.split(',')[1] 
            };
        } catch (error) {
            console.warn("Image compression failed, falling back to original file", error);
        }
    }

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

export const prepareDataForApi = async (data: any) => {
    const apiData: any = { ...data }; 

    for (const key in data) {
        const value = data[key];

        if (value instanceof File) {
            apiData[key] = await fileToObject(value);
        } else if (Array.isArray(value)) {
             apiData[key] = await Promise.all(value.map(async (item) => {
                 if (item instanceof File) {
                     return await fileToObject(item);
                 }
                 return item;
             }));
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

export const postToGoogleScript = async (payload: any, retries = 3) => {
    const scriptUrl = GOOGLE_SCRIPT_URL;
    const urlWithCacheBuster = `${scriptUrl}?t=${new Date().getTime()}`;
    let lastError: any;

    try {
        const storedUser = localStorage.getItem('ksp_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            payload.auth = {
                id: user.id,
                token: user.token || user.password, 
                idCard: user.idCard
            };
        }
    } catch(e) {}

    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const response = await fetch(urlWithCacheBuster, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const text = await response.text();
            if (!text) throw new Error("Server returned empty response");

            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                const msg = text.includes('<title>') ? text.match(/<title>(.*?)<\/title>/)?.[1] || 'Unknown HTML Error' : text.substring(0, 100);
                throw new Error(`Invalid JSON response: ${msg}`);
            }

            if (result.status === 'error') {
                console.error("Google Script Error:", result.message, result.stack);
                if (result.message && (result.message.includes("Invalid action") || result.message.includes("Unknown action"))) {
                    throw new Error(`Google Script ยังไม่อัปเดตฟังก์ชัน "${(payload as any).action}": กรุณานำโค้ดใหม่ไปวางในไฟล์ รหัส.gs แล้ว Deploy ใหม่อีกครั้ง`);
                }
                throw new Error(result.message);
            }
            
            return result;

        } catch (error: any) {
            const isTimeout = error.name === 'AbortError' || (error.message && (error.message.includes('aborted') || error.message.includes('signal is aborted')));

            if (isTimeout) {
                const timeoutError = new Error("การเชื่อมต่อหมดเวลา (Timeout) กรุณาลองใหม่อีกครั้ง หรือตรวจสอบสัญญาณอินเทอร์เน็ต");
                if (i === retries - 1) throw timeoutError;
                error = timeoutError;
            }
            
            lastError = error;
            console.warn(`Attempt ${i + 1} failed: ${error.message}`);
            
            if (error.message && error.message.includes("Google Script")) throw error;

            if (i < retries - 1) await new Promise(res => setTimeout(res, 2000 * (i + 1))); 
        }
    }
    throw lastError;
};

// --- Date Utils for Thai Buddhist Calendar ---

// Get current date in DD/MM/YYYY (Buddhist Year)
export const getCurrentThaiDate = (): string => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = (date.getFullYear() + 543).toString();
    return `${day}/${month}/${year}`;
};

// Convert "DD/MM/YYYY" (Buddhist) to "YYYY-MM-DD" (ISO/Gregorian) for input[type="date"] value
export const buddhistToISO = (buddhistDate: string | undefined): string => {
    if (!buddhistDate || typeof buddhistDate !== 'string') return '';
    const parts = buddhistDate.split('/');
    if (parts.length !== 3) {
        // If it's potentially already an ISO string with Buddhist year (e.g. 2568-12-07), handle it
        if (buddhistDate.match(/^\d{4}-\d{2}-\d{2}/)) {
             const [y, m, d] = buddhistDate.split('-').map(Number);
             // If year > 2400, convert to Gregorian for input
             const gregYear = y > 2400 ? y - 543 : y;
             return `${gregYear}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        }
        return '';
    }
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    
    // Convert Buddhist to Gregorian for Input Value
    const gregorianYear = year > 2400 ? year - 543 : year;
    
    return `${gregorianYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

// Convert "YYYY-MM-DD" (ISO/Gregorian) from input[type="date"] to "DD/MM/YYYY" (Buddhist) for storage
export const isoToBuddhist = (isoDate: string | undefined): string => {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    
    // Convert Gregorian to Buddhist
    const buddhistYear = year + 543;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${buddhistYear}`;
};

// Format Date for Display (Thai Full Date)
export const formatThaiDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    
    // Handle ISO string or "YYYY-MM-DD" or weird "2568-12-07..."
    if (dateString.includes('-') || dateString.includes('T')) {
        let d = new Date(dateString);
        
        // Handling the "2568-..." case manually since Date() might not parse it correctly or might treat year as 2568 AD
        const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
        let day, month, year;

        if (isoMatch) {
             year = parseInt(isoMatch[1]);
             month = parseInt(isoMatch[2]) - 1;
             day = parseInt(isoMatch[3]);
        } else if (!isNaN(d.getTime())) {
             day = d.getDate();
             month = d.getMonth();
             year = d.getFullYear();
        } else {
            return dateString;
        }

        // Auto-detect if year is already Buddhist (unlikely for Date object unless manually set or weird string)
        const buddhistYear = year < 2400 ? year + 543 : year;
        return `${day} ${THAI_MONTHS[month]} ${buddhistYear}`;
    }

    // Handle DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        if (month >= 0 && month <= 11) {
            return `${day} ${THAI_MONTHS[month]} ${year}`;
        }
    }
    return dateString;
};

// For sorting dates
export const parseThaiDateForSort = (dateString: string): number => {
    if (!dateString) return 0;
    
    // Try DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
        // YYYYMMDD
        return parseInt(parts[2]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[0]);
    }
    
    // Try ISO
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) return d.getTime();
    
    return 0;
};
