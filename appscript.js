/**********************
 TAVARIS BILET KONTROL SISTEMI v4
 - Osmanli temali minimalist tasarim
 - Odeme onayi sonrası QR olusturma + mail gonderme
 - Kullanilan QR silme
 - Form Yanitlari + Form Istatistikleri uyumlu
 **********************/

/**********************
 * SABITLER
 **********************/

// Sheet bilgileri (YENI DOSYA)
const SPREADSHEET_ID = '1ghNSlyhLRqMR9D5zz0V3ICdPb1CslUJHFZmOMAylc_E';
const SHEET_NAME = 'Form Yanıtları';
const STAT_SHEET_NAME = 'Form İstatistikleri';



// Scanner / dashboard / form gun eslemesi: "Etkinlik Ayarlari" sayfasi (getEventConfig_)
const CONFIG_SHEET_NAME = 'Etkinlik Ayarları';
// "Form İstatistikleri": ustte giris/onayli/kalan (satir 2–4, B/C); altta Tablo1 — A etiket, B deger (satir 7+)

// Mail HTML ve konu satirlari — sheet ile degismez; buradan duzenleyin
const ETKINLIK_ADI = 'Aşk Öldürür';
const ETKINLIK_YER = 'Mamak Kültür Merkezi';
const ETKINLIK_ADRES = 'Demirlibahçe, Talatpaşa Blv No:167, 06340 Mamak/Ankara';
const ETKINLIK_KAPIDA_SAAT = '19:00';
const ETKINLIK_GUN_1_LABEL = '7 Nisan Salı';
const ETKINLIK_GUN_1_SAAT = '19.30';
const ETKINLIK_GUN_2_LABEL = '8 Nisan Çarşamba';
const ETKINLIK_GUN_2_SAAT = '19.30';

// Yonetici mail adresi
const ADMIN_EMAIL = 'burcuakdag2002@gmail.com';
// Test maili
const TEST_EMAIL = 'muhbanz@gmail.com';

// Sütun indexleri (Form Yanıtları) - YENI TABLOYA GORE
// A: Zaman damgasi
// B: Ad-Soyad
// C: Mail Adresi
// D: Telefon Numaraniz
// E: Hangi gun geleceksiniz?
// F: Kac kisi geleceksiniz?
// G: Dekontunuz
// H: Odeme Kontrol Edildi (checkbox)
// I: QR-ID
// J: QR Gonderildi (checkbox)
// K: Okutulan QR Sayisi
// L: LOG
const COL_ZAMAN_DAMGASI = 1;      // A
const COL_AD_SOYAD = 2;           // B
const COL_MAIL = 3;              // C
const COL_TELEFON = 4;           // D
const COL_HANGI_GUN = 5;         // E
const COL_KISI_SAYISI = 6;       // F
const COL_DEKONT = 7;            // G
const COL_ODEME_KONTROL = 8;     // H
const COL_QR_ID = 9;             // I
const COL_QR_GONDERILDI = 10;    // J
const COL_OKUTULAN_SAYI = 11;    // K
const COL_LOG = 12;              // L

// Istatistik Tablosu Konumu (Form İstatistikleri)
const STAT_ROW_GIRIS = 2;
const STAT_ROW_ONAYLI = 3;
const STAT_ROW_KALAN = 4;
const STAT_COL_GUN_1 = 2; // B
const STAT_COL_GUN_2 = 3; // C

// Web App URL (mevcut deployment URL'n varsa burada guncelle)
const WEB_APP_BASE_URL = 'https://script.google.com/macros/s/AKfycbxJhTRpH1OOW-t4Ry-bZnVeSLkzINbolPcxeZHtiuI3HJgbyAUbqXtYm-6OjEIrROkvvA/exec';

/**********************
 * YARDIMCI FONKSIYONLAR
 **********************/

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var name = SHEET_NAME;
  try {
    var c = getEventConfig_();
    if (c.formResponsesSheet && String(c.formResponsesSheet).trim()) {
      name = String(c.formResponsesSheet).trim();
    }
  } catch (e) {
    /* ilk cold start / cache */
  }
  return ss.getSheetByName(name);
}

function getStatSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(STAT_SHEET_NAME);
}

/**
 * A: anahtar, B: deger — 1. satir baslik (Anahtar / Deger)
 */
function readEventConfigMap_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sh) return {};
  const values = sh.getDataRange().getValues();
  const map = {};
  for (let r = 1; r < values.length; r++) {
    const key = (values[r][0] || '').toString().trim();
    if (!key) continue;
    map[key] = values[r][1];
  }
  return map;
}

/** Iki basamakli saat (9 -> "09") */
function pad2Hour_(h) {
  return h < 10 ? '0' + h : String(h);
}

/** Saat tipi hucre (Date veya "19:30:00") -> "19:30" (saniye yok) */
function statTableTimeCellToString_(val) {
  if (val === null || val === undefined) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  }
  const s = String(val).trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const mm = m[2];
    if (h >= 0 && h <= 23) return pad2Hour_(h) + ':' + mm;
  }
  return s;
}

/** Tarih tipi hucre -> "dd.MM.yyyy" (saat ekleme; etiket/mail icin) */
function statTableDateCellToString_(val) {
  if (val === null || val === undefined) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd.MM.yyyy');
  }
  return String(val).trim();
}

/** Metin sutunlari; tesadufen Date ise yine tarih olarak yaz */
function statTableTextCellToString_(val) {
  if (val === null || val === undefined) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd.MM.yyyy');
  }
  return String(val).trim();
}

/** A sutun etiketini kucuk harf + turkce normalize (eslestirme) */
function foldStatSettingLabel_(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ');
}

/**
 * Tablo1 A sutun etiketi -> dahili anahtar + hucre tipi
 */
function mapStatSettingLabelToMeta_(labelRaw) {
  const h = foldStatSettingLabel_(labelRaw);
  if (!h) return null;
  if (h.indexOf('formun cevaplarinin') >= 0 && h.indexOf('sayfa') >= 0) {
    return { key: 'FORM_RESPONSES_SHEET', type: 'text' };
  }
  if (h.indexOf('formun istatistiklerinin') >= 0 && h.indexOf('sayfa') >= 0) {
    return { key: 'FORM_STATS_SHEET', type: 'text' };
  }
  if (h.indexOf('etkinlik adi') >= 0) return { key: 'EVENT_NAME', type: 'text' };
  if (h.indexOf('etkinlik yeri') >= 0) return { key: 'EVENT_VENUE', type: 'text' };
  if (h.indexOf('etkinlik adresi') >= 0) return { key: 'EVENT_ADDRESS', type: 'text' };
  if (h.indexOf('kapi') >= 0 && (h.indexOf('saat') >= 0 || h.indexOf('acilis') >= 0)) {
    return { key: 'DOOR_TIME', type: 'time' };
  }
  if (h.indexOf('1.') === 0 && h.indexOf('gosteri') >= 0 && h.indexOf('tarih') >= 0) {
    return { key: 'GUN_1_LABEL', type: 'date' };
  }
  if (h.indexOf('1.') === 0 && h.indexOf('gosteri') >= 0 && h.indexOf('saat') >= 0) {
    return { key: 'GUN_1_SAAT', type: 'time' };
  }
  if (h.indexOf('2.') === 0 && h.indexOf('gosteri') >= 0 && h.indexOf('tarih') >= 0) {
    return { key: 'GUN_2_LABEL', type: 'date' };
  }
  if (h.indexOf('2.') === 0 && h.indexOf('gosteri') >= 0 && h.indexOf('saat') >= 0) {
    return { key: 'GUN_2_SAAT', type: 'time' };
  }
  if (h.indexOf('admin') >= 0 && h.indexOf('mail') >= 0) return { key: 'ADMIN_EMAIL', type: 'text' };
  if (h.indexOf('test') >= 0 && h.indexOf('mail') >= 0) return { key: 'TEST_EMAIL', type: 'text' };
  if (h.indexOf('google') >= 0 && h.indexOf('form') >= 0 && h.indexOf('link') >= 0) {
    return { key: 'GOOGLE_FORM_LINK', type: 'text' };
  }
  return null;
}

/**
 * Form Istatistikleri: A:B Tablo1 — satir satir etiket eslemesi (satir numarasi sabit degil).
 */
function readEventInfoTableFromStatSheet_() {
  const sh = getStatSheet_();
  if (!sh) return {};

  const values = sh.getDataRange().getValues();
  const map = {};
  for (let r = 0; r < values.length; r++) {
    const meta = mapStatSettingLabelToMeta_(values[r][0]);
    if (!meta) continue;
    const v = values[r][1];
    var strVal = '';
    if (meta.type === 'time') strVal = statTableTimeCellToString_(v);
    else if (meta.type === 'date') strVal = statTableDateCellToString_(v);
    else strVal = statTableTextCellToString_(v);
    if (strVal !== '') map[meta.key] = strVal;
  }
  return map;
}

function mergeEventConfigMaps_() {
  const fromAyar = readEventConfigMap_();
  const fromStat = readEventInfoTableFromStatSheet_();
  const m = {};
  let k;
  for (k in fromAyar) m[k] = fromAyar[k];
  for (k in fromStat) m[k] = fromStat[k];
  return m;
}

/** Tablodan admin mail; yoksa sabit ADMIN_EMAIL */
function getAdminEmail_() {
  const st = readEventInfoTableFromStatSheet_();
  if (st.ADMIN_EMAIL && String(st.ADMIN_EMAIL).trim()) return String(st.ADMIN_EMAIL).trim();
  return ADMIN_EMAIL;
}

/** Tablodan test mail; yoksa sabit TEST_EMAIL */
function getTestEmail_() {
  const st = readEventInfoTableFromStatSheet_();
  if (st.TEST_EMAIL && String(st.TEST_EMAIL).trim()) return String(st.TEST_EMAIL).trim();
  return TEST_EMAIL;
}

/** Gosteri etiketinden gun token (form E sutunu ile eslesme icin); "07..." -> "7" */
function extractLeadingDayToken_(label) {
  const m = String(label || '').match(/^(\d+)/);
  if (!m) return '';
  const n = parseInt(m[1], 10);
  return isNaN(n) ? m[1] : String(n);
}

