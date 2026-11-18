import { ui, el } from './engine.js';
import * as P from './physics.js';
import { ring, star } from './map.js';

const font = (w, s) => `${w} ${s}px -apple-system,"PingFang SC",sans-serif`;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pulse = (tau, T) => tau < -T ? 0 : Math.sin(2 * Math.PI * tau / T) * Math.exp(-((tau / T) ** 2) * 1.2);

/* =================== 第 2 课 先颠后晃 =================== */
export const L2 = {
  key: 'pw', no: 2, short: '先颠后晃', title: '先颠后晃',
  concept: '纵波<em>快</em>，上下颠<br>横波<em>慢</em>，左右晃',
  tasks: [
    { id: 'feel', text: '看清先颠还是先晃' },
    { id: 'ponly', text: '只放纵波看振动方向' },
    { id: 'water', text: '让横波穿过地下水层' },
    { id: 'd100', text: '在 100 km 处读时间差' },
  ],
  mount(api) {
    Object.assign(this, { api, d: 60, mode: 'both', water: false, speed: 2, run: false, st: 0, rec: [] });
    this.sD = ui.slider({ label: '楼到震中的距离', min: 20, max: 200, step: 1, value: this.d, unit: ' km', onInput: v => { this.d = v; this.reset(); } });
    const segM = ui.seg([['both', '两种波'], ['P', '只看纵波'], ['S', '只看横波']], 'both', v => { this.mode = v; this.reset(); });
    const segW = ui.seg([[false, '岩石'], [true, '有地下水层']], false, v => { this.water = v; this.reset(); });
    const segS = ui.seg([[2, '正常'], [.5, '慢放']], 2, v => this.speed = v);
    this.R = ui.readouts([{ key: 'p', label: '纵波到达', unit: ' 秒' }, { key: 's', label: '横波到达', unit: ' 秒' }, { key: 'dt', label: '时间差', unit: ' 秒', wide: true, big: true }]);
    api.panel.append(this.R, this.sD, segM, segW, segS);
    api.setDock([{ id: 'go', label: '发生地震', primary: true }, { id: 'reset', label: '重来' }]);
    this.reset();
  },
  reset() {
    this.run = false; this.st = 0; this.rec = [];
    const p = P.tP(this.d, 15), s = P.tS(this.d, 15);
    this.R.set('p', p.toFixed(1)); this.R.set('s', s.toFixed(1)); this.R.set('dt', (s - p).toFixed(1), '#ffc147');
  },
  onDock(id) { if (id === 'reset') this.reset(); if (id === 'go') { this.reset(); this.run = true; } },
  resize() {},
  sBlocked(x, depth) { return this.water && x > this.d - 30 && x < this.d + 30 && depth < 10; },
  // 某点在 st 时刻的位移（世界坐标方向，单位任意）
  disp(x, depth, st) {
    const fx = 0, fz = 15, rx = x - fx, rz = depth - fz, r = Math.hypot(rx, rz) || 1, ux = rx / r, uz = rz / r;
    let dx = 0, dz = 0;
    if (this.mode !== 'S') { const a = pulse(st - r / P.VP, 1.6) * 1.0; dx += ux * a; dz += uz * a; }
    if (this.mode !== 'P' && !this.sBlocked(x, depth)) { const a = pulse(st - r / P.VS, 2.2) * 1.6; dx += -uz * a; dz += ux * a; }
    return [dx, dz];
  },
  tick(dt) {
    const { api } = this, ctx = api.ctx, a = api.area, W = api.W, H = api.H;
    if (this.run) this.st += dt * this.speed;
    const st = this.st, tp = P.tP(this.d, 15), ts = P.tS(this.d, 15);
    // 布局：上半天空与地面，下半地下剖面，底部记录鼓
    const L = a.l + 10, R = a.r - 10, top = a.t + 20, ground = top + (a.b - a.t) * .3, bottom = a.b - 150;
    const X = x => L + (x + 15) / 230 * (R - L), Z = z => ground + z / 60 * (bottom - ground);
    // 背景
    let g = ctx.createLinearGradient(0, 0, 0, ground); g.addColorStop(0, '#0b1424'); g.addColorStop(1, '#16253a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, ground);
    g = ctx.createLinearGradient(0, ground, 0, bottom); g.addColorStop(0, '#4a3a2c'); g.addColorStop(1, '#22180f'); ctx.fillStyle = g; ctx.fillRect(0, ground, W, bottom - ground);
    ctx.fillStyle = '#0a111d'; ctx.fillRect(0, bottom, W, H - bottom);
    // 地层线
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; for (let z = 10; z < 60; z += 10) { ctx.beginPath(); ctx.moveTo(0, Z(z)); ctx.lineTo(W, Z(z)); ctx.stroke(); }
    // 地下水层
    if (this.water) { ctx.fillStyle = 'rgba(71,198,255,.28)'; ctx.fillRect(X(this.d - 30), Z(.5), X(this.d + 30) - X(this.d - 30), Z(10) - Z(.5)); ctx.font = font(700, 15); ctx.fillStyle = '#9fdfff'; ctx.textAlign = 'center'; ctx.fillText('地下水层', X(this.d), Z(5.5)); }
    // 波前
    if (this.run) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, ground, W, bottom - ground); ctx.clip();
      const sx = (R - L) / 230, sz = (bottom - ground) / 60;
      const arc = (rad, col, w) => { ctx.save(); ctx.translate(X(0), Z(15)); ctx.scale(sx, sz); ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.restore(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0; };
      if (this.mode !== 'S') arc(P.VP * st, '#47c6ff', 2.5);
      if (this.mode !== 'P') arc(P.VS * st, '#ff5d4d', 4);
      ctx.restore();
    }
    // 粒子
    for (let x = -10; x <= 210; x += 7) for (let z = 3; z <= 57; z += 6) {
      if (Math.hypot(x, z - 15) < 4) continue;
      const [dx, dz] = this.run ? this.disp(x, z, st) : [0, 0], m = Math.hypot(dx, dz);
      ctx.beginPath(); ctx.arc(X(x) + dx * 9, Z(z) + dz * 9, 3, 0, 7);
      ctx.fillStyle = m > .15 ? (this.mode === 'P' || (this.mode === 'both' && st - Math.hypot(x, z - 15) / P.VS < -1) ? '#9fe3ff' : '#ffb0a6') : 'rgba(233,238,246,.45)'; ctx.fill();
    }
    // 震源
    ctx.beginPath(); ctx.arc(X(0), Z(15), 9, 0, 7); ctx.fillStyle = '#ffc147'; ctx.shadowColor = '#ffc147'; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = font(700, 15); ctx.fillStyle = '#ffc147'; ctx.textAlign = 'left'; ctx.fillText('震源', X(0) + 14, Z(15) + 5);
    star(ctx, X(0), ground, 9); ctx.fillStyle = '#fff'; ctx.fillText('震中', X(0) + 14, ground - 10);
    // 地面
    ctx.fillStyle = '#7fae6a'; ctx.fillRect(0, ground - 3, W, 4);
    // 楼：纵波上下颠，横波左右晃
    const [bx, bz] = this.run ? this.disp(this.d, .2, st) : [0, 0];
    const vy = (this.mode !== 'S' ? pulse(st - tp, 1.6) : 0), hx = (this.mode !== 'P' && !this.sBlocked(this.d, .2) ? pulse(st - ts, 2.2) * 1.6 : 0);
    const by = this.run ? -vy * 7 : 0, sway = this.run ? hx * 12 : 0;
    const x0 = X(this.d), bw = 46, bh = 120;
    ctx.save(); ctx.translate(x0, ground - 2 + by);
    ctx.beginPath(); ctx.moveTo(-bw / 2, 0); ctx.lineTo(bw / 2, 0); ctx.lineTo(bw / 2 + sway, -bh); ctx.lineTo(-bw / 2 + sway, -bh); ctx.closePath();
    g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, '#c9d2e0'); g.addColorStop(1, '#8e9ab0'); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#1b2a42'; for (let f = 0; f < 5; f++) for (let c = 0; c < 3; c++) { const yy = -18 - f * 22, k = -yy / bh; ctx.fillRect(-bw / 2 + 7 + c * 12 + sway * k, yy, 8, 11); }
    ctx.restore();
    // 状态标签
    const state = !this.run ? '' : st < tp ? '' : (st < ts || hx === 0) && Math.abs(vy) > .05 ? '上下颠' : Math.abs(hx) > .1 ? '左右晃' : '';
    if (state) { ctx.font = font(800, 26); ctx.textAlign = 'center'; ctx.fillStyle = state === '上下颠' ? '#47c6ff' : '#ff5d4d'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(state, x0, ground - bh - 26); ctx.shadowBlur = 0; }
    ctx.font = font(700, 16); ctx.fillStyle = 'rgba(233,238,246,.9)'; ctx.textAlign = 'left'; ctx.fillText('离震中 ' + this.d + ' km', x0 + 34, ground - 12);
    // 记录鼓
    if (this.run) this.rec.push([st, vy, hx]);
    this.drum(ctx, L, bottom + 14, R - L, 120, tp, ts);
    // 任务
    if (this.run) {
      if (this.mode === 'both' && st > ts + 1 && !this.water) this.api.done('feel');
      if (this.mode === 'P' && st > tp + 1) this.api.done('ponly');
      if (this.water && this.mode !== 'P' && st > ts + 1) { if (!this._w) { this._w = 1; this.api.toast('横波穿不过液体，楼只被纵波颠了一下'); } this.api.done('water'); }
      if (Math.abs(this.d - 100) <= 5 && this.mode === 'both' && st > ts + 1) this.api.done('d100');
      if (st > ts + 14) this.run = false;
    }
  },
  drum(ctx, x, y, w, h, tp, ts) {
    ctx.save(); ctx.fillStyle = 'rgba(13,21,35,.85)'; ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    const T = 60, X = t => x + 56 + t / T * (w - 70), rows = [['竖直', 1, '#47c6ff', y + h * .32], ['水平', 2, '#ff5d4d', y + h * .72]];
    ctx.font = font(600, 13); ctx.textAlign = 'left';
    rows.forEach(([n, k, c, cy]) => {
      ctx.fillStyle = '#aab4c6'; ctx.fillText(n, x + 14, cy + 4);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(X(0), cy); ctx.lineTo(X(T), cy); ctx.stroke();
      ctx.beginPath(); this.rec.forEach(([t, a, b], i) => { const yy = cy - (k === 1 ? a : b * .7) * h * .16; i ? ctx.lineTo(X(t), yy) : ctx.moveTo(X(t), yy); }); ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.stroke();
    });
    if (this.st > ts) { ctx.fillStyle = 'rgba(255,193,71,.14)'; ctx.fillRect(X(tp), y + 6, X(ts) - X(tp), h - 12); ctx.fillStyle = '#ffc147'; ctx.font = font(700, 14); ctx.textAlign = 'center'; ctx.fillText('时间差 ' + (ts - tp).toFixed(1) + ' 秒', (X(tp) + X(ts)) / 2, y + 18); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = font(500, 11); ctx.textAlign = 'center'; for (let t = 10; t < T; t += 10) ctx.fillText(t + 's', X(t), y + h - 6);
    ctx.restore();
  },
  unmount() {},
};

