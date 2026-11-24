// 太空里的一颗地球：用 NASA 的实拍影像（公有领域，和地球的运动实验室共用同一张图）。
// 第 1 课让南美洲转回去和非洲拼在一起；第 3 课画出六大板块和它们的边界；第 7 课和拓展课标出火山、地震和几座城市。
// 南美洲的漂移在着色器里做：画每一点时，先看它是不是“转过来的南美洲”，是就到转回去的位置取颜色；南美洲原来的地方换成大洋。
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { FIT, FIT_AXIS, FOSSIL, OLD_ROCK, driftSA, nearestBoundary, plateSeeds, toVec, type BeltKey, type PlaceKey, PLACES } from './physics'
import { PLATE_KEYS, PLATES, QUAKES, RIFT, SEGS, VOLCANOES, type LL, type PlateKey } from './plates'

/** 地球在场景里的位置和半径：在剖面的正上方很高的太空里 */
export const GLOBE = new THREE.Vector3(0, 2400, 0), RG = 40
const RAD = Math.PI / 180

/** 让 face 这个经纬度正对镜头（镜头在 +z 一侧）时，地球要怎么转 */
export function globeQuat(face: LL) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(face[1] * RAD, 0, 0))
  return q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (-90 - face[0]) * RAD, 0)))
}
/** 地球表面一点在场景里的位置；lift 是离地面多高（倍数） */
export function globePoint(p: LL, face: LL, lift = 1.01): [number, number, number] {
  const v = new THREE.Vector3(...toVec(p)).applyQuaternion(globeQuat(face)).multiplyScalar(RG * lift).add(GLOBE)
  return [v.x, v.y, v.z]
}
/** 这一点现在是不是在朝镜头的那半边（背面的标签要藏起来） */
export const globeFacing = (p: LL, face: LL) => new THREE.Vector3(...toVec(p)).applyQuaternion(globeQuat(face)).z > 0.2

