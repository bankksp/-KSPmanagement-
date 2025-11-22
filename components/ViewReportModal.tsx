
import React, { useState, useMemo, useEffect } from 'react';
import { Report } from '../types';
import { getDirectDriveImageSrc, safeParseArray } from '../utils';

interface ViewReportModalProps {
    report: Report;
    onClose: () => void;
}

const ViewReportModal: React.FC<ViewReportModalProps> = ({ report, onClose }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const imagePreviews = useMemo(() => {
        const images = safeParseArray(report.images);
        return images.map(img => getDirectDriveImageSrc(img));
    }, [report.images]);

    const studentData = useMemo(() => {
        if (!report.studentDetails) return null;
        try {
            const parsed = JSON.parse(report.studentDetails) as { name: string, nickname: string, status: string }[];
            return {
                present: parsed.filter(s => s.status === 'present'),
                sick: parsed.filter(s => s.status === 'sick'),
                home: parsed.filter(s => s.status === 'home'),
                recovered: parsed.filter(s => s.status === 'recovered'),
            };
        } catch (e) {
            return null;
        }
    }, [report.studentDetails]);

    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [imagePreviews]);

    const goToNextImage = () => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagePreviews.length);
    };

    const goToPreviousImage = () => {
        setCurrentImageIndex(prevIndex => (prevIndex - 1 + imagePreviews.length) % imagePreviews.length);
    };

    const DetailItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
        <div>
            <p className="text-sm font-medium text-secondary-gray">{label}</p>
            <p className="text-md font-semibold text-navy">{value}</p>
        </div>
    );

    const StudentList: React.FC<{ title: string, students: { name: string, nickname: string }[], colorClass: string }> = ({ title, students, colorClass }) => (
        students.length > 0 ? (
            <div className="mb-4">
                <h4 className={`font-bold text-sm mb-2 ${colorClass}`}>{title} ({students.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {students.map((s, i) => (
                        <div key={i} className="text-sm bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="font-medium text-gray-800">{s.name}</span>
                            {s.nickname && <span className="text-gray-500 ml-2">({s.nickname})</span>}
                        </div>
                    ))}
                </div>
            </div>
        ) : null
    );

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.currentTarget;
        target.onerror = null; 
        target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
        target.outerHTML = `
            <div class="flex flex-col items-center justify-center text-gray-500">
                <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.293 11.707a1 1 0 011.414 0L10 12.586l.293-.293a1 1 0 111.414 1.414l-1 1a1 1 0 01-1.414 0l-1-1a1 1 0 010-1.414zM10 6a1 1 0 110 2 1 1 0 010-2z" /></svg>
                <span class="mt-2 text-sm">ไม่สามารถโหลดรูปภาพได้</span>
            </div>`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-navy">รายละเอียดรายงาน</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                         {/* Basic Info */}
                        <div className="space-y-4">
                            <DetailItem label="วันที่/เวลา รายงาน" value={`${report.reportDate}${report.reportTime ? ` ${report.reportTime} น.` : ''}`} />
                            <DetailItem label="ชื่อผู้รายงาน" value={report.reporterName} />
                            <DetailItem label="ตำแหน่ง" value={report.position} />
                            <DetailItem label="ปีการศึกษา" value={report.academicYear} />
                            <DetailItem label="เรือนนอน" value={report.dormitory} />
                            
                            <div className="flex gap-4 mt-2">
                                {report.dormitory !== 'เรือนพยาบาล' && (
                                    <>
                                        <div className="text-center bg-green-50 p-2 rounded-lg min-w-[80px]">
                                            <span className="block text-xs text-green-600 font-bold">มาเรียน</span>
                                            <span className="block text-xl font-bold text-green-700">{report.presentCount}</span>
                                        </div>
                                        <div className="text-center bg-red-50 p-2 rounded-lg min-w-[80px]">
                                            <span className="block text-xs text-red-600 font-bold">ป่วย</span>
                                            <span className="block text-xl font-bold text-red-700">{report.sickCount}</span>
                                        </div>
                                        <div className="text-center bg-gray-100 p-2 rounded-lg min-w-[80px]">
                                            <span className="block text-xs text-gray-600 font-bold">อยู่บ้าน</span>
                                            <span className="block text-xl font-bold text-gray-700">{report.homeCount ?? '-'}</span>
                                        </div>
                                    </>
                                )}
                                {report.dormitory === 'เรือนพยาบาล' && (
                                     <div className="text-center bg-red-50 p-2 rounded-lg min-w-[80px]">
                                        <span className="block text-xs text-red-600 font-bold">ป่วย</span>
                                        <span className="block text-xl font-bold text-red-700">{report.sickCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Image Slideshow */}
                        <div>
                            <h3 className="text-lg font-bold text-navy mb-2">รูปภาพประกอบ</h3>
                            {imagePreviews.length > 0 ? (
                                <div className="relative">
                                    <img 
                                        src={imagePreviews[currentImageIndex]} 
                                        alt={`report image ${currentImageIndex + 1}`}
                                        className="w-full h-64 object-cover rounded-lg shadow-md bg-gray-200"
                                        onError={handleImageError}
                                    />
                                    {imagePreviews.length > 1 && (
                                        <>
                                            <button onClick={goToPreviousImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity">
                                                &#10094;
                                            </button>
                                            <button onClick={goToNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity">
                                                &#10095;
                                            </button>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white text-sm px-3 py-1 rounded-full">
                                                {currentImageIndex + 1} / {imagePreviews.length}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-64 bg-light-gray rounded-lg border border-dashed border-gray-300">
                                    <p className="text-secondary-gray">ไม่มีรูปภาพประกอบ</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Student List Section */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-bold text-navy mb-4">รายชื่อนักเรียน</h3>
                        
                        {studentData ? (
                            <div className="space-y-4">
                                {report.dormitory === 'เรือนพยาบาล' ? (
                                    <>
                                        <StudentList title="นักเรียนป่วย" students={studentData.sick} colorClass="text-red-600" />
                                        <StudentList title="หายป่วยแล้ว" students={studentData.recovered} colorClass="text-green-600" />
                                    </>
                                ) : (
                                    <>
                                        <StudentList title="มาเรียน" students={studentData.present} colorClass="text-green-600" />
                                        <StudentList title="ป่วย" students={studentData.sick} colorClass="text-red-600" />
                                        <StudentList title="อยู่บ้าน/ลา" students={studentData.home} colorClass="text-gray-600" />
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <p className="text-gray-600 mb-2 font-medium">ไม่มีข้อมูลรายชื่อละเอียดในรายงานนี้ (บันทึกด้วยระบบเก่า)</p>
                                <p className="text-sm font-bold text-navy">บันทึกเหตุการณ์เดิม:</p>
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans mt-1">{report.log || '-'}</pre>
                            </div>
                        )}
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

export default ViewReportModal;
