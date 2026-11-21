import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

/* ------------------------------------------------------------------ *
 *  Formatting — Thai Baht only
 * ------------------------------------------------------------------ */
const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const baht = (v) => THB.format(Number.isFinite(v) ? v : 0);
const num = (v, d = 2) => (Number.isFinite(v) ? v : 0).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d });
// Thai / English: L('ไทย', 'English') picks the current language (see i18n.js)
const L = (th, en) => (window.I18N?.lang === 'en' ? en : th);
const weight = (kg) => (kg < 1 ? `${num(kg * 1000, 1)} ${L('กรัม', 'g')}` : `${num(kg, 3)} ${L('กก.', 'kg')}`);
const PCS = () => L('ชิ้น', 'pcs');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ *
 *  Data: materials, finishes, tolerances, lead times, shop parameters
 * ------------------------------------------------------------------ */
const GROUP_NAMES = {
  aluminium: ['อะลูมิเนียม', 'Aluminium'], steel: ['เหล็ก', 'Steel'], stainless: ['สแตนเลส', 'Stainless steel'],
  copper: ['ทองเหลืองและทองแดง', 'Brass & copper'], titanium: ['ไทเทเนียม', 'Titanium'], plastic: ['พลาสติกวิศวกรรม', 'Engineering plastics'],
};
const GROUP_IDS = Object.keys(GROUP_NAMES);
const groupName = (g) => L(...GROUP_NAMES[g]);

// English names of the built-in materials (shown in English mode unless the user renamed the material)
const MATERIAL_EN = {
  al6061: 'Aluminium 6061-T6', al5083: 'Aluminium 5083', al7075: 'Aluminium 7075-T6', ss400: 'Mild steel SS400',
  s45c: 'Carbon steel S45C', skd11: 'Tool steel SKD11', ss304: 'Stainless steel 304', ss316: 'Stainless steel 316',
  c3604: 'Brass C3604', c1100: 'Copper C1100', ti5: 'Titanium Gr5 (Ti-6Al-4V)', pom: 'POM (Delrin / Acetal)',
  abs: 'ABS', pa6: 'Nylon PA6', pmma: 'Acrylic PMMA', peek: 'PEEK',
};

// density g/cm³ · price ฿/kg · mrr = roughing removal rate cm³/min · wear = tool-wear multiplier
const DEFAULT_MATERIALS = [
  { id: 'al6061', name: 'อะลูมิเนียม 6061-T6', group: 'aluminium', density: 2.70, price: 160, mrr: 12, wear: 1.0, color: '#c9cfd6' },
  { id: 'al5083', name: 'อะลูมิเนียม 5083', group: 'aluminium', density: 2.66, price: 150, mrr: 11, wear: 1.0, color: '#c4cad2' },
  { id: 'al7075', name: 'อะลูมิเนียม 7075-T6', group: 'aluminium', density: 2.81, price: 380, mrr: 10, wear: 1.2, color: '#b9c0c9' },
  { id: 'ss400', name: 'เหล็กเหนียว SS400', group: 'steel', density: 7.85, price: 45, mrr: 5, wear: 1.5, color: '#7f868e' },
  { id: 's45c', name: 'เหล็กคาร์บอน S45C', group: 'steel', density: 7.85, price: 65, mrr: 4, wear: 1.8, color: '#8a9199' },
  { id: 'skd11', name: 'เหล็กกล้าเครื่องมือ SKD11', group: 'steel', density: 7.70, price: 220, mrr: 2, wear: 3.5, color: '#6f767e' },
  { id: 'ss304', name: 'สแตนเลส 304', group: 'stainless', density: 7.93, price: 190, mrr: 2.5, wear: 2.5, color: '#a9b0b8' },
  { id: 'ss316', name: 'สแตนเลส 316', group: 'stainless', density: 7.98, price: 290, mrr: 2.2, wear: 2.8, color: '#a3abb4' },
  { id: 'c3604', name: 'ทองเหลือง C3604', group: 'copper', density: 8.50, price: 390, mrr: 14, wear: 0.8, color: '#d4b25a' },
  { id: 'c1100', name: 'ทองแดง C1100', group: 'copper', density: 8.94, price: 460, mrr: 7, wear: 1.3, color: '#c97a4a' },
  { id: 'ti5', name: 'ไทเทเนียม Gr5 (Ti-6Al-4V)', group: 'titanium', density: 4.43, price: 1900, mrr: 1.2, wear: 4.5, color: '#9aa0a8' },
  { id: 'pom', name: 'POM (เดลริน / อะซีทัล)', group: 'plastic', density: 1.41, price: 190, mrr: 20, wear: 0.5, color: '#f2f2ee' },
  { id: 'abs', name: 'ABS', group: 'plastic', density: 1.05, price: 140, mrr: 20, wear: 0.5, color: '#e8e3d6' },
  { id: 'pa6', name: 'ไนลอน PA6', group: 'plastic', density: 1.14, price: 210, mrr: 18, wear: 0.5, color: '#efe9da' },
  { id: 'pmma', name: 'อะคริลิก PMMA', group: 'plastic', density: 1.19, price: 160, mrr: 16, wear: 0.5, color: '#cfe6f2' },
  { id: 'peek', name: 'PEEK', group: 'plastic', density: 1.31, price: 4800, mrr: 10, wear: 0.8, color: '#c9a77c' },
];

const TOLERANCES = [
  { id: 'std', name: ['มาตรฐาน ±0.10 mm', 'Standard ±0.10 mm'], f: 1 },
  { id: 'fine', name: ['ละเอียด ±0.05 mm', 'Fine ±0.05 mm'], f: 1.3 },
  { id: 'prec', name: ['แม่นยำสูง ±0.02 mm', 'Precision ±0.02 mm'], f: 1.75 },
  { id: 'ultra', name: ['แม่นยำพิเศษ ±0.01 mm', 'Ultra precision ±0.01 mm'], f: 2.4 },
];
const tolName = (t) => L(...t.name);

// customer types (whole order): discount % comes from the shop parameters
const CUSTOMERS = {
  general: { name: ['ลูกค้าทั่วไป', 'General customer'], pctKey: null },
  academy: { name: ['สมาชิก Artron Academy', 'Artron Academy member'], pctKey: 'academyPct' },
  student: { name: ['นักเรียน / นักศึกษา', 'Student'], pctKey: 'studentPct' },
};
const custName = (c) => L(...(CUSTOMERS[c] || CUSTOMERS.general).name);
const custPct = (c) => { const k = (CUSTOMERS[c] || CUSTOMERS.general).pctKey; return k ? Math.min(Math.max(shop[k] || 0, 0), 100) : 0; };

