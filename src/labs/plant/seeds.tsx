// 植物的一生 · 第 1 课的器材：工作台上两只表面皿，一粒菜豆种子（剥去种皮、掰开两片子叶，露出胚）、一粒玉米种子（纵向切开，剖面上滴碘液）。
// 旁边是解剖刀、镊子、放大镜、碘液滴瓶。种子比器材放大得多，为的是看清内部（见规格卡“画面上的约定”）。
import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, shell } from '@/lab-kit'
import type { PartKey } from './physics'
import { Flesh, Glass, ease, leafGeo, lerp, mixHex, rng, seg, tint, tube, type V3 } from './parts'
import { AT, BENCH } from './world'

/** 这一课的原点：工作台台面上的一点 */
export const S0: V3 = [AT.seed.x, BENCH.h, AT.seed.z]
/** 两只表面皿在台面上的位置（相对 S0） */
export const BEAN_X = -2.1, CORN_X = 2.5, DISH_Z = 0.2
const YP = 0.5                      // 菜豆两片子叶合拢时，中间那道缝的高度
const HINGE = 0.5                   // 掰开时绕着转的那条边（种脐一侧）
const GLOW = '#ffc640'

/** 把一个模型的每个顶点挪一下，再重算法线 */
function deform(g: THREE.BufferGeometry, f: (x: number, y: number, z: number) => V3) {
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) p.setXYZ(i, ...f(p.getX(i), p.getY(i), p.getZ(i)))
  g.computeVertexNormals()
  return g
}
// ---------- 菜豆 ----------
/** 半粒菜豆（一片子叶，或半张种皮）：肾形，一侧凹进去的地方是种脐。flat：要不要封上平的那一面 */
export function kidney(flat: boolean, s: 1 | -1, c0: string, c1: string, grow = 1) {
  // 肾形：整体往一侧弯，弯进去的那一侧正中再凹下去一块（种脐所在的缺口）
  const f = (x: number, y: number, z: number): V3 => [x * grow, y * 0.37 * grow, (z * 0.58 + s * (0.3 * x * x - 0.1) - s * 0.26 * Math.exp(-(x * x) / 0.09) * Math.max(0, s * z)) * grow]
  const dome = tint(deform(new THREE.SphereGeometry(1, 44, 14, 0, Math.PI * 2, 0, Math.PI / 2), f), c0, c1)
  const cap = flat ? tint(deform(new THREE.CircleGeometry(1, 44).rotateX(Math.PI / 2), f), c1) : null
  if (s < 0) { dome.rotateX(Math.PI); cap?.rotateX(Math.PI) }
  return { dome, cap }
}
export function makeCoat() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(21)
  g.fillStyle = '#7c2f26'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.55 ? '52,14,14' : '196,150,120'},${0.16 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * S, r() * S, 2 + r() * 12, 1 + r() * 4, r() * 3, 0, 6.3); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1)
  return t
}
/** 菜豆种子各部分在台面上的位置（相对 S0），给标签用 */
export const beanAnchor = (k: PartKey, opened: boolean): V3 => {
  const x = BEAN_X, z = DISH_Z
  if (!opened) return [x, YP + 0.55, z]
  return k === 'coat' ? [x + 1.25, 0.75, z - 1.25] : k === 'cotyledon' ? [x + 0.45, YP + 0.2, z + HINGE + 0.75] : k === 'plumule' ? [x + 0.38, YP + 0.2, z + 0.12] : k === 'hypocotyl' ? [x + 0.02, YP + 0.2, z + 0.3] : [x - 0.42, YP + 0.2, z + 0.32]
}
function Bean({ open, sel }: { open: number; sel: PartKey | null }) {
  const g = useMemo(() => {
    const a = kidney(true, -1, '#e6d7a8', '#f1e6c2'), b = kidney(true, 1, '#e6d7a8', '#f1e6c2')
    const ca = kidney(false, -1, '#ffffff', '#ffffff', 1.035), cb = kidney(false, 1, '#ffffff', '#ffffff', 1.035)
    return {
      a, b, ca: ca.dome, cb: cb.dome,
      radicle: tube([[-0.08, 0, 0.3], [-0.36, 0.01, 0.34], [-0.66, 0, 0.3]], 0.085, 0.03, '#efe2b8', '#f8f1dc', 10, 10, 0.8),
      hypo: tube([[-0.1, 0, 0.3], [0.03, 0.005, 0.28], [0.15, 0, 0.25]], 0.09, 0.085, '#e2d29a', '#e2d29a', 10, 6, 0.3),
      leaf: leafGeo({ len: 0.5, wid: 0.3, basePow: 0.75, tipPow: 0.9, curl: -0.05, fold: 0.35, wave: 0.1, base: '#d9cf7a', tip: '#c2c765', back: '#cfc67a', nu: 8, nv: 2 }),
    }
  }, [])
  const coat = useMemo(makeCoat, [])
  useEffect(() => () => { coat.dispose() }, [coat])
  const lift = seg(open, 0, 0.42), flip = seg(open, 0.36, 1), on = (k: PartKey) => (sel === k ? 0.55 : 0)
  // 上半张种皮：掀起来，放到表面皿的另一边，里面朝上
  const coatAt: V3 = [lerp(0, 1.25, lift), YP + Math.sin(lift * Math.PI) * 1.3 + lerp(0, -0.12, lift), lerp(0, -1.25, lift)]
  const coatMat = <meshPhysicalMaterial map={coat} roughness={0.28} clearcoat={0.6} clearcoatRoughness={0.25} side={THREE.DoubleSide} emissive={GLOW} emissiveIntensity={on('coat') * 0.5} />
  return (
    <group position={[BEAN_X, 0.08, DISH_Z]}>
      {/* 下半张种皮还垫在下面；下面那片子叶平的一面朝上，胚长在它上面 */}
      <mesh geometry={g.ca} position={[0, YP, 0]} castShadow>{coatMat}</mesh>
      <group position={[0, YP, 0]}>
        <mesh geometry={g.a.dome} castShadow><Flesh rough={0.55} emissive={GLOW} glow={on('cotyledon')} /></mesh>
        <mesh geometry={g.a.cap!}><Flesh rough={0.6} emissive={GLOW} glow={on('cotyledon')} double /></mesh>
        <group position={[0, 0.045, 0]}>
          <mesh geometry={g.radicle} castShadow><Flesh rough={0.5} emissive={GLOW} glow={on('radicle')} /></mesh>
          <mesh geometry={g.hypo} castShadow><Flesh rough={0.5} emissive={GLOW} glow={on('hypocotyl')} /></mesh>
          {[-1, 1].map(s => <mesh key={s} geometry={g.leaf} position={[0.13, 0.03, 0.25]} rotation={[-0.12, Math.PI / 2 + 0.38 + s * 0.2, s * 0.5, 'YXZ']} castShadow><meshStandardMaterial vertexColors roughness={0.6} emissive={GLOW} emissiveIntensity={on('plumule')} /></mesh>)}
        </group>
      </group>
      {/* 上面那片子叶：绕着种脐那条边翻过去，平的一面朝上 */}
      <group position={[0, YP, HINGE]} rotation-x={Math.PI * flip}>
        <group position={[0, 0, -HINGE]}>
          <mesh geometry={g.b.dome} castShadow><Flesh rough={0.55} emissive={GLOW} glow={on('cotyledon')} /></mesh>
          <mesh geometry={g.b.cap!}><Flesh rough={0.6} emissive={GLOW} glow={on('cotyledon')} double /></mesh>
        </group>
      </group>
      <mesh geometry={g.cb} position={coatAt} rotation={[Math.PI * lift, 0.5 * lift, 0]} castShadow>{coatMat}</mesh>
      {/* 种脐：凹进去那一侧的一小条白色 */}
      <mesh position={[0, YP, 0.515 - lift * 0.02]} scale={[0.2, 0.06, 0.03]} visible={open < 0.05}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#efe6d2" roughness={0.6} /></mesh>
    </group>
  )
}

