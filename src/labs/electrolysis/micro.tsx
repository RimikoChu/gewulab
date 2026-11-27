// 微观放大窗：浮在器材旁边的一扇方窗，左右各一条电极，中间是溶液里的离子（示意，不按比例、不按数目）。
// 通电后阳离子、阴离子各自漂向一极，在电极上得失电子变成原子（贴在电极上）或气体分子（成对往上冒）；
// 电极条和上面的导线里有亮黄的电子光点在走。离子的颜色全间统一，写在 SP 里；面板上的图例也从这里取。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FONT } from './mats'
import type { V3 } from './world'

/** 粒子的样子：名字、颜色、半径（相对窗口的半高）、带的电荷（正负号）；pair：两个原子连成的气体分子 */
export const SP = {
  Cu2: { name: 'Cu²⁺', color: '#22c3e6', r: 0.058, q: 1 },
  Cl: { name: 'Cl⁻', color: '#46c96a', r: 0.062, q: -1 },
  Na: { name: 'Na⁺', color: '#a77bff', r: 0.052, q: 1 },
  H: { name: 'H⁺', color: '#ff5a4a', r: 0.04, q: 1 },
  OH: { name: 'OH⁻', color: '#3f6dff', r: 0.056, q: -1 },
  SO4: { name: 'SO₄²⁻', color: '#e8c84a', r: 0.07, q: -1 },
  Zn2: { name: 'Zn²⁺', color: '#c9d3df', r: 0.055, q: 1 },
  Fe2: { name: 'Fe²⁺', color: '#f08a3c', r: 0.055, q: 1 },
  Mg2: { name: 'Mg²⁺', color: '#ff9fd0', r: 0.052, q: 1 },
  Al3: { name: 'Al³⁺', color: '#e9e2c0', r: 0.048, q: 1 },
  O2m: { name: 'O²⁻', color: '#ff7f9a', r: 0.06, q: -1 },
  Cu: { name: '铜原子', color: '#c8643c', r: 0.06, q: 0 },
  M: { name: '金属原子', color: '#d9dde2', r: 0.058, q: 0 },
  H2: { name: 'H₂', color: '#f4f4f0', r: 0.04, q: 0, pair: true },
  Cl2: { name: 'Cl₂', color: '#c5e04a', r: 0.06, q: 0, pair: true },
  O2: { name: 'O₂', color: '#ff9fc0', r: 0.052, q: 0, pair: true },
  e: { name: '电子', color: '#ffe45c', r: 0.03, q: 0 },
} as const
export type Sp = keyof typeof SP
type Def = { name: string; color: string; r: number; q: number; pair?: boolean }

/** 一条电极：颜色、牌子上的字；take：哪些粒子到了它表面会反应（coat 变成原子贴在电极上，gas 变成气体分子冒走，gone 直接消耗掉）；
 *  emit：电极表面不断放出的粒子（金属溶解成离子、生成 OH⁻）；e：电子在电极条里往哪走（1 从导线流进来，−1 流出去，0 不动） */
export interface Side { color: string; tag: string; take?: Partial<Record<Sp, { to: 'coat' | 'gas' | 'gone'; as?: Sp }>>; emit?: { sp: Sp; rate: number }[]; e: -1 | 0 | 1 }
/** ions：溶液里每种粒子画几个；field：1 表示阳离子漂向左边、阴离子漂向右边，−1 相反，0 不定向；membrane：中间有一张膜，只让这几种粒子过去 */
export interface MicroCfg { left: Side; right: Side; ions: Partial<Record<Sp, number>>; field: -1 | 0 | 1; membrane?: Sp[]; half?: Partial<Record<Sp, 'L' | 'R'>> }

interface P { sp: Sp; x: number; y: number; vx: number; vy: number; s: number; kind: 'ion' | 'gas' | 'coat'; side: -1 | 1; slot: number; a: number }
const sph = new THREE.SphereGeometry(1, 16, 12)
const dummy = new THREE.Object3D(), col = new THREE.Color()
const W = 1.5, HH = 1, EX = 1.24, EW = 0.2          // 窗的半宽、半高；电极条中心的 x 和宽
const XL = EX - EW / 2                              // 溶液的边界（电极表面）
const MAX = 320, COAT = 36

