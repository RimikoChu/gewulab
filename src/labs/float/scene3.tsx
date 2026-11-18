// 第 3 课的三维场景：同样大小、不同材料的物块，放进装着不同液体的试验水池。
// 码头环境和通用器材在 dock.tsx。所有会动的东西都由 physics.ts 的计算结果驱动。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LIQUIDS3, MATS, kN, maxDrop3, type Lesson3Result, type Liquid3Key, type MatKey } from './physics'
import { BRIM, Crane, DockStage, ForceArrow, HALF, Hoist, Pool, Rod, Water, useConcrete, useLiftDrag, type Label } from './dock'

const TARGET = new THREE.Vector3(0.3, 3.9, 0)
const SPAN: [number, number] = [8.4, 9.6]
const PER_KN = 0.022, AX = 0.3, AZ = 0.75
const C_G = '#ff8a5c', C_B = '#35c7b3', C_T = '#f3f1ea'

function layout(r: Lesson3Result) {
  const bottom = BRIM + r.bottom, top = bottom + 1, hookY = top + 0.75
  return { bottom, top, mid: bottom + 0.5, hookY, scaleY: hookY + 0.42, levelY: BRIM + r.level, lenG: r.g / 1000 * PER_KN, lenB: r.fBuoy / 1000 * PER_KN, lenT: r.fPull / 1000 * PER_KN }
}

interface SceneProps { r: Lesson3Result; mat: MatKey; liquid: Liquid3Key; drop: number; onDrop: (v: number) => void; dragHint?: boolean }

function Apparatus({ r, mat, liquid, drop, onDrop }: SceneProps) {
  const L = layout(r), m = MATS[mat]
  const [cd, cn, cr] = useConcrete(0.6, 0.6)
  const grab = useLiftDrag(drop, maxDrop3(), onDrop, TARGET)
  const stir = useRef(0), last = useRef(drop)
  useFrame((_, dt) => {
    const moved = Math.abs(drop - last.current); last.current = drop
    stir.current = Math.min(1, Math.max(0, stir.current - dt * 0.6) + (r.wet > 0.005 ? moved * 4 : 0))
  })
  const chain = <meshStandardMaterial color="#3a3f45" roughness={0.5} metalness={0.7} />
  const corners: [number, number][] = [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]
  return (
    <group>
      <Pool spout={false} />
      <Crane />
      <Water levelY={L.levelY} color={LIQUIDS3[liquid].color} stir={stir} />
      <group {...grab}>
        <Hoist y={L.scaleY} reading={kN(r.fPull)} />
        {corners.map(([x, z], i) => <Rod key={i} from={[x, L.top + 0.03, z]} to={[0, L.hookY - 0.05, 0]} r={0.018}>{chain}</Rod>)}
        <RoundedBox args={[1, 1, 1]} radius={0.025} smoothness={3} position={[0, L.mid, 0]} castShadow>
          {mat === 'concrete'
            ? <meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color={m.color} />
            : <meshStandardMaterial color={m.color} metalness={m.metal} roughness={m.rough} envMapIntensity={1.1} />}
        </RoundedBox>
        <mesh position={[0, L.mid + 0.3, 0]} visible={false}><boxGeometry args={[1.3, 2.2, 1.3]} /></mesh>
      </group>
      {/* 三个力：重力向下；浮力和拉力向上，首尾相接 */}
      <ForceArrow tip={[-AX, L.mid - L.lenG, AZ]} dir={[0, -1, 0]} len={L.lenG} color={C_G} />
      <ForceArrow tip={[AX, L.mid + L.lenB, AZ]} dir={[0, 1, 0]} len={L.lenB} color={C_B} />
      <ForceArrow tip={[AX, L.mid + L.lenB + L.lenT, AZ]} dir={[0, 1, 0]} len={L.lenT} color={C_T} />
    </group>
  )
}

export default function Scene3(props: SceneProps) {
  const { r, mat, liquid } = props, L = layout(r)
  const labels: Label[] = [
    { id: 'pull', at: [-0.55, L.scaleY + 0.1, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>吊秤</small>{kN(r.fPull)} kN{r.fBuoy > 5 && <span className="delta eq">−{kN(r.fBuoy)}</span>}</> },
    { id: 'fB', at: [AX + 0.2, L.mid + Math.max(0.12, L.lenB / 2), AZ], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: r.fBuoy > 5 ? 1 : 0 }, children: <><small>F浮</small>{kN(r.fBuoy)} kN</> },
    { id: 'fG', at: [-AX - 0.25, L.mid - Math.min(L.lenG, 1.1), AZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small style={{ color: '#d2542a' }}>G</small>{kN(r.g)} kN</> },
    { id: 'liq', at: [HALF + 0.35, BRIM - 0.1, HALF + 0.2], className: 'scene-tag -translate-y-1/2', children: <><small>池里是</small>{LIQUIDS3[liquid].name}</> },
    { id: 'nItem', at: [0.75, L.top + 0.3, 0], name: true, className: 'scene-name -translate-y-1/2', children: `${MATS[mat].name}块 · 1 m³` },
    { id: 'drag', at: [-1.9, L.mid, 0.5], className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 可以上下拖</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN}><Apparatus {...props} /></DockStage>
}
