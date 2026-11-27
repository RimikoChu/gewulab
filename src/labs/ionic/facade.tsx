// 检测中心大楼外面看得见的细节和河边的行道树：东山墙上一整片玻璃幕墙（竖梃、每层一道横梁）、门厅的雨棚和台阶、楼名牌；
// 北面（临河一面）每隔一跨一片竖向遮阳板，中段一块凸出的玻璃幕墙；楼顶的冷却塔和排风机；沿河步道两排行道树（不规则的树冠）。
// 只在室外的机位（随堂检测）看得见。尺寸按画面单位写（1 m = 6 个单位）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, mergeParts, type Part } from '@/lab-kit'
import { makeSign, rng } from './mats'

/** 实验大厅的范围（和 world.tsx 的 HALL 一致；这里不引用它，免得两个文件互相引用） */
const H = { x0: -172, x1: 4, z0: -18, z1: 14, h: 22 }
const Y1 = H.h + 0.6, Y2 = Y1 + 42, X0 = H.x0 - 0.6, X1 = H.x1 + 0.6, Z0 = H.z0 - 0.6, Z1 = H.z1 + 0.6
const FLOOR = 10.5

/** 一片玻璃幕墙：深色的玻璃面加一格格铝合金竖梃和横梁。沿 x（along='x'）或沿 z 铺，face 是玻璃面朝外的那一侧坐标 */
function curtain(P: Part[], along: 'x' | 'z', a0: number, a1: number, y0: number, y1: number, face: number, out: number) {
  const mid = (a0 + a1) / 2, len = a1 - a0
  for (let a = a0; a <= a1 + 0.01; a += 3) P.push(along === 'x' ? { p: [a, (y0 + y1) / 2, face + out * 0.25], s: [0.3, y1 - y0, 0.5], c: '#b9bec2' } : { p: [face + out * 0.25, (y0 + y1) / 2, a], s: [0.5, y1 - y0, 0.3], c: '#b9bec2' })
  for (let y = y0; y <= y1 + 0.01; y += FLOOR) P.push(along === 'x' ? { p: [mid, y, face + out * 0.3], s: [len, 0.5, 0.6], c: '#c9cdd0' } : { p: [face + out * 0.3, y, mid], s: [0.6, 0.5, len], c: '#c9cdd0' })
}

/** 一棵树：树干一截圆柱，树冠是几团挤在一起的不规则球（顶点按噪声推进推出），颜色深浅不一 */
function tree(r: () => number, x: number, z: number, s: number) {
  const gs: THREE.BufferGeometry[] = []
  const paint = (g: THREE.BufferGeometry, c: THREE.Color) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = 0.85 + r() * 0.3; a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
  const trunk = new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 7 * s, 8); trunk.translate(x, 3.5 * s, z); gs.push(paint(trunk.toNonIndexed(), new THREE.Color('#5a4632')))
  const n = 4 + Math.floor(r() * 3), green = new THREE.Color(r() < 0.5 ? '#4f7a36' : '#5f8a3c')
  for (let i = 0; i < n; i++) {
    const R = (2.6 + r() * 1.6) * s, b = new THREE.IcosahedronGeometry(R, 2), p = b.attributes.position
    for (let k = 0; k < p.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(p, k), f = 1 + (Math.sin(v.x * 1.7 + i) * Math.cos(v.y * 2.1) * Math.sin(v.z * 1.3)) * 0.18; p.setXYZ(k, v.x * f, v.y * f * 0.85, v.z * f) }
    b.computeVertexNormals()
    const a = r() * Math.PI * 2, d = (i ? 1.6 + r() * 1.4 : 0) * s
    b.translate(x + Math.cos(a) * d, (8.5 + r() * 2.5) * s, z + Math.sin(a) * d)
    gs.push(paint(b.toNonIndexed(), green))
  }
  return gs
}

