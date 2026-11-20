// 水循环实验室的大场景：一个从海洋到雪山的流域，做成一块切开的地块。左边是海，中间是平原和城市，右边是山地、森林和雪峰；
// 一条河从雪山流到海。靠近镜头的一面是剖面，能看到土层和含水层。整个实验室只有这一个世界，换课时镜头在里面飞。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CityKey, LinkKey } from './physics'

export const X0 = -40, X1 = 40, ZH = 12, COAST = -21
type V3 = [number, number, number]
/** 这一课对流域的要求：亮哪些环节、有没有水库、城市什么样、哪里在下雨、森林还在不在、引水渠开没开、河里的水有多大（1 是平常） */
export interface Want { links?: LinkKey[]; dam?: boolean; city?: CityKey; rain?: ('land' | 'sea' | 'city')[]; forest?: boolean; canal?: boolean; flow?: number; flood?: number }

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }
/** 河道中线的 z */
export const riverZ = (x: number) => 1.6 * Math.sin(x * 0.16)
/** 地面的高度：海底、海岸、缓缓抬升的平原、山地；河道处刻下去一条谷 */
export function ground(x: number, z: number) {
  const coast = smooth((x + 25) / 5), hill = smooth((x - 5) / 31)
  let h = -2.6 + 3.0 * coast + Math.max(0, x - COAST) * 0.046 + 13.5 * hill ** 1.6
  h += (Math.sin(x * 0.7 + z * 0.9) + Math.sin(x * 1.3 - z * 0.55) * 0.6) * (0.06 + 0.75 * hill)
  if (x > COAST - 1) { const d = z - riverZ(x); h -= (0.28 + 2.4 * hill) * Math.exp(-(d * d) / (1.4 + 5 * hill)) }
  return h
}
const onLand = (x: number, z: number, up = 0.1): V3 => [x, ground(x, z) + up, z]

/** 各个环节走的路线（一串点），场景里的箭头和标签都从这里取 */
export const PATHS: Record<LinkKey, V3[]> = {
  evap: [[-33, 0.3, 3], [-33.6, 4, 2.5], [-32.6, 8, 2], [-32, 11.5, 1.5]],
  move: [[-28, 13.2, 1], [-14, 14.6, 0.5], [0, 15.4, 0], [12, 16, 0]],
  rain: [[17, 15, 2], [17.4, 11, 2.2], [17.2, 8.4, 2.4]],
  runoff: [20, 14, 8, 2, -4, -10, -16, -20.5].map(x => onLand(x, riverZ(x), 0.35)),
  seep: [[-1, ground(-1, 11.6) + 0.1, 11.9], [-1.2, 0, 12.25], [-1, -1.6, 12.25]],
  under: [[2, -1.9, 12.25], [-6, -2.1, 12.25], [-14, -2.0, 12.25], [-21, -1.5, 12.25]],
  landEvap: [[13, ground(13, 6) + 1.2, 6], [12.4, 8, 5], [13.4, 11.5, 4], [14, 14.5, 3]],
  seaRain: [[-27, 11.2, -3], [-27.3, 6, -3], [-27, 0.4, -3]],
}
export const pathMid = (k: LinkKey): V3 => { const p = PATHS[k]; return p[Math.floor(p.length / 2)] }

