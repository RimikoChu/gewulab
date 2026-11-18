// 压强 · 第 4 课的三维场景：站远了看整座大坝的剖面。水库水位可以上下拖；坝面上一排箭头，越往下越长。
// 大坝和水库本身在 hydro.tsx，这里只放这一课加上去的东西：压强箭头、拖水位的把手、“窄水库”那一堵山岩。
import { useMemo } from 'react'
import * as THREE from 'three'
import { DAM, kPa, pWater } from './physics'
import { DEEP, ST } from './hydro'
import { ForceArrow, LabStage, makeStrata, useLiftDrag, type Label } from '@/lab-kit'

const X0 = ST.dam                                // 坝的迎水面
const NARROW = 30                                // 窄水库的对岸离坝面 30 m
const TARGET = new THREE.Vector3(X0 - 8, DEEP + 52, -5)
const SPAN: [number, number] = [180, 136]
const VIEW: [number, number] = [0.12, 0.1]
const FOG: [number, number] = [500, 3200]
const ARROW = 32                                 // 100 m 深处的箭头长度（m）

interface SceneProps { level: number; wide: boolean; onLevel: (m: number) => void; dragHint?: boolean }

function Apparatus({ level, wide, onLevel }: SceneProps) {
  const rock = useMemo(() => { const t = makeStrata(['#6b6a62', '#5f5e57', '#56554f', '#4d4c47', '#45443f', '#3e3d39']); t.repeat.set(2, 1); return t }, [])
  const ys = DEEP + level
  const grab = useLiftDrag(DAM.max - level, DAM.max, v => onLevel(Math.round(DAM.max - v)), TARGET)
  const depths = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter(h => h <= level + 0.01)
  return (
    <group>
      {/* 窄水库：坝前 30 m 处立着一整块山岩，后面没有水 */}
      {!wide && <>
        <mesh position={[X0 + NARROW + 60, DEEP + 56, -230]} castShadow receiveShadow><boxGeometry args={[120, 112, 460]} /><meshStandardMaterial color="#77786c" roughness={1} /></mesh>
        <mesh position={[X0 + NARROW + 60, DEEP + 56, 0.05]}><planeGeometry args={[120, 112]} /><meshStandardMaterial map={rock} roughness={0.95} /></mesh>
      </>}
      {/* 抓水面上下拖的把手：一条亮线 */}
      <mesh position={[X0 + 16, ys, 3]} {...grab} visible={false}><boxGeometry args={[34, 14, 10]} /></mesh>
      <mesh position={[X0 + 16, ys + 0.2, 0.5]} rotation-x={-Math.PI / 2}><planeGeometry args={[26, 0.8]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>
      {/* 水对坝面的压强：越深箭头越长，推向坝体 */}
      {depths.map(h => <ForceArrow key={h} tip={[X0, ys - h, 2.5]} dir={[-1, 0, 0]} len={ARROW * h / 100} color={h === depths[depths.length - 1] ? '#35c7b3' : '#9fe6dc'} opacity={0.95} thick={16} />)}
    </group>
  )
}

export default function Scene4(props: SceneProps) {
  const { level, wide } = props, ys = DEEP + level
  const mid = Math.floor(level / 2 / 10) * 10
  const labels: Label[] = [
    { id: 'lvl', at: [X0 + 32, ys + 1.5, 0], className: 'scene-tag -translate-y-full', children: <><small>水深</small>{level.toFixed(0)} m</> },
    { id: 'bot', at: [X0 + ARROW * level / 100 + 3, DEEP + 3.5, 2.5], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: level >= 10 ? 1 : 0 }, children: <><small>坝底</small>{kPa(pWater(level))} kPa</> },
    { id: 'mid', at: [X0 + ARROW * mid / 100 + 3, ys - mid, 2.5], className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: mid >= 20 && mid < level - 5 ? 1 : 0 }, children: `水下 ${mid} m：${kPa(pWater(mid))} kPa` },
    { id: 'drag', at: [X0 + 16, ys + 7, 0], ax: 0.5, className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint" style={{ transform: 'none' }}>↕ 抓住水面上下拖</div> },
    { id: 'nDam', at: [X0 - 34, DEEP + 62, 0], ax: 1, name: true, className: 'scene-name', children: '大坝 · 高 110 m，顶宽 10 m，底宽 80 m' },
    { id: 'nRes', at: [wide ? X0 + 70 : X0 + NARROW + 40, wide ? DEEP + 6 : DEEP + 55, 0], ax: 0.5, name: true, className: 'scene-name', children: wide ? '水库（很宽，一直到岸边）' : '山岩：水只剩坝前 30 m 宽的一条' },
    { id: 'nHouse', at: [X0 - 96, DEEP + 19, -35], ax: 0.5, name: true, className: 'scene-name', children: '发电厂房' },
  ]
  return <LabStage labels={labels} target={TARGET} span={SPAN} view={VIEW} fog={FOG} world={{ level, narrow: !wide }}><Apparatus {...props} /></LabStage>
}
