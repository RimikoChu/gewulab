// 地球仪大厅：主甲板上层建筑里的一间大舱室。木地板、带接缝的舱壁、圆舷窗、顶上的灯板、水密门、扶手，中间立着大地球仪。
// 舱壁只从里面画（外面看是上层建筑的外壳）。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { HALL } from './ship'

/** 地球仪在大厅里立脚的位置 */
export const GLOBE_AT = new THREE.Vector3(12, HALL.y0 + 0.02, -1.4)

function useCanvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number]) {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8
    return t
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
}

/** 一面带圆窗洞的舱壁：外框是长方形，洞是一排圆 */
function wallGeometry(len: number, h: number, holes: { x: number; y: number; r: number }[]) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, h); s.lineTo(0, h); s.closePath()
  for (const o of holes) { const p = new THREE.Path(); p.absarc(o.x, o.y, o.r, 0, Math.PI * 2, true); s.holes.push(p) }
  const g = new THREE.ShapeGeometry(s, 24)
  // 让贴图按米重复
  const uv = g.attributes.uv as THREE.BufferAttribute, pos = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 2.4, pos.getY(i) / 2.4)
  return g
}

export function Hall() {
  const W = HALL.x1 - HALL.x0, H = HALL.y1 - HALL.y0
  const floor = useCanvasTex(512, 512, g => {
    // 柚木地板：一条条窄板，板缝深色，颜色有深浅
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 8; i++) {
      const base = 120 + r() * 30
      g.fillStyle = `rgb(${base + 40},${base - 10},${base - 55})`; g.fillRect(0, i * 64, 512, 64)
      for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(70,40,15,${0.05 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; const y = i * 64 + r() * 64; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + r() * 6 - 3, 340, y + r() * 6 - 3, 512, y); g.stroke() }
      g.fillStyle = '#2a1a0e'; g.fillRect(0, i * 64, 512, 3)
      const cut = r() * 512; g.fillRect(cut, i * 64, 3, 64)
    }
  }, [W / 2.6, 13.2 / 1.6])
  const wall = useCanvasTex(512, 512, g => {
    // 舱壁板：浅灰白，竖向接缝，下面一道深色踢脚
    g.fillStyle = '#e6e4de'; g.fillRect(0, 0, 512, 512)
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 4, 512)
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(4, 0, 2, 512)
  }, [1, 1])
  const ceil = useCanvasTex(256, 256, g => { g.fillStyle = '#f1f0ec'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect((i * 37) % 256, (i * 91) % 256, 2, 2) } }, [W / 1.2, 13.2 / 1.2])

  const seaSky = useMemo(() => {
    // 舷窗外的天和海：上面是天，越近海平线越亮；下面是海，越近越深，海面上有几道亮的波光
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!
    const sky = g.createLinearGradient(0, 0, 0, 118); sky.addColorStop(0, '#7fa8d0'); sky.addColorStop(1, '#d4e3ef'); g.fillStyle = sky; g.fillRect(0, 0, 64, 118)
    const sea = g.createLinearGradient(0, 118, 0, 256); sea.addColorStop(0, '#4f7ea6'); sea.addColorStop(1, '#173a5c'); g.fillStyle = sea; g.fillRect(0, 118, 64, 138)
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(220,235,245,${0.25 - i * 0.012})`; g.fillRect((i * 23) % 60, 124 + i * 7, 10 + (i % 3) * 6, 1.5) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const geo = useMemo(() => {
    const xs: number[] = []
    for (let x = 2.5; x <= 21.5 + 1e-6; x += 2.4) xs.push(x)
    return {
      side: wallGeometry(W, H, xs.map(x => ({ x: x - HALL.x0, y: 8.4 - HALL.y0, r: 0.375 }))),
      sideB: wallGeometry(W, H, xs.map(x => ({ x: HALL.x1 - x, y: 8.4 - HALL.y0, r: 0.375 }))),
      end: wallGeometry(HALL.z * 2, H, []),
    }
  }, [W, H])
  const holesX = useMemo(() => { const a: number[] = []; for (let x = 2.5; x <= 21.5 + 1e-6; x += 2.4) a.push(x); return a }, [])

  return (
    <group>
      {/* 地板、天花板 */}
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.y0 + 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[W, HALL.z * 2]} /><meshPhysicalMaterial map={floor} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.y1, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[W, HALL.z * 2]} /><meshStandardMaterial map={ceil} roughness={0.9} /></mesh>
      {/* 两侧舱壁（带舷窗洞）和两头 */}
      <mesh geometry={geo.side} position={[HALL.x0, HALL.y0, -HALL.z]} receiveShadow><meshStandardMaterial map={wall} roughness={0.75} /></mesh>
      <mesh geometry={geo.sideB} position={[HALL.x1, HALL.y0, HALL.z]} rotation-y={Math.PI} receiveShadow><meshStandardMaterial map={wall} roughness={0.75} /></mesh>
      <mesh geometry={geo.end} position={[HALL.x0, HALL.y0, HALL.z]} rotation-y={Math.PI / 2} receiveShadow><meshStandardMaterial map={wall} roughness={0.75} /></mesh>
      <mesh geometry={geo.end} position={[HALL.x1, HALL.y0, -HALL.z]} rotation-y={-Math.PI / 2} receiveShadow><meshStandardMaterial map={wall} roughness={0.75} /></mesh>
      {/* 舷窗的黄铜窗圈：两圈，中间一圈螺栓 */}
      {holesX.flatMap(x => [-1, 1].map(s => <group key={`${x}${s}`} position={[x, 8.4, s * (HALL.z - 0.02)]} rotation-y={s > 0 ? Math.PI : 0}>
        <mesh><torusGeometry args={[0.41, 0.045, 12, 40]} /><Metal kind="brass" grain="turned" /></mesh>
        <mesh><ringGeometry args={[0.375, 0.47, 40]} /><Metal kind="brass" grain="turned" rough={0.35} /></mesh>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 4) * 0.44, Math.sin(i * Math.PI / 4) * 0.44, 0.03]}><sphereGeometry args={[0.014, 8, 6]} /><Metal kind="brass" /></mesh>)}
        <mesh><circleGeometry args={[0.38, 32]} /><meshPhysicalMaterial color="#cfe3ef" transparent opacity={0.08} roughness={0.02} depthWrite={false} /></mesh>
        {/* 窗外：天和海 */}
        <mesh position={[0, 0, -0.3]}><circleGeometry args={[0.44, 32]} /><meshBasicMaterial map={seaSky} toneMapped={false} /></mesh>
      </group>))}
      {/* 踢脚线、腰线扶手 */}
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.y0 + 0.08, s * (HALL.z - 0.03)]}><boxGeometry args={[W, 0.16, 0.04]} /><meshStandardMaterial color="#3b3f44" roughness={0.6} /></mesh>
        <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.y0 + 1.0, s * (HALL.z - 0.09)]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, W - 0.4, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[HALL.x0 + 1 + i * (W - 2) / 9, HALL.y0 + 1.0, s * (HALL.z - 0.05)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.08, 8]} /><Metal kind="stainless" /></mesh>)}
      </group>)}
      {/* 顶上的灯板：一排排发光的长方形，外面一圈铝框 */}
      {[-3.6, 0, 3.6].flatMap(z => [3.2, 7.6, 12, 16.4, 20.8].map(x => <group key={`${x}${z}`} position={[x, HALL.y1 - 0.012, z]}>
        <mesh rotation-x={Math.PI / 2}><planeGeometry args={[1.2, 0.6]} /><meshBasicMaterial color="#fff6e6" toneMapped={false} /></mesh>
        <mesh position={[0, 0.005, 0]}><boxGeometry args={[1.28, 0.02, 0.68]} /><Metal kind="aluminum" /></mesh>
      </group>))}
      {/* 屋顶下的一道道横梁 */}
      {[2.6, 7.6, 12.6, 17.6, 22.2].map(x => <mesh key={x} position={[x + 2.4, HALL.y1 - 0.14, 0]}><boxGeometry args={[0.22, 0.28, HALL.z * 2]} /><meshStandardMaterial color="#e4e3de" roughness={0.8} /></mesh>)}
      {/* 船尾那头的水密门：圆角门框、门把手 */}
      <group position={[HALL.x0 + 0.03, HALL.y0, 2.6]} rotation-y={Math.PI / 2}>
        <RoundedBox args={[1.0, 1.95, 0.08]} radius={0.18} position={[0, 1.05, 0]}><meshStandardMaterial color="#9aa4ab" roughness={0.45} metalness={0.4} /></RoundedBox>
        <RoundedBox args={[1.2, 2.15, 0.05]} radius={0.24} position={[0, 1.05, -0.02]}><meshStandardMaterial color="#6f7a82" roughness={0.5} metalness={0.4} /></RoundedBox>
        {[0.55, 1.55].map(y => <mesh key={y} position={[0.34, y, 0.07]} rotation-z={0.5}><boxGeometry args={[0.24, 0.05, 0.05]} /><Metal kind="steel" /></mesh>)}
      </group>
      {/* 灭火器 */}
      <group position={[HALL.x0 + 0.2, HALL.y0, 4.3]}>
        <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.62, 20]} /><meshPhysicalMaterial color="#c3271f" roughness={0.3} clearcoat={0.6} /></mesh>
        <mesh position={[0, 0.79, 0]}><cylinderGeometry args={[0.03, 0.04, 0.1, 12]} /><Metal kind="chrome" /></mesh>
      </group>
      {/* 靠舷窗的一张长工作台和两把椅子 */}
      <group position={[4.6, HALL.y0, -HALL.z + 0.5]}>
        <RoundedBox args={[4.2, 0.05, 0.8]} radius={0.015} position={[0, 0.76, 0]} castShadow receiveShadow><meshStandardMaterial color="#d7d3c8" roughness={0.5} /></RoundedBox>
        {[-1.9, 1.9].map(x => <mesh key={x} position={[x, 0.37, 0]}><boxGeometry args={[0.05, 0.74, 0.7]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        {[-0.9, 0.9].map(x => <group key={x} position={[x, 0.79, -0.15]}>
          <RoundedBox args={[0.62, 0.38, 0.03]} radius={0.01} position={[0, 0.3, 0]}><meshStandardMaterial color="#1a1c1f" roughness={0.4} /></RoundedBox>
          <mesh position={[0, 0.3, 0.017]}><planeGeometry args={[0.58, 0.34]} /><meshBasicMaterial color="#1e3c5a" toneMapped={false} /></mesh>
          <mesh position={[0, 0.06, 0]}><boxGeometry args={[0.05, 0.12, 0.05]} /><meshStandardMaterial color="#2a2c30" /></mesh>
        </group>)}
      </group>
      {/* 船头那头的一排书架 */}
      <group position={[HALL.x1 - 0.25, HALL.y0, -3.2]} rotation-y={-Math.PI / 2}>
        <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[3.2, 2.0, 0.4]} /><meshStandardMaterial color="#6b4a2e" roughness={0.6} /></mesh>
        {[0.45, 1.0, 1.55].map(y => <group key={y}>{Array.from({ length: 22 }, (_, i) => <mesh key={i} position={[-1.45 + i * 0.135, y + 0.13, 0.05]}><boxGeometry args={[0.1, 0.32 + ((i * 7) % 5) * 0.025, 0.26]} /><meshStandardMaterial color={['#7d2f2a', '#2f4f7a', '#3d6b4a', '#c9b98a', '#5a3f6b'][(i * 3 + y * 10) % 5 | 0]} roughness={0.8} /></mesh>)}</group>)}
      </group>
      {/* 灯：顶上三盏射灯照着地球仪，加两盏暖色的补光；都只照得到这间舱室附近 */}
      <spotLight position={[12, HALL.y1 - 0.2, 1.8]} target-position={[12, 7.4, -1.4]} angle={0.55} penumbra={0.7} intensity={70} distance={9} decay={2} color="#fff3e0" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <spotLight position={[9.2, HALL.y1 - 0.2, -3.4]} target-position={[12, 7.2, -1.4]} angle={0.6} penumbra={0.8} intensity={24} distance={9} decay={2} color="#ffe6c4" />
      <pointLight position={[7, 9.6, 2.5]} intensity={14} distance={11} decay={2} color="#fff1dc" />
      <pointLight position={[17, 9.6, 2.5]} intensity={14} distance={11} decay={2} color="#fff1dc" />
      <pointLight position={[12, 9.6, 5.2]} intensity={10} distance={9} decay={2} color="#ffffff" />
    </group>
  )
}