// label / unit / title are [Thai, English]
const PARAM_GROUPS = [
  { title: ['เครื่องจักร', 'Machine'], icon: '⚙', params: [
    { key: 'machinePrice', label: ['ราคาเครื่องจักร', 'Machine price'], unit: ['฿', '฿'], def: 3500000, step: 10000 },
    { key: 'lifeYears', label: ['ระยะเวลาคิดค่าเสื่อมราคา', 'Depreciation period'], unit: ['ปี', 'years'], def: 10, step: 1 },
    { key: 'hoursPerYear', label: ['ชั่วโมงทำงานต่อปี', 'Working hours per year'], unit: ['ชม.', 'hr'], def: 2400, step: 100 },
    { key: 'maintPct', label: ['ค่าบำรุงรักษาต่อปี', 'Maintenance per year'], unit: ['% ของราคา', '% of price'], def: 5, step: 0.5 },
    { key: 'travelX', label: ['ระยะเดินแกน X', 'X travel'], unit: ['mm', 'mm'], def: 850, step: 10 },
    { key: 'travelY', label: ['ระยะเดินแกน Y', 'Y travel'], unit: ['mm', 'mm'], def: 500, step: 10 },
    { key: 'travelZ', label: ['ระยะเดินแกน Z', 'Z travel'], unit: ['mm', 'mm'], def: 500, step: 10 },
    { key: 'minWall', label: ['ความหนาผนังต่ำสุดที่กัดได้', 'Minimum machinable wall'], unit: ['mm', 'mm'], def: 1, step: 0.1 },
  ] },
  { title: ['ไฟฟ้า', 'Electricity'], icon: 'ϟ', params: [
    { key: 'powerKw', label: ['กำลังไฟเครื่อง (สปินเดิล + แกน)', 'Machine power (spindle + axes)'], unit: ['kW', 'kW'], def: 15, step: 0.5 },
    { key: 'loadPct', label: ['โหลดเฉลี่ยขณะกัดงาน', 'Average load while cutting'], unit: ['%', '%'], def: 60, step: 5 },
    { key: 'auxKw', label: ['อุปกรณ์เสริม (ปั๊มลม น้ำหล่อเย็น ไฟส่องสว่าง)', 'Auxiliary (compressor, coolant, lights)'], unit: ['kW', 'kW'], def: 3, step: 0.5 },
    { key: 'elecRate', label: ['ค่าไฟฟ้าต่อหน่วย', 'Electricity rate'], unit: ['฿/kWh', '฿/kWh'], def: 4.18, step: 0.01 },
  ] },
  { title: ['ค่าแรงและการกัดงาน', 'Labour & machining'], icon: '⚒', params: [
    { key: 'laborRate', label: ['ค่าแรงช่างควบคุมเครื่อง', 'Operator wage'], unit: ['฿/ชม.', '฿/hr'], def: 150, step: 5 },
    { key: 'toolRate', label: ['ค่าสึกหรอทูล (ฐานอะลูมิเนียม)', 'Tool wear (aluminium baseline)'], unit: ['฿/ชม.', '฿/hr'], def: 60, step: 5 },
    { key: 'finishRate', label: ['ความเร็วกัดเก็บผิว (อะลูมิเนียม)', 'Finishing speed (aluminium)'], unit: ['cm²/นาที', 'cm²/min'], def: 25, step: 1 },
    { key: 'setupMin', label: ['เวลาตั้งเครื่องและจับยึดต่อล็อต', 'Setup & fixturing per batch'], unit: ['นาที', 'min'], def: 45, step: 5 },
    { key: 'progMin', label: ['เวลาเขียนโปรแกรม CAM ต่อแบบ', 'CAM programming per design'], unit: ['นาที', 'min'], def: 30, step: 5 },
    { key: 'handleMin', label: ['เวลาใส่ / ถอดชิ้นงานต่อชิ้น', 'Load / unload per piece'], unit: ['นาที', 'min'], def: 2, step: 0.5 },
  ] },
  { title: ['ธุรกิจ', 'Business'], icon: '฿', params: [
    { key: 'stockMargin', label: ['ค่าเผื่อวัตถุดิบต่อด้าน', 'Raw stock allowance per side'], unit: ['mm', 'mm'], def: 3, step: 0.5 },
    { key: 'overheadPct', label: ['ค่าโสหุ้ย (ค่าเช่า งานธุรการ)', 'Overhead (rent, admin)'], unit: ['%', '%'], def: 15, step: 1 },
    { key: 'profitPct', label: ['กำไร', 'Profit'], unit: ['%', '%'], def: 25, step: 1 },
    { key: 'minOrder', label: ['มูลค่าสั่งซื้อขั้นต่ำ', 'Minimum order value'], unit: ['฿', '฿'], def: 500, step: 50 },
    { key: 'hardenRate', label: ['ค่าชุบแข็ง (ตามน้ำหนักชิ้นงาน)', 'Hardening (by part weight)'], unit: ['฿/กก.', '฿/kg'], def: 60, step: 5 },
    { key: 'hardenMin', label: ['ค่าชุบแข็งขั้นต่ำต่อล็อต', 'Minimum hardening charge per batch'], unit: ['฿', '฿'], def: 500, step: 50 },
    { key: 'vat', label: ['คิดภาษีมูลค่าเพิ่ม (VAT 7%)', 'Add VAT 7%'], type: 'toggle', def: true },
  ] },
  { title: ['ส่วนลดและบริการเสริม', 'Discounts & extras'], icon: '%', params: [
    { key: 'academyPct', label: ['ส่วนลดสมาชิก Artron Academy', 'Artron Academy member discount'], unit: ['%', '%'], def: 15, step: 1 },
    { key: 'studentPct', label: ['ส่วนลดนักเรียน / นักศึกษา', 'Student discount'], unit: ['%', '%'], def: 10, step: 1 },
    { key: 'threadPrice', label: ['ค่าทำเกลียว', 'Thread tapping'], unit: ['฿/รู', '฿/hole'], def: 15, step: 1 },
    { key: 'qcPrice', label: ['ใบรายงานการตรวจวัด (QC)', 'Inspection report (QC)'], unit: ['฿/ล็อต', '฿/batch'], def: 500, step: 50 },
  ] },
];
const ALL_PARAMS = PARAM_GROUPS.flatMap((g) => g.params);
const DEFAULT_SHOP = Object.fromEntries(ALL_PARAMS.map((p) => [p.key, p.def]));

/* ------------------------------------------------------------------ *
 *  State (shop + materials persist in this browser)
 * ------------------------------------------------------------------ */
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
let shop = { ...DEFAULT_SHOP, ...store.get('cncq.shop', {}) };
const MAT_KEY = 'cncq.materials.th';
let materials = store.get(MAT_KEY, null) || structuredClone(DEFAULT_MATERIALS);
const parts = [];
let selectedId = null;
let partSeq = 0;
let customerType = 'general';
try { if (CUSTOMERS[localStorage.getItem('cncq.customer')]) customerType = localStorage.getItem('cncq.customer'); } catch { /* storage blocked */ }

const matById = (id) => materials.find((m) => m.id === id) || materials[0];
// built-in material keeps its English name unless the user renamed it
const matName = (m) => {
  const def = DEFAULT_MATERIALS.find((d) => d.id === m.id);
  return L(m.name, def && def.name === m.name && MATERIAL_EN[m.id] ? MATERIAL_EN[m.id] : m.name);
};
const tolById = (id) => TOLERANCES.find((t) => t.id === id) || TOLERANCES[0];

/* ------------------------------------------------------------------ *
 *  Geometry analysis — volume, surface area, bounding box, watertight
 * ------------------------------------------------------------------ */
function analyze(pos) {
  let vol = 0, area = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i], ay = pos[i + 1], az = pos[i + 2];
    const bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5];
    const cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
    // signed tetrahedron volume (origin, a, b, c)
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  }
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = pos[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const triangles = pos.length / 9;
  let openEdges = null;
  if (triangles <= 1_500_000) openEdges = countOpenEdges(pos, Math.max(...size));
  return { volume: Math.abs(vol), area, min, max, size, triangles, openEdges };
}

function countOpenEdges(pos, extent) {
  const q = 1e5 / (extent || 1);
  const ids = new Map();
  const vid = new Uint32Array(pos.length / 3);
  for (let i = 0, j = 0; i < pos.length; i += 3, j++) {
    const key = `${Math.round(pos[i] * q)},${Math.round(pos[i + 1] * q)},${Math.round(pos[i + 2] * q)}`;
    let id = ids.get(key);
    if (id === undefined) { id = ids.size; ids.set(key, id); }
    vid[j] = id;
  }
  const edges = new Map();
  const add = (a, b) => {
    if (a === b) return;
    const k = a < b ? a * 8388608 + b : b * 8388608 + a;
    edges.set(k, (edges.get(k) || 0) + 1);
  };
  for (let t = 0; t < vid.length; t += 3) { add(vid[t], vid[t + 1]); add(vid[t + 1], vid[t + 2]); add(vid[t + 2], vid[t]); }
  let open = 0;
  for (const c of edges.values()) if (c === 1) open++;
  return open;
}

/** BufferGeometry (+ optional matrix) → flat non-indexed Float32Array of triangle vertices */
function geometryToPositions(geom, matrix) {
  const p = geom.attributes.position;
  const idx = geom.index;
  const count = idx ? idx.count : p.count;
  const out = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const vi = idx ? idx.getX(i) : i;
    v.fromBufferAttribute(p, vi);
    if (matrix) v.applyMatrix4(matrix);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  return out;
}

function concat(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}

/* ------------------------------------------------------------------ *
 *  File parsing — STL, 3MF (three.js) and STEP / IGES (OpenCascade WASM)
 * ------------------------------------------------------------------ */
