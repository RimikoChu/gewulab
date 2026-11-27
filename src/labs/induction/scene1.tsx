// 电磁感应和电网 · 第 1 课 磁通量的器材：实验台上一对亥姆霍兹线圈（两只竖着的大线圈，漆包线绕在胶木骨架上），
// 中间一只边长 10 cm 的方形小线圈，装在带刻度盘的转台上，可以绕竖直轴转。两只大线圈之间是一片水平的匀强磁场，
// 磁感线画成一根根平行的蓝线：穿过小线圈的那些亮，其余的暗。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe } from '@/lab-kit'
import { ST, TOP } from './layout'
import { makeText, makeWinding, rep } from './mats'
import { HELM, lineGrid, passes, type V3 } from './physics'
import { Bench, Post, Supply, Wire, supplyPosts } from './gear'
import { FieldLines } from './fx'

/** 器材的位置（m，以这一课的台子中心为原点） */
export const R1 = { cy: TOP + 0.27, supply: [0.48, TOP, 0.06] as V3 }

/** 一只亥姆霍兹线圈：胶木骨架是一个开口朝外的 U 形槽圈，漆包线绕在槽里。圈面在 y–z 平面里 */
function HelmCoil() {
  const geo = useMemo(() => {
    const R = HELM.R, w = 0.03, t = 0.018
    // 骨架截面：U 形槽（沿半径方向向外开口）
    const frame = lathe([[R - 0.006, -w / 2 - 0.004], [R + t + 0.004, -w / 2 - 0.004], [R + t + 0.004, -w / 2], [R, -w / 2], [R, w / 2], [R + t + 0.004, w / 2], [R + t + 0.004, w / 2 + 0.004], [R - 0.006, w / 2 + 0.004]], { segs: 96, closed: true })
    frame.rotateZ(Math.PI / 2)
    const wind = new THREE.CylinderGeometry(R + t, R + t, w, 96, 1, true); wind.rotateZ(Math.PI / 2)
    return { frame, wind }
  }, [])
  const wt = useMemo(() => { const t = rep(makeWinding([170, 88, 40], 64), 1, 1); t.rotation = Math.PI / 2; t.repeat.set(1, 12); return t }, [])
  return <group>
    <mesh geometry={geo.frame} castShadow receiveShadow><meshPhysicalMaterial color="#2b2a28" roughness={0.38} clearcoat={0.5} /></mesh>
    <mesh geometry={geo.wind} castShadow><meshPhysicalMaterial map={wt} roughness={0.32} metalness={0.6} clearcoat={0.6} /></mesh>
  </group>
}

/** 方形小线圈：四条边是一束漆包线，用胶带缠了几道；四角圆过去 */
function SquareCoil() {
  const geo = useMemo(() => {
    const a = HELM.a / 2, k = 0.008, pts: THREE.Vector3[] = []
    const corners: [number, number][] = [[a, a], [-a, a], [-a, -a], [a, -a]]
    corners.forEach(([y, z], i) => { const [y2, z2] = corners[(i + 1) % 4]; for (let s = 0; s < 8; s++) { const u = s / 8; pts.push(new THREE.Vector3(0, y + (y2 - y) * u * (1 - 0) , z + (z2 - z) * u)) } })
    const c = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.02)
    return new THREE.TubeGeometry(c, 160, k / 2 + 0.002, 12, true)
  }, [])
  const wt = useMemo(() => { const t = rep(makeWinding([176, 92, 44], 32), 1, 1); t.repeat.set(40, 1); return t }, [])
  return <group>
    <mesh geometry={geo} castShadow><meshPhysicalMaterial map={wt} roughness={0.3} metalness={0.6} clearcoat={0.6} /></mesh>
    {/* 几道白色胶带 */}
    {[[0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05]].map(([y, z], i) => <mesh key={i} position={[0, y, z]} rotation-x={y === 0 ? 0 : Math.PI / 2}><cylinderGeometry args={[0.0068, 0.0068, 0.012, 16]} /><meshStandardMaterial color="#efece2" roughness={0.6} /></mesh>)}
  </group>
}

