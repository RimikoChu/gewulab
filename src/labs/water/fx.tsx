// 看得见的现象：火焰（木条复燃、氢气燃烧、酒精灯）、白汽、气泡、矾花、水滴。
// 火焰是一张始终转向镜头的着色器面片；烟和白汽是软边贴片粒子；气泡、矾花用一批实例化的小球，每帧按时间重排。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type V3 = [number, number, number]

// ---------- 火焰 ----------
/** 几种火的样子：blue 根部蓝色的多少，turb 翻滚的程度，tint 整体偏色，speed 往上蹿的快慢，hot 亮度 */
export const FLAME = {
  candle: { blue: 0.9, turb: 0.25, speed: 1.6, hot: 2.2, tint: [1, 1, 1] },
  alcohol: { blue: 1.6, turb: 0.5, speed: 2.2, hot: 1.4, tint: [0.75, 0.85, 1.2] },
  wood: { blue: 0, turb: 1.0, speed: 2.4, hot: 1.9, tint: [1, 0.92, 0.85] },
  oil: { blue: 0, turb: 1.15, speed: 2.0, hot: 1.8, tint: [1, 0.78, 0.6] },
  gas: { blue: 1.2, turb: 0.55, speed: 3.0, hot: 2.0, tint: [1, 0.95, 1.05] },
  phos: { blue: 0, turb: 0.7, speed: 2.6, hot: 3.4, tint: [1, 1, 0.9] },
  h2: { blue: 2.6, turb: 0.35, speed: 3.2, hot: 1.1, tint: [0.55, 0.72, 1.35] },
} as const
export type FlameKind = keyof typeof FLAME

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const FRAG = /* glsl */`
uniform float uTime, uSeed, uLevel, uBlue, uTurb, uSpeed, uHot;
uniform vec3 uTint;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
void main() {
  float y = vUv.y, x = (vUv.x - 0.5) * 2.0, t = uTime * uSpeed + uSeed * 13.0;
  // 往上翻滚的噪声：越往上，左右摆得越厉害
  float n = fbm(vec2(x * 1.6 + uSeed, y * 2.4 - t));
  float n2 = fbm(vec2(x * 3.1 - uSeed, y * 4.0 - t * 1.4));
  float sway = (n - 0.5) * uTurb * y * 1.1 + sin(t * 0.7 + uSeed) * 0.06 * y;
  // 火焰的轮廓：底下圆、往上收尖，像一滴倒过来的水
  float w = 0.92 * pow(max(0.0, 1.0 - y), 0.62) * pow(clamp(y / 0.16, 0.0, 1.0), 0.45) + 0.02;
  float d = abs(x + sway) / w;
  // 上半截被噪声撕开成一条条火舌
  float body = 1.0 - d - y * (0.32 + n2 * 0.9 * uTurb) + (n - 0.5) * 0.25;
  float m = smoothstep(0.0, 0.32, body);
  if (m < 0.002) discard;
  float core = smoothstep(0.25, 0.85, body) * (1.0 - y * 0.8);
  vec3 red = vec3(0.9, 0.16, 0.02), orange = vec3(1.0, 0.42, 0.06), yellow = vec3(1.0, 0.78, 0.3), white = vec3(1.0, 0.95, 0.82);
  vec3 c = mix(red, orange, smoothstep(0.0, 0.35, m));
  c = mix(c, yellow, core);
  c = mix(c, white, smoothstep(0.7, 1.0, core) * 0.7);
  // 根部的蓝色：燃气、蜡烛、酒精
  float blue = uBlue * smoothstep(0.32, 0.0, y) * smoothstep(0.0, 0.05, y) * (1.0 - core * 0.6);
  c = mix(c, vec3(0.25, 0.45, 1.0), clamp(blue, 0.0, 0.9));
  float a = m * (0.55 + 0.45 * smoothstep(1.0, 0.4, y)) * uLevel;
  gl_FragColor = vec4(c * uTint * uHot * a, a * 0.85);
}`

/**
 * 一团火：底在 at，宽 w、高 h（场景单位），level 0 熄灭、1 正常（大小和亮度一起变）。始终转向镜头。
 * light：配一盏闪动的点光源（强度跟 level 走）
 */
