// 放大窗：一块圆形的“放大示意”，里面是比例模型的分子（N 蓝、H 白，Fe 灰），按时间在窗里运动、碰撞、反应。
// 第 2 课只看活化分子和有效碰撞（gas）；第 3 课在催化剂表面上正逆两个方向同时反应，分子数跟着计算核心给的目标数走（surface）。
// 每帧在 useFrame 里重排实例化的小球，不走 React 的状态。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { rng, type V3 } from './parts'

/** 全实验室统一的原子颜色 */
export const ATOM = { N: '#3f6fe0', H: '#f2f3f5', Fe: '#8c8f94', O: '#e04a3a' }
type Kind = 0 | 1 | 2   // N₂、H₂、NH₃
interface Mol { k: Kind; p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; spin: THREE.Vector3; act: boolean; bind?: { from: THREE.Vector3; to: THREE.Vector3; t: number; ev: number } ; born: number }
interface Ev { dir: 1 | -1; site: THREE.Vector3; t: number; mols: Mol[] }

export interface Counts { n2: number; h2: number; nh3: number }
export interface LensProps {
  at: V3; R: number; rotY?: number
  /** 窗里的分子数：key 变了就按 counts 重新摆一遍 */
  counts: Counts; snap: string
  /** surface：底部有一层铁催化剂，正逆反应在表面上发生 */
  surface?: boolean
  /** 运动快慢（1 是原来）；活化分子的比例 */
  speed?: number; active?: number
  /** 第 2 课：每秒有效碰撞几次 */
  hits?: number
  /** 第 3 课：正、逆反应每秒画几次（示意），以及 NH₃ 的目标数 */
  fwd?: number; rev?: number; target?: number
  /** 指向哪一点（放大的是哪里）：画两道细线 */
  point?: V3
  running?: boolean
  tint?: string
}

const ACT_COL = new THREE.Color('#ffb36b')
const sphere = new THREE.SphereGeometry(1, 20, 14)