// ---------- 板块的填色图：先把边界线画在一张经纬度图上，再从每块板块里的一点往外填 ----------
const MW = 1024, MH = 512
function greatArc(a: LL, b: LL, step = 1): LL[] {
  const va = new THREE.Vector3(...toVec(a)), vb = new THREE.Vector3(...toVec(b)), ang = va.angleTo(vb), n = Math.max(1, Math.ceil(ang / RAD / step)), out: LL[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = Math.sin(ang) || 1, v = va.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).add(vb.clone().multiplyScalar(Math.sin(t * ang) / s))
    out.push([Math.atan2(-v.z, v.x) / RAD, Math.asin(Math.max(-1, Math.min(1, v.y / v.length()))) / RAD])
  }
  return out
}
const densify = (line: LL[], step = 1) => line.slice(1).flatMap((p, i) => greatArc(line[i], p, step).slice(i ? 1 : 0))
function makePlateMap() {
  const c = document.createElement('canvas'); c.width = MW; c.height = MH
  const g = c.getContext('2d')!
  g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.strokeStyle = '#fff'; g.lineWidth = 2.2
  const px = ([lon, lat]: LL): [number, number] => [((lon + 180) / 360) * MW, ((90 - lat) / 180) * MH]
  for (const s of SEGS) {
    const pts = densify(s.line, 0.5)
    for (let i = 1; i < pts.length; i++) { if (Math.abs(pts[i][0] - pts[i - 1][0]) > 180) continue; const [x0, y0] = px(pts[i - 1]), [x1, y1] = px(pts[i]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke() }
  }
  const img = g.getImageData(0, 0, MW, MH).data, lab = new Int8Array(MW * MH).fill(-1)
  const wall = (i: number) => img[i * 4] > 60
  for (const [k, seed] of plateSeeds()) {
    const id = PLATE_KEYS.indexOf(k), [sx, sy] = px(seed).map(Math.floor), st = [sy * MW + sx]
    while (st.length) {
      const i = st.pop()!; if (lab[i] >= 0 || wall(i)) continue
      lab[i] = id; const x = i % MW, y = (i / MW) | 0
      st.push(y * MW + (x + 1) % MW, y * MW + (x + MW - 1) % MW); if (y > 0) st.push(i - MW); if (y < MH - 1) st.push(i + MW)
    }
  }
  // 边界线本身的格子：跟着旁边的板块
  for (let pass = 0; pass < 6; pass++) for (let i = 0; i < MW * MH; i++) if (lab[i] < 0) { const x = i % MW; const n = [i - 1, i + 1, i - MW, i + MW].filter(j => j >= 0 && j < MW * MH && Math.abs((j % MW) - x) <= 1); for (const j of n) if (lab[j] >= 0) { lab[i] = lab[j]; break } }
  const data = new Uint8Array(MW * MH * 4)
  for (let i = 0; i < MW * MH; i++) data[i * 4] = Math.max(0, lab[i]) * 32 + 16
  // DataTexture 的第一行是图的最下面（南极）：上下翻一下
  const flip = new Uint8Array(MW * MH * 4)
  for (let y = 0; y < MH; y++) flip.set(data.subarray(y * MW * 4, (y + 1) * MW * 4), (MH - 1 - y) * MW * 4)
  const t = new THREE.DataTexture(flip, MW, MH); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true
  return { tex: t, lab }
}
let plateMap: ReturnType<typeof makePlateMap> | null = null
export const getPlateMap = () => (plateMap ??= makePlateMap())

const VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vO;
void main() { vUv = uv; vO = normalize(position); vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`
const FRAG = /* glsl */`
uniform sampler2D uDay; uniform sampler2D uAux; uniform sampler2D uPlate;
uniform mat3 uBack; uniform float uDrift, uFill, uHi, uHi2; uniform vec3 uCol[6];
varying vec2 vUv; varying vec3 vN; varying vec3 vO;
const float PI = 3.14159265;
vec2 uvOf(vec3 v) { float lon = atan(-v.z, v.x), lat = asin(clamp(v.y, -1.0, 1.0)); return vec2(lon / (2.0 * PI) + 0.5, lat / PI + 0.5); }
/** 这一点（经纬度，度）是不是南美洲大陆 */
bool isSA(vec2 uv) { float lon = (uv.x - 0.5) * 360.0, lat = (uv.y - 0.5) * 180.0;
  return lat < 12.6 && lat > -57.0 && lon > -82.0 && lon < -34.0 && !(lon < -77.3 && lat > 7.2) && !(lon < -80.5 && lat > -2.0); }
void main() {
  vec3 day = texture2D(uDay, vUv).rgb; float water = texture2D(uAux, vUv).g;
  vec3 ocean = vec3(0.012, 0.035, 0.085);
  float land = 1.0 - water;
  if (uDrift > 0.0) {
    if (isSA(vUv) && land > 0.5) { day = mix(day, ocean, 0.96); land = 0.0; }        // 南美洲原来的地方变成大洋
    vec3 src = uBack * vO; vec2 su = uvOf(src);                                       // 转过来以后这一点原来在哪
    float sw = texture2D(uAux, su).g;
    if (isSA(su) && sw < 0.5) { day = texture2D(uDay, su).rgb; land = 1.0; }
  }
  vec3 N = normalize(vN), L = normalize(vec3(-0.45, 0.5, 0.75));
  float lit = 0.42 + 0.75 * max(dot(N, L), 0.0);
  vec3 col = day * 1.3 * lit + ocean * 0.5 * (1.0 - land);
  if (uFill > 0.0) {
    float id = floor(texture2D(uPlate, vUv).r * 255.0 / 32.0);
    vec3 pc = uCol[0]; for (int i = 1; i < 6; i++) if (abs(id - float(i)) < 0.5) pc = uCol[i];
    float on = uHi < -0.5 ? 1.0 : (abs(id - uHi) < 0.5 || abs(id - uHi2) < 0.5 ? 1.0 : 0.0);
    col = mix(col, pc * lit * (0.55 + 0.45 * land), uFill * mix(0.12, 0.5, on));
    if (uHi > -0.5 && on < 0.5) col *= mix(1.0, 0.5, uFill);
  }
  float rim = pow(1.0 - max(dot(N, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
  col += vec3(0.25, 0.5, 1.0) * rim * 0.5;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/** 沿球面的一条细管 */
function tubeAlong(line: LL[], r: number, lift: number) {
  const pts = densify(line, 0.8).map(p => new THREE.Vector3(...toVec(p)).multiplyScalar(RG * lift))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), Math.max(4, pts.length * 2), r, 6, false)
}
function useLines() {
  return useMemo(() => {
    const apart = mergeGeometries(SEGS.filter(s => s.kind === 'apart').map(s => tubeAlong(s.line, 0.16, 1.006)))
    const collide = mergeGeometries(SEGS.filter(s => s.kind === 'collide').map(s => tubeAlong(s.line, 0.18, 1.006)))
    const r = densify(RIFT, 0.4), dashes: THREE.BufferGeometry[] = []
    for (let i = 0; i + 3 < r.length; i += 6) dashes.push(tubeAlong(r.slice(i, i + 4), 0.14, 1.006))
    const belts = { pacific: mergeGeometries(SEGS.filter(s => s.belt === 'pacific').map(s => tubeAlong(s.line, 1.7, 1.002))), alpide: mergeGeometries(SEGS.filter(s => s.belt === 'alpide').map(s => tubeAlong(s.line, 1.7, 1.002))) }
    return { apart, collide, rift: mergeGeometries(dashes), belts }
  }, [])
}

/** 球面上的一小片（贴着地面的圆片）：两岸相同的岩层用它 */
function Patch({ at, r, color, opacity = 0.85 }: { at: LL; r: number; color: string; opacity?: number }) {
  const v = new THREE.Vector3(...toVec(at)), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v)
  return <mesh position={v.clone().multiplyScalar(RG * 1.004)} quaternion={q}><circleGeometry args={[r, 28]} /><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} /></mesh>
}
/** 中龙化石的标记：贴在地面上的一块小牌子，上面画着一条中龙 */
function useFossilTex() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = 'rgba(255,240,205,0.95)'; g.beginPath(); g.roundRect(4, 4, 248, 120, 26); g.fill()
    g.fillStyle = '#5b3d1e'; g.strokeStyle = '#5b3d1e'; g.lineCap = 'round'
    // 身体、长尾巴、细长的嘴、四条腿：一条小小的水生爬行动物
    g.beginPath(); g.ellipse(120, 66, 42, 13, 0, 0, Math.PI * 2); g.fill()
    g.lineWidth = 11; g.beginPath(); g.moveTo(80, 66); g.quadraticCurveTo(48, 74, 18, 58); g.stroke()
    g.lineWidth = 8; g.beginPath(); g.moveTo(160, 62); g.lineTo(206, 56); g.stroke()
    g.lineWidth = 4; g.beginPath(); g.moveTo(206, 56); g.lineTo(240, 54); g.stroke()
    g.lineWidth = 6; for (const [x, s] of [[100, 1], [140, 1], [100, -1], [140, -1]]) { g.beginPath(); g.moveTo(x, 66); g.lineTo(x + 10, 66 + s * 26); g.stroke() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}
function Fossil({ at, tex }: { at: LL; tex: THREE.Texture }) {
  const v = new THREE.Vector3(...toVec(at)), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v)
  // 牌子的长边顺着纬线
  const east = new THREE.Vector3(0, 1, 0).cross(v).normalize(), xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(q), spin = Math.atan2(xAxis.clone().cross(east).dot(v), xAxis.dot(east))
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin))
  return <mesh position={v.clone().multiplyScalar(RG * 1.012)} quaternion={q}><planeGeometry args={[4.2, 2.1]} /><meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} /></mesh>
}

