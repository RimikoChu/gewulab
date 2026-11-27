// 一次函数 · 第 1 课的器材：一辆在高速公路上行驶的小轿车，镜头在车里。
// 看得见仪表盘（左边速度表、右边油量表、中间的里程和行驶时间）、方向盘和风挡外的路。
// 车在场景里其实不动：路上的虚线、护栏立柱、迎面来的里程碑往后退，看上去就是车在往前开。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Rod, type Label } from '@/lab-kit'
import At from './at'
import { Sedan } from './car'
import { Milestone } from './equip'
import { canvas, FONT, NUM } from './mats'
import { TANK } from './physics'
import { LANE, P, ROAD } from './world'

const CX = P.cockpit, CZ = LANE.fast
/** 仪表板上的一处（车的坐标）换成世界坐标 */
const W = (x: number, y: number, z: number): [number, number, number] => [CX + x, y, CZ + z]

/** 仪表：两块表盘和中间的液晶屏，画在一张贴图上 */
function drawCluster(g: CanvasRenderingContext2D, { v, fuel, s, t }: { v: number; fuel: number; s: number; t: number }) {
  const Wd = 1024, H = 420
  g.fillStyle = '#050607'; g.fillRect(0, 0, Wd, H)
  const dial = (cx: number, cy: number, r: number, a0: number, a1: number, ticks: number, major: number, labels: (i: number) => string | null, val: number, red?: number) => {
    const rg = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.1); rg.addColorStop(0, '#15191c'); rg.addColorStop(1, '#07090a')
    g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, r * 1.06, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#3a4248'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r * 1.06, 0, Math.PI * 2); g.stroke()
    for (let i = 0; i <= ticks; i++) {
      const a = (a0 + (a1 - a0) * i / ticks) * Math.PI / 180, big = i % major === 0, r0 = big ? r * 0.8 : r * 0.88
      g.strokeStyle = red !== undefined && i <= red ? '#ff5a4a' : '#e8eef0'; g.lineWidth = big ? 5 : 2.4
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r * 0.97, cy - Math.sin(a) * r * 0.97); g.stroke()
      const l = labels(i); if (l) { g.fillStyle = '#e8eef0'; g.font = `600 ${Math.round(r * 0.12)}px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, cx + Math.cos(a) * r * 0.62, cy - Math.sin(a) * r * 0.62) }
    }
    const a = (a0 + (a1 - a0) * val) * Math.PI / 180
    g.strokeStyle = '#ff3b2f'; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = '#ff3b2f'; g.shadowBlur = 14
    g.beginPath(); g.moveTo(cx - Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.12); g.lineTo(cx + Math.cos(a) * r * 0.9, cy - Math.sin(a) * r * 0.9); g.stroke(); g.shadowBlur = 0
    g.fillStyle = '#22272b'; g.beginPath(); g.arc(cx, cy, r * 0.1, 0, Math.PI * 2); g.fill()
  }
  // 速度表：0–220 km/h，指针扫过 240°
  dial(215, 214, 186, 210, -30, 44, 4, i => i % 4 === 0 ? String(i * 5) : null, v / 220)
  g.fillStyle = '#9aa6ad'; g.font = `500 22px ${NUM}`; g.textAlign = 'center'; g.fillText('km/h', 215, 300)
  // 油量表：E 到 F
  dial(809, 214, 150, 210, 90, 4, 2, i => (i === 0 ? 'E' : i === 2 ? '½' : i === 4 ? 'F' : null), fuel / TANK, 0)
  g.fillStyle = '#9aa6ad'; g.font = `500 22px ${FONT}`; g.textAlign = 'center'; g.fillText('油量', 809, 300)
  // 中间的液晶屏：本次里程、行驶时间
  g.fillStyle = '#0c1a22'; g.beginPath(); g.roundRect(420, 50, 184, 236, 16); g.fill()
  g.strokeStyle = '#1f3a48'; g.lineWidth = 2; g.stroke()
  g.textAlign = 'center'; g.fillStyle = '#7fb6cc'; g.font = `500 22px ${FONT}`
  g.fillText('本次里程', 512, 84); g.fillText('行驶时间', 512, 186)
  g.fillStyle = '#e9f6fb'; g.font = `700 50px ${NUM}`
  g.fillText(`${Math.round(s)}`, 512, 134); g.fillText(`${Math.floor(t)}:${String(Math.floor((t % 1) * 60 + 1e-6)).padStart(2, '0')}`, 512, 236)
  g.fillStyle = '#7fb6cc'; g.font = `500 20px ${NUM}`; g.fillText('km', 512, 164); g.fillText('h : min', 512, 268)
}

function Cluster({ v, fuel, s, t }: { v: number; fuel: number; s: number; t: number }) {
  const { g, tex } = useMemo(() => { const { c, g } = canvas(1024, 420); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return { g, tex } }, [])
  useEffect(() => { drawCluster(g, { v, fuel, s, t }); tex.needsUpdate = true }, [v, fuel, s, t, g, tex])
  return <mesh position={[0.322, 0.945, -0.37]} rotation-y={-Math.PI / 2}><planeGeometry args={[0.46, 0.189]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
}

/** 仪表板：一整条从左到右的软质台面（侧面轮廓拉伸出来），仪表罩、中控屏、出风口、方向盘 */
function Dash() {
  const geo = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(0.99, 0.97); s.quadraticCurveTo(0.7, 1.05, 0.5, 1.02); s.quadraticCurveTo(0.38, 0.99, 0.36, 0.86); s.lineTo(0.42, 0.6); s.lineTo(0.95, 0.52); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 20 }); g.translate(0, 0, -0.7); return g
  }, [])
  const hood = useMemo(() => { const g = new THREE.CylinderGeometry(0.26, 0.26, 0.2, 32, 1, true, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.scale(1, 0.42, 1); return g }, [])
  const soft = <meshStandardMaterial color="#26282b" roughness={0.85} />
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  return (
    <group>
      <mesh geometry={geo} receiveShadow>{soft}</mesh>
      {/* 仪表罩：半圆的遮光罩把仪表框起来 */}
      <mesh geometry={hood} position={[0.42, 1.0, -0.37]}><meshStandardMaterial color="#1e2022" roughness={0.8} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.328, 0.945, -0.37]} rotation-y={-Math.PI / 2}><planeGeometry args={[0.5, 0.215]} /><meshStandardMaterial color="#0c0d0e" roughness={0.6} /></mesh>
      {/* 中控屏和两侧出风口 */}
      <RoundedBox args={[0.03, 0.15, 0.25]} radius={0.01} position={[0.47, 1.06, 0.08]}><meshStandardMaterial color="#0d0f11" roughness={0.15} metalness={0.4} /></RoundedBox>
      <mesh position={[0.454, 1.06, 0.08]} rotation-y={-Math.PI / 2}><planeGeometry args={[0.23, 0.13]} /><meshBasicMaterial color="#1a2a33" toneMapped={false} /></mesh>
      {[-0.66, 0.2, 0.62].map(z => <group key={z} position={[0.39, 0.9, z]}>
        <RoundedBox args={[0.03, 0.06, 0.16]} radius={0.01}><meshStandardMaterial color="#111" roughness={0.6} /></RoundedBox>
        {[-0.015, 0, 0.015].map(y => <mesh key={y} position={[-0.016, y, 0]}><boxGeometry args={[0.004, 0.004, 0.15]} /><Metal kind="chrome" /></mesh>)}
      </group>)}
      {/* 方向盘：上沿向前倾，三根辐条，中间的气囊盖 */}
      <group position={[0.02, 0.72, -0.37]} rotation-z={-0.42}>
        <group rotation-y={Math.PI / 2}>
          <mesh><torusGeometry args={[0.185, 0.021, 14, 48]} /><meshStandardMaterial color="#1b1c1e" roughness={0.7} /></mesh>
          <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.065, 0.07, 0.05, 28]} /><meshStandardMaterial color="#202224" roughness={0.6} /></mesh>
          {[0, Math.PI, -Math.PI / 2].map(a => <mesh key={a} position={[Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0]} rotation-z={a}><boxGeometry args={[0.12, 0.04, 0.025]} /><meshStandardMaterial color="#202224" roughness={0.6} /></mesh>)}
          <mesh position={[0, 0, 0.027]}><circleGeometry args={[0.018, 20]} /><Metal kind="chrome" /></mesh>
        </group>
        <mesh position={[0.17, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.045, 0.3, 16]} /><meshStandardMaterial color="#1b1c1e" roughness={0.7} /></mesh>
      </group>
      {/* 车顶内衬、A 柱、车门内饰、车内后视镜 */}
      <mesh position={[-0.2, 1.37, 0]}><boxGeometry args={[2.1, 0.03, 1.36]} /><meshStandardMaterial color="#b9b5ad" roughness={0.95} /></mesh>
      {[1, -1].map(s => <Rod key={s} from={[0.97, 0.98, s * 0.66]} to={[0.36, 1.41, s * 0.6]} r={0.045}><meshStandardMaterial color="#aaa69e" roughness={0.9} /></Rod>)}
      {[1, -1].map(s => <group key={`d${s}`}>
        <mesh position={[-0.2, 0.75, s * 0.72]}><boxGeometry args={[2.3, 0.5, 0.04]} /><meshStandardMaterial color="#2c2e31" roughness={0.85} /></mesh>
        <mesh position={[-0.2, 1.0, s * 0.69]}><boxGeometry args={[2.3, 0.04, 0.1]} /><meshStandardMaterial color="#3a3c3f" roughness={0.8} /></mesh>
      </group>)}
      <mesh position={[-0.2, 0.44, 0]}><boxGeometry args={[2.3, 0.04, 1.42]} /><meshStandardMaterial color="#1f2022" roughness={1} /></mesh>
      <RoundedBox args={[0.04, 0.07, 0.24]} radius={0.015} position={[0.72, 1.3, 0]}><meshStandardMaterial color="#1b1c1e" roughness={0.5} /></RoundedBox>
    </group>
  )
}

/** 往后退的路：车道虚线（周期 15 m）、两侧护栏立柱（周期 4 m）。d 是走过的“场景里的米” */
function Treadmill({ d }: { d: number }) {
  const dash = useRef<THREE.Group>(null), post = useRef<THREE.Group>(null)
  const geos = useMemo(() => {
    const a: THREE.BufferGeometry[] = [], b: THREE.BufferGeometry[] = []
    for (let x = -30; x < 330; x += 15) for (const z of [ROAD.lane, -ROAD.lane]) { const g = new THREE.BoxGeometry(6, 0.01, 0.15); g.translate(x + 3, 0.036, z); a.push(g) }
    for (let x = -30; x < 330; x += 4) for (const z of [12.55, -12.55]) { const g = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 10); g.translate(x, 0.4, z); b.push(g) }
    return { dash: mergeGeometries(a), post: mergeGeometries(b) }
  }, [])
  useFrame(() => { if (dash.current) dash.current.position.x = CX - (d % 15); if (post.current) post.current.position.x = CX - (d % 4) })
  return (
    <>
      <group ref={dash}><mesh geometry={geos.dash} receiveShadow><meshStandardMaterial color="#e9e9e4" roughness={0.7} /></mesh></group>
      <group ref={post}><mesh geometry={geos.post} castShadow><meshStandardMaterial color="#9aa0a4" roughness={0.5} metalness={0.4} /></mesh></group>
    </>
  )
}

/** t：行驶了几小时（可以是过程中的值）；from、to：这一段从几小时开到几小时 */
export default function Scene1({ t, from, to, v, s, fuel, ms }: { t: number; from: number; to: number; v: number; s: number; fuel: number; ms: number }) {
  // 场景里路往后退的距离：一小时的路程在画面里走 90 m，看着像车在开
  const d = t * 90
  // 迎面来的里程碑：这一段开完时，正好立在车的右前方
  const p = to > from ? Math.min(1, Math.max(0, (t - from) / (to - from))) : 1
  const msX = CX + 20 + (1 - p) * 170
  const labels: Label[] = [
    { id: 'v', at: W(0.4, 1.09, -0.62), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>速度</small>{v} km/h</> },
    { id: 's', at: W(0.4, 1.09, -0.37), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>里程</small>{s.toFixed(0)} km<small className="ml-2">时间</small>{t.toFixed(1)} h</> },
    { id: 'f', at: W(0.4, 1.09, -0.12), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>油量</small>{fuel.toFixed(0)} L</> },
  ]
  return (
    <At at="cockpit" labels={labels} bloom={0.35}>
      <Sedan position={[CX, 0, CZ]} color="#2f6fb5" clear><Dash /><Cluster v={v} fuel={fuel} s={s} t={t} /></Sedan>
      <Treadmill d={d} />
      <Milestone km={ms} position={[msX, 0, 1.0]} rotation-y={-Math.PI / 2} />
    </At>
  )
}
