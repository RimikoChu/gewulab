// 程序画出来的贴图：冰面、雪地、橡胶地垫、砌块墙、球网、台面、海绵、牌子上的字。不用下载素材。
import * as THREE from 'three'

const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
/** 同一张贴图只建一次 */
export function once<T>(f: () => T) { let v: T | undefined; return () => (v ??= f()) }
/** 复制一张贴图并改重复次数 */
export function rep(t: THREE.Texture, x: number, y: number) { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }

/** 冰面：带一点蓝的白底，底下透出深浅；粗糙度图上是冰刀划出来的弧线和细痕（越亮越毛） */
export const iceTex = once(() => {
  const S = 1024, a = canvas(S), b = canvas(S), r = rng(5)
  a.g.fillStyle = '#c3d6e2'; a.g.fillRect(0, 0, S, S); b.g.fillStyle = '#1e1e1e'; b.g.fillRect(0, 0, S, S)
  for (let i = 0; i < 140; i++) {
    const x = r() * S, y = r() * S, R = 50 + r() * 130, q = a.g.createRadialGradient(x, y, 0, x, y, R)
    q.addColorStop(0, r() < 0.5 ? 'rgba(232,242,248,0.45)' : 'rgba(158,186,204,0.35)'); q.addColorStop(1, 'rgba(195,214,226,0)'); a.g.fillStyle = q; a.g.fillRect(x - R, y - R, R * 2, R * 2)
  }
  // 冰刀留下的弧线：长而弯，方向杂乱
  for (let i = 0; i < 520; i++) {
    const x = r() * S, y = r() * S, R = 60 + r() * 400, a0 = r() * 6.3, da = 0.15 + r() * 0.7, w = 0.5 + r() * 1.2
    for (const [g, col] of [[a.g, `rgba(244,250,253,${0.1 + r() * 0.25})`], [b.g, `rgba(${140 + Math.floor(r() * 100)},150,150,${0.3 + r() * 0.5})`]] as [CanvasRenderingContext2D, string][]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, R, a0, a0 + da); g.stroke() }
  }
  for (let i = 0; i < 4200; i++) { b.g.fillStyle = `rgba(200,200,200,${r() * 0.14})`; b.g.fillRect(r() * S, r() * S, 2, 2) }
  return { map: tex(a.c), rough: tex(b.c, false) }
})

/** 雪地：带蓝灰的白（纯白会过曝），上面是风吹过、踩过留下的深浅 */
export const snowTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#b6c2ce'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 280; i++) {
    const x = r() * S, y = r() * S, R = 14 + r() * 60, col = r() < 0.55 ? '208,218,228' : '142,158,178'
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, `rgba(${col},0.4)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) }
  }
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? `rgba(230,238,246,${0.15 + r() * 0.3})` : `rgba(122,140,162,${0.08 + r() * 0.14})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  return tex(c)
})

/** 橡胶地垫：深色底上撒着彩色的小颗粒，一米见方一块，块和块之间有细缝 */
export const rubberTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#2b3138'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.6 ? `rgba(130,142,156,${0.25 + r() * 0.4})` : v < 0.85 ? `rgba(70,120,170,${0.3 + r() * 0.4})` : `rgba(20,22,26,${0.4 + r() * 0.4})`; g.fillRect(r() * S, r() * S, 1 + r() * 2.2, 1 + r() * 2.2) }
  g.strokeStyle = 'rgba(10,12,14,0.8)'; g.lineWidth = 3; g.strokeRect(0, 0, S, S)
  return tex(c)
})

/** 砌块墙：刷了漆的混凝土砌块，错缝，下面一截深色墙裙由颜色参数决定 */
export function makeBlocks(base: [number, number, number], seed = 3) {
  const W = 512, H = 512, { c, g } = canvas(W, H), r = rng(seed), rows = 8, bh = H / rows, bw = W / 4
  for (let j = 0; j < rows; j++) for (let i = -1; i < 5; i++) {
    const k = 0.93 + r() * 0.12, x = i * bw + (j % 2 ? bw / 2 : 0)
    g.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`; g.fillRect(x, j * bh, bw, bh)
    g.fillStyle = 'rgba(30,34,40,0.45)'; g.fillRect(x, j * bh, bw, 2.5); g.fillRect(x, j * bh, 2.5, bh)
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x + 2.5, j * bh + 2.5, bw, 1.5)
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.06})` : `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * W, r() * H, 2, 2) }
  return tex(c)
}

/** 球网、围网：透明底上的方格线（当透明度贴图和颜色贴图用） */
export const netTex = once(() => {
  const S = 128, { c, g } = canvas(S)
  g.clearRect(0, 0, S, S); g.strokeStyle = '#f2f4f5'; g.lineWidth = 9
  g.beginPath(); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke()
  return tex(c)
})

/** 实验台的台面：近黑的理化板，带一点细麻点；同一张图当粗糙度用 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(23)
  g.fillStyle = '#34383d'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5000; i++) { g.fillStyle = r() < 0.5 ? `rgba(120,128,138,${r() * 0.25})` : `rgba(8,9,10,${r() * 0.3})`; g.fillRect(r() * S, r() * S, 1.5, 1.5) }
  return tex(c)
})

/** 海绵：黄色底上密密的小孔 */
export const spongeTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(31)
  g.fillStyle = '#e3c04e'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.7 ? `rgba(128,92,20,${0.25 + r() * 0.45})` : `rgba(255,236,150,${0.3 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * S, r() * S, 0.8 + r() * 2.6, 0.8 + r() * 2, r() * 3, 0, 7); g.fill() }
  return tex(c)
})

