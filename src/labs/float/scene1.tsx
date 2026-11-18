// 第 1 课的三维场景：码头岸边，岸上的悬臂吊把船锚、螺旋桨、混凝土块放进港池，物体旁边画出它受到的三个力。
// 水朝镜头的一面是剖开的：物体有没有进水、进了多少，从侧面一眼看得出来。
// 码头环境和通用器材在 dock.tsx。所有会动的东西都由 physics.ts 的计算结果驱动。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ITEMS, kN, maxDrop1, type ItemKey, type Lesson1Result } from './physics'
import { Crane, DockStage, Hoist, OpenSea, Painted, QUAY_X, Rod, SEA_Y, mergeParts, useConcrete, useLiftDrag, type Label, type Part } from './dock'

const SX = 29.5, SZ = 12                // 吊钩的位置：离岸壁 3.4 m 的水面上方
const BRIM = SEA_Y                      // 港池水面
const DEPTH = 4, CUT = 2.2              // 港池水深；水在物体前面 2.2 m 处剖开
const JIB = 5.2, REACH = 4.9            // 岸上那台悬臂吊：吊臂高度、伸出去多远
const TARGET = new THREE.Vector3(SX - 0.5, -0.5, SZ)
const SPAN: [number, number] = [10, 10.4]
const VIEW: [number, number] = [0.2, 0.17]       // 正面平视：水朝镜头的一面剖开，水上水下一起看
const ARROW = 1.7                       // 重力箭头的长度（m）；其余两个力按比例画
const AX = 0.3, AZ = 0.75               // 箭头画在物体前面一点，左右错开
const C_G = '#ff8a5c', C_B = '#35c7b3', C_T = '#f3f1ea'

function layout(r: Lesson1Result, item: ItemKey) {
  const h = ITEMS[item].h, bottom = BRIM + r.bottom, top = bottom + h
  const hookY = top + 0.6
  return { h, bottom, top, hookY, scaleY: hookY + 0.42, levelY: BRIM + r.level, mid: bottom + h / 2, lenB: ARROW * r.fBuoy / r.g, lenT: ARROW * r.fPull / r.g }
}

/** 力的箭头：一根杆加一个尖。不受遮挡，随时看得见 */
function Arrow({ x, y, len, up, color }: { x: number; y: number; len: number; up: boolean; color: string }) {
  if (len < 0.02) return null
  const head = Math.min(0.26, len * 0.6), shaft = len - head, d = up ? 1 : -1
  const mat = <meshBasicMaterial color={color} depthTest={false} transparent toneMapped={false} />
  return (
    <group position={[x, y, AZ]}>
      <mesh position={[0, d * shaft / 2, 0]} renderOrder={10}><cylinderGeometry args={[0.04, 0.04, shaft, 12]} />{mat}</mesh>
      <mesh position={[0, d * (shaft + head / 2), 0]} rotation-x={up ? 0 : Math.PI} renderOrder={10}><coneGeometry args={[0.12, head, 16]} />{mat}</mesh>
    </group>
  )
}

/** 船锚：锚杆、横杆、两只锚爪 */
function Anchor() {
  const geo = useMemo(() => {
    const c = '#c2c8ce', P: Part[] = [   // 浅灰的镀锌色：放进深色的水里也看得清
      { p: [0, 1.02, 0], s: [0.16, 1.46, 0.14], c },
      { p: [0, 1.5, 0], s: [0.05, 1.1, 0.05], c, cyl: true, r: [Math.PI / 2, 0, 0] },
      { p: [0, 0.2, 0], s: [0.5, 0.22, 0.2], c },
    ]
    for (const s of [-1, 1]) {
      P.push({ p: [s * 0.42, 0.42, 0], s: [0.16, 0.9, 0.16], c, r: [0, 0, -s * 0.95] })
      P.push({ p: [s * 0.8, 0.74, 0], s: [0.36, 0.42, 0.06], c: '#d3d8dd', r: [0, 0, -s * 0.95] })
    }
    return mergeParts(P)
  }, [])
  return (
    <group>
      <mesh geometry={geo} castShadow><Painted metal={0.7} rough={0.5} /></mesh>
      <mesh position={[0, 1.8, 0]} rotation-y={Math.PI / 2} castShadow><torusGeometry args={[0.1, 0.03, 10, 24]} /><meshStandardMaterial color="#c2c8ce" metalness={0.7} roughness={0.45} /></mesh>
    </group>
  )
}

/** 螺旋桨：桨毂加四片扭着的桨叶，轴线水平，用两根吊带吊着 */
function Propeller() {
  const bronze = <meshStandardMaterial color="#b98a3e" metalness={1} roughness={0.32} envMapIntensity={1.3} />
  return (
    <group position={[0, 0.85, 0]}>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.22, 0.56, 28]} />{bronze}</mesh>
      <mesh position={[0, 0, 0.42]} rotation-x={Math.PI / 2} castShadow><coneGeometry args={[0.2, 0.3, 28]} />{bronze}</mesh>
      {[0, 1, 2, 3].map(k => (
        <group key={k} rotation-z={k * Math.PI / 2 + 0.4}>
          <mesh position={[0, 0.46, 0]} rotation-y={0.6} scale={[0.3, 0.4, 0.045]} castShadow><sphereGeometry args={[1, 24, 16]} />{bronze}</mesh>
        </group>
      ))}
    </group>
  )
}

interface SceneProps { r: Lesson1Result; item: ItemKey; drop: number; onDrop: (v: number) => void; dragHint?: boolean }

