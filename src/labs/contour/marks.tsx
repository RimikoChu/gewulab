// 等高线地形图 · 各课放在山上的东西：测量标杆、路线、示坡线、雨滴、水坝、剖面板。
// 它们都跟着地形一起“压平”：山立着时贴在山上，压成地图时贴在图上。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { Metal } from '@/lab-kit'
import { X0, X1, Y, Z0, Z1, height } from './physics'
import { FLAT, FLOOR, flatScale } from './world'

type P2 = readonly [number, number]
/** 地面上一点的场景高度（压平之前） */
export const groundY = (x: number, z: number) => Y(height(x, z))

/** 一个跟着压平的组：子物体按“立着时”的高度摆，压平时整组在竖直方向缩扁 */
export function OnLand({ children, lift = 0.08 }: { children: React.ReactNode; lift?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { const g = ref.current; if (!g) return; g.scale.y = flatScale(FLAT.k); g.position.y = lift * (1 + FLAT.k) })
  return <group ref={ref}>{children}</group>
}
/** 一个只跟着高度移动、本身不压扁的组（标杆、小旗） */
export function AtPoint({ x, z, h, children, up = 0 }: { x: number; z: number; h?: number; children: React.ReactNode; up?: number }) {
  const ref = useRef<THREE.Group>(null), y = Y(h ?? height(x, z))
  useFrame(() => { const g = ref.current; if (!g) return; g.position.set(x, y * flatScale(FLAT.k) + up, z) })
  return <group ref={ref}>{children}</group>
}

/** 宽度按像素算的粗线：贴着地面走 */
export function Trail({ pts, color = '#ffffff', width = 4, dash = false, opacity = 1, drape = 0.12, progress = 1, depthTest = true }: { pts: P2[] | [number, number, number][]; color?: string; width?: number; dash?: boolean; opacity?: number; drape?: number; progress?: number; depthTest?: boolean }) {
  const dense = useMemo(() => {
    // 每隔 0.25 加密一次，线才贴着起伏的地面
    const out: number[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25))
      for (let s = 0; s < n; s++) { const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n; out.push(x, groundY(x, z) + drape, z) }
    }
    const [lx, lz] = pts[pts.length - 1]; out.push(lx, groundY(lx, lz) + drape, lz)
    return out
  }, [pts, drape])
  const line = useMemo(() => {
    const g = new LineGeometry(); g.setPositions(dense)
    const m = new LineMaterial({ color, linewidth: width, dashed: dash, dashSize: 0.5, gapSize: 0.35, transparent: true, opacity, depthTest, depthWrite: false, toneMapped: false })
    const l = new Line2(g, m); l.computeLineDistances(); l.renderOrder = 9; l.frustumCulled = false
    return l
  }, [dense, color, width, dash, opacity, depthTest])
  const n = dense.length / 3 - 1
  line.geometry.instanceCount = Math.max(0, Math.round(n * progress))
  return <primitive object={line} />
}

/** 一面测量用的小旗：细杆加三角旗 */
export function Flag({ x, z, color = '#e84a3a', s = 1 }: { x: number; z: number; color?: string; s?: number }) {
  return (
    <AtPoint x={x} z={z}>
      <group scale={s}>
        <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.03, 0.035, 1.4, 8]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[0.24, 1.22, 0]}><boxGeometry args={[0.46, 0.3, 0.015]} /><meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.12, 0.14, 0.05, 16]} /><meshStandardMaterial color="#3a3f44" roughness={0.6} /></mesh>
      </group>
    </AtPoint>
  )
}

