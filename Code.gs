/**
 * D-school Management System - Backend Script
 * Version: 2.3 (On-Demand Fetching)
 */
const SCRIPT_VERSION = "2.3.0";

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
  CERTIFICATE_PROJECTS: "CertificateProjects",
  CERTIFICATE_REQUESTS: "CertificateRequests",
  MAINTENANCE_REQUESTS: "MaintenanceRequests",
  PERFORMANCE_REPORTS: "PerformanceReports",
  SALARY_PROMOTION_REPORTS: "SalaryPromotionReports",
  SAR_REPORTS: "SARReports",
  ACHIEVEMENTS: "Achievements",
  DOCUMENTS: "GeneralDocuments",
  CONSTRUCTION_RECORDS: "ConstructionRecords",
  PROJECT_PROPOSALS: "ProjectProposals",
  HOME_VISITS: "HomeVisits",
  SDQ_RECORDS: "SDQRecords",
  MEAL_PLANS: "MealPlans",
  INGREDIENTS: "Ingredients",
  OTP_STORE: "OTPStore",
  WORKFLOW_DOCS: "WorkflowDocuments",
  CHAT_MESSAGES: "ChatMessages"
};


function findRecordById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) return null;

  const ids = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues().flat();
  const rowIndex = ids.map(String).indexOf(String(id));

  if (rowIndex !== -1) {
    const row = rowIndex + 2;
    const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
    const obj = {};
    headers.forEach((h, i) => {
      if (h) {
        let val = rowData[i];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch(e) {}
        }
        obj[h] = val;
      }
    });
    return obj;
  }
  return null;
}

