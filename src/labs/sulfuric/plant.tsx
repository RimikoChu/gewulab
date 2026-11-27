// 硫酸厂的工艺设备：沸腾炉、旋风除尘器、电除尘器、洗涤塔、干燥塔、二氧化硫鼓风机、热交换器、接触室、吸收塔、尾气吸收塔，
// 以及把它们按流程接起来的工艺管道。沸腾炉、热交换器、接触室、吸收塔可以朝镜头剖开看里面。单位 m，x 轴自西向东是流程方向。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { Metal, Painted, bolts, disc, lathe, mergeParts, shell, type Part } from '@/lab-kit'
import { brickTex, catalystTex, gratingTex, hatchTex, jacketTex, packingTex, paintTex, rep } from './mats'
import { backHalf, box, cyl, deckGeo, frontHalf, headPts, ladderParts, latheArc, pipeGeo, platformParts, type RY, type V3 } from './parts'

// ---------- 各设备的位置和尺寸 ----------
/** 沸腾炉：下段半径 r、扩大段半径 R、内衬厚 t；风室底、分布板、锥段起止、筒顶的高度 */
export const ROAST = { x: -16, z: 0, r: 2.4, R: 3.3, t: 0.36, yw: 1.6, yg: 3.6, ya: 10.0, yb: 11.8, y1: 17.2 } as const
export const CYC = { x: -6.5, z: 0 } as const
export const ESP = { x: 2.5, z: 0, w: 5, y0: 5.2, y1: 11, d: 5.2 } as const
export const SCRUB = { x: 12.5, z: 0, r: 1.5, y0: 1.6, y1: 14 } as const
export const DRY = { x: 20.5, z: 0, r: 1.7, y0: 1.6, y1: 15 } as const
export const BLOW = { x: 28.9, z: 3 } as const
/** 热交换器：上下管板的高度 */
export const HXV = { x: 36, z: 0, r: 1.5, y0: 2.4, y1: 12.8, s0: 3.7, s1: 11.5 } as const
/** 接触室：四层催化剂的上下沿（从上往下数第一到第四段） */
export const CONV = { x: 47, z: 0, r: 4, t: 0.22, y0: 3.0, y1: 16.4, beds: [[13.7, 14.6], [10.7, 11.6], [7.7, 8.6], [4.7, 5.6]] } as const
/** 吸收塔：填料层、分酸管、除沫层、塔底酸面的高度 */
export const ABS = { x: 62, z: 0, r: 2.3, y0: 1.6, y1: 18.5, pack: [5.4, 12.6], spray: 14.2, demist: 16.4, pool: 3.0 } as const
export const TAIL = { x: 71, z: 0, r: 1.5, y0: 1.6, y1: 12.6 } as const
export const STACK = { x: 79, z: -5, h: 46 } as const
export const RACK = { z: -13, x0: -10, x1: 88, y: [6.6, 9.1] } as const

// ---------- 材质 ----------
export type MatP = { color?: string; map?: THREE.Texture; metalness?: number; roughness?: number; envMapIntensity?: number; emissive?: THREE.Color | string }
/** 漆过的钢板：带焊缝和流痕的贴图，按米铺 */
const usePaint = (color: string, seed = 3): MatP => useMemo(() => ({ map: rep(paintTex(color, seed), 0.45, 0.4), roughness: 0.55, metalness: 0.25 }), [color, seed])
const useJacket = (): MatP => useMemo(() => ({ map: rep(jacketTex(), 0.5, 0.8), color: '#b9bec2', metalness: 0.6, roughness: 0.46, envMapIntensity: 0.7 }), [])
const useHatch = (): MatP => useMemo(() => ({ map: rep(hatchTex(), 3, 3), roughness: 0.7, metalness: 0.2 }), [])
const Paint = ({ color, rough = 0.5 }: { color: string; rough?: number }) => <meshPhysicalMaterial color={color} roughness={rough} metalness={0.2} clearcoat={0.35} clearcoatRoughness={0.4} />

