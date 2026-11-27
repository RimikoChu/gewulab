// 发电机厂房：钢筋混凝土排架加钢屋架，北墙下半截是混凝土、上半截是彩钢板，南墙一排高窗；屋架下一台黄色桥式起重机。
// 地面是磨光的环氧地坪，三台立式水轮发电机露出地面的部分（定子机座、上机架盖板、集电环罩）一字排开，
// 北墙边一排机旁屏柜。1 号机由第 5 课画（剖开），这里画 2、3 号机。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, useConcrete, type Part } from '@/lab-kit'
import { HALL, UNITS } from './layout'
import { makeCladding, makeFloor, makeText, rep } from './mats'
import { Generator } from './gen'

const H = HALL
const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c })
const COLS = Array.from({ length: 8 }, (_, i) => H.x0 + i * 7)

/** 厂房外面的细节：南墙的小门和雨棚、东山墙的大卷帘门和雨棚、山墙上的窗、落水管、女儿墙压顶、屋脊上的通风器 */
function facadeParts() {
  const P: Part[] = []
  const z = H.z1 + 0.22, xE = H.x1 + 0.08
  // 南墙两扇钢制平开门，门上一块悬挑雨棚
  for (const x of [2, 30]) {
    P.push(box(x, 0, z, 2.0, 2.6, 0.08, '#5f6e78'), box(x, 0, z + 0.02, 0.04, 2.6, 0.1, '#3b444b'), box(x, 2.6, z, 2.3, 0.12, 0.1, '#3b444b'))
    P.push(box(x, 3.0, z + 0.8, 3.4, 0.16, 1.7, '#d7d9d6'), box(x, 2.9, z + 1.62, 3.4, 0.3, 0.06, '#d7d9d6'))
  }
  // 落水管：南墙每隔一根柱子一根
  for (let x = H.x0 + 3.5; x < H.x1; x += 14) P.push(box(x, 0, z + 0.05, 0.16, H.h, 0.16, '#cfd3d4'), box(x, 0.15, z + 0.25, 0.3, 0.12, 0.4, '#cfd3d4'))
  // 东山墙：6 m 宽的卷帘门（一道道横缝）、门框、雨棚；上面一排窗
  const zc = (H.z0 + H.z1) / 2 + 2
  for (let k = 0; k < 26; k++) P.push(box(xE + 0.04, 0.1 + k * 0.24, zc, 0.06, 0.2, 6.0, k % 2 ? '#a8b0b4' : '#b6bdc0'))
  P.push(box(xE, 0, zc - 3.15, 0.2, 6.5, 0.3, '#3b444b'), box(xE, 0, zc + 3.15, 0.2, 6.5, 0.3, '#3b444b'), box(xE, 6.3, zc, 0.2, 0.3, 6.6, '#3b444b'))
  P.push(box(xE + 1.0, 6.9, zc, 2.0, 0.18, 7.6, '#d7d9d6'))
  for (const zz of [H.z0 + 3, H.z0 + 7, H.z1 - 4]) P.push(box(xE, 9, zz, 0.06, 2.4, 2.6, '#2b3a46'), box(xE + 0.02, 9, zz, 0.08, 2.4, 0.06, '#cfd3d4'), box(xE + 0.05, 8.9, zz, 0.16, 0.08, 2.8, '#cfd3d4'))
  // 女儿墙压顶和屋脊通风器
  P.push(box((H.x0 + H.x1) / 2, H.h + 0.25, H.z1 + 0.5, H.x1 - H.x0 + 1, 0.5, 0.3, '#9aa3a8'), box((H.x0 + H.x1) / 2, H.h + 0.25, H.z0 - 0.5, H.x1 - H.x0 + 1, 0.5, 0.3, '#9aa3a8'))
  for (let x = H.x0 + 4; x < H.x1 - 2; x += 7) P.push(box(x, H.h + 0.25, (H.z0 + H.z1) / 2, 3.2, 1.1, 2.0, '#c9cfd2'), box(x, H.h + 1.35, (H.z0 + H.z1) / 2, 3.6, 0.12, 2.4, '#aab2b6'))
  return P
}

