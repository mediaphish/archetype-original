/**
 * Archetype Original: client email sync.
 *
 * Lives in Bart's own Google account (script.google.com). Every 15 minutes it
 * asks archetypeoriginal.com which addresses belong to clients, reads only
 * mail to or from those addresses (read-only), and sends it to Auto so it
 * lands on each client's timeline. Nothing else in the inbox is read.
 *
 * It also sends the emails Bart approved in his Queue (written by Auto's team),
 * every 5 minutes, from his own account, so they sit in his Sent folder.
 *
 * It proves it is Bart with a Google-signed identity token. No password or
 * key is stored here.
 *
 * To start it: run setUp once and click Allow.
 */

var ENDPOINT = 'https://www.archetypeoriginal.com/api/ao/gmail';
var FIRST_LOOK_DAYS = 30;
// Bart emails Wispr Flow and Echo transcripts here (2026-10-24).
var TRANSCRIPT_ADDRESS = 'bart+transcripts@archetypeoriginal.com';
var TRANSCRIPT_FILES = /\.(txt|vtt|srt|md)$/i;

function setUp() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sync').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('sendOutbox').timeBased().everyMinutes(5).create();
  sync();
  sendOutbox();
}

/**
 * Emails the team wrote and Bart approved. Only approved ones are handed over;
 * each goes out once, from this account, and the site is told what was sent.
 */
function sendOutbox() {
  var auth = { Authorization: 'Bearer ' + ScriptApp.getIdentityToken() };
  var res = UrlFetchApp.fetch(ENDPOINT + '?outbox=1', { headers: auth, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    console.error('Could not get approved emails: ' + res.getResponseCode() + ' ' + res.getContentText());
    return;
  }
  var emails = JSON.parse(res.getContentText()).emails || [];
  if (!emails.length) return;
  var me = Session.getActiveUser().getEmail();
  var results = emails.map(function (e) {
    try {
      var sent = Gmail.Users.Messages.send({ raw: rawEmail(e, me) }, 'me');
      return { id: e.id, ok: true, message_id: sent.id, thread_id: sent.threadId };
    } catch (err) {
      return { id: e.id, ok: false, error: String(err && err.message || err) };
    }
  });
  UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: auth,
    payload: JSON.stringify({ sent: results }),
    muteHttpExceptions: true,
  });
}

