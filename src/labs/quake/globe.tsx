// 太空里的地球（NASA 实拍影像，公有领域；和板块运动、地球的运动实验室用同一张图）。
// 第 6 课切掉朝镜头的四分之一，两个切面露出地壳、地幔、外核、内核；从顶上的震源发出纵波、横波射线，画在朝镜头的切面上。
// 拓展课恢复成完整的地球，画出两条地震带和沿带分布的地震（示意）。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { R_CMB, R_E, R_ICB, R_MOHO, SHADOW, rayFan } from './physics'
import { BELTS, type BeltKey, type LL } from './belts'

/** 地球的位置和半径：沙盘正上方很高的太空里 */
export const GLOBE = new THREE.Vector3(0, 4000, 0), RG = 60
const RAD = Math.PI / 180
/** 经纬度 → 单位向量（和球面贴图的经纬度一致） */
export const toVec = ([lon, lat]: LL) => new THREE.Vector3(Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.sin(lat * RAD), -Math.cos(lat * RAD) * Math.sin(lon * RAD))
const WENCHUAN_LL: LL = [103.4, 31.0]
/** 剖开时：汶川在正上方，剖面朝镜头 */
const Q_SECTION = new THREE.Quaternion().setFromUnitVectors(toVec(WENCHUAN_LL), new THREE.Vector3(0, 1, 0))
/** 让某个经纬度正对镜头 */
export function faceQuat([lon, lat]: LL) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(lat * RAD, 0, 0))
  return q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (-90 - lon) * RAD, 0)))
}
/** 剖面上（以地心为原点、震源在正上方）离震中 deg 度、半径 r（km）的一点 */
export const sectionPoint = (deg: number, r: number, side = 1): [number, number, number] => {
  const a = deg * RAD, k = (r / R_E) * RG
  return [GLOBE.x + side * Math.sin(a) * k, GLOBE.y + Math.cos(a) * k, GLOBE.z + 0.2]
}
/** 球面上一点此刻在场景里的位置（拓展课的标签用） */
export const globePoint = (p: LL, face: LL, lift = 1.02): [number, number, number] => { const v = toVec(p).applyQuaternion(faceQuat(face)).multiplyScalar(RG * lift).add(GLOBE); return [v.x, v.y, v.z] }

