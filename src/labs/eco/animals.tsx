// 草原上的动物：草原兔、田鼠、赤狐、狼、绵羊、草原雕、蛇、蝗虫、鼠妇、小鱼、螺。
// 每一种都用距离场造型（椭球、圆锥台平滑地融在一起），按真实的比例和轮廓做：兔子坐着、后腿长、耳朵尖发黑；
// 狐狸尖嘴大耳、白下巴、黑“袜子”、尾巴尖白；狼更高更壮、颈毛厚；鹰站姿前倾、钩嘴、黄爪。
// 腿、耳朵、尾巴、翅膀单独成块，能动：走路时四条腿按“左后、左前、右后、右前”的次序摆，兔子会跳，鹰会盘旋。
// 坐标：x 朝前（头的方向），y 朝上，z 朝左右；原点在两脚之间的地面上。单位 m。
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { U, cone, ell, fbm, lin, mix3, netsAll, shade, smin, sstep, ssub, type Shape, type V3 } from './sdf'
import { useJob } from './job'
import { Eye, rng, tube, useFur } from './parts'

type G = ThreeElements['group']

const grizzle = (p: V3, c: V3, f = 70, a = 0.22): V3 => shade(c, 1 - a / 2 + a * (0.5 + 0.5 * fbm(p[0] * f, p[1] * f, p[2] * f, 2)))

// =====================================================================
// 草原兔：坐姿，身长约 0.42 m
// =====================================================================
const RB = { back: lin('#4a3d31'), flank: lin('#6c5a45'), belly: lin('#ddd3c2'), chest: lin('#93795a'), dark: lin('#3b3026'), white: lin('#f1ede4'), nose: lin('#8a6a5c') }
function rabbitShapes(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => {
    const az = Math.abs(z)
    const body = ell(x, y, z, [-0.03, 0.125, 0], [0.15, 0.11, 0.104], 0.2), rump = ell(x, y, z, [-0.1, 0.115, 0], [0.105, 0.1, 0.108])
    const haunch = ell(x, y, az, [-0.062, 0.085, 0.068], [0.1, 0.07, 0.045], 0.35), foot = ell(x, y, az, [0.004, 0.019, 0.07], [0.098, 0.019, 0.027])
    const chest = ell(x, y, z, [0.075, 0.155, 0], [0.07, 0.085, 0.066])
    const fleg = cone(x, y, az, [0.092, 0.13, 0.035], [0.124, 0.02, 0.04], 0.023, 0.014), fpaw = ell(x, y, az, [0.134, 0.012, 0.04], [0.024, 0.012, 0.015])
    const neck = cone(x, y, z, [0.07, 0.19, 0], [0.14, 0.24, 0], 0.056, 0.048)
    const head = ell(x, y, z, [0.155, 0.25, 0], [0.07, 0.057, 0.051], -0.35), muzzle = ell(x, y, z, [0.205, 0.228, 0], [0.04, 0.034, 0.032], -0.45)
    const cheek = ell(x, y, az, [0.162, 0.228, 0.027], [0.042, 0.03, 0.026])
    const tail = ell(x, y, z, [-0.206, 0.142, 0], [0.03, 0.035, 0.034])
    let d = U(0.03, body, rump, chest, neck)
    d = U(0.022, d, haunch); d = U(0.012, d, foot, fleg, fpaw); d = U(0.02, d, head, muzzle, cheek); d = U(0.014, d, tail)
    d = ssub(d, ell(x, y, az, [0.18, 0.259, 0.047], [0.013, 0.011, 0.008]), 0.006)              // 眼窝
    d = ssub(d, ell(x, y, az, [0.244, 0.226, 0.008], [0.006, 0.004, 0.004]), 0.003)             // 鼻孔
    return d
  }
  const color = (p: V3, n: V3): V3 => {
    const [x, y, z] = p
    let c = mix3(RB.flank, RB.back, sstep(0.1, 0.85, n[1]))
    c = mix3(c, RB.belly, sstep(-0.05, -0.55, n[1]) * sstep(0.05, 0.11, y + 0.04))
    if (x > 0.04 && x < 0.15 && y < 0.2) c = mix3(c, RB.chest, sstep(0.1, 0.6, n[0]))
    if (y < 0.04) c = mix3(c, RB.chest, 0.7)
    if (x > 0.17) c = mix3(c, RB.chest, 0.35 * sstep(0.17, 0.23, x))
    if (x > 0.2 && y < 0.225) c = mix3(c, RB.white, 0.7)
    const er = Math.hypot(x - 0.18, y - 0.259, Math.abs(z) - 0.047); if (er < 0.022) c = mix3(c, RB.white, 0.55 * (1 - er / 0.022))
    if (Math.hypot(x - 0.244, y - 0.228, z) < 0.012) c = RB.nose
    if (x < -0.17 && y > 0.1) c = n[1] > 0.2 && n[0] > -0.6 ? RB.dark : RB.white
    // 背上一层深色的针毛：沿身体一道道深浅
    if (n[1] > 0.3 && y > 0.12) c = shade(c, 0.85 + 0.2 * Math.sin(x * 140 + Math.sin(z * 90) * 2) * 0.5)
    return grizzle(p, c, 90, 0.36)
  }
  return [{ f, lo: [-0.25, -0.002, -0.12], hi: [0.26, 0.31, 0.12], cell, color }]
}
/** 兔耳：长、薄、前面凹，耳尖发黑。原点在耳根，朝 +y 伸出；凹的一面朝 +z */
function earShapes(len: number, wid: number, cell: number, tip: V3, inner: V3, outer: V3): Shape[] {
  const f = (x: number, y: number, z: number) => ssub(ell(x, y, z, [0, len * 0.5, 0], [wid, len * 0.52, wid * 0.3]), ell(x, y, z, [0, len * 0.55, wid * 0.32], [wid * 0.7, len * 0.42, wid * 0.22]), wid * 0.08)
  const color = (p: V3, n: V3): V3 => { let c = n[2] > 0.3 && Math.abs(p[0]) < wid * 0.72 ? inner : outer; if (p[1] > len * 0.84) c = mix3(c, tip, sstep(len * 0.84, len * 0.9, p[1])); return grizzle(p, c, 120, 0.15) }
  return [{ f, lo: [-wid * 1.2, -0.004, -wid * 0.5], hi: [wid * 1.2, len * 1.06, wid * 0.5], cell, color }]
}

