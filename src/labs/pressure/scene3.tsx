// 压强 · 第 3 课的三维场景：水库岸边。岸上的小吊臂吊着一只压力探头，可以放进水库，也可以转过去放进旁边的泥浆井。
// 水和岸都朝镜头剖开，水上水下一起看。舞台（镜头、标签、画质分档）沿用 float/dock.tsx 的 DockStage。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { DIRS, PLACES, SITE3, kPa, maxDrop3, type DirKey, type Lesson3Result, type PlaceKey } from './physics'
import { Led, Rod, useConcrete, useLiftDrag, useRipple, type Label } from '../float/dock'
import { LabStage } from './stage'
import { makeCaustics, makeRuler, useFaceGradient, useSlide } from './world'

const WY = -0.8, BED = WY - SITE3.depth                 // 水面、水底的高度（岸顶是 0）
const PZ = -1.5                                         // 探头所在的那条线，在剖面后面 1.5 m
const POST_X = 0.1, ARM = 2.3, ARM_Y = 2.7              // 吊臂：立柱位置、臂长、臂高
const WALL0 = -0.7, WALL1 = 0.9, WELL1 = 3.9, WELL_BACK = -3.2   // 挡墙和泥浆井的边界
const ANGLE: Record<PlaceKey, number> = { water: Math.PI, mud: 0 }
const R = 0.58                                          // 探头半径
const P_FULL = 70000                                    // 橡皮膜凹到最深对应的压强
const TARGET = new THREE.Vector3(0.5, -2.1, PZ)
const SPAN: [number, number] = [10.6, 10.2]
const VIEW: [number, number] = [0.15, 0.13]

const tipOf = (a: number): [number, number] => [POST_X + ARM * Math.cos(a), PZ + ARM * Math.sin(a)]

/** 水库这一侧归这一课的东西：水底晃动的光斑、探头后面的一根水尺。水体本身在 hydro.tsx */
function Reservoir() {
  const ruler = useMemo(() => makeRuler(SITE3.depth), [])
  const ca = useMemo(() => { const a = makeCaustics(), b = a.clone(); a.repeat.set(5, 2.2); b.repeat.set(3.6, 1.6); b.needsUpdate = true; return [a, b] }, [])
  useFrame((_, dt) => { ca[0].offset.x += dt * 0.02; ca[0].offset.y += dt * 0.013; ca[1].offset.x -= dt * 0.016; ca[1].offset.y += dt * 0.02 })
  return (
    <group>
      {ca.map((t, i) => <mesh key={i} position={[-12.7, BED + 0.03 + i * 0.01, -6]} rotation-x={-Math.PI / 2}><planeGeometry args={[24, 12]} /><meshBasicMaterial map={t} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>)}
      <mesh position={[-3.75, (BED + 0.9) / 2, PZ - 0.62]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.9 - BED, 12]} /><meshStandardMaterial color="#59626b" metalness={0.6} roughness={0.5} /></mesh>
      <mesh position={[-3.75, (BED + WY) / 2, PZ - 0.5]}><planeGeometry args={[0.34, SITE3.depth]} /><meshBasicMaterial map={ruler} toneMapped={false} /></mesh>
    </group>
  )
}

