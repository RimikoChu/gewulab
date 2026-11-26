// 放大的耳剖面（第 6 课）：一块剖开的颞骨，外面是耳廓和外耳道，往里是鼓膜、中耳（三块听小骨、咽鼓管）、内耳（耳蜗、半规管），
// 耳蜗后面接听觉神经。外耳在右边（+x），声音从右边来；神经往左边走，去人体的头。剖面朝镜头（z = 0），模型按 1 mm 一个单位，放进展馆时乘 EAR_S。
// 耳廓按示意缩小了：真的耳廓比中耳、内耳大得多。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, lathe } from '@/lab-kit'
import { useJob } from './job'
import { skinMat, wetMat } from './mats'
import { curveOf, ellipsoid, fbm, lin, mix3, noise, roundCone, sminAll, smin, surfaceNetsGen, type V3 } from './sdf'

export const DRUM_X = 0
export const COCHLEA: V3 = [-12.5, -2.6, -2.4]
export const CANALS: V3 = [-9.5, 6.8, -2.6]
const MIDDLE: V3 = [-3.2, 1.0, -2.2]
/** 咽鼓管：中耳底部往左下通到咽 */
export const TUBE_PTS: V3[] = [[-2.4, -3.0, -1.6], [-4.5, -7.5, -1.8], [-7.5, -11.5, -1.9], [-10, -14.5, -1.9]]
function boneSdf(x: number, y: number, z: number) {
  const box = Math.max(Math.abs(x + 7) - 11.5, Math.abs(y) - 12.5, Math.abs(z + 5) - 2.5) - 3.2
  let d = smin(box, ellipsoid(x, y, z, [-7.5, 0, -5], [16.5, 17.0, 7.0]), 4)
  d = Math.max(d, -roundCone(x, y, z, [9, 0.4, -2.0], [0.2, 0, -2.0], 3.3, 2.9))               // 外耳道
  d = Math.max(d, -ellipsoid(x, y, z, MIDDLE, [3.6, 5.6, 3.2]))                                 // 鼓室
  d = Math.max(d, -ellipsoid(x, y, z, COCHLEA, [6.4, 5.8, 4.0]))                                // 耳蜗所在的腔
  d = Math.max(d, -ellipsoid(x, y, z, CANALS, [5.2, 5.0, 4.4]))                                 // 半规管所在的腔
  d = Math.max(d, -ellipsoid(x, y, z, [-8.5, 1.8, -2.4], [3.0, 2.8, 2.6]))                      // 前庭
  for (let i = 0; i < TUBE_PTS.length - 1; i++) d = Math.max(d, -roundCone(x, y, z, TUBE_PTS[i], TUBE_PTS[i + 1], 1.2, 1.5))
  d = Math.max(d, -roundCone(x, y, z, [-14, -1.5, -2.4], [-23, -0.8, -2.4], 1.9, 1.9))          // 内耳道（神经走的路）
  d = Math.max(d, z)                                                                            // 朝镜头剖开
  return d + 0.05 * fbm(x * 0.35, y * 0.35, z * 0.35, 2)
}
function pinnaSdf(x: number, y: number, z: number) {
  // 剖面上看，耳廓是从头侧伸出去的一片弯弯的软骨（外面包着皮肤）：上面的耳轮向外卷，下面垂着耳垂，中间的耳甲腔连着耳道口
  const chain = (pts: V3[], r0: number, r1: number) => { let e = 1e9; for (let i = 0; i < pts.length - 1; i++) e = Math.min(e, roundCone(x, y, z, pts[i], pts[i + 1], r0 + (r1 - r0) * i / (pts.length - 1), r0 + (r1 - r0) * (i + 1) / (pts.length - 1))); return e }
  const zz: number = -4.5
  let d = sminAll([
    chain([[8.2, 4.4, zz], [9.6, 8.6, zz], [12.0, 12.6, zz], [14.6, 13.6, zz], [15.6, 11.8, zz], [14.6, 10.6, zz]], 1.25, 0.9),   // 耳轮
    chain([[8.2, -4.0, zz], [9.4, -8.4, zz], [9.9, -11.5, zz], [9.2, -13.2, zz]], 1.3, 1.6),                                     // 耳垂
    chain([[8.4, 3.9, zz], [10.6, 4.6, zz]], 1.1, 0.8),                                                                          // 耳屏上方
    chain([[8.4, -3.4, zz], [10.4, -4.4, zz]], 1.1, 0.8),
    Math.max(Math.abs(x - 7.6) - 1.3, Math.abs(y) - 15.2, Math.abs(z + 5) - 5.2) - 0.2,                                         // 头侧的皮肤
  ], 1.2)
  d = Math.max(d, z + 0.05 * (x - 7.6) - 0.0)
  d = Math.max(d, -roundCone(x, y, z, [14, 0.6, -2.0], [5.5, 0.4, -2.0], 3.6, 3.3))
  d = Math.max(d, z - 0.0)
  return Math.max(d, -(z + 10.4)) + 0.04 * noise(x * 0.5, y * 0.5, z * 0.5)
}
const C = { bone: lin('#e7d9bd'), boneCut: lin('#d4c09a'), pore: lin('#b49a72'), lining: lin('#e7a598') }
function* boneGen() {
  return yield* surfaceNetsGen(boneSdf, [[-24, -18, -11], [9.5, 18, 0.6]], 0.3, (p, n) => {
    const cut = n[2] > 0.8 && p[2] > -0.4
    if (cut) { const v = Math.max(0, noise(p[0] * 0.45, p[1] * 0.45, 0.5)) + 0.5 * Math.max(0, noise(p[0] * 1.1, p[1] * 1.1, 3)); return mix3(C.boneCut, C.pore, Math.min(0.7, v * 0.9)) }
    // 腔里的内壁是一层湿润的黏膜
    const out = Math.abs(p[0] + 7) > 14 || Math.abs(p[1]) > 15 || p[2] < -9.6
    return out ? mix3(C.bone, C.pore, 0.15 + 0.2 * noise(p[0], p[1], p[2])) : C.lining
  })
}
function* pinnaGen() { return yield* surfaceNetsGen(pinnaSdf, [[5.5, -15.8, -10.8], [17.2, 15.6, 0.6]], 0.22, (_, n) => (n[2] > 0.8 ? lin('#c98c78') : lin('#d4a084'))) }