// ---------- 通用零件 ----------
/** 给外壁的截面线（从下往上）向里收 t，合成一个闭合的截面多边形 */
export function wallPoly(outer: RY[], t: number): RY[] {
  const n = outer.length, sn: RY[] = []
  for (let i = 0; i < n - 1; i++) { const dr = outer[i + 1][0] - outer[i][0], dy = outer[i + 1][1] - outer[i][1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]) }
  const inner: RY[] = outer.map(([r, y], i) => {
    const a = sn[Math.max(0, i - 1)], b = sn[Math.min(n - 2, i)], k = t / Math.max(0.25, 1 + a[0] * b[0] + a[1] * b[1])
    return [r < 1e-9 ? 0 : Math.max(0, r - (a[0] + b[0]) * k), y - (a[1] + b[1]) * k]
  })
  return [...outer, ...inner.reverse()]
}
/** 一层有厚度的壳，分前后两半：cut 时只留后半边，露出剖面。skin 是壳面的材质，section 是剖面的材质 */
export function Vessel({ outer, t, cut = false, skin, section, segs = 44 }: { outer: RY[]; t: number; cut?: boolean; skin: MatP; section: MatP; segs?: number }) {
  const g = useMemo(() => { const p = wallPoly(outer, t); return [backHalf(p, segs), frontHalf(p, segs)] }, [outer, t, segs])
  const mats = <><meshStandardMaterial attach="material-0" {...skin} /><meshStandardMaterial attach="material-1" side={THREE.DoubleSide} {...section} /></>
  return <>
    <mesh geometry={g[0]} castShadow receiveShadow>{mats}</mesh>
    {!cut && <mesh geometry={g[1]} castShadow receiveShadow>{mats}</mesh>}
  </>
}
/** 设备里面一层实心的东西（催化剂层、填料层、隔板）：只画后半边，剖面朝镜头。top 是顶面和侧面的材质，face 是剖面的材质 */
export function Layer({ r0 = 0, r1, ya, yb, top, face }: { r0?: number; r1: number; ya: number; yb: number; top: MatP; face: MatP }) {
  const g = useMemo(() => backHalf([[r0, ya], [r1, ya], [r1, yb], [r0, yb]], 36), [r0, r1, ya, yb])
  return <mesh geometry={g} receiveShadow castShadow><meshStandardMaterial attach="material-0" {...top} /><meshStandardMaterial attach="material-1" side={THREE.DoubleSide} {...face} /></mesh>
}
/** 一段带法兰的接管：从设备壁上的 at 点沿 dir 伸出 len，半径 r */
export function Stub({ at, dir, r, len = 0.7, color = '#8f9498' }: { at: V3; dir: V3; r: number; len?: number; color?: string }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()), [dir])
  const g = useMemo(() => ({ fl: disc(r + 0.16, 0.12, { hole: r * 0.7 }), nb: bolts(Math.max(8, Math.round(r * 28)), r + 0.09, 0.07, 0.05) }), [r])
  return <group position={at} quaternion={q}>
    <mesh position-y={len / 2} castShadow><cylinderGeometry args={[r, r, len, 24]} /><Paint color={color} /></mesh>
    <mesh geometry={g.fl} position-y={len - 0.12} castShadow><Paint color={color} /></mesh>
    <mesh geometry={g.nb} position-y={len} castShadow><Metal kind="steel" grain="cast" /></mesh>
  </group>
}
/** 人孔：一段短接管加一块用螺栓压紧的盲板，朝 dir */
function Manhole({ at, dir, r = 0.42 }: { at: V3; dir: V3; r?: number }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()), [dir])
  const g = useMemo(() => ({ cover: disc(r + 0.14, 0.07), nb: bolts(16, r + 0.07, 0.06, 0.05) }), [r])
  return <group position={at} quaternion={q}>
    <mesh position-y={0.12} castShadow><cylinderGeometry args={[r, r, 0.3, 28]} /><Paint color="#7d8388" /></mesh>
    <mesh geometry={g.cover} position-y={0.27} castShadow><Paint color="#8b9095" /></mesh>
    <mesh geometry={g.nb} position-y={0.34} castShadow><Metal kind="steel" grain="cast" /></mesh>
    <mesh position={[r * 0.5, 0.39, 0]} castShadow><boxGeometry args={[0.05, 0.1, 0.3]} /><Metal kind="steel" grain="cast" /></mesh>
  </group>
}
/** 一组环形平台（只在后半圈和两侧，前面留给剖面）加护笼直梯。levels 是各层平台的高度，r 是该处设备的半径 */
function Plats({ levels, ladder = 0.62, w = 1.0, a0 = -0.3, a1 = Math.PI + 0.3 }: { levels: { y: number; r: number }[]; ladder?: number; w?: number; a0?: number; a1?: number }) {
  const g = useMemo(() => {
    const P: Part[] = []
    levels.forEach((l, i) => { P.push(...platformParts(l.r, l.y, a0, a1, w)); P.push(...ladderParts(l.r, Math.PI * (ladder + (i % 2) * 0.06), i ? levels[i - 1].y : 0.3, l.y)) })
    return { parts: mergeParts(P), decks: levels.map(l => deckGeo(l.r, l.y, a0, a1, w)) }
  }, [levels, ladder, w, a0, a1])
  const grate = useMemo(() => rep(gratingTex(), 4, 1), [])
  return <>
    <mesh geometry={g.parts} castShadow><Painted rough={0.55} metal={0.2} /></mesh>
    {g.decks.map((d, i) => <mesh key={i} geometry={d} castShadow receiveShadow><meshStandardMaterial attach="material-0" map={grate} color="#c9c9c0" roughness={0.7} metalness={0.4} /><meshStandardMaterial attach="material-1" color="#6a6a62" /></mesh>)}
  </>
}
/** 环焊缝和加强圈：在各个高度套一道窄环（整圈；剖开时只留后半圈） */
function Rings({ ys, r, cut, h = 0.1, out = 0.07, color = '#9aa0a4' }: { ys: number[]; r: number; cut: boolean; h?: number; out?: number; color?: string }) {
  const g = useMemo(() => ys.map(y => { const p: RY[] = [[r, y], [r + out, y], [r + out, y + h], [r, y + h]]; return [backHalf(p), frontHalf(p)] }), [ys, r, h, out])
  const m = <><meshStandardMaterial attach="material-0" color={color} metalness={0.5} roughness={0.5} /><meshStandardMaterial attach="material-1" color={color} /></>
  return <>{g.map((p, i) => <group key={i}><mesh geometry={p[0]} castShadow>{m}</mesh>{!cut && <mesh geometry={p[1]} castShadow>{m}</mesh>}</group>)}</>
}
/** 裙座：一圈薄钢板，下面一道基础环，开一个检修孔 */
function Skirt({ r, y0, color = '#6e7478' }: { r: number; y0: number; color?: string }) {
  const g = useMemo(() => ({ sk: shell([[r * 0.97, 0.3], [r * 0.97, y0]], 0.04), base: disc(r + 0.5, 0.32, { chamfer: 0.05 }), ring: disc(r + 0.16, 0.08, { hole: r * 0.9 }), nb: bolts(Math.round(r * 10), r + 0.08, 0.09, 0.07) }), [r, y0])
  return <>
    <mesh geometry={g.base} receiveShadow castShadow><meshStandardMaterial color="#a8a59d" roughness={0.92} /></mesh>
    <mesh geometry={g.sk} castShadow receiveShadow><Paint color={color} /></mesh>
    <mesh geometry={g.ring} position-y={0.32} castShadow><Paint color={color} /></mesh>
    <mesh geometry={g.nb} position-y={0.4} castShadow><Metal kind="steel" grain="cast" /></mesh>
  </>
}
/** 塔的外形：下封头、筒体、上封头（椭圆封头）的截面线，从底部轴线走到顶部轴线 */
const towerOuter = (r: number, y0: number, y1: number, k = 0.3): RY[] => [...headPts(r, y0, r * k, -1).reverse(), ...headPts(r, y1, r * k, 1)]

// ---------- 沸腾炉 ----------
const ROAST_OUT: RY[] = [[0, ROAST.yw - 0.5], ...headPts(ROAST.r, ROAST.yw, 0.5, -1, 6).reverse().slice(1), [ROAST.r, ROAST.ya], [ROAST.R, ROAST.yb], ...headPts(ROAST.R, ROAST.y1, 1.5, 1)]
const ROAST_IN: RY[] = [[ROAST.r - 0.06, ROAST.yg + 0.1], [ROAST.r - 0.06, ROAST.ya - 0.02], [ROAST.R - 0.06, ROAST.yb - 0.02], ...headPts(ROAST.R - 0.06, ROAST.y1, 1.44, 1)]
/** 沸腾炉：钢壳里面砌耐火砖。底下是风室，分布板上一排排风帽；上面是扩大段。cut 时朝镜头剖开 */
export function Roaster({ cut = false, children }: { cut?: boolean; children?: ReactNode }) {
  const R = ROAST, red = usePaint('#96503c', 5), hatch = useHatch()
  const brick = useMemo<MatP>(() => ({ map: rep(brickTex(), 1.2, 1.6), color: '#b59c84', roughness: 0.9 }), [])
  const g = useMemo(() => {
    const P: Part[] = []
    // 八根混凝土柱和一道环梁托着炉体
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; P.push(box(Math.cos(a) * (R.r + 0.25), 0, Math.sin(a) * (R.r + 0.25), 0.55, R.yw + 0.5, 0.55, '#b3afa6', [0, -a, 0])) }
    // 风帽：分布板后半边上一排排小圆帽
    const caps: Part[] = []
    for (let x = -R.r + 0.5; x <= R.r - 0.5; x += 0.42) for (let z = -0.22; z > -R.r + 0.5; z -= 0.42) if (x * x + z * z < (R.r - 0.6) ** 2) caps.push(cyl(x, R.yg, z, 0.05, 0.16, '#5d5f62'), cyl(x, R.yg + 0.16, z, 0.1, 0.07, '#6c6e72'))
    return { legs: mergeParts(P), caps: mergeParts(caps), beam: disc(R.r + 0.62, 0.5, { hole: R.r - 0.1, chamfer: 0.04 }) }
  }, [R])
  const levels = useMemo(() => [{ y: 6.0, r: R.r }, { y: 12.2, r: R.R }, { y: 16.8, r: R.R }], [R])
  return <group position={[R.x, 0, R.z]}>
    <mesh geometry={g.legs} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
    <mesh geometry={g.beam} position-y={R.yw + 0.3} castShadow receiveShadow><meshStandardMaterial color="#b0aca3" roughness={0.9} /></mesh>
    <Vessel outer={ROAST_OUT} t={0.06} cut={cut} skin={red} section={hatch} />
    <Vessel outer={ROAST_IN} t={R.t} cut={cut} skin={brick} section={brick} />
    <Rings ys={[R.yg - 0.1, 5.9, R.ya - 0.14]} r={R.r} cut={cut} out={0.09} color="#7d4333" />
    <Rings ys={[R.yb + 0.02, 14.4, R.y1 - 0.1]} r={R.R} cut={cut} out={0.09} color="#7d4333" />
    {/* 进风口、加料口、排渣口、炉气出口 */}
    <Stub at={[-R.r + 0.05, 2.6, 0]} dir={[-1, 0, 0]} r={0.42} len={0.8} color="#6f98bd" />
    <Stub at={[-R.r + 0.05, 5.4, 0]} dir={[-1, 0.5, 0]} r={0.34} len={1.0} color="#7d4333" />
    <Stub at={[R.r - 0.05, R.yg + 0.9, 0]} dir={[1, -0.7, 0]} r={0.26} len={1.1} color="#7d4333" />
    <Stub at={[R.R - 0.05, 14.8, 0]} dir={[1, 0, 0]} r={0.58} len={0.7} color="#9aa0a4" />
    {!cut && <><Manhole at={[0, 4.6, R.r - 0.02]} dir={[0, 0, 1]} /><Manhole at={[0.9, 13.6, R.R - 0.14]} dir={[0.25, 0, 1]} /></>}
    <Plats levels={levels} ladder={0.2} />
    {cut && <>
      {/* 分布板和风帽；剖面前方补一盏灯，把炉膛照亮 */}
      <Layer r1={R.r - 0.06} ya={R.yg - 0.16} yb={R.yg} top={{ color: '#55585c', metalness: 0.6, roughness: 0.5 }} face={{ color: '#6b6f73', metalness: 0.3, roughness: 0.6 }} />
      <mesh geometry={g.caps} castShadow><Painted rough={0.5} metal={0.5} /></mesh>
    </>}
    {children}
  </group>
}

