// 兴奋的传导和传递 · 突触上会动的那些东西（第 6、7 课和拓展共用）：几个正在释放的突触小泡、放出来的神经递质、突触后膜上的受体通道、流进去的离子。
// 两个突触：e 是第一个神经元的突触小体（兴奋性，从左边贴过来），i 是第三个神经元的（抑制性，从上方贴下来）。各课每帧把进度写进 Syn，这里照着画。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mix, rng, scatter, smooth, type V3 } from './kit'
import { Channel, IonCloud, IonStream } from './parts'
import { COLOR, N3X, N3Y, POST, PRE, R2, TM } from './world'

/** 一个突触的进度：dock 小泡移到前膜（0–1）；fuse 和前膜融合；cross 递质扩散到后膜；clear 递质被降解或回收；open 后膜上的通道开了多少；flow 有没有离子正在流进去 */
export interface Side { dock: number; fuse: number; cross: number; clear: number; open: number; flow: boolean }
export interface Syn { e: Side; i: Side }
const side = (): Side => ({ dock: 0, fuse: 0, cross: 0, clear: 0, open: 0, flow: false })
export const newSyn = (): Syn => ({ e: side(), i: side() })
export const resetSide = (s: Side) => Object.assign(s, side())

/**
 * 一次释放的时间表：t0 兴奋到达突触小体的时刻（秒）。fuse 为假：小泡到了前膜却融合不了；reach：递质走到离后膜多近（1 是结合上）；
 * open 为假：通道不开；keep：递质不被清除，通道一直开；clearAt：从什么时候开始清除递质（不给就不清）
 */
export function play(s: Side, t: number, o: { t0: number; fuse?: boolean; reach?: number; open?: boolean; keep?: boolean; clearAt?: number }) {
  const { t0, fuse = true, reach = 1, open = true, keep = false, clearAt } = o
  s.dock = smooth(t0, t0 + 1.1, t)
  s.fuse = fuse ? smooth(t0 + 1.1, t0 + 1.9, t) : 0
  s.cross = fuse ? smooth(t0 + 1.7, t0 + 3.3, t) * reach : 0
  s.clear = !keep && clearAt !== undefined ? smooth(clearAt, clearAt + 1.8, t) : 0
  s.open = fuse && open ? smooth(t0 + 3.2, t0 + 3.7, t) * (1 - s.clear) : 0
  s.flow = s.open > 0.6 && (keep || t < t0 + 6)
}
/** 时间表里的几个时刻（相对 t0）：递质放出来、结合上、离子开始流 */
export const AT = { release: 1.5, bind: 3.3, flowEnd: 6 }

// ---------- 两个突触各自的位置 ----------
/** 兴奋性突触：三个释放点沿着剖面排开 */
export const E_Y = [0.6, 1.6, 2.6]
/** 抑制性突触：三个释放点 */
export const I_X = [N3X - 1.0, N3X, N3X + 1.0]
interface Site { start: V3; dock: V3; from: V3; to: V3; rec: V3; path: V3[] }
const E_SITES: Site[] = E_Y.map((y, k) => ({
  start: [PRE - 2.2 - k * 0.35, y + 0.25, 0.45], dock: [PRE - TM - 0.4, y, 0.12], from: [PRE + 0.1, y, 0.12], to: [POST - 0.1, y, 0.1], rec: [POST + TM / 2, y, 0],
  path: [[POST - 0.55, y + 0.3, 0.35], [POST - 0.05, y, 0.06], [POST + TM + 0.1, y, 0.06], [POST + 1.7, y - 0.15, 0.5]],
}))
const I_SITES: Site[] = I_X.map((x, k) => ({
  start: [x + 0.1, N3Y + TM + 1.75 + k * 0.3, -0.5], dock: [x, N3Y + TM + 0.36, -0.12], from: [x, N3Y - 0.1, 0.1], to: [x, R2 + 0.1, 0.1], rec: [x, R2 - TM / 2, 0],
  path: [[x + 0.3, R2 + 0.55, 0.35], [x, R2 + 0.05, 0.06], [x, R2 - TM - 0.1, 0.06], [x - 0.15, R2 - TM - 1.6, 0.5]],
}))

