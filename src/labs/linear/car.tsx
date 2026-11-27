// 车：小轿车（出租车是它换个颜色加顶灯）和厢式货车。车头朝 +x，原点在车底正中，尺寸按真实的米。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Rod, disc, lathe } from '@/lab-kit'
import { makeSign } from './mats'

// ---------- 轮子 ----------
const tireGeo = (R: number, w: number) => { const g = lathe([[R * 0.66, -w / 2], [R * 0.9, -w * 0.52], [R * 0.985, -w * 0.38], [R, 0], [R * 0.985, w * 0.38], [R * 0.9, w * 0.52], [R * 0.66, w / 2]], { segs: 40, crease: 50 }); g.rotateX(Math.PI / 2); return g }
const rimGeo = (R: number) => { const g = disc(R, 0.05, { chamfer: 0.012 }); g.rotateX(Math.PI / 2); return g }
const TIRES = new Map<string, THREE.BufferGeometry>(), RIMS = new Map<number, THREE.BufferGeometry>()
/** 一只轮子：胎侧带鼓肚的橡胶胎、铝轮毂和几根辐条。side 是轮子朝外的一面（+1 或 −1） */
export function Wheel({ at, R = 0.335, w = 0.225, side, spokes = 5, rim = 'aluminum' }: { at: [number, number, number]; R?: number; w?: number; side: 1 | -1; spokes?: number; rim?: 'aluminum' | 'steel' }) {
  const k = `${R}${w}`
  const tire = TIRES.get(k) ?? (TIRES.set(k, tireGeo(R, w)), TIRES.get(k)!)
  const rg = RIMS.get(R) ?? (RIMS.set(R, rimGeo(R * 0.64)), RIMS.get(R)!)
  return (
    <group position={at}>
      <mesh geometry={tire} castShadow><meshStandardMaterial color="#1b1c1e" roughness={0.88} /></mesh>
      <mesh geometry={rg} position={[0, 0, side * (w * 0.32)]}><Metal kind={rim} grain="turned" rough={0.32} /></mesh>
      <mesh position={[0, 0, side * (w * 0.36)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[R * 0.14, R * 0.16, 0.03, 16]} /><Metal kind="chrome" /></mesh>
      {Array.from({ length: spokes }, (_, i) => <mesh key={i} position={[0, 0, side * (w * 0.4)]} rotation-z={i / spokes * Math.PI * 2}><boxGeometry args={[R * 0.1, R * 1.16, 0.02]} /><meshStandardMaterial color="#262a2e" roughness={0.6} /></mesh>)}
    </group>
  )
}

// ---------- 小轿车 ----------
const XF = 1.42, XR = -1.48, WR = 0.335        // 前后轴的位置、车轮半径
/** 车身侧面轮廓：后保险杠 → 行李箱 → 腰线 → 发动机盖 → 车头 → 底边（两个轮拱） */
function bodyShape() {
  const s = new THREE.Shape()
  s.moveTo(-2.33, 0.36); s.lineTo(-2.38, 0.6); s.quadraticCurveTo(-2.4, 0.88, -2.26, 0.95); s.lineTo(-1.9, 0.99); s.lineTo(-1.3, 1.0)
  s.lineTo(0.96, 1.0); s.quadraticCurveTo(1.85, 0.95, 2.28, 0.84); s.quadraticCurveTo(2.42, 0.76, 2.4, 0.5); s.lineTo(2.3, 0.34)
  s.lineTo(XF + 0.43, 0.34); s.absarc(XF, WR, 0.43, 0, Math.PI, false); s.lineTo(XR + 0.43, 0.34); s.absarc(XR, WR, 0.43, 0, Math.PI, false); s.lineTo(-2.33, 0.36)
  return s
}
/** 车顶和车窗那一截的侧面轮廓 */
const GH: [number, number][] = [[-1.34, 0.99], [-0.62, 1.4], [0.34, 1.44], [0.98, 0.99]]
function cabShape(pts: [number, number][]) { const s = new THREE.Shape(); s.moveTo(...pts[0]); s.lineTo(...pts[1]); s.quadraticCurveTo((pts[1][0] + pts[2][0]) / 2, pts[2][1] + 0.03, ...pts[2]); s.lineTo(...pts[3]); s.closePath(); return s }
function extrude(s: THREE.Shape, depth: number, bt: number, bs: number) { const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 5, curveSegments: 28 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g }
/** 斜着的一块玻璃（风挡、后窗）：贴在 a→b 那条边外侧 */
function slantGlass(a: [number, number], b: [number, number], w: number, out: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l
  // 平面先放平（长边沿 x、短边沿 z、法线朝上），再绕 z 转到 a→b 的方向，法线就朝外
  const g = new THREE.PlaneGeometry(l * 0.92, w); g.rotateX(-Math.PI / 2); g.rotateZ(Math.atan2(dy, dx))
  g.translate((a[0] + b[0]) / 2 + nx * out, (a[1] + b[1]) / 2 + ny * out, 0)
  return g
}
/** 车身从侧面拉伸出来以后再捏一捏：车头车尾两角收窄，车窗以上往里收（侧窗是斜的），裙边略往里收。返回 z 的缩放 */
const pinch = (x: number, y: number) => (1 - 0.1 * Math.pow(Math.min(1, Math.abs(x) / 2.42), 4)) * (1 - 0.2 * Math.min(1, Math.max(0, (y - 0.98) / 0.47))) * (1 - 0.05 * Math.min(1, Math.max(0, (0.5 - y) / 0.16)))
function deform(g: THREE.BufferGeometry) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * pinch(p.getX(i), p.getY(i))); g.computeVertexNormals(); return g }
/** 车身侧面上 (x, y) 那一点的 z（贴门缝、把手用） */
const sideZ = (x: number, y: number, z = 0.903) => z * pinch(x, y)
let SEDAN: ReturnType<typeof buildSedan> | null = null
function buildSedan() {
  const body = deform(extrude(bodyShape(), 1.48, 0.16, 0.05))
  const cab = deform(extrude(cabShape(GH), 1.18, 0.13, 0.03))
  // 侧窗：比车顶那一截的侧面小一圈，贴在外面，两侧各一块，跟着车顶一起往里收
  const win = cabShape([[-1.2, 1.035], [-0.6, 1.35], [0.3, 1.385], [0.84, 1.035]])
  const sides = [1, -1].map(sd => { const g = new THREE.ExtrudeGeometry(win, { depth: 0.004, bevelEnabled: false, curveSegments: 16 }); g.translate(0, 0, 0.722); if (sd < 0) g.scale(1, 1, -1); return deform(g) })
  const side = mergeGeometries(sides)
  const fw = deform(slantGlass(GH[2], GH[3], 1.24, 0.04)), rw = deform(slantGlass(GH[0], GH[1], 1.2, 0.04))
  return { body, cab, side, fw, rw }
}
const glassMat = (o: number, env = 1.4) => <meshPhysicalMaterial color="#0d1418" roughness={0.04} metalness={0.4} clearcoat={1} clearcoatRoughness={0.04} side={THREE.DoubleSide} transparent opacity={o} envMapIntensity={env} depthWrite={o > 0.5} />
const glass = glassMat(0.82)
const CUT = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.975)]
const lampGeo = (() => { const g = new THREE.SphereGeometry(1, 24, 14); return g })()

