// 第 2 课的主角：管式裂解炉。箱式的辐射室架在钢柱上，朝镜头的一面炉墙可以拿掉：里面是一排竖着的炉管（U 形，下面是回弯头）、
// 炉底两排火嘴、耐火砖衬里。炉顶是对流室、急冷换热器和汽包，一头是烟囱；旁边一座急冷塔。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, lathe, mergeParts, shell, type Part } from '@/lab-kit'
import { Brick, Concrete, Flame, Jacket, Paint } from './look'
import { gratingTex, rep } from './mats'
import { beam, box, cyl, deckGeo, ladderParts, pipeGeo, platformParts, railParts, vesselPts, type V3 } from './parts'

/** 裂解炉：中心；辐射室的宽（x）、深（z）、上下沿 */
export const CK = { x: 40, z: -8, w: 13, d: 5.4, y0: 2.6, y1: 13.6 }
/** 急冷塔相对炉子的位置 */
const QT = { x: 12.5, z: -0.5, r: 1.25, y0: 3.2, y1: 19 }
/** 炉管：根数、间距 */
const TUBES = 24, PITCH = 0.5
const tubeX = (i: number) => -(TUBES - 1) * PITCH / 2 + i * PITCH
/** 物料在炉里走的路（世界坐标）：进对流室，下到一根炉管，从回弯头折回来，上去进急冷换热器，再去急冷塔 */
export const COIL_PATH: V3[] = (() => { const x = CK.x + tubeX(12), x2 = CK.x + tubeX(13), z = CK.z; return [[CK.x - 9, 9.5, z - 9], [CK.x - 9, 17, z - 4], [CK.x - 6.5, 17, z], [x, 17, z], [x, 3.6, z], [x2, 3.6, z], [x2, 14.4, z], [x2, 15, z + 2.0], [x2, 20.2, z + 2.0], [x2, 20.6, z + 2.9], [CK.x + 8.3, 20.6, z + 2.9], [CK.x + 8.3, 4.2, z + 2.9], [CK.x + QT.x - QT.r, 4.2, z + QT.z]] as V3[] })()
/** 放大窗指着的那一段炉管 */
export const COIL_POINT: V3 = [CK.x + tubeX(13), 8, CK.z]

