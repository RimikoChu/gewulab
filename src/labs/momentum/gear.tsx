// 冰面上用的器材和各课共用的小工具：运动的时钟、矢量箭头、戴手套的手、冰球、冰壶、球杆、球门、泡棉垫。
// 尺寸按实物，单位是米。每件器材的原点和朝向写在各自的说明里。
import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, bolts, disc, lathe } from '@/lab-kit'
import { COL, type V3 } from './layout'
import { graniteTex, makeWood, netTex, once, rep } from './mats'
import { PUCK, STONE } from './physics'

/**
 * 一次运动的时钟：id 是 0 时停在起点（t = 0）；id 一变就从 0 秒开始走，每帧把现在的时刻交给 tick。
 * marks 是几个要报告的时刻，走到第 i 个就调一次 onMark(i)。时间按每帧的间隔累加，间隔封顶 1/30 秒：切走再切回来不会跳。
 */
export function useRun(id: number, tick: (t: number, dt: number) => void, marks: number[] = [], onMark?: (i: number) => void, rate = 1) {
  const s = useRef({ id: -1, t: 0, n: 0 }), cb = useRef({ tick, onMark, marks, rate }); cb.current = { tick, onMark, marks, rate }
  useFrame((_, d) => {
    const q = s.current, dt = Math.min(d, 1 / 30) * cb.current.rate
    if (q.id !== id) { q.id = id; q.t = 0; q.n = 0 }
    if (id !== 0) q.t = Math.min(600, q.t + dt)
    cb.current.tick(id === 0 ? 0 : q.t, dt)
    while (id !== 0 && q.n < cb.current.marks.length && q.t >= cb.current.marks[q.n]) cb.current.onMark?.(q.n++)
  })
}

/** 矢量箭头：从 from 出发，vec 是它在画面里的方向和长度（m）。不受遮挡，随时看得见。可以每帧用 set 改 */
export interface VecHandle { set: (from: V3, vec: V3) => void }
export const Vec = forwardRef<VecHandle, { color: string; thick?: number; from?: V3; vec?: V3 }>(function Vec({ color, thick = 0.02, from, vec }, ref) {
  const g = useRef<THREE.Group>(null), shaft = useRef<THREE.Mesh>(null), head = useRef<THREE.Mesh>(null)
  const api = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3()
    return {
      set(f: V3, v: V3) {
        const G = g.current, S = shaft.current, H = head.current; if (!G || !S || !H) return
        const len = Math.hypot(v[0], v[1], v[2])
        if (len < thick * 2) { G.visible = false; return }
        G.visible = true; G.position.set(f[0], f[1], f[2]); G.quaternion.setFromUnitVectors(up, d.set(v[0], v[1], v[2]).divideScalar(len))
        const h = Math.min(thick * 7, len * 0.55)
        S.scale.set(1, len - h, 1); S.position.y = (len - h) / 2; H.scale.set(1, h, 1); H.position.y = len - h / 2
      },
    }
  }, [thick])
  useImperativeHandle(ref, () => api, [api])
  useLayoutEffect(() => { if (from && vec) api.set(from, vec) })
  const mat = <meshBasicMaterial color={color} depthTest={false} transparent toneMapped={false} />
  return (
    <group ref={g} visible={false}>
      <mesh ref={shaft} renderOrder={10}><cylinderGeometry args={[thick, thick, 1, 12]} />{mat}</mesh>
      <mesh ref={head} renderOrder={10}><coneGeometry args={[thick * 2.7, 1, 18]} />{mat}</mesh>
      <mesh renderOrder={11}><sphereGeometry args={[thick * 1.7, 12, 10]} />{mat}</mesh>
    </group>
  )
})

const FINGER = new THREE.CapsuleGeometry(1, 3.2, 6, 14)
/**
 * 戴蓝色丁腈手套的手，接一截白色的袖子（写法参照概率实验室的手，复制在这里）。按真手的大小：手掌宽约 8 cm。
 * 摆放约定：手心朝下，手指朝 -z，袖子朝 +z，原点在手掌靠手指的一端。pinch：手指弯曲的程度（0 伸直，1 握住）；arm：袖子露出多长（m）
 */
