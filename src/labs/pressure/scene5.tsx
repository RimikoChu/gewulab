// 压强 · 第 5 课的三维场景：引水渠上的小船闸（朝镜头剖开）。两道闸门、两个阀门都可以直接点；一艘工作船从下游过到上游。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LOCK, type Lock5 } from './physics'
import { Painted, mergeParts, useRipple, type Label, type Part } from '../float/dock'
import { CANAL, ST } from './hydro'
import { LabStage } from './stage'
import { useFaceGradient, useSlide } from './world'

const X0 = ST.lock, BED = CANAL.bed, W = -CANAL.back       // 船闸中心、渠底、渠宽
const HALF = 9                                             // 闸室半长
const TARGET = new THREE.Vector3(X0, -0.6, -4)
const SPAN: [number, number] = [42, 15]
const VIEW: [number, number] = [0.08, 0.1]
const BOAT_X = [-19, 0, 19]
type Part5 = 'vLow' | 'vUp' | 'gLow' | 'gUp'

/** 一段水：水体、剖面上的渐变、水面 */
function Pond({ x0, x1, level }: { x0: number; x1: number; level: number }) {
  const ripple = useRipple([(x1 - x0) * 0.3, W * 0.3], 0.01), face = useFaceGradient('40,150,185')
  const w = x1 - x0, cx = (x0 + x1) / 2
  return (
    <group>
      <mesh position={[cx, BED + level / 2, -W / 2]} renderOrder={2}><boxGeometry args={[w, level, W - 0.02]} /><meshBasicMaterial color="#0a2a33" transparent opacity={0.46} depthWrite={false} /></mesh>
      <mesh position={[cx, BED + level / 2, 0.012]} renderOrder={4}><planeGeometry args={[w, level]} /><meshBasicMaterial map={face} transparent depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[cx, BED + level + 0.004, -W / 2]} rotation-x={-Math.PI / 2} renderOrder={3}><planeGeometry args={[w, W - 0.02]} /><meshPhysicalMaterial color="#2a8fb0" transparent opacity={0.55} roughness={0.05} envMapIntensity={1.4} normalMap={ripple} normalScale={new THREE.Vector2(0.3, 0.3)} clearcoat={1} depthWrite={false} /></mesh>
    </group>
  )
}

/** 工作船 */
function Boat() {
  const parts = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [-1.2, 1.9, 0], s: [2.6, 1.6, 2.2], c: '#e9e6dc' }, { p: [-1.2, 2.75, 0], s: [3, 0.14, 2.6], c: '#3c5964' }, { p: [-0.6, 2.05, 1.11], s: [1.2, 0.7, 0.04], c: '#22354a' }, { p: [0.11, 2.05, 0], s: [0.04, 0.7, 1.8], c: '#22354a' })
    P.push({ p: [0, 1.2, 0], s: [8.2, 0.12, 3.3], c: '#e8b21e' }, { p: [2.6, 1.5, 0], s: [0.14, 0.6, 0.14], c: '#2b2f33', cyl: true }, { p: [-3.2, 3.6, 0], s: [0.05, 1.7, 0.05], c: '#c9ced3', cyl: true })
    return mergeParts(P)
  }, [])
  return (
    <group>
      <RoundedBox args={[8, 1.3, 3.2]} radius={0.35} smoothness={4} position={[0, 0.55, 0]} castShadow><meshStandardMaterial color="#22354a" roughness={0.55} metalness={0.2} /></RoundedBox>
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[7.6, 0.5, 3.0]} /><meshStandardMaterial color="#7c2f26" roughness={0.6} /></mesh>
      <mesh geometry={parts} castShadow><Painted rough={0.6} metal={0.2} /></mesh>
    </group>
  )
}

interface SceneProps { s: Lock5; onTap: (k: Part5) => void; onGo: () => void }