/** 转台：铸铁圆底座、印着 0–360° 的刻度盘、竖着的胶木杆，杆顶托着小线圈；deg 是线圈转过的角度 */
function Turntable({ deg }: { deg: number }) {
  const dial = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!
    g.fillStyle = '#ecebe4'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#202326'; g.fillStyle = '#202326'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 34px ui-sans-serif, Helvetica, Arial'
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, l = i % 6 === 0 ? 34 : 16; g.lineWidth = i % 6 === 0 ? 4 : 2; g.beginPath(); g.moveTo(256 + Math.cos(a) * 246, 256 + Math.sin(a) * 246); g.lineTo(256 + Math.cos(a) * (246 - l), 256 + Math.sin(a) * (246 - l)); g.stroke() }
    for (let d = 0; d < 360; d += 30) { const a = -d * Math.PI / 180; g.fillText(String(d), 256 + Math.cos(a) * 180, 256 + Math.sin(a) * 180) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
  }, [])
  const base = useMemo(() => disc(0.075, 0.02), [])
  const rot = deg * Math.PI / 180
  return <group>
    <mesh geometry={base} position={[0, TOP, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[0, TOP + 0.0205, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.07, 64]} /><meshStandardMaterial map={dial} roughness={0.55} /></mesh>
    <group rotation-y={-rot}>
      {/* 指针：指着线圈法线的方向 */}
      <mesh position={[0.045, TOP + 0.023, 0]}><boxGeometry args={[0.07, 0.002, 0.004]} /><meshStandardMaterial color="#c8352b" roughness={0.5} /></mesh>
      <mesh position={[0, TOP + 0.03, 0]}><cylinderGeometry args={[0.012, 0.014, 0.02, 24]} /><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[0, (TOP + R1.cy - HELM.a / 2) / 2 + 0.01, 0]} castShadow><cylinderGeometry args={[0.005, 0.005, R1.cy - HELM.a / 2 - TOP - 0.01, 16]} /><meshPhysicalMaterial color="#3b2b1f" roughness={0.4} clearcoat={0.5} /></mesh>
      <group position={[0, R1.cy, 0]}><SquareCoil /></group>
    </group>
  </group>
}

/** deg：小线圈转过的角度；supply：电源接通没有（亥姆霍兹线圈通电才有磁场） */
export function Rig1({ deg = 0, on = true }: { deg?: number; on?: boolean }) {
  // 磁感线：沿 +x，从左边的大线圈穿到右边的大线圈外面；分成穿过小线圈的（亮）和没穿过的（暗）两束
  const { lit, dim } = useMemo(() => {
    const lit: V3[][] = [], dim: V3[][] = []
    lineGrid().forEach(([y, z], i) => {
      if (Math.abs(y) > 0.088 || Math.abs(z) > 0.088) return
      const l: V3[] = [[-0.24, R1.cy + y, z], [0, R1.cy + y, z], [0.24, R1.cy + y, z]]
      if (passes([y, z], deg)) lit.push(l)
      else if (i % 2 === 0 && Math.floor(i / 16) % 2 === 0) dim.push(l)   // 没穿过的只画四分之一，免得挡住线圈
    })
    return { lit, dim }
  }, [deg])
  const P = supplyPosts(), sp = R1.supply
  const plus: V3 = [sp[0] + P.plus[0], sp[1] + P.plus[1], sp[2] + P.plus[2]], minus: V3 = [sp[0] + P.minus[0], sp[1] + P.minus[1], sp[2] + P.minus[2]]
  const plate = makeText(['亥姆霍兹线圈  N = 200 × 2  R = 20 cm'], { w: 1024, h: 96, bg: '#2a2c2e', fg: '#d8dbdd', size: 40, weight: 500 })
  return <group position={[ST.l1, 0, 0]}>
    <Bench w={1.5} />
    {/* 木底板和两只大线圈的支架 */}
    <RoundedBox args={[0.42, 0.024, 0.24]} radius={0.006} smoothness={2} position={[0, TOP + 0.012, -0.02]} castShadow receiveShadow><meshPhysicalMaterial color="#8a5a34" roughness={0.5} clearcoat={0.4} /></RoundedBox>
    <mesh position={[0, TOP + 0.0125, 0.1005]}><planeGeometry args={[0.34, 0.03]} /><meshBasicMaterial map={plate} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * HELM.R / 2, 0, -0.02]}>
      <group position={[0, R1.cy, 0.02]}><HelmCoil /></group>
      <mesh position={[0, TOP + 0.04, 0]} castShadow><boxGeometry args={[0.05, 0.035, 0.12]} /><meshPhysicalMaterial color="#2b2a28" roughness={0.4} clearcoat={0.5} /></mesh>
      <Post at={[0.0, TOP + 0.058, 0.05]} color={s < 0 ? '#c4302a' : '#1c1d1f'} />
    </group>)}
    <Turntable deg={deg} />
    <FieldLines lines={lit} opacity={on ? 0.95 : 0} color="#8fb4ff" heads={1} head={0.009} r={0.0007} />
    <FieldLines lines={dim} opacity={on ? 0.22 : 0} heads={0} r={0.0006} />
    {/* 电源到两只大线圈的导线 */}
    <Wire pts={[plus, [plus[0] - 0.05, plus[1] + 0.04, plus[2] + 0.06], [0.2, TOP + 0.02, 0.14], [-0.05, TOP + 0.02, 0.1], [-HELM.R / 2, TOP + 0.064, 0.03]]} color="#c4302a" flow={on ? 1 : 0} dots={8} />
    <Wire pts={[minus, [minus[0], minus[1] + 0.05, minus[2] + 0.05], [0.25, TOP + 0.03, 0.12], [HELM.R / 2 + 0.02, TOP + 0.03, 0.08], [HELM.R / 2, TOP + 0.064, 0.03]]} color="#1c1d1f" flow={on ? -1 : 0} dots={8} />
    <group position={R1.supply} rotation-y={-0.4}><Supply name="学生电源" screens={['12.0V', on ? '2.00A' : '0.00A']} on={on} /></group>
  </group>
}

