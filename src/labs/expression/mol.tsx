// 基因的表达 · 分子模型：核苷酸（脱氧核糖/核糖、磷酸、碱基）的棒状模型，各种酶、核糖体、tRNA、氨基酸、遗传密码表。
// 碱基颜色全实验室统一：A 红、T 黄、G 绿、C 蓝、U 紫；嘌呤（A、G）画得长，嘧啶画得短；A—T 两根氢键，G—C 三根。
// 核苷酸很多而且一直在动，用实例化模型：每帧由各课给出的位置表重排一遍。字母是始终朝向镜头的小牌子。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { AA_NAME, CODE, hBonds, type Base } from './physics'
import { fbm, type V3 } from './kit'

export const BASE_COLOR: Record<Base, string> = { A: '#e5524b', T: '#ecc540', G: '#3fae5c', C: '#3d7fd6', U: '#a46ae0' }
/** 链的颜色：母链（旧链）浅蓝，子链（新链）橙色，mRNA 粉色，tRNA 奶白 */
export const STRAND = { old: '#86b3e8', new: '#f0a052', rna: '#f07fb0', trna: '#eadcb6', dim: '#5d6672' }
export const RISE = 0.62           // 相邻碱基对的间距（示意，拉大了）
export const RAD = 1.05            // 骨架到中轴的距离
export const GAP = 0.12            // 一对碱基之间留给氢键的缝
const SHARE = (b: Base) => (b === 'A' || b === 'G' ? 0.56 : 0.44)
/** 一个碱基从糖到尖端多长（两个配对的碱基正好填满两条骨架之间） */
export const baseLen = (b: Base) => (2 * RAD - GAP) * SHARE(b)

/** 一个核苷酸：s 是糖的位置，e 是碱基尖端；k 是出现的程度（0 不画，1 完整）；c 是这条链的颜色 */
export interface Nt { b: Base; s: V3; e: V3; c: string; k?: number; hi?: number; dim?: number; sz?: number; cut?: boolean; lt?: boolean }
/** 一对碱基之间的氢键：a、b 两个尖端，n 根 */
export interface Bond { a: V3; b: V3; n: number; k?: number }
export interface NtFrame { strands: Nt[][]; bonds?: Bond[] }

// ---------- 字母牌 ----------
const letterTex = new Map<string, THREE.Texture>()
export function letter(ch: string, color = '#ffffff') {
  const key = ch + color
  if (letterTex.has(key)) return letterTex.get(key)!
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  g.font = '800 92px "Geist", ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = 'rgba(8,10,16,0.85)'; g.strokeText(ch, 64, 70)
  g.fillStyle = color; g.fillText(ch, 64, 70)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  letterTex.set(key, t); return t
}

// ---------- 共用的小几何体 ----------
const G = {
  sugar: (() => { const g = new THREE.CylinderGeometry(0.21, 0.21, 0.13, 5); g.rotateX(Math.PI / 2); return g })(),
  base: (() => { const g = new RoundedBoxGeometry(0.44, 1, 0.16, 2, 0.05); g.translate(0, 0.5, 0); return g })(),
  phos: new THREE.SphereGeometry(0.17, 14, 10),
  stick: (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); g.translate(0, 0.5, 0); return g })(),
  plate: new THREE.PlaneGeometry(1, 1),
}
const LETTERS: Base[] = ['A', 'T', 'G', 'C', 'U']
const UP = new THREE.Vector3(0, 1, 0)
const DIM = new THREE.Color('#454c56'), WHITE = new THREE.Color('#ffffff'), PHOS = new THREE.Color('#d9dee6')

