// 浮力实验室各课共用的造船厂：码头、船体、堆场、试验水池、悬臂吊、吊秤，以及镜头、标签、画质分档。
// 场景单位 1 = 1 m。每一课只需要往里放自己的器材。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { POOL } from './physics'
import { LabStage, Led, Painted, Rod, mergeParts, useConcrete, useRipple, type Part, type StageProps } from '@/lab-kit'

// 通用部件都在 lab-kit 里；这里转出一份，浮力各课的引用不用改
export { ForceArrow, Led, Painted, Rod, mergeParts, useConcrete, useLiftDrag, useRipple, type Label, type Part, type Tag } from '@/lab-kit'

export const BRIM = POOL.brim                // 满水位（溢水口）离地的高度
export const HALF = POOL.side / 2
export const JIB_Y = 8.6                     // 吊臂高度
export const SEA_Y = -1.6                     // 海面的高度（码头面是 0）
export const QUAY_X = 26.1                   // 岸壁的位置
export const YELLOW = '#e8b21e', STEEL = '#59626b', CONCRETE = '#a7a59d'

// ---------- 码头环境 ----------
/** 码头地面、地面标线、岸边和海 */
function Quay({ sea: withSea }: { sea: boolean }) {
  const [d, n, r] = useConcrete(34, 62)
  const sea = useRipple(70, 0.012)
  const marks = useMemo(() => {
    const y = 0.012, P: Part[] = []
    const line = (x: number, z: number, w: number, l: number, c = '#e4b524', rot = 0) => P.push({ p: [x, y, z], s: [w, 0.012, l], c, r: [0, rot, 0] })
    // 作业区黄框
    line(1.4, 4.3, 12.4, 0.22); line(1.4, -4.6, 12.4, 0.22); line(-4.8, -0.15, 0.22, 9.1); line(7.6, -0.15, 0.22, 9.1)
    // 斜纹警示带
    for (let i = 0; i < 14; i++) line(-13 + i * 1.1, 7.2, 0.3, 3.2, '#e4b524', 0.7)
    // 车道虚线
    // 车道虚线只画到岸边黄线以内，不能伸到水面上
    for (let i = 0; i < 13; i++) line(-40 + i * 5, 10.5, 2.6, 0.2, '#e9e6dc')
    for (let i = 0; i < 13; i++) line(-40 + i * 5, -9.5, 2.6, 0.2, '#e9e6dc')
    // 岸边黄线
    line(24.6, 40, 0.35, 260)
    return mergeParts(P)
  }, [])
  return (
    <group>
      <mesh position={[-45, -0.5, 40]} receiveShadow><boxGeometry args={[142, 1, 260]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#dedbd2" envMapIntensity={0.8} /></mesh>
      <mesh geometry={marks}><Painted rough={0.8} metal={0} /></mesh>
      {/* 岸壁和海面 */}
      <mesh position={[26.05, -2, 40]}><boxGeometry args={[0.1, 4, 260]} /><meshStandardMaterial color="#6f6d66" roughness={0.9} /></mesh>
      {withSea && <mesh position={[160, SEA_Y, 40]} rotation-x={-Math.PI / 2}><planeGeometry args={[280, 640]} /><meshPhysicalMaterial color="#1c5560" roughness={0.12} metalness={0.1} normalMap={sea} normalScale={new THREE.Vector2(0.55, 0.55)} envMapIntensity={1.6} /></mesh>}
    </group>
  )
}

/** 船台上正在建造的船体：一圈圈横剖面连成的壳，颜色用一张带水线的贴图 */
function Hull() {
  const geo = useMemo(() => {
    const L = 84, B = 7.5, D = 12, nx = 56, ns = 16, pos: number[] = [], uv: number[] = [], idx: number[] = []
    for (const side of [1, -1]) {
      const base = pos.length / 3
      for (let i = 0; i <= nx; i++) for (let j = 0; j <= ns; j++) {
        const t = i / nx, phi = (j / ns) * Math.PI / 2
        const fine = THREE.MathUtils.smoothstep(t, 0.58, 1)                                    // 越靠船头，剖面越尖
        const bw = B * Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.68) / 0.32), 2.2)), 0.7) * (t < 0.12 ? 0.78 + 0.22 * (t / 0.12) : 1)
        const y = D * Math.pow(1 - Math.cos(phi), 0.8)
        pos.push((t - 0.5) * L + 7 * fine * Math.pow(y / D, 1.5), y, side * bw * Math.pow(Math.sin(phi), 0.35 + 1.1 * fine))
        uv.push(t, y / D)
      }
      for (let i = 0; i < nx; i++) for (let j = 0; j < ns; j++) {
        const a = base + i * (ns + 1) + j, b = a + ns + 1
        if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
    return g
  }, [])
  const paint = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 512
    const g = c.getContext('2d')!
    g.fillStyle = '#22354a'; g.fillRect(0, 0, 2048, 512)                      // 干舷：深蓝
    g.fillStyle = '#7c2f26'; g.fillRect(0, 512 * 0.56, 2048, 512)             // 水线以下：防污漆的铁红
    g.fillStyle = '#e8e6df'; g.fillRect(0, 512 * 0.545, 2048, 9)              // 水线
    g.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 28; i++) g.fillRect(i * 74, 0, 2, 512)    // 钢板拼缝
    g.fillStyle = '#e8e6df'; g.font = '700 58px -apple-system, "PingFang SC", sans-serif'; g.fillText('格物 01', 1480, 232)
    g.font = '600 20px ui-monospace, monospace'; for (let i = 0; i < 6; i++) g.fillText(String(12 - i * 2), 1760, 300 + i * 34)   // 吃水标尺
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
  const support = useMemo(() => {
    const P: Part[] = []
    for (let i = 0; i < 22; i++) P.push({ p: [-36 + i * 3.3, 0.7, 0], s: [1.2, 1.4, 2.2], c: '#8a877f' })                       // 龙骨墩
    // 船体前面的脚手架
    for (let i = 0; i < 20; i++) for (const z of [8.6, 10]) P.push({ p: [-38 + i * 2.6, 6.5, z], s: [0.09, 13, 0.09], c: '#9aa3ad' })
    for (let k = 1; k <= 6; k++) { P.push({ p: [-13.3, k * 2.1, 9.3], s: [50, 0.08, 1.5], c: '#b9a27c' }); P.push({ p: [-13.3, k * 2.1 + 1, 10], s: [50, 0.06, 0.06], c: '#9aa3ad' }) }
    return mergeParts(P)
  }, [])
  return (
    <group position={[-10, 0, -31]}>
      <mesh geometry={geo} position={[0, 1.4, 0]}><meshStandardMaterial map={paint} roughness={0.55} metalness={0.25} side={THREE.DoubleSide} envMapIntensity={0.9} /></mesh>
      <mesh geometry={support}><Painted rough={0.75} /></mesh>
    </group>
  )
}

