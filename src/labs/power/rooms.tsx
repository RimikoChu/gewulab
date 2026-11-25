// 这户人家的家具和不随课次变的电器：客厅（沙发、茶几、地毯、电视柜和电视、吸顶灯、挂式空调、开关和插座）、
// 厨房（地柜、石英石台面、水槽、燃气灶、油烟机、吊柜、冰箱）、阳台（滚筒洗衣机、插座）。单位是场景单位（1 m = 10）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, mergeParts, shell, lathe, type Part } from '@/lab-kit'
import { BACK, BAL_SOCKET, BAL_SOCKET3, COUNTER, KIT_SOCKETS, LIV, WASHER } from './layout'
import { OnWall, Socket3, Socket5, WallSwitch } from './panel'
import { makeText } from './mats'
import { Cord } from './home'

const fabric = '#6f7c86'

/** 沙发：三人位，布面，靠背和扶手是圆角的软垫 */
function Sofa({ p }: { p: [number, number, number] }) {
  const mat = <meshStandardMaterial color={fabric} roughness={0.95} />
  return <group position={p}>
    <RoundedBox args={[22, 2.2, 8.5]} radius={0.6} smoothness={3} position={[0, 2.4, 0]} castShadow receiveShadow>{mat}</RoundedBox>
    {[-7.2, 0, 7.2].map(x => <RoundedBox key={x} args={[7, 1.8, 7.4]} radius={0.8} smoothness={3} position={[x, 4.3, 0.4]} castShadow receiveShadow>{mat}</RoundedBox>)}
    <RoundedBox args={[22, 6, 2.4]} radius={0.9} smoothness={3} position={[0, 6.0, 3.2]} castShadow receiveShadow>{mat}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={s} args={[2.4, 4.6, 8.6]} radius={0.9} smoothness={3} position={[s * 11.4, 4.2, 0]} castShadow>{mat}</RoundedBox>)}
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 10, 0.65, sz * 3.4]}><cylinderGeometry args={[0.35, 0.25, 1.3, 12]} /><meshStandardMaterial color="#2a2522" roughness={0.6} /></mesh>))}
  </group>
}

/** 电视：65 英寸左右，窄边框；开着时屏幕亮起一幅风景 */
function Tv({ on }: { on: boolean }) {
  const screen = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 288; const g = c.getContext('2d')!
    const q = g.createLinearGradient(0, 0, 0, 288); q.addColorStop(0, '#6fa4d4'); q.addColorStop(0.55, '#cfe3f0'); q.addColorStop(0.56, '#3f7a4e'); q.addColorStop(1, '#2b5a39'); g.fillStyle = q; g.fillRect(0, 0, 512, 288)
    g.fillStyle = '#5d7c8f'; g.beginPath(); g.moveTo(0, 170); g.lineTo(120, 90); g.lineTo(220, 150); g.lineTo(330, 70); g.lineTo(512, 165); g.lineTo(512, 175); g.lineTo(0, 175); g.fill()
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const [x, y, z] = LIV.tv
  return <group position={[x, y, z]}>
    <RoundedBox args={[14.6, 8.4, 0.5]} radius={0.12} smoothness={2} position={[0, 0, 0.6]} castShadow><meshPhysicalMaterial color="#111214" roughness={0.3} clearcoat={0.6} /></RoundedBox>
    <mesh position={[0, 0, 0.86]}><planeGeometry args={[14.2, 8.0]} />{on ? <meshBasicMaterial map={screen} toneMapped={false} /> : <meshPhysicalMaterial color="#050607" roughness={0.08} clearcoat={1} envMapIntensity={1.2} />}</mesh>
    {on && <pointLight position={[0, 0, 4]} color="#bcd6ee" intensity={6} distance={18} decay={2} />}
    {/* 待机指示灯 */}
    <mesh position={[0, -4.12, 0.86]}><circleGeometry args={[0.07, 10]} /><meshBasicMaterial color={on ? '#7dff9a' : '#ff4a3a'} toneMapped={false} /></mesh>
  </group>
}