function Apparatus({ r, item, drop, onDrop }: SceneProps) {
  const L = layout(r, item)
  const [cd, cn, cr] = useConcrete(0.6, 0.6)
  const grab = useLiftDrag(drop, maxDrop1(item), onDrop, TARGET)
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (ring.current) { const k = (clock.elapsedTime * 0.5) % 1; ring.current.scale.setScalar(0.6 + k * 1.3); (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k) } })
  const edge = useMemo(() => {   // 岸边的护轮坎、防撞胶条和爬梯
    const P: Part[] = []
    P.push({ p: [QUAY_X - SX - 0.35, 0.12, 0], s: [0.3, 0.24, 14], c: '#e8b21e' })
    for (let i = -3; i <= 3; i++) P.push({ p: [QUAY_X - SX + 0.14, -0.9, i * 2.1], s: [0.22, 1.5, 0.34], c: '#1f2327' })
    for (const z of [-5.6, -5.1]) P.push({ p: [QUAY_X - SX + 0.1, -1.5, z], s: [0.05, 3.2, 0.05], c: '#c9ced3' })
    for (let k = 0; k < 9; k++) P.push({ p: [QUAY_X - SX + 0.1, -0.1 - k * 0.36, -5.35], s: [0.04, 0.04, 0.5], c: '#c9ced3' })
    return mergeParts(P)
  }, [])
  const chain = <meshStandardMaterial color="#3a3f45" roughness={0.5} metalness={0.7} />
  const corners: [number, number][] = [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]
  return (
    <><OpenSea depth={DEPTH} cut={SZ + CUT} />
    <group position={[SX, 0, SZ]}>
      <group rotation-y={Math.PI / 2}><Crane reach={REACH} jib={JIB} /></group>
      <mesh geometry={edge} castShadow receiveShadow><Painted rough={0.8} metal={0.1} /></mesh>
      {r.depth > 0.02 && <mesh ref={ring} position={[0, BRIM + 0.02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={r.under ? [0.3, 0.38, 40] : [0.85, 1.0, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} /></mesh>}

      <group {...grab}>
        <Hoist y={L.scaleY} reading={kN(r.fPull)} jib={JIB} />
        <group position={[0, L.bottom, 0]}>
          {item === 'anchor' && <><Anchor /><Rod from={[0, 1.88, 0]} to={[0, L.h + 0.55, 0]} r={0.02}>{chain}</Rod></>}
          {item === 'prop' && <><Propeller />{[-0.2, 0.2].map(z => <Rod key={z} from={[0, 1.06, z]} to={[0, L.h + 0.55, 0]} r={0.018}>{chain}</Rod>)}</>}
          {item === 'slab' && <>
            <RoundedBox args={[1, 1, 1]} radius={0.025} smoothness={3} position={[0, 0.5, 0]} castShadow><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#b9b4a8" /></RoundedBox>
            {corners.map(([x, z], i) => <Rod key={i} from={[x, 1.04, z]} to={[0, L.h + 0.55, 0]} r={0.018}>{chain}</Rod>)}
          </>}
        </group>
        {/* 加大的透明拖动区，手指更容易点中 */}
        <mesh position={[0, L.mid + 0.3, 0]} visible={false}><boxGeometry args={[1.5, L.h + 1.2, 1.3]} /></mesh>
      </group>

      {/* 三个力：重力向下；浮力和拉力向上，首尾相接，合起来正好和重力一样长 */}
      <Arrow x={-AX} y={L.mid} len={ARROW} up={false} color={C_G} />
      <Arrow x={AX} y={L.mid} len={L.lenB} up color={C_B} />
      <Arrow x={AX} y={L.mid + L.lenB} len={L.lenT} up color={C_T} />
    </group></>
  )
}

export default function Scene1(props: SceneProps) {
  const { r, item } = props, L = layout(r, item)
  const at = (x: number, y: number, z: number): [number, number, number] => [SX + x, y, SZ + z]
  const labels: Label[] = [
    { id: 'pull', at: at(-0.55, L.scaleY + 0.1, 0), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>吊秤</small>{kN(r.fPull)} kN{r.fBuoy > 5 && <span className={r.under ? 'delta eq' : 'delta'}>−{kN(r.fBuoy)}</span>}</> },
    { id: 'fT', at: at(AX + 0.2, L.mid + L.lenB + L.lenT * 0.6, AZ), className: 'force-tag -translate-y-1/2', style: { color: C_T }, children: <>F<sub>拉</sub></> },
    { id: 'fB', at: at(AX + 0.2, L.mid + L.lenB / 2, AZ), className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: r.fBuoy > 5 ? 1 : 0 }, children: <><small>F浮</small>{kN(r.fBuoy)} kN</> },
    { id: 'fG', at: at(-AX - 0.25, L.mid - ARROW + 0.15, AZ), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small style={{ color: '#d2542a' }}>G</small>{kN(r.g)} kN</> },
    { id: 'nPool', at: at(3.6, BRIM - DEPTH + 0.4, CUT), name: true, className: 'scene-name', children: '港池 · 淡水' },
    { id: 'nItem', at: at(0.75, L.top - 0.1, 0), name: true, className: 'scene-name -translate-y-1/2', children: `${ITEMS[item].name}（${ITEMS[item].mat}）` },
    { id: 'drag', at: at(-1.9, L.mid, 0.5), className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 可以上下拖</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN} view={VIEW} sea={false}><Apparatus {...props} /></DockStage>
}