function Terrain() {
  const geo = useMemo(() => {
    const NX = 200, NZ = 60, g = new THREE.PlaneGeometry(X1 - X0, ZH * 2, NX, NZ); g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = ground(x, z); pos.setY(i, h)
      const k = Math.sin(x * 3.1 + z * 2.3) * 0.5 + 0.5
      if (h < 0.15) c.set('#d9c79a')                                         // 海底和沙滩
      else if (h < 2.2) c.set('#8fae5c').lerp(new THREE.Color('#b3bd6a'), k * 0.5)      // 平原
      else if (h < 8.5) c.set('#4f7d45').lerp(new THREE.Color('#6b8a52'), k * 0.6)      // 山坡
      else if (h < 10.8) c.set('#7d7a72').lerp(new THREE.Color('#948f86'), k)           // 岩石
      else c.set('#f4f7fa')                                                  // 雪和冰川
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals()
    return g
  }, [])
  // 靠近镜头的剖面：土层、含水层、基岩三层
  const cut = useMemo(() => {
    const layer = (top: (x: number) => number, bottom: (x: number) => number) => {
      const s = new THREE.Shape(); let first = true
      for (let x = X0; x <= X1 + 0.01; x += 0.5) { const y = top(x); if (first) { s.moveTo(x, y); first = false } else s.lineTo(x, y) }
      for (let x = X1; x >= X0 - 0.01; x -= 0.5) s.lineTo(x, bottom(x))
      return new THREE.ShapeGeometry(s)
    }
    const top = (x: number) => ground(x, ZH), table = (x: number) => Math.min(top(x) - 0.5, -0.9 + Math.max(0, x - COAST) * 0.08)
    return { soil: layer(top, table), water: layer(table, () => -4.2), rock: layer(() => -4.2, () => -6.5) }
  }, [])
  return (
    <group>
      <mesh geometry={geo} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
      <mesh geometry={cut.soil} position={[0, 0, ZH]}><meshStandardMaterial color="#8a6f4e" roughness={1} /></mesh>
      <mesh geometry={cut.water} position={[0, 0, ZH]}><meshStandardMaterial color="#5d8fb0" roughness={0.8} /></mesh>
      <mesh geometry={cut.rock} position={[0, 0, ZH]}><meshStandardMaterial color="#4c4a48" roughness={1} /></mesh>
      <mesh position={[0, -6.6, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[X1 - X0, ZH * 2]} /><meshStandardMaterial color="#3a3836" /></mesh>
      {/* 海：海面，和剖面上看到的那一片海水 */}
      <mesh position={[(X0 + COAST) / 2 + 0.6, 0, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[COAST - X0 + 1.2, ZH * 2]} /><meshStandardMaterial color="#2f7fb8" transparent opacity={0.82} roughness={0.15} metalness={0.1} /></mesh>
      <mesh position={[(X0 + COAST) / 2, -1.3, ZH + 0.03]}><planeGeometry args={[COAST - X0, 2.6]} /><meshStandardMaterial color="#2a6fa3" transparent opacity={0.6} /></mesh>
    </group>
  )
}

/** 河：一条贴着谷底的水带；flow 越大越宽 */
function River({ flow = 1 }: { flow?: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let x = 33; x >= COAST - 0.6; x -= 1) pts.push(new THREE.Vector3(x, ground(x, riverZ(x)) + 0.12, riverZ(x)))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.34, 8)
  }, [])
  const w = 0.6 + 0.4 * flow
  return <mesh geometry={geo} scale={[1, 1, w]}><meshStandardMaterial color="#3d93d6" roughness={0.2} metalness={0.1} /></mesh>
}

/** 山坡上的森林：几百棵圆锥形的树 */
function Forest() {
  const mesh = useMemo(() => {
    const spots: V3[] = []
    for (let i = 0; i < 900; i++) {
      const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12543.123, x = 6.5 + (a - Math.floor(a)) * 19, z = -ZH + 0.6 + (b - Math.floor(b)) * (ZH * 2 - 1.2), h = ground(x, z)
      if (h > 1.9 && h < 8.6 && Math.abs(z - riverZ(x)) > 1.3) spots.push([x, h, z])
    }
    const m = new THREE.InstancedMesh(new THREE.ConeGeometry(0.34, 1.15, 6), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), spots.length), mat = new THREE.Matrix4(), col = new THREE.Color()
    spots.forEach(([x, y, z], i) => { const s = 0.8 + ((i * 7) % 5) * 0.09; mat.makeScale(s, s, s).setPosition(x, y + 0.55 * s, z); m.setMatrixAt(i, mat); m.setColorAt(i, col.setHSL(0.33, 0.45, 0.2 + (i % 4) * 0.025)) })
    m.castShadow = true
    return m
  }, [])
  return <primitive object={mesh} />
}

