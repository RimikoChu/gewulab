// 基因的表达 · 第 6 课的器材：内质网旁的一个核糖体正在翻译那条 mRNA。小亚基在 mRNA 下面，半透明的大亚基在上面，
// 里面并排三个位置；三叶草形的 tRNA 带着氨基酸从上方飘进来，反密码子和密码子配上，肽链接到新来的氨基酸上，核糖体往前挪三个碱基，空的 tRNA 离开。
// 读到终止密码子，肽链脱下来。旁边立着一块小的密码表，正在读的密码子亮着。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MRNA, anticodon, codons, translate, type Base } from './physics'
import { NtSet, RAD, RISE, STRAND, TRNA_ANTI_Y, TRNA_TOP, TableScreen, aaColor, aaGeo, baseLen, bigSubGeo, bondOf, rnaLine, smallSubGeo, trnaGeo, type Bond, type Nt, type NtFrame } from './mol'
import { clamp, ease, type V3 } from './kit'
import { AT } from './world'

export const CS6 = codons(MRNA)
export const AAS = translate(MRNA).list.map(x => x.aa)
export const U_END = CS6.length                       // 7：最后一格是终止密码子
export const O6: V3 = [AT.six[0] - (MRNA.length - 1) / 2 * RISE + 1.2, AT.six[1] - 1.6, AT.six[2]]
export const codonX = (k: number) => O6[0] + (3 * k + 1) * RISE
const TY = O6[1] + 2 * RAD - TRNA_ANTI_Y                 // tRNA 局部原点的高度：反密码子正好和密码子配上

/** 某个时刻（u）每样东西在哪：tRNA、肽链、核糖体 */
export function poseAt(u: number) {
  const c = Math.min(U_END - 1, Math.floor(u)), f = u - c
  const trna = AAS.map((_, k) => {
    const arrive = k === 0 ? ease(clamp(u / 0.8)) : ease(clamp((u - k) / 0.4))
    const leave = k < AAS.length - 1 ? ease(clamp((u - (k + 2) - 0.6) / 0.4)) : ease(clamp((u - (U_END - 1) - 0.4) / 0.6))
    const base: V3 = [codonX(k), TY, O6[2]]
    const p: V3 = [base[0] + (1 - arrive) * 3 - leave * 2.2, base[1] + (1 - arrive) * 6 + leave * 5.5, base[2] + (1 - arrive) * 4 + leave * 2.5]
    return { p, k: Math.min(arrive, 1 - leave), paired: arrive > 0.98 && leave < 0.02 }
  })
  const top = (k: number): V3 => { const p = trna[k].p; return [p[0] + TRNA_TOP[0], p[1] + TRNA_TOP[1] + 0.5, p[2]] }
  const path = (d: number): V3 => [-0.14 * d - 0.03 * d * d, 0.74 * d, -0.1 * d]
  const at = (a: V3, d: number): V3 => { const o = path(d); return [a[0] + o[0], a[1] + o[1], a[2] + o[2]] }
  // 肽链：每个氨基酸的位置
  const beads: { aa: string; p: V3; k: number }[] = []
  const n = c === 0 ? 1 : Math.min(c + 1, AAS.length)
  for (let i = 0; i < n; i++) {
    if (c === 0) { beads.push({ aa: AAS[0], p: top(0), k: trna[0].k }); break }
    if (c >= U_END - 1) { const rel = ease(clamp((f - 0.2) / 0.8)), last = AAS.length - 1, a = at([codonX(last) + TRNA_TOP[0], TY + TRNA_TOP[1] + 0.5, O6[2]], last - i); const fin: V3 = [codonX(1) + 0.6 + i * 1.15, O6[1] + 6.2 + 0.3 * Math.sin(i * 1.7), O6[2] + 2.8]; beads.push({ aa: AAS[i], p: [a[0] + (fin[0] - a[0]) * rel, a[1] + (fin[1] - a[1]) * rel, a[2] + (fin[2] - a[2]) * rel], k: 1 }); continue }
    if (i === c) { beads.push({ aa: AAS[i], p: top(c), k: trna[c].k }); continue }
    const t = ease(clamp((f - 0.4) / 0.2)), before = at(top(c - 1), c - 1 - i), after = at(top(c), c - i)
    beads.push({ aa: AAS[i], p: [before[0] + (after[0] - before[0]) * t, before[1] + (after[1] - before[1]) * t, before[2] + (after[2] - before[2]) * t], k: 1 })
  }
  // 核糖体：P 位对着第几个密码子
  const pSite = c === 0 ? 0 : c >= U_END - 1 ? U_END - 2 : c - 1 + ease(clamp((f - 0.6) / 0.4))
  const apart = c >= U_END - 1 ? ease(clamp((f - 0.6) / 0.4)) : 0
  return { trna, beads, pSite, apart, aSite: c >= U_END - 1 ? U_END - 1 : c }
}

