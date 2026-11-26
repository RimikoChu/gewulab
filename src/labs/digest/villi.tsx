// 第 6 课：展台上放大的一段小肠（横躺，可以纵向剖开），内壁一圈圈环形皱襞，皱襞上铺满小肠绒毛；
// 后上方悬着一根再放大的绒毛，纵向剖开：外面一层上皮细胞，里面是毛细血管网（动脉端红、静脉端蓝）和中间的毛细淋巴管。
// 吸收时，肠腔里的葡萄糖（小六边形）、氨基酸（小球）穿过绒毛壁进毛细血管，甘油和脂肪酸（白色三联球、黄色短棒）进毛细淋巴管。
// 都是示意，不按比例。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, disc } from '@/lab-kit'
import { fbm, lin, mix3, noise, type V3 } from './sdf'
import { sweep, tissueBump } from './tube'
import { Magnifier } from './props'
import { ease } from './parts'

/** 展台台面中心（台面高 GUT_AT[1]） */
export const GUT_AT: V3 = [26.5, 5.6, 1.3]
const SEG = { L: 5.2, R: 1.0, r: 0.8, y: 1.35 }       // 小肠段：长、外半径、内半径、轴线比台面高多少
const AX_Y = GUT_AT[1] + SEG.y
/** 放大的那根绒毛：悬在小肠段的后上方 */
export const VIL_AT: V3 = [GUT_AT[0] + 0.3, AX_Y + 3.4, GUT_AT[2] - 1.2]
const VH = 3.0, VR = 0.5

// ---------- 小肠段 ----------
/** 皱襞：沿着轴每隔一段一圈，高低有起伏，有的不满一圈 */
const fold = (x: number, th: number) => { const k = Math.cos((x / 0.62) * Math.PI * 2 + 0.3 * noise(th * 1.5, x, 0)); return 0.2 * Math.max(0, k) ** 5 * (0.55 + 0.45 * (0.5 + 0.5 * noise(th * 2.2 + 4, x * 0.6, 1))) }
const rIn = (x: number, th: number) => SEG.r - fold(x, th) + 0.008 * noise(x * 9, th * 6, 2)
const rOut = (x: number, th: number) => SEG.R + 0.012 * fbm(x * 2, th * 2, 3, 2)
/** 小肠段弯成一段弧（像腹腔里的一个肠袢），弧心在前面：两头的开口斜朝镜头，看得见管壁的厚度和里面的皱襞 */
const RB = 6.5
const bendV = (x: number, y: number, z: number): V3 => { const f = x / RB; return [Math.sin(f) * (RB - z), y, RB - Math.cos(f) * (RB - z)] }
const bendQ = (x: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -x / RB)
const LAYER: [number, string][] = [[0.12, '#c84f58'], [0.32, '#efd6c6'], [0.88, '#b9474c'], [1, '#e3b2a2']]
function layerCol(f: number) { for (const [k, c] of LAYER) if (f <= k) return lin(c); return lin(LAYER[LAYER.length - 1][1]) }
/** 半段管壁（th0 到 th0+π）：内面、外面、两条剖面、两头的端面 */
function halfWall(th0: number, withCut: boolean) {
  const NX = 260, NT = 90, L = SEG.L, pos: number[] = [], col: number[] = [], idx: number[] = []
  const muc = lin('#cf6a6e'), mucL = lin('#ee9e98'), ser = lin('#dc9a88'), serL = lin('#f0c0ae'), vs = lin('#b0424a')
  const grid = (f: (i: number, j: number) => [V3, V3], ni: number, nj: number, flip: boolean) => {
    const base = pos.length / 3
    for (let i = 0; i <= ni; i++) for (let j = 0; j <= nj; j++) { const [p, c] = f(i, j); pos.push(...p); col.push(...c) }
    for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) { const a = base + i * (nj + 1) + j, b = a + nj + 1; if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1) }
  }
  const P = (x: number, th: number, r: number): V3 => [x, Math.cos(th) * r, Math.sin(th) * r]
  // 内面（黏膜）
  grid((i, j) => { const x = -L / 2 + (i / NX) * L, th = th0 + (j / NT) * Math.PI; return [P(x, th, rIn(x, th)), mix3(muc, mucL, 0.4 + fold(x, th) * 3 + 0.3 * noise(x * 6, th * 4, 0))] }, NX, NT, true)
  // 外面（浆膜），淡淡几条血管
  grid((i, j) => { const x = -L / 2 + (i / NX) * L, th = th0 + (j / NT) * Math.PI, v = Math.max(0, 1 - Math.abs(fbm(x * 3, th * 4, 7, 3)) * 30); return [P(x, th, rOut(x, th)), mix3(mix3(ser, serL, 0.5 + 0.5 * fbm(x * 2, th * 2, 1, 2)), vs, v * 0.18)] }, NX, NT, false)
  // 两条剖面：从内到外几层
  if (withCut) for (const th of [th0, th0 + Math.PI]) grid((i, j) => { const x = -L / 2 + (i / NX) * L, f = j / 12, r = rIn(x, th) + (rOut(x, th) - rIn(x, th)) * f; return [P(x, th, r), layerCol(f)] }, NX, 12, th === th0)
  // 两头的端面
  for (const x of [-L / 2, L / 2]) grid((i, j) => { const th = th0 + (i / NT) * Math.PI, f = j / 12, r = rIn(x, th) + (rOut(x, th) - rIn(x, th)) * f; return [P(x, th, r), layerCol(f)] }, NT, 12, x > 0)
  // 贴图坐标：沿轴、绕轴（凹凸贴图用）；然后弯成弧
  const uv = new Float32Array((pos.length / 3) * 2); for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3] * 2; uv[i * 2 + 1] = Math.atan2(pos[i * 3 + 2], pos[i * 3 + 1]) * 2 }
  for (let i = 0; i < pos.length; i += 3) { const b = bendV(pos[i], pos[i + 1], pos[i + 2]); pos[i] = b[0]; pos[i + 1] = b[1]; pos[i + 2] = b[2] }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}
