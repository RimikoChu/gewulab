// 程序画出来的贴图：化学实验室的地砖、墙裙、理化板台面、试剂瓶标签、玻璃器皿上的刻度、元素周期表挂图。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'

/** 地砖：米灰色的 60 cm 方砖，一张图四块 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 196 + Math.floor(r() * 10); g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,116,108' : '250,248,242'},${0.06 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8f8b84'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})
/** 墙裙：白色 15 cm 小方瓷砖，灰白的勾缝，釉面有一点明暗 */
export const wallTileTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#c4c8c5'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 234 + Math.floor(r() * 10); const q = g.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); q.addColorStop(0, `rgb(${v},${v + 1},${v})`); q.addColorStop(1, `rgb(${v - 9},${v - 8},${v - 9})`); g.fillStyle = q; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60) }
  return tex(c)
})
/** 实验台面：黑色的理化板，细小的灰斑 */
export const benchTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#25292c'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 80; i++) { const x = r() * S, y = r() * S, R = 14 + r() * 50; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(10,12,14,0.25)' : 'rgba(70,76,80,0.18)'); q.addColorStop(1, 'rgba(40,44,48,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '8,10,12' : '110,116,120'},${0.1 + r() * 0.14})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})
/** 抹灰的墙：近白，极淡的斑驳 */
export const plasterTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(31)
  g.fillStyle = '#e9e9e4'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(200,200,192,0.25)' : 'rgba(255,255,250,0.3)'); q.addColorStop(1, 'rgba(230,230,224,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  return tex(c)
})

/** 试剂瓶的标签：白底，上下两条色带，中间一行字 */
const labelCache = new Map<string, THREE.CanvasTexture>()
export function bottleLabel(text: string, band = '#2f6fb3', sub = '') {
  const key = text + band + sub, hit = labelCache.get(key); if (hit) return hit
  const W = 256, H = 160, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 24); g.fillRect(0, H - 12, W, 12)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${text.length > 4 ? 36 : 46}px ${FONT}`; g.fillText(text, W / 2, sub ? 74 : 86, W - 16)
  if (sub) { g.font = `500 24px ${FONT}`; g.fillStyle = '#55585c'; g.fillText(sub, W / 2, 118, W - 16) }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  labelCache.set(key, t)
  return t
}

/**
 * 玻璃器皿上印的白色刻度：透明底。lo–hi 是刻度覆盖的读数范围，step 每一小格，major 每隔几格一条长线并写数。
 * 贴在一段弧面上，u 从左到右、v 从下到上，读数和 v 成正比。ink 是印刷的颜色（白墙前面用深蓝，看得清）；H 是贴图的高，按弧面的高宽比给，字才不会被压扁。
 */
const gradCache = new Map<string, THREE.CanvasTexture>()
export function gradTex(lo: number, hi: number, step: number, major: number, unit = 'mL', label = '', ink = '#ffffff', H = 1024) {
  const key = [lo, hi, step, major, unit, label, ink, H].join(), hit = gradCache.get(key); if (hit) return hit
  const W = 256, { c, g } = canvas(W, H)
  g.clearRect(0, 0, W, H); g.fillStyle = ink; g.strokeStyle = ink; g.textBaseline = 'middle'; g.textAlign = 'left'
  const n = Math.round((hi - lo) / step), pad = Math.round(H * 18 / 1024), y = (v: number) => H - pad - (v - lo) / (hi - lo) * (H - 2 * pad)
  for (let i = 0; i <= n; i++) {
    const v = lo + i * step, big = i % major === 0, mid = !big && major % 2 === 0 && i % (major / 2) === 0
    g.fillRect(14, y(v) - (big ? 3 : 1.5), big ? 92 : mid ? 66 : 44, big ? 6 : 3)
    if (big && v > lo) { g.font = '700 62px "Geist", sans-serif'; g.fillText(String(v), 114, y(v)) }
  }
  if (unit) { g.font = '600 40px "Geist", sans-serif'; g.fillText(unit, 114, pad + 24) }
  if (label) { g.font = `600 28px ${FONT}`; g.save(); g.translate(36, H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(label, 0, 0); g.restore() }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  gradCache.set(key, t)
  return t
}

/** 一块写字的牌子：底色、字色，lines 每行一句，第一行大 */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 160) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `700 ${Math.round(h * (lines.length > 1 ? 0.36 : 0.5))}px ${FONT}`; g.fillText(lines[0], w / 2, lines.length > 1 ? h * 0.36 : h / 2, w - 16)
  if (lines[1]) { g.font = `500 ${Math.round(h * 0.18)}px ${FONT}`; g.fillText(lines[1], w / 2, h * 0.75, w - 16) }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 规程牌：白底，一个标题、几条规矩 */
export function makeBoard(title: string, rules: string[], band = '#2a6f9e') {
  const W = 384, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 86)
  g.fillStyle = '#fff'; g.font = `700 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, W / 2, 44)
  g.fillStyle = '#2a2b2d'; g.textAlign = 'left'; g.font = `500 25px ${FONT}`
  rules.forEach((s, i) => { g.fillText(`${i + 1}. ${s}`, 24, 130 + i * 58, W - 40) })
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

