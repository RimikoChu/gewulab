// 实验台上的器材：烧杯、试管和试管架、研钵和杵、漏斗、滤纸条、培养皿盖、毛细吸管、试剂瓶、手套；
// 光源箱、三棱镜、光屏、装色素溶液的比色皿；盆栽菠菜、叶室、补光灯、二氧化碳钢瓶、光合仪。
// 尺寸都按米写，乘 M 变成画面单位；每件器材的原点多半在底面正中。
import { useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, lathe, shell, type RY } from '@/lab-kit'
import { rng, type V3 } from './kit'
import { PIGMENTS, absorb, type PigmentKey, type Sample } from './physics'
import { M } from './world'

export const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用半透明、不写深度、双面的做法，反光调亮 */
export const Glass = ({ tint = '#9fbcc1', opacity = 0.15 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={Math.min(0.38, opacity * 1.25)} roughness={0.02} metalness={0} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={3.4} specularIntensity={1} depthWrite={false} side={THREE.DoubleSide} />
/** 一段液体：圆柱形的液体加一层亮的液面。原点在液体底面正中 */
export function LiquidBody({ r, h, color, opacity = 0.45 }: { r: number; h: number; color: string; opacity?: number }) {
  if (h < 0.002) return null
  return <>
    <mesh position={[0, h / 2, 0]} renderOrder={5}><cylinderGeometry args={[r, r * 0.985, h, 40]} /><meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.5} envMapIntensity={0.3} depthWrite={false} /></mesh>
    <mesh position={[0, h + 0.001, 0]} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r, 40]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.92, opacity + 0.12)} roughness={0.05} clearcoat={0.6} envMapIntensity={0.9} depthWrite={false} /></mesh>
  </>
}

// ---------- 烧杯、试管、漏斗 ----------
export const BEAKER = { 100: { r: 0.026, h: 0.07 }, 250: { r: 0.035, h: 0.095 } } as const
export type Vol = keyof typeof BEAKER
const beakerGeo = memo((vol: Vol) => { const { r, h } = BEAKER[vol]; return shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), 0.0018 * M, { segs: 56 }) })
/** 一只烧杯，原点在杯底正中。fill 盛了多少（0–1） */
export function Beaker({ vol, fill = 0, color = '#cfe6ee', opacity = 0.4, marks = true, children }: { vol: Vol; fill?: number; color?: string; opacity?: number; marks?: boolean; children?: ReactNode }) {
  const { r, h } = BEAKER[vol], R = r * M, H = h * M, wall = 0.0018 * M
  return <group>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    {marks && [0.3, 0.45, 0.6, 0.75].map((q, i) => <mesh key={q} position={[0, H * q, 0]} rotation-y={-0.5}><cylinderGeometry args={[R + 0.003, R + 0.003, 0.01, 24, 1, true, 0, i % 2 ? 0.3 : 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {fill > 0.005 && <group position-y={wall}><LiquidBody r={R - wall - 0.002} h={H * fill - wall} color={color} opacity={opacity} /></group>}
    {children}
  </group>
}
/** 培养皿盖：扣在烧杯口上，防止层析液挥发 */
export function PetriLid({ r = 0.034 }: { r?: number }) {
  const g = useMemo(() => shell(m([[0, 0.012], [r - 0.002, 0.012], [r, 0.01], [r, 0]]), 0.0016 * M, { segs: 48 }), [r])
  return <mesh geometry={g} renderOrder={7}><Glass opacity={0.2} /></mesh>
}
export const TUBE = { r: 0.011, h: 0.15 }
const tubeGeo = memo((_: number) => {
  const r = TUBE.r, h = TUBE.h, pts: RY[] = []
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]) }
  pts.push([r, h - 0.001], [r + 0.0012, h])
  return shell(m(pts), 0.0009 * M, { segs: 32, crease: 50 })
})
/** 试管，原点在管底。fill 盛了多少（0–1）；有颜色的滤液用带一点自发光的材质，颜色才饱和 */
export function TestTube({ fill = 0.3, color = '#1f6a22', opacity = 0.92 }: { fill?: number; color?: string; opacity?: number }) {
  const r = (TUBE.r - 0.0009) * M, h = Math.max(r, TUBE.h * fill * M)
  const mat = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.25} transparent opacity={opacity} depthWrite={false} />
  return <group>
    <mesh geometry={tubeGeo(0)} renderOrder={7}><Glass opacity={0.2} /></mesh>
    {fill > 0.01 && <>
      <mesh position-y={r} renderOrder={5}><sphereGeometry args={[r * 0.98, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />{mat}</mesh>
      <mesh position-y={r + (h - r) / 2} renderOrder={5}><cylinderGeometry args={[r * 0.98, r * 0.98, h - r, 20]} />{mat}</mesh>
    </>}
  </group>
}
/** 试管架：木头的，两层板，上层一排孔。原点在底面正中 */
export function TubeRack({ n = 3, gap = 0.04 }: { n?: number; gap?: number }) {
  const L = (n * gap + 0.02) * M, D = 0.045 * M, wood = <meshStandardMaterial color="#c49a64" roughness={0.75} />
  const top = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-L / 2, -D / 2); s.lineTo(L / 2, -D / 2); s.lineTo(L / 2, D / 2); s.lineTo(-L / 2, D / 2); s.closePath()
    for (let i = 0; i < n; i++) { const h = new THREE.Path(); h.absarc((i - (n - 1) / 2) * gap * M, 0, (TUBE.r + 0.0018) * M, 0, Math.PI * 2, true); s.holes.push(h) }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.008 * M, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g
  }, [L, D, n, gap])
  return <group>
    <RoundedBox args={[L, 0.012 * M, D]} radius={0.01} position-y={0.006 * M} castShadow receiveShadow>{wood}</RoundedBox>
    <mesh geometry={top} position-y={0.075 * M} castShadow>{wood}</mesh>
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.008 * M, 0.08 * M, D]} radius={0.008} position={[s * (L / 2 - 0.004 * M), 0.043 * M, 0]} castShadow>{wood}</RoundedBox>)}
  </group>
}
/** 玻璃漏斗：60° 的锥斗接一段细颈。原点在颈的下口 */
export function Funnel() {
  const g = useMemo(() => shell(m([[0.0042, 0], [0.0042, 0.045], [0.0075, 0.052], [0.036, 0.094], [0.0372, 0.0965]]), 0.0012 * M, { segs: 48 }), [])
  return <group>
    <mesh geometry={g} renderOrder={7}><Glass opacity={0.24} /></mesh>
    {/* 垫在漏斗里的单层尼龙布 */}
    <mesh position-y={0.076 * M} renderOrder={6}><coneGeometry args={[0.03 * M, 0.04 * M, 32, 1, true]} /><meshStandardMaterial color="#f1efe6" roughness={0.9} transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} /></mesh>
  </group>
}

