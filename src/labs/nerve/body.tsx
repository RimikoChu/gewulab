// 展馆正中那个半透明的人：身体轮廓像一层玻璃，里面亮着他的神经系统——头里的脑、背里的脊髓、从脊髓两侧分出的 31 对脊神经、
// 从脑分出的 12 对脑神经，一直伸到手指尖和脚尖。坐标是世界的：1 个单位 = 10 cm，人坐在一张高凳上（凳面高 85 cm），人面朝 +z，x 正方向是他的左手边（画面右边）。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, lathe } from '@/lab-kit'
import { Brain, type TagKey } from './brain'
import { useJob } from './job'
import { ghostMat, nerveMat } from './mats'
import { curveOf, ellipsoid, fbm, roundCone, sminAll, surfaceNetsGen, type V3 } from './sdf'
import { Chatter, route, type Route } from './signal'

// ---------- 身体轮廓（坐在一张高凳上，小腿自然垂下） ----------
/** 左膝（画面右边那条腿）的转轴：第 4 课膝跳反射时，左小腿绕它往前弹 */
export const KNEE: V3 = [0.92, 8.9, 4.22]
/** 左肩的转轴：拓展课接球时左臂绕它抬起来 */
export const SHOULDER: V3 = [1.78, 14.36, -0.06]
const trunk = (x: number, y: number, z: number) => {
  const ax = Math.abs(x)
  return [
    ellipsoid(x, y, z, [0, 16.55, 0.05], [0.74, 0.98, 0.9]),
    ellipsoid(x, y, z, [0, 16.05, 0.5], [0.5, 0.55, 0.45]),
    roundCone(x, y, z, [0, 15.0, -0.05], [0, 15.9, 0], 0.5, 0.44),
    ellipsoid(x, y, z, [0, 13.35, -0.05], [1.62, 1.75, 1.0]),
    ellipsoid(x, y, z, [0, 11.1, 0.02], [1.3, 1.55, 0.86]),
    ellipsoid(x, y, z, [0, 9.55, 0], [1.55, 1.05, 0.92]),
    roundCone(ax, y, z, [0.2, 14.45, -0.1], [1.72, 14.38, -0.08], 0.5, 0.48),
  ]
}
const arm = (ax: number, y: number, z: number) => [
  roundCone(ax, y, z, [1.95, 14.3, -0.05], [2.62, 11.4, 0.02], 0.44, 0.35),
  roundCone(ax, y, z, [2.62, 11.4, 0.02], [3.0, 9.0, 0.22], 0.33, 0.24),
  ellipsoid(ax, y, z, [3.12, 8.25, 0.3], [0.2, 0.55, 0.36], 0.08),
]
const thigh = (ax: number, y: number, z: number) => [
  roundCone(ax, y, z, [0.85, 9.15, 0.1], [0.92, 8.95, 4.05], 0.72, 0.5),
  ellipsoid(ax, y, z, [0.92, 8.92, 4.25], [0.5, 0.52, 0.52]),
]
const shin = (ax: number, y: number, z: number) => [
  roundCone(ax, y, z, [0.93, 8.8, 4.2], [0.98, 4.95, 4.05], 0.45, 0.27),
  ellipsoid(ax, y, z, [0.95, 7.45, 3.82], [0.44, 1.25, 0.47]),
  ellipsoid(ax, y, z, [0.99, 4.6, 4.55], [0.34, 0.3, 1.0]),
]
const skinNoise = (x: number, y: number, z: number) => 0.012 * fbm(x * 2, y * 2, z * 2, 2)
/** 身体主体：去掉左臂和左小腿（都在 x > 0 一侧），它们各自单独做，好转动 */
function mainSdf(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  const parts = [...trunk(x, y, z), ...thigh(ax, y, z)]
  if (x < 0) parts.push(...arm(ax, y, z), ...shin(ax, y, z))
  return sminAll(parts, 0.32) + skinNoise(x, y, z)
}
const shinSdf = (x: number, y: number, z: number) => sminAll(shin(x, y, z), 0.32) + skinNoise(x, y, z)
const armSdf = (x: number, y: number, z: number) => sminAll(arm(x, y, z), 0.28) + skinNoise(x, y, z)
function* bodyGen() {
  const main = yield* surfaceNetsGen(mainSdf, [[-3.8, 4.0, -1.4], [3.8, 17.7, 5.0]], 0.1)
  const shinG = yield* surfaceNetsGen(shinSdf, [[0.3, 4.0, 3.0], [1.6, 9.4, 5.8]], 0.08)
  const armG = yield* surfaceNetsGen(armSdf, [[1.3, 7.4, -0.8], [3.7, 14.9, 1.0]], 0.08)
  return { main, shin: shinG, arm: armG }
}

