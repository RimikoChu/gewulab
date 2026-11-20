// 地球的运动实验室的大场景：太阳、公转轨道、一颗带经纬网的地球，以及远处的一片操场。
// 整个实验室只有这一个世界，各课在里面各占一处；换课时画布不重建，镜头飞过去。
// 太阳、地球、轨道不按真实比例画。太阳的表面是算出来的示意，不是实拍。地球表面用的是 NASA 的实拍影像。
import { useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Painted, Rod, mergeParts, type Part } from '@/lab-kit'
import { TERMS, TILT, orbitDir, spinAngle, subsolarLat } from './physics'

export const RO = 26, RE = 3.8, SUN_R = 3.6            // 轨道半径、地球半径、太阳半径（画面单位）
export const GROUND: [number, number, number] = [0, -3200, 0]   // 操场所在的位置：离太阳很远，互不照到
const RAD = Math.PI / 180

/** 地球中心在场景里的位置 */
export const earthAt = (day: number): [number, number, number] => { const [x, , z] = orbitDir(day); return [x * RO, 0, z * RO] }
/** 这一课对整个世界的要求 */
export interface Want {
  day?: number; utc?: number; tilt?: number
  /** 加亮一条纬线 */
  lat?: number
  /** 画出太阳直射的那束光和直射点 */
  ray?: boolean
  /** 给五带上色 */
  zones?: boolean
  /** 在这些日子的位置各留一根地轴的影子（比一比指向） */
  ghosts?: number[]
  /** 在地球上标出几座城市（纬度、经度） */
  cities?: { lat: number; lon: number }[]
  /** 画出黄道面和赤道面，以及两个面之间的夹角 */
  planes?: boolean
  /** 拨地球：拖过去多少小时 */
  onSpin?: (hours: number) => void
}

