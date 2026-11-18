// 第 3 课的三维场景：材料试验间。并排三只液槽（淡水、海水、柴油），头顶的行车把物块吊到其中一只上方再放下去。
// 舞台、吊秤、水体等通用部件在 dock.tsx。所有会动的东西都由 physics.ts 的计算结果驱动。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LIQUIDS3, MATS, POOL, TANK3, kN, maxDrop3, type Lesson3Result, type Liquid3Key, type MatKey } from './physics'
import { BRIM, DockStage, ForceArrow, Hoist, JIB_Y, Painted, Rod, STEEL, Water, YELLOW, mergeParts, useConcrete, useLiftDrag, type Label, type Part } from './dock'

const TARGET = new THREE.Vector3(0.2, 3.1, 0)
const SPAN: [number, number] = [10.6, 11.4]
const VIEW: [number, number] = [-0.3, 0.17]
const PER_KN = 0.022, AX = 0.3, AZ = 0.75
const C_G = '#ff8a5c', C_B = '#35c7b3', C_T = '#f3f1ea'
const ORDER: Liquid3Key[] = ['fresh', 'sea', 'diesel']
const PITCH = TANK3.side + 0.5                       // 相邻两只液槽中心的距离
const tankX = (k: Liquid3Key) => (ORDER.indexOf(k) - 1) * PITCH
const H = TANK3.side / 2, TOP = BRIM + 0.1           // 液槽内部半宽、槽口高度
const HALL = { w: 34, d: 9, h: 12.5 }                // 试验间：宽、后墙离液槽多远、净高

function layout(r: Lesson3Result) {
  const bottom = BRIM + r.bottom, top = bottom + 1, hookY = top + 0.75
  return { bottom, top, mid: bottom + 0.5, hookY, scaleY: hookY + 0.42, levelY: BRIM + r.level, lenG: r.g / 1000 * PER_KN, lenB: r.fBuoy / 1000 * PER_KN, lenT: r.fPull / 1000 * PER_KN }
}

/** 行车小车的位置：换液槽时匀速平移过去 */
function useSlide(to: number, speed = 3.2) {
  const [x, setX] = useState(to), cur = useRef(to)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const d = to - cur.current
      cur.current = Math.abs(d) <= speed * dt ? to : cur.current + Math.sign(d) * speed * dt
      setX(cur.current)
      if (cur.current !== to) raf = requestAnimationFrame(frame)
    }
    if (cur.current !== to) raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [to, speed])
  return x
}

