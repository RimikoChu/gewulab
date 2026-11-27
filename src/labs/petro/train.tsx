// 第 6 课的四台反应装置，自西向东排成一排：乙烯水合反应器（细高的固定床）、乙醇氧化反应器（粗短的列管式，带大法兰）、
// 乙醛氧化塔（细高，带冷却夹套，顶上放大一段）、酯化釜（带搅拌的釜，上面一根精馏柱）。最东头是乙酸乙酯的产品罐。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, Painted, bolts, disc, lathe, mergeParts, shell, type Part } from '@/lab-kit'
import { Pump } from './tower'
import { Concrete, Jacket, Paint } from './look'
import { gratingTex, rep } from './mats'
import { box, cyl, deckGeo, frameParts, headPts, ladderParts, pipeGeo, platformParts, vesselPts, type RY, type V3 } from './parts'

/** 四台装置的位置（x）、共同的 z；每台的半径、顶的高度、进料口的高度 */
export const TRAIN = { z: -6, units: [{ x: 66, r: 1.1, top: 14.6, name: '水合反应器' }, { x: 76, r: 1.5, top: 9.4, name: '乙醇氧化反应器' }, { x: 86, r: 0.95, top: 18, name: '乙醛氧化塔' }, { x: 96.5, r: 1.7, top: 7.6, name: '酯化釜' }] } as const
const U = TRAIN.units, Z = TRAIN.z
/** 物料从一台到下一台走的管子（世界坐标）：从底部出来，经过泵，绕到下一台背后上去，从顶部进 */
/** 泵的大小、位置：泵转了半圈，吸入口朝西（来料那一头），排出口朝上 */
const PS = 0.85, pumpX = (i: number) => U[i].x + 3.6
/** 前四个点到泵的吸入口为止，后面从泵的排出口接着走 */
export const LINKS: V3[][] = [0, 1, 2].map(i => { const a = U[i], b = U[i + 1], px = pumpX(i), zp = Z + 2.8; return [[a.x, 3.6, Z + a.r - 0.1], [a.x, 3.6, zp], [a.x, 0.62 * PS, zp], [px - 1.2 * PS, 0.62 * PS, zp], [px - 0.82 * PS, 1.3 * PS, zp], [px - 0.82 * PS, 2.0, zp], [b.x - 3.2, 2.0, zp], [b.x - 3.2, 2.0, Z - 2.4], [b.x - 3.2, b.top + 0.9, Z - 2.4], [b.x, b.top + 0.9, Z - 0.6], [b.x, b.top - 0.1, Z - 0.3]] as V3[] })
/** 乙烯进第一台的管子 */
export const ETHENE_IN: V3[] = [[U[0].x - 3.4, 8.4, Z - 11], [U[0].x - 3.4, 8.4, Z - 2.4], [U[0].x - 3.4, U[0].top + 0.9, Z - 2.4], [U[0].x, U[0].top + 0.9, Z - 0.6], [U[0].x, U[0].top - 0.1, Z - 0.3]]
/** 每一步另加的东西（水、氧气、氧气、乙醇）从管廊下来进装置的管子 */
export const ADDS: V3[][] = U.map(u => [[u.x + 2.3, 8.4, Z - 11], [u.x + 2.3, 8.4, Z - 2.6], [u.x + 2.3, 5.2, Z - 2.6], [u.x + u.r * 0.7, 5.2, Z - u.r * 0.7]] as V3[])
/** 酯化釜出料去产品罐 */
export const ESTER_OUT: V3[] = [[U[3].x + 1.3, 15.4, Z - 0.9], [U[3].x + 3.2, 15.4, Z - 0.9], [U[3].x + 3.2, 4.3, Z - 0.9], [U[3].x + 6.6, 4.3, Z - 0.9], [U[3].x + 6.6, 3.5, Z]]
const ADD_COLOR = ['#3f8f5a', '#4a86c5', '#4a86c5', '#c98a3a']

/** 一圈大法兰：两片法兰盘夹着，一圈螺栓 */
function Girth({ r, y }: { r: number; y: number }) {
  const g = useMemo(() => ({ ring: disc(r + 0.16, 0.12, { hole: r - 0.02 }), bolts: bolts(Math.round(r * 22), r + 0.09, 0.06, 0.34) }), [r])
  return <group position-y={y}>
    <mesh geometry={g.ring} castShadow><Paint color="#7d868b" /></mesh><mesh geometry={g.ring} position-y={0.14} castShadow><Paint color="#7d868b" /></mesh>
    <mesh geometry={g.bolts} position-y={-0.04}><Metal kind="steel" rough={0.45} /></mesh>
  </group>
}

