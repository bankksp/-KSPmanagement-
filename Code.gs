
/**
 * KSP Management System - Backend Script (Version 2025.17 - Full Router Implementation)
 */

const FOLDER_NAME = "KSP_Management_System_Uploads"; 
const SCHOOL_NAME = "โรงเรียนกาฬสินธุ์ปัญญานุกูล";

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
  INGREDIENTS: "Ingredients",
  OTP_STORE: "OTPStore" 
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return responseJSON({ status: 'error', message: 'Server busy' });

  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const data = request.data;
    const uploadFolder = getUploadFolder();
    
    // --- 1. Authentication & OTP ---

    if (action === 'checkDuplicateAndSendOTP') {
      const personnelSheet = getSheet(SHEET_NAMES.PERSONNEL);
      const existingData = readSheet(personnelSheet);
      
      const isIdDup = existingData.some(p => String(p.idCard) === String(request.idCard));
      const isEmailDup = existingData.some(p => String(p.email).toLowerCase() === String(request.email).toLowerCase());
      
      if (isIdDup) return responseJSON({ status: 'error', message: 'เลขบัตรประชาชนนี้เคยลงทะเบียนในระบบแล้ว' });
      if (isEmailDup) return responseJSON({ status: 'error', message: 'อีเมลนี้เคยลงทะเบียนในระบบแล้ว' });

      // Send OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const otpSheet = getSheet(SHEET_NAMES.OTP_STORE);
      otpSheet.appendRow([request.email, code, new Date().getTime()]);
      
      const subject = `รหัสยืนยันตัวตน (OTP) สำหรับลงทะเบียน - ${SCHOOL_NAME}`;
      const htmlBody = `
        <div style="font-family: sans-serif; padding: 30px; border: 1px solid #e2e8f0; border-radius: 24px; max-width: 450px; margin: auto; background-color: #f8fafc;">
          <h2 style="color: #1e3a8a; text-align: center; margin-top: 0;">KSP Management</h2>
          <p style="text-align: center; color: #64748b;">รหัสผ่านชั่วคราวเพื่อยืนยันอีเมลของท่านคือ:</p>
          <div style="background: #ffffff; padding: 25px; border-radius: 20px; text-align: center; font-size: 42px; font-weight: 900; color: #2563eb; letter-spacing: 8px; border: 1px solid #e2e8f0; margin: 20px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            ${code}
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">* รหัสมีอายุการใช้งาน 5 นาที</p>
        </div>
      `;
      MailApp.sendEmail({ to: request.email, subject: subject, htmlBody: htmlBody });
      return responseJSON({ status: 'success' });
    }

    if (action === 'verifyEmailCode') {
      const otpSheet = getSheet(SHEET_NAMES.OTP_STORE);
      const rows = otpSheet.getDataRange().getValues();
      const now = new Date().getTime();
      let isValid = false;
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][0] === request.email && String(rows[i][1]) === String(request.code)) {
          if (now - rows[i][2] < 300000) { isValid = true; break; }
        }
      }
      return isValid ? responseJSON({ status: 'success' }) : responseJSON({ status: 'error', message: 'Invalid or expired code' });
    }

    if (action === 'login') {
      const personnel = readSheet(getSheet(SHEET_NAMES.PERSONNEL));
      const identifier = String(request.identifier).toLowerCase();
      const user = personnel.find(p => (String(p.idCard) === identifier) || (String(p.email).toLowerCase() === identifier));

      if (!user) return responseJSON({ status: 'error', message: 'ไม่พบผู้ใช้งานในระบบ' });
      if (user.status === 'pending') return responseJSON({ status: 'error', message: 'บัญชีของท่านยังไม่ได้รับอนุมัติ' });
      if (user.status === 'blocked') return responseJSON({ status: 'error', message: 'บัญชีของท่านถูกระงับ' });
      
      const actualPass = user.password || user.idCard;
      if (String(actualPass) === String(request.password)) return responseJSON({ status: 'success', data: user });
      return responseJSON({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // --- 2. Generic Actions Router ---

    if (action === 'getAllData') {
      const allData = {};
      for (const key in SHEET_NAMES) {
        if (key === 'OTP_STORE') continue;
        const sheetName = SHEET_NAMES[key];
        const keyName = sheetName.charAt(0).toLowerCase() + sheetName.slice(1);
        allData[keyName] = readSheet(getSheet(sheetName));
      }
      const settingsList = readSheet(getSheet(SHEET_NAMES.SETTINGS));
      allData.settings = settingsList.length > 0 ? settingsList[0] : null;
      return responseJSON({ status: 'success', data: allData });
    }

    return routeGenericAction(action, request, uploadFolder);

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function routeGenericAction(action, request, uploadFolder) {
  const data = request.data;
  const ids = request.ids;
  
  // Mapping of common actions to sheet names
  const actionToSheetMap = {
    // Save/Update
    'addReport': SHEET_NAMES.REPORTS, 'updateReport': SHEET_NAMES.REPORTS,
    'addPersonnel': SHEET_NAMES.PERSONNEL, 'updatePersonnel': SHEET_NAMES.PERSONNEL,
    'addStudent': SHEET_NAMES.STUDENTS, 'updateStudent': SHEET_NAMES.STUDENTS,
    'saveAcademicPlan': SHEET_NAMES.ACADEMIC_PLANS,
    'updateAcademicPlanStatus': SHEET_NAMES.ACADEMIC_PLANS,
    'saveServiceRecord': SHEET_NAMES.SERVICE_RECORDS,
    'saveSupplyItem': SHEET_NAMES.SUPPLY_ITEMS,
    'saveSupplyRequest': SHEET_NAMES.SUPPLY_REQUESTS,
    'updateSupplyRequestStatus': SHEET_NAMES.SUPPLY_REQUESTS,
    'saveDurableGood': SHEET_NAMES.DURABLE_GOODS,
    'saveCertificateRequest': SHEET_NAMES.CERTIFICATE_REQUESTS,
    'saveMaintenanceRequest': SHEET_NAMES.MAINTENANCE_REQUESTS,
    'savePerformanceReport': SHEET_NAMES.PERFORMANCE_REPORTS,
    'saveSARReport': SHEET_NAMES.SAR_REPORTS,
    'saveDocument': SHEET_NAMES.DOCUMENTS,
    'saveConstructionRecord': SHEET_NAMES.CONSTRUCTION_RECORDS,
    'saveProjectProposal': SHEET_NAMES.PROJECT_PROPOSALS,
    'saveHomeVisit': SHEET_NAMES.HOME_VISITS,
    'saveSDQRecord': SHEET_NAMES.SDQ_RECORDS,
    'saveMealPlan': SHEET_NAMES.MEAL_PLANS,
    'saveIngredient': SHEET_NAMES.INGREDIENTS,
    'updateSettings': SHEET_NAMES.SETTINGS,
    
    // Delete
    'deleteReports': SHEET_NAMES.REPORTS,
    'deleteStudents': SHEET_NAMES.STUDENTS,
    'deletePersonnel': SHEET_NAMES.PERSONNEL,
    'deleteServiceRecords': SHEET_NAMES.SERVICE_RECORDS,
    'deleteSupplyItems': SHEET_NAMES.SUPPLY_ITEMS,
    'deleteDurableGoods': SHEET_NAMES.DURABLE_GOODS,
    'deleteCertificateRequests': SHEET_NAMES.CERTIFICATE_REQUESTS,
    'deleteMaintenanceRequests': SHEET_NAMES.MAINTENANCE_REQUESTS,
    'deletePerformanceReports': SHEET_NAMES.PERFORMANCE_REPORTS,
    'deleteSARReports': SHEET_NAMES.SAR_REPORTS,
    'deleteDocuments': SHEET_NAMES.DOCUMENTS,
    'deleteConstructionRecords': SHEET_NAMES.CONSTRUCTION_RECORDS,
    'deleteProjectProposals': SHEET_NAMES.PROJECT_PROPOSALS,
    'deleteSDQRecords': SHEET_NAMES.SDQ_RECORDS,
    'deleteMealPlans': SHEET_NAMES.MEAL_PLANS,
    'deleteIngredients': SHEET_NAMES.INGREDIENTS
  };

  const sheetName = actionToSheetMap[action];
  if (!sheetName) return responseJSON({ status: 'error', message: 'Unknown action: ' + action });

  const sheet = getSheet(sheetName);

  // Handle Deletion
  if (action.startsWith('delete')) {
    if (!ids || !Array.isArray(ids)) return responseJSON({ status: 'error', message: 'Missing IDs for deletion' });
    deleteRecords(sheet, ids);
    return responseJSON({ status: 'success' });
  }

  // Handle Saving
  if (action === 'updateSettings') {
    const result = saveRecord(sheet, data, uploadFolder);
    return responseJSON({ status: 'success', data: result });
  }

  if (action.startsWith('add') || action.startsWith('update') || action.startsWith('save')) {
    const records = Array.isArray(data) ? data : [data];
    const results = records.map(r => saveRecord(sheet, r, uploadFolder));
    
    // Specialized Notifications
    if (action === 'addReport') {
      sendNotificationToRole('admin', "มีรายงานสถานะเรือนนอนใหม่", `โดย: ${data.reporterName}\nเรือน: ${data.dormitory}\nมา: ${data.presentCount} ป่วย: ${data.sickCount}`);
    } else if (action === 'addPersonnel') {
      sendNotificationToRole('admin', "มีการลงทะเบียนบุคลากรใหม่", `ชื่อ: ${data.personnelName}\nอีเมล: ${data.email}\nตำแหน่ง: ${data.position}`);
    } else if (action === 'saveMaintenanceRequest' && !data.id) {
      sendNotificationToRole('admin', "แจ้งซ่อมพัสดุใหม่", `รายการ: ${data.itemName}\nสถานที่: ${data.location}\nผู้แจ้ง: ${data.requesterName}`);
    } else if (action === 'saveDocument') {
      const recipientsIds = data.recipients || [];
      const personnelList = readSheet(getSheet(SHEET_NAMES.PERSONNEL));
      recipientsIds.forEach(rid => {
        const person = personnelList.find(p => String(p.id) === String(rid));
        if (person && person.email) {
          sendEmail(person.email, "คุณมีหนังสือ/คำสั่งใหม่", `เรื่อง: ${data.title}\nจาก: ${data.from}\nกรุณาเข้าสู่ระบบเพื่อตรวจสอบ`);
        }
      });
    }

    return responseJSON({ status: 'success', data: Array.isArray(data) ? results : results[0] });
  }

  return responseJSON({ status: 'error', message: 'Action not fully implemented' });
}

function sendNotificationToRole(role, title, body) {
  const personnel = readSheet(getSheet(SHEET_NAMES.PERSONNEL));
  const emails = personnel.filter(p => p.role === role).map(p => p.email).filter(e => e && e.includes('@'));
  if (emails.length > 0) {
    sendEmail(emails.join(','), title, body);
  }
}

function sendEmail(to, subject, bodyText) {
  try {
    const htmlBody = `
      <div style="font-family: 'Sarabun', sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">${SCHOOL_NAME}</h2>
        <p style="font-size: 16px; color: #334155;"><b>${subject}</b></p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; white-space: pre-wrap; color: #475569;">${bodyText}</div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">แจ้งเตือนอัตโนมัติจากระบบบริหารจัดการ KSP Management</p>
      </div>
    `;
    MailApp.sendEmail({ to: to, subject: `📢 แจ้งเตือน: ${subject}`, htmlBody: htmlBody });
  } catch(e) { console.error("Email fail", e); }
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Add default headers if creating new
    if (name === SHEET_NAMES.SETTINGS) {
       sheet.appendRow(["schoolName", "schoolLogo", "themeColors", "dormitories", "positions", "academicYears", "studentClasses", "studentClassrooms", "googleScriptUrl", "adminPassword"]);
    }
  }
  return sheet;
}

function readSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => { 
      if (h) {
        let val = row[i];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch(e) {}
        }
        obj[h] = val;
      }
    });
    return obj;
  });
}

