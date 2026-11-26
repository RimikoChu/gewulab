// 放大的眼球剖面（第 5 课）：沿光轴剖开一半，朝镜头的那一半拿掉。由外到里：巩膜（白）、脉络膜（深褐）、视网膜（粉橙），
// 前面透明的角膜、带颜色的虹膜和中间的瞳孔、晶状体（双凸、透明）、睫状体和悬韧带、里面一团透明的玻璃体，后面接视神经。
// 按 1 mm 一个单位做，光轴是模型的 y 轴（角膜在 +y），放进展馆时转成朝 +x、乘 EYE_S。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, lathe, shell } from '@/lab-kit'
import { wetMat } from './mats'
import type { V3 } from './sdf'

type RY = [number, number]
/** 球面上的一段弧：圆心在轴上 cy，半径 R，从轴向坐标 y0 走到 y1 */
const arc = (cy: number, R: number, y0: number, y1: number, n = 24): RY[] => Array.from({ length: n + 1 }, (_, i) => { const y = y0 + (y1 - y0) * i / n; return [Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)), y] })
/** 一层壳的截面：外面一条线（从后极往前），往里收 t */
const inset = (pts: RY[], t: number, cy = 0): RY[] => pts.map(([r, y]) => { const l = Math.hypot(r, y - cy) || 1; return [r * (1 - t / l), cy + (y - cy) * (1 - t / l)] })

export const LENS_Y = 6.2
const SCLERA = arc(0, 12, -12, 9.3)
const CORNEA: RY[] = [[7.35, 9.3], [6.6, 9.95], [5.2, 10.85], [3.4, 11.55], [1.6, 11.9], [0, 12.0]]
const CHOROID = inset(arc(0, 12, -12, 6.6), 0.75)
const RETINA = inset(arc(0, 12, -12, 5.2), 1.0)
/** 晶状体：前面的弧缓、后面的弧陡 */
const LENS: RY[] = [
  ...Array.from({ length: 17 }, (_, i): RY => { const r = 4.55 * i / 16; return [r, LENS_Y + 1.6 * Math.sqrt(Math.max(0, 1 - (r / 4.6) ** 2))] }),
  ...Array.from({ length: 16 }, (_, i): RY => { const r = 4.55 * (15 - i) / 16; return [r, LENS_Y - 2.3 * Math.sqrt(Math.max(0, 1 - (r / 4.6) ** 2))] }),
]

/** 半圈的车削：只留背着镜头（z < 0）的那一半 */
function half(profile: RY[], segs = 64, closed = false) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), segs, Math.PI / 2, Math.PI)
  if (closed) g.computeVertexNormals()
  return g
}
/** 剖开的那个面：一层壳（外线和内线之间）在 z = 0 平面上，左右两半 */
function face(outer: RY[], inner: RY[]) {
  const poly = [...outer, ...[...inner].reverse()]
  const sh = (s: number) => { const p = new THREE.Shape(); poly.forEach(([r, y], i) => (i ? p.lineTo(s * r, y) : p.moveTo(s * r, y))); return new THREE.ShapeGeometry(p) }
  const a = sh(1), b = sh(-1); const pts = [a, b]
  const g = new THREE.BufferGeometry()
  const pos: number[] = [], idx: number[] = []
  for (const q of pts) { const base = pos.length / 3, p = q.attributes.position; for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), 0.001); const ix = q.index!.array; for (let i = 0; i < ix.length; i += 3) idx.push(base + ix[i], base + ix[i + 1], base + ix[i + 2], base + ix[i], base + ix[i + 2], base + ix[i + 1]) }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  // 双面都画了一遍，法线一律朝 +z（朝镜头）
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0, 1)
  return g
}
function shellPair(outer: RY[], t: number, cy = 0) {
  const inner = inset(outer, t, cy)
  return { skin: half([...outer, ...[...inner].reverse()]), face: face(outer, inner), inner }
}

function eyeGeos() {
  const sc = shellPair(SCLERA, 0.75), ch = shellPair(CHOROID, 0.25), re = shellPair(RETINA, 0.3)
  const co = { skin: half([...CORNEA.slice().reverse(), ...inset(CORNEA, 0.55, 4.2)]), face: face(CORNEA, inset(CORNEA, 0.55, 4.2)) }
  const lens = { skin: half(LENS, 64, true), face: face(LENS, [[0, LENS[0][1]]]) }
  const vit = half(inset(arc(0, 12, -12, 4.9), 1.32).concat([[0, 4.9]] as RY[]))
  // 睫状体：晶状体外面一圈，截面是三角形
  const ciliary: RY[] = [[8.75, 7.2], [10.4, 5.2], [10.9, 6.3], [9.9, 8.1]]
  const cil = { skin: half([...ciliary, ciliary[0]], 48), face: face(ciliary, []) }
  return { sc, ch, re, co, lens, vit, cil }
}
let EG: ReturnType<typeof eyeGeos> | null = null
const eg = () => (EG ??= eyeGeos())

