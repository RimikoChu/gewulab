// 第 7 课的三维场景：船厂上空的系留热气球；码头上一只量筒里的密度计。
// 码头环境在 dock.tsx。气球的高度由 lesson7 里的运动计算驱动。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BALLOON, LIQUIDS3, METER, kN, stemIn, type Lesson7Result, type Liquid3Key } from './physics'
import { DockStage, ForceArrow, Rod, type Label } from './dock'

const BX = 4, BZ = 12                                  // 气球的位置（码头空地上）
const T_BALLOON = new THREE.Vector3(BX, 15, BZ), S_BALLOON: [number, number] = [46, 42], V_BALLOON: [number, number] = [1.85, 0.06]
const MX = -3, MZ = 7, BENCH = 0.9                      // 密度计放在一张工作台上
const T_METER = new THREE.Vector3(MX, BENCH + 0.36, MZ), S_METER: [number, number] = [0.8, 0.8], V_METER: [number, number] = [0.5, 0.1]
const GORES = ['#12a594', '#f3f1ea', '#ffcf5c', '#f3f1ea']

/** 球囊：一条轮廓线绕一圈，八片颜色相间 */
function Envelope({ glow }: { glow: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = []
    for (let i = 0; i <= 28; i++) { const k = i / 28, a = k * Math.PI; pts.push(new THREE.Vector2(Math.max(0.9, Math.pow(Math.sin(a), 0.72) * 8.4 * (0.62 + 0.38 * k)), 1.6 + k * 16.4)) }
    const g = new THREE.LatheGeometry(pts, 32), n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color()
    for (let i = 0; i < n; i++) { const seg = Math.floor(Math.floor(i / 29) / 2) % GORES.length; c.set(GORES[seg]); col.set([c.r, c.g, c.b], i * 3) }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals()
    return g
  }, [])
  return <mesh geometry={geo} castShadow><meshStandardMaterial vertexColors roughness={0.75} side={THREE.DoubleSide} emissive="#ff8a3c" emissiveIntensity={glow * 0.16} /></mesh>
}

function Balloon({ alt, burning, r }: { alt: number; burning: boolean; r: Lesson7Result }) {
  const flame = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (flame.current) flame.current.scale.set(1 + Math.sin(clock.elapsedTime * 31) * 0.12, 1 + Math.sin(clock.elapsedTime * 23) * 0.2, 1) })
  const rope = <meshStandardMaterial color="#2b2f33" roughness={0.8} />
  const corners: [number, number][] = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]
  const mid = alt + 11, k = 7 / r.fBuoy                    // 箭头长度：浮力画成 7 m
  return (
    <group position={[BX, 0, BZ]}>
      {/* 系留绳：一头在地锚上，一头拴着吊篮 */}
      <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[1.2, 0.3, 1.2]} /><meshStandardMaterial color="#3c4249" /></mesh>
      <Rod from={[0, 0.3, 0]} to={[0, alt + 0.02 + 0.3, 0]} r={0.03}>{rope}</Rod>
      <group position={[0, alt + 0.3, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[1.5, 1.2, 1.5]} /><meshStandardMaterial color="#9a6a3a" roughness={0.9} /></mesh>
        <mesh position={[0, 1.24, 0]}><boxGeometry args={[1.6, 0.1, 1.6]} /><meshStandardMaterial color="#5f4126" roughness={0.9} /></mesh>
        {corners.map(([x, z], i) => <Rod key={i} from={[x, 1.2, z]} to={[x * 1.5, 3.3, z * 1.5]} r={0.025}>{rope}</Rod>)}
        <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[0.22, 0.28, 0.5, 16]} /><meshStandardMaterial color="#b9c0c7" metalness={0.8} roughness={0.35} /></mesh>
        {burning && <mesh ref={flame} position={[0, 3.5, 0]}><coneGeometry args={[0.38, 1.9, 16]} /><meshBasicMaterial color="#ffb347" toneMapped={false} transparent opacity={0.9} /></mesh>}
        <Envelope glow={burning ? 1 : 0.25} />
      </group>
      {/* 两个力：浮力向上（球外的空气托着它），重力向下（热空气 + 吊篮） */}
      <ForceArrow tip={[10.5, mid + r.fBuoy * k, 0]} dir={[0, 1, 0]} len={r.fBuoy * k} color="#35c7b3" thick={5} />
      <ForceArrow tip={[-10.5, mid - r.g * k, 0]} dir={[0, -1, 0]} len={r.g * k} color="#ff8a5c" thick={5} />
    </group>
  )
}

