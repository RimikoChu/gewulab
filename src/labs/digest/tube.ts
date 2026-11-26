// 沿一条曲线扫出来的管子（食道、肠、导管）：半径可以沿管子、绕管子变化（结肠袋、皱褶），带顶点颜色、贴图坐标，
// 每个顶点还记下它在管子上的位置 s（attribute 'aS'，0–1），蠕动的收缩波、“走到哪一段亮”都靠它。
// 截面方向用平行移动的标架，管子在空间里拐来拐去也不会拧成麻花。
import * as THREE from 'three'
import type { V3 } from './sdf'

export interface TubeOpt {
  segs?: number; radial?: number
  /** 管子 t 处（0–1）、绕管子 a 弧度处的半径 */
  r: (t: number, a: number) => number
  color?: (t: number, a: number) => V3
  /** 两头封口 */
  caps?: boolean
}

/** 平行移动的标架：每一点的切线、法线、副法线 */
export function frames(curve: THREE.Curve<THREE.Vector3>, n: number) {
  const T: THREE.Vector3[] = [], N: THREE.Vector3[] = [], B: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) T.push(curve.getTangentAt(i / n).normalize())
  const t0 = T[0], ref = Math.abs(t0.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  N.push(new THREE.Vector3().crossVectors(ref, t0).normalize()); B.push(new THREE.Vector3().crossVectors(t0, N[0]))
  const q = new THREE.Quaternion()
  for (let i = 1; i <= n; i++) {
    q.setFromUnitVectors(T[i - 1], T[i])
    const nn = N[i - 1].clone().applyQuaternion(q).normalize()
    N.push(nn); B.push(new THREE.Vector3().crossVectors(T[i], nn).normalize())
  }
  return { T, N, B }
}

export function sweep(curve: THREE.Curve<THREE.Vector3>, o: TubeOpt) {
  const segs = o.segs ?? 120, radial = o.radial ?? 18
  const { T, N, B } = frames(curve, segs)
  const pos: number[] = [], uv: number[] = [], col: number[] = [], ss: number[] = [], idx: number[] = []
  const len = curve.getLength(), P = curve.getSpacedPoints(segs)
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = P[i]
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, r = o.r(t, a), c = Math.cos(a), s = Math.sin(a)
      pos.push(p.x + (N[i].x * c + B[i].x * s) * r, p.y + (N[i].y * c + B[i].y * s) * r, p.z + (N[i].z * c + B[i].z * s) * r)
      uv.push(t * len * 2.2, j / radial); ss.push(t)
      if (o.color) col.push(...o.color(t, a))
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  if (o.caps) for (const end of [0, segs]) {
    const c = pos.length / 3, p = P[end]
    pos.push(p.x, p.y, p.z); uv.push(end ? len * 2.2 : 0, 0.5); ss.push(end / segs)
    if (o.color) col.push(...o.color(end / segs, 0))
    for (let j = 0; j < radial; j++) { const a = end * (radial + 1) + j; if (end) idx.push(a, a + 1, c); else idx.push(a + 1, a, c) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1))
  if (o.color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx); g.computeVertexNormals()
  // 接缝处（j = 0 和 j = radial 重合）法线取平均，不出现一条亮线
  const nr = g.attributes.normal as THREE.BufferAttribute
  for (let i = 0; i <= segs; i++) { const a = i * (radial + 1), b = a + radial; const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l) }
  return g
}

/** 给距离场做出来的网格补上贴图坐标：按法线朝向挑一个面投影（够贴细小的起伏纹理用） */
export function planarUV(g: THREE.BufferGeometry, k: number) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
    const [u, v] = ax > ay && ax > az ? [p.getZ(i), p.getY(i)] : ay > az ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)]
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

/** 湿润组织表面的细小起伏（凹凸贴图）：柔和的鼓包加细颗粒，四边无缝 */
let BUMP: THREE.CanvasTexture | null = null
export function tissueBump() {
  if (BUMP) return BUMP
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; g.fillStyle = '#808080'; g.fillRect(0, 0, S, S)
  let sd = 4217; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 260; i++) {
    const x = rnd() * S, y = rnd() * S, r = 5 + rnd() * 20, w = rnd() < 0.5 ? '255,255,255' : '0,0,0'
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); q.addColorStop(0, `rgba(${w},0.2)`); q.addColorStop(1, `rgba(${w},0)`); g.fillStyle = q; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2) }
  }
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},0.13)`; g.fillRect(rnd() * S, rnd() * S, 1.4, 1.4) }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4
  return (BUMP = t)
}

/** 湿润的组织材质：底下一层带顶点颜色的漫反射，上面一层清漆样的高光，边缘一点绒光 */
export function wetMat(o: { color?: string; vertexColors?: boolean; sheen?: string; rough?: number; coat?: number; bump?: number; side?: THREE.Side; transparent?: boolean } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: o.color ?? '#ffffff', vertexColors: o.vertexColors ?? false, roughness: o.rough ?? 0.46, clearcoat: o.coat ?? 0.75, clearcoatRoughness: 0.22,
    sheen: 0.45, sheenColor: new THREE.Color(o.sheen ?? '#ffc0b0'), sheenRoughness: 0.45, envMapIntensity: 0.75,
    bumpMap: o.bump ? tissueBump() : null, bumpScale: o.bump ?? 0, side: o.side ?? THREE.FrontSide, transparent: o.transparent ?? false,
  })
}