// ---------- 地球表面 ----------
const VERT = /* glsl */`
#include <clipping_planes_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <clipping_planes_vertex>
}`
const FRAG = /* glsl */`
#include <clipping_planes_pars_fragment>
uniform sampler2D uDay; uniform float uDim;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main() {
  #include <clipping_planes_fragment>
  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 N = normalize(vN), L = normalize(vec3(-0.5, 0.45, 0.75));
  float lit = 0.35 + 0.85 * max(dot(N, L), 0.0);
  vec3 col = day * 1.25 * lit * uDim;
  float rim = pow(1.0 - max(dot(N, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
  col += vec3(0.25, 0.5, 1.0) * rim * 0.55;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
// 剖面：按半径分层上色；外核里的液体慢慢翻动
const SEC_FRAG = /* glsl */`
uniform float uTime, uHi, uShade; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fb(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec2 p = (vUv - 0.5) * 2.0; float r = length(p);
  if (r > 1.0) discard;
  float rm = ${(R_MOHO / R_E).toFixed(5)}, rc = ${(R_CMB / R_E).toFixed(5)}, ri = ${(R_ICB / R_E).toFixed(5)};
  vec3 col;
  float g = fb(p * 6.0);
  if (r > rm) col = vec3(0.42, 0.38, 0.33) * (0.85 + 0.3 * g);
  else if (r > rc) { float t = (rm - r) / (rm - rc); col = mix(vec3(0.36, 0.11, 0.06), vec3(0.72, 0.26, 0.07), pow(t, 0.9)) * (0.8 + 0.35 * fb(p * 4.0 + vec2(0.0, uTime * 0.01))); }
  else if (r > ri) { float sw = fb(vec2(atan(p.y, p.x) * 3.0, r * 9.0 - uTime * 0.08)); col = mix(vec3(0.95, 0.42, 0.06), vec3(1.0, 0.64, 0.16), sw) * 0.95; }
  else col = mix(vec3(0.98, 0.78, 0.36), vec3(1.0, 0.92, 0.66), 1.0 - r / ri) * (0.9 + 0.12 * g);
  // 两个界面：细线；加亮时是一圈发光的线
  float lm = exp(-pow((r - rm) * 260.0, 2.0)), lc = exp(-pow((r - rc) * 220.0, 2.0)), li = exp(-pow((r - ri) * 220.0, 2.0));
  col = mix(col, vec3(0.12, 0.08, 0.06), max(lc, li) * 0.6);
  col += vec3(0.5, 1.0, 0.95) * (abs(uHi - 1.0) < 0.5 ? lm * 2.2 + exp(-pow((r - rm) * 70.0, 2.0)) * 0.5 : 0.0);
  col += vec3(0.5, 1.0, 0.95) * (abs(uHi - 2.0) < 0.5 ? lc * 2.2 + exp(-pow((r - rc) * 60.0, 2.0)) * 0.5 : 0.0);
  // 越靠外越暗一点，切面有球的立体感
  col *= uShade * (0.78 + 0.22 * (1.0 - r * r));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
const SEC_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'

// ---------- 射线：剖面上的细带，走时超过此刻的部分不画，波前附近最亮 ----------
const RAY_FRAG = /* glsl */`
uniform float uT; uniform vec3 uCol; varying float vT;
void main() { if (vT > uT) discard; float k = exp(-(uT - vT) / 120.0); gl_FragColor = vec4(uCol * (0.9 + 1.6 * k), 0.7 + 0.3 * k); }`
const RAY_VERT = 'attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
function rayGeo(wave: 'P' | 'S') {
  const pos: number[] = [], tt: number[] = [], idx: number[] = []
  const w = 0.2
  for (const side of [1]) for (const ray of rayFan(wave)) {
    const pts = ray.pts.map(([r, phi, t]) => ({ x: side * Math.sin(phi) * (r / R_E) * RG, y: Math.cos(phi) * (r / R_E) * RG, t }))
    const base = pos.length / 3
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1
      pos.push(p.x - (dy / l) * w, p.y + (dx / l) * w, 0, p.x + (dy / l) * w, p.y - (dx / l) * w, 0); tt.push(p.t, p.t)
      if (i) { const k = base + (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3) }
    })
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1)); g.setIndex(idx)
  return g
}
function Rays({ t }: { t: number }) {
  const { p, s, mp, ms } = useMemo(() => {
    const mk = (c: string) => new THREE.ShaderMaterial({ vertexShader: RAY_VERT, fragmentShader: RAY_FRAG, transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(c) } } })
    return { p: rayGeo('P'), s: rayGeo('S'), mp: mk('#5ec8ff'), ms: mk('#ff7a3d') }
  }, [])
  mp.uniforms.uT.value = t; ms.uniforms.uT.value = t
  return <group position={[GLOBE.x, GLOBE.y, GLOBE.z + 0.15]}>
    <mesh geometry={p} material={mp} renderOrder={6} />
    <mesh geometry={s} material={ms} renderOrder={7} />
  </group>
}
/** 影区：剖面边上两段灰色的弧 */
function ShadowArcs({ k }: { k: number }) {
  const geo = useMemo(() => {
    const out: THREE.BufferGeometry[] = []
    for (const side of [1]) {
      const pts = Array.from({ length: 40 }, (_, i) => { const a = (SHADOW[0] + ((SHADOW[1] - SHADOW[0]) * i) / 39) * RAD; return new THREE.Vector3(side * Math.sin(a) * RG * 1.035, Math.cos(a) * RG * 1.035, 0.3) })
      out.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.9, 8))
    }
    return out
  }, [])
  if (k < 0.01) return null
  return <group position={GLOBE}>{geo.map((g, i) => <mesh key={i} geometry={g}><meshBasicMaterial color="#c8cdd4" transparent opacity={0.85 * k} toneMapped={false} /></mesh>)}</group>
}

// ---------- 地震带（拓展课） ----------
function beltTube(line: LL[], r: number) {
  const pts: THREE.Vector3[] = []
  for (let i = 1; i < line.length; i++) for (let k = 0; k < 8; k++) { const a = toVec(line[i - 1]), b = toVec(line[i]); pts.push(a.lerp(b, k / 8).normalize().multiplyScalar(RG * 1.004)) }
  pts.push(toVec(line[line.length - 1]).multiplyScalar(RG * 1.004))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, r, 6)
}
function Belts({ on }: { on: BeltKey[] }) {
  const g = useMemo(() => {
    const out = {} as Record<BeltKey, { tube: THREE.BufferGeometry; dots: THREE.InstancedMesh }>
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (const k of Object.keys(BELTS) as BeltKey[]) {
      const tubes = BELTS[k].lines.map(l => beltTube(l, 1.6))
      // 沿带撒点：离带越近越密
      const pts: THREE.Vector3[] = []
      for (const line of BELTS[k].lines) for (let i = 1; i < line.length; i++) for (let j = 0; j < 9; j++) {
        const a = toVec(line[i - 1]), b = toVec(line[i]), p = a.lerp(b, rnd()).normalize()
        const off = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.06 * rnd())
        pts.push(p.add(off).normalize().multiplyScalar(RG * 1.006))
      }
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4a3a', toneMapped: false }), pts.length)
      pts.forEach((p, i) => dots.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)))
      out[k] = { tube: mergeTubes(tubes), dots }
    }
    return out
  }, [])
  return <group>{(Object.keys(g) as BeltKey[]).map(k => on.includes(k) && <group key={k}>
    <mesh geometry={g[k].tube}><meshBasicMaterial color={BELTS[k].color} transparent opacity={0.45} depthWrite={false} toneMapped={false} /></mesh>
    <primitive object={g[k].dots} />
  </group>)}</group>
}
function mergeTubes(gs: THREE.BufferGeometry[]) {
  const pos: number[] = [], idx: number[] = []
  for (const g of gs) { const o = pos.length / 3; pos.push(...(g.attributes.position.array as Float32Array)); (g.index!.array as Uint16Array | Uint32Array).forEach(i => idx.push(i + o)) }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setIndex(idx); return m
}

