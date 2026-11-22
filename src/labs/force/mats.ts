// 程序画出来的贴图：冰面、雪地、木纹、木板墙、毛巾、棉布、花岗岩、木箱。不用下载素材。
import * as THREE from 'three'

const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }

/** 冰面：颜色图是带一点蓝的白，底下透出深浅；粗糙度图上是冰壶和冰刷留下的细划痕（越亮越毛） */
export function makeIce() {
  const S = 1024, a = canvas(S), b = canvas(S), r = rng(3)
  a.g.fillStyle = '#b9cfdc'; a.g.fillRect(0, 0, S, S); b.g.fillStyle = '#262626'; b.g.fillRect(0, 0, S, S)
  for (let i = 0; i < 160; i++) {
    const x = r() * S, y = r() * S, R = 40 + r() * 120, q = a.g.createRadialGradient(x, y, 0, x, y, R)
    q.addColorStop(0, r() < 0.5 ? 'rgba(226,238,245,0.5)' : 'rgba(150,180,198,0.4)'); q.addColorStop(1, 'rgba(190,210,222,0)'); a.g.fillStyle = q; a.g.fillRect(x - R, y - R, R * 2, R * 2)
  }
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S, len = 30 + r() * 260, ang = (r() - 0.5) * 0.5 + (r() < 0.12 ? 1.2 : 0), w = 0.5 + r() * 1.1
    for (const [g, col] of [[a.g, `rgba(240,248,252,${0.1 + r() * 0.22})`], [b.g, `rgba(${150 + Math.floor(r() * 90)},${150},${150},${0.3 + r() * 0.5})`]] as [CanvasRenderingContext2D, string][]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2 + (r() - 0.5) * 14, x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke()
    }
  }
  for (let i = 0; i < 5000; i++) { b.g.fillStyle = `rgba(200,200,200,${r() * 0.16})`; b.g.fillRect(r() * S, r() * S, 2, 2) }   // 冰面上喷出来的小冰粒
  return { map: tex(a.c), rough: tex(b.c, false) }
}

/** 雪地：不用纯白（会过曝），用带蓝灰的白，上面是踩过、风吹过留下的深浅 */
export function makeSnow() {
  const S = 512, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#b4c0cd'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 300; i++) {
    const x = r() * S, y = r() * S, R = 12 + r() * 60, col = r() < 0.55 ? '206,216,226' : '140,156,176'
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, `rgba(${col},0.4)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) }
  }
  for (let i = 0; i < 7000; i++) { g.fillStyle = r() < 0.5 ? `rgba(228,236,244,${0.15 + r() * 0.3})` : `rgba(120,138,160,${0.08 + r() * 0.14})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  return tex(c)
}

/** 木纹：顺着 x 方向的长纹，偶尔有一个节疤。base 是底色，dark 是纹路的颜色（"r,g,b"） */
export function makeWood(base: string, dark: string, seed = 5, knots = 2) {
  const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 150; i++) {
    const y = r() * H, amp = 1 + r() * 4, ph = r() * 6, k = 1 + Math.floor(r() * 2)
    g.strokeStyle = `rgba(${dark},${0.05 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 2.2; g.beginPath()
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x / W * Math.PI * 2 * k + ph) * amp)
    g.stroke()
  }
  for (let i = 0; i < knots; i++) { const x = r() * W, y = 30 + r() * (H - 60); for (let k = 5; k > 0; k--) { g.strokeStyle = `rgba(${dark},${0.12 + 0.07 * (5 - k)})`; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y, k * 5, k * 2.2, 0, 0, 7); g.stroke() } }
  return tex(c)
}

/** 木板墙、木地板：一条条横着的木板，板缝深一点，每块深浅略有不同 */
export function makePlanks(base: [number, number, number], seed = 4) {
  const S = 512, { c, g } = canvas(S), r = rng(seed), n = 8, h = S / n
  for (let i = 0; i < n; i++) {
    const k = 0.86 + r() * 0.24; g.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`; g.fillRect(0, i * h, S, h)
    for (let j = 0; j < 26; j++) { g.strokeStyle = `rgba(40,26,14,${0.05 + r() * 0.12})`; g.lineWidth = 0.6 + r() * 1.6; const y = i * h + 3 + r() * (h - 6); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(S / 3, y + (r() - 0.5) * 8, S * 2 / 3, y + (r() - 0.5) * 8, S, y); g.stroke() }
    g.fillStyle = 'rgba(24,16,10,0.6)'; g.fillRect(0, i * h, S, 2.5)
    const cut = r() * S; g.fillRect(cut, i * h, 2.5, h)                       // 板和板对接的地方
    for (const x of [cut - 9, cut + 11]) { g.fillStyle = 'rgba(30,30,34,0.7)'; g.beginPath(); g.arc(x, i * h + h / 2, 2.2, 0, 7); g.fill() }   // 钉子
  }
  return tex(c)
}