// ---------- 脑和脊髓在身体里的位置 ----------
export const BRAIN_IN = { at: [0, 16.68, 0.02] as V3, s: 0.085 }
/** 脑模型里的一点（cm）在世界里的位置 */
export const inHead = (p: V3): V3 => [BRAIN_IN.at[0] + p[0] * BRAIN_IN.s, BRAIN_IN.at[1] + p[1] * BRAIN_IN.s, BRAIN_IN.at[2] + p[2] * BRAIN_IN.s]
/** 脊髓：从脑干下端沿着背往下，到腰部 */
export const CORD: V3[] = [inHead([0, -7.6, -2.8]), [0, 15.2, -0.42], [0, 14.2, -0.62], [0, 12.8, -0.74], [0, 11.6, -0.66], [0, 10.5, -0.55]]
const cordCurve = curveOf(CORD, 0.5)
/** 脊髓上高度 y 处的点 */
export function cordAt(y: number): V3 {
  const t = Math.min(1, Math.max(0, (CORD[0][1] - y) / (CORD[0][1] - CORD.at(-1)![1])))
  const p = cordCurve.getPointAt(t); return [p.x, p.y, p.z]
}
export const EYE_AT = (s: number): V3 => [s * 0.27, 16.62, 0.84]
export const EAR_AT = (s: number): V3 => [s * 0.76, 16.5, 0.0]
export const GLAND_AT = (s: number): V3 => [s * 0.5, 16.02, 0.32]
export const TONGUE_AT: V3 = [0, 16.08, 0.62]

