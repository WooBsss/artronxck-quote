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
const weight = (kg) => (kg < 1 ? `${num(kg * 1000, 1)} กรัม` : `${num(kg, 3)} กก.`);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ *
 *  Data: materials, finishes, tolerances, lead times, shop parameters
 * ------------------------------------------------------------------ */
const GROUPS = {
  aluminium: 'อะลูมิเนียม', steel: 'เหล็ก', stainless: 'สแตนเลส', copper: 'ทองเหลืองและทองแดง',
  titanium: 'ไทเทเนียม', plastic: 'พลาสติกวิศวกรรม',
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

// rate = ฿ per cm² of surface · min = minimum charge per batch · timeFactor = extra finishing passes
const FINISHES = [
  { id: 'asm', name: 'ผิวจากการกัด (Ra 3.2 µm)', rate: 0, min: 0, groups: 'all' },
  { id: 'smooth', name: 'ผิวกัดละเอียด (Ra 1.6 µm)', rate: 0, min: 0, timeFactor: 1.4, groups: 'all' },
  { id: 'bead', name: 'พ่นทราย (Bead blast)', rate: 0.06, min: 150, groups: ['aluminium', 'steel', 'stainless', 'copper', 'titanium'] },
  { id: 'anoClear', name: 'อโนไดซ์สีใส (Type II)', rate: 0.12, min: 300, groups: ['aluminium'] },
  { id: 'anoBlack', name: 'อโนไดซ์สีดำ (Type II)', rate: 0.15, min: 300, groups: ['aluminium'] },
  { id: 'hardAno', name: 'ฮาร์ดอโนไดซ์ (Type III)', rate: 0.30, min: 600, groups: ['aluminium'] },
  { id: 'zinc', name: 'ชุบซิงค์ (Zinc plating)', rate: 0.10, min: 300, groups: ['steel'] },
  { id: 'blackOx', name: 'รมดำ (Black oxide)', rate: 0.08, min: 250, groups: ['steel'] },
  { id: 'nickel', name: 'ชุบนิกเกิล (Electroless nickel)', rate: 0.25, min: 500, groups: ['aluminium', 'steel', 'copper'] },
  { id: 'passiv', name: 'พาสซิเวชัน (Passivation)', rate: 0.06, min: 250, groups: ['stainless'] },
  { id: 'powder', name: 'พ่นสีฝุ่น (Powder coat)', rate: 0.18, min: 400, groups: ['aluminium', 'steel', 'stainless'] },
  { id: 'polish', name: 'ขัดเงา (Mirror polish)', rate: 0.40, min: 300, groups: ['aluminium', 'stainless', 'copper', 'plastic'] },
];

const TOLERANCES = [
  { id: 'std', name: 'มาตรฐาน ±0.10 mm', f: 1 },
  { id: 'fine', name: 'ละเอียด ±0.05 mm', f: 1.3 },
  { id: 'prec', name: 'แม่นยำสูง ±0.02 mm', f: 1.75 },
  { id: 'ultra', name: 'แม่นยำพิเศษ ±0.01 mm', f: 2.4 },
];

const LEADS = [
  { id: 'eco', name: 'ประหยัด · 12–15 วันทำการ', f: 0.92 },
  { id: 'std', name: 'มาตรฐาน · 7–10 วันทำการ', f: 1 },
  { id: 'exp', name: 'ด่วน · 3–5 วันทำการ', f: 1.35 },
];

const PARAM_GROUPS = [
  { title: 'เครื่องจักร', icon: '⚙', params: [
    { key: 'machinePrice', label: 'ราคาเครื่องจักร', unit: '฿', def: 3500000, step: 10000 },
    { key: 'lifeYears', label: 'ระยะเวลาคิดค่าเสื่อมราคา', unit: 'ปี', def: 10, step: 1 },
    { key: 'hoursPerYear', label: 'ชั่วโมงทำงานต่อปี', unit: 'ชม.', def: 2400, step: 100 },
    { key: 'maintPct', label: 'ค่าบำรุงรักษาต่อปี', unit: '% ของราคา', def: 5, step: 0.5 },
  ] },
  { title: 'ไฟฟ้า', icon: 'ϟ', params: [
    { key: 'powerKw', label: 'กำลังไฟเครื่อง (สปินเดิล + แกน)', unit: 'kW', def: 15, step: 0.5 },
    { key: 'loadPct', label: 'โหลดเฉลี่ยขณะกัดงาน', unit: '%', def: 60, step: 5 },
    { key: 'auxKw', label: 'อุปกรณ์เสริม (ปั๊มลม น้ำหล่อเย็น ไฟส่องสว่าง)', unit: 'kW', def: 3, step: 0.5 },
    { key: 'elecRate', label: 'ค่าไฟฟ้าต่อหน่วย', unit: '฿/kWh', def: 4.18, step: 0.01 },
  ] },
  { title: 'ค่าแรงและการกัดงาน', icon: '⚒', params: [
    { key: 'laborRate', label: 'ค่าแรงช่างควบคุมเครื่อง', unit: '฿/ชม.', def: 150, step: 5 },
    { key: 'toolRate', label: 'ค่าสึกหรอทูล (ฐานอะลูมิเนียม)', unit: '฿/ชม.', def: 60, step: 5 },
    { key: 'finishRate', label: 'ความเร็วกัดเก็บผิว (อะลูมิเนียม)', unit: 'cm²/นาที', def: 25, step: 1 },
    { key: 'setupMin', label: 'เวลาตั้งเครื่องและจับยึดต่อล็อต', unit: 'นาที', def: 45, step: 5 },
    { key: 'progMin', label: 'เวลาเขียนโปรแกรม CAM ต่อแบบ', unit: 'นาที', def: 30, step: 5 },
    { key: 'handleMin', label: 'เวลาใส่ / ถอดชิ้นงานต่อชิ้น', unit: 'นาที', def: 2, step: 0.5 },
  ] },
  { title: 'ธุรกิจ', icon: '฿', params: [
    { key: 'stockMargin', label: 'ค่าเผื่อวัตถุดิบต่อด้าน', unit: 'mm', def: 3, step: 0.5 },
    { key: 'overheadPct', label: 'ค่าโสหุ้ย (ค่าเช่า งานธุรการ)', unit: '%', def: 15, step: 1 },
    { key: 'profitPct', label: 'กำไร', unit: '%', def: 25, step: 1 },
    { key: 'minOrder', label: 'มูลค่าสั่งซื้อขั้นต่ำ', unit: '฿', def: 500, step: 50 },
    { key: 'vat', label: 'คิดภาษีมูลค่าเพิ่ม (VAT 7%)', type: 'toggle', def: true },
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
let leadId = 'std';
const parts = [];
let selectedId = null;
let partSeq = 0;

const matById = (id) => materials.find((m) => m.id === id) || materials[0];
const finById = (id) => FINISHES.find((f) => f.id === id) || FINISHES[0];
const tolById = (id) => TOLERANCES.find((t) => t.id === id) || TOLERANCES[0];
const leadById = (id) => LEADS.find((l) => l.id === id) || LEADS[1];
const finishAllowed = (fin, mat) => fin.groups === 'all' || fin.groups.includes(mat.group);

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
      if (typeof window.occtimportjs !== 'function') throw new Error('โหลดตัวอ่านไฟล์ STEP ไม่สำเร็จ (กรุณาตรวจสอบอินเทอร์เน็ต)');
      return window.occtimportjs({ locateFile: (name) => OCCT_BASE + name });
    })();
    occtPromise.catch(() => { occtPromise = null; });
  }
  return occtPromise;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const buf = await file.arrayBuffer();
  if (ext === 'stl') {
    const g = new STLLoader().parse(buf);
    return geometryToPositions(g);
  }
  if (ext === '3mf') {
    const group = new ThreeMFLoader().parse(buf);
    group.position.set(0, 0, 0); group.rotation.set(0, 0, 0); group.scale.set(1, 1, 1);
    group.updateMatrixWorld(true);
    const arrays = [];
    group.traverse((o) => { if (o.isMesh) arrays.push(geometryToPositions(o.geometry, o.matrixWorld)); });
    if (!arrays.length) throw new Error('ไม่พบชิ้นงานในไฟล์ 3MF');
    return concat(arrays);
  }
  if (['step', 'stp', 'igs', 'iges'].includes(ext)) {
    const occt = await getOcct();
    const params = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.0008, angularDeflection: 0.3 };
    const data = new Uint8Array(buf);
    const res = ext === 'step' || ext === 'stp' ? occt.ReadStepFile(data, params) : occt.ReadIgesFile(data, params);
    if (!res || !res.success || !res.meshes.length) throw new Error('ไม่สามารถอ่านรูปทรงโซลิดจากไฟล์ CAD นี้ได้');
    const arrays = res.meshes.map((m) => {
      const p = m.attributes.position.array;
      const ix = m.index.array;
      const out = new Float32Array(ix.length * 3);
      for (let i = 0; i < ix.length; i++) {
        out[i * 3] = p[ix[i] * 3]; out[i * 3 + 1] = p[ix[i] * 3 + 1]; out[i * 3 + 2] = p[ix[i] * 3 + 2];
      }
      return out;
    });
    return concat(arrays);
  }
  throw new Error(`ไม่รองรับไฟล์ ".${ext}" กรุณาใช้ STEP, STL, 3MF หรือ IGES`);
}

