// 太空里的天体：地球（NASA 实拍影像，晨昏线随太阳方向）、月球（程序画的环形山和月海）、跟着镜头的星空、远处的太阳光晕、太阳系里的太阳和行星。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ---------- 地球 ----------
const EARTH_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const EARTH_FRAG = /* glsl */`
uniform sampler2D uDay; uniform sampler2D uAux; uniform vec3 uSun;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() {
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP), S = normalize(uSun);
  vec3 day = texture2D(uDay, vUv).rgb; vec3 aux = texture2D(uAux, vUv).rgb;
  float cloud = aux.r, water = aux.g, lights = aux.b;
  float ndl = dot(N, S), lit = smoothstep(-0.08, 0.16, ndl);
  day = day * 1.3 + water * vec3(0.0, 0.035, 0.09);
  vec3 col = day * (0.04 + 1.15 * max(ndl, 0.0));
  float spec = pow(max(dot(reflect(-S, N), V), 0.0), 70.0) * water * (1.0 - cloud) * lit;
  col += vec3(1.0, 0.93, 0.8) * spec * 0.28;
  col = mix(col, vec3(0.03 + 1.05 * max(ndl, 0.0)), cloud * cloud * 0.6);
  vec3 dark = day * vec3(0.02, 0.03, 0.055) + vec3(1.0, 0.76, 0.42) * lights * 1.1 * (1.0 - cloud * 0.6);
  col = mix(dark, col, lit);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.28, 0.52, 1.0) * rim * (0.08 + 0.8 * lit);
  // 晨昏线附近一条暖色的过渡
  col += vec3(0.45, 0.2, 0.05) * (1.0 - smoothstep(0.0, 0.08, abs(ndl))) * lit * 0.05;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
const AIR_VERT = /* glsl */`
varying vec3 vN; varying vec3 vP;
void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const AIR_FRAG = /* glsl */`
uniform vec3 uSun; uniform float uK; varying vec3 vN; varying vec3 vP;
void main() {
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP);
  float t = clamp(-dot(N, V) / uK, 0.0, 1.0), edge = t * t * t;
  float lit = smoothstep(-0.35, 0.5, dot(-N, normalize(uSun)));
  gl_FragColor = vec4(vec3(0.3, 0.56, 1.0) * edge * (0.06 + 0.94 * lit) * 0.95, 1.0);
  #include <colorspace_fragment>
}`

/** 太阳照过来的方向（地球系里统一用这一个） */
export const SUN_DIR = new THREE.Vector3(0.86, 0.22, 0.46).normalize()

/** 地球：r 是半径，spin 是自转角（弧度） */
export function Earth({ r, spin = 0, rate = 0, sun = SUN_DIR }: { r: number; spin?: number; rate?: number; sun?: THREE.Vector3 }) {
  const ball = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (ball.current) ball.current.rotation.y = rate ? ball.current.rotation.y + rate * Math.min(dt, 0.05) : spin })
  const [day, aux] = useTexture(['/assets/tex/earth_day.jpg', '/assets/tex/earth_aux.jpg'])
  const mats = useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace; aux.colorSpace = THREE.NoColorSpace
    for (const t of [day, aux]) { t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true }
    const s = { value: sun.clone() }
    const surface = new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: { uDay: { value: day }, uAux: { value: aux }, uSun: s } })
    const air = new THREE.ShaderMaterial({ vertexShader: AIR_VERT, fragmentShader: AIR_FRAG, uniforms: { uSun: s, uK: { value: 0.36 } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    return { surface, air }
  }, [day, aux, sun])
  return (
    <group>
      <mesh ref={ball} rotation-y={spin}><sphereGeometry args={[r, 128, 96]} /><primitive object={mats.surface} attach="material" /></mesh>
      <mesh raycast={() => null}><sphereGeometry args={[r * 1.07, 96, 64]} /><primitive object={mats.air} attach="material" /></mesh>
    </group>
  )
}

