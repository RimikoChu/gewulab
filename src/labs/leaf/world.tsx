// 光合作用和呼吸作用实验室的大场景：一座玻璃蔬菜大棚。中间一条长实验台，各课的器材沿着它排开；两边是菜畦。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着实验台飞过去。各课的位置写在 ST 里。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, makeGround, mergeParts, useConcrete, type Part } from '@/lab-kit'

/** 各课在实验台上的位置（x 坐标），和台面的高度 */
export const ST = { one: -18, two: -12, three: -6, four: 0, five: 6, six: 12 }
export const TOP = 0.9
const X0 = -23, X1 = 17, HALF = 8, EAVE = 3.2, RIDGE = 5.6
/** 大棚里要跟着课变的东西：补光灯开没开、有没有气肥钢瓶、天窗开没开 */
export interface Want { lamps?: boolean; tank?: boolean; vent?: boolean }

function Frame() {
  const geo = useMemo(() => {
    const parts: Part[] = [], steel = '#c9d1d4'
    const slope = Math.hypot(HALF, RIDGE - EAVE), ang = Math.atan2(RIDGE - EAVE, HALF)
    for (let x = X0; x <= X1 + 0.01; x += 4) {
      for (const s of [-1, 1]) {
        parts.push({ p: [x, EAVE / 2, s * HALF], s: [0.1, EAVE, 0.1], c: steel })
        parts.push({ p: [x, (EAVE + RIDGE) / 2, s * HALF / 2], s: [0.08, 0.08, slope], c: steel, r: [s * ang, 0, 0] })
      }
    }
    for (const z of [-HALF, 0, HALF]) parts.push({ p: [(X0 + X1) / 2, z ? EAVE : RIDGE, z], s: [X1 - X0, 0.09, 0.09], c: steel })
    // 玻璃之间的窗棂：侧墙上一道腰线和每米一根竖棂，屋面上每米一根椽条；墙脚一圈矮墙
    for (const s of [-1, 1]) {
      parts.push({ p: [(X0 + X1) / 2, EAVE * 0.5, s * HALF], s: [X1 - X0, 0.04, 0.04], c: steel }); parts.push({ p: [(X0 + X1) / 2, 0.2, s * HALF], s: [X1 - X0 + 0.2, 0.4, 0.16], c: '#b9b6ad' })
      for (let x = X0 + 1; x < X1; x += 1) { if ((x - X0) % 4 === 0) continue; parts.push({ p: [x, EAVE / 2 + 0.2, s * HALF], s: [0.035, EAVE - 0.4, 0.035], c: steel }); parts.push({ p: [x, (EAVE + RIDGE) / 2, s * HALF / 2], s: [0.03, 0.03, slope], c: steel, r: [s * ang, 0, 0] }) }
      parts.push({ p: [(X0 + X1) / 2, (EAVE + RIDGE) / 2, s * HALF / 2], s: [X1 - X0, 0.03, 0.03], c: steel })
    }
    // 两头的山墙：立柱和横梁
    for (const x of [X0, X1]) { for (const z of [-4, 0, 4]) parts.push({ p: [x, (z ? EAVE + (RIDGE - EAVE) * 0.5 : RIDGE) / 2, z], s: [0.08, z ? EAVE + (RIDGE - EAVE) * 0.5 : RIDGE, 0.08], c: steel }); parts.push({ p: [x, EAVE, 0], s: [0.08, 0.08, HALF * 2], c: steel }); parts.push({ p: [x, 0.2, 0], s: [0.16, 0.4, HALF * 2], c: '#b9b6ad' }) }
    // 实验台：台面、挡板、台腿
    parts.push({ p: [(X0 + X1) / 2 + 0.5, TOP - 0.03, 0], s: [X1 - X0 - 3, 0.06, 1.3], c: '#39464b' })
    parts.push({ p: [(X0 + X1) / 2 + 0.5, TOP - 0.16, 0], s: [X1 - X0 - 3.2, 0.2, 1.16], c: '#8f989c' })
    for (let x = X0 + 2.2; x <= X1 - 0.5; x += 3) for (const z of [-0.52, 0.52]) parts.push({ p: [x, (TOP - 0.06) / 2, z], s: [0.07, TOP - 0.06, 0.07], c: '#6d767b' })
    // 菜畦：两边各两条土垄
    for (const z of [-6, -3.6, 3.6, 6]) { parts.push({ p: [(X0 + X1) / 2, 0.11, z], s: [X1 - X0 - 2, 0.22, 1.5], c: '#4f3a2a' }); for (const k of [-0.78, 0.78]) parts.push({ p: [(X0 + X1) / 2, 0.13, z + k], s: [X1 - X0 - 1.9, 0.26, 0.05], c: '#8a7458' }) }
    // 实验台底下一层搁板和横撑
    parts.push({ p: [(X0 + X1) / 2 + 0.5, 0.25, 0], s: [X1 - X0 - 3.4, 0.03, 0.9], c: '#7d868a' })
    return mergeParts(parts)
  }, [])
  return <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.15} /></mesh>
}

