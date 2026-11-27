// 一次函数 · 第 4 课的器材：服务区停车场边的大电子屏，屏上一个方格坐标系。正比例函数的图像在屏上画出来。
import type { Label } from '@/lab-kit'
import At from './at'
import { Board, GRID, boardPoint } from './board'
import { Dot, FnLine } from './graph'
import { formula, prop } from './physics'
import { P } from './world'

export const KCOL: Record<string, string> = { '1': '#5fd8ff', '2': '#ffd25a', '-1': '#ff8a5c' }
const AT = P.board4, FACE = -1 as const
/** k：正在画的那一条；p：画到哪了（0–1：先描两点，再从原点往两头连）；done：已经画好的 */
export default function Scene4({ k, p, done }: { k: number; p: number; done: number[] }) {
  const dots = Math.min(1, p * 3), grow = Math.max(0, (p - 0.3) / 0.7)
  const labels: Label[] = [
    ...done.map(d => ({ id: `f${d}`, at: boardPoint(GRID, AT, FACE, d > 0 ? 3.8 / d : -3.8, prop(d, d > 0 ? 3.8 / d : -3.8)), ax: d > 0 ? 1 : 0, className: `scene-tag ${d > 0 ? '-translate-x-2' : 'translate-x-2'} -translate-y-1/2`, children: formula(d, 0) })),
    ...(p > 0 ? [{ id: 'pt', at: boardPoint(GRID, AT, FACE, 1, prop(k, 1)), ax: 0, className: 'scene-tag key translate-x-4 -translate-y-1/2 transition-opacity', style: { opacity: dots }, children: `(1, ${String(prop(k, 1)).replace('-', '−')})` }] : []),
    { id: 'n', at: [AT[0], 1.2, AT[2] - 1.2], ax: 0.5, name: true, className: 'scene-name', children: '服务区电子屏' },
  ]
  return (
    <At at="board4" labels={labels}>
      <Board at={AT} face={FACE}>
        {done.filter(d => d !== k || p === 0).map(d => <FnLine key={d} A={GRID} k={d} b={0} color={KCOL[String(d)]} width={0.09} opacity={0.75} />)}
        {p > 0 && <>
          {grow > 0 && <FnLine A={GRID} k={k} b={0} color={KCOL[String(k)]} width={0.12} xr={[-5 * grow, 5 * grow]} />}
          <Dot A={GRID} x={0} y={0} r={0.16 * dots} color="#ffffff" ring={false} />
          <Dot A={GRID} x={1} y={prop(k, 1)} r={0.16 * dots} color={KCOL[String(k)]} />
        </>}
      </Board>
    </At>
  )
}
