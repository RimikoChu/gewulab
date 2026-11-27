// 电磁感应和电网实验室的大场景：一座小水电站和它送电的路。从西往东：培训楼一层的电磁学实验室（第 1–4 课、拓展课）、
// 发电机厂房（第 5 课）、升压站（第 6 课）、110 kV 输电线、城郊变电站和城里的住宅（第 7 课）；厂房北面是大坝和水库。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。当前这一课的器材由那一课自己画（带着它的状态），
// 别的课的器材在这里按静止的样子画（见 idle.tsx）。布局见 layout.ts。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { SPOT, type SpotKey, type StKey } from './layout'
import type { V3 } from './physics'
import { Room } from './room'
import { Land } from './land'
import { Hall } from './hall'
import { Yard } from './yard'
import { Grid } from './grid'
import { IDLE } from './idle'

/** 每一课交给世界的要求：工作灯照哪；哪一处器材由这一课自己画；室内还是室外；输电线上的状态 */
export interface Want { light: V3; aim: V3; cur: StKey | 'q'; indoor: boolean; grid?: GridState }
/** 输电线的状态：送电没有、输电电压、线路电流（A）、损耗占的比例、住户的灯亮多少（0–1） */
export interface GridState { on: boolean; U: number; I: number; ratio: number; lamp: number }

export function Place({ at, cur, labels, grid, children = null }: { at: SpotKey; cur: StKey | 'q'; labels: Label[]; grid?: GridState; children?: ReactNode }) {
  const v = SPOT[at]
  const w = useMemo<Want>(() => ({ light: v.light, aim: v.target.toArray() as V3, cur, indoor: v.indoor, grid }), [v, cur, grid])
  return v.indoor
    ? <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sky={false} backdrop="#c9d4dc" studio env={0.55} sun={0.6} fog={[30, 160]} bloom={0.5} world={w}>{children}</LabStage>
    : <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} fog={[260, 1500]} sun={3.2} env={1.0} bloom={0.4} world={w}>{children}</LabStage>
}

/** 跟着这一课走的工作灯：室内的课才开，从器材左前上方照下来 */
function Key({ at, aim, on }: { at: V3; aim: V3; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), target = useMemo(() => new THREE.Object3D(), [])
  const cur = useRef(new THREE.Vector3(...at)), look = useRef(new THREE.Vector3(...aim))
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const k = 1 - Math.exp(-Math.min(d, 1 / 30) / 0.5)
    cur.current.lerp(new THREE.Vector3(...at), k); look.current.lerp(new THREE.Vector3(...aim), k)
    l.position.copy(cur.current); target.position.copy(look.current); target.updateMatrixWorld()
    l.intensity += ((on ? 22 : 0) - l.intensity) * k
  })
  return <>
    <primitive object={target} />
    <spotLight ref={light} target={target} angle={0.6} penumbra={0.85} intensity={0} distance={9} decay={1.4} color="#fff2e0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} />
  </>
}

/** 大场景分几帧挂上去：每一批新材质的着色器在不同的帧里编译，进页面不会卡一下 */
function useStaged(n: number) {
  const [k, setK] = useState(0)
  useEffect(() => { if (k >= n) return; let a = 0, b = 0; a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setK(k + 1)) }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) } }, [k, n])
  return k
}

export function World({ light = SPOT.l1.light, aim = SPOT.l1.target.toArray() as V3, cur = 'l1', indoor = true, grid }: Partial<Want>) {
  const k = useStaged(6)
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#4a463d', indoor ? 0.35 : 0.25]} />
      <Key at={light} aim={aim} on={indoor} />
      {k >= 1 && <Room />}
      {k >= 2 && <Land />}
      {k >= 3 && <Hall />}
      {k >= 4 && <Yard />}
      {k >= 5 && <Grid state={grid} />}
      {/* 各课的器材：当前这一课自己画，别的按静止的样子画 */}
      {k >= 6 && (Object.keys(IDLE) as StKey[]).filter(s => s !== cur).map(s => <group key={s}>{IDLE[s]?.(cur)}</group>)}
    </group>
  )
}
