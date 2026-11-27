// 导数 · 第 1 课的三维场景：平地上的起步点。停车线、去程车道上的蓝色小轿车、路北一块电子屏（s–t 图像），
// 路边一块雷达测速屏（第 2 课用）。车开到哪，屏上的点就描到哪。
import { useEffect, useMemo, type CSSProperties } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, type Label } from '@/lab-kit'
import At, { RoadCar } from './at'
import { axes, C, Curve, Dash, dataWorld, Dot, Line, Mounted, Panel, Seg, type Mount } from './graph'
import { canvas, NUM, FONT } from './mats'
import { avgRate, dist, fmt, RUN } from './physics'
import { EDGE, H, LANE, P, PAD, padY, R } from './terrain'

type V3 = [number, number, number]
export const M1: Mount = { origin: [P.s1[0], padY(PAD.s1), P.s1[1]], az: 0, w: 18, lift: 3.2 }
export const H1 = 10
export const A1 = axes({ xr: [0, 8], yr: [0, 64], xStep: 1, yStep: 8, minor: [0.5, 4], xName: 't / s', yName: 's / m', w: 18, h: 10, font: 0.6 })
/** 车身中点的世界 x：车头压着停车线出发 */
export const carX = (s: number) => P.start - 2.4 + s
export const tag = (color: string): CSSProperties => ({ boxShadow: `inset 4px 0 0 ${color}, 0 2px 8px rgb(0 0 0 / 0.25)` })

/** 停车线：横过去程车道的一道白线 */
export function StopLine() {
  const x = P.start
  return <mesh position={[x + 0.2, R(x) + 0.04, LANE]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.4, 3.4]} /><meshStandardMaterial color="#efefe9" roughness={0.6} /></mesh>
}

/** 雷达测速屏：立柱上一只箱子，上面写“您的车速”，下面一排红色的数码字。牌面朝来车，再往镜头偏一点 */
export function RadarSign({ value }: { value: string }) {
  const { g, t } = useMemo(() => { const { c, g } = canvas(512, 320); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { g, t } }, [])
  useEffect(() => {
    g.fillStyle = '#07090a'; g.fillRect(0, 0, 512, 320)
    g.fillStyle = '#f2f4f2'; g.font = `700 54px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('您的车速', 256, 56)
    g.fillStyle = '#2a0b08'; g.font = `700 150px ${NUM}`; g.fillText('88.8', 236, 196)
    g.fillStyle = '#ff4a2e'; g.shadowColor = '#ff4a2e'; g.shadowBlur = 18; g.fillText(value, 236, 196); g.shadowBlur = 0
    g.fillStyle = '#c9cfd2'; g.font = `600 34px ${NUM}`; g.fillText('km/h', 452, 270)
    t.needsUpdate = true
  }, [value, g, t])
  const x = P.radar, z = -(EDGE + 1.4), y = H(x, z)
  return (
    <group position={[x, y, z]} rotation-y={-Math.PI / 2 + 0.95}>
      <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.06, 0.07, 2.5, 16]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <RoundedBox args={[0.98, 0.7, 0.16]} radius={0.04} position={[0, 2.75, 0]} castShadow><meshStandardMaterial color="#e7e9e7" roughness={0.45} /></RoundedBox>
      <mesh position={[0, 2.75, 0.082]}><planeGeometry args={[0.86, 0.56]} /><meshBasicMaterial map={t} toneMapped={false} /></mesh>
      <mesh position={[0, 3.16, 0.06]} rotation-x={0.3}><boxGeometry args={[1.02, 0.03, 0.22]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    </group>
  )
}

/** t：现在开到第几秒；span：选中的时间段（画割线）；grow：割线画到哪（0 → 1） */
export default function Scene1({ t, span, grow }: { t: number; span: [number, number] | null; grow: number }) {
  const s = dist(t), x = carX(s)
  const labels: Label[] = [
    { id: 'car', at: [x, R(x) + 1.9, LANE], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>t</small>{t.toFixed(1)} s<small className="ml-2">s</small>{s.toFixed(1)} m</> },
    { id: 'n', at: [P.start - 12, R(P.start) + 0.5, LANE + 3.6], name: true, className: 'scene-name', children: '停车线 · 车从这里起步' },
  ]
  if (span && grow > 0.6) {
    const [a, b] = span, k = avgRate(dist, a, b)
    labels.push({ id: 'k', at: dataWorld(M1, [0, 0], A1, (a + b) / 2 - 0.4, (dist(a) + dist(b)) / 2 + 7), ax: 1, style: tag(C.secant), className: 'scene-tag key -translate-y-1/2', children: <><small>平均速度</small>{fmt(k)} m/s</> })
    labels.push({ id: 'dt', at: dataWorld(M1, [0, 0], A1, (a + b) / 2, dist(a) - 1.5), ax: 0.5, className: 'scene-tag', children: <>Δt = {fmt(b - a)} s</> })
    labels.push({ id: 'ds', at: dataWorld(M1, [0, 0], A1, b + 0.12, (dist(a) + dist(b)) / 2), className: 'scene-tag -translate-y-1/2', children: <>Δs = {fmt(dist(b) - dist(a))} m</> })
  }
  return (
    <At at="s1" labels={labels}>
      <StopLine />
      <RadarSign value=" " />
      <RoadCar x={x} />
      <Mounted M={M1} h={H1}>
        <Panel A={A1}>
          <Curve A={A1} f={dist} xr={[0, Math.max(1e-3, t)]} color={C.curve} width={0.13} />
          <Dot A={A1} x={t} y={s} color={C.curve} />
          {span && <SecantBits A={A1} a={span[0]} b={span[1]} grow={grow} />}
        </Panel>
      </Mounted>
    </At>
  )
}

/** 割线：先描出两个端点，再画出直角三角形的两条边（Δt、Δs），最后连成割线并往两头延长 */
function SecantBits({ A, a, b, grow }: { A: typeof A1; a: number; b: number; grow: number }) {
  const ya = dist(a), yb = dist(b), k = avgRate(dist, a, b), g1 = Math.min(1, grow / 0.4), g2 = Math.max(0, Math.min(1, (grow - 0.4) / 0.4))
  return (
    <group>
      <Dash A={A} p={[a, ya]} q={[a + (b - a) * g1, ya]} />
      {g1 >= 1 && <Dash A={A} p={[b, ya]} q={[b, ya + (yb - ya) * g2]} />}
      {grow > 0.8 && <>
        <Line A={A} k={k} b={ya - k * a} color={C.secant} width={0.07} opacity={0.55} />
        <Seg A={A} p={[a, ya]} q={[b, yb]} color={C.secant} width={0.14} />
      </>}
      <Dot A={A} x={a} y={ya} color={C.secant} r={0.19} />
      <Dot A={A} x={b} y={yb} color={C.secant} r={0.19} />
    </group>
  )
}
export type { V3 }
