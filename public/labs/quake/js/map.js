// 川西地形底图（程序生成的示意地形：西北高原、东南盆地、中间龙门山）+ 坐标换算
// 坐标单位 km，以映秀为原点，x 向东、y 向北
export const REGION = { x0: -420, x1: 520, y0: -380, y1: 420 };
export const CITIES = [
  { n: '映秀', p: [0, 0], epi: true },
  { n: '都江堰', p: [12, -7] }, { n: '汶川', p: [9, 47] }, { n: '茂县', p: [34, 69] },
  { n: '成都', p: [55, -44], big: true }, { n: '德阳', p: [86, 8] }, { n: '绵阳', p: [113, 45], big: true },
  { n: '北川', p: [92, 85] }, { n: '江油', p: [120, 80] }, { n: '雅安', p: [-47, -120] }, { n: '广元', p: [224, 152] },
];

function hash(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= .5; } return s; }
function ridged(x, y) { let s = 0, a = .6, f = 1; for (let i = 0; i < 4; i++) { s += a * (1 - Math.abs(noise(x * f, y * f) * 2 - 1)) ** 2; f *= 2.1; a *= .5; } return s; }
const sig = x => 1 / (1 + Math.exp(-x));
export function elev(x, y) {
  const s = (-x + y) * Math.SQRT1_2;                 // 指向西北的坐标
  const along = (x + y) * Math.SQRT1_2;
  const plateau = sig((s - 8) / 22);
  // 山脊沿北东向拉长，尺度放大、层次减少，避免碎纹
  const rx = along / 90, ry = s / 34;
  const r = ridged(rx + 10, ry + 3), f = fbm(x / 70 + 5, y / 70 + 9, 4);
  return .45 + .12 * f + plateau * (2.4 + 1.9 * r + .7 * f) + sig((s - 4) / 6) * (1 - plateau) * .5 * r;
}

let cache = null;
export function terrain() {
  if (cache) return cache;
  const k = 1, w = (REGION.x1 - REGION.x0) * k, h = (REGION.y1 - REGION.y0) * k;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), E = new Float32Array((w + 1) * (h + 1));
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) E[j * (w + 1) + i] = elev(REGION.x0 + i / k, REGION.y1 - j / k);
  const stops = [[0, [30, 50, 44]], [.8, [38, 60, 48]], [1.6, [62, 68, 54]], [2.8, [86, 80, 66]], [4, [112, 106, 98]], [5.2, [176, 178, 184]]];
  const ramp = e => { for (let i = 1; i < stops.length; i++) if (e <= stops[i][0]) { const [e0, c0] = stops[i - 1], [e1, c1] = stops[i], t = (e - e0) / (e1 - e0); return c0.map((v, n) => v + (c1[n] - v) * t); } return stops[stops.length - 1][1]; };
  const L = [-.55, .55, .63];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const e = E[j * (w + 1) + i], dx = (E[j * (w + 1) + i + 1] - e) * 3.4, dy = (E[(j + 1) * (w + 1) + i] - e) * 3.4;
    const n = [-dx, dy, 1], len = Math.hypot(...n), sh = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len);
    const col = ramp(e), m = .5 + .62 * sh, o = (j * w + i) * 4;
    img.data[o] = col[0] * m; img.data[o + 1] = col[1] * m; img.data[o + 2] = col[2] * m; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  cache = c; return c;
}

// 视图：把区域放进舞台可用区域
export function makeView(area, region = REGION, pad = 10) {
  const w = region.x1 - region.x0, h = region.y1 - region.y0;
  const s = Math.min((area.r - area.l - pad * 2) / w, (area.b - area.t - pad * 2) / h); // 关注区域完整放进可用区域
  const cx = (area.l + area.r) / 2, cy = (area.t + area.b) / 2, mx = (region.x0 + region.x1) / 2, my = (region.y0 + region.y1) / 2;
  return {
    s, toS: p => [cx + (p[0] - mx) * s, cy - (p[1] - my) * s], toW: (x, y) => [mx + (x - cx) / s, my - (y - cy) / s],
    km: d => d * s,
  };
}
export function drawMap(ctx, view, W, H, dim = 0) {
  const t = terrain(), a = view.toS([REGION.x0, REGION.y1]), b = view.toS([REGION.x1, REGION.y0]);
  ctx.fillStyle = '#0a111d'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(t, a[0], a[1], b[0] - a[0], b[1] - a[1]);
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
  g.addColorStop(0, `rgba(10,17,29,${dim})`); g.addColorStop(1, `rgba(10,17,29,${.55 + dim * .4})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
export function drawCities(ctx, view, opt = {}) {
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const c of CITIES) {
    if (c.epi && !opt.showEpiCity) continue;
    const [x, y] = view.toS(c.p); ctx.beginPath(); ctx.arc(x, y, c.big ? 4.5 : 3.2, 0, 7); ctx.fillStyle = '#e9eef6'; ctx.fill();
    ctx.font = `${c.big ? 600 : 500} ${c.big ? 16 : 14}px -apple-system,"PingFang SC",sans-serif`; ctx.fillStyle = 'rgba(233,238,246,.92)';
    ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4; ctx.fillText(c.n, x + 8, y); ctx.shadowBlur = 0;
  }
}
export function drawScale(ctx, view, x, y) {
  const L = view.km(50); ctx.strokeStyle = 'rgba(233,238,246,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 1); ctx.moveTo(x + L, y - 5); ctx.lineTo(x + L, y + 1); ctx.stroke();
  ctx.font = '600 13px -apple-system,sans-serif'; ctx.fillStyle = 'rgba(233,238,246,.8)'; ctx.textAlign = 'center'; ctx.fillText('50 km', x + L / 2, y - 12);
}
export function ring(ctx, x, y, r, color, w = 3, a = 1, glow = 14) {
  if (r <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.shadowColor = color; ctx.shadowBlur = glow;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
export function star(ctx, x, y, r, fill = '#ff5d4d') {
  ctx.save(); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
  ctx.shadowColor = fill; ctx.shadowBlur = 16; ctx.fillStyle = fill; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}
// 烈度配色
export const ICOL = ['', '#3b6b8f', '#3d7f95', '#3f9393', '#49a37f', '#7ab35b', '#b8bf45', '#e2b13c', '#f08c34', '#ee6330', '#e03b2f', '#c1203a', '#93113f'];