/** 一组核苷酸。get 每帧调用一次，返回各条链（链里相邻的核苷酸用磷酸连起来）和氢键。cap：最多画多少个 */
export function NtSet({ get, cap = 160, letters = true, ls = 0.42 }: { get: () => NtFrame; cap?: number; letters?: boolean; ls?: number }) {
  const mk = (geo: THREE.BufferGeometry, n: number, mat: THREE.Material) => {
    const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.castShadow = true
    for (let i = 0; i < n; i++) m.setColorAt(i, WHITE)
    m.count = 0; return m
  }
  const M = useMemo(() => {
    const plastic = (r = 0.42) => new THREE.MeshPhysicalMaterial({ roughness: r, clearcoat: 0.6, clearcoatRoughness: 0.3, metalness: 0 })
    const bondMat = new THREE.MeshBasicMaterial({ color: '#f4f7ff', transparent: true, opacity: 0.85, toneMapped: false })
    return {
      sugar: mk(G.sugar, cap, plastic(0.5)), base: mk(G.base, cap, plastic(0.35)), phos: mk(G.phos, cap, plastic(0.3)),
      stick: mk(G.stick, cap * 2, plastic(0.5)), bond: mk(G.stick, cap * 2, bondMat),
      lets: LETTERS.map(b => { const m = new THREE.InstancedMesh(G.plate, new THREE.MeshBasicMaterial({ map: letter(b), transparent: true, depthWrite: false, toneMapped: false }), cap); m.frustumCulled = false; m.renderOrder = 6; m.count = 0; return m }),
    }
  }, [cap])
  const tmp = useMemo(() => ({ S: new THREE.Vector3(), E: new THREE.Vector3(), D: new THREE.Vector3(), T: new THREE.Vector3(), N: new THREE.Vector3(), P: new THREE.Vector3(), Q: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3(), c: new THREE.Color(), v: new THREE.Vector3(), W: new THREE.Vector3() }), [])
  const stick = (a: THREE.Vector3, b: THREE.Vector3, r: number, i: number, col: THREE.Color, mesh: THREE.InstancedMesh) => {
    const { W, q, sc, m } = tmp
    W.subVectors(b, a); const l = W.length(); if (l < 1e-4) return false
    q.setFromUnitVectors(UP, W.multiplyScalar(1 / l)); sc.set(r, l, r); m.compose(a, q, sc); mesh.setMatrixAt(i, m); mesh.setColorAt(i, col); return true
  }
  useFrame(({ camera }) => {
    const f = get(), { S, E, D, T, N, P, Q, m, c, v } = tmp
    let ns = 0, nk = 0, nb = 0
    const nl = [0, 0, 0, 0, 0]
    const view = v.set(0, 0, 1).applyQuaternion(camera.quaternion)
    for (const st of f.strands) for (let i = 0; i < st.length; i++) {
      const nt = st[i], k = nt.k ?? 1
      if (k < 0.01 || ns >= cap) continue
      const sz = (nt.sz ?? 1) * Math.min(1, k * 1.15)
      S.set(...nt.s); E.set(...nt.e); D.subVectors(E, S); const len = D.length(); D.multiplyScalar(1 / Math.max(1e-5, len))
      const pv = st[i - 1], nx = st[i + 1]
      T.set(...(nx ? nx.s : nt.s)).sub(P.set(...(pv ? pv.s : nt.s)))
      if (T.lengthSq() < 1e-6) T.set(1, 0, 0)
      N.crossVectors(T, D); if (N.lengthSq() < 1e-6) N.set(0, 0, 1); N.normalize(); T.crossVectors(D, N).normalize()
      // 糖
      m.makeBasis(T, D, N); m.scale(Q.set(sz, sz, sz)); m.setPosition(S)
      c.set(nt.c); if (nt.dim) c.lerp(DIM, nt.dim); if (nt.hi) c.lerp(WHITE, nt.hi * 0.35).multiplyScalar(1 + nt.hi * 0.6)
      M.sugar.setMatrixAt(ns, m); M.sugar.setColorAt(ns, c)
      // 碱基：从糖边上一直到尖端
      const L = Math.max(0.05, len - 0.16 * sz)
      m.makeBasis(T, D, N); m.scale(Q.set(sz, L, sz)); m.setPosition(P.copy(S).addScaledVector(D, 0.16 * sz))
      c.set(BASE_COLOR[nt.b]); if (nt.dim) c.lerp(DIM, nt.dim >= 1 ? 1 : nt.dim * 0.8); if (nt.hi) c.multiplyScalar(1 + nt.hi * 0.9)
      M.base.setMatrixAt(ns, m); M.base.setColorAt(ns, c)
      // 和下一个核苷酸之间：一个磷酸，两根短棒
      if (nx && !nt.cut && (nx.k ?? 1) > 0.01 && nk < cap * 2 - 1) {
        Q.set(...nx.s); P.addVectors(S, Q).multiplyScalar(0.5).addScaledVector(D, -0.24 * sz)
        c.set(nt.c); if (nt.dim) c.lerp(DIM, nt.dim)
        const r = 0.06 * sz
        if (stick(S, P, r, nk, c, M.stick)) nk++
        if (stick(P, Q, r, nk, c, M.stick)) nk++
        m.makeScale(sz, sz, sz); m.setPosition(P); M.phos.setMatrixAt(ns, m); M.phos.setColorAt(ns, nt.dim ? c.copy(PHOS).lerp(DIM, nt.dim) : PHOS)
      } else { m.makeScale(0, 0, 0); M.phos.setMatrixAt(ns, m) }
      // 字母牌
      if (letters && nt.lt !== false && k > 0.55) {
        const li = LETTERS.indexOf(nt.b), mesh = M.lets[li]
        P.copy(S).addScaledVector(D, 0.16 * sz + L * 0.5).addScaledVector(view, 0.2 * sz)
        m.compose(P, camera.quaternion, Q.set(ls * sz, ls * sz, ls * sz)); mesh.setMatrixAt(nl[li]++, m)
      }
      ns++
    }
    for (const b of f.bonds ?? []) {
      const k = b.k ?? 1; if (k < 0.05) continue
      S.set(...b.a); E.set(...b.b); D.subVectors(E, S); N.crossVectors(D, view).normalize()
      for (let j = 0; j < b.n && nb < cap * 2; j++) {
        const o = (j - (b.n - 1) / 2) * 0.1
        P.copy(S).addScaledVector(N, o); Q.copy(E).addScaledVector(N, o)
        if (stick(P, Q, 0.022 * k, nb, WHITE, M.bond)) nb++
      }
    }
    M.sugar.count = M.base.count = M.phos.count = ns; M.stick.count = nk; M.bond.count = nb
    M.lets.forEach((l, i) => { l.count = nl[i]; l.instanceMatrix.needsUpdate = true })
    for (const x of [M.sugar, M.base, M.phos, M.stick, M.bond]) { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true }
  })
  return <group>
    <primitive object={M.sugar} /><primitive object={M.base} /><primitive object={M.phos} /><primitive object={M.stick} /><primitive object={M.bond} />
    {M.lets.map((l, i) => <primitive key={i} object={l} />)}
  </group>
}