/** Sadece rakam token ise basamak sifirlarini kaldir (07 -> 7) */
function normalizeNumericDayToken_(tok) {
  const s = String(tok || '').trim();
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

/** Tablo metnindeki "7 Nisan Salı" gibi sondaki hafta gununu kaldir (mail / UI) */
function stripTrWeekdayFromShowDate_(label) {
  const s = String(label || '').trim();
  if (!s) return s;
  return s
    .replace(
      /\s+(Pazartesi|Sali|Salı|Çarşamba|Carsamba|Perşembe|Persembe|Cuma|Cumartesi|Pazar)$/i,
      ''
    )
    .trim();
}

function cellOrDefault_(m, key, def) {
  if (m[key] === null || m[key] === undefined || m[key] === '') return def;
  return m[key];
}

/**
 * Sheet + ScriptCache (~5 dk). Ayar degisince clearEventConfigCache() calistir veya bekleyin.
 * Oncelik: Form Istatistikleri (Etkinlik Bilgileri) > Etkinlik Ayarlari > script sabitleri
 */
function getEventConfig_() {
  const cached = CacheService.getScriptCache().get('event_cfg_json_v1');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // devam: sheet'ten oku
    }
  }
  const m = mergeEventConfigMaps_();
  const statOnly = readEventInfoTableFromStatSheet_();

  const cfg = {
    eventName: String(cellOrDefault_(m, 'EVENT_NAME', ETKINLIK_ADI)),
    venue: String(cellOrDefault_(m, 'EVENT_VENUE', ETKINLIK_YER)),
    address: String(cellOrDefault_(m, 'EVENT_ADDRESS', ETKINLIK_ADRES)),
    cityBadge: String(cellOrDefault_(m, 'EVENT_CITY_BADGE', 'Ankara')),
    appBrandName: String(cellOrDefault_(m, 'APP_BRAND_NAME', 'Bilet Kontrol')),
    doorTime: String(cellOrDefault_(m, 'DOOR_TIME', ETKINLIK_KAPIDA_SAAT)),
    gun1Token: String(cellOrDefault_(m, 'GUN_1_TOKEN', '7')),
    gun1Label: String(cellOrDefault_(m, 'GUN_1_LABEL', ETKINLIK_GUN_1_LABEL)),
    gun1Saat: String(cellOrDefault_(m, 'GUN_1_SAAT', ETKINLIK_GUN_1_SAAT)),
    gun1Limit: parseInt(cellOrDefault_(m, 'GUN_1_KONTENJAN', 270), 10) || 270,
    gun1Tab: String(cellOrDefault_(m, 'GUN_1_TAB', '')),
    gun2Token: String(cellOrDefault_(m, 'GUN_2_TOKEN', '8')),
    gun2Label: String(cellOrDefault_(m, 'GUN_2_LABEL', ETKINLIK_GUN_2_LABEL)),
    gun2Saat: String(cellOrDefault_(m, 'GUN_2_SAAT', ETKINLIK_GUN_2_SAAT)),
    gun2Limit: parseInt(cellOrDefault_(m, 'GUN_2_KONTENJAN', 270), 10) || 270,
    gun2Tab: String(cellOrDefault_(m, 'GUN_2_TAB', '')),
    /** Tablo1: Formun Cevaplarinin Oldugu Sayfa Adi — bos ise SHEET_NAME */
    formResponsesSheet: String(m.FORM_RESPONSES_SHEET || '').trim()
  };

  if (statOnly.GUN_1_LABEL && !statOnly.GUN_1_TOKEN) {
    const t1 = extractLeadingDayToken_(cfg.gun1Label);
    if (t1) cfg.gun1Token = t1;
  }
  if (statOnly.GUN_2_LABEL && !statOnly.GUN_2_TOKEN) {
    const t2 = extractLeadingDayToken_(cfg.gun2Label);
    if (t2) cfg.gun2Token = t2;
  }

  cfg.gun1Token = normalizeNumericDayToken_(cfg.gun1Token);
  cfg.gun2Token = normalizeNumericDayToken_(cfg.gun2Token);

  if (statOnly.GUN_1_LABEL) cfg.gun1Label = stripTrWeekdayFromShowDate_(cfg.gun1Label);
  if (statOnly.GUN_2_LABEL) cfg.gun2Label = stripTrWeekdayFromShowDate_(cfg.gun2Label);

  CacheService.getScriptCache().put('event_cfg_json_v1', JSON.stringify(cfg), 300);
  return cfg;
}

function clearEventConfigCache() {
  CacheService.getScriptCache().remove('event_cfg_json_v1');
}

/** Scanner / public GET icin JSON (sifre gerektirmez) */
function getPublicEventConfigPayload_() {
  const c = getEventConfig_();
  return {
    success: true,
    config: {
      eventName: c.eventName,
      venue: c.venue,
      address: c.address,
      cityBadge: c.cityBadge,
      appBrandName: c.appBrandName,
      doorTime: c.doorTime,
      gun1: {
        token: c.gun1Token,
        label: c.gun1Label,
        saat: c.gun1Saat,
        limit: c.gun1Limit,
        tabLabel: c.gun1Tab || c.gun1Label
      },
      gun2: {
        token: c.gun2Token,
        label: c.gun2Label,
        saat: c.gun2Saat,
        limit: c.gun2Limit,
        tabLabel: c.gun2Tab || c.gun2Label
      }
    }
  };
}

function normalizeText_(value) {
  if (value === null || value === undefined) return '';
  return value.toString().trim().toLowerCase();
}

/** Form E sutunu Date ise dd.MM.yyyy; aksi halde metin (scanner token "7" vb. korunur) */
function hangiGunCellToNormString_(val) {
  if (val === null || val === undefined) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd.MM.yyyy');
  }
  return String(val).trim();
}

function parseDdMmYyyyParts_(str) {
  const s = String(str || '').trim().toLowerCase();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { d: d, mo: mo, y: y };
}

function parseIsoDateParts_(str) {
  const m = String(str || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { d: d, mo: mo, y: y };
}

function sameYmd_(a, b) {
  if (!a || !b) return false;
  return a.d === b.d && a.mo === b.mo && a.y === b.y;
}

/**
 * Satirdaki gun degeri (7, 07.04.2026, Date, "7 Nisan") yapilandirilmis gun ile ayni mi?
 * Token "7" ile "07" ve etiket tarihi birbirini tutmali.
 */
function rowGunMatchesConfiguredGun_(rowNormLower, confToken, confLabel) {
  const r = rowNormLower;
  if (!r) return false;

  const tNorm = normalizeText_(String(confToken || ''));
  const lNorm = normalizeText_(String(confLabel || ''));

  if (tNorm) {
    if (r === tNorm) return true;
    if (/^\d+$/.test(tNorm)) {
      const tn = parseInt(tNorm, 10);
      if (!isNaN(tn)) {
        if (r === String(tn)) return true;
        var reDay = new RegExp('(^|[^0-9])0*' + tn + '(?![0-9])');
        if (reDay.test(r)) return true;
      }
    } else if (r.indexOf(tNorm) !== -1 || tNorm.indexOf(r) !== -1) {
      return true;
    }
  }
  if (lNorm && (r.indexOf(lNorm) !== -1 || lNorm.indexOf(r) !== -1)) return true;

  const labelYmd = parseDdMmYyyyParts_(confLabel);
  const rowYmdDd = parseDdMmYyyyParts_(rowNormLower);
  if (labelYmd && rowYmdDd && sameYmd_(labelYmd, rowYmdDd)) return true;

  const rowIso = parseIsoDateParts_(rowNormLower);
  if (labelYmd && rowIso && sameYmd_(labelYmd, rowIso)) return true;

  if (labelYmd) {
    const m2 = r.match(/^(\d{1,2})(?:[\s.\-]|$)/);
    if (m2 && parseInt(m2[1], 10) === labelYmd.d) return true;
  }

  const rInt = parseInt(r, 10);
  const tInt = parseInt(tNorm, 10);
  if (!isNaN(tInt) && !isNaN(rInt) && tInt === rInt) return true;

  return false;
}

function getGunConfig_(gun) {
  const cfg = getEventConfig_();
  const gunStr = normalizeText_(hangiGunCellToNormString_(gun));
  if (!gunStr) return null;

  if (rowGunMatchesConfiguredGun_(gunStr, cfg.gun1Token, cfg.gun1Label)) {
    return {
      key: 'gun1',
      token: cfg.gun1Token,
      label: cfg.gun1Label,
      saat: cfg.gun1Saat,
      limit: cfg.gun1Limit,
      statCol: STAT_COL_GUN_1
    };
  }

  if (rowGunMatchesConfiguredGun_(gunStr, cfg.gun2Token, cfg.gun2Label)) {
    return {
      key: 'gun2',
      token: cfg.gun2Token,
      label: cfg.gun2Label,
      saat: cfg.gun2Saat,
      limit: cfg.gun2Limit,
      statCol: STAT_COL_GUN_2
    };
  }

  return null;
}

/** Iki hucre/scanner degeri ayni gosterim gunune mu (verify, filtre, kontenjan) */
function sameGunDay_(a, b) {
  const ca = getGunConfig_(a);
  const cb = getGunConfig_(b);
  if (ca && cb) return ca.key === cb.key;
  const sa = normalizeText_(hangiGunCellToNormString_(a));
  const sb = normalizeText_(hangiGunCellToNormString_(b));
  if (!sa || !sb) return false;
  return sa.indexOf(sb) !== -1 || sb.indexOf(sa) !== -1;
}

function encodeEmail_(email) {
  const base64 = Utilities.base64Encode(email, Utilities.Charset.UTF_8);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeEmail_(encoded) {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    return Utilities.newBlob(Utilities.base64Decode(base64)).getDataAsString();
  } catch (e) {
    return null;
  }
}

function generateQrId_(email, biletNo, timestamp) {
  const encodedEmail = encodeEmail_(email);
  return encodedEmail + '-' + timestamp + '-' + biletNo;
}

function extractEmailFromQrId_(qrId) {
  if (!qrId) return null;
  const parts = qrId.split('-');
  if (parts.length < 3) return null;
  return decodeEmail_(parts[0]);
}

function extractBiletNoFromQrId_(qrId) {
  if (!qrId) return null;
  const parts = qrId.split('-');
  if (parts.length < 3) return null;
  return parseInt(parts[parts.length - 1], 10);
}

function generateQrIds_(email, kisiSayisi) {
  const timestamp = new Date().getTime();
  const qrIds = [];
  for (let i = 1; i <= kisiSayisi; i++) {
    qrIds.push(generateQrId_(email, i, timestamp));
  }
  return qrIds.join(',');
}

function parseQrIds_(qrIdString) {
  if (!qrIdString) return [];
  return qrIdString.split(',').map(function(id) { return id.trim(); }).filter(function(id) { return !!id; });
}


/**********************
 * KONTENJAN YONETIMI
 **********************/

function getBiletSayisi_(gun) {
  const sheet = getSheet_();
  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const rowGun = data[i][COL_HANGI_GUN - 1];
    const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 0;

    if (rowGun && sameGunDay_(rowGun, gun)) {
      count += kisiSayisi;
    }
  }

  return count;
}

function checkKontenjan_(gun) {
  const cfg = getGunConfig_(gun);
  if (!cfg) return true;

  const mevcutSayi = getBiletSayisi_(gun);

  if (mevcutSayi >= cfg.limit) {
    const ecfg = getEventConfig_();
    const gunLabel = cfg.label;
    const otherGunLabel = cfg.key === 'gun1' ? ecfg.gun2Label : ecfg.gun1Label;
    
    // ✅ OTOMATİK: Dolu tarihi formdan kaldır
    try {
      updateFormWithSingleDate_(otherGunLabel);
      Logger.log('Otomatik: ' + gunLabel + ' formdan kaldırıldı');
    } catch (err) {
      Logger.log('Form güncelleme hatası: ' + err);
    }
    
    // Admin'e bilgi maili
    const subject = '⛔ Kontenjan Doldu - ' + gunLabel;
    const body =
      'Merhaba,\n\n' +
      gunLabel + ' için kontenjan dolmuştur.\n\n' +
      '✅ ' + gunLabel + ' otomatik olarak formdan kaldırıldı.\n' +
      '✅ Artık sadece ' + otherGunLabel + ' seçilebilir.\n\n' +
      'Mevcut bilet sayısı: ' + mevcutSayi + '\n' +
      'Limit: ' + cfg.limit + '\n\n' +
      'Otomatik bildirim sistemi.';

    try {
      GmailApp.sendEmail(getAdminEmail_(), subject, body);
    } catch (err) {
      Logger.log('Kontenjan mail hatası: ' + err);
    }
    return false;
  }

  return true;
}


/**********************
 * FORM SUBMIT - QR OLUŞTURMA YOK
 **********************/

function onFormSubmit(e) {
  const sheet = getSheet_();
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  const hangiGun = sheet.getRange(lastRow, COL_HANGI_GUN).getValue();
  const kisiSayisi = parseInt(sheet.getRange(lastRow, COL_KISI_SAYISI).getValue(), 10) || 1;

  // Sadece log at, QR olusturma yok
  sheet.getRange(lastRow, COL_LOG).setValue('Form alindi: ' + kisiSayisi + ' kisilik kayit');

  // Kontenjan kontrolü
  checkKontenjan_(hangiGun);
}


/**********************
 * ODEME ONAY - QR OLUŞTUR VE GONDER
 * TARIH DEGISIKLIGI - STATS GUNCELLE
 **********************/

