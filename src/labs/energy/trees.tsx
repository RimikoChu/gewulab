// 游乐园里的树：树干分出几根主枝，枝头是一团团朝向各异的小叶片，远看是蓬松、透光的树冠，不是一个球。
// 四种树形各做一个模型（高 1、原点在树根），每种摆很多份（一次绘制）；模型在空闲时一棵一棵生成，进页面不卡。
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { fuse, rng, tint, type V3 } from './mats'

/** 由粗到细的弯管（树干、树枝），顶点色从 c0 渐变到 c1 */
function tube(pts: V3[], r0: number, r1: number, c0: string, c1: string, radial = 7, segs = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal')
  const fr = curve.computeFrenetFrames(segs, false), a = new THREE.Color(c0), b = new THREE.Color(c1), c = new THREE.Color()
  const pos: number[] = [], nor: number[] = [], cl: number[] = [], p = new THREE.Vector3(), d = new THREE.Vector3(), ring: [number[], number[], number[]][][] = []
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, r = r0 + (r1 - r0) * u; curve.getPointAt(u, p); c.copy(a).lerp(b, u); ring.push([])
    for (let j = 0; j <= radial; j++) { const t = j / radial * Math.PI * 2; d.copy(fr.normals[i]).multiplyScalar(Math.cos(t)).addScaledVector(fr.binormals[i], Math.sin(t)); ring[i].push([[p.x + d.x * r, p.y + d.y * r, p.z + d.z * r], [d.x, d.y, d.z], [c.r, c.g, c.b]]) }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) for (const [x, y] of [[i, j], [i, j + 1], [i + 1, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]]) { const v = ring[x][y]; pos.push(...v[0]); nor.push(...v[1]); cl.push(...v[2]) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3))
  return g
}

/** 一棵阔叶树，高 1。kind 决定树形：0、1 是圆冠，2 是高瘦的，3 是矮胖的 */
function leafyTree(seed: number, kind: number) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = []
  const pos: number[] = [], nor: number[] = [], cl: number[] = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3(), v = new THREE.Vector3(), n3 = new THREE.Matrix3()
  const L = new THREE.CircleGeometry(0.02, 5).toNonIndexed(); L.scale(1.6, 0.8, 1)
  const c0 = new THREE.Color(['#25401f', '#2c4a1e', '#1f3d27', '#35501f'][kind]), c1 = new THREE.Color(['#7a9c4c', '#8aa648', '#6c9455', '#9bb04a'][kind]), c = new THREE.Color()
  const fork = kind === 2 ? 0.42 : kind === 3 ? 0.3 : 0.36, spread = kind === 2 ? 0.2 : kind === 3 ? 0.36 : 0.28
  const top: V3 = [(r() - 0.5) * 0.05, fork, (r() - 0.5) * 0.05]
  parts.push(tube([[0, -0.02, 0], [0.012, fork * 0.5, 0], top], 0.04, 0.024, '#4a3a2c', '#5d4a38', 8, 8))
  const nb = 7 + Math.floor(r() * 3)
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * 6.28 + r() * 0.6, up = (kind === 2 ? 0.8 : 0.4) + r() * 0.7, len = spread * (0.8 + r() * 0.5)
    const end: V3 = [top[0] + Math.cos(a) * Math.cos(up) * len, top[1] + Math.sin(up) * len, top[2] + Math.sin(a) * Math.cos(up) * len]
    parts.push(tube([top, [(top[0] + end[0]) / 2, (top[1] + end[1]) / 2 + 0.03, (top[2] + end[2]) / 2], end], 0.017, 0.006, '#4a3a2c', '#5d4a38', 5, 5))
    const R = 0.17 + r() * 0.06
    for (let k = 0; k < 210; k++) {
      const th = r() * 6.28, ph = Math.acos(2 * r() - 1), rr = R * Math.pow(r(), 0.35)
      t.set(end[0] + Math.sin(ph) * Math.cos(th) * rr, end[1] + Math.cos(ph) * rr * 0.8, end[2] + Math.sin(ph) * Math.sin(th) * rr)
      c.copy(c0).lerp(c1, Math.max(0, Math.min(1, (t.y - 0.4) / 0.55 + (r() - 0.5) * 0.5)))
      const sc = 0.8 + r() * 0.8; q.setFromEuler(e.set(r() * 3, r() * 6.28, r() * 3, 'YXZ')); m.compose(t, q, s.set(sc, sc, sc)); n3.getNormalMatrix(m)
      const P = L.attributes.position, N = L.attributes.normal
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(n3).normalize(); nor.push(v.x, v.y, v.z); cl.push(c.r, c.g, c.b) }
    }
  }
  const leaves = new THREE.BufferGeometry()
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); leaves.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); leaves.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3))
  return fuse([...parts, leaves])
}