// ---------- 研钵和杵 ----------
const mortarGeo = () => shell(m([[0, 0], [0.034, 0], [0.038, 0.004], [0.04, 0.012], [0.058, 0.05], [0.064, 0.064], [0.066, 0.067]]), 0.007 * M, { segs: 64 })
const pestleGeo = () => lathe(m([[0, 0], [0.008, 0.001], [0.014, 0.006], [0.016, 0.016], [0.0135, 0.032], [0.009, 0.06], [0.0095, 0.12], [0.011, 0.132], [0.008, 0.14], [0, 0.142]]), { segs: 32, crease: 60 })
const Porcelain = () => <meshPhysicalMaterial color="#efece4" roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.25} />
/** 研钵，原点在底面正中。mash：里面的东西磨到什么程度（0 是剪碎的叶片，1 是深绿的匀浆）；amount：还剩多少 */
export function Mortar({ mash = 0, amount = 1 }: { mash?: number; amount?: number }) {
  const g = useMemo(mortarGeo, [])
  const bits = useMemo(() => { const r = rng(4); return Array.from({ length: 26 }, () => ({ p: [(r() - 0.5) * 0.05 * M, 0.041 * M + r() * 0.004 * M, (r() - 0.5) * 0.05 * M] as V3, e: [r() * 3, r() * 3, r() * 0.6] as V3, s: 0.6 + r() * 0.7 })) }, [])
  const col = useMemo(() => new THREE.Color('#3f8f36').lerp(new THREE.Color('#1f5a22'), mash), [mash])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><Porcelain /></mesh>
    {amount > 0.02 && <>
      <mesh position-y={(0.012 + 0.018 * amount) * M} scale={[0.6 + 0.4 * amount, 0.35, 0.6 + 0.4 * amount]}><sphereGeometry args={[0.042 * M, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={col} roughness={0.35 + 0.3 * (1 - mash)} emissive={col} emissiveIntensity={0.15} /></mesh>
      {mash < 0.85 && bits.map((b, i) => <mesh key={i} position={b.p} rotation={b.e} scale={b.s * (1 - mash)}><boxGeometry args={[0.012 * M, 0.001 * M, 0.008 * M]} /><meshStandardMaterial color={i % 3 ? '#3f9b3c' : '#2f7f30'} roughness={0.6} /></mesh>)}
    </>}
  </group>
}
/** 杵，原点在研磨的那一头，朝 +y */
export function Pestle() { const g = useMemo(pestleGeo, []); return <mesh geometry={g} castShadow><Porcelain /></mesh> }

// ---------- 滤纸条 ----------
export const STRIP = { w: 0.022, h: 0.085, line: 0.012, travel: 0.066 }
/**
 * 一张滤纸条，原点在下端正中（下端剪去两个角）。lined：画了滤液细线没有（0–1，画到多长）；t：层析进行到哪（0–1）；
 * leaf：这片叶子里各种色素的含量
 */
export function Strip({ lined = 0, t = 0, leaf }: { lined?: number; t?: number; leaf: Record<PigmentKey, number> }) {
  const { tex, ctx } = useMemo(() => { const c = document.createElement('canvas'); c.width = 96; c.height = 600; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, ctx: c.getContext('2d')! } }, [])
  useEffect(() => {
    const W = 96, H = 600, y = (mm: number) => H - mm / STRIP.h * H, g = ctx
    g.clearRect(0, 0, W, H); g.fillStyle = '#f6f3ea'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, y(0.008)); g.lineTo(W - 26, H); g.lineTo(26, H); g.lineTo(0, y(0.008)); g.closePath(); g.fill()
    // 层析液浸湿的部分颜色深一点
    if (t > 0) { g.fillStyle = 'rgba(190,196,170,0.4)'; g.beginPath(); g.moveTo(0, y(STRIP.line + STRIP.travel * Math.min(1, t * 1.04))); g.lineTo(W, y(STRIP.line + STRIP.travel * Math.min(1, t * 1.04))); g.lineTo(W, y(0.008)); g.lineTo(W - 26, H); g.lineTo(26, H); g.lineTo(0, y(0.008)); g.closePath(); g.fill() }
    g.strokeStyle = 'rgba(90,90,90,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(4, y(STRIP.line)); g.lineTo(W - 4, y(STRIP.line)); g.stroke()
    if (lined > 0) { g.fillStyle = `rgba(${leaf.chla > 0.2 ? '38,110,40' : '196,160,36'},${0.95 * (1 - Math.min(1, t * 2.2))})`; g.fillRect(6, y(STRIP.line) - 5, (W - 12) * lined, 8) }
    if (t > 0.02) for (const p of PIGMENTS) {
      const yy = y(STRIP.line + STRIP.travel * p.rf * t), a = Math.min(1, leaf[p.key] / 0.09) * Math.min(1, t * 2.5), hh = 16 + 80 * leaf[p.key]
      const q = g.createLinearGradient(0, yy - hh, 0, yy + hh); q.addColorStop(0, 'rgba(255,255,255,0)'); q.addColorStop(0.3, p.color); q.addColorStop(0.7, p.color); q.addColorStop(1, 'rgba(255,255,255,0)')
      g.globalAlpha = a; g.fillStyle = q; g.fillRect(5, yy - hh, W - 10, hh * 2); g.globalAlpha = 1
    }
    tex.needsUpdate = true
  }, [lined, t, leaf, ctx, tex])
  return <mesh position-y={STRIP.h * M / 2} castShadow><planeGeometry args={[STRIP.w * M, STRIP.h * M]} /><meshStandardMaterial map={tex} transparent alphaTest={0.5} roughness={0.9} side={THREE.DoubleSide} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.12} /></mesh>
}
/** 毛细吸管：一根很细的玻璃管，里面吸着绿色的滤液。原点在下端，朝 +y */
export function Capillary({ full = true }: { full?: boolean }) {
  return <group>
    <mesh position-y={0.05 * M} renderOrder={7}><cylinderGeometry args={[0.0012 * M, 0.0012 * M, 0.1 * M, 10]} /><Glass opacity={0.3} /></mesh>
    {full && <mesh position-y={0.02 * M}><cylinderGeometry args={[0.0007 * M, 0.0007 * M, 0.04 * M, 8]} /><meshStandardMaterial color="#2a7a2a" emissive="#2a7a2a" emissiveIntensity={0.4} /></mesh>}
  </group>
}
/** 试剂瓶：细口玻璃瓶，磨砂塞，贴一圈颜色不同的标签。原点在瓶底 */
export function Bottle({ band = '#3a76c4', liquid = '#e8eef0', brown = false, h = 0.11 }: { band?: string; liquid?: string; brown?: boolean; h?: number }) {
  const g = useMemo(() => shell(m([[0, 0], [0.024, 0], [0.026, 0.003], [0.026, h * 0.62], [0.02, h * 0.76], [0.011, h * 0.84], [0.011, h * 0.97], [0.013, h]]), 0.0018 * M, { segs: 40 }), [h])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#6a3a12' : '#9fbcc1'} opacity={brown ? 0.5 : 0.16} /></mesh>
    <group position-y={0.002 * M}><LiquidBody r={0.0235 * M} h={h * 0.5 * M} color={liquid} opacity={brown ? 0.5 : 0.35} /></group>
    <mesh position-y={h * 0.34 * M}><cylinderGeometry args={[0.0265 * M, 0.0265 * M, h * 0.3 * M, 32, 1, true]} /><meshStandardMaterial color="#f3f1ea" roughness={0.8} /></mesh>
    <mesh position-y={h * 0.46 * M}><cylinderGeometry args={[0.0268 * M, 0.0268 * M, h * 0.05 * M, 32, 1, true]} /><meshStandardMaterial color={band} roughness={0.7} /></mesh>
    <mesh position-y={(h + 0.008) * M}><cylinderGeometry args={[0.012 * M, 0.0095 * M, 0.022 * M, 20]} /><meshPhysicalMaterial color="#dfe8ea" roughness={0.6} transparent opacity={0.85} /></mesh>
  </group>
}

