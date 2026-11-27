// 静电场实验室的大场景：一座喷码机工厂的装配测试车间。钢结构厂房，环氧地坪上画着黄色通道线；
// 北墙前一条包装输送线，纸箱在辊道上排队，线上架着一台喷码机；车间中间一排防静电实验台，从西到东是各课的器材（位置见 layout.ts）。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。当前这一课的器材由那一课自己画，别的课的按静止的样子画。
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Led, Metal, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { HALL, LINE_Z, SPOT, ST, type SpotKey, type StKey } from './layout'
import { makeCarton, makeCladding, makeFloor, makeHazard, makeText, rep } from './mats'
import type { V3 } from './physics'
import { Bench, Cable } from './gear'
import { IDLE } from './idle'

/** 每一课交给世界的要求：工作灯照哪；哪一处器材由这一课自己画 */
export interface Want { light: V3; aim: V3; cur: StKey | 'q' }
export function Place({ at, cur, labels, bloom = 0.7, children = null }: { at: SpotKey; cur: StKey | 'q'; labels: Label[]; bloom?: number; children?: ReactNode }) {
  const v = SPOT[at]
  const w = useMemo<Want>(() => ({ light: v.light, aim: v.target.toArray() as V3, cur }), [v, cur])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sky={false} backdrop="#0b0e11" studio env={0.62} sun={0.45} fog={at === 'q' ? [40, 200] : [5, 42]} bloom={bloom} world={w}>{children}</LabStage>
}

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: [number, number, number]): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
const H = HALL, CX = (H.x0 + H.x1) / 2, CZ = (H.z0 + H.z1) / 2, LEN = H.x1 - H.x0, DEP = H.z1 - H.z0
/** 输送线的范围和辊面高度 */
const CONV = { x0: -17, x1: 21.5, y: 0.78, w: 0.62 }