/** 耳蜗：二又四分之三圈的螺旋管，越往里越细 */
const SPIRAL = (() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 2.75, r = 4.6 * (1 - 0.72 * t); pts.push(new THREE.Vector3(COCHLEA[0] + Math.cos(a + 0.6) * r, COCHLEA[1] + Math.sin(a + 0.6) * r, COCHLEA[2] + 1.6 * t)) } return new THREE.CatmullRomCurve3(pts) })()
export const spiralCurve = SPIRAL
function innerGeos() {
  const tube = (c: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 160) => {
    const g = new THREE.TubeGeometry(c, segs, 1, 16), p = g.attributes.position, cc = new THREE.Vector3(), v = new THREE.Vector3()
    for (let i = 0; i <= segs; i++) { c.getPointAt(i / segs, cc); const r = r0 + (r1 - r0) * i / segs; for (let j = 0; j <= 16; j++) { const k = i * 17 + j; v.fromBufferAttribute(p, k).sub(cc).multiplyScalar(r).add(cc); p.setXYZ(k, v.x, v.y, v.z) } }
    g.computeVertexNormals(); return g
  }
  const cochlea = tube(SPIRAL, 1.45, 0.55, 220)
  // 三个半规管：互相垂直的三个环，接在前庭上
  const ring = (rot: [number, number, number], off: V3) => { const g = new THREE.TorusGeometry(3.0, 0.5, 14, 64, Math.PI * 1.6); g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(CANALS[0] + off[0], CANALS[1] + off[1], CANALS[2] + off[2]); return g }
  const canals = mergeGeometries([ring([0, 0, -0.5], [0.4, 0.6, 0]), ring([Math.PI / 2, 0, 0.2], [-0.3, -0.2, 0.2]), ring([0, Math.PI / 2, 2.2], [0.8, -0.5, -0.4])])
  const vest = new THREE.SphereGeometry(1, 32, 20); vest.scale(2.6, 2.2, 2.0); vest.translate(-8.5, 1.8, -2.4)
  const nerve = tube(curveOf([[COCHLEA[0], COCHLEA[1] + 0.3, COCHLEA[2] - 0.4], [-16, -1.6, -2.4], [-20, -1.0, -2.4], [-24, -0.8, -2.4]], 0.5), 1.1, 1.5, 60)
  const vnerve = tube(curveOf([[-8.8, 2.4, -2.6], [-12, 0.6, -2.6], [-16, -0.9, -2.4]], 0.5), 0.6, 0.8, 40)
  return { cochlea, canals, vest, nerve: mergeGeometries([nerve, vnerve]) }
}
let IG: ReturnType<typeof innerGeos> | null = null
const ig = () => (IG ??= innerGeos())
/** 听觉神经从耳里出来往左的那一头（模型坐标） */
export const NERVE_OUT: V3[] = [[COCHLEA[0], COCHLEA[1] + 0.3, -0.3], [-16, -1.6, -0.3], [-20, -1.0, -0.3], [-24, -0.8, -0.3]]
/** 声音的路：耳道口 → 鼓膜 → 三块听小骨 → 卵圆窗 → 沿耳蜗走进去 */
export const OSS = { malleus: [-0.9, 2.0, -1.4] as V3, incus: [-3.4, 3.6, -1.6] as V3, stapes: [-5.6, 1.6, -1.8] as V3, oval: [-7.0, 1.2, -2.0] as V3 }

