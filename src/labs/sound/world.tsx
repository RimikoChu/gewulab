// 声现象实验室的大场景：一座音乐厅的舞台和它右边的后台。舞台上从左到右六张乐器箱改的工作台，各放一课的器材；
// 身后是三角钢琴、乐队的椅子和谱架、定音鼓、合唱台和大幕；最右边绕过侧幕是后台，放着一台风机。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着舞台飞过去。画面里 1 个单位是 25 cm。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, Rod, lathe, mergeParts, type Part } from '@/lab-kit'

/** 工作台台面的高度 */
export const TOP = 3
/** 各课所在的位置（x 坐标） */
export const ST = { fork: -24, jar: -12, hall: 0, ruler: 12, drum: 24, tone: 36, noise: 52 }
export type Spot = keyof typeof ST
/** 每张工作台的宽度 */
const TABLE: Record<Exclude<Spot, 'noise'>, number> = { fork: 9, jar: 7.6, hall: 10.4, ruler: 9, drum: 9, tone: 10.6 }
const DEPTH = 3
// 机位稍微偏一点、俯一点：器材看得出前后和厚薄
const VIEW: [number, number] = [-0.2, 0.24]
const at = (x: number, w: number, h: number, up: number, view = VIEW) => ({ target: new THREE.Vector3(x, TOP + up, 0), span: [w, h] as [number, number], view })
export const SPOT: Record<Spot, ReturnType<typeof at>> = {
  fork: at(ST.fork, 6.2, 4.2, 2.1), jar: at(ST.jar, 6.2, 4.4, 2.0), hall: at(ST.hall, 8.0, 3.3, 1.45), ruler: at(ST.ruler, 7.7, 4.2, 1.9),
  drum: at(ST.drum, 6.6, 4.4, 1.9), tone: at(ST.tone, 9.6, 5, 2.3), noise: at(ST.noise - 1.9, 13.4, 7.6, 0.6, [-0.16, 0.16]),
}
/** 舞台上的设置：不画天空，背景近黑，环境光调小，屏幕和声波带一点泛光 */
export const ROOM = { sky: false, backdrop: '#090708', env: 0.55, sun: 0, fog: [70, 240] as [number, number], bloom: 0.22, studio: true }

