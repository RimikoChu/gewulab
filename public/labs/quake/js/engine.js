// 课程引擎：顶栏课次、左卡概念与任务、右侧仪表、底部操作、提示、画布与指针
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

// 右侧仪表的小部件
export const ui = {
  slider({ label, min, max, step = 1, value, unit = '', fmt = v => v, onInput }) {
    const w = el('div', 'ctl'); const lab = el('div', 'lab', `<span>${label}</span><b></b>`); const r = el('input'); r.type = 'range';
    Object.assign(r, { min, max, step, value }); w.append(lab, r);
    const upd = () => { lab.querySelector('b').textContent = fmt(+r.value) + unit; r.style.setProperty('--f', ((r.value - min) / (max - min) * 100) + '%'); };
    r.oninput = () => { upd(); onInput?.(+r.value); }; upd();
    w.set = v => { r.value = v; upd(); }; w.input = r; return w;
  },
  seg(options, value, onPick) {
    const w = el('div', 'seg');
    options.forEach(([v, t]) => { const b = el('button', v === value ? 'on' : '', t); b.onclick = () => { w.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onPick(v); }; w.append(b); });
    w.set = v => w.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', options[i][0] === v)); return w;
  },
  readouts(items) { // [{key,label,unit,wide,big}]
    const w = el('div', 'read'), map = {};
    items.forEach(it => { const r = el('div', 'r' + (it.wide ? ' wide' : '') + (it.big ? ' big' : ''), `<div class="k">${it.label}</div><div class="v">—<small>${it.unit ?? ''}</small></div>`); w.append(r); map[it.key] = r.querySelector('.v'); map[it.key].unit = it.unit ?? ''; });
    w.set = (k, v, color) => { const n = map[k]; if (!n) return; n.innerHTML = `${v}<small>${n.unit}</small>`; n.style.color = color || ''; };
    return w;
  },
};

export function createApp(lessons) {
  const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d'), ov = $('#ov');
  const card = $('#card'), panel = $('#panel'), dock = $('#dock'), toastEl = $('#toast');
  let W = 0, H = 0, dpr = 1, cur = null, idx = 0, last = performance.now(), toastT = 0;
  const done = store.get('quake:done', {});

  const api = {
    ctx, ov, panel, dock, get W() { return W; }, get H() { return H; },
    // 舞台可用区域（避开左右浮层）
    get area() { const narrow = W < 760; return narrow ? { l: 10, r: W - 10, t: 70, b: H - 190 } : { l: (W < 1100 ? 290 : 340), r: W - (W < 1100 ? 310 : 360), t: 76, b: H - 96 }; },
    done(id, note) {
      const key = cur.key; done[key] ??= {}; if (done[key][id]) return; done[key][id] = 1; store.set('quake:done', done);
      const t = card.querySelector(`[data-t="${id}"]`); if (t) { t.classList.add('done', 'pop'); }
      renderProgress(); renderSteps();
      const all = cur.tasks.every(t => done[key][t.id]);
      toast(note || (all ? '本课任务全部完成' : '完成：' + cur.tasks.find(t => t.id === id).text), true);
    },
    toast,
    setDock(btns) { dock.innerHTML = ''; btns.forEach(b => { const x = el('button', b.primary ? 'pri' : '', b.label); x.dataset.id = b.id; if (b.disabled) x.disabled = true; x.onclick = () => cur.onDock?.(b.id); dock.append(x); }); },
    dockState(id, { disabled, label } = {}) { const b = dock.querySelector(`[data-id="${id}"]`); if (!b) return; if (disabled != null) b.disabled = disabled; if (label) b.textContent = label; },
    tag(html, cls = '') { const t = el('div', 'tag ' + cls, html); ov.append(t); return t; },
    place(t, x, y) { t.style.left = x + 'px'; t.style.top = y + 'px'; },
  };

  function toast(text, good) { toastEl.textContent = text; toastEl.className = 'toast show' + (good ? ' good' : ''); clearTimeout(toastT); toastT = setTimeout(() => toastEl.className = 'toast', 2200); }
  function renderSteps() {
    $('#steps').innerHTML = lessons.map((l, i) => { const d = done[l.key] || {}, all = l.tasks.length && l.tasks.every(t => d[t.id]);
      return `<button data-i="${i}" class="${i === idx ? 'on' : ''} ${all ? 'done' : ''}"><b>${l.no}</b><span>${l.short}</span></button>`; }).join('');
  }
  function renderProgress() { const d = done[cur.key] || {}, n = cur.tasks.filter(t => d[t.id]).length; const b = card.querySelector('.prog b'); if (b) b.style.width = (cur.tasks.length ? n / cur.tasks.length * 100 : 0) + '%'; }
  function renderCard() {
    const d = done[cur.key] || {};
    card.style.display = cur.hideCard ? 'none' : '';
    card.innerHTML = `<div class="no">${cur.no === '测' ? '随堂检测' : '第 ' + cur.no + ' 课'}</div><h1>${cur.title}</h1><div class="concept">${cur.concept}</div>
      ${cur.tasks.length ? `<div class="tasks">${cur.tasks.map(t => `<div class="task ${d[t.id] ? 'done' : ''}" data-t="${t.id}"><i></i>${t.text}</div>`).join('')}</div><div class="prog"><b></b></div>` : ''}`;
    renderProgress();
  }
  function go(i) {
    i = Math.max(0, Math.min(lessons.length - 1, i));
    cur?.unmount?.(); ov.innerHTML = ''; panel.innerHTML = ''; dock.innerHTML = ''; document.querySelectorAll('.lesson-extra').forEach(e => e.remove());
    idx = i; cur = lessons[i]; renderSteps(); renderCard();
    cur.mount(api); cur.resize?.();
    try { history.replaceState(null, '', '#' + (i + 1)); } catch {}
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = stage.clientWidth; H = stage.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cur?.resize?.();
  }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    cur?.tick?.(dt, now / 1000);
    requestAnimationFrame(frame);
  }
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); cur?.pointer?.('down', ...pos(e), e); });
  cv.addEventListener('pointermove', e => cur?.pointer?.('move', ...pos(e), e));
  cv.addEventListener('pointerup', e => cur?.pointer?.('up', ...pos(e), e));
  $('#steps').onclick = e => { const b = e.target.closest('button'); if (b) go(+b.dataset.i); };
  $('#reset').onclick = () => { delete done[cur.key]; store.set('quake:done', done); go(idx); };
  $('#full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') go(idx + 1); if (e.key === 'ArrowLeft') go(idx - 1); });
  new ResizeObserver(resize).observe(stage);
  resize(); go(Math.max(0, (parseInt(location.hash.slice(1)) || 1) - 1)); requestAnimationFrame(frame);
}
