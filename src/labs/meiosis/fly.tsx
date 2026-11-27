// 果蝇（黑腹果蝇）：按真实大小做，雌蝇体长约 2.5 mm、雄蝇约 2 mm。头上一对大复眼（红眼砖红、白眼乳白，表面一粒粒的小眼），
// 触角和口器；胸部带几根黑刚毛；腹部一节一节的黑横纹（雌蝇腹部尖、条纹分开，雄蝇腹部末端圆、末几节全黑）；黑檀体整体深黑褐；
// 六条分节的腿；长翅透明带翅脉、超过腹部末端，残翅是皱缩的小残片。
// 模型先按毫米写，最后缩到厘米（场景 1 单位 = 1 cm）。原点在身体中心落到地面的那一点，头朝 +x。
// lie：麻醉以后趴在板上，六条腿蜷着，两只翅膀向两侧摊开（从斜上方看得清眼色、体色和翅形）。
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { fuse, place, rng, tube, type V3 } from './parts'

export interface FlyLook { eye: 'red' | 'white'; body: 'gray' | 'ebony'; wing: 'long' | 'vestigial'; sex: 'f' | 'm' }
export interface FlyPose { o: FlyLook; p: V3; yaw: number; lie?: boolean }
const MM = 0.1   // 毫米 → 厘米

/** 一个椭球，顶点色由 paint(局部 x、y、z, 法线) 决定 */
function ell(c: V3, r: V3, ws: number, hs: number, paint: (x: number, y: number, z: number) => THREE.Color, shape?: (v: THREE.Vector3) => void) {
  const g = new THREE.SphereGeometry(1, ws, hs), p = g.attributes.position, v = new THREE.Vector3(), cl = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const k = paint(v.x, v.y, v.z); cl.set([k.r, k.g, k.b], i * 3)
    shape?.(v); p.setXYZ(i, v.x * r[0] + c[0], v.y * r[1] + c[1], v.z * r[2] + c[2])
  }
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.computeVertexNormals()
  return g
}
const C = (s: string) => new THREE.Color(s)