/** 火山：一个小锥；地震：一个红点 */
function Marks({ volcanoes, quakes, belt }: { volcanoes: number; quakes: number; belt: BeltKey | null }) {
  const tags = useMemo(() => ({ v: VOLCANOES.map(x => nearestBoundary(x.at).belt), q: QUAKES.map(x => nearestBoundary(x.at).belt) }), [])
  const cone = useMemo(() => { const g = new THREE.ConeGeometry(0.62, 1.5, 12); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.7); return g }, [])
  const dot = useMemo(() => new THREE.SphereGeometry(0.5, 14, 10), [])
  const place = (at: LL) => { const v = new THREE.Vector3(...toVec(at)); return { p: v.clone().multiplyScalar(RG * 1.003), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v) } }
  const dim = (b: string) => (belt && b !== belt ? 0.25 : 1)
  return (
    <group>
      {volcanoes > 0 && VOLCANOES.map((x, i) => { const { p, q } = place(x.at); return <mesh key={'v' + i} geometry={cone} position={p} quaternion={q} scale={volcanoes}><meshBasicMaterial color="#ff9b2e" transparent opacity={dim(tags.v[i])} toneMapped={false} /></mesh> })}
      {quakes > 0 && QUAKES.map((x, i) => { const { p } = place(x.at); return <mesh key={'q' + i} geometry={dot} position={p} scale={quakes}><meshBasicMaterial color="#ff3b30" transparent opacity={dim(tags.q[i])} toneMapped={false} /></mesh> })}
    </group>
  )
}