/** 挡墙和泥浆井：墙是混凝土的；井里装着泥浆，后壁上也有一把水尺 */
function WallAndWell() {
  const [d, n, r] = useConcrete(0.6, 2.4)
  const face = useFaceGradient('176,132,78', 0.5)
  const ruler = useMemo(() => makeRuler(SITE3.depth), [])
  const ripple = useRipple(1.4, 0.008)
  const conc = <meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#b4b1a6" envMapIntensity={0.5} />
  const dark = <meshStandardMaterial color="#3a332b" roughness={0.95} />
  const ww = WELL1 - WALL1, wx = (WALL1 + WELL1) / 2, wd = -WELL_BACK, H = SITE3.depth
  return (
    <group>
      {/* 挡墙：顶上压一圈帽石，朝水的一面泡在水里的部分发暗 */}
      <mesh position={[(WALL0 + WALL1) / 2, BED / 2, -150]} castShadow receiveShadow><boxGeometry args={[WALL1 - WALL0, -BED, 300]} />{conc}</mesh>
      <RoundedBox args={[WALL1 - WALL0 + 0.16, 0.16, 300]} radius={0.04} smoothness={3} position={[(WALL0 + WALL1) / 2, 0.06, -150.06]} receiveShadow><meshStandardMaterial color="#c2bfb4" roughness={0.85} /></RoundedBox>
      <mesh position={[WALL0 - 0.008, (BED + WY) / 2, -150]} rotation-y={-Math.PI / 2}><planeGeometry args={[300, H]} /><meshStandardMaterial color="#21474f" roughness={0.9} /></mesh>
      {/* 泥浆井：三面井壁、井底 */}
      <mesh position={[wx, BED / 2, WELL_BACK]}><planeGeometry args={[ww, -BED]} />{dark}</mesh>
      <mesh position={[WALL1 + 0.008, BED / 2, WELL_BACK / 2]} rotation-y={Math.PI / 2}><planeGeometry args={[wd, -BED]} />{dark}</mesh>
      <mesh position={[WELL1 - 0.008, BED / 2, WELL_BACK / 2]} rotation-y={-Math.PI / 2}><planeGeometry args={[wd, -BED]} />{dark}</mesh>
      <mesh position={[wx, BED + 0.01, WELL_BACK / 2]} rotation-x={-Math.PI / 2}><planeGeometry args={[ww, wd]} /><meshStandardMaterial color="#2c241b" roughness={1} /></mesh>
      {/* 井口的一圈钢边 */}
      {[[wx, WELL_BACK - 0.08, ww + 0.32, 0.16], [WALL1 + 0.0, WELL_BACK / 2, 0.16, wd], [WELL1 + 0.08, WELL_BACK / 2, 0.16, wd]].map(([x, z, sx, sz], i) => <RoundedBox key={i} args={[sx, 0.22, sz]} radius={0.03} position={[x, 0.11, z]} castShadow><meshStandardMaterial color="#59626b" metalness={0.7} roughness={0.45} /></RoundedBox>)}
      {/* 泥浆 */}
      <mesh position={[wx, (BED + WY) / 2, WELL_BACK / 2]} renderOrder={2}><boxGeometry args={[ww - 0.02, H, wd - 0.02]} /><meshBasicMaterial color="#5a4024" transparent opacity={0.74} depthWrite={false} /></mesh>
      <mesh position={[wx, (BED + WY) / 2, 0.006]} renderOrder={4}><planeGeometry args={[ww, H]} /><meshBasicMaterial map={face} transparent depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[wx, WY + 0.004, WELL_BACK / 2]} rotation-x={-Math.PI / 2} renderOrder={3}><planeGeometry args={[ww - 0.02, wd - 0.02]} /><meshPhysicalMaterial color="#8a6a40" transparent opacity={0.85} roughness={0.3} envMapIntensity={0.9} normalMap={ripple} normalScale={new THREE.Vector2(0.15, 0.15)} depthWrite={false} /></mesh>
      <mesh position={[WELL1 - 0.45, (BED + WY) / 2, WELL_BACK + 0.02]}><planeGeometry args={[0.34, H]} /><meshBasicMaterial map={ruler} toneMapped={false} /></mesh>
    </group>
  )
}

