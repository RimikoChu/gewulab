// 剖面上的几样会动的东西：火山喷发（火山灰柱、飞溅的熔岩、火山口的红光）、地震（震源和一圈圈往外传的地震波）、
// 大洋钻探船（第 2 课去洋底取岩芯）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal } from '@/lab-kit'

// ---------- 火山喷发 ----------
const PUFF_V = /* glsl */`
attribute float aSeed; uniform float uT, uOn, uSize, uRise, uSpread, uLife, uBallistic; varying float vA; varying float vK;
void main() {
  float life = fract(aSeed * 7.31 + uT / uLife), s2 = fract(aSeed * 13.7), s3 = fract(aSeed * 29.3);
  vec3 p;
  if (uBallistic > 0.5) {                                   // 熔岩块：抛出去再落下来
    float ang = (s2 - 0.5) * 1.6, v = uRise * (0.6 + 0.6 * s3), t = life * 1.6;
    p = vec3(sin(ang) * v * t, cos(ang) * v * t - 3.4 * t * t, (s3 - 0.5) * 0.6);
  } else {                                                  // 火山灰：往上冲，越高越散开，被风往东吹
    float h = uRise * (1.0 - pow(1.0 - life, 2.2));
    float r = uSpread * life * (0.4 + s2);
    p = vec3(cos(s3 * 6.28) * r + h * 0.22 * life, h, sin(s3 * 6.28) * r * 0.6);
  }
  vA = uOn * smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.6, 1.0, life)); vK = life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.5 + life * (uBallistic > 0.5 ? 0.2 : 1.6)) * 300.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const PUFF_F = /* glsl */`
