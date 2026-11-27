// 实验台上的三套器材：气垫导轨（滑块、光电门、数字计时器、气源），鸡蛋下落装置（铁架台、刻度尺、力传感器平台、钢板和海绵），牛顿摆。
// 每套器材的原点都在所在实验台台面的正中，尺寸按实物，单位是米。会动的部分由各课自己驱动。
import { useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc, lathe } from '@/lab-kit'
import { COL, type V3 } from './layout'
import { holesTex, makeScale, makeScaleH, once, rep, spongeTex } from './mats'
import { CRADLE, GLIDER, TRACK } from './physics'

const black = <meshStandardMaterial color="#17191c" roughness={0.55} />
const plastic = (c: string, rough = 0.5) => <meshPhysicalMaterial color={c} roughness={rough} clearcoat={0.3} clearcoatRoughness={0.4} />
const tubeGeo = (pts: V3[], r: number, segs = 40) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.4), segs, r, 10)

// ---------- 气垫导轨 ----------
/** 导轨是一根立着棱放的方铝管：RAIL_Y 是它中心的高度，RIDGE 是上棱的高度，BEAM 是光电门光束的高度 */
const RAIL_W = 0.05, RAIL_Y = 0.105, RIDGE = RAIL_Y + RAIL_W * Math.SQRT1_2, BEAM = RIDGE + 0.047
const TRACK_G = once(() => ({
  hose: tubeGeo([[-0.8, RAIL_Y, 0], [-0.9, RAIL_Y, 0], [-0.97, 0.09, -0.06], [-0.96, 0.05, -0.2], [-0.9, 0.06, -0.27]], 0.016),
  wire: [TRACK.gateA, TRACK.gateB].map(x => tubeGeo([[x, 0.03, -0.085], [x + 0.02, 0.008, -0.14], [x * 0.5 + 0.16, 0.006, -0.2], [0.34, 0.03, -0.24]], 0.003, 24)),
}))
/** 一只光电门：门形的黑色叉架跨在导轨上，立在后面的支杆上；内侧一颗红灯。原点在导轨正下方的台面上 */
function Photogate({ lit }: { lit?: RefObject<THREE.Mesh | null> }) {
  return <group>
    {[-0.05, 0.05].map(z => <RoundedBox key={z} args={[0.03, 0.12, 0.018]} radius={0.004} smoothness={2} position={[0, BEAM + 0.01, z]} castShadow>{black}</RoundedBox>)}
    <RoundedBox args={[0.034, 0.02, 0.122]} radius={0.004} smoothness={2} position={[0, BEAM + 0.076, 0]} castShadow>{black}</RoundedBox>
    <mesh ref={lit} position={[0, BEAM, 0.0405]}><sphereGeometry args={[0.004, 10, 8]} /><meshBasicMaterial color="#ff3b30" toneMapped={false} /></mesh>
    <mesh position={[0, BEAM, -0.0405]}><sphereGeometry args={[0.004, 10, 8]} /><meshStandardMaterial color="#2a2c30" roughness={0.3} /></mesh>
    {/* 支杆和底座 */}
    <mesh position={[0, BEAM + 0.076, -0.073]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.005, 0.005, 0.03, 10]} /><Metal kind="stainless" /></mesh>
    <mesh position={[0, (BEAM + 0.09) / 2, -0.088]} castShadow><cylinderGeometry args={[0.005, 0.005, BEAM + 0.09, 12]} /><Metal kind="stainless" /></mesh>
    <mesh position={[0, 0.009, -0.088]} castShadow><cylinderGeometry args={[0.032, 0.036, 0.018, 24]} /><Metal kind="iron" grain="cast" /></mesh>
  </group>
}
/**
 * 气垫导轨：1.5 m 长的方铝管立着棱放，上面两个斜面上各有两排气孔；下面是带刻度的底梁、三只调平脚、两头的挡板，
 * 左端接气源的波纹管；两只光电门在 ±0.32 m 处，后面架子上是数字计时器（两行读数，单位 ms）。ms：两行显示的字
 */
