// 压强 · 第 1 课的三维场景：水电站工地的沙地（地形在 hydro.tsx，这里只放这一课的器材）。门架吊着一块混凝土预制块，换个放法放到沙地上，看陷多深。
import { useMemo, useRef } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { POSES, kN, type PoseKey } from './physics'
import { Painted, Rod, mergeParts, useConcrete, type Label, type Part } from '../float/dock'
import { ST } from './hydro'
import { LabStage } from './stage'
import { useSlide } from './world'

const X0 = ST.sand                              // 这一课在大场景里的位置
const TARGET = new THREE.Vector3(X0 + 0.6, 1.25, -0.5)
const SPAN: [number, number] = [8.2, 6.2]
const VIEW: [number, number] = [0.2, 0.13]
const LIFT = 1.3, BEAM = 4.6                    // 吊起来时离地多高；门架横梁的高度

/** 坑边的标尺：从地面往下，每 10 cm 一格 */
function makeScale() {
  const c = document.createElement('canvas'); c.width = 96; c.height = 720
  const g = c.getContext('2d')!
  g.fillStyle = '#f3f1e8'; g.fillRect(0, 0, 96, 720)
  g.fillStyle = '#1d2327'; g.font = '700 30px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
  for (let k = 0; k <= 9; k++) { g.fillRect(0, Math.min(714, k * 80 - 3), 96, 6); if (k > 0 && k < 9) g.fillText(String(k * 10), 40, k * 80 - 24); g.fillRect(0, k * 80 + 38, 40, 3) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

interface SceneProps { pose: PoseKey; n: number; down: boolean; sink: number; pit: { w: number; depth: number } | null; onTap: () => void; tapHint?: boolean }

function Apparatus({ pose, n, down, sink, pit, onTap, y }: SceneProps & { y: number }) {
  const [cd, cn, cr] = useConcrete(1, 0.6)
  const scale = useMemo(makeScale, [])
  const P = POSES[pose], top = y + P.h * n
  const gantry = useMemo(() => {
    const G: Part[] = [], Y = '#e8b21e'
    for (const s of [-1, 1]) { for (const z of [-1.4, 0.4]) G.push({ p: [s * 3.3, BEAM / 2, z - 0.5], s: [0.22, BEAM, 0.22], c: Y }); G.push({ p: [s * 3.3, BEAM + 0.1, -1], s: [0.3, 0.3, 2.3], c: Y }, { p: [s * 3.3, 0.1, -1], s: [0.5, 0.2, 2.6], c: '#3c4249' }) }
    G.push({ p: [0, BEAM + 0.35, -0.5], s: [7.2, 0.4, 0.34], c: Y }, { p: [0, BEAM + 0.02, -0.5], s: [0.6, 0.3, 0.6], c: '#3c4249' })
    return mergeParts(G)
  }, [])
  const down0 = useRef<[number, number]>([0, 0])
  const chain = <meshStandardMaterial color="#30353b" roughness={0.5} metalness={0.7} />
  const conc = <meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#c4bfb2" envMapIntensity={0.6} />
  const hook = top + 0.9
  return (
    <group position={[X0, 0, 0]}>
      <mesh geometry={gantry} castShadow receiveShadow><Painted metal={0.4} rough={0.5} /></mesh>
      {/* 压出来的坑：剖面上的一块深色缺口；旁边一把标尺 */}
      {pit && <mesh position={[0, -pit.depth / 2, 0.009]}><planeGeometry args={[pit.w + 0.06, pit.depth]} /><meshBasicMaterial color="#4a4030" /></mesh>}
      <mesh position={[1.75, -0.45, 0.011]}><planeGeometry args={[0.12, 0.9]} /><meshBasicMaterial map={scale} toneMapped={false} /></mesh>
      {/* 吊着的混凝土块（可以叠两块）。前面那一面贴着剖面，陷下去多少一眼看得见 */}
      <group onPointerDown={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); down0.current = [e.nativeEvent.clientX, e.nativeEvent.clientY] }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => { if (Math.hypot(e.nativeEvent.clientX - down0.current[0], e.nativeEvent.clientY - down0.current[1]) < 6) onTap() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
        {Array.from({ length: n }, (_, k) => (
          <RoundedBox key={k} args={[P.w, P.h - 0.004, P.d]} radius={0.03} smoothness={3} position={[0, y + P.h * (k + 0.5), -P.d / 2 + 0.016]} castShadow receiveShadow>{conc}</RoundedBox>
        ))}
      </group>
      {/* 吊索：四根链条收到吊钩，再一根钢丝绳上到门架 */}
      {!down || y > -sink + 0.02 ? <>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => <Rod key={i} from={[sx * (P.w / 2 - 0.1), top, -P.d / 2 + sz * (P.d / 2 - 0.08)]} to={[0, hook, -P.d / 2]} r={0.016}>{chain}</Rod>)}
      </> : null}
      <Rod from={[0, Math.max(hook, top + 0.9), -0.5]} to={[0, BEAM - 0.1, -0.5]} r={0.02}>{chain}</Rod>
      <mesh position={[0, Math.max(hook, top + 0.9), -0.5]} rotation-y={Math.PI / 2}><torusGeometry args={[0.09, 0.028, 10, 24]} />{chain}</mesh>
    </group>
  )
}

export default function Scene1(props: SceneProps & { F: number; S: number }) {
  const { pose, n, down, sink, pit } = props, P = POSES[pose]
  const y = useSlide(down ? -sink : LIFT, 1.6)
  const settled = down && Math.abs(y + sink) < 1e-3
  const labels: Label[] = [
    { id: 'pit', at: [X0 + 1.95, -Math.max(0.12, (pit?.depth ?? 0) / 2), 0], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: pit ? 1 : 0 }, children: <><small>坑深</small>{Math.round((pit?.depth ?? 0) * 100)} cm</> },
    { id: 'F', at: [X0 + -P.w / 2 - 0.25, y + P.h * n / 2, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>压力</small>{kN(props.F)} kN</> },
    { id: 'S', at: [X0 + 0, Math.min(y, 0) - 0.28 - (settled ? 0 : 0), 0.02], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: settled ? 1 : 0 }, children: `着地面积 ${props.S} m²` },
    { id: 'tap', at: [X0 + 0, y + P.h * n + 0.35, 0], ax: 0.5, className: '', style: { display: props.tapHint ? undefined : 'none' }, children: <div className="drag-hint" style={{ animation: 'none', transform: 'none' }}>点一下混凝土块，换个放法</div> },
    { id: 'nBlock', at: [X0 + P.w / 2 + 0.2, y + P.h * n - 0.15, 0], name: true, className: 'scene-name -translate-y-1/2', children: '混凝土块 · 每块 23.52 kN' },
    { id: 'nSand', at: [X0 + -3.4, -1.6, 0], name: true, className: 'scene-name', children: '沙地（剖面）' },
  ]
  return <LabStage labels={labels} target={TARGET} span={SPAN} view={VIEW}><Apparatus {...props} y={y} /></LabStage>
}