/** 吸顶灯：直径 50 cm 的圆盘，乳白灯罩；开着时自己发光，再往下照 */
export function CeilingLamp({ on, p = LIV.lamp }: { on: boolean; p?: [number, number, number] }) {
  const dome = useMemo(() => lathe([[0, -0.9], [2.0, -0.8], [2.4, -0.4], [2.5, 0]], { segs: 48 }), [])
  return <group position={p}>
    <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[2.55, 2.55, 0.3, 48]} /><meshStandardMaterial color="#e8e6e0" roughness={0.6} /></mesh>
    <mesh geometry={dome} position={[0, -0.3, 0]}>
      {on ? <meshStandardMaterial color="#fffaf0" emissive="#fff3dc" emissiveIntensity={1.6} toneMapped={false} /> : <meshPhysicalMaterial color="#f3f2ee" roughness={0.35} transmission={0} clearcoat={0.4} />}
    </mesh>
    {on && <pointLight position={[0, -3, 0]} color="#fff0d8" intensity={260} distance={70} decay={1.6} castShadow={false} />}
  </group>
}

/** 挂式空调：0.9 m 宽的白色机身，下面一道出风口 */
function AirCon() {
  const [x, y, z] = LIV.ac
  const tag = useMemo(() => makeText(['节能'], { w: 128, h: 64, bg: '#f4f4f1', fg: '#2f8fd0', size: 36 }), [])
  return <group position={[x, y, z]}>
    <RoundedBox args={[9, 2.9, 2]} radius={0.5} smoothness={4} position={[0, 0, 1]} castShadow><meshPhysicalMaterial color="#f6f6f3" roughness={0.3} clearcoat={0.5} /></RoundedBox>
    <mesh position={[0, -1.05, 2.01]}><planeGeometry args={[7.6, 0.5]} /><meshStandardMaterial color="#c9cbc8" roughness={0.6} /></mesh>
    <mesh position={[3.2, 0.4, 2.01]}><planeGeometry args={[1.2, 0.6]} /><meshStandardMaterial map={tag} roughness={0.6} /></mesh>
  </group>
}

/** 前开门滚筒洗衣机：60 × 60 × 85 cm，白色机身，圆形玻璃门，上面一块控制面板 */
export function Washer({ on }: { on: boolean }) {
  const ring = useMemo(() => lathe([[1.6, 0], [2.3, 0], [2.4, 0.3], [2.2, 0.6], [1.6, 0.55]], { segs: 48, closed: true }), [])
  const drum = useRef<THREE.Mesh>(null)
  useFrame((_, d) => { if (drum.current && on) drum.current.rotation.z += Math.min(d, 1 / 30) * 3 })
  const body = <meshPhysicalMaterial color="#f3f3f0" roughness={0.32} clearcoat={0.5} />
  return <group position={WASHER}>
    <RoundedBox args={[6, 8.5, 6]} radius={0.3} smoothness={3} position={[0, 4.25, 0]} castShadow receiveShadow>{body}</RoundedBox>
    <mesh position={[0, 7.75, 3.01]}><planeGeometry args={[5.6, 1.1]} /><meshStandardMaterial color="#d8dadb" roughness={0.4} /></mesh>
    <mesh position={[1.6, 7.75, 3.06]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.45, 0.45, 0.15, 24]} /><Metal kind="chrome" /></mesh>
    <mesh position={[-1.6, 7.75, 3.04]}><planeGeometry args={[1.6, 0.5]} /><meshBasicMaterial color={on ? '#7fd3ff' : '#2a2e33'} toneMapped={false} /></mesh>
    <group position={[0, 3.9, 3]} rotation-x={Math.PI / 2}>
      <mesh geometry={ring} castShadow><Metal kind="chrome" rough={0.15} /></mesh>
    </group>
    <mesh position={[0, 3.9, 3.35]}><circleGeometry args={[1.65, 40]} /><meshPhysicalMaterial color="#9fb0bc" transparent opacity={0.35} roughness={0.05} envMapIntensity={1.6} depthWrite={false} /></mesh>
    <mesh ref={drum} position={[0, 3.9, 2.4]}><circleGeometry args={[1.55, 6]} /><meshStandardMaterial color="#6c757c" metalness={0.8} roughness={0.4} /></mesh>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 2.5, 0.1, sz * 2.5]}><cylinderGeometry args={[0.35, 0.4, 0.3, 12]} /><meshStandardMaterial color="#2a2b2d" roughness={0.7} /></mesh>))}
  </group>
}