export function AirTrack({ ms = ['0.00', '0.00'], children = null }: { ms?: [string, string]; children?: ReactNode }) {
  const G = TRACK_G(), holes = useMemo(() => rep(holesTex(), 46, 1), []), scale = useMemo(() => makeScaleH(150), [])
  const L = TRACK.len
  return <group>
    <mesh position-y={RAIL_Y} rotation-x={Math.PI / 4} castShadow receiveShadow><boxGeometry args={[L, RAIL_W, RAIL_W]} /><meshStandardMaterial map={holes} color="#aeb3b8" metalness={0.6} roughness={0.5} envMapIntensity={0.7} /></mesh>
    <RoundedBox args={[L + 0.06, 0.042, 0.062]} radius={0.004} smoothness={2} position={[0, 0.049, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.5} /></RoundedBox>
    <mesh position={[0, 0.049, 0.0315]}><planeGeometry args={[L, 0.026]} /><meshStandardMaterial map={scale} roughness={0.6} /></mesh>
    {/* 两头的挡板和缓冲弹片 */}
    {[-1, 1].map(s => <group key={s} position-x={s * (L / 2 + 0.012)}>
      <RoundedBox args={[0.03, 0.15, 0.1]} radius={0.006} smoothness={2} position={[0, 0.1, 0]} castShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
      <mesh position={[-s * 0.03, RIDGE + 0.02, 0]}><torusGeometry args={[0.016, 0.0015, 6, 24]} /><Metal kind="steel" /></mesh>
      <RoundedBox args={[0.012, 0.03, 0.04]} radius={0.004} smoothness={2} position={[-s * 0.021, RIDGE + 0.02, 0]}><meshStandardMaterial color="#d9c27a" roughness={0.95} /></RoundedBox>
    </group>)}
    {/* 调平脚：左边一只，右边一根横梁两只 */}
    <mesh position={[-0.6, 0.014, 0]} castShadow><cylinderGeometry args={[0.014, 0.02, 0.028, 20]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0.6, 0.024, 0]} castShadow><boxGeometry args={[0.03, 0.012, 0.2]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    {[-0.085, 0.085].map(z => <mesh key={z} position={[0.6, 0.012, z]} castShadow><cylinderGeometry args={[0.012, 0.018, 0.024, 20]} /><Metal kind="brass" grain="turned" /></mesh>)}
    {/* 气源：一只小风机，波纹管接到导轨左端 */}
    <mesh geometry={G.hose} castShadow><meshStandardMaterial color="#8d949b" roughness={0.6} /></mesh>
    <group position={[-0.86, 0, -0.3]}>
      <RoundedBox args={[0.2, 0.13, 0.15]} radius={0.015} smoothness={3} position={[0, 0.065, 0]} castShadow receiveShadow>{plastic('#5b6976')}</RoundedBox>
      <mesh position={[0, 0.065, 0.076]}><circleGeometry args={[0.04, 28]} /><meshStandardMaterial color="#1b1e22" roughness={0.6} /></mesh>
      <mesh position={[0.07, 0.11, 0.076]}><circleGeometry args={[0.008, 14]} /><meshBasicMaterial color="#58e08a" toneMapped={false} /></mesh>
    </group>
    {/* 光电门和连到计时器的信号线 */}
    <group position-x={TRACK.gateA}><Photogate /></group>
    <group position-x={TRACK.gateB}><Photogate /></group>
    {G.wire.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#22262a" roughness={0.6} /></mesh>)}
    {/* 数字计时器：垫在一只矮架上，面板朝前上方斜着 */}
    <group position={[0.36, 0, -0.3]}>
      <RoundedBox args={[0.34, 0.12, 0.16]} radius={0.01} smoothness={2} position={[0, 0.06, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.55} /></RoundedBox>
      <group position={[0, 0.2, 0.01]} rotation-x={-0.3}>
        <RoundedBox args={[0.32, 0.16, 0.1]} radius={0.012} smoothness={3} castShadow>{plastic('#30363c', 0.6)}</RoundedBox>
        <Led text={ms[0]} w={0.13} h={0.05} position={[-0.075, 0.03, 0.0505]} />
        <Led text={ms[1]} w={0.13} h={0.05} position={[0.075, 0.03, 0.0505]} />
        {[-0.075, 0.075].map((x, i) => <mesh key={x} position={[x, -0.012, 0.0505]}><planeGeometry args={[0.05, 0.012]} /><meshBasicMaterial color={i ? COL.B : COL.A} toneMapped={false} /></mesh>)}
        {[-0.11, -0.07, -0.03].map(x => <mesh key={x} position={[x, -0.05, 0.052]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.009, 0.009, 0.006, 16]} /><meshStandardMaterial color="#cfd3d6" roughness={0.5} /></mesh>)}
        <mesh position={[0.11, -0.05, 0.052]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.01, 0.01, 0.006, 16]} /><meshStandardMaterial color="#c2362c" roughness={0.5} /></mesh>
      </group>
    </group>
    {children}
  </group>
}
/** 导轨上各处的高度，摆标签和箭头用 */
export const TRACK_Y = { ridge: RIDGE, beam: BEAM, top: BEAM + 0.03 }
/**
 * 滑块：一块折成 Λ 形的铝板骑在导轨上，顶上一块平板，中间立着 1 cm 宽的黑色遮光条，两头是弹性圈。
 * 原点在导轨中心线正下方的台面上，滑块中心在 x = 0。color：平板的颜色；extra：两侧各加几片配重
 */
export function Glider({ color, extra = 0 }: { color: string; extra?: number }) {
  const L = GLIDER.len, off = RAIL_W / 2 + 0.003
  return <group>
    {[-1, 1].map(s => <mesh key={s} position={[0, RAIL_Y + off * Math.SQRT1_2 + 0.002, s * off * Math.SQRT1_2]} rotation-x={s * Math.PI / 4} castShadow><boxGeometry args={[L, 0.003, 0.05]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    <RoundedBox args={[L, 0.006, 0.04]} radius={0.002} smoothness={2} position={[0, RIDGE + 0.008, 0]} castShadow>{plastic(color, 0.4)}</RoundedBox>
    {/* 遮光条和它的座 */}
    <mesh position={[0, RIDGE + 0.017, 0]}><boxGeometry args={[0.02, 0.012, 0.012]} /><Metal kind="aluminum" /></mesh>
    <mesh position={[0, RIDGE + 0.05, 0]} castShadow><boxGeometry args={[GLIDER.flag, 0.06, 0.0012]} />{black}</mesh>
    {/* 两头的弹性圈 */}
    {[-1, 1].map(s => <group key={s} position={[s * (L / 2 + 0.013), RIDGE + 0.02, 0]}>
      <mesh rotation-x={Math.PI / 2} scale={[1, 1, 1]}><torusGeometry args={[0.0135, 0.0012, 6, 28]} /><Metal kind="steel" /></mesh>
      <mesh position={[-s * 0.012, -0.006, 0]}><boxGeometry args={[0.006, 0.02, 0.014]} /><Metal kind="aluminum" /></mesh>
    </group>)}
    {/* 两侧的配重柱和配重片 */}
    {[-1, 1].map(s => <group key={s} position={[0, RAIL_Y + 0.012, s * 0.047]}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003, 0.003, 0.03, 8]} /><Metal kind="steel" /></mesh>
      {Array.from({ length: extra }, (_, i) => <mesh key={i} position-z={s * (-0.006 + i * 0.008)} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.02, 0.02, 0.007, 24]} /><Metal kind="brass" grain="turned" /></mesh>)}
    </group>)}
  </group>
}