/** 内壁上的绒毛：一根根细小的圆头指头，长在皱襞上和皱襞之间，朝着管腔 */
function villiField() {
  let sd = 91; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  const geo = new THREE.CapsuleGeometry(0.019, 0.05, 3, 6); geo.translate(0, 0.045, 0)
  const mats: THREE.Matrix4[] = [], cols: THREE.Color[] = [], up = new THREE.Vector3(0, 1, 0), a = new THREE.Color('#e0807e'), b = new THREE.Color('#f6b7ac')
  for (let k = 0; k < 16000; k++) {
    const x = -SEG.L / 2 + 0.03 + rnd() * (SEG.L - 0.06), th = Math.PI + 0.05 + rnd() * (Math.PI - 0.1), r = rIn(x, th)
    // 朝内的法线：径向朝里，皱襞的坡上往两边歪一点
    const h = 0.01, slope = (rIn(x + h, th) - rIn(x - h, th)) / (2 * h)
    const n = new THREE.Vector3(slope * 0.8, -Math.cos(th), -Math.sin(th)).normalize()
    const p = new THREE.Vector3(x, Math.cos(th) * r, Math.sin(th) * r)
    const s = 0.8 + rnd() * 0.45
    const bp = bendV(p.x, p.y, p.z)
    mats.push(new THREE.Matrix4().compose(new THREE.Vector3(...bp), bendQ(x).multiply(new THREE.Quaternion().setFromUnitVectors(up, n)), new THREE.Vector3(s, s * (0.85 + rnd() * 0.4), s)))
    cols.push(a.clone().lerp(b, rnd()))
  }
  return { geo, mats, cols }
}

/**
 * 浆膜上的血管和肠系膜：肠系膜是挂在肠管后上方的一片半透明的膜，里面有一条条动脉弓；
 * 从系膜缘发出一根根直小血管，贴着肠壁绕到前面。back 是后半边上的（剖开时不动），front 是前半边上的（跟着拿开）
 */
