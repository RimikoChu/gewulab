// 电冰箱（拓展课用，平时就立在屋子右头）：箱体、上下两扇门、冷冻室后壁上的蒸发器、底下的压缩机、侧壁外面的冷凝器。
// 制冷剂沿着一圈管子流：在蒸发器里是蓝色的珠子（汽化吸热），在冷凝器里是橙色的珠子（液化放热）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, mergeParts, type Part } from '@/lab-kit'

type V3 = [number, number, number]
const W = 3.6, D = 3.4, H = 10.2, T = 0.18, MID = 7.0, BAY = 1.5
/** 给标签用：蒸发器、压缩机、冷凝器在冰箱自己的坐标里的位置 */
export const FRIDGE_PART = { evap: [0, 8.7, -1.3] as V3, pump: [-0.5, 0.9, 0.9] as V3, cond: [-1.9, 4.6, 0.2] as V3 }

/** 管路：压缩机 → 侧壁的冷凝器（一排排往上）→ 毛细管 → 冷冻室后壁的蒸发器（一排排往下）→ 沿后壁回到压缩机 */
function makeLoop() {
  const p: V3[] = [[-0.5, 1.25, 0.5], [-1.2, 1.5, 1.0]]
  const c0 = p.length
  for (let i = 0; i < 8; i++) { const y = 1.9 + i * 0.95, a = i % 2 ? -1.25 : 1.25; p.push([-1.87, y, a], [-1.87, y, -a]) }
  const c1 = p.length
  p.push([-1.87, 9.75, 1.25], [-1.6, 10.28, 0.2], [-1.4, 10.28, -1.2])
  const e0 = p.length
  for (let i = 0; i < 4; i++) { const y = 9.55 - i * 0.6, a = i % 2 ? 1.3 : -1.3; p.push([a, y, -1.46], [-a, y, -1.46]) }
  const e1 = p.length
  p.push([1.3, 7.3, -1.75], [1.3, 1.6, -1.75], [0.5, 1.1, -0.9], [-0.1, 1.2, 0.2])
  const curve = new THREE.CatmullRomCurve3(p.map(q => new THREE.Vector3(...q)), true, 'catmullrom', 0.12)
  const n = p.length
  return { curve, tube: new THREE.TubeGeometry(curve, 700, 0.045, 8, true), cond: [c0 / n, c1 / n] as const, evap: [e0 / n, e1 / n] as const }
}
const LOOP = makeLoop()
const DOME = lathe([[0, 0], [0.5, 0], [0.56, 0.05], [0.56, 0.42], [0.5, 0.62], [0.32, 0.78], [0.12, 0.84], [0, 0.85]], { segs: 32 })
const JAR = lathe([[0, 0], [0.2, 0], [0.22, 0.03], [0.22, 0.42], [0.16, 0.52], [0.1, 0.56], [0.1, 0.72], [0, 0.72]], { segs: 20 })
const BODY = (() => {
  const b: Part[] = [], white = '#e9ecec', inner = '#dfe6e8'
  b.push({ p: [0, H / 2, -D / 2 + T / 2], s: [W, H, T], c: white }, { p: [W / 2 - T / 2, H / 2, 0], s: [T, H, D], c: white }, { p: [-W / 2 + T / 2, H / 2, 0], s: [T, H, D], c: white })
  b.push({ p: [0, H - T / 2, 0], s: [W, T, D], c: white }, { p: [0, MID, 0], s: [W, T * 1.4, D], c: white }, { p: [0, BAY, 0], s: [W, T, D], c: white }, { p: [0, T / 2, 0], s: [W, T, D], c: '#3a4046' })
  for (const y of [3.3, 5.2]) b.push({ p: [0, y, -0.1], s: [W - T * 2, 0.06, D - 0.7], c: inner })
  b.push({ p: [0, BAY + 0.55, 0.3], s: [W - T * 2 - 0.1, 0.9, D - 1.2], c: '#cfe0e6' })                         // 果菜盒
  b.push({ p: [-0.6, MID + 0.5, 0.2], s: [1.3, 0.5, 1.6], c: '#c9d6de' }, { p: [0.8, MID + 0.42, 0], s: [1.0, 0.34, 1.4], c: '#b9c9d6' })   // 冷冻室里的两只盒子
  for (const s of [-1, 1]) for (const z of [-1.3, 1.3]) b.push({ p: [s * 1.5, -0.08, z], s: [0.16, 0.16, 0.16], c: '#1d2023', cyl: true })
  return mergeParts(b)
})()

