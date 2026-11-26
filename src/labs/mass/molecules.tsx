// 分子的球棍模型：原子是带清漆的彩色小球（按常见配色：H 白、O 红、C 黑、P 橙、Fe 褐），键是浅灰的小棍，双键画两根。
// Reaction 把一个方程式里的反应物摆好，能“拆开”成原子、再“组合”成生成物：每个原子从哪来、到哪去是一一对应的，个数始终不变。
// Lineup 按系数把每种物质摆几个分子（配平用），新加的分子从小长到大。尺寸是模型单位（1 = 一根键长），由外面缩放。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { El, Eq } from './physics'

type Atom = [El, number, number, number]
interface Mol { atoms: Atom[]; bonds: [number, number, number][] }
const a104 = 104.5 / 2 * Math.PI / 180
/** 本实验室用到的分子（原子的相对位置、键） */
const MOL: Record<string, Mol> = {
  H2: { atoms: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]], bonds: [[0, 1, 1]] },
  O2: { atoms: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]], bonds: [[0, 1, 2]] },
  H2O: { atoms: [['O', 0, 0.2, 0], ['H', -Math.sin(a104) * 0.95, 0.2 - Math.cos(a104) * 0.95, 0], ['H', Math.sin(a104) * 0.95, 0.2 - Math.cos(a104) * 0.95, 0]], bonds: [[0, 1, 1], [0, 2, 1]] },
  CO2: { atoms: [['C', 0, 0, 0], ['O', -1.15, 0, 0], ['O', 1.15, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]] },
  CO: { atoms: [['C', -0.55, 0, 0], ['O', 0.55, 0, 0]], bonds: [[0, 1, 3]] },
  C: { atoms: [['C', 0, 0, 0]], bonds: [] },
  P: { atoms: [['P', 0, 0, 0]], bonds: [] },
  Fe: { atoms: [['Fe', 0, 0, 0]], bonds: [] },
  // 五氧化二磷（示意）：两个磷原子由一个氧原子桥连，每个磷原子再连两个氧原子
  P2O5: { atoms: [['O', 0, 0.35, 0], ['P', -1.05, 0, 0], ['P', 1.05, 0, 0], ['O', -1.6, 0.75, 0], ['O', -1.55, -0.8, 0.3], ['O', 1.6, 0.75, 0], ['O', 1.55, -0.8, 0.3]], bonds: [[0, 1, 1], [0, 2, 1], [1, 3, 2], [1, 4, 1], [2, 5, 2], [2, 6, 1]] },
  // 氧化铁（示意）：两个铁原子和三个氧原子交替相连
  Fe2O3: { atoms: [['O', 0, 0.55, 0], ['Fe', -0.95, 0, 0], ['Fe', 0.95, 0, 0], ['O', -1.4, -0.85, 0], ['O', 1.4, -0.85, 0]], bonds: [[0, 1, 1], [0, 2, 1], [1, 3, 2], [2, 4, 2]] },
}
/** 原子的颜色和大小 */
export const ATOM: Partial<Record<El, { c: string; r: number }>> = {
  H: { c: '#f1f2f0', r: 0.3 }, O: { c: '#d9342b', r: 0.42 }, C: { c: '#2a2b2f', r: 0.44 }, P: { c: '#ee8a24', r: 0.52 }, Fe: { c: '#a8643a', r: 0.55 },
}
/** 一个分子模型有多高（摞起来时用） */
export const molHeight = (f: string) => { const ys = MOL[f].atoms.map(a => a[2]); return Math.max(...ys) - Math.min(...ys) + 1.15 }
/** 一个分子模型有多宽（排列时用） */
export const molWidth = (f: string) => { const xs = MOL[f].atoms.map(a => a[1]); return Math.max(...xs) - Math.min(...xs) + 1.2 }

const sphere = new THREE.SphereGeometry(1, 28, 20), stick = new THREE.CylinderGeometry(1, 1, 1, 12)
const mats = new Map<string, THREE.Material>()
const atomMat = (el: El) => { let m = mats.get(el); if (!m) { m = new THREE.MeshPhysicalMaterial({ color: ATOM[el]!.c, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 1.2 }); mats.set(el, m) } return m }
const bondMat = new THREE.MeshPhysicalMaterial({ color: '#c9cdd0', roughness: 0.3, clearcoat: 0.6, transparent: true })
const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), tq = new THREE.Quaternion()

/** 一个原子在反应物里的位置、拆开后的位置、在生成物里的位置 */
interface Item { el: El; from: THREE.Vector3; mid: THREE.Vector3; to: THREE.Vector3; j: number }

/** 把一边的物质按系数一排排摆开：返回每个原子的位置（按物质、分子的顺序）和键 */
function layout(list: { f: string; n: number }[], gap = 0.9) {
  const atoms: { el: El; p: THREE.Vector3 }[] = [], bonds: [number, number, number][] = []
  const total = list.reduce((s, x) => s + x.n * molWidth(x.f) + (x.n - 1) * 0.3, 0) + (list.length - 1) * gap
  let x = -total / 2
  for (const { f, n } of list) for (let k = 0; k < n; k++) {
    const w = molWidth(f), mol = MOL[f], base = atoms.length, cx = x + w / 2
    mol.atoms.forEach(([el, ax, ay, az]) => atoms.push({ el, p: new THREE.Vector3(cx + ax, ay, az) }))
    mol.bonds.forEach(([i, j, o]) => bonds.push([base + i, base + j, o]))
    x += w + (k < n - 1 ? 0.3 : gap)
  }
  return { atoms, bonds, width: total }
}

