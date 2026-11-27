// 圆锥曲线 · 第 5 课的三维场景：天线朝镜头剖开一半，截面上立一块浅色半透明的坐标平面（只有网格和轴线），原点在反射面的顶点，1 个单位 = 1 m。
// 截面的轮廓就是抛物线 x² = 16y，馈源在焦点上；顶点下方 4 m 处画出准线。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, COL, Dot, Path, Seg, type Axes } from './graph'
import { DISH, fmt, paraDirDist, paraFocalDist, paraY, type P2 } from './physics'
import { F } from './world'

const AX5: Axes = { xr: [-7.4, 7.4], yr: [-5, 6], step: 1, s: 1, font: 0.3, pad: 0.35, light: true, xName: 'x / m', yName: 'y / m' }
const DARK = '#0b1c26'
const para = (p: number, xm: number): P2[] => Array.from({ length: 121 }, (_, i) => { const x = -xm + 2 * xm * i / 120; return [x, paraY(p, x)] })
/** x：量的那个点的横坐标（过渡中）；measuring：正在量；other：另一条用来比较的抛物线的 p（不比较时为 null） */
export default function Scene5({ x, measuring, other }: { x: number; measuring: boolean; other: number | null }) {
  const p = DISH.p, P: P2 = [x, paraY(p, x)], W = (a: number, b: number) => toWorld(F.dish, a, b, 0.1)
  const labels: Label[] = [
    { id: 'f', at: W(0.25, p / 2 + 0.2), className: 'scene-tag key -translate-y-full', children: <><small>焦点</small>F(0, {fmt(p / 2)})</> },
    { id: 'l', at: W(-7.2, -p / 2 - 0.15), className: 'scene-tag', style: { borderLeft: `4px solid ${COL.directrix}` }, children: <><small>准线</small>y = −{fmt(p / 2)}</> },
    ...(measuring ? [
      { id: 'd1', at: W(P[0] / 2 + 0.12, (P[1] + p / 2) / 2 + 0.1), className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${COL.r1}` }, children: <><small>到焦点</small>{fmt(paraFocalDist(p, x))} m</> },
      { id: 'd2', at: W(P[0] - 0.15, (P[1] - p / 2) / 2 - 0.4), ax: 1, className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${COL.r2}` }, children: <><small>到准线</small>{fmt(paraDirDist(p, x))} m</> },
    ] satisfies Label[] : []),
    ...(other ? [
      { id: 'f2', at: W(-0.25, other / 2), ax: 1, className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${COL.asym}` }, children: <><small>p = {other}</small>焦点 (0, {fmt(other / 2)})</> },
      { id: 'e2', at: W(-5.1, 3.9), ax: 1.05, className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${COL.asym}` }, children: <span className="font-formula italic">x² = {2 * other}y</span> },
    ] satisfies Label[] : []),
    { id: 'eq', at: W(6.1, paraY(p, 6.1) + 0.3), className: 'scene-tag -translate-y-full', children: <span className="font-formula italic">x² = {2 * p}y</span> },
    { id: 'n', at: W(2.2, -2.3), name: true, className: 'scene-name -translate-y-1/2', children: '抛物面天线（剖开一半）· 口径 12 m' },
  ]
  return (
    <At at="dish5" labels={labels} world={{ cut: true }}>
      <Local f={F.dish}>
        <group>
          {/* 平面就立在剖面上（略靠后一点，不和剖面抢深度）；前面的支臂照常挡住它。线底下垫一道深色，衬在天空和面板上也看得清 */}
          <group position-z={-0.03}><AxesPlane A={AX5} glass /></group>
          <Path pts={para(p, 7.4)} width={0.06} opacity={0.45} z={0.03} />
          <Path pts={para(p, DISH.R)} color={DARK} width={0.2} opacity={0.6} z={0.034} />
          <Path pts={para(p, DISH.R)} width={0.11} z={0.04} />
          <Seg a={[-7.4, -p / 2]} b={[7.4, -p / 2]} color={DARK} width={0.17} z={0.034} opacity={0.6} />
          <Seg a={[-7.4, -p / 2]} b={[7.4, -p / 2]} color={COL.directrix} width={0.09} z={0.04} />
          <Dot at={[0, p / 2]} color={COL.focus} r={0.2} z={0.06} />
          {other && <>
            <Path pts={para(other, 6.9)} color={COL.asym} width={0.08} z={0.035} />
            <Seg a={[-7.4, -other / 2]} b={[7.4, -other / 2]} color={COL.asym} dash={0.5} width={0.06} z={0.035} />
            <Dot at={[0, other / 2]} color={COL.asym} r={0.16} z={0.055} />
          </>}
          {measuring && <>
            <Seg a={[0, p / 2]} b={P} color={DARK} width={0.17} z={0.046} opacity={0.6} />
            <Seg a={P} b={[P[0], -p / 2]} color={DARK} width={0.17} z={0.046} opacity={0.6} />
            <Seg a={[0, p / 2]} b={P} color={COL.r1} width={0.09} z={0.05} />
            <Seg a={P} b={[P[0], -p / 2]} color={COL.r2} width={0.09} z={0.05} />
            <Dot at={[P[0], -p / 2]} color={COL.directrix} r={0.12} z={0.06} />
            <Dot at={P} color="#ffffff" r={0.17} z={0.07} />
          </>}
        </group>
      </Local>
    </At>
  )
}
