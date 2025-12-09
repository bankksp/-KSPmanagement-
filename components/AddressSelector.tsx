
import React, { useState, useEffect, useMemo } from 'react';
import { THAI_PROVINCES } from '../constants';

interface AddressSelectorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    wrapperClass?: string;
}

interface ThaiAddress {
    district: string; // Tambon
    amphoe: string;   // Amphure
    province: string; // Changwat
    zipcode: number;
    district_code: number;
    amphoe_code: number;
    province_code: number;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({ label, value, onChange, wrapperClass = '' }) => {
    const [db, setDb] = useState<ThaiAddress[]>([]);
    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    // Form State
    const [details, setDetails] = useState('');
    const [province, setProvince] = useState('');
    const [amphoe, setAmphoe] = useState('');
    const [district, setDistrict] = useState('');
    const [zipcode, setZipcode] = useState('');

    // Load Database on Mount with Fallback
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Try primary source (GitHub Pages - usually most reliable)
                let response = await fetch('https://earthchie.github.io/jquery.Thailand/jquery.Thailand.js/database/raw_database/raw_database.json');
                
                // If primary fails, try backup source (Raw GitHub)
                if (!response.ok) {
                    console.warn('Primary address DB failed, trying backup...');
                    response = await fetch('https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json');
                }

                if (!response.ok) throw new Error('Network response was not ok');
                
                // Check content type or try text first to avoid JSON parse error on HTML 404 pages
                const text = await response.text();
                if (!text || !text.trim().startsWith('[')) {
                    throw new Error('Invalid database format');
                }

                const data = JSON.parse(text);
                setDb(data);
                setIsError(false);
            } catch (e) {
                console.warn("Failed to load Thai address database, switching to manual input mode.", e);
                setIsError(true); // Enable fallback mode immediately
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Parse existing value on mount or when value changes externally
    useEffect(() => {
        if (!value) return;

        // Try to parse existing string: "123 Moo 1 ต.A อ.B จ.C 10000"
        const provinceMatch = value.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
        const amphoeMatch = value.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s]+)/);
        const districtMatch = value.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s]+)/);
        const zipMatch = value.match(/\s(\d{5})/);

        if (provinceMatch || amphoeMatch || districtMatch) {
            let tempDetails = value;
            
            // Remove the detected parts from details string to avoid duplication
            if (zipMatch) tempDetails = tempDetails.replace(zipMatch[0], '');
            if (provinceMatch) tempDetails = tempDetails.replace(provinceMatch[0], '');
            if (amphoeMatch) tempDetails = tempDetails.replace(amphoeMatch[0], '');
            if (districtMatch) tempDetails = tempDetails.replace(districtMatch[0], '');
            
            const currentConstructed = constructAddress(details, district, amphoe, province, zipcode);
            
            // Only update local state if it differs significantly to prevent typing interruption
            if (currentConstructed !== value) {
                setDetails(tempDetails.trim().replace(/,$/, '').replace(/^,/, '').trim());
                if (provinceMatch) setProvince(provinceMatch[1]);
                if (amphoeMatch) setAmphoe(amphoeMatch[1]);
                if (districtMatch) setDistrict(districtMatch[1]);
                if (zipMatch) setZipcode(zipMatch[1]);
            }
        } else {
             // Fallback for simple strings: preserve detail but don't overwrite if user is typing
             // Only set details if we have no structured data
             if (!province && !amphoe && details !== value) {
                 setDetails(value);
             }
        }
    }, [value]);

    const constructAddress = (det: string, dist: string, amp: string, prov: string, zip: string) => {
        let parts = [];
        if (det) parts.push(det);
        
        const isBangkok = prov.includes('กรุงเทพ');
        const dPrefix = dist ? (isBangkok ? 'แขวง' : 'ต.') : '';
        const aPrefix = amp ? (isBangkok ? 'เขต' : 'อ.') : '';
        const pPrefix = prov ? (isBangkok ? '' : 'จ.') : '';

        if (dist) parts.push(`${dPrefix}${dist}`);
        if (amp) parts.push(`${aPrefix}${amp}`);
        if (prov) parts.push(`${pPrefix}${prov}`);
        if (zip) parts.push(zip);
        return parts.join(' ');
    };

    const updateParent = (det: string, dist: string, amp: string, prov: string, zip: string) => {
        const fullAddress = constructAddress(det, dist, amp, prov, zip);
        onChange(fullAddress);
    };

    // Filter Logic
    const availableAmphoes = useMemo(() => {
        if (!province || db.length === 0) return [];
        return Array.from(new Set(db.filter(i => i.province === province).map(i => i.amphoe))).sort();
    }, [db, province]);

    const availableDistricts = useMemo(() => {
        if ((!province && !isError) || !amphoe || db.length === 0) return [];
        return db.filter(i => i.province === province && i.amphoe === amphoe);
    }, [db, province, amphoe, isError]);

    // Handlers
    const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDetails(e.target.value);
        updateParent(e.target.value, district, amphoe, province, zipcode);
    };

    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const newProv = e.target.value;
        setProvince(newProv);
        // Clear children when province changes
        setAmphoe('');
        setDistrict('');
        setZipcode('');
        updateParent(details, '', '', newProv, '');
    };

    const handleAmphoeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const newAmp = e.target.value;
        setAmphoe(newAmp);
        setDistrict('');
        setZipcode('');
        updateParent(details, '', newAmp, province, '');
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const newDist = e.target.value;
        setDistrict(newDist);
        
        // Auto find zipcode if using DB
        if (!isError && db.length > 0) {
            const entry = db.find(i => i.province === province && i.amphoe === amphoe && i.district === newDist);
            const newZip = entry ? String(entry.zipcode) : '';
            setZipcode(newZip);
            updateParent(details, newDist, amphoe, province, newZip);
        } else {
            updateParent(details, newDist, amphoe, province, zipcode);
        }
    };

    const handleZipcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZip = e.target.value;
        setZipcode(newZip);
        updateParent(details, district, amphoe, province, newZip);
    };

    // Use Manual Mode if DB failed to load or explicitly error
    const manualMode = isError || (db.length === 0 && !loading);

    return (
        <div className={`space-y-2 ${wrapperClass}`}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                {/* Details Input */}
                <div>
                    <input
                        type="text"
                        value={details}
                        onChange={handleDetailsChange}
                        placeholder="บ้านเลขที่, หมู่, ซอย, ถนน..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue text-sm"
                    />
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Province */}
                    <div>
                        {/* Always use Select for Province since we have the constant */}
                        <select 
                            value={province} 
                            onChange={handleProvinceChange}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-blue"
                        >
                            <option value="">เลือกจังหวัด</option>
                            {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {/* Amphoe */}
                    <div>
                        {manualMode ? (
                            <input
                                type="text"
                                value={amphoe}
                                onChange={handleAmphoeChange}
                                placeholder="อำเภอ/เขต"
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        ) : (
                            <select 
                                value={amphoe} 
                                onChange={handleAmphoeChange}
                                disabled={!province}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-blue disabled:bg-gray-100"
                            >
                                <option value="">เลือกอำเภอ</option>
                                {availableAmphoes.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        )}
                    </div>

                    {/* District */}
                    <div>
                        {manualMode ? (
                            <input
                                type="text"
                                value={district}
                                onChange={handleDistrictChange}
                                placeholder="ตำบล/แขวง"
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        ) : (
                            <select 
                                value={district} 
                                onChange={handleDistrictChange}
                                disabled={!amphoe}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-blue disabled:bg-gray-100"
                            >
                                <option value="">เลือกตำบล</option>
                                {availableDistricts.map(d => <option key={d.district} value={d.district}>{d.district}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Zipcode */}
                    <div>
                        <input
                            type="text"
                            value={zipcode}
                            onChange={handleZipcodeChange}
                            placeholder="รหัสไปรษณีย์"
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${manualMode ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}`}
                            readOnly={!manualMode && !isError} // Read-only if in auto mode and no error
                        />
                    </div>
                </div>
                
                {/* Feedback UI */}
                {loading && <p className="text-xs text-blue-500 animate-pulse">กำลังโหลดฐานข้อมูลที่อยู่...</p>}
                {isError && <p className="text-xs text-orange-500">ระบบที่อยู่อัตโนมัติขัดข้อง (ใช้การกรอกเอง)</p>}
            </div>
        </div>
    );
};

export default AddressSelector;
