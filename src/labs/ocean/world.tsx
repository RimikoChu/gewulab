// 洋流和厄尔尼诺实验室的大场景：太空里的一颗大地球（NASA 实拍影像），远处是太阳和星空。
// 整个实验室只有这一个世界；各课交上来的 Want 决定：海面上叠不叠表层水温、哪几条洋流在流、风怎么吹、
// 要不要沿某条纬线把地球北边那一块切掉，露出剖面上的海水（温跃层、上升流、海峡两层水）。
// 剖面上海水那一层的厚度放大了几千倍（界面上标“示意”）。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { CURRENT, faceProfile, seabedRow, sstAnomGrid, sstGrid, type CurrentKey, type LL } from './physics'
import { COLD, Flow, R, WARM, cutRc, cutY, surfaceLine, type CutGeo, type Line, type V3 } from './ocean'

const RAD = Math.PI / 180

/** 这一课对整个世界的要求 */
export interface Want {
  /** 太阳：照过来的水平方位角（度，和镜头的方位角同一套）和纬度 */
  sun?: { az: number; lat: number }
  /** 背着太阳的半边亮几分（0 真实的夜，1 和白天差不多） */
  night?: number
  cloud?: number
  grid?: number
  /** 表层水温着色（只着在海上）：on 浓淡，enso 信风强弱（1 正常），anom 只画比同纬度暖多少、冷多少 */
  sst?: { on: number; enso?: number; anom?: boolean; latMax?: number }
  /** 正在流的洋流 */
  flows?: { keys: CurrentKey[]; on?: number; speed?: number; size?: number }
  /** 另外画的流线（风、季风洋流的另一季等），各自一组 */
  lines?: { id: string; lines: Line[]; on: number; speed?: number; size?: number; gap?: number; normal?: V3; line?: number }[]
  /** 切开：沿纬度 lat 切掉北边；kind 剖面上海水的样子，k 信风强弱，bed 手给的海底深度，zMax 剖面那一层代表多深（m） */
  cut?: CutGeo & { kind: 'equator' | 'peru' | 'strait'; k?: number; bed?: LL[]; zMax: number; tint?: number; thermo?: boolean }
  /** 海面上几处浮游生物多的地方（渔场）：经度、纬度、半径（度）、浓淡 */
  blooms?: [number, number, number, number][]
}