function updateRecordFields(sheet, id, fieldsToUpdate) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) return; 

  const ids = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues().flat();
  const rowIndex = ids.map(String).indexOf(String(id));

  if (rowIndex !== -1) {
    const row = rowIndex + 2; 
    for (const field in fieldsToUpdate) {
      if (Object.prototype.hasOwnProperty.call(fieldsToUpdate, field)) {
        const colIndex = headers.indexOf(field);
        if (colIndex !== -1) {
          const col = colIndex + 1;
          sheet.getRange(row, col).setValue(fieldsToUpdate[field] === undefined ? '' : fieldsToUpdate[field]);
        }
      }
    }
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return responseJSON({ status: 'error', message: 'Server busy, please try again.' });

  try {
    const request = JSON.parse(e.postData.contents);
    const action = String(request.action || "").trim();
    const data = request.data;
    const uploadFolder = getUploadFolder();
    
    switch (action) {
      case 'checkVersion':
        return responseJSON({ status: 'success', version: SCRIPT_VERSION });

      case 'login':
        const personnel = readSheet(getSheet(SHEET_NAMES.PERSONNEL));
        const identifier = String(request.identifier || "").toLowerCase().trim();
        const user = personnel.find(p => (String(p.idCard).replace(/[^0-9]/g, '') === identifier.replace(/[^0-9]/g, '')) || (String(p.email).toLowerCase() === identifier));

        if (!user) return responseJSON({ status: 'error', message: 'ไม่พบผู้ใช้งานในระบบ' });
        
        const actualPass = user.password || user.idCard;
        if (String(actualPass) === String(request.password)) {
            if (user.status === 'pending') return responseJSON({ status: 'error', message: 'บัญชีของท่านยังไม่ได้รับอนุมัติ' });
            if (user.status === 'blocked') return responseJSON({ status: 'error', message: 'บัญชีของท่านถูกระงับการใช้งาน' });
            return responseJSON({ status: 'success', data: user });
        } else {
            return responseJSON({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });
        }

      case 'getDashboardData':
        const dashboardData = {
          reports: readSheet(getSheet(SHEET_NAMES.REPORTS)),
          students: readSheet(getSheet(SHEET_NAMES.STUDENTS)),
          personnel: readSheet(getSheet(SHEET_NAMES.PERSONNEL)),
          studentAttendance: readSheet(getSheet(SHEET_NAMES.STUDENT_ATTENDANCE)),
          personnelAttendance: readSheet(getSheet(SHEET_NAMES.PERSONNEL_ATTENDANCE)),
          homeVisits: readSheet(getSheet(SHEET_NAMES.HOME_VISITS)),
          settings: readSheet(getSheet(SHEET_NAMES.SETTINGS))[0] || null
        };
        return responseJSON({ status: 'success', data: dashboardData });

      case 'getStudents': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.STUDENTS)) });
      case 'getPersonnel': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.PERSONNEL)) });
      case 'getReports': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.REPORTS)) });
      case 'getAttendanceData': 
        return responseJSON({ status: 'success', data: {
            studentAttendance: readSheet(getSheet(SHEET_NAMES.STUDENT_ATTENDANCE)),
            personnelAttendance: readSheet(getSheet(SHEET_NAMES.PERSONNEL_ATTENDANCE))
        }});
      case 'getDutyRecords': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.DUTY_RECORDS)) });
      case 'getLeaveRecords': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.LEAVE_RECORDS)) });
      case 'getAchievements': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.ACHIEVEMENTS)) });
      case 'getAcademicPlans': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.ACADEMIC_PLANS)) });
      case 'getServiceRecords': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.SERVICE_RECORDS)) });
      case 'getSupplyRequests': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.SUPPLY_REQUESTS)) });
      case 'getProjectProposals': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.PROJECT_PROPOSALS)) });
      case 'getDurableGoods': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.DURABLE_GOODS)) });
      case 'getPerformanceReports': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.PERFORMANCE_REPORTS)) });
      case 'getSalaryPromotionReports': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.SALARY_PROMOTION_REPORTS)) });
      case 'getSarReports': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.SAR_REPORTS)) });
      case 'getGeneralDocuments': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.DOCUMENTS)) });
      case 'getMaintenanceRequests': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.MAINTENANCE_REQUESTS)) });
      case 'getCertificateData':
        return responseJSON({ status: 'success', data: {
            projects: readSheet(getSheet(SHEET_NAMES.CERTIFICATE_PROJECTS)),
            requests: readSheet(getSheet(SHEET_NAMES.CERTIFICATE_REQUESTS))
        }});
      case 'getConstructionRecords': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.CONSTRUCTION_RECORDS)) });
      case 'getNutritionData':
        return responseJSON({ status: 'success', data: {
            mealPlans: readSheet(getSheet(SHEET_NAMES.MEAL_PLANS)),
            ingredients: readSheet(getSheet(SHEET_NAMES.INGREDIENTS))
        }});
      case 'getHomeVisits': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.HOME_VISITS)) });
      case 'getSdqRecords': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.SDQ_RECORDS)) });
      case 'getWorkflowDocs': return responseJSON({ status: 'success', data: readSheet(getSheet(SHEET_NAMES.WORKFLOW_DOCS)) });

      case 'getChatMessages':
        const messages = readSheet(getSheet(SHEET_NAMES.CHAT_MESSAGES));
        const userId = request.userId;
        const userRole = request.userRole;
        const sinceTimestamp = request.sinceTimestamp;

        const isUserAdmin = (userRole === 'admin' || userRole === 'pro');

        const filtered = messages.filter(m => {
          if (sinceTimestamp && new Date(m.timestamp) <= new Date(sinceTimestamp)) {
            return false;
          }
          
          return !m.isDeleted && (
            m.senderId == userId || 
            m.receiverId == userId || 
            m.receiverId == 'all' ||
            (m.receiverId == 'admin' && isUserAdmin)
          );
        });
        return responseJSON({ status: 'success', data: filtered });

      case 'sendChatMessage':
      case 'editChatMessage':
      case 'deleteChatMessage':
        const chatSheet = getSheet(SHEET_NAMES.CHAT_MESSAGES);
        if (action === 'sendChatMessage') ensureHeadersExist(chatSheet, data);
        const savedChat = saveRecord(chatSheet, data, uploadFolder);
        return responseJSON({ status: 'success', data: savedChat });

      case 'testWebhook':
        const { url, label } = data;
        if (!url || !url.startsWith('http')) {
           return responseJSON({ status: 'error', message: 'URL ไม่ถูกต้อง' });
        }
        const testMsg = `⚡ *D-school Connection Test*\nสถานะ: เชื่อมต่อสำเร็จ\nระบบ: ${label}\nทดสอบโดย: แอดมิน\nเวลา: ${new Date().toLocaleString('th-TH')}`;
        try {
          const response = UrlFetchApp.fetch(url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ text: testMsg }),
            muteHttpExceptions: true
          });
          const responseCode = response.getResponseCode();
          if (responseCode >= 200 && responseCode < 300) {
            return responseJSON({ status: 'success', message: 'ส่งข้อความสำเร็จ (Status: ' + responseCode + ')' });
          } else {
            return responseJSON({ 
              status: 'error', 
              message: 'Google Chat ปฏิเสธการเชื่อมต่อ (HTTP ' + responseCode + '): ' + response.getContentText() 
            });
          }
        } catch (e) {
          return responseJSON({ status: 'error', message: 'เกิดข้อผิดพลาดในการส่ง: ' + e.toString() });
        }
      
      case 'updateAcademicPlanStatus': {
        const planSheet = getSheet(SHEET_NAMES.ACADEMIC_PLANS);
        const { id, status, comment, approverName, approvedDate } = data;
        
        const originalRecord = findRecordById(planSheet, id); 
        updateRecordFields(planSheet, id, { status, comment, approverName, approvedDate });

        if (originalRecord) {
          const updatedPlanForNotif = { ...originalRecord, ...data };
          const settingsListForPlan = readSheet(getSheet(SHEET_NAMES.SETTINGS));
          if (settingsListForPlan.length > 0) {
            triggerNotification('updateAcademicPlanStatus', updatedPlanForNotif, settingsListForPlan[0]);
          }
        }
        return responseJSON({ status: 'success', data: {id: id} });
      }

      default:
        return routeGenericAction(action, request, uploadFolder);
    }

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function isAdmin(userId) {
  const personnel = readSheet(getSheet(SHEET_NAMES.PERSONNEL));
  const user = personnel.find(p => p.id == userId);
  return user && (user.role === 'admin' || user.role === 'pro');
}