/** 试验间：地面、三面墙、高窗、屋架、立柱。墙只画朝里的一面，转到外面看也不挡视线 */
function Hall() {
  const [d, n, r] = useConcrete(9, 5)
  const { w, d: back, h } = HALL, front = 16
  const steel = useMemo(() => {
    const P: Part[] = []
    // 立柱和屋架
    for (let i = -2; i <= 2; i++) {
      const x = i * 8
      P.push({ p: [x, h / 2, -back + 0.25], s: [0.4, h, 0.4], c: '#56616b' })
      P.push({ p: [x, h - 0.5, (front - back) / 2], s: [0.3, 0.5, front + back], c: '#56616b' })
      for (let k = 0; k < 5; k++) P.push({ p: [x, h - 1.3, -back + 2.5 + k * 5], s: [0.12, 1.3, 0.12], c: '#56616b' })
      P.push({ p: [x, h - 2, (front - back) / 2], s: [0.2, 0.2, front + back], c: '#56616b' })
    }
    // 墙根的管线和配电箱
    P.push({ p: [0, 3.2, -back + 0.2], s: [w - 1, 0.14, 0.14], c: '#b9502f' }, { p: [0, 3.5, -back + 0.2], s: [w - 1, 0.1, 0.1], c: '#2f6f8f' })
    P.push({ p: [-12.5, 1.6, -back + 0.25], s: [1.2, 1.8, 0.4], c: '#7b838b' }, { p: [12, 1.3, -back + 0.3], s: [2.4, 2.6, 0.5], c: '#3f7d5a' })
    // 地面标线：液槽作业区的黄框和一条通道
    const y = 0.012
    P.push({ p: [0, y, H + 2.6], s: [PITCH * 3 + 2.4, 0.012, 0.16], c: '#e4b524' }, { p: [0, y, -H - 1.6], s: [PITCH * 3 + 2.4, 0.012, 0.16], c: '#e4b524' })
    for (const s of [-1, 1]) P.push({ p: [s * (PITCH * 1.5 + 1.2), y, 0.5], s: [0.16, 0.012, TANK3.side + 4.2], c: '#e4b524' })
    for (let i = 0; i < 9; i++) P.push({ p: [-14 + i * 3.5, y, 8], s: [1.8, 0.012, 0.16], c: '#e9e6dc' })
    return mergeParts(P)
  }, [w, back, h])
  // 备用的试样：靠墙的托盘上放着另外两种材料的方块和几只桶
  const stock = useMemo(() => {
    const P: Part[] = []
    for (const [x, c] of [[-9.4, '#b9b4a8'], [-7.9, '#aeb6be']] as const) P.push({ p: [x, 0.08, -back + 2], s: [1.3, 0.16, 1.3], c: '#8a6a45' }, { p: [x, 0.66, -back + 2], s: [1, 1, 1], c })
    for (const [x, z, c] of [[8.2, -back + 1.4, '#b53a2b'], [8.9, -back + 1.6, '#2d5f8a'], [8.5, -back + 2.2, '#c79a2e']] as const) P.push({ p: [x, 0.45, z], s: [0.29, 0.9, 0.29], c, cyl: true })
    return mergeParts(P)
  }, [back])
  const wall = <meshStandardMaterial color="#c3c8cc" roughness={0.85} />
  const dado = <meshStandardMaterial color="#3c5964" roughness={0.8} />
  const pane = <meshBasicMaterial color="#dbe9f2" toneMapped={false} />
  return (
    <group>
      <mesh position={[0, 0, (front - back) / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[w, front + back]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#b9bab4" envMapIntensity={0.6} /></mesh>
      {/* 后墙：下面一截墙裙，上面一排高窗 */}
      <mesh position={[0, h / 2, -back]}><planeGeometry args={[w, h]} />{wall}</mesh>
      <mesh position={[0, 1.4, -back + 0.01]}><planeGeometry args={[w, 2.8]} />{dado}</mesh>
      {[-12, -4, 4, 12].map(x => <mesh key={x} position={[x, 8.2, -back + 0.02]}><planeGeometry args={[6.2, 3]} />{pane}</mesh>)}
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[s * w / 2, h / 2, (front - back) / 2]} rotation-y={-s * Math.PI / 2}><planeGeometry args={[front + back, h]} />{wall}</mesh>
        <mesh position={[s * (w / 2 - 0.01), 1.4, (front - back) / 2]} rotation-y={-s * Math.PI / 2}><planeGeometry args={[front + back, 2.8]} />{dado}</mesh>
      </group>)}
      <mesh position={[0, h, (front - back) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[w, front + back]} /><meshStandardMaterial color="#6d757c" roughness={0.9} /></mesh>
      <mesh geometry={steel} receiveShadow><Painted rough={0.7} metal={0.3} /></mesh>
      <mesh geometry={stock} castShadow receiveShadow><Painted rough={0.7} metal={0.3} /></mesh>
    </group>
  )
}

