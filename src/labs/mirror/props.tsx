// 光的反射和平面镜 · 各课的器材模型：小孔成像的暗箱、带量角刻度的可折转光屏、平行光源、放大的表面、方格纸和钢尺、玻璃板、
// 立着的平面镜、潜望镜、人偶、球面镜和它们的用处、日食模型、夹角镜、角反射器。尺寸都按画面单位，位置由各课自己定。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Rod, bolts, disc, lathe, shell } from '@/lab-kit'
import { ENV, type V2 } from './optics'
import { paperProfile } from './physics'
import { TOP, Wood } from './world'

// ---------- 反复用到的小件和材质 ----------
/** 镜面：镀银的那一层 */
export const Silver = ({ two = false }: { two?: boolean }) => <meshStandardMaterial color="#dfe6ea" metalness={1} roughness={0.035} envMapIntensity={1.1} side={two ? THREE.DoubleSide : THREE.FrontSide} />
/** 黑色的皱纹漆、亚光的黑塑料 */
const Black = ({ rough = 0.6 }: { rough?: number }) => <meshStandardMaterial color="#17191c" roughness={rough} metalness={0.2} />
const KNOB = lathe([[0, 0], [0.008, 0], [0.008, 0.012], [0.024, 0.012], [0.027, 0.015], [0.027, 0.027], [0.024, 0.03], [0, 0.03]], { segs: 20 })   // 紧固手轮
const FOOT = lathe([[0, 0], [0.04, 0], [0.044, 0.006], [0.044, 0.02], [0.022, 0.03], [0.018, 0.1], [0.03, 0.108], [0.03, 0.12], [0, 0.12]], { segs: 24 })   // 调平脚
const BASE = lathe([[0, 0], [0.2, 0], [0.208, 0.008], [0.208, 0.03], [0.19, 0.045], [0.06, 0.055], [0.045, 0.075], [0.045, 0.12], [0, 0.12]], { segs: 48 })     // 立杆的铸铁底座
const COLLAR = disc(0.04, 0.05, { hole: 0.019 })
/** 一根立在台面上的支杆：铸铁底座、镀铬的杆、顶上一只带顶丝的套环。从台面一直顶到 y */
export function Post({ x, z = 0, y }: { x: number; z?: number; y: number }) {
  return <group position={[x, TOP, z]}>
    <mesh geometry={BASE} castShadow><Metal kind="iron" grain="cast" env={ENV * 0.7} /></mesh>
    <mesh position={[0, (0.1 + y - TOP) / 2, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, y - TOP - 0.1, 18]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
    <mesh geometry={COLLAR} position={[0, y - TOP - 0.06, 0]}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
    <mesh geometry={KNOB} position={[0.036, y - TOP - 0.035, 0]} rotation-z={-Math.PI / 2}><Black rough={0.45} /></mesh>
  </group>
}
/** 一块垫高用的载物台：阳极氧化的铝板，四只调平脚。上表面在 y */
export function Platform({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return <group position={[x, y, 0]}>
    <RoundedBox args={[w, 0.05, d]} radius={0.012} position={[0, -0.025, 0]} castShadow receiveShadow><meshStandardMaterial color="#2a3036" metalness={0.75} roughness={0.42} envMapIntensity={ENV * 0.6} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} geometry={FOOT} position={[sx * (w / 2 - 0.1), TOP - y, sz * (d / 2 - 0.09)]} scale={[1, (y - 0.05 - TOP) / 0.12, 1]} castShadow><Metal kind="stainless" grain="turned" env={ENV} /></mesh>))}
  </group>
}

// ---------- 第 1 课：小孔成像的暗箱 ----------
/**
 * 暗箱：一只木头盒子，朝镜头的那一面剖开。前板正中一个小孔（嵌一片带孔的铜片），里面涂黑；离小孔 len 处是一块半透明的屏，屏后面再留一截遮光的筒。
 * x、y 是小孔的位置；hh 是箱子里面高度的一半；d 是前后的深度
 */
export function PinholeBox({ x, y, len, hh, d = 0.5, hood = 0.32 }: { x: number; y: number; len: number; hh: number; d?: number; hood?: number }) {
  const t = 0.024, L = len + hood, bottom = y - hh - t
  const front = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-d / 2, -hh - t); s.lineTo(d / 2, -hh - t); s.lineTo(d / 2, hh + t); s.lineTo(-d / 2, hh + t); s.closePath()
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.03, 0, Math.PI * 2, true); s.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(s, { depth: t - 0.006, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 24 }); g.rotateY(-Math.PI / 2); return g
  }, [d, hh])
  const pin = useMemo(() => ({ plate: disc(0.058, 0.007, { hole: 0.0065 }), nuts: bolts(4, 0.044, 0.011, 0.004) }), [])
  return (
    <group>
      <group position={[x, y, 0]}>
        {/* 四面箱板：底、顶、背板，和带孔的前板。里面贴一层黑绒 */}
        <RoundedBox args={[L + t, t, d]} radius={0.005} position={[L / 2 - t / 2, -hh - t / 2, 0]} castShadow><Wood tint="#c9a888" repeat={2} /></RoundedBox>
        <RoundedBox args={[L + t, t, d]} radius={0.005} position={[L / 2 - t / 2, hh + t / 2, 0]} castShadow><Wood tint="#c9a888" repeat={2} /></RoundedBox>
        <RoundedBox args={[L + t, hh * 2 + t * 2, t]} radius={0.005} position={[L / 2 - t / 2, 0, -d / 2 - t / 2]} castShadow><Wood tint="#b89674" repeat={2} /></RoundedBox>
        <mesh geometry={front} position={[-0.003, 0, 0]} castShadow><Wood tint="#c9a888" repeat={2} /></mesh>
        <mesh position={[L / 2, 0, -d / 2 + 0.002]}><planeGeometry args={[L, hh * 2]} /><meshStandardMaterial color="#0c0d0f" roughness={1} /></mesh>
        <mesh position={[L / 2, -hh + 0.002, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[L, d]} /><meshStandardMaterial color="#0c0d0f" roughness={1} /></mesh>
        <mesh position={[L / 2, hh - 0.002, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[L, d]} /><meshStandardMaterial color="#0c0d0f" roughness={1} /></mesh>
        {/* 小孔：一片黄铜片，四颗小螺丝压在前板上 */}
        <mesh geometry={pin.plate} position={[-t - 0.002, 0, 0]} rotation-z={Math.PI / 2}><Metal kind="brass" grain="turned" env={ENV * 1.5} /></mesh>
        <mesh geometry={pin.nuts} position={[-t - 0.008, 0, 0]} rotation-z={Math.PI / 2}><Metal kind="steel" env={ENV} /></mesh>
        {/* 半透明的屏：一张描图纸绷在黑色的框里 */}
        <mesh position={[len, 0, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[d - 0.02, hh * 2 - 0.02]} /><meshStandardMaterial color="#cfccc0" roughness={1} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[len, s * (hh - 0.012), 0]}><boxGeometry args={[0.02, 0.024, d]} /><Black /></mesh>)}
        <mesh position={[len, 0, -d / 2 + 0.012]}><boxGeometry args={[0.02, hh * 2, 0.024]} /><Black /></mesh>
      </group>
      {/* 底板和两根托柱 */}
      <RoundedBox args={[L + 0.24, 0.04, d + 0.2]} radius={0.01} position={[x + L / 2 - t / 2, TOP + 0.02, -0.01]} castShadow receiveShadow><Wood tint="#8f7458" repeat={3} /></RoundedBox>
      {[0.2, L - 0.22].map(dx => <mesh key={dx} geometry={FOOT} position={[x + dx, TOP + 0.04, -0.02]} scale={[1.5, (bottom - TOP - 0.04) / 0.12, 1.5]} castShadow><Metal kind="aluminum" grain="turned" env={ENV * 0.8} /></mesh>)}
    </group>
  )
}