function rawEmail(e, me) {
  var to = e.to_name ? '"' + String(e.to_name).replace(/"/g, '') + '" <' + e.to_email + '>' : e.to_email;
  var lines = [
    'To: ' + to,
    'From: "' + String(e.from_name || 'Bart Paden').replace(/"/g, '') + '" <' + me + '>',
    'Subject: =?UTF-8?B?' + Utilities.base64Encode(e.subject, Utilities.Charset.UTF_8) + '?=',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'X-AO-Team: ' + (e.agent || 'auto'),
    '',
    Utilities.base64Encode(e.body, Utilities.Charset.UTF_8),
  ];
  return Utilities.base64EncodeWebSafe(lines.join('\r\n'), Utilities.Charset.UTF_8);
}

function sync() {
  var auth = { Authorization: 'Bearer ' + ScriptApp.getIdentityToken() };
  var res = UrlFetchApp.fetch(ENDPOINT, { headers: auth, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    console.error('Could not get the client list: ' + res.getResponseCode() + ' ' + res.getContentText());
    return;
  }
  var addresses = JSON.parse(res.getContentText()).addresses || [];

  var props = PropertiesService.getScriptProperties();
  var startedAt = Date.now();
  var since = Number(props.getProperty('since')) || startedAt - FIRST_LOOK_DAYS * 864e5;
  // An hour of overlap: the site ignores anything it has already filed.
  var after = Math.floor((since - 3600e3) / 1000);

  sendTranscripts(after, auth);

  if (!addresses.length) {
    props.setProperty('since', String(startedAt));
    return;
  }
  var ids = {};
  for (var i = 0; i < addresses.length; i += 15) {
    var group = addresses.slice(i, i + 15);
    var q = '{' + group.map(function (a) { return 'from:' + a + ' to:' + a + ' cc:' + a; }).join(' ') + '} after:' + after;
    var pageToken = null;
    do {
      var page = Gmail.Users.Messages.list('me', { q: q, maxResults: 100, pageToken: pageToken });
      (page.messages || []).forEach(function (m) { ids[m.id] = true; });
      pageToken = page.nextPageToken;
    } while (pageToken);
  }

  var batch = [];
  Object.keys(ids).forEach(function (id) {
    var m = Gmail.Users.Messages.get('me', id, { format: 'full' });
    var h = headers(m.payload.headers || []);
    if (h['x-ao-client-system']) return; // Already on the timeline: sent by Auto.
    batch.push({
      id: m.id,
      thread_id: m.threadId,
      from: address(h['from']),
      to: list(h['to']).concat(list(h['cc'])),
      date: new Date(Number(m.internalDate)).toISOString(),
      subject: h['subject'] || '',
      body: plainText(m.payload).slice(0, 8000),
    });
    if (batch.length >= 50) { send(batch, auth); batch = []; }
  });
  if (batch.length) send(batch, auth);
  props.setProperty('since', String(startedAt));
}

/** Transcripts Bart emailed to himself: the message text plus any transcript file attached. */
function sendTranscripts(after, auth) {
  var page = Gmail.Users.Messages.list('me', { q: 'to:' + TRANSCRIPT_ADDRESS + ' after:' + after, maxResults: 50 });
  var out = [];
  (page.messages || []).forEach(function (ref) {
    var m = Gmail.Users.Messages.get('me', ref.id, { format: 'full' });
    var h = headers(m.payload.headers || []);
    var text = plainText(m.payload);
    attachments(m.payload).forEach(function (a) {
      if (!TRANSCRIPT_FILES.test(a.filename)) return;
      var data = Gmail.Users.Messages.Attachments.get('me', m.id, a.body.attachmentId).data;
      text += '\n\n' + decode(data);
    });
    out.push({
      id: m.id,
      date: new Date(Number(m.internalDate)).toISOString(),
      subject: h['subject'] || '',
      from: address(h['from']),
      text: text.slice(0, 400000),
    });
  });
  if (!out.length) return;
  var res = UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: auth,
    payload: JSON.stringify({ transcripts: out }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('Auto did not accept the transcripts: ' + res.getContentText());
}

function attachments(part) {
  var found = [];
  if (part && part.filename && part.body && part.body.attachmentId) found.push(part);
  (part && part.parts ? part.parts : []).forEach(function (p) { found = found.concat(attachments(p)); });
  return found;
}

function send(messages, auth) {
  var res = UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: auth,
    payload: JSON.stringify({ messages: messages }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('Auto did not accept the messages: ' + res.getContentText());
}

function headers(list) {
  var out = {};
  list.forEach(function (x) { out[String(x.name).toLowerCase()] = x.value; });
  return out;
}

function address(s) {
  var m = String(s || '').match(/<([^>]+)>/);
  return (m ? m[1] : String(s || '')).trim().toLowerCase();
}

function list(s) {
  return String(s || '').split(',').map(address).filter(function (x) { return x.indexOf('@') > 0; });
}

function plainText(part) {
  if (!part) return '';
  if (part.mimeType === 'text/plain' && part.body && part.body.data) return decode(part.body.data);
  var parts = part.parts || [];
  for (var i = 0; i < parts.length; i++) {
    var t = plainText(parts[i]);
    if (t) return t;
  }
  if (part.mimeType === 'text/html' && part.body && part.body.data) {
    return decode(part.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+\n/g, '\n');
  }
  return '';
}

function decode(data) {
  // Apps Script usually hands the text over as bytes already.
  if (data && typeof data !== 'string') {
    try {
      return Utilities.newBlob(data).getDataAsString('UTF-8');
    } catch (e) {
      return '';
    }
  }
  // Otherwise it is web-safe base64 without the padding the decoder wants; one odd message must not stop the rest.
  var s = String(data || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try {
    return Utilities.newBlob(Utilities.base64Decode(s)).getDataAsString('UTF-8');
  } catch (e) {
    return '';
  }
}