/** 排架柱、吊车梁、屋架、起重机，合成一个模型 */
function frameParts() {
  const P: Part[] = []
  for (const x of COLS) for (const z of [H.z0 + 0.4, H.z1 - 0.4]) {
    P.push(box(x, 0, z, 0.8, 13.2, 0.8, '#b7b3a9'), box(x, 13.2, z, 0.5, H.h - 13.2, 0.5, '#b7b3a9'))
    P.push(box(x, 12.4, z + (z < 0 ? 0.65 : -0.65), 0.7, 0.8, 0.6, '#b7b3a9'))   // 牛腿
  }
  // 吊车梁、轨道
  for (const z of [H.z0 + 1.1, H.z1 - 1.1]) P.push(box((H.x0 + H.x1) / 2, 13.2, z, H.x1 - H.x0, 0.9, 0.5, '#8f9599'), box((H.x0 + H.x1) / 2, 14.1, z, H.x1 - H.x0, 0.12, 0.12, '#3c4044'))
  // 钢屋架：上弦、下弦、竖杆
  for (const x of COLS) {
    P.push(box(x, H.h - 0.3, (H.z0 + H.z1) / 2, 0.3, 0.3, H.z1 - H.z0, '#56606a'), box(x, H.h - 2.4, (H.z0 + H.z1) / 2, 0.24, 0.24, H.z1 - H.z0, '#56606a'))
    for (let k = 0; k <= 10; k++) { const z = H.z0 + k * (H.z1 - H.z0) / 10; P.push(box(x, H.h - 2.4, z, 0.12, 2.1, 0.12, '#56606a')) }
  }
  // 桥式起重机：两根箱形主梁、端梁、小车、司机室
  const cx = 24
  for (const dz of [-0.9, 0.9]) P.push(box(cx + dz, 14.3, (H.z0 + H.z1) / 2, 1.0, 1.6, H.z1 - H.z0 - 2.4, '#e0b21c'))
  for (const z of [H.z0 + 1.1, H.z1 - 1.1]) P.push(box(cx, 14.2, z, 4.2, 0.9, 1.0, '#e0b21c'))
  P.push(box(cx, 15.9, 0, 3.4, 1.2, 3.2, '#d9a917'), box(cx - 1.4, 12.2, H.z1 - 3, 1.6, 1.9, 1.8, '#d9a917'), box(cx - 1.4, 12.9, H.z1 - 2.08, 1.4, 0.9, 0.02, '#2a3540'))
  // 吊钩和钢丝绳
  P.push(box(cx, 9.6, 0, 0.05, 6.2, 0.05, '#2b2d2f'), box(cx + 0.24, 9.6, 0, 0.05, 6.2, 0.05, '#2b2d2f'), box(cx + 0.12, 6.0, 0, 0.6, 1.0, 0.5, '#3b3e41'))
  // 北墙边的机旁屏柜：每台机组一排五面
  for (const ux of UNITS) for (let k = 0; k < 5; k++) {
    const x = ux - 2.4 + k * 1.2, z = H.z0 + 1.6
    P.push(box(x, 0, z, 1.16, 2.26, 0.7, '#cfd3d0'), box(x, 0.1, z + 0.355, 1.06, 2.06, 0.01, '#c2c7c4'))
    P.push(box(x, 1.5, z + 0.365, 0.5, 0.35, 0.01, '#1e2a33'), box(x - 0.3, 1.0, z + 0.37, 0.06, 0.06, 0.01, k % 2 ? '#d53a2a' : '#3cb35a'))
  }
  // 地面上的安全通道线（黄色）
  P.push(box((H.x0 + H.x1) / 2, 0.005, 6.2, H.x1 - H.x0 - 2, 0.006, 0.12, '#e0b21c'), box((H.x0 + H.x1) / 2, 0.005, 8.2, H.x1 - H.x0 - 2, 0.006, 0.12, '#e0b21c'))
  return P
}

