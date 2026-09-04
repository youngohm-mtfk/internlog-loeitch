// ===================================================
// เชื่อมต่อ Firebase Realtime Database
// เพื่อให้ทุกคนที่เข้าเว็บเห็นข้อมูลชุดเดียวกัน (แทนการเก็บใน localStorage ของแต่ละเครื่อง)
// ===================================================

// ★ ลิงก์ฐานข้อมูลของทีมคุณ (ได้จากหน้า Firebase Console)
const FIREBASE_URL = "https://intern-log-b047d-default-rtdb.firebaseio.com";

// โหลดข้อมูลจากคลาวด์มาทับค่าเริ่มต้นใน data.js
// คืนค่าเป็น Promise ให้หน้าเว็บอื่น ๆ "รอ" ให้โหลดเสร็จก่อนค่อยแสดงผล
async function loadCloudData() {
  try {
    const res = await fetch(`${FIREBASE_URL}/data.json`);
    const cloud = await res.json();
    if (!cloud) return; // ฐานข้อมูลยังว่างอยู่ -> ใช้ค่าเริ่มต้นจาก data.js ไปก่อน

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
  } catch (e) {
    console.warn('โหลดข้อมูลจากคลาวด์ไม่สำเร็จ (อาจไม่มีอินเทอร์เน็ต) ใช้ค่าเริ่มต้นแทน', e);
  }
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
    return true;
  } catch (e) {
    alert('ล้างข้อมูลไม่สำเร็จ: ' + e.message);
    return false;
  }
}

// ★ Promise กลาง — ทุกหน้าเว็บต้อง "รอ" ตัวนี้เสร็จก่อนค่อยแสดงข้อมูล
// วิธีใช้ในแต่ละหน้า: window.dataReady.then(() => { โค้ดแสดงผลของหน้านั้น });
window.dataReady = loadCloudData();
