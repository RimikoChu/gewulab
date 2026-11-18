// 压强 · 拓展课的三维场景：四个小实验，各在水电站里的一处。
// 半球在引水渠右边的空地；下潜在大坝脚下的深水里；烧水在坝顶和雪山顶；千斤顶在工地边上。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BALL, BOIL, JACK, kN, kPa, pWater, tonPerM2, type SpotKey } from './physics'
import { CREST, DEEP, PEAK, ST, WY } from './hydro'
import { ForceArrow, LabStage, Painted, Rod, mergeParts, useConcrete, useLiftDrag, type Label, type Part } from '@/lab-kit'

export type Sub = 'ball' | 'dive' | 'boil' | 'jack'
const XB = 198, ZB = -4                                    // 半球
const XD = ST.dam + 42, ZD = -7                            // 下潜
const STOVE: Record<SpotKey, [number, number, number]> = { crest: [CREST.x - 2.9, CREST.y, -4], peak: [PEAK.x - 2.9, PEAK.y, PEAK.z] }
const XJ = 93.5, ZJ = -2.4                                     // 千斤顶
const T = {
  ball: new THREE.Vector3(XB, 1.25, ZB), dive: new THREE.Vector3(XD - 6, DEEP + 52, ZD), jack: new THREE.Vector3(XJ + 0.2, 1.1, ZJ),
  crest: new THREE.Vector3(STOVE.crest[0], STOVE.crest[1] + 1.05, STOVE.crest[2]), peak: new THREE.Vector3(STOVE.peak[0], STOVE.peak[1] + 1.05, STOVE.peak[2]),
}
const SPANS: Record<Sub, [number, number]> = { ball: [5.4, 3.2], dive: [150, 124], boil: [2.2, 1.8], jack: [5, 3.4] }

export interface XProps {
  sub: Sub
  ball: { vac: number; pull: number; open: number }
  dive: { h: number; onH: (m: number) => void }
  boil: { spot: SpotKey; lid: boolean; temp: number; boiling: boolean }
  jack: { push: number; lift: number }
}