// ---------- 旋风除尘器 ----------
export function Cyclone() {
  const grey = usePaint('#8f999f', 9)
  const g = useMemo(() => {
    const body = lathe([[0.22, 4.4], [1.3, 8.6], [1.3, 12.0], [1.22, 12.12], [0.6, 12.12], [0.6, 13.3], [0.52, 13.3], [0.52, 12.0], [0, 12.0]], { segs: 40 })
    const P: Part[] = []
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { P.push(box(sx * 1.45, 0, sz * 1.45, 0.26, 8.8, 0.26, '#7c8388'), box(sx * 1.45, 0, sz * 1.45, 0.7, 0.3, 0.7, '#a9a59c')) }
    for (const y of [3.0, 6.0, 8.7]) for (const s of [-1, 1]) P.push(box(0, y, s * 1.45, 3.1, 0.2, 0.18, '#7c8388'), box(s * 1.45, y, 0, 0.18, 0.2, 3.1, '#7c8388'))
    for (const s of [-1, 1]) for (const [ya, yb] of [[0.3, 3.0], [3.2, 6.0]]) P.push({ p: [0, (ya + yb) / 2, s * 1.45], s: [0.1, Math.hypot(2.9, yb - ya), 0.1], c: '#7c8388', r: [0, 0, Math.atan2(2.9, yb - ya) * s] })
    // 灰斗下面的卸灰阀和接灰的小车
    P.push(cyl(0, 3.5, 0, 0.26, 0.9, '#5d6368'), box(0, 3.0, 0, 0.7, 0.5, 0.7, '#3e6b54'), box(0, 0.5, 0, 1.6, 1.0, 1.2, '#4a5560'), cyl(-0.5, 0, 0.62, 0.25, 0.5, '#1d1e20'), cyl(0.5, 0, 0.62, 0.25, 0.5, '#1d1e20'))
    // 切向进口的方管
    P.push(box(-1.0, 10.6, 0.72, 1.9, 1.2, 0.72, '#aab0b4'))
    return { body, frame: mergeParts(P) }
  }, [])
  const levels = useMemo(() => [{ y: 8.9, r: 1.5 }, { y: 12.3, r: 1.3 }], [])
  return <group position={[CYC.x, 0, CYC.z]}>
    <mesh geometry={g.body} castShadow receiveShadow><meshStandardMaterial {...grey} /></mesh>
    <mesh geometry={g.frame} castShadow receiveShadow><Painted rough={0.6} metal={0.25} /></mesh>
    <Plats levels={levels} ladder={0.72} w={0.9} a0={0.1} a1={Math.PI - 0.1} />
  </group>
}

// ---------- 电除尘器 ----------
export function Precipitator() {
  const E = ESP, skin = usePaint('#7f98ab', 11)
  const g = useMemo(() => {
    const P: Part[] = [], hw = E.w / 2, hd = E.d / 2
    // 支架：六根柱子、横梁和斜撑
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) P.push(box(sx * (hw - 0.2), 0, sz * (hd - 0.2), 0.3, E.y0, 0.3, '#7c8388'), box(sx * (hw - 0.2), 0, sz * (hd - 0.2), 0.8, 0.3, 0.8, '#a9a59c'))
    for (const sz of [-1, 1]) { P.push(box(0, 2.6, sz * (hd - 0.2), E.w - 0.4, 0.22, 0.2, '#7c8388')); for (const sx of [-1, 1]) P.push({ p: [sx * (hw - 0.2) / 2, 1.45, sz * (hd - 0.2)], s: [0.1, Math.hypot(hw - 0.2, 2.3), 0.1], c: '#7c8388', r: [0, 0, sx * Math.atan2(hw - 0.2, 2.3)] }) }
    // 壳体外面一道道竖向的加强筋，腰上一道横筋
    for (let x = -hw + 0.3; x <= hw - 0.29; x += 0.55) for (const sz of [-1, 1]) P.push(box(x, E.y0 + 0.1, sz * (hd + 0.06), 0.1, E.y1 - E.y0 - 0.2, 0.12, '#6f879a'))
    for (const sz of [-1, 1]) P.push(box(0, (E.y0 + E.y1) / 2, sz * (hd + 0.1), E.w, 0.16, 0.14, '#647c8f'))
    // 顶上：绝缘子箱、整流变压器、栏杆
    for (const x of [-1.4, 0, 1.4]) for (const z of [-1.3, 1.3]) P.push(box(x, E.y1 + 0.2, z, 0.8, 0.9, 0.8, '#b9c4cc'), cyl(x, E.y1 + 1.1, z, 0.14, 0.5, '#7a3b2a'))
    P.push(box(0, E.y1 + 0.2, 0, 1.4, 1.2, 1.0, '#5d6a74'), cyl(-0.4, E.y1 + 1.4, 0, 0.09, 0.6, '#c9b9a0'), cyl(0.4, E.y1 + 1.4, 0, 0.09, 0.6, '#c9b9a0'))
    for (const sz of [-1, 1]) { for (const yy of [0.75, 1.3]) P.push(box(0, E.y1 + 0.2 + yy, sz * (hd - 0.05), E.w, 0.05, 0.05, '#d9a51c')); for (let x = -hw; x <= hw; x += 1.25) P.push(box(x, E.y1 + 0.2, sz * (hd - 0.05), 0.05, 1.3, 0.05, '#d9a51c')) }
    // 灰斗下面的卸灰阀
    for (const x of [-hw / 2, hw / 2]) P.push(cyl(x, 1.9, 0, 0.2, 0.5, '#5d6368'), box(x, 1.5, 0, 0.6, 0.4, 0.6, '#3e6b54'))
    return { parts: mergeParts(P), hop: new THREE.ConeGeometry(Math.SQRT2 * hw / 2, E.y0 - 2.3, 4, 1), horn: new THREE.ConeGeometry(Math.SQRT2 * 2.2, 1.4, 4, 1, true) }
  }, [E])
  return <group position={[E.x, 0, E.z]}>
    <mesh position-y={(E.y0 + E.y1) / 2} castShadow receiveShadow><boxGeometry args={[E.w, E.y1 - E.y0, E.d]} /><meshStandardMaterial {...skin} map={undefined} color="#7f98ab" /></mesh>
    <mesh position-y={E.y1 + 0.1} castShadow><boxGeometry args={[E.w + 0.3, 0.2, E.d + 0.3]} /><Paint color="#647c8f" /></mesh>
    <mesh geometry={g.parts} castShadow receiveShadow><Painted rough={0.6} metal={0.25} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * E.w / 4, (E.y0 + 2.3) / 2 + 0.02, 0]} scale={[1, 1, E.d / (E.w / 2)]}><mesh geometry={g.hop} rotation={[Math.PI, Math.PI / 4, 0]} castShadow><meshStandardMaterial color="#718a9d" roughness={0.55} metalness={0.25} side={THREE.DoubleSide} /></mesh></group>)}
    {/* 进出口的喇叭口 */}
    {[-1, 1].map(s => <group key={s} position={[s * (E.w / 2 + 0.7), 8, 0]} rotation-z={-s * Math.PI / 2}><mesh geometry={g.horn} rotation-y={Math.PI / 4} castShadow><meshStandardMaterial color="#7891a4" roughness={0.55} metalness={0.25} side={THREE.DoubleSide} /></mesh></group>)}
  </group>
}

