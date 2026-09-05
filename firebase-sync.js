// ===================================================
// เชื่อมต่อ Firebase Realtime Database
// เพื่อให้ทุกคนที่เข้าเว็บเห็นข้อมูลชุดเดียวกัน (แทนการเก็บใน localStorage ของแต่ละเครื่อง)
// ===================================================

// ★ ลิงก์ฐานข้อมูลของทีมคุณ (ได้จากหน้า Firebase Console)
const FIREBASE_URL = "https://intern-log-b047d-default-rtdb.firebaseio.com";

// ===================================================
// ระบบแคชข้อมูลไว้ในเครื่อง (localStorage) แบบ "cache-first"
// เหตุผล: ปกติทุกครั้งที่เปิดเว็บต้องรอ fetch จาก Firebase ก่อนถึงจะแสดงผลได้
// ซึ่งช้า โดยเฉพาะถ้าเน็ตไม่แรงหรือ Firebase อยู่ไกล
// วิธีใหม่: ถ้าเคยเปิดเว็บนี้มาก่อน (มีแคชอยู่ในเครื่องแล้ว) จะโชว์ข้อมูลแคชนั้น "ทันที"
// โดยไม่ต้องรอเครือข่ายเลย แล้วค่อยไปดึงของใหม่จาก Firebase มาเก็บแคชไว้ใช้รอบถัดไปเงียบ ๆ
// (ถ้าข้อมูลมีการเปลี่ยนแปลง จะเห็นผลตอนรีเฟรชหน้าอีกครั้ง เหมือนพฤติกรรมเดิมของเว็บ)
// ===================================================
const CACHE_KEY = 'ltc_intern_data_cache_v1';

// เอาข้อมูล (จาก cloud หรือจากแคช) ไปทับค่าตัวแปรกลางที่หน้าเว็บใช้แสดงผล
function applyCloudData(cloud) {
  if (!cloud) return;

  if (cloud.site) Object.assign(SITE, cloud.site);

  if (cloud.members) {
    MEMBERS.length = 0;
    cloud.members.forEach(m => MEMBERS.push(m));
  }

  if (cloud.weekDetails) {
    Object.keys(WEEK_DETAILS).forEach(k => delete WEEK_DETAILS[k]);
    Object.keys(cloud.weekDetails).forEach(k => WEEK_DETAILS[k] = cloud.weekDetails[k]);
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

// เก็บข้อมูลล่าสุดจาก Firebase ไว้เป็นแคช ให้ครั้งต่อไปโหลดเร็วขึ้น
function saveLocalCache(cloud) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cloud));
  } catch (e) {
    console.warn('บันทึกแคชไม่สำเร็จ (พื้นที่ localStorage อาจเต็ม)', e);
  }
}

async function fetchCloudData() {
  const res = await fetch(`${FIREBASE_URL}/data.json`);
  return await res.json();
}

// โหลดข้อมูลจากคลาวด์มาทับค่าเริ่มต้นใน data.js
// คืนค่าเป็น Promise ให้หน้าเว็บอื่น ๆ "รอ" ให้โหลดเสร็จก่อนค่อยแสดงผล
// ถ้ามีแคชอยู่แล้ว (เคยเปิดเว็บนี้มาก่อน) จะ resolve ทันทีโดยไม่ต้องรอเครือข่าย
// ส่วนการไปเช็คของใหม่จาก Firebase จะทำงานเบื้องหลังต่อไปเพื่ออัปเดตแคชไว้ใช้รอบถัดไป
async function loadCloudData() {
  const hasCache = loadLocalCache();

  const networkUpdate = fetchCloudData()
    .then(cloud => {
      if (cloud) {
        applyCloudData(cloud);
        saveLocalCache(cloud);
      }
    })
    .catch(e => {
      console.warn('โหลดข้อมูลจากคลาวด์ไม่สำเร็จ (อาจไม่มีอินเทอร์เน็ต) ใช้ข้อมูลที่มีอยู่แทน', e);
    });

  // ถ้ายังไม่เคยมีแคชเลย (เปิดเว็บเครื่องนี้ครั้งแรก) จำเป็นต้องรอโหลดจาก Firebase ก่อน
  if (!hasCache) {
    await networkUpdate;
  }
}

// เก็บสถานะปัจจุบันของตัวแปรกลางทั้งหมดลงแคช (ใช้หลังบันทึก/ล้างข้อมูล เพื่อไม่ให้แคชค้างข้อมูลเก่า)
function syncCacheWithCurrentState() {
  saveLocalCache({
    site: SITE,
    members: MEMBERS,
    weekDetails: WEEK_DETAILS,
    timeLogOverrides: TIME_LOG_OVERRIDES
  });
}

// บันทึกข้อมูลส่วนใดส่วนหนึ่งขึ้นคลาวด์ ให้ทุกคนที่เข้าเว็บเห็นทันที
// path เช่น "site", "members", "weekDetails", "timeLogOverrides"
async function saveCloudData(path, value) {
  try {
    const res = await fetch(`${FIREBASE_URL}/data/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
    if (!res.ok) throw new Error('เซิร์ฟเวอร์ตอบกลับผิดพลาด (' + res.status + ')');
    // ตัวแปรกลาง (SITE/MEMBERS/...) ถูกอัปเดตไว้แล้วโดยหน้า admin ก่อนเรียกฟังก์ชันนี้
    // จึงอัปเดตแคชในเครื่องตามไปด้วย เพื่อให้ครั้งต่อไปที่เปิดเว็บเห็นข้อมูลล่าสุดทันที
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
    // ล้างแคชในเครื่องด้วย ไม่งั้นเปิดเว็บครั้งถัดไปจะยังเห็นข้อมูลเก่าที่ถูกลบไปแล้ว
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    return true;
  } catch (e) {
    alert('ล้างข้อมูลไม่สำเร็จ: ' + e.message);
    return false;
  }
}

// ★ Promise กลาง — ทุกหน้าเว็บต้อง "รอ" ตัวนี้เสร็จก่อนค่อยแสดงข้อมูล
// วิธีใช้ในแต่ละหน้า: window.dataReady.then(() => { โค้ดแสดงผลของหน้านั้น });
window.dataReady = loadCloudData();