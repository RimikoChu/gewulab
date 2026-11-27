// 从升压站到城里：升压站的出线构架、四基 110 kV 铁塔和三相导线（上面两根地线）、城郊变电站（进线构架、降压变压器）、
// 10 kV 电杆、电杆上的配电变压器（台架式）、几栋六层住宅楼。state 是第 7 课交来的输电状态：
// 导线上流动的光点越密电流越大；损耗大时导线发红；住户窗户的灯随送到的功率变亮变暗。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, mergeParts, type Part } from '@/lab-kit'
import { CITY, COL, LINE, YARD } from './layout'
import { rng } from './mats'
import type { V3 } from './physics'
import { EARTH, PHASES, insulatorGeo, span, towerGeo } from './tower'
import { LoopFlow } from './fx'
import { Pad, Transformer } from './tf'
import type { GridState } from './world'

/** 门形构架：两根钢管柱、一根横梁；三相挂点在横梁下面 */
export const GANTRY = { h: 14, half: 6.5 }
export const gantryPhases = (x: number): V3[] => [-4, 4, 0].map(dz => [x, GANTRY.h - 1.2, LINE.z + dz] as V3)
function gantryParts(x: number): Part[] {
  const P: Part[] = []
  for (const s of [-1, 1]) {
    P.push({ p: [x, GANTRY.h / 2, LINE.z + s * GANTRY.half], s: [0.22, GANTRY.h, 0], c: '#9aa2a6', cyl: true })
    P.push({ p: [x + 1.2, GANTRY.h / 2 - 0.5, LINE.z + s * GANTRY.half], s: [0.12, GANTRY.h - 0.6, 0], c: '#9aa2a6', cyl: true, r: [0, 0, 0.09] })
  }
  P.push({ p: [x, GANTRY.h, LINE.z], s: [0.6, 0.6, GANTRY.half * 2 + 0.6], c: '#8d969b' })
  return P
}

/** 一根 10 kV 水泥杆：杆身、横担、三只针式绝缘子 */
const POLE_H = 12
const POLES = [CITY.sub + 12, CITY.sub + 22, CITY.pole]
function poleParts(x: number, z: number): Part[] {
  return [{ p: [x, POLE_H / 2, z], s: [0.16, POLE_H, 0], c: '#b6b2a8', cyl: true }, { p: [x, POLE_H - 0.6, z], s: [0.12, 0.12, 2.0], c: '#6c7378' },
    ...[-0.85, 0, 0.85].map(dz => ({ p: [x, POLE_H - 0.42, z + dz] as V3, s: [0.06, 0.25, 0] as V3, c: '#e9e7e0', cyl: true }))]
}

/** 住宅楼：x、z、宽、进深、层数 */
const HOUSES: [number, number, number, number, number][] = [[356, -8, 28, 12, 6], [356, 14, 28, 12, 6], [392, -8, 30, 12, 7], [392, 14, 30, 12, 6], [374, 34, 24, 11, 5], [404, 34, 20, 11, 6]]
/** 窗户贴图：一格一扇窗，有亮的有暗的；lit 张是夜里亮着灯的样子，作为自发光贴图 */
function windowTex(lit: boolean) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d')!, r = rng(lit ? 31 : 37)
  g.fillStyle = lit ? '#000' : '#e2d9c6'; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const x = i * 32 + 6, y = j * 32 + 8
    if (lit) { if (r() < 0.75) { g.fillStyle = r() < 0.5 ? '#ffd890' : '#fff0c8'; g.fillRect(x, y, 20, 16) } }
    else { g.fillStyle = '#3c4a55'; g.fillRect(x, y, 20, 16); g.fillStyle = '#cfd6da'; g.fillRect(x + 9, y, 2, 16); g.fillStyle = '#b8ab95'; g.fillRect(x - 3, y + 17, 26, 3) }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}
