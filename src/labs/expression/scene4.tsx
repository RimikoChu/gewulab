// 基因的表达 · 第 4 课的器材：核孔旁边的一个基因正在转录。RNA 聚合酶沿 DNA 往右走，在它里面 DNA 解开一小段，
// 核糖核苷酸按碱基互补配对接在模板链（下面那条）上，mRNA 从酶的上方一点点伸出来；走过的 DNA 又合上。
// 转录完以后把 mRNA 摆到非模板链上方比一比，再让它从右边的核孔出去。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GENE, MRNA, TEMPLATE, type Base } from './physics'
import { GAP, Jelly, NtSet, RAD, RISE, STRAND, TURN, baseLen, bondOf, pairAt, rnaPolGeo, type Bond, type Nt, type NtFrame } from './mol'
import { add, clamp, ease, smooth, type V3 } from './kit'
import { AT, PORE, PORE_DIR } from './world'

const FL = 3
const CODING = ('CGA' + GENE + 'TCC').split('') as Base[]
const TEMPL = ('GCT' + TEMPLATE + 'AGG').split('') as Base[]
const RNA = [...MRNA] as Base[]
export const N4 = CODING.length, G4 = GENE.length
export const O4: V3 = [AT.four[0] - (N4 - 1) / 2 * RISE, AT.four[1], AT.four[2]]
/** 转录走到底的位置（基因里的序号） */
export const Q4_END = G4 + 3
const HYB = 6                                    // 和模板链贴在一起的那一段有几个
const PEEL = new THREE.Vector3(-0.42, 0.86, 0.3).normalize()
/** 摆到非模板链上方比一比时，mRNA 在多高 */
export const CMP_Y = 3.9
const xOf = (i: number) => O4[0] + i * RISE

/** mRNA 出核的路线：从比一比的位置往右，弯下来，穿过核孔再往外 */
function exitCurve() {
  const a = new THREE.Vector3(xOf(FL), O4[1] + CMP_Y, O4[2]), b = new THREE.Vector3(xOf(FL + G4 - 1), O4[1] + CMP_Y, O4[2])
  const pore = new THREE.Vector3(...PORE), inside = pore.clone().addScaledVector(PORE_DIR, -6), out = pore.clone().addScaledVector(PORE_DIR, 16)
  const pts = [a, b, b.clone().add(new THREE.Vector3(4, -0.8, 0.4)), inside, pore]
  const toPore = new THREE.CatmullRomCurve3(pts, false, 'centripetal').getLength()
  return { curve: new THREE.CatmullRomCurve3([...pts, out, out.clone().addScaledVector(PORE_DIR, 10)], false, 'centripetal'), toPore }
}