/** 远处的龙门吊、堆场里的钢板、集装箱房、油桶、灯杆、系船柱：全是合并出来的静态模型 */
function Yard() {
  const geo = useMemo(() => {
    const P: Part[] = [], RED = '#d8d4c8'
    // 龙门吊：两片门腿 + 主梁
    for (const z of [-17, -45]) {
      P.push({ p: [17, 13, z], s: [1.5, 26, 1.5], c: RED }, { p: [23, 13, z], s: [1.5, 26, 1.5], c: RED }, { p: [20, 0.6, z], s: [9, 1.2, 2], c: '#3c4249' }, { p: [20, 17, z], s: [6, 0.8, 0.8], c: RED })
    }
    P.push({ p: [20, 27.5, -31], s: [4, 3.4, 34], c: RED }, { p: [20, 25.2, -27], s: [3, 1.6, 3.2], c: '#30353b' })
    // 钢板堆
    for (let k = 0; k < 7; k++) P.push({ p: [-11 + (k % 2) * 0.15, 0.09 + k * 0.17, -8.2], s: [6, 0.15, 2.6], c: k % 3 ? '#6b5a4d' : '#7a6656' })
    for (let k = 0; k < 4; k++) P.push({ p: [-11.5, 0.09 + k * 0.17, -12.2], s: [5, 0.15, 2.4], c: '#64707a' })
    // 钢管
    for (let k = 0; k < 5; k++) P.push({ p: [9 + k * 0.62, 0.3, -9], s: [0.3, 7, 0.3], c: '#7d858d', cyl: true, r: [Math.PI / 2, 0, 0] })
    for (let k = 0; k < 4; k++) P.push({ p: [9.31 + k * 0.62, 0.83, -9], s: [0.3, 7, 0.3], c: '#7d858d', cyl: true, r: [Math.PI / 2, 0, 0] })
    // 集装箱房
    const box = (x: number, y: number, z: number, c: string) => { P.push({ p: [x, y, z], s: [6.06, 2.59, 2.44], c }); for (let i = 0; i < 12; i++) P.push({ p: [x - 2.75 + i * 0.5, y, z + 1.225], s: [0.12, 2.3, 0.04], c }) }
    box(-21, 1.3, -6, '#2f6f8f'); box(-21, 3.9, -6, '#d8d5cb'); box(-27.4, 1.3, -6, '#c98a2b'); box(-21, 1.3, -9, '#3f7d5a')
    // 油桶和气瓶
    const drums: [number, number, string][] = [[6.9, -3.4, '#b53a2b'], [7.6, -3.2, '#2d5f8a'], [7.2, -2.6, '#b53a2b']]
    for (const [x, z, c] of drums) P.push({ p: [x, 0.45, z], s: [0.29, 0.9, 0.29], c, cyl: true })
    // 灯杆
    for (const [x, z] of [[-7, -5.6], [12, -14]] as const) P.push({ p: [x, 6, z], s: [0.11, 12, 0.11], c: '#70777e', cyl: true }, { p: [x, 12, z + 0.5], s: [1.6, 0.25, 0.6], c: '#3a3f45' })
    // 岸边系船柱
    for (let i = 0; i < 18; i++) P.push({ p: [25.2, 0.3, -52 + i * 9], s: [0.28, 0.6, 0.28], c: '#2b2f33', cyl: true }, { p: [25.2, 0.62, -52 + i * 9], s: [0.42, 0.12, 0.42], c: '#2b2f33', cyl: true })
    // 镜头背后那一侧：一排车间厂房、几只集装箱、另一堆钢板，转过去看也不空
    P.push({ p: [-22, 8, 52], s: [96, 16, 26], c: '#c4c8cc' }, { p: [-22, 16.6, 52], s: [98, 1.2, 28], c: '#5d6b78' })
    for (let i = 0; i < 6; i++) P.push({ p: [-62 + i * 16, 5, 38.9], s: [10, 10, 0.3], c: i % 2 ? '#2f6f8f' : '#3b4650' }, { p: [-62 + i * 16, 12.6, 38.9], s: [10, 1.6, 0.2], c: '#e9eef2' })
    box(-36, 1.3, 24, '#b9502f'); box(-36, 3.9, 24, '#2f6f8f'); box(-29.6, 1.3, 24, '#d8d5cb'); box(-36, 1.3, 27, '#c98a2b')   // 放在左后方，不挡码头岸边
    for (let k = 0; k < 6; k++) P.push({ p: [-14, 0.09 + k * 0.17, 18], s: [7, 0.15, 3], c: k % 2 ? '#6b5a4d' : '#64707a' })
    for (const [x, z] of [[-9, 14], [-24, 20]] as const) P.push({ p: [x, 6, z], s: [0.11, 12, 0.11], c: '#70777e', cyl: true }, { p: [x, 12, z - 0.5], s: [1.6, 0.25, 0.6], c: '#3a3f45' })
    return mergeParts(P)
  }, [])
  return <mesh geometry={geo} castShadow receiveShadow><Painted /></mesh>
}