export function Glove({ pinch = 0, arm = 0.3, sleeve = '#eeefea' }: { pinch?: number; arm?: number; sleeve?: string }) {
  const glove = <meshStandardMaterial color="#4a76bd" roughness={0.62} />
  const cloth = <meshStandardMaterial color={sleeve} roughness={0.88} />
  const grip = 0.15 + pinch * 0.75, sl = Math.max(10, arm * 100)
  return <group rotation-z={Math.PI}><group rotation-x={Math.PI / 2}><group scale={0.01}>
    <RoundedBox args={[8.2, 8.6, 3.4]} radius={1.5} smoothness={4} position={[0, 4.4, 0]} castShadow>{glove}</RoundedBox>
    {[-2.85, -0.95, 0.95, 2.85].map((x, i) => <group key={x} position={[x, 0.2, 0]} rotation-x={-grip * 1.1}>
      <mesh geometry={FINGER} position={[0, -2.2 + Math.abs(i - 1.5) * 0.4, 0]} scale={[0.95, 0.95 - Math.abs(i - 1.5) * 0.08, 0.95]} castShadow>{glove}</mesh>
    </group>)}
    <group position={[4.4, 3.4, -0.6]} rotation={[-grip * 0.6, 0, 0.75]}><mesh geometry={FINGER} position-y={-2.4} scale={[1.08, 0.82, 1.08]} castShadow>{glove}</mesh></group>
    <mesh position={[0, 10.2, 0]} castShadow><cylinderGeometry args={[3.7, 4.3, 3.2, 28]} />{glove}</mesh>
    <mesh position={[0, 11.9, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[3.75, 0.4, 8, 28]} />{glove}</mesh>
    <mesh position={[0, 12 + sl / 2, 0]} castShadow><cylinderGeometry args={[5.4, 4.9, sl, 28]} />{cloth}</mesh>
    <mesh position={[0, 12.4, 0]} castShadow><cylinderGeometry args={[4.95, 4.95, 1.2, 28]} /><meshStandardMaterial color="#e2e3de" roughness={0.9} /></mesh>
  </group></group></group>
}
/** 把手摆成：手指朝 fingers、手背朝 back（两个方向不必正好垂直，以 fingers 为准） */
export function gloveQuat(fingers: V3, back: V3) {
  const z = new THREE.Vector3(...fingers).normalize().negate(), y = new THREE.Vector3(...back)
  y.addScaledVector(z, -y.dot(z)).normalize()
  const x = new THREE.Vector3().crossVectors(y, z)
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
}

const paint = (color: string, rough = 0.35) => <meshPhysicalMaterial color={color} roughness={rough} clearcoat={0.55} clearcoatRoughness={0.25} />
const rubber = (color = '#16181a') => <meshStandardMaterial color={color} roughness={0.85} />

// ---------- 冰球 ----------
const PUCK_G = once(() => ({ body: disc(PUCK.r, PUCK.h, { chamfer: 0.0025 }), tape: disc(PUCK.r * 0.62, 0.0012, { chamfer: 0.0002 }) }))
/** 冰球：硫化橡胶的黑色圆饼，顶面贴一圈色标好分清是哪一只。原点在底面圆心。size：为了看得清放大几倍画 */
export function Puck({ color, size = 1 }: { color?: string; size?: number }) {
  const G = PUCK_G()
  return <group scale={size}>
    <mesh geometry={G.body} position-y={PUCK.h / 2} castShadow receiveShadow>{rubber('#121314')}</mesh>
    {color && <mesh geometry={G.tape} position-y={PUCK.h + 0.0006}><meshStandardMaterial color={color} roughness={0.5} /></mesh>}
  </group>
}

// ---------- 冰壶 ----------
const STONE_G = once(() => {
  const r = STONE.r, h = STONE.h
  return {
    body: lathe([[0, 0.006], [r * 0.42, 0.006], [r * 0.45, 0], [r * 0.52, 0], [r * 0.55, 0.006], [r * 0.82, 0.012], [r * 0.95, 0.03], [r, 0.048], [r, 0.07], [r * 0.95, 0.088], [r * 0.82, 0.104], [r * 0.6, h], [0, h]], { segs: 56 }),
    band: lathe([[r + 0.0015, 0.044], [r + 0.0015, 0.074]], { segs: 56 }),
    ring: lathe([[r + 0.002, 0.036], [r + 0.016, 0.04], [r + 0.02, 0.059], [r + 0.016, 0.078], [r + 0.002, 0.082]], { segs: 56 }),
    cap: lathe([[0, h], [r * 0.66, h], [r * 0.66, h + 0.006], [r * 0.62, h + 0.013], [r * 0.2, h + 0.017], [0, h + 0.017]], { segs: 48 }),
    handle: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.05, h + 0.012, 0], [-0.054, h + 0.036, 0], [-0.04, h + 0.054, 0], [-0.005, h + 0.062, 0], [0.04, h + 0.062, 0], [0.085, h + 0.058, 0]].map(p => new THREE.Vector3(...p))), 30, 0.0115, 10),
    bolt: bolts(1, 0, 0.015, 0.005),
  }
})
export type BandKind = 'steel' | 'rubber' | 'velcro' | 'none'
/**
 * 冰壶：花岗岩壶体（中间一圈磨毛的撞击带，底下一圈滑行环），上面是彩色盖板和鹅颈手柄。原点在底面圆心。
 * band：套在撞击带外面的缓冲圈（钢圈、橡胶圈、粘扣带）；size：整体缩放（小冰壶）
 */