/** 马德堡半球：两只铜半球扣在一起，两头各一台卷扬机往外拉 */
function Ball({ vac, pull, open }: XProps['ball']) {
  const frame = useMemo(() => {
    const P: Part[] = []
    for (const s of [-1, 1]) { P.push({ p: [s * 2.1, 0.5, 0], s: [0.9, 1, 0.9], c: '#3c4249' }, { p: [s * 2.1, 1.25, 0], s: [0.5, 0.5, 0.6], c: '#e8b21e' }, { p: [s * 1.82, 1.25, 0], s: [0.2, 0.06, 0.2], c: '#8d949c', cyl: true, r: [0, 0, Math.PI / 2] }) }
    P.push({ p: [0, 0.03, 0], s: [5.6, 0.06, 1.6], c: '#b7b5ab' }, { p: [0, 0.45, -0.5], s: [0.5, 0.9, 0.4], c: '#3f5a66' }, { p: [0, 0.95, -0.5], s: [0.16, 0.1, 0.16], c: '#22262a', cyl: true })
    return mergeParts(P)
  }, [])
  const bronze = <meshStandardMaterial color="#b98a3e" metalness={1} roughness={0.3} envMapIntensity={1.3} side={THREE.DoubleSide} />
  const R = BALL.r * 1.6                                   // 画大一点才看得清
  return (
    <group position={[XB, 0, ZB]}>
      <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
      {[-1, 1].map(s => <group key={s} position={[s * open * 0.5, 1.25, 0]}>
        <mesh rotation-z={s * Math.PI / 2} castShadow><sphereGeometry args={[R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />{bronze}</mesh>
        <mesh position={[s * 0.012, 0, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[R, 0.025, 10, 48]} />{bronze}</mesh>
        <mesh position={[s * (R + 0.06), 0, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.07, 0.02, 10, 24]} /><meshStandardMaterial color="#30353b" metalness={0.8} roughness={0.4} /></mesh>
        <Rod from={[s * (R + 0.12), 0, 0]} to={[s * (1.72 - s * 0 - open * 0.5), 0, 0]} r={0.014}><meshStandardMaterial color="#22262a" metalness={0.6} roughness={0.5} /></Rod>
      </group>)}
      {/* 抽气管：从抽气机接到球上 */}
      {open < 0.05 && <Rod from={[0, 0.98, -0.5]} to={[0, 1.25, -R + 0.02]} r={0.012}><meshStandardMaterial color="#22262a" /></Rod>}
      {/* 外面的大气把两个半球往中间压；里面剩多少气，就往外顶多少 */}
      {open < 0.05 && [-1, 1].map(s => <ForceArrow key={s} tip={[s * (R + 0.02), 1.25 + 0.42, 0.3]} dir={[-s, 0, 0]} len={0.2 + 0.5 * vac} color="#35c7b3" />)}
      {pull > 0 && [-1, 1].map(s => <ForceArrow key={s} tip={[s * (1.1 + pull / BALL.max * 0.5), 1.25 - 0.42, 0.3]} dir={[s, 0, 0]} len={pull / BALL.max * 0.9} color="#ff8a5c" />)}
    </group>
  )
}

/** 小潜水器：橙色的耐压球壳，前面一扇圆观察窗 */
function Sub({ h, onH }: XProps['dive']) {
  const y = WY - h, grab = useLiftDrag(h, 100, v => onH(Math.round(v)), T.dive)
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.02 })
  return (
    <group position={[XD, y, ZD]} {...grab}>
      <group ref={ref} scale={3.2}>
        <RoundedBox args={[2.6, 1.2, 1.3]} radius={0.5} smoothness={5} castShadow><meshStandardMaterial color="#e8651e" roughness={0.4} metalness={0.3} /></RoundedBox>
        <mesh position={[0.2, 0.75, 0]}><cylinderGeometry args={[0.3, 0.36, 0.4, 20]} /><meshStandardMaterial color="#f1efe8" roughness={0.5} /></mesh>
        <mesh position={[0.9, 0.05, 0.62]}><circleGeometry args={[0.3, 32]} /><meshStandardMaterial color="#22354a" roughness={0.1} metalness={0.6} /></mesh>
        <mesh position={[0.9, 0.05, 0.63]}><ringGeometry args={[0.3, 0.37, 32]} /><meshStandardMaterial color="#c9d0d6" metalness={0.9} roughness={0.3} /></mesh>
        <mesh position={[-1.45, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.32, 0.32, 0.2, 20]} /><meshStandardMaterial color="#30353b" metalness={0.6} roughness={0.5} /></mesh>
        {[-0.5, 0.5].map(z => <mesh key={z} position={[0, -0.72, z]}><boxGeometry args={[2, 0.1, 0.12]} /><meshStandardMaterial color="#30353b" /></mesh>)}
      </group>
      <mesh visible={false}><boxGeometry args={[14, 10, 8]} /></mesh>
    </group>
  )
}

/** 一套灶具：燃气灶、一口锅（可以换成高压锅）、锅里插着温度计 */
function Stove({ at, lid, temp, boiling, on }: { at: [number, number, number]; lid: boolean; temp: number; boiling: boolean; on: boolean }) {
  const steam = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { steam.current?.children.forEach((c, i) => { const t = (clock.elapsedTime * 0.6 + i / 6) % 1; c.position.set(Math.sin(i * 2.1 + t * 3) * 0.08, 0.98 + t * 0.6, Math.cos(i * 1.3) * 0.06); c.scale.setScalar(boiling ? 0.5 + t : 0) }) })
  const steel = <meshStandardMaterial color="#c9d0d6" metalness={0.9} roughness={0.3} envMapIntensity={1.3} />
  return (
    <group position={at}>
      <RoundedBox args={[0.8, 0.5, 0.6]} radius={0.03} position={[0, 0.25, 0]} castShadow><meshStandardMaterial color="#3c4249" metalness={0.5} roughness={0.5} /></RoundedBox>
      <mesh position={[0, 0.53, 0]}><cylinderGeometry args={[0.16, 0.18, 0.06, 24]} /><meshStandardMaterial color="#22262a" metalness={0.6} roughness={0.5} /></mesh>
      {on && <mesh position={[0, 0.6, 0]}><coneGeometry args={[0.15, 0.1, 16]} /><meshBasicMaterial color="#4aa3ff" transparent opacity={0.85} toneMapped={false} /></mesh>}
      <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.3, 32]} />{steel}</mesh>
      {lid
        ? <><mesh position={[0, 0.97, 0]}><cylinderGeometry args={[0.25, 0.25, 0.05, 32]} /><meshStandardMaterial color="#30353b" metalness={0.6} roughness={0.4} /></mesh><mesh position={[0, 1.03, 0]}><cylinderGeometry args={[0.03, 0.03, 0.07, 12]} /><meshStandardMaterial color="#d6332b" /></mesh><mesh position={[0.3, 0.95, 0]}><boxGeometry args={[0.22, 0.04, 0.06]} /><meshStandardMaterial color="#22262a" /></mesh></>
        : <mesh position={[0, 0.93, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.23, 32]} /><meshBasicMaterial color="#2a8fb5" transparent opacity={0.75} /></mesh>}
      {/* 温度计：红色液柱跟着水温升高 */}
      <mesh position={[0.14, 1.05, -0.1]}><cylinderGeometry args={[0.012, 0.012, 0.5, 10]} /><meshBasicMaterial color="#f4f8fb" transparent opacity={0.6} /></mesh>
      <mesh position={[0.14, 0.82 + temp / 130 * 0.22, -0.1]}><cylinderGeometry args={[0.007, 0.007, temp / 130 * 0.44, 8]} /><meshBasicMaterial color="#d6332b" toneMapped={false} /></mesh>
      <group ref={steam}>{[0, 1, 2, 3, 4, 5].map(i => <mesh key={i}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} /></mesh>)}</group>
    </group>
  )
}