/** clear：镜头在车里往外看时用：风挡几乎透明、侧窗压暗，车身腰线以上切掉（要打开渲染器的 localClippingEnabled）
 *  小轿车：长 4.7 m、宽 1.8 m、高 1.47 m。taxi：车顶加一块“出租”顶灯；children 放在车的坐标里（比如车里的仪表盘） */
export function Sedan({ color = '#c9ccd0', taxi = false, clear = false, children, ...rest }: { color?: string; taxi?: boolean; clear?: boolean; children?: ReactNode } & Record<string, unknown>) {
  const g = (SEDAN ??= buildSedan())
  const paint = <meshPhysicalMaterial color={color} roughness={0.28} metalness={0.45} clearcoat={1} clearcoatRoughness={0.08} />
  // 镜头在车里时，车身是一整块实心的，要把腰线以上切掉，才看得见车里
  const body = clear ? <meshPhysicalMaterial color={color} roughness={0.28} metalness={0.45} clearcoat={1} clearcoatRoughness={0.08} clippingPlanes={CUT} /> : paint
  const sign = useMemo(() => taxi ? makeSign('出租', { w: 256, h: 96, bg: '#f4f1e6', fg: '#c4302b', size: 0.66 }) : null, [taxi])
  const seam = <meshBasicMaterial color="#1e2124" />
  return (
    <group {...rest}>
      <mesh geometry={g.body} castShadow receiveShadow>{body}</mesh>
      <mesh geometry={g.cab} castShadow>{paint}</mesh>
      {/* 侧窗、黑色的 B 柱、风挡、后窗 */}
      <mesh geometry={g.side}>{clear ? glassMat(0.55, 0.4) : glass}</mesh>
      {[1, -1].map(s => <mesh key={`bp${s}`} position={[-0.16, 1.2, s * sideZ(-0.16, 1.2, 0.728)]} rotation-x={-s * 0.2}><boxGeometry args={[0.09, 0.34, 0.01]} /><meshStandardMaterial color="#121416" roughness={0.4} /></mesh>)}
      <mesh geometry={g.fw}>{clear ? glassMat(0.1) : glass}</mesh>
      <mesh geometry={g.rw}>{glass}</mesh>
      {/* 门缝、腰线下的饰条、门把手、后视镜 */}
      {[1, -1].flatMap(s => [0.96, -0.16, -1.18].map(x => <mesh key={`${s}${x}`} position={[x, 0.7, s * sideZ(x, 0.7)]}><boxGeometry args={[0.012, 0.58, 0.004]} />{seam}</mesh>))}
      {[1, -1].map(s => <mesh key={`b${s}`} position={[-0.1, 0.42, s * sideZ(-0.1, 0.42, 0.89)]}><boxGeometry args={[2.25, 0.1, 0.03]} /><meshStandardMaterial color="#1c1d1f" roughness={0.7} /></mesh>)}
      {[1, -1].map(s => <mesh key={`c${s}`} position={[-0.17, 1.0, s * sideZ(-0.17, 1.0, 0.905)]}><boxGeometry args={[2.3, 0.025, 0.012]} /><Metal kind="chrome" /></mesh>)}
      {[1, -1].flatMap(s => [0.42, -0.66].map(x => <mesh key={`h${s}${x}`} position={[x, 0.9, s * sideZ(x, 0.9, 0.915)]}><boxGeometry args={[0.2, 0.035, 0.03]} /><Metal kind="chrome" /></mesh>))}
      {[1, -1].map(s => <group key={`m${s}`} position={[0.86, 1.06, s * 0.93]} rotation-y={s * 0.15}>
        <mesh position={[0, -0.02, -s * 0.08]}><boxGeometry args={[0.08, 0.03, 0.1]} /><meshStandardMaterial color="#141516" /></mesh>
        <mesh scale={[0.1, 0.075, 0.11]}><sphereGeometry args={[1, 20, 12]} />{paint}</mesh>
        <mesh position={[-0.075, 0, 0]} rotation-y={-Math.PI / 2}><circleGeometry args={[0.06, 20]} /><Metal kind="chrome" /></mesh>
      </group>)}
      {/* 车头：格栅（几道镀铬横条）、大灯、雾灯、下护板；车尾：尾灯、牌照 */}
      <RoundedBox args={[0.06, 0.2, 0.9]} radius={0.02} position={[2.37, 0.58, 0]}><meshStandardMaterial color="#0f1011" roughness={0.35} metalness={0.5} /></RoundedBox>
      {[0.53, 0.58, 0.63].map(y => <mesh key={y} position={[2.395, y, 0]}><boxGeometry args={[0.01, 0.012, 0.86]} /><Metal kind="chrome" /></mesh>)}
      {[1, -1].map(s => <group key={`l${s}`}>
        <mesh geometry={lampGeo} position={[2.29, 0.75, s * 0.6]} scale={[0.09, 0.055, 0.22]} rotation-y={s * 0.3}><meshPhysicalMaterial color="#eef3f6" emissive="#d6e6ff" emissiveIntensity={0.5} roughness={0.04} clearcoat={1} metalness={0.2} /></mesh>
        <mesh geometry={lampGeo} position={[2.33, 0.42, s * 0.62]} scale={[0.04, 0.03, 0.06]}><meshStandardMaterial color="#e8eef2" emissive="#ffffff" emissiveIntensity={0.2} /></mesh>
        <mesh geometry={lampGeo} position={[-2.34, 0.84, s * 0.6]} scale={[0.06, 0.05, 0.24]} rotation-y={-s * 0.25}><meshPhysicalMaterial color="#7a0b10" emissive="#ff2a2a" emissiveIntensity={0.6} roughness={0.08} clearcoat={1} /></mesh>
      </group>)}
      <mesh position={[2.33, 0.37, 0]}><boxGeometry args={[0.12, 0.1, 1.5]} /><meshStandardMaterial color="#1c1d1f" roughness={0.8} /></mesh>
      <mesh position={[-2.33, 0.4, 0]}><boxGeometry args={[0.12, 0.1, 1.5]} /><meshStandardMaterial color="#1c1d1f" roughness={0.8} /></mesh>
      {[2.4, -2.405].map(x => <mesh key={x} position={[x, 0.5, 0]} rotation-y={x > 0 ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[0.44, 0.14]} /><meshStandardMaterial map={makeSign('A·5D218', { w: 320, h: 100, bg: '#1d4fa3', fg: '#f4f6f8', size: 0.6, border: '#f4f6f8' })} roughness={0.4} /></mesh>)}
      {/* 轮拱里是黑的，轮子 */}
      {[XF, XR].map(x => <mesh key={`w${x}`} position={[x, WR, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.41, 0.41, 1.4, 24]} /><meshStandardMaterial color="#0b0c0d" roughness={1} /></mesh>)}
      {[XF, XR].flatMap(x => [1, -1].map(s => <Wheel key={`${x}${s}`} at={[x, WR, s * 0.78]} side={s as 1 | -1} />))}
      {taxi && sign && <group position={[-0.1, 1.48, 0]}>
        <RoundedBox args={[0.5, 0.16, 0.26]} radius={0.04} position={[0, 0.06, 0]}><meshStandardMaterial color="#f4f1e6" roughness={0.4} /></RoundedBox>
        {[1, -1].map(s => <mesh key={s} position={[0, 0.06, s * 0.132]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[0.42, 0.13]} /><meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.4} /></mesh>)}
      </group>}
      {children}
    </group>
  )
}

