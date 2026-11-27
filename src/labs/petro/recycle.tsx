// 拓展课的回收车间：一条分拣皮带，前面一排六只料箱（箱上是回收标志 1 到 6）；东头一张加热试验台，台上一台电热板。
// 背后是压型钢板的墙，墙根堆着打好包的废塑料。
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, Painted, mergeParts, type Part } from '@/lab-kit'
import { Paint } from './look'
import { beltTex, recycleSign, rep, ribTex } from './mats'
import { beam, box, cyl, rng, type V3 } from './parts'
import { RESINS } from './physics'

/** 皮带：两头的 x、z、带面高度；料箱的 z；第 i 只料箱的 x；加热试验台（电热板中心）的位置 */
export const RC = { x0: 153.4, x1: 163.2, z: -4, top: 1.25, binZ: -2.45, hot: [168.6, 0.98, -3.4] as V3 }
export const binX = (i: number) => 156.0 + i * 1.3

export function Recycle() {
  const tex = useMemo(() => ({ belt: rep(beltTex(), 60, 1), wall: rep(ribTex('#8c9aa3'), 60, 1), roof: rep(ribTex('#7f95a8'), 40, 1), signs: RESINS.map(r => recycleSign(r.code, r.abbr)) }), [])
  const geo = useMemo(() => {
    const st: Part[] = [], r = rng(41)
    // 棚子：柱子、屋架
    for (const x of [152, 162, 172]) { for (const z of x === 162 ? [-8] : [-8, 0.6]) st.push(box(x, 0, z, 0.3, 6.4, 0.3, '#5d6468')); st.push(beam([x, 6.4, -8], [x, 7.4, -3.7], 0.2, '#5d6468'), beam([x, 7.4, -3.7], [x, 6.4, 0.6], 0.2, '#5d6468')) }
    // 皮带机的机架、托辊、两头的滚筒、电机
    for (let x = RC.x0 + 0.5; x <= RC.x1; x += 2) for (const dz of [-0.55, 0.55]) st.push(box(x, 0, RC.z + dz, 0.1, RC.top - 0.1, 0.1, '#3f5f80'))
    for (const dz of [-0.55, 0.55]) st.push(box((RC.x0 + RC.x1) / 2, RC.top - 0.22, RC.z + dz, RC.x1 - RC.x0, 0.16, 0.06, '#3f5f80'), box((RC.x0 + RC.x1) / 2, RC.top + 0.02, RC.z - 0.56, RC.x1 - RC.x0, 0.14, 0.03, '#3f5f80'))
    for (let x = RC.x0 + 0.3; x <= RC.x1; x += 0.6) st.push({ p: [x, RC.top - 0.1, RC.z], s: [0.05, 1.0, 0.05], c: '#9aa1a5', cyl: true, r: [Math.PI / 2, 0, 0] })
    for (const x of [RC.x0, RC.x1]) st.push({ p: [x, RC.top - 0.14, RC.z], s: [0.14, 1.06, 0.14], c: '#6d7479', cyl: true, r: [Math.PI / 2, 0, 0] })
    st.push(box(RC.x1 + 0.1, RC.top - 0.5, RC.z - 0.9, 0.5, 0.4, 0.5, '#2f5f8a'))
    // 料箱：敞口的铁皮箱，带叉车槽
    RESINS.forEach((_, i) => { const x = binX(i), z = RC.binZ; st.push(box(x, 0.12, z, 1.16, 0.05, 1.3, '#57626b')); for (const s of [-1, 1]) st.push(box(x + s * 0.58, 0.12, z, 0.05, 1.0, 1.3, '#57626b'), box(x, 0.12, z + s * 0.65, 1.16, 1.0, 0.05, '#57626b'), box(x + s * 0.36, 0, z, 0.18, 0.12, 1.3, '#3b4146')); st.push(box(x, 1.08, z + 0.65, 1.22, 0.06, 0.08, '#3b4146'), box(x, 1.08, z - 0.65, 1.22, 0.06, 0.08, '#3b4146')) })
    // 打好包的废塑料：一摞摞方包，颜色杂
    const cols = ['#c9d6dc', '#9fb8c9', '#d6cfa8', '#b9c7b0', '#d9b9a6', '#aab2bb']
    for (let i = 0; i < 10; i++) for (let k = 0; k < (i % 3 === 1 ? 2 : 3); k++) st.push(box(154 + i * 1.75 + (r() - 0.5) * 0.1, k * 1.05, -7.1 + (r() - 0.5) * 0.1, 1.5, 1.0, 1.1, cols[Math.floor(r() * cols.length)]))
    // 试验台：钢架、搁板
    const [hx, , hz] = RC.hot
    for (const dx of [-0.85, 0.85]) for (const dz of [-0.4, 0.4]) st.push(box(hx + dx, 0, hz + dz, 0.06, 0.86, 0.06, '#3b4146'))
    st.push(box(hx, 0.3, hz, 1.76, 0.04, 0.86, '#59626a'))
    return { st: mergeParts(st) }
  }, [])
  const [hx, hy, hz] = RC.hot
  return <group>
    <mesh position={[162, 0.02, -3.7]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[22, 10]} /><meshStandardMaterial color="#9c9a93" roughness={0.9} /></mesh>
    <mesh geometry={geo.st} castShadow receiveShadow><Painted rough={0.6} metal={0.25} /></mesh>
    {/* 后墙和屋面 */}
    <mesh position={[162, 3.2, -8.2]} receiveShadow><boxGeometry args={[20.4, 6.4, 0.1]} /><meshStandardMaterial map={tex.wall} roughness={0.6} metalness={0.3} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[162, 7.0, -3.7 + s * 2.2]} rotation-x={s * 0.23} castShadow receiveShadow><boxGeometry args={[21.4, 0.06, 4.7]} /><meshStandardMaterial map={tex.roof} roughness={0.6} metalness={0.4} /></mesh>)}
    {/* 皮带 */}
    <mesh position={[(RC.x0 + RC.x1) / 2, RC.top - 0.02, RC.z]} receiveShadow><boxGeometry args={[RC.x1 - RC.x0, 0.04, 1.0]} /><meshStandardMaterial map={tex.belt} roughness={0.85} /></mesh>
    {/* 料箱上的回收标志 */}
    {RESINS.map((r, i) => <mesh key={r.code} position={[binX(i), 0.6, RC.binZ + 0.68]}><planeGeometry args={[0.92, 0.92]} /><meshStandardMaterial map={tex.signs[i]} roughness={0.6} /></mesh>)}
    {/* 试验台的台面、电热板 */}
    <RoundedBox args={[1.9, 0.05, 0.95]} radius={0.012} position={[hx, hy - 0.105, hz]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.4} /></RoundedBox>
    <RoundedBox args={[0.9, 0.09, 0.5]} radius={0.015} position={[hx, hy - 0.035, hz]} castShadow><Paint color="#d9dcd8" rough={0.4} /></RoundedBox>
    <mesh position={[hx, hy + 0.012, hz]} castShadow><boxGeometry args={[0.8, 0.014, 0.4]} /><meshPhysicalMaterial color="#1c1d1f" roughness={0.25} clearcoat={0.8} /></mesh>
    <mesh position={[hx + 0.34, hy - 0.035, hz + 0.252]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, 0.02, 20]} /><Paint color="#26292c" /></mesh>
  </group>
}
