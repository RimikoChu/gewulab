// 光反应和暗反应实验室的大场景：一间植物生理实验室，和从实验台上那盆菠菜的叶子一路放大进去看到的东西。
// 最左边是实验室（靠后墙一条长实验台，各课占一格；玻璃隔断后面是培养室的植物架）；往右依次是放大的叶肉细胞、
// 一个剖开的叶绿体（双层膜、基粒、基质片层、基质）、再放大的一摞类囊体的一角和它旁边的基质（第 4–6 课）。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。实验室里 1 m 画成 M 个单位；细胞里的大小都是示意，不按比例。
import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { fbm, rng, useLazy, type V3 } from './kit'
import { MacroWorld } from './macro'
import { GRANA } from './physics'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；实验台台面的高度
/** 实验室：x 的范围、后墙的 z、层高；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -66, x1: 44, z0: -18, z1: 10, h: 20 }
export const BENCH = { z0: -17.4, z1: -12.6 }
export const BZ = -15
/** 实验台上各格的中心（x） */
export const ST = { l1: -48, l2: -30, l3: -12, l7: 8, x: 28 }
/** 叶肉细胞、叶绿体、类囊体一角各自的原点 */
export const CELL: V3 = [150, 6, 0], PLAST: V3 = [600, 0, 0], MAC: V3 = [1200, 0, 0]
/** 叶绿体的三个半轴，和剖开的那个面的位置（z） */
export const PL = { a: 56, b: 20, c: 30, cut: 10 }

type Kind = 'lab' | 'dark' | 'cell' | 'plast' | 'mac'
const spot = (p: V3, w: number, h: number, view: [number, number], kind: Kind, fog: [number, number] = [160, 1200]) => ({ target: new THREE.Vector3(...p), span: [w, h] as [number, number], view, kind, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  leaf: spot([ST.l1 + 0.05, TOP + 1.32, BZ + 0.3], 2.5, 1.95, [-0.2, 0.2], 'lab'),
  cell: spot([CELL[0], CELL[1] - 0.5, CELL[2]], 42, 25, [0.16, 0.12], 'cell', [60, 260]),
  plast: spot([PLAST[0], PLAST[1], PLAST[2]], 122, 50, [-0.3, 0.26], 'plast', [150, 520]),
  plastCut: spot([PLAST[0], PLAST[1] - 1, PLAST[2] + 2], 116, 46, [-0.12, 0.2], 'plast', [150, 520]),
  grind: spot([ST.l2 - 0.33, TOP + 0.58, BZ + 0.05], 3.0, 1.5, [-0.14, 0.36], 'lab'),
  pour: spot([ST.l2 - 0.5, TOP + 1.12, BZ + 0.1], 2.4, 2.5, [-0.14, 0.24], 'lab'),
  strip: spot([ST.l2 + 0.78, TOP + 0.12, BZ + 0.53], 1.0, 0.7, [0.1, 0.55], 'lab'),
  chroma: spot([ST.l2 + 0.92, TOP + 0.33, BZ - 0.36], 0.86, 0.78, [0.08, 0.1], 'lab'),
  prism: spot([ST.l3 - 0.2, TOP + 0.52, BZ - 0.1], 3.5, 1.5, [0.2, 0.3], 'dark'),
  light: spot([MAC[0] - 17.5, MAC[1] + 0.8, MAC[2]], 34, 15.5, [-0.1, 0.16], 'mac', [50, 190]),
  dark: spot([MAC[0] + 11.2, MAC[1] + 3.3, MAC[2] + 3], 23, 18, [0.1, 0.1], 'mac', [50, 190]),
  both: spot([MAC[0] - 7.6, MAC[1] + 1.8, MAC[2] + 1], 50, 19, [-0.03, 0.16], 'mac', [60, 210]),
  rate: spot([ST.l7 + 0.25, TOP + 1.2, BZ + 0.3], 4.0, 2.45, [-0.12, 0.17], 'lab'),
  xStrip: spot([ST.x - 3.38, TOP + 0.33, BZ + 0.06], 0.8, 0.74, [-0.06, 0.08], 'lab'),
  xRate: spot([ST.x + 2.55, TOP + 1.2, BZ + 0.3], 4.0, 2.45, [0.14, 0.17], 'lab'),
  quiz: spot([PLAST[0] + 6, PLAST[1] - 1, PLAST[2] - 3], 44, 24, [0.5, 0.36], 'plast', [40, 260]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：室内工作灯跟到哪；是不是暗室；叶绿体剖开没有 */
export interface Want { x: number; kind: Kind; cut: boolean }

/** 这一课的舞台：选一处机位。实验室里点亮工作灯；细胞里是暗处的几盏柔光 */
export function Place({ at, labels, children = null, cut = true, bloom }: { at: SpotKey; labels: Label[]; children?: ReactNode; cut?: boolean; bloom?: number }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, kind: v.kind, cut }), [v, cut])
  const lab = v.kind === 'lab' || v.kind === 'dark', dark = v.kind === 'dark'
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} studio sky={false} world={want} fog={v.fog} free={!lab}
    sun={dark ? 0.12 : lab ? 1.0 : 1.3} env={dark ? 0.17 : lab ? 0.62 : v.kind === 'mac' ? 0.5 : 0.6} bloom={bloom ?? (dark ? 0.9 : lab ? 0.35 : 0.6)}
    backdrop={lab ? '#0d1317' : v.kind === 'cell' ? '#0b2016' : v.kind === 'plast' ? '#061810' : '#06170f'}>{children}</LabStage>
}

