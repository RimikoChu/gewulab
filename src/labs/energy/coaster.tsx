// 过山车：一圈闭合的钢管轨道（两根走行轨、一根主梁、V 形枕木、立柱和斜撑、提升段的检修走道），加一列三节的列车。
// 轨道中心线由一串控制点连成；沿线每 0.25 m 存一组位置和朝向，列车、枕木、立柱都按它摆。弯道按曲率向里倾斜。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, mergeParts, type Part } from '@/lab-kit'
import { COASTER } from './physics'
import { beam, box, cyl, type V3 } from './mats'

/** 轨道在世界里的位置：站台在西头，提升段往东，谷底和第二个坡在东边，回程在北侧 */
const Z0 = -14, Z1 = -34, VALLEY_Y = 1.1
const PTS: V3[] = [
  [-2, 3.1, Z0], [8, 3.1, Z0], [17, 3.1, Z0], [23, 4.3, Z0], [33, 10.2, Z0], [43, 16.6, Z0], [50, 20.2, Z0], [55, 21.1, Z0], [60, 20.2, Z0],
  [66, 14, Z0], [71, 6.4, Z0], [76, 1.9, Z0], [81, VALLEY_Y, Z0], [86, 1.9, Z0], [91, 6.6, Z0], [96, 11.6, Z0], [101, 13.1, Z0], [106, 11.8, Z0],
  [112, 7.4, Z0 - 1], [118, 4.6, Z0 - 5], [121, 4, Z0 - 11], [118, 4, Z1 + 3], [110, 4.4, Z1], [97, 6.8, Z1], [84, 4.2, Z1], [70, 5.8, Z1], [56, 3.6, Z1],
  [40, 3.1, Z1], [20, 3.1, Z1], [0, 3.1, Z1], [-10, 3.1, Z1 + 2.5], [-14, 3.1, Z1 + 10], [-11, 3.1, Z0 - 3],
]
const STEP = 0.25, GAUGE = 0.55, SPINE = 0.55