export function Scene4({ q, cmp, out, show }: { q: { current: number }; cmp: { current: number }; out: { current: number }; show: boolean }) {
  const pol = useMemo(rnaPolGeo, []), { curve: path, toPore } = useMemo(exitCurve, [])
  const polRef = useRef<THREE.Group>(null)
  const plen = path.getLength(), s0 = (G4 - 1) * RISE
  const get = (): NtFrame => {
    const Q = q.current, C = cmp.current, X = out.current, top: Nt[] = [], bot: Nt[] = [], rna: Nt[] = [], bonds: Bond[] = []
    const c = Q - 2.5
    const hiT = show && C > 0.98 && X < 0.02
    for (let i = 0; i < N4; i++) {
      const g = i - FL, o = Q > -0.5 && Q < G4 + 1.5 ? 1 - smooth(2.2, 4.2, Math.abs(g - c)) : 0
      const th = TURN * (i < FL ? i - FL : i >= FL + G4 ? i - FL - G4 + 1 : 0) * 0.9
      const p = pairAt(O4, i, th, CODING[i], TEMPL[i], o * 1.9, 0)
      top.push({ b: CODING[i], s: [p.sT[0], p.sT[1], p.sT[2] - o * 0.6], e: [p.eT[0], p.eT[1], p.eT[2] - o * 0.6], c: STRAND.old, hi: hiT && CODING[i] === 'T' && g >= 0 && g < G4 ? 1 : 0 })
      bot.push({ b: TEMPL[i], s: p.sB, e: p.eB, c: STRAND.old })
      if (o < 0.1) bonds.push(bondOf(p.eT, p.eB, CODING[i], 1 - o * 10))
    }
    // mRNA
    const exitAt = (s: number) => path.getPointAt(clamp(s / plen, 0, 1))
    for (let j = 0; j < G4; j++) {
      const age = Q - j
      if (age <= 0) { rna.push({ b: RNA[j], s: [0, 0, 0], e: [0, 0, 0], c: STRAND.rna, k: 0 }); continue }
      const i = j + FL, k = clamp(age * 1.5)
      // 贴在模板链上
      const eB = pairAt(O4, i, 0, CODING[i], TEMPL[i]).eB, eP: V3 = [eB[0], eB[1] + GAP, eB[2]], sP: V3 = [eB[0], eB[1] + GAP + baseLen(RNA[j]), eB[2]]
      // 剥下来往上伸
      const j0 = Math.max(0, Q - HYB), x0 = xOf(FL + j0), anchor = new THREE.Vector3(x0, O4[1] + RAD - 0.1, O4[2])
      const d = Math.max(0, j0 - j), sp = anchor.clone().addScaledVector(PEEL, d * RISE * 1.05 + 0.2), side = new THREE.Vector3(0.86, 0.42, 0).normalize()
      const peel = smooth(HYB - 0.5, HYB + 1, age)
      let s: V3 = [sP[0] + (sp.x - sP[0]) * peel, sP[1] + (sp.y - sP[1]) * peel, sP[2] + (sp.z - sP[2]) * peel]
      let e: V3 = [eP[0] + (sp.x + side.x * 0.95 - eP[0]) * peel, eP[1] + (sp.y + side.y * 0.95 - eP[1]) * peel, eP[2] + (sp.z - eP[2]) * peel]
      // 比一比：摆到非模板链正上方，碱基朝下
      if (C > 0) {
        const k2 = ease(C), xs = xOf(i), ty = O4[1] + CMP_Y
        s = [s[0] + (xs - s[0]) * k2, s[1] + (ty - s[1]) * k2, s[2] + (O4[2] - s[2]) * k2]
        e = [e[0] + (xs - e[0]) * k2, e[1] + (ty - baseLen(RNA[j]) - e[1]) * k2, e[2] + (O4[2] - e[2]) * k2]
      }
      // 送出细胞核：沿路线一个接一个往前走
      if (X > 0) {
        const sh = ease(X) * (toPore + 7 - s0), a = exitAt(j * RISE + sh), b = exitAt(j * RISE + sh + 0.3), t = b.clone().sub(a).normalize()
        const dn = new THREE.Vector3(0, -1, 0).addScaledVector(t, t.y).normalize()
        s = [a.x, a.y, a.z]; e = add(s, [dn.x, dn.y, dn.z], baseLen(RNA[j]))
      }
      rna.push({ b: RNA[j], s, e, c: STRAND.rna, k, hi: hiT && RNA[j] === 'U' ? 1 : 0 })
      if (peel < 0.5 && C === 0) bonds.push(bondOf(eB, eP, RNA[j], 1 - peel * 2))
    }
    return { strands: [top, bot, rna], bonds }
  }
  useFrame(() => {
    const Q = q.current, g = polRef.current; if (!g) return
    const k = smooth(-1, 0, Q) * (1 - smooth(G4 + 0.5, G4 + 2.5, Q))
    g.visible = k > 0.02; g.scale.setScalar(Math.max(0.001, k) * 1.55)
    g.position.set(xOf(FL + Q - 2.5), O4[1] + 0.55, O4[2] - 0.35)
  })
  return <group>
    <NtSet get={get} cap={110} ls={0.42} />
    <group ref={polRef}><Jelly geo={pol} color="#ffffff" opacity={0.42} scale={[1.25, 1, 0.95]} /></group>
  </group>
}
