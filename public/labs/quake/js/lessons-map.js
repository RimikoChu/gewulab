import { ui, el } from './engine.js';
import * as P from './physics.js';
import { REGION, CITIES, terrain, makeView, drawMap, drawCities, drawScale, ring, star, ICOL } from './map.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const font = (w, s) => `${w} ${s}px -apple-system,"PingFang SC",sans-serif`;
function house(ctx, x, y, s = 1, dx = 0, dy = 0, color = '#e9eef6') {
  ctx.save(); ctx.translate(x + dx, y + dy); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(0, -8); ctx.lineTo(9, 2); ctx.lineTo(9, 10); ctx.lineTo(-9, 10); ctx.closePath();
  ctx.fillStyle = color; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#0a111d'; ctx.fillRect(-2.5, 4, 5, 6); ctx.restore();
}
function pill(ctx, x, y, text, bg, fg = '#fff', size = 15) {
  ctx.font = font(700, size); const w = ctx.measureText(text).width + 16, h = size + 12;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 8); ctx.fill(); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
}
// 烈度场贴图（1 km 一个像素，按整数烈度分色）
function intensityImage(M, h, epi = [0, 0]) {
  const w = REGION.x1 - REGION.x0, hh = REGION.y1 - REGION.y0, c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d'), img = g.createImageData(w, hh);
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
    const I = Math.floor(P.intensity(M, h, [REGION.x0 + i + .5, REGION.y1 - j - .5], epi)), o = (j * w + i) * 4;
    if (I < 4) continue; const col = ICOL[I]; img.data[o] = parseInt(col.slice(1, 3), 16); img.data[o + 1] = parseInt(col.slice(3, 5), 16); img.data[o + 2] = parseInt(col.slice(5, 7), 16); img.data[o + 3] = 120 + (I - 4) * 12;
  }
  g.putImageData(img, 0, 0); return c;
}
function drawImageRegion(ctx, view, img) { const a = view.toS([REGION.x0, REGION.y1]), b = view.toS([REGION.x1, REGION.y0]); ctx.drawImage(img, a[0], a[1], b[0] - a[0], b[1] - a[1]); }