function handleEdit(e) {
  if (!e) return;

  const sheet = e.source.getActiveSheet();
  const mySheet = getSheet_();
  if (!mySheet) return;
  if (sheet.getSheetId() !== mySheet.getSheetId()) return;

  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  if (row === 1) return;

  const logCell = sheet.getRange(row, COL_LOG);

  // TARIH SUTUNU DEĞİŞTİĞİNDE (sadece onayli biletler için)
  if (col === COL_HANGI_GUN) {
    const odemeKontrol = sheet.getRange(row, COL_ODEME_KONTROL).getValue();

    if (odemeKontrol === true) {
      const yeniTarih = e.value;
      const eskiTarih = e.oldValue;
      const kisiSayisi = parseInt(sheet.getRange(row, COL_KISI_SAYISI).getValue(), 10) || 1;

      if (eskiTarih) {
        decrementOnayli_(eskiTarih, kisiSayisi);
      }

      if (yeniTarih) {
        incrementOnayli_(yeniTarih, kisiSayisi);
      }

      logCell.setValue('Tarih degisti: ' + (eskiTarih || 'bos') + ' -> ' + (yeniTarih || 'bos') + ' | ' + new Date().toLocaleString('tr-TR'));
    }
    return;
  }

  // ODEME KONTROL SUTUNU
  if (col !== COL_ODEME_KONTROL) return;
  const newValue = e.value; 
  if (newValue !== 'TRUE' && newValue !== true && newValue !== 'true') return;


  const qrGonderildi = sheet.getRange(row, COL_QR_GONDERILDI).getValue();
  if (qrGonderildi === true) {
    logCell.setValue('QR zaten gonderilmis');
    return;
  }

  const mail = sheet.getRange(row, COL_MAIL).getValue();
  if (!mail) {
    logCell.setValue('HATA: Mail adresi bos');
    return;
  }

  const adSoyad = sheet.getRange(row, COL_AD_SOYAD).getValue();
  const hangiGun = sheet.getRange(row, COL_HANGI_GUN).getValue();
  const kisiSayisi = parseInt(sheet.getRange(row, COL_KISI_SAYISI).getValue(), 10) || 1;

  // QR ID'leri simdi olustur
  const qrIdString = generateQrIds_(mail, kisiSayisi);
  sheet.getRange(row, COL_QR_ID).setValue(qrIdString);
  sheet.getRange(row, COL_OKUTULAN_SAYI).setValue('0/' + kisiSayisi);

  const qrIds = parseQrIds_(qrIdString);

  let qrListHtml = '';
  for (let i = 0; i < qrIds.length; i++) {
    const qrId = qrIds[i];
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrId);

    qrListHtml +=
      '<div style="margin-bottom:30px; padding:20px; border:1px solid #c41e3a; border-radius:12px; background:#faf8f0;">' +
      '<h3 style="margin:0 0 15px 0; color:#1a4480; font-weight:600;">Bilet ' + (i + 1) + ' / ' + kisiSayisi + '</h3>' +
      '<img src="' + qrUrl + '" alt="QR Kod" style="display:block; margin:0 auto; border:2px solid #1a4480; border-radius:8px;">' +
      '</div>';
  }

  var ecMail = getEventConfig_();
  var evAd = String(ecMail.eventName || ETKINLIK_ADI).trim();
  var yerStr = String(ecMail.venue || ETKINLIK_YER).trim();
  var adresStr = String(ecMail.address || ETKINLIK_ADRES).trim();

  const subject = evAd + ' Tiyatro Biletleriniz - ' + adSoyad;
  const htmlBody =
    '<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#faf8f0;">' +
      '<div style="background: linear-gradient(135deg, #1a4480, #0a3d62); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">' +
        '<h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:400; letter-spacing:2px;">' + evAd.toUpperCase() + '</h1>' +
        '<p style="margin:10px 0 0 0; color:#ffffff; font-size:14px;">Biletleriniz Hazir</p>' +
      '</div>' +
      '<div style="background:#fff; padding:30px; border:1px solid #ddd; border-top:none;">' +
        '<p style="font-size:18px; color:#1a4480;">Merhaba <strong>' + adSoyad + '</strong>,</p>' +
        '<p style="color:#333; line-height:1.8;">Odemeniz kontrol edilip onaylandi. <strong>' + hangiGun + '</strong> tarihli tiyatro biletleriniz asagidadir.</p>' +
        '<div style="background:#fff3cd; border-left:4px solid #c41e3a; padding:15px; margin:20px 0;">' +
          '<p style="margin:0; color:#856404; font-size:14px;"><strong>Onemli:</strong> Her QR kod tek kullanimliktir. Giriste her kisi icin ayri QR kod gosterilmelidir.</p>' +
        '</div>' +
        '<div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid #1a4480;">' +
          '<p style="margin:0; color:#1a4480;"><strong>Tarih:</strong> ' + hangiGun + '<br><strong>Yer:</strong> ' + yerStr + ' - ' + adresStr + '<br><strong>Toplam Bilet:</strong> ' + kisiSayisi + ' adet</p>' +
        '</div>' +
        '<hr style="border:none; border-top:1px solid #ddd; margin:25px 0;">' +
        qrListHtml +
        '<hr style="border:none; border-top:1px solid #ddd; margin:25px 0;">' +
        '<p style="text-align:center; color:#666; font-size:14px;">Iyi seyirler dileriz!</p>' +
      '</div>' +
      '<div style="background:#1a4480; padding:15px; border-radius:0 0 12px 12px; text-align:center;">' +
        '<p style="margin:0; color:rgba(250,248,240,0.7); font-size:12px;">Bu mail otomatik olarak gonderilmistir.</p>' +
      '</div>' +
    '</div>';

  try {
    GmailApp.sendEmail(mail, subject, '', { htmlBody: htmlBody });
    sheet.getRange(row, COL_QR_GONDERILDI).setValue(true);
    logCell.setValue('Mail gonderildi: ' + kisiSayisi + ' bilet - ' + new Date().toLocaleString('tr-TR'));
    incrementOnayli_(hangiGun, kisiSayisi);
  } catch (err) {
    logCell.setValue('HATA: Mail gonderilemedi - ' + err);
  }
}


/**********************
 * BILET DOGRULAMA - KULLANILAN QR SILINIR
 **********************/
function verifyTicket(qrId, selectedDate) {
  const sheet = getSheet_();
  if (!sheet) {
    return { status: 'error', title: 'Sistem Hatasi', message: 'Veritabanina erisilemedi.', adSoyad: null, telefon: null, okutulan: null, toplam: null, biletNo: null };
  }

  if (!qrId) {
    return { status: 'error', title: 'Gecersiz QR', message: 'QR kod okunamadi.', adSoyad: null, telefon: null, okutulan: null, toplam: null, biletNo: null };
  }

  const email = extractEmailFromQrId_(qrId);
  const biletNo = extractBiletNoFromQrId_(qrId);

  if (!email) {
    return { status: 'invalid', title: 'Gecersiz Bilet', message: 'Bu QR kod sistemde tanimli degil.', adSoyad: null, telefon: null, okutulan: null, toplam: null, biletNo: biletNo };
  }

  const data = sheet.getDataRange().getValues();
  let foundRow = -1;
  let rowData = null;

  for (let i = 1; i < data.length; i++) {
    const rowMail = data[i][COL_MAIL - 1];
    if (rowMail && rowMail.toString().toLowerCase() === email.toLowerCase()) {
      foundRow = i + 1;
      rowData = data[i];
      break;
    }
  }

  if (foundRow === -1) {
    return { status: 'invalid', title: 'Kayit Bulunamadi', message: 'Bu mail ile kayitli bilet yok.', adSoyad: null, telefon: null, okutulan: null, toplam: null, biletNo: biletNo };
  }

  const adSoyad = rowData[COL_AD_SOYAD - 1];
  const telefon = rowData[COL_TELEFON - 1];
  const hangiGun = rowData[COL_HANGI_GUN - 1];
  const kisiSayisi = parseInt(rowData[COL_KISI_SAYISI - 1], 10) || 1;
  const odemeKontrol = rowData[COL_ODEME_KONTROL - 1];
  const qrIdString = rowData[COL_QR_ID - 1];

  let qrIds = parseQrIds_(qrIdString);
  const kalanQrSayisi = qrIds.length;
  const okutulanSayisi = kisiSayisi - kalanQrSayisi;

  // Tarih kontrolü: token "7" / "07", formda Date veya "7 Nisan" / dd.MM.yyyy — sameGunDay_ ile hizala
  if (selectedDate && selectedDate !== 'all') {
    if (!hangiGun || !sameGunDay_(hangiGun, selectedDate)) {
      var cfgRowV = getGunConfig_(hangiGun);
      var hangiGunDisplay = cfgRowV
        ? cfgRowV.label
        : hangiGunCellToNormString_(hangiGun) || String(hangiGun);
      return {
        status: 'wrong_date',
        title: 'Yanlis Tarih',
        message: 'Bu bilet ' + hangiGunDisplay + ' icin gecerlidir.',
        adSoyad: adSoyad,
        telefon: telefon,
        okutulan: okutulanSayisi,
        toplam: kisiSayisi,
        biletNo: biletNo
      };
    }
  }

  // Odeme kontrolü
  if (odemeKontrol !== true) {
    return {
      status: 'pending',
      title: 'Odeme Onaylanmamis',
      message: 'Bu biletin odemesi henuz onaylanmadi.',
      adSoyad: adSoyad,
      telefon: telefon,
      okutulan: okutulanSayisi,
      toplam: kisiSayisi,
      biletNo: biletNo
    };
  }

  // QR listede var mi?
  const qrIndex = qrIds.indexOf(qrId);
  if (qrIndex === -1) {
    return {
      status: 'used',
      title: 'Gecersiz QR',
      message: 'Bu QR kod daha once kullanilmis ya da hatali.',
      adSoyad: adSoyad,
      telefon: telefon,
      okutulan: okutulanSayisi,
      toplam: kisiSayisi,
      biletNo: biletNo
    };
  }

  // QR'ı listeden SIL
  qrIds.splice(qrIndex, 1);

  // Yeni okutulan sayisi
  const yeniOkutulanSayisi = kisiSayisi - qrIds.length;

  // Sheet guncelle
  sheet.getRange(foundRow, COL_QR_ID).setValue(qrIds.join(','));
  sheet.getRange(foundRow, COL_OKUTULAN_SAYI).setValue(yeniOkutulanSayisi + '/' + kisiSayisi);

  // LOG
  const logValue = rowData[COL_LOG - 1] || '';
  const now = new Date().toLocaleString('tr-TR');
  sheet.getRange(foundRow, COL_LOG).setValue(logValue + ' | #' + biletNo + ' ' + now);

  incrementGiris_(hangiGun);

  return {
    status: 'ok',
    title: 'Giris Onaylandi',
    message: 'Hos geldiniz! Iyi seyirler.',
    adSoyad: adSoyad,
    telefon: telefon,
    okutulan: yeniOkutulanSayisi,
    toplam: kisiSayisi,
    biletNo: biletNo,
    hangiGun: hangiGun
  };
}


/**********************
 * ISTATISTIK TABLOSU FONKSIYONLARI
 **********************/

function getStatColumn_(gun) {
  const cfg = getGunConfig_(gun);
  return cfg ? cfg.statCol : STAT_COL_GUN_1;
}

function incrementGiris_(gun) {
  const sheet = getStatSheet_();
  if (!sheet) return;

  const cfg = getGunConfig_(gun);
  if (!cfg) return;

  const cell = sheet.getRange(STAT_ROW_GIRIS, cfg.statCol);
  const current = parseInt(cell.getValue(), 10) || 0;
  cell.setValue(current + 1);
}

function incrementOnayli_(gun, sayi) {
  const sheet = getStatSheet_();
  if (!sheet) return;

  const cfg = getGunConfig_(gun);
  if (!cfg) return;

  const onayliCell = sheet.getRange(STAT_ROW_ONAYLI, cfg.statCol);
  const currentOnayli = parseInt(onayliCell.getValue(), 10) || 0;
  const newOnayli = currentOnayli + sayi;
  onayliCell.setValue(newOnayli);

  const kalanCell = sheet.getRange(STAT_ROW_KALAN, cfg.statCol);
  kalanCell.setValue(cfg.limit - newOnayli);
}