/* =================== 第 5 课 看穿地球 =================== */
export const L5 = {
  key: 'earth', no: 5, short: '看穿地球', title: '看穿地球',
  concept: '横波到 <em>2900 km</em> 消失<br>外核是<em>液体</em>',
  tasks: [
    { id: 'stop', text: '看横波在哪里停下' },
    { id: 'moho', text: '找到莫霍面' },
    { id: 'cmb', text: '找到古登堡面' },
    { id: 'shadow', text: '点一个影区里的台站' },
  ],
  mount(api) {
    Object.assign(this, { api, st: 0, run: false, depth: 1500, zoom: false, picked: null });
    if (!L5.rays) {
      const angs = []; for (let i = .3; i < 34; i += .5) angs.push(i); for (let i = 34; i < 90; i += 2) angs.push(i);
      L5.rays = { P: [], S: [] }; L5.arr = { P: [], S: [] };
      for (const w of ['P', 'S']) for (const i of angs) { const r = P.traceRay(i, w, 20, 10); L5.rays[w].push(r); if (r.end === 'surface') { let d = r.phi * 180 / Math.PI % 360; if (d > 180) d = 360 - d; L5.arr[w].push([d, r.t]); } }
    }
    this.R = ui.readouts([{ key: 'layer', label: '这里是', wide: true }, { key: 'vp', label: '纵波速度', unit: ' km/s' }, { key: 'vs', label: '横波速度', unit: ' km/s' }]);
    this.prof = el('canvas'); this.prof.style.cssText = 'width:100%;height:280px;display:block;border-radius:14px;background:rgba(255,255,255,.03);cursor:ns-resize;touch-action:none';
    this.zoomSeg = ui.seg([[false, '全部深度'], [true, '浅部 0–100 km']], false, v => { this.zoom = v; this.depth = v ? 8 : 1500; this.updProbe(); });
    api.panel.append(this.R, this.prof, this.zoomSeg);
    const pick = e => { const r = this.prof.getBoundingClientRect(), f = clamp((e.clientY - r.top - 14) / (r.height - 28), 0, 1); this.depth = Math.round(f * (this.zoom ? 100 : 6371)); this.updProbe(); };
    this.prof.onpointerdown = e => { this.prof.setPointerCapture(e.pointerId); pick(e); }; this.prof.onpointermove = e => { if (e.buttons) pick(e); };
    api.setDock([{ id: 'go', label: '发生地震', primary: true }]);
    this.updProbe();
  },
  updProbe() {
    const v = P.vel(P.R_E - this.depth); this.R.set('layer', `${v.layer} · ${this.depth} km`); this.R.set('vp', v.vp.toFixed(1), '#47c6ff'); this.R.set('vs', v.vs ? v.vs.toFixed(1) : '0', v.vs ? '#ff5d4d' : '#ff5d4d');
    if (this.zoom && this.depth >= 25 && this.depth <= 45) this.api.done('moho');
    if (this.depth >= 2850 && this.depth <= 2940) this.api.done('cmb');
    this.drawProf();
  },
  drawProf() {
    const c = this.prof, dpr = Math.min(devicePixelRatio, 2), w = c.clientWidth, h = c.clientHeight; if (!w) return;
    c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const D = this.zoom ? 100 : 6371, Y = d => 14 + d / D * (h - 28), X = v => 40 + v / 14 * (w - 56);
    g.font = font(500, 11); g.fillStyle = 'rgba(255,255,255,.4)'; g.textAlign = 'right';
    for (let k = 0; k <= 4; k++) { const d = D * k / 4; g.fillText(Math.round(d), 34, Y(d) + 4); g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(40, Y(d)); g.lineTo(w - 10, Y(d)); g.stroke(); }
    for (const [key, col] of [['vp', '#47c6ff'], ['vs', '#ff5d4d']]) { g.beginPath(); for (let i = 0; i <= 400; i++) { const d = D * i / 400, v = P.vel(P.R_E - d)[key]; i ? g.lineTo(X(v), Y(d)) : g.moveTo(X(v), Y(d)); } g.strokeStyle = col; g.lineWidth = 2.2; g.stroke(); }
    g.font = font(700, 13); g.fillStyle = '#47c6ff'; g.textAlign = 'left'; g.fillText('纵波', X(12) - 30, 28); g.fillStyle = '#ff5d4d'; g.fillText('横波', X(6) - 40, 28);
    const y = Y(this.depth); g.strokeStyle = '#ffc147'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, y); g.lineTo(w - 10, y); g.stroke(); g.fillStyle = '#ffc147'; g.beginPath(); g.arc(w - 14, y, 6, 0, 7); g.fill();
  },
  onDock(id) { if (id === 'go') { this.st = 0; this.run = true; this.t0 = null; this.cache = null; } },
  resize() { this.drawProf?.(); this.cache = null; },
  geom() { const a = this.api.area, R = Math.min(a.r - a.l, a.b - a.t) * .44; return { cx: (a.l + a.r) / 2, cy: (a.t + a.b) / 2 + 8, R }; },
  pointer(type, x, y) {
    if (type !== 'down') return; const { cx, cy, R } = this.geom(), r = Math.hypot(x - cx, y - cy);
    if (Math.abs(r - R) > 44) return; const ang = Math.abs(Math.atan2(x - cx, -(y - cy))) * 180 / Math.PI;
    if (this.st < 1200) { this.api.toast('先按「发生地震」，看看哪里收得到'); return; }
    this.picked = Math.round(ang / 5) * 5;
    if (this.picked > 104 && this.picked < 143) { this.api.done('shadow'); this.api.toast(`${this.picked}°：纵波横波都收不到，这里是影区`); }
    else if (this.picked >= 143) this.api.toast(`${this.picked}°：只收到纵波，没有横波`);
    else if (this.picked > 104) this.api.toast(`${this.picked}°：收不到横波`);
    else this.api.toast(`${this.picked}°：纵波、横波都能收到`);
  },
  tick(dt, time) {
    const { api } = this, ctx = api.ctx, { cx, cy, R } = this.geom(), k = R / P.R_E;
    if (this.run) { this.t0 ??= time; this.st = (time - this.t0) * 105; }
    const st = this.st;
    // 背景星空
    ctx.fillStyle = '#070b14'; ctx.fillRect(0, 0, api.W, api.H);
    // 地球剖面
    const layer = (r, c0, c1) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * k); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 7); ctx.fill(); };
    layer(P.R_E, '#6b2a16', '#3a1a12'); layer(P.D660, '#9a3a17', '#5a2213'); layer(P.CMB, '#ffb238', '#e0701c'); layer(P.ICB, '#fff7d6', '#ffd36a');
    ctx.strokeStyle = '#b9a58f'; ctx.lineWidth = Math.max(2, 35 * k); ctx.beginPath(); ctx.arc(cx, cy, R - ctx.lineWidth / 2, 0, 7); ctx.stroke();
    // 外核液体的微光
    ctx.save(); ctx.globalAlpha = .18 + .06 * Math.sin(time * 1.5); ring(ctx, cx, cy, P.CMB * k, '#fff0b0', 3, 1, 26); ctx.restore();
    // 探针深度
    const pr = (P.R_E - this.depth) * k; ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffc147'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, pr), 0, 7); ctx.stroke(); ctx.restore();
    // 影区与台站
    const P2 = (ang, r) => [cx + Math.sin(ang) * r, cy - Math.cos(ang) * r];
    const done = this.run && st > 1500;
    if (this.st > 1200) {
      for (const sgn of [1, -1]) {
        ctx.save(); ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(cx, cy, R + 14, -Math.PI / 2 + sgn * 104 * Math.PI / 180, -Math.PI / 2 + sgn * 143 * Math.PI / 180, sgn < 0); ctx.stroke(); ctx.restore();
        const [lx, ly] = P2(sgn * 123.5 * Math.PI / 180, R + 40); ctx.font = font(700, 15); ctx.fillStyle = '#e9eef6'; ctx.textAlign = 'center'; ctx.fillText('影区', lx, ly);
      }
    }
    // 射线（播完后缓存成图）
    if (this.cache && !this.run) { ctx.drawImage(this.cache, 0, 0, api.W, api.H); } else {
    const finished = !this.run && st >= 1500, target = finished ? (() => { const c = document.createElement('canvas'); c.width = api.ctx.canvas.width; c.height = api.ctx.canvas.height; const g = c.getContext('2d'); g.setTransform(c.width / api.W, 0, 0, c.height / api.H, 0, 0); return g; })() : ctx;
    { const ctx = target;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, col] of [['P', 'rgba(71,198,255,'], ['S', 'rgba(255,93,77,']]) {
      for (const ray of L5.rays[w]) for (const sgn of [1, -1]) {
        ctx.beginPath(); let last = null;
        for (const [r, phi, t] of ray.pts) { if (t > st) break; const [x, y] = P2(sgn * phi, r * k); last ? ctx.lineTo(x, y) : ctx.moveTo(x, y); last = [x, y]; }
        if (!last) continue; ctx.strokeStyle = col + '.38)'; ctx.lineWidth = 1.2; ctx.stroke();
        if (st < (ray.t ?? ray.pts[ray.pts.length - 1][2]) + 20) { ctx.beginPath(); ctx.arc(last[0], last[1], 2.2, 0, 7); ctx.fillStyle = col + '1)'; ctx.fill(); }
      }
    }
    ctx.restore(); }
    if (finished) { this.cache = target.canvas; ctx.drawImage(this.cache, 0, 0, api.W, api.H); } }
    // 台站：按到达情况上色
    for (let a = 0; a <= 180; a += 10) for (const sgn of [1, -1]) {
      if (a === 0 && sgn < 0) continue; if (a === 180 && sgn < 0) continue;
      const ang = sgn * a * Math.PI / 180, [x, y] = P2(ang, R + 4);
      // 接收按课本分界：纵波 104° 以内和 143° 以外，横波 104° 以内（含沿地核表面绕射的弱波）；到时取射线追踪的最近结果
      const got = w => { const ok = w === 'P' ? (a <= 104 || a >= 143) : a <= 104; if (!ok) return false;
        let best = null; for (const [d, tt] of L5.arr[w]) if (!best || Math.abs(d - a) < Math.abs(best[0] - a)) best = [d, tt];
        return best && st >= best[1] + Math.abs(best[0] - a) * 8; };
      const gp = got('P'), gs = got('S');
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 3); ctx.lineTo(-7, 3); ctx.closePath();
      ctx.fillStyle = gs ? '#ff5d4d' : gp ? '#47c6ff' : 'rgba(233,238,246,.35)'; if (gp || gs) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; } ctx.fill(); ctx.restore();
    }
    // 刻度角
    ctx.font = font(600, 13); ctx.fillStyle = 'rgba(233,238,246,.7)'; ctx.textAlign = 'center';
    for (const a of [0, 60, 104, 143, 180]) { const [x, y] = P2(a * Math.PI / 180, R + 26); ctx.fillText(a + '°', x, y + 4); }
    // 震源
    const [fx, fy] = P2(0, R - 20 * k); star(ctx, fx, fy - 2, 10);
    // 圈层名字（左侧）
    ctx.font = font(700, 15); ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    const lab = (r, t) => { const [x, y] = P2(-Math.PI * .62, r * k); ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(t, x + 6, y); ctx.shadowBlur = 0; };
    lab(6000, '地幔'); lab(2400, '外核 液态'); lab(500, '内核');
    if (this.run && st > 900) this.api.done('stop');
    if (st > 1500) this.run = false;
  },
  unmount() {},
};