/* =================== 第 1 课 一次地震的身份证 =================== */
export const L1 = {
  key: 'id', no: 1, short: '身份证', title: '一次地震的身份证',
  concept: '震级只有<em>一个</em><br>烈度<em>处处不同</em>',
  tasks: [
    { id: 'wc', text: '重演汶川地震' },
    { id: 'diff', text: '两个观察点烈度差 3 度' },
    { id: 'deep', text: '来一次深源地震' },
    { id: 'e', text: '比较 7 级和 8 级' },
  ],
  FOCUS: { x0: -95, x1: 165, y0: -140, y1: 125 },
  mount(api) {
    Object.assign(this, { api, M: 6.5, h: 20, fired: null, ft: 0, obs: [], img: null, history: [] });
    const p = api.panel;
    const pre = el('button', 'chip', '一键重演：汶川 2008'); pre.style.cssText = 'height:40px;justify-content:center;background:rgba(255,122,61,.18);color:#ffb08a';
    pre.onclick = () => { this.M = 8.0; this.h = 14; this.sM.set(8); this.sH.set(14); this.fire(); };
    this.sM = ui.slider({ label: '震级', min: 4.5, max: 8.5, step: .1, value: this.M, fmt: v => 'M ' + v.toFixed(1), onInput: v => { this.M = v; this.upd(); } });
    this.sH = ui.slider({ label: '震源深度', min: 5, max: 650, step: 1, value: this.h, unit: ' km', onInput: v => { this.h = v; this.upd(); } });
    this.R = ui.readouts([{ key: 'type', label: '类型' }, { key: 'I0', label: '震中烈度' }, { key: 'E', label: '释放能量', unit: ' 焦耳', wide: true }, { key: 'cmp', label: '和上一次相比', wide: true }]);
    p.append(pre, this.sM, this.sH, this.R);
    api.setDock([{ id: 'fire', label: '发生地震', primary: true }, { id: 'clear', label: '清除观察点' }]);
    this.hint = api.tag('点地图放观察点', 'pill'); this.upd();
  },
  upd() {
    const { R } = this; R.set('type', P.depthType(this.h)); R.set('I0', P.roman(P.intensity(this.M, this.h, [0, 0])), ICOL[Math.floor(P.intensity(this.M, this.h, [0, 0]))]);
    R.set('E', P.sci(P.energy(this.M)));
  },
  fire() {
    const api = this.api; this.fired = { M: this.M, h: this.h }; this.ft = 0; this.img = intensityImage(this.M, this.h); this.upd();
    const prev = this.history[this.history.length - 1]; this.history.push(this.M);
    if (prev != null) { const r = P.energy(this.M) / P.energy(prev); this.R.set('cmp', r >= 1 ? `${fmtX(r)} 倍` : `1/${fmtX(1 / r)}`, r >= 1 ? '#ffc147' : '#47c6ff'); }
    if (this.M >= 7.9 && Math.abs(this.h - 14) <= 3) api.done('wc');
    if (this.h > 300) api.done('deep');
    const h = this.history; if (h.some(m => Math.abs(m - 7) < .05) && h.some(m => Math.abs(m - 8) < .05)) api.done('e');
    this.checkObs();
  },
  checkObs() {
    if (!this.fired) return; const I = this.obs.map(o => Math.floor(P.intensity(this.fired.M, this.fired.h, o)));
    if (I.length >= 2 && Math.max(...I) - Math.min(...I) >= 3) this.api.done('diff');
  },
  onDock(id) { if (id === 'fire') this.fire(); if (id === 'clear') { this.obs = []; } },
  resize() { this.view = makeView(this.api.area, this.FOCUS); },
  pointer(type, x, y) {
    if (type !== 'down') return; const w = this.view.toW(x, y);
    if (w[0] < REGION.x0 || w[0] > REGION.x1 || w[1] < REGION.y0 || w[1] > REGION.y1) return;
    if (this.obs.length >= 4) this.obs.shift(); this.obs.push(w); this.checkObs();
  },
  tick(dt) {
    const { api, view } = this, ctx = api.ctx; if (!view) return; if (this.fired) this.ft += dt;
    drawMap(ctx, view, api.W, api.H);
    const [ex, ey] = view.toS([0, 0]), st = this.ft * 9; // 模拟时间：9 倍速
    if (this.fired) {
      const rS = Math.sqrt(Math.max(0, (P.VS * st) ** 2 - this.fired.h ** 2)), rP = Math.sqrt(Math.max(0, (P.VP * st) ** 2 - this.fired.h ** 2));
      ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, view.km(rS), 0, 7); ctx.clip(); drawImageRegion(ctx, view, this.img); ctx.restore();
      const [a, b] = P.rupture(this.fired.M).map(view.toS); ctx.save(); ctx.strokeStyle = '#ff5d4d'; ctx.lineWidth = 3; ctx.shadowColor = '#ff5d4d'; ctx.shadowBlur = 12; ctx.setLineDash([10, 6]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.restore();
      if (rP < 600) ring(ctx, ex, ey, view.km(rP), '#47c6ff', 2, Math.max(0, 1 - rP / 600));
      if (rS < 600) ring(ctx, ex, ey, view.km(rS), '#ff5d4d', 3.5, Math.max(0, 1 - rS / 600));
      if (this.ft < 1.2) { ctx.save(); ctx.globalAlpha = 1 - this.ft / 1.2; const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 40 + this.fired.M * 8); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, 'rgba(255,93,77,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 40 + this.fired.M * 8, 0, 7); ctx.fill(); ctx.restore(); }
    }
    drawCities(ctx, view);
    star(ctx, ex, ey, 13); ctx.font = font(700, 15); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('震中', ex + 16, ey - 12);
    // 观察点
    this.obs.forEach((o, i) => {
      const [x, y] = view.toS(o), d = Math.hypot(...o);
      let sh = 0, I = null;
      if (this.fired) { I = P.intensity(this.fired.M, this.fired.h, o); const ts = P.tS(d, this.fired.h), u = st - ts; if (u > 0) sh = Math.sin(u * 10) * Math.exp(-u * .12) * (I - 3) * .9; }
      house(ctx, x, y, 1.1, sh, 0, I && Math.floor(I) >= 9 && st > P.tS(d, this.fired.h) ? '#ffb4a8' : '#e9eef6');
      if (I && st > P.tS(d, this.fired.h)) pill(ctx, x, y - 26, P.roman(I) + ' 度', ICOL[Math.floor(I)], '#fff', 16);
      ctx.font = font(600, 13); ctx.fillStyle = 'rgba(233,238,246,.85)'; ctx.textAlign = 'center'; ctx.fillText(Math.round(d) + ' km', x, y + 24);
    });
    this.hint.style.display = this.obs.length ? 'none' : ''; const a = api.area; api.place(this.hint, (a.l + a.r) / 2, a.t + 24);
    this.inset(ctx); drawScale(ctx, view, api.area.r - 110, api.area.b - 16);
  },
  // 左下角：竖直剖面，看震源和震中
  inset(ctx) {
    const a = this.api.area, w = 230, h = 150, x = a.l + 12, y = a.b - h - 10, hD = this.fired ? this.fired.h : this.h;
    ctx.save(); ctx.fillStyle = 'rgba(13,21,35,.85)'; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    const gy = y + 34, maxD = 700, py = gy + (h - 50) * Math.sqrt(hD / maxD);
    const g = ctx.createLinearGradient(0, gy, 0, y + h); g.addColorStop(0, '#5a4636'); g.addColorStop(1, '#2a1c16'); ctx.fillStyle = g; ctx.fillRect(x + 10, gy, w - 20, y + h - gy - 10);
    ctx.fillStyle = '#7fae6a'; ctx.fillRect(x + 10, gy - 3, w - 20, 3);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + w / 2, gy); ctx.lineTo(x + w / 2, py); ctx.stroke(); ctx.setLineDash([]);
    star(ctx, x + w / 2, gy - 1, 7); ctx.beginPath(); ctx.arc(x + w / 2, py, 6, 0, 7); ctx.fillStyle = '#ffc147'; ctx.shadowColor = '#ffc147'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = font(600, 13); ctx.fillStyle = '#e9eef6'; ctx.textAlign = 'left'; ctx.fillText('震中', x + w / 2 + 12, gy - 12); ctx.fillText('震源', x + w / 2 + 12, py + 4);
    ctx.font = font(700, 18); ctx.fillStyle = '#ffc147'; ctx.textAlign = 'right'; ctx.fillText(hD + ' km', x + w / 2 - 12, (gy + py) / 2 + 6);
    ctx.font = font(600, 13); ctx.fillStyle = '#aab4c6'; ctx.textAlign = 'left'; ctx.fillText('剖面', x + 12, y + 18);
    ctx.restore();
  },
  unmount() {},
};
const fmtX = r => r >= 100 ? Math.round(r).toLocaleString() : r >= 10 ? r.toFixed(0) : r.toFixed(1);

