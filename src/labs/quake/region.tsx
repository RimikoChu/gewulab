// 龙门山沙盘：一块切开的地块，上面是山、河谷、平原和城镇，侧面是岩层；朝镜头的前缘可以挪开，露出穿过震中的剖面和断层。
// 地面上的波圈、烈度色带、盲区、定位的圆都画在地形的着色器里（数值由各课从 physics.ts 取来，经 want 交进来）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { makeGround, useRipple } from '@/lab-kit'
import { CITIES, STATIONS, WENCHUAN, intensity } from './physics'
import { CUT_Z, FLOOR, FUJIANG, MINJIANG, VE, X0, X1, Y, Z0, Z1, fbm, frontX, height, plainness, smooth } from './terrain'
import { useJob } from './job'

export interface RegionWant {
  /** 第 1 课：把前缘挪开 */
  open?: boolean
  /** 断层错动了多少（0–1） */
  slip?: number
  /** 震源的亮度（0–1） */
  focus?: number
  /** 地面和剖面上的波前：传进来的是两种波此刻的半径（km）；剖面上是到震源的距离 */
  waves?: { p: number; s: number; pf: number; sf: number; epi: [number, number] } | null
  /** 烈度上色：哪一次地震（震级），k 是浓淡 */
  intensity?: { M: 7 | 8; k: number } | null
  /** 盲区半径（km） */
  blind?: number
  /** 第 5 课的圆：[x, z, 半径] */
  circles?: [number, number, number][]
  /** 地震台：整张台网、A B C 三台、不画 */
  stations?: 'net' | 'abc' | 'none'
  /** 闪亮的台站 */
  hot?: number[]
}

const NX = 300, NZ_MAIN = 225, NZ_SLAB = 42
const C = (s: string) => new THREE.Color(s)
const COL = {
  field: C('#6a8644'), field2: C('#8d8f4e'), valley: C('#8a9a58'),
  forest: C('#34502c'), forest2: C('#4a6637'), scrub: C('#6d7148'),
  meadow: C('#8b8461'), rock: C('#77716a'), rock2: C('#5f5a54'), snow: C('#eef1f4'), town: C('#a9a49a'),
}

