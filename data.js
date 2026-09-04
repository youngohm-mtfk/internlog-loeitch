// ===================================================
// ข้อมูลกลางของเว็บไซต์ — แก้ตรงนี้ที่เดียว มีผลทุกหน้า
// ===================================================

const SITE = {
  collegeNameTh: "วิทยาลัยเทคนิคเลย",
  collegeNameEn: "Loei Technical College",
  address: "272 ถ.เจริญรัฐ ต.กุดป่อง อ.เมือง จ.เลย 42000",
  phone: "042-811591",
  batchTitle: "เด็กฝึกงาน 2569",
  startDate: "2026-05-11", // 11 พฤษภาคม 2569
  endDate: "2026-09-22",   // 22 กันยายน 2569
  dailyStart: "08:30",
  dailyEnd: "16:30",
  dailyHours: 8.0,
  heroImage: "", // path รูปหรือ base64 ของรูปอาคาร/ภาพหลักหน้าแรก ใส่ผ่านหน้า "จัดการข้อมูล" ได้เลย
  bannerImage: "" // path รูปหรือ base64 ของรูปแบนเนอร์ "เด็กฝึกงาน" (เต็มกรอบ) ใส่ผ่านหน้า "จัดการข้อมูล" ได้เลย
};

// สมาชิกในทีม — แก้ชื่อ รหัส เบอร์โทร รูปภาพ ได้ตรงนี้
// role: "head" = หัวหน้างาน, "member" = สมาชิก
// photo: ใส่ path รูปในโฟลเดอร์ img/ เช่น "img/somchai.jpg" ถ้าไม่มีรูปจะใช้ตัวอักษรย่อแทน
const MEMBERS = [
  {
    id: "68319010030",
    name: "นาย วิโรจน์ นามวงษา",
    role: "member",
    phone: "094-942-7621",
    photo: ""
  },
  {
    id: "-",
    name: "พิชญะ พรมลา",
    role: "head",
    phone: "-",
    photo: ""
  },
  {
    id: "68319010016",
    name: "นาย ชนน สุทธิรักษ์",
    role: "member",
    phone: "097-962-9075",
    photo: ""
  },
  {
    id: "68319010023",
    name: "นาย บารมี ปะวะลัง",
    role: "member",
    phone: "099-459-4924",
    photo: ""
  }
];

// ===================================================
// รายละเอียดงานรายวัน แยกตามสัปดาห์ (สำหรับหน้า งานที่ได้มอบหมาย)
// ===================================================
// โครงสร้าง: WEEK_DETAILS[หมายเลขสัปดาห์] = [ {รายการของแต่ละวัน}, ... ]
// แต่ละวันมี:
//   date       : วันที่ เช่น "2026-03-09"
//   photos     : ลิสต์ path รูปภาพในโฟลเดอร์ img/ เช่น ["img/w1d1-1.jpg", "img/w1d1-2.jpg"]
//                (ถ้ายังไม่มีรูป ปล่อยเป็น [] ได้ ระบบจะโชว์กล่องเทาแทน)
//   jobTasks   : ลิสต์งานที่เกี่ยวกับสายงาน (ข้อความสั้น ๆ ทีละบรรทัด)
//   otherTasks : ลิสต์งานที่ไม่เกี่ยวกับสายงาน
//
// ตัวอย่างสัปดาห์ที่ 1 วันแรก ใส่ข้อมูลจริงตามภาพที่ส่งมาให้แล้ว
// สัปดาห์/วันอื่น ๆ ที่ยังไม่มีข้อมูล ระบบจะโชว์ข้อความ default ให้อัตโนมัติ
const WEEK_DETAILS = {
  1: [
    {
      date: "2026-05-11",
      photos: [], // ใส่ path รูปจริงตรงนี้ เช่น "img/w1d1-1.jpg"
      jobTasks: [
        "ตรวจเช็คเครื่องปริ้น",
        "ทำแอปพลิเคชันลูกเสือ"
      ],
      otherTasks: [
        "ย้ายของ",
        "แกะน้อง Ping Ta khon"
      ]
    }
    // เพิ่มวันที่ 2, 3, 4, 5 ของสัปดาห์นี้ต่อได้เลย โดย copy โครงสร้าง { date, photos, jobTasks, otherTasks } ด้านบน
  ]
  // เพิ่มสัปดาห์อื่น เช่น 2: [ {...}, {...} ], 3: [ ... ] ได้ตามต้องการ
};

