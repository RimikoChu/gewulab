// 带电粒子在磁场中 · 第 6 课 质谱仪的器材：一台平放的质谱仪。前面是离子源和两块加速电极，离子沿 −z 加速后从狭缝 S
// 进入后面半圆形的真空室；室上下是一对 D 形磁极（下磁极实画，上磁极透视），磁场竖直向上。离子转半圈打在狭缝旁的底片上，
// 底片上留下两条谱线。底片边上贴着一把从狭缝量起的刻度尺。
import { useMemo } from 'react'
import { Edges, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, shell } from '@/lab-kit'
import { COL, ST } from './layout'
import { makeRuler, makeText } from './mats'
import { arc, specLine, specRadius, type IsoKey, type V3 } from './physics'
import { Supply } from './gear'
import { Comet, FieldLines, Glow, spotsIn } from './fx'

/** 离子运动的那一层的高度；狭缝 S 在原点；离子源在 +z 方向 src 处 */
export const R6 = { y: 1.0, src: 0.36, accel: [0.24, 0.12] as [number, number], D: { cx: 0.13, r: 0.16 } }
const BLUE = '#2d5aa8'
const ISO: IsoKey[] = ['ne20', 'ne22']

/** 一种离子从离子源到底片的路：先沿 −z 直线到狭缝，再在磁场里转半圈（向 +x 拐） */
export function ionPath(k: IsoKey, U: number): V3[] {
  const pts: V3[] = [], r = specRadius(k, U)
  for (let z = R6.src - 0.04; z > 0; z -= 0.02) pts.push([0, R6.y, z])
  for (let s = 0; s <= Math.PI * r + 1e-9; s += Math.PI * r / 48) { const e = arc([0, 0], Math.PI / 2, r, -1, s); pts.push([e.p[0], R6.y, -e.p[1]]) }
  return pts
}

