// 远景：阔叶树、远山、草地的深浅。写法照一次函数实验室（linear）的树复制过来，改成树根落在山坡的地面高度上。
// 阔叶树的做法照 gene 实验室（parts.tsx 的 leafyTree、Batch、tube）抄进来改的：树干分出几根主枝，枝头一团团小叶片，远看是蓬松的树冠。
// 为了不卡：只做几种树的样子，同一种用 InstancedMesh 摆很多棵；样子分几帧生成。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { rng } from './mats'

type V3 = [number, number, number]
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** 一根由粗到细的弯管（树干、树枝），顶点色从 c0 渐变到 c1，没有索引 */
function tube(pts: V3[], r0: number, r1: number, c0: string, c1: string, radial = 6, segs = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal')
  const fr = curve.computeFrenetFrames(segs, false), a = new THREE.Color(c0), b = new THREE.Color(c1), c = new THREE.Color()
  const ring = radial + 1, pos: number[] = [], nor: number[] = [], cl: number[] = [], idx: number[] = []
  const p = new THREE.Vector3(), d = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, r = lerp(r0, r1, u); curve.getPointAt(u, p); c.copy(a).lerp(b, u)
    for (let j = 0; j < ring; j++) { const t = j / radial * Math.PI * 2; d.copy(fr.normals[i]).multiplyScalar(Math.cos(t)).addScaledVector(fr.binormals[i], Math.sin(t)); pos.push(p.x + d.x * r, p.y + d.y * r, p.z + d.z * r); nor.push(d.x, d.y, d.z); cl.push(c.r, c.g, c.b) }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const q = i * ring + j, s = q + ring; idx.push(q, q + 1, s, s, q + 1, s + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx)
  return g.toNonIndexed()
}

/** 把同一个小模型摆很多份，合成一个带顶点色的模型（模板没有索引） */
class Batch {
  pos: number[] = []; nor: number[] = []; col: number[] = []
  private m = new THREE.Matrix4(); private n = new THREE.Matrix3(); private v = new THREE.Vector3(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private s = new THREE.Vector3(); private t = new THREE.Vector3()
  add(tpl: THREE.BufferGeometry, p: V3, yaw: number, pitch: number, scale: number, roll: number, color: THREE.Color) {
    this.q.setFromEuler(this.e.set(pitch, yaw, roll, 'YXZ')); this.s.set(scale, scale, scale)
    this.m.compose(this.t.set(...p), this.q, this.s); this.n.getNormalMatrix(this.m)
    const P = tpl.attributes.position, N = tpl.attributes.normal
    for (let i = 0; i < P.count; i++) {
      this.v.fromBufferAttribute(P, i).applyMatrix4(this.m); this.pos.push(this.v.x, this.v.y, this.v.z)
      this.v.fromBufferAttribute(N, i).applyMatrix3(this.n).normalize(); this.nor.push(this.v.x, this.v.y, this.v.z)
      this.col.push(color.r, color.g, color.b)
    }
  }
  addGeo(g: THREE.BufferGeometry) {
    const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color
    for (let i = 0; i < P.count; i++) { this.pos.push(P.getX(i), P.getY(i), P.getZ(i)); this.nor.push(N.getX(i), N.getY(i), N.getZ(i)); this.col.push(C.getX(i), C.getY(i), C.getZ(i)) }
  }
  build() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    g.computeBoundingSphere()
    return g
  }
}

/** 一棵高 1 的阔叶树：树干、几根主枝，枝头一团团小叶片。叶色深浅、黄绿各不相同 */
function leafyTree(seed: number, cards: number, palette: [string, string]) {
  const r = rng(seed), B = new Batch(), leaf = new THREE.CircleGeometry(0.026, 5).toNonIndexed(), c0 = new THREE.Color(palette[0]), c1 = new THREE.Color(palette[1]), c = new THREE.Color()
  leaf.scale(1.5, 0.8, 1)
  const top: V3 = [(r() - 0.5) * 0.04, 0.42, (r() - 0.5) * 0.04]
  B.addGeo(tube([[0, -0.02, 0], [0.01, 0.22, 0], top], 0.032, 0.02, '#4a3d30', '#5b4a3a'))
  const nb = 6 + Math.floor(r() * 3)
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * 6.28 + r() * 0.6, up = 0.45 + r() * 0.7, len = 0.24 + r() * 0.12
    const end: V3 = [top[0] + Math.cos(a) * Math.cos(up) * len, top[1] + Math.sin(up) * len, top[2] + Math.sin(a) * Math.cos(up) * len]
    B.addGeo(tube([top, [(top[0] + end[0]) / 2, (top[1] + end[1]) / 2 + 0.03, (top[2] + end[2]) / 2], end], 0.014, 0.005, '#4a3d30', '#5b4a3a', 4, 5))
    const R = 0.15 + r() * 0.07
    for (let k = 0; k < cards; k++) {
      const th = r() * 6.28, ph = Math.acos(2 * r() - 1), rr = R * Math.pow(r(), 0.35)
      const p: V3 = [end[0] + Math.sin(ph) * Math.cos(th) * rr, end[1] + Math.cos(ph) * rr * 0.75, end[2] + Math.sin(ph) * Math.sin(th) * rr]
      c.copy(c0).lerp(c1, Math.max(0, Math.min(1, (p[1] - 0.5) / 0.6 + (r() - 0.5) * 0.5)))
      B.add(leaf, p, r() * 6.28, r() * 3, 1 + r() * 0.8, r() * 3, c)
    }
  }
  return B.build()
}