export interface Track {
  len: number
  /** 沿线 s 米处的位置和朝向：前、上、右 */
  at: (s: number, pos: THREE.Vector3, tan?: THREE.Vector3, nor?: THREE.Vector3, right?: THREE.Vector3) => void
  /** s 处的高度读数（m，从谷底算起；坡顶正好 20，第二个坡顶正好 12） */
  height: (s: number) => number
  sStation: number; sTop: number; sValley: number; sHill: number; sBrake: number
}
let track: Track | null = null
export function getTrack(): Track {
  if (track) return track
  const curve = new THREE.CatmullRomCurve3(PTS.map(p => new THREE.Vector3(...p)), true, 'centripetal'); curve.arcLengthDivisions = 4000
  const len = curve.getLength(), N = Math.round(len / STEP)
  const P = new Float32Array((N + 1) * 3), T = new Float32Array((N + 1) * 3), U = new Float32Array((N + 1) * 3), R = new Float32Array((N + 1) * 3)
  const p = new THREE.Vector3(), t = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), r = new THREE.Vector3(), n = new THREE.Vector3()
  const head = new Float32Array(N + 1)
  for (let i = 0; i <= N; i++) { curve.getPointAt(i / N, p); curve.getTangentAt(i / N, t); P.set([p.x, p.y, p.z], i * 3); T.set([t.x, t.y, t.z], i * 3); head[i] = Math.atan2(t.z, t.x) }
  // 弯道的倾斜：水平转弯越急，向里倾得越多（按 12 m/s 过弯估算，最多 40°），前后各取 3 m 抹平
  const bank = new Float32Array(N + 1), W = 12
  for (let i = 0; i <= N; i++) { let d = head[(i + W) % N] - head[(i - W + N) % N]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; bank[i] = Math.max(-0.7, Math.min(0.7, Math.atan(14.7 * d / (2 * W * STEP)))) }
  for (let i = 0; i <= N; i++) {
    let b = 0; for (let k = -W; k <= W; k++) b += bank[(i + k + N) % N]; b /= 2 * W + 1
    t.fromArray(T, i * 3); r.crossVectors(t, up).normalize(); n.crossVectors(r, t).normalize()
    const c = Math.cos(b), s = Math.sin(b)
    U.set([n.x * c + r.x * s, n.y * c + r.y * s, n.z * c + r.z * s], i * 3); R.set([r.x * c - n.x * s, r.y * c - n.y * s, r.z * c - n.z * s], i * 3)
  }
  const lerp = (A: Float32Array, f: number, out: THREE.Vector3) => { const i = Math.floor(f), k = f - i, j = Math.min(N, i + 1); out.set(A[i * 3] + (A[j * 3] - A[i * 3]) * k, A[i * 3 + 1] + (A[j * 3 + 1] - A[i * 3 + 1]) * k, A[i * 3 + 2] + (A[j * 3 + 2] - A[i * 3 + 2]) * k) }
  const at: Track['at'] = (s, pos, tan, nor, right) => { const f = (((s % len) + len) % len) / len * N; lerp(P, f, pos); if (tan) { lerp(T, f, tan); tan.normalize() } if (nor) { lerp(U, f, nor); nor.normalize() } if (right) { lerp(R, f, right); right.normalize() } }
  // 几个要紧的位置：第一个坡顶、谷底、第二个坡顶（都在去程，z = Z0 的那一段）
  const out = (i: number) => Math.abs(P[i * 3 + 2] - Z0) < 0.6
  let iTop = 0, iVal = 0, iHill = 0
  for (let i = 0; i <= N; i++) if (out(i) && P[i * 3 + 1] > P[iTop * 3 + 1]) iTop = i
  iVal = iTop; for (let i = iTop; i <= N && out(i); i++) if (P[i * 3 + 1] < P[iVal * 3 + 1]) iVal = i
  iHill = iVal; for (let i = iVal; i <= N && out(i); i++) if (P[i * 3 + 1] > P[iHill * 3 + 1]) iHill = i
  const yT = P[iTop * 3 + 1], yV = P[iVal * 3 + 1], yH = P[iHill * 3 + 1]
  const height: Track['height'] = s => {
    const f = (((s % len) + len) % len) / len * N, i = Math.floor(f), j = Math.min(N, i + 1), y = P[i * 3 + 1] + (P[j * 3 + 1] - P[i * 3 + 1]) * (f - i)
    return f <= iVal ? (y - yV) / (yT - yV) * COASTER.top : (y - yV) / (yH - yV) * COASTER.hill
  }
  track = { len, at, height, sStation: 10, sTop: iTop * len / N, sValley: iVal * len / N, sHill: iHill * len / N, sBrake: len - 62 }
  return track
}

/** 沿轨道的一根管：往右偏 dr、往上偏 dn，半径 rad；从 s0 到 s1 */
function pipe(tr: Track, dr: number, dn: number, rad: number, s0: number, s1: number, radial = 8, step = 0.5) {
  const n = Math.max(1, Math.round((s1 - s0) / step)), pos: number[] = [], nor: number[] = [], idx: number[] = []
  const p = new THREE.Vector3(), u = new THREE.Vector3(), r = new THREE.Vector3(), t = new THREE.Vector3()
  for (let i = 0; i <= n; i++) {
    tr.at(s0 + (s1 - s0) * i / n, p, t, u, r); p.addScaledVector(r, dr).addScaledVector(u, dn)
    for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pos.push(p.x + (r.x * c + u.x * s) * rad, p.y + (r.y * c + u.y * s) * rad, p.z + (r.z * c + u.z * s) * rad); nor.push(r.x * c + u.x * s, r.y * c + u.y * s, r.z * c + u.z * s) }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx)
  return g
}
/** 两点之间的一根圆杆 */
function rod(a: V3, b: V3, r: number, c: string): Part { const q = beam(a, b, r, c); return { ...q, s: [r, q.s[1], 0], cyl: true } }

