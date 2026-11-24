// 支气管树：气管 → 两根主支气管 → 肺叶支气管 → 再一级级分下去，越分越细，末端是一小串一小串肺泡。
// 粗的几级（气管到第 3 级）用距离场做成一个整体，分叉处是圆滑的、气管上有一圈圈软骨环；
// 细的几级用渐细的管子，按“往这一片肺里还空着的地方长”的办法分叉，所以能把肺填满而不长出肺外。
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { TRACHEA, lungSdf } from './anat'
import { TREE_LEVELS } from './physics'
import { roundCone, smin, surfaceNetsGen, type V3 } from './sdf'
import { Sweep, taper } from './sweep'

interface Seg { a: V3; b: V3; ra: number; rb: number; lv: number; rings?: boolean }
const R = [0.085, 0.062, 0.044, 0.031, 0.023, 0.017, 0.0125, 0.0095]
const v = (p: V3) => new THREE.Vector3(...p)
const arr = (p: THREE.Vector3): V3 => [p.x, p.y, p.z]

function rnd(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

/** 粗的几级：气管、主支气管、肺叶支气管 */
const C = TRACHEA.carina, RM: V3 = [-0.48, 13.64, -0.25], LM: V3 = [0.62, 13.7, -0.22], RI: V3 = [-0.6, 13.28, -0.22]
const LOBES: { from: V3; to: V3; side: number }[] = [
  { from: RM, to: [-0.84, 13.98, -0.16], side: -1 },   // 右上叶
  { from: RI, to: [-0.86, 13.0, 0.16], side: -1 },     // 右中叶
  { from: RI, to: [-0.8, 12.78, -0.42], side: -1 },    // 右下叶
  { from: LM, to: [0.92, 13.88, -0.04], side: 1 },     // 左上叶
  { from: LM, to: [0.9, 12.86, -0.42], side: 1 },      // 左下叶
]

/** 往一片点里长：分成两半，各朝那一半的中心长一截，再接着分 */
function grow(p: THREE.Vector3, pts: THREE.Vector3[], lv: number, out: Seg[], tips: THREE.Vector3[], r: () => number) {
  if (lv > TREE_LEVELS || pts.length < 2) { tips.push(p.clone()); return }
  // 按最长的方向分两半
  const c = pts.reduce((s, q) => s.add(q), new THREE.Vector3()).multiplyScalar(1 / pts.length)
  let ax = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()
  for (let it = 0; it < 6; it++) {
    const n = new THREE.Vector3()
    for (const q of pts) { const d = q.clone().sub(c); n.addScaledVector(d, d.dot(ax)) }
    if (n.lengthSq() < 1e-12) break; ax = n.normalize()
  }
  const A: THREE.Vector3[] = [], B: THREE.Vector3[] = []
  for (const q of pts) (q.clone().sub(c).dot(ax) < 0 ? A : B).push(q)
  for (const half of [A, B]) {
    if (!half.length) continue
    const hc = half.reduce((s, q) => s.add(q), new THREE.Vector3()).multiplyScalar(1 / half.length)
    const d = hc.clone().sub(p), L = d.length() * (lv >= TREE_LEVELS ? 0.75 : 0.5)
    const q = p.clone().addScaledVector(d.normalize(), L)
    out.push({ a: arr(p), b: arr(q), ra: R[lv - 1] * 0.95, rb: R[lv], lv })
    grow(q, half, lv + 1, out, tips, r)
  }
}

export interface TreeGeo { thick: THREE.BufferGeometry; levels: THREE.BufferGeometry[]; tips: THREE.Vector3[] }
/** 分段生成（见 job.ts） */
export function* treeGen(): Generator<void, TreeGeo> {
  const segs: Seg[] = [
    { a: TRACHEA.top, b: C, ra: R[0], rb: R[0], lv: 0, rings: true },
    { a: C, b: RM, ra: R[1] * 1.05, rb: R[1], lv: 1, rings: true },
    { a: RM, b: RI, ra: R[1] * 0.95, rb: R[1] * 0.9, lv: 1, rings: true },
    { a: C, b: LM, ra: R[1], rb: R[1] * 0.95, lv: 1, rings: true },
    ...LOBES.map(l => ({ a: l.from, b: l.to, ra: R[2] * 1.1, rb: R[2], lv: 2 })),
  ]
  // 每叶分到的肺：把肺里的点按离哪个肺叶支气管近分给它
  const pts: THREE.Vector3[][] = LOBES.map(() => [])
  for (let x = -1.5; x <= 1.5; x += 0.11) for (let y = 11.4; y <= 14.9; y += 0.11) { yield; for (let z = -1.0; z <= 0.8; z += 0.11) {
    if (lungSdf(x, y, z) > -0.08) continue
    let bi = 0, bd = 1e9
    LOBES.forEach((l, i) => { if (Math.sign(x) !== l.side) return; const d = Math.hypot(x - l.to[0], y - l.to[1], z - l.to[2]); if (d < bd) { bd = d; bi = i } })
    pts[bi].push(new THREE.Vector3(x, y, z))
  } }
  const fine: Seg[] = [], tips: THREE.Vector3[] = [], r = rnd(29)
  LOBES.forEach((l, i) => grow(v(l.to), pts[i], 3, fine, tips, r))
  // 第 3 级也并进距离场（还算粗），更细的做管子
  const thickSegs = [...segs, ...fine.filter(s => s.lv === 3)]
  const thick = yield* surfaceNetsGen((x, y, z) => {
    let d = 1e9
    for (const s of thickSegs) {
      // 先粗略判断离这一段远不远，远的就不细算
      const mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2, mz = (s.a[2] + s.b[2]) / 2
      const half = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]) / 2 + s.ra + 0.08
      if (Math.hypot(x - mx, y - my, z - mz) - half > d + 0.05) continue
      let e = roundCone(x, y, z, s.a, s.b, s.ra, s.rb)
      if (s.rings && e < 0.05) {
        // 软骨环：一圈圈凸起，后壁（贴着食管的一面）是平的，没有环
        const ax = s.b[0] - s.a[0], ay = s.b[1] - s.a[1], az = s.b[2] - s.a[2], L = Math.hypot(ax, ay, az)
        const t = ((x - s.a[0]) * ax + (y - s.a[1]) * ay + (z - s.a[2]) * az) / L
        const front = Math.min(1, Math.max(0, (z - (s.a[2] + (s.b[2] - s.a[2]) * t / L)) / s.ra + 0.55))
        e -= 0.011 * Math.pow(0.5 + 0.5 * Math.cos(t / 0.105 * Math.PI * 2), 3) * front
      }
      d = smin(d, e, s.lv <= 1 ? 0.05 : 0.035)
    }
    return d
  }, [[-1.25, 12.2, -0.75], [1.25, 15.6, 0.45]], 0.024)
  // 细的几级：每级合成一个网格，好让它们一级一级亮起来
  const levels: THREE.BufferGeometry[] = []
  for (let lv = 4; lv <= TREE_LEVELS; lv++) {
    yield
    const gs = fine.filter(s => s.lv === lv).map(s => {
      const a = v(s.a), b = v(s.b), dir = b.clone().sub(a).normalize(), start = a.clone().addScaledVector(dir, -s.ra * 0.8)
      const bend = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(a.distanceTo(b) * 0.12)
      const curve = new THREE.QuadraticBezierCurve3(start, start.clone().lerp(b, 0.5).add(bend), b)
      const n = 8, sw = new Sweep(n, 7), pp = curve.getPoints(n - 1)
      const last = lv === TREE_LEVELS
      sw.update(pp, i => (s.ra + (s.rb - s.ra) * i / (n - 1)) * (last ? taper(i / (n - 1), 0.2, 0.4) : 1), i => (s.ra + (s.rb - s.ra) * i / (n - 1)) * (last ? taper(i / (n - 1), 0.2, 0.4) : 1), () => dir.clone().cross(new THREE.Vector3(0.3, 1, 0.2)).normalize())
      return sw.geo
    })
    levels.push(mergeGeometries(gs))
  }
  return { thick, levels, tips }
}