const OCCT_BASE = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/';
let occtPromise = null;
function getOcct() {
  if (!occtPromise) {
    occtPromise = (async () => {
      for (let i = 0; i < 200 && typeof window.occtimportjs !== 'function'; i++) await sleep(50);
      if (typeof window.occtimportjs !== 'function') throw new Error(L('โหลดตัวอ่านไฟล์ STEP ไม่สำเร็จ (กรุณาตรวจสอบอินเทอร์เน็ต)', 'Could not load the STEP reader (check your internet connection)'));
      return window.occtimportjs({ locateFile: (name) => OCCT_BASE + name });
    })();
    occtPromise.catch(() => { occtPromise = null; });
  }
  return occtPromise;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Appearance (colours) stored in the file, as one linear-RGB colour per vertex (same layout as positions).
   Parts without colour fall back to this neutral grey when other parts of the same file are coloured. */
const NO_COLOR = [0.62, 0.64, 0.67];

function fillColor(out, from, to, rgb) {
  for (let v = from; v < to; v++) { out[v * 3] = rgb[0]; out[v * 3 + 1] = rgb[1]; out[v * 3 + 2] = rgb[2]; }
}

/** Per-vertex colours for a three.js mesh from a 3MF file, or null when the mesh has no colour of its own. */
function meshColors(mesh) {
  const g = mesh.geometry;
  const idx = g.index;
  const count = idx ? idx.count : g.attributes.position.count;
  const out = new Float32Array(count * 3);
  const col = g.attributes.color;
  if (col) {
    for (let i = 0; i < count; i++) {
      const vi = idx ? idx.getX(i) : i;
      out[i * 3] = col.getX(vi); out[i * 3 + 1] = col.getY(vi); out[i * 3 + 2] = col.getZ(vi);
    }
    return out;
  }
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const named = mats.filter((m) => m && m.color && m.name); // 3MF base materials carry a name
  if (!named.length) return null;
  if (Array.isArray(mesh.material) && g.groups.length) {
    fillColor(out, 0, count, NO_COLOR);
    for (const gr of g.groups) {
      const m = mesh.material[gr.materialIndex];
      if (m && m.color) fillColor(out, gr.start, Math.min(gr.start + gr.count, count), [m.color.r, m.color.g, m.color.b]);
    }
  } else {
    const c = named[0].color;
    fillColor(out, 0, count, [c.r, c.g, c.b]);
  }
  return out;
}

/** Returns { pos, colors } — colors is null when the file has no appearance information. */
async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const buf = await file.arrayBuffer();
  if (ext === 'stl') {
    const g = new STLLoader().parse(buf);
    return { pos: geometryToPositions(g), colors: null };
  }
  if (ext === '3mf') {
    const group = new ThreeMFLoader().parse(buf);
    group.position.set(0, 0, 0); group.rotation.set(0, 0, 0); group.scale.set(1, 1, 1);
    group.updateMatrixWorld(true);
    const arrays = [], colorArrays = [];
    let hasColor = false;
    group.traverse((o) => {
      if (!o.isMesh) return;
      const p = geometryToPositions(o.geometry, o.matrixWorld);
      arrays.push(p);
      let c = meshColors(o);
      if (c) hasColor = true; else { c = new Float32Array(p.length); fillColor(c, 0, p.length / 3, NO_COLOR); }
      colorArrays.push(c);
    });
    if (!arrays.length) throw new Error(L('ไม่พบชิ้นงานในไฟล์ 3MF', 'No part found in the 3MF file'));
    return { pos: concat(arrays), colors: hasColor ? concat(colorArrays) : null };
  }
  if (['step', 'stp', 'igs', 'iges'].includes(ext)) {
    const occt = await getOcct();
    const params = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.0008, angularDeflection: 0.3 };
    const data = new Uint8Array(buf);
    const res = ext === 'step' || ext === 'stp' ? occt.ReadStepFile(data, params) : occt.ReadIgesFile(data, params);
    if (!res || !res.success || !res.meshes.length) throw new Error(L('ไม่สามารถอ่านรูปทรงโซลิดจากไฟล์ CAD นี้ได้', 'Could not read solid geometry from this CAD file'));
    let hasColor = false;
    const arrays = [], colorArrays = [];
    for (const m of res.meshes) {
      const p = m.attributes.position.array;
      const ix = m.index.array;
      const out = new Float32Array(ix.length * 3);
      for (let i = 0; i < ix.length; i++) {
        out[i * 3] = p[ix[i] * 3]; out[i * 3 + 1] = p[ix[i] * 3 + 1]; out[i * 3 + 2] = p[ix[i] * 3 + 2];
      }
      arrays.push(out);
      // colour of the whole solid, then per-face overrides (first/last are triangle indices, inclusive)
      const col = new Float32Array(out.length);
      if (m.color) hasColor = true;
      fillColor(col, 0, ix.length, m.color || NO_COLOR);
      for (const f of m.brep_faces || []) {
        if (!f.color) continue;
        hasColor = true;
        fillColor(col, f.first * 3, Math.min((f.last + 1) * 3, ix.length), f.color);
      }
      colorArrays.push(col);
    }
    return { pos: concat(arrays), colors: hasColor ? concat(colorArrays) : null };
  }
  throw new Error(L(`ไม่รองรับไฟล์ ".${ext}" กรุณาใช้ STEP, STL, 3MF หรือ IGES`, `Unsupported file type ".${ext}". Please use STEP, STL, 3MF or IGES`));
}

async function handleFiles(fileList) {
  const files = [...fileList];
  for (const file of files) {
    if (file.size > 150 * 1024 * 1024) { setStatus(`${esc(file.name)}: ${L('ไฟล์ใหญ่เกิน 150 MB', 'file is larger than 150 MB')}`, true); continue; }
    const isCad = /\.(step|stp|igs|iges)$/i.test(file.name);
    setStatus(`<span class="spinner"></span>${L('กำลังอ่าน', 'Reading')} ${esc(file.name)}${isCad && !occtPromise ? L(' (กำลังโหลดตัวอ่านไฟล์ STEP…)', ' (loading the STEP reader…)') : '…'}`);
    await sleep(30); // let the spinner paint before heavy work
    try {
      const { pos, colors } = await parseFile(file);
      if (!pos.length) throw new Error(L('ไฟล์นี้ไม่มีข้อมูลรูปทรง', 'The file contains no geometry'));
      const geo = analyze(pos);
      if (geo.volume <= 0) throw new Error(L('คำนวณปริมาตรไม่ได้ — ชิ้นงานเป็นโซลิดปิดหรือไม่?', 'Could not compute a volume — is this a closed solid?'));
      // center X/Y, put the part on Z = 0 for display
      const cx = (geo.min[0] + geo.max[0]) / 2, cy = (geo.min[1] + geo.max[1]) / 2, mz = geo.min[2];
      for (let i = 0; i < pos.length; i += 3) { pos[i] -= cx; pos[i + 1] -= cy; pos[i + 2] -= mz; }
      const ext = file.name.split('.').pop().toLowerCase();
      const part = {
        id: ++partSeq, name: file.name, ext, positions: pos, colors, geo,
        unitScale: 1, materialId: materials[0].id, harden: 'none', hardenNote: '', tolId: 'std', qty: 1, threads: 0, qc: false,
      };
      parts.push(part);
      selectPart(part.id);
      setStatus(L(`โหลด ${esc(file.name)} แล้ว · ${num(geo.triangles, 0)} สามเหลี่ยม`, `Loaded ${esc(file.name)} · ${num(geo.triangles, 0)} triangles`));
    } catch (err) {
      console.error(err);
      setStatus(`${esc(file.name)}: ${esc(err.message || err)}`, true);
    }
  }
}

function setStatus(html, isError = false) {
  const el = $('#status');
  el.className = 'status' + (isError ? ' error' : '');
  el.innerHTML = html;
}

/* ------------------------------------------------------------------ *
 *  Pricing model (all money in ฿)
 * ------------------------------------------------------------------ */
function quote(part) {
  const S = shop;
  const m = matById(part.materialId);
  const tol = tolById(part.tolId);
  const qty = Math.max(1, Math.floor(part.qty) || 1);
  const s = part.unitScale;

  const dims = part.geo.size.map((d) => d * s);                     // mm
  const volCm3 = (part.geo.volume * s ** 3) / 1000;                 // cm³
  const areaCm2 = (part.geo.area * s ** 2) / 100;                   // cm²
  const stockDims = dims.map((d) => d + 2 * S.stockMargin);         // mm
  const stockCm3 = stockDims.reduce((a, b) => a * b, 1) / 1000;     // cm³
  const partKg = (volCm3 * m.density) / 1000;
  const stockKg = (stockCm3 * m.density) / 1000;
  const removedCm3 = Math.max(stockCm3 - volCm3, 0);

  // machining time estimate
  const roughMin = removedCm3 / Math.max(m.mrr, 0.01);
  const finishSpeed = S.finishRate * (m.mrr / 12);
  const finishMin = areaCm2 / Math.max(finishSpeed, 0.01);
  const cutMin = (roughMin + finishMin) * tol.f;
  const cycleMin = cutMin + S.handleMin;

  // hourly rates
  const depPerHr = S.machinePrice / Math.max(S.lifeYears * S.hoursPerYear, 1);
  const maintPerHr = (S.machinePrice * S.maintPct) / 100 / Math.max(S.hoursPerYear, 1);
  const machinePerHr = depPerHr + maintPerHr;

  const kWh = (S.powerKw * (S.loadPct / 100) * cutMin + S.auxKw * cycleMin) / 60;
  const material = stockKg * m.price;
  const machine = machinePerHr * (cycleMin / 60);
  const electricity = kWh * S.elecRate;
  const labor = S.laborRate * (cycleMin / 60);
  const tooling = S.toolRate * m.wear * (cutMin / 60);

  const setupHr = (S.setupMin + S.progMin) / 60;
  const setupBatch = setupHr * (machinePerHr + S.laborRate + S.auxKw * S.elecRate);
  const setup = setupBatch / qty;
  const hardened = part.harden === 'yes';
  const hardenBatch = hardened ? Math.max(S.hardenRate * partKg * qty, S.hardenMin) : 0;
  const hardening = hardenBatch / qty;
  const threads = Math.max(0, Math.floor(part.threads) || 0);
  const threading = threads * S.threadPrice;                         // per piece
  const qcBatch = part.qc ? S.qcPrice : 0;                           // one report per batch
  const inspection = qcBatch / qty;

  const direct = material + machine + electricity + labor + tooling + setup + hardening + threading + inspection;
  const overhead = (direct * S.overheadPct) / 100;
  const profit = ((direct + overhead) * S.profitPct) / 100;
  const listUnit = direct + overhead + profit;                       // price before customer discount
  const discPct = custPct(customerType);
  const discount = (listUnit * discPct) / 100;
  const unit = listUnit - discount;

  return {
    m, tol, qty, dims, volCm3, areaCm2, stockDims, stockKg, partKg, removedCm3,
    roughMin, finishMin, cutMin, cycleMin, machinePerHr, kWh,
    material, machine, electricity, labor, tooling, setup, setupBatch,
    hardened, hardening, hardenBatch, hardenNote: (part.hardenNote || '').trim(),
    threads, threading, qc: !!part.qc, qcBatch, inspection,
    overhead, profit, listUnit, discPct, discount, unit, line: unit * qty,
  };
}

