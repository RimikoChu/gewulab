// 拼器材用的实心零件：车削件、有壁厚的容器、带倒角的圆盘、一圈螺栓。
// 都返回闭合的实体（剖开不是空壳），尺寸按米，转轴是 y。
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** 截面上的一个点：[到转轴的距离, 高度] */
export type RY = [number, number]

interface Opt { segs?: number; crease?: number; closed?: boolean }

/**
 * 车削：把一条截面线绕 y 轴转一圈。
 * 和 three 自带的 LatheGeometry 不同：拐角大于 crease（度）的地方保持硬边，小于的地方才抹平，
 * 所以杯口、台阶、倒角是清楚的棱，圆弧还是圆的。
 * 截面按“外面在右手边”的方向走：外壁从下往上，内壁从上往下。closed 为真时首尾相接。
 */
export function lathe(profile: RY[], { segs = 48, crease = 32, closed = false }: Opt = {}) {
  const n = profile.length, m = closed ? n : n - 1
  // 每一段朝外的法线
  const sn: RY[] = []
  for (let i = 0; i < m; i++) {
    const a = profile[i], b = profile[(i + 1) % n], dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1
    sn.push([dy / l, -dr / l])
  }
  const cos = Math.cos(crease * Math.PI / 180)
  // 每一段两头各用哪个顶点：拐得缓就共用一个（法线取平均），拐得急就各用各的
  const vs: { r: number; y: number; nr: number; ny: number }[] = [], ends: [number, number][] = sn.map(() => [0, 0])
  for (let i = 0; i < n; i++) {
    const prev = closed ? (i - 1 + m) % m : i - 1, next = i < m ? i : -1
    const [r, y] = profile[i]
    if (prev >= 0 && next >= 0 && sn[prev][0] * sn[next][0] + sn[prev][1] * sn[next][1] > cos) {
      const nr = sn[prev][0] + sn[next][0], ny = sn[prev][1] + sn[next][1], l = Math.hypot(nr, ny) || 1
      ends[prev][1] = ends[next][0] = vs.push({ r, y, nr: nr / l, ny: ny / l }) - 1
    } else {
      if (prev >= 0) ends[prev][1] = vs.push({ r, y, nr: sn[prev][0], ny: sn[prev][1] }) - 1
      if (next >= 0) ends[next][0] = vs.push({ r, y, nr: sn[next][0], ny: sn[next][1] }) - 1
    }
  }
  const cols = segs + 1, pos = new Float32Array(vs.length * cols * 3), nor = new Float32Array(vs.length * cols * 3), uv = new Float32Array(vs.length * cols * 2)
  let len = 0; const along = vs.map((v, i) => (len += i ? Math.hypot(v.r - vs[i - 1].r, v.y - vs[i - 1].y) : 0))
  vs.forEach((v, i) => {
    for (let j = 0; j < cols; j++) {
      const t = j / segs * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), k = i * cols + j
      pos.set([v.r * c, v.y, -v.r * s], k * 3); nor.set([v.nr * c, v.ny, -v.nr * s], k * 3); uv.set([j / segs, len ? along[i] / len : 0], k * 2)
    }
  })
  const idx: number[] = []
  ends.forEach(([a, b]) => {
    for (let j = 0; j < segs; j++) {
      const a0 = a * cols + j, a1 = a0 + 1, b0 = b * cols + j, b1 = b0 + 1
      if (vs[a].r > 1e-9) idx.push(a0, a1, b1)       // 贴在转轴上的那一头缩成一个点，不出三角形
      if (vs[b].r > 1e-9) idx.push(a0, b1, b0)
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/**
 * 有壁厚的容器或罩子：给出外壁的截面线（从下往上），向里收 t 得到内壁，合成一个实体。
 * 例：烧杯 shell([[0, 0], [0.04, 0], [0.04, 0.1]], 0.002)；截面起点在转轴上就是有底的，不在就是两头通的管。
 */
export function shell(outer: RY[], t: number, opt: Omit<Opt, 'closed'> = {}) {
  const n = outer.length, sn: RY[] = []
  for (let i = 0; i < n - 1; i++) { const dr = outer[i + 1][0] - outer[i][0], dy = outer[i + 1][1] - outer[i][1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]) }
  const inner: RY[] = outer.map(([r, y], i) => {
    const a = sn[Math.max(0, i - 1)], b = sn[Math.min(n - 2, i)], k = t / Math.max(0.25, 1 + a[0] * b[0] + a[1] * b[1])   // 拐角处按斜接收进去，壁厚处处一样
    return [r < 1e-9 ? 0 : Math.max(0, r - (a[0] + b[0]) * k), y - (a[1] + b[1]) * k]
  })
  const onAxis = outer[0][0] < 1e-9
  return lathe([...outer, ...inner.reverse()], { ...opt, closed: !onAxis })
}

/** 带倒角的圆盘或圆环：r 外半径，h 厚，hole 中间的孔，chamfer 倒角（默认取较小尺寸的 8%）。底面在 y = 0 */
export function disc(r: number, h: number, { hole = 0, chamfer = Math.min(r - hole, h) * 0.08, segs = 48 }: { hole?: number; chamfer?: number; segs?: number } = {}) {
  const c = chamfer, p: RY[] = [[hole, 0], [r - c, 0], [r, c], [r, h - c], [r - c, h], [hole, h]]
  return lathe(p, { segs, closed: hole > 0 })
}

/** 一圈螺栓头：n 颗，分布在半径 R 的圆上，六角头对边宽 size、高 h，底面在 y = 0。合成一个模型 */
export function bolts(n: number, R: number, size: number, h = size * 0.6) {
  return mergeGeometries(Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2, g = new THREE.CylinderGeometry(size / Math.sqrt(3), size / Math.sqrt(3), h, 6)
    g.rotateY(a); g.translate(R * Math.cos(a), h / 2, -R * Math.sin(a))
    return g
  }))
}

/** 闭合实体的体积（m³）。面朝外时为正：拿它检查零件是不是真的闭合、有没有翻面，也能乘密度算质量 */
export function volume(g: THREE.BufferGeometry) {
  const p = g.attributes.position, idx = g.index, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  let v = 0
  for (let i = 0, m = idx ? idx.count : p.count; i < m; i += 3) {
    a.fromBufferAttribute(p, idx ? idx.getX(i) : i); b.fromBufferAttribute(p, idx ? idx.getX(i + 1) : i + 1); c.fromBufferAttribute(p, idx ? idx.getX(i + 2) : i + 2)
    v += a.dot(b.cross(c)) / 6
  }
  return v
}
