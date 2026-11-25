// 看得见的现象：火焰（酒精灯、酒精喷灯、尾气、氢气）、镁条燃烧的白光、烟和白汽、试管里的气泡、铁水的流动和火花。
// 火焰是一张始终转向镜头的着色器面片；烟是软边贴片粒子；气泡、火花用实例化的小球，每帧按时间重排；铁水是会流动的发光着色器。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from './parts'

export type V3 = [number, number, number]

// ---------- 火焰 ----------
/** blue 根部蓝色的多少，turb 翻滚的程度，tint 整体偏色，speed 往上蹿的快慢，hot 亮度 */
export const FLAME = {
  alcohol: { blue: 1.6, turb: 0.5, speed: 2.2, hot: 1.4, tint: [0.78, 0.86, 1.2] },
  torch: { blue: 2.4, turb: 0.3, speed: 4.2, hot: 1.6, tint: [0.6, 0.75, 1.4] },
  co: { blue: 2.8, turb: 0.45, speed: 2.4, hot: 1.0, tint: [0.45, 0.62, 1.45] },
  h2: { blue: 2.8, turb: 0.35, speed: 3.4, hot: 1.0, tint: [0.5, 0.7, 1.4] },
  match: { blue: 0.4, turb: 0.6, speed: 2.4, hot: 1.9, tint: [1, 0.92, 0.8] },
} as const
export type FlameKind = keyof typeof FLAME

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const NOISE = /* glsl */`
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }`
const FRAG = /* glsl */`
uniform float uTime, uSeed, uLevel, uBlue, uTurb, uSpeed, uHot;
uniform vec3 uTint;
varying vec2 vUv;
${NOISE}
void main() {
  float y = vUv.y, x = (vUv.x - 0.5) * 2.0, t = uTime * uSpeed + uSeed * 13.0;
  float n = fbm(vec2(x * 1.6 + uSeed, y * 2.4 - t));
  float n2 = fbm(vec2(x * 3.1 - uSeed, y * 4.0 - t * 1.4));
  float sway = (n - 0.5) * uTurb * y * 1.1 + sin(t * 0.7 + uSeed) * 0.05 * y;
  // 轮廓：底下圆、往上收尖
  float w = 0.92 * pow(max(0.0, 1.0 - y), 0.62) * pow(clamp(y / 0.16, 0.0, 1.0), 0.45) + 0.02;
  float d = abs(x + sway) / w;
  float body = 1.0 - d - y * (0.32 + n2 * 0.9 * uTurb) + (n - 0.5) * 0.25;
  float m = smoothstep(0.0, 0.32, body);
  if (m < 0.002) discard;
  float core = smoothstep(0.25, 0.85, body) * (1.0 - y * 0.8);
  vec3 c = mix(vec3(0.9, 0.16, 0.02), vec3(1.0, 0.42, 0.06), smoothstep(0.0, 0.35, m));
  c = mix(c, vec3(1.0, 0.78, 0.3), core);
  c = mix(c, vec3(1.0, 0.95, 0.82), smoothstep(0.7, 1.0, core) * 0.7);
  float blue = uBlue * (1.0 - smoothstep(0.0, 0.32, y)) * smoothstep(0.0, 0.05, y) * (1.0 - core * 0.6);
  c = mix(c, vec3(0.25, 0.45, 1.0), clamp(blue, 0.0, 0.92));
  float a = m * (0.55 + 0.45 * (1.0 - smoothstep(0.4, 1.0, y))) * uLevel;
  gl_FragColor = vec4(c * uTint * uHot * a, a * 0.85);
}`

/** 一团火：底在 at，宽 w、高 h，level 0 熄灭、1 正常。始终转向镜头。light：配一盏闪动的点光源 */
export function Flame({ at, w, h, kind = 'alcohol', level = 1, seed = 0, light = 0, lightColor = '#ffa050', tilt = 0 }: { at: V3; w: number; h: number; kind?: FlameKind; level?: number; seed?: number; light?: number; lightColor?: string; tilt?: number }) {
  const g = useRef<THREE.Group>(null), pl = useRef<THREE.PointLight>(null)
  const k = FLAME[kind]
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    // 预乘的“盖上去”：亮背景上火焰也是橙色的，不会叠成一片白
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
  return <group position={at} rotation-z={tilt}>
    <group ref={g}><mesh geometry={geo} material={mat} scale={[w, h, 1]} renderOrder={20} /></group>
    {light > 0 && <pointLight ref={pl} position={[0, h * 0.45, 0]} color={lightColor} distance={h * 18} decay={1.8} intensity={0} />}
  </group>
}

