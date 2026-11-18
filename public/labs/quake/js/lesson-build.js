import { ui, el } from './engine.js';
import * as P from './physics.js';

const font = (w, s) => `${w} ${s}px -apple-system,"PingFang SC",sans-serif`;
const COLS = ['#47c6ff', '#3ddc97', '#ffc147'];
const FLOORS = [3, 10, 20];

/* =================== 第 6 课 房子为什么会倒 =================== */
export const L6 = {
  key: 'build', no: 6, short: '抗震', title: '房子为什么会倒',
  concept: '楼的节奏和地震波<em>对上</em><br>就会<em>共振</em>',
  tasks: [
    { id: 'worst', text: '点出晃得最凶的楼' },
    { id: 'res', text: '让 20 层楼共振' },
    { id: 'fix', text: '加装后晃动减一半' },
    { id: 'soft', text: '换成软土地基' },
  ],
  mount(api) {
    Object.assign(this, { api, Tg: .4, soft: false, prot: 'none', t: 0, pause: false });
    this.sT = ui.slider({ label: '地震波的周期', min: .1, max: 3, step: .05, value: this.Tg, unit: ' 秒', fmt: v => v.toFixed(2), onInput: v => { this.Tg = v; this.check(); } });
    const site = ui.seg([[false, '硬岩地基'], [true, '软土地基']], false, v => { this.soft = v; if (v) { this.api.done('soft'); this.api.toast('软土把慢节奏的晃动放大了，高楼更危险'); } this.check(); });
    const prot = ui.seg([['none', '20 层：无'], ['damp', '加阻尼器'], ['iso', '隔震支座']], 'none', v => { this.prot = v; this.check(); });
    this.R = ui.readouts(FLOORS.map((n, i) => ({ key: 'b' + i, label: `${n} 层` }))); this.R.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))'; this.R.querySelectorAll('.v').forEach(v => v.style.fontSize = '24px');
    this.curve = el('canvas'); this.curve.style.cssText = 'width:100%;height:170px;display:block;border-radius:14px;background:rgba(255,255,255,.03)';
    api.panel.append(this.sT, this.R, this.curve, site, prot);
    api.setDock([{ id: 'pause', label: '暂停' }]);
    this.check();
  },
  amp(i, Tg = this.Tg) {
    let Tn = P.natPeriod(FLOORS[i]), z = .05;
    if (i === 2 && this.prot === 'damp') z = .28;
    if (i === 2 && this.prot === 'iso') { Tn = 3.6; z = .18; }
    return P.amplify(Tn, Tg, z) * (this.soft ? P.softSoil(Tg) : 1);
  },
  check() {
    const A = FLOORS.map((_, i) => this.amp(i));
    A.forEach((a, i) => this.R.set('b' + i, a < .3 ? '稳' : '×' + a.toFixed(1), a > 4 ? '#ff5d4d' : a > 2 ? '#ffc147' : '#3ddc97'));
    const res = Math.abs(this.Tg - 2) <= .2;
    if (res && this.prot === 'none' && A[2] > 4) this.api.done('res');
    if (res && this.prot !== 'none') { const base = P.amplify(2, this.Tg) * (this.soft ? P.softSoil(this.Tg) : 1); if (A[2] < base / 2) { this.api.done('fix'); } }
    this.drawCurve();
  },
  drawCurve() {
    const c = this.curve, dpr = Math.min(devicePixelRatio, 2), w = c.clientWidth, h = c.clientHeight; if (!w) return;
    c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const X = T => 14 + (T - .1) / 2.9 * (w - 28), Y = A => h - 22 - Math.min(A, 10) / 10 * (h - 40);
    g.font = font(600, 12); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText('晃动放大倍数', 14, 16); g.textAlign = 'right'; g.fillText('地震波周期 →', w - 12, h - 6);
    FLOORS.forEach((_, i) => { g.beginPath(); for (let k = 0; k <= 200; k++) { const T = .1 + 2.9 * k / 200; k ? g.lineTo(X(T), Y(this.amp(i, T))) : g.moveTo(X(T), Y(this.amp(i, T))); } g.strokeStyle = COLS[i]; g.globalAlpha = .75; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1; });
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(this.Tg), 22); g.lineTo(X(this.Tg), h - 22); g.stroke(); g.setLineDash([]);
    FLOORS.forEach((_, i) => { g.beginPath(); g.arc(X(this.Tg), Y(this.amp(i)), 5, 0, 7); g.fillStyle = COLS[i]; g.fill(); });
  },
  onDock(id) { if (id === 'pause') { this.pause = !this.pause; this.api.dockState('pause', { label: this.pause ? '继续' : '暂停' }); } },
  resize() { this.drawCurve?.(); },
  layout() {
    const a = this.api.area, ground = a.b - 60, span = a.r - a.l, unit = Math.min((ground - a.t - 70) / (20 * 1.0), 16);
    return { ground, unit, xs: [a.l + span * .2, a.l + span * .5, a.l + span * .8] };
  },
  pointer(type, x, y) {
    if (type !== 'down') return; const { ground, unit, xs } = this.layout();
    const i = xs.findIndex((bx, k) => Math.abs(x - bx) < 50 && y < ground && y > ground - FLOORS[k] * unit - 30); if (i < 0) return;
    const A = FLOORS.map((_, k) => this.amp(k)), best = A.indexOf(Math.max(...A));
    if (i === best) { this.api.done('worst'); this.api.toast(`${FLOORS[i]} 层楼的节奏最接近地震波，晃得最凶`); }
    else this.api.toast(`${FLOORS[i]} 层只晃 ×${A[i].toFixed(1)}，再看看`);
  },
  tick(dt) {
    const { api } = this, ctx = api.ctx; if (!this.pause) this.t += dt;
    const { ground, unit, xs } = this.layout(), t = this.t, W = api.W, H = api.H, w = 2 * Math.PI / this.Tg;
    let g = ctx.createLinearGradient(0, 0, 0, ground); g.addColorStop(0, '#0b1424'); g.addColorStop(1, '#1a2c45'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, ground);
    const site = this.soft ? P.softSoil(this.Tg) : 1, gx = Math.sin(w * t) * 4 * site;
    g = ctx.createLinearGradient(0, ground, 0, H); g.addColorStop(0, this.soft ? '#5b4a30' : '#3e3a36'); g.addColorStop(1, '#141210'); ctx.fillStyle = g; ctx.fillRect(0, ground, W, H - ground);
    ctx.fillStyle = this.soft ? '#8a7448' : '#6d6a66'; ctx.fillRect(0, ground, W, 4);
    ctx.font = font(600, 14); ctx.fillStyle = 'rgba(233,238,246,.6)'; ctx.textAlign = 'left'; ctx.fillText(this.soft ? '软土地基' : '硬岩地基', api.area.l + 12, ground + 26);
    // 地面晃动示意波纹
    ctx.strokeStyle = 'rgba(255,193,71,.5)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = api.area.l; x < api.area.r; x += 4) ctx.lineTo(x, ground + 40 + Math.sin(x / 40 - w * t) * 6 * site); ctx.stroke();
    FLOORS.forEach((n, i) => {
      const A = this.amp(i), Tn = i === 2 && this.prot === 'iso' ? 3.6 : P.natPeriod(n), z = i === 2 && this.prot === 'damp' ? .28 : .05, r = Tn / this.Tg;
      const ph = Math.atan2(2 * z * r, 1 - r * r), top = Math.sin(w * t - ph) * Math.min(A, 12) * 4.2, hgt = n * unit, bw = 64, x0 = xs[i] + gx;
      const danger = A > 4;
      // 楼层
      for (let f = 0; f < n; f++) {
        const y0 = ground - f * unit, y1 = y0 - unit, s0 = Math.sin(Math.PI / 2 * f / n), s1 = Math.sin(Math.PI / 2 * (f + 1) / n);
        const o0 = top * s0, o1 = top * s1;
        ctx.beginPath(); ctx.moveTo(x0 - bw / 2 + o0, y0); ctx.lineTo(x0 + bw / 2 + o0, y0); ctx.lineTo(x0 + bw / 2 + o1, y1 + 1); ctx.lineTo(x0 - bw / 2 + o1, y1 + 1); ctx.closePath();
        ctx.fillStyle = danger ? (f % 2 ? '#c99a96' : '#d6aaa6') : (f % 2 ? '#aeb9cc' : '#bcc6d7'); ctx.fill();
        ctx.fillStyle = '#16233a'; const wy = y1 + unit * .25, wh = unit * .5; for (let k = 0; k < 4; k++) ctx.fillRect(x0 - bw / 2 + 7 + k * 14 + (o0 + o1) / 2, wy, 8, wh);
        if (danger && f % 3 === 1) { ctx.strokeStyle = '#4a1010'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 - 10 + o0, y0 - 2); ctx.lineTo(x0 - 2 + o1, y1 + unit * .5); ctx.lineTo(x0 + 6 + o1, y1 + 3); ctx.stroke(); }
      }
      // 防护装置
      if (i === 2 && this.prot === 'iso') { ctx.fillStyle = '#ffc147'; for (let k = 0; k < 4; k++) ctx.fillRect(x0 - bw / 2 + 4 + k * 16, ground - 6, 10, 6); }
      if (i === 2 && this.prot === 'damp') { const ty = ground - hgt + unit * 1.2, td = -top * .8; ctx.strokeStyle = '#ffc147'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + top, ty - unit); ctx.lineTo(x0 + top + td * .4, ty); ctx.stroke(); ctx.beginPath(); ctx.arc(x0 + top + td * .4, ty, 7, 0, 7); ctx.fillStyle = '#ffc147'; ctx.fill(); }
      // 标签
      ctx.textAlign = 'center'; ctx.font = font(700, 16); ctx.fillStyle = COLS[i]; ctx.fillText(n + ' 层', x0, ground - hgt - 34);
      ctx.font = `700 22px "Bricolage Grotesque",sans-serif`; ctx.fillStyle = danger ? '#ff5d4d' : '#e9eef6'; ctx.fillText(A < .3 ? '稳' : '×' + A.toFixed(1), x0 + top, ground - hgt - 12);
    });
  },
  unmount() {},
};
