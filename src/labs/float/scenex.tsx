// 拓展课的三维场景：四个小实验共用一页。冰山、沉船、太空都在试验水池里；王冠在工作台的量筒里。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { CYL, G, LIQUIDS, POOL, TOP5, WRECK, kN, type CrownKey, type LiquidKey } from './physics'
import { BRIM, Crane, DockStage, ForceArrow, HALF, Hoist, Painted, Pool, Rod, Water, mergeParts, useLiftDrag, type Label, type Part } from './dock'

export type Sub = 'ice' | 'salvage' | 'space' | 'crown'
const T_POOL = new THREE.Vector3(0.3, 3.6, 0), S_POOL: [number, number] = [8.4, 9.6]
const MX = -3, MZ = 7, BENCH = 0.9
const T_BENCH = new THREE.Vector3(MX, BENCH + 0.13, MZ), S_BENCH: [number, number] = [0.42, 0.4], V_BENCH: [number, number] = [0.5, 0.1]
const FLOOR = POOL.floor - POOL.brim
const ML = 1e-6 / (Math.PI * CYL.r ** 2)                 // 量筒里每毫升水有多高（m）

export interface XProps {
  sub: Sub; liquid: LiquidKey
  ice: { side: number; level: number; bottom: number; under: number; start: number }
  wreck: { b: number; bags: number; level: number; g: number; fBuoy: number }
  space: { b: number; level: number; wet: number; g: number; fBuoy: number; mass: number; onMove: (b: number) => void; onEnd: () => void }
  crown: { item: CrownKey | null; p: number; ml: number }
}