// ---------- 强光：镁条燃烧、钢坯、出铁口 ----------
let glowTex: THREE.CanvasTexture | null = null
function getGlow() {
  if (glowTex) return glowTex
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, q = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.18, 'rgba(255,255,255,0.75)'); q.addColorStop(0.45, 'rgba(255,255,255,0.18)'); q.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = q; g.fillRect(0, 0, S, S)
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}
/** 一团发光的光晕：始终朝向镜头的软边圆片，叠加混合；flicker 闪动的程度 */
export function Glow({ at, size, color = '#ffffff', level = 1, flicker = 0.15, light = 0, distance = 10 }: { at: V3; size: number; color?: string; level?: number; flicker?: number; light?: number; distance?: number }) {
  const s = useRef<THREE.Sprite>(null), pl = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 13, f = 1 - flicker + flicker * (0.5 + 0.3 * Math.sin(t) + 0.2 * Math.sin(t * 2.3 + 1.1))
    if (s.current) { s.current.scale.setScalar(size * (0.85 + 0.15 * f) * Math.max(0.001, level)); s.current.visible = level > 0.01; (s.current.material as THREE.SpriteMaterial).opacity = Math.min(1, level) }
    if (pl.current) pl.current.intensity = light * level * f
  })
  return <group position={at}>
    <sprite ref={s} renderOrder={22}><spriteMaterial map={getGlow()} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
    {light > 0 && <pointLight ref={pl} color={color} distance={distance} decay={1.6} intensity={0} />}
  </group>
}

// ---------- 烟、白汽 ----------
let puffTex: THREE.CanvasTexture | null = null
function getPuff() {
  if (puffTex) return puffTex
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(3)
  for (let i = 0; i < 14; i++) {
    const ox = (r() - 0.5) * 30, oy = (r() - 0.5) * 30, x = S / 2 + ox, y = S / 2 + oy, R = Math.min(62 - Math.max(Math.abs(ox), Math.abs(oy)), 20 + r() * 26)
    const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(255,255,255,0.32)'); q.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = q; g.fillRect(0, 0, S, S)
  }
  puffTex = new THREE.CanvasTexture(c); puffTex.colorSpace = THREE.SRGBColorSpace
  return puffTex
}
export interface PuffOpt { rate: number; life: number; size: [number, number]; speed: number; dir?: V3; spread?: number; color: string; opacity: number; accel?: V3; jitter?: number }
/** 一个冒烟的口子：on 为真时持续往外冒。粒子数固定，按时间循环复用 */
export function Puffs({ at, on, opt, seed = 1 }: { at: V3; on: boolean; opt: PuffOpt; seed?: number }) {
  const N = Math.min(80, Math.ceil(opt.rate * opt.life) + 2)
  const items = useMemo(() => { const r = rng(seed * 97 + 5); return Array.from({ length: N }, () => ({ born: -1e9, p: new THREE.Vector3(), v: new THREE.Vector3(), rot: r() * 6, spin: (r() - 0.5) * 0.6, rnd: r })) }, [N, seed])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const st = useRef({ acc: 0, next: 0 })
  const dir = useMemo(() => new THREE.Vector3(...(opt.dir ?? [0, 1, 0])).normalize(), [opt.dir])
  useFrame(({ clock }, d) => {
    const now = clock.elapsedTime, dt = Math.min(d, 1 / 30)
    if (on) {
      st.current.acc += dt * opt.rate
      while (st.current.acc >= 1) {
        st.current.acc -= 1
        const it = items[st.current.next]; st.current.next = (st.current.next + 1) % N
        const r = it.rnd, j = opt.jitter ?? 0, sp = opt.spread ?? 0.2
        it.born = now; it.p.set(at[0] + (r() - 0.5) * j, at[1] + (r() - 0.5) * j, at[2] + (r() - 0.5) * j)
        it.v.copy(dir).add(new THREE.Vector3((r() - 0.5) * sp, (r() - 0.5) * sp, (r() - 0.5) * sp)).normalize().multiplyScalar(opt.speed * (0.7 + r() * 0.6))
      }
    }
    items.forEach((it, i) => {
      const s = refs.current[i]; if (!s) return
      const age = now - it.born
      if (age > opt.life || age < 0) { s.visible = false; return }
      const k = age / opt.life
      if (opt.accel) it.v.addScaledVector(new THREE.Vector3(...opt.accel), dt)
      it.v.multiplyScalar(1 - dt * 0.6)
      it.p.addScaledVector(it.v, dt)
      s.visible = true; s.position.copy(it.p)
      s.scale.setScalar(opt.size[0] + (opt.size[1] - opt.size[0]) * Math.sqrt(k))
      const m = s.material as THREE.SpriteMaterial; m.opacity = opt.opacity * Math.min(1, k * 6) * (1 - k); m.rotation = it.rot + it.spin * age
    })
  })
  return <group>{items.map((_, i) => <sprite key={i} ref={e => { refs.current[i] = e }} visible={false} renderOrder={18}><spriteMaterial map={getPuff()} color={opt.color} transparent depthWrite={false} opacity={0} /></sprite>)}</group>
}

