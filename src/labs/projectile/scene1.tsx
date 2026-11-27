// 抛体运动 · 第 1 课的三维场景：消防车沿盘山路的两个弯开进山谷。车走过的路线画成一条白线；
// 在 A、B、C 三个标记点画出速度的方向（黄色箭头，沿切线）和不受力时会走的直线（虚线），再画出合力（粉色箭头）。
import { useMemo } from 'react'
import { ForceArrow, type Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { C, Dashed, Trail, type V3 } from './fx'
import { forceDirAt, MARKS, rad, roadAt, tangentAt, type MarkKey } from './physics'
import { FireTruck } from './props'
import { P } from './world'

/** 路的局部坐标 (x, 左手边 z) 换成这一处的局部三维坐标 */
const L = (x: number, z: number, y = 0): V3 => [x, y, -z]
const W = (p: V3) => toWorld(P.road, 0, p)
const UP = 6.2          // 箭头画在车顶上方
const BIG = 1.5         // 消防车画成实物的 1.5 倍（示意大小）
const SIDE = { A: '左弯', B: '直道', C: '右弯' } as const

export default function Scene1({ s, drawn, force }: { s: number; drawn: MarkKey[]; force: boolean }) {
  const p = roadAt(s)
  const path = useMemo(() => { const out: V3[] = []; for (let q = 0; q < s; q += 1.5) { const r = roadAt(q); out.push(L(r.x, r.z, 0.25)) } out.push(L(p.x, p.z, 0.25)); return out }, [s])   // eslint-disable-line react-hooks/exhaustive-deps
  const labels: Label[] = [
    ...MARKS.map(m => { const r = roadAt(m.s); return { id: `m${m.key}`, at: W(L(r.x, r.z + (m.key === 'B' ? 0 : -6) * (r.turn || 1), 0.4)), ax: 0.5, className: 'scene-tag', children: m.key } satisfies Label }),
    ...MARKS.filter(m => drawn.includes(m.key)).map(m => { const r = roadAt(m.s), [tx, tz] = tangentAt(m.s); return { id: `v${m.key}`, at: W(L(r.x + tx * 10.5, r.z + tz * 10.5, UP + 1)), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <span className="font-formula italic">v</span> } satisfies Label }),
    ...(force ? MARKS.map(m => { const r = roadAt(m.s), f = forceDirAt(m.s); return { id: `f${m.key}`, at: W(f ? L(r.x + f[0] * 8, r.z + f[1] * 8, UP) : L(r.x - 5.5, r.z, UP)), ax: 0.5, className: 'scene-tag -translate-y-1/2', children: f ? <><small>合力</small>指向内侧</> : <><small>合力</small>为零</> } satisfies Label }) : []),
    { id: 'n', at: W(L(p.x, p.z, 5.6)), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '水罐消防车（示意大小）' },
  ]
  return (
    <At at="road" labels={labels}>
      <Local origin={P.road}>
        <group position={L(p.x, p.z, 0.04)} rotation-y={rad(p.heading)} scale={BIG}><FireTruck lights /></group>
        {/* 车走过的路线 */}
        <Trail pts={path} r={0.13} opacity={0.85} />
        {/* 标记点：路面上一个圆点、路边一根桩 */}
        {MARKS.map(m => { const r = roadAt(m.s); return <group key={m.key} position={L(r.x, r.z, 0.07)}>
          <mesh rotation-x={-Math.PI / 2}><ringGeometry args={[1.2, 1.7, 40]} /><meshBasicMaterial color={SIDE[m.key] === '直道' ? '#ffffff' : '#ffd25a'} toneMapped={false} /></mesh>
        </group> })}
        {/* 速度：黄色箭头沿切线；虚线是“这一刻起不受力，会沿它直走” */}
        {MARKS.filter(m => drawn.includes(m.key)).map(m => { const r = roadAt(m.s), [tx, tz] = tangentAt(m.s), a = L(r.x, r.z, UP), tip = L(r.x + tx * 9, r.z + tz * 9, UP); return <group key={m.key}>
          <ForceArrow tip={tip} dir={[tx, 0, -tz]} len={9} color={C.v} thick={6.5} />
          <Dashed a={L(r.x - tx * 9, r.z - tz * 9, 0.3)} b={L(r.x + tx * 24, r.z + tz * 24, 0.3)} color={C.v} w={2.5} dash={1.1} opacity={0.85} />
          <mesh position={a}><sphereGeometry args={[0.35, 16, 12]} /><meshBasicMaterial color={C.v} toneMapped={false} depthTest={false} /></mesh>
        </group> })}
        {/* 合力：弯道上指向里侧，直道上没有 */}
        {force && MARKS.map(m => { const r = roadAt(m.s), f = forceDirAt(m.s); return f ? <ForceArrow key={m.key} tip={L(r.x + f[0] * 6.5, r.z + f[1] * 6.5, UP)} dir={[f[0], 0, -f[1]]} len={6.5} color={C.force} thick={6.5} /> : null })}
      </Local>
    </At>
  )
}
export const sideOf = (k: MarkKey) => SIDE[k]