// ---------- 双链的摆法 ----------
/**
 * 沿 +x 摆一段双链。第 i 对碱基：x = x0 + i·RISE；θ 是绕中轴转的角度（0 时上链在正上方，是一架平的梯子）；
 * sep 是两条链各自往外挪多少（解旋）。返回上链、下链的糖和碱基尖端。
 */
export function pairAt(o: V3, i: number, theta: number, top: Base, bot: Base, sepTop = 0, sepBot = 0) {
  const x = o[0] + i * RISE, cy = Math.cos(theta), sz = Math.sin(theta)
  const sT: V3 = [x, o[1] + cy * (RAD + sepTop), o[2] + sz * (RAD + sepTop)]
  const sB: V3 = [x, o[1] - cy * (RAD + sepBot), o[2] - sz * (RAD + sepBot)]
  const lt = baseLen(top), lb = baseLen(bot)
  const eT: V3 = [x, sT[1] - cy * lt, sT[2] - sz * lt]
  const eB: V3 = [x, sB[1] + cy * lb, sB[2] + sz * lb]
  return { sT, eT, sB, eB }
}
/** 两个碱基尖端之间的氢键（两条链挨着才画） */
export const bondOf = (a: V3, b: V3, base: Base, k = 1): Bond => ({ a, b, n: hBonds(base), k })
/** 每转 10 对碱基 */
export const TURN = (Math.PI * 2) / 10

