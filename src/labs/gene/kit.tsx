// 实验器材：显微镜、戴手套的手（拿镊子、毛笔）、围棋子和布袋、看片灯、游标卡尺、花生和竹匾。
// 画面里 1 个单位约等于 10 cm，器材按实物尺寸画。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { Flesh, lerp, rng, tint, tube, type V3 } from './parts'

// ---------- 显微镜（学生用单目显微镜，高约 34 cm） ----------
const MS = 3.1   // 下面的尺寸按 1 = 31 cm 写
const SCOPE = (() => {
  const arm = new THREE.Shape(); arm.moveTo(-0.3, 0.07); arm.lineTo(-0.17, 0.07); arm.quadraticCurveTo(-0.2, 0.5, -0.1, 0.84); arm.lineTo(0.16, 0.84); arm.lineTo(0.16, 0.97); arm.lineTo(-0.16, 0.97); arm.quadraticCurveTo(-0.34, 0.6, -0.3, 0.07)
  const armG = new THREE.ExtrudeGeometry(arm, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 16 }); armG.translate(0, 0, -0.05); armG.rotateY(-Math.PI / 2)
  const base = new THREE.Shape(); base.moveTo(-0.24, -0.3); base.lineTo(0.24, -0.3); base.quadraticCurveTo(0.3, -0.3, 0.3, -0.22); base.lineTo(0.22, 0.3); base.lineTo(0.08, 0.3); base.quadraticCurveTo(0, 0.12, -0.08, 0.3); base.lineTo(-0.22, 0.3); base.lineTo(-0.3, -0.22); base.quadraticCurveTo(-0.3, -0.3, -0.24, -0.3)
  const baseG = new THREE.ExtrudeGeometry(base, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 3, curveSegments: 12 }); baseG.rotateX(Math.PI / 2); baseG.translate(0, 0.072, 0)
  return {
    arm: armG, base: baseG,
    tube: lathe([[0, 0], [0.058, 0], [0.06, 0.004], [0.06, 0.36], [0.05, 0.37], [0.05, 0.42], [0.044, 0.425], [0, 0.425]]),
    eye: lathe([[0, 0], [0.04, 0], [0.04, 0.05], [0.05, 0.055], [0.05, 0.11], [0.046, 0.118], [0.03, 0.118], [0.026, 0.1], [0, 0.1]]),
    turret: disc(0.125, 0.04, { chamfer: 0.012 }),
    coarse: lathe([[0, 0], [0.066, 0], [0.078, 0.008], [0.078, 0.052], [0.066, 0.06], [0, 0.06]], { segs: 28 }),
    fine: lathe([[0, 0], [0.036, 0], [0.044, 0.006], [0.044, 0.044], [0.036, 0.05], [0, 0.05]], { segs: 22 }),
    obj: [0.07, 0.11, 0.16].map(len => lathe([[0, 0], [0.012, 0], [0.02, 0.012], [0.026, 0.014], [0.026, len - 0.03], [0.032, len - 0.026], [0.032, len], [0, len]], { segs: 20 })),
    mirror: disc(0.085, 0.016, { chamfer: 0.004 }),
  }
})()
const Enamel = ({ color }: { color: string }) => <meshPhysicalMaterial color={color} roughness={0.32} metalness={0.15} clearcoat={0.7} clearcoatRoughness={0.2} />
/** 显微镜：黑漆的镜座、镜臂、镜筒，镀铬的转换器、物镜、准焦螺旋和压片夹。lamp 为真时载物台下面的灯亮着 */
export function Microscope({ position, lamp = false, yaw = 0 }: { position: V3; lamp?: boolean; yaw?: number }) {
  const g = SCOPE
  const black = <meshPhysicalMaterial color="#16181b" roughness={0.28} metalness={0.2} clearcoat={0.8} clearcoatRoughness={0.15} />
  return (
    <group position={position} rotation-y={yaw} scale={MS}>
      <mesh geometry={g.base} castShadow receiveShadow>{black}</mesh>
      {[-0.2, 0.2].flatMap(x => [-0.24, 0.24].map(z => <mesh key={`${x}${z}`} position={[x, 0.006, z]}><cylinderGeometry args={[0.03, 0.03, 0.012, 12]} /><meshStandardMaterial color="#0e1012" roughness={0.9} /></mesh>))}
      <mesh geometry={g.arm} position={[0, 0, -0.02]} scale={[0.7, 1, 1]} castShadow>{black}</mesh>
      {/* 镜筒：黑漆，上下两道镀铬的箍 */}
      <mesh geometry={g.tube} position={[0, 0.65, 0.08]} scale={[0.82, 1, 0.82]} castShadow>{black}</mesh>
      {[0.66, 1.0].map(y => <mesh key={y} position={[0, y, 0.08]}><cylinderGeometry args={[0.053, 0.053, 0.018, 28]} /><Metal kind="chrome" /></mesh>)}
      <mesh geometry={g.eye} position={[0, 1.06, 0.08]} scale={[0.85, 1, 0.85]}><Metal kind="chrome" /></mesh>
      <mesh position={[0, 1.16, 0.08]}><cylinderGeometry args={[0.03, 0.03, 0.004, 20]} /><meshPhysicalMaterial color="#20303a" roughness={0.05} clearcoat={1} /></mesh>
      {/* 转换器（可以转的圆盘）和三个物镜，斜着插在下面 */}
      <mesh geometry={g.turret} position={[0, 0.6, 0.08]} rotation-x={0.12}><Metal kind="chrome" grain="turned" /></mesh>
      {[0.07, 0.11, 0.16].map((len, i) => (
        <group key={i} position={[(i - 1) * 0.075, 0.6, 0.08 + (i === 1 ? 0.02 : -0.02)]} rotation={[0.12, 0, (i - 1) * -0.18]}>
          <group position={[0, -len, 0]}>
            <mesh geometry={g.obj[i]} scale={[0.8, 1, 0.8]}><Metal kind="chrome" grain="turned" /></mesh>
            <mesh position={[0, len * 0.55, 0]}><cylinderGeometry args={[0.022, 0.022, 0.012, 20]} /><meshStandardMaterial color={['#c63b3b', '#d9a62e', '#3b78c6'][i]} roughness={0.5} /></mesh>
          </group>
        </group>
      ))}
      {/* 粗准焦螺旋（大）和细准焦螺旋（小），镜臂两侧各一对，外圈滚花 */}
      {[-1, 1].map(s => <group key={s}>
        <mesh geometry={g.coarse} position={[s * 0.045, 0.5, -0.17]} rotation-z={-s * Math.PI / 2} scale={[1.1, 0.9, 1.1]}><Metal kind="chrome" grain="turned" /></mesh>
        <mesh geometry={g.fine} position={[s * 0.045, 0.36, -0.19]} rotation-z={-s * Math.PI / 2}><Metal kind="aluminum" grain="turned" /></mesh>
      </group>)}
      {/* 载物台：黑色方台，中间通光孔，两个镀铬压片夹压着玻片 */}
      <RoundedBox args={[0.4, 0.024, 0.4]} radius={0.008} smoothness={3} position={[0, 0.4, 0.08]} castShadow>{black}</RoundedBox>
      <mesh position={[0, 0.413, 0.08]}><cylinderGeometry args={[0.022, 0.022, 0.003, 16]} /><meshBasicMaterial color={lamp ? '#fff6dc' : '#3a3a36'} toneMapped={!lamp} /></mesh>
      {[-1, 1].map(s => <group key={s} position={[s * 0.12, 0.415, 0.02]}>
        <mesh position={[0, 0.006, 0.03]}><boxGeometry args={[0.018, 0.005, 0.12]} /><Metal kind="chrome" /></mesh>
        <mesh position={[0, 0.006, -0.04]}><cylinderGeometry args={[0.012, 0.012, 0.016, 12]} /><Metal kind="chrome" /></mesh>
      </group>)}
      <mesh position={[0, 0.417, 0.08]}><boxGeometry args={[0.3, 0.005, 0.1]} /><meshPhysicalMaterial color="#dff1f4" transparent opacity={0.55} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
      <mesh position={[0, 0.4205, 0.08]}><cylinderGeometry args={[0.018, 0.018, 0.001, 16]} /><meshStandardMaterial color="#9a3a6a" roughness={0.6} transparent opacity={0.85} /></mesh>
      {/* 遮光器和反光镜 */}
      <mesh position={[0.03, 0.378, 0.08]}><cylinderGeometry args={[0.1, 0.1, 0.01, 28]} />{black}</mesh>
      <mesh position={[0, 0.3, 0.08]}><cylinderGeometry args={[0.035, 0.035, 0.08, 20]} /><meshBasicMaterial color={lamp ? '#fff1c8' : '#2a2c2e'} toneMapped={!lamp} /></mesh>
      <mesh geometry={g.mirror} position={[0, 0.17, 0.08]} rotation-x={-0.7} scale={0.8}><Metal kind="chrome" /></mesh>
      {lamp && <pointLight position={[0, 0.5, 0.08]} intensity={0.6} distance={1.5} color="#fff2d0" />}
    </group>
  )
}

