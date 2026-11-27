// 基因的表达 · 第 2 课的器材：一段正在复制的 DNA。环形的解旋酶在前面把双链解开，两个 DNA 聚合酶在两条模板链上把新的脱氧核苷酸接上：
// 下面那条子链朝着解旋的方向一口气接下去；上面那条方向相反，只能一段一段往回接。复制完是两个 DNA，各留一条母链（蓝），配一条子链（橙）。
// 再复制一代：每个 DNA 分成两个，一直到第 3 代 8 个。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { complement, L2_SEQ, type Base } from './physics'
import { GAP, Jelly, NtSet, RAD, RISE, STRAND, TURN, baseLen, bondOf, helicaseGeo, pairAt, polymeraseGeo, type Bond, type Nt, type NtFrame } from './mol'
import { clamp, smooth, type V3 } from './kit'
import { AT } from './world'

export const N2 = L2_SEQ.length
const TOP = [...L2_SEQ] as Base[], BOT = [...complement(L2_SEQ)] as Base[]
const O2: V3 = [AT.two[0] - (N2 - 1) / 2 * RISE, AT.two[1], AT.two[2]]
const SEP = 1.45                         // 解开以后每条链往外挪多少：两个子代 DNA 的中轴在 ±SEP
const F = 4                              // 后随链一段几个
/** 复制叉走到底的位置（碱基对的序号） */
export const Q_END = N2 + 3
export const Q_START = -1.5

/** 每一代各个 DNA 的位置、大小、两条链的颜色（上链、下链是不是旧的） */
interface Mol { c: V3; s: number; oldTop: boolean; oldBot: boolean }
export function generation(n: number): Mol[] {
  let list: { oldTop: boolean; oldBot: boolean }[] = [{ oldTop: true, oldBot: true }]
  for (let g = 0; g < n; g++) list = list.flatMap(m => [{ oldTop: m.oldTop, oldBot: false }, { oldTop: false, oldBot: m.oldBot }])
  const at = AT.two
  const place = (i: number): { c: V3; s: number } => {
    if (n <= 1) return { c: [at[0], at[1] + (i === 0 ? SEP : -SEP), at[2]], s: 1 }
    if (n === 2) return { c: [at[0], at[1] + [3.5, 1.2, -1.2, -3.5][i], at[2]], s: 0.62 }
    return { c: [at[0] + (i % 2 ? 3.1 : -3.1), at[1] + [3.4, 1.15, -1.15, -3.4][i >> 1], at[2]], s: 0.5 }
  }
  return list.map((m, i) => ({ ...m, ...place(i) }))
}

/** 一个完整的 DNA：中心 c、缩放 s、拧成螺旋的程度 w */
function molecule(c: V3, s: number, w: number, oldTop: boolean, oldBot: boolean, top: Nt[], bot: Nt[], bonds: Bond[], k = 1) {
  for (let i = 0; i < N2; i++) {
    const p = pairAt([0, 0, 0], i - (N2 - 1) / 2, w * (i - (N2 - 1) / 2) * TURN, TOP[i], BOT[i])
    const tr = (v: V3): V3 => [c[0] + v[0] * s, c[1] + v[1] * s, c[2] + v[2] * s]
    top.push({ b: TOP[i], s: tr(p.sT), e: tr(p.eT), c: oldTop ? STRAND.old : STRAND.new, sz: s, k })
    bot.push({ b: BOT[i], s: tr(p.sB), e: tr(p.eB), c: oldBot ? STRAND.old : STRAND.new, sz: s, k })
    bonds.push(bondOf(tr(p.eT), tr(p.eB), TOP[i], k * s))
  }
}

/** 第 i 段后随链接了几个（0–F） */
const lagCount = (q: number, m: number) => clamp((q - (F * m + F + 1)) * 2, 0, F)