/* ------------------------------------------------------------------ *
 *  Design checks (DFM) — quick automatic checks before quoting
 *  level: 'error' (cannot make as is) · 'warn' (check the design) · 'info' · 'ok'
 * ------------------------------------------------------------------ */
function designChecks(part, q) {
  const S = shop;
  const out = [];
  const mm = (a) => a.map((v) => num(v, 0)).join(' × ');
  // 1. fits the machine? allow re-orienting the stock (compare sorted sizes)
  const travel = [S.travelX, S.travelY, S.travelZ];
  const sortedStock = [...q.stockDims].sort((a, b) => b - a);
  const sortedTravel = [...travel].sort((a, b) => b - a);
  const fitsAny = sortedStock.every((d, i) => d <= sortedTravel[i]);
  const fitsAsIs = q.stockDims.every((d, i) => d <= travel[i]);
  if (!fitsAny) {
    out.push({ level: 'error', text: L(`ชิ้นงานใหญ่เกินพื้นที่ทำงานของเครื่อง (วัตถุดิบ ${mm(q.stockDims)} mm · เครื่อง ${mm(travel)} mm) ต้องให้วิศวกรประเมิน`,
      `Part is larger than the machine work area (stock ${mm(q.stockDims)} mm · machine ${mm(travel)} mm) — needs an engineering review`) });
  } else if (!fitsAsIs) {
    out.push({ level: 'info', text: L('ต้องวางชิ้นงานในแนวอื่นเพื่อให้พอดีกับเครื่อง', 'The part must be re-oriented to fit the machine') });
  } else {
    out.push({ level: 'ok', text: L(`ขนาดพอดีกับเครื่อง (${mm(travel)} mm)`, `Fits the machine (${mm(travel)} mm)`) });
  }
  // 2. thin walls: average thickness ≈ 2 × volume / surface area (exact for a flat plate)
  const avgT = (2 * q.volCm3 * 1000) / Math.max(q.areaCm2 * 100, 1e-9); // mm
  if (avgT < S.minWall * 2) {
    out.push({ level: 'warn', text: L(`อาจมีผนังบาง — ความหนาเฉลี่ยประมาณ ${num(avgT, 1)} mm (เครื่องกัดได้ต่ำสุด ${num(S.minWall, 1)} mm)`,
      `Possible thin walls — average thickness about ${num(avgT, 1)} mm (minimum machinable ${num(S.minWall, 1)} mm)`) });
  }
  // 3. mesh quality (only for uploaded files)
  if (!part.fromLink && part.geo.openEdges) {
    out.push({ level: 'warn', text: L(`โมเดลไม่ปิดสนิท (ขอบเปิด ${num(part.geo.openEdges, 0)} เส้น) ปริมาตรและน้ำหนักอาจคลาดเคลื่อน — แนะนำให้ส่งออกเป็นโซลิดปิด`,
      `Mesh is not closed (${num(part.geo.openEdges, 0)} open edges); volume and weight may be off — export a closed solid`) });
  }
  // 4. size sanity
  const maxD = Math.max(...q.dims);
  if (maxD < 2) {
    out.push({ level: 'warn', text: L('ชิ้นงานเล็กมาก (ต่ำกว่า 2 mm) — ตรวจสอบหน่วยของโมเดล', 'Very small part (under 2 mm) — check the model unit') });
  } else if (maxD > 3000) {
    out.push({ level: 'warn', text: L('ขนาดชิ้นงานดูผิดปกติ — ตรวจสอบหน่วยของโมเดล (mm / cm / นิ้ว)', 'Unusual part size — check the model unit (mm / cm / inch)') });
  }
  // 5. lots of material removed → long machining
  const removedPct = (q.removedCm3 / Math.max(q.volCm3 + q.removedCm3, 1e-9)) * 100;
  if (removedPct > 85) {
    out.push({ level: 'info', text: L(`กัดเนื้อวัสดุออก ${num(removedPct, 0)}% ของวัตถุดิบ — ใช้เวลากัดนาน`, `${num(removedPct, 0)}% of the stock is machined away — long machining time`) });
  }
  if (!out.some((c) => c.level === 'warn' || c.level === 'error')) {
    out.push({ level: 'ok', text: L('ไม่พบปัญหาเบื้องต้น', 'No issues found') });
  }
  return out;
}
const worstLevel = (checks) => (checks.some((c) => c.level === 'error') ? 'error' : checks.some((c) => c.level === 'warn') ? 'warn' : 'ok');

/* ------------------------------------------------------------------ *
 *  3D viewer
 * ------------------------------------------------------------------ */
let renderer, scene, camera, controls, root, partMesh, edgeLines, stockBox, grid;
function initViewer() {
  if (renderer) return;
  const el = $('#viewer');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  el.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1e6);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8897, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1, 1.6, 1.2);
  camera.add(key);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  root = new THREE.Group();
  root.rotation.x = -Math.PI / 2; // CAD Z-up → three.js Y-up
  scene.add(root);
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(el);
  resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
}

function disposeObj(o) {
  if (!o) return;
  o.parent?.remove(o);
  o.geometry?.dispose();
  o.material?.dispose();
}

function showPartIn3D(part, refit) {
  initViewer();
  const q = quote(part);
  if (!partMesh || partMesh.userData.partId !== part.id) {
    disposeObj(partMesh); disposeObj(edgeLines);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
    if (part.colors) geom.setAttribute('color', new THREE.BufferAttribute(part.colors, 3));
    geom.computeVertexNormals();
    partMesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: q.m.color, metalness: 0.25, roughness: 0.5, side: THREE.DoubleSide }));
    partMesh.userData.partId = part.id;
    root.add(partMesh);
    edgeLines = null;
    if (part.geo.triangles < 400_000) {
      edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 28), new THREE.LineBasicMaterial({ color: 0x1f2937, transparent: true, opacity: 0.55 }));
      partMesh.add(edgeLines);
    }
    refit = true;
  }
  // appearance from the file (STEP / IGES / 3MF colours) or the chosen material's colour
  const useFileColors = !!part.colors && $('#showColors').checked;
  $('#showColorsWrap').hidden = !part.colors;
  if (partMesh.material.vertexColors !== useFileColors) {
    partMesh.material.vertexColors = useFileColors;
    partMesh.material.needsUpdate = true;
  }
  partMesh.material.color.set(useFileColors ? 0xffffff : q.m.color);
  partMesh.scale.setScalar(part.unitScale);
  if (edgeLines) edgeLines.visible = $('#showEdges').checked;

  // stock box (mm)
  disposeObj(stockBox);
  const [sx, sy, sz] = q.stockDims;
  const boxGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz));
  stockBox = new THREE.LineSegments(boxGeom, new THREE.LineBasicMaterial({ color: 0x22dddc }));
  stockBox.position.set(0, 0, q.dims[2] / 2);
  stockBox.visible = $('#showBox').checked;
  root.add(stockBox);

  // grid sized to the part
  const maxDim = Math.max(...q.dims);
  const step = niceStep(maxDim / 4);
  const gsize = step * 12;
  disposeObj(grid);
  const dark = isDarkTheme();
  grid =new THREE.GridHelper(gsize, 12, dark ? 0x5b6675 : 0x94a3b8, dark ? 0x3a4350 : 0xcbd5e1);
  grid.material.transparent = true; grid.material.opacity = 0.5;
  grid.position.y = -0.01;
  scene.add(grid);

  if (refit) fitCamera(q.dims);
}

function isDarkTheme() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// rebuild the grid in the new colours when the theme button is used
window.addEventListener('themechange', () => {
  const p = selectedPart();
  if (p && renderer) showPartIn3D(p, false);
});

function niceStep(x) {
  const p = 10 ** Math.floor(Math.log10(x || 1));
  const n = x / p;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}

function fitCamera(dims) {
  const r = Math.hypot(...dims) / 2 || 10;
  const dist = r / Math.sin((camera.fov * Math.PI) / 360) * 1.15;
  const target = new THREE.Vector3(0, dims[2] / 2, 0);
  camera.position.copy(target).add(new THREE.Vector3(1, 0.75, 1.1).normalize().multiplyScalar(dist));
  camera.near = dist / 200; camera.far = dist * 50;
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.update();
}

/* ------------------------------------------------------------------ *
 *  UI rendering
 * ------------------------------------------------------------------ */
function selectedPart() { return parts.find((p) => p.id === selectedId); }

function selectPart(id) {
  selectedId = id;
  $('#workspace').hidden = false;
  const part = selectedPart();
  if (!part) return;
  syncForm(part);
  refresh(true);
}

function syncForm(part) {
  $('#material').value = part.materialId;
  $('#unit').value = String(part.unitScale);
  $('#qty').value = part.qty;
  $('#tolerance').value = part.tolId;
  $('#unit').disabled = /^(step|stp|igs|iges)$/.test(part.ext); // CAD files are converted to mm
  $('#harden').value = part.harden;
  $('#hardenNote').value = part.hardenNote;
  $('#hardenNoteField').hidden = part.harden !== 'yes';
  $('#threads').value = part.threads || 0;
  $('#qc').checked = !!part.qc;
  syncCustomer();
}

