// 第 5 课：悬在人体模型左边的一个放大球，里面是“十二指肠里”的营养物质（示意，不按比例）。
// 后面是一片带绒毛的肠壁，左上角两个开口：胆总管（流出黄绿的胆汁）和胰管（流出清亮的胰液）。
// 淀粉画成一串串小六边形（每个是一个葡萄糖），蛋白质是折起来的一串彩色小球（每个是一个氨基酸），脂肪是大油滴。
// 胆汁把大油滴打碎成许多小微粒（乳化）；胰液和肠液把链一节节拆开、把小油滴分成甘油（白色小三联球）和脂肪酸（黄色短棒）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { dropletR, type Macro } from './physics'
import { fbm, lin, mix3, type V3 } from './sdf'
import { tissueBump } from './tube'
import { ease } from './parts'

export const DUO_AT: V3 = [-12.5, 12.4, 0.4]
export const DUO_R = 1.9
/** 人体模型上十二指肠的位置（身体坐标） */
export const DUO_SITE: V3 = [-0.52, 10.3, 0.06]
const R = DUO_R

/** 第 5 课交给世界的：胆汁（0–1）、胰液和肠液（0–1）、亮起来的那一种产物 */
export interface DuoWant { bile: number; juice: number; focus: Macro | null }

let sd = 1
const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
/** 一条蜷起来的链：随机走，每一步转一点，不走出球 */
function coil(start: V3, n: number, step: number, lim: number) {
  const pts: THREE.Vector3[] = [new THREE.Vector3(...start)], d = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize()
  for (let i = 1; i < n; i++) {
    d.add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.1)).normalize()
    const p = pts[i - 1].clone().addScaledVector(d, step)
    if (p.length() > lim) { d.addScaledVector(p.clone().normalize(), -1.2).normalize(); p.copy(pts[i - 1]).addScaledVector(d, step) }
    pts.push(p)
  }
  return pts
}
/** 球里随便一个地方（不太靠前，也不贴着后面的肠壁） */
const anywhere = () => { for (;;) { const p = new THREE.Vector3((rnd() * 2 - 1) * R * 0.72, (rnd() * 2 - 1) * R * 0.62, (rnd() * 2 - 1) * R * 0.38 + 0.1); if (p.length() < R * 0.74) return p } }

function makeScene() {
  sd = 7
  const starch = [[-0.75, 0.55, 0.1], [-0.15, -0.65, 0.2], [0.55, 0.75, -0.05]].map(s => coil(s as V3, 16, 0.15, R * 0.7))
  const protein = [[0.7, -0.15, 0.2], [-0.95, -0.35, 0.0], [0.15, 0.2, -0.1]].map(s => coil(s as V3, 13, 0.13, R * 0.7))
  const fat = [[0.95, 0.35, 0.05], [-0.4, 0.05, 0.25], [0.35, -0.85, 0.1]].map(s => new THREE.Vector3(...(s as V3)))
  const N_SMALL = 8
  const small = fat.map(c => Array.from({ length: N_SMALL }, () => c.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, (rnd() - 0.5) * 0.6).multiplyScalar(0.75))))
  // 拆开以后每个小单位去哪
  const out = (n: number) => Array.from({ length: n }, () => anywhere())
  return { starch, protein, fat, small, N_SMALL, starchTo: starch.map(c => out(c.length)), proteinTo: protein.map(c => out(c.length)), glyTo: small.map(s => out(s.length)), faTo: small.map(s => s.map(() => [anywhere(), anywhere(), anywhere()])), jit: Array.from({ length: 400 }, () => [rnd() * 6, rnd() * 6, rnd() * 6]) }
}