/** 实验台上的零碎：玻片盒、两个滴瓶、一个培养皿（里面泡着豌豆的根尖）、盖玻片盒、一本记录本 */
export function BenchProps({ at }: { at: V3 }) {
  const DROP = useMemo(() => shell([[0, 0], [0.2, 0], [0.22, 0.03], [0.22, 0.42], [0.12, 0.5], [0.07, 0.52]], 0.02, { segs: 24 }), [])
  const DISH = useMemo(() => shell([[0, 0], [0.55, 0], [0.56, 0.12]], 0.015, { segs: 40 }), [])
  return <group position={at}>
    <RoundedBox args={[1.0, 0.18, 0.6]} radius={0.03} position={[0, 0.09, 0]} castShadow><meshStandardMaterial color="#2d4f6e" roughness={0.6} /></RoundedBox>
    {[0, 1].map(i => <group key={i} position={[1.1 + i * 0.55, 0, -0.1]}>
      <mesh geometry={DROP} castShadow><meshPhysicalMaterial color={i ? '#6b3a1e' : '#3b2a1e'} transparent opacity={0.85} roughness={0.1} clearcoat={1} /></mesh>
      <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.08, 0.1, 0.12, 16]} /><meshStandardMaterial color="#1b1e21" roughness={0.5} /></mesh>
      <mesh position={[0, 0.68, 0]}><sphereGeometry args={[0.09, 14, 10]} /><meshStandardMaterial color="#2a2a2a" roughness={0.7} /></mesh>
    </group>)}
    <group position={[-1.2, 0, 0.3]}>
      <mesh geometry={DISH}><meshPhysicalMaterial color="#e4f0f2" transparent opacity={0.4} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.52, 32]} /><meshPhysicalMaterial color="#cfe3df" transparent opacity={0.5} roughness={0.05} /></mesh>
      {[0, 1, 2, 3, 4].map(k => <mesh key={k} position={[Math.cos(k * 1.3) * 0.25, 0.06, Math.sin(k * 1.3) * 0.25]} rotation={[Math.PI / 2, 0, k]}><capsuleGeometry args={[0.018, 0.16, 4, 8]} /><meshStandardMaterial color="#efe6cf" roughness={0.6} /></mesh>)}
    </group>
    <RoundedBox args={[1.3, 0.06, 0.95]} radius={0.02} position={[0.2, 0.03, 0.85]} rotation-y={0.12} castShadow><meshStandardMaterial color="#e8e2d0" roughness={0.9} /></RoundedBox>
    <RoundedBox args={[1.32, 0.02, 0.97]} radius={0.01} position={[0.2, 0.065, 0.85]} rotation-y={0.12}><meshStandardMaterial color="#3e5a4a" roughness={0.8} /></RoundedBox>
  </group>
}