// ---------- 玉米 ----------
const KS = 1.6                       // 玉米粒比菜豆再放大一些，剖面才看得清
const boxy = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 0.75)
/** 玉米粒的外形：下端（−z）是尖的，上端宽而平 */
const kernelPt = (x: number, y: number, z: number): V3 => { const bz = boxy(z), sz = (bz + 1) / 2; return [boxy(x) * 0.55 * (0.5 + 0.5 * Math.pow(sz, 0.7)), boxy(y) * 0.36 * (0.72 + 0.28 * sz), bz * 0.75] }
const faceUV = (y: number, z: number): [number, number] => [(z + 0.75) / 1.5, (y + 0.36) / 0.72]
function kernelHalf() {
  const dome = deform(new THREE.SphereGeometry(1, 30, 22, Math.PI / 2, Math.PI), kernelPt)
  const p = dome.attributes.position, c = new THREE.Color(), a = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) { const k = (p.getZ(i) + 0.75) / 1.5; c.set('#efe0b0').lerp(new THREE.Color('#dc9e2c'), Math.min(1, k * 2.2)).lerp(new THREE.Color('#f1cc62'), Math.max(0, k - 0.6) * 1.6); a.set([c.r, c.g, c.b], i * 3) }
  dome.setAttribute('color', new THREE.BufferAttribute(a, 3))
  const N = 56, pos: number[] = [0, 0, 0], uv: number[] = [...faceUV(0, 0)], idx: number[] = []
  for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2, q = kernelPt(0, Math.cos(t), Math.sin(t)); pos.push(...q); uv.push(...faceUV(q[1], q[2])); if (i) idx.push(0, i, i + 1) }
  const cap = new THREE.BufferGeometry(); cap.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cap.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cap.setIndex(idx); cap.computeVertexNormals()
  return { dome, cap }
}
/** 玉米剖面上各部分的位置（剖面自己的坐标：u 从尖端到顶端，v 是厚度方向） */
const CORN_UV: Record<PartKey, [number, number]> = { coat: [0.96, 0.5], endosperm: [0.72, 0.6], cotyledon: [0.4, 0.5], plumule: [0.5, 0.27], hypocotyl: [0.36, 0.26], radicle: [0.2, 0.27] }
/** 画玉米的剖面：一圈果皮和种皮，大半是胚乳，靠一侧是胚（子叶包着胚芽、胚轴、胚根）。sel 那一部分描亮；blue 是碘液把胚乳染蓝了多少 */
function drawFace(g: CanvasRenderingContext2D, W: number, H: number, sel: PartKey | null, blue: number) {
  const P = (u: number, v: number): [number, number] => [u * W, (1 - v) * H]
  const outline = (k: number) => { g.beginPath(); for (let i = 0; i <= 80; i++) { const t = i / 80 * Math.PI * 2, q = kernelPt(0, Math.cos(t), Math.sin(t)), [u, v] = faceUV(q[1], q[2]); const [x, y] = P(0.5 + (u - 0.5) * k, 0.5 + (v - 0.5) * k); if (i) g.lineTo(x, y); else g.moveTo(x, y) } g.closePath() }
  const oval = (u: number, v: number, ru: number, rv: number, tip = 0) => { g.beginPath(); const [x, y] = P(u, v); g.ellipse(x + tip * ru * W * 0.15, y, ru * W, rv * H, 0, 0, Math.PI * 2); g.closePath() }
  const hi = '#35e0c8'
  g.clearRect(0, 0, W, H)
  g.fillStyle = sel === 'coat' ? '#ffb53a' : '#b9791f'; g.fillRect(0, 0, W, H)
  g.save(); outline(0.93); g.clip()
  g.fillStyle = mixHex('#f4e4a2', '#3d427f', blue); g.fillRect(0, 0, W, H)
  const r = rng(3); for (let i = 0; i < 900; i++) { g.fillStyle = blue > 0.5 ? `rgba(20,22,70,${r() * 0.25 * blue})` : `rgba(255,255,240,${r() * 0.22})`; g.fillRect(r() * W, r() * H, 3, 3) }
  if (sel === 'endosperm') { g.fillStyle = 'rgba(255,214,90,0.3)'; g.fillRect(0, 0, W, H) }
  // 子叶（盾片）：贴着胚乳的一大片
  oval(0.36, 0.3, 0.3, 0.27); g.fillStyle = sel === 'cotyledon' ? '#fff0a8' : '#efe3b4'; g.fill(); g.lineWidth = sel === 'cotyledon' ? 5 : 2; g.strokeStyle = sel === 'cotyledon' ? hi : 'rgba(120,90,40,0.7)'; g.stroke()
  const part = (k: PartKey, u: number, v: number, ru: number, rv: number, c: string) => { oval(u, v, ru, rv); g.fillStyle = sel === k ? '#fff6c8' : c; g.fill(); g.lineWidth = sel === k ? 5 : 1.6; g.strokeStyle = sel === k ? hi : 'rgba(110,84,40,0.75)'; g.stroke() }
  part('radicle', 0.2, 0.27, 0.095, 0.085, '#f7f0da'); part('hypocotyl', 0.345, 0.26, 0.052, 0.1, '#e3d08e'); part('plumule', 0.49, 0.27, 0.095, 0.105, '#cfcf74')
  g.strokeStyle = 'rgba(110,100,40,0.6)'; g.lineWidth = 1.5; for (const dv of [-0.05, 0, 0.05]) { g.beginPath(); g.moveTo(...P(0.41, 0.27 + dv * 0.6)); g.lineTo(...P(0.575, 0.27 + dv * 0.2)); g.stroke() }   // 胚芽里卷着的幼叶
  g.restore()
  outline(0.93); g.lineWidth = 2; g.strokeStyle = 'rgba(90,60,20,0.8)'; g.stroke()
}
/** 玉米各部分在台面上的位置（相对 S0），给标签用。切开以后指着剖面，没切开时指着整粒 */
export const cornAnchor = (k: PartKey, cut: boolean): V3 => {
  if (!cut) return [CORN_X, 1.4, DISH_Z]
  const [u, v] = CORN_UV[k], T = 0.62
  return [CORN_X + (u - 0.5) * 1.5 * KS, 0.3 + v * 0.72 * KS * Math.cos(T) + 0.1, DISH_Z - 0.35 - v * 0.72 * KS * Math.sin(T) + 0.3]
}
function Corn({ cut, drop, sel }: { cut: number; drop: number; sel: PartKey | null }) {
  const g = useMemo(kernelHalf, [])
  const { tex, ctx } = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, ctx: c.getContext('2d')! } }, [])
  const blue = Math.round(seg(drop, 0.45, 1) * 24) / 24
  useEffect(() => { drawFace(ctx, 512, 256, sel, blue); tex.needsUpdate = true }, [ctx, tex, sel, blue])
  useEffect(() => () => tex.dispose(), [tex])
  const split = seg(cut, 0.5, 0.78), tilt = seg(cut, 0.68, 1)
  const skin = <meshPhysicalMaterial vertexColors roughness={0.32} clearcoat={0.5} clearcoatRoughness={0.3} emissive={GLOW} emissiveIntensity={sel === 'coat' && cut >= 1 ? 0.3 : 0} />
  return (
    <group position={[CORN_X, 0.08, DISH_Z]} rotation-y={Math.PI / 2} scale={KS}>
      {/* 靠里的半粒：剖面朝镜头，往后仰一点 */}
      <group position={[lerp(0, 0.22, split), 0.36 + tilt * 0.02, 0]} rotation-z={-0.62 * tilt}>
        <mesh geometry={g.dome} castShadow>{skin}</mesh>
        <mesh geometry={g.cap} position={[-0.002, 0, 0]}><meshStandardMaterial map={tex} roughness={0.75} side={THREE.DoubleSide} /></mesh>
      </group>
      {/* 靠外的半粒：切下来以后倒在一边，剖面朝下 */}
      <group position={[lerp(0, -1.05, split), lerp(0.36, 0.01, tilt), lerp(0, 0.25, split)]} rotation-z={(Math.PI / 2) * tilt} scale-x={-1}>
        <mesh geometry={g.dome} castShadow>{skin}</mesh>
        <mesh geometry={g.cap} position={[-0.002, 0, 0]}><meshStandardMaterial map={tex} roughness={0.75} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  )
}

