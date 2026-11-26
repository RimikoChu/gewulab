// 山前气象站：25 m × 25 m 的观测场（短草、碎石小路、白色围栏）、百叶箱、雨量器、测风铁塔（风向标、风杯）、自动气象站，
// 北边的站房。尺寸按真实的地面气象站：百叶箱里温度表的球部离地 1.5 m，雨量器器口离地 70 cm，测风铁塔高 10 m。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, disc, lathe, mergeParts, shell, useConcrete, type Part } from '@/lab-kit'

type V3 = [number, number, number]
/** 观测场里各样东西的位置 */
export const P = {
  screen: [-5, 0, -5] as V3, gauge: [4, 0, 5] as V3, tower: [9, 0, -8.5] as V3, aws: [-9, 0, 7.5] as V3,
  building: [0, 0, -27] as V3, forecast: [-17.5, 0, -4] as V3, chart: [11, 0, -17.5] as V3,
}
const WHITE = '#e2e0d8'

// ---------- 观测场的地面 ----------
function makeLawn() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  // 修剪过的草坪：一条条深浅相间的剪草纹，再撒上细碎的草叶
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#6f9147' : '#7c9d50'; g.fillRect(i * S / 16, 0, S / 16 + 1, S) }
  let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 60000; i++) { const x = r() * S, y = r() * S, k = r(); g.fillStyle = k > 0.5 ? 'rgba(160,190,100,0.35)' : 'rgba(50,80,30,0.3)'; g.fillRect(x, y, 1.5, 3) }
  // 碎石小路：从南门进来，通到各个仪器（米为单位的矩形：x0, z0, x1, z1）
  const W2 = 0.45, paths: [number, number, number, number][] = [[0, -3, 0, 12.5], [-9, -3, 9, -3], [-5, -3.9, -5, -3], [4, -3, 4, 3.9], [9, -6.8, 9, -3], [-9, -3, -9, 6.2]]
  const rects = paths.map(([x0, z0, x1, z1]) => [Math.min(x0, x1) - W2, Math.min(z0, z1) - W2, Math.max(x0, x1) + W2, Math.max(z0, z1) + W2])
  const px = (m: number) => (m / 25 + 0.5) * S
  g.fillStyle = '#c9c2b0'
  for (const [a, b, c2, d] of rects) g.fillRect(px(a), px(b), px(c2) - px(a), px(d) - px(b))
  for (let i = 0; i < 14000; i++) {
    const x = (r() - 0.5) * 25, z = (r() - 0.5) * 25
    if (!rects.some(([a, b, c2, d]) => x > a && x < c2 && z > b && z < d)) continue
    g.fillStyle = r() > 0.5 ? 'rgba(120,112,98,0.6)' : 'rgba(235,230,220,0.7)'; g.fillRect(px(x), px(z), 2, 2)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
function Field() {
  const lawn = useMemo(makeLawn, [])
  const fence = useMemo(() => {
    const parts: Part[] = []
    const side = (x0: number, z0: number, x1: number, z1: number, gap = false) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 2), ux = (x1 - x0) / L, uz = (z1 - z0) / L
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * L, x = x0 + ux * t, z = z0 + uz * t
        if (gap && Math.abs(t - L / 2) < 1.4 && Math.abs(t - L / 2) > 0.2) continue
        parts.push({ p: [x, 0.6, z], s: [0.08, 1.2, 0.08], c: WHITE }, { p: [x, 1.23, z], s: [0.1, 0.05, 0.1], c: WHITE })
      }
      for (const y of [0.45, 1.0]) {
        if (gap) { const a = L / 2 - 1.2; parts.push({ p: [x0 + ux * a / 2, y, z0 + uz * a / 2], s: [Math.abs(ux) * a + 0.05, 0.07, Math.abs(uz) * a + 0.05], c: WHITE }, { p: [x1 - ux * a / 2, y, z1 - uz * a / 2], s: [Math.abs(ux) * a + 0.05, 0.07, Math.abs(uz) * a + 0.05], c: WHITE }) }
        else parts.push({ p: [(x0 + x1) / 2, y, (z0 + z1) / 2], s: [Math.abs(ux) * L + 0.05, 0.07, Math.abs(uz) * L + 0.05], c: WHITE })
      }
    }
    const h = 12.5
    side(-h, -h, h, -h); side(h, -h, h, h); side(h, h, -h, h, true); side(-h, h, -h, -h)
    return mergeParts(parts)
  }, [])
  return <group>
    <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow><planeGeometry args={[25, 25]} /><meshStandardMaterial map={lawn} roughness={0.95} /></mesh>
    {/* 观测场外一圈压实的土路边 */}
    <mesh rotation-x={-Math.PI / 2} position-y={0.012} receiveShadow><ringGeometry args={[17.8, 19.2, 4, 1]} /><meshStandardMaterial color="#a39a84" roughness={1} /></mesh>
    <mesh geometry={fence} castShadow receiveShadow><Painted rough={0.5} metal={0} /></mesh>
  </group>
}