// ---------- 蛋白质：有起伏的团块 ----------
/** 给每个方向一个半径，做一个团块；amp、freq 是表面起伏。flat：把 z 大于它的部分压平（剖面） */
export function blobGeo(fn: (v: THREE.Vector3) => number, { amp = 0.06, freq = 2.2, seg = 96, seed = 0, color = '#ffffff', flat, cut = '#ffffff' }: { amp?: number; freq?: number; seg?: number; seed?: number; color?: string; flat?: number; cut?: string } = {}) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7))
  const p = g.attributes.position, v = new THREE.Vector3(), col = new Float32Array(p.count * 3), A = new THREE.Color(color), C = new THREE.Color(cut), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize()
    const n = fbm(v.x * freq + seed, v.y * freq, v.z * freq, 4)
    const r = fn(v) * (1 + amp * n)
    v.multiplyScalar(r)
    let isCut = false
    if (flat !== undefined && v.z > flat) { v.z = flat; isCut = true }
    p.setXYZ(i, v.x, v.y, v.z)
    c.copy(isCut ? C : A).multiplyScalar(isCut ? 0.82 + 0.4 * (n + 0.5) : 0.9 + 0.22 * (n + 0.5)); col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}
/** 在 axis 方向鼓出一块：w 越大越宽 */
export const lobe = (v: THREE.Vector3, axis: V3, w: number, amp: number) => { const a = new THREE.Vector3(...axis).normalize(); return amp * Math.exp(-(1 - v.dot(a)) / w) }

/** 半透明的蛋白质：外面一层亮边，里面看得见 */
export function Jelly({ geo, color, opacity = 0.5, ...rest }: { geo: THREE.BufferGeometry; color: string; opacity?: number } & Record<string, unknown>) {
  return <group {...rest}>
    <mesh geometry={geo} renderOrder={2}><meshPhysicalMaterial color={color} vertexColors transparent opacity={opacity * 0.6} depthWrite={false} side={THREE.BackSide} roughness={0.5} /></mesh>
    <mesh geometry={geo} renderOrder={3}><meshPhysicalMaterial color={color} vertexColors transparent opacity={opacity} depthWrite={false} roughness={0.32} clearcoat={1} clearcoatRoughness={0.25} sheen={1} sheenColor="#ffffff" sheenRoughness={0.4} /></mesh>
  </group>
}

