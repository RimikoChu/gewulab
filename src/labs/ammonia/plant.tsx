// 合成区和罐区：合成塔（可以朝镜头剖开，看承压外筒、内件、催化剂床层、换热器）、合成气压缩机厂房、水冷器、氨冷器、
// 氨分离器、循环压缩机、管廊和工艺管道；再往东是液氨储罐和尿素造粒塔；远处是冷却塔、火炬和别的厂房。单位 m。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { Metal, Painted, bolts, disc, lathe, mergeParts, shell, type Part } from '@/lab-kit'
import { catalystTex, cladTex, gratingTex, hatchTex, jacketTex, makeSign, rep, warnSign } from './mats'
import { Flow } from './flow'
import { box, cyl, latheArc, pipeGeo, rng, type V3 } from './parts'

/** 合成塔：中心 x、z；外筒外半径、壁厚；筒体上下沿；两层催化剂床、床间换热器、底部换热器的上下沿 */
export const CV = { x: 14, z: -6, ro: 1.6, t: 0.16, y0: 2.4, y1: 20, bed1: [13.2, 18.4], bed2: [6.4, 11.6], mid: [11.6, 13.2], hx: [2.9, 6.0], rb: 1.36 } as const
/** 合成回路里其余设备的位置 */
export const LOOPX = { comp: { x: -4, z: -10 }, wc: { x: 21.5, z: -1.2 }, ac: { x: 27.5, z: -1.2 }, sep: { x: 33, z: -6 }, rc: { x: 37.5, z: -13 } }
export const TANK = { x: 64, z: -14, r: 9, h: 13 }
export const PRILL = { x: 90, z: -18, w: 12, h: 62 }
const RACK = { z: -18, x0: -12, x1: 50, y: [6, 8.5] }

// ---------- 小零件 ----------
/** 沿圆弧的一段平台：格栅走道、立柱、两道栏杆。半径 r，高 y，角度 a0 到 a1 */
function platformParts(r: number, y: number, a0: number, a1: number, w = 1.0): Part[] {
  const P: Part[] = [], n = Math.max(3, Math.round((a1 - a0) * (r + w) / 1.2))
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, ro = r + w, x = Math.cos(a), z = -Math.sin(a)
    P.push({ p: [x * ro, y + 0.55, z * ro], s: [0.05, 1.1, 0.05], c: '#d9a51c' })
    if (i < n) {
      const b = a0 + (a1 - a0) * (i + 0.5) / n, len = 2 * ro * Math.sin((a1 - a0) / n / 2) + 0.04, bx = Math.cos(b), bz = -Math.sin(b)
      for (const yy of [0.55, 1.08]) P.push({ p: [bx * ro, y + yy, bz * ro], s: [0.045, 0.045, len], c: '#d9a51c', r: [0, b, 0] })
      P.push({ p: [bx * (r + w / 2), y - 0.08, bz * (r + w / 2)], s: [0.06, 0.16, len], c: '#7b7f82', r: [0, b, 0] })
      P.push({ p: [bx * ro, y + 0.06, bz * ro], s: [0.03, 0.12, len], c: '#d9a51c', r: [0, b, 0] })   // 踢脚板
    }
  }
  return P
}
/** 一段直梯加护笼：在角度 a 处，从 y0 爬到 y1 */
function ladderParts(r: number, a: number, y0: number, y1: number): Part[] {
  const P: Part[] = [], x = Math.cos(a), z = -Math.sin(a), tx = -Math.sin(a), tz = -Math.cos(a), ro = r + 0.25
  for (const k of [-0.22, 0.22]) P.push({ p: [x * ro + tx * k, (y0 + y1) / 2, z * ro + tz * k], s: [0.05, y1 - y0, 0.05], c: '#d9a51c' })
  for (let y = y0 + 0.3; y < y1; y += 0.3) P.push({ p: [x * ro, y, z * ro], s: [0.44, 0.03, 0.03], c: '#d9a51c', r: [0, a + Math.PI / 2, 0] })
  for (let y = y0 + 2.4; y < y1; y += 0.9) for (let k = 0; k < 5; k++) { const b = a + (k - 2) * 0.5; P.push({ p: [x * ro + Math.cos(b) * 0.38, y, z * ro - Math.sin(b) * 0.38], s: [0.03, 0.03, 0.34], c: '#d9a51c', r: [0, b + Math.PI / 2, 0] }) }
  for (let k = 0; k < 5; k++) { const b = a + (k - 2) * 0.5; P.push({ p: [x * ro + Math.cos(b) * 0.4, (y0 + 2.4 + y1) / 2, z * ro - Math.sin(b) * 0.4], s: [0.03, y1 - y0 - 2.4, 0.03], c: '#d9a51c' }) }
  return P
}
/** 椭圆封头的截面点：半径 r，从 y 处往外凸 h（dir 1 向上、-1 向下），从筒体边走到轴线 */
const headPts = (r: number, y: number, h: number, dir: number, n = 10): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI / 2; return [r * Math.cos(a), y + dir * h * Math.sin(a)] })

/** 一种漆面（不是金属本色）：粗糙一点、带清漆 */
const Paint = ({ color, rough = 0.5, map }: { color: string; rough?: number; map?: THREE.Texture }) => <meshPhysicalMaterial color={color} roughness={rough} metalness={0.15} clearcoat={0.35} clearcoatRoughness={0.4} map={map} />