// ---------- 厢式货车 ----------
let TRUCK: ReturnType<typeof buildTruck> | null = null
function buildTruck() {
  // 驾驶室的侧面轮廓：后墙、圆弧车顶、前脸上半截后仰（风挡）、下半截竖直（格栅）
  const s = new THREE.Shape(); s.moveTo(3.78, 1.02); s.lineTo(3.78, 3.5); s.quadraticCurveTo(3.8, 3.62, 3.95, 3.62); s.lineTo(5.6, 3.62); s.quadraticCurveTo(5.86, 3.6, 5.88, 3.42); s.lineTo(6.0, 2.36); s.lineTo(6.02, 1.3); s.lineTo(5.98, 1.02); s.closePath()
  const cab = new THREE.ExtrudeGeometry(s, { depth: 2.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.06, bevelSegments: 5, curveSegments: 14 }); cab.translate(0, 0, -1.15); cab.computeVertexNormals()
  const d = new THREE.Shape(); d.moveTo(3.9, 3.6); d.lineTo(3.9, 4.25); d.quadraticCurveTo(4.6, 4.3, 5.4, 3.6); d.closePath()
  const deflector = new THREE.ExtrudeGeometry(d, { depth: 2.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3, curveSegments: 12 }); deflector.translate(0, 0, -1.05); deflector.computeVertexNormals()
  const wind = slantGlass([5.86, 3.4], [5.995, 2.42], 2.24, 0.07)
  const sideWin = new THREE.Shape(); sideWin.moveTo(-0.62, -0.42); sideWin.lineTo(0.55, -0.42); sideWin.lineTo(0.72, 0.46); sideWin.lineTo(-0.62, 0.46); sideWin.closePath()
  return { cab, deflector, wind, sideWin }
}
/** 9.6 米厢式货车：平头驾驶室、长货厢、三根轴。车头在 x = +6 */
export function Truck({ cab = '#2b5c9e', ...rest }: { cab?: string } & Record<string, unknown>) {
  const T = (TRUCK ??= buildTruck())
  const paint = <meshPhysicalMaterial color={cab} roughness={0.35} metalness={0.3} clearcoat={0.7} clearcoatRoughness={0.15} />
  const ribs = useMemo(() => { const a: number[] = []; for (let x = -5.6; x <= 3.4; x += 0.6) a.push(x); return a }, [])
  return (
    <group {...rest}>
      {/* 大梁 */}
      {[0.45, -0.45].map(z => <mesh key={z} position={[0, 0.95, z]} castShadow><boxGeometry args={[11.4, 0.26, 0.1]} /><meshStandardMaterial color="#1a1b1d" roughness={0.7} metalness={0.4} /></mesh>)}
      {/* 驾驶室：侧面轮廓拉伸、四边倒圆；前脸微微后仰，一整块大风挡，下面是镀铬横条的格栅和保险杠 */}
      <mesh geometry={T.cab} castShadow receiveShadow>{paint}</mesh>
      <mesh geometry={T.deflector} castShadow>{paint}</mesh>
      <mesh geometry={T.wind}>{glassMat(1)}</mesh>
      <mesh position={[5.93, 3.46, 0]} rotation-z={-0.12}><boxGeometry args={[0.06, 0.12, 2.2]} /><meshStandardMaterial color="#141516" roughness={0.5} /></mesh>
      {[1, -1].map(s => <group key={s}>
        <mesh position={[5.05, 2.82, s * 1.258]} rotation-y={s > 0 ? 0 : Math.PI}><shapeGeometry args={[T.sideWin]} />{glassMat(1)}</mesh>
        {/* 车门缝、把手、门下的踏步 */}
        <mesh position={[4.32, 2.05, s * 1.256]}><boxGeometry args={[0.014, 2.0, 0.006]} /><meshBasicMaterial color="#1a1c1f" /></mesh>
        <mesh position={[5.66, 1.75, s * 1.256]}><boxGeometry args={[0.014, 1.3, 0.006]} /><meshBasicMaterial color="#1a1c1f" /></mesh>
        <mesh position={[4.99, 1.1, s * 1.256]}><boxGeometry args={[1.34, 0.014, 0.006]} /><meshBasicMaterial color="#1a1c1f" /></mesh>
        <mesh position={[4.52, 2.2, s * 1.27]}><boxGeometry args={[0.24, 0.05, 0.04]} /><Metal kind="chrome" /></mesh>
      </group>)}
      <mesh position={[6.035, 1.88, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[1.8, 0.62]} /><meshStandardMaterial color="#121314" roughness={0.5} metalness={0.5} /></mesh>
      {[1.66, 1.8, 1.94, 2.08].map(y => <mesh key={y} position={[6.05, y, 0]}><boxGeometry args={[0.03, 0.05, 1.76]} /><Metal kind="chrome" /></mesh>)}
      <RoundedBox args={[0.32, 0.42, 2.5]} radius={0.08} position={[5.96, 1.1, 0]} castShadow><meshStandardMaterial color="#2a2d31" roughness={0.55} metalness={0.3} /></RoundedBox>
      {[1, -1].map(s => <group key={`h${s}`}>
        <RoundedBox args={[0.1, 0.2, 0.46]} radius={0.05} position={[6.0, 1.5, s * 0.98]}><meshPhysicalMaterial color="#eef3f6" emissive="#d6e6ff" emissiveIntensity={0.5} roughness={0.04} clearcoat={1} /></RoundedBox>
        <mesh position={[6.12, 1.08, s * 0.95]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.03, 18]} /><meshStandardMaterial color="#f2f4f2" emissive="#fff6dd" emissiveIntensity={0.3} /></mesh>
      </group>)}
      {[1, -1].map(s => <group key={`m${s}`} position={[5.75, 2.9, s * 1.42]}>
        <Rod from={[0.1, 0.3, -s * 0.17]} to={[0, 0.25, 0]} r={0.02}><meshStandardMaterial color="#222" /></Rod>
        <Rod from={[0.1, -0.3, -s * 0.17]} to={[0, -0.25, 0]} r={0.02}><meshStandardMaterial color="#222" /></Rod>
        <RoundedBox args={[0.1, 0.56, 0.22]} radius={0.04}><meshStandardMaterial color="#1c1d1f" roughness={0.5} /></RoundedBox>
        <mesh position={[-0.052, 0, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[0.18, 0.5]} /><Metal kind="chrome" /></mesh>
      </group>)}
      {/* 上车的踏板、侧面油箱 */}
      {[1, -1].map(s => <mesh key={`st${s}`} position={[4.5, 0.62, s * 1.2]}><boxGeometry args={[0.5, 0.06, 0.24]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      <mesh position={[2.6, 0.9, 1.1]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.32, 0.32, 0.12, 28]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[2.6, 0.9, 0.9]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.32, 0.32, 1.3, 28]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      {/* 货厢：白色厢板、一道道竖筋、底边护栏、后门 */}
      <RoundedBox args={[9.3, 2.7, 2.5]} radius={0.05} position={[-1.15, 2.55, 0]} castShadow receiveShadow><meshStandardMaterial color="#eceeed" roughness={0.45} metalness={0.15} /></RoundedBox>
      {ribs.map(x => [1, -1].map(s => <mesh key={`${x}${s}`} position={[x, 2.55, s * 1.258]}><boxGeometry args={[0.05, 2.62, 0.02]} /><meshStandardMaterial color="#d3d6d6" roughness={0.4} metalness={0.3} /></mesh>))}
      {[1, -1].map(s => <mesh key={`r${s}`} position={[-1.15, 1.22, s * 1.25]}><boxGeometry args={[9.3, 0.08, 0.06]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      <mesh position={[-5.81, 2.55, 0]}><boxGeometry args={[0.02, 2.6, 0.02]} /><meshStandardMaterial color="#9aa0a3" /></mesh>
      {[0.6, -0.6].map(z => <mesh key={z} position={[-5.82, 2.55, z]}><boxGeometry args={[0.04, 2.5, 0.05]} /><Metal kind="stainless" /></mesh>)}
      {[1, -1].map(s => <RoundedBox key={`t${s}`} args={[0.06, 0.14, 0.3]} radius={0.02} position={[-5.82, 1.35, s * 1.0]}><meshPhysicalMaterial color="#8c0d12" emissive="#ff2a2a" emissiveIntensity={0.5} /></RoundedBox>)}
      {/* 挡泥板和车轮：前一根轴，后两根双胎轴 */}
      {[4.75, -2.7, -4.05].flatMap(x => [1, -1].map(s => <mesh key={`f${x}${s}`} position={[x, 1.1, s * 1.08]}><boxGeometry args={[1.25, 0.05, 0.46]} /><meshStandardMaterial color="#17181a" roughness={0.8} /></mesh>))}
      {[4.75, -2.7, -4.05].flatMap(x => [1, -1].map(s => <Wheel key={`${x}${s}`} at={[x, 0.52, s * 1.0]} R={0.52} w={0.3} side={s as 1 | -1} spokes={0} rim="steel" />))}
      {[-2.7, -4.05].flatMap(x => [1, -1].map(s => <Wheel key={`i${x}${s}`} at={[x, 0.52, s * 0.68]} R={0.52} w={0.3} side={s as 1 | -1} spokes={0} rim="steel" />))}
    </group>
  )
}
