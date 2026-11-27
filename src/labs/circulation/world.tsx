// 大气环流实验室的大场景：太空里的一颗大地球（NASA 实拍影像、昼夜明暗、云），外面一层放大了厚度的大气，远处是太阳和星空。
// 整个实验室只有这一个世界；各课交上来的 Want 决定：太阳从哪照、地表上叠什么（气压带、海陆冷暖、暖水）、风怎样流、大气要不要剖开。
// 地球、大气层不按真实比例：大气层厚度放大约 100 倍（界面上标“示意”）。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { H, R, Streams, Winds, Path, cellLoop, sph, type Stream } from './air'
import { CELLS, TILT, pressureGrid, type Air } from './physics'

type V3 = [number, number, number]
const RAD = Math.PI / 180

/** 这一课对整个世界的要求 */
export interface Want {
  /** 太阳：照过来的水平方位角（度，和镜头的方位角同一套）和直射点纬度 */
  sun?: { az: number; lat: number }
  /** 背着太阳的半边亮几分（0 真实的夜，1 和白天差不多）：看地图一样的课用 */
  night?: number
  /** 地表画成均匀的（0 实拍，1 完全均匀）：第 1、2 课“地表均匀”的假设 */
  uniform?: number
  /** 近地面的气压带：air 是这一刻的大气，key 变了才重新取样；on 是浓淡 */
  press?: { air: Air; key: string; on: number }
  /** 地表的风：air 是这一刻的大气；box 只在这个经纬度范围里放箭头 */
  winds?: { air: Air; on: number; box?: [number, number, number, number]; n?: number; size?: number; speed?: number }
  /** 海陆冷暖：−1 陆地冷海洋暖，+1 陆地热海洋冷 */
  landT?: number
  /** 冷暖只着在陆地上，海洋保持原色 */
  landOnly?: boolean
  /** 赤道太平洋的暖水向东伸到哪个经度；amt 浓淡 */
  warm?: { east: number; amt: number }
  /** 剖开大气：az 是镜头的方位角（剖面朝镜头斜着），heat 冷暖着色，k 单圈 0 → 三圈 1，on 浓淡 */
  cut?: { az: number; heat: number; k: number; on: number }
  /** 剖开时把整颗地球绕视线转 CUT_TILT，让赤道到北极的那道大气弧横在画面中间 */
  tilt?: boolean
  /** 地球自转了几圈（变大时地球转过去） */
  turns?: number
  /** 画出赤道、回归线 */
  lines?: boolean
  /** 画出直射点和那束阳光 */
  ray?: boolean
  /** 经纬网的浓淡 */
  grid?: number
  /** 云的多少 */
  cloud?: number
  /** 一团空气走过的路线：经纬度点列、离地高度（0 地面，1 大气层顶）、走到哪 */
  trace?: { pts: [number, number][]; alt?: number; t: number; key: string }
  /** 第二条路线（拓展课的回程等） */
  trace2?: { pts: [number, number][]; alt?: number; t: number; key: string; color?: string }
  /** 地面上的几个点 */
  marks?: { lon: number; lat: number; color: string }[]
}