// ---------- 器材 ----------
const DISH = shell([[0, 0], [2.2, 0], [2.42, 0.1], [2.5, 0.42]], 0.07, { segs: 64 })
const BOTTLE = lathe([[0, 0], [0.62, 0], [0.7, 0.08], [0.7, 1.35], [0.62, 1.6], [0.3, 1.78], [0.3, 2.1], [0.36, 2.1], [0.36, 2.22], [0, 2.22]], { segs: 40 })
const BULB = lathe([[0, 0], [0.32, 0], [0.34, 0.12], [0.22, 0.22], [0.2, 0.5], [0.27, 0.72], [0.24, 1.0], [0.12, 1.14], [0, 1.16]], { segs: 28, crease: 50 })
const BLADE = (() => { const s = new THREE.Shape(); s.moveTo(0, 0.2); s.lineTo(1.0, 0.2); s.quadraticCurveTo(1.7, 0.16, 1.95, -0.16); s.quadraticCurveTo(1.3, -0.28, 0, -0.2); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 }).translate(0, 0, -0.015) })()
/** 解剖刀：刀尖朝 +x，刀刃朝下 */
function Scalpel() {
  return <group>
    <mesh geometry={BLADE} castShadow><Metal kind="stainless" grain="brushed" rough={0.16} /></mesh>
    <RoundedBox args={[0.7, 0.3, 0.12]} radius={0.04} position={[-0.3, 0, 0]} castShadow><Metal kind="steel" grain="brushed" /></RoundedBox>
    <RoundedBox args={[4.2, 0.36, 0.14]} radius={0.06} position={[-2.7, 0, 0]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
    {[-1.4, -1.7, -2.0, -2.3, -2.6].map(x => <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[0.07, 0.37, 0.15]} /><Metal kind="steel" rough={0.5} /></mesh>)}
  </group>
}
function Tweezers() {
  return <group>
    {[-1, 1].map(s => <group key={s} rotation-y={s * 0.055}><RoundedBox args={[4.6, 0.07, 0.3]} radius={0.03} position={[2.3, 0.05, 0]} scale={[1, 1, 1]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox><mesh position={[4.9, 0.05, 0]} rotation-z={-Math.PI / 2} scale={[1, 1, 0.25]}><coneGeometry args={[0.15, 0.7, 10]} /><Metal kind="stainless" grain="brushed" /></mesh></group>)}
    <mesh position={[0.05, 0.05, 0]}><cylinderGeometry args={[0.16, 0.16, 0.09, 16]} /><Metal kind="steel" /></mesh>
  </group>
}
function Magnifier() {
  return <group>
    <mesh rotation-x={Math.PI / 2} position={[0, 0.16, 0]} castShadow><torusGeometry args={[1.25, 0.11, 12, 48]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, 0.16, 0]} scale={[1, 0.1, 1]}><sphereGeometry args={[1.2, 32, 12]} /><Glass opacity={0.2} /></mesh>
    <mesh position={[2.55, 0.16, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.16, 2.4, 16]} /><meshPhysicalMaterial color="#1c1e21" roughness={0.35} clearcoat={0.6} /></mesh>
    <mesh position={[1.36, 0.16, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.13, 0.13, 0.2, 14]} /><Metal kind="chrome" /></mesh>
  </group>
}