export function Stone({ color = COL.A, band = 'none', size = 1 }: { color?: string; band?: BandKind; size?: number }) {
  const S = STONE_G(), map = graniteTex()
  return <group scale={size}>
    <mesh geometry={S.body} castShadow receiveShadow><meshPhysicalMaterial map={map} color="#c9ccd0" roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.2} envMapIntensity={0.9} /></mesh>
    <mesh geometry={S.band}><meshStandardMaterial map={map} color="#eef0f2" roughness={0.95} /></mesh>
    {band === 'steel' && <mesh geometry={S.ring} castShadow><Metal kind="stainless" grain="brushed" /></mesh>}
    {band === 'rubber' && <mesh geometry={S.ring} castShadow>{rubber('#1c1d1f')}</mesh>}
    {band === 'velcro' && <mesh geometry={S.ring} castShadow><meshStandardMaterial color="#e9e4d2" roughness={1} /></mesh>}
    <mesh geometry={S.cap} castShadow>{paint(color, 0.3)}</mesh>
    <mesh geometry={S.handle} scale={[1, 1, 1.25]} castShadow>{paint(color, 0.3)}</mesh>
    <mesh position={[0.085, STONE.h + 0.058, 0]} scale={[1, 1, 1.25]}><sphereGeometry args={[0.0115, 14, 10]} />{paint(color, 0.3)}</mesh>
    <mesh geometry={S.bolt} position={[0.016, STONE.h + 0.016, 0]}><Metal kind="stainless" /></mesh>
  </group>
}

// ---------- 球杆 ----------
const woodTex = once(() => makeWood('#d8c39a', '120,84,44', 11))
/** 球杆的杆身从杆刃根部往哪个方向伸（朝后上方，偏向里侧） */
const SHAFT = new THREE.Vector3(-0.2, 0.78, -0.6).normalize(), SHAFT_LEN = 1.42
const SHAFT_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), SHAFT)
const HEEL = new THREE.Vector3(-0.006, 0.05, -0.13)
/** 握杆的手：手背朝镜头这一侧，手指绕过杆身，袖子朝后 */
const GRIP_Q = (() => { const arm = new THREE.Vector3(-0.45, 0.6, 0.66); arm.addScaledVector(SHAFT, -arm.dot(SHAFT)).normalize(); const f = arm.clone().negate(), back = new THREE.Vector3().crossVectors(SHAFT, f); if (back.x > 0) back.negate(); return gloveQuat(f.toArray() as V3, back.toArray() as V3) })()
const grip = (d: number) => ({ p: HEEL.clone().addScaledVector(SHAFT, d).add(new THREE.Vector3(0, 0.034, -0.035).applyQuaternion(GRIP_Q)), q: GRIP_Q })
const GRIPS = [grip(0.82), grip(1.3)]
/**
 * 冰球杆，两只戴手套的手握着。原点在杆刃正面（朝 +x 的那一面）贴着冰面的正中，击球方向是 +x；
 * 杆刃沿 z 方向横着，杆身从里侧（-z）的根部斜着往后上方伸。hands：画不画手
 */