/** 菜畦上的菜：一棵是几片叶子攒成的一团，用实例化画几百棵 */
function Crops() {
  const { mesh } = useMemo(() => {
    // 一棵菜：一圈向外摊开的叶片围着中间抱起来的菜心
    const leaves: THREE.BufferGeometry[] = []
    for (let i = 0; i < 9; i++) { const g = new THREE.SphereGeometry(1, 8, 6); g.scale(0.16, 0.03, 0.1); g.translate(0.13, 0, 0); g.rotateZ(0.35 + (i % 3) * 0.18); g.rotateY(i * 0.7 + (i > 5 ? 0.35 : 0)); g.translate(0, i > 5 ? 0.05 : 0, 0); leaves.push(g) }
    const heart = new THREE.SphereGeometry(0.1, 8, 6); heart.scale(1, 0.9, 1); heart.translate(0, 0.07, 0); leaves.push(heart)
    const geo = mergeGeometries(leaves), mat = new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true })
    const spots: [number, number][] = []
    for (const z of [-6, -3.6, 3.6, 6]) for (let x = X0 + 1.6; x <= X1 - 1.4; x += 0.72) for (const dz of [-0.36, 0.36]) spots.push([x, z + dz])
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color()
    spots.forEach(([x, z], i) => {
      const k = Math.sin(i * 12.9898) * 43758.5453, r = k - Math.floor(k)
      q.setFromEuler(new THREE.Euler(0, r * 6.28, 0)); m.compose(new THREE.Vector3(x, 0.25 + r * 0.03, z), q, new THREE.Vector3(1.25 + r * 0.4, 1.2 + r * 0.4, 1.25 + r * 0.4)); mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, col.setHSL(0.3 + r * 0.05, 0.5, 0.3 + r * 0.1))
    })
    mesh.castShadow = true; mesh.receiveShadow = true
    return { mesh }
  }, [])
  return <primitive object={mesh} />
}

export function World({ want = {} }: { want?: Want }) {
  const [d, n, r] = useConcrete(30, 12)
  const len = X1 - X0, slope = Math.hypot(HALF, RIDGE - EAVE), ang = Math.atan2(RIDGE - EAVE, HALF)
  const glass = <meshPhysicalMaterial color="#d8eef2" transparent opacity={0.1} roughness={0.04} clearcoat={1} envMapIntensity={1.6} side={THREE.DoubleSide} depthWrite={false} />
  const grass = useMemo(() => { const t = makeGround('#718858', '86,112,66', '150,160,104'); t.repeat.set(90, 90); return t }, [])
  const soil = useMemo(() => { const t = makeGround('#6b5440', '70,52,36', '134,108,82', 3); t.repeat.set(10, 4); return t }, [])
  return (
    <group>
      {/* 棚外的地、棚里的土、实验台下面的一条水泥路 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[600, 600]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0, 0]} receiveShadow><planeGeometry args={[len + 1, HALF * 2 + 1]} /><meshStandardMaterial map={soil} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0.01, 0]} receiveShadow><planeGeometry args={[len, 4.4]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#c3c1b8" /></mesh>
      <Frame />
      <Crops />
      {/* 玻璃：两面坡的棚顶和两道侧墙 */}
      {[-1, 1].map(s => <mesh key={s} position={[(X0 + X1) / 2, (EAVE + RIDGE) / 2, s * HALF / 2]} rotation-x={s * ang + Math.PI / 2}><planeGeometry args={[len, slope]} />{glass}</mesh>)}
      {[-1, 1].map(s => <mesh key={s} position={[(X0 + X1) / 2, EAVE / 2, s * HALF]}><planeGeometry args={[len, EAVE]} />{glass}</mesh>)}
      {/* 第 7 课的三样设备 */}
      {[-14, -6, 2, 10].map(x => [-4.8, 4.8].map(z => (
        <group key={`${x}|${z}`} position={[x, EAVE - 0.25, z]}>
          <mesh><boxGeometry args={[2.4, 0.08, 0.28]} /><meshStandardMaterial color="#3a3f45" metalness={0.4} roughness={0.5} /></mesh>
          <mesh position={[0, -0.045, 0]}><boxGeometry args={[2.3, 0.02, 0.2]} /><meshBasicMaterial color={want.lamps ? '#ffd9f0' : '#555a60'} toneMapped={false} /></mesh>
          {want.lamps && <pointLight position={[0, -0.3, 0]} intensity={5} distance={7} decay={1.4} color="#ffd0ee" />}
        </group>
      )))}
      {want.tank && <group position={[-20.5, 0, 2.2]}>
        <mesh position={[0, 0.75, 0]} castShadow><capsuleGeometry args={[0.2, 1.1, 8, 24]} /><meshPhysicalMaterial color="#8c9499" metalness={0.8} roughness={0.3} clearcoat={0.4} /></mesh>
        <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.203, 0.203, 0.3, 24]} /><meshStandardMaterial color="#e9e6dc" roughness={0.6} /></mesh>
        <mesh position={[0, 1.56, 0]}><cylinderGeometry args={[0.06, 0.12, 0.14, 12]} /><meshStandardMaterial color="#30353a" metalness={0.6} roughness={0.4} /></mesh>
      </group>}
      {want.vent && <mesh position={[-3, RIDGE - 0.35, 1.6]} rotation-x={ang + Math.PI / 2 - 0.5}><planeGeometry args={[8, 1.6]} /><meshStandardMaterial color="#bfe4ff" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
    </group>
  )
}