const RAIL = '#c8372d', POST = '#e4e0d4', DARK = '#3b4046'
function buildTrack() {
  const tr = getTrack(), ties: Part[] = [], posts: Part[] = [], walk: Part[] = []
  const p = new THREE.Vector3(), t = new THREE.Vector3(), u = new THREE.Vector3(), r = new THREE.Vector3()
  const off = (dr: number, dn: number): V3 => [p.x + r.x * dr + u.x * dn, p.y + r.y * dr + u.y * dn, p.z + r.z * dr + u.z * dn]
  // 枕木：每 1 m 一组，两根走行轨各有一根斜杆接到下面的主梁上，上面一根横杆
  for (let s = 0; s < tr.len; s += 1) { tr.at(s, p, t, u, r); ties.push(beam(off(-GAUGE, -0.02), off(0, -SPINE), 0.07, RAIL), beam(off(GAUGE, -0.02), off(0, -SPINE), 0.07, RAIL), beam(off(-GAUGE, -0.06), off(GAUGE, -0.06), 0.06, RAIL)) }
  // 立柱：每 6 m 一处。矮的地方一根柱子；高的地方左右两条斜腿撑成人字，中间加横撑，底下是混凝土墩
  for (let s = 3; s < tr.len; s += 6) {
    tr.at(s, p, t, u, r)
    const top = off(0, -SPINE - 0.1), h = top[1]; if (h < 0.5) continue
    const side = new THREE.Vector3(t.z, 0, -t.x).normalize()   // 水平方向上垂直于轨道
    if (h < 5.5) { posts.push(rod([top[0], 0.3, top[2]], top, 0.17, POST), box(top[0], 0, top[2], 0.9, 0.32, 0.9, '#a9a79f')); continue }
    const w = 0.9 + h * 0.13
    const fa: V3 = [top[0] + side.x * w, 0.3, top[2] + side.z * w], fb: V3 = [top[0] - side.x * w, 0.3, top[2] - side.z * w]
    posts.push(rod(fa, top, 0.18, POST), rod(fb, top, 0.18, POST), box(fa[0], 0, fa[2], 1, 0.34, 1, '#a9a79f'), box(fb[0], 0, fb[2], 1, 0.34, 1, '#a9a79f'))
    for (let y = 4.5; y < h - 2.5; y += 5) { const k = (y - 0.3) / (h - 0.3), a: V3 = [fa[0] + (top[0] - fa[0]) * k, y, fa[2] + (top[2] - fa[2]) * k], b: V3 = [fb[0] + (top[0] - fb[0]) * k, y, fb[2] + (top[2] - fb[2]) * k]; posts.push(rod(a, b, 0.09, POST)) }
    posts.push(rod([top[0], top[1] - 0.2, top[2]], [top[0], top[1] + 0.25, top[2]], 0.24, POST))
  }
  // 提升段右侧的检修走道：踏板、栏杆柱
  for (let s = tr.sStation + 10; s < tr.sTop + 1; s += 0.6) {
    tr.at(s, p, t, u, r); const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, u, r))
    const a = off(1.35, -0.3); walk.push({ p: a, s: [0.5, 0.05, 0.75], c: '#6f757b', r: [e.x, e.y, e.z] })
    if (Math.round((s - tr.sStation) / 0.6) % 3 === 0) { const b = off(1.72, -0.3), c = off(1.72, 0.75); walk.push(rod(b, c, 0.025, '#d8b23a'), beam(off(0.55, -0.25), off(1.72, -0.34), 0.06, DARK)) }
  }
  return {
    rails: [pipe(tr, -GAUGE, 0, 0.085, 0, tr.len), pipe(tr, GAUGE, 0, 0.085, 0, tr.len), pipe(tr, 0, -SPINE, 0.2, 0, tr.len, 10)],
    hand: [pipe(tr, 1.72, 0.75, 0.03, tr.sStation + 10, tr.sTop + 1, 6, 1), pipe(tr, 1.72, 0.25, 0.022, tr.sStation + 10, tr.sTop + 1, 6, 1)],
    chain: pipe(tr, 0, -0.2, 0.06, tr.sStation + 6, tr.sTop + 0.5, 6, 1),
    ties: mergeParts(ties), posts: mergeParts(posts), walk: mergeParts(walk),
  }
}

/** 整条轨道和它的支架 */
export function CoasterTrack() {
  const g = useMemo(buildTrack, [])
  return <group>
    {g.rails.map((r, i) => <mesh key={i} geometry={r} castShadow receiveShadow><meshPhysicalMaterial color={RAIL} roughness={0.38} metalness={0.3} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>)}
    <mesh geometry={g.ties} castShadow><meshPhysicalMaterial color={RAIL} roughness={0.42} metalness={0.3} clearcoat={0.4} clearcoatRoughness={0.35} /></mesh>
    <mesh geometry={g.posts} castShadow receiveShadow><Painted rough={0.5} metal={0.2} /></mesh>
    <mesh geometry={g.walk} castShadow><Painted rough={0.6} metal={0.5} /></mesh>
    {g.hand.map((r, i) => <mesh key={i} geometry={r}><meshStandardMaterial color="#d8b23a" roughness={0.5} metalness={0.3} /></mesh>)}
    <mesh geometry={g.chain}><Metal kind="iron" grain="cast" /></mesh>
  </group>
}

