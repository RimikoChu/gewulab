// 球棍模型和放大窗。分子用“一帧”来描述（原子的位置加上键），两帧之间按原子的名字一一对应着挪过去：
// 键断开、生成，氢原子换位置，都是同一批小球在动，学生能数得清原子。长度单位是 Å（1 Å = 100 pm）。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { Rod } from '@/lab-kit'
import type { V3 } from './parts'

/** X 是“链还在往外延伸”的占位：不画球，只留半截键 */
export type El = 'C' | 'H' | 'O' | 'Cl' | 'Br' | 'X'
export interface Atom { id: string; el: El; p: V3 }
/** n：键的重数（1 单键、2 双键）；c：这根键的颜色（强调用） */
export interface Bond { a: string; b: string; n: number; c?: string }
export interface Frame { atoms: Atom[]; bonds: Bond[]; rings?: { at: V3; r: number }[] }
/** 重原子（不是氢的原子）：p 写在纸面上（z 默认 0）；h 是挂在它上面的氢的名字；flat 表示它是平面型的（双键碳） */
export interface Heavy { id: string; el: El; p: [number, number, number?]; h?: string[]; flat?: boolean }

const RAD: Record<El, number> = { C: 0.42, H: 0.27, O: 0.4, Cl: 0.5, Br: 0.55, X: 0 }
export const ATOM_COLOR: Record<El, string> = { C: '#4b5058', H: '#dedcd4', O: '#d9412f', Cl: '#58b84c', Br: '#9a4424', X: '#000000' }
const XH: Partial<Record<El, number>> = { C: 1.09, O: 0.97 }
const TETRA: V3[] = [[0, 1, 0], [0.943, -0.333, 0], [-0.471, -0.333, 0.816], [-0.471, -0.333, -0.816]]
export const tetra = (i: number, len: number): V3 => [TETRA[i][0] * len, TETRA[i][1] * len, TETRA[i][2] * len]

/** 给重原子骨架补上氢：按每个原子周围已有的键，把氢放到空着的方向上（四面体或平面三角形） */
export function build(heavy: Heavy[], bonds: [string, string, number?][], rings?: Frame['rings']): Frame {
  const at = new Map(heavy.map(h => [h.id, new THREE.Vector3(h.p[0], h.p[1], h.p[2] ?? 0)]))
  const atoms: Atom[] = heavy.map(h => ({ id: h.id, el: h.el, p: [h.p[0], h.p[1], h.p[2] ?? 0] })), out: Bond[] = bonds.map(([a, b, n]) => ({ a, b, n: n ?? 1 }))
  const Z = new THREE.Vector3(0, 0, 1)
  for (const h of heavy) {
    const ids = h.h ?? []; if (!ids.length) continue
    const me = at.get(h.id)!, len = XH[h.el] ?? 1.05
    const nb = bonds.filter(b => b[0] === h.id || b[1] === h.id).map(b => at.get(b[0] === h.id ? b[1] : b[0])!.clone().sub(me).normalize())
    const dirs: THREE.Vector3[] = []
    if (nb.length === 0) for (let i = 0; i < ids.length; i++) dirs.push(new THREE.Vector3(...TETRA[i]))
    else if (nb.length === 1) {
      const u = nb[0].clone().negate()
      const p = new THREE.Vector3(-u.y, u.x, 0); if (p.lengthSq() < 1e-6) p.set(1, 0, 0); p.normalize(); if ((u.y > 0.05 && p.y > 0) || (u.y <= 0.05 && p.y < 0)) p.negate()
      const q = new THREE.Vector3().crossVectors(u, p)
      if (h.flat) for (const s of ids.length === 1 ? [0] : [1, -1]) dirs.push(u.clone().multiplyScalar(0.5).addScaledVector(p, s * 0.866))
      else if (ids.length === 1) dirs.push(u.clone().multiplyScalar(0.334).addScaledVector(p, 0.943))
      else for (const f of ids.length === 3 ? [0, 2.094, 4.189] : [2.094, 4.189]) dirs.push(u.clone().multiplyScalar(0.334).addScaledVector(p, 0.943 * Math.cos(f)).addScaledVector(q, 0.943 * Math.sin(f)))
    } else {
      const base = nb.reduce((s, v) => s.add(v), new THREE.Vector3()).negate()
      if (base.length() < 0.25) base.copy(Z); base.normalize()
      if (ids.length === 1) dirs.push(base)
      else for (const s of [1, -1]) dirs.push(base.clone().multiplyScalar(0.577).addScaledVector(Z, s * 0.816))
    }
    ids.forEach((id, i) => { const d = dirs[i] ?? dirs[0]; atoms.push({ id, el: 'H', p: [me.x + d.x * len, me.y + d.y * len, me.z + d.z * len] }); out.push({ a: h.id, b: id, n: 1 }) })
  }
  return { atoms, bonds: out, rings }
}
/** 把几帧并成一帧 */
export const join = (...f: Frame[]): Frame => ({ atoms: f.flatMap(x => x.atoms), bonds: f.flatMap(x => x.bonds), rings: f.flatMap(x => x.rings ?? []) })
/** 把一帧整体挪一下；flip 为真时上下翻过来 */
export const moved = (f: Frame, dx: number, dy: number, flip = false): Frame => ({ ...f, atoms: f.atoms.map(a => ({ ...a, p: [a.p[0] + dx, (flip ? -a.p[1] : a.p[1]) + dy, a.p[2]] })), rings: f.rings?.map(r => ({ ...r, at: [r.at[0] + dx, (flip ? -r.at[1] : r.at[1]) + dy, r.at[2]] })) })