// ---------- 鸡蛋下落装置 ----------
const EGG_G = once(() => {
  // 鸡蛋：一头大一头小，长 5.7 cm，最粗处直径 4.3 cm。原点在大头的最低点
  const pts: [number, number][] = []
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI, y = 0.0285 * (1 - Math.cos(a)); pts.push([Math.sin(a) * 0.0215 * (1.07 - 0.22 * y / 0.057), y]) }
  const half = new THREE.SphereGeometry(0.0215, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
  return { egg: lathe(pts, { segs: 36, crease: 60 }), half }
})
export const EGG_H = 0.057
const shellMat = <meshPhysicalMaterial color="#e6c9a4" roughness={0.55} clearcoat={0.15} clearcoatRoughness={0.6} />
/** 一只完好的鸡蛋，大头朝下。原点在最低点 */
export function Egg() { return <mesh geometry={EGG_G().egg} castShadow>{shellMat}</mesh> }
/** 摔碎的鸡蛋：两瓣蛋壳，一摊蛋清，一个蛋黄。k 是摊开的程度（0–1）。原点在落点 */
export function Splat({ k }: { k: RefObject<number> }) {
  const white = useRef<THREE.Mesh>(null), yolk = useRef<THREE.Mesh>(null), a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null)
  useFrame(() => {
    const v = k.current ?? 0
    white.current?.scale.set(0.3 + v * 0.7, 1, 0.3 + v * 0.7); yolk.current?.scale.set(0.6 + v * 0.4, 1 - v * 0.45, 0.6 + v * 0.4)
    if (a.current) { a.current.position.set(-0.012 - v * 0.03, 0.002, 0.004); a.current.rotation.set(0.2, 0, 0.35 + v * 1.05) }
    if (b.current) { b.current.position.set(0.012 + v * 0.034, 0.002, -0.006); b.current.rotation.set(-0.15, 0, -0.35 - v * 1.2) }
  })
  const G = EGG_G()
  return <group>
    <mesh ref={white} position-y={0.0012} rotation-x={-Math.PI / 2}><circleGeometry args={[0.062, 40]} /><meshPhysicalMaterial color="#f3ecd8" transparent opacity={0.62} roughness={0.08} clearcoat={1} /></mesh>
    <mesh ref={yolk} position={[0.006, 0.009, 0.008]} castShadow><sphereGeometry args={[0.017, 24, 16]} /><meshPhysicalMaterial color="#f0a321" roughness={0.2} clearcoat={0.8} /></mesh>
    <group ref={a}><mesh geometry={G.half} position-y={0.0215} castShadow><meshPhysicalMaterial color="#e6c9a4" roughness={0.55} side={THREE.DoubleSide} /></mesh></group>
    <group ref={b}><mesh geometry={G.half} position-y={0.0215} scale={[1, 1.25, 1]} castShadow><meshPhysicalMaterial color="#e6c9a4" roughness={0.55} side={THREE.DoubleSide} /></mesh></group>
  </group>
}
/** 力传感器平台顶面的高度；铁架台刻度尺的位置 */
export const PLATE_Y = 0.05
const EGG_RIG_G = once(() => ({ wire: tubeGeo([[0.13, 0.02, 0.02], [0.2, 0.006, 0.06], [0.28, 0.006, 0.1], [0.33, 0.03, 0.09]], 0.004, 24), foot: disc(0.014, 0.012) }))
/**
 * 鸡蛋下落装置里不动的部分：力传感器平台和读数表，铁架台和一根 1.1 m 的刻度尺（零点对着垫子的上表面）。
 * pad：平台上垫的是钢板（厚度 0）还是多厚的海绵；squash：海绵被压下去多少（m）；F：读数表上显示的字
 */
