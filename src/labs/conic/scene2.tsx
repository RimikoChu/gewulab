// 圆锥曲线 · 第 2 课的三维场景：大画板上钉两颗钉子，一根细绳两头拴在钉子上，手拿粉笔铅笔把绳子绷紧，贴着绳子走一圈。
// 画板在 world.tsx 里；这里是钉子、绳子、笔、手和画出来的线。板面上 1 dm 画成 0.24 m。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { COL, Path } from './graph'
import { GloveAt, Nail, Pencil, Twine } from './parts'
import { ellipseB, ellipsePoint, fmt, focalRadii, STRING, type P2 } from './physics'
import { F, SLATE } from './world'

const U = SLATE.cell, A = STRING / 2
const curve = (c: number, n = 240): P2[] => Array.from({ length: n + 1 }, (_, i) => { const [x, y] = ellipsePoint(A, ellipseB(A, c), START + i / n * Math.PI * 2); return [x * U, y * U] })
export const START = 0.7

/** c：半钉距（dm，过渡中）；t：这一圈画了多少（0–1）；ghosts：以前画好的几条（半钉距） */
export default function Scene2({ c, t, ghosts }: { c: number; t: number; ghosts: number[] }) {
  const b = ellipseB(A, c), p = ellipsePoint(A, b, START + t * Math.PI * 2), [r1, r2] = focalRadii(p, c)
  const P: [number, number, number] = [p[0] * U, p[1] * U, 0.085], F1: [number, number, number] = [-c * U, 0, 0.085], F2: [number, number, number] = [c * U, 0, 0.085]
  const W = (x: number, y: number, z = 0.1) => toWorld(F.easel, x * U, y * U, z)
  const labels: Label[] = [
    { id: 'f1', at: W(-c, -0.35), ax: c < 0.3 ? 1.1 : 0.5, className: 'scene-tag', children: <span className="font-formula italic">F₁</span> },
    { id: 'f2', at: W(c, -0.35), ax: c < 0.3 ? -0.1 : 0.5, className: 'scene-tag', children: <span className="font-formula italic">F₂</span> },
    { id: 'r1', at: W((p[0] - c) / 2, p[1] / 2), ax: 1.1, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${COL.r1}` }, children: <>{fmt(r1)}</> },
    { id: 'r2', at: W((p[0] + c) / 2, p[1] / 2), ax: -0.1, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${COL.r2}` }, children: <>{fmt(r2)}</> },
    { id: 'sum', at: W(0, 5.55), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>两段绳长的和</small>{fmt(r1)} + {fmt(r2)} = {fmt(r1 + r2)} dm</> },
    { id: 'n', at: W(-7.2, -5.2), name: true, className: 'scene-name -translate-y-1/2', children: '大画板 · 每格 1 dm' },
  ]
  return (
    <At at="easel" labels={labels}>
      <Local f={F.easel}>
        {ghosts.map(g => <Path key={g} pts={curve(g)} closed color={COL.curve} width={0.022} opacity={0.42} z={0.004} />)}
        <Path pts={curve(c)} color={COL.curve} width={0.034} frac={t} z={0.006} />
        <group position={[F1[0], 0, 0]}><Nail /></group>
        {c > 0.02 && <group position={[F2[0], 0, 0]}><Nail /></group>}
        <Twine a={F1} b={P} /><Twine a={F2} b={P} />
        {/* 两段绳各描一道颜色，和读数对上 */}
        <group position-z={0.012}><Path pts={[[F1[0], 0], [P[0], P[1]]]} color={COL.r1} width={0.012} opacity={0.9} /><Path pts={[[F2[0], 0], [P[0], P[1]]]} color={COL.r2} width={0.012} opacity={0.9} /></group>
        {/* 笔尖顶在板上，笔杆朝右下方斜出来；手从右下方握着，手背朝外 */}
        <group position={[P[0], P[1], 0.004]}>
          <group rotation={[2.55, 0, -0.6]}><Pencil len={0.42} /></group>
          <GloveAt at={[0.16, -0.19, 0.24]} arm={[0.6, -0.7, 0.3]} back={[0.25, 0.3, 0.92]} scale={2.1} />
        </group>
      </Local>
    </At>
  )
}