// ---------- 戴手套的手 ----------
const nitrile = <meshPhysicalMaterial color="#7d9fdc" roughness={0.38} clearcoat={0.4} clearcoatRoughness={0.35} sheen={0.5} sheenColor="#c9d8fa" />
/** 一根手指：从指根到指尖几个关节连成的弯管，指尖圆头 */
function Finger({ pts, r }: { pts: V3[]; r: number }) {
  const g = useMemo(() => tube(pts, r, r * 0.84, '#ffffff', '#ffffff', 12, 18), [pts, r])
  return <><mesh geometry={g} castShadow>{nitrile}</mesh><mesh position={pts[pts.length - 1]}><sphereGeometry args={[r * 0.84, 14, 10]} />{nitrile}</mesh></>
}
const F_INDEX: V3[] = [[0.08, 0.72, 0.25], [0.13, 0.43, 0.16], [0.09, 0.2, 0.06], [0.035, 0.035, 0]]
const F_THUMB: V3[] = [[-0.1, 0.8, 0.42], [-0.2, 0.48, 0.28], [-0.13, 0.2, 0.1], [-0.04, 0.04, 0]]
const F_MID: V3[] = [[0.15, 0.74, 0.37], [0.25, 0.45, 0.3], [0.22, 0.22, 0.18], [0.13, 0.1, 0.1]]
const F_RING: V3[] = [[0.16, 0.77, 0.49], [0.28, 0.52, 0.47], [0.25, 0.36, 0.36], [0.17, 0.37, 0.28]]
const F_PINKY: V3[] = [[0.14, 0.81, 0.59], [0.24, 0.62, 0.61], [0.21, 0.51, 0.52], [0.14, 0.53, 0.45]]
const ARM_DIR = new THREE.Vector3(0.05, 0.86, 0.5).normalize()
const ARM_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ARM_DIR)
/** 白大褂的袖子：袖身有几道褶，袖口一道收边 */
const SLEEVE = (() => {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(0.27 + t * 0.07 + (t < 0.08 ? 0.03 : 0), t * 1.3)) }
  const g = new THREE.LatheGeometry(pts, 32), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = 1 + 0.05 * Math.sin(a * 3 + y * 5) * Math.min(1, y * 2); p.setX(i, x * k); p.setZ(i, z * k) }
  g.computeVertexNormals(); return g
})()
/**
 * 一只戴丁腈手套的右手，拇指和食指指尖捏着东西：捏的地方在原点，工具沿 −y 伸出去（交给 children 画）；
 * 中指在后面托着，无名指和小指蜷起来；手腕往 +y、+z 伸出去，手套口翻一道边，再往上是白大褂的袖子，末端淡出
 */