/** 底片：竖着立在磁场的直边上（狭缝右边），深色胶片，打到的地方留下一条亮线（离子越多越亮）；下面平放一把刻度尺，0 对准狭缝 */
function Plate({ lines, U }: { lines: boolean; U: number }) {
  const ruler = makeRuler(30)
  return <group>
    <mesh position={[0.165, R6.y, 0.006]}><boxGeometry args={[0.31, 0.04, 0.002]} /><meshStandardMaterial color="#1b2124" roughness={0.45} /></mesh>
    <mesh position={[0.165, R6.y - 0.021, 0.006]}><boxGeometry args={[0.316, 0.004, 0.008]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh position={[0.15, R6.y - 0.0225, 0.022]} rotation-x={-Math.PI / 2 + 0.5}><planeGeometry args={[0.31, 0.022]} /><meshStandardMaterial map={ruler} color="#a9a392" roughness={0.8} /></mesh>
    {lines && ISO.map((k, i) => [0.0045, 0.0075].map(z => <mesh key={k + z} position={[specLine(k, U), R6.y, z]}><planeGeometry args={[0.003, 0.036]} /><meshBasicMaterial color={COL.pos} toneMapped={false} transparent opacity={i ? 0.6 : 1} side={THREE.DoubleSide} /></mesh>))}
  </group>
}

/** on：离子源和加速电压接通；U：加速电压；measured：量过谱线（画出尺上的读数）；clock：画面里的时间 */
export function Rig6({ on = false, U = 1000, clock = () => -1 }: { on?: boolean; U?: number; clock?: () => number }) {
  const paths = useMemo(() => ISO.map(k => ionPath(k, U)), [U])
  const geo = useMemo(() => {
    // D 形磁极：半圆盘（z < 0 那一半），沿 y 拉厚
    const s = new THREE.Shape(); s.moveTo(R6.D.cx - R6.D.r, 0); s.absarc(R6.D.cx, 0, R6.D.r, Math.PI, 2 * Math.PI, false); s.lineTo(R6.D.cx - R6.D.r, 0)
    const pole = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 48 }); pole.rotateX(Math.PI / 2)
    const wall = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 48 }); wall.rotateX(Math.PI / 2)
    return { pole, wall, tube: shell([[0.018, 0], [0.018, R6.src - 0.02]], 0.002, { segs: 32 }), ring: disc(0.045, 0.006, { hole: 0.004, segs: 40 }) }
  }, [])
  const spots = useMemo(() => spotsIn({ r: R6.D.r - 0.02 }, 0.04, R6.D.cx, 0).filter(([, z]) => z < -0.012), [])
  const ghost = <meshBasicMaterial color="#9fc0ff" transparent opacity={0.03} depthWrite={false} />
  const name = makeText(['质谱仪'], { w: 256, h: 64, bg: '#d8d6cf', fg: '#22313f', size: 36 })
  // 离子沿路跑：一趟 2.2 秒（画面放慢），每种两颗
  const mover = (pts: V3[], k: number) => (t: number): V3 | null => {
    if (!on || t < 0) return null
    const n = pts.length, f = ((t + k * 1.1) % 2.2) / 2.2 * (n - 1), i = Math.min(n - 2, Math.floor(f)), w = f - i
    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * w, pts[i][1], pts[i][2] + (pts[i + 1][2] - pts[i][2]) * w]
  }
  const Y = R6.y
  return <group position={[ST.l6, 0, 0]}>
    {/* 机架：一张钢台，上面一块铝板 */}
    <RoundedBox args={[0.8, 0.04, 0.78]} radius={0.006} smoothness={2} position={[0.08, Y - 0.11, 0.06]} castShadow receiveShadow><meshPhysicalMaterial color="#3e464d" roughness={0.45} metalness={0.3} clearcoat={0.3} /></RoundedBox>
    {[[-0.28, -0.28], [0.44, -0.28], [-0.28, 0.4], [0.44, 0.4]].map(([x, z], i) => <mesh key={i} position={[x, (Y - 0.13) / 2, z]} castShadow><boxGeometry args={[0.05, Y - 0.13, 0.05]} /><meshStandardMaterial color="#4a525a" roughness={0.5} metalness={0.4} /></mesh>)}
    <mesh position={[0.08, 0.18, 0.06]}><boxGeometry args={[0.76, 0.03, 0.74]} /><meshStandardMaterial color="#4a525a" roughness={0.5} metalness={0.4} /></mesh>
    {/* D 形磁极：下面实的（蓝色漆，顶面磨亮），上面透视；后面一根回轭 */}
    <group position={[0, Y - 0.018, 0]}><mesh geometry={geo.pole} castShadow receiveShadow><meshPhysicalMaterial color={BLUE} roughness={0.38} clearcoat={0.5} /></mesh></group>
    <group position={[0, Y + 0.088, 0]}><mesh geometry={geo.pole}>{ghost}<Edges threshold={25} color="#8fb0f0" /></mesh></group>
    <mesh position={[R6.D.cx, Y + 0.035, -R6.D.r - 0.035]} castShadow><boxGeometry args={[0.2, 0.2, 0.05]} /><meshPhysicalMaterial color={BLUE} roughness={0.38} clearcoat={0.5} /></mesh>
    <mesh position={[R6.D.cx + 0.11, Y - 0.06, -R6.D.r - 0.009]}><planeGeometry args={[0.1, 0.025]} /><meshStandardMaterial map={name} roughness={0.5} /></mesh>
    {/* 真空室：磁极之间一圈薄的不锈钢侧墙（只画轮廓一圈），前面开着狭缝 */}
    <group position={[0, Y + 0.012, 0]}><mesh geometry={geo.wall}><meshPhysicalMaterial color="#c9d2d6" transparent opacity={0.12} roughness={0.1} depthWrite={false} side={THREE.DoubleSide} /></mesh></group>
    {/* 离子源、两块加速电极、飞行管、狭缝 S */}
    <group position={[0, Y, R6.src]}>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.035, 0.035, 0.06, 28]} /><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[0, 0.05, 0.01]}><cylinderGeometry args={[0.004, 0.004, 0.07, 10]} /><Metal kind="copper" /></mesh>
    </group>
    {R6.accel.map((z, i) => <group key={i} position={[0, Y, z]} rotation-x={Math.PI / 2}><mesh geometry={geo.ring} castShadow><Metal kind="copper" grain="turned" /></mesh></group>)}
    <group position={[0, Y, 0.02]} rotation-x={Math.PI / 2}><mesh geometry={geo.tube}><meshPhysicalMaterial color="#e5eef0" transparent opacity={0.14} roughness={0.05} depthWrite={false} /></mesh></group>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.012, Y, 0.002]}><boxGeometry args={[0.02, 0.03, 0.003]} /><Metal kind="steel" /></mesh>)}
    <Plate lines={on} U={U} />
    {/* 加速电场（两块电极之间，沿 −z）和 D 形区里竖直向上的磁感线 */}
    <FieldLines spots={spots} y0={Y - 0.016} y1={Y + 0.085} dir={1} opacity={on ? 1 : 0.5} head={0.014} r={0.0011} />
    {paths.map((p, i) => <group key={i}>
      <Glow pts={p} color={COL.pos} level={on ? (i ? 0.45 : 0.8) : 0} r={0.0012} halo={4} />
      {[0, 1].map(k => <Comet key={k} pos={mover(p, k)} clock={clock} color={COL.pos} size={0.0034} tail={0.25} n={18} />)}
    </group>)}
    <group position={[-0.36, 0, -0.12]} rotation-y={0.4}><group position={[0, Y - 0.09, 0]}><Supply name="加速电源" screens={[on ? `${U}V` : '0V', on ? '0.20T' : 'OFF']} on={on} accent="#c9862d" /></group></group>
  </group>
}