/** 平原上的城市。开发前是农田和几间房；硬化后满是楼；海绵改造后楼顶和街边添了绿地、蓄水池 */
function City({ kind = 'hard' }: { kind?: CityKey }) {
  const { blocks, fields } = useMemo(() => {
    const blocks: { p: V3; s: V3; c: string }[] = [], fields: { p: V3; s: V3; c: string }[] = []
    let n = 0
    for (let x = -17; x <= -7; x += 1.25) for (const z of [-9, -7.4, -5.8, -4.2, 4.4, 6, 7.6, 9.2]) {
      n++; const k = Math.sin(n * 91.7) * 0.5 + 0.5, y = ground(x, z)
      if (kind === 'before') { if (n % 9 === 0) blocks.push({ p: [x, y + 0.2, z], s: [0.5, 0.4, 0.5], c: '#c9b79a' }); else fields.push({ p: [x, y + 0.03, z], s: [1.15, 0.05, 1.45], c: n % 2 ? '#a9bf5e' : '#c8c26a' }); continue }
      if (kind === 'sponge' && n % 4 === 0) { fields.push({ p: [x, y + 0.04, z], s: [1.1, 0.07, 1.4], c: n % 8 === 0 ? '#5aa7d6' : '#6fae5a' }); continue }
      const h = 0.6 + k * 1.9
      blocks.push({ p: [x, y + h / 2, z], s: [0.8, h, 1.05], c: k > 0.5 ? '#b9bec4' : '#9aa1a8' })
      if (kind === 'sponge') fields.push({ p: [x, y + h + 0.03, z], s: [0.7, 0.05, 0.95], c: '#7cb86a' })
      fields.push({ p: [x, y + 0.02, z], s: [1.2, 0.03, 1.55], c: '#6f7378' })
    }
    return { blocks, fields }
  }, [kind])
  return <group>{[...fields, ...blocks].map((b, i) => <mesh key={i} position={b.p} castShadow><boxGeometry args={b.s} /><meshStandardMaterial color={b.c} roughness={0.85} /></mesh>)}</group>
}

/** 一朵云：几团球攒在一起 */
function Cloud({ position, s = 1, dark = false }: { position: V3; s?: number; dark?: boolean }) {
  return (
    <group position={position} scale={s}>
      {[[0, 0, 0, 1.7], [1.9, -0.2, 0.3, 1.3], [-1.9, -0.25, -0.2, 1.25], [0.8, 0.7, -0.4, 1.2], [-0.9, 0.6, 0.5, 1.1], [3.2, -0.5, 0, 0.9], [-3.1, -0.5, 0.2, 0.85]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}><sphereGeometry args={[r, 14, 10]} /><meshStandardMaterial color={dark ? '#aab4bf' : '#ffffff'} roughness={1} /></mesh>
      ))}
    </group>
  )
}

/** 一片正在下的雨：细细的雨丝从 top 落到地面 */
function Rain({ x, z, w, d, top }: { x: number; z: number; w: number; d: number; top: number }) {
  const ref = useRef<THREE.Group>(null)
  const drops = useMemo(() => Array.from({ length: 70 }, (_, i) => { const a = Math.sin(i * 12.9898) * 43758.5, b = Math.sin(i * 78.233) * 12543.1; return { dx: (a - Math.floor(a) - 0.5) * w, dz: (b - Math.floor(b) - 0.5) * d, ph: (i * 0.37) % 1 } }), [w, d])
  useFrame(({ clock }) => {
    ref.current?.children.forEach((m, i) => { const q = drops[i], px = x + q.dx, pz = z + q.dz, g = Math.max(0.1, ground(px, pz)), k = (clock.elapsedTime * 1.1 + q.ph) % 1; m.position.set(px, top - (top - g) * k, pz) })
  })
  return <group ref={ref}>{drops.map((_, i) => <mesh key={i}><boxGeometry args={[0.035, 0.55, 0.035]} /><meshBasicMaterial color="#bfe3ff" transparent opacity={0.75} toneMapped={false} /></mesh>)}</group>
}