/** 钢结构：北墙和南墙两排 H 型钢柱、屋架、檩条、墙上的电缆桥架 */
function frameParts() {
  const P: Part[] = [], c = '#44505a'
  for (let x = H.x0 + 1.5; x <= H.x1 - 1; x += 6) {
    for (const z of [H.z0 + 0.25]) P.push(box(x, 0, z, 0.3, H.h - 0.5, 0.03, c), box(x - 0.14, 0, z, 0.02, H.h - 0.5, 0.3, c), box(x + 0.14, 0, z, 0.02, H.h - 0.5, 0.3, c))
    P.push(box(x, H.h - 1.4, CZ, 0.18, 0.2, DEP, '#4d5862'), box(x, H.h - 0.5, CZ, 0.18, 0.2, DEP, '#4d5862'))
    for (let k = 0; k <= 10; k++) { const z = H.z0 + k * DEP / 10; P.push(box(x, H.h - 1.3, z, 0.07, 0.8, 0.07, '#4d5862')); if (k < 10) P.push({ p: [x, H.h - 0.85, z + DEP / 20], s: [0.05, 1.1, 0.05], c: '#4d5862', r: [k % 2 ? 0.95 : -0.95, 0, 0] }) }
  }
  for (let k = 0; k <= 10; k++) P.push(box(CX, H.h - 0.3, H.z0 + k * DEP / 10, LEN, 0.14, 0.1, '#4d5862'))
  P.push(box(CX, 4.6, H.z0 + 0.5, LEN - 2, 0.1, 0.4, '#8f979c'))   // 电缆桥架
  for (let x = H.x0 + 4.5; x < H.x1; x += 6) P.push(box(x, 4.2, H.z0 + 0.5, 0.04, 0.4, 0.04, '#6f777c'))
  return P
}
/** 北墙：下面一截刷漆的墙裙，上面彩钢板，中间一条高窗（窗框） */
function wallParts() {
  const P: Part[] = []
  P.push(box(CX, 0, H.z0 - 0.02, LEN, 1.3, 0.12, '#7d8a86'), box(CX, 1.3, H.z0 - 0.02, LEN, 0.06, 0.16, '#c9c7bd'))
  for (let x = H.x0 + 1.5; x < H.x1 - 1; x += 1.5) P.push(box(x, 5.4, H.z0 + 0.06, 0.06, 1.7, 0.08, '#dfe3e4'))
  P.push(box(CX, 5.36, H.z0 + 0.06, LEN - 2, 0.07, 0.1, '#dfe3e4'), box(CX, 7.08, H.z0 + 0.06, LEN - 2, 0.07, 0.1, '#dfe3e4'), box(CX, 6.2, H.z0 + 0.06, LEN - 2, 0.04, 0.08, '#dfe3e4'))
  return P
}
/** 输送线的机架：两条侧梁、腿和横撑、侧面的护栏；一头一只电机 */
function conveyorParts() {
  const P: Part[] = [], z = LINE_Z, c = '#b9bfc3'
  for (const s of [-1, 1]) P.push(box((CONV.x0 + CONV.x1) / 2, CONV.y - 0.09, z + s * (CONV.w / 2 + 0.02), CONV.x1 - CONV.x0, 0.12, 0.035, c), box((CONV.x0 + CONV.x1) / 2, CONV.y + 0.09, z + s * (CONV.w / 2 + 0.03), CONV.x1 - CONV.x0, 0.02, 0.02, '#8d9499'))
  for (let x = CONV.x0 + 0.3; x <= CONV.x1; x += 1.6) {
    for (const s of [-1, 1]) P.push(box(x, 0, z + s * (CONV.w / 2 + 0.02), 0.05, CONV.y - 0.09, 0.05, '#39424a'), box(x, 0, z + s * (CONV.w / 2 + 0.02), 0.1, 0.012, 0.1, '#22272b'), box(x, CONV.y + 0.03, z + s * (CONV.w / 2 + 0.03), 0.02, 0.07, 0.02, '#8d9499'))
    P.push(box(x, 0.25, z, 0.04, 0.04, CONV.w, '#39424a'))
  }
  P.push(box(CONV.x0 + 0.5, CONV.y - 0.42, z + CONV.w / 2 + 0.18, 0.34, 0.24, 0.22, '#2c6fb0'), { p: [CONV.x0 + 0.5, CONV.y - 0.3, z + CONV.w / 2 + 0.02], s: [0.07, 0.2, 0], c: '#30373d', cyl: true, r: [Math.PI / 2, 0, 0] })
  return P
}
/** 车间里的杂物：靠北墙的托盘上码着纸箱，货架，两只电控柜，一辆手推车；让车间不空 */
function propParts() {
  const P: Part[] = [], kraft = ['#b08a5a', '#a98252', '#b89263']
  for (const [x0, n] of [[-15, 3], [-7.5, 2], [2.5, 3], [16.5, 2]] as const) {   // 托盘和纸箱垛
    const z = H.z0 + 1.2
    P.push(box(x0, 0, z, 1.2, 0.03, 1.0, '#8a6a3f'), box(x0, 0.11, z, 1.2, 0.03, 1.0, '#8a6a3f'))
    for (const dx of [-0.5, 0, 0.5]) P.push(box(x0 + dx, 0.03, z, 0.1, 0.08, 1.0, '#7a5c36'))
    for (let j = 0; j < n; j++) for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) if (!(j === n - 1 && i === 2 && k === 1)) P.push(box(x0 - 0.4 + i * 0.4, 0.14 + j * 0.31, z - 0.24 + k * 0.48, 0.385, 0.3, 0.46, kraft[(i + j + k) % 3]))
  }
  for (const x0 of [-11.5, 9.5]) {   // 货架：四根立柱、三层层板，上面码着料盒
    const z = H.z0 + 0.75
    for (const dx of [-1, 1]) for (const dz of [-0.25, 0.25]) P.push(box(x0 + dx, 0, z + dz, 0.05, 2.4, 0.05, '#2f5f9e'))
    for (let j = 0; j < 4; j++) {
      P.push(box(x0, 0.2 + j * 0.7, z, 2.05, 0.04, 0.55, '#d9822b'))
      if (j < 3) for (let i = 0; i < 5; i++) P.push(box(x0 - 0.8 + i * 0.4, 0.24 + j * 0.7, z, 0.32, 0.2 + ((i * 7 + j * 3) % 3) * 0.06, 0.42, ['#3b6fb5', '#b9bfc3', '#3f8f5a', '#c9a13a'][(i + j * 2) % 4]))
    }
  }
  for (const x0 of [-3.2, 20.5]) {   // 电控柜
    const z = H.z0 + 0.55
    P.push(box(x0, 0, z, 0.8, 2.0, 0.5, '#c9ced1'), box(x0, 0.06, z + 0.251, 0.74, 1.88, 0.004, '#d7dbdd'), box(x0 + 0.3, 1.0, z + 0.256, 0.02, 0.22, 0.012, '#30363b'), box(x0 - 0.18, 1.55, z + 0.256, 0.22, 0.14, 0.006, '#1c2226'))
    for (let j = 0; j < 3; j++) P.push(box(x0 + 0.08 + j * 0.07, 1.6, z + 0.256, 0.03, 0.03, 0.01, ['#3ad37a', '#e8b13a', '#d5483c'][j]))
  }
  // 手推车：停在通道边
  P.push(box(-17.2, 0.16, 3.2, 0.9, 0.03, 0.6, '#3a6f9f'), box(-17.63, 0.19, 3.2, 0.03, 0.75, 0.03, '#9aa1a6'), box(-17.63, 0.92, 3.2, 0.03, 0.03, 0.6, '#9aa1a6'), box(-17.2, 0.19, 3.2, 0.36, 0.28, 0.42, '#b08a5a'))
  for (const dx of [-0.36, 0.36]) for (const dz of [-0.24, 0.24]) P.push({ p: [-17.2 + dx, 0.07, 3.2 + dz], s: [0.07, 0.04, 0], c: '#1d1f21', cyl: true, r: [Math.PI / 2, 0, 0] })
  return P
}

