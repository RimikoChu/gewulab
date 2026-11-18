// 第 4 课的三维场景：吊车把物块放进注满水的试验水池，溢出的水顺着溢水槽流进计量槽，计量槽放在地磅上。
// 码头环境和通用器材在 dock.tsx；这里只有这一课自己的东西。所有会动的东西都由 physics.ts 的计算结果驱动。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BLOCKS, LIQUIDS, TANK, kN, maxDrop, type BlockKey, type Lesson4Result, type LiquidKey } from './physics'
import { BRIM, Crane, DockStage, HALF, Hoist, Led, Painted, Pool, Rod, STEEL, Water, YELLOW, mergeParts, useConcrete, useLiftDrag, useRipple, type Label, type Part } from './dock'

const TANK_X = 3.45, PLATE = 0.22            // 计量槽中心的 x；地磅台面厚度
const TARGET = new THREE.Vector3(1.1, 3.9, 0)
const SPAN: [number, number] = [10.4, 10.6]

/** 各个器材的位置，全部由计算结果推出 */
function layout(r: Lesson4Result, block: BlockKey) {
  const h = BLOCKS[block].h
  const blockBottom = BRIM + r.bottom, blockTop = blockBottom + h
  const hookY = blockTop + 0.75                       // 四根吊链汇到这里
  const scaleY = hookY + 0.42                         // 吊秤中心
  return { h, blockBottom, blockTop, hookY, scaleY, levelY: BRIM + r.level, sub: r.depth, tankWater: PLATE + 0.1 + r.tankLevel }
}

/** 计量槽 + 地磅 + 读数屏 */
/** 水流落进计量槽时的水花：两圈往外扩的白环 */
function Splash({ y }: { y: number }) {
  const a = useRef<THREE.Mesh>(null), b = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    for (const [m, o] of [[a.current, 0], [b.current, 0.5]] as const) {
      if (!m) continue
      const k = (clock.elapsedTime * 1.6 + o) % 1
      m.scale.setScalar(0.25 + k * 0.9); (m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k)
    }
  })
  return <group position={[-0.08, y + 0.012, 0]} rotation-x={-Math.PI / 2}>
    {[a, b].map((ref, i) => <mesh key={i} ref={ref} renderOrder={4}><ringGeometry args={[0.34, 0.42, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} /></mesh>)}
  </group>
}