function Release({ s, sites, color, chColor, ion, turn, r }: { s: () => Side; sites: Site[]; color: string; chColor: string; ion: string; turn: boolean; r: number }) {
  const ves = useRef<(THREE.Mesh | null)[]>([]), dots = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  const N = 7, jit = useMemo(() => { const rnd = rng(31); return sites.flatMap(() => Array.from({ length: N }, () => [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5] as V3)) }, [sites])
  useFrame(({ clock }) => {
    const v = s(), t = clock.elapsedTime
    sites.forEach((q, k) => {
      const m = ves.current[k]; if (m) { m.position.set(...mix(q.start, q.dock, v.dock)); m.position.y += 0.03 * Math.sin(t * 2 + k); m.scale.setScalar(Math.max(0.001, 1 - v.fuse)) }
      for (let j = 0; j < N; j++) {
        const i = k * N + j, d = jit[i], c = smooth(j * 0.05, 0.65 + j * 0.05, v.cross)
        const p = mix(q.from, q.to, c), spread = 0.16 + 0.5 * Math.sin(Math.min(1, c) * Math.PI) + 0.12 * c
        // 递质被清除：一边退回前膜（回收），一边变小消失（降解）
        const back = v.clear * 0.6
        o.position.set(p[0] + (q.from[0] - p[0]) * back + d[0] * spread * (turn ? 0.35 : 1.6), p[1] + (q.from[1] - p[1]) * back + d[1] * spread * (turn ? 1.6 : 0.35), p[2] + d[2] * spread + 0.1)
        o.scale.setScalar(smooth(0.25, 0.6, v.fuse) * (1 - v.clear)); o.updateMatrix(); dots.current?.setMatrixAt(i, o.matrix)
      }
    })
    if (dots.current) dots.current.instanceMatrix.needsUpdate = true
  })
  return <group>
    {sites.map((q, k) => <group key={k}>
      <mesh ref={e => { ves.current[k] = e }} position={q.start}><sphereGeometry args={[r, 24, 16]} /><meshPhysicalMaterial color="#f4eeff" roughness={0.25} clearcoat={0.8} emissive={color} emissiveIntensity={0.15} /></mesh>
      <Channel at={q.rec} color={chColor} open={() => s().open} turn={turn} size={0.85} />
      <IonStream path={q.path} color={ion} on={() => s().flow} n={3} speed={0.42} />
    </group>)}
    <instancedMesh ref={dots} args={[undefined, undefined, sites.length * N]} frustumCulled={false}><sphereGeometry args={[0.075, 12, 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} /></instancedMesh>
  </group>
}

/** 突触上会动的东西。syn：进度；inh：要不要画抑制性的那一个；toxin：受体被毒素占住（画上毒素分子） */
export function Synapse({ syn, inh = false, toxin = false }: { syn: Syn; inh?: boolean; toxin?: boolean }) {
  const c = useMemo(() => ({
    na: scatter(7, [PRE + 0.18, 0.2, -0.9], [POST - 0.18, 3.0, 0.7], 41, 0.4), kIn: scatter(6, [POST + 0.9, 0.2, 0.1], [POST + 4.2, 2.8, 1.4], 42, 0.7),
    cl: scatter(6, [N3X - 1.8, R2 + 0.18, -0.6], [N3X + 1.8, N3Y - 0.18, 0.7], 43, 0.4),
  }), [])
  return <group>
    <Release s={() => syn.e} sites={E_SITES} color={COLOR.nt} chColor={COLOR.rec} ion={COLOR.na} turn r={0.42} />
    <IonCloud at={c.na} color={COLOR.na} /><IonCloud at={c.kIn} color={COLOR.k} />
    {toxin && E_SITES.map((q, k) => <mesh key={k} position={[POST - 0.2, q.rec[1], 0.12]} scale={[0.7, 1.25, 0.9]}><icosahedronGeometry args={[0.21, 1]} /><meshStandardMaterial color="#8a5cf0" emissive="#6a3fd0" emissiveIntensity={0.6} roughness={0.4} flatShading /></mesh>)}
    {inh && <>
      <Release s={() => syn.i} sites={I_SITES} color={COLOR.nti} chColor={COLOR.clCh} ion={COLOR.cl} turn={false} r={0.36} />
      <IonCloud at={c.cl} color={COLOR.cl} />
    </>}
  </group>
}
