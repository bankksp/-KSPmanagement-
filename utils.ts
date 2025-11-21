
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