// ---------- 百叶箱 ----------
/** 百叶箱的外形：宽 0.62（东西）、深 0.48（南北）、高 0.72，箱底离地 1.18 m，温度表球部在 1.5 m。门朝北 */
export const BOX = { w: 0.62, d: 0.48, h: 0.72, y0: 1.18 }
function louvers(w: number, h: number, flip: boolean): Part[] {
  // 一面百叶：一片片 45° 斜放的木条，外高里低，挡住阳光和雨，又让空气流通
  const out: Part[] = [], n = Math.round(h / 0.034)
  for (let i = 0; i < n; i++) out.push({ p: [0, 0.03 + i * (h - 0.06) / (n - 1), 0], s: [w, 0.006, 0.05], r: [flip ? -0.8 : 0.8, 0, 0], c: WHITE })
  return out
}
function boxParts() {
  const { w, d, h } = BOX, parts: Part[] = []
  const face = (cx: number, cz: number, ry: number, len: number, flip: boolean) => louvers(len - 0.07, h - 0.06, flip).forEach(p => {
    const v = new THREE.Vector3(...p.p).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)
    parts.push({ ...p, p: [cx + v.x, 0.03 + v.y, cz + v.z], r: [p.r![0], ry, 0] })
  })
  face(0, d / 2 - 0.02, 0, w, false)                     // 南面
  face(w / 2 - 0.02, 0, Math.PI / 2, d, false)           // 东面
  face(-w / 2 + 0.02, 0, -Math.PI / 2, d, false)         // 西面
  // 四根角柱、上下框
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) parts.push({ p: [x * (w / 2 - 0.02), h / 2, z * (d / 2 - 0.02)], s: [0.04, h, 0.04], c: WHITE })
  for (const y of [0.015, h - 0.015]) { parts.push({ p: [0, y, d / 2 - 0.02], s: [w, 0.03, 0.04], c: WHITE }, { p: [0, y, -d / 2 + 0.02], s: [w, 0.03, 0.04], c: WHITE }, { p: [w / 2 - 0.02, y, 0], s: [0.04, 0.03, d], c: WHITE }, { p: [-w / 2 + 0.02, y, 0], s: [0.04, 0.03, d], c: WHITE }) }
  // 箱底：三块木板，中间留缝通风
  for (const x of [-0.19, 0, 0.19]) parts.push({ p: [x, 0.02, 0], s: [0.17, 0.02, d - 0.06], c: '#e6e4dc' })
  // 双层顶：下层平顶，上层斜顶，中间隔一道缝让热空气散走
  parts.push({ p: [0, h + 0.01, 0], s: [w + 0.04, 0.02, d + 0.04], c: WHITE })
  for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) for (const z of [-d / 2 + 0.04, d / 2 - 0.04]) parts.push({ p: [x, h + 0.04, z], s: [0.03, 0.04, 0.03], c: WHITE })
  parts.push({ p: [0, h + 0.075, 0.0], s: [w + 0.12, 0.022, d + 0.14], r: [0.12, 0, 0], c: '#f2f1ec' })
  return mergeParts(parts)
}
function standParts() {
  const { w, d, y0 } = BOX, parts: Part[] = []
  // 四条腿埋进土里，腿间两道横撑，北边一架两级的小梯子
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) parts.push({ p: [x * (w / 2 - 0.05), y0 / 2, z * (d / 2 - 0.05)], s: [0.06, y0, 0.06], c: WHITE })
  for (const y of [0.35, y0 - 0.05]) { parts.push({ p: [0, y, d / 2 - 0.05], s: [w - 0.1, 0.05, 0.035], c: WHITE }, { p: [0, y, -d / 2 + 0.05], s: [w - 0.1, 0.05, 0.035], c: WHITE }, { p: [w / 2 - 0.05, y, 0], s: [0.035, 0.05, d - 0.1], c: WHITE }, { p: [-w / 2 + 0.05, y, 0], s: [0.035, 0.05, d - 0.1], c: WHITE }) }
  // 门前一只两级的木踏凳
  parts.push({ p: [0, 0.13, -d / 2 - 0.62], s: [0.6, 0.26, 0.5], c: '#cfc9b8' }, { p: [0, 0.39, -d / 2 - 0.5], s: [0.6, 0.26, 0.26], c: '#d6d0c0' })
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) parts.push({ p: [x * (w / 2 - 0.05), 0.04, z * (d / 2 - 0.05)], s: [0.16, 0.08, 0.16], c: '#b5b1a6' })
  return mergeParts(parts)
}
/** 一支温度表：玻璃管、球部、液柱、带刻度的白色背板。t：读数（℃）。横放时 lay 为真 */
function Thermometer({ t, at, lay = false, liquid = '#c9ccd0', lo = -36, hi = 48 }: { t: number; at: V3; lay?: boolean; liquid?: string; lo?: number; hi?: number }) {
  const L = 0.32, col = Math.max(0.004, ((t - lo) / (hi - lo)) * (L - 0.05))
  const scale = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512
    const g = c.getContext('2d')!; g.fillStyle = '#f7f6f1'; g.fillRect(0, 0, 64, 512); g.fillStyle = '#2a2a2a'
    for (let v = lo; v <= hi; v += 2) { const y = 512 - 512 * ((-0.02 + ((v - lo) / (hi - lo)) * (L - 0.08)) - (-0.03)) / (L + 0.02); g.fillRect(36, y, v % 10 === 0 ? 24 : 14, 2); if (v % 10 === 0) { g.font = '600 18px sans-serif'; g.fillText(String(v), 2, y + 6) } }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx
  }, [lo, hi])
  return <group position={at} rotation-z={lay ? -Math.PI / 2 : 0}>
    <mesh position={[0, L / 2 - 0.02, 0.012]}><boxGeometry args={[0.03, L + 0.02, 0.004]} /><meshStandardMaterial map={scale} roughness={0.6} /></mesh>
    <mesh position={[0, L / 2 - 0.01, 0]}><cylinderGeometry args={[0.0055, 0.0055, L, 12]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.25} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    <mesh position={[0, -0.02, 0]}><sphereGeometry args={[0.009, 16, 12]} /><meshStandardMaterial color={liquid === '#c9ccd0' ? '#4a5058' : '#a39a86'} metalness={0.6} roughness={0.2} /></mesh>
    <mesh position={[0, -0.02 + col / 2, 0]}><cylinderGeometry args={[0.0032, 0.0032, col, 8]} /><meshStandardMaterial color={liquid === '#c9ccd0' ? '#30353c' : '#8a8270'} metalness={0.6} roughness={0.25} /></mesh>
  </group>
}
/** 百叶箱：door 0 关、1 开；t 干球温度表的读数；tmax、tmin 最高、最低温度表 */
export function Screen({ door, t, tmax, tmin, lamp = 0 }: { door: number; t: number; tmax: number; tmin: number; lamp?: number }) {
  const box = useMemo(boxParts, []), stand = useMemo(standParts, [])
  const doorG = useMemo(() => { const parts: Part[] = louvers(BOX.w - 0.1, BOX.h - 0.1, true).map(p => ({ ...p, p: [BOX.w / 2 - 0.04, p.p[1] + 0.02, 0] })); parts.push({ p: [BOX.w / 2 - 0.04, 0.02, 0], s: [BOX.w - 0.06, 0.03, 0.03], c: WHITE }, { p: [BOX.w / 2 - 0.04, BOX.h - 0.06, 0], s: [BOX.w - 0.06, 0.03, 0.03], c: WHITE }, { p: [0.01, BOX.h / 2 - 0.02, 0], s: [0.03, BOX.h - 0.06, 0.03], c: WHITE }, { p: [BOX.w - 0.09, BOX.h / 2 - 0.02, 0], s: [0.03, BOX.h - 0.06, 0.03], c: WHITE }); return mergeParts(parts) }, [])
  const { w, d, y0 } = BOX
  return (
    <group>
      <mesh geometry={stand} castShadow receiveShadow><Painted rough={0.55} metal={0} /></mesh>
      <group position-y={y0}>
        <mesh geometry={box} castShadow receiveShadow><Painted rough={0.5} metal={0} /></mesh>
        {/* 箱里：竖着的干球、湿球温度表，横放的最高、最低温度表，挂在一个白色的架子上 */}
        <mesh position={[0, 0.3, 0.02]}><boxGeometry args={[0.34, 0.03, 0.02]} /><meshStandardMaterial color="#e4e2da" /></mesh>
        <mesh position={[0.0, 0.33, 0.06]}><boxGeometry args={[0.02, 0.44, 0.02]} /><meshStandardMaterial color="#e4e2da" /></mesh>
        <Thermometer t={t} at={[-0.05, 0.32, 0.04]} />
        <Thermometer t={t - 3.2} at={[0.05, 0.32, 0.04]} />
        {/* 湿球：球部裹着纱布，下面一只水杯 */}
        <mesh position={[0.05, 0.3, 0.04]}><cylinderGeometry args={[0.012, 0.012, 0.03, 12]} /><meshStandardMaterial color="#f4f2ea" roughness={1} /></mesh>
        <mesh position={[0.05, 0.26, 0.04]}><cylinderGeometry args={[0.018, 0.016, 0.03, 16]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.35} roughness={0.05} /></mesh>
        <Thermometer t={tmax} at={[-0.13, 0.2, 0.03]} lay />
        <Thermometer t={tmin} at={[-0.13, 0.16, 0.03]} lay liquid="#e9e6dc" />
        {lamp > 0 && <pointLight position={[0, 0.5, -0.9]} intensity={lamp} distance={3} color="#fff1d6" />}
        {/* 北面的门：铰链在西边，向北拉开 */}
        <group position={[-w / 2 + 0.02, 0.03, -d / 2 + 0.02]} rotation-y={door * 1.9}>
          <mesh geometry={doorG} castShadow><Painted rough={0.5} metal={0} /></mesh>
          <mesh position={[w - 0.12, BOX.h / 2, -0.03]}><sphereGeometry args={[0.014, 12, 10]} /><Metal kind="brass" /></mesh>
        </group>
      </group>
    </group>
  )
}