export interface GlobeWant {
  face: LL
  /** 南美洲转回去多少：0 今天，1 拼在一起 */
  drift?: number
  evidence?: 'fossil' | 'rock' | null
  /** 画板块的边界线；fill 板块填色的浓淡；hi 加亮哪一块（或两块） */
  lines?: number; fill?: number; hi?: PlateKey[]
  volcanoes?: number; quakes?: number; belt?: BeltKey | null
  places?: PlaceKey[]
}

export function Globe({ w }: { w: GlobeWant }) {
  const [day, aux] = useTexture(['/assets/tex/earth_day.jpg', '/assets/tex/earth_aux.jpg'])
  const fossilTex = useFossilTex()
  const mat = useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace; aux.colorSpace = THREE.NoColorSpace
    for (const t of [day, aux]) { t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true }
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uDay: { value: day }, uAux: { value: aux }, uPlate: { value: getPlateMap().tex }, uBack: { value: new THREE.Matrix3() }, uDrift: { value: 0 }, uFill: { value: 0 }, uHi: { value: -1 }, uHi2: { value: -1 }, uCol: { value: PLATE_KEYS.map(k => new THREE.Color(PLATES[k].color)) } },
    })
  }, [day, aux])
  const lines = useLines()
  const k = w.drift ?? 0
  // 着色器里要的是“转回去”：从转过来的位置找原来的位置
  useFrame(() => {
    const u = mat.uniforms
    const m4 = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...FIT_AXIS), -FIT.angle * k * RAD)
    u.uBack.value.setFromMatrix4(m4); u.uDrift.value = k
    u.uFill.value = w.fill ?? 0
    const hi = w.hi ?? []; u.uHi.value = hi[0] ? PLATE_KEYS.indexOf(hi[0]) : -1; u.uHi2.value = hi[1] ? PLATE_KEYS.indexOf(hi[1]) : -1
  })
  const q = useMemo(() => globeQuat(w.face), [w.face[0], w.face[1]])   // eslint-disable-line react-hooks/exhaustive-deps
  const ln = w.lines ?? 0
  const lineMat = (color: string) => <meshBasicMaterial color={color} transparent opacity={ln} depthWrite={false} toneMapped={false} />
  return (
    <group position={GLOBE} quaternion={q}>
      <mesh material={mat} raycast={() => null}><sphereGeometry args={[RG, 160, 100]} /></mesh>
      {ln > 0 && <>
        <mesh geometry={lines.apart} renderOrder={2}>{lineMat('#ffd166')}</mesh>
        <mesh geometry={lines.collide} renderOrder={2}>{lineMat('#ff5a47')}</mesh>
        <mesh geometry={lines.rift} renderOrder={2}>{lineMat('#ffd166')}</mesh>
      </>}
      {w.belt && <mesh geometry={lines.belts[w.belt]} renderOrder={1}><meshBasicMaterial color={w.belt === 'pacific' ? '#ff8a5c' : '#ffc35c'} transparent opacity={0.32} depthWrite={false} toneMapped={false} /></mesh>}
      <Marks volcanoes={w.volcanoes ?? 0} quakes={w.quakes ?? 0} belt={w.belt ?? null} />
      {w.evidence === 'rock' && <>
        {OLD_ROCK.af.map((p, i) => <Patch key={'a' + i} at={p} r={3.4} color="#ff7a45" />)}
        {OLD_ROCK.sa.map((p, i) => <Patch key={'s' + i} at={driftSA(p, k)} r={3.4} color="#ff7a45" />)}
      </>}
      {w.evidence === 'fossil' && <>
        {FOSSIL.af.map((p, i) => <Fossil key={'a' + i} at={p} tex={fossilTex} />)}
        {FOSSIL.sa.map((p, i) => <Fossil key={'s' + i} at={driftSA(p, k)} tex={fossilTex} />)}
      </>}
      {(w.places ?? []).map(k2 => { const v = new THREE.Vector3(...toVec(PLACES[k2].at)); return <mesh key={k2} position={v.multiplyScalar(RG * 1.006)}><sphereGeometry args={[0.55, 16, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh> })}
    </group>
  )
}

/** 太空的背景：远处一圈星星 */
export function Stars() {
  const geo = useMemo(() => {
    const n = 1400, a = new Float32Array(n * 3); let s = 23
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 1500 + rnd() * 200, q = Math.sqrt(1 - u * u); a[i * 3] = q * Math.cos(t) * r; a[i * 3 + 1] = u * r; a[i * 3 + 2] = q * Math.sin(t) * r }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3))
    return g
  }, [])
  return <points geometry={geo} position={GLOBE}><pointsMaterial color="#dfe8ff" size={2.2} sizeAttenuation={false} fog={false} /></points>
}
