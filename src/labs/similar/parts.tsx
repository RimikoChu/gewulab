// 各课共用的东西：对应边和对应角的颜色、这一课的舞台（机位和太阳）、按时长走完的动作、画在实景上的线段和角弧、
// 木条、学生（简洁的人形，戴手套）、卷尺和皮尺、小镜子、标杆、自制测角仪、手机。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, lathe, type Label } from '@/lab-kit'
import { EYE, PERSON_H } from './physics'
import { makePhoneScreen, makeProtractor, makeRodStripes, makeTapeTicks, makeWood } from './mats'

export type V3 = [number, number, number]

/** 对应边的颜色（全实验室统一）：第一条蓝、第二条橙、第三条绿、第四条紫 */
export const SIDE = ['#4b8df8', '#f5a524', '#2fbf71', '#b07cf0'] as const
/** 对应角的颜色 */
export const ANG = ['#ff6b81', '#3fd0e0', '#ffd166', '#c9a0ff'] as const
/** 光线、视线的颜色 */
export const RAY = '#ffe27a', SIGHT = '#ffffff'
/** 彩色底的标签样式：bg 底色 */
export const tagStyle = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({ background: bg, color: bg === SIDE[1] || bg === ANG[2] || bg === RAY ? '#3a2600' : '#fff', boxShadow: 'none', ...extra })
export const tag = 'scene-tag -translate-y-1/2'

// ---------- 太阳 ----------
/** 太阳的方位和天空图里的一致（东南偏东），高度角各课自己定 */
const SUN_H = new THREE.Vector2(0.812, 0.478).normalize()
/** 太阳的方向（从地面指向太阳） */
export const sunDir = (elevDeg: number): V3 => { const e = elevDeg * Math.PI / 180; return [SUN_H.x * Math.cos(e), Math.sin(e), SUN_H.y * Math.cos(e)] }
/** 影子在地上朝哪个方向（单位向量，xz） */
export const SHADOW: [number, number] = [-SUN_H.x, -SUN_H.y]

/** 一盏平行光当太阳：对着这一课的器材，影子落在画面里。size 是投影范围的半宽 */
function Sun({ elev, at, size }: { elev: number; at: THREE.Vector3; size: number }) {
  const aim = useMemo(() => new THREE.Object3D(), [])
  const d = sunDir(elev)
  useEffect(() => { aim.position.set(at.x, at.y, at.z); aim.updateMatrixWorld() }, [aim, at])
  const cam = useRef<THREE.OrthographicCamera>(null)
  useEffect(() => { const c = cam.current; if (!c) return; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.updateProjectionMatrix() }, [size])
  return <>
    <primitive object={aim} />
    <directionalLight castShadow target={aim} position={[at.x + d[0] * 120, at.y + d[1] * 120, at.z + d[2] * 120]} intensity={3.6} color="#fff0da"
      shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.02}>
      <orthographicCamera ref={cam} attach="shadow-camera" args={[-size, size, size, -size, 1, 300]} />
    </directionalLight>
    <hemisphereLight args={['#dfe9f5', '#6b6650', 0.15]} />
  </>
}

// ---------- 机位 ----------
export interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number] }
export const spot = (x: number, y: number, z: number, w: number, h: number, az: number, el: number): Spot => ({ target: new THREE.Vector3(x, y, z), span: [w, h], view: [az, el] })

/** 这一课的舞台：机位、太阳高度、影子范围 */
export function Place({ view, labels, elev = 48, shadow, children = null }: { view: Spot; labels: Label[]; elev?: number; shadow?: number; children?: ReactNode }) {
  const size = shadow ?? Math.max(8, Math.max(view.span[0], view.span[1]) * 0.9)
  return <LabStage labels={labels} target={view.target} span={view.span} view={view.view} sun={0} env={0.6} fog={[160, 900]}>
    <Sun elev={elev} at={view.target} size={size} />
    {children}
  </LabStage>
}

