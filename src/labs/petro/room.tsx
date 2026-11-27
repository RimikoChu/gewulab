// 中心化验室：厂区最西头的一座平房，朝南敞开。后墙一条化验台，自西向东三格，第 3、4、5 课各用一格。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, type Part } from '@/lab-kit'
import { benchTex, makeSign, rep, tileTex, wallTex, wallTileTex } from './mats'
import { box, rng } from './parts'

/** 房间：x 的范围、后墙和门脸的 z、层高 */
export const ROOM = { x0: -74, x1: -42, z0: -9, z1: 3, h: 4.4 }
/** 化验台：前后沿、台面高；器材摆在 z = BZ 这条线上 */
export const BENCH = { z0: -8.95, z1: -8.1 }
export const BENCH_TOP = 0.9, BZ = -8.56
/** 三格的位置（x） */
export const ST = { l3: -65, l4: -58, l5: -51 }

/** 一块按米铺贴图的板：x0–x1、y0–y1、z0–z1，k 米一格 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const [u, v] = ay > 0.5 ? [p.getX(i), p.getZ(i)] : ax > 0.5 ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]; uv.setXY(i, u / k, v / k) }
  return g
}

export function LabRoom() {
  const R = ROOM, T = BENCH_TOP
  const tex = useMemo(() => ({ tile: rep(tileTex(), 1, 1), wall: rep(wallTex(), 1, 1), bench: rep(benchTex(), 1, 1), wtile: rep(wallTileTex(), 1, 1), name: makeSign(['中心化验室'], '#28587c', '#ffffff', 768, 128) }), [])
  const geo = useMemo(() => {
    const P: Part[] = [], out: Part[] = [], bottles: Part[] = [], r = rng(17), mid = (R.x0 + R.x1) / 2, len = R.x1 - R.x0
    // 门脸的柱子和大梁
    for (let x = R.x0; x <= R.x1 + 0.01; x += 8) P.push(box(x, 0, R.z1 - 0.3, 0.5, R.h, 0.5, '#e2e2dc'))
    P.push(box(mid, R.h - 0.6, R.z1 - 0.3, len, 0.6, 0.55, '#d8d7d0'))
    // 化验台：一排柜体，柜门一扇扇，每扇一只拉手；踢脚
    for (let x = R.x0 + 0.6; x < R.x1 - 1.2; x += 0.9) P.push(box(x + 0.45, 0.1, BENCH.z1 - 0.02, 0.86, T - 0.16, 0.04, '#46525c'), box(x + 0.45, T - 0.17, BENCH.z1 + 0.005, 0.24, 0.02, 0.025, '#9aa3aa'))
    P.push(box(mid, 0, (BENCH.z0 + BENCH.z1) / 2, len - 1, 0.1, BENCH.z1 - BENCH.z0 - 0.1, '#3d4146'), box(mid, 0.1, (BENCH.z0 + BENCH.z1) / 2 - 0.05, len - 1, T - 0.14, BENCH.z1 - BENCH.z0 - 0.1, '#3c464e'))
    // 台面后面的挡水、试剂架（两层搁板）和立柱
    P.push(box(mid, T, BENCH.z0 + 0.03, len - 1, 0.1, 0.04, '#dfe2df'))
    for (const y of [T + 0.72, T + 1.08]) P.push(box(mid, y, BENCH.z0 + 0.13, len - 1, 0.025, 0.24, '#c9ccc9'))
    for (let x = R.x0 + 1; x < R.x1 - 1; x += 3.5) P.push(box(x, T, BENCH.z0 + 0.03, 0.03, 1.12, 0.03, '#a8aca9'))
    // 台面上方的墙：一条矮试剂架（搁板、托架、挡条），一排插座
    P.push(box(mid, T + 0.4, BENCH.z0 + 0.1, len - 1, 0.02, 0.17, '#cfd2cf'), box(mid, T + 0.42, BENCH.z0 + 0.18, len - 1, 0.03, 0.008, '#a8aca9'))
    for (let x = R.x0 + 0.9; x < R.x1 - 0.8; x += 1.2) P.push(box(x, T + 0.3, BENCH.z0 + 0.06, 0.02, 0.1, 0.1, '#a8aca9'))
    for (let x = R.x0 + 1.5; x < R.x1 - 1; x += 1.75) P.push(box(x, T + 0.16, BENCH.z0 + 0.012, 0.16, 0.09, 0.012, '#eceeed'), box(x - 0.035, T + 0.185, BENCH.z0 + 0.02, 0.03, 0.03, 0.006, '#3a3f44'), box(x + 0.035, T + 0.185, BENCH.z0 + 0.02, 0.03, 0.03, 0.006, '#3a3f44'))
    for (let x = R.x0 + 0.7; x < R.x1 - 0.7; x += 0.085) {
      if (r() < 0.3 || [ST.l3, ST.l4, ST.l5].some(s => x > s - 0.2 && x < s + 0.28)) continue
      const rad = 0.024 + r() * 0.014, h = 0.09 + r() * 0.08, z = BENCH.z0 + 0.1 + (r() - 0.5) * 0.04, k = r()
      bottles.push({ p: [x, T + 0.42 + h / 2, z], s: [rad, h, rad], c: k < 0.4 ? '#5a3214' : k < 0.75 ? '#b9cccf' : '#e8e6de', cyl: true }, { p: [x, T + 0.42 + h + 0.014, z], s: [rad * 0.55, 0.028, rad * 0.55], c: r() < 0.5 ? '#1f2124' : '#2f6fb8', cyl: true })
    }
    // 墙上的吊柜
    for (let x = R.x0 + 2.5; x < R.x1 - 2; x += 5) P.push(box(x, T + 1.5, R.z0 + 0.22, 4.2, 0.75, 0.4, '#e6e5df'), box(x, T + 1.5, R.z0 + 0.425, 0.02, 0.75, 0.02, '#a8aca9'), box(x - 1.05, T + 1.5, R.z0 + 0.425, 0.02, 0.75, 0.02, '#c2c5c2'), box(x + 1.05, T + 1.5, R.z0 + 0.425, 0.02, 0.75, 0.02, '#c2c5c2'))
    // 试剂架上的试剂瓶：棕色的和透明的，避开三格器材的正后方
    for (const y of [T + 0.745, T + 1.105]) for (let x = R.x0 + 0.8; x < R.x1 - 0.8; x += 0.12) {
      if (r() < 0.35 || [ST.l3, ST.l4, ST.l5].some(s => Math.abs(x - s) < 1.0)) continue
      const rad = 0.03 + r() * 0.018, h = 0.11 + r() * 0.09, z = BENCH.z0 + 0.12 + (r() - 0.5) * 0.06
      bottles.push({ p: [x, y + h / 2, z], s: [rad, h, rad], c: r() < 0.5 ? '#5a3214' : '#b9cccf', cyl: true }, { p: [x, y + h + 0.018, z], s: [rad * 0.55, 0.036, rad * 0.55], c: r() < 0.5 ? '#1f2124' : '#d6d4cc', cyl: true })
    }
    // 房子的外壳：屋面板、女儿墙
    out.push(box(mid, R.h, (R.z0 + R.z1) / 2, len + 1, 0.4, R.z1 - R.z0 + 0.8, '#d6d2c8'), box(mid, R.h + 0.4, (R.z0 + R.z1) / 2, len + 1.4, 1.5, R.z1 - R.z0 + 1.2, '#dfdbd0'), box(mid, R.h + 1.9, (R.z0 + R.z1) / 2, len + 1.8, 0.3, R.z1 - R.z0 + 1.6, '#bdb8ad'))
    return {
      hall: mergeParts(P), out: mergeParts(out), bottles: mergeParts(bottles),
      floor: slab(R.x0, R.x1, 0, 0.05, R.z0, R.z1, 1.2), back: slab(R.x0, R.x1, 0, R.h, R.z0 - 0.3, R.z0, 2),
      ends: [slab(R.x0 - 0.3, R.x0, 0, R.h, R.z0, R.z1, 2), slab(R.x1, R.x1 + 0.3, 0, R.h, R.z0, R.z1, 2)],
      top: slab(R.x0 + 0.5, R.x1 - 0.5, T - 0.04, T, BENCH.z0, BENCH.z1 + 0.03, 0.8),
      tiles: slab(R.x0 + 0.5, R.x1 - 0.5, T, T + 1.1, R.z0 - 0.005, R.z0 + 0.012, 0.15),
    }
  }, [R, T])
  return <group>
    <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.4} /></mesh>
    <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.92} /></mesh>
    {geo.ends.map((g, i) => <mesh key={i} geometry={g} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.92} /></mesh>)}
    <mesh position={[(R.x0 + R.x1) / 2, R.h - 0.03, (R.z0 + R.z1) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[R.x1 - R.x0, R.z1 - R.z0]} /><meshStandardMaterial color="#d8d8d2" roughness={0.9} /></mesh>
    {Array.from({ length: 6 }, (_, i) => R.x0 + 3 + i * 5.2).flatMap(cx => [-6.5, -2].map(cz => <mesh key={`${cx}${cz}`} position={[cx, R.h - 0.06, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[1.2, 0.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
    <mesh geometry={geo.tiles} receiveShadow><meshPhysicalMaterial map={tex.wtile} roughness={0.25} clearcoat={0.5} clearcoatRoughness={0.2} /></mesh>
    <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
    <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
    <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.9} /></mesh>
    <mesh geometry={geo.out} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
    <mesh position={[(R.x0 + R.x1) / 2, R.h + 1.15, R.z1 + 0.62]}><planeGeometry args={[7, 1.15]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
  </group>
}
