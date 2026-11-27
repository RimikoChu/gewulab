// 基因的表达 · 拓展课的器材。左边一处：中心法则——DNA、RNA、蛋白质三个模型摆成三角，之间五条弯箭头，一条条点亮。
// 右边一处：DNA 指纹——一块立着的电泳胶，四条泳道（现场样本和甲、乙、丙），通电后条带往正极跑，比一比哪一条和现场的一样。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { L1_TOP, PRINTS, bandPos, complement, type Base, type PrintKey } from './physics'
import { NtSet, RISE, STRAND, TURN, aaColor, aaGeo, bondOf, pairAt, rnaLine, type Nt, type NtFrame } from './mol'
import { clamp, type V3 } from './kit'
import { AT } from './world'

// ---------- 中心法则 ----------
export const NODE = { dna: [AT.ext[0] - 6.4, AT.ext[1] - 2.6, AT.ext[2]] as V3, rna: [AT.ext[0] + 6.4, AT.ext[1] - 2.6, AT.ext[2]] as V3, pro: [AT.ext[0], AT.ext[1] + 4.4, AT.ext[2]] as V3 }
/** 五条信息流：从哪到哪、弯向哪边 */
export const FLOWS = [
  { id: 'rep', name: 'DNA 复制', from: 'dna', to: 'dna' },
  { id: 'tx', name: '转录', from: 'dna', to: 'rna' },
  { id: 'tl', name: '翻译', from: 'rna', to: 'pro' },
  { id: 'rt', name: '逆转录', from: 'rna', to: 'dna' },
  { id: 'rr', name: 'RNA 复制', from: 'rna', to: 'rna' },
] as const
function flowCurve(i: number) {
  const f = FLOWS[i], a = new THREE.Vector3(...NODE[f.from]), b = new THREE.Vector3(...NODE[f.to])
  if (f.from === f.to) { const c = a.clone(), s = f.from === 'dna' ? -1 : 1; return new THREE.CatmullRomCurve3([c.clone().add(new THREE.Vector3(-2.2 * s, -2.1, 0.5)), c.clone().add(new THREE.Vector3(0, -4.0, 0.8)), c.clone().add(new THREE.Vector3(2.2 * s, -2.1, 0.5))]) }
  const m = a.clone().lerp(b, 0.5), d = b.clone().sub(a), n = new THREE.Vector3(-d.y, d.x, 0).normalize()
  const bend = f.id === 'rt' ? -1.3 : f.id === 'tx' ? 1.3 : 0.9
  const a2 = a.clone().addScaledVector(d.clone().normalize(), 3.6), b2 = b.clone().addScaledVector(d.clone().normalize(), -3.6)
  return new THREE.QuadraticBezierCurve3(a2, m.addScaledVector(n, bend), b2)
}
export const flowMid = (i: number): V3 => flowCurve(i).getPointAt(0.5).toArray() as V3
function Arrow({ i, on }: { i: number; on: boolean }) {
  const { tube, tip, q } = useMemo(() => {
    const c = flowCurve(i), tube = new THREE.TubeGeometry(c, 48, 0.17, 10, false), tip = c.getPointAt(1), dir = c.getTangentAt(1)
    return { tube, tip, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir) }
  }, [i])
  const col = on ? (i >= 3 ? '#ffb86b' : '#7fe3d4') : '#4a5663'
  return <group>
    <mesh geometry={tube}><meshStandardMaterial color={col} emissive={col} emissiveIntensity={on ? 0.9 : 0} roughness={0.4} /></mesh>
    <mesh position={tip} quaternion={q}><coneGeometry args={[0.45, 1.0, 18]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={on ? 0.9 : 0} roughness={0.4} /></mesh>
  </group>
}
const SEQ = L1_TOP.slice(0, 10), BOT = complement(SEQ)
export function Dogma({ lit }: { lit: number }) {
  const ag = useMemo(() => aaGeo(8), [])
  const get = (): NtFrame => {
    const a: Nt[] = [], b: Nt[] = [], bonds = []
    for (let i = 0; i < SEQ.length; i++) {
      const p = pairAt([NODE.dna[0] - 4.5 * RISE, NODE.dna[1], NODE.dna[2]], i, i * TURN, SEQ[i] as Base, BOT[i] as Base)
      a.push({ b: SEQ[i] as Base, s: p.sT, e: p.eT, c: STRAND.old }); b.push({ b: BOT[i] as Base, s: p.sB, e: p.eB, c: STRAND.old })
      bonds.push(bondOf(p.eT, p.eB, SEQ[i] as Base))
    }
    const r = rnaLine([0, 0, 0], 'AUGGCUCACG').map((n, i) => { const y = NODE.rna[1] - 0.5 + Math.sin(i * 0.9) * 0.3; return { ...n, s: [NODE.rna[0] + (i - 4.5) * RISE, y, NODE.rna[2]] as V3, e: [NODE.rna[0] + (i - 4.5) * RISE, y + (n.e[1] - n.s[1]), NODE.rna[2]] as V3 } })
    return { strands: [a, b, r], bonds }
  }
  // 蛋白质：一条肽链折成一团
  const beads = useMemo(() => Array.from({ length: 14 }, (_, i) => { const t = i * 0.9; return { p: [NODE.pro[0] + Math.cos(t) * 1.6 * (1 - i / 30), NODE.pro[1] + Math.sin(t * 1.3) * 1.2, NODE.pro[2] + Math.sin(t) * 1.3] as V3, a: 'MAHEWKVLTPGRFS'[i] } }), [])
  return <group>
    <NtSet get={get} cap={40} ls={0.42} />
    {beads.map((b, i) => <mesh key={i} geometry={ag} position={b.p} scale={1.25}><meshPhysicalMaterial color={aaColor(b.a)} roughness={0.35} clearcoat={0.8} /></mesh>)}
    {beads.slice(1).map((b, i) => { const a = new THREE.Vector3(...beads[i].p), c = new THREE.Vector3(...b.p), d = c.clone().sub(a); return <mesh key={`l${i}`} position={a.clone().lerp(c, 0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())}><cylinderGeometry args={[0.07, 0.07, d.length(), 8]} /><meshStandardMaterial color="#d9dee6" /></mesh> })}
    {FLOWS.map((_, i) => <Arrow key={i} i={i} on={i < lit} />)}
  </group>
}