/** 液压千斤顶：底下一根油管把小活塞和大活塞连起来，大活塞上顶着一块混凝土 */
function Jack({ push, lift }: XProps['jack']) {
  const [cd, cn, cr] = useConcrete(1, 0.5)
  const base = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [0.2, 0.12, 0], s: [3.6, 0.24, 0.9], c: '#3c4249' })                                         // 油箱兼底座
    P.push({ p: [-1.2, 0.55, 0], s: [0.09, 0.62, 0.09], c: '#8d949c', cyl: true }, { p: [1.0, 0.5, 0], s: [0.42, 0.52, 0.42], c: '#8d949c', cyl: true })   // 小缸、大缸
    return mergeParts(P)
  }, [])
  const rod = <meshStandardMaterial color="#c9d0d6" metalness={0.9} roughness={0.25} />
  const d = push > 0 ? 0.12 : 0
  return (
    <group position={[XJ, 0, ZJ]}>
      <mesh geometry={base} castShadow receiveShadow><Painted rough={0.5} metal={0.5} /></mesh>
      {/* 小活塞和压把 */}
      <mesh position={[-1.2, 1.0 - d, 0]} castShadow><cylinderGeometry args={[0.045, 0.045, 0.5, 16]} />{rod}</mesh>
      <mesh position={[-1.2, 1.28 - d, 0]}><boxGeometry args={[0.5, 0.06, 0.16]} /><meshStandardMaterial color="#e8b21e" roughness={0.5} /></mesh>
      {/* 大活塞、托板、混凝土块 */}
      <mesh position={[1.0, 0.9 + lift / 2, 0]} castShadow><cylinderGeometry args={[0.36, 0.36, 0.5 + lift, 32]} />{rod}</mesh>
      <mesh position={[1.0, 1.18 + lift, 0]} castShadow><boxGeometry args={[1.5, 0.08, 1]} /><meshStandardMaterial color="#59626b" metalness={0.6} roughness={0.5} /></mesh>
      <RoundedBox args={[2, 0.5, 1]} radius={0.03} position={[1.0, 1.47 + lift, 0]} castShadow><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#c4bfb2" /></RoundedBox>
      {push > 0 && <ForceArrow tip={[-1.2, 1.33 - d, 0.3]} dir={[0, -1, 0]} len={0.25 + push / 600} color="#ff8a5c" />}
      {push > 0 && <ForceArrow tip={[1.0, 1.2 + lift, 0.6]} dir={[0, 1, 0]} len={0.5 + push / 400} color="#35c7b3" thick={1.4} />}
    </group>
  )
}