// ---------- 塔 ----------
/** 一座立式的塔：裙座、筒体和封头、焊缝、平台和梯子。children 是塔里的内件，只在剖开时画 */
function Tower({ at, r, y0, y1, t = 0.08, skin, cut = false, plats, ladder = 0.62, rings, children, extra }: { at: V3; r: number; y0: number; y1: number; t?: number; skin: MatP; cut?: boolean; plats: number[]; ladder?: number; rings?: number[]; children?: ReactNode; extra?: ReactNode }) {
  const hatch = useHatch()
  const outer = useMemo(() => towerOuter(r, y0, y1), [r, y0, y1])
  const levels = useMemo(() => plats.map(y => ({ y, r })), [plats, r])
  const ys = useMemo(() => rings ?? Array.from({ length: Math.floor((y1 - y0) / 2.4) }, (_, i) => y0 + 1.2 + i * 2.4), [rings, y0, y1])
  return <group position={[at[0], 0, at[2]]}>
    <Skirt r={r} y0={y0 + 0.1} />
    <Vessel outer={outer} t={t} cut={cut} skin={skin} section={hatch} />
    <Rings ys={ys} r={r} cut={cut} h={0.06} out={0.025} color="#a4a9ac" />
    <Plats levels={levels} ladder={ladder} />
    {extra}
    {cut && children}
  </group>
}
/** 洗涤塔和干燥塔（外观）。干燥塔里淋的是浓硫酸，塔脚有一只循环酸槽和泵 */
export function WashTowers() {
  const green = usePaint('#86a68b', 21), cream = usePaint('#bfae82', 23)
  const p1 = useMemo(() => [6.2, 12.6], []), p2 = useMemo(() => [6.6, 13.4], [])
  return <>
    <Tower at={[SCRUB.x, 0, SCRUB.z]} r={SCRUB.r} y0={SCRUB.y0} y1={SCRUB.y1} skin={green} plats={p1} ladder={0.3}
      extra={<><Stub at={[-SCRUB.r + 0.04, 3.2, 0]} dir={[-1, 0, 0]} r={0.5} len={0.5} color="#789a7e" /><Stub at={[0, SCRUB.y1 + SCRUB.r * 0.3 - 0.05, 0]} dir={[0, 1, 0]} r={0.45} len={0.5} color="#789a7e" /><Manhole at={[0, 4.6, SCRUB.r - 0.03]} dir={[0, 0, 1]} /><Manhole at={[0, 10.4, SCRUB.r - 0.03]} dir={[0, 0, 1]} r={0.34} /></>} />
    <Tower at={[DRY.x, 0, DRY.z]} r={DRY.r} y0={DRY.y0} y1={DRY.y1} skin={cream} plats={p2} ladder={0.3}
      extra={<><Stub at={[-DRY.r + 0.04, 3.2, 0]} dir={[-1, 0, 0]} r={0.45} len={0.5} color="#a99a72" /><Stub at={[0, DRY.y1 + DRY.r * 0.3 - 0.05, 0]} dir={[0, 1, 0]} r={0.45} len={0.5} color="#a99a72" /><Manhole at={[0, 4.8, DRY.r - 0.03]} dir={[0, 0, 1]} /><Manhole at={[0, 11.4, DRY.r - 0.03]} dir={[0, 0, 1]} r={0.34} /></>} />
    <PumpTank at={[SCRUB.x + 0.4, 0, 4.4]} color="#3f8f6a" />
    <PumpTank at={[DRY.x + 0.4, 0, 4.4]} color="#b58a3c" />
  </>
}
/** 塔脚的循环槽和泵：一只卧式的小槽、一台离心泵和电机，一根细管沿塔往上 */
function PumpTank({ at, color }: { at: V3; color: string }) {
  const g = useMemo(() => ({ tank: lathe([[0, -1.3], ...headPts(0.7, -1.0, 0.3, -1).reverse().slice(1), ...headPts(0.7, 1.0, 0.3, 1)]), pump: lathe([[0, -0.16], [0.34, -0.16], [0.38, -0.1], [0.38, 0.1], [0.34, 0.16], [0, 0.16]]), motor: lathe([[0, 0], [0.24, 0], [0.26, 0.03], [0.26, 0.62], [0.2, 0.7], [0, 0.7]]) }), [])
  return <group position={at}>
    <mesh position={[0, 0.2, 0]} receiveShadow castShadow><boxGeometry args={[4.2, 0.4, 1.9]} /><meshStandardMaterial color="#aaa69d" roughness={0.9} /></mesh>
    {[-0.6, 0.6].map(x => <mesh key={x} position={[-0.9 + x, 0.65, 0]} castShadow><boxGeometry args={[0.2, 0.5, 1.3]} /><Paint color="#7c8388" /></mesh>)}
    <mesh geometry={g.tank} position={[-0.9, 1.45, 0]} rotation-z={Math.PI / 2} castShadow receiveShadow><Paint color="#d6d3c6" rough={0.45} /></mesh>
    <mesh position={[-0.9, 2.25, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.4, 16]} /><Paint color={color} /></mesh>
    <mesh geometry={g.pump} position={[1.0, 0.78, 0]} rotation-x={Math.PI / 2} castShadow><Paint color={color} rough={0.4} /></mesh>
    <mesh geometry={g.motor} position={[1.0, 0.78, -0.2]} rotation-x={-Math.PI / 2} castShadow><Paint color="#3e5f7c" rough={0.45} /></mesh>
    <mesh position={[1.0, 1.3, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.7, 14]} /><Paint color={color} /></mesh>
    <mesh position={[0.2, 0.78, 0.0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.1, 0.1, 1.1, 14]} /><Paint color={color} /></mesh>
  </group>
}

