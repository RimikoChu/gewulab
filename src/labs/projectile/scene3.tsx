// 抛体运动 · 第 3 课的三维场景：两架无人机在 19.6 m 高处同时放开灭火弹。左边一架悬停（弹自由下落），右边一架水平飞（弹平抛）。
// 两只弹之间连一条水平的虚线：任何时刻都一样高。频闪每 0.5 s 留一个残影：水平方向间隔相等，竖直方向和自由下落一模一样。
// 为了看得清，无人机和灭火弹都比实物画大了（规格卡里写明）。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { C, Dashed, Ghost, Trail, Vel, type V3 } from './fx'
import { DRONE, fallTime, flat, fmt, strobeTimes } from './physics'
import { Bomb, Drone } from './props'
import { P } from './world'

const W = (p: V3) => toWorld(P.drone, 0, p)
const H = DRONE.h, BX = -5, R = 0.7, DS = 3.4          // 悬停那一架在左边 5 m；灭火弹画的半径
const TIMES = strobeTimes(H, DRONE.strobe)

export default function Scene3({ v0, t, strobe }: { v0: number; t: number | null; strobe: boolean }) {
  const T = fallTime(H), tt = Math.min(t ?? 0, T), f = flat(v0, tt), y = Math.max(R, H - f.drop)
  const landed = t !== null && t >= T
  const curve: V3[] = []; for (let i = 0; i <= 24; i++) { const q = flat(v0, T * i / 24); curve.push([q.x, H - q.drop, 0]) }
  const partial: V3[] = []; for (let i = 0; i <= 24; i++) { const q = flat(v0, tt * i / 24); partial.push([q.x, H - q.drop, 0]) }
  const labels: Label[] = [
    { id: 'h', at: W([BX - 2.2, H / 2, 0]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>高</small>{H} m</> },
    ...(strobe ? TIMES.slice(1).map(s => { const q = flat(v0, s); return { id: `x${s}`, at: W([q.x, -0.5, 0]), ax: 0.5, className: 'scene-tag', children: s === TIMES[TIMES.length - 1] ? `${fmt(q.x, 1)} m` : fmt(q.x, 1) } satisfies Label }) : []),
    ...(strobe ? TIMES.slice(1, -1).map(s => { const q = flat(v0, s); return { id: `y${s}`, at: W([q.x + 1.1, H - q.drop, 0]), className: 'scene-tag -translate-y-1/2', children: <><small>{s} s</small>落 {fmt(q.drop, 1)} m</> } satisfies Label }) : []),
    ...(landed && !strobe ? [{ id: 'same', at: W([f.x / 2 + BX / 2, 1.6, 0]), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <>同时落地 · {fmt(T, 1)} s</> } satisfies Label] : []),
    { id: 'nA', at: W([BX, H + 2.6, 0]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '悬停：弹自由下落（示意大小）' },
    { id: 'nB', at: W([v0 * tt + 3, H + 2.6, 0]), ax: 0, name: true, className: 'scene-name -translate-y-full', children: `水平飞 ${v0} m/s：弹平抛` },
  ]
  return (
    <At at="drone" labels={labels}>
      <Local origin={P.drone}>
        {/* 两架无人机：左边悬停，右边一直以 v0 水平飞（所以它始终在自己那只弹的正上方） */}
        <group position={[BX, H + R + 0.14 * DS, 0]}><Drone scale={DS} /></group>
        <group position={[v0 * (t ?? 0), H + R + 0.14 * DS, 0]} rotation-z={-0.1}><Drone scale={DS} /></group>
        {/* 两只灭火弹 */}
        <group position={[BX, y, 0]}><Bomb r={R} color="#2f6fd6" /></group>
        <group position={[f.x, y, 0]}><Bomb r={R} /></group>
        {/* 任何时刻两只弹一样高 */}
        {t !== null && !landed && <Dashed a={[BX, y, 0]} b={[f.x, y, 0]} w={2.5} dash={0.4} opacity={0.9} />}
        {/* 平抛的轨迹 */}
        {t !== null && <Trail pts={strobe || landed ? curve : partial} r={0.07} opacity={0.85} />}
        {t !== null && <Trail pts={[[BX, H, 0], [BX, y, 0]]} r={0.07} opacity={0.6} />}
        {/* 飞行中的速度：水平分量不变，竖直分量越来越大 */}
        {t !== null && !landed && tt > 0.05 && <Vel at={[f.x, y, 0.1]} vx={f.vx} vy={-f.vy} k={0.22} thick={3} />}
        {/* 频闪 */}
        {strobe && TIMES.map(s => { const q = flat(v0, s), yy = Math.max(R, H - q.drop); return <group key={s}>
          <Ghost at={[q.x, yy, 0]} r={R} color="#ffb199" opacity={0.6} /><Ghost at={[BX, yy, 0]} r={R} color="#9fc0ff" opacity={0.6} />
          {s > 0 && <Dashed a={[BX, yy, 0]} b={[q.x, yy, 0]} color={C.vy} w={1.6} dash={0.35} opacity={0.75} />}
          {s > 0 && <Dashed a={[q.x, yy, 0]} b={[q.x, 0.05, 0]} color={C.vx} w={1.6} dash={0.35} opacity={0.75} />}
        </group> })}
        {/* 地面上的落点标记 */}
        {[BX, v0 * T].map(x => <mesh key={x} position={[x, 0.06, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.7, 0.95, 40]} /><meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.85} /></mesh>)}
      </Local>
    </At>
  )
}
