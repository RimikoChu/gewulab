// 玻璃器皿：量筒和烧杯。都是有壁厚的玻璃件，里面的液体单独画，所以玻璃用半透明的便宜做法（不折射），液体才看得清、不走样。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { lathe, shell } from '@/lab-kit'
import { CYL, columnCm } from './physics'
import { CM } from './world'

type V3 = [number, number, number]
export const WATER = '#2f86c8', BRINE = '#93ad5c'
const Glass3 = ({ o = 0.13 }: { o?: number }) => <meshPhysicalMaterial color="#2c4149" transparent opacity={o} roughness={0.03} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2} depthWrite={false} side={THREE.DoubleSide} />
const Liquid = ({ color, o = 0.4 }: { color: string; o?: number }) => <meshBasicMaterial color={color} transparent opacity={o} depthWrite={false} />

// ---------- 量筒 ----------
/** 1 mL 的液柱在画面里多高；筒的内底、筒口各在多高；内半径 */
export const ML = columnCm(1, CYL.r) * CM, CYL_IN = 0.04, RIM = 1.09, CYL_R = CYL.r * CM
/** 读数是 V 毫升时，凹液面最低处在多高（量筒底在 y = 0） */
export const levelY = (V: number) => CYL_IN + V * ML
const TUBE = shell([[0, 0.03], [0.1, 0.03], [0.1, 1.05], [0.105, 1.075], [0.116, 1.09]], 0.01, { segs: 48 })
const FILLET = lathe([[0.1, 0.03], [0.165, 0.03], [0.1, 0.085]], { segs: 32, closed: true })
/** 凹液面：中间低、贴着筒壁的一圈往上翘 */
const DIP = 0.014
const MENISCUS = lathe(Array.from({ length: 9 }, (_, i) => [(CYL_R - 0.002) * i / 8, DIP * (i / 8) ** 3] as [number, number]), { segs: 32, crease: 80 })
const TOP_ML = 104
/** 筒壁上的刻度：每 1 mL 一道短线，每 5 mL 一道中线，每 10 mL 一道长线加数字 */
function makeTicks() {
  const W = 192, H = 1152, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#12202b'; g.font = '700 50px sans-serif'; g.textBaseline = 'middle'
  for (let v = 1; v <= CYL.max; v += CYL.step) {
    const y = H - v / TOP_ML * H, ten = v % 10 === 0, five = v % 5 === 0
    g.fillRect(0, y - (ten ? 3.5 : 2), ten ? 100 : five ? 70 : 44, ten ? 7 : 4)
    if (ten) g.fillText(String(v), 108, y + 2)
  }
  g.font = '600 34px sans-serif'; g.fillText('mL', 112, 16)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** 量筒：坐在 at 处。V 是读数（毫升，放进去的固体也算在内），0 就是空的；children 是放在筒里的东西（原点在筒底中心） */
export function Cylinder({ at, V, color = WATER, children = null }: { at: V3; V: number; color?: string; children?: ReactNode }) {
  const ticks = useMemo(makeTicks, [])
  const h = Math.max(0, V) * ML
  return (
    <group position={at}>
      {/* 六角的玻璃底座，和筒身之间一圈圆角 */}
      <mesh position-y={0.015} castShadow renderOrder={3}><cylinderGeometry args={[0.2, 0.215, 0.03, 6]} /><Glass3 o={0.3} /></mesh>
      <mesh geometry={FILLET} renderOrder={3}><Glass3 o={0.26} /></mesh>
      {children}
      {h > 0.001 && <>
        <mesh position={[0, CYL_IN + h / 2, 0]} renderOrder={2}><cylinderGeometry args={[CYL_R - 0.002, CYL_R - 0.002, h, 40]} /><Liquid color={color} /></mesh>
        <mesh geometry={MENISCUS} position={[0, CYL_IN + h, 0]} renderOrder={2}><meshPhysicalMaterial color={color} transparent opacity={0.7} roughness={0.05} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} envMapIntensity={1.2} /></mesh>
      </>}
      <mesh geometry={TUBE} renderOrder={3} castShadow><Glass3 /></mesh>
      {/* 倾倒嘴：筒口向外撇出的一小片 */}
      <mesh position={[0.118, RIM - 0.012, 0]} rotation-z={-1.05} renderOrder={3}><cylinderGeometry args={[0.05, 0.012, 0.07, 12, 1, true, Math.PI, Math.PI]} /><Glass3 o={0.22} /></mesh>
      <mesh position={[0, CYL_IN + TOP_ML * ML / 2, 0]} renderOrder={4}><cylinderGeometry args={[0.1008, 0.1008, TOP_ML * ML, 32, 1, true, -0.78, 1.56]} /><meshBasicMaterial map={ticks} transparent depthWrite={false} toneMapped={false} /></mesh>
    </group>
  )
}

