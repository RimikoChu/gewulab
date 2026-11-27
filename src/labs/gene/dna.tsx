// 染色体、DNA、细胞的模型（放大很多倍的示意）。
// 染色体不是光滑的棍子：一根染色单体是一条紧紧盘绕的染色质丝，两头圆、着丝粒处收细，表面有深浅相间的条纹；复制后的染色体是两条姐妹染色单体在着丝粒处连在一起。
// DNA 是两条长链盘成的双螺旋，中间是一对对碱基；一端缠在蛋白质上（这就是染色体“主要由 DNA 和蛋白质组成”）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { fuse, helix, lerp, place, rng, tint, tube, type V3 } from './parts'

// ---------- 染色单体 ----------
/**
 * 一根染色单体：沿 axis 这条曲线，染色质丝绕着它盘 turns 圈。rad 是粗细，cen 是着丝粒在全长上的位置（0–1）。
 * 颜色沿长度一段深一段浅（条纹），c0、c1 是深浅两色。
 */
export function chromatid(axis: V3[], rad: number, cen: number, c0: string, c1: string, seed = 1, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(axis.map(p => new THREE.Vector3(...p)), false, 'centripetal')
  const L = curve.getLength(), turns = Math.max(6, Math.round(L / (rad * 0.42))), N = turns * 8
  const fr = curve.computeFrenetFrames(N, false), P = new THREE.Vector3(), pts: THREE.Vector3[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const end = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, Math.abs(u - 0.5) * 2 - 0.86) / 0.14, 2)))   // 两头收圆
    const pinch = 1 - 0.55 * Math.exp(-Math.pow((u - cen) / 0.05, 2))                                       // 着丝粒处收细
    const k = rad * 0.52 * end * pinch, a = u * turns * Math.PI * 2
    curve.getPointAt(u, P)
    pts.push(P.clone().addScaledVector(fr.normals[i], Math.cos(a) * k).addScaledVector(fr.binormals[i], Math.sin(a) * k))
  }
  const g = tube(pts, rad * 0.46, rad * 0.3, c0, c0, radial, N * 2, 4)
  // 条纹：按到起点的距离分段着色
  const r = rng(seed), bands: number[] = [0]; while (bands[bands.length - 1] < 1) bands.push(bands[bands.length - 1] + 0.05 + r() * 0.09)
  const p = g.attributes.position, cl = g.attributes.color as THREE.BufferAttribute, A = new THREE.Color(c0), B = new THREE.Color(c1), c = new THREE.Color()
  const uvs = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) { const u = uvs.getY(i); let b = 0; while (b < bands.length - 1 && bands[b + 1] < u) b++; c.copy(b % 2 ? A : B).lerp(A, 0.15 * Math.sin(i)); cl.setXYZ(i, c.r, c.g, c.b) }
  return g
}
/** 一条直的单体染色体（没有复制的），沿 y，长 len，原点在中心 */
export const rod = (len: number, rad: number, cen: number, c0: string, c1: string, seed = 1) => chromatid([[0, -len / 2, 0], [0.02 * len, 0, 0], [0, len / 2, 0]], rad, cen, c0, c1, seed)
/** 复制后的染色体：两条姐妹染色单体，只在着丝粒处贴在一起，两臂微微张开（像 X） */
export function xChromosome(len: number, rad: number, cen: number, c0: string, c1: string, seed = 1) {
  const y0 = -len / 2, yc = lerp(-len / 2, len / 2, cen), list: THREE.BufferGeometry[] = []
  for (const s of [-1, 1]) {
    const off = (y: number) => s * (rad * 0.52 + rad * 0.7 * Math.pow(Math.abs(y - yc) / (len / 2), 1.3))
    const ys = [y0, lerp(y0, yc, 0.5), yc, lerp(yc, len / 2, 0.5), len / 2]
    list.push(chromatid(ys.map(y => [off(y), y, 0] as V3), rad, cen, c0, c1, seed + (s > 0 ? 0 : 7)))
  }
  return fuse(list)
}
/** 一组颜色：深浅两色 */
export const CHROMO_COLORS = { stain: ['#5b2a6e', '#8a4d9c'], dad: ['#2c5fa8', '#5f8fd6'], mom: ['#c4602a', '#e89a5a'], hi: ['#e8b62c', '#ffe07a'] } as const