export function EggRig({ pad, squash, F = '0.00' }: { pad: number; squash?: RefObject<number>; F?: string }) {
  const G = EGG_RIG_G(), sponge = useMemo(() => rep(spongeTex(), 2, 2), []), scale = useMemo(() => makeScale(110), [])
  const steel = pad === 0, top = PLATE_Y + (steel ? 0.008 : pad), body = useRef<THREE.Mesh>(null)
  useFrame(() => { if (body.current && !steel) { const s = 1 - (squash?.current ?? 0) / pad * 0.35; body.current.scale.y = s; body.current.position.y = PLATE_Y + pad * s / 2 } })
  return <group>
    {/* 力传感器平台：铝壳、四只橡胶脚、不锈钢台面 */}
    <RoundedBox args={[0.26, 0.034, 0.26]} radius={0.008} smoothness={3} position={[0, 0.029, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.5} /></RoundedBox>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <mesh key={i} geometry={G.foot} position={[a * 0.105, 0.006, b * 0.105]}>{black}</mesh>)}
    <RoundedBox args={[0.24, 0.006, 0.24]} radius={0.002} smoothness={2} position={[0, PLATE_Y - 0.003, 0]} receiveShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
    <mesh position={[0, 0.03, 0.1305]}><planeGeometry args={[0.1, 0.012]} /><meshStandardMaterial color="#2e5c84" roughness={0.6} /></mesh>
    {steel
      ? <RoundedBox args={[0.18, 0.008, 0.18]} radius={0.002} smoothness={2} position={[0, PLATE_Y + 0.004, 0]} castShadow receiveShadow><Metal kind="steel" grain="brushed" rough={0.4} /></RoundedBox>
      : <RoundedBox ref={body} args={[0.2, pad, 0.2]} radius={0.008} smoothness={3} position={[0, PLATE_Y + pad / 2, 0]} castShadow receiveShadow><meshStandardMaterial map={sponge} bumpMap={sponge} bumpScale={0.6} roughness={1} /></RoundedBox>}
    {/* 读数表：斜面板上一块显示屏 */}
    <mesh geometry={G.wire}><meshStandardMaterial color="#22262a" roughness={0.6} /></mesh>
    <group position={[0.36, 0, 0.06]} rotation-y={-0.35}>
      <RoundedBox args={[0.2, 0.05, 0.13]} radius={0.01} smoothness={3} position={[0, 0.025, 0]} castShadow receiveShadow>{plastic('#30363c', 0.6)}</RoundedBox>
      <group position={[0, 0.085, -0.01]} rotation-x={-0.45}>
        <RoundedBox args={[0.2, 0.1, 0.03]} radius={0.01} smoothness={3} castShadow>{plastic('#30363c', 0.6)}</RoundedBox>
        <Led text={F} w={0.16} h={0.06} position={[0, 0.004, 0.0155]} />
      </group>
    </group>
    {/* 铁架台：铸铁底座、立杆、夹着的刻度尺 */}
    <group position={[-0.2, 0, -0.14]}>
      <RoundedBox args={[0.22, 0.022, 0.15]} radius={0.006} smoothness={2} position={[0, 0.011, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[-0.07, 0.6, -0.03]} castShadow><cylinderGeometry args={[0.006, 0.006, 1.2, 14]} /><Metal kind="stainless" /></mesh>
      {[0.3, 0.95].map(y => <group key={y} position={[-0.07, y, -0.03]}>
        <mesh castShadow><boxGeometry args={[0.03, 0.03, 0.03]} /><Metal kind="aluminum" grain="cast" /></mesh>
        <mesh position={[0.04, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.004, 0.004, 0.08, 10]} /><Metal kind="stainless" /></mesh>
      </group>)}
      <mesh position={[0.02, top + 0.55, -0.03]} castShadow><boxGeometry args={[0.036, 1.1, 0.004]} /><meshStandardMaterial color="#f1efe6" roughness={0.6} /></mesh>
      <mesh position={[0.02, top + 0.55, -0.0278]}><planeGeometry args={[0.034, 1.1]} /><meshStandardMaterial map={scale} roughness={0.6} /></mesh>
    </group>
  </group>
}
/** 垫子上表面的高度 */
export const padTop = (pad: number) => PLATE_Y + (pad === 0 ? 0.008 : pad)

