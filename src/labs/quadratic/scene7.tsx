// 二次函数 · 第 7 课的三维场景：花园的矮砖墙前，用 20 m 木栅栏靠墙围一个矩形花圃。垂直于墙的两边长 x，平行于墙的一边长 20 − 2x。
// 栅栏随 x 沿地面移动；围起来的地翻好土、种上一行行花苗。右边一块 S–x 图表板。
import { useMemo } from 'react'
import * as THREE from 'three'
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { Curve, Dash, Dot, type Axes } from './graph'
import { makeWood, rep, rng } from './mats'
import { FENCE, fenceArea, fmt } from './physics'
import { Board } from './props'
import { P } from './world'

type V3 = [number, number, number]
const W = (p: V3) => toWorld(P.bed7, 0, p)
export const A7: Axes = { xr: [0, 10], yr: [0, 55], xStep: 2, yStep: 10, sx: 0.36, sy: 0.052, minor: [1, 5], xName: 'x / m', yName: 'S / m²', font: 0.27, pad: 0.4, padL: 0.75 }
const BOARD: V3 = [-1.6, 1.3, -1.6]   // 图表板立在墙后正中，从墙头上露出来

/** 一段栅栏：从 p 到 q（地面上），每隔约 1 m 一根立柱，两道横档，竖条板 */
function Fence({ p, q }: { p: [number, number]; q: [number, number] }) {
  const wood = useMemo(() => rep(makeWood([196, 164, 120]), 1, 1), [])
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(-(q[1] - p[1]), q[0] - p[0])
  const n = Math.max(1, Math.round(len / 1.0)), slats = Math.max(1, Math.round(len / 0.16))
  if (len < 0.05) return null
  return (
    <group position={[p[0], 0, p[1]]} rotation-y={ang}>
      {Array.from({ length: n + 1 }, (_, i) => <mesh key={i} position={[len * i / n, 0.45, 0]} castShadow><boxGeometry args={[0.08, 0.9, 0.08]} /><meshStandardMaterial map={wood} roughness={0.85} /></mesh>)}
      {[0.25, 0.65].map(y => <mesh key={y} position={[len / 2, y, 0.05]} castShadow><boxGeometry args={[len, 0.06, 0.03]} /><meshStandardMaterial map={wood} color="#e8dccb" roughness={0.85} /></mesh>)}
      {Array.from({ length: slats }, (_, i) => <mesh key={`s${i}`} position={[len * (i + 0.5) / slats, 0.42, 0.075]} castShadow><boxGeometry args={[0.07, 0.72, 0.015]} /><meshStandardMaterial color="#efe6d6" roughness={0.8} /></mesh>)}
    </group>
  )
}

/** 花苗：在单位方格里撒好位置，按花圃的大小拉伸 */
function Seedlings({ L, x }: { L: number; x: number }) {
  const pts = useMemo(() => { const r = rng(12), a: [number, number, string][] = []; for (let i = 0; i < 14; i++) for (let j = 0; j < 7; j++) a.push([(i + 0.5) / 14 + (r() - 0.5) * 0.02, (j + 0.5) / 7 + (r() - 0.5) * 0.03, ['#d94f6a', '#f2b33d', '#e86a3c', '#b55bd1'][(i + j * 3) % 4]]); return a }, [])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.13, 0), [])
  return (
    <group>
      {pts.map(([u, v, c], i) => <group key={i} position={[(u - 0.5) * (L - 0.3), 0.1, 0.15 + v * (x - 0.3)]}>
        <mesh geometry={geo} scale={[1, 0.7, 1]} castShadow><meshStandardMaterial color="#4e7d3a" roughness={0.8} /></mesh>
        <mesh position-y={0.1} scale={0.45} geometry={geo}><meshStandardMaterial color={c} roughness={0.6} /></mesh>
      </group>)}
    </group>
  )
}

/** x：垂直于墙的边长（过渡中）；pts：图表板上描的点；peak：标出顶点和曲线 */
export default function Scene7({ x, pts, peak }: { x: number; pts: number[]; peak: boolean }) {
  const L = FENCE - 2 * x, S = fenceArea(x)
  const labels: Label[] = [
    { id: 'x', at: W([L / 2 + 0.25, 0.9, x / 2]), className: 'scene-tag -translate-y-1/2', children: <><small>x</small>{fmt(x, 1)} m</> },
    { id: 'L', at: W([0, 0.95, x + 0.1]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>20 − 2x</small>{fmt(L, 1)} m</> },
    { id: 'S', at: W([0, 0.3, x / 2]), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>面积</small>S = {fmt(S, 1)} m²</> },
    { id: 'n', at: W([-9, 1.35, 0]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '砖墙（足够长）' },
  ]
  return (
    <At at="bed7" labels={labels}>
      <Local origin={P.bed7} az={0}>
        <mesh position={[0, 0.012, x / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[L, x]} /><meshStandardMaterial color="#5a4232" roughness={1} /></mesh>
        <Seedlings L={L} x={x} />
        <Fence p={[-L / 2, 0]} q={[-L / 2, x]} />
        <Fence p={[-L / 2, x]} q={[L / 2, x]} />
        <Fence p={[L / 2, x]} q={[L / 2, 0]} />
        <group position={BOARD}>
          <Board A={A7} lift={1.3}>
            {pts.map(v => <Dot key={v} A={A7} x={v} y={fenceArea(v)} r={0.07} />)}
            {peak && <>
              <Curve A={A7} f={fenceArea} xr={[0, 10]} color="#ffd25a" width={0.04} />
              <Dash A={A7} p={[5, 0]} q={[5, 50]} width={0.022} gap={0.12} />
              <Dot A={A7} x={5} y={50} r={0.08} color="#ff7a59" />
            </>}
          </Board>
        </group>
      </Local>
    </At>
  )
}