// ---------- 月球 ----------
/** 程序画的月面：浅灰底、几块暗的月海、大大小小的环形山 */
function makeMoonTex() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  let s = 29; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  g.fillStyle = '#a9a69f'; g.fillRect(0, 0, W, H)
  // 月海：几片大的暗斑
  for (const [x, y, r] of [[300, 180, 110], [420, 230, 80], [230, 260, 70], [520, 170, 60], [360, 300, 50], [640, 260, 45]]) {
    for (let k = 0; k < 6; k++) { const q = g.createRadialGradient(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.6, 0, x, y, r * (0.7 + rnd() * 0.5)); q.addColorStop(0, 'rgba(70,70,72,0.5)'); q.addColorStop(1, 'rgba(70,70,72,0)'); g.fillStyle = q; g.fillRect(0, 0, W, H) }
  }
  // 环形山：大多是小坑，少数大坑；暗的坑底、一侧亮一侧暗的坑壁
  for (let i = 0; i < 1600; i++) {
    const x = rnd() * W, y = 20 + rnd() * (H - 40), r = Math.pow(rnd(), 4.5) * 22 + 0.8, k = 0.06 + rnd() * 0.1
    g.fillStyle = `rgba(70,68,64,${k})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    g.strokeStyle = `rgba(240,236,228,${k * 1.4})`; g.lineWidth = Math.max(0.6, r * 0.16); g.beginPath(); g.arc(x + r * 0.08, y + r * 0.08, r, Math.PI * 0.1, Math.PI * 0.9); g.stroke()
    g.strokeStyle = `rgba(40,38,36,${k})`; g.beginPath(); g.arc(x - r * 0.05, y - r * 0.05, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke()
  }
  // 几个有亮纹的年轻环形山
  for (const [x, y] of [[560, 400], [200, 120]]) { for (let k = 0; k < 40; k++) { const a = rnd() * Math.PI * 2, l = 30 + rnd() * 90; g.strokeStyle = 'rgba(235,232,225,0.08)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8); g.stroke() } }
  for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '40,40,40' : '230,228,220'},${0.05 + rnd() * 0.08})`; g.fillRect(rnd() * W, rnd() * H, 1.5, 1.5) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping
  return t
}
export function Moon({ r }: { r: number }) {
  const map = useMemo(makeMoonTex, [])
  return <mesh rotation-y={-1.2}><sphereGeometry args={[r, 64, 48]} /><meshStandardMaterial map={map} bumpMap={map} bumpScale={0.6} roughness={0.95} metalness={0} /></mesh>
}

