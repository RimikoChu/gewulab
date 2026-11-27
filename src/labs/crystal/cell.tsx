// 晶胞的球棍模型：一个立方的框，粒子在顶点、棱、面、体内。可以“切开”：每个球只留下在晶胞里面的那一块（1/8、1/4、1/2），
// 切面是实心的；露在晶胞外面的部分变成一层淡淡的影子。还能点亮某一类位置上的粒子。粒子的位置和类别从 physics.ts 取。
import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sites, type CellKey, type Pos, type Site, type V3 } from './physics'
import { Ball, LOOK, Stick } from './mol'
import { ease } from './parts'

/** 晶胞的边长（画面单位） */
export const A = 3.6
/** 晶胞里各种粒子画多大 */
const R: Record<string, number> = { Cl: 0.56, Na: 0.38, Cs: 0.66, C: 0.4, Cu: 0.66, CO2: 0.34 }
const O_R = 0.3, O_D = 0.64
/** 点亮某一类位置时，那些粒子泛出的暖光 */
const HI = '#ffb84d'
/** 分数坐标 → 模型里的位置（原点在晶胞中心） */
export const local = (p: V3, a = A): V3 => [(p[0] - 0.5) * a, (p[1] - 0.5) * a, (p[2] - 0.5) * a]
/** 模型里的位置 → 世界里的位置：模型放在 pos，绕竖轴转了 rot */
export function toWorld(p: V3, pos: V3, rot: number): V3 { const c = Math.cos(rot), s = Math.sin(rot); return [pos[0] + p[0] * c + p[2] * s, pos[1] + p[1], pos[2] - p[0] * s + p[2] * c] }
/** 干冰里 CO₂ 分子的朝向（示意）：顶点上的沿 [111]，三组面心各沿另一条体对角线 */
function co2Axis(p: V3): V3 {
  const k = 1 / Math.sqrt(3)
  if (p[0] !== 0.5) return [k, -k, -k]
  if (p[1] !== 0.5) return [-k, k, -k]
  if (p[2] !== 0.5) return [-k, -k, k]
  return [k, k, k]
}
/** 哪些粒子之间画一根棍：氯化钠、氯化铯、金刚石里最近的两个粒子 */
function pairsOf(c: CellKey, list: Site[]) {
  const nn = c === 'NaCl' ? 0.5 : c === 'CsCl' || c === 'diamond' ? (c === 'CsCl' ? Math.sqrt(3) / 2 : Math.sqrt(3) / 4) : 0
  const out: [number, number][] = []
  if (!nn) return out
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const d = Math.hypot(list[i].p[0] - list[j].p[0], list[i].p[1] - list[j].p[1], list[i].p[2] - list[j].p[2])
    if (Math.abs(d - nn) < 1e-6) out.push([i, j])
  }
  return out
}
const sphere = new THREE.SphereGeometry(1, 40, 28), circle = new THREE.CircleGeometry(1, 40), box = new THREE.BoxGeometry(1, 1, 1)
const edgeGeo = (() => { const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)); return g })()
const CAP_ROT: V3[] = [[0, Math.PI / 2, 0], [Math.PI / 2, 0, 0], [0, 0, 0]]

