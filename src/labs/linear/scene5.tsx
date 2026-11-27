// 一次函数 · 第 5 课的器材：收费站广场边的电子屏。屏上一条直线 y = kx + b，换 b 它上下平移，换 k 它绕着和 y 轴的交点转。
import type { Label } from '@/lab-kit'
import At from './at'
import { Board, GRID, boardPoint } from './board'
import { Dot, FnLine } from './graph'
import { clip, formula } from './physics'
import { P } from './world'

const AT = P.board5, FACE = 1 as const
/** k、b：正在过渡中的值；kk、bb：目标值（标签只写整数）；trail：走过的几条线，淡淡地留在屏上 */
export default function Scene5({ k, b, kk, bb, trail }: { k: number; b: number; kk: number; bb: number; trail: [number, number][] }) {
  const seg = clip(k, b, GRID.xr, GRID.yr)
  const end = seg ? (k > 0 ? seg[1] : seg[0]) : [0, 0]
  const settled = Math.abs(k - kk) < 1e-3 && Math.abs(b - bb) < 1e-3
  const labels: Label[] = [
    { id: 'f', at: boardPoint(GRID, AT, FACE, end[0] * 0.86, end[1] * 0.86 + 0.05 * Math.sign(k)), ax: k > 0 ? 1 : 0, className: `scene-tag ${k > 0 ? '-translate-x-3' : 'translate-x-3'} -translate-y-1/2`, children: settled ? formula(kk, bb) : '…' },
    { id: 'b', at: boardPoint(GRID, AT, FACE, 0, b), ax: 0, className: 'scene-tag key translate-x-4 -translate-y-1/2', children: settled ? `(0, ${String(bb).replace('-', '−')})` : '' },
    { id: 'n', at: [AT[0], 1.2, AT[2] + 1.2], ax: 0.5, name: true, className: 'scene-name', children: '收费站电子屏' },
  ]
  return (
    <At at="board5" labels={labels}>
      <Board at={AT} face={FACE}>
        {trail.map(([tk, tb]) => <FnLine key={`${tk},${tb}`} A={GRID} k={tk} b={tb} color="#9fc6d6" width={0.07} opacity={0.4} />)}
        <FnLine A={GRID} k={k} b={b} color="#ffd25a" width={0.13} />
        <Dot A={GRID} x={0} y={b} r={0.17} color="#35c7b3" />
      </Board>
    </At>
  )
}