function syncCustomer() {
  $('#custType').value = customerType;
  const pct = custPct(customerType);
  const note = $('#custNote');
  note.hidden = customerType === 'general';
  if (customerType === 'academy') note.textContent = L(`ส่วนลด ${num(pct, 0)}% สำหรับสมาชิก Artron Academy`, `${num(pct, 0)}% discount for Artron Academy members`);
  if (customerType === 'student') note.textContent = L(`ราคานักเรียน / นักศึกษา ลด ${num(pct, 0)}% · กรุณาแสดงบัตรนักเรียน / นักศึกษาเมื่อสั่งงาน`, `Student price: ${num(pct, 0)}% off · please show a valid student ID when ordering`);
}

function renderMaterialOptions() {
  const sel = $('#material');
  const cur = sel.value;
  sel.innerHTML = GROUP_IDS.map((g) => {
    const opts = materials.filter((m) => m.group === g);
    if (!opts.length) return '';
    return `<optgroup label="${esc(groupName(g))}">${opts.map((m) => `<option value="${m.id}">${esc(matName(m))} — ${baht(m.price)}/${L('กก.', 'kg')}</option>`).join('')}</optgroup>`;
  }).join('');
  if (cur) sel.value = cur;
}

function renderTolerances() {
  const sel = $('#tolerance');
  const cur = sel.value;
  sel.innerHTML = TOLERANCES.map((t) => `<option value="${t.id}">${esc(tolName(t))}</option>`).join('');
  if (cur) sel.value = cur;
}

function renderChecks(part, q) {
  const checks = designChecks(part, q);
  const icon = { ok: '✓', info: 'i', warn: '!', error: '✕' };
  $('#dfm').className = `dfm dfm-${worstLevel(checks)}`;
  $('#dfm').innerHTML = `<div class="dfm-head">${L('ตรวจสอบการผลิตเบื้องต้น', 'Manufacturability check')}</div><ul>${checks
    .map((c) => `<li class="lv-${c.level}"><span class="dfm-ic" aria-hidden="true">${icon[c.level]}</span><span>${esc(c.text)}</span></li>`).join('')}</ul>`;
}