export interface GlobeWant {
  /** 第 6 课：切掉朝镜头的四分之一 */
  cut?: boolean
  /** 射线走到哪了（地震后多少秒）；null 不画 */
  rayT?: number | null
  /** 加亮的界面：1 莫霍面，2 古登堡面 */
  hi?: 0 | 1 | 2
  /** 影区的弧 */
  shadow?: number
  /** 拓展课：正对镜头的经纬度、亮起来的地震带、汶川的标记 */
  face?: LL
  belts?: BeltKey[]
  mark?: boolean
}

export function Globe({ w }: { w: GlobeWant }) {
  const day = useTexture('/assets/tex/earth_day.jpg')
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  // 切掉四分之一：x > 0 且 z > 0 的那一块（两个面同时在外侧才切）
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), GLOBE.z), new THREE.Plane(new THREE.Vector3(-1, 0, 0), GLOBE.x)], [])
  const mat = useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace; day.anisotropy = 8; day.needsUpdate = true
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uDay: { value: day }, uDim: { value: 1 } }, clipping: true, clipIntersection: true, side: THREE.DoubleSide })
  }, [day])
  const sec = useMemo(() => new THREE.ShaderMaterial({ vertexShader: SEC_VERT, fragmentShader: SEC_FRAG, uniforms: { uTime: { value: 0 }, uHi: { value: 0 }, uShade: { value: 1 } } }), [])
  const sec2 = useMemo(() => new THREE.ShaderMaterial({ vertexShader: SEC_VERT, fragmentShader: SEC_FRAG, uniforms: { uTime: sec.uniforms.uTime, uHi: sec.uniforms.uHi, uShade: { value: 0.62 } } }), [sec])
  const spin = useRef<THREE.Group>(null), cutK = useRef(w.cut ? 1 : 0)
  useFrame(({ clock }, dt) => {
    sec.uniforms.uTime.value = clock.elapsedTime; sec.uniforms.uHi.value = w.hi ?? 0
    cutK.current += ((w.cut ? 1 : 0) - cutK.current) * Math.min(1, dt * 3)
    mat.clippingPlanes = cutK.current > 0.5 ? clip : []; mat.clipIntersection = true
    const g = spin.current; if (!g) return
    const goal = w.cut || !w.face ? Q_SECTION : faceQuat(w.face)
    g.quaternion.slerp(goal, Math.min(1, dt * 2.2))
  })
  const cut = !!w.cut
  return (
    <group>
      <group ref={spin} position={GLOBE} quaternion={Q_SECTION}>
        <mesh material={mat}><sphereGeometry args={[RG, 160, 100]} /></mesh>
        <Belts on={cut ? [] : w.belts ?? []} />
        {w.mark && !cut && (() => { const v = toVec(WENCHUAN_LL).multiplyScalar(RG * 1.01); return <mesh position={v}><sphereGeometry args={[1.1, 16, 12]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh> })()}
      </group>
      {cut && <>
        {/* 两个切面：朝镜头的半圆（射线画在这面上）和朝右的半圆，右边那面暗一些，看得出是一个立体的缺口 */}
        <mesh position={[GLOBE.x, GLOBE.y, GLOBE.z + 0.02]} material={sec}><circleGeometry args={[RG, 160, -Math.PI / 2, Math.PI]} /></mesh>
        <mesh position={[GLOBE.x + 0.02, GLOBE.y, GLOBE.z]} rotation-y={Math.PI / 2} material={sec2}><circleGeometry args={[RG, 160, Math.PI / 2, Math.PI]} /></mesh>
        {/* 震源：顶上一颗亮点 */}
        <mesh position={[GLOBE.x, GLOBE.y + RG * 0.997, GLOBE.z + 0.4]}><sphereGeometry args={[1.0, 16, 12]} /><meshBasicMaterial color="#fff2c6" toneMapped={false} /></mesh>
        {w.rayT != null && <Rays t={w.rayT} />}
        <ShadowArcs k={w.shadow ?? 0} />
      </>}
    </group>
  )
}

/** 太空的背景：远处一圈星星 */
export function Stars() {
  const geo = useMemo(() => {
    const n = 1600, a = new Float32Array(n * 3); let s = 31
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 1600 + rnd() * 200, q = Math.sqrt(1 - u * u); a[i * 3] = q * Math.cos(t) * r; a[i * 3 + 1] = u * r; a[i * 3 + 2] = q * Math.sin(t) * r }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g
  }, [])
  return <points geometry={geo} position={GLOBE}><pointsMaterial color="#dfe8ff" size={2.2} sizeAttenuation={false} fog={false} /></points>
}
export { R_MOHO, R_CMB, R_ICB }
