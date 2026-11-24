// 展厅正中的半身胸腔模型：半透明的皮肤壳、脊柱、十二对肋骨和肋软骨、胸骨、肋间肌、膈、两肺、气管和支气管树。
// 它会呼吸：肋间肌收缩（rib）时肋骨绕肋头往上往外转、胸骨跟着往上往前、肋间肌变深；膈肌收缩（dia）时穹顶变低变平；两肺跟着胀大。
// rib、dia 是各课交上来的目标值，这里平滑地跟过去，并写进 breathLive，钟罩模型、墙上的灯环都看它。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DOME, PH0, RIBS, Z0, domeAt, heartColor, heartSdf, lungMove, lungSdf, ribHead, ribPath, ribPoint, ribTurnQ, rimScale, rimY, skinSdf, spineSdf, sternalY, sternumSdf, sternumZ, turnAbout } from './anat'
import { fbm, lin, mix3, surfaceNetsGen, type V3 } from './sdf'
import { Sweep, taper } from './sweep'
import { treeGen } from './tree'
import { prioOf, useJob } from './job'
import { TREE_LEVELS } from './physics'

/** 此刻胸廓的状态（平滑以后的），别的东西跟着它动 */
export const breathLive = { rib: 0, dia: 0 }

/** 幽灵壳：边缘亮、中间透，叠加着画 */
export function ghostMat(color: string, base: number, rim: number, pow = 2.4) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uRim: { value: rim }, uPow: { value: pow }, uFade: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uPow; uniform float uFade; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPow); gl_FragColor = vec4(uColor * (uBase + uRim * f) * uFade, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
}

