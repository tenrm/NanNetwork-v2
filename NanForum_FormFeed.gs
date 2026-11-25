/**
 * Nan Forum – แบบสอบถามเครือข่าย → Google Form + Google Sheet + JSON feed สำหรับ NanNetwork-v2
 *
 * วิธีใช้ (ทำครั้งเดียว ในบัญชี Google ที่จะเป็นเจ้าของฟอร์ม เช่น tenrmsci@gmail.com):
 *   1) เปิด https://script.google.com → New project → ลบโค้ดเดิม → วางไฟล์นี้ทั้งหมด → Save
 *   2) เลือกฟังก์ชัน setup → Run → อนุญาตสิทธิ์ → ดูลิงก์ฟอร์ม/ชีตใน Execution log
 *   3) Deploy → New deployment → Select type: Web app
 *        Execute as: Me   ·   Who has access: Anyone   → Deploy → คัดลอก Web app URL (ลงท้าย /exec)
 *   4) ส่ง Web app URL ให้ผู้ดูแล NanNetwork-v2 ใส่ใน config.js (NAN_FORM_FEED.url)
 *
 * ความเป็นส่วนตัว: feed (doGet) ส่งออกเฉพาะชื่อหน่วยงาน ประเภท ด้าน และความเชื่อมโยง
 *   - ชื่อผู้ตอบส่งออกเฉพาะเมื่อผู้ตอบติ๊กยินยอม
 *   - เบอร์โทร/อีเมล/LINE ไม่ส่งออกเลย (อยู่ในชีตคำตอบ ให้เจ้าของบัญชีเห็นคนเดียว)
 *
 * ชีตเสริมที่ setup สร้างให้:
 *   - aliases : รวมชื่อหน่วยงานที่พิมพ์ต่างกันให้เป็นชื่อเดียว (คอลัมน์ A ชื่อที่พิมพ์, B ชื่อมาตรฐาน)
 *   - hide    : ใส่ Timestamp (คัดลอกจากชีตคำตอบ) ของคำตอบที่ไม่ต้องการให้แสดง เช่น คำตอบทดสอบ/สแปม
 */

const CFG = {
  TITLE: 'ขอข้อมูลประกอบการประชุม "น่าน ฟอรั่ม" เพื่อเป้าหมาย "Connect-Reconnect"',
  SHEET_NAME: 'NanForum – แบบสอบถามเครือข่าย (คำตอบ)',
  N_PARTNER: 5,   // หน่วยงานที่ทำงานร่วมกัน (มีช่อง "อื่น ๆ" ให้พิมพ์เพิ่มได้)
  N_FUTURE: 3,    // หน่วยงานที่อยากทำงานด้วยในอนาคต
  N_DATA: 3,      // ข้อมูลที่ต้องการ (มีช่อง "เพิ่มเติม")
  CONTACT: 'tenrmsci@gmail.com',
  MAP_URL: 'https://tenrm.github.io/NanNetwork-v2/',
  CACHE_SEC: 20
};

const Q = {
  NAME: 'ชื่อ-สกุล',
  CONTACT: 'โทร / อีเมล / LINE ID',
  CONSENT: 'การแสดงชื่อในแผนภาพ',
  ORG: 'ชื่อหน่วยงานของท่าน',
  OTYPE: 'ประเภทหน่วยงานของท่าน',
  SECT: 'หน่วยงานของท่านทำงานด้านใดบ้าง',
  P_ORG: i => 'ร่วมงาน ' + i + ' – ชื่อหน่วยงาน',
  P_ISS: i => 'ร่วมงาน ' + i + ' – ประเด็น',
  P_MORE: 'ร่วมงาน – หน่วยงานอื่น ๆ',
  F_ORG: i => 'อยากร่วมงาน ' + i + ' – ชื่อหน่วยงาน',
  F_ISS: i => 'อยากร่วมงาน ' + i + ' – ประเด็น',
  D_WHAT: i => 'ข้อมูลที่ต้องการ ' + i + ' – ข้อมูล',
  D_FROM: i => 'ข้อมูลที่ต้องการ ' + i + ' – จากหน่วยงาน',
  D_MORE: 'ข้อมูลที่ต้องการ – เพิ่มเติม'
};
const CONSENT_YES = 'ยินยอมให้แสดงชื่อของข้าพเจ้าในแผนภาพเครือข่าย (ไม่แสดงเบอร์โทร อีเมล หรือ LINE)';

