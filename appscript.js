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
  return ss.getSheetByName(SHEET_NAME);
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

function cellOrDefault_(m, key, def) {
  if (m[key] === null || m[key] === undefined || m[key] === '') return def;
  return m[key];
}

/**
 * Sheet + ScriptCache (~5 dk). Ayar degisince clearEventConfigCache() calistir veya bekleyin.
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
  const m = readEventConfigMap_();
  // Tek kaynak: üstteki ETKINLIK_* / ETKINLIK_ADI sabitleri (sheet bos ise bunlar kullanilir)
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
    gun2Tab: String(cellOrDefault_(m, 'GUN_2_TAB', ''))
  };
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

function getGunConfig_(gun) {
  const cfg = getEventConfig_();
  const gunStr = normalizeText_(gun);

  if (gunStr.indexOf(normalizeText_(cfg.gun1Token)) > -1 || gunStr.indexOf(normalizeText_(cfg.gun1Label)) > -1) {
    return {
      key: 'gun1',
      token: cfg.gun1Token,
      label: cfg.gun1Label,
      saat: cfg.gun1Saat,
      limit: cfg.gun1Limit,
      statCol: STAT_COL_GUN_1
    };
  }

  if (gunStr.indexOf(normalizeText_(cfg.gun2Token)) > -1 || gunStr.indexOf(normalizeText_(cfg.gun2Label)) > -1) {
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

    if (rowGun && rowGun.toString().indexOf(gun.toString()) > -1) {
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
    const subject = 'Kontenjan Doldu - ' + gun;
    const body =
      'Merhaba,\n\n' +
      gun + ' icin kontenjan dolmustur.\n\n' +
      'Mevcut bilet sayisi: ' + mevcutSayi + '\n' +
      'Limit: ' + cfg.limit + '\n\n' +
      'Lutfen formdaki bu tarihi kapatiniz.\n\n' +
      'Otomatik bildirim sistemi.';

    try {
      GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
    } catch (err) {
      Logger.log('Kontenjan mail hatasi: ' + err);
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

  const subject = ETKINLIK_ADI + ' Tiyatro Biletleriniz - ' + adSoyad;
  const htmlBody =
    '<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#faf8f0;">' +
      '<div style="background: linear-gradient(135deg, #1a4480, #0a3d62); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">' +
        '<h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:400; letter-spacing:2px;">' + ETKINLIK_ADI.toUpperCase() + '</h1>' +
        '<p style="margin:10px 0 0 0; color:#ffffff; font-size:14px;">Biletleriniz Hazir</p>' +
      '</div>' +
      '<div style="background:#fff; padding:30px; border:1px solid #ddd; border-top:none;">' +
        '<p style="font-size:18px; color:#1a4480;">Merhaba <strong>' + adSoyad + '</strong>,</p>' +
        '<p style="color:#333; line-height:1.8;">Odemeniz kontrol edilip onaylandi. <strong>' + hangiGun + '</strong> tarihli tiyatro biletleriniz asagidadir.</p>' +
        '<div style="background:#fff3cd; border-left:4px solid #c41e3a; padding:15px; margin:20px 0;">' +
          '<p style="margin:0; color:#856404; font-size:14px;"><strong>Onemli:</strong> Her QR kod tek kullanimliktir. Giriste her kisi icin ayri QR kod gosterilmelidir.</p>' +
        '</div>' +
        '<div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid #1a4480;">' +
          '<p style="margin:0; color:#1a4480;"><strong>Tarih:</strong> ' + hangiGun + '<br><strong>Toplam Bilet:</strong> ' + kisiSayisi + ' adet</p>' +
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

  // Tarih kontrolü (scanner tarafi "6" / "9" gonderiyor)
  if (selectedDate && selectedDate !== 'all') {
    if (!hangiGun || hangiGun.toString().indexOf(selectedDate) === -1) {
      return {
        status: 'wrong_date',
        title: 'Yanlis Tarih',
        message: 'Bu bilet ' + hangiGun + ' icin gecerlidir.',
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
    '<div style="font-size:12px; letter-spacing:4px; color:rgba(250,248,240,0.8); margin-bottom:8px;">ANKARA</div>' +
    '<h1 style="margin:0; color:#faf8f0; font-size:32px; font-weight:400; letter-spacing:3px;">' + ETKINLIK_ADI.toUpperCase() + '</h1>' +
    '<p style="margin:12px 0 0 0; color:rgba(250,248,240,0.9); font-size:16px;">Etkinlik Hatirlatmasi</p>' +
    '</div>' +

    '<div style="background:#faf8f0; padding:30px; border-left:1px solid #ddd; border-right:1px solid #ddd;">' +

    '<p style="font-size:18px; color:#1a4480; margin-bottom:25px;">Merhaba <strong>' + adSoyad + '</strong>,</p>' +

    '<p style="color:#333; line-height:1.8; margin-bottom:25px;">' +
    ETKINLIK_ADI + ' etkinligimize katilacaginiz icin cok heyecanliyiz! ' +
    'Biletlerinizi ve etkinlik detaylarini asagida bulabilirsiniz.' +
    '</p>' +

    '<div style="background: linear-gradient(135deg, #1a4480, #0a3d62); padding:25px; border-radius:16px; margin-bottom:25px; color:#faf8f0;">' +
    '<h2 style="margin:0 0 20px 0; font-size:20px; font-weight:400; text-align:center; letter-spacing:2px;">ETKINLIK DETAYLARI</h2>' +

    '<table style="width:100%; border-collapse:collapse;">' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7); width:80px;">Tarih:</td><td style="padding:8px 0; font-weight:600;">' + hangiGun + '</td></tr>' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7);">Saat:</td><td style="padding:8px 0; font-weight:600;">' + saat + '</td></tr>' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7);">Yer:</td><td style="padding:8px 0; font-weight:600;">' + ETKINLIK_YER + '</td></tr>' +
    '<tr><td style="padding:8px 0; color:rgba(250,248,240,0.7);">Adres:</td><td style="padding:8px 0; font-weight:600;">' + ETKINLIK_ADRES + '</td></tr>' +
    '</table>' +
    '</div>' +

    '<div style="background:#fff3cd; border-left:5px solid #c41e3a; padding:20px; margin-bottom:25px; border-radius:0 12px 12px 0;">' +
    '<p style="margin:0 0 10px 0; color:#856404; font-weight:600;">Onemli Hatirlatmalar:</p>' +
    '<ul style="margin:0; padding-left:20px; color:#856404; line-height:1.8;">' +
    '<li>Lutfen <strong>' + ETKINLIK_KAPIDA_SAAT + '</strong>\'de kapida olunuz.</li>' +
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
    '<p style="margin:0 0 5px 0; color:#faf8f0; font-size:14px;">' + ETKINLIK_ADI + ' Tiyatro Ekibi</p>' +
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
  const testAdSoyad = 'Test Kullanici';
  const testGun = ETKINLIK_GUN_1_LABEL;
  const testSaat = ETKINLIK_GUN_1_SAAT;
  const testQrIds = ['TEST-QR-ID-1-BILET', 'TEST-QR-ID-2-BILET', 'TEST-QR-ID-3-BILET'];
  const testKisiSayisi = 3;

  const htmlBody = buildReminderHtml_(testAdSoyad, testGun, testSaat, testQrIds, testKisiSayisi);
  const subject = '[TEST] ' + ETKINLIK_ADI + ' - Etkinlik Hatirlatmasi';

  try {
    GmailApp.sendEmail(TEST_EMAIL, subject, '', { htmlBody: htmlBody });
    Logger.log('Test maili gonderildi: ' + TEST_EMAIL);
  } catch (err) {
    Logger.log('HATA: ' + err);
  }
}

/**
 * 1. gun icin tum onayli biletlere hatirlatma maili gonder
 */
