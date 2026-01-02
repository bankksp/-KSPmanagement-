
/**
 * D-school Management System - Backend Script
 */

const FOLDER_NAME = "D-school_Uploads"; 
const SCHOOL_NAME = "โรงเรียนกาฬสินธุ์ปัญญานุกูล";

const SHEET_NAMES = {
  REPORTS: "Reports",
  STUDENTS: "Students",
  PERSONNEL: "Personnel",
  SETTINGS: "Settings",
  STUDENT_ATTENDANCE: "StudentAttendance",
  PERSONNEL_ATTENDANCE: "PersonnelAttendance",
  DUTY_RECORDS: "DutyRecords",
  LEAVE_RECORDS: "LeaveRecords",
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
  OTP_STORE: "OTPStore",
  WORKFLOW_DOCS: "WorkflowDocuments"
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return responseJSON({ status: 'error', message: 'Server busy' });

  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const data = request.data;
    const uploadFolder = getUploadFolder();
    
    if (action === 'login') {
      const personnel = readSheet(getSheet(SHEET_NAMES.PERSONNEL));
      const identifier = String(request.identifier).toLowerCase();
      const user = personnel.find(p => (String(p.idCard) === identifier) || (String(p.email).toLowerCase() === identifier));

      if (!user) return responseJSON({ status: 'error', message: 'ไม่พบผู้ใช้งานในระบบ' });
      if (user.status === 'pending') return responseJSON({ status: 'error', message: 'บัญชีของท่านยังไม่ได้รับอนุมัติ' });
      
      const actualPass = user.password || user.idCard;
      if (String(actualPass) === String(request.password)) return responseJSON({ status: 'success', data: user });
      return responseJSON({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });
    }

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
  
  const actionToSheetMap = {
    'addReport': SHEET_NAMES.REPORTS, 'updateReport': SHEET_NAMES.REPORTS,
    'addPersonnel': SHEET_NAMES.PERSONNEL, 'updatePersonnel': SHEET_NAMES.PERSONNEL,
    'addStudent': SHEET_NAMES.STUDENTS, 'updateStudent': SHEET_NAMES.STUDENTS,
    'saveAcademicPlan': SHEET_NAMES.ACADEMIC_PLANS,
    'saveServiceRecord': SHEET_NAMES.SERVICE_RECORDS,
    'saveDutyRecord': SHEET_NAMES.DUTY_RECORDS,
    'saveLeaveRecord': SHEET_NAMES.LEAVE_RECORDS,
    'saveSupplyItem': SHEET_NAMES.SUPPLY_ITEMS,
    'saveSupplyRequest': SHEET_NAMES.SUPPLY_REQUESTS,
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
    'saveStudentAttendance': SHEET_NAMES.STUDENT_ATTENDANCE,
    'savePersonnelAttendance': SHEET_NAMES.PERSONNEL_ATTENDANCE,
    'saveWorkflowDoc': SHEET_NAMES.WORKFLOW_DOCS,
    'updateSettings': SHEET_NAMES.SETTINGS,
    'deleteReports': SHEET_NAMES.REPORTS,
    'deleteStudents': SHEET_NAMES.STUDENTS,
    'deletePersonnel': SHEET_NAMES.PERSONNEL,
    'deleteServiceRecords': SHEET_NAMES.SERVICE_RECORDS,
    'deleteDutyRecords': SHEET_NAMES.DUTY_RECORDS,
    'deleteLeaveRecords': SHEET_NAMES.LEAVE_RECORDS,
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
    'deleteIngredients': SHEET_NAMES.INGREDIENTS,
    'deleteStudentAttendance': SHEET_NAMES.STUDENT_ATTENDANCE,
    'deletePersonnelAttendance': SHEET_NAMES.PERSONNEL_ATTENDANCE,
    'deleteWorkflowDocs': SHEET_NAMES.WORKFLOW_DOCS
  };

  const sheetName = actionToSheetMap[action];
  if (!sheetName) return responseJSON({ status: 'error', message: 'Unknown action: ' + action });

  const sheet = getSheet(sheetName);

  if (action.startsWith('delete')) {
    deleteRecords(sheet, ids);
    return responseJSON({ status: 'success' });
  }

  if (action === 'updateSettings') {
    const result = saveRecord(sheet, data, uploadFolder);
    return responseJSON({ status: 'success', data: result });
  }

  if (action.startsWith('add') || action.startsWith('update') || action.startsWith('save')) {
    const records = Array.isArray(data) ? data : [data];
    // Optimized for multiple records
    const results = records.map(r => saveRecord(sheet, r, uploadFolder));
    return responseJSON({ status: 'success', data: Array.isArray(data) ? results : results[0] });
  }

  return responseJSON({ status: 'error', message: 'Action not fully implemented' });
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
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
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          return file.getUrl();
        }
        return item;
      });
    } else if (val && val.data && val.filename) {
       const blob = Utilities.newBlob(Utilities.base64Decode(val.data), val.mimeType, val.filename);
       const file = uploadFolder.createFile(blob);
       file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       dataObj[key] = file.getUrl();
    }
  }

  // Ensure headers exist and match object keys
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(Object.keys(dataObj));
  }
  
  let headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  
  // Check for missing headers and add them
  const objKeys = Object.keys(dataObj);
  let headersChanged = false;
  objKeys.forEach(key => {
    if (headers.indexOf(key) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(key);
      headers.push(key);
      headersChanged = true;
    }
  });
  
  if (headersChanged) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  // Find row to update or append
  let rowIndex = -1;
  const idIndex = headers.indexOf('id');
  
  if (sheet.getName() === SHEET_NAMES.SETTINGS) {
    if (sheet.getLastRow() > 1) rowIndex = 2;
  } else if (idIndex !== -1 && sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const matchIdx = ids.map(String).indexOf(String(dataObj.id));
    if (matchIdx !== -1) rowIndex = matchIdx + 2;
  }

  const rowData = headers.map(h => {
    const val = dataObj[h];
    if (val === undefined || val === null) return '';
    return (typeof val === 'object') ? JSON.stringify(val) : val;
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
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
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