// ---------- 合成塔 ----------
/** cut：朝镜头剖开（只留后半边，剖面画斜线）；temp：床层温度（°C），决定催化剂发光和气流颜色；flow：管道里有没有气在走 */
export function Converter({ cut = false, temp = 450, flow = 0, speed = 1, children }: { cut?: boolean; temp?: number; flow?: number; speed?: number; children?: ReactNode }) {
  const tex = useMemo(() => ({ jacket: rep(jacketTex(), 10, 18), hatch: rep(hatchTex(), 3, 3), cat: rep(catalystTex(), 1.5, 3), catTop: rep(catalystTex(), 1.2, 1.2), grate: rep(gratingTex(), 8, 1) }), [])
  const geo = useMemo(() => {
    const { ro, t, y0, y1 } = CV, ri = ro - t
    // 外筒和下封头：外壁从下往上，内壁从上往下
    const prof: [number, number][] = [...headPts(ro, y0, 0.8, -1).reverse(), [ro, y1], [ri, y1], ...headPts(ri, y0, 0.8 - t, -1)]
    const flange: [number, number][] = [[ri, y1 - 0.7], [ro, y1 - 0.7], [ro + 0.3, y1 - 0.4], [ro + 0.3, y1], [ri, y1]]
    const cover: [number, number][] = [[0, y1], [ro + 0.3, y1], [ro + 0.3, y1 + 0.42], [ro + 0.1, y1 + 0.58], [0.34, y1 + 0.58], [0.34, y1 + 1.2], [0.5, y1 + 1.2], [0.5, y1 + 1.36], [0, y1 + 1.36]]
    const bedP = (a: number, b: number): [number, number][] => [[0.26, a], [CV.rb, a], [CV.rb, b], [0.26, b]]
    const baskP: [number, number][] = [[CV.rb, 2.8], [CV.rb + 0.04, 2.8], [CV.rb + 0.04, 19.3], [CV.rb, 19.3]]
    const half = (p: [number, number][]) => latheArc(p, 0, Math.PI, { segs: 40 })
    const front = (p: [number, number][]) => latheArc(p, Math.PI, Math.PI, { segs: 40 })
    // 床层上面和下面的支撑格栅、中心管
    const grid = (y: number) => latheArc([[0.26, y - 0.08], [CV.rb, y - 0.08], [CV.rb, y], [0.26, y]], 0, Math.PI, { segs: 32 })
    const centre = latheArc([[0.2, 2.9], [0.26, 2.9], [0.26, 19.0], [0.2, 19.0]], 0, Math.PI, { segs: 24 })
    // 换热器的管子：后半边的一排排竖管
    const tubes = (yA: number, yB: number, rmax: number) => {
      const P: Part[] = []
      for (let x = -rmax; x <= rmax; x += 0.16) for (let z = -0.08; z > -rmax; z -= 0.16) if (x * x + z * z < rmax * rmax && Math.hypot(x, z) > 0.34) P.push({ p: [x, (yA + yB) / 2, z], s: [0.032, yB - yA, 0.032], c: '#b8bcc0', cyl: true })
      return mergeParts(P)
    }
    const sheet = (y: number, rmax: number) => latheArc([[0.26, y - 0.1], [rmax, y - 0.1], [rmax, y], [0.26, y]], 0, Math.PI, { segs: 32 })
    // 平台和梯子
    const plat = mergeParts([...platformParts(ro + 0.3, y1 + 0.2, -0.3, Math.PI + 0.3, 1.1), ...platformParts(ro, 11.0, Math.PI * 0.05, Math.PI * 0.95), ...ladderParts(ro, Math.PI * 0.52, 0.4, 11.0), ...ladderParts(ro, Math.PI * 0.48, 11.0, y1 + 0.2)])
    const deck = [latheArc([[ro + 0.3, y1 + 0.12], [ro + 1.4, y1 + 0.12], [ro + 1.4, y1 + 0.2], [ro + 0.3, y1 + 0.2]], -0.3, Math.PI + 0.6, { segs: 40 }), latheArc([[ro, 10.92], [ro + 1.0, 10.92], [ro + 1.0, 11.0], [ro, 11.0]], Math.PI * 0.05, Math.PI * 0.9, { segs: 30 })]
    // 环焊缝：外筒上每隔 3 m 一道略凸的窄环
    const seams = mergeParts(Array.from({ length: 6 }, (_, i) => ({ p: [0, y0 + 0.4 + i * 3, 0] as V3, s: [ro + 0.012, 0.05, ro + 0.012] as V3, c: '#9ea3a6', cyl: true })))
    const seamsHalf = Array.from({ length: 6 }, (_, i) => latheArc([[ro, y0 + 0.38 + i * 3], [ro + 0.014, y0 + 0.38 + i * 3], [ro + 0.014, y0 + 0.43 + i * 3], [ro, y0 + 0.43 + i * 3]], 0, Math.PI, { segs: 40 }))
    // 裙座和基础；接管（进气在上部侧面，出气在下部侧面）
    const skirt = shell([[ro - 0.02, 0.4], [ro - 0.02, y0 - 0.5]], 0.03)
    return {
      shellBack: half(prof), shellFront: front(prof), flangeBack: half(flange), flangeFront: front(flange), coverBack: half(cover), coverFront: front(cover),
      bed1: half(bedP(CV.bed1[0], CV.bed1[1])), bed2: half(bedP(CV.bed2[0], CV.bed2[1])), bask: half(baskP), grids: [grid(CV.bed1[0]), grid(CV.bed2[0]), sheet(CV.mid[0] + 0.1, 1.15), sheet(CV.mid[1], 1.15), sheet(CV.hx[0] + 0.1, 1.2), sheet(CV.hx[1], 1.2)],
      centre, tubesMid: tubes(CV.mid[0] + 0.1, CV.mid[1] - 0.1, 1.1), tubesLow: tubes(CV.hx[0] + 0.1, CV.hx[1] - 0.1, 1.15), plat, deck, seams, seamsHalf, skirt,
      studs: bolts(32, ro + 0.15, 0.13, 0.16),
      pad: disc(ro + 1.1, 0.4, { chamfer: 0.06 }),
    }
  }, [])
  const hot = THREE.MathUtils.clamp((temp - 300) / 300, 0, 1)
  const shellMat = <><meshStandardMaterial attach="material-0" map={tex.jacket} color="#d7dadc" metalness={0.55} roughness={0.38} envMapIntensity={0.8} /><meshStandardMaterial attach="material-1" map={tex.hatch} roughness={0.7} metalness={0.2} side={THREE.DoubleSide} /></>
  const forged = <><meshStandardMaterial attach="material-0" color="#7d8287" metalness={0.8} roughness={0.42} /><meshStandardMaterial attach="material-1" map={tex.hatch} roughness={0.7} metalness={0.2} side={THREE.DoubleSide} /></>
  const catMat = <><meshStandardMaterial attach="material-0" map={tex.catTop} color="#c4c8ce" roughness={0.55} metalness={0.35} /><meshStandardMaterial attach="material-1" map={tex.cat} color="#d2d6dc" roughness={0.5} metalness={0.3} side={THREE.DoubleSide} /></>
  const steel = <><Metal kind="stainless" grain="brushed" rough={0.35} /></>
  const { x, z, y1 } = CV
  // 气流：进口在上部侧面 → 沿外筒和内件之间的环隙往下 → 底部换热器管间受热 → 中心管上升 → 往下穿过一段床、床间换热、二段床 → 底部换热器管内放热 → 出口
  const paths = useMemo<V3[][]>(() => {
    const zz = 0.05, P: V3[][] = []
    for (const s of [1, -1]) P.push([[s * 1.42, 19.0, zz], [s * 1.42, 3.2, zz], [s * 0.9, 3.4, zz], [s * 0.34, 5.6, zz], [s * 0.1, 6.2, zz], [s * 0.1, 19.2, zz]])
    for (const s of [1, -1]) for (const xx of [0.55, 0.95]) P.push([[s * 0.2, 19.3, zz], [s * xx, 18.9, zz], [s * xx, CV.mid[1], zz], [s * (xx - 0.15), (CV.mid[0] + CV.mid[1]) / 2, zz], [s * xx, CV.mid[0], zz], [s * xx, CV.hx[1], zz], [s * xx, CV.hx[0], zz], [s * 1.0, 2.6, zz], [s * 1.3, 2.1, zz]])
    return P
  }, [])
  const tempAt = (u: number, p: number) => {
    if (p < 2) return u < 0.35 ? new THREE.Color('#6fb3ff') : new THREE.Color('#6fb3ff').lerp(new THREE.Color('#ffc46b'), Math.min(1, (u - 0.35) / 0.4))
    const c = new THREE.Color('#ffc46b'), h = new THREE.Color().setHSL(0.04 + 0.06 * (1 - hot), 1, 0.58)
    return u < 0.35 ? c.lerp(h, u / 0.35) : u < 0.5 ? h.clone().lerp(new THREE.Color('#ffc46b'), (u - 0.35) / 0.15) : u < 0.7 ? new THREE.Color('#ffc46b').lerp(h, (u - 0.5) / 0.2) : h.clone().lerp(new THREE.Color('#8fb4d8'), (u - 0.7) / 0.3)
  }
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geo.pad} receiveShadow><meshStandardMaterial color="#a8a59d" roughness={0.9} /></mesh>
      <mesh geometry={geo.skirt} castShadow receiveShadow><Paint color="#6e7478" /></mesh>
      <mesh geometry={geo.shellBack} castShadow receiveShadow>{shellMat}</mesh>
      {!cut && <mesh geometry={geo.shellFront} castShadow>{shellMat}</mesh>}
      <mesh geometry={geo.flangeBack} castShadow receiveShadow>{forged}</mesh>
      {!cut && <mesh geometry={geo.flangeFront} castShadow>{forged}</mesh>}
      <mesh geometry={geo.coverBack} castShadow receiveShadow>{forged}</mesh>
      {!cut && <mesh geometry={geo.coverFront} castShadow>{forged}</mesh>}
      <mesh geometry={geo.studs} position-y={y1 + 0.42} castShadow><Metal kind="steel" grain="cast" /></mesh>
      {!cut && <mesh geometry={geo.seams}><meshStandardMaterial color="#aeb2b4" metalness={0.6} roughness={0.4} /></mesh>}
      {cut && geo.seamsHalf.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial attach="material-0" color="#aeb2b4" metalness={0.6} roughness={0.4} /><meshStandardMaterial attach="material-1" color="#aeb2b4" /></mesh>)}
      {/* 进出口接管：上部一根进气，下部一根出气 */}
      <mesh position={[CV.ro + 0.45, 18.6, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.32, 0.32, 0.9, 28]} />{<Metal kind="steel" grain="turned" />}</mesh>
      <mesh position={[CV.ro + 0.95, 18.6, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.5, 0.5, 0.14, 28]} /><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[-CV.ro - 0.45, 3.4, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.32, 0.32, 0.9, 28]} /><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[-CV.ro - 0.95, 3.4, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.5, 0.5, 0.14, 28]} /><Metal kind="steel" grain="turned" /></mesh>
      {/* 测温接管：沿筒体几处伸出的小接管和接线盒；顶上一台吊盖用的旋臂吊 */}
      {[16.5, 14.2, 9.6, 7.4].map((y, i) => <group key={y} rotation-y={2.3 + i * 0.12}><mesh position={[CV.ro + 0.18, y, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.07, 0.07, 0.36, 16]} /><Metal kind="steel" grain="turned" /></mesh><mesh position={[CV.ro + 0.42, y, 0]} castShadow><boxGeometry args={[0.16, 0.2, 0.16]} /><meshStandardMaterial color="#4a5560" roughness={0.5} metalness={0.3} /></mesh></group>)}
      <group position={[-(CV.ro + 0.9), y1 + 0.2, -0.6]}>
        <mesh position-y={1.6} castShadow><cylinderGeometry args={[0.1, 0.12, 3.2, 16]} /><Paint color="#d9a51c" /></mesh>
        <mesh position={[0.9, 3.1, 0]} rotation-z={Math.PI / 2} castShadow><boxGeometry args={[0.18, 1.9, 0.14]} /><Paint color="#d9a51c" /></mesh>
        <mesh position={[1.7, 2.6, 0]} castShadow><boxGeometry args={[0.2, 0.36, 0.16]} /><meshStandardMaterial color="#2f3337" roughness={0.5} /></mesh>
      </group>
      {/* 平台、梯子 */}
      <mesh geometry={geo.plat} castShadow><Painted rough={0.55} metal={0.2} /></mesh>
      {geo.deck.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><meshStandardMaterial attach="material-0" map={tex.grate} color="#c9c9c0" roughness={0.7} metalness={0.4} /><meshStandardMaterial attach="material-1" color="#6a6a62" /></mesh>)}
      {/* 剖开以后才看得见的内件 */}
      {cut && <>
        <mesh geometry={geo.bask} castShadow receiveShadow><meshStandardMaterial attach="material-0" color="#c8ccce" metalness={0.85} roughness={0.32} /><meshStandardMaterial attach="material-1" color="#d4d8da" metalness={0.3} roughness={0.5} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={geo.bed1} receiveShadow>{catMat}</mesh>
        <mesh geometry={geo.bed2} receiveShadow>{catMat}</mesh>
        {geo.grids.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial attach="material-0" color="#8d9296" metalness={0.8} roughness={0.4} /><meshStandardMaterial attach="material-1" color="#9ca1a5" metalness={0.5} roughness={0.5} side={THREE.DoubleSide} /></mesh>)}
        <mesh geometry={geo.centre}><meshStandardMaterial attach="material-0" color="#c8ccce" metalness={0.85} roughness={0.3} /><meshStandardMaterial attach="material-1" color="#d4d8da" side={THREE.DoubleSide} /></mesh>
        <mesh geometry={geo.tubesMid} castShadow>{steel}</mesh>
        <mesh geometry={geo.tubesLow} castShadow>{steel}</mesh>
      </>}
      {cut && <Flow paths={paths} density={2.2} speed={1.6 * speed} size={0.075} color={tempAt} on={flow} />}
      {children}
    </group>
  )
}

