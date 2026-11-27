// 观测站里不动的东西：展厅楼、广场上的圆锥模型和大画板、回音壁、天象厅、远处的冷却塔和山。
// 各自的原点和朝向由 world.tsx 摆；这里只管建模。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, mergeParts, Painted, shell, type Part, type RY } from '@/lab-kit'
import { ellipseWall, fuse, revolve, strut } from './geo'
import { makeCurtain, makePaving, makeSlate, makeStars, makeStone, makeWood, rep } from './mats'
import { CONE, TOWER, WALL, towerR } from './physics'

// ---------- 展厅楼 ----------
/** 一长排两层高的展厅：正面是深色玻璃幕墙，前面一排清水混凝土柱子托着挑出来的屋檐。原点在正面墙脚的中点，楼往 −z 方向伸 */
export function Hall({ w = 42, h = 7.2, d = 11 }: { w?: number; h?: number; d?: number }) {
  const glass = useMemo(() => rep(makeCurtain(), w / 3, h / 3), [w, h]), stone = useMemo(() => rep(makeStone([182, 178, 170], 5), w / 6, 2), [w])
  const cols = useMemo(() => {
    const parts: Part[] = []
    for (let x = -w / 2 + 1.5; x <= w / 2 - 1.4; x += 6.5) parts.push({ p: [x, h / 2 + 0.2, 1.3], s: [0.26, h, 0.26], c: '#a19e96', cyl: true })
    // 屋顶上的设备
    parts.push({ p: [-w / 4, h + 1.2, -d / 2], s: [3, 1.1, 2.2], c: '#9aa1a4' }, { p: [w / 5, h + 1.0, -d / 2 - 1], s: [1.6, 0.7, 1.6], c: '#8d9498' }, { p: [w / 5 + 3, h + 1.1, -d / 2 + 1], s: [0.5, 0.9, 0.5], c: '#b5babc', cyl: true })
    return mergeParts(parts)
  }, [w, h, d])
  return (
    <group>
      <mesh position={[0, 0.2, -d / 2 + 1]} receiveShadow castShadow><boxGeometry args={[w + 1.2, 0.4, d + 3.6]} /><meshStandardMaterial map={stone} roughness={0.9} /></mesh>
      <mesh position={[0, h / 2 + 0.4, -d / 2]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial map={stone} roughness={0.88} /></mesh>
      <mesh position={[0, h / 2 + 0.3, 0.02]}><planeGeometry args={[w - 1.2, h - 0.9]} /><meshStandardMaterial map={glass} roughness={0.22} metalness={0.55} envMapIntensity={0.7} /></mesh>
      {/* 入口：两扇玻璃门和门斗 */}
      <mesh position={[w / 2 - 9, 1.6, 0.5]} castShadow><boxGeometry args={[3.6, 2.9, 1.0]} /><meshStandardMaterial color="#20282d" roughness={0.3} metalness={0.6} /></mesh>
      <mesh position={[w / 2 - 9, 3.12, 0.6]} castShadow><boxGeometry args={[4.2, 0.16, 1.5]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh geometry={cols} castShadow receiveShadow><Painted rough={0.85} metal={0.02} /></mesh>
      <mesh position={[0, h + 0.62, -d / 2 + 0.9]} castShadow receiveShadow><boxGeometry args={[w + 1.6, 0.44, d + 3.2]} /><meshStandardMaterial map={stone} roughness={0.9} /></mesh>
    </group>
  )
}

// ---------- 圆锥模型 ----------
/** 两个对顶的亚克力圆锥，套在一根钢轴上，立在石座上。原点在圆锥的顶点；每一半高 CONE.H，母线和轴成 30° */
export function ConeModel() {
  const H = CONE.H, r = H * Math.tan(CONE.alpha * Math.PI / 180)
  const stone = useMemo(() => makeStone([150, 150, 148], 13), [])
  const g = useMemo(() => ({ base: disc(r + 0.06, 0.06, { chamfer: 0.012, segs: 64 }), neck: lathe([[0, 0], [0.26, 0], [0.26, 0.04], [0.11, 0.1], [0.09, 0.34], [0.2, 0.4], [0, 0.4]] as RY[], { segs: 48 }), cap: disc(r, 0.018, { chamfer: 0.004, segs: 64 }) }), [r])
  const acrylic = (o: number) => <meshPhysicalMaterial color="#bfe4ee" roughness={0.05} metalness={0} transparent opacity={o} side={THREE.DoubleSide} depthWrite={false} envMapIntensity={1.0} clearcoat={1} />
  const edge = <meshBasicMaterial color="#e8f8ff" transparent opacity={0.85} toneMapped={false} />
  return (
    <group>
      {/* 石座、车出来的钢底座 */}
      <RoundedBox args={[1.7, 0.6, 1.7]} radius={0.03} position={[0, -H - 0.46 - 0.3, 0]} castShadow receiveShadow><meshStandardMaterial map={stone} color="#b0aea8" roughness={0.85} /></RoundedBox>
      <mesh geometry={g.neck} position-y={-H - 0.46} castShadow><Metal kind="stainless" grain="turned" /></mesh>
      <mesh geometry={g.base} position-y={-H - 0.06} castShadow><Metal kind="stainless" grain="turned" /></mesh>
      {/* 钢轴：就是圆锥的轴 */}
      <mesh castShadow><cylinderGeometry args={[0.011, 0.011, H * 2 + 0.16, 12]} /><Metal kind="chrome" /></mesh>
      <mesh position-y={H + 0.1}><sphereGeometry args={[0.03, 16, 12]} /><Metal kind="chrome" /></mesh>
      {/* 下半个、上半个圆锥：外壁加一层稍小的内壁，看得出壁厚 */}
      {[-1, 1].map(s => <group key={s} rotation-x={s > 0 ? Math.PI : 0} position-y={s * H / 2}>
        <mesh renderOrder={3}><coneGeometry args={[r, H, 96, 1, true]} />{acrylic(0.17)}</mesh>
        <mesh renderOrder={3} scale={[0.975, 0.975, 0.975]} position-y={-0.012}><coneGeometry args={[r, H, 96, 1, true]} />{acrylic(0.08)}</mesh>
      </group>)}
      <mesh geometry={g.cap} position-y={H - 0.018} renderOrder={3}>{acrylic(0.22)}</mesh>
      {[-H, H].map(y => <mesh key={y} position-y={y} rotation-x={Math.PI / 2}><torusGeometry args={[r, 0.008, 8, 96]} />{edge}</mesh>)}
    </group>
  )
}

// ---------- 大画板 ----------
export const SLATE = { w: 3.6, h: 2.88, cell: 0.24 }
/** 大画板：深色磨砂板装在木框里，架在木画架上，底下一条放粉笔的托板。原点在板面中心，板面在 z = 0。ground：地面在局部坐标里的高度 */
export function Easel({ ground, back }: { ground: number; back: [number, number, number] }) {
  const { w, h } = SLATE, slate = useMemo(() => makeSlate(15, 12), []), wood = useMemo(() => makeWood(), []), dark = useMemo(() => makeWood([120, 84, 52]), [])
  const W = <meshStandardMaterial map={wood} roughness={0.7} />, D = <meshStandardMaterial map={dark} roughness={0.75} />
  const rear = useMemo(() => strut([0, h / 2 - 0.3, -0.16], back, 0.045, 10), [h, back])
  return (
    <group>
      <mesh position-z={-0.035} castShadow receiveShadow><boxGeometry args={[w, h, 0.06]} /><meshStandardMaterial color="#232b2a" roughness={0.9} /></mesh>
      <mesh position-z={0.0}><planeGeometry args={[w, h]} /><meshStandardMaterial map={slate} roughness={0.93} /></mesh>
      {[-1, 1].map(s => <mesh key={`h${s}`} position={[0, s * (h / 2 + 0.045), -0.01]} castShadow><boxGeometry args={[w + 0.18, 0.09, 0.1]} />{W}</mesh>)}
      {[-1, 1].map(s => <mesh key={`v${s}`} position={[s * (w / 2 + 0.045), 0, -0.01]} castShadow><boxGeometry args={[0.09, h, 0.1]} />{W}</mesh>)}
      {/* 托板 */}
      <mesh position={[0, -h / 2 - 0.1, 0.08]} castShadow><boxGeometry args={[w * 0.7, 0.03, 0.2]} />{D}</mesh>
      <mesh position={[0, -h / 2 - 0.075, 0.175]}><boxGeometry args={[w * 0.7, 0.05, 0.02]} />{D}</mesh>
      {/* 画架：两条前腿、一根横档、一条后撑 */}
      {[-1, 1].map(s => <mesh key={`l${s}`} position={[s * w * 0.3, (ground + h / 2 + 0.25) / 2, -0.11]} castShadow><boxGeometry args={[0.09, h / 2 + 0.25 - ground, 0.07]} />{D}</mesh>)}
      <mesh position={[0, -h / 2 - 0.45, -0.11]} castShadow><boxGeometry args={[w * 0.6 + 0.3, 0.07, 0.05]} />{D}</mesh>
      <mesh geometry={rear} castShadow>{D}</mesh>
    </group>
  )
}

// ---------- 回音壁 ----------
/** 椭圆形的一圈矮石墙，朝镜头留一个口子；地上嵌着两块铜牌，正在两个焦点上。原点在椭圆中心的地面上，长轴沿 x */
export function EchoWall() {
  const { a, b, c } = WALL
  const g = useMemo(() => ({ wall: ellipseWall(a + 0.18, b + 0.18, 0.36, 1.2, [-1.82, -1.32]), cope: ellipseWall(a + 0.18, b + 0.18, 0.46, 0.08, [-1.82, -1.32]), mark: disc(0.3, 0.03, { chamfer: 0.006 }), post: lathe([[0, 0], [0.11, 0], [0.11, 0.03], [0.035, 0.06], [0.03, 1.26], [0.05, 1.3], [0, 1.3]] as RY[], { segs: 24 }) }), [a, b])
  const floor = useMemo(() => rep(makePaving(64, [112, 106, 98]), 5, 4), []), stone = useMemo(() => rep(makePaving(128, [186, 178, 162]), 12, 1), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.032} scale={[a, b, 1]} receiveShadow><circleGeometry args={[1, 96]} /><meshStandardMaterial map={floor} roughness={0.85} /></mesh>
      <mesh geometry={g.wall} castShadow receiveShadow><meshStandardMaterial map={stone} color="#cfc8b8" roughness={0.92} /></mesh>
      <mesh geometry={g.cope} position-y={1.2} castShadow><meshStandardMaterial color="#d6d0c2" roughness={0.8} /></mesh>
      {[-c, c].map(x => <group key={x} position={[x, 0.034, 0]}>
        <mesh geometry={g.mark} receiveShadow><Metal kind="brass" grain="turned" /></mesh>
        <mesh geometry={g.post} castShadow><Metal kind="stainless" grain="brushed" /></mesh>
      </group>)}
    </group>
  )
}

// ---------- 天象厅 ----------
export const DOME = { R: 7, wall: 3.4, t: 0.32 }
/** 天象厅：一圈清水混凝土的鼓座托着金属穹顶。open 为真时朝镜头的一半拿掉，看得见里面的星空和地面。原点在地面的圆心 */
export function Planetarium({ open }: { open: boolean }) {
  const { R, wall, t } = DOME
  const g = useMemo(() => {
    const arc = (r: number, n = 20): RY[] => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI / 2; return [r * Math.cos(a), wall + r * Math.sin(a)] as RY })
    const drum: RY[] = [[R + 0.12, 0], [R + 0.12, wall], [R - t, wall], [R - t, 0]]
    const dome: RY[] = [...arc(R), ...arc(R - t).reverse()]
    const ribs = (half: boolean) => fuse(Array.from({ length: 24 }, (_, i) => i).filter(i => !half || Math.sin((i + 0.5) / 24 * Math.PI * 2) > 0).map(i => new THREE.TorusGeometry(R + 0.02, 0.045, 6, 20, Math.PI / 2).rotateY((i + 0.5) / 24 * Math.PI * 2).translate(0, wall, 0)))
    return {
      drum: revolve(drum, 0, Math.PI * 2, 96), drumHalf: revolve(drum, 0, Math.PI, 48), dome: revolve(dome, 0, Math.PI * 2, 96, 0.5), domeHalf: revolve(dome, 0, Math.PI, 48, 0.5),
      ribs: ribs(false), ribsHalf: ribs(true), ring: disc(R + 0.3, 0.3, { hole: R - t, chamfer: 0.05, segs: 96 }),
    }
  }, [R, wall, t])
  const stone = useMemo(() => rep(makeStone([186, 182, 174], 21), 10, 1), []), stars = useMemo(() => makeStars(), [])
  return (
    <group>
      <mesh geometry={open ? g.drumHalf : g.drum} castShadow receiveShadow><meshStandardMaterial map={stone} roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={open ? g.domeHalf : g.dome} castShadow><meshStandardMaterial color="#aeb6ba" roughness={0.42} metalness={0.75} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={open ? g.ribsHalf : g.ribs}><Metal kind="zinc" grain="brushed" /></mesh>
      {!open && <mesh geometry={g.ring} position-y={wall - 0.15} castShadow><meshStandardMaterial map={stone} roughness={0.85} /></mesh>}
      {/* 门斗 */}
      <mesh position={[-R - 1.2, 1.5, -4.5]} castShadow receiveShadow><boxGeometry args={[3.6, 3, 4]} /><meshStandardMaterial map={stone} roughness={0.9} /></mesh>
      <mesh position={[-R - 1.2, 1.3, -2.48]}><planeGeometry args={[1.8, 2.3]} /><meshStandardMaterial color="#1d262c" roughness={0.3} metalness={0.6} /></mesh>
      {/* 里面：星空穹顶、深色的墙和地面 */}
      {open && <group>
        <mesh position-y={wall} rotation-y={Math.PI}><sphereGeometry args={[R - t - 0.02, 64, 32, 0, Math.PI, 0, Math.PI / 2]} /><meshBasicMaterial map={stars} side={THREE.BackSide} toneMapped={false} color="#c8d0e8" /></mesh>
        <mesh position-y={wall / 2}><cylinderGeometry args={[R - t - 0.02, R - t - 0.02, wall, 64, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#141a26" roughness={0.9} side={THREE.BackSide} /></mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow><circleGeometry args={[R - t, 64]} /><meshStandardMaterial color="#1b2230" roughness={0.95} /></mesh>
      </group>}
    </group>
  )
}

// ---------- 远处：冷却塔、山 ----------
/** 双曲线形的冷却塔：薄壳、底下一圈人字柱、水池。原点在地面的圆心 */
export function CoolingTower({ steam = true }: { steam?: boolean }) {
  const g = useMemo(() => {
    const prof: RY[] = Array.from({ length: 41 }, (_, i) => { const y = TOWER.foot + (TOWER.top - TOWER.foot) * i / 40; return [towerR(y), y] as RY })
    const rf = towerR(TOWER.foot) - 0.5, legs: THREE.BufferGeometry[] = []
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, d = Math.PI / 36; for (const s of [-1, 1]) legs.push(strut([(rf + 2.2) * Math.cos(a), 0.5, (rf + 2.2) * Math.sin(a)], [rf * Math.cos(a + s * d), TOWER.foot + 0.6, rf * Math.sin(a + s * d)], 0.45, 6)) }
    return { shell: shell(prof, 0.9, { segs: 72, crease: 50 }), legs: fuse(legs), basin: disc(towerR(0) + 4, 1.2, { hole: towerR(0) - 6, chamfer: 0.2, segs: 72 }), rim: disc(towerR(TOWER.top) + 0.5, 1.0, { hole: towerR(TOWER.top) - 1.2, chamfer: 0.15, segs: 72 }) }
  }, [])
  const tex = useMemo(() => rep(makeStone([188, 186, 180], 33), 12, 6), [])
  return (
    <group>
      <mesh geometry={g.shell} castShadow><meshStandardMaterial map={tex} roughness={0.92} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={g.legs}><meshStandardMaterial color="#a9a7a0" roughness={0.9} /></mesh>
      <mesh geometry={g.basin}><meshStandardMaterial color="#9c9a93" roughness={0.9} /></mesh>
      <mesh geometry={g.rim} position-y={TOWER.top - 0.5}><meshStandardMaterial color="#c4c2bb" roughness={0.9} /></mesh>
      {steam && [[0, 8, 22], [6, 24, 27], [15, 42, 31], [28, 60, 34], [44, 76, 36]].map(([x, y, r], i) => <mesh key={i} position={[x, TOWER.top + y, -x * 0.3]} scale={[1, 0.8, 1]}><sphereGeometry args={[r, 20, 14]} /><meshStandardMaterial color="#f4f6f7" roughness={1} transparent opacity={0.5 - i * 0.07} depthWrite={false} /></mesh>)}
    </group>
  )
}