function build(o: FlyLook, lie: boolean) {
  const r = rng((o.eye === 'red' ? 1 : 2) + (o.body === 'gray' ? 10 : 20) + (o.wing === 'long' ? 100 : 200) + (o.sex === 'f' ? 1000 : 2000) + (lie ? 5 : 0))
  const ebony = o.body === 'ebony', male = o.sex === 'm'
  const base = ebony ? C('#3a2e24') : C('#a8875a'), dark = ebony ? C('#120d0a') : C('#2a1c12'), thoraxC = ebony ? C('#2e251d') : C('#7d6a4c')
  const legC = ebony ? '#2a221b' : '#8f7550'
  const H = lie ? 0.38 : 0.52   // 身体中线离地多高（mm）
  const parts: THREE.BufferGeometry[] = []
  const c = new THREE.Color()
  // 胸部：背面略隆起，颜色上深下浅；中间两道纵纹
  parts.push(ell([0.38, H + 0.06, 0], [0.5, 0.4, 0.36], 22, 16, (x, y, z) => c.copy(thoraxC).lerp(base, Math.max(0, -y) * 0.6).lerp(dark, Math.abs(Math.abs(z) - 0.25) < 0.08 && y > 0.3 ? 0.35 : 0).clone()))
  // 小盾片
  parts.push(ell([-0.08, H + 0.33, 0], [0.16, 0.08, 0.17], 12, 8, () => thoraxC.clone().multiplyScalar(0.9)))
  // 腹部：沿 x 一节一节的黑横纹；雌蝇末端收尖，雄蝇末端圆且末几节全黑
  const aL = male ? 0.62 : 0.82, aC = male ? -0.5 : -0.62, aR = male ? 0.36 : 0.4
  parts.push(ell([aC, H - 0.02, 0], [aL, aR, aR * 1.02], 28, 18, (x, y) => {
    const u = (1 - x) / 2   // 0 前端 → 1 末端
    const seg = u * (male ? 5 : 6), f = seg - Math.floor(seg)
    let k = 0
    if (y > -0.35) k = f > (male ? 0.45 : 0.62) ? 1 : 0.08
    if (male && u > 0.6 && y > -0.6) k = 1
    if (y < -0.5) k *= 0.2
    return c.copy(base).lerp(dark, k * 0.92).clone()
  }, v => { if (v.x < 0) { const t = -v.x; const s = male ? 1 - 0.18 * t * t : 1 - 0.55 * t * t; v.y *= s; v.z *= s } }))
  // 头：横向宽，复眼占两侧大半
  const hx = 0.98, hy = H + 0.12
  parts.push(ell([hx, hy, 0], [0.22, 0.3, 0.36], 20, 14, (x, y) => c.copy(base).lerp(C('#c9a46a'), ebony ? 0.1 : 0.35).lerp(dark, y > 0.6 ? 0.4 : 0).clone()))
  const eyeA = o.eye === 'red' ? C('#a3241c') : C('#efe6d4'), eyeB = o.eye === 'red' ? C('#7a140f') : C('#d9cfbd')
  for (const s of [-1, 1]) {
    // 复眼：细分的球面，每个顶点深浅不一，看起来一粒一粒的
    parts.push(ell([hx + 0.04, hy + 0.02, s * 0.25], [0.19, 0.27, 0.16], 30, 22, () => c.copy(eyeA).lerp(eyeB, r()).clone()))
    // 触角：短短一节，顶端一根羽状的芒
    parts.push(tube([[hx + 0.18, hy + 0.12, s * 0.06], [hx + 0.27, hy + 0.04, s * 0.08], [hx + 0.3, hy - 0.06, s * 0.09]], 0.035, 0.025, legC, legC, 6, 6))
    parts.push(tube([[hx + 0.3, hy - 0.04, s * 0.09], [hx + 0.38, hy + 0.08, s * 0.14], [hx + 0.44, hy + 0.2, s * 0.16]], 0.008, 0.004, '#2a1d12', '#2a1d12', 4, 6))
    // 头顶的单眼刚毛
    parts.push(tube([[hx - 0.02, hy + 0.26, s * 0.05], [hx - 0.14, hy + 0.36, s * 0.1]], 0.012, 0.004, '#120c08', '#120c08', 4, 3))
  }
  // 口器：向下伸的喙，末端一对唇瓣
  parts.push(tube([[hx + 0.08, hy - 0.22, 0], [hx + 0.12, hy - 0.34, 0], [hx + 0.1, hy - 0.42, 0]], 0.045, 0.04, legC, '#b08c60', 6, 6))
  parts.push(ell([hx + 0.1, hy - 0.44, 0], [0.06, 0.035, 0.07], 8, 6, () => C('#b89468')))
  // 胸部背面的大刚毛
  for (let i = 0; i < 8; i++) {
    const x = 0.6 - (i % 4) * 0.22, z = (i < 4 ? -1 : 1) * (0.12 + (i % 2) * 0.1)
    parts.push(tube([[x, H + 0.38, z], [x - 0.16, H + 0.5, z * 1.2], [x - 0.3, H + 0.54, z * 1.3]], 0.014, 0.004, '#140d08', '#140d08', 4, 4))
  }
  // 六条腿：基节—腿节—胫节—跗节，站着时脚尖落地，趴着时蜷到身下两侧
  const legs: [number, number][] = [[0.6, 0.5], [0.38, 0], [0.18, -0.55]]
  for (const [x, a] of legs) for (const s of [-1, 1]) {
    const root: V3 = [x, H - 0.25, s * 0.15]
    const pts: V3[] = lie
      ? [root, [x + a * 0.25, H - 0.2, s * 0.45], [x + a * 0.45, 0.12, s * 0.6], [x + a * 0.35 + 0.08, 0.05, s * 0.5]]
      : [root, [x + a * 0.3, H - 0.02, s * 0.5], [x + a * 0.6, 0.26, s * 0.72], [x + a * 0.85, 0.03, s * 0.8]]
    parts.push(tube(pts, 0.05, 0.025, legC, legC, 6, 16))
  }
  // 翅：膜（半透明）单独一个模型，翅脉画在不透明的身体里
  const membranes: THREE.BufferGeometry[] = []
  const wingRoot = (s: number): V3 => [0.3, H + 0.32, s * 0.2]
  if (o.wing === 'long') {
    for (const s of [-1, 1]) {
      // 翅的轮廓：长约 2.2 mm，宽约 0.9 mm，前缘直、后缘圆
      const L = 2.25, W = 1.15, sh = new THREE.Shape()
      sh.moveTo(0, 0); sh.bezierCurveTo(L * 0.3, W * 0.15, L * 0.75, W * 0.42, L * 0.98, W * 0.4); sh.bezierCurveTo(L * 1.04, W * 0.2, L * 0.98, -W * 0.18, L * 0.85, -W * 0.38)
      sh.bezierCurveTo(L * 0.6, -W * 0.6, L * 0.25, -W * 0.5, 0, -0.06); sh.lineTo(0, 0)
      const g = new THREE.ShapeGeometry(sh, 16); g.rotateX(-Math.PI / 2)   // 平放：沿 +x 是翅长，z 是翅宽
      // 翅脉：从翅根放射出去的四五条纵脉，加两条横脉
      const veins: V3[][] = [[[0, 0, 0], [L * 0.5, 0, -W * 0.3], [L * 0.98, 0, -W * 0.38]], [[0, 0, 0], [L * 0.5, 0, -W * 0.12], [L * 1.0, 0, -W * 0.06]], [[0.1, 0, 0], [L * 0.5, 0, W * 0.08], [L * 0.97, 0, W * 0.3]], [[0.15, 0, -0.05], [L * 0.45, 0, W * 0.28], [L * 0.8, 0, W * 0.38]], [[L * 0.42, 0, -W * 0.12], [L * 0.44, 0, W * 0.1]], [[L * 0.62, 0, W * 0.05], [L * 0.6, 0, W * 0.3]]]
      // 站着：两翅叠在背上，翅尖略向外张；趴着：向两侧摊开约 45°
      const yaw = lie ? s * (Math.PI - 0.8) : s * (Math.PI - 0.16), tilt = lie ? 0.02 : s * 0.12
      const root = wingRoot(s), y = lie ? 0.42 : root[1]
      const m = new THREE.Matrix4().compose(new THREE.Vector3(root[0], y, root[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, lie ? 0.05 : -0.08, 'YXZ')), new THREE.Vector3(1, 1, 1))
      const mem = g.clone().scale(1, 1, s).applyMatrix4(m); mem.computeVertexNormals()
      const cols = new Float32Array(mem.attributes.position.count * 3); for (let i = 0; i < cols.length; i += 3) { const k = 0.36 + r() * 0.06; cols.set([k * 1.02, k, k * 0.95], i) }
      mem.setAttribute('color', new THREE.BufferAttribute(cols, 3)); membranes.push(mem)
      for (const v of veins) parts.push(tube(v.map(q => [q[0], q[1] + 0.004, -s * q[2]] as V3), 0.02, 0.012, '#4a3a28', '#5a4630', 4, 10).applyMatrix4(m))
    }
  } else {
    // 残翅：皱成一小团，长不到 0.5 mm，颜色发灰发暗
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(0.45, 0.26, 6, 4); g.rotateX(-Math.PI / 2); g.translate(0.22, 0, 0)
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (r() - 0.5) * 0.12 + Math.sin(p.getX(i) * 24) * 0.03)
      const root = wingRoot(s)
      place(g, [root[0] - 0.02, root[1] + 0.02, root[2]], s * (Math.PI - 0.5), 0.3, 1, s * 0.4)
      g.computeVertexNormals()
      parts.push(fuse([g]).applyMatrix4(new THREE.Matrix4()))
      const cl = parts[parts.length - 1].attributes.color as THREE.BufferAttribute
      for (let i = 0; i < cl.count; i++) { const k = 0.45 + r() * 0.15; cl.setXYZ(i, k, k * 0.95, k * 0.88) }
    }
  }
  const scale = male ? 0.92 : 1
  const out = (g: THREE.BufferGeometry) => { g.scale(MM * scale, MM * scale, MM * scale); g.computeBoundingSphere(); return g }
  return { body: out(fuse(parts)), wing: membranes.length ? out(fuse(membranes)) : null }
}

