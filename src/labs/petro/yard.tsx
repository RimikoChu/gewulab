// 厂区里不属于哪一课的东西：管廊、原油罐区、球罐、塔顶空冷器和回流罐、远处的火炬和冷却塔、别的装置的轮廓、行道树、路灯。
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, lathe, mergeParts, type Part } from '@/lab-kit'
import { Flame, Jacket } from './look'
import { plateTex, rep } from './mats'
import { beam, box, cyl, frameParts, ladderParts, platformParts, rng, vesselPts, type RY, type V3 } from './parts'
import { TW } from './tower'

export const RACK = { z: -17, x0: -18, x1: 146, y: [6.2, 8.4] as [number, number] }

/** 管廊：一榀榀门形钢架，两层横梁，上面一排排粗细、颜色不同的管子 */
function rackParts() {
  const P: Part[] = [], col = '#5d6468'
  for (let x = RACK.x0; x <= RACK.x1; x += 8) {
    for (const dz of [-1.7, 1.7]) P.push(box(x, 0, RACK.z + dz, 0.3, 9.2, 0.3, col), box(x, 0, RACK.z + dz, 0.8, 0.4, 0.8, '#a5a39b'))
    for (const y of [...RACK.y, 9.2]) P.push(box(x, y - 0.3, RACK.z, 0.24, 0.3, 3.7, col))
    P.push(beam([x, 0.5, RACK.z - 1.7], [x, RACK.y[0] - 0.4, RACK.z + 1.7], 0.1, col))
  }
  for (const dz of [-1.7, 1.7]) for (const y of [RACK.y[0] - 0.15, 9.05]) P.push(box((RACK.x0 + RACK.x1) / 2, y, RACK.z + dz, RACK.x1 - RACK.x0, 0.2, 0.16, col))
  const pipe = (y: number, dz: number, r: number, c: string, x0 = RACK.x0 - 3, x1 = RACK.x1 + 3) => P.push({ p: [(x0 + x1) / 2, y + r, RACK.z + dz], s: [r, x1 - x0, r], c, cyl: true, r: [0, 0, Math.PI / 2] })
  pipe(RACK.y[0], -1.3, 0.3, '#c9cdd0'); pipe(RACK.y[0], -0.55, 0.22, '#c9cdd0'); pipe(RACK.y[0], 0.05, 0.16, '#d9a51c'); pipe(RACK.y[0], 0.5, 0.13, '#3f8f5a'); pipe(RACK.y[0], 0.95, 0.2, '#c9cdd0', -10, 110); pipe(RACK.y[0], 1.4, 0.11, '#4a86c5')
  pipe(RACK.y[1], -1.25, 0.26, '#c9cdd0', -18, 120); pipe(RACK.y[1], -0.5, 0.18, '#c9cdd0'); pipe(RACK.y[1], 0.1, 0.14, '#8a3b2a'); pipe(RACK.y[1], 0.6, 0.2, '#c9cdd0', 20, 149); pipe(RACK.y[1], 1.25, 0.24, '#b9bdc0')
  return P
}
/** 一座外浮顶原油罐：罐壁、抗风圈、盘梯、浮顶 */
function tankParts(x: number, z: number, r: number, h: number): Part[] {
  const P: Part[] = []
  for (const y of [h - 0.9, h - 3.2]) P.push(cyl(x, y, z, r + 0.35, 0.1, '#8d9296'))
  P.push(cyl(x, h - 2.4, z, r - 0.25, 0.3, '#6f6a62'), cyl(x, 0, z, r + 0.6, 0.25, '#a5a39b'))
  const n = 44
  for (let i = 0; i < n; i++) { const a = 0.6 + i / n * 1.9, y = 0.4 + (h - 0.4) * i / n; P.push({ p: [x + Math.cos(a) * (r + 0.45), y, z + Math.sin(a) * (r + 0.45)], s: [0.8, 0.05, 0.32], c: '#d9a51c', r: [0, -a, 0] }, { p: [x + Math.cos(a) * (r + 0.85), y + 0.55, z + Math.sin(a) * (r + 0.85)], s: [0.04, 1.1, 0.04], c: '#d9a51c' }) }
  return P
}
/** 一只球罐：八条腿、拉杆、顶上的平台 */
function sphereParts(x: number, z: number, r: number): Part[] {
  const P: Part[] = [], cy = r + 2.6
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, b = (k + 1) / 8 * Math.PI * 2, px = x + Math.cos(a) * r * 0.86, pz = z + Math.sin(a) * r * 0.86, qx = x + Math.cos(b) * r * 0.86, qz = z + Math.sin(b) * r * 0.86; P.push(cyl(px, 0, pz, 0.2, cy, '#c9cdd0'), cyl(px, 0, pz, 0.45, 0.3, '#a5a39b'), beam([px, 0.4, pz], [qx, cy - 1.5, qz], 0.07, '#8d9296'), beam([qx, 0.4, qz], [px, cy - 1.5, pz], 0.07, '#8d9296')) }
  P.push(...platformParts(0.2, cy + r + 0.1, 0, Math.PI * 2 - 0.01, 1.6).map(p => ({ ...p, p: [p.p[0] + x, p.p[1], p.p[2] + z] as V3 })), cyl(x, cy + r - 0.1, z, 1.8, 0.2, '#70767a'))
  return P
}
/** 一棵树的树冠：细分过的球，表面按噪声鼓出凹进，不是棱角分明的多面体 */
function crownGeo() {
  const raw = new THREE.IcosahedronGeometry(1, 4); raw.deleteAttribute('normal'); raw.deleteAttribute('uv')
  const g = mergeVertices(raw), p = g.attributes.position, v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.16 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.cos(v.z * 4.7 + v.x * 2.1) + 0.1 * Math.sin(v.y * 9.3 + v.z * 7.1) + 0.06 * Math.sin(v.x * 17 + v.z * 13); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y * 0.92, v.z) }
  g.computeVertexNormals(); return g
}
function Trees() {
  const trees = useMemo(() => {
    const r = rng(29), out: { p: V3; s: number; c: THREE.Color }[] = []
    const row = (x0: number, x1: number, z: number, step: number) => { for (let x = x0; x <= x1; x += step) out.push({ p: [x + (r() - 0.5) * 2, 0, z + (r() - 0.5) * 1.5], s: 0.85 + r() * 0.5, c: new THREE.Color().setHSL(0.25 + r() * 0.06, 0.4 + r() * 0.14, 0.09 + r() * 0.05) }) }
     row(-78, -42, 8.5, 7); row(-98, -80, -14, 6); row(204, 226, -10, 7); row(-60, 190, -104, 10)
    return out
  }, [])
  const trunk = useRef<THREE.InstancedMesh>(null), crown = useRef<THREE.InstancedMesh>(null), geo = useMemo(crownGeo, [])
  useEffect(() => {
    const o = new THREE.Object3D(), blobs: [number, number, number, number][] = [[0, 4.3, 0, 2.0], [0.9, 3.7, 0.5, 1.4], [-0.8, 3.9, -0.4, 1.5], [0.2, 5.4, -0.2, 1.3]]
    trees.forEach((t, i) => {
      o.position.set(t.p[0], 1.5 * t.s, t.p[2]); o.scale.set(t.s, t.s, t.s); o.rotation.set(0, 0, 0); o.updateMatrix(); trunk.current?.setMatrixAt(i, o.matrix)
      blobs.forEach(([dx, dy, dz, rad], k) => { o.position.set(t.p[0] + dx * t.s, dy * t.s, t.p[2] + dz * t.s); o.scale.setScalar(rad * t.s); o.rotation.set(k, i * 1.7 + k, 0); o.updateMatrix(); crown.current?.setMatrixAt(i * 4 + k, o.matrix); crown.current?.setColorAt(i * 4 + k, t.c.clone().offsetHSL(0, 0, (k - 1.5) * 0.012)) })
    })
    for (const m of [trunk.current, crown.current]) if (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true }
  }, [trees])
  return <>
    <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow><cylinderGeometry args={[0.13, 0.22, 3, 10]} /><meshStandardMaterial color="#54432f" roughness={0.95} /></instancedMesh>
    <instancedMesh ref={crown} args={[geo, undefined, trees.length * 4]} castShadow receiveShadow><meshStandardMaterial roughness={0.95} /></instancedMesh>
  </>
}