// ---------- 别的设备 ----------
/** 卧式换热器：筒体、两头的管箱和法兰、两个鞍座、上下接管。at 是中心，len 长，r 半径 */
export function HxH({ at, len, r, color = '#d9dcde' }: { at: V3; len: number; r: number; color?: string }) {
  const geo = useMemo(() => {
    const body = lathe([[r * 0.98, -len / 2], [r, -len / 2 + 0.02], [r, len / 2 - 0.02], [r * 0.98, len / 2]])
    const head = lathe([[0, 0], ...headPts(r, 0, r * 0.5, 1)])
    const fl = disc(r + 0.12, 0.16, { hole: r * 0.6 })
    const legs = mergeParts([box(-len * 0.3, 0, 0, 0.3, at[1] - r * 0.6, r * 1.6, '#8a8f92'), box(len * 0.3, 0, 0, 0.3, at[1] - r * 0.6, r * 1.6, '#8a8f92'), box(-len * 0.3, 0, 0, 0.6, 0.3, r * 2, '#a7a49c'), box(len * 0.3, 0, 0, 0.6, 0.3, r * 2, '#a7a49c')])
    return { body, head, fl, legs, nb: bolts(16, r + 0.06, 0.07, 0.06) }
  }, [len, r, at])
  return <group position={[at[0], 0, at[2]]}>
    <mesh geometry={geo.legs} castShadow receiveShadow><Painted rough={0.7} metal={0.2} /></mesh>
    <group position-y={at[1]} rotation-z={Math.PI / 2}>
      <mesh geometry={geo.body} castShadow receiveShadow><Paint color={color} rough={0.45} /></mesh>
      {[-1, 1].map(s => <group key={s} position-y={s * len / 2} rotation-z={s < 0 ? Math.PI : 0}>
        <mesh geometry={geo.fl} castShadow><Paint color={color} /></mesh>
        <mesh geometry={geo.nb} position-y={0.16} castShadow><Metal kind="steel" grain="cast" /></mesh>
        <mesh position-y={0.16} castShadow><cylinderGeometry args={[r, r, 0.5, 32]} /><Paint color={color} /></mesh>
        <mesh geometry={geo.head} position-y={0.41} castShadow><Paint color={color} /></mesh>
      </group>)}
    </group>
    {[[-len * 0.38, 1], [len * 0.38, -1]].map(([dx, s]) => <mesh key={dx} position={[dx, at[1] + s * (r + 0.25), 0]} castShadow><cylinderGeometry args={[r * 0.28, r * 0.28, 0.5, 20]} /><Metal kind="steel" grain="turned" /></mesh>)}
  </group>
}
/** 立式容器（分离器）：椭圆封头、裙座、液位计、顶上和侧面的接管、一圈平台 */
export function VesselV({ at, r, h, y0 = 1.2, color = '#e3e5e4', cutLiquid }: { at: V3; r: number; h: number; y0?: number; color?: string; cutLiquid?: number }) {
  const geo = useMemo(() => {
    const prof: [number, number][] = [...headPts(r, 0, r * 0.5, -1).reverse(), ...headPts(r, h, r * 0.5, 1)]
    return {
      body: lathe(prof), skirt: shell([[r * 0.96, -y0], [r * 0.96, -r * 0.3]], 0.03),
      plat: mergeParts([...platformParts(r, h + r * 0.5 - 0.2, -0.4, Math.PI + 0.4, 0.9), ...ladderParts(r, Math.PI / 2, -y0 + 0.1, h + r * 0.5 - 0.2)]),
      lg: mergeParts([box(r + 0.25, h * 0.15, 0, 0.12, h * 0.5, 0.12, '#5d6366'), box(r + 0.12, h * 0.17, 0, 0.26, 0.08, 0.08, '#5d6366'), box(r + 0.12, h * 0.63, 0, 0.26, 0.08, 0.08, '#5d6366')]),
    }
  }, [r, h, y0])
  return <group position={[at[0], y0, at[2]]}>
    <mesh geometry={geo.skirt} castShadow receiveShadow><Paint color="#787d80" /></mesh>
    <mesh geometry={geo.body} castShadow receiveShadow><Paint color={color} rough={0.42} /></mesh>
    <mesh geometry={geo.plat} castShadow><Painted rough={0.55} metal={0.2} /></mesh>
    <mesh geometry={geo.lg} castShadow><Painted rough={0.4} metal={0.5} /></mesh>
    {cutLiquid !== undefined && <mesh position={[r + 0.25, h * 0.15 + h * 0.5 * cutLiquid / 2, 0.065]}><boxGeometry args={[0.06, h * 0.5 * cutLiquid, 0.01]} /><meshBasicMaterial color="#9ad8ff" toneMapped={false} /></mesh>}
    <mesh position={[0, h + r * 0.5 + 0.3, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.6, 20]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[-r - 0.3, h * 0.6, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.24, 0.24, 0.6, 20]} /><Metal kind="steel" grain="turned" /></mesh>
  </group>
}