function refresh(refit = false) {
  const part = selectedPart();
  renderPartsStrip();
  renderSummary();
  if (!part) { $('#workspace').hidden = true; return; }
  const q = quote(part);
  $('#partTitle').textContent = part.name;
  $('#qtyLabel').textContent = q.qty;
  $('#materialInfo').textContent = L(`ความหนาแน่น ${num(q.m.density)} g/cm³ · ${baht(q.m.price)} ต่อกิโลกรัม`, `Density ${num(q.m.density)} g/cm³ · ${baht(q.m.price)} per kg`);
  $('#unitPrice').textContent = baht(q.unit);
  $('#lineTotal').textContent = baht(q.line);

  const MIN = L('นาที', 'min');
  const d = q.dims.map((v) => num(v, 1)).join(' × ');
  const sd = q.stockDims.map((v) => num(v, 1)).join(' × ');
  const stats = [
    [L('ขนาด (X×Y×Z)', 'Size (X×Y×Z)'), `${d} mm`],
    [L('ปริมาตร', 'Volume'), `${num(q.volCm3)} cm³`],
    [L('พื้นที่ผิว', 'Surface area'), `${num(q.areaCm2)} cm²`],
    [L('น้ำหนักชิ้นงาน', 'Part weight'), weight(q.partKg)],
    [L('ขนาดวัตถุดิบ', 'Raw stock'), `${sd} mm`],
    [L('น้ำหนักวัตถุดิบ', 'Stock weight'), weight(q.stockKg)],
    [L('เวลาเครื่อง / ชิ้น', 'Machine time / pc'), `${num(q.cycleMin, 1)} ${MIN}`],
    [L('พลังงาน / ชิ้น', 'Energy / pc'), `${num(q.kWh, 3)} kWh`],
  ];
  $('#stats').innerHTML = stats.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  renderChecks(part, q);

  const HR = L('ชม.', 'hr'), KG = L('กก.', 'kg'), BATCH = L('ต่อล็อต', 'per batch');
  const row = (label, sub, v, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><td>${label}${sub ? `<span class="muted">${sub}</span>` : ''}</td><td class="n">${v < 0 ? '−' + baht(-v) : baht(v)}</td></tr>`;
  const rows = [
    row(L('ค่าวัตถุดิบ', 'Material'), `${L('วัตถุดิบ', 'stock')} ${weight(q.stockKg)} × ${baht(q.m.price)}/${KG}`, q.material),
    row(L('ค่าเครื่องจักร', 'Machine cost'), `${num(q.cycleMin, 1)} ${MIN} × ${baht(q.machinePerHr)}/${HR} ${L('(ค่าเสื่อม + บำรุงรักษา)', '(depreciation + maintenance)')}`, q.machine),
    row(L('ค่าไฟฟ้า', 'Electricity'), `${num(q.kWh, 3)} kWh × ${baht(shop.elecRate)}/${L('หน่วย', 'kWh')}`, q.electricity),
    row(L('ค่าแรงช่าง', 'Operator labour'), `${num(q.cycleMin, 1)} ${MIN} × ${baht(shop.laborRate)}/${HR}`, q.labor),
    row(L('ค่าสึกหรอทูล', 'Tool wear'), `${L('ตัวคูณการสึกหรอ', 'wear factor')} ×${num(q.m.wear, 1)}`, q.tooling),
    row(L('ค่าตั้งเครื่องและเขียนโปรแกรม', 'Setup & programming'), `${baht(q.setupBatch)} ${BATCH} ÷ ${q.qty} ${PCS()}`, q.setup),
  ];
  if (q.hardened) {
    const how = q.hardenBatch > shop.hardenRate * q.partKg * q.qty + 1e-9
      ? `${L('ขั้นต่ำ', 'minimum')} ${baht(shop.hardenMin)} ${BATCH} ÷ ${q.qty} ${PCS()}`
      : `${weight(q.partKg)} × ${baht(shop.hardenRate)}/${KG}`;
    rows.push(row(L('ค่าชุบแข็ง', 'Hardening'), `${how}${q.hardenNote ? ` · ${esc(q.hardenNote)}` : ''}`, q.hardening));
  }
  if (q.threads) rows.push(row(L('ค่าทำเกลียว', 'Thread tapping'), `${q.threads} ${L('รู', 'holes')} × ${baht(shop.threadPrice)}`, q.threading));
  if (q.qc) rows.push(row(L('ใบรายงานการตรวจวัด', 'Inspection report'), `${baht(q.qcBatch)} ${BATCH} ÷ ${q.qty} ${PCS()}`, q.inspection));
  rows.push(row(`${L('ค่าโสหุ้ย', 'Overhead')} ${num(shop.overheadPct, 0)}%`, '', q.overhead));
  rows.push(row(`${L('กำไร', 'Profit')} ${num(shop.profitPct, 0)}%`, '', q.profit));
  if (q.discount) {
    rows.push(row(L('ราคาก่อนส่วนลด', 'Price before discount'), '', q.listUnit, 'subtotal'));
    rows.push(row(`${L('ส่วนลด', 'Discount')} ${esc(custName(customerType))} ${num(q.discPct, 0)}%`, '', -q.discount, 'discount'));
  }
  rows.push(`<tr class="total"><td>${L('ราคาต่อชิ้น (ไม่รวม VAT)', 'Price per piece (excl. VAT)')}</td><td class="n">${baht(q.unit)}</td></tr>`);
  $('#breakdown').innerHTML = rows.join('');

  showPartIn3D(part, refit);
}

function renderPartsStrip() {
  const strip = $('#partsStrip');
  strip.hidden = parts.length === 0;
  strip.innerHTML = parts.map((p) => {
    const q = quote(p);
    return `<div class="part-chip ${p.id === selectedId ? 'active' : ''}" data-id="${p.id}" role="button" tabindex="0">
      <span class="ext">${esc(p.ext)}</span>
      <span class="meta"><span class="name" title="${esc(p.name)}">${esc(p.name)}</span>
      <span class="sub">${worstLevel(designChecks(p, q)) === 'error' ? '<b class="chip-warn" title="' + L('ใหญ่เกินเครื่อง', 'Too large for the machine') + '">!</b> ' : ''}${esc(matName(q.m))} · ${q.qty} ${PCS()} · ${baht(q.line)}</span></span>
      <button class="remove" data-remove="${p.id}" title="${L('ลบชิ้นงาน', 'Remove part')}" aria-label="${L('ลบ', 'Remove')} ${esc(p.name)}">×</button>
    </div>`;
  }).join('');
}

function orderTotals() {
  const lines = parts.map((p) => ({ p, q: quote(p) }));
  const sub = lines.reduce((a, l) => a + l.q.line, 0);
  const listSub = lines.reduce((a, l) => a + l.q.listUnit * l.q.qty, 0);
  const minAdj = parts.length && sub < shop.minOrder ? shop.minOrder - sub : 0;
  const net = sub + minAdj;
  const vat = shop.vat ? net * 0.07 : 0;
  return { lines, sub, listSub, discount: listSub - sub, minAdj, net, vat, grand: net + vat };
}

/* ------------------------------------------------------------------ *
 *  Quote number (shown in the printed / PDF header)
 * ------------------------------------------------------------------ */
const QUOTE_NO = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `Q${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
})();
const fmtDate = (d) => d.toLocaleDateString(L('th-TH', 'en-GB'), { year: 'numeric', month: 'long', day: 'numeric' });

function renderSummary() {
  const t = orderTotals();
  $('#quoteNo').textContent = `${L('เลขที่', 'No.')} ${QUOTE_NO}`;
  $('#quoteMeta').textContent = L(`วันที่เสนอราคา ${fmtDate(new Date())} · ลูกค้า: ${custName(customerType)} · สกุลเงิน: บาท (฿)`,
    `Quote date ${fmtDate(new Date())} · Customer: ${custName(customerType)} · Currency: Thai Baht (฿)`);
  if (!t.lines.length) {
    $('#summaryTable').innerHTML = `<tbody><tr><td class="empty">${L('อัปโหลดชิ้นงานเพื่อเริ่มทำใบเสนอราคา', 'Upload a part to start your quote.')}</td></tr></tbody>`;
    return;
  }
  const body = t.lines.map(({ p, q }, i) => {
    const opts = [q.hardened ? L('ชุบแข็ง', 'Hardened') : L('ไม่ชุบแข็ง', 'No hardening'), esc(tolName(q.tol))];
    if (q.threads) opts.push(L(`เกลียว ${q.threads} รู`, `${q.threads} threaded holes`));
    if (q.qc) opts.push(L('มีใบรายงาน QC', 'QC report'));
    const err = worstLevel(designChecks(p, q)) === 'error';
    return `<tr>
      <td class="s-idx">${i + 1}</td>
      <td class="s-part">${esc(p.name)}${err ? ` <span class="chip-warn" title="${L('ใหญ่เกินเครื่อง', 'Too large for the machine')}">!</span>` : ''}</td>
      <td class="s-mat" data-label="${L('วัสดุ / ตัวเลือก', 'Material / options')}">${esc(matName(q.m))}<br><span class="muted">${opts.join(' · ')}${q.hardened && q.hardenNote ? `<br>${L('หมายเหตุการชุบ', 'Hardening note')}: ${esc(q.hardenNote)}` : ''}</span></td>
      <td class="n" data-label="${L('น้ำหนัก', 'Weight')}">${weight(q.partKg)}</td>
      <td class="n" data-label="${L('จำนวน', 'Qty')}">${q.qty}</td>
      <td class="n" data-label="${L('ราคาต่อชิ้น', 'Unit price')}">${baht(q.unit)}</td>
      <td class="n s-amount" data-label="${L('จำนวนเงิน', 'Amount')}">${baht(q.line)}</td>
    </tr>`;
  }).join('');
  const pct = custPct(customerType);
  const foot = [
    t.discount > 0.004 ? `<tr><td colspan="6">${L('ราคาก่อนส่วนลด', 'Price before discount')}</td><td class="n">${baht(t.listSub)}</td></tr>` : '',
    t.discount > 0.004 ? `<tr class="discount"><td colspan="6">${L('ส่วนลด', 'Discount')} ${esc(custName(customerType))} ${num(pct, 0)}%</td><td class="n">−${baht(t.discount)}</td></tr>` : '',
    `<tr><td colspan="6">${L('รวมเป็นเงิน', 'Subtotal')}</td><td class="n">${baht(t.sub)}</td></tr>`,
    t.minAdj ? `<tr><td colspan="6">${L(`ปรับยอดขั้นต่ำการสั่งซื้อ (ขั้นต่ำ ${baht(shop.minOrder)})`, `Minimum order adjustment (minimum ${baht(shop.minOrder)})`)}</td><td class="n">${baht(t.minAdj)}</td></tr>` : '',
    shop.vat ? `<tr><td colspan="6">${L('ภาษีมูลค่าเพิ่ม 7%', 'VAT 7%')}</td><td class="n">${baht(t.vat)}</td></tr>` : '',
    `<tr class="grand"><td colspan="6">${L('ยอดรวมทั้งสิ้น', 'Total')} ${shop.vat ? L('(รวม VAT)', '(incl. VAT)') : L('(ไม่รวม VAT)', '(excl. VAT)')}</td><td class="n">${baht(t.grand)}</td></tr>`,
    customerType === 'student' ? `<tr class="note"><td colspan="7">${L('* ราคานักเรียน / นักศึกษา กรุณาแสดงบัตรนักเรียน / นักศึกษาเมื่อสั่งงาน', '* Student price: please show a valid student ID when ordering')}</td></tr>` : '',
  ].join('');
  $('#summaryTable').innerHTML = `<thead><tr><th>#</th><th>${L('ชิ้นงาน', 'Part')}</th><th>${L('วัสดุ / ตัวเลือก', 'Material / options')}</th><th class="n">${L('น้ำหนัก', 'Weight')}</th><th class="n">${L('จำนวน', 'Qty')}</th><th class="n">${L('ราคาต่อชิ้น', 'Unit price')}</th><th class="n">${L('จำนวนเงิน', 'Amount')}</th></tr></thead><tbody>${body}</tbody><tfoot>${foot}</tfoot>`;
}

function renderParams() {
  $('#paramGroups').innerHTML = PARAM_GROUPS.map((g) => `<div class="param-group"><h4><i>${g.icon}</i>${L(...g.title)}</h4>${g.params.map((p) => p.type === 'toggle'
    ? `<label class="param toggle"><input type="checkbox" data-param="${p.key}" ${shop[p.key] ? 'checked' : ''}/> ${L(...p.label)}</label>`
    : `<div class="param"><label for="p-${p.key}">${L(...p.label)}</label><div class="in"><input type="number" id="p-${p.key}" data-param="${p.key}" value="${shop[p.key]}" step="${p.step}" min="0"/><span>${L(...p.unit)}</span></div></div>`).join('')}</div>`).join('');
  renderRates();
}

function renderRates() {
  const dep = shop.machinePrice / Math.max(shop.lifeYears * shop.hoursPerYear, 1);
  const maint = (shop.machinePrice * shop.maintPct) / 100 / Math.max(shop.hoursPerYear, 1);
  const elec = (shop.powerKw * shop.loadPct / 100 + shop.auxKw) * shop.elecRate;
  const total = dep + maint + elec + shop.laborRate + shop.toolRate;
  const HR = L('ชม.', 'hr');
  $('#rateStrip').innerHTML = [
    [L('ค่าเสื่อมราคา', 'Depreciation'), dep], [L('บำรุงรักษา', 'Maintenance'), maint], [L('ค่าไฟฟ้า', 'Electricity'), elec],
    [L('ค่าแรงช่าง', 'Operator'), shop.laborRate], [L('ค่าทูล', 'Tooling'), shop.toolRate],
  ].map(([k, v]) => `<span class="rate">${k} <b>${baht(v)}/${HR}</b></span>`).join('')
    + `<span class="rate"><strong>${L('ต้นทุนเครื่องต่อชั่วโมง (อะลูมิเนียม ก่อนโสหุ้ยและกำไร)', 'Shop rate (aluminium, before overhead & profit)')}</strong> <b>${baht(total)}/${HR}</b></span>`;
}

// material library: one collapsible section (dropdown) per category; remembers which are open
const openMatGroups = new Set();
function renderMaterials() {
  const groupOpts = (sel) => GROUP_IDS.map((g) => `<option value="${g}" ${g === sel ? 'selected' : ''}>${esc(groupName(g))}</option>`).join('');
  const head = `<thead><tr><th></th><th>${L('วัสดุ', 'Material')}</th><th>${L('กลุ่ม', 'Group')}</th><th>${L('ความหนาแน่น (g/cm³)', 'Density (g/cm³)')}</th><th>${L('ราคา (฿/กก.)', 'Price (฿/kg)')}</th><th>${L('อัตรากัดเนื้อ (cm³/นาที)', 'Removal rate (cm³/min)')}</th><th>${L('ตัวคูณสึกหรอทูล', 'Tool wear ×')}</th><th></th></tr></thead>`;
  const indexed = materials.map((m, i) => ({ m, i }));
  $('#matTable').innerHTML = GROUP_IDS.map((g) => {
    const label = esc(groupName(g));
    const rows = indexed.filter(({ m }) => m.group === g);
    if (!rows.length) return '';
    const lo = Math.min(...rows.map(({ m }) => m.price)), hi = Math.max(...rows.map(({ m }) => m.price));
    const range = `${lo === hi ? baht(lo) : `${baht(lo)}–${baht(hi)}`}/${L('กก.', 'kg')}`;
    return `<details class="mat-group" data-group="${g}" ${openMatGroups.has(g) ? 'open' : ''}>
      <summary><span class="mg-name">${label}</span><span class="mg-count">${rows.length}</span><span class="mg-meta">${range}</span><span class="mg-chev" aria-hidden="true"></span></summary>
      <div class="mg-body"><div class="table-scroll"><table class="mat-table">${head}<tbody>${rows.map(({ m, i }) => matRow(m, i, groupOpts)).join('')}</tbody></table></div></div>
    </details>`;
  }).join('');
}

function matRow(m, i, groupOpts) {
  const dens = L('ความหนาแน่น (g/cm³)', 'Density (g/cm³)'), price = L('ราคา (฿/กก.)', 'Price (฿/kg)');
  const mrr = L('อัตรากัดเนื้อ (cm³/นาที)', 'Removal rate (cm³/min)'), wear = L('ตัวคูณสึกหรอทูล', 'Tool wear ×'), grp = L('กลุ่ม', 'Group');
  return `<tr data-i="${i}">
    <td class="c-color"><input type="color" data-k="color" value="${m.color}" aria-label="${L('สี', 'Colour')}" style="width:32px;height:28px;padding:0;border:0;background:none"/></td>
    <td class="c-name"><input type="text" data-k="name" value="${esc(matName(m))}" aria-label="${L('ชื่อวัสดุ', 'Material name')}"/></td>
    <td class="c-group" data-label="${grp}"><select data-k="group" aria-label="${grp}">${groupOpts(m.group)}</select></td>
    <td class="num c-density" data-label="${dens}"><input type="number" data-k="density" value="${m.density}" step="0.01" min="0.1" aria-label="${dens}"/></td>
    <td class="num c-price" data-label="${price}"><input type="number" data-k="price" value="${m.price}" step="1" min="0" aria-label="${price}"/></td>
    <td class="num c-mrr" data-label="${mrr}"><input type="number" data-k="mrr" value="${m.mrr}" step="0.1" min="0.1" aria-label="${mrr}"/></td>
    <td class="num c-wear" data-label="${wear}"><input type="number" data-k="wear" value="${m.wear}" step="0.1" min="0" aria-label="${wear}"/></td>
    <td class="c-del"><button class="del" data-del="${i}" title="${L('ลบวัสดุ', 'Delete material')}" aria-label="${L('ลบ', 'Delete')} ${esc(matName(m))}">🗑</button></td>
  </tr>`;
}

/* ------------------------------------------------------------------ *
 *  Sample part (generated, exported to STL and re-imported)
 * ------------------------------------------------------------------ */
function sampleFile() {
  const w = 90, h = 60, r = 8;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2); shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0);
  shape.lineTo(w / 2, h / 2 - r); shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2);
  shape.lineTo(-w / 2 + r, h / 2); shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI);
  shape.lineTo(-w / 2, -h / 2 + r); shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5);
  const hole = (x, y, rad) => { const p = new THREE.Path(); p.absarc(x, y, rad, 0, Math.PI * 2, true); shape.holes.push(p); };
  hole(0, 0, 14);
  for (const [x, y] of [[-35, -20], [35, -20], [35, 20], [-35, 20]]) hole(x, y, 3.3);
  const geom = new THREE.ExtrudeGeometry(shape, { depth: 12, bevelEnabled: false, curveSegments: 48 });
  const dv = new STLExporter().parse(new THREE.Mesh(geom), { binary: true });
  return new File([dv.buffer], 'sample-mounting-plate.stl', { type: 'model/stl' });
}

