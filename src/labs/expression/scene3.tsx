// 基因的表达 · 第 3 课的器材：从染色质团里伸出来的一根染色质丝。左边盘得很紧（核小体一圈圈绕成粗丝），
// 中间松开成“串珠”（DNA 缠在组蛋白上，珠子之间是一段段 DNA），右边是裸露的 DNA，上面有两个基因。镜头一级级推近。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { type Base } from './physics'
import { BASE_COLOR, NtSet, RISE, STRAND, TURN, bondOf, histoneGeo, pairAt, type Nt, type NtFrame } from './mol'
import { rng, type V3 } from './kit'
import { AT, useLazy } from './world'

const X = (v: V3): V3 => [v[0] + AT.three[0], v[1] + AT.three[1], v[2] + AT.three[2]]
/** 裸露 DNA 的序列和两个基因的范围（第几对到第几对） */
export const NAKED = 'TTAGCATGGCTCAAGTGATCATGTCGAACGTTA'
export const GENES = [{ from: 4, to: 13, name: '基因 A' }, { from: 19, to: 28, name: '基因 B' }]
const PAIRS: Record<string, Base> = { A: 'T', T: 'A', G: 'C', C: 'G' }
export const NAKED_X = 13        // 裸露 DNA 从局部 x = 13 开始
export const nakedAt = (i: number): V3 => X([NAKED_X + i * RISE, 0, 0])
export const GENE_MID = (g: number) => nakedAt((GENES[g].from + GENES[g].to) / 2)

// ---------- 沿一条曲线的 DNA（两条骨架、一根根碱基对），用在缠绕和连接的地方 ----------
function dnaAlong(curve: THREE.Curve<THREE.Vector3>, seed: number, phase = 0) {
  const L = curve.getLength(), n = Math.max(2, Math.round(L / RISE)), r = rng(seed)
  const T = curve.getTangentAt(0), N = new THREE.Vector3(0, 1, 0)
  if (Math.abs(N.dot(T)) > 0.9) N.set(1, 0, 0)
  N.sub(T.clone().multiplyScalar(N.dot(T))).normalize()
  const a: THREE.Vector3[] = [], b: THREE.Vector3[] = [], rungs: THREE.BufferGeometry[] = [], P = new THREE.Vector3(), B = new THREE.Vector3()
  for (let j = 0; j <= n; j++) {
    const t = j / n, Tj = curve.getTangentAt(t)
    N.sub(Tj.clone().multiplyScalar(N.dot(Tj))).normalize(); B.crossVectors(Tj, N)
    curve.getPointAt(t, P)
    const ph = phase + j * TURN, off = N.clone().multiplyScalar(Math.cos(ph) * 0.95).addScaledVector(B, Math.sin(ph) * 0.95)
    const pa = P.clone().add(off), pb = P.clone().sub(off); a.push(pa); b.push(pb)
    const base = 'ATGC'[Math.floor(r() * 4)] as Base, half = (p: THREE.Vector3, q: THREE.Vector3, col: string) => {
      const d = q.clone().sub(p), g = new THREE.CylinderGeometry(0.13, 0.13, d.length(), 6); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2); paint(g, col); rungs.push(g)
    }
    const mid = pa.clone().lerp(pb, 0.5)
    half(pa, mid, BASE_COLOR[base]); half(mid, pb, BASE_COLOR[PAIRS[base]])
  }
  const tube = (pts: THREE.Vector3[]) => paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.2, 6, false), STRAND.old)
  return mergeGeometries([tube(a), tube(b), ...rungs].map(g => g.index ? g.toNonIndexed() : g))
}
function paint(g: THREE.BufferGeometry, hex: string) { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }

