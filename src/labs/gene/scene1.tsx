// 遗传和变异 · 第 1 课的器材：两根量株高的标尺、样品台上的两只豆荚（圆粒、皱粒）、插在小玻璃瓶里的两枝花（紫花、白花）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { shell } from '@/lab-kit'
import { Flesh, Glass, LeafMat, fuse, lerp, place, tube, type V3 } from './parts'
import { OpenPod, PETAL, podGeo, type FlowerColor } from './pea'
import { leafGeo } from './parts'
import { HEIGHT } from './physics'
import { BED, SPOTS, TABLE1 } from './world'

/** 标尺：红白相间，每 10 cm 一格，每米一个数 */
function staffTex(m: number) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64 * m * 10
  const g = c.getContext('2d')!; g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 64, c.height)
  for (let i = 0; i < m * 10; i++) if (i % 2 === 0) { g.fillStyle = '#c8372d'; g.fillRect(0, c.height - (i + 1) * 64, 64, 64) }
  g.fillStyle = '#1d2327'; g.font = '700 40px ui-monospace, Menlo, monospace'; g.textAlign = 'center'
  for (let k = 1; k < m; k++) { g.fillStyle = '#1d2327'; g.fillRect(0, c.height - k * 640 - 3, 64, 6) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
function Staff({ at, m }: { at: V3; m: number }) {
  const tex = useMemo(() => staffTex(m), [m])
  return <group position={at}>
    <mesh position={[0, m * 5, 0]} castShadow><boxGeometry args={[0.4, m * 10, 0.12]} /><meshStandardMaterial map={tex} roughness={0.6} /></mesh>
    <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.25, 0.3, 0.2, 12]} /><meshStandardMaterial color="#333" roughness={0.7} /></mesh>
  </group>
}
/** 两株要量的豌豆：每畦中间那一株 */
export const MEASURE = { tall: SPOTS.tall[18], short: SPOTS.short[1] }
export const STAFF_AT = { tall: [MEASURE.tall.x + 0.6, 1.8, BED.tall.z - 1.5] as V3, short: [MEASURE.short.x - 0.6, 1.8, BED.short.z - 1.5] as V3 }

/** 一枝花：一小截茎，一对托叶，两朵花（放大了画） */
function Sprig({ color }: { color: FlowerColor }) {
  const g = useMemo(() => {
    const P = PETAL[color], body: THREE.BufferGeometry[] = [], pet: THREE.BufferGeometry[] = []
    body.push(tube([[0, -0.6, 0], [0.02, 0.4, 0], [-0.02, 1.2, 0]], 0.03, 0.022, '#7d9f64', '#9cc07a', 6, 10))
    const st = leafGeo({ len: 0.4, wid: 0.34, basePow: 0.42, tipPow: 0.75, curl: 0.08, fold: 0.08, base: '#4b8058', tip: '#75a477', back: '#a4c3a1', nu: 6, nv: 2 })
    for (const s of [-1, 1]) pet.push(place(st.clone(), [0, 0.5, 0], s * 0.9, -0.4, 1, s * 0.3))
    body.push(tube([[0, 0.9, 0], [0.18, 1.1, 0.05], [0.3, 1.3, 0.05]], 0.012, 0.01, '#86a96a', '#9cbf7c', 4, 6))
    const banner = leafGeo({ len: 0.22, wid: 0.27, basePow: 1.5, tipPow: 0.5, curl: -0.35, fold: 0.2, base: P.banner[0], tip: P.banner[1], back: P.banner[0], nu: 7, nv: 3 })
    const wing = leafGeo({ len: 0.17, wid: 0.1, basePow: 1.1, tipPow: 0.6, curl: 0.1, fold: 0, cup: 0.45, base: P.wing[0], tip: P.wing[1], back: P.wing[0], nu: 5, nv: 2 })
    const keel = leafGeo({ len: 0.15, wid: 0.08, basePow: 1, tipPow: 0.7, curl: -0.3, cup: 0.8, base: P.keel[0], tip: P.keel[1], back: P.keel[0], nu: 5, nv: 2 })
    for (const [x, y, yaw] of [[0.3, 1.3, 0.3], [0.1, 1.15, -0.6]] as V3[]) {
      pet.push(place(banner.clone(), [x, y + 0.02, 0], yaw, -1.25))
      for (const s of [-1, 1]) pet.push(place(wing.clone(), [x + s * 0.03, y + 0.015, 0], yaw + s * 0.3, -0.05, 1, s * 0.5))
      for (const s of [-1, 1]) pet.push(place(keel.clone(), [x + s * 0.008, y, 0], yaw, 0, 1, s * 1.4))
    }
    return { body: fuse(body), pet: fuse(pet) }
  }, [color])
  return <group>
    <mesh geometry={g.body} castShadow><Flesh rough={0.55} /></mesh>
    <mesh geometry={g.pet} castShadow><LeafMat petal rough={0.5} /></mesh>
  </group>
}
const VIAL = shell([[0, 0], [0.22, 0], [0.24, 0.03], [0.24, 0.62], [0.16, 0.74], [0.16, 0.86]], 0.025, { segs: 28 })

/** 样品台上的东西。open：豆荚打开了多少（0–1） */
export function TableSamples({ open }: { open: number }) {
  const closed = useMemo(() => podGeo(1, 0.21, 0.14, 6), [])
  const round = useMemo(() => Array.from({ length: 6 }, () => true), []), wrinkled = useMemo(() => Array.from({ length: 6 }, () => false), [])
  const y = TABLE1.h
  return <group position={[TABLE1.x, y, TABLE1.z]}>
    {/* 两只豆荚：先合着，按“比一比”时剥开 */}
    {[-1, 1].map(s => <group key={s} position={[s * 1.4 - 0.75, 0.0, 0.6]} rotation-y={0.06 * s}>
      {open < 0.5 ? <mesh geometry={closed} position={[0, 0.1, 0]} rotation-x={lerp(0, 1.2, open * 2)} scale={1.5} castShadow><Flesh rough={0.5} /></mesh>
        : <OpenPod round={s < 0 ? round : wrinkled} len={1.5} />}
    </group>)}
    {/* 两只小玻璃瓶，各插一枝花 */}
    {(['purple', 'white'] as FlowerColor[]).map((c, i) => <group key={c} position={[(i ? 1 : -1) * 1.3, 0, -0.75]}>
      <mesh geometry={VIAL} castShadow><Glass opacity={0.22} /></mesh>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.2, 0.2, 0.5, 20]} /><meshPhysicalMaterial color="#cfe6ee" transparent opacity={0.35} roughness={0.05} depthWrite={false} /></mesh>
      <group position={[0, 0.7, 0]} scale={1.05} rotation-y={i ? -0.4 : 0.4}><Sprig color={c} /></group>
    </group>)}
  </group>
}
export function Staffs({ on }: { on: number }) {
  return on > 0.01 ? <>
    <Staff at={STAFF_AT.tall} m={HEIGHT.tall} />
    <Staff at={STAFF_AT.short} m={1} />
  </> : null
}
