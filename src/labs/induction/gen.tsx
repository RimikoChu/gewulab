// 立式水轮发电机（伞式）：地面上一圈定子机座，里面是转子；转子外圈 16 个凸极（红 N、蓝 S 相间），每个磁极绕着励磁线圈；
// 定子铁芯内壁开着一道道槽，槽里嵌着定子线圈，上下两头是端部绕组；顶上是上机架、盖板和集电环罩。
// cut 时把定子机座、盖板朝前剖掉一块，看得见转子和一只高亮的定子线圈（第 5 课）。单位 m，原点在机组中心的地面上。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, bolts } from '@/lab-kit'
import { COL } from './layout'
import { makeText, makeWinding, rep } from './mats'
import { GEN, type V3 } from './physics'
import { FieldLines, LoopFlow } from './fx'

/** 机组尺寸：定子外半径、铁芯内半径（气隙外侧）、转子磁极外半径、铁芯上下沿 */
export const GS = { Ro: 3.1, Ri: 2.32, Rp: 2.26, y0: 0.5, y1: 2.0, poles: GEN.pairs * 2 }
/** 剖口朝哪个方向（xz 平面里的角度，从 +x 起逆着看向 −y 方向转）：朝着镜头的那一边 */
export const CUT_AT = Math.atan2(0.82, 0.58)
/** 剖掉的扇形有多宽 */
const CUT_W = 1.9
const PITCH = Math.PI * 2 / GS.poles

/** 一块环形的扇区：内外半径、从 a0 转过 da、上下沿 */
function sector(r0: number, r1: number, a0: number, da: number, y0: number, y1: number, seg = 64) {
  const s = new THREE.Shape()
  s.absarc(0, 0, r1, a0, a0 + da, false); s.absarc(0, 0, r0, a0 + da, a0, true); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: seg })
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0)
  // ExtrudeGeometry 画在 x–y 平面里，转到 x–z 以后角度方向翻了：这里的 a 对应世界里的 atan2(−z, x)
  return g
}
/** 世界里 xz 平面的角度 a（atan2(z, x)）换成 sector 用的角度 */
const sa = (a: number) => -a

/** 一个转子磁极：磁极铁芯（叠片）、绕在上面的励磁线圈（铜排）、磁极靴；沿 +x 朝外，原点在转子中心 */
function Pole({ n }: { n: boolean }) {
  const tex = useMemo(() => { const t = rep(makeWinding([182, 98, 46], 24), 1, 1); t.repeat.set(1, 1); return t }, [])
  const paint = n ? COL.N : COL.S
  const h = GS.y1 - GS.y0 - 0.1, w = 2 * GS.Rp * Math.sin(PITCH / 2) * 0.86
  return <group>
    <mesh position={[GS.Rp - 0.2, 0, 0]} castShadow><boxGeometry args={[0.36, h, w * 0.62]} /><meshStandardMaterial color="#5c6268" metalness={0.6} roughness={0.42} /></mesh>
    {/* 励磁线圈：一圈圈扁铜排叠起来，外面刷了绝缘漆 */}
    <RoundedBox args={[0.26, h + 0.12, w * 0.86]} radius={0.04} smoothness={3} position={[GS.Rp - 0.25, 0, 0]} castShadow><meshPhysicalMaterial map={tex} color="#e0a070" metalness={0.5} roughness={0.35} clearcoat={0.5} /></RoundedBox>
    {/* 磁极靴：朝外的一面涂成红（N）或蓝（S），让学生分得清两种磁极 */}
    <mesh position={[GS.Rp - 0.04, 0, 0]} castShadow><boxGeometry args={[0.08, h, w]} /><meshPhysicalMaterial color={paint} roughness={0.4} clearcoat={0.6} metalness={0.2} /></mesh>
  </group>
}