/** 离心压缩机的一段机壳：筒形（筒体两头带厚法兰）、上面进出口两根粗接管，底下撑脚。轴沿 x */
function Casing({ x, len, r, color }: { x: number; len: number; r: number; color: string }) {
  const g = useMemo(() => ({ body: lathe([[r * 0.85, -len / 2], [r * 1.12, -len / 2], [r * 1.12, -len / 2 + 0.14], [r, -len / 2 + 0.2], [r, len / 2 - 0.2], [r * 1.12, len / 2 - 0.14], [r * 1.12, len / 2], [r * 0.85, len / 2]]), nb: bolts(20, r * 1.05, 0.06, 0.06) }), [len, r])
  return <group position-x={x}>
    <group rotation-z={Math.PI / 2}>
      <mesh geometry={g.body} castShadow receiveShadow><Paint color={color} rough={0.35} /></mesh>
      {[-1, 1].map(s => <mesh key={s} geometry={g.nb} position-y={s * len / 2} rotation-x={s < 0 ? Math.PI : 0} castShadow><Metal kind="steel" grain="cast" /></mesh>)}
    </group>
    {[-0.25, 0.25].map(k => <group key={k}><mesh position={[k * len, r + 0.45, 0]} castShadow><cylinderGeometry args={[r * 0.42, r * 0.42, 0.9, 24]} /><Paint color={color} /></mesh><mesh position={[k * len, r + 0.92, 0]} castShadow><cylinderGeometry args={[r * 0.58, r * 0.58, 0.1, 24]} /><Paint color={color} /></mesh></group>)}
    <mesh position={[0, -r * 0.8, 0]} castShadow><boxGeometry args={[len * 0.8, 0.3, r * 1.9]} /><meshStandardMaterial color="#3d4246" roughness={0.6} metalness={0.4} /></mesh>
  </group>
}
/** 合成气压缩机厂房：钢框架、彩钢屋面、三面墙；里面一层混凝土机组平台，上面是汽轮机加两段压缩机缸，顶上一台桥式起重机 */
export function CompressorHouse() {
  const { x, z } = LOOPX.comp, W = 18, D = 12, H = 14, deck = 4.2
  const tex = useMemo(() => ({ clad: rep(cladTex(), 6, 2), side: rep(cladTex(), 4, 2), sign: makeSign(['合成气压缩机厂房'], '#2b5f86', '#ffffff', 640, 96) }), [])
  const frame = useMemo(() => {
    const P: Part[] = []
    for (let i = 0; i <= 3; i++) for (const zz of [-D / 2, D / 2]) P.push(box(-W / 2 + i * W / 3, 0, zz, 0.45, H, 0.45, '#2e6b94'))
    for (const zz of [-D / 2, D / 2]) P.push(box(0, H - 0.6, zz, W, 0.6, 0.4, '#2e6b94'), box(0, 10.5, zz, W, 0.5, 0.7, '#2e6b94'))
    P.push(box(0, 10.9, 0, 0.6, 0.8, D - 0.4, '#e0b12a'), box(0, 10.1, 0.6, 1.2, 0.8, 1.2, '#2f3337'))   // 桥式起重机
    // 混凝土机组平台：一块厚板，下面一排柱子
    P.push(box(0, deck - 0.8, 0, W - 2, 0.8, 5, '#b7b3aa'))
    for (const xx of [-7, -2.4, 2.4, 7]) for (const zz of [-1.9, 1.9]) P.push(box(xx, 0, zz, 0.8, deck - 0.8, 0.8, '#b0aca3'))
    // 平台上的栏杆
    for (const zz of [-2.5, 2.5]) for (const yy of [0.55, 1.05]) P.push(box(0, deck + yy, zz, W - 2, 0.05, 0.05, '#d9a51c'))
    for (let xx = -W / 2 + 1; xx <= W / 2 - 1; xx += 1.6) for (const zz of [-2.5, 2.5]) P.push(box(xx, deck, zz, 0.05, 1.1, 0.05, '#d9a51c'))
    // 汽轮机（深绿罩壳）、联轴器罩、油站
    P.push(box(-5.6, deck, 0, 3.4, 2.2, 2.6, '#3e6b54'), box(-5.6, deck + 2.2, 0, 3.0, 0.5, 2.2, '#36604a'), box(-3.5, deck + 0.5, 0, 0.8, 0.9, 0.9, '#d9a51c'), box(4, 0, 4.2, 3, 1.6, 1.6, '#3e6b54'))
    return mergeParts(P)
  }, [])
  return <group position={[x, 0, z]}>
    <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.55} metal={0.15} /></mesh>
    {/* 屋面、背墙、两侧山墙（上半截是彩钢板、下半截敞着通风） */}
    <mesh position={[0, H + 0.1, 0]} castShadow receiveShadow><boxGeometry args={[W + 0.6, 0.2, D + 0.8]} /><meshStandardMaterial map={tex.clad} color="#8ea2b4" roughness={0.6} metalness={0.3} /></mesh>
    <mesh position={[0, H / 2 + 2, -D / 2 - 0.1]} castShadow receiveShadow><boxGeometry args={[W, H - 4, 0.12]} /><meshStandardMaterial map={tex.clad} roughness={0.7} metalness={0.25} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 + 0.1), H / 2 + 3.5, 0]} castShadow receiveShadow><boxGeometry args={[0.12, H - 7, D]} /><meshStandardMaterial map={tex.side} roughness={0.7} metalness={0.25} /></mesh>)}
    {/* 外墙细部：背墙和山墙上一条通长的采光窗、墙面横向檩条分格；山墙一樘卷帘门和门上的雨棚；屋顶一排筒形风机 */}
    {[H - 3.2].map(y => <mesh key={y} position={[0, y, -D / 2 - 0.02]}><planeGeometry args={[W - 1, 1.3]} /><meshPhysicalMaterial color="#3b5566" roughness={0.1} metalness={0.4} clearcoat={1} /></mesh>)}
    {[5.5, 8.2].map(y => <mesh key={y} position={[0, y, -D / 2 - 0.02]}><boxGeometry args={[W, 0.12, 0.08]} /><meshStandardMaterial color="#8d969c" roughness={0.6} /></mesh>)}
    {[-1, 1].map(s => <group key={s} position={[s * (W / 2 + 0.17), 0, 0]} rotation-y={s * Math.PI / 2}>
      <mesh position={[0, H - 3.2, 0]}><planeGeometry args={[D - 1.5, 1.2]} /><meshPhysicalMaterial color="#3b5566" roughness={0.1} metalness={0.4} clearcoat={1} /></mesh>
      {s > 0 && <><mesh position={[0, 2.6, 0.01]}><planeGeometry args={[4, 5.2]} /><meshStandardMaterial color="#c9ced1" roughness={0.6} metalness={0.3} /></mesh>
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[0, 0.25 + i * 0.42, 0.02]}><boxGeometry args={[4, 0.03, 0.02]} /><meshStandardMaterial color="#9aa1a5" /></mesh>)}
        <mesh position={[0, 5.5, 0.7]} castShadow><boxGeometry args={[5, 0.12, 1.4]} /><meshStandardMaterial color="#8ea2b4" roughness={0.5} metalness={0.4} /></mesh></>}
    </group>)}
    {[-6, -2, 2, 6].map(xx => <group key={xx} position={[xx, H + 0.2, 0]}><mesh position-y={0.5} castShadow><cylinderGeometry args={[0.55, 0.62, 1, 24]} /><Metal kind="aluminum" grain="brushed" rough={0.4} /></mesh><mesh position-y={1.12} castShadow><coneGeometry args={[0.8, 0.35, 24]} /><Metal kind="aluminum" rough={0.45} /></mesh></group>)}
    <mesh position={[0, H - 1.0, D / 2 + 0.25]}><planeGeometry args={[6, 0.9]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
    <group position={[0, deck + 1.0, 0]}>
      <Casing x={-0.6} len={3.4} r={0.85} color="#4b7da4" />
      <Casing x={3.6} len={3.0} r={0.75} color="#4b7da4" />
      <mesh position={[1.5, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 1.4, 16]} /><Metal kind="steel" grain="turned" /></mesh>
    </group>
  </group>
}
/** 循环压缩机：一台小一些的离心机组，放在一块混凝土基础上，带电机 */
export function RecycleComp() {
  const { x, z } = LOOPX.rc
  return <group position={[x, 0, z]}>
    <mesh position-y={0.4} castShadow receiveShadow><boxGeometry args={[7, 0.8, 2.8]} /><meshStandardMaterial color="#b3afa6" roughness={0.9} /></mesh>
    <group position-y={1.6}>
      <Casing x={1.2} len={2.4} r={0.6} color="#4b7da4" />
      <mesh position={[-1.7, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.75, 0.75, 2.2, 32]} /><Paint color="#3e6b54" /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-1.7 - 1 + i * 0.18, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.8, 0.8, 0.04, 32]} /><Paint color="#365d48" /></mesh>)}
    </group>
  </group>
}