export function Train() {
  const grate = useMemo(() => rep(gratingTex(), 8, 1.2), [])
  const geo = useMemo(() => {
    const L = (i: number, P: Part[]) => P.map(p => ({ ...p, p: [p.p[0] + U[i].x, p.p[1], p.p[2] + Z] as V3 }))
    const st: Part[] = [], decks: { g: THREE.BufferGeometry; x: number }[] = []
    // 一：水合反应器
    st.push(...L(0, [...platformParts(1.1, 8.6, -0.5, Math.PI + 0.5), ...platformParts(0.7, 15.0, 0.3, Math.PI * 2 - 0.3, 0.9), ...ladderParts(1.1, Math.PI * 0.5, 0.4, 8.6), ...ladderParts(1.1, Math.PI * 0.42, 8.6, 15.0)]))
    decks.push({ g: deckGeo(1.1, 8.6, -0.5, Math.PI + 0.5), x: U[0].x }, { g: deckGeo(0.7, 15.0, 0.3, Math.PI * 2 - 0.3, 0.9), x: U[0].x })
    // 二：氧化反应器的四条腿和顶上的平台
    const legs = (i: number, r: number, h: number) => { for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, x = Math.cos(a) * r, z = Math.sin(a) * r; st.push(...L(i, [box(x, 0, z, 0.3, h, 0.3, '#5d6468'), box(x, 0, z, 0.7, 0.3, 0.7, '#a5a39b'), { p: [x * 0.9, h - 0.3, z * 0.9], s: [0.5, 0.5, 0.2], c: '#5d6468', r: [0, -a, 0] }])) } }
    legs(1, 1.5, 4.2)
    st.push(...L(1, [...platformParts(1.5, 9.0, 0.35, Math.PI - 0.35), ...ladderParts(1.5, Math.PI * 0.5, 0.4, 9.0)])); decks.push({ g: deckGeo(1.5, 9.0, 0.35, Math.PI - 0.35), x: U[1].x })
    // 三：氧化塔
    st.push(...L(2, [...platformParts(0.95, 9, -0.4, Math.PI + 0.4), ...platformParts(1.35, 15.4, -0.4, Math.PI + 0.4), ...ladderParts(0.95, Math.PI * 0.5, 0.4, 9), ...ladderParts(0.95, Math.PI * 0.42, 9, 15.4)]))
    decks.push({ g: deckGeo(0.95, 9, -0.4, Math.PI + 0.4), x: U[2].x }, { g: deckGeo(1.35, 15.4, -0.4, Math.PI + 0.4), x: U[2].x })
    // 四：酯化釜外面的钢平台
    st.push(...L(3, frameParts([-2.5, 2.5], [-2.4, 2.4], [7.0], { brace: false })))
    legs(3, 1.55, 3.0)
    // 产品罐的鞍座
    for (const dx of [5.4, 7.8]) st.push(box(U[3].x + dx, 0, Z, 0.5, 1.5, 1.9, '#a5a39b'))
    // 各台的基础
    for (const u of U) st.push(cyl(u.x, 0, Z, u.r + 1.3, 0.25, '#a9a59a'))
    return {
      st: mergeParts(st), decks,
      v1: lathe(vesselPts(1.1, 3.6, 13.6, 0.55), { segs: 40 }), s1: shell([[1.05, 0.25], [1.05, 3.7]], 0.05),
      v2: lathe([[0, 3.3], [0.3, 3.3], [1.5, 4.5], [1.5, 7.6], [0.3, 8.8], [0, 8.8]] as RY[], { segs: 44 }),
      v3: lathe([...headPts(0.95, 3.2, 0.45, -1).reverse(), [0.95, 14], [1.3, 14.8], ...headPts(1.3, 17.2, 0.6, 1)] as RY[], { segs: 40 }), s3: shell([[0.9, 0.25], [0.9, 3.3]], 0.05),
      jacket3: shell([[1.06, 0], [1.06, 2.4]], 0.1),
      v4: lathe(vesselPts(1.7, 3.6, 6.6, 0.8), { segs: 44 }), jacket4: shell([[1.82, 3.8], [1.82, 5.9]], 0.12),
      col4: lathe(vesselPts(0.42, 7.2, 14.6, 0.25), { segs: 28 }),
      hx: (() => { const g = lathe([[0, -1.6], [0.3, -1.6], [0.36, -1.4], [0.36, -1.3], [0.46, -1.3], [0.46, -1.2], [0.36, -1.2], [0.36, 1.2], [0.46, 1.2], [0.46, 1.3], [0.36, 1.3], [0.36, 1.4], [0.3, 1.6], [0, 1.6]], { segs: 28 }); g.rotateZ(Math.PI / 2); return g })(),
      tank: (() => { const g = lathe(vesselPts(1.15, -2.2, 2.2, 0.55), { segs: 40 }); g.rotateZ(Math.PI / 2); return g })(),
    }
  }, [])
  const pipes = useMemo(() => ({
    links: LINKS.flatMap(p => [pipeGeo(p.slice(0, 4), 0.16), pipeGeo(p.slice(4), 0.16)]), ethene: pipeGeo(ETHENE_IN, 0.16), adds: ADDS.map(p => pipeGeo(p, 0.11)), out: pipeGeo(ESTER_OUT, 0.13),
    reflux: pipeGeo([[U[3].x + 0.9, 14.9, Z - 0.9], [U[3].x + 0.9, 15.4, Z - 0.9], [U[3].x + 1.6, 15.4, Z - 0.9]], 0.13, 0.25),
  }), [])
  return <group>
    <mesh geometry={geo.st} castShadow receiveShadow><Painted rough={0.58} metal={0.3} /></mesh>
    {geo.decks.map((d, i) => <mesh key={i} geometry={d.g} position={[d.x, 0, Z]} castShadow receiveShadow><meshStandardMaterial attach="material-0" map={grate} roughness={0.7} metalness={0.4} /><meshStandardMaterial attach="material-1" color="#4c5257" /></mesh>)}
    {/* 一：水合反应器 */}
    <group position={[U[0].x, 0, Z]}>
      <mesh geometry={geo.s1} castShadow><Paint color="#6c7479" plate /></mesh>
      <mesh geometry={geo.v1} castShadow receiveShadow><Jacket rx={2} ry={6} /></mesh>
      <Girth r={1.1} y={12.9} />
      <mesh geometry={geo.hx} position={[-2.6, 1.5, -1.6]} castShadow><Jacket rx={2} ry={2} /></mesh>
      {[-3.6, -1.6].map(x => <mesh key={x} position={[x, 0.55, -1.6]} castShadow><boxGeometry args={[0.3, 1.1, 0.8]} /><Concrete /></mesh>)}
    </group>
    {/* 二：乙醇氧化反应器 */}
    <group position={[U[1].x, 0, Z]}>
      <mesh geometry={geo.v2} castShadow receiveShadow><Paint color="#93a7a0" plate rx={4} ry={2} /></mesh>
      <Girth r={1.5} y={4.5} /><Girth r={1.5} y={7.36} />
      <mesh position={[0, 9.0, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.5, 20]} /><Paint color="#93a7a0" /></mesh>
      {[5.2, 6.6].map(y => <mesh key={y} position={[1.58, y, 0.5]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.16, 0.16, 0.4, 16]} /><Paint color="#7d868b" /></mesh>)}
    </group>
    {/* 三：乙醛氧化塔 */}
    <group position={[U[2].x, 0, Z]}>
      <mesh geometry={geo.s3} castShadow><Paint color="#6c7479" plate /></mesh>
      <mesh geometry={geo.v3} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.5} env={0.6} /></mesh>
      {[4.2, 7.4, 10.6].map(y => <mesh key={y} geometry={geo.jacket3} position-y={y} castShadow><Paint color="#5f88a8" plate rx={3} ry={1} /></mesh>)}
      <mesh geometry={geo.hx} position={[0, 18.6, -0.2]} scale={0.8} castShadow><Jacket rx={2} ry={2} /></mesh>
    </group>
    {/* 四：酯化釜、搅拌电机、精馏柱和柱顶冷凝器 */}
    <group position={[U[3].x, 0, Z]}>
      <mesh geometry={geo.v4} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.5} env={0.6} /></mesh>
      <mesh geometry={geo.jacket4} castShadow><Jacket rx={4} ry={1} /></mesh>
      <mesh position={[-0.3, 7.55, 0.2]} castShadow><cylinderGeometry args={[0.34, 0.4, 0.5, 24]} /><Paint color="#3b4146" /></mesh>
      <mesh position={[-0.3, 8.0, 0.2]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.5, 24]} /><Paint color="#3b4146" /></mesh>
      <mesh position={[-0.3, 8.7, 0.2]} castShadow><cylinderGeometry args={[0.36, 0.36, 0.95, 24]} /><Paint color="#2f5f8a" /></mesh>
      <mesh position={[-0.3, 9.22, 0.2]} castShadow><cylinderGeometry args={[0.28, 0.36, 0.14, 24]} /><Paint color="#274f73" /></mesh>
      <mesh geometry={geo.col4} position={[0.9, 0, -0.9]} castShadow><Jacket rx={1} ry={5} /></mesh>
      <mesh geometry={geo.hx} position={[2.6, 15.4, -0.9]} scale={0.7} castShadow><Jacket rx={2} ry={2} /></mesh>
      <mesh position={[2.3, 15.0, -0.9]} castShadow><boxGeometry args={[0.16, 8.2, 0.16]} /><Paint color="#5d6468" /></mesh>
      {/* 产品罐 */}
      <mesh geometry={geo.tank} position={[6.6, 2.4, 0]} castShadow receiveShadow><Paint color="#d7d9d4" plate rx={3} ry={2} rough={0.45} /></mesh>
    </group>
    {pipes.links.map((g, i) => <mesh key={i} geometry={g} castShadow><Jacket rx={1} ry={14} /></mesh>)}
    <mesh geometry={pipes.ethene} castShadow><Paint color="#d9a51c" /></mesh>
    {pipes.adds.map((g, i) => <mesh key={i} geometry={g} castShadow><Paint color={ADD_COLOR[i]} /></mesh>)}
    <mesh geometry={pipes.out} castShadow><Jacket rx={1} ry={8} /></mesh>
    <mesh geometry={pipes.reflux} castShadow><Jacket rx={1} ry={2} /></mesh>
    {[0, 1, 2].map(i => <Pump key={i} at={[pumpX(i), 0, Z + 2.8]} rot={Math.PI} s={PS} />)}
  </group>
}