/** 毛巾：一圈圈的毛圈，两头各有一道织带；棉布：平纹，经纬线看得出来。同一张图也当凹凸用 */
export function makeCloth(kind: 'towel' | 'cotton') {
  const S = 256, { c, g } = canvas(S), r = rng(kind === 'towel' ? 21 : 33)
  if (kind === 'towel') {
    g.fillStyle = '#a85f48'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(214,150,124,${0.35 + r() * 0.4})` : `rgba(104,48,34,${0.25 + r() * 0.35})`; g.beginPath(); g.arc(r() * S, r() * S, 0.8 + r() * 1.5, 0, 7); g.fill() }
  } else {
    g.fillStyle = '#9fb3c4'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < S; i += 4) { g.fillStyle = `rgba(226,236,244,${0.28 + r() * 0.2})`; g.fillRect(i, 0, 2, S); g.fillStyle = `rgba(70,90,110,${0.2 + r() * 0.16})`; g.fillRect(0, i, S, 2) }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(240,246,250,${r() * 0.2})`; g.fillRect(r() * S, r() * S, 2, 2) }
  }
  return tex(c)
}

/** 花岗岩：灰底上密密的黑白斑点 */
export function makeGranite() {
  const S = 256, { c, g } = canvas(S), r = rng(17)
  g.fillStyle = '#7c8086'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5200; i++) { const v = r(); g.fillStyle = v < 0.42 ? `rgba(28,30,34,${0.35 + r() * 0.5})` : v < 0.8 ? `rgba(214,216,220,${0.3 + r() * 0.5})` : `rgba(150,120,110,${0.3 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * S, r() * S, 0.7 + r() * 2.2, 0.6 + r() * 1.6, r() * 3, 0, 7); g.fill() }
  return tex(c)
}

/** 木箱的一面：几块竖板、四周一圈边框、一条斜撑 */
export function makeCrate() {
  const S = 256, { c, g } = canvas(S), r = rng(29)
  for (let i = 0; i < 5; i++) { const k = 0.88 + r() * 0.2; g.fillStyle = `rgb(${176 * k},${134 * k},${82 * k})`; g.fillRect(i * S / 5, 0, S / 5, S); g.fillStyle = 'rgba(50,32,16,0.55)'; g.fillRect(i * S / 5, 0, 2, S) }
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(70,44,20,${0.06 + r() * 0.14})`; g.lineWidth = 1 + r(); const x = r() * S; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 10, S); g.stroke() }
  g.save(); g.translate(S / 2, S / 2); g.rotate(Math.PI / 4); g.fillStyle = '#b98c56'; g.fillRect(-S, -15, S * 2, 30); g.strokeStyle = 'rgba(50,32,16,0.6)'; g.lineWidth = 2; g.strokeRect(-S, -15, S * 2, 30); g.restore()
  g.fillStyle = '#c0935c'; for (const [x, y, w, h] of [[0, 0, S, 30], [0, S - 30, S, 30], [0, 0, 30, S], [S - 30, 0, 30, S]]) { g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(50,32,16,0.6)'; g.strokeRect(x + 1, y + 1, w - 2, h - 2) }
  g.fillStyle = '#3a3d42'; for (const [x, y] of [[15, 15], [S - 15, 15], [15, S - 15], [S - 15, S - 15]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill() }
  return tex(c)
}

/** 一张写着字的牌子：底色、字的颜色、几行字 */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 160) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
  lines.forEach((s, i) => { g.font = `700 ${i ? h * 0.2 : h * (lines.length > 1 ? 0.36 : 0.5)}px sans-serif`; g.fillText(s, w / 2, lines.length > 1 ? h * (0.36 + i * 0.36) : h / 2) })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
