// 电磁感应和电网 · 拓展课的器材：实验室最东头的一张台。左边铁架台上竖着两根 0.6 m 长的管子（透明有机玻璃管、朝前剖开一条宽缝的铝管），
// 戴手套的手捏着一枚圆柱形强磁铁在管口；右边是“跳环”装置：一只大线圈套在竖直的铁芯上，铁芯上套着铝环（闭合的或开口的）。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, shell } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makeText, makeWinding, rep } from './mats'
import { PIPE, type V3 } from './physics'
import { Bench, Hand } from './gear'
import { LoopFlow } from './fx'

export const RX = { pipes: [-0.2, -0.06] as const, base: TOP + 0.06, ring: [0.14, TOP, 0.03] as V3, coreH: 0.42, coilH: 0.1 }
export type Pipe = 'plastic' | 'alu'
const PR = 0.0135, MR = 0.0105, MH = 0.024

/** 圆柱形钕铁硼磁铁：镀镍的外皮，两端涂成红（N）蓝（S） */
function Puck() {
  return <group>
    <mesh castShadow><cylinderGeometry args={[MR, MR, MH * 0.7, 24]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, -MH * 0.425, 0]}><cylinderGeometry args={[MR, MR, MH * 0.15, 24]} /><meshPhysicalMaterial color={COL.N} roughness={0.3} clearcoat={0.6} /></mesh>
    <mesh position={[0, MH * 0.425, 0]}><cylinderGeometry args={[MR, MR, MH * 0.15, 24]} /><meshPhysicalMaterial color={COL.S} roughness={0.3} clearcoat={0.6} /></mesh>
  </group>
}

/** 一根管子：plastic 是透明有机玻璃管；alu 是铝管，朝前剖开一条宽缝（约 140°），看得见里面的磁铁和涡流 */
function Tube({ kind }: { kind: Pipe }) {
  const geo = useMemo(() => {
    const g = shell([[PR, 0], [PR, PIPE.h]], 0.002, { segs: 48 })
    if (kind === 'plastic') return g
    const a0 = Math.PI * 0.39, da = Math.PI * 1.22   // 缺口约 140°，朝 +z（镜头这边）
    const half = new THREE.CylinderGeometry(PR, PR, PIPE.h, 48, 1, true, a0, da); half.translate(0, PIPE.h / 2, 0)
    const inner = new THREE.CylinderGeometry(PR - 0.002, PR - 0.002, PIPE.h, 48, 1, true, a0, da); inner.translate(0, PIPE.h / 2, 0)
    // 剖口两边露出管壁的厚度
    const edges = [a0, a0 + da].map(a => { const g = new THREE.BoxGeometry(0.002, PIPE.h, 0.0025); g.rotateY(a); g.translate((PR - 0.001) * Math.sin(a), PIPE.h / 2, (PR - 0.001) * Math.cos(a)); return g })
    return { half, inner, edges }
  }, [kind])
  const label = makeText([kind === 'plastic' ? '有机玻璃管' : '铝管'], { w: 256, h: 64, bg: '#f2f0e8', fg: '#2a2f34', size: 34, weight: 600 })
  return <group>
    {geo instanceof THREE.BufferGeometry
      ? <mesh geometry={geo}><meshPhysicalMaterial color="#eaf4f6" transparent opacity={0.28} roughness={0.04} clearcoat={1} depthWrite={false} /></mesh>
      : <group>
        <mesh geometry={geo.half} castShadow><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh geometry={geo.inner}><meshStandardMaterial color="#b9bec2" metalness={0.6} roughness={0.35} side={THREE.BackSide} /></mesh>
        {geo.edges.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#e3e6e8" metalness={0.5} roughness={0.3} /></mesh>)}
      </group>}
    {kind === 'plastic' && <mesh position={[0, 0.1, PR + 0.0008]}><planeGeometry args={[0.03, 0.0075]} /><meshBasicMaterial map={label} /></mesh>}
  </group>
}

/** 铁架台：铸铁底座、立杆、两只夹子夹住管子 */
function Stand() {
  const base = useMemo(() => disc(0.06, 0.016), [])
  return <group>
    <RoundedBox args={[0.3, 0.02, 0.14]} radius={0.005} smoothness={2} position={[-0.13, TOP + 0.01, -0.03]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh geometry={base} position={[-0.13, TOP + 0.02, -0.08]} scale={[0.5, 1, 0.5]}><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[-0.13, TOP + 0.36, -0.08]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.7, 16]} /><Metal kind="stainless" rough={0.25} /></mesh>
    {[0.15, 0.5].map(y => <group key={y}>
      <mesh position={[-0.13, RX.base + y, -0.05]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.004, 0.004, 0.2, 12]} /><Metal kind="stainless" rough={0.25} /></mesh>
      {RX.pipes.map(x => <RoundedBox key={x} args={[0.04, 0.02, 0.04]} radius={0.004} smoothness={2} position={[x, RX.base + y, -0.035]}><Metal kind="aluminum" grain="cast" /></RoundedBox>)}
    </group>)}
    {/* 管子下面接磁铁的软垫 */}
    {RX.pipes.map(x => <mesh key={x} position={[x, TOP + 0.03, 0]}><cylinderGeometry args={[0.03, 0.03, 0.02, 24]} /><meshStandardMaterial color="#3a3d40" roughness={0.9} /></mesh>)}
  </group>
}