// ===================================================
// เวลาลงเวลาจริงที่กรอกผ่านหน้า "จัดการข้อมูล" (ทับค่าเริ่มต้นที่คำนวณอัตโนมัติ)
// ===================================================
// โครงสร้าง: TIME_LOG_OVERRIDES["ชื่อ-นามสกุล|YYYY-MM-DD"] = { checkIn, checkOut, note }
// ปกติปล่อยว่างไว้ — ระบบจะคำนวณเวลาเข้า 08:30 ออก 16:30 ให้อัตโนมัติทุกวันทำการ
// ถ้าอยากใส่เวลาจริงของวันไหน ให้กรอกผ่านแท็บ "ลงเวลา" ในหน้าจัดการข้อมูลแทนการแก้ตรงนี้
const TIME_LOG_OVERRIDES = {};

function timeLogKey(name, dateStr) {
  return `${name}|${dateStr}`;
}

// คำนวณจำนวนชั่วโมงจากเวลาเข้า-ออก เช่น "08:30", "16:30" -> 8.0
function computeHoursFromTimes(checkIn, checkOut) {
  if (!checkIn || !checkOut || checkIn === '-' || checkOut === '-') return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  if (isNaN(inH) || isNaN(outH)) return 0;
  let diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff < 0) diff = 0;
  return Math.round((diff / 60) * 100) / 100;
}

// ===================================================
// ฟังก์ชันช่วยเหลือทั่วไป (ใช้ในหน้า ลงเวลา / งานที่มอบหมาย)
// ===================================================

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const THAI_MONTHS_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function toBuddhistYear(date) {
  return date.getFullYear() + 543;
}

function formatThaiDate(date, full = false) {
  const day = date.getDate();
  const month = full ? THAI_MONTHS_FULL[date.getMonth()] : THAI_MONTHS[date.getMonth()];
  const year = toBuddhistYear(date);
  return `${day} ${month} ${year}`;
}

function formatThaiShort(date) {
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDateRange(startStr, endStr) {
  const dates = [];
  let cur = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// สร้างข้อมูลลงเวลาทั้งหมด (ใช้ข้อมูลจริงจาก TIME_LOG_OVERRIDES ถ้ามี ไม่งั้นคำนวณอัตโนมัติ)
function generateTimeLogs() {
  const dates = getDateRange(SITE.startDate, SITE.endDate);
  const logs = [];
  let idx = 1;
  MEMBERS.forEach(member => {
    dates.forEach(date => {
      const dateStr = date.toISOString().slice(0, 10);
      const override = TIME_LOG_OVERRIDES[timeLogKey(member.name, dateStr)];
      const weekend = isWeekend(date);

      if (override) {
        logs.push({
          no: idx++,
          name: member.name,
          date: date,
          checkIn: override.checkIn || "-",
          checkOut: override.checkOut || "-",
          hours: computeHoursFromTimes(override.checkIn, override.checkOut),
          note: override.note || "-"
        });
      } else {
        // ยังไม่มีการลงเวลาจริงผ่านหน้า "จัดการข้อมูล" สำหรับวันนี้ -> ไม่ต้องสร้างแถวเลย
      }
    });
  });
  return logs;
}

// สร้างข้อมูลสัปดาห์ฝึกงาน (สำหรับหน้า งานที่ได้มอบหมาย)
function generateWeeks() {
  const dates = getDateRange(SITE.startDate, SITE.endDate);
  const weeks = [];
  let weekNo = 1;
  let i = 0;
  while (i < dates.length) {
    const weekDates = dates.slice(i, i + 7);
    weeks.push({
      no: weekNo++,
      start: weekDates[0],
      end: weekDates[weekDates.length - 1],
      // ปรับเปอร์เซ็นต์ความคืบหน้าของแต่ละสัปดาห์ได้ตรงนี้ (0-100)
      progress: 100
    });
    i += 7;
  }
  return weeks;
}