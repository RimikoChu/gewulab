// 圆锥曲线实验室的大场景：高原上的一座射电观测站。从西往东：回音壁 → 展厅楼前的科普广场（圆锥模型、大画板、坐标屏）→
// 广场东头对着远处冷却塔的第二块坐标屏 → 抛物面天线 → 天象厅。整个实验室只有这一个世界，换课时镜头飞过去。
// 各处的位置在 P，局部坐标在 F，机位在 SPOT。天线要不要剖开、天象厅要不要打开，由各课通过 LabStage 的 world 交上来。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Annex, ConeModel, CoolingTower, EchoWall, Easel, Hall, Lamp, Mountains, Planetarium, SLATE } from './campus'
import { Dish, DISH_H } from './dish'
import { Board, type Axes } from './graph'
import { makeGrass, makePaving, rep } from './mats'
import { CONE, TOWER } from './physics'
import { Tree } from './trees'
import type { Frame } from './at'

export interface WorldWant { cut?: boolean; open?: boolean; lines?: boolean }
type V3 = [number, number, number]
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** 各处在世界里的位置（地面上的点） */
export const P = {
  wall: [-36, 0, 4] as V3, cone: [-14, 0, 0.5] as V3, easel: [-3, 0, 0.6] as V3, screen: [9.5, 0, 0.5] as V3, hyper: [28, 0, 3] as V3,
  dish: [54, 0, -16] as V3, dome: [86, 0, -6] as V3, tower: [150, 0, -330] as V3, tower2: [236, 0, -372] as V3, hall: [-5, 0, -7] as V3,
}
/** 第 3、4 课的坐标屏 */
export const AX3: Axes = { xr: [-6.5, 6.5], yr: [-5.4, 5.4], step: 1, s: 0.3, font: 0.13, pad: 0.22 }
export const AX4: Axes = { xr: [-8.5, 8.5], yr: [-6.6, 6.6], step: 1, s: 0.26, font: 0.12, pad: 0.22 }
/** 各处的局部坐标：画图的小件都画在局部的 z = 0 平面里 */
export const F = {
  cone: { origin: [P.cone[0], 0.6 + 0.46 + CONE.H, P.cone[2]], az: 0.3 } as Frame,                 // 原点在圆锥顶点
  easel: { origin: [P.easel[0], 2.05, P.easel[2]], az: -0.12, tilt: 0.2 } as Frame,                  // 原点在板面中心，1 dm 画成 0.24 m
  screen: { origin: [P.screen[0], 2.3, P.screen[2]], az: 0.14 } as Frame,
  hyper: { origin: [P.hyper[0], 2.45, P.hyper[2]], az: -0.14 } as Frame,
  dish: { origin: [P.dish[0], DISH_H, P.dish[2]], az: 0 } as Frame,                                  // 原点在反射面顶点，1 单位 = 1 m
  orbit: { origin: [P.dome[0], 4.25, P.dome[2] + 0.6], az: 0, tilt: 0.62 } as Frame,                 // 天象厅里斜放的轨道盘
  wall: { origin: [P.wall[0], 1.36, P.wall[2]], az: 0.22, tilt: Math.PI / 2 } as Frame,              // 回音壁墙顶上方的水平面：局部 y 朝远处
}
type Spot = { target: THREE.Vector3; span: [number, number]; view: [number, number] }
export const SPOT: Record<string, Spot> = {
  cone: { target: v(F.cone.origin[0], F.cone.origin[1] + 0.3, F.cone.origin[2]), span: [3.6, 3.95], view: [0.3, 0.4] },
  easel: { target: v(F.easel.origin[0], 2.0, F.easel.origin[2]), span: [4.0, 3.15], view: [0.1, 0.1] },
  screen: { target: v(F.screen.origin[0], 2.3, F.screen.origin[2]), span: [5.1, 3.8], view: [0.36, 0.09] },
  hyper: { target: v(F.hyper.origin[0], 2.45, F.hyper.origin[2]), span: [5.4, 4.0], view: [-0.36, 0.06] },
  dish5: { target: v(P.dish[0], DISH_H + 0.6, P.dish[2]), span: [15.5, 11.5], view: [0.14, 0.07] },
  dish6: { target: v(P.dish[0], DISH_H + 3.9, P.dish[2]), span: [15, 12.6], view: [0.36, 0.1] },
  orbit: { target: v(F.orbit.origin[0], 4.2, F.orbit.origin[2]), span: [11.4, 8.2], view: [0.2, 0.2] },
  wall: { target: v(P.wall[0], 0.9, P.wall[2]), span: [12.5, 6.4], view: [0.22, 0.6] },
  tower: { target: v(P.tower[0], 52, P.tower[2]), span: [124, 150], view: [-0.3, 0.07] },
  over: { target: v(40, 6, -10), span: [50, 22], view: [-0.8, 0.15] },
}