// ---------- 钢尺和方格纸 ----------
function makeRuler(cm: number, zero: number) {
  const W = Math.min(4096, cm * 64), H = 96, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / cm
  g.fillStyle = '#b9bcbd'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`; g.fillRect(Math.random() * W, Math.random() * H, 20 + Math.random() * 60, 1) }
  g.fillStyle = '#15181a'; g.textAlign = 'center'; g.font = '600 34px sans-serif'
  for (let i = 0; i <= cm; i++) {
    const x = Math.min(W - 2, Math.max(2, i * px)), n = Math.abs(i - zero), h = n % 10 === 0 ? 40 : n % 5 === 0 ? 30 : 18
    g.fillRect(x - 1.5, 0, 3, h)
    if (n % 5 === 0 && i > 0 && i < cm) g.fillText(String(n), x, 84)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 一把平放的钢尺：从 x0 起长 cm 厘米（scale 是 1 cm 在画面里多长），零刻度在第 zero 厘米处，往两边读数 */
export function Ruler({ x0, y, z, cm, scale, zero = 0 }: { x0: number; y: number; z: number; cm: number; scale: number; zero?: number }) {
  const map = useMemo(() => makeRuler(cm, zero), [cm, zero]), len = cm * scale
  return <group position={[x0 + len / 2, y, z]}>
    <RoundedBox args={[len + 0.06, 0.008, 0.16]} radius={0.003} position={[0, 0.004, 0]} receiveShadow castShadow><meshStandardMaterial color="#6f7376" metalness={0.6} roughness={0.55} /></RoundedBox>
    <mesh position={[0, 0.0085, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[len, 0.15]} /><meshStandardMaterial map={map} color="#8f9293" roughness={0.6} metalness={0.15} /></mesh>
  </group>
}
function makeGrid(cw: number, ch: number) {
  const P = 32, c = document.createElement('canvas'); c.width = cw * P; c.height = ch * P
  const g = c.getContext('2d')!
  g.fillStyle = '#ece8dc'; g.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i <= cw; i++) { g.fillStyle = i % 5 === 0 ? 'rgba(40,110,150,0.6)' : 'rgba(60,130,170,0.28)'; g.fillRect(i * P - (i % 5 === 0 ? 1.5 : 0.75), 0, i % 5 === 0 ? 3 : 1.5, c.height) }
  for (let j = 0; j <= ch; j++) { g.fillStyle = j % 5 === 0 ? 'rgba(40,110,150,0.6)' : 'rgba(60,130,170,0.28)'; g.fillRect(0, j * P - (j % 5 === 0 ? 1.5 : 0.75), c.width, j % 5 === 0 ? 3 : 1.5) }
  g.fillStyle = '#2b2f33'; g.fillRect(c.width / 2 - 2, 0, 4, c.height)       // 中间一道铅笔线：玻璃板立在这条线上
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 一张方格纸，平铺在台面上：每格 1 cm，中间一道线标出玻璃板的位置。cw、ch 是横竖各多少格 */
export function GridPaper({ x, z, cw, ch, scale }: { x: number; z: number; cw: number; ch: number; scale: number }) {
  const map = useMemo(() => makeGrid(cw, ch), [cw, ch])
  return <mesh position={[x, TOP + 0.003, z]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[cw * scale, ch * scale]} /><meshStandardMaterial map={map} color="#73716b" roughness={0.95} /></mesh>
}

// ---------- 第 2 课：平放的镜子和可折转的光屏 ----------
/** 平放在台面上的一面平面镜：黑色的托框里嵌一块镜子。上表面在 y */
export function FlatMirror({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return <group position={[x, y, 0]}>
    <RoundedBox args={[w + 0.1, y - TOP - 0.004, d + 0.1]} radius={0.01} position={[0, -(y - TOP) / 2 - 0.002, 0]} castShadow receiveShadow><Black rough={0.5} /></RoundedBox>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[w, d]} /><Silver /></mesh>
  </group>
}
function makeProtractor(W: number, H: number, R: number) {
  const P = 780, c = document.createElement('canvas'); c.width = Math.round(W * P); c.height = Math.round(H * P)
  const g = c.getContext('2d')!, ox = c.width / 2, oy = c.height
  g.fillStyle = '#eceade'; g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#23272b'; g.fillStyle = '#23272b'; g.lineWidth = 3
  g.beginPath(); g.arc(ox, oy, R * P, Math.PI, 0); g.stroke()
  g.lineWidth = 1.5; g.beginPath(); g.arc(ox, oy, R * P * 0.5, Math.PI, 0); g.stroke()
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 30px sans-serif'
  for (let a = -90; a <= 90; a++) {
    const t = a * Math.PI / 180, s = Math.sin(t), k = Math.cos(t), n = Math.abs(a), l = n % 10 === 0 ? 0.075 : n % 5 === 0 ? 0.052 : 0.03
    g.lineWidth = n % 10 === 0 ? 3 : 1.6; g.beginPath(); g.moveTo(ox + s * R * P, oy - k * R * P); g.lineTo(ox + s * (R - l) * P, oy - k * (R - l) * P); g.stroke()
    if (n % 10 === 0 && n < 90) g.fillText(String(n), ox + s * (R - 0.125) * P, oy - k * (R - 0.125) * P)
    if (n % 10 === 0 && n > 0) { g.save(); g.strokeStyle = 'rgba(35,39,43,0.16)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + s * (R - 0.17) * P, oy - k * (R - 0.17) * P); g.stroke(); g.restore() }
  }
  g.strokeStyle = '#b3392b'; g.lineWidth = 4; g.setLineDash([22, 14]); g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, oy - (H - 0.09) * P); g.stroke(); g.setLineDash([])
  g.fillStyle = '#b3392b'; g.font = '600 40px sans-serif'; g.fillText('N', ox + 30, oy - (H - 0.07) * P); g.fillText('O', ox + 34, oy - 30)
  g.fillStyle = 'rgba(35,39,43,0.55)'; g.font = '600 56px sans-serif'; g.fillText('E', 70, 70); g.fillText('F', c.width - 70, 70)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const GUSSET = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.3, 0); s.lineTo(0.3, 0.03); s.lineTo(0.02, 0.44); s.lineTo(0, 0.44); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 }); g.rotateY(Math.PI / 2); return g })()
/**
 * 可折转的光屏：一块白色的铁板，上面印着半圆的量角刻度，法线 ON 是正中的那条红色虚线。板从法线处分成左右两半，中间用合页连着，右半边可以向后折。
 * x 是法线的位置，y 是板的下沿（立在镜面上），z 是板的正面；fold 是右半边向后折了多少弧度
 */
export function ProtractorBoard({ x, y, z, W, H, R, fold }: { x: number; y: number; z: number; W: number; H: number; R: number; fold: number }) {
  const [left, right] = useMemo(() => { const t = makeProtractor(W, H, R); return [0, 0.5].map(o => { const c = t.clone(); c.repeat.set(0.5, 1); c.offset.set(o, 0); c.needsUpdate = true; return c }) }, [W, H, R])
  const half = (s: number, map: THREE.Texture) => <>
    <RoundedBox args={[W / 2 - 0.004, H, 0.02]} radius={0.004} position={[s * W / 4, H / 2, -0.01]} castShadow><meshStandardMaterial color="#7f7d77" roughness={0.6} metalness={0.2} /></RoundedBox>
    <mesh position={[s * W / 4, H / 2, 0.0006]}><planeGeometry args={[W / 2 - 0.02, H - 0.016]} /><meshStandardMaterial map={map} color="#7d7b75" roughness={0.9} /></mesh>
    {/* 板边的铝包条，背后一块三角撑脚 */}
    <mesh position={[s * (W / 2 - 0.006), H / 2, -0.01]}><boxGeometry args={[0.012, H + 0.004, 0.028]} /><Metal kind="aluminum" grain="brushed" env={ENV * 0.6} /></mesh>
    <mesh position={[s * W / 4, H + 0.004, -0.01]}><boxGeometry args={[W / 2, 0.012, 0.028]} /><Metal kind="aluminum" grain="brushed" env={ENV * 0.6} /></mesh>
    <mesh geometry={GUSSET} position={[s * (W / 2 - 0.2), 0, -0.02]} castShadow><Metal kind="steel" grain="brushed" env={1} /></mesh>
  </>
  return (
    <group position={[x, y, z]}>
      {half(-1, left)}
      <group rotation-y={fold}>{half(1, right)}</group>
      {/* 合页：背后三节轴套，一根通长的销子 */}
      {[0.16, 0.5, 0.84].map(k => <mesh key={k} position={[0, H * k, -0.03]}><cylinderGeometry args={[0.014, 0.014, H * 0.16, 14]} /><Metal kind="stainless" grain="turned" env={ENV} /></mesh>)}
      <mesh position={[0, H / 2, -0.03]}><cylinderGeometry args={[0.006, 0.006, H * 0.98, 10]} /><Metal kind="steel" env={ENV} /></mesh>
    </group>
  )
}

// ---------- 第 3、7 课：平行光源 ----------
/**
 * 平行光源：一只黑色的灯箱，后半截是散热片，前面一块开了几道细缝的铝板，光从缝里一条一条平行地射出来。
 * at 是前板正中的位置，dir 是光射出的方向；w 是前板的宽度，slits 是各条缝离正中多远
 */
export function LightBox({ at, dir, w, slits, on = true, dz = 0.4, pin = 0.2 }: { at: V2; dir: V2; w: number; slits: number[]; on?: boolean; dz?: number; pin?: number }) {
  const L = 0.56
  return (
    <group position={[at[0], at[1], 0]} rotation-z={Math.atan2(dir[1], dir[0]) - Math.PI / 2}>
      <RoundedBox args={[w, L, dz]} radius={0.02} position={[0, -L / 2 - 0.014, 0]} castShadow><meshPhysicalMaterial color="#3d4852" roughness={0.5} metalness={0.3} clearcoat={0.5} clearcoatRoughness={0.3} envMapIntensity={2.4} /></RoundedBox>
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[0, -L + 0.05 + i * 0.038, 0]}><boxGeometry args={[w + 0.03, 0.012, dz + 0.03]} /><meshStandardMaterial color="#59646e" roughness={0.45} metalness={0.8} envMapIntensity={2.4} /></mesh>)}
      <mesh position={[0, -0.007, 0]}><boxGeometry args={[w + 0.02, 0.014, dz + 0.02]} /><Metal kind="aluminum" grain="brushed" env={ENV * 0.7} /></mesh>
      {slits.map(s => <mesh key={s} position={[s, 0.0006, 0]}><boxGeometry args={[0.014, 0.002, dz * 0.62]} />{on ? <meshBasicMaterial color="#ffd9c8" toneMapped={false} /> : <meshBasicMaterial color="#050506" />}</mesh>)}
      {/* 正面的铭牌、亮度旋钮和四角的螺丝 */}
      <mesh position={[-w * 0.2, -L * 0.42, dz / 2 + 0.001]}><planeGeometry args={[w * 0.34, 0.1]} /><meshStandardMaterial color="#5d6166" metalness={0.6} roughness={0.6} /></mesh>
      <mesh geometry={KNOB} position={[w * 0.28, -L * 0.42, dz / 2]} rotation-x={Math.PI / 2} scale={1.5}><Black rough={0.4} /></mesh>
      <mesh position={[w * 0.28, -L * 0.42 + 0.075, dz / 2 + 0.002]}><circleGeometry args={[0.012, 12]} />{on ? <meshBasicMaterial color="#6dff9a" toneMapped={false} /> : <meshBasicMaterial color="#123a1e" />}</mesh>
      {/* 背后伸出一根轴，架在支杆上 */}
      <mesh position={[0, -L * 0.5, -dz / 2 - pin / 2 + 0.01]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.022, 0.022, pin, 14]} /><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
    </group>
  )
}

// ---------- 第 3 课：两种表面 ----------
/** 一块平放的镜子（厚玻璃，上表面镀银）。上表面在 y */
export function MirrorSlab({ x, y, w, d, t = 0.1 }: { x: number; y: number; w: number; d: number; t?: number }) {
  return <group position={[x, y, 0]}>
    <RoundedBox args={[w, t, d]} radius={0.008} position={[0, -t / 2 - 0.001, 0]} castShadow><meshPhysicalMaterial color="#35594f" roughness={0.08} metalness={0} clearcoat={1} envMapIntensity={2} /></RoundedBox>
    <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[w - 0.012, d - 0.012]} /><Silver /></mesh>
  </group>
}
/** 放大了很多倍的白纸表面：高低不平的一块。s 是折线里 1 cm 画多长；y 是五个落点所在的高度 */
export function PaperSlab({ x, y, s, d, t = 0.12 }: { x: number; y: number; s: number; d: number; t?: number }) {
  const geo = useMemo(() => {
    const p = paperProfile(), sh = new THREE.Shape()
    sh.moveTo(p[0][0] * s, -t); p.forEach(q => sh.lineTo(q[0] * s, q[1] * s)); sh.lineTo(p[p.length - 1][0] * s, -t); sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g
  }, [s, d, t])
  return <mesh geometry={geo} position={[x, y, 0]} castShadow receiveShadow><meshStandardMaterial color="#7a776e" roughness={1} /></mesh>
}

// ---------- 第 4 课：玻璃板 ----------
/** 夹住玻璃板的支架：一块底座，两片夹板，侧面一颗手拧螺丝 */
function Clip({ z }: { z: number }) {
  return <group position={[0, 0, z]}>
    <RoundedBox args={[0.34, 0.045, 0.15]} radius={0.01} position={[0, 0.0225, 0]} castShadow><meshStandardMaterial color="#2a3036" metalness={0.7} roughness={0.45} envMapIntensity={ENV * 0.6} /></RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.03, 0.13, 0.11]} radius={0.006} position={[s * 0.027, 0.11, 0]} castShadow><Metal kind="aluminum" grain="brushed" env={ENV * 0.7} /></RoundedBox>)}
    <mesh geometry={KNOB} position={[-0.042, 0.12, 0]} rotation-z={Math.PI / 2}><Black rough={0.45} /></mesh>
  </group>
}
/** 竖着的一块薄玻璃板（茶色），立在 x 处，下沿在 y，高 h，前后从 z0 到 z1。两头各一只支架夹着 */
export function GlassPlate({ x, y, h, z0, z1 }: { x: number; y: number; h: number; z0: number; z1: number }) {
  const d = z1 - z0, zc = (z0 + z1) / 2
  return <group position={[x, y, 0]}>
    <mesh position={[0, h / 2 + 0.03, zc]} renderOrder={5}><boxGeometry args={[0.012, h, d]} /><meshPhysicalMaterial color="#8fa79a" transparent opacity={0.2} roughness={0.04} metalness={0} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {/* 玻璃的断面是亮的：上沿和两条竖边各一道 */}
    <mesh position={[0, h + 0.03, zc]}><boxGeometry args={[0.013, 0.006, d]} /><meshBasicMaterial color="#8fcdb6" transparent opacity={0.55} /></mesh>
    {[z0, z1].map(z => <mesh key={z} position={[0, h / 2 + 0.03, z]}><boxGeometry args={[0.013, h, 0.006]} /><meshBasicMaterial color="#8fcdb6" transparent opacity={0.4} /></mesh>)}
    <Clip z={z0 + 0.14} /><Clip z={z1 - 0.14} />
  </group>
}

// ---------- 第 5、6 课：立着的平面镜 ----------
const BRACE = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.2, 0); s.lineTo(0.2, 0.025); s.lineTo(0.02, 0.36); s.lineTo(0, 0.36); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 }) })()
/**
 * 立着的一面平面镜，镜面朝左（−x）。x 是镜面的位置，y 是镜子的下沿，高 h，前后深 d。背后是木头底板和两块三角撑，下面一条底座。
 * cover：用黑布遮住的两段，[从下沿往上遮到多高, 从多高往上遮到顶]
 */
export function UprightMirror({ x, y, h, d, cover }: { x: number; y: number; h: number; d: number; cover?: [number, number] }) {
  return <group position={[x, y, 0]}>
    <mesh position={[0.007, h / 2, 0]}><boxGeometry args={[0.014, h, d]} /><meshPhysicalMaterial color="#35594f" roughness={0.08} clearcoat={1} envMapIntensity={2} /></mesh>
    <mesh position={[-0.0006, h / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[d - 0.01, h - 0.01]} /><Silver /></mesh>
    <RoundedBox args={[0.022, h + 0.03, d + 0.03]} radius={0.004} position={[0.026, h / 2, 0]} castShadow><Wood tint="#9a7c5e" repeat={2} /></RoundedBox>
    {[-1, 1].map(s => <mesh key={s} geometry={BRACE} position={[0.037, 0, s * (d / 2 - 0.1) - 0.007]} castShadow><Metal kind="steel" grain="brushed" env={1} /></mesh>)}
    <RoundedBox args={[0.42, y - TOP, d + 0.12]} radius={0.012} position={[0.1, -(y - TOP) / 2, 0]} castShadow receiveShadow><meshStandardMaterial color="#2a3036" metalness={0.7} roughness={0.45} envMapIntensity={ENV * 0.6} /></RoundedBox>
    {cover && cover[0] > 0.004 && <mesh position={[-0.004, cover[0] / 2, 0]}><boxGeometry args={[0.006, cover[0], d + 0.02]} /><meshStandardMaterial color="#0d0e10" roughness={1} /></mesh>}
    {cover && h - cover[1] > 0.004 && <mesh position={[-0.004, (h + cover[1]) / 2, 0]}><boxGeometry args={[0.006, h - cover[1], d + 0.02]} /><meshStandardMaterial color="#0d0e10" roughness={1} /></mesh>}
  </group>
}

// ---------- 第 6 课：潜望镜、灯塔模型、人偶 ----------
const Olive = () => <meshPhysicalMaterial color="#56633c" roughness={0.42} metalness={0.1} clearcoat={0.5} clearcoatRoughness={0.3} envMapIntensity={2} />
const CAP_BOLTS = bolts(4, 0.17, 0.022, 0.01)
const PEDESTAL = lathe([[0, 0], [0.24, 0], [0.25, 0.01], [0.25, 0.035], [0.2, 0.06], [0.09, 0.08], [0.075, 0.1], [0.075, 0.92], [0.12, 0.96], [0.12, 1], [0, 1]], { segs: 40 })
/**
 * 潜望镜：一根方筒，朝镜头的那面剖开。上口朝左，下口朝右；上下各一面和筒壁成 45° 的平面镜。
 * x 是筒的中线；yT、yB 是上下两面镜子中心的高度；a 是筒里面宽度的一半
 */
export function Periscope({ x, yT, yB, a }: { x: number; yT: number; yB: number; a: number }) {
  const t = 0.028, H = yT - yB, mid = (yT + yB) / 2, L = a * 2 * Math.SQRT2 - 0.02
  const mirror = (y: number, face: number) => <group position={[x, y, -0.005]} rotation-z={-Math.PI / 4}>
    <mesh position={[0, -face * 0.011, 0]}><boxGeometry args={[L, 0.016, a * 2 - 0.02]} /><Black rough={0.5} /></mesh>
    <mesh position={[0, face * 0.002, 0]}><boxGeometry args={[L - 0.01, 0.01, a * 2 - 0.03]} /><Silver /></mesh>
  </group>
  return (
    <group>
      <RoundedBox args={[a * 2 + t * 2, H + a * 2 + t * 2, t]} radius={0.006} position={[x, mid, -a - t / 2]} castShadow><Olive /></RoundedBox>
      <RoundedBox args={[t, H, a * 2 + t]} radius={0.006} position={[x - a - t / 2, mid - a, -t / 2]} castShadow><Olive /></RoundedBox>
      <RoundedBox args={[t, H, a * 2 + t]} radius={0.006} position={[x + a + t / 2, mid + a, -t / 2]} castShadow><Olive /></RoundedBox>
      <RoundedBox args={[a * 2 + t * 2, t, a * 2 + t]} radius={0.006} position={[x, yT + a + t / 2, -t / 2]} castShadow><Olive /></RoundedBox>
      <RoundedBox args={[a * 2 + t * 2, t, a * 2 + t]} radius={0.006} position={[x, yB - a - t / 2, -t / 2]} castShadow><Olive /></RoundedBox>
      <mesh position={[x, mid, -a + 0.002]}><planeGeometry args={[a * 2, H + a * 2]} /><meshStandardMaterial color="#0b0c0e" roughness={1} /></mesh>
      {/* 中间一道接箍：上下两节筒在这里套在一起，侧面一颗手拧螺丝 */}
      <mesh position={[x, mid, -a - t / 2 - 0.004]}><boxGeometry args={[a * 2 + t * 2 + 0.016, 0.09, t + 0.01]} /><Metal kind="steel" grain="brushed" env={ENV * 0.7} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[x + s * (a + t / 2 + 0.004), mid, -t / 2]}><boxGeometry args={[t + 0.01, 0.09, a * 2 + t + 0.01]} /><Metal kind="steel" grain="brushed" env={ENV * 0.7} /></mesh>)}
      <mesh geometry={KNOB} position={[x + a + t + 0.008, mid, 0.06]} rotation-z={-Math.PI / 2} scale={1.4}><Black rough={0.45} /></mesh>
      {/* 上下两个口各镶一圈黄铜边 */}
      {[[x - a - t / 2, yT], [x + a + t / 2, yB]].map(([bx, by]) => <group key={by} position={[bx, by, 0]}>
        <mesh position={[0, a - 0.008, -t / 2]}><boxGeometry args={[t + 0.012, 0.016, a * 2 + t]} /><Metal kind="brass" grain="brushed" env={ENV} /></mesh>
        <mesh position={[0, -a + 0.008, -t / 2]}><boxGeometry args={[t + 0.012, 0.016, a * 2 + t]} /><Metal kind="brass" grain="brushed" env={ENV} /></mesh>
        <mesh position={[0, 0, -a + 0.004]}><boxGeometry args={[t + 0.012, a * 2, 0.016]} /><Metal kind="brass" grain="brushed" env={ENV} /></mesh>
      </group>)}
      <mesh geometry={CAP_BOLTS} position={[x, yT + a + t, -t / 2]} rotation-y={Math.PI / 4}><Metal kind="steel" env={ENV} /></mesh>
      {mirror(yT, -1)}{mirror(yB, 1)}
      <mesh geometry={PEDESTAL} position={[x, TOP, -t / 2]} scale={[1, yB - a - t - TOP, 1]} castShadow><Metal kind="iron" grain="cast" env={ENV * 0.7} /></mesh>
    </group>
  )
}
function makeStripes() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256
  const g = c.getContext('2d')!
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#d8d2c4' : '#b5362a'; g.fillRect(0, i * 52, 8, 52) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
/** 一座灯塔的模型：红白相间的塔身，顶上一圈平台、一间亮着的灯室、一只尖顶。底在 (x, y0)，灯室中心高 h */
export function Lighthouse({ x, y0, h, z = 0 }: { x: number; y0: number; h: number; z?: number }) {
  const map = useMemo(makeStripes, [])
  const g = useMemo(() => {
    const b = h - 0.1
    return {
      base: lathe([[0, 0], [0.24, 0], [0.25, 0.01], [0.25, 0.05], [0.2, 0.07], [0, 0.07]], { segs: 40 }),
      tower: lathe([[0, 0], [0.17, 0], [0.105, b - 0.07], [0, b - 0.07]], { segs: 40 }),
      deck: lathe([[0, 0], [0.15, 0], [0.16, 0.008], [0.16, 0.02], [0, 0.02]], { segs: 40 }),
      roof: lathe([[0, 0], [0.105, 0], [0.11, 0.008], [0.02, 0.1], [0.012, 0.16], [0, 0.16]], { segs: 32 }),
    }
  }, [h])
  return <group position={[x, y0, z]}>
    <mesh geometry={g.base} castShadow><meshStandardMaterial color="#4a4f55" roughness={0.9} /></mesh>
    <mesh geometry={g.tower} position-y={0.07} castShadow><meshStandardMaterial map={map} color="#b5b0a6" roughness={0.6} /></mesh>
    <mesh geometry={g.deck} position-y={h - 0.1} castShadow><Black rough={0.5} /></mesh>
    {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[Math.cos(i * 0.628) * 0.15, h - 0.045, Math.sin(i * 0.628) * 0.15]}><cylinderGeometry args={[0.004, 0.004, 0.07, 6]} /><Black /></mesh>)}
    <mesh position-y={h - 0.012} rotation-x={Math.PI / 2}><torusGeometry args={[0.15, 0.004, 6, 32]} /><Black /></mesh>
    <mesh position-y={h}><cylinderGeometry args={[0.085, 0.085, 0.16, 20]} /><meshBasicMaterial color="#ffd98a" toneMapped={false} /></mesh>
    {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.cos(i * 1.047) * 0.088, h, Math.sin(i * 1.047) * 0.088]}><boxGeometry args={[0.008, 0.16, 0.008]} /><Black /></mesh>)}
    <mesh geometry={g.roof} position-y={h + 0.08} castShadow><meshStandardMaterial color="#7a231c" roughness={0.5} /></mesh>
    <pointLight position={[0, h, 0.3]} intensity={1} distance={2.4} decay={1.6} color="#ffca7a" />
  </group>
}
const TORSO = lathe([[0, 0], [0.06, 0], [0.075, 0.03], [0.06, 0.1], [0.075, 0.18], [0.085, 0.22], [0.07, 0.25], [0.03, 0.26], [0, 0.26]], { segs: 24, crease: 50 })
const DOLL_BASE = lathe([[0, 0], [0.19, 0], [0.2, 0.012], [0.2, 0.045], [0.185, 0.06], [0, 0.06]], { segs: 40 })
/**
 * 木头人偶（画画用的那种关节人偶）：站在一只圆底座上。x 是它站的位置，y 是脚底（底座的上表面），H 是身高；face 是它脸朝哪边（1 朝右）。
 * 眼睛在身高的 15/16 处。ghost：画成半透明的蓝色，表示这是镜子里的像
 */
export function Doll({ x, y, H, face = 1, ghost = false }: { x: number; y: number; H: number; face?: number; ghost?: boolean }) {
  const m = ghost ? <meshStandardMaterial color="#9fc8ff" emissive="#5f9be0" emissiveIntensity={0.5} transparent opacity={0.34} depthWrite={false} roughness={0.6} />
    : <meshPhysicalMaterial color="#b98d58" roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.4} envMapIntensity={1.6} />
  const ball = (p: [number, number, number], r: number) => <mesh position={p} castShadow={!ghost}><sphereGeometry args={[r, 16, 12]} />{m}</mesh>
  const limb = (a: [number, number, number], b: [number, number, number], r: number) => <Rod from={a} to={b} r={r}>{m}</Rod>
  return (
    <group position={[x, y, 0]}>
      <mesh geometry={DOLL_BASE} position-y={-0.06} castShadow={!ghost} receiveShadow={!ghost}>{ghost ? m : <Wood tint="#8f7458" repeat={1} />}</mesh>
      <group scale={[H * face, H, H]}>
        {[-1, 1].map(s => <group key={s}>
          <mesh position={[0.025, 0.02, s * 0.055]} castShadow={!ghost} scale={[1.7, 0.7, 1]}><sphereGeometry args={[0.03, 14, 10]} />{m}</mesh>
          {limb([0, 0.04, s * 0.055], [0, 0.26, s * 0.055], 0.024)}{ball([0, 0.275, s * 0.055], 0.03)}{limb([0, 0.29, s * 0.055], [0, 0.5, s * 0.05], 0.03)}
          {ball([0, 0.775, s * 0.11], 0.034)}{limb([0, 0.76, s * 0.115], [0, 0.6, s * 0.125], 0.022)}{ball([0, 0.585, s * 0.126], 0.024)}{limb([0, 0.57, s * 0.127], [0.02, 0.43, s * 0.12], 0.019)}{ball([0.024, 0.405, s * 0.12], 0.026)}
        </group>)}
        <mesh position={[0, 0.515, 0]} scale={[0.8, 0.6, 1.25]} castShadow={!ghost}><sphereGeometry args={[0.07, 18, 12]} />{m}</mesh>
        <mesh geometry={TORSO} position={[0, 0.55, 0]} scale={[0.85, 1, 1.25]} castShadow={!ghost}>{m}</mesh>
        <mesh position={[0, 0.83, 0]}><cylinderGeometry args={[0.022, 0.026, 0.06, 12]} />{m}</mesh>
        <mesh position={[0, 0.925, 0]} scale={[0.85, 1, 0.8]} castShadow={!ghost}><sphereGeometry args={[0.075, 22, 16]} />{m}</mesh>
        {!ghost && [-1, 1].map(s => <mesh key={s} position={[0.058, 0.9375, s * 0.024]}><sphereGeometry args={[0.009, 8, 6]} /><meshBasicMaterial color="#17191c" /></mesh>)}
      </group>
    </group>
  )
}

// ---------- 第 7 课：球面镜 ----------
const RING_BASE = lathe([[0, 0], [0.17, 0], [0.178, 0.008], [0.178, 0.03], [0.16, 0.044], [0.05, 0.052], [0.036, 0.07], [0.036, 0.1], [0, 0.1]], { segs: 40 })
/**
 * 一面球面镜，立在支杆上。顶点在 (x, y)，反射面朝左；kind 是凹面镜还是凸面镜；R 是球面的半径，A 是镜子口径的一半。
 * 镜片是有厚度的：凹面镜的反射面在碗里面，凸面镜的在鼓出来的那一面
 */
export function CurvedMirror({ x, y, kind, R, A }: { x: number; y: number; kind: 'concave' | 'convex'; R: number; A: number }) {
  const g = useMemo(() => {
    const N = 14, t = 0.03, sag = (h: number) => R - Math.sqrt(R * R - h * h)
    const prof = Array.from({ length: N + 1 }, (_, i) => [A * i / N, sag(A * i / N)] as [number, number])
    return { body: shell(kind === 'concave' ? prof.map(([r, s]) => [r, s - t] as [number, number]) : prof, t, { segs: 56 }), face: lathe(prof.map(([r, s]) => [r, s + (kind === 'concave' ? 0.002 : -0.002)] as [number, number]), { segs: 56, crease: 80 }), rim: sag(A) }
  }, [kind, R, A])
  const c = kind === 'concave' ? 1 : -1      // 凹面镜的碗口朝左，凸面镜的朝右
  return (
    <group>
      <group position={[x, y, 0]} rotation-z={c * Math.PI / 2}>
        <mesh geometry={g.body} castShadow><meshStandardMaterial color="#1e2226" roughness={0.5} metalness={0.4} /></mesh>
        <mesh geometry={g.face}><Silver two /></mesh>
        <mesh position={[0, g.rim - (kind === 'concave' ? 0.012 : 0.004), 0]} rotation-x={Math.PI / 2}><torusGeometry args={[A + 0.008, 0.02, 12, 56]} /><Black rough={0.4} /></mesh>
      </group>
      <mesh position={[x + 0.03, (y - A - 0.02 + TOP + 0.09) / 2, 0]} castShadow><cylinderGeometry args={[0.016, 0.016, y - A - 0.02 - TOP - 0.09, 14]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
      <mesh geometry={RING_BASE} position={[x + 0.03, TOP, 0]} castShadow><Metal kind="iron" grain="cast" env={ENV * 0.7} /></mesh>
    </group>
  )
}
const DISH = (() => { const f = 0.26, p = Array.from({ length: 13 }, (_, i) => [0.36 * i / 12, (0.36 * i / 12) ** 2 / (4 * f)] as [number, number]); return { body: shell(p.map(([r, s]) => [r, s - 0.012] as [number, number]), 0.012, { segs: 48 }), face: lathe(p.map(([r, s]) => [r, s + 0.002] as [number, number]), { segs: 48, crease: 80 }), f } })()
const KETTLE = lathe([[0, 0], [0.07, 0], [0.085, 0.02], [0.09, 0.06], [0.07, 0.1], [0.03, 0.11], [0.03, 0.118], [0.012, 0.13], [0, 0.13]], { segs: 28 })
/** 太阳灶的模型：一只大的凹面反光碗架在三脚架上，一把水壶正好架在光会聚的地方 */
export function SolarCooker({ x, z = 0 }: { x: number; z?: number }) {
  const hub: [number, number, number] = [0, 0.3, 0]
  return <group position={[x, TOP, z]}>
    {[0.5, 2.6, 4.7].map(a => <Rod key={a} from={[Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24]} to={hub} r={0.012}><Metal kind="steel" grain="brushed" env={1.2} /></Rod>)}
    <mesh position={hub}><sphereGeometry args={[0.03, 14, 10]} /><Metal kind="steel" env={ENV} /></mesh>
    <group position={[0, 0.32, 0]} rotation-z={0.3}>
      <mesh geometry={DISH.body} castShadow><meshStandardMaterial color="#5a6670" metalness={0.7} roughness={0.42} envMapIntensity={2.4} /></mesh>
      <mesh geometry={DISH.face}><Silver two /></mesh>
      {/* 壶架：从碗边伸出的两根细杆，托着一只圈，水壶坐在圈上 */}
      {[-1, 1].map(s => <Rod key={s} from={[0, 0.125, s * 0.36]} to={[0, DISH.f - 0.01, s * 0.08]} r={0.007}><Metal kind="steel" env={ENV} /></Rod>)}
      <mesh position={[0, DISH.f - 0.01, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.078, 0.007, 8, 28]} /><Metal kind="steel" env={ENV} /></mesh>
      <mesh geometry={KETTLE} position={[0, DISH.f - 0.012, 0]} castShadow><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>
      <mesh position={[0, DISH.f + 0.1, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.06, 0.006, 8, 20, Math.PI]} /><Metal kind="steel" env={ENV} /></mesh>
    </group>
  </group>
}
// 街角镜的镜面：一块球冠。贴图按正对着看的样子铺上去（不是绕着球顶转一圈）
const STREET_FACE = (() => {
  const g = new THREE.SphereGeometry(0.72, 40, 14, 0, Math.PI * 2, 0, 0.36), p = g.attributes.position, uv = g.attributes.uv, R = 0.72 * Math.sin(0.36)
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / R / 2, 0.5 - p.getZ(i) / R / 2)
  return g
})()
/** 镜子里映出的路口：天、两边的楼、拐过去的路和一辆车，画得往中间鼓，像凸面镜里看到的那样。暗室里没有东西可映，所以让它自己亮一点 */
let streetTex: THREE.CanvasTexture | null = null
function StreetView() {
  const map = useMemo(() => {
    if (!streetTex) {
      const S = 256, c = document.createElement('canvas'); c.width = c.height = S
      const g = c.getContext('2d')!, sky = g.createLinearGradient(0, 0, 0, S)
      sky.addColorStop(0, '#8fb8dc'); sky.addColorStop(0.5, '#cfe2ee'); sky.addColorStop(0.52, '#8c8f8a'); sky.addColorStop(1, '#5d605c')
      g.fillStyle = sky; g.fillRect(0, 0, S, S)
      g.fillStyle = '#b9ad98'; g.beginPath(); g.moveTo(0, 150); g.quadraticCurveTo(40, 60, 96, 96); g.lineTo(96, 136); g.quadraticCurveTo(40, 150, 0, 190); g.fill()          // 左边的楼
      g.fillStyle = '#a79f94'; g.beginPath(); g.moveTo(S, 150); g.quadraticCurveTo(216, 50, 150, 92); g.lineTo(150, 134); g.quadraticCurveTo(216, 150, S, 196); g.fill()      // 右边的楼
      g.fillStyle = '#5d6a78'; for (let i = 0; i < 4; i++) { g.fillRect(22 + i * 17, 104 + i * 2, 9, 9); g.fillRect(226 - i * 17, 100 + i * 3, 9, 9) }
      g.fillStyle = '#4a4d4a'; g.beginPath(); g.moveTo(96, 134); g.lineTo(150, 134); g.quadraticCurveTo(200, 190, 230, S); g.lineTo(20, S); g.quadraticCurveTo(60, 180, 96, 134); g.fill()   // 路
      g.strokeStyle = '#e9e6d8'; g.lineWidth = 3; g.setLineDash([10, 9]); g.beginPath(); g.moveTo(123, 140); g.quadraticCurveTo(126, 200, 132, S); g.stroke(); g.setLineDash([])
      g.fillStyle = '#c63b3b'; g.fillRect(140, 150, 30, 16); g.fillStyle = '#22272b'; g.fillRect(144, 153, 22, 6); g.beginPath(); g.arc(146, 167, 4, 0, 7); g.arc(164, 167, 4, 0, 7); g.fill()   // 一辆车
      streetTex = new THREE.CanvasTexture(c); streetTex.colorSpace = THREE.SRGBColorSpace
    }
    return streetTex
  }, [])
  return <meshPhysicalMaterial map={map} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.55} roughness={0.12} metalness={0.2} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.5} />
}
/** 街角反光镜的模型：一根立杆，顶上一面带橙色边框的凸面镜，镜子上面有一道遮雨檐 */
export function StreetMirror({ x, z = 0 }: { x: number; z?: number }) {
  return <group position={[x, TOP, z]}>
    <mesh geometry={RING_BASE} castShadow><Metal kind="iron" grain="cast" env={ENV * 0.7} /></mesh>
    <mesh position={[0, 0.58, 0]} castShadow><cylinderGeometry args={[0.022, 0.022, 1.0, 16]} /><meshStandardMaterial color="#c7742a" roughness={0.5} metalness={0.3} /></mesh>
    <group position={[-0.05, 0.98, 0.04]} rotation-y={-0.45} rotation-x={0.12}>
      <mesh geometry={STREET_FACE} position={[0, 0, -0.67]} rotation-x={Math.PI / 2}><StreetView /></mesh>
      <mesh position={[0, 0, 0.004]}><torusGeometry args={[0.255, 0.022, 12, 44]} /><meshStandardMaterial color="#d9661c" roughness={0.45} /></mesh>
      <mesh position={[0, 0, -0.03]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.255, 0.255, 0.05, 40]} /><Black /></mesh>
      <mesh position={[0, 0.27, 0.03]} rotation-x={0.25}><boxGeometry args={[0.36, 0.012, 0.14]} /><meshStandardMaterial color="#d9661c" roughness={0.45} /></mesh>
    </group>
    <mesh position={[-0.025, 0.98, 0.01]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.08, 10]} /><Metal kind="steel" env={ENV} /></mesh>
  </group>
}

// ---------- 拓展：日食模型、夹角镜、角反射器 ----------
function makeEarth() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128
  const g = c.getContext('2d')!
  let s = 21; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  g.fillStyle = '#1f4f8a'; g.fillRect(0, 0, 256, 128)
  for (let i = 0; i < 46; i++) { const x = rnd() * 256, y = 18 + rnd() * 92, r = 6 + rnd() * 16; g.fillStyle = rnd() < 0.7 ? '#3f7d46' : '#8c8a5a'; g.beginPath(); g.ellipse(x, y, r * 1.5, r, rnd() * 3, 0, 6.3); g.fill() }
  g.fillStyle = '#d5dde2'; g.fillRect(0, 0, 256, 9); g.fillRect(0, 119, 256, 9)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping
  return t
}
/** 三球仪那样的一套模型：一只发光的“太阳”，一只地球，一只绕着地球转的月球。angle 是月球转到哪了（0 在太阳和地球中间，180 在地球背后） */
export function Orrery({ sun, earth, angle, orbit }: { sun: V2; earth: V2; angle: number; orbit: number }) {
  const map = useMemo(makeEarth, [])
  const a = angle * Math.PI / 180, mx = earth[0] - Math.cos(a) * orbit, mz = Math.sin(a) * orbit
  return <group>
    <Post x={sun[0]} y={sun[1] - 0.2} />
    <mesh position={[sun[0], sun[1], 0]}><sphereGeometry args={[0.26, 32, 24]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>
    <pointLight position={[sun[0] + 0.3, sun[1], 0]} intensity={5} distance={6} decay={1.4} color="#ffe2b0" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} />
    <Post x={earth[0]} y={earth[1] - 0.2} />
    <mesh position={[earth[0], earth[1] - 0.24, 0]}><cylinderGeometry args={[0.008, 0.008, 0.12, 8]} /><Metal kind="steel" env={ENV} /></mesh>
    <mesh position={[earth[0], earth[1], 0]} rotation-z={0.2} castShadow receiveShadow><sphereGeometry args={[0.2, 40, 28]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>
    {/* 月球：架在一根从地球支杆上伸出来的弯臂上 */}
    <Rod from={[earth[0], earth[1] - 0.3, 0]} to={[mx, earth[1] - 0.3, mz]} r={0.008}><meshStandardMaterial color="#2a2d31" metalness={0.5} roughness={0.5} /></Rod>
    <Rod from={[mx, earth[1] - 0.3, mz]} to={[mx, earth[1] - 0.05, mz]} r={0.006}><meshStandardMaterial color="#2a2d31" metalness={0.5} roughness={0.5} /></Rod>
    <mesh position={[mx, earth[1], mz]} castShadow receiveShadow><sphereGeometry args={[0.055, 24, 18]} /><meshStandardMaterial color="#b9b6ae" roughness={0.95} /></mesh>
  </group>
}
/**
 * 夹角镜：两面竖着的平面镜，用合页连在一起，可以开合。顶点在 (x, z)，开口朝着镜头；alpha 是夹角（度）；len、h 是每面镜子的长和高。
 * 镜面画成半透明的，镜子后面摆着算出来的像
 */
export function HingedMirrors({ x, z, alpha, len, h }: { x: number; z: number; alpha: number; len: number; h: number }) {
  const half = alpha * Math.PI / 360
  return <group position={[x, TOP, z]}>
    {[-1, 1].map(s => <group key={s} rotation-y={s * half}>
      {/* 每面镜子：从顶点沿 +z 伸出去 */}
      <mesh position={[0, h / 2 + 0.012, len / 2 + 0.02]} renderOrder={5}><boxGeometry args={[0.012, h, len]} /><meshPhysicalMaterial color="#b9c8d2" transparent opacity={0.3} roughness={0.03} metalness={0.6} clearcoat={1} envMapIntensity={2.4} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.006, len / 2 + 0.02]}><boxGeometry args={[0.03, 0.012, len + 0.02]} /><Metal kind="aluminum" grain="brushed" env={ENV * 0.7} /></mesh>
      <mesh position={[0, h + 0.018, len / 2 + 0.02]}><boxGeometry args={[0.03, 0.012, len + 0.02]} /><Metal kind="aluminum" grain="brushed" env={ENV * 0.7} /></mesh>
      <mesh position={[0, h / 2 + 0.012, len + 0.03]}><boxGeometry args={[0.03, h + 0.024, 0.012]} /><Metal kind="aluminum" grain="brushed" env={ENV * 0.7} /></mesh>
    </group>)}
    {[0.2, 0.8].map(k => <mesh key={k} position={[0, h * k + 0.012, 0]}><cylinderGeometry args={[0.016, 0.016, h * 0.22, 14]} /><Metal kind="brass" grain="turned" env={ENV} /></mesh>)}
    <mesh position={[0, h / 2 + 0.012, 0]}><cylinderGeometry args={[0.007, 0.007, h + 0.03, 10]} /><Metal kind="steel" env={ENV} /></mesh>
  </group>
}
const PAWN = lathe([[0, 0], [0.07, 0], [0.075, 0.008], [0.075, 0.025], [0.05, 0.04], [0.03, 0.09], [0.024, 0.15], [0.045, 0.16], [0.045, 0.17], [0.026, 0.18], [0.045, 0.2], [0.05, 0.23], [0.04, 0.262], [0.02, 0.275], [0, 0.278]], { segs: 28, crease: 40 })
/** 一枚红色的棋子（兵）。ghost：画成半透明，表示这是镜子里的像 */
export function Pawn({ x, z, ghost = false }: { x: number; z: number; ghost?: boolean }) {
  return <mesh geometry={PAWN} position={[x, TOP + 0.002, z]} castShadow={!ghost}>
    {ghost ? <meshStandardMaterial color="#e9a9a0" emissive="#b8433a" emissiveIntensity={0.35} transparent opacity={0.6} roughness={0.5} /> : <meshPhysicalMaterial color="#b3261c" roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.2} envMapIntensity={2} />}
  </mesh>
}
/** 角反射器：两面互相垂直的镜子，一面平放、一面竖着，拐角在 (x, y)。光路在它们的侧面看得最清楚 */
export function CornerMirrors({ x, y, len, d }: { x: number; y: number; len: number; d: number }) {
  return <group>
    <Platform x={x - len / 2 + 0.06} y={y - 0.05} w={len + 0.3} d={d + 0.2} />
    <group position={[x, y, 0]}>
      <RoundedBox args={[len, 0.05, d]} radius={0.006} position={[-len / 2, -0.026, 0]} castShadow><meshPhysicalMaterial color="#35594f" roughness={0.08} clearcoat={1} envMapIntensity={2} /></RoundedBox>
      <mesh position={[-len / 2, 0, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[len - 0.01, d - 0.01]} /><Silver /></mesh>
      <RoundedBox args={[0.05, len, d]} radius={0.006} position={[0.026, len / 2 - 0.05, 0]} castShadow><meshPhysicalMaterial color="#35594f" roughness={0.08} clearcoat={1} envMapIntensity={2} /></RoundedBox>
      <mesh position={[0, len / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[d - 0.01, len - 0.01]} /><Silver /></mesh>
      {/* 背后一块角铁把两面镜子固定成直角 */}
      <mesh position={[0.07, len / 2 - 0.05, 0]}><boxGeometry args={[0.04, len, d * 0.5]} /><Metal kind="steel" grain="brushed" env={ENV * 0.6} /></mesh>
    </group>
  </group>
}