export interface CellProps {
  c: CellKey; a?: number
  /** 切开的进度 0–1。要切开就得给出模型在世界里的位置 pos 和转角 rot（切面按世界坐标算） */
  cut?: number; pos?: V3; rot?: number
  /** 点亮哪一类位置上的粒子；其余的变暗 */
  hi?: Pos | null
  /** 每个粒子偏离原位多少（振动、熔化后散开） */
  offset?: (i: number, s: Site) => V3
  /** 棍子、框线的不透明度；heat：烧红的程度 0–1 和颜色 */
  sticks?: number; frame?: number; heat?: number; heatColor?: string
  /** 粒子画小一些（0–1）：熔化后挤在槽里时用 */
  shrink?: number
}
/** 一个晶胞 */
export function CellModel({ c, a = A, cut = 0, pos = [0, 0, 0], rot = 0, hi = null, offset, sticks = 1, frame = 1, heat = 0, heatColor = '#ff7a2a', shrink = 0 }: CellProps) {
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const list = useMemo(() => sites(c), [c]), bonds = useMemo(() => pairsOf(c, list), [c, list])
  // 六个切面（世界坐标）：法线朝里。第 2i 个是第 i 个轴上小的那一面，第 2i+1 个是大的那一面
  const planes = useMemo(() => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1))
    return [0, 1, 2].flatMap(i => [1, -1].map(s => { const n = new THREE.Vector3(); n.setComponent(i, s); return new THREE.Plane(n, a / 2).applyMatrix4(m) }))
  }, [pos[0], pos[1], pos[2], rot, a])   // eslint-disable-line react-hooks/exhaustive-deps
  const ck = ease(cut), cutting = cut > 0.001, ghost = 1 - 0.88 * ck
  const at = (i: number): V3 => { const p = local(list[i].p, a), o = offset?.(i, list[i]); return o ? [p[0] + o[0], p[1] + o[1], p[2] + o[2]] : p }
  return <group>
    {/* 晶胞的框：十二条棱；切开以后六个面是一层很淡的玻璃 */}
    <lineSegments geometry={edgeGeo} scale={a} visible={frame > 0.01}><lineBasicMaterial color="#e6edf2" transparent opacity={0.85 * frame} toneMapped={false} /></lineSegments>
    {cutting && <mesh geometry={box} scale={a} renderOrder={1}><meshBasicMaterial color="#bfe6ff" transparent opacity={0.045 * ck} depthWrite={false} side={THREE.DoubleSide} /></mesh>}
    {bonds.map(([i, j]) => <Stick key={`${i}-${j}`} a={at(i)} b={at(j)} r={0.04} color="#868d94" opacity={sticks * (hi ? 0.35 : 1)} />)}
    {list.map((s, i) => {
      const p = at(i), el = s.el === 'CO2' ? 'C' : s.el, r = (R[s.el] ?? 0.5) * (1 - 0.45 * shrink)
      const lit = !!hi && s.pos === hi, dim = hi && !lit ? 1 : 0
      const balls: { el: string; at: V3; r: number }[] = [{ el, at: p, r }]
      if (s.el === 'CO2') { const ax = co2Axis(s.p); for (const k of [-1, 1]) balls.push({ el: 'O', at: [p[0] + ax[0] * O_D * k, p[1] + ax[1] * O_D * k, p[2] + ax[2] * O_D * k], r: O_R }) }
      const whole = !cutting || s.pos === 'body'
      return <group key={i}>
        {balls.map((b, n) => whole
          ? <Ball key={n} el={b.el} at={b.at} r={b.r} glow={lit ? 0.5 : heat} glowColor={lit ? HI : heatColor} dim={dim} />
          : <group key={n}>
            {/* 留在晶胞里的那一块 */}
            <mesh geometry={sphere} position={b.at} scale={b.r} castShadow>
              <meshPhysicalMaterial color={new THREE.Color(LOOK[b.el].c).multiplyScalar(1 - dim * 0.72)} roughness={0.24} metalness={b.el === 'Cu' ? 0.9 : 0} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.3}
                emissive={lit ? HI : '#000000'} emissiveIntensity={lit ? 0.55 : 0} clippingPlanes={planes} clipShadows side={THREE.DoubleSide} />
            </mesh>
            {/* 切面：球心正好在晶胞的面上，切出来是一个圆片；别的切面再把它裁成半圆或者四分之一圆 */}
            {n === 0 && [0, 1, 2].map(ax => (s.p[ax] === 0 || s.p[ax] === 1) && <mesh key={ax} geometry={circle} position={b.at} rotation={CAP_ROT[ax]} scale={b.r * 0.999}>
              <meshStandardMaterial color={new THREE.Color(LOOK[b.el].c).lerp(new THREE.Color('#ffffff'), 0.28).multiplyScalar(1 - dim * 0.7)} roughness={0.55} side={THREE.DoubleSide} clippingPlanes={planes.filter((_, k) => k >> 1 !== ax)}
                emissive={lit ? HI : '#000000'} emissiveIntensity={lit ? 0.4 : 0} />
            </mesh>)}
            {/* 露在外面的部分：淡淡的影子 */}
            <mesh geometry={sphere} position={b.at} scale={b.r * 1.001} renderOrder={4}>
              <meshPhysicalMaterial color={LOOK[b.el].c} roughness={0.24} clearcoat={1} transparent opacity={ghost * (dim ? 0.35 : lit ? 1.5 : 1)} depthWrite={false} />
            </mesh>
          </group>)}
      </group>
    })}
    {heat > 0.01 && <pointLight color={heatColor} intensity={heat * 40} distance={14} decay={1.6} />}
  </group>
}
