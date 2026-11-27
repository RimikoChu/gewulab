// 导数实验室的大场景：一条山区二级公路。公路沿 x 方向，往东先是平地（区间测速起点、服务区、起步点），
// 再上坡到坡顶、一路下坡到谷底的小桥、又上坡出山。北侧（−z）是山，南侧（+z）是缓坡。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着公路飞。各课的位置和机位写在 SPOT 里。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, makeGround } from '@/lab-kit'
import { Sedan, Truck } from './car'
import { makeAsphalt, makeGrade, makeLimit, makeSign, rng } from './mats'
import { BRIDGE, CREEK_Y, EDGE, H, LANE, P, R, Rp, padY, PAD, railGeo, stripGeo, terrainGeo } from './terrain'
import { Trees, ridgeGeo } from './trees'

export { P }
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
type Spot = { target: THREE.Vector3; span: [number, number]; view: [number, number] }
/** 各处的机位 */
export const SPOT: Record<string, Spot> = {
  s1: { target: v(P.s1[0] - 3, 6.4, -8), span: [30, 14.5], view: [0.12, 0.09] },
  s1b: { target: v(P.s1[0] - 1, padY(PAD.s1) + 7.0, P.s1[1] + 4), span: [21, 13.6], view: [-0.1, 0.07] },
  s3: { target: v(P.s3[0], padY(PAD.s3) + 7.6, P.s3[1] + 2), span: [23, 13], view: [0.14, 0.09] },
  service: { target: v(P.service[0], 9.6, P.service[1]), span: [23.5, 17], view: [Math.PI + 0.1, 0.06] },
  s5: { target: v(P.s5[0], padY(PAD.s5) + 9.6, P.s5[1]), span: [24, 16.6], view: [-0.2, 0.07] },
  s6: { target: v(P.s6[0] - 2, padY(PAD.s6) + 6.6, P.s6[1] + 4), span: [25, 14], view: [0.2, 0.1] },
  shop: { target: v(P.shop[0] - 0.05, 1.06, P.shop[1]), span: [0.5, 0.32], view: [Math.PI + 0.14, 0.09] },
  sx: { target: v(P.sx[0], padY(PAD.sx) + 7.6, P.sx[1]), span: [22, 12.6], view: [0.12, 0.08] },
  over: { target: v(400, -2, -4), span: [56, 24], view: [Math.PI / 2 - 0.18, 0.1] },
}

const X0 = -1300, X1 = 1500
const CAN_COLORS = ['#0e8a7d', '#c8372d', '#e9e3d4', '#2a5fa8', '#e0a52a', '#3d3f44']
const inBridge = (x: number) => x > BRIDGE[0] - 1 && x < BRIDGE[1] + 1
const inService = (x: number) => x > -662 && x < -478

/** 树的位置 [x, z, 高]：北坡成片、南坡稀一些；避开路、屏、服务区和各课镜头前面 */
function treeSpots() {
  const r = rng(31), out: [number, number, number][] = []
  const screens = [P.sx, P.s1, P.s5, P.s3, P.s6]
  const blocked = (x: number, z: number) =>
    Math.abs(z) < 11 || (Math.abs(x - P.creek) < 9 && z > -60) ||
    screens.some(([sx, sz]) => Math.abs(x - sx) < 17 && z > sz - 9 && z < sz + 3) ||
    (x > -680 && x < -460 && z > 0 && z < 90) ||                    // 服务区
    (z > 8 && z < 70 && screens.some(([sx]) => Math.abs(x - sx) < 26))   // 各屏的镜头前
  // 北坡离路 25–90 m 的一带种得密一些：各课镜头的背景
  for (let i = 0; i < 4000 && out.length < 900; i++) {
    const x = -950 + r() * 2000, z = -(26 + Math.pow(r(), 1.3) * 70)
    if (!blocked(x, z)) out.push([x, z, 10 + r() * 8])
  }
  // 南坡上一丛丛的小树林：远看有层次
  for (let c = 0; c < 70; c++) {
    const cx = -950 + r() * 2000, cz = 22 + r() * 170, n = 6 + Math.floor(r() * 14), rad = 8 + r() * 14
    for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * rad * 2, z = cz + (r() - 0.5) * rad * 2; if (!blocked(x, z)) out.push([x, z, 8 + r() * 8]) }
  }
  for (let i = 0; i < 4000 && out.length < 2600; i++) {
    const x = -1000 + r() * 2200, north = r() < 0.72, z = north ? -(12 + Math.pow(r(), 0.9) * 260) : 12 + Math.pow(r(), 0.8) * 200
    if (blocked(x, z)) continue
    out.push([x, z, 9 + r() * 8])
  }
  return out
}