/** 三块听小骨：锤骨的柄贴在鼓膜上，砧骨在中间，镫骨的底板盖在卵圆窗上。用平滑融合的小形体拼 */
function ossSdf(x: number, y: number, z: number) {
  const m = smin(roundCone(x, y, z, [-0.35, -2.6, -1.6], [-1.0, 2.2, -1.5], 0.32, 0.45), ellipsoid(x, y, z, [-1.3, 3.2, -1.5], [0.95, 1.05, 0.85]), 0.4)
  const inc = sminAll([ellipsoid(x, y, z, [-2.55, 3.6, -1.6], [0.95, 0.9, 0.8]), roundCone(x, y, z, [-2.6, 3.4, -1.6], [-4.2, 4.4, -1.8], 0.45, 0.3), roundCone(x, y, z, [-2.8, 3.0, -1.6], [-3.6, 1.4, -1.7], 0.4, 0.26)], 0.35)
  // 镫骨：两条腿和一块底板
  const st = sminAll([roundCone(x, y, z, [-3.7, 1.35, -1.7], [-6.4, 2.0, -2.2], 0.22, 0.2), roundCone(x, y, z, [-3.7, 1.35, -1.7], [-6.4, 0.6, -1.6], 0.22, 0.2), ellipsoid(x, y, z, [-6.6, 1.3, -1.9], [0.32, 1.1, 0.9])], 0.15)
  return Math.min(m, inc, st)
}
function* ossGen() { return yield* surfaceNetsGen(ossSdf, [[-7.5, -3.4, -3.2], [0.4, 5.6, -0.2]], 0.08) }

/** 耳的剖面。vib：鼓膜和听小骨振动的幅度（0–1）；push：鼓膜被压进去多少（0–1）；glow：耳蜗亮多少；tube：咽鼓管开着没有 */
export function Ear({ vib, push, glow, tube }: { vib: number; push: number; glow: number; tube: boolean }) {
  const bone = useJob('ear', boneGen), pinna = useJob('ear:pinna', pinnaGen), oss = useJob('ear:oss', ossGen)
  const G = ig()
  const m = useMemo(() => ({
    bone: wetMat(null, { roughness: 0.62, clearcoat: 0.2 }), skin: skinMat(),
    coch: wetMat('#e9b7ae', { roughness: 0.35, emissive: new THREE.Color('#62f0ff'), emissiveIntensity: 0 }),
    canal: wetMat('#e8c0b2', { roughness: 0.35 }), nerve: wetMat('#f1dca0', { roughness: 0.35, emissive: new THREE.Color('#ffc35a'), emissiveIntensity: 0.25 }),
    oss: wetMat('#f4ead6', { roughness: 0.3, clearcoat: 0.9 }),
    drum: new THREE.MeshPhysicalMaterial({ color: '#e6ddd6', roughness: 0.22, clearcoat: 1, side: THREE.DoubleSide, sheen: 0.8, sheenColor: new THREE.Color('#ffffff'), emissive: new THREE.Color('#62f0ff'), emissiveIntensity: 0 }),
    air: new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  }), [])
  // 鼓膜：浅浅的圆锥（中心往里凹一点，锤骨柄贴在上面）
  const drumG = useMemo(() => { const g = lathe([[0, 1.0], [1.2, 0.82], [2.6, 0.5], [3.8, 0.14], [4.3, 0], [4.25, -0.22], [3.7, -0.1], [2.5, 0.22], [1.15, 0.55], [0, 0.72]], { segs: 48, closed: true }); g.rotateZ(Math.PI / 2); return g }, [])
  const drum = useRef<THREE.Group>(null), ossG = useRef<THREE.Group>(null), cur = useRef({ push: 0, glow: 0, air: 0 })
  const tubeG = useMemo(() => new THREE.TubeGeometry(curveOf(TUBE_PTS, 0.5), 40, 1.0, 12), [])
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime, c = cur.current, k = 1 - Math.exp(-Math.min(dt, 1 / 30) / 0.12)
    c.push += (push - c.push) * k; c.glow += (glow - c.glow) * (1 - Math.exp(-Math.min(dt, 1 / 30) / 0.3)); c.air += ((tube ? 1 : 0) - c.air) * k
    const w = Math.sin(t * 40) * vib
    if (drum.current) { drum.current.scale.x = 1 - 0.9 * c.push + 0.35 * w; drum.current.position.x = DRUM_X - 0.25 * w - 0.5 * c.push }
    if (ossG.current) { ossG.current.position.x = -0.18 * w - 0.25 * c.push; ossG.current.rotation.z = 0.025 * w }
    m.coch.emissiveIntensity = 0.55 * c.glow; m.air.opacity = 0.35 * c.air * (0.6 + 0.4 * Math.sin(t * 6))
  })
  return <group>
    {bone && <mesh geometry={bone} material={m.bone} castShadow receiveShadow />}
    {pinna && <mesh geometry={pinna} material={m.skin} castShadow receiveShadow />}
    <group ref={drum} position={[DRUM_X, 0, -2.0]} rotation-z={0.28}><mesh geometry={drumG} material={m.drum} /></group>
    <group ref={ossG}>{oss && <mesh geometry={oss} material={m.oss} castShadow />}</group>
    <mesh geometry={G.cochlea} material={m.coch} castShadow />
    <mesh geometry={G.canals} material={m.canal} castShadow />
    <mesh geometry={G.vest} material={m.canal} />
    <mesh geometry={G.nerve} material={m.nerve} />
    <mesh geometry={tubeG} material={m.air} renderOrder={7} />
  </group>
}

