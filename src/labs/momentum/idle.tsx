// 三张实验台上的器材静止时的样子：不在这一课时，大场景里照样摆着它们。
import type { ReactNode } from 'react'
import { AirTrack, Cradle, Egg, EggRig, Glider, padTop } from './bench'
import { BENCH_Z, COL, ST, TOP, type StKey } from './layout'
import { TRACK } from './physics'

export const IDLE: Record<StKey, () => ReactNode> = {
  egg: () => <group position={[ST.egg, TOP, BENCH_Z]}><EggRig pad={0.12} /><group position={[0, padTop(0.12), 0]}><Egg /></group></group>,
  track: () => <group position={[ST.track, TOP, BENCH_Z]}><AirTrack><group position-x={TRACK.startA}><Glider color={COL.A} /></group><group position-x={TRACK.restB}><Glider color={COL.B} /></group></AirTrack></group>,
  cradle: () => <group position={[ST.cradle, TOP, BENCH_Z]}><Cradle /></group>,
}
