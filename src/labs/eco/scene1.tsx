// 生态系统 · 第 1 课的器材：观察桌上的实验盒（纸盒，底上铺一层湿土）、一只装鼠妇的玻璃瓶、遮光板和玻璃板。
// 鼠妇在盒里爬：每只自己挑一个目标点慢慢爬过去，停一停再挑下一个；盖上遮光板以后，按统计的只数，越来越多的鼠妇爬到阴暗的那一边。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { makeGround, shell } from '@/lab-kit'
import { useLouse } from './animals'
import { Glass, ease, rng, type V3 } from './parts'
import { ST, TABLE_H, ground } from './world'

export const BOX = { x: ST.table.x + 0.04, y: ground(ST.table.x, ST.table.z) + TABLE_H, z: ST.table.z - 0.02, w: 0.36, d: 0.22, h: 0.07 }
export const JAR: V3 = [BOX.x - 0.33, BOX.y, BOX.z + 0.05]
const SOIL = 0.016

/** 一只鼠妇：在盒子里自己爬 */
interface Bug { x: number; z: number; a: number; tx: number; tz: number; wait: number; v: number }
function Lice({ placed, dark, n }: { placed: number; dark: number; n: number }) {
  const geo = useLouse()
  const refs = useRef<(THREE.Group | null)[]>([])
  const bugs = useMemo<Bug[]>(() => { const r = rng(5); return Array.from({ length: n }, (_, i) => ({ x: (r() - 0.5) * 0.06, z: (r() - 0.5) * 0.06, a: r() * 6.28, tx: (i % 2 ? -1 : 1) * 0.08, tz: (r() - 0.5) * 0.14, wait: 0, v: 0.028 + r() * 0.012 })) }, [n])
  const r = useMemo(() => rng(9), [])
  useFrame((_, dtRaw) => {
    const dt = Math.min(1 / 20, dtRaw)
    bugs.forEach((b, i) => {
      const wantDark = i < dark, inBox = placed >= 1
      const pick = () => { const side = wantDark ? -1 : 1; b.tx = side * (0.025 + r() * 0.13); b.tz = (r() - 0.5) * 0.17 }
      if (inBox) {
        if ((b.tx < 0) !== wantDark) pick()
        const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz)
        if (b.wait > 0) b.wait -= dt
        else if (d < 0.006) { b.wait = 0.4 + r() * 1.6; pick() }
        else { const want = Math.atan2(dz, dx); let da = want - b.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; b.a += Math.max(-3 * dt, Math.min(3 * dt, da)); const s = b.v * dt * Math.max(0, Math.cos(da)); b.x += Math.cos(b.a) * s; b.z += Math.sin(b.a) * s }
        b.x = Math.max(-0.17, Math.min(0.17, b.x)); b.z = Math.max(-0.1, Math.min(0.1, b.z))
      }
      const g = refs.current[i]; if (!g) return
      if (!inBox) {
        // 还在瓶里：堆在瓶底；倒进盒子的过程中沿一条弧线落下
        const jr = rng(i * 7 + 1), jx = (jr() - 0.5) * 0.04, jz = (jr() - 0.5) * 0.04, k = ease(placed)
        const from = new THREE.Vector3(JAR[0] + jx, JAR[1] + 0.012 + (i % 3) * 0.006, JAR[2] + jz), to = new THREE.Vector3(BOX.x + b.x, BOX.y + SOIL + 0.002, BOX.z + b.z)
        g.position.lerpVectors(from, to, k); g.position.y += Math.sin(k * Math.PI) * 0.12
        g.rotation.set(0, -b.a + i, 0)
      } else { g.position.set(BOX.x + b.x, BOX.y + SOIL + 0.0015, BOX.z + b.z); g.rotation.set(0, -b.a, 0) }
    })
  })
  if (!geo) return null
  return <>{bugs.map((_, i) => <group key={i} ref={e => { refs.current[i] = e }}><mesh geometry={geo[0]} castShadow scale={1.5}><meshPhysicalMaterial vertexColors roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.4} envMapIntensity={0.5} /></mesh></group>)}</>
}