function Apparatus({ s, onTap, onGo, gl, gu, bx }: SceneProps & { gl: number; gu: number; bx: number }) {
  const frame = useMemo(() => {
    const P: Part[] = []
    for (const x of [-HALF, HALF]) {
      P.push({ p: [x, 4.2, -W - 0.3], s: [0.9, 8.4 - BED, 0.6], c: '#b7b3a6' }, { p: [x, 8.6, -W / 2], s: [1.1, 0.7, W + 1.2], c: '#b7b3a6' }, { p: [x, 9.3, -W / 2], s: [1.6, 0.9, 1.6], c: '#3c4249' })
      P.push({ p: [x, BED + 0.35, -0.45], s: [2.6, 0.5, 0.5], c: '#59626b', cyl: false })                    // 闸门底下的输水廊道（剖面上看是一小段管子）
    }
    P[0].p[1] = (8.4 + BED) / 2; P[4].p[1] = (8.4 + BED) / 2
    // 闸室两侧墙顶的系船柱和护栏
    for (let i = 0; i < 7; i++) P.push({ p: [-7.5 + i * 2.5, 0.25, -W - 0.5], s: [0.2, 0.5, 0.2], c: '#2b2f33', cyl: true })
    for (let i = 0; i <= 12; i++) P.push({ p: [-18 + i * 3, 0.55, -W - 1.2], s: [0.05, 1.1, 0.05], c: '#e8b21e', cyl: true })
    for (const y of [0.55, 1.08]) P.push({ p: [0, y, -W - 1.2], s: [36, 0.05, 0.05], c: '#e8b21e' })
    return mergeParts(P)
  }, [])
  const hand = (k: Part5) => ({ onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onTap(k) }, onPointerOver: () => { document.body.style.cursor = 'pointer' }, onPointerOut: () => { document.body.style.cursor = '' } })
  const level = (x: number) => x < -HALF ? LOCK.low : x > HALF ? LOCK.up : s.c
  const gate = (x: number, k: Part5, open: number) => (
    <group position={[x, BED + open * 7.4, 0]} {...hand(k)}>
      <RoundedBox args={[0.5, -BED + 0.6, W - 0.1]} radius={0.06} position={[0, (-BED + 0.6) / 2, -W / 2]} castShadow><meshStandardMaterial color="#7c2f26" roughness={0.55} metalness={0.5} /></RoundedBox>
      {[1.4, 3.2, 5, 6.8].map(y => <mesh key={y} position={[0, y, 0.0]}><boxGeometry args={[0.62, 0.18, 0.12]} /><meshStandardMaterial color="#5d241d" metalness={0.5} roughness={0.5} /></mesh>)}
    </group>
  )
  const valve = (x: number, k: Part5, open: boolean) => (
    <group position={[x, BED + 0.35, -0.2]} {...hand(k)}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.42, 0.42, 0.16, 24]} /><meshBasicMaterial color={open ? '#35c7b3' : '#d6332b'} toneMapped={false} /></mesh>
      <mesh position={[0, 0, 0.1]} rotation-z={open ? 0 : Math.PI / 2}><boxGeometry args={[0.7, 0.1, 0.04]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh visible={false}><boxGeometry args={[3, 1.6, 1.2]} /></mesh>
    </group>
  )
  return (
    <group position={[X0, 0, 0]}>
      <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.75} metal={0.2} /></mesh>
      <Pond x0={CANAL.x0 - X0} x1={-HALF - 0.25} level={LOCK.low} />
      <Pond x0={-HALF + 0.25} x1={HALF - 0.25} level={s.c} />
      <Pond x0={HALF + 0.25} x1={CANAL.x1 - X0} level={LOCK.up} />
      {gate(-HALF, 'gLow', gl)}{gate(HALF, 'gUp', gu)}
      {valve(-HALF, 'vLow', s.vLow)}{valve(HALF, 'vUp', s.vUp)}
      <group position={[bx, BED + level(bx) - 0.55, -W / 2]} onClick={e => { e.stopPropagation(); onGo() }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}><Boat /><mesh position={[0, 1.6, 0]} visible={false}><boxGeometry args={[9, 4.5, 4]} /></mesh></group>
    </group>
  )
}

export default function Scene5(props: SceneProps) {
  const { s } = props
  const gl = useSlide(s.gLow ? 1 : 0, 0.9), gu = useSlide(s.gUp ? 1 : 0, 0.9), bx = useSlide(BOAT_X[s.boat], 4)
  const canGo = (s.boat === 0 && s.gLow) || (s.boat === 1 && s.gUp)
  const tag = (x: number, v: number, name: string, key = false): Label => ({ id: name, at: [X0 + x, BED + v + 0.5, 0], ax: 0.5, className: `scene-tag ${key ? 'key ' : ''}-translate-y-full`, children: <><small>{name}</small>{v.toFixed(2)} m</> })
  const labels: Label[] = [
    tag(-26, LOCK.low, '下游'), tag(5.5, s.c, '闸室', true), tag(26, LOCK.up, '上游'),
    { id: 'vl', at: [X0 - HALF, BED - 0.5, 0], ax: 0.5, className: 'scene-name', children: `下游阀门：${s.vLow ? '开' : '关'}` },
    { id: 'vu', at: [X0 + HALF, BED - 0.5, 0], ax: 0.5, className: 'scene-name', children: `上游阀门：${s.vUp ? '开' : '关'}` },
    { id: 'gl', at: [X0 - HALF, 10.4, -4], ax: 0.5, className: 'scene-name -translate-y-full', children: `下游闸门：${s.gLow ? '开' : '关'}` },
    { id: 'gu', at: [X0 + HALF, 10.4, -4], ax: 0.5, className: 'scene-name -translate-y-full', children: `上游闸门：${s.gUp ? '开' : '关'}` },
    { id: 'tip', at: [X0, 5.2, -4], ax: 0.5, name: true, className: 'scene-name', children: '阀门、闸门和船都可以直接点' },
    { id: 'go', at: [X0 + bx, BED + (bx < -HALF ? LOCK.low : bx > HALF ? LOCK.up : s.c) + 3.9, -4], ax: 0.5, className: '', style: { display: canGo && Math.abs(bx - BOAT_X[s.boat]) < 0.05 ? undefined : 'none' }, children: <div className="drag-hint" style={{ transform: 'none' }}>闸门开了：点一下船，往前开</div> },
  ]
  return <LabStage labels={labels} target={TARGET} span={SPAN} view={VIEW}><Apparatus {...props} gl={gl} gu={gu} bx={bx} /></LabStage>
}
