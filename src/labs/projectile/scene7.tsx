// 抛体运动 · 第 7 课的三维场景：山坡上有一处火点（离炮口水平 30 m、比炮口高 10 m）。水炮在坡脚，调仰角和水压去打它。
// 打过的每一炮留下一条细的轨迹线；落点上标出离炮口多远、多高。火点被水柱浇到就灭了。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { Blaze, C, Dashed, Jet, Smoke, Trail, Vel, type V3 } from './fx'
import { fly, fmt, HILL, landOn } from './physics'
import { BigMonitor } from './world'
import { MUZZLE } from './terrain'

const W = (p: V3) => toWorld(MUZZLE, 0, p)
const F = HILL.fire
export interface Shot7 { v0: number; angle: number }
const arc = (v0: number, a: number): V3[] => { const T = landOn(v0, a).t, out: V3[] = []; for (let i = 0; i <= 36; i++) { const s = fly(v0, a, T * i / 36); out.push([s.x, s.y, 0]) } return out }

export default function Scene7({ v0, angle, barrel, on, landed, shots, out }: { v0: number; angle: number; barrel: number; on: boolean; landed: boolean; shots: Shot7[]; out: boolean }) {
  const hit = landOn(v0, angle), s0 = fly(v0, barrel, 0)
  const labels: Label[] = [
    { id: 'fire', at: W([F.x - 3.5, F.y + 4.5, 0]), ax: 1, className: 'scene-tag -translate-y-full', children: <><small>火点</small>水平 {F.x} m · 高 {F.y} m</> },
    ...(landed ? [{ id: 'hit', at: W([hit.x, hit.y - 1.2, 2]), ax: 0.5, className: 'scene-tag key', children: <><small>落点</small>水平 {fmt(hit.x, 1)} m · 高 {fmt(hit.y, 1)} m</> } satisfies Label] : []),
    { id: 'n', at: W([-0.6, -HILL.muzzle - 0.2, 1.6]), ax: 0.5, name: true, className: 'scene-name', children: '拖车式水炮（示意大小）' },
  ]
  return (
    <At at="hill" labels={labels}>
      <Local origin={MUZZLE}>
        <BigMonitor angle={barrel} />
        <Jet v0={v0} angle={angle} T={hit.t} on={on} thick={3.4} n={560} seed={3} />
        {!on && <Vel at={[0, 0, 0.7]} vx={s0.vx} vy={s0.vy} k={0.24} thick={3.6} />}
        {/* 火点的位置：从炮口量，水平 30 m、高 10 m */}
        <Dashed a={[0, 0, 0]} b={[F.x, 0, 0]} color={C.vx} w={1.8} dash={0.5} opacity={0.6} />
        <Dashed a={[F.x, 0, 0]} b={[F.x, F.y, 0]} color={C.vy} w={1.8} dash={0.5} opacity={0.6} />
        {/* 打过的轨迹 */}
        {shots.map(s => <Trail key={`${s.v0}-${s.angle}`} pts={arc(s.v0, s.angle)} r={0.09} opacity={s.v0 === v0 && s.angle === angle ? 0.9 : 0.4} />)}
        {/* 火和烟：浇灭以后剩一股白汽 */}
        <Blaze at={[F.x, F.y - 0.4, 0]} w={4.2} h={7} spread={2.6} level={out ? 0 : 1} n={8} />
        <Smoke at={[F.x, F.y + 2.5, 0]} size={2.2} rise={16} level={out ? 0 : 1} n={40} />
        <Smoke at={[F.x, F.y + 0.5, 0]} size={1.8} rise={9} color="#f2f2f2" level={out ? 0.9 : 0} n={30} opacity={0.3} />
      </Local>
    </At>
  )
}
