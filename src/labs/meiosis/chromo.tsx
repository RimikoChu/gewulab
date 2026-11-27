// 染色体的模型（放大很多倍的示意）。一根染色单体是一条紧紧盘绕的染色质丝：两头圆、着丝粒处收细，表面深浅相间的条纹。
// 来自母方的染色体是橙红色，来自父方的是蓝色；基因所在的位置是一道亮黄的色带（字母用标签标出）。
// 交叉互换：同源染色体的两条非姐妹染色单体在某一点交叉，交换远端的一段。这里每根单体除了原样，还备一份“远端换成对方颜色”的重组版本，
// 和一个“远端搭到对面去”的变形（morph），交叉时先变形、在交叉最大时换成重组版本、再变回来。
import { useMemo } from 'react'
import * as THREE from 'three'
import { lerp, rng, tube, type V3 } from './parts'

/** 示意细胞 2n = 4：两对同源染色体。len 长度（cm），cen 着丝粒位置（0 下端，1 上端），gene 基因位置，letter 母方 / 父方的等位基因 */
export const PAIRS = [
  { len: 15, cen: 0.42, gene: 0.82, letters: ['A', 'a'], cross: 0.62 },
  { len: 9.5, cen: 0.3, gene: 0.76, letters: ['B', 'b'], cross: 0.55 },
] as const
export const RAD = 2.0
/** 母方、父方的颜色：深浅两色 */
export const PARENT = [['#b8402a', '#e07656'], ['#2a5aa8', '#5d8fd8']] as const
export const GENE_COLOR = '#ffe27a'

/**
 * 一根染色单体，沿 y 从 −len/2 到 len/2。colorAt(u, 深浅) 给出 u（0–1，沿长度）处的颜色。
 * bend：可选的变形，返回 u 处轴线往 x 偏多少（做交叉时的那一份）。turns 固定，保证原样和变形顶点数一样
 */
function build(len: number, rad: number, cen: number, colorAt: (u: number, dark: boolean) => string, seed: number, bend?: (u: number) => number) {
  const turns = Math.round(len / (rad * 0.42)), N = turns * 8
  const axis: V3[] = Array.from({ length: 25 }, (_, i) => { const u = i / 24; return [(bend ? bend(u) : 0) + Math.sin(u * 7 + seed) * len * 0.006, lerp(-len / 2, len / 2, u), 0] })
  const curve = new THREE.CatmullRomCurve3(axis.map(p => new THREE.Vector3(...p)), false, 'centripetal')
  const fr = curve.computeFrenetFrames(N, false), P = new THREE.Vector3(), pts: THREE.Vector3[] = []
  // Frenet 标架在直线上会乱转：统一用固定的 x、z 方向
  const nx = new THREE.Vector3(1, 0, 0), nz = new THREE.Vector3(0, 0, 1)
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const end = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, Math.abs(u - 0.5) * 2 - 0.88) / 0.12, 2)))
    const pinch = 1 - 0.55 * Math.exp(-Math.pow((u - cen) / 0.045, 2))
    const k = rad * 0.5 * end * pinch, a = u * turns * Math.PI * 2
    curve.getPoint(u, P)
    pts.push(P.clone().addScaledVector(nx, Math.cos(a) * k).addScaledVector(nz, Math.sin(a) * k))
  }
  void fr
  const g = tube(pts, rad * 0.44, rad * 0.3, '#ffffff', '#ffffff', 6, N * 2, 4)
  const r = rng(seed), bands: number[] = [0]; while (bands[bands.length - 1] < 1) bands.push(bands[bands.length - 1] + 0.05 + r() * 0.08)
  const uv = g.attributes.uv as THREE.BufferAttribute, cl = g.attributes.color as THREE.BufferAttribute, c = new THREE.Color()
  for (let i = 0; i < cl.count; i++) { const u = uv.getY(i); let b = 0; while (b < bands.length - 1 && bands[b + 1] < u) b++; c.set(colorAt(u, b % 2 === 1)); cl.setXYZ(i, c.r, c.g, c.b) }
  return g
}

/** 一根染色单体的颜色：who 是母方 0 / 父方 1；swapFrom 大于 0 时，从这个位置往上是对方的颜色（交叉互换后的重组单体） */
const colorFn = (pair: number, who: number, swapFrom = 2, gene = true) => (u: number, dark: boolean) => {
  const p = PAIRS[pair]
  if (gene && Math.abs(u - p.gene) < 0.028) return GENE_COLOR
  const w = u > swapFrom ? 1 - who : who
  return PARENT[w][dark ? 0 : 1]
}
export interface ChromatidGeo { plain: THREE.BufferGeometry; recomb: THREE.BufferGeometry }
const cache = new Map<string, ChromatidGeo>()
/**
 * 一对同源染色体里的一根单体。pair 第几对，who 母方 / 父方，inner：是不是靠里、会参与交叉的那根；
 * dir：交叉时远端往哪边搭（+1 往 +x）；gap：两根靠里的单体之间的距离
 */
export function chromatidGeo(pair: number, who: number, inner: boolean, dir: number, gap: number, gene = true) {
  const k = `${pair}${who}${inner}${dir}${gap}${gene}`
  if (!cache.has(k)) {
    const p = PAIRS[pair], seed = pair * 10 + who * 3 + (inner ? 1 : 0)
    const plain = build(p.len, RAD, p.cen, colorFn(pair, who, 2, gene), seed)
    if (inner) {
      // 远端搭到对面去：交叉点附近平滑过渡，交叉点以上整段平移 gap
      const crossed = build(p.len, RAD, p.cen, colorFn(pair, who), seed, u => dir * gap * THREE.MathUtils.smoothstep(u, p.cross - 0.07, p.cross + 0.07))
      plain.morphAttributes.position = [crossed.attributes.position]
      plain.morphAttributes.normal = [crossed.attributes.normal]
      crossed.dispose()
    }
    const recomb = inner ? build(p.len, RAD, p.cen, colorFn(pair, who, p.cross), seed) : plain
    cache.set(k, { plain, recomb })
  }
  return cache.get(k)!
}

/** 染色体的材质：顶点色，略有光泽 */
export const ChromoMat = ({ opacity = 1, glow = 0 }: { opacity?: number; glow?: number }) =>
  <meshPhysicalMaterial vertexColors roughness={0.45} clearcoat={0.45} clearcoatRoughness={0.35} sheen={0.4} sheenColor="#ffffff" emissive="#ffffff" emissiveIntensity={glow} transparent={opacity < 0.999} opacity={opacity} depthWrite={opacity > 0.6} />

/** 一根染色单体：pose 里给出中心位置、在 xy 平面里的转角；morph 是交叉的程度（0–1）；recomb 为真时用重组版本 */
export function Chromatid({ pair, who, inner, dir, gap, at, th, opacity = 1, morph = 0, recomb = false, scale = 1, gene = true }: {
  pair: number; who: number; inner: boolean; dir: number; gap: number; at: V3; th: number; opacity?: number; morph?: number; recomb?: boolean; scale?: number; gene?: boolean
}) {
  const g = chromatidGeo(pair, who, inner, dir, gap, gene)
  const influences = useMemo(() => [0], [])
  influences[0] = recomb ? 0 : morph
  if (opacity <= 0.01) return null
  return <mesh geometry={recomb ? g.recomb : g.plain} position={at} rotation-z={th} scale={scale} morphTargetInfluences={inner && !recomb ? influences : undefined} castShadow>
    <ChromoMat opacity={opacity} />
  </mesh>
}