// ---------- 列车 ----------
const BODY = (() => {
  // 车身的侧面轮廓（前在 +x）：车头翘起，座舱下凹，尾部有靠背
  const s = new THREE.Shape()
  s.moveTo(-1.15, 0.18); s.lineTo(1.0, 0.18); s.quadraticCurveTo(1.32, 0.2, 1.3, 0.5); s.quadraticCurveTo(1.25, 0.84, 0.9, 0.88)
  s.lineTo(0.62, 0.6); s.lineTo(-0.9, 0.6); s.lineTo(-1.0, 1.06); s.quadraticCurveTo(-1.16, 1.1, -1.2, 0.9); s.lineTo(-1.15, 0.18)
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3, curveSegments: 10 }); g.translate(0, 0, -0.5)
  return g
})()
const BAR = new THREE.TorusGeometry(0.2, 0.028, 8, 20, Math.PI * 1.1)
/** 一节车。原点在两根走行轨顶面的正中，+x 朝前，+y 朝上 */
function Car({ color, front }: { color: string; front?: boolean }) {
  const paint = <meshPhysicalMaterial color={color} roughness={0.3} metalness={0.25} clearcoat={0.8} clearcoatRoughness={0.15} />
  return <group>
    <mesh geometry={BODY} castShadow receiveShadow>{paint}</mesh>
    {/* 车身两侧的浅色腰线 */}
    {[-1, 1].map(k => <mesh key={k} position={[0, 0.46, k * 0.575]}><boxGeometry args={[2.1, 0.07, 0.012]} /><meshStandardMaterial color="#f2d25a" roughness={0.4} /></mesh>)}
    {/* 两排座椅：坐垫、靠背、头枕、压肩护杠 */}
    {[-0.55, 0.22].map(x => <group key={x} position={[x, 0.6, 0]}>
      <RoundedBox args={[0.46, 0.12, 0.86]} radius={0.04} position={[0.1, 0.07, 0]}><meshStandardMaterial color="#23272c" roughness={0.8} /></RoundedBox>
      <RoundedBox args={[0.12, 0.56, 0.86]} radius={0.04} position={[-0.17, 0.32, 0]} rotation-z={0.12}><meshStandardMaterial color="#23272c" roughness={0.8} /></RoundedBox>
      {[-0.22, 0.22].map(z => <group key={z} position={[0, 0, z]}>
        <RoundedBox args={[0.1, 0.2, 0.26]} radius={0.04} position={[-0.21, 0.7, 0]}><meshStandardMaterial color="#2c3238" roughness={0.75} /></RoundedBox>
        <mesh geometry={BAR} position={[0.06, 0.42, 0]} rotation={[0, 0, 0.5]} castShadow><meshStandardMaterial color="#f2c230" roughness={0.45} metalness={0.2} /></mesh>
      </group>)}
    </group>)}
    {front && <mesh position={[1.22, 0.52, 0]} scale={[0.5, 0.36, 0.56]} castShadow><sphereGeometry args={[1, 24, 16]} />{paint}</mesh>}
    {/* 轮架：每个角一组，走行轮压在轨面上，导向轮贴着轨道外侧，倒挂轮钩在轨道下面 */}
    {[-0.8, 0.8].map(x => [-1, 1].map(k => <group key={`${x}${k}`} position={[x, 0, k * GAUGE]}>
      <mesh position={[0, 0.0, k * 0.27]} castShadow><boxGeometry args={[0.4, 0.62, 0.06]} /><Metal kind="steel" grain="brushed" /></mesh>
      <mesh position={[0, 0.115, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.115, 0.115, 0.1, 20]} /><meshStandardMaterial color="#d9772a" roughness={0.6} /></mesh>
      <mesh position={[0, -0.085, k * 0.17]}><cylinderGeometry args={[0.085, 0.085, 0.08, 16]} /><meshStandardMaterial color="#d9772a" roughness={0.6} /></mesh>
      <mesh position={[0, -0.24, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.08, 16]} /><meshStandardMaterial color="#d9772a" roughness={0.6} /></mesh>
    </group>))}
    {/* 车与车之间的挂钩 */}
    <mesh position={[-1.32, 0.3, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.36, 10]} /><Metal kind="steel" /></mesh>
  </group>
}