// ---------- 器材 ----------
/** 岸上的小吊臂：底座、立柱、能转的臂、斜撑、卷扬机，立柱上挂着读数箱 */
function Davit({ angle, reading }: { angle: number; reading: string }) {
  const steel = <meshStandardMaterial color="#d9a514" metalness={0.35} roughness={0.5} />
  const dark = <meshStandardMaterial color="#343a40" metalness={0.7} roughness={0.42} />
  return (
    <group position={[POST_X, 0, PZ]}>
      <mesh position={[0, 0.19, 0]} castShadow><cylinderGeometry args={[0.34, 0.38, 0.1, 32]} />{dark}</mesh>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 4) * 0.29, 0.26, Math.sin(i * Math.PI / 4) * 0.29]}><cylinderGeometry args={[0.028, 0.028, 0.05, 6]} />{dark}</mesh>)}
      <mesh position={[0, ARM_Y / 2 + 0.1, 0]} castShadow><cylinderGeometry args={[0.1, 0.12, ARM_Y - 0.1, 24]} />{steel}</mesh>
      {[0.5, 0.62].map((y, i) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.125, 0.125, 0.09, 24]} /><meshStandardMaterial color={i ? '#22262a' : '#d9a514'} roughness={0.6} /></mesh>)}
      {/* 读数箱：朝镜头 */}
      <RoundedBox args={[0.74, 0.5, 0.2]} radius={0.04} smoothness={3} position={[0, 1.25, 0.2]} castShadow><meshStandardMaterial color="#e6e9ec" roughness={0.5} metalness={0.2} /></RoundedBox>
      <Led text={reading} w={0.6} h={0.24} position={[0, 1.3, 0.305]} />
      <mesh position={[-0.22, 1.09, 0.305]}><circleGeometry args={[0.03, 16]} /><meshBasicMaterial color="#35c7b3" toneMapped={false} /></mesh>
      {/* 转臂 */}
      <group rotation-y={-angle} position={[0, ARM_Y, 0]}>
        <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.34, 24]} />{dark}</mesh>
        <RoundedBox args={[ARM + 0.5, 0.2, 0.16]} radius={0.035} smoothness={3} position={[ARM / 2 - 0.05, 0.1, 0]} castShadow>{steel}</RoundedBox>
        <RoundedBox args={[0.5, 0.36, 0.34]} radius={0.04} position={[-0.42, 0.14, 0]} castShadow>{dark}</RoundedBox>
        <mesh position={[-0.42, 0.14, 0.2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.13, 0.13, 0.08, 24]} /><meshStandardMaterial color="#8d949c" metalness={0.8} roughness={0.35} /></mesh>
        <Rod from={[0.05, -0.75, 0]} to={[ARM * 0.6, 0.02, 0]} r={0.035}>{steel}</Rod>
        {/* 臂端的滑轮 */}
        <mesh position={[ARM, 0.02, 0]} rotation-x={0}><torusGeometry args={[0.12, 0.035, 12, 28]} />{dark}</mesh>
        <mesh position={[ARM, 0.02, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.2, 12]} />{dark}</mesh>
      </group>
    </group>
  )
}

/** 压力探头：不锈钢壳，一面蒙着橙色橡皮膜（受压会往里凹），外圈一圈螺栓；挂在一只叉架上，可以绕横轴转方向 */
function Probe({ dir, p }: { dir: DirKey; p: number }) {
  const body = useRef<THREE.Group>(null)
  const goal = dir === 'up' ? 0 : dir === 'side' ? Math.PI / 2 : Math.PI
  useFrame((_, dt) => { if (body.current) body.current.rotation.z += (goal - body.current.rotation.z) * Math.min(1, dt * 9) })
  const H = 0.46                                          // 壳体的厚度
  const dent = 0.012 + 0.26 * Math.min(1, p / P_FULL)
  const film = useMemo(() => {
    const d = Math.round(dent * 200) / 200, pts: THREE.Vector2[] = []
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(t * (R - 0.07), -d * Math.pow(Math.cos(t * Math.PI / 2), 1.5))) }
    return new THREE.LatheGeometry(pts, 48)
  }, [dent])
  useEffect(() => () => film.dispose(), [film])
  const ss = <meshStandardMaterial color="#c9d0d6" metalness={0.92} roughness={0.28} envMapIntensity={1.3} />
  const dark = <meshStandardMaterial color="#30353b" metalness={0.75} roughness={0.42} />
  return (
    <group>
      {/* 叉架：两条腿夹住探头的转轴，顶上一道横梁和吊环 */}
      {[-1, 1].map(s => <group key={s}>
        <RoundedBox args={[0.08, 1.04, 0.06]} radius={0.018} position={[0, 0.45, s * (R + 0.09)]} castShadow>{dark}</RoundedBox>
        <mesh position={[0, 0, s * (R + 0.06)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.055, 0.055, 0.14, 16]} />{ss}</mesh>
      </group>)}
      <RoundedBox args={[0.09, 0.07, 2 * R + 0.24]} radius={0.02} position={[0, 0.98, 0]} castShadow>{dark}</RoundedBox>
      <mesh position={[0, 1.08, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.06, 0.018, 10, 24]} />{dark}</mesh>
      <group ref={body}>
        {/* 壳体是透明的：从侧面能直接看到橡皮膜凹进去多少。背板和法兰是不锈钢 */}
        <mesh position={[0, -H / 2, 0]} renderOrder={5}><cylinderGeometry args={[R - 0.01, R - 0.01, H, 48, 1, true]} /><meshPhysicalMaterial color="#dff3fb" transparent opacity={0.22} roughness={0.05} envMapIntensity={1.5} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, -H - 0.03, 0]} castShadow><cylinderGeometry args={[R, R, 0.06, 48]} />{ss}</mesh>
        <mesh position={[0, -H - 0.06, 0]} scale={[1, 0.3, 1]} rotation-x={Math.PI} castShadow><sphereGeometry args={[R * 0.8, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{ss}</mesh>
        <mesh position={[0, -H - 0.2, 0]}><cylinderGeometry args={[0.06, 0.08, 0.1, 16]} />{dark}</mesh>
        {/* 四根拉杆把法兰和背板连起来 */}
        {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 2 + 0.785) * (R - 0.045), -H / 2, Math.sin(i * Math.PI / 2 + 0.785) * (R - 0.045)]}><cylinderGeometry args={[0.014, 0.014, H, 8]} />{ss}</mesh>)}
        {/* 法兰圈和螺栓 */}
        <mesh position={[0, 0, 0]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[R - 0.03, 0.04, 14, 56]} />{dark}</mesh>
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 6) * (R - 0.03), 0.04, Math.sin(i * Math.PI / 6) * (R - 0.03)]}><cylinderGeometry args={[0.022, 0.022, 0.03, 6]} />{ss}</mesh>)}
        {/* 橡皮膜 */}
        <mesh geometry={film} position={[0, 0.005, 0]}><meshStandardMaterial color="#f5832a" roughness={0.5} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  )
}