export function Scene2({ q, gen, twist }: { q: { current: number }; gen: { current: number }; twist: { current: number } }) {
  const heli = useMemo(helicaseGeo, []), polA = useMemo(() => polymeraseGeo(1), []), polB = useMemo(() => polymeraseGeo(4), [])
  const hRef = useRef<THREE.Group>(null), aRef = useRef<THREE.Group>(null), bRef = useRef<THREE.Group>(null)
  const get = (): NtFrame => {
    const Q = q.current, g = gen.current, strands: Nt[][] = [], bonds: Bond[] = []
    if (g > 1.001) {
      // 第 2、3 代：每个 DNA 从上一代的位置分成两个
      const n = Math.ceil(g - 1e-6), f = smooth(0, 1, g - (n - 1)), prev = generation(n - 1), cur = generation(n)
      cur.forEach((m, i) => {
        const p = prev[i >> 1], c: V3 = [p.c[0] + (m.c[0] - p.c[0]) * f, p.c[1] + (m.c[1] - p.c[1]) * f, p.c[2] + (m.c[2] - p.c[2]) * f]
        const top: Nt[] = [], bot: Nt[] = []
        molecule(c, p.s + (m.s - p.s) * f, 1, m.oldTop, m.oldBot, top, bot, bonds)
        strands.push(top, bot)
      })
      return { strands, bonds }
    }
    if (Q >= Q_END - 1e-3) {
      // 复制完了：两个子代 DNA 各自拧成螺旋
      for (const m of generation(1)) { const top: Nt[] = [], bot: Nt[] = []; molecule(m.c, 1, twist.current, m.oldTop, m.oldBot, top, bot, bonds); strands.push(top, bot) }
      return { strands, bonds }
    }
    const top: Nt[] = [], bot: Nt[] = [], newTop: Nt[] = [], newBot: Nt[] = []
    for (let i = 0; i < N2; i++) {
      const o = smooth(0, 2.2, Q - i), th = TURN * Math.max(0, i - (Q + 1.2)) * smooth(0, 1, (i - Q - 1.2) / 2 + 0.5)
      const p = pairAt(O2, i, th, TOP[i], BOT[i], o * (SEP), o * (SEP))
      top.push({ b: TOP[i], s: p.sT, e: p.eT, c: STRAND.old })
      bot.push({ b: BOT[i], s: p.sB, e: p.eB, c: STRAND.old })
      if (o < 0.12) bonds.push(bondOf(p.eT, p.eB, TOP[i], 1 - o / 0.12))
      // 上面那条模板上的子链（后随链：一段一段往回接）
      const m = Math.floor(i / F), kL = clamp(lagCount(Q, m) - (F * m + F - 1 - i))
      const dT: V3 = [0, -Math.cos(th), -Math.sin(th)]
      const eA: V3 = [p.eT[0], p.eT[1] + dT[1] * GAP, p.eT[2] + dT[2] * GAP], lA = baseLen(BOT[i])
      const fly = (1 - kL) * 1.6
      newTop.push({ b: BOT[i], e: [eA[0] - fly * 0.4, eA[1] - fly, eA[2] + fly], s: [eA[0] - fly * 0.4, eA[1] + dT[1] * lA - fly, eA[2] + dT[2] * lA + fly], c: STRAND.new, k: kL, cut: i % F === F - 1 ? lagCount(Q, m + 1) < F || lagCount(Q, m) < F : kL < 1 })
      if (kL >= 1) bonds.push(bondOf(p.eT, eA, TOP[i], 1))
      // 下面那条模板上的子链（前导链：跟着解旋一口气接下去）
      const kD = clamp((Q - 1.6 - i) * 2)
      const eB: V3 = [p.eB[0], p.eB[1] - dT[1] * GAP, p.eB[2] - dT[2] * GAP], lB = baseLen(TOP[i]), flyB = (1 - kD) * 1.6
      newBot.push({ b: TOP[i], e: [eB[0] + flyB * 0.4, eB[1] + flyB, eB[2] + flyB], s: [eB[0] + flyB * 0.4, eB[1] - dT[1] * lB + flyB, eB[2] - dT[2] * lB + flyB], c: STRAND.new, k: kD, cut: kD < 1 || clamp((Q - 1.6 - i - 1) * 2) < 1 })
      if (kD >= 1) bonds.push(bondOf(p.eB, eB, BOT[i], 1))
    }
    return { strands: [top, bot, newTop, newBot], bonds }
  }
  useFrame(({ clock }) => {
    const Q = q.current, on = Q > Q_START + 0.05 && Q < Q_END - 0.05 && gen.current <= 1.001
    const vis = (g: THREE.Group | null, k: number) => { if (g) { g.visible = k > 0.02; g.scale.setScalar(Math.max(0.001, k)) } }
    // 解旋酶：套在下面那条模板链上，在复制叉的最前面
    if (hRef.current) { const x = O2[0] + Math.min(Q + 0.6, N2 + 0.3) * RISE; hRef.current.position.set(x, O2[1] - RAD - 0.05, O2[2]); hRef.current.rotation.x = clock.elapsedTime * 1.2 }
    vis(hRef.current, on ? smooth(Q_START, Q_START + 1, Q) * (1 - smooth(N2 + 0.6, Q_END - 0.2, Q)) : 0)
    // 前导链上的聚合酶
    if (aRef.current) { const x = O2[0] + clamp(Q - 1.9, 0, N2 - 1) * RISE; aRef.current.position.set(x, O2[1] - SEP * smooth(0, 2.2, Q - (Q - 1.9)), O2[2] - 0.2) }
    vis(aRef.current, on ? smooth(0.5, 1.5, Q) * (1 - smooth(N2 + 1.2, Q_END - 0.1, Q)) : 0)
    // 后随链上的聚合酶：在正在接的那一段的最前头
    let m = -1; for (let j = 0; j < N2 / F; j++) { const c = lagCount(Q, j); if (c > 0 && c < F) m = j }
    if (bRef.current && m >= 0) { const x = O2[0] + (F * m + F - 1 - lagCount(Q, m)) * RISE; bRef.current.position.lerp(new THREE.Vector3(x, O2[1] + SEP, O2[2] - 0.2), 0.25) }
    vis(bRef.current, on && m >= 0 ? 1 : 0)
  })
  return <group>
    <NtSet get={get} cap={260} letters ls={0.4} />
    <group ref={hRef}><mesh geometry={heli} castShadow><meshPhysicalMaterial vertexColors roughness={0.42} clearcoat={0.8} sheen={0.6} sheenColor="#d0fff4" /></mesh></group>
    <group ref={aRef}><Jelly geo={polA} color="#ffffff" opacity={0.55} scale={[1.05, 0.9, 0.9]} /></group>
    <group ref={bRef} rotation-z={Math.PI}><Jelly geo={polB} color="#ffffff" opacity={0.55} scale={[1.05, 0.9, 0.9]} /></group>
  </group>
}
