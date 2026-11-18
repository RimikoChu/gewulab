// 第 6 课的三维场景：码头岸边。同样 60 吨的钢，一块钢板扔进水里就沉；做成驳船却能浮，还能装货。
// 码头环境在 dock.tsx。驳船的吃水由 physics.ts 的计算结果驱动。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BARGE, WATERS, type Lesson6Result, type WaterKey } from './physics'
import { DockStage, Painted, mergeParts, type Label, type Part } from './dock'

const SEA_Y = -1.6                        // 海面的高度（码头面是 0）
const CX = 31.5, CZ = 6                   // 驳船中心
const TARGET = new THREE.Vector3(CX, 0.6, CZ)
const SPAN: [number, number] = [23, 11.5]
const VIEW: [number, number] = [1.95, 0.15]       // 从水面这一侧往回看：船的侧面、吃水线、后面的船厂都在画面里
const COLORS = ['#8f3a22', '#1f506b', '#2c5c41', '#96651b', '#9a978e', '#573a66']   // 压暗一些，夕阳下才不发白

/** 船壳侧面的贴图：满载线以下铁红、以上深蓝，白色的满载线，还有吃水标尺 */
function useHullPaint() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 384
    const g = c.getContext('2d')!, py = (d: number) => 384 * (1 - d / BARGE.D)       // 吃水 d 米对应贴图上的 y
    g.fillStyle = '#22354a'; g.fillRect(0, 0, 2048, 384)
    g.fillStyle = '#7c2f26'; g.fillRect(0, py(BARGE.line), 2048, 384)
    g.fillStyle = '#f1efe8'; g.fillRect(0, py(BARGE.line) - 5, 2048, 10)
    g.font = '700 30px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
    for (const x of [150, 1760]) for (let d = 0.5; d <= 2.5; d += 0.5) { g.fillStyle = '#f1efe8'; g.fillRect(x, py(d) - 3, 46, 6); g.fillText(d.toFixed(1), x + 58, py(d)) }
    g.font = '700 46px -apple-system, "PingFang SC", sans-serif'; g.fillText('格物驳 02', 900, 60)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
}