const cache = new Map<string, { body: THREE.BufferGeometry; wing: THREE.BufferGeometry | null }>()
const keyOf = (o: FlyLook, lie = false) => `${o.eye}${o.body}${o.wing}${o.sex}${lie ? 'L' : 'S'}`
/** 一种果蝇的模型（按样子缓存）：body 带顶点色；wing 是半透明的翅膜，残翅没有 */
export function flyGeo(o: FlyLook, lie = false) {
  const k = keyOf(o, lie)
  if (!cache.has(k)) cache.set(k, build(o, lie))
  return cache.get(k)!
}
export const FlyBodyMat = () => <meshPhysicalMaterial vertexColors roughness={0.42} clearcoat={0.6} clearcoatRoughness={0.3} sheen={0.3} />
export const FlyWingMat = () => <meshStandardMaterial vertexColors alphaHash opacity={0.72} roughness={0.25} metalness={0.1} envMapIntensity={1.3} side={THREE.DoubleSide} />

/** 一只果蝇 */
export function Fly({ o, position, yaw = 0, lie = false, scale = 1 }: { o: FlyLook; position: V3; yaw?: number; lie?: boolean; scale?: number }) {
  const g = flyGeo(o, lie)
  return <group position={position} rotation-y={yaw} scale={scale}>
    <mesh geometry={g.body} castShadow><FlyBodyMat /></mesh>
    {g.wing && <mesh geometry={g.wing}><FlyWingMat /></mesh>}
  </group>
}