// ---------- 核小体：组蛋白八聚体外面缠一圈多 DNA ----------
const RW = 4.0, TURNS = 1.65, ZH = 1.3
const A0 = -Math.PI / 2
const wrapPt = (u: number) => { const a = A0 + u * TURNS * Math.PI * 2; return new THREE.Vector3(RW * Math.cos(a), RW * Math.sin(a), -ZH + 2 * ZH * u) }
function nucleosomeGeo() {
  const core = histoneGeo(); core.scale(3.1, 3.1, 2.1)
  const pts = Array.from({ length: 60 }, (_, i) => wrapPt(i / 59))
  const wrap = dnaAlong(new THREE.CatmullRomCurve3(pts), 7)
  const ci = core.index ? core.toNonIndexed() : core
  return mergeGeometries([ci, wrap])
}
/** 各个核小体的位置和朝向（局部坐标） */
function layout() {
  const list: { c: THREE.Vector3; q: THREE.Quaternion }[] = []
  const Rs = 9, per = 6, pitch = 10.5, n = 15
  for (let k = 0; k < n; k++) {
    const a = k / per * Math.PI * 2, c = new THREE.Vector3(-46 + k * pitch / per, Rs * Math.cos(a), Rs * Math.sin(a))
    const t = new THREE.Vector3(pitch / per / (Math.PI * 2 / per), -Rs * Math.sin(a), Rs * Math.cos(a)).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), t).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a))
    list.push({ c, q })
  }
  for (let k = 0; k < 4; k++) list.push({ c: new THREE.Vector3(-14 + k * 6.6, 2.2 * Math.sin(k * 1.9 + 0.5), 1.6 * Math.cos(k * 1.4)), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4 + k * 1.1, 0.9 + k * 0.7, k * 0.5)) })
  return list
}
function fiber() {
  const nuc = nucleosomeGeo(), L = layout(), lk: THREE.BufferGeometry[] = []
  const ends = L.map(({ c, q }) => {
    const din = new THREE.Vector3(-Math.sin(A0), Math.cos(A0), 2 * ZH / (TURNS * Math.PI * 2 * RW)).normalize()
    const u1 = A0 + TURNS * Math.PI * 2, dout = new THREE.Vector3(-Math.sin(u1), Math.cos(u1), 2 * ZH / (TURNS * Math.PI * 2 * RW)).normalize()
    return { pin: wrapPt(0).applyQuaternion(q).add(c), din: din.applyQuaternion(q), pout: wrapPt(1).applyQuaternion(q).add(c), dout: dout.applyQuaternion(q) }
  })
  for (let k = 0; k + 1 < ends.length; k++) {
    const a = ends[k], b = ends[k + 1], d = a.pout.distanceTo(b.pin) * 0.35
    lk.push(dnaAlong(new THREE.CubicBezierCurve3(a.pout, a.pout.clone().addScaledVector(a.dout, d), b.pin.clone().addScaledVector(b.din, -d), b.pin), 20 + k))
  }
  const last = ends[ends.length - 1], end = new THREE.Vector3(NAKED_X, 0, 0), d = last.pout.distanceTo(end) * 0.4
  lk.push(dnaAlong(new THREE.CubicBezierCurve3(last.pout, last.pout.clone().addScaledVector(last.dout, d), end.clone().add(new THREE.Vector3(-d, 0, 0)), end), 90))
  // 前面还拖着一段，伸进染色质团里
  const first = ends[0]
  lk.push(dnaAlong(new THREE.CubicBezierCurve3(first.pin.clone().add(new THREE.Vector3(-8, -6, -4)), first.pin.clone().add(new THREE.Vector3(-4, -5, 0)), first.pin.clone().addScaledVector(first.din, -3), first.pin), 91))
  const mats = L.map(({ c, q }) => new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)))
  return { nuc, linkers: mergeGeometries(lk), mats }
}

export function Scene3({ level, glow }: { level: number; glow: number }) {
  const F = useLazy('fiber', fiber)
  const inst = useMemo(() => {
    if (!F) return null
    const m = new THREE.InstancedMesh(F.nuc, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.4, sheen: 0.5, sheenColor: '#ffe6c8' }), F.mats.length)
    F.mats.forEach((x, i) => m.setMatrixAt(i, x)); m.castShadow = true
    return m
  }, [F])
  const top = [...NAKED] as Base[], bot = top.map(b => PAIRS[b])
  const get = (): NtFrame => {
    const a: Nt[] = [], b: Nt[] = [], bonds = []
    for (let i = 0; i < top.length; i++) {
      const p = pairAt(X([NAKED_X, 0, 0]), i, i * TURN, top[i], bot[i])
      const inGene = GENES.some(g => i >= g.from && i <= g.to), hi = level >= 2 && inGene ? 0.35 : 0, dim = level >= 2 && !inGene ? 0.55 : 0
      const lit = level >= 2 && i >= GENES[0].from && i < GENES[0].from + glow ? 1 : 0
      a.push({ b: top[i], s: p.sT, e: p.eT, c: STRAND.old, hi: lit || hi, dim })
      b.push({ b: bot[i], s: p.sB, e: p.eB, c: STRAND.old, hi: lit || hi, dim })
      bonds.push(bondOf(p.eT, p.eB, top[i], dim ? 0.4 : 1))
    }
    return { strands: [a, b], bonds }
  }
  const p = AT.three
  return <group>
    {F && inst && <group position={p}>
      <primitive object={inst} />
      <mesh geometry={F.linkers} castShadow><meshPhysicalMaterial vertexColors roughness={0.45} clearcoat={0.5} /></mesh>
    </group>}
    <NtSet get={get} cap={80} letters={level >= 2} ls={0.4} />
    {/* 基因两头的界标：一圈淡淡的光环 */}
    {level >= 2 && GENES.flatMap((g, k) => [g.from - 0.5, g.to + 0.5].map((e, j) => <mesh key={`${k}${j}`} position={nakedAt(e)} rotation-y={Math.PI / 2}><torusGeometry args={[1.6, 0.05, 8, 48]} /><meshBasicMaterial color="#7fe3d4" transparent opacity={0.8} toneMapped={false} /></mesh>))}
  </group>
}