// ---------- 动作 ----------
/** 缓入缓出 */
export const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
/** 一个按时长走完的动作：run() 开始，k 从 0 匀速走到 1，走完调用 onEnd。snap 直接跳到某处 */
export function useRun(sec: number, onEnd?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, to: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const go = (to: number) => {
    cancelAnimationFrame(s.current.raf); s.current.to = to; setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const q = s.current, d = q.to - q.k
      q.k = Math.abs(d) <= dt / sec ? q.to : q.k + Math.sign(d) * dt / sec; setK(q.k)
      if (q.k !== q.to) q.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run: () => go(1), snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = s.current.to = v; setK(v); setBusy(false) } }
}
/** 一个数平滑地跟到目标值（太阳高度、人走路）：时间常数 tau 秒 */
export function useFollow(to: number, tau = 0.35) {
  const [x, setX] = useState(to), cur = useRef(to)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      cur.current += (to - cur.current) * (1 - Math.exp(-dt / tau)); if (Math.abs(to - cur.current) < 1e-4) cur.current = to
      setX(cur.current); if (cur.current !== to) raf = requestAnimationFrame(f)
    }
    if (cur.current !== to) raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [to, tau])
  return x
}
export const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

// ---------- 画在实景上的线 ----------
const Y = new THREE.Vector3(0, 1, 0)
function useSeg(a: V3, b: V3) {
  return useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length()
    return { pos: A.clone().add(B).multiplyScalar(0.5), len, quat: new THREE.Quaternion().setFromUnitVectors(Y, len > 1e-9 ? d.normalize() : Y) }
  }, [a[0], a[1], a[2], b[0], b[1], b[2]])   // eslint-disable-line react-hooks/exhaustive-deps
}
/** 一条画出来的线段：不受遮挡，随时看得见。dash：虚线（每段长） */
export function Seg({ a, b, color, r = 0.02, opacity = 1, dash = 0 }: { a: V3; b: V3; color: string; r?: number; opacity?: number; dash?: number }) {
  const { pos, len, quat } = useSeg(a, b)
  if (len < 1e-4 || opacity <= 0.001) return null
  const mat = <meshBasicMaterial color={color} depthTest={false} transparent opacity={opacity} toneMapped={false} />
  if (!dash) return <mesh position={pos} quaternion={quat} renderOrder={10}><cylinderGeometry args={[r, r, len, 8]} />{mat}</mesh>
  const n = Math.max(1, Math.floor(len / (dash * 2)))
  return <group position={pos} quaternion={quat}>{Array.from({ length: n }, (_, i) => <mesh key={i} position={[0, -len / 2 + (i + 0.5) * len / n, 0]} renderOrder={10}><cylinderGeometry args={[r, r, len / n * 0.55, 6]} />{mat}</mesh>)}</group>
}
/** 一个点上的小圆点 */
export function Dot({ at, color, r = 0.05, opacity = 1 }: { at: V3; color: string; r?: number; opacity?: number }) {
  if (opacity <= 0.001) return null
  return <mesh position={at} renderOrder={11}><sphereGeometry args={[r, 14, 10]} /><meshBasicMaterial color={color} depthTest={false} transparent opacity={opacity} toneMapped={false} /></mesh>
}
/** 角的小弧：顶点 v，从朝 p 的方向转到朝 q 的方向，半径 rad；弧里填一层半透明的扇形 */
export function Arc({ v, p, q, rad, color, r = 0.015, opacity = 1, fill = 0.32 }: { v: V3; p: V3; q: V3; rad: number; color: string; r?: number; opacity?: number; fill?: number }) {
  const geo = useMemo(() => {
    const V = new THREE.Vector3(...v), u = new THREE.Vector3(...p).sub(V).normalize(), w = new THREE.Vector3(...q).sub(V).normalize()
    const ang = u.angleTo(w), axis = new THREE.Vector3().crossVectors(u, w).normalize(), n = Math.max(6, Math.ceil(ang * 24))
    const pts = Array.from({ length: n + 1 }, (_, i) => u.clone().applyAxisAngle(axis, ang * i / n).multiplyScalar(rad).add(V))
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, r, 6, false)
    const fan = new THREE.BufferGeometry(), pos: number[] = []
    for (let i = 0; i < n; i++) pos.push(V.x, V.y, V.z, pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z)
    fan.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return { tube, fan }
  }, [v.join(), p.join(), q.join(), rad, r])   // eslint-disable-line react-hooks/exhaustive-deps
  if (opacity <= 0.001) return null
  return <group>
    <mesh geometry={geo.tube} renderOrder={11}><meshBasicMaterial color={color} depthTest={false} transparent opacity={opacity} toneMapped={false} /></mesh>
    <mesh geometry={geo.fan} renderOrder={9}><meshBasicMaterial color={color} depthTest={false} transparent opacity={opacity * fill} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} /></mesh>
  </group>
}
/** 直角记号：顶点 v，两条边朝 p、q，边长 s */
export function RightMark({ v, p, q, s, color = '#ffffff', opacity = 1 }: { v: V3; p: V3; q: V3; s: number; color?: string; opacity?: number }) {
  const V = new THREE.Vector3(...v), u = new THREE.Vector3(...p).sub(V).normalize().multiplyScalar(s), w = new THREE.Vector3(...q).sub(V).normalize().multiplyScalar(s)
  const a = V.clone().add(u).toArray() as V3, b = V.clone().add(u).add(w).toArray() as V3, c = V.clone().add(w).toArray() as V3
  return <><Seg a={a} b={b} color={color} r={s * 0.06} opacity={opacity} /><Seg a={b} b={c} color={color} r={s * 0.06} opacity={opacity} /></>
}