/** 转子：轮毂、支臂、磁轭（一圈厚钢环）、16 个磁极；还有从每个磁极穿过气隙进入定子的磁感线（随转子一起转） */
function Rotor({ field }: { field: boolean }) {
  const lines = useMemo(() => {
    const out: { n: V3[][]; s: V3[][] } = { n: [], s: [] }
    for (let k = 0; k < GS.poles; k++) {
      const a = k * PITCH, list = k % 2 ? out.s : out.n
      for (const da of [-0.06, 0, 0.06]) for (const y of [0.25, 0.75, 1.25]) {
        const aa = a + da, c = Math.cos(aa), s = Math.sin(aa), pts: V3[] = []
        for (let i = 0; i <= 4; i++) { const r = GS.Rp + 0.02 + (GS.Ro - 0.25 - GS.Rp) * i / 4; pts.push([r * c, GS.y0 + 0.05 + y, r * s]) }
        list.push(k % 2 ? [...pts].reverse() : pts)
      }
    }
    return out
  }, [])
  const yoke = useMemo(() => sector(GS.Rp - 0.65, GS.Rp - 0.38, 0, Math.PI * 2, GS.y0 - 0.05, GS.y1 + 0.05, 96), [])
  return <group>
    <mesh geometry={yoke} castShadow receiveShadow><meshStandardMaterial color="#4b5258" metalness={0.65} roughness={0.4} /></mesh>
    {Array.from({ length: GS.poles }, (_, k) => <group key={k} rotation-y={-k * PITCH} position={[0, (GS.y0 + GS.y1) / 2, 0]}><Pole n={k % 2 === 0} /></group>)}
    {/* 支臂和轮毂、大轴 */}
    {Array.from({ length: 8 }, (_, k) => <mesh key={k} rotation-y={k * Math.PI / 4} position={[0, (GS.y0 + GS.y1) / 2, 0]}><boxGeometry args={[(GS.Rp - 0.6) * 2, 0.9, 0.1]} /><meshStandardMaterial color="#5a6167" metalness={0.6} roughness={0.45} /></mesh>)}
    <mesh position={[0, (GS.y0 + GS.y1) / 2, 0]}><cylinderGeometry args={[0.55, 0.55, 1.3, 32]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[0, 2.3, 0]}><cylinderGeometry args={[0.32, 0.32, 2.4, 32]} /><Metal kind="steel" grain="turned" /></mesh>
    <FieldLines lines={lines.n} opacity={field ? 1 : 0} heads={1} head={0.11} r={0.012} speed={0.5} />
    <FieldLines lines={lines.s} opacity={field ? 1 : 0} heads={1} head={0.11} r={0.012} speed={0.5} />
  </group>
}

/** 高亮的那只定子线圈：两条线圈边嵌在相隔一个极距的两道槽里，上下用端部连起来。flow 是线圈里的电流（有正负） */
function StatorCoil({ phi }: { phi: () => number }) {
  const r = GS.Ri + 0.03, a0 = CUT_AT - PITCH / 2, a1 = CUT_AT + PITCH / 2, yb = GS.y0 - 0.22, yt = GS.y1 + 0.22
  const pts: V3[] = []
  const at = (a: number, y: number, rr = r): V3 => [rr * Math.cos(a), y, rr * Math.sin(a)]
  pts.push(at(a0, yb + 0.1), at(a0, yt - 0.1))
  for (let i = 1; i < 8; i++) { const u = i / 8; pts.push(at(a0 + (a1 - a0) * u, yt + Math.sin(u * Math.PI) * 0.12, r + 0.08)) }
  pts.push(at(a1, yt - 0.1), at(a1, yb + 0.1))
  for (let i = 1; i < 8; i++) { const u = i / 8; pts.push(at(a1 + (a0 - a1) * u, yb - Math.sin(u * Math.PI) * 0.12, r + 0.08)) }
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), true, 'catmullrom', 0.05), 200, 0.04, 10, true), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useRef<THREE.MeshStandardMaterial>(null), f = useRef(phi); f.current = phi
  useFrame(() => { if (mat.current) mat.current.emissiveIntensity = 0.2 + 1.6 * Math.abs(Math.sin(f.current())) })
  return <group>
    <mesh geometry={geo}><meshStandardMaterial ref={mat} color="#e89550" emissive="#ff9a3c" emissiveIntensity={0.2} metalness={0.4} roughness={0.35} /></mesh>
    <LoopFlow pts={pts} flow={0} flowFn={() => Math.sin(f.current())} dots={30} size={0.05} speed={0.6} />
  </group>
}

/**
 * 一台发电机。cut：朝前剖开；phi：每帧问一次转子转到的电角度（从中性面算起，弧度）；field：画不画磁感线。
 * 中性面：一个 N 极正对着高亮的定子线圈。不剖开时线圈和磁感线都不画
 */