/** open：两扇门开到多大（0–1）；power：通了电，压缩机转、制冷剂流动 */
export function Fridge({ at, open, power }: { at: V3; open: number; power: boolean }) {
  const beads = useRef<THREE.InstancedMesh>(null), pump = useRef<THREE.Mesh>(null), run = useRef(0), k = useRef(0)
  const N = 70, o = useMemo(() => new THREE.Object3D(), []), v = useMemo(() => new THREE.Vector3(), [])
  const hot = useMemo(() => new THREE.Color('#ff8a3c'), []), cold = useMemo(() => new THREE.Color('#5fb8ff'), []), c = useMemo(() => new THREE.Color(), [])
  useFrame(({ clock }, d) => {
    const dt = Math.min(d, 1 / 30)
    run.current += ((power ? 1 : 0) - run.current) * (1 - Math.exp(-dt / 0.6))
    k.current += dt * 0.035 * run.current
    if (pump.current) pump.current.position.x = -0.5 + Math.sin(clock.elapsedTime * 60) * 0.006 * run.current
    const m = beads.current; if (!m) return
    for (let i = 0; i < N; i++) {
      const u = (k.current + i / N) % 1
      LOOP.curve.getPointAt(u, v); o.position.copy(v)
      // 在冷凝器里越走越“液”，在蒸发器里越走越“气”：颜色从橙到蓝再回来
      const inCond = u >= LOOP.cond[0] && u <= LOOP.cond[1], inEvap = u >= LOOP.evap[0] && u <= LOOP.evap[1]
      c.copy(u > LOOP.cond[0] && u < LOOP.evap[0] ? hot : cold)
      o.scale.setScalar(open > 0.2 || inCond ? (inCond || inEvap ? 1 : 0.7) * (0.3 + 0.7 * run.current) : 0.001); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c)
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  const enamel = <meshPhysicalMaterial color="#e6eaea" roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} />
  const door = (y0: number, y1: number) => (
    <group position={[W / 2, 0, D / 2]} rotation-y={open * 1.85}>
      <RoundedBox args={[W, y1 - y0 - 0.06, 0.26]} radius={0.06} smoothness={3} position={[-W / 2, (y0 + y1) / 2, 0.13]} castShadow>{enamel}</RoundedBox>
      <RoundedBox args={[W - 0.3, y1 - y0 - 0.4, 0.1]} radius={0.04} smoothness={2} position={[-W / 2, (y0 + y1) / 2, -0.04]}><meshStandardMaterial color="#dfe6e8" roughness={0.6} /></RoundedBox>
      <mesh position={[-W + 0.28, (y0 + y1) / 2, 0.34]} castShadow><cylinderGeometry args={[0.05, 0.05, Math.min(2.2, y1 - y0 - 0.8), 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[-W + 0.28, (y0 + y1) / 2 + s * Math.min(1.0, (y1 - y0) / 2 - 0.5), 0.3]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.04, 0.04, 0.1, 10]} /><Metal kind="stainless" /></mesh>)}
    </group>
  )
  return (
    <group position={at}>
      <mesh geometry={BODY} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.25} /></mesh>
      {door(BAY + 0.02, MID - 0.08)}{door(MID + 0.14, H)}
      {/* 冷藏室里的几样东西 */}
      {[[-0.9, 3.33, 0.3, '#74421a'], [-0.3, 3.33, -0.3, '#3f6f96'], [0.7, 5.23, 0.1, '#a9c4c6'], [1.1, 3.33, 0.2, '#b5443a']].map(([x, y, z, col], i) => <mesh key={i} geometry={JAR} position={[x as number, y as number, z as number]} scale={1.5}><meshPhysicalMaterial color={col as string} roughness={0.25} clearcoat={0.6} /></mesh>)}
      {/* 管路和里面流动的制冷剂 */}
      <mesh geometry={LOOP.tube} castShadow><Metal kind="copper" rough={0.4} /></mesh>
      <instancedMesh ref={beads} args={[undefined, undefined, N]} frustumCulled={false}><sphereGeometry args={[0.085, 12, 8]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
      {/* 冷凝器的散热丝：一排细的竖丝压在管子外面 */}
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-1.93, 5.25, -1.2 + i * 0.3]}><boxGeometry args={[0.02, 7.3, 0.02]} /><meshStandardMaterial color="#17191b" roughness={0.6} metalness={0.6} /></mesh>)}
      {/* 压缩机：黑色的铁壳，坐在底下的机舱里 */}
      <mesh ref={pump} geometry={DOME} position={[-0.5, T, 0.5]} castShadow><meshPhysicalMaterial color="#141518" roughness={0.3} metalness={0.2} clearcoat={0.7} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[-0.5 + s * 0.6, T + 0.03, 0.5]}><boxGeometry args={[0.2, 0.06, 0.5]} /><Metal kind="steel" /></mesh>)}
    </group>
  )
}