/* =================== 第 3 课 地震预警 =================== */
const STATIONS = []; for (let y = -150; y <= 170; y += 34) for (let x = -160; x <= 245; x += 38) STATIONS.push([x + ((Math.round(y / 34) % 2) ? 19 : 0) + 6, y + 4]);
export const L3 = {
  key: 'warn', no: 3, short: '预警', title: '地震预警',
  concept: '<em>纵波</em>先到报信<br><em>横波</em>后到才破坏',
  tasks: [
    { id: 'got', text: '让城市收到预警' },
    { id: 'l20', text: '提前 20 秒以上' },
    { id: 'edge', text: '找到盲区的边界' },
    { id: 'p4', text: '处理只用 4 秒' },
    { id: 'deep', text: '深源时盲区会怎样' },
  ],
  FOCUS: { x0: -90, x1: 185, y0: -140, y1: 130 },
  mount(api) {
    Object.assign(this, { api, h: 14, proc: 8, city: [55, -44], run: false, st: 0, drag: false, alerted: false });
    this.sH = ui.slider({ label: '震源深度', min: 5, max: 150, step: 1, value: this.h, unit: ' km', onInput: v => { this.h = v; this.reset(); } });
    this.sP = ui.slider({ label: '系统处理用时', min: 3, max: 12, step: .5, value: this.proc, unit: ' 秒', onInput: v => { this.proc = v; this.reset(); } });
    this.R = ui.readouts([{ key: 'lead', label: '能提前', unit: ' 秒', wide: true, big: true }, { key: 'd', label: '离震中', unit: ' km' }, { key: 'blind', label: '盲区半径', unit: ' km' }]);
    api.panel.append(this.R, this.sH, this.sP);
    this.phone = el('div', 'phone lesson-extra', '<div class="h">你的手机</div><div class="n">—</div><div class="s">拖动地图上的房子</div>'); document.body.append(this.phone);
    api.setDock([{ id: 'fire', label: '发生地震', primary: true }, { id: 'reset', label: '重来' }]);
    this.reset();
  },
  calc() { return P.warning({ city: this.city, h: this.h, stations: STATIONS, proc: this.proc }); },
  reset() { this.run = false; this.st = 0; this.alerted = false; this.upd(); this.setPhone('wait'); },
  upd() {
    const w = this.calc(); this.R.set('d', Math.round(w.dc)); this.R.set('blind', Math.round(w.blind));
    this.R.set('lead', w.lead > 0 ? w.lead.toFixed(1) : '来不及', w.lead > 0 ? (w.lead >= 20 ? '#3ddc97' : '#ffc147') : '#ff5d4d');
  },
  setPhone(mode, n) {
    const ph = this.phone; ph.className = 'phone lesson-extra ' + (mode === 'alert' ? 'alert' : mode === 'hit' ? 'hit' : mode === 'miss' ? 'miss' : '');
    const [N, S] = ph.querySelectorAll('.n,.s');
    if (mode === 'wait') { N.textContent = '—'; S.textContent = '拖动地图上的房子'; }
    if (mode === 'alert') { N.textContent = Math.ceil(n); S.textContent = '秒后横波到达'; }
    if (mode === 'hit') { N.textContent = '震'; S.textContent = n ? `提前了 ${n} 秒` : '横波到达'; }
    if (mode === 'miss') { N.textContent = '震'; S.textContent = '在盲区，来不及预警'; }
  },
  onDock(id) {
    if (id === 'reset') return this.reset();
    if (id === 'fire') {
      this.reset(); this.run = true; const w = this.calc();
      if (w.lead > 0) this.api.done('got');
      if (w.lead >= 20) this.api.done('l20');
      if (Math.abs(w.lead) < 1.5) this.api.done('edge');
      if (this.proc <= 4) this.api.done('p4');
      if (this.h >= 90 && w.blind === 0) { this.api.done('deep'); this.api.toast('震源够深时，盲区消失了'); }
    }
  },
  resize() { this.view = makeView(this.api.area, this.FOCUS); },
  pointer(type, x, y) {
    const v = this.view; if (!v) return; const [cx, cy] = v.toS(this.city);
    if (type === 'down') { this.drag = true; this.city = v.toW(x, y); this.reset(); }
    if (type === 'move' && this.drag) { this.city = v.toW(x, y); this.reset(); }
    if (type === 'up') this.drag = false;
  },
  tick(dt) {
    const { api, view } = this, ctx = api.ctx; if (!view) return; drawMap(ctx, view, api.W, api.H);
    const w = this.calc(), [ex, ey] = view.toS([0, 0]);
    if (this.run) this.st += dt * 4;     // 4 倍速
    const st = this.st;
    // 盲区
    ctx.save(); ctx.fillStyle = 'rgba(255,93,77,.16)'; ctx.strokeStyle = 'rgba(255,93,77,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, ey, view.km(w.blind), 0, 7); ctx.fill(); if (w.blind > 0) ctx.stroke(); ctx.restore();
    if (w.blind > 0) pill(ctx, ex, ey + view.km(w.blind) - 14, '盲区', 'rgba(255,93,77,.85)', '#fff', 14);
    // 台站
    STATIONS.forEach(s => {
      const [x, y] = view.toS(s); if (x < -10 || y < -10 || x > api.W + 10 || y > api.H + 10) return;
      const hit = this.run && st >= P.tP(Math.hypot(...s), this.h);
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5.5, y + 4); ctx.lineTo(x - 5.5, y + 4); ctx.closePath();
      ctx.fillStyle = hit ? '#47c6ff' : 'rgba(233,238,246,.35)'; if (hit) { ctx.shadowColor = '#47c6ff'; ctx.shadowBlur = 10; } ctx.fill(); ctx.shadowBlur = 0;
    });
    if (this.run) {
      const rP = Math.sqrt(Math.max(0, (P.VP * st) ** 2 - this.h ** 2)), rS = Math.sqrt(Math.max(0, (P.VS * st) ** 2 - this.h ** 2));
      ring(ctx, ex, ey, view.km(rP), '#47c6ff', 2.5, 1); ring(ctx, ex, ey, view.km(rS), '#ff5d4d', 5, 1, 18);
      // 处理进度
      const t0 = P.tP(w.ds, this.h);
      if (st > t0 && st < w.tAlert) { const f = (st - t0) / this.proc; ctx.save(); ctx.strokeStyle = '#ffc147'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ex, ey, 26, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke(); ctx.restore(); pill(ctx, ex, ey - 46, '计算中…', 'rgba(255,193,71,.9)', '#1b1300', 14); }
      // 警报信号：电信号几乎瞬间铺满
      if (st >= w.tAlert) { const u = (st - w.tAlert) / 4; if (u < 1.2) ring(ctx, ex, ey, u * Math.max(api.W, api.H), '#ffc147', 3, Math.max(0, 1 - u), 22); }
      // 手机
      const tS = w.tSc;
      if (st >= tS) this.setPhone(w.lead > 0 ? 'hit' : 'miss', w.lead > 0 ? w.lead.toFixed(1) : 0);
      else if (st >= w.tAlert) this.setPhone('alert', tS - st);
      if (st > tS + 25) this.run = false;
    }
    drawCities(ctx, view);
    star(ctx, ex, ey, 12);
    // 你的城市
    const [cx, cy] = view.toS(this.city), shake = this.run && st > w.tSc ? Math.sin(st * 12) * 4 * Math.exp(-(st - w.tSc) * .15) : 0;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fillStyle = 'rgba(255,193,71,.18)'; ctx.fill(); ctx.strokeStyle = '#ffc147'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    house(ctx, cx, cy - 2, 1.3, shake, 0, '#ffc147');
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
    drawScale(ctx, view, api.area.r - 110, api.area.b - 16);
    this.upd();
  },
  unmount() { this.phone?.remove(); },
};