/** 管廊：钢柱、两层横梁，上面一排排管子 */
function rackParts() {
  const P: Part[] = []
  for (let x = RACK.x0; x <= RACK.x1; x += 6) {
    for (const dz of [-1.4, 1.4]) P.push(box(x, 0, RACK.z + dz, 0.32, RACK.y[1] + 0.3, 0.32, '#7c8388'), box(x, 0, RACK.z + dz, 0.8, 0.25, 0.8, '#a9a59c'))
    for (const y of RACK.y) P.push(box(x, y - 0.3, RACK.z, 0.26, 0.3, 3.1, '#7c8388'))
  }
  for (const y of RACK.y) for (const dz of [-1.4, 1.4]) P.push(box((RACK.x0 + RACK.x1) / 2, y - 0.3, RACK.z + dz, RACK.x1 - RACK.x0, 0.3, 0.18, '#7c8388'))
  return P
}
const rackPipes: { y: number; dz: number; r: number; c: string }[] = [
  { y: 6, dz: -1.0, r: 0.24, c: '#d5d8da' }, { y: 6, dz: -0.35, r: 0.16, c: '#5b86c4' }, { y: 6, dz: 0.3, r: 0.2, c: '#c9ccce' }, { y: 6, dz: 0.95, r: 0.12, c: '#d6b33a' },
  { y: 8.5, dz: -0.9, r: 0.3, c: '#d5d8da' }, { y: 8.5, dz: -0.1, r: 0.18, c: '#8fb4d8' }, { y: 8.5, dz: 0.7, r: 0.22, c: '#c9ccce' },
]