/** 小音箱：深色的箱体、一圈橡胶折环的纸盆、中间的防尘帽、前面板上一圈螺丝。面朝 −x */
export function Speaker({ beat }: { beat: number }) {
  const cone = useMemo(() => lathe([[0.4, 0.2], [1.4, 0.55], [3.0, 1.25], [3.5, 1.4], [3.8, 1.2], [4.1, 1.42], [4.35, 1.5]], { segs: 64 }), [])
  const cone2 = useRef<THREE.Group>(null)
  useFrame(st => { if (cone2.current) cone2.current.position.y = 0.12 * beat * Math.sin(st.clock.elapsedTime * 40) })
  return <group rotation-z={Math.PI / 2}>
    <mesh position={[0, -2.4, 0]} castShadow receiveShadow><boxGeometry args={[11, 4.6, 11]} /><meshPhysicalMaterial color="#1b1e22" roughness={0.55} clearcoat={0.4} /></mesh>
    <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[4.8, 4.8, 0.2, 64]} /><Metal kind="aluminum" grain="turned" /></mesh>
    <group ref={cone2}>
      <mesh geometry={cone} position={[0, -1.4, 0]}><meshStandardMaterial color="#2a2c30" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -0.95, 0]} scale={[1.3, 0.5, 1.3]}><sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#3a3d42" roughness={0.35} clearcoat={0.8} /></mesh>
    </group>
    {Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 4.45, 0.04, Math.sin(a) * 4.45]}><cylinderGeometry args={[0.18, 0.18, 0.12, 6]} /><Metal kind="stainless" /></mesh> })}
  </group>
}

/** 声波：一圈圈往左扩开的弧面，从音箱走到耳道口，再进到鼓膜 */
export function Waves({ on, loud, from, to }: { on: boolean; loud: number; from: V3; to: V3 }) {
  const N = 6, ref = useRef<THREE.Group>(null), t0 = useRef(-1)
  useFrame(st => {
    const g = ref.current; if (!g) return
    if (on && t0.current < 0) t0.current = st.clock.elapsedTime
    if (!on) t0.current = -1
    const t = t0.current < 0 ? 0 : st.clock.elapsedTime - t0.current
    g.children.forEach((c, i) => {
      // 一圈圈以音箱为中心往外扩：弧的半径就是走过的路
      const ph = (t * 0.55 + i / N) % 1
      c.position.set(...from); c.scale.setScalar(Math.max(0.01, dist * ph))
      const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; mat.opacity = on && t > i / N / 0.55 ? (0.28 + 0.4 * loud) * Math.min(1, ph / 0.1, (1 - ph) / 0.15) : 0
    })
  })
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
  // 朝 −x 方向（耳）的一段弧
  const arc = useMemo(() => new THREE.TorusGeometry(1, 0.012, 8, 48, 0.7).rotateZ(Math.PI - 0.35), [])
  return <group ref={ref}>{Array.from({ length: N }, (_, i) => <mesh key={i} geometry={arc} renderOrder={8}><meshBasicMaterial color="#bfe8ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>)}</group>
}