// ---------- 各课共用的器材 ----------
/** 试验水池：三面混凝土墙、正面观察窗，旁边是上池顶的楼梯和护栏 */
export function Pool({ spout = true }: { spout?: boolean }) {
  const [d, n, r] = useConcrete(1.2, 1.1)
  const steel = useMemo(() => {
    const P: Part[] = [], T = 0.28, top = BRIM + 0.25, o = HALF + T
    // 观察窗的钢框
    for (const x of [-HALF - 0.06, HALF + 0.06]) P.push({ p: [x, top / 2, HALF + 0.09], s: [0.16, top, 0.2], c: STEEL })
    P.push({ p: [0, 0.14, HALF + 0.09], s: [POOL.side + 0.28, 0.28, 0.2], c: STEEL }, { p: [0, top - 0.06, HALF + 0.09], s: [POOL.side + 0.28, 0.12, 0.2], c: STEEL })
    // 池顶护栏（左边和后边）
    const post = (x: number, z: number) => P.push({ p: [x, top + 0.55, z], s: [0.06, 1.1, 0.06], c: YELLOW })
    for (let i = 0; i <= 4; i++) { post(-o + 0.08, -o + 0.08 + i * (2 * o - 0.16) / 4); if (i > 0 && i < 4) post(-o + 0.08 + i * (2 * o - 0.16) / 4, -o + 0.08) }
    for (const y of [0.55, 1.08]) P.push({ p: [-o + 0.08, top + y, 0], s: [0.05, 0.05, 2 * o - 0.16], c: YELLOW }, { p: [-0.9, top + y, -o + 0.08], s: [2 * o - 1.9, 0.05, 0.05], c: YELLOW })
    // 楼梯：贴着左墙从前往后上
    const N = 13, run = 0.3, x = -o - 0.55
    for (let i = 0; i < N; i++) P.push({ p: [x, (i + 1) * top / N - 0.03, 2.1 - i * run], s: [0.9, 0.05, 0.3], c: '#7b838b' })
    const len = Math.hypot(N * run, top), ang = Math.atan2(top, N * run)
    for (const dx of [-0.45, 0.45]) P.push({ p: [x + dx, top / 2, 2.1 - N * run / 2 + 0.15], s: [0.05, 0.16, len], c: STEEL, r: [ang, 0, 0] })
    P.push({ p: [x - 0.45, top / 2 + 1, 2.1 - N * run / 2 + 0.15], s: [0.05, 0.05, len], c: YELLOW, r: [ang, 0, 0] })
    for (let i = 0; i <= 3; i++) P.push({ p: [x - 0.45, (i * 4 + 1) * top / N + 0.5, 2.1 - i * 4 * run], s: [0.05, 1, 0.05], c: YELLOW })
    if (spout) {   // 溢水槽：从右墙的溢水口斜着伸向计量槽
    P.push({ p: [o + 0.42, BRIM - 0.13, 0], s: [0.9, 0.05, 0.5], c: STEEL, r: [0, 0, -0.16] })
      for (const z of [-0.25, 0.25]) P.push({ p: [o + 0.42, BRIM - 0.03, z], s: [0.9, 0.2, 0.04], c: STEEL, r: [0, 0, -0.16] })
    }
    return mergeParts(P)
  }, [spout])
  const T = 0.28, top = BRIM + 0.25
  const wall = <meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color={CONCRETE} envMapIntensity={0.5} />
  return (
    <group>
      <mesh position={[0, top / 2, -HALF - T / 2]} castShadow receiveShadow><boxGeometry args={[POOL.side + 2 * T, top, T]} />{wall}</mesh>
      <mesh position={[-HALF - T / 2, top / 2, 0]} castShadow receiveShadow><boxGeometry args={[T, top, POOL.side]} />{wall}</mesh>
      {/* 右墙：有溢水口时在中间留一个缺口 */}
      {spout ? <>
        <mesh position={[HALF + T / 2, (BRIM - 0.02) / 2, 0]} castShadow receiveShadow><boxGeometry args={[T, BRIM - 0.02, POOL.side]} />{wall}</mesh>
        {[-0.875, 0.875].map(z => <mesh key={z} position={[HALF + T / 2, BRIM + 0.115, z]} castShadow><boxGeometry args={[T, 0.27, 1.25]} />{wall}</mesh>)}
      </> : <mesh position={[HALF + T / 2, top / 2, 0]} castShadow receiveShadow><boxGeometry args={[T, top, POOL.side]} />{wall}</mesh>}
      <mesh position={[0, POOL.floor / 2, 0]} receiveShadow><boxGeometry args={[POOL.side, POOL.floor, POOL.side]} />{wall}</mesh>
      <mesh geometry={steel} castShadow receiveShadow><Painted metal={0.5} rough={0.5} /></mesh>
      {/* 池子内壁刷成深色，水才显得深，放进去的物块也看得清 */}
      <mesh position={[0, top / 2 + POOL.floor / 2, -HALF + 0.006]}><planeGeometry args={[POOL.side, top - POOL.floor]} /><meshStandardMaterial color="#173a44" roughness={0.9} /></mesh>
      <mesh position={[-HALF + 0.006, top / 2 + POOL.floor / 2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[POOL.side, top - POOL.floor]} /><meshStandardMaterial color="#173a44" roughness={0.9} /></mesh>
      <mesh position={[HALF - 0.006, (BRIM + POOL.floor) / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[POOL.side, BRIM - POOL.floor]} /><meshStandardMaterial color="#173a44" roughness={0.9} /></mesh>
      <mesh position={[0, POOL.floor + 0.006, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[POOL.side, POOL.side]} /><meshStandardMaterial color="#1b414b" roughness={0.85} /></mesh>
      {/* 观察窗：只留一层很淡的反光，不能盖住水的颜色 */}
      <mesh position={[0, top / 2 + 0.05, HALF + 0.02]} renderOrder={4}>
        <planeGeometry args={[POOL.side, top - 0.3]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** 钢架玻璃水槽：和试验水池一样大，四面透明，后面和两侧衬深色板。lid：顶上加一圈盖框 */
export function GlassTank({ lid = false }: { lid?: boolean }) {
  const top = BRIM + 0.25, o = HALF + 0.08, hgt = top - POOL.floor
  const geo = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [0, POOL.floor / 2, 0], s: [POOL.side + 0.36, POOL.floor, POOL.side + 0.36], c: '#4a5058' })
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ p: [sx * o, top / 2, sz * o], s: [0.16, top, 0.16], c: STEEL })
    for (const sz of [-1, 1]) P.push({ p: [0, top - 0.06, sz * o], s: [POOL.side + 0.32, 0.12, 0.16], c: STEEL })
    for (const sx of [-1, 1]) P.push({ p: [sx * o, top - 0.06, 0], s: [0.16, 0.12, POOL.side + 0.32], c: STEEL })
    if (lid) for (const x of [-0.75, 0.75]) P.push({ p: [x, top - 0.03, 0], s: [0.1, 0.06, POOL.side + 0.2], c: STEEL })
    return mergeParts(P)
  }, [lid, top, o])
  const dark = <meshStandardMaterial color="#173a44" roughness={0.9} />
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow><Painted metal={0.5} rough={0.5} /></mesh>
      <mesh position={[0, POOL.floor + hgt / 2, -HALF]}><planeGeometry args={[POOL.side, hgt]} />{dark}</mesh>
      <mesh position={[-HALF, POOL.floor + hgt / 2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[POOL.side, hgt]} />{dark}</mesh>
      <mesh position={[HALF, POOL.floor + hgt / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[POOL.side, hgt]} />{dark}</mesh>
      <mesh position={[0, POOL.floor + 0.006, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[POOL.side, POOL.side]} /><meshStandardMaterial color="#1b414b" roughness={0.85} /></mesh>
      <mesh position={[0, POOL.floor + hgt / 2, HALF + 0.02]} renderOrder={4}><planeGeometry args={[POOL.side, hgt]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} /></mesh>
    </group>
  )
}

/** 池里的水：一块半透明的水体 + 会晃的水面 */
export function Water({ levelY, color, stir, side = POOL.side }: { levelY: number; color: string; stir: React.RefObject<number>; side?: number }) {
  const map = useRipple(2.2, 0.03), mat = useRef<THREE.MeshPhysicalMaterial>(null)
  useFrame(() => { if (mat.current) { const k = 0.18 + stir.current * 0.6; mat.current.normalScale.set(k, k) } })
  const hgt = levelY - POOL.floor
  const deep = useMemo(() => new THREE.Color(color).multiplyScalar(0.22), [color])   // 水体不受光照，只给后面的东西罩一层深色：物块在里面才有反差
  return (
    <group>
      <mesh position={[0, POOL.floor + hgt / 2, 0]} renderOrder={2}>
        <boxGeometry args={[side - 0.01, hgt, side - 0.01]} />
        <meshBasicMaterial color={deep} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, levelY + 0.004, 0]} rotation-x={-Math.PI / 2} renderOrder={3}>
        <planeGeometry args={[side - 0.01, side - 0.01]} />
        <meshPhysicalMaterial ref={mat} color={color} transparent opacity={0.5} roughness={0.04} envMapIntensity={1.6} normalMap={map} clearcoat={1} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** 码头外面的开放水域：能看进水里。水体和试验水池一样用不受光照的深色半透明材质。
 *  cut：把水沿这条 z 线竖着剖开，只留一侧（dir = 1 留 z 更小的一侧），另一侧露出海床，从那边能看到水下的剖面 */
export function OpenSea({ depth, cut, dir = 1, color = '#1f7f9c', gloss = 0.5, tint = 0.5 }: { depth: number; cut?: number; dir?: 1 | -1; color?: string; gloss?: number; tint?: number }) {
  const X1 = 300, bed = SEA_Y - depth
  const [za, zb] = cut == null ? [-280, 360] : dir > 0 ? [-280, cut] : [cut, 360]
  const w = X1 - QUAY_X, l = zb - za, cx = (QUAY_X + X1) / 2, cz = (za + zb) / 2
  const map = useRipple([w * 0.28, l * 0.28], 0.012)
  const [d, n, r] = useConcrete(60, 140)
  const deep = useMemo(() => new THREE.Color(color).multiplyScalar(0.22), [color])
  // 剖面上的一层渐变：靠近水面透亮，越往下越暗；最上面一条亮线是水面
  const face = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256
    const g = c.getContext('2d')!, k = new THREE.Color(color), rgb = `${Math.round(k.r * 255)},${Math.round(k.g * 255)},${Math.round(k.b * 255)}`
    const grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, `rgba(${rgb},0.42)`); grad.addColorStop(0.45, `rgba(${rgb},0.12)`); grad.addColorStop(1, 'rgba(4,22,28,0.38)')
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256)
    g.fillStyle = 'rgba(225,246,250,0.75)'; g.fillRect(0, 0, 4, 2)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [color])
  return (
    <group>
      {/* 海床：露在外面的一段是浅色的，水底下的一段刷深，水才显得深 */}
      <mesh position={[cx, bed, 40]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[w, 640]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#a9aaa2" envMapIntensity={0.6} /></mesh>
      <mesh position={[cx, bed + 0.012, cz]} rotation-x={-Math.PI / 2}><planeGeometry args={[w, l]} /><meshStandardMaterial color="#1b414b" roughness={0.9} /></mesh>
      {/* 岸壁一直接到海床 */}
      <mesh position={[QUAY_X + 0.012, bed / 2, 40]} rotation-y={Math.PI / 2} receiveShadow><planeGeometry args={[640, -bed]} /><meshStandardMaterial color="#77756e" roughness={0.92} /></mesh>
      {/* 岸壁泡在水里的那一段刷深色：水线一眼看得出来 */}
      <mesh position={[QUAY_X + 0.02, (bed + SEA_Y) / 2, cz]} rotation-y={Math.PI / 2}><planeGeometry args={[l, depth]} /><meshStandardMaterial color="#1d444e" roughness={0.9} /></mesh>
      <mesh position={[QUAY_X + 0.03, SEA_Y + 0.05, cz]} rotation-y={Math.PI / 2}><planeGeometry args={[l, 0.1]} /><meshBasicMaterial color="#3b4a44" /></mesh>
      {cut != null && <mesh position={[cx, (bed + SEA_Y) / 2, cut - dir * 26]} rotation-y={dir > 0 ? 0 : Math.PI}><planeGeometry args={[w, depth]} /><meshBasicMaterial color="#0d2a31" /></mesh>}
      <mesh position={[cx, (bed + SEA_Y) / 2, cz]} renderOrder={2}>
        <boxGeometry args={[w, depth, l]} />
        <meshBasicMaterial color={deep} transparent opacity={tint} depthWrite={false} />
      </mesh>
      {cut != null && <mesh position={[cx, (bed + SEA_Y) / 2, cut + dir * 0.006]} rotation-y={dir > 0 ? 0 : Math.PI} renderOrder={4}><planeGeometry args={[w, depth]} /><meshBasicMaterial map={face} transparent depthWrite={false} toneMapped={false} /></mesh>}
      <mesh position={[cx, SEA_Y + 0.004, cz]} rotation-x={-Math.PI / 2} renderOrder={3}>
        <planeGeometry args={[w, l]} />
        <meshPhysicalMaterial color={color} transparent opacity={gloss} roughness={0.06} envMapIntensity={1.3} normalMap={map} normalScale={new THREE.Vector2(0.4, 0.4)} clearcoat={1} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** 悬臂吊：立柱在后面，吊臂往前伸。reach：立柱到吊钩的水平距离；jib：吊臂离地多高 */
export function Crane({ reach = HALF + 1.25, jib: JIB_Y = 8.6 }: { reach?: number; jib?: number }) {
  const geo = useMemo(() => {
    const P: Part[] = [], z0 = -reach
    P.push({ p: [0, 0.12, z0], s: [1.7, 0.24, 1.7], c: '#3c4249' }, { p: [0, (JIB_Y + 0.6) / 2, z0], s: [0.55, JIB_Y + 0.6, 0.55], c: YELLOW })
    P.push({ p: [0, JIB_Y + 0.25, z0 / 2 + 0.35], s: [0.42, 0.5, -z0 + 1.9], c: YELLOW }, { p: [0, JIB_Y + 0.25, z0 - 1], s: [0.42, 0.5, 1.6], c: YELLOW }, { p: [0, JIB_Y + 0.1, z0 - 1.5], s: [0.9, 0.9, 0.7], c: '#4a5058' })
    const bl = Math.hypot(2.2, 2.2); P.push({ p: [0, JIB_Y - 1.05, z0 + 1.2], s: [0.2, 0.2, bl], c: YELLOW, r: [Math.PI / 4, 0, 0] })
    for (let i = 0; i < 4; i++) P.push({ p: [0, 0.45 + i * 0.3, z0], s: [0.57, 0.14, 0.57], c: i % 2 ? YELLOW : '#22262a' })     // 柱脚警示条
    P.push({ p: [0, JIB_Y - 0.12, 0], s: [0.6, 0.3, 0.7], c: '#3c4249' })                                                        // 吊臂下的小车
    return mergeParts(P)
  }, [reach, JIB_Y])
  return <mesh geometry={geo} castShadow receiveShadow><Painted metal={0.4} rough={0.45} /></mesh>
}

/** 钢丝绳 + 吊秤 + 吊钩。y 是吊秤中心的高度，reading 是屏上显示的数 */
export function Hoist({ y, reading, jib: JIB_Y = 8.6 }: { y: number; reading: string; jib?: number }) {
  const iron = <meshStandardMaterial color="#30353b" metalness={0.8} roughness={0.4} />
  return (
    <group>
      <Rod from={[0, y + 0.42, 0]} to={[0, JIB_Y - 0.25, 0]} r={0.022}><meshStandardMaterial color="#2b2f33" roughness={0.5} metalness={0.6} /></Rod>
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.36, 0]} castShadow><torusGeometry args={[0.09, 0.025, 10, 24]} />{iron}</mesh>
        <RoundedBox args={[0.62, 0.56, 0.3]} radius={0.05} smoothness={4} castShadow><meshStandardMaterial color="#d9651e" roughness={0.45} metalness={0.2} /></RoundedBox>
        <Led text={reading} w={0.5} h={0.2} position={[0, 0.04, 0.153]} />
        <mesh position={[0, -0.36, 0]} rotation-y={Math.PI / 2} castShadow><torusGeometry args={[0.09, 0.028, 10, 24, Math.PI * 1.5]} />{iron}</mesh>
      </group>
    </group>
  )
}

// ---------- 舞台 ----------
/** 这一课对造船厂的要求：indoor 表示这一课在室内或别的世界，不画码头和船体；sea 表示画不画默认的海面 */
export interface DockWant { sea: boolean; indoor: boolean }
/** 整座造船厂：码头、船体、堆场。放在实验室最外层的常驻舞台里，换课时不重建 */
export function Shipyard({ want }: { want?: DockWant }) {
  return want?.indoor ? null : <><Quay sea={want?.sea ?? true} /><Hull /><Yard /></>
}
/** 浮力每一课的舞台：把这一课的器材、标签、机位交给常驻的画布。换课时画面不重建，镜头飞过去 */
export function DockStage({ sea = true, indoor = false, sky = !indoor, view = VIEW, children, ...rest }: Omit<StageProps, 'children'> & { sea?: boolean; indoor?: boolean; children: ReactNode }) {
  return <LabStage<DockWant> sky={sky} view={view} {...rest} world={{ sea, indoor }}>{children}</LabStage>
}
const VIEW: [number, number] = [-0.42, 0.2]