/** 一个会发光的圆点（登山的人、雨滴） */
export function Dot({ at, color = '#ffffff', r = 0.22 }: { at: [number, number, number]; color?: string; r?: number }) {
  return <mesh position={at} renderOrder={12}><sphereGeometry args={[r, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent /></mesh>
}

/** 测海拔的标尺：从海平面竖到这一点，每 100 m 一道刻度，旁边一块淡蓝的“海平面” */
export function Staff({ x, z, h, show, color = '#ffe28a' }: { x: number; z: number; h: number; show: number; color?: string }) {
  const top = Y(h) * show
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, top / 2, 0]} renderOrder={11}><cylinderGeometry args={[0.13, 0.13, Math.max(0.001, top), 12]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent opacity={0.95} /></mesh>
      {Array.from({ length: Math.floor((h * show) / 100) }, (_, k) => <mesh key={k} position={[0, Y((k + 1) * 100), 0]} renderOrder={11}><boxGeometry args={[k % 5 === 4 ? 1.0 : 0.6, 0.07, 0.07]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent /></mesh>)}
      <mesh position={[0, top, 0]} renderOrder={12}><sphereGeometry args={[0.3, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent /></mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} renderOrder={12}><ringGeometry args={[0.35, 0.6, 32]} /><meshBasicMaterial color="#bfeaff" toneMapped={false} depthTest={false} transparent /></mesh>
    </group>
  )
}

/** 海平面：一块从海面伸进山底下的淡蓝色薄板，海拔从这里算起 */
export function SeaLevel({ on }: { on: boolean }) {
  const m = useRef<THREE.MeshBasicMaterial>(null), e = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((_, dt) => { for (const r of [m, e]) if (r.current) { const goal = on ? (r === m ? 0.32 : 0.9) : 0; r.current.opacity += (goal - r.current.opacity) * Math.min(1, dt * 4); r.current.visible = r.current.opacity > 0.01 } })
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0.03, (Z0 + Z1) / 2]} renderOrder={7}><planeGeometry args={[X1 - X0, Z1 - Z0]} /><meshBasicMaterial ref={m} color="#7fd3ff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      <mesh position={[(X0 + X1) / 2, 0.03, Z1 + 0.02]} renderOrder={7}><planeGeometry args={[X1 - X0, 0.12]} /><meshBasicMaterial ref={e} color="#bfeaff" transparent opacity={0} toneMapped={false} /></mesh>
    </group>
  )
}

/** 示坡线：等高线上一小段一小段垂直于线、指向低处的短线 */
export function SlopeTicks({ ticks, level, on, color = '#ffe28a' }: { ticks: [number, number, number, number][]; level: number; on: boolean; color?: string }) {
  const segs = useMemo(() => ticks.map(([x, z, dx, dz]) => {
    const g = new LineGeometry(); g.setPositions([x, Y(level), z, x + dx * 0.9, Y(level) - 0.02, z + dz * 0.9])
    const l = new Line2(g, new LineMaterial({ color, linewidth: 4, transparent: true, toneMapped: false, depthWrite: false })); l.renderOrder = 9; return l
  }), [ticks, level, color])
  return <OnLand lift={0.1}>{on && segs.map((l, i) => <primitive key={i} object={l} />)}</OnLand>
}

/** 下雨：一滴滴雨水沿算好的路线往下流，留下一道淡淡的水迹 */
export function Rain({ paths, run, color = '#7fd6ff' }: { paths: [number, number, number][][]; run: number; color?: string }) {
  const dots = useRef<THREE.Group>(null)
  const curves = useMemo(() => paths.map(p => p.map(([x, z]) => new THREE.Vector3(x, groundY(x, z) + 0.12, z))), [paths])
  useFrame(() => {
    const g = dots.current; if (!g) return
    g.children.forEach((m, i) => {
      const c = curves[i]; if (!c) return
      const k = Math.min(c.length - 1, Math.floor(run * (c.length - 1)))
      m.position.copy(c[k]); m.position.y *= flatScale(FLAT.k); m.visible = run > 0 && run < 1.02
    })
  })
  return (
    <group>
      <OnLand lift={0}>{paths.map((p, i) => <Trail key={i} pts={p} color={color} width={3} progress={Math.min(1, run)} drape={0.1} opacity={0.85} />)}</OnLand>
      <group ref={dots}>{paths.map((_, i) => <mesh key={i} renderOrder={12}><sphereGeometry args={[0.2, 14, 10]} /><meshBasicMaterial color="#e6f7ff" toneMapped={false} /></mesh>)}</group>
    </group>
  )
}