/** 远山：围着观测站的一圈山脊，颜色发蓝，雾里只剩轮廓 */
export function Mountains() {
  const geo = useMemo(() => {
    const N = 180, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color()
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, h = 70 + 46 * Math.sin(a * 3 + 1) + 30 * Math.sin(a * 7 + 2.2) + 16 * Math.sin(a * 17 + 0.4) + 9 * Math.sin(a * 31)
      for (const [r, y, k] of [[640, -2, 0.0], [760, Math.max(18, h * 0.55), 0.5], [860, Math.max(30, h), 1], [1000, -2, 0.6]] as const) { pos.push(r * Math.cos(a), y, r * Math.sin(a)); c.set('#5d6b55').lerp(new THREE.Color('#8a94a0'), k); col.push(c.r, c.g, c.b) }
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const p = i * 4 + k, q = p + 4; idx.push(p, p + 1, q + 1, p, q + 1, q) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
    return g
  }, [])
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={1} side={THREE.DoubleSide} flatShading /></mesh>
}

/** 天线旁边的小机房（门窗、雨篷、空调外机、配电箱、通向天线的电缆桥架）和路灯，给场景一点人的尺度 */
export function Annex() {
  const g = useMemo(() => {
    const wall = '#8f8d85', frame = '#d9dcdc', glass = '#1f2c35', steel = '#7c858a', parts: Part[] = [
      // 墙体、勒脚、挑出的平屋顶和女儿墙
      { p: [0, 1.55, 0], s: [5.2, 2.9, 3.6], c: wall }, { p: [0, 0.12, 0], s: [5.3, 0.24, 3.7], c: '#6c6a64' }, { p: [0, 3.08, 0.1], s: [5.7, 0.16, 4.2], c: '#5f6669' }, { p: [0, 3.24, 0.1], s: [5.5, 0.16, 4.0], c: '#737a7d' },
      // 门：门框、门扇、把手、门前的台阶和雨篷
      { p: [-1.5, 1.2, 1.81], s: [1.06, 2.16, 0.06], c: frame }, { p: [-1.5, 1.18, 1.83], s: [0.92, 2.04, 0.05], c: '#35505f' }, { p: [-1.16, 1.15, 1.87], s: [0.04, 0.2, 0.04], c: '#d8d8d2' },
      { p: [-1.5, 0.09, 2.2], s: [1.5, 0.18, 0.8], c: '#9b9992' }, { p: [-1.5, 2.42, 2.15], s: [1.5, 0.06, 0.7], c: steel },
      // 两扇窗：窗框、玻璃、中梃、窗台
      ...[0.6, 1.9].flatMap((x): Part[] => [{ p: [x, 1.75, 1.81], s: [1.0, 1.1, 0.06], c: frame }, { p: [x, 1.75, 1.83], s: [0.88, 0.98, 0.05], c: glass }, { p: [x, 1.75, 1.86], s: [0.04, 0.98, 0.03], c: frame }, { p: [x, 1.17, 1.88], s: [1.1, 0.05, 0.14], c: frame }]),
      // 侧墙上的空调外机（支架、机身、出风格栅）和配电箱
      { p: [2.9, 1.0, 0.6], s: [0.5, 0.05, 0.9], c: steel }, { p: [2.92, 1.35, 0.6], s: [0.44, 0.64, 0.86], c: '#d5d8d6' }, { p: [3.15, 1.35, 0.6], s: [0.02, 0.5, 0.5], c: '#4a5358' },
      { p: [2.66, 1.5, -0.9], s: [0.14, 0.8, 0.6], c: '#a7adaf' },
      // 屋顶上的通风帽和避雷针
      { p: [-1.6, 3.5, -0.6], s: [0.22, 0.4, 0.22], c: steel, cyl: true }, { p: [1.9, 3.9, -1.2], s: [0.02, 1.3, 0.02], c: steel, cyl: true },
    ]
    // 电缆桥架：从侧墙出来，沿地面上方的支架一路通向天线基座（局部 +x 方向）
    parts.push({ p: [7.7, 0.62, -0.9], s: [10.2, 0.05, 0.36], c: '#9aa3a6' }, { p: [7.7, 0.7, -1.07], s: [10.2, 0.12, 0.03], c: '#868f93' }, { p: [7.7, 0.7, -0.73], s: [10.2, 0.12, 0.03], c: '#868f93' }, { p: [7.7, 0.68, -0.9], s: [10.2, 0.06, 0.2], c: '#22282c' })
    for (let x = 3.4; x <= 12.6; x += 1.5) parts.push({ p: [x, 0.3, -0.9], s: [0.06, 0.6, 0.06], c: steel }, { p: [x, 0.03, -0.9], s: [0.3, 0.06, 0.3], c: '#6c6a64' })
    return mergeParts(parts)
  }, [])
  return <mesh geometry={g} castShadow receiveShadow><Painted rough={0.8} metal={0.08} /></mesh>
}
export function Lamp() {
  const g = useMemo(() => fuse([strut([0, 0, 0], [0, 4.2, 0], 0.05, 10), strut([0, 4.2, 0], [0.7, 4.35, 0], 0.035, 8), new THREE.BoxGeometry(0.5, 0.06, 0.18).translate(0.85, 4.33, 0), new THREE.CylinderGeometry(0.11, 0.13, 0.25, 12).translate(0, 0.125, 0)]), [])
  return <mesh geometry={g} castShadow><meshStandardMaterial color="#3d464b" roughness={0.5} metalness={0.6} /></mesh>
}