// ---------- 元素周期表挂图 ----------
export const SYMBOLS = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ')
const NAMES = '氢氦锂铍硼碳氮氧氟氖钠镁铝硅磷硫氯氩钾钙钪钛钒铬锰铁钴镍铜锌镓锗砷硒溴氪铷锶钇锆铌钼锝钌铑钯银镉铟锡锑碲碘氙铯钡镧铈镨钕钷钐铕钆铽镝钬铒铥镱镥铪钽钨铼锇铱铂金汞铊铅铋钋砹氡钫镭锕钍镤铀镎钚镅锔锫锎锿镄钔锘铹'
/** 第 Z 号元素在挂图上的格子：[列 0–17, 行 0–9]（镧系、锕系单独放在下面两行） */
export function cellOf(Z: number): [number, number] {
  if (Z === 1) return [0, 0]
  if (Z === 2) return [17, 0]
  const rows: [number, number][] = [[3, 10], [11, 18], [19, 36], [37, 54], [55, 86], [87, 118]]
  for (let p = 0; p < rows.length; p++) {
    const [a, b] = rows[p]; if (Z < a || Z > b) continue
    const k = Z - a, row = p + 1
    if (p < 2) return [k < 2 ? k : k + 10, row]
    if (p < 4) return [k, row]
    if (k < 2) return [k, row]
    if (k < 17) return [k - 2 + 2, p === 4 ? 8 : 9]   // 镧系、锕系：第 3 列起排在下面
    return [k - 14, row]
  }
  return [0, 0]
}
const FAMILY = (Z: number) => [1, 6, 7, 8, 15, 16, 34].includes(Z) ? '#e4eef8' : [2, 10, 18, 36, 54, 86, 118].includes(Z) ? '#efe6f6' : [9, 17, 35, 53, 85, 117].includes(Z) ? '#e6f3ea' : [5, 14, 32, 33, 51, 52].includes(Z) ? '#f1f1df' : '#faefe2'
export const PT = { W: 2048, H: 1240, x0: 60, y0: 170, cw: 106, ch: 98 }
export const periodicTex = once(() => {
  const { c, g } = canvas(PT.W, PT.H)
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, PT.W, PT.H)
  g.fillStyle = '#1d4f7a'; g.fillRect(0, 0, PT.W, 120)
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 68px ${FONT}`; g.fillText('元素周期表', PT.W / 2, 62)
  for (let Z = 1; Z <= 118; Z++) {
    const [col, row] = cellOf(Z), x = PT.x0 + col * PT.cw + (col > 1 ? 0 : 0), y = PT.y0 + row * PT.ch + (row >= 8 ? 40 : 0)
    g.fillStyle = FAMILY(Z); g.fillRect(x + 3, y + 3, PT.cw - 6, PT.ch - 6)
    g.strokeStyle = '#9aa3ab'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, PT.cw - 6, PT.ch - 6)
    g.fillStyle = '#5b6168'; g.textAlign = 'left'; g.font = '600 20px "Geist", sans-serif'; g.fillText(String(Z), x + 10, y + 20)
    g.fillStyle = '#16191c'; g.textAlign = 'center'; g.font = '700 40px "Geist", sans-serif'; g.fillText(SYMBOLS[Z - 1], x + PT.cw / 2, y + 50)
    if (Z <= NAMES.length) { g.font = `500 21px ${FONT}`; g.fillStyle = '#33373b'; g.fillText(NAMES[Z - 1], x + PT.cw / 2, y + 80) }
  }
  g.fillStyle = '#5b6168'; g.textAlign = 'left'; g.font = `500 24px ${FONT}`
  g.fillText('镧系', PT.x0 + 10, PT.y0 + 8 * PT.ch + 40 + 50); g.fillText('锕系', PT.x0 + 10, PT.y0 + 9 * PT.ch + 40 + 50)
  return tex(c)
})
/** 周期表上第 Z 号元素的格子中心，按挂图的比例（0–1，左上角为原点） */
export function cellUV(Z: number): [number, number] {
  const [col, row] = cellOf(Z)
  return [(PT.x0 + (col + 0.5) * PT.cw) / PT.W, (PT.y0 + (row + 0.5) * PT.ch + (row >= 8 ? 40 : 0)) / PT.H]
}

/** 实验记录本摊开的两页：左页一张记录表，右页几行字迹 */
export const notebookTex = once(() => {
  const W = 1024, H = 712, { c, g } = canvas(W, H), r = rng(57)
  g.fillStyle = '#f5f2e8'; g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(W / 2 - 3, 0, 6, H)
  g.strokeStyle = 'rgba(80,110,160,0.35)'; g.lineWidth = 2
  for (let y = 70; y < H - 30; y += 34) { g.beginPath(); g.moveTo(30, y); g.lineTo(W / 2 - 30, y); g.moveTo(W / 2 + 30, y); g.lineTo(W - 30, y); g.stroke() }
  g.strokeStyle = '#3a4a6a'; g.lineWidth = 3; g.strokeRect(50, 110, 400, 238)
  for (const x of [180, 315]) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 348); g.stroke() }
  for (const y of [170, 230, 290]) { g.beginPath(); g.moveTo(50, y); g.lineTo(450, y); g.stroke() }
  g.fillStyle = '#28324a'; g.font = `600 30px ${FONT}`; g.fillText('实验记录', 60, 80)
  g.font = `500 24px ${FONT}`; ['现象', '结论'].forEach((s, i) => g.fillText(s, W / 2 + 40, 96 + i * 136))
  g.strokeStyle = 'rgba(40,50,74,0.75)'; g.lineWidth = 2.2
  for (let k = 0; k < 9; k++) { const y = 128 + k * 34 + (k > 3 ? 34 : 0); let x = W / 2 + 44; g.beginPath(); g.moveTo(x, y); while (x < W - 60 - r() * 160) { x += 8 + r() * 10; g.lineTo(x, y - 6 + r() * 10) } g.stroke() }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
})