// ---------- 烧杯 ----------
export const BEAKER_H = 0.46, BEAKER_R = 0.2
const BEAKER_IN = 0.19
const CUP = shell([[0, 0], [0.18, 0], [0.2, 0.02], [0.2, 0.43], [0.21, 0.452], [0.218, 0.46]], 0.009, { segs: 48 })
/** 烧杯里 V 毫升的液体，液面在多高（烧杯底在 y = 0） */
export const beakerY = (V: number) => 0.01 + columnCm(V, BEAKER_IN / CM) * CM
/**
 * 烧杯，底面在 y = 0。V：里面有多少毫升；pour：正在往左边倒（绕着杯口左边那一点倾斜，嘴里流出一股液体，往下流 drop 这么长）；
 * frozen：0 到 1，里面的水结成冰的程度
 */
export function Beaker({ V, color = WATER, pour = false, drop = 0.6, frozen = 0 }: { V: number; color?: string; pour?: boolean; drop?: number; frozen?: number }) {
  const tip = useRef<THREE.Group>(null), stream = useRef<THREE.Mesh>(null), a = useRef(0)
  // 倒的时候杯子歪了，里面的液面仍然是平的：液体画成装满整只杯子，再用一个水平面把液面以上的切掉；液面那张片也始终放平
  const gl = useThree(s => s.gl), mark = useRef<THREE.Group>(null), top = useRef<THREE.Mesh>(null), w = useMemo(() => new THREE.Vector3(), [])
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), [])
  useFrame((_, d) => {
    a.current += ((pour ? 1.05 : 0) - a.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.22))
    if (tip.current) tip.current.rotation.z = a.current
    if (stream.current) stream.current.visible = pour && a.current > 0.8
    gl.localClippingEnabled = true
    if (mark.current) { mark.current.getWorldPosition(w); plane.constant = w.y }
    if (top.current) { top.current.parent!.rotation.z = -a.current; top.current.scale.set(1 / Math.max(0.5, Math.cos(a.current)), 1, 1) }
  })
  const h = beakerY(V) - 0.01
  const ice = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#cfe4ee'), frozen), [color, frozen])
  return (
    <group>
      <group ref={tip} position={[-BEAKER_R, BEAKER_H, 0]}>
        <group position={[BEAKER_R, -BEAKER_H, 0]}>
          {h > 0.002 && <>
            <mesh position={[0, 0.01 + (BEAKER_H - 0.03) / 2, 0]} renderOrder={2}><cylinderGeometry args={[BEAKER_IN - 0.002, BEAKER_IN - 0.012, BEAKER_H - 0.03, 40]} /><meshBasicMaterial color={`#${ice.getHexString()}`} transparent opacity={0.46 + 0.4 * frozen} depthWrite={false} clippingPlanes={[plane]} /></mesh>
            <group ref={mark} position={[0, 0.01 + h, 0]}><group><mesh ref={top} rotation-x={-Math.PI / 2} renderOrder={2}><ringGeometry args={[BEAKER_IN - 0.03, BEAKER_IN - 0.003, 40]} /><meshBasicMaterial color="#cfe6f2" transparent opacity={0.22} depthWrite={false} /></mesh></group></group>
          </>}
          <mesh geometry={CUP} renderOrder={3} castShadow><Glass3 o={0.17} /></mesh>
          {/* 杯嘴和几道刻度线 */}
          <mesh position={[-0.214, BEAKER_H - 0.012, 0]} rotation-z={1.0} renderOrder={3}><cylinderGeometry args={[0.055, 0.014, 0.07, 12, 1, true, 0, Math.PI]} /><Glass3 o={0.22} /></mesh>
          {[50, 100, 150, 200].map((v, i) => <mesh key={v} position={[0, beakerY(v), 0]} renderOrder={4}><cylinderGeometry args={[BEAKER_R + 0.001, BEAKER_R + 0.001, 0.005, 24, 1, true, -0.3, i % 2 ? 0.8 : 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.8} side={THREE.DoubleSide} /></mesh>)}
        </group>
      </group>
      <mesh ref={stream} visible={false} position={[-BEAKER_R - 0.03, BEAKER_H - 0.04 - drop / 2, 0]} renderOrder={2}><cylinderGeometry args={[0.012, 0.009, drop, 10]} /><Liquid color={color} o={0.7} /></mesh>
    </group>
  )
}