/** 肌纤维的纹理：一条条细的纤维，深浅不一。repeat 决定纤维多密 */
function fiberTex(seed: number) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256
  const g = c.getContext('2d')!, img = g.createImageData(64, 256)
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const col = Array.from({ length: 64 }, () => 0.6 + 0.4 * r())
  for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
    const groove = 0.5 + 0.5 * Math.cos((x / 64) * Math.PI * 2 * 16)
    const v = (0.78 + 0.22 * col[x] * (0.8 + 0.2 * groove)) * (0.97 + 0.03 * Math.sin(y * 0.15 + x * 0.3)) * 255
    const k = (y * 64 + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

/** 记下一个网格静止时的顶点，按 lungMove 挪到此刻的位置 */
function follow(g: THREE.BufferGeometry, rib: number, dia: number) {
  const a = g.attributes.position as THREE.BufferAttribute
  const base = (g.userData.base ??= (a.array as Float32Array).slice()) as Float32Array
  const P = a.array as Float32Array, o: V3 = [0, 0, 0]
  for (let i = 0; i < P.length; i += 3) { lungMove(base[i], base[i + 1], base[i + 2], rib, dia, o); P[i] = o[0]; P[i + 1] = o[1]; P[i + 2] = o[2] }
  a.needsUpdate = true; g.computeBoundingSphere()
}

// ---------- 不动的几样：皮肤、脊柱、胸骨、两肺、心脏（分段生成，见 job.ts） ----------
const bone = lin('#e6dcc6'), boneD = lin('#b8a78a'), pink = lin('#d98c8f'), pinkL = lin('#f0b9b4'), spot = lin('#8d4d58')
const GEN = {
  skin: () => surfaceNetsGen(skinSdf, [[-3.0, 9.1, -1.3], [3.0, 17.6, 1.2]], 0.1),
  spine: () => surfaceNetsGen(spineSdf, [[-0.45, 9.0, -1.15], [0.45, 16.2, -0.25]], 0.022, (p, n) => mix3(boneD, bone, 0.55 + 0.45 * Math.max(0, n[1] * 0.3 + n[2] * 0.2 + 0.5) + 0.1 * fbm(p[0] * 9, p[1] * 9, p[2] * 9, 2))),
  sternum: () => surfaceNetsGen(sternumSdf, [[-0.4, 11.9, 0.35], [0.4, 14.5, 1.0]], 0.018, (p) => mix3(boneD, bone, 0.8 + 0.2 * fbm(p[0] * 9, p[1] * 9, p[2] * 9, 2))),
  lungs: () => surfaceNetsGen(lungSdf, [[-1.55, 11.3, -1.05], [1.55, 15.0, 0.85]], 0.026, (p, n) => {
    const m = fbm(p[0] * 6, p[1] * 6, p[2] * 6, 3), dots = Math.max(0, fbm(p[0] * 18, p[1] * 18, p[2] * 18, 2) - 0.25) * 2.2
    return mix3(mix3(pink, pinkL, 0.5 + 0.6 * m + 0.2 * n[1]), spot, Math.min(0.55, dots))
  }),
  heart: () => surfaceNetsGen(heartSdf, [[-0.7, 12.0, -0.7], [0.85, 14.05, 0.65]], 0.022, p => heartColor(p[0], p[1], p[2])),
}
const useStatic = (k: keyof typeof GEN) => useJob(`chest-${k}`, GEN[k], prioOf('chest'))

// ---------- 会动的几样：肋骨、肋软骨、肋间肌、膈 ----------
const NR = 30          // 每根肋骨中心线上的点
const NC = 12          // 每根肋软骨中心线上的点
const NI = 26          // 肋间肌沿肋骨方向的格子
const SIDES = [-1, 1]
type RibSide = { r: (typeof RIBS)[number]; s: number; sw: Sweep; base: THREE.Vector3[]; head: THREE.Vector3 }

function Moving({ look, sternum }: { look: ChestLook; sternum: THREE.BufferGeometry | null }) {
  const ribs = useMemo<RibSide[]>(() => RIBS.flatMap(r => SIDES.map(s => ({ r, s, sw: new Sweep(NR, 10), base: ribPath(r, s, NR), head: ribHead(r, s) }))), [])
  const carts = useMemo(() => RIBS.filter(r => r.kind !== 'float').flatMap(r => SIDES.map(s => ({ r, s, sw: new Sweep(NC, 9) }))), [])
  const inter = useMemo(() => {
    // 十一条肋间肌，每条 NI × 4 个顶点，合成一个网格
    const n = 11 * 2, rows = 4, g = new THREE.BufferGeometry(), pos = new Float32Array(n * NI * rows * 3), uv = new Float32Array(n * NI * rows * 2), idx: number[] = []
    for (let m = 0; m < n; m++) for (let j = 0; j < NI; j++) for (let k = 0; k < rows; k++) {
      const v = (m * NI + j) * rows + k; uv[v * 2] = j / (NI - 1) * 3; uv[v * 2 + 1] = k / (rows - 1) * 0.35 + j * 0.06
      if (j < NI - 1 && k < rows - 1) idx.push(v, v + rows, v + 1, v + rows, v + rows + 1, v + 1)
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx)
    return g
  }, [])
  const dia = useMemo(() => {
    const NRho = 22, NPh = 72, g = new THREE.BufferGeometry(), pos = new Float32Array(NRho * (NPh + 1) * 3), uv = new Float32Array(NRho * (NPh + 1) * 2), col = new Float32Array(NRho * (NPh + 1) * 3), idx: number[] = []
    const red = lin('#a8323a'), tendon = lin('#d9d2c8')
    for (let i = 0; i < NRho; i++) for (let j = 0; j <= NPh; j++) {
      const v = i * (NPh + 1) + j, rho = i / (NRho - 1), ph = j / NPh * Math.PI * 2
      uv[v * 2] = j / NPh * 9; uv[v * 2 + 1] = rho
      // 中心腱：三叶的一片白色腱膜
      const tr = 0.42 + 0.1 * Math.cos(3 * ph + 0.4), c = mix3(tendon, red, Math.min(1, Math.max(0, (rho - tr) / 0.12)))
      col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2]
      if (i < NRho - 1 && j < NPh) idx.push(v, v + NPh + 1, v + 1, v + NPh + 1, v + NPh + 2, v + 1)
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx)
    return { g, NRho, NPh }
  }, [])
  const ster = useRef<THREE.Group>(null)
  const mats = useMemo(() => {
    const fib = fiberTex(7), fib2 = fiberTex(11)
    fib2.repeat.set(1, 1)
    return {
      bone: new THREE.MeshPhysicalMaterial({ color: '#e8dfca', roughness: 0.5, clearcoat: 0.25, sheen: 0.3, sheenColor: '#fff4dd', transparent: true }),
      cart: new THREE.MeshPhysicalMaterial({ color: '#e2ecef', roughness: 0.32, clearcoat: 0.7, sheen: 0.5, sheenColor: '#ffffff', emissive: '#1c2a30', transparent: true, opacity: 0.95 }),
      inter: new THREE.MeshPhysicalMaterial({ color: '#b5434a', map: fib, roughness: 0.55, clearcoat: 0.35, sheen: 0.4, sheenColor: '#ff9a9a', side: THREE.DoubleSide, transparent: true }),
      dia: new THREE.MeshPhysicalMaterial({ vertexColors: true, map: fib2, roughness: 0.5, clearcoat: 0.4, sheen: 0.4, sheenColor: '#ffb0a8', side: THREE.DoubleSide, transparent: true }),
    }
  }, [])
  const last = useRef({ rib: -1, dia: -1 })
  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), v: new THREE.Vector3(), pts: Array.from({ length: NR }, () => new THREE.Vector3()), cp: Array.from({ length: NC }, () => new THREE.Vector3()) }), [])
  const cur = useRef({ ...look })

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 1 / 30), L = breathLive, c = cur.current, kk = 1 - Math.exp(-dt / 0.3)
    for (const key of Object.keys(look) as (keyof ChestLook)[]) if (typeof look[key] === 'number') (c[key] as number) += ((look[key] as number) - (c[key] as number)) * kk
    mats.bone.opacity = c.bones; mats.bone.visible = c.bones > 0.02; mats.bone.depthWrite = c.bones > 0.6
    mats.cart.opacity = 0.95 * c.bones; mats.cart.visible = c.bones > 0.02; mats.cart.depthWrite = c.bones > 0.6
    mats.inter.opacity = c.inter; mats.inter.visible = c.inter > 0.02; mats.inter.depthWrite = c.inter > 0.6
    mats.dia.opacity = c.dia; mats.dia.visible = c.dia > 0.02; mats.dia.depthWrite = c.dia > 0.6
    // 收缩时肌肉颜色变深、亮一点
    mats.inter.color.set('#b5434a').lerp(new THREE.Color('#d8323c'), L.rib); mats.inter.emissive.set('#5a0a10').multiplyScalar(L.rib * 0.5 + (look.hl === 'inter' ? 0.4 : 0))
    mats.dia.emissive.set('#5a0a10').multiplyScalar(L.dia * 0.5 + (look.hl === 'dia' ? 0.4 : 0))
    if (Math.abs(L.rib - last.current.rib) < 1e-5 && Math.abs(L.dia - last.current.dia) < 1e-5) return
    last.current = { rib: L.rib, dia: L.dia }

    // 肋骨：绕肋头转
    const fronts = new Map<string, THREE.Vector3>()
    for (const R of ribs) {
      ribTurnQ(R.r, R.s, L.rib, tmp.q)
      for (let i = 0; i < NR; i++) turnAbout(R.base[i], R.head, tmp.q, tmp.pts[i])
      const thin = R.r.kind === 'float' ? 0.75 : 1, wide = R.r.i === 0 ? 1.25 : 1
      R.sw.update(tmp.pts, i => 0.062 * thin * taper(i / (NR - 1), 0.05, 0.6) * (i < 2 ? 0.8 : 1), i => 0.03 * wide * (i < 2 ? 1.4 : 1), p => tmp.v.set(p.x, 0, p.z - Z0).normalize())
      fronts.set(`${R.r.i}${R.s}`, tmp.pts[NR - 1].clone())
    }
    // 胸骨：跟着第 2–6 对肋骨的前端平均往上往前
    const d = new THREE.Vector3()
    for (let i = 1; i <= 5; i++) for (const s of SIDES) { const r = RIBS[i], rest = ribPoint(r, s, r.pe); d.add(fronts.get(`${i}${s}`)!.clone().sub(rest)) }
    d.multiplyScalar(1 / 10)
    ster.current?.position.copy(d)
    // 肋软骨：从肋骨前端连到胸骨（第 8–10 对连到上一对的软骨上）
    const cartEnd = new Map<string, THREE.Vector3[]>()
    for (const C of carts) {
      const e = fronts.get(`${C.r.i}${C.s}`)!
      let tgt: THREE.Vector3
      if (C.r.kind === 'true') tgt = new THREE.Vector3(C.s * 0.13, sternalY(C.r.i), sternumZ(sternalY(C.r.i)) - 0.04).add(d)
      else { const up = cartEnd.get(`${C.r.i - 1}${C.s}`)!; tgt = up[Math.floor(NC * (C.r.i === 7 ? 0.55 : 0.4))].clone() }
      const mid = e.clone().lerp(tgt, 0.5); mid.z += 0.07; mid.y -= C.r.kind === 'true' ? 0.0 : 0.06
      const curve = new THREE.QuadraticBezierCurve3(e, mid, tgt)
      for (let i = 0; i < NC; i++) curve.getPoint(i / (NC - 1), tmp.cp[i])
      cartEnd.set(`${C.r.i}${C.s}`, tmp.cp.map(p => p.clone()))
      C.sw.update(tmp.cp, i => 0.05 * (1 - 0.25 * i / (NC - 1)) * (C.r.kind === 'true' ? 1 : 0.8), () => 0.03, p => tmp.v.set(p.x, 0, p.z - Z0).normalize())
    }
    // 肋间肌：相邻两根肋骨之间，按同一个角度取点，填一条带
    const P = inter.attributes.position.array as Float32Array, a = new THREE.Vector3(), b = new THREE.Vector3()
    let m = 0
    for (let i = 0; i < 11; i++) for (const s of SIDES) {
      const r0 = RIBS[i], r1 = RIBS[i + 1], q0 = ribTurnQ(r0, s, L.rib), q1 = ribTurnQ(r1, s, L.rib), h0 = ribHead(r0, s), h1 = ribHead(r1, s)
      const pEnd = Math.min(r0.pe, r1.pe) - 0.06
      for (let j = 0; j < NI; j++) {
        const ph = PH0 + 0.12 + (pEnd - PH0 - 0.12) * j / (NI - 1)
        turnAbout(ribPoint(r0, s, ph, a), h0, q0, a); turnAbout(ribPoint(r1, s, ph, b), h1, q1, b)
        a.y -= 0.05; b.y += 0.05
        const out = tmp.v.set(a.x + b.x, 0, a.z + b.z - 2 * Z0).normalize()
        for (let k = 0; k < 4; k++) {
          const t = k / 3, bulge = Math.sin(t * Math.PI) * (0.012 + 0.012 * L.rib) - 0.01
          const v = ((m * NI + j) * 4 + k) * 3
          P[v] = a.x + (b.x - a.x) * t + out.x * bulge; P[v + 1] = a.y + (b.y - a.y) * t; P[v + 2] = a.z + (b.z - a.z) * t + out.z * bulge
        }
      }
      m++
    }
    inter.attributes.position.needsUpdate = true; inter.computeVertexNormals(); inter.computeBoundingSphere()
    // 膈
    const D = dia.g.attributes.position.array as Float32Array
    for (let i = 0; i < dia.NRho; i++) for (let j = 0; j <= dia.NPh; j++) {
      const v = (i * (dia.NPh + 1) + j) * 3, q = domeAt(i / (dia.NRho - 1), j / dia.NPh * Math.PI * 2, L.dia, L.rib)
      D[v] = q.x; D[v + 1] = q.y; D[v + 2] = q.z
    }
    dia.g.attributes.position.needsUpdate = true; dia.g.computeVertexNormals(); dia.g.computeBoundingSphere()
  })
  return (
    <group>
      {ribs.map((R, k) => <mesh key={k} geometry={R.sw.geo} material={mats.bone} castShadow />)}
      {carts.map((C, k) => <mesh key={k} geometry={C.sw.geo} material={mats.cart} />)}
      <group ref={ster}>{sternum && <mesh geometry={sternum} material={mats.bone} castShadow />}</group>
      <mesh geometry={inter} material={mats.inter} />
      <mesh geometry={dia.g} material={mats.dia} castShadow />
    </group>
  )
}