/** 三只液槽的钢架、底座和深色内衬；还有横跨三只槽的行车梁 */
function Rig3() {
  const geo = useMemo(() => {
    const P: Part[] = [], o = H + 0.07
    for (const k of ORDER) {
      const x = tankX(k)
      P.push({ p: [x, POOL.floor / 2, 0], s: [TANK3.side + 0.3, POOL.floor, TANK3.side + 0.3], c: '#4a5058' })
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ p: [x + sx * o, TOP / 2, sz * o], s: [0.14, TOP, 0.14], c: STEEL })
      for (const sz of [-1, 1]) P.push({ p: [x, TOP - 0.05, sz * o], s: [TANK3.side + 0.28, 0.1, 0.14], c: STEEL })
      for (const sx of [-1, 1]) P.push({ p: [x + sx * o, TOP - 0.05, 0], s: [0.14, 0.1, TANK3.side + 0.28], c: STEEL })
    }
    // 行车：两头的门架和一根横梁
    const half = PITCH * 1.5 + 0.9
    for (const s of [-1, 1]) {
      for (const z of [-1.3, 1.3]) P.push({ p: [s * half, (JIB_Y + 0.2) / 2, z], s: [0.3, JIB_Y + 0.2, 0.3], c: YELLOW })
      P.push({ p: [s * half, JIB_Y + 0.35, 0], s: [0.4, 0.4, 3.2], c: YELLOW }, { p: [s * half, 0.12, 0], s: [0.9, 0.24, 3.6], c: '#3c4249' })
    }
    P.push({ p: [0, JIB_Y + 0.25, 0], s: [half * 2 + 0.4, 0.5, 0.42], c: YELLOW })
    return mergeParts(P)
  }, [])
  const dark = <meshStandardMaterial color="#173a44" roughness={0.9} />
  const hgt = TOP - POOL.floor
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow><Painted metal={0.45} rough={0.5} /></mesh>
      {ORDER.map(k => <group key={k} position={[tankX(k), 0, 0]}>
        <mesh position={[0, POOL.floor + hgt / 2, -H]}><planeGeometry args={[TANK3.side, hgt]} />{dark}</mesh>
        <mesh position={[-H, POOL.floor + hgt / 2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[TANK3.side, hgt]} />{dark}</mesh>
        <mesh position={[H, POOL.floor + hgt / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[TANK3.side, hgt]} />{dark}</mesh>
        <mesh position={[0, POOL.floor + 0.006, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[TANK3.side, TANK3.side]} /><meshStandardMaterial color="#1b414b" roughness={0.85} /></mesh>
        <mesh position={[0, POOL.floor + hgt / 2, H + 0.02]} renderOrder={4}><planeGeometry args={[TANK3.side, hgt]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} /></mesh>
      </group>)}
    </group>
  )
}

interface SceneProps { r: Lesson3Result; mat: MatKey; liquid: Liquid3Key; drop: number; onDrop: (v: number) => void; dragHint?: boolean }

function Apparatus({ r, mat, liquid, drop, onDrop, x }: SceneProps & { x: number }) {
  const L = layout(r), m = MATS[mat]
  const [cd, cn, cr] = useConcrete(0.6, 0.6)
  const grab = useLiftDrag(drop, maxDrop3(), onDrop, TARGET)
  const stir = useRef(0), still = useRef(0), last = useRef(drop)
  useFrame((_, dt) => {
    const moved = Math.abs(drop - last.current); last.current = drop
    stir.current = Math.min(1, Math.max(0, stir.current - dt * 0.6) + (r.wet > 0.005 ? moved * 4 : 0))
  })
  const chain = <meshStandardMaterial color="#3a3f45" roughness={0.5} metalness={0.7} />
  const corners: [number, number][] = [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]
  return (
    <group>
      <Hall />
      <Rig3 />
      {ORDER.map(k => <group key={k} position={[tankX(k), 0, 0]}>
        <Water side={TANK3.side} levelY={k === liquid ? L.levelY : BRIM - 0.3} color={LIQUIDS3[k].color} stir={k === liquid ? stir : still} />
      </group>)}
      <group position={[x, 0, 0]}>
        <mesh position={[0, JIB_Y - 0.12, 0]} castShadow><boxGeometry args={[0.7, 0.3, 0.7]} /><meshStandardMaterial color="#3c4249" metalness={0.4} roughness={0.5} /></mesh>
        <group {...grab}>
          <Hoist y={L.scaleY} reading={kN(r.fPull)} />
          {corners.map(([cx, cz], i) => <Rod key={i} from={[cx, L.top + 0.03, cz]} to={[0, L.hookY - 0.05, 0]} r={0.018}>{chain}</Rod>)}
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
    </group>
  )
}

export default function Scene3(props: SceneProps) {
  const { r, mat, liquid } = props, L = layout(r)
  const x = useSlide(tankX(liquid))
  const labels: Label[] = [
    { id: 'pull', at: [x - 0.55, L.scaleY + 0.1, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>吊秤</small>{kN(r.fPull)} kN{r.fBuoy > 5 && <span className="delta eq">−{kN(r.fBuoy)}</span>}</> },
    { id: 'fB', at: [x + AX + 0.2, L.mid + Math.max(0.12, L.lenB / 2), AZ], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: r.fBuoy > 5 ? 1 : 0 }, children: <><small>F浮</small>{kN(r.fBuoy)} kN</> },
    { id: 'fG', at: [x - AX - 0.25, L.mid - Math.min(L.lenG, 1.1), AZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small style={{ color: '#d2542a' }}>G</small>{kN(r.g)} kN</> },
    ...ORDER.map((k): Label => ({ id: `t${k}`, at: [tankX(k), 0.62, H + 0.2], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: k === liquid ? 1 : 0.62 }, children: <>{LIQUIDS3[k].name}<small style={{ marginLeft: 6, marginRight: 0 }}>{(LIQUIDS3[k].rho / 1000).toFixed(2)}</small></> })),
    { id: 'nItem', at: [x + 0.75, L.top + 0.3, 0], name: true, className: 'scene-name -translate-y-1/2', children: `${MATS[mat].name}块 · 1 m³` },
    { id: 'drag', at: [x - 1.9, L.mid, 0.5], className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 可以上下拖</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN} view={VIEW} indoor backdrop="#22282d"><Apparatus {...props} x={x} /></DockStage>
}
