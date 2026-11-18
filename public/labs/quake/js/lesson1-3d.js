// 第 1 课（三维版）：可旋转的地形沙盘，侧面看地层，可剖开看震源
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { ui, el } from './engine.js';
import * as P from './physics.js';
import { elev, CITIES, ICOL } from './map.js';

// 区域与比例：1 单位 = 1 km；地形高度放大 4 倍；地下深度按平方根压缩（深度刻度如实标注）
const X0 = -140, X1 = 200, Y0 = -150, Y1 = 150, VE = 4, BOTTOM = -112;
const dY = d => -4.3 * Math.sqrt(Math.max(0, d));
const H = (x, y) => elev(x, y) * VE;
const T = (x, y, h = 0) => new THREE.Vector3(x, h, -y);          // 地图坐标 → 三维（北 = -Z）

function bakeBase() {
  const k = 2, w = (X1 - X0) * k, h = (Y1 - Y0) * k, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h);
  const stops = [[0, [78, 112, 64]], [.7, [92, 124, 70]], [1.3, [120, 128, 82]], [2.2, [132, 112, 84]], [3.4, [118, 102, 88]], [4.6, [132, 124, 116]], [5.4, [170, 168, 166]], [6.2, [236, 240, 244]]];
  const ramp = e => { for (let i = 1; i < stops.length; i++) if (e <= stops[i][0]) { const [e0, c0] = stops[i - 1], [e1, c1] = stops[i], t = (e - e0) / (e1 - e0); return c0.map((v, n) => v + (c1[n] - v) * t); } return stops[stops.length - 1][1]; };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = X0 + i / k, y = Y1 - j / k, e = elev(x, y), e2 = elev(x + .6, y + .6), sh = Math.max(.55, Math.min(1.25, 1 + (e - e2) * 1.6));
    const col = ramp(e), o = (j * w + i) * 4; img.data[o] = col[0] * sh; img.data[o + 1] = col[1] * sh; img.data[o + 2] = col[2] * sh; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function bakeIntensity(M, h) {
  const w = X1 - X0, hh = Y1 - Y0, c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d'), img = g.createImageData(w, hh);
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
    const I = Math.floor(P.intensity(M, h, [X0 + i + .5, Y1 - j - .5])); if (I < 4) continue;
    const col = ICOL[I], o = (j * w + i) * 4; img.data[o] = parseInt(col.slice(1, 3), 16); img.data[o + 1] = parseInt(col.slice(3, 5), 16); img.data[o + 2] = parseInt(col.slice(5, 7), 16); img.data[o + 3] = 150 + (I - 4) * 12;
  }
  g.putImageData(img, 0, 0); return c;
}
function strataTexture() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 512; const g = c.getContext('2d');
  const top = 24, Yv = y => (top - y) / (top - BOTTOM) * 512;           // y 是三维高度
  const bands = [[0, 2, '#7a5c3e'], [2, 12, '#8f7458'], [12, 22, '#7d6955'], [22, 35, '#6c5c50']];
  g.fillStyle = '#5b4a3c'; g.fillRect(0, 0, 8, 512);
  for (const [a, b, col] of bands) { g.fillStyle = col; g.fillRect(0, Yv(dY(a)), 8, Yv(dY(b)) - Yv(dY(a))); }
  const gm = g.createLinearGradient(0, Yv(dY(35)), 0, 512); gm.addColorStop(0, '#6b3a26'); gm.addColorStop(1, '#3a1d14'); g.fillStyle = gm; g.fillRect(0, Yv(dY(35)), 8, 512);
  g.fillStyle = 'rgba(255,230,190,.55)'; g.fillRect(0, Yv(dY(35)) - 1, 8, 2);   // 莫霍面
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture(color) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, color); gr.addColorStop(.25, color + 'aa'); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
// 沿一条折线做地层侧墙
function wall(pts, mat) {
  const pos = [], uv = [], idx = [];
  pts.forEach(([x, y], i) => { const h = H(x, y); pos.push(x, h, -y, x, BOTTOM, -y); const u = i / (pts.length - 1); uv.push(u, (h - BOTTOM) / (24 - BOTTOM), u, 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const line = (n, x, y) => Array.from({ length: n + 1 }, (_, i) => [x(i / n), y(i / n)]);

export const L1 = {
  key: 'id', no: 1, short: '身份证', title: '一次地震的身份证',
  concept: '震级只有<em>一个</em><br>烈度<em>处处不同</em>',
  tasks: [
    { id: 'wc', text: '重演汶川地震', note: '汶川地震：8.0 级，震源深约 14 km' },
    { id: 'diff', text: '放两个烈度差 3 度的点', note: '离震中越远，烈度越低' },
    { id: 'deep', text: '把震源调到 300 km 以下', note: '深源地震传到地面时已经弱了很多' },
    { id: 'e', text: '先后发生 7 级、8 级', note: '8 级的能量约是 7 级的 32 倍' },
  ],
  mount(api) {
    Object.assign(this, { api, M: 6.5, h: 20, fired: null, ft: 0, obs: [], history: [], cut: false, tags: [] });
    // —— 右侧仪表
    const pre = el('button', 'chip', '一键重演：汶川 2008'); pre.style.cssText = 'height:42px;justify-content:center;background:rgba(255,122,61,.18);color:#ffb08a;font-size:15px';
    pre.onclick = () => { this.M = 8.0; this.h = 14; this.sM.set(8); this.sH.set(14); this.fire(); };
    this.sM = ui.slider({ label: '震级', min: 4.5, max: 8.5, step: .1, value: this.M, fmt: v => 'M ' + v.toFixed(1), onInput: v => { this.M = v; this.upd(); } });
    this.sH = ui.slider({ label: '震源深度', min: 5, max: 650, step: 1, value: this.h, unit: ' km', onInput: v => { this.h = v; this.upd(); this.placeFocus(this.h); } });
    this.cutSeg = ui.seg([[false, '整块地形'], [true, '剖开看震源']], false, v => this.setCut(v));
    this.R = ui.readouts([{ key: 'type', label: '类型' }, { key: 'I0', label: '震中烈度' }, { key: 'E', label: '释放能量', unit: ' 焦耳', wide: true }, { key: 'cmp', label: '和上一次相比', wide: true }]);
    api.panel.append(pre, this.sM, this.sH, this.cutSeg, this.R);
    api.setDock([{ id: 'fire', label: '发生地震', primary: true }, { id: 'clear', label: '清除观察点' }]);
    this.hint = api.tag('点地面放观察点 · 拖动旋转', 'pill');
    // —— 三维
    const stage = document.getElementById('stage'), cv2 = document.getElementById('cv');
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.localClippingEnabled = true;
    r.domElement.className = 'lesson-extra'; r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    stage.insertBefore(r.domElement, cv2); cv2.style.pointerEvents = 'none'; this.cv2 = cv2;
    const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color('#0a111d'); scene.fog = new THREE.Fog('#0a111d', 520, 1100);
    const cam = this.cam = new THREE.PerspectiveCamera(34, 1, 1, 3000); cam.position.set(250, 330, 560);
    const ctl = this.ctl = new OrbitControls(cam, r.domElement); ctl.target.set(30, -55, 0); ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false;
    ctl.minDistance = 260; ctl.maxDistance = 900; ctl.minPolarAngle = .25; ctl.maxPolarAngle = 1.38; ctl.update();
    scene.add(new THREE.HemisphereLight('#cfe0ff', '#3a2a1e', .9));
    const sun = new THREE.DirectionalLight('#fff3e0', 2.4); sun.position.set(-260, 320, -160); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 50, far: 900 }); sun.shadow.bias = -.0008; scene.add(sun);
    // 剖开用的裁切面：保留北半（y ≥ 0）
    this.clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    // 地形
    this.base = bakeBase(); this.texCanvas = document.createElement('canvas'); this.texCanvas.width = this.base.width; this.texCanvas.height = this.base.height;
    this.texCtx = this.texCanvas.getContext('2d'); this.texCtx.drawImage(this.base, 0, 0);
    this.tex = new THREE.CanvasTexture(this.texCanvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const nx = 170, ny = 150, geo = new THREE.PlaneGeometry(X1 - X0, Y1 - Y0, nx, ny); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, -(Y0 + Y1) / 2);
    const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, H(pa.getX(i), -pa.getZ(i))); geo.computeVertexNormals();
    this.terrainMat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: .95, metalness: 0 });
    this.terrain = new THREE.Mesh(geo, this.terrainMat); this.terrain.castShadow = this.terrain.receiveShadow = true; scene.add(this.terrain);
    // 四周侧墙 + 剖面
    const st = strataTexture(), sMat = this.wallMat = new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: '#ffffff', emissiveIntensity: .55, roughness: 1, side: THREE.DoubleSide });
    this.walls = [wall(line(170, t => X0 + t * (X1 - X0), () => Y0), sMat), wall(line(150, () => X1, t => Y0 + t * (Y1 - Y0)), sMat), wall(line(170, t => X1 - t * (X1 - X0), () => Y1), sMat), wall(line(150, () => X0, t => Y1 - t * (Y1 - Y0)), sMat)];
    this.walls.forEach(w => scene.add(w));
    const cutMat = new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: '#ffffff', emissiveIntensity: .7, roughness: 1, side: THREE.DoubleSide }); this.cutFace = wall(line(170, t => X0 + t * (X1 - X0), () => 0), cutMat); this.cutFace.visible = false; scene.add(this.cutFace);
    const bot = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Y1 - Y0), new THREE.MeshStandardMaterial({ color: '#2a1610' })); bot.rotateX(Math.PI / 2); bot.position.set((X0 + X1) / 2, BOTTOM, -(Y0 + Y1) / 2); scene.add(bot); this.bottom = bot;
    // 震源、虚线、光晕
    this.focus = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffd166', depthTest: false })); this.focus.renderOrder = 10;
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ffb347'), depthTest: false, transparent: true, blending: THREE.AdditiveBlending })); this.halo.scale.set(34, 34, 1); this.halo.renderOrder = 9;
    this.drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 3, gapSize: 2.5, depthTest: false, transparent: true, opacity: .9 })); this.drop.renderOrder = 8;
    this.epi = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9, 16), new THREE.MeshStandardMaterial({ color: '#ff5d4d', emissive: '#ff2d1d', emissiveIntensity: .6 })); this.epi.rotateX(Math.PI);
    scene.add(this.focus, this.halo, this.drop, this.epi);
    // 断裂带、波圈
    this.lineMats = [];
    const mkLine = (color, width, dashed) => { const m = new LineMaterial({ color, linewidth: width, transparent: true, dashed: !!dashed, dashSize: 6, gapSize: 4, depthTest: true }); this.lineMats.push(m); const l = new Line2(new LineGeometry(), m); l.visible = false; l.renderOrder = 5; scene.add(l); return l; };
    this.rupt = mkLine('#ff5d4d', 4, true);
    const mkSeg = (color, width) => { const m = new LineMaterial({ color, linewidth: width, transparent: true }); this.lineMats.push(m); const l = new LineSegments2(new LineSegmentsGeometry(), m); l.visible = false; l.renderOrder = 6; scene.add(l); return l; };
    this.ringP = mkSeg('#47c6ff', 3); this.ringS = mkSeg('#ff5d4d', 5);
    // 城市
    this.cityMeshes = [];
    for (const c of CITIES) { if (c.epi) continue; const [x, y] = c.p; if (x < X0 || x > X1 || y < Y0 || y > Y1) continue; const m = new THREE.Mesh(new THREE.SphereGeometry(c.big ? 2.2 : 1.6, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .4 })); m.position.copy(T(x, y, H(x, y) + 2)); scene.add(m); this.cityMeshes.push(m); this.tags.push({ el: api.tag(c.n, 'pill city'), pos: m.position.clone().add(new THREE.Vector3(0, 7, 0)), south: y < 0 }); }
    this.epiTag = { el: api.tag('震中', 'pill epi'), pos: null }; this.focusTag = { el: api.tag('震源', 'pill focus'), pos: null }; this.tags.push(this.epiTag, this.focusTag);
    // 深度刻度（侧面）
    this.depthTags = [0, 14, 35, 100, 300, 600].map(d => { const t = { el: api.tag(d === 35 ? '35 km 莫霍面' : d + ' km', 'depth'), d, side: true }; this.tags.push(t); return t; });
    this.noteTag = { el: api.tag('地下深度为示意比例', 'note'), side: true }; this.tags.push(this.noteTag); this.placeDepthTags();
    // 交互：点地面放观察点（区分点击与拖动）
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; this.camGoal = null; });
    r.domElement.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const rc = r.domElement.getBoundingClientRect();
      ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1); ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObject(this.terrain)[0]; if (!hit) return; const p = [hit.point.x, -hit.point.z]; if (this.cut && p[1] < 0) return;
      this.addObs(p);
    });
    this.placeFocus(this.h); this.upd(); this.resize();
  },
  placeDepthTags() { const x = this.cut ? -46 : X1, y = this.cut ? 0 : Y0; this.depthTags.forEach(t => t.pos = T(x, y, t.d ? dY(t.d) : 2).add(new THREE.Vector3(this.cut ? 0 : 4, 0, 4))); this.noteTag.pos = T(this.cut ? 60 : X1 - 80, y, BOTTOM + 8); },
  placeFocus(h) {
    const g = H(0, 0); this.focus.position.set(0, dY(h), 0); this.halo.position.copy(this.focus.position);
    this.drop.geometry.setFromPoints([this.focus.position.clone(), new THREE.Vector3(0, g, 0)]); this.drop.computeLineDistances();
    this.epi.position.set(0, g + 6, 0);
    this.epiTag.pos = new THREE.Vector3(0, g + 18, 0); this.focusTag.pos = this.focus.position.clone().add(new THREE.Vector3(34, 6, 0));
    this.focusTag.el.textContent = '震源 ' + h + ' km';
  },
  setCut(v) {
    this.cut = v; const planes = v ? [this.clip] : [];
    this.terrainMat.clippingPlanes = planes; this.wallMat.clippingPlanes = planes; this.bottom.material.clippingPlanes = planes;
    this.cutFace.visible = v; this.cityMeshes.forEach(m => m.visible = !v || -m.position.z >= 0);
    this.obs.forEach(o => o.mesh.visible = !v || o.p[1] >= 0);
    this.placeDepthTags(); this.obs.forEach(o => { o.tag.south = o.dist.south = o.p[1] < 0; });
    this.camGoal = v ? { p: new THREE.Vector3(40, 120, 640), t: new THREE.Vector3(30, -38, 0) } : { p: new THREE.Vector3(250, 330, 560), t: new THREE.Vector3(30, -55, 0) };
    if (v) this.api.toast('沿震中剖开：震源在地下，震中在它正上方');
  },
  addObs(p) {
    if (this.obs.length >= 4) { const o = this.obs.shift(); this.scene.remove(o.mesh); o.tag.el.remove(); this.tags.splice(this.tags.indexOf(o.tag), 1); o.dist.el.remove(); this.tags.splice(this.tags.indexOf(o.dist), 1); }
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6), new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: .8 })), roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 4, 4), new THREE.MeshStandardMaterial({ color: '#c8553d', roughness: .7 }));
    body.position.y = 2.5; roof.position.y = 7; roof.rotation.y = Math.PI / 4; body.castShadow = roof.castShadow = true; g.add(body, roof);
    const base = T(p[0], p[1], H(...p)); g.position.copy(base); g.scale.setScalar(1.3); this.scene.add(g);
    const tag = { el: this.api.tag('', 'pill int'), pos: base.clone().add(new THREE.Vector3(0, 20, 0)) }, dist = { el: this.api.tag(Math.round(Math.hypot(...p)) + ' km', 'dist'), pos: base.clone().add(new THREE.Vector3(0, -6, 0)) };
    tag.el.style.display = 'none'; tag.south = dist.south = p[1] < 0 && false; this.tags.push(tag, dist); this.obs.push({ p, mesh: g, base, tag, dist }); this.checkObs();
  },
  upd() {
    const I0 = P.intensity(this.M, this.h, [0, 0]);
    this.R.set('type', P.depthType(this.h)); this.R.set('I0', P.roman(I0), ICOL[Math.floor(I0)] === '#c1203a' || I0 >= 11 ? '#ff6b7a' : ICOL[Math.floor(I0)]); this.R.set('E', P.sci(P.energy(this.M)));
  },
  fire() {
    const api = this.api; this.fired = { M: this.M, h: this.h }; this.ft = 0; this.int = bakeIntensity(this.M, this.h); this.upd(); this.placeFocus(this.h);
    const prev = this.history[this.history.length - 1]; this.history.push(this.M);
    if (prev != null) { const r = P.energy(this.M) / P.energy(prev); this.R.set('cmp', r >= 1 ? `是上次的 ${fmtX(r)} 倍` : `是上次的 1/${fmtX(1 / r)}`, r >= 1 ? '#ffc147' : '#47c6ff'); }
    // 断裂带
    const [a, b] = P.rupture(this.M), pts = []; for (let i = 0; i <= 40; i++) { const x = a[0] + (b[0] - a[0]) * i / 40, y = a[1] + (b[1] - a[1]) * i / 40; if (x < X0 || x > X1 || y < Y0 || y > Y1) continue; pts.push(x, H(x, y) + 1.2, -y); }
    if (pts.length > 5) { this.rupt.geometry = new LineGeometry(); this.rupt.geometry.setPositions(pts); this.rupt.computeLineDistances(); this.rupt.visible = true; }
    this.obs.forEach(o => o.tag.el.style.display = 'none');
    if (this.M >= 7.9 && Math.abs(this.h - 14) <= 3) this.done('wc');
    if (this.h > 300) this.done('deep');
    const h = this.history; if (h.some(m => Math.abs(m - 7) < .05) && h.some(m => Math.abs(m - 8) < .05)) this.done('e');
    this.checkObs();
  },
  done(id) { const t = this.tasks.find(t => t.id === id); this.api.done(id, t.note); },
  checkObs() {
    if (!this.fired) return; const I = this.obs.map(o => Math.floor(P.intensity(this.fired.M, this.fired.h, o.p)));
    if (I.length >= 2 && Math.max(...I) - Math.min(...I) >= 3) this.done('diff');
  },
  onDock(id) { if (id === 'fire') this.fire(); if (id === 'clear') { while (this.obs.length) { const o = this.obs.pop(); this.scene.remove(o.mesh); [o.tag, o.dist].forEach(t => { t.el.remove(); this.tags.splice(this.tags.indexOf(t), 1); }); } } },
  resize() {
    const api = this.api, W = api.W, Hh = api.H; if (!this.renderer || !W) return;
    this.renderer.setSize(W, Hh, false); this.cam.aspect = W / Hh;
    const a = api.area, cx = (a.l + a.r) / 2, cy = (a.t + a.b) / 2;           // 把画面中心移到可用区域的中心
    this.cam.setViewOffset(W, Hh, W / 2 - cx, Hh / 2 - cy, W, Hh); this.cam.updateProjectionMatrix();
    this.lineMats?.forEach(m => m.resolution.set(W, Hh));
  },
  // 只画落在地块上的那几段（成对的线段）
  ringPts(r) { const out = [], n = 180, ok = (x, y) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1 && !(this.cut && y < 0); let prev = null;
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r, cur = ok(x, y) ? [x, H(x, y) + 1.5, -y] : null; if (cur && prev) out.push(...prev, ...cur); prev = cur; } return out; },
  tick(dt) {
    if (!this.renderer) return; const api = this.api;
    if (this.camGoal) { const k = 1 - Math.pow(.02, dt); this.cam.position.lerp(this.camGoal.p, k); this.ctl.target.lerp(this.camGoal.t, k); if (this.cam.position.distanceTo(this.camGoal.p) < 1) this.camGoal = null; }
    this.ctl.update();
    const st = this.fired ? (this.ft += dt) * 9 : 0, f = this.fired;
    // 波圈与烈度铺开
    if (f) {
      const rP = Math.sqrt(Math.max(0, (P.VP * st) ** 2 - f.h ** 2)), rS = Math.sqrt(Math.max(0, (P.VS * st) ** 2 - f.h ** 2));
      for (const [ln, r] of [[this.ringP, rP], [this.ringS, rS]]) { const pts = r > 1 && r < 420 ? this.ringPts(r) : []; ln.visible = pts.length > 6; if (ln.visible) { ln.geometry.dispose(); ln.geometry = new LineSegmentsGeometry(); ln.geometry.setPositions(pts); } }
      if (this.ft < 7) {
        const k = 2, c = this.texCtx; c.drawImage(this.base, 0, 0); c.save(); c.beginPath(); c.arc((0 - X0) * k, (Y1 - 0) * k, rS * k, 0, 7); c.clip(); c.globalAlpha = .82; c.imageSmoothingEnabled = true; c.drawImage(this.int, 0, 0, this.base.width, this.base.height); c.restore(); this.tex.needsUpdate = true;
      }
      // 震源闪光
      this.halo.scale.setScalar(34 + Math.max(0, 1.2 - this.ft) * 60);
      // 观察点：横波到了才晃，并显示烈度
      this.obs.forEach(o => {
        const d = Math.hypot(...o.p), I = P.intensity(f.M, f.h, o.p), u = st - P.tS(d, f.h);
        if (u > 0) { o.tag.el.style.display = (!this.cut || o.p[1] >= 0) ? '' : 'none'; o.tag.el.textContent = P.roman(I) + ' 度'; o.tag.el.style.background = ICOL[Math.floor(I)]; const s = Math.sin(u * 11) * Math.exp(-u * .12) * Math.max(0, I - 3) * .5; o.mesh.position.set(o.base.x + s, o.base.y, o.base.z + s * .4); o.mesh.rotation.z = s * .03; }
      });
    } else { this.halo.scale.setScalar(30 + Math.sin(performance.now() / 300) * 3); }
    this.renderer.render(this.scene, this.cam);
    // 标签跟随
    const W = api.W, Hh = api.H, v = new THREE.Vector3(), camDir = new THREE.Vector3(); this.cam.getWorldDirection(camDir);
    for (const t of this.tags) {
      if (!t.pos) continue; v.copy(t.pos).project(this.cam);
      const hidden = v.z > 1 || (this.cut && t.south) || (t.side && camDir.z > 0);
      t.el.style.visibility = hidden ? 'hidden' : ''; api.place(t.el, (v.x + 1) / 2 * W, (1 - v.y) / 2 * Hh);
    }
    const a = api.area; this.hint.style.display = this.obs.length ? 'none' : ''; api.place(this.hint, (a.l + a.r) / 2, a.t + 24);
  },
  unmount() { this.ctl?.dispose(); this.renderer?.dispose(); this.renderer?.domElement.remove(); if (this.cv2) this.cv2.style.pointerEvents = ''; this.renderer = null; },
};
const fmtX = r => r >= 100 ? Math.round(r).toLocaleString() : r >= 10 ? r.toFixed(0) : r.toFixed(1);
