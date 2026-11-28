// 从石油到塑料实验室的大场景：一座炼油厂和石化厂。自西向东：中心化验室、原油加热炉和常压分馏塔、管式裂解炉、
// 四台反应装置、聚乙烯反应器和造粒线、回收车间；北面一条管廊，南面一条主路。整个实验室只有这一个世界，换课时镜头飞过去。单位 m。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { asphaltTex, rep, slabTex } from './mats'
import { Furnace, Tower } from './tower'
import { LabRoom, ROOM, BENCH_TOP, BZ } from './room'
import { Cracker } from './cracker'
import { Train } from './train'
import { PolyLine } from './poly'
import { Recycle } from './recycle'
import { Yard } from './yard'

/** 一个机位：看向哪里、要装进画面的宽和高、方位角和仰角、是不是室内、雾的起止 */
export const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor = false, fog: [number, number] = [120, 900]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
export type Spot = ReturnType<typeof spot>

/** 每一课交给世界的要求 */
export interface Want {
  x: number; indoor: boolean
  /** 朝镜头剖开哪一台：tower 加热炉和分馏塔，cracker 裂解炉 */
  cut: 'tower' | 'cracker' | null
  /** 加热炉的火（0–1）、塔里的油气（0–1） */
  fire: number; vapor: number
  /** 裂解炉的炉温（0 不烧，0.5 约 500 °C，1 约 800 °C） */
  heat: number
  /** 聚乙烯反应器在不在聚合、造粒线开没开 */
  poly: number; pellet: number
  /** 泛光的强度（不写就按室内外取默认值） */
  glow?: number
}
const REST: Want = { x: 0, indoor: false, cut: null, fire: 0, vapor: 0, heat: 0, poly: 0, pellet: 0 }

/** 这一课的舞台：选一处机位。室内点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null, ...w }: { at: Spot; labels: Label[]; children?: ReactNode } & Partial<Omit<Want, 'x' | 'indoor'>>) {
  const want = useMemo<Want>(() => ({ ...REST, ...w, x: at.target.x, indoor: at.indoor }), [at, w.cut, w.fire, w.vapor, w.heat, w.poly, w.pellet, w.glow])   // eslint-disable-line react-hooks/exhaustive-deps
  return <LabStage<Want> labels={labels} target={at.target} span={at.span} view={at.view} sun={at.indoor ? 0.9 : 2.7} env={at.indoor ? 0.6 : 0.95} studio={at.indoor} fog={at.fog} bloom={w.glow ?? (at.indoor ? 0.35 : 0.55)} world={want}>{children}</LabStage>
}

/** 化验室里的工作灯：跟着当前这一课从前上方打下来，只在室内的课亮 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 1.0, ROOM.h - 0.4, BZ + 3.8); aim.position.set(cur.current, BENCH_TOP + 0.25, BZ); aim.updateMatrixWorld()
    l.intensity += ((on ? 55 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={16} decay={1.4} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} />
  </>
}

export function World(w: Partial<Want>) {
  const { x, indoor, cut, fire, vapor, heat, poly, pellet } = { ...REST, ...w }
  const tex = useMemo(() => ({ ground: rep(asphaltTex(), 160, 120), pad: rep(slabTex(), 240 / 6, 44 / 6), road: rep(asphaltTex(), 40, 1.2) }), [])
  return (
    <group>
      <hemisphereLight args={['#eef2f6', '#8a8276', indoor ? 0.5 : 0.32]} />
      <Key x={indoor ? x : -58} on={indoor} />
      {/* 地面：沥青；装置区一大片混凝土地坪；南面一条东西向的主路 */}
      <mesh rotation-x={-Math.PI / 2} position={[50, -0.03, -40]} receiveShadow><planeGeometry args={[2000, 1500]} /><meshStandardMaterial map={tex.ground} color="#8f8e8a" roughness={0.96} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[76, 0.0, -9]} receiveShadow><planeGeometry args={[240, 44]} /><meshStandardMaterial map={tex.pad} color="#b2afa6" roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[50, 0.005, 18]} receiveShadow><planeGeometry args={[400, 9]} /><meshStandardMaterial map={tex.road} color="#6c6c69" roughness={0.93} /></mesh>
      <LabRoom />
      <Furnace cut={cut === 'tower'} fire={fire} />
      <Tower cut={cut === 'tower'} on={vapor} />
      <Cracker cut={cut === 'cracker'} heat={heat} />
      <Train />
      <PolyLine poly={poly} pellet={pellet} />
      <Recycle />
      <Yard />
    </group>
  )
}