/** 一片树：list 是每棵树的 [x, z, 高] */
export function Trees({ list }: { list: [number, number, number][] }) {
  const [geos, setGeos] = useState<THREE.BufferGeometry[] | null>(null)
  useEffect(() => { const out: THREE.BufferGeometry[] = []; let i = 0, t = 0; const step = () => { out.push(leafyTree(31 + i * 17, i)); if (++i < 4) t = window.setTimeout(step, 40); else setGeos(out) }; t = window.setTimeout(step, 120); return () => clearTimeout(t) }, [])
  const groups = useMemo(() => [0, 1, 2, 3].map(k => list.filter((_, i) => i % 4 === k)), [list])
  if (!geos) return null
  return <>{groups.map((g, k) => <TreeSet key={k} geo={geos[k]} list={g} seed={k} />)}</>
}
function TreeSet({ geo, list, seed }: { geo: THREE.BufferGeometry; list: [number, number, number][]; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return
    const o = new THREE.Object3D(), c = new THREE.Color(), r = rng(seed * 7 + 3)
    list.forEach(([x, z, h], i) => { o.position.set(x, 0, z); o.rotation.y = r() * 6.28; o.scale.set(h * (0.95 + r() * 0.3), h, h * (0.95 + r() * 0.3)); o.updateMatrix(); m.setMatrixAt(i, o.matrix); const v = 0.82 + r() * 0.4; m.setColorAt(i, c.setRGB(v, v * (0.96 + r() * 0.08), v * 0.9)) })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [list, seed])
  return <instancedMesh ref={ref} args={[geo, undefined, list.length]} frustumCulled={false} castShadow><meshStandardMaterial vertexColors roughness={0.85} side={THREE.DoubleSide} envMapIntensity={0.6} /></instancedMesh>
}

/** 修剪过的绿篱：一段圆角的长条，表面撒一层小叶片，不是一个光滑的盒子。从 a 到 b，高 h、厚 w */
export function hedge(a: [number, number], b: [number, number], h = 1.1, w = 0.9, seed = 1) {
  const r = rng(seed * 13 + 5), len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  const core = new THREE.BoxGeometry(len, h * 0.92, w * 0.9, Math.max(2, Math.round(len / 0.6)), 3, 2), p = core.attributes.position
  for (let i = 0; i < p.count; i++) { p.setY(i, p.getY(i) + (r() - 0.5) * 0.06); p.setZ(i, p.getZ(i) + (r() - 0.5) * 0.08) }
  core.translate(0, h * 0.46, 0); core.computeVertexNormals()
  const pos: number[] = [], nor: number[] = [], cl: number[] = [], c = new THREE.Color(), c0 = new THREE.Color('#2c4a26'), c1 = new THREE.Color('#6f9548')
  const L = new THREE.CircleGeometry(0.07, 5).toNonIndexed(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), t = new THREE.Vector3(), v = new THREE.Vector3(), n3 = new THREE.Matrix3()
  const count = Math.round(len * 70)
  for (let k = 0; k < count; k++) {
    const side = r()
    if (side < 0.4) t.set((r() - 0.5) * len, h * (0.96 + r() * 0.06), (r() - 0.5) * w)
    else t.set((r() - 0.5) * len, r() * h, (side < 0.7 ? 1 : -1) * w * (0.47 + r() * 0.05))
    c.copy(c0).lerp(c1, Math.min(1, t.y / h * 0.8 + r() * 0.4))
    q.setFromEuler(e.set(r() * 3, r() * 6, r() * 3)); m.compose(t, q, s); n3.getNormalMatrix(m)
    const P = L.attributes.position, N = L.attributes.normal
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(n3).normalize(); nor.push(v.x, v.y, v.z); cl.push(c.r, c.g, c.b) }
  }
  const leaves = new THREE.BufferGeometry()
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); leaves.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); leaves.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3))
  const g = fuse([tint(core, '#35552c'), leaves]); g.rotateY(-ang); g.translate((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2)
  return g
}