const TREES: [number, number, number][] = [
  [-46, -10, 8], [-40, -16, 9.5], [-50, 14, 7.5], [-30, -24, 9], [22, -14, 8.5], [30, -22, 10], [38, -10, 7.5], [40, -30, 9], [70, -30, 9.5], [100, -14, 8], [104, 4, 9], [72, 12, 7.5], [-24, 18, 8], [-8, 22, 9], [20, 22, 8.5], [44, 18, 8], [96, -28, 10], [14, -30, 9],
]

export function World({ want }: { want?: WorldWant }) {
  const grass = useMemo(() => rep(makeGrass(), 160, 160), []), pave = useMemo(() => rep(makePaving(), 20, 5), []), path = useMemo(() => rep(makePaving(128, [150, 147, 140]), 16, 1.5), [])
  const eg = (F.easel.origin[1]), et = F.easel.tilt ?? 0
  // 画架的地面和后撑落点：换到板面的局部坐标里
  const ground = -eg / Math.cos(et) + 0.11 * Math.tan(et), back: V3 = [0, -eg * Math.cos(et) + 1.5 * Math.sin(et), -eg * Math.sin(et) - 1.5 * Math.cos(et)]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[2400, 2400]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
      {/* 广场和通往天线、天象厅的路 */}
      <mesh rotation-x={-Math.PI / 2} position={[-4, 0.02, 2.5]} receiveShadow><planeGeometry args={[84, 21]} /><meshStandardMaterial map={pave} color="#b4b2aa" roughness={0.92} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[68, 0.02, 0]} receiveShadow><planeGeometry args={[62, 5]} /><meshStandardMaterial map={path} color="#bdbbb3" roughness={0.92} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[P.dish[0], 0.025, P.dish[2]]} receiveShadow><circleGeometry args={[9, 64]} /><meshStandardMaterial map={path} color="#bdbbb3" roughness={0.92} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[P.dish[0], 0.02, -4.5]} receiveShadow><planeGeometry args={[4, 9]} /><meshStandardMaterial map={path} color="#bdbbb3" roughness={0.92} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[P.dome[0], 0.022, P.dome[2]]} receiveShadow><circleGeometry args={[10.5, 64]} /><meshStandardMaterial map={path} color="#bdbbb3" roughness={0.92} /></mesh>

      <group position={P.hall}><Hall /></group>
      <group position={F.cone.origin} rotation-y={F.cone.az}><ConeModel /></group>
      <group position={F.easel.origin} rotation-y={F.easel.az}><group rotation-x={-et}><Easel ground={ground} back={back} /></group></group>
      <group position={F.screen.origin} rotation-y={F.screen.az}><Board A={AX3} lift={F.screen.origin[1]} /></group>
      <group position={F.hyper.origin} rotation-y={F.hyper.az}><Board A={AX4} lift={F.hyper.origin[1]} /></group>
      <group position={P.wall} rotation-y={F.wall.az}><EchoWall /></group>
      <group position={F.dish.origin}><Dish cut={!!want?.cut} /></group>
      <group position={[P.dish[0] - 13, 0, P.dish[2] - 9]} rotation-y={-0.6}><Annex /></group>
      <group position={P.dome}><Planetarium open={!!want?.open} /></group>
      <group position={P.tower}><CoolingTower /></group>
      <group position={P.tower2} scale={0.92}><CoolingTower /></group>
      {[[-22, 11.5], [4, 11.5], [30, 11.5], [44, -3.2], [70, -3.2]].map(([x, z]) => <group key={x} position={[x, 0, z]} rotation-y={Math.PI / 2}><Lamp /></group>)}
      {TREES.map(([x, z, h], i) => <Tree key={i} x={x} z={z} h={h} seed={i * 13 + 5} />)}
      <Mountains />
    </group>
  )
}
export { SLATE, TOWER }
