// 第 2 课的三维场景：深水船坞。一只装了压力表的钢箱沉到很深的地方，六个面上各画一个压力箭头。
// 船坞朝镜头的这一面是剖开的，能直接看到水下；后墙上有一把水深标尺。
// 码头环境和通用器材在 dock.tsx。所有会动的东西都由 physics.ts 的计算结果驱动。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BOXES, DOCK2, kN, maxDrop2, type BoxKey, type Lesson2Result } from './physics'
import { Crane, DockStage, ForceArrow, Hoist, OpenSea, Painted, QUAY_X, Rod, SEA_Y, mergeParts, useConcrete, useLiftDrag, type Label, type Part } from './dock'

const SX = 32, SZ = -3                  // 钢箱的位置：船坞中间，离剖面 3 m
const BRIM = SEA_Y, BED = SEA_Y - DOCK2.depth
const CUT = 3, BACK = -4, GATE = 6      // 剖面、后墙、坞门的位置（相对钢箱）
const SCALE_Y = 7.2                     // 吊秤固定在吊臂下面，不跟着进水
const TARGET = new THREE.Vector3(SX + 0.5, -3.7, SZ)
const SPAN: [number, number] = [11, 11.8]
const VIEW: [number, number] = [0.2, 0.15]
const PER_KN = 0.025                    // 箭头长度：每千牛 2.5 cm
const P_MAX = 80000                     // 压力表满量程（Pa）
const C_UP = '#35c7b3', C_DOWN = '#ff8a5c', C_SIDE = '#e9eef2'

