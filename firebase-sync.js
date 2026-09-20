// ===================================================
// เชื่อมต่อ Firebase Realtime Database
// เพื่อให้ทุกคนที่เข้าเว็บเห็นข้อมูลชุดเดียวกัน (แทนการเก็บใน localStorage ของแต่ละเครื่อง)
// ===================================================
//
// ★ เวอร์ชันแก้ปัญหาโควตา Firebase เต็ม (Downloads เกิน 10GB/เดือน) ★
// สาเหตุเดิม: ทุกครั้งที่เปิดหน้าใดหน้าหนึ่ง โค้ดจะโหลด /data.json "ทั้งก้อน" (รวมรูป base64 ของทุกสัปดาห์)
// ทำให้เปิดเว็บ 1 ครั้ง = ดาวน์โหลดเกือบ 94MB
//
// วิธีใหม่:
//  1) หน้าทั่วไปโหลดเฉพาะ site / members / timeLogOverrides (ก้อนเล็ก)
//  2) รายละเอียดงานรายสัปดาห์ (weekDetails ซึ่งมีรูปเยอะ) โหลด "เฉพาะสัปดาห์ที่กดดู" ผ่าน loadWeekDetails()
//  3) รูปที่อัปโหลดจะถูกย่อ+บีบอัดก่อนเสมอ (compressImage) เหลือหลักสิบ-ร้อย KB แทนหลาย MB
//  4) ตรวจ res.ok ทุกครั้ง ถ้า Firebase ตอบ error (เช่น โควตาเต็ม) จะไม่เอา error ไปเก็บเป็นแคชอีก

// ★ ลิงก์ฐานข้อมูลของทีมคุณ (ได้จากหน้า Firebase Console)
const FIREBASE_URL = "https://intern-log-b047d-default-rtdb.firebaseio.com";

// เปลี่ยนชื่อ key เป็น v2 เพื่อทิ้งแคชเก่า (v1) ที่อาจมีข้อมูลผิดค้างอยู่
const CACHE_KEY = 'ltc_intern_data_cache_v2';
try { localStorage.removeItem('ltc_intern_data_cache_v1'); } catch (e) {}

// ถ้าข้อมูลที่จะแคชใหญ่เกินนี้ จะข้ามการแคช (การเขียนข้อความยาวลง localStorage ทำให้หน้าเว็บหน่วง)
const MAX_CACHE_SIZE = 1500000; // ~1.5MB

// เอาข้อมูล (จาก cloud หรือจากแคช) ไปทับค่าตัวแปรกลางที่หน้าเว็บใช้แสดงผล
// หมายเหตุ: weekDetails ไม่อยู่ในนี้แล้ว เพราะโหลดแยกทีละสัปดาห์ด้วย loadWeekDetails()
function applyCloudData(cloud) {
  if (!cloud) return;

  if (cloud.site) Object.assign(SITE, cloud.site);

  if (cloud.members) {
    MEMBERS.length = 0;
    // Firebase อาจคืนค่ามาเป็น object แทน array ถ้ามีช่องว่าง จึงใช้ Object.values กันไว้
    const list = Array.isArray(cloud.members) ? cloud.members : Object.values(cloud.members);
    list.filter(Boolean).forEach(m => MEMBERS.push(m));
  }

  if (cloud.timeLogOverrides) {
    Object.keys(TIME_LOG_OVERRIDES).forEach(k => delete TIME_LOG_OVERRIDES[k]);
    Object.keys(cloud.timeLogOverrides).forEach(k => TIME_LOG_OVERRIDES[k] = cloud.timeLogOverrides[k]);
  }
}

// อ่านแคชจากเครื่อง (ทำงานทันที ไม่มีการรอเครือข่าย) คืนค่า true ถ้ามีแคชและใช้ได้
function loadLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    applyCloudData(JSON.parse(raw));
    return true;
  } catch (e) {
    console.warn('อ่านแคชในเครื่องไม่สำเร็จ', e);
    return false;
  }
}

function saveLocalCache(cloud) {
  try {
    const json = JSON.stringify(cloud);
    if (json.length > MAX_CACHE_SIZE) {
      console.warn(
        `ข้อมูลใหญ่เกินไป (${(json.length / 1024).toFixed(0)} KB) จึงข้ามการแคชไว้ในเครื่อง — ` +
        `มักมาจากรูปที่ยังไม่ถูกบีบอัด ลองกดปุ่ม "บีบอัดรูปที่มีอยู่" ในหน้าจัดการข้อมูล`
      );
      localStorage.removeItem(CACHE_KEY);
      return;
    }
    localStorage.setItem(CACHE_KEY, json);
  } catch (e) {
    console.warn('บันทึกแคชไม่สำเร็จ (พื้นที่ localStorage อาจเต็ม)', e);
  }
}

// ดึงข้อมูลเฉพาะ path หนึ่ง เช่น "site", "members", "weekDetails/3"
// โยน error ถ้า Firebase ตอบไม่ใช่ 2xx (เช่น 402 โควตาเต็ม, 401 ไม่มีสิทธิ์) เพื่อไม่ให้เอา error ไปใช้เป็นข้อมูล
async function fetchNode(path) {
  const res = await fetch(`${FIREBASE_URL}/data/${path}.json`);
  if (!res.ok) throw new Error(`Firebase ตอบกลับ ${res.status} (${path})`);
  return await res.json();
}