// ---------- 地形网格 ----------
interface Tile { geo: THREE.BufferGeometry; z0: number; z1: number }
function* tileGen(z0: number, z1: number, nz: number): Generator<void, Tile> {
  const W = NX + 1, n = W * (nz + 1), dx = (X1 - X0) / NX, dz = (z1 - z0) / nz
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), i8 = new Float32Array(n), i7 = new Float32Array(n), pl = new Float32Array(n), cy = new Float32Array(n), hk = new Float32Array(n)
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= NX; i++) {
      const k = j * W + i, x = X0 + i * dx, z = z0 + j * dz, h = height(x, z)
      hk[k] = h; pos[k * 3] = x; pos[k * 3 + 1] = Y(h); pos[k * 3 + 2] = z
      i8[k] = intensity(8, [x, z]); i7[k] = intensity(7, [x, z]); pl[k] = plainness(x, z)
      for (const c of Object.values(CITIES)) cy[k] = Math.max(cy[k], 1 - smooth((Math.hypot(x - c.at[0], z - c.at[1]) - c.r * 0.92) / (c.r * 0.15 + 0.3)))
    }
    if (j % 6 === 0) yield
  }
  const idx: number[] = []
  for (let j = 0; j < nz; j++) for (let i = 0; i < NX; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d) }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals()
  yield
  const nrm = geo.attributes.normal as THREE.BufferAttribute, c = new THREE.Color(), t = new THREE.Color()
  // 阳光的方向是固定的（舞台的太阳），所以山的投影和山谷里的暗处可以先算好，画进顶点颜色
  const at = (x: number, z: number) => { const fi = (x - X0) / dx, fj = (z - z0) / dz; if (fi < 0 || fj < 0 || fi > NX || fj > nz) return -1; const i = Math.min(NX - 1, Math.floor(fi)), j = Math.min(nz - 1, Math.floor(fj)), a = fi - i, b = fj - j, k = j * W + i; return (hk[k] * (1 - a) + hk[k + 1] * a) * (1 - b) + (hk[k + W] * (1 - a) + hk[k + W + 1] * a) * b }
  const sx = 0.812, sz = 0.478, sy = 0.334, sl = Math.hypot(sx, sz), rise = sy / sl / VE
  for (let k = 0; k < n; k++) {
    const x = pos[k * 3], z = pos[k * 3 + 2], h = hk[k], ny = nrm.getY(k), p = pl[k]
    let lit = 1
    for (let st = 1; st <= 36 && h > 0.9; st++) { const d = st * 0.7, hh = at(x + (sx / sl) * d, z + (sz / sl) * d); if (hh < 0) break; const over = hh - (h + d * rise * VE * 0.5); if (over > 0) { lit = Math.max(0.6, 1 - over * 1.2); if (lit <= 0.6) break } }
    // 周围平均高度比这里高：在谷里，暗一点；比这里低：在山脊上，亮一点
    let avg = 0, cnt = 0
    for (const [ox, oz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2.1, 2.1], [-2.1, 2.1], [2.1, -2.1], [-2.1, -2.1]]) { const hh = at(x + ox, z + oz); if (hh >= 0) { avg += hh; cnt++ } }
    const ao = cnt ? Math.min(1.08, Math.max(0.62, 1 + (h - avg / cnt) * 0.45)) : 1
    const n1 = fbm(x * 0.35, z * 0.35, 3), n2 = fbm(x * 0.08 + 30, z * 0.08, 3)
    const steep = smooth((0.86 - ny) / 0.12)
    // 平原：农田（片状的颜色在着色器里画）；山坡：森林；高处：灌丛、高山草甸、裸岩，最高处积雪
    c.copy(COL.field).lerp(COL.field2, smooth(n2 * 2 - 0.4) * 0.6)
    const forest = t.copy(COL.forest).lerp(COL.forest2, smooth(n1 * 2 - 0.5))
    c.lerp(forest, (1 - p) * smooth((h - 0.95 - 0.2 * n2) / 0.35))
    c.lerp(t.copy(COL.scrub).lerp(COL.meadow, n1), smooth((h - 3.0 - 0.4 * n2) / 0.5))
    c.lerp(t.copy(COL.rock).lerp(COL.rock2, n1), Math.max(steep * smooth((h - 1.6) / 0.6) * 0.8, smooth((h - 3.9 - 0.3 * n1) / 0.4)) * 0.9)
    c.lerp(COL.snow, smooth((h - 4.55 - 0.3 * n2 + (1 - steep) * 0.05) / 0.15) * (1 - steep * 0.6))
    for (const ct of Object.values(CITIES)) { const d = Math.hypot(x - ct.at[0], z - ct.at[1]); c.lerp(COL.town, (1 - smooth((d - ct.r * 0.7) / (ct.r * 0.5 + 0.4))) * 0.7) }
    c.multiplyScalar(lit * ao)
    col.set([c.r, c.g, c.b], k * 3)
    if (k % 4000 === 0) yield
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aI8', new THREE.BufferAttribute(i8, 1)); geo.setAttribute('aI7', new THREE.BufferAttribute(i7, 1)); geo.setAttribute('aPlain', new THREE.BufferAttribute(pl, 1)); geo.setAttribute('aCity', new THREE.BufferAttribute(cy, 1))
  return { geo, z0, z1 }
}