// ---------- 神经 ----------
// 左臂、右小腿上的神经用它们自己的坐标（和身体一样，只是跟着那一段转），画在各自的组里。
/** 上肢的神经：脊髓颈段 → 腋下 → 肩，然后沿手臂到手指（s = 1 左，−1 右） */
export const armRoot = (s: number): V3[] => [cordAt(14.75), [s * 0.5, 14.6, -0.5], [s * 1.1, 14.42, -0.25], [s * 1.78, 14.3, -0.04]]
export const armDown = (s: number): V3[] => [[s * 1.78, 14.3, -0.04], [s * 2.0, 14.05, 0.02], [s * 2.5, 11.6, 0.12], [s * 2.86, 9.8, 0.26], [s * 3.08, 8.75, 0.34]]
const finger = (s: number, k: number): V3[] => [[s * 3.08, 8.75, 0.34], [s * (3.04 + k * 0.06), 8.25, 0.24 + k * 0.08], [s * (3.02 + k * 0.08), 7.85, 0.18 + k * 0.1]]
/** 下肢后面的神经：腰骶部 → 大腿后面 → 膝后（大腿段） */
export const legBack = (s: number): V3[] => [cordAt(10.5), [s * 0.2, 9.7, -0.6], [s * 0.62, 9.0, -0.35], [s * 0.86, 8.7, 1.0], [s * 0.9, 8.66, 2.8], [s * 0.92, 8.62, 3.95]]
/** 小腿段（跟着小腿转） */
export const legShin = (s: number): V3[] => [[s * 0.92, 8.62, 3.95], [s * 0.95, 7.5, 3.86], [s * 0.97, 5.6, 3.92], [s * 0.98, 4.9, 4.1], [s * 0.99, 4.55, 4.95]]
/** 大腿前面的神经：腰段 → 大腿前面 → 膝盖下面的韧带（膝跳反射的那一条） */
export const legFront = (s: number): V3[] => [cordAt(10.9), [s * 0.3, 10.2, -0.3], [s * 0.66, 9.5, 0.4], [s * 0.86, 9.42, 2.0], [s * 0.9, 9.32, 3.5], [s * 0.93, 8.95, 4.58], [s * 0.93, 8.55, 4.6]]
/** 大腿前面的肌肉（伸小腿的那块） */
export const QUAD = { c: [0.88, 9.32, 2.3] as V3, r: [0.48, 0.32, 1.65] as V3 }
/** 31 对脊神经从脊髓两侧出来的高度：颈 8、胸 12、腰 5、骶 5、尾 1 */
const SPINAL_Y = Array.from({ length: 31 }, (_, i) => 15.75 - i * (15.75 - 9.35) / 30)
function spinal(y: number, s: number, i: number): V3[] {
  const c = cordAt(Math.max(10.5, y)), at: V3 = [c[0], y, c[2]]
  if (i < 8) return [at, [s * 0.32, y - 0.05, c[2] + 0.05], [s * 0.6, y - 0.18, -0.25]]
  if (i < 20) { const w = y > 12.3 ? 1.42 : 1.18, f = y > 12.3 ? 0.88 : 0.72; return [at, [s * 0.55, y - 0.04, -0.78], [s * w, y - 0.14, -0.1], [s * w * 0.72, y - 0.3, f * 0.85], [s * 0.22, y - 0.38, f]] }
  return [[0, y, c[2] + 0.02], [s * 0.3, y - 0.15, -0.6], [s * 0.6, y - 0.4, -0.25]]
}
/** 脑神经：从脑的下面出来，到眼、耳、面部、舌、颈（示意，只画出走向） */
function cranial(s: number): V3[][] {
  return [
    [inHead([s * 0.8, -1.4, 3.6]), [s * 0.22, 16.6, 0.5], EYE_AT(s)],
    [inHead([s * 1.2, -2.4, 1.2]), [s * 0.5, 16.45, 0.18], EAR_AT(s)],
    [inHead([s * 1.0, -3.0, -0.4]), [s * 0.45, 16.1, 0.25], GLAND_AT(s)],
    [inHead([s * 0.7, -3.4, -0.8]), [s * 0.2, 16.05, 0.4], TONGUE_AT],
    [inHead([s * 0.9, -2.2, 0.6]), [s * 0.55, 16.3, 0.5], [s * 0.45, 16.4, 0.82]],
    [inHead([s * 0.6, -4.0, -1.4]), [s * 0.35, 15.6, -0.1], [s * 0.6, 15.1, -0.1]],
  ]
}
/** 各组神经：main 画在身体上，arm 跟着左臂，shin 跟着右小腿 */
export const NERVES = (() => {
  const sp = SPINAL_Y.flatMap((y, i) => [spinal(y, 1, i), spinal(y, -1, i)])
  const cr = [...cranial(1), ...cranial(-1)]
  const main = [armRoot(1), armRoot(-1), armDown(-1), ...[0, 1, 2, 3].map(k => finger(-1, k)), legBack(1), legBack(-1), legShin(-1), legFront(1), legFront(-1), ...sp, ...cr]
  const arm = [armDown(1), ...[0, 1, 2, 3].map(k => finger(1, k))]
  const shin = [legShin(1)]
  return { main, arm, shin, spinal: sp, cranial: cr }
})()
/** 全身神经里一直有小光点跑的那几条（只用身体主体上的，转动的部分不跑） */
let CHAT: Route[] | null = null
export const chatPaths = () => (CHAT ??= [armRoot(1), armRoot(-1), armDown(-1), legBack(1), legBack(-1), legFront(1), ...NERVES.cranial.slice(0, 2), ...NERVES.spinal.filter((_, i) => i % 3 === 0)].map(p => route(p)))

const tube = (p: V3[], r: number) => new THREE.TubeGeometry(curveOf(p, 0.5), Math.max(10, p.length * 10), r, 7)
const rOf = (p: V3[]) => (p.length >= 5 && p[0][1] > 9 && Math.abs(p.at(-1)![0]) > 1.5 ? 0.032 : p.length >= 5 && p.at(-1)![1] < 9.5 && p[0][1] < 11.5 ? 0.036 : 0.014)
function nerveGeo() {
  return {
    main: mergeGeometries(NERVES.main.map(p => tube(p, rOf(p)))),
    arm: mergeGeometries([tube(NERVES.arm[0], 0.032), ...NERVES.arm.slice(1).map(p => tube(p, 0.012))]),
    shin: tube(NERVES.shin[0], 0.036),
    cord: new THREE.TubeGeometry(cordCurve, 80, 0.058, 12),
    cauda: mergeGeometries(Array.from({ length: 6 }, (_, i) => tube([CORD.at(-1)!, [((i % 3) - 1) * 0.04, 9.9, -0.6], [((i % 3) - 1) * 0.08 + (i < 3 ? 0.03 : -0.03), 9.35, -0.62]], 0.01))),
    eyes: new THREE.SphereGeometry(0.12, 24, 16),
    quad: new THREE.SphereGeometry(1, 32, 20),
  }
}
let NG: ReturnType<typeof nerveGeo> | null = null
export const nerveGeos = () => (NG ??= nerveGeo())

