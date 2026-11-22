// 屋外的东西：观测场（百叶箱、风杯、雨量筒），和从山脚到雪线上的六处现象：露和雾、晾着的湿衣服、溪边消融的冰雪、
// 结冰的小湖、冻硬的衣服、落了霜的百叶箱。还有水循环里从湖面到云、到雨雪、再流回湖里的一圈水。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, Painted, Rod, lathe, mergeParts, useRipple, type Part } from '@/lab-kit'
import { Motes, softDot } from './fx'
import { LAKE, SITE, ground } from './world'

type V3 = [number, number, number]
const TAU = Math.PI * 2
const frac = (x: number) => x - Math.floor(x)
const rnd = (i: number, k: number) => frac(Math.sin(i * 91.7 + k * 271.3) * 43758.5453)

/** 一块不规则的石头或雪堆：一个球，每个顶点往里往外挪一点 */
function lump(sx: number, sy: number, sz: number, seed: number, rough = 0.22) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, seen = new Map<string, number>()
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`
    if (!seen.has(key)) seen.set(key, 1 - rough / 2 + rnd(seen.size + seed * 50, 1) * rough)
    const k = seen.get(key)!
    p.setXYZ(i, p.getX(i) * k * sx, Math.max(-0.2 * sy, p.getY(i) * k * sy), p.getZ(i) * k * sz)
  }
  g.computeVertexNormals()
  return g
}
/** 一件衣服的样子：短袖衫或者一条毛巾，薄薄一片，带一点圆边 */
function cloth(kind: 'shirt' | 'towel') {
  const s = new THREE.Shape()
  if (kind === 'towel') { s.moveTo(-1.5, 0); s.lineTo(1.5, 0); s.lineTo(1.5, -4.2); s.lineTo(-1.5, -4.2); s.closePath() }
  else { s.moveTo(-0.7, 0); s.quadraticCurveTo(0, -0.5, 0.7, 0); s.lineTo(2.5, -0.7); s.lineTo(2.1, -1.9); s.lineTo(1.45, -1.55); s.lineTo(1.5, -4.6); s.lineTo(-1.5, -4.6); s.lineTo(-1.45, -1.55); s.lineTo(-2.1, -1.9); s.lineTo(-2.5, -0.7); s.closePath() }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10, steps: 1 })
  g.translate(0, 0, -0.025)
  return g
}
const SHIRT = cloth('shirt'), TOWEL = cloth('towel')
const PEG = new THREE.BoxGeometry(0.12, 0.42, 0.14)

/** 晾衣绳：两根木桩、一根下垂的绳、三件衣服。stiff：冻硬了（颜色发白、僵直地斜着，不随风摆） */
function Line({ stiff = false }: { stiff?: boolean }) {
  const sway = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { sway.current?.children.forEach((c, i) => { c.rotation.x = stiff ? [0.22, -0.16, 0.3][i] : Math.sin(clock.elapsedTime * 1.3 + i * 1.7) * 0.07 }) })
  const rope = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-7, 8.9, 0], [-3.5, 8.45, 0], [0, 8.3, 0], [3.5, 8.45, 0], [7, 8.9, 0]].map(p => new THREE.Vector3(...p))), 30, 0.04, 6), [])
  const tones = stiff ? ['#b9cfe0', '#d6dde4', '#c3d3df'] : ['#3f79b8', '#e2c15a', '#c2553f']
  return <group>
    {[-7, 7].map(x => <group key={x} position={[x, 0, 0]}>
      <mesh position-y={4.6} castShadow><cylinderGeometry args={[0.16, 0.2, 9.2, 10]} /><meshStandardMaterial color="#6b5137" roughness={0.9} /></mesh>
      <mesh position-y={8.9} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.07, 0.07, 1.1, 8]} /><meshStandardMaterial color="#5a4330" roughness={0.9} /></mesh>
    </group>)}
    <mesh geometry={rope}><meshStandardMaterial color="#d9d2bd" roughness={1} /></mesh>
    <group ref={sway}>{[-3.6, 0.1, 3.7].map((x, i) => <group key={x} position={[x, 8.36 + Math.abs(x) * 0.02, 0]}>
      <mesh geometry={i === 1 ? TOWEL : SHIRT} castShadow><meshStandardMaterial color={tones[i]} roughness={stiff ? 0.35 : 0.95} side={THREE.DoubleSide} /></mesh>
      {[-1, 1].map(s => <mesh key={s} geometry={PEG} position={[s * (i === 1 ? 1.1 : 0.55), 0.02, 0]}><meshStandardMaterial color="#c9a36a" roughness={0.8} /></mesh>)}
      {stiff && [-0.9, 0.2, 1.1].map(dx => <mesh key={dx} position={[dx, i === 1 ? -4.4 : -4.8, 0]} rotation-x={Math.PI}><coneGeometry args={[0.07, 0.5, 6]} /><meshPhysicalMaterial color="#dff0f8" transparent opacity={0.8} roughness={0.1} clearcoat={1} /></mesh>)}
      <Motes at={[0, -2.4, 0.2]} r={1.3} rate={0.9} h={3.2} size={0.06} color={stiff ? '#eaf6ff' : '#bfe3ff'} n={12} />
    </group>)}</group>
  </group>
}

const SCREEN = (() => {
  const b: Part[] = [], white = '#e9ebe6'
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.push({ p: [sx * 1.3, 3.6, sz * 1.0], s: [0.16, 7.2, 0.16], c: white })
  for (const y of [2.4, 5.2]) { b.push({ p: [0, y, 1.0], s: [2.6, 0.1, 0.1], c: white }, { p: [0, y, -1.0], s: [2.6, 0.1, 0.1], c: white }) }
  b.push({ p: [0, 7.25, 0], s: [3.4, 0.14, 2.9], c: white })
  for (let i = 0; i < 9; i++) { const y = 7.5 + i * 0.26; for (const sz of [-1, 1]) b.push({ p: [0, y, sz * 1.3], s: [3.1, 0.05, 0.3], c: white, r: [sz * 0.7, 0, 0] }); for (const sx of [-1, 1]) b.push({ p: [sx * 1.6, y, 0], s: [0.3, 0.05, 2.5], c: white, r: [0, 0, -sx * 0.7] }) }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.push({ p: [sx * 1.62, 8.6, sz * 1.34], s: [0.14, 2.5, 0.14], c: white })
  b.push({ p: [0, 9.95, 0], s: [3.9, 0.14, 3.4], c: white, r: [0.07, 0, 0] })
  return mergeParts(b)
})()
/** 百叶箱：四条腿、四面百叶、一块斜顶。frost：顶上和百叶上落了霜 */
function Screen({ frost = false }: { frost?: boolean }) {
  const ice = useMemo(() => Array.from({ length: 170 }, (_, i) => ({ p: [(rnd(i, 1) - 0.5) * 3.7, rnd(i, 2) < 0.45 ? 10.08 + (rnd(i, 1) - 0.5) * -0.0 : 7.45 + rnd(i, 3) * 2.4, rnd(i, 2) < 0.45 ? (rnd(i, 4) - 0.5) * 3.2 : 1.5] as V3, s: 0.05 + rnd(i, 5) * 0.09, r: rnd(i, 6) * 3 })), [])
  return <group>
    <mesh geometry={SCREEN} castShadow receiveShadow><Painted rough={0.6} metal={0} /></mesh>
    {frost && <>
      <mesh position={[0, 10.06, 0]} rotation-x={0.07}><boxGeometry args={[3.94, 0.1, 3.44]} /><meshStandardMaterial color="#f6fafc" roughness={1} /></mesh>
      {ice.map((c, i) => <mesh key={i} position={c.p} rotation={[c.r, c.r * 2, c.r * 0.7]} scale={[c.s, c.s * 2.2, c.s]}><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#f8fbfd" roughness={0.4} emissive="#aebccc" emissiveIntensity={0.55} flatShading /></mesh>)}
    </>}
  </group>
}

/** 草地上的一片草和几片宽叶子，叶尖挂着露珠；后面是贴着地面的雾 */
function Dew() {
  const blades = useMemo(() => mergeParts(Array.from({ length: 230 }, (_, i) => { const a = rnd(i, 1) * TAU, r = Math.sqrt(rnd(i, 2)) * 6.5, h = 0.5 + rnd(i, 3) * 0.9; return { p: [Math.cos(a) * r, h / 2, Math.sin(a) * r * 0.7], s: [0.07, h, 0.02], c: rnd(i, 4) < 0.5 ? '#5f8a3a' : '#7a9a45', r: [(rnd(i, 5) - 0.5) * 0.5, rnd(i, 6) * 3, (rnd(i, 7) - 0.5) * 0.5] } as Part })), [])
  const drops = useMemo(() => Array.from({ length: 90 }, (_, i) => { const a = rnd(i, 1) * TAU, r = Math.sqrt(rnd(i, 2)) * 6.5, h = 0.5 + rnd(i, 3) * 0.9; return { p: [Math.cos(a) * r, h + 0.03, Math.sin(a) * r * 0.7] as V3, s: 0.05 + rnd(i, 8) * 0.05 } }), [])
  const leaves = [[-1.6, 0.2, 1.2, 0.5], [0.4, 0.3, 1.6, -0.4], [2.2, 0.25, 0.9, 1.1], [-0.4, 0.5, 0.4, 2.2], [1.2, 0.6, 0.2, -1.3]]
  return <group>
    <mesh geometry={blades}><Painted rough={0.8} metal={0} /></mesh>
    {leaves.map(([x, y, z, ry], i) => <group key={i} position={[x, y + 0.3, z]} rotation={[0.25, ry, 0.15]}>
      <mesh scale={[1.1, 0.05, 0.42]} castShadow><sphereGeometry args={[1, 20, 10]} /><meshStandardMaterial color="#4f8236" roughness={0.6} /></mesh>
      {[-0.6, -0.1, 0.45, 0.8].map((dx, k) => <mesh key={k} position={[dx, 0.09, (k % 2 - 0.5) * 0.3]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.1 + (k % 3) * 0.03, 16, 12]} /><meshPhysicalMaterial color="#9fd0ee" transparent opacity={0.65} roughness={0.02} clearcoat={1} envMapIntensity={2.5} /></mesh>)}
    </group>)}
    {drops.map((d, i) => <mesh key={i} position={d.p}><sphereGeometry args={[d.s * 0.8, 10, 8]} /><meshPhysicalMaterial color="#9fd0ee" transparent opacity={0.7} roughness={0.03} clearcoat={1} envMapIntensity={2.5} /></mesh>)}
    <Drift at={[0, 2.2, -9]} w={26} n={14} size={11} dense={0.34} />
  </group>
}
/** 贴着地面慢慢飘的雾 */
function Drift({ at, w, n, size, dense }: { at: V3; w: number; n: number; size: number; dense: number }) {
  const g = useRef<THREE.Group>(null), map = useMemo(softDot, [])
  useFrame(({ clock }) => { g.current?.children.forEach((s, i) => { const p = frac(clock.elapsedTime * 0.012 * (0.6 + rnd(i, 1)) + rnd(i, 2)); s.position.set((p - 0.5) * w, (rnd(i, 3) - 0.5) * size * 0.35, (rnd(i, 4) - 0.5) * 7); ((s as THREE.Sprite).material as THREE.SpriteMaterial).opacity = dense * Math.sin(p * Math.PI) }) })
  return <group ref={g} position={at}>{Array.from({ length: n }, (_, i) => <sprite key={i} scale={[size * (0.8 + rnd(i, 5) * 0.6), size * 0.5, 1]}><spriteMaterial map={map} color="#eef3f6" transparent opacity={0} depthWrite={false} /></sprite>)}</group>
}

/** 溪边：大石头上压着残雪，石檐下挂着冰凌，一滴滴往下滴水；雪水汇成一条小溪 */
function Thaw() {
  const G = useMemo(() => ({ a: lump(3.2, 2.6, 2.4, 1), b: lump(2.2, 1.6, 2.0, 2), c: lump(1.3, 0.9, 1.2, 3), s1: lump(2.9, 0.8, 2.2, 4, 0.12), s2: lump(2.0, 0.55, 1.8, 5, 0.12), s3: lump(3.4, 0.5, 2.4, 6, 0.1) }), [])
  const drips = useRef<THREE.Group>(null), ripple = useRipple([1, 3], 0.05)
  const ICI: [number, number][] = [[-1.5, 1.5], [-0.9, 2.2], [-0.3, 1.2], [0.3, 2.6], [0.9, 1.6], [1.5, 2.0], [2.0, 1.1]]
  useFrame(({ clock }) => { drips.current?.children.forEach((m, i) => { const p = frac(clock.elapsedTime * 0.55 + i * 0.37); m.position.y = 3.6 - ICI[i][1] - p * p * (3.4 - ICI[i][1]); m.scale.setScalar(p < 0.08 ? p / 0.08 : 1) }) })
  const rockM = <meshStandardMaterial color="#6f7378" roughness={0.95} flatShading />, snowM = <meshStandardMaterial color="#eef3f6" roughness={0.9} />
  return <group>
    <mesh geometry={G.a} position={[-2.6, 1.4, -1.2]} castShadow receiveShadow>{rockM}</mesh>
    <mesh geometry={G.b} position={[3.4, 0.8, -0.6]} castShadow receiveShadow>{rockM}</mesh>
    <mesh geometry={G.c} position={[1.4, 0.3, 2.6]} castShadow>{rockM}</mesh>
    <mesh geometry={G.s1} position={[-2.6, 3.9, -1.2]} castShadow>{snowM}</mesh>
    <mesh geometry={G.s2} position={[3.4, 2.3, -0.6]} castShadow>{snowM}</mesh>
    <mesh geometry={G.s3} position={[-6, 0.2, 1]}>{snowM}</mesh><mesh geometry={G.s2} position={[7, 0.15, -2]}>{snowM}</mesh>
    {/* 石檐：伸出来的一块石板，冰凌挂在它下面 */}
    <mesh position={[0.3, 3.75, 0.2]} rotation-z={-0.05} castShadow><boxGeometry args={[4.6, 0.36, 1.7]} />{rockM}</mesh>
    <mesh position={[0.3, 4.05, 0.2]} rotation-z={-0.05} scale={[2.4, 0.22, 0.95]}><sphereGeometry args={[1, 20, 10]} />{snowM}</mesh>
    {ICI.map(([x, l], i) => <mesh key={i} position={[x + 0.3, 3.58 - l / 2, 0.75]} rotation-x={Math.PI} renderOrder={3}><coneGeometry args={[0.13, l, 8]} /><meshPhysicalMaterial color="#cfe9f6" transparent opacity={0.8} roughness={0.06} clearcoat={1} envMapIntensity={2} /></mesh>)}
    <group ref={drips}>{ICI.map(([x], i) => <mesh key={i} position={[x + 0.3, 0, 0.75]}><sphereGeometry args={[0.07, 10, 8]} /><meshPhysicalMaterial color="#bfe4ff" roughness={0.05} clearcoat={1} /></mesh>)}</group>
    {/* 雪水汇成的小溪 */}
    <mesh rotation-x={-Math.PI / 2} position={[0.6, 0.06, 4.6]}><planeGeometry args={[3.2, 9]} /><meshPhysicalMaterial color="#4f8fb8" transparent opacity={0.85} roughness={0.12} normalMap={ripple} normalScale={new THREE.Vector2(0.25, 0.25)} envMapIntensity={1.5} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0.4, 0.05, 0.8]}><circleGeometry args={[2.3, 28]} /><meshPhysicalMaterial color="#4f8fb8" transparent opacity={0.85} roughness={0.12} normalMap={ripple} normalScale={new THREE.Vector2(0.25, 0.25)} /></mesh>
  </group>
}

/** 结冰的小湖：湖面大半已经冻住，冰面从岸边往湖心长，湖心还留着一片水 */
function Pond() {
  const ripple = useRipple(3, 0.02)
  const ice = useMemo(() => {
    const s = new THREE.Shape(); for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, r = 9.6 + Math.sin(a * 5) * 0.3; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.75); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.75) }
    const h = new THREE.Path(); for (let i = 0; i <= 28; i++) { const a = -i / 28 * TAU, r = 3.4 + Math.sin(a * 3 + 1) * 0.7 + Math.sin(a * 7) * 0.25; if (i) h.lineTo(1 + Math.cos(a) * r, 0.5 + Math.sin(a) * r * 0.7); else h.moveTo(1 + Math.cos(a) * r, 0.5 + Math.sin(a) * r * 0.7) }
    s.holes.push(h)
    return new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 4 }).rotateX(-Math.PI / 2)
  }, [])
  const bank = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ g: lump(2.4 + rnd(i, 1) * 1.6, 0.7 + rnd(i, 2) * 0.5, 1.8 + rnd(i, 3), i + 9, 0.12), a: i / 12 * TAU + rnd(i, 4) * 0.3 })), [])
  const floes = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { floes.current?.children.forEach((m, i) => { m.position.y = 0.1 + Math.sin(clock.elapsedTime * 0.8 + i * 2) * 0.02; m.rotation.y = Math.sin(clock.elapsedTime * 0.15 + i) * 0.2 + i }) })
  return <group>
    <mesh rotation-x={-Math.PI / 2} position-y={0.08}><circleGeometry args={[10.4, 48]} /><meshPhysicalMaterial color="#2c5f80" roughness={0.1} normalMap={ripple} normalScale={new THREE.Vector2(0.4, 0.4)} envMapIntensity={1.4} /></mesh>
    <mesh geometry={ice} position-y={0.06} receiveShadow><meshPhysicalMaterial color="#d9ebf4" roughness={0.22} clearcoat={0.8} clearcoatRoughness={0.3} envMapIntensity={1.2} /></mesh>
    <group ref={floes}>{[[0.2, 0.9, 0.9], [2.1, -0.4, 0.7], [1.2, 1.6, 0.5]].map(([x, z, s], i) => <mesh key={i} position={[x, 0.1, z]} scale={[s, 1, s]}><cylinderGeometry args={[1, 1.05, 0.1, 6]} /><meshPhysicalMaterial color="#e2f0f7" roughness={0.25} clearcoat={0.7} /></mesh>)}</group>
    {bank.map((b, i) => <mesh key={i} geometry={b.g} position={[Math.cos(b.a) * 11.6, 0.1, Math.sin(b.a) * 9.2]} castShadow><meshStandardMaterial color="#eef3f6" roughness={0.9} /></mesh>)}
    {[[-7.6, 6.4], [-8.4, 5.6], [8.2, 6.0], [-6.8, 6.9]].map(([x, z], i) => <mesh key={i} position={[x, 0.9, z]} rotation-z={(i - 1.5) * 0.08}><cylinderGeometry args={[0.02, 0.04, 1.8, 5]} /><meshStandardMaterial color="#a39256" roughness={1} /></mesh>)}
  </group>
}

/** 落雪：一片雪花在一个长方体的范围里慢慢往下落，落到底又从顶上来 */
function Snowfall({ at, size, n = 260 }: { at: V3; size: V3; n?: number }) {
  const m = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const im = m.current, t = clock.elapsedTime; if (!im) return
    for (let i = 0; i < n; i++) { const p = frac(t * (0.05 + rnd(i, 1) * 0.04) + rnd(i, 2)); o.position.set((rnd(i, 3) - 0.5) * size[0] + Math.sin(t * 0.7 + i) * 0.5, (1 - p) * size[1], (rnd(i, 4) - 0.5) * size[2]); o.scale.setScalar(0.05 + rnd(i, 5) * 0.06); o.updateMatrix(); im.setMatrixAt(i, o.matrix) }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={m} args={[undefined, undefined, n]} position={at} frustumCulled={false}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#ffffff" /></instancedMesh>
}

/** 木屋：圆木垒的墙、压着雪的斜屋顶、一扇门 */
const HUT = (() => {
  const b: Part[] = []
  for (let i = 0; i < 10; i++) { b.push({ p: [0, 0.5 + i * 0.95, 0], s: [0.5, 12.4, 0.5], c: i % 2 ? '#6b4c33' : '#7a5839', cyl: true, r: [0, 0, Math.PI / 2] }); b.push({ p: [0, 0.5 + i * 0.95, -8], s: [0.5, 12.4, 0.5], c: '#6b4c33', cyl: true, r: [0, 0, Math.PI / 2] }) }
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) b.push({ p: [s * 5.8, 0.98 + i * 0.95, -4], s: [0.5, 8.8, 0.5], c: '#73523a', cyl: true, r: [Math.PI / 2, 0, 0] })
  b.push({ p: [1.5, 3.4, 0.5], s: [2.6, 6.4, 0.16], c: '#4a3524' }, { p: [-2.6, 5.4, 0.5], s: [2.2, 2.2, 0.14], c: '#9fc3d6' })
  for (const s of [-1, 1]) { b.push({ p: [s * 3.4, 12.0, -4], s: [8.0, 0.3, 10.4], c: '#5a4330', r: [0, 0, -s * 0.62] }); b.push({ p: [s * 3.4, 12.32, -4], s: [8.1, 0.42, 10.5], c: '#eef3f6', r: [0, 0, -s * 0.62] }) }
  return mergeParts(b)
})()

/** 风杯：三只半球形的杯子绕着杆顶转 */
function Cups() {
  const g = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (g.current) g.current.rotation.y += Math.min(d, 1 / 30) * 2.4 })
  return <group>
    <mesh position-y={9} castShadow><cylinderGeometry args={[0.1, 0.14, 18, 10]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh position-y={0.15}><cylinderGeometry args={[0.7, 0.8, 0.3, 16]} /><meshStandardMaterial color="#8f9396" roughness={0.9} /></mesh>
    <group ref={g} position-y={18.1}>
      <mesh><cylinderGeometry args={[0.16, 0.16, 0.3, 12]} /><Metal kind="steel" /></mesh>
      {[0, 1, 2].map(i => <group key={i} rotation-y={i * TAU / 3}><Rod from={[0, 0, 0]} to={[1.2, 0, 0]} r={0.035}><Metal kind="steel" /></Rod><mesh position={[1.3, 0, 0]} rotation-x={Math.PI / 2}><sphereGeometry args={[0.32, 16, 10, 0, Math.PI]} /><meshStandardMaterial color="#22262a" roughness={0.5} side={THREE.DoubleSide} /></mesh></group>)}
    </group>
  </group>
}
const GAUGE = lathe([[0, 0], [0.6, 0], [0.6, 3.6], [0.66, 3.6], [0.66, 4.2], [0.6, 4.2], [0.3, 3.9], [0, 3.9]], { segs: 28 })

/** 水循环：一粒粒水沿着“湖面 → 升空 → 成云 → 落下 → 顺着河流回湖里”转圈。on：转不转 */
function Cycle({ on }: { on: boolean }) {
  const { curve, river, cloud } = useMemo(() => {
    const top: V3 = [LAKE.x + 30, 150, LAKE.z - 250], hit = (k: number): V3 => { const x = LAKE.x + 40 - k * 30 + Math.sin(k * 7) * 16, z = LAKE.z - 300 + k * 215; return [x, ground(x, z) + 0.6, z] }
    const flow = Array.from({ length: 12 }, (_, i) => hit(i / 11))
    const pts: V3[] = [[LAKE.x - 10, 2, LAKE.z + 10], [LAKE.x - 30, 60, LAKE.z - 20], [LAKE.x - 20, 120, LAKE.z - 110], top, [top[0] + 14, 100, top[2] - 30], ...flow, [LAKE.x, 1, LAKE.z - 30]]
    const strip: number[] = [], idx: number[] = []
    flow.forEach((p, i) => { const w = 3 + i * 0.5; strip.push(p[0] - w, p[1], p[2], p[0] + w, p[1], p[2]); if (i) { const a = i * 2 - 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) } })
    const river = new THREE.BufferGeometry(); river.setAttribute('position', new THREE.Float32BufferAttribute(strip, 3)); river.setIndex(idx); river.computeVertexNormals()
    const cloud = new THREE.IcosahedronGeometry(1, 2)
    return { curve: new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), true, 'catmullrom', 0.3), river, cloud }
  }, [])
  const m = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), []), v = useMemo(() => new THREE.Vector3(), []), k = useRef(0), run = useRef(0)
  const N = 110, cs = useMemo(() => ({ vapor: new THREE.Color('#ffffff'), rain: new THREE.Color('#5fb0ff'), c: new THREE.Color() }), [])
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30); run.current += ((on ? 1 : 0) - run.current) * (1 - Math.exp(-dt / 0.8)); k.current += dt * 0.03 * run.current
    const im = m.current; if (!im) return
    for (let i = 0; i < N; i++) {
      const u = frac(k.current + i / N); curve.getPointAt(u, v)
      const up = u < 0.3, a = rnd(i, 1) * TAU, j = up ? 14 : u < 0.42 ? 9 : 1.6
      o.position.set(v.x + Math.cos(a) * j * rnd(i, 2), v.y + (up ? 0 : Math.sin(a) * 0.4), v.z + Math.sin(a) * j * rnd(i, 3))
      o.scale.setScalar(run.current * (up ? 1.6 + u * 6 : 1.9) + 1e-4); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, cs.c.copy(up ? cs.vapor : cs.rain))
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true
  })
  return <group>
    <mesh geometry={river}><meshStandardMaterial color="#4f9ad0" roughness={0.3} side={THREE.DoubleSide} /></mesh>
    {[[0, 0, 0, 34], [26, 6, -10, 26], [-28, -4, 8, 24], [8, 10, 14, 22]].map(([x, y, z, s], i) => <mesh key={i} geometry={cloud} position={[LAKE.x + 30 + x, 152 + y, LAKE.z - 250 + z]} scale={[s * 1.3, s * 0.6, s]}><meshStandardMaterial color="#e6ebf0" roughness={1} emissive="#8fa3b8" emissiveIntensity={0.3} /></mesh>)}
    <instancedMesh ref={m} args={[undefined, undefined, N]} frustumCulled={false}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial transparent opacity={0.85} toneMapped={false} /></instancedMesh>
  </group>
}

const at = (s: { x: number; y: number; z: number }): V3 => [s.x, s.y, s.z]
export function Outdoors({ cycle }: { cycle: boolean }) {
  const fence = useMemo(() => { const b: Part[] = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; b.push({ p: [Math.cos(a) * 17, 1.4, Math.sin(a) * 14], s: [0.2, 2.8, 0.2], c: '#e4e1d6' }) } return mergeParts(b) }, [])
  return <group>
    {/* 观测场：一圈白栅栏，百叶箱、风杯、雨量筒 */}
    <group position={at(SITE.yard)}>
      <mesh geometry={fence} castShadow><Painted rough={0.7} metal={0} /></mesh>
      {[1.3, 2.3].map(y => <mesh key={y} position-y={y} rotation-x={Math.PI / 2} scale={[1, 14 / 17, 1]}><torusGeometry args={[17, 0.07, 6, 56]} /><meshStandardMaterial color="#e4e1d6" roughness={0.7} /></mesh>)}
      <group position={[-6, 0, 0]}><Screen /></group>
      <group position={[7, 0, -3]}><Cups /></group>
      <mesh geometry={GAUGE} position={[2, 0, 5]} castShadow><Metal kind="stainless" grain="brushed" rough={0.4} /></mesh>
    </group>
    <group position={at(SITE.dew)}><Dew /></group>
    <group position={at(SITE.dry)}><Line /><mesh position={[4.6, 0, 3]} castShadow><cylinderGeometry args={[1.3, 1.0, 1.3, 20, 1, true]} /><meshStandardMaterial color="#b08a56" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>
    <group position={at(SITE.thaw)}><Thaw /></group>
    <group position={at(SITE.pond)}><Pond /></group>
    <group position={at(SITE.stiff)}><Line stiff /><mesh geometry={HUT} position={[-3, 0, -9]} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh><Snowfall at={[0, 0, 0]} size={[30, 16, 20]} n={160} /></group>
    <group position={at(SITE.frost)}><Screen frost /><Snowfall at={[0, 0, 0]} size={[26, 18, 22]} /></group>
    <Cycle on={cycle} />
  </group>
}