// ---------- 地形的着色器：农田、波圈、烈度、盲区、定位圆 ----------
export const FX = {
  uEpi: { value: new THREE.Vector2() }, uRP: { value: 0 }, uRS: { value: 0 }, uWave: { value: 0 },
  uInt: { value: 0 }, uM8: { value: 1 }, uBlind: { value: 0 },
  uCirc: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }, uCircK: { value: new THREE.Vector3() },
  // 剖面上的波前：震源在剖面上的位置（x, y），两种波到震源的距离
  uFoc: { value: new THREE.Vector2(0, Y(CITIES.yingxiu.elev) - WENCHUAN.h) }, uRPf: { value: 0 }, uRSf: { value: 0 },
}
const RAMP = /* glsl */`
vec3 iRamp(float I) {
  vec3 c = vec3(1.0, 0.93, 0.55);
  c = mix(c, vec3(1.0, 0.78, 0.32), smoothstep(6.5, 7.5, I));
  c = mix(c, vec3(0.98, 0.55, 0.22), smoothstep(7.5, 8.5, I));
  c = mix(c, vec3(0.9, 0.3, 0.16), smoothstep(8.5, 9.5, I));
  c = mix(c, vec3(0.74, 0.12, 0.12), smoothstep(9.5, 10.5, I));
  c = mix(c, vec3(0.5, 0.04, 0.1), smoothstep(10.5, 11.3, I));
  return c;
}
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`
function terrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, FX)
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aI8; attribute float aI7; attribute float aPlain; attribute float aCity; varying float vI8; varying float vI7; varying float vPlain; varying float vCity; varying vec3 vQ;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vI8 = aI8; vI7 = aI7; vPlain = aPlain; vCity = aCity; vQ = (modelMatrix * vec4(position, 1.0)).xyz;`)
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec2 uEpi; uniform float uRP, uRS, uWave, uInt, uM8, uBlind; uniform vec3 uCirc[3]; uniform vec3 uCircK;
varying float vI8; varying float vI7; varying float vPlain; varying float vCity; varying vec3 vQ;
${RAMP}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // 平原上一块块的农田：沿两组方向切成小块，每块深浅不同，田埂稍暗
  vec2 q = mat2(0.83, -0.56, 0.56, 0.83) * vQ.xz / vec2(0.95, 0.62);
  vec2 cell = floor(q), f = fract(q);
  float r = h21(cell), edge = smoothstep(0.0, 0.08, min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y)));
  vec3 crop = vec3(0.24, 0.4, 0.13);                                   // 稻田、菜地
  crop = mix(crop, vec3(0.62, 0.58, 0.18), step(0.58, r));             // 油菜、麦子
  crop = mix(crop, vec3(0.42, 0.33, 0.22), step(0.8, r));              // 翻耕过的地
  crop = mix(crop, vec3(0.14, 0.26, 0.11), step(0.91, r));             // 林盘（川西平原上一丛丛的竹林和农家）
  diffuseColor.rgb = mix(diffuseColor.rgb, crop * (0.75 + 0.4 * h21(cell + 7.0)) * mix(0.5, 1.0, edge), vPlain * 0.95 * (1.0 - vCity));
  // 城区：灰色的街道和硬地，楼在上面
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.49, 0.47) * (0.9 + 0.2 * h21(floor(vQ.xz / 0.45))), vCity * 0.9);
  // 烈度：按度数分成一圈圈色带，色带之间一条细线
  float I = mix(vI7, vI8, uM8);
  float a = smoothstep(5.4, 5.9, I) * uInt;
  float band = abs(fract(I + 0.5) - 0.5);
  vec3 ic = iRamp(floor(I + 0.5)) * mix(0.62, 1.0, smoothstep(0.0, 0.05, band));
  diffuseColor.rgb = mix(diffuseColor.rgb, ic * (0.55 + 0.45 * dot(diffuseColor.rgb, vec3(0.6))), a * 0.82);
  // 盲区：一层淡红
  float dd = length(vQ.xz - uEpi);
  if (uBlind > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.18, 0.15), 0.35 * (1.0 - smoothstep(uBlind - 0.6, uBlind, dd)));
  // 定位的圆：亮线两边压一圈暗边，俯视时在农田上更醒目
  for (int i = 0; i < 3; i++) {
    float k = i == 0 ? uCircK.x : i == 1 ? uCircK.y : uCircK.z;
    if (k <= 0.0) continue;
    float dc = abs(length(vQ.xz - uCirc[i].xy) - uCirc[i].z);
    diffuseColor.rgb *= 1.0 - 0.6 * k * exp(-pow(dc / 1.5, 2.0));
  }
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float d = length(vQ.xz - uEpi);
  float wP = 0.55 + uRP * 0.012, wS = 0.7 + uRS * 0.014;
  float rp = uRP > 0.05 ? exp(-pow((d - uRP) / wP, 2.0)) : 0.0;
  float rs = uRS > 0.05 ? exp(-pow((d - uRS) / wS, 2.0)) : 0.0;
  // 横波扫过的地方在晃：一层很淡的橙色
  float inS = uRS > 0.05 ? (1.0 - smoothstep(uRS - 3.0, uRS, d)) * 0.08 : 0.0;
  totalEmissiveRadiance += uWave * (vec3(0.25, 0.65, 1.0) * rp * 1.4 + vec3(1.0, 0.48, 0.16) * (rs * 1.6 + inS));
  if (uBlind > 0.0) totalEmissiveRadiance += vec3(1.0, 0.25, 0.2) * exp(-pow((d - uBlind) / 0.45, 2.0)) * 0.9;
  for (int i = 0; i < 3; i++) {
    float k = i == 0 ? uCircK.x : i == 1 ? uCircK.y : uCircK.z;
    if (k <= 0.0) continue;
    float dc = abs(length(vQ.xz - uCirc[i].xy) - uCirc[i].z);
    vec3 cc = i == 0 ? vec3(1.0, 0.82, 0.3) : i == 1 ? vec3(0.35, 0.85, 1.0) : vec3(1.0, 0.45, 0.65);
    totalEmissiveRadiance += cc * exp(-pow(dc / 0.7, 2.0)) * 1.8 * k;
  }
}`)
  }
  return m
}