// ---------- DNA ----------
const BASE_COLORS = { A: '#e0514a', T: '#e8c341', G: '#45a65a', C: '#3f78c8' } as const
type Base = keyof typeof BASE_COLORS
const PAIR: Record<Base, Base> = { A: 'T', T: 'A', G: 'C', C: 'G' }
/**
 * 一段 DNA 双螺旋：沿 +x，长 len，半径 R，每转 10 对碱基。返回两条链和碱基对（合成一个带顶点色的模型）。
 * from–to（0–1）之间的那一段单独返回（是一个基因，要亮起来）
 */
export function dnaGeo(len: number, R = 0.16, pitch = 0.42, seed = 3, from = 0.4, to = 0.72) {
  const turns = len / pitch, r = rng(seed), BP = Math.round(turns * 10)
  const strand = (ph: number, a: number, b: number, c0: string) => {
    const pts = helix(R, a * len, b * len, turns * (b - a), ph + turns * a * Math.PI * 2, Math.max(8, Math.round(turns * (b - a) * 18))).map(([x, y, z]) => [y, x, z] as V3)
    return tube(pts, R * 0.18, R * 0.18, c0, c0, 8, pts.length * 2)
  }
  const rungs = (a: number, b: number, glow: boolean) => {
    const out: THREE.BufferGeometry[] = []
    for (let i = Math.ceil(a * BP); i < b * BP; i++) {
      const t = (i + 0.5) / BP, ang = t * turns * Math.PI * 2, x = t * len
      const p1 = new THREE.Vector3(x, Math.cos(ang) * R, Math.sin(ang) * R), p2 = new THREE.Vector3(x, Math.cos(ang + Math.PI * 0.8) * R, Math.sin(ang + Math.PI * 0.8) * R)
      const k = ('ATGC'[Math.floor(r() * 4)]) as Base, mid = p1.clone().lerp(p2, 0.5)
      for (const [from, base] of [[p1, k], [p2, PAIR[k]]] as [THREE.Vector3, Base][]) {
        const d = mid.clone().sub(from), g = new THREE.CylinderGeometry(R * 0.07, R * 0.07, d.length() * 0.96, 6)
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate(...from.clone().lerp(mid, 0.5).toArray())
        out.push(tint(g, glow ? new THREE.Color(BASE_COLORS[base]).lerp(new THREE.Color('#ffffff'), 0.25) : BASE_COLORS[base]))
      }
    }
    return out
  }
  const sc = '#d9dee4', hc = '#ffe07a'
  const plain = fuse([strand(0, 0, from, sc), strand(Math.PI * 0.8, 0, from, sc), strand(0, to, 1, sc), strand(Math.PI * 0.8, to, 1, sc), ...rungs(0, from, false), ...rungs(to, 1, false)])
  const gene = fuse([strand(0, from, to, hc), strand(Math.PI * 0.8, from, to, hc), ...rungs(from, to, true)])
  return { plain, gene }
}
/** DNA 缠在一串蛋白质上（核小体）：每个蛋白质是一个扁圆的“线轴”，DNA 在上面绕不到两圈。沿 +x，从 0 到 len */
export function beadsGeo(len: number, n: number, R = 0.24) {
  const beads: THREE.BufferGeometry[] = [], wire: V3[] = [], step = len / n
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * step, cy = Math.sin(i * 1.7) * 0.08, cz = Math.cos(i * 1.3) * 0.08
    const b = new THREE.SphereGeometry(1, 20, 14); b.scale(R * 0.62, R, R)
    beads.push(place(tint(b, '#8a6fb5', '#a58cc9'), [cx, cy, cz]))
    for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2 * 1.7 - Math.PI / 2, x = cx - R * 0.45 + k / 24 * R * 0.9; wire.push([x, cy + Math.cos(a) * R * 1.05, cz + Math.sin(a) * R * 1.05]) }
  }
  return { beads: fuse(beads), wire: tube(wire, R * 0.13, R * 0.13, '#d9dee4', '#d9dee4', 6, wire.length * 3) }
}

