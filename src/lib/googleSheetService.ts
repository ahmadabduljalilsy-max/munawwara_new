/**
 * Google Sheets Integration Service for Driver Responses
 * Supports syncing driver responses directly to Google Sheets via Google Apps Script Webhook,
 * generating Google Apps Script boilerplate, and exporting/formatting for Google Sheets.
 */

import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import type { DriverResponse, CompanyDriver } from '../types';

export interface GoogleSheetSettings {
  webhookUrl?: string; // Google Apps Script Web App URL
  sheetUrl?: string;   // Direct link to the Google Sheet or Google Form for quick opening
  enabled?: boolean;
}

const SETTINGS_DOC_PATH = 'settings/app';

/**
 * Fetch Google Sheet settings from Firestore app settings
 */
export async function getGoogleSheetSettings(): Promise<GoogleSheetSettings> {
  try {
    const snap = await getDoc(doc(db, SETTINGS_DOC_PATH));
    if (snap.exists()) {
      const data = snap.data();
      return {
        webhookUrl: data.googleSheetWebhookUrl || '',
        sheetUrl: data.googleSheetUrl || '',
        enabled: data.googleSheetSyncEnabled ?? Boolean(data.googleSheetWebhookUrl)
      };
    }
  } catch (err) {
    console.warn('Could not load Google Sheet settings from Firestore:', err);
  }
  return {};
}

/**
 * Save Google Sheet settings to Firestore
 */
export async function saveGoogleSheetSettings(settings: GoogleSheetSettings): Promise<void> {
  try {
    await setDoc(
      doc(db, SETTINGS_DOC_PATH),
      {
        googleSheetWebhookUrl: settings.webhookUrl || '',
        googleSheetUrl: settings.sheetUrl || '',
        googleSheetSyncEnabled: settings.enabled ?? Boolean(settings.webhookUrl)
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to save Google Sheet settings:', err);
    throw err;
  }
}

/**
 * Send a driver response to Google Sheets via the Apps Script Webhook.
 * Uses mode: 'no-cors' so that Google Apps Script redirects do not cause CORS blocks.
 */
export async function syncResponseToGoogleSheet(
  webhookUrl: string,
  response: {
    driverSerialNumber: number;
    driverName: string;
    busNumber: string;
    responseType: string;
    notes?: string;
    createdDate?: string;
  }
): Promise<{ success: boolean; message?: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, message: 'رابط ويب هوك غوغل شيت غير محدد' };
  }

  const payload = {
    timestamp: new Date().toISOString(),
    createdDate: response.createdDate || new Date().toLocaleString('ar-SA'),
    driverSerialNumber: response.driverSerialNumber,
    driverName: response.driverName,
    busNumber: response.busNumber,
    responseType: response.responseType,
    notes: response.notes || ''
  };

  try {
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors', // Essential for Google Apps Script Web App endpoints
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    return { success: true };
  } catch (err: any) {
    console.error('Google Sheet sync error:', err);
    return { success: false, message: err?.message || 'فشل الإرسال إلى غوغل شيت' };
  }
}