export function Hall() {
  const [cd, cn, cr] = useConcrete(1, 1)
  const tex = useMemo(() => ({
    floor: rep(makeFloor(), (H.x1 - H.x0) / 6, (H.z1 - H.z0) / 6),
    clad: rep(makeCladding('#a7b1b6'), (H.x1 - H.x0) / 2, 1), cladE: rep(makeCladding('#a7b1b6'), (H.z1 - H.z0) / 2, 1),
    conc: [cd, cn, cr].map(t => { const c = t.clone(); c.repeat.set(8, 1); c.needsUpdate = true; return c }),
    sign: makeText(['水 力 发 电 站'], { w: 1024, h: 160, bg: '#a7b1b6', fg: '#b3261e', size: 110, weight: 800 }),
  }), [cd, cn, cr])
  const geo = useMemo(() => mergeParts(frameParts()), [])
  const face = useMemo(() => mergeParts(facadeParts()), [])
  const roofTex = useMemo(() => rep(makeCladding('#8a959c'), (H.x1 - H.x0) / 2, 1), [])
  const W = H.x1 - H.x0, D = H.z1 - H.z0, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2
  const clad = (m: THREE.Texture) => <meshStandardMaterial map={m} color="#c1c8cc" roughness={0.55} metalness={0.35} side={THREE.DoubleSide} />
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[cx, 0.01, cz]} receiveShadow><planeGeometry args={[W, D]} /><meshPhysicalMaterial map={tex.floor} color="#b6b9b4" roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
    {/* 北墙：下面 6 m 混凝土，上面彩钢板 */}
    <mesh position={[cx, 3, H.z0]}><boxGeometry args={[W, 6, 0.4]} /><meshStandardMaterial map={tex.conc[0]} normalMap={tex.conc[1]} roughnessMap={tex.conc[2]} color="#c0bcb2" /></mesh>
    <mesh position={[cx, (6 + H.h) / 2, H.z0]}><planeGeometry args={[W, H.h - 6]} />{clad(tex.clad)}</mesh>
    {/* 南墙：下面 3 m 混凝土，中间一条通长的高窗，上面彩钢板和厂名 */}
    <mesh position={[cx, 1.5, H.z1]}><boxGeometry args={[W, 3, 0.4]} /><meshStandardMaterial map={tex.conc[0]} color="#c0bcb2" /></mesh>
    <mesh position={[cx, (11 + H.h) / 2, H.z1]}><planeGeometry args={[W, H.h - 11]} />{clad(tex.clad)}</mesh>
    <mesh position={[cx, 7, H.z1]}><planeGeometry args={[W, 8]} /><meshPhysicalMaterial color="#9fb8c8" transparent opacity={0.25} roughness={0.05} metalness={0.2} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    {Array.from({ length: Math.round(W / 3.5) + 1 }, (_, i) => <mesh key={i} position={[H.x0 + i * 3.5, 7, H.z1]}><boxGeometry args={[0.12, 8, 0.2]} /><meshStandardMaterial color="#8b9398" metalness={0.5} roughness={0.4} /></mesh>)}
    {[3, 11].map(y => <mesh key={y} position={[cx, y, H.z1]}><boxGeometry args={[W, 0.16, 0.24]} /><meshStandardMaterial color="#8b9398" metalness={0.5} roughness={0.4} /></mesh>)}
    <mesh position={[cx + 6, 15.2, H.z1 + 0.05]}><planeGeometry args={[18, 2.8]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
    {/* 东西山墙、屋面 */}
    {[H.x0, H.x1].map((x, i) => <mesh key={i} position={[x, H.h / 2, cz]} rotation-y={Math.PI / 2}><planeGeometry args={[D, H.h]} />{clad(tex.cladE)}</mesh>)}
    {/* 屋面：压型钢板（一道道顺坡的肋） */}
    <mesh position={[cx, H.h + 0.1, cz]}><boxGeometry args={[W + 1, 0.3, D + 1]} /><meshStandardMaterial color="#68747c" roughness={0.7} metalness={0.3} /></mesh>
    <mesh position={[cx, H.h + 0.26, cz]} rotation-x={-Math.PI / 2}><planeGeometry args={[W + 1, D + 1]} /><meshStandardMaterial map={roofTex} color="#9aa4aa" roughness={0.55} metalness={0.4} /></mesh>
    <mesh geometry={face} castShadow receiveShadow><Painted rough={0.55} metal={0.3} /></mesh>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.6} metal={0.25} /></mesh>
    {/* 屋架下的工矿灯 */}
    {COLS.slice(0, -1).flatMap(x => [-4, 8].map(z => <group key={`${x}${z}`} position={[x + 3.5, H.h - 3, z]}>
      <mesh><cylinderGeometry args={[0.3, 0.42, 0.4, 24, 1, true]} /><meshStandardMaterial color="#6e767c" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -0.19, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[0.4, 24]} /><meshBasicMaterial color="#fff7e6" toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>))}
    {[0, 14, 28].map(x => <pointLight key={x} position={[x + 4, 14, 3]} intensity={60} distance={30} decay={1.2} color="#fdf3e2" />)}
    {UNITS.slice(1).map((x, i) => <group key={x} position={[x, 0, 0]}><Generator name={`${i + 2} 号机`} /></group>)}
  </group>
}
