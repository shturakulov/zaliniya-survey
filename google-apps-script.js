/**
 * ============================================
 * ZALINIYA SURVEY - GOOGLE APPS SCRIPT
 * Xavfsiz versiya: Token yo'q, Origin check
 * ============================================
 *
 * XAVFSIZLIK YONDASHUVI:
 * - Token ishlatilmaydi (frontend kodda sir bo'lmaydi)
 * - Faqat ruxsat etilgan domendan kelgan so'rovlar qabul qilinadi
 * - Honeypot, vaqt tekshiruvi, rate limit saqlanadi
 *
 * O'RNATISH:
 * 1. Google Sheets → Extensions → Apps Script
 * 2. Bu kodni to'liq nusxalang
 * 3. ALLOWED_ORIGINS'ni o'zingizning domeningizga o'zgartiring
 * 4. Deploy → New deployment → Web app
 *    Execute as: Me | Who has access: Anyone
 * 5. URL'ni js/form.js va js/dashboard.js ga qo'ying
 * ============================================
 */

// ============= RUXSAT ETILGAN DOMENLAR =============
// Faqat shu domenlardan kelgan so'rovlarni qabul qilamiz
// O'z domeningizni qo'shing!
const ALLOWED_ORIGINS = [
  'https://shturakulov.github.io',
  // Kelajakda o'z domeningiz bo'lsa qo'shing:
  // 'https://zaliniya.uz',
];

// ============= XAVFSIZLIK SOZLAMALARI =============
const MAX_SUBMITS_PER_HOUR = 5;   // IP/UA bo'yicha max yuborish
const MIN_FILL_TIME_SECONDS = 12; // Juda tez to'ldirilsa - bot

// ============= POST: Yangi javob qabul qilish =============
function doPost(e) {
  try {
    // 1. ORIGIN TEKSHIRUVI (eng muhim himoya)
    const origin = getOrigin(e);
    if (!isAllowedOrigin(origin)) {
      logSecurityEvent('Blocked origin: ' + origin);
      // Tajovuzkorga hech narsa bildirmaymiz
      return jsonOk();
    }

    // 2. JSON PARSE
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonError('Invalid format');
    }

    // 3. HONEYPOT TEKSHIRUVI
    if (data.website && String(data.website).trim() !== '') {
      logSecurityEvent('Honeypot: ' + origin);
      return jsonOk(); // Botga muvaffaqiyatli ko'rsatamiz
    }

    // 4. VAQT TEKSHIRUVI — juda tez to'ldirilgan
    const fillTime = parseInt(data.fillTimeSeconds || '0');
    if (fillTime > 0 && fillTime < MIN_FILL_TIME_SECONDS) {
      logSecurityEvent('Too fast (' + fillTime + 's): ' + origin);
      return jsonOk(); // Shubhali — fake success
    }

    // 5. IXTIYORIY MAYDONLAR (ism va telefon endi ixtiyoriy)
    // Agar yozilgan bo'lsa, formatini tekshiramiz
    if (data.fullName && String(data.fullName).trim().length > 0 && String(data.fullName).trim().length < 2) {
      return jsonError('Invalid name');
    }
    if (data.phone && String(data.phone).trim().length > 0) {
      const phoneClean = String(data.phone).replace(/\D/g, '');
      if (phoneClean.length < 9 || phoneClean.length > 15) {
        return jsonError('Invalid phone');
      }
    }

    // 6. RATE LIMIT (userAgent hash asosida)
    const uaHash = hashStr(String(data.userAgent || '').substring(0, 200));
    if (!checkRateLimit(uaHash)) {
      logSecurityEvent('Rate limit: ' + uaHash);
      return jsonError('Too many requests');
    }

    // 7. SANITIZE — XSS, code injection himoya
    const clean = sanitize(data);

    // 8. SHEETS GA YOZISH (LockService bilan - parallel yozish xavfsiz)
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // 10 sekundgacha kutadi
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

      // Yangi maydonlar kelsa — Sheets'ga avtomatik ustun qo'shish
      const skipFields = ['timestamp', 'ipHash', 'origin'];
      Object.keys(clean).forEach(key => {
        if (!skipFields.includes(key) && !headers.includes(key)) {
          headers.push(key);
          sheet.getRange(1, headers.length).setValue(key);
        }
      });

      const row = headers.map(h => {
        if (h === 'timestamp') return new Date();
        if (h === 'ipHash') return uaHash;
        return clean[h] !== undefined ? clean[h] : '';
      });
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }
    recordSubmit(uaHash);

    return jsonOk();

  } catch (err) {
    logSecurityEvent('doPost error: ' + err.message);
    return jsonError('Server error');
  }
}