export function Flame({ at, w, h, kind = 'candle', level = 1, seed = 0, light = 0, lightColor = '#ff9a44' }: { at: V3; w: number; h: number; kind?: FlameKind; level?: number; seed?: number; light?: number; lightColor?: string }) {
  const g = useRef<THREE.Group>(null), pl = useRef<THREE.PointLight>(null)
  const k = FLAME[kind]
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    // 预乘的“盖上去”：火焰在亮的背景上也是橙色的，不会被叠成一片白；颜色超过 1 的地方照样发出泛光
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uLevel: { value: level }, uBlue: { value: k.blue }, uTurb: { value: k.turb }, uSpeed: { value: k.speed }, uHot: { value: k.hot }, uTint: { value: new THREE.Vector3(...k.tint) } },
  }), [kind, seed])   // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useMemo(() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0, 0.5, 0); return p }, [])
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, clock }) => {
    const gr = g.current; if (!gr) return
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uLevel.value = Math.min(1, level * 1.4)
    gr.getWorldPosition(v)
    gr.rotation.y = Math.atan2(camera.position.x - v.x, camera.position.z - v.z)
    const s = 0.25 + 0.75 * level
    gr.scale.set(s, Math.max(0.001, level ** 0.8), s)
    gr.visible = level > 0.01
    if (pl.current) { const t = clock.elapsedTime * 9 + seed * 5; pl.current.intensity = light * level * (0.82 + 0.12 * Math.sin(t) + 0.08 * Math.sin(t * 2.7 + 1.3)) }
  })
  return <group position={at}>
    <group ref={g}><mesh geometry={geo} material={mat} scale={[w, h, 1]} renderOrder={20} /></group>
    {light > 0 && <pointLight ref={pl} position={[0, h * 0.45, 0]} color={lightColor} distance={h * 18} decay={1.8} intensity={0} />}
  </group>
}

// ---------- 粒子：烟、水汽、干粉、水雾 ----------
let puffTex: THREE.CanvasTexture | null = null
/** 一团软边的“云”：几个错开的径向渐变叠起来，边缘不规则 */
function getPuff() {
  if (puffTex) return puffTex
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 14; i++) {
    const ox = (r() - 0.5) * 30, oy = (r() - 0.5) * 30, x = S / 2 + ox, y = S / 2 + oy, R = Math.min(62 - Math.max(Math.abs(ox), Math.abs(oy)), 20 + r() * 26)
    const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(255,255,255,0.32)'); q.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = q; g.fillRect(0, 0, S, S)
  }
  puffTex = new THREE.CanvasTexture(c); puffTex.colorSpace = THREE.SRGBColorSpace
  return puffTex
}

export interface PuffOpt {
  /** 每秒冒出几团 */ rate: number
  /** 每团活几秒 */ life: number
  /** 刚冒出和最后的大小 */ size: [number, number]
  /** 初速度（场景单位/秒）和方向 */ speed: number; dir?: V3
  /** 方向上的散开程度（0–1） */ spread?: number
  color: string; opacity: number
  /** 每秒的加速度（上浮为正 y） */ accel?: V3
  /** 速度每秒衰减的比例 */ drag?: number
  /** 叠加发光（干粉、水雾不发光；火星发光） */ additive?: boolean
  /** 出生点附近随机散开的半径 */ jitter?: number
}
/** 一个粒子喷口：on 为真时持续往外冒。at 是喷口的位置 */
export function Puffs({ at, on, opt, seed = 1 }: { at: V3; on: boolean; opt: PuffOpt; seed?: number }) {
  const N = Math.min(90, Math.ceil(opt.rate * opt.life) + 2)
  const grp = useRef<THREE.Group>(null)
  const st = useMemo(() => {
    const tex = getPuff()
    const sprites = Array.from({ length: N }, () => { const m = new THREE.SpriteMaterial({ map: tex, color: opt.color, transparent: true, depthWrite: false, opacity: 0, blending: opt.additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !opt.additive }); const sp = new THREE.Sprite(m); sp.visible = false; sp.renderOrder = 15; return sp })
    let sd = seed * 977 + 13
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    return { sprites, p: sprites.map(() => ({ age: 1e9, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: 0, spin: 0 })), acc: 0, next: 0, rnd }
  }, [N, opt.color, opt.additive, seed])   // eslint-disable-line react-hooks/exhaustive-deps
  const dir = useMemo(() => new THREE.Vector3(...(opt.dir ?? [0, 1, 0])).normalize(), [opt.dir?.[0], opt.dir?.[1], opt.dir?.[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), { p, sprites, rnd } = st
    if (on) st.acc += opt.rate * dt
    while (st.acc >= 1) {
      st.acc -= 1
      const q = p[st.next], sp = opt.spread ?? 0.3, j = opt.jitter ?? 0
      st.next = (st.next + 1) % N
      q.age = 0; q.pos.set(at[0] + (rnd() - 0.5) * j * 2, at[1] + (rnd() - 0.5) * j, at[2] + (rnd() - 0.5) * j * 2)
      q.vel.set(dir.x + (rnd() - 0.5) * sp * 2, dir.y + (rnd() - 0.5) * sp * 2, dir.z + (rnd() - 0.5) * sp * 2).normalize().multiplyScalar(opt.speed * (0.7 + rnd() * 0.6))
      q.rot = rnd() * 6.28; q.spin = (rnd() - 0.5) * 0.8
    }
    const a = opt.accel ?? [0, 0, 0], drag = opt.drag ?? 0
    for (let i = 0; i < N; i++) {
      const q = p[i], s = sprites[i]
      q.age += dt
      if (q.age > opt.life) { s.visible = false; continue }
      q.vel.x += a[0] * dt; q.vel.y += a[1] * dt; q.vel.z += a[2] * dt
      q.vel.multiplyScalar(Math.max(0, 1 - drag * dt))
      q.pos.addScaledVector(q.vel, dt)
      const k = q.age / opt.life, size = opt.size[0] + (opt.size[1] - opt.size[0]) * Math.sqrt(k)
      s.visible = true; s.position.copy(q.pos); s.scale.set(size, size, 1)
      const m = s.material as THREE.SpriteMaterial
      m.opacity = opt.opacity * Math.min(1, k / 0.12) * (1 - k) ** 1.3
      m.rotation = q.rot + q.spin * q.age
    }
  })
  return <group ref={grp}>{st.sprites.map((s, i) => <primitive key={i} object={s} />)}</group>
}

