// 住宅楼的外观和阳台的陈设：随堂检测的全景里补出二到六层的外立面（窗、空调机位、楼层线、女儿墙）；阳台墙下半截贴瓷砖，顶上一排晾衣杆和几件衣服。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, Painted, mergeParts, type Part } from '@/lab-kit'
import { BACK, H } from './layout'
import { makePaint, makeTile, rep } from './mats'

const X0 = -132.4, X1 = 42.4, FLOORS = 5, BAY = 25

/** 一层一开间的立面：浅米色涂料墙、一扇推拉窗（深灰窗框、玻璃映着天光）、窗下一块空调机位的百叶 */
function bayTex() {
  const W = 512, Hh = 576, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d')!
  g.fillStyle = '#d9d0c0'; g.fillRect(0, 0, W, Hh)
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`; g.fillRect(Math.random() * W, Math.random() * Hh, 2, 2) }
  const wx = 110, wy = 120, ww = 292, wh = 300
  g.fillStyle = '#4b5157'; g.fillRect(wx - 10, wy - 10, ww + 20, wh + 20)
  const q = g.createLinearGradient(0, wy, 0, wy + wh); q.addColorStop(0, '#9fb5c8'); q.addColorStop(1, '#5d6f80'); g.fillStyle = q; g.fillRect(wx, wy, ww, wh)
  g.fillStyle = '#4b5157'; g.fillRect(wx + ww / 2 - 4, wy, 8, wh); g.fillRect(wx, wy + wh * 0.62, ww, 6)
  g.fillStyle = '#c9c0b0'; g.fillRect(wx - 20, wy + wh + 10, ww + 40, 14)
  // 空调机位的百叶
  g.fillStyle = '#8e8a83'; g.fillRect(wx + 40, wy + wh + 50, ww - 80, 70)
  g.fillStyle = '#6f6b65'; for (let y = wy + wh + 56; y < wy + wh + 116; y += 10) g.fillRect(wx + 44, y, ww - 88, 4)
  // 楼层线
  g.fillStyle = '#b8ad9b'; g.fillRect(0, Hh - 18, W, 18)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
}

/** 二到六层：一整块楼体，正面贴立面，顶上一圈女儿墙 */
export function Upper() {
  const { front, side, parts } = useMemo(() => {
    const f = bayTex(); f.repeat.set((X1 - X0) / BAY, FLOORS)
    const P: Part[] = []
    for (let k = 1; k <= FLOORS; k++) P.push({ p: [(X0 + X1) / 2, H + k * H - 0.3, 0.5], s: [X1 - X0 + 0.8, 0.6, 1.2], c: '#bfb4a2' })
    P.push({ p: [(X0 + X1) / 2, H * (FLOORS + 1) + 1.5, 0.3], s: [X1 - X0 + 1, 3, 0.8], c: '#cfc6b6' }, { p: [(X0 + X1) / 2, H * (FLOORS + 1) + 1.5, BACK - 2.4], s: [X1 - X0 + 1, 3, 0.8], c: '#cfc6b6' })
    for (const x of [X0, X1]) P.push({ p: [x, H * (FLOORS + 1) + 1.5, (BACK - 2.4) / 2], s: [0.8, 3, -BACK + 2.4], c: '#cfc6b6' })
    return { front: f, side: rep(makePaint('#d4cbbb'), 4, 12), parts: mergeParts(P) }
  }, [])
  const Hh = H * FLOORS, cy = H + Hh / 2 + 0.3, D = -BACK + 2.4
  const mats = useMemo(() => {
    const s = new THREE.MeshStandardMaterial({ map: side, roughness: 0.9 })
    return [s, s, new THREE.MeshStandardMaterial({ color: '#9a958c', roughness: 0.9 }), s, new THREE.MeshStandardMaterial({ map: front, roughness: 0.8 }), s]
  }, [front, side])
  return <group>
    <mesh position={[(X0 + X1) / 2, cy, -D / 2]} material={mats} castShadow receiveShadow><boxGeometry args={[X1 - X0, Hh, D]} /></mesh>
    <mesh geometry={parts} castShadow receiveShadow><Painted rough={0.8} metal={0} /></mesh>
  </group>
}

/** 阳台：墙下半截贴瓷砖，顶上两根晾衣杆，挂着几件衣服 */
export function Balcony() {
  const tile = useMemo(() => rep(makeTile('#e4e1da', '#bdb9b0', 4, 19, 2), 3, 1.2), [])
  const cloth = useMemo(() => {
    const P: Part[] = []
    const cs = ['#6f8fb0', '#e9e6df', '#b7604f', '#8a9a7a', '#d9c7a0']
    for (let i = 0; i < 5; i++) { const x = 17 + i * 4.2; P.push({ p: [x, 21.6, -33], s: [3.2, 6.4, 0.08], c: cs[i], r: [0, 0.15 * Math.sin(i * 2), 0] }, { p: [x, 25, -33], s: [2.6, 0.12, 0.12], c: '#d8d8d4' }) }
    return mergeParts(P)
  }, [])
  return <group>
    <mesh position={[25, 6, BACK + 0.04]}><planeGeometry args={[30, 12]} /><meshStandardMaterial map={tile} roughness={0.3} /></mesh>
    {[-33, -28].map(z => <mesh key={z} position={[25.5, 25.6, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 29, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    {[11.2, 39.8].map(x => <mesh key={x} position={[x, 26.8, -30.5]}><boxGeometry args={[0.4, 2.4, 6]} /><Metal kind="aluminum" /></mesh>)}
    <mesh geometry={cloth} castShadow><Painted rough={0.95} metal={0} /></mesh>
  </group>
}