// ---------- 木条 ----------
/**
 * 一根松木条，平放在地上：从 p 到 q（世界坐标，y 取地面），宽 w、厚 t。看得见木纹，两头各钉一颗钉子，顶面刷一道色漆（对应边同色）
 */
export function Lath({ p, q, color, w = 0.05, t = 0.03 }: { p: V3; q: V3; color: string; w?: number; t?: number }) {
  const len = Math.hypot(q[0] - p[0], q[2] - p[2]), ang = Math.atan2(-(q[2] - p[2]), q[0] - p[0])
  const map = useMemo(() => { const m = makeWood().clone(); m.repeat.set(Math.max(0.05, len + w), 1); m.needsUpdate = true; return m }, [len, w])
  if (len < 1e-3) return null
  const L = len + w * 0.9
  return <group position={[(p[0] + q[0]) / 2, p[1], (p[2] + q[2]) / 2]} rotation-y={ang}>
    <RoundedBox args={[L, t, w]} radius={Math.min(w, t) * 0.18} smoothness={2} position={[0, t / 2, 0]} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={0.7} />
    </RoundedBox>
    {/* 顶面刷一道色漆，对应边同色 */}
    <mesh position={[0, t + 0.0006, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[L - w * 2.2, w * 0.62]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (L / 2 - w * 0.45), t + 0.0015, 0]} castShadow><cylinderGeometry args={[0.005, 0.005, 0.003, 12]} /><Metal kind="steel" rough={0.35} /></mesh>)}
  </group>
}

