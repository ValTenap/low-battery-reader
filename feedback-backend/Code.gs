// Low-Battery Paper Reader: feedback collector
// Paste into a Google Sheet's Apps Script editor (Extensions → Apps Script),
// then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
// Each "Send settings to developer" click appends one row to the "responses" tab.
// Download everything with File → Download → Comma-separated values (.csv).

const SHEET_NAME = 'responses';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    data.received_at = new Date().toISOString();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    let headers = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    const newKeys = Object.keys(data).filter(k => headers.indexOf(k) === -1);
    if (newKeys.length) {
      headers = headers.concat(newKeys);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    // keep free text from being interpreted as formulas
    const safe = v => (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
    sh.appendRow(headers.map(h => (h in data ? safe(data[h]) : '')));
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  } finally {
    lock.releaseLock();
  }
}
