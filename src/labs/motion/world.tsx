// 机械运动实验室的大场景：一座高铁站。站台、两条股道、雨棚和站房；站外有一段标着里程的正线；站台尽头是一段检修坡道。
// 整个实验室只有这一个世界，换课时画布不重建，镜头在车站里飞。站外正线按 1∶10 缩小来画，界面上的数都是真实的。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, mergeParts, useConcrete, type Part } from '@/lab-kit'

export const PLAT = 1.1                       // 站台面的高度
export const TRACK = { near: 0, far: -4.2 }   // 站台边两条股道的 z
export const LINE = { z: 36, x0: -52, scale: 0.1 }   // 站外正线：z、起点的 x、画面单位 ÷ 真实的米
export const DESK: [number, number, number] = [-14, PLAT, 5.2]   // 工作台
export const RAMP: [number, number, number] = [32, PLAT, 5.0]    // 检修坡道
type V3 = [number, number, number]
/** 正线上离起点 m 米的地方在画面里的 x */
export const lineX = (m: number) => LINE.x0 + m * LINE.scale

export const SPOT = {
  desk: { target: new THREE.Vector3(DESK[0], PLAT + 1.05, DESK[2]), span: [1.9, 1.1] as [number, number], view: [-0.3, 0.62] as [number, number] },
  // 站台这一处从股道那一侧看过去：列车在前，站台和雨棚在后
  platform: { target: new THREE.Vector3(-4, 2.4, -1), span: [46, 15] as [number, number], view: [Math.PI + 0.42, 0.3] as [number, number] },
  line: { target: new THREE.Vector3(-2, 2.5, LINE.z), span: [116, 26] as [number, number], view: [0, 0.34] as [number, number] },
  ramp: { target: new THREE.Vector3(RAMP[0], PLAT + 1.2, RAMP[2]), span: [6.6, 3.6] as [number, number], view: [0, 0.2] as [number, number] },
}