// ---------- 星空 ----------
/** 星空：一团跟着镜头走的点，永远在最远处；有明有暗、略带冷暖 */
export function Stars({ n = 2600 }: { n?: number }) {
  const ref = useRef<THREE.Group>(null)
  const [bright, faint] = useMemo(() => {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    const make = (m: number) => {
      const a = new Float32Array(m * 3), col = new Float32Array(m * 3)
      for (let i = 0; i < m; i++) {
        const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, q = Math.sqrt(1 - u * u), R = 760
        // 一条银河：往一个大圆附近多撒一些
        const band = rnd() < 0.35
        const uu = band ? (rnd() - 0.5) * 0.25 : u, qq = band ? Math.sqrt(1 - uu * uu) : q
        a.set([qq * Math.cos(t) * R, uu * R, qq * Math.sin(t) * R], i * 3)
        const w = rnd(), k = 0.55 + rnd() * 0.45
        col.set(w < 0.2 ? [1 * k, 0.85 * k, 0.7 * k] : w < 0.45 ? [0.75 * k, 0.85 * k, 1 * k] : [k, k, k], i * 3)
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      g.rotateX(0.5); g.rotateZ(0.35)
      return g
    }
    return [make(Math.round(n * 0.15)), make(n)]
  }, [n])
  useFrame(({ camera }) => { ref.current?.position.copy(camera.position) })
  return (
    <group ref={ref}>
      <points geometry={faint} raycast={() => null}><pointsMaterial vertexColors size={1.3} sizeAttenuation={false} fog={false} toneMapped={false} transparent opacity={0.75} depthWrite={false} /></points>
      <points geometry={bright} raycast={() => null}><pointsMaterial vertexColors size={2.4} sizeAttenuation={false} fog={false} toneMapped={false} depthWrite={false} /></points>
    </group>
  )
}

function makeGlow(stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')!, r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  for (const [at, color] of stops) r.addColorStop(at, color)
  g.fillStyle = r; g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
/** 远处的太阳：一团很亮的光，跟着镜头保持在 SUN_DIR 方向 */
export function FarSun() {
  const ref = useRef<THREE.Group>(null)
  const tex = useMemo(() => makeGlow([[0, 'rgba(255,255,250,1)'], [0.05, 'rgba(255,250,235,1)'], [0.09, 'rgba(255,230,180,0.5)'], [0.25, 'rgba(255,200,130,0.12)'], [0.6, 'rgba(255,180,110,0.03)'], [1, 'rgba(255,170,100,0)']]), [])
  useFrame(({ camera }) => { ref.current?.position.copy(camera.position).addScaledVector(SUN_DIR, 700) })
  return <group ref={ref}><sprite scale={[160, 160, 1]}><spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></sprite></group>
}

// ---------- 太阳系 ----------
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
  float big = fbm(p * 2.2 + vec3(0.0, uT * 0.03, uT * 0.02));
  float cell = fbm(p * 9.0 + big * 1.6 + vec3(uT * 0.09, 0.0, -uT * 0.06));
  float h = clamp(0.55 * big + 0.6 * cell, 0.0, 1.0);
  vec3 col = mix(vec3(0.86, 0.26, 0.02), vec3(1.0, 0.62, 0.1), smoothstep(0.25, 0.5, h));
  col = mix(col, vec3(1.0, 0.86, 0.42), smoothstep(0.52, 0.74, h));
  col = mix(col, vec3(1.0, 0.97, 0.82), smoothstep(0.78, 0.95, h));
  float mu = max(dot(normalize(vN), normalize(cameraPosition - vP)), 0.0);
  col *= 0.45 + 0.75 * pow(mu, 0.55);
  col += vec3(1.0, 0.45, 0.1) * pow(1.0 - mu, 4.0) * 0.5;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`
/** 日冕：从中心往外放射的细丝，越往外越淡 */
function makeCorona() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, m = S / 2
  let sd = 17; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  const base = g.createRadialGradient(m, m, 0, m, m, m)
  base.addColorStop(0, 'rgba(255,230,180,0.5)'); base.addColorStop(0.12, 'rgba(255,215,150,0.28)'); base.addColorStop(0.35, 'rgba(255,190,120,0.07)'); base.addColorStop(1, 'rgba(255,170,100,0)')
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2, l = m * (0.25 + rnd() * 0.6), w = 1 + rnd() * 3
    const q = g.createLinearGradient(m, m, m + Math.cos(a) * l, m + Math.sin(a) * l)
    q.addColorStop(0, 'rgba(255,225,170,0.10)'); q.addColorStop(1, 'rgba(255,200,140,0)')
    g.strokeStyle = q; g.lineWidth = w; g.beginPath(); g.moveTo(m, m); g.lineTo(m + Math.cos(a) * l, m + Math.sin(a) * l); g.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
export function Sun({ r, halo = 6.4 }: { r: number; halo?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uT: { value: 0 } }, fog: false }), [])
  const near = useMemo(() => makeGlow([[0, 'rgba(255,214,140,0)'], [0.29, 'rgba(255,214,140,0)'], [0.315, 'rgba(255,190,96,0.85)'], [0.4, 'rgba(255,165,70,0.3)'], [0.6, 'rgba(255,150,60,0.06)'], [0.85, 'rgba(255,140,50,0)'], [1, 'rgba(255,140,50,0)']]), [])
  const corona = useMemo(makeCorona, [])
  useFrame((_, dt) => { mat.uniforms.uT.value += dt })
  return (
    <group>
      <mesh><sphereGeometry args={[r, 64, 48]} /><primitive object={mat} attach="material" /></mesh>
      <sprite scale={[r * halo, r * halo, 1]}><spriteMaterial map={near} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></sprite>
      {/* 日冕：一圈带细丝的淡光，比光晕大得多 */}
      <sprite scale={[r * halo * 2.6, r * halo * 2.6, 1]}><spriteMaterial map={corona} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} opacity={0.9} /></sprite>
    </group>
  )
}

/** 带条纹的行星贴图（木星、金星的云带）；岩石行星用斑块 */
function makePlanetTex(kind: 'bands' | 'rock', base: string, a: string, b: string, seed: number) {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  if (kind === 'bands') {
    let y = 0
    while (y < H) { const h = 6 + rnd() * 22; g.fillStyle = rnd() < 0.5 ? a : b; g.globalAlpha = 0.35 + rnd() * 0.4; g.fillRect(0, y, W, h); y += h }
    g.globalAlpha = 1
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.08})`; g.fillRect(rnd() * W, rnd() * H, 20 + rnd() * 80, 1 + rnd() * 2) }
  } else {
    for (let i = 0; i < 160; i++) { const x = rnd() * W, y = rnd() * H, r = 6 + rnd() * 40; const q = g.createRadialGradient(x, y, 0, x, y, r); const col = rnd() < 0.5 ? a : b; q.addColorStop(0, col); q.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.5; g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2) }
    g.globalAlpha = 1
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping
  return t
}
const LOOK: Record<string, ['bands' | 'rock', string, string, string]> = {
  mercury: ['rock', '#9a958e', 'rgba(70,66,62,0.9)', 'rgba(205,200,192,0.8)'],
  venus: ['bands', '#efe2bd', 'rgba(250,240,210,1)', 'rgba(214,190,140,1)'],
  earth: ['rock', '#2f5f9e', 'rgba(70,120,60,1)', 'rgba(230,235,240,0.9)'],
  mars: ['rock', '#b5552f', 'rgba(120,50,30,1)', 'rgba(220,150,100,1)'],
  jupiter: ['bands', '#d8c2a0', 'rgba(160,96,58,1)', 'rgba(248,238,220,1)'],
  show: ['rock', '#7f8c9a', 'rgba(70,80,95,1)', 'rgba(190,200,210,1)'],
}
export function Planet({ kind, r }: { kind: keyof typeof LOOK; r: number }) {
  if (kind === 'earth') return <EarthBall r={r} />
  return <RockOrGas kind={kind} r={r} />
}
/** 太阳系里的地球：用实拍的白天影像，按太阳那盏点光源受光 */
function EarthBall({ r }: { r: number }) {
  const day = useTexture('/assets/tex/earth_day.jpg')
  const map = useMemo(() => { const t = day.clone(); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t }, [day])
  return <mesh><sphereGeometry args={[r, 48, 32]} /><meshStandardMaterial map={map} roughness={0.75} metalness={0} emissive="#0a1a33" /></mesh>
}
function RockOrGas({ kind, r }: { kind: keyof typeof LOOK; r: number }) {
  const map = useMemo(() => { const [k, base, a, b] = LOOK[kind]; return makePlanetTex(k, base, a, b, kind.length * 31 + 5) }, [kind])
  return <mesh><sphereGeometry args={[r, 48, 32]} /><meshStandardMaterial map={map} roughness={0.85} metalness={0} /></mesh>
}