function decrementOnayli_(gun, sayi) {
  const sheet = getStatSheet_();
  if (!sheet) return;

  const cfg = getGunConfig_(gun);
  if (!cfg) return;

  const onayliCell = sheet.getRange(STAT_ROW_ONAYLI, cfg.statCol);
  const currentOnayli = parseInt(onayliCell.getValue(), 10) || 0;
  const newOnayli = Math.max(0, currentOnayli - sayi);
  onayliCell.setValue(newOnayli);

  const kalanCell = sheet.getRange(STAT_ROW_KALAN, cfg.statCol);
  kalanCell.setValue(cfg.limit - newOnayli);
}

function initStats() {
  const sheet = getStatSheet_();
  if (!sheet) {
    Logger.log('HATA: Form Istatistikleri sayfasi bulunamadi!');
    return;
  }

  const ec = getEventConfig_();

  // Gun 1
  sheet.getRange(STAT_ROW_GIRIS, STAT_COL_GUN_1).setValue(0);
  sheet.getRange(STAT_ROW_ONAYLI, STAT_COL_GUN_1).setValue(0);
  sheet.getRange(STAT_ROW_KALAN, STAT_COL_GUN_1).setValue(ec.gun1Limit);

  // Gun 2
  sheet.getRange(STAT_ROW_GIRIS, STAT_COL_GUN_2).setValue(0);
  sheet.getRange(STAT_ROW_ONAYLI, STAT_COL_GUN_2).setValue(0);
  sheet.getRange(STAT_ROW_KALAN, STAT_COL_GUN_2).setValue(ec.gun2Limit);

  Logger.log('Istatistik tablosu sifirlandi.');
}

function getStats(gun) {
  const sheet = getStatSheet_();
  if (!sheet) return { total: 0, used: 0, remaining: 0, limit: 0 };

  const cfg = getGunConfig_(gun);
  if (!cfg) return { total: 0, used: 0, remaining: 0, limit: 0 };

  const giris = parseInt(sheet.getRange(STAT_ROW_GIRIS, cfg.statCol).getValue(), 10) || 0;
  const onayli = parseInt(sheet.getRange(STAT_ROW_ONAYLI, cfg.statCol).getValue(), 10) || 0;
  const kalan = parseInt(sheet.getRange(STAT_ROW_KALAN, cfg.statCol).getValue(), 10);
  const kalanSafe = isNaN(kalan) ? cfg.limit : kalan;

  return {
    total: onayli,
    used: giris,
    remaining: kalanSafe,
    limit: cfg.limit
  };
}

/**
 * TEK SEFERLIK COUNT - Mevcut verileri sayar ve stats sayfasina yazar
 */
function countBiletler() {
  const sheet = getSheet_();
  const statSheet = getStatSheet_();

  if (!sheet || !statSheet) {
    Logger.log('HATA: Sheet bulunamadi!');
    return;
  }

  const data = sheet.getDataRange().getValues();

  let onayliGun1 = 0;
  let onayliGun2 = 0;
  let girisGun1 = 0;
  let girisGun2 = 0;

  for (let i = 1; i < data.length; i++) {
    const hangiGun = data[i][COL_HANGI_GUN - 1];
    const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 0;
    const odemeKontrol = data[i][COL_ODEME_KONTROL - 1];
    const okutulanSayiStr = data[i][COL_OKUTULAN_SAYI - 1] || '0/0';

    if (!hangiGun) continue;

    const cfg = getGunConfig_(hangiGun);
    if (!cfg) continue;

    if (odemeKontrol === true) {
      if (cfg.key === 'gun1') {
        onayliGun1 += kisiSayisi;
      } else if (cfg.key === 'gun2') {
        onayliGun2 += kisiSayisi;
      }

      const parts = okutulanSayiStr.toString().split('/');
      const okutulan = parseInt(parts[0], 10) || 0;

      if (cfg.key === 'gun1') {
        girisGun1 += okutulan;
      } else if (cfg.key === 'gun2') {
        girisGun2 += okutulan;
      }
    }
  }

  const ecCount = getEventConfig_();

  // Stats sayfasina yaz
  statSheet.getRange(STAT_ROW_GIRIS, STAT_COL_GUN_1).setValue(girisGun1);
  statSheet.getRange(STAT_ROW_ONAYLI, STAT_COL_GUN_1).setValue(onayliGun1);
  statSheet.getRange(STAT_ROW_KALAN, STAT_COL_GUN_1).setValue(ecCount.gun1Limit - onayliGun1);

  statSheet.getRange(STAT_ROW_GIRIS, STAT_COL_GUN_2).setValue(girisGun2);
  statSheet.getRange(STAT_ROW_ONAYLI, STAT_COL_GUN_2).setValue(onayliGun2);
  statSheet.getRange(STAT_ROW_KALAN, STAT_COL_GUN_2).setValue(ecCount.gun2Limit - onayliGun2);

  Logger.log('=== COUNT SONUCLARI ===');
  Logger.log(ecCount.gun1Label + ' - Onayli: ' + onayliGun1 + ', Giris: ' + girisGun1 + ', Kalan: ' + (ecCount.gun1Limit - onayliGun1));
  Logger.log(ecCount.gun2Label + ' - Onayli: ' + onayliGun2 + ', Giris: ' + girisGun2 + ', Kalan: ' + (ecCount.gun2Limit - onayliGun2));

  return {
    gun1: { onayli: onayliGun1, giris: girisGun1, kalan: ecCount.gun1Limit - onayliGun1 },
    gun2: { onayli: onayliGun2, giris: girisGun2, kalan: ecCount.gun2Limit - onayliGun2 }
  };
}




/**********************
 * HATIRLATMA MAILI FONKSIYONLARI
 **********************/

function buildReminderHtml_(adSoyad, hangiGun, saat, qrIds, kisiSayisi) {
  const ec = getEventConfig_();
  const evAd = String(ec.eventName || ETKINLIK_ADI).trim();
  const evYer = String(ec.venue || ETKINLIK_YER).trim();
  const evAdres = String(ec.address || ETKINLIK_ADRES).trim();
  const evKapi = String(ec.doorTime || ETKINLIK_KAPIDA_SAAT).trim();
  const sehirEtiket = String(ec.cityBadge || 'Ankara').toUpperCase();

  let qrListHtml = '';

  for (let i = 0; i < qrIds.length; i++) {
    const qrId = qrIds[i];
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrId);

    qrListHtml +=
      '<div style="margin-bottom:25px; padding:20px; border:2px solid #1a4480; border-radius:16px; background:#fff;">' +
        '<h3 style="margin:0 0 15px 0; color:#1a4480; font-weight:600; text-align:center;">Bilet ' + (i + 1) + ' / ' + kisiSayisi + '</h3>' +
        '<img src="' + qrUrl + '" alt="QR Kod" style="display:block; margin:0 auto 15px; border:3px solid #c41e3a; border-radius:12px;">' +
        '<div style="background:#f8f9fa; padding:10px; border-radius:8px; text-align:center;">' +
          '<span style="font-size:11px; color:#666; word-break:break-all;">QR-ID: ' + qrId + '</span>' +
        '</div>' +
      '</div>';
  }

  return '<!DOCTYPE html>' +
    '<html>' +
    '<head><meta charset="UTF-8"></head>' +
    '<body style="margin:0; padding:0; background:#f5f0e6;">' +
    '<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">' +

    '<div style="background: linear-gradient(135deg, #c41e3a, #8b0000); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">' +
    '<div style="font-size:12px; letter-spacing:4px; color:rgba(250,248,240,0.8); margin-bottom:8px;">' + sehirEtiket + '</div>' +
    '<h1 style="margin:0; color:#faf8f0; font-size:32px; font-weight:400; letter-spacing:3px;">' + evAd.toUpperCase() + '</h1>' +
    '<p style="margin:12px 0 0 0; color:rgba(250,248,240,0.9); font-size:16px;">Etkinlik Hatirlatmasi</p>' +
    '</div>' +

    '<div style="background:#faf8f0; padding:30px; border-left:1px solid #ddd; border-right:1px solid #ddd;">' +

    '<p style="font-size:18px; color:#1a4480; margin-bottom:25px;">Merhaba <strong>' + adSoyad + '</strong>,</p>' +

    '<p style="color:#333; line-height:1.8; margin-bottom:25px;">' +
    evAd + ' etkinligimize katilacaginiz icin cok heyecanliyiz! ' +
    'Biletlerinizi ve etkinlik detaylarini asagida bulabilirsiniz.' +
    '</p>' +

    '<div style="background: linear-gradient(135deg, #1a4480, #0a3d62); padding:25px; border-radius:16px; margin-bottom:25px; color:#faf8f0;">' +
    '<h2 style="margin:0 0 20px 0; font-size:20px; font-weight:400; text-align:center; letter-spacing:2px;">ETKINLIK DETAYLARI</h2>' +

    '<table style="width:100%; border-collapse:collapse;">' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7); width:80px;">Tarih:</td><td style="padding:8px 0; font-weight:600;">' + hangiGun + '</td></tr>' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7);">Saat:</td><td style="padding:8px 0; font-weight:600;">' + saat + '</td></tr>' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7);">Yer:</td><td style="padding:8px 0; font-weight:600;">' + evYer + '</td></tr>' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7);">Adres:</td><td style="padding:8px 0; font-weight:600;">' + evAdres + '</td></tr>' +
    '</table>' +
    '</div>' +

    '<div style="background:#fff3cd; border-left:5px solid #c41e3a; padding:20px; margin-bottom:25px; border-radius:0 12px 12px 0;">' +
    '<p style="margin:0 0 10px 0; color:#856404; font-weight:600;">Onemli Hatirlatmalar:</p>' +
    '<ul style="margin:0; padding-left:20px; color:#856404; line-height:1.8;">' +
    '<li>Lutfen <strong>' + evKapi + '</strong>\'de kapida olunuz.</li>' +
    '<li>Her kisi icin ayri QR kod gosterilmelidir.</li>' +
    '<li>QR kodlarinizi ekran parlakligi acik sekilde hazir tutunuz.</li>' +
    '<li>Mail iceriginde QR kodunuz net gozukmuyorsa veya kapida sorun cikarsa lutfen gorevliye QR-ID bilginizi manuel kontrol icin veriniz.</li>' +
    '</ul>' +
    '</div>' +

    '<div style="background:#e8f5e9; border:2px solid #2e7d32; padding:15px; border-radius:12px; text-align:center; margin-bottom:25px;">' +
    '<span style="color:#2e7d32; font-size:18px;">Toplam <strong>' + kisiSayisi + '</strong> Bilet</span>' +
    '</div>' +

    '<hr style="border:none; border-top:2px dashed #ddd; margin:25px 0;">' +
    '<h2 style="text-align:center; color:#1a4480; font-size:20px; font-weight:400; margin-bottom:20px; letter-spacing:2px;">BILETLERINIZ</h2>' +

    qrListHtml +

    '<hr style="border:none; border-top:2px dashed #ddd; margin:25px 0;">' +
    '<p style="text-align:center; color:#666; font-size:16px; line-height:1.8;">' +
    'Sizi aramizda gormekten mutluluk duyacagiz!<br>' +
    '<strong style="color:#1a4480;">Iyi seyirler dileriz.</strong>' +
    '</p>' +
    '</div>' +

    '<div style="background:#1a4480; padding:20px; border-radius:0 0 16px 16px; text-align:center;">' +
    '<p style="margin:0 0 5px 0; color:#faf8f0; font-size:14px;">' + evAd + ' Tiyatro Ekibi</p>' +
    '<p style="margin:0; color:rgba(250,248,240,0.6); font-size:12px;">Bu mail otomatik olarak gonderilmistir.</p>' +
    '</div>' +

    '</div>' +
    '</body>' +
    '</html>';
}

/**
 * TEST - Hatirlatma maili testi
 */
function sendReminderTest() {
  const cT = getEventConfig_();
  const testAdSoyad = 'Test Kullanici';
  const testGun = cT.gun1Label;
  const testSaat = cT.gun1Saat;
  const testQrIds = ['TEST-QR-ID-1-BILET', 'TEST-QR-ID-2-BILET', 'TEST-QR-ID-3-BILET'];
  const testKisiSayisi = 3;

  const htmlBody = buildReminderHtml_(testAdSoyad, testGun, testSaat, testQrIds, testKisiSayisi);
  const subject = '[TEST] ' + String(cT.eventName || ETKINLIK_ADI).trim() + ' - Etkinlik Hatirlatmasi';

  try {
    GmailApp.sendEmail(getTestEmail_(), subject, '', { htmlBody: htmlBody });
    Logger.log('Test maili gonderildi: ' + getTestEmail_());
  } catch (err) {
    Logger.log('HATA: ' + err);
  }
}

