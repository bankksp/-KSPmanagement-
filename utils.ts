
import { GOOGLE_SCRIPT_URL } from './constants';

export const getDirectDriveImageSrc = (url: string | File | undefined | null): string => {
    if (!url) return '';
    if (url instanceof File) {
        return URL.createObjectURL(url);
    }
    if (typeof url !== 'string') return '';

    let cleanUrl = url.trim();

    // 1. Recursive unwrap of JSON/Quotes
    // This handles cases like: '["https://..."]' or '"https://..."' or even nested JSON
    let attempts = 0;
    while ((cleanUrl.startsWith('[') || cleanUrl.startsWith('"') || cleanUrl.startsWith("'")) && attempts < 5) {
        try {
             // Normalize single quotes to double for JSON if it looks like an array or object
            if (cleanUrl.startsWith("'") || (cleanUrl.startsWith("[") && cleanUrl.includes("'"))) {
                 cleanUrl = cleanUrl.replace(/'/g, '"');
            }
            
            const parsed = JSON.parse(cleanUrl);
            
            if (Array.isArray(parsed)) {
                if (parsed.length > 0) cleanUrl = parsed[0];
                else return ''; // Empty array
            } else if (typeof parsed === 'string') {
                cleanUrl = parsed;
            } else {
                // Parsed to something else, convert back to string
                cleanUrl = String(parsed);
            }
        } catch (e) {
            // If JSON parse fails, try manual strip of outer quotes/brackets
             cleanUrl = cleanUrl.replace(/^["'\[]+|["'\]]+$/g, '');
             break; 
        }
        attempts++;
    }

    // 2. Final cleanup of any lingering characters
    cleanUrl = cleanUrl.replace(/[\[\]"']/g, '').trim();

    if (cleanUrl.startsWith('data:')) return cleanUrl;

    // 3. Extract Drive ID and use Thumbnail Endpoint
    // Matches: /file/d/ID, id=ID, open?id=ID
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                  cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (match && match[1]) {
        // Use the thumbnail endpoint. It is generally more permissible for embedding than 'uc?export=view'
        // sz=w1000 requests a high-resolution version (width 1000px)
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }

    return cleanUrl;
};

// Helper to safely extract the first image source from any type (Array, String, JSON String)
export const getFirstImageSource = (source: any): string | null => {
    if (!source) return null;

    // If it's a real array
    if (Array.isArray(source)) {
        if (source.length === 0) return null;
        return getDirectDriveImageSrc(source[0]);
    }

    // If it's a string (could be a URL or a JSON stringified array)
    if (typeof source === 'string') {
        return getDirectDriveImageSrc(source);
    }

    return null;
};

// Helper to safe parse any input into an array
export const safeParseArray = (input: any): any[] => {
    if (input === undefined || input === null) return [];
    if (Array.isArray(input)) return input;
    
    if (typeof input === 'string') {
        let clean = input.trim();
        // Check if it looks like a JSON array
        if (clean.startsWith('[') && clean.endsWith(']')) {
            try {
               // Simple attempt to fix common single-quote JSON issues from Python/Apps Script
               if (clean.includes("'")) {
                   clean = clean.replace(/'/g, '"');
               }
               const parsed = JSON.parse(clean);
               if (Array.isArray(parsed)) return parsed;
            } catch(e) {
                // Parsing failed, treat as single string
            }
        }
        // Return as single element array if it's just a string URL
        return [input];
    }
    
    return [];
};

// Helper: Resize and Compress Image
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

                // Calculate new dimensions while maintaining aspect ratio
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
                    // Compress to JPEG
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

// Helper to convert a File to a Base64 string object for Google Script
export const fileToObject = async (file: File): Promise<{ filename: string, mimeType: string, data: string }> => {
    // If it's an image, try to compress it
    if (file.type.startsWith('image/')) {
        try {
            // Resize to max 1024px, 0.7 quality (High compression, decent quality)
            const compressedDataUrl = await resizeAndCompressImage(file, 1024, 1024, 0.7);
            return {
                filename: file.name.replace(/\.[^/.]+$/, "") + ".jpg", // Force extension to jpg
                mimeType: 'image/jpeg',
                data: compressedDataUrl.split(',')[1] // Remove "data:image/jpeg;base64," header
            };
        } catch (error) {
            console.warn("Image compression failed, falling back to original file", error);
        }
    }

    // Fallback for non-images (PDFs etc) or failed compression
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({
                filename: file.name,
                mimeType: file.type,
                data: result.split(',')[1] // remove data:mime/type;base64, part
            });
        };
        reader.onerror = error => reject(error);
    });
};

// Helper to prepare data for API submission, converting all File objects
export const prepareDataForApi = async (data: any) => {
    const apiData: any = { ...data }; 

    for (const key in data) {
        const value = data[key];

        if (value instanceof File) {
            apiData[key] = await fileToObject(value);
        } else if (Array.isArray(value)) {
             // Support mixed array of Files and Strings (e.g. existing URLs + new Files)
             apiData[key] = await Promise.all(value.map(async (item) => {
                 if (item instanceof File) {
                     return await fileToObject(item);
                 }
                 // Keep existing strings/objects as is
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

// Generic function to post data to Google Script with Retry Logic and Timeout
export const postToGoogleScript = async (payload: any, retries = 3) => {
    const scriptUrl = GOOGLE_SCRIPT_URL;
    const urlWithCacheBuster = `${scriptUrl}?t=${new Date().getTime()}`;
    let lastError: any;

    // Inject Auth Token if available in localStorage
    try {
        const storedUser = localStorage.getItem('ksp_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            // Inject auth info into payload
            // This allows the backend to verify the request
            payload.auth = {
                id: user.id,
                token: user.token || user.password, // Fallback to password if no token
                idCard: user.idCard
            };
        }
    } catch(e) {
        // Ignore parsing errors, just don't attach auth
    }

    for (let i = 0; i < retries; i++) {
        try {
            // Create a controller to abort the fetch if it takes too long (e.g., 180 seconds - 3 minutes)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const response = await fetch(urlWithCacheBuster, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            if (!text) throw new Error("Server returned empty response");

            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                // If parsing fails, try to extract error from HTML if possible
                const msg = text.includes('<title>') ? 
                    text.match(/<title>(.*?)<\/title>/)?.[1] || 'Unknown HTML Error' : 
                    text.substring(0, 100);
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
            // Better timeout detection
            const isTimeout = error.name === 'AbortError' || 
                              (error.message && (error.message.includes('aborted') || error.message.includes('signal is aborted')));

            if (isTimeout) {
                const timeoutError = new Error("การเชื่อมต่อหมดเวลา (Timeout) กรุณาลองใหม่อีกครั้ง หรือตรวจสอบสัญญาณอินเทอร์เน็ต");
                if (i === retries - 1) throw timeoutError;
                error = timeoutError;
            }
            
            lastError = error;
            console.warn(`Attempt ${i + 1} failed: ${error.message}`);
            
            // If it's a specific logic error from script, don't retry
            if (error.message && error.message.includes("Google Script")) {
                throw error;
            }

            // If retries left, wait before retrying (Exponential Backoff)
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, 2000 * (i + 1))); 
            }
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
    if (parts.length !== 3) return '';
    
    // Check if format is YYYY-MM-DD already (backward compatibility)
    if (buddhistDate.includes('-') && parts[0].length === 4) return buddhistDate;

    let day = 0, month = 0, year = 0;

    // Handle standard DD/MM/YYYY
    if (parts[0].length <= 2 && parts[2].length === 4) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
    } else {
        // Fallback or other formats
        return '';
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    
    // If year is Buddhist (e.g. > 2400), convert to Gregorian
    const gregorianYear = year > 2400 ? year - 543 : year;
    
    return `${gregorianYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

// Convert "YYYY-MM-DD" (ISO/Gregorian) from input[type="date"] to "DD/MM/YYYY" (Buddhist) for storage
export const isoToBuddhist = (isoDate: string | undefined): string => {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    
    const [year, month, day] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    
    // Convert Gregorian to Buddhist
    const buddhistYear = year + 543;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${buddhistYear}`;
};
