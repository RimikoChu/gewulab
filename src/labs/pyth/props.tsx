// 广场上的施工道具和园林小品：砖垛、手推车、水桶、墨斗、石凳、花坛、地上的勾股图石刻。
// 让广场像一个正在铺装的园林广场；都摆在各课主体的旁边，不挡主体。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, shell } from '@/lab-kit'
import { granite, rng, stoneDark, woodDark, woodLight } from './mats'

type V3 = [number, number, number]

/** 一垛青砖：交错码放，最上一层少几块 */
export function BrickStack({ at, rot = 0, rows = 7, seed = 1 }: { at: V3; rot?: number; rows?: number; seed?: number }) {
  const list = useMemo(() => {
    const r = rng(seed), out: { p: V3; y: number; c: string }[] = []
    for (let k = 0; k < rows; k++) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      if (k === rows - 1 && r() < 0.35) continue
      const along = k % 2 === 0, v = 92 + Math.floor(r() * 28)
      out.push({ p: along ? [-0.36 + i * 0.245, 0.03 + k * 0.058, -0.06 + j * 0.122] : [-0.3 + j * 0.245 + (i % 2) * 0.12, 0.03 + k * 0.058, -0.18 + i * 0.12], y: along ? 0 : Math.PI / 2, c: `rgb(${v},${v + 4},${v + 6})` })
    }
    return out
  }, [rows, seed])
  return <group position={at} rotation-y={rot}>
    {/* 底下垫一块木托板 */}
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow><boxGeometry args={[1.0, 0.06, 0.5]} /><meshStandardMaterial map={woodDark()} roughness={0.85} /></mesh>
    {list.map((b, i) => <RoundedBox key={i} args={[0.24, 0.053, 0.115]} radius={0.006} smoothness={1} position={[b.p[0], b.p[1] + 0.06, b.p[2]]} rotation-y={b.y} castShadow receiveShadow><meshStandardMaterial color={b.c} roughness={0.9} /></RoundedBox>)}
  </group>
}

/** 独轮手推车：铁斗、两根木把、一个充气轮、两条支腿 */
export function Barrow({ at, rot = 0 }: { at: V3; rot?: number }) {
  const tub = useMemo(() => { const g = shell([[0, 0], [0.26, 0], [0.4, 0.28], [0.42, 0.3]], 0.008, { segs: 4 }); g.rotateY(Math.PI / 4); g.scale(1, 1, 1.3); return g }, [])
  return <group position={at} rotation-y={rot}>
    <mesh geometry={tub} position={[0, 0.34, 0]} castShadow receiveShadow><meshStandardMaterial color="#2f6b4f" metalness={0.5} roughness={0.5} side={THREE.DoubleSide} /></mesh>
    {[-0.22, 0.22].map(x => <mesh key={x} position={[x, 0.42, 0.3]} rotation-x={-0.12} castShadow><boxGeometry args={[0.04, 0.04, 1.4]} /><meshStandardMaterial map={woodLight()} roughness={0.7} /></mesh>)}
    {[-0.22, 0.22].map(x => <mesh key={`l${x}`} position={[x, 0.18, 0.4]} castShadow><boxGeometry args={[0.03, 0.36, 0.03]} /><Metal kind="iron" /></mesh>)}
    <mesh position={[0, 0.17, -0.62]} rotation-z={Math.PI / 2} castShadow><torusGeometry args={[0.13, 0.045, 12, 28]} /><meshStandardMaterial color="#1c1d1e" roughness={0.9} /></mesh>
    <mesh position={[0, 0.17, -0.62]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.06, 18]} /><Metal kind="steel" /></mesh>
  </group>
}

/** 镀锌铁皮水桶：有壁厚，里面半桶水，一根提梁 */
export function Bucket({ at }: { at: V3 }) {
  const body = useMemo(() => shell([[0, 0], [0.12, 0], [0.15, 0.28], [0.155, 0.29]], 0.004, { segs: 32 }), [])
  return <group position={at}>
    <mesh geometry={body} castShadow receiveShadow><Metal kind="zinc" grain="brushed" /></mesh>
    <mesh position={[0, 0.16, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.135, 28]} /><meshStandardMaterial color="#3b5a5e" roughness={0.1} /></mesh>
    <mesh position={[0, 0.29, 0]} rotation-x={0.3}><torusGeometry args={[0.15, 0.005, 6, 28, Math.PI]} /><Metal kind="steel" /></mesh>
  </group>
}

/** 墨斗：木头的斗身，一头是墨仓，一头是绕线的轮子，线头一枚小钉子 */
export function InkReel({ at, rot = 0 }: { at: V3; rot?: number }) {
  return <group position={at} rotation-y={rot}>
    <RoundedBox args={[0.24, 0.07, 0.07]} radius={0.015} position={[0, 0.035, 0]} castShadow><meshStandardMaterial map={woodDark()} roughness={0.6} /></RoundedBox>
    <mesh position={[-0.07, 0.072, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.025, 16]} /><meshStandardMaterial color="#111" roughness={0.3} /></mesh>
    <mesh position={[0.07, 0.04, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.04, 0.04, 0.05, 20]} /><meshStandardMaterial map={woodLight()} roughness={0.6} /></mesh>
    <mesh position={[0.3, 0.004, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0015, 0.0015, 0.42, 4]} /><meshStandardMaterial color="#222" /></mesh>
  </group>
}