function House({ x, z, w, d, n, lamp }: { x: number; z: number; w: number; d: number; n: number; lamp: number }) {
  const tex = useMemo(() => {
    const a = windowTex(false), b = windowTex(true)
    const set = (t: THREE.Texture, rx: number) => { const c = t.clone(); c.repeat.set(rx / 8, n / 8); c.needsUpdate = true; return c }
    return { front: [set(a, Math.round(w / 3.2)), set(b, Math.round(w / 3.2))], side: [set(a, Math.round(d / 3.2)), set(b, Math.round(d / 3.2))] }
  }, [w, d, n])
  const h = n * 3
  const mat = (t: THREE.Texture[]) => <meshStandardMaterial map={t[0]} emissiveMap={t[1]} emissive="#ffd08a" emissiveIntensity={lamp * 1.6} roughness={0.8} />
  return <group position={[x, 0, z]}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#d9cfbd" roughness={0.85} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0, h / 2, s * (d / 2 + 0.01)]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[w, h]} />{mat(tex.front)}</mesh>)}
    {[-1, 1].map(s => <mesh key={`e${s}`} position={[s * (w / 2 + 0.01), h / 2, 0]} rotation-y={s * Math.PI / 2}><planeGeometry args={[d, h]} />{mat(tex.side)}</mesh>)}
    <mesh position={[0, h + 0.5, 0]}><boxGeometry args={[w + 0.3, 1.0, d + 0.3]} /><meshStandardMaterial color="#b9ac96" roughness={0.85} /></mesh>
    <mesh position={[w * 0.2, h + 1.6, 0]}><boxGeometry args={[3.5, 2.2, 4]} /><meshStandardMaterial color="#c9bea9" roughness={0.85} /></mesh>
  </group>
}

/** 台架式配电变压器：两根电杆之间的平台上一台小变压器、跌落式熔断器、低压出线 */
function PoleTransformer() {
  const x = CITY.pole, z = LINE.z
  return <group position={[x, 0, z]}>
    <mesh position={[0, 3.2, 0]}><boxGeometry args={[0.2, 0.2, 2.6]} /><meshStandardMaterial color="#6c7378" metalness={0.4} roughness={0.5} /></mesh>
    <group position={[0, 3.3, 0]} scale={0.32}><Transformer /></group>
    {[-1, 1].map(s => <mesh key={s} position={[0, POLE_H / 2, s * 1.3]}><cylinderGeometry args={[0.15, 0.17, POLE_H, 16]} /><meshStandardMaterial color="#b6b2a8" roughness={0.8} /></mesh>)}
  </group>
}

