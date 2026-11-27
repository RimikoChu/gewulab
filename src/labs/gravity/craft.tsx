// 航天器模型：通信卫星（箱体包金色隔热膜、两翼太阳能帆板、抛物面天线）、空间站（核心舱加两个实验舱、大展开帆板）。
// 尺寸按米建模，放进太空场景时整体缩放（示意：真实比例下卫星小得看不见）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, lathe, shell } from '@/lab-kit'

/** 太阳能电池片：深蓝的片子、银色的栅线和片间缝 */
function makeCells(cols: number, rows: number) {
  const W = 512, H = Math.round(512 * rows / cols), c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, cw = W / cols, ch = H / rows
  g.fillStyle = '#c9ccd2'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw + 1.5, y = j * ch + 1.5, grad = g.createLinearGradient(x, y, x + cw, y + ch)
    grad.addColorStop(0, '#1b2a5c'); grad.addColorStop(1, '#0e1838')
    g.fillStyle = grad; g.fillRect(x, y, cw - 3, ch - 3)
    g.fillStyle = 'rgba(180,190,215,0.25)'; for (let k = 1; k < 4; k++) g.fillRect(x + k * (cw - 3) / 4, y, 0.8, ch - 3)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 皱巴巴的金色多层隔热膜 */
function makeFoil() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 420; i++) { const x = rnd() * S, y = rnd() * S, w = 6 + rnd() * 40, h = 4 + rnd() * 24; g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.1 + rnd() * 0.2})`; g.save(); g.translate(x, y); g.rotate(rnd() * 3); g.fillRect(-w / 2, -h / 2, w, h); g.restore() }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function Wing({ side, panels = 3, pw = 2.2, ph = 1.7 }: { side: 1 | -1; panels?: number; pw?: number; ph?: number }) {
  const map = useMemo(() => makeCells(8, 6), [])
  return (
    <group>
      {/* 连接杆（轭架） */}
      <mesh position={[side * 0.55, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.9, 10]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      {Array.from({ length: panels }, (_, i) => (
        <group key={i} position={[side * (1.05 + pw / 2 + i * (pw + 0.06)), 0, 0]}>
          <mesh><boxGeometry args={[pw, 0.035, ph]} /><meshStandardMaterial attach="material-0" color="#9aa0a8" metalness={0.6} roughness={0.4} /><meshStandardMaterial attach="material-1" color="#9aa0a8" metalness={0.6} roughness={0.4} />
            <meshStandardMaterial attach="material-2" map={map} metalness={0.35} roughness={0.28} envMapIntensity={1.6} /><meshStandardMaterial attach="material-3" color="#d9d6cc" roughness={0.7} />
            <meshStandardMaterial attach="material-4" color="#9aa0a8" metalness={0.6} roughness={0.4} /><meshStandardMaterial attach="material-5" color="#9aa0a8" metalness={0.6} roughness={0.4} /></mesh>
          {/* 板框 */}
          <mesh position={[0, 0, ph / 2]}><boxGeometry args={[pw, 0.05, 0.04]} /><Metal kind="aluminum" /></mesh>
          <mesh position={[0, 0, -ph / 2]}><boxGeometry args={[pw, 0.05, 0.04]} /><Metal kind="aluminum" /></mesh>
        </group>
      ))}
    </group>
  )
}

/** 通信卫星：箱体约 1.8 × 2 × 2.4 m，帆板展开约 16 m。glow：发动机点火 */
export function Satellite({ glow = 0, wings = 3 }: { glow?: number; wings?: number }) {
  const foil = useMemo(makeFoil, [])
  const dish = useMemo(() => { const p: [number, number][] = []; for (let i = 0; i <= 14; i++) { const r = i / 14 * 0.9; p.push([r, r * r * 0.35]) } return shell(p, 0.025, { segs: 48 }) }, [])
  const nozzle = useMemo(() => lathe([[0.06, 0], [0.08, -0.05], [0.18, -0.38], [0.2, -0.4]], { segs: 32 }), [])
  return (
    <group>
      {/* 箱体：金色隔热膜，四角是铝框 */}
      <RoundedBox args={[1.8, 2.4, 2.0]} radius={0.05}><meshStandardMaterial color="#d9a441" metalness={1} roughness={0.32} roughnessMap={foil} bumpMap={foil} bumpScale={0.8} envMapIntensity={1.4} /></RoundedBox>
      {/* 对地面：白色的仪器板 */}
      <mesh position={[0, 0, 1.005]}><planeGeometry args={[1.6, 2.2]} /><meshStandardMaterial color="#e8e6df" roughness={0.6} /></mesh>
      {/* 两侧的散热面 */}
      {[1, -1].map(s => <mesh key={s} position={[s * 0.905, 0, 0]} rotation-y={s * Math.PI / 2}><planeGeometry args={[1.7, 2.1]} /><meshStandardMaterial color="#c8ccd2" metalness={0.7} roughness={0.18} envMapIntensity={1.4} /></mesh>)}
      {/* 抛物面天线和馈源 */}
      <group position={[0, 0.3, 1.25]} rotation-x={Math.PI / 2}>
        <mesh geometry={dish}><meshStandardMaterial color="#f1efe8" roughness={0.55} side={THREE.DoubleSide} /></mesh>
        {[0, 2.1, 4.2].map(a => <mesh key={a} position={[Math.cos(a) * 0.35, 0.4, Math.sin(a) * 0.35]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}><cylinderGeometry args={[0.012, 0.012, 0.9, 6]} /><Metal kind="aluminum" /></mesh>)}
        <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.06, 0.08, 0.18, 16]} /><Metal kind="aluminum" grain="turned" /></mesh>
      </group>
      {/* 顶上一小一大两副天线 */}
      <mesh position={[0.45, 1.35, 0.3]}><cylinderGeometry args={[0.2, 0.2, 0.25, 24]} /><meshStandardMaterial color="#eeeae0" roughness={0.6} /></mesh>
      <mesh position={[-0.5, 1.55, -0.3]}><cylinderGeometry args={[0.02, 0.02, 0.7, 8]} /><Metal kind="steel" /></mesh>
      {/* 背面的远地点发动机 */}
      <mesh geometry={nozzle} position={[0, -1.2, 0]}><Metal kind="steel" grain="turned" /></mesh>
      {glow > 0.01 && <mesh position={[0, -1.95 - glow * 0.4, 0]}><coneGeometry args={[0.22, 1.2 + glow * 1.4, 16, 1, true]} /><meshBasicMaterial color="#9fd2ff" transparent opacity={0.75 * glow} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>}
      {/* 两翼帆板 */}
      <Wing side={1} panels={wings} />
      <Wing side={-1} panels={wings} />
    </group>
  )
}

/** 一节舱段：白色隔热包覆的圆柱，两头带对接环 */
function Module({ r, len, rings = 3 }: { r: number; len: number; rings?: number }) {
  const geo = useMemo(() => lathe([[0, -len / 2], [r * 0.6, -len / 2], [r * 0.8, -len / 2 + 0.25], [r, -len / 2 + 0.6], [r, len / 2 - 0.6], [r * 0.8, len / 2 - 0.25], [r * 0.6, len / 2], [0, len / 2]], { segs: 48 }), [r, len])
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color="#e9e7e1" roughness={0.65} /></mesh>
      {Array.from({ length: rings }, (_, i) => <mesh key={i} position={[0, -len / 2 + 0.6 + (i + 1) * (len - 1.2) / (rings + 1), 0]}><cylinderGeometry args={[r * 1.01, r * 1.01, 0.12, 48]} /><meshStandardMaterial color="#bfc2c6" roughness={0.5} metalness={0.4} /></mesh>)}
    </group>
  )
}
/** 空间站（T 字形，约 50 m 宽）：核心舱沿 x，两个实验舱在节点舱两侧沿 z，各带一对长帆板 */
export function Station() {
  const cells = useMemo(() => makeCells(4, 18), [])
  const wing = (len: number) => (
    <mesh><boxGeometry args={[4.2, 0.05, len]} /><meshStandardMaterial attach="material-0" color="#888" /><meshStandardMaterial attach="material-1" color="#888" />
      <meshStandardMaterial attach="material-2" map={cells} metalness={0.4} roughness={0.25} envMapIntensity={1.6} emissive="#0a1230" /><meshStandardMaterial attach="material-3" color="#cfcab8" roughness={0.7} />
      <meshStandardMaterial attach="material-4" color="#888" /><meshStandardMaterial attach="material-5" color="#888" /></mesh>
  )
  return (
    <group>
      {/* 核心舱：大柱段 + 小柱段 + 节点舱 */}
      <group rotation-z={Math.PI / 2}><group position={[0, -4, 0]}><Module r={2.1} len={9} /></group><group position={[0, 2.8, 0]}><Module r={1.4} len={5} rings={2} /></group></group>
      <mesh position={[6.2, 0, 0]}><sphereGeometry args={[1.5, 32, 24]} /><meshStandardMaterial color="#e3e1da" roughness={0.6} /></mesh>
      {/* 两个实验舱，从节点舱往两边伸出 */}
      {[1, -1].map(s => (
        <group key={s} position={[6.2, 0, s * 9.75]} rotation-x={Math.PI / 2}>
          <Module r={2.1} len={16} rings={4} />
          {/* 实验舱尾部的大帆板：沿 x 两边展开 */}
          <group position={[0, -s * 6.5, 0]}>
            <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.15, 0.15, 3, 12]} /><Metal kind="aluminum" /></mesh>
            {[1, -1].map(k => <group key={k} position={[k * 15, 0, 0]} rotation-x={Math.PI / 2} rotation-y={Math.PI / 2}>{wing(27)}</group>)}
          </group>
        </group>
      ))}
      {/* 核心舱上的一对小帆板 */}
      {[1, -1].map(k => <group key={k} position={[-3, 0, k * 7]}>{wing(10)}<mesh position={[0, 0, -k * 4.6]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.08, 0.08, 2.4, 8]} /><Metal kind="aluminum" /></mesh></group>)}
      {/* 对接着的飞船 */}
      <group position={[8.6, 0, 0]} rotation-z={-Math.PI / 2}>
        <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[1.1, 1.4, 2.6, 32]} /><meshStandardMaterial color="#d6d3ca" roughness={0.6} /></mesh>
        <mesh position={[0, 3.6, 0]}><cylinderGeometry args={[1.4, 1.4, 2.4, 32]} /><meshStandardMaterial color="#7d8a6a" roughness={0.7} /></mesh>
        {[1, -1].map(k => <mesh key={k} position={[k * 4.4, 3.6, 0]}><boxGeometry args={[6, 0.05, 1.8]} /><meshStandardMaterial map={cells} metalness={0.4} roughness={0.3} /></mesh>)}
      </group>
    </group>
  )
}