/** 键：从 a 到 b 的一根小棍，双键、三键画几根错开的 */
function Bond({ a, b, order, k }: { a: THREE.Vector3; b: THREE.Vector3; order: number; k: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    const gr = g.current; if (!gr) return
    tmp.subVectors(b, a); const len = tmp.length(); tq.setFromUnitVectors(up, tmp.clone().normalize())
    gr.position.copy(a).add(b).multiplyScalar(0.5); gr.quaternion.copy(tq); gr.scale.set(1, len, 1)
    gr.visible = k > 0.02
  })
  const offs = order === 1 ? [0] : order === 2 ? [-0.09, 0.09] : [-0.13, 0, 0.13]
  return <group ref={g}>{offs.map(o => <mesh key={o} geometry={stick} material={bondMat} position-x={o} scale={[order === 1 ? 0.085 : 0.06, 1, order === 1 ? 0.085 : 0.06]} castShadow />)}</group>
}

/**
 * 一个反应的分子模型：phase 0 是反应物，1 是拆成一个个原子，2 是重新组合成生成物（中间的小数是过渡）。
 * 原子个数始终不变：反应物里的第 i 个氢原子就是生成物里的第 i 个氢原子
 */
export function Reaction({ eq, phase }: { eq: Eq; phase: number }) {
  const data = useMemo(() => {
    const L = layout(eq.left.map((s, i) => ({ f: s.f, n: eq.coef[i] })))
    const R = layout(eq.right.map((s, i) => ({ f: s.f, n: eq.coef[eq.left.length + i] })))
    // 同一种原子按 x 排好，一一对应
    const used = new Set<number>()
    const items: Item[] = L.atoms.map(a => {
      const cand = R.atoms.map((r, j) => ({ r, j })).filter(({ r, j }) => r.el === a.el && !used.has(j)).sort((p, q) => Math.abs(p.r.p.x - a.p.x) - Math.abs(q.r.p.x - a.p.x))[0]
      used.add(cand.j)
      // 拆开时：原子从分子里散开一点，各自浮在原处附近
      const mid = a.p.clone().multiplyScalar(1.25).add(new THREE.Vector3(0, a.el === 'H' ? 0.5 : -0.2, (a.p.x % 1) * 0.6))
      return { el: a.el, from: a.p, mid, to: cand.r.p, j: cand.j }
    })
    // 生成物的键要按原子在反应物里的序号重新编号
    const back = new Map<number, number>(); items.forEach((it, i) => back.set(it.j, i))
    return { items, lb: L.bonds, rb: R.bonds.map(([i, j, o]) => [back.get(i)!, back.get(j)!, o] as [number, number, number]) }
  }, [eq])
  const pos = useMemo(() => data.items.map(it => it.from.clone()), [data])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const cur = useRef(phase)
  useFrame((_, d) => {
    cur.current += (phase - cur.current) * Math.min(1, Math.min(d, 1 / 30) * 3.2)
    const p = cur.current
    data.items.forEach((it, i) => {
      const v = pos[i]
      if (p <= 1) v.lerpVectors(it.from, it.mid, ease(p)); else v.lerpVectors(it.mid, it.to, ease(p - 1))
      const m = refs.current[i]; if (m) { m.position.copy(v) }
    })
  })
  return <group>
    {data.items.map((it, i) => <mesh key={i} ref={e => { refs.current[i] = e }} geometry={sphere} material={atomMat(it.el)} scale={ATOM[it.el]!.r} position={it.from} castShadow />)}
    <BondSet bonds={data.lb} pos={pos} show={(p: number) => 1 - Math.min(1, p * 2.5)} phase={cur} />
    <BondSet bonds={data.rb} pos={pos} show={(p: number) => Math.max(0, (p - 1.6) / 0.4)} phase={cur} />
  </group>
}
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x) }

/** 一组键：每帧看 phase 决定显不显示（反应物的键拆开时消失，生成物的键组合好时出现） */
function BondSet({ bonds, pos, show, phase }: { bonds: [number, number, number][]; pos: THREE.Vector3[]; show: (p: number) => number; phase: { current: number } }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current) g.current.visible = show(phase.current) > 0.05 })
  return <group ref={g}>{bonds.map(([i, j, o], n) => <Bond key={n} a={pos[i]} b={pos[j]} order={o} k={1} />)}</group>
}

/** 一个静止的分子模型（燃烧炉上方、展台上用） */
export function Molecule({ f, grow = 1 }: { f: string; grow?: number }) {
  const mol = MOL[f]
  const ps = useMemo(() => mol.atoms.map(a => new THREE.Vector3(a[1], a[2], a[3])), [mol])
  return <group scale={Math.max(0.001, grow)}>
    {mol.atoms.map((a, i) => <mesh key={i} geometry={sphere} material={atomMat(a[0])} scale={ATOM[a[0]]!.r} position={ps[i]} castShadow />)}
    {mol.bonds.map(([i, j, o], n) => <Bond key={n} a={ps[i]} b={ps[j]} order={o} k={1} />)}
  </group>
}

/**
 * 按系数把一边的物质摆成几列：每种物质一列，分子一个摞一个往上排；系数变大时新的分子从小长到大。
 * 返回的 width 给外面排“+”和箭头用
 */
export function Column({ f, n, x, dy = 1.9 }: { f: string; n: number; x: number; dy?: number }) {
  return <group position-x={x}>{Array.from({ length: n }, (_, i) => <Grow key={i} y={i * dy}><Molecule f={f} /></Grow>)}</group>
}
function Grow({ y, children }: { y: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null), s = useRef(0)
  useFrame((_, d) => { s.current = Math.min(1, s.current + Math.min(d, 1 / 30) * 2.4); if (g.current) g.current.scale.setScalar(Math.max(0.001, 1 - (1 - s.current) ** 3)) })
  return <group position-y={y} ref={g} scale={0.001}>{children}</group>
}
