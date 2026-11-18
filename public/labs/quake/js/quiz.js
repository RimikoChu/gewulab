import { el } from './engine.js';
import * as P from './physics.js';

const font = (w, s) => `${w} ${s}px -apple-system,"PingFang SC",sans-serif`;
const FIG = {
  seis(g, w, h) { const s = P.seismogram(80, 10, 42, 40, 800), X = t => 20 + t / 40 * (w - 40);
    g.strokeStyle = 'rgba(255,255,255,.08)'; for (let t = 0; t <= 40; t += 5) { g.beginPath(); g.moveTo(X(t), 10); g.lineTo(X(t), h - 24); g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.font = font(500, 12); g.textAlign = 'center'; g.fillText(t + 's', X(t), h - 8); }
    g.beginPath(); s.data.forEach((v, i) => { const x = 20 + i / s.data.length * (w - 40), y = (h - 24) / 2 + 4 - v * (h - 40) * .45; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = '#e9eef6'; g.lineWidth = 1.3; g.stroke(); },
  circles(g, w, h) { const c = [[w * .4, h * .5, 70], [w * .6, h * .5, 60]]; c.forEach(([x, y, r], i) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.strokeStyle = i ? '#ffc147' : '#47c6ff'; g.lineWidth = 2.5; g.stroke(); g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 7, y + 5); g.lineTo(x - 7, y + 5); g.fill(); });
    const d = c[1][0] - c[0][0], a = (70 * 70 - 60 * 60 + d * d) / (2 * d), hh = Math.sqrt(70 * 70 - a * a); [[c[0][0] + a, h * .5 - hh], [c[0][0] + a, h * .5 + hh]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fillStyle = '#fff'; g.fill(); }); },
  prof(g, w, h) { const Y = d => 10 + d / 6371 * (h - 20), X = v => 60 + v / 14 * (w - 90);
    for (const [k, col] of [['vp', '#47c6ff'], ['vs', '#ff5d4d']]) { g.beginPath(); for (let i = 0; i <= 300; i++) { const d = 6371 * i / 300, v = P.vel(P.R_E - d)[k]; i ? g.lineTo(X(v), Y(d)) : g.moveTo(X(v), Y(d)); } g.strokeStyle = col; g.lineWidth = 2.4; g.stroke(); }
    g.setLineDash([4, 4]); g.strokeStyle = '#ffc147'; g.beginPath(); g.moveTo(40, Y(2891)); g.lineTo(w - 20, Y(2891)); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffc147'; g.font = font(700, 14); g.textAlign = 'right'; g.fillText('2900 km', 56, Y(2891) - 6);
    g.fillStyle = '#47c6ff'; g.textAlign = 'left'; g.fillText('纵波', X(12.5), 26); g.fillStyle = '#ff5d4d'; g.fillText('横波', X(5.4), 26); },
  build(g, w, h) { [[3, .25], [10, .5], [30, .78]].forEach(([n, f]) => { const bh = n * 4.6, x = w * f; g.fillStyle = '#aeb9cc'; g.fillRect(x - 24, h - 20 - bh, 48, bh); g.fillStyle = '#e9eef6'; g.font = font(700, 15); g.textAlign = 'center'; g.fillText(n + ' 层', x, h - 26 - bh); }); g.fillStyle = '#6d6a66'; g.fillRect(0, h - 20, w, 4); },
};
const QS = [
  { q: '震中在哪里？', o: ['震源正上方的地面', '地下岩层破裂处', '离震源最远的地方', '最近的地震台'], a: 0, why: '震中是震源在地面上的投影。' },
  { q: '一次地震有几个震级、几个烈度？', o: ['震级一个，烈度多个', '都只有一个', '震级多个，烈度一个', '都有多个'], a: 0, why: '能量只有一个；破坏程度各地不同。' },
  { q: '地震时，湖面船上的人会感到？', o: ['只有上下颠', '先颠后晃', '只有左右晃', '没有感觉'], a: 0, why: '横波传不过水，只有纵波能到船上。' },
  { q: '这段记录的纵横波时间差约为？', fig: 'seis', o: ['约 5 秒', '约 10 秒', '约 20 秒', '约 30 秒'], a: 1, why: '时间差约 10 秒，台站离震源约 84 km。' },
  { q: '震中附近为什么收不到有效预警？', o: ['预警发出前横波已经到了', '那里没有手机信号', '那里的地震太小', '预警只发给远处'], a: 0, why: '系统需要几秒处理，太近的地方来不及。' },
  { q: '城市离震中 60 km，处理用 8 秒，约能提前？', o: ['约 2 秒', '约 7 秒', '约 17 秒', '约 25 秒'], a: 1, why: '横波约 17.6 秒到，预警约 10.9 秒发出。' },
  { q: '只有两个台站，为什么定不了震中？', fig: 'circles', o: ['两个圆有两个交点', '两个圆没有交点', '台站太远', '时间差算不出来'], a: 0, why: '要第三个圆才能锁定唯一的交点。' },
  { q: '横波在约 2900 km 处消失，说明？', fig: 'prof', o: ['外核是液态', '内核是液态', '地幔是液态', '横波太慢跑不到'], a: 0, why: '横波只能在固体中传播。' },
  { q: '主要周期约 1 秒的地震，哪栋楼最危险？', fig: 'build', o: ['3 层', '10 层', '30 层', '都一样'], a: 1, why: '10 层楼固有周期约 1 秒，会共振。' },
];