// ---------- 学生 ----------
const SKIN = '#d9b394', JACKET = '#27457a', STRIPE = '#f1f1ec', TROUSER = '#24365c', GLOVE = '#efebe1'
/** 两点之间的一节肢体（胶囊） */
function Limb({ a, b, r, color, rough = 0.85 }: { a: THREE.Vector3; b: THREE.Vector3; r: number; color: string; rough?: number }) {
  const d = b.clone().sub(a), len = d.length()
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize()), [d.x, d.y, d.z])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={a.clone().add(b).multiplyScalar(0.5)} quaternion={quat} castShadow><capsuleGeometry args={[r, Math.max(0.001, len), 4, 12]} /><meshStandardMaterial color={color} roughness={rough} /></mesh>
}
/** 一只戴白线手套的手：手掌、四根微弯的手指、一根拇指；fdir 是前臂方向，side 左右 */
function Hand({ at, fdir, side }: { at: THREE.Vector3; fdir: THREE.Vector3; side: number }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y, fdir), [fdir.x, fdir.y, fdir.z])   // eslint-disable-line react-hooks/exhaustive-deps
  const m = <meshStandardMaterial color={GLOVE} roughness={0.95} />
  return <group position={at} quaternion={q}>
    <RoundedBox args={[0.028, 0.075, 0.07]} radius={0.012} smoothness={3} position={[0, 0.035, 0]} castShadow>{m}</RoundedBox>
    {[-0.025, -0.008, 0.009, 0.025].map((z, i) => <group key={z} position={[0.002, 0.072, z]} rotation-z={0.35}>
      <mesh position={[0, 0.02 + (i === 1 || i === 2 ? 0.004 : 0), 0]} castShadow><capsuleGeometry args={[0.0075, 0.03 + (i === 1 || i === 2 ? 0.008 : 0), 3, 8]} />{m}</mesh>
    </group>)}
    <mesh position={[0.012, 0.03, side * 0.038]} rotation={[side * -0.7, 0, 0.5]} castShadow><capsuleGeometry args={[0.0085, 0.03, 3, 8]} />{m}</mesh>
  </group>
}
/** 一只胳膊：肩 s 到手 h，肘向下、向外弯。校服袖子外侧一道白条，袖口收紧，手戴白线手套 */
function Arm({ s, h, side }: { s: THREE.Vector3; h: THREE.Vector3; side: number }) {
  const L1 = 0.27, L2 = 0.25
  const d = Math.min(L1 + L2 - 0.005, Math.max(0.08, h.distanceTo(s))), dir = h.clone().sub(s).normalize(), H = s.clone().addScaledVector(dir, d)
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a))
  const bend = new THREE.Vector3(-0.25, -1, side * 0.35), perp = bend.sub(dir.clone().multiplyScalar(bend.dot(dir))).normalize()
  const E = s.clone().addScaledVector(dir, a).addScaledVector(perp, hh)
  const cuff = E.clone().lerp(H, 0.86), fdir = H.clone().sub(E).normalize()
  return <group>
    <Limb a={s} b={E} r={0.052} color={JACKET} />
    <Limb a={E} b={cuff} r={0.045} color={JACKET} />
    <mesh position={cuff} quaternion={new THREE.Quaternion().setFromUnitVectors(Y, fdir)}><cylinderGeometry args={[0.038, 0.044, 0.035, 16]} /><meshStandardMaterial color="#1d3561" roughness={0.9} /></mesh>
    <Limb a={cuff} b={H} r={0.03} color={GLOVE} rough={0.95} />
    <Hand at={H} fdir={fdir} side={side} />
  </group>
}
/** 上身（校服上衣）：车削出肩宽、胸、收腰，前后压扁 */
let torsoGeo: THREE.BufferGeometry | null = null
const torso = () => torsoGeo ??= (() => { const g = lathe([[0, 0.84], [0.17, 0.85], [0.165, 0.95], [0.16, 1.03], [0.18, 1.18], [0.2, 1.28], [0.19, 1.33], [0.12, 1.37], [0.06, 1.385], [0, 1.385]], { segs: 28, crease: 50 }); g.scale(0.62, 1, 1); return g })()
/**
 * 学生：身高 1.60 m，眼睛离地 1.50 m，穿蓝白校服、白线手套。at 是两脚中间的地面点，yaw 是面朝的方向（0 朝 +x）。
 * lh、rh：左右手在身体坐标里的位置（x 朝前、y 朝上、z 朝右），不给就自然下垂；pitch：抬头（正）低头（负）的角度（弧度）
 */
