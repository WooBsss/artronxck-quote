// Thai / English language switch.
// Static page text (index.html) is translated here by looking up the original Thai text;
// dynamic text built by app.js uses L('ไทย', 'English') and is re-rendered on 'langchange'.
(function () {
  const KEY = 'cncq.lang';
  let lang = 'th';
  try { lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'th'; } catch { /* storage blocked */ }

  // Thai (as written in index.html, trimmed) → English
  const EN = {
    'ระบบคำนวณราคา CNC': 'CNC pricing system',
    'ขอราคาทันที': 'Instant quote',
    'พารามิเตอร์โรงงาน': 'Shop parameters',
    'วัสดุ': 'Material',
    'สรุปใบเสนอราคา': 'Quote summary',
    'ราคาทั้งหมดเป็นเงินบาท': 'All prices are in Thai Baht',
    '฿ เงินบาทเท่านั้น': '฿ THB only',
    'เปลี่ยนธีม': 'Change theme',
    'เปลี่ยนภาษา': 'Change language',
    'คำนวณราคางาน': 'Instant',
    'ทันที': 'machining quote',
    'อัปโหลดไฟล์ 3D เลือกวัสดุและการชุบแข็ง แล้วรับราคาเป็นเงินบาท คำนวณจากน้ำหนักชิ้นงาน เวลาเครื่องจักร ค่าเครื่องจักร และค่าไฟฟ้า':
      'Upload a 3D model, choose the material and hardening, and get a price in Thai Baht, calculated from part weight, machine time, machine cost and electricity.',
    'อัปโหลด STEP / STL / 3MF': 'Upload STEP / STL / 3MF',
    'เลือกวัสดุและตัวเลือก': 'Choose material & options',
    'รับราคาเป็นเงินบาท': 'Get a price in Baht',
    'ลากไฟล์ 3D มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์': 'Drop 3D files here or click to browse',
    'STEP (.step/.stp) · STL · 3MF · IGES — ไฟล์ถูกประมวลผลในเบราว์เซอร์ของคุณ ไม่มีการส่งขึ้นเซิร์ฟเวอร์':
      'STEP (.step/.stp) · STL · 3MF · IGES — files are processed in your browser and never uploaded',
    'ลองใช้ชิ้นงานตัวอย่าง': 'Try a sample part',
    'ชิ้นงาน': 'Part',
    'แสดงสีตามที่กำหนดไว้ในไฟล์ (STEP / IGES / 3MF)': 'Show the colours saved in the file (STEP / IGES / 3MF)',
    'สีจากไฟล์': 'File colours',
    'เส้นขอบ': 'Edges',
    'กล่องวัตถุดิบ': 'Stock box',
    'รีเซ็ตมุมมอง': 'Reset view',
    'ตัวเลือกชิ้นงาน': 'Part options',
    'หน่วยของโมเดล': 'Model unit',
    'มิลลิเมตร (mm)': 'Millimetre (mm)',
    'เซนติเมตร (cm)': 'Centimetre (cm)',
    'นิ้ว (inch)': 'Inch (in)',
    'จำนวน (ชิ้น)': 'Quantity (pcs)',
    'ลดจำนวน': 'Decrease quantity',
    'เพิ่มจำนวน': 'Increase quantity',
    'การชุบแข็ง': 'Hardening',
    'ไม่ชุบแข็ง': 'No hardening',
    'ชุบ': 'Harden',
    'หมายเหตุการชุบ': 'Hardening note',
    'เช่น ชุบแข็ง HRC 50–55, ชุบเฉพาะผิว, ชุบซิงค์': 'e.g. harden to HRC 50–55, case hardening, zinc plating',
    'ค่าพิกัดความเผื่อ': 'Tolerance',
    'รูเกลียว (รู / ชิ้น)': 'Threaded holes (per part)',
    'ใบรายงานการตรวจวัด (QC report)': 'Inspection report (QC report)',
    'ส่วนลด (ทั้งออเดอร์)': 'Discount (whole order)',
    'ไม่มีส่วนลด': 'No discount',
    'สมาชิก Artron Academy (กรอกส่วนลดเอง)': 'Artron Academy member (enter discount)',
    'นักเรียน / นักศึกษา (ลด 15%)': 'Student (15% off)',
    'ส่วนลดสมาชิก Artron Academy': 'Artron Academy member discount',
    'ราคาต่อชิ้น': 'Price per piece',
    'รวม (': 'Total (',
    'ชิ้น)': 'pcs)',
    'ราคานี้ยังไม่รวม VAT (คิด VAT ในสรุปใบเสนอราคา) เป็นราคาประเมินเบื้องต้น ราคาจริงอาจเปลี่ยนแปลงหลังวิศวกรตรวจสอบแบบ':
      'Prices exclude VAT (VAT is added in the quote summary). This is an estimate; the final price may change after an engineering review.',
    'ราคาเครื่องจักร ค่าไฟฟ้า และค่าแรง ใช้คำนวณต้นทุนต่อชั่วโมง (บันทึกไว้ในเบราว์เซอร์นี้)':
      'Machine price, electricity and labour are used to compute the hourly cost (saved in this browser).',
    'คืนค่าเริ่มต้น': 'Reset to defaults',
    'คลังวัสดุ': 'Material library',
    'ความหนาแน่นใช้คำนวณน้ำหนักชิ้นงาน แก้ไขราคาให้ตรงกับซัพพลายเออร์ของคุณ (บาทต่อกิโลกรัม)':
      'Density is used to calculate part weight. Edit prices to match your supplier (Baht per kg).',
    '+ เพิ่มวัสดุ': '+ Add material',
    'ใบเสนอราคา': 'Quotation',
    'พิมพ์ / บันทึก PDF': 'Print / save PDF',
    'คัดลอกลิงก์ใบเสนอราคา': 'Copy quote link',
    'อัปเดตใหม่': 'New update',
    'มีอะไรใหม่': "What's new",
    'การอัปเดตก่อนหน้า': 'Earlier updates',
    'รับทราบ': 'Got it',
    'ราคาทั้งหมดเป็นสกุลเงินบาท (฿ THB) ·': 'All prices in Thai Baht (฿ THB) ·',
    'เวลาการกัดประเมินจากปริมาตรเนื้อวัสดุที่ถูกกัดออกและพื้นที่ผิว ไม่ใช่การจำลอง CAM':
      'Machining time is estimated from removed volume and surface area; it is not a CAM simulation.',
  };
  const TITLE = { th: 'Artron Academy · ใบเสนอราคา CNC', en: 'Artron Academy · CNC Quote' };
  const ATTRS = ['title', 'aria-label', 'placeholder'];
  const textOrig = new WeakMap(); // text node → original Thai
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CANVAS', 'svg']);

  function translateStatic(rootEl) {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !SKIP.has(n.parentElement.tagName) && !n.parentElement.closest('[data-no-i18n]')
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const cur = n.nodeValue;
      const key = cur.trim();
      if (!key) continue;
      let orig = textOrig.get(n);
      if (orig === undefined) {
        if (!(key in EN)) continue; // not static Thai text
        orig = cur;
        textOrig.set(n, orig);
      }
      const k = orig.trim();
      const out = lang === 'en' ? EN[k] : k;
      n.nodeValue = orig.replace(k, out);
    }
    rootEl.querySelectorAll('[title],[aria-label],[placeholder]').forEach((el) => {
      if (el.closest('[data-no-i18n]')) return;
      el.__i18n = el.__i18n || {};
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const v = el.getAttribute(a);
        if (!(a in el.__i18n)) { if (!(v in EN)) continue; el.__i18n[a] = v; }
        el.setAttribute(a, lang === 'en' ? EN[el.__i18n[a]] : el.__i18n[a]);
      }
    });
  }

  function syncButton() {
    const b = document.getElementById('langToggle');
    if (!b) return;
    b.dataset.lang = lang;
    b.setAttribute('aria-label', lang === 'en' ? 'Language: English (switch to Thai)' : 'ภาษา: ไทย (เปลี่ยนเป็นภาษาอังกฤษ)');
  }

  function setLang(next, { silent = false } = {}) {
    lang = next === 'en' ? 'en' : 'th';
    try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
    document.documentElement.lang = lang;
    document.title = TITLE[lang];
    if (document.body) translateStatic(document.body);
    syncButton();
    if (!silent) window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  window.I18N = {
    get lang() { return lang; },
    L: (th, en) => (lang === 'en' ? en : th),
    setLang,
    translateStatic: () => document.body && translateStatic(document.body),
  };
  document.documentElement.lang = lang;

  document.addEventListener('DOMContentLoaded', () => {
    if (lang === 'en') setLang('en', { silent: true }); else syncButton();
    document.getElementById('langToggle')?.addEventListener('click', () => {
      const b = document.getElementById('langToggle');
      b?.animate?.([{ transform: 'scale(.92)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
      setLang(lang === 'en' ? 'th' : 'en');
    });
  });
})();