/** 第 1 课的全部器材。open、cut、drop 是三个动作各做到哪了（0–1） */
export function SeedBench({ open, cut, drop, sel, seed }: { open: number; cut: number; drop: number; sel: PartKey | null; seed: 'bean' | 'corn' }) {
  const stem = useMemo(() => tint(new THREE.CylinderGeometry(0.07, 0.035, 1.5, 12), '#ffffff'), [])
  // 解剖刀：平时躺在台上；切的时候举到玉米粒上方，压下去，再放回来
  const up = seg(cut, 0, 0.3) - seg(cut, 0.72, 1), press = seg(cut, 0.3, 0.5) - seg(cut, 0.5, 0.66)
  const knife: V3 = [lerp(4.4, CORN_X + 0.2, up), lerp(0.2, 2.2 - press * 1.15, up), lerp(2.6, DISH_Z, up)]
  // 滴管：平时插在滴瓶里；滴的时候移到剖面上方
  const go = seg(drop, 0, 0.3) - seg(drop, 0.55, 0.85), face = cornAnchor('endosperm', true)
  const pip: V3 = [lerp(5.6, face[0], go), lerp(1.3, face[1] + 1.2, go) + Math.sin(Math.min(1, go * 2) * Math.PI / 2) * 1.2 * (go > 0 && go < 1 ? 1 : 0), lerp(-1.6, face[2], go)]
  const fall = seg(drop, 0.3, 0.44)
  return (
    <group position={S0}>
      {[BEAN_X, CORN_X].map(x => <mesh key={x} geometry={DISH} position={[x, 0.005, DISH_Z]} renderOrder={4}><Glass opacity={0.2} color="#b9d3d6" /></mesh>)}
      <Bean open={open} sel={seed === 'bean' ? sel : null} />
      <Corn cut={cut} drop={drop} sel={seed === 'corn' ? sel : null} />
      <group position={knife} rotation={[lerp(Math.PI / 2, 0, ease(up * 1.6)), lerp(-0.5, 0, up), lerp(0, -0.12, up) - press * 0.1]}><Scalpel /></group>
      <group position={[-7.4, 0.02, 0.9]} rotation-y={1.15}><Tweezers /></group>
      <group position={[-4.6, 0.02, -2.2]} rotation-y={0.5}><Magnifier /></group>
      {/* 碘液滴瓶：棕色玻璃，橡胶头的滴管 */}
      <group position={[5.6, 0, -1.6]}>
        <mesh geometry={BOTTLE} castShadow renderOrder={3}><meshPhysicalMaterial color="#5a2c0c" transparent opacity={0.82} roughness={0.12} clearcoat={1} envMapIntensity={0.8} /></mesh>
        <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.6, 0.6, 1.1, 32]} /><meshStandardMaterial color="#3a1708" roughness={0.3} /></mesh>
      </group>
      <group position={pip}>
        <mesh geometry={BULB} position={[0, 0.9, 0]} castShadow><meshStandardMaterial color="#16181a" roughness={0.55} /></mesh>
        <mesh geometry={stem} position={[0, 0.2, 0]} renderOrder={4}><Glass opacity={0.3} color="#c9d9dc" /></mesh>
        <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.05, 0.03, 0.8, 10]} /><meshStandardMaterial color="#6a3410" roughness={0.3} /></mesh>
      </group>
      {/* 落下去的那一滴碘液 */}
      {fall > 0 && fall < 1 && <mesh position={[face[0], lerp(face[1] + 0.65, face[1], fall * fall), face[2]]} scale={[1, 1.3, 1]}><sphereGeometry args={[0.09, 12, 10]} /><meshPhysicalMaterial color="#7a3c10" roughness={0.1} transparent opacity={0.9} /></mesh>}
    </group>
  )
}
