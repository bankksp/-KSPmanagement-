
import React, { useMemo, useEffect } from 'react';
import { Student, Personnel } from '../types';
import { getFirstImageSource, getDirectDriveImageSrc, safeParseArray } from '../utils';

interface ViewStudentModalProps {
    student: Student;
    onClose: () => void;
    personnel: Personnel[];
}

const ViewStudentModal: React.FC<ViewStudentModalProps> = ({ student, onClose, personnel }) => {

    const profileImageUrl = useMemo(() => {
        return getFirstImageSource(student.studentProfileImage);
    }, [student.studentProfileImage]);

    const homeroomTeacherNames = useMemo(() => {
        return (student.homeroomTeachers || [])
            .map(id => {
                const teacher = personnel.find(p => p.id === id);
                if (!teacher) return null;
                const title = teacher.personnelTitle === 'อื่นๆ' ? teacher.personnelTitleOther : teacher.personnelTitle;
                return `${title} ${teacher.personnelName}`;
            })
            .filter(Boolean)
            .join(', ');
    }, [student.homeroomTeachers, personnel]);


    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);

    const DetailSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
        <div className="mb-6">
            <h3 className="text-lg font-bold text-navy border-b-2 border-navy pb-1 mb-3">{title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                {children}
            </div>
        </div>
    );

    const DetailItem: React.FC<{ label: string; value?: string | number; fullWidth?: boolean }> = ({ label, value, fullWidth = false }) => (
        <div className={fullWidth ? 'sm:col-span-2 md:col-span-3' : ''}>
            <p className="text-sm font-medium text-secondary-gray">{label}</p>
            <p className="text-md font-semibold text-gray-800 break-words">{value || '-'}</p>
        </div>
    );
    
    const DocumentViewer: React.FC<{ title: string, files?: (File|string)[]}> = ({ title, files }) => {
        const safeFiles = safeParseArray(files);
        if (!safeFiles || safeFiles.length === 0) {
            return (
                <div>
                    <h4 className="font-semibold text-gray-700">{title}</h4>
                    <p className="text-sm text-gray-500">ไม่มีไฟล์</p>
                </div>
            );
        }

        // Use helper for documents too if possible, or fallback
        let file = safeFiles[0];
        
        if (typeof file === 'string') {
             // Try to clean if it's a Google Drive URL
             const cleanUrl = getDirectDriveImageSrc(file);
             const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(cleanUrl) || cleanUrl.includes('googleusercontent.com');
             
             return (
                <div>
                     <h4 className="font-semibold text-gray-700">{title}</h4>
                    {isImage ? (
                         <a href={cleanUrl} target="_blank" rel="noopener noreferrer"><img src={cleanUrl} alt={title} className="mt-1 max-w-full h-auto rounded-lg border"/></a>
                    ) : (
                        <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline">ดูเอกสาร</a>
                    )}
                </div>
            )
        }

        if (file instanceof File) {
            const isImage = file.type.startsWith('image/');
            const url = URL.createObjectURL(file);
    
            useEffect(() => {
                return () => URL.revokeObjectURL(url);
            }, [url]);

            return (
                <div>
                     <h4 className="font-semibold text-gray-700">{title}</h4>
                    {isImage ? (
                         <img src={url} alt={title} className="mt-1 max-w-full h-auto rounded-lg border"/>
                    ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline">{file.name}</a>
                    )}
                </div>
            )
        }
        return null;
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-navy">รายละเอียดข้อมูลนักเรียน</h2>
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
                             <h3 className="text-3xl font-bold text-navy">{`${student.studentTitle} ${student.studentName}`}</h3>
                             <p className="text-xl text-secondary-gray mb-4">{student.studentNickname}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                <DetailItem label="ชั้น" value={student.studentClass} />
                                <DetailItem label="เรือนนอน" value={student.dormitory} />
                                <DetailItem label="เลขบัตรประชาชน" value={student.studentIdCard} />
                                <DetailItem label="วันเกิด" value={student.studentDob} />
                                <DetailItem label="เบอร์โทร" value={student.studentPhone} />
                                <DetailItem label="ครูประจำชั้น" value={homeroomTeacherNames} />
                                <DetailItem label="ที่อยู่" value={student.studentAddress} fullWidth/>
                            </div>
                        </div>
                    </div>
                    

                     <DetailSection title="ข้อมูลครอบครัว">
                        <DetailItem label="ชื่อ-นามสกุลบิดา" value={student.fatherName} />
                        <DetailItem label="เลขบัตรประชาชนบิดา" value={student.fatherIdCard} />
                        <DetailItem label="เบอร์โทรบิดา" value={student.fatherPhone} />
                        <DetailItem label="ที่อยู่บิดา" value={student.fatherAddress} fullWidth/>

                        <DetailItem label="ชื่อ-นามสกุลมารดา" value={student.motherName} />
                        <DetailItem label="เลขบัตรประชาชนมารดา" value={student.motherIdCard} />
                        <DetailItem label="เบอร์โทรมารดา" value={student.motherPhone} />
                        <DetailItem label="ที่อยู่มารดา" value={student.motherAddress} fullWidth/>

                        <DetailItem label="ชื่อ-นามสกุลผู้ปกครอง" value={student.guardianName} />
                        <DetailItem label="เลขบัตรประชาชนผู้ปกครอง" value={student.guardianIdCard} />
                        <DetailItem label="เบอร์โทรผู้ปกครอง" value={student.guardianPhone} />
                        <DetailItem label="ที่อยู่ผู้ปกครอง" value={student.guardianAddress} fullWidth/>
                    </DetailSection>

                    <DetailSection title="เอกสารแนบ">
                        <DocumentViewer title="บัตรประชาชนนักเรียน" files={student.studentIdCardImage} />
                        <DocumentViewer title="บัตรคนพิการ" files={student.studentDisabilityCardImage} />
                        <DocumentViewer title="บัตรประชาชนผู้ปกครอง" files={student.guardianIdCardImage} />
                    </DetailSection>
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

export default ViewStudentModal;