export const CARS = 3, CAR_GAP = 2.72
/** 一列车。drive.s 是车头那一节的中心在轨道上的位置（m），每帧读一次 */
export function Train({ drive }: { drive: { s: number } }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), u: new THREE.Vector3(), r: new THREE.Vector3(), m: new THREE.Matrix4() }), [])
  const put = () => {
    const tr = getTrack()
    for (let i = 0; i < CARS; i++) {
      const g = refs.current[i]; if (!g) continue
      tr.at(drive.s - i * CAR_GAP, tmp.p, tmp.t, tmp.u, tmp.r)
      tmp.m.makeBasis(tmp.t, tmp.u, tmp.r); g.quaternion.setFromRotationMatrix(tmp.m); g.position.copy(tmp.p).addScaledVector(tmp.u, 0.085)
    }
  }
  useFrame(put)
  return <>{Array.from({ length: CARS }, (_, i) => <group key={i} ref={e => { refs.current[i] = e; if (e) put() }}><Car color={i === 0 ? '#1f4f9c' : '#245bb0'} front={i === 0} /></group>)}</>
}

/** 站台：高出地面的候车平台、顶棚、楼梯、招牌。原点在站台中心的地面上 */
export function stationParts(x: number, z: number): Part[] {
  const P: Part[] = [], deck = 2.55
  // 轨道南北两侧各一条平台，底下是钢架
  for (const k of [-1, 1]) {
    P.push(box(x, deck - 0.14, z + k * 2.1, 19, 0.14, 2.2, '#8b8f93'), box(x, deck, z + k * 1.06, 19, 0.03, 0.14, '#e2b534'))
    for (let i = -4; i <= 4; i++) P.push(box(x + i * 2.3, 0, z + k * 2.9, 0.16, deck - 0.14, 0.16, '#5c6268'), box(x + i * 2.3, 0, z + k * 1.3, 0.16, deck - 0.14, 0.16, '#5c6268'))
    for (let i = -4; i < 4; i++) P.push(beam([x + i * 2.3, 0.2, z + k * 2.9], [x + (i + 1) * 2.3, deck - 0.3, z + k * 2.9], 0.07, '#5c6268'))
    // 栏杆
    for (let i = -8; i <= 8; i++) P.push(box(x + i * 1.18, deck, z + k * 3.15, 0.05, 1.05, 0.05, '#d9dcdf'))
    P.push(box(x, deck + 1.02, z + k * 3.15, 19, 0.06, 0.06, '#d9dcdf'), box(x, deck + 0.55, z + k * 3.15, 19, 0.04, 0.04, '#d9dcdf'))
    // 顶棚的柱子
    for (const i of [-8.6, -2.9, 2.9, 8.6]) P.push(box(x + i, deck, z + k * 2.75, 0.2, 3.6, 0.2, '#f1eee4'))
  }
  // 顶棚：两坡，红白相间的檐口
  for (const k of [-1, 1]) P.push({ p: [x, deck + 4.2, z + k * 1.75], s: [20.4, 0.12, 3.9], c: '#b9392f', r: [k * 0.32, 0, 0] })
  P.push(box(x, deck + 4.72, z, 20.4, 0.16, 0.3, '#8f2a22'))
  for (let i = -8; i <= 8; i++) for (const k of [-1, 1]) P.push(box(x + i * 1.2, deck + 3.35, z + k * 3.5, 0.6, 0.3, 0.05, i % 2 ? '#f4efe2' : '#c8372d'))
  // 南面的楼梯
  for (let i = 0; i < 12; i++) P.push(box(x - 6, 0, z + 3.3 + (12 - i) * 0.3, 2.2, (i + 1) * (deck / 12), 0.3, '#9a9da0'))
  for (const s of [-1.1, 1.1]) P.push(beam([x - 6 + s, 1.05, z + 6.9], [x - 6 + s, deck + 1.05, z + 3.4], 0.06, '#d9dcdf'), box(x - 6 + s, 0, z + 6.9, 0.05, 1.05, 0.05, '#d9dcdf'))
  return P
}