/* =================== 第 4 课 找到震中 =================== */
const HD = 10, DUR = 70;
export const L4 = {
  key: 'loc', no: 4, short: '找震中', title: '找到震中',
  concept: '时间差 × <em>8.4 km/s</em><br>= 到震源的距离',
  tasks: [
    { id: 'read', text: '读出三个时间差' },
    { id: 'two', text: '只有两台时会怎样' },
    { id: 'hit', text: '误差小于 20 km' },
    { id: 'line', text: '三台排成直线试试' },
  ],
  FOCUS: { x0: -90, x1: 185, y0: -140, y1: 130 },
  mount(api) {
    Object.assign(this, { api, st: [], rec: false, mode: 'P', guess: null, drag: null, seed: 1 });
    this.newQuake();
    this.modeSeg = ui.seg([['P', '标纵波 P'], ['S', '标横波 S']], 'P', v => this.mode = v);
    this.tbl = el('div', 'read'); api.panel.append(this.modeSeg, this.tbl);
    this.drum = el('div', 'drum lesson-extra'); document.body.append(this.drum);
    api.setDock([{ id: 'rec', label: '记录地震', primary: true, disabled: true }, { id: 'new', label: '换一次地震' }, { id: 'clr', label: '重新布台' }]);
    this.hint = api.tag('', 'pill'); this.render();
  },
  newQuake() { this.seed++; const r = (s => () => ((s = s * 16807 % 2147483647) / 2147483647))(this.seed * 7 + 3); this.epi = [-10 + r() * 140, -70 + r() * 160]; this.guess = null; },
  stage() { return !this.st.length ? '在地图上点三下，布设台站' : this.st.length < 3 && !this.rec ? `再布 ${3 - this.st.length} 个台站` : !this.rec ? '按「记录地震」' : this.circles().length < this.st.length ? '在波形上点出纵波和横波的起跳' : this.st.length >= 3 && !this.guess ? '在三圆交点处点一下' : ''; },
  circles() { return this.st.filter(s => s.mp != null && s.ms != null && s.ms > s.mp).map(s => ({ c: s.p, r: (s.ms - s.mp) * P.K, s })); },
  onDock(id) {
    if (id === 'rec') {
      this.rec = true; this.st.forEach((s, i) => { s.sg = P.seismogram(Math.hypot(s.p[0] - this.epi[0], s.p[1] - this.epi[1]), HD, this.seed * 10 + i, DUR, 900); s.mp = s.ms = null; });
      if (this.st.length >= 3 && this.collinear()) { this.api.done('line'); this.api.toast('三台几乎在一条直线上：会得到两个对称的交点'); }
    }
    if (id === 'new') { this.newQuake(); this.st.forEach(s => { s.sg = null; s.mp = s.ms = null; }); this.rec = false; }
    if (id === 'clr') { this.st = []; this.rec = false; this.guess = null; }
    this.render();
  },
  collinear() { const [a, b, c] = this.st.map(s => s.p); const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2, L = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - a[0], c[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1])); return area / (L * L) < .05; },
  render() {
    this.api.dockState('rec', { disabled: this.st.length < 2 });
    const cs = this.circles();
    this.tbl.innerHTML = ['A', 'B', 'C'].map((n, i) => { const s = this.st[i], dt = s && s.mp != null && s.ms != null ? s.ms - s.mp : null;
      return `<div class="r"><div class="k">台站 ${n} 时间差</div><div class="v">${dt != null ? dt.toFixed(1) : '—'}<small>秒</small></div></div><div class="r"><div class="k">距离</div><div class="v">${dt != null ? Math.round(dt * P.K) : '—'}<small>km</small></div></div>`; }).join('') +
      (this.guess ? `<div class="r wide"><div class="k">误差</div><div class="v" style="color:${this.err < 20 ? '#3ddc97' : '#ffc147'}">${this.err.toFixed(0)}<small>km</small></div></div>` : '');
    // 记录鼓
    if (!this.rec) { this.drum.style.display = 'none'; return; }
    this.drum.style.display = '';
    this.drum.innerHTML = this.st.map((s, i) => `<div class="row"><b>${'ABC'[i]}</b><canvas data-i="${i}" height="52"></canvas></div>`).join('');
    this.drum.querySelectorAll('canvas').forEach(cv => {
      const i = +cv.dataset.i, s = this.st[i];
      const toT = e => { const r = cv.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width * DUR, 0, DUR); };
      cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); const t = toT(e); const near = k => s[k] != null && Math.abs(s[k] - t) < 1.2; this.dragKey = near('mp') ? 'mp' : near('ms') ? 'ms' : (this.mode === 'P' ? 'mp' : 'ms'); s[this.dragKey] = t; this.afterMark(); this.paintDrum(); };
      cv.onpointermove = e => { if (this.dragKey && e.buttons) { s[this.dragKey] = toT(e); this.afterMark(); this.paintDrum(); } };
      cv.onpointerup = () => { this.dragKey = null; this.render(); };
    });
    this.paintDrum();
  },
  afterMark() {
    const cs = this.circles(); if (cs.length === 2) this.api.done('two');
    if (this.st.length >= 3 && cs.length >= 3) this.api.done('read');
    this.renderTbl?.();
  },
  paintDrum() {
    this.drum.querySelectorAll('canvas').forEach(cv => {
      const s = this.st[+cv.dataset.i], dpr = Math.min(devicePixelRatio, 2), w = cv.clientWidth, h = 52; if (!w || !s.sg) return;
      cv.width = w * dpr; cv.height = h * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = 'rgba(255,255,255,.03)'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; for (let t = 0; t <= DUR; t += 5) { const x = t / DUR * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.4)'; c.font = font(500, 10); for (let t = 10; t < DUR; t += 10) c.fillText(t + 's', t / DUR * w + 3, h - 4);
      c.beginPath(); const d = s.sg.data; for (let k = 0; k < d.length; k++) { const x = k / d.length * w, y = h / 2 - d[k] * h * .42; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.strokeStyle = '#e9eef6'; c.lineWidth = 1.2; c.stroke();
      for (const [k, col, lab] of [['mp', '#47c6ff', 'P'], ['ms', '#ff5d4d', 'S']]) if (s[k] != null) { const x = s[k] / DUR * w; c.fillStyle = col; c.fillRect(x - 1, 0, 2.5, h); c.font = font(700, 13); c.fillText(lab, x + 4, 14); }
      if (s.mp != null && s.ms != null && s.ms > s.mp) { const a = s.mp / DUR * w, b = s.ms / DUR * w; c.fillStyle = 'rgba(255,193,71,.16)'; c.fillRect(a, 0, b - a, h); c.fillStyle = '#ffc147'; c.font = font(700, 14); c.textAlign = 'center'; c.fillText((s.ms - s.mp).toFixed(1) + ' 秒', (a + b) / 2, h / 2 + 22); c.textAlign = 'left'; }
    });
    // 表格同步
    const cs = this.circles(); this.tbl.querySelectorAll('.r').forEach(() => {}); this.renderTblOnly();
  },
  renderTblOnly() {
    const keep = this.tbl.innerHTML; this.tbl.innerHTML = ['A', 'B', 'C'].map((n, i) => { const s = this.st[i], dt = s && s.mp != null && s.ms != null && s.ms > s.mp ? s.ms - s.mp : null;
      return `<div class="r"><div class="k">${n} 时间差</div><div class="v">${dt != null ? dt.toFixed(1) : '—'}<small>秒</small></div></div><div class="r"><div class="k">${n} 距离</div><div class="v">${dt != null ? Math.round(dt * P.K) : '—'}<small>km</small></div></div>`; }).join('') +
      (this.guess ? `<div class="r wide"><div class="k">误差</div><div class="v" style="color:${this.err < 20 ? '#3ddc97' : '#ffc147'}">${this.err.toFixed(0)}<small>km</small></div></div>` : '');
  },
  resize() { const a = this.api.area; this.view = makeView({ ...a, b: a.b - 200 }, this.FOCUS); this.rec && this.paintDrum(); },
  pointer(type, x, y) {
    if (type !== 'down') return; const w = this.view.toW(x, y);
    const cs = this.circles();
    if (this.rec && cs.length >= 3) { this.guess = w; this.err = Math.hypot(w[0] - this.epi[0], w[1] - this.epi[1]); if (this.err < 20) this.api.done('hit'); else this.api.toast('差了 ' + Math.round(this.err) + ' km，可以拖动波形上的标记再试'); this.renderTblOnly(); return; }
    if (this.rec) return;
    if (this.st.length >= 3) this.st.shift(); this.st.push({ p: w }); this.render();
  },
  intersections(c1, c2) {
    const [x1, y1] = c1.c, [x2, y2] = c2.c, d = Math.hypot(x2 - x1, y2 - y1); if (d > c1.r + c2.r || d < Math.abs(c1.r - c2.r) || d === 0) return [];
    const a = (c1.r ** 2 - c2.r ** 2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, c1.r ** 2 - a * a)), mx = x1 + a * (x2 - x1) / d, my = y1 + a * (y2 - y1) / d;
    return [[mx + h * (y2 - y1) / d, my - h * (x2 - x1) / d], [mx - h * (y2 - y1) / d, my + h * (x2 - x1) / d]];
  },
  tick(dt, t) {
    const { api, view } = this, ctx = api.ctx; if (!view) return; drawMap(ctx, view, api.W, api.H); drawCities(ctx, view);
    const cs = this.circles(), cols = ['#47c6ff', '#ffc147', '#3ddc97'];
    cs.forEach((c) => { const i = this.st.indexOf(c.s), [x, y] = view.toS(c.c); ctx.save(); ctx.fillStyle = cols[i] + '14'; ctx.beginPath(); ctx.arc(x, y, view.km(c.r), 0, 7); ctx.fill(); ctx.restore(); ring(ctx, x, y, view.km(c.r), cols[i], 2.5, .95, 10); });
    if (cs.length === 2) this.intersections(cs[0], cs[1]).forEach(p => { const [x, y] = view.toS(p); ctx.save(); ctx.globalAlpha = .5 + .5 * Math.sin(t * 6); ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); pill(ctx, x, y - 22, '是这里？', 'rgba(13,21,35,.9)', '#fff', 13); });
    this.st.forEach((s, i) => {
      const [x, y] = view.toS(s.p); ctx.save(); ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 11, y + 8); ctx.lineTo(x - 11, y + 8); ctx.closePath(); ctx.fillStyle = cols[i]; ctx.shadowColor = cols[i]; ctx.shadowBlur = 12; ctx.fill(); ctx.restore();
      ctx.font = font(800, 13); ctx.fillStyle = '#0a111d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABC'[i], x, y + 2);
    });
    if (this.guess) {
      const [gx, gy] = view.toS(this.guess), [ex, ey] = view.toS(this.epi);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(gx, gy, 8, 0, 7); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx - 12, gy); ctx.lineTo(gx + 12, gy); ctx.moveTo(gx, gy - 12); ctx.lineTo(gx, gy + 12); ctx.stroke();
      star(ctx, ex, ey, 13); pill(ctx, ex, ey - 28, '真实震中', 'rgba(255,93,77,.9)', '#fff', 14);
    } else if (this.rec) { const [ex, ey] = view.toS(this.epi); }
    const msg = this.stage(); this.hint.textContent = msg; this.hint.style.display = msg ? '' : 'none'; const a = api.area; api.place(this.hint, (a.l + a.r) / 2, a.t + 24);
    drawScale(ctx, view, api.area.r - 110, api.area.b - 210);
  },
  unmount() { this.drum?.remove(); },
};