/** 合成回路的工艺管道：每段一条折线、半径、颜色 */
export const LOOP_PIPES: { id: string; pts: V3[]; r: number; c: string }[] = [
  // 压缩机出口 → 合成塔上部进口（从塔的东侧上去）
  { id: 'feed', pts: [[-2.4, 6.1, -10], [-2.4, 9.5, -10], [18.4, 9.5, -10], [18.4, 18.6, -10], [18.4, 18.6, -6], [CV.x + CV.ro + 1.0, 18.6, -6]], r: 0.3, c: '#d5d8da' },
  // 合成塔下部出口 → 水冷器
  { id: 'out', pts: [[CV.x - CV.ro - 1.0, 3.4, -6], [CV.x - CV.ro - 2.2, 3.4, -6], [CV.x - CV.ro - 2.2, 3.4, -1.2], [LOOPX.wc.x - 3.0, 3.4, -1.2], [LOOPX.wc.x - 3.0, 2.4, -1.2]], r: 0.3, c: '#c9ccce' },
  // 水冷器 → 氨冷器
  { id: 'wc', pts: [[LOOPX.wc.x + 2.9, 2.2, -1.2], [LOOPX.ac.x - 2.4, 2.2, -1.2]], r: 0.28, c: '#c9ccce' },
  // 氨冷器 → 分离器
  { id: 'ac', pts: [[LOOPX.ac.x + 2.4, 2.2, -1.2], [LOOPX.sep.x, 2.2, -1.2], [LOOPX.sep.x, 2.2, -4.6], [LOOPX.sep.x, 5.8, -4.6], [LOOPX.sep.x, 5.8, -5.1]], r: 0.26, c: '#c9ccce' },
  // 分离器顶 → 循环压缩机
  { id: 'gas', pts: [[LOOPX.sep.x, 10.8, -6], [LOOPX.sep.x, 11.6, -6], [LOOPX.rc.x + 1.2, 11.6, -6], [LOOPX.rc.x + 1.2, 11.6, -13], [LOOPX.rc.x + 1.2, 3.2, -13]], r: 0.26, c: '#d5d8da' },
  // 循环压缩机 → 管廊上层 → 回到压缩机厂房
  { id: 'back', pts: [[LOOPX.rc.x - 1.6, 2.2, -13], [LOOPX.rc.x - 4, 2.2, -13], [LOOPX.rc.x - 4, 2.2, -17.4], [LOOPX.rc.x - 4, 8.8, -17.4], [-1, 8.8, -17.4], [-1, 8.8, -11], [-1, 6.4, -11]], r: 0.24, c: '#d5d8da' },
  // 分离器底 → 液氨去罐区
  { id: 'liq', pts: [[LOOPX.sep.x, 1.0, -6], [LOOPX.sep.x, 0.6, -6], [LOOPX.sep.x + 2, 0.6, -6], [LOOPX.sep.x + 2, 6.0, -6], [LOOPX.sep.x + 2, 6.0, -2.4], [TANK.x - TANK.r - 1.5, 6.0, -2.4], [TANK.x - TANK.r - 1.5, 6.0, TANK.z], [TANK.x - TANK.r + 0.2, 6.0, TANK.z]], r: 0.14, c: '#8fb4d8' },
]
export function LoopPipes() {
  const geo = useMemo(() => {
    const byC = new Map<string, THREE.BufferGeometry[]>()
    for (const p of LOOP_PIPES) { const g = pipeGeo(p.pts, p.r); const list = byC.get(p.c) ?? []; list.push(g); byC.set(p.c, list) }
    for (const rp of rackPipes) { const g = new THREE.CylinderGeometry(rp.r, rp.r, RACK.x1 - RACK.x0, 16); g.rotateZ(Math.PI / 2); g.translate((RACK.x0 + RACK.x1) / 2, rp.y + rp.r - 0.15, RACK.z + rp.dz); const l = byC.get(rp.c) ?? []; l.push(g); byC.set(rp.c, l) }
    return [...byC.entries()].map(([c, gs]) => ({ c, gs }))
  }, [])
  const rack = useMemo(() => mergeParts(rackParts()), [])
  return <>
    <mesh geometry={rack} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
    {geo.map(({ c, gs }) => gs.map((g, i) => <mesh key={c + i} geometry={g} castShadow receiveShadow><meshStandardMaterial color={c} roughness={0.42} metalness={0.45} /></mesh>))}
  </>
}