export function HockeyStick({ hands = true }: { hands?: boolean }) {
  const map = useMemo(() => rep(woodTex(), 3, 1), [])
  return <group>
    {/* 杆刃：一块略弯的薄板，缠着白胶布 */}
    <RoundedBox args={[0.011, 0.07, 0.27]} radius={0.004} smoothness={3} position={[-0.006, 0.036, 0]} castShadow><meshStandardMaterial color="#ecebe4" roughness={0.9} /></RoundedBox>
    {[-0.1, -0.05, 0, 0.05, 0.1].map(z => <mesh key={z} position={[-0.006, 0.036, z]}><boxGeometry args={[0.0125, 0.071, 0.004]} /><meshStandardMaterial color="#cfcec6" roughness={0.95} /></mesh>)}
    <mesh position={[-0.006, 0.05, -0.133]} rotation-x={-0.5}><boxGeometry args={[0.022, 0.09, 0.03]} />{paint('#17191c', 0.4)}</mesh>
    {/* 杆身：扁方的碳纤维杆，上端缠着握把胶布，顶上一个胶头 */}
    <group position={HEEL} quaternion={SHAFT_Q}>
      <RoundedBox args={[0.03, SHAFT_LEN, 0.02]} radius={0.006} smoothness={3} position={[0, SHAFT_LEN / 2, 0]} castShadow>{paint('#17191c', 0.4)}</RoundedBox>
      <mesh position={[0, SHAFT_LEN * 0.35, 0]}><boxGeometry args={[0.0305, 0.34, 0.0205]} /><meshStandardMaterial map={map} roughness={0.55} /></mesh>
      <RoundedBox args={[0.033, 0.24, 0.023]} radius={0.007} smoothness={3} position={[0, SHAFT_LEN - 0.12, 0]}><meshStandardMaterial color="#e8e6dc" roughness={0.95} /></RoundedBox>
      <mesh position={[0, SHAFT_LEN + 0.008, 0]}><sphereGeometry args={[0.02, 14, 10]} />{rubber()}</mesh>
    </group>
    {hands && GRIPS.map((g, i) => <group key={i} position={g.p} quaternion={g.q}><Glove pinch={1} arm={0.3} sleeve="#27496b" /></group>)}
  </group>
}

// ---------- 球门 ----------
const GOAL_G = once(() => {
  const tube = (pts: V3[], r: number, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed, 'catmullrom', 0.12), 60, r, 10, closed)
  const w = 0.915, h = 1.22
  return {
    front: tube([[0, 0, -w], [0, h * 0.5, -w], [0, h, -w], [0, h, 0], [0, h, w], [0, h * 0.5, w], [0, 0, w]], 0.03),
    base: tube([[0, 0.025, -w], [0.55, 0.025, -w * 1.05], [1.0, 0.025, -w * 0.6], [1.1, 0.025, 0], [1.0, 0.025, w * 0.6], [0.55, 0.025, w * 1.05], [0, 0.025, w]], 0.025),
    top: tube([[0, h, -w], [0.36, h, -w * 0.97], [0.55, h, -w * 0.55], [0.6, h, 0], [0.55, h, w * 0.55], [0.36, h, w * 0.97], [0, h, w]], 0.02),
  }
})
/** 冰球门：红色门框（宽 1.83 m、高 1.22 m）、白色的后框和网。原点在球门线正中，门口朝 -x */
export function Goal() {
  const G = GOAL_G(), net = useMemo(() => ({ back: rep(netTex(), 46, 30), side: rep(netTex(), 22, 30), top: rep(netTex(), 46, 14) }), [])
  const mesh = (map: THREE.Texture) => <meshStandardMaterial map={map} alphaTest={0.35} transparent side={THREE.DoubleSide} roughness={0.9} />
  return <group>
    <mesh geometry={G.front} castShadow>{paint('#c2362c', 0.4)}</mesh>
    <mesh geometry={G.base} castShadow>{paint('#e6e8ea', 0.5)}</mesh>
    <mesh geometry={G.top}>{paint('#e6e8ea', 0.5)}</mesh>
    {/* 网：后面一张斜的，两侧各一张，顶上一张 */}
    <group position={[0.85, 0.62, 0]} rotation-z={0.39}><mesh rotation-y={Math.PI / 2}><planeGeometry args={[1.84, 1.32]} />{mesh(net.back)}</mesh></group>
    {[-1, 1].map(s => <mesh key={s} position={[0.42, 0.61, s * 0.86]} rotation-y={s * 0.12}><planeGeometry args={[0.95, 1.22]} />{mesh(net.side)}</mesh>)}
    <mesh position={[0.3, 1.21, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.6, 1.8]} />{mesh(net.top)}</mesh>
    <mesh position={[0.84, 0.03, 0]}><boxGeometry args={[0.5, 0.06, 1.2]} />{rubber('#e6e8ea')}</mesh>
  </group>
}