/** 解旋酶：六个亚基围成的环，环的中轴沿 x。DNA 的一条链从环中间穿过 */
export function helicaseGeo() {
  const U = 72, V = 28, R = 0.98, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color()
  for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
    const u = (i / U) * Math.PI * 2, w = (j / V) * Math.PI * 2
    const lobeK = Math.pow(Math.abs(Math.cos(3 * u)), 0.6)                    // 六个亚基：每个鼓一块，之间有缝
    const r = 0.5 * (0.78 + 0.3 * lobeK) * (1 + 0.05 * fbm(Math.cos(u) * 3, Math.sin(u) * 3, w))
    const rr = R + r * Math.cos(w)
    pos.push(r * Math.sin(w) * 1.25, rr * Math.cos(u), rr * Math.sin(u))
    c.set('#4fc2ad').multiplyScalar(0.75 + 0.35 * lobeK); col.push(c.r, c.g, c.b)
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j, b = a + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** DNA 聚合酶：像一只半握的右手（手掌、手指、拇指），新链从掌心里接出来 */
export const polymeraseGeo = (seed = 1) => blobGeo(v => 0.62 + lobe(v, [0.2, 0.9, 0.3], 0.18, 0.5) + lobe(v, [-0.3, -0.85, 0.35], 0.14, 0.42) + lobe(v, [0.1, 0, -1], 0.4, 0.3) + lobe(v, [0.9, 0.2, 0], 0.2, 0.18), { amp: 0.09, freq: 2.6, seed, color: '#a58bdc' })
/** RNA 聚合酶：一个大的“蟹钳”形，上下两瓣中间夹着 DNA */
export const rnaPolGeo = () => blobGeo(v => 1.0 + lobe(v, [0.1, 1, 0.2], 0.3, 0.9) + lobe(v, [-0.1, -1, 0.15], 0.3, 0.8) + lobe(v, [0, 0, -1], 0.5, 0.55) + lobe(v, [-0.9, 0.4, 0], 0.2, 0.35), { amp: 0.08, freq: 2.0, seed: 7, color: '#62c6b6' })
/** 核糖体大亚基：圆顶上有三个突起；小亚基：扁一些，有“头”和“身体” */
export const bigSubGeo = (flat?: number) => blobGeo(v => 1.0 + 0.25 * Math.max(0, v.y) + lobe(v, [0, 1, 0.1], 0.08, 0.35) + lobe(v, [-0.85, 0.55, 0], 0.07, 0.42) + lobe(v, [0.85, 0.45, 0], 0.06, 0.32) - 0.35 * Math.max(0, -v.y) ** 3 - 0.3 * lobe(v, [0, -1, 0], 0.15, 1), { amp: 0.13, freq: 3.2, seed: 3, color: '#7f97d4', flat, cut: '#93a6dc' })
export const smallSubGeo = (flat?: number) => blobGeo(v => 0.9 + lobe(v, [-0.95, 0.1, 0], 0.12, 0.28) + 0.12 * Math.max(0, -v.y) - 0.3 * Math.max(0, v.y) ** 2, { amp: 0.13, freq: 3.4, seed: 9, color: '#ffffff', flat, cut: '#c4b5ea' })
/** 组蛋白八聚体：扁圆的一团，上下两层各四块 */
export const histoneGeo = () => blobGeo(v => 1 + 0.12 * Math.cos(4 * Math.atan2(v.y, v.x)) * (1 - v.z * v.z) - 0.25 * v.z * v.z, { amp: 0.08, freq: 3, seed: 5, color: '#d1a77c' })

// ---------- tRNA：三叶草形 ----------
/** 三叶草形 tRNA 的局部坐标：反密码子环在最下面（y≈0），三个反密码子碱基朝下，间距和 mRNA 上的碱基一样；最上面是携带氨基酸的一端 */
export const TRNA_ANTI_Y = 0.15       // 反密码子碱基的糖在局部 y
export const TRNA_TOP: V3 = [0.24, 4.35, 0]   // 接氨基酸的地方
export function trnaGeo() {
  const S = 0.24, P = (pts: number[][]) => pts.map(p => new THREE.Vector3(p[0], p[1], p[2] ?? 0))
  // 一条链从 5′ 端走一圈回到 3′ 端：受体臂左边 → D 臂 → 反密码子臂 → T 臂 → 受体臂右边
  const loop = (cx: number, cy: number, r: number, a0: number, a1: number, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] })
  const pts = P([
    [-S, 3.9], [-S, 3.2], [-S, 2.5], [-S, S + 2.0],
    [-0.8, S + 2.0], [-1.3, S + 2.0], ...loop(-1.78, 2.0, 0.5, Math.PI / 2 - 0.5, Math.PI * 1.5 + 0.5).slice(1, -1), [-1.3, 2.0 - S], [-0.8, 2.0 - S],
    [-S, 2.0 - S], [-S, 1.4], [-S, 0.95],
    [-0.75, 0.62], [-0.85, TRNA_ANTI_Y + 0.05], [-0.4, TRNA_ANTI_Y - 0.02], [0, TRNA_ANTI_Y - 0.04], [0.4, TRNA_ANTI_Y - 0.02], [0.85, TRNA_ANTI_Y + 0.05], [0.75, 0.62],
    [S, 0.95], [S, 1.4], [S, 2.0 - S],
    [0.8, 2.0 - S], [1.3, 2.0 - S], ...loop(1.78, 2.0, 0.5, -Math.PI / 2 - 0.5 + Math.PI * 2, Math.PI / 2 + 0.5).slice(1, -1), [1.3, S + 2.0], [0.8, S + 2.0],
    [S, S + 2.0], [S, 2.5], [S, 3.2], [S, 3.9], [S, 4.35],
  ])
  const body = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3), 260, 0.11, 10, false)
  // 茎上的配对：两条链之间一根根横档
  const rungs: THREE.BufferGeometry[] = []
  const rung = (a: V3, b: V3) => { const g = new THREE.CylinderGeometry(0.055, 0.055, 1, 8); const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0); g.scale(1, d.length(), 1); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0); rungs.push(g) }
  for (const y of [2.55, 2.85, 3.15, 3.45, 3.75]) rung([-S, y, 0], [S, y, 0])
  for (const y of [1.0, 1.25, 1.5]) rung([-S, y, 0], [S, y, 0])
  for (const x of [-0.65, -0.95, -1.2]) { rung([x, 2.0 + S, 0], [x, 2.0 - S, 0]); rung([-x, 2.0 + S, 0], [-x, 2.0 - S, 0]) }
  const paint = (g: THREE.BufferGeometry, hex: string) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g }
  return mergeGeometries([paint(body, STRAND.trna), ...rungs.map(g => paint(g, '#b8ad90'))])
}