function layout(r: Lesson2Result, box: BoxKey) {
  const h = BOXES[box].h, bottom = BRIM + r.bottom, top = bottom + h
  const hookY = top + 0.75
  return { h, bottom, top, hookY, scaleY: SCALE_Y, levelY: BRIM + r.level, lenUp: r.fUp / 1000 * PER_KN, lenDown: r.fDown / 1000 * PER_KN, lenSide: r.fSide / 1000 * PER_KN, sideY: bottom + r.wet / 2 }
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

/** 船坞：后墙、坞门、墙上的水深标尺 */
function Dock() {
  const [d, n, r] = useConcrete(4, 3)
  const x0 = QUAY_X - SX, len = GATE + 0.6 - x0
  const steel = useMemo(() => {
    const P: Part[] = [], RUST = '#7c2f26', h = -0.5 - BED
    // 坞门：一整块钢闸门，外面是海
    P.push({ p: [GATE + 0.3, BED + h / 2, (BACK + CUT) / 2], s: [0.6, h, CUT - BACK], c: RUST })
    for (let k = 0; k < 6; k++) P.push({ p: [GATE - 0.06, BED + 0.7 + k * 1.35, (BACK + CUT) / 2], s: [0.14, 0.2, CUT - BACK], c: '#5d241d' })
    for (let k = 0; k < 4; k++) P.push({ p: [GATE - 0.06, BED + h / 2, BACK + 0.9 + k * 1.75], s: [0.14, h, 0.2], c: '#5d241d' })
    P.push({ p: [GATE + 0.3, -0.44, (BACK + CUT) / 2], s: [1.1, 0.08, CUT - BACK], c: '#6d757c' })
    for (let k = 0; k <= 5; k++) P.push({ p: [GATE + 0.8, 0.1, BACK + 0.2 + k * 1.3], s: [0.05, 1.0, 0.05], c: '#e8b21e' })
    P.push({ p: [GATE + 0.8, 0.58, (BACK + CUT) / 2], s: [0.05, 0.05, CUT - BACK], c: '#e8b21e' })
    // 后墙顶上的护栏
    for (let k = 0; k <= 8; k++) P.push({ p: [x0 + 0.4 + k * 1.4, 0.55, BACK - 0.15], s: [0.05, 1.1, 0.05], c: '#e8b21e' })
    for (const y of [0.55, 1.08]) P.push({ p: [x0 + 6, y, BACK - 0.15], s: [11.4, 0.05, 0.05], c: '#e8b21e' })
    return mergeParts(P)
  }, [x0])
  // 水深标尺：从水面往下，每米一格
  const ruler = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 160; c.height = 1120
    const g = c.getContext('2d')!, per = 1120 / DOCK2.depth
    g.fillStyle = '#f1efe6'; g.fillRect(0, 0, 160, 1120)
    g.fillStyle = '#1d2327'; g.font = '700 56px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
    for (let m = 0; m <= DOCK2.depth; m++) {
      g.fillRect(0, Math.min(1112, m * per - 4), 160, 8)
      if (m > 0 && m < DOCK2.depth) g.fillText(`${m}`, 62, m * per - 46)
      for (let k = 1; k < 5; k++) g.fillRect(0, m * per + k * per / 5 - 2, k % 5 ? 44 : 80, 4)
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
  return (
    <group>
      <mesh position={[x0 + len / 2, BED / 2, BACK - 1]} castShadow receiveShadow><boxGeometry args={[len, -BED, 2]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#9d9b93" envMapIntensity={0.5} /></mesh>
      <mesh position={[x0 + len / 2, (BED + BRIM) / 2, BACK + 0.008]}><planeGeometry args={[len, DOCK2.depth]} /><meshStandardMaterial color="#1d444e" roughness={0.9} /></mesh>
      <mesh geometry={steel} castShadow receiveShadow><Painted metal={0.45} rough={0.6} /></mesh>
      <mesh position={[-1.75, (BED + BRIM) / 2, BACK + 0.02]}><planeGeometry args={[0.5, DOCK2.depth]} /><meshBasicMaterial map={ruler} toneMapped={false} /></mesh>
    </group>
  )
}

interface SceneProps { r: Lesson2Result; box: BoxKey; drop: number; onDrop: (v: number) => void; dragHint?: boolean }

function Apparatus({ r, box, drop, onDrop }: SceneProps) {
  const L = layout(r, box)
  const grab = useLiftDrag(drop, maxDrop2(), onDrop, TARGET)
  const chain = <meshStandardMaterial color="#3a3f45" roughness={0.5} metalness={0.7} />
  const corners: [number, number][] = [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]
  const mid = L.bottom + L.h / 2, gy = L.h / 2 - 0.26
  const sides: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  return (
    <><OpenSea depth={DOCK2.depth} cut={SZ + CUT} />
    <group position={[SX, 0, SZ]}>
      <Dock />
      <Crane reach={5} />

      <group {...grab}>
        <Hoist y={L.scaleY} reading={kN(r.fPull)} />
        <Rod from={[0, L.hookY, 0]} to={[0, L.scaleY - 0.42, 0]} r={0.02}>{chain}</Rod>
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
    </group></>
  )
}

export default function Scene2(props: SceneProps) {
  const { r, box } = props, L = layout(r, box)
  const wet = r.wet > 0.005
  const at = (x: number, y: number, z: number): [number, number, number] => [SX + x, y, SZ + z]
  const labels: Label[] = [
    { id: 'fDown', at: at(0.3, L.top + Math.max(0.35, L.lenDown * 0.6), 0.5), className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: r.fDown > 5 ? 1 : 0 }, children: <><small style={{ color: '#d2542a' }}>F向下</small>{kN(r.fDown)} kN</> },
    { id: 'fUp', at: at(0.3, Math.max(BED + 0.3, L.bottom - Math.max(0.3, L.lenUp * 0.5)), 0.6), className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: wet ? 1 : 0 }, children: <><small>F向上</small>{kN(r.fUp)} kN</> },
    { id: 'fSide', at: at(0.5 + L.lenSide + 0.12, L.sideY, 0), className: 'scene-name -translate-y-1/2', style: { opacity: wet ? 1 : 0 }, children: '左右、前后互相抵消' },
    { id: 'dTop', at: at(-2.2, L.top, BACK + 0.1), ax: 1, className: 'scene-name -translate-y-1/2', style: { opacity: r.dTop > 0.005 ? 1 : 0 }, children: `顶面在水下 ${Math.max(0, r.dTop).toFixed(2)} m` },
    { id: 'dBot', at: at(-2.2, L.bottom, BACK + 0.1), ax: 1, className: 'scene-name -translate-y-1/2', style: { opacity: wet ? 1 : 0 }, children: `底面在水下 ${r.dBot.toFixed(2)} m` },
    { id: 'nPool', at: at(2.6, BED + 0.5, CUT), name: true, className: 'scene-name', children: `深水船坞 · 水深 ${DOCK2.depth} m` },
    { id: 'nGate', at: at(GATE, -0.2, CUT), name: true, className: 'scene-name -translate-y-full', children: '坞门' },
    { id: 'nRuler', at: at(-1.75, BRIM + 0.2, BACK), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '水深标尺' },
    { id: 'nBox', at: at(1.3, L.top + 1.25, 0), name: true, className: 'scene-name -translate-y-1/2', children: '钢箱 · 每个面有压力表' },
    { id: 'drag', at: at(-1.9, L.bottom + L.h / 2, 0.5), className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 可以上下拖</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN} view={VIEW} sea={false}><Apparatus {...props} /></DockStage>
}
