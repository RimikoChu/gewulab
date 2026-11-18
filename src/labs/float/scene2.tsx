// 第 2 课的三维场景：一只装了压力表的钢箱沉进试验水池，六个面上各画一个压力箭头。
// 码头环境和通用器材在 dock.tsx。所有会动的东西都由 physics.ts 的计算结果驱动。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BOXES, LIQUIDS, kN, maxDrop2, type BoxKey, type Lesson2Result } from './physics'
import { BRIM, Crane, DockStage, ForceArrow, HALF, Hoist, Pool, Rod, Water, useLiftDrag, type Label } from './dock'

const TARGET = new THREE.Vector3(0.3, 3.9, 0)
const SPAN: [number, number] = [8.4, 9.6]
const PER_KN = 0.05                     // 箭头长度：每千牛 5 cm
const P_MAX = 25000                     // 压力表满量程（Pa）
const C_UP = '#35c7b3', C_DOWN = '#ff8a5c', C_SIDE = '#e9eef2'

function layout(r: Lesson2Result, box: BoxKey) {
  const h = BOXES[box].h, bottom = BRIM + r.bottom, top = bottom + h
  const hookY = top + 0.75
  return { h, bottom, top, hookY, scaleY: hookY + 0.42, levelY: BRIM + r.level, lenUp: r.fUp / 1000 * PER_KN, lenDown: r.fDown / 1000 * PER_KN, lenSide: r.fSide / 1000 * PER_KN, sideY: bottom + r.wet / 2 }
}

/** 压力表：白表盘、红指针，压强越大指针转得越多 */
function Gauge({ pos, rot, p }: { pos: [number, number, number]; rot: [number, number, number]; p: number }) {
  const a = 2.3 - 4.6 * Math.min(1, p / P_MAX)
  return (
    <group position={pos} rotation={rot}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.15, 0.15, 0.05, 32]} /><meshStandardMaterial color="#2b2f33" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0, 0.027]}><circleGeometry args={[0.125, 32]} /><meshBasicMaterial color="#f4f2ea" /></mesh>
      <mesh position={[0, 0, 0.03]} rotation-z={a}><planeGeometry args={[0.018, 0.2]} /><meshBasicMaterial color="#d6332b" toneMapped={false} /></mesh>
      <mesh position={[0, 0, 0.032]}><circleGeometry args={[0.022, 16]} /><meshBasicMaterial color="#2b2f33" /></mesh>
    </group>
  )
}

interface SceneProps { r: Lesson2Result; box: BoxKey; drop: number; onDrop: (v: number) => void; dragHint?: boolean }

