// 岛上的兔和狐。用距离场造型（椭球、圆锥台平滑地融在一起），按真实的比例和轮廓做：兔子坐着、后腿长、耳朵尖发黑；
// 狐狸尖嘴大耳、白下巴、黑“袜子”、尾巴尖白。数量多，所以都用实例化：一群兔是一个模型画几百遍，
// 每只自己隔一会儿跳一步；狐的身体、腿、尾巴各是一组实例，走路时四条腿按次序摆。
// 模型坐标：x 朝前（头的方向），y 朝上；原点在两脚之间的地面上。单位 m。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { U, cone, ell, fbm, lin, mix3, netsAll, shade, smin, sstep, ssub, type Shape, type V3 } from './sdf'
import { useJob } from './job'
import { fuse, makeFur, rng, tint } from './parts'

const grizzle = (p: V3, c: V3, f = 70, a = 0.22): V3 => shade(c, 1 - a / 2 + a * (0.5 + 0.5 * fbm(p[0] * f, p[1] * f, p[2] * f, 2)))
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

// =====================================================================
// 合成一只：兔的身体、两只耳朵、眼睛并成一个模型，一群兔才能一次画完
// =====================================================================
const EYE = lin('#0d0907')
function eyeGeo(at: V3, r: number, flat: V3) { const g = new THREE.SphereGeometry(r, 10, 8); g.scale(...flat); g.translate(...at); return tint(g, new THREE.Color(...EYE)) }
function* rabbitJob(cell: number): Generator<void, THREE.BufferGeometry> {
  const [body] = yield* netsAll(rabbitShapes(cell))
  const [ear] = yield* netsAll(earShapes(0.115, 0.024, cell * 0.42, lin('#1e1812'), lin('#c39a8a'), lin('#8a7558')))
  const parts = [body]
  for (const s of [1, -1]) {
    const m = new THREE.Matrix4().makeTranslation(0.128, 0.29, s * 0.024)
      .multiply(new THREE.Matrix4().makeRotationX(s * -0.28)).multiply(new THREE.Matrix4().makeRotationZ(0.34)).multiply(new THREE.Matrix4().makeRotationY(s > 0 ? Math.PI * 0.2 : Math.PI * 0.8))
    parts.push(ear.clone().applyMatrix4(m)); parts.push(eyeGeo([0.176, 0.259, s * 0.042], 0.0105, [1, 1, 0.75]))
  }
  yield
  const g = fuse(parts); g.computeBoundingSphere()
  return g
}
function* foxJob(cell: number): Generator<void, THREE.BufferGeometry[]> {
  const s = quadShapes(FOX, cell), [body, fleg, hleg, tail] = yield* netsAll([s.body, s.fleg, s.hleg, s.tail])
  const b = fuse([body, eyeGeo([0.428, 0.459, 0.034], 0.0105, [1, 0.72, 1]), eyeGeo([0.428, 0.459, -0.034], 0.0105, [1, 0.72, 1])])
  return [b, fleg, hleg, tail]
}

/** 一片活动的范围：中心和两个半轴（m） */
export interface Area { x: number; z: number; rx: number; rz: number; az?: number }
/** 范围里的一点：u 沿左右（-1 到 1），v 沿前后；az 是这片范围朝哪个方向（和机位的方位角一致） */
export const inArea = (A: Area, u: number, v: number): [number, number] => { const c = Math.cos(A.az ?? 0), s = Math.sin(A.az ?? 0), a = u * A.rx, b = v * A.rz; return [A.x + a * c + b * s, A.z - a * s + b * c] }
type Ground = (x: number, z: number) => number
const TAU = Math.PI * 2

/**
 * 一群兔：n 是现在有几只（多出来的缩小消失，新来的长出来），max 是最多几只。
 * goals[i]：第 i 只要去的地方，没有就在自己的窝附近随便跳；tags[i]：戴不戴耳标；sizes[i]：个头；shades[i]：毛色深浅。
 */