// ---------- 二氧化硫鼓风机 ----------
export function Blower({ at = [BLOW.x, 0, BLOW.z] as V3, k = 1, color = '#4b7da4' }: { at?: V3; k?: number; color?: string }) {
  const g = useMemo(() => ({
    scroll: lathe([[0, -0.5], [1.2, -0.5], [1.34, -0.4], [1.34, 0.4], [1.2, 0.5], [0, 0.5]], { segs: 44 }),
    inlet: lathe([[0.5, 0], [0.62, 0], [0.62, 0.1], [0.52, 0.16], [0.52, 0.9], [0.66, 0.9], [0.66, 1.0], [0.5, 1.0]], { closed: true }),
    motor: lathe([[0, 0], [0.5, 0], [0.56, 0.06], [0.56, 1.5], [0.42, 1.66], [0, 1.66]]),
    fins: mergeParts(Array.from({ length: 14 }, (_, i) => cyl(0, 0.16 + i * 0.1, 0, 0.6, 0.035, '#365d7c'))),
    base: mergeParts([box(1.2, 0, 0, 6.2, 0.7, 2.6, '#aaa69d'), box(0, 0.7, 0, 1.4, 0.7, 1.6, '#3c4146'), box(2.6, 0.7, 0, 2.0, 0.9, 1.3, '#3c4146'), box(1.25, 1.5, 0, 0.9, 0.7, 0.7, '#d9a51c')]),
  }), [])
  return <group position={at} scale={k}>
    <mesh geometry={g.base} castShadow receiveShadow><Painted rough={0.7} metal={0.2} /></mesh>
    <group position={[0, 2.6, 0]}>
      {/* 蜗壳：一只扁圆的壳，上面一段方形的出风口 */}
      <mesh geometry={g.scroll} rotation-z={Math.PI / 2} castShadow receiveShadow><Paint color={color} rough={0.4} /></mesh>
      <mesh position={[0, 1.0, 0.9]} castShadow><boxGeometry args={[0.96, 1.5, 0.86]} /><Paint color={color} rough={0.4} /></mesh>
      <mesh position={[0, 1.78, 0.9]} castShadow><boxGeometry args={[1.16, 0.1, 1.06]} /><Paint color={color} /></mesh>
      <mesh geometry={g.inlet} position={[-0.5, 0, 0]} rotation-z={Math.PI / 2} castShadow><Paint color={color} rough={0.4} /></mesh>
      {/* 轴承座、联轴器罩、电机 */}
      <mesh position={[1.25, -0.2, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 1.6, 16]} /><Metal kind="steel" grain="turned" /></mesh>
      <group position={[1.9, -0.2, 0]} rotation-z={-Math.PI / 2}>
        <mesh geometry={g.motor} castShadow><Paint color="#3e6b8c" rough={0.45} /></mesh>
        <mesh geometry={g.fins} castShadow><Painted rough={0.5} metal={0.3} /></mesh>
      </group>
    </group>
  </group>
}

// ---------- 热交换器 ----------
/** 立式列管热交换器：上下两块管板之间一束竖管，几块折流板；冷气走管里（从下往上），热气走管外（从上往下） */
export function Exchanger({ cut = false, children }: { cut?: boolean; children?: ReactNode }) {
  const H = HXV, jacket = useJacket()
  const g = useMemo(() => {
    const tubes: Part[] = []
    for (let x = -1.2; x <= 1.21; x += 0.2) for (let z = -0.1; z > -1.3; z -= 0.2) if (x * x + z * z < 1.3 ** 2) tubes.push({ p: [x, (H.s0 + H.s1) / 2, z], s: [0.045, H.s1 - H.s0, 0.045], c: '#b9bdc1', cyl: true })
    // 折流板：左右交替缺一块的半圆板
    const baffle = (y: number, left: boolean) => latheArc([[0, y], [H.r - 0.1, y], [H.r - 0.1, y + 0.06], [0, y + 0.06]], left ? Math.PI * 0.32 : 0, Math.PI * 0.68, { segs: 24 })
    return { tubes: mergeParts(tubes), baffles: [5.0, 6.3, 7.6, 8.9, 10.2].map((y, i) => baffle(y, i % 2 === 0)) }
  }, [H])
  const plats = useMemo(() => [6.4, 12.2], []), rings = useMemo(() => [H.s0 - 0.05, H.s1 - 0.05, 6.1, 8.9], [H])
  const steel: MatP = { color: '#8d9296', metalness: 0.75, roughness: 0.42 }, face: MatP = { color: '#a5aaae', metalness: 0.4, roughness: 0.5 }
  return <Tower at={[H.x, 0, H.z]} r={H.r} y0={H.y0} y1={H.y1} skin={jacket} cut={cut} plats={plats} rings={rings} ladder={0.3}
    extra={<>
      <Stub at={[-H.r + 0.04, 3.0, 0]} dir={[-1, 0, 0]} r={0.45} len={0.5} color="#9aa0a4" />
      <Stub at={[0, H.y1 + H.r * 0.3 - 0.05, 0]} dir={[0, 1, 0]} r={0.5} len={0.5} color="#9aa0a4" />
      <Stub at={[H.r - 0.04, 10.6, 0]} dir={[1, 0, 0]} r={0.5} len={0.5} color="#9aa0a4" />
      <Stub at={[0, 4.6, -H.r + 0.04]} dir={[0, 0, -1]} r={0.5} len={0.5} color="#9aa0a4" />
      {children}
    </>}>
    <Layer r1={H.r - 0.08} ya={H.s0 - 0.14} yb={H.s0} top={steel} face={face} />
    <Layer r1={H.r - 0.08} ya={H.s1} yb={H.s1 + 0.14} top={steel} face={face} />
    <mesh geometry={g.tubes} castShadow><Painted rough={0.3} metal={0.85} /></mesh>
    {g.baffles.map((b, i) => <mesh key={i} geometry={b}><meshStandardMaterial attach="material-0" {...steel} /><meshStandardMaterial attach="material-1" {...face} side={THREE.DoubleSide} /></mesh>)}
  </Tower>
}

