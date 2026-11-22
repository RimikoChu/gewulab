// 各课共用的小东西：这一课的舞台、按时间走的实验钟、跟着周围温度变的示数、做完后的结论卡。
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Glass, LabButton } from '@/components/lab/lab-shell'
import { LabStage, type Label } from '@/lab-kit'
import { follow } from './physics'
import { AIR, SPOT, type SpotKey, type Want } from './world'

/** 这一课的舞台：选一处机位。在屋外时开阳光，在屋里靠世界里的灯。bloom：火苗周围溢出一点光 */
export function Room({ at, labels, bloom = 0, fridge, power, cycle, children = null }: { at: SpotKey; labels: Label[]; bloom?: number; fridge?: number; power?: boolean; cycle?: boolean; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, out: v.out, fridge, power, cycle }), [v, fridge, power, cycle])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.out ? 2.7 : 0} bloom={bloom} {...AIR} world={want}>{children}</LabStage>
}

/** 实验钟：on 为真时往前走，每秒走 speed，走到 max 停下。返回现在的时刻和一个把它拨到某个时刻的函数 */
export function useRun(on: boolean, speed: number, max: number) {
  const [t, setT] = useState(0), cur = useRef(0)
  useEffect(() => {
    if (!on) return
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      cur.current = Math.min(max, cur.current + dt * speed); setT(cur.current)
      if (cur.current < max) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [on, speed, max])
  const set = (v: number) => { cur.current = v; setT(v) }
  return [t, set] as const
}

/** 温度计的示数：慢慢向周围的温度 target 靠拢，tau 是快慢（秒）。start 是一开始的示数 */
export function useReading(target: number, tau: number, start: number) {
  const [T, setT] = useState(start), cur = useRef(start), live = useRef({ target, tau }); live.current = { target, tau }
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const next = follow(cur.current, live.current.target, dt, live.current.tau)
      if (Math.abs(next - cur.current) > 1e-4) { cur.current = next; setT(next) }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const set = (v: number) => { cur.current = v; setT(v) }
  return [T, set] as const
}

/** 全部任务完成后弹出的结论卡 */
export function Done({ head, title, children, onClose }: { head: string; title: string; children: ReactNode; onClose: () => void }) {
  return (
    <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
      <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{head}</p>
      <p className="mt-2 text-[21px] leading-snug font-bold">{title}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-white/70">{children}</p>
      <LabButton primary className="mx-auto mt-4" onClick={onClose}>再看一看</LabButton>
    </Glass>
  )
}
/** 面板里的大读数 */
export function Big({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div className="text-center">
    <div className="text-[13px] text-white/60">{label}</div>
    <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span></div>
  </div>
}
export const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-4 text-[12.5px] text-white/55">{children}</h2>

type V3 = [number, number, number]
const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
/** 搬运：at 一变，里面的东西先竖直提起来，平移过去，再竖直放下，不会横着撞到别的器材。lift 是平移时比两头高出多少 */
export function Carry({ at, lift = 0.6, speed = 1.7, children }: { at: V3; lift?: number; speed?: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const s = useRef({ p: new THREE.Vector3(...at), from: new THREE.Vector3(...at), to: new THREE.Vector3(...at), t: 1, a: 0, b: 0, c: 0 })
  useLayoutEffect(() => {
    const q = s.current
    if (q.to.x === at[0] && q.to.y === at[1] && q.to.z === at[2]) return
    q.from.copy(q.p); q.to.set(...at); q.t = 0
    const top = Math.max(q.from.y, at[1]) + lift
    q.a = top - q.from.y; q.b = Math.hypot(at[0] - q.from.x, at[2] - q.from.z); q.c = top - at[1]
  }, [at[0], at[1], at[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const q = s.current, total = q.a + q.b + q.c
    if (q.t < 1) {
      q.t = Math.min(1, q.t + Math.min(d, 1 / 30) * speed / Math.max(total, 0.5))
      const u = ease(q.t) * total
      if (u < q.a) q.p.set(q.from.x, q.from.y + u, q.from.z)
      else if (u < q.a + q.b) { const k = (u - q.a) / q.b; q.p.set(q.from.x + (q.to.x - q.from.x) * k, q.from.y + q.a, q.from.z + (q.to.z - q.from.z) * k) }
      else q.p.set(q.to.x, q.from.y + q.a - (u - q.a - q.b), q.to.z)
    }
    g.current?.position.copy(q.p)
  })
  return <group ref={g} position={at}>{children}</group>
}