function tagTex(text: string, color: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 80
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f6f6'; g.beginPath(); g.roundRect(2, 2, 252, 76, 18); g.fill()
  g.strokeStyle = color; g.lineWidth = 7; g.beginPath(); g.roundRect(5, 5, 246, 70, 15); g.stroke()
  g.fillStyle = '#15202a'; g.font = `700 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 43, 236)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/**
 * 放大窗。at：窗的中心；r：窗的半高（画面单位，窗宽是它的三倍）；yaw：窗面朝向（和机位的方位角一致，正对镜头）；
 * from：引线落在器材上的那一点；on：通电了没有（没通电时离子只是乱动）
 */
export function Micro({ at, r, yaw = 0, from, cfg, on, seed = 1 }: { at: V3; r: number; yaw?: number; from?: V3; cfg: MicroCfg; on: boolean; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const st = useRef<{ list: P[]; rnd: () => number; half: Record<string, number>; acc: Record<string, number>; coat: [number, number]; t: number }>(null as never)
  if (!st.current) { let s = seed * 7919 + 11; st.current = { list: [], rnd: () => (s = (s * 16807) % 2147483647) / 2147483647, half: {}, acc: {}, coat: [0, 0], t: 0 } }
  const live = useRef({ cfg, on }); live.current = { cfg, on }
  const key = JSON.stringify(cfg.ions) + JSON.stringify(cfg.half ?? {}) + cfg.left.tag + cfg.right.tag
  const spawn = (sp: Sp, where?: 'L' | 'R'): P => {
    const { rnd } = st.current, m = live.current.cfg.membrane && !live.current.cfg.membrane.includes(sp)
    const lo = where === 'R' || (m && !where && rnd() < 0.5) ? 0.08 : -XL + 0.1, hi = where === 'L' || (m && lo < 0) ? -0.08 : XL - 0.1
    return { sp, x: lo + rnd() * (hi - lo), y: (rnd() * 2 - 1) * (HH - 0.12), vx: (rnd() - 0.5) * 0.3, vy: (rnd() - 0.5) * 0.3, s: 0, kind: 'ion', side: 1, slot: 0, a: rnd() * 6.28 }
  }
  // 换了一种溶液：重新撒一遍离子
  useEffect(() => {
    const S = st.current; S.list = []; S.coat = [0, 0]; S.half = {}; S.acc = {}
    for (const sp of Object.keys(cfg.ions) as Sp[]) for (let i = 0; i < (cfg.ions[sp] ?? 0); i++) S.list.push(spawn(sp, cfg.half?.[sp]))
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!on) { const S = st.current; S.list = S.list.filter(p => p.kind === 'ion'); S.coat = [0, 0] } }, [on])
  useFrame((_, d) => {
    const m = ref.current; if (!m) return
    const dt = Math.min(d, 1 / 30), S = st.current, { cfg, on } = live.current, rnd = S.rnd
    S.t += dt
    const sides = { [-1]: cfg.left, 1: cfg.right } as Record<number, Side>
    // 电极表面放出的粒子
    if (on) for (const sd of [-1, 1] as const) for (const em of sides[sd].emit ?? []) {
      const k = sd + em.sp; S.acc[k] = (S.acc[k] ?? 0) + em.rate * dt
      while (S.acc[k] >= 1) { S.acc[k] -= 1; if (S.list.filter(p => p.sp === em.sp && p.kind === 'ion').length < 16) S.list.push({ ...spawn(em.sp), x: sd * (XL - 0.04), vx: -sd * 0.35, s: 0.3 }) }
    }
    const next: P[] = []
    for (const p of S.list) {
      const def = SP[p.sp] as Def
      p.s = Math.min(1, p.s + dt * 2.5)
      if (p.kind === 'coat') { next.push(p); continue }
      if (p.kind === 'gas') { p.y += dt * 0.5; p.x += Math.sin(S.t * 5 + p.a) * dt * 0.08; p.a += dt * 2; if (p.y < HH + 0.1) next.push(p); continue }
      // 离子：乱动，通电后带电的再加一个定向的漂移
      p.vx += (rnd() - 0.5) * 2.6 * dt; p.vy += (rnd() - 0.5) * 2.6 * dt
      if (on && def.q) p.vx += -def.q * cfg.field * 0.9 * dt
      const sp = Math.hypot(p.vx, p.vy), cap = 0.42; if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp }
      const px = p.x; p.x += p.vx * dt; p.y += p.vy * dt
      if (Math.abs(p.y) > HH - 0.08) { p.y = Math.sign(p.y) * (HH - 0.08); p.vy = -p.vy }
      if (cfg.membrane && !cfg.membrane.includes(p.sp)) { const s0 = px >= 0 ? 1 : -1; if (p.x * s0 < 0.07) { p.x = s0 * 0.07; p.vx = Math.abs(p.vx) * s0 } }   // 过不了膜的弹回去
      if (Math.abs(p.x) > XL - def.r) {
        const sd = (p.x > 0 ? 1 : -1) as -1 | 1, rx = on ? sides[sd].take?.[p.sp] : undefined
        if (!rx) { p.x = sd * (XL - def.r); p.vx = -Math.abs(p.vx) * sd; next.push(p); continue }
        // 到了电极表面：得失电子。原来的离子没了，溶液里另补一个，数目大致不变
        const i = sd < 0 ? 0 : 1
        if (rx.to === 'coat') { const slot = S.coat[i]++; if (slot < COAT) next.push({ ...p, sp: rx.as ?? p.sp, kind: 'coat', side: sd, slot, s: 0.2 }) }
        else if (rx.to === 'gas') { const k = sd + p.sp; S.half[k] = (S.half[k] ?? 0) + 1; if (S.half[k] % 2 === 0) next.push({ ...p, sp: rx.as ?? p.sp, kind: 'gas', x: sd * (XL - 0.12), s: 0.3 }) }
        if (cfg.ions[p.sp]) { const n = spawn(p.sp, cfg.half?.[p.sp]); if (!cfg.half?.[p.sp] && !cfg.membrane) n.x = (rnd() - 0.5) * 0.5; next.push(n) }
        continue
      }
      next.push(p)
    }
    S.list = next
    let k = 0
    const put = (x: number, y: number, z: number, rr: number, c: string) => { if (k >= MAX) return; dummy.position.set(x * r, y * r, z * r); dummy.scale.setScalar(rr * r); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); m.setColorAt(k, col.set(c)); k++ }
    for (const p of S.list) {
      const def = SP[p.sp] as Def
      if (p.kind === 'coat') { const row = p.slot % 12, layer = Math.floor(p.slot / 12); put(p.side * (XL - 0.03 - layer * 0.085), -0.86 + row * 0.156 + (layer % 2) * 0.07, 0.02, def.r * p.s, def.color) }
      else if (def.pair) { const o = def.r * 0.8; put(p.x + Math.cos(p.a) * o, p.y + Math.sin(p.a) * o, 0.03, def.r * p.s, def.color); put(p.x - Math.cos(p.a) * o, p.y - Math.sin(p.a) * o, 0.03, def.r * p.s, def.color) }
      else put(p.x, p.y, 0.02, def.r * p.s, def.color)
    }
    // 电子：在电极条和它上面的导线里走
    if (on) for (const sd of [-1, 1] as const) { const e = sides[sd].e; if (!e) continue; for (let i = 0; i < 6; i++) { const u = ((S.t * 0.45 + i / 6) % 1), y = e > 0 ? 1.42 - u * 2.3 : -0.88 + u * 2.3; put(sd * EX, y, 0.06, SP.e.r, SP.e.color) } }
    for (let i = k; i < MAX; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix) }
    m.count = MAX; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  const tags = useMemo(() => [tagTex(cfg.left.tag, cfg.left.color), tagTex(cfg.right.tag, cfg.right.color)], [cfg.left.tag, cfg.right.tag, cfg.left.color, cfg.right.color])
  // 引线：从器材上的一点连到窗框
  const lead = useMemo(() => {
    if (!from) return null
    const c = new THREE.Vector3(...at), f = new THREE.Vector3(...from), dir = f.clone().sub(c)
    const k = Math.min(W * r / Math.max(1e-6, Math.abs(dir.x * Math.cos(yaw) - dir.z * Math.sin(yaw))), HH * r / Math.max(1e-6, Math.abs(dir.y)), 1)
    const e = c.clone().addScaledVector(dir, k), len = e.distanceTo(f), mid = e.clone().add(f).multiplyScalar(0.5)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.clone().sub(e).normalize())
    return { mid: mid.toArray() as V3, len, q }
  }, [at[0], at[1], at[2], from?.[0], from?.[1], from?.[2], r, yaw])   // eslint-disable-line react-hooks/exhaustive-deps
  const flat = { transparent: true, depthWrite: false, toneMapped: false } as const
  return <group>
    <group position={at} rotation-y={yaw}>
      {/* 窗底：深色、半透明；一圈细框 */}
      <mesh><planeGeometry args={[W * 2 * r, HH * 2 * r]} /><meshBasicMaterial color="#0d1b26" toneMapped={false} /></mesh>
      {[[0, HH, W * 2 + 0.06, 0.05], [0, -HH, W * 2 + 0.06, 0.05], [-W, 0, 0.05, HH * 2], [W, 0, 0.05, HH * 2]].map(([x, y, w, h], i) => <mesh key={i} position={[x * r, y * r, 0.001]} renderOrder={22}><planeGeometry args={[w * r, h * r]} /><meshBasicMaterial color="#cfd9df" {...flat} /></mesh>)}
      {/* 两条电极和上面的导线 */}
      {([[-1, cfg.left], [1, cfg.right]] as [number, Side][]).map(([s, sd]) => <group key={s}>
        <mesh position={[s * EX * r, 0, 0.002]} renderOrder={21}><planeGeometry args={[EW * r, (HH * 2 - 0.06) * r]} /><meshBasicMaterial color={sd.color} {...flat} /></mesh>
        <mesh position={[s * EX * r, (HH + 0.21) * r, 0.002]} renderOrder={21}><planeGeometry args={[0.07 * r, 0.42 * r]} /><meshBasicMaterial color="#9aa4ab" {...flat} /></mesh>
        <mesh position={[s * (EX - 0.36) * r, (HH + 0.3) * r, 0.004]} renderOrder={23}><planeGeometry args={[1.08 * r, 0.34 * r]} /><meshBasicMaterial map={tags[s < 0 ? 0 : 1]} {...flat} /></mesh>
      </group>)}
      {cfg.membrane && Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, (-0.88 + i * 0.22) * r, 0.002]} renderOrder={21}><planeGeometry args={[0.05 * r, 0.15 * r]} /><meshBasicMaterial color="#f2d77a" {...flat} /></mesh>)}
      <instancedMesh ref={ref} args={[sph, undefined, MAX]} frustumCulled={false} renderOrder={24}>
        <meshBasicMaterial toneMapped={false} depthTest={false} transparent />
      </instancedMesh>
    </group>
    {lead && from && <>
      <mesh position={lead.mid} quaternion={lead.q} renderOrder={18}><cylinderGeometry args={[r * 0.012, r * 0.012, lead.len, 6]} /><meshBasicMaterial color="#dfe8ee" transparent opacity={0.75} depthWrite={false} /></mesh>
      <mesh position={from} renderOrder={18}><sphereGeometry args={[r * 0.045, 12, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </>}
  </group>
}

/** 面板上的图例：这扇窗里有哪几种粒子 */
export function Legend({ items }: { items: Sp[] }) {
  return <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-white/80">
    {items.map(k => { const d = SP[k] as Def; return <span key={k} className="flex items-center gap-1.5">
      <span className="inline-block size-3 rounded-full" style={{ background: d.color }} />{d.pair && <span className="-ml-2 inline-block size-3 rounded-full" style={{ background: d.color }} />}{d.name}
    </span> })}
  </div>
}

/** 几种电极的颜色 */
export const ELECTRODE = { graphite: '#3a3d42', copper: '#b8643c', zinc: '#8f9aa6', iron: '#6c7278', steel: '#737a80', titanium: '#55585f', nickel: '#b9bec4', crude: '#7a5038' } as const
