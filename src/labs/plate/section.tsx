// 大剖面的画法：朝镜头的一面是剖开的岩层（着色器按每一列的分层画：海水、沉积物、洋壳、大陆地壳、岩石圈地幔、软流层、岩浆），
// 后面是一直延伸到天边的地面和海面。形状在 section.ts；会动的东西（洋底往外推、板块俯冲、岩浆上涌）靠着色器里的时间，不重建模型。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeGround, useRipple } from '@/lab-kit'
import { MAT, MAX_LAYERS, X, bump, column, deep, fbmL, heightAt, rowGap, riftLake, slabTop, sm, wiggle, type Shape } from './shape'

const NX = 4096, X0 = X.west, X1 = X.east
const FACE_W: [number, number] = [-900, 900]
/** 剖开的一面画到多深：比分层算到的深度（BOTTOM）再深一些，远景里看不到底边 */
const FACE_BOTTOM = -170

const VERT = /* glsl */`
varying vec3 vP;
#include <fog_pars_vertex>
void main() { vP = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`
const FRAG = /* glsl */`
uniform sampler2D uL; uniform float uX0, uX1, uTime, uRidgeT, uSlabT, uStripes, uFossil, uGlow;
uniform vec4 uPl[5]; uniform vec4 uPw[5]; uniform vec4 uFa[6]; uniform float uFaA[6]; uniform vec3 uFo[4];
varying vec3 vP;
#include <fog_pars_fragment>
float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
/** 泡状的枕状熔岩：最近的格点中心 */
float cells(vec2 p) { vec2 i = floor(p), f = fract(p); float d = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), o = vec2(h1(i + g), h1(i + g + 3.7)) * 0.8 + 0.1; d = min(d, length(g + o - f)); } return d; }
float segD(vec2 p, vec2 a, vec2 b, out float t) { vec2 ab = b - a; t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
void main() {
  float x = vP.x, y = vP.y;
  float fc = (x - uX0) / (uX1 - uX0) * ${NX}.0 - 0.5;
  int i0 = int(clamp(floor(fc), 0.0, ${NX - 1}.0)), i1 = min(i0 + 1, ${NX - 1});
  float fr = clamp(fc - floor(fc), 0.0, 1.0);
  float top = 1e4, mat = -1.0, u = 0.0, flow = 0.0, below = -1e4, surf = -1e4;
  for (int k = 0; k < ${MAX_LAYERS}; k++) {
    vec4 a = texelFetch(uL, ivec2(i0, k), 0), b = texelFetch(uL, ivec2(i1, k), 0);
    vec4 n = fr < 0.5 ? a : b;
    if (n.g < 0.5) break;
    float yk = abs(a.g - b.g) < 0.1 ? mix(a.r, b.r, fr) : n.r;
    if (k == 0) surf = yk;
    if (y < yk) { top = yk; mat = n.g; u = abs(a.g - b.g) < 0.1 ? mix(a.b, b.b, fr) : n.b; flow = n.a; } else { below = yk; break; }
  }
  if (mat < 0.0) discard;
  float d = top - y;                                  // 在这一层里有多深
  vec2 q = vec2(x, y);
  // 洋底的花纹跟着板块走：洋中脊两侧往外推，太平洋板块朝海沟、往下插
  float pu = x;
  if (flow > 0.5 && flow < 2.5) pu = abs(u) - uRidgeT;
  else if (flow > 2.5 && flow < 3.5) pu = u - uSlabT;
  else if (flow > 3.5) pu = u;
  vec2 pq = vec2(pu, y);
  vec3 col; float hgt = 0.0, emit = 0.0;
  float big = fbm(q * vec2(0.08, 0.16));
  if (mat < 1.5) {                                    // 海水
    float t = clamp(-y / 9.0, 0.0, 1.0);
    col = mix(lin(vec3(0.16, 0.42, 0.58)), lin(vec3(0.03, 0.11, 0.22)), pow(t, 0.6));
    col *= 0.92 + 0.12 * fbm(vec2(x * 0.15 + uTime * 0.05, y * 0.6));
    if (d < 0.12) col = mix(col, lin(vec3(0.8, 0.92, 0.96)), 0.6);
  } else if (mat < 2.5) {                             // 沉积物：一层层很细的纹
    float l = sin(d * 30.0 + fbm(pq * vec2(0.6, 3.0)) * 5.0) * (1.0 - smoothstep(0.15, 0.5, fwidth(d) * 30.0 / 6.28));
    col = mix(lin(vec3(0.70, 0.64, 0.52)), lin(vec3(0.52, 0.47, 0.38)), 0.5 + 0.5 * l);
    hgt = l * 0.02;
  } else if (mat < 3.5) {                             // 洋壳：上部是枕状熔岩，下部是一道道竖着的岩墙
    float th = max(0.01, top - below);
    float pil = cells(pq * vec2(2.6, 3.4)), dik = sin(pu * 10.0 + fbm(pq * vec2(1.0, 0.4)) * 6.0);
    float upper = 1.0 - smoothstep(0.35, 0.6, d / th);
    col = lin(vec3(0.36, 0.37, 0.35)) * (0.85 + 0.3 * big);
    col *= mix(0.82 + 0.25 * smoothstep(0.1, 0.55, pil), 0.85 + 0.12 * dik, 1.0 - upper);
    hgt = mix(smoothstep(0.55, 0.0, pil) * 0.08, dik * 0.02, 1.0 - upper);
    if (uStripes > 0.0 && flow > 0.5 && flow < 2.5) {     // 洋中脊两侧对称的条带：每一条是同一个时期长出来的
      float T0 = uRidgeT - abs(u);
      float pol = step(0.0, sin(T0 * 0.55 + sin(T0 * 0.23) * 1.7));
      col = mix(col, mix(lin(vec3(0.85, 0.83, 0.78)), lin(vec3(0.78, 0.33, 0.22)), pol), 0.6 * uStripes * (1.0 - smoothstep(uRidgeT - 0.6, uRidgeT, abs(u))));
    }
  } else if (mat < 4.5) {                             // 大陆上地壳：花岗岩，粉灰色带深色斑点
    float sp = vn(q * vec2(3.0, 5.0)), sp2 = vn(q * vec2(7.0, 11.0) + 5.0), jt = cells(q * vec2(0.5, 0.8));
    col = mix(lin(vec3(0.74, 0.6, 0.5)), lin(vec3(0.6, 0.55, 0.52)), big);
    col *= 1.0 - 0.3 * smoothstep(0.72, 0.85, sp) - 0.15 * smoothstep(0.8, 0.9, sp2);
    col *= 0.86 + 0.14 * smoothstep(0.02, 0.12, jt);                                    // 节理：岩块之间的裂缝
    col = mix(col, lin(vec3(0.55, 0.45, 0.34)), (1.0 - smoothstep(0.0, 0.5, d)) * 0.6);   // 地表风化的一层
    hgt = step(0.8, sp) * 0.03 + big * 0.05;
  } else if (mat < 5.5) {                             // 下地壳：颜色更深，带片麻状的条纹
    float f = sin(y * 3.2 + fbm(q * vec2(0.25, 0.5)) * 7.0) * (1.0 - smoothstep(0.2, 0.6, fwidth(y) * 3.2 / 6.28));
    float gr = vn(q * vec2(3.0, 6.0));
    col = mix(lin(vec3(0.47, 0.43, 0.4)), lin(vec3(0.36, 0.33, 0.31)), 0.5 + 0.4 * f) * (0.9 + 0.18 * gr);
    hgt = f * 0.03 + gr * 0.03;
  } else if (mat < 6.5) {                             // 岩石圈地幔：橄榄绿的深色岩石
    float m = fbm(q * vec2(0.35, 0.6)), gr = vn(q * vec2(4.0, 7.0));
    col = mix(lin(vec3(0.36, 0.39, 0.27)), lin(vec3(0.22, 0.25, 0.18)), m) * (0.88 + 0.22 * gr);
    col = mix(col, lin(vec3(0.42, 0.3, 0.2)), smoothstep(-4.0, 0.0, -(y - below)) * 0.35);   // 往下越来越热
    hgt = m * 0.1 + gr * 0.04;
  } else if (mat < 7.5) {                             // 软流层：又热又软，慢慢翻滚
    // 一个个缓慢翻滚的对流环：沿着环的流线画淡淡的纹理，纹理顺着环慢慢转
    float cw = 46.0, ci = floor(x / cw), dir = mod(ci, 2.0) * 2.0 - 1.0;
    vec2 lc = vec2(x - (ci + 0.5) * cw, (d - 14.0)) * vec2(1.0, 1.7);
    float rr = length(lc), ang = atan(lc.y, lc.x) + dir * uTime * 0.035;
    float stream = fbm(vec2(ang * 2.2, rr * 0.18));
    float lines = 0.5 + 0.5 * sin(rr * 0.55 + stream * 4.0);
    float dk = clamp(d / 22.0, 0.0, 1.0);                                            // 越往下越深
    col = mix(lin(vec3(0.5, 0.25, 0.13)), lin(vec3(0.24, 0.1, 0.06)), dk);
    col *= 0.86 + 0.2 * mix(lines, 0.5, smoothstep(0.5, 1.5, fwidth(rr) * 0.55));
    col *= 0.92 + 0.12 * vn(q * vec2(2.5, 4.0));
    emit = 0.05;
    hgt = lines * 0.04;
  } else {                                            // 沉积岩层：原来海底的沉积物，被挤得弯弯曲曲
    float ph = y * 3.0 + 1.5 * sin(x * 0.26) + 0.7 * sin(x * 0.63 + y * 0.4) + fbm(q * 0.5) * 0.8;
    float idx = mod(floor(ph), 4.0);
    vec3 c0 = lin(vec3(0.80, 0.76, 0.65)), c1 = lin(vec3(0.50, 0.47, 0.42)), c2 = lin(vec3(0.68, 0.58, 0.44)), c3 = lin(vec3(0.62, 0.62, 0.56));
    col = idx < 0.5 ? c0 : idx < 1.5 ? c1 : idx < 2.5 ? c2 : c3;
    col *= 0.88 + 0.2 * fbm(q * vec2(2.0, 6.0));
    hgt = fract(ph) * 0.04;
  }
  // 层和层的交界：一条细的深色线
  float lw = fwidth(y) * 1.4;
  if (mat > 1.5) col *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, lw * 2.0, d)) * step(1.5, mat);
  // 断层
  for (int i = 0; i < 6; i++) { if (uFaA[i] <= 0.0) continue; float t; float fd = segD(q, uFa[i].xy, uFa[i].zw, t); col = mix(col, lin(vec3(0.12, 0.1, 0.09)), uFaA[i] * (1.0 - smoothstep(0.04, 0.04 + lw * 1.5, fd)) * 0.8); }
  // 化石：埋在沉积岩层里的菊石
  if (uFossil > 0.0 && mat > 8.5) for (int i = 0; i < 4; i++) {
    vec2 r = q - uFo[i].xy; float rr = length(r) / uFo[i].z;
    if (rr < 1.0) { float th = atan(r.y, r.x); float s = fract(log(rr + 0.04) * 1.9 - th / 6.2832); float rib = fract(th * 6.0 / 6.2832 * (6.0 + 8.0 * rr));
      vec3 shell = mix(lin(vec3(0.93, 0.88, 0.76)), lin(vec3(0.62, 0.52, 0.38)), smoothstep(0.75, 0.95, s) + 0.3 * smoothstep(0.85, 1.0, rib));
      col = mix(col, shell, uFossil * (1.0 - smoothstep(0.92, 1.0, rr))); }
  }
  // 岩浆：从软流层往上涌
  float mg = 0.0;
  if (y < surf + 0.05) for (int i = 0; i < 5; i++) {
    if (uPw[i].z <= 0.0) continue;
    float t; vec2 qw = q + vec2(sin(y * 0.45 + float(i) * 2.0 + uTime * 0.3) * 0.35 * uPw[i].y, 0.0);
    float pd = segD(qw, uPl[i].xy, uPl[i].zw, t);
    float L = length(uPl[i].zw - uPl[i].xy), w = mix(uPw[i].x, uPw[i].y, t);
    float cond = 1.0 - smoothstep(w * 0.2, w * 0.3, pd);                         // 细细的一条通道
    float sp = max(1.4, uPw[i].x * 1.3), fb = fract((t * L - uTime * 0.9) / sp);
    float blob = 1.0 - smoothstep(w * 0.4, w * 0.52, length(vec2((fb - 0.5) * sp, pd)));   // 一团团往上走的岩浆
    vec2 ch = mix(uPl[i].xy, uPl[i].zw, 0.8); float cw = mix(uPw[i].x, uPw[i].y, 0.8);
    float cham = 1.0 - smoothstep(0.75, 1.0, length((q - ch) / vec2(cw * 0.85, cw * 0.42)));  // 岩浆房
    mg = max(mg, uPw[i].z * max(max(cond, blob * 0.95), cham));
  }
  if (mg > 0.0) {
    float fl = fbm(vec2(x * 0.6, y * 0.35 - uTime * 0.6));
    vec3 hot = mix(lin(vec3(0.62, 0.12, 0.03)), lin(vec3(1.0, 0.5, 0.12)), smoothstep(0.3, 0.85, fl) * smoothstep(0.3, 1.0, mg));
    col = mix(col, hot * (0.95 + uGlow * 1.5), smoothstep(0.0, 0.3, mg)); emit = max(emit, mg * 0.5);
  }
  // 起伏的光影：把小起伏当作法线，从左上打光
  vec3 N = normalize(vec3(-dFdx(hgt) / max(1e-4, fwidth(x)) * 0.6, -dFdy(hgt) / max(1e-4, fwidth(y)) * 0.6, 1.0));
  float sh = 0.82 + 0.3 * dot(N, normalize(vec3(-0.45, 0.6, 0.66)));
  col *= mat < 1.5 ? 1.0 : sh;
  col *= 1.0 + emit * 0.35;
  if (mat > 1.5) col *= mix(1.0, 0.72, clamp(-y / 75.0, 0.0, 1.0));                    // 越往深处越暗一点
  gl_FragColor = vec4(col, mat < 1.5 ? 0.62 : 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

/** 地面的颜色：按地方、高度、坡度给。n1 是大片的深浅（植被疏密），n2 是细碎的斑驳 */
const mixc = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)))
function groundColor(x: number, h: number, slope: number, n1: number, n2: number, out: THREE.Color) {
  if (h < -0.15) {                                     // 海底：透过海水看是深色的
    const ridge = bump(x, X.ridge, 20)
    return out.setRGB(0.22 - 0.06 * ridge + n2 * 0.04, 0.24 - 0.05 * ridge + n2 * 0.04, 0.24 + n2 * 0.03, THREE.SRGBColorSpace)
  }
  if (h < 0.22) return out.setRGB(0.7 + n2 * 0.05, 0.64 + n2 * 0.05, 0.5, THREE.SRGBColorSpace)     // 海滩
  let c: number[]
  if (x < X.saCoast) {                                                         // 南美：雨林 → 山地森林 → 高原荒草
    c = mixc([0.07, 0.17, 0.05], [0.13, 0.24, 0.08], n1)
    c = mixc(c, [0.2, 0.25, 0.12], sm(1.8, 3.2, h)); c = mixc(c, [0.34, 0.31, 0.22], sm(3.6, 5, h))
  } else if (x < X.afEast) {                                                   // 非洲：稀树草原，绿和枯黄交错，谷底和高处更绿
    c = mixc([0.22, 0.27, 0.11], [0.38, 0.34, 0.17], n1)
    c = mixc(c, [0.17, 0.25, 0.09], sm(2.6, 3.4, h) * 0.6)
  } else if (x < X.suture - 14) {                                              // 印度：农田和林地
    c = mixc([0.15, 0.27, 0.08], [0.3, 0.33, 0.14], n1)
  } else {                                                                     // 青藏高原：高山草甸夹着裸岩
    c = mixc([0.24, 0.29, 0.13], [0.36, 0.32, 0.22], n1)
  }
  c = mixc(c, [0.3, 0.27, 0.23], sm(0.35, 0.9, slope) * 0.85)                  // 陡坡露出岩石
  const snowLine = x < X.saCoast ? 7.6 : x < X.afEast ? 6.4 : 7.2
  const snow = sm(snowLine - 0.3, snowLine + 0.5, h + n2 * 0.8) * (1 - sm(1.4, 2.2, slope))
  c = mixc(c, [0.9, 0.92, 0.95], snow)
  // 颜色按显示用的 sRGB 写，比线性值暗、浓，地面才不发白
  return out.setRGB(Math.min(1, c[0] * 1.45 + n2 * 0.05), Math.min(1, c[1] * 1.45 + n2 * 0.05), Math.min(1, c[2] * 1.45 + n2 * 0.035), THREE.SRGBColorSpace)
}

/** 后面的地面：一张高低起伏的大网格，近处密、远处疏 */
function makeGrid() {
  const xs: number[] = []
  for (let x = FACE_W[0]; x < X0 - 10; x += 4) xs.push(x)
  for (let x = X0 - 10; x <= X1 + 10; x += 0.5) xs.push(x)
  for (let x = X1 + 14; x <= FACE_W[1]; x += 4) xs.push(x)
  const zs: number[] = [0]
  let dz = 0.45
  while (zs[zs.length - 1] > -650) { zs.push(zs[zs.length - 1] - dz); dz *= 1.13 }
  const nx = xs.length, nz = zs.length
  const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3)
  const uv = new Float32Array(nx * nz * 2)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = (j * nx + i) * 3; pos[k] = xs[i]; pos[k + 2] = zs[j]; uv[(j * nx + i) * 2] = xs[i] / 12; uv[(j * nx + i) * 2 + 1] = zs[j] / 12 }
  const idx: number[] = []
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return { g, xs, zs }
}

/** 岩浆柱：从哪到哪、两头多粗、多亮 */
export interface Plume { from: [number, number]; to: [number, number]; w: [number, number]; on: number }
export interface SectionProps {
  shape: Shape; peakM: number
  /** 洋中脊推开了多少（画面单位）；太平洋板块往海沟里走了多少 */
  ridgeT: number; slabT: number
  stripes?: number; fossil?: number; glow?: number
}

export function Section({ shape, peakM, ridgeT, slabT, stripes = 0, fossil = 0, glow = 0 }: SectionProps) {
  const tex = useMemo(() => {
    const t = new THREE.DataTexture(new Float32Array(NX * MAX_LAYERS * 4), NX, MAX_LAYERS, THREE.RGBAFormat, THREE.FloatType)
    t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true
    return t
  }, [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, fog: true, transparent: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uL: { value: null }, uX0: { value: X0 }, uX1: { value: X1 }, uTime: { value: 0 }, uRidgeT: { value: 0 }, uSlabT: { value: 0 }, uStripes: { value: 0 }, uFossil: { value: 0 }, uGlow: { value: 0 },
      uPl: { value: Array.from({ length: 5 }, () => new THREE.Vector4()) }, uPw: { value: Array.from({ length: 5 }, () => new THREE.Vector4()) },
      uFa: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, uFaA: { value: new Array(6).fill(0) }, uFo: { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
    }]),
  }), [])
  mat.uniforms.uL.value = tex
  const ground = useMemo(makeGrid, [])
  const grain = useMemo(() => { const t = makeGround('#d6d6d6', '240,240,240', '160,160,160', 11); t.anisotropy = 4; return t }, [])
  const done = useRef<{ rift: number; collide: number; peak: number } | null>(null)

  // 形状变了：重算剖面的分层和地面（只重算变了的那一段）
  useEffect(() => {
    const prev = done.current, s = shape
    const range: [number, number] = prev ? [Infinity, -Infinity] : [FACE_W[0], FACE_W[1]]
    if (prev && prev.rift !== s.rift) { range[0] = Math.min(range[0], 90); range[1] = Math.max(range[1], 230) }
    if (prev && (prev.collide !== s.collide || prev.peak !== peakM)) { range[0] = Math.min(range[0], 196); range[1] = FACE_W[1] }
    if (range[0] >= range[1]) return
    done.current = { rift: s.rift, collide: s.collide, peak: peakM }
    // 分层
    const data = tex.image.data as Float32Array
    const i0 = Math.max(0, Math.floor(((range[0] - X0) / (X1 - X0)) * NX)), i1 = Math.min(NX - 1, Math.ceil(((range[1] - X0) / (X1 - X0)) * NX))
    for (let i = i0; i <= i1; i++) {
      const x = X0 + ((i + 0.5) / NX) * (X1 - X0), ls = column(x, s, peakM)
      for (let k = 0; k < MAX_LAYERS; k++) {
        const o = (k * NX + i) * 4, l = ls[k]
        if (l) { data[o] = l.y; data[o + 1] = l.mat; data[o + 2] = l.u; data[o + 3] = l.flow } else { data[o] = -1e4; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 0 }
      }
    }
    tex.needsUpdate = true
    // 地面
    const { g, xs, zs } = ground, nx = xs.length, P = g.attributes.position.array as Float32Array, C = g.attributes.color.array as Float32Array, Nn = g.attributes.normal.array as Float32Array
    const a = xs.findIndex(v => v >= range[0] - 2), b0 = xs.findIndex(v => v > range[1] + 2), b = b0 < 0 ? nx - 1 : b0
    for (let j = 0; j < zs.length; j++) for (let i = Math.max(0, a); i <= b; i++) P[(j * nx + i) * 3 + 1] = heightAt(xs[i], zs[j], s, peakM)
    const c = new THREE.Color()
    for (let j = 0; j < zs.length; j++) for (let i = Math.max(0, a); i <= b; i++) {
      const k = (j * nx + i) * 3, il = Math.max(0, i - 1), ir = Math.min(nx - 1, i + 1), jn = Math.max(0, j - 1), jf = Math.min(zs.length - 1, j + 1)
      const dx = (P[(j * nx + ir) * 3 + 1] - P[(j * nx + il) * 3 + 1]) / (xs[ir] - xs[il]), dz = (P[(jn * nx + i) * 3 + 1] - P[(jf * nx + i) * 3 + 1]) / (zs[jn] - zs[jf])
      const l = Math.hypot(dx, 1, dz); Nn[k] = -dx / l; Nn[k + 1] = 1 / l; Nn[k + 2] = -dz / l
      const h = P[k + 1], slope = Math.hypot(dx, dz), x = xs[i]
      const gap = rowGap(zs[j])                                                // 远处网格稀：细斑按行距去掉，免得拉成一道道竖纹
      groundColor(x, h, slope, 0.5 + fbmL(x, zs[j], 0.06, 3, gap) * 1.4, fbmL(x + 9, zs[j], 0.5, 2, gap), c)
      C[k] = c.r; C[k + 1] = c.g; C[k + 2] = c.b
    }
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.normal.needsUpdate = true
    g.computeBoundingSphere()
  }, [shape.rift, shape.collide, peakM])   // eslint-disable-line react-hooks/exhaustive-deps

  // 岩浆柱、断层、化石的位置：跟着形状算
  useEffect(() => {
    const s = shape, u = mat.uniforms, H = (x: number) => heightAt(x, 0, s, peakM)
    const r = s.rift, c = s.collide
    const plumes: Plume[] = [
      { from: [X.ridge, deep(-15)], to: [X.ridge, H(X.ridge) - 1.6], w: [2.6, 1.0], on: 1 },
      { from: [X.rift, deep(-18)], to: [X.rift, deep(-4)], w: [3.4, 1.4], on: sm(0.15, 0.9, r) },
      { from: [X.kili, deep(-9)], to: [X.kili, H(X.kili) - 0.25], w: [2.2, 0.42], on: sm(0.6, 1, r) * (1 - sm(1.5, 2, r)) },
      { from: [X.trench + 27, deep(slabTop(27)) + 1], to: [X.andes, H(X.andes) - 0.2], w: [2.6, 0.45], on: 1 },
      { from: [X.suture + 9, deep(-21)], to: [X.suture + 11, H(X.suture + 11) - 0.3], w: [2.4, 0.5], on: 1 - sm(0.3, 0.5, c) },
    ]
    plumes.forEach((p, i) => { u.uPl.value[i].set(p.from[0], p.from[1], p.to[0], p.to[1]); u.uPw.value[i].set(p.w[0], p.w[1], p.on, 0) })
    const w = (r <= 1 ? 3 + 7 * r : 10 + 16 * (r - 1)) * 1, fa = sm(0.3, 1, r) * (1 - sm(1.3, 1.8, r)), fh = sm(0.55, 0.85, c)
    const faults: [number, number, number, number, number][] = [
      [X.rift - w - 1.6, H(X.rift - w - 1.6) - 0.05, X.rift - w + 4, deep(-7), fa], [X.rift + w + 1.6, H(X.rift + w + 1.6) - 0.05, X.rift + w - 4, deep(-7), fa],
      [X.suture - 17, H(X.suture - 17) - 0.05, X.suture + 22, deep(-9), fh], [X.suture - 10, H(X.suture - 10) - 0.05, X.suture + 40, deep(-12.5), fh],
      [0, 0, 0, 0, 0], [0, 0, 0, 0, 0],
    ]
    faults.forEach((f, i) => { u.uFa.value[i].set(f[0], f[1], f[2], f[3]); u.uFaA.value[i] = f[4] })
    const fx = [X.suture - 8, X.suture - 13, X.suture - 4, X.suture - 18]
    fx.forEach((x, i) => { const ls = column(x, s, peakM), st = ls.findIndex(l => l.mat === MAT.strata); const top = st >= 0 ? ls[st].y : H(x), bot = st >= 0 && ls[st + 1] ? ls[st + 1].y : top - 1; u.uFo.value[i].set(x + (i - 1.5) * 0.4, top - (0.3 + 0.18 * i) * (top - bot), 0.55 + 0.08 * (i % 2)) })
  }, [shape.rift, shape.collide, peakM, mat])   // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const u = mat.uniforms
    u.uTime.value += Math.min(dt, 1 / 30)
    u.uRidgeT.value = ridgeT; u.uSlabT.value = slabT; u.uStripes.value = stripes; u.uFossil.value = fossil; u.uGlow.value = glow
  })
  const ripple = useRipple([90, 40], 0.02)
  return (
    <group>
      {/* 剖开的一面 */}
      <mesh position={[(FACE_W[0] + FACE_W[1]) / 2, (12 + FACE_BOTTOM) / 2, 0]} material={mat} raycast={() => null}>
        <planeGeometry args={[FACE_W[1] - FACE_W[0], 12 - FACE_BOTTOM, 1, 1]} />
      </mesh>
      {/* 地面和海底 */}
      <mesh geometry={ground.g} receiveShadow raycast={() => null}><meshStandardMaterial vertexColors map={grain} roughness={0.95} metalness={0} /></mesh>
      <RiftLake r={shape.rift} />
      {/* 海面 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -325]} raycast={() => null}>
        <planeGeometry args={[FACE_W[1] - FACE_W[0], 650]} />
        <meshStandardMaterial color="#174f73" roughness={0.1} metalness={0.05} transparent opacity={0.88} normalMap={ripple} normalScale={new THREE.Vector2(0.35, 0.35)} />
      </mesh>
    </group>
  )
}

/** 裂谷里的湖：一条顺着谷底弯来弯去的长条水面 */
function RiftLake({ r }: { r: number }) {
  const lake = riftLake(r)
  const geo = useMemo(() => {
    const zs: number[] = []; for (let z = 0; z > -260; z -= 2) zs.push(z)
    const pos = new Float32Array(zs.length * 2 * 3), idx: number[] = []
    zs.forEach((z, j) => {
      const cx = X.rift - wiggle(z) + wiggle(0)
      pos.set([cx - lake.half, 0, z, cx + lake.half, 0, z], j * 6)
      if (j) idx.push((j - 1) * 2, (j - 1) * 2 + 1, j * 2, (j - 1) * 2 + 1, j * 2 + 1, j * 2)
    })
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
    return g
  }, [lake.half])
  if (lake.on < 0.02) return null
  return <mesh geometry={geo} position={[0, lake.y, 0]} raycast={() => null}><meshStandardMaterial color="#1f5f6e" roughness={0.08} transparent opacity={0.85 * lake.on} side={THREE.DoubleSide} /></mesh>
}