/** 工作台上的量筒和密度计 */
function Meter({ liquid }: { liquid: Liquid3Key }) {
  const float = useRef<THREE.Group>(null), deep = useRef(stemIn(LIQUIDS3[liquid].rho))
  const top = BENCH + 0.5                                    // 液面的高度
  useFrame(({ clock }, dt) => {
    deep.current += (stemIn(LIQUIDS3[liquid].rho) - deep.current) * Math.min(1, dt * 3)
    if (float.current) float.current.position.y = top - deep.current - METER.bulbLen + Math.sin(clock.elapsedTime * 2) * 0.002
  })
  const scale = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 1024
    const g = c.getContext('2d')!; g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, 64, 1024); g.fillStyle = '#23262b'; g.font = '700 26px ui-monospace, monospace'; g.textAlign = 'center'
    // 细管上的刻度：读数是液体密度（×10³ kg/m³），越往上数越小
    for (let d = 0.8; d <= 1.101; d += 0.05) { const y = 1024 * (1 - stemIn(d * 1000) / METER.stem); if (y < 20 || y > 1010) continue; g.fillRect(0, y - 2, 64, 4); g.fillText(d.toFixed(2), 32, y - 10) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
  const color = useMemo(() => new THREE.Color(LIQUIDS3[liquid].color).multiplyScalar(0.8), [liquid])
  return (
    <group position={[MX, 0, MZ]}>
      <mesh position={[0, BENCH - 0.03, 0]} castShadow receiveShadow><boxGeometry args={[1.5, 0.06, 0.8]} /><meshStandardMaterial color="#6d757c" metalness={0.5} roughness={0.5} /></mesh>
      {[[-0.68, -0.33], [0.68, -0.33], [-0.68, 0.33], [0.68, 0.33]].map(([x, z], i) => <mesh key={i} position={[x, BENCH / 2 - 0.03, z]} castShadow><boxGeometry args={[0.05, BENCH - 0.06, 0.05]} /><meshStandardMaterial color="#3c4249" /></mesh>)}
      {/* 量筒：玻璃壁、底座、里面的液体 */}
      <mesh position={[0, BENCH + 0.015, 0]}><cylinderGeometry args={[0.1, 0.1, 0.03, 32]} /><meshStandardMaterial color="#cfd7de" metalness={0.3} roughness={0.4} /></mesh>
      <mesh position={[0, BENCH + 0.03 + (top - BENCH - 0.03) / 2, 0]} renderOrder={2}><cylinderGeometry args={[0.058, 0.058, top - BENCH - 0.03, 32]} /><meshBasicMaterial color={color} transparent opacity={0.72} depthWrite={false} /></mesh>
      <mesh position={[0, BENCH + 0.32, 0]} renderOrder={3}><cylinderGeometry args={[0.062, 0.062, 0.58, 32, 1, true]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {[BENCH + 0.61, BENCH + 0.035].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.062, 0.003, 8, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>)}
      {/* 密度计：下面的玻璃泡装着铅粒，上面是带刻度的细管 */}
      <group ref={float}>
        <mesh position={[0, METER.bulbLen / 2, 0]}><capsuleGeometry args={[0.02, METER.bulbLen - 0.04, 8, 16]} /><meshStandardMaterial color="#e9eef2" roughness={0.2} metalness={0.1} /></mesh>
        <mesh position={[0, 0.025, 0]}><sphereGeometry args={[0.017, 16, 12]} /><meshStandardMaterial color="#4a5058" metalness={0.7} roughness={0.5} /></mesh>
        <mesh position={[0, METER.bulbLen + METER.stem / 2, 0]} rotation-y={-0.5}><cylinderGeometry args={[0.0075, 0.0075, METER.stem, 16]} /><meshBasicMaterial map={scale} /></mesh>
      </group>
    </group>
  )
}

interface SceneProps { mode: 'balloon' | 'meter'; r: Lesson7Result; t: number; alt: number; burning: boolean; liquid: Liquid3Key }

export default function Scene7({ mode, r, t, alt, burning, liquid }: SceneProps) {
  const balloon = mode === 'balloon', k = 7 / r.fBuoy, mid = alt + 11
  const labels: Label[] = balloon ? [
    { id: 'temp', at: [BX, alt + 12.5, BZ + 8.6], ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>球内空气</small>{t} °C</> },
    { id: 'fB', at: [BX + 10.5, mid + r.fBuoy * k + 1.2, BZ], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>F浮</small>{kN(r.fBuoy)} kN</> },
    { id: 'fG', at: [BX - 10.5, mid - r.g * k - 1.2, BZ], ax: 0.5, className: 'scene-tag', children: <><small style={{ color: '#d2542a' }}>G总</small>{kN(r.g)} kN</> },
    { id: 'alt', at: [BX, alt + 0.9, BZ + 1.5], className: 'scene-name -translate-y-1/2', children: `离地 ${alt.toFixed(1)} m` },
    { id: 'nRope', at: [BX, Math.max(0.6, alt / 2), BZ + 0.4], name: true, className: 'scene-name -translate-y-1/2', children: `系留绳（最多放到 ${BALLOON.top} m）` },
  ] : [
    { id: 'read', at: [MX + 0.09, BENCH + 0.5, MZ], className: 'scene-tag key -translate-y-1/2', children: <><small>液面处读数</small>{(LIQUIDS3[liquid].rho / 1000).toFixed(2)}</> },
    { id: 'liq', at: [MX - 0.09, BENCH + 0.2, MZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>量筒里是</small>{LIQUIDS3[liquid].name}</> },
    { id: 'nMeter', at: [MX + 0.04, BENCH + 0.8, MZ], name: true, className: 'scene-name -translate-y-1/2', children: '密度计 · 60 g' },
  ]
  return (
    <DockStage labels={labels} target={balloon ? T_BALLOON : T_METER} span={balloon ? S_BALLOON : S_METER} view={balloon ? V_BALLOON : V_METER}>
      <Balloon alt={alt} burning={burning} r={r} />
      <Meter liquid={liquid} />
    </DockStage>
  )
}