export type Act = 'idle' | 'walk' | 'graze' | 'hop' | 'run'
/** 兔：坐着；act='hop' 时隔一会儿往前一跳 */
export function Rabbit({ lo = false, act = 'idle', seed = 1, ...g }: { lo?: boolean; act?: Act; seed?: number } & G) {
  const cell = lo ? 0.009 : 0.0045
  const body = useJob(`rabbit${cell}`, () => netsAll(rabbitShapes(cell)), lo ? 6 : 2)
  const ear = useJob(`rabear${cell}`, () => netsAll(earShapes(0.115, 0.024, lo ? 0.004 : 0.0018, lin('#1e1812'), lin('#c39a8a'), lin('#8a7558'))), lo ? 6 : 2)
  const fur = useFur({ grain: 320, sheen: 0.08, rough: 0.95, tone: 0.34, bump: 0.6 })
  const root = useRef<THREE.Group>(null), eL = useRef<THREE.Group>(null), eR = useRef<THREE.Group>(null)
  const r = useMemo(() => rng(seed * 97 + 3), [seed])
  const ph = useMemo(() => r() * 10, [r])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + ph
    if (eL.current && eR.current) { const tw = Math.max(0, Math.sin(t * 0.9) - 0.94) * 6; eL.current.rotation.z = 0.32 + tw * 0.3; eR.current.rotation.z = 0.36 + Math.max(0, Math.sin(t * 0.7 + 2) - 0.95) * 5 * 0.3 }
    if (root.current) {
      if (act === 'hop') { const c = (t % 2.6) / 2.6, k = c < 0.22 ? Math.sin((c / 0.22) * Math.PI) : 0; root.current.position.y = k * 0.12; root.current.rotation.z = c < 0.22 ? Math.sin((c / 0.22) * Math.PI * 2) * 0.15 : 0; root.current.scale.set(1 + k * 0.12, 1 - k * 0.05, 1) }
      else { root.current.position.y = 0; root.current.rotation.z = 0; root.current.scale.set(1, 1 + Math.sin(t * 3.1) * 0.006, 1) }
    }
  })
  if (!body || !ear) return null
  return (
    <group {...g}>
      <group ref={root}>
        <mesh geometry={body[0]} material={fur} castShadow receiveShadow />
        {[1, -1].map(s => <mesh key={s} position={[0.176, 0.259, s * 0.042]} scale={[1, 1, 0.75]}><sphereGeometry args={[0.0105, 14, 10]} /><Eye color="#1c120c" /></mesh>)}
        {[1, -1].map(s => (
          <group key={s} position={[0.128, 0.29, s * 0.024]} rotation={[s * -0.28, 0, 0]}>
            <group ref={s > 0 ? eL : eR} rotation-z={0.34}>
              <group rotation-y={s > 0 ? Math.PI * 0.2 : Math.PI * 0.8}><mesh geometry={ear[0]} material={fur} castShadow /></group>
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}

// =====================================================================
// 田鼠：身长约 0.12 m，尾巴约 0.07 m
// =====================================================================
const MS = { back: lin('#6b563f'), side: lin('#8a7253'), belly: lin('#cdbfa8'), ear: lin('#a07f70'), pink: lin('#c99a8e') }
function mouseShapes(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => {
    const az = Math.abs(z)
    const body = ell(x, y, z, [0, 0.034, 0], [0.062, 0.033, 0.034], 0.06), rump = ell(x, y, z, [-0.035, 0.032, 0], [0.04, 0.031, 0.035])
    const head = ell(x, y, z, [0.058, 0.04, 0], [0.033, 0.027, 0.025], -0.22), snout = ell(x, y, z, [0.085, 0.032, 0], [0.019, 0.014, 0.013], -0.25)
    const ear = ell(x, y, az, [0.047, 0.062, 0.019], [0.006, 0.012, 0.011], 0.4), feet = ell(x, y, az, [0.025, 0.004, 0.02], [0.012, 0.004, 0.006]), hfeet = ell(x, y, az, [-0.03, 0.004, 0.024], [0.018, 0.004, 0.007])
    let d = U(0.018, body, rump, head); d = U(0.01, d, snout); d = U(0.004, d, ear); d = U(0.006, d, feet, hfeet)
    d = ssub(d, ell(x, y, az, [0.066, 0.048, 0.02], [0.006, 0.005, 0.004]), 0.003)
    return d
  }
  const color = (p: V3, n: V3): V3 => {
    let c = mix3(MS.side, MS.back, sstep(0.1, 0.8, n[1])); c = mix3(c, MS.belly, sstep(-0.1, -0.6, n[1]))
    if (p[1] > 0.05 && p[0] > 0.035 && p[0] < 0.06) c = mix3(c, MS.ear, 0.6)
    if (p[0] > 0.097) c = MS.pink
    if (p[1] < 0.008) c = MS.pink
    return grizzle(p, c, 220, 0.2)
  }
  return [{ f, lo: [-0.085, -0.002, -0.045], hi: [0.11, 0.078, 0.045], cell, color }]
}
export function Mouse({ act = 'idle', seed = 1, ...g }: { act?: Act; seed?: number } & G) {
  const body = useJob('mouse', () => netsAll(mouseShapes(0.0016)), 2)
  const fur = useFur({ grain: 700 })
  const tail = useMemo(() => tube([[-0.07, 0.02, 0], [-0.1, 0.008, 0.01], [-0.13, 0.004, -0.004], [-0.155, 0.006, 0.012]], 0.005, 0.0018, '#7e6656', '#a58d7c', 6, 16), [])
  const root = useRef<THREE.Group>(null), ph = useMemo(() => rng(seed)() * 9, [seed])
  useFrame(({ clock }) => { const t = clock.elapsedTime + ph; if (root.current) { root.current.rotation.y = Math.sin(t * 0.8) * 0.15; root.current.position.y = Math.max(0, Math.sin(t * 9)) * 0.002 * (Math.sin(t * 0.5) > 0.6 ? 1 : 0) } })
  if (!body) return null
  return (
    <group {...g}>
      <group ref={root}>
        <mesh geometry={body[0]} material={fur} castShadow receiveShadow />
        <mesh geometry={tail} castShadow><meshStandardMaterial vertexColors roughness={0.6} /></mesh>
        {[1, -1].map(s => <mesh key={s} position={[0.066, 0.048, s * 0.0185]}><sphereGeometry args={[0.0048, 10, 8]} /><Eye /></mesh>)}
      </group>
    </group>
  )
}

// =====================================================================
// 四足兽：赤狐、狼。身体、四条腿、尾巴分开做，走路时腿按次序摆
// =====================================================================
interface QuadSpec { k: number; ear: number; muzzle: number; chest: number; neck: number; bush: number; pal: (part: 'body' | 'leg' | 'tail', p: V3, n: V3) => V3 }
function quadShapes(q: QuadSpec, cell: number): { body: Shape; fleg: Shape; hleg: Shape; tail: Shape } {
  const K = q.k
  const body: Shape = {
    cell, color: (p, n) => q.pal('body', [p[0] / K, p[1] / K, p[2] / K], n),
    lo: [-0.34 * K, 0.17 * K, -0.14 * K], hi: [0.56 * K, 0.62 * K, 0.14 * K],
    f: (X, Y, Z) => {
      const x = X / K, y = Y / K, z = Z / K, az = Math.abs(z)
      const chest = ell(x, y, z, [0.17, 0.31 - q.chest * 0.02, 0], [0.16, 0.115 + q.chest * 0.02, 0.095 + q.chest * 0.008], 0.08)
      const belly = ell(x, y, z, [-0.01, 0.305, 0], [0.2, 0.09, 0.088]), hip = ell(x, y, z, [-0.2, 0.315, 0], [0.11, 0.1, 0.09])
      const sh = ell(x, y, az, [0.18, 0.3, 0.058], [0.08, 0.1, 0.04]), th = ell(x, y, az, [-0.2, 0.28, 0.058], [0.095, 0.1, 0.04])
      const neck = cone(x, y, z, [0.21, 0.33, 0], [0.34, 0.42, 0], 0.075 * q.neck, 0.056 * q.neck)
      const head = ell(x, y, z, [0.38, 0.44, 0], [0.07, 0.06, 0.062]), cheek = ell(x, y, az, [0.39, 0.42, 0.04], [0.05, 0.04, 0.03])
      const mEnd: V3 = [0.41 + 0.1 * q.muzzle, 0.43 - 0.025 * q.muzzle, 0]
      const muzzle = cone(x, y, z, [0.41, 0.43, 0], mEnd, 0.038, 0.016 + (1 - q.muzzle) * 0.012), jaw = ell(x, y, z, [0.43 + 0.02 * q.muzzle, 0.405, 0], [0.055 * q.muzzle, 0.022, 0.026])
      const nose = ell(x, y, z, [mEnd[0] + 0.004, mEnd[1] + 0.002, 0], [0.013, 0.012, 0.013])
      const ex = 0.362, sx = 0.362 + (x - ex) * 2.6
      const ear = ssub(cone(sx, y, az, [0.37, 0.468, 0.034], [0.356, 0.468 + 0.105 * q.ear, 0.034 + 0.02 * q.ear], 0.03 * Math.sqrt(q.ear), 0.004), cone(sx - 0.03, y, az, [0.375, 0.48, 0.034], [0.36, 0.468 + 0.1 * q.ear, 0.036 + 0.02 * q.ear], 0.022 * Math.sqrt(q.ear), 0.002), 0.004)
      let d = U(0.05, chest, belly, hip); d = U(0.03, d, sh, th); d = U(0.04, d, neck); d = U(0.03, d, head, cheek); d = U(0.018, d, muzzle, jaw); d = U(0.008, d, nose); d = U(0.01, d, ear)
      d = ssub(d, ell(x, y, az, [0.43, 0.458, 0.036], [0.014, 0.008, 0.01], -0.3), 0.006)
      if (q.bush > 1) d -= 0.006 * Math.max(0, fbm(x * 40, y * 40, z * 40))   // 狼的颈毛和厚毛
      return d * K
    },
  }
  const leg = (front: boolean): Shape => ({
    cell: cell * 0.8, color: (p, n) => q.pal('leg', [p[0] / K, p[1] / K, p[2] / K], n),
    lo: [-0.09 * K, -0.33 * K, -0.06 * K], hi: [0.09 * K, 0.07 * K, 0.06 * K],
    f: (X, Y, Z) => {
      const x = X / K, y = Y / K, z = Z / K
      const d = front
        ? U(0.012, cone(x, y, z, [0, 0, 0], [0.015, -0.16, 0], 0.046, 0.026), cone(x, y, z, [0.015, -0.16, 0], [0.005, -0.295, 0], 0.022, 0.017), ell(x, y, z, [0.022, -0.307, 0], [0.031, 0.014, 0.021]))
        : U(0.012, cone(x, y, z, [0, 0.01, 0], [0.055, -0.13, 0], 0.066, 0.034), cone(x, y, z, [0.055, -0.13, 0], [-0.035, -0.22, 0], 0.03, 0.02), cone(x, y, z, [-0.035, -0.22, 0], [-0.02, -0.298, 0], 0.019, 0.016), ell(x, y, z, [0.0, -0.307, 0], [0.032, 0.013, 0.021]))
      return d * K
    },
  })
  const tp: [V3, number][] = [[[0, 0, 0], 0.035], [[-0.12, -0.05, 0], 0.058 * q.bush], [[-0.26, -0.13, 0], 0.062 * q.bush], [[-0.37, -0.18, 0], 0.035]]
  const tail: Shape = {
    cell, color: (p, n) => q.pal('tail', [p[0] / K, p[1] / K, p[2] / K], n),
    lo: [-0.44 * K, -0.26 * K, -0.09 * K], hi: [0.05 * K, 0.05 * K, 0.09 * K],
    f: (X, Y, Z) => {
      const x = X / K, y = Y / K, z = Z / K
      let d = 1
      for (let i = 0; i < tp.length - 1; i++) d = smin(d, cone(x, y, z, tp[i][0], tp[i + 1][0], tp[i][1], tp[i + 1][1]), 0.04)
      return (d - 0.007 * fbm(x * 50, y * 50, z * 50)) * K
    },
  }
  return { body, fleg: leg(true), hleg: leg(false), tail }
}
const FX = { red: lin('#b4542a'), dark: lin('#8e3e1d'), side: lin('#c9773d'), white: lin('#f0ebe2'), black: lin('#1d1714'), belly: lin('#d9cdbb') }
const FOX: QuadSpec = {
  k: 1, ear: 1, muzzle: 1, chest: 0, neck: 1, bush: 1,
  pal: (part, p, n) => {
    const [x, y, z] = p
    if (part === 'leg') { let c = mix3(FX.red, FX.black, sstep(-0.1, -0.17, y)); if (n[0] > 0.6 && y > -0.16) c = mix3(c, FX.side, 0.3); return grizzle(p, c, 160, 0.18) }
    if (part === 'tail') { let c = mix3(FX.red, FX.dark, sstep(0.3, 0.9, n[1]) * 0.6); c = mix3(c, mix3(FX.dark, FX.black, 0.4), sstep(-0.2, -0.27, x) * 0.5); if (x < -0.33) c = FX.white; return grizzle(p, c, 80, 0.25) }
    let c = mix3(FX.side, FX.red, sstep(0.0, 0.8, n[1])); c = mix3(c, FX.dark, sstep(0.75, 0.98, n[1]) * 0.5)
    c = mix3(c, FX.belly, sstep(-0.2, -0.7, n[1]))
    if (x > 0.2 && (n[1] < -0.1 || (x > 0.38 && y < 0.418))) c = FX.white                                        // 下巴、喉咙、胸前白
    if (x > 0.33 && y < 0.43 && Math.abs(z) > 0.035 && n[1] < 0.4) c = mix3(c, FX.white, 0.8)                     // 两腮白
    if (y > 0.47 && x < 0.39) c = n[0] < 0 ? FX.black : mix3(c, FX.white, 0.4)                                    // 耳背黑，耳内浅
    if (x > 0.5) c = FX.black                                                                                     // 鼻头
    if (x > 0.4 && x < 0.5 && y > 0.43 && Math.abs(z) < 0.02) c = mix3(c, FX.dark, 0.3)
    return grizzle(p, c, 110, 0.22)
  },
}
const WF = { grey: lin('#4f4a44'), saddle: lin('#26221f'), buff: lin('#7a6a55'), pale: lin('#b3a996'), black: lin('#1a1714'), dark: lin('#2c2824') }
const WOLF: QuadSpec = {
  k: 1.62, ear: 0.72, muzzle: 0.85, chest: 1.3, neck: 1.35, bush: 1.15,
  pal: (part, p, n) => {
    const [x, y, z] = p
    if (part === 'leg') { const c = mix3(WF.buff, mix3(WF.buff, WF.pale, 0.5), sstep(-0.1, -0.25, y)); return grizzle(p, c, 140, 0.2) }
    if (part === 'tail') { let c = mix3(WF.grey, WF.saddle, sstep(0.2, 0.9, n[1])); if (x < -0.31) c = WF.black; return grizzle(p, c, 70, 0.3) }
    let c = mix3(WF.buff, WF.grey, sstep(-0.45, 0.15, n[1])); c = mix3(c, WF.saddle, sstep(0.5, 0.95, n[1]) * sstep(0.32, 0.05, x) * 0.55)
    c = mix3(c, WF.pale, sstep(-0.35, -0.8, n[1]))
    if (x > 0.36 && y < 0.425) c = mix3(c, WF.pale, 0.75)                                         // 下巴、嘴边
    if (x > 0.37 && Math.abs(z) > 0.045 && y < 0.44) c = mix3(c, WF.pale, 0.6)                    // 两腮
    if (x > 0.4 && y > 0.425 && Math.abs(z) < 0.03) c = mix3(WF.buff, WF.grey, 0.5)
    if (y > 0.47 && x < 0.39) c = n[0] < 0 ? WF.dark : mix3(WF.grey, WF.pale, 0.4)
    if (x > 0.48) c = WF.black
    return grizzle(p, c, 90, 0.3)
  },
}
/** 走路时四条腿的相位：左后、左前、右后、右前依次落地 */
const GAIT = { lf: 0.25, rf: 0.75, lh: 0, rh: 0.5 }
function Quad({ spec, name, lo, act = 'idle', seed = 1, speed = 1, ...g }: { spec: QuadSpec; name: string; lo?: boolean; act?: Act; seed?: number; speed?: number } & G) {
  const cell = (lo ? 0.012 : 0.0062) * spec.k
  const m = useJob(`${name}${cell}`, () => { const s = quadShapes(spec, cell); return netsAll([s.body, s.fleg, s.hleg, s.tail]) }, lo ? 6 : 3)
  const fur = useFur({ grain: 240 / spec.k, bump: 0.45, sheen: spec.k > 1 ? 0.18 : 0.3 })
  const legs = useRef<(THREE.Group | null)[]>([]), tail = useRef<THREE.Group>(null), root = useRef<THREE.Group>(null)
  const ph = useMemo(() => rng(seed * 31 + 7)() * 10, [seed])
  const K = spec.k
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + ph, moving = act === 'walk' || act === 'run', f = act === 'run' ? 2.6 : 1.25
    const phases = [GAIT.lf, GAIT.rf, GAIT.lh, GAIT.rh]
    legs.current.forEach((l, i) => { if (l) l.rotation.z = moving ? Math.sin((t * f + phases[i]) * Math.PI * 2) * (act === 'run' ? 0.55 : 0.32) * (i < 2 ? 1 : -1) : 0 })
    if (tail.current) { tail.current.rotation.y = Math.sin(t * 1.1) * 0.12; tail.current.rotation.z = (moving ? 0.15 : 0) + Math.sin(t * 0.7) * 0.04 }
    if (root.current) { root.current.position.y = moving ? Math.abs(Math.sin(t * f * Math.PI * 2)) * 0.012 * K : 0; root.current.scale.y = moving ? 1 : 1 + Math.sin(t * 2.2) * 0.004 }
  })
  if (!m) return null
  const [body, fleg, hleg, tl] = m
  const at: V3[] = [[0.19, 0.32, 0.058], [0.19, 0.32, -0.058], [-0.2, 0.32, 0.058], [-0.2, 0.32, -0.058]]
  return (
    <group {...g}>
      <group ref={root}>
        <mesh geometry={body} material={fur} castShadow receiveShadow />
        {[1, -1].map(s => <mesh key={s} position={[0.428 * K, 0.459 * K, s * 0.034 * K]} scale={[1, 0.72, 1]}><sphereGeometry args={[0.0105 * K, 12, 9]} /><Eye color={name === 'fox' ? '#3a2408' : '#3b2b10'} /></mesh>)}
        {at.map((p, i) => <group key={i} position={[p[0] * K, p[1] * K, p[2] * K]} ref={e => { legs.current[i] = e }}><mesh geometry={i < 2 ? fleg : hleg} material={fur} castShadow /></group>)}
        <group ref={tail} position={[-0.29 * K, 0.33 * K, 0]}><mesh geometry={tl} material={fur} castShadow /></group>
      </group>
    </group>
  )
}
export const Fox = (p: { lo?: boolean; act?: Act; seed?: number; speed?: number } & G) => <Quad spec={FOX} name="fox" {...p} />
export const Wolf = (p: { lo?: boolean; act?: Act; seed?: number; speed?: number } & G) => <Quad spec={WOLF} name="wolf" {...p} />

// =====================================================================
// 绵羊：毛卷成一团团，白脸；吃草时低头
// =====================================================================
const SH = { wool: lin('#e2d8c4'), shade: lin('#b4a78e'), face: lin('#d8cab4'), skin: lin('#8a6e66'), hoof: lin('#2e2924'), leg: lin('#a8998a') }
function sheepShapes(cell: number): Shape[] {
  const wool = (x: number, y: number, z: number) => 0.016 * (0.5 + 0.5 * fbm(x * 22, y * 22, z * 22, 2)) + 0.006 * fbm(x * 70, y * 70, z * 70, 1)
  const body: Shape = {
    cell, lo: [-0.6, 0.2, -0.32], hi: [0.6, 0.8, 0.32],
    f: (x, y, z) => U(0.1, ell(x, y, z, [0, 0.5, 0], [0.42, 0.22, 0.23]), ell(x, y, z, [-0.3, 0.49, 0], [0.2, 0.21, 0.22]), ell(x, y, z, [0.3, 0.53, 0], [0.2, 0.21, 0.2]), cone(x, y, z, [0.34, 0.55, 0], [0.47, 0.65, 0], 0.13, 0.1)) - wool(x, y, z),
    color: (p, n) => { const c = mix3(SH.shade, SH.wool, sstep(-0.6, 0.6, n[1])); return shade(c, 0.86 + 0.24 * (0.5 + 0.5 * fbm(p[0] * 30, p[1] * 30, p[2] * 30, 2))) },
  }
  const head: Shape = {
    cell: cell * 0.6, lo: [-0.06, -0.18, -0.15], hi: [0.24, 0.1, 0.15],
    f: (x, y, z) => { const az = Math.abs(z); let d = U(0.04, ell(x, y, z, [0.06, 0.0, 0], [0.09, 0.065, 0.06], -0.7), ell(x, y, z, [0.15, -0.09, 0], [0.05, 0.045, 0.04], -0.9)); d = U(0.02, d, ell(x, y, az, [0.03, 0.03, 0.08], [0.06, 0.013, 0.025], -0.2, 0.25)); d = ssub(d, ell(x, y, az, [0.1, -0.01, 0.047], [0.012, 0.009, 0.008]), 0.006); return d },
    color: (p, n) => { let c = SH.face; if (p[0] > 0.17 && p[1] < -0.1) c = SH.skin; if (Math.abs(p[2]) > 0.06 && n[1] < 0) c = mix3(c, SH.skin, 0.5); return shade(c, 0.92 + 0.12 * fbm(p[0] * 80, p[1] * 80, p[2] * 80, 1)) },
  }
  const leg: Shape = { cell: cell * 0.6, lo: [-0.05, -0.36, -0.05], hi: [0.05, 0.04, 0.05], f: (x, y, z) => U(0.01, cone(x, y, z, [0, 0, 0], [0, -0.22, 0], 0.038, 0.022), cone(x, y, z, [0, -0.22, 0], [0.005, -0.34, 0], 0.02, 0.018), ell(x, y, z, [0.008, -0.345, 0], [0.024, 0.016, 0.02])), color: p => (p[1] < -0.325 ? SH.hoof : mix3(SH.leg, SH.wool, sstep(-0.1, 0, p[1]))) }
  return [body, head, leg]
}
export function Sheep({ act = 'graze', seed = 1, ...g }: { act?: Act; seed?: number } & G) {
  const m = useJob('sheep', () => netsAll(sheepShapes(0.014)), 6)
  const wool = useFur({ grain: 55, bump: 0.25, rough: 0.95, sheen: 0.25, tone: 0.06 })
  const head = useRef<THREE.Group>(null), ph = useMemo(() => rng(seed * 13 + 5)() * 20, [seed])
  useFrame(({ clock }) => { const t = clock.elapsedTime + ph; if (head.current) { const down = act === 'graze' ? sstep(-0.2, 0.3, Math.sin(t * 0.25)) : 0; head.current.rotation.z = -down * 0.9 + Math.sin(t * 3) * 0.02 * down } })
  if (!m) return null
  const [body, hd, leg] = m
  return (
    <group {...g}>
      <mesh geometry={body} material={wool} castShadow receiveShadow />
      <group ref={head} position={[0.48, 0.66, 0]} scale={1.25}>
        <mesh geometry={hd} castShadow><meshStandardMaterial vertexColors roughness={0.8} /></mesh>
        {[1, -1].map(s => <mesh key={s} position={[0.098, -0.012, s * 0.045]}><sphereGeometry args={[0.009, 10, 8]} /><Eye color="#3a2a12" /></mesh>)}
      </group>
      {([[0.28, 0.345, 0.12], [0.28, 0.345, -0.12], [-0.28, 0.345, 0.12], [-0.28, 0.345, -0.12]] as V3[]).map((p, i) => <mesh key={i} geometry={leg} position={p} material={wool} castShadow />)}
    </group>
  )
}

// =====================================================================
// 草原雕：站着（第 3–6 课），也能在天上盘旋
// =====================================================================
const EG = { brown: lin('#4a3324'), dark: lin('#2e2019'), nape: lin('#a3794a'), light: lin('#6e4f35'), cere: lin('#e2b13a'), beak: lin('#3a3633'), talon: lin('#151313') }
function eagleShapes(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => {
    const az = Math.abs(z)
    const body = ell(x, y, z, [0, 0.33, 0], [0.12, 0.22, 0.115], -0.5), chest = ell(x, y, z, [0.07, 0.42, 0], [0.11, 0.13, 0.105])
    const wing = ell(x, y, az, [-0.06, 0.33, 0.086], [0.085, 0.26, 0.05], -0.62), prim = ell(x, y, az, [-0.18, 0.12, 0.058], [0.04, 0.13, 0.025], -0.75)
    const tail = ell(x, y, z, [-0.21, 0.09, 0], [0.04, 0.15, 0.07], -0.8)
    const neck = cone(x, y, z, [0.06, 0.5, 0], [0.12, 0.6, 0], 0.08, 0.066), head = ell(x, y, z, [0.135, 0.625, 0], [0.072, 0.06, 0.058])
    const brow = ell(x, y, az, [0.168, 0.645, 0.028], [0.03, 0.012, 0.02])
    const beak = cone(x, y, z, [0.19, 0.625, 0], [0.235, 0.61, 0], 0.026, 0.013), hook = cone(x, y, z, [0.235, 0.61, 0], [0.244, 0.582, 0], 0.013, 0.004)
    const thigh = ell(x, y, az, [0.03, 0.14, 0.048], [0.055, 0.1, 0.045], -0.1)
    const tars = cone(x, y, az, [0.04, 0.07, 0.05], [0.045, 0.008, 0.05], 0.015, 0.012)
    let toes = 1
    for (const [dx, dz] of [[0.06, 0.02], [0.065, -0.012], [0.05, 0.04], [-0.05, 0]] as [number, number][]) toes = Math.min(toes, cone(x, y, az, [0.045, 0.006, 0.05], [0.045 + dx, 0.006, 0.05 + dz], 0.009, 0.006))
    let d = U(0.05, body, chest); d = U(0.02, d, wing); d = U(0.015, d, prim, tail); d = U(0.04, d, neck); d = U(0.03, d, head); d = U(0.01, d, brow, beak); d = U(0.004, d, hook); d = U(0.02, d, thigh); d = U(0.006, d, tars, toes)
    d -= 0.003 * fbm(x * 60, y * 60, z * 60, 2)
    return d
  }
  const color = (p: V3, n: V3): V3 => {
    const [x, y, z] = p, az = Math.abs(z)
    if (y < 0.075 && x > -0.04 && (az > 0.03 || y < 0.03)) { const tipT = y < 0.012 && (x > 0.09 || x < -0.0); return tipT ? EG.talon : EG.cere }
    if (x > 0.185 && y > 0.57) return x > 0.212 || y < 0.612 ? EG.beak : EG.cere
    let c = mix3(EG.brown, EG.dark, sstep(0.2, -0.5, n[0]))
    if (y > 0.58 && x < 0.14) c = mix3(c, EG.nape, sstep(0.0, -0.6, n[0]) * 0.9)
    if (az > 0.06 && y > 0.12 && y < 0.55) { const sc = Math.sin((y * 1.2 - x) * 95 + Math.sin(az * 160) * 1.5) * Math.sin(az * 140 + y * 30); c = mix3(c, sc > 0.45 ? EG.light : EG.dark, 0.22) }
    return grizzle(p, c, 60, 0.18)
  }
  return [{ f, lo: [-0.3, -0.002, -0.16], hi: [0.26, 0.72, 0.16], cell, color }]
}
/** 翅膀（盘旋时）：一片宽大的翼面，外侧分出六根“手指”一样的初级飞羽；原点在肩，朝 +z 伸出 */
function wingGeo() {
  const parts: THREE.BufferGeometry[] = []
  const sh = new THREE.Shape()
  sh.moveTo(0.08, 0); sh.bezierCurveTo(0.12, 0.25, 0.1, 0.5, 0.06, 0.68); sh.lineTo(-0.2, 0.72); sh.bezierCurveTo(-0.24, 0.5, -0.25, 0.2, -0.18, 0); sh.lineTo(0.08, 0)
  const inner = new THREE.ShapeGeometry(sh, 10); parts.push(inner)
  for (let i = 0; i < 6; i++) {
    const x0 = 0.06 - i * 0.05, f = new THREE.Shape(), L = 0.2 + Math.sin((i / 5) * Math.PI) * 0.06
    f.moveTo(x0 + 0.02, 0.66); f.quadraticCurveTo(x0 + 0.03, 0.68 + L * 0.6, x0 + 0.005 - i * 0.01, 0.68 + L); f.quadraticCurveTo(x0 - 0.03, 0.68 + L * 0.5, x0 - 0.025, 0.66); f.lineTo(x0 + 0.02, 0.66)
    parts.push(new THREE.ShapeGeometry(f, 6))
  }
  const g = parts.reduce<THREE.BufferGeometry[]>((a, p) => { a.push(p.toNonIndexed()); return a }, [])
  const merged = new THREE.BufferGeometry(), all = g.flatMap(p => Array.from(p.attributes.position.array as Float32Array))
  merged.setAttribute('position', new THREE.Float32BufferAttribute(all, 3))
  // 翼面从 xy 平面放平到 xz 平面（+y → +z），越往外越往上翘一点
  const pa = merged.attributes.position, c = new Float32Array(pa.count * 3), dark = new THREE.Color('#2a1d16'), mid = new THREE.Color('#4d3526'), pale = new THREE.Color('#8a6a4c'), cc = new THREE.Color()
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), s = pa.getY(i)
    pa.setXYZ(i, x, s * s * 0.12 + Math.sin(x * 9) * 0.004, s)
    cc.copy(mid).lerp(dark, Math.min(1, Math.max(0, (s - 0.55) * 4))); if (s > 0.45 && s < 0.6 && x < -0.05) cc.lerp(pale, 0.5); if (x < -0.15) cc.lerp(dark, 0.5)
    c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b
  }
  merged.setAttribute('color', new THREE.BufferAttribute(c, 3)); merged.computeVertexNormals()
  return merged
}
function flyBodyShapes(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => {
    let d = U(0.05, ell(x, y, z, [0, 0, 0], [0.24, 0.085, 0.09]), ell(x, y, z, [0.2, 0.02, 0], [0.07, 0.06, 0.055]))
    d = U(0.02, d, cone(x, y, z, [0.26, 0.025, 0], [0.31, 0.012, 0], 0.022, 0.01), cone(x, y, z, [0.31, 0.012, 0], [0.318, -0.012, 0], 0.01, 0.004))
    d = U(0.02, d, ell(x, y, z, [-0.3, 0.0, 0], [0.13, 0.012, 0.1 + Math.max(0, -0.3 - x) * 0.6]))
    return d
  }
  const color = (p: V3, n: V3): V3 => { if (p[0] > 0.265) return p[0] > 0.29 ? EG.beak : EG.cere; let c = mix3(EG.dark, EG.brown, sstep(-0.5, 0.5, n[1])); if (p[0] > 0.12 && n[1] > 0.3) c = mix3(c, EG.nape, 0.6); return grizzle(p, c, 50, 0.16) }
  return [{ f, lo: [-0.46, -0.1, -0.2], hi: [0.34, 0.1, 0.2], cell, color }]
}
/** 鹰：fly=false 站着；fly=true 张开翅膀盘旋（只管翅膀和身体，绕圈的路线由外面定） */
export function Eagle({ fly = false, seed = 1, ...g }: { fly?: boolean; seed?: number } & G) {
  const perch = useJob('eagle', () => netsAll(eagleShapes(0.0055)), 3)
  const flyer = useJob('eagleFly', () => netsAll(flyBodyShapes(0.008)), 6)
  const wing = useMemo(wingGeo, [])
  const fur = useFur({ grain: 140, bump: 0.35, sheen: 0.3, tone: 0.18 })
  const wl = useRef<THREE.Group>(null), wr = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null), ph = useMemo(() => rng(seed)() * 10, [seed])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + ph
    const flap = Math.sin(t * 6) * Math.max(0, Math.sin(t * 0.4) - 0.7) * 1.6
    if (wl.current && wr.current) { wl.current.rotation.x = -0.08 - flap * 0.5; wr.current.rotation.x = 0.08 + flap * 0.5 }
    if (head.current) head.current.rotation.y = Math.sin(t * 0.5) * 0.3
  })
  if (fly) {
    if (!flyer) return null
    return (
      <group {...g}>
        <mesh geometry={flyer[0]} material={fur} castShadow />
        <group ref={wl} position={[0.02, 0.03, 0.06]}><mesh geometry={wing} castShadow><meshStandardMaterial vertexColors roughness={0.8} side={THREE.DoubleSide} /></mesh></group>
        <group ref={wr} position={[0.02, 0.03, -0.06]} scale={[1, 1, -1]}><mesh geometry={wing} castShadow><meshStandardMaterial vertexColors roughness={0.8} side={THREE.DoubleSide} /></mesh></group>
      </group>
    )
  }
  if (!perch) return null
  return (
    <group {...g}>
      <mesh geometry={perch[0]} material={fur} castShadow receiveShadow />
      {[1, -1].map(s => <mesh key={s} position={[0.172, 0.634, s * 0.04]}><sphereGeometry args={[0.0105, 12, 9]} /><Eye color="#3d250c" /></mesh>)}
      <group ref={head} />
    </group>
  )
}