function triggerNotification(action, data, settings) {
  const exemptActions = ['addPersonnel', 'updatePersonnel', 'addStudent', 'updateStudent'];
  if (exemptActions.includes(action)) return;

  let webhookUrl = '';
  let msg = '';
  const first = Array.isArray(data) ? data[0] : data;
  if (!first) return;

  // เลือก Webhook ตาม Action
  if (action === 'saveStudentAttendance' || action === 'savePersonnelAttendance') {
    webhookUrl = settings.webhookAttendance;
    const isStudent = action === 'saveStudentAttendance';
    const periodLabels = { 'morning_act': 'กิจกรรมเช้า', 'p1': 'ชั่วโมงที่ 1', 'lunch_act': 'กิจกรรมเที่ยง', 'evening_act': 'กิจกรรมเย็น' };
    const stats = { present: 0, absent: 0, sick: 0, leave: 0, activity: 0, home: 0 };
    const records = Array.isArray(data) ? data : [data];
    records.forEach(r => { if (stats[r.status] !== undefined) stats[r.status]++; });

    msg = `📢 *รายงานการเช็คชื่อ${isStudent ? 'นักเรียน' : 'บุคลากร'}*\n` +
          `📅 วันที่: ${first.date} | ช่วงเวลา: ${periodLabels[first.period] || first.period}\n` +
          `--------------------------------\n` +
          `✅ มา/ปฏิบัติหน้าที่: ${stats.present + stats.activity} คน\n` +
          `❌ ขาด: ${stats.absent} คน | 🤒 ป่วย: ${stats.sick} คน\n` +
          `📝 ลา: ${stats.leave} คน | 🏠 อยู่บ้าน: ${stats.home} คน\n` +
          `--------------------------------\n` +
          `บันทึกโดยระบบ D-school Smart Management`;
  }
  else if (action === 'addReport' || action === 'updateReport') {
    webhookUrl = settings.webhookDormitory;
    let sickList = "-";
    let homeList = "-";
    if (first.studentDetails) {
      try {
        const details = typeof first.studentDetails === 'string' ? JSON.parse(first.studentDetails) : first.studentDetails;
        if (Array.isArray(details)) {
           const sicks = details.filter(s => s.status === 'sick').map(s => s.name);
           if (sicks.length > 0) sickList = sicks.join(', ');
           const homes = details.filter(s => s.status === 'home').map(s => s.name);
           if (homes.length > 0) homeList = homes.join(', ');
        }
      } catch (e) {}
    }
    msg = `👨‍🏫 ครูเวร: ${first.reporterName}\n` +
          `🏠 เรือนนอนที่ดูแล: ${first.dormitory}\n` +
          `🕰️ ช่วงเวลาเวร: ${first.reportTime || 'ไม่ระบุ'}\n` +
          `🤒🏥 ป่วย: ${sickList}\n` +
          `🏡📚 เรียนที่บ้าน: ${homeList}\n\n` +
          `📊 มา: ${first.presentCount} | ป่วย: ${first.sickCount} | อื่นๆ: ${first.homeCount || 0}\n` +
          `📘 บันทึก: ${first.log || '-'}`;
  }
  else if (action === 'saveAcademicPlan') {
    webhookUrl = settings.webhookAcademic;
    msg = `📚 *มีการส่งแผนการจัดการเรียนรู้ใหม่*\n📖 วิชา: ${first.subjectName} (${first.subjectCode})\n👨‍🏫 ผู้สอน: ${first.teacherName}\n📂 กลุ่มสาระ: ${first.learningArea}`;
  } 
  else if (action === 'updateAcademicPlanStatus') {
    webhookUrl = settings.webhookAcademic;
    msg = `✅ *แผนการสอนได้รับการตรวจสอบ*\n` +
          `📖 วิชา: ${first.subjectName}\n` +
          `👨‍🏫 ผู้สอน: ${first.teacherName}\n` +
          `⭐ สถานะ: ${first.status === 'approved' ? 'อนุมัติแล้ว' : 'รอแก้ไข'}\n` +
          `🗣️ โดย: ${first.approverName}`;
  }
  else if (action === 'saveServiceRecord') {
    webhookUrl = settings.webhookAcademic;
    msg = `🏫 *ลงทะเบียนใช้บริการแหล่งเรียนรู้*\n📍 สถานที่: ${first.location}\n📝 กิจกรรม: ${first.purpose}\n👨‍🏫 ผู้รับผิดชอบ: ${first.teacherName}`;
  }
  else if (action === 'saveSupplyRequest') {
    webhookUrl = settings.webhookFinance;
    msg = `📦 *มีการขอเบิกพัสดุใหม่*\n👤 ผู้ขอ: ${first.requesterName}\n🏢 ฝ่าย: ${first.department}\n📝 เหตุผล: ${first.reason}`;
  }
  else if (action === 'saveProjectProposal') {
    webhookUrl = settings.webhookFinance;
    msg = `📊 *มีการเสนอโครงการ/แผนงานใหม่*\n📋 โครงการ: ${first.name}\n💰 งบประมาณ: ${Number(first.budget).toLocaleString()} บาท\n👤 ผู้รับผิดชอบ: ${first.responsiblePersonName}`;
  }
  else if (action === 'saveMaintenanceRequest') {
    webhookUrl = settings.webhookGeneral;
    msg = `🔧 *แจ้งซ่อมบำรุง*\n🛠️ รายการ: ${first.itemName}\n📍 สถานที่: ${first.location}\n👤 ผู้แจ้ง: ${first.requesterName}`;
  }
  else if (action === 'saveDocument' || action === 'saveWorkflowDoc') {
    webhookUrl = settings.webhookGeneral;
    msg = `📄 *หนังสือราชการ/แฟ้มเสนอใหม่*\n📝 เรื่อง: ${first.title}\n📂 ประเภท: ${first.category || first.type}\n👤 ผู้ส่ง: ${first.submitterName || first.from}`;
  }
  else if (action === 'saveHomeVisit') {
    webhookUrl = settings.webhookStudentSupport;
    msg = `🏠 *บันทึกการเยี่ยมบ้านนักเรียน*\n👤 นักเรียน: ${first.studentName}\n👨‍🏫 ครูผู้เยี่ยม: ${first.visitorName}`;
  }

  if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.trim().startsWith('http') && msg) {
    try {
      UrlFetchApp.fetch(webhookUrl.trim(), {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ text: msg }),
        muteHttpExceptions: true
      });
    } catch (e) {
      Logger.log("Webhook Error (" + action + "): " + e.toString());
    }
  }
}

