// 电磁感应和电网 · 第 5 课 交流发电机的器材：厂房西头剖开的 1 号机（见 gen.tsx），旁边立着一块录波屏，
// 屏上同时画两条线：蓝色是穿过高亮线圈的磁通量 Φ，黄色是线圈里的电动势 e。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { UNITS } from './layout'
import { genEmf, genFlux, genPeak } from './physics'
import { Generator } from './gen'

/** 录波屏的位置（相对 1 号机中心） */
export const R5 = { screen: [-3.6, 0, -2.6] as [number, number, number], h: 3.3 }

/** 录波屏：立在地上的一块大屏，记下最近两个周期里的 Φ 和 e */
function WaveScreen({ phi }: { phi: () => number }) {
  const { tex, g } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 576
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, g: c.getContext('2d')! }
  }, [])
  const hist = useRef<number[]>([]), last = useRef(Number.NaN), f = useRef(phi); f.current = phi
  useFrame(() => {
    const p = f.current()
    if (p !== last.current) { hist.current.push(p); if (hist.current.length > 480) hist.current.shift(); last.current = p }
    const W = 1024, H = 576, x0 = 80, y0 = H / 2, A = 200
    g.fillStyle = '#071311'; g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(120,200,180,0.16)'; g.lineWidth = 2
    for (let i = 1; i < 12; i++) { g.beginPath(); g.moveTo(i * W / 12, 0); g.lineTo(i * W / 12, H); g.stroke() }
    for (let j = 1; j < 6; j++) { g.beginPath(); g.moveTo(0, j * H / 6); g.lineTo(W, j * H / 6); g.stroke() }
    g.strokeStyle = 'rgba(220,240,235,0.5)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(W - 20, y0); g.stroke()
    // 按电角度横着排：最新的一点在最右边，往左每 2π 占屏宽的一半
    const h = hist.current, n = h.length
    const draw = (val: (p: number) => number, color: string) => {
      g.strokeStyle = color; g.lineWidth = 5; g.beginPath()
      for (let i = 0; i < n; i++) { const x = W - 40 - (h[n - 1] - h[i]) / (Math.PI * 2) * (W - 120) / 2; if (x < x0) continue; const y = y0 - val(h[i]) * A; if (i && x >= x0) g.lineTo(x, y); else g.moveTo(x, y) }
      g.stroke()
    }
    draw(genFlux, '#7fa6ff'); draw(p2 => genEmf(p2) / genPeak(), '#ffd34d')
    g.font = '600 34px ui-sans-serif, Helvetica, Arial'; g.fillStyle = '#7fa6ff'; g.fillText('Φ', 24, 120); g.fillStyle = '#ffd34d'; g.fillText('e', 26, 170)
    tex.needsUpdate = true
  })
  return <group>
    <mesh position={[0, R5.h / 2, 0]} castShadow><boxGeometry args={[0.14, R5.h, 0.14]} /><meshStandardMaterial color="#3b4046" metalness={0.5} roughness={0.4} /></mesh>
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow><boxGeometry args={[0.8, 0.06, 0.6]} /><meshStandardMaterial color="#2c3135" metalness={0.4} roughness={0.5} /></mesh>
    <RoundedBox args={[2.6, 1.52, 0.09]} radius={0.03} smoothness={3} position={[0, R5.h, 0]} castShadow><meshPhysicalMaterial color="#1d2125" roughness={0.4} clearcoat={0.3} /></RoundedBox>
    <mesh position={[0, R5.h + 0.02, 0.047]}><planeGeometry args={[2.46, 1.38]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
  </group>
}

/** phi：每帧问一次转子转到的电角度；field：转子励磁了没有（有没有磁感线） */
export function Rig5({ phi = () => 0.9, field = true, screen = true }: { phi?: () => number; field?: boolean; screen?: boolean }) {
  return <group position={[UNITS[0], 0, 0]}>
    <Generator cut phi={phi} field={field} name="1 号机" />
    {screen && <group position={R5.screen} rotation-y={0.62}><WaveScreen phi={phi} /></group>}
  </group>
}