/** 一列车：圆角的车身、流线的车头、车窗带、车门、裙板和转向架。len 是车长，x 是车头所在的位置，朝 +x 开 */
export function Train({ x, z, len = 26, color = '#f4f6f7', stripe = '#2f7fb8', y = 0.35, s = 1 }: { x: number; z: number; len?: number; color?: string; stripe?: string; y?: number; s?: number }) {
  const paint = <meshPhysicalMaterial color={color} roughness={0.28} metalness={0.15} clearcoat={0.7} clearcoatRoughness={0.2} />
  const doors = useMemo(() => { const a: number[] = []; for (let d = 4.5; d < len - 3; d += 8.5) a.push(-d); return a }, [len])
  const bogies = useMemo(() => { const a: number[] = []; for (let d = 3.2; d < len - 1; d += Math.max(6, (len - 6.4) / Math.max(1, Math.round((len - 6.4) / 9)))) a.push(-d); return a }, [len])
  return (
    <group position={[x, y, z]} scale={s}>
      <RoundedBox args={[len, 2.5, 2.7]} radius={0.5} smoothness={5} position={[-len / 2, 1.5, 0]} castShadow>{paint}</RoundedBox>
      {/* 车头：一只拉长的椭球，前半截探出车身；上面一块深色的风挡 */}
      <mesh position={[-0.6, 1.36, 0]} scale={[3.3, 1.12, 1.3]} castShadow><sphereGeometry args={[1, 32, 20]} />{paint}</mesh>
      <mesh position={[0.55, 1.78, 0]} scale={[1.5, 0.52, 0.92]} rotation-z={-0.2}><sphereGeometry args={[1, 24, 14]} /><meshPhysicalMaterial color="#10171c" roughness={0.08} metalness={0.5} clearcoat={1} /></mesh>
      {/* 车窗带、腰线、裙板 */}
      <mesh position={[-len / 2 - 0.9, 1.85, 0]}><boxGeometry args={[len - 3.4, 0.62, 2.73]} /><meshPhysicalMaterial color="#141d24" roughness={0.1} metalness={0.5} clearcoat={1} /></mesh>
      <mesh position={[-len / 2 - 0.2, 0.86, 0]}><boxGeometry args={[len - 0.8, 0.2, 2.73]} /><meshStandardMaterial color={stripe} roughness={0.45} /></mesh>
      <mesh position={[-len / 2 - 0.2, 0.3, 0]}><boxGeometry args={[len - 1.2, 0.34, 2.6]} /><meshStandardMaterial color="#3a4046" roughness={0.6} metalness={0.3} /></mesh>
      {doors.map(d => <mesh key={d} position={[d, 1.42, 0]}><boxGeometry args={[0.9, 1.9, 2.735]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>)}
      {doors.map(d => <mesh key={`w${d}`} position={[d, 1.85, 0]}><boxGeometry args={[0.5, 0.6, 2.74]} /><meshPhysicalMaterial color="#141d24" roughness={0.1} metalness={0.5} /></mesh>)}
      {doors.flatMap(d => [-0.47, 0.47].map(k => <mesh key={`l${d}${k}`} position={[d + k, 1.42, 0]}><boxGeometry args={[0.03, 1.9, 2.742]} /><meshStandardMaterial color="#8d969c" /></mesh>))}
      {/* 转向架：每组两对车轮 */}
      {bogies.map(b => <group key={b} position={[b, 0, 0]}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[2.6, 0.3, 2.1]} /><meshStandardMaterial color="#22272b" roughness={0.7} /></mesh>
        {[-0.75, 0.75].flatMap(dx => [-0.72, 0.72].map(dz => <mesh key={`${dx}${dz}`} position={[dx, -0.02, dz]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.36, 0.36, 0.14, 18]} /><meshStandardMaterial color="#4a5157" metalness={0.8} roughness={0.35} /></mesh>))}
      </group>)}
      {/* 受电弓 */}
      <group position={[-len * 0.3, 2.78, 0]}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[1.6, 0.08, 1.2]} /><meshStandardMaterial color="#3a4046" /></mesh>
        <mesh position={[-0.3, 0.42, 0]} rotation-z={0.7}><boxGeometry args={[1.1, 0.05, 0.05]} /><meshStandardMaterial color="#2a2f33" metalness={0.6} /></mesh>
        <mesh position={[0.1, 0.78, 0]}><boxGeometry args={[0.08, 0.05, 1.5]} /><meshStandardMaterial color="#2a2f33" metalness={0.6} /></mesh>
      </group>
    </group>
  )
}