/** 探头穿过液面时溅起的水珠 */
function Splash({ at, fire, color }: { at: [number, number]; fire: number; color: string }) {
  const N = 20, ref = useRef<THREE.InstancedMesh>(null)
  const parts = useRef(Array.from({ length: N }, () => ({ p: new THREE.Vector3(0, -99, 0), v: new THREE.Vector3(), life: 0 })))
  const m = useMemo(() => new THREE.Matrix4(), [])
  useEffect(() => {
    if (!fire) return
    parts.current.forEach((q, i) => { const a = i / N * Math.PI * 2 + i, sp = 0.9 + (i * 7 % 5) * 0.28; q.p.set(at[0] + Math.cos(a) * 0.36, WY + 0.02, at[1] + Math.sin(a) * 0.36); q.v.set(Math.cos(a) * sp, 2.1 + (i * 3 % 4) * 0.5, Math.sin(a) * sp); q.life = 1 })
  }, [fire])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    if (!ref.current) return
    parts.current.forEach((q, i) => {
      if (q.life > 0) { q.v.y -= 9.8 * dt; q.p.addScaledVector(q.v, dt); if (q.p.y < WY - 0.05) q.life = 0 }
      const s = q.life > 0 ? 1 : 0
      m.makeScale(s, s, s).setPosition(q.p); ref.current!.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}><sphereGeometry args={[0.05, 8, 6]} /><meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} /></instancedMesh>
}

/** 探头在液体里移动时冒出的一串气泡 */
function Bubbles({ x, z, y, on }: { x: number; z: number; y: number; on: boolean }) {
  const N = 9, ref = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), []), k = useRef(0)
  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    k.current += ((on ? 1 : 0) - k.current) * Math.min(1, dt * 3)
    for (let i = 0; i < N; i++) {
      const t = (clock.elapsedTime * 0.7 + i / N) % 1, yy = y + 0.3 + t * 2.2, s = yy < WY - 0.05 ? k.current * (0.5 + (i % 3) * 0.3) * (1 - t * 0.4) : 0
      m.makeScale(s, s, s).setPosition(x + Math.sin(i * 2.4 + t * 5) * 0.14, yy, z + Math.cos(i * 1.7 + t * 4) * 0.14); ref.current.setMatrixAt(i, m)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}><sphereGeometry args={[0.04, 10, 8]} /><meshBasicMaterial color="#dff6ff" transparent opacity={0.55} depthWrite={false} toneMapped={false} /></instancedMesh>
}

interface SceneProps {
  r: Lesson3Result; place: PlaceKey; dir: DirKey; drop: number; moving: boolean
  onDrop: (v: number) => void; onTurn: () => void; dragHint?: boolean; turnHint?: boolean
}