// ---------- 雨量器 ----------
/** 雨量器：承水口内径 20 cm，器口离地 70 cm。lift 承水器取下的程度（0–1）；bottle 储水瓶的位置（0 在筒里、1 在量杯上方倾倒）；
 *  water 储水瓶里剩多少（0–1）；cup 量杯里的水（mm，满杯约 10.5）；pour 正在倒 */
export const GAUGE = { rim: 0.7, cupAt: [0.62, 0.62, 0.02] as V3 }
/** 雨量器各部分的高度：水泥墩顶 0.22，储水筒到 0.5，承水器到器口 0.7 */
const G0 = 0.22, G1 = 0.5
export function Gauge({ lift, bottle, water, cup, pour }: { lift: number; bottle: number; water: number; cup: number; pour: boolean }) {
  const geo = useMemo(() => ({
    // 储水筒：有底的圆筒，筒口外翻一圈，底下一圈法兰
    can: shell([[0, G0], [0.108, G0], [0.108, G1 - 0.012], [0.111, G1 - 0.006], [0.111, G1]], 0.0025, { segs: 64 }),
    flange: disc(0.13, 0.01, { segs: 48 }),
    // 承水器：圆筒，口沿是一圈黄铜刀口（外直内斜，边缘很薄，雨滴不会溅进溅出），里面是漏斗
    top: shell([[0.106, G1 - 0.02], [0.106, 0.684]], 0.0022, { segs: 64 }),
    rim: lathe([[0.1, 0.68], [0.1075, 0.68], [0.1075, 0.692], [0.1005, 0.7], [0.0995, 0.7], [0.0995, 0.68]], { segs: 72, closed: true }),
    funnel: lathe([[0.1, 0.682], [0.012, 0.58], [0.007, G1 + 0.01], [0.009, G1 + 0.01], [0.014, 0.58], [0.098, 0.68]], { segs: 48, closed: true }),
    seam: disc(0.1085, 0.008, { hole: 0.104 }),
    // 储水瓶：小口玻璃瓶
    bottle: shell([[0, 0], [0.048, 0], [0.05, 0.006], [0.05, 0.16], [0.03, 0.195], [0.013, 0.205], [0.013, 0.235]], 0.0018, { segs: 40 }),
    // 专用量杯：带刻度的玻璃杯，下细上粗
    cup: shell([[0, 0], [0.026, 0], [0.03, 0.22], [0.034, 0.226]], 0.0018, { segs: 40 }),
    cupBase: disc(0.045, 0.014, { segs: 32 }),
  }), [])
  // 量杯的刻度：0–10.5 mm
  const scale = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512
    const g = c.getContext('2d')!; g.clearRect(0, 0, 256, 512); g.fillStyle = '#ffffff'
    for (let i = 0; i <= 105; i++) { const y = 512 - ((0.002 + 0.002 * i) / 0.22) * 512; g.fillRect(150, y, i % 10 === 0 ? 70 : i % 5 === 0 ? 50 : 30, i % 10 === 0 ? 4 : 2); if (i % 10 === 0) { g.font = '700 34px sans-serif'; g.fillText(String(i / 10), 80, y + 12) } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const cupH = 0.21 * Math.min(10.5, cup) / 10.5
  // 储水瓶的路线：从筒里升起，挪到量杯上方，倾斜倒水
  const lifted = Math.min(1, bottle * 2.2), moved = Math.max(0, Math.min(1, (bottle - 0.45) / 0.4)), tilt = Math.max(0, (bottle - 0.85) / 0.15)
  const bp = new THREE.Vector3(0, G0 + 0.005 + lifted * 0.62, 0).lerp(new THREE.Vector3(GAUGE.cupAt[0] - 0.2, 0.98, GAUGE.cupAt[2]), moved)
  const wh = 0.17 * water
  return (
    <group>
      {/* 水泥墩，四角倒角，墩上四颗地脚螺栓压着法兰 */}
      <RoundedBox args={[0.42, G0, 0.42]} radius={0.02} position-y={G0 / 2} castShadow receiveShadow><meshStandardMaterial color="#b3ada2" roughness={0.95} /></RoundedBox>
      <mesh geometry={geo.flange} position-y={G0} castShadow><Metal kind="zinc" grain="cast" rough={0.55} /></mesh>
      {[0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 + Math.PI / 4; return <mesh key={i} position={[Math.cos(a) * 0.118, G0 + 0.016, Math.sin(a) * 0.118]}><cylinderGeometry args={[0.008, 0.008, 0.012, 6]} /><Metal kind="steel" /></mesh> })}
      <mesh geometry={geo.can} castShadow receiveShadow><Metal kind="zinc" grain="cast" rough={0.5} /></mesh>
      {/* 储水筒两侧的提手 */}
      {[1, -1].map(sx => <mesh key={sx} position={[sx * 0.112, 0.4, 0]} rotation={[0, sx > 0 ? 0 : Math.PI, Math.PI / 2]}><torusGeometry args={[0.022, 0.004, 8, 16, Math.PI]} /><Metal kind="steel" /></mesh>)}
      {/* 承水器（带漏斗和刀口）：取下时提起来，放到墩旁的地上 */}
      <group position={[lift * 0.36, 0.12 * Math.sin(Math.PI * lift) - (G1 - 0.02) * lift, lift * -0.28]}>
        <mesh geometry={geo.top} castShadow><Metal kind="zinc" grain="cast" rough={0.5} /></mesh>
        <mesh geometry={geo.rim} castShadow><Metal kind="brass" grain="turned" /></mesh>
        <mesh geometry={geo.funnel} castShadow><Metal kind="zinc" rough={0.35} /></mesh>
        <mesh geometry={geo.seam} position-y={0.6}><meshStandardMaterial color="#5d6166" roughness={0.6} /></mesh>
      </group>
      {/* 储水瓶 */}
      <group position={bp} rotation-z={-tilt * 1.9}>
        <mesh geometry={geo.bottle} renderOrder={6}><meshPhysicalMaterial color="#f4fbff" transparent opacity={0.28} roughness={0.04} clearcoat={1} envMapIntensity={1.6} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {wh > 0.002 && <mesh position-y={0.004 + wh / 2} renderOrder={5}><cylinderGeometry args={[0.046, 0.046, wh, 32]} /><meshPhysicalMaterial color="#9fc9e2" transparent opacity={0.55} roughness={0.1} depthWrite={false} /></mesh>}
        {bottle > 0.02 && <group rotation-y={Math.PI}><Glove at={[0, 0.11, 0.06]} /></group>}
      </group>
      {/* 倒出来的一股水 */}
      {pour && <mesh position={[GAUGE.cupAt[0] + 0.015, 0.8, GAUGE.cupAt[2]]}><cylinderGeometry args={[0.0035, 0.0025, 0.2, 8]} /><meshPhysicalMaterial color="#b8dcf0" transparent opacity={0.7} roughness={0.05} /></mesh>}
      {/* 观测员的小凳，上面放着专用量杯 */}
      <group position={[GAUGE.cupAt[0], 0, GAUGE.cupAt[2]]}>
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z], i) => <mesh key={i} position={[x * 0.13, 0.29, z * 0.1]} castShadow><boxGeometry args={[0.03, 0.58, 0.03]} /><meshStandardMaterial color="#c5b79a" roughness={0.8} /></mesh>)}
        <RoundedBox args={[0.34, 0.035, 0.28]} radius={0.008} position-y={0.6} castShadow receiveShadow><meshStandardMaterial color="#d7caae" roughness={0.75} /></RoundedBox>
        <group position-y={0.617}>
          <mesh geometry={geo.cupBase}><meshPhysicalMaterial color="#f4fbff" transparent opacity={0.4} roughness={0.05} /></mesh>
          <group position-y={0.012}>
            <mesh geometry={geo.cup} renderOrder={6}><meshPhysicalMaterial color="#f4fbff" transparent opacity={0.22} roughness={0.03} clearcoat={1} envMapIntensity={1.6} side={THREE.DoubleSide} depthWrite={false} /></mesh>
            <mesh position={[0, 0.11, 0.0305]} renderOrder={7}><planeGeometry args={[0.055, 0.22]} /><meshBasicMaterial map={scale} transparent depthWrite={false} color="#16232b" /></mesh>
            {cupH > 0.001 && <mesh position-y={0.002 + cupH / 2} renderOrder={5}><cylinderGeometry args={[0.024 + 0.004 * cupH / 0.22, 0.0242, cupH, 32]} /><meshPhysicalMaterial color="#6fb0dc" transparent opacity={0.78} roughness={0.08} depthWrite={false} /></mesh>}
          </group>
        </group>
      </group>
    </group>
  )
}