/**
 * 一条锯齿形的碳链。ids：各个碳的名字；x0：第一个碳的 x；phase：第一个碳在锯齿的上还是下（接着另一段时保持原来的起伏）；
 * dbl：第几根键是双键（从 0 数）；hs：指定某个碳上氢的名字（氢从别处挪过来时用）；open：两头是不是还连着别的（聚合物的链）
 */
export function chain(ids: string[], x0: number, { phase = 0, dbl = -1, hs = {}, y0 = 0, open = false }: { phase?: number; dbl?: number; hs?: Record<string, string[]>; y0?: number; open?: boolean } = {}): Frame {
  const n = ids.length, pos = (i: number): [number, number] => [x0 + i * 1.26, y0 + ((i + phase) % 2 ? 0.44 : -0.44)]
  const heavy: Heavy[] = ids.map((id, i) => {
    const links = (i > 0 || open ? 1 : 0) + (i < n - 1 || open ? 1 : 0) + (i === dbl || i === dbl + 1 ? 1 : 0), k = 4 - links
    return { id, el: 'C', p: pos(i), flat: i === dbl || i === dbl + 1, h: hs[id] ?? Array.from({ length: k }, (_, j) => id + 'abcd'[j]) }
  })
  const bonds: [string, string, number?][] = ids.slice(1).map((id, i) => [ids[i], id, i === dbl ? 2 : 1])
  if (open) { heavy.push({ id: ids[0] + '<', el: 'X', p: pos(-1) }, { id: ids[n - 1] + '>', el: 'X', p: pos(n) }); bonds.push([ids[0] + '<', ids[0]], [ids[n - 1], ids[n - 1] + '>']) }
  return build(heavy, bonds)
}
/** n 个碳的直链烷烃，摆在正中 */
export const alkaneFrame = (n: number) => n === 1 ? build([{ id: 'c0', el: 'C', p: [0, 0], h: ['c0a', 'c0b', 'c0c', 'c0d'] }], []) : chain(Array.from({ length: n }, (_, i) => 'c' + i), -(n - 1) * 0.63)

const ballGeo = new THREE.SphereGeometry(1, 28, 20), stickGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true)
const UP = new THREE.Vector3(0, 1, 0), ZV = new THREE.Vector3(0, 0, 1)
/**
 * 画一个分子：从 a 这一帧变到 b 这一帧，k 是走了多少（0–1）。两帧里名字相同的原子挪过去；只在一帧里有的原子、键淡入淡出。
 * u：1 Å 画成多少米；tint：给某些原子换颜色（强调）；pulse：0–1，强调色的键亮到什么程度
 */