function Apparatus({ r, place, dir, drop, moving, onDrop, onTurn, angle }: SceneProps & { angle: number }) {
  const [tx, tz] = tipOf(angle), y = WY + SITE3.gap - drop
  const grab = useLiftDrag(drop, maxDrop3, onDrop, TARGET)
  const down = useRef<[number, number]>([0, 0])
  const hand = {
    ...grab,
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { down.current = [e.nativeEvent.clientX, e.nativeEvent.clientY]; grab.onPointerDown(e) },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => { grab.onPointerUp(e); if (Math.hypot(e.nativeEvent.clientX - down.current[0], e.nativeEvent.clientY - down.current[1]) < 6) onTurn() },
  }
  // 穿过液面的那一刻溅一次水
  const [fire, setFire] = useState(0), wasIn = useRef(false)
  const dipped = y - R * 0.5 < WY
  useEffect(() => { if (dipped !== wasIn.current) { wasIn.current = dipped; setFire(n => n + 1) } }, [dipped])
  const cable = <meshStandardMaterial color="#22262a" roughness={0.5} metalness={0.6} />
  return (
    <group>
      <Reservoir />
      <WallAndWell />
      <Davit angle={angle} reading={kPa(r.p)} />
      <Rod from={[tx, y + 1.12, tz]} to={[tx, ARM_Y - 0.08, tz]} r={0.018}>{cable}</Rod>
      <group position={[tx, y, tz]} {...hand}>
        <Probe dir={dir} p={r.p} />
        <mesh position={[0, 0.25, 0]} visible={false}><boxGeometry args={[1.7, 1.9, 1.6]} /></mesh>
      </group>
      <Splash at={[tx, tz]} fire={fire} color={place === 'mud' ? '#a5825a' : '#e6f6fb'} />
      <Bubbles x={tx} z={tz} y={y} on={moving && r.h > 0.3} />
    </group>
  )
}

export default function Scene3(props: SceneProps) {
  const { r, place, dir } = props
  const angle = useSlide(ANGLE[place], 1.7)
  const [tx, tz] = tipOf(angle), y = WY + SITE3.gap - props.drop
  const swinging = Math.abs(angle - ANGLE[place]) > 0.01
  const rulerX = place === 'water' ? -3.75 : WELL1 - 0.45, rulerZ = place === 'water' ? PZ - 0.5 : WELL_BACK
  const labels: Label[] = [
    { id: 'p', at: [tx + (place === 'mud' ? -R - 0.25 : R + 0.25), y, tz], ax: place === 'mud' ? 1 : 0, className: 'scene-tag key -translate-y-1/2', children: <><small>压强</small>{kPa(r.p)} kPa</> },
    { id: 'h', at: [rulerX - (place === 'water' ? 0.3 : -0.3), Math.min(y, WY), rulerZ], ax: place === 'water' ? 1 : 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: r.h > 0.005 && !swinging ? 1 : 0 }, children: <><small>深度</small>{r.h.toFixed(2)} m</> },
    { id: 'dir', at: [tx, y - R - 0.45, tz], ax: 0.5, className: 'scene-name', style: { opacity: props.turnHint ? 0 : 1 }, children: `橡皮膜${DIRS[dir]}` },
    { id: 'turn', at: [tx, y - R - 0.4, tz], ax: 0.5, className: '', style: { display: props.turnHint ? undefined : 'none' }, children: <div className="drag-hint" style={{ animation: 'none', transform: 'none' }}>点一下探头，换个朝向</div> },
    { id: 'nWater', at: [-2.9, BED + 0.5, 0], ax: 0.5, name: true, className: 'scene-name', children: `水库 · 水深 ${SITE3.depth} m` },
    { id: 'nMud', at: [(WALL1 + WELL1) / 2, BED + 0.5, 0], ax: 0.5, name: true, className: 'scene-name', children: '泥浆井 · 密度是水的 1.2 倍' },
    { id: 'nBox', at: [POST_X + 0.5, 1.25, PZ + 0.3], name: true, className: 'scene-name -translate-y-1/2', children: '读数箱' },
    { id: 'nProbe', at: [tx - R - 0.2, y + 0.95, tz], ax: place === 'mud' ? 0 : 1, style: place === 'mud' ? { display: 'none' } : undefined, name: true, className: 'scene-name -translate-y-1/2', children: '压力探头' },
    { id: 'drag', at: [tx - R - 0.2, y + 0.1, tz], ax: 1, className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint" style={{ transform: 'none' }}>↕ 抓住往下拖</div> },
  ]
  return <LabStage labels={labels} target={TARGET} span={SPAN} view={VIEW}><Apparatus {...props} angle={angle} /></LabStage>
}