// ---------- 牛顿摆 ----------
const R = CRADLE.d / 2, RAIL_H = 0.172, RAIL_Z = 0.058, BALL_Y = RAIL_H - CRADLE.L
const CRADLE_G = once(() => {
  const arch = (z: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.086, 0.012, z], [-0.086, RAIL_H - 0.02, z], [-0.08, RAIL_H - 0.004, z], [-0.066, RAIL_H, z], [0.066, RAIL_H, z], [0.08, RAIL_H - 0.004, z], [0.086, RAIL_H - 0.02, z], [0.086, 0.012, z]].map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.1), 80, 0.0032, 10)
  const len = Math.hypot(CRADLE.L - R, RAIL_Z)
  return { arches: [arch(RAIL_Z), arch(-RAIL_Z)], len, tilt: Math.atan2(RAIL_Z, CRADLE.L - R), foot: disc(0.0055, 0.006) }
})
/** 第 i 颗钢球静止时的位置（相对牛顿摆的原点） */
export const ballAt = (i: number, angle = 0): V3 => [(i - (CRADLE.n - 1) / 2) * CRADLE.d + Math.sin(angle) * CRADLE.L, RAIL_H - Math.cos(angle) * CRADLE.L, 0]
/** 牛顿摆：深色底座，两道镀铬的门形架，五颗钢球各用两根细线吊成 V 形，只能在一个平面里摆。angles：每颗球的摆角（弧度），每帧读一次 */
export function Cradle({ angles }: { angles?: RefObject<number[]> }) {
  const G = CRADLE_G(), arms = useRef<(THREE.Group | null)[]>([])
  useFrame(() => { const a = angles?.current; arms.current.forEach((g, i) => { if (g) g.rotation.z = a ? a[i] ?? 0 : 0 }) })
  return <group>
    <RoundedBox args={[0.21, 0.014, 0.15]} radius={0.005} smoothness={3} position={[0, 0.007, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1b1c1e" roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.15} /></RoundedBox>
    {G.arches.map((g, i) => <mesh key={i} geometry={g} castShadow><Metal kind="chrome" /></mesh>)}
    {[-0.086, 0.086].flatMap(x => [-RAIL_Z, RAIL_Z].map(z => <mesh key={`${x}${z}`} geometry={G.foot} position={[x, 0.017, z]}><Metal kind="chrome" /></mesh>))}
    {Array.from({ length: CRADLE.n }, (_, i) => (
      <group key={i} ref={e => { arms.current[i] = e }} position={[(i - (CRADLE.n - 1) / 2) * CRADLE.d, RAIL_H, 0]}>
        <mesh position-y={-CRADLE.L} castShadow><sphereGeometry args={[R, 36, 24]} /><Metal kind="chrome" rough={0.05} /></mesh>
        <mesh position-y={-CRADLE.L + R}><cylinderGeometry args={[0.0018, 0.0018, 0.003, 8]} /><Metal kind="steel" /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[0, -(CRADLE.L - R) / 2, s * RAIL_Z / 2]} rotation-x={s * G.tilt}><cylinderGeometry args={[0.00035, 0.00035, G.len, 5]} /><meshStandardMaterial color="#e8e6de" roughness={0.8} /></mesh>)}
      </group>
    ))}
  </group>
}
export const CRADLE_Y = { ball: BALL_Y, rail: RAIL_H }
