
import React, { useState } from 'react';
import { Personnel } from '../types';
import { postToGoogleScript, prepareDataForApi } from '../utils';
import RegisterModal from './RegisterModal';
import { POSITIONS } from '../constants';

interface LandingPageProps {
    onLoginSuccess: (user: Personnel) => void;
    schoolName: string;
    schoolLogo: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess, schoolName, schoolLogo }) => {
    const [idCard, setIdCard] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBackendCode, setShowBackendCode] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

    // Register State
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setShowBackendCode(false);

        try {
            // Attempt server-side login
            const response = await postToGoogleScript({
                action: 'login',
                idCard: idCard.trim(), 
                password: password.trim()
            });

            if (response.status === 'success' && response.data) {
                onLoginSuccess(response.data);
            } else {
                // Throw error to be caught by catch block
                throw new Error(response.message || 'เข้าสู่ระบบไม่สำเร็จ ตรวจสอบข้อมูลอีกครั้ง');
            }
        } catch (err: any) {
            console.error("Login Failed:", err);
            
            const errorMessage = err.message || '';
            
            // 1. Check for specific Auth Failures (User error) - Do NOT show update code button
            if (errorMessage.includes('ไม่ถูกต้อง') || errorMessage.includes('รอการอนุมัติ') || errorMessage.includes('ระงับ') || errorMessage.includes('approval')) {
                // Remove "Google Script Error:" prefix if present for cleaner display
                const cleanMsg = errorMessage.replace('Google Script Error:', '').trim();
                setError(cleanMsg);
                setShowBackendCode(false);
            } 
            // 2. Check for Script Version/Syntax Errors (System error) - Show update code button
            else if (errorMessage.includes('Invalid action') || errorMessage.includes('Unknown action') || errorMessage.includes('ยังไม่อัปเดตฟังก์ชัน') || errorMessage.includes('Unexpected token')) {
                 setError('ระบบ Backend ยังไม่ได้อัปเดตโค้ดล่าสุด (Invalid action: login)');
                 setShowBackendCode(true);
            } 
            // 3. Generic/Network Errors
            else {
                 setError(errorMessage || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
                 setShowBackendCode(false); 
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (newPersonnel: Personnel) => {
        setIsRegistering(true);
        try {
            const apiPayload = await prepareDataForApi(newPersonnel);
            const response = await postToGoogleScript({ action: 'addPersonnel', data: apiPayload });
            
            if (response.status === 'success') {
                alert('ลงทะเบียนสำเร็จ! กรุณารอการอนุมัติจากผู้ดูแลระบบก่อนเข้าใช้งาน');
                setIsRegisterOpen(false);
            } else {
                alert('เกิดข้อผิดพลาด: ' + response.message);
            }
        } catch (error: any) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message);
        } finally {
            setIsRegistering(false);
        }
    };

    const backendCode = `/**
 * KSP Management System - Backend Script (Version 2025.11 - Full Features)
 * รองรับ: ระบบเช็คชื่อ, เยี่ยมบ้าน (GPS), SDQ, โภชนาการ, แผนงาน, พัสดุ, ครุภัณฑ์ ฯลฯ
 */

const FOLDER_NAME = "KSP_Management_System_Uploads"; 

// รายชื่อ Sheet ทั้งหมดในระบบ
const SHEET_NAMES = {
  REPORTS: "Reports",
  STUDENTS: "Students",
  PERSONNEL: "Personnel",
  SETTINGS: "Settings",
  STUDENT_ATTENDANCE: "StudentAttendance",
  PERSONNEL_ATTENDANCE: "PersonnelAttendance",
  ACADEMIC_PLANS: "AcademicPlans",
  SERVICE_RECORDS: "ServiceRecords",
  SUPPLY_ITEMS: "SupplyItems",
  SUPPLY_REQUESTS: "SupplyRequests",
  DURABLE_GOODS: "DurableGoods",
  CERTIFICATE_REQUESTS: "CertificateRequests",
  MAINTENANCE_REQUESTS: "MaintenanceRequests",
  PERFORMANCE_REPORTS: "PerformanceReports",
  SAR_REPORTS: "SARReports",
  DOCUMENTS: "GeneralDocuments",
  CONSTRUCTION_RECORDS: "ConstructionRecords",
  PROJECT_PROPOSALS: "ProjectProposals",
  HOME_VISITS: "HomeVisits",
  SDQ_RECORDS: "SDQRecords",
  MEAL_PLANS: "MealPlans",
  INGREDIENTS: "Ingredients"
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_NAMES).forEach(key => {
    const name = SHEET_NAMES[key];
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name).appendRow(['id', 'created_at']);
    }
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return responseJSON({ status: 'error', message: 'Server is busy, please try again.' });
  }

  try {
    if (!e.postData || !e.postData.contents) throw new Error("No data received");

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const data = request.data;
    
    // Login Handling
    if (action === 'login') {
      const user = handleLogin(request.idCard, request.password);
      if (user) {
         return responseJSON({ status: 'success', data: user });
      } else {
         return responseJSON({ status: 'error', message: 'เลขบัตรประชาชนหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีรอการอนุมัติ' });
      }
    }

    let output = {};
    const uploadFolder = getUploadFolder();

    // Action Routing
    switch (action) {
      // --- Basic Data & Settings ---
      case 'getAllData': output = getAllData(); break;
      case 'updateSettings': output = saveSettings(data, uploadFolder); break;

      // --- Core Data Management ---
      case 'addReport':
      case 'updateReport': output = saveRecord(getSheet(SHEET_NAMES.REPORTS), data, uploadFolder); break;
      case 'deleteReports': output = deleteRecords(getSheet(SHEET_NAMES.REPORTS), request.ids); break;

      case 'addStudent':
      case 'updateStudent': output = saveRecord(getSheet(SHEET_NAMES.STUDENTS), data, uploadFolder); break;
      case 'deleteStudents': output = deleteRecords(getSheet(SHEET_NAMES.STUDENTS), request.ids); break;

      case 'addPersonnel':
      case 'updatePersonnel': output = saveRecord(getSheet(SHEET_NAMES.PERSONNEL), data, uploadFolder); break;
      case 'deletePersonnel': output = deleteRecords(getSheet(SHEET_NAMES.PERSONNEL), request.ids); break;

      // --- Attendance ---
      case 'saveStudentAttendance': output = batchUpdateAttendance(getSheet(SHEET_NAMES.STUDENT_ATTENDANCE), data); break;
      case 'savePersonnelAttendance': output = batchUpdateAttendance(getSheet(SHEET_NAMES.PERSONNEL_ATTENDANCE), data); break;

      // --- Academic ---
      case 'saveAcademicPlan': output = saveRecord(getSheet(SHEET_NAMES.ACADEMIC_PLANS), data, uploadFolder); break;
      case 'updateAcademicPlanStatus': output = patchRecord(getSheet(SHEET_NAMES.ACADEMIC_PLANS), data, uploadFolder); break;
      case 'saveServiceRecord': output = saveRecord(getSheet(SHEET_NAMES.SERVICE_RECORDS), data, uploadFolder); break;
      case 'deleteServiceRecords': output = deleteRecords(getSheet(SHEET_NAMES.SERVICE_RECORDS), request.ids); break;

      // --- Finance & Supply ---
      case 'saveSupplyItem': output = saveRecord(getSheet(SHEET_NAMES.SUPPLY_ITEMS), data, uploadFolder); break;
      case 'deleteSupplyItems': output = deleteRecords(getSheet(SHEET_NAMES.SUPPLY_ITEMS), request.ids); break;
      case 'saveSupplyRequest': output = saveRecord(getSheet(SHEET_NAMES.SUPPLY_REQUESTS), data, uploadFolder); break;
      case 'updateSupplyRequestStatus': output = patchRecord(getSheet(SHEET_NAMES.SUPPLY_REQUESTS), data, uploadFolder); break;
      
      case 'saveDurableGood': output = saveRecord(getSheet(SHEET_NAMES.DURABLE_GOODS), data, uploadFolder); break;
      case 'deleteDurableGoods': output = deleteRecords(getSheet(SHEET_NAMES.DURABLE_GOODS), request.ids); break;

      case 'saveProjectProposal': output = saveRecord(getSheet(SHEET_NAMES.PROJECT_PROPOSALS), data, uploadFolder); break;
      case 'deleteProjectProposals': output = deleteRecords(getSheet(SHEET_NAMES.PROJECT_PROPOSALS), request.ids); break;

      // --- General Affairs ---
      case 'saveCertificateRequest': output = saveRecord(getSheet(SHEET_NAMES.CERTIFICATE_REQUESTS), data, uploadFolder); break;
      case 'deleteCertificateRequests': output = deleteRecords(getSheet(SHEET_NAMES.CERTIFICATE_REQUESTS), request.ids); break;

      case 'saveMaintenanceRequest': output = saveRecord(getSheet(SHEET_NAMES.MAINTENANCE_REQUESTS), data, uploadFolder); break;
      case 'deleteMaintenanceRequests': output = deleteRecords(getSheet(SHEET_NAMES.MAINTENANCE_REQUESTS), request.ids); break;

      case 'saveDocument': output = saveRecord(getSheet(SHEET_NAMES.DOCUMENTS), data, uploadFolder); break;
      case 'deleteDocuments': output = deleteRecords(getSheet(SHEET_NAMES.DOCUMENTS), request.ids); break;

      case 'saveConstructionRecord': output = saveRecord(getSheet(SHEET_NAMES.CONSTRUCTION_RECORDS), data, uploadFolder); break;
      case 'deleteConstructionRecords': output = deleteRecords(getSheet(SHEET_NAMES.CONSTRUCTION_RECORDS), request.ids); break;

      case 'saveMealPlan': output = saveRecord(getSheet(SHEET_NAMES.MEAL_PLANS), data, uploadFolder); break;
      case 'deleteMealPlans': output = deleteRecords(getSheet(SHEET_NAMES.MEAL_PLANS), request.ids); break;
      case 'saveIngredient': output = saveRecord(getSheet(SHEET_NAMES.INGREDIENTS), data, uploadFolder); break;
      case 'deleteIngredients': output = deleteRecords(getSheet(SHEET_NAMES.INGREDIENTS), request.ids); break;

      // --- Personnel Affairs ---
      case 'savePerformanceReport': output = saveRecord(getSheet(SHEET_NAMES.PERFORMANCE_REPORTS), data, uploadFolder); break;
      case 'deletePerformanceReports': output = deleteRecords(getSheet(SHEET_NAMES.PERFORMANCE_REPORTS), request.ids); break;

      case 'saveSARReport': output = saveRecord(getSheet(SHEET_NAMES.SAR_REPORTS), data, uploadFolder); break;
      case 'deleteSARReports': output = deleteRecords(getSheet(SHEET_NAMES.SAR_REPORTS), request.ids); break;

      // --- Student Affairs ---
      case 'saveHomeVisit': output = saveRecord(getSheet(SHEET_NAMES.HOME_VISITS), data, uploadFolder); break;
      case 'deleteHomeVisits': output = deleteRecords(getSheet(SHEET_NAMES.HOME_VISITS), request.ids); break;

      case 'saveSDQRecord': output = saveRecord(getSheet(SHEET_NAMES.SDQ_RECORDS), data, uploadFolder); break;
      case 'deleteSDQRecords': output = deleteRecords(getSheet(SHEET_NAMES.SDQ_RECORDS), request.ids); break;

      default: throw new Error("Invalid action: " + action);
    }

    return responseJSON({ status: 'success', data: output });
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString(), stack: error.stack });
  } finally {
    lock.releaseLock();
  }
}

// --- Helper Functions ---

function getSpreadsheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getAllData() {
  const result = {};
  const ss = getSpreadsheet();
  
  // Settings
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet && settingsSheet.getLastRow() > 0) {
    try {
      const json = settingsSheet.getRange(1, 1).getValue();
      result.settings = json ? JSON.parse(json) : {};
    } catch(e) { result.settings = {}; }
  }

  // Fetch all other sheets mapped to frontend keys
  Object.keys(SHEET_NAMES).forEach(key => {
    if (key !== 'SETTINGS') {
        const sheetName = SHEET_NAMES[key];
        const frontendKey = getFrontendKey(key);
        const sheet = ss.getSheetByName(sheetName);
        result[frontendKey] = sheet ? readSheet(sheet) : [];
    }
  });
  return result;
}

function getFrontendKey(constKey) {
    const map = {
        REPORTS: 'reports', STUDENTS: 'students', PERSONNEL: 'personnel',
        STUDENT_ATTENDANCE: 'studentAttendance', PERSONNEL_ATTENDANCE: 'personnelAttendance',
        ACADEMIC_PLANS: 'academicPlans', SERVICE_RECORDS: 'serviceRecords',
        SUPPLY_ITEMS: 'supplyItems', SUPPLY_REQUESTS: 'supplyRequests',
        DURABLE_GOODS: 'durableGoods', CERTIFICATE_REQUESTS: 'certificateRequests',
        MAINTENANCE_REQUESTS: 'maintenanceRequests', PERFORMANCE_REPORTS: 'performanceReports',
        SAR_REPORTS: 'sarReports', DOCUMENTS: 'documents',
        CONSTRUCTION_RECORDS: 'constructionRecords', PROJECT_PROPOSALS: 'projectProposals',
        HOME_VISITS: 'homeVisits', SDQ_RECORDS: 'sdqRecords',
        MEAL_PLANS: 'mealPlans', INGREDIENTS: 'ingredients'
    };
    return map[constKey] || constKey.toLowerCase();
}

function handleLogin(idCard, password) {
  const sheet = getSheet(SHEET_NAMES.PERSONNEL);
  const data = readSheet(sheet);
  const cleanInput = String(idCard).replace(/[^0-9]/g, '');
  
  const user = data.find(p => {
    const pId = String(p.idCard || '').replace(/[^0-9]/g, '');
    return pId === cleanInput;
  });

  if (!user) return null;

  if (user.status && user.status !== 'approved' && user.status !== '') {
      return null;
  }

  const userPass = user.password || String(user.idCard);
  if (String(userPass) === String(password)) {
    user.token = Utilities.base64Encode(user.id + "_" + new Date().getTime());
    return user;
  }
  return null;
}

function saveSettings(settings, uploadFolder) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
  processFilesRecursively(settings, uploadFolder);
  const json = JSON.stringify(settings);
  sheet.clear();
  sheet.getRange(1, 1).setValue(json);
  return settings;
}

function saveRecord(sheet, dataObj, uploadFolder) {
  processFilesRecursively(dataObj, uploadFolder);
  ensureHeaders(sheet, dataObj);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (!dataObj.id) dataObj.id = getNextId(sheet);
  
  let rowIndex = -1;
  const idStr = String(dataObj.id);
  const idIndex = headers.indexOf('id');
  
  if (sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
    const matchIdx = ids.findIndex(id => String(id).replace(/"/g, '') === idStr);
    if (matchIdx !== -1) rowIndex = matchIdx + 2;
  }
  
  const rowData = headers.map(header => {
    let val = dataObj[header];
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return val === undefined ? '' : val;
  });
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);
  
  return dataObj;
}

function patchRecord(sheet, partialData, uploadFolder) {
  processFilesRecursively(partialData, uploadFolder);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) throw new Error("Sheet missing 'id' header");
  if (!partialData.id) throw new Error("ID required for update");
  
  const idStr = String(partialData.id);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    const rowId = String(values[i][idIndex]).replace(/"/g, '');
    if (rowId === idStr) {
      const currentRow = values[i];
      const newRow = headers.map((header, colIdx) => {
        if (partialData.hasOwnProperty(header)) {
           let val = partialData[header];
           if (typeof val === 'object' && val !== null) return JSON.stringify(val);
           return val;
        }
        return currentRow[colIdx];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
      
      const fullRecord = {};
      headers.forEach((h, idx) => {
          let v = newRow[idx];
          if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
             try { v = JSON.parse(v); } catch(e) {}
          }
          fullRecord[h] = v;
      });
      return fullRecord;
    }
  }
  throw new Error("Record not found: " + partialData.id);
}

function batchUpdateAttendance(sheet, records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  ensureHeaders(sheet, records[0]);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIndex = headers.indexOf('id');
  const existingMap = new Map();
  
  if (sheet.getLastRow() > 1) {
    const idData = sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
    idData.forEach((row, index) => existingMap.set(String(row[0]).replace(/"/g, ''), index + 2));
  }
  
  const rowsToAppend = [];
  records.forEach(record => {
    const rowData = headers.map(header => {
      let val = record[header];
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val === undefined ? '' : val;
    });
    const recordId = String(record.id);
    if (existingMap.has(recordId)) {
      sheet.getRange(existingMap.get(recordId), 1, 1, headers.length).setValues([rowData]);
    } else {
      rowsToAppend.push(rowData);
    }
  });
  
  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
  return records;
}

function deleteRecords(sheet, ids) {
  if (!sheet || !ids || ids.length === 0) return { success: true };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColumnIndex = headers.indexOf('id');
  if (idColumnIndex === -1) return { error: "ID column not found" };
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const rows = values.slice(1);
  const idsStr = ids.map(String);
  
  const remainingRows = rows.filter(r => {
      const rowId = String(r[idColumnIndex]).replace(/"/g, '');
      return !idsStr.includes(rowId);
  });
  
  if (remainingRows.length !== rows.length) {
    const header = values[0];
    sheet.clearContents();
    sheet.appendRow(header);
    if (remainingRows.length > 0) {
      sheet.getRange(2, 1, remainingRows.length, header.length).setValues(remainingRows);
    }
  }
  return { deletedCount: rows.length - remainingRows.length };
}

function readSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      if (header) {
        let val = row[i];
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          try { val = JSON.parse(val); } catch(e) {}
        }
        obj[header] = val;
      }
    });
    return obj;
  });
}

function ensureHeaders(sheet, dataObj) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(Object.keys(dataObj));
    return;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newKeys = Object.keys(dataObj).filter(k => !headers.includes(k));
  if (newKeys.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, newKeys.length).setValues([newKeys]);
  }
}

function getNextId(sheet) {
  if (sheet.getLastRow() < 2) return Date.now();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = headers.indexOf('id');
  if (idIdx === -1) return Date.now();
  const ids = sheet.getRange(2, idIdx + 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
  const maxId = ids.reduce((max, val) => {
    let n = Number(String(val).replace(/"/g, ''));
    return (!isNaN(n) && n > max) ? n : max;
  }, 0);
  return Math.max(Date.now(), maxId + 1);
}

function processFilesRecursively(obj, uploadFolder) {
  for (const key in obj) {
    const val = obj[key];
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        if (isBase64File(val[i])) val[i] = uploadToDrive(val[i], uploadFolder);
      }
    } else if (isBase64File(val)) {
      obj[key] = uploadToDrive(val, uploadFolder);
    }
  }
}

function isBase64File(item) {
    return typeof item === 'object' && item !== null && item.data && item.mimeType && item.filename;
}

function uploadToDrive(fileObj, folder) {
  try {
    const decoded = Utilities.base64Decode(fileObj.data);
    const blob = Utilities.newBlob(decoded, fileObj.mimeType, fileObj.filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error: " + e.toString(); }
}

function getUploadFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
                <div className="text-center mb-8">
                    <img 
                        src={schoolLogo} 
                        alt="Logo" 
                        className="w-24 h-24 mx-auto mb-4 object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://img5.pic.in.th/file/secure-sv1/-15bb7f54b4639a903.png')}
                    />
                    <h1 className="text-2xl font-bold text-navy">{schoolName}</h1>
                    <p className="text-gray-500 text-sm mt-1">KSP Management</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex flex-col gap-2 animate-pulse">
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                                <p className="font-bold">เกิดข้อผิดพลาด</p>
                                <p>{error}</p>
                            </div>
                        </div>
                        {showBackendCode && (
                            <button 
                                onClick={() => setIsCodeModalOpen(true)}
                                className="self-end mt-1 text-xs underline hover:text-red-900 font-bold bg-white/50 px-2 py-1 rounded"
                            >
                                คลิกเพื่อรับโค้ด Google Script ล่าสุด (v2025.11 - รองรับทุกระบบ)
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                        <input
                            type="text"
                            value={idCard}
                            onChange={(e) => setIdCard(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none transition-all"
                            placeholder="เลขบัตรประชาชน 13 หลัก"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none transition-all"
                            placeholder="รหัสผ่าน"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-blue hover:bg-primary-hover text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังเข้าสู่ระบบ...
                            </>
                        ) : 'เข้าสู่ระบบ'}
                    </button>
                </form>
                
                <div className="mt-6 flex flex-col items-center gap-4 text-sm">
                    <button 
                        onClick={() => setIsRegisterOpen(true)}
                        className="text-primary-blue hover:text-blue-800 font-bold underline decoration-dotted underline-offset-2"
                    >
                        ลงทะเบียนบุคลากรใหม่
                    </button>
                    <span className="text-gray-400 text-xs">&copy; {new Date().getFullYear()} KSP Management System</span>
                </div>
            </div>

            <RegisterModal 
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onRegister={handleRegisterSubmit}
                positions={POSITIONS}
                isSaving={isRegistering}
            />

            {/* Backend Code Modal */}
            {isCodeModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-fade-in-up">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                                <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                อัปเดตระบบ (Google Apps Script Code)
                            </h3>
                            <button onClick={() => setIsCodeModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-4 bg-yellow-50 text-sm text-yellow-800 border-b border-yellow-100">
                            <p className="font-bold mb-1">วิธีแก้ไขปัญหา "Invalid action" หรือ "Login Error":</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                                <li>คัดลอกโค้ดด้านล่างทั้งหมด (กดปุ่มสีน้ำเงิน)</li>
                                <li>ไปที่ <b>Google Apps Script</b> ของโปรเจกต์เดิม</li>
                                <li>วางทับโค้ดเก่าทั้งหมดในไฟล์ <b>รหัส.gs (Code.gs)</b></li>
                                <li>กด <b>Save</b> (รูปแผ่นดิสก์)</li>
                                <li>กด <b>Deploy</b> &gt; <b>New Deployment</b> (สำคัญ! ต้อง New Deployment เท่านั้น)</li>
                                <li>เลือก type: <b>Web app</b>, Execute as: <b>Me</b>, Who has access: <b>Anyone</b></li>
                                <li>กด Deploy และนำ URL ใหม่มาใช้ (หรือถ้า URL เดิมเปลี่ยนอัตโนมัติก็ลองใช้งานดู)</li>
                            </ol>
                        </div>
                        <div className="flex-grow p-0 relative">
                            <textarea 
                                className="w-full h-full p-4 font-mono text-xs resize-none focus:outline-none text-gray-700 bg-gray-50"
                                readOnly
                                value={backendCode}
                                onClick={(e) => e.currentTarget.select()}
                            />
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(backendCode);
                                    alert('คัดลอกโค้ดเรียบร้อยแล้ว! กรุณานำไปวางใน Google Apps Script');
                                }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                คัดลอกโค้ดทั้งหมด
                            </button>
                            <button onClick={() => setIsCodeModalOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