// =====================================================================
// 蛇：约 1 m 长的锦蛇，身体沿着一条随时间摆动的曲线（每帧改顶点），头单独做
// =====================================================================
const SNAKE_SEGS = 90, SNAKE_RAD = 12
function snakeHead(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => { const az = Math.abs(z); let d = U(0.012, ell(x, y, z, [0.0, 0.0, 0], [0.034, 0.013, 0.02]), ell(x, y, z, [0.02, -0.001, 0], [0.018, 0.01, 0.014]), cone(x, y, z, [-0.03, 0, 0], [-0.005, 0, 0], 0.016, 0.018)); d = U(0.004, d, ell(x, y, az, [0.012, 0.007, 0.012], [0.007, 0.005, 0.006])); return d }
  const color = (p: V3, n: V3): V3 => { let c = mix3(lin('#d8cfae'), lin('#6c6247'), sstep(-0.4, 0.3, n[1])); if (n[1] > 0.5 && Math.abs(p[2]) < 0.008 && p[0] < 0.01) c = lin('#3d3528'); return grizzle(p, c, 300, 0.12) }
  return [{ f, lo: [-0.035, -0.02, -0.03], hi: [0.045, 0.02, 0.03], cell, color }]
}
/** 蛇：沿 x 轴卧在地上，头在 +x，身子左右摆成 S 形，头略抬 */
export function Snake({ seed = 1, len = 1.0, ...g }: { seed?: number; len?: number } & G) {
  const head = useJob('snakehead', () => netsAll(snakeHead(0.0012)), 3)
  const geo = useMemo(() => {
    const ring = SNAKE_RAD + 1, n = (SNAKE_SEGS + 1) * ring
    const gg = new THREE.BufferGeometry(), col = new Float32Array(n * 3), idx: number[] = []
    const back = new THREE.Color('#7a6a48'), blot = new THREE.Color('#2a1e12'), belly = new THREE.Color('#d6cba2'), c = new THREE.Color()
    for (let i = 0; i <= SNAKE_SEGS; i++) for (let j = 0; j < ring; j++) {
      const u = i / SNAKE_SEGS, a = (j / SNAKE_RAD) * Math.PI * 2, up = Math.sin(a)
      c.copy(back).lerp(belly, Math.max(0, -up) * 1.2 > 0.6 ? 1 : Math.max(0, -up))
      const spot = up > -0.3 && ((Math.sin(u * 64) > 0.25 && Math.abs(Math.cos(a)) < 0.6) || (Math.sin(u * 64 + 3.1) > 0.55 && Math.abs(Math.cos(a)) > 0.75))
      if (spot) c.lerp(blot, 0.8)
      col.set([c.r, c.g, c.b], (i * ring + j) * 3)
    }
    for (let i = 0; i < SNAKE_SEGS; i++) for (let j = 0; j < SNAKE_RAD; j++) { const q = i * ring + j, s = q + ring; idx.push(q, s, q + 1, s, s + 1, q + 1) }
    gg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); gg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.setIndex(idx)
    return gg
  }, [])
  const hd = useRef<THREE.Group>(null), ph = useMemo(() => rng(seed)() * 10, [seed])
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), nrm: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), [])
  const spine = (s: number, t: number, out: THREE.Vector3) => {
    const x = (s - 1) * len, w = (1 - s) * 0.85 + 0.15
    return out.set(x * 0.82 + 0.02 * Math.sin(t * 0.5), s > 0.9 ? (s - 0.9) * 0.7 : 0, Math.sin(s * 10 - t * 1.4) * 0.05 * w + Math.sin(s * 5.5 + 0.6) * 0.13 * (0.4 + 0.6 * (1 - s)))
  }
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.6 + ph, P = geo.attributes.position as THREE.BufferAttribute, N = geo.attributes.normal as THREE.BufferAttribute
    const { p, t: T, nrm, b, up } = tmp, q = new THREE.Vector3()
    for (let i = 0; i <= SNAKE_SEGS; i++) {
      const s = i / SNAKE_SEGS; spine(s, t, p); spine(Math.min(1, s + 0.01), t, q); T.copy(q).sub(spine(Math.max(0, s - 0.01), t, b)).normalize()
      b.crossVectors(T, up).normalize(); nrm.crossVectors(b, T).normalize()
      const r = 0.024 * Math.min(1, Math.pow(s / 0.16, 0.7)) * (s > 0.6 ? 1 - (s - 0.6) * 0.35 : 1) * (s > 0.96 ? 1 - (s - 0.96) * 6 : 1) + 0.0015
      for (let j = 0; j <= SNAKE_RAD; j++) {
        const a = (j / SNAKE_RAD) * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a)
        const dx = b.x * cx + nrm.x * sy, dy = b.y * cx + nrm.y * sy * 0.8, dz = b.z * cx + nrm.z * sy
        const k = i * (SNAKE_RAD + 1) + j
        P.setXYZ(k, p.x + dx * r, p.y + r * 0.8 + dy * r, p.z + dz * r); N.setXYZ(k, dx, dy, dz)
      }
    }
    P.needsUpdate = true; N.needsUpdate = true; geo.computeBoundingSphere()
    if (hd.current) { spine(1, t, p); spine(0.985, t, q); hd.current.position.set(p.x + 0.012, p.y + 0.017, p.z); hd.current.rotation.y = -Math.atan2(p.z - q.z, p.x - q.x) }
  })
  return (
    <group {...g}>
      <mesh geometry={geo} castShadow receiveShadow frustumCulled={false}><meshPhysicalMaterial vertexColors roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.4} side={THREE.DoubleSide} /></mesh>
      {head && <group ref={hd}><group position={[0.018, 0, 0]}>
        <mesh geometry={head[0]} castShadow><meshPhysicalMaterial vertexColors roughness={0.4} clearcoat={0.6} /></mesh>
        {[1, -1].map(s => <mesh key={s} position={[0.012, 0.007, s * 0.0135]}><sphereGeometry args={[0.0042, 10, 8]} /><Eye color="#2a1a08" /></mesh>)}
      </group></group>}
    </group>
  )
}