function Apparatus({ r, box, drop, onDrop }: SceneProps) {
  const L = layout(r, box)
  const grab = useLiftDrag(drop, maxDrop2(), onDrop, TARGET)
  const stir = useRef(0), last = useRef(drop)
  useFrame((_, dt) => {
    const moved = Math.abs(drop - last.current); last.current = drop
    stir.current = Math.min(1, Math.max(0, stir.current - dt * 0.6) + (r.wet > 0.005 ? moved * 4 : 0))
  })
  const chain = <meshStandardMaterial color="#3a3f45" roughness={0.5} metalness={0.7} />
  const corners: [number, number][] = [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]
  const mid = L.bottom + L.h / 2, gy = L.h / 2 - 0.26
  const sides: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  return (
    <group>
      <Pool spout={false} />
      <Crane />
      <Water levelY={L.levelY} color={LIQUIDS.fresh.color} stir={stir} />

      <group {...grab}>
        <Hoist y={L.scaleY} reading={kN(r.fPull)} />
        {corners.map(([x, z], i) => <Rod key={i} from={[x, L.top + 0.03, z]} to={[0, L.hookY - 0.05, 0]} r={0.018}>{chain}</Rod>)}
        {/* 钢箱：浅色，放进深色的水里也看得清；棱上有一圈深色的边 */}
        <group position={[0, mid, 0]}>
          <RoundedBox args={[1, L.h, 1]} radius={0.02} smoothness={3} castShadow><meshStandardMaterial color="#cfd7de" metalness={0.55} roughness={0.42} envMapIntensity={1} /></RoundedBox>
          {[-1, 1].map(s => <mesh key={s} position={[0, s * (L.h / 2 - 0.03), 0]}><boxGeometry args={[1.03, 0.06, 1.03]} /><meshStandardMaterial color="#56616b" metalness={0.6} roughness={0.5} /></mesh>)}
          <Gauge pos={[-0.27, gy, 0.5]} rot={[0, 0, 0]} p={(r.pTop + r.pBot) / 2} />
          <Gauge pos={[0.5, gy, 0.27]} rot={[0, Math.PI / 2, 0]} p={(r.pTop + r.pBot) / 2} />
          <Gauge pos={[-0.27, L.h / 2, 0.27]} rot={[-Math.PI / 2, 0, 0]} p={r.pTop} />
        </group>
        {/* 加大的透明拖动区，手指更容易点中 */}
        <mesh position={[0, mid + 0.3, 0]} visible={false}><boxGeometry args={[1.3, L.h + 1.2, 1.3]} /></mesh>
      </group>

      {/* 六个面上的压力：箭头顶在面上，越长压力越大。上下不一样长，四周两两抵消 */}
      <ForceArrow tip={[0, L.bottom, 0]} dir={[0, 1, 0]} len={L.lenUp} color={C_UP} />
      <ForceArrow tip={[0, L.top, 0]} dir={[0, -1, 0]} len={L.lenDown} color={C_DOWN} />
      {sides.map(([x, z], i) => <ForceArrow key={i} tip={[x * 0.5, L.sideY, z * 0.5]} dir={[-x, 0, -z]} len={L.lenSide} color={C_SIDE} opacity={0.6} />)}
    </group>
  )
}

export default function Scene2(props: SceneProps) {
  const { r, box } = props, L = layout(r, box)
  const wet = r.wet > 0.005
  const labels: Label[] = [
    { id: 'pull', at: [-0.55, L.scaleY + 0.1, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>吊秤</small>{kN(r.fPull)} kN{r.fBuoy > 5 && <span className={r.under ? 'delta eq' : 'delta'}>−{kN(r.fBuoy)}</span>}</> },
    { id: 'fDown', at: [0.3, L.top + Math.max(0.35, L.lenDown * 0.6), 0.5], className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: r.fDown > 5 ? 1 : 0 }, children: <><small style={{ color: '#d2542a' }}>F向下</small>{kN(r.fDown)} kN</> },
    { id: 'fUp', at: [0.3, Math.max(0.55, L.bottom - Math.max(0.3, L.lenUp * 0.5)), 0.6], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: wet ? 1 : 0 }, children: <><small>F向上</small>{kN(r.fUp)} kN</> },
    { id: 'fSide', at: [0.5 + L.lenSide + 0.12, L.sideY, 0], className: 'scene-name -translate-y-1/2', style: { opacity: wet ? 1 : 0 }, children: '左右、前后互相抵消' },
    { id: 'dTop', at: [-HALF - 0.2, L.top, HALF + 0.15], ax: 1, className: 'scene-name -translate-y-1/2', style: { opacity: r.dTop > 0.005 ? 1 : 0 }, children: `顶面在水下 ${Math.max(0, r.dTop).toFixed(2)} m` },
    { id: 'dBot', at: [-HALF - 0.2, L.bottom, HALF + 0.15], ax: 1, className: 'scene-name -translate-y-1/2', style: { opacity: wet ? 1 : 0 }, children: `底面在水下 ${r.dBot.toFixed(2)} m` },
    { id: 'nPool', at: [HALF - 0.9, 0.12, HALF + 0.2], name: true, className: 'scene-name', children: '试验水池' },
    { id: 'nBox', at: [0.75, L.top + 0.35, 0], name: true, className: 'scene-name -translate-y-1/2', children: '钢箱 · 每个面有压力表' },
    { id: 'drag', at: [-1.9, L.bottom + L.h / 2, 0.5], className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 可以上下拖</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN}><Apparatus {...props} /></DockStage>
}
