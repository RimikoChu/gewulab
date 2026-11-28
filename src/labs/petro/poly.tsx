// 第 7 课的主角：聚乙烯装置。西边是流化床聚合反应器（上粗下细，套在钢框架里），循环气从顶上出来、经冷却器和压缩机回到底部；
// 东边敞棚下面是挤出造粒线：电机、减速箱、带加热圈的机筒、模头和水下切粒机、离心干燥器、振动筛，最后落进料仓。棚后是两只颗粒料仓。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, Painted, lathe, mergeParts, shell, type Part } from '@/lab-kit'
import { Concrete, Jacket, Paint } from './look'
import { gratingTex, pelletTex, rep, ribTex } from './mats'
import { beam, box, cyl, frameParts, headPts, ladderParts, pipeGeo, vesselPts, type RY, type V3 } from './parts'

/** 反应器的位置；造粒线的 z、各台设备的 x；料仓（接颗粒的敞口斗）的位置 */
export const PE = { x: 112, z: -8, top: 23.6, line: { z: -3, motor: 120.6, gear: 122.2, barrel: [123, 129.6] as [number, number], die: 130, dryer: 133.2, screen: 135.4 }, bin: { x: 138.2, z: -3 } }
/** 乙烯进反应器、粉料出反应器去挤出机料斗 */
export const PE_FEED: V3[] = [[PE.x - 4.4, 8.4, PE.z - 9], [PE.x - 4.4, 8.4, PE.z], [PE.x - 4.4, 2.2, PE.z], [PE.x - 1.2, 2.2, PE.z], [PE.x - 0.6, 4.4, PE.z]]
export const PE_OUT: V3[] = [[PE.x + 1.45, 6.6, PE.z + 0.4], [PE.x + 5, 6.6, PE.z + 0.4], [PE.x + 5, 6.6, PE.line.z], [PE.line.barrel[0] + 0.7, 6.6, PE.line.z], [PE.line.barrel[0] + 0.7, 3.3, PE.line.z]]
/** 颗粒从模头到料仓走的路 */
export const PELLET_PATH: V3[] = [[PE.line.die + 0.5, 1.6, PE.line.z], [PE.line.die + 0.5, 0.5, PE.line.z + 0.9], [PE.line.dryer, 0.5, PE.line.z + 0.9], [PE.line.dryer, 0.6, PE.line.z]]
export const PELLET_FALL: V3[] = [[PE.line.dryer + 0.6, 3.0, PE.line.z], [PE.line.screen - 0.9, 2.05, PE.line.z], [PE.line.screen + 1.0, 1.72, PE.line.z], [PE.bin.x - 0.9, 1.5, PE.line.z], [PE.bin.x - 0.2, 0.7, PE.line.z]]

