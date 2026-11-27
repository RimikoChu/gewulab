// 带电粒子在磁场中 · 第 7 课 回旋加速器的器材：大厅东头一台回旋加速器。蓝色铁轭，上下两个大圆磁极各套一只铜线圈；
// 两极之间是两只铜 D 形盒（盒盖前半剖开，后半透视），缝隙里加交变电压；中心一只离子源；D 形盒后面伸出两根铜杆接到高频电源柜。
// 上磁极、上线圈和上轭画成透视的。质子从中心出发，每过一次缝隙被加速一次，螺旋着走到边缘，从侧面的束流管引出。
// 旁边控制台上一台示波器，显示缝隙上的交变电压和质子过缝的时刻。
import { useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc, shell } from '@/lab-kit'
import { COL, ST } from './layout'
import { makePanel, makeText, makeWinding, rep } from './mats'
import { CYCLO, cycloHalfRadii, type V3 } from './physics'
import { Scope } from './gear'
import { Comet, FieldLines, spotsIn } from './fx'

/** 两极之间那一层的高度、磁极半径、示波器所在的控制台（相对这一课的位置） */
export const R7 = { y: 0.9, pole: 0.62, gap: 0.1, desk: [2.25, 0, 0.9] as V3 }
/** 每个半圈在画面里用的时间（秒）：真实只要几十纳秒，画面放慢了 */
export const HALF = 0.12
const BLUE = '#2d5aa8'

/** 螺旋：每个半圈的圆心、半径、在哪只 D 形盒里；最后一段是引出的直线。返回每个时刻的位置 */
export function spiral(R: number, U: number) {
  const radii = cycloHalfRadii(R, U), halves: { zc: number; r: number; right: boolean }[] = []
  let z = -radii[0]
  radii.forEach((r, k) => {
    const right = k % 2 === 0
    // 右盒：从 (0, z) 出发沿 +x，绕到 (0, z + 2r)；左盒：从 (0, z) 沿 −x，绕到 (0, z − 2r)
    const zc = right ? z + r : z - r
    halves.push({ zc, r, right }); z = right ? z + 2 * r : z - 2 * r
  })
  const last = halves[halves.length - 1], exitDir = last.right ? -1 : 1   // 最后一个半圈走完时沿 x 的方向
  const at = (t: number): [number, number] | null => {
    if (t < 0) return null
    const k = Math.floor(t / HALF)
    if (k < halves.length) { const h = halves[k], a = (t / HALF - k) * Math.PI; return h.right ? [h.r * Math.sin(a), h.zc - h.r * Math.cos(a)] : [-h.r * Math.sin(a), h.zc + h.r * Math.cos(a)] }
    const s = (t - halves.length * HALF) * 3.2
    return s > 1.2 ? null : [exitDir * s, z]
  }
  return { halves, at, end: halves.length * HALF, exitZ: z, exitDir }
}

