// 第 7 课和拓展课共用的东西：石墨的层状模型、两块电极板和一只小灯、在晶体里移动的自由电子。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, lathe } from '@/lab-kit'
import { rng } from './parts'
import type { V3 } from './physics'

// ---------- 石墨 ----------
/** 石墨一层里相邻碳原子的距离、层间距（画面单位；层间距和键长的比按 335 : 142 画） */
export const G_BOND = 0.8, G_GAP = G_BOND * 335 / 142
const paint = (g: THREE.BufferGeometry, c: string) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.toNonIndexed() }
/** 一层六边形的网：原子是小球，键是细棍，合成一个模型。shift：这一层相对上一层错开半格 */
function layerGeo(shift: boolean) {
  const b = G_BOND, pts: [number, number][] = [], W = 3.1, D = 2.2, s3 = Math.sqrt(3)
  for (let i = -6; i <= 6; i++) for (let j = -5; j <= 5; j++) for (const dy of [0, b]) {
    const x = (i + j / 2) * s3 * b + (shift ? 0 : 0), z = j * 1.5 * b + dy + (shift ? b : 0)
    if (Math.abs(x) <= W && Math.abs(z) <= D) pts.push([x, z])
  }
  const gs: THREE.BufferGeometry[] = [], up = new THREE.Vector3(0, 1, 0)
  for (const [x, z] of pts) { const g = new THREE.SphereGeometry(0.25, 20, 14); g.translate(x, 0, z); gs.push(paint(g, '#3d4046')) }
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const dx = pts[j][0] - pts[i][0], dz = pts[j][1] - pts[i][1], d = Math.hypot(dx, dz)
    if (Math.abs(d - b) > 0.01) continue
    const g = new THREE.CylinderGeometry(0.075, 0.075, d, 10)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(dx / d, 0, dz / d))); g.translate((pts[i][0] + pts[j][0]) / 2, 0, (pts[i][1] + pts[j][1]) / 2)
    gs.push(paint(g, '#b4b9be'))
  }
  return mergeGeometries(gs)
}
let layers: [THREE.BufferGeometry, THREE.BufferGeometry] | null = null
/** 石墨：三层六边形的网，一层和一层错开；层和层之间没有棍（只有范德华力）。slide：最上面一层被往后推开多远 */
export function Graphite({ slide = 0 }: { slide?: number }) {
  const geo = useMemo(() => (layers ??= [layerGeo(false), layerGeo(true)]), [])
  return <group>
    {[-1, 0, 1].map(k => <mesh key={k} geometry={geo[k === 0 ? 1 : 0]} position={[0, k * G_GAP, k === 1 ? -slide : 0]} castShadow>
      <meshPhysicalMaterial vertexColors roughness={0.26} clearcoat={1} clearcoatRoughness={0.12} envMapIntensity={1.3} />
    </mesh>)}
  </group>
}

// ---------- 电极、导线、小灯 ----------
const bulbGeo = lathe([[0, 0], [0.16, 0], [0.2, 0.18], [0.36, 0.42], [0.42, 0.66], [0.34, 0.9], [0.16, 1.02], [0, 1.05]], { segs: 32, crease: 60 })
const baseGeo = lathe([[0, 0], [0.5, 0], [0.5, 0.16], [0.3, 0.22], [0.24, 0.5], [0, 0.5]], { segs: 32 })
/**
 * 两块电极板夹着晶体，导线接到转台上的一只小灯上（at：小灯在哪）。w：电极板离中心多远；drop：模型中心到转台面的高度；on：通了电没有；lit：灯亮不亮
 */