/** 一道混凝土重力坝：横在河谷里，两头接到山上 */
export function Dam({ x0, x1, z, crest, bed, rise }: { x0: number; x1: number; z: number; crest: number; bed: number; rise: number }) {
  const w = x1 - x0, yTop = Y(crest + 15), yBot = Y(bed - 10), hgt = (yTop - yBot) * rise
  return (
    <group position={[(x0 + x1) / 2, yBot, z]}>
      <mesh position={[0, hgt / 2, 0]} castShadow receiveShadow><boxGeometry args={[w + 0.6, Math.max(0.01, hgt), 0.7]} /><meshStandardMaterial color="#a8a59c" roughness={0.85} /></mesh>
      <mesh position={[0, hgt / 2 - 0.1, 0.55]} rotation-x={0.5} castShadow><boxGeometry args={[w + 0.4, Math.max(0.01, hgt * 0.9), 0.5]} /><meshStandardMaterial color="#9d9a91" roughness={0.88} /></mesh>
      {rise > 0.98 && <>
        <mesh position={[0, hgt + 0.06, 0]}><boxGeometry args={[w + 0.7, 0.12, 0.9]} /><meshStandardMaterial color="#e2dfd6" roughness={0.7} /></mesh>
        {Array.from({ length: Math.max(2, Math.round(w / 1.2)) }, (_, k) => <mesh key={k} position={[-w / 2 + (k + 0.5) * w / Math.max(2, Math.round(w / 1.2)), hgt - 0.35, 0.37]}><boxGeometry args={[0.3, 0.5, 0.06]} /><Metal kind="steel" grain="brushed" /></mesh>)}
      </>}
    </group>
  )
}

/** 水库的水面：把淹到的格子拼成一块，水面在海拔 level */
export function Reservoir({ cells, level, fill, damZ }: { cells: P2[]; level: number; fill: number; damZ: number }) {
  const geo = useMemo(() => {
    const parts: number[] = [], c = 0.5
    // 水面往外多铺两格：岸边由地形自己挡住，水边才是顺着等高线的曲线，不是一格一格的台阶
    const key = (x: number, z: number) => `${Math.round(x / c)},${Math.round(z / c)}`, set = new Map<string, P2>()
    for (const [x, z] of cells) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const px = x + i * c, pz = z + j * c; if (pz <= damZ) set.set(key(px, pz), [px, pz]) }
    for (const [x, z] of set.values()) parts.push(x - c / 2, 0, z - c / 2, x + c / 2, 0, z - c / 2, x + c / 2, 0, z + c / 2, x - c / 2, 0, z - c / 2, x + c / 2, 0, z + c / 2, x - c / 2, 0, z + c / 2)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(parts, 3)); g.computeVertexNormals(); return g
  }, [cells, damZ])
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => { if (ref.current) { ref.current.position.y = Y(level) * flatScale(FLAT.k) * fill + 0.04; ref.current.visible = fill > 0.02 } })
  return <mesh ref={ref} geometry={geo} renderOrder={3}><meshPhysicalMaterial color="#2f7fb6" roughness={0.1} clearcoat={0.8} transparent opacity={0.88} envMapIntensity={1.2} side={THREE.DoubleSide} /></mesh>
}

/** 剖面板：沿剖面线竖起来的一块半透明板，上面画出剖面的轮廓，轮廓以下涂成土色 */
export function Curtain({ a, b, samples, show }: { a: P2; b: P2; samples: [number, number][]; show: number }) {
  const geo = useMemo(() => {
    const pos: number[] = [], idx: number[] = [], n = samples.length - 1
    samples.forEach(([, h], k) => { const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; pos.push(x, FLOOR + 0.02, z, x, Y(Math.max(h, 0)), z); if (k < n) { const i = k * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3) } })
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g
  }, [a, b, samples])
  const edge = useMemo(() => samples.map(([, h], k) => { const t = k / (samples.length - 1); return [a[0] + (b[0] - a[0]) * t, h, a[1] + (b[1] - a[1]) * t] as const }), [a, b, samples])
  const line = useMemo(() => {
    const g = new LineGeometry(); g.setPositions(edge.flatMap(([x, h, z]) => [x, Y(Math.max(h, 0)) + 0.05, z]))
    const l = new Line2(g, new LineMaterial({ color: '#ffe28a', linewidth: 4, toneMapped: false, transparent: true, depthTest: false })); l.renderOrder = 13; return l
  }, [edge])
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) { ref.current.scale.y = Math.max(0.001, show); ref.current.position.y = 0; ref.current.visible = show > 0.01 } })
  return (
    <group ref={ref}>
      <mesh geometry={geo} renderOrder={6}><meshBasicMaterial color="#c8925a" transparent opacity={0.82} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
      <primitive object={line} />
    </group>
  )
}
