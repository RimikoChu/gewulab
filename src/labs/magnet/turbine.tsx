// 一台 2 MW 级陆上风力发电机，按米建模（外面乘 M）：混凝土基础、锥形钢塔筒（三段法兰）、机舱、轮毂和导流罩、三支叶片。
// 机舱里从前到后：轮毂法兰 → 主轴和主轴承 → 胀紧套 → 行星齿轮箱（两只扭力臂）→ 高速轴上的制动盘和卡钳 → 联轴器 → 发电机；
// 机舱底下是偏航轴承和四台偏航电机，后部是控制柜，顶上是散热器、测风仪和航空障碍灯。
// cut 从 0 到 1：朝东（+x）的侧板和那一半顶板移开，看得见里面。原点在塔筒底面中心，机舱主轴沿 +z（轮毂朝南）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, lathe, shell, type RY } from '@/lab-kit'

/** 尺寸（m）：塔筒高、机舱底面高、主轴中心离机舱底面的高度、轮毂中心离塔筒中心的前伸、叶片长 */
export const TB = { tower: 78, deck: 78.4, axis: 2.1, overhang: 6.0, blade: 50, tilt: -5 * Math.PI / 180 }
/** 轮毂中心（相对塔筒底面中心，m） */
export const hubAt = (): [number, number, number] => [0, TB.deck + TB.axis + Math.sin(-TB.tilt) * TB.overhang, TB.overhang]

// ---------- 叶片 ----------
/** 一支叶片：沿 +y 伸出（从轮毂中心量起 1.9 m 开始），弦向在 x、厚度在 z。叶根是圆的，往外渐变成翼型，越到叶尖越窄越薄、扭角越小；叶尖两道红色警示带 */
function bladeGeo() {
  const S = 44, C = 22, pos: number[] = [], col: number[] = [], idx: number[] = []
  const white = new THREE.Color('#eceeec'), red = new THREE.Color('#c8392e')
  for (let i = 0; i <= S; i++) {
    const t = i / S, r = 1.9 + t * (TB.blade - 0.1)
    const fr = Math.min(1, Math.max(0, (r - 3.2) / 7))                     // 0 圆形叶根 → 1 翼型
    const chord = r < 10 ? 1.9 + (3.6 - 1.9) * Math.sin(Math.min(1, (r - 1.9) / 8.1) * Math.PI / 2) : 3.6 - 2.7 * Math.pow((r - 10) / (TB.blade - 8.1), 0.8)
    const thick = THREE.MathUtils.lerp(1.0, Math.max(0.16, 0.42 - 0.26 * (r - 10) / 40), fr)
    const twist = (r < 10 ? 14 : 14 * Math.pow(1 - (r - 10) / 42, 1.6)) * Math.PI / 180
    const tip = r > TB.blade - 5.5 && ((r > TB.blade - 5.5 && r < TB.blade - 4) || r > TB.blade - 2.2)
    for (let j = 0; j < C; j++) {
      const a = j / C * Math.PI * 2
      // 圆：半径 1.0 m；翼型：前缘圆、后缘尖，变桨轴在弦长 30% 处
      const cx = Math.cos(a), sx = Math.sin(a)
      const xc = (1 - cx) / 2
      const foilX = (xc - 0.3) * chord, foilZ = sx * thick * chord * 0.5 * Math.pow(1.05 - xc, 0.75) + 0.03 * chord * Math.sin(Math.PI * xc)
      const x = THREE.MathUtils.lerp(-cx * 1.0, foilX, fr), z = THREE.MathUtils.lerp(sx * 1.0, foilZ, fr)
      pos.push(x * Math.cos(twist) - z * Math.sin(twist), r, x * Math.sin(twist) + z * Math.cos(twist))
      const c = tip ? red : white; col.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < C; j++) { const a = i * C + j, b = i * C + (j + 1) % C, c = a + C, d = b + C; idx.push(a, c, b, b, c, d) }
  // 叶尖封口
  const tipC = pos.length / 3; pos.push(0, TB.blade + 1.8, 0); col.push(red.r, red.g, red.b)
  for (let j = 0; j < C; j++) idx.push(S * C + j, tipC, S * C + (j + 1) % C)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}

// ---------- 塔筒、轮毂、导流罩 ----------
const TOWER = lathe([[0, 0], [2.15, 0], [2.15, 0.4], [2.1, 0.6], [1.42, TB.tower - 0.2], [1.4, TB.tower], [0, TB.tower]], { segs: 64, crease: 20 })
const FLANGE = (y: number, r: number) => { const g = new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.12, 64, 1, true); g.translate(0, y, 0); return g }
const towerR = (y: number) => 2.1 + (1.42 - 2.1) * (y - 0.6) / (TB.tower - 0.8)
const FLANGES = mergeGeometries([26, 52].map(y => FLANGE(y, towerR(y))))
const FOUND = lathe([[0, -0.3], [4.4, -0.3], [4.4, 0.15], [3.2, 0.35], [0, 0.35]], { segs: 48, crease: 30 })
/** 导流罩：轮毂外面那只白色的玻璃钢罩子，沿 +z 是鼻锥 */
const SPINNER = (() => { const p: RY[] = [[1.75, 0]]; for (let i = 1; i <= 14; i++) { const t = i / 14; p.push([1.75 * Math.cos(t * Math.PI / 2) ** 0.85, 3.0 * Math.sin(t * Math.PI / 2)]) } p[p.length - 1][0] = 0; const g = shell(p, 0.04, { segs: 48 }); g.rotateX(Math.PI / 2); return g })()
const HUB_CAST = (() => { const g = new THREE.IcosahedronGeometry(1.25, 3); return g })()