// ---------- 程序画的贴图 ----------
const rnd = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
const tex = (c: HTMLCanvasElement, rx = 1, ry = 1) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t }
/** 木纹：顺着 x 方向的细纹，四边能拼接。base 是底色，dark 是纹路的颜色（"r,g,b"） */
export function makeWood(base: string, dark: string, seed = 3, rx = 1, ry = 1) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rnd(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 150; i++) { const y = r() * S, h = 0.6 + r() * 2.4; g.fillStyle = `rgba(${dark},${0.05 + r() * 0.16})`; g.fillRect(0, y, S, h) }
  for (let i = 0; i < 26; i++) { const y = r() * S, x = r() * S, w = 30 + r() * 120; g.fillStyle = `rgba(255,240,210,${0.03 + r() * 0.05})`; g.fillRect(x, y, w, 1.5); g.fillRect(x - S, y, w, 1.5) }
  return tex(c, rx, ry)
}
/** 舞台的地板：一条条长木板，接缝错开 */
function makeFloor() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rnd(11), rows = 8, h = S / rows
  for (let j = 0; j < rows; j++) {
    const cut = Math.floor(r() * S), v = 0.82 + r() * 0.3
    for (const [x0, x1, k] of [[0, cut, v], [cut, S, 0.8 + r() * 0.32]] as const) { g.fillStyle = `rgb(${Math.round(96 * k)},${Math.round(62 * k)},${Math.round(36 * k)})`; g.fillRect(x0, j * h, x1 - x0, h) }
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(30,16,8,${0.05 + r() * 0.12})`; g.fillRect(0, j * h + r() * h, S, 0.6 + r() * 1.6) }
    g.fillStyle = 'rgba(12,6,3,0.75)'; g.fillRect(0, j * h, S, 1.6); g.fillRect(cut, j * h, 1.6, h)
  }
  return tex(c, 16, 9)
}
/** 大幕：深红的丝绒，一道道竖着的褶 */
function makeCurtain() {
  const W = 512, c = document.createElement('canvas'); c.width = W; c.height = 8
  const g = c.getContext('2d')!
  for (let x = 0; x < W; x++) { const u = x / W * Math.PI * 2, k = 0.5 + 0.5 * Math.sin(u * 11) * Math.sin(u * 3 + 1) + 0.12 * Math.sin(u * 37); g.fillStyle = `rgb(${Math.round(34 + 92 * k)},${Math.round(5 + 13 * k)},${Math.round(10 + 17 * k)})`; g.fillRect(x, 0, 1, 8) }
  return tex(c, 7, 1)
}
/** 后台的墙：刷了漆的砖 */
function makeBrick() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rnd(5)
  g.fillStyle = '#2a2d31'; g.fillRect(0, 0, S, S)
  for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { const v = 52 + r() * 22; g.fillStyle = `rgb(${v},${v + 3},${v + 8})`; g.fillRect(i * 64 + (j % 2) * 32 + 2, j * 32 + 2, 60, 28) }
  return tex(c, 9, 5)
}
/** 钢琴的键盘：白键之间的缝 */
function makeKeys() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#ece7da'; g.fillRect(0, 0, 16, 512); g.fillStyle = '#3b3833'; for (let i = 0; i <= 52; i++) g.fillRect(0, i * 512 / 52 - 0.6, 16, 1.2)
  return tex(c)
}

// ---------- 工作台：一只带轮子的乐器箱，上面盖一块胡桃木台面 ----------
function tableParts(x: number, w: number) {
  const body: Part[] = [], metal: Part[] = [], d = DEPTH, y0 = 0.5, y1 = TOP - 0.16
  body.push({ p: [x, (y0 + y1) / 2, 0], s: [w, y1 - y0, d], c: '#16171a' })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = x + sx * (w / 2 - 0.45), cz = sz * (d / 2 - 0.4)
    body.push({ p: [cx, 0.2, cz], s: [0.2, 0.16, 0.2], c: '#0c0c0d', cyl: true, r: [Math.PI / 2, 0, 0] })           // 轮子
    metal.push({ p: [cx, 0.44, cz], s: [0.34, 0.12, 0.3], c: '#888' }, { p: [cx, 0.3, cz + 0.11], s: [0.05, 0.3, 0.03], c: '#888' }, { p: [cx, 0.3, cz - 0.11], s: [0.05, 0.3, 0.03], c: '#888' })
    metal.push({ p: [x + sx * (w / 2), (y0 + y1) / 2, sz * (d / 2)], s: [0.11, y1 - y0 + 0.02, 0.11], c: '#888' })       // 四条竖着的包角铝条
  }
  for (const sz of [-1, 1]) for (const y of [y0 + 0.04, y1 - 0.04, y1 - 0.86]) metal.push({ p: [x, y, sz * (d / 2)], s: [w, y === y1 - 0.86 ? 0.05 : 0.09, 0.07], c: '#888' })
  for (const sx of [-1, 1]) for (const y of [y0 + 0.04, y1 - 0.04, y1 - 0.86]) metal.push({ p: [x + sx * (w / 2), y, 0], s: [0.07, y === y1 - 0.86 ? 0.05 : 0.09, d], c: '#888' })
  // 正面两只蝶形锁扣和一只提手
  for (const sx of [-1, 1]) { metal.push({ p: [x + sx * w * 0.28, y1 - 0.86, d / 2 + 0.03], s: [0.34, 0.4, 0.04], c: '#888' }); body.push({ p: [x + sx * w * 0.28, y1 - 0.86, d / 2 + 0.05], s: [0.2, 0.12, 0.05], c: '#0c0c0d' }) }
  metal.push({ p: [x, y1 - 1.5, d / 2 + 0.02], s: [0.8, 0.36, 0.03], c: '#888' }); body.push({ p: [x, y1 - 1.5, d / 2 + 0.04], s: [0.56, 0.2, 0.03], c: '#0c0c0d' })
  return { body, metal }
}

// ---------- 椅子、谱架、合唱台 ----------
function chair(x: number, y: number, z: number): Part[] {
  const p: Part[] = [{ p: [x, y + 1.82, z], s: [1.6, 0.14, 1.5], c: '#5a161b' }, { p: [x, y + 2.95, z - 0.72], s: [1.6, 1.3, 0.12], c: '#5a161b' }, { p: [x, y + 1.72, z], s: [1.66, 0.08, 1.56], c: '#141416' }]
  for (const sx of [-1, 1]) { p.push({ p: [x + sx * 0.74, y + 0.86, z + 0.68], s: [0.05, 1.72, 0.05], c: '#141416', cyl: true }); p.push({ p: [x + sx * 0.74, y + 1.8, z - 0.72], s: [0.05, 3.6, 0.05], c: '#141416', cyl: true }) }
  return p
}
function stand(x: number, y: number, z: number): Part[] {
  const p: Part[] = [{ p: [x, y + 1.85, z], s: [0.045, 3.5, 0.045], c: '#101012', cyl: true }, { p: [x, y + 3.95, z + 0.06], s: [1.9, 1.3, 0.05], c: '#101012', r: [-0.3, 0, 0] }, { p: [x, y + 3.36, z + 0.3], s: [1.9, 0.05, 0.22], c: '#101012', r: [-0.3, 0, 0] }, { p: [x, y + 3.98, z + 0.1], s: [1.5, 1.0, 0.02], c: '#8f897b', r: [-0.3, 0, 0] }]
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; p.push({ p: [x + Math.cos(a) * 0.42, y + 0.3, z + Math.sin(a) * 0.42], s: [0.03, 1.05, 0.03], c: '#101012', cyl: true, r: [Math.sin(a) * 0.95, 0, -Math.cos(a) * 0.95] }) }
  return p
}

// ---------- 定音鼓：一只铜锅，上面蒙着鼓皮 ----------
const KETTLE = lathe([[0, 0], [0.5, 0.04], [0.95, 0.3], [1.25, 0.75], [1.4, 1.35], [1.42, 1.5], [0, 1.5]], { segs: 40 })
const KETTLE_HOOP = lathe([[1.4, 1.42], [1.5, 1.42], [1.5, 1.56], [1.4, 1.56]], { segs: 40, closed: true })
function Timpani({ x, z, y, s = 1 }: { x: number; z: number; y: number; s?: number }) {
  return <group position={[x, y, z]} scale={s}>
    {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + 0.4; return <Rod key={i} from={[Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45]} to={[Math.cos(a) * 0.7, 1.9, Math.sin(a) * 0.7]} r={0.05}><Metal kind="chrome" rough={0.2} env={3} /></Rod> })}
    <group position-y={1.5}>
      <mesh geometry={KETTLE} castShadow><Metal kind="copper" grain="turned" rough={0.34} env={3} /></mesh>
      <mesh geometry={KETTLE_HOOP}><Metal kind="chrome" rough={0.18} env={3} /></mesh>
      <mesh position-y={1.53} rotation-x={-Math.PI / 2}><circleGeometry args={[1.4, 40]} /><meshStandardMaterial color="#d9d2bf" roughness={0.7} /></mesh>
    </group>
  </group>
}

// ---------- 三角钢琴 ----------
function pianoShape(k = 1) {
  const s = new THREE.Shape()
  s.moveTo(0, 0); s.lineTo(3.2 * k, 0); s.bezierCurveTo(5.2 * k, 0, 5.2 * k, 3.5 * k, 8.1 * k, 3.8 * k); s.quadraticCurveTo(9.2 * k, 3.9 * k, 9.2 * k, 4.9 * k); s.lineTo(9.2 * k, 5.7 * k); s.lineTo(0, 5.7 * k); s.closePath()
  return s
}
function Piano({ x, z }: { x: number; z: number }) {
  const g = useMemo(() => {
    const flat = (geo: THREE.BufferGeometry) => { geo.rotateX(-Math.PI / 2); return geo }
    const body = flat(new THREE.ExtrudeGeometry(pianoShape(), { depth: 1.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 24 }))
    const lid = flat(new THREE.ExtrudeGeometry(pianoShape(), { depth: 0.07, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 24 }))
    lid.translate(0, 0, 5.7)                                   // 琴盖绕着靠里的那条直边掀开
    const plate = flat(new THREE.ShapeGeometry(pianoShape(0.95), 24))
    const black = mergeGeometries(Array.from({ length: 52 }, (_, i) => i).filter(i => ![2, 6].includes(i % 7)).map(i => { const b = new THREE.BoxGeometry(0.5, 0.07, 0.062); b.translate(-0.42, 0, -(i + 1) * 5.2 / 52); return b }))
    return { body, lid, plate, black }
  }, [])
  const keys = useMemo(makeKeys, [])
  const lacquer = <meshPhysicalMaterial color="#0b0b0d" roughness={0.16} metalness={0.1} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={2.2} />
  return <group position={[x, 0, z]}>
    <mesh geometry={g.body} position-y={2.6} castShadow>{lacquer}</mesh>
    <mesh geometry={g.plate} position={[0.23, 3.86, -0.14]}><Metal kind="brass" grain="cast" rough={0.5} env={2} /></mesh>
    <group position={[0, 3.95, -5.7]} rotation-x={-0.62}><mesh geometry={g.lid} castShadow>{lacquer}</mesh></group>
    <Rod from={[6.4, 3.9, -2.2]} to={[6.4, 6.05, -2.75]} r={0.04}><Metal kind="brass" rough={0.3} env={3} /></Rod>
    {/* 键盘：伸出来的键床、白键、黑键，两头的挡板 */}
    <mesh position={[-0.42, 2.82, -2.85]}><boxGeometry args={[0.9, 0.36, 5.7]} />{lacquer}</mesh>
    <mesh position={[-0.42, 3.05, -2.85]}><boxGeometry args={[0.8, 0.12, 5.2]} /><meshStandardMaterial map={keys} roughness={0.35} /></mesh>
    <mesh geometry={g.black} position={[0.14, 3.14, -0.25]}><meshStandardMaterial color="#0d0d0f" roughness={0.3} /></mesh>
    {[-0.12, -5.58].map(zz => <mesh key={zz} position={[-0.42, 3.1, zz]}><boxGeometry args={[0.9, 0.42, 0.22]} />{lacquer}</mesh>)}
    {/* 三条腿、踏板 */}
    {([[0.5, -0.5], [0.5, -5.2], [8.3, -4.7]] as const).map(([lx, lz]) => <group key={`${lx}${lz}`} position={[lx, 0, lz]}>
      <mesh position-y={1.42}><cylinderGeometry args={[0.26, 0.17, 2.4, 4]} />{lacquer}</mesh>
      <mesh position-y={0.11} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.11, 0.11, 0.12, 14]} /><Metal kind="brass" rough={0.3} env={3} /></mesh>
    </group>)}
    <mesh position={[0.55, 1.3, -2.85]}><boxGeometry args={[0.16, 2.6, 0.9]} />{lacquer}</mesh>
    {[-0.25, 0, 0.25].map(o => <mesh key={o} position={[0.25, 0.14, -2.85 + o]}><boxGeometry args={[0.55, 0.05, 0.14]} /><Metal kind="brass" rough={0.25} env={3} /></mesh>)}
    {/* 琴凳 */}
    <mesh position={[-2.3, 1.84, -2.85]} castShadow><boxGeometry args={[1.5, 0.3, 2.9]} /><meshStandardMaterial color="#1a1113" roughness={0.6} /></mesh>
    {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[-2.3 + a * 0.62, 0.85, -2.85 + b * 1.3]}><cylinderGeometry args={[0.09, 0.07, 1.7, 8]} />{lacquer}</mesh>))}
  </group>
}

/** 头顶的一盏射灯 */
function Lamp({ x, z = 0, shadow = false, power = 520 }: { x: number; z?: number; shadow?: boolean; power?: number }) {
  const aim = useMemo(() => { const o = new THREE.Object3D(); return o }, [])
  aim.position.set(x, TOP, z); aim.updateMatrixWorld()
  return <>
    <primitive object={aim} />
    <spotLight position={[x - 2, 14, z + 7.5]} target={aim} angle={0.52} penumbra={1} intensity={power} distance={40} decay={1.6} color="#fff0dc" castShadow={shadow} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
  </>
}

/** at：现在是哪一课的位置。那一处多一盏带影子的主灯 */
export function World({ at = 'fork' }: { at?: Spot }) {
  const floor = useMemo(makeFloor, []), curtain = useMemo(makeCurtain, []), brick = useMemo(makeBrick, [])
  const top = useMemo(() => makeWood('#4b3122', '18,9,4', 9, 3, 1), [])
  const geo = useMemo(() => {
    const body: Part[] = [], metal: Part[] = []
    for (const k of Object.keys(TABLE) as (keyof typeof TABLE)[]) { const t = tableParts(ST[k], TABLE[k]); body.push(...t.body); metal.push(...t.metal) }
    // 合唱台：两级台阶，从舞台左边一直到侧幕
    body.push({ p: [1.5, 0.4, -12.6], s: [83, 0.8, 6.2], c: '#2b1c14' }, { p: [1.5, 1.2, -13.9], s: [83, 0.8, 3.6], c: '#2b1c14' })
    body.push({ p: [1.5, 0.78, -9.52], s: [83, 0.06, 0.06], c: '#8a7a4a' }, { p: [1.5, 1.58, -12.12], s: [83, 0.06, 0.06], c: '#8a7a4a' })
    // 乐队的椅子和谱架：两排；给定音鼓留出位置
    for (let x = -37; x <= 40; x += 3.5) { if (x > 24.5 && x < 30.5) continue; body.push(...chair(x, 0.8, -10.9), ...stand(x + 0.2, 0, -8.4)) }
    for (let x = -35.2; x <= 40; x += 3.5) body.push(...chair(x, 1.6, -13.6), ...stand(x + 0.2, 0.8, -11.6))
    // 侧幕：一道黑色的景片，把舞台和后台隔开
    body.push({ p: [43.4, 8, -9.6], s: [0.35, 16, 11.6], c: '#0e0e10' }, { p: [43.4, 0.25, -9.6], s: [0.9, 0.5, 11.8], c: '#18181a' })
    // 后台：靠墙的器材箱、配电柜、灯架
    for (const [x, y, w, h] of [[47, 1.25, 4.2, 2.5], [47.4, 3.6, 3.2, 2.2], [57.5, 1.5, 3.4, 3], [61.4, 1.1, 3, 2.2], [61.4, 3.1, 2.4, 1.8]] as const) {
      body.push({ p: [x, y, -8.2], s: [w, h, 2.4], c: '#17181b' })
      for (const sx of [-1, 1]) metal.push({ p: [x + sx * w / 2, y, -7], s: [0.1, h, 0.1], c: '#888' })
      for (const sy of [-1, 1]) metal.push({ p: [x, y + sy * (h / 2 - 0.04), -7], s: [w, 0.09, 0.08], c: '#888' })
      for (const sx of [-1, 1]) metal.push({ p: [x + sx * w * 0.25, y, -6.97], s: [0.4, 0.46, 0.05], c: '#888' })
    }
    body.push({ p: [52.6, 3.4, -9.1], s: [2.6, 5, 0.7], c: '#3a4148' }, { p: [52.6, 3.4, -8.72], s: [2.3, 4.6, 0.04], c: '#454d55' }, { p: [53.5, 3.6, -8.68], s: [0.08, 0.5, 0.06], c: '#c9c9c9' })
    for (const y of [9.2, 9.9]) body.push({ p: [53, y, -9.2], s: [0.14, 20, 0.14], c: '#5a6066', cyl: true, r: [0, 0, Math.PI / 2] })
    // 头顶的灯光架和几只筒灯
    for (const z of [-4.2, -5]) for (const y of [15.6, 16.4]) metal.push({ p: [10, y, z], s: [0.08, 104, 0.08], c: '#888', cyl: true, r: [0, 0, Math.PI / 2] })
    for (let x = -40; x <= 60; x += 2) metal.push({ p: [x, 16, -4.6], s: [0.04, 1.15, 0.04], c: '#888', cyl: true, r: [x % 4 ? 0.75 : -0.75, 0, 0] })
    for (let x = -36; x <= 60; x += 6) body.push({ p: [x, 14.9, -4.6], s: [0.42, 0.9, 0.42], c: '#0e0e10', cyl: true, r: [0.5, 0, 0] }, { p: [x, 15.5, -4.6], s: [0.06, 0.5, 0.06], c: '#0e0e10', cyl: true })
    return { body: mergeParts(body), metal: mergeParts(metal) }
  }, [])
  return (
    <group>
      {/* 地板：上了漆的长木板 */}
      <mesh rotation-x={-Math.PI / 2} position={[10, 0, 0]} receiveShadow><planeGeometry args={[150, 60]} /><meshPhysicalMaterial map={floor} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} envMapIntensity={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[53.2, 0.012, -1]} receiveShadow><planeGeometry args={[19, 16]} /><meshStandardMaterial color="#1d1f22" roughness={0.9} /></mesh>
      <mesh geometry={geo.body} castShadow receiveShadow><Painted rough={0.55} metal={0.15} /></mesh>
      <mesh geometry={geo.metal} castShadow><Metal kind="aluminum" grain="brushed" rough={0.55} env={0.9} /></mesh>
      {(Object.keys(TABLE) as (keyof typeof TABLE)[]).map(k => <mesh key={k} position={[ST[k], TOP - 0.08, 0]} castShadow receiveShadow><boxGeometry args={[TABLE[k] + 0.14, 0.16, DEPTH + 0.14]} /><meshPhysicalMaterial map={top} roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.4} envMapIntensity={0.8} /></mesh>)}
      {/* 大幕和后台的墙 */}
      <mesh position={[1.5, 9, -15.9]}><planeGeometry args={[84, 18]} /><meshStandardMaterial map={curtain} emissiveMap={curtain} emissive="#ffffff" emissiveIntensity={0.05} roughness={1} /></mesh>
      <mesh position={[53.5, 9, -9.5]}><planeGeometry args={[20, 18]} /><meshStandardMaterial map={brick} roughness={0.9} /></mesh>
      <Piano x={-25.5} z={-3.3} />
      <Timpani x={26.2} z={-11.3} y={0.8} s={0.95} /><Timpani x={29.2} z={-11.1} y={0.8} s={0.84} />
      {/* 灯：每一处一盏顶灯；现在这一课多一盏带影子的；身后几盏暖色的灯把大幕和乐队席抹亮 */}
      {(Object.keys(ST) as Spot[]).map(k => <Lamp key={k} x={ST[k]} power={k === at ? 0 : 200} />)}
      <Lamp x={ST[at]} shadow power={at === 'noise' ? 430 : 240} />
      {[-30, -8, 14, 36].map(x => <pointLight key={x} position={[x, 5.5, -7.5]} intensity={70} distance={26} decay={1.5} color="#ffb070" />)}
      <pointLight position={[53, 7, -4]} intensity={120} distance={24} decay={1.5} color="#9fb6d8" />
    </group>
  )
}