// ---------- 手套 ----------
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.3, 1.1], [0, -2.5, 0.6], [0, -2.8, -0.9], [0, -2.1, -1.9]].map(p => new THREE.Vector3(p[0], p[1], p[2]))); return new THREE.TubeGeometry(c, 20, 0.9, 10) })()
/** 一只握着东西的手：蓝色丁腈手套、袖口、一截白大褂的袖子往手腕方向伸出去，末端淡出。握着的东西从拳心穿过，拳心在原点；手腕朝 +y，手背朝 −z */
export function Glove({ s = 0.0068 * M }: { s?: number }) {
  const glove = <meshStandardMaterial color="#4f7fc8" roughness={0.55} />, L = 10
  return <group scale={s}><group position={[0, -0.2, -0.9]}>
    <RoundedBox args={[8.4, 7.4, 6.2]} radius={2.4} smoothness={3} position={[0, 4.6, -0.8]} castShadow>{glove}</RoundedBox>
    {[-2.9, -0.95, 0.95, 2.9].map((x, i) => <mesh key={x} geometry={FINGER} position={[x, 1.6, 1.4]} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]} castShadow>{glove}</mesh>)}
    <mesh position={[4.2, 1.8, 1.6]} rotation={[0.5, 0, 0.9]} castShadow><capsuleGeometry args={[1.05, 3.2, 6, 12]} />{glove}</mesh>
    <mesh position={[0, 9.4, -0.8]} castShadow><cylinderGeometry args={[4.5, 4.2, 4, 24]} />{glove}</mesh>
    <mesh position={[0, 11.4 + L / 2, -0.8]} castShadow><cylinderGeometry args={[5.2, 4.6, L, 24, 1, true]} /><meshStandardMaterial color="#e6e6e1" roughness={0.85} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 11.4 + L + 4, -0.8]}><cylinderGeometry args={[5.4, 5.2, 8, 24, 1, true]} /><meshStandardMaterial color="#e6e6e1" roughness={0.85} transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group></group>
}