/**
 * 1. gun icin tum onayli biletlere hatirlatma maili gonder
 */
function sendReminderGun1() {
  const c = getEventConfig_();
  sendReminderByDate_(c.gun1Token, c.gun1Saat);
}

/**
 * 2. gun icin tum onayli biletlere hatirlatma maili gonder
 */
function sendReminderGun2() {
  const c = getEventConfig_();
  sendReminderByDate_(c.gun2Token, c.gun2Saat);
}

/**
 * Geri uyumluluk icin (istersen bunlari da trigger'a baglayabilirsin)
 */
function sendReminder6Mart() {
  sendReminderGun1();
}

function sendReminder9Mart() {
  sendReminderGun2();
}

/**
 * Belirli bir tarih icin hatirlatma maili gonder (internal)
 */
function sendReminderByDate_(gun, saat) {
  const sheet = getSheet_();
  if (!sheet) {
    Logger.log('HATA: Sheet bulunamadi!');
    return;
  }

  const ecHat = getEventConfig_();
  const evNameHat = String(ecHat.eventName || ETKINLIK_ADI).trim();

  const data = sheet.getDataRange().getValues();
  let gonderilen = 0;
  let hata = 0;
  let atlanan = 0;

  Logger.log('=== HATIRLATMA MAILI BASLADI: ' + gun + ' ===');
  Logger.log('Toplam satir: ' + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = i + 1;
    const hangiGun = data[i][COL_HANGI_GUN - 1];
    const odemeKontrol = data[i][COL_ODEME_KONTROL - 1];
    const qrGonderildi = data[i][COL_QR_GONDERILDI - 1];
    const mail = data[i][COL_MAIL - 1];
    const adSoyad = data[i][COL_AD_SOYAD - 1];
    const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 1;
    const qrIdString = data[i][COL_QR_ID - 1];

      if (!hangiGun || !sameGunDay_(hangiGun, gun)) {
      continue;
    }

    // Sadece odemesi onayli kayitlar
    if (odemeKontrol !== true) {
      atlanan++;
      sheet.getRange(row, COL_LOG).setValue((data[i][COL_LOG - 1] || '') + ' | Hatirlatma atlandi (odeme onaysiz) ' + new Date().toLocaleString('tr-TR'));
      continue;
    }

    // QR gonderilmemisse hatirlatma da gonderme (cunku QR yoktur)
    if (qrGonderildi !== true || !qrIdString) {
      atlanan++;
      sheet.getRange(row, COL_LOG).setValue((data[i][COL_LOG - 1] || '') + ' | Hatirlatma atlandi (QR yok/gonderilmemis) ' + new Date().toLocaleString('tr-TR'));
      continue;
    }

    if (!mail) {
      hata++;
      sheet.getRange(row, COL_LOG).setValue((data[i][COL_LOG - 1] || '') + ' | HATA: Hatirlatma maili icin mail bos ' + new Date().toLocaleString('tr-TR'));
      continue;
    }

    const qrIds = parseQrIds_(qrIdString);

    // Tum QR'lar kullanilmissa yine de hatirlatma anlamsiz olabilir, atlayalim
    if (qrIds.length === 0) {
      atlanan++;
      sheet.getRange(row, COL_LOG).setValue((data[i][COL_LOG - 1] || '') + ' | Hatirlatma atlandi (kalan QR yok) ' + new Date().toLocaleString('tr-TR'));
      continue;
    }

    try {
      const htmlBody = buildReminderHtml_(adSoyad, hangiGun, saat, qrIds, kisiSayisi);
      const subject = evNameHat + ' - Etkinlik Hatirlatmasi (' + hangiGun + ')';

      GmailApp.sendEmail(mail, subject, '', { htmlBody: htmlBody });

      gonderilen++;
      const eskiLog = data[i][COL_LOG - 1] || '';
      sheet.getRange(row, COL_LOG).setValue(eskiLog + ' | Hatirlatma gonderildi ' + new Date().toLocaleString('tr-TR'));

      // Mail limitlerine takilmamak icin kisa bekleme
      Utilities.sleep(300);
    } catch (err) {
      hata++;
      const eskiLog = data[i][COL_LOG - 1] || '';
      sheet.getRange(row, COL_LOG).setValue(eskiLog + ' | HATA: Hatirlatma gonderilemedi - ' + err + ' ' + new Date().toLocaleString('tr-TR'));
      Logger.log('Satir ' + row + ' hatasi: ' + err);
    }
  }

  Logger.log('=== HATIRLATMA TAMAMLANDI ===');
  Logger.log('Tarih: ' + gun);
  Logger.log('Gonderilen: ' + gonderilen);
  Logger.log('Atlanan: ' + atlanan);
  Logger.log('Hata: ' + hata);

  // Ozet admin maili (opsiyonel ama faydali)
  try {
    const summarySubject = evNameHat + ' Hatirlatma Ozeti - ' + gun;
    const summaryBody =
      'Hatirlatma gonderimi tamamlandi.\n\n' +
      'Tarih: ' + gun + '\n' +
      'Gonderilen: ' + gonderilen + '\n' +
      'Atlanan: ' + atlanan + '\n' +
      'Hata: ' + hata + '\n' +
      'Saat: ' + new Date().toLocaleString('tr-TR');

    GmailApp.sendEmail(getAdminEmail_(), summarySubject, summaryBody);
  } catch (err) {
    Logger.log('Admin ozet maili gonderilemedi: ' + err);
  }
}


/**********************
 * KURULUM / BAKIM FONKSIYONLARI
 **********************/

/**
 * Form yanitlari sayfasinda checkbox kolonlarini checkbox olarak set eder
 * (H ve J kolonlari)
 */
function setupCheckboxes() {
  const sheet = getSheet_();
  if (!sheet) return;

  const lastRow = Math.max(sheet.getMaxRows(), 2);

  // H: Odeme Kontrol Edildi
  sheet.getRange(2, COL_ODEME_KONTROL, lastRow - 1, 1).insertCheckboxes();

  // J: QR Gonderildi
  sheet.getRange(2, COL_QR_GONDERILDI, lastRow - 1, 1).insertCheckboxes();

  Logger.log('Checkbox kolonlari ayarlandi.');
}

/**
 * Basliklari kontrol eder / isterse yeniden yazar
 */