/** 围栏的门：圈的中心和半径，门外、门里各一个落脚点。进出围栏的兔都从门走 */
export interface Gate { cx: number; cz: number; R: number; out: [number, number]; in: [number, number] }
export function RabbitHerd({ n, max, area, ground, scale = 1.6, seed = 1, lo = false, goals, tags, sizes, shades, shadow = true, gate, onArrive, grow = false }: {
  n: number; max: number; area: Area; ground: Ground; scale?: number; seed?: number; lo?: boolean
  goals?: (readonly [number, number] | null | undefined)[]; tags?: boolean[]; sizes?: number[]; shades?: number[]; shadow?: boolean
  gate?: Gate; onArrive?: (n: number) => void
  /** 先来的在中间，后来的一圈圈往外住（数量增长的课用） */
  grow?: boolean
}) {
  const cell = lo ? 0.008 : 0.0068
  const geo = useJob(`rabbit-one-${cell}`, () => rabbitJob(cell), lo ? 3 : 2)
  const fur = useMemo(() => makeFur({ grain: 320, sheen: 0.08, rough: 0.95, tone: 0.34, bump: 0.6 }), [])
  const tagGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.042, 0.042, 0.014, 14); g.rotateX(Math.PI / 2); return g }, [])
  const mesh = useRef<THREE.InstancedMesh>(null), tagMesh = useRef<THREE.InstancedMesh>(null)
  const live = useRef({ n, goals, tags, sizes, onArrive }); live.current = { n, goals, tags, sizes, onArrive }
  const tick = useRef(0)
  const S = useMemo(() => {
    const r = rng(seed * 7919 + 11), hx = new Float32Array(max), hz = new Float32Array(max)
    for (let i = 0; i < max; i++) { const a = grow ? i * 2.39996 + r() * 0.5 : r() * TAU, d = grow ? Math.sqrt((i + 0.4 + r() * 0.5) / max) : Math.sqrt(r()); [hx[i], hz[i]] = inArea(area, Math.cos(a) * d, Math.sin(a) * d) }
    return {
      r, hx, hz, x: Float32Array.from(hx), z: Float32Array.from(hz), fx: Float32Array.from(hx), fz: Float32Array.from(hz), tx: Float32Array.from(hx), tz: Float32Array.from(hz),
      yaw: Float32Array.from({ length: max }, () => r() * TAU), yawT: new Float32Array(max), hop: new Float32Array(max).fill(-1), rest: Float32Array.from({ length: max }, () => r() * 3), s: new Float32Array(max), ph: Float32Array.from({ length: max }, () => r() * 10), delay: new Float32Array(max),
    }
  }, [max, seed, area.x, area.z, area.rx, area.rz, area.az, grow])
  // 要进出围栏的兔排成一队：离门近的先走，后面的隔一会儿再动身
  useEffect(() => {
    if (!gate) return
    const q: [number, number][] = []
    for (let i = 0; i < max; i++) {
      const f = goals?.[i], inside = Math.hypot(S.x[i] - gate.cx, S.z[i] - gate.cz) < gate.R, destIn = !!f && Math.hypot(f[0] - gate.cx, f[1] - gate.cz) < gate.R
      S.delay[i] = 0
      if (inside !== destIn) { const g = inside ? gate.in : gate.out; q.push([i, Math.hypot(S.x[i] - g[0], S.z[i] - g[1])]) }
    }
    q.sort((a, b) => a[1] - b[1]).forEach(([i], k) => { S.delay[i] = k * 0.24 })
  }, [goals, gate, S, max])
  useEffect(() => { for (let i = 0; i < max; i++) S.yawT[i] = S.yaw[i] }, [S, max])
  // 毛色深浅：老兔暗一些
  useEffect(() => {
    const m = mesh.current; if (!m || !geo) return
    const c = new THREE.Color()
    for (let i = 0; i < max; i++) { const k = shades?.[i] ?? 1; m.setColorAt(i, c.setRGB(k, k, k * (k < 1 ? 1.06 : 1))) }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [geo, shades, max])
  const M = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), sc: new THREE.Vector3(), t: new THREE.Matrix4(), zero: new THREE.Matrix4().makeScale(0, 0, 0) }), [])
  useFrame((_, dtRaw) => {
    const im = mesh.current; if (!im) return
    const dt = Math.min(0.05, dtRaw), L = live.current, { r } = S, tm = tagMesh.current
    let nt = 0, arrived = 0
    for (let i = 0; i < max; i++) {
      const want = i < L.n ? 1 : 0
      S.s[i] += Math.sign(want - S.s[i]) * Math.min(Math.abs(want - S.s[i]), dt * 2.2)
      if (S.s[i] < 0.01) { im.setMatrixAt(i, M.zero); continue }
      const final = L.goals?.[i], k = scale * (L.sizes?.[i] ?? 1)
      if (final && Math.hypot(final[0] - S.x[i], final[1] - S.z[i]) < 0.3) arrived++
      // 要进出围栏的，先去门口
      let goal = final
      if (gate) {
        const inside = Math.hypot(S.x[i] - gate.cx, S.z[i] - gate.cz) < gate.R, destIn = !!final && Math.hypot(final[0] - gate.cx, final[1] - gate.cz) < gate.R
        if (destIn && !inside) goal = Math.hypot(S.x[i] - gate.out[0], S.z[i] - gate.out[1]) > 0.7 ? gate.out : gate.in
        else if (inside && !destIn) goal = Math.hypot(S.x[i] - gate.in[0], S.z[i] - gate.in[1]) > 0.7 ? gate.in : gate.out
      }
      let y = 0, pitch = 0, squash = 1
      if (S.delay[i] > 0 && S.hop[i] < 0) S.delay[i] -= dt
      if (S.hop[i] >= 0) {
        S.hop[i] += dt / 0.34
        const u = Math.min(1, S.hop[i]), e = u * u * (3 - 2 * u)
        S.x[i] = S.fx[i] + (S.tx[i] - S.fx[i]) * e; S.z[i] = S.fz[i] + (S.tz[i] - S.fz[i]) * e
        y = Math.sin(u * Math.PI) * 0.13 * k; pitch = Math.cos(u * Math.PI) * 0.22; squash = 1 + Math.sin(u * Math.PI) * 0.1
        if (u >= 1) { S.hop[i] = -1; S.rest[i] = goal ? 0.04 + r() * 0.16 : 0.5 + r() * r() * 5 }
      } else {
        S.rest[i] -= dt
        if (S.rest[i] <= 0 && S.delay[i] <= 0) {
          let dx: number, dz: number, step: number
          if (goal) {
            dx = goal[0] - S.x[i]; dz = goal[1] - S.z[i]; const d = Math.hypot(dx, dz)
            if (d < 0.12) { S.rest[i] = 0.8 + r() * 2; S.yawT[i] += (r() - 0.5) * 1.2; dx = 0; dz = 0; step = 0 } else { step = Math.min(d, (0.75 + r() * 0.35) * k); dx /= d; dz /= d }
          } else {
            const ox = S.hx[i] - S.x[i], oz = S.hz[i] - S.z[i], far = Math.hypot(ox, oz)
            const a = far > 1.1 * k ? Math.atan2(oz, ox) + (r() - 0.5) * 0.8 : r() * TAU
            dx = Math.cos(a); dz = Math.sin(a); step = (0.28 + r() * 0.36) * k
          }
          if (step > 0) { S.fx[i] = S.x[i]; S.fz[i] = S.z[i]; S.tx[i] = S.x[i] + dx * step; S.tz[i] = S.z[i] + dz * step; S.yawT[i] = Math.atan2(-dz, dx); S.hop[i] = 0 }
        }
      }
      // 转身：朝目标方向慢慢转过去
      let dy = S.yawT[i] - S.yaw[i]; dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI; S.yaw[i] += dy * Math.min(1, dt * 9)
      const sc = k * S.s[i], breathe = 1 + Math.sin(performance.now() * 0.003 + S.ph[i]) * 0.008
      M.m.compose(M.p.set(S.x[i], ground(S.x[i], S.z[i]) + y, S.z[i]), M.q.setFromEuler(M.e.set(0, S.yaw[i], pitch, 'YZX')), M.sc.set(sc * squash, sc * (2 - squash) * breathe, sc))
      im.setMatrixAt(i, M.m)
      if (tm && L.tags?.[i]) { for (const s of [1, -1]) { M.t.makeTranslation(0.095, 0.37, s * 0.056); tm.setMatrixAt(nt++, M.t.premultiply(M.m)) } }
    }
    im.instanceMatrix.needsUpdate = true
    if (tm) { tm.count = nt; tm.instanceMatrix.needsUpdate = true }
    tick.current += dt; if (tick.current > 0.4) { tick.current = 0; L.onArrive?.(arrived) }
  })
  if (!geo) return null
  return <>
    <instancedMesh ref={mesh} args={[geo, fur, max]} castShadow={shadow} receiveShadow frustumCulled={false} />
    {tags && <instancedMesh ref={tagMesh} args={[tagGeo, undefined, max * 2]} frustumCulled={false}><meshStandardMaterial color="#ff7a1a" emissive="#ff5a00" emissiveIntensity={1.6} roughness={0.5} /></instancedMesh>}
  </>
}