// ---------- 气泡 ----------
/**
 * 试管里的气泡：从 from 附近（金属表面）冒出，往上升到液面消失。rate 每秒冒几个；r 气泡半径；R 试管内半径；top 液面高度（相对 from 的 y）
 * from 是金属所在的位置（世界坐标）；src 是金属在管里的一个小范围，气泡从里面随机冒
 */
export function Bubbles({ at, rate, r, R, top, src = 0.3, seed = 1, rise = 1 }: { at: V3; rate: number; r: number; R: number; top: number; src?: number; seed?: number; rise?: number }) {
  const N = 90
  const mesh = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => ({ items: Array.from({ length: N }, () => ({ born: -1, x: 0, z: 0, y0: 0, s: 1, v: 1, w: 0 })), acc: 0, next: 0, r: rng(seed * 31 + 7) }), [seed])
  const m4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), p = useMemo(() => new THREE.Vector3(), []), sc = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, d) => {
    const me = mesh.current; if (!me) return
    const now = clock.elapsedTime, dt = Math.min(d, 1 / 30), rnd = st.r
    st.acc += dt * rate
    while (st.acc >= 1) {
      st.acc -= 1
      const it = st.items[st.next]; st.next = (st.next + 1) % N
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * src
      it.born = now; it.x = Math.cos(a) * rr; it.z = Math.sin(a) * rr; it.y0 = rnd() * top * 0.15; it.s = 0.5 + rnd() * 0.9; it.v = (0.6 + rnd() * 0.8) * rise; it.w = rnd() * 6
    }
    st.items.forEach((it, i) => {
      const age = now - it.born, y = it.y0 + age * it.v * top * 0.9
      if (it.born < 0 || y > top) { sc.setScalar(0); m4.compose(p.set(0, -1e3, 0), q, sc); me.setMatrixAt(i, m4); return }
      const grow = Math.min(1, age * 6) * (1 + y / top * 0.5)
      // 往上升时左右轻轻摆，越靠近管壁越被推回来
      const dx = Math.sin(age * 9 + it.w) * R * 0.06
      p.set(at[0] + Math.max(-R * 0.85, Math.min(R * 0.85, it.x + dx)), at[1] + y, at[2] + Math.max(-R * 0.85, Math.min(R * 0.85, it.z)))
      sc.setScalar(r * it.s * grow); m4.compose(p, q, sc); me.setMatrixAt(i, m4)
    })
    me.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, N]} renderOrder={6} frustumCulled={false}>
    <sphereGeometry args={[1, 10, 8]} />
    <meshPhysicalMaterial color="#f4fbff" transparent opacity={0.55} roughness={0.05} clearcoat={1} envMapIntensity={2.2} depthWrite={false} />
  </instancedMesh>
}