function setupHeaders() {
  const sheet = getSheet_();
  if (!sheet) return;

  const headers = [[
    'Zaman damgasi',
    'Ad-Soyad',
    'Mail Adresi',
    'Telefon Numaraniz',
    'Hangi gun geleceksiniz?',
    'Kac kisi geleceksiniz?',
    'Dekontunuz',
    'Odeme Kontrol Edildi',
    'QR-ID',
    'QR Gonderildi',
    'Okutulan QR Sayisi',
    'LOG'
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  Logger.log('Headerlar ayarlandi.');
}

/**
 * Eski kayitlarda QR-ID var ama okutulan sayi bos ise doldurur
 */
function repairOkutulanSayisi() {
  const sheet = getSheet_();
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let fixed = 0;

  for (let i = 1; i < data.length; i++) {
    const row = i + 1;
    const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 1;
    const qrIdString = data[i][COL_QR_ID - 1];
    const okutulanCell = data[i][COL_OKUTULAN_SAYI - 1];

    if (!qrIdString) continue;
    if (okutulanCell && okutulanCell.toString().indexOf('/') > -1) continue;

    const kalan = parseQrIds_(qrIdString).length;
    const okutulan = Math.max(0, kisiSayisi - kalan);

    sheet.getRange(row, COL_OKUTULAN_SAYI).setValue(okutulan + '/' + kisiSayisi);
    fixed++;
  }

  Logger.log('repairOkutulanSayisi tamamlandi. Duzeltilen satir: ' + fixed);
}

/**
 * Eski kayitlarda odeme onayli + QR gonderildi ama QR-ID bos ise yeniden QR uretir.
 * Dikkat: Bunu sadece gerekiyorsa calistir.
 */
function backfillMissingQrIds() {
  const sheet = getSheet_();
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let fixed = 0;

  for (let i = 1; i < data.length; i++) {
    const row = i + 1;
    const odemeKontrol = data[i][COL_ODEME_KONTROL - 1];
    const mail = data[i][COL_MAIL - 1];
    const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 1;
    const qrIdString = data[i][COL_QR_ID - 1];

    if (odemeKontrol !== true) continue;
    if (!mail) continue;
    if (qrIdString) continue;

    const yeniQr = generateQrIds_(mail, kisiSayisi);
    sheet.getRange(row, COL_QR_ID).setValue(yeniQr);
    sheet.getRange(row, COL_OKUTULAN_SAYI).setValue('0/' + kisiSayisi);

    const eskiLog = data[i][COL_LOG - 1] || '';
    sheet.getRange(row, COL_LOG).setValue(eskiLog + ' | QR backfill yapildi ' + new Date().toLocaleString('tr-TR'));

    fixed++;
  }

  Logger.log('backfillMissingQrIds tamamlandi. Duzeltilen satir: ' + fixed);
}

/**
 * Trigger kurulum yardimcisi (manuel bir kez calistir)
 * Not: onEdit trigger'ini handleEdit fonksiyonuna bagliyoruz.
 */
function setupTriggers() {
  const projectTriggers = ScriptApp.getProjectTriggers();

  // Mevcut triggerlari temizle (opsiyonel, cift trigger olmasin diye)
  for (let i = 0; i < projectTriggers.length; i++) {
    const t = projectTriggers[i];
    const fn = t.getHandlerFunction();
    if (fn === 'onFormSubmit' || fn === 'handleEdit') {
      ScriptApp.deleteTrigger(t);
    }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Form submit trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  // Edit trigger (installable)
  ScriptApp.newTrigger('handleEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  Logger.log('Triggerlar kuruldu: onFormSubmit + handleEdit');
}


function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'eventConfig') {
    return ContentService.createTextOutput(JSON.stringify(getPublicEventConfigPayload_()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const page = e && e.parameter && e.parameter.page;

  if (page === 'test') {
    return HtmlService.createHtmlOutput(buildTestHtml())
      .setTitle('Kamera Test')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page === 'scan') {
    const ecPg = getEventConfig_();
    return HtmlService.createHtmlOutput(buildScannerHtml())
      .setTitle(String(ecPg.eventName || ETKINLIK_ADI).trim() + ' Tiyatro')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutput(buildUnauthorizedHtml());
}

// ============ DIŞ API ENDPOINT ============

function doPost(e) {
  try {
    if (!e || !e.postData) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'No data'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const pin = data.pin;
    
    // PIN kontrolü
    if (pin !== '4321') {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Invalid PIN'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let result;
    
    switch (action) {
      // Scanner actions
      case 'verify':
        result = verifyTicket(data.qr, data.date);
        break;
      case 'stats':
        result = getStats(data.date);
        break;
        
      // Admin panel actions
      case 'search':
        result = searchTickets(data.query, data.date);
        break;
      case 'getAllTickets':
        result = getAllTickets(data.date, data.page, data.limit);
        break;
      case 'getTicket':
        result = getTicketByRow(data.row);
        break;
      case 'manualCheckIn':
        result = manualCheckIn(data.row, data.biletNo);
        break;
      case 'manualCheckInAll':
        result = manualCheckInAll(data.row);
        break;
      case 'updatePayment':
        result = updatePaymentStatus(data.row, data.status);
        break;
      case 'resendQr':
        result = resendQrEmail(data.row);
        break;
      case 'dashboard':
        result = getDashboardStats();
        break;
        
      default:
        result = {success: false, error: 'Unknown action'};
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// API için stats fonksiyonu
function getStatsForApi(gun) {
    try {
        const statSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAT_SHEET_NAME);
        if (!statSheet) {
            return { used: 0, total: 0, remaining: 0 };
        }

        var cfgApi = getGunConfig_(gun);
        var col = cfgApi && cfgApi.key === 'gun2' ? STAT_COL_GUN_2 : STAT_COL_GUN_1;

        const giris = statSheet.getRange(STAT_ROW_GIRIS, col).getValue() || 0;
        const onayli = statSheet.getRange(STAT_ROW_ONAYLI, col).getValue() || 0;
        const kalan = statSheet.getRange(STAT_ROW_KALAN, col).getValue() || 0;

        return {
            used: giris,
            total: onayli,
            remaining: kalan
        };
    } catch (err) {
        return { used: 0, total: 0, remaining: 0, error: err.toString() };
    }
}

/**********************
 * ADMIN PANEL API FONKSIYONLARI
 **********************/

/**
 * Mail veya isim ile bilet ara
 */
function searchTickets(query, gun) {
  const sheet = getSheet_();
  if (!sheet) return { success: false, error: 'Sheet bulunamadi', results: [] };
  
  const data = sheet.getDataRange().getValues();
  const results = [];
  const searchTerm = query.toString().toLowerCase().trim();
  
  for (let i = 1; i < data.length; i++) {
    const row = i + 1;
    const adSoyad = (data[i][COL_AD_SOYAD - 1] || '').toString().toLowerCase();
    const mail = (data[i][COL_MAIL - 1] || '').toString().toLowerCase();
    const telefon = (data[i][COL_TELEFON - 1] || '').toString();
    const hangiGunRaw = data[i][COL_HANGI_GUN - 1];
    const qrIdString = (data[i][COL_QR_ID - 1] || '').toString().toLowerCase();
    
    // Gun filtresi (Date hucre + token uyumu)
    if (gun && gun !== 'all' && !sameGunDay_(hangiGunRaw, gun)) continue;
    const hangiGun = hangiGunCellToNormString_(hangiGunRaw) || (hangiGunRaw != null ? String(hangiGunRaw) : '');
    
    // Arama
    const match = adSoyad.indexOf(searchTerm) > -1 || 
                  mail.indexOf(searchTerm) > -1 || 
                  telefon.indexOf(searchTerm) > -1 ||
                  qrIdString.indexOf(searchTerm) > -1;
    
    if (match) {
      const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 1;
      const qrIds = parseQrIds_(data[i][COL_QR_ID - 1]);
      const okutulanStr = (data[i][COL_OKUTULAN_SAYI - 1] || '0/' + kisiSayisi).toString();
      const parts = okutulanStr.split('/');
      const okutulan = parseInt(parts[0], 10) || 0;
      
      results.push({
        row: row,
        adSoyad: data[i][COL_AD_SOYAD - 1] || '',
        mail: data[i][COL_MAIL - 1] || '',
        telefon: data[i][COL_TELEFON - 1] || '',
        hangiGun: hangiGun,
        kisiSayisi: kisiSayisi,
        odemeOnay: data[i][COL_ODEME_KONTROL - 1] === true,
        qrGonderildi: data[i][COL_QR_GONDERILDI - 1] === true,
        qrIds: qrIds,
        kalanBilet: qrIds.length,
        okutulan: okutulan,
        log: data[i][COL_LOG - 1] || ''
      });
    }
  }
  
  return { success: true, results: results, total: results.length };
}

/**
 * Belirli bir güne ait tüm biletleri getir
 */
function getAllTickets(gun, page, limit) {
  const sheet = getSheet_();
  if (!sheet) return { success: false, error: 'Sheet bulunamadi', results: [], total: 0 };
  
  page = page || 1;
  limit = limit || 50;
  
  const data = sheet.getDataRange().getValues();
  const allResults = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = i + 1;
    const hangiGunRaw = data[i][COL_HANGI_GUN - 1];
    
    // Gun filtresi
    if (gun && gun !== 'all' && !sameGunDay_(hangiGunRaw, gun)) continue;
    const hangiGun = hangiGunCellToNormString_(hangiGunRaw) || (hangiGunRaw != null ? String(hangiGunRaw) : '');
    
    const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 1;
    const qrIds = parseQrIds_(data[i][COL_QR_ID - 1]);
    const okutulanStr = (data[i][COL_OKUTULAN_SAYI - 1] || '0/' + kisiSayisi).toString();
    const parts = okutulanStr.split('/');
    const okutulan = parseInt(parts[0], 10) || 0;
    
    allResults.push({
      row: row,
      adSoyad: data[i][COL_AD_SOYAD - 1] || '',
      mail: data[i][COL_MAIL - 1] || '',
      telefon: data[i][COL_TELEFON - 1] || '',
      hangiGun: hangiGun,
      kisiSayisi: kisiSayisi,
      odemeOnay: data[i][COL_ODEME_KONTROL - 1] === true,
      qrGonderildi: data[i][COL_QR_GONDERILDI - 1] === true,
      qrIds: qrIds,
      kalanBilet: qrIds.length,
      okutulan: okutulan,
      log: data[i][COL_LOG - 1] || ''
    });
  }
  
  // Pagination
  const start = (page - 1) * limit;
  const paginatedResults = allResults.slice(start, start + limit);
  
  return { 
    success: true, 
    results: paginatedResults, 
    total: allResults.length,
    page: page,
    totalPages: Math.ceil(allResults.length / limit)
  };
}

/**
 * Satır numarası ile bilet detayı getir
 */
function getTicketByRow(row) {
  const sheet = getSheet_();
  if (!sheet) return { success: false, error: 'Sheet bulunamadi' };
  
  const data = sheet.getRange(row, 1, 1, COL_LOG).getValues()[0];
  
  const kisiSayisi = parseInt(data[COL_KISI_SAYISI - 1], 10) || 1;
  const qrIds = parseQrIds_(data[COL_QR_ID - 1]);
  const okutulanStr = (data[COL_OKUTULAN_SAYI - 1] || '0/' + kisiSayisi).toString();
  const parts = okutulanStr.split('/');
  const okutulan = parseInt(parts[0], 10) || 0;
  
  // Her bilet için detaylı liste oluştur
  const biletler = [];
  for (let i = 1; i <= kisiSayisi; i++) {
    const qrId = qrIds.find(q => extractBiletNoFromQrId_(q) === i);
    biletler.push({
      biletNo: i,
      qrId: qrId || null,
      kullanildi: !qrId
    });
  }
  
  var hgRaw = data[COL_HANGI_GUN - 1];
  return {
    success: true,
    ticket: {
      row: row,
      adSoyad: data[COL_AD_SOYAD - 1] || '',
      mail: data[COL_MAIL - 1] || '',
      telefon: data[COL_TELEFON - 1] || '',
      hangiGun: hangiGunCellToNormString_(hgRaw) || (hgRaw != null ? String(hgRaw) : ''),
      kisiSayisi: kisiSayisi,
      odemeOnay: data[COL_ODEME_KONTROL - 1] === true,
      qrGonderildi: data[COL_QR_GONDERILDI - 1] === true,
      okutulan: okutulan,
      kalanBilet: qrIds.length,
      biletler: biletler,
      log: data[COL_LOG - 1] || ''
    }
  };
}

/**
 * Manuel giriş işlemi - tek bilet için
 */
function manualCheckIn(row, biletNo) {
  const sheet = getSheet_();
  if (!sheet) return { success: false, error: 'Sheet bulunamadi' };
  
  const data = sheet.getRange(row, 1, 1, COL_LOG).getValues()[0];
  const hangiGun = data[COL_HANGI_GUN - 1];
  const kisiSayisi = parseInt(data[COL_KISI_SAYISI - 1], 10) || 1;
  const adSoyad = data[COL_AD_SOYAD - 1];
  const odemeKontrol = data[COL_ODEME_KONTROL - 1];
  
  if (odemeKontrol !== true) {
    return { success: false, error: 'Ödeme onaylanmamış' };
  }
  
  let qrIds = parseQrIds_(data[COL_QR_ID - 1]);
  
  // Bilet numarasına göre QR bul ve sil
  const qrIndex = qrIds.findIndex(q => extractBiletNoFromQrId_(q) === biletNo);
  
  if (qrIndex === -1) {
    return { success: false, error: 'Bu bilet zaten kullanılmış veya bulunamadı' };
  }
  
  // QR'ı sil
  const silinenQr = qrIds.splice(qrIndex, 1)[0];
  const yeniOkutulan = kisiSayisi - qrIds.length;
  
  // Sheet güncelle
  sheet.getRange(row, COL_QR_ID).setValue(qrIds.join(','));
  sheet.getRange(row, COL_OKUTULAN_SAYI).setValue(yeniOkutulan + '/' + kisiSayisi);
  
  // Log
  const eskiLog = data[COL_LOG - 1] || '';
  const now = new Date().toLocaleString('tr-TR');
  sheet.getRange(row, COL_LOG).setValue(eskiLog + ' | Manuel giriş #' + biletNo + ' ' + now);
  
  // İstatistik güncelle
  incrementGiris_(hangiGun);
  
  return { 
    success: true, 
    message: adSoyad + ' - Bilet #' + biletNo + ' giriş yapıldı',
    okutulan: yeniOkutulan,
    toplam: kisiSayisi
  };
}

/**
 * Toplu manuel giriş - tüm biletler için
 */
function manualCheckInAll(row) {
  const sheet = getSheet_();
  if (!sheet) return { success: false, error: 'Sheet bulunamadi' };
  
  const data = sheet.getRange(row, 1, 1, COL_LOG).getValues()[0];
  const hangiGun = data[COL_HANGI_GUN - 1];
  const kisiSayisi = parseInt(data[COL_KISI_SAYISI - 1], 10) || 1;
  const adSoyad = data[COL_AD_SOYAD - 1];
  const odemeKontrol = data[COL_ODEME_KONTROL - 1];
  
  if (odemeKontrol !== true) {
    return { success: false, error: 'Ödeme onaylanmamış' };
  }
  
  let qrIds = parseQrIds_(data[COL_QR_ID - 1]);
  const girisYapilan = qrIds.length;
  
  if (girisYapilan === 0) {
    return { success: false, error: 'Tüm biletler zaten kullanılmış' };
  }
  
  // Tüm QR'ları temizle
  sheet.getRange(row, COL_QR_ID).setValue('');
  sheet.getRange(row, COL_OKUTULAN_SAYI).setValue(kisiSayisi + '/' + kisiSayisi);
  
  // Log
  const eskiLog = data[COL_LOG - 1] || '';
  const now = new Date().toLocaleString('tr-TR');
  sheet.getRange(row, COL_LOG).setValue(eskiLog + ' | Toplu manuel giriş (' + girisYapilan + ' bilet) ' + now);
  
  // İstatistik güncelle
  for (let i = 0; i < girisYapilan; i++) {
    incrementGiris_(hangiGun);
  }
  
  return { 
    success: true, 
    message: adSoyad + ' - ' + girisYapilan + ' bilet giriş yapıldı',
    okutulan: kisiSayisi,
    toplam: kisiSayisi
  };
}

/**
 * Ödeme onayı güncelle
 */
function updatePaymentStatus(row, status) {
  const sheet = getSheet_();
  if (!sheet) return { success: false, error: 'Sheet bulunamadi' };
  
  sheet.getRange(row, COL_ODEME_KONTROL).setValue(status);
  
  const eskiLog = sheet.getRange(row, COL_LOG).getValue() || '';
  const now = new Date().toLocaleString('tr-TR');
  sheet.getRange(row, COL_LOG).setValue(eskiLog + ' | Ödeme durumu: ' + (status ? 'Onaylandı' : 'İptal') + ' ' + now);
  
  return { success: true, message: 'Ödeme durumu güncellendi' };
}

/**
 * QR yeniden gönder
 */
function resendQrEmail(row) {
  const sheet = getSheet_();
  if (!sheet) return { success: false, error: 'Sheet bulunamadi' };
  
  const data = sheet.getRange(row, 1, 1, COL_LOG).getValues()[0];
  
  const mail = data[COL_MAIL - 1];
  const adSoyad = data[COL_AD_SOYAD - 1];
  const hangiGun = data[COL_HANGI_GUN - 1];
  const kisiSayisi = parseInt(data[COL_KISI_SAYISI - 1], 10) || 1;
  const qrIdString = data[COL_QR_ID - 1];
  const odemeKontrol = data[COL_ODEME_KONTROL - 1];
  
  if (odemeKontrol !== true) {
    return { success: false, error: 'Ödeme onaylanmamış' };
  }
  
  if (!qrIdString) {
    return { success: false, error: 'QR ID bulunamadı' };
  }
  
  const qrIds = parseQrIds_(qrIdString);
  
  if (qrIds.length === 0) {
    return { success: false, error: 'Tüm biletler kullanılmış, gönderilecek QR yok' };
  }
  
  // Hatırlatma maili gönder (kalan biletler için)
  try {
    const ecQr = getEventConfig_();
    const cfg = getGunConfig_(hangiGun);
    const saat = cfg ? (cfg.key === 'gun2' ? ecQr.gun2Saat : ecQr.gun1Saat) : ecQr.gun1Saat;

    const htmlBody = buildReminderHtml_(adSoyad, hangiGun, saat, qrIds, kisiSayisi);
    const subject = String(ecQr.eventName || ETKINLIK_ADI).trim() + ' - Biletleriniz (Yeniden Gönderim)';
    
    GmailApp.sendEmail(mail, subject, '', { htmlBody: htmlBody });
    
    const eskiLog = data[COL_LOG - 1] || '';
    const now = new Date().toLocaleString('tr-TR');
    sheet.getRange(row, COL_LOG).setValue(eskiLog + ' | QR yeniden gönderildi ' + now);
    
    return { success: true, message: mail + ' adresine ' + qrIds.length + ' bilet gönderildi' };
  } catch (err) {
    return { success: false, error: 'Mail gönderilemedi: ' + err.toString() };
  }
}

/**
 * Dashboard istatistikleri
 */
function getDashboardStats() {
  const sheet = getSheet_();
  const statSheet = getStatSheet_();
  
  if (!sheet || !statSheet) return { success: false, error: 'Sheet bulunamadi' };
  
  const data = sheet.getDataRange().getValues();
  
  let toplamKayit = data.length - 1;
  let odemeOnayliGun1 = 0;
  let odemeOnayliGun2 = 0;
  let odemeBekleyenGun1 = 0;
  let odemeBekleyenGun2 = 0;
  
  for (let i = 1; i < data.length; i++) {
    const hangiGun = data[i][COL_HANGI_GUN - 1];
    const kisiSayisi = parseInt(data[i][COL_KISI_SAYISI - 1], 10) || 0;
    const odemeKontrol = data[i][COL_ODEME_KONTROL - 1];
    
    const cfg = getGunConfig_(hangiGun);
    if (!cfg) continue;
    
    if (odemeKontrol === true) {
      if (cfg.key === 'gun1') odemeOnayliGun1 += kisiSayisi;
      else odemeOnayliGun2 += kisiSayisi;
    } else {
      if (cfg.key === 'gun1') odemeBekleyenGun1 += kisiSayisi;
      else odemeBekleyenGun2 += kisiSayisi;
    }
  }
  
  // Stats sheet'ten giriş bilgisi
  const girisGun1 = parseInt(statSheet.getRange(STAT_ROW_GIRIS, STAT_COL_GUN_1).getValue(), 10) || 0;
  const girisGun2 = parseInt(statSheet.getRange(STAT_ROW_GIRIS, STAT_COL_GUN_2).getValue(), 10) || 0;

  const ecDash = getEventConfig_();

  return {
    success: true,
    stats: {
      toplamKayit: toplamKayit,
      gun1: {
        label: ecDash.gun1Label,
        token: ecDash.gun1Token,
        limit: ecDash.gun1Limit,
        odemeOnayli: odemeOnayliGun1,
        odemeBekleyen: odemeBekleyenGun1,
        giris: girisGun1,
        kalan: ecDash.gun1Limit - odemeOnayliGun1,
        doluluk: Math.round((odemeOnayliGun1 / ecDash.gun1Limit) * 100)
      },
      gun2: {
        label: ecDash.gun2Label,
        token: ecDash.gun2Token,
        limit: ecDash.gun2Limit,
        odemeOnayli: odemeOnayliGun2,
        odemeBekleyen: odemeBekleyenGun2,
        giris: girisGun2,
        kalan: ecDash.gun2Limit - odemeOnayliGun2,
        doluluk: Math.round((odemeOnayliGun2 / ecDash.gun2Limit) * 100)
      }
    }
  };
}
function debugTicketRow() {
  const ROW = 5; // ← Test etmek istediğin satır numarası
  
  const sheet = getSheet_();
  const data = sheet.getRange(ROW, 1, 1, COL_LOG).getValues()[0];
  
  const kisiSayisi = parseInt(data[COL_KISI_SAYISI - 1], 10) || 1;
  const qrIdString = data[COL_QR_ID - 1];
  const qrIds = parseQrIds_(qrIdString);
  
  Logger.log('=== DEBUG ROW ' + ROW + ' ===');
  Logger.log('Kişi Sayısı: ' + kisiSayisi);
  Logger.log('QR-ID String: ' + qrIdString);
  Logger.log('QR-ID Array Length: ' + qrIds.length);
  Logger.log('QR-IDs: ' + JSON.stringify(qrIds));
  
  for (let i = 0; i < qrIds.length; i++) {
    const qrId = qrIds[i];
    const biletNo = extractBiletNoFromQrId_(qrId);
    Logger.log('  QR #' + (i+1) + ': biletNo=' + biletNo + ', qrId=' + qrId.substring(0, 30) + '...');
  }
  
  Logger.log('--- Bilet Durumları ---');
  for (let i = 1; i <= kisiSayisi; i++) {
    const foundQr = qrIds.find(q => extractBiletNoFromQrId_(q) === i);
    Logger.log('  Bilet #' + i + ': ' + (foundQr ? 'MEVCUT (kullanılmamış)' : 'YOK (kullanılmış)'));
  }
}

/**********************
 * FORM GÜNCELLEME
 **********************/

/**
 * Tablo1 "Google Form Linki" satirindan URL
 */
function getFormLink_() {
  const st = readEventInfoTableFromStatSheet_();
  if (st.GOOGLE_FORM_LINK && String(st.GOOGLE_FORM_LINK).trim()) {
    return String(st.GOOGLE_FORM_LINK).trim();
  }
  return null;
}

/**
 * Form URL'inden ID'yi çıkarır
 * Desteklenen formatlar:
 * - https://docs.google.com/forms/d/e/FORM_ID/viewform (paylaşım linki)
 * - https://docs.google.com/forms/d/FORM_ID/edit (düzenleme linki)
 */
function extractFormId_(url) {
  if (!url) return null;
  
  // /d/FORM_ID/edit formatı (düzenleme linki) - önce bunu kontrol et
  let match = url.match(/\/forms\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
  if (match && match[1] !== 'e') return match[1];
  
  // /d/e/FORM_ID/viewform formatı (paylaşım linki)
  match = url.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  
  return null;
}

/**
 * Form'daki gün seçeneklerini Sheets'teki config'e göre günceller
 * Menüden "Formu Güncelle" ile çalıştırılır
 */
function updateFormFromConfig() {
  const formLink = getFormLink_();
  
  if (!formLink) {
    SpreadsheetApp.getUi().alert(
      '❌ Hata',
      'Form linki bulunamadı!\n\nForm İstatistikleri — Tablo1 içinde "Google Form Linki" satırına URL yapıştırın.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  const formId = extractFormId_(formLink);
  
  if (!formId) {
    SpreadsheetApp.getUi().alert(
      '❌ Hata',
      'Form ID çıkarılamadı!\n\nLink formatını kontrol edin:\nhttps://docs.google.com/forms/d/.../edit',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  // Config'i al
  const cfg = getEventConfig_();
  
  try {
    // Formu aç
    const form = FormApp.openById(formId);
    
    // Tüm soruları al
    const items = form.getItems();
    
    // "Hangi gün" sorusunu bul
    let found = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.getTitle().toLowerCase();
      
      // "hangi gün", "hangi güne", "gün seç" gibi başlıkları yakala
      if (title.indexOf('hangi gün') > -1 || title.indexOf('gün seç') > -1 || title.indexOf('hangi güne') > -1) {
        
        // Multiple choice olarak cast et
        let mcItem;
        try {
          mcItem = item.asMultipleChoiceItem();
        } catch (e) {
          // Dropdown olabilir
          try {
            mcItem = item.asListItem();
          } catch (e2) {
            continue;
          }
        }
        
        // Yeni seçenekleri oluştur
        const choices = [];
        
        if (cfg.gun1Label) {
          choices.push(mcItem.createChoice(cfg.gun1Label));
        }
        
        if (cfg.gun2Label) {
          choices.push(mcItem.createChoice(cfg.gun2Label));
        }
        
        if (choices.length === 0) {
          SpreadsheetApp.getUi().alert(
            '❌ Hata',
            'Gösteri tarihleri bulunamadı!\n\nK ve M sütunlarını kontrol edin.',
            SpreadsheetApp.getUi().ButtonSet.OK
          );
          return;
        }
        
        mcItem.setChoices(choices);
        found = true;
        
        Logger.log('Form güncellendi! Yeni seçenekler: ' + cfg.gun1Label + ', ' + cfg.gun2Label);
        break;
      }
    }
    
    if (!found) {
      SpreadsheetApp.getUi().alert(
        '❌ Hata',
        '"Hangi gün" sorusu formda bulunamadı!\n\nSoru başlığında "hangi gün" ifadesi olmalı.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    // Opsiyonel: Form başlığını da güncelle
    if (cfg.eventName) {
      form.setTitle(cfg.eventName + ' - Bilet Formu');
    }
    
    // Cache'i temizle
    clearEventConfigCache();
    
    // Başarı mesajı
    SpreadsheetApp.getUi().alert(
      '✅ Başarılı',
      'Form güncellendi!\n\n' +
      '• ' + cfg.gun1Label + '\n' +
      '• ' + cfg.gun2Label + '\n\n' +
      'Form başlığı: ' + cfg.eventName + ' - Bilet Formu',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (err) {
    SpreadsheetApp.getUi().alert(
      '❌ Hata',
      'Form güncellenemedi!\n\n' + err.toString() + '\n\n' +
      'Form ile aynı Google hesabında olduğunuzdan emin olun.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    Logger.log('Form güncelleme hatası: ' + err);
  }
}


/**********************
 * YENİ ETKİNLİK YÖNETİMİ
 * Mevcut AppScript kodunun ALTINA ekle
 **********************/

/**
 * Yeni etkinlik başlatır:
 * 1. Eski verileri arşivler
 * 2. Form Yanıtları'nı temizler
 * 3. İstatistikleri sıfırlar
 * 4. Formu günceller
 */
function startNewEvent() {
  const ui = SpreadsheetApp.getUi();
  const cfg = getEventConfig_();
  
  // Onay al
  const response = ui.alert(
    '🆕 Yeni Etkinlik Başlat',
    'Bu işlem şunları yapacak:\n\n' +
    '1. Mevcut verileri "Arşiv" sayfasına taşıyacak\n' +
    '2. Form Yanıtları sayfasını temizleyecek\n' +
    '3. İstatistikleri sıfırlayacak\n' +
    '4. Formdaki tarihleri güncelleyecek\n\n' +
    'Yeni etkinlik: ' + cfg.eventName + '\n' +
    'Tarihler: ' + cfg.gun1Label + ' / ' + cfg.gun2Label + '\n\n' +
    'Devam etmek istiyor musunuz?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    ui.alert('İptal', 'İşlem iptal edildi.', ui.ButtonSet.OK);
    return;
  }
  
  try {
    // 1. Eski verileri arşivle
    const archiveResult = archiveCurrentData_();
    
    // 2. Form Yanıtları'nı temizle
    clearFormResponses_();
    
    // 3. İstatistikleri sıfırla
    initStats();
    
    // 4. Formu güncelle
    updateFormFromConfigSilent_();
    
    // 5. Cache temizle
    clearEventConfigCache();
    
    ui.alert(
      '✅ Yeni Etkinlik Hazır',
      'İşlemler tamamlandı:\n\n' +
      '• ' + archiveResult.rowCount + ' kayıt arşivlendi\n' +
      '• Arşiv sayfası: "' + archiveResult.sheetName + '"\n' +
      '• Form Yanıtları temizlendi\n' +
      '• İstatistikler sıfırlandı\n' +
      '• Form güncellendi\n\n' +
      'Yeni etkinlik: ' + cfg.eventName,
      ui.ButtonSet.OK
    );
    
  } catch (err) {
    ui.alert(
      '❌ Hata',
      'İşlem sırasında hata oluştu:\n\n' + err.toString(),
      ui.ButtonSet.OK
    );
    Logger.log('startNewEvent hatası: ' + err);
  }
}

/**
 * Mevcut verileri arşiv sayfasına taşır
 */
function archiveCurrentData_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheet_();
  
  if (!sheet) {
    throw new Error('Form Yanıtları sayfası bulunamadı!');
  }
  
  const data = sheet.getDataRange().getValues();
  const rowCount = data.length - 1; // Başlık hariç
  
  if (rowCount <= 0) {
    return { rowCount: 0, sheetName: 'Arşiv yok' };
  }
  
  // Arşiv sayfası adı (tarih + eski etkinlik adı)
  const cfg = getEventConfig_();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const archiveName = 'Arşiv - ' + cfg.eventName + ' (' + today + ')';
  
  // Aynı isimde sayfa varsa numara ekle
  let finalName = archiveName;
  let counter = 1;
  while (ss.getSheetByName(finalName)) {
    finalName = archiveName + ' - ' + counter;
    counter++;
  }
  
  // Yeni arşiv sayfası oluştur
  const archiveSheet = ss.insertSheet(finalName);
  
  // Verileri kopyala
  archiveSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  // Başlık satırını formatla
  archiveSheet.getRange(1, 1, 1, data[0].length)
    .setBackground('#1a4480')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  // Sütun genişliklerini ayarla
  archiveSheet.autoResizeColumns(1, data[0].length);
  
  Logger.log('Arşivlendi: ' + rowCount + ' kayıt → ' + finalName);
  
  return { rowCount: rowCount, sheetName: finalName };
}

/**
 * Form Yanıtları sayfasını temizler (sadece başlıklar kalır)
 */
function clearFormResponses_() {
  const sheet = getSheet_();
  
  if (!sheet) {
    throw new Error('Form Yanıtları sayfası bulunamadı!');
  }
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    // 2. satırdan son satıra kadar sil
    sheet.deleteRows(2, lastRow - 1);
  }
  
  Logger.log('Form Yanıtları temizlendi');
}

/**
 * Formu sessizce günceller (alert göstermez)
 */
function updateFormFromConfigSilent_() {
  const formLink = getFormLink_();
  if (!formLink) {
    Logger.log('Form linki yok, güncelleme atlandı');
    return;
  }
  
  const formId = extractFormId_(formLink);
  if (!formId) {
    Logger.log('Form ID çıkarılamadı, güncelleme atlandı');
    return;
  }
  
  const cfg = getEventConfig_();
  
  try {
    const form = FormApp.openById(formId);
    const items = form.getItems();
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.getTitle().toLowerCase();
      
      if (title.indexOf('hangi gün') > -1 || title.indexOf('gün seç') > -1 || title.indexOf('hangi güne') > -1) {
        let mcItem;
        try {
          mcItem = item.asMultipleChoiceItem();
        } catch (e) {
          try {
            mcItem = item.asListItem();
          } catch (e2) {
            continue;
          }
        }
        
        const choices = [];
        if (cfg.gun1Label) choices.push(mcItem.createChoice(cfg.gun1Label));
        if (cfg.gun2Label) choices.push(mcItem.createChoice(cfg.gun2Label));
        
        if (choices.length > 0) {
          mcItem.setChoices(choices);
        }
        break;
      }
    }
    
    // Form başlığını güncelle
    if (cfg.eventName) {
      form.setTitle(cfg.eventName + ' - Bilet Formu');
    }
    
    Logger.log('Form sessizce güncellendi');
    
  } catch (err) {
    Logger.log('Form güncelleme hatası (sessiz): ' + err);
  }
}


/**********************
 * KONTENJAN YÖNETİMİ - TARİH SİLME
 **********************/

/**
 * Kontenjanı dolan tarihi formdan kaldırır
 */
function removeFullDateFromForm() {
  const ui = SpreadsheetApp.getUi();
  const cfg = getEventConfig_();
  
  // Her iki günün istatistiklerini al
  const stats1 = getStats(cfg.gun1Token);
  const stats2 = getStats(cfg.gun2Token);
  
  // Durumları göster
  let statusText = 'Mevcut Durum:\n\n';
  statusText += '• ' + cfg.gun1Label + ': ' + stats1.total + '/' + cfg.gun1Limit;
  statusText += (stats1.remaining <= 0) ? ' ⛔ DOLU\n' : ' ✅ Açık (' + stats1.remaining + ' kalan)\n';
  statusText += '• ' + cfg.gun2Label + ': ' + stats2.total + '/' + cfg.gun2Limit;
  statusText += (stats2.remaining <= 0) ? ' ⛔ DOLU\n' : ' ✅ Açık (' + stats2.remaining + ' kalan)\n';
  
  // Hangi tarihi silmek istediğini sor
  const response = ui.prompt(
    '📅 Tarihi Formdan Kaldır',
    statusText + '\n' +
    'Hangi tarihi formdan kaldırmak istiyorsunuz?\n\n' +
    '1 = ' + cfg.gun1Label + '\n' +
    '2 = ' + cfg.gun2Label + '\n' +
    '0 = Her ikisini de koru (iptal)\n\n' +
    'Seçiminiz (1, 2 veya 0):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const choice = response.getResponseText().trim();
  
  if (choice === '0') {
    ui.alert('İptal', 'İşlem iptal edildi.', ui.ButtonSet.OK);
    return;
  }
  
  let dateToRemove = null;
  let dateToKeep = null;
  
  if (choice === '1') {
    dateToRemove = cfg.gun1Label;
    dateToKeep = cfg.gun2Label;
  } else if (choice === '2') {
    dateToRemove = cfg.gun2Label;
    dateToKeep = cfg.gun1Label;
  } else {
    ui.alert('❌ Hata', 'Geçersiz seçim. 1 veya 2 girin.', ui.ButtonSet.OK);
    return;
  }
  
  // Onay al
  const confirm = ui.alert(
    '⚠️ Onay',
    '"' + dateToRemove + '" tarihi formdan kaldırılacak.\n\n' +
    'Sadece "' + dateToKeep + '" seçeneği kalacak.\n\n' +
    'Devam edilsin mi?',
    ui.ButtonSet.YES_NO
  );
  
  if (confirm !== ui.Button.YES) {
    return;
  }
  
  try {
    updateFormWithSingleDate_(dateToKeep);
    
    ui.alert(
      '✅ Başarılı',
      '"' + dateToRemove + '" formdan kaldırıldı.\n\n' +
      'Artık sadece "' + dateToKeep + '" seçilebilir.',
      ui.ButtonSet.OK
    );
    
  } catch (err) {
    ui.alert('❌ Hata', 'Form güncellenemedi:\n\n' + err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Formda sadece tek tarih bırakır
 */
function updateFormWithSingleDate_(dateLabel) {
  const formLink = getFormLink_();
  if (!formLink) throw new Error('Form linki bulunamadı!');
  
  const formId = extractFormId_(formLink);
  if (!formId) throw new Error('Form ID çıkarılamadı!');
  
  const form = FormApp.openById(formId);
  const items = form.getItems();
  
  let found = false;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.getTitle().toLowerCase();
    
    if (title.indexOf('hangi gün') > -1 || title.indexOf('gün seç') > -1 || title.indexOf('hangi güne') > -1) {
      let mcItem;
      try {
        mcItem = item.asMultipleChoiceItem();
      } catch (e) {
        try {
          mcItem = item.asListItem();
        } catch (e2) {
          continue;
        }
      }
      
      // Sadece tek seçenek bırak
      mcItem.setChoices([mcItem.createChoice(dateLabel)]);
      found = true;
      
      Logger.log('Form güncellendi: Sadece ' + dateLabel + ' kaldı');
      break;
    }
  }
  
  if (!found) {
    throw new Error('"Hangi gün" sorusu formda bulunamadı!');
  }
}

/**
 * Her iki tarihi de forma geri ekler
 */
function restoreAllDatesToForm() {
  const ui = SpreadsheetApp.getUi();
  
  const confirm = ui.alert(
    '📅 Tarihleri Geri Yükle',
    'Her iki tarih de forma geri eklenecek.\n\nDevam edilsin mi?',
    ui.ButtonSet.YES_NO
  );
  
  if (confirm !== ui.Button.YES) {
    return;
  }
  
  try {
    updateFormFromConfigSilent_();
    clearEventConfigCache();
    
    const cfg = getEventConfig_();
    ui.alert(
      '✅ Başarılı',
      'Tarihler geri yüklendi:\n\n• ' + cfg.gun1Label + '\n• ' + cfg.gun2Label,
      ui.ButtonSet.OK
    );
    
  } catch (err) {
    ui.alert('❌ Hata', err.toString(), ui.ButtonSet.OK);
  }
}


/**********************
 * OTOMATİK KONTENJAN KONTROLÜ
 * checkKontenjan_ fonksiyonunu GÜNCELLE (mevcut olanı değiştir)
 **********************/

/**
 * Kontenjan kontrolü - doluysa admin'e mail + opsiyonel form güncelleme
 * NOT: Mevcut checkKontenjan_ fonksiyonunu bununla DEĞİŞTİR
 */
function checkKontenjan_(gun) {
  const cfg = getGunConfig_(gun);
  if (!cfg) return true;

  const mevcutSayi = getBiletSayisi_(gun);

  if (mevcutSayi >= cfg.limit) {
    const ecfg = getEventConfig_();
    const gunLabel = cfg.label;
    
    const subject = '⛔ Kontenjan Doldu - ' + gunLabel;
    const body =
      'Merhaba,\n\n' +
      gunLabel + ' için kontenjan dolmuştur.\n\n' +
      'Mevcut bilet sayısı: ' + mevcutSayi + '\n' +
      'Limit: ' + cfg.limit + '\n\n' +
      '📋 Yapmanız gerekenler:\n' +
      '1. Spreadsheet\'i açın\n' +
      '2. Menü → 🎭 Tiyatro Sistemi → 📅 Dolu Tarihi Kaldır\n' +
      '3. ' + gunLabel + ' seçeneğini formdan kaldırın\n\n' +
      'Veya formu manuel olarak kapatabilirsiniz.\n\n' +
      'Otomatik bildirim sistemi.';

    try {
      GmailApp.sendEmail(getAdminEmail_(), subject, body);
      Logger.log('Kontenjan doldu maili gönderildi: ' + gunLabel);
    } catch (err) {
      Logger.log('Kontenjan mail hatası: ' + err);
    }
    return false;
  }

  return true;
}


/**********************
 * GÜNCELLENMİŞ MENÜ
 * Mevcut onOpen fonksiyonunu bununla DEĞİŞTİR
 **********************/

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎭 Tiyatro Sistemi')
    .addItem('🆕 Yeni Etkinlik Başlat', 'startNewEvent')
    .addSeparator()
    .addItem('📝 Formu Güncelle', 'updateFormFromConfig')
    .addItem('📊 İstatistikleri Yenile', 'countBiletler')
    .addSeparator()
    .addSubMenu(ui.createMenu('📅 Tarih Yönetimi')
      .addItem('Dolu Tarihi Kaldır', 'removeFullDateFromForm')
      .addItem('Tüm Tarihleri Geri Yükle', 'restoreAllDatesToForm'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Hatırlatma Maili')
      .addItem('Test Maili Gönder', 'sendReminderTest')
      .addItem('1. Gün Hatırlatma', 'sendReminderGun1')
      .addItem('2. Gün Hatırlatma', 'sendReminderGun2'))
    .addToUi();
}