/** 护栏的立柱、路边的里程桩：合成一个模型 */
function postsGeo() {
  const list: THREE.BufferGeometry[] = []
  for (const s of [1, -1] as const) for (let x = X0 + 20; x < X1 - 20; x += 4) {
    if (inBridge(x) || (s > 0 && inService(x))) continue
    const g = new THREE.BoxGeometry(0.12, 0.85, 0.1); g.translate(x, R(x) + 0.42, s * (EDGE + 0.42)); list.push(g)
  }
  return mergeGeometries(list)
}

/** 小桥：桥面板、两侧的混凝土护栏、两座桥墩、桥台 */
function Bridge() {
  const [a, b] = BRIDGE, y = R(P.creek)
  return (
    <group>
      <mesh position={[(a + b) / 2, y - 0.5, 0]} castShadow receiveShadow><boxGeometry args={[b - a, 0.9, EDGE * 2 + 1]} /><meshStandardMaterial color="#86837b" roughness={0.9} /></mesh>
      {[1, -1].map(s => <mesh key={`p${s}`} position={[(a + b) / 2, y + 0.5, s * (EDGE + 0.2)]} castShadow receiveShadow><boxGeometry args={[b - a, 1.0, 0.4]} /><meshStandardMaterial color="#8e8a82" roughness={0.95} /></mesh>)}
      {[P.creek - 6, P.creek + 6].map(x => <mesh key={x} position={[x, (y - 0.9 + CREEK_Y - 1.2) / 2, 0]} castShadow receiveShadow><boxGeometry args={[1.2, y - 0.9 - CREEK_Y + 1.2, EDGE * 2 - 1]} /><meshStandardMaterial color="#aaa69c" roughness={0.92} /></mesh>)}
      {[a, b].map(x => <mesh key={`ab${x}`} position={[x, y - 1.6, 0]} castShadow receiveShadow><boxGeometry args={[2.2, 2.6, EDGE * 2 + 1.4]} /><meshStandardMaterial color="#a39f95" roughness={0.95} /></mesh>)}
    </group>
  )
}