// ---------- 凳子 ----------
export const SEAT_Y = 8.5
function Stool() {
  const g = useMemo(() => ({ seat: lathe([[0, 0], [1.75, 0], [1.9, 0.06], [1.95, 0.16], [1.88, 0.24], [0, 0.26]], { segs: 72 }), ring: new THREE.TorusGeometry(1.5, 0.045, 12, 72) }), [])
  return <group>
    <mesh geometry={g.seat} position={[0, SEAT_Y - 0.26, 0.4]} castShadow receiveShadow><meshPhysicalMaterial color="#2a2f35" roughness={0.6} sheen={0.4} sheenColor="#6a7480" /></mesh>
    <mesh position={[0, SEAT_Y - 0.33, 0.4]} castShadow><cylinderGeometry args={[0.9, 0.9, 0.1, 48]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    {[0, 1, 2, 3].map(i => { const a = Math.PI / 4 + i * Math.PI / 2, top = new THREE.Vector3(Math.cos(a) * 0.75, SEAT_Y - 0.36, 0.4 + Math.sin(a) * 0.75), bot = new THREE.Vector3(Math.cos(a) * 1.55, 0.12, 0.4 + Math.sin(a) * 1.55), mid = top.clone().add(bot).multiplyScalar(0.5), d = bot.clone().sub(top)
      return <mesh key={i} position={mid} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())} castShadow><cylinderGeometry args={[0.055, 0.055, d.length(), 16]} /><Metal kind="chrome" /></mesh> })}
    <mesh geometry={g.ring} position={[0, 3.0, 0.4]} rotation-x={Math.PI / 2}><Metal kind="chrome" /></mesh>
  </group>
}

