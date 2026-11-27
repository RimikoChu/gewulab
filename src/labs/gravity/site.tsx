// 海边的航天发射场：发射工位（导流槽、移动发射平台）、脐带塔（桁架、各层平台、摆杆、塔吊）、避雷塔、火箭、远处的总装厂房和指挥楼、海面和椰子树。
// 1 单位 = 1 m。火箭的外形参照大型液体运载火箭：5 m 芯级、四个 3.35 m 助推器、整流罩，尺寸是示意，不是某一型号的图纸。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, Painted, lathe, makeGround, mergeParts, useConcrete, useRipple, type Part } from '@/lab-kit'

// ---------- 火箭 ----------
/** 芯级、整流罩的车削截面：底部在 y = 0 */
const CORE_R = 2.5, BOOST_R = 1.675
function makeRocketTex() {
  // 白漆筒身：竖向的焊缝、几道深色的级间段、一面国旗和一行字的位置（只画色块，不写字）
  const W = 512, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(i * W / 8, 0, 2, H) }
  for (let y = 120; y < H; y += 190) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, y, W, 3) }
  g.fillStyle = '#d42b1e'; g.fillRect(W * 0.18, H * 0.3, 54, 36)
  g.fillStyle = '#ffde00'; g.beginPath(); g.arc(W * 0.18 + 10, H * 0.3 + 9, 5, 0, 7); g.fill()
  g.fillStyle = '#2a3a6e'; for (let i = 0; i < 4; i++) g.fillRect(W * 0.19, H * 0.36 + i * 46, 30, 34)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
function Engine({ r = 0.75, len = 1.9 }: { r?: number; len?: number }) {
  const bell = useMemo(() => lathe([[r * 0.32, 0], [r * 0.36, -len * 0.12], [r * 0.6, -len * 0.5], [r * 0.9, -len * 0.88], [r, -len], [r * 0.96, -len], [r * 0.85, -len * 0.88], [r * 0.54, -len * 0.5], [r * 0.3, -len * 0.12], [r * 0.26, 0]], { segs: 40 }), [r, len])
  return (
    <group>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[r * 0.45, r * 0.5, 0.6, 20]} /><Metal kind="steel" grain="cast" /></mesh>
      <mesh geometry={bell}><meshStandardMaterial color="#3d3a37" metalness={0.85} roughness={0.42} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}
/** 尾焰：几层叠起来的亮锥，k 是强度 0–1 */
function Plume({ r, k, len = 22 }: { r: number; k: number; len?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current) { const f = 1 + Math.sin(clock.elapsedTime * 40) * 0.04 + Math.sin(clock.elapsedTime * 23) * 0.03; ref.current.scale.set(f, 0.85 + k * 0.15 * f, f) } })
  if (k < 0.01) return null
  return (
    <group ref={ref}>
      <mesh position={[0, -len * 0.18, 0]}><coneGeometry args={[r * 0.9, len * 0.36, 20, 1, true]} /><meshBasicMaterial color="#fff6d8" transparent opacity={0.95 * k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -len * 0.5, 0]} rotation-x={Math.PI}><coneGeometry args={[r * 1.5, len, 24, 1, true]} /><meshBasicMaterial color="#ffb347" transparent opacity={0.55 * k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -len * 0.62, 0]} rotation-x={Math.PI}><coneGeometry args={[r * 2.6, len * 1.3, 24, 1, true]} /><meshBasicMaterial color="#ff7a2a" transparent opacity={0.22 * k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}
