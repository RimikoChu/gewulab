// 拓展课 · 六分仪：夜里在罗经甲板上，戴手套的手举起一台黄铜六分仪，朝北量北极星的高度角。
// 六分仪的指标臂转过的角度是高度角的一半（两面镜子把角度放大了一倍），弧上的刻度按两倍刻。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe } from '@/lab-kit'

const RAD = Math.PI / 180
/** 六分仪的半径（m）：从转轴到弧上刻度 */
const SR = 0.17

/** 弧上刻度：0–120°（按读数刻，实际每格占一半） */
function useArcScale() {
  return useMemo(() => {
    const N = 1024, c = document.createElement('canvas'); c.width = N; c.height = N
    const g = c.getContext('2d')!, C = N / 2, s = C / (SR + 0.02)
    g.fillStyle = 'rgba(232,228,214,1)'
    g.beginPath(); g.arc(C, C, (SR + 0.018) * s, Math.PI / 2 - 32 * RAD, Math.PI / 2 + 32 * RAD); g.arc(C, C, (SR - 0.008) * s, Math.PI / 2 + 32 * RAD, Math.PI / 2 - 32 * RAD, true); g.closePath(); g.fill()
    g.strokeStyle = '#1b1a16'; g.fillStyle = '#1b1a16'
    for (let r = -5; r <= 125; r += 1) {
      const a = Math.PI / 2 - (r / 2 - 30) * RAD, long = r % 10 === 0, mid = r % 5 === 0
      const r0 = (SR + 0.016) * s, r1 = r0 - (long ? 22 : mid ? 15 : 9)
      g.lineWidth = long ? 2.4 : 1.4; g.beginPath(); g.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); g.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); g.stroke()
      if (long && r >= 0) { g.save(); g.translate(C + Math.cos(a) * (r1 - 16), C + Math.sin(a) * (r1 - 16)); g.rotate(a - Math.PI / 2); g.font = '600 15px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(r), 0, 0); g.restore() }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
}

/** 带袖子的手套：手掌、四根弯起来的手指、拇指、袖口和一截袖子 */
export function Glove() {
  const knit = <meshStandardMaterial color="#c9b38a" roughness={0.95} />
  return <group>
    <RoundedBox args={[0.085, 0.075, 0.06]} radius={0.024} smoothness={3} position={[0, 0.045, 0]} castShadow>{knit}</RoundedBox>
    {[-0.029, -0.01, 0.01, 0.029].map((x, i) => <mesh key={x} position={[x, 0.0, 0.026]} rotation-x={-0.4} castShadow><capsuleGeometry args={[0.0105, 0.042 - Math.abs(i - 1.5) * 0.004, 6, 10]} />{knit}</mesh>)}
    <mesh position={[0.045, 0.03, 0.03]} rotation={[0.4, 0, 0.9]} castShadow><capsuleGeometry args={[0.011, 0.034, 6, 10]} />{knit}</mesh>
    <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.046, 0.044, 0.04, 24]} /><meshStandardMaterial color="#c9b38a" roughness={0.95} /></mesh>
    <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.058, 0.05, 0.17, 24]} /><meshStandardMaterial color="#24364d" roughness={0.9} /></mesh>
    <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.062, 0.058, 0.1, 24]} /><meshStandardMaterial color="#24364d" roughness={0.9} transparent opacity={0.5} depthWrite={false} /></mesh>
  </group>
}