export function Mol({ a, b = a, k = 0, u = 1, tint }: { a: Frame; b?: Frame; k?: number; u?: number; tint?: Record<string, string> }) {
  const mats = useMemo(() => {
    const m: Record<string, THREE.Material> = {}
    for (const el of Object.keys(ATOM_COLOR) as El[]) m[el] = new THREE.MeshPhysicalMaterial({ color: ATOM_COLOR[el], roughness: el === 'H' ? 0.55 : 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25, metalness: 0 })
    m.stick = new THREE.MeshStandardMaterial({ color: '#c4c8cc', roughness: 0.4, metalness: 0.2 })
    return m
  }, [])
  const tints = useMemo(() => new Map<string, THREE.Material>(), [])
  const tinted = (c: string) => { let m = tints.get(c); if (!m) { m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 0.7, emissive: c, emissiveIntensity: 0.35 }); tints.set(c, m) } return m }
  const A = useMemo(() => new Map(a.atoms.map(x => [x.id, x])), [a]), B = useMemo(() => new Map(b.atoms.map(x => [x.id, x])), [b])
  const pos = new Map<string, THREE.Vector3>(), items: ReactNode[] = []
  for (const id of new Set([...A.keys(), ...B.keys()])) {
    const p = A.get(id), q = B.get(id), el = (p ?? q)!.el
    const s = p && q ? 1 : p ? 1 - k : k, P = p?.p ?? q!.p, Q = q?.p ?? p!.p
    const v = new THREE.Vector3(P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k, P[2] + (Q[2] - P[2]) * k)
    pos.set(id, v)
    if (el !== 'X' && s > 0.01) items.push(<mesh key={id} geometry={ballGeo} material={tint?.[id] ? tinted(tint[id]) : mats[el]} position={v} scale={RAD[el] * (0.25 + 0.75 * s)} />)
  }
  const key = (x: Bond) => x.a < x.b ? x.a + '|' + x.b : x.b + '|' + x.a
  const BA = new Map(a.bonds.map(x => [key(x), x])), BB = new Map(b.bonds.map(x => [key(x), x]))
  for (const id of new Set([...BA.keys(), ...BB.keys()])) {
    const p = BA.get(id), q = BB.get(id), any = (p ?? q)!
    // 断开的键很快缩没，新生成的键到最后才长出来
    const s = p && q ? 1 : p ? Math.max(0, 1 - k * 3) : Math.max(0, (k - 0.66) * 3)
    if (s < 0.02) continue
    const n = (p?.n ?? q!.n) + ((q?.n ?? p!.n) - (p?.n ?? q!.n)) * k
    const va = pos.get(any.a)!, vb = pos.get(any.b)!, d = vb.clone().sub(va), len = d.length(); if (len < 1e-4) continue
    d.normalize()
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, d), side = new THREE.Vector3().crossVectors(d, ZV); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize()
    const mid = va.clone().add(vb).multiplyScalar(0.5), off = 0.17 * Math.max(0, n - 1), rad = (n > 1.05 ? 0.085 : 0.1) * s
    const col = (k < 0.5 ? p?.c ?? q?.c : q?.c ?? p?.c), mat = col ? tinted(col) : mats.stick
    for (const sgn of off > 0.005 ? [1, -1] : [0]) items.push(<mesh key={id + sgn} geometry={stickGeo} material={mat} position={[mid.x + side.x * off * sgn, mid.y + side.y * off * sgn, mid.z + side.z * off * sgn]} quaternion={quat} scale={[rad, len, rad]} />)
  }
  const rings = k < 0.5 ? a.rings : b.rings
  return <group scale={u}>
    {items}
    {rings?.map((r, i) => <mesh key={'r' + i} position={r.at}><torusGeometry args={[r.r, 0.055, 10, 48]} /><meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={0.5} roughness={0.4} /></mesh>)}
  </group>
}

/** 放大窗的位置：圆心、半径、朝向（绕 y 的转角，一般取这一课的方位角，正对镜头） */
/** w：窗口横向再拉长多少（两头各加 w，成胶囊形），放长链用 */
export interface LensSpec { at: V3; R: number; rotY: number; w?: number }
function capsule(R: number, w: number) { const s = new THREE.Shape(); s.absarc(w, 0, R, -Math.PI / 2, Math.PI / 2, false); s.absarc(-w, 0, R, Math.PI / 2, Math.PI * 1.5, false); s.closePath(); return new THREE.ShapeGeometry(s, 40) }
/** 放大窗里纸面上的一点（Å）在场景里的位置：给标签用 */
export function lensPoint(l: LensSpec, x: number, y: number, u: number, lift = 0): V3 {
  const c = Math.cos(l.rotY), s = Math.sin(l.rotY), z = l.R * 0.25 + lift
  return [l.at[0] + x * u * c + z * s, l.at[1] + y * u, l.at[2] - x * u * s + z * c]
}
/** 放大窗：一块深色的圆底板加一圈亮边，分子画在上面；point 是它放大的是哪儿，拉一根细线过去 */
export function Lens({ spec, point, children }: { spec: LensSpec; point?: V3; children: ReactNode }) {
  const { at, R, rotY, w = 0 } = spec
  const shape = useMemo(() => ({ bg: capsule(R * 0.965, w), rim: capsule(R, w) }), [R, w])
  const rim = useMemo<V3 | null>(() => {
    if (!point) return null
    const d = new THREE.Vector3(point[0] - at[0], point[1] - at[1], point[2] - at[2]); d.z = 0
    const c = Math.cos(rotY), s = Math.sin(rotY), lx = (point[0] - at[0]) * c - (point[2] - at[2]) * s, ly = point[1] - at[1], l = Math.hypot(lx, ly) || 1
    return [at[0] + lx / l * R * c, at[1] + ly / l * R, at[2] - lx / l * R * s]
  }, [point?.[0], point?.[1], point?.[2], at[0], at[1], at[2], R, rotY])   // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <group position={at} rotation-y={rotY}>
      <mesh geometry={shape.rim}><meshBasicMaterial color="#9fe6da" toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={shape.bg} position-z={0.004}><meshBasicMaterial color="#22323f" toneMapped={false} /></mesh>
      <pointLight position={[-R * 0.7, R * 0.9, R * 1.6]} intensity={0.7} distance={R * 5} decay={0} color="#fff6ea" />
      <group position-z={R * 0.25}>{children}</group>
    </group>
    {rim && point && <>
      <Rod from={rim} to={point} r={R * 0.008}><meshBasicMaterial color="#9fe6da" toneMapped={false} /></Rod>
      <mesh position={point}><sphereGeometry args={[R * 0.035, 16, 12]} /><meshBasicMaterial color="#9fe6da" toneMapped={false} /></mesh>
    </>}
  </>
}