/** 一个环节：沿路线一个接一个往前走的小球，路线本身画成一条淡淡的线 */
function Flow({ k }: { k: LinkKey }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(PATHS[k].map(p => new THREE.Vector3(...p))), [k])
  const line = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.07, 6), [curve])
  const ref = useRef<THREE.Group>(null), n = Math.max(6, Math.round(curve.getLength() / 1.6)), v = useMemo(() => new THREE.Vector3(), [])
  const color = k === 'runoff' || k === 'under' || k === 'seep' ? '#8fd0ff' : k === 'rain' || k === 'seaRain' ? '#bfe3ff' : '#ffffff'
  useFrame(({ clock }) => { ref.current?.children.forEach((m, i) => { curve.getPointAt((clock.elapsedTime * 0.22 + i / n) % 1, v); m.position.copy(v) }) })
  return (
    <group>
      <mesh geometry={line}><meshBasicMaterial color={color} transparent opacity={0.3} toneMapped={false} /></mesh>
      <group ref={ref}>{Array.from({ length: n }, (_, i) => <mesh key={i}><sphereGeometry args={[0.22, 10, 8]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>)}</group>
    </group>
  )
}

export function World({ want = {} }: { want?: Want }) {
  const rain = want.rain ?? [], dx = 9.5, dz = riverZ(dx), dy = ground(dx, dz)
  return (
    <group>
      <Terrain />
      <River flow={want.flow ?? 1} />
      {want.forest !== false && <Forest />}
      <City kind={want.city ?? 'hard'} />
      <Cloud position={[-30, 13, 0]} s={1.15} dark={rain.includes('sea')} />
      <Cloud position={[16, 17.2, 1]} s={1.3} dark={rain.includes('land')} />
      {rain.includes('city') && <Cloud position={[-12, 9.5, 0]} s={1.25} dark />}
      {rain.includes('land') && <Rain x={16.5} z={1} w={9} d={12} top={15.6} />}
      {rain.includes('sea') && <Rain x={-29} z={0} w={7} d={10} top={11.6} />}
      {rain.includes('city') && <Rain x={-12} z={0} w={11} d={18} top={8.2} />}
      {(want.links ?? []).map(k => <Flow key={k} k={k} />)}
      {/* 水库：一道坝拦住河谷，坝后蓄起一片水 */}
      {want.dam && <>
        <mesh position={[dx, dy + 1.3, dz]} castShadow><boxGeometry args={[0.7, 3.4, 7.5]} /><meshStandardMaterial color="#c9c7bf" roughness={0.8} /></mesh>
        <mesh position={[dx + 4.2, dy + 2.55, dz]} rotation-x={-Math.PI / 2}><planeGeometry args={[8, 11]} /><meshStandardMaterial color="#3d93d6" transparent opacity={0.85} roughness={0.15} /></mesh>
      </>}
      {/* 引水渠：从河的中游引一条渠，翻到背面的另一个流域去 */}
      {want.canal && <mesh position={[1, ground(1, -5) + 0.25, -5.6]}><boxGeometry args={[0.7, 0.3, 13]} /><meshStandardMaterial color="#49a3e6" roughness={0.2} /></mesh>}
      {/* 内涝：城里积起一层水 */}
      {(want.flood ?? 0) > 0.02 && <mesh position={[-12, ground(-12, 6) + 0.05 + 0.3 * (want.flood ?? 0), 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[12.5, 19.5]} /><meshStandardMaterial color="#5a8fb5" transparent opacity={0.7} roughness={0.2} /></mesh>}
    </group>
  )
}
