/**
 * QVisionX form backend — Google Apps Script.
 *
 * Handles both site forms and routes them to separate tabs:
 *   contact form      -> "Enquiries"
 *   /five application -> "Applications"
 *
 * SETUP
 *  1. Open your Google Sheet -> Extensions -> Apps Script.
 *  2. Replace everything in Code.gs with this file.
 *  3. Set NOTIFY_EMAIL below.
 *  4. Deploy -> Manage deployments -> edit the existing deployment ->
 *     Version: New version -> Deploy.
 *     Editing the EXISTING deployment keeps the same /exec URL, so the
 *     site keeps working. Creating a new deployment gives a new URL and
 *     would silently break both forms.
 *
 * Tabs and header rows are created automatically on first submission.
 */

var NOTIFY_EMAIL = 'hello@qvisionx.com';

var SCHEMAS = {
  enquiry: {
    sheet: 'Enquiries',
    headers: ['Timestamp', 'Name', 'Company', 'Email', 'Practice', 'Message'],
    fields:  ['name', 'company', 'email', 'practice', 'message'],
    subject: function (d) { return 'New QVisionX enquiry: ' + (d.name || 'unknown'); }
  },
  application: {
    sheet: 'Applications',
    headers: ['Timestamp', 'Name', 'Email', 'Graduation year', 'Institution',
              'Links', 'Interest', 'Availability', 'Story'],
    fields:  ['name', 'email', 'gradYear', 'institution',
              'links', 'practice', 'availability', 'story'],
    subject: function (d) { return 'QVisionX Five application: ' + (d.name || 'unknown'); }
  }
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Server-side honeypot. The client checks too, but bots POST straight
    // to this URL and skip the page entirely. Return success so they don't retry.
    if (data.website) return ok();

    var schema = (data.type === 'application') ? SCHEMAS.application : SCHEMAS.enquiry;
    var sheet = getSheet(schema);

    // Build the row from the schema so column order never depends on
    // the order keys happen to arrive in.
    var row = [new Date()];
    for (var i = 0; i < schema.fields.length; i++) {
      row.push(data[schema.fields[i]] || '');
    }
    sheet.appendRow(row);

    notify(schema, data);
    return ok();

  } catch (err) {
    // Logged to Executions in the Apps Script console.
    console.error('doPost failed: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet(schema) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(schema.sheet);
  if (!sheet) {
    sheet = ss.insertSheet(schema.sheet);
    sheet.appendRow(schema.headers);
    sheet.getRange(1, 1, 1, schema.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function notify(schema, data) {
  if (!NOTIFY_EMAIL) return;
  try {
    var lines = [];
    for (var i = 0; i < schema.fields.length; i++) {
      var key = schema.fields[i];
      if (data[key]) lines.push(schema.headers[i + 1] + ': ' + data[key]);
    }
    MailApp.sendEmail(NOTIFY_EMAIL, schema.subject(data), lines.join('\n\n'));
  } catch (err) {
    // A failed notification must never lose the submission — the row is
    // already written by this point.
    console.error('notify failed: ' + err);
  }
}

function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}