// =====================================================================
// 蝗虫：约 5 cm，绿褐色，后腿粗壮
// =====================================================================
function hopperShapes(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => {
    const az = Math.abs(z)
    let d = U(0.004, ell(x, y, z, [-0.008, 0.009, 0], [0.024, 0.006, 0.006], 0.05), ell(x, y, z, [0.014, 0.011, 0], [0.008, 0.0075, 0.0065]), ell(x, y, z, [0.024, 0.011, 0], [0.006, 0.0075, 0.0055], -0.5))
    d = U(0.002, d, ell(x, y, az, [-0.008, 0.015, 0.004], [0.022, 0.0025, 0.004], 0.08))                           // 翅
    d = U(0.002, d, cone(x, y, az, [0.004, 0.011, 0.005], [-0.014, 0.022, 0.012], 0.003, 0.0018), cone(x, y, az, [-0.014, 0.022, 0.012], [-0.006, 0.001, 0.013], 0.0014, 0.001))   // 后腿
    d = Math.min(d, cone(x, y, az, [0.016, 0.008, 0.004], [0.02, 0.0, 0.009], 0.0009, 0.0008), cone(x, y, az, [0.01, 0.008, 0.004], [0.006, 0.0, 0.01], 0.0009, 0.0008))
    d = Math.min(d, cone(x, y, az, [0.028, 0.016, 0.002], [0.04, 0.026, 0.008], 0.0006, 0.0004))
    return d
  }
  const color = (p: V3, n: V3): V3 => { let c = mix3(lin('#8f9a45'), lin('#5d6a2a'), sstep(-0.2, 0.8, n[1])); if (Math.abs(p[2]) > 0.007 && p[1] > 0.01) c = mix3(c, lin('#a08c55'), 0.5); return grizzle(p, c, 900, 0.2) }
  return [{ f, lo: [-0.034, -0.001, -0.016], hi: [0.042, 0.03, 0.016], cell, color }]
}
export function Hopper(g: G) {
  const m = useJob('hopper', () => netsAll(hopperShapes(0.0005)), 4)
  if (!m) return null
  return <group {...g}><mesh geometry={m[0]} castShadow><meshPhysicalMaterial vertexColors roughness={0.45} clearcoat={0.4} /></mesh></group>
}