function Tank({ water, color, reading, flowing }: { water: number; color: string; reading: string; flowing: boolean }) {
  const map = useRipple(1.2, 0.04)
  const deep = useMemo(() => new THREE.Color(color).multiplyScalar(0.3), [color])
  const geo = useMemo(() => {
    const P: Part[] = [], o = TANK.side / 2 + 0.05, h = TANK.height, y0 = PLATE
    P.push({ p: [0, PLATE / 2, 0], s: [2.7, PLATE, 2.7], c: '#4a5058' })
    for (const s of [-1, 1]) { P.push({ p: [s * 1.3, PLATE + 0.006, 0], s: [0.1, 0.012, 2.7], c: YELLOW }); P.push({ p: [0, PLATE + 0.006, s * 1.3], s: [2.7, 0.012, 0.1], c: YELLOW }) }
    P.push({ p: [0, y0 + 0.05, 0], s: [2 * o, 0.1, 2 * o], c: '#2f6f8f' })
    for (const s of [-1, 1]) P.push({ p: [s * o, y0 + h / 2, 0], s: [0.1, h, 2 * o + 0.1], c: '#2f6f8f' })
    P.push({ p: [0, y0 + h / 2, -o], s: [2 * o + 0.1, h, 0.1], c: '#2f6f8f' })
    // 正面是观察窗：只留上下两根横梁；右边窗框上每 0.1 m 一道刻度，逢 0.5 m 加长
    P.push({ p: [0, y0 + 0.11, o], s: [2 * o + 0.1, 0.22, 0.1], c: '#2f6f8f' }, { p: [0, y0 + h - 0.05, o], s: [2 * o + 0.1, 0.1, 0.1], c: '#2f6f8f' })
    for (let i = 1; i <= 11; i++) P.push({ p: [o - (i % 5 ? 0.04 : 0.09), y0 + 0.1 + i * 0.1, o + 0.056], s: [i % 5 ? 0.1 : 0.2, 0.014, 0.01], c: '#f3f1ea' })
    for (const s of [-1, 1]) P.push({ p: [s * (o + 0.06), y0 + h - 0.06, 0], s: [0.06, 0.12, 2 * o + 0.22], c: '#e8e6df' }, { p: [0, y0 + h - 0.06, s * (o + 0.06)], s: [2 * o + 0.22, 0.12, 0.06], c: '#e8e6df' })
    // 读数屏立柱
    P.push({ p: [1.75, 0.75, 1.25], s: [0.1, 1.5, 0.1], c: STEEL }, { p: [1.75, 1.62, 1.25], s: [1.05, 0.5, 0.16], c: '#22262a', r: [0, -0.35, 0] })
    return mergeParts(P)
  }, [])
  return (
    <group position={[TANK_X, 0, 0]}>
      <mesh geometry={geo} castShadow receiveShadow><Painted metal={0.45} rough={0.5} /></mesh>
      {/* 槽里的水体：和水池一样用不受光照的深色，透过观察窗看得见水位 */}
      <mesh position={[0, PLATE + 0.1 + 0.65, -TANK.side / 2 + 0.004]}><planeGeometry args={[TANK.side, 1.3]} /><meshStandardMaterial color="#163640" roughness={0.9} /></mesh>
      {water > PLATE + 0.105 && <mesh position={[0, (water + PLATE + 0.1) / 2, 0]} renderOrder={2}>
        <boxGeometry args={[TANK.side, water - PLATE - 0.1, TANK.side + 0.09]} />
        <meshBasicMaterial color={deep} transparent opacity={0.72} depthWrite={false} />
      </mesh>}
      {water > PLATE + 0.105 && <mesh position={[0, water, 0]} rotation-x={-Math.PI / 2} renderOrder={3}>
        <planeGeometry args={[TANK.side, TANK.side]} />
        <meshPhysicalMaterial color={color} roughness={0.05} envMapIntensity={1.8} normalMap={map} normalScale={new THREE.Vector2(0.3, 0.3)} clearcoat={1} />
      </mesh>}
      {flowing && <Splash y={Math.max(water, PLATE + 0.1)} />}
      <Led text={reading} w={0.92} h={0.38} position={[1.75 + Math.sin(-0.35) * 0.086, 1.62, 1.25 + Math.cos(-0.35) * 0.086]} rotation-y={-0.35} />
    </group>
  )
}

/** 从溢水槽流进计量槽的水：一道抛物线 */
function Stream({ toY, color }: { toY: number; color: string }) {
  const end = Math.round(toY * 20) / 20
  const geo = useMemo(() => {
    const x0 = HALF + 1.12, y0 = BRIM - 0.2
    const pts = Array.from({ length: 9 }, (_, i) => { const k = i / 8; return new THREE.Vector3(x0 + 0.75 * k, y0 - (y0 - end) * k * k, 0) })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.09, 10)
  }, [end])
  useEffect(() => () => geo.dispose(), [geo])
  const map = useRipple(3, -1.6)
  return <mesh geometry={geo} scale={[1, 1, 1.8]} renderOrder={3}><meshPhysicalMaterial color={color} transparent opacity={0.75} roughness={0.05} envMapIntensity={2.4} normalMap={map} normalScale={new THREE.Vector2(0.6, 0.6)} clearcoat={1} /></mesh>
}

interface SceneProps { r: Lesson4Result; block: BlockKey; liquid: LiquidKey; flowing: boolean; drop: number; onDrop: (v: number) => void; dragHint?: boolean }