/**
 * Generates the Google Apps Script code to paste into Google Sheet -> Extensions -> Apps Script
 */
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * كود ربط ردود السائقين بجدول Google Sheets تلقائياً
 * انسخ هذا الكود في Google Sheets -> Extensions (التوسيعات) -> Apps Script
 * ثم اضغط Deploy (نشر) -> New Deployment -> نوع Web app -> Who has access: Anyone
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // إذا كان الجدول فارغاً، نقوم بكتابة العناوين في الصف الأول
    if (sheet.getLastRow() === 0) {
      var headerRow = [
        "التاريخ والوقت",
        "الرقم المتسلسل للسائق",
        "اسم السائق",
        "رقم الحافلة",
        "نوع الرد / الوجهة",
        "الملاحظات",
        "تاريخ النظام"
      ];
      sheet.appendRow(headerRow);
      sheet.getRange(1, 1, 1, headerRow.length).setFontWeight("bold").setBackground("#e6f4ea");
    }
    
    // قراءة البيانات المرسلة من التطبيق
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.createdDate || Utilities.formatDate(new Date(), "Asia/Riyadh", "yyyy-MM-dd HH:mm:ss"),
      data.driverSerialNumber,
      data.driverName,
      data.busNumber,
      data.responseType,
      data.notes || "—",
      new Date()
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Google Sheets Webhook for Driver Responses is ACTIVE");
}
`;
}

/**
 * Extract Google Sheet ID from any full Google Docs URL or Sheet link
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch responses directly from a Google Sheet (such as one linked to a Google Form),
 * and automatically import and link them to the drivers in the website!
 */
export async function fetchAndSyncGoogleSheetResponses(
  sheetUrl: string,
  existingResponses: DriverResponse[],
  drivers: CompanyDriver[]
): Promise<{ added: number; error?: string }> {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    return { added: 0, error: 'رابط جدول Google Sheet غير صالح. يرجى التأكد من نسخ الرابط الكامل للجدول.' };
  }

  // Construct CSV export URL (Google Sheets public reader)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;

  try {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`فشل تحميل الجدول (${res.status}). يرجى التأكد من أن إعداد المشاركة في Google Sheet هو "أي شخص لديه الرابط يمكنه العرض" (Anyone with link can view).`);
    }

    const csvText = await res.text();
    const wb = XLSX.read(csvText, { type: 'string' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rawRows.length === 0) {
      return { added: 0, error: 'الجدول لا يحتوي على صفوف بيانات حتى الآن.' };
    }

    let addedCount = 0;

    for (const row of rawRows) {
      // Find serial number
      const rawSerial = row['الرقم المتسلسل'] || row['الرقم المتسلسل للسائق'] || row['رقم متسلسل'] || row['م'] || row['الرقم'] || row['Serial'] || row['ID'];
      const sNum = parseInt(String(rawSerial || ''), 10);
      if (isNaN(sNum) || sNum <= 0) continue;

      // Find bus number
      const busNumber = String(
        row['رقم الحافلة'] || row['الحافلة'] || row['رقم الباص'] || row['الباص'] || row['Bus Number'] || row['Bus'] || ''
      ).trim();

      // Find response type / destination
      const rawResp = String(
        row['نوع الرد'] || row['نوع الرد / الوجهة'] || row['الوجهة'] || row['الرد'] || row['Response'] || row['Destination'] || ''
      ).trim();

      let validResp: 'محايل عسير' | 'ينبع' | 'القصيم' | 'الرياض' | 'الترددية' | null = null;
      if (rawResp.includes('محايل') || rawResp.includes('عسير')) validResp = 'محايل عسير';
      else if (rawResp.includes('ينبع')) validResp = 'ينبع';
      else if (rawResp.includes('قصيم')) validResp = 'القصيم';
      else if (rawResp.includes('رياض')) validResp = 'الرياض';
      else if (rawResp.includes('تردد') || rawResp.includes('الترددية')) validResp = 'الترددية';

      if (!validResp) continue;

      // Find notes & timestamp
      const notes = String(row['الملاحظات'] || row['ملاحظات'] || row['Notes'] || '').trim();
      const dateStr = String(row['التاريخ والوقت'] || row['التاريخ'] || row['Timestamp'] || row['طابع زمني'] || row['Date'] || '').trim();

      // Match driver by serial number
      const matchedDriver = drivers.find(d => d.serialNumber === sNum);
      const driverName = matchedDriver 
        ? matchedDriver.fullName 
        : (String(row['اسم السائق'] || row['السائق'] || row['Driver Name'] || `سائق #${sNum}`).trim());
      const driverId = matchedDriver ? matchedDriver.id : `driver-${sNum}`;

      // Prevent duplicate import
      const isDuplicate = existingResponses.some(r => 
        r.driverSerialNumber === sNum && 
        r.responseType === validResp &&
        (dateStr ? r.createdDate === dateStr : true) &&
        (busNumber ? r.busNumber === busNumber : true)
      );

      if (!isDuplicate) {
        const nowFormatted = new Date().toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        await addDoc(collection(db, 'driver_responses'), {
          driverId,
          driverSerialNumber: sNum,
          driverName,
          busNumber: busNumber || (matchedDriver?.busNumber || '—'),
          responseType: validResp,
          notes: notes || undefined,
          createdDate: dateStr || nowFormatted,
          createdAt: serverTimestamp(),
          createdBy: 'مزامنة Google Sheets تلقائياً'
        });
        addedCount++;
      }
    }

    return { added: addedCount };
  } catch (err: any) {
    console.error('Google Sheet fetch error:', err);
    return { added: 0, error: err?.message || 'حدث خطأ أثناء الاتصال بـ Google Sheet.' };
  }
}