// ---------- 分光：光源箱、三棱镜、光屏、比色皿 ----------
/** 波长（nm）大致是什么颜色（只管画面） */
export function hue(nm: number): [number, number, number] {
  let r = 0, g = 0, b = 0
  if (nm < 440) { r = (440 - nm) / 60 * 0.7; b = 1 } else if (nm < 490) { g = (nm - 440) / 50; b = 1 } else if (nm < 510) { g = 1; b = (510 - nm) / 20 }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1 } else if (nm < 645) { r = 1; g = (645 - nm) / 65 } else r = 1
  const k = nm < 420 ? 0.4 + 0.6 * (nm - 380) / 40 : nm > 700 ? Math.max(0.25, 0.3 + 0.7 * (760 - nm) / 60) : 1
  return [r * k, g * k, b * k]
}
/** 光屏上能照到的波长范围 */
export const SPEC: [number, number] = [400, 720]
/** 光源箱：黑色的金属盒，前面一道竖缝，顶上有散热的格栅。原点在底面正中，缝朝 +x */
export function LampBox({ on }: { on: boolean }) {
  return <group>
    <RoundedBox args={[0.13 * M, 0.11 * M, 0.1 * M]} radius={0.03} position-y={0.075 * M} castShadow><meshStandardMaterial color="#23272b" roughness={0.45} metalness={0.5} /></RoundedBox>
    {[-0.035, -0.012, 0.011, 0.034].map(x => <mesh key={x} position={[x * M, 0.1315 * M, 0]}><boxGeometry args={[0.012 * M, 0.004 * M, 0.08 * M]} /><meshStandardMaterial color="#0d0f11" roughness={0.6} /></mesh>)}
    <mesh position={[0.0655 * M, 0.075 * M, 0]}><boxGeometry args={[0.004 * M, 0.07 * M, 0.05 * M]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh position={[0.068 * M, 0.075 * M, 0]}><boxGeometry args={[0.002 * M, 0.05 * M, 0.006 * M]} /><meshBasicMaterial color={on ? '#fff6dc' : '#1a1a1a'} toneMapped={false} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.045 * M, 0.01 * M, 0]}><boxGeometry args={[0.02 * M, 0.02 * M, 0.09 * M]} /><meshStandardMaterial color="#15181b" roughness={0.7} /></mesh>)}
    <mesh position={[-0.066 * M, 0.05 * M, 0.02 * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.01 * M, 16]} /><meshStandardMaterial color={on ? '#58e07a' : '#2a3a2e'} emissive={on ? '#58e07a' : '#000000'} emissiveIntensity={1.5} /></mesh>
  </group>
}
/** 三棱镜：立在一个小圆台上。原点在圆台底面正中；棱镜中心高 PRISM_Y */
export const PRISM_Y = 0.075
export function Prism() {
  const g = useMemo(() => { const s = new THREE.Shape(), R = 0.03 * M; for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / 3; if (i) s.lineTo(Math.cos(a) * R, Math.sin(a) * R); else s.moveTo(Math.cos(a) * R, Math.sin(a) * R) } s.closePath(); const e = new THREE.ExtrudeGeometry(s, { depth: 0.05 * M, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }); e.rotateX(Math.PI / 2); e.translate(0, 0.025 * M, 0); return e }, [])
  const base = useMemo(() => lathe(m([[0, 0], [0.03, 0], [0.032, 0.003], [0.032, 0.006], [0.008, 0.01], [0.008, 0.042], [0.028, 0.045], [0.028, 0.05], [0, 0.05]]), { segs: 40 }), [])
  return <group>
    <mesh geometry={base} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh geometry={g} position-y={0.05 * M} renderOrder={8}><meshPhysicalMaterial color="#dff1f5" transparent opacity={0.32} roughness={0.02} clearcoat={1} envMapIntensity={3} depthWrite={false} /></mesh>
  </group>
}
/** 光屏：一块白板立在底座上，朝 −x。板上照着光谱：sample 是放在光路里的溶液，k 是它挡住了多少（0 没放，1 完全放进去），lit 开没开灯。原点在底座底面正中 */
export const SCREEN = { w: 0.26, h: 0.12, y: 0.075 }
export function Screen({ sample, k, lit }: { sample: Sample; k: number; lit: number }) {
  const { tex, ctx } = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { tex: t, ctx: c.getContext('2d')! } }, [])
  useEffect(() => {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 512, 128)
    for (let x = 0; x < 512; x++) { const nm = SPEC[0] + (SPEC[1] - SPEC[0]) * (x / 511), c = hue(nm), a = lit * (1 - k * Math.min(1, absorb(sample, nm) * 1.15)); ctx.fillStyle = `rgb(${Math.round(255 * Math.pow(c[0] * a, 0.8))},${Math.round(255 * Math.pow(c[1] * a, 0.8))},${Math.round(255 * Math.pow(c[2] * a, 0.8))})`; ctx.fillRect(x, 22, 1, 84) }
    tex.needsUpdate = true
  }, [sample, k, lit, ctx, tex])
  return <group>
    <mesh position-y={0.006 * M} castShadow><boxGeometry args={[0.06 * M, 0.012 * M, 0.14 * M]} /><meshStandardMaterial color="#2a2e32" roughness={0.5} metalness={0.4} /></mesh>
    <mesh position-y={0.02 * M}><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.03 * M, 16]} /><Metal kind="steel" grain="turned" /></mesh>
    <RoundedBox args={[0.006 * M, (SCREEN.h + 0.05) * M, (SCREEN.w + 0.02) * M]} radius={0.008} position-y={SCREEN.y * M + 0.02} castShadow><meshStandardMaterial color="#ecebe6" roughness={0.9} /></RoundedBox>
    <mesh position={[-0.0034 * M, SCREEN.y * M, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[SCREEN.w * M, SCREEN.h * 0.62 * M]} /><meshBasicMaterial map={tex} toneMapped={false} transparent opacity={0.96} blending={THREE.AdditiveBlending} /></mesh>
  </group>
}
/** 比色皿：方的玻璃小槽，装着色素溶液，立在一个小台子上。原点在台子底面正中，溶液中心高 PRISM_Y */
export function Cuvette({ color }: { color: string }) {
  return <group>
    <mesh position-y={0.02 * M} castShadow><boxGeometry args={[0.03 * M, 0.04 * M, 0.05 * M]} /><meshStandardMaterial color="#30353a" roughness={0.5} metalness={0.4} /></mesh>
    <mesh position-y={0.076 * M} renderOrder={5}><boxGeometry args={[0.011 * M, 0.066 * M, 0.036 * M]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.8} roughness={0.2} depthWrite={false} /></mesh>
    <mesh position-y={0.08 * M} renderOrder={7}><boxGeometry args={[0.015 * M, 0.08 * M, 0.04 * M]} /><Glass opacity={0.22} /></mesh>
  </group>
}