export function Hand({ children }: { children?: ReactNode }) {
  return <group>
    {children}
    {[F_INDEX, F_MID, F_RING, F_PINKY].map((f, i) => <Finger key={i} pts={f} r={[0.072, 0.074, 0.068, 0.058][i]} />)}
    <Finger pts={F_THUMB} r={0.085} />
    {/* 手掌：一块扁圆的肉，连着指根和手腕 */}
    <mesh position={[0.06, 0.95, 0.45]} rotation={[0.55, 0, 0.1]} scale={[0.14, 0.3, 0.23]} castShadow><sphereGeometry args={[1, 28, 20]} />{nitrile}</mesh>
    <mesh position={[-0.06, 0.88, 0.4]} rotation={[0.4, 0, 0.5]} scale={[0.1, 0.2, 0.12]} castShadow><sphereGeometry args={[1, 20, 14]} />{nitrile}</mesh>
    <group position={[0.05, 1.15, 0.6]} quaternion={ARM_Q}>
      {/* 手腕和手套口：手套口略张开，翻一道边 */}
      <mesh position={[0, 0.15, 0]} castShadow><cylinderGeometry args={[0.2, 0.17, 0.36, 24]} />{nitrile}</mesh>
      <mesh position={[0, 0.34, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.205, 0.025, 8, 28]} />{nitrile}</mesh>
      {/* 袖子 */}
      <mesh geometry={SLEEVE} position={[0, 0.3, 0]} castShadow><meshStandardMaterial color="#f2f1ec" roughness={0.9} /></mesh>
      <mesh position={[0, 0.34, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.3, 0.025, 8, 32]} /><meshStandardMaterial color="#e6e4dc" roughness={0.9} /></mesh>
      <mesh position={[0, 2.0, 0]}><cylinderGeometry args={[0.36, 0.34, 0.8, 28]} /><meshStandardMaterial color="#f2f1ec" roughness={0.9} transparent opacity={0.5} depthWrite={false} /></mesh>
    </group>
  </group>
}
/** 不锈钢镊子：尖头朝 −y，长约 12 cm；open 是尖端张开多少 */
export function Tweezers({ open = 0.02 }: { open?: number }) {
  return <group>
    {[-1, 1].map(s => <group key={s} rotation-z={s * open}>
      <mesh position={[s * 0.022, 0.55, 0]} castShadow><boxGeometry args={[0.032, 1.5, 0.09]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[s * 0.012, -0.24, 0]}><boxGeometry args={[0.018, 0.12, 0.03]} /><Metal kind="stainless" /></mesh>
    </group>)}
  </group>
}
/** 毛笔：笔尖朝 −y，竹杆、铜箍；dusted 为真时笔尖沾着黄色的花粉 */
export function Brush({ dusted = false }: { dusted?: boolean }) {
  const tip = useMemo(() => lathe([[0, -0.3], [0.03, -0.24], [0.05, -0.12], [0.055, 0]], { segs: 16 }), [])
  return <group>
    <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.045, 0.05, 1.6, 16]} /><meshStandardMaterial color="#c9a76a" roughness={0.6} /></mesh>
    {[0.35, 1.2].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.052, 0.052, 0.02, 16]} /><meshStandardMaterial color="#8f7444" roughness={0.6} /></mesh>)}
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.058, 0.055, 0.06, 16]} /><Metal kind="brass" /></mesh>
    <mesh geometry={tip}><meshStandardMaterial color={dusted ? '#f0c63e' : '#3b302a'} roughness={0.9} /></mesh>
  </group>
}