// ---------- 细胞 ----------
/** 根尖分生区的一个细胞：近似方形，外面一层细胞壁（半透明），中间一个大细胞核；剖开朝镜头的一面 */
export function rootCellGeo(w = 2.4, h = 2.1, d = 1.6) {
  const g = new RoundedBoxGeometry(w, h, d, 4, 0.22), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), k = 1 + 0.025 * Math.sin(x * 3.1 + y * 2.3); p.setXYZ(i, x * k, y * k, p.getZ(i)) }
  g.computeVertexNormals()
  return g
}
/** 细胞核里 14 条复制好的染色体（分裂前期，凝缩成 X 形）：每对用同一个长度，摆在核里不重叠 */
export function nucleusChromosomes(lens: number[], scale: number, colors: readonly [string, string] = CHROMO_COLORS.stain) {
  const r = rng(14), list: THREE.BufferGeometry[] = [], spots: V3[] = []
  lens.forEach((L, i) => {
    for (let s = 0; s < 2; s++) {
      let at: V3 = [0, 0, 0]
      for (let tries = 0; tries < 60; tries++) {
        const a = r() * Math.PI * 2, q = Math.sqrt(r()) * 0.62 * scale, z = (r() - 0.5) * 0.4 * scale
        at = [Math.cos(a) * q, Math.sin(a) * q, z]
        if (spots.every(o => Math.hypot(o[0] - at[0], o[1] - at[1], o[2] - at[2]) > 0.3 * scale)) break
      }
      spots.push(at)
      list.push(place(xChromosome(L * 0.42 * scale, 0.07 * scale, 0.42, colors[0], colors[1], i * 3 + s), at, r() * 6, r() * 2, 1, r() * 6))
    }
  })
  return { geo: fuse(list), spots }
}
/** 剖开的细胞核：双层的核膜只画四分之三圈，朝镜头的一面开着；膜上有核孔 */
export function NucleusShell({ R, opacity = 0.5 }: { R: number; opacity?: number }) {
  const g = useMemo(() => {
    const outer = new THREE.SphereGeometry(R, 48, 32, Math.PI * 0.8, Math.PI * 1.4), inner = new THREE.SphereGeometry(R * 0.95, 48, 32, Math.PI * 0.8, Math.PI * 1.4)
    const pores: THREE.BufferGeometry[] = [], r = rng(2)
    for (let i = 0; i < 70; i++) {
      const phi = Math.PI * 0.8 + r() * Math.PI * 1.4, th = Math.acos(1 - 2 * r()), n = new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th))
      const t = new THREE.TorusGeometry(R * 0.035, R * 0.012, 6, 12); t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)); t.translate(...n.multiplyScalar(R * 1.005).toArray())
      pores.push(t)
    }
    return { outer, inner, pores: mergeGeometries(pores) }
  }, [R])
  return <group>
    <mesh geometry={g.outer}><meshPhysicalMaterial color="#b9a6d6" roughness={0.35} clearcoat={0.6} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh geometry={g.inner}><meshPhysicalMaterial color="#d8cce8" roughness={0.4} transparent opacity={opacity * 0.6} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh geometry={g.pores}><meshStandardMaterial color="#7d64a6" roughness={0.5} /></mesh>
  </group>
}
/** 染色体用的材质：顶点色，略有光泽 */
export const ChromoMat = ({ glow = 0, opacity = 1 }: { glow?: number; opacity?: number }) =>
  <meshPhysicalMaterial vertexColors roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.35} emissive="#ffffff" emissiveIntensity={glow} transparent={opacity < 1} opacity={opacity} />

/** 人的 23 对染色体的相对长度（示意，大致按从大到小排；X 中等，Y 小） */
export const HUMAN_LEN = [1, 0.96, 0.8, 0.76, 0.72, 0.68, 0.63, 0.58, 0.56, 0.54, 0.54, 0.53, 0.44, 0.42, 0.4, 0.36, 0.33, 0.31, 0.27, 0.26, 0.19, 0.2]
export const HUMAN_CEN = [0.48, 0.38, 0.47, 0.28, 0.27, 0.36, 0.36, 0.32, 0.33, 0.3, 0.38, 0.27, 0.15, 0.15, 0.16, 0.42, 0.33, 0.27, 0.45, 0.45, 0.25, 0.26]
export const X_LEN = 0.6, Y_LEN = 0.22