/** 液氨储罐：双层壁的立式常压罐，外面是保温层的铝皮，拱顶，一圈盘梯，围堰 */
export function AmmoniaTank({ fill = 0.6 }: { fill?: number }) {
  const { x, z, r, h } = TANK
  const tex = useMemo(() => ({ jacket: rep(jacketTex(), 24, 6), sign: warnSign('液氨 · 当心中毒') }), [])
  const geo = useMemo(() => {
    const domeH = r * 0.2
    const body = lathe([[0, 0], [r, 0], [r, h], ...Array.from({ length: 12 }, (_, i) => { const a = (i + 1) / 12 * Math.PI / 2; return [r * Math.cos(a), h + domeH * Math.sin(a)] as [number, number] })])
    const P: Part[] = []
    for (let k = 0; k < 26; k++) { const a = Math.PI * (0.1 + k * 0.045), y = 0.4 + k * (h - 0.4) / 26; P.push({ p: [Math.cos(a) * (r + 0.55), y, -Math.sin(a) * (r + 0.55)], s: [0.9, 0.06, 0.4], c: '#7b7f82', r: [0, a, 0] }, { p: [Math.cos(a) * (r + 1.0), y + 0.55, -Math.sin(a) * (r + 1.0)], s: [0.04, 1.1, 0.04], c: '#d9a51c' }) }
    for (const [w, d, bx, bz] of [[2 * r + 9, 0.4, 0, -(r + 4.5)], [2 * r + 9, 0.4, 0, r + 4.5], [0.4, 2 * r + 9, -(r + 4.5), 0], [0.4, 2 * r + 9, r + 4.5, 0]] as const) P.push(box(bx, 0, bz, w, 1.2, d, '#a9a59c'))
    P.push(...platformParts(r * 0.55, h + domeH * 0.9, 0, Math.PI * 2, 0.8))
    return { body, parts: mergeParts(P) }
  }, [r, h])
  void fill
  return <group position={[x, 0, z]}>
    <mesh geometry={geo.body} castShadow receiveShadow><meshStandardMaterial map={tex.jacket} color="#e2e4e5" metalness={0.5} roughness={0.42} envMapIntensity={0.8} /></mesh>
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.6} metal={0.25} /></mesh>
    <mesh position={[0, 0.2, 0]} receiveShadow><cylinderGeometry args={[r + 0.6, r + 0.8, 0.4, 64]} /><meshStandardMaterial color="#b4b0a7" roughness={0.9} /></mesh>
    <mesh position={[0, 3.2, r + 0.02]}><planeGeometry args={[5, 1.95]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
  </group>
}
/** 尿素造粒塔：方形的混凝土高塔，顶上一层造粒机房；侧面一条斜的输送栈桥通到下面的散装库 */
export function PrillTower() {
  const { x, z, w, h } = PRILL
  const tex = useMemo(() => ({ sign: makeSign(['尿素造粒塔'], '#2b5f86', '#ffffff', 640, 128) }), [])
  const geo = useMemo(() => {
    const R = w * 0.5
    const body = lathe([[0, 0], [R + 0.6, 0], [R + 0.6, 1.2], [R, 1.4], [R, h], [R + 1.2, h], [R + 1.2, h + 6], [R * 0.5, h + 7.5], [3, h + 7.5], [3, h + 10], [0, h + 10]], { segs: 64 })
    const P: Part[] = []
    for (let y = 8; y < h; y += 8) P.push({ p: [0, y, 0], s: [R + 0.12, 0.35, R + 0.12], c: '#bdb8ae', cyl: true })
    // 塔边的楼梯间（方形混凝土）、塔下的出料皮带廊和散装库
    P.push(box(R + 2.4, 0, 0, 4.6, h + 4, 4.6, '#cfcac0'))
    for (let y = 4; y < h; y += 4) P.push(box(R + 4.75, y, 0, 0.08, 1.6, 1.2, '#3e4a52'))
    P.push(box(0, h - 0.4, 0, 0.6, 0.6, 0.6, '#cfcac0'))
    P.push(box(R + 20, 0, -12, 22, 10, 14, '#c9c6bd'))
    for (let i = 0; i < 5; i++) P.push(box(R + 4 + i * 3.4, 0, -12 + 0, 0.35, 2 + i * 1.6, 0.35, '#7c8388'))
    P.push({ p: [R + 10, 6.5, -12], s: [18, 1.6, 2.2], c: '#a9b0b4', r: [0, 0, 0.4] })
    return { body, parts: mergeParts(P) }
  }, [w, h])
  return <group position={[x, 0, z]}>
    <mesh geometry={geo.body} castShadow receiveShadow><meshStandardMaterial color="#d4d0c6" roughness={0.92} /></mesh>
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.85} metal={0.05} /></mesh>
    <mesh position={[0, h - 6, w * 0.5 + 0.06]}><planeGeometry args={[9, 1.8]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
  </group>
}