/** 整枚火箭，高约 57 m，底部（尾段下沿）在 y = 0。fire 0–1：点火的火焰强度 */
export function Rocket({ fire = 0 }: { fire?: number }) {
  const tex = useMemo(makeRocketTex, [])
  const core = useMemo(() => lathe([[0, 0], [CORE_R * 0.92, 0], [CORE_R, 0.6], [CORE_R, 44], [2.58, 44.3], [2.6, 50], [2.55, 52.5], [2.2, 54.6], [1.5, 56.2], [0.6, 57.1], [0.18, 57.4], [0, 57.45]], { segs: 64, crease: 20 }), [])
  const boost = useMemo(() => lathe([[0, 0], [BOOST_R * 0.9, 0], [BOOST_R, 0.4], [BOOST_R, 24], [1.5, 25.6], [1.0, 26.9], [0.45, 27.6], [0, 27.8]], { segs: 48, crease: 20 }), [])
  return (
    <group>
      <mesh geometry={core} castShadow receiveShadow><meshStandardMaterial map={tex} color="#ffffff" roughness={0.42} metalness={0.05} /></mesh>
      {/* 级间段、整流罩分离面：深色的环 */}
      {[[33.2, 1.2, '#3b3d40'], [44.05, 0.25, '#8b8d90'], [49.9, 0.08, '#6b6d70']].map(([y, h, c]) => <mesh key={y as number} position={[0, (y as number) + (h as number) / 2, 0]}><cylinderGeometry args={[(y as number) > 44 ? 2.61 : CORE_R + 0.01, (y as number) > 44 ? 2.61 : CORE_R + 0.01, h as number, 64]} /><meshStandardMaterial color={c as string} roughness={0.5} metalness={0.3} /></mesh>)}
      {/* 芯级的两台发动机 */}
      {[1, -1].map(s => <group key={s} position={[s * 1.05, 0, 0]}><Engine /><group position={[0, -1.9, 0]}><Plume r={0.75} k={fire} /></group></group>)}
      {/* 四个助推器 */}
      {[0, 1, 2, 3].map(i => {
        const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * (CORE_R + BOOST_R + 0.15), z = Math.sin(a) * (CORE_R + BOOST_R + 0.15)
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={boost} castShadow receiveShadow><meshStandardMaterial color="#f1f0ec" roughness={0.45} metalness={0.05} /></mesh>
            <mesh position={[0, 12, 0]}><cylinderGeometry args={[BOOST_R + 0.01, BOOST_R + 0.01, 0.5, 48]} /><meshStandardMaterial color="#3b3d40" roughness={0.5} /></mesh>
            {/* 和芯级相连的支杆 */}
            <mesh position={[-x * 0.22, 22, -z * 0.22]} rotation={[0, -a, Math.PI / 2]}><cylinderGeometry args={[0.18, 0.18, 0.9, 10]} /><Metal kind="steel" /></mesh>
            <mesh position={[-x * 0.22, 3, -z * 0.22]} rotation={[0, -a, Math.PI / 2]}><cylinderGeometry args={[0.18, 0.18, 0.9, 10]} /><Metal kind="steel" /></mesh>
            {/* 尾翼 */}
            <mesh position={[x * 0.28, 1.6, z * 0.28]} rotation-y={-a}><boxGeometry args={[1.4, 3, 0.12]} /><meshStandardMaterial color="#e9e7e1" roughness={0.5} /></mesh>
            {[1, -1].map(s => <group key={s} position={[Math.cos(a + s * 1.57) * 0.6, 0, Math.sin(a + s * 1.57) * 0.6]}><Engine r={0.6} len={1.6} /><group position={[0, -1.6, 0]}><Plume r={0.6} k={fire} len={18} /></group></group>)}
          </group>
        )
      })}
    </group>
  )
}