// ---------- 机舱里的传动链 ----------
/** 一只沿 z 方向的车削件：截面写成 [半径, z] */
const alongZ = (p: RY[], segs = 40) => { const g = lathe(p, { segs, crease: 35 }); g.rotateX(Math.PI / 2); return g }
const SHAFT = alongZ([[0, -0.1], [0.4, -0.1], [0.4, 3.9], [0.5, 4.0], [0.9, 4.1], [0.9, 4.35], [0, 4.35]])
const SHRINK = alongZ([[0.4, 0], [0.78, 0], [0.82, 0.05], [0.82, 0.34], [0.78, 0.4], [0.4, 0.4]], 40)
const GEARBOX = alongZ([[0, 0], [0.7, 0], [0.75, 0.05], [1.15, 0.2], [1.2, 0.35], [1.2, 1.15], [1.1, 1.3], [0.55, 1.45], [0.5, 1.6], [0, 1.6]], 48)
const GB_RIBS = mergeGeometries(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2, g = new THREE.BoxGeometry(0.08, 0.12, 0.9); g.translate(Math.cos(a) * 1.24, Math.sin(a) * 1.24, 0.75); return g }))
const BRAKE = alongZ([[0.12, 0], [0.6, 0], [0.6, 0.05], [0.12, 0.05]], 48)
const COUPLING = mergeGeometries([alongZ([[0, 0], [0.32, 0], [0.32, 0.12], [0, 0.12]]), (() => { const g = alongZ([[0, 0], [0.14, 0], [0.14, 0.62], [0, 0.62]], 16); g.translate(0, 0, 0.12); return g })(), (() => { const g = alongZ([[0, 0], [0.32, 0], [0.32, 0.12], [0, 0.12]]); g.translate(0, 0, 0.74); return g })()])
const GEN = alongZ([[0, 0], [0.55, 0], [0.62, 0.08], [0.78, 0.15], [0.78, 2.45], [0.62, 2.55], [0.5, 2.65], [0.12, 2.7], [0, 2.7]], 48)
const GEN_FINS = mergeGeometries(Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2, g = new THREE.BoxGeometry(0.04, 0.09, 2.1); g.rotateZ(a); g.translate(Math.cos(a) * 0.82, Math.sin(a) * 0.82, 1.3); return g }))
const YAW_RING = (() => { const g = new THREE.TorusGeometry(1.55, 0.12, 8, 64); g.rotateX(Math.PI / 2); return g })()