// ---------- 接触室 ----------
const CONV_OUT: RY[] = [[0, CONV.y0 - 0.5], [1.2, CONV.y0 - 0.46], [CONV.r - 0.2, CONV.y0 - 0.12], [CONV.r, CONV.y0 + 0.1], [CONV.r, CONV.y1], [CONV.r - 0.12, CONV.y1 + 0.14], [0.85, CONV.y1 + 1.45], [0.85, CONV.y1 + 1.95]]
/** 接触室（转化器）：外面包着保温层，里面四层钒催化剂，每层下面是篦子板和托梁，层与层之间有一排换热管。hot 0–1 是床层有多热（发一点暗红） */
export function Converter({ cut = false, hot = 0, beds = true, children }: { cut?: boolean; hot?: number; beds?: boolean; children?: ReactNode }) {
  const C = CONV, jacket = useJacket(), hatch = useHatch(), ri = C.r - C.t - 0.02
  const cat = useMemo(() => ({ top: { map: rep(catalystTex(), 0.5, 0.5), roughness: 0.8 } as MatP, face: { map: rep(catalystTex(), 0.5, 0.5), roughness: 0.8 } as MatP }), [])
  const g = useMemo(() => {
    const P: Part[] = []
    // 十二根钢柱和一圈环梁托着
    for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * Math.PI * 2; P.push(box(Math.cos(a) * (C.r - 0.35), 0, Math.sin(a) * (C.r - 0.35), 0.34, C.y0 - 0.1, 0.34, '#6f777c', [0, -a, 0]), box(Math.cos(a) * (C.r - 0.35), 0, Math.sin(a) * (C.r - 0.35), 0.8, 0.3, 0.8, '#a9a59c', [0, -a, 0])) }
    for (let i = 0; i < 12; i += 2) { const a = (i + 1) / 12 * Math.PI * 2, l = 2 * (C.r - 0.35) * Math.sin(Math.PI / 12); P.push({ p: [Math.cos(a) * (C.r - 0.42), 1.5, Math.sin(a) * (C.r - 0.42)], s: [0.09, Math.hypot(l, 2.4), 0.09], c: '#6f777c', r: [Math.atan2(l, 2.4), -a, 0] }) }
    // 每层催化剂下面的托梁（后半边），层间的换热管
    const beams: Part[] = [], tubes: Part[] = []
    for (const [ya] of C.beds) {
      for (let z = -0.5; z > -ri + 0.3; z -= 1.0) { const half = Math.sqrt(ri * ri - z * z) - 0.05; beams.push(box(0, ya - 0.42, z, half * 2, 0.3, 0.14, '#6d7276')) }
    }
    for (const [ya] of C.beds.slice(0, 3)) for (let z = -0.35; z > -ri + 0.5; z -= 0.55) { const half = Math.sqrt(ri * ri - z * z) - 0.08; tubes.push({ p: [0, ya - 1.25, z], s: [0.09, half * 2, 0.09], c: '#7a8086', cyl: true, r: [0, 0, Math.PI / 2] }) }
    const liner = backHalf(wallPoly([[1.2, C.y0 - 0.2], [ri + 0.02, C.y0 + 0.35], [ri + 0.02, C.y1 - 0.05], [1.0, C.y1 + 1.15]], 0.03), 56)
    return { liner, legs: mergeParts(P), beams: mergeParts(beams), tubes: mergeParts(tubes), ring: disc(C.r + 0.1, 0.36, { hole: C.r - 0.7, chamfer: 0.04 }) }
  }, [C, ri])
  const levels = useMemo(() => [{ y: 6.4, r: C.r }, { y: 12.4, r: C.r }, { y: C.y1 + 0.1, r: C.r - 0.6 }], [C])
  const glow = new THREE.Color('#ff5a1e').multiplyScalar(0.5 * hot)
  return <group position={[C.x, 0, C.z]}>
    <mesh geometry={g.legs} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
    <mesh geometry={g.ring} position-y={C.y0 - 0.34} castShadow receiveShadow><Paint color="#6f777c" /></mesh>
    <Vessel outer={CONV_OUT} t={C.t} cut={cut} skin={jacket} section={hatch} segs={56} />
    {cut && <mesh geometry={g.liner} receiveShadow><meshStandardMaterial attach="material-0" color="#5d6166" metalness={0.55} roughness={0.6} /><meshStandardMaterial attach="material-1" color="#7a7f84" side={THREE.DoubleSide} /></mesh>}
    <Rings ys={[C.y0 + 0.2, ...C.beds.map(b => b[0] - 0.5), C.y1 - 0.12]} r={C.r} cut={cut} h={0.12} out={0.07} color="#b3b7ba" />
    <Stub at={[0, C.y1 + 1.9, 0]} dir={[0, 1, 0]} r={0.6} len={0.4} color="#9aa0a4" />
    <Stub at={[-C.r + 0.04, 3.9, 0]} dir={[-1, 0, 0]} r={0.55} len={0.6} color="#9aa0a4" />
    {!cut && C.beds.map(([, yb], i) => <Manhole key={i} at={[Math.sin(0.5) * (C.r - 0.03), yb + 0.75, Math.cos(0.5) * (C.r - 0.03)]} dir={[Math.sin(0.5), 0, Math.cos(0.5)]} r={0.4} />)}
    {/* 测温的小接管和接线盒：每层催化剂一处 */}
    {C.beds.map(([ya, yb], i) => <group key={i} rotation-y={-0.34}><mesh position={[C.r + 0.16, (ya + yb) / 2, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.06, 0.06, 0.34, 14]} /><Metal kind="steel" grain="turned" /></mesh><mesh position={[C.r + 0.4, (ya + yb) / 2, 0]} castShadow><boxGeometry args={[0.16, 0.22, 0.16]} /><meshStandardMaterial color="#4a5560" roughness={0.5} metalness={0.3} /></mesh></group>)}
    <Plats levels={levels} ladder={0.24} w={1.1} />
    {cut && <>
      {C.beds.map(([ya, yb], i) => <group key={i}>
        {beds && <Layer r1={ri} ya={ya} yb={yb} top={{ ...cat.top, emissive: glow }} face={{ ...cat.face, emissive: glow }} />}
        <Layer r1={ri} ya={ya - 0.12} yb={ya} top={{ color: '#4b4f54', metalness: 0.7, roughness: 0.5 }} face={{ color: '#6a6f74', metalness: 0.4, roughness: 0.5 }} />
      </group>)}
      <mesh geometry={g.beams} castShadow><Painted rough={0.5} metal={0.6} /></mesh>
      <mesh geometry={g.tubes} castShadow><Painted rough={0.4} metal={0.6} /></mesh>
    </>}
    {children}
  </group>
}

