// 圆锥曲线 · 第 3 课的三维场景：展厅楼前的坐标屏上，一个中心在原点、焦点在 x 轴上的椭圆。屏本身在 world.tsx 里。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { COL, Dot, Path, Seg, pt } from './graph'
import { A3, CHECK3, ecc, ellipseB, ellipsePoint, fmt, type P2 } from './physics'
import { AX3, F } from './world'

/** c：半焦距（过渡中）；marks：标出顶点和 a、b、c 的三角形；check：验点 (3, 3.2) */
export default function Scene3({ c, marks, check }: { c: number; marks: boolean; check: boolean }) {
  const b = ellipseB(A3, c), q = (x: number, y: number) => pt(AX3, x, y)
  const pts: P2[] = Array.from({ length: 181 }, (_, i) => q(...ellipsePoint(A3, b, i / 180 * Math.PI * 2)))
  const W = (x: number, y: number) => toWorld(F.screen, ...q(x, y), 0.06)
  const labels: Label[] = [
    { id: 'f1', at: W(-c, -0.28), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₁</span>(−{fmt(c)}, 0)</> },
    { id: 'f2', at: W(c, -0.28), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₂</span>({fmt(c)}, 0)</> },
    { id: 'e', at: W(-6.3, 5.0), className: 'scene-tag key -translate-y-1/2', children: <><small>离心率</small>e = c / a = {fmt(ecc(A3, c))}</> },
    ...(marks ? [
      { id: 'la', at: W(c / 2 + 0.15, b / 2 + 0.15), className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${COL.r2}` }, children: <>a = {A3}</> },
      { id: 'lb', at: W(-0.12, b * 0.55), ax: 1, className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${COL.r1}` }, children: <>b = {fmt(b)}</> },
      { id: 'lc', at: W(c / 2, 0.12), ax: 0.5, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${COL.focus}` }, children: <>c = {fmt(c)}</> },
    ] satisfies Label[] : []),
    ...(check ? [{ id: 'p', at: W(CHECK3[0] + 0.15, CHECK3[1] + 0.15), className: 'scene-tag -translate-y-full', children: <><small>P(3, 3.2)</small>9/25 + 10.24/16 = 1</> } satisfies Label] : []),
    { id: 'n', at: W(-6.4, -5.2), name: true, className: 'scene-name -translate-y-1/2', children: '坐标屏 · 每格 1 个单位' },
  ]
  return (
    <At at="screen" labels={labels}>
      <Local f={F.screen}>
        <Path pts={pts} closed width={0.05} />
        <Dot at={q(-c, 0)} color={COL.focus} /><Dot at={q(c, 0)} color={COL.focus} />
        {marks && <>
          {/* 四个顶点；以短轴端点、中心、焦点为顶点的直角三角形：斜边是 a */}
          {([[-A3, 0], [A3, 0], [0, b], [0, -b]] as P2[]).map(([x, y], i) => <Dot key={i} at={q(x, y)} color={COL.ink} r={0.05} />)}
          <Seg a={q(0, 0)} b={q(c, 0)} color={COL.focus} width={0.05} z={0.024} />
          <Seg a={q(0, 0)} b={q(0, b)} color={COL.r1} width={0.05} z={0.024} />
          <Seg a={q(c, 0)} b={q(0, b)} color={COL.r2} width={0.05} z={0.024} />
        </>}
        {check && <>
          <Seg a={q(CHECK3[0], 0)} b={q(...CHECK3)} dash={0.12} width={0.022} opacity={0.8} />
          <Seg a={q(0, CHECK3[1])} b={q(...CHECK3)} dash={0.12} width={0.022} opacity={0.8} />
          <Dot at={q(...CHECK3)} color="#ffffff" r={0.06} z={0.034} />
        </>}
      </Local>
    </At>
  )
}