/** 几种常用的粒子 */
export const SMOKE = {
  dark: (s: number): PuffOpt => ({ rate: 10, life: 3.6, size: [0.5 * s, 3.2 * s], speed: 1.4 * s, spread: 0.18, color: '#2b2a29', opacity: 0.55, accel: [0.12 * s, 0.4 * s, 0], drag: 0.3, jitter: 0.2 * s }),
  white: (s: number): PuffOpt => ({ rate: 14, life: 3.0, size: [0.25 * s, 2.0 * s], speed: 0.9 * s, spread: 0.22, color: '#f4f3ee', opacity: 0.75, accel: [0.05 * s, 0.5 * s, 0], drag: 0.4, jitter: 0.08 * s }),
  steam: (s: number): PuffOpt => ({ rate: 16, life: 2.2, size: [0.4 * s, 2.6 * s], speed: 1.2 * s, spread: 0.3, color: '#eef3f6', opacity: 0.5, accel: [0, 0.6 * s, 0], drag: 0.5, jitter: 0.3 * s }),
  wisp: (s: number): PuffOpt => ({ rate: 14, life: 2.4, size: [0.05 * s, 0.4 * s], speed: 0.5 * s, spread: 0.1, color: '#bdbdba', opacity: 0.22, accel: [0.03 * s, 0.15 * s, 0], drag: 0.2 }),
}

// ---------- 气泡、矾花、水滴 ----------
const sph = new THREE.SphereGeometry(1, 10, 8)
const dummy = new THREE.Object3D()
/**
 * 一串往上冒的气泡：从 at 这一点（电极、沸腾的瓶底）冒出，升到 top（相对 at 的高度）消失。
 * rate 每秒几个，r 气泡半径，spread 出生点的散开半径。on 为假时不再冒新的，已有的升完为止
 */
