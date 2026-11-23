// 各课共用的小东西：这一课的舞台（选一张工作台、一个机位），把桌上的厘米坐标换成场景坐标，按时长走完的动作，拿东西用的那只手套。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { LabStage, lathe, type Label } from '@/lab-kit'
import { CM, SPOT, ST, type SpotKey, type StKey, type V3, type Want } from './world'

/** 桌上的厘米坐标（以这张台子上这一课的中心为原点，前方 +z）换成场景坐标 */
export function toWorld(at: StKey, p: V3): V3 {
  const s = ST[at], c = Math.cos(s.yaw), n = Math.sin(s.yaw)
  const x = p[0] * CM, y = p[1] * CM, z = p[2] * CM
  return [s.p[0] + x * c + z * n, s.p[1] + y, s.p[2] - x * n + z * c]
}

/** 这一课的舞台：选一处机位，交出器材和标签。want 是这一课对整个房子的要求（楼梯灯、插座） */
export function Place({ at, labels, want, children = null }: { at: SpotKey; labels: Label[]; want?: Partial<Want>; children?: ReactNode }) {
  const v = SPOT[at]
  const w = useMemo<Want>(() => ({ light: v.key, aim: v.aim, ...want }), [v, want])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={'sun' in v ? v.sun : 1.3} env={'env' in v ? v.env : 0.55} studio fog={v.fog} bloom={0.55} world={w}>{children}</LabStage>
}

/** 一张台子上的器材：里面一律按厘米写，原点在台面上、这一课的中心，前方 +z */
export function Bench({ at, children }: { at: StKey; children: ReactNode }) {
  const s = ST[at]
  return <group position={s.p} rotation-y={s.yaw}><group scale={CM}>{children}</group></group>
}

/** 一个按时长走完的动作：run() 开始，k 从 0 匀速走到 1，走完调用 onEnd。back() 退回 0，走完调用 onBack */
export function useRun(sec: number, onEnd?: () => void, onBack?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, to: 0, raf: 0 }), cb = useRef({ onEnd, onBack }); cb.current = { onEnd, onBack }
  const go = (to: number) => {
    cancelAnimationFrame(s.current.raf); s.current.to = to; setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const q = s.current, d = q.to - q.k
      q.k = Math.abs(d) <= dt / sec ? q.to : q.k + Math.sign(d) * dt / sec; setK(q.k)
      if (q.k !== q.to) q.raf = requestAnimationFrame(f); else { setBusy(false); if (q.to === 1) cb.current.onEnd?.(); else cb.current.onBack?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run: () => go(1), back: () => go(0), snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = s.current.to = v; setK(v); setBusy(false) } }
}

/** 一件事变了以后，过 ms 毫秒才算“稳住了”：指针还在摆的时候不许记录 */
export function useSettled(sig: string | number, ms = 1300) {
  const [seen, setSeen] = useState(sig)
  useEffect(() => { if (seen === sig) return; const t = setTimeout(() => setSeen(sig), ms); return () => clearTimeout(t) }, [sig, seen, ms])
  return seen === sig
}

/** 缓入缓出 */
export const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
export const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
export const v3 = (p: V3) => new THREE.Vector3(...p)

// ---------- 手套 ----------
// 一只握成拳的线手套，带一截工装袖子：表示“有人在拿、在扳”。按厘米写，拳心在原点，手腕朝 +y，手背朝 −z。
const CUFF = lathe([[4.1, 0], [4.4, 0.4], [4.4, 5.6], [4.1, 6], [3.6, 6], [3.6, 0]], { segs: 28, closed: true })
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.4, 1.2], [0, -2.6, 0.6], [0, -2.9, -1.0], [0, -2.2, -2.1]].map(p => new THREE.Vector3(...(p as [number, number, number])))); return new THREE.TubeGeometry(c, 20, 0.95, 10) })()
const ARM = 26
export function Glove({ scale = 0.62 }: { scale?: number }) {
  const knit = <meshStandardMaterial color="#9c8f72" roughness={0.95} />
  return <group scale={scale}><group position={[0, -0.2, -0.9]}>
    <RoundedBox args={[8.4, 7.4, 6.2]} radius={2.4} smoothness={3} position={[0, 4.6, -0.8]} castShadow>{knit}</RoundedBox>
    {[-2.9, -0.95, 0.95, 2.9].map((x, i) => <mesh key={x} geometry={FINGER} position={[x, 1.6, 1.4]} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]} castShadow>{knit}</mesh>)}
    <mesh position={[4.2, 1.8, 1.6]} rotation={[0.5, 0, 0.9]} castShadow><capsuleGeometry args={[1.05, 3.2, 6, 12]} />{knit}</mesh>
    <mesh geometry={CUFF} position={[0, 7.6, -0.8]} castShadow>{knit}</mesh>
    <mesh position={[0, 12.2, -0.8]}><cylinderGeometry args={[4.45, 4.45, 1.4, 28]} /><meshStandardMaterial color="#2f5d8a" roughness={0.9} /></mesh>
    <mesh position={[0, 12.9 + ARM / 2, -0.8]} castShadow><cylinderGeometry args={[5.6, 4.7, ARM, 24]} /><meshStandardMaterial color="#3d5a73" roughness={0.9} /></mesh>
    {[0.25, 0.55].map(k => <mesh key={k} position={[0, 12.9 + ARM * k, -0.8]} rotation-x={Math.PI / 2}><torusGeometry args={[4.75 + 0.9 * k, 0.18, 6, 28]} /><meshStandardMaterial color="#334c61" roughness={0.9} /></mesh>)}
    <mesh position={[0, 12.9 + ARM + 6, -0.8]}><cylinderGeometry args={[6.1, 5.6, 12, 24]} /><meshStandardMaterial color="#3d5a73" roughness={0.9} transparent opacity={0.45} depthWrite={false} /></mesh>
  </group></group>
}