function routeGenericAction(action, request, uploadFolder) {
  const data = request.data;
  const ids = request.ids;
  
  if (action.startsWith('delete')) {
     const sheetMap = {
        'deleteReports': SHEET_NAMES.REPORTS, 'deleteStudents': SHEET_NAMES.STUDENTS,
        'deletePersonnel': SHEET_NAMES.PERSONNEL, 'deleteServiceRecords': SHEET_NAMES.SERVICE_RECORDS,
        'deleteDutyRecords': SHEET_NAMES.DUTY_RECORDS,
        'deleteLeaveRecords': SHEET_NAMES.LEAVE_RECORDS, 'deleteSupplyItems': SHEET_NAMES.SUPPLY_ITEMS,
        'deleteSupplyRequests': SHEET_NAMES.SUPPLY_REQUESTS,
        'deleteDurableGoods': SHEET_NAMES.DURABLE_GOODS, 'deleteCertificateProjects': SHEET_NAMES.CERTIFICATE_PROJECTS,
        'deleteCertificateRequests': SHEET_NAMES.CERTIFICATE_REQUESTS,
        'deleteMaintenanceRequests': SHEET_NAMES.MAINTENANCE_REQUESTS,
        'deletePerformanceReports': SHEET_NAMES.PERFORMANCE_REPORTS,
        'deleteSalaryPromotionReports': SHEET_NAMES.SALARY_PROMOTION_REPORTS,
        'deleteSARReports': SHEET_NAMES.SAR_REPORTS, 'deleteDocuments': SHEET_NAMES.DOCUMENTS,
        'deleteConstructionRecords': SHEET_NAMES.CONSTRUCTION_RECORDS,
        'deleteProjectProposals': SHEET_NAMES.PROJECT_PROPOSALS,
        'deleteSDQRecords': SHEET_NAMES.SDQ_RECORDS, 'deleteMealPlans': SHEET_NAMES.MEAL_PLANS,
        'deleteIngredients': SHEET_NAMES.INGREDIENTS, 'deleteStudentAttendance': SHEET_NAMES.STUDENT_ATTENDANCE,
        'deletePersonnelAttendance': SHEET_NAMES.PERSONNEL_ATTENDANCE,
        'deleteAchievements': SHEET_NAMES.ACHIEVEMENTS,
        'deleteWorkflowDocs': SHEET_NAMES.WORKFLOW_DOCS
     };
     const targetSheetName = sheetMap[action];
     if (!targetSheetName) return responseJSON({ status: 'error', message: 'Unknown delete action: ' + action });
     deleteRecords(getSheet(targetSheetName), ids);
     return responseJSON({ status: 'success' });
  }

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
    'saveCertificateProject': SHEET_NAMES.CERTIFICATE_PROJECTS,
    'saveCertificateRequest': SHEET_NAMES.CERTIFICATE_REQUESTS,
    'saveMaintenanceRequest': SHEET_NAMES.MAINTENANCE_REQUESTS,
    'savePerformanceReport': SHEET_NAMES.PERFORMANCE_REPORTS,
    'saveSalaryPromotionReport': SHEET_NAMES.SALARY_PROMOTION_REPORTS,
    'saveSARReport': SHEET_NAMES.SAR_REPORTS,
    'saveAchievement': SHEET_NAMES.ACHIEVEMENTS,
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
    'updateSettings': SHEET_NAMES.SETTINGS
  };

  const sheetName = actionToSheetMap[action];
  if (!sheetName) return responseJSON({ status: 'error', message: 'Unknown action: ' + action });

  const sheet = getSheet(sheetName);

  if (action === 'updateSettings') {
    ensureHeadersExist(sheet, data);
    const result = saveRecord(sheet, data, uploadFolder);
    return responseJSON({ status: 'success', data: result });
  }

  if (action.startsWith('add') || action.startsWith('update') || action.startsWith('save')) {
    const records = Array.isArray(data) ? data : [data];
    if (records.length > 0) ensureHeadersExist(sheet, records[0]);
    const results = records.map(r => saveRecord(sheet, r, uploadFolder));

    const settingsList = readSheet(getSheet(SHEET_NAMES.SETTINGS));
    if (settingsList.length > 0) {
      triggerNotification(action, results, settingsList[0]);
    }

    return responseJSON({ status: 'success', data: Array.isArray(data) ? results : results[0] });
  }

  return responseJSON({ status: 'error', message: 'Action implementation missing in generic router: ' + action });
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