/** 后面的肠壁：一块凹进去的球面，上面铺满绒毛（短的圆头小指头），左上角两个导管开口 */
function wallGeo() {
  const g = new THREE.SphereGeometry(R * 0.97, 96, 64, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.12, Math.PI * 0.76)
  const p = g.attributes.position, col = new Float32Array(p.count * 3), a = lin('#9e3e48'), b = lin('#c8686e')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.02 * fbm(x * 3, y * 3, z * 3, 2)
    p.setXYZ(i, x * k, y * k, z * k)
    const c = mix3(a, b, 0.3 + 0.5 * fbm(x * 2, y * 2, z * 2, 3)); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals()
  // 绒毛
  const vil: THREE.BufferGeometry[] = [], up = new THREE.Vector3(0, 1, 0)
  sd = 33
  for (let i = 0; i < 1300; i++) {
    const th = Math.PI * (1.06 + rnd() * 0.88), ph = Math.PI * (0.16 + rnd() * 0.68)
    const n = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th))
    if (n.z > -0.05) continue
    const h = 0.07 + rnd() * 0.06, v = new THREE.CapsuleGeometry(0.032, h, 4, 8)
    v.translate(0, h / 2, 0); v.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, n.clone().negate())); v.translate(n.x * R * 0.96, n.y * R * 0.96, n.z * R * 0.96)
    const c = new Float32Array(v.attributes.position.count * 3), cc = mix3(lin('#b4505a'), lin('#cf7a7c'), rnd())
    for (let j = 0; j < c.length; j += 3) { c[j] = cc[0]; c[j + 1] = cc[1]; c[j + 2] = cc[2] }
    v.setAttribute('color', new THREE.BufferAttribute(c, 3)); v.deleteAttribute('uv'); vil.push(v)
  }
  g.deleteAttribute('uv')
  return mergeGeometries([g, ...vil])
}
/** 两个导管开口的位置（球的局部坐标） */
const BILE_AT = new THREE.Vector3(-0.95, 1.15, -1.1), PAN_AT = new THREE.Vector3(-1.3, 0.75, -1.05)
/** 让开口的圆环朝向球心 */
const faceIn = (p: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize().negate())