// ---------- 盆栽、叶室、补光灯、钢瓶、光合仪 ----------
/** 菠菜叶：卵形，中间一道主脉，叶面微微兜着。长 1，叶柄在原点，朝 +y 伸出去 */
const leafGeo = memo((tone: number) => {
  const NT = 22, NW = 12, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color(), base = new THREE.Color().setHSL(0.31 + tone * 0.03, 0.55, 0.3 + tone * 0.04), vein = new THREE.Color('#9cc86a')
  for (let i = 0; i <= NT; i++) for (let j = 0; j <= NW; j++) {
    const t = i / NT, u = j / NW * 2 - 1, w = 0.34 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - 0.25 * t) + 0.012
    const x = u * w, y = t, z = 0.5 * x * x / (w + 0.05) * 0.6 - 0.05 * t * t + 0.02 * Math.sin(t * 14 + u * 3) * Math.abs(u)
    pos.push(x, y, z)
    const rib = Math.exp(-(u * u) / 0.004), side = Math.exp(-((Math.abs(u) * 2.2 - (t * 7) % 1) ** 2) / 0.02) * 0.35
    c.copy(base).multiplyScalar(0.85 + 0.25 * Math.abs(u)).lerp(vein, Math.min(1, rib * 0.8 + side * 0.5)); col.push(c.r, c.g, c.b)
  }
  for (let i = 0; i < NT; i++) for (let j = 0; j < NW; j++) { const p = i * (NW + 1) + j, n = p + NW + 1; idx.push(p, p + 1, n, n, p + 1, n + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
})
/** 这盆菜的每片叶子：朝哪边、叶柄多长、多大、多斜 */
const LEAVES = [{ a: 1.15, stem: 0.07, s: 0.14, tilt: 0.52 }, { a: 0.1, stem: 0.06, s: 0.125, tilt: 0.37 }, { a: 2.5, stem: 0.075, s: 0.135, tilt: 0.62 }, { a: 3.6, stem: 0.06, s: 0.12, tilt: 0.42 }, { a: 4.7, stem: 0.07, s: 0.13, tilt: 0.57 }, { a: 5.6, stem: 0.05, s: 0.11, tilt: 0.17 }, { a: 0.9, stem: 0.04, s: 0.085, tilt: 0.15 }, { a: 3.0, stem: 0.04, s: 0.09, tilt: 0.15 }]
const potGeo = () => shell(m([[0, 0], [0.05, 0], [0.052, 0.003], [0.07, 0.105], [0.074, 0.105], [0.075, 0.125], [0.071, 0.127]]), 0.005 * M, { segs: 48 })
/** 每片叶子摆在哪：叶柄从盆土正中斜着伸出去，叶片接在叶柄顶上，再往外倒一些，正面朝上 */
const LEAF_AT = LEAVES.map(L => {
  const dir = new THREE.Vector3(Math.cos(L.a), 0, Math.sin(L.a)), len = L.stem * M
  const sd = new THREE.Vector3(dir.x * Math.sin(L.tilt), Math.cos(L.tilt), dir.z * Math.sin(L.tilt))
  const tip = new THREE.Vector3(0, 0.114 * M, 0).addScaledVector(sd, len)
  const t2 = Math.min(1.5, L.tilt + 0.42), Y = new THREE.Vector3(dir.x * Math.sin(t2), Math.cos(t2), dir.z * Math.sin(t2)), X = new THREE.Vector3(-dir.z, 0, dir.x), Z = new THREE.Vector3().crossVectors(X, Y)
  return { tip, mid: new THREE.Vector3(0, 0.114 * M, 0).addScaledVector(sd, len / 2), sq: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sd), lq: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)), len, center: tip.clone().addScaledVector(Y, L.s * M * 0.5), Y }
})
/** 第 0 片叶子（叶室夹的就是它）叶面中心的位置和朝向（画面单位，相对盆底正中） */
export const LEAF0: V3 = LEAF_AT[0].center.toArray() as V3
export const LEAF0_Q = LEAF_AT[0].lq
/** 一盆菠菜，原点在盆底正中 */
export function Pot() {
  const pot = useMemo(potGeo, [])
  return <group>
    <mesh geometry={pot} castShadow receiveShadow><meshStandardMaterial color="#b5613c" roughness={0.8} /></mesh>
    <mesh position-y={0.112 * M} rotation-x={-Math.PI / 2}><circleGeometry args={[0.069 * M, 40]} /><meshStandardMaterial color="#3a2a1c" roughness={1} /></mesh>
    <mesh position-y={0.002 * M} receiveShadow><cylinderGeometry args={[0.082 * M, 0.086 * M, 0.012 * M, 40]} /><meshStandardMaterial color="#a9583a" roughness={0.8} /></mesh>
    {LEAVES.map((L, i) => { const A = LEAF_AT[i]; return <group key={i}>
      <mesh position={A.mid} quaternion={A.sq}><cylinderGeometry args={[0.0022 * M, 0.003 * M, A.len, 8]} /><meshStandardMaterial color="#7da552" roughness={0.7} /></mesh>
      <mesh geometry={leafGeo(i % 3)} position={A.tip} quaternion={A.lq} scale={L.s * M} castShadow><meshStandardMaterial vertexColors roughness={0.55} side={THREE.DoubleSide} /></mesh>
    </group> })}
  </group>
}
/** 叶室：夹住一片叶子的透明小盒，上下两半，带一个夹柄和两根气管接头。原点在叶室中心 */
export function LeafChamber() {
  const half = (s: number) => <group key={s} position-y={s * 0.0095 * M}>
    {/* 一半：透明的小盒，四边一圈铝框 */}
    <RoundedBox args={[0.076 * M, 0.014 * M, 0.054 * M]} radius={0.012} renderOrder={7}><meshPhysicalMaterial color="#e2f6fa" emissive="#9fd0da" emissiveIntensity={0.25} transparent opacity={0.2} roughness={0.03} clearcoat={1} envMapIntensity={3} depthWrite={false} /></RoundedBox>
    {[-1, 1].flatMap(k => [
      <mesh key={`a${k}`} position={[0, s * 0.005 * M, k * 0.027 * M]} castShadow><boxGeometry args={[0.08 * M, 0.004 * M, 0.004 * M]} /><Metal kind="aluminum" grain="brushed" /></mesh>,
      <mesh key={`b${k}`} position={[k * 0.038 * M, s * 0.005 * M, 0]} castShadow><boxGeometry args={[0.004 * M, 0.004 * M, 0.058 * M]} /><Metal kind="aluminum" grain="brushed" /></mesh>,
    ])}
    {/* 贴着叶片的一圈黑色密封垫 */}
    {[-1, 1].flatMap(k => [
      <mesh key={`c${k}`} position={[0, -s * 0.0075 * M, k * 0.027 * M]}><boxGeometry args={[0.08 * M, 0.002 * M, 0.004 * M]} /><meshStandardMaterial color="#2a2d30" roughness={0.9} /></mesh>,
      <mesh key={`d${k}`} position={[k * 0.038 * M, -s * 0.0075 * M, 0]}><boxGeometry args={[0.004 * M, 0.002 * M, 0.058 * M]} /><meshStandardMaterial color="#2a2d30" roughness={0.9} /></mesh>,
    ])}
  </group>
  return <group>
    {half(1)}{half(-1)}
    {/* 夹子：两片弹簧钢片从一侧把上下两半夹紧，后面一个转轴 */}
    {[-1, 1].map(s => <mesh key={s} position={[0.062 * M, s * 0.013 * M, 0]} rotation-z={-s * 0.22} castShadow><boxGeometry args={[0.05 * M, 0.003 * M, 0.02 * M]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    <mesh position={[0.086 * M, 0, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.024 * M, 16]} /><Metal kind="steel" grain="turned" /></mesh>
    {/* 进气、出气两个接头，在上半的顶上 */}
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.02 * M, 0.022 * M, 0]}><cylinderGeometry args={[0.0035 * M, 0.0035 * M, 0.014 * M, 10]} /><Metal kind="brass" grain="turned" /></mesh>)}
  </group>
}
/** 铁架台：底座、立杆，上面伸出一根横杆。原点在底座底面正中，横杆伸向 +x，高 h、长 len（m） */
export function Stand({ h = 0.3, len = 0.12, rodH = 0.42 }: { h?: number; len?: number; rodH?: number }) {
  return <group>
    <RoundedBox args={[0.12 * M, 0.012 * M, 0.16 * M]} radius={0.02} position-y={0.006 * M} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0, rodH * M / 2, -0.05 * M]} castShadow><cylinderGeometry args={[0.005 * M, 0.005 * M, rodH * M, 16]} /><Metal kind="stainless" grain="turned" /></mesh>
    <mesh position={[len * M / 2, h * M, -0.05 * M]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.004 * M, 0.004 * M, (len + 0.02) * M, 12]} /><Metal kind="stainless" grain="turned" /></mesh>
    <RoundedBox args={[0.024 * M, 0.03 * M, 0.024 * M]} radius={0.01} position={[0, h * M, -0.05 * M]} castShadow><Metal kind="zinc" grain="cast" /></RoundedBox>
  </group>
}
/** 补光灯：一块方的灯板，朝下照。level 亮度（0–1），color 光的颜色。原点在灯板中心 */
export function LampHead({ level, color = '#fff3cf' }: { level: number; color?: string }) {
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(0.12 + 0.88 * level), [color, level])
  return <group>
    <RoundedBox args={[0.11 * M, 0.02 * M, 0.09 * M]} radius={0.02} castShadow><meshStandardMaterial color="#d9dcdd" roughness={0.4} metalness={0.6} /></RoundedBox>
    <mesh position-y={-0.0105 * M} rotation-x={Math.PI / 2}><planeGeometry args={[0.095 * M, 0.075 * M]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
    {[-0.03, -0.01, 0.01, 0.03].map(x => <mesh key={x} position={[x * M, 0.013 * M, 0]}><boxGeometry args={[0.006 * M, 0.008 * M, 0.08 * M]} /><meshStandardMaterial color="#b9bdbf" roughness={0.5} metalness={0.6} /></mesh>)}
    {/* 照下来的光：黄色的一束，越亮越明显 */}
    {level > 0.02 && <mesh position-y={-0.075 * M} renderOrder={9}><cylinderGeometry args={[0.04 * M, 0.07 * M, 0.13 * M, 24, 1, true]} /><meshBasicMaterial color={color === '#fff3cf' ? '#ffd83a' : color} transparent opacity={0.05 + 0.2 * level} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} /></mesh>}
  </group>
}
/** 小钢瓶：二氧化碳，灰色瓶身，顶上一只减压阀和压力表。原点在瓶底正中 */
export function Cylinder() {
  const g = useMemo(() => lathe(m([[0, 0], [0.036, 0], [0.04, 0.004], [0.04, 0.2], [0.036, 0.225], [0.022, 0.245], [0.014, 0.25], [0.014, 0.265], [0, 0.265]]), { segs: 40 }), [])
  return <group>
    <mesh geometry={g} castShadow><meshStandardMaterial color="#8d949a" roughness={0.42} metalness={0.7} /></mesh>
    <mesh position-y={0.12 * M}><cylinderGeometry args={[0.0405 * M, 0.0405 * M, 0.05 * M, 40, 1, true]} /><meshStandardMaterial color="#20262b" roughness={0.6} /></mesh>
    <mesh position-y={0.28 * M} castShadow><boxGeometry args={[0.024 * M, 0.03 * M, 0.024 * M]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0.03 * M, 0.285 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.018 * M, 0.018 * M, 0.012 * M, 28]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0.0365 * M, 0.285 * M, 0]} rotation-y={Math.PI / 2}><circleGeometry args={[0.0155 * M, 28]} /><meshStandardMaterial color="#f3f3ee" roughness={0.6} /></mesh>
    <mesh position={[0, 0.305 * M, 0]}><cylinderGeometry args={[0.012 * M, 0.012 * M, 0.012 * M, 12]} /><meshStandardMaterial color="#1f2326" roughness={0.6} /></mesh>
  </group>
}
/** 一段软管：沿几个点弯过去 */
export function Hose({ pts, r = 0.003 * M, color = '#d8dcd9' }: { pts: V3[]; r?: number; color?: string }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, r, 8), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.85} /></mesh>
}
/** 光合仪：一只带两块读数屏的仪器盒。a、b 是两块屏上的字。原点在底面正中，屏朝 +z */
export function Analyzer({ a, b }: { a: string; b: string }) {
  return <group>
    <RoundedBox args={[0.2 * M, 0.11 * M, 0.13 * M]} radius={0.03} position-y={0.063 * M} castShadow receiveShadow><meshStandardMaterial color="#e3e5e2" roughness={0.5} /></RoundedBox>
    <mesh position={[0, 0.063 * M, 0.0655 * M]}><planeGeometry args={[0.185 * M, 0.095 * M]} /><meshStandardMaterial color="#2a2f34" roughness={0.4} /></mesh>
    <Led text={a} w={0.075 * M} h={0.032 * M} position={[-0.045 * M, 0.08 * M, 0.066 * M]} />
    <Led text={b} w={0.075 * M} h={0.032 * M} position={[0.045 * M, 0.08 * M, 0.066 * M]} />
    {[-0.06, -0.03, 0.03, 0.06].map(x => <mesh key={x} position={[x * M, 0.036 * M, 0.068 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008 * M, 0.008 * M, 0.006 * M, 20]} /><meshStandardMaterial color={x < 0 ? '#3b4046' : '#5a6068'} roughness={0.4} metalness={0.3} /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.08 * M, 0.004 * M, 0]}><boxGeometry args={[0.02 * M, 0.008 * M, 0.11 * M]} /><meshStandardMaterial color="#1c1f22" roughness={0.8} /></mesh>)}
  </group>
}