/** 像落在哪里（模型坐标，离晶状体中心多远）由课里按计算核心给 */
export interface EyeView { pupil: number; stretch: number; hi?: string | null }
/** 眼球。pupil 瞳孔半径（mm）；stretch 眼球前后拉长多少（1 正常，近视大于 1；只拉长晶状体后面） */
export function Eyeball({ pupil, stretch, children }: EyeView & { children?: ReactNode }) {
  const G = eg()
  const m = useMemo(() => ({
    sclera: wetMat('#f2ece3', { roughness: 0.32 }), scFace: new THREE.MeshStandardMaterial({ color: '#e9dfd2', roughness: 0.7 }),
    choroid: wetMat('#4a2420', { roughness: 0.6 }), chFace: new THREE.MeshStandardMaterial({ color: '#5a2b25', roughness: 0.8 }),
    retina: wetMat('#e7926c', { roughness: 0.35, clearcoat: 0.9 }), reFace: new THREE.MeshStandardMaterial({ color: '#d98762', roughness: 0.6 }),
    cornea: new THREE.MeshPhysicalMaterial({ color: '#e8f6fb', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }),
    coFace: new THREE.MeshPhysicalMaterial({ color: '#d4ecf2', roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#f6efd0', roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 }),
    lensFace: new THREE.MeshPhysicalMaterial({ color: '#efe5c2', roughness: 0.15, transparent: true, opacity: 0.5, depthWrite: false }),
    vit: new THREE.MeshPhysicalMaterial({ color: '#dfeef0', roughness: 0.2, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }),
    cil: wetMat('#7a3a32', { roughness: 0.5 }), iris: wetMat(null, { roughness: 0.45, side: THREE.DoubleSide }),
  }), [])
  // 虹膜：一圈有放射纹的环，内圈半径就是瞳孔，随时变
  const iris = useMemo(() => {
    const R = 28, A = 96, pos = new Float32Array((R + 1) * (A + 1) * 3), col = new Float32Array((R + 1) * (A + 1) * 3), tt = new Float32Array((R + 1) * (A + 1) * 2), idx: number[] = []
    const c1 = new THREE.Color('#5a3a22'), c2 = new THREE.Color('#9a6a3a'), c = new THREE.Color()
    for (let i = 0; i <= R; i++) for (let j = 0; j <= A; j++) {
      const k = i * (A + 1) + j, t = i / R, a = Math.PI / 2 + Math.PI * j / A
      tt[k * 2] = t; tt[k * 2 + 1] = a
      c.copy(c1).lerp(c2, 0.5 + 0.5 * Math.sin(a * 41) * (0.6 + 0.4 * t)).lerp(c1, t > 0.85 ? 0.6 : t < 0.12 ? 0.4 : 0); col.set([c.r, c.g, c.b], k * 3)
    }
    for (let i = 0; i < R; i++) for (let j = 0; j < A; j++) { const a = i * (A + 1) + j, b = a + A + 1; idx.push(a, b, a + 1, b, b + 1, a + 1) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx)
    return { g, tt }
  }, [])
  const last = useRef(-1), back = useRef<THREE.Group>(null), cur = useRef({ p: pupil, s: stretch })
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 1 / 30) / 0.25), c = cur.current
    c.p += (pupil - c.p) * k; c.s += (stretch - c.s) * (1 - Math.exp(-Math.min(dt, 1 / 30) / 0.4))
    if (Math.abs(c.p - last.current) > 1e-3) {
      last.current = c.p
      const p = iris.g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < p.count; i++) { const t = iris.tt[i * 2], a = iris.tt[i * 2 + 1], r = c.p + (6.6 - c.p) * t, y = 8.25 - 0.35 * t * t + 0.25 * Math.sin(t * Math.PI); p.setXYZ(i, Math.sin(a) * r, y, Math.cos(a) * r) }
      p.needsUpdate = true; iris.g.computeVertexNormals()
    }
    if (back.current) back.current.scale.y = c.s
  })
  return <group>
    {/* 晶状体前面不拉长；后面（巩膜、脉络膜、视网膜、玻璃体）以晶状体为界往后拉 */}
    <group position={[0, LENS_Y, 0]}><group ref={back}><group position={[0, -LENS_Y, 0]}>
      <mesh geometry={G.sc.skin} material={m.sclera} castShadow receiveShadow />
      <mesh geometry={G.sc.face} material={m.scFace} />
      <mesh geometry={G.ch.skin} material={m.choroid} />
      <mesh geometry={G.ch.face} material={m.chFace} />
      <mesh geometry={G.re.skin} material={m.retina} />
      <mesh geometry={G.re.face} material={m.reFace} />
      {/* 黄斑：后极一小块偏黄 */}
      <mesh position={[0, -10.6, -0.2]} rotation-x={-Math.PI / 2}><circleGeometry args={[1.0, 32]} /><meshStandardMaterial color="#e9c25a" roughness={0.5} transparent opacity={0.85} /></mesh>
      <mesh geometry={G.vit} material={m.vit} renderOrder={2} />
      <OpticNerve />
    </group></group></group>
    <mesh geometry={G.cil.skin} material={m.cil} /><mesh geometry={G.cil.face} material={m.cil} />
    {/* 悬韧带：睫状体到晶状体边缘的细丝 */}
    {[-1, 1].flatMap(s => [5.6, 6.2, 6.8].map(y => <mesh key={`${s}${y}`} position={[s * 7.0, (y + LENS_Y) / 2 + 0.3, 0.02]} rotation-z={s * (1.35 + (y - 6.2) * 0.2)}><cylinderGeometry args={[0.04, 0.04, 4.6, 6]} /><meshStandardMaterial color="#e8dccf" roughness={0.6} /></mesh>))}
    <mesh geometry={iris.g} material={m.iris} castShadow />
    <mesh geometry={G.lens.skin} material={m.lens} renderOrder={4} />
    <mesh geometry={G.lens.face} material={m.lensFace} renderOrder={4} />
    <mesh geometry={G.co.skin} material={m.cornea} renderOrder={6} />
    <mesh geometry={G.co.face} material={m.coFace} renderOrder={6} />
    {children}
  </group>
}
/** 视神经：从后极稍偏一点的视神经盘出去，往后弯，外面一层鞘 */
function OpticNerve() {
  const g = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.6, -10.6, -0.6), new THREE.Vector3(-2.1, -13.4, -0.6), new THREE.Vector3(-2.4, -17.5, -0.6), new THREE.Vector3(-3.4, -22, -0.6)])
    return new THREE.TubeGeometry(c, 40, 1.7, 20)
  }, [])
  return <mesh geometry={g} castShadow><meshPhysicalMaterial color="#efe0c0" roughness={0.4} clearcoat={0.6} sheen={0.4} /></mesh>
}
/** 视神经出眼球的地方（模型坐标，拉长前） */
export const OPTIC: V3[] = [[-1.4, -10.4, 0.3], [-2.1, -13.4, 0.6], [-2.4, -17.5, 0.6], [-3.4, -22, 0.6]]

