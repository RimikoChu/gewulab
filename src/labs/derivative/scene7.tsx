// 导数 · 第 7 课的三维场景：服务区便利店门口的不锈钢柜台。左边一只 330 mL 的易拉罐，换半径时连续变形（容积不变）；
// 右边一台小显示器画着用料 S(r) 的图像，当前半径处画一条切线：切线放平的地方，就是最省料的半径。
import type { Label } from '@/lab-kit'
import At from './at'
import { Can, Counter, Monitor } from './can'
import { axes, C, Curve, Dot, Line, Panel } from './graph'
import { canArea, canAreaD, canHeight, fmt } from './physics'
import { P } from './terrain'

const [SX, SZ] = P.shop
// 坐标系按 18 m 宽的大屏画好，再整体缩到 0.6 m 宽：线宽、离屏面的距离跟着一起缩
const A7 = axes({ xr: [1.5, 7], yr: [0, 500], xStep: 1, yStep: 100, minor: [0.5, 50], xName: 'r / cm', yName: 'S / cm²', w: 18, h: 12, font: 0.66 })
const K7 = 0.27 / 18
const TOP = 0.9
const CAN_AT: [number, number, number] = [SX + 0.1, TOP, SZ - 0.1]

/** r：罐子的半径（cm，过渡中的值） */
export default function Scene7({ r, best }: { r: number; best: boolean }) {
  const h = canHeight(r), k = canAreaD(r), s = canArea(r)
  // 镜头从公路一侧（−z）看柜台：世界的 +x 在画面左边，罐子在左、显示器在右
  const labels: Label[] = [
    { id: 'r', at: [CAN_AT[0] - r / 100 - 0.015, TOP + h / 200, CAN_AT[2]], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>r</small>{fmt(r, 2)} cm<small className="ml-2">h</small>{fmt(h, 2)} cm</> },
    { id: 's', at: [SX - 0.12, TOP + 0.32, SZ], ax: 0.5, style: { boxShadow: `inset 4px 0 0 ${best ? C.tangent : C.curve}` }, className: 'scene-tag key -translate-y-full', children: <><small>用料 S</small>{s.toFixed(1)} cm²</> },
    { id: 'n', at: [SX + 0.2, TOP + 0.01, SZ - 0.25], name: true, className: 'scene-name', children: '服务区便利店 · 罐子容积都是 330 mL' },
  ]
  return (
    <At at="shop" labels={labels} bloom={0.15}>
      <Counter position={[SX, 0, SZ]} />
      <Can r={r / 100} h={h / 100} position={CAN_AT} rotation-y={Math.PI + 0.5} />
      <Monitor w={A7.w * K7} h={A7.h * K7} position={[SX - 0.12, TOP, SZ + 0.02]} rotation-y={Math.PI}>
        <group scale={K7}><MonitorPanel r={r} k={k} s={s} /></group>
      </Monitor>
    </At>
  )
}

function MonitorPanel({ r, k, s }: { r: number; k: number; s: number }) {
  return (
    <group>
      <Panel A={A7} />
      <Curve A={A7} f={canArea} xr={[1.5, 7]} color={C.curve} width={0.14} />
      <Line A={A7} k={k} b={s - k * r} color={C.tangent} width={0.12} xr={[r - 1.2, r + 1.2]} />
      <Dot A={A7} x={r} y={s} color={C.dot} r={0.2} />
    </group>
  )
}