export function Yard() {
  const tex = useMemo(() => ({ tank: rep(plateTex('#c4c8cc'), 14, 5), sphere: rep(plateTex('#c4c8cc'), 6, 3) }), [])
  const geo = useMemo(() => {
    const far: Part[] = []
    const tanks: [number, number][] = [[-34, -52], [-10, -52], [-34, -78], [-10, -78]], spheres: [number, number][] = [[58, -52], [72, -52], [86, -52]]
    for (const [x, z] of tanks) far.push(...tankParts(x, z, 10, 13))
    for (const [x, z] of spheres) far.push(...sphereParts(x, z, 5.6))
    // 罐区的防火堤
    far.push(box(-22, 0, -38, 54, 1.2, 0.4, '#a5a39b'), box(-22, 0, -92, 54, 1.2, 0.4, '#a5a39b'), box(-49, 0, -65, 0.4, 1.2, 54, '#a5a39b'), box(5, 0, -65, 0.4, 1.2, 54, '#a5a39b'))
    // 塔顶空冷器的架子和管束、风机
    const ax = TW.x + 2.5, az = TW.z - 9
    far.push(...frameParts([ax - 4, ax + 4], [az - 2, az + 2], [12], { rails: true }), box(ax, 12.1, az, 7.4, 0.9, 3.4, '#aab0b4'))
    for (const dx of [-2, 2]) far.push(cyl(ax + dx, 11.2, az, 1.5, 0.7, '#7b8388'), cyl(ax + dx, 10.6, az, 0.3, 0.6, '#2f5f8a'))
    for (const dx of [-2.6, 2.6]) far.push(box(ax + dx, 0, az, 0.4, 3.2, 1.6, '#a5a39b'))
    // 远处别的装置：几组塔和框架，只求轮廓
    const r = rng(5)
    for (const [x, z] of [[22, -44], [112, -48], [140, -52], [176, -44]] as const) {
      far.push(...frameParts([x - 5, x + 5], [z - 3, z + 3], [6, 12, 18], { rails: false }))
      for (let k = 0; k < 3; k++) { const cx = x - 9 + k * 9 + r() * 2, h = 18 + r() * 22, rad = 1 + r() * 0.8; far.push(cyl(cx, 0, z - 7, rad, h, '#b9bdc0'), ...platformParts(rad, h * 0.6, 0, Math.PI * 2 - 0.01, 0.9).map(p => ({ ...p, p: [p.p[0] + cx, p.p[1], p.p[2] + z - 7] as V3 })), ...ladderParts(rad, Math.PI * 1.5, 1, h * 0.6).map(p => ({ ...p, p: [p.p[0] + cx, p.p[1], p.p[2] + z - 7] as V3 }))) }
    }
    // 中控楼
    far.push(box(24, 0, -70, 30, 7, 12, '#d9d6cc'), box(24, 7, -70, 31, 0.6, 13, '#b5b1a7'))
    for (let x = 12; x <= 36; x += 3) far.push(box(x, 2.2, -63.95, 1.8, 2.6, 0.1, '#32444f'))
    // 火炬：一根细高的筒，外面一圈拉索塔架
    far.push(cyl(196, 0, -80, 0.7, 70, '#8d9296'))
    for (let y = 0; y < 66; y += 6) for (let k = 0; k < 3; k++) { const a = k * 2.094, b = (k + 1) * 2.094, rr = 3.2 - y * 0.03, r2 = 3.2 - (y + 6) * 0.03; far.push(beam([196 + Math.cos(a) * rr, y, -80 + Math.sin(a) * rr], [196 + Math.cos(a) * r2, y + 6, -80 + Math.sin(a) * r2], 0.16, '#8d9296'), beam([196 + Math.cos(a) * rr, y, -80 + Math.sin(a) * rr], [196 + Math.cos(b) * r2, y + 6, -80 + Math.sin(b) * r2], 0.1, '#8d9296')) }
    // 路灯
    for (let x = -80; x <= 200; x += 28) far.push(cyl(x, 0, 23.2, 0.09, 8, '#6d7479'), box(x, 7.9, 22.4, 0.1, 0.1, 1.7, '#6d7479'), box(x, 7.8, 21.6, 0.3, 0.1, 0.6, '#d9dcd8'))
    const tank = lathe([[10, 0.25], [10, 13], [9.75, 13], [9.75, 0.25]] as RY[], { segs: 72, closed: true })
    const cool = lathe(Array.from({ length: 20 }, (_, i) => { const t = i / 19, y = t * 52; return [14 + 9 * ((t - 0.72) / 0.72) ** 2, y] as RY }), { segs: 56 })
    const drum = lathe(vesselPts(1.2, -3.2, 3.2, 0.6), { segs: 36 }); drum.rotateZ(Math.PI / 2)
    return { rack: mergeParts(rackParts()), far: mergeParts(far), tank, tanks, spheres, cool, drum, ax, az }
  }, [])
  return <group>
    <mesh geometry={geo.rack} castShadow receiveShadow><Painted rough={0.6} metal={0.35} /></mesh>
    <mesh geometry={geo.far} castShadow receiveShadow><Painted rough={0.65} metal={0.25} /></mesh>
    {geo.tanks.map(([x, z], i) => <mesh key={i} geometry={geo.tank} position={[x, 0, z]} castShadow receiveShadow><meshStandardMaterial map={tex.tank} color="#e2e4e0" roughness={0.6} metalness={0.25} side={THREE.DoubleSide} /></mesh>)}
    {geo.spheres.map(([x, z], i) => <mesh key={i} position={[x, 8.2, z]} castShadow receiveShadow><sphereGeometry args={[5.6, 48, 32]} /><meshStandardMaterial map={tex.sphere} color="#e6e8e4" roughness={0.5} metalness={0.2} /></mesh>)}
    <mesh geometry={geo.drum} position={[geo.ax, 4.4, geo.az]} castShadow><Jacket rx={3} ry={3} /></mesh>
    {[[262, -150], [310, -170]].map(([x, z], i) => <mesh key={i} geometry={geo.cool} position={[x, 0, z]} castShadow><meshStandardMaterial color="#8f8c84" roughness={0.95} side={THREE.DoubleSide} /></mesh>)}
    <Flame at={[196, 70, -80]} h={7} r={1.3} on={1} seed={3} />
    {/* 路中间的虚线、路南的草地 */}
    {Array.from({ length: 56 }, (_, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[-110 + i * 6, 0.012, 18]}><planeGeometry args={[3, 0.16]} /><meshStandardMaterial color="#e2ddcc" roughness={0.8} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[50, 0.008, 223]} receiveShadow><planeGeometry args={[1400, 400]} /><meshStandardMaterial color="#4c5f3c" roughness={1} /></mesh>
    {[13.3, 22.7].map(z => <mesh key={z} position={[50, 0.08, z]} receiveShadow><boxGeometry args={[400, 0.16, 0.3]} /><meshStandardMaterial color="#bdb9ae" roughness={0.9} /></mesh>)}
    <Trees />
  </group>
}