// ---------- 地球表面 ----------
// 实拍的地球（NASA 公有领域影像）：一张白天的颜色；另一张三个通道分别是云、海面、夜晚灯光。
// 朝太阳的一半按白天画，背着的一半只留灯光和一点底色；晨昏线故意画得比真实的窄，便于看清。
const EARTH_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const EARTH_FRAG = /* glsl */`
uniform sampler2D uDay; uniform sampler2D uAux; uniform vec3 uSun; uniform float uGrid;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
float line(float v, float every, float w) { float d = abs(fract(v / every + 0.5) - 0.5) * every; return 1.0 - smoothstep(0.0, fwidth(v) * w, d); }
void main() {
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP), S = normalize(uSun);
  vec3 day = texture2D(uDay, vUv).rgb; vec3 aux = texture2D(uAux, vUv).rgb;
  float cloud = aux.r, water = aux.g, lights = aux.b;
  float ndl = dot(N, S), lit = smoothstep(-0.05, 0.12, ndl);
  day = day * 1.35 + water * vec3(0.0, 0.035, 0.09);                       // 影像里的海偏黑，提一点蓝
  vec3 col = day * (0.05 + 1.15 * max(ndl, 0.0));
  float spec = pow(max(dot(reflect(-S, N), V), 0.0), 48.0) * water * (1.0 - cloud) * lit;
  col += vec3(1.0, 0.93, 0.8) * spec * 0.55;                                // 海面的反光
  col = mix(col, vec3(0.04 + 1.05 * max(ndl, 0.0)), cloud * cloud * 0.6);          // 云
  vec3 dark = day * vec3(0.035, 0.05, 0.085) + vec3(1.0, 0.78, 0.45) * lights * 1.25 * (1.0 - cloud * 0.6);
  col = mix(dark, col, lit);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  col += vec3(0.28, 0.52, 1.0) * rim * (0.12 + 0.75 * lit);                 // 贴着地面的一层大气
  // 经纬网：每 30° 一条细线，0° 经线粗一点
  float lon = (vUv.x - 0.5) * 360.0, lat = (vUv.y - 0.5) * 180.0;
  float g = max(line(lon, 30.0, 1.1), line(lat, 30.0, 1.1) * step(abs(lat), 75.0));
  float g0 = 1.0 - smoothstep(0.0, fwidth(lon) * 2.2, abs(lon));
  col = mix(col, vec3(1.0), uGrid * (g * 0.2 + g0 * 0.5) * (0.35 + 0.65 * lit));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
const AIR_VERT = /* glsl */`
varying vec3 vN; varying vec3 vP;
void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const AIR_FRAG = /* glsl */`
uniform vec3 uSun; varying vec3 vN; varying vec3 vP;
void main() {
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP);
  float t = clamp(-dot(N, V) / 0.378, 0.0, 1.0), edge = t * t * t;                 // 画的是背面：贴着地球轮廓最亮，往外淡到没有
  float lit = smoothstep(-0.35, 0.5, dot(-N, normalize(uSun)));
  gl_FragColor = vec4(vec3(0.3, 0.56, 1.0) * edge * (0.08 + 0.92 * lit) * 0.9, 1.0);
  #include <colorspace_fragment>
}`
function useEarthMaterials() {
  const [day, aux] = useTexture(['/assets/tex/earth_day.jpg', '/assets/tex/earth_aux.jpg'])
  return useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace; aux.colorSpace = THREE.NoColorSpace
    for (const t of [day, aux]) { t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true }
    const sun = { value: new THREE.Vector3(1, 0, 0) }
    const surface = new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: { uDay: { value: day }, uAux: { value: aux }, uSun: sun, uGrid: { value: 1 } } })
    const air = new THREE.ShaderMaterial({ vertexShader: AIR_VERT, fragmentShader: AIR_FRAG, uniforms: { uSun: sun }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    return { surface, air, sun: sun.value }
  }, [day, aux])
}
/** 五带的颜色带：热带、南北温带、南北寒带 */
function makeZones(tilt: number) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 360
  const g = c.getContext('2d')!, y = (lat: number) => (90 - lat) * 2
  const band = (a: number, b: number, color: string) => { g.fillStyle = color; g.fillRect(0, y(a), 4, y(b) - y(a)) }
  const tr = tilt, po = 90 - tilt
  if (tilt > 0.05) {
    band(90, Math.max(po, tr), 'rgba(140,200,255,0.75)'); band(-Math.max(po, tr), -90, 'rgba(140,200,255,0.75)')
    band(Math.min(tr, po), -Math.min(tr, po), 'rgba(255,150,90,0.7)')
    if (po > tr) { band(po, tr, 'rgba(150,220,140,0.6)'); band(-tr, -po, 'rgba(150,220,140,0.6)') }
  } else band(90, -90, 'rgba(150,220,140,0.45)')
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** 一条纬线：一圈细环 */
function Parallel({ lat, color, r = 0.022, opacity = 1 }: { lat: number; color: string; r?: number; opacity?: number }) {
  const R = RE * Math.cos(lat * RAD) * 1.004
  if (R < 0.05) return null
  return <mesh position={[0, RE * Math.sin(lat * RAD) * 1.004, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[R, r, 8, 120]} /><meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} /></mesh>
}
/** 地轴：穿过南北极的一根细杆，北极那头有个红尖 */
function Axis({ faint = false }: { faint?: boolean }) {
  return (
    <group>
      <mesh><cylinderGeometry args={[0.035, 0.035, RE * 2.9, 10]} /><meshBasicMaterial color="#f3f1ea" transparent opacity={faint ? 0.45 : 0.95} toneMapped={false} /></mesh>
      <mesh position={[0, RE * 1.45 + 0.16, 0]}><coneGeometry args={[0.13, 0.36, 12]} /><meshBasicMaterial color="#ff6b4a" transparent opacity={faint ? 0.6 : 1} toneMapped={false} /></mesh>
    </group>
  )
}