/** 一段沉在池底的钢船体，上面系着橙色的浮筒 */
function Wreck({ b, bags }: { b: number; bags: number }) {
  const hull = useMemo(() => {
    const c = '#7a4a36', P: Part[] = [{ p: [0, 0.3, 0], s: [1.7, 0.6, 0.8], c }, { p: [1.02, 0.32, 0], s: [0.5, 0.56, 0.56], c, r: [0, Math.PI / 4, 0] }, { p: [-0.3, 0.72, 0], s: [0.6, 0.26, 0.5], c: '#8c5a43' }, { p: [0, 0.03, 0], s: [1.9, 0.06, 0.12], c: '#5e3a2b' }]
    return mergeParts(P)
  }, [])
  const y = BRIM + b
  const spots = Array.from({ length: bags }, (_, i) => [-1.05 + (i % 4) * 0.7, i < 4 ? 0.42 : -0.42] as const)
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={hull} castShadow><Painted rough={0.9} metal={0.3} /></mesh>
      {spots.map(([x, z], i) => (
        <group key={i}>
          <Rod from={[x * 0.6, 0.6, z * 0.5]} to={[x, 1.25, z]} r={0.012}><meshStandardMaterial color="#2b2f33" /></Rod>
          <mesh position={[x, 1.72, z]} scale={[1, 1.22, 1]}><sphereGeometry args={[0.46, 24, 16]} /><meshStandardMaterial color="#f08a24" roughness={0.6} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Crate() {
  const slats = useMemo(() => {
    const P: Part[] = [], c = '#8a5a30'
    for (const y of [-0.34, 0, 0.34]) for (const s of [-1, 1]) { P.push({ p: [0, y, s * 0.505], s: [1.02, 0.12, 0.03], c }); P.push({ p: [s * 0.505, y, 0], s: [0.03, 0.12, 1.02], c }) }
    return mergeParts(P)
  }, [])
  return <><RoundedBox args={[1, 1, 1]} radius={0.015} castShadow><meshStandardMaterial color="#b98650" roughness={0.85} /></RoundedBox><mesh geometry={slats}><Painted rough={0.9} metal={0} /></mesh></>
}

function PoolSubs({ sub, liquid, ice, wreck, space }: XProps) {
  const stir = useRef(0.15)
  const grab = useLiftDrag(TOP5 - space.b, TOP5 - FLOOR, v => space.onMove(TOP5 - v), T_POOL, space.onEnd)
  const level = sub === 'ice' ? ice.level : sub === 'salvage' ? wreck.level : space.level
  const k = sub === 'salvage' ? 1.6 / Math.max(wreck.g, wreck.fBuoy) : 1.5 / (LIQUIDS[liquid].rho * G)
  const sMid = BRIM + space.b + 0.5
  return (
    <group>
      <Pool spout={false} />
      <Crane />
      <Hoist y={7.3} reading="0.00" />
      <Water levelY={BRIM + level} color={LIQUIDS[liquid].color} stir={stir} />
      {sub === 'ice' && <>
        {ice.side > 0.02 && <RoundedBox args={[ice.side, ice.side, ice.side]} radius={Math.min(0.06, ice.side * 0.2)} smoothness={4} position={[0, BRIM + ice.bottom + ice.side / 2, 0]}>
          <meshPhysicalMaterial color="#e6f6fc" transparent opacity={0.85} roughness={0.12} envMapIntensity={1.6} clearcoat={1} />
        </RoundedBox>}
        {/* 融化前的水面位置：池壁上一道黄线 */}
        <mesh position={[0, BRIM + ice.start, -HALF + 0.012]}><planeGeometry args={[POOL.side, 0.03]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>
        <mesh position={[HALF - 0.012, BRIM + ice.start, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[POOL.side, 0.03]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>
      </>}
      {sub === 'salvage' && <>
        <Wreck b={wreck.b} bags={wreck.bags} />
        <ForceArrow tip={[-1.3, BRIM + wreck.b + 0.4 - wreck.g * k, 0.75]} dir={[0, -1, 0]} len={wreck.g * k} color="#ff8a5c" />
        <ForceArrow tip={[1.3, BRIM + wreck.b + 0.4 + wreck.fBuoy * k, 0.75]} dir={[0, 1, 0]} len={wreck.fBuoy * k} color="#35c7b3" />
      </>}
      {sub === 'space' && <>
        <group {...grab} position={[0, sMid, 0]}><Crate /><mesh visible={false}><boxGeometry args={[1.4, 1.4, 1.4]} /></mesh></group>
        <ForceArrow tip={[-0.3, sMid - space.mass * space.g * k, 0.75]} dir={[0, -1, 0]} len={space.mass * space.g * k} color="#ff8a5c" />
        <ForceArrow tip={[0.3, sMid + space.fBuoy * k, 0.75]} dir={[0, 1, 0]} len={space.fBuoy * k} color="#35c7b3" />
      </>}
    </group>
  )
}

/** 工作台上的细量筒：把金块或王冠放进去，看水面升到哪 */
function CrownBench({ crown }: { crown: XProps['crown'] }) {
  const spin = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (spin.current) spin.current.rotation.y = clock.elapsedTime * 0.4 })
  const h = crown.ml * ML, base = BENCH + 0.012
  const gold = <meshStandardMaterial color="#e8b93c" metalness={1} roughness={0.25} envMapIntensity={1.4} />
  const y = base + 0.26 - crown.p * (0.26 - 0.022)              // 从量筒口上方落到筒底
  return (
    <group position={[MX, 0, MZ]}>
      <mesh position={[0, BENCH - 0.03, 0]} castShadow receiveShadow><boxGeometry args={[1.5, 0.06, 0.8]} /><meshStandardMaterial color="#6d757c" metalness={0.5} roughness={0.5} /></mesh>
      {[[-0.68, -0.33], [0.68, -0.33], [-0.68, 0.33], [0.68, 0.33]].map(([x, z], i) => <mesh key={i} position={[x, BENCH / 2 - 0.03, z]}><boxGeometry args={[0.05, BENCH - 0.06, 0.05]} /><meshStandardMaterial color="#3c4249" /></mesh>)}
      <mesh position={[0, BENCH + 0.006, 0]}><cylinderGeometry args={[0.05, 0.05, 0.012, 32]} /><meshStandardMaterial color="#cfd7de" metalness={0.3} roughness={0.4} /></mesh>
      <mesh position={[0, base + h / 2, 0]} renderOrder={2}><cylinderGeometry args={[CYL.r - 0.001, CYL.r - 0.001, h, 32]} /><meshBasicMaterial color="#2a8fb5" transparent opacity={0.6} depthWrite={false} /></mesh>
      <mesh position={[0, base + 0.11, 0]} renderOrder={3}><cylinderGeometry args={[CYL.r + 0.002, CYL.r + 0.002, 0.22, 32, 1, true]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {[base + 0.22, base + 0.001].map(t => <mesh key={t} position={[0, t, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[CYL.r + 0.002, 0.0015, 8, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.75} /></mesh>)}
      {/* 筒壁上的刻度：每 50 mL 一道 */}
      {[50, 100, 150, 200, 250, 300, 350, 400].map(v => <mesh key={v} position={[CYL.r + 0.003, base + v * ML, 0]}><boxGeometry args={[0.001, 0.0012, v % 100 ? 0.012 : 0.022]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      {crown.item && <group ref={spin} position={[0, y, 0]}>
        {crown.item === 'gold'
          ? <mesh castShadow><cylinderGeometry args={[0.019, 0.019, 0.044, 6]} />{gold}</mesh>
          : <>
              <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.017, 0.0045, 10, 32]} />{gold}</mesh>
              {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.cos(i * 1.047) * 0.017, 0.012, Math.sin(i * 1.047) * 0.017]}><coneGeometry args={[0.005, 0.02, 8]} />{gold}</mesh>)}
            </>}
      </group>}
    </group>
  )
}

export default function SceneX(props: XProps) {
  const { sub, liquid, ice, wreck, space, crown } = props
  const liq: Label = { id: 'liq', at: [HALF + 0.35, BRIM - 0.1, HALF + 0.2], className: 'scene-tag -translate-y-1/2', children: <><small>池里是</small>{LIQUIDS[liquid].name}</> }
  const labels: Label[] = sub === 'ice' ? [liq,
    { id: 'under', at: [0.65, BRIM + ice.bottom + ice.side * 0.4, 0.55], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: ice.side > 0.25 ? 1 : 0 }, children: <><small>水下</small>{Math.round(ice.under * 100)}%</> },
    { id: 'mark', at: [-HALF - 0.2, BRIM + ice.start, HALF + 0.15], ax: 1, className: 'scene-name -translate-y-1/2', children: '黄线：融化前的水面' },
  ] : sub === 'salvage' ? [liq,
    { id: 'fB', at: [1.5, BRIM + wreck.b + 1.2, 0.75], className: 'scene-tag key -translate-y-1/2', children: <><small>F浮</small>{kN(wreck.fBuoy)} kN</> },
    { id: 'fG', at: [-1.5, BRIM + wreck.b - 0.2, 0.75], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small style={{ color: '#d2542a' }}>G</small>{kN(wreck.g)} kN</> },
    { id: 'nBag', at: [0, BRIM + wreck.b + 2.5, 0], ax: 0.5, name: true, className: 'scene-name', children: `浮筒：每只 ${WRECK.bagV} m³` },
  ] : sub === 'space' ? [liq,
    { id: 'fB', at: [0.5, BRIM + space.b + 0.9, 0.75], className: 'scene-tag key -translate-y-1/2', children: <><small>F浮</small>{kN(space.fBuoy)} kN</> },
    { id: 'g', at: [-HALF - 0.2, BRIM + 0.4, HALF + 0.15], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>g</small>{space.g === 0 ? '≈ 0' : '9.8 N/kg'}</> },
  ] : [
    { id: 'ml', at: [MX + CYL.r + 0.012, BENCH + 0.012 + crown.ml * ML, MZ], className: 'scene-tag key -translate-y-1/2', children: <><small>水面</small>{crown.ml.toFixed(0)} mL</> },
    { id: 'nCyl', at: [MX - CYL.r - 0.01, BENCH + 0.2, MZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '量筒 · 原来有 200 mL 水' },
  ]
  const bench = sub === 'crown'
  return (
    <DockStage labels={labels} target={bench ? T_BENCH : T_POOL} span={bench ? S_BENCH : S_POOL} view={bench ? V_BENCH : undefined}>
      <PoolSubs {...props} />
      <CrownBench crown={crown} />
    </DockStage>
  )
}