export default function SceneX(props: XProps) {
  const { sub, ball, dive, boil, jack } = props
  const R = BALL.r * 1.6, out = jack.push * JACK.s2 / JACK.s1
  const sy = WY - dive.h
  const labels: Label[] = sub === 'ball' ? [
    { id: 'in', at: [XB, 1.25 + R + 0.25, ZB], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>球里的气压</small>{kPa(101300 * (1 - ball.vac))} kPa</> },
    { id: 'pull', at: [XB, 0.62, ZB + 0.3], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: ball.pull > 0 ? 1 : 0 }, children: <><small>每边拉力</small>{kN(ball.pull)} kN</> },
    { id: 'nPump', at: [XB, 0.2, ZB - 0.3], ax: 0.5, name: true, className: 'scene-name', children: '抽气机' },
  ] : sub === 'dive' ? [
    { id: 'p', at: [XD + 9, sy, ZD], className: 'scene-tag key -translate-y-1/2', children: <><small>水的压强</small>{kPa(pWater(dive.h))} kPa</> },
    { id: 'd', at: [XD - 9, sy, ZD], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>深度</small>{dive.h.toFixed(0)} m</> },
    { id: 't', at: [XD, sy - 6.5, ZD], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: dive.h >= 5 ? 1 : 0 }, children: `每平方米外壳上压着 ${tonPerM2(dive.h).toFixed(0)} 吨` },
    { id: 'drag', at: [XD, sy + 7, ZD], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '潜水器 · 可以直接抓住上下拖' },
  ] : sub === 'boil' ? [
    { id: 'temp', at: [STOVE[boil.spot][0] + 0.32, STOVE[boil.spot][1] + 1.12, STOVE[boil.spot][2]], className: 'scene-tag key -translate-y-1/2', children: <><small>{boil.boiling ? '沸腾' : '水温'}</small>{boil.temp.toFixed(0)} ℃</> },
    { id: 'nPot', at: [STOVE[boil.spot][0] - 0.32, STOVE[boil.spot][1] + 0.82, STOVE[boil.spot][2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: boil.lid ? '高压锅' : '敞口的锅' },
  ] : [
    { id: 'f1', at: [XJ - 1.55, 1.5, ZJ + 0.3], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: jack.push > 0 ? 1 : 0 }, children: <><small>手压</small>{jack.push} N</> },
    { id: 'f2', at: [XJ + 1.0, 0.72, ZJ + 0.6], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: jack.push > 0 ? 1 : 0 }, children: <><small>大活塞向上顶</small>{kN(out)} kN</> },
    { id: 'nS1', at: [XJ - 1.2, 0.36, ZJ + 0.5], ax: 0.5, name: true, className: 'scene-name', children: '小活塞 10 cm²' },
    { id: 'nS2', at: [XJ + 1.0, 0.36, ZJ + 0.5], ax: 0.5, name: true, className: 'scene-name', children: '大活塞 1000 cm²' },
    { id: 'nLoad', at: [XJ + 2.1, 1.47 + jack.lift, ZJ], name: true, className: 'scene-name -translate-y-1/2', children: '混凝土块 23.52 kN' },
  ]
  const target = sub === 'boil' ? T[boil.spot] : T[sub]
  return (
    <LabStage labels={labels} target={target} span={SPANS[sub]} view={sub === 'dive' ? [0.12, 0.08] : [0.2, 0.12]} fog={sub === 'dive' ? [500, 3200] : sub === 'boil' && boil.spot === 'peak' ? [400, 3200] : undefined}>
      <Ball {...ball} />
      <Sub {...dive} />
      <Stove at={STOVE.crest} lid={boil.spot === 'crest' && boil.lid} temp={boil.spot === 'crest' ? boil.temp : 20} boiling={sub === 'boil' && boil.spot === 'crest' && boil.boiling} on={sub === 'boil' && boil.spot === 'crest' && boil.temp > 20.5} />
      <Stove at={STOVE.peak} lid={boil.spot === 'peak' && boil.lid} temp={boil.spot === 'peak' ? boil.temp : 20} boiling={sub === 'boil' && boil.spot === 'peak' && boil.boiling} on={sub === 'boil' && boil.spot === 'peak' && boil.temp > 20.5} />
      <Jack {...jack} />
    </LabStage>
  )
}