/** 过球心的一个平面：一张半透明的圆片加一圈边 */
function Plane({ r, color }: { r: number; color: string }) {
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh raycast={() => null}><ringGeometry args={[RE * 1.005, r, 96]} /><meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
      <mesh raycast={() => null}><torusGeometry args={[r, 0.03, 8, 120]} /><meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} /></mesh>
    </group>
  )
}

function Earth({ want }: { want: Want }) {
  const day = want.day ?? 0, utc = want.utc ?? 4, tilt = want.tilt ?? TILT
  const mat = useEarthMaterials()
  const zoneTex = useMemo(() => makeZones(tilt), [tilt])
  const controls = useThree(s => s.controls) as { enabled: boolean } | null
  const drag = useRef<number | null>(null)
  const spin = want.onSpin
  const hand = spin ? {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = e.nativeEvent.clientX; if (controls) controls.enabled = false },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => { if (drag.current == null) return; const dx = e.nativeEvent.clientX - drag.current; if (Math.abs(dx) >= 2) { spin(dx * 0.05); drag.current = e.nativeEvent.clientX } },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => { drag.current = null; (e.target as Element).releasePointerCapture?.(e.pointerId); if (controls) controls.enabled = true },
    onPointerOver: () => { document.body.style.cursor = 'ew-resize' }, onPointerOut: () => { document.body.style.cursor = '' },
  } : {}
  const sub = subsolarLat(day, tilt), [dx, , dz] = orbitDir(day)
  mat.sun.set(-dx, 0, -dz)
  return (
    <group position={earthAt(day)}>
      <group rotation-z={-tilt * RAD}>
        <mesh rotation-y={spinAngle(day, utc, tilt)} {...hand}>
          <sphereGeometry args={[RE, 96, 64]} />
          <primitive object={mat.surface} attach="material" />
          {(want.cities ?? []).map((c, i) => { const k = Math.cos(c.lat * RAD); return <mesh key={i} position={[RE * 1.006 * k * Math.cos(c.lon * RAD), RE * 1.006 * Math.sin(c.lat * RAD), -RE * 1.006 * k * Math.sin(c.lon * RAD)]}><sphereGeometry args={[0.075, 12, 10]} /><meshBasicMaterial color={i ? '#ffe14d' : '#ff5a3c'} toneMapped={false} /></mesh> })}
        </mesh>
        <mesh raycast={() => null}><sphereGeometry args={[RE * 1.08, 64, 48]} /><primitive object={mat.air} attach="material" /></mesh>
        {want.zones && <mesh><sphereGeometry args={[RE * 1.003, 64, 48]} /><meshBasicMaterial map={zoneTex} transparent depthWrite={false} toneMapped={false} /></mesh>}
        <Parallel lat={0} color="#ffe14d" />
        {tilt > 0.05 && [1, -1].map(s => <Parallel key={s} lat={s * tilt} color="#ffa24d" />)}
        {tilt > 0.05 && [1, -1].map(s => <Parallel key={s} lat={s * (90 - tilt)} color="#7fd6ff" />)}
        {want.lat != null && <Parallel lat={want.lat} color="#ffffff" r={0.045} />}
        {want.ray && <Parallel lat={sub} color="#ff5a3c" r={0.04} />}
        {want.planes && <Plane r={RE * 1.95} color="#6db8ff" />}
        <Axis />
      </group>
      {want.planes && <Plane r={RE * 2.25} color="#ffd27a" />}
      {want.planes && tilt > 0.05 && <mesh rotation-z={Math.PI - tilt * RAD}><torusGeometry args={[RE * 2.45, 0.035, 8, 32, tilt * RAD]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>}
      {/* 太阳直射的那束光：从太阳方向打到直射点 */}
      {want.ray && <Rod from={[-dx * (RE + 0.02), 0, -dz * (RE + 0.02)]} to={[-dx * (RE + 7), 0, -dz * (RE + 7)]} r={0.05}><meshBasicMaterial color="#ffd27a" toneMapped={false} /></Rod>}
      {want.ray && <mesh position={[-dx * (RE + 0.03), 0, -dz * (RE + 0.03)]}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial color="#ff5a3c" toneMapped={false} /></mesh>}
    </group>
  )
}