/* ------------------------------------------------------------------ *
 *  Events
 * ------------------------------------------------------------------ */
function bind() {
  const dz = $('#dropzone');
  // iPhone/iPad Safari greys out CAD files when `accept` lists extensions it doesn't know,
  // so let iOS users pick any file (unsupported types are still rejected in parseFile)
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) $('#fileInput').removeAttribute('accept');
  $('#fileInput').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
  $('#sampleBtn').addEventListener('click', () => handleFiles([sampleFile()]));

  const onPart = (fn) => (e) => { const p = selectedPart(); if (p) { fn(p, e); refresh(); } };
  $('#material').addEventListener('change', onPart((p, e) => { p.materialId = e.target.value; }));
  $('#unit').addEventListener('change', onPart((p, e) => { p.unitScale = Number(e.target.value); showPartIn3D(p, true); }));
  $('#harden').addEventListener('change', onPart((p, e) => {
    p.harden = e.target.value;
    $('#hardenNoteField').hidden = p.harden !== 'yes';
    if (p.harden === 'yes') $('#hardenNote').focus();
  }));
  $('#hardenNote').addEventListener('input', onPart((p, e) => { p.hardenNote = e.target.value; }));
  $('#tolerance').addEventListener('change', onPart((p, e) => { p.tolId = e.target.value; }));
  $('#threads').addEventListener('input', onPart((p, e) => { const v = Math.floor(Number(e.target.value)); p.threads = Number.isFinite(v) && v > 0 ? Math.min(v, 999) : 0; }));
  $('#threads').addEventListener('blur', () => { const p = selectedPart(); if (p) $('#threads').value = p.threads || 0; });
  $('#qc').addEventListener('change', onPart((p, e) => { p.qc = e.target.checked; }));
  $('#custType').addEventListener('change', (e) => {
    customerType = CUSTOMERS[e.target.value] ? e.target.value : 'general';
    try { localStorage.setItem('cncq.customer', customerType); } catch { /* storage blocked */ }
    syncCustomer();
    refresh();
  });
  $('#shareBtn').addEventListener('click', copyShareLink);
  $('#qty').addEventListener('input', onPart((p, e) => { const v = Math.floor(Number(e.target.value)); if (v >= 1) p.qty = Math.min(v, 100000); }));
  $('#qty').addEventListener('blur', () => { const p = selectedPart(); if (p) $('#qty').value = p.qty; });
  document.querySelectorAll('.qty button').forEach((b) => b.addEventListener('click', onPart((p) => {
    p.qty = Math.max(1, p.qty + Number(b.dataset.step)); $('#qty').value = p.qty;
  })));

  $('#partsStrip').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const id = Number(rm.dataset.remove);
      const i = parts.findIndex((p) => p.id === id);
      if (i >= 0) parts.splice(i, 1);
      if (selectedId === id) {
        disposeObj(edgeLines); disposeObj(partMesh); partMesh = edgeLines = null;
        selectedId = parts.length ? parts[Math.max(0, i - 1)].id : null;
        if (selectedId) selectPart(selectedId); else refresh();
      } else refresh();
      return;
    }
    const chip = e.target.closest('[data-id]');
    if (chip) selectPart(Number(chip.dataset.id));
  });

  $('#showEdges').addEventListener('change', (e) => { if (edgeLines) edgeLines.visible = e.target.checked; });
  $('#showColors').addEventListener('change', () => { const p = selectedPart(); if (p) showPartIn3D(p, false); });
  $('#showBox').addEventListener('change', (e) => { if (stockBox) stockBox.visible = e.target.checked; });
  $('#resetView').addEventListener('click', () => { const p = selectedPart(); if (p) fitCamera(quote(p).dims); });

  // shop parameters
  $('#paramGroups').addEventListener('input', (e) => {
    const k = e.target.dataset.param;
    if (!k) return;
    if (e.target.type === 'checkbox') shop[k] = e.target.checked;
    else { const v = Number(e.target.value); if (!Number.isFinite(v) || v < 0) return; shop[k] = v; }
    store.set('cncq.shop', shop);
    renderRates();
    refresh();
  });
  $('#resetShop').addEventListener('click', () => { shop = { ...DEFAULT_SHOP }; store.set('cncq.shop', shop); renderParams(); refresh(); });

  // materials
  const matChanged = () => {
    store.set(MAT_KEY, materials);
    renderMaterialOptions();
    const p = selectedPart();
    if (p) syncForm(p);
    refresh();
  };
  $('#matTable').addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-i]');
    const k = e.target.dataset.k;
    if (!tr || !k) return;
    const m = materials[Number(tr.dataset.i)];
    if (['density', 'price', 'mrr', 'wear'].includes(k)) {
      const v = Number(e.target.value);
      if (!Number.isFinite(v) || v < 0 || (k !== 'price' && k !== 'wear' && v === 0)) { e.target.value = m[k]; return; }
      m[k] = v;
    } else m[k] = e.target.value;
    if (k === 'group') openMatGroups.add(m.group); // keep the moved material visible
    if (k === 'group' || k === 'price') renderMaterials(); // moves section / updates the price range
    matChanged();
  });
  // animated open / close for the category dropdowns (native <details> just snaps)
  $('#matTable').addEventListener('click', (e) => {
    const sum = e.target.closest('.mat-group > summary');
    if (!sum || matchMedia('(prefers-reduced-motion: reduce)').matches) return; // let <details> toggle normally
    e.preventDefault();
    const det = sum.parentElement;
    const body = det.querySelector('.mg-body');
    if (det.dataset.animating) return;
    det.dataset.animating = '1';
    const done = () => { delete det.dataset.animating; body.style.height = ''; body.style.overflow = ''; };
    if (!det.open) {
      det.open = true;
      const h = body.scrollHeight;
      body.style.overflow = 'hidden';
      body.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }],
        { duration: Math.min(260 + h * 0.25, 520), easing: 'cubic-bezier(.2, .8, .2, 1)' }).finished.then(done, done);
      body.querySelectorAll('tbody tr').forEach((tr, i) => {
        tr.animate([{ opacity: 0, transform: 'translateY(-10px) scale(.98)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, delay: 60 + i * 45, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
      });
      sum.animate([{ transform: 'scale(.985)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
    } else {
      const h = body.offsetHeight;
      body.style.overflow = 'hidden';
      det.classList.add('mg-closing');
      body.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: Math.min(200 + h * 0.15, 380), easing: 'cubic-bezier(.4, 0, .2, 1)' }).finished
        .then(() => { det.open = false; det.classList.remove('mg-closing'); done(); }, done);
    }
  });
  // remember which category dropdowns are open (toggle does not bubble, so listen in capture phase)
  $('#matTable').addEventListener('toggle', (e) => {
    const g = e.target.dataset?.group;
    if (!g) return;
    if (e.target.open) openMatGroups.add(g); else openMatGroups.delete(g);
  }, true);
  $('#matTable').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    if (materials.length <= 1) return;
    const [removed] = materials.splice(Number(del.dataset.del), 1);
    parts.forEach((p) => { if (p.materialId === removed.id) p.materialId = materials[0].id; });
    renderMaterials(); matChanged();
  });
  $('#addMaterial').addEventListener('click', () => {
    materials.push({ id: 'custom' + Date.now(), name: L('วัสดุใหม่', 'New material'), group: 'steel', density: 7.85, price: 100, mrr: 4, wear: 1.5, color: '#8f98a3' });
    openMatGroups.add('steel');
    renderMaterials(); matChanged();
    const input = document.querySelector(`#matTable tr[data-i="${materials.length - 1}"] input[data-k="name"]`);
    input?.scrollIntoView({ block: 'center' });
    input?.select();
  });
  $('#resetMaterials').addEventListener('click', () => {
    materials = structuredClone(DEFAULT_MATERIALS);
    parts.forEach((p) => { if (!materials.some((m) => m.id === p.materialId)) p.materialId = materials[0].id; });
    renderMaterials(); matChanged();
  });

  $('#printBtn').addEventListener('click', () => window.print());}