// ---------- 岩层贴图（侧面和剖面共用）：u 沿水平方向，v 从底面往上 ----------
const V_SPAN = 38
let rockTex: THREE.CanvasTexture | null = null
function getRock() {
  if (rockTex) return rockTex
  const W = 2048, H = 1536, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  let s = 17; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const yOf = (km: number) => H - ((km - FLOOR) / V_SPAN) * H
  // 横向的起伏取整数个周期，贴图左右能无缝拼接
  const TAU2 = (Math.PI * 4) / W, TAU7 = (Math.PI * 14) / W
  // 由深到浅：花岗岩、片麻岩、灰岩、页岩、红色砂岩（四川盆地的“红层”）、黄色砂岩、泥岩、表土
  const bands: [number, string][] = [[-24, '#7b736d'], [-17, '#5c5a60'], [-12.5, '#868b8a'], [-9.5, '#6f7472'], [-7.5, '#5d544b'], [-6, '#9a5a40'], [-4.6, '#b48e62'], [-3.6, '#8a4f43'], [-2.6, '#a8683f'], [-1.7, '#c09a6a'], [-0.9, '#86553f'], [0, '#9f7d57'], [1.2, '#8b7458'], [3, '#7e6d5a'], [6, '#736658']]
  for (let i = 0; i < bands.length; i++) {
    const [km, col] = bands[i], top = i + 1 < bands.length ? bands[i + 1][0] : 14
    g.fillStyle = col; g.beginPath(); g.moveTo(0, yOf(km) + 14)
    for (let x = 0; x <= W; x += 16) g.lineTo(x, yOf(top) + Math.sin(x * TAU2 + i * 1.7) * 9 + Math.sin(x * TAU7 + i) * 3)
    g.lineTo(W, yOf(km) + 14); g.fill()
    // 层与层之间一条深色的界线
    g.strokeStyle = 'rgba(30,22,18,0.55)'; g.lineWidth = 2.2; g.beginPath()
    for (let x = 0; x <= W; x += 16) g.lineTo(x, yOf(top) + Math.sin(x * TAU2 + i * 1.7) * 9 + Math.sin(x * TAU7 + i) * 3)
    g.stroke()
  }
  // 薄层理
  for (let i = 0; i < 420; i++) { const y = rnd() * H, a = 0.06 + rnd() * 0.1; g.strokeStyle = rnd() > 0.5 ? `rgba(35,25,20,${a})` : `rgba(245,230,205,${a})`; g.lineWidth = 1 + rnd() * 1.6; g.beginPath(); for (let x = 0; x <= W; x += 24) g.lineTo(x, y + Math.sin(x * TAU2 + y) * 9); g.stroke() }
  // 深处花岗岩的晶粒，浅处砂岩里的砾石
  for (let i = 0; i < 26000; i++) { const x = rnd() * W, y = rnd() * H, deep = y > yOf(-12.5), r = 0.8 + rnd() * rnd() * (deep ? 3 : 4.5); g.fillStyle = deep ? `rgba(${rnd() > 0.55 ? '235,225,220' : rnd() > 0.5 ? '35,32,36' : '190,140,120'},${0.25 + rnd() * 0.35})` : `rgba(${rnd() > 0.5 ? '230,212,180' : '45,32,24'},${0.12 + rnd() * 0.22})`; g.fillRect(x, y, r, deep ? r : r * 0.6) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 16
  return (rockTex = t)
}
/** 剖面材质：岩层贴图，再叠上从震源扩开的两道波前 */
function faceMaterial(waves: boolean) {
  const m = new THREE.MeshStandardMaterial({ map: getRock(), roughness: 1, side: THREE.DoubleSide })
  if (waves) m.onBeforeCompile = s => {
    Object.assign(s.uniforms, FX)
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vQ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvQ = position;')
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uFoc; uniform float uRPf, uRSf, uWave; varying vec3 vQ;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float d = length(vQ.xy - uFoc);
  float rp = uRPf > 0.05 ? exp(-pow((d - uRPf) / (0.35 + uRPf * 0.01), 2.0)) : 0.0;
  float rs = uRSf > 0.05 ? exp(-pow((d - uRSf) / (0.45 + uRSf * 0.012), 2.0)) : 0.0;
  totalEmissiveRadiance += uWave * (vec3(0.25, 0.65, 1.0) * rp * 1.5 + vec3(1.0, 0.48, 0.16) * rs * 1.7);
}`)
  }
  return m
}
/** 一面侧墙：沿边走的一串 [水平坐标, 地面海拔 km]，从地面一直到底面 */
function wall(pts: [number, number][]) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  pts.forEach(([u, h], i) => { pos.push(u, Y(h), 0, u, FLOOR, 0); uv.push(u / 60, (Y(h) - FLOOR) / V_SPAN, u / 60, 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3) } })
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
}
const profileX = (z: number, x0 = X0, x1 = X1, n = NX) => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / n; return [x, height(x, z)] as [number, number] })
const profileZ = (x: number, z0: number, z1: number, n: number) => Array.from({ length: n + 1 }, (_, j) => { const z = z0 + ((z1 - z0) * j) / n; return [z, height(x, z)] as [number, number] })

// ---------- 剖面上的断层（龙门山断层，示意）：地面出露在 x ≈ 6 km，向西北倾斜，经过震源 ----------
const FOC_Y = Y(CITIES.yingxiu.elev) - WENCHUAN.h
export const FOCUS: [number, number, number] = [0, FOC_Y, CUT_Z]
const faultX = (y: number, top: number) => { const d = (top - y) / (top - FOC_Y); return 6 - 6 * Math.pow(Math.max(0, d), 1.15) }
/** 断层面上一串点（x, y），从地面到底面 */
export const FAULT: [number, number][] = (() => { const top = Y(height(6, CUT_Z)), out: [number, number][] = []; for (let k = 0; k <= 24; k++) { const y = top + ((FLOOR - top) * k) / 24; out.push([faultX(y, top), y]) } return out })()
/** 上盘错动的方向（沿断层面往上） */
const SLIP_DIR = new THREE.Vector2(FAULT[0][0] - FAULT[10][0], FAULT[0][1] - FAULT[10][1]).normalize()
function cutFace() {
  const prof = profileX(CUT_Z), top = FAULT[0]
  // tilt：上盘的岩层被推挤得向西北倾斜（示意），下盘是平的
  const shape = (pts: [number, number][], tilt = 0) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
    const g = new THREE.ShapeGeometry(sh, 1), p = g.attributes.position, uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 40; uv[i * 2 + 1] = (p.getY(i) - FLOOR + tilt * (p.getX(i) - 6)) / V_SPAN }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g
  }
  const left = prof.filter(([x]) => x < top[0]).map(([x, h]) => [x, Y(h)] as [number, number])
  const right = prof.filter(([x]) => x > top[0]).map(([x, h]) => [x, Y(h)] as [number, number])
  const hang = shape([[X0, FLOOR], ...left, ...FAULT], 0.2)
  const foot = shape([...FAULT, [X1, FLOOR], ...right.slice().reverse()])
  return { hang, foot }
}
/** 断层线：剖面上一条深色的缝，错动时发红光 */
function FaultLine({ slip }: { slip: number }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(FAULT.map(([x, y]) => new THREE.Vector3(x, y, 0.06))), 60, 0.16, 6), [])
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => { if (mat.current) mat.current.color.set('#2a1712').lerp(new THREE.Color('#ff5a3a'), Math.min(1, slip * 3) * (0.75 + 0.25 * Math.sin(clock.elapsedTime * 6))) })
  return <mesh geometry={geo}><meshBasicMaterial ref={mat} color="#2a1712" toneMapped={false} /></mesh>
}

// ---------- 河 ----------
const BRANCHES: [number, number, number][][] = [
  [[13.4, -3.5, 0], [24, -11, 0], [42, -16, 0], [62, -17, 0], [86, -23, 0], [114, -29, 0]],
  [[13.4, -3.5, 0], [27, 3, 0], [48, 11, 0], [78, 14, 0], [114, 19, 0]],
  [[13.4, -3.5, 0], [30, -6, 0], [52, -5, 0], [68, -8, 0], [80, -12, 0]],
]
/** 公路：城市之间的几条，成都外面两圈环路 */
const ROADS: [number, number][][] = (() => {
  const C = (k: keyof typeof CITIES) => CITIES[k].at as unknown as [number, number]
  const ring = (r: number) => Array.from({ length: 49 }, (_, i) => [CITIES.chengdu.at[0] + Math.cos((i / 48) * Math.PI * 2) * r, CITIES.chengdu.at[1] + Math.sin((i / 48) * Math.PI * 2) * r] as [number, number])
  return [
    [C('chengdu'), [40, -6], C('dujiangyan')],
    [C('dujiangyan'), [6, 0.8], C('yingxiu'), [-9, -10], [-18, -24], C('wenchuan')],
    [C('chengdu'), [62, -40], [55, -75], C('mianyang')],
    [C('mianyang'), [25, -118], C('beichuan')],
    [C('chengdu'), [95, 8], [112, 14]], [C('chengdu'), [90, -25], [112, -36]],
    ring(6), ring(10.5),
  ]
})()
function Roads() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (const line of ROADS) {
      const curve = new THREE.CatmullRomCurve3(line.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
      const N = Math.max(40, Math.round(curve.getLength() * 1.5)), pos: number[] = [], idx: number[] = []
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t), sx = -tg.z * 0.16, sz = tg.x * 0.16
        for (const k of [-1, 1]) { const x = p.x + sx * k, z = p.z + sz * k; pos.push(x, Y(height(x, z)) + 0.08, z) }
        if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); parts.push(g)
    }
    return mergeGeometries(parts)
  }, [])
  return <mesh geometry={geo} renderOrder={1}><meshStandardMaterial color="#e2dccd" roughness={0.85} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} /></mesh>
}
function River({ path, w0, w1 }: { path: [number, number, number][]; w0: number; w1: number }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(path.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
    const N = 520, pos: number[] = [], uv: number[] = [], idx: number[] = []
    let len = 0, prev = curve.getPointAt(0)
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t), side = new THREE.Vector3(-tg.z, 0, tg.x).normalize(), w = (w0 + (w1 - w0) * t) / 2
      len += p.distanceTo(prev); prev = p
      for (const s of [-1, 1]) { const x = p.x + side.x * w * s, z = p.z + side.z * w * s; pos.push(x, Y(Math.min(height(x, z), height(p.x, p.z))) + 0.1, z); uv.push(s * 0.5 + 0.5, len * 0.3) }
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
    return g
  }, [path, w0, w1])
  const ripple = useRipple([1, 1], -0.2)
  return <mesh geometry={geo} renderOrder={2}><meshPhysicalMaterial color="#47808f" roughness={0.06} metalness={0.1} side={THREE.DoubleSide} normalMap={ripple} normalScale={new THREE.Vector2(0.3, 0.3)} clearcoat={0.6} envMapIntensity={1.2} polygonOffset polygonOffsetFactor={-2} /></mesh>
}

// ---------- 城镇：一片片的楼（高度放大，远看才认得出是城市） ----------
function* townGen(): Generator<void, Float32Array> {
  const out: number[] = []
  let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  // 城市：沿两组方向铺开街道网格，一个街区里几栋楼，中心高、边上矮；街道留空，远看是一格一格的城区
  for (const c of Object.values(CITIES)) {
    const a = rnd() * Math.PI, ca = Math.cos(a), sa = Math.sin(a), blk = c.r > 4 ? 0.9 : 0.55, R = c.r * 0.98
    for (let u = -R; u <= R; u += blk) for (let v = -R; v <= R; v += blk) {
      const rr = Math.hypot(u, v); if (rr > R * (0.85 + 0.15 * rnd())) continue
      const core = 1 - rr / c.r, big = c.r > 4
      // 街区里 2×2 个位置，空一些出来当院子
      for (const [du, dv] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
        if (rnd() < 0.1) continue
        const uu = u + du * blk, vv = v + dv * blk, x = c.at[0] + uu * ca - vv * sa, z = c.at[1] + uu * sa + vv * ca
        const h = (0.05 + rnd() * 0.05 + (big ? core * core * rnd() * 0.3 : 0)) * VE * 2.2
        out.push(x, Y(height(x, z)), z, blk * (0.36 + rnd() * 0.08), h, blk * (0.34 + rnd() * 0.1), a, rnd())
      }
    }
    yield
  }
  // 平原上一处处的村子（林盘）：几户人家挤在一起
  for (let v = 0; v < 520; v++) {
    const cx = 14 + rnd() * 95, cz = -132 + rnd() * 155
    if (cx < frontX(cz) + 2 || Object.values(CITIES).some(c => Math.hypot(cx - c.at[0], cz - c.at[1]) < c.r + 1.5)) continue
    const a = rnd() * Math.PI, n = 3 + Math.floor(rnd() * 6)
    for (let k = 0; k < n; k++) { const x = cx + (rnd() - 0.5) * 0.7, z = cz + (rnd() - 0.5) * 0.7; out.push(x, Y(height(x, z)), z, 0.07 + rnd() * 0.05, 0.05 * VE * 1.6, 0.05 + rnd() * 0.04, a, 0.3 + rnd() * 0.6) }
    if (v % 100 === 0) yield
  }
  return new Float32Array(out)
}
function Towns() {
  const data = useJob('towns', townGen, 3)
  const mesh = useMemo(() => {
    if (!data) return null
    const n = data.length / 8, geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), n)
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < n; i++) {
      const o = i * 8
      m.setMatrixAt(i, mat.compose(p.set(data[o], data[o + 1], data[o + 2]), q.setFromAxisAngle(up, data[o + 6]), sc.set(data[o + 3], data[o + 4], data[o + 5])))
      const r = data[o + 7]; m.setColorAt(i, col.set(r < 0.4 ? '#e4e1da' : r < 0.7 ? '#c9c5bd' : r < 0.85 ? '#a86f58' : r < 0.95 ? '#8c99a4' : '#5f6b74'))
    }
    m.receiveShadow = false
    return m
  }, [data])
  return mesh ? <primitive object={mesh} /> : null
}

// ---------- 地震台：一根杆子顶着一个小三角（示意的符号，按比例真实的台站在这么大的沙盘上看不见） ----------
function Stations({ mode, hot }: { mode: 'net' | 'abc' | 'none'; hot: number[] }) {
  const list = useMemo(() => STATIONS.map(([x, z]) => [x, Y(height(x, z)), z] as [number, number, number]), [])
  const geo = useMemo(() => { const g = new THREE.ConeGeometry(0.75, 1.3, 3); g.rotateX(Math.PI); g.translate(0, 2.1, 0); return g }, [])
  const pole = useMemo(() => new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6).translate(0, 0.8, 0), [])
  const hotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe9a8', toneMapped: false }), [])
  const warm = useMemo(() => new THREE.Color('#ff7b47'), [])
  useFrame(({ clock }) => { hotMat.color.set('#ffe9a8').lerp(warm, 0.5 + 0.5 * Math.sin(clock.elapsedTime * 8)) })
  if (mode !== 'net') return null
  return <group>{list.map((p, i) => (
    <group key={i} position={p} scale={1.8}>
      <mesh geometry={pole}><meshStandardMaterial color="#d9dde0" metalness={0.4} roughness={0.5} /></mesh>
      {hot.includes(i) ? <mesh geometry={geo} material={hotMat} scale={1.5} /> : <mesh geometry={geo}><meshStandardMaterial color="#e9f3f1" emissive="#35c7b3" emissiveIntensity={0.35} roughness={0.4} /></mesh>}
    </group>
  ))}</group>
}

// ---------- 地块的侧面、底座、周围的地面 ----------
function useSides() {
  const g = useMemo(() => ({
    north: wall(profileX(Z0)), west: wall(profileZ(X0, Z0, CUT_Z, NZ_MAIN)), east: wall(profileZ(X1, Z0, CUT_Z, NZ_MAIN)),
    sFront: wall(profileX(Z1)), sWest: wall(profileZ(X0, CUT_Z, Z1, NZ_SLAB)), sEast: wall(profileZ(X1, CUT_Z, Z1, NZ_SLAB)),
  }), [])
  const mat = useMemo(() => faceMaterial(false), [])
  return { g, mat }
}
function Plinth({ z0, z1 }: { z0: number; z1: number }) {
  return <group>
    <mesh position={[(X0 + X1) / 2, FLOOR - 0.9, (z0 + z1) / 2]}><boxGeometry args={[X1 - X0 + 1.4, 1.8, z1 - z0 + (z1 === Z1 ? 1.4 : 0.7)]} /><meshPhysicalMaterial color="#22272b" roughness={0.45} clearcoat={0.4} /></mesh>
  </group>
}
function Surroundings() {
  const grass = useMemo(() => { const t = makeGround('#6f7d55', '86,100,62', '120,124,90', 4); t.repeat.set(90, 90); return t }, [])
  const geo = useMemo(() => {
    const N = 260, pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, r = 520, hgt = 40 + 60 * fbm(a * 7, 2, 4) + 50 * Math.max(0, Math.cos(a + 2.4))
      pos.push(Math.cos(a) * r + 20, FLOOR - 3, Math.sin(a) * r - 55, Math.cos(a) * r + 20, FLOOR - 3 + hgt, Math.sin(a) * r - 55)
      if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
  }, [])
  return <group>
    <mesh geometry={geo}><meshBasicMaterial color="#9aa8b4" side={THREE.DoubleSide} /></mesh>
    <mesh position={[20, FLOOR - 3, -55]} rotation-x={-Math.PI / 2}><circleGeometry args={[540, 80]} /><meshStandardMaterial map={grass} color="#9aa58a" roughness={1} /></mesh>
  </group>
}

/** 震源：剖面上的一颗亮星，外面一圈光晕 */
function Focus({ k }: { k: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,250,235,1)'); r.addColorStop(0.18, 'rgba(255,210,120,0.9)'); r.addColorStop(0.45, 'rgba(255,110,60,0.35)'); r.addColorStop(1, 'rgba(255,80,40,0)')
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const ref = useRef<THREE.Sprite>(null)
  useFrame(({ clock }) => { const s = ref.current; if (!s) return; const p = 1 + 0.12 * Math.sin(clock.elapsedTime * 5); s.scale.setScalar(5.2 * k * p); (s.material as THREE.SpriteMaterial).opacity = k })
  if (k < 0.01) return null
  return <sprite ref={ref} position={[FOCUS[0], FOCUS[1], FOCUS[2] + 0.3]} renderOrder={12}><spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
}

export function Region({ want }: { want: RegionWant }) {
  const main = useJob('tile-main', () => tileGen(Z0, CUT_Z, NZ_MAIN), 0)
  const slab = useJob('tile-slab', () => tileGen(CUT_Z, Z1, NZ_SLAB), 1)
  const tmat = useMemo(() => terrainMaterial(), [])
  const { g: sides, mat: sideMat } = useSides()
  const face = useMemo(() => cutFace(), [])
  const fmat = useMemo(() => faceMaterial(true), [])
  // 前缘挪开：往前、往下滑出画面（1.6 秒左右）
  const slabRef = useRef<THREE.Group>(null), openK = useRef(want.open ? 1 : 0)
  const hang = useRef<THREE.Group>(null), slipK = useRef(0)
  useFrame((_, dt) => {
    const goal = want.open ? 1 : 0; openK.current += Math.sign(goal - openK.current) * Math.min(Math.abs(goal - openK.current), dt * 0.7)
    const k = openK.current, e = k < 0.5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2
    const g = slabRef.current; if (g) { g.position.set(0, -e * 70, e * 60); g.visible = k < 0.999 }
    const sg = want.slip ?? 0; slipK.current += (sg - slipK.current) * Math.min(1, dt * 2.2)
    if (hang.current) { const d = slipK.current * 0.9; hang.current.position.set(SLIP_DIR.x * d, SLIP_DIR.y * d, 0) }
    // 着色器里的量
    const w = want.waves
    FX.uWave.value = w ? 1 : 0
    if (w) { FX.uEpi.value.set(...w.epi); FX.uRP.value = w.p; FX.uRS.value = w.s; FX.uRPf.value = w.pf; FX.uRSf.value = w.sf }
    else if (want.blind || want.circles) FX.uEpi.value.set(...WENCHUAN.epi)
    const it = want.intensity
    FX.uInt.value += ((it ? it.k : 0) - FX.uInt.value) * Math.min(1, dt * 3)
    if (it) FX.uM8.value += ((it.M === 8 ? 1 : 0) - FX.uM8.value) * Math.min(1, dt * 2.5)
    FX.uBlind.value = want.blind ?? 0
    const cs = want.circles ?? []
    for (let i = 0; i < 3; i++) { const c = cs[i]; if (c) FX.uCirc.value[i].set(c[0], c[1], c[2]); (FX.uCircK.value as THREE.Vector3).setComponent(i, c ? 1 : 0) }
  })
  return (
    <group>
      <Surroundings />
      {main && <mesh geometry={main.geo} material={tmat} />}
      <mesh geometry={sides.north} material={sideMat} position={[0, 0, Z0]} rotation-y={Math.PI} scale-x={-1} />
      <mesh geometry={sides.west} material={sideMat} position={[X0, 0, 0]} rotation-y={-Math.PI / 2} />
      <mesh geometry={sides.east} material={sideMat} position={[X1, 0, 0]} rotation-y={-Math.PI / 2} />
      {/* 穿过震中的剖面：断层把它分成上盘（西北）和下盘（东南） */}
      <group position={[0, 0, CUT_Z]}>
        <group ref={hang}><mesh geometry={face.hang} material={fmat} /></group>
        <mesh geometry={face.foot} material={fmat} />
        <FaultLine slip={want.slip ?? 0} />
      </group>
      <Focus k={want.focus ?? 0} />
      <Plinth z0={Z0} z1={CUT_Z} />
      <group ref={slabRef}>
        {slab && <mesh geometry={slab.geo} material={tmat} />}
        <mesh geometry={sides.sFront} material={sideMat} position={[0, 0, Z1]} />
        <mesh geometry={sides.sWest} material={sideMat} position={[X0, 0, 0]} rotation-y={-Math.PI / 2} />
        <mesh geometry={sides.sEast} material={sideMat} position={[X1, 0, 0]} rotation-y={-Math.PI / 2} />
        <Plinth z0={CUT_Z} z1={Z1} />
      </group>
      <River path={MINJIANG} w0={0.5} w1={1.3} />
      <River path={FUJIANG} w0={0.4} w1={1.1} />
      {/* 岷江出山口（都江堰）以后分成几支，流过成都平原 */}
      {BRANCHES.map((b, i) => <River key={i} path={b} w0={0.7} w1={0.45} />)}
      <Roads />
      <Towns />
      <Stations mode={want.stations ?? 'none'} hot={want.hot ?? []} />
    </group>
  )
}