function ensureHeadersExist(sheet, dataObj) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(Object.keys(dataObj));
    return;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingHeaders = new Set(headers);
  const newHeaders = [];
  
  Object.keys(dataObj).forEach(key => {
    if (!existingHeaders.has(key)) {
      newHeaders.push(key);
    }
  });

  if (newHeaders.length > 0) {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
  }
}

function saveRecord(sheet, dataObj, uploadFolder) {
  for (const key in dataObj) {
    const val = dataObj[key];
    if (Array.isArray(val)) {
      dataObj[key] = val.map(item => {
        if (item && item.data && item.filename) {
          try {
            const blob = Utilities.newBlob(Utilities.base64Decode(item.data), item.mimeType, item.filename);
            const file = uploadFolder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            return file.getUrl();
          } catch(e) {
            Logger.log("Error uploading file array item for key " + key + ": " + e.toString());
            return item; // return original object on failure
          }
        }
        return item;
      });
    } else if (val && val.data && val.filename) {
       try {
         const blob = Utilities.newBlob(Utilities.base64Decode(val.data), val.mimeType, val.filename);
         const file = uploadFolder.createFile(blob);
         file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
         dataObj[key] = file.getUrl();
       } catch (e) {
         Logger.log("Error uploading file for key " + key + ": " + e.toString());
         // Keep original object in dataObj on failure
       }
    }
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let rowIndex = -1;
  const idIndex = headers.indexOf('id');
  
  if (sheet.getName() === SHEET_NAMES.SETTINGS) {
    if (sheet.getLastRow() > 1) rowIndex = 2;
  } else if (idIndex !== -1 && dataObj.id && sheet.getLastRow() > 1) {
    // OPTIMIZATION: Use TextFinder to find the row instead of reading all IDs
    const idColumn = idIndex + 1;
    const range = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1);
    const textFinder = range.createTextFinder(String(dataObj.id)).matchEntireCell(true);
    const foundCell = textFinder.findNext();
    if (foundCell) {
      rowIndex = foundCell.getRow();
    }
  }

  const rowData = headers.map(h => {
    const val = dataObj[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val);
        } catch (e) {
            return String(val); // Fallback
        }
    }
    return val;
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
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}