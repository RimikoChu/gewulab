// 各课共用的小东西：这一课的舞台、几个计时用的状态、把东西“提起—平移—放下”的搬运，和拿东西用的那只线手套。
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, lathe, type Label } from '@/lab-kit'
import { CRANE } from './physics'
import { SPOT, U, type SpotKey, type V3, type Want } from './world'

/** 这一课的舞台：选一处机位。棚里的课点亮工作灯、阳光弱一点；trolley 是塔吊小车的位置（m） */
export function Place({ at, labels, trolley = CRANE.start, children = null }: { at: SpotKey; labels: Label[]; trolley?: number; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor, trolley }), [v, trolley])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 2.2 : 3.0} env={v.indoor ? 0.75 : 1.0} fog={v.fog} world={want}>{children}</LabStage>
}

/** 一件事变了以后，过 ms 毫秒才算“稳住了”：杠杆还在摆、钩码还在半路的时候不许读数 */
export function useSettled(sig: string | number, ms = 1800) {
  const [seen, setSeen] = useState(sig)
  useEffect(() => { if (seen === sig) return; const t = setTimeout(() => setSeen(sig), ms); return () => clearTimeout(t) }, [sig, seen, ms])
  return seen === sig
}
/** 一个按时长走完的动作：run() 开始，k 从 0 匀速走到 1（按时间算），走完调用 onEnd。back() 退回 0 */
export function useRun(sec: number, onEnd?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, to: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const go = (to: number) => {
    cancelAnimationFrame(s.current.raf); s.current.to = to; setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const q = s.current, d = q.to - q.k
      q.k = Math.abs(d) <= dt / sec ? q.to : q.k + Math.sign(d) * dt / sec; setK(q.k)
      if (q.k !== q.to) q.raf = requestAnimationFrame(f); else { setBusy(false); if (q.to === 1) cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run: () => go(1), back: () => go(0), snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = s.current.to = v; setK(v); setBusy(false) } }
}

/** 缓入缓出 */
export const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)

/**
 * 搬运：at 一变，里面的东西先竖直提起来，平移过去，再竖直放下，不会横着撞到别的器材。搬的时候一只手套捏着它（grip 是手套相对它的位置）。
 * follow：每帧额外加上的位移（挂在杠杆上的东西跟着杠杆上下）；快落到位时才慢慢加上去。flag：每帧报告是不是还在路上。
 */
export function Carry({ at, lift = 0.6, speed = 2.4, follow, grip = [0, 0.05, 0], snap, flag, children }: { at: V3; lift?: number; speed?: number; follow?: () => V3; grip?: V3 | null; snap?: string | number; flag?: (moving: boolean) => void; children: ReactNode }) {
  const g = useRef<THREE.Group>(null), hand = useRef<THREE.Group>(null)
  const s = useRef({ p: new THREE.Vector3(...at), shown: new THREE.Vector3(...at), from: new THREE.Vector3(...at), to: new THREE.Vector3(...at), t: 1, a: 0, b: 0, c: 0 })
  useLayoutEffect(() => { const q = s.current; q.p.set(...at); q.shown.set(...at); q.to.set(...at); q.t = 1 }, [snap])   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const q = s.current
    if (q.to.x === at[0] && q.to.y === at[1] && q.to.z === at[2]) return
    q.from.copy(q.shown); q.p.copy(q.shown); q.to.set(...at); q.t = 0
    const dh = Math.hypot(at[0] - q.from.x, at[2] - q.from.z), top = Math.max(q.from.y, at[1]) + lift
    if (dh < 0.01) { q.a = 0; q.b = 0; q.c = Math.abs(at[1] - q.from.y) } else { q.a = top - q.from.y; q.b = dh; q.c = top - at[1] }
  }, [at[0], at[1], at[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const q = s.current, dt = Math.min(d, 1 / 30), total = q.a + q.b + q.c
    if (q.t < 1) {
      q.t = Math.min(1, q.t + dt * speed / Math.max(total, 0.6))
      const u = ease(q.t) * total
      if (q.b === 0) q.p.set(q.to.x, q.from.y + (q.to.y - q.from.y) * ease(q.t), q.to.z)
      else if (u < q.a) q.p.set(q.from.x, q.from.y + u, q.from.z)
      else if (u < q.a + q.b) { const k = (u - q.a) / q.b; q.p.set(q.from.x + (q.to.x - q.from.x) * k, q.from.y + q.a, q.from.z + (q.to.z - q.from.z) * k) }
      else q.p.set(q.to.x, q.from.y + q.a - (u - q.a - q.b), q.to.z)
    }
    const f = follow ? follow() : null, k = q.t ** 6          // 快落到位时才慢慢跟上杠杆的倾斜，不跳
    q.shown.set(q.p.x + (f ? f[0] * k : 0), q.p.y + (f ? f[1] * k : 0), q.p.z + (f ? f[2] * k : 0))
    g.current?.position.copy(q.shown)
    if (hand.current) hand.current.visible = q.t < 1
    flag?.(q.t < 1)
  })
  return <group ref={g} position={at}>{children}{grip && <group ref={hand} position={grip} visible={false}><Glove /></group>}</group>
}