/** 六分仪：放在 y-z 平面里，刻度面朝西，望远镜朝 −z（正北）。alt 是量出来的高度角（°），指标臂转过它的一半 */
export function Sextant({ alt }: { alt: number }) {
  const scale = useArcScale()
  const geo = useMemo(() => {
    // 扇形的框：两根辐条加一段弧，铸铜做的
    const sh = new THREE.Shape(), a0 = -32 * RAD, a1 = 32 * RAD
    sh.moveTo(0, 0); sh.lineTo(Math.sin(a0) * (SR + 0.02), -Math.cos(a0) * (SR + 0.02))
    sh.absarc(0, 0, SR + 0.02, -Math.PI / 2 + a0, -Math.PI / 2 + a1, false); sh.lineTo(0, 0)
    const hole = new THREE.Path(); hole.moveTo(0, -0.04); hole.lineTo(Math.sin(a0 + 0.12) * (SR - 0.012), -Math.cos(a0 + 0.12) * (SR - 0.012)); hole.absarc(0, 0, SR - 0.012, -Math.PI / 2 + a0 + 0.12, -Math.PI / 2 + a1 - 0.12, false); hole.lineTo(0, -0.04); sh.holes.push(hole)
    const frame = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 48 }); frame.translate(0, 0, -0.003)
    const scope = lathe([[0.001, 0], [0.011, 0], [0.011, 0.012], [0.009, 0.014], [0.009, 0.1], [0.012, 0.104], [0.012, 0.115], [0.001, 0.115]], { segs: 24 })
    return { frame, scope }
  }, [])
  const arm = alt / 2
  return <group>
    {/* 框架：竖着，弧在下面，刻度面朝西（−x），望远镜朝北 */}
    <group rotation-y={-Math.PI / 2}>
      <mesh geometry={geo.frame} castShadow><Metal kind="brass" grain="cast" rough={0.3} /></mesh>
      <mesh position={[0, 0, 0.0055]} raycast={() => null}><planeGeometry args={[(SR + 0.02) * 2, (SR + 0.02) * 2]} /><meshBasicMaterial map={scale} transparent alphaTest={0.1} /></mesh>
      {/* 指标臂：从转轴伸到弧上，带一个读数的小窗 */}
      <group rotation-z={arm * RAD}>
        <mesh position={[0, -SR / 2, 0.009]} castShadow><boxGeometry args={[0.014, SR + 0.03, 0.004]} /><Metal kind="brass" grain="brushed" /></mesh>
        <mesh position={[0, -SR - 0.006, 0.012]}><boxGeometry args={[0.034, 0.024, 0.006]} /><Metal kind="brass" grain="brushed" /></mesh>
        {/* 游标：指标臂下端贴着刻度弧的小窗，加一只读分的微动鼓轮 */}
        <mesh position={[0, -SR + 0.004, 0.0155]}><planeGeometry args={[0.02, 0.012]} /><meshPhysicalMaterial color="#e8f0f2" transparent opacity={0.35} roughness={0.05} /></mesh>
        <mesh position={[0.024, -SR - 0.012, 0.018]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.014, 0.014, 0.014, 24]} /><Metal kind="brass" grain="turned" /></mesh>
        <mesh position={[0.024, -SR - 0.012, 0.027]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.006, 0.006, 0.006, 12]} /><Metal kind="steel" /></mesh>
        {/* 转轴上的指标镜 */}
        <mesh position={[0, 0.012, 0.012]} rotation-z={0.5}><boxGeometry args={[0.03, 0.04, 0.004]} /><meshPhysicalMaterial color="#c9d6dd" metalness={1} roughness={0.04} /></mesh>
      </group>
      <mesh position={[0, 0, 0.012]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.009, 0.009, 0.01, 20]} /><Metal kind="brass" grain="turned" /></mesh>
      {/* 滤光片：三片有色玻璃，挂在指标镜和地平镜之间 */}
      {['#b33a2e', '#2f7a4a', '#4a4a52'].map((c, i) => <mesh key={c} position={[-0.03 + i * 0.006, -0.012 - i * 0.004, 0.016 + i * 0.003]} rotation-z={0.5}><boxGeometry args={[0.022, 0.018, 0.002]} /><meshPhysicalMaterial color={c} transparent opacity={0.55} roughness={0.1} /></mesh>)}
      {/* 地平镜的黄铜镜框 */}
      <mesh position={[-0.055, -0.03, 0.009]} rotation-z={0.25}><boxGeometry args={[0.032, 0.036, 0.004]} /><Metal kind="brass" /></mesh>
      {/* 地平镜：半边镀银、半边透明 */}
      <mesh position={[-0.055, -0.03, 0.012]} rotation-z={0.25}><boxGeometry args={[0.026, 0.03, 0.003]} /><meshPhysicalMaterial color="#d7e3e8" metalness={0.6} roughness={0.05} transparent opacity={0.7} /></mesh>
      {/* 望远镜：对着地平镜，朝北 */}
      <group position={[0.07, -0.03, 0.024]} rotation-z={Math.PI / 2}>
        <mesh geometry={geo.scope} castShadow><Metal kind="brass" grain="turned" /></mesh>
      </group>
      {/* 背面的木把手 */}
      <mesh position={[0, -0.09, -0.03]} castShadow><capsuleGeometry args={[0.013, 0.07, 6, 12]} /><meshStandardMaterial color="#5a3620" roughness={0.5} /></mesh>
    </group>
    {/* 握着把手的手套：从右下方伸过来 */}
    <group position={[0.0, -0.12, 0.0]} rotation={[0, 0, Math.PI - 0.6]}><Glove /></group>
  </group>
}