const ZERO = () => 0
export function Generator({ cut = false, phi = ZERO, field = false, name = '' }: { cut?: boolean; phi?: () => number; field?: boolean; name?: string }) {
  const rotor = useRef<THREE.Group>(null), f = useRef(phi); f.current = phi
  useFrame(() => { if (rotor.current) rotor.current.rotation.y = -(CUT_AT + f.current() / GEN.pairs) })
  const geo = useMemo(() => {
    const full = Math.PI * 2, gapA = cut ? CUT_W : 0, a0 = sa(CUT_AT) + gapA / 2, da = full - gapA
    return {
      frame: sector(GS.Ri + 0.55, GS.Ro, a0, da, GS.y0 - 0.45, GS.y1 + 0.45),
      core: sector(GS.Ri, GS.Ri + 0.55, a0, da, GS.y0, GS.y1),
      endTop: sector(GS.Ri + 0.02, GS.Ri + 0.5, a0, da, GS.y1, GS.y1 + 0.3), endBot: sector(GS.Ri + 0.02, GS.Ri + 0.5, a0, da, GS.y0 - 0.3, GS.y0),
      cover: sector(0.95, GS.Ro + 0.1, a0, da, GS.y1 + 0.45, GS.y1 + 0.6),
      base: sector(GS.Ri - 0.2, GS.Ro + 0.25, a0, da, 0, GS.y0 - 0.45),
      ring: bolts(28, GS.Ro - 0.1, 0.06),
    }
  }, [cut])
  // 铁芯内壁的槽：一圈竖着的细缝
  const slots = useMemo(() => { const t = rep(makeWinding([84, 88, 94], 96), 1, 1); t.rotation = Math.PI / 2; t.repeat.set(1, 18); return t }, [])
  const plate = makeText([name], { w: 512, h: 128, bg: '#e7e3d8', fg: '#2d3a48', size: 64, weight: 700 })
  const paint = <meshPhysicalMaterial color="#d6dad6" roughness={0.45} clearcoat={0.4} />
  return <group>
    <mesh geometry={geo.base} receiveShadow castShadow><meshStandardMaterial color="#8d8b84" roughness={0.85} /></mesh>
    <mesh geometry={geo.frame} castShadow receiveShadow>{paint}</mesh>
    <mesh geometry={geo.core} castShadow receiveShadow><meshStandardMaterial map={slots} color="#9aa0a6" metalness={0.5} roughness={0.45} /></mesh>
    <mesh geometry={geo.endTop} castShadow><meshPhysicalMaterial color="#b0612e" roughness={0.4} metalness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={geo.endBot} castShadow><meshPhysicalMaterial color="#b0612e" roughness={0.4} metalness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={geo.cover} castShadow receiveShadow><meshPhysicalMaterial color="#2f7d6d" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={geo.ring} position={[0, GS.y1 + 0.6, 0]}><Metal kind="steel" rough={0.35} /></mesh>
    {/* 集电环罩、上机架的盖子 */}
    <mesh position={[0, GS.y1 + 1.2, 0]} castShadow><cylinderGeometry args={[0.95, 1.05, 1.2, 48]} /><meshPhysicalMaterial color="#2f7d6d" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh position={[0, GS.y1 + 1.82, 0]}><cylinderGeometry args={[0.7, 0.95, 0.06, 48]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {name && <mesh position={[1.04 * Math.cos(CUT_AT + 0.9), GS.y1 + 1.25, 1.04 * Math.sin(CUT_AT + 0.9)]} rotation-y={Math.PI / 2 - CUT_AT - 0.9}><planeGeometry args={[0.9, 0.22]} /><meshStandardMaterial map={plate} roughness={0.5} /></mesh>}
    {/* 盖板四周一圈栏杆：立柱和一道扶手 */}
    <mesh position={[0, GS.y1 + 1.6, 0]} rotation-x={Math.PI / 2} rotation-z={cut ? CUT_AT + CUT_W / 2 + 0.05 : 0}><torusGeometry args={[GS.Ro - 0.05, 0.03, 8, 96, cut ? Math.PI * 2 - CUT_W - 0.1 : Math.PI * 2]} /><meshStandardMaterial color="#e1b72a" roughness={0.5} /></mesh>
    {Array.from({ length: 24 }, (_, k) => { const a = k / 24 * Math.PI * 2, inCut = cut && Math.abs(((a - CUT_AT + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < CUT_W / 2 + 0.05; return inCut ? null : <mesh key={k} position={[(GS.Ro - 0.05) * Math.cos(a), GS.y1 + 1.1, (GS.Ro - 0.05) * Math.sin(a)]}><cylinderGeometry args={[0.025, 0.025, 1.0, 8]} /><meshStandardMaterial color="#e1b72a" roughness={0.5} /></mesh> })}
    <group ref={rotor}>{cut ? <Rotor field={field} /> : null}</group>
    {cut && <StatorCoil phi={phi} />}
  </group>
}
