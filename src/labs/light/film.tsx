// 第 4 课的器材：蘸了肥皂水的铁丝圈（装在一只能转的环形架里）、照着它的灯、一碟肥皂水。
// 肥皂膜上的条纹由着色器按膜厚逐点算：膜上薄下厚，厚度只跟高度有关，所以条纹总是水平的。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { Anod, ENV, Glow, Plastic } from './gear'
import { N_SOAP, NA, LIGHTS } from './physics'
import { ST, TOP } from './world'

const X0 = ST.film
/** 铁丝圈的圆心和半径 */
export const RING = { x: X0 + 0.35, y: TOP + 1.22, z: 0, r: 0.66 }
/** 灯的位置 */
export const LAMP = { x: X0 - 1.3, y: TOP + 0.95, z: 0.8 }

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const FRAG = `
varying vec2 vUv;
uniform float uAge, uRot, uWhite, uTime, uGain;
const float PI = 3.14159265, N = ${N_SOAP.toFixed(2)};
float thick(float v) { return mix(300.0 + 1500.0 * v, 2400.0 * pow(max(v, 0.0), 1.6), uAge); }
float refl(float t, float nm) { float s = sin(2.0 * PI * N * t / nm); return s * s; }
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p); if (r > 1.0) discard;
  // 膜跟着铁丝圈转了 uRot，但厚度只看这一点在世界里有多高
  float wy = p.x * sin(uRot) + p.y * cos(uRot), wx = p.x * cos(uRot) - p.y * sin(uRot);
  float v = clamp(0.5 - wy * 0.5, 0.0, 1.0);
  v += 0.004 * sin(wx * 5.0 + uTime * 0.5) + 0.002 * sin(wx * 12.0 - uTime * 0.35 + wy * 3.0);   // 膜面有一点起伏，条纹不是笔直的
  float t = thick(v);
  vec3 mono = vec3(1.0, 0.72, 0.12) * refl(t, ${NA.toFixed(1)});
  vec3 white = vec3(refl(t, ${LIGHTS.red.nm}.0), refl(t, ${LIGHTS.green.nm}.0), refl(t, ${LIGHTS.blue.nm}.0)) * vec3(1.0, 0.95, 1.0);
  vec3 c = mix(mono, white, uWhite);
  float rim = smoothstep(1.0, 0.94, r);
  gl_FragColor = vec4(c * uGain * rim * (0.85 + 0.15 * (1.0 - r * r)) + vec3(0.012, 0.016, 0.022), 1.0);
}`

const HOLDER = lathe([[0.7, -0.035], [0.83, -0.035], [0.84, -0.025], [0.84, 0.025], [0.83, 0.035], [0.7, 0.035]], { segs: 72, closed: true })
const RACE = lathe([[0.672, -0.02], [0.7, -0.02], [0.7, 0.02], [0.672, 0.02]], { segs: 72, closed: true })
const BASE = lathe([[0, 0], [0.3, 0], [0.32, 0.012], [0.32, 0.04], [0.29, 0.055], [0.06, 0.07], [0.045, 0.1], [0, 0.1]], { segs: 48 })
let dial: THREE.CanvasTexture | null = null
/** 环形架正面的一圈角度刻线 */
function getDial() {
  if (dial) return dial
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.translate(S / 2, S / 2); g.strokeStyle = '#d8dadc'; g.fillStyle = '#d8dadc'; g.font = '600 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let a = 0; a < 360; a += 5) {
    const r0 = S / 2 * (a % 30 === 0 ? 0.865 : 0.885), r1 = S / 2 * 0.915, t = a * Math.PI / 180
    g.lineWidth = a % 30 === 0 ? 4 : 2; g.beginPath(); g.moveTo(Math.sin(t) * r0, -Math.cos(t) * r0); g.lineTo(Math.sin(t) * r1, -Math.cos(t) * r1); g.stroke()
    if (a % 30 === 0) g.fillText(String(a), Math.sin(t) * S / 2 * 0.955, -Math.cos(t) * S / 2 * 0.955)
  }
  dial = new THREE.CanvasTexture(c); dial.colorSpace = THREE.SRGBColorSpace; dial.anisotropy = 8
  return dial
}

/** 铁丝圈和肥皂膜。age：肥皂水流了多久（0–1）；rot：铁丝圈转过的角度（度）；white：用白光照（0–1）；on：有没有膜 */
export function SoapFilm({ age, rot, white, gain = 1 }: { age: number; rot: number; white: number; gain?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { uAge: { value: 0 }, uRot: { value: 0 }, uWhite: { value: 0 }, uTime: { value: 0 }, uGain: { value: 1 } } }), [])
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt })
  const u = mat.uniforms, a = rot * Math.PI / 180
  u.uAge.value = age; u.uRot.value = a; u.uWhite.value = white; u.uGain.value = gain
  const { x, y, z, r } = RING, dialTex = useMemo(getDial, [])
  return <group>
    <group position={[x, y, z]}>
      {/* 固定的环形架：一圈黑色的铝环，正面刻着角度 */}
      <mesh geometry={HOLDER} rotation-x={Math.PI / 2} castShadow><Anod /></mesh>
      <mesh position-z={0.0355}><ringGeometry args={[0.7, 0.84, 72]} /><meshStandardMaterial map={dialTex} transparent roughness={0.6} /></mesh>
      {/* 能转的内圈、铁丝圈和它的柄 */}
      <group rotation-z={-a}>
        <mesh geometry={RACE} rotation-x={Math.PI / 2}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
        <mesh><torusGeometry args={[r, 0.011, 10, 96]} /><Metal kind="steel" rough={0.4} env={ENV} /></mesh>
        <mesh position={[0, r + 0.1, 0.03]}><cylinderGeometry args={[0.011, 0.011, 0.22, 10]} /><Metal kind="steel" rough={0.4} env={ENV} /></mesh>
        <mesh position={[0, r + 0.2, 0.045]}><sphereGeometry args={[0.034, 16, 12]} /><Plastic color="#b3271e" /></mesh>
        <mesh material={mat} renderOrder={6}><circleGeometry args={[r - 0.008, 96]} /></mesh>
      </group>
      {/* 环形架下面的柄，插进底座的立柱 */}
      <mesh position={[0, -0.87, 0]}><cylinderGeometry args={[0.03, 0.03, 0.08, 16]} /><Metal kind="stainless" env={ENV} /></mesh>
    </group>
    <mesh position={[x, (TOP + 0.1 + y - 0.9) / 2, z]} castShadow><cylinderGeometry args={[0.022, 0.022, y - 0.9 - TOP - 0.1, 16]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
    <mesh geometry={BASE} position={[x, TOP, z]} castShadow receiveShadow><Metal kind="iron" grain="cast" env={3} /></mesh>
  </group>
}

