// 圆锥曲线 · 第 4 课的三维场景：广场东头的坐标屏上画双曲线，屏后很远的地方是两座冷却塔。屏本身在 world.tsx 里。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { COL, Dot, Path, Seg, pt } from './graph'
import { fmt, focalRadii, hyperC, hyperPoint, type P2 } from './physics'
import { AX4, F } from './world'

const N = 120
/** a、b：过渡中；um：两支画到参数多大；t：描到哪里（0–1，前一半右支、后一半左支）；traced：描完过；asym：渐近线画了多少（0–1） */
export default function Scene4({ a, b, um, t, traced, asym }: { a: number; b: number; um: number; t: number; traced: boolean; asym: number }) {
  const c = hyperC(a, b), q = (x: number, y: number) => pt(AX4, x, y)
  const branch = (side: 1 | -1): P2[] => Array.from({ length: N + 1 }, (_, i) => q(...hyperPoint(a, b, side * (-um + 2 * um * i / N), side)))
  const live = t > 0 && t < 1, right = t <= 0.5
  const u = right ? -um + 2 * um * Math.min(1, t * 2) : um - 2 * um * (t * 2 - 1), p = hyperPoint(a, b, u, right ? 1 : -1), [r1, r2] = focalRadii(p, c)
  const W = (x: number, y: number) => toWorld(F.hyper, ...q(x, y), 0.06)
  const xm = Math.min(8.3, 6.4 * a / b), k = b / a
  const labels: Label[] = [
    { id: 'f1', at: W(-c, -0.3), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₁</span>(−{fmt(c)}, 0)</> },
    { id: 'f2', at: W(c, -0.3), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₂</span>({fmt(c)}, 0)</> },
    ...(live ? [{ id: 'd', at: W(p[0] + (right ? 0.3 : -0.3), p[1]), ax: right ? 0 : 1, className: 'scene-tag key -translate-y-1/2', children: <><small>|PF₁| − |PF₂|</small>{fmt(r1)} − {fmt(r2)} = {fmt(r1 - r2)}</> } satisfies Label] : []),
    ...(asym >= 1 ? [{ id: 'as', at: W(xm * 0.62, k * xm * 0.62 + 0.3), ax: 1.05, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${COL.asym}` }, children: <><small>渐近线</small><span className="font-formula italic">y</span> = ±{b > a ? '4/3' : '3/4'} <span className="font-formula italic">x</span></> } satisfies Label] : []),
    { id: 'n', at: W(-8.3, -6.3), name: true, className: 'scene-name -translate-y-1/2', children: '坐标屏 · 远处是两座冷却塔，侧面轮廓也是双曲线' },
  ]
  const fr = traced ? 1 : right ? t * 2 : 1, fl = traced ? 1 : right ? 0 : t * 2 - 1
  return (
    <At at="hyper" labels={labels}>
      <Local f={F.hyper}>
        {/* 还没描的时候是淡淡的两支，描过的地方变亮 */}
        <Path pts={branch(1)} width={0.03} opacity={0.45} z={0.016} /><Path pts={branch(-1)} width={0.03} opacity={0.45} z={0.016} />
        <Path pts={branch(1)} width={0.05} frac={fr} /><Path pts={branch(-1)} width={0.05} frac={fl} />
        <Dot at={q(-c, 0)} color={COL.focus} /><Dot at={q(c, 0)} color={COL.focus} />
        <Dot at={q(-a, 0)} color={COL.ink} r={0.045} /><Dot at={q(a, 0)} color={COL.ink} r={0.045} />
        {live && <>
          <Seg a={q(-c, 0)} b={q(...p)} color={COL.r1} width={0.035} z={0.026} />
          <Seg a={q(c, 0)} b={q(...p)} color={COL.r2} width={0.035} z={0.026} />
          <Dot at={q(...p)} color="#ffffff" r={0.06} z={0.034} />
        </>}
        {asym > 0 && <>
          {/* 以 2a、2b 为边的矩形，两条对角线延长出去就是渐近线 */}
          {([[[-a, -b], [a, -b]], [[a, -b], [a, b]], [[a, b], [-a, b]], [[-a, b], [-a, -b]]] as [P2, P2][]).map(([m, n], i) => <Seg key={i} a={q(...m)} b={q(...n)} color={COL.ghost} dash={0.1} width={0.02} opacity={Math.min(1, asym * 3)} />)}
          {[1, -1].map(s => <Seg key={s} a={q(-xm * asym, -s * k * xm * asym)} b={q(xm * asym, s * k * xm * asym)} color={COL.asym} dash={0.16} width={0.03} />)}
        </>}
      </Local>
    </At>
  )
}