/** 草地：绿底上撒深浅不一的斑块和草茬，四边能拼接 */
function makeGrass() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; let seed = 7
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  g.fillStyle = '#7f9163'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 260; i++) {
    const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 46, k = rnd()
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); q.addColorStop(0, k < 0.5 ? 'rgba(96,120,72,0.5)' : 'rgba(150,160,104,0.42)'); q.addColorStop(1, 'rgba(120,140,90,0)'); g.fillStyle = q; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2) }
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '60,84,44' : '170,184,120'},${0.12 + rnd() * 0.2})`; g.fillRect(rnd() * S, rnd() * S, 1, 1 + rnd() * 3) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 道砟：灰褐色的碎石 */
function makeBallast() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; let seed = 3
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  g.fillStyle = '#7c766d'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2600; i++) { const v = 70 + Math.floor(rnd() * 90); g.fillStyle = `rgb(${v + 8},${v + 4},${v - 4})`; const x = rnd() * S, y = rnd() * S, w = 2 + rnd() * 5; g.beginPath(); g.ellipse(x, y, w, w * (0.5 + rnd() * 0.5), rnd() * 3, 0, 7); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 站台的地面：一块块的铺砖 */
function makePaving() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; let seed = 5
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 176 + Math.floor(rnd() * 22); g.fillStyle = `rgb(${v},${v + 2},${v})`; g.fillRect(x * 64, y * 64, 64, 64) }
  g.strokeStyle = 'rgba(90,96,98,0.55)'; g.lineWidth = 2
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, S); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(S, i * 64); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 一片树和远山：每棵树是一截树干加两层树冠，远山是压扁的多面锥。合成一个带顶点颜色的模型 */
function makeScenery() {
  const gs: THREE.BufferGeometry[] = [], col = new THREE.Color(); let seed = 11
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  const paint = (g: THREE.BufferGeometry, c: string) => { col.set(c); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  const tree = (x: number, z: number, h: number) => {
    const t = new THREE.CylinderGeometry(h * 0.04, h * 0.06, h * 0.35, 6); t.translate(x, h * 0.175, z); paint(t, '#6a5642')
    const g = ['#3f6f3c', '#4c8046', '#5a8c4e'][Math.floor(rnd() * 3)]
    const a = new THREE.ConeGeometry(h * 0.3, h * 0.55, 7); a.translate(x, h * 0.55, z); paint(a, g)
    const b = new THREE.ConeGeometry(h * 0.22, h * 0.45, 7); b.translate(x, h * 0.82, z); paint(b, g)
  }
  // 站房后面一排行道树；两条线路之间和正线外侧各有一片防护林
  for (let x = -66; x <= 66; x += 5.5) tree(x + rnd() * 2, 21 + rnd() * 2.5, 5 + rnd() * 2.5)
  for (let i = 0; i < 60; i++) tree(-90 + rnd() * 190, 47 + rnd() * 10, 1.2 + rnd() * 1.4)       // 正线靠镜头这一侧只种矮灌木，不挡线路
  for (let i = 0; i < 120; i++) tree(-150 + rnd() * 300, -62 - rnd() * 50, 5 + rnd() * 5)        // 股道另一侧的树退到远处，站台那一课镜头从这边看过来
  // 远山
  for (let i = 0; i < 16; i++) { const r = 40 + rnd() * 50, h = 16 + rnd() * 26, m = new THREE.ConeGeometry(r, h, 7); m.rotateY(rnd() * 3); m.translate(-260 + i * 36 + rnd() * 20, h / 2 - 1, -150 - rnd() * 70); paint(m, ['#6f8a78', '#7a947f', '#86a089'][i % 3]) }
  const out = mergeGeometries(gs); out.computeVertexNormals()
  return out
}

export function World() {
  const [d, n, r] = useConcrete(24, 4)
  const grass = useMemo(() => { const t = makeGrass(); t.repeat.set(70, 50); return t }, [])
  const ballast = useMemo(() => { const t = makeBallast(); t.repeat.set(90, 2.4); return t }, [])
  const paving = useMemo(() => { const t = makePaving(); t.repeat.set(42, 3.2); return t }, [])
  const scenery = useMemo(makeScenery, [])
  const geo = useMemo(() => {
    const parts: Part[] = []
    const track = (z: number, x0: number, x1: number, k = 1) => {
      for (const dz of [-0.72, 0.72]) { parts.push({ p: [(x0 + x1) / 2, 0.19 * k, z + dz * k], s: [x1 - x0, 0.13 * k, 0.07 * k], c: '#9aa0a5' }); parts.push({ p: [(x0 + x1) / 2, 0.125 * k, z + dz * k], s: [x1 - x0, 0.02 * k, 0.15 * k], c: '#6f7479' }) }
      for (let x = x0; x <= x1; x += 0.65 * k) parts.push({ p: [x, 0.07 * k, z], s: [0.26 * k, 0.1 * k, 2.5 * k], c: '#b9b6ad' })   // 混凝土轨枕
      parts.push({ p: [(x0 + x1) / 2, 0.01, z], s: [x1 - x0, 0.04, 3.6 * k], c: '#7d776f' })
      // 接触网：每隔一段一根立柱，伸出腕臂，挂着两根线
      for (let x = x0 + 6; x <= x1; x += 50 * k) {
        parts.push({ p: [x, 3.6 * k, z - 2.9 * k], s: [0.22 * k, 7.2 * k, 0.22 * k], c: '#8c9499' }); parts.push({ p: [x, 6.2 * k, z - 1.5 * k], s: [0.07 * k, 0.07 * k, 3 * k], c: '#8c9499' })
        parts.push({ p: [x, 5.6 * k, z - 1.6 * k], s: [0.06 * k, 0.06 * k, 2.9 * k], c: '#8c9499', r: [0.42, 0, 0] }); parts.push({ p: [x, 0.25 * k, z - 2.9 * k], s: [0.5 * k, 0.5 * k, 0.5 * k], c: '#a9a59c' })
      }
      parts.push({ p: [(x0 + x1) / 2, 6.2 * k, z], s: [x1 - x0, 0.03 * k, 0.03 * k], c: '#3a3f44' }); parts.push({ p: [(x0 + x1) / 2, 5.25 * k, z], s: [x1 - x0, 0.03 * k, 0.03 * k], c: '#3a3f44' })
    }
    track(TRACK.near, -70, 70); track(TRACK.far, -70, 70); track(LINE.z, LINE.x0 - 8, LINE.x0 + 112, 0.8)
    // 站台：台体、帽石、盲道和安全线；雨棚的立柱、横梁和顶；站台上的长椅和站牌
    parts.push({ p: [0, PLAT / 2 - 0.04, 5.6], s: [84, PLAT - 0.08, 7], c: '#a9aca8' }); parts.push({ p: [0, PLAT - 0.04, 5.55], s: [84.2, 0.08, 7.2], c: '#cfd2ce' })
    parts.push({ p: [0, PLAT + 0.012, 2.75], s: [84, 0.02, 0.4], c: '#e3bf32' }); parts.push({ p: [0, PLAT + 0.012, 2.32], s: [84, 0.02, 0.1], c: '#f4f4f0' })
    for (let x = -36; x <= 36; x += 9) {
      parts.push({ p: [x, PLAT + 2.4, 6.6], s: [0.32, 4.8, 0.32], c: '#dfe3e6' }); parts.push({ p: [x, PLAT + 0.12, 6.6], s: [0.56, 0.24, 0.56], c: '#9aa1a6' })
      parts.push({ p: [x, PLAT + 4.72, 4.9], s: [0.22, 0.3, 4.4], c: '#dfe3e6' }); parts.push({ p: [x, PLAT + 4.2, 5.6], s: [0.12, 0.12, 2.6], c: '#dfe3e6', r: [0.5, 0, 0] })
    }
    parts.push({ p: [0, PLAT + 4.95, 4.6], s: [82, 0.14, 6.8], c: '#f3f5f6' }); parts.push({ p: [0, PLAT + 4.86, 1.25], s: [82, 0.32, 0.1], c: '#2f7fb8' })
    for (let x = -31.5; x <= 24; x += 9) { parts.push({ p: [x, PLAT + 0.42, 7.6], s: [2.2, 0.08, 0.5], c: '#8a6a48' }); parts.push({ p: [x, PLAT + 0.72, 7.84], s: [2.2, 0.4, 0.06], c: '#8a6a48' }); for (const k of [-0.9, 0.9]) parts.push({ p: [x + k, PLAT + 0.2, 7.6], s: [0.08, 0.4, 0.44], c: '#4a5157' }) }
    for (const x of [-22.5, 4.5, 22.5]) { parts.push({ p: [x, PLAT + 1.1, 4.3], s: [0.1, 2.2, 0.1], c: '#4a5157' }); parts.push({ p: [x, PLAT + 2.35, 4.3], s: [2.4, 0.7, 0.1], c: '#2f7fb8' }); parts.push({ p: [x, PLAT + 2.35, 4.24], s: [2.1, 0.3, 0.02], c: '#f4f4f0' }) }
    // 站房：墙身、一排落地窗和窗棂、挑檐、入口
    parts.push({ p: [0, PLAT + 3, 13], s: [50, 6, 8], c: '#d6d3ca' }); parts.push({ p: [0, PLAT + 6.2, 12.4], s: [53, 0.4, 10], c: '#eceeed' }); parts.push({ p: [0, PLAT + 0.3, 8.95], s: [50, 0.6, 0.14], c: '#9a978e' })
    parts.push({ p: [0, PLAT + 3.4, 8.96], s: [46, 3.8, 0.1], c: '#6f9fba' })
    for (let x = -23; x <= 23; x += 2.3) parts.push({ p: [x, PLAT + 3.4, 8.9], s: [0.12, 3.8, 0.14], c: '#e6e8e6' })
    parts.push({ p: [0, PLAT + 3.4, 8.9], s: [46, 0.1, 0.14], c: '#e6e8e6' }); parts.push({ p: [0, PLAT + 1.5, 8.86], s: [5, 3, 0.16], c: '#7fa6bb' }); parts.push({ p: [0, PLAT + 3.2, 8.5], s: [6.4, 0.2, 1.2], c: '#eceeed' })
    // 线路两边的栅栏
    for (const z of [TRACK.far - 5.2, LINE.z - 3.4, LINE.z + 4.6]) { for (let x = -70; x <= 70; x += 3.5) parts.push({ p: [x, 0.7, z], s: [0.1, 1.4, 0.1], c: '#c9cdc8' }); for (const y of [0.5, 1.15]) parts.push({ p: [0, y, z], s: [140, 0.06, 0.05], c: '#c9cdc8' }) }
    // 正线边的里程桩：每 100 m 一根，500 m 和 1000 m 的高一些
    for (let m = 0; m <= 1000; m += 100) { parts.push({ p: [lineX(m), m % 500 ? 0.7 : 1.1, LINE.z + 2.6], s: [0.16, m % 500 ? 1.4 : 2.2, 0.16], c: m % 500 ? '#f1f1ee' : '#e9c63f' }); parts.push({ p: [lineX(m), 0.06, LINE.z + 2.6], s: [0.5, 0.12, 0.5], c: '#a9a59c' }) }
    // 工作台：木台面、挡板和四条钢腿，底下一道横撑
    parts.push({ p: [DESK[0], PLAT + 0.86, DESK[2]], s: [2.2, 0.06, 1.2], c: '#3a4348' }); parts.push({ p: [DESK[0], PLAT + 0.8, DESK[2]], s: [2.1, 0.08, 1.1], c: '#2b3236' })
    for (const dx of [-1, 1]) { for (const dz of [-0.5, 0.5]) { parts.push({ p: [DESK[0] + dx, PLAT + 0.43, DESK[2] + dz], s: [0.07, 0.86, 0.07], c: '#6d767b' }); parts.push({ p: [DESK[0] + dx, PLAT + 0.015, DESK[2] + dz], s: [0.12, 0.03, 0.12], c: '#22272b' }) } parts.push({ p: [DESK[0] + dx, PLAT + 0.2, DESK[2]], s: [0.05, 0.05, 1], c: '#6d767b' }) }
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[700, 500]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
      {/* 几块颜色不同的田 */}
      {([[-60, -38, 90, 34, '#98a36a'], [50, -40, 110, 36, '#829a62'], [-30, 95, 120, 50, '#9da56e'], [100, 100, 100, 60, '#869e66']] as const).map(([x, z, w, h, c]) => <mesh key={`${x}${z}`} rotation-x={-Math.PI / 2} position={[x, -0.01, z]} receiveShadow><planeGeometry args={[w, h]} /><meshStandardMaterial color={c} map={grass} roughness={1} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -2]} receiveShadow><planeGeometry args={[150, 12]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#a9a59c" /></mesh>
      {[TRACK.near, TRACK.far].map(z => <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.032, z]} receiveShadow><planeGeometry args={[140, 3.6]} /><meshStandardMaterial map={ballast} roughness={1} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[LINE.x0 + 52, 0.032, LINE.z]} receiveShadow><planeGeometry args={[120, 2.9]} /><meshStandardMaterial map={ballast} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, PLAT + 0.004, 5.9]} receiveShadow><planeGeometry args={[84, 6.4]} /><meshStandardMaterial map={paving} roughness={0.85} /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.15} /></mesh>
      <mesh geometry={scenery} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={1} flatShading /></mesh>
    </group>
  )
}
export type { V3 }