/** 机位：要看地球上哪一处时，镜头的方位角（弧度）。东经 lon 在 −z 方向 */
export const azFor = (lon: number) => (lon + 90) * RAD
/** 一处地面的位置（场景里） */
export const at = (lon: number, lat: number, lift = 1): V3 => sph(lon, lat, R * lift)
/** 从方位角 az、仰角 el 看时，地面上这一点朝不朝镜头 */
export const facing = (lon: number, lat: number, az: number, el: number, min = 0.2) => {
  const [x, y, z] = sph(lon, lat, 1)
  return x * Math.sin(az) * Math.cos(el) + y * Math.sin(el) + z * Math.cos(az) * Math.cos(el) > min
}
/** 太空：不画天空，背景近乎全黑，环境光很小 */
export const SPACE = { sky: false, backdrop: '#03050a', env: 0.06, sun: 0, free: true, fog: [600, 3000] as [number, number], bloom: 0.35 }
/** 太阳照过来的方向（单位向量） */
export const sunDir = (az: number, lat: number): V3 => [Math.cos(lat * RAD) * Math.sin(az * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(az * RAD)]

// ---------- 地球表面 ----------
/** 切掉的四分之一（uWedge：开关、起始方位角、宽度）里不画 */
const WEDGE_GLSL = `bool inWedge(vec3 p, vec3 w) { if (w.x < 0.5) return false; float d = mod(atan(p.x, p.z) - w.y, 6.2831853); return d < w.z; }`
const EARTH_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const EARTH_FRAG = /* glsl */`
uniform sampler2D uDay; uniform sampler2D uAux; uniform sampler2D uP0; uniform sampler2D uP1;
uniform vec3 uSun; uniform float uGrid, uNight, uUni, uPA, uPMix, uLT, uCloud; uniform vec2 uWarm; uniform vec3 uWedge; uniform float uSeaT; uniform mat3 uTI;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
${WEDGE_GLSL}
float line(float v, float every, float w) { float d = abs(fract(v / every + 0.5) - 0.5) * every; return 1.0 - smoothstep(0.0, fwidth(v) * w, d); }
void main() {
  if (inWedge(uTI * vP, uWedge)) discard;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP), S = normalize(uSun);
  vec3 day = texture2D(uDay, vUv).rgb; vec3 aux = texture2D(uAux, vUv).rgb;
  float cloud = aux.r * uCloud, water = aux.g, lights = aux.b, land = 1.0 - smoothstep(0.35, 0.6, water);
  float lon = (vUv.x - 0.5) * 360.0, lat = (vUv.y - 0.5) * 180.0;
  day = day * 1.12 + water * vec3(0.0, 0.035, 0.09);
  day = mix(day, vec3(0.07, 0.19, 0.33) + vec3(0.02) * land, uUni);                // 地表均匀：海陆都画成一样的
  cloud *= 1.0 - uUni;
  // 海陆冷暖：陆地按 uLT 着暖色或冷色，海洋着相反的、淡一些的颜色
  vec3 warm = vec3(1.0, 0.36, 0.2), cold = vec3(0.25, 0.55, 1.0);
  float lt = uLT * (land - (1.0 - land) * 0.55 * uSeaT) * (1.0 - smoothstep(70.0, 85.0, abs(lat)));
  day = mix(day, lt > 0.0 ? warm : cold, min(0.5, abs(lt) * 0.5));
  // 赤道太平洋的暖水：从 120°E 向东伸到 uWarm.x；其余的赤道东太平洋偏冷
  float span = mod(uWarm.x - 120.0 + 360.0, 360.0), off = mod(lon - 120.0 + 360.0, 360.0);
  float band = (1.0 - smoothstep(6.0, 16.0, abs(lat))) * (1.0 - land) * step(off, 205.0);
  float hot = band * (1.0 - smoothstep(span - 12.0, span + 6.0, off));
  day = mix(day, warm, hot * 0.7 * uWarm.y);
  day = mix(day, cold, (band - hot) * 0.5 * uWarm.y);
  float ndl = dot(N, S), lit = smoothstep(-0.06, 0.14, ndl);
  vec3 col = day * (0.06 + 1.1 * max(ndl, 0.0));
  float spec = pow(max(dot(reflect(-S, N), V), 0.0), 40.0) * water * (1.0 - cloud) * lit * (1.0 - uUni * 0.7);
  col += vec3(1.0, 0.93, 0.8) * spec * 0.45;
  col = mix(col, vec3(0.05 + 1.0 * max(ndl, 0.0)), cloud * cloud * 0.55);
  vec3 dark = day * vec3(0.04, 0.055, 0.09) + vec3(1.0, 0.78, 0.45) * lights * 1.1 * (1.0 - cloud * 0.6) * (1.0 - uUni) * (1.0 - uNight);
  dark = mix(dark, day * 0.62, uNight);
  col = mix(dark, col, lit);
  // 气压带：蓝色高压、红色低压，再画几条等压线
  float p = mix(texture2D(uP0, vUv).r, texture2D(uP1, vUv).r, uPMix) * 2.0 - 1.0;
  float pa = uPA * smoothstep(0.3, 0.92, abs(p));
  col = mix(col, p > 0.0 ? vec3(0.16, 0.45, 1.0) : vec3(1.0, 0.26, 0.16), pa * 0.55);
  col = mix(col, vec3(1.0), uPA * line(p, 0.5, 1.0) * 0.14 * smoothstep(0.2, 0.4, abs(p)));
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.28, 0.52, 1.0) * rim * (0.1 + 0.7 * max(lit, uNight * 0.6));
  float g = max(line(lon, 30.0, 1.0), line(lat, 30.0, 1.0) * step(abs(lat), 75.0));
  col = mix(col, vec3(1.0), uGrid * g * 0.16 * (0.4 + 0.6 * max(lit, uNight)));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
// 贴着地面的一层薄薄的大气光晕（真实大气的样子）
const RIM_VERT = /* glsl */`
varying vec3 vN; varying vec3 vP;
void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const RIM_FRAG = /* glsl */`
uniform vec3 uSun; uniform float uNight, uA; varying vec3 vN; varying vec3 vP;
void main() {
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP);
  float t = clamp(-dot(N, V) / 0.34, 0.0, 1.0), edge = t * t * t;
  float lit = max(smoothstep(-0.35, 0.5, dot(-N, normalize(uSun))), uNight * 0.6);
  gl_FragColor = vec4(vec3(0.3, 0.56, 1.0) * edge * (0.08 + 0.92 * lit) * 0.9 * uA, 1.0);
  #include <colorspace_fragment>
}`
// 放大了厚度的大气层：半透明的一层壳，切掉的那四分之一不画（uWedge：开关、起始方位角、宽度）
const SHELL_FRAG = /* glsl */`
uniform vec3 uSun; uniform vec3 uWedge; uniform float uOn; uniform mat3 uTI; varying vec3 vN; varying vec3 vP;
${WEDGE_GLSL}
void main() {
  if (inWedge(uTI * vP, uWedge)) discard;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP);
  float f = pow(1.0 - abs(dot(N, V)), 2.2);
  float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.5, dot(normalize(vP), normalize(uSun)));
  gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * lit, (0.05 + 0.32 * f) * uOn);
}`

const PW = 180, PH = 90
/** 一张气压网格贴图（R 通道 0–255 对应 −1–1） */
function pressureTex(a: Air) {
  const g = pressureGrid(a, PW, PH), d = new Uint8Array(PW * PH * 4)
  for (let i = 0; i < PW * PH; i++) { d[i * 4] = Math.round((Math.max(-1, Math.min(1, g[i])) * 0.5 + 0.5) * 255); d[i * 4 + 3] = 255 }
  const t = new THREE.DataTexture(d, PW, PH); t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true
  return t
}

function useEarth() {
  const [day, aux] = useTexture(['/assets/tex/earth_day.jpg', '/assets/tex/earth_aux.jpg'])
  return useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace; aux.colorSpace = THREE.NoColorSpace
    for (const t of [day, aux]) { t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true }
    const blank = pressureTex({ k: 0, sunLat: 0 })
    const u = {
      uDay: { value: day }, uAux: { value: aux }, uP0: { value: blank }, uP1: { value: blank }, uSun: { value: new THREE.Vector3(1, 0, 0) },
      uGrid: { value: 0.5 }, uNight: { value: 0 }, uUni: { value: 0 }, uPA: { value: 0 }, uPMix: { value: 1 }, uLT: { value: 0 }, uCloud: { value: 1 }, uWarm: { value: new THREE.Vector2(165, 0) }, uWedge: { value: new THREE.Vector3(0, 0, 0) }, uSeaT: { value: 1 }, uTI: { value: new THREE.Matrix3() },
    }
    const surface = new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: u })
    const rim = new THREE.ShaderMaterial({ vertexShader: RIM_VERT, fragmentShader: RIM_FRAG, uniforms: { uSun: u.uSun, uNight: u.uNight, uA: { value: 1 } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const shell = new THREE.ShaderMaterial({ vertexShader: RIM_VERT, fragmentShader: SHELL_FRAG, uniforms: { uSun: u.uSun, uWedge: { value: new THREE.Vector3(0, 0, 0) }, uOn: { value: 0 }, uTI: u.uTI }, side: THREE.DoubleSide, transparent: true, depthWrite: false })
    return { surface, rim, shell, u }
  }, [day, aux])
}