export function Grid({ state }: { state?: GridState }) {
  const g = useMemo(() => {
    const tw = towerGeo(), ins = insulatorGeo()
    const tower = mergeGeometries(LINE.towers.map(x => { const c = tw.clone(); c.translate(x, 0, LINE.z); return c }))
    const strings = mergeGeometries(LINE.towers.flatMap(x => PHASES.map(p => { const c = ins.clone(); c.translate(x + p[0], p[1] + 1.5, LINE.z + p[2]); return c })))
    const statics = mergeParts([...gantryParts(YARD.gantry), ...gantryParts(CITY.sub - 8), ...POLES.slice(0, 2).flatMap(x => poleParts(x, LINE.z))])
    // 三相导线：出线构架 → 四基塔 → 变电站进线构架；地线只在塔与塔之间
    const g0 = gantryPhases(YARD.gantry), g1 = gantryPhases(CITY.sub - 8)
    const phases = [0, 1, 2].map(k => {
      const pts: V3[] = [g0[k]]
      LINE.towers.forEach(x => pts.push([x + PHASES[k][0], PHASES[k][1], LINE.z + PHASES[k][2]]))
      pts.push(g1[k])
      const all: V3[] = []
      for (let i = 0; i < pts.length - 1; i++) { const s = span(pts[i], pts[i + 1], Math.abs(pts[i + 1][0] - pts[i][0]) > 30 ? 2.6 : 0.6); all.push(...(i ? s.slice(1) : s)) }
      return all
    })
    const earth = [0, 1].map(k => { const all: V3[] = []; for (let i = 0; i < LINE.towers.length - 1; i++) { const a: V3 = [LINE.towers[i], EARTH[k][1], LINE.z + EARTH[k][2]], b: V3 = [LINE.towers[i + 1], EARTH[k][1], LINE.z + EARTH[k][2]]; all.push(...span(a, b, 2.0).slice(i ? 1 : 0)) } return all })
    // 10 kV 线：变电站 → 两根电杆 → 配电变压器
    const ten = [-0.85, 0, 0.85].map(dz => { const pts: V3[] = [[CITY.sub - 2, 6, LINE.z + dz * 1.5], ...POLES.map(x => [x, POLE_H - 0.3, LINE.z + dz] as V3)]; const all: V3[] = []; for (let i = 0; i < pts.length - 1; i++) all.push(...span(pts[i], pts[i + 1], 0.25, 10).slice(i ? 1 : 0)); return all })
    const tube = (pts: V3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), pts.length * 2, r, 6)
    return { tower, strings, statics, phases, cond: mergeGeometries(phases.map(p => tube(p, 0.1))), earth: mergeGeometries(earth.map(p => tube(p, 0.05))), ten: mergeGeometries(ten.map(p => tube(p, 0.04))), tenPts: ten }
  }, [])
  const s = state, hot = s?.on ? Math.min(1, s.ratio * 1.8) : 0, lamp = s ? s.lamp : 0.3
  const dots = s?.on ? Math.round(6 + 70 * Math.min(1, s.I / 1100) ** 0.6) : 0
  return <group>
    <mesh geometry={g.tower} castShadow><meshStandardMaterial color="#8f989c" metalness={0.7} roughness={0.45} /></mesh>
    <mesh geometry={g.strings}><meshPhysicalMaterial color="#6fa58d" roughness={0.1} clearcoat={1} /></mesh>
    <mesh geometry={g.statics} castShadow receiveShadow><Painted rough={0.55} metal={0.45} /></mesh>
    <mesh geometry={g.cond}><meshStandardMaterial color="#9ea4a6" metalness={0.8} roughness={0.35} emissive={COL.hot} emissiveIntensity={hot * 2.5} toneMapped={hot < 0.05} /></mesh>
    <mesh geometry={g.earth}><meshStandardMaterial color="#7d8386" metalness={0.7} roughness={0.45} /></mesh>
    <mesh geometry={g.ten}><meshStandardMaterial color="#9ea4a6" metalness={0.7} roughness={0.4} /></mesh>
    {s?.on && g.phases.map((p, k) => <LoopFlow key={`${k}${dots}`} pts={p} flow={1} closed={false} dots={dots} size={0.32} speed={0.012 * (0.4 + Math.min(1, s.I / 1100))} />)}
    {s?.on && g.tenPts.map((p, k) => <LoopFlow key={`t${k}`} pts={p} flow={1} closed={false} dots={12} size={0.12} speed={0.05} />)}
    {/* 城郊变电站：混凝土基础上一台降压变压器，四周围墙 */}
    <group position={[CITY.sub, 0, LINE.z]}>
      <Pad /><group position={[0, 0.3, 0]} scale={0.85}><Transformer name="110/10 kV" /></group>
      {[[0, -10, 30, 0.2], [0, 10, 30, 0.2], [-15, 0, 0.2, 20], [15, 0, 0.2, 20]].map(([x, z, w, d], i) => <mesh key={i} position={[x, 1.2, z]} castShadow><boxGeometry args={[w, 2.4, d]} /><meshStandardMaterial color="#c4bfb3" roughness={0.9} /></mesh>)}
    </group>
    <PoleTransformer />
    {HOUSES.map(([x, z, w, d, n], i) => <House key={i} x={x} z={z} w={w} d={d} n={n} lamp={lamp} />)}
  </group>
}