/** 辊道上的一排辊子 */
function Rollers() {
  const ref = useRef<THREE.InstancedMesh>(null), n = Math.floor((CONV.x1 - CONV.x0) / 0.11)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), s = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < n; i++) ref.current?.setMatrixAt(i, m.compose(new THREE.Vector3(CONV.x0 + 0.06 + i * 0.11, CONV.y - 0.03, LINE_Z), q, s))
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [n])
  return <instancedMesh ref={ref} args={[undefined, undefined, n]} receiveShadow><cylinderGeometry args={[0.03, 0.03, CONV.w, 14]} /><Metal kind="steel" grain="brushed" rough={0.4} env={0.6} /></instancedMesh>
}

/** 输送线上的喷码机：白色机柜（屏幕、墨盒门）立在线边，一根软管通到架在辊道上方的打印头 */
function Printer({ x }: { x: number }) {
  const z = LINE_Z + 0.95
  return <group>
    <group position={[x, 0, z]}>
      {[-0.18, 0.18].flatMap(dx => [-0.14, 0.14].map(dz => <mesh key={`${dx}${dz}`} position={[dx, 0.3, dz]} castShadow><boxGeometry args={[0.035, 0.6, 0.035]} /><meshStandardMaterial color="#aeb4b8" roughness={0.5} metalness={0.5} /></mesh>))}
      <RoundedBox args={[0.46, 0.58, 0.36]} radius={0.02} smoothness={3} position={[0, 0.9, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e9ecec" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      <RoundedBox args={[0.47, 0.1, 0.37]} radius={0.02} smoothness={3} position={[0, 1.14, 0]}><meshPhysicalMaterial color="#1d5fa8" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      <Led text="E7" w={0.2} h={0.12} position={[-0.08, 0.98, 0.1815]} />
      <mesh position={[0.11, 0.8, 0.1812]}><planeGeometry args={[0.16, 0.2]} /><meshStandardMaterial color="#cfd4d6" roughness={0.5} /></mesh>
    </group>
    {/* 打印头：不锈钢圆筒，架在辊道北侧的支架上，口朝纸箱 */}
    <mesh position={[x - 0.9, 0.62, LINE_Z - 0.42]} castShadow><boxGeometry args={[0.04, 1.24, 0.04]} /><meshStandardMaterial color="#aeb4b8" roughness={0.5} metalness={0.5} /></mesh>
    <mesh position={[x - 0.9, 1.06, LINE_Z - 0.34]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.022, 0.022, 0.2, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <Cable r={0.012} color="#2b2f33" pts={[[x - 0.1, 1.2, z - 0.1], [x - 0.3, 1.75, z - 0.5], [x - 0.75, 1.7, LINE_Z - 0.2], [x - 0.9, 1.3, LINE_Z - 0.5], [x - 0.9, 1.08, LINE_Z - 0.44]]} />
  </group>
}

/** 跟着这一课走的工作灯：从器材左前上方照下来 */
function Key({ at, aim }: { at: V3; aim: V3 }) {
  const light = useRef<THREE.SpotLight>(null), target = useMemo(() => new THREE.Object3D(), [])
  const cur = useRef(new THREE.Vector3(...at)), look = useRef(new THREE.Vector3(...aim))
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const k = 1 - Math.exp(-Math.min(d, 1 / 30) / 0.5)
    cur.current.lerp(new THREE.Vector3(...at), k); look.current.lerp(new THREE.Vector3(...aim), k)
    l.position.copy(cur.current); target.position.copy(look.current); target.updateMatrixWorld()
  })
  return <>
    <primitive object={target} />
    <spotLight ref={light} target={target} angle={0.6} penumbra={0.85} intensity={30} distance={12} decay={1.4} color="#fff2e0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} />
  </>
}

export function World({ light = [ST.l1 - 1.3, 3.8, 2.2], aim = [ST.l1, 1.1, 0], cur = 'l1' }: Partial<Want>) {
  const tex = useMemo(() => ({
    floor: rep(makeFloor(), (LEN + 30) / 5, (DEP + 24) / 5), haz: rep(makeHazard(), 60, 1),
    clad: rep(makeCladding('#66727a'), LEN / 2, 1), cladSide: rep(makeCladding('#586269'), DEP / 2, 1),
    sign: makeText(['喷码机装配测试车间'], { w: 1024, h: 150, bg: '#1b5a8f', fg: '#ffffff', size: 78 }),
    esd: makeText(['静电防护区'], { w: 512, h: 128, bg: '#f2c419', fg: '#1a1a1a', size: 60, weight: 700 }),
  }), [])
  const geo = useMemo(() => ({ frame: mergeParts(frameParts()), wall: mergeParts(wallParts()), conv: mergeParts(conveyorParts()), props: mergeParts(propParts()) }), [])
  const cartons = useMemo(() => Array.from({ length: 13 }, (_, i) => ({ x: CONV.x0 + 1.6 + i * 2.9, tex: makeCarton(`LOT 2611${String(i + 10)}  EXP 2027-11`), rot: ((i * 37) % 7 - 3) * 0.012 })), [])
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#3a3833', 0.2]} />
      <Key at={light} aim={aim} />
      {[-14, -5, 4, 13, 21].map(x => <pointLight key={x} position={[x, 7.4, 2]} intensity={cur === 'q' ? 26 : 8} distance={24} decay={1.3} color="#fdf3e2" />)}
      {/* 屋架下的工矿灯 */}
      {[-16.5, -10.5, -4.5, 1.5, 7.5, 13.5, 19.5].flatMap(x => [-2.5, 4.5].map(z => <group key={`${x}${z}`} position={[x, H.h - 1.75, z]}>
        <mesh><cylinderGeometry args={[0.2, 0.3, 0.26, 24, 1, true]} /><meshStandardMaterial color="#6e767c" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.12, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[0.27, 24]} /><meshBasicMaterial color="#fff7e6" toneMapped={false} side={THREE.DoubleSide} /></mesh>
      </group>))}
      {/* 地坪、通道线、实验台区的黄黑警示边 */}
      <mesh rotation-x={-Math.PI / 2} position={[CX, 0, CZ + 4]} receiveShadow><planeGeometry args={[LEN + 30, DEP + 24]} /><meshPhysicalMaterial map={tex.floor} color="#aeb6b3" roughness={0.4} clearcoat={0.4} clearcoatRoughness={0.35} /></mesh>
      {[-1.9, 1.6].map(z => <mesh key={z} rotation-x={-Math.PI / 2} position={[CX, 0.002, z]}><planeGeometry args={[LEN - 2, 0.08]} /><meshStandardMaterial color="#e0b21c" roughness={0.6} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[CX, 0.002, LINE_Z + 0.95]}><planeGeometry args={[LEN - 2, 0.1]} /><meshStandardMaterial map={tex.haz} roughness={0.6} /></mesh>
      {/* 北墙：墙裙、高窗（外面的天光）、彩钢板、厂名牌；两头的山墙和屋面 */}
      <mesh geometry={geo.wall} receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
      <mesh position={[CX, 3.35, H.z0]}><planeGeometry args={[LEN, 4.1]} /><meshStandardMaterial map={tex.clad} color="#aab3b9" roughness={0.6} metalness={0.3} /></mesh>
      <mesh position={[CX, 6.25, H.z0 + 0.02]}><planeGeometry args={[LEN - 2, 1.7]} /><meshBasicMaterial color="#7f97a8" /></mesh>
      <mesh position={[CX, 8.3, H.z0]}><planeGeometry args={[LEN, 2.4]} /><meshStandardMaterial map={tex.clad} color="#aab3b9" roughness={0.6} metalness={0.3} /></mesh>
      <mesh position={[-1, 3.7, H.z0 + 0.03]}><planeGeometry args={[5.4, 0.8]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
      <mesh position={[12.2, 2.3, H.z0 + 0.03]}><planeGeometry args={[1.6, 0.4]} /><meshStandardMaterial map={tex.esd} roughness={0.6} /></mesh>
      {[H.x0 - 0.3, H.x1 + 0.3].map((x, i) => <mesh key={i} position={[x, H.h / 2, CZ]} rotation-y={i ? -Math.PI / 2 : Math.PI / 2}><planeGeometry args={[DEP + 2, H.h]} /><meshStandardMaterial map={tex.cladSide} color="#98a1a7" roughness={0.6} metalness={0.3} /></mesh>)}
      <mesh position={[CX, H.h + 0.05, CZ]} rotation-x={Math.PI / 2}><planeGeometry args={[LEN + 2, DEP + 2]} /><meshStandardMaterial color="#3d444a" roughness={0.8} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.frame} castShadow receiveShadow><Painted rough={0.55} metal={0.35} /></mesh>
      <mesh geometry={geo.props} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
      {/* 包装输送线：机架、辊子、排队的纸箱、喷码机 */}
      <mesh geometry={geo.conv} castShadow receiveShadow><Painted rough={0.5} metal={0.45} /></mesh>
      <Rollers />
      {cartons.map((c, i) => <mesh key={i} position={[c.x, CONV.y + 0.15, LINE_Z]} rotation-y={c.rot} castShadow receiveShadow><boxGeometry args={[0.42, 0.3, 0.32]} /><meshStandardMaterial map={c.tex} roughness={0.85} /></mesh>)}
      <Printer x={16.2} /><Printer x={-6.3} />
      {/* 实验台和各课的器材：当前这一课自己画，别的按静止的样子画 */}
      {(Object.keys(ST) as StKey[]).map(k => <group key={k} position={[ST[k], 0, 0]}><Bench /></group>)}
      {(Object.keys(IDLE) as StKey[]).filter(k => k !== cur).map(k => <group key={k}>{IDLE[k]?.()}</group>)}
    </group>
  )
}