// ---------- 泡棉垫、橡胶挡块 ----------
/** 一段泡棉围栏：冰场上分隔场地用的软垫。原点在底面正中，沿 x 方向长 len */
export function Foam({ len, color = '#2f6fb8', h = 0.3, d = 0.22 }: { len: number; color?: string; h?: number; d?: number }) {
  return <group>
    <RoundedBox args={[len, h, d]} radius={0.05} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.85} /></RoundedBox>
    <mesh position={[0, h * 0.55, d / 2 + 0.001]}><planeGeometry args={[len * 0.92, h * 0.16]} /><meshStandardMaterial color="#e9edf0" roughness={0.8} /></mesh>
  </group>
}
/** 橡胶挡块：挡住冰壶用。原点在迎着冰壶的那一面贴冰面的正中，迎面朝 -x */
export function Stopper() {
  return <group>
    <RoundedBox args={[0.16, 0.14, 0.5]} radius={0.03} smoothness={3} position={[0.08, 0.07, 0]} castShadow receiveShadow>{rubber('#22262a')}</RoundedBox>
    <mesh position={[-0.001, 0.07, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[0.44, 0.05]} /><meshStandardMaterial color="#d8b23a" roughness={0.7} /></mesh>
  </group>
}
const CONE_G = once(() => lathe([[0, 0], [0.105, 0], [0.105, 0.012], [0.075, 0.016], [0.07, 0.03], [0.022, 0.23], [0.016, 0.236], [0, 0.236]], { segs: 28 }))
/** 训练用的标志桶：橙色的软塑料锥，腰上一道白色反光带。原点在底面圆心 */
export function Cone({ color = '#e2662a' }: { color?: string }) {
  return <group>
    <mesh geometry={CONE_G()} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.6} /></mesh>
    <mesh position-y={0.125}><cylinderGeometry args={[0.041, 0.052, 0.045, 24, 1, true]} /><meshStandardMaterial color="#eef0f1" roughness={0.5} /></mesh>
  </group>
}
/** 一小堆备用的冰球：三只平放，一只压在上面，一只立着靠在旁边 */
export function PuckPile() {
  return <group>
    {[[0, 0, 0], [0.085, 0, 0.02], [0.04, 0, 0.078]].map((p, i) => <group key={i} position={p as V3}><Puck /></group>)}
    <group position={[0.04, PUCK.h, 0.03]}><Puck /></group>
    <group position={[-0.07, PUCK.r, 0.06]} rotation={[Math.PI / 2 - 0.25, 0, 0.4]}><Puck /></group>
  </group>
}
/** 一只水桶和一只打气筒：给喷水滑车装水、打气用。原点在水桶底面圆心，打气筒在它右边 */
export function BucketAndPump() {
  const G = BUCKET_G()
  return <group>
    <mesh geometry={G.bucket} castShadow receiveShadow><meshPhysicalMaterial color="#2f6fb8" roughness={0.45} clearcoat={0.4} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={0.2} rotation-x={-Math.PI / 2}><circleGeometry args={[0.132, 32]} /><meshPhysicalMaterial color="#5fa6e0" transparent opacity={0.8} roughness={0.05} /></mesh>
    <mesh geometry={G.handle}><Metal kind="steel" /></mesh>
    <group position={[0.36, 0, -0.05]}>
      <mesh position={[0, 0.008, 0]} castShadow><boxGeometry args={[0.2, 0.016, 0.07]} />{rubber('#22262a')}</mesh>
      <mesh position={[0, 0.27, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.5, 20]} />{paint('#c2362c', 0.35)}</mesh>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.005, 0.005, 0.18, 10]} /><Metal kind="stainless" /></mesh>
      <mesh position={[0, 0.69, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.013, 0.013, 0.2, 14]} />{rubber('#1b1d20')}</mesh>
    </group>
  </group>
}
const BUCKET_G = once(() => ({
  bucket: lathe([[0, 0], [0.11, 0], [0.145, 0.26], [0.15, 0.262], [0.15, 0.27], [0.138, 0.27], [0.105, 0.012], [0, 0.012]], { segs: 36 }),
  handle: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.148, 0.255, 0], [-0.13, 0.2, 0.09], [0, 0.17, 0.15], [0.13, 0.2, 0.09], [0.148, 0.255, 0]].map(p => new THREE.Vector3(...p))), 30, 0.004, 8),
}))
/** 冰面上的一条标线（出发线、量距线）。原点在线的正中，沿 x 方向长 len */
export function Mark({ len, w = 0.03, color = '#ffd24a' }: { len: number; w?: number; color?: string }) {
  return <mesh rotation-x={-Math.PI / 2} position-y={0.006}><planeGeometry args={[len, w]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} /></mesh>
}