// โหลดเฉพาะก้อนเล็ก ๆ (ไม่รวม weekDetails)
async function fetchCloudData() {
  const [site, members, timeLogOverrides] = await Promise.all([
    fetchNode('site'),
    fetchNode('members'),
    fetchNode('timeLogOverrides')
  ]);
  return { site, members, timeLogOverrides };
}

// โหลดข้อมูลจากคลาวด์มาทับค่าเริ่มต้นใน data.js
// ถ้ามีแคชอยู่แล้วจะ resolve ทันที ส่วนการเช็คของใหม่ทำเบื้องหลังเพื่ออัปเดตแคช
async function loadCloudData() {
  const hasCache = loadLocalCache();

  const networkUpdate = fetchCloudData()
    .then(cloud => {
      applyCloudData(cloud);
      saveLocalCache(cloud);
    })
    .catch(e => {
      console.warn('โหลดข้อมูลจากคลาวด์ไม่สำเร็จ (อาจไม่มีอินเทอร์เน็ต หรือโควตา Firebase เต็ม) ใช้ข้อมูลที่มีอยู่แทน', e);
    });

  // ถ้ายังไม่เคยมีแคชเลย (เปิดเว็บเครื่องนี้ครั้งแรก) จำเป็นต้องรอโหลดจาก Firebase ก่อน
  if (!hasCache) {
    await networkUpdate;
  }
}

// ===================================================
// โหลดรายละเอียดงานของ "สัปดาห์เดียว" (มีรูปภาพ) ตอนที่ผู้ใช้กดดูสัปดาห์นั้นเท่านั้น
// เก็บผลไว้ใน WEEK_DETAILS[weekNo] และจำไว้ว่าโหลดแล้ว จะไม่โหลดซ้ำในหน้าเดิม
// โยน error ถ้าโหลดไม่สำเร็จ (ให้ผู้เรียกจัดการเอง)
// ===================================================
const _weekLoaded = {};
async function loadWeekDetails(weekNo, force) {
  if (_weekLoaded[weekNo] && !force) return WEEK_DETAILS[weekNo];
  const data = await fetchNode('weekDetails/' + weekNo);
  if (data) {
    // Firebase อาจคืน object แทน array ถ้ามีช่องว่าง จึงแปลงเป็น array ให้แน่นอน
    WEEK_DETAILS[weekNo] = (Array.isArray(data) ? data : Object.values(data)).filter(Boolean);
  }
  _weekLoaded[weekNo] = true;
  return WEEK_DETAILS[weekNo];
}

// เก็บสถานะปัจจุบันลงแคช (ไม่รวม weekDetails เพราะมีรูปเยอะ)
function syncCacheWithCurrentState() {
  saveLocalCache({
    site: SITE,
    members: MEMBERS,
    timeLogOverrides: TIME_LOG_OVERRIDES
  });
}

// บันทึกข้อมูลส่วนใดส่วนหนึ่งขึ้นคลาวด์ ให้ทุกคนที่เข้าเว็บเห็นทันที
// path เช่น "site", "members", "timeLogOverrides", "weekDetails/3" (บันทึกทีละสัปดาห์)
async function saveCloudData(path, value) {
  try {
    const res = await fetch(`${FIREBASE_URL}/data/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
    if (!res.ok) throw new Error('เซิร์ฟเวอร์ตอบกลับผิดพลาด (' + res.status + ')');
    syncCacheWithCurrentState();
    return true;
  } catch (e) {
    alert('บันทึกขึ้นคลาวด์ไม่สำเร็จ: ' + e.message + '\nกรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง');
    return false;
  }
}

// ล้างข้อมูลทั้งหมดในคลาวด์ กลับไปใช้ค่าเริ่มต้นจากไฟล์ data.js
async function clearCloudData() {
  try {
    const res = await fetch(`${FIREBASE_URL}/data.json`, { method: 'DELETE' });
    if (!res.ok) throw new Error('เซิร์ฟเวอร์ตอบกลับผิดพลาด (' + res.status + ')');
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    return true;
  } catch (e) {
    alert('ล้างข้อมูลไม่สำเร็จ: ' + e.message);
    return false;
  }
}

// ===================================================
// ตัวช่วยบีบอัดรูป: ย่อด้านยาวสุดให้ไม่เกิน maxSide พิกเซล แล้วแปลงเป็น JPEG คุณภาพ quality
// (รูปจากมือถือ 3-5MB จะเหลือประมาณ 80-200KB)
// ===================================================
function _drawToJpegDataUrl(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // กัน PNG โปร่งใสกลายเป็นพื้นดำ
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

// บีบอัดไฟล์รูปที่ผู้ใช้เลือก -> คืนค่าเป็น data URL (Promise)
function compressImage(file, maxSide = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try { resolve(_drawToJpegDataUrl(img, maxSide, quality)); }
      catch (e) { reject(e); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์รูปไม่สำเร็จ')); };
    img.src = url;
  });
}

// บีบอัดรูปที่เป็น data URL อยู่แล้ว (ใช้กับรูปเก่าที่อยู่ในฐานข้อมูล) ถ้าเล็กลงจริงถึงจะคืนตัวใหม่
function shrinkDataUrl(dataUrl, maxSide = 1280, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const out = _drawToJpegDataUrl(img, maxSide, quality);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch (e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ★ Promise กลาง — ทุกหน้าเว็บต้อง "รอ" ตัวนี้เสร็จก่อนค่อยแสดงข้อมูล
// วิธีใช้ในแต่ละหน้า: window.dataReady.then(() => { โค้ดแสดงผลของหน้านั้น });
window.dataReady = loadCloudData();