/** 远处的一片操场：第 6 课站到这里看影子。太阳和影子由那一课自己画 */
function Playground() {
  const geo = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [0, -0.06, 0], s: [70, 0.12, 56], c: '#b5553f' }, { p: [0, 0.0, 0], s: [52, 0.02, 34], c: '#4f8f5c' })                       // 跑道和草地
    for (const [x, z, w, d] of [[0, -16.9, 52, 0.25], [0, 16.9, 52, 0.25], [-25.9, 0, 0.25, 34], [25.9, 0, 0.25, 34]]) P.push({ p: [x, 0.02, z], s: [w, 0.02, d], c: '#f1efe8' })
    // 北边的教学楼
    P.push({ p: [0, 7, -40], s: [56, 14, 10], c: '#e4e1d8' }, { p: [0, 14.3, -40], s: [58, 0.6, 11], c: '#8a4a3a' })
    for (let f = 0; f < 4; f++) for (let i = 0; i < 12; i++) P.push({ p: [-24.2 + i * 4.4, 2.6 + f * 3.3, -34.95], s: [2.6, 1.7, 0.1], c: '#5d86a8' })
    // 旗台和旗杆
    P.push({ p: [0, 0.2, 0], s: [3, 0.4, 3], c: '#c9c6bb' }, { p: [0, 5.2, 0], s: [0.09, 10, 0.09], c: '#d8dde2', cyl: true }, { p: [0.9, 9.3, 0], s: [1.7, 1.1, 0.04], c: '#d6332b' })
    for (const [x, z] of [[-33, -20], [-33, 0], [-33, 20], [33, -20], [33, 0], [33, 20]]) P.push({ p: [x, 1.4, z], s: [0.3, 2.8, 0.3], c: '#6b5a45', cyl: true }, { p: [x, 4.2, z], s: [2.2, 3.4, 2.2], c: '#4c8a55', cyl: true })
    return mergeParts(P)
  }, [])
  return (
    <group position={GROUND}>
      <mesh position={[0, -0.14, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[260, 48]} /><meshStandardMaterial color="#9fb48a" roughness={1} /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
    </group>
  )
}

/** 星星：远处一圈小亮点 */
function Stars() {
  const geo = useMemo(() => {
    const n = 900, a = new Float32Array(n * 3); let s = 11
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 380 + rnd() * 60, q = Math.sqrt(1 - u * u); a[i * 3] = q * Math.cos(t) * r; a[i * 3 + 1] = u * r * 0.8 + 40; a[i * 3 + 2] = q * Math.sin(t) * r }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3))
    return g
  }, [])
  return <points geometry={geo}><pointsMaterial color="#dfe8ff" size={1.5} sizeAttenuation fog={false} /></points>
}