// ---------- 火花 ----------
/** 飞溅的火星：从 at 往 dir 方向喷，受重力落下，越来越暗。on 为真时持续喷；color 发光颜色 */
export function Sparks({ at, on, rate = 40, speed = 4, g = 9, life = 0.9, size = 0.04, dir = [0, 1, 0], spread = 0.8, color = '#ffb45a', seed = 3 }: { at: V3; on: boolean; rate?: number; speed?: number; g?: number; life?: number; size?: number; dir?: V3; spread?: number; color?: string; seed?: number }) {
  const N = Math.min(160, Math.ceil(rate * life) + 4)
  const mesh = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => ({ items: Array.from({ length: N }, () => ({ born: -1e9, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 })), acc: 0, next: 0, r: rng(seed * 13 + 1) }), [N, seed])
  const m4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), sc = useMemo(() => new THREE.Vector3(), []), D = useMemo(() => new THREE.Vector3(...dir).normalize(), [dir[0], dir[1], dir[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  const col = useMemo(() => new THREE.Color(color).multiplyScalar(4), [color])
  useFrame(({ clock }, d) => {
    const me = mesh.current; if (!me) return
    const now = clock.elapsedTime, dt = Math.min(d, 1 / 30), r = st.r
    if (on) {
      st.acc += dt * rate
      while (st.acc >= 1) {
        st.acc -= 1
        const it = st.items[st.next]; st.next = (st.next + 1) % N
        it.born = now; it.p.set(...at); it.s = 0.5 + r() * 0.8
        it.v.copy(D).add(new THREE.Vector3((r() - 0.5) * spread, (r() - 0.5) * spread, (r() - 0.5) * spread)).normalize().multiplyScalar(speed * (0.5 + r() * 0.8))
      }
    }
    st.items.forEach((it, i) => {
      const age = now - it.born
      if (age < 0 || age > life) { sc.setScalar(0); m4.compose(it.p, q, sc); me.setMatrixAt(i, m4); return }
      it.v.y -= g * dt; it.p.addScaledVector(it.v, dt)
      sc.setScalar(size * it.s * (1 - age / life)); m4.compose(it.p, q, sc); me.setMatrixAt(i, m4)
    })
    me.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, N]} renderOrder={21} frustumCulled={false}>
    <sphereGeometry args={[1, 6, 4]} />
    <meshBasicMaterial color={col} toneMapped={false} />
  </instancedMesh>
}

// ---------- 铁水 ----------
const MOLTEN_FRAG = /* glsl */`
uniform float uTime, uHeat, uFlow, uCrust;
varying vec2 vUv;
${NOISE}
void main() {
  // 沿着流向（uv.y）走的亮纹，外加一层慢慢漂的暗色浮渣
  vec2 p = vec2(vUv.x * 3.0, vUv.y * 6.0 - uTime * uFlow);
  float n = fbm(p * 2.2), n2 = fbm(p * 5.0 + 3.0);
  float crust = smoothstep(0.55, 0.8, fbm(vec2(vUv.x * 4.0, vUv.y * 3.0 - uTime * uFlow * 0.6) + 9.0)) * uCrust;
  float h = uHeat * (0.75 + 0.5 * n + 0.25 * n2) * (1.0 - crust * 0.85);
  vec3 c = mix(vec3(0.55, 0.06, 0.0), vec3(1.0, 0.38, 0.04), smoothstep(0.2, 0.7, h));
  c = mix(c, vec3(1.0, 0.82, 0.45), smoothstep(0.75, 1.1, h));
  gl_FragColor = vec4(c * (0.6 + h * 2.2), 1.0);
}`
/** 铁水、钢坯这类发光的高温材料：会沿着 uv 的 v 方向流动。heat 0–1 亮度，flow 流速，crust 表面暗色浮渣的多少 */
export function useMolten(heat = 1, flow = 0.6, crust = 0.3) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: MOLTEN_FRAG, toneMapped: false, uniforms: { uTime: { value: 0 }, uHeat: { value: heat }, uFlow: { value: flow }, uCrust: { value: crust } } }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  mat.uniforms.uHeat.value = heat; mat.uniforms.uFlow.value = flow; mat.uniforms.uCrust.value = crust
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime })
  return mat
}
