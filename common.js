// ===== ซ่อนหน้า Loading Screen เมื่อข้อมูลจาก Firebase โหลดเสร็จ =====
// (กันไม่ให้ผู้ใช้เห็นหน้าเว็บที่ยังจัดเรียง/เติมข้อมูลไม่เสร็จโผล่มาแวบ ๆ ก่อน)
// มี timeout สำรองไว้ 6 วินาที เผื่อ Firebase โหลดช้าผิดปกติหรือเน็ตมีปัญหา จะได้ไม่ค้างจอโหลดตลอดไป
(function hidePageLoaderWhenReady() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;

  let hidden = false;
  function hideLoader() {
    if (hidden) return;
    hidden = true;
    loader.classList.add('loader-hide');
    setTimeout(() => loader.remove(), 600);
  }

  Promise.race([
    window.dataReady,
    new Promise(resolve => setTimeout(resolve, 6000))
  ]).then(hideLoader);
})();

// ===== ระบบดึงข้อมูลกลางที่ทุกคนเห็นร่วมกัน อยู่ในไฟล์ firebase-sync.js แทนแล้ว =====
// (เดิมเก็บใน localStorage เห็นแค่เครื่องตัวเอง ตอนนี้เปลี่ยนไปเก็บบนคลาวด์ ทุกเครื่องเห็นตรงกัน)
// ทุกหน้าต้องมี <script src="firebase-sync.js"></script> อยู่ก่อน <script src="common.js"></script>

// ===== เอฟเฟกต์บรรยากาศสไตล์อนิเมะ (เส้นสปีด + ประกายพลังลอย + สแกนไลน์) =====
(function initAmbientFx() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fx = document.createElement('div');
  fx.id = 'ambient-fx';
  fx.setAttribute('aria-hidden', 'true');

  ['b1', 'b2', 'b3', 'b4'].forEach(cls => {
    const blob = document.createElement('div');
    blob.className = `ambient-blob ${cls}`;
    fx.appendChild(blob);
  });

  ['speed-line', 'speed-line s2', 'speed-line s3'].forEach(cls => {
    const line = document.createElement('div');
    line.className = cls;
    fx.appendChild(line);
  });

  const bokehCount = window.innerWidth < 768 ? 8 : 14;
  for (let i = 0; i < bokehCount; i++) {
    const dot = document.createElement('span');
    dot.className = 'bokeh' + (i % 2 === 0 ? ' pink' : '');
    const size = 6 + Math.random() * 14;
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.left = (Math.random() * 100) + 'vw';
    dot.style.animationDuration = (7 + Math.random() * 8) + 's';
    dot.style.animationDelay = (Math.random() * -12) + 's';
    fx.appendChild(dot);
  }

  document.body.prepend(fx);

  const scan = document.createElement('div');
  scan.id = 'scanline';
  scan.setAttribute('aria-hidden', 'true');
  document.body.appendChild(scan);

  // ประกายแสงในแบนเนอร์ชื่อรุ่น (คอนทราสต์กับพื้นชมพูเข้ม มองเห็นชัดเจนแน่นอน)
  const banner = document.getElementById('banner');
  if (banner) {
    const sparkCount = window.innerWidth < 768 ? 10 : 18;
    for (let i = 0; i < sparkCount; i++) {
      const s = document.createElement('span');
      s.className = 'banner-spark';
      const size = 4 + Math.random() * 10;
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = (Math.random() * 100) + '%';
      s.style.animationDuration = (5 + Math.random() * 6) + 's';
      s.style.animationDelay = (Math.random() * -10) + 's';
      banner.appendChild(s);
    }
  }
})();

// ===== SCROLL PROGRESS BAR =====
const scrollProgress = document.getElementById('scroll-progress');
function updateScrollProgress() {
  if (!scrollProgress) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  scrollProgress.style.width = percent + '%';
}
window.addEventListener('scroll', updateScrollProgress);

// ===== BACK TO TOP BUTTON =====
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) backToTop.classList.add('visible');
    else backToTop.classList.remove('visible');
  });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ===== FADE IN ON SCROLL =====
// หมายเหตุ: ฟังก์ชันนี้ต้องถูกเรียกซ้ำได้ ไม่ใช่แค่ตอน DOMContentLoaded เพราะบางหน้า
// สร้าง element ที่มีคลาส .fade-in-up ขึ้นมาทีหลัง (หลังโหลดข้อมูลจากคลาวด์เสร็จ)
// ถ้าไม่เรียกซ้ำ element เหล่านั้นจะค้าง opacity:0 ตลอดไป มองไม่เห็น
function initFadeIn() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('show'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in-up:not(.fade-in-observed)').forEach(el => {
    el.classList.add('fade-in-observed');
    observer.observe(el);
  });
}
window.initFadeIn = initFadeIn;
document.addEventListener('DOMContentLoaded', initFadeIn);

// ===== สร้าง avatar (รูปจริงถ้ามี photo, ไม่งั้นใช้ตัวอักษรย่อ) =====
function avatarHtml(member, sizeClass) {
  if (member.photo) {
    return `<img src="${member.photo}" alt="${member.name}" class="${sizeClass} object-cover rounded-xl">`;
  }
  const initial = member.name.replace(/^นาย |^นาง |^นางสาว /, '').charAt(0);
  return `<div class="${sizeClass} rounded-xl bg-gradient-to-br from-[#c084fc] to-[#a855f7] flex items-center justify-center text-white text-3xl font-bold">${initial}</div>`;
}

// ===== เติมข้อมูลท้ายเว็บ (footer) อัตโนมัติจาก data.js =====
function fillFooter() {
  document.querySelectorAll('[data-college-th]').forEach(el => el.textContent = SITE.collegeNameTh);
  document.querySelectorAll('[data-college-en]').forEach(el => el.textContent = SITE.collegeNameEn);
  document.querySelectorAll('[data-address]').forEach(el => el.textContent = SITE.address);
  document.querySelectorAll('[data-phone]').forEach(el => el.textContent = SITE.phone);
}
Promise.all([
  new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve)),
  window.dataReady
]).then(fillFooter);