// ---------- 程序画的贴图 ----------
function canvasTex(S: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d')!, rng(seed))
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
}
const tileTex = () => canvasTex(512, (g, r) => {
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 196 + Math.floor(r() * 12); g.fillStyle = `rgb(${v - 4},${v},${v + 2})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,124,126' : '250,252,252'},${0.06 + r() * 0.1})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8c9294'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, 512); g.fillRect(0, k, 512, 3) }
})
const benchTex = () => canvasTex(256, (g, r) => {
  g.fillStyle = '#3f474b'; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 50; i++) { const x = r() * 256, y = r() * 256, R = 10 + r() * 40, q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(30,36,40,0.22)' : 'rgba(110,120,124,0.2)'); q.addColorStop(1, 'rgba(90,100,104,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '24,28,32' : '140,148,152'},${0.12 + r() * 0.15})`; g.fillRect(r() * 256, r() * 256, 1, 1) }
}, 9)
const wallTex = () => canvasTex(256, (g, r) => {
  g.fillStyle = '#b9bcb8'; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 226 + Math.floor(r() * 10), q = g.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); q.addColorStop(0, `rgb(${v},${v + 1},${v})`); q.addColorStop(1, `rgb(${v - 8},${v - 7},${v - 8})`); g.fillStyle = q; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60) }
}, 13)
/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}