/** 跳环装置：底座里一只大线圈，竖直的铁芯从线圈中间伸出来；铝环套在铁芯上。lift：铝环跳起的高度；open：开口铝环；pulse：线圈里的电流（0–1） */
function JumpRing({ lift, open, pulse }: { lift: number; open: boolean; pulse: number }) {
  const tex = useMemo(() => { const t = rep(makeWinding([176, 92, 44], 40), 1, 1); t.rotation = Math.PI / 2; t.repeat.set(1, 8); return t }, [])
  const ring = useMemo(() => new THREE.TorusGeometry(0.03, 0.006, 16, 64, open ? Math.PI * 2 - 0.25 : Math.PI * 2), [open])
  const plate = makeText(['220 V 交流'], { w: 256, h: 64, bg: '#2a2c2f', fg: '#d6d9dc', size: 34 })
  const [x, , z] = RX.ring, yTop = TOP + 0.04 + RX.coilH
  const loop: V3[] = Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2; return [0.03 * Math.cos(a), 0, 0.03 * Math.sin(a)] as V3 })
  return <group position={[x, 0, z]}>
    <RoundedBox args={[0.2, 0.04, 0.2]} radius={0.008} smoothness={3} position={[0, TOP + 0.02, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#2c2f33" roughness={0.4} clearcoat={0.4} /></RoundedBox>
    <mesh position={[0, 0.02 + TOP, 0.1005]}><planeGeometry args={[0.07, 0.018]} /><meshBasicMaterial map={plate} /></mesh>
    <mesh position={[0, TOP + 0.04 + RX.coilH / 2, 0]} castShadow><cylinderGeometry args={[0.055, 0.055, RX.coilH, 48, 1, true]} /><meshPhysicalMaterial map={tex} emissive="#ff8a3c" emissiveIntensity={pulse * 0.6} roughness={0.3} metalness={0.6} clearcoat={0.5} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, yTop + 0.002, 0]}><cylinderGeometry args={[0.058, 0.058, 0.004, 48]} /><meshStandardMaterial color="#1c1d1f" roughness={0.6} /></mesh>
    {/* 铁芯：一束硅钢丝，外面看是一根灰色的圆棒 */}
    <mesh position={[0, TOP + 0.04 + RX.coreH / 2, 0]} castShadow><cylinderGeometry args={[0.018, 0.018, RX.coreH, 32]} /><Metal kind="steel" rough={0.45} /></mesh>
    <group position={[0, yTop + 0.008 + lift, 0]}>
      <mesh geometry={ring} rotation-x={Math.PI / 2} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
      {!open && <LoopFlow pts={loop} flow={pulse > 0.05 ? -1.5 : 0} dots={10} size={0.003} />}
    </group>
    {/* 底座前面的按钮开关 */}
    <mesh position={[0.06, TOP + 0.025, 0.1]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.009, 0.009, 0.008, 20]} /><meshStandardMaterial color={pulse > 0.05 ? '#5dff8a' : '#c8352b'} roughness={0.4} /></mesh>
  </group>
}

/** drop：两根管里磁铁各下落了多深（m）；held：手还捏着磁铁的那根管；lift、open、pulse 见跳环 */
export function RigX({ drop = [0, 0] as [number, number], held = 'plastic' as Pipe | null, lift = 0, open = false, pulse = 0, eddy = 0 }: { drop?: [number, number]; held?: Pipe | null; lift?: number; open?: boolean; pulse?: number; eddy?: number }) {
  const kinds: Pipe[] = ['plastic', 'alu']
  const eddyLoop = (y: number): V3[] => Array.from({ length: 14 }, (_, k) => { const a = k / 14 * Math.PI * 2; return [PR * Math.cos(a), y, PR * Math.sin(a)] as V3 })
  return <group position={[ST.x, 0, 0]}>
    <Bench w={1.5} />
    <Stand />
    {kinds.map((k, i) => {
      const x = RX.pipes[i], y = RX.base + PIPE.h - drop[i] - MH / 2
      return <group key={k} position={[x, 0, 0]}>
        <group position={[0, RX.base, 0]}><Tube kind={k} /></group>
        <group position={[0, Math.max(TOP + 0.05, y), 0]}><Puck /></group>
        {/* 铝管里磁铁上下两圈涡流：转向相反 */}
        {k === 'alu' && eddy > 0 && [[0.035, 1], [-0.035, -1]].map(([dy, s]) => <LoopFlow key={dy} pts={eddyLoop(y + dy)} flow={s * 1.2} dots={12} size={0.0034} color={COL.Bi} />)}
        {held === k && <group position={[0.012, RX.base + PIPE.h + 0.03, 0.006]} rotation={[0, Math.PI, Math.PI / 2]}><Hand side="right" curl={1.1} thumb={0.5} scale={0.55} sleeve={0.08} /></group>}
      </group>
    })}
    <JumpRing lift={lift} open={open} pulse={pulse} />
  </group>
}