uniform vec3 uC0, uC1; uniform float uBallistic; varying float vA; varying float vK;
void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
  float a = vA * (uBallistic > 0.5 ? (1.0 - smoothstep(0.25, 0.5, r)) : (1.0 - smoothstep(0.1, 0.5, r)) * 0.55);
  gl_FragColor = vec4(mix(uC0, uC1, vK), a); }`
function Puffs({ n, on, ballistic, size, rise, spread, life, c0, c1, additive }: { n: number; on: number; ballistic?: boolean; size: number; rise: number; spread: number; life: number; c0: string; c1: string; additive?: boolean }) {
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(), s = new Float32Array(n), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) s[i] = i / n + Math.sin(i * 12.9898) * 0.5; g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1)); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g }, [n])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PUFF_V, fragmentShader: PUFF_F, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uSize: { value: size }, uRise: { value: rise }, uSpread: { value: spread }, uLife: { value: life }, uBallistic: { value: ballistic ? 1 : 0 }, uC0: { value: new THREE.Color(c0) }, uC1: { value: new THREE.Color(c1) } },
  }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => { mat.uniforms.uT.value += Math.min(dt, 1 / 30); mat.uniforms.uOn.value += (on - mat.uniforms.uOn.value) * Math.min(1, dt * 2) })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}
/** 火山喷发：at 是火山口（场景坐标），on 0–1 */
export function Eruption({ at, on, scale = 1 }: { at: [number, number, number]; on: number; scale?: number }) {
  const light = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => { if (light.current) light.current.intensity = on * (40 + 14 * Math.sin(clock.elapsedTime * 9) + 8 * Math.sin(clock.elapsedTime * 23)) * scale })
  return (
    <group position={at}>
      <Puffs n={320} on={on} size={4.2 * scale} rise={20 * scale} spread={6 * scale} life={5} c0="#3b3532" c1="#8d8681" />
      <Puffs n={90} on={on} ballistic size={0.5 * scale} rise={7 * scale} spread={0} life={1.6} c0="#ffb347" c1="#ff4a12" additive />
      <mesh scale={on > 0.02 ? 1 : 0}><sphereGeometry args={[0.7 * scale, 16, 12]} /><meshBasicMaterial color="#ff7a1f" toneMapped={false} transparent opacity={0.85 * on} /></mesh>
      <pointLight ref={light} color="#ff7b2c" distance={30 * scale} decay={1.6} position={[0, 1.2, 1.5]} />
    </group>
  )
}

// ---------- 地震 ----------
/** 地震：focus 震源、epi 震中（都在剖面上，z = 0）；t 是这一次地震过去了多久（秒），小于 0 表示没有 */
export function Quake({ focus, epi, t, color = '#ffe14d' }: { focus: [number, number]; epi: [number, number]; t: number; color?: string }) {
  const rings = [0, 0.45, 0.9]
  if (t < 0) return null
  const fade = Math.max(0, 1 - t / 5)
  return (
    <group>
      {/* 地震波：从震源一圈圈往外传 */}
      {rings.map((d, i) => { const k = t - d; if (k <= 0 || k > 2.6) return null; const r = 0.4 + k * 9; return <mesh key={i} position={[focus[0], focus[1], 0.12]} renderOrder={5}><ringGeometry args={[r, r + 0.22, 96]} /><meshBasicMaterial color={color} transparent opacity={(1 - k / 2.6) * 0.9} depthWrite={false} toneMapped={false} /></mesh> })}
      {/* 震源：一颗亮点，旁边一圈光 */}
      <mesh position={[focus[0], focus[1], 0.16]} renderOrder={6}><circleGeometry args={[0.55, 24]} /><meshBasicMaterial color="#fff6c8" transparent opacity={Math.max(0.6, fade)} toneMapped={false} /></mesh>
      <mesh position={[focus[0], focus[1], 0.14]} renderOrder={6}><ringGeometry args={[0.7, 1.05, 32]} /><meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} /></mesh>
      {/* 震源到震中的虚线 */}
      {Array.from({ length: Math.max(1, Math.floor((epi[1] - focus[1]) / 1.4)) }, (_, i) => { const y = focus[1] + 1.2 + i * 1.4; return y < epi[1] - 0.3 ? <mesh key={i} position={[focus[0] + (epi[0] - focus[0]) * ((y - focus[1]) / (epi[1] - focus[1])), y, 0.13]}><planeGeometry args={[0.16, 0.7]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} /></mesh> : null })}
      {/* 震中：地面上的一个红圈 */}
      <mesh position={[epi[0], epi[1] + 0.05, 0.14]} renderOrder={6}><ringGeometry args={[0.5, 0.85, 32]} /><meshBasicMaterial color="#ff4a3d" toneMapped={false} /></mesh>
    </group>
  )
}

// ---------- 大洋钻探船 ----------
/** 船身：俯视是一头尖的长条，往上拉出干舷，带一圈倒角 */
function hullGeo() {
  const L = 7.4, B = 1.3, s = new THREE.Shape()
  s.moveTo(-L / 2, -B / 2); s.lineTo(L / 2 - 1.4, -B / 2); s.quadraticCurveTo(L / 2, -B / 2, L / 2 + 0.25, 0); s.quadraticCurveTo(L / 2, B / 2, L / 2 - 1.4, B / 2); s.lineTo(-L / 2, B / 2); s.lineTo(-L / 2, -B / 2)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 16 })
  g.rotateX(-Math.PI / 2); g.translate(0, -0.35, 0)
  return g
}
/** 井架：四根立柱往上收，中间一道道横撑和斜撑 */
function derrickGeo() {
  const parts: THREE.BufferGeometry[] = [], H = 3.6, b = 0.55, t = 0.14
  const leg = (sx: number, sz: number) => { const a = new THREE.Vector3(sx * b, 0, sz * b), c = new THREE.Vector3(sx * t, H, sz * t); const g = new THREE.CylinderGeometry(0.035, 0.035, a.distanceTo(c), 6); g.translate(0, a.distanceTo(c) / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); return g }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) parts.push(leg(sx, sz))
  for (let k = 1; k < 7; k++) {
    const y = (k / 7) * H, w = b + (t - b) * (k / 7)
    for (const sgn of [1, -1]) {
      const fz = new THREE.BoxGeometry(w * 2, 0.04, 0.04); fz.translate(0, y, sgn * w); parts.push(fz)       // 前后两道
      const fx = new THREE.BoxGeometry(0.04, 0.04, w * 2); fx.translate(sgn * w, y, 0); parts.push(fx)       // 左右两道
    }
  }
  return mergeGeometries(parts.map(g => g.toNonIndexed()))
}
/** 钻探船：x 是船在剖面上的位置；pipe 是钻杆放下去多深（画面单位）。船停在剖面后面一点的海面上 */
export function DrillShip({ x, pipe, z = -3.2 }: { x: number; pipe: number; z?: number }) {
  const hull = useMemo(hullGeo, []), derrick = useMemo(derrickGeo, [])
  const bob = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (bob.current) { bob.current.position.y = 0.05 + Math.sin(clock.elapsedTime * 1.1) * 0.04; bob.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.012 } })
  return (
    <group position={[x, 0, z]}>
      <group ref={bob}>
        <mesh geometry={hull} castShadow><meshStandardMaterial color="#1f2a36" roughness={0.55} metalness={0.2} /></mesh>
        {/* 水线以下的红漆、甲板 */}
        <mesh position={[0.2, -0.28, 0]}><boxGeometry args={[7.2, 0.14, 1.36]} /><meshStandardMaterial color="#9b2e24" roughness={0.6} /></mesh>
        <mesh position={[0.1, 0.43, 0]}><boxGeometry args={[7.0, 0.04, 1.25]} /><meshStandardMaterial color="#6e6a5f" roughness={0.8} /></mesh>
        {/* 船尾的生活楼和直升机平台 */}
        <RoundedBox args={[1.6, 1.1, 1.1]} radius={0.06} position={[-2.6, 1.0, 0]} castShadow><meshStandardMaterial color="#eef0ec" roughness={0.45} /></RoundedBox>
        <RoundedBox args={[1.0, 0.5, 0.9]} radius={0.05} position={[-2.7, 1.8, 0]} castShadow><meshStandardMaterial color="#eef0ec" roughness={0.45} /></RoundedBox>
        {[0, 1, 2].map(i => <mesh key={i} position={[-2.0 + 0.001, 1.2 - i * 0.28, 0]}><boxGeometry args={[0.02, 0.12, 0.9]} /><meshStandardMaterial color="#25313b" roughness={0.2} /></mesh>)}
        <mesh position={[3.0, 0.7, 0]}><cylinderGeometry args={[0.8, 0.8, 0.06, 6]} /><meshStandardMaterial color="#d9a52b" roughness={0.6} /></mesh>
        {/* 船中间的井架和钻台 */}
        <mesh position={[0.4, 0.62, 0]}><boxGeometry args={[1.5, 0.36, 1.2]} /><meshStandardMaterial color="#d7d9d5" roughness={0.5} /></mesh>
        <mesh geometry={derrick} position={[0.4, 0.8, 0]} castShadow><Metal kind="steel" rough={0.5} /></mesh>
        <mesh position={[0.4, 4.45, 0]}><boxGeometry args={[0.42, 0.18, 0.42]} /><meshStandardMaterial color="#e8b32c" roughness={0.5} /></mesh>
      </group>
      {/* 钻杆：从井架中间垂下去 */}
      {pipe > 0.05 && <mesh position={[0.4, -pipe / 2 + 0.4, 0]}><cylinderGeometry args={[0.06, 0.06, pipe + 0.8, 8]} /><Metal kind="steel" grain="turned" rough={0.35} /></mesh>}
    </group>
  )
}