// ---------- 画出来 ----------
export interface BodyLook {
  shell?: number
  /** 脑、脊髓、神经各自亮多少：0 平常，1 高亮 */
  hi?: { brain?: number; cord?: number; nerves?: number }
  /** 按中枢、周围两种颜色上色 */
  split?: boolean
  /** 脑里亮哪一区 */
  brainHi?: Partial<Record<TagKey, number>>
  /** 神经里一直跑的小光点 */
  chatter?: boolean
  /** 神经整体亮多少（看别的路线时把神经压暗），1 平常 */
  nerves?: number
  /** 左小腿往前弹的角度（弧度）、大腿前面的肌肉收缩多少（0–1） */
  kick?: number; quad?: number
  /** 左臂往前抬的角度（弧度） */
  raise?: number
}
const CEN = new THREE.Color('#8ff3ff'), PER = new THREE.Color('#ffc35a')
export function Body({ look, children, arm, shin }: { look: BodyLook; children?: ReactNode; arm?: ReactNode; shin?: ReactNode }) {
  const geo = useJob('body', bodyGen)
  const G = nerveGeos()
  const shell = useMemo(() => ghostMat('#8fd3ff', 0.025, 0.5), [])
  const m = useMemo(() => ({ nerves: nerveMat(0.4), cord: nerveMat(0.4), eye: new THREE.MeshPhysicalMaterial({ color: '#f4f1ec', roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.55 }), quad: new THREE.MeshPhysicalMaterial({ color: '#c8505a', emissive: '#ff5a5a', emissiveIntensity: 0, transparent: true, opacity: 0.0, depthWrite: false }) }), [])
  const cur = useRef({ shell: 1, b: 0, c: 0, n: 0, split: 0, nv: 1, kick: 0, quad: 0, raise: 0 })
  const shinG = useRef<THREE.Group>(null), armG = useRef<THREE.Group>(null), quadM = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 1 / 30) / 0.3), c = cur.current, hi = look.hi ?? {}
    c.shell += ((look.shell ?? 1) - c.shell) * k; c.b += ((hi.brain ?? 0) - c.b) * k; c.c += ((hi.cord ?? 0) - c.c) * k; c.n += ((hi.nerves ?? 0) - c.n) * k
    c.split += ((look.split ? 1 : 0) - c.split) * k; c.nv += ((look.nerves ?? 1) - c.nv) * k
    // 动作要快：小腿弹、肌肉收缩用更短的时间常数
    const kf = 1 - Math.exp(-Math.min(dt, 1 / 30) / 0.08)
    c.kick += ((look.kick ?? 0) - c.kick) * kf; c.quad += ((look.quad ?? 0) - c.quad) * kf; c.raise += ((look.raise ?? 0) - c.raise) * (1 - Math.exp(-Math.min(dt, 1 / 30) / 0.22))
    shell.uniforms.uFade.value = c.shell
    const paint = (mat: THREE.MeshPhysicalMaterial, h: number, central: boolean) => {
      const tint = central ? CEN : PER
      mat.emissive.set('#ffc35a').lerp(tint, c.split); mat.color.set('#f3dfa6').lerp(tint, c.split * 0.85)
      mat.emissiveIntensity = (0.3 + 1.5 * h + (central ? 1.4 : 0.6) * c.split) * c.nv
      mat.opacity = 0.2 + 0.8 * c.nv; mat.transparent = c.nv < 0.98; mat.depthWrite = c.nv > 0.6
    }
    paint(m.nerves, c.n, false); paint(m.cord, c.c, true)
    if (shinG.current) shinG.current.rotation.x = -c.kick
    if (armG.current) armG.current.rotation.x = -c.raise
    if (quadM.current) { m.quad.opacity = 0.18 + 0.4 * c.quad; m.quad.emissiveIntensity = 1.4 * c.quad; quadM.current.scale.set(QUAD.r[0] * (1 + 0.12 * c.quad), QUAD.r[1] * (1 + 0.25 * c.quad), QUAD.r[2] * (1 - 0.08 * c.quad)); quadM.current.visible = (look.quad ?? 0) > 0 || c.quad > 0.01 }
  })
  const bH: Partial<Record<TagKey, number>> = { ...(look.brainHi ?? {}) }
  const hb = look.hi?.brain ?? 0
  if (hb > 0 || look.split) for (const t of ['cortex', 'motor', 'sense', 'speech', 'vision', 'hearing', 'cerebellum', 'stem'] as TagKey[]) bH[t] = Math.max(bH[t] ?? 0, hb || 0.5)
  return (
    <group>
      <Stool />
      {geo && <mesh geometry={geo.main} material={shell} renderOrder={5} />}
      <Brain position={BRAIN_IN.at} scale={BRAIN_IN.s} hi={bH} glow={look.split ? '#8ff3ff' : undefined} />
      <mesh geometry={G.cord} material={m.cord} />
      <mesh geometry={G.cauda} material={m.cord} />
      <mesh geometry={G.main} material={m.nerves} />
      <mesh ref={quadM} position={QUAD.c} geometry={G.quad} material={m.quad} renderOrder={6} />
      {[1, -1].map(s => <mesh key={s} geometry={G.eyes} material={m.eye} position={EYE_AT(s)} />)}
      <Chatter paths={chatPaths()} n={2} on={look.chatter ?? true} />
      {/* 左小腿：绕膝盖转 */}
      <group position={KNEE}><group ref={shinG}><group position={[-KNEE[0], -KNEE[1], -KNEE[2]]}>
        {geo && <mesh geometry={geo.shin} material={shell} renderOrder={5} />}
        <mesh geometry={G.shin} material={m.nerves} />
        {shin}
      </group></group></group>
      {/* 左臂：绕肩转 */}
      <group position={SHOULDER}><group ref={armG}><group position={[-SHOULDER[0], -SHOULDER[1], -SHOULDER[2]]}>
        {geo && <mesh geometry={geo.arm} material={shell} renderOrder={5} />}
        <mesh geometry={G.arm} material={m.nerves} />
        {arm}
      </group></group></group>
      {children}
    </group>
  )
}
