// 小镇上的楼：按真实的样子拼（每层的楼板线、窗、阳台和栏杆、空调外机、楼顶的电梯机房和水箱），单位 1 = 4 m。
// 晃动在顶点着色器里做：地面的位移 g 带着楼脚走，楼顶多出来的位移按一阶振型 sin(πy/2H) 往上分配，楼身是弯的，不是一节节错开。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** 每层高 3 m */
export const FLOOR_H = 0.75
type Box = [number, number, number, number, number, number, string]   // 中心 x y z、尺寸 x y z、颜色
function boxes(list: Box[]) {
  const col = new THREE.Color()
  return mergeGeometries(list.map(([x, y, z, sx, sy, sz, c]) => {
    const g = new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), n = g.attributes.position.count, a = new Float32Array(n * 3)
    col.set(c); for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g
  }))
}

/** 晃动的参数：每栋楼一份，各课每帧改它们 */
export interface Sway { g: { value: number }; top: { value: number }; lift: { value: number }; h: { value: number } }
export const makeSway = (h: number): Sway => ({ g: { value: 0 }, top: { value: 0 }, lift: { value: 0 }, h: { value: h } })
function bend<M extends THREE.Material>(m: M, s: Sway) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uG = s.g; sh.uniforms.uTop = s.top; sh.uniforms.uLift = s.lift; sh.uniforms.uH = s.h
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uG, uTop, uLift, uH;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float phi = sin(1.5707963 * clamp(transformed.y / uH, 0.0, 1.0));
transformed.x += uG * (1.0 - phi) + uTop * phi;
transformed.y += uLift;`)
  }
  m.customProgramCacheKey = () => 'quake-bend'
  return m
}

export type Kind = 'house' | 'school' | 'slab' | 'tower'
interface Spec { floors: number; w: number; d: number; wall: string; trim: string; bays: number; balcony: boolean; shop: boolean }
const SPECS: Record<Kind, Spec> = {
  house: { floors: 3, w: 5.2, d: 3.6, wall: '#e6dccb', trim: '#9a5b45', bays: 4, balcony: true, shop: false },
  school: { floors: 3, w: 11, d: 3.8, wall: '#ece6d6', trim: '#b0503f', bays: 9, balcony: false, shop: false },
  slab: { floors: 10, w: 9, d: 4.4, wall: '#ddd6c8', trim: '#8b8f93', bays: 6, balcony: true, shop: true },
  tower: { floors: 20, w: 6.2, d: 5.4, wall: '#d6d8d6', trim: '#6f7a82', bays: 4, balcony: true, shop: false },
}

/** 一栋楼的几何：墙和构件一份（顶点颜色），玻璃一份 */
function buildGeo(kind: Kind) {
  const s = SPECS[kind], H = s.floors * FLOOR_H, solid: Box[] = [], glass: Box[] = []
  const bw = s.w / s.bays, hw = s.w / 2, hd = s.d / 2
  // 楼身：外墙退进一点，四角是结构柱
  solid.push([0, H / 2, 0, s.w - 0.08, H, s.d - 0.08, s.wall])
  for (const [x, z] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) solid.push([x * 0.995, H / 2, z * 0.995, 0.22, H + 0.02, 0.22, s.trim])
  for (let f = 0; f < s.floors; f++) {
    const y0 = f * FLOOR_H
    // 楼板线：一圈稍微凸出来的白色腰线
    solid.push([0, y0 + 0.02, 0, s.w + 0.1, 0.09, s.d + 0.1, '#f1efe9'])
    const ground = f === 0 && s.shop
    for (let b = 0; b < s.bays; b++) {
      const x = -hw + bw * (b + 0.5)
      for (const side of [1, -1]) {
        const z = side * (hd + 0.01)
        if (ground) { glass.push([x, y0 + 0.36, z, bw * 0.86, 0.58, 0.04, '#33454f']); solid.push([x, y0 + 0.7, z + side * 0.04, bw * 0.95, 0.1, 0.1, '#7c2f2a']); continue }
        // 窗：深色玻璃，四边一圈窗框，窗下一块窗台
        const ww = bw * (kind === 'school' ? 0.7 : 0.52), wh = FLOOR_H * 0.5
        glass.push([x, y0 + 0.4, z, ww, wh, 0.04, '#2d3d48'])
        solid.push([x, y0 + 0.4 + wh / 2 + 0.02, z + side * 0.02, ww + 0.08, 0.04, 0.05, '#f4f2ee'], [x, y0 + 0.4 - wh / 2 - 0.03, z + side * 0.04, ww + 0.12, 0.05, 0.09, '#f4f2ee'])
        solid.push([x, y0 + 0.4, z + side * 0.015, 0.03, wh, 0.03, '#f4f2ee'])
        // 阳台（南面隔一跨一个）和栏杆；北面挂空调外机
        if (side === 1 && s.balcony && b % 2 === 0) {
          solid.push([x, y0 + 0.06, hd + 0.32, bw * 0.92, 0.07, 0.62, '#ecebe6'])
          solid.push([x, y0 + 0.3, hd + 0.62, bw * 0.92, 0.04, 0.03, '#6b7278'], [x, y0 + 0.16, hd + 0.62, bw * 0.92, 0.02, 0.02, '#6b7278'])
          for (let k = -2; k <= 2; k++) solid.push([x + k * bw * 0.2, y0 + 0.19, hd + 0.62, 0.02, 0.24, 0.02, '#6b7278'])
          glass.push([x, y0 + 0.2, hd + 0.6, bw * 0.9, 0.2, 0.012, '#7f9aa6'])
        }
        if (side === -1 && f > 0 && b % 2 === 1 && kind !== 'school') solid.push([x + bw * 0.3, y0 + 0.16, -hd - 0.14, 0.26, 0.2, 0.24, '#e9e9e6'])
      }
    }
    // 两个侧面：每层一对窄窗
    for (const side of [1, -1]) for (const z of [-hd * 0.45, hd * 0.45]) glass.push([side * (hw + 0.01), y0 + 0.4, z, 0.04, FLOOR_H * 0.45, s.d * 0.18, '#2d3d48'])
  }
  // 楼顶：女儿墙、电梯和楼梯间、水箱；学校是坡屋顶的檐口
  solid.push([0, H + 0.2, hd - 0.04, s.w, 0.4, 0.08, s.wall], [0, H + 0.2, -hd + 0.04, s.w, 0.4, 0.08, s.wall], [hw - 0.04, H + 0.2, 0, 0.08, 0.4, s.d, s.wall], [-hw + 0.04, H + 0.2, 0, 0.08, 0.4, s.d, s.wall])
  solid.push([0, H + 0.42, hd, s.w + 0.14, 0.06, 0.14, '#f1efe9'], [0, H + 0.42, -hd, s.w + 0.14, 0.06, 0.14, '#f1efe9'])
  if (s.floors >= 10) { solid.push([s.w * 0.15, H + 0.7, -s.d * 0.1, s.w * 0.32, 1.4, s.d * 0.42, s.wall]); solid.push([-s.w * 0.22, H + 0.55, s.d * 0.05, 0.9, 0.7, 0.9, '#b9bdc0'], [-s.w * 0.22, H + 0.94, s.d * 0.05, 0.94, 0.06, 0.94, '#8d9296']) }
  if (kind === 'school') solid.push([0, H / 2, hd + 0.03, 0.9, H * 0.98, 0.1, s.trim])
  // 底层：一圈深色勒脚
  solid.push([0, 0.12, 0, s.w + 0.06, 0.24, s.d + 0.06, '#6e6a63'])
  return { solid: boxes(solid), glass: boxes(glass), H }
}

/** 一栋会晃的楼。sway 由各课传进来，每帧改它的值 */
export function Building({ kind, sway, position, rotation = 0, scale = 1, children }: { kind: Kind; sway: Sway; position: [number, number, number]; rotation?: number; scale?: number; children?: ReactNode }) {
  const { geo, mats } = useMemo(() => {
    const geo = buildGeo(kind)
    sway.h.value = geo.H
    const wall = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), sway)
    const glass = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.6 }), sway)
    const depth = bend(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), sway)
    return { geo, mats: { wall, glass, depth } }
  }, [kind, sway])
  return (
    <group position={position} rotation-y={rotation} scale={scale}>
      <mesh geometry={geo.solid} material={mats.wall} customDepthMaterial={mats.depth} castShadow receiveShadow />
      <mesh geometry={geo.glass} material={mats.glass} />
      {children}
    </group>
  )
}
export const buildingHeight = (kind: Kind) => SPECS[kind].floors * FLOOR_H