/** 花岗岩：灰底上密密的黑白斑点（冰壶的壶体） */
export const graniteTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(17)
  g.fillStyle = '#80848a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5200; i++) { const v = r(); g.fillStyle = v < 0.42 ? `rgba(28,30,34,${0.35 + r() * 0.5})` : v < 0.8 ? `rgba(216,218,222,${0.3 + r() * 0.5})` : `rgba(150,122,112,${0.3 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * S, r() * S, 0.7 + r() * 2.2, 0.6 + r() * 1.6, r() * 3, 0, 7); g.fill() }
  return tex(c)
})

/** 木纹：顺着 x 方向的长纹（球杆、长板） */
export function makeWood(base: string, dark: string, seed = 5) {
  const W = 512, H = 128, { c, g } = canvas(W, H), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 90; i++) {
    const y = r() * H, amp = 1 + r() * 3, ph = r() * 6
    g.strokeStyle = `rgba(${dark},${0.06 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 2; g.beginPath()
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x / W * Math.PI * 2 + ph) * amp)
    g.stroke()
  }
  return tex(c)
}

/** 一张写着字的牌子：底色、字的颜色、几行字（第一行大） */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 160) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
  lines.forEach((s, i) => { g.font = `700 ${i ? h * 0.2 : h * (lines.length > 1 ? 0.36 : 0.5)}px sans-serif`; g.fillText(s, w / 2, lines.length > 1 ? h * (0.36 + i * 0.36) : h / 2) })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** 刻度尺：白底黑线，每 1 cm 一小格、每 10 cm 一个数。len 是总长（cm），沿贴图的竖直方向从下往上 */
export function makeScale(len: number) {
  const W = 64, H = 1024, { c, g } = canvas(W, H)
  g.fillStyle = '#f1efe6'; g.fillRect(0, 0, W, H); g.fillStyle = '#16191d'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.font = '700 22px sans-serif'
  for (let i = 0; i <= len; i++) { const y = H - i / len * H, big = i % 10 === 0, mid = i % 5 === 0; g.fillRect(0, y - (big ? 1.5 : 0.75), big ? 30 : mid ? 22 : 14, big ? 3 : 1.5); if (big && i > 0 && i < len) g.fillText(String(i), W - 3, y) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** 气垫导轨的轨面：银白的铝面上两排细小的气孔 */
export const holesTex = once(() => {
  const W = 256, H = 64, { c, g } = canvas(W, H)
  g.fillStyle = '#c3c7cb'; g.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 2) { g.fillStyle = `rgba(90,96,102,${0.04 + (y % 5) * 0.02})`; g.fillRect(0, y, W, 1) }
  g.fillStyle = '#15171a'; for (let x = 8; x < W; x += 16) for (const y of [20, 44]) { g.beginPath(); g.arc(x + (y > 30 ? 8 : 0), y, 2.6, 0, 7); g.fill() }
  return tex(c)
})

/** 横着用的刻度尺（导轨底梁上的那条）：每 1 cm 一小格、每 10 cm 一个数，数字是正的。len 是总长（cm），沿贴图的水平方向从左往右 */
export function makeScaleH(len: number) {
  const W = 2048, H = 40, { c, g } = canvas(W, H)
  g.fillStyle = '#f1efe6'; g.fillRect(0, 0, W, H); g.fillStyle = '#16191d'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.font = '700 19px sans-serif'
  for (let i = 0; i <= len; i++) { const x = i / len * W, big = i % 10 === 0, mid = i % 5 === 0; g.fillRect(x - (big ? 1.2 : 0.6), 0, big ? 2.4 : 1.2, big ? 16 : mid ? 12 : 8); if (big && i > 0 && i < len) g.fillText(String(i), x, H + 1) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