// ---------- 围棋子和布袋（第 6 课的模拟实验） ----------
export const STONE = lathe([[0, -0.028], [0.06, -0.023], [0.1, -0.01], [0.11, 0], [0.1, 0.01], [0.06, 0.023], [0, 0.028]], { segs: 32 })
export const StoneMat = ({ black }: { black: boolean }) => black
  ? <meshPhysicalMaterial color="#121315" roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} />
  : <meshPhysicalMaterial color="#f1eee4" roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.15} sheen={0.3} />
/** 一只抽绳布袋：袋口收紧、堆出褶子 */
export function ClothBag({ position, color, yaw = 0 }: { position: V3; color: string; yaw?: number }) {
  const g = useMemo(() => {
    // 截面：圆底、鼓鼓的袋身，往上收成细颈（抽绳勒紧的地方），颈上面一圈布翻开成荷叶边
    const prof: [number, number][] = [[0.001, 0], [0.3, 0.02], [0.5, 0.12], [0.58, 0.35], [0.58, 0.65], [0.5, 0.88], [0.3, 1.02], [0.17, 1.1], [0.16, 1.16], [0.24, 1.26], [0.36, 1.36], [0.42, 1.42]]
    const pts = prof.map(([r, y]) => new THREE.Vector2(r, y))
    const geo = new THREE.LatheGeometry(pts, 56), p = geo.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), top = Math.max(0, (y - 1.0) / 0.42), k = 1 + (0.025 + top * 0.18) * Math.sin(a * (top > 0 ? 13 : 6) + y * 2) + (y < 1 ? 0.025 * Math.sin(a * 3 + y * 6) : 0); p.setX(i, x * k); p.setZ(i, z * k * (y < 1 ? 0.9 : 1)); if (y > 1.2) p.setY(i, y + 0.05 * Math.sin(a * 13)) }
    geo.computeVertexNormals()
    return geo
  }, [])
  const cord = useMemo(() => tube([[0.16, 1.12, 0.06], [0.3, 1.0, 0.3], [0.36, 0.8, 0.5], [0.3, 0.6, 0.62]], 0.02, 0.02, '#ece4cc', '#ece4cc', 6, 12), [])
  const weave = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 2) { x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(i, 0, 1, 128); x.fillRect(0, i, 128, 1) } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4); t.colorSpace = THREE.SRGBColorSpace; return t }, [])
  return <group position={position} rotation-y={yaw}>
    <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial color={color} map={weave} roughness={0.95} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 1.12, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.17, 0.024, 8, 28]} /><meshStandardMaterial color="#e9e2cc" roughness={0.9} /></mesh>
    <mesh geometry={cord} castShadow><Flesh rough={0.9} /></mesh>
  </group>
}

