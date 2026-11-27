// 带电粒子在磁场中 · 第 5 课 速度选择器的器材：支架上一段水平的束流管，中间是一只方形真空室（前面剖开），
// 室里上下一对平行金属板（上板接正极），前后一对磁极（后磁极实画，前磁极透视），磁场垂直纸面向里。
// 左端离子源，右端狭缝和计数器。板间画出电场线（琥珀色，向下）和 ×（磁场），粒子带着电场力（橙）、洛伦兹力（品红）的箭头。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, disc, shell } from '@/lab-kit'
import { COL, ST } from './layout'
import { makeText } from './mats'
import { SEL, SEL_BEAMS, selForces, selectorPath, type BeamKey, type V3 } from './physics'
import { Supply } from './gear'
import { Comet, FieldLines, FieldMarks, FollowArrow } from './fx'

/** 板间中心线的高度（m） */
export const R5 = { y: 1.12, slit: SEL.len / 2 + 0.035 }
const BLUE = '#2d5aa8'

/** 粒子的路：返回途经的点（台子坐标）和是否穿过狭缝 */
export function selPath(beam: BeamKey, e: boolean, b: boolean) {
  const r = selectorPath(beam, e, b)
  const pts: V3[] = r.pts.filter((_, i) => i % 6 === 0 || i === r.pts.length - 1).map(([x, y]) => [x, R5.y + y, 0])
  // 打在板上就停；没打到板、但出口偏得多，就停在狭缝挡板上
  const last = r.pts[r.pts.length - 1], through = !r.hit && Math.abs(last[1]) < 0.0025
  if (!r.hit && !through) { const k = pts.findIndex(p => p[0] >= R5.slit); if (k > 0) pts.length = k + 1 }
  return { pts, through, hit: r.hit }
}