/** 冰箱：双开门，银灰拉丝面板 */
function Fridge({ x }: { x: number }) {
  return <group position={[x, 0, BACK + 3.3]}>
    <RoundedBox args={[6.6, 18.2, 6.4]} radius={0.3} smoothness={3} position={[0, 9.1, 0]} castShadow receiveShadow><meshStandardMaterial color="#b9bdc0" metalness={0.7} roughness={0.38} /></RoundedBox>
    <mesh position={[0, 9.4, 3.21]}><planeGeometry args={[0.06, 17.4]} /><meshBasicMaterial color="#2c2f31" /></mesh>
    {[-0.5, 0.5].map(s => <mesh key={s} position={[s * 0.9, 11, 3.35]}><boxGeometry args={[0.25, 6, 0.3]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
  </group>
}

export function Furniture({ lamp, tv, washer }: { lamp: boolean; tv: boolean; washer: boolean }) {
  const geo = useMemo(() => {
    const P: Part[] = []
    // 客厅：电视柜、茶几、地毯、落地灯、绿植盆
    P.push({ p: [-56, 2.3, BACK + 2.3], s: [24, 3.6, 4.4], c: '#ded6c8' }, { p: [-56, 0.25, BACK + 2.3], s: [23.4, 0.5, 4], c: '#3c3a37' })
    for (const x of [-62, -50]) P.push({ p: [x, 2.3, BACK + 4.52], s: [11.6, 0.06, 0.06], c: '#8f877a' })
    P.push({ p: [-62, 3.6, -24], s: [11, 0.6, 6], c: '#d7cbb6' }, { p: [-62, 1.6, -24], s: [10.4, 0.25, 5.4], c: '#6e5a45' })
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ p: [-62 + sx * 5, 1.65, -24 + sz * 2.6], s: [0.5, 3.3, 0.5], c: '#6e5a45' })
    P.push({ p: [-96, 8, -8], s: [0.3, 16, 0.3], c: '#2e2f31', cyl: true }, { p: [-96, 0.3, -8], s: [1.6, 0.6, 1.6], c: '#2e2f31', cyl: true })
    P.push({ p: [-71, 2.2, -41.5], s: [1.8, 4.4, 1.8], c: '#e6e1d6', cyl: true })
    // 厨房：地柜（门板之间的缝、拉手）、踢脚、台面、吊柜
    const { y, z1, x0, x1 } = COUNTER
    P.push({ p: [(x0 + x1) / 2, 0.5, BACK + 2.8], s: [x1 - x0, 1, 5.4], c: '#3a3a38' })
    P.push({ p: [(x0 + x1) / 2, (y - 0.4 + 1) / 2, BACK + 2.9], s: [x1 - x0, y - 1.4, 5.6], c: '#d7d4cc' })
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 7) P.push({ p: [x, (y - 0.4 + 1) / 2, z1 - 0.28], s: [0.08, y - 1.4, 0.06], c: '#9a978f' })
    for (let k = 0; k < 7; k++) { const x = x0 + (k + 0.5) * (x1 - x0) / 7; P.push({ p: [x, y - 1.3, z1 - 0.15], s: [2.6, 0.18, 0.3], c: '#6c6d6e' }) }
    P.push({ p: [(x0 + x1) / 2, y - 0.2, BACK + 3.05], s: [x1 - x0 + 0.2, 0.4, 6.3], c: '#ecebe6' })
    P.push({ p: [-21, 18.5, BACK + 1.75], s: [16, 7, 3.5], c: '#d7d4cc' })
    for (const x of [-25, -21, -17]) P.push({ p: [x, 18.5, BACK + 3.52], s: [0.06, 6.8, 0.06], c: '#9a978f' })
    // 油烟机和燃气灶
    P.push({ p: [-8.5, 21.5, BACK + 2.2], s: [5.4, 2.6, 4.4], c: '#2a2c2f' }, { p: [-8.5, 25, BACK + 1.2], s: [2.6, 4.8, 2.4], c: '#7b7f83' })
    P.push({ p: [-8.5, y + 0.05, BACK + 3.2], s: [5.2, 0.12, 4], c: '#141516' })
    return mergeParts(P)
  }, [])
  // 水槽：不锈钢的盆（有壁厚），龙头
  const sink = useMemo(() => shell([[0, 0], [1.9, 0], [2.1, 2]], 0.12, { segs: 40 }), [])
  const rug = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; g.fillStyle = '#b8ab96'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#8e7f6a'; g.lineWidth = 10; g.strokeRect(14, 14, 228, 228); for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(80,60,40,${Math.random() * 0.08})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.55} metal={0.1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[-62, 0.06, -22]} receiveShadow><planeGeometry args={[30, 18]} /><meshStandardMaterial map={rug} roughness={1} /></mesh>
    <Sofa p={[-62, 0, -9]} />
    <Tv on={tv} />
    <CeilingLamp on={lamp} />
    <AirCon />
    {/* 植物：盆里一丛叶子 */}
    {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[-71 + Math.cos(i) * 0.8, 5.6 + (i % 3) * 0.9, -41.5 + Math.sin(i) * 0.8]} rotation={[0.3 * Math.cos(i * 2), i, 0.4 * Math.sin(i)]}><sphereGeometry args={[1.5, 10, 8]} /><meshStandardMaterial color={i % 2 ? '#4f7a3e' : '#3e6a34'} roughness={0.9} /></mesh>)}
    {/* 落地灯的灯罩 */}
    <mesh position={[-96, 17.2, -8]}><cylinderGeometry args={[1.6, 2.6, 3, 24, 1, true]} /><meshStandardMaterial color="#efe6d2" roughness={0.9} side={THREE.DoubleSide} /></mesh>
    {/* 墙上的开关和插座 */}
    <OnWall p={LIV.sw}><WallSwitch on={lamp} /></OnWall>
    <OnWall p={LIV.tvSocket}><Socket5 /></OnWall>
    <OnWall p={[-82, 3, BACK]}><Socket5 /></OnWall>
    <OnWall p={[LIV.ac[0] + 6, LIV.ac[1] - 1, BACK]}><Socket3 /></OnWall>
    {KIT_SOCKETS.map((p, i) => <OnWall key={i} p={p}><Socket5 /></OnWall>)}
    <OnWall p={BAL_SOCKET}><Socket5 /></OnWall>
    <OnWall p={BAL_SOCKET3}><Socket3 /></OnWall>
    <Fridge x={6.6} />
    <group position={[-1, COUNTER.y - 2.05, BACK + 3]}><mesh geometry={sink} castShadow><Metal kind="stainless" grain="brushed" /></mesh></group>
    <group position={[-1, COUNTER.y, BACK + 0.9]}>
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.22, 0.28, 3.2, 16]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, 3.2, 0.9]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.18, 0.18, 2, 16]} /><Metal kind="chrome" /></mesh>
    </group>
    {/* 燃气灶的两个炉头 */}
    {[-1.3, 1.3].map(dx => <mesh key={dx} position={[-8.5 + dx, COUNTER.y + 0.2, BACK + 3.2]}><cylinderGeometry args={[0.8, 0.9, 0.3, 24]} /><Metal kind="iron" grain="cast" /></mesh>)}
    <Washer on={washer} />
    {/* 洗衣机的插头线：从机身后面出来，贴着墙走上去，插在三孔插座上 */}
    <Cord r={0.05} color="#e9e8e3" pts={[[WASHER[0] - 2.4, 7.8, WASHER[2] - 2.8], [WASHER[0] - 3.4, 8.0, BACK + 0.2], [BAL_SOCKET3[0] + 0.6, 8.4, BACK + 0.15], [BAL_SOCKET3[0], 10.5, BACK + 0.15], [BAL_SOCKET3[0], 12.6, BACK + 0.25]]} />
    <RoundedBox args={[0.4, 0.46, 0.26]} radius={0.06} smoothness={2} position={[BAL_SOCKET3[0], BAL_SOCKET3[1] - 0.15, BACK + 0.22]} castShadow><meshPhysicalMaterial color="#f2f1ec" roughness={0.35} clearcoat={0.4} /></RoundedBox>
  </group>
}