// ---------- 椰子树、沙地 ----------
/** 一片羽状叶的贴图：中间一根叶轴，两边一排排细长的小叶，叶尖往外斜，其余透明 */
function makeFrondTex() {
  const W = 512, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.clearRect(0, 0, W, H)
  for (let i = 0; i < 46; i++) {
    const x = 18 + i * 10.5, len = (H / 2 - 4) * Math.sin(Math.PI * Math.min(1, (x / W) * 1.08)) * 0.98
    for (const s of [1, -1]) {
      g.strokeStyle = i % 3 ? '#3f6e2c' : '#4d7f35'; g.lineWidth = 4.2; g.lineCap = 'round'
      g.beginPath(); g.moveTo(x, H / 2); g.quadraticCurveTo(x + len * 0.25, H / 2 + s * len * 0.5, x + len * 0.55, H / 2 + s * len); g.stroke()
    }
  }
  g.strokeStyle = '#7a8a45'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 椰子树：弯着长的树干（一节一节，越往上越细），顶上十来片下垂的羽状叶。全部合成两个模型 */
function makePalms() {
  let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  const tp: number[] = [], tc: number[] = [], ti: number[] = [], fp: number[] = [], fu: number[] = [], fi: number[] = []
  const col = new THREE.Color()
  const spots: [number, number][] = []
  for (let i = 0; i < 90; i++) { const a = rnd() * Math.PI * 2, R = 95 + rnd() * 300, x = Math.cos(a) * R + 20, z = Math.sin(a) * R * 0.75 - 60; if (z > 120 && Math.abs(x) < 70) continue; if (z < -470) continue; if (Math.hypot(x + 260, z - 120) < 20) continue; spots.push([x, z]) }
  // 海边多种一排
  for (let i = 0; i < 40; i++) spots.push([-420 + i * 22 + rnd() * 10, -440 - rnd() * 25])
  for (const [x, z] of spots) {
    const h = 9 + rnd() * 7, la = rnd() * Math.PI * 2, lean = 0.15 + rnd() * 0.3
    const P = (t: number) => new THREE.Vector3(x + Math.cos(la) * h * lean * t * t, h * t, z + Math.sin(la) * h * lean * t * t)
    // 树干
    const N = 18, M = 8, base = tp.length / 3
    for (let k = 0; k <= N; k++) {
      const t = k / N, c = P(t), d = P(Math.min(1, t + 0.01)).sub(P(Math.max(0, t - 0.01))).normalize()
      const u = new THREE.Vector3(1, 0, 0).cross(d).normalize(), v = d.clone().cross(u)
      const node = Math.abs(((t * 22) % 1) - 0.5) < 0.12   // 一节一节的叶痕
      const r = (0.24 - 0.09 * t) * (node ? 1.08 : 1) * (k === 0 ? 1.4 : 1)
      col.set(node ? '#5b4a37' : '#86745c').multiplyScalar(0.85 + rnd() * 0.2)
      for (let j = 0; j < M; j++) { const a = j / M * Math.PI * 2; tp.push(c.x + (u.x * Math.cos(a) + v.x * Math.sin(a)) * r, c.y + (u.y * Math.cos(a) + v.y * Math.sin(a)) * r, c.z + (u.z * Math.cos(a) + v.z * Math.sin(a)) * r); tc.push(col.r, col.g, col.b) }
      if (k < N) for (let j = 0; j < M; j++) { const a0 = base + k * M + j, a1 = base + k * M + (j + 1) % M, b0 = a0 + M, b1 = a1 + M; ti.push(a0, b0, a1, a1, b0, b1) }
    }
    // 叶
    const top = P(1), F = 11 + Math.floor(rnd() * 4)
    for (let f = 0; f < F; f++) {
      const b = f / F * Math.PI * 2 + rnd() * 0.4, L = 4.2 + rnd() * 2, rise = 0.25 + rnd() * 0.35
      const out = new THREE.Vector3(Math.cos(b), 0, Math.sin(b)), side = new THREE.Vector3(-Math.sin(b), 0, Math.cos(b))
      const S = 14, fb = fp.length / 3
      for (let k = 0; k <= S; k++) {
        const s = k / S, c = top.clone().addScaledVector(out, L * s).add(new THREE.Vector3(0, L * (rise * s - 0.85 * s * s), 0))
        const w = L * 0.2, fold = 0.35 * w   // 两边的小叶往下耷拉，横截面是一个倒 V
        for (const q of [-1, 0, 1]) { fp.push(c.x + side.x * w * q, c.y - Math.abs(q) * fold, c.z + side.z * w * q); fu.push(s, (q + 1) / 2) }
        if (k < S) { const a = fb + k * 3; fi.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5) }
      }
    }
  }
  const trunk = new THREE.BufferGeometry(); trunk.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); trunk.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3)); trunk.setIndex(ti); trunk.computeVertexNormals()
  const fronds = new THREE.BufferGeometry(); fronds.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fronds.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2)); fronds.setIndex(fi); fronds.computeVertexNormals()
  return { trunk, fronds }
}
/** 沙地上大片的深浅：几十块很大的柔边斑，偏黄、偏灰、偏绿 */
function makeSandPatches() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  let sd = 21; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S, y = rnd() * S, r = 30 + rnd() * 140, k = rnd()
    const color = k < 0.35 ? '150,128,90' : k < 0.6 ? '226,210,170' : k < 0.85 ? '118,128,78' : '170,150,120'
    const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${color},0.42)`); q.addColorStop(1, `rgba(${color},0)`)
    g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // 两条车辙路
  g.strokeStyle = 'rgba(120,104,78,0.35)'; g.lineWidth = 6
  for (const yy of [380, 700]) { g.beginPath(); g.moveTo(0, yy); for (let x = 0; x <= S; x += 32) g.lineTo(x, yy + Math.sin(x * 0.01) * 20); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ---------- 发射场 ----------
/** 桁架塔：四根主柱、每层的横梁和 X 形斜撑，合成一个模型 */
function truss(w: number, d: number, h: number, step: number, col: string): Part[] {
  const P: Part[] = [], t = 0.45
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) P.push({ p: [x, h / 2, z], s: [t, h, t], c: col })
  const diag = Math.hypot(w, step), ang = Math.atan2(step, w), angD = Math.atan2(step, d), diagD = Math.hypot(d, step)
  for (let y = 0; y < h - 0.1; y += step) {
    for (const z of [-d / 2, d / 2]) { P.push({ p: [0, y + step, z], s: [w, 0.35, 0.3], c: col }); P.push({ p: [0, y + step / 2, z], s: [diag, 0.18, 0.18], c: col, r: [0, 0, ang] }, { p: [0, y + step / 2, z], s: [diag, 0.18, 0.18], c: col, r: [0, 0, -ang] }) }
    for (const x of [-w / 2, w / 2]) { P.push({ p: [x, y + step, 0], s: [0.3, 0.35, d], c: col }); P.push({ p: [x, y + step / 2, 0], s: [0.18, 0.18, diagD], c: col, r: [angD, 0, 0] }, { p: [x, y + step / 2, 0], s: [0.18, 0.18, diagD], c: col, r: [-angD, 0, 0] }) }
  }
  return P
}
export const TOWER_X = 13
function Site() {
  const [d, n, r] = useConcrete(60, 60)
  const sand = useMemo(() => { const t = makeGround('#cbb58e', '176,152,112', '214,198,160', 13); t.repeat.set(80, 80); return t }, [])
  const geo = useMemo(() => {
    const P: Part[] = []
    // 脐带塔：10 × 10 m，高 78 m，红白相间的钢桁架
    const H = 78
    truss(10, 10, H, 6, '#e6e4de').forEach(p => { P.push({ ...p, p: [p.p[0] + TOWER_X + 5.2, p.p[1] + 7, p.p[2]] }) })
    for (let y = 13; y <= H; y += 6) P.push({ p: [TOWER_X + 5.2, y + 7, 0], s: [10.6, 0.3, 10.6], c: (y / 6) % 2 ? '#c8372d' : '#d9d7d0' })        // 各层平台
    P.push({ p: [TOWER_X + 5.2, H + 8, 0], s: [11.5, 2.2, 11.5], c: '#c8372d' }, { p: [TOWER_X + 5.2, H + 10.5, 0], s: [6, 3, 6], c: '#e6e4de' })    // 塔顶机房
    P.push({ p: [TOWER_X + 2, H + 12.5, 0], s: [26, 0.9, 1.1], c: '#e2b32c' }, { p: [TOWER_X + 5.2, H + 15, 0], s: [0.8, 5, 0.8], c: '#e2b32c' })    // 塔吊
    // 摆杆：从塔伸向火箭的几根，带走道和管路
    for (const y of [20, 33, 46, 53]) P.push({ p: [TOWER_X - 2.6, y, 0], s: [9.6, 0.9, 2.2], c: '#c9c7c0' }, { p: [TOWER_X - 2.6, y + 1.1, 1.0], s: [9.6, 1.3, 0.08], c: '#a7a59f' }, { p: [TOWER_X - 2.6, y - 0.7, -0.6], s: [9.6, 0.35, 0.35], c: '#6b6e72' })
    // 移动发射平台：7 m 高的钢平台，四角支腿，中间是喷管的开口
    for (const [x, z, w, dd] of [[-8, 0, 6, 22], [8.6, 0, 7, 22], [0, -8, 10, 6], [0, 8, 10, 6]]) P.push({ p: [x, 3.6, z], s: [w, 2.2, dd], c: '#73777c' })
    for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) P.push({ p: [x, 1.3, z], s: [2.2, 2.6, 2.2], c: '#5b5f63' })
    for (const [x, z] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) P.push({ p: [x, 5.2, z], s: [0.8, 1.2, 0.8], c: '#3c3f42' })          // 支撑臂
    // 导流槽两侧的混凝土墙和槽口
    P.push({ p: [0, 0.6, -36], s: [16, 1.2, 40], c: '#8d8b84' })
    // 铁轨：从总装厂房一直通到工位
    for (const x of [-4.5, 4.5]) P.push({ p: [x, 0.12, 260], s: [0.25, 0.24, 520], c: '#7c7368' })
    // 四座避雷塔
    for (const [x, z] of [[-70, -60], [80, -60], [-70, 60], [80, 60]]) { P.push({ p: [x, 60, z], s: [1.4, 120, 1.4], c: '#d9d7d0' }); for (let y = 10; y < 120; y += 20) P.push({ p: [x, y, z], s: [1.6, 10, 1.6], c: '#c8372d' }) ; P.push({ p: [x, 123, z], s: [0.25, 6, 0.25], c: '#9a9a9a' }) }
    // 远处：总装测试厂房（高约 100 m 的大门）、指挥楼
    P.push({ p: [0, 50, 560], s: [70, 100, 60], c: '#e4e2dc' }, { p: [0, 46, 529.8], s: [26, 92, 0.4], c: '#9aa3ab' }, { p: [0, 101, 560], s: [72, 2, 62], c: '#b9b7b0' })
    for (let i = 0; i < 9; i++) P.push({ p: [0, 6 + i * 10.5, 529.6], s: [26.4, 0.4, 0.3], c: '#7d858c' })
    P.push({ p: [-180, 14, 420], s: [80, 28, 30], c: '#dcdad3' }, { p: [-180, 29, 420], s: [84, 2, 33], c: '#8d9095' })
    for (let f = 0; f < 5; f++) P.push({ p: [-180, 4 + f * 5, 404.8], s: [76, 2.4, 0.3], c: '#506a82' })
    // 储罐区（液氢液氧）
    for (const [x, z] of [[-90, -30], [-90, 0], [-115, -30], [-115, 0]]) P.push({ p: [x, 6, z], s: [6, 12, 6], c: '#f0efea', cyl: true })
    return mergeParts(P)
  }, [])
  const palms = useMemo(makePalms, [])
  const ripple = useRipple([60, 15], 0.01)
  const frondTex = useMemo(makeFrondTex, [])
  const patches = useMemo(makeSandPatches, [])
  return (
    <group>
      {/* 发射区的混凝土地坪，外面是沙地，再往外（北边）是海 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow><planeGeometry args={[140, 140]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#c9c7bf" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 500]} receiveShadow><planeGeometry args={[2400, 2000]} /><meshStandardMaterial map={sand} roughness={1} /></mesh>
      {/* 导流槽：工位下面的一道深沟 */}
      <mesh position={[0, -0.02, -22]} rotation-x={-Math.PI / 2}><planeGeometry args={[9, 30]} /><meshStandardMaterial color="#26282a" roughness={1} /></mesh>
      <mesh position={[0, -1.0, -1250]} rotation-x={-Math.PI / 2}><planeGeometry args={[6000, 1500]} /><meshStandardMaterial color="#1b5a72" roughness={0.3} metalness={0} envMapIntensity={0.55} normalMap={ripple} normalScale={[0.6, 0.6]} /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.55} metal={0.3} /></mesh>
      <mesh geometry={palms.trunk} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
      <mesh geometry={palms.fronds} castShadow><meshStandardMaterial map={frondTex} alphaTest={0.45} side={THREE.DoubleSide} roughness={0.75} color="#b8d49a" /></mesh>
      {/* 沙地上大片的深浅变化：被车压过、湿一点、长了草的地方 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 300]}><planeGeometry args={[1600, 1600]} /><meshStandardMaterial map={patches} transparent depthWrite={false} roughness={1} /></mesh>
      {/* 海边：湿沙和一道浪花 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, -485]}><planeGeometry args={[3000, 34]} /><meshStandardMaterial color="#9c8664" roughness={0.6} transparent opacity={0.85} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.4, -505]}><planeGeometry args={[3000, 8]} /><meshStandardMaterial color="#eef3f2" roughness={0.9} transparent opacity={0.7} /></mesh>
    </group>
  )
}
export function LaunchSite() { return <Site /> }
/** 火箭站在移动发射平台上时尾段下沿的高度 */
export const PAD_Y = 7.2