async function handleFiles(fileList) {
  const files = [...fileList];
  for (const file of files) {
    if (file.size > 150 * 1024 * 1024) { setStatus(`${esc(file.name)}: ไฟล์ใหญ่เกิน 150 MB`, true); continue; }
    const isCad = /\.(step|stp|igs|iges)$/i.test(file.name);
    setStatus(`<span class="spinner"></span>กำลังอ่าน ${esc(file.name)}${isCad && !occtPromise ? ' (กำลังโหลดตัวอ่านไฟล์ STEP…)' : '…'}`);
    await sleep(30); // let the spinner paint before heavy work
    try {
      const pos = await parseFile(file);
      if (!pos.length) throw new Error('ไฟล์นี้ไม่มีข้อมูลรูปทรง');
      const geo = analyze(pos);
      if (geo.volume <= 0) throw new Error('คำนวณปริมาตรไม่ได้ — ชิ้นงานเป็นโซลิดปิดหรือไม่?');
      // center X/Y, put the part on Z = 0 for display
      const cx = (geo.min[0] + geo.max[0]) / 2, cy = (geo.min[1] + geo.max[1]) / 2, mz = geo.min[2];
      for (let i = 0; i < pos.length; i += 3) { pos[i] -= cx; pos[i + 1] -= cy; pos[i + 2] -= mz; }
      const ext = file.name.split('.').pop().toLowerCase();
      const part = {
        id: ++partSeq, name: file.name, ext, positions: pos, geo,
        unitScale: 1, materialId: materials[0].id, finishId: 'asm', tolId: 'std', qty: 1,
      };
      parts.push(part);
      selectPart(part.id);
      setStatus(`โหลด ${esc(file.name)} แล้ว · ${num(geo.triangles, 0)} สามเหลี่ยม`);
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
  const fin = finById(part.finishId);
  const tol = tolById(part.tolId);
  const lead = leadById(leadId);
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
  const finishMin = (areaCm2 / Math.max(finishSpeed, 0.01)) * (fin.timeFactor || 1);
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
  const finishBatch = fin.rate > 0 ? Math.max(fin.rate * areaCm2 * qty, fin.min) : 0;
  const finishing = finishBatch / qty;

  const direct = material + machine + electricity + labor + tooling + setup + finishing;
  const overhead = (direct * S.overheadPct) / 100;
  const profit = ((direct + overhead) * S.profitPct) / 100;
  const base = direct + overhead + profit;
  const leadAdj = base * (lead.f - 1);
  const unit = base + leadAdj;

  return {
    m, fin, tol, lead, qty, dims, volCm3, areaCm2, stockDims, stockKg, partKg, removedCm3,
    roughMin, finishMin, cutMin, cycleMin, machinePerHr, kWh,
    material, machine, electricity, labor, tooling, setup, setupBatch, finishing, finishBatch,
    overhead, profit, leadAdj, unit, line: unit * qty,
  };
}

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
  partMesh.material.color.set(q.m.color);
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
  $('#lead').value = leadId;
  $('#unit').disabled = /^(step|stp|igs|iges)$/.test(part.ext); // CAD files are converted to mm
  renderFinishOptions(part);
}

function renderMaterialOptions() {
  const sel = $('#material');
  sel.innerHTML = Object.entries(GROUPS).map(([g, label]) => {
    const opts = materials.filter((m) => m.group === g);
    if (!opts.length) return '';
    return `<optgroup label="${label}">${opts.map((m) => `<option value="${m.id}">${esc(m.name)} — ${baht(m.price)}/kg</option>`).join('')}</optgroup>`;
  }).join('');
}

function renderFinishOptions(part) {
  const m = matById(part.materialId);
  const allowed = FINISHES.filter((f) => finishAllowed(f, m));
  if (!allowed.some((f) => f.id === part.finishId)) part.finishId = 'asm';
  $('#finish').innerHTML = allowed.map((f) => `<option value="${f.id}">${esc(f.name)}${f.rate ? ` — ${baht(f.rate * 100)}/dm²` : ''}</option>`).join('');
  $('#finish').value = part.finishId;
}

function refresh(refit = false) {
  const part = selectedPart();
  renderPartsStrip();
  renderSummary();
  if (!part) { $('#workspace').hidden = true; return; }
  const q = quote(part);
  $('#partTitle').textContent = part.name;
  $('#qtyLabel').textContent = q.qty;
  $('#materialInfo').textContent = `ความหนาแน่น ${num(q.m.density)} g/cm³ · ${baht(q.m.price)} ต่อกิโลกรัม`;
  $('#unitPrice').textContent = baht(q.unit);
  $('#lineTotal').textContent = baht(q.line);

  const d = q.dims.map((v) => num(v, 1)).join(' × ');
  const sd = q.stockDims.map((v) => num(v, 1)).join(' × ');
  const stats = [
    ['ขนาด (X×Y×Z)', `${d} mm`],
    ['ปริมาตร', `${num(q.volCm3)} cm³`],
    ['พื้นที่ผิว', `${num(q.areaCm2)} cm²`],
    ['น้ำหนักชิ้นงาน', weight(q.partKg)],
    ['ขนาดวัตถุดิบ', `${sd} mm`],
    ['น้ำหนักวัตถุดิบ', weight(q.stockKg)],
    ['เวลาเครื่อง / ชิ้น', `${num(q.cycleMin, 1)} นาที`],
    ['พลังงาน / ชิ้น', `${num(q.kWh, 3)} kWh`],
  ];
  $('#stats').innerHTML = stats.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  const warn = $('#meshWarn');
  if (part.geo.openEdges) {
    warn.hidden = false;
    warn.textContent = `โมเดลไม่ปิดสนิท (มีขอบเปิด ${num(part.geo.openEdges, 0)} เส้น) ปริมาตรและน้ำหนักอาจคลาดเคลื่อน — แนะนำให้ส่งออกไฟล์เป็นโซลิดปิด`;
  } else if (Math.max(...q.dims) < 1 || Math.max(...q.dims) > 3000) {
    warn.hidden = false;
    warn.textContent = 'ขนาดชิ้นงานดูผิดปกติ — กรุณาตรวจสอบหน่วยของโมเดล (mm / cm / นิ้ว)';
  } else warn.hidden = true;

  const row = (label, sub, v) => `<tr><td>${label}${sub ? `<span class="muted">${sub}</span>` : ''}</td><td class="n">${baht(v)}</td></tr>`;
  const rows = [
    row('ค่าวัตถุดิบ', `วัตถุดิบ ${weight(q.stockKg)} × ${baht(q.m.price)}/กก.`, q.material),
    row('ค่าเครื่องจักร', `${num(q.cycleMin, 1)} นาที × ${baht(q.machinePerHr)}/ชม. (ค่าเสื่อม + บำรุงรักษา)`, q.machine),
    row('ค่าไฟฟ้า', `${num(q.kWh, 3)} kWh × ${baht(shop.elecRate)}/หน่วย`, q.electricity),
    row('ค่าแรงช่าง', `${num(q.cycleMin, 1)} นาที × ${baht(shop.laborRate)}/ชม.`, q.labor),
    row('ค่าสึกหรอทูล', `ตัวคูณการสึกหรอ ×${num(q.m.wear, 1)}`, q.tooling),
    row('ค่าตั้งเครื่องและเขียนโปรแกรม', `${baht(q.setupBatch)} ต่อล็อต ÷ ${q.qty} ชิ้น`, q.setup),
  ];
  if (q.finishing) rows.push(row(`ตกแต่งผิว: ${esc(q.fin.name)}`, `${baht(q.finishBatch)} ต่อล็อต ÷ ${q.qty} ชิ้น`, q.finishing));
  rows.push(row(`ค่าโสหุ้ย ${num(shop.overheadPct, 0)}%`, '', q.overhead));
  rows.push(row(`กำไร ${num(shop.profitPct, 0)}%`, '', q.profit));
  if (q.leadAdj) rows.push(row(`ระยะเวลาผลิต (${esc(q.lead.name.split(' ·')[0])})`, `×${num(q.lead.f)}`, q.leadAdj));
  rows.push(`<tr class="total"><td>ราคาต่อชิ้น (ไม่รวม VAT)</td><td class="n">${baht(q.unit)}</td></tr>`);
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
      <span class="sub">${esc(q.m.name)} · ${q.qty} ชิ้น · ${baht(q.line)}</span></span>
      <button class="remove" data-remove="${p.id}" title="ลบชิ้นงาน" aria-label="ลบ ${esc(p.name)}">×</button>
    </div>`;
  }).join('');
}

function orderTotals() {
  const lines = parts.map((p) => ({ p, q: quote(p) }));
  const sub = lines.reduce((a, l) => a + l.q.line, 0);
  const minAdj = parts.length && sub < shop.minOrder ? shop.minOrder - sub : 0;
  const net = sub + minAdj;
  const vat = shop.vat ? net * 0.07 : 0;
  return { lines, sub, minAdj, net, vat, grand: net + vat };
}

/* ------------------------------------------------------------------ *
 *  Quote number + a random machinist meme (just for fun)
 * ------------------------------------------------------------------ */
const QUOTE_NO = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `เลขที่ Q${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
})();

const MEMES = [
  { art: '🧐', top: 'ลูกค้า: ขอ tolerance ±0.001 mm', bottom: 'งบ: เท่าข้าวมันไก่ 1 จาน' },
  { art: '⏳', top: 'CAM บอกใช้เวลา 5 นาที', bottom: 'ความจริง: 3 ชั่วโมงครึ่ง' },
  { art: '💀', top: 'ดอกเอ็นมิล 3,000 บาท', bottom: 'หักตอนพาสสุดท้ายพอดี' },
  { art: '📱', top: 'ลูกค้า: งานไม่ด่วนครับ', bottom: '5 นาทีต่อมา: ได้ของยังครับ?' },
  { art: '🖼️', top: 'ลูกค้าส่งแบบมาเป็น .jpg', bottom: 'แล้วถามว่าทำไมยังไม่ได้ราคา' },
  { art: '🛑', top: 'กด Cycle Start ครั้งแรก', bottom: 'อีกมือวางบน E-Stop ตลอด' },
  { art: '⚡', top: 'ค่าไฟเดือนนี้', bottom: 'แพงกว่าค่าวัตถุดิบอีก' },
  { art: '🔧', top: 'ผม: วัดสองครั้ง ตัดครั้งเดียว', bottom: 'เครื่อง: ชนครั้งเดียว ซ่อมสองอาทิตย์' },
  { art: '🌀', top: 'กัดอะลูมิเนียมวันเดียว', bottom: 'เศษเต็มห้อง ยกเว้นในถังขยะ' },
  { art: '😅', top: 'ใบเสนอราคาคำนวณด้วยคอมพิวเตอร์', bottom: 'แต่กำไรยังต้องลุ้นเหมือนเดิม' },
  { art: '🙏', top: 'ตั้งศูนย์ชิ้นงานเสร็จ', bottom: 'ไหว้เครื่องก่อนกดรัน 1 ที' },
  { art: '📏', top: 'เวอร์เนียร์บอก 10.00', bottom: 'ไมโครมิเตอร์บอก 9.98 · เชื่อใครดี?' },
];
let memeIdx = -1;
function showRandomMeme() {
  let i;
  do { i = Math.floor(Math.random() * MEMES.length); } while (MEMES.length > 1 && i === memeIdx);
  memeIdx = i;
  const m = MEMES[i];
  $('#memeTop').textContent = m.top;
  $('#memeBottom').textContent = m.bottom;
  const art = $('#memeArt');
  art.textContent = m.art;
  art.classList.remove('pop'); void art.offsetWidth; art.classList.add('pop');
}

function renderSummary() {
  const t = orderTotals();
  const now = new Date();
  $('#quoteNo').textContent = QUOTE_NO;
  $('#quoteMeta').textContent = `วันที่เสนอราคา ${now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} · ระยะเวลาผลิต: ${leadById(leadId).name} · สกุลเงิน: บาท (฿)`;
  if (!t.lines.length) {
    $('#summaryTable').innerHTML = '<tbody><tr><td class="empty">อัปโหลดชิ้นงานเพื่อเริ่มทำใบเสนอราคา</td></tr></tbody>';
    return;
  }
  const body = t.lines.map(({ p, q }, i) => `<tr>
      <td>${i + 1}</td>
      <td>${esc(p.name)}</td>
      <td>${esc(q.m.name)}<br><span class="muted">${esc(q.fin.name)} · ${esc(q.tol.name)}</span></td>
      <td class="n">${weight(q.partKg)}</td>
      <td class="n">${q.qty}</td>
      <td class="n">${baht(q.unit)}</td>
      <td class="n">${baht(q.line)}</td>
    </tr>`).join('');
  const foot = [
    `<tr><td colspan="6">รวมเป็นเงิน</td><td class="n">${baht(t.sub)}</td></tr>`,
    t.minAdj ? `<tr><td colspan="6">ปรับยอดขั้นต่ำการสั่งซื้อ (ขั้นต่ำ ${baht(shop.minOrder)})</td><td class="n">${baht(t.minAdj)}</td></tr>` : '',
    shop.vat ? `<tr><td colspan="6">ภาษีมูลค่าเพิ่ม 7%</td><td class="n">${baht(t.vat)}</td></tr>` : '',
    `<tr class="grand"><td colspan="6">ยอดรวมทั้งสิ้น ${shop.vat ? '(รวม VAT)' : '(ไม่รวม VAT)'}</td><td class="n">${baht(t.grand)}</td></tr>`,
  ].join('');
  $('#summaryTable').innerHTML = `<thead><tr><th>#</th><th>ชิ้นงาน</th><th>วัสดุ / ตัวเลือก</th><th class="n">น้ำหนัก</th><th class="n">จำนวน</th><th class="n">ราคาต่อชิ้น</th><th class="n">จำนวนเงิน</th></tr></thead><tbody>${body}</tbody><tfoot>${foot}</tfoot>`;
}

function renderParams() {
  $('#paramGroups').innerHTML = PARAM_GROUPS.map((g) => `<div class="param-group"><h4><i>${g.icon}</i>${g.title}</h4>${g.params.map((p) => p.type === 'toggle'
    ? `<label class="param toggle"><input type="checkbox" data-param="${p.key}" ${shop[p.key] ? 'checked' : ''}/> ${p.label}</label>`
    : `<div class="param"><label for="p-${p.key}">${p.label}</label><div class="in"><input type="number" id="p-${p.key}" data-param="${p.key}" value="${shop[p.key]}" step="${p.step}" min="0"/><span>${p.unit}</span></div></div>`).join('')}</div>`).join('');
  renderRates();
}

function renderRates() {
  const dep = shop.machinePrice / Math.max(shop.lifeYears * shop.hoursPerYear, 1);
  const maint = (shop.machinePrice * shop.maintPct) / 100 / Math.max(shop.hoursPerYear, 1);
  const elec = (shop.powerKw * shop.loadPct / 100 + shop.auxKw) * shop.elecRate;
  const total = dep + maint + elec + shop.laborRate + shop.toolRate;
  $('#rateStrip').innerHTML = [
    ['ค่าเสื่อมราคา', dep], ['บำรุงรักษา', maint], ['ค่าไฟฟ้า', elec], ['ค่าแรงช่าง', shop.laborRate], ['ค่าทูล', shop.toolRate],
  ].map(([k, v]) => `<span class="rate">${k} <b>${baht(v)}/ชม.</b></span>`).join('') + `<span class="rate"><strong>ต้นทุนเครื่องต่อชั่วโมง (อะลูมิเนียม ก่อนโสหุ้ยและกำไร)</strong> <b>${baht(total)}/ชม.</b></span>`;
}

function renderMaterials() {
  const groupOpts = (sel) => Object.entries(GROUPS).map(([g, l]) => `<option value="${g}" ${g === sel ? 'selected' : ''}>${l}</option>`).join('');
  $('#matTable').innerHTML = `<thead><tr><th></th><th>วัสดุ</th><th>กลุ่ม</th><th>ความหนาแน่น (g/cm³)</th><th>ราคา (฿/กก.)</th><th>อัตรากัดเนื้อ (cm³/นาที)</th><th>ตัวคูณสึกหรอทูล</th><th></th></tr></thead><tbody>${materials.map((m, i) => `<tr data-i="${i}">
    <td><input type="color" data-k="color" value="${m.color}" aria-label="สี" style="width:32px;height:28px;padding:0;border:0;background:none"/></td>
    <td><input type="text" data-k="name" value="${esc(m.name)}"/></td>
    <td><select data-k="group">${groupOpts(m.group)}</select></td>
    <td class="num"><input type="number" data-k="density" value="${m.density}" step="0.01" min="0.1"/></td>
    <td class="num"><input type="number" data-k="price" value="${m.price}" step="1" min="0"/></td>
    <td class="num"><input type="number" data-k="mrr" value="${m.mrr}" step="0.1" min="0.1"/></td>
    <td class="num"><input type="number" data-k="wear" value="${m.wear}" step="0.1" min="0"/></td>
    <td><button class="del" data-del="${i}" title="ลบวัสดุ" aria-label="ลบ ${esc(m.name)}">🗑</button></td>
  </tr>`).join('')}</tbody>`;
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
  $('#fileInput').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
  $('#sampleBtn').addEventListener('click', () => handleFiles([sampleFile()]));

  const onPart = (fn) => (e) => { const p = selectedPart(); if (p) { fn(p, e); refresh(); } };
  $('#material').addEventListener('change', onPart((p, e) => { p.materialId = e.target.value; renderFinishOptions(p); }));
  $('#unit').addEventListener('change', onPart((p, e) => { p.unitScale = Number(e.target.value); showPartIn3D(p, true); }));
  $('#finish').addEventListener('change', onPart((p, e) => { p.finishId = e.target.value; }));
  $('#tolerance').addEventListener('change', onPart((p, e) => { p.tolId = e.target.value; }));
  $('#lead').addEventListener('change', (e) => { leadId = e.target.value; refresh(); });
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
    matChanged();
  });
  $('#matTable').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    if (materials.length <= 1) return;
    const [removed] = materials.splice(Number(del.dataset.del), 1);
    parts.forEach((p) => { if (p.materialId === removed.id) p.materialId = materials[0].id; });
    renderMaterials(); matChanged();
  });
  $('#addMaterial').addEventListener('click', () => {
    materials.push({ id: 'custom' + Date.now(), name: 'วัสดุใหม่', group: 'steel', density: 7.85, price: 100, mrr: 4, wear: 1.5, color: '#8f98a3' });
    renderMaterials(); matChanged();
    const inputs = document.querySelectorAll('#matTable input[data-k="name"]');
    inputs[inputs.length - 1]?.focus();
  });
  $('#resetMaterials').addEventListener('click', () => {
    materials = structuredClone(DEFAULT_MATERIALS);
    parts.forEach((p) => { if (!materials.some((m) => m.id === p.materialId)) p.materialId = materials[0].id; });
    renderMaterials(); matChanged();
  });

  $('#printBtn').addEventListener('click', () => window.print());
  $('#memeBtn').addEventListener('click', showRandomMeme);
}

/* ------------------------------------------------------------------ */
$('#tolerance').innerHTML = TOLERANCES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
$('#lead').innerHTML = LEADS.map((l) => `<option value="${l.id}">${l.name}${l.f !== 1 ? ` (×${l.f})` : ''}</option>`).join('');
renderMaterialOptions();
renderParams();
renderMaterials();
renderSummary();
showRandomMeme();
bind();

// exposed for debugging / automated checks
window.cncQuote = { handleFiles, parts, quote, shop: () => shop };