export function Person({ at, yaw = 0, lh, rh, pitch = 0, stride = 0 }: { at: V3; yaw?: number; lh?: V3; rh?: V3; pitch?: number; stride?: number }) {
  const sL = new THREE.Vector3(0, 1.31, -0.19), sR = new THREE.Vector3(0, 1.31, 0.19)
  const hL = lh ? new THREE.Vector3(...lh) : new THREE.Vector3(0.03, 0.8, -0.24), hR = rh ? new THREE.Vector3(...rh) : new THREE.Vector3(0.03, 0.8, 0.24)
  const st = Math.sin(stride) * 0.22
  return <group position={at} rotation-y={yaw}>
    {/* 腿：校服裤，外侧一道白条；白色运动鞋 */}
    {[-1, 1].map(s => { const sw = s * st, hip = new THREE.Vector3(0, 0.86, s * 0.09), knee = new THREE.Vector3(sw * 0.5 + 0.01, 0.47, s * 0.095), foot = new THREE.Vector3(sw, 0.1, s * 0.1)
      return <group key={s}>
        <Limb a={hip} b={knee} r={0.072} color={TROUSER} />
        <Limb a={knee} b={foot} r={0.06} color={TROUSER} />
        <Limb a={hip.clone().add(new THREE.Vector3(0, 0, s * 0.07))} b={knee.clone().add(new THREE.Vector3(0, 0, s * 0.068))} r={0.008} color={STRIPE} />
        <Limb a={knee.clone().add(new THREE.Vector3(0, 0, s * 0.058))} b={foot.clone().add(new THREE.Vector3(0, 0.02, s * 0.056))} r={0.007} color={STRIPE} />
        <RoundedBox args={[0.26, 0.075, 0.1]} radius={0.032} smoothness={3} position={[sw + 0.045, 0.045, s * 0.1]} castShadow><meshStandardMaterial color="#ecebe6" roughness={0.55} /></RoundedBox>
        <RoundedBox args={[0.265, 0.02, 0.104]} radius={0.008} smoothness={2} position={[sw + 0.045, 0.01, s * 0.1]}><meshStandardMaterial color="#9a9c9e" roughness={0.8} /></RoundedBox>
      </group> })}
    {/* 上衣：拉链、立领（白），下摆一圈罗纹 */}
    <mesh geometry={torso()} castShadow><meshStandardMaterial color={JACKET} roughness={0.82} /></mesh>
    <mesh position={[0.103, 1.1, 0]}><boxGeometry args={[0.006, 0.5, 0.012]} /><meshStandardMaterial color="#c9ccd0" roughness={0.4} metalness={0.5} /></mesh>
    <mesh position={[0, 0.87, 0]} scale={[0.62, 1, 1]}><cylinderGeometry args={[0.172, 0.172, 0.05, 28, 1, true]} /><meshStandardMaterial color="#1d3561" roughness={0.95} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 1.395, 0]}><cylinderGeometry args={[0.062, 0.07, 0.05, 20, 1, true]} /><meshStandardMaterial color={STRIPE} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.044, 0.048, 0.07, 14]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
    {/* 头：抬头低头绕脖子转；头顶在 1.60 m，眼睛在 1.50 m。短发从额头往后盖住头顶和后脑 */}
    <group position={[0, 1.415, 0]} rotation-z={pitch}>
      <mesh position={[0.008, 0.08, 0]} scale={[1.04, 1.12, 0.86]} castShadow><sphereGeometry args={[0.093, 28, 20]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
      <mesh position={[0.02, 0.03, 0]} scale={[1, 0.7, 0.85]}><sphereGeometry args={[0.07, 20, 14]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
      <mesh position={[-0.01, 0.103, 0]} scale={[1.02, 1, 0.95]} castShadow><sphereGeometry args={[0.098, 28, 20]} /><meshStandardMaterial color="#1c1917" roughness={0.85} /></mesh>
      <mesh position={[0.06, 0.15, 0]} rotation-z={-0.5} scale={[0.6, 0.35, 0.9]}><sphereGeometry args={[0.075, 16, 12]} /><meshStandardMaterial color="#1c1917" roughness={0.85} /></mesh>
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[0.091, EYE - 1.415, s * 0.031]} scale={[0.4, 0.75, 1]}><sphereGeometry args={[0.008, 10, 8]} /><meshStandardMaterial color="#2a1e18" roughness={0.3} /></mesh>
        <mesh position={[0.093, EYE - 1.415 + 0.019, s * 0.032]} rotation-x={s * 0.12}><boxGeometry args={[0.004, 0.004, 0.026]} /><meshStandardMaterial color="#2a221c" roughness={0.9} /></mesh>
        <mesh position={[-0.004, 0.072, s * 0.09]} scale={[0.55, 1, 0.35]}><sphereGeometry args={[0.024, 10, 8]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
      </group>)}
      <mesh position={[0.1, 0.06, 0]} rotation-z={-0.25} scale={[0.7, 1.3, 0.75]}><sphereGeometry args={[0.012, 10, 8]} /><meshStandardMaterial color={SKIN} roughness={0.65} /></mesh>
      <mesh position={[0.093, 0.03, 0]}><boxGeometry args={[0.004, 0.0035, 0.022]} /><meshStandardMaterial color="#a0675a" roughness={0.6} /></mesh>
    </group>
    <Arm s={sL} h={hL} side={-1} />
    <Arm s={sR} h={hR} side={1} />
  </group>
}
/** 学生的眼睛在世界里的位置（站在 at、面朝 yaw） */
export const eyeAt = (at: V3, yaw = 0): V3 => [at[0] + Math.cos(yaw) * 0.09, at[1] + EYE, at[2] - Math.sin(yaw) * 0.09]
export { PERSON_H }

