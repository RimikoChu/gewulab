// 电站周围的地形：一条东西向的河谷，河谷里是电站、升压站、输电线和城郊；北面一道混凝土重力坝挡着水库，
// 坝里引出三根压力钢管进厂房；四周是长着草和灌木的山。河谷底下一条尾水渠和一条公路，路边几排阔叶树。
// 地形网格在空闲时分段生成（学呼吸实验室的做法），进页面不卡。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useConcrete, Metal } from '@/lab-kit'
import { DAM, HALL, UNITS, YARD } from './layout'
import { makeGrass, makeGravel, rep, rng } from './mats'
import { Tree } from './trees'

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
/** 一个软边的矩形：里面是 1，外面 0，边缘 w 米宽 */
const boxMask = (x: number, z: number, x0: number, x1: number, z0: number, z1: number, w: number) => smooth(x0 - w, x0, x) * (1 - smooth(x1, x1 + w, x)) * smooth(z0 - w, z0, z) * (1 - smooth(z1, z1 + w, z))
/** 简单的平滑噪声：几组正弦叠起来 */
const noise = (x: number, z: number) => 0.5 + 0.22 * Math.sin(x * 0.011 + 1.3) * Math.cos(z * 0.013 + 0.4) + 0.16 * Math.sin(x * 0.027 + z * 0.019 + 2.1) + 0.1 * Math.sin(x * 0.061 - z * 0.047) * Math.cos(x * 0.017) + 0.06 * Math.sin(x * 0.13 + z * 0.11 + Math.sin(z * 0.05) * 2)
/** 地面高度（m）：河谷、坝下和水库是平的或低的，别处是山 */
export function ground(x: number, z: number) {
  const corr = boxMask(x, z, -140, 560, -34, 380, 60)
  const toe = boxMask(x, z, DAM.x0 + 10, DAM.x1 - 10, DAM.z - 4, -30, 12)
  const lakeW = 70 + Math.max(0, DAM.z - 8 - z) * 0.55
  const lake = z < DAM.z - 6 ? smooth(lakeW + 40, lakeW, Math.abs(x + 10)) * smooth(DAM.z - 2, DAM.z - 12, z) : 0
  const flat = Math.max(corr, toe, lake)
  const hill = 26 + 78 * noise(x, z) * (0.6 + 0.4 * smooth(0, 400, Math.abs(z)))
  const river = (1 - smooth(6.5, 8.5, Math.abs(z - 40))) * -2.4   // 尾水渠的河床
  return (1 - flat) * hill + lake * -8 * (1 - corr) + river * corr
}

const SEG = 180, SIZE = 2400
/** 地形网格：一行一行分段算高度，每帧算一点 */
function useTerrain() {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); g.rotateX(-Math.PI / 2); g.translate(160, 0, -300)
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#76854a'), dry = new THREE.Color('#8f8a5e'), wood = new THREE.Color('#3f5530'), rock = new THREE.Color('#77736a'), r = rng(9)
    let row = 0, id = 0
    const step = () => {
      const end = Math.min(SEG + 1, row + 30)
      for (; row < end; row++) for (let j = 0; j <= SEG; j++) {
        const i = row * (SEG + 1) + j, x = p.getX(i), z = p.getZ(i), y = ground(x, z)
        p.setY(i, y)
        const k = smooth(18, 70, y), v = 0.9 + r() * 0.15
        c.copy(grass).lerp(dry, smooth(0.3, 0.9, noise(x * 3, z * 3)) * 0.6).lerp(wood, smooth(3, 22, y) * (0.55 + 0.45 * noise(x * 7 + 3, z * 7))).lerp(rock, k * 0.5).multiplyScalar(v)
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
      }
      if (row <= SEG) { id = requestAnimationFrame(step); return }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); setGeo(g)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [])
  return geo
}

/** 重力坝：上游面竖直、下游面 1:0.75 的斜坡，坝顶 8 m 宽，有栏杆和坝顶的启闭机房 */
function damGeo() {
  const s = new THREE.Shape(), z0 = DAM.z - 8, H = DAM.h
  s.moveTo(z0, -4); s.lineTo(z0, H); s.lineTo(z0 + 8, H); s.lineTo(z0 + 8, H - 6); s.lineTo(z0 + 8 + (H - 2) * 0.75, -4); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: DAM.x1 - DAM.x0, bevelEnabled: false })
  g.rotateY(Math.PI / 2)   // 截面在 z–y 平面里，沿 x 拉伸
  g.scale(1, 1, -1); g.translate(DAM.x0, 0, 0)
  // 按世界坐标贴图
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)) > 0.5; uv.setXY(i, (ax ? p.getZ(i) : p.getX(i)) / 8, p.getY(i) / 8) }
  g.computeVertexNormals()
  return g
}

/** 一根压力钢管：从坝的下游面斜着下来，拐进厂房北墙 */
function penstock(x: number) {
  const z0 = DAM.z, H = DAM.h
  const face = (y: number) => z0 + 8 + (H - 6 - y) / (H - 2) * (H - 2) * 0.75   // 坝下游面在高度 y 处的 z
  const pts = [new THREE.Vector3(x, 12, face(12) - 0.6), new THREE.Vector3(x, 4.5, face(12) + 7), new THREE.Vector3(x, 2.6, HALL.z0 - 6), new THREE.Vector3(x, 2.4, HALL.z0 + 0.5)]
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 60, 1.2, 24)
}

