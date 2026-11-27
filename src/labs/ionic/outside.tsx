// 窗外：一条河道（两岸石砌护岸、岸边步道和一座取样栈桥），对岸是城市自来水厂（两座圆形沉淀池、一排滤池厂房、清水池、水塔），
// 再远是城市楼群。尺寸按画面单位写（1 m = 6 个单位）。只在窗外和随堂检测的全景里看得见。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, useRipple, type Part } from '@/lab-kit'
import { facadeTex, grassTex, makeSign, rng, wallTex } from './mats'

/** 河道：z 的范围（南岸、北岸），水面高 */
export const RIVER = { z0: -150, z1: -62, y: -3 }
/** 自来水厂在河北岸 */
const PLANT = { x: -80, z: -230 }

function Clarifier({ x, z, r }: { x: number; z: number; r: number }) {
  const rip = useRipple(6, 0.02)
  const geo = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [x, 4, z], s: [r * 2 + 2, 8, r * 2 + 2], c: '#bdbab0', cyl: true })
    // 中心的刮泥桥：一根钢梁从中心到池边，上面一道栏杆
    P.push({ p: [x + r / 2, 9.2, z], s: [r, 1, 2.4], c: '#3f6f8f' }, { p: [x + r / 2, 11, z + 1], s: [r, 0.2, 0.2], c: '#e2b21c' })
    P.push({ p: [x, 9.5, z], s: [3, 3, 3], c: '#c9cfd2', cyl: true })
    return mergeParts(P)
  }, [x, z, r])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
    <mesh position={[x, 8.02, z]} rotation-x={-Math.PI / 2}><circleGeometry args={[r, 48]} /><meshStandardMaterial color="#4f6d6a" normalMap={rip} roughness={0.15} metalness={0.1} /></mesh>
  </group>
}

export function Outside() {
  const rip = useRipple(40, 0.02)
  const tex = useMemo(() => {
    const grass = grassTex().clone(); grass.repeat.set(60, 60); grass.needsUpdate = true
    const city = facadeTex().clone(); city.repeat.set(3, 6); city.needsUpdate = true
    const wall = wallTex().clone(); wall.repeat.set(40, 1); wall.needsUpdate = true
    return { grass, city, wall, sign: makeSign(['城市第二自来水厂'], '#f2f1ec', '#1f4e79', 768, 128) }
  }, [])
  const geo = useMemo(() => {
    const P: Part[] = [], r = rng(23)
    // 南岸、北岸的护岸顶：一道浅色的压顶和栏杆
    for (const z of [RIVER.z1, RIVER.z0]) {
      P.push({ p: [0, 0.4, z], s: [900, 0.8, 2.4], c: '#cfcabc' })
      for (let x = -440; x <= 440; x += 6) P.push({ p: [x, 2.6, z + (z === RIVER.z1 ? -0.6 : 0.6)], s: [0.25, 4, 0.25], c: '#6c7377', cyl: true })
      P.push({ p: [0, 4.4, z + (z === RIVER.z1 ? -0.6 : 0.6)], s: [900, 0.25, 0.25], c: '#6c7377' })
    }
    // 取样栈桥：从南岸伸进河里，桥头一只取样箱
    P.push({ p: [60, 0.3, RIVER.z1 - 14], s: [5, 0.6, 28], c: '#9aa0a3' })
    for (const z of [-8, -16, -24]) for (const s of [-1, 1]) P.push({ p: [60 + s * 2.2, -2, RIVER.z1 + z], s: [0.8, 5, 0.8], c: '#7b8085', cyl: true })
    P.push({ p: [60, 2.2, RIVER.z1 - 26], s: [3.6, 3.6, 3], c: '#e6e8e6' }, { p: [60, 4.2, RIVER.z1 - 26], s: [4, 0.4, 3.4], c: '#2a6f9e' })
    // 自来水厂：滤池厂房（长条，屋顶一排天窗）、清水池（矮的方台）、水塔
    const F = { x: PLANT.x + 70, z: PLANT.z + 10 }
    P.push({ p: [F.x, 9, F.z], s: [90, 18, 28], c: '#e4e0d4' }, { p: [F.x, 18.6, F.z], s: [92, 1.2, 30], c: '#9aa0a3' })
    for (let i = 0; i < 8; i++) P.push({ p: [F.x - 39 + i * 11, 20.2, F.z], s: [6, 2, 12], c: '#bfd0d8' })
    for (let i = 0; i < 12; i++) P.push({ p: [F.x - 41 + i * 7.5, 9, F.z + 14.05], s: [4, 7, 0.1], c: '#405563' })
    P.push({ p: [PLANT.x + 160, 3, PLANT.z + 5], s: [60, 6, 40], c: '#cbc7bb' })
    P.push({ p: [PLANT.x - 70, 22, PLANT.z + 20], s: [5, 44, 5], c: '#d8d4c8', cyl: true }, { p: [PLANT.x - 70, 48, PLANT.z + 20], s: [16, 9, 16], c: '#e6e2d6', cyl: true })
    // 远处的城市：一片高低不一的楼群（贴图另画），这里只放楼顶的设备
    for (let i = 0; i < 40; i++) { const x = -420 + i * 22 + r() * 8, z = -340 - r() * 140, h = 40 + r() * 120; P.push({ p: [x, h + 1.5, z], s: [6, 3, 6], c: '#9aa0a3' }) }
    return mergeParts(P)
  }, [])
  const towers = useMemo(() => { const r = rng(23), g: THREE.BufferGeometry[] = []
    for (let i = 0; i < 40; i++) { const x = -420 + i * 22 + r() * 8, z = -340 - r() * 140, h = 40 + r() * 120, w = 14 + r() * 8; const b = new THREE.BoxGeometry(w, h, w); b.translate(x, h / 2, z); g.push(b) }
    return g }, [])
  return <group>
    {/* 河面和两岸的草地 */}
    <mesh rotation-x={-Math.PI / 2} position={[0, RIVER.y, (RIVER.z0 + RIVER.z1) / 2]}><planeGeometry args={[900, RIVER.z1 - RIVER.z0]} /><meshStandardMaterial color="#4c6964" normalMap={rip} roughness={0.12} metalness={0.15} /></mesh>
    {[RIVER.z1, RIVER.z0].map(z => <mesh key={z} position={[0, (RIVER.y - 1) / 2, z]}><boxGeometry args={[900, -RIVER.y + 1, 0.6]} /><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, RIVER.z0 - 200]} receiveShadow><planeGeometry args={[1400, 400]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
    {towers.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial map={tex.city} color={i % 3 ? '#d7d4cc' : '#c3cbd1'} roughness={0.8} /></mesh>)}
    <Clarifier x={PLANT.x} z={PLANT.z} r={22} />
    <Clarifier x={PLANT.x - 12} z={PLANT.z - 55} r={18} />
    <mesh position={[PLANT.x + 70, 15, PLANT.z + 24.1]}><planeGeometry args={[40, 4.6]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
  </group>
}
