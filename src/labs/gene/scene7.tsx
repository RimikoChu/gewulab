// 遗传和变异 · 第 7 课的器材：温室门口的工作台上两只竹匾（大花生、小花生）、一张方格记录纸、一把游标卡尺。量过的花生一粒粒排在纸上。
import { useMemo } from 'react'
import * as THREE from 'three'
import { BambooTray, Caliper, PeanutHeap, peanutGeo } from './kit'
import type { V3 } from './parts'
import { PEANUT, SAMPLE, type PeanutKind } from './physics'
import { DESK } from './world'

const Y = DESK.h
export const TRAY = { big: [DESK.x - 2.6, Y, DESK.z - 1.3] as V3, small: [DESK.x + 2.6, Y, DESK.z - 1.3] as V3 }
/** 量的地方：卡尺夹着花生 */
export const GAUGE: V3 = [DESK.x, Y + 0.1, DESK.z - 0.2]
/** 量过的第 i 粒排在纸上的位置：大花生在左半张，小花生在右半张，每边两行 */
export const slotOf = (kind: PeanutKind, i: number): V3 => [DESK.x + (kind === 'big' ? -1.22 : 0.1) + (i % 10) * 0.125, Y + 0.02, DESK.z - 2.15 + Math.floor(i / 10) * 0.5]

function paperTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 530
  const g = c.getContext('2d')!; g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, 1024, 400)
  for (let x = 0; x <= 1024; x += 16) { g.fillStyle = x % 80 === 0 ? 'rgba(90,140,120,0.35)' : 'rgba(90,140,120,0.15)'; g.fillRect(x, 0, 1, 530) }
  for (let y = 0; y <= 530; y += 16) { g.fillStyle = y % 80 === 0 ? 'rgba(90,140,120,0.35)' : 'rgba(90,140,120,0.15)'; g.fillRect(0, y, 1024, 1) }
  g.fillStyle = '#3a4a44'; g.font = '600 30px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText(PEANUT.big.name, 30, 34); g.fillText(PEANUT.small.name, 540, 34)
  g.fillStyle = 'rgba(40,60,50,0.4)'; g.fillRect(510, 10, 2, 510)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
/** lens：两个品种各量到的长度（cm）；cur：正在量的那一粒 */
export function Desk7({ lens, cur }: { lens: Record<PeanutKind, number[]>; cur: { kind: PeanutKind; len: number; i: number } | null }) {
  const tex = useMemo(paperTex, [])
  const geos = useMemo(() => {
    const m = new Map<string, THREE.BufferGeometry>()
    for (const k of ['big', 'small'] as PeanutKind[]) for (let i = 0; i < SAMPLE; i++) m.set(`${k}${i}`, peanutGeo(1, i + (k === 'big' ? 300 : 500)))
    return m
  }, [])
  const nut = (k: PeanutKind, i: number, len: number, at: V3, yaw: number) => <mesh key={`${k}${i}`} geometry={geos.get(`${k}${i}`)} position={[at[0], at[1] + len * 0.022, at[2]]} rotation-y={yaw} scale={len / 10} castShadow><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
  return <group>
    {(['big', 'small'] as PeanutKind[]).map(k => <group key={k} position={TRAY[k]}>
      <BambooTray R={1.25} />
      <PeanutHeap len={PEANUT[k].mean / 10} n={k === 'big' ? 40 : 56} seed={k === 'big' ? 3 : 7} R={0.95} />
    </group>)}
    <mesh position={[DESK.x, Y + 0.012, DESK.z - 1.85]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[2.7, 1.4]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>
    {(['big', 'small'] as PeanutKind[]).map(k => lens[k].map((L, i) => nut(k, i, L * 0.92, slotOf(k, i), Math.PI / 2)))}
    {/* 卡尺：竖着立在台上，两个量爪从上往下夹住正在量的那一粒；不量的时候合拢着 */}
    {(() => { const L = cur ? cur.len / 10 : 0.3, left = GAUGE[0] - L / 2
      return <group position={[left + 0.04, GAUGE[1] + 0.07 + 0.575, GAUGE[2]]}><Caliper w={L + 0.06} /></group> })()}
    {/* 量爪下面垫一块小木块 */}
    <mesh position={[GAUGE[0] + 0.7, Y + 0.05, GAUGE[2]]} castShadow receiveShadow><boxGeometry args={[2.6, 0.1, 0.5]} /><meshStandardMaterial color="#c9b08a" roughness={0.8} /></mesh>
    {cur && nut(cur.kind, cur.i, cur.len, GAUGE, 0)}
  </group>
}