/** 太空：不画天空，背景近乎全黑，环境光很小 */
export const SPACE = { sky: false, backdrop: '#03050a', env: 0.1, sun: 0, free: true, fog: [600, 3000] as [number, number], bloom: 0.3 }
export const sunDir = (az: number, lat: number): V3 => [Math.cos(lat * RAD) * Math.sin(az * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(az * RAD)]

// 水温、盐度的配色：冷蓝 → 浅 → 暖红（温度模式）；淡青 → 深青绿（盐度模式）
const RAMP_GLSL = /* glsl */`
vec3 ramp(float v) {
  v = clamp(v, 0.0, 1.0);
  vec3 a = vec3(0.08, 0.18, 0.55), b = vec3(0.2, 0.52, 0.95), c = vec3(0.72, 0.86, 0.9), d = vec3(1.0, 0.68, 0.3), e = vec3(0.95, 0.24, 0.14);
  if (v < 0.3) return mix(a, b, v / 0.3);
  if (v < 0.55) return mix(b, c, (v - 0.3) / 0.25);
  if (v < 0.78) return mix(c, d, (v - 0.55) / 0.23);
  return mix(d, e, (v - 0.78) / 0.22);
}
vec3 saltRamp(float v) { v = clamp(v, 0.0, 1.0); return mix(vec3(0.42, 0.78, 0.92), vec3(0.06, 0.32, 0.36), v); }`

// ---------- 地球表面 ----------
const EARTH_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const EARTH_FRAG = /* glsl */`
uniform sampler2D uDay; uniform sampler2D uAux; uniform sampler2D uSst0; uniform sampler2D uSst1;
uniform vec3 uSun; uniform float uGrid, uNight, uCloud, uSstOn, uSstMix, uCutY, uCut, uAnom, uSstLat; uniform vec4 uBloom[4];
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
${RAMP_GLSL}
float line(float v, float every, float w) { float d = abs(fract(v / every + 0.5) - 0.5) * every; return 1.0 - smoothstep(0.0, fwidth(v) * w, d); }
void main() {
  if (uCut > 0.5 && vP.y < uCutY) discard;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP), S = normalize(uSun);
  vec3 day = texture2D(uDay, vUv).rgb; vec3 aux = texture2D(uAux, vUv).rgb;
  float cloud = aux.r * uCloud, water = smoothstep(0.35, 0.6, aux.g), lights = aux.b;
  float lon = (vUv.x - 0.5) * 360.0, lat = (vUv.y - 0.5) * 180.0;
  day = day * 1.1 + water * vec3(0.0, 0.03, 0.08);
  // 表层水温：只着在海上，透明度适中，陆地保持原色
  float t = mix(texture2D(uSst0, vUv).r, texture2D(uSst1, vUv).r, uSstMix);
  if (uAnom > 0.5) {
    // 水温距平：比同纬度暖的着红、冷的着蓝，差得越多越浓；和同纬度差不多的地方不着色
    float a = (t - 0.5) * 2.0;
    day = mix(day, a > 0.0 ? vec3(1.0, 0.3, 0.18) : vec3(0.42, 0.8, 1.0), water * uSstOn * min(0.8, abs(a) * 1.5) * (1.0 - smoothstep(uSstLat - 8.0, uSstLat, abs(lat))));
  } else day = mix(day, ramp(t), water * uSstOn * 0.5);
  // 渔场：浮游生物多，海水泛绿
  for (int i = 0; i < 4; i++) {
    vec4 b = uBloom[i]; if (b.w <= 0.0) continue;
    float dl = mod(lon - b.x + 540.0, 360.0) - 180.0, d = length(vec2(dl * cos(radians(lat)), lat - b.y));
    float k = (1.0 - smoothstep(b.z * 0.45, b.z, d)) * b.w * water;
    day = mix(day, vec3(0.16, 0.62, 0.38), k * 0.65);
  }
  float ndl = dot(N, S), lit = smoothstep(-0.06, 0.14, ndl);
  vec3 col = day * (0.07 + 1.08 * max(ndl, 0.0));
  float spec = pow(max(dot(reflect(-S, N), V), 0.0), 60.0) * water * (1.0 - cloud) * lit * (1.0 - uSstOn * 0.6);
  col += vec3(1.0, 0.93, 0.8) * spec * 0.0;
  col = mix(col, vec3(0.05 + 1.0 * max(ndl, 0.0)), cloud * cloud * 0.5);
  vec3 dark = day * vec3(0.04, 0.055, 0.09) + vec3(1.0, 0.78, 0.45) * lights * (1.0 - cloud * 0.6) * (1.0 - uNight);
  dark = mix(dark, day * 0.62, uNight);
  col = mix(dark, col, lit);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.28, 0.52, 1.0) * rim * (0.1 + 0.6 * max(lit, uNight * 0.6));
  float g = max(line(lon, 30.0, 1.0), line(lat, 30.0, 1.0) * step(abs(lat), 75.0));
  col = mix(col, vec3(1.0), uGrid * g * 0.16 * (0.4 + 0.6 * max(lit, uNight)));
  col = mix(col, vec3(1.0, 0.88, 0.35), uGrid * line(lat, 180.0, 1.4) * 0.5);    // 赤道
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
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

const SW = 240, SH = 120
/** 表层水温贴图（R 通道：0 对应 2 °C，1 对应 30 °C） */
function sstTex(enso: number, anom: boolean) {
  const g = anom ? sstAnomGrid(SW, SH, enso) : sstGrid(SW, SH, enso), d = new Uint8Array(SW * SH * 4)
  for (let i = 0; i < SW * SH; i++) { d[i * 4] = Math.round(Math.max(0, Math.min(1, anom ? 0.5 + g[i] / 10 : (g[i] - 2) / 28)) * 255); d[i * 4 + 3] = 255 }
  const t = new THREE.DataTexture(d, SW, SH); t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true
  return t
}

function useEarth() {
  const [day, aux] = useTexture(['/assets/tex/earth_day.jpg', '/assets/tex/earth_aux.jpg'])
  return useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace; aux.colorSpace = THREE.NoColorSpace
    for (const t of [day, aux]) { t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true }
    const blank = new THREE.DataTexture(new Uint8Array([128, 0, 0, 255]), 1, 1); blank.needsUpdate = true
    const u = {
      uDay: { value: day }, uAux: { value: aux }, uSst0: { value: blank as THREE.Texture }, uSst1: { value: blank as THREE.Texture }, uSun: { value: new THREE.Vector3(1, 0, 0) },
      uGrid: { value: 0.3 }, uNight: { value: 0.4 }, uCloud: { value: 0.6 }, uSstOn: { value: 0 }, uSstMix: { value: 1 }, uAnom: { value: 0 }, uSstLat: { value: 98 }, uCutY: { value: -R - 1 }, uCut: { value: 0 },
      uBloom: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 0)) },
    }
    const surface = new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: u })
    const rim = new THREE.ShaderMaterial({ vertexShader: RIM_VERT, fragmentShader: RIM_FRAG, uniforms: { uSun: u.uSun, uNight: u.uNight, uA: { value: 1 } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    return { surface, rim, u, aux }
  }, [day, aux])
}

/** 从水陆贴图里取出某一纬度上每度一格是不是海 */
let MASK: Uint8ClampedArray | null = null
/** 海底贴图每圈多少格（每格 0.25°） */
const BW = 1440
function waterRow(img: CanvasImageSource, lat: number) {
  if (!MASK) {
    const c = document.createElement('canvas'); c.width = BW; c.height = BW / 2
    const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0, BW, BW / 2)
    MASK = g.getImageData(0, 0, BW, BW / 2).data
  }
  const y = Math.min(BW / 2 - 1, Math.round((90 - lat) * BW / 360)), row: boolean[] = []
  for (let i = 0; i < BW; i++) row.push(MASK[((y * BW) + i) * 4 + 1] > 120)
  return row
}

// ---------- 剖面 ----------
// 切面是 y = cutY 这个平面里的一个圆盘。最外面一圈是海水那一层（厚 D，放大了很多倍），里面是岩石。
// z：从海面往下的深度（以 D 为单位），每个经度上海底在多深、上下两层海水怎么分，查 uProf 贴图。
const FACE_VERT = /* glsl */`
attribute float aLon; attribute float aZ; uniform float uY, uRc, uD; varying float vLon; varying float vZ;
void main() { vLon = aLon; vZ = aZ; float r = max(0.0, uRc - aZ * uD); vec3 p = vec3(r * cos(radians(aLon)), uY, -r * sin(radians(aLon))); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`
const FACE_FRAG = /* glsl */`
uniform sampler2D uBed; uniform sampler2D uP0; uniform sampler2D uP1; uniform float uMix, uOn, uTint, uThermo, uSalt, uZMax, uRc, uD;
varying float vLon; varying float vZ;
${RAMP_GLSL}
void main() {
  float u = (vLon + 180.0) / 360.0;
  float bed = texture2D(uBed, vec2(u, 0.5)).r * 2.0;
  vec4 p = mix(texture2D(uP0, vec2(u, 0.5)), texture2D(uP1, vec2(u, 0.5)), uMix);
  float zt = p.b * 1000.0 / uZMax;                                  // 分界面深度（剖面单位）
  vec3 c;
  if (vZ > bed) {
    // 海底以下：上面一层泥沙，再往下是深灰的岩石
    float s = vZ - bed;
    c = mix(vec3(0.42, 0.36, 0.28), vec3(0.1, 0.1, 0.11), smoothstep(0.0, 0.3, s));
    c *= 0.8 + 0.2 * clamp(1.0 - vZ * uD / uRc, 0.0, 1.0);
    c = mix(c, vec3(0.62, 0.55, 0.42), (1.0 - smoothstep(0.0, 0.035, s)) * step(0.001, bed));
    if (bed <= 0.001 && vZ < 0.06) c = vec3(0.5, 0.44, 0.33);   // 陆地切口的地表
  } else {
    float k = smoothstep(zt - 0.035, zt + 0.035, vZ);
    float v = mix(p.r, p.g, k);                                        // 上层 → 下层
    vec3 tc = uSalt > 0.5 ? saltRamp(v) : ramp(v - 0.18 * clamp(vZ - zt, 0.0, 2.0));
    vec3 plain = mix(vec3(0.14, 0.42, 0.66), vec3(0.03, 0.1, 0.24), clamp(vZ / 1.4, 0.0, 1.0));
    c = mix(plain, tc, uTint);
    c *= 0.95 + 0.1 * sin(vZ * 40.0 + vLon * 3.0) * 0.2;
    c = mix(c, vec3(1.0, 0.93, 0.55), uThermo * (1.0 - smoothstep(0.012, 0.03, abs(vZ - zt))) * step(0.5, fract(vLon * 0.5)) * 0.95);   // 温跃层
    c = mix(c, vec3(0.85, 0.95, 1.0), 1.0 - smoothstep(0.0, 0.02, vZ));    // 海面一条亮线
  }
  gl_FragColor = vec4(c, uOn);
  #include <colorspace_fragment>
}`
function faceGeo() {
  const NL = 720, zs: number[] = []
  for (let j = 0; j <= 48; j++) zs.push(j / 48 * 1.9)
  for (let j = 1; j <= 16; j++) zs.push(1.9 + j * 0.8)
  const NZ = zs.length, pos: number[] = [], lon: number[] = [], zz: number[] = [], idx: number[] = []
  for (let i = 0; i <= NL; i++) for (let j = 0; j < NZ; j++) { pos.push(0, 0, 0); lon.push(-180 + i * 360 / NL); zz.push(zs[j]) }
  for (let i = 0; i < NL; i++) for (let j = 0; j < NZ - 1; j++) { const a = i * NZ + j, b = a + NZ; idx.push(a, a + 1, b, b, a + 1, b + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aLon', new THREE.Float32BufferAttribute(lon, 1)); g.setAttribute('aZ', new THREE.Float32BufferAttribute(zz, 1)); g.setIndex(idx)
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.2)
  return g
}
/** 一张 360×1 的剖面贴图：R 上层值、G 下层值、B 分界面深度（/1000 m） */
function profTex(kind: 'equator' | 'peru' | 'strait', k: number) {
  const p = faceProfile(kind, k), d = new Uint8Array(360 * 4)
  const norm = (v: number) => p.mode === 'salt' ? (v - 35) / 4 : (v - 2) / 28
  for (let i = 0; i < 360; i++) { d[i * 4] = Math.round(Math.max(0, Math.min(1, norm(p.top[i]))) * 255); d[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, norm(p.bottom[i]))) * 255); d[i * 4 + 2] = Math.round(Math.min(1, p.z[i] / 1000) * 255); d[i * 4 + 3] = 255 }
  const t = new THREE.DataTexture(d, 360, 1); t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true
  return t
}
function Face({ cut, aux, cy }: { cut: NonNullable<Want['cut']>; aux: THREE.Texture; cy: React.RefObject<number> }) {
  const geo = useMemo(faceGeo, [])
  const bedKey = `${cut.lat}|${JSON.stringify(cut.bed ?? [])}`
  const bed = useMemo(() => {
    const d = seabedRow(waterRow(aux.image as CanvasImageSource, cut.lat), cut.bed), a = new Uint8Array(BW * 4)
    for (let i = 0; i < BW; i++) { a[i * 4] = Math.round(Math.min(1, d[i] / 2) * 255); a[i * 4 + 3] = 255 }
    const t = new THREE.DataTexture(a, BW, 1); t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true
    return t
  }, [bedKey])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => {
    const p = profTex(cut.kind, cut.k ?? 1)
    return new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, transparent: true, side: THREE.DoubleSide,
      uniforms: { uBed: { value: bed }, uP0: { value: p }, uP1: { value: p }, uMix: { value: 1 }, uOn: { value: 0 }, uTint: { value: 0 }, uThermo: { value: 0 }, uSalt: { value: 0 }, uZMax: { value: cut.zMax }, uY: { value: 0 }, uRc: { value: R }, uD: { value: cut.D } } })
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { mat.uniforms.uBed.value = bed }, [bed, mat])
  // 剖面上的海水：kind 或 k 变了，换一张新的，新旧两张交替淡过去
  const pk = `${cut.kind}|${cut.k ?? 1}`
  useEffect(() => { const t = profTex(cut.kind, cut.k ?? 1); mat.uniforms.uP0.value = mat.uniforms.uP1.value; mat.uniforms.uP1.value = t; mat.uniforms.uMix.value = 0 }, [pk])   // eslint-disable-line react-hooks/exhaustive-deps
  const cur = useRef({ tint: 0, thermo: 0 })
  useFrame((_, dd) => {
    const d = Math.min(dd, 1 / 20), c = cur.current, U = mat.uniforms
    c.tint += ((cut.tint ?? 1) - c.tint) * Math.min(1, d * 2); c.thermo += ((cut.thermo ? 1 : 0) - c.thermo) * Math.min(1, d * 2)
    U.uMix.value = Math.min(1, U.uMix.value + d * 0.7)
    U.uTint.value = c.tint; U.uThermo.value = c.thermo; U.uSalt.value = cut.kind === 'strait' ? 1 : 0; U.uZMax.value = cut.zMax; U.uD.value = cut.D
    const y = cy.current ?? -R, rc = Math.sqrt(Math.max(0, R * R - y * y))
    U.uY.value = y; U.uRc.value = rc; U.uOn.value = y > -R + 0.05 ? 1 : 0
  })
  return <mesh geometry={geo} material={mat} renderOrder={3} />
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
  return <sprite position={[dir[0] * 520, dir[1] * 520, dir[2] * 520]} scale={[80, 80, 1]}><spriteMaterial map={core} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></sprite>
}
function Stars() {
  const geo = useMemo(() => {
    const n = 2600, a = new Float32Array(n * 3), c = new Float32Array(n * 3); let s = 17
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 900 + rnd() * 200, q = Math.sqrt(1 - u * u)
      a[i * 3] = q * Math.cos(t) * r; a[i * 3 + 1] = u * r; a[i * 3 + 2] = q * Math.sin(t) * r
      const b = 0.35 + rnd() ** 3 * 0.65; c[i * 3] = b * 0.9; c[i * 3 + 1] = b * 0.92; c[i * 3 + 2] = b
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g
  }, [])
  return <points geometry={geo}><pointsMaterial vertexColors size={2.2} sizeAttenuation={false} fog={false} transparent opacity={0.9} toneMapped={false} /></points>
}

// ---------- 整个世界 ----------
const ease = (cur: number, to: number, d: number, k = 1.6) => cur + (to - cur) * Math.min(1, d * k)
/** 一组洋流的流线（暖流红、寒流蓝） */
export const currentLines = (keys: CurrentKey[]): Line[] => keys.map(k => surfaceLine(CURRENT[k].pts, CURRENT[k].warm ? WARM : COLD))

export function World({ want = {} }: { want?: Want }) {
  const E = useEarth()
  const sun = want.sun ?? { az: 140, lat: 0 }
  const sd = sunDir(sun.az, sun.lat)
  E.u.uSun.value.set(...sd)
  // 表层水温贴图：信风强弱变了就重新算，新旧两张交替淡过去
  const enso = want.sst?.enso ?? 1, sstOn = (want.sst?.on ?? 0) > 0, anom = !!want.sst?.anom
  const made = useRef(new Map<string, THREE.DataTexture>())
  E.u.uAnom.value = anom ? 1 : 0
  E.u.uSstLat.value = want.sst?.latMax ?? 98
  useEffect(() => {
    if (!sstOn) return
    const key = `${enso}|${anom}`
    let t = made.current.get(key); if (!t) { t = sstTex(enso, anom); made.current.set(key, t) }
    if (E.u.uSst1.value === t) return
    E.u.uSst0.value = E.u.uSst1.value; E.u.uSst1.value = t; E.u.uSstMix.value = 0
  }, [enso, sstOn, anom, E])
  const cut = want.cut
  const cy = useRef(-R - 1)
  const cur = useRef({ night: 0.4, grid: 0.3, cloud: 0.6, sst: 0, b: [0, 0, 0, 0] })
  const fkeys = want.flows?.keys ?? []
  const fk = fkeys.join(',')
  const flowLines = useMemo(() => currentLines(fkeys), [fk])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dd) => {
    const d = Math.min(dd, 1 / 20), c = cur.current
    c.night = ease(c.night, want.night ?? 0.4, d); c.grid = ease(c.grid, want.grid ?? 0.3, d); c.cloud = ease(c.cloud, want.cloud ?? 0.6, d); c.sst = ease(c.sst, want.sst?.on ?? 0, d, 1.4)
    E.u.uNight.value = c.night; E.u.uGrid.value = c.grid; E.u.uCloud.value = c.cloud; E.u.uSstOn.value = c.sst
    E.u.uSstMix.value = Math.min(1, E.u.uSstMix.value + d * 1.2)
    const bl = want.blooms ?? []
    for (let i = 0; i < 4; i++) { const b = bl[i]; c.b[i] = ease(c.b[i], b ? b[3] : 0, d, 1.2); const v = E.u.uBloom.value[i]; if (b) v.set(b[0], b[1], b[2], c.b[i]); else v.w = c.b[i] > 0.01 ? c.b[i] : 0 }
    // 切开：切面从北极慢慢降到要切的纬度；不切时升回去
    const to = cut ? cutY(cut) : -R - 0.5
    cy.current += (to - cy.current) * Math.min(1, d * 1.5); if (Math.abs(to - cy.current) < 0.002) cy.current = to
    E.u.uCutY.value = cy.current; E.u.uCut.value = cy.current > -R ? 1 : 0
    ;(E.rim.uniforms.uA as { value: number }).value = cy.current > -R ? 0 : 1
  })
  return (
    <group>
      <Stars />
      <Sun dir={sd} />
      <directionalLight position={[sd[0] * 50, sd[1] * 50, sd[2] * 50]} intensity={2.2} color="#fff3e0" />
      <ambientLight intensity={0.35} />
      <mesh><sphereGeometry args={[R, 192, 128]} /><primitive object={E.surface} attach="material" /></mesh>
      <mesh raycast={() => null}><sphereGeometry args={[R * 1.035, 96, 64]} /><primitive object={E.rim} attach="material" /></mesh>
      {cut && <Face cut={cut} aux={E.aux} cy={cy} />}
      {want.flows && <Flow lines={flowLines} on={cut ? 0 : want.flows.on ?? 1} speed={want.flows.speed ?? 1} size={want.flows.size ?? 0.42} />}
      {(want.lines ?? []).map(l => <Flow key={l.id} lines={l.lines} on={l.on} speed={l.speed ?? 1} size={l.size ?? 0.42} gap={l.gap} normal={l.normal} line={l.line} />)}
    </group>
  )
}
/** 剖面那一层的中心线的半径（给标签、流线用） */
export const faceR = (c: CutGeo) => cutRc(c)