/** 一条细的轨道线（xz 平面上的椭圆，焦点在原点，近点在 +x） */
export function OrbitLine({ a, e = 0, color = '#8fa3c2', opacity = 0.7, width = 1 }: { a: number; e?: number; color?: string; opacity?: number; width?: number }) {
  const geo = useMemo(() => {
    const n = 256, p: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) { const E = i / n * Math.PI * 2; p.push(new THREE.Vector3(a * (Math.cos(E) - e), 0, -a * Math.sqrt(1 - e * e) * Math.sin(E))) }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p, true), 256, 0.03 * width * Math.max(1, a / 12), 6, true)
  }, [a, e, width])
  return <mesh geometry={geo} raycast={() => null}><meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} depthWrite={false} /></mesh>
}

/** 发光的轨道带：一条有宽度的扁带（中间亮、两边淡），外加一道细亮线；xz 平面上的椭圆，焦点在原点 */
let bandTex: THREE.CanvasTexture | null = null
function getBandTex() {
  if (bandTex) return bandTex
  const c = document.createElement('canvas'); c.width = 4; c.height = 64
  const g = c.getContext('2d')!, q = g.createLinearGradient(0, 0, 0, 64)
  q.addColorStop(0, 'rgba(255,255,255,0)'); q.addColorStop(0.42, 'rgba(255,255,255,0.35)'); q.addColorStop(0.5, 'rgba(255,255,255,1)'); q.addColorStop(0.58, 'rgba(255,255,255,0.35)'); q.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = q; g.fillRect(0, 0, 4, 64)
  return (bandTex = new THREE.CanvasTexture(c))
}
export function OrbitBand({ a, e = 0, width = 0.6, color = '#8fb6ff', opacity = 0.8 }: { a: number; e?: number; width?: number; color?: string; opacity?: number }) {
  const geo = useMemo(() => {
    const n = 360, pos: number[] = [], uv: number[] = [], idx: number[] = [], b = a * Math.sqrt(1 - e * e)
    for (let i = 0; i <= n; i++) {
      const E = i / n * Math.PI * 2, x = a * (Math.cos(E) - e), z = -b * Math.sin(E)
      const tx = -a * Math.sin(E), tz = -b * Math.cos(E), l = Math.hypot(tx, tz), nx = tz / l, nz = -tx / l
      pos.push(x + nx * width / 2, 0, z + nz * width / 2, x - nx * width / 2, 0, z - nz * width / 2); uv.push(i / n, 0, i / n, 1)
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx)
    return g
  }, [a, e, width])
  return <mesh geometry={geo} raycast={() => null}><meshBasicMaterial map={getBandTex()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
}