/** 握着东西的手：带袖口的蓝灰色劳保手套，袖子是深蓝色的工作服 */
export function Glove({ at, s = 1 }: { at: V3; s?: number }) {
  const glove = <meshStandardMaterial color="#5d6f7e" roughness={0.85} />
  return <group position={at} scale={s}>
    <mesh position={[0, 0, 0.012]} rotation-x={Math.PI / 2}><capsuleGeometry args={[0.022, 0.045, 6, 12]} />{glove}</mesh>
    {[-0.03, -0.01, 0.01, 0.03].map((y, i) => <mesh key={i} position={[0.03, y, -0.012]} rotation-z={Math.PI / 2}><capsuleGeometry args={[0.0085, 0.028, 4, 8]} />{glove}</mesh>)}
    <mesh position={[-0.032, 0.02, -0.01]} rotation-z={-0.6}><capsuleGeometry args={[0.009, 0.03, 4, 8]} />{glove}</mesh>
    <mesh position={[0, 0, 0.06]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.028, 0.05, 16]} /><meshStandardMaterial color="#4d5e6c" roughness={0.9} /></mesh>
    <mesh position={[0, 0, 0.17]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.042, 0.036, 0.18, 16]} /><meshStandardMaterial color="#1f2d44" roughness={0.85} /></mesh>
  </group>
}

