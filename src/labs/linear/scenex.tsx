// 一次函数 · 拓展课的器材：出口路边的电子屏，旁边停着一辆出租车。屏上画出租车计价的分段图像，或摄氏度和华氏度的换算直线。
import type { Label } from '@/lab-kit'
import At from './at'
import { Board, boardPoint } from './board'
import { Sedan } from './car'
import { Dot, FnLine, Seg, type Axes } from './graph'
import { TAXI, TEMPS, taxi, toF } from './physics'
import { LANE, P } from './world'

export const TAXI_A: Axes = { xr: [0, 9], yr: [0, 24], xStep: 1, yStep: 4, minor: [0.5, 2], sx: 1.02, sy: 0.36, ox: 1.7, oy: 1.4, xName: '路程 x / km', yName: '车费 y / 元', font: 0.42, w: 12.4, h: 11.4 }
export const TEMP_A: Axes = { xr: [-20, 40], yr: [0, 110], xStep: 10, yStep: 10, minor: [5, 5], sx: 0.15, sy: 0.08, ox: 4.6, oy: 1.4, xName: '摄氏度 x / °C', yName: '华氏度 y / °F', font: 0.42, w: 12.4, h: 11.4 }
const AT = P.boardX, FACE = -1 as const
const TX = AT[0] + 10

/** topic：哪个专题；km：出租车走了多远；temp：换算画到哪了（0–1） */
export default function SceneX({ topic, km, temp }: { topic: 'taxi' | 'temp'; km: number; temp: number }) {
  const A = topic === 'taxi' ? TAXI_A : TEMP_A
  const shown = TEMPS.filter((_, i) => temp > i / 3.4)
  const labels: Label[] = topic === 'taxi' ? [
    ...(km > 0 ? [{ id: 'm', at: boardPoint(A, AT, FACE, km, taxi(km)), ax: 1, className: 'scene-tag key -translate-x-3 -translate-y-full', children: <><small>{km.toFixed(1)} km</small>{taxi(km).toFixed(0)} 元</> }] : []),
    ...(km >= TAXI.within ? [{ id: 's', at: boardPoint(A, AT, FACE, 1.5, TAXI.start), ax: 0.5, className: 'scene-tag -translate-y-full -translate-y-2', children: '起步价 10 元' }] : []),
    { id: 'n', at: [TX, 1.9, LANE.slow], ax: 0.5, name: true, className: 'scene-name', children: '出租车' },
  ] : [
    ...shown.map(c => ({ id: `t${c}`, at: boardPoint(A, AT, FACE, c, toF(c)), ax: 0, className: 'scene-tag translate-x-3 -translate-y-full', children: `${String(c).replace('-', '−')} °C = ${toF(c)} °F` })),
    ...(temp >= 1 ? [{ id: 'f', at: boardPoint(A, AT, FACE, 30, toF(30)), ax: 1, className: 'scene-tag key -translate-x-3 -translate-y-full', children: 'y = 1.8x + 32' }] : []),
  ]
  return (
    <At at="boardX" labels={labels}>
      <Board A={A} at={AT} face={FACE}>
        {topic === 'taxi' ? <>
          {km > 0 && <Seg A={A} p={[0, TAXI.start]} q={[Math.min(km, TAXI.within), TAXI.start]} color="#ffd25a" width={0.12} />}
          {km > TAXI.within && <Seg A={A} p={[TAXI.within, TAXI.start]} q={[km, taxi(km)]} color="#ffd25a" width={0.12} />}
          {km > 0 && <Dot A={A} x={km} y={taxi(km)} r={0.16} color="#ff8a5c" />}
        </> : <>
          {temp >= 1 && <FnLine A={A} k={1.8} b={32} color="#5fd8ff" width={0.1} />}
          {shown.map(c => <Dot key={c} A={A} x={c} y={toF(c)} r={0.17} />)}
        </>}
      </Board>
      <Sedan position={[TX, 0, LANE.slow]} rotation-y={Math.PI} color="#2f8f6a" taxi />
    </At>
  )
}
