// 地球的运动 · 第 6 课的三维场景：北京的一片操场，正午。太阳在南边的天上，旗杆的影子朝北，地上有一把卷尺。
// 操场本身在 world.tsx；这里画太阳、阳光、影子和卷尺。北是 −z，南是 +z。
import { useMemo } from 'react'
import * as THREE from 'three'
import { LabStage, Rod, type Label } from '@/lab-kit'
import { DAYLIGHT } from './space'
import { GROUND, type Want } from './world'

const POLE = 10, FAR = 30                                 // 旗杆高度；太阳画在离旗杆顶多远的地方
const [GX, GY, GZ] = GROUND
const TARGET = new THREE.Vector3(GX, GY + 9.5, GZ + 1)
const SPAN: [number, number] = [62, 31]
const VIEW: [number, number] = [Math.PI / 2 - 0.12, 0.13]  // 站在东边往西看：左边是南，右边是北
const RAD = Math.PI / 180

export default function Scene6({ altitude, shadow, city = '北京' }: { altitude: number; shadow: number; city?: string }) {
  const a = altitude * RAD, sun: [number, number, number] = [0, POLE + Math.sin(a) * FAR, Math.cos(a) * FAR]
  const tape = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 2500; c.height = 60
    const g = c.getContext('2d')!
    g.fillStyle = '#ffe14d'; g.fillRect(0, 0, 2500, 60); g.fillStyle = '#1d2327'; g.font = '700 34px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
    for (let m = 0; m <= 25; m++) { g.fillRect(m * 100 - 2, 0, 4, m % 5 ? 26 : 60); if (m % 5 === 0 && m) g.fillText(String(m), m * 100 + 8, 40) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
  const labels: Label[] = [
    { id: 'alt', at: [GX, GY + sun[1] + 3.2, GZ + sun[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>正午太阳高度</small>{altitude.toFixed(1)}°</> },
    { id: 'len', at: [GX, GY + 1.6, GZ - shadow], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>影长</small>{shadow.toFixed(2)} m</> },
    { id: 'nPole', at: [GX, GY + POLE + 1.2, GZ], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `旗杆 · 高 ${POLE} m` },
    { id: 'south', at: [GX, GY + 0.5, GZ + 24], ax: 0.5, className: 'scene-name', children: '南' },
    { id: 'north', at: [GX, GY + 0.5, GZ - 27], ax: 0.5, className: 'scene-name', children: '北' },
    { id: 'nCity', at: [GX, GY + 16.5, GZ - 34], ax: 0.5, name: true, className: 'scene-name', children: `${city} · 正午` },
  ]
  return (
    <LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...DAYLIGHT} world={{}}>
      <group position={GROUND}>
        <directionalLight position={sun} intensity={2.4} color="#fff6e6" />
        {/* 太阳 */}
        <mesh position={sun}><sphereGeometry args={[1.5, 32, 24]} /><meshBasicMaterial color="#ffd23f" toneMapped={false} fog={false} /></mesh>
        <mesh position={sun}><sphereGeometry args={[2.3, 24, 16]} /><meshBasicMaterial color="#ffe89a" transparent opacity={0.3} depthWrite={false} toneMapped={false} fog={false} /></mesh>
        {/* 一束阳光：擦过旗杆顶，落在影子的尖上 */}
        <Rod from={sun} to={[0, 0.03, -shadow]} r={0.045}><meshBasicMaterial color="#ffd23f" transparent opacity={0.85} toneMapped={false} /></Rod>
        {/* 影子，和地上的卷尺（从旗杆脚往北拉，每米一格） */}
        <mesh position={[0, 0.035, -shadow / 2]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.5, shadow]} /><meshBasicMaterial color="#1c2a22" transparent opacity={0.72} /></mesh>
        <mesh position={[0.75, 0.03, -12.5]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}><planeGeometry args={[25, 0.6]} /><meshBasicMaterial map={tape} toneMapped={false} /></mesh>
      </group>
    </LabStage>
  )
}