export function Bubbles({ at, top, on, rate = 30, r = 0.01, spread = 0.02, speed = 0.4, color = '#ffffff', seed = 1 }: { at: V3; top: number; on: boolean; rate?: number; r?: number; spread?: number; speed?: number; color?: string; seed?: number }) {
  const N = Math.min(160, Math.ceil(rate * top / speed * 1.3) + 4)
  const ref = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => { let s = seed * 7919 + 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; return { p: Array.from({ length: N }, () => ({ age: 1e9, x: 0, z: 0, v: 0, s: 1, w: 0 })), acc: 0, next: 0, rnd } }, [N, seed])
  useFrame((_, d) => {
    const m = ref.current; if (!m) return
    const dt = Math.min(d, 1 / 30)
    if (on) st.acc += rate * dt
    while (st.acc >= 1) { st.acc -= 1; const q = st.p[st.next]; st.next = (st.next + 1) % N; const a = st.rnd() * 6.283, rr = Math.sqrt(st.rnd()) * spread; q.age = 0; q.x = Math.cos(a) * rr; q.z = Math.sin(a) * rr; q.v = speed * (0.7 + st.rnd() * 0.6); q.s = 0.5 + st.rnd() * 0.8; q.w = st.rnd() * 6 }
    for (let i = 0; i < N; i++) {
      const q = st.p[i], y = q.age * q.v
      q.age += dt
      if (y > top) { dummy.scale.setScalar(0) } else { dummy.position.set(at[0] + q.x + Math.sin(q.age * 9 + q.w) * r * 0.4, at[1] + y, at[2] + q.z); dummy.scale.setScalar(r * q.s * Math.min(1, q.age * 8)) }
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[sph, undefined, N]} renderOrder={9} frustumCulled={false}><meshPhysicalMaterial color={color} transparent opacity={0.55} roughness={0.05} clearcoat={1} envMapIntensity={2} depthWrite={false} /></instancedMesh>
}

/**
 * 水里悬浮的颗粒：均匀散在一个圆柱里（半径 R、高 H，底面在 at）。
 * k 是沉降进度（0–1）：0 时到处都是细小的颗粒；clump 为真时颗粒先聚成一团团的矾花，再往下沉；最后都落到杯底。
 */
export function Flocs({ at, R, H, k, clump, color = '#8a6a3e', n = 140, size = 0.004, seed = 3 }: { at: V3; R: number; H: number; k: number; clump: boolean; color?: string; n?: number; size?: number; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => { let s = seed * 104729 + 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    return Array.from({ length: n }, (_, i) => { const a = rnd() * 6.283, rr = Math.sqrt(rnd()) * R * 0.92; const c = i % 7, ca = c * 0.9 + seed, cr = R * (0.25 + 0.5 * ((c * 37) % 10) / 10)
      return { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: rnd() * H * 0.95, cx: Math.cos(ca) * cr, cz: Math.sin(ca) * cr, cy: H * (0.35 + 0.5 * ((c * 53) % 10) / 10), ph: rnd() * 6.3, heavy: rnd() } }) }, [n, R, H, seed])
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return
    const t = clock.elapsedTime
    pts.forEach((p, i) => {
      // 聚：前 40% 的进度里颗粒向各自的矾花中心靠拢；沉：之后整团往下落
      const g = clump ? Math.min(1, k / 0.4) : 0, fall = clump ? Math.max(0, (k - 0.3) / 0.7) : k * (p.heavy < 0.45 ? 1 : 0.25)
      const x = p.x + (p.cx + Math.cos(i) * R * 0.05 - p.x) * g, z = p.z + (p.cz + Math.sin(i) * R * 0.05 - p.z) * g
      const y0 = p.y + (p.cy + Math.sin(i * 3.1) * H * 0.03 - p.y) * g, y = Math.max(0.004, y0 * (1 - Math.min(1, fall * 1.15)))
      const wob = (1 - fall) * R * 0.02
      dummy.position.set(at[0] + x + Math.sin(t * 0.6 + p.ph) * wob, at[1] + y, at[2] + z + Math.cos(t * 0.5 + p.ph) * wob)
      dummy.scale.setScalar(size * (clump ? 1 + g * 1.6 : 1) * (0.6 + p.heavy * 0.8))
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[sph, undefined, n]} renderOrder={4} frustumCulled={false}><meshStandardMaterial color={color} roughness={1} transparent opacity={0.85} depthWrite={false} /></instancedMesh>
}

/** 一滴一滴往下落的水：从 at 落到 floor（相对高度，负数），每 every 秒一滴 */
export function Drips({ at, drop, on, every = 0.6, r = 0.012, color = '#dcecf2' }: { at: V3; drop: number; on: boolean; every?: number; r?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null), t0 = useRef(0)
  useFrame((_, d) => {
    const m = ref.current; if (!m) return
    t0.current += Math.min(d, 1 / 30)
    const ph = (t0.current % every) / every, grow = Math.min(1, ph / 0.55), fall = Math.max(0, (ph - 0.55) / 0.45)
    m.visible = on
    m.position.set(at[0], at[1] - r - drop * fall * fall, at[2])
    m.scale.set(r * (0.5 + 0.5 * grow), r * (0.6 + 0.6 * grow + fall * 0.5), r * (0.5 + 0.5 * grow))
  })
  return <mesh ref={ref} geometry={sph} renderOrder={9}><meshPhysicalMaterial color={color} transparent opacity={0.75} roughness={0.02} clearcoat={1} envMapIntensity={2.2} depthWrite={false} /></mesh>
}