/** e、b：电场、磁场有没有加；beam：哪一种粒子；clock：画面里的时间；arrows：画力的箭头 */
export function Rig5({ e = false, b = false, beam = 'mid', clock = () => -1, arrows = true }: { e?: boolean; b?: boolean; beam?: BeamKey; clock?: () => number; arrows?: boolean }) {
  const path = useMemo(() => selPath(beam, e, b), [beam, e, b])
  const geo = useMemo(() => ({
    pipe: shell([[0.03, 0], [0.03, 0.22]], 0.003, { segs: 40 }), flange: disc(0.05, 0.012, { hole: 0.027, segs: 40 }),
    pole: disc(0.075, 0.06, { chamfer: 0.004, segs: 48 }),
  }), [])
  const pts = path.pts, n = pts.length, info = selForces(beam, e, b), neg = SEL_BEAMS[beam].p.q < 0
  // 粒子沿路跑：一趟 1.6 秒（画面放慢），四颗一组
  const pos = (t: number) => { if (t < 0 || n < 2) return null; const f = (t % 1.6) / 1.6 * (n - 1), i = Math.min(n - 2, Math.floor(f)), w = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * w, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * w, 0.0] as V3 }
  const at = (k: number) => (t: number) => pos(t < 0 ? -1 : t + k * 0.4)
  const dirAt = (t: number) => { const a = pos(t), c = pos(t + 0.02); return a && c ? [c[0] - a[0], c[1] - a[1], 0] as V3 : null }
  // 力的箭头：长度按力的大小（两种力相等时一样长），方向按电荷正负和速度
  const fmax = Math.max(info.fe, info.fb, 1e-30), L = (f: number) => 0.012 + 0.018 * f / fmax
  const plates = makeText(['+'], { w: 128, h: 128, bg: 'transparent', fg: '#ff8a7a', size: 100, weight: 700 }), minus = makeText(['−'], { w: 128, h: 128, bg: 'transparent', fg: '#7fb6ff', size: 100, weight: 700 })
  const color = neg ? COL.neg : COL.pos
  const ghost = <meshBasicMaterial color="#9fc0ff" transparent opacity={0.03} depthWrite={false} />
  const Y = R5.y
  return <group position={[ST.l5, 0, 0]}>
    {/* 支架：两根方钢立柱、底脚、横梁 */}
    {[-0.3, 0.3].map(x => <group key={x} position={[x, 0, -0.02]}>
      <mesh position={[0, (Y - 0.09) / 2, 0]} castShadow><boxGeometry args={[0.06, Y - 0.09, 0.06]} /><meshStandardMaterial color="#5a636b" roughness={0.5} metalness={0.4} /></mesh>
      <mesh position={[0, 0.012, 0]}><boxGeometry args={[0.24, 0.024, 0.3]} /><meshStandardMaterial color="#454c53" roughness={0.6} metalness={0.4} /></mesh>
    </group>)}
    <mesh position={[0, Y - 0.1, -0.02]} castShadow><boxGeometry args={[0.72, 0.03, 0.12]} /><meshStandardMaterial color="#5a636b" roughness={0.5} metalness={0.4} /></mesh>
    {/* 真空室：不锈钢方盒，前面剖开；左右各接一段束流管和法兰 */}
    <group position={[0, Y, 0]}>
      <mesh position={[0, 0, -0.05]} receiveShadow><boxGeometry args={[0.16, 0.08, 0.006]} /><meshStandardMaterial color="#2a3035" roughness={0.6} metalness={0.4} /></mesh>
      {[-1, 1].map(s => <mesh key={`h${s}`} position={[0, s * 0.043, -0.012]} castShadow><boxGeometry args={[0.17, 0.006, 0.08]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
      {[-1, 1].map(s => <mesh key={`v${s}`} position={[s * 0.083, 0, -0.012]} castShadow><boxGeometry args={[0.006, 0.092, 0.08]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
      {[-1, 1].map(s => <group key={`p${s}`} position={[s * 0.086, 0, 0]} rotation-z={s * -Math.PI / 2}>
        <mesh geometry={geo.pipe}><Metal kind="stainless" grain="brushed" rough={0.42} env={0.6} /></mesh>
        <mesh geometry={geo.flange} position={[0, 0.21, 0]}><Metal kind="stainless" grain="turned" /></mesh>
      </group>)}
      {/* 两块平行金属板：上正下负，各有一根引线穿出顶、底 */}
      {[1, -1].map(s => <group key={`pl${s}`}>
        <RoundedBox args={[SEL.len, 0.003, 0.05]} radius={0.001} smoothness={2} position={[0, s * (SEL.d / 2 + 0.0015), -0.012]} castShadow><Metal kind="copper" grain="brushed" /></RoundedBox>
        <mesh position={[0, s * (SEL.d / 2 + 0.017), -0.03]}><cylinderGeometry args={[0.002, 0.002, 0.03, 8]} /><Metal kind="copper" /></mesh>
        <mesh position={[0, s * 0.05, -0.03]}><cylinderGeometry args={[0.008, 0.008, 0.012, 16]} /><meshPhysicalMaterial color="#efe9dc" roughness={0.3} clearcoat={0.5} /></mesh>
        <mesh position={[-SEL.len / 2 - 0.012, s * (SEL.d / 2 + 0.006), 0.012]}><planeGeometry args={[0.014, 0.014]} /><meshBasicMaterial map={s > 0 ? plates : minus} transparent toneMapped={false} /></mesh>
      </group>)}
      {/* 出口狭缝挡板 */}
      {[1, -1].map(s => <mesh key={`sl${s}`} position={[R5.slit, s * 0.012, -0.012]}><boxGeometry args={[0.002, 0.02, 0.05]} /><Metal kind="steel" /></mesh>)}
    </group>
    {/* 磁极：后面一块实画，前面一块透视 */}
    <group position={[0, Y, -0.06]} rotation-x={-Math.PI / 2}><mesh geometry={geo.pole} castShadow><meshPhysicalMaterial color={BLUE} roughness={0.38} clearcoat={0.5} /></mesh></group>
    <group position={[0, Y, 0.03]} rotation-x={Math.PI / 2}><mesh geometry={geo.pole}>{ghost}</mesh><mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.075, 0.0006, 6, 64]} /><meshBasicMaterial color="#8fb0f0" transparent opacity={0.6} /></mesh></group>
    {/* 离子源和计数器 */}
    <group position={[-0.32, Y, 0]}>
      <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.035, 0.035, 0.08, 28]} /><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[-0.02, 0.05, 0]}><cylinderGeometry args={[0.004, 0.004, 0.06, 10]} /><Metal kind="copper" /></mesh>
    </group>
    <group position={[0.32, Y, 0]}>
      <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.04, 0.04, 0.07, 28]} /><meshPhysicalMaterial color="#2b2e32" roughness={0.4} clearcoat={0.4} /></mesh>
      <Led text={path.through ? '通过' : '0'} w={0.06} h={0.024} position={[0, 0.06, 0.0]} />
      <mesh position={[0, 0.06, -0.003]}><boxGeometry args={[0.07, 0.032, 0.006]} /><meshStandardMaterial color="#1b1d20" roughness={0.6} /></mesh>
    </group>
    <group position={[0.18, 0, 0.32]} rotation-y={-0.4}><Supply name="偏转板电源" screens={[e ? `${SEL.U}V` : '0V', b ? `${SEL.B.toFixed(2)}T` : '0.00T']} on={e || b} accent="#c9862d" /></group>
    {/* 场：板间电场线（向下），× 表示向里的磁场 */}
    <FieldLines spots={Array.from({ length: 7 }, (_, i) => [-SEL.len / 2 + 0.008 + i * (SEL.len - 0.016) / 6, -0.016] as [number, number])} y0={Y - SEL.d / 2} y1={Y + SEL.d / 2} dir={-1} opacity={e ? 1 : 0} color={COL.E} head={0.006} r={0.0006} />
    <FieldMarks w={SEL.len} h={SEL.d} kind="in" step={0.01} opacity={b ? 1 : 0} position={[0, Y, 0.004]} />
    {/* 粒子 */}
    {[0, 1, 2, 3].map(k => <Comet key={k} pos={at(k)} clock={clock} color={color} size={0.0022} tail={0.22} n={16} />)}
    {arrows && <>
      <FollowArrow color={COL.v} thick={0.05} get={() => { const t = clock(), p = pos(t), d = dirAt(t); return p && d && Math.abs(p[0]) < SEL.len / 2 ? { from: p, dir: d, len: 0.02 } : null }} />
      <FollowArrow color={COL.FE} thick={0.05} get={() => { const t = clock(), p = pos(t); return p && e && Math.abs(p[0]) < SEL.len / 2 ? { from: p, dir: [0, neg ? 1 : -1, 0], len: L(info.fe) } : null }} />
      <FollowArrow color={COL.FB} thick={0.05} get={() => { const t = clock(), p = pos(t), d = dirAt(t); if (!p || !d || !b || Math.abs(p[0]) >= SEL.len / 2) return null; const s = neg ? -1 : 1; return { from: p, dir: [-s * d[1], s * d[0], 0], len: L(info.fb) } }} />
    </>}
  </group>
}