// =====================================================================
// 鼠妇：约 1.4 cm（画大了一点），背上七节甲片一节压一节
// =====================================================================
function liceShapes(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => {
    const base = ell(x, y, z, [0, 0.0, 0], [0.007, 0.0032, 0.0042])
    const ridge = 0.00022 * Math.max(0, Math.sin((x / 0.007) * Math.PI * 3.6)) * sstep(-0.0065, 0.0055, x)
    let d = base + ridge
    d = U(0.0006, d, ell(x, y, z, [0.0068, 0.0004, 0], [0.0016, 0.0014, 0.0026]))
    d = Math.min(d, cone(x, y, Math.abs(z), [0.0074, 0.0006, 0.0014], [0.0098, 0.0012, 0.0036], 0.00025, 0.00015))
    d = Math.max(d, -y - 0.0003)
    return d
  }
  const color = (p: V3, n: V3): V3 => { let c = mix3(lin('#4d4b4a'), lin('#6e6a66'), sstep(0.2, 0.9, n[1])); if (Math.abs(p[2]) > 0.003) c = mix3(c, lin('#a19a8e'), 0.4 * (0.5 + 0.5 * Math.sin(p[0] * 2400))); if (Math.sin((p[0] / 0.007) * Math.PI * 3.6) < -0.7) c = shade(c, 0.7); return c }
  return [{ f, lo: [-0.0078, -0.0006, -0.0055], hi: [0.0105, 0.0042, 0.0055], cell, color }]
}
export function useLouse() { return useJob('louse', () => netsAll(liceShapes(0.00022)), 1) }

