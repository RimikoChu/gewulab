// 基因的表达 · 第 7 课的器材：人血红蛋白 β 链基因开头的一段。上面是 DNA（突变的那一对碱基亮着），中间是转录出的 mRNA，
// 下面是一个个氨基酸；和正常不一样的氨基酸带红圈。右边上面是正常的红细胞（两面凹的圆饼），碱基替换以后下面出现镰刀形的。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HBB, HBB_AT, complement, mutantProtein, mutate, tToU, type Base, type Mut } from './physics'
import { NtSet, RISE, STRAND, aaColor, aaGeo, bondOf, pairAt, rnaLine, type Bond, type Nt, type NtFrame } from './mol'
import { clamp, type V3 } from './kit'
import { AT } from './world'

/** 只画突变位点前后的几个密码子：从第 3 个密码子（第 6 对碱基）画起，前面的收起 */
export const VIS = 6
export const X7 = AT.seven[0] - 16 * RISE
export const Y_DNA = AT.seven[1] + 3.0, Y_RNA = AT.seven[1] - 0.9, Y_AA = AT.seven[1] - 2.7
export const codon7 = (k: number) => X7 + (3 * k + 1) * RISE
export const RBC: V3 = [AT.seven[0] - 3.2, AT.seven[1] - 6.4, AT.seven[2]]
export const RBC2: V3 = [AT.seven[0] + 3.4, AT.seven[1] - 6.4, AT.seven[2]]

/** 两面凹的圆饼（红细胞的经典形状，按它的厚度公式车出来） */
function rbcGeo() {
  const pts: THREE.Vector2[] = [], N = 40
  const z = (r: number) => 0.5 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.207 + 2.003 * r * r - 1.123 * r ** 4)
  for (let i = 0; i <= N; i++) { const r = i / N; pts.push(new THREE.Vector2(Math.max(1e-3, r), z(r) + 0.02)) }
  for (let i = N; i >= 0; i--) { const r = i / N; pts.push(new THREE.Vector2(Math.max(1e-3, r), -z(r) - 0.02)) }
  const g = new THREE.LatheGeometry(pts, 64); g.computeVertexNormals(); return g
}
/** 镰刀形：一段弯弯的、两头尖的扁管 */
function sickleGeo() {
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => { const a = -1.15 + i / 8 * 2.3; return new THREE.Vector3(Math.sin(a) * 0.95, Math.cos(a) * 0.95 - 0.55, 0) }))
  const g = new THREE.TubeGeometry(curve, 64, 0.24, 18, false), p = g.attributes.position, c = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    const u = Math.floor(i / 19) / 64, w = Math.sin(Math.PI * u) ** 0.7, pt = curve.getPointAt(u)
    c.set(p.getX(i), p.getY(i), p.getZ(i)).sub(pt).multiplyScalar(w)
    p.setXYZ(i, pt.x + c.x, pt.y + c.y, pt.z + c.z * 0.55)
  }
  g.computeVertexNormals(); return g
}

export function Scene7({ kind, shown, tr }: { kind: Mut; shown: boolean; tr: { current: number } }) {
  const dna = mutate(HBB, kind), templ = complement(dna), rna = tToU(dna), prot = mutantProtein(kind)
  const ag = useMemo(() => aaGeo(5), []), disc = useMemo(rbcGeo, []), sickle = useMemo(sickleGeo, [])
  const aRefs = useRef<(THREE.Group | null)[]>([]), dRef = useRef<THREE.Mesh>(null), sRef = useRef<THREE.Mesh>(null)
  const isSickle = shown && kind === 'sub'
  const mark = (i: number) => kind === 'none' ? false : kind === 'del' ? i === HBB_AT - 1 || i === HBB_AT : i === HBB_AT
  const get = (): NtFrame => {
    const t = tr.current, top: Nt[] = [], bot: Nt[] = [], bonds: Bond[] = []
    for (let i = VIS; i < dna.length; i++) {
      const gap = kind === 'del' && i >= HBB_AT ? 1 : 0
      const p = pairAt([X7 + gap * RISE, Y_DNA, AT.seven[2]], i, 0, dna[i] as Base, templ[i] as Base)
      const hi = mark(i) ? (kind === 'del' ? 0.45 : 1) : 0
      top.push({ b: dna[i] as Base, s: p.sT, e: p.eT, c: STRAND.old, hi, cut: kind === 'del' && i === HBB_AT - 1 })
      bot.push({ b: templ[i] as Base, s: p.sB, e: p.eB, c: STRAND.old, hi, cut: kind === 'del' && i === HBB_AT - 1 })
      bonds.push(bondOf(p.eT, p.eB, dna[i] as Base))
    }
    const m = rnaLine([X7, Y_RNA, AT.seven[2]], rna).map((n, i) => ({ ...n, k: i < VIS ? 0 : shown ? clamp(t * 1.6 * rna.length - i) : 0, hi: mark(i) ? 0.8 : 0 }))
    return { strands: [top, bot, m], bonds }
  }
  useFrame(({ clock }) => {
    const t = tr.current
    prot.aa.forEach((_, k) => { const g = aRefs.current[k]; if (!g) return; const v = shown && k >= VIS / 3 ? clamp((t - 0.5) / 0.45 * (prot.aa.length + 1) - k) : 0; g.visible = v > 0.02; g.scale.setScalar(Math.max(0.001, v)) })
    const s = clamp((t - 0.7) * 4)
    if (dRef.current) { dRef.current.scale.setScalar(1.75); dRef.current.rotation.z = 0.3 + Math.sin(clock.elapsedTime * 0.3) * 0.15 }
    if (sRef.current) { const k = isSickle ? s : 0; sRef.current.scale.setScalar(2.1 * k); sRef.current.visible = k > 0.02 }
  })
  return <group>
    <NtSet get={get} cap={100} ls={0.52} />
    {prot.aa.map((a, k) => <group key={`${kind}${k}`} ref={g => { aRefs.current[k] = g }} position={[codon7(k), Y_AA, AT.seven[2]]} visible={false}>
      <mesh geometry={ag} scale={1.2} castShadow><meshPhysicalMaterial color={aaColor(a)} roughness={0.35} clearcoat={0.8} /></mesh>
      {prot.diff[k] && <mesh rotation-x={0}><torusGeometry args={[0.78, 0.07, 10, 40]} /><meshBasicMaterial color="#ff5a4f" toneMapped={false} /></mesh>}
      {k > VIS / 3 && <mesh position={[-1.5 * RISE, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 3 * RISE - 1.0, 8]} /><meshStandardMaterial color="#d9dee6" /></mesh>}
    </group>)}
    {/* 右边上面一直放一个正常的红细胞做对照；碱基替换翻译以后，下面出现镰刀形的 */}
    <group position={RBC}>
      <mesh ref={dRef} rotation-x={0.5} castShadow><primitive object={disc} attach="geometry" /><meshPhysicalMaterial color="#c8322c" roughness={0.45} clearcoat={0.5} sheen={0.6} sheenColor="#ff9a8a" /></mesh>
    </group>
    <group position={RBC2}>
      <mesh ref={sRef} visible={false} rotation-z={-0.2} castShadow><primitive object={sickle} attach="geometry" /><meshPhysicalMaterial color="#b02a28" roughness={0.45} clearcoat={0.5} sheen={0.6} sheenColor="#ff9a8a" /></mesh>
    </group>
  </group>
}