const PALETTES: [string, string][] = [['#25401f', '#76994a'], ['#2a4522', '#86a24e'], ['#223a24', '#5f8a4a'], ['#33461f', '#9aab52'], ['#283f27', '#6d9452'], ['#2e3f1d', '#8c9b48']]
/** 几种树的样子，分几帧做（第一次用到时才做） */
const variants: (THREE.BufferGeometry | null)[] = PALETTES.map(() => null)
function useVariants() {
  const [, bump] = useState(0)
  useEffect(() => {
    let i = 0, alive = true
    const step = () => {
      if (!alive) return
      while (i < variants.length && variants[i]) i++
      if (i >= variants.length) { bump(n => n + 1); return }
      variants[i] = leafyTree(11 + i * 17, 110, PALETTES[i]); i++
      bump(n => n + 1); setTimeout(step, 0)
    }
    setTimeout(step, 0)
    return () => { alive = false }
  }, [])
  return variants
}

/** 一片树：spots 是 [x, z, 高]。按种类分组，每种一个 InstancedMesh */
/** ground：地面高度 (x, z) → y，树根落在上面 */
export function Trees({ spots, ground, shadows = false }: { spots: [number, number, number][]; ground: (x: number, z: number) => number; shadows?: boolean }) {
  const vs = useVariants()
  const groups = useMemo(() => {
    const r = rng(5), out: THREE.Matrix4[][] = PALETTES.map(() => [])
    const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
    spots.forEach(([x, z, h], i) => { const w = h * (0.85 + r() * 0.35); out[i % PALETTES.length].push(new THREE.Matrix4().compose(p.set(x, ground(x, z) - 0.15, z), q.setFromAxisAngle(up, r() * 6.28), s.set(w, h, w))) })
    return out
  }, [spots, ground])
  return <>{vs.map((g, i) => g && groups[i].length ? <TreeKind key={i} geo={g} mats={groups[i]} shadows={shadows} /> : null)}</>
}
function TreeKind({ geo, mats, shadows }: { geo: THREE.BufferGeometry; mats: THREE.Matrix4[]; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => { const m = ref.current; if (!m) return; mats.forEach((x, i) => m.setMatrixAt(i, x)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere() }, [mats])
  return <instancedMesh ref={ref} args={[geo, undefined, mats.length]} castShadow={shadows} receiveShadow><meshStandardMaterial vertexColors roughness={0.85} side={THREE.DoubleSide} envMapIntensity={0.6} /></instancedMesh>
}

/** 远山：一条起伏柔和的长山脊，越远越淡、偏冷。at：山脊中线的位置；len、depth：长、厚；h：最高处；axis：山脊沿 x（'x'）还是沿 z（'z'） */
export function ridgeGeo(seed: number, len: number, depth: number, h: number, near: string, far: string) {
  const r = rng(seed), nx = 220, nz = 18
  const g = new THREE.PlaneGeometry(len, depth, nx, nz); g.rotateX(-Math.PI / 2)
  const p = g.attributes.position, ph = [r() * 6, r() * 6, r() * 6, r() * 6], col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color(near), b = new THREE.Color(far)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), u = x / len, w = z / depth + 0.5
    // 几组正弦叠出柔和的峰和鞍，沿厚度方向是一个圆润的山包
    const crest = 0.55 + 0.25 * Math.sin(u * 9 + ph[0]) + 0.13 * Math.sin(u * 23 + ph[1]) + 0.06 * Math.sin(u * 51 + ph[2]) + 0.04 * Math.sin(u * 97 + ph[3])
    const y = h * crest * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, w))), 1.6)
    p.setY(i, Math.max(0, y) - 2)
    c.copy(a).lerp(b, Math.min(1, Math.max(0, y / h)) * 0.8 + 0.2 * w); col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals()
  return g
}

/** 草地上大块的深浅：一张低频的斑块贴图，盖在细草纹上（相乘） */
export function makeMeadow() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(23)
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 160; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 160, k = r()
    const q = g.createRadialGradient(x, y, 0, x, y, rad)
    q.addColorStop(0, k < 0.45 ? 'rgba(120,128,90,0.55)' : k < 0.8 ? 'rgba(255,250,210,0.45)' : 'rgba(170,150,95,0.5)'); q.addColorStop(1, 'rgba(200,200,200,0)')
    g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