export function Facade() {
  const geo = useMemo(() => {
    const P: Part[] = []
    // 东山墙：二层以上一整片玻璃幕墙；一层是门厅的玻璃门和两侧的实墙
    curtain(P, 'z', Z0 + 2, Z1 - 2, Y1, Y2, X1, 1)
    P.push({ p: [X1 + 4, 13.6, (Z0 + Z1) / 2], s: [8, 0.7, 18], c: '#d6dade' }, { p: [X1 + 7.6, 6.8, (Z0 + Z1) / 2 - 8], s: [0.4, 13.6, 0.4], c: '#9aa0a4', cyl: true }, { p: [X1 + 7.6, 6.8, (Z0 + Z1) / 2 + 8], s: [0.4, 13.6, 0.4], c: '#9aa0a4', cyl: true })
    for (let i = 0; i < 3; i++) P.push({ p: [X1 + 3 + i * 1.6, 0.35 + i * 0.35 - 0.35, (Z0 + Z1) / 2], s: [9.6 - i * 1.6, 0.7 + i * 0.7, 14], c: '#bdb8ac' })
    // 北面（临河）：竖向遮阳板，中段一块凸出的玻璃幕墙
    for (let x = X0 + 6; x < X1 - 4; x += 9) if (x < -120 || x > -60) P.push({ p: [x, (Y1 + Y2) / 2, Z0 - 0.9], s: [0.6, Y2 - Y1, 1.8], c: '#d9d4c8' })
    curtain(P, 'x', -120, -60, Y1, Y2, Z0 - 1.6, -1)
    P.push({ p: [-90, Y2 + 1.2, Z0 - 0.8], s: [62, 2.4, 1.8], c: '#d9d4c8' })
    // 楼顶：两台方形冷却塔、一排风机、一圈栏杆
    for (const x of [-30, -16]) P.push({ p: [x, Y2 + 3, Z1 - 10], s: [9, 6, 9], c: '#c9cfd2' }, { p: [x, Y2 + 6.6, Z1 - 10], s: [5, 1.2, 5], c: '#7b8085', cyl: true })
    for (let i = 0; i < 5; i++) P.push({ p: [-150 + i * 8, Y2 + 1.4, Z0 + 6], s: [3, 2.8, 3], c: '#aab0b4' })
    // 沿河步道：一条浅色的铺地
    P.push({ p: [-80, 0.06, -44], s: [520, 0.12, 10], c: '#c9c3b5' })
    return mergeParts(P)
  }, [])
  const glass = useMemo(() => mergeGeometries([
    new THREE.PlaneGeometry(Z1 - Z0 - 4, Y2 - Y1).rotateY(Math.PI / 2).translate(X1 + 0.05, (Y1 + Y2) / 2, (Z0 + Z1) / 2),
    new THREE.PlaneGeometry(14, 11).rotateY(Math.PI / 2).translate(X1 + 0.08, 5.6, (Z0 + Z1) / 2),
    new THREE.PlaneGeometry(60, Y2 - Y1).rotateY(Math.PI).translate(-90, (Y1 + Y2) / 2, Z0 - 1.6),
  ]), [])
  const trees = useMemo(() => { const r = rng(57), gs: THREE.BufferGeometry[] = []
    for (let x = -200; x <= 60; x += 13) gs.push(...tree(r, x + (r() - 0.5) * 3, -37 + (r() - 0.5) * 2, 0.9 + r() * 0.3))
    for (let x = -190; x <= 70; x += 15) gs.push(...tree(r, x + (r() - 0.5) * 4, -160 - r() * 4, 0.9 + r() * 0.35))
    for (let z = -30; z <= 10; z += 12) gs.push(...tree(r, X1 + 18 + (r() - 0.5) * 2, z, 0.95 + r() * 0.2))
    return mergeGeometries(gs) }, [])
  const sign = useMemo(() => makeSign(['城市水质检测中心'], '#1f4e79', '#ffffff', 1024, 128), [])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.6} metal={0.15} /></mesh>
    <mesh geometry={glass}><meshPhysicalMaterial color="#35505f" roughness={0.06} metalness={0.35} clearcoat={1} envMapIntensity={1.4} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={trees} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.9} flatShading /></mesh>
    <mesh position={[X1 + 8.05, 15.2, (Z0 + Z1) / 2]} rotation-y={Math.PI / 2}><planeGeometry args={[16, 2]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    <mesh position={[-90, Y2 + 1.2, Z0 - 1.75]} rotation-y={Math.PI}><planeGeometry args={[30, 2.2]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
  </group>
}