/* ------------------------------------------------------------------ */
renderTolerances();
renderMaterialOptions();
syncCustomer();
renderParams();
renderMaterials();
renderSummary();
bind();

/* ------------------------------------------------------------------ *
 *  Shareable quote link — the quote settings and each part's measured geometry
 *  (volume, area, size) are packed into the URL (#q=…). The 3D model itself is not
 *  included; a box of the same size is shown until the original file is uploaded again.
 * ------------------------------------------------------------------ */
const b64urlEncode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlDecode = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
const r4 = (v) => Math.round(v * 1e4) / 1e4;

function buildShareUrl() {
  const data = {
    v: 1, c: customerType,
    p: parts.map((p) => ({
      n: p.name, e: p.ext, u: p.unitScale, m: p.materialId, h: p.harden, hn: p.hardenNote || '', t: p.tolId, q: p.qty,
      th: p.threads || 0, qc: p.qc ? 1 : 0,
      g: { v: r4(p.geo.volume), a: r4(p.geo.area), s: p.geo.size.map(r4), tr: p.geo.triangles, o: p.geo.openEdges || 0 },
    })),
  };
  const u = new URL(location.href);
  u.search = '';
  u.hash = `q=${b64urlEncode(JSON.stringify(data))}`;
  return u.toString();
}

async function copyShareLink() {
  const btn = $('#shareBtn');
  if (!parts.length) { setStatus(L('ยังไม่มีชิ้นงานในใบเสนอราคา', 'There are no parts in the quote yet'), true); return; }
  const url = buildShareUrl();
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch {
    const ta = document.createElement('textarea'); // fallback for older / in-app browsers
    ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  if (!ok) {
    // clipboard blocked (some in-app browsers): show the link ready to copy by hand
    setStatus(`${L('คัดลอกลิงก์นี้:', 'Copy this link:')} <input class="share-out" type="text" readonly value="${esc(url)}" />`);
    const inp = document.querySelector('.share-out');
    inp?.scrollIntoView({ block: 'center' });
    inp?.select();
    return;
  }
  const label = btn.textContent;
  btn.textContent = L('คัดลอกลิงก์แล้ว ✓', 'Link copied ✓');
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = label; btn.classList.remove('copied'); }, 2200);
}

function loadFromLink() {
  const m = location.hash.match(/^#q=([\w-]+)/);
  if (!m) return;
  let data;
  try { data = JSON.parse(b64urlDecode(m[1])); } catch { setStatus(L('ลิงก์ใบเสนอราคาไม่ถูกต้อง', 'This quote link is not valid'), true); return; }
  if (CUSTOMERS[data.c]) customerType = data.c;
  for (const s of data.p || []) {
    const size = (s.g?.s || [10, 10, 10]).map((v) => Math.max(Number(v) || 0, 0.001));
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]).translate(0, 0, size[2] / 2);
    parts.push({
      id: ++partSeq, name: String(s.n || 'part'), ext: String(s.e || 'stl').slice(0, 5), fromLink: true,
      positions: geometryToPositions(box), colors: null,
      geo: { volume: Number(s.g?.v) || 0, area: Number(s.g?.a) || 0, size, triangles: s.g?.tr || 0, openEdges: s.g?.o || 0 },
      unitScale: [1, 10, 25.4].includes(s.u) ? s.u : 1,
      materialId: materials.some((x) => x.id === s.m) ? s.m : materials[0].id,
      harden: s.h === 'yes' ? 'yes' : 'none', hardenNote: String(s.hn || '').slice(0, 300),
      tolId: TOLERANCES.some((t) => t.id === s.t) ? s.t : 'std',
      qty: Math.min(Math.max(Math.floor(s.q) || 1, 1), 100000), threads: Math.min(Math.max(Math.floor(s.th) || 0, 0), 999), qc: !!s.qc,
    });
  }
  if (parts.length) {
    selectPart(parts[0].id);
    setStatus(L('เปิดใบเสนอราคาจากลิงก์แล้ว — รูป 3D แสดงเป็นกล่องขนาดเท่าชิ้นงาน อัปโหลดไฟล์เดิมเพื่อดูรูปทรงจริง',
      'Quote opened from a link — the 3D view shows a box of the same size; upload the original file to see the real shape'));
  }
}
loadFromLink();

// language switch (i18n.js): re-render everything that app.js builds
window.addEventListener('langchange', () => {
  renderTolerances();
  renderMaterialOptions();
  renderParams();
  renderMaterials();
  const p = selectedPart();
  if (p) syncForm(p); else syncCustomer();
  refresh();
  if (!$('#status').classList.contains('error')) setStatus(''); // old message was in the other language
  if (updates.length) { $('#footVer').textContent = `(v${updates[0].version})`; renderUpdates(); }
});

// Phones and in-app browsers (Instagram, LINE, …) keep a saved copy of the page for a while.
// If a newer version is online, reload into it once — before the user has started a quote.
// Returns true when the page is being reloaded.
async function reloadIfNewVersion() {
  const cur = document.querySelector('meta[name="app-version"]')?.content;
  if (!cur || !/^https?:$/.test(location.protocol)) return false;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const { v } = await res.json();
    if (!v || v === cur || parts.length) return false;
    const key = 'cncq.reloadedFor';
    if (sessionStorage.getItem(key) === v) return false; // already tried once: avoid reload loops
    sessionStorage.setItem(key, v);
    const u = new URL(location.href);
    u.searchParams.set('v', v);
    location.replace(u.toString());
    return true;
  } catch { return false; /* offline or storage blocked: keep the current page */ }
}

/* ------------------------------------------------------------------ *
 *  "มีอะไรใหม่" announcement — shown once after every new version (updates.json, newest first)
 * ------------------------------------------------------------------ */
const SEEN_UPDATE_KEY = 'cncq.seenUpdate';
let updates = [];
const updDate = (d) => fmtDate(new Date(`${d}T00:00:00`));
// English text comes from title_en / items_en when present
const updTitle = (u) => L(u.title, u.title_en || u.title);
const updItems = (u) => (window.I18N?.lang === 'en' && u.items_en ? u.items_en : u.items);

let updatesShownAsNew = true;
function showUpdates(isNew) {
  const dlg = $('#updateDialog');
  if (!updates.length || typeof dlg.showModal !== 'function') return;
  updatesShownAsNew = isNew;
  renderUpdates();
  if (!dlg.open) dlg.showModal();
}

function renderUpdates() {
  if (!updates.length) return;
  const isNew = updatesShownAsNew;
  const [latest, ...older] = updates;
  $('#updBadge').textContent = isNew ? `${L('อัปเดตใหม่', 'New update')} · v${latest.version}` : `${L('เวอร์ชันปัจจุบัน', 'Current version')} · v${latest.version}`;
  $('#updTitle').textContent = updTitle(latest);
  $('#updDate').textContent = updDate(latest.date);
  $('#updList').innerHTML = updItems(latest).map((t) => `<li>${esc(t)}</li>`).join('');
  $('#updOlderWrap').hidden = !older.length;
  $('#updOlder').innerHTML = older.map((u) => `<section><h3>v${esc(u.version)} · ${esc(updTitle(u))}</h3><p class="muted">${updDate(u.date)}</p><ul>${updItems(u).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>`).join('');
}

async function loadUpdates() {
  try {
    const res = await fetch(`updates.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    updates = await res.json();
  } catch { return; }
  if (!updates.length) return;
  const latest = updates[0].version;
  $('#footVer').textContent = `(v${latest})`;
  let seen = null;
  try { seen = localStorage.getItem(SEEN_UPDATE_KEY); } catch { /* storage blocked */ }
  if (seen !== latest) showUpdates(true);
}

$('#updateDialog').addEventListener('close', () => {
  if (updates.length) { try { localStorage.setItem(SEEN_UPDATE_KEY, updates[0].version); } catch { /* storage blocked */ } }
});
$('#updateDialog').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }); // click outside
$('#whatsNewBtn').addEventListener('click', () => showUpdates(false));

(async () => {
  if (await reloadIfNewVersion()) return;
  await loadUpdates();
})();

// exposed for debugging / automated checks
window.cncQuote = { handleFiles, parts, quote, shop: () => shop, buildShareUrl };