export function Cracker({ cut = false, heat = 0 }: { cut?: boolean; heat?: number }) {
  const { w, d, y0, y1 } = CK, hw = w / 2, hd = d / 2, H = y1 - y0
  const grate = useMemo(() => rep(gratingTex(), 14, 1.2), [])
  const geo = useMemo(() => {
    const st: Part[] = [], lining: Part[] = [], front: Part[] = [], frontLining: Part[] = []
    const steel = '#a2a9ad', dark = '#5d6468'
    // 钢柱和基础、柱间斜撑
    for (const x of [-6.3, -2.1, 2.1, 6.3]) for (const z of [-2.5, 2.5]) st.push(box(x, 0, z, 0.36, y0 - 0.3, 0.36, dark), box(x, 0, z, 0.9, 0.35, 0.9, '#a5a39b'))
    for (const x of [-4.2, 4.2]) st.push(beam([x - 2.1, 0.4, -2.5], [x + 2.1, y0 - 0.4, -2.5], 0.14, dark), beam([x + 2.1, 0.4, -2.5], [x - 2.1, y0 - 0.4, -2.5], 0.14, dark))
    // 炉底、后墙、两侧墙、炉顶：外面一层钢板，里面一层耐火砖
    st.push(box(0, y0 - 0.3, 0, w + 0.2, 0.3, d + 0.2, dark))
    lining.push(box(0, y0, 0, w - 0.1, 0.22, d - 0.1, '#ffffff'), box(0, y0, -hd + 0.2, w - 0.1, H, 0.32, '#ffffff'), box(-hw + 0.2, y0, 0, 0.32, H, d - 0.1, '#ffffff'), box(hw - 0.2, y0, 0, 0.32, H, d - 0.1, '#ffffff'), box(0, y1 - 0.3, 0, w - 0.1, 0.3, d - 0.1, '#ffffff'))
    st.push(box(0, y0, -hd, w + 0.1, H, 0.07, steel), box(-hw, y0, 0, 0.07, H, d, steel), box(hw, y0, 0, 0.07, H, d, steel), box(0, y1, 0, w + 0.3, 0.1, d + 0.3, steel))
    // 炉墙外面的立柱和圈梁
    for (let x = -hw; x <= hw + 0.01; x += w / 6) st.push(box(x, y0, -hd - 0.16, 0.24, H, 0.26, dark))
    for (const z of [-1.4, 1.4]) for (const x of [-hw - 0.16, hw + 0.16]) st.push(box(x, y0, z, 0.26, H, 0.24, dark))
    for (const y of [5.2, 8.2, 11.2]) st.push(box(0, y, -hd - 0.14, w + 0.4, 0.2, 0.16, dark), box(-hw - 0.14, y, 0, 0.16, 0.2, d + 0.3, dark), box(hw + 0.14, y, 0, 0.16, 0.2, d + 0.3, dark))
    // 朝镜头的那面炉墙：钢板、立柱、圈梁、看火门、半腰的走道
    front.push(box(0, y0, hd, w + 0.1, H, 0.07, steel))
    frontLining.push(box(0, y0, hd - 0.2, w - 0.1, H, 0.32, '#ffffff'))
    for (let x = -hw; x <= hw + 0.01; x += w / 6) front.push(box(x, y0, hd + 0.16, 0.24, H, 0.26, dark))
    for (const y of [5.2, 8.2, 11.2]) front.push(box(0, y, hd + 0.14, w + 0.4, 0.2, 0.16, dark))
    for (let x = -5.4; x <= 5.5; x += w / 6) for (const y of [4, 9.4]) front.push(box(x, y, hd + 0.06, 0.5, 0.36, 0.1, '#3d4246'), box(x + 0.32, y + 0.1, hd + 0.1, 0.06, 0.16, 0.06, '#b08a2e'))
    front.push(box(0, 7.6, hd + 0.75, w + 0.4, 0.06, 1.0, '#70767a'), ...railParts([-hw - 0.2, 7.66, hd + 1.25], [hw + 0.2, 7.66, hd + 1.25]))
    for (let x = -hw; x <= hw + 0.01; x += w / 6) front.push(beam([x, 6.6, hd + 0.3], [x, 7.6, hd + 1.2], 0.08, dark))
    // 炉底的火嘴：炉底下面露出的一截、燃料气总管和支管
    const burners: V3[] = []
    for (const z of [-1.55, 1.55]) for (let x = -5; x <= 5.01; x += 2) { burners.push([x, y0 + 0.22, z]); st.push(cyl(x, y0 - 1.0, z, 0.3, 0.7, '#3d4246'), cyl(x, y0 - 1.2, z, 0.12, 0.2, '#b08a2e'), box(x, y0 - 1.5, z, 0.08, 0.5, 0.08, '#d9a51c')) }
    for (const z of [-1.55, 1.55]) st.push({ p: [0, y0 - 1.55, z], s: [0.09, w - 1.5, 0.09], c: '#d9a51c', cyl: true, r: [0, 0, Math.PI / 2] })
    const tiles = mergeParts(burners.map(b => cyl(b[0], b[1] - 0.02, b[2], 0.34, 0.1, '#8a7a66')))
    // 对流室（炉顶上的长箱子）：加强筋、两头的管箱和一排排管堵
    st.push(box(0, y1 + 0.1, 0, w, 6.3, 2.6, steel), box(0, y1 + 6.4, 0, w + 0.2, 0.12, 2.8, dark))
    for (let x = -hw; x <= hw + 0.01; x += w / 6) for (const z of [-1.36, 1.36]) st.push(box(x, y1 + 0.1, z, 0.2, 6.3, 0.14, dark))
    for (const s of [-1, 1]) { st.push(box(s * (hw + 0.3), y1 + 0.5, 0, 0.6, 5.4, 2.2, '#7b8388')); for (let k = 0; k < 8; k++) for (let j = 0; j < 4; j++) st.push({ p: [s * (hw + 0.63), y1 + 1.0 + k * 0.6, -0.75 + j * 0.5], s: [0.09, 0.08, 0.09], c: '#4d5357', cyl: true, r: [0, 0, Math.PI / 2] }) }
    // 烟道和烟囱
    st.push(box(-4.6, y1 + 6.5, 0, 3.2, 1.3, 2.2, '#7b8388'), cyl(-4.6, y1 + 7.8, 0, 1.25, 0.9, '#7b8388'))
    for (const y of [26, 31, 36]) st.push(cyl(-4.6, y, 0, 1.06, 0.1, dark))
    st.push(cyl(-4.6, 39.9, 0, 1.02, 0.2, dark))
    // 汽包的鞍座、急冷换热器的支架
    for (const x of [-2.6, 4.6]) st.push(box(x, y1 + 6.5, 1.0, 0.5, 1.9, 1.2, dark))
    // 炉顶走道的栏杆、右头的直梯
    st.push(...railParts([-hw - 0.1, y1 + 0.1, hd + 0.1], [hw + 0.1, y1 + 0.1, hd + 0.1]), ...railParts([hw + 0.1, y1 + 0.1, -hd], [hw + 0.1, y1 + 0.1, hd + 0.1]), ...railParts([-hw - 0.1, y1 + 0.1, 1.5], [-hw - 0.1, y1 + 0.1, hd + 0.1]), ...ladderParts(hw + 0.3, 0, 0.3, y1 + 0.1))
    // 炉管：竖管加下面的回弯头
    const tubes: THREE.BufferGeometry[] = []
    for (let i = 0; i < TUBES; i++) { const g = new THREE.CylinderGeometry(0.075, 0.075, y1 - y0 - 0.3, 12); g.translate(tubeX(i), (y0 + y1) / 2 + 0.55, 0); tubes.push(g) }
    for (let i = 0; i < TUBES; i += 2) { const g = new THREE.TorusGeometry(PITCH / 2, 0.075, 10, 16, Math.PI); g.rotateZ(Math.PI); g.translate(tubeX(i) + PITCH / 2, y0 + 0.86, 0); tubes.push(g) }
    // 急冷换热器（三台立着的）和汽包
    const tle = lathe([[0, 14.2], [0.2, 14.2], [0.46, 15.2], [0.46, 19.2], [0.56, 19.2], [0.56, 19.36], [0.46, 19.36], [0.4, 19.9], [0.16, 20.1], [0, 20.1]], { segs: 32 })
    const drum = lathe(vesselPts(0.85, -4.5, 4.5, 0.45), { segs: 36 }); drum.rotateZ(Math.PI / 2)
    const stack = shell([[1.2, y1 + 8.6], [1.0, y1 + 10.5], [0.94, 40]], 0.05)
    return { st: mergeParts(st), lining: mergeParts(lining), front: mergeParts(front), frontLining: mergeParts(frontLining), tiles, burners, tubes: mergeGeometries(tubes), tle, drum, stack,
      quench: lathe(vesselPts(QT.r, QT.y0, QT.y1, 0.6), { segs: 40 }), qskirt: shell([[QT.r - 0.05, 0.5], [QT.r - 0.05, QT.y0 + 0.1]], 0.05),
      qplat: mergeParts([...platformParts(QT.r, 9, -0.4, Math.PI * 1.3), ...platformParts(QT.r, 16, 0.4, Math.PI * 1.8), ...ladderParts(QT.r, Math.PI * 1.5, 0.4, 9), ...ladderParts(QT.r, Math.PI * 1.4, 9, 16)]),
      qdecks: [deckGeo(QT.r, 9, -0.4, Math.PI * 1.3), deckGeo(QT.r, 16, 0.4, Math.PI * 1.8)] }
  }, [w, d, y0, y1, hw, hd, H])
  const pipes = useMemo(() => {
    const L = (p: V3[]) => p.map(q => [q[0] - CK.x, q[1], q[2] - CK.z] as V3)
    const risers: V3[][] = [-2.5, 1, 4.5].flatMap(x => [[[x - 0.3, 19.6, 2.0], [x - 0.3, 21.4, 2.0], [x - 0.3, 22.2, 1.4]] as V3[], [[x + 0.3, 15.4, 2.3], [x + 0.9, 15.4, 2.3], [x + 0.9, 21.6, 2.3], [x + 0.9, 22.3, 1.6]] as V3[]])
    return {
      feed: pipeGeo(L(COIL_PATH.slice(0, 3)), 0.2), out: pipeGeo([[-2.5, 20.1, 2.0], [-2.5, 20.6, 2.9], [8.3, 20.6, 2.9], [8.3, 4.2, 2.9], [QT.x - QT.r + 0.05, 4.2, QT.z]], 0.3),
      stubs: [1, 4.5].map(x => pipeGeo([[x, 20.1, 2.0], [x, 20.6, 2.9]], 0.3, 0.3)), risers: risers.map(p => pipeGeo(p, 0.11)),
      qtop: pipeGeo([[QT.x, QT.y1 + 0.5, QT.z], [QT.x, QT.y1 + 1.6, QT.z], [QT.x, QT.y1 + 1.6, -6], [QT.x, 8.4, -6], [QT.x, 8.4, -9]], 0.28),
    }
  }, [])
  const glow = useMemo(() => new THREE.Color('#ff3408').lerp(new THREE.Color('#ff9c34'), Math.max(0, heat * 2 - 1)), [heat])
  const fire = heat > 0 ? 0.5 : 0
  return <group position={[CK.x, 0, CK.z]}>
    <mesh position={[1.5, 0.08, 0]} receiveShadow><boxGeometry args={[w + 12, 0.16, d + 5]} /><Concrete /></mesh>
    <mesh geometry={geo.st} castShadow receiveShadow><Painted rough={0.58} metal={0.3} /></mesh>
    <mesh geometry={geo.lining} receiveShadow><Brick hot={0.4 + heat * 0.12} rx={5} ry={5} /></mesh>
    <group visible={!cut}>
      <mesh geometry={geo.front} castShadow receiveShadow><Painted rough={0.58} metal={0.3} /></mesh>
      <mesh geometry={geo.frontLining}><Brick rx={5} ry={5} /></mesh>
    </group>
    <mesh geometry={geo.tiles}><Painted rough={0.9} metal={0} /></mesh>
    <mesh geometry={geo.tubes} castShadow><meshStandardMaterial color="#6f5a4c" roughness={0.5} metalness={0.6} emissive={glow} emissiveIntensity={0.2 + heat * 0.52} /></mesh>
    {geo.burners.map((b, i) => <Flame key={i} at={b} h={b[2] < 0 ? 6.4 : 2.8} r={b[2] < 0 ? 0.5 : 0.36} on={fire} seed={i} light={i === 2 || i === 9} />)}
    {/* 炉顶：急冷换热器、汽包、上升管和下降管 */}
    {[-2.5, 1, 4.5].map(x => <mesh key={x} geometry={geo.tle} position={[x, 0, 2.0]} castShadow><Jacket rx={2} ry={4} /></mesh>)}
    <mesh geometry={geo.drum} position={[1, y1 + 9.2, 1.0]} castShadow><Jacket rx={3} ry={5} /></mesh>
    {pipes.risers.map((g, i) => <mesh key={i} geometry={g} castShadow><Jacket rx={1} ry={5} /></mesh>)}
    {pipes.stubs.map((g, i) => <mesh key={i} geometry={g} castShadow><Jacket rx={1} ry={2} /></mesh>)}
    <mesh geometry={pipes.out} castShadow><Jacket rx={1} ry={16} /></mesh>
    <mesh geometry={pipes.feed} castShadow><Paint color="#5a5550" /></mesh>
    <mesh geometry={geo.stack} position-x={-4.6} castShadow><Paint color="#9aa1a5" plate rx={2} ry={6} rough={0.6} /></mesh>
    {/* 急冷塔 */}
    <group position={[QT.x, 0, QT.z]}>
      <mesh position-y={0.25} castShadow receiveShadow><cylinderGeometry args={[1.9, 2.0, 0.5, 8]} /><Concrete /></mesh>
      <mesh geometry={geo.qskirt} castShadow><Paint color="#6c7479" plate /></mesh>
      <mesh geometry={geo.quench} castShadow receiveShadow><Jacket rx={2} ry={7} /></mesh>
      <mesh geometry={geo.qplat} castShadow><Painted rough={0.55} metal={0.3} /></mesh>
      {geo.qdecks.map((g, i) => <mesh key={i} geometry={g} castShadow><meshStandardMaterial attach="material-0" map={grate} roughness={0.7} metalness={0.4} /><meshStandardMaterial attach="material-1" color="#4c5257" /></mesh>)}
    </group>
    <mesh geometry={pipes.qtop} castShadow><Jacket rx={1} ry={12} /></mesh>
    <mesh position={[0, y1 + 0.16, hd - 0.55]} receiveShadow><boxGeometry args={[w, 0.05, 1.2]} /><meshStandardMaterial map={grate} roughness={0.7} metalness={0.4} /></mesh>
  </group>
}