export function Scene6({ u }: { u: { current: number } }) {
  const big = useMemo(() => bigSubGeo(), []), small = useMemo(() => smallSubGeo(), []), tg = useMemo(trnaGeo, []), ag = useMemo(() => aaGeo(3), [])
  const mrna = useMemo(() => rnaLine(O6, MRNA), [])
  const bigRef = useRef<THREE.Group>(null), smallRef = useRef<THREE.Group>(null)
  const tRefs = useRef<(THREE.Group | null)[]>([]), aRefs = useRef<(THREE.Mesh | null)[]>([])
  const get = (): NtFrame => {
    const P = poseAt(u.current), anti: Nt[][] = [], bonds: Bond[] = []
    P.trna.forEach((t, k) => {
      if (t.k < 0.02) return
      const ac = anticodon(CS6[k]), list: Nt[] = []
      for (let j = 0; j < 3; j++) {
        const b = ac[j] as Base, s: V3 = [t.p[0] + (j - 1) * RISE, t.p[1] + TRNA_ANTI_Y, t.p[2]]
        list.push({ b, s, e: [s[0], s[1] - baseLen(b), s[2]], c: STRAND.trna, k: t.k })
        if (t.paired) { const m = mrna[3 * k + j]; bonds.push(bondOf(m.e, [s[0], s[1] - baseLen(b), s[2]], m.b)) }
      }
      anti.push(list)
    })
    return { strands: [mrna, ...anti], bonds }
  }
  useFrame(() => {
    const P = poseAt(u.current), x = codonX(P.pSite)
    bigRef.current?.position.set(x + 0.2, O6[1] + 3.5 + P.apart * 1.2, O6[2] - 0.2 - P.apart * 1.5)
    smallRef.current?.position.set(x + 0.1, O6[1] - 1.05 - P.apart * 0.8, O6[2] - 0.1 - P.apart * 1.2)
    P.trna.forEach((t, k) => { const g = tRefs.current[k]; if (!g) return; g.visible = t.k > 0.02; g.position.set(...t.p); g.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * t.k)) })
    AAS.forEach((_, i) => { const m = aRefs.current[i]; if (!m) return; const b = P.beads[i]; m.visible = !!b && b.k > 0.02; if (b) { m.position.set(...b.p); m.scale.setScalar(Math.max(0.001, b.k)) } })
  })
  const P0 = poseAt(u.current)
  return <group>
    <NtSet get={get} cap={50} ls={0.46} />
    {/* 小亚基在 mRNA 下面，是实心的团块；大亚基在上面，约大一倍，半透明，透过它看得见 E、P、A 三个位点上的 tRNA */}
    <group ref={smallRef}><mesh geometry={small} scale={[3.0, 1.3, 2.1]} castShadow receiveShadow><meshPhysicalMaterial vertexColors color="#e8c9a0" roughness={0.55} clearcoat={0.4} sheen={0.6} sheenColor="#fff2dc" /></mesh></group>
    <group ref={bigRef}>
      <mesh geometry={big} scale={[3.2, 2.5, 2.3]} renderOrder={4}><meshPhysicalMaterial vertexColors transparent opacity={0.5} depthWrite={false} roughness={0.45} clearcoat={0.6} sheen={0.7} sheenColor="#e0e8ff" /></mesh>
      <mesh geometry={big} scale={[3.2, 2.5, 2.3]} renderOrder={3}><meshPhysicalMaterial vertexColors transparent opacity={0.22} depthWrite={false} side={THREE.BackSide} roughness={0.6} /></mesh>
    </group>
    {AAS.map((_, k) => <group key={k} ref={g => { tRefs.current[k] = g }} visible={false}>
      <mesh geometry={tg} castShadow><meshPhysicalMaterial vertexColors roughness={0.4} clearcoat={0.7} /></mesh>
    </group>)}
    {AAS.map((a, i) => <mesh key={i} ref={m => { aRefs.current[i] = m }} geometry={ag} visible={false} castShadow><meshPhysicalMaterial color={aaColor(a)} roughness={0.35} clearcoat={0.8} sheen={0.6} /></mesh>)}
    <TableScreen hl={[]} cur={CS6[P0.aSite]} w={5.6} position={[AT.six[0] + 11.5, AT.six[1] + 5.4, AT.six[2] - 5]} rotation-y={-0.5} />
  </group>
}