// ---------- 实验室 ----------
const WIN = { y0: TOP + 1.6, y1: TOP + 9.5 }      // 玻璃隔断的上下沿
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH, L = H.x1 - H.x0, cx = (H.x0 + H.x1) / 2
  // 实验台：一条长的柜体，柜门一扇扇，每扇一只拉手；踢脚深色
  for (let x = H.x0 + 2; x < H.x1 - 2; x += 4.5) {
    P.push({ p: [x + 2.25, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [4.3, TOP - 0.9, 0.2], c: '#d3d7d5' })
    P.push({ p: [x + 2.25, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.14, 0.14], c: '#7b8085' })
  }
  P.push({ p: [cx, 0.15, (B.z0 + B.z1) / 2], s: [L - 4, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  // 台面后沿的挡水条、设备带上的插座
  P.push({ p: [cx, TOP + 0.12, B.z0 + 0.12], s: [L - 4, 0.24, 0.24], c: '#c9ccca' })
  for (const x of Object.values(ST)) for (const s of [-1, 1]) P.push({ p: [x + s * 7.4, TOP + 1.0, H.z0 + 0.12], s: [0.8, 0.5, 0.1], c: '#e8e6df' })
  // 玻璃隔断的框：上下两道横梁、一根根立柱
  P.push({ p: [cx, WIN.y0 - 0.15, H.z0 + 0.1], s: [L, 0.3, 0.5], c: '#5d6468' }, { p: [cx, WIN.y1 + 0.15, H.z0 + 0.1], s: [L, 0.3, 0.5], c: '#5d6468' })
  for (let x = H.x0; x <= H.x1; x += 10) P.push({ p: [x + 1, (WIN.y0 + WIN.y1) / 2, H.z0 + 0.1], s: [0.28, WIN.y1 - WIN.y0, 0.4], c: '#5d6468' })
  // 隔断上方的墙和顶上的一道梁
  P.push({ p: [cx, (WIN.y1 + 0.3 + H.h) / 2, H.z0 - 0.2], s: [L, H.h - WIN.y1 - 0.3, 0.6], c: '#d8d8d2' })
  return P
}
/** 培养室里的植物架：三层搁板，每层上面一排灯、下面一盘盘绿苗 */
const RACKS = [-56, -34, -12, 10, 32]
function rackParts() {
  const P: Part[] = []
  for (const x of RACKS) {
    for (const s of [-1, 1]) for (const z of [-33, -29]) P.push({ p: [x + s * 8, 8, z], s: [0.3, 16, 0.3], c: '#8d9296' })
    for (const y of [3.2, 8.2, 13.2]) { P.push({ p: [x, y, -31], s: [16.4, 0.25, 4.4], c: '#aeb3b6' }); P.push({ p: [x, y + 0.5, -31], s: [15.6, 0.7, 3.6], c: '#2c3033' }) }
  }
  return P
}
function seedlings() {
  const r = rng(31), gs: THREE.BufferGeometry[] = [], c = new THREE.Color()
  for (const x of RACKS) for (const y of [3.2, 8.2, 13.2]) for (let i = 0; i < 26; i++) {
    const g = new THREE.SphereGeometry(0.5 + r() * 0.35, 7, 5); g.scale(1, 0.7 + r() * 0.5, 1); g.translate(x - 7.2 + (i % 13) * 1.2 + (r() - 0.5) * 0.3, y + 1.2 + r() * 0.3, -32 + Math.floor(i / 13) * 1.9 + (r() - 0.5) * 0.3)
    c.set(r() < 0.5 ? '#3f8f3c' : '#56a445').multiplyScalar(0.8 + r() * 0.4)
    const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) a.set([c.r, c.g, c.b], k * 3)
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed())
  }
  return mergeGeometries(gs)
}
/** 室内的工作灯：跟着当前这一课从前上方打下来；暗室里调得很暗 */
function Key({ x, kind }: { x: number; kind: Kind }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30), lab = kind === 'lab' || kind === 'dark'
    if (lab) cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 4, HALL.h - 2, BZ + 14); aim.position.set(cur.current, TOP + 1, BZ); aim.updateMatrixWorld()
    l.intensity += ((kind === 'lab' ? 170 : kind === 'dark' ? 26 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.52} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}
