// 一套挂在铁架横梁下面的滑轮装置：定滑轮（夹板挂在横梁上）、动滑轮（夹板下面挂钩码）、一根细绳从拴着的地方绕过各只轮子，
// 末端钩着弹簧测力计，测力计的提环握在手套里。钩码升高 rise 时，动滑轮跟着升高，绳子全长不变，绳端和手就沿拉的方向走出相应的距离，
// 轮子按绳子走过的长度转动。坐标按厘米写，原点在横梁吊板的底面中心，y 向上。读数（拉力）由课里从计算核心取来。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Block, Eye, Hooks, RopeLine, SHEAVE_R, SpringScale, ringAt } from './gear'
import { Glove } from './parts'
import { route, type Wrap, type XY } from './rope'
import { U } from './world'

/** 一副滑轮夹板：原点 o（定滑轮是吊环，动滑轮是下面的挂钩），各只轮子、拴绳小环相对 o 的位置 */
export interface BlockDef { o: XY; wheels: XY[]; eyes?: XY[] }
/**
 * 一套装置：定滑轮若干、动滑轮至多一副；绳子从 start 拴起（on：拴在横梁上、拴在动滑轮的小环上、或者直接拴着钩码），
 * 依次绕过 wraps（f 定滑轮 / m 动滑轮，第几副的第几只轮子，绕的方向），最后沿 out 伸出 free0 长，末端钩着测力计。
 * hooks：挂几只钩码；hang：钩码挂在动滑轮下面，还是直接拴在绳头上（定滑轮）。
 */
export interface RigDef {
  fixed: BlockDef[]; mov?: BlockDef
  start: { on: 'frame' | 'mov' | 'load'; p: XY }
  wraps: { b: 'f' | 'm'; k: number; w: number; s: 1 | -1 }[]
  out: XY; free0: number; hooks: number; hang: 'mov' | 'start'
}

function layout(d: RigDef, rise: number, out: XY) {
  const mo: XY | null = d.mov ? [d.mov.o[0], d.mov.o[1] + (d.hang === 'mov' ? rise : 0)] : null
  const start: XY = d.start.on === 'frame' ? d.start.p : d.start.on === 'mov' ? [mo![0] + d.start.p[0], mo![1] + d.start.p[1]] : [d.start.p[0], d.start.p[1] + rise]
  const wraps: Wrap[] = d.wraps.map(w => { const B = w.b === 'f' ? d.fixed[w.k] : d.mov!, o = w.b === 'f' ? B.o : mo!, c = B.wheels[w.w]; return { c: [o[0] + c[0], o[1] + c[1]], r: SHEAVE_R, s: w.s } })
  return { mo, start, wraps, out }
}

/** 滑轮装置。rise：钩码此刻升高了多少（cm）；out：拉的方向（不给就用 def.out）；F：测力计此刻的示数（N）；light：轻的塑料滑轮还是钢滑轮 */
/** 不提升、竖直拉的时候，测力计的提环在哪（cm） */
export function ringRest(def: RigDef, F: number): XY {
  const L = layout(def, 0, def.out), r = route(L.start, L.wraps, L.out, def.free0), k = Math.hypot(def.out[0], def.out[1]), d = ringAt(F) / U
  return [r.end[0] + def.out[0] / k * d, r.end[1] + def.out[1] / k * d]
}
export function PulleyRig({ def, rise, out, F, light = false }: { def: RigDef; rise: number; out?: XY; F: number; light?: boolean }) {
  const o = out ?? def.out
  const base = useMemo(() => { const L = layout(def, 0, def.out), r = route(L.start, L.wraps, L.out, def.free0); return { total: r.path + def.free0, arrive: r.arrive } }, [def])
  const L = layout(def, rise, o), probe = route(L.start, L.wraps, L.out, 0), R = route(L.start, L.wraps, L.out, Math.max(0, base.total - probe.path))
  const now = useRef(R); now.current = R
  const force = useRef(F); force.current = F
  const spins = useRef<(THREE.Group | null)[]>([]), scale = useRef<THREE.Group>(null), hand = useRef<THREE.Group>(null), mov = useRef<THREE.Group>(null), load = useRef<THREE.Group>(null)
  const st = useRef({ rise, o, mo: L.mo, start: L.start }); st.current = { rise, o, mo: L.mo, start: L.start }
  useFrame(() => {
    const r = now.current, q = st.current
    // 轮子转过的角度：绳子走过多长，轮边就转过多长
    def.wraps.forEach((w, i) => { const g = spins.current[i]; if (g) g.rotation.z = -w.s * (r.arrive[i] - base.arrive[i]) / SHEAVE_R })
    scale.current?.position.set(r.end[0] * U, r.end[1] * U, 0); if (scale.current) scale.current.rotation.z = Math.atan2(q.o[1], q.o[0]) - Math.PI / 2
    hand.current?.position.set(0, ringAt(force.current) + 0.035, 0)
    if (mov.current && q.mo) mov.current.position.set(q.mo[0] * U, q.mo[1] * U, 0)
    if (load.current) { const p = def.hang === 'mov' ? q.mo! : q.start; load.current.position.set(p[0] * U, p[1] * U, 0) }
  })
  const spinRef = (b: 'f' | 'm', k: number) => (w: number) => (g: THREE.Group | null) => { const i = def.wraps.findIndex(x => x.b === b && x.k === k && x.w === w); if (i >= 0) spins.current[i] = g }
  return <group>
    {/* 定滑轮：吊环挂在横梁下的一根短吊杆上 */}
    {def.fixed.map((B, k) => <group key={k} position={[B.o[0] * U, B.o[1] * U, 0]}>
      <mesh position={[0, -B.o[1] / 2 * U + 0.4 * U, 0]}><cylinderGeometry args={[0.22 * U, 0.22 * U, Math.max(0.2, -B.o[1] + 0.2) * U, 8]} /><meshStandardMaterial color="#8d949a" metalness={0.8} roughness={0.35} /></mesh>
      <Block wheels={B.wheels} top eyes={B.eyes} spins={spinRef('f', k)} light={light} />
    </group>)}
    {def.mov && <group ref={mov} position={[def.mov.o[0] * U, def.mov.o[1] * U, 0]}><Block wheels={def.mov.wheels} top={false} eyes={def.mov.eyes} spins={spinRef('m', 0)} light={light} /></group>}
    {/* 绳头拴在横梁上的小吊钩 */}
    {def.start.on === 'frame' && <group position={[def.start.p[0] * U, def.start.p[1] * U, 0]}><Eye /></group>}
    <RopeLine get={() => now.current.pts.map(p => [p[0] * U, p[1] * U] as [number, number])} />
    <group ref={load} position={[0, 0, 0]}><Hooks n={def.hooks} /></group>
    <group ref={scale}>
      <SpringScale force={force} />
      <group ref={hand}><Glove /></group>
    </group>
  </group>
}