// ---------- 吸收塔和尾气吸收塔 ----------
/** 吸收塔：塔底一池酸，中间一段瓷环填料，上面是分酸管，塔顶一层除沫器。气从下往上，酸从上往下 */
export function Absorber({ cut = false, children }: { cut?: boolean; children?: ReactNode }) {
  const A = ABS, skin = usePaint('#b9ad8c', 31), ri = A.r - 0.3
  const pack = useMemo(() => ({ top: { map: rep(packingTex(), 0.45, 0.45), color: '#9d978b', roughness: 0.85 } as MatP, brick: { map: rep(brickTex(), 1.4, 1.8), color: '#c9c2b4', roughness: 0.9 } as MatP }), [])
  const g = useMemo(() => {
    const P: Part[] = []
    // 分酸管：一根总管，下面一排支管和喷头（后半边）
    P.push({ p: [0, A.spray, -0.12], s: [0.11, ri * 2 - 0.2, 0.11], c: '#6a5a3a', cyl: true, r: [0, 0, Math.PI / 2] })
    for (let x = -ri + 0.4; x <= ri - 0.39; x += 0.5) { const len = Math.sqrt(ri * ri - x * x) - 0.3; P.push({ p: [x, A.spray - 0.05, -len / 2 - 0.1], s: [0.05, len, 0.05], c: '#6a5a3a', cyl: true, r: [Math.PI / 2, 0, 0] }); for (let z = -0.3; z > -len; z -= 0.5) P.push(cyl(x, A.spray - 0.28, z, 0.04, 0.2, '#4c4230')) }
    // 填料的支撑梁
    for (let z = -0.4; z > -ri + 0.2; z -= 0.8) { const half = Math.sqrt(ri * ri - z * z) - 0.04; P.push(box(0, A.pack[0] - 0.46, z, half * 2, 0.34, 0.16, '#8a7a66')) }
    return mergeParts(P)
  }, [A, ri])
  const plats = useMemo(() => [6.0, 12.0, 17.6], [])
  const liner = useMemo(() => wallPoly([[0, A.y0 - 0.3], [ri + 0.22, A.y0 - 0.1], [ri + 0.22, A.demist + 0.5]], 0.22), [A, ri])
  const lg = useMemo(() => backHalf(liner), [liner])
  return <Tower at={[A.x, 0, A.z]} r={A.r} y0={A.y0} y1={A.y1} skin={skin} cut={cut} plats={plats} ladder={0.3}
    extra={<>
      <Stub at={[-A.r + 0.04, 3.9, 0]} dir={[-1, 0, 0]} r={0.5} len={0.6} color="#a79c7e" />
      <Stub at={[0, A.y1 + A.r * 0.3 - 0.05, 0]} dir={[0, 1, 0]} r={0.42} len={0.5} color="#a79c7e" />
      <Stub at={[A.r - 0.04, A.spray, 0]} dir={[1, 0, 0]} r={0.16} len={0.5} color="#b58a3c" />
      <Stub at={[A.r - 0.04, 2.3, 0]} dir={[1, 0, 0]} r={0.16} len={0.5} color="#b58a3c" />
      {!cut && <><Manhole at={[0, 4.4, A.r - 0.03]} dir={[0, 0, 1]} /><Manhole at={[0, 13.6, A.r - 0.03]} dir={[0, 0, 1]} /></>}
      {children}
    </>}>
    {/* 耐酸砖内衬 */}
    <mesh geometry={lg} receiveShadow><meshStandardMaterial attach="material-0" {...pack.brick} /><meshStandardMaterial attach="material-1" {...pack.brick} side={THREE.DoubleSide} /></mesh>
    <Layer r1={ri} ya={A.pack[0]} yb={A.pack[1]} top={pack.top} face={pack.top} />
    <Layer r1={ri} ya={A.pack[0] - 0.12} yb={A.pack[0]} top={{ color: '#8a7a66', roughness: 0.8 }} face={{ color: '#9a8a76', roughness: 0.8 }} />
    <Layer r1={ri} ya={A.demist} yb={A.demist + 0.3} top={{ color: '#b9bdc0', metalness: 0.6, roughness: 0.6 }} face={{ color: '#c9cdd0', metalness: 0.4, roughness: 0.7 }} />
    <mesh geometry={g} castShadow><Painted rough={0.6} metal={0.3} /></mesh>
  </Tower>
}
/** 尾气吸收塔（外观）和它的氨水循环槽 */
export function TailTower() {
  const skin = usePaint('#7fa390', 37), plats = useMemo(() => [6.0, 11.8], [])
  return <>
    <Tower at={[TAIL.x, 0, TAIL.z]} r={TAIL.r} y0={TAIL.y0} y1={TAIL.y1} skin={skin} plats={plats} ladder={0.3}
      extra={<><Stub at={[-TAIL.r + 0.04, 3.0, 0]} dir={[-1, 0, 0]} r={0.42} len={0.5} color="#6f9482" /><Stub at={[0, TAIL.y1 + TAIL.r * 0.3 - 0.05, 0]} dir={[0, 1, 0]} r={0.42} len={0.5} color="#6f9482" /><Manhole at={[0, 4.4, TAIL.r - 0.03]} dir={[0, 0, 1]} r={0.36} /><Manhole at={[0, 9.4, TAIL.r - 0.03]} dir={[0, 0, 1]} r={0.34} /></>} />
    <PumpTank at={[TAIL.x + 0.4, 0, 4.2]} color="#5f86b8" />
    <PumpTank at={[ABS.x + 0.4, 0, 4.6]} color="#b58a3c" />
  </>
}
/** 烟囱：一根收分的混凝土筒，顶上三道红白相间的航标色，一圈平台 */
export function Stack() {
  const g = useMemo(() => {
    const h = STACK.h, r0 = 2.0, r1 = 1.15, rr = (y: number) => r0 + (r1 - r0) * y / h
    const band = (ya: number, yb: number) => lathe([[rr(ya) + 0.01, ya], [rr(yb) + 0.01, yb]], { segs: 40 })
    return {
      body: lathe([[0, 0], [r0 + 0.5, 0], [r0 + 0.5, 0.8], [r0, 1.0], [r1, h], [r1 - 0.25, h], [r1 - 0.25, h - 0.6], [0, h - 0.6]], { segs: 40 }),
      red: [band(h - 3, h), band(h - 9, h - 6), band(h - 15, h - 12)], white: [band(h - 6, h - 3), band(h - 12, h - 9)],
      plat: mergeParts([...platformParts(rr(h - 15.2), h - 15.2, 0, Math.PI * 2, 0.9), ...ladderParts(rr(h / 2) + 0.1, Math.PI * 1.25, 0.6, h - 15.2)]),
    }
  }, [])
  return <group position={[STACK.x, 0, STACK.z]}>
    <mesh geometry={g.body} castShadow receiveShadow><meshStandardMaterial color="#8f8a80" roughness={0.95} /></mesh>
    {g.red.map((b, i) => <mesh key={i} geometry={b}><meshStandardMaterial color="#b5372b" roughness={0.8} /></mesh>)}
    {g.white.map((b, i) => <mesh key={i} geometry={b}><meshStandardMaterial color="#e6e3da" roughness={0.8} /></mesh>)}
    <mesh geometry={g.plat} castShadow><Painted rough={0.55} metal={0.2} /></mesh>
  </group>
}