/** 一条纬线：一圈细环 */
function Parallel({ lat, color, r = 0.045, opacity = 1, lift = 1.004 }: { lat: number; color: string; r?: number; opacity?: number; lift?: number }) {
  const rr = R * Math.cos(lat * RAD) * lift
  return <mesh position={[0, R * Math.sin(lat * RAD) * lift, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[rr, r, 8, 160]} /><meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} /></mesh>
}

// ---------- 剖面 ----------
// 地球连同大气沿两条经线切掉四分之一：切口在镜头这一侧，镜头从切口斜着看进去。
// 右边那片剖面（A 面）几乎正对镜头，上面画环流圈；左边那片（B 面）斜着，只画地球内部和大气的冷暖。
/** 切口的两条经线：从方位角 start 起往东 WEDGE 弧度这一块切掉 */
export const WEDGE = Math.PI / 2
const A_OFF = 65 * RAD
/** 镜头方位角 az 时，切口从哪个方位角开始 */
export const wedgeStart = (az: number) => az + A_OFF - WEDGE
/** 剖面上一点：纬度 lat、离地 h（0 地面，1 大气层顶，负数是地下）；side 1 是 A 面，−1 是 B 面 */
/** 剖开时整颗地球绕视线转的角度 */
export const CUT_TILT = 50 * RAD
const IDENT = new THREE.Quaternion()
const tilts = new Map<number, THREE.Quaternion>()
export const tiltQ = (az: number) => { if (!tilts.has(az)) tilts.set(az, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sin(az), 0, Math.cos(az)), CUT_TILT)); return tilts.get(az)! }
/** 剖面上一点转过以后在场景里的位置（标签、机位用） */
export function cutView(az: number, lat: number, h: number, side = 1): V3 { return new THREE.Vector3(...cutPoint(az, lat, h, side)).applyQuaternion(tiltQ(az)).toArray() as V3 }
export function cutPoint(az: number, lat: number, h: number, side = 1): V3 {
  const a = side > 0 ? az + A_OFF : wedgeStart(az), r = R + h * H, c = Math.cos(lat * RAD)
  return [r * c * Math.sin(a), r * Math.sin(lat * RAD), r * c * Math.cos(a)]
}
const FACE_VERT = /* glsl */`
attribute float aLat; attribute float aR; varying float vLat; varying float vR;
void main() { vLat = aLat; vR = aR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const FACE_FRAG = /* glsl */`
uniform float uHeat, uOn, uR, uH; varying float vLat; varying float vR;
float line(float v, float every, float w) { float d = abs(fract(v / every + 0.5) - 0.5) * every; return 1.0 - smoothstep(0.0, fwidth(v) * w, d); }
void main() {
  vec3 c; float a = 1.0;
  if (vR < uR) {
    // 地球内部：只画一块素净的深灰岩石截面，不抢眼
    c = vec3(0.16, 0.165, 0.17) * (0.85 + 0.15 * vR / uR);
    c = mix(c, vec3(0.75, 0.82, 0.9), (1.0 - smoothstep(0.0, fwidth(vR) * 1.5, abs(vR - uR))) * 0.9);
  } else {
    float h = (vR - uR) / uH;
    float t = cos(radians(vLat) * 2.0) * uHeat;                     // 赤道暖、两极冷
    vec3 air = vec3(0.1, 0.2, 0.36), warm = vec3(0.62, 0.17, 0.1), cold = vec3(0.07, 0.22, 0.58);
    c = t > 0.0 ? mix(air, warm, min(1.0, t)) : mix(air, cold, min(1.0, -t));
    c *= 0.85 + 0.3 * (1.0 - h);
    float g = line(vLat, 30.0, 1.2) * step(abs(vLat), 89.0);           // 每隔 30° 一条细线
    c = mix(c, vec3(1.0), g * 0.35);
    float e = smoothstep(0.97, 1.0, h);                                // 大气层顶一条亮边
    c = mix(c, vec3(0.75, 0.88, 1.0), e); a = 0.9;
  }
  gl_FragColor = vec4(c, a * uOn);
  #include <colorspace_fragment>
}`
/** 一片剖面：半圆盘（地球内部）加一圈半环（大气），在方位角 a 的经线平面里 */
function faceGeo(a: number) {
  const NL = 120, NR = 40, pos: number[] = [], la: number[] = [], rr: number[] = [], idx: number[] = []
  for (let i = 0; i <= NL; i++) for (let j = 0; j <= NR; j++) {
    const lat = -90 + i * 180 / NL, r = (R + H) * j / NR, c = Math.cos(lat * RAD)
    pos.push(r * c * Math.sin(a), r * Math.sin(lat * RAD), r * c * Math.cos(a)); la.push(lat); rr.push(r)
  }
  for (let i = 0; i < NL; i++) for (let j = 0; j < NR; j++) { const p = i * (NR + 1) + j, q = p + NR + 1; idx.push(p, q, p + 1, q, q + 1, p + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aLat', new THREE.Float32BufferAttribute(la, 1)); g.setAttribute('aR', new THREE.Float32BufferAttribute(rr, 1)); g.setIndex(idx)
  return g
}
function Cut({ az, heat, k, on, mat, earth }: { az: number; heat: number; k: number; on: number; mat: THREE.ShaderMaterial; earth: THREE.ShaderMaterial }) {
  const geos = useMemo(() => [faceGeo(az + A_OFF), faceGeo(wedgeStart(az))], [az])
  const fm = useMemo(() => new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, uniforms: { uHeat: { value: 0 }, uOn: { value: 0 }, uR: { value: R }, uH: { value: H } }, transparent: true, side: THREE.DoubleSide }), [])
  const cur = useRef({ heat: 0, on: 0 })
  useFrame((_, d) => {
    const c = cur.current, q = Math.min(1, d * 1.6)
    c.heat += (0.35 + 0.65 * heat - c.heat) * q; c.on += (on - c.on) * q
    fm.uniforms.uHeat.value = c.heat; fm.uniforms.uOn.value = c.on
    mat.uniforms.uOn.value = c.on; mat.uniforms.uWedge.value.set(c.on > 0.02 ? 1 : 0, wedgeStart(az), WEDGE)
    earth.uniforms.uWedge.value.set(c.on > 0.02 ? 1 : 0, wedgeStart(az), WEDGE)
  })
  useEffect(() => () => { earth.uniforms.uWedge.value.x = 0; mat.uniforms.uWedge.value.x = 0 }, [earth, mat])
  // 环流圈：单圈（每个半球一个）和三圈（每个半球三个），两组按 k 交替淡入淡出。只画在 A 面上，略浮在面前
  const { one, three } = useMemo(() => {
    const one: Stream[] = [], three: Stream[] = []
    const w = (lat: number, h: number) => { const p = cutPoint(az, lat, h, 1), n = [Math.cos(az + A_OFF) * -1, 0, Math.sin(az + A_OFF)]; return [p[0] + n[0] * 0.08, p[1], p[2] + n[2] * 0.08] as V3 }
    for (const s of [1, -1]) {
      one.push(cellLoop(s * 4, s * 86, 0.16, 0.84, 0, w))
      for (const c of CELLS) three.push(cellLoop(s * (c.from + 3), s * (c.to - 3), 0.15, 0.85, s * c.upAt, w))
    }
    return { one, three }
  }, [az])
  return <group>
    {geos.map((g, i) => <mesh key={i} geometry={g} material={fm} renderOrder={5} />)}
    {/* 没受热时粒子淡淡的、不动；受热以后亮起来、转起来 */}
    <Streams streams={one} on={on * (0.4 + 0.6 * heat) * (1 - k)} speed={heat > 0.5 ? 1.8 : 0} size={1.25} per={0.55} line={0.75} />
    <Streams streams={three} on={on * (0.4 + 0.6 * heat) * k} speed={heat > 0.5 ? 1.8 : 0} size={1.1} per={0.75} line={0.75} />
  </group>
}

// ---------- 太阳、星空 ----------
function makeGlow(stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')!, r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  for (const [a, color] of stops) r.addColorStop(a, color)
  g.fillStyle = r; g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
function Sun({ dir }: { dir: V3 }) {
  const core = useMemo(() => makeGlow([[0, 'rgba(255,252,240,1)'], [0.16, 'rgba(255,240,200,1)'], [0.22, 'rgba(255,200,120,0.55)'], [0.45, 'rgba(255,170,80,0.12)'], [1, 'rgba(255,150,60,0)']]), [])
  const p: V3 = [dir[0] * 520, dir[1] * 520, dir[2] * 520]
  return <sprite position={p} scale={[90, 90, 1]}><spriteMaterial map={core} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></sprite>
}
function Stars() {
  const geo = useMemo(() => {
    const n = 2600, a = new Float32Array(n * 3), c = new Float32Array(n * 3); let s = 11
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 900 + rnd() * 200, q = Math.sqrt(1 - u * u)
      a[i * 3] = q * Math.cos(t) * r; a[i * 3 + 1] = u * r; a[i * 3 + 2] = q * Math.sin(t) * r
      const b = 0.35 + rnd() ** 3 * 0.65, w = rnd()
      c[i * 3] = b * (w > 0.8 ? 1 : 0.85); c[i * 3 + 1] = b * 0.9; c[i * 3 + 2] = b * (w < 0.3 ? 1 : 0.95)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g
  }, [])
  return <points geometry={geo}><pointsMaterial vertexColors size={2.2} sizeAttenuation={false} fog={false} transparent opacity={0.9} toneMapped={false} /></points>
}

// ---------- 整个世界 ----------
/** 一个数朝目标指数跟随 */
const ease = (cur: number, to: number, d: number, k = 1.6) => cur + (to - cur) * Math.min(1, d * k)

export function World({ want = {} }: { want?: Want }) {
  const E = useEarth()
  const sun = want.sun ?? { az: 140, lat: 0 }
  const sd = sunDir(sun.az, sun.lat)
  E.u.uSun.value.set(...sd)
  // 气压带贴图：key 变了重新取样，新旧两张交替淡过去
  const pk = want.press?.key ?? ''
  const pAir = useRef(want.press?.air); pAir.current = want.press?.air
  const mixT = useRef(1)
  useEffect(() => {
    if (!pAir.current) return
    const t = pressureTex(pAir.current), gone = E.u.uP0.value
    E.u.uP0.value = E.u.uP1.value; E.u.uP1.value = t; mixT.current = 0
    if (gone !== E.u.uP0.value && gone !== t) gone.dispose()
  }, [pk, E])
  // 地球自转：转到 turns 圈
  const spin = useRef<THREE.Group>(null)
  const spinGoal = useRef(0)
  if (want.turns != null) spinGoal.current = want.turns * Math.PI * 2
  else if (spin.current) spinGoal.current = Math.round(spin.current.rotation.y / (Math.PI * 2)) * Math.PI * 2
  // 剖开时整颗地球绕视线转一个角度：慢慢转过去
  const tiltRef = useRef<THREE.Group>(null)
  const tiltGoal = want.tilt && want.cut ? tiltQ(want.cut.az) : IDENT
  const cur = useRef({ night: 0, uni: 0, pa: 0, lt: 0, warm: 0, grid: 0.5, cloud: 1 })
  useFrame((_, dd) => {
    const d = Math.min(dd, 1 / 20), c = cur.current
    c.night = ease(c.night, want.night ?? 0, d); c.uni = ease(c.uni, want.uniform ?? 0, d, 1.2)
    c.pa = ease(c.pa, want.press?.on ?? 0, d); c.lt = ease(c.lt, want.landT ?? 0, d, 1.1)
    c.warm = ease(c.warm, want.warm?.amt ?? 0, d); c.grid = ease(c.grid, want.grid ?? 0.35, d); c.cloud = ease(c.cloud, want.cloud ?? 0.85, d)
    mixT.current = Math.min(1, mixT.current + d * 2.5)
    E.u.uNight.value = c.night; E.u.uUni.value = c.uni; E.u.uPA.value = c.pa; E.u.uLT.value = c.lt; E.u.uGrid.value = c.grid; E.u.uCloud.value = c.cloud
    E.u.uPMix.value = mixT.current; E.u.uSeaT.value = want.landOnly ? 0 : 1
    const wg = E.u.uWarm.value; wg.y = c.warm; if (want.warm) wg.x = ease(wg.x, want.warm.east, d, 0.5)
    if (tiltRef.current) { const q = tiltRef.current.quaternion; q.slerp(tiltGoal, Math.min(1, d * 2.2)); if (q.angleTo(tiltGoal) < 1e-3) q.copy(tiltGoal); E.u.uTI.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q.clone().invert())) }
    if (spin.current) { const r = spin.current.rotation; const gap = spinGoal.current - r.y; r.y += Math.sign(gap) * Math.min(Math.abs(gap), d * Math.max(0.25, Math.min(2.4, Math.abs(gap) * 0.9))) }
  })
  const [sx, sy, sz] = sd
  const cut = want.cut
  return (
    <group>
      <Stars />
      <Sun dir={sd} />
      <group ref={tiltRef}>
      <group ref={spin}>
        <mesh><sphereGeometry args={[R, 160, 110]} /><primitive object={E.surface} attach="material" /></mesh>
        {want.winds && <Winds cut={cut ? [wedgeStart(cut.az), WEDGE] : undefined} air={want.winds.air} on={want.winds.on} box={want.winds.box} n={want.winds.n} size={want.winds.size} speed={want.winds.speed} />}
        {want.trace && <Path key={want.trace.key} pts={want.trace.pts} t={want.trace.t} r={R * (1.02 + (want.trace.alt ?? 0) * H / R)} />}
        {want.trace2 && <Path key={want.trace2.key} pts={want.trace2.pts} t={want.trace2.t} color={want.trace2.color} r={R * (1.02 + (want.trace2.alt ?? 0) * H / R)} />}
        {(want.marks ?? []).map((m, i) => <group key={i} position={at(m.lon, m.lat, 1.004)}>
          <mesh><sphereGeometry args={[0.16, 16, 12]} /><meshBasicMaterial color={m.color} toneMapped={false} /></mesh>
        </group>)}
      </group>
      <mesh raycast={() => null}><sphereGeometry args={[R * 1.035, 96, 64]} /><primitive object={E.rim} attach="material" /></mesh>
      {cut && <mesh raycast={() => null} renderOrder={4}><sphereGeometry args={[R + H, 128, 96]} /><primitive object={E.shell} attach="material" /></mesh>}
      {cut && <Cut az={cut.az} heat={cut.heat} k={cut.k} on={cut.on} mat={E.shell} earth={E.surface} />}
      {want.lines && <>
        <Parallel lat={0} color="#ffe14d" opacity={0.9} />
        {[1, -1].map(s => <Parallel key={s} lat={s * TILT} color="#ffa24d" opacity={0.85} r={0.035} />)}
      </>}
      {want.ray && <>
        {/* 太阳直射的那束光：从太阳方向打到直射点 */}
        <mesh position={[sx * (R + 7), sy * (R + 7), sz * (R + 7)]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(sx, sy, sz))}><cylinderGeometry args={[0.07, 0.07, 14, 10]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>
        <mesh position={[sx * R * 1.003, sy * R * 1.003, sz * R * 1.003]}><sphereGeometry args={[0.26, 18, 14]} /><meshBasicMaterial color="#ff5a3c" toneMapped={false} /></mesh>
        <Parallel lat={sun.lat} color="#ff5a3c" r={0.05} lift={1.006} />
      </>}
      </group>
    </group>
  )
}