function Hall({ kind }: { kind: Kind }) {
  const H = HALL, B = BENCH, dark = kind === 'dark'
  // 实验室的各样东西排队做：进页面先出画面，贴图和大网格随后补上
  const parts = useLazy('hall-parts', () => mergeParts(hallParts())), racks = useLazy('hall-racks', () => mergeParts(rackParts())), green = useLazy('seedlings', seedlings)
  const tile = useLazy('tex-tile', tileTex), bench = useLazy('tex-bench', benchTex), wall = useLazy('tex-wall', wallTex)
  const floor = useMemo(() => slab(H.x0 - 20, H.x1 + 20, -0.4, 0, -60, H.z1 + 40, 7.2), [H])
  const top = useMemo(() => slab(H.x0 + 1.6, H.x1 - 1.6, TOP - 0.24, TOP, B.z0, B.z1 + 0.25, 3), [H, B])
  const skirt = useMemo(() => slab(H.x0, H.x1, 0, WIN.y0 - 0.3, H.z0 - 0.5, H.z0, 1.2), [H])
  const lamps = useRef<THREE.MeshBasicMaterial>(null), safe = useRef<THREE.Group>(null)
  // 暗室的安全灯一直挂在场景里，只调亮度：灯的盏数一变，所有材质都要重新编译，会卡一下
  useFrame((_, d) => { const g = safe.current; if (g) for (const l of g.children as THREE.PointLight[]) { const to = dark ? (l.userData.i as number) : 0; l.intensity += (to - l.intensity) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.4)) } })
  useFrame((_, d) => { const m = lamps.current; if (m) { const k = dark ? 0.05 : 1, c = m.color.r + (k - m.color.r) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.4)); m.color.setRGB(c, c * 0.72, c * 0.95) } })
  return <group>
    <mesh geometry={floor} receiveShadow><meshStandardMaterial key={tile ? 1 : 0} map={tile} color={tile ? '#ffffff' : '#c4c8c9'} roughness={0.42} metalness={0.05} /></mesh>
    {parts && <mesh geometry={parts} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>}
    <mesh geometry={top} receiveShadow castShadow><meshStandardMaterial key={bench ? 1 : 0} map={bench} color={bench ? '#ffffff' : '#3f474b'} roughness={0.5} /></mesh>
    <mesh geometry={skirt} receiveShadow><meshStandardMaterial key={wall ? 1 : 0} map={wall} color={wall ? '#ffffff' : '#dcdedb'} roughness={0.35} /></mesh>
    {/* 暗室（第 3 课那一格）的安全灯：一盏暗红的从后上方照下来，再加一点冷色和暖色的轮廓光 */}
    <group ref={safe} position={[ST.l3, TOP, BZ]}>
      <pointLight position={[-0.6, 3, -1.8]} intensity={0} distance={9} decay={2} color="#ff5a36" userData={{ i: 16 }} />
      <pointLight position={[1.5, 2.5, 3]} intensity={0} distance={8} decay={2} color="#9fc0ff" userData={{ i: 7 }} />
      <pointLight position={[-3, 1.8, 2.1]} intensity={0} distance={7} decay={2} color="#ffd9b0" userData={{ i: 5 }} />
    </group>
    {/* 玻璃隔断 */}
    <mesh position={[(H.x0 + H.x1) / 2, (WIN.y0 + WIN.y1) / 2, H.z0 + 0.05]}><planeGeometry args={[H.x1 - H.x0, WIN.y1 - WIN.y0]} /><meshPhysicalMaterial color="#a9c4c8" transparent opacity={0.14} roughness={0.03} clearcoat={1} envMapIntensity={1.6} depthWrite={false} /></mesh>
    {/* 培养室：植物架、补光灯、后墙 */}
    {racks && <mesh geometry={racks}><Painted rough={0.6} metal={0.3} /></mesh>}
    {green && <mesh geometry={green}><meshStandardMaterial vertexColors roughness={0.7} emissive="#16300f" emissiveIntensity={dark ? 0.05 : 0.9} /></mesh>}
    {RACKS.flatMap(x => [3.2, 8.2, 13.2].map(y => <mesh key={`${x}|${y}`} position={[x, y + 3.9, -31]}><boxGeometry args={[15.6, 0.12, 2.6]} /><meshBasicMaterial ref={x === RACKS[0] && y === 3.2 ? lamps : undefined} color="#ffb8f2" toneMapped={false} /></mesh>))}
    <mesh position={[(H.x0 + H.x1) / 2, 10, -37]}><planeGeometry args={[H.x1 - H.x0 + 60, 24]} /><meshStandardMaterial color="#2a3136" roughness={0.9} /></mesh>
  </group>
}