// ---------- 测风铁塔 ----------
/** 10 m 高的三角形桁架塔，塔顶是风向标（箭头指着风吹来的方向）和三杯风速计。from：风从哪个方向吹来（度，北 0、东 90、南 180） */
export function Tower({ from }: { from: number }) {
  const frame = useMemo(() => {
    const H = 10, R = 0.26, parts: Part[] = [], corners = [0, 1, 2].map(i => { const a = (i / 3) * Math.PI * 2; return [Math.cos(a) * R, Math.sin(a) * R] })
    const rod = (a: V3, b: V3, r = 0.016) => { const m = new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(0.5), dv = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q); parts.push({ p: m.toArray() as V3, s: [r, dv.length(), 0], r: [e.x, e.y, e.z], c: '#c9ccd0', cyl: true }) }
    for (const [x, z] of corners) rod([x, 0, z], [x, H, z], 0.022)
    for (let y = 0; y < H - 0.1; y += 0.8) for (let i = 0; i < 3; i++) { const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 3]; rod([x0, y, z0], [x1, y + 0.8, z1], 0.01); rod([x0, y + 0.8, z0], [x1, y + 0.8, z1], 0.01) }
    rod([0, H, 0], [0, H + 0.9, 0], 0.025); rod([-0.6, H + 0.6, 0], [0.6, H + 0.6, 0], 0.018)
    parts.push({ p: [0, H, 0], s: [0.7, 0.04, 0.7], c: '#b9bcc0' })
    return mergeParts(parts)
  }, [])
  const cups = useRef<THREE.Group>(null), vane = useRef<THREE.Group>(null)
  useFrame(({ clock }, d) => {
    if (cups.current) cups.current.rotation.y += d * 7
    if (vane.current) { const goal = Math.PI / 2 - (from * Math.PI) / 180 + Math.PI; vane.current.rotation.y += (goal + Math.sin(clock.elapsedTime * 1.3) * 0.06 - vane.current.rotation.y) * Math.min(1, d * 2) }
  })
  return (
    <group>
      <mesh geometry={frame} castShadow><Painted rough={0.4} metal={0.7} /></mesh>
      {[0, 1, 2].map(i => { const a = (i / 3) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.26, 0.15, Math.sin(a) * 0.26]} castShadow><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color="#a6a29a" roughness={0.95} /></mesh> })}
      {/* 风杯 */}
      <group position={[0.6, 10.75, 0]}>
        <mesh position-y={-0.08}><cylinderGeometry args={[0.03, 0.035, 0.16, 16]} /><Metal kind="aluminum" grain="turned" /></mesh>
        <group ref={cups}>
          {[0, 1, 2].map(i => { const a = (i / 3) * Math.PI * 2; return <group key={i} rotation-y={a}>
            <mesh position={[0.08, 0.02, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.005, 0.005, 0.16, 6]} /><Metal kind="aluminum" /></mesh>
            <mesh position={[0.17, 0.02, 0]} rotation-x={Math.PI / 2}><sphereGeometry args={[0.045, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e9e9e6" roughness={0.4} side={THREE.DoubleSide} /></mesh>
          </group> })}
        </group>
      </group>
      {/* 风向标：前头是箭头，后面是尾翼 */}
      <group position={[-0.6, 10.75, 0]}>
        <mesh position-y={-0.08}><cylinderGeometry args={[0.03, 0.035, 0.16, 16]} /><Metal kind="aluminum" grain="turned" /></mesh>
        <group ref={vane}>
          <mesh position={[0.05, 0.03, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.7, 8]} /><Metal kind="aluminum" /></mesh>
          <mesh position={[0.42, 0.03, 0]} rotation-z={-Math.PI / 2}><coneGeometry args={[0.035, 0.09, 12]} /><meshStandardMaterial color="#d04a3a" roughness={0.5} /></mesh>
          <mesh position={[-0.28, 0.06, 0]}><boxGeometry args={[0.2, 0.14, 0.006]} /><meshStandardMaterial color="#e8e6df" roughness={0.5} /></mesh>
        </group>
      </group>
    </group>
  )
}