function Apparatus({ r, block, liquid, flowing, drop, onDrop }: SceneProps) {
  const L = layout(r, block), liq = LIQUIDS[liquid], b = BLOCKS[block]
  const [cd, cn, cr] = useConcrete(0.6, 0.6 * b.h)
  const grab = useLiftDrag(drop, maxDrop(block), onDrop, TARGET)

  // 水面被搅动的程度：物块在动或水在流时升高，停下后慢慢平静
  const stir = useRef(0), last = useRef(drop)
  useFrame((_, dt) => {
    const moved = Math.abs(drop - last.current); last.current = drop
    stir.current = Math.min(1, Math.max(0, stir.current - dt * 0.6) + (L.sub > 0.005 || flowing ? moved * 4 : 0) + (flowing ? dt * 2.5 : 0))
  })

  const corners: [number, number][] = [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]
  return (
    <group>
      <Pool />
      <Crane />
      <Water levelY={L.levelY} color={liq.color} stir={stir} />

      {/* 吊秤 + 吊链 + 物块（整组可拖动） */}
      <group {...grab}>
        <Hoist y={L.scaleY} reading={kN(r.fPull)} />
        {corners.map(([x, z], i) => <Rod key={i} from={[x, L.blockTop + 0.06, z]} to={[0, L.hookY - 0.05, 0]} r={0.018}><meshStandardMaterial color="#3a3f45" roughness={0.5} metalness={0.7} /></Rod>)}
        {corners.map(([x, z], i) => <mesh key={i} position={[x, L.blockTop + 0.04, z]} castShadow><torusGeometry args={[0.05, 0.018, 8, 16]} /><meshStandardMaterial color="#30353b" metalness={0.8} roughness={0.4} /></mesh>)}
        <RoundedBox args={[1, b.h, 1]} radius={0.025} smoothness={3} position={[0, L.blockBottom + b.h / 2, 0]} castShadow>
          {b.metal
            ? <meshStandardMaterial color={b.color} metalness={0.85} roughness={0.42} envMapIntensity={1.1} />
            : <meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color={b.color} />}
        </RoundedBox>
        {/* 加大的透明拖动区，手指更容易点中 */}
        <mesh position={[0, L.blockBottom + b.h / 2 + 0.35, 0]} visible={false}><boxGeometry args={[1.3, b.h + 1.3, 1.3]} /></mesh>
      </group>

      {flowing && <Stream toY={L.tankWater} color={liq.color} />}
      <Tank water={L.tankWater} color={liq.color} reading={kN(r.gTotal)} flowing={flowing} />
    </group>
  )
}

export default function Scene4(props: SceneProps) {
  const { r, block } = props, L = layout(r, block)
  const eq = r.equal && !r.lifted
  // 读数标签：入水以后，吊秤少了多少、地磅多了多少，用同一种颜色标出来
  const labels: Label[] = [
    { id: 'pull', at: [-0.55, L.scaleY + 0.1, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>F拉</small>{kN(r.fPull)} kN{r.fBuoy > 5 && <span className={eq ? 'delta eq' : 'delta'}>−{kN(r.fBuoy)}</span>}</> },
    { id: 'total', at: [TANK_X + 1.2, 2.0, 1.25], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>G总</small>{kN(r.gTotal)} kN{r.gOut > 5 && <span className={eq ? 'delta eq' : 'delta'}>+{kN(r.gOut)}</span>}</> },
    { id: 'vol', at: [-HALF - 0.2, L.levelY - Math.max(L.sub, 0.3) / 2, HALF + 0.15], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: L.sub > 0.005 ? 1 : 0 }, children: <><small>V排</small>{r.vImm.toFixed(2)} m³</> },
    { id: 'nPool', at: [-HALF + 0.2, 0.75, HALF + 0.2], name: true, className: 'scene-name', children: '试验水池' },
    { id: 'nTank', at: [TANK_X - 0.5, 0.1, 1.5], name: true, className: 'scene-name', children: '计量槽 · 地磅' },
    { id: 'nSpout', at: [HALF + 0.75, BRIM + 0.25, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '溢水口' },
    { id: 'drag', at: [0.55, L.blockBottom + L.h / 2, 0.5], className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 可以上下拖</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN}><Apparatus {...props} /></DockStage>
}