/** 驳船：船壳、甲板、船尾的小驾驶室、甲板上的集装箱 */
function Barge({ boxes }: { boxes: number }) {
  const paint = useHullPaint()
  const deck = useMemo(() => {
    const P: Part[] = [], { L, B, D } = BARGE
    P.push({ p: [0, D + 0.03, 0], s: [B - 0.1, 0.06, L - 0.1], c: '#6d757c' })
    for (const s of [-1, 1]) P.push({ p: [s * (B / 2 - 0.08), D + 0.25, 0], s: [0.08, 0.5, L - 0.4], c: '#e8b21e' })
    P.push({ p: [0, D + 1.3, -L / 2 + 1.6], s: [3.4, 2.6, 2.4], c: '#e9e6dc' }, { p: [0, D + 2.0, -L / 2 + 2.82], s: [2.8, 0.7, 0.05], c: '#22354a' }, { p: [0, D + 2.7, -L / 2 + 1.6], s: [3.8, 0.16, 2.8], c: '#3c4249' })
    for (const z of [-L / 2 + 3.6, L / 2 - 0.6]) for (const s of [-1, 1]) P.push({ p: [s * 2.2, D + 0.3, z], s: [0.16, 0.5, 0.16], c: '#2b2f33', cyl: true })
    return mergeParts(P)
  }, [])
  const cargo = useMemo(() => {
    if (!boxes) return null
    const P: Part[] = []
    for (let i = 0; i < boxes; i++) {
      const layer = Math.floor(i / 6), k = i % 6, row = Math.floor(k / 2), col = k % 2
      const x = (col - 0.5) * 2.6, z = -2.6 + row * 6.3, y = BARGE.D + 0.06 + 1.3 + layer * 2.62, c = COLORS[(i * 5 + layer) % COLORS.length]
      P.push({ p: [x, y, z], s: [2.44, 2.59, 6.06], c })
      for (let j = 0; j < 12; j++) for (const s of [-1, 1]) P.push({ p: [x + s * 1.225, y, z - 2.75 + j * 0.5], s: [0.04, 2.3, 0.12], c })
    }
    return mergeParts(P)
  }, [boxes])
  const { L, B, D } = BARGE
  const side = <meshStandardMaterial map={paint} roughness={0.55} metalness={0.25} />
  const end = <meshStandardMaterial color="#22354a" roughness={0.55} metalness={0.25} />
  return (
    <group>
      {/* 船壳：两舷贴带标尺的图，船头船尾和船底用素色 */}
      {[-1, 1].map(s => <mesh key={s} position={[s * B / 2, D / 2, 0]} rotation-y={s * Math.PI / 2} castShadow><planeGeometry args={[L, D]} />{side}</mesh>)}
      {[-1, 1].map(s => <mesh key={s} position={[0, D / 2, s * L / 2]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[B, D]} />{end}</mesh>)}
      <mesh position={[0, 0, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[B, L]} /><meshStandardMaterial color="#7c2f26" /></mesh>
      <mesh geometry={deck} castShadow receiveShadow><Painted metal={0.3} rough={0.6} /></mesh>
      {cargo && <mesh geometry={cargo} castShadow><Painted metal={0.3} rough={0.55} /></mesh>}
    </group>
  )
}

interface SceneProps { mode: 'plate' | 'barge'; r: Lesson6Result; boxes: number; water: WaterKey; sink: number }

function Apparatus({ mode, r, boxes, sink }: SceneProps) {
  const hull = useRef<THREE.Group>(null), ring = useRef<THREE.Mesh>(null), draft = useRef(r.draft)
  useFrame(({ clock }, dt) => {
    draft.current += (r.draft - draft.current) * Math.min(1, dt * 2.2)                 // 吃水慢慢变到位
    if (hull.current) { hull.current.position.y = SEA_Y - draft.current + Math.sin(clock.elapsedTime * 0.9) * 0.025; hull.current.rotation.x = Math.sin(clock.elapsedTime * 0.7) * 0.004 }
    if (ring.current) { const k = (clock.elapsedTime * 0.7) % 1; ring.current.scale.setScalar(0.4 + k * 1.6); (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k) }
  })
  return (
    <group position={[CX, 0, CZ]}>
      {mode === 'barge' && <group ref={hull}><Barge boxes={boxes} /></group>}
      {mode === 'plate' && <>
        {/* 60 吨钢板：sink 从 0 到 1，从水面上方落下去，一直沉到看不见 */}
        <mesh position={[0, 1.2 - sink * 9, 0]} rotation-z={sink * 0.25} castShadow><boxGeometry args={[4.2, 0.36, 5.1]} /><meshStandardMaterial color="#8d949c" metalness={0.85} roughness={0.4} /></mesh>
        {sink > 0.28 && <mesh ref={ring} position={[0, SEA_Y + 0.03, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[2.4, 2.9, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} /></mesh>}
      </>}
    </group>
  )
}

export default function Scene6(props: SceneProps) {
  const { mode, r, water } = props
  const wx = CX + BARGE.B / 2 + 0.2
  const labels: Label[] = mode === 'barge' ? [
    { id: 'draft', at: [wx, SEA_Y + 0.2, CZ + 7.5], ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>吃水</small>{r.draft.toFixed(2)} m</> },
    { id: 'line', at: [wx, SEA_Y - r.draft + BARGE.line + 0.5, CZ - 2], ax: 0.5, className: 'scene-name -translate-y-1/2', style: r.over ? { background: '#d6332b', color: '#fff' } : undefined, children: r.over ? '满载线已经没进水里：超载' : '白线：满载线' },
    { id: 'water', at: [CX + 9, SEA_Y + 0.2, CZ + 9], ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>这里是</small>{WATERS[water].name}</> },
    { id: 'nBarge', at: [CX, SEA_Y - r.draft + BARGE.D + 3.4, CZ - 8.4], ax: 0.5, name: true, className: 'scene-name', children: '驳船 · 空船 60 吨' },
  ] : [
    { id: 'plate', at: [CX, Math.max(SEA_Y + 0.6, 1.9 - props.sink * 9), CZ], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>钢板</small>60 吨</> },
    { id: 'water', at: [CX + 9, SEA_Y + 0.2, CZ + 9], ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>这里是</small>{WATERS[water].name}</> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN} view={VIEW}><Apparatus {...props} /></DockStage>
}