/** 一台风机。spin：叶轮转不转；cut：机舱剖开多少（0–1）；flow：输出电缆里电流的相对值（会正负来回变，交流电）；open：发电机外壳透明 */
export function Turbine({ spin = true, cut = 0, flow = 0, rpm = 15, light = true, detail = true }: { spin?: boolean; cut?: number; flow?: number; rpm?: number; light?: boolean; detail?: boolean }) {
  const blade = useMemo(() => bladeGeo(), [])
  const rotor = useRef<THREE.Group>(null), fast = useRef<THREE.Group[]>([]), speed = useRef(spin ? 1 : 0), ang = useRef(Math.random() * 6)
  const beacon = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }, d) => {
    const dt = Math.min(d, 1 / 30)
    speed.current += ((spin ? 1 : 0) - speed.current) * (1 - Math.exp(-dt / 2.2))     // 起转、停转都慢慢来
    ang.current += speed.current * rpm / 60 * Math.PI * 2 * dt
    if (rotor.current) rotor.current.rotation.z = ang.current
    // 高速轴：画面里只画成叶轮的 6 倍（实际约 100 倍，太快看不清）
    fast.current.forEach(g => { if (g) g.rotation.z = ang.current * 6 })
    if (beacon.current) { const on = light && Math.floor(clock.elapsedTime * 1.0) % 2 === 0; beacon.current.color.set(on ? '#ff2a1c' : '#3a0a08') }
  })
  const white = <meshPhysicalMaterial color="#eef0ee" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />
  const k = cut, side = 1 - k                      // 东侧板：k=1 时完全移开
  const L = 11.2, W = 3.9, H = 3.9, z0 = -6.6       // 机舱罩：长、宽、高，后端的 z
  return <group>
    {/* 基础和塔筒 */}
    <mesh geometry={FOUND} receiveShadow><meshStandardMaterial color="#a9a69e" roughness={0.9} /></mesh>
    <mesh geometry={TOWER} castShadow receiveShadow>{white}</mesh>
    <mesh geometry={FLANGES}><meshStandardMaterial color="#c9cbca" roughness={0.6} /></mesh>
    {/* 塔筒门和门前的钢梯 */}
    <group position={[0, 0, 2.08]} rotation-y={0}>
      <RoundedBox args={[0.95, 2.1, 0.12]} radius={0.04} position={[0, 1.95, 0.02]} castShadow><meshStandardMaterial color="#d7d9d8" roughness={0.5} metalness={0.3} /></RoundedBox>
      <mesh position={[0, 0.85, 0.75]} castShadow><boxGeometry args={[1.4, 0.08, 1.4]} /><Metal kind="zinc" grain="cast" /></mesh>
      {[0.25, 0.55].map((y, i) => <mesh key={y} position={[0, y, 1.45 + i * 0.3]}><boxGeometry args={[1.2, 0.06, 0.28]} /><Metal kind="zinc" grain="cast" /></mesh>)}
    </group>

    <group position={[0, TB.deck, 0]}>
      {/* 偏航轴承、偏航电机 */}
      <mesh geometry={YAW_RING} position={[0, 0.05, 0]}><Metal kind="steel" grain="turned" /></mesh>
      {detail && [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + i * Math.PI / 2; return <group key={i} position={[Math.cos(a) * 1.25, 0.6, Math.sin(a) * 1.25]}>
        <mesh castShadow><cylinderGeometry args={[0.16, 0.16, 0.9, 16]} /><meshPhysicalMaterial color="#5b6f84" roughness={0.4} clearcoat={0.4} /></mesh>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.2, 0.2, 0.14, 16]} /><Metal kind="steel" /></mesh>
      </group> })}

      {/* 机舱罩：底板、西侧板、后板、前板、西半边顶板始终在；东侧板和东半边顶板剖开时移走 */}
      <RoundedBox args={[W, 0.1, L]} radius={0.04} position={[0, 0.05, z0 + L / 2]} receiveShadow>{white}</RoundedBox>
      <RoundedBox args={[0.1, H, L]} radius={0.04} position={[-W / 2, H / 2, z0 + L / 2]} castShadow receiveShadow>{white}</RoundedBox>
      <RoundedBox args={[W, H, 0.1]} radius={0.04} position={[0, H / 2, z0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[W, H, 0.1]} radius={0.04} position={[0, H / 2, z0 + L]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[W / 2, 0.1, L]} radius={0.04} position={[-W / 4, H, z0 + L / 2]} castShadow>{white}</RoundedBox>
      <group visible={side > 0.01} position={[k * 9, k * 2.5, 0]}>
        <RoundedBox args={[0.1, H, L]} radius={0.04} position={[W / 2, H / 2, z0 + L / 2]} castShadow>{white}</RoundedBox>
        <RoundedBox args={[W / 2, 0.1, L]} radius={0.04} position={[W / 4, H, z0 + L / 2]} castShadow>{white}</RoundedBox>
        {/* 侧面的一道检修门缝和铭牌条 */}
        <mesh position={[W / 2 + 0.055, H / 2, z0 + 2.5]}><planeGeometry args={[0.02, 2]} /><meshBasicMaterial color="#9da2a0" /></mesh>
      </group>
      {/* 剖开时，剖口的一圈截面（壳的厚度） */}
      {k > 0.95 && <group>
        <mesh position={[0, H, z0 + L / 2]}><boxGeometry args={[0.04, 0.11, L]} /><meshStandardMaterial color="#c9b79a" roughness={0.8} /></mesh>
        <mesh position={[W / 2, 0.05, z0 + L / 2]}><boxGeometry args={[0.11, 0.11, L]} /><meshStandardMaterial color="#c9b79a" roughness={0.8} /></mesh>
      </group>}
      {/* 顶上：散热器、测风仪支架、航空障碍灯 */}
      <RoundedBox args={[2.4, 1.0, 1.4]} radius={0.06} position={[-0.4, H + 0.55, z0 + 0.9]} castShadow><meshStandardMaterial color="#9aa1a5" metalness={0.5} roughness={0.45} /></RoundedBox>
      <group position={[-1.2, H, z0 + 0.4]}>
        <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.05, 0.06, 2.8, 8]} /><Metal kind="aluminum" /></mesh>
        <mesh position={[0, 2.8, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 1.4, 6]} /><Metal kind="aluminum" /></mesh>
        <mesh position={[0.65, 2.95, 0]}><cylinderGeometry args={[0.18, 0.18, 0.06, 12]} /><meshStandardMaterial color="#2b2b2b" /></mesh>
        <mesh position={[-0.65, 3.0, 0]}><boxGeometry args={[0.04, 0.3, 0.45]} /><meshStandardMaterial color="#2b2b2b" /></mesh>
        <mesh position={[0, 3.0, 0]}><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial ref={beacon} color="#ff2a1c" toneMapped={false} /></mesh>
      </group>

      {/* 传动链：整根轴往上仰 5° */}
      <group position={[0, TB.axis, 0]} rotation-x={TB.tilt}>
        {detail && <Drive fast={fast} flow={flow} />}
        {/* 轮毂和叶片 */}
        <group position={[0, 0, TB.overhang]}>
          <group ref={rotor}>
            <mesh geometry={HUB_CAST} castShadow><meshStandardMaterial color="#8e9599" roughness={0.6} metalness={0.5} /></mesh>
            {[0, 1, 2].map(i => <group key={i} rotation-z={i * Math.PI * 2 / 3}>
              <mesh geometry={blade} castShadow><meshPhysicalMaterial vertexColors roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.25} /></mesh>
            </group>)}
            <mesh geometry={SPINNER} position={[0, 0, -0.9]} castShadow>{white}</mesh>
          </group>
        </group>
      </group>
    </group>
  </group>
}