function vesselsAndMesentery() {
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  const TH_M = Math.PI * 1.72, R = SEG.R + 0.022
  const on = (x: number, th: number, lift = 0): THREE.Vector3 => new THREE.Vector3(...bendV(x, Math.cos(th) * (R + lift), Math.sin(th) * (R + lift)))
  const back: THREE.BufferGeometry[] = [], front: THREE.BufferGeometry[] = []
  const tube = (pts: THREE.Vector3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 6)
  for (let x = -SEG.L / 2 + 0.25; x < SEG.L / 2 - 0.15; x += 0.42 + rnd() * 0.3) {
    for (const dir of [-1, 1]) {
      // dir = −1：从系膜缘往下绕过后面到底下再到前面；+1：往上绕过顶上到前面。每根弯弯曲曲、长短不一，有的分出一个小枝
      const th1 = dir < 0 ? Math.PI : Math.PI * 2, th2 = dir < 0 ? Math.PI * (0.62 + rnd() * 0.25) : Math.PI * (2.38 - rnd() * 0.25)
      const a1 = 0.04 + rnd() * 0.1, f1 = 3 + rnd() * 5, ph = rnd() * 6, drift = (rnd() - 0.5) * 0.35, pB: THREE.Vector3[] = [], pF: THREE.Vector3[] = []
      const xx = (t: number) => x + a1 * Math.sin(t * f1 + ph) + drift * t
      for (let k = 0; k <= 10; k++) { const t = k / 10, th = TH_M + (th1 - TH_M) * t; pB.push(on(xx(t * 0.5), th)) }
      for (let k = 0; k <= 10; k++) { const t = k / 10, th = th1 + (th2 - th1) * t; pF.push(on(xx(0.5 + t * 0.5), th)) }
      back.push(tube(pB, 0.018)); front.push(tube(pF, 0.012 + rnd() * 0.004))
      if (rnd() < 0.6) { const t0 = 0.3 + rnd() * 0.3, thb = th1 + (th2 - th1) * t0, side = rnd() < 0.5 ? -1 : 1, br: THREE.Vector3[] = []
        for (let k = 0; k <= 5; k++) br.push(on(xx(0.5 + t0 * 0.5) + side * k * 0.05, thb + (th2 - th1) * k * 0.05))
        front.push(tube(br, 0.008)) }
    }
  }
  // 系膜里的动脉弓和系膜本身
  const root = (x: number): THREE.Vector3 => { const [bx, by, bz] = bendV(x * 0.6, 1.25, -1.9); return new THREE.Vector3(bx, by, bz) }
  for (let k = 0; k < 6; k++) {
    const xa = -SEG.L / 2 + 0.4 + k * (SEG.L - 0.8) / 5, pts = [root(xa), ...[0.35, 0.7].map(t => root(xa).lerp(on(xa, TH_M, 0.02), t).add(new THREE.Vector3(0, 0.05 * Math.sin(k + t * 5), 0))), on(xa, TH_M)]
    back.push(tube(pts, 0.026))
  }
  back.push(tube(Array.from({ length: 12 }, (_, i) => { const x = -SEG.L / 2 + 0.2 + i * (SEG.L - 0.4) / 11; return on(x, TH_M, 0.02).lerp(root(x), 0.22) }), 0.022))
  // 系膜：从肠管的系膜缘到后上方的根，一片弯的薄膜
  const NX = 40, NY = 10, mp: number[] = [], mi: number[] = []
  for (let i = 0; i <= NX; i++) for (let j = 0; j <= NY; j++) { const x = -SEG.L / 2 + (i / NX) * SEG.L, t = j / NY, p = on(x, TH_M, -0.01).lerp(root(x), t); p.y += 0.12 * Math.sin(t * Math.PI) * Math.sin(i * 0.9); mp.push(p.x, p.y, p.z) }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const a = i * (NY + 1) + j, b = a + NY + 1; mi.push(a, b, a + 1, b, b + 1, a + 1) }
  const mes = new THREE.BufferGeometry(); mes.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); mes.setIndex(mi); mes.computeVertexNormals()
  return { back: mergeGeometries(back), front: mergeGeometries(front), mes }
}

