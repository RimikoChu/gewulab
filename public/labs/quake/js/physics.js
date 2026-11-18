// 计算核心：画面、读数、波形、小测配图都调用这里，保证处处一致
export const VP = 6.0, VS = 3.5;                 // 地壳平均纵、横波速度 km/s
export const K = VP * VS / (VP - VS);            // 时差换距离 ≈ 8.4 km/s
export const hypo = (d, h) => Math.hypot(d, h);
export const tP = (d, h) => hypo(d, h) / VP;
export const tS = (d, h) => hypo(d, h) / VS;
export const energy = M => Math.pow(10, 4.8 + 1.5 * M);         // 焦耳
export const depthType = h => (h < 70 ? '浅源' : h <= 300 ? '中源' : '深源');
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const roman = i => ROMAN[Math.max(1, Math.min(12, Math.round(i)))];
export function sci(x) { const e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); return `${m.toFixed(1)}×10${sup(e)}`; }
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const sup = n => String(n).split('').map(c => SUP[+c] ?? c).join('');

// 破裂带：龙门山断裂方向（北东 45°），大地震的破裂向东北延伸
const DIR = [Math.SQRT1_2, Math.SQRT1_2];
export function rupture(M, epi = [0, 0]) {
  const L = Math.max(1, Math.pow(10, 0.59 * M - 2.44));
  return [[epi[0] - DIR[0] * L * .15, epi[1] - DIR[1] * L * .15], [epi[0] + DIR[0] * L * .85, epi[1] + DIR[1] * L * .85]];
}
function distSeg(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t);
}
// 烈度衰减（示意经验式，按汶川等震线粗略标定）
export function intensity(M, h, p, epi = [0, 0]) {
  const [a, b] = rupture(M, epi), R = Math.hypot(distSeg(p, a, b), h);
  return Math.max(1, Math.min(12, 8 + 1.5 * M - 6.5 * Math.log10(R + 10)));
}

// 地震预警
export function warning({ city, epi = [0, 0], h, stations, proc }) {
  let ds = Infinity; for (const s of stations) ds = Math.min(ds, Math.hypot(s[0] - epi[0], s[1] - epi[1]));
  const tAlert = tP(ds, h) + proc;
  const dc = Math.hypot(city[0] - epi[0], city[1] - epi[1]);
  const tSc = tS(dc, h);
  const rS = VS * tAlert;
  return { ds, tAlert, dc, tSc, tPc: tP(dc, h), lead: tSc - tAlert, blind: rS > h ? Math.sqrt(rS * rS - h * h) : 0 };
}

// 合成一条近震记录（确定性的伪随机，便于重现）
export function seismogram(d, h, seed = 1, dur = 60, n = 1200) {
  let s = seed * 9973 + 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - .5;
  const p = tP(d, h), q = tS(d, h), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n * dur; let v = rnd() * .04;
    if (t > p) { const u = t - p; v += Math.sin(u * 2 * Math.PI * 6) * .32 * Math.exp(-u * .9) + rnd() * .1 * Math.exp(-u * .5); }
    if (t > q) { const u = t - q; v += Math.sin(u * 2 * Math.PI * 2.6) * 1.0 * Math.exp(-u * .32) + rnd() * .22 * Math.exp(-u * .25); }
    out[i] = v;
  }
  return { data: out, dur, p, q };
}

// 简化的标准地球模型（参照 PREM 取整）
export const R_E = 6371, MOHO = 6336, D660 = 5711, CMB = 3480, ICB = 1221;
const lerp = (a, b, t) => a + (b - a) * t;
export function vel(r) {
  if (r >= MOHO) { const t = (R_E - r) / (R_E - MOHO); return { vp: lerp(5.8, 6.5, t), vs: lerp(3.4, 3.75, t), layer: '地壳' }; }
  if (r >= D660) { const t = (MOHO - r) / (MOHO - D660); return { vp: lerp(8.0, 10.3, t), vs: lerp(4.45, 5.6, t), layer: '上地幔' }; }
  if (r >= CMB) { const t = (D660 - r) / (D660 - CMB); return { vp: lerp(10.75, 13.7, t), vs: lerp(5.95, 7.25, t), layer: '下地幔' }; }
  if (r >= ICB) { const t = (CMB - r) / (CMB - ICB); return { vp: lerp(8.0, 10.36, t), vs: 0, layer: '外核' }; }
  const t = (ICB - r) / ICB; return { vp: lerp(11.03, 11.26, t), vs: lerp(3.5, 3.67, t), layer: '内核' };
}
const layerIdx = r => (r >= MOHO ? 0 : r >= D660 ? 1 : r >= CMB ? 2 : r >= ICB ? 3 : 4);

// 球对称射线追踪：射线参数 p = r·sin i / v 守恒
export function traceRay(i0deg, wave, depth = 20, ds = 8) {
  const v = r => (wave === 'P' ? vel(r).vp : vel(r).vs);
  let r = R_E - depth, phi = 0, dir = -1, t = 0;
  const p = r * Math.sin(i0deg * Math.PI / 180) / v(r);
  const pts = [[r, phi, 0]];
  for (let k = 0; k < 6000; k++) {
    const vr = v(r); if (vr <= 0) return { pts, end: 'stop' };
    let si = p * vr / r; if (si >= 1) { si = 1; if (dir < 0) dir = 1; }
    const ci = Math.sqrt(Math.max(0, 1 - si * si));
    let nr = r + dir * Math.max(ci, .02) * ds;
    if (dir < 0 && nr <= 0) { phi += Math.PI; nr = -nr; dir = 1; }
    if (layerIdx(nr) !== layerIdx(r)) {
      const v2 = v(nr + dir * .5);
      if (v2 <= 0) { pts.push([dir < 0 ? Math.max(nr, CMB) : nr, phi, t]); return { pts, end: 'stop' }; }
      if (p * v2 / nr > 1) { dir = -dir; nr = r; }
    }
    phi += si * ds / r; t += ds / vr; r = nr;
    if (r >= R_E) { pts.push([R_E, phi, t]); return { pts, end: 'surface', phi, t }; }
    pts.push([r, phi, t]);
  }
  return { pts, end: 'lost' };
}

// 单自由度受迫振动：放大倍数
export const natPeriod = N => Math.max(.08, .1 * N);
export function amplify(Tn, Tg, zeta = .05) { const r = Tn / Tg; return 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2); }
export const softSoil = Tg => 1 + 1.4 / (1 + Math.exp(-(Tg - 1.1) * 4));