/** 一捆木桩和一把木槌 */
export function StakeBundle({ at, rot = 0 }: { at: V3; rot?: number }) {
  const wood = woodDark()
  return <group position={at} rotation-y={rot}>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[(i % 3) * 0.055, 0.025 + Math.floor(i / 3) * 0.05, 0]} rotation-z={Math.PI / 2} castShadow><boxGeometry args={[0.045, 0.45, 0.045]} /><meshStandardMaterial map={wood} roughness={0.85} /></mesh>)}
    <mesh position={[0.05, 0.05, 0.3]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.055, 0.055, 0.16, 16]} /><meshStandardMaterial map={woodLight()} roughness={0.7} /></mesh>
    <mesh position={[0.05, 0.03, 0.15]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.014, 0.014, 0.32, 8]} /><meshStandardMaterial map={wood} roughness={0.7} /></mesh>
  </group>
}

/** 一盘麻绳：一圈圈盘在地上 */
export function RopeCoil({ at }: { at: V3 }) {
  return <group position={at}>{[0.11, 0.135, 0.16, 0.185].map((r, i) => <mesh key={r} position={[0, 0.012 + (i % 2) * 0.012, 0]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[r, 0.011, 6, 30]} /><meshStandardMaterial color="#cdb88a" roughness={0.95} /></mesh>)}</group>
}

/** 花岗石条凳：两个凳墩、一块凳面 */
export function Bench({ at, rot = 0 }: { at: V3; rot?: number }) {
  return <group position={at} rotation-y={rot}>
    {[-0.6, 0.6].map(x => <mesh key={x} position={[x, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[0.22, 0.4, 0.36]} /><meshStandardMaterial map={granite()} roughness={0.8} /></mesh>)}
    <RoundedBox args={[1.6, 0.09, 0.42]} radius={0.015} position={[0, 0.445, 0]} castShadow receiveShadow><meshStandardMaterial map={granite()} color="#dcd9d0" roughness={0.7} /></RoundedBox>
  </group>
}

/** 花坛：花岗石的边，里面是土、修剪过的灌木和几丛花 */
export function FlowerBed({ at, w, d, rot = 0, seed = 3 }: { at: V3; w: number; d: number; rot?: number; seed?: number }) {
  const bush = useMemo(() => {
    const r = rng(seed), gs: THREE.BufferGeometry[] = []
    const n = Math.round(w * d * 2.2)
    for (let i = 0; i < n; i++) {
      const g = new THREE.IcosahedronGeometry(0.22 + r() * 0.12, 2), p = g.attributes.position
      for (let k = 0; k < p.count; k++) { const s = 1 + (r() - 0.5) * 0.18; p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.8, p.getZ(k) * s) }
      g.translate((r() - 0.5) * (w - 0.5), 0.42, (r() - 0.5) * (d - 0.5)); gs.push(g.toNonIndexed())
    }
    const m = new THREE.BufferGeometry(), pos: number[] = []
    for (const g of gs) pos.push(...g.attributes.position.array)
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.computeVertexNormals()
    return m
  }, [w, d, seed])
  const t = 0.14, h = 0.32
  return <group position={at} rotation-y={rot}>
    {[[0, d / 2 - t / 2, w, t], [0, -d / 2 + t / 2, w, t], [w / 2 - t / 2, 0, t, d], [-w / 2 + t / 2, 0, t, d]].map(([x, z, sx, sz], i) => <mesh key={i} position={[x, h / 2, z]} castShadow receiveShadow><boxGeometry args={[sx, h, sz]} /><meshStandardMaterial map={granite()} roughness={0.75} /></mesh>)}
    <mesh position={[0, h - 0.04, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[w - 2 * t, d - 2 * t]} /><meshStandardMaterial color="#4a3a2a" roughness={1} /></mesh>
    <mesh geometry={bush} castShadow receiveShadow><meshStandardMaterial color="#456b34" roughness={0.85} flatShading /></mesh>
  </group>
}

/** 地上的勾股图石刻：一块深色花岗石嵌在方砖里，阴刻一个 3、4、5 的直角三角形和三边上的正方形 */
export function Carving({ at, rot = 0 }: { at: V3; rot?: number }) {
  const k = 0.32, lines = useMemo(() => {
    const a = 3, b = 4, s: [number, number, number, number][] = [
      [0, 0, a, 0], [0, 0, 0, b], [a, 0, 0, b],
      [0, 0, 0, -a], [0, -a, a, -a], [a, -a, a, 0],
      [0, 0, -b, 0], [-b, 0, -b, b], [-b, b, 0, b],
      [a, 0, a + b, a], [a + b, a, b, a + b], [b, a + b, 0, b],
    ]
    return s
  }, [])
  return <group position={at} rotation-y={rot}>
    <mesh position={[0, 0.004, 0]} receiveShadow><boxGeometry args={[3.6, 0.01, 3.6]} /><meshStandardMaterial map={stoneDark()} color="#8f8c85" roughness={0.75} /></mesh>
    <group position={[-0.4, 0.0095, 0.75]}>
      {lines.map(([x0, y0, x1, y1], i) => { const L = Math.hypot(x1 - x0, y1 - y0) * k; return <mesh key={i} position={[(x0 + x1) / 2 * k, 0, -(y0 + y1) / 2 * k]} rotation-y={Math.atan2(y1 - y0, x1 - x0)}><boxGeometry args={[L + 0.04, 0.002, 0.04]} /><meshStandardMaterial color="#e6dfc8" roughness={0.7} /></mesh> })}
    </group>
  </group>
}

/** 一节车削的石灯笼：园林里放在花坛边 */
export function Lantern({ at }: { at: V3 }) {
  const g = useMemo(() => lathe([[0, 0], [0.22, 0], [0.22, 0.1], [0.1, 0.14], [0.08, 0.6], [0.2, 0.66], [0.2, 0.9], [0.28, 0.96], [0.06, 1.12], [0, 1.16]], { segs: 6, crease: 20 }), [])
  return <mesh geometry={g} position={at} castShadow receiveShadow><meshStandardMaterial map={granite()} color="#bdb9ae" roughness={0.85} /></mesh>
}