export function DuoSphere({ want }: { want?: DuoWant }) {
  const w = want ?? { bile: 0, juice: 0, focus: null }
  const S = useMemo(makeScene, [])
  const geo = useMemo(() => ({
    wall: wallGeo(),
    hex: (() => { const g = new THREE.CylinderGeometry(0.075, 0.075, 0.035, 6); g.rotateX(Math.PI / 2); return g })(),
    bead: new THREE.IcosahedronGeometry(0.062, 2),
    drop: new THREE.SphereGeometry(1, 40, 28),
    rod: (() => { const pts = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(0, i * 0.045, (i % 2) * 0.025)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 6) })(),
    gly: mergeGeometries([[0, 0], [0.05, 0.03], [-0.05, 0.03]].map(([x, y]) => { const s = new THREE.IcosahedronGeometry(0.03, 1); s.translate(x, y, 0); return s })),
    bond: new THREE.CylinderGeometry(0.012, 0.012, 1, 6),
    duct: new THREE.TorusGeometry(0.11, 0.045, 12, 28),
  }), [])
  const mat = useMemo(() => ({
    wall: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new THREE.Color('#ffb8a8'), bumpMap: tissueBump(), bumpScale: 0.8, side: THREE.DoubleSide }),
    starch: new THREE.MeshPhysicalMaterial({ color: '#efe5c6', roughness: 0.35, clearcoat: 0.6, transparent: true }),
    bead: new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8, transparent: true }),
    drop: new THREE.MeshPhysicalMaterial({ color: '#f2c845', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, sheenColor: new THREE.Color('#fff2b0'), transparent: true }),
    rod: new THREE.MeshPhysicalMaterial({ color: '#f0b43a', roughness: 0.35, clearcoat: 0.6, transparent: true }),
    gly: new THREE.MeshPhysicalMaterial({ color: '#f4f1e8', roughness: 0.35, clearcoat: 0.6, transparent: true }),
    bond: new THREE.MeshStandardMaterial({ color: '#f5efe0', roughness: 0.5, transparent: true }),
    bile: new THREE.MeshPhysicalMaterial({ color: '#8fae3a', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.8 }),
    pan: new THREE.MeshPhysicalMaterial({ color: '#eef6f2', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#dff0f6', transparent: true, opacity: 0.06, roughness: 0.04, clearcoat: 1, depthWrite: false, envMapIntensity: 1.6 }),
    fluid: new THREE.MeshPhysicalMaterial({ color: '#e8d9a8', transparent: true, opacity: 0, roughness: 0.2, depthWrite: false, side: THREE.BackSide }),
  }), [])
  const AA = ['#e25b5b', '#5b9be2', '#58c48a', '#b67ae0']
  const beadCols = useMemo(() => S.protein.flatMap(c => c.map((_, i) => new THREE.Color(AA[(i * 7 + c.length) % 4]))), [S])   // eslint-disable-line react-hooks/exhaustive-deps
  const nHex = S.starch.reduce((a, c) => a + c.length, 0), nBead = S.protein.reduce((a, c) => a + c.length, 0), nSmall = S.small.length * S.N_SMALL
  const nBond = S.starch.reduce((a, c) => a + c.length - 1, 0) + S.protein.reduce((a, c) => a + c.length - 1, 0)
  const ref = { hex: useRef<THREE.InstancedMesh>(null), bead: useRef<THREE.InstancedMesh>(null), drop: useRef<THREE.InstancedMesh>(null), rod: useRef<THREE.InstancedMesh>(null), gly: useRef<THREE.InstancedMesh>(null), bond: useRef<THREE.InstancedMesh>(null), bile: useRef<THREE.InstancedMesh>(null), pan: useRef<THREE.InstancedMesh>(null) }
  const tmp = useMemo(() => ({ M: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), a: new THREE.Vector3(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), d: new THREE.Vector3() }), [])
  const live = useRef({ bile: 0, juice: 0 })
  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 1 / 30), t = clock.elapsedTime, L = live.current
    // 显示的进度跟着要的进度走（重做时不瞬间跳回）
    L.bile += (w.bile - L.bile) * (1 - Math.exp(-dt / (w.bile < L.bile ? 0.05 : 0.15)))
    L.juice += (w.juice - L.juice) * (1 - Math.exp(-dt / (w.juice < L.juice ? 0.05 : 0.15)))
    const kb = ease(L.bile), kj = ease(L.juice), { M, q, e, v, s, up, d } = tmp
    const dimOf = (m: Macro) => (w.focus && w.focus !== m ? 0.12 : 1)
    const jig = (i: number, amp: number) => { const j = S.jit[i % 400]; return v.set(Math.sin(t * 0.7 + j[0]) * amp, Math.sin(t * 0.6 + j[1]) * amp, Math.sin(t * 0.5 + j[2]) * amp) }
    // 淀粉：六边形沿链排着；拆开时每个飞到自己的去处
    let i = 0, ib = 0
    const bondAt = (a: THREE.Vector3, b: THREE.Vector3, op: number) => {
      d.subVectors(b, a); const l = d.length(); q.setFromUnitVectors(up, d.normalize()); s.set(op > 0.05 ? 1 : 0, l * 0.9, op > 0.05 ? 1 : 0)
      ref.bond.current?.setMatrixAt(ib++, M.compose(tmp.a.addVectors(a, b).multiplyScalar(0.5), q, s))
    }
    const posS: THREE.Vector3[] = []
    S.starch.forEach((c, ci) => c.forEach((p, k) => {
      const go = ease(Math.min(1, Math.max(0, kj * 1.6 - k / c.length * 0.6)))
      const P = p.clone().lerp(S.starchTo[ci][k], go).add(jig(i, 0.02 + 0.03 * go)); posS.push(P)
      q.setFromEuler(e.set(t * 0.3 + k, k * 0.7 + t * 0.2 * go, 0)); s.setScalar(w.focus === 'starch' ? 1.4 : 1)
      ref.hex.current?.setMatrixAt(i++, M.compose(P, q, s))
    }))
    let o = 0
    S.starch.forEach(c => { for (let k = 0; k < c.length - 1; k++) bondAt(posS[o + k], posS[o + k + 1], 1 - kj * 2.2); o += c.length })
    const posP: THREE.Vector3[] = []
    i = 0
    S.protein.forEach((c, ci) => c.forEach((p, k) => {
      const go = ease(Math.min(1, Math.max(0, kj * 1.6 - 0.2 - k / c.length * 0.5)))
      const P = p.clone().lerp(S.proteinTo[ci][k], go).add(jig(i + 100, 0.02 + 0.03 * go)); posP.push(P)
      s.setScalar(w.focus === 'protein' ? 1.4 : 1); ref.bead.current?.setMatrixAt(i, M.compose(P, q.identity(), s)); ref.bead.current?.setColorAt(i, beadCols[i]); i++
    }))
    o = 0
    S.protein.forEach(c => { for (let k = 0; k < c.length - 1; k++) bondAt(posP[o + k], posP[o + k + 1], 1 - kj * 2.2); o += c.length })
    // 脂肪：三个大油滴；胆汁一来碎成许多小微粒（体积不变）；胰液、肠液把小微粒分成甘油和脂肪酸
    i = 0
    const big = 0.32, sm = dropletR(big, S.N_SMALL)
    S.fat.forEach((c, ci) => {
      if (kb < 0.02) { s.setScalar(big * (1 + 0.03 * Math.sin(t * 2 + ci))); ref.drop.current?.setMatrixAt(i++, M.compose(c.clone().add(jig(ci + 200, 0.02)), q.identity(), s)); for (let k = 1; k < S.N_SMALL; k++) { s.setScalar(0); ref.drop.current?.setMatrixAt(i++, M.compose(c, q, s)) } return }
      S.small[ci].forEach((p, k) => {
        const spread = ease(Math.min(1, kb * 1.3)), r = big + (sm - big) * spread, gone = ease(Math.min(1, Math.max(0, (kj - 0.25) / 0.6)))
        s.setScalar(r * (1 - gone)); ref.drop.current?.setMatrixAt(i++, M.compose(c.clone().lerp(p, spread).add(jig(ci * 9 + k + 220, 0.02)), q.identity(), s))
      })
    })
    // 甘油和脂肪酸：从小微粒的地方冒出来，散开
    let ig = 0, ir = 0
    S.small.forEach((sm2, ci) => sm2.forEach((p, k) => {
      const out = ease(Math.min(1, Math.max(0, (kj - 0.3) / 0.6))), from = S.fat[ci].clone().lerp(p, ease(Math.min(1, kb * 1.3)))
      s.setScalar(out > 0.01 ? (w.focus === 'fat' ? 1.5 : 1) : 0)
      ref.gly.current?.setMatrixAt(ig++, M.compose(from.clone().lerp(S.glyTo[ci][k], out).add(jig(ig + 260, 0.03)), q.setFromEuler(e.set(t * 0.4 + k, k, 0)), s))
      S.faTo[ci][k].forEach((dst, m) => ref.rod.current?.setMatrixAt(ir++, M.compose(from.clone().lerp(dst, out).add(jig(ir + 300, 0.03)), q.setFromEuler(e.set(t * 0.3 + m * 2 + k, m + k * 0.5, t * 0.2)), s)))
    }))
    // 胆汁、胰液从开口里流出来
    const stream = (r: React.RefObject<THREE.InstancedMesh | null>, from: THREE.Vector3, on: boolean, seed: number) => {
      const m = r.current; if (!m) return
      for (let k = 0; k < 18; k++) {
        const f = (t * 0.35 + k / 18 + seed) % 1, j = S.jit[(k + seed * 50) % 400]
        v.copy(from).lerp(new THREE.Vector3(0.2 + Math.sin(j[0]) * 0.5, -0.2 + Math.sin(j[1]) * 0.5, 0.1), f)
        s.setScalar(on ? 0.05 * (1 - f * 0.6) : 0); m.setMatrixAt(k, M.compose(v, q.identity(), s))
      }
      m.instanceMatrix.needsUpdate = true
    }
    stream(ref.bile, BILE_AT, L.bile > 0.02 && L.bile < 0.98, 0)
    stream(ref.pan, PAN_AT, L.juice > 0.02 && L.juice < 0.98, 1)
    for (const r of Object.values(ref)) { const m = r.current; if (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true } }
    mat.bond.opacity = Math.max(0, 1 - kj * 2.2)
    // 亮起来的那一种：别的变淡
    const glow = (m: THREE.MeshPhysicalMaterial, k: Macro, col: string) => { const on = w.focus === k; m.emissive.set(on ? col : '#000000'); m.emissiveIntensity = on ? 0.35 + 0.15 * Math.sin(t * 4) : 0; m.opacity = dimOf(k); m.depthWrite = m.opacity > 0.6 }
    glow(mat.starch, 'starch', '#fff0c0'); glow(mat.bead, 'protein', '#ffffff'); glow(mat.rod, 'fat', '#ffd070'); glow(mat.gly, 'fat', '#ffffff'); glow(mat.drop, 'fat', '#ffd070')
    mat.fluid.opacity = 0.05 + 0.08 * kb
    mat.fluid.color.set('#e9e0b0').lerp(new THREE.Color('#c8d870'), kb * (1 - kj * 0.5))
  })
  return <group position={DUO_AT}>
    <mesh geometry={geo.wall} material={mat.wall} />
    {/* 两个导管开口 */}
    <mesh geometry={geo.duct} position={BILE_AT} quaternion={faceIn(BILE_AT)}><meshPhysicalMaterial color="#7e9a36" roughness={0.35} clearcoat={0.9} /></mesh>
    <mesh geometry={geo.duct} position={PAN_AT} quaternion={faceIn(PAN_AT)}><meshPhysicalMaterial color="#e2b48a" roughness={0.35} clearcoat={0.9} /></mesh>
    <instancedMesh ref={ref.hex} args={[geo.hex, mat.starch, nHex]} castShadow />
    <instancedMesh ref={ref.bead} args={[geo.bead, mat.bead, nBead]} castShadow />
    <instancedMesh ref={ref.bond} args={[geo.bond, mat.bond, nBond]} />
    <instancedMesh ref={ref.drop} args={[geo.drop, mat.drop, nSmall]} castShadow />
    <instancedMesh ref={ref.gly} args={[geo.gly, mat.gly, nSmall]} />
    <instancedMesh ref={ref.rod} args={[geo.rod, mat.rod, nSmall * 3]} />
    <instancedMesh ref={ref.bile} args={[geo.bead, mat.bile, 18]} />
    <instancedMesh ref={ref.pan} args={[geo.bead, mat.pan, 18]} />
    {/* 球面玻璃：很淡的一层，边上有反光 */}
    <mesh material={mat.glass} renderOrder={9}><sphereGeometry args={[R, 64, 40]} /></mesh>
  </group>
}