function saveRecord(sheet, dataObj, uploadFolder) {
  // Handle file uploads
  for (const key in dataObj) {
    const val = dataObj[key];
    if (Array.isArray(val)) {
      dataObj[key] = val.map(item => {
        if (item && item.data && item.filename) {
          const blob = Utilities.newBlob(Utilities.base64Decode(item.data), item.mimeType, item.filename);
          const file = uploadFolder.createFile(blob);
          return file.getUrl();
        }
        return item;
      });
    } else if (val && val.data && val.filename) {
       const blob = Utilities.newBlob(Utilities.base64Decode(val.data), val.mimeType, val.filename);
       const file = uploadFolder.createFile(blob);
       dataObj[key] = file.getUrl();
    }
  }

  if (sheet.getLastRow() === 0) sheet.appendRow(Object.keys(dataObj));
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIndex = headers.indexOf('id');
  let rowIndex = -1;
  
  if (sheet.getLastRow() > 1 && idIndex !== -1) {
    const ids = sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const matchIdx = ids.map(String).indexOf(String(dataObj.id));
    if (matchIdx !== -1) rowIndex = matchIdx + 2;
  } else if (sheet.getName() === SHEET_NAMES.SETTINGS && sheet.getLastRow() > 1) {
    rowIndex = 2; // Always update second row for settings
  }

  const rowData = headers.map(h => {
    const val = dataObj[h];
    return (val !== null && typeof val === 'object') ? JSON.stringify(val) : (val === undefined ? '' : val);
  });

  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);
  return dataObj;
}

function deleteRecords(sheet, ids) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) return;

  const data = sheet.getDataRange().getValues();
  const idsToMatch = ids.map(String);
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (idsToMatch.includes(String(data[i][idIndex]))) {
      sheet.deleteRow(i + 1);
    }
  }
}

function getUploadFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