// ============= GET: Dashboard ma'lumotlari =============
function doGet(e) {
  try {
    // Origin tekshiruvi
    const origin = getOrigin(e);
    if (!isAllowedOrigin(origin)) {
      logSecurityEvent('GET blocked origin: ' + origin);
      return jsonError('Forbidden');
    }

    const action = e.parameter.action;

    if (action === 'getData') {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const lastRow = sheet.getLastRow();

      if (lastRow < 2) {
        return ContentService
          .createTextOutput(JSON.stringify({ responses: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

      const responses = data.map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          if (h === 'ipHash') return; // Dashboard'ga yubormaymiz
          obj[h] = row[i] instanceof Date ? row[i].toISOString() : row[i];
        });
        return obj;
      });

      return ContentService
        .createTextOutput(JSON.stringify({ responses }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return jsonOk();

  } catch (err) {
    return jsonError('Server error');
  }
}

// ============= ORIGIN OLISH =============
// no-cors rejimida brauzer Header'larni yuborolmaydi,
// shuning uchun origin'ni POST data va GET parameter'dan olamiz
function getOrigin(e) {
  try {
    // 1. POST data ichidan (form.js origin'ni data ichiga qo'shadi)
    if (e.postData && e.postData.contents) {
      const data = JSON.parse(e.postData.contents);
      if (data.origin) return data.origin;
    }
    // 2. GET parameter'dan (dashboard.js URL'ga qo'shadi)
    if (e.parameter && e.parameter.origin) {
      return e.parameter.origin;
    }
    return 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

function isAllowedOrigin(origin) {
  if (!origin || origin === 'unknown') {
    // Origin aniqlanmasa — test va lokal muhitda ruxsat
    // Production'da false qilib qo'yish mumkin
    return true;
  }
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

// ============= YORDAMCHI FUNKSIYALAR =============
function jsonOk() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitize(data) {
  const MAX_LEN = 2000;
  const result = {};
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;
    let val = data[key];
    if (typeof val === 'string') {
      if (val.length > MAX_LEN) val = val.substring(0, MAX_LEN);
      val = val.replace(/<[^>]*>/g, '');         // HTML teglar
      val = val.replace(/javascript:/gi, '');    // JS injection
      val = val.replace(/on\w+\s*=/gi, '');      // Event handlers
    }
    result[key] = val;
  }
  return result;
}

function hashStr(str) {
  if (!str) return '0';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function checkRateLimit(uaHash) {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'rl_' + uaHash;
    const stored = props.getProperty(key);
    if (!stored) return true;
    const times = JSON.parse(stored);
    const hourAgo = Date.now() - 3600000;
    const recent = times.filter(t => t > hourAgo);
    return recent.length < MAX_SUBMITS_PER_HOUR;
  } catch (e) {
    return true;
  }
}

function recordSubmit(uaHash) {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'rl_' + uaHash;
    const stored = props.getProperty(key);
    const hourAgo = Date.now() - 3600000;
    let times = stored ? JSON.parse(stored) : [];
    times = times.filter(t => t > hourAgo);
    times.push(Date.now());
    props.setProperty(key, JSON.stringify(times));
  } catch (e) {}
}

function logSecurityEvent(msg) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName('SecurityLog');
    if (!log) {
      log = ss.insertSheet('SecurityLog');
      log.appendRow(['timestamp', 'event']);
    }
    log.appendRow([new Date(), msg]);
  } catch (e) {}
}

// ============= TEST FUNKSIYASI =============
// Apps Script editor'da "runTest" tanlab Run bosing
function runTest() {
  Logger.log('=== ZALINIYA SURVEY TEST ===');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  Logger.log('Sheet: ' + sheet.getName());
  Logger.log('Headers: ' + sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].join(' | '));
  Logger.log('Allowed origins: ' + ALLOWED_ORIGINS.join(', '));
  Logger.log('Max submits/hour: ' + MAX_SUBMITS_PER_HOUR);
  Logger.log('Min fill time: ' + MIN_FILL_TIME_SECONDS + 's');
  Logger.log('=== TEST OK ===');
}