// ---------- 卷尺、皮尺 ----------
/** 拉开的尺带：从 a 拉到 b（贴着地面或悬空都行），黄底刻度。reel：长卷尺（皮尺），盒子是圆的带摇把；否则是钢卷尺 */
export function Tape({ a, b, reel = false, up = [0, 1, 0] }: { a: V3; b: V3; reel?: boolean; up?: V3 }) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length()
  const ticks = useMemo(() => { const t = makeTapeTicks().clone(); t.needsUpdate = true; return t }, [])
  ticks.repeat.set(Math.max(0.01, len), 1)
  const basis = useMemo(() => {
    const x = d.clone().normalize(), u = new THREE.Vector3(...up), z = new THREE.Vector3().crossVectors(x, u).normalize(), y = new THREE.Vector3().crossVectors(z, x)
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
  }, [d.x, d.y, d.z, up[0], up[1], up[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  if (len < 0.01) return null
  const w = reel ? 0.016 : 0.025
  return <group position={a} quaternion={basis}>
    {/* 尺带：微微拱起的薄带 */}
    <mesh position={[len / 2, 0.004, 0]} rotation-x={-Math.PI / 2} receiveShadow castShadow><planeGeometry args={[len, w]} /><meshStandardMaterial map={ticks} roughness={0.45} metalness={reel ? 0 : 0.3} side={THREE.DoubleSide} /></mesh>
    {/* 尺头的小钩 */}
    <mesh position={[len, 0.012, 0]} castShadow><boxGeometry args={[0.004, 0.02, w + 0.004]} /><Metal kind="brass" /></mesh>
    {reel ? <group position={[-0.1, 0.1, 0]}>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.095, 0.095, 0.045, 32]} /><meshStandardMaterial color="#c43a2a" roughness={0.45} /></mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.026]}><cylinderGeometry args={[0.06, 0.06, 0.008, 24]} /><meshStandardMaterial color="#232323" roughness={0.5} /></mesh>
      <mesh position={[0.02, 0.04, 0.04]} castShadow><boxGeometry args={[0.012, 0.07, 0.012]} /><meshStandardMaterial color="#232323" roughness={0.5} /></mesh>
      <mesh position={[0, -0.1, 0]} castShadow><boxGeometry args={[0.03, 0.12, 0.03]} /><meshStandardMaterial color="#232323" roughness={0.5} /></mesh>
    </group> : <group position={[-0.04, 0.035, 0]}>
      <RoundedBox args={[0.075, 0.07, 0.034]} radius={0.012} smoothness={3} castShadow><meshStandardMaterial color="#f2c230" roughness={0.4} /></RoundedBox>
      <RoundedBox args={[0.077, 0.072, 0.02]} radius={0.01} smoothness={3}><meshStandardMaterial color="#202020" roughness={0.7} /></RoundedBox>
      <mesh position={[-0.012, 0.005, 0.018]}><cylinderGeometry args={[0.018, 0.018, 0.004, 20]} /><Metal kind="chrome" /></mesh>
    </group>}
  </group>
}

// ---------- 小镜子、标杆 ----------
/** 平放在地上的小圆镜：黑色塑料边，镜面 */
export function Mirror({ at }: { at: V3 }) {
  return <group position={at}>
    <mesh position={[0, 0.008, 0]} castShadow receiveShadow><cylinderGeometry args={[0.125, 0.128, 0.016, 40]} /><meshStandardMaterial color="#1d1f22" roughness={0.5} /></mesh>
    <mesh position={[0, 0.0165, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.112, 40]} /><meshStandardMaterial color="#dfe6ea" metalness={1} roughness={0.03} envMapIntensity={1.6} /></mesh>
  </group>
}
/** 标杆（花杆）：红白相间，每段 20 cm，下面一个钢尖，插在三脚小支架里 */
export function RangeRod({ at, h }: { at: V3; h: number }) {
  const stripes = useMemo(() => { const t = makeRodStripes().clone(); t.needsUpdate = true; t.repeat.set(1, h / 2); return t }, [h])
  return <group position={at}>
    <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, h, 16]} /><meshStandardMaterial map={stripes} roughness={0.5} /></mesh>
    <mesh position={[0, h + 0.005, 0]}><cylinderGeometry args={[0.021, 0.021, 0.01, 16]} /><meshStandardMaterial color="#1d1d1d" /></mesh>
    {[0, 1, 2].map(i => { const a = i * Math.PI * 2 / 3; return <mesh key={i} position={[Math.cos(a) * 0.2, 0.28, Math.sin(a) * 0.2]} rotation={[Math.sin(a) * -0.6, 0, Math.cos(a) * 0.6]} castShadow><cylinderGeometry args={[0.008, 0.008, 0.7, 8]} /><Metal kind="aluminum" /></mesh> })}
    <mesh position={[0, 0.58, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.06, 12]} /><Metal kind="aluminum" /></mesh>
  </group>
}

