// 各课共用的小东西：按时间走的实验钟、跟着目标走的示数、结论卡、面板里的大读数，和拿东西用的那只手套。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Glass, LabButton } from '@/components/lab/lab-shell'
import { lathe } from '@/lab-kit'
import { follow } from './physics'

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

/** 示数慢慢向目标 target 靠拢，tau 是快慢（秒） */
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

/** 全部任务完成后的结论卡（外壳把它放进底部的结论条） */
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
    <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span></div>
  </div>
}
export const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-4 text-[12.5px] text-white/55">{children}</h2>
/** 面板里的一行算式：左边是式子，右边是结果 */
export function Calc({ f, v, on = true }: { f: ReactNode; v: ReactNode; on?: boolean }) {
  return <div className={`mt-2 flex items-baseline justify-between gap-3 rounded-xl bg-white/8 px-3 py-2.5 transition-opacity ${on ? '' : 'opacity-40'}`}>
    <span className="font-formula text-[15px] italic text-white/75">{f}</span>
    <span className="text-[18px] font-bold whitespace-nowrap tabular-nums">{v}</span>
  </div>
}

// ---------- 手套 ----------
const U = 0.1   // 手套按 1 cm 一个单位画
const CUFF = lathe([[4.1, 0], [4.4, 0.4], [4.4, 5.6], [4.1, 6], [3.6, 6], [3.6, 0]].map(([r, y]) => [r * U, y * U]) as [number, number][], { segs: 28, closed: true })
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.5, 1.1], [0, -2.7, 0.5], [0, -3.0, -1.0], [0, -2.3, -2.0]].map(p => new THREE.Vector3(p[0] * U, p[1] * U, p[2] * U))); return new THREE.TubeGeometry(c, 20, 0.95 * U, 10) })()
/**
 * 一只握成拳的白色棉线手套（实验室里戴的），带一截蓝色工作服的袖子。拳心在原点，握着的东西从拳心穿过；手腕朝 +y，手背朝 −z。
 */
export function Glove({ tint = '#e9e6dc', sleeve = 1.1 }: { tint?: string; sleeve?: number }) {
  const knit = <meshStandardMaterial color={tint} roughness={0.95} />
  return <group position={[0, -0.02 * U, -0.9 * U]}>
    <RoundedBox args={[8.4 * U, 7.4 * U, 6.2 * U]} radius={2.4 * U} smoothness={3} position={[0, 4.6 * U, -0.8 * U]} castShadow>{knit}</RoundedBox>
    {[-2.9, -0.95, 0.95, 2.9].map((x, i) => <mesh key={x} geometry={FINGER} position={[x * U, 1.6 * U, 1.4 * U]} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]} castShadow>{knit}</mesh>)}
    <mesh position={[4.2 * U, 1.8 * U, 1.6 * U]} rotation={[0.5, 0, 0.9]} castShadow><capsuleGeometry args={[1.05 * U, 3.2 * U, 6, 12]} />{knit}</mesh>
    <mesh geometry={CUFF} position={[0, 7.6 * U, -0.8 * U]} castShadow>{knit}</mesh>
    {/* 工作服的袖子：从袖口往手腕方向伸出去一截，末端淡出 */}
    <mesh position={[0, 13.6 * U + sleeve / 2, -0.8 * U]} castShadow><cylinderGeometry args={[5.6 * U, 4.6 * U, sleeve, 24]} /><meshStandardMaterial color="#35526e" roughness={0.9} /></mesh>
    <mesh position={[0, 13.7 * U, -0.8 * U]} rotation-x={Math.PI / 2}><torusGeometry args={[4.65 * U, 0.3 * U, 6, 28]} /><meshStandardMaterial color="#2b4359" roughness={0.9} /></mesh>
    <mesh position={[0, 13.6 * U + sleeve + 0.25, -0.8 * U]}><cylinderGeometry args={[5.75 * U, 5.6 * U, 0.5, 24]} /><meshStandardMaterial color="#35526e" roughness={0.9} transparent opacity={0.35} depthWrite={false} /></mesh>
  </group>
}
