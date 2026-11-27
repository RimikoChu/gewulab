// 基因的表达 · 第 1 课的器材：核里漂着的一段 DNA 模型。上面一条链（母链）已经有了，下面的脱氧核苷酸一个个飘过来配上去；
// 配完以后标出两条链的方向，再把平的“梯子”拧成双螺旋。
import { useRef } from 'react'
import { ForceArrow } from '@/lab-kit'
import { complement, L1_TOP, type Base } from './physics'
import { NtSet, RISE, STRAND, TURN, bondOf, pairAt, type Nt, type NtFrame } from './mol'
import { add, clamp, ease, mix, type V3 } from './kit'
import { AT } from './world'

export const N1 = L1_TOP.length
const TOP = [...L1_TOP] as Base[], BOT = [...complement(L1_TOP)] as Base[]
export const O1: V3 = [AT.one[0] - (N1 - 1) / 2 * RISE, AT.one[1], AT.one[2]]
/** 第 i 对碱基的位置（twist 是拧成螺旋的程度） */
export const pos1 = (i: number, twist: number) => pairAt(O1, i, twist * (i - (N1 - 1) / 2) * TURN, TOP[i], BOT[i])

/** placed：每个下链核苷酸是什么时候配上去的（performance.now 的毫秒数）；twist：拧成螺旋的程度，每帧读 */
export function Scene1({ placed, twist, dir }: { placed: number[]; twist: { current: number }; dir: boolean }) {
  const pRef = useRef(placed); pRef.current = placed
  const get = (): NtFrame => {
    const now = performance.now(), w = twist.current, top: Nt[] = [], bot: Nt[] = [], bonds = []
    for (let i = 0; i < N1; i++) {
      const p = pos1(i, w)
      top.push({ b: TOP[i], s: p.sT, e: p.eT, c: STRAND.old })
      const t0 = pRef.current[i]
      if (t0 === undefined) {
        // 还没配上：先画出下链的骨架（淡淡的糖和磷酸、一小截碱基位），标出它会在哪里
        const d: V3 = [p.eB[0] - p.sB[0], p.eB[1] - p.sB[1], p.eB[2] - p.sB[2]], l = Math.hypot(...d)
        bot.push({ b: BOT[i], s: p.sB, e: [p.sB[0] + d[0] / l * 0.28, p.sB[1] + d[1] / l * 0.28, p.sB[2] + d[2] / l * 0.28], c: STRAND.dim, dim: 1, lt: false, cut: pRef.current[i + 1] !== undefined })
        continue
      }
      const f = clamp((now - t0) / 1100), k = ease(f)
      // 从下方前面飘过来，转正，贴上
      const from: V3 = add(p.sB, [0.8 + (i % 3) * 0.4, -3.6, 2.6]), s = mix(from, p.sB, k)
      const tilt = (1 - k) * 1.6, e: V3 = add(s, [Math.sin(tilt) * 0.9, Math.cos(tilt) * (p.eB[1] - p.sB[1]), (p.eB[2] - p.sB[2]) * k])
      bot.push({ b: BOT[i], s, e: f >= 1 ? p.eB : e, c: STRAND.new, k: 0.4 + 0.6 * k, cut: f < 1 || pRef.current[i + 1] === undefined || now - pRef.current[i + 1] < 1100 })
      if (f >= 1) bonds.push(bondOf(p.eT, p.eB, TOP[i], 1))
    }
    return { strands: [top, bot], bonds }
  }
  const L = (N1 - 1) / 2 * RISE + 0.5
  return <group>
    <NtSet get={get} cap={40} />
    {dir && <>
      <ForceArrow tip={[AT.one[0] + L, AT.one[1] + 2.1, AT.one[2]]} dir={[1, 0, 0]} len={2 * L} color={STRAND.old} opacity={0.85} thick={0.55} />
      <ForceArrow tip={[AT.one[0] - L, AT.one[1] - 2.1, AT.one[2]]} dir={[-1, 0, 0]} len={2 * L} color={STRAND.new} opacity={0.85} thick={0.55} />
    </>}
  </group>
}