// ---------- 放大的绒毛 ----------
/** 绒毛的外形：手指样，底宽、顶圆，表面略有起伏 */
const vProfile = (y: number) => { const t = y / VH; return VR * (t > 0.86 ? Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) : 1) * (1 + 0.12 * (1 - t) ** 3) }
/** 上皮细胞：一排排柱状细胞的边界，顶上一层刷状缘 */
function epiTex() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!; g.fillStyle = '#f0b2aa'; g.fillRect(0, 0, W, H)
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let row = 0; row < 8; row++) for (let i = 0; i < 26; i++) {
    const x = i * (W / 26) + (row % 2) * 10, y = row * (H / 8)
    g.fillStyle = `rgba(${200 + rnd() * 40},${110 + rnd() * 40},${110 + rnd() * 30},0.55)`; g.fillRect(x + 1, y + 1, W / 26 - 2, H / 8 - 2)
    g.fillStyle = 'rgba(120,60,110,0.55)'; g.beginPath(); g.ellipse(x + W / 52, y + H / 16, 4, 6, 0, 0, Math.PI * 2); g.fill()
  }
  g.strokeStyle = 'rgba(150,60,70,0.55)'; g.lineWidth = 1.5
  for (let i = 0; i <= 26; i++) { g.beginPath(); g.moveTo(i * W / 26, 0); g.lineTo(i * W / 26, H); g.stroke() }
  for (let r = 0; r <= 8; r++) { g.beginPath(); g.moveTo(0, r * H / 8); g.lineTo(W, r * H / 8); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 6); t.anisotropy = 8; return t
}
/** 绒毛里的管子：毛细血管从底部的小动脉上去，在顶上绕成网，再从小静脉下来；中间一根毛细淋巴管，顶端是封闭的 */
function vesselCurves() {
  const art: THREE.Vector3[] = [], ven: THREE.Vector3[] = []
  // 一条在剖面上来回绕的毛细血管：左边上去（动脉端），右边下来（静脉端）
  for (let i = 0; i <= 40; i++) { const t = i / 40, y = -0.2 + t * (VH * 0.9), r = vProfile(Math.max(0, y)) * 0.72; art.push(new THREE.Vector3(-r + 0.06 * Math.sin(t * 22), y, 0.04 + 0.02 * Math.sin(t * 13))) }
  for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI, y = VH * 0.88 + Math.sin(a) * 0.12; art.push(new THREE.Vector3(Math.cos(a) * vProfile(y) * 0.72, y, 0.05)) }
  for (let i = 0; i <= 40; i++) { const t = i / 40, y = VH * 0.88 - t * (VH * 0.88 + 0.2), r = vProfile(Math.max(0, y)) * 0.72; ven.push(new THREE.Vector3(r - 0.06 * Math.sin(t * 22 + 1), y, 0.04 + 0.02 * Math.sin(t * 11))) }
  // 中间几道横着连过去的细支
  const rungs = [0.5, 1.0, 1.5, 2.0].map(y => { const r = vProfile(y) * 0.72; return new THREE.CatmullRomCurve3([new THREE.Vector3(-r, y, 0.04), new THREE.Vector3(-r * 0.4, y + 0.12, 0.08), new THREE.Vector3(r * 0.4, y + 0.06, 0.08), new THREE.Vector3(r, y + 0.18, 0.04)]) })
  const lacteal = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.3, 0.07), new THREE.Vector3(0.02, 1.0, 0.08), new THREE.Vector3(-0.02, 2.0, 0.08), new THREE.Vector3(0, VH * 0.78, 0.07)])
  return { art: new THREE.CatmullRomCurve3(art.slice(0, 41)), top: new THREE.CatmullRomCurve3(art.slice(40)), ven: new THREE.CatmullRomCurve3(ven), rungs, lacteal }
}

/** 第 6 课交给世界的：剖开小肠（0–1）、吸收的进度（0–1，大于 0 后一直在吸收） */
export interface GutWant { cut: number; absorb: number; zoom?: boolean }

