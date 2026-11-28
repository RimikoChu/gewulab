// 细胞膜的造型：把一条轮廓线绕 x 轴转出一层有厚度的膜，可以只转一部分角度，缺口处露出膜的断面（磷脂双分子层）。
// 轴突、突触小体、突触后的那一段都用它做，所以各处的膜是同一个样子。还有膜表面和断面用的贴图。
import * as THREE from 'three'

export type XR = [number, number]
const D = Math.PI / 180
/** 朝镜头剖开的缺口：从前下方 35° 到正上方。角度从 +z（朝前）往 +y（朝上）量 */
export const CUT: [number, number] = [90 * D, 325 * D]
export const LID: [number, number] = [-35 * D, 90 * D]

/** 轮廓线加密：过各点的光滑曲线，每 step 取一点 */
export function smoothProfile(pts: XR[], step = 0.4): XR[] {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal')
  const n = Math.max(8, Math.round(c.getLength() / step))
  return c.getSpacedPoints(n).map(p => [p.x, Math.max(0, p.y)] as XR)
}

/**
 * profile：外表面的轮廓 [x, 半径]，沿 +x；t：膜厚；phi：保留的角度范围。
 * 返回三块：outer 外表面、inner 内表面、cut 两个缺口上的断面（uv：u 沿轮廓的长度，v 从外 0 到内 1）
 */
export function revolveShell(profile: XR[], t: number, phi: [number, number] = [0, Math.PI * 2], segs = 72) {
  const n = profile.length, full = Math.abs(phi[1] - phi[0] - Math.PI * 2) < 1e-6
  // 每个点的外法线（在 x–r 平面里）、内表面上对应的点、沿轮廓的长度
  const N: XR[] = [], inn: XR[] = [], len: number[] = [0]
  for (let i = 0; i < n; i++) {
    const a = profile[Math.max(0, i - 1)], b = profile[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tr = b[1] - a[1], l = Math.hypot(tx, tr) || 1
    N.push([-tr / l, tx / l]); inn.push([profile[i][0] - t * (-tr / l), Math.max(0, profile[i][1] - t * (tx / l))])
    if (i) len.push(len[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
  }
  const surface = (P: XR[], sign: number) => {
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []
    for (let i = 0; i < n; i++) for (let j = 0; j <= segs; j++) {
      const f = phi[0] + (phi[1] - phi[0]) * j / segs, s = Math.sin(f), c = Math.cos(f)
      pos.push(P[i][0], P[i][1] * s, P[i][1] * c); nor.push(sign * N[i][0], sign * N[i][1] * s, sign * N[i][1] * c); uv.push(len[i], f * 2)
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1
      if (sign < 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx)
    return g
  }
  const outer = surface(profile, 1), inner = surface(inn, -1)
  const cut = new THREE.BufferGeometry()
  if (!full) {
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []
    for (const [f, sgn] of [[phi[0], -1], [phi[1], 1]] as const) {
      const s = Math.sin(f), c = Math.cos(f), base = pos.length / 3
      for (let i = 0; i < n; i++) {
        pos.push(profile[i][0], profile[i][1] * s, profile[i][1] * c, inn[i][0], inn[i][1] * s, inn[i][1] * c)
        nor.push(0, sgn * c, -sgn * s, 0, sgn * c, -sgn * s); uv.push(len[i], 0, len[i], 1)
      }
      for (let i = 0; i < n - 1; i++) { const a = base + i * 2; if (sgn > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    }
    cut.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cut.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); cut.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cut.setIndex(idx)
  }
  return { outer, inner, cut }
}

const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const }
/** 膜表面的凹凸：一颗颗紧挨着的磷脂分子的头 */
export function lipidBump() {
  const [c, g] = canvas(256, 256); g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, 256, 256)
  const k = 12, s = 256 / k
  for (let j = 0; j < k * 2; j++) for (let i = 0; i < k; i++) {
    const x = (i + (j % 2) * 0.5) * s, y = j * s * 0.5
    for (const dx of [0, 256]) { const r = g.createRadialGradient(x + dx - 256 * (x > 250 ? 1 : 0), y, 0, x + dx - 256 * (x > 250 ? 1 : 0), y, s * 0.52); r.addColorStop(0, '#e8e8e8'); r.addColorStop(1, 'rgba(110,110,110,0)'); g.fillStyle = r; g.beginPath(); g.arc(x + dx - 256 * (x > 250 ? 1 : 0), y, s * 0.52, 0, 7); g.fill() }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.6); return t
}
/** 膜的断面：两排头朝外的磷脂分子，尾巴朝里 */
export function bilayerMap(head = '#efe6ff', tail = '#f0c66a', bg = '#4a3d63') {
  const [c, g] = canvas(256, 128); g.fillStyle = bg; g.fillRect(0, 0, 256, 128)
  const k = 8, s = 256 / k
  for (let i = 0; i < k; i++) {
    const x = (i + 0.5) * s
    g.strokeStyle = tail; g.lineWidth = 4.5; g.lineCap = 'round'
    for (const [y0, y1] of [[30, 60], [98, 68]]) for (const d of [-6, 6]) { g.beginPath(); g.moveTo(x + d, y0); g.quadraticCurveTo(x + d * 1.9, (y0 + y1) / 2, x + d * 0.7, y1); g.stroke() }
    for (const y of [17, 111]) { const r = g.createRadialGradient(x - 4, y - 4, 1, x, y, 15); r.addColorStop(0, '#ffffff'); r.addColorStop(0.5, head); r.addColorStop(1, '#a99ad0'); g.fillStyle = r; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill() }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(1 / 0.8, 1); t.anisotropy = 8; return t
}
/** 一个字符的小贴图（正号、负号） */
export function glyph(ch: string, color: string) {
  const [c, g] = canvas(64, 64); g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 5
  g.font = '700 56px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(ch, 32, 34); g.fillText(ch, 32, 34)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

/** 一根两头粗细不同的管子 */
export function taper(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 24, radial = 10) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial), p = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) { curve.getPointAt(i / segs, c); const r = r0 + (r1 - r0) * i / segs; for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z) } }
  g.computeVertexNormals(); return g
}
/** 有起伏的团块（蛋白质、线粒体）：r 三个半轴，amp 起伏的幅度 */
export function blob(r: [number, number, number], amp = 0.12, seed = 1, seg = 28) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), p = g.attributes.position
  const h = (x: number, y: number, z: number) => Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + seed * 1.7) * Math.sin(z * 3.3 + seed * 0.6) + 0.5 * Math.sin(x * 6.3 + y * 5.1 + seed) * Math.sin(z * 5.7 - y * 4.3)
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amp * h(x, y, z); p.setXYZ(i, x * r[0] * k, y * r[1] * k, z * r[2] * k) }
  g.computeVertexNormals(); return g
}
