// 抛体运动 · 第 4 课的三维场景：训练场的工作台上一台平抛实验器。
// 竖直的背板上贴着方格纸（每小格 1 cm），左上角一条斜槽，槽口水平；槽口挂一根重垂线；一条能上下移动的水平挡板接住小球，球打在哪就在纸上留一个点。
// 坐标原点 O 在槽口处小球的球心：x 向右，y 向下。小球飞行只有零点几秒，画面里放慢了。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, type Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { Dashed, type V3 } from './fx'
import { makeGrid } from './mats'
import { fallTime, flat, fmt, hitX, RAMP } from './physics'
import { Glove } from './props'
import { P } from './world'

/** O 点在实验台局部坐标里的位置：台面高 0.8 m */
export const O: V3 = [-0.22, 1.435, 0]
const ORG: V3 = [P.bench[0] + O[0], P.bench[1] + O[1], P.bench[2] + O[2]]
const W = (p: V3) => toWorld(ORG, 0, p)
const BALL = 0.014
/** 斜槽上小球球心走的线 */
const TRACK = new THREE.CatmullRomCurve3([[-0.3, 0.2], [-0.22, 0.09], [-0.13, 0.022], [-0.07, 0.002], [0, 0]].map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal')
export const ROLL = 0.8, SLOW = 8        // 滚下斜槽用的时间（s）；飞行放慢的倍数
/** 这一次释放的总时长（画面里的秒）：滚下斜槽 + 放慢了的飞行 */
export const shotTime = (drop: number) => ROLL + fallTime(drop) * SLOW

/** 一次释放里，u 秒时小球在哪（O 为原点，y 向上） */
function ballAt(u: number, drop: number): V3 {
  if (u <= ROLL) { const k = (u / ROLL) ** 2, p = TRACK.getPointAt(k); return [p.x, p.y, 0] }
  const f = flat(RAMP.v0, Math.min((u - ROLL) / SLOW, fallTime(drop)))
  return [f.x, -f.drop, 0]
}

/** 平抛实验器（不含小球、挡板） */
function Rig() {
  const paper = makeGrid(50, 55)
  const rails = useMemo(() => [-0.009, 0.009].map(z => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(TRACK.getSpacedPoints(40).map(p => new THREE.Vector3(p.x, p.y - 0.0125, z))), 60, 0.0035, 8)), [])
  const ties = useMemo(() => TRACK.getSpacedPoints(8).map((p, i) => ({ p, a: Math.atan2(TRACK.getTangentAt(i / 8).y, TRACK.getTangentAt(i / 8).x) })), [])
  const bob = useMemo(() => lathe([[0, 0], [0.011, 0.03], [0.011, 0.042], [0.004, 0.05], [0, 0.05]]), [])
  const foot = useMemo(() => lathe([[0.022, 0], [0.022, 0.012], [0.008, 0.014], [0.008, 0.032]]), [])
  return <group>
    {/* 背板、方格纸、四角的磁钉 */}
    <RoundedBox args={[0.6, 0.68, 0.018]} radius={0.004} position={[0.22, -0.235, -0.027]} castShadow receiveShadow><meshStandardMaterial color="#e6e2d6" roughness={0.6} /></RoundedBox>
    <mesh position={[0.22, -0.235, -0.0176]}><planeGeometry args={[0.5, 0.55]} /><meshStandardMaterial map={paper} roughness={0.85} /></mesh>
    {[[-0.02, 0.03], [0.46, 0.03], [-0.02, -0.5], [0.46, -0.5]].map(([x, y]) => <mesh key={`${x}${y}`} position={[x, y, -0.014]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.006, 16]} /><meshStandardMaterial color="#2a2d31" roughness={0.4} /></mesh>)}
    {/* 坐标轴：x 轴沿槽口的水平线，y 轴沿重垂线往下 */}
    <mesh position={[0.225, 0, -0.017]}><boxGeometry args={[0.45, 0.0016, 0.0004]} /><meshBasicMaterial color="#1d2327" /></mesh>
    <mesh position={[0, -0.25, -0.017]}><boxGeometry args={[0.0016, 0.5, 0.0004]} /><meshBasicMaterial color="#1d2327" /></mesh>
    {/* 底座：一块钢板、三只调平脚、背板两侧的立柱 */}
    <RoundedBox args={[0.98, 0.03, 0.32]} radius={0.006} position={[0.1, -0.59, 0.04]} castShadow receiveShadow><meshStandardMaterial color="#23262a" roughness={0.5} metalness={0.6} /></RoundedBox>
    {[[-0.32, 0.15], [0.52, 0.15], [0.1, -0.08]].map(([x, z]) => <mesh key={`${x}${z}`} geometry={foot} position={[x, -0.637, z]}><Metal kind="brass" grain="turned" /></mesh>)}
    {[-0.095, 0.535].map(x => <mesh key={x} position={[x, -0.235, -0.027]} castShadow><boxGeometry args={[0.022, 0.7, 0.03]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {/* 斜槽：两根铝轨、几道横档、槽口的托块；左边一根立杆和十字夹把它撑住 */}
    {rails.map((g, i) => <mesh key={i} geometry={g} castShadow><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {ties.map(({ p, a }, i) => <mesh key={i} position={[p.x, p.y - 0.019, 0]} rotation-z={a}><boxGeometry args={[0.008, 0.006, 0.03]} /><Metal kind="aluminum" /></mesh>)}
    <mesh position={[-0.04, -0.034, -0.004]} castShadow><boxGeometry args={[0.085, 0.024, 0.036]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh position={[-0.3, -0.19, -0.03]} castShadow><cylinderGeometry args={[0.007, 0.007, 0.78, 12]} /><Metal kind="stainless" grain="turned" /></mesh>
    <mesh position={[-0.3, 0.172, -0.016]} castShadow><boxGeometry args={[0.03, 0.03, 0.05]} /><meshStandardMaterial color="#23262a" roughness={0.5} metalness={0.6} /></mesh>
    <mesh position={[-0.322, 0.172, -0.016]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.011, 0.011, 0.016, 16]} /><Metal kind="brass" grain="turned" /></mesh>
    {/* 槽尾的挡片：每次都从这里松手 */}
    <mesh position={[-0.318, 0.2, 0]}><boxGeometry args={[0.004, 0.04, 0.03]} /><Metal kind="aluminum" /></mesh>
    {/* 重垂线 */}
    <mesh position={[0, -0.25, 0.03]}><cylinderGeometry args={[0.0007, 0.0007, 0.46, 6]} /><meshBasicMaterial color="#30343a" /></mesh>
    <mesh position={[-0.005, -0.021, 0.03]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.002, 0.002, 0.03, 8]} /><Metal kind="steel" /></mesh>
    <mesh geometry={bob} position={[0, -0.53, 0.03]}><Metal kind="brass" grain="turned" /></mesh>
  </group>
}

/** 水平挡板：一条铝板，两头的夹子夹在背板两侧的立柱上，各有一只铜旋钮 */
function Bar({ drop }: { drop: number }) {
  return <group position-y={-drop - BALL}>
    <mesh position={[0.22, -0.006, 0.02]} castShadow receiveShadow><boxGeometry args={[0.6, 0.012, 0.075]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh position={[0.22, 0.004, 0.056]}><boxGeometry args={[0.6, 0.02, 0.004]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    {[-0.095, 0.535].map(x => <group key={x} position={[x, -0.006, -0.02]}>
      <mesh castShadow><boxGeometry args={[0.04, 0.036, 0.06]} /><meshStandardMaterial color="#23262a" roughness={0.5} metalness={0.6} /></mesh>
      <mesh position={[Math.sign(x - 0.2) * 0.03, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.022, 18]} /><Metal kind="brass" grain="turned" /></mesh>
    </group>)}
  </group>
}

export default function Scene4({ marks, bar, u, curve, solved }: { marks: number; bar: number; u: number | null; curve: boolean; solved: boolean }) {
  const flying = u !== null, drop = RAMP.drops[Math.min(marks, RAMP.drops.length - 1)]
  const b = flying ? ballAt(u, drop) : ballAt(0, drop)
  const showBall = flying || marks < RAMP.drops.length
  const path = useMemo(() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 40; i++) { const f = flat(RAMP.v0, 0.32 * i / 40); pts.push(new THREE.Vector3(f.x, -f.drop, -0.0165)) } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.0016, 6) }, [])
  const pts = RAMP.drops.slice(0, marks).map(d => [hitX(d), d] as const)
  const labels: Label[] = [
    { id: 'o', at: W([-0.012, 0.012, 0]), ax: 1, className: 'scene-tag -translate-y-full', children: <span className="font-formula italic">O</span> },
    { id: 'xn', at: W([0.455, 0.012, 0]), ax: 0.5, className: 'scene-name -translate-y-full', children: 'x / cm' },
    ...pts.map(([x, y], i) => ({ id: `p${i}`, at: W([x + 0.014, -y + 0.008, 0]), className: `scene-tag -translate-y-full${solved && i === 1 ? ' key' : ''}`, children: `(${fmt(x * 100, 1)}, ${fmt(y * 100, 1)})` } satisfies Label)),
    { id: 'n1', at: W([-0.25, 0.2, 0.03]), ax: 0, name: true, className: 'scene-name -translate-y-full', children: '斜槽' },
    { id: 'n2', at: W([0.012, -0.47, 0.04]), name: true, className: 'scene-name', children: '重垂线' },
    { id: 'n3', at: W([0.5, -bar - 0.02, 0.06]), ax: 1, name: true, className: 'scene-name', children: '挡板' },
  ]
  return (
    <At at="bench" labels={labels}>
      <Local origin={P.bench}>
        {/* 工作台：钢板台面、方钢腿、一道横撑 */}
        <RoundedBox args={[1.5, 0.04, 0.42]} radius={0.008} position={[0, 0.78, 0.03]} castShadow receiveShadow><meshStandardMaterial color="#4a5157" roughness={0.55} metalness={0.5} /></RoundedBox>
        {[[-0.68, -0.14], [0.68, -0.14], [-0.68, 0.2], [0.68, 0.2]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.38, z]} castShadow><boxGeometry args={[0.05, 0.76, 0.05]} /><Metal kind="steel" grain="brushed" /></mesh>)}
        <mesh position={[0, 0.2, -0.14]}><boxGeometry args={[1.36, 0.04, 0.03]} /><Metal kind="steel" grain="brushed" /></mesh>
        <group position={O}>
          <Rig />
          <Bar drop={bar} />
          {/* 纸上留下的点 */}
          {pts.map(([x, y], i) => <mesh key={i} position={[x, -y, -0.0168]}><circleGeometry args={[0.0045, 20]} /><meshBasicMaterial color={solved && i === 1 ? '#0b8277' : '#1d2327'} /></mesh>)}
          {/* 描出的轨迹：一条平滑的曲线 */}
          {curve && <mesh geometry={path}><meshBasicMaterial color="#d0271d" /></mesh>}
          {/* 求初速度：取中间那个点，量出 x 和 y */}
          {solved && pts[1] && <>
            <Dashed a={[pts[1][0], 0, -0.016]} b={[pts[1][0], -pts[1][1], -0.016]} color="#0b8277" w={2.5} dash={0.012} opacity={1} />
            <Dashed a={[0, -pts[1][1], -0.016]} b={[pts[1][0], -pts[1][1], -0.016]} color="#0b8277" w={2.5} dash={0.012} opacity={1} />
          </>}
          {/* 小球，和捏着它的手 */}
          {showBall && <mesh position={b} castShadow><sphereGeometry args={[BALL, 32, 24]} /><Metal kind="chrome" rough={0.1} /></mesh>}
          {marks < RAMP.drops.length && <group position={[-0.3 - (flying ? 0.06 : 0), 0.2 + (flying ? 0.07 : 0), 0.006]} rotation-z={0.55}><group rotation-x={-Math.PI / 2 + 0.3}><Glove pinch={flying ? 0.2 : 0.9} arm={0.3} /></group></group>}
        </group>
      </Local>
    </At>
  )
}
