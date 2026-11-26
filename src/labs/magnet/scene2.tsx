// 电与磁 · 第 2 课 磁场和磁感线的器材：四只有机玻璃垫块托着一块玻璃板，板下是条形磁体或平放的蹄形磁体；
// 板上撒铁屑、放八枚小磁针、画发光的磁感线。东边一只地球仪，看地磁场。按厘米写，原点在第 2 格台面中心。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Metal, shell } from '@/lab-kit'
import { BAR, EARTH, fieldLines, filings, needleAngle, type MagnetKind, type P2 } from './physics'
import { BarMagnet, FieldLines, Filings, GLOBE, GlassPlate, Globe, HorseMagnet, Needle } from './magnets'
import type { V3 } from './gear'

/** 玻璃板 40 × 24 cm，底面离台面 1.8 cm；地球仪在东边 26 cm 处 */
export const L2 = { w: 40, d: 24, y0: 1.8, globe: [44, 0, -3] as V3 }
const TOPY = L2.y0 + 0.4
/** 八枚小磁针放在哪（cm） */
export const SPOTS: Record<'bar' | 'horse', P2[]> = {
  bar: [[15, 0], [-15, 0], [0, 7], [0, -7], [10, 6.5], [-10, 6.5], [10, -6.5], [-10, -6.5]],
  horse: [[0, 7.5], [0, 2], [-7.5, 6], [7.5, 6], [-8, -4], [8, -4], [0, -10.5], [-12, 2]],
}
/** 磁体本身占的地方：铁屑不撒在这里（玻璃板下面就是磁体） */
const skipOf = (k: MagnetKind) => k === 'bar' ? (p: P2) => Math.abs(p[0]) < BAR.len / 2 + 0.2 && Math.abs(p[1]) < BAR.w / 2 + 0.2
  : (p: P2) => { const r = Math.hypot(p[0], p[1] + 3); return (p[1] > -3 && Math.abs(p[0]) > 2.8 && Math.abs(p[0]) < 5.2 && p[1] < 4.2) || (p[1] <= -3 && r > 2.8 && r < 5.2) }
const BOTTLE = shell([[0, 0], [2.2, 0], [2.3, 0.2], [2.3, 7.4], [1.4, 8.4], [1.2, 9.2]], 0.18, { segs: 40 })

export function Scene2({ kind, shown, tapped, needles, lines }: { kind: 'bar' | 'horse' | 'earth'; shown: boolean; tapped: boolean; needles: boolean; lines: number }) {
  const flat: 'bar' | 'horse' = kind === 'earth' ? 'bar' : kind
  const list = useMemo(() => filings(flat, 3200, L2.w - 1, L2.d - 1, flat === 'bar' ? 5 : 8, skipOf(flat)), [flat])
  const lns = useMemo(() => fieldLines(flat).map(l => l.filter(p => Math.abs(p[0]) < L2.w / 2 - 0.4 && Math.abs(p[1]) < L2.d / 2 - 0.4)).filter(l => l.length > 6), [flat])
  const to3 = useMemo(() => (p: P2): V3 => [p[0], TOPY + 0.35, p[1]], [])
  // 地磁场：画在过地轴、朝镜头的那个竖直平面里，再绕地磁轴转两份，看着是立体的一圈
  const earthLines = useMemo(() => fieldLines('earth'), [])
  const sc = GLOBE.R / EARTH.R
  const eTo3 = useMemo(() => (p: P2): V3 => [p[0] * sc, p[1] * sc, 0], [sc])
  return <group>
    <GlassPlate w={L2.w} d={L2.d} y0={L2.y0} />
    <group position={[0, 0.02, 0]}>{flat === 'bar' ? <BarMagnet /> : <HorseMagnet />}</group>
    <Filings key={`f${flat}`} list={list} y={TOPY} shown={shown && kind !== 'earth'} tapped={tapped} />
    {needles && kind !== 'earth' && SPOTS[flat].map((p, i) => <Needle key={`${flat}${i}`} at={[p[0], TOPY, p[1]]} angle={needleAngle(flat, p)} scale={0.62} />)}
    {kind !== 'earth' && <FieldLines key={`l${flat}`} lines={lns} to3={to3} show={lines} />}
    {/* 铁屑瓶：带撒粉盖的玻璃瓶 */}
    <group position={[-17, 0, -15]}>
      <mesh geometry={BOTTLE} castShadow renderOrder={3}><meshPhysicalMaterial color="#e9f1ee" roughness={0.06} transparent opacity={0.22} depthWrite={false} clearcoat={1} envMapIntensity={1.5} /></mesh>
      <mesh position={[0, 2.1, 0]}><cylinderGeometry args={[2.05, 2.05, 3.8, 32]} /><meshStandardMaterial color="#3d3f42" roughness={0.85} metalness={0.5} /></mesh>
      <mesh position={[0, 9.9, 0]} castShadow><cylinderGeometry args={[1.45, 1.45, 1.4, 28]} /><Metal kind="aluminum" grain="turned" /></mesh>
    </group>
    {/* 地球仪和地磁场 */}
    <group position={L2.globe}>
      <Globe />
      <group position={[0, GLOBE.cy, 0]} rotation-z={GLOBE.tilt}>
        {/* 绕地磁轴（比地轴再偏 11°）转出三份 */}
        <group rotation-z={EARTH.tilt}>
          {[0, 1, 2].map(i => <group key={i} rotation-y={i * Math.PI / 3}><group rotation-z={-EARTH.tilt}>
            <FieldLines lines={earthLines} to3={eTo3} show={kind === 'earth' ? lines : 0} r={0.1} />
          </group></group>)}
        </group>
      </group>
    </group>
    {/* 台面上的一块小黑板擦式的软布（擦铁屑用） */}
    <RoundedBox args={[8, 0.8, 5]} radius={0.3} smoothness={3} position={[17, 0.4, -14]} castShadow><meshStandardMaterial color="#3e5566" roughness={0.95} /></RoundedBox>
  </group>
}
