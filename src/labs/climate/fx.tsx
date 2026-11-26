// 看得见的天气：一团团的云（软边贴片）、雨丝（往下落的短线）、沿着地面翻过大山的气流（流动的条纹管）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type V3 = [number, number, number]
let puffTex: THREE.CanvasTexture | null = null
/** 一团云的贴图：许多错开的径向渐变叠出来，中间实、边缘碎 */
function getPuff() {
  if (puffTex) return puffTex
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 40; i++) {
    const a = r() * 6.28, d = Math.pow(r(), 0.8) * 70, x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.75, R = 22 + r() * 46 * (1 - d / 110)
    const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(255,255,255,0.42)'); q.addColorStop(0.6, 'rgba(255,255,255,0.18)'); q.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = q; g.fillRect(0, 0, S, S)
  }
  puffTex = new THREE.CanvasTexture(c); puffTex.colorSpace = THREE.SRGBColorSpace
  return puffTex
}

/** 一片云：在一个范围里摆 n 团。amount 0 没有云、1 正常；dark 越大云底越灰（要下雨的云） */
export function Clouds({ c, size, n, r, amount, dark = 0, seed = 1, flat = 0.45, floor }: { c: V3; size: V3; n: number; r: [number, number]; amount: number; dark?: number; seed?: number; flat?: number; floor?: (x: number, z: number) => number }) {
  const st = useMemo(() => {
    let s = seed * 7919 + 17; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647
    const tex = getPuff()
    return Array.from({ length: n }, () => {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: true })
      const sp = new THREE.Sprite(m), k = rn()
      const p = new THREE.Vector3(c[0] + (rn() - 0.5) * size[0], c[1] + (rn() - 0.5) * size[1] * Math.pow(rn(), 0.7), c[2] + (rn() - 0.5) * size[2])
      const R = r[0] + (r[1] - r[0]) * rn()
      if (floor) p.y = floor(p.x, p.z) + R * 0.38 + rn() * size[1] * 0.45   // 贴着山坡往上爬：云底离坡面不远
      sp.scale.set(R, R * (1 - flat * 0.5), 1); sp.position.copy(p); m.rotation = rn() * 6.28; sp.renderOrder = 12
      return { sp, base: p.clone(), k, ph: rn() * 6.28, low: (p.y - (c[1] - size[1] / 2)) / Math.max(1, size[1]) }
    })
  }, [n, seed])   // eslint-disable-line react-hooks/exhaustive-deps
  const cur = useRef(0)
  const col = useMemo(() => new THREE.Color(), [])
  useFrame(({ clock }, d) => {
    cur.current += (amount - cur.current) * Math.min(1, d * 1.2)
    const t = clock.elapsedTime
    for (const q of st) {
      const m = q.sp.material as THREE.SpriteMaterial
      m.opacity = Math.min(1, cur.current * 1.15 - q.k * 0.15) * 0.95
      q.sp.visible = m.opacity > 0.01
      q.sp.position.set(q.base.x + Math.sin(t * 0.05 + q.ph) * size[0] * 0.02, q.base.y, q.base.z + Math.cos(t * 0.04 + q.ph) * size[2] * 0.02)
      // 云底暗、云顶亮
      const g = 1 - dark * (0.55 - q.low * 0.4)
      m.color.copy(col.setRGB(g * 0.97, g * 0.98, g))
    }
  })
  return <group>{st.map((q, i) => <primitive key={i} object={q.sp} />)}</group>
}

/** 雨：在 x0..x1、z0..z1 的范围里，从 top 落到地面（floor 给出每一点的地面高度）。amount 0–1 */
export function Rain({ box, top, floor, amount, n = 1600, len = 1.2, speed = 16, color = '#c9d8e6' }: { box: [number, number, number, number]; top: number; floor: (x: number, z: number) => number; amount: number; n?: number; len?: number; speed?: number; color?: string }) {
  const { geo, drops } = useMemo(() => {
    let s = 4242; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647
    const drops = Array.from({ length: n }, () => { const x = box[0] + rn() * (box[1] - box[0]), z = box[2] + rn() * (box[3] - box[2]), f = floor(x, z); return { x, z, f, y: f + rn() * (top - f), v: speed * (0.8 + rn() * 0.4) } })
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3))
    return { geo, drops }
  }, [n, box[0], box[1], box[2], box[3], top])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useRef<THREE.LineBasicMaterial>(null), cur = useRef(0)
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30)
    cur.current += (amount - cur.current) * Math.min(1, dt * 1.5)
    if (mat.current) mat.current.opacity = 0.55 * Math.min(1, cur.current * 1.5)
    const a = geo.attributes.position as THREE.BufferAttribute, arr = a.array as Float32Array, live = Math.floor(n * cur.current)
    for (let i = 0; i < n; i++) {
      const q = drops[i]
      q.y -= q.v * dt; if (q.y < q.f) q.y = top - (q.f - q.y) % 1
      const on = i < live ? 1 : 0, k = i * 6
      arr[k] = q.x; arr[k + 1] = on ? q.y : -9999; arr[k + 2] = q.z; arr[k + 3] = q.x - len * 0.08; arr[k + 4] = on ? q.y + len : -9999; arr[k + 5] = q.z
    }
    a.needsUpdate = true
  })
  return <lineSegments geometry={geo} frustumCulled={false} renderOrder={11}><lineBasicMaterial ref={mat} color={color} transparent opacity={0} depthWrite={false} /></lineSegments>
}

const FLOW_V = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const FLOW_F = /* glsl */`
uniform float uT, uOn; uniform vec3 uWet, uDry; uniform float uTurn;
varying vec2 vUv;
void main(){
  float u = vUv.x;
  float stripe = smoothstep(0.0, 0.25, fract(u * 26.0 - uT * 0.9)) * (1.0 - smoothstep(0.55, 0.75, fract(u * 26.0 - uT * 0.9)));
  float ends = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.93, 1.0, u));
  vec3 c = mix(uWet, uDry, smoothstep(uTurn - 0.06, uTurn + 0.08, u));
  float a = (0.28 + 0.72 * stripe) * ends * uOn;
  if (a < 0.01) discard;
  gl_FragColor = vec4(c, a * 0.85);
}`
/** 一股气流：沿着 pts 这条线流动的半透明条纹管。turn 是从湿（蓝）变干（橙）的位置（0–1），on 0–1 淡入淡出 */
export function Flow({ pts, r, on, turn = 2, wet = '#7fc8ff', dry = '#ffb15c' }: { pts: V3[]; r: number; on: number; turn?: number; wet?: string; dry?: string }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 200, r, 10), [pts, r])
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: FLOW_V, fragmentShader: FLOW_F, transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uWet: { value: new THREE.Color(wet) }, uDry: { value: new THREE.Color(dry) }, uTurn: { value: turn } } }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }, d) => { mat.uniforms.uT.value = clock.elapsedTime; mat.uniforms.uOn.value += (on - mat.uniforms.uOn.value) * Math.min(1, d * 2); mat.uniforms.uTurn.value = turn })
  return <mesh geometry={geo} material={mat} renderOrder={13} />
}