// =====================================================================
// 生态瓶里的小鱼（约 4 cm）和螺
// =====================================================================
function fishShapes(cell: number): Shape[] {
  const f = (x: number, y: number, z: number) => {
    let d = ell(x, y, z, [0, 0, 0], [0.018, 0.0065, 0.0035])
    d = U(0.002, d, ell(x, y, z, [-0.022, 0, 0], [0.007, 0.007, 0.0006]), ell(x, y, z, [-0.004, 0.0068, 0], [0.006, 0.0025, 0.0005]), ell(x, y, z, [0.002, -0.005, 0], [0.004, 0.002, 0.0005]))
    return d
  }
  const color = (p: V3, n: V3): V3 => { let c = mix3(lin('#e8e2d2'), lin('#7c7a5a'), sstep(-0.3, 0.6, n[1])); if (p[0] < -0.016) c = lin('#c9a46a'); return c }
  return [{ f, lo: [-0.03, -0.01, -0.006], hi: [0.02, 0.01, 0.006], cell, color }]
}
export function Fish({ dead = false, ...g }: { dead?: boolean } & G) {
  const m = useJob('fish', () => netsAll(fishShapes(0.0006)), 6)
  const r = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (r.current) r.current.rotation.y = dead ? 0 : Math.sin(clock.elapsedTime * 7) * 0.12 })
  if (!m) return null
  return <group {...g}><group ref={r} rotation-z={dead ? Math.PI : 0}><mesh geometry={m[0]}><meshPhysicalMaterial vertexColors roughness={0.25} clearcoat={0.8} metalness={0.15} /></mesh>
    <mesh position={[0.012, 0.0015, 0.0027]}><sphereGeometry args={[0.0016, 8, 6]} /><Eye /></mesh><mesh position={[0.012, 0.0015, -0.0027]}><sphereGeometry args={[0.0016, 8, 6]} /><Eye /></mesh></group></group>
}
