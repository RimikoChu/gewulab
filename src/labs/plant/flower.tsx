// 植物的一生 · 桃花的模型（第 6、7 课和拓展课用）：花柄、花托、萼片、花瓣、雄蕊（花丝顶着花药）、雌蕊（柱头、花柱、子房，子房里有胚珠）。
// 朝镜头的一半可以拿掉，露出剖面；受精以后花瓣、雄蕊、柱头和花柱凋落，子房长成果实，果实也可以剖开。
// 模型自己的坐标：原点在花柄的基部，花朝上开，+z 朝镜头。
import { useMemo } from 'react'
import * as THREE from 'three'
import type { RY } from '@/lab-kit'
import { Flesh, arc, blob, ease, fuse, leafGeo, lerp, mixHex, petalTex, place, ring, rng, seg, tint, tube, useGeo, wedge, type V3 } from './parts'

const GLOW = '#ffc640'
export type FlowerPart = 'pedicel' | 'receptacle' | 'sepal' | 'petal' | 'stamen' | 'pistil' | null
const CUP: RY[] = [[0, 0.5], [0.08, 0.5], [0.28, 0.58], [0.5, 0.85], [0.56, 1.12], [0.5, 1.12], [0.43, 0.88], [0.22, 0.67], [0, 0.63]]
const RIM = 1.12
/** 子房：中心的高度、两个半轴；长成果实以后放大多少倍 */
export const OV = { y: 0.95, rx: 0.25, ry: 0.32, base: 0.63 }, FRUIT = 4.7
const STYLE_TOP = 2.25
/** 花上各处的位置（模型自己的坐标），给标签和花粉的路线用 */
export const F = {
  stigma: [0.02, STYLE_TOP + 0.05, 0] as V3, style: [0.02, 1.55, 0] as V3, ovary: [0, OV.y, 0] as V3, ovule: [0, OV.y - 0.03, 0] as V3, egg: [0, OV.y - 0.15, 0.02] as V3,
  pedicel: [0, 0.22, 0] as V3, receptacle: [-0.5, 0.86, 0] as V3, sepal: [-0.84, 0.98, -0.3] as V3, petal: [-1.35, 1.9, -0.1] as V3,
  anther: [-0.96, 1.98, -0.12] as V3, filament: [-0.72, 1.54, -0.1] as V3,
}
/** 20 根雄蕊：从花托的边缘斜着伸出去 */
const STAMENS = (() => {
  const r = rng(61)
  return Array.from({ length: 22 }, (_, i) => {
    const a = i / 22 * Math.PI * 2 + 0.14, out = i % 2 ? 0.52 : 0.3, h = 0.82 + (i % 2 ? 0 : 0.14) + r() * 0.1, c = Math.cos(a), s = Math.sin(a)
    const base: V3 = [c * 0.5, RIM, s * 0.5], mid: V3 = [c * (0.5 + out * 0.45), RIM + h * 0.55, s * (0.5 + out * 0.45)], top: V3 = [c * (0.5 + out), RIM + h, s * (0.5 + out)]
    return { base, mid, top, a, front: s > 0.12 }
  })
})()
/** 半个桃的外皮：比子房多一道缝合线（朝镜头那一侧的浅沟），向阳的一面发红。a0–a1 是绕轴的角度范围 */
function peachSkin(a0: number, a1: number) {
  const NU = 30, NV = 30, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color(), yellow = new THREE.Color('#ffd28c'), red = new THREE.Color('#d94a44')
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
    const t = lerp(-Math.PI / 2, Math.PI / 2, i / NU), a = lerp(a0, a1, j / NV), da = a - Math.PI * 1.5
    const r = OV.rx * Math.cos(t) * (1 - 0.075 * Math.exp(-(da * da) / 0.05) * Math.sqrt(Math.max(0, Math.cos(t))))
    pos.push(r * Math.cos(a), OV.y + OV.ry * Math.sin(t) - 0.012 * Math.exp(-(da * da) / 0.05) * Math.max(0, Math.sin(t)), -r * Math.sin(a))
    const b = Math.pow(clamp(0.55 + 0.5 * Math.cos(a - 4.1) + 0.2 * Math.sin(t * 2 + a * 3)), 1.3) * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t)))
    c.copy(yellow).lerp(red, Math.min(0.85, b)); col.push(c.r, c.g, c.b)
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const p = i * (NV + 1) + j, q = p + NV + 1; idx.push(p, p + 1, q, q, p + 1, q + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const build = () => {
  const petal = leafGeo({ len: 1.5, wid: 1.4, basePow: 1.55, tipPow: 0.5, curl: -0.22, fold: 0, cup: 0.5, wave: 0.07, base: '#d85f88', tip: '#fbd9e3', back: '#efaec2', nu: 16, nv: 5 })
  const sepal = leafGeo({ len: 0.52, wid: 0.34, basePow: 0.8, tipPow: 1, curl: 0.25, fold: 0.2, base: '#7f9a48', tip: '#a8563c', back: '#9aa85a', nu: 6, nv: 2 })
  const fil = (list: typeof STAMENS) => list.length ? fuse(list.map(s => tube([s.base, s.mid, s.top], 0.022, 0.014, '#f6dfe4', '#fbeef0', 6, 8))) : new THREE.BufferGeometry()
  const ant = (list: typeof STAMENS) => list.length ? fuse(list.map(s => place(blob(0.05, 0.085, 0.045, '#d9a22c', '#f0c94e', 10, 8), s.top, -s.a, 0.3))) : new THREE.BufferGeometry()
  const front = STAMENS.filter(s => s.front), back = STAMENS.filter(s => !s.front)
  const wall = ring(OV.rx, OV.ry, 0.06, OV.y), flesh = ring(OV.rx, OV.ry, 0.14, OV.y)
  return {
    petal, sepal,
    pedicel: tube([[0, -0.05, 0], [0.02, 0.25, 0], [0, 0.52, 0]], 0.075, 0.08, '#7f9648', '#8fa64a', 10, 6),
    cupBack: wedge(CUP, 0, Math.PI, '#8fa64a', '#c9d79a', 24, '#a8603c'), cupFront: wedge(CUP, Math.PI, Math.PI * 2, '#8fa64a', '#c9d79a', 24, '#a8603c'),
    filBack: fil(back), filFront: fil(front), antBack: ant(back), antFront: ant(front),
    // 子房壁（薄）和果皮（厚）：外形一样，各分成朝里、朝外两半；外表面和剖面分开，外表面的颜色会变
    wallBack: wedge(wall, 0, Math.PI, '#ffffff', '#dfe9b2', 24, undefined, 'body'), wallBackCap: wedge(wall, 0, Math.PI, '#ffffff', '#e4edba', 24, undefined, 'caps'),
    wallFront: wedge(wall, Math.PI, Math.PI * 2, '#ffffff', '#dfe9b2', 24, undefined, 'body'),
    skinBack: peachSkin(0, Math.PI), skinFront: peachSkin(Math.PI, Math.PI * 2),
    fleshBackCap: wedge(flesh, 0, Math.PI, '#ffffff', '#f6d894', 24, undefined, 'caps'),
    // 胚珠：外面一层珠被，里面靠下端有卵细胞
    ovule: wedge(ring(0.11, 0.165, 0.03, OV.y - 0.03), 0, Math.PI, '#f3efd6', '#d9cf9c', 16), ovuleIn: wedge(arc(0.08, 0.135, OV.y - 0.03, 12), 0, Math.PI, '#fbf8e8', '#fbf8e8', 16),
    stalk: tube([[0, OV.base + 0.01, 0], [0, OV.y - 0.19, 0]], 0.03, 0.025, '#e6dfb8', '#e6dfb8', 6, 3),
    // 果核（果皮最里面硬的一层）和种子
    stone: wedge(ring(0.11, 0.18, 0.03, OV.y - 0.02), 0, Math.PI, '#8a5a36', '#a8774a', 16), seed: blob(0.062, 0.125, 0.04, '#b98a52', '#d6ac74', 14, 10),
    style: tube([[0, OV.y + OV.ry - 0.03, 0], [0.03, 1.7, 0], [0.02, STYLE_TOP, 0]], 0.045, 0.034, '#b9c66a', '#d9d58a', 8, 10),
    stigma: blob(0.085, 0.055, 0.085, '#d9cf7a', '#efe6a0', 12, 8),
  }
}
let parts: ReturnType<typeof build> | null = null
const P = () => (parts ??= build())

export interface FlowerProps {
  /** 朝镜头的一半拿掉了多少（0–1） */ cut?: number
  /** 正在指认的部分 */ sel?: FlowerPart
  /** 受精以后发育到哪了（0–1）：凋落，子房长成果实 */ grow?: number
  /** 果实朝镜头的一半拿掉了多少 */ fruitCut?: number
  /** 卵细胞是不是已经受精 */ fertilized?: boolean
  /** 花开了多少（0 是花蕾，1 是盛开） */ bloom?: number
}
export function Flower({ cut = 0, sel = null, grow = 0, fruitCut = 0, fertilized = false, bloom = 1 }: FlowerProps) {
  const g = P()
  const open = seg(cut, 0, 1) * (1 - seg(grow, 0, 0.1)), wither = seg(grow, 0.1, 0.42), fall = seg(grow, 0.36, 0.6), swell = ease(seg(grow, 0.3, 1))
  const on = (k: FlowerPart) => (sel === k ? 0.5 : 0)
  const brown = (c: string) => mixHex(c, '#8a6a42', wither * 0.85)
  const drop = -fall * fall * 3.2, gone = fall >= 1
  const sc = lerp(1, FRUIT, swell), fcol = mixHex(mixHex('#8fb04e', '#a9b85c', seg(grow, 0.3, 0.7)), '#ffffff', seg(grow, 0.6, 1))
  const isFruit = grow > 0.2, fo = ease(fruitCut)
  // 朝镜头的那几样（两片花瓣、前排的雄蕊、花托和子房的前一半）：剖开时往前下方挪开并淡出
  const away: V3 = [0, -open * 0.5, open * 1.3], fade = 1 - open
  return (
    <group>
      <mesh geometry={g.pedicel} castShadow><Flesh rough={0.6} emissive={GLOW} glow={on('pedicel')} /></mesh>
      {/* 花托、萼片：果实长大以后被撑掉 */}
      {swell < 0.5 && <group scale={1 - seg(swell, 0.25, 0.5) * 0.6}>
        <mesh geometry={g.cupBack} castShadow><Flesh rough={0.6} double color={brown('#ffffff')} emissive={GLOW} glow={on('receptacle')} /></mesh>
        {fade > 0.01 && <mesh geometry={g.cupFront} position={away}><Flesh rough={0.6} double opacity={fade} color={brown('#ffffff')} emissive={GLOW} glow={on('receptacle')} /></mesh>}
        {[0, 1, 2, 3, 4].map(k => { const yaw = k * 1.2566 + 1.2566 / 2 + 0.628, front = Math.cos(yaw) > 0.1, o = front ? fade : 1; return o > 0.01 && <mesh key={k} geometry={g.sepal} position={[Math.sin(yaw) * 0.54 + (front ? away[0] : 0), RIM - 0.03 + (front ? away[1] : 0), Math.cos(yaw) * 0.54 + (front ? away[2] : 0)]} rotation={[0.35 + wither * 0.5, yaw, 0, 'YXZ']} castShadow><meshStandardMaterial vertexColors roughness={0.6} color={brown('#ffffff')} transparent={o < 1} opacity={o} emissive={GLOW} emissiveIntensity={on('sepal')} /></mesh> })}
      </group>}
      {/* 花瓣：五片；凋落时先耷拉、变褐，再掉下去 */}
      {!gone && [0, 1, 2, 3, 4].map(k => {
        const yaw = 0.628 + k * 1.2566, front = Math.cos(yaw) > 0.3, o = front ? fade : 1
        if (o < 0.01) return null
        return <mesh key={k} geometry={g.petal} position={[Math.sin(yaw) * 0.51 + (front ? away[0] : 0), RIM + drop + (front ? away[1] : 0), Math.cos(yaw) * 0.51 + (front ? away[2] : 0)]}
          rotation={[lerp(-1.25, -0.5, bloom) + wither * 1.5, yaw, 0, 'YXZ']} scale={(0.45 + 0.55 * bloom) * (1 - wither * 0.35)} castShadow>
          <meshStandardMaterial vertexColors map={petalTex()} roughness={0.55} color={brown('#ffffff')} transparent={o * (1 - fall) < 1} opacity={o * (1 - fall)} emissive={GLOW} emissiveIntensity={on('petal') * 0.6} />
        </mesh>
      })}
      {/* 雄蕊：花丝顶着花药 */}
      {!gone && bloom > 0.5 && <group position={[0, drop, 0]} rotation-x={0}>
        <mesh geometry={g.filBack} castShadow><Flesh rough={0.5} color={brown('#ffffff')} opacity={1 - fall} emissive={GLOW} glow={on('stamen')} /></mesh>
        <mesh geometry={g.antBack} castShadow><Flesh rough={0.6} color={brown('#ffffff')} opacity={1 - fall} emissive={GLOW} glow={on('stamen')} /></mesh>
        {fade > 0.01 && <group position={away}>
          <mesh geometry={g.filFront}><Flesh rough={0.5} color={brown('#ffffff')} opacity={fade * (1 - fall)} emissive={GLOW} glow={on('stamen')} /></mesh>
          <mesh geometry={g.antFront}><Flesh rough={0.6} color={brown('#ffffff')} opacity={fade * (1 - fall)} emissive={GLOW} glow={on('stamen')} /></mesh>
        </group>}
      </group>}
      {/* 雌蕊：柱头、花柱凋落；子房留下来长大 */}
      {!gone && <group position={[0, drop * 0.6, 0]} scale={[1 - wither * 0.4, 1 - wither * 0.25, 1 - wither * 0.4]}>
        <mesh geometry={g.style} castShadow><Flesh rough={0.5} color={brown('#ffffff')} opacity={1 - fall} emissive={GLOW} glow={on('pistil')} /></mesh>
        <mesh geometry={g.stigma} position={[0.02, STYLE_TOP + 0.03, 0]} castShadow><Flesh rough={0.45} color={brown('#ffffff')} opacity={1 - fall} emissive={GLOW} glow={on('pistil')} /></mesh>
      </group>}
      <group position={[0, OV.base, 0]} scale={[sc * lerp(1, 1.1, swell), sc * lerp(1, 0.86, swell), sc * lerp(1, 1.1, swell)]}>
        <group position={[0, -OV.base, 0]}>
          <mesh geometry={isFruit ? g.skinBack : g.wallBack} castShadow><Flesh rough={isFruit ? 0.85 : 0.5} double color={fcol} emissive={GLOW} glow={on('pistil')} /></mesh>
          <mesh geometry={isFruit ? g.fleshBackCap : g.wallBackCap}><Flesh rough={0.7} double emissive={isFruit ? '#f2cf84' : '#cfdc9a'} glow={0.3} /></mesh>
          {(isFruit ? fo < 0.99 : fade > 0.01) && <mesh geometry={isFruit ? g.skinFront : g.wallFront} position={isFruit ? [0, -fo * 0.02, fo * 0.3] : [0, -open * 0.12, open * 0.5]} castShadow><Flesh rough={isFruit ? 0.85 : 0.5} double color={fcol} opacity={isFruit ? 1 - fo : fade} /></mesh>}
          {isFruit ? <>
            <mesh geometry={g.stone}><Flesh rough={0.8} double /></mesh>
            <mesh geometry={g.seed} position={[0, OV.y - 0.02, 0.015]}><Flesh rough={0.6} /></mesh>
          </> : <>
            <mesh geometry={g.stalk}><Flesh rough={0.6} /></mesh>
            <mesh geometry={g.ovule}><Flesh rough={0.6} double /></mesh>
            <mesh geometry={g.ovuleIn}><Flesh rough={0.7} double emissive="#f4efd2" glow={0.4} /></mesh>
            <mesh position={F.egg}><sphereGeometry args={[0.03, 14, 10]} /><meshStandardMaterial color={fertilized ? '#f08a3c' : '#e9c46a'} emissive={fertilized ? '#ff9a3c' : '#000000'} emissiveIntensity={fertilized ? 0.7 : 0} roughness={0.4} /></mesh>
          </>}
        </group>
      </group>
    </group>
  )
}
/** 花粉管：从柱头往下，穿过花柱，进入子房，绕到胚珠下端的珠孔。k 是长到哪了（0–1）。画在最前面，隔着花柱也看得见 */
export function PollenTube({ k }: { k: number }) {
  const pts = useMemo(() => new THREE.CatmullRomCurve3([[0.02, STYLE_TOP + 0.06, 0.035], [0.03, 1.7, 0.05], [0.01, OV.y + OV.ry - 0.02, 0.06], [0.15, OV.y + 0.1, 0.04], [0.155, OV.y - 0.08, 0.04], [0.08, OV.y - 0.215, 0.035], [0, OV.y - 0.175, 0.03]].map(p => new THREE.Vector3(...p))), [])
  const q = Math.round(Math.min(1, Math.max(0, k)) * 80) / 80
  const geo = useGeo(() => (q < 0.02 ? new THREE.BufferGeometry() : tube(Array.from({ length: 14 }, (_, i) => pts.getPoint(q * i / 13)), 0.014, 0.014, '#ffffff', '#ffffff', 6, 40)), [q])
  const tip = pts.getPoint(q), sperm = pts.getPoint(Math.max(0, q - 0.03))
  return <group>
    <mesh position={[0.02, STYLE_TOP + 0.085, 0.03]}><sphereGeometry args={[0.035, 12, 10]} /><meshStandardMaterial color="#f2c230" roughness={0.6} /></mesh>
    <mesh geometry={geo} renderOrder={8}><meshBasicMaterial color="#ffd23c" depthTest={false} toneMapped={false} /></mesh>
    {k > 0.02 && k < 1 && [tip, sperm].map((p, i) => <mesh key={i} position={p} renderOrder={9}><sphereGeometry args={[0.02, 8, 6]} /><meshBasicMaterial color="#d2452c" depthTest={false} toneMapped={false} /></mesh>)}
  </group>
}
/** 一只蜜蜂：身上沾着花粉 */
export function Bee({ flap }: { flap: number }) {
  const g = useMemo(() => ({ wing: tint(leafGeo({ len: 0.34, wid: 0.2, basePow: 1.3, tipPow: 0.6, curl: 0, fold: 0, wave: 0, base: '#ffffff', tip: '#ffffff', nu: 5, nv: 2 }), '#eef6fa') }), [])
  return <group>
    <mesh scale={[0.13, 0.12, 0.2]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#e3a81c" roughness={0.8} /></mesh>
    {[-0.07, 0.02, 0.1].map(z => <mesh key={z} position={[0, 0, z]} rotation-x={Math.PI / 2} scale={[1, 1, 1]}><torusGeometry args={[0.118 * Math.sqrt(1 - (z / 0.2) ** 2), 0.02, 6, 20]} /><meshStandardMaterial color="#1e1a14" roughness={0.7} /></mesh>)}
    <mesh position={[0, 0.01, 0.24]}><sphereGeometry args={[0.085, 14, 10]} /><meshStandardMaterial color="#1e1a14" roughness={0.6} /></mesh>
    {[-1, 1].map(s => <mesh key={s} geometry={g.wing} position={[s * 0.05, 0.1, 0.02]} rotation={[-0.2, s * (Math.PI / 2 + 0.3), s * (0.5 + Math.sin(flap) * 0.6), 'YXZ']}><meshStandardMaterial vertexColors transparent opacity={0.5} roughness={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    <mesh position={[0, -0.09, 0.02]} scale={[0.07, 0.04, 0.1]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#f2c230" roughness={0.9} /></mesh>
  </group>
}