/** 已经走过的螺旋画成一根发光的细线：随着质子往外走一点点长出来 */
function SpiralLine({ sp, clock }: { sp: ReturnType<typeof spiral>; clock: () => number }) {
  const { geo, perHalf } = useMemo(() => {
    const n = 32, pts: number[] = []
    for (let t = 0; t <= sp.end + 1e-9; t += HALF / n) { const p = sp.at(Math.min(t, sp.end - 1e-6)); if (p) pts.push(p[0], R7.y, p[1]) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setDrawRange(0, 0)
    return { geo: g, perHalf: n }
  }, [sp])
  const obj = useMemo(() => new THREE.Line(geo, new THREE.LineBasicMaterial({ color: COL.pos, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), [geo])
  useLayoutEffect(() => () => { geo.dispose(); (obj.material as THREE.Material).dispose() }, [geo, obj])
  useFrame(() => { const t = clock(); geo.setDrawRange(0, t < 0 ? 0 : Math.min(geo.attributes.position.count, Math.floor(t / HALF * perHalf) + 1)) })
  return <primitive object={obj} />
}

/** 一只 D 形盒：铜底板、半圆的铜侧墙、盒盖（前半剖开不画，后半透视）。side = +1 右盒，−1 左盒 */
function Dee({ R, side }: { R: number; side: 1 | -1 }) {
  const geo = useMemo(() => {
    const half = new THREE.Shape(); half.moveTo(0, -R); half.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false); half.lineTo(0, -R)
    const floor = new THREE.ExtrudeGeometry(half, { depth: 0.006, bevelEnabled: false, curveSegments: 64 }); floor.rotateX(Math.PI / 2)
    const quarter = new THREE.Shape(); quarter.moveTo(0, 0); quarter.lineTo(0, -R); quarter.absarc(0, 0, R, -Math.PI / 2, 0, false); quarter.lineTo(0, 0)
    const lid = new THREE.ExtrudeGeometry(quarter, { depth: 0.004, bevelEnabled: false, curveSegments: 48 }); lid.rotateX(Math.PI / 2)
    const wall = new THREE.CylinderGeometry(R, R, 0.07, 64, 1, true, 0, Math.PI)
    return { floor, lid, wall }
  }, [R])
  const copper = <Metal kind="copper" grain="brushed" rough={0.32} />
  return <group position={[side * 0.012, R7.y, 0]} scale={[side, 1, 1]}>
    <mesh geometry={geo.floor} position={[0, -0.035, 0]} castShadow receiveShadow>{copper}</mesh>
    <mesh geometry={geo.wall} castShadow><Metal kind="copper" grain="brushed" rough={0.32} /></mesh>
    <mesh geometry={geo.lid} position={[0, 0.039, 0]}><meshPhysicalMaterial color="#e3a37f" transparent opacity={0.16} roughness={0.3} metalness={0.6} depthWrite={false} side={THREE.DoubleSide} /><Edges threshold={20} color="#e7b08c" /></mesh>
  </group>
}

/** 示波器上的画：黄色是缝隙上的交变电压，青色竖线是质子过缝的时刻 */
export function scopeTrace(clock: () => number, end: number) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const t = clock(), W = 8 * HALF, mid = h / 2
    if (t < 0) { g.strokeStyle = '#e8d34a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke(); return }
    const t0 = Math.min(t, end) - W
    g.strokeStyle = '#e8d34a'; g.lineWidth = 3; g.beginPath()
    for (let x = 0; x <= w; x += 2) { const tt = t0 + x / w * W, y = mid - h * 0.34 * Math.cos(Math.PI * tt / HALF); if (x) g.lineTo(x, y); else g.moveTo(x, y) }
    g.stroke()
    g.strokeStyle = '#5ce6d0'; g.lineWidth = 3
    for (let k = Math.ceil(t0 / HALF); k * HALF <= Math.min(t, end); k++) { if (k < 0) continue; const x = (k * HALF - t0) / W * w; g.beginPath(); g.moveTo(x, h * 0.1); g.lineTo(x, h * 0.9); g.stroke() }
    g.fillStyle = '#e8d34a'; g.font = '600 22px ui-sans-serif, Helvetica'; g.fillText('U', 12, 30)
    g.fillStyle = '#5ce6d0'; g.fillText('质子过缝', 40, 30)
  }
}

/** R：D 形盒半径；U：加速电压；run：正在加速（clock 从 0 开始）；clock：画面里的时间 */
export function Rig7({ R = CYCLO.radii[0], U = CYCLO.U, run = false, clock = () => -1 }: { R?: number; U?: number; run?: boolean; clock?: () => number }) {
  const sp = useMemo(() => spiral(R, U), [R, U])
  const P = R7.pole, Y = R7.y, g = R7.gap
  const geo = useMemo(() => ({
    pole: disc(P, 0.2, { chamfer: 0.012, segs: 96 }), coil: shell([[P + 0.16, 0], [P + 0.16, 0.18]], 0.12, { segs: 96 }),
    yoke: new THREE.BoxGeometry(2.0, 0.24, 1.5), post: new THREE.BoxGeometry(0.26, 0.9, 1.2), pipe: shell([[0.03, 0], [0.03, 0.9]], 0.004, { segs: 32 }),
  }), [P])
  const wind = useMemo(() => { const t = makeWinding([172, 92, 48], 30).clone(); t.repeat.set(1, 4); t.needsUpdate = true; return t }, [])
  const spots = useMemo(() => spotsIn({ r: P - 0.04 }, 0.17).filter(([x, z]) => Math.abs(x) > 0.03 && Math.hypot(x, z) > R + 0.03), [P, R])
  const inner = useMemo(() => spotsIn({ r: R - 0.04 }, 0.16).filter(([x]) => Math.abs(x) > 0.04), [R])
  const paint = <meshPhysicalMaterial color={BLUE} roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.3} />
  const ghost = <meshBasicMaterial color="#9fc0ff" transparent opacity={0.022} depthWrite={false} />
  const sign = makeText(['回旋加速器'], { w: 512, h: 96, bg: '#d8d6cf', fg: '#22313f', size: 48 }), rf = makeText(['高频电源'], { w: 512, h: 96, bg: '#2b3035', fg: '#dfe3e6', size: 52 })
  const cab = useMemo(() => rep(makePanel('#c7cbcd'), 2, 3), [])
  const pos = (t: number): V3 | null => { if (!run) return null; const p = sp.at(t); return p ? [p[0], Y, p[1]] : null }
  const yB = Y - g / 2 - 0.2, yT = Y + g / 2
  return <group position={[ST.l7, 0, 0]}>
    {/* 混凝土基座、下轭、两根回轭立柱（实），上轭（透视） */}
    <mesh position={[0, 0.2, -0.05]} castShadow receiveShadow><boxGeometry args={[2.2, 0.4, 1.7]} /><meshStandardMaterial color="#8d8b84" roughness={0.9} /></mesh>
    <mesh geometry={geo.yoke} position={[0, yB - 0.12, -0.05]} castShadow receiveShadow>{paint}</mesh>
    {[-1, 1].map(s => <mesh key={s} geometry={geo.post} position={[s * 0.87, yB + 0.45 - 0.0, -0.05]} castShadow receiveShadow>{paint}</mesh>)}
    <mesh geometry={geo.yoke} position={[0, yT + 0.2 + 0.12, -0.05]}>{ghost}</mesh>
    <mesh position={[0, yB - 0.12, 0.701]}><planeGeometry args={[0.6, 0.11]} /><meshStandardMaterial map={sign} roughness={0.5} /></mesh>
    {/* 磁极和线圈：下面的实画，上面的透视 */}
    <mesh geometry={geo.pole} position={[0, yB, 0]} castShadow receiveShadow><Metal kind="iron" grain="turned" rough={0.42} /></mesh>
    <mesh geometry={geo.coil} position={[0, yB, 0]} castShadow><meshPhysicalMaterial map={wind} color="#d08a5c" roughness={0.4} metalness={0.45} clearcoat={0.7} /></mesh>
    <mesh geometry={geo.pole} position={[0, yT, 0]}>{ghost}<Edges threshold={20} color="#8fb0f0" /></mesh>
    {/* 两只 D 形盒、中心的离子源、两根接高频电源的铜杆 */}
    <Dee R={R} side={1} /><Dee R={R} side={-1} />
    <mesh position={[0, Y, 0]}><cylinderGeometry args={[0.008, 0.008, 0.07, 16]} /><Metal kind="stainless" grain="turned" /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.15, Y, -(R + 0.9) / 2 - 0.02]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.02, 0.02, 0.9 - R + 0.2, 20]} /><Metal kind="copper" grain="turned" /></mesh>)}
    {/* 引出的束流管：从 D 形盒边缘伸出磁铁 */}
    <group position={[sp.exitDir * (R + 0.05), Y, sp.exitZ]} rotation-z={sp.exitDir * -Math.PI / 2}><mesh geometry={geo.pipe} castShadow><Metal kind="stainless" grain="brushed" rough={0.4} /></mesh></group>
    {/* 磁感线：竖直向上，穿过两极之间 */}
    <FieldLines spots={spots} y0={Y - g / 2} y1={Y + g / 2 + 0.12} dir={1} opacity={0.8} head={0.03} r={0.0022} />
    {/* D 形盒里也有磁场：盒盖上方露出一小截磁感线 */}
    <FieldLines spots={inner} y0={Y + 0.04} y1={Y + g / 2 + 0.12} dir={1} opacity={0.6} head={0.026} r={0.0018} />
    {/* 质子和它走过的螺旋 */}
    {run && <SpiralLine key={`${R}${U}`} sp={sp} clock={clock} />}
    <Comet pos={pos} clock={clock} color={COL.pos} size={0.012} tail={HALF * 1.2} n={24} />
    {/* 后面的高频电源柜 */}
    <group position={[0, 0, -1.25]}>
      <RoundedBox args={[1.1, 1.9, 0.6]} radius={0.01} smoothness={2} position={[0, 0.95, 0]} castShadow receiveShadow><meshStandardMaterial map={cab} color="#c7cbcd" roughness={0.45} metalness={0.3} /></RoundedBox>
      <mesh position={[0, 1.7, 0.301]}><planeGeometry args={[0.5, 0.09]} /><meshStandardMaterial map={rf} roughness={0.5} /></mesh>
      <Led text={run ? `${(U / 1000).toFixed(0)}kV` : '0kV'} w={0.22} h={0.08} position={[-0.2, 1.48, 0.302]} />
      <Led text="15.2MHz" w={0.26} h={0.08} position={[0.2, 1.48, 0.302]} />
      {[0, 1, 2].map(i => <mesh key={i} position={[0, 0.35 + i * 0.32, 0.302]}><planeGeometry args={[1.0, 0.004]} /><meshStandardMaterial color="#8a9094" /></mesh>)}
    </group>
    {/* 控制台：桌子、两台显示器、示波器 */}
    <group position={R7.desk} rotation-y={-0.5}>
      <RoundedBox args={[1.2, 0.04, 0.6]} radius={0.008} smoothness={2} position={[0, 0.76, 0]} castShadow receiveShadow><meshStandardMaterial color="#8d8a82" roughness={0.6} /></RoundedBox>
      {[-0.55, 0.55].map(x => <mesh key={x} position={[x, 0.37, 0]} castShadow><boxGeometry args={[0.04, 0.74, 0.55]} /><meshStandardMaterial color="#5a6168" roughness={0.5} metalness={0.3} /></mesh>)}
      {[-0.38, 0.0].map(x => <group key={x} position={[x, 0.78, -0.18]}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.18, 0.02, 0.12]} /><meshStandardMaterial color="#1c1e21" roughness={0.5} /></mesh>
        <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.03, 0.2, 0.03]} /><meshStandardMaterial color="#1c1e21" roughness={0.5} /></mesh>
        <RoundedBox args={[0.36, 0.22, 0.025]} radius={0.006} smoothness={2} position={[0, 0.3, 0.02]} castShadow><meshStandardMaterial color="#121315" roughness={0.4} /></RoundedBox>
        <mesh position={[0, 0.3, 0.033]}><planeGeometry args={[0.34, 0.2]} /><meshBasicMaterial color="#0d2a3a" toneMapped={false} /></mesh>
      </group>)}
      <group position={[0.36, 0.78, 0.02]} rotation-y={-0.15}><Scope trace={scopeTrace(clock, sp.end)} /></group>
    </group>
  </group>
}