export const QUIZ = {
  key: 'quiz', no: '测', short: '小测', title: '随堂小测', concept: '', tasks: [], hideCard: true,
  mount(api) {
    Object.assign(this, { api, i: 0, res: [] });
    this.box = el('div', 'quiz lesson-extra'); document.body.append(this.box);
    api.setDock([{ id: 'next', label: '下一题', primary: true, disabled: true }, { id: 'again', label: '重新做' }]);
    this.show();
  },
  show() {
    const api = this.api;
    if (this.i >= QS.length) {
      const n = this.res.filter(Boolean).length;
      this.box.innerHTML = `<div class="qn">完成</div><h2 style="font-size:40px">答对 ${n} / ${QS.length}</h2><div class="why">${n === QS.length ? '全对！' : '错的题可以回到对应的课再试一次。'}</div><div class="score">${QS.map((_, k) => `<i class="${this.res[k] ? 'r' : 'w'}"></i>`).join('')}</div>`;
      api.dockState('next', { disabled: true }); return;
    }
    const q = QS[this.i];
    // 选项按题号固定打乱，避免答案总在同一个位置
    const ord = q.o.map((_, k) => k); let sd = this.i * 7919 + 13; for (let k = ord.length - 1; k > 0; k--) { sd = sd * 16807 % 2147483647; const j = sd % (k + 1); [ord[k], ord[j]] = [ord[j], ord[k]]; }
    this.box.innerHTML = `<div class="qn">${this.i + 1} / ${QS.length}</div><h2>${q.q}</h2>${q.fig ? '<canvas></canvas>' : ''}<div class="opts">${ord.map(k => `<button data-k="${k}">${q.o[k]}</button>`).join('')}</div><div class="why"></div>
      <div class="score">${QS.map((_, k) => `<i class="${k < this.i ? (this.res[k] ? 'r' : 'w') : k === this.i ? 'c' : ''}"></i>`).join('')}</div>`;
    if (q.fig) { const c = this.box.querySelector('canvas'), dpr = Math.min(devicePixelRatio, 2), w = c.clientWidth, h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); FIG[q.fig](g, w, h); }
    this.box.querySelectorAll('.opts button').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === q.a; this.res[this.i] = ok;
      this.box.querySelectorAll('.opts button').forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong'); this.box.querySelector('.why').textContent = (ok ? '对！' : '') + q.why;
      api.dockState('next', { disabled: false, label: this.i === QS.length - 1 ? '看成绩' : '下一题' });
    });
    api.dockState('next', { disabled: true, label: '下一题' });
  },
  onDock(id) { if (id === 'next') { this.i++; this.show(); } if (id === 'again') { this.i = 0; this.res = []; this.show(); } },
  tick(dt, t) {
    const { api } = this, ctx = api.ctx; const g = ctx.createRadialGradient(api.W / 2, api.H * .45, 50, api.W / 2, api.H / 2, Math.max(api.W, api.H) * .7);
    g.addColorStop(0, '#1a2a44'); g.addColorStop(1, '#070b14'); ctx.fillStyle = g; ctx.fillRect(0, 0, api.W, api.H);
    for (let k = 0; k < 3; k++) { const r = ((t * 60 + k * 220) % 660); ctx.strokeStyle = `rgba(255,93,77,${.12 * (1 - r / 660)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(api.W / 2, api.H / 2, r + 200, 0, 7); ctx.stroke(); }
  },
  unmount() { this.box?.remove(); },
};