/** 一群果蝇：同一种样子的用一个 InstancedMesh，几十只也只有几次绘制 */
export function FlyFlock({ flies }: { flies: FlyPose[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, { o: FlyLook; lie: boolean; list: FlyPose[] }>()
    for (const f of flies) { const k = keyOf(f.o, !!f.lie); if (!m.has(k)) m.set(k, { o: f.o, lie: !!f.lie, list: [] }); m.get(k)!.list.push(f) }
    return [...m.entries()]
  }, [flies])
  return <>{groups.map(([k, gr]) => <FlyGroup key={k} o={gr.o} lie={gr.lie} list={gr.list} />)}</>
}
function FlyGroup({ o, lie, list }: { o: FlyLook; lie: boolean; list: FlyPose[] }) {
  const g = flyGeo(o, lie), body = useRef<THREE.InstancedMesh>(null), wing = useRef<THREE.InstancedMesh>(null)
  const cap = Math.max(1, list.length)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0)
    for (const ref of [body, wing]) {
      const im = ref.current; if (!im) continue
      list.forEach((f, i) => { q.setFromAxisAngle(up, f.yaw); m.compose(new THREE.Vector3(...f.p), q, one); im.setMatrixAt(i, m) })
      im.count = list.length; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere()
    }
  })
  return <>
    <instancedMesh ref={body} args={[g.body, undefined, cap]} castShadow frustumCulled={false}><FlyBodyMat /></instancedMesh>
    {g.wing && <instancedMesh ref={wing} args={[g.wing, undefined, cap]} frustumCulled={false}><FlyWingMat /></instancedMesh>}
  </>
}
