// 光合作用和呼吸作用实验室的大场景：一座玻璃蔬菜大棚。中间一条长实验台，各课的器材沿着它排开；两边是菜畦。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着实验台飞过去。各课的位置写在 ST 里。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, useConcrete, type Part } from '@/lab-kit'

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
    // 实验台：台面、挡板、台腿
    parts.push({ p: [(X0 + X1) / 2 + 0.5, TOP - 0.03, 0], s: [X1 - X0 - 3, 0.06, 1.3], c: '#39464b' })
    parts.push({ p: [(X0 + X1) / 2 + 0.5, TOP - 0.16, 0], s: [X1 - X0 - 3.2, 0.2, 1.16], c: '#8f989c' })
    for (let x = X0 + 2.2; x <= X1 - 0.5; x += 3) for (const z of [-0.52, 0.52]) parts.push({ p: [x, (TOP - 0.06) / 2, z], s: [0.07, TOP - 0.06, 0.07], c: '#6d767b' })
    // 菜畦：两边各两条土垄
    for (const z of [-6, -3.6, 3.6, 6]) parts.push({ p: [(X0 + X1) / 2, 0.11, z], s: [X1 - X0 - 2, 0.22, 1.5], c: '#5a4230' })
    return mergeParts(parts)
  }, [])
  return <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.15} /></mesh>
}

/** 菜畦上的菜：一棵是几片叶子攒成的一团，用实例化画几百棵 */
function Crops() {
  const { mesh } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.24, 0), mat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true })
    const spots: [number, number][] = []
    for (const z of [-6, -3.6, 3.6, 6]) for (let x = X0 + 1.6; x <= X1 - 1.4; x += 0.72) for (const dz of [-0.36, 0.36]) spots.push([x, z + dz])
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color()
    spots.forEach(([x, z], i) => {
      const k = Math.sin(i * 12.9898) * 43758.5453, r = k - Math.floor(k)
      q.setFromEuler(new THREE.Euler(0, r * 6.28, 0)); m.compose(new THREE.Vector3(x, 0.36 + r * 0.05, z), q, new THREE.Vector3(1 + r * 0.3, 0.75 + r * 0.25, 1 + r * 0.3)); mesh.setMatrixAt(i, m)
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
  const glass = <meshStandardMaterial color="#d8eef2" transparent opacity={0.1} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
  return (
    <group>
      {/* 棚外的地、棚里的土、实验台下面的一条水泥路 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[600, 600]} /><meshStandardMaterial color="#6f8457" roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0, 0]} receiveShadow><planeGeometry args={[len + 1, HALF * 2 + 1]} /><meshStandardMaterial color="#6b5440" roughness={1} /></mesh>
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
        <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 1.5, 20]} /><meshStandardMaterial color="#8c9499" metalness={0.7} roughness={0.35} /></mesh>
        <mesh position={[0, 1.56, 0]}><cylinderGeometry args={[0.06, 0.12, 0.14, 12]} /><meshStandardMaterial color="#30353a" metalness={0.6} roughness={0.4} /></mesh>
      </group>}
      {want.vent && <mesh position={[-3, RIDGE - 0.35, 1.6]} rotation-x={ang + Math.PI / 2 - 0.5}><planeGeometry args={[8, 1.6]} /><meshStandardMaterial color="#bfe4ff" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
    </group>
  )
}