/** 一副凹透镜（近视眼镜的一片）：中间薄、边上厚，外面一圈细金属框。轴沿 y */
export function Concave() {
  const g = useMemo(() => ({
    glass: lathe([[0, -0.35], [3, -0.55], [6, -1.25], [7.2, -1.6], [7.2, 1.6], [6, 1.25], [3, 0.55], [0, 0.35]], { segs: 64, closed: false }),
    rim: new THREE.TorusGeometry(7.35, 0.32, 12, 72),
  }), [])
  return <group>
    <mesh geometry={g.glass} renderOrder={5}><meshPhysicalMaterial color="#eaf6fb" roughness={0.03} clearcoat={1} transparent opacity={0.28} depthWrite={false} envMapIntensity={1.8} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.rim} rotation-x={Math.PI / 2}><Metal kind="chrome" /></mesh>
    <mesh position={[0, 0, -8.6]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.25, 0.25, 2.6, 10]} /><Metal kind="chrome" /></mesh>
  </group>
}

/** 小手电：拉丝铝的筒身、滚花的尾盖、前面亮着的灯头 */
export function Penlight({ on }: { on: boolean }) {
  const g = useMemo(() => ({ body: lathe([[0, 0], [0.62, 0], [0.66, 0.05], [0.66, 9.6], [0.75, 9.8], [0.78, 11.4], [0.7, 11.5], [0, 11.5]], { segs: 40 }), clip: shell([[0.7, 1.5], [0.72, 6.0]], 0.08) }), [])
  return <group>
    <mesh geometry={g.body} castShadow><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh position={[0.9, 3.8, 0]}><boxGeometry args={[0.18, 4.0, 0.5]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, 11.52, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.6, 32]} /><meshBasicMaterial color={on ? '#fff6dc' : '#55524a'} toneMapped={!on} /></mesh>
    {on && <mesh position={[0, 11.5 + 9, 0]} rotation-x={Math.PI} renderOrder={8}><coneGeometry args={[5.2, 18, 40, 1, true]} /><meshBasicMaterial color="#fff1c8" transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>}
  </group>
}