/** 远处：冷却塔、火炬、几排厂房、球罐，让厂区有纵深 */
export function Distant() {
  const geo = useMemo(() => {
    const P: Part[] = [], r = rng(77)
    for (let i = 0; i < 14; i++) { const w = 30 + r() * 50, hh = 6 + r() * 10, xx = -160 + i * 32 + r() * 10, zz = -180 - r() * 60; P.push(box(xx, 0, zz, w, hh, 20 + r() * 20, r() < 0.5 ? '#5f666b' : '#6b6a63')) }
    for (let i = 0; i < 6; i++) P.push(box(-40 + i * 9, 0, -56, 7, 10, 18, '#7d868b'), box(-40 + i * 9, 1, -46.95, 6.2, 4, 0.1, '#4a5257'))   // 机械通风冷却塔的格子
    for (let i = 0; i < 6; i++) P.push(cyl(-40 + i * 9, 10, -56, 3, 2.4, '#8d9498'))
    // 厂区路灯、消火栓、分析小屋、变电所
    for (let x = -60; x <= 110; x += 16) P.push(cyl(x, 0, 11, 0.09, 9, '#9aa0a4'), box(x, 9, 10.6, 0.3, 0.14, 1.0, '#5b6064'))
    for (const x of [-8, 10, 26, 44, 58]) P.push(cyl(x, 0, 6, 0.16, 0.9, '#b8322a'), cyl(x, 0.9, 6, 0.2, 0.16, '#b8322a'))
    P.push(box(6, 0, 1.5, 3.2, 2.8, 2.4, '#d8d4ca'), box(6, 2.8, 1.5, 3.5, 0.2, 2.7, '#8f948f'))
    P.push(box(-14, 0, -30, 12, 6, 8, '#cfcac0'), box(-14, 6, -30, 12.6, 0.3, 8.6, '#8f948f'))
    for (let i = 0; i < 3; i++) P.push(box(-18 + i * 4, 0, -24.5, 2.6, 3, 2, '#6f7a74'))
    return mergeParts(P)
  }, [])
  const tower = useMemo(() => lathe([[0, 0], [34, 0], [26, 50], [22, 78], [24, 96], [23.4, 96], [21.4, 78], [25.4, 50], [33.4, 0.6], [0, 0.6]]), [])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.85} metal={0.1} /></mesh>
    {/* 双曲线冷却塔（自然通风）和火炬 */}
    <mesh geometry={tower} position={[30, 0, -230]} receiveShadow><meshStandardMaterial color="#bdb9b0" roughness={0.95} side={THREE.DoubleSide} /></mesh>
    <group position={[95, 0, -110]}>
      <mesh position-y={30}><cylinderGeometry args={[0.6, 0.8, 60, 16]} /><meshStandardMaterial color="#9aa0a4" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position-y={61}><coneGeometry args={[0.8, 3.2, 12, 1, true]} /><meshBasicMaterial color="#ffae55" transparent opacity={0.85} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
    </group>
    {/* 两个氨球罐 */}
    {[[76, -38], [85, -38]].map(([sx, sz]) => <group key={sx} position={[sx, 0, sz]}>
      <mesh position-y={6.2} castShadow><sphereGeometry args={[3.6, 40, 24]} /><Paint color="#e6e7e6" rough={0.4} /></mesh>
      {Array.from({ length: 8 }, (_, k) => <mesh key={k} position={[Math.cos(k / 8 * 6.283) * 3.2, 3, Math.sin(k / 8 * 6.283) * 3.2]} castShadow><cylinderGeometry args={[0.16, 0.16, 6, 10]} /><Paint color="#d9dbdb" /></mesh>)}
    </group>)}
  </group>
}

/** 整个合成区和罐区 */
export function Plant({ cut, temp, flow, speed }: { cut: boolean; temp: number; flow: number; speed: number }) {
  return <>
    <Converter cut={cut} temp={temp} flow={flow} speed={speed} />
    <CompressorHouse />
    <HxH at={[LOOPX.wc.x, 2.2, LOOPX.wc.z]} len={5.2} r={0.75} />
    <HxH at={[LOOPX.ac.x, 2.2, LOOPX.ac.z]} len={4.2} r={0.7} color="#cfd8de" />
    <VesselV at={[LOOPX.sep.x, 0, LOOPX.sep.z]} r={1.1} h={8} />
    <RecycleComp />
    <LoopPipes />
    <AmmoniaTank />
    <PrillTower />
    <Distant />
  </>
}