// ---------- 氨基酸 ----------
const AA_COLOR: Record<string, string> = { M: '#f2b35a', A: '#7fd6c8', H: '#6aa8f0', E: '#f07a6a', W: '#c49af0', K: '#9cd66a', V: '#ffd36a', L: '#e89fc8', T: '#8fd0ff', P: '#d4b48c', G: '#b5e3a0', R: '#7fb0ff', F: '#f3a0a0', S: '#a6e3e0', Y: '#e6c48a', C: '#e2e27a', Q: '#c9b0ff', I: '#ffb37a', N: '#a3d9a5', D: '#ff9f9f' }
export const aaColor = (aa: string) => AA_COLOR[aa] ?? '#cccccc'
/** 氨基酸的中文名去掉“氨酸”，标签上用 */
export const aaShort = (aa: string) => AA_NAME[aa].replace(/氨酸$/, '').replace(/酰胺$/, '酰胺')
export const aaGeo = (seed = 1) => blobGeo(() => 0.42, { amp: 0.12, freq: 3.2, seed, seg: 32, color: '#ffffff' })

// ---------- 遗传密码表（画在场景里的一块屏上） ----------
const ORDER = 'UCAG'
/** 一块遗传密码表的贴图。hl：要亮的密码子；cur：正在查的那个（行列标题也跟着亮） */
export function useCodonTable() {
  return useMemo(() => {
    const W = 1800, H = 1320, cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const g = cv.getContext('2d')!, tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    const X0 = 150, Y0 = 150, CW = 390, CH = 280, RH = CH / 4
    const draw = (hl: string[] = [], cur?: string) => {
      g.fillStyle = '#0d1620'; g.fillRect(0, 0, W, H)
      g.strokeStyle = 'rgba(160,200,230,0.35)'; g.lineWidth = 3; g.strokeRect(8, 8, W - 16, H - 16)
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillStyle = 'rgba(220,232,245,0.7)'; g.font = '600 38px system-ui, "PingFang SC", sans-serif'
      g.fillText('第二个碱基', X0 + CW * 2, 50); g.save(); g.translate(50, Y0 + CH * 2); g.rotate(-Math.PI / 2); g.fillText('第一个碱基', 0, 0); g.restore()
      g.save(); g.translate(W - 46, Y0 + CH * 2); g.rotate(Math.PI / 2); g.fillText('第三个碱基', 0, 0); g.restore()
      for (let i = 0; i < 4; i++) {
        const on1 = cur?.[0] === ORDER[i], on2 = cur?.[1] === ORDER[i]
        g.font = '800 64px "Geist", system-ui, sans-serif'
        g.fillStyle = on2 ? '#ffe27a' : BASE_COLOR[ORDER[i] as Base]; g.fillText(ORDER[i], X0 + CW * i + CW / 2, 112)
        g.fillStyle = on1 ? '#ffe27a' : BASE_COLOR[ORDER[i] as Base]; g.fillText(ORDER[i], 106, Y0 + CH * i + CH / 2)
        for (let r = 0; r < 4; r++) { g.font = '700 34px "Geist", system-ui, sans-serif'; g.fillStyle = cur?.[2] === ORDER[r] && on1 ? '#ffe27a' : 'rgba(200,215,230,0.6)'; g.fillText(ORDER[r], W - 104, Y0 + CH * i + RH * r + RH / 2) }
      }
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = X0 + CW * j, y = Y0 + CH * i
        g.fillStyle = cur && cur[0] === ORDER[i] && cur[1] === ORDER[j] ? 'rgba(255,226,122,0.10)' : (i + j) % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.065)'
        g.fillRect(x + 4, y + 4, CW - 8, CH - 8)
        for (let r = 0; r < 4; r++) {
          const cd = ORDER[i] + ORDER[j] + ORDER[r], aa = CODE[cd], on = hl.includes(cd), isCur = cd === cur, yy = y + RH * r + RH / 2
          if (on || isCur) { g.fillStyle = isCur ? '#ffd84a' : 'rgba(53,199,179,0.55)'; g.beginPath(); g.roundRect(x + 10, y + RH * r + 6, CW - 20, RH - 12, 10); g.fill() }
          g.textAlign = 'left'; g.font = '700 42px "Geist", ui-monospace, monospace'
          g.fillStyle = isCur ? '#1a1300' : '#e8eef5'; g.fillText(cd, x + 20, yy + 1)
          g.font = `${aa === '*' ? '700' : '500'} 40px system-ui, "PingFang SC", sans-serif`
          g.fillStyle = isCur ? '#1a1300' : aa === '*' ? '#ff9b8a' : cd === 'AUG' ? '#ffd27a' : 'rgba(225,235,245,0.88)'
          g.fillText(aa === '*' ? '终止' : AA_NAME[aa], x + 124, yy + 1)
          g.textAlign = 'center'
        }
      }
      tex.needsUpdate = true
    }
    draw()
    return { tex, draw, aspect: W / H }
  }, [])
}
/** 立在细胞质里的一块屏：深色玻璃、细金属边。w 是宽 */
export function TableScreen({ hl, cur, w = 11, ...rest }: { hl: string[]; cur?: string; w?: number } & Record<string, unknown>) {
  const t = useCodonTable(), h = w / t.aspect
  const key = hl.join() + '|' + (cur ?? '')
  const last = useRef('')
  if (last.current !== key) { last.current = key; t.draw(hl, cur) }
  return <group {...rest}>
    <mesh position={[0, 0, -0.08]}><boxGeometry args={[w + 0.3, h + 0.3, 0.1]} /><meshStandardMaterial color="#26313b" metalness={0.8} roughness={0.35} /></mesh>
    <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={t.tex} toneMapped={false} /></mesh>
  </group>
}