/** 各部分显示多少（0 看不见，1 完全不透明）；tree 是支气管树亮到第几级；hl 是要强调哪一样 */
export interface ChestLook { skin: number; bones: number; inter: number; dia: number; lungs: number; tree: number; hl?: 'inter' | 'dia' | 'lungs' | null }
export const LOOK0: ChestLook = { skin: 1, bones: 1, inter: 1, dia: 1, lungs: 0.92, tree: 0, hl: null }

/** idle：自己平静地呼吸（吸 2 秒、呼 3 秒，幅度六成），不用课里每帧交数 */
export function Chest({ look = LOOK0, rib = 0, dia = 0, idle = false }: { look?: ChestLook; rib?: number; dia?: number; idle?: boolean }) {
  const skin = useStatic('skin'), spine = useStatic('spine'), sternum = useStatic('sternum'), lungs = useStatic('lungs'), heart = useStatic('heart')
  const tree = useJob('tree', treeGen, prioOf('tree'))
  const skinM = useMemo(() => ghostMat('#8fd3ff', 0.02, 0.5), [])
  const heartM = useMemo(() => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.3, sheen: 0.5, sheenColor: '#ff8a8a', transparent: true }), [])
  const heartRef = useRef<THREE.Mesh>(null)
  const spineM = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, transparent: true }), [])
  const lungM = useMemo(() => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.6, sheenColor: '#ffc8c8', transparent: true }), [])
  const lungRim = useMemo(() => ghostMat('#ff9aa8', 0.02, 0.75, 1.8), [])
  const treeM = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e9d3c8', roughness: 0.42, clearcoat: 0.5, sheen: 0.4, sheenColor: '#ffffff', transparent: true }), [])
  const lvM = useMemo(() => Array.from({ length: TREE_LEVELS - 3 }, () => new THREE.MeshPhysicalMaterial({ color: '#f0cfc6', roughness: 0.45, clearcoat: 0.4, transparent: true })), [])
  const budM = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f2a3a8', roughness: 0.4, clearcoat: 0.5, sheen: 0.6, sheenColor: '#ffd0d0', transparent: true }), [])
  const buds = useRef<THREE.InstancedMesh>(null), fol = useRef<{ rib: number; dia: number; tree: unknown; lungs: unknown }>({ rib: -1, dia: -1, tree: null, lungs: null }), tmpM = useMemo(() => new THREE.Matrix4(), [])
  const cur = useRef({ ...look })
  // 肺泡小串：每个细支气管的末端放几个小泡
  const budAt = useMemo(() => {
    if (!tree) return []
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    return tree.tips.flatMap(t => Array.from({ length: 5 }, () => [t.x + (r() - 0.5) * 0.04, t.y + (r() - 0.5) * 0.04, t.z + (r() - 0.5) * 0.04] as V3))
  }, [tree])
  useEffect(() => {
    const m = buds.current; if (!m) return
    const mx = new THREE.Matrix4()
    budAt.forEach((p, i) => m.setMatrixAt(i, mx.makeScale(0.017, 0.017, 0.017).setPosition(...p)))
    m.instanceMatrix.needsUpdate = true
  }, [budAt])
  useFrame((st, dt0) => {
    const dt = Math.min(dt0, 1 / 30), k = 1 - Math.exp(-dt / 0.35), c = cur.current
    if (idle) { const t = st.clock.elapsedTime % 5; rib = dia = 0.6 * (t < 2 ? (1 - Math.cos(Math.PI * t / 2)) / 2 : (1 + Math.cos(Math.PI * (t - 2) / 3)) / 2) }
    breathLive.rib += (rib - breathLive.rib) * (1 - Math.exp(-dt / 0.12)); breathLive.dia += (dia - breathLive.dia) * (1 - Math.exp(-dt / 0.12))
    c.skin += (look.skin - c.skin) * k; c.lungs += (look.lungs - c.lungs) * k; c.tree += (look.tree - c.tree) * (1 - Math.exp(-dt / 0.6))
    skinM.uniforms.uFade.value = c.skin
    heartM.opacity = 0.7 * Math.min(1, c.lungs * 1.1); heartM.visible = c.lungs > 0.15; heartM.depthWrite = false
    if (heartRef.current) heartRef.current.position.y = -0.22 * breathLive.dia
    c.bones += (look.bones - c.bones) * k; spineM.opacity = c.bones; spineM.depthWrite = c.bones > 0.6; spineM.visible = c.bones > 0.02
    lungM.opacity = c.lungs; lungM.visible = c.lungs > 0.03; lungM.depthWrite = c.lungs > 0.8
    lungRim.uniforms.uFade.value = Math.min(1, (1 - c.lungs) * 1.6) * (c.tree > 0.05 ? 1 : 0.4)
    const tv = Math.min(1, c.tree * 3)
    treeM.opacity = tv; treeM.visible = tv > 0.02
    lvM.forEach((m, i) => { const o = Math.min(1, Math.max(0, c.tree * TREE_LEVELS - (i + 3))); m.opacity = o; m.visible = o > 0.02 })
    budM.opacity = Math.min(1, Math.max(0, c.tree * TREE_LEVELS - (TREE_LEVELS - 0.2))); budM.visible = budM.opacity > 0.02
    // 肺和细支气管跟着胸廓变形（只在变了的时候算）
    const L = breathLive, f = fol.current
    if (Math.abs(L.rib - f.rib) > 2e-4 || Math.abs(L.dia - f.dia) > 2e-4 || f.tree !== tree || f.lungs !== lungs) {
      f.rib = L.rib; f.dia = L.dia; f.tree = tree; f.lungs = lungs
      if (lungs) follow(lungs, L.rib, L.dia)
      if (tree) {
        tree.levels.forEach(g => follow(g, L.rib, L.dia))
        const m = buds.current, o: V3 = [0, 0, 0]
        if (m) { budAt.forEach((p, i) => { lungMove(p[0], p[1], p[2], L.rib, L.dia, o); m.setMatrixAt(i, tmpM.makeScale(0.017, 0.017, 0.017).setPosition(o[0], o[1], o[2])) }); m.instanceMatrix.needsUpdate = true }
      }
    }
  })
  return (
    <group>
      {skin && <mesh geometry={skin} material={skinM} renderOrder={8} />}
      {spine && <mesh geometry={spine} material={spineM} castShadow />}
      <Moving look={look} sternum={sternum} />
      {heart && <mesh ref={heartRef} geometry={heart} material={heartM} renderOrder={2} castShadow />}
      {lungs && <group>
        <mesh geometry={lungs} material={lungM} renderOrder={3} castShadow />
        <mesh geometry={lungs} material={lungRim} renderOrder={6} />
      </group>}
      {tree && <>
        <mesh geometry={tree.thick} material={treeM} renderOrder={2} />
        <group>
          {tree.levels.map((g, i) => <mesh key={i} geometry={g} material={lvM[i]} renderOrder={2} />)}
          <instancedMesh ref={buds} args={[undefined, undefined, budAt.length || 1]} material={budM}><sphereGeometry args={[1, 10, 8]} /></instancedMesh>
        </group>
      </>}
    </group>
  )
}
export { DOME, rimY, rimScale }