// ---------- 工艺管道 ----------
const DUCT = '#a9afb3'
/** 各段工艺管道：id、走向、半径、颜色。气体的流向就是点的先后 */
export const PIPES: Record<string, { pts: V3[]; r: number; c: string }> = {
  air: { pts: [[-22.4, 2.6, 2.6], [-20.2, 2.6, 2.6], [-20.2, 2.6, 0], [-19.0, 2.6, 0]], r: 0.4, c: '#6f98bd' },
  r2c: { pts: [[-12.0, 14.8, 0], [-10.2, 14.8, 0], [-10.2, 10.6, 0.72], [-8.4, 10.6, 0.72]], r: 0.55, c: DUCT },
  c2e: { pts: [[-6.5, 13.3, 0], [-6.5, 14.8, 0], [-2.6, 14.8, 0], [-2.6, 8, 0], [-0.9, 8, 0]], r: 0.5, c: DUCT },
  e2s: { pts: [[5.9, 8, 0], [8.4, 8, 0], [8.4, 3.2, 0], [10.6, 3.2, 0]], r: 0.5, c: DUCT },
  s2d: { pts: [[12.5, 14.9, 0], [12.5, 16.4, 0], [16.5, 16.4, 0], [16.5, 3.2, 0], [18.4, 3.2, 0]], r: 0.45, c: '#86a68b' },
  d2b: { pts: [[20.5, 15.9, 0], [20.5, 17.4, 0], [25.0, 17.4, 0], [25.0, 2.6, 0], [25.0, 2.6, 3], [27.4, 2.6, 3]], r: 0.45, c: DUCT },
  b2h: { pts: [[28.9, 4.4, 3.9], [28.9, 6.6, 3.9], [31.8, 6.6, 3.9], [31.8, 6.6, 0], [31.8, 3.0, 0], [34.0, 3.0, 0]], r: 0.45, c: DUCT },
  h2c: { pts: [[36, 13.7, 0], [36, 19.6, 0], [47, 19.6, 0], [47, 18.7, 0]], r: 0.5, c: DUCT },
  c2h: { pts: [[42.4, 3.9, 0], [40.2, 3.9, 0], [40.2, 10.6, 0], [38.0, 10.6, 0]], r: 0.5, c: DUCT },
  h2a: { pts: [[36, 4.6, -2.0], [36, 4.6, -5], [36, 9.75, -5], [36, 9.75, -13], [56.6, 9.75, -13], [56.6, 9.75, 0], [56.6, 3.9, 0], [59.1, 3.9, 0]], r: 0.5, c: DUCT },
  a2t: { pts: [[62, 19.7, 0], [62, 21.0, 0], [66.6, 21.0, 0], [66.6, 3.0, 0], [69.0, 3.0, 0]], r: 0.42, c: '#a79c7e' },
  t2s: { pts: [[71, 13.5, 0], [71, 15.0, 0], [75, 15.0, 0], [75, 15.0, -5], [77.5, 15.0, -5]], r: 0.42, c: '#7fa390' },
  // 吸收塔的循环酸：槽 → 泵 → 沿塔往上 → 分酸管；塔底回槽
  acidUp: { pts: [[63.4, 1.6, 4.6], [65.2, 1.6, 4.6], [65.2, 1.6, 0], [65.2, ABS.spray, 0], [64.8, ABS.spray, 0]], r: 0.14, c: '#b58a3c' },
  acidDn: { pts: [[64.8, 2.3, 0], [65.6, 2.3, 0], [65.6, 2.3, 3.2], [61.5, 2.3, 3.2], [61.5, 2.3, 4.2]], r: 0.14, c: '#b58a3c' },
  // 成品酸去罐区
  acidOut: { pts: [[61.5, 1.0, 5.4], [61.5, 0.6, 7.2], [86, 0.6, 7.2], [86, 0.6, -4], [88.6, 0.6, -4]], r: 0.12, c: '#b58a3c' },
  // 干燥塔、洗涤塔、尾气塔的循环液
  dryUp: { pts: [[21.9, 1.6, 4.4], [23.0, 1.6, 4.4], [23.0, 1.6, -0.9], [23.0, 13.0, -0.9], [22.0, 13.0, -0.6]], r: 0.12, c: '#b58a3c' },
  washUp: { pts: [[13.9, 1.6, 4.4], [14.8, 1.6, 4.4], [14.8, 1.6, -0.8], [14.8, 12.2, -0.8], [13.8, 12.2, -0.5]], r: 0.12, c: '#3f8f6a' },
  tailUp: { pts: [[72.4, 1.6, 4.2], [73.3, 1.6, 4.2], [73.3, 1.6, -0.8], [73.3, 10.8, -0.8], [72.3, 10.8, -0.5]], r: 0.12, c: '#5f86b8' },
}
/** 气流的光点贴着管子朝镜头的一面走（管子不透明，走在里面看不见）：把这段管道的走向往前挪一个半径 */
export const ride = (id: string): V3[] => PIPES[id].pts.map(p => [p[0], p[1], p[2] + PIPES[id].r + 0.1])
/** 管廊：钢柱、两层横梁，上面一排排公用工程的管子（蒸汽、水、压缩空气） */
function rackParts() {
  const P: Part[] = [], R = RACK
  for (let x = R.x0; x <= R.x1; x += 7) {
    for (const dz of [-1.5, 1.5]) P.push(box(x, 0, R.z + dz, 0.32, R.y[1] + 0.3, 0.32, '#7c8388'), box(x, 0, R.z + dz, 0.8, 0.25, 0.8, '#a9a59c'))
    for (const y of R.y) P.push(box(x, y - 0.3, R.z, 0.26, 0.3, 3.4, '#7c8388'))
  }
  for (const y of R.y) for (const dz of [-1.5, 1.5]) P.push(box((R.x0 + R.x1) / 2, y - 0.3, R.z + dz, R.x1 - R.x0, 0.3, 0.18, '#7c8388'))
  return P
}
const RACK_PIPES: { y: number; dz: number; r: number; c: string }[] = [
  { y: 6.6, dz: -1.0, r: 0.22, c: '#d5d8da' }, { y: 6.6, dz: -0.35, r: 0.14, c: '#3f8f6a' }, { y: 6.6, dz: 0.3, r: 0.18, c: '#c9ccce' }, { y: 6.6, dz: 0.95, r: 0.1, c: '#6f98bd' },
  { y: 9.1, dz: -1.0, r: 0.26, c: '#d5d8da' }, { y: 9.1, dz: 1.0, r: 0.16, c: '#b58a3c' },
]
export function Pipes() {
  const geo = useMemo(() => {
    const byC = new Map<string, THREE.BufferGeometry[]>()
    const add = (c: string, g: THREE.BufferGeometry) => { const l = byC.get(c) ?? []; l.push(g); byC.set(c, l) }
    for (const p of Object.values(PIPES)) add(p.c, pipeGeo(p.pts, p.r))
    for (const rp of RACK_PIPES) { const g = new THREE.CylinderGeometry(rp.r, rp.r, RACK.x1 - RACK.x0, 16); g.rotateZ(Math.PI / 2); g.translate((RACK.x0 + RACK.x1) / 2, rp.y + rp.r, RACK.z + rp.dz); add(rp.c, g) }
    return [...byC.entries()]
  }, [])
  const rack = useMemo(() => mergeParts(rackParts()), [])
  return <>
    <mesh geometry={rack} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
    {geo.map(([c, gs]) => gs.map((g, i) => <mesh key={c + i} geometry={g} castShadow receiveShadow><meshStandardMaterial color={c} roughness={0.45} metalness={0.4} /></mesh>))}
    {/* 立管的支架：几根高的工艺立管旁各一根钢柱 */}
    {([[-10.2, 0, 12], [-2.6, 0, 12.4], [8.4, 0, 6], [16.5, 0, 14], [25.0, 0, 15], [40.2, 0, 8.4], [66.6, 0, 18.6], [75, -2.5, 13]] as const).map(([x, z, h], i) => <mesh key={i} position={[x + 0.75, h / 2, z - 0.5]} castShadow><boxGeometry args={[0.22, h, 0.22]} /><meshStandardMaterial color="#7c8388" roughness={0.6} metalness={0.3} /></mesh>)}
  </>
}