// ---------- 细胞质里的 mRNA：一条单链，碱基朝上 ----------
/** 从 o 起沿 +x 摆一条 RNA，碱基朝上（down 为真时朝下） */
export function rnaLine(o: V3, seq: string, c = STRAND.rna, down = false): Nt[] {
  return [...seq].map((b, i) => { const s: V3 = [o[0] + i * RISE, o[1], o[2]]; const l = baseLen(b as Base); return { b: b as Base, s, e: [s[0], s[1] + (down ? -l : l), s[2]], c } })
}
/** 框住一个密码子（三个碱基）的亮框：x 是三个碱基中间那个的位置 */
export function CodonFrame({ at, color = '#ffd84a', h = 1.6, w = 3 * RISE + 0.1 }: { at: V3; color?: string; h?: number; w?: number }) {
  const t = 0.05
  const mat = <meshBasicMaterial color={color} toneMapped={false} />
  return <group position={at}>
    <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, t, t]} />{mat}</mesh>
    <mesh position={[0, -h / 2, 0]}><boxGeometry args={[w, t, t]} />{mat}</mesh>
    <mesh position={[-w / 2, 0, 0]}><boxGeometry args={[t, h, t]} />{mat}</mesh>
    <mesh position={[w / 2, 0, 0]}><boxGeometry args={[t, h, t]} />{mat}</mesh>
    <mesh position={[0, 0, -0.35]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} toneMapped={false} /></mesh>
  </group>
}
