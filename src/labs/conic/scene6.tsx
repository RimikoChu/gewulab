// 圆锥曲线 · 第 6 课的三维场景：剖开的天线上，电波在截面里射到反射面再反射。平行于轴进来的都汇到焦点（馈源），
// 偏一个角度进来的汇不到一点；反过来从焦点发出的，反射后都平行于轴。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, COL, Dot, Path, Seg, Tip, pathLen, upto, type Axes } from './graph'
import { DISH, RAYS6, RAY_TILT, RAY_TOP, dishPath, dishRay, fmt, paraY, type P2 } from './physics'
import { F } from './world'

export type Mode = 'par' | 'tilt' | 'emit'
const DARK = '#0b1c26'
const p = DISH.p, FOCUS: P2 = [0, p / 2]
const AX6: Axes = { xr: [-7.4, 7.4], yr: [-1, 9.6], step: 1, s: 1, font: 0.3, pad: 0.35, light: true, xName: 'x / m', yName: 'y / m' }
function rays(mode: Mode): P2[][] {
  return RAYS6.map(x0 => {
    const r = dishRay(p, x0, mode === 'tilt' ? RAY_TILT : 0)
    if (mode === 'par') return [[x0, RAY_TOP], r.hit, FOCUS]
    if (mode === 'emit') return [FOCUS, r.hit, [x0, RAY_TOP]]
    const k = (RAY_TOP - r.hit[1]) / -r.dir[1], far = 8
    return [[r.hit[0] - r.dir[0] * k, RAY_TOP], r.hit, [r.hit[0] + r.out[0] * far, r.hit[1] + r.out[1] * far]]
  })
}
const para: P2[] = Array.from({ length: 81 }, (_, i) => { const x = -DISH.R + 2 * DISH.R * i / 80; return [x, paraY(p, x)] })

/** mode：现在放的是哪一种；t：走了多少（0–1） */
export default function Scene6({ mode, t }: { mode: Mode | null; t: number }) {
  const list = mode ? rays(mode) : [], L = Math.max(0, ...list.map(pathLen)), done = t >= 1
  const W = (a: number, b: number) => toWorld(F.dish, a, b, 0.1)
  const cross = mode === 'tilt' ? RAYS6.map(x0 => dishRay(p, x0, RAY_TILT).axisY as number) : []
  const labels: Label[] = [
    { id: 'f', at: W(0.5, p / 2 + 0.75), className: 'scene-tag key -translate-y-1/2', children: <><small>焦点</small>F(0, {fmt(p / 2)}) · 馈源</> },
    ...(mode === 'par' && done ? [{ id: 'r', at: W(0.6, 7.4), className: 'scene-tag -translate-y-1/2', children: <>六条电波同时到焦点 · 路程都是 {fmt(dishPath(p, 5, RAY_TOP))} m</> } satisfies Label] : []),
    ...(mode === 'tilt' && done ? [{ id: 'r', at: W(-1.2, (Math.min(...cross) + Math.max(...cross)) / 2), ax: 1, className: 'scene-tag -translate-y-1/2', children: <>偏了 {RAY_TILT}°：汇不到一点</> } satisfies Label] : []),
    ...(mode === 'emit' && done ? [{ id: 'r', at: W(0.6, 7.4), className: 'scene-tag -translate-y-1/2', children: <>反射后都平行于轴</> } satisfies Label] : []),
    { id: 'n', at: W(-7.2, -0.55), name: true, className: 'scene-name', children: '反射面的截面：抛物线 x² = 16y' },
  ]
  return (
    <At at="dish6" labels={labels} world={{ cut: true }} bloom={0.3}>
      <Local f={F.dish}>
        <group>
          <group position-z={-0.03}><AxesPlane A={AX6} glass /></group>
          <Path pts={para} color={DARK} width={0.18} opacity={0.6} z={0.026} />
          <Path pts={para} width={0.09} z={0.03} />
          <Seg a={[0, -0.6]} b={[0, RAY_TOP + 0.4]} color={COL.ghost} dash={0.4} width={0.04} opacity={0.75} />
          {mode !== 'emit' && mode !== null && <Seg a={list[0][0]} b={list[list.length - 1][0]} color={COL.ray} dash={0.3} width={0.035} opacity={0.5} />}
          {list.map((r, i) => { const u = upto(r, t * L); return <group key={`${mode}${i}`}>
            <Path pts={u.pts} color={DARK} width={0.16} opacity={0.6} z={0.044} />
            <Path pts={u.pts} color={COL.ray} width={0.075} z={0.05} />
            {t > 0.01 && pathLen(u.pts) < pathLen(r) - 0.02 && <Tip at={u.head} dir={u.dir} size={0.42} z={0.06} />}
            {done && <Tip at={[(r[0][0] + r[1][0]) / 2, (r[0][1] + r[1][1]) / 2]} dir={[r[1][0] - r[0][0], r[1][1] - r[0][1]]} size={0.36} z={0.06} />}
            {done && <Tip at={[(r[1][0] + r[2][0]) / 2, (r[1][1] + r[2][1]) / 2]} dir={[r[2][0] - r[1][0], r[2][1] - r[1][1]]} size={0.36} z={0.06} />}
          </group> })}
          {mode === 'tilt' && done && cross.map((y, i) => <Dot key={i} at={[0, y]} color="#ffffff" r={0.09} z={0.065} />)}
          <Dot at={FOCUS} color={COL.focus} r={0.19} z={0.07} />
        </group>
      </Local>
    </At>
  )
}