export function Circuit({ w, drop, on, lit, size = [3.6, 3.2], at = [0, 3.5] }: { w: number; drop: number; on: boolean; lit: boolean; size?: [number, number]; at?: [number, number] }) {
  const lamp: V3 = [at[0], -drop, at[1]]
  // 导线从电极板顶上的接线柱出来，在板外垂下去，再绕到小灯的灯座
  const wires = useMemo(() => [-1, 1].map(s => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(s * (w + 0.02), size[0] / 2 + 0.34, 0), new THREE.Vector3(s * (w + 0.55), size[0] / 2 + 0.42, 0.05), new THREE.Vector3(s * (w + 0.95), size[0] / 2 - 0.6, 0.25), new THREE.Vector3(s * (w + 0.9), -drop + 1.3, 0.9), new THREE.Vector3((s * (w + 0.2) + at[0]) / 2 + s * 0.8, -drop + 0.07, at[1] * 0.55), new THREE.Vector3(at[0] + s * 0.9, -drop + 0.07, at[1] - 0.3), new THREE.Vector3(at[0] + s * 0.34, -drop + 0.12, at[1]),
  ]), 72, 0.05, 8)), [w, drop, size[0], at[0], at[1]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    {[-1, 1].map((s, i) => <group key={s}>
      <RoundedBox args={[0.16, size[0], size[1]]} radius={0.05} position={[s * w, 0, 0]} castShadow><Metal kind="steel" grain="brushed" rough={0.5} env={0.7} /></RoundedBox>
      <mesh geometry={wires[i]} castShadow><meshStandardMaterial color={s < 0 ? '#20242a' : '#b3261e'} roughness={0.5} /></mesh>
      {/* 接线柱：板顶一只黄铜螺柱，下面一片垫圈，上面一只滚花的旋帽压住线头；板边一道绝缘的夹条 */}
      <group position={[s * w, size[0] / 2, 0]}>
        <mesh position-y={0.03} castShadow><cylinderGeometry args={[0.2, 0.2, 0.06, 20]} /><Metal kind="brass" /></mesh>
        <mesh position-y={0.2} castShadow><cylinderGeometry args={[0.075, 0.075, 0.4, 14]} /><Metal kind="brass" grain="turned" /></mesh>
        <mesh position-y={0.34} castShadow><cylinderGeometry args={[0.17, 0.17, 0.16, 12]} /><meshPhysicalMaterial color={s < 0 ? '#1b1d20' : '#a3221b'} roughness={0.45} clearcoat={0.5} /></mesh>
        <mesh position-y={-0.14} castShadow><boxGeometry args={[0.24, 0.28, size[1] + 0.08]} /><meshStandardMaterial color="#15181b" roughness={0.6} /></mesh>
      </group>
      {/* 电极板上的正负号：通电时亮 */}
      <mesh position={[s * (w + 0.09), size[0] / 2 - 0.4, 0]} rotation-y={s * Math.PI / 2}><planeGeometry args={[0.5, 0.12]} /><meshBasicMaterial color={on ? '#fff3b8' : '#5b6066'} toneMapped={false} /></mesh>
      {s > 0 && <mesh position={[s * (w + 0.09), size[0] / 2 - 0.4, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[0.12, 0.5]} /><meshBasicMaterial color={on ? '#fff3b8' : '#5b6066'} toneMapped={false} /></mesh>}
    </group>)}
    <group position={lamp}>
      <mesh geometry={baseGeo} castShadow><Metal kind="brass" grain="turned" /></mesh>
      <mesh geometry={bulbGeo} position-y={0.48}><meshPhysicalMaterial color={lit ? '#fff0b0' : '#dfe6ea'} emissive="#ffc94d" emissiveIntensity={lit ? 3.2 : 0} transparent opacity={lit ? 0.95 : 0.4} roughness={0.05} clearcoat={1} depthWrite={lit} toneMapped={!lit} /></mesh>
      {lit && <pointLight position={[0, 1, 0]} intensity={26} distance={9} decay={1.6} color="#ffd98a" />}
    </group>
  </group>
}

// ---------- 自由电子 ----------
const dot = new THREE.SphereGeometry(1, 12, 8)
/**
 * 一群能自由移动的电子：平时在原地附近乱动，加上电压就一起朝正极（+x）移动，到头从另一边进来。
 * box：范围 [宽, 高, 深]；ys：只在这几层高度上动（石墨的层）；t：钟；drift：定向移动的速度
 */
export function Electrons({ n, box, t, drift, ys, opacity = 1, seed = 7 }: { n: number; box: V3; t: number; drift: number; ys?: number[]; opacity?: number; seed?: number }) {
  const list = useMemo(() => { const r = rng(seed); return Array.from({ length: n }, (_, i) => ({ x: r(), y: ys ? ys[i % ys.length] : (r() - 0.5) * box[1], z: (r() - 0.5) * box[2], w: 0.6 + r() * 1.2, ph: r() * 6.28 })) }, [n, seed, box[0], box[1], box[2], ys?.join()])   // eslint-disable-line react-hooks/exhaustive-deps
  if (opacity < 0.01) return null
  return <group>{list.map((e, i) => {
    const u = (((e.x + drift * t * 0.16 * e.w) % 1) + 1) % 1, edge = Math.min(1, u * 8, (1 - u) * 8)
    return <mesh key={i} geometry={dot} position={[(u - 0.5) * box[0] + Math.sin(t * 3.1 * e.w + e.ph) * 0.14, e.y + Math.sin(t * 2.3 * e.w + e.ph * 2) * (ys ? 0.05 : 0.16), e.z + Math.cos(t * 2.7 * e.w + e.ph) * 0.16]} scale={0.085 * edge} renderOrder={7}>
      <meshBasicMaterial color="#9fe8ff" toneMapped={false} transparent opacity={opacity} />
    </mesh>
  })}</group>
}

// ---------- 熔化用的槽 ----------
/** 槽里面的半宽、半深，槽高、壁厚 */
export const TROUGH = { hx: 3.05, hz: 2.35, h: 1.0, t: 0.14 }
/**
 * 白瓷的浅槽：放在转台上，晶体熔化后的液体盛在里面，两块电极板的下沿伸进槽里。
 * y：槽底的高度；level：液面离槽底多高（0 就是空的）；color、glow：液体的颜色和发光的强弱
 */
export function Trough({ y, level, color, glow, opacity = 0.5 }: { y: number; level: number; color: string; glow: number; opacity?: number }) {
  const { hx, hz, h, t } = TROUGH
  const wall = <meshPhysicalMaterial color="#e9e6df" roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.2} />
  return <group position-y={y}>
    <RoundedBox args={[(hx + t) * 2, t, (hz + t) * 2]} radius={0.04} position-y={t / 2} castShadow receiveShadow>{wall}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={`x${s}`} args={[t, h, (hz + t) * 2]} radius={0.04} position={[s * (hx + t / 2), h / 2, 0]} castShadow receiveShadow>{wall}</RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={`z${s}`} args={[hx * 2, h, t]} radius={0.04} position={[0, h / 2, s * (hz + t / 2)]} castShadow receiveShadow>{wall}</RoundedBox>)}
    {level > 0.02 && <mesh position-y={t + (level - t) / 2} renderOrder={5}>
      <boxGeometry args={[hx * 2 - 0.02, Math.max(0.01, level - t), hz * 2 - 0.02]} />
      <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={glow} transparent opacity={opacity} roughness={0.08} clearcoat={1} depthWrite={false} />
    </mesh>}
  </group>
}