// ---------- 太阳 ----------
// 表面是算出来的：几层噪声叠成翻滚的米粒组织和暗一些的斑块，边缘比中心暗（临边昏暗）；外面两层朝着镜头的光晕。
const SUN_VERT = /* glsl */`
varying vec3 vO; varying vec3 vN; varying vec3 vP;
void main() { vO = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const SUN_FRAG = /* glsl */`
uniform float uT; varying vec3 vO; varying vec3 vN; varying vec3 vP;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
void main() {
  vec3 p = normalize(vO);
  float big = fbm(p * 2.2 + vec3(0.0, uT * 0.03, uT * 0.02));                      // 大块的明暗
  float cell = fbm(p * 9.0 + big * 1.6 + vec3(uT * 0.09, 0.0, -uT * 0.06));        // 细碎的米粒组织
  float h = clamp(0.55 * big + 0.6 * cell, 0.0, 1.0);
  vec3 col = mix(vec3(0.86, 0.26, 0.02), vec3(1.0, 0.62, 0.1), smoothstep(0.25, 0.5, h));
  col = mix(col, vec3(1.0, 0.86, 0.42), smoothstep(0.52, 0.74, h));
  col = mix(col, vec3(1.0, 0.97, 0.82), smoothstep(0.78, 0.95, h));
  float mu = max(dot(normalize(vN), normalize(cameraPosition - vP)), 0.0);
  col *= 0.45 + 0.75 * pow(mu, 0.55);                                              // 临边昏暗
  col += vec3(1.0, 0.45, 0.1) * pow(1.0 - mu, 4.0) * 0.5;                          // 贴着边缘的一圈色球
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`
function makeGlow(stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')!, r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  for (const [at, color] of stops) r.addColorStop(at, color)
  g.fillStyle = r; g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
function Sun() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uT: { value: 0 } }, fog: false }), [])
  // 光晕的贴图：球面的边缘正好落在半径的 1/3.2 和 1/7 处，从那里往外淡下去
  const near = useMemo(() => makeGlow([[0, 'rgba(255,214,140,0)'], [0.29, 'rgba(255,214,140,0)'], [0.315, 'rgba(255,190,96,0.85)'], [0.4, 'rgba(255,165,70,0.3)'], [0.6, 'rgba(255,150,60,0.06)'], [0.85, 'rgba(255,140,50,0)'], [1, 'rgba(255,140,50,0)']]), [])
  const far = useMemo(() => makeGlow([[0, 'rgba(255,190,110,0.05)'], [0.2, 'rgba(255,180,100,0.14)'], [0.4, 'rgba(255,170,90,0.1)'], [0.65, 'rgba(255,150,70,0.03)'], [0.85, 'rgba(255,140,60,0)'], [1, 'rgba(255,140,60,0)']]), [])
  useFrame((_, dt) => { mat.uniforms.uT.value += dt })
  return (
    <group>
      <mesh><sphereGeometry args={[SUN_R, 64, 48]} /><primitive object={mat} attach="material" /></mesh>
      <sprite scale={[SUN_R * 6.4, SUN_R * 6.4, 1]}><spriteMaterial map={near} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></sprite>
      <sprite scale={[SUN_R * 8, SUN_R * 8, 1]}><spriteMaterial map={far} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></sprite>
    </group>
  )
}

export function World({ want = {} }: { want?: Want }) {
  const tilt = want.tilt ?? TILT
  return (
    <group>
      <Stars />
      {/* 太阳：自己发光，照亮半个地球。光只照到轨道附近，不会照到远处的操场 */}
      <pointLight position={[0, 0, 0]} intensity={95} decay={1} distance={220} color="#fff3dc" />
      <Sun />
      {/* 公转轨道，和上面四个节气的位置 */}
      <mesh rotation-x={Math.PI / 2}><torusGeometry args={[RO, 0.045, 8, 240]} /><meshBasicMaterial color="#8fa3c2" transparent opacity={0.7} toneMapped={false} /></mesh>
      {TERMS.map(t => { const [x, , z] = earthAt(t.day); return <mesh key={t.key} position={[x * 1.0, -RE - 1.1, z * 1.0]}><cylinderGeometry args={[0.5, 0.5, 0.1, 24]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.85} toneMapped={false} /></mesh> })}
      {/* 黄道面：公转轨道所在的那个平面，铺满整条轨道 */}
      {want.planes && <mesh rotation-x={-Math.PI / 2} raycast={() => null}><ringGeometry args={[SUN_R * 1.15, RO + RE * 2.25, 160]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>}
      <Earth want={want} />
      {(want.ghosts ?? []).map(d => <group key={d} position={earthAt(d)} rotation-z={-tilt * RAD}><Axis faint /></group>)}
      <Playground />
    </group>
  )
}
