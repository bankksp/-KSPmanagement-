
import React, { useMemo, useEffect } from 'react';
import { Personnel } from '../types';
import { getFirstImageSource } from '../utils';

interface ViewPersonnelModalProps {
    personnel: Personnel;
    onClose: () => void;
}

const calculateAge = (dobString: string): string => {
    if (!dobString) return '-';
    const parts = dobString.split('/');
    if (parts.length !== 3) return '-';
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '-';

    const buddhistYear = year;
    const gregorianYear = buddhistYear - 543;
    
    const birthDate = new Date(gregorianYear, month - 1, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age > 0 ? age.toString() : '-';
};

const ViewPersonnelModal: React.FC<ViewPersonnelModalProps> = ({ personnel, onClose }) => {

    const profileImageUrl = useMemo(() => {
        return getFirstImageSource(personnel.profileImage);
    }, [personnel.profileImage]);

    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);
    
    const advisoryClassesText = useMemo(() => {
        const classes: unknown = personnel.advisoryClasses;
        if (Array.isArray(classes)) {
            return classes.length > 0 ? classes.join(', ') : '-';
        }
        if (typeof classes === 'string' && classes.trim() !== '') {
            return classes;
        }
        return '-';
    }, [personnel.advisoryClasses]);

    const fullName = useMemo(() => {
        const title = personnel.personnelTitle === 'อื่นๆ' ? personnel.personnelTitleOther : personnel.personnelTitle;
        return `${title || ''} ${personnel.personnelName || ''}`.trim();
    }, [personnel]);


    const DetailItem: React.FC<{ label: string; value?: string | number; fullWidth?: boolean }> = ({ label, value, fullWidth = false }) => (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <p className="text-sm font-medium text-secondary-gray">{label}</p>
            <p className="text-md font-semibold text-gray-800 break-words">{value || '-'}</p>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-navy">รายละเอียดข้อมูลบุคลากร</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
                        <div className="flex-shrink-0 w-full sm:w-40">
                             <div className="w-40 h-52 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden mx-auto shadow-md">
                                {profileImageUrl ? (
                                    <img 
                                        src={profileImageUrl} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.onerror = null; // prevent looping
                                            target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                            target.outerHTML = `<svg class="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
                                          }}
                                    />
                                ) : (
                                    <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow">
                             <h3 className="text-3xl font-bold text-navy">{fullName}</h3>
                             <p className="text-xl text-secondary-gray mb-4">{personnel.position}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                <DetailItem label="วันเดือนปีเกิด" value={personnel.dob} />
                                <DetailItem label="อายุ" value={`${calculateAge(personnel.dob)} ปี`} />
                                <DetailItem label="เลขบัตรประชาชน" value={personnel.idCard} />
                                <DetailItem label="เบอร์โทร" value={personnel.phone} />
                                <DetailItem label="วันที่บรรจุ" value={personnel.appointmentDate} />
                                <DetailItem label="เลขตำแหน่ง" value={personnel.positionNumber} />
                                <DetailItem label="ครูที่ปรึกษา" value={advisoryClassesText} fullWidth />
                            </div>
                        </div>
                    </div>
                </div>

                 <div className="p-4 border-t bg-light-gray rounded-b-xl flex justify-end">
                    <button type="button" onClick={onClose} className="bg-primary-blue hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg">
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewPersonnelModal;