/** 走路时四条腿的相位：左后、左前、右后、右前依次落地 */
const GAIT = [0.25, 0.75, 0, 0.5]
const LEG_AT: V3[] = [[0.19, 0.32, 0.058], [0.19, 0.32, -0.058], [-0.2, 0.32, 0.058], [-0.2, 0.32, -0.058]]
/** 一群狐：在范围里走走停停。n 是现在有几只，max 是最多几只 */
export function FoxPack({ n, max, area, ground, scale = 1.6, seed = 1, lo = false }: { n: number; max: number; area: Area; ground: Ground; scale?: number; seed?: number; lo?: boolean }) {
  const cell = lo ? 0.011 : 0.0075
  const geo = useJob(`fox-one-${cell}`, () => foxJob(cell), 3)
  const fur = useMemo(() => makeFur({ grain: 240, bump: 0.45, sheen: 0.3 }), [])
  const body = useRef<THREE.InstancedMesh>(null), fleg = useRef<THREE.InstancedMesh>(null), hleg = useRef<THREE.InstancedMesh>(null), tail = useRef<THREE.InstancedMesh>(null)
  const live = useRef(n); live.current = n
  const S = useMemo(() => {
    const r = rng(seed * 104729 + 5), pick = (): [number, number] => { const a = r() * TAU, d = Math.sqrt(r()); return inArea(area, Math.cos(a) * d, Math.sin(a) * d) }
    const x = new Float32Array(max), z = new Float32Array(max), tx = new Float32Array(max), tz = new Float32Array(max)
    for (let i = 0; i < max; i++) { [x[i], z[i]] = pick(); [tx[i], tz[i]] = pick() }
    return { r, pick, x, z, tx, tz, yaw: Float32Array.from({ length: max }, () => r() * TAU), wait: Float32Array.from({ length: max }, () => r() * 4), walk: new Float32Array(max), s: new Float32Array(max), ph: Float32Array.from({ length: max }, () => r() * 10) }
  }, [max, seed, area.x, area.z, area.rx, area.rz, area.az])
  const M = useMemo(() => ({ root: new THREE.Matrix4(), m: new THREE.Matrix4(), l: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), sc: new THREE.Vector3(), zero: new THREE.Matrix4().makeScale(0, 0, 0) }), [])
  useFrame(({ clock }, dtRaw) => {
    const b = body.current, f = fleg.current, h = hleg.current, t = tail.current; if (!b || !f || !h || !t) return
    const dt = Math.min(0.05, dtRaw), now = clock.elapsedTime
    for (let i = 0; i < max; i++) {
      const want = i < live.current ? 1 : 0
      S.s[i] += Math.sign(want - S.s[i]) * Math.min(Math.abs(want - S.s[i]), dt * 1.6)
      if (S.s[i] < 0.01) { b.setMatrixAt(i, M.zero); t.setMatrixAt(i, M.zero); for (const k of [0, 1]) { f.setMatrixAt(i * 2 + k, M.zero); h.setMatrixAt(i * 2 + k, M.zero) } continue }
      let moving = false
      if (S.wait[i] > 0) S.wait[i] -= dt
      else {
        const dx = S.tx[i] - S.x[i], dz = S.tz[i] - S.z[i], d = Math.hypot(dx, dz)
        if (d < 0.15) { S.wait[i] = 1 + S.r() * 5; [S.tx[i], S.tz[i]] = S.pick() }
        else {
          moving = true
          let dy = Math.atan2(-dz, dx) - S.yaw[i]; dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI; S.yaw[i] += dy * Math.min(1, dt * 3.5)
          const v = 0.62 * scale * Math.max(0.25, 1 - Math.abs(dy)); S.x[i] += Math.cos(S.yaw[i]) * v * dt; S.z[i] -= Math.sin(S.yaw[i]) * v * dt; S.walk[i] += dt * 1.25
        }
      }
      const k = scale * S.s[i], bob = moving ? Math.abs(Math.sin(S.walk[i] * TAU)) * 0.012 : 0
      M.root.compose(M.p.set(S.x[i], ground(S.x[i], S.z[i]) + bob * k, S.z[i]), M.q.setFromEuler(M.e.set(0, S.yaw[i], 0)), M.sc.set(k, k * (1 + Math.sin(now * 2.2 + S.ph[i]) * 0.004), k))
      b.setMatrixAt(i, M.root)
      LEG_AT.forEach((at, j) => {
        const sw = moving ? Math.sin((S.walk[i] + GAIT[j]) * TAU) * 0.34 * (j < 2 ? 1 : -1) : 0
        M.l.makeRotationZ(sw).setPosition(at[0], at[1], at[2]); M.m.multiplyMatrices(M.root, M.l)
        ;(j < 2 ? f : h).setMatrixAt(i * 2 + (j % 2), M.m)
      })
      M.l.makeRotationFromEuler(M.e.set(0, Math.sin(now * 1.1 + S.ph[i]) * 0.14, (moving ? 0.15 : 0) + Math.sin(now * 0.7 + S.ph[i]) * 0.04)).setPosition(-0.29, 0.33, 0)
      t.setMatrixAt(i, M.m.multiplyMatrices(M.root, M.l))
    }
    for (const im of [b, f, h, t]) im.instanceMatrix.needsUpdate = true
  })
  if (!geo) return null
  return <>
    <instancedMesh ref={body} args={[geo[0], fur, max]} castShadow receiveShadow frustumCulled={false} />
    <instancedMesh ref={fleg} args={[geo[1], fur, max * 2]} castShadow frustumCulled={false} />
    <instancedMesh ref={hleg} args={[geo[2], fur, max * 2]} castShadow frustumCulled={false} />
    <instancedMesh ref={tail} args={[geo[3], fur, max]} castShadow frustumCulled={false} />
  </>
}