/** 机舱里的传动链和别的设备（主轴中心为原点，z 朝前） */
function Drive({ fast, flow }: { fast: React.RefObject<THREE.Group[]>; flow: number }) {
  const cast = <Metal kind="iron" grain="cast" />
  const paint = <meshPhysicalMaterial color="#5b7489" roughness={0.38} clearcoat={0.45} />
  const genPaint = <meshPhysicalMaterial color="#3f6a8c" roughness={0.36} clearcoat={0.5} />
  const slow = useRef<THREE.Group>(null)
  const cable = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (slow.current && fast.current?.[0]) slow.current.rotation.z = fast.current[0].rotation.z / 6
    if (cable.current) { const a = Math.abs(flow) > 0.01 ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2 * 0.5) : 0; cable.current.color.setRGB(1.0 * a + 0.12, 0.8 * a + 0.1, 0.25 * a + 0.05) }
  })
  return <group>
    {/* 底座：前面一块铸铁的主机架，后面两根焊接的纵梁托着发电机 */}
    <mesh position={[0, -1.55, 2.2]} castShadow receiveShadow><boxGeometry args={[2.4, 0.9, 4.2]} />{cast}</mesh>
    {[-0.75, 0.75].map(x => <mesh key={x} position={[x, -1.7, -3.6]} castShadow><boxGeometry args={[0.3, 0.5, 6]} /><meshPhysicalMaterial color="#5c6166" roughness={0.5} clearcoat={0.3} /></mesh>)}
    {/* 主轴承座 */}
    <RoundedBox args={[1.7, 1.9, 1.0]} radius={0.1} position={[0, -0.35, 3.4]} castShadow>{cast}</RoundedBox>
    <mesh position={[0, 0, 3.4]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.62, 0.62, 1.04, 32]} /><Metal kind="steel" grain="turned" /></mesh>
    {/* 主轴（低速轴）：跟叶轮一起转 */}
    <group ref={slow} position={[0, 0, 1.6]}>
      <mesh geometry={SHAFT} position={[0, 0, 0]} castShadow><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[0, 0.41, 2]}><boxGeometry args={[0.06, 0.04, 2.6]} /><meshStandardMaterial color="#c9a227" /></mesh>
    </group>
    <mesh geometry={SHRINK} position={[0, 0, 1.15]} castShadow><Metal kind="steel" grain="turned" rough={0.25} /></mesh>
    {/* 齿轮箱：行星级的圆壳加加强筋，两侧扭力臂压在弹性支座上 */}
    <group position={[0, 0, -0.45]}>
      <mesh geometry={GEARBOX} castShadow>{paint}</mesh>
      <mesh geometry={GB_RIBS}>{paint}</mesh>
      {[-1, 1].map(s => <group key={s} position={[s * 1.35, -0.25, 1.0]}>
        <RoundedBox args={[0.7, 0.5, 0.45]} radius={0.06} castShadow>{paint}</RoundedBox>
        <mesh position={[0, -0.45, 0]}><cylinderGeometry args={[0.2, 0.2, 0.4, 16]} /><meshStandardMaterial color="#1d1e1f" roughness={0.8} /></mesh>
      </group>)}
      {/* 平行级：齿轮箱后面偏上的一只方箱，高速轴从这里出来 */}
      <RoundedBox args={[1.6, 1.8, 0.8]} radius={0.08} position={[0, 0.25, -0.3]} castShadow>{paint}</RoundedBox>
    </group>
    {/* 高速轴：制动盘、卡钳、联轴器、发电机 */}
    <group position={[0, 0.55, -1.25]}>
      <group ref={g => { if (g) fast.current[0] = g }}>
        <mesh geometry={BRAKE} position={[0, 0, -0.1]} castShadow><Metal kind="steel" grain="turned" rough={0.22} /></mesh>
        {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 0.42, Math.sin(i * Math.PI / 3) * 0.42, -0.04]}><boxGeometry args={[0.05, 0.05, 0.03]} /><meshStandardMaterial color="#333" /></mesh>)}
        <mesh geometry={COUPLING} position={[0, 0, -0.98]} castShadow><Metal kind="steel" /></mesh>
      </group>
      <RoundedBox args={[0.3, 0.42, 0.24]} radius={0.04} position={[0, 0.58, -0.08]} castShadow><meshPhysicalMaterial color="#c43c2c" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      {/* 发电机 */}
      <group position={[0, 0, -3.75]}>
        <mesh geometry={GEN} castShadow>{genPaint}</mesh>
        <mesh geometry={GEN_FINS}>{genPaint}</mesh>
        <RoundedBox args={[0.8, 0.45, 0.7]} radius={0.05} position={[0, 0.98, 1.4]} castShadow>{genPaint}</RoundedBox>
        {[-1, 1].map(s => <mesh key={s} position={[s * 0.55, -0.82, 1.35]}><boxGeometry args={[0.3, 0.3, 2]} /><meshPhysicalMaterial color="#3f4245" roughness={0.6} /></mesh>)}
      </group>
      {/* 发电机接线盒引出的电缆：沿机舱地板往后走，下到塔筒里 */}
      <mesh position={[0.25, 1.35, -2.0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 1.2, 10]} /><meshBasicMaterial ref={cable} color="#222" toneMapped={false} /></mesh>
    </group>
    {/* 后部的控制柜 */}
    {[-1.35, -0.55].map(x => <RoundedBox key={x} args={[0.75, 1.9, 0.6]} radius={0.04} position={[x, -0.95 + 0.1, -5.6]} castShadow><meshPhysicalMaterial color="#c8ccce" roughness={0.45} clearcoat={0.3} /></RoundedBox>)}
  </group>
}