export function GutModel({ want }: { want?: GutWant }) {
  const w = want ?? { cut: 0, absorb: 0, zoom: false }
  const G = useMemo(() => {
    const V = vesselCurves()
    const pts: V3[] = []; for (let i = 0; i <= 30; i++) { const y = (i / 30) * VH; pts.push([vProfile(y), y, 0]) }
    // 绒毛：后半边的外壳（上皮）和剖面
    const shellG = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 64, Math.PI / 2, Math.PI)
    const cutShape = new THREE.Shape(); cutShape.moveTo(-pts[0][0], 0); pts.forEach(p => cutShape.lineTo(p[0], p[1])); [...pts].reverse().forEach(p => cutShape.lineTo(-p[0], p[1]))
    const cut = new THREE.ShapeGeometry(cutShape, 32)
    // 剖面的颜色：贴着外缘一圈深一点（上皮），里面是浅粉的固有层
    const cp = cut.attributes.position, cc = new Float32Array(cp.count * 3)
    for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i), edge = vProfile(Math.max(0, y)) - Math.abs(x), c = edge < 0.07 ? lin('#d6707a') : mix3(lin('#f3cfc4'), lin('#e8b0a8'), 0.5 + 0.5 * noise(x * 6, y * 6, 0)); cc[i * 3] = c[0]; cc[i * 3 + 1] = c[1]; cc[i * 3 + 2] = c[2] }
    cut.setAttribute('color', new THREE.BufferAttribute(cc, 3))
    const tube = (c: THREE.Curve<THREE.Vector3>, r: number, col: string, n = 80) => sweep(c, { segs: n, radial: 10, r: () => r, caps: true, color: () => lin(col) })
    const red = '#c8323c', blue = '#4a5fb0'
    const vessels = mergeGeometries([tube(V.art, 0.045, red), tube(V.top, 0.045, '#8a4a7a', 30), tube(V.ven, 0.045, blue), ...V.rungs.map((c, i) => tube(c, 0.03, i < 2 ? red : '#8a4a7a', 30))])
    const lacteal = sweep(V.lacteal, { segs: 60, radial: 14, r: t => 0.1 * (t > 0.92 ? Math.sqrt(Math.max(0.05, 1 - ((t - 0.92) / 0.08) ** 2)) : 1), caps: true, color: () => lin('#fff4cc') })
    // 底下一小块肠壁，旁边几根半透明的邻居
    const base = new THREE.CylinderGeometry(1.25, 1.35, 0.5, 48, 1, false, Math.PI / 2, Math.PI)
    return { V, shellG, cut, vessels, lacteal, base, wallB: halfWall(Math.PI, true), wallF: halfWall(0, true), villi: villiField(), ves: vesselsAndMesentery() }
  }, [])
  const epi = useMemo(() => epiTex(), [])
  const villiRef = useRef<THREE.InstancedMesh>(null)
  const built = useRef(false)
  const frontRef = useRef<THREE.Group>(null)
  const wallMat = useMemo(() => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.5, sheenColor: new THREE.Color('#ffb8a8'), bumpMap: tissueBump(), bumpScale: 0.7, side: THREE.DoubleSide, transparent: true }), [])
  const frontMat = useMemo(() => wallMat.clone(), [wallMat])
  const vesF = useRef<THREE.MeshPhysicalMaterial>(null)
  // 吸收：一批小分子从绒毛上方落到表面，穿过去，再顺着血管或淋巴管往下走
  const P = useMemo(() => {
    let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    return Array.from({ length: 36 }, (_, i) => ({ kind: i % 3 === 0 ? 'fat' : i % 3 === 1 ? 'glu' : 'amino', ph: rnd(), y: 0.6 + rnd() * 1.9, sp: 0.07 + rnd() * 0.04 }))
  }, [])
  const ref = { glu: useRef<THREE.InstancedMesh>(null), amino: useRef<THREE.InstancedMesh>(null), fat: useRef<THREE.InstancedMesh>(null) }
  const tmp = useMemo(() => ({ M: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), v: new THREE.Vector3() }), [])
  const clock0 = useRef(0)
  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 1 / 30)
    if (!built.current && villiRef.current) { G.villi.mats.forEach((m, i) => { villiRef.current!.setMatrixAt(i, m); villiRef.current!.setColorAt(i, G.villi.cols[i]) }); villiRef.current.instanceMatrix.needsUpdate = true; if (villiRef.current.instanceColor) villiRef.current.instanceColor.needsUpdate = true; built.current = true }
    const e = ease(w.cut)
    if (frontRef.current) { frontRef.current.position.set(0, 1.4 * e, 1.6 * e); frontRef.current.visible = e < 0.99 }
    frontMat.opacity = 1 - e; if (vesF.current) vesF.current.opacity = 1 - e
    // 小分子
    if (w.absorb > 0) clock0.current += dt
    const T = clock0.current, { M, q, s, v } = tmp, cnt = { glu: 0, amino: 0, fat: 0 }
    for (const p of P) {
      const f = (T * p.sp + p.ph) % 1, k = p.kind as 'glu' | 'amino' | 'fat', m = ref[k].current; if (!m) continue
      // 葡萄糖、氨基酸从右边进来，进毛细血管（静脉端）往下流走；甘油和脂肪酸从左边进来，进中间的毛细淋巴管往下走
      const side = k === 'fat' ? -1 : 1, yIn = p.y, surf = vProfile(yIn) + 0.18
      if (w.absorb <= 0) { s.setScalar(0); m.setMatrixAt(cnt[k]++, M.compose(v.set(0, 0, 0), q, s)); continue }
      if (f < 0.35) { const a = ease(f / 0.35); v.set(side * (surf + 0.9 * (1 - a)), yIn + 0.4 * (1 - a), 0.12 + 0.3 * (1 - a)) }
      else if (f < 0.5) { const a = ease((f - 0.35) / 0.15), tgt = k === 'fat' ? 0.0 : vProfile(yIn) * 0.72; v.set(side * surf + (tgt - side * surf) * a, yIn, 0.12) }
      else {
        const a = (f - 0.5) / 0.5
        if (k === 'fat') { const u0 = (yIn + 0.3) / (VH * 0.78 + 0.3); G.V.lacteal.getPointAt(Math.min(1, Math.max(0, u0 * (1 - a))), v) }
        else { const u0 = (VH * 0.88 - yIn) / (VH * 0.88 + 0.2); G.V.ven.getPointAt(Math.min(1, Math.max(0, u0 + (1 - u0) * a)), v) }
        v.z += 0.1
      }
      s.setScalar(f > 0.92 ? (1 - f) / 0.08 : 1)
      q.setFromAxisAngle(tmp.v.clone().set(0, 0, 1), T * 0.8 + p.ph * 6)
      m.setMatrixAt(cnt[k]++, M.compose(v, q, s))
    }
    for (const r of Object.values(ref)) if (r.current) r.current.instanceMatrix.needsUpdate = true
  })
  const nOf = (k: string) => P.filter(p => p.kind === k).length
  const hex = useMemo(() => { const g = new THREE.CylinderGeometry(0.07, 0.07, 0.03, 6); g.rotateX(Math.PI / 2); return g }, [])
  const fatG = useMemo(() => mergeGeometries([(() => { const g = new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6); g.translate(0.03, 0, 0); return g })(), (() => { const g = new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6); g.translate(-0.03, 0.02, 0); return g })(), new THREE.SphereGeometry(0.04, 12, 8)]), [])
  const standBase = useMemo(() => disc(0.5, 0.07, { chamfer: 0.02, segs: 48 }), [])
  const holderY = AX_Y - SEG.R - 0.05
  return <group>
    {/* 小肠段：架在两个透明托架上 */}
    <group position={[GUT_AT[0], AX_Y, GUT_AT[2]]}>
      <mesh geometry={G.wallB} material={wallMat} castShadow receiveShadow />
      <instancedMesh ref={villiRef} args={[G.villi.geo, undefined, G.villi.mats.length]} castShadow><meshPhysicalMaterial roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} sheen={0.6} sheenColor="#ffc8bc" /></instancedMesh>
      <mesh geometry={G.ves.back}><meshPhysicalMaterial color="#a8303a" roughness={0.35} clearcoat={0.8} /></mesh>
      <mesh geometry={G.ves.mes}><meshPhysicalMaterial color="#f0d6a8" roughness={0.4} clearcoat={0.6} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} sheen={0.5} sheenColor="#fff4d8" /></mesh>
      <group ref={frontRef}>
        <mesh geometry={G.wallF} material={frontMat} />
        <mesh geometry={G.ves.front}><meshPhysicalMaterial color="#a8303a" roughness={0.35} clearcoat={0.8} transparent opacity={1} ref={vesF} /></mesh>
      </group>
    </group>
    {[-1.7, 1.7].map(x => <mesh key={x} position={[GUT_AT[0] + bendV(x, 0, 0)[0], (GUT_AT[1] + holderY) / 2 + 0.05, GUT_AT[2] + bendV(x, 0, 0)[2]]} rotation-y={-x / RB}><boxGeometry args={[0.1, holderY - GUT_AT[1] + 0.1, 1.2]} /><meshPhysicalMaterial color="#e3f1f4" transparent opacity={0.3} roughness={0.05} clearcoat={1} /></mesh>)}
    {/* 放大的绒毛 */}
    <group position={VIL_AT}>
      <mesh geometry={G.base} position={[0, -0.25, 0]}><meshPhysicalMaterial color="#d77c7c" roughness={0.45} clearcoat={0.7} bumpMap={tissueBump()} bumpScale={1} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.0, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[VR * 1.05, 1.25, 48, 1, 0, Math.PI]} /><meshPhysicalMaterial color="#cf6f72" roughness={0.4} clearcoat={0.8} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={G.shellG} castShadow><meshPhysicalMaterial map={epi} roughness={0.42} clearcoat={0.7} clearcoatRoughness={0.25} sheen={0.5} sheenColor="#ffd0c8" side={THREE.DoubleSide} /></mesh>
      <mesh geometry={G.cut} position={[0, 0, 0.001]}><meshStandardMaterial vertexColors roughness={0.6} /></mesh>
      <mesh geometry={G.vessels}><meshPhysicalMaterial vertexColors roughness={0.35} clearcoat={0.8} /></mesh>
      <mesh geometry={G.lacteal}><meshPhysicalMaterial vertexColors roughness={0.3} clearcoat={0.9} emissive="#3a3320" /></mesh>
      <instancedMesh ref={ref.glu} args={[hex, undefined, nOf('glu')]}><meshPhysicalMaterial color="#f2e8c8" roughness={0.3} clearcoat={0.7} emissive="#3a2e10" /></instancedMesh>
      <instancedMesh ref={ref.amino} args={[useMemo(() => new THREE.IcosahedronGeometry(0.06, 2), []), undefined, nOf('amino')]}><meshPhysicalMaterial color="#e86a6a" roughness={0.3} clearcoat={0.8} /></instancedMesh>
      <instancedMesh ref={ref.fat} args={[fatG, undefined, nOf('fat')]}><meshPhysicalMaterial color="#f2bc40" roughness={0.3} clearcoat={0.8} /></instancedMesh>
    </group>
    <Magnifier at={[VIL_AT[0], VIL_AT[1] + VH * 0.45, VIL_AT[2]]} site={[GUT_AT[0] + 0.3, AX_Y - SEG.r + 0.25, GUT_AT[2] - 0.35]} r={2.1} line={!!w.zoom} />
    {/* 悬挂绒毛模型的细杆 */}
    <mesh geometry={standBase} position={[VIL_AT[0], GUT_AT[1], VIL_AT[2] - 0.9]} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh position={[VIL_AT[0], (GUT_AT[1] + VIL_AT[1] - 0.5) / 2, VIL_AT[2] - 0.9]}><cylinderGeometry args={[0.035, 0.04, VIL_AT[1] - 0.5 - GUT_AT[1], 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[VIL_AT[0], VIL_AT[1] - 0.5, VIL_AT[2] - 0.45]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.9, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
  </group>
}
/** 小肠段内壁上一点（世界坐标），标签用 */
export const gutWall = (x: number, th: number): V3 => { const b = bendV(x, Math.cos(th) * rIn(x, th), Math.sin(th) * rIn(x, th)); return [GUT_AT[0] + b[0], AX_Y + b[1], GUT_AT[2] + b[2]] }
export { VH as VILLUS_H, VR as VILLUS_R }