function sendReminderGun1() {
  const c = getEventConfig_();
  sendReminderByDate_(c.gun1Token, ETKINLIK_GUN_1_SAAT);
}

/**
 * 2. gun icin tum onayli biletlere hatirlatma maili gonder
 */
function sendReminderGun2() {
  const c = getEventConfig_();
  sendReminderByDate_(c.gun2Token, ETKINLIK_GUN_2_SAAT);
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

      if (!hangiGun || hangiGun.toString().indexOf(gun.toString()) === -1) {
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
      const subject = ETKINLIK_ADI + ' - Etkinlik Hatirlatmasi (' + hangiGun + ')';

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
    const summarySubject = ETKINLIK_ADI + ' Hatirlatma Ozeti - ' + gun;
    const summaryBody =
      'Hatirlatma gonderimi tamamlandi.\n\n' +
      'Tarih: ' + gun + '\n' +
      'Gonderilen: ' + gonderilen + '\n' +
      'Atlanan: ' + atlanan + '\n' +
      'Hata: ' + hata + '\n' +
      'Saat: ' + new Date().toLocaleString('tr-TR');

    GmailApp.sendEmail(ADMIN_EMAIL, summarySubject, summaryBody);
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
    return HtmlService.createHtmlOutput(buildScannerHtml())
      .setTitle(ETKINLIK_ADI + ' Tiyatro')
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

        const ecApi = getEventConfig_();
        const col = (gun === ecApi.gun1Token) ? STAT_COL_GUN_1 : STAT_COL_GUN_2;

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
    const hangiGun = (data[i][COL_HANGI_GUN - 1] || '').toString();
    const qrIdString = (data[i][COL_QR_ID - 1] || '').toString().toLowerCase();
    
    // Gun filtresi
    if (gun && gun !== 'all' && hangiGun.indexOf(gun) === -1) continue;
    
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
    const hangiGun = (data[i][COL_HANGI_GUN - 1] || '').toString();
    
    // Gun filtresi
    if (gun && gun !== 'all' && hangiGun.indexOf(gun) === -1) continue;
    
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
  
  return {
    success: true,
    ticket: {
      row: row,
      adSoyad: data[COL_AD_SOYAD - 1] || '',
      mail: data[COL_MAIL - 1] || '',
      telefon: data[COL_TELEFON - 1] || '',
      hangiGun: data[COL_HANGI_GUN - 1] || '',
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
    const cfg = getGunConfig_(hangiGun);
    const saat = !cfg ? ETKINLIK_GUN_1_SAAT : (cfg.key === 'gun2' ? ETKINLIK_GUN_2_SAAT : ETKINLIK_GUN_1_SAAT);
    
    const htmlBody = buildReminderHtml_(adSoyad, hangiGun, saat, qrIds, kisiSayisi);
    const subject = ETKINLIK_ADI + ' - Biletleriniz (Yeniden Gönderim)';
    
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