// 看得见的现象：酒精灯的火焰、白汽、气泡、晶体（立方的氯化钠、针状的硝酸钾）、正在溶解的晶粒、悬浮的泥沙、油滴。
// 火焰是一张转向镜头的着色器面片；白汽是软边贴片粒子；晶体、颗粒、油滴都是实例化的小块，每帧按状态重排。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type V3 = [number, number, number]
const rnd = (seed: number) => { let s = seed * 104729 + 11; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
const dummy = new THREE.Object3D()
const sph = new THREE.SphereGeometry(1, 12, 8)
const cube = new THREE.BoxGeometry(1, 1, 1)
/** 针状晶体：细长的六棱柱，两头削尖 */
const needle = (() => { const g = new THREE.CylinderGeometry(0.18, 0.18, 1, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (Math.abs(y) > 0.49) { p.setX(i, p.getX(i) * 0.25); p.setZ(i, p.getZ(i) * 0.25) } } g.computeVertexNormals(); return g })()

// ---------- 火焰 ----------
const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const FRAG = /* glsl */`
uniform float uTime, uLevel;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
void main() {
  float y = vUv.y, x = (vUv.x - 0.5) * 2.0, t = uTime * 2.2;
  float n = fbm(vec2(x * 1.6, y * 2.4 - t)), n2 = fbm(vec2(x * 3.1, y * 4.0 - t * 1.4));
  float sway = (n - 0.5) * 0.5 * y * 1.1 + sin(t * 0.7) * 0.05 * y;
  float w = 0.92 * pow(max(0.0, 1.0 - y), 0.62) * pow(clamp(y / 0.16, 0.0, 1.0), 0.45) + 0.02;
  float d = abs(x + sway) / w;
  float body = 1.0 - d - y * (0.32 + n2 * 0.45) + (n - 0.5) * 0.25;
  float m = smoothstep(0.0, 0.32, body);
  if (m < 0.002) discard;
  float core = smoothstep(0.25, 0.85, body) * (1.0 - y * 0.8);
  vec3 c = mix(vec3(0.9, 0.2, 0.04), vec3(1.0, 0.5, 0.12), smoothstep(0.0, 0.35, m));
  c = mix(c, vec3(1.0, 0.82, 0.4), core);
  float blue = 1.6 * (1.0 - smoothstep(0.0, 0.32, y)) * smoothstep(0.0, 0.05, y) * (1.0 - core * 0.6);
  c = mix(c, vec3(0.25, 0.45, 1.0), clamp(blue, 0.0, 0.9));
  c *= vec3(0.78, 0.88, 1.15);
  float a = m * (0.55 + 0.45 * (1.0 - smoothstep(0.4, 1.0, y))) * uLevel;
  gl_FragColor = vec4(c * 1.4 * a, a * 0.85);
}`
/** 酒精灯的火焰：底在 at，宽 w、高 h；level 0 熄灭、1 正常。始终转向镜头，配一盏闪动的暖光 */
export function Flame({ at, w, h, level = 1 }: { at: V3; w: number; h: number; level?: number }) {
  const g = useRef<THREE.Group>(null), pl = useRef<THREE.PointLight>(null)
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uTime: { value: 0 }, uLevel: { value: level } } }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useMemo(() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0, 0.5, 0); return p }, [])
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, clock }) => {
    const gr = g.current; if (!gr) return
    mat.uniforms.uTime.value = clock.elapsedTime; mat.uniforms.uLevel.value = Math.min(1, level * 1.4)
    gr.getWorldPosition(v); gr.rotation.y = Math.atan2(camera.position.x - v.x, camera.position.z - v.z)
    const s = 0.25 + 0.75 * level; gr.scale.set(s, Math.max(0.001, level ** 0.8), s); gr.visible = level > 0.01
    if (pl.current) { const t = clock.elapsedTime * 9; pl.current.intensity = 6 * level * (0.82 + 0.12 * Math.sin(t) + 0.08 * Math.sin(t * 2.7 + 1.3)) }
  })
  return <group position={at}>
    <group ref={g}><mesh geometry={geo} material={mat} scale={[w, h, 1]} renderOrder={20} /></group>
    <pointLight ref={pl} position={[0, h * 0.45, 0]} color="#ffb070" distance={h * 16} decay={1.8} intensity={0} />
  </group>
}

// ---------- 白汽 ----------
let puffTex: THREE.CanvasTexture | null = null
function getPuff() {
  if (puffTex) return puffTex
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rnd(3)
  for (let i = 0; i < 14; i++) { const ox = (r() - 0.5) * 30, oy = (r() - 0.5) * 30, x = S / 2 + ox, y = S / 2 + oy, R = Math.min(62 - Math.max(Math.abs(ox), Math.abs(oy)), 20 + r() * 26)
    const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(255,255,255,0.32)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, S, S) }
  puffTex = new THREE.CanvasTexture(c); puffTex.colorSpace = THREE.SRGBColorSpace
  return puffTex
}
/** 从 at 一带往上飘的白汽：rate 每秒几团，s 大小（场景单位），jitter 出生点散开的半径 */
export function Steam({ at, on, s, rate = 8, jitter = 0.1, opacity = 0.4 }: { at: V3; on: boolean; s: number; rate?: number; jitter?: number; opacity?: number }) {
  const life = 2.4, N = Math.ceil(rate * life) + 2
  const st = useMemo(() => {
    const sprites = Array.from({ length: N }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getPuff(), color: '#f1f4f6', transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; sp.renderOrder = 15; return sp })
    return { sprites, p: sprites.map(() => ({ age: 1e9, pos: new THREE.Vector3(), vx: 0, vz: 0, rot: 0 })), acc: 0, next: 0, r: rnd(7) }
  }, [N])
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30)
    if (on) st.acc += rate * dt
    while (st.acc >= 1) { st.acc -= 1; const q = st.p[st.next]; st.next = (st.next + 1) % N; q.age = 0; q.pos.set(at[0] + (st.r() - 0.5) * jitter * 2, at[1], at[2] + (st.r() - 0.5) * jitter * 2); q.vx = (st.r() - 0.5) * 0.2 * s; q.vz = (st.r() - 0.5) * 0.2 * s; q.rot = st.r() * 6 }
    st.p.forEach((q, i) => {
      const sp = st.sprites[i]; q.age += dt
      if (q.age > life) { sp.visible = false; return }
      const k = q.age / life; q.pos.x += q.vx * dt; q.pos.z += q.vz * dt; q.pos.y += s * 0.6 * dt
      const size = s * (0.3 + 1.6 * Math.sqrt(k))
      sp.visible = true; sp.position.copy(q.pos); sp.scale.set(size, size, 1)
      const m = sp.material as THREE.SpriteMaterial; m.opacity = opacity * Math.min(1, k / 0.15) * (1 - k) ** 1.4; m.rotation = q.rot + q.age * 0.3
    })
  })
  return <group>{st.sprites.map((sp, i) => <primitive key={i} object={sp} />)}</group>
}

// ---------- 气泡 ----------
/** 一串往上冒的气泡：从 at 一带冒出，升到 top（相对 at 的高度）消失。on 为假时不再冒新的 */
export function Bubbles({ at, top, on, rate = 30, r = 0.01, spread = 0.02, speed = 0.4, seed = 1 }: { at: V3; top: number; on: boolean; rate?: number; r?: number; spread?: number; speed?: number; seed?: number }) {
  const N = Math.min(200, Math.ceil(rate * top / speed * 1.3) + 4)
  const ref = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => ({ p: Array.from({ length: N }, () => ({ age: 1e9, x: 0, z: 0, v: 0, s: 1, w: 0 })), acc: 0, next: 0, r: rnd(seed) }), [N, seed])
  useFrame((_, d) => {
    const m = ref.current; if (!m) return
    const dt = Math.min(d, 1 / 30)
    if (on) st.acc += rate * dt
    while (st.acc >= 1) { st.acc -= 1; const q = st.p[st.next]; st.next = (st.next + 1) % N; const a = st.r() * 6.283, rr = Math.sqrt(st.r()) * spread; q.age = 0; q.x = Math.cos(a) * rr; q.z = Math.sin(a) * rr; q.v = speed * (0.7 + st.r() * 0.6); q.s = 0.5 + st.r() * 0.8; q.w = st.r() * 6 }
    st.p.forEach((q, i) => {
      const y = q.age * q.v; q.age += dt
      if (y > top) dummy.scale.setScalar(0)
      else { dummy.position.set(at[0] + q.x + Math.sin(q.age * 9 + q.w) * r * 0.4, at[1] + y, at[2] + q.z); dummy.scale.setScalar(r * q.s * Math.min(1, q.age * 8)) }
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[sph, undefined, N]} renderOrder={9} frustumCulled={false}><meshPhysicalMaterial color="#ffffff" transparent opacity={0.55} roughness={0.05} clearcoat={1} envMapIntensity={2} depthWrite={false} /></instancedMesh>
}

// ---------- 晶体 ----------
/**
 * 一堆晶体：底面在 at，堆在半径 R 的圆里，中间高、四周低。shape：cube 立方的氯化钠，needle 针状的硝酸钾。
 * amount 0–1：现在有多少（按顺序一颗颗长出来、或者一颗颗溶掉）；size 单颗的大小。wall 为真时有一部分长在杯壁上（降温结晶）
 */
export function Crystals({ at, R, amount, shape = 'cube', size, n = 120, color = '#f7f7f4', seed = 1, wall = 0, heap = 1 }: { at: V3; R: number; amount: number; shape?: 'cube' | 'needle'; size: number; n?: number; color?: string; seed?: number; wall?: number; heap?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => { const r = rnd(seed); return Array.from({ length: n }, (_, i) => {
    const onWall = i % 5 === 0 && wall > 0, a = r() * 6.283
    if (onWall) return { x: Math.cos(a) * R * 1.02, z: Math.sin(a) * R * 1.02, y: size + r() * wall, rx: r() * 3, ry: a, rz: Math.PI / 2 + (r() - 0.5), s: 0.6 + r() * 0.8 }
    const rr = Math.sqrt(r()) * R, y = (1 - rr / R) * size * 3.2 * heap * (0.5 + r() * 0.5) + size * 0.4
    return { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y, rx: r() * 3, ry: r() * 3, rz: shape === 'needle' ? Math.PI / 2 + (r() - 0.5) * 0.8 : r() * 3, s: 0.6 + r() * 0.8 }
  }) }, [n, R, size, seed, wall, shape, heap])
  useFrame(() => {
    const m = ref.current; if (!m) return
    const shown = amount * n
    pts.forEach((p, i) => {
      const g = Math.max(0, Math.min(1, shown - i))       // 这一颗长到多大（0–1）
      dummy.position.set(at[0] + p.x, at[1] + p.y * (0.6 + 0.4 * Math.min(1, amount * 1.5)), at[2] + p.z)
      dummy.rotation.set(p.rx, p.ry, p.rz)
      const s = size * p.s * Math.cbrt(g)
      if (shape === 'needle') dummy.scale.set(s * 0.9, s * 3.2, s * 0.9); else dummy.scale.setScalar(s)
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[shape === 'needle' ? needle : cube, undefined, n]} renderOrder={4} frustumCulled={false} castShadow>
    <meshPhysicalMaterial color={color} roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.2} transmission={0} envMapIntensity={1.4} />
  </instancedMesh>
}

/**
 * 加进水里、正在溶解的晶粒：从液面 H 处一颗颗落下（fall 0–1 是落下去的进度），一边落一边变小，left 是还剩多少（0–1）。
 * 没溶完的落到杯底。底面在 at，散在半径 R 里
 */
export function Grains({ at, R, H, fall, left, size, n = 60, color = '#f7f7f2', seed = 2, swirl = 0 }: { at: V3; R: number; H: number; fall: number; left: number; size: number; n?: number; color?: string; seed?: number; swirl?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => { const r = rnd(seed); return Array.from({ length: n }, () => ({ a: r() * 6.283, rr: Math.sqrt(r()) * R * 0.5, d: r() * 0.45, sp: 0.7 + r() * 0.6, s: 0.6 + r() * 0.7, rot: r() * 3 })) }, [n, R, seed])
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return
    const t = clock.elapsedTime
    pts.forEach((p, i) => {
      const k = Math.max(0, Math.min(1, (fall - p.d) * p.sp * 1.8))
      const a = p.a + swirl * t * 2.2, rr = p.rr + k * R * 0.35
      const vis = fall > p.d ? 1 : 0
      dummy.position.set(at[0] + Math.cos(a) * rr, at[1] + H * (1 - k) + size * 0.5, at[2] + Math.sin(a) * rr)
      dummy.rotation.set(p.rot + t * swirl, p.rot, 0)
      dummy.scale.setScalar(size * p.s * vis * Math.max(0, left))
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[cube, undefined, n]} renderOrder={4} frustumCulled={false}><meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.6} /></instancedMesh>
}

/**
 * 悬浮在水里的颗粒（泥沙、油滴）：均匀散在一个圆柱里（底面在 at、半径 R、高 H）。
 * mix 0–1 搅散的程度（0 时都堆在 home 处：泥沙在杯底、油在液面）；settle 0–1 静置的进度（泥沙落回杯底、油滴浮回液面）。
 * home：'bottom' 或 'top'
 */
export function Suspended({ at, R, H, mix, settle, home, size, n = 140, color, opacity = 0.9, seed = 3, swirl = 0, round = false, merge = false }: { at: V3; R: number; H: number; mix: number; settle: number; home: 'bottom' | 'top'; size: number; n?: number; color: string; opacity?: number; seed?: number; swirl?: number; round?: boolean; merge?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => { const r = rnd(seed); return Array.from({ length: n }, () => ({ a: r() * 6.283, rr: Math.sqrt(r()) * R * 0.92, y: r(), heavy: r(), ph: r() * 6.3, s: 0.5 + r() * 0.9 })) }, [n, R, seed])
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return
    const t = clock.elapsedTime, vis = mix > 0.02 ? 1 : 0
    pts.forEach((p, i) => {
      const back = Math.min(1, settle * (0.6 + p.heavy * 0.9))           // 重的先回去
      const yHome = home === 'bottom' ? size : H - size * 0.6
      const y = (p.y * H * mix + yHome * (1 - mix)) * (1 - back) + yHome * back
      const a = p.a + swirl * t * 2.4 * (1 - back), wob = (1 - back) * R * 0.03
      dummy.position.set(at[0] + Math.cos(a) * p.rr + Math.sin(t * 0.7 + p.ph) * wob, at[1] + y, at[2] + Math.sin(a) * p.rr)
      dummy.rotation.set(p.ph, p.ph * 2, 0)
      dummy.scale.setScalar(size * p.s * vis * (merge ? 1 - back : 1))
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[round ? sph : cube, undefined, n]} renderOrder={4} frustumCulled={false}><meshStandardMaterial color={color} roughness={round ? 0.2 : 1} transparent opacity={opacity} depthWrite={false} /></instancedMesh>
}

/* merge：静置回去以后并进那一层（油滴并成油层），不再单独画 */
/** 烧杯外壁凝出的小水珠：贴在半径 R 的圆柱面上，高 0–H 之间；k 0–1 凝了多少 */
export function Dew({ at, R, H, k, n = 80, seed = 5 }: { at: V3; R: number; H: number; k: number; n?: number; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => { const r = rnd(seed); return Array.from({ length: n }, () => ({ a: r() * 6.283, y: r() * 0.85, s: 0.4 + r() * 0.8, d: r() })) }, [n, seed])
  useFrame(() => {
    const m = ref.current; if (!m) return
    pts.forEach((p, i) => {
      const g = Math.max(0, Math.min(1, (k - p.d * 0.7) * 3))
      dummy.position.set(at[0] + Math.cos(p.a) * R, at[1] + p.y * H, at[2] + Math.sin(p.a) * R)
      dummy.rotation.set(0, -p.a, 0); dummy.scale.set(R * 0.035 * p.s * g * 0.6, R * 0.035 * p.s * g, R * 0.035 * p.s * g * 0.6)
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[sph, undefined, n]} renderOrder={8} frustumCulled={false}><meshPhysicalMaterial color="#ffffff" transparent opacity={0.6} roughness={0.02} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /></instancedMesh>
}