const SECTORS = [
  ['env', 'ทรัพยากรธรรมชาติและสิ่งแวดล้อม'],
  ['agri', 'การเกษตร'],
  ['econ', 'ส่งเสริมเศรษฐกิจ / อาชีพ / ธุรกิจชุมชน'],
  ['tourism', 'การท่องเที่ยว'],
  ['culture', 'วัฒนธรรม / ภูมิปัญญา / การศึกษา'],
  ['health', 'สุขภาพ / อาหาร']
];
const OTYPES = [
  ['gov', 'หน่วยงานราชการ'],
  ['local', 'องค์กรปกครองส่วนท้องถิ่น (อบจ./เทศบาล/อบต.)'],
  ['puborg', 'องค์การมหาชน / รัฐวิสาหกิจ'],
  ['academic', 'สถาบันการศึกษา / วิจัย'],
  ['ngo', 'มูลนิธิ / สมาคม / องค์กรประชาสังคม'],
  ['community', 'กลุ่ม / เครือข่ายชุมชน / วิสาหกิจชุมชน'],
  ['business', 'บริษัท / ภาคเอกชน'],
  ['religious', 'วัด / องค์กรศาสนา'],
  ['intl', 'องค์กรระหว่างประเทศ']
];

// ชื่อย่อ/ชื่อที่พิมพ์ต่างกันที่พบบ่อย → ชื่อมาตรฐาน (แก้ไข/เพิ่มได้ในชีต aliases)
const ALIASES = [
  ['วชช.น่าน', 'วิทยาลัยชุมชนน่าน'],
  ['วิทยาลัยชุมชน จ.น่าน', 'วิทยาลัยชุมชนน่าน'],
  ['อบจ.น่าน', 'องค์การบริหารส่วนจังหวัดน่าน'],
  ['อบจ น่าน', 'องค์การบริหารส่วนจังหวัดน่าน'],
  ['สสจ.น่าน', 'สำนักงานสาธารณสุขจังหวัดน่าน'],
  ['ทสจ.น่าน', 'สำนักงานทรัพยากรธรรมชาติและสิ่งแวดล้อมจังหวัดน่าน'],
  ['เกษตรจังหวัดน่าน', 'สำนักงานเกษตรจังหวัดน่าน'],
  ['สนง.เกษตรจังหวัดน่าน', 'สำนักงานเกษตรจังหวัดน่าน'],
  ['ปศุสัตว์จังหวัดน่าน', 'สำนักงานปศุสัตว์จังหวัดน่าน'],
  ['พช.น่าน', 'สำนักงานพัฒนาชุมชนจังหวัดน่าน'],
  ['พัฒนาชุมชนจังหวัดน่าน', 'สำนักงานพัฒนาชุมชนจังหวัดน่าน'],
  ['พมจ.น่าน', 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดน่าน'],
  ['ปภ.น่าน', 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดน่าน'],
  ['พอช.', 'สถาบันพัฒนาองค์กรชุมชน (องค์การมหาชน)'],
  ['สสส.', 'สำนักงานกองทุนสนับสนุนการสร้างเสริมสุขภาพ (สสส.)'],
  ['สวพส.', 'สถาบันวิจัยและพัฒนาพื้นที่สูง (องค์การมหาชน)'],
  ['อพท.น่าน', 'สำนักงานพื้นที่พิเศษเมืองเก่าน่าน (อพท.)'],
  ['มทร.ล้านนา น่าน', 'มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา น่าน'],
  ['ราชมงคลน่าน', 'มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา น่าน'],
  ['ม.พะเยา', 'มหาวิทยาลัยพะเยา'],
  ['มจร.น่าน', 'มหาวิทยาลัยมหาจุฬาลงกรณราชวิทยาลัย วิทยาเขตน่าน'],
  ['จุฬาฯ', 'จุฬาลงกรณ์มหาวิทยาลัย'],
  ['ธ.ก.ส.', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)'],
  ['ฮักเมืองน่าน', 'มูลนิธิฮักเมืองน่าน'],
  ['รักษ์ไทย', 'มูลนิธิรักษ์ไทย'],
  ['รักษ์ป่าน่าน', 'มูลนิธิรักษ์ป่าน่าน'],
  ['น่านแซนด์บ็อกซ์', 'มูลนิธิรักษ์ป่าน่าน'],
  ['RECOFTC', 'RECOFTC (ศูนย์วนศาสตร์ชุมชนเพื่อคนกับป่า)'],
  ['รีคอฟ', 'RECOFTC (ศูนย์วนศาสตร์ชุมชนเพื่อคนกับป่า)']
];

/* =========================== setup (run once) =========================== */
function setup() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('FORM_ID');
  if (existing) {
    const f = FormApp.openById(existing);
    Logger.log('สร้างไว้แล้ว — ฟอร์ม: ' + f.getPublishedUrl() + '\nแก้ไขฟอร์ม: ' + f.getEditUrl() +
      '\nชีต: ' + SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl());
    return;
  }
  const form = FormApp.create(CFG.TITLE);
  form.setDescription(
    'เพื่อทำแผนภาพเครือข่ายการทำงานในจังหวัดน่าน (ใครทำงานกับใคร เรื่องอะไร) และใช้เชื่อมโยงความร่วมมือหลังการประชุม\n\n' +
    'การใช้ข้อมูล: ชื่อหน่วยงาน ประเภท ด้าน และหน่วยงานที่ทำงานด้วย จะแสดงในแผนภาพเครือข่ายสาธารณะ ' + CFG.MAP_URL + ' ' +
    'ชื่อผู้ตอบจะแสดงเฉพาะเมื่อท่านติ๊กยินยอม ส่วนเบอร์โทร อีเมล และ LINE ใช้สำหรับผู้จัดติดต่อกลับเท่านั้น ไม่เผยแพร่\n' +
    'ขอแก้ไขหรือลบข้อมูลได้ที่ ' + CFG.CONTACT + '\n\nใช้เวลาประมาณ 5–10 นาที · ข้อที่ไม่สะดวกตอบเว้นว่างได้');
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage('ขอบคุณครับ/ค่ะ ข้อมูลของท่านจะปรากฏในแผนภาพเครือข่ายภายในประมาณ 1 นาที: ' + CFG.MAP_URL);

  // 1) ผู้ตอบ
  form.addSectionHeaderItem().setTitle('ข้อมูลผู้ตอบ')
    .setHelpText('สำหรับการติดต่อเพิ่มเติมในอนาคต ถ้าจำเป็นเท่านั้น หากไม่สะดวกไม่ต้องกรอกก็ได้');
  form.addTextItem().setTitle(Q.NAME);
  form.addTextItem().setTitle(Q.CONTACT).setHelpText('ไม่เผยแพร่ ใช้สำหรับผู้จัดติดต่อกลับเท่านั้น');
  const consent = form.addCheckboxItem().setTitle(Q.CONSENT);
  consent.setChoices([consent.createChoice(CONSENT_YES)]);

  // 2) หน่วยงานของท่าน
  form.addPageBreakItem().setTitle('หน่วยงานของท่าน');
  form.addTextItem().setTitle(Q.ORG).setRequired(true).setHelpText('ชื่อเต็ม เช่น วิทยาลัยชุมชนน่าน, องค์การบริหารส่วนตำบล…');
  const ot = form.addMultipleChoiceItem().setTitle(Q.OTYPE);
  ot.setChoices(OTYPES.map(o => ot.createChoice(o[1]))).showOtherOption(true);
  const sc = form.addCheckboxItem().setTitle(Q.SECT).setHelpText('เลือกได้หลายข้อ');
  sc.setChoices(SECTORS.map(s => sc.createChoice(s[1])));

  // 3) หน่วยงานที่ทำงานร่วมกันมากที่สุด
  form.addPageBreakItem().setTitle('หน่วยงานที่ท่านทำงานร่วมกันด้วยมากที่สุด')
    .setHelpText('ในช่วง 1–3 ปีที่ผ่านมา: หน่วยงาน/ส่วนงาน/บริษัท ฯลฯ และประเด็นที่ทำงานด้วย (เช่น เกษตร ดิน น้ำ สุขภาพ อาหาร เยาวชน)');
  for (let i = 1; i <= CFG.N_PARTNER; i++) {
    form.addTextItem().setTitle(Q.P_ORG(i));
    form.addTextItem().setTitle(Q.P_ISS(i));
  }
  form.addParagraphTextItem().setTitle(Q.P_MORE)
    .setHelpText('ถ้ามีมากกว่า ' + CFG.N_PARTNER + ' หน่วยงาน พิมพ์บรรทัดละ 1 หน่วยงาน รูปแบบ  ชื่อหน่วยงาน : ประเด็น');

  // 4) อยากทำงานด้วยในอนาคต
  form.addPageBreakItem().setTitle('หน่วยงานที่ท่านอยากทำงานด้วยในอนาคต')
    .setHelpText('ชื่อหน่วยงาน และเกี่ยวกับประเด็นอะไร');
  for (let i = 1; i <= CFG.N_FUTURE; i++) {
    form.addTextItem().setTitle(Q.F_ORG(i));
    form.addTextItem().setTitle(Q.F_ISS(i));
  }

  // 5) ข้อมูลที่ต้องการ
  form.addPageBreakItem().setTitle('ข้อมูลที่ต้องการ')
    .setHelpText('หากต้องการพัฒนาจังหวัดน่าน / ศึกษาวิจัย ท่านต้องการการสนับสนุนข้อมูลอะไร จากหน่วยงานใด');
  for (let i = 1; i <= CFG.N_DATA; i++) {
    form.addTextItem().setTitle(Q.D_WHAT(i));
    form.addTextItem().setTitle(Q.D_FROM(i));
  }
  form.addParagraphTextItem().setTitle(Q.D_MORE)
    .setHelpText('พิมพ์บรรทัดละ 1 รายการ รูปแบบ  ข้อมูล : จากหน่วยงาน');

  // ชีตคำตอบ + ชีตเสริม
  const ss = SpreadsheetApp.create(CFG.SHEET_NAME);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  const al = ss.insertSheet('aliases');
  al.getRange(1, 1, 1, 2).setValues([['ชื่อที่ผู้ตอบพิมพ์', 'ชื่อมาตรฐานที่ใช้ในแผนภาพ']]).setFontWeight('bold');
  al.getRange(2, 1, ALIASES.length, 2).setValues(ALIASES);
  al.setColumnWidth(1, 260); al.setColumnWidth(2, 420);
  const hd = ss.insertSheet('hide');
  hd.getRange(1, 1, 1, 2).setValues([['Timestamp ของคำตอบที่ไม่ต้องการแสดง (คัดลอกจากชีตคำตอบ)', 'หมายเหตุ']]).setFontWeight('bold');
  hd.setColumnWidth(1, 360);
  const sh1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
  if (sh1 && ss.getSheets().length > 1 && !sh1.getFormUrl()) ss.deleteSheet(sh1);

  props.setProperties({ FORM_ID: form.getId(), SHEET_ID: ss.getId() });
  Logger.log('ลิงก์สำหรับผู้ตอบ: ' + form.getPublishedUrl());
  Logger.log('แก้ไขฟอร์ม: ' + form.getEditUrl());
  Logger.log('ชีตคำตอบ: ' + ss.getUrl());
  Logger.log('ขั้นต่อไป: Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone)');
}

/* =========================== JSON feed =========================== */
function doGet(e) {
  const cache = CacheService.getScriptCache();
  let json = (e && e.parameter && e.parameter.nocache) ? null : cache.get('feed');
  if (!json) {
    json = JSON.stringify(buildFeed_());
    if (json.length < 90000) cache.put('feed', json, CFG.CACHE_SEC);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function normKey_(s) {
  return String(s == null ? '' : s).normalize('NFC').toLowerCase()
    .replace(/[\s​.,;:()\[\]{}"'“”‘’\-–—_\/\\|ฯ]+/g, '');
}
function clean_(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function shortHash_(s) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s, Utilities.Charset.UTF_8);
  return d.slice(0, 5).map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}
function splitPair_(line) {
  const m = String(line).match(/^(.*?)\s*[:：]\s*(.*)$/);
  return m ? [clean_(m[1]), clean_(m[2])] : [clean_(line), ''];
}

function buildFeed_() {
  const props = PropertiesService.getScriptProperties();
  const form = FormApp.openById(props.getProperty('FORM_ID'));
  const ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  const rs = ss.getSheets().filter(s => s.getFormUrl())[0];
  const out = { title: CFG.TITLE, formUrl: form.getPublishedUrl(), updated: new Date().toISOString(), count: 0, responses: [] };
  if (!rs || rs.getLastRow() < 2) return out;

  // aliases
  const alias = {};
  const al = ss.getSheetByName('aliases');
  if (al && al.getLastRow() > 1) al.getRange(2, 1, al.getLastRow() - 1, 2).getValues()
    .forEach(r => { const k = normKey_(r[0]), v = clean_(r[1]); if (k && v) alias[k] = v; });
  const canon = s => { const c = clean_(s); if (!c) return ''; return alias[normKey_(c)] || c; };

  // hidden responses
  const hidden = {};
  const hd = ss.getSheetByName('hide');
  if (hd && hd.getLastRow() > 1) hd.getRange(2, 1, hd.getLastRow() - 1, 1).getValues()
    .forEach(r => { if (r[0] !== '' && r[0] != null) hidden[tsKey_(r[0])] = true; });

  const vals = rs.getDataRange().getValues();
  const head = vals.shift().map(h => clean_(h));
  const col = {};
  head.forEach((h, i) => { col[h] = i; });
  const get = (row, title) => (title in col) ? row[col[title]] : '';
  const secByLabel = {}; SECTORS.forEach(s => { secByLabel[s[1]] = s[0]; });
  const otByLabel = {}; OTYPES.forEach(o => { otByLabel[o[1]] = o[0]; });

  vals.forEach(row => {
    const ts = row[0];
    if (ts === '' || ts == null || hidden[tsKey_(ts)]) return;
    const org = canon(get(row, Q.ORG));
    if (!org) return;
    const consent = String(get(row, Q.CONSENT)).indexOf('ยินยอม') >= 0;
    const sectors = String(get(row, Q.SECT)).split(/,\s*/).map(clean_)
      .map(l => secByLabel[l]).filter(Boolean);
    const otLabel = clean_(get(row, Q.OTYPE));
    const r = {
      id: shortHash_(tsKey_(ts) + '|' + org),
      time: (ts instanceof Date) ? ts.toISOString() : String(ts),
      org: org,
      otype: otByLabel[otLabel] || '',
      otypeText: otByLabel[otLabel] ? '' : otLabel,
      sectors: sectors,
      name: consent ? clean_(get(row, Q.NAME)) : '',
      partners: [], future: [], data: []
    };
    for (let i = 1; i <= CFG.N_PARTNER; i++) {
      const o = canon(get(row, Q.P_ORG(i)));
      if (o) r.partners.push({ org: o, issue: clean_(get(row, Q.P_ISS(i))) });
    }
    String(get(row, Q.P_MORE)).split(/\r?\n/).forEach(line => {
      const p = splitPair_(line); const o = canon(p[0]);
      if (o) r.partners.push({ org: o, issue: p[1] });
    });
    for (let i = 1; i <= CFG.N_FUTURE; i++) {
      const o = canon(get(row, Q.F_ORG(i)));
      if (o) r.future.push({ org: o, issue: clean_(get(row, Q.F_ISS(i))) });
    }
    for (let i = 1; i <= CFG.N_DATA; i++) {
      const w = clean_(get(row, Q.D_WHAT(i))), f = canon(get(row, Q.D_FROM(i)));
      if (w || f) r.data.push({ what: w, from: f });
    }
    String(get(row, Q.D_MORE)).split(/\r?\n/).forEach(line => {
      const p = splitPair_(line);
      if (p[0] || p[1]) r.data.push({ what: p[0], from: canon(p[1]) });
    });
    out.responses.push(r);
  });
  out.count = out.responses.length;
  return out;
}

function tsKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  return clean_(v);
}

/** ทดสอบ feed จาก editor: Run → testFeed แล้วดู Execution log */
function testFeed() {
  Logger.log(JSON.stringify(buildFeed_(), null, 2).slice(0, 8000));
}