export function Lens({ at, R, rotY = 0, counts, snap, surface = false, speed = 1, active = 0, hits = 0, fwd = 0, rev = 0, target, point, running = true, tint = '#0c1a26' }: LensProps) {
  const s = R * 0.062                                    // 原子的尺度
  const floor = surface ? -R * 0.5 : -R * 0.86            // 气体能到的最低处
  const live = useRef({ speed, active, hits, fwd, rev, target, running, surface })
  live.current = { speed, active, hits, fwd, rev, target, running, surface }
  const st = useRef({ mols: [] as Mol[], evs: [] as Ev[], fl: [] as { p: THREE.Vector3; t: number }[], accF: 0, accR: 0, accH: 0, now: 0, reAct: 0, r: rng(7) })
  const nMesh = useRef<THREE.InstancedMesh>(null), hMesh = useRef<THREE.InstancedMesh>(null), haloMesh = useRef<THREE.InstancedMesh>(null), flMesh = useRef<THREE.InstancedMesh>(null)

  /** 窗里一个随机的位置 */
  const spot = (r: () => number, y0 = floor + s * 2) => {
    for (;;) { const x = (r() * 2 - 1) * R * 0.82, y = y0 + r() * (R * 0.82 - y0); if (x * x + y * y < (R * 0.82) ** 2) return new THREE.Vector3(x, y, (r() - 0.5) * R * 0.1) }
  }
  const make = (k: Kind, p: THREE.Vector3, r: () => number, up = false): Mol => {
    const a = r() * Math.PI * 2, sp = R * 0.22 * (0.6 + r() * 0.8)
    return { k, p: p.clone(), v: new THREE.Vector3(Math.cos(a) * sp, up ? Math.abs(Math.sin(a)) * sp + R * 0.15 : Math.sin(a) * sp, 0), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(2.4), act: false, born: st.current.now }
  }
  // 按 counts 重新摆
  useEffect(() => {
    const S = st.current, r = S.r; S.mols = []; S.evs = []; S.fl = []; S.accF = S.accR = S.accH = 0
    const add = (k: Kind, n: number) => { for (let i = 0; i < n; i++) S.mols.push(make(k, spot(r), r)) }
    add(0, counts.n2); add(1, counts.h2); add(2, counts.nh3)
    S.reAct = 0
  }, [snap])   // eslint-disable-line react-hooks/exhaustive-deps

  // 铁催化剂表面：几排紧密堆积的铁原子，铺在窗的下部
  const fe = useMemo(() => {
    if (!surface) return [] as V3[]
    const out: V3[] = [], d = s * 2.1
    for (let row = 0; row < 3; row++) for (let i = -14; i <= 14; i++) {
      const x = i * d + (row % 2) * d / 2, y = floor - s * 1.2 - row * d * 0.86, z = -row * s * 0.4
      if (x * x + y * y < (R * 0.93) ** 2) out.push([x, y, z])
    }
    return out
  }, [surface, s, floor, R])
  const feMesh = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = feMesh.current; if (!m) return
    const o = new THREE.Object3D()
    fe.forEach((p, i) => { o.position.set(...p); o.scale.setScalar(s * 1.08); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
    m.count = fe.length; m.instanceMatrix.needsUpdate = true
  }, [fe, s])

  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3(), c: new THREE.Color() }), [])
  /** 分子里各原子的位置（分子自己的坐标里） */
  const ATOMS: Record<Kind, [0 | 1, number, number, number, number][]> = useMemo(() => ({
    0: [[0, -0.62, 0, 0, 1], [0, 0.62, 0, 0, 1]],
    1: [[1, -0.42, 0, 0, 0.72], [1, 0.42, 0, 0, 0.72]],
    2: [[0, 0, 0.18, 0, 1], ...[0, 1, 2].map(j => [1, Math.cos(j * 2.094) * 0.92, -0.38, Math.sin(j * 2.094) * 0.92, 0.72] as [1, number, number, number, number])],
  }), [])

  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), S = st.current, L = live.current, r = S.r
    S.now += dt
    const run = L.running
    const v0 = L.speed
    // 活化分子：每隔一会儿重新挑一批（能量在分子之间不断交换）
    S.reAct -= dt
    if (S.reAct <= 0) {
      S.reAct = 1.6
      const free = S.mols.filter(m => !m.bind && m.k !== 2), n = Math.round(free.length * L.active)
      free.forEach(m => { m.act = false })
      for (let i = 0; i < n && free.length; i++) { const j = Math.floor(r() * free.length); free[j].act = true; free.splice(j, 1) }
    }
    // 运动：在圆窗里匀速飞、碰壁反弹
    for (const m of S.mols) {
      if (m.bind) { m.bind.t = Math.min(1, m.bind.t + dt / 0.7); m.p.lerpVectors(m.bind.from, m.bind.to, m.bind.t * m.bind.t * (3 - 2 * m.bind.t)); continue }
      if (!run) continue
      m.p.addScaledVector(m.v, dt * v0 * (m.act ? 1.25 : 1))
      const rr = Math.hypot(m.p.x, m.p.y), lim = R * 0.84
      if (rr > lim) { const nx = m.p.x / rr, ny = m.p.y / rr, dot = m.v.x * nx + m.v.y * ny; if (dot > 0) { m.v.x -= 2 * dot * nx; m.v.y -= 2 * dot * ny } m.p.x = nx * lim; m.p.y = ny * lim }
      if (m.p.y < floor + s * 1.4) { m.p.y = floor + s * 1.4; m.v.y = Math.abs(m.v.y) }
      m.p.z = THREE.MathUtils.clamp(m.p.z, -R * 0.06, R * 0.06)
      tmp.o.quaternion.setFromEuler(new THREE.Euler(m.spin.x * dt * v0, m.spin.y * dt * v0, m.spin.z * dt * v0)); m.q.multiply(tmp.o.quaternion)
    }
    // 第 2 课：有效碰撞——一个活化的 N₂ 和一个 H₂ 撞上，闪一下
    if (run && L.hits > 0) {
      S.accH += L.hits * dt
      while (S.accH >= 1) {
        S.accH -= 1
        const a = S.mols.filter(m => m.act && m.k === 0); if (!a.length) break
        const m = a[Math.floor(r() * a.length)]
        S.fl.push({ p: m.p.clone(), t: 0 })
        m.v.multiplyScalar(-1)
      }
    }
    // 第 3 课：催化剂表面上的正、逆反应
    if (run && L.surface && L.target !== undefined) {
      const proj = S.mols.filter(m => m.k === 2).length + S.evs.reduce((n, e) => n + (e.dir > 0 ? 2 : -2), 0)
      S.accF = Math.min(2, S.accF + L.fwd * dt); S.accR = Math.min(2, S.accR + L.rev * dt)
      const site = () => new THREE.Vector3((r() * 2 - 1) * R * 0.6, floor + s * 0.8, 0)
      if (S.accF >= 1 && proj <= L.target) {
        const n2 = S.mols.filter(m => m.k === 0 && !m.bind), h2 = S.mols.filter(m => m.k === 1 && !m.bind)
        if (n2.length >= 1 && h2.length >= 3) {
          S.accF -= 1
          const at = site(), pick = [n2[Math.floor(r() * n2.length)], ...h2.sort(() => r() - 0.5).slice(0, 3)]
          pick.forEach((m, i) => { m.act = false; m.bind = { from: m.p.clone(), to: at.clone().add(new THREE.Vector3(i === 0 ? 0 : (i - 2) * s * 1.9, i === 0 ? 0 : s * 1.3, 0)), t: 0, ev: 0 } })
          S.evs.push({ dir: 1, site: at, t: 0, mols: pick })
        } else S.accF = 0
      }
      if (S.accR >= 1 && proj >= L.target + 1) {
        const nh = S.mols.filter(m => m.k === 2 && !m.bind)
        if (nh.length >= 2) {
          S.accR -= 1
          const at = site(), pick = nh.sort(() => r() - 0.5).slice(0, 2)
          pick.forEach((m, i) => { m.bind = { from: m.p.clone(), to: at.clone().add(new THREE.Vector3((i - 0.5) * s * 2.4, 0, 0)), t: 0, ev: 0 } })
          S.evs.push({ dir: -1, site: at, t: 0, mols: pick })
        } else S.accR = 0
      }
    }
    // 吸附到位的那一组：换成产物，闪一下
    for (const e of S.evs) e.t += dt
    for (const e of S.evs.filter(e => e.t >= 0.85)) {
      S.mols = S.mols.filter(m => !e.mols.includes(m))
      const out: Kind[] = e.dir > 0 ? [2, 2] : [0, 1, 1, 1]
      out.forEach((k, i) => S.mols.push(make(k, e.site.clone().add(new THREE.Vector3((i - (out.length - 1) / 2) * s * 2.2, s * 1.2, 0)), r, true)))
      S.fl.push({ p: e.site.clone(), t: 0 })
    }
    S.evs = S.evs.filter(e => e.t < 0.85)
    // 画出来
    const N = nMesh.current, H = hMesh.current, A = haloMesh.current, F = flMesh.current; if (!N || !H || !A || !F) return
    let ni = 0, hi = 0, ai = 0
    for (const m of S.mols) {
      const grow = Math.min(1, (S.now - m.born) / 0.25)
      for (const [el, x, y, z, rad] of ATOMS[m.k]) {
        tmp.v.set(x * s, y * s, z * s).applyQuaternion(m.q).add(m.p)
        tmp.o.position.copy(tmp.v); tmp.o.scale.setScalar(rad * s * grow); tmp.o.quaternion.identity(); tmp.o.updateMatrix()
        if (el === 0) N.setMatrixAt(ni++, tmp.o.matrix); else H.setMatrixAt(hi++, tmp.o.matrix)
      }
      if (m.act) { tmp.o.position.copy(m.p); tmp.o.scale.setScalar(s * (m.k === 0 ? 2.1 : 1.6)); tmp.o.updateMatrix(); A.setMatrixAt(ai++, tmp.o.matrix) }
    }
    N.count = ni; H.count = hi; A.count = ai
    let fi = 0
    for (const f of S.fl) { f.t += dt; if (f.t > 0.6) continue; const k = f.t < 0.08 ? f.t / 0.08 : Math.exp(-(f.t - 0.08) * 6); tmp.o.position.copy(f.p); tmp.o.scale.setScalar(s * (1.5 + f.t * 6) * Math.max(0.05, k)); tmp.o.updateMatrix(); F.setMatrixAt(fi++, tmp.o.matrix) }
    S.fl = S.fl.filter(f => f.t <= 0.6)
    F.count = fi
    for (const m of [N, H, A, F]) m.instanceMatrix.needsUpdate = true
  })

  const ring = useMemo(() => new THREE.TorusGeometry(R, R * 0.035, 12, 96), [R])
  // 两道指向放大处的细线
  const beams = useMemo(() => {
    if (!point) return []
    const c = new THREE.Vector3(...at), p = new THREE.Vector3(...point)
    const side = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY))
    const toP = p.clone().sub(c), phi = Math.atan2(toP.y, toP.dot(side))
    return [1, -1].map(k => {
      const ang = phi + k * 1.15, e = c.clone().addScaledVector(side, Math.cos(ang) * R).add(new THREE.Vector3(0, Math.sin(ang) * R, 0))
      const a = p.clone(), dlt = e.clone().sub(a), len = dlt.length()
      return { pos: a.clone().addScaledVector(dlt, 0.5), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dlt.normalize()), len }
    })
  }, [point, at, R, rotY])

  return <>
    {beams.map((b, i) => <mesh key={i} position={b.pos} quaternion={b.q} renderOrder={4}><cylinderGeometry args={[R * 0.008, R * 0.008, b.len, 6]} /><meshBasicMaterial color="#9fd8ff" transparent opacity={0.55} toneMapped={false} depthWrite={false} /></mesh>)}
    {point && <mesh position={point}><sphereGeometry args={[R * 0.03, 16, 12]} /><meshBasicMaterial color="#9fd8ff" toneMapped={false} /></mesh>}
    <group position={at} rotation-y={rotY}>
      {/* 镜框：一圈拉丝的金属环，背后一块深色的底 */}
      <mesh geometry={ring}><Metal kind="aluminum" grain="brushed" rough={0.3} /></mesh>
      <mesh position-z={-R * 0.12}><circleGeometry args={[R * 1.01, 96]} /><meshBasicMaterial color={tint} toneMapped={false} /></mesh>
      <mesh position-z={-R * 0.11}><ringGeometry args={[R * 0.9, R * 1.0, 96]} /><meshBasicMaterial color="#1c3348" toneMapped={false} transparent opacity={0.8} /></mesh>
      {/* 分子 */}
      <instancedMesh ref={nMesh} args={[sphere, undefined, 400]} frustumCulled={false}><meshStandardMaterial color={ATOM.N} roughness={0.35} metalness={0.05} envMapIntensity={0.9} /></instancedMesh>
      <instancedMesh ref={hMesh} args={[sphere, undefined, 900]} frustumCulled={false}><meshStandardMaterial color={ATOM.H} roughness={0.35} metalness={0.02} envMapIntensity={0.9} /></instancedMesh>
      <instancedMesh ref={haloMesh} args={[sphere, undefined, 200]} frustumCulled={false} renderOrder={5}><meshBasicMaterial color={ACT_COL} transparent opacity={0.38} depthWrite={false} side={THREE.BackSide} toneMapped={false} blending={THREE.AdditiveBlending} /></instancedMesh>
      <instancedMesh ref={flMesh} args={[sphere, undefined, 40]} frustumCulled={false} renderOrder={6}><meshBasicMaterial color="#fff1c4" transparent opacity={0.85} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} /></instancedMesh>
      {surface && <instancedMesh ref={feMesh} args={[sphere, undefined, 120]} frustumCulled={false}><meshStandardMaterial color={ATOM.Fe} roughness={0.32} metalness={0.85} envMapIntensity={1.2} /></instancedMesh>}
    </group>
  </>
}
