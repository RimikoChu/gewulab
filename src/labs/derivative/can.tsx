// 第 7 课的器材：一只易拉罐（铝罐底的拱、罐身印着图案、缩颈、罐口卷边和拉环）、不锈钢柜台、柜台上一台小显示器。
// 罐子先按半径 1、高 1 做好，再按真实的 r、h（m）缩放：换半径时罐子连续变形，容积不变。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe } from '@/lab-kit'
import { canvas, FONT, NUM, once, tex } from './mats'

/** 罐身的印刷图案：青绿底、两道白色波纹、写着容量 */
function makeCanArt() {
  return once('canart', () => {
    const W = 1024, H = 512, { c, g } = canvas(W, H)
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e8a7d'); gr.addColorStop(1, '#0a5f57'); g.fillStyle = gr; g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 16
    for (const y0 of [150, 360]) { g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = y0 + Math.sin(x / W * Math.PI * 4) * 26; if (x) g.lineTo(x, y); else g.moveTo(x, y) } g.stroke() }
    g.fillStyle = '#ffffff'; g.font = `800 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    for (const x of [W * 0.25, W * 0.75]) { g.fillText('苏打水', x, 255); g.font = `700 46px ${NUM}`; g.fillText('330 mL', x, 440); g.font = `800 92px ${FONT}` }
    return tex(c, true)
  })
}

let CAN: ReturnType<typeof buildCan> | null = null
function buildCan() {
  // 截面（半径 1、高 1）：罐底的拱和底圈、直的罐身、缩颈、卷边、罐盖往下凹
  const shell = lathe([[0, 0.035], [0.72, 0.0], [0.86, 0.004], [0.95, 0.03], [1, 0.075], [1, 0.9], [0.93, 0.955], [0.83, 0.985], [0.84, 1.0], [0.8, 1.004], [0.78, 0.985], [0, 0.975]], { segs: 64, crease: 30 })
  const body = new THREE.CylinderGeometry(1.004, 1.004, 0.78, 64, 1, true); body.translate(0, 0.08 + 0.39, 0)
  return { shell, body }
}

/** r、h：罐子的半径和高（m）；放在原点，罐底在 y = 0 */
export function Can({ r, h, ...rest }: { r: number; h: number } & Record<string, unknown>) {
  const g = (CAN ??= buildCan()), art = makeCanArt()
  return (
    <group {...rest}>
      <group scale={[r, h, r]}>
        <mesh geometry={g.shell} castShadow receiveShadow><Metal kind="aluminum" grain="turned" rough={0.25} /></mesh>
        <mesh geometry={g.body} castShadow><meshPhysicalMaterial map={art} roughness={0.25} metalness={0.35} clearcoat={1} clearcoatRoughness={0.08} /></mesh>
      </group>
      {/* 拉环：不随罐子变形，按真实大小 */}
      <group position={[r * 0.18, h * 0.99 + 0.002, 0]}>
        <mesh rotation-x={-Math.PI / 2}><ringGeometry args={[0.006, 0.0105, 24]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[-0.014, 0, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.006, 20]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      </group>
    </group>
  )
}

/** 不锈钢柜台：台面、挡边、四条腿和横撑。台面上沿在 y = 0.9 */
export function Counter(props: Record<string, unknown>) {
  return (
    <group {...props}>
      <RoundedBox args={[1.7, 0.04, 0.72]} radius={0.012} position={[0, 0.88, 0]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.3} /></RoundedBox>
      <mesh position={[0, 0.93, 0.34]} castShadow><boxGeometry args={[1.7, 0.06, 0.025]} /><Metal kind="stainless" grain="brushed" /></mesh>
      {[[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.43, z]} castShadow><boxGeometry args={[0.04, 0.86, 0.04]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
      <mesh position={[0, 0.16, 0]}><boxGeometry args={[1.62, 0.02, 0.66]} /><Metal kind="stainless" grain="brushed" rough={0.4} /></mesh>
    </group>
  )
}

/** 柜台上的小显示器：黑色边框、支架、底座。children 放在屏面坐标里（左下角为原点），屏面朝 +z */
export function Monitor({ w, h, children, ...rest }: { w: number; h: number; children?: ReactNode } & Record<string, unknown>) {
  return (
    <group {...rest}>
      <RoundedBox args={[0.13, 0.012, 0.1]} radius={0.004} position={[0, 0.006, -0.02]} castShadow><meshStandardMaterial color="#1b1d20" roughness={0.4} metalness={0.4} /></RoundedBox>
      <mesh position={[0, 0.07, -0.04]} castShadow><boxGeometry args={[0.03, 0.14, 0.012]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <group position={[0, 0.12 + h / 2, 0]}>
        <RoundedBox args={[w + 0.024, h + 0.024, 0.018]} radius={0.006} position={[0, 0, -0.01]} castShadow><meshStandardMaterial color="#111316" roughness={0.35} metalness={0.3} /></RoundedBox>
        <group position={[-w / 2, -h / 2, 0.0005]}>{children}</group>
      </group>
    </group>
  )
}