// ---------- DNA 指纹：电泳胶 ----------
export const GEL: V3 = [AT.ext[0] + 18, AT.ext[1], AT.ext[2]]
export const LANES: PrintKey[] = ['scene', 'p1', 'p2', 'p3']
const GW = 7.4, GH = 6.2
export const laneX = (i: number) => GEL[0] + (i - 1.5) * 1.6
export const GEL_TOP = GEL[1] + GH / 2 - 0.7
const TRAVEL = GH - 1.4
export function Gel({ run, match }: { run: { current: number }; match: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const bands = useMemo(() => LANES.flatMap((k, li) => PRINTS[k].map(len => ({ li, len }))), [])
  useFrame(() => {
    const e = run.current
    bands.forEach((b, i) => { const m = refs.current[i]; if (!m) return; m.position.y = GEL_TOP - clamp(bandPos(b.len)) * TRAVEL * e; (m.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.75 * clamp(e * 3) })
  })
  return <group>
    {/* 胶槽：深色的框，上面是负极、下面是正极的铂丝 */}
    <RoundedBox args={[GW + 0.8, GH + 0.8, 0.5]} radius={0.12} position={[GEL[0], GEL[1], GEL[2] - 0.35]} castShadow><meshPhysicalMaterial color="#1c2a33" roughness={0.35} clearcoat={0.8} /></RoundedBox>
    <mesh position={[GEL[0], GEL[1], GEL[2]]}><boxGeometry args={[GW, GH, 0.28]} /><meshPhysicalMaterial color="#cfe8ff" roughness={0.15} transmission={0} transparent opacity={0.28} clearcoat={1} depthWrite={false} /></mesh>
    {[1, -1].map(s => <mesh key={s} position={[GEL[0], GEL[1] + s * (GH / 2 + 0.18), GEL[2] + 0.1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.06, 0.06, GW, 10]} /><Metal kind="chrome" /></mesh>)}
    {[1, -1].map(s => <mesh key={`c${s}`} position={[GEL[0] + GW / 2 + 0.6, GEL[1] + s * (GH / 2 + 0.18), GEL[2] + 0.1]}><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color={s > 0 ? '#20242a' : '#c8322c'} roughness={0.4} /></mesh>)}
    {/* 加样孔 */}
    {LANES.map((_, i) => <mesh key={i} position={[laneX(i), GEL_TOP + 0.25, GEL[2] + 0.12]}><boxGeometry args={[1.0, 0.16, 0.06]} /><meshStandardMaterial color="#0d1418" /></mesh>)}
    {bands.map((b, i) => <mesh key={i} ref={m => { refs.current[i] = m }} position={[laneX(b.li), GEL_TOP, GEL[2] + 0.16]}><boxGeometry args={[1.0, 0.13, 0.04]} /><meshBasicMaterial color="#ff9fd0" transparent opacity={0.25} toneMapped={false} /></mesh>)}
    {match && [0, 2].map(i => <mesh key={`m${i}`} position={[laneX(i), GEL[1] - 0.2, GEL[2] + 0.2]}><boxGeometry args={[1.3, GH - 0.6, 0.02]} /><meshBasicMaterial color="#7fe3d4" transparent opacity={0.16} toneMapped={false} depthWrite={false} /></mesh>)}
  </group>
}