/** 纸盒：四面纸板墙（有厚度、上沿翻边），底上一层湿土 */
function Box() {
  const card = useMemo(() => { const t = makeGround('#a98a5e', '150,122,84', '182,156,116', 21); t.repeat.set(4, 1); return t }, [])
  const soil = useMemo(() => { const t = makeGround('#3e3024', '42,30,22', '96,76,56', 4); t.repeat.set(2, 1.2); return t }, [])
  const { w, d, h } = BOX, t = 0.004
  return (
    <group position={[BOX.x, BOX.y, BOX.z]}>
      <mesh position={[0, 0.002, 0]} receiveShadow castShadow><boxGeometry args={[w + t * 2, 0.004, d + t * 2]} /><meshStandardMaterial map={card} roughness={0.95} /></mesh>
      {([[0, d / 2 + t / 2, w + t * 2, 0], [0, -d / 2 - t / 2, w + t * 2, 0], [w / 2 + t / 2, 0, d, 1], [-w / 2 - t / 2, 0, d, 1]] as [number, number, number, number][]).map(([x, z, L, rot], i) => (
        <mesh key={i} position={[x, h / 2, z]} rotation-y={rot ? Math.PI / 2 : 0} castShadow receiveShadow><boxGeometry args={[L, h, t]} /><meshStandardMaterial map={card} roughness={0.95} /></mesh>
      ))}
      <mesh position={[0, SOIL / 2 + 0.003, 0]} receiveShadow><boxGeometry args={[w - 0.002, SOIL, d - 0.002]} /><meshStandardMaterial map={soil} roughness={0.75} color="#9a8c80" /></mesh>
      {/* 中线：铅笔画的一道 */}
      <mesh position={[0, SOIL + 0.0035, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.0015, d - 0.01]} /><meshBasicMaterial color="#d9d2c0" transparent opacity={0.5} /></mesh>
    </group>
  )
}

/** 瓶子：有壁厚的玻璃瓶，木塞 */
const JAR_GEO = shell([[0, 0], [0.04, 0], [0.043, 0.006], [0.043, 0.09], [0.036, 0.1], [0.034, 0.112]], 0.0025, { segs: 40 })
function Jar() {
  return (
    <group position={JAR}>
      <mesh geometry={JAR_GEO} renderOrder={5}><Glass opacity={0.18} /></mesh>
      <mesh position={[0, 0.118, 0]} castShadow><cylinderGeometry args={[0.032, 0.03, 0.022, 20]} /><meshStandardMaterial color="#b58a5a" roughness={0.9} /></mesh>
      <mesh position={[0, 0.006, 0]}><cylinderGeometry args={[0.038, 0.038, 0.008, 24]} /><meshStandardMaterial color="#4a3a2a" roughness={1} /></mesh>
    </group>
  )
}

export default function Scene1({ placed, cover, dark }: { placed: number; cover: number; dark: number }) {
  const card = useMemo(() => { const t = makeGround('#6b5236', '80,60,40', '120,96,66', 2); t.repeat.set(1, 1); return t }, [])
  const k = ease(cover), lift = (1 - k) * 0.16
  return (
    <group>
      <Box />
      <Jar />
      <Lice placed={placed} dark={dark} n={10} />
      {/* 遮光板（左半边）和玻璃板（右半边）：从上面放下来。遮光板画成半透明，方便看到下面的鼠妇 */}
      {cover > 0.001 && <group position={[BOX.x, BOX.y + BOX.h + 0.003 + lift, BOX.z]}>
        <RoundedBox args={[BOX.w / 2 + 0.004, 0.004, BOX.d + 0.012]} radius={0.0015} position={[-BOX.w / 4 - 0.002, 0, 0]} castShadow renderOrder={6}>
          <meshStandardMaterial map={card} color="#8a7a68" roughness={0.9} transparent opacity={0.8} depthWrite={false} />
        </RoundedBox>
        <mesh position={[BOX.w / 4 + 0.002, 0, 0]} renderOrder={6}><boxGeometry args={[BOX.w / 2 + 0.004, 0.004, BOX.d + 0.012]} /><Glass opacity={0.06} color="#e8f0f0" env={0.5} /></mesh>
      </group>}
      {/* 阴影：遮光板投下的那块暗区，加深一点 */}
      {cover > 0.5 && <mesh position={[BOX.x - BOX.w / 4, BOX.y + SOIL + 0.0045, BOX.z]} rotation-x={-Math.PI / 2}><planeGeometry args={[BOX.w / 2 - 0.004, BOX.d - 0.004]} /><meshBasicMaterial color="#000" transparent opacity={0.5 * ease((cover - 0.5) * 2)} depthWrite={false} /></mesh>}
    </group>
  )
}