/** 坡度警告牌：一根镀锌立柱，牌面朝来车方向，再往镜头一侧偏一点 */
function GradeSign({ x, z, pct, up, turn = -0.9 }: { x: number; z: number; pct: string; up: boolean; turn?: number }) {
  const map = makeGrade(pct, up), y = H(x, z)
  return (
    <group position={[x, y, z]} rotation-y={-Math.PI / 2 + turn}>
      <mesh position={[0, 1.3, -0.04]} castShadow><cylinderGeometry args={[0.04, 0.04, 2.6, 12]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[0, 2.25, 0.005]}><planeGeometry args={[1.1, 1.1]} /><meshStandardMaterial map={map} transparent alphaTest={0.4} roughness={0.5} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

/** 服务区：停车场、便利店（玻璃门面、雨棚、招牌）、两台自动售货机、停着的车 */
function Service() {
  const lot = useMemo(() => { const t = makeAsphalt().clone(); t.repeat.set(14, 6); t.needsUpdate = true; return t }, [])
  const shop = makeSign('便利店', { w: 512, h: 128, bg: '#0b8277', fg: '#ffffff', size: 0.6 })
  const area = makeSign('服务区', { w: 512, h: 160, bg: '#1f6d4a', fg: '#ffffff', size: 0.6 })
  const [sx, sz] = P.shop
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[-570, 0.015, 36]} receiveShadow><planeGeometry args={[176, 62]} /><meshStandardMaterial map={lot} roughness={0.92} /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[-650 + i * 3, 0.025, 14]}><planeGeometry args={[0.12, 5]} /><meshStandardMaterial color="#e8e8e2" roughness={0.7} /></mesh>)}
      {/* 便利店：浅色墙、整面玻璃门面、铝框、雨棚 */}
      <group position={[sx, 0, sz + 9]}>
        <mesh position={[0, 2.4, 0]} castShadow receiveShadow><boxGeometry args={[26, 4.8, 12]} /><meshStandardMaterial color="#e4e0d6" roughness={0.85} /></mesh>
        <mesh position={[0, 1.7, -6.02]}><planeGeometry args={[22, 3]} /><meshPhysicalMaterial color="#2c4450" roughness={0.06} metalness={0.5} clearcoat={1} envMapIntensity={1.2} /></mesh>
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-11 + i * 2, 1.7, -6.06]}><boxGeometry args={[0.08, 3, 0.08]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        <mesh position={[0, 3.24, -6.06]}><boxGeometry args={[22, 0.1, 0.1]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <RoundedBox args={[26.4, 0.3, 3.6]} radius={0.08} position={[0, 3.6, -7.6]} castShadow><meshStandardMaterial color="#f1f2ef" roughness={0.5} /></RoundedBox>
        {[-12, 12].map(x => <mesh key={x} position={[x, 1.8, -9.1]} castShadow><cylinderGeometry args={[0.12, 0.12, 3.6, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
        <mesh position={[0, 4.2, -6.03]}><planeGeometry args={[6.4, 1.2]} /><meshStandardMaterial map={shop} roughness={0.5} /></mesh>
        <mesh position={[0, 4.92, 0]} castShadow><boxGeometry args={[26.4, 0.25, 12.4]} /><meshStandardMaterial color="#d2cec4" roughness={0.8} /></mesh>
      </group>
      {/* 两台自动售货机：靠着店面，柜台在它们前面 */}
      {[-1.15, 1.15].map(dx => <group key={dx} position={[sx + dx, 0, sz + 2.35]}>
        <RoundedBox args={[1.05, 1.9, 0.8]} radius={0.04} position={[0, 0.95, 0]} castShadow receiveShadow><meshStandardMaterial color={dx < 0 ? '#b3262c' : '#1d5c9a'} roughness={0.4} metalness={0.2} /></RoundedBox>
        {/* 柜窗：里面是暗的货架和一排排罐装饮料，外面一层玻璃 */}
        <mesh position={[-0.12, 1.15, -0.36]}><planeGeometry args={[0.7, 1.24]} /><meshStandardMaterial color="#20262b" roughness={0.7} /></mesh>
        {Array.from({ length: 5 }, (_, j) => <group key={j} position={[-0.12, 0.62 + j * 0.24, -0.37]}>
          <mesh position={[0, -0.005, -0.03]}><boxGeometry args={[0.66, 0.01, 0.09]} /><Metal kind="aluminum" /></mesh>
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[-0.27 + i * 0.108, 0.06, -0.03]}><cylinderGeometry args={[0.033, 0.033, 0.12, 20]} /><meshPhysicalMaterial color={CAN_COLORS[(i + j * 2 + (dx > 0 ? 3 : 0)) % CAN_COLORS.length]} roughness={0.3} metalness={0.5} clearcoat={1} /></mesh>)}
        </group>)}
        <mesh position={[-0.12, 1.15, -0.405]}><planeGeometry args={[0.72, 1.26]} /><meshPhysicalMaterial color="#d8e4e8" roughness={0.05} metalness={0.1} clearcoat={1} transparent opacity={0.16} depthWrite={false} /></mesh>
        <mesh position={[0.36, 1.1, -0.41]}><planeGeometry args={[0.14, 0.32]} /><meshStandardMaterial color="#202326" roughness={0.4} /></mesh>
        <mesh position={[-0.1, 0.3, -0.41]}><planeGeometry args={[0.6, 0.18]} /><meshStandardMaterial color="#141618" roughness={0.6} /></mesh>
      </group>)}
      {/* 服务区的立牌 */}
      <group position={[-655, 0, 9]}>
        {[-2.2, 2.2].map(x => <mesh key={x} position={[x, 2.6, 0]} castShadow><boxGeometry args={[0.2, 5.2, 0.2]} /><Metal kind="steel" /></mesh>)}
        <RoundedBox args={[5.4, 1.7, 0.2]} radius={0.05} position={[0, 4.6, 0]} castShadow><meshStandardMaterial color="#1f6d4a" roughness={0.5} /></RoundedBox>
        <mesh position={[0, 4.6, -0.11]} rotation-y={Math.PI}><planeGeometry args={[5.1, 1.5]} /><meshStandardMaterial map={area} roughness={0.5} /></mesh>
      </group>
      {([[-640, 18, '#2d3e5c'], [-634, 18, '#e9ebec'], [-616, 18, '#8a1f24'], [-604, 18, '#3b3f44'], [-598, 18, '#b9bdc0'], [-586, 47, '#8a1f24'], [-580.5, 47, '#e9ebec'], [-562, 47, '#3b4552'], [-556.5, 47, '#b9bdc0']] as const).map(([x, z, c]) => <Sedan key={x} position={[x, 0, z]} rotation-y={-Math.PI / 2} color={c} />)}
      <Truck position={[-470, 0, 62]} rotation-y={Math.PI} cab="#b1352c" />
    </group>
  )
}

/** 区间测速起点：横跨公路的龙门架、两台摄像机、蓝色的指示牌、限速牌 */
function Gantry() {
  const x = P.zone, sign = makeSign('区间测速起点', { w: 768, h: 160, bg: '#1d4fa3', fg: '#ffffff', size: 0.5 }), lim = makeLimit(80)
  return (
    <group position={[x, 0, 0]}>
      {[1, -1].map(s => <group key={s} position={[0, 0, s * 6.2]}>
        <mesh position={[0, 3.5, 0]} castShadow><cylinderGeometry args={[0.2, 0.24, 7, 20]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[1.2, 0.4, 1.2]} /><meshStandardMaterial color="#a9a69e" roughness={0.92} /></mesh>
      </group>)}
      {[6.6, 7.2].map(y => <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[0.16, 0.16, 12.8]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      <mesh position={[-0.12, 6.9, -2]} rotation-y={-Math.PI / 2}><planeGeometry args={[4.8, 1]} /><meshStandardMaterial map={sign} roughness={0.5} /></mesh>
      <mesh position={[-0.12, 6.9, 2.4]} rotation-y={-Math.PI / 2}><circleGeometry args={[0.6, 40]} /><meshStandardMaterial map={lim} transparent alphaTest={0.4} roughness={0.5} /></mesh>
      {[-LANE, LANE].map(z => <group key={z} position={[0.2, 6.3, z]}>
        <RoundedBox args={[0.5, 0.26, 0.26]} radius={0.04}><meshStandardMaterial color="#eef0ee" roughness={0.4} /></RoundedBox>
        <mesh position={[-0.27, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.08, 0.08, 0.04, 20]} /><meshPhysicalMaterial color="#0b0f12" roughness={0.05} clearcoat={1} /></mesh>
      </group>)}
    </group>
  )
}

export function World() {
  const grass = useMemo(() => { const t = makeGround('#7d8f5e', '96,116,70', '150,156,100', 13); return t }, [])
  const asphalt = useMemo(() => { const t = makeAsphalt().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t }, [])
  const ground = useMemo(terrainGeo, [])
  const roadG = useMemo(() => stripGeo(X0, X1, -EDGE, EDGE, 0.02, 2, 12), [])
  const yellow = useMemo(() => mergeGeometries([stripGeo(X0, X1, -0.24, -0.07, 0.036), stripGeo(X0, X1, 0.07, 0.24, 0.036)]), [])
  const white = useMemo(() => mergeGeometries([stripGeo(X0, X1, -3.66, -3.44, 0.036), stripGeo(X0, X1, 3.44, 3.66, 0.036)]), [])
  const rails = useMemo(() => {
    const runs: [number, number, 1 | -1][] = [[X0 + 20, BRIDGE[0] - 1, -1], [BRIDGE[1] + 1, X1 - 20, -1], [X0 + 20, -662, 1], [-478, BRIDGE[0] - 1, 1], [BRIDGE[1] + 1, X1 - 20, 1]]
    return mergeGeometries(runs.map(([a, b, s]) => railGeo(a, b, s * (EDGE + 0.3), s)))
  }, [])
  const posts = useMemo(postsGeo, [])
  const spots = useMemo(treeSpots, [])
  const hills = useMemo(() => ({ n: ridgeGeo(3, 3000, 400, 150, '#61776c', '#a6b6bf'), s: ridgeGeo(9, 3000, 320, 90, '#71857c', '#b0bec5'), e: ridgeGeo(15, 1600, 300, 110, '#6c8176', '#aab9c1') }), [])
  return (
    <group>
      <mesh geometry={ground} receiveShadow castShadow><meshStandardMaterial map={grass} vertexColors roughness={1} /></mesh>
      {/* 路面、双黄线、白色边线 */}
      <mesh geometry={roadG} receiveShadow><meshStandardMaterial map={asphalt} roughness={0.9} /></mesh>
      <mesh geometry={yellow} receiveShadow><meshStandardMaterial color="#d9ad32" roughness={0.6} /></mesh>
      <mesh geometry={white} receiveShadow><meshStandardMaterial color="#e9e9e3" roughness={0.6} /></mesh>
      {/* 波形护栏：镀锌钢板和立柱 */}
      <mesh geometry={rails} castShadow receiveShadow><meshStandardMaterial color="#c7cbcd" metalness={0.7} roughness={0.38} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={posts} castShadow><meshStandardMaterial color="#9ea4a8" metalness={0.6} roughness={0.5} /></mesh>
      <Bridge />
      {/* 桥下的溪水 */}
      <mesh rotation-x={-Math.PI / 2} position={[P.creek, CREEK_Y, 0]}><planeGeometry args={[22, 260]} /><meshStandardMaterial color="#3e5a58" roughness={0.12} metalness={0.2} transparent opacity={0.9} /></mesh>
      {/* 坡度警告牌：上坡之前、下坡中段、出谷的上坡 */}
      <GradeSign x={-40} z={EDGE + 1.6} pct="7.5%" up />
      <GradeSign x={311} z={EDGE + 1.6} pct="6%" up={false} />
      <GradeSign x={560} z={EDGE + 1.6} pct="7.5%" up />
      <Service />
      <Gantry />
      <Trees spots={spots} ground={H} />
      {/* 远山 */}
      <mesh geometry={hills.n} position={[200, 30, -900]}><meshStandardMaterial vertexColors roughness={1} /></mesh>
      <mesh geometry={hills.s} position={[200, 0, 760]}><meshStandardMaterial vertexColors roughness={1} /></mesh>
      <mesh geometry={hills.e} position={[1600, 10, -100]} rotation-y={Math.PI / 2}><meshStandardMaterial vertexColors roughness={1} /></mesh>
      {/* 对向车道上的一辆车 */}
      <Sedan position={[230, R(230), -LANE]} rotation={[0, Math.PI, -Math.atan(Rp(230))]} color="#e3e5e6" />
    </group>
  )
}