// ---------- 测角仪、手机 ----------
/**
 * 自制测角仪：半圆量角器（直边在上），直边上粘一根吸管当瞄准管，圆心挂一根细线和铅锤。
 * at 是量角器圆心（瞄准管中点），yaw 朝向目标的方向，pitch 抬起的角度（弧度）。线和铅锤总是竖直往下
 */
export function Clinometer({ at, yaw, pitch, R = 0.1 }: { at: V3; yaw: number; pitch: number; R?: number }) {
  const tex = makeProtractor()
  const L = R * 0.95
  return <group position={at} rotation-y={yaw}>
    <group rotation-z={pitch}>
      <mesh position={[0, -R * 0.527 + 0.002, 0]}><planeGeometry args={[2 * R * 1.024, R * 1.08]} /><meshPhysicalMaterial map={tex} transparent roughness={0.15} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {/* 吸管 */}
      <mesh position={[0, 0.006, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0045, 0.0045, 2 * R + 0.03, 12, 1, true]} /><meshStandardMaterial color="#f5f2e8" roughness={0.3} side={THREE.DoubleSide} /></mesh>
    </group>
    {/* 铅垂线和铅锤 */}
    <mesh position={[0, -L / 2, 0.003]}><cylinderGeometry args={[0.0011, 0.0011, L, 6]} /><meshStandardMaterial color="#b0262b" roughness={0.6} /></mesh>
    <mesh position={[0, -L - 0.008, 0.003]} castShadow><coneGeometry args={[0.007, 0.018, 12]} /><Metal kind="brass" /></mesh>
  </group>
}
/** 手机：竖着拿，长边对着目标，屏幕朝侧面，上面显示测角工具的读数 */
export function Phone({ at, yaw, pitch, text, flip = false }: { at: V3; yaw: number; pitch: number; text: string; flip?: boolean }) {
  const scr = useMemo(() => makePhoneScreen(text), [text])
  return <group position={at} rotation-y={yaw}>
    <group rotation-z={pitch}>
      <group rotation-x={flip ? Math.PI : 0}><group rotation-z={-Math.PI / 2}>
        <RoundedBox args={[0.075, 0.155, 0.008]} radius={0.006} smoothness={3} castShadow><meshStandardMaterial color="#1b1d20" roughness={0.35} metalness={0.4} /></RoundedBox>
        <mesh position={[0, 0, 0.0042]}><planeGeometry args={[0.068, 0.145]} /><meshBasicMaterial map={scr} toneMapped={false} /></mesh>
      </group></group>
    </group>
  </group>
}

// ---------- 场地上的小东西 ----------
/** 一个篮球：橙色颗粒皮面，八道黑色缝线 */
export function Basketball({ at }: { at: V3 }) {
  const R = 0.12
  return <group position={[at[0], at[1] + R, at[2]]} rotation={[0.4, 0.7, 0.2]}>
    <mesh castShadow receiveShadow><sphereGeometry args={[R, 32, 24]} /><meshStandardMaterial color="#c8642a" roughness={0.75} /></mesh>
    {[0, Math.PI / 2].map(a => <mesh key={a} rotation-y={a}><torusGeometry args={[R * 1.002, 0.0025, 6, 48]} /><meshStandardMaterial color="#1c1410" roughness={0.6} /></mesh>)}
    <mesh rotation-x={Math.PI / 2}><torusGeometry args={[R * 1.002, 0.0025, 6, 48]} /><meshStandardMaterial color="#1c1410" roughness={0.6} /></mesh>
  </group>
}
/** 记录板：硬纸板夹着一张记录纸，上面一个金属夹子，平放在地上 */
export function Clipboard({ at, yaw = 0 }: { at: V3; yaw?: number }) {
  return <group position={at} rotation-y={yaw}>
    <RoundedBox args={[0.23, 0.006, 0.32]} radius={0.003} smoothness={2} position={[0, 0.003, 0]} castShadow receiveShadow><meshStandardMaterial color="#8a6a48" roughness={0.85} /></RoundedBox>
    <mesh position={[0, 0.0065, 0.012]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[0.21, 0.28]} /><meshStandardMaterial color="#f4f2ec" roughness={0.9} /></mesh>
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[-0.02, 0.0068, -0.09 + i * 0.028]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.15, 0.002]} /><meshBasicMaterial color="#9aa7b4" /></mesh>)}
    <mesh position={[0, 0.012, -0.145]} castShadow><boxGeometry args={[0.09, 0.012, 0.03]} /><Metal kind="chrome" /></mesh>
  </group>
}