// ---------- 看片灯（第 6 课：染色体排序图放在上面） ----------
export function Lightbox({ w, h, children }: { w: number; h: number; children?: ReactNode }) {
  return <group>
    <RoundedBox args={[w + 0.5, h + 0.5, 0.5]} radius={0.06} smoothness={3} position={[0, 0, -0.26]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.45} env={0.5} /></RoundedBox>
    <mesh position={[0, 0, 0.002]}><planeGeometry args={[w, h]} /><meshBasicMaterial color="#f6f8f4" toneMapped={false} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 - 0.6), -h / 2 - 0.36, 0.1]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.08, 0.08, 0.1, 16]} /><meshStandardMaterial color="#2a2e33" roughness={0.6} /></mesh>)}
    {children}
  </group>
}

// ---------- 游标卡尺（第 7 课） ----------
function scaleTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64
  const g = c.getContext('2d')!; g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 1024, 64); g.fillStyle = '#1b1e22'
  for (let i = 0; i <= 150; i++) { const x = 20 + i * 6.5, h = i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 14; g.fillRect(x, 0, 1.6, h); if (i % 10 === 0) { g.font = '600 20px ui-monospace, Menlo, monospace'; g.fillText(String(i / 10), x - 5, 56) } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
/** 游标卡尺：尺身沿 +x，量爪朝 −y；w 是两爪之间的距离（单位：场景单位，1 = 10 cm） */
export function Caliper({ w }: { w: number }) {
  const tex = useMemo(scaleTex, [])
  return <group>
    <RoundedBox args={[2.1, 0.17, 0.035]} radius={0.01} smoothness={2} position={[0.9, 0, 0]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
    <mesh position={[0.95, 0.005, 0.019]}><planeGeometry args={[1.95, 0.13]} /><meshStandardMaterial map={tex} metalness={0.6} roughness={0.35} /></mesh>
    {/* 固定量爪 */}
    <RoundedBox args={[0.12, 0.55, 0.035]} radius={0.01} smoothness={2} position={[-0.1, -0.3, 0]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
    {/* 游标：带一段刻度、一个紧固螺钉，跟着活动量爪走 */}
    <group position={[w, 0, 0]}>
      <RoundedBox args={[0.5, 0.25, 0.07]} radius={0.015} smoothness={2} position={[0.12, 0, 0.01]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
      <RoundedBox args={[0.12, 0.55, 0.035]} radius={0.01} smoothness={2} position={[-0.04, -0.3, 0]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
      <mesh position={[0.15, 0.14, 0.01]} rotation-x={0}><cylinderGeometry args={[0.04, 0.04, 0.05, 16]} /><Metal kind="steel" grain="turned" /></mesh>
    </group>
  </group>
}

// ---------- 花生 ----------
/** 一枚带壳的花生：两三粒的“腰”收细，表面网纹，一头有喙。沿 +x，长 len，原点在中间 */
export function peanutGeo(len: number, seed = 1, NU = 30, NV = 16) {
  const r = rng(seed), R = len * (0.2 + r() * 0.03), waist = 0.42 + r() * 0.16, curve = (r() - 0.5) * 0.15, ph = r() * 6
  const pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
    const u = i / NU, t = j / NV * Math.PI * 2
    const end = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.55)
    const lobe = 1 - 0.2 * Math.exp(-Math.pow((u - waist) / 0.08, 2))
    const net = 1 + 0.07 * (Math.pow(Math.abs(Math.sin(t * 5 + u * 4 + ph)), 6) + Math.pow(Math.abs(Math.sin(u * 26 + t * 0.6)), 6))
    const rr = R * end * lobe * net, beak = u > 0.9 ? (u - 0.9) * len * 0.4 : 0
    pos.push((u - 0.5) * len, Math.sin(t) * rr + curve * len * Math.sin(Math.PI * u) - beak, Math.cos(t) * rr * 0.92)
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  const p = g.attributes.position, cl = new Float32Array(p.count * 3), c = new THREE.Color(), A = new THREE.Color('#a67a4c'), B = new THREE.Color('#c99f6c')
  for (let i = 0; i < p.count; i++) { c.copy(A).lerp(B, 0.5 + 0.5 * Math.sin(i * 0.37 + p.getX(i) * 9)); cl.set([c.r, c.g, c.b], i * 3) }
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3))
  return g
}
/** 竹匾：浅浅的一只圆竹筐，编出来的纹 */
export function BambooTray({ R = 1.6 }: { R?: number }) {
  const { g, tex } = useMemo(() => {
    const geo = shell([[0, 0], [R * 0.85, 0], [R, 0.22], [R * 1.02, 0.26]], 0.03, { segs: 48 })
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!
    x.fillStyle = '#c9a868'; x.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = (i + j) % 2 ? 'rgba(120,86,40,0.35)' : 'rgba(240,220,170,0.25)'; x.fillRect(i * 16, j * 16, 16, 16); x.fillStyle = 'rgba(80,56,24,0.4)'; x.fillRect(i * 16, j * 16, 16, 1.5) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 2)
    return { g: geo, tex: t }
  }, [R])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.25, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[R * 1.02, 0.04, 8, 48]} /><meshStandardMaterial color="#a8854a" roughness={0.8} /></mesh>
  </group>
}
/** 一匾花生：一堆随机摆着的花生，len 是平均长度（场景单位） */
export function PeanutHeap({ len, n = 46, seed = 1, R = 1.35 }: { len: number; n?: number; seed?: number; R?: number }) {
  const geo = useMemo(() => {
    const r = rng(seed), list: THREE.BufferGeometry[] = []
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, q = Math.sqrt(r()) * R, h = 0.06 + (1 - q / R) * 0.25 + r() * 0.05
      const g = peanutGeo(len * (0.85 + r() * 0.3), i + seed * 100, 18, 10)
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * q, h, Math.sin(a) * q), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 0.6, r() * 6, r() * 0.6)), new THREE.Vector3(1, 1, 1)))
      list.push(g)
    }
    const merged = new THREE.BufferGeometry(), all = list.map(g => g.toNonIndexed())
    const total = all.reduce((s, g) => s + g.attributes.position.count, 0), P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3)
    let o = 0; for (const g of all) { P.set(g.attributes.position.array as Float32Array, o * 3); N.set(g.attributes.normal.array as Float32Array, o * 3); C.set(g.attributes.color.array as Float32Array, o * 3); o += g.attributes.position.count }
    merged.setAttribute('position', new THREE.BufferAttribute(P, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(N, 3)); merged.setAttribute('color', new THREE.BufferAttribute(C, 3))
    return merged
  }, [len, n, seed, R])
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
}
export { tint }