/** 路边、河边、城边的树：位置、高度 */
const TREES: [number, number, number][] = [
  [-62, 22, 11], [-50, 30, 9], [-30, 27, 10], [-14, 31, 8.5], [44, 54, 10], [62, 56, 9], [84, 26, 11], [120, 32, 9.5], [140, 24, 10], [190, 30, 12],
  [240, 26, 9], [262, 33, 10.5], [300, 28, 9], [326, 34, 11], [350, 30, 9.5], [396, 28, 10], [418, 22, 12], [-70, -6, 10], [82, -18, 11], [250, -20, 12],
]

export function Land() {
  const terrain = useTerrain()
  const [cd, cn, cr] = useConcrete(1, 1)
  const tex = useMemo(() => {
    const t = [cd, cn, cr].map(x => { const c = x.clone(); c.repeat.set(1, 1); c.needsUpdate = true; return c })
    return { conc: t, grass: rep(makeGrass(), 160, 160), gravel: rep(makeGravel(), 60, 4), apron: [cd, cn, cr].map(x => { const c = x.clone(); c.repeat.set(30, 8); c.needsUpdate = true; return c }) }
  }, [cd, cn, cr])
  const geo = useMemo(() => ({ dam: damGeo(), pipes: UNITS.map(penstock) }), [])
  return <group>
    {terrain && <mesh geometry={terrain} receiveShadow><meshStandardMaterial vertexColors map={tex.grass} roughness={0.95} /></mesh>}
    {/* 电站前的混凝土场地 */}
    <mesh rotation-x={-Math.PI / 2} position={[18, 0.02, 4]} receiveShadow><planeGeometry args={[140, 44]} /><meshStandardMaterial map={tex.apron[0]} normalMap={tex.apron[1]} roughnessMap={tex.apron[2]} color="#a9a69d" /></mesh>
    {/* 公路：沥青路面、白色边线 */}
    <mesh rotation-x={-Math.PI / 2} position={[190, 0.03, 22]} receiveShadow><planeGeometry args={[520, 8]} /><meshStandardMaterial color="#3c3e40" roughness={0.92} /></mesh>
    {[-3.6, 3.6].map(dz => <mesh key={dz} rotation-x={-Math.PI / 2} position={[190, 0.04, 22 + dz]}><planeGeometry args={[520, 0.15]} /><meshStandardMaterial color="#e4e3dc" roughness={0.7} /></mesh>)}
    {/* 尾水渠：河谷南边的一条河，混凝土护岸 */}
    <mesh rotation-x={-Math.PI / 2} position={[190, -1.4, 40]}><planeGeometry args={[620, 14]} /><meshPhysicalMaterial color="#2f5a63" roughness={0.12} metalness={0.1} clearcoat={1} transparent opacity={0.92} /></mesh>
    {[33, 47].map(z => <mesh key={z} position={[190, -1, z]}><boxGeometry args={[620, 2.2, 0.5]} /><meshStandardMaterial map={tex.conc[0]} color="#a3a097" roughness={0.9} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[190, -2.2, 40]}><planeGeometry args={[620, 14]} /><meshStandardMaterial color="#3f4a40" roughness={1} /></mesh>
    {/* 大坝、水库 */}
    <mesh geometry={geo.dam} castShadow receiveShadow><meshStandardMaterial map={tex.conc[0]} normalMap={tex.conc[1]} roughnessMap={tex.conc[2]} color="#bdb9ae" /></mesh>
    <mesh position={[(DAM.x0 + DAM.x1) / 2, DAM.h + 0.6, DAM.z - 7.6]}><boxGeometry args={[DAM.x1 - DAM.x0, 1.2, 0.25]} /><meshStandardMaterial color="#c9c6be" roughness={0.8} /></mesh>
    {[-50, -10, 30].map(x => <mesh key={x} position={[x, DAM.h + 2.5, DAM.z - 4]} castShadow><boxGeometry args={[9, 5, 5]} /><meshStandardMaterial color="#d8d4c8" roughness={0.8} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[-10, DAM.h - 3, DAM.z - 560]}><planeGeometry args={[1200, 1100]} /><meshPhysicalMaterial color="#2c5560" roughness={0.08} metalness={0.15} clearcoat={1} /></mesh>
    {/* 压力钢管和管墩 */}
    {geo.pipes.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>)}
    {UNITS.map(x => [HALL.z0 - 10, HALL.z0 - 18].map(z => <mesh key={`${x}${z}`} position={[x, 0.8, z]} castShadow><boxGeometry args={[3.6, 1.6, 2]} /><meshStandardMaterial map={tex.conc[0]} color="#b3afa5" /></mesh>))}
    {/* 升压站外的碎石路 */}
    <mesh rotation-x={-Math.PI / 2} position={[(YARD.x0 + YARD.x1) / 2, 0.035, 18.5]}><planeGeometry args={[YARD.x1 - YARD.x0, 3]} /><meshStandardMaterial map={tex.gravel} roughness={0.95} /></mesh>
    {TREES.map(([x, z, h], i) => <Tree key={i} x={x} z={z} h={h} seed={i * 13 + 5} />)}
  </group>
}
