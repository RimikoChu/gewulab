// 抛体运动 · 第 5 课的三维场景：消防直升机以 20 m/s 水平飞过空投场，把物资箱投向地上的靶环。
// 坐标原点在靶心，直升机从左往右飞。箱子离开飞机以后做平抛：水平方向接着以 20 m/s 往前走，所以要提前投。
// 落地以后可以看落地速度：水平分量（青）、竖直分量（橙红）、合速度（黄）。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { Dashed, Ghost, Trail, Vel, type V3 } from './fx'
import { airdrop, flat, fmt, HELI } from './physics'
import { Crate, Helicopter } from './props'
import { P } from './world'

const W = (p: V3) => toWorld(P.heli, 0, p)
export const LEAD_IN = 0.8          // 投放前直升机先飞的时间（s）
const BOX = 2.4                     // 物资箱画的大小（比实物大，为了看得清）
const HS = 1.7                      // 直升机画成实物的 1.7 倍（示意大小）

/** 地上的距离桩：一根矮桩加一面小旗 */
function Stake({ x, color }: { x: number; color: string }) {
  return <group position={[x, 0, 3.2]}>
    <mesh position-y={0.9}><cylinderGeometry args={[0.06, 0.06, 1.8, 10]} /><meshStandardMaterial color="#e9e6dc" roughness={0.6} /></mesh>
    <mesh position={[0.5, 1.5, 0]}><boxGeometry args={[1.0, 0.6, 0.03]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
  </group>
}

export default function Scene5({ h, lead, t, showV, result }: { h: number; lead: number | null; t: number | null; showV: boolean; result: number | null }) {
  const d = airdrop(h), v0 = HELI.v0
  const L = lead ?? HELI.leads[0]
  const tf = t === null ? null : t - LEAD_IN                    // 投放后的时间（负：还没投）
  const heliX = t === null ? -L - v0 * LEAD_IN : -L + v0 * (tf as number)
  const fall = tf !== null && tf > 0 ? flat(v0, Math.min(tf, d.t)) : null
  const landed = tf !== null && tf >= d.t
  const cx = fall ? -L + fall.x : heliX
  // 箱子挂在机腹下 2.3 m；下落的高度按 h 算（挂点的高差画面上看不出来）
  const y = fall ? Math.max(BOX * 0.4, h - fall.drop) : h - 2.6
  const trail: V3[] = []; if (fall) for (let i = 0; i <= 24; i++) { const q = flat(v0, Math.min(tf as number, d.t) * i / 24); trail.push([-L + q.x, Math.max(BOX * 0.4, h - q.drop), 0]) }
  const labels: Label[] = [
    { id: 'h', at: W([heliX - 1, h + 6.4, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>高 {fmt(h, 1)} m</small>{v0} m/s</> },
    ...HELI.leads.map(x => ({ id: `l${x}`, at: W([-x, 2.6, 3.2]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>提前</small>{x} m</> } satisfies Label)),
    { id: 'tar', at: W([0, 0.4, 7.5]), ax: 0.5, className: 'scene-tag', children: '目标' },
    { id: 'nh', at: W([heliX - 1, h - 3.6, 0]), ax: 0.5, name: true, className: 'scene-name', children: '消防直升机（示意大小）' },
    ...(landed && result !== null && !showV ? [{ id: 'res', at: W([cx, 3.4, 0]), ax: 0.5, className: 'scene-tag key -translate-y-full', children: Math.abs(result) < 0.01 ? '正中目标' : result > 0 ? `越过目标 ${fmt(result, 0)} m` : `离目标还差 ${fmt(-result, 0)} m` } satisfies Label] : []),
    ...(landed && showV ? [{ id: 'vv', at: W([cx - d.vx * 0.2 - 1.5, y + d.vy * 0.2, 0]), ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>落地速度</small>{fmt(d.v, 1)} m/s</> } satisfies Label] : []),
  ]
  return (
    <At at="heli" labels={labels}>
      <Local origin={P.heli}>
        <group position={[heliX, h + 1.5, 0]} rotation-z={-0.07} scale={HS}><Helicopter /></group>
        <group position={[cx, y, 0]} rotation-z={fall && !landed ? -(tf as number) * 0.5 : 0}><Crate s={BOX} /></group>
        {/* 投放点正下方的竖线，和到目标的水平距离 */}
        {HELI.leads.map(x => <group key={x}><Stake x={-x} color={x === L && lead !== null ? '#ffd25a' : '#e8651c'} /></group>)}
        {lead !== null && <Dashed a={[-L, h, 0]} b={[-L, 0.1, 0]} w={2} dash={1.2} opacity={0.7} />}
        {/* 平抛的轨迹，每 0.5 s 一个残影 */}
        {trail.length > 1 && <Trail pts={trail} r={0.2} />}
        {fall && Array.from({ length: Math.floor(Math.min(tf as number, d.t) / 0.5) + 1 }, (_, i) => { const q = flat(v0, i * 0.5); return <Ghost key={i} at={[-L + q.x, Math.max(0.6, h - q.drop), 0]} r={0.8} /> })}
        {/* 飞行中的速度 */}
        {fall && !landed && <Vel at={[cx, y, 0.2]} vx={fall.vx} vy={-fall.vy} k={0.36} thick={5} />}
        {/* 落地速度 */}
        {landed && showV && <Vel at={[cx - d.vx * 0.36, y + 0.5 + d.vy * 0.36, 0.2]} vx={d.vx} vy={-d.vy} k={0.36} thick={5} />}
      </Local>
    </At>
  )
}