// ---------- 线手套 ----------
const CUFF = lathe([[4.1, 0], [4.4, 0.4], [4.4, 5.6], [4.1, 6], [3.6, 6], [3.6, 0]].map(([r, y]) => [r * U, y * U]) as [number, number][], { segs: 28, closed: true })
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.4, 1.2], [0, -2.6, 0.6], [0, -2.9, -1.0], [0, -2.2, -2.1]].map(p => new THREE.Vector3(p[0] * U, p[1] * U, p[2] * U))); return new THREE.TubeGeometry(c, 20, 0.95 * U, 10) })()
/**
 * 一只握成拳的帆布手套（工地上干活戴的那种：土黄的帆布，袖口一道蓝边）。握着的东西从拳心穿过，拳心在原点；手腕朝 +y，手背朝 −z。
 * 只用来表示“有人在拿、在拉”：带一截工装袖子的小臂，往手腕方向伸出去，末端淡出。arm 为 false 时只画手套
 */
/** 小臂的长度（和手套同一单位） */
const ARM = 26
export function Glove({ tint = '#c4ae86', arm = true }: { tint?: string; arm?: boolean }) {
  const knit = <meshStandardMaterial color={tint} roughness={0.95} />
  return <group scale={0.8}><group position={[0, -0.2 * U, -0.9 * U]}>
    {/* 手掌和手背：一块圆角的厚块，在拳心上面 */}
    <RoundedBox args={[8.4 * U, 7.4 * U, 6.2 * U]} radius={2.4 * U} smoothness={3} position={[0, 4.6 * U, -0.8 * U]} castShadow>{knit}</RoundedBox>
    {/* 四根手指：从手掌下沿往前、往下弯过来，把东西扣在拳心里 */}
    {[-2.9, -0.95, 0.95, 2.9].map((x, i) => <mesh key={x} geometry={FINGER} position={[x * U, 1.6 * U, 1.4 * U]} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]} castShadow>{knit}</mesh>)}
    {/* 大拇指：从侧面压在手指上 */}
    <mesh position={[4.2 * U, 1.8 * U, 1.6 * U]} rotation={[0.5, 0, 0.9]} castShadow><capsuleGeometry args={[1.05 * U, 3.2 * U, 6, 12]} />{knit}</mesh>
    {/* 袖口 */}
    <mesh geometry={CUFF} position={[0, 7.6 * U, -0.8 * U]} castShadow><meshStandardMaterial color={tint} roughness={0.95} /></mesh>
    <mesh position={[0, 12.2 * U, -0.8 * U]}><cylinderGeometry args={[4.45 * U, 4.45 * U, 1.4 * U, 28]} /><meshStandardMaterial color="#2f5d8a" roughness={0.9} /></mesh>
    {/* 小臂：工装的袖子，从袖口往手腕方向伸出去一截，越远越淡，看得出是一个人伸手过来，不是一只拳头飘着 */}
    {arm && <>
      <mesh position={[0, (12.9 + ARM / 2) * U, -0.8 * U]} castShadow><cylinderGeometry args={[5.6 * U, 4.7 * U, ARM * U, 24]} /><meshStandardMaterial color="#3d5a73" roughness={0.9} /></mesh>
      {[0.25, 0.55].map(k => <mesh key={k} position={[0, (12.9 + ARM * k) * U, -0.8 * U]} rotation-x={Math.PI / 2}><torusGeometry args={[(4.75 + 0.9 * k) * U, 0.18 * U, 6, 28]} /><meshStandardMaterial color="#334c61" roughness={0.9} /></mesh>)}
      <mesh position={[0, (12.9 + ARM + 6) * U, -0.8 * U]}><cylinderGeometry args={[6.1 * U, 5.6 * U, 12 * U, 24]} /><meshStandardMaterial color="#3d5a73" roughness={0.9} transparent opacity={0.45} depthWrite={false} /></mesh>
    </>}
  </group></group>
}

/**
 * 空手走过去：手套从一处移到另一处（比如从一套滑轮的测力计换到另一套），只在路上看得见；到了就交给那边握着的手套。
 * onArrive：到了报告一次
 */
export function Courier({ at, onArrive, flip = false }: { at: V3; onArrive?: () => void; flip?: boolean }) {
  const vis = useRef<THREE.Group>(null), was = useRef(false)
  return <Carry at={at} grip={null} lift={0.4} speed={2.2} flag={m => { if (vis.current) vis.current.visible = m; if (was.current && !m) onArrive?.(); was.current = m }}>
    <group ref={vis} visible={false} rotation-z={flip ? Math.PI : 0}><Glove /></group>
  </Carry>
}