export function PolyLine({ poly = 0, pellet = 0 }: { poly?: number; pellet?: number }) {
  const L = PE.line
  const tex = useMemo(() => ({ grate: rep(gratingTex(), 8, 8), roof: rep(ribTex('#7f95a8'), 30, 1), heap: rep(pelletTex(), 3, 2) }), [])
  const geo = useMemo(() => {
    const st: Part[] = []
    // 反应器的钢框架：四层平台，背面有斜撑，一侧挂直梯
    st.push(...frameParts([PE.x - 3.3, PE.x + 3.3], [PE.z - 3.3, PE.z + 3.3], [6.2, 12.2, 18.2, 24.2], { deck: false }))
    for (const y of [6.2, 12.2, 18.2, 24.2]) for (const s of [-1, 1]) st.push(box(PE.x, y, PE.z + s * 2.75, 6.6, 0.05, 1.1, '#70767a'), box(PE.x + s * 2.75, y, PE.z, 1.1, 0.05, 4.4, '#70767a'))
    st.push(...ladderParts(3.4, 0, 0.3, 24.2).map(p => ({ ...p, p: [p.p[0] + PE.x, p.p[1], p.p[2] + PE.z] as V3 })))
    st.push(cyl(PE.x, 0, PE.z, 2.4, 0.3, '#a9a59a'))
    // 循环气冷却器的鞍座、压缩机的底座
    for (const dx of [5.4, 7.6]) st.push(box(PE.x + dx, 0, PE.z - 4.6, 0.4, 1.0, 1.2, '#a5a39b'))
    // 造粒线的敞棚：柱子、屋架、屋面下的檩条
    const xs = [118.6, 124.6, 130.6, 136.6], zs = [-6.8, 0.8]
    for (const x of xs) for (const z of zs) if (z < 0 || x === xs[0] || x === xs[3]) st.push(box(x, 0, z, 0.3, 7.2, 0.3, '#5d6468'), box(x, 0, z, 0.7, 0.3, 0.7, '#a5a39b'))
    for (const x of xs) st.push(beam([x, 7.2, zs[0]], [x, 8.3, -3], 0.2, '#5d6468'), beam([x, 8.3, -3], [x, 7.2, zs[1]], 0.2, '#5d6468'), box(x, 7.0, -3, 0.16, 0.16, 7.6, '#5d6468'))
    for (const z of [...zs, -3]) st.push(box(127.6, z === -3 ? 8.25 : 7.1, z, 18.4, 0.16, 0.16, '#5d6468'))
    // 造粒线的设备底座
    st.push(box((L.motor + L.die) / 2 + 0.2, 0, L.z, L.die - L.motor + 2.6, 0.3, 1.8, '#a9a59a'), box(L.dryer, 0, L.z, 2.0, 0.25, 2.0, '#a9a59a'))
    // 机筒下面的支座、减速箱、切粒机的电机支架
    for (const x of [124.4, 126.6, 128.8]) st.push(box(x, 0.3, L.z, 0.3, 1.0, 0.7, '#3b4146'))
    st.push(box(L.gear, 0.3, L.z, 1.5, 1.9, 1.4, '#3f6a55'), box(L.gear, 2.2, L.z, 1.1, 0.12, 1.0, '#34584a'), box(L.motor, 0.3, L.z, 1.5, 0.75, 1.1, '#3b4146'), box(L.die + 1.25, 0.3, L.z, 0.9, 0.95, 0.7, '#3b4146'))
    // 机筒上的加料斗（倒四棱台，用四边形的圆台凑）和它的支腿
    st.push(box(L.barrel[0] + 0.7, 2.05, L.z, 0.5, 0.5, 0.5, '#8f969b'))
    // 振动筛：斜放的筛箱，四角弹簧，下面的机架
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.5, 0.5]) st.push(box(L.screen + dx, 0, L.z + dz, 0.12, 1.2 - dx * 0.1, 0.12, '#3b4146'), cyl(L.screen + dx, 1.2 - dx * 0.1, L.z + dz, 0.08, 0.3, '#d9a51c'))
    st.push({ p: [L.screen, 1.68, L.z], s: [2.2, 0.32, 1.2], c: '#4f6b8a', r: [0, 0, -0.09] }, { p: [L.screen, 1.87, L.z], s: [2.1, 0.03, 1.05], c: '#b9bdc0', r: [0, 0, -0.09] }, { p: [L.screen - 0.2, 1.3, L.z + 0.66], s: [0.5, 0.36, 0.2], c: '#2f5f8a', r: [0, 0, -0.09] })
    // 料仓：敞口的钢斗，四条腿
    const b = PE.bin
    for (const dx of [-1.2, 1.2]) for (const dz of [-1.2, 1.2]) st.push(box(b.x + dx, 0, b.z + dz, 0.14, 1.9, 0.14, '#5d6468'))
    for (const s of [-1, 1]) st.push(box(b.x + s * 1.25, 0.25, b.z, 0.08, 1.65, 2.5, '#6f8196'), box(b.x, 0.25, b.z + s * 1.25, 2.5, 1.65, 0.08, '#6f8196'), box(b.x + s * 1.25, 1.84, b.z, 0.14, 0.1, 2.6, '#5d6468'), box(b.x, 1.84, b.z + s * 1.25, 2.6, 0.1, 0.14, '#5d6468'))
    st.push(box(b.x, 0.2, b.z, 2.5, 0.08, 2.5, '#6f8196'))
    // 颗粒料仓的支腿和连梁
    for (const sx of [128.5, 134.5]) { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; st.push(box(sx + Math.cos(a) * 1.9, 0, -11.5 + Math.sin(a) * 1.9, 0.22, 6.2, 0.22, '#5d6468')) } st.push(cyl(sx, 5.6, -11.5, 2.02, 0.2, '#5d6468')) }
    const reactor = lathe([...headPts(1.5, 4.6, 0.7, -1).reverse(), [1.5, 16.6], [2.5, 19.6], ...headPts(2.5, 22.4, 1.2, 1)] as RY[], { segs: 48 })
    const barrel = lathe([[0, 0], [0.34, 0], [0.34, L.barrel[1] - L.barrel[0]], [0, L.barrel[1] - L.barrel[0]]], { segs: 28 }); barrel.rotateZ(-Math.PI / 2)
    const bands = mergeParts(Array.from({ length: 9 }, (_, i) => ({ p: [L.barrel[0] + 1.3 + i * 0.6, 1.6, L.z] as V3, s: [0.42, 0.44, 0.42] as V3, c: i % 2 ? '#b0763a' : '#9c9084', cyl: true, r: [0, 0, Math.PI / 2] as V3 })))
    const fins = mergeParts(Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2; return { p: [0, Math.cos(a) * 0.56, Math.sin(a) * 0.56] as V3, s: [1.3, 0.04, 0.1] as V3, c: '#2f5f8a', r: [a, 0, 0] as V3 } }))
    const silo = lathe([[0, 6.0], [0.25, 6.0], [1.9, 8.4], [1.9, 21], [0.3, 21.8], [0, 21.8]] as RY[], { segs: 40 })
    const hx = lathe(vesselPts(0.55, -2, 2, 0.3), { segs: 28 }); hx.rotateZ(Math.PI / 2)
    return { st: mergeParts(st), reactor, skirt: shell([[1.45, 0.3], [1.45, 4.7]], 0.05), barrel, bands, fins, silo, hx,
      hopper: new THREE.CylinderGeometry(0.75, 0.2, 1.0, 4, 1, true), dryer: lathe([[0, 0.25], [0.62, 0.25], [0.62, 3.0], [0.4, 3.4], [0, 3.4]], { segs: 32 }),
      heap: lathe([[0, 1], [0.25, 0.9], [0.7, 0.45], [1.0, 0.1], [1.17, 0], [0, 0]] as RY[], { segs: 4 }) }
  }, [L.barrel, L.die, L.dryer, L.gear, L.motor, L.screen, L.z])
  const pipes = useMemo(() => ({
    cycle: pipeGeo([[PE.x, PE.top + 0.1, PE.z], [PE.x, PE.top + 1.4, PE.z], [PE.x + 6.5, PE.top + 1.4, PE.z], [PE.x + 6.5, 1.5, PE.z], [PE.x + 6.5, 1.5, PE.z - 4.6]], 0.36),
    back: pipeGeo([[PE.x + 4.4, 1.5, PE.z - 4.6], [PE.x + 1.6, 1.5, PE.z - 4.6], [PE.x + 1.6, 1.5, PE.z - 1], [PE.x + 0.6, 2.6, PE.z - 0.6], [PE.x + 0.3, 4.2, PE.z - 0.3]], 0.36),
    feed: pipeGeo(PE_FEED, 0.14), out: pipeGeo(PE_OUT, 0.15), water: pipeGeo(PELLET_PATH, 0.12), chute: pipeGeo([[L.dryer + 0.5, 3.1, L.z], [L.screen - 0.8, 2.15, L.z]], 0.16, 0.2),
  }), [L.dryer, L.screen, L.z])
  const heapH = 0.25 + 1.35 * pellet
  return <group>
    <mesh geometry={geo.st} castShadow receiveShadow><Painted rough={0.58} metal={0.3} /></mesh>
    {/* 反应器 */}
    <group position={[PE.x, 0, PE.z]}>
      <mesh geometry={geo.skirt} castShadow><Paint color="#6c7479" plate /></mesh>
      <mesh geometry={geo.reactor} castShadow receiveShadow><Paint color="#d6d8d2" plate rx={4} ry={6} rough={0.45} /></mesh>
      {/* 看窗：聚合时里面亮着 */}
      {[8, 11, 14].map(y => <mesh key={y} position={[0, y, 1.5]}><circleGeometry args={[0.16, 20]} /><meshStandardMaterial color="#1b2024" emissive="#ffd9a0" emissiveIntensity={poly * 1.4} roughness={0.2} /></mesh>)}
      {[8, 11, 14].map(y => <mesh key={y} position={[0, y, 1.49]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.24, 0.24, 0.08, 20]} /><Metal kind="steel" /></mesh>)}
    </group>
    <mesh geometry={pipes.cycle} castShadow><Paint color="#d6d8d2" /></mesh>
    <mesh geometry={pipes.back} castShadow><Paint color="#d6d8d2" /></mesh>
    <mesh geometry={geo.hx} position={[PE.x + 6.5, 1.5, PE.z - 4.6]} castShadow><Jacket rx={2} ry={2} /></mesh>
    <mesh geometry={pipes.feed} castShadow><Paint color="#d9a51c" /></mesh>
    <mesh geometry={pipes.out} castShadow><Metal kind="stainless" rough={0.4} /></mesh>
    {/* 敞棚的屋面：两面坡 */}
    {[-1, 1].map(s => <mesh key={s} position={[127.6, 7.82, -3 + s * 1.95]} rotation-x={s * 0.283} castShadow receiveShadow><boxGeometry args={[19.4, 0.06, 4.15]} /><meshStandardMaterial map={tex.roof} roughness={0.6} metalness={0.4} /></mesh>)}
    {/* 挤出机：电机、减速箱、机筒和加热圈、料斗 */}
    <mesh position={[L.motor, 1.6, L.z]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.52, 0.52, 1.45, 28]} /><Paint color="#2f5f8a" /></mesh>
    <mesh geometry={geo.fins} position={[L.motor, 1.6, L.z]} castShadow><Painted rough={0.5} /></mesh>
    <mesh position={[L.motor - 0.85, 1.6, L.z]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.56, 0.44, 0.3, 28]} /><Paint color="#274f73" /></mesh>
    <mesh position={[L.motor, 2.25, L.z + 0.2]} castShadow><boxGeometry args={[0.5, 0.3, 0.4]} /><Paint color="#274f73" /></mesh>
    <mesh position={[(L.motor + L.gear) / 2 + 0.05, 1.6, L.z]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.2, 0.5, 20]} /><Paint color="#d9a51c" /></mesh>
    <mesh geometry={geo.barrel} position={[L.barrel[0], 1.6, L.z]} castShadow><Metal kind="steel" grain="turned" rough={0.45} /></mesh>
    <mesh geometry={geo.bands} castShadow><meshStandardMaterial vertexColors roughness={0.45} metalness={0.6} emissive="#ff5a1c" emissiveIntensity={pellet > 0 ? 0.12 : 0} /></mesh>
    <mesh geometry={geo.hopper} position={[L.barrel[0] + 0.7, 2.85, L.z]} rotation-y={Math.PI / 4} castShadow><meshStandardMaterial color="#9aa1a5" metalness={0.7} roughness={0.45} side={THREE.DoubleSide} /></mesh>
    {/* 模头、水下切粒室、切粒电机 */}
    <mesh position={[L.die - 0.15, 1.6, L.z]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.52, 0.42, 0.5, 28]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[L.die + 0.4, 1.6, L.z]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.62, 0.62, 0.55, 32]} /><Metal kind="stainless" grain="brushed" rough={0.4} /></mesh>
    <mesh position={[L.die + 0.4, 1.6, L.z + 0.63]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.26, 0.26, 0.04, 24]} /><meshPhysicalMaterial color="#9fd4e6" roughness={0.05} transparent opacity={0.6} clearcoat={1} /></mesh>
    <mesh position={[L.die + 1.25, 1.6, L.z]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.32, 0.32, 1.1, 24]} /><Paint color="#2f5f8a" /></mesh>
    <mesh geometry={pipes.water} castShadow><Metal kind="stainless" rough={0.4} /></mesh>
    {/* 离心干燥器、溜槽、振动筛 */}
    <mesh geometry={geo.dryer} position={[L.dryer, 0, L.z]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.45} /></mesh>
    <mesh position={[L.dryer, 3.75, L.z]} castShadow><cylinderGeometry args={[0.26, 0.26, 0.7, 20]} /><Paint color="#2f5f8a" /></mesh>
    <mesh geometry={pipes.chute} castShadow><Metal kind="stainless" rough={0.45} /></mesh>
    {/* 料仓里的颗粒堆 */}
    <mesh geometry={geo.heap} position={[PE.bin.x, 0.28, PE.bin.z]} rotation-y={Math.PI / 4} scale={[1, heapH, 1]} receiveShadow><meshStandardMaterial map={tex.heap} roughness={0.75} /></mesh>
    {/* 两只颗粒料仓 */}
    {[128.5, 134.5].map(x => <mesh key={x} geometry={geo.silo} position={[x, 0, -11.5]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.6} env={0.5} /></mesh>)}
  </group>
}