const HOOD = shell([[0.2, 0], [0.2, 0.16], [0.215, 0.18]], 0.012, { segs: 4 })
/** 灯：一只方的灯箱，正面一块发光的窗，窗外一圈遮光罩，立在底座上；朝着肥皂膜。color：发什么颜色的光 */
export function FilmLamp({ color }: { color: string }) {
  const { x, y, z } = LAMP, yaw = Math.atan2(RING.x - x, RING.z + 0.6 - z)
  const cord = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x - 0.1, y - 0.2, z - 0.26), new THREE.Vector3(x - 0.2, TOP + 0.1, z - 0.45), new THREE.Vector3(x - 0.5, TOP + 0.014, z - 0.8), new THREE.Vector3(x - 0.4, TOP + 0.014, z - 1.8)]), 32, 0.012, 8), [x, y, z])
  const tint = useRef<THREE.MeshBasicMaterial>(null), light = useRef<THREE.PointLight>(null), goal = useMemo(() => new THREE.Color(color), [color])
  useFrame((_, dt) => { tint.current?.color.lerp(goal, Math.min(1, dt * 5)); light.current?.color.lerp(goal, Math.min(1, dt * 5)) })
  return <group>
    <group position={[x, y, z]} rotation-y={yaw}>
      <RoundedBox args={[0.52, 0.62, 0.42]} radius={0.03} smoothness={3} castShadow><meshStandardMaterial color="#2a2f35" metalness={0.55} roughness={0.5} envMapIntensity={ENV} /></RoundedBox>
      {/* 顶上的散热格栅 */}
      {[-0.15, -0.075, 0, 0.075, 0.15].map(k => <mesh key={k} position={[k, 0.312, 0]}><boxGeometry args={[0.03, 0.006, 0.3]} /><meshBasicMaterial color="#050607" /></mesh>)}
      <mesh geometry={HOOD} position={[0, 0, 0.21]} rotation-x={Math.PI / 2} rotation-y={Math.PI / 4}><Anod rough={0.6} /></mesh>
      <mesh position={[0, 0, 0.222]}><planeGeometry args={[0.26, 0.26]} /><meshBasicMaterial ref={tint} color={color} toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, 0, 0.7]} intensity={1.6} distance={4} decay={1.5} color={color} />
      <mesh position={[0, -0.36, 0]}><cylinderGeometry args={[0.03, 0.03, 0.1, 16]} /><Metal kind="stainless" env={ENV} /></mesh>
    </group>
    <mesh position={[x, (TOP + 0.1 + y - 0.4) / 2, z]} castShadow><cylinderGeometry args={[0.022, 0.022, y - 0.4 - TOP - 0.1, 16]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
    <mesh geometry={BASE} position={[x, TOP, z]} scale={0.8} castShadow receiveShadow><Metal kind="iron" grain="cast" env={3} /></mesh>
    <mesh geometry={cord}><Plastic color="#0e0f11" /></mesh>
  </group>
}

const DISH = shell([[0, 0], [0.33, 0], [0.34, 0.01], [0.34, 0.1]], 0.012, { segs: 48 }), LIQUID = disc(0.326, 0.05, { chamfer: 0.002 })
/** 一碟肥皂水：浅的玻璃培养皿，里面半碟发一点蓝的肥皂水 */
export function SoapDish({ x, z }: { x: number; z: number }) {
  return <group position={[x, TOP + 0.002, z]}>
    <mesh geometry={LIQUID} position-y={0.013}><meshPhysicalMaterial color="#9ec9d8" roughness={0.05} transparent opacity={0.6} envMapIntensity={2} /></mesh>
    <mesh geometry={DISH} renderOrder={4}><meshPhysicalMaterial color="#dff1f6" transparent opacity={0.22} roughness={0.03} envMapIntensity={2.4} depthWrite={false} side={THREE.DoubleSide} clearcoat={1} /></mesh>
  </group>
}

/** 灯照到膜上的那束光 */
export function LampGlow({ color, k = 1 }: { color: string; k?: number }) {
  return <mesh position={[RING.x, RING.y, RING.z - 0.01]}><circleGeometry args={[RING.r * 0.98, 48]} /><Glow color={color} opacity={0.035 * k} /></mesh>
}