// ---------- 叶肉细胞 ----------
/** 栅栏组织的几个细胞：长圆柱形，细胞壁半透明，中间一个大液泡，叶绿体贴着细胞壁排一圈 */
const CELLS: { x: number; z: number; h: number; r: number }[] = [{ x: -15.5, z: -1, h: 19, r: 4.6 }, { x: -5.2, z: 0.5, h: 21, r: 4.9 }, { x: 5.4, z: -0.5, h: 20, r: 4.8 }, { x: 15.6, z: 0.8, h: 18.5, r: 4.5 }, { x: -10, z: -10, h: 20, r: 4.7 }, { x: 0.5, z: -10.5, h: 19, r: 4.8 }, { x: 11, z: -10, h: 21, r: 4.6 }]
/** 第 1 课要钻进去的那个叶绿体（在第 2 个细胞朝镜头的一面） */
export const PICK: V3 = [CELL[0] + CELLS[1].x + 1.2, CELL[1] + 1.5, CELL[2] + CELLS[1].z + CELLS[1].r - 0.9]
function cellPlastids() {
  const r = rng(3), out: THREE.Matrix4[] = [], q = new THREE.Quaternion(), e = new THREE.Euler()
  CELLS.forEach((c, ci) => {
    for (let k = 0; k < 30; k++) {
      const a = ci === 1 && k === 0 ? 0.24 : r() * Math.PI * 2, y = ci === 1 && k === 0 ? 1.5 : (r() - 0.5) * (c.h - 4), R = c.r - 0.9
      const p = new THREE.Vector3(c.x + Math.sin(a) * R, y, c.z + Math.cos(a) * R)
      if (out.some(m => new THREE.Vector3().setFromMatrixPosition(m).distanceTo(p) < 2.3)) continue
      q.setFromEuler(e.set(r() * 0.5 - 0.25, a, Math.PI / 2 + (r() - 0.5) * 1.2, 'YXZ')); out.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.9 + r() * 0.25)))
    }
  })
  return out
}
function Cells() {
  const inst = useLazy('cell-plastids', () => {
    const g = new THREE.SphereGeometry(1, 24, 16); g.scale(1.45, 0.62, 1.0)
    const list = cellPlastids(), m = new THREE.InstancedMesh(g, new THREE.MeshPhysicalMaterial({ color: '#4fae3e', roughness: 0.45, sheen: 0.8, sheenColor: new THREE.Color('#d9ffb0'), emissive: '#12350c', emissiveIntensity: 0.7 }), list.length)
    list.forEach((x, i) => m.setMatrixAt(i, x)); return m
  })
  const walls = useMemo(() => CELLS.map(c => new THREE.CapsuleGeometry(c.r, c.h - 2 * c.r, 12, 40)), [])
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (ring.current) ring.current.scale.setScalar(1 + 0.08 * Math.sin(clock.elapsedTime * 3)) })
  return <group position={CELL}>
    {inst && <primitive object={inst} />}
    {CELLS.map((c, i) => <group key={i} position={[c.x, 0, c.z]}>
      {/* 细胞壁和细胞膜：一层淡绿的厚壳；里面是液泡 */}
      <mesh geometry={walls[i]} renderOrder={4}><meshPhysicalMaterial color="#bfe6a8" transparent opacity={0.16} roughness={0.25} clearcoat={0.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh scale={[c.r * 0.62, c.h * 0.36, c.r * 0.62]} renderOrder={3}><sphereGeometry args={[1, 28, 20]} /><meshPhysicalMaterial color="#8fd0d8" transparent opacity={0.22} roughness={0.15} depthWrite={false} /></mesh>
      <mesh position={[c.r * 0.25, -c.h * 0.3, c.r * 0.3]}><sphereGeometry args={[1.25, 24, 16]} /><meshStandardMaterial color="#8d79b8" roughness={0.6} emissive="#2a1c44" emissiveIntensity={0.5} /></mesh>
    </group>)}
    {/* 上表皮：一排扁平的无色细胞 */}
    {[-18, -8.5, 1, 10.5, 19.5].map((x, i) => <mesh key={i} position={[x, 13.6 + (i % 2) * 0.2, -4]} scale={[4.9, 2.3, 9]} renderOrder={4}><sphereGeometry args={[1, 24, 14]} /><meshPhysicalMaterial color="#e2f0d4" transparent opacity={0.2} roughness={0.2} clearcoat={0.6} depthWrite={false} /></mesh>)}
    {/* 要钻进去的那个叶绿体外面一个圈 */}
    <mesh ref={ring} position={[PICK[0] - CELL[0], PICK[1] - CELL[1], PICK[2] - CELL[2] + 0.9]}><torusGeometry args={[2.1, 0.09, 8, 48]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>
    <pointLight position={[-6, 8, 26]} intensity={900} distance={90} decay={2} color="#f2ffd6" />
    <pointLight position={[14, -6, 18]} intensity={500} distance={80} decay={2} color="#c8ffe6" />
  </group>
}

// ---------- 叶绿体 ----------
/** 双层膜的四个面：外膜的外面和里面、内膜的外面和里面（按比例缩小的椭球） */
const SHELLS = [1, 0.958, 0.918, 0.876]
function shellGeo(k: number, seed: number, hex: string) {
  const g = new THREE.SphereGeometry(1, 112, 72), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), base = new THREE.Color(hex), v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize()
    const n = fbm(v.x * 5 + seed, v.y * 5, v.z * 5, 3), big = fbm(v.x * 1.8 + 7, v.y * 1.8, v.z * 1.8 + seed, 2), s = k * (1 + 0.006 * n)
    p.setXYZ(i, v.x * PL.a * s, v.y * PL.b * s, v.z * PL.c * s)
    c.copy(base).multiplyScalar(0.72 + 0.4 * (n + 0.5) + 0.3 * big); col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
}
/** 剖面上一层膜的截面：两条椭圆之间的一圈 */
function rimGeo(k0: number, k1: number) {
  const s = new THREE.Shape(); s.absellipse(0, 0, PL.a * k0, PL.b * k0, 0, Math.PI * 2, false, 0)
  const h = new THREE.Path(); h.absellipse(0, 0, PL.a * k1, PL.b * k1, 0, Math.PI * 2, true, 0); s.holes.push(h)
  return new THREE.ShapeGeometry(s, 96)
}
/** 一个类囊体：圆饼状的扁囊，边缘是圆的 */
export const DISC = { r: 4.7, t: 0.74, pitch: 0.96 }
function discGeo() {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -DISC.t / 2)], R = DISC.r, h = DISC.t / 2
  pts.push(new THREE.Vector2(R - h, -h)); for (let i = 1; i < 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI; pts.push(new THREE.Vector2(R - h + Math.cos(a) * h, Math.sin(a) * h)) }
  pts.push(new THREE.Vector2(R - h, h), new THREE.Vector2(0, h))
  return new THREE.LatheGeometry(pts, 48)
}
/** 基粒里每一个类囊体的位置 */
const discs = () => GRANA.flatMap((g, gi) => Array.from({ length: g.n }, (_, i) => ({ gi, p: [g.x + Math.sin(i * 2.4 + gi) * 0.16, g.y + (i - (g.n - 1) / 2) * DISC.pitch, g.z + Math.cos(i * 1.7 + gi) * 0.16] as V3 })))
/** 基质片层：把相邻的基粒连起来的扁平的膜，从这个基粒的某一层通到那个基粒的某一层 */
function lamellaeGeo() {
  const gs: THREE.BufferGeometry[] = [], c = new THREE.Color(), r = rng(11)
  for (let i = 0; i < GRANA.length; i++) for (let j = i + 1; j < GRANA.length; j++) {
    const A = GRANA[i], B = GRANA[j], dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz); if (d > 17.5) continue
    for (const f of [0.22, 0.52, 0.8]) {
      const ya = A.y + (Math.round(f * (A.n - 1)) - (A.n - 1) / 2) * DISC.pitch, yb = B.y + (Math.round((1 - f * 0.9) * (B.n - 1)) - (B.n - 1) / 2) * DISC.pitch
      const len = d - DISC.r * 1.5; if (len < 1) continue
      const g = new THREE.BoxGeometry(len, DISC.t * 0.7, 3.6 + r() * 1.6, 12, 1, 1), p = g.attributes.position, tilt = Math.atan2(yb - ya, d)
      for (let k = 0; k < p.count; k++) { const u = p.getX(k) / len; p.setY(k, p.getY(k) + Math.sin(u * Math.PI * 2 + i) * 0.22); p.setZ(k, p.getZ(k) * (0.82 + 0.3 * Math.cos(u * Math.PI))) }
      g.rotateZ(tilt); g.rotateY(-Math.atan2(dz, dx)); g.translate((A.x + B.x) / 2, (ya + yb) / 2, (A.z + B.z) / 2)
      c.set('#2f8a3e').multiplyScalar(0.8 + r() * 0.3); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) a.set([c.r, c.g, c.b], k * 3)
      g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.computeVertexNormals(); gs.push(g.toNonIndexed())
    }
  }
  return mergeGeometries(gs)
}
/** 基质里的淀粉粒、核糖体这样的小颗粒，稀稀地放一些 */
/** 叶绿体周围的细胞质里：别的叶绿体、小泡 */
const NEIGHBORS: { p: V3; r: V3; s: V3 }[] = [{ p: [-120, 34, -120], r: [0.3, 0.5, 0.4], s: [50, 19, 28] }, { p: [118, -30, -150], r: [-0.2, -0.6, -0.3], s: [54, 20, 30] }, { p: [20, 62, -210], r: [0.1, 1.0, 0.1], s: [52, 19, 28] }, { p: [-60, -58, -190], r: [0.2, -0.3, 0.2], s: [50, 18, 28] }, { p: [190, 50, -230], r: [0.4, 0.2, -0.5], s: [52, 19, 29] }]
const VESICLES: { p: V3; s: number }[] = [{ p: [-78, 30, -30], s: 7 }, { p: [84, 34, -50], s: 9 }, { p: [70, -34, -10], s: 5 }, { p: [-92, -26, -60], s: 10 }, { p: [-30, 40, -70], s: 6 }]
const STARCH: { p: V3; s: V3; r: number }[] = [{ p: [-33, 6, -18], s: [4.2, 2.2, 2.8], r: 0.3 }, { p: [28, -9, -3], s: [3.6, 1.9, 2.6], r: -0.2 }, { p: [4, 11, -20], s: [3.2, 1.7, 2.3], r: 0.1 }]
function Plastid({ cut }: { cut: boolean }) {
  const gl = useThree(st => st.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const shells = useLazy('cp-shells', () => SHELLS.map((k, i) => shellGeo(k, i * 3, i === 3 ? '#2f6a2c' : i < 2 ? '#7fb24a' : '#5c9a3f')))
  const rims = useMemo(() => [rimGeo(SHELLS[0], SHELLS[1]), rimGeo(SHELLS[2], SHELLS[3]), rimGeo(SHELLS[1], SHELLS[2])], [])
  const lam = useLazy('cp-lam', lamellaeGeo)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), PL.c + 2), []), clip = useMemo(() => [plane], [plane])
  const stack = useMemo(() => {
    const list = discs(), m = new THREE.InstancedMesh(discGeo(), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.42, sheen: 1, sheenColor: new THREE.Color('#d8ffb8'), sheenRoughness: 0.5, emissive: '#0d3312', emissiveIntensity: 0.55, clippingPlanes: clip }), list.length)
    const M4 = new THREE.Matrix4(), c = new THREE.Color()
    list.forEach((d, i) => { M4.makeTranslation(...d.p); m.setMatrixAt(i, M4); c.set(i % 2 ? '#3aa04a' : '#2f8e42').multiplyScalar(0.9 + 0.2 * Math.sin(d.gi * 1.7)); m.setColorAt(i, c) })
    return m
  }, [clip])
  const dots = useMemo(() => {
    const r = rng(23), m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshStandardMaterial({ color: '#cfe0a6', roughness: 0.6, clippingPlanes: clip }), 70), M4 = new THREE.Matrix4(); let n = 0
    for (let t = 0; t < 600 && n < 70; t++) { const p = new THREE.Vector3((r() - 0.5) * 100, (r() - 0.5) * 32, -26 + r() * 34); if ((p.x / PL.a) ** 2 + (p.y / PL.b) ** 2 + (p.z / PL.c) ** 2 > 0.6 || GRANA.some(g => Math.hypot(p.x - g.x, p.z - g.z) < DISC.r + 1 && Math.abs(p.y - g.y) < g.n * 0.5 + 1)) continue; M4.makeTranslation(p.x, p.y, p.z); m.setMatrixAt(n++, M4) }
    m.count = n; return m
  }, [clip])
  // 剖开是一个过程：剖面从最前面慢慢推到 PL.cut
  const z = useRef(PL.c + 2), rim = useRef<THREE.Group>(null)
  useFrame((_, d) => {
    const to = cut ? PL.cut : PL.c + 2, dt = Math.min(d, 1 / 30)
    z.current = Math.abs(to - z.current) < 14 * dt ? to : z.current + Math.sign(to - z.current) * 14 * dt
    plane.constant = z.current
    const g = rim.current; if (g) { const s = Math.sqrt(Math.max(0, 1 - (z.current / PL.c) ** 2)); g.visible = z.current < PL.c - 0.3; g.position.z = z.current; g.scale.set(s, s, 1) }
  })
  const mem = (i: number, back: boolean) => shells && <mesh geometry={shells[i]} renderOrder={back ? 0 : 1}>
    <meshPhysicalMaterial vertexColors side={back ? THREE.BackSide : THREE.FrontSide} roughness={0.5} sheen={0.9} sheenColor="#efffc8" emissive={back ? '#0c2a0e' : '#0e2a0c'} emissiveIntensity={back ? 0.35 : 0.5} clippingPlanes={clip} />
  </mesh>
  return <group position={PLAST}>
    {mem(0, false)}{mem(1, true)}{mem(2, false)}{mem(3, true)}
    <group ref={rim}>
      <mesh geometry={rims[0]}><meshStandardMaterial color="#cfe89a" roughness={0.6} emissive="#3a5a1c" emissiveIntensity={0.6} /></mesh>
      <mesh geometry={rims[1]}><meshStandardMaterial color="#a9d67c" roughness={0.6} emissive="#2c4f18" emissiveIntensity={0.6} /></mesh>
      <mesh geometry={rims[2]} position-z={-0.02}><meshStandardMaterial color="#0c2410" roughness={0.9} /></mesh>
    </group>
    <primitive object={stack} />
    {lam && <mesh geometry={lam}><meshPhysicalMaterial vertexColors roughness={0.5} sheen={0.8} sheenColor="#d8ffb8" emissive="#0d3312" emissiveIntensity={0.5} clippingPlanes={clip} /></mesh>}
    <primitive object={dots} />
    {STARCH.map((s, i) => <mesh key={i} position={s.p} scale={s.s} rotation-z={s.r}><sphereGeometry args={[1, 28, 20]} /><meshPhysicalMaterial color="#eef0e2" roughness={0.35} clearcoat={0.5} clippingPlanes={clip} /></mesh>)}
    {/* 叶绿体外面是细胞质：远处几个别的叶绿体、一片液泡膜、几个小泡，都在雾里，只给背景一点层次 */}
    {NEIGHBORS.map((n, i) => <mesh key={i} position={n.p} rotation={n.r} scale={n.s}><sphereGeometry args={[1, 40, 24]} /><meshStandardMaterial color="#3f8a3a" roughness={0.6} emissive="#123a14" emissiveIntensity={0.9} /></mesh>)}
    <mesh position={[40, 150, -330]}><sphereGeometry args={[300, 64, 40]} /><meshStandardMaterial color="#2c6a70" roughness={0.5} emissive="#0f3a40" emissiveIntensity={0.7} /></mesh>
    <mesh position={[0, -150, -120]} rotation-x={-Math.PI / 2 + 0.25}><planeGeometry args={[900, 500]} /><meshStandardMaterial color="#3a6a34" roughness={0.8} emissive="#17341a" emissiveIntensity={0.9} /></mesh>
    {VESICLES.map((v, i) => <mesh key={i} position={v.p} scale={v.s} renderOrder={2}><sphereGeometry args={[1, 24, 16]} /><meshPhysicalMaterial color="#a8e0d4" roughness={0.2} transparent opacity={0.3} clearcoat={1} depthWrite={false} /></mesh>)}
    <pointLight position={[-22, 16, 44]} intensity={1050} distance={150} decay={2} color="#f4ffd8" />
    <pointLight position={[30, 4, 36]} intensity={900} distance={130} decay={2} color="#d0ffe6" />
    <pointLight position={[0, 12, -6]} intensity={220} distance={70} decay={2} color="#eaffb8" />
  </group>
}

function WorldInner({ want }: { want?: Want }) {
  const kind = want?.kind ?? 'lab'
  return <group>
    <Hall kind={kind} />
    <KeyFollow x={want?.x ?? 0} kind={kind} />
    <Cells />
    <Plastid cut={want?.cut ?? true} />
    <group position={MAC}><MacroWorld /></group>
    <hemisphereLight args={['#cfe6d0', '#101a12', 0.3]} />
  </group>
}
/** 工作灯单独放一层：只有它跟着课次变 */
function KeyFollow({ x, kind }: { x: number; kind: Kind }) { return <Key x={x} kind={kind} /> }
export const World = memo(WorldInner)