// ---------- 自动气象站 ----------
/** 一根立杆：顶上一块太阳能板，侧面一只多层的白色防辐射罩（里面是温湿度传感器），中间一只灰色的采集箱 */
export function Aws({ s = 1 }: { s?: number }) {
  const shield = useMemo(() => { const out: THREE.BufferGeometry[] = []; for (let i = 0; i < 7; i++) { const g = lathe([[0.012, 0.012], [0.07, 0.0], [0.075, -0.005], [0.07, -0.006], [0.012, 0.004]], { segs: 32, closed: true }); g.translate(0, -i * 0.024, 0); out.push(g) } return out }, [])
  return <group scale={s}>
    <mesh position-y={1.6} castShadow><cylinderGeometry args={[0.04, 0.045, 3.2, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position-y={0.05} receiveShadow><boxGeometry args={[0.6, 0.1, 0.6]} /><meshStandardMaterial color="#a8a49a" roughness={0.95} /></mesh>
    <group position={[0, 3.0, 0]} rotation-x={-0.6}><RoundedBox args={[0.7, 0.03, 0.5]} radius={0.01} castShadow><meshStandardMaterial color="#1d2a44" roughness={0.25} metalness={0.4} /></RoundedBox><mesh position-y={0.017}><planeGeometry args={[0.66, 0.46]} /><meshStandardMaterial color="#263a62" roughness={0.15} metalness={0.6} /></mesh></group>
    <RoundedBox args={[0.34, 0.42, 0.16]} radius={0.015} position={[0, 1.3, 0.12]} castShadow><meshStandardMaterial color="#cfd2d0" roughness={0.45} /></RoundedBox>
    <group position={[0.32, 2.2, 0]}>
      <mesh position={[-0.16, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.32, 8]} /><Metal kind="stainless" /></mesh>
      {shield.map((g, i) => <mesh key={i} geometry={g} castShadow><meshStandardMaterial color="#f1f0ea" roughness={0.45} /></mesh>)}
    </group>
  </group>
}

// ---------- 站房 ----------
function makeSign(text: string) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160
  const g = c.getContext('2d')!; g.fillStyle = '#1c4f7a'; g.fillRect(0, 0, 1024, 160); g.fillStyle = '#ffffff'; g.font = '700 96px "PingFang SC","Microsoft YaHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 84)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
/** 两层的站房：浅灰面砖、成排的窗、入口雨棚、屋顶女儿墙和天线 */
export function Building() {
  const sign = useMemo(() => makeSign('山前气象站'), [])
  const [cd, cn, cr] = useConcrete(10, 4)
  const W = 20, D = 9, H = 7.6
  const frames = useMemo(() => {
    const parts: Part[] = []
    for (const y of [1.0, 4.6]) for (let i = 0; i < 8; i++) { const x = -W / 2 + 1.6 + i * 2.4; if (y < 2 && Math.abs(x) < 1.6) continue; parts.push({ p: [x, y + 1.0, D / 2 + 0.06], s: [1.6, 0.08, 0.1], c: '#e9e8e3' }, { p: [x, y, D / 2 + 0.06], s: [1.75, 0.1, 0.22], c: '#e9e8e3' }, { p: [x, y + 0.6, D / 2 + 0.05], s: [0.06, 1.2, 0.08], c: '#d9d8d2' }) }
    parts.push({ p: [0, 3.15, D / 2 + 1.2], s: [4.2, 0.18, 2.6], c: '#dcdbd5' })
    for (const x of [-1.9, 1.9]) parts.push({ p: [x, 1.55, D / 2 + 2.3], s: [0.16, 3.1, 0.16], c: '#d4d3cd' })
    parts.push({ p: [0, H + 0.45, D / 2 - 0.1], s: [W + 0.3, 0.9, 0.25], c: '#dedcd5' }, { p: [0, H + 0.45, -D / 2 + 0.1], s: [W + 0.3, 0.9, 0.25], c: '#dedcd5' }, { p: [W / 2 - 0.1, H + 0.45, 0], s: [0.25, 0.9, D], c: '#dedcd5' }, { p: [-W / 2 + 0.1, H + 0.45, 0], s: [0.25, 0.9, D], c: '#dedcd5' })
    parts.push({ p: [0, 0.15, D / 2 + 1.2], s: [5, 0.3, 2.6], c: '#b9b6ad' })
    parts.push({ p: [W / 2 - 3, H + 1.2, -1], s: [2.4, 1.4, 2.2], c: '#d3d2cc' })
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh position={[0, -0.01, 3]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[W + 16, D + 16]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#c9c6bc" /></mesh>
      <RoundedBox args={[W, H, D]} radius={0.08} position-y={H / 2} castShadow receiveShadow><meshStandardMaterial color="#cfccc3" roughness={0.8} /></RoundedBox>
      {/* 窗：深色玻璃 */}
      {[1.0, 4.6].flatMap(y => Array.from({ length: 8 }, (_, i) => { const x = -W / 2 + 1.6 + i * 2.4; if (y < 2 && Math.abs(x) < 1.6) return null; return <mesh key={`${y}-${i}`} position={[x, y + 0.6, D / 2 + 0.005]}><planeGeometry args={[1.55, 1.15]} /><meshPhysicalMaterial color="#2c3c48" roughness={0.08} metalness={0.3} clearcoat={1} envMapIntensity={1.3} /></mesh> }))}
      <mesh position={[0, 1.35, D / 2 + 0.01]}><planeGeometry args={[2.4, 2.6]} /><meshPhysicalMaterial color="#3b4a55" roughness={0.1} metalness={0.4} clearcoat={1} /></mesh>
      <mesh geometry={frames} castShadow receiveShadow><Painted rough={0.7} metal={0} /></mesh>
      <mesh position={[0, 3.55, D / 2 + 2.52]}><planeGeometry args={[3.8, 0.6]} /><meshStandardMaterial map={sign} roughness={0.5} /></mesh>
      {/* 屋顶：天线杆和一只卫星天线 */}
      <mesh position={[-W / 2 + 2, H + 3, -2]}><cylinderGeometry args={[0.05, 0.07, 6, 10]} /><Metal kind="steel" /></mesh>
      <group position={[-3, H + 0.9, -1.5]} rotation-x={-0.7}><mesh><sphereGeometry args={[0.8, 32, 12, 0, Math.PI * 2, 0, 0.9]} /><meshStandardMaterial color="#e6e6e2" roughness={0.4} side={THREE.DoubleSide} /></mesh></group>
    </group>
  )
}

/** 一块立在两根钢柱上的显示屏 / 展板：children 是屏面（宽 w、高 h，朝 +z） */
export function Board({ w, h, y0, children, dark = true }: { w: number; h: number; y0: number; children: ReactNode; dark?: boolean }) {
  return <group>
    {[-w / 2 + 0.35, w / 2 - 0.35].map((x, i) => <mesh key={i} position={[x, (y0 + 0.2) / 2, -0.12]} castShadow><boxGeometry args={[0.12, y0 + 0.2, 0.12]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>)}
    {[-w / 2 + 0.35, w / 2 - 0.35].map((x, i) => <mesh key={i} position={[x, 0.04, -0.12]} receiveShadow><boxGeometry args={[0.36, 0.08, 0.36]} /><meshStandardMaterial color="#9c988e" roughness={0.9} /></mesh>)}
    <RoundedBox args={[w + 0.16, h + 0.16, 0.14]} radius={0.03} position={[0, y0 + h / 2, -0.05]} castShadow><meshStandardMaterial color={dark ? '#24282c' : '#d9d9d4'} roughness={0.4} metalness={0.3} /></RoundedBox>
    <group position={[0, y0 + h / 2, 0.025]}>{children}</group>
  </group>
}

/** 观测场：地面、围栏和各样仪器（会动的仪器由各课交进来） */
export function StationGround() {
  return <group><Field /></group>
}
