// 化验台上每一格的称量装置：一台托盘天平、一只砝码盒，以及“把装置放上左盘 → 夹砝码、拨游码到平衡 → 反应后再看指针”的状态。
// 第 1、2、3 课和拓展 1 共用。反应前称好以后砝码就不再动：反应后平不平衡，只看左盘里的东西变没变。
import { useRef, useState } from 'react'
import { Balance, WeightSet, panAt, useScale } from './balance'
import { newLive, useLag, useSettled, type Live, type V3 } from './parts'
import { g1, pointer, tilt } from './physics'

/** 一格台面上：天平底座的位置、砝码盒的位置，以及装置不在天平上时放在哪 */
export interface Bench { base: V3; box: V3; rest: V3 }
export const bench = (x0: number, y: number, z: number, rest: [number, number] = [-1.6, -0.38]): Bench => ({ base: [x0 - 0.15, y, z], box: [x0 + 1.05, y, z + 0.75], rest: [x0 + rest[0], y, z + rest[1]] })

/**
 * 称量的状态。mass：左盘上那件装置此刻的质量（反应前后会变）。
 * put(true) 把装置放上左盘；weigh() 按此刻的质量夹砝码、拨游码（反应前称一次）；clear() 全部收回。
 */
export function useRig(mass: number) {
  const live = useRef<Live>(newLive())
  const [on, setOn] = useState(false)
  const [target, setTarget] = useState<number | null>(null)
  const [kick, setKick] = useState(0)
  const [snap, setSnap] = useState(0)
  const sc = useScale(target, 1700)
  const landed = useLag(on, 1300)
  const left = on && landed ? mass : 0
  const sig = `${on}|${landed}|${sc.on.join()}|${sc.rider.toFixed(2)}|${mass.toFixed(3)}`
  const still = useSettled(sig, 2000)
  return {
    live, on, landed, target, kick, snap, sc, left, right: sc.right,
    /** 装置放在天平上、砝码到位、天平停稳了 */
    steady: on && landed && still && (target == null || sc.done),
    /** 指针停在哪 */
    ptr: pointer(left, sc.right), tilt: tilt(left, sc.right),
    put: (v: boolean) => { setOn(v); setKick(k => k + 1) },
    weigh: () => setTarget(Math.round(mass * 10) / 10),
    clear: () => { setOn(false); setTarget(null); setSnap(s => s + 1) },
  }
}
export type Rig = ReturnType<typeof useRig>

/** 天平和砝码盒 */
export function BenchKit({ b, rig }: { b: Bench; rig: Rig }) {
  return <>
    <Balance at={b.base} left={rig.left} right={rig.right} rider={rig.sc.rider} live={rig.live} kick={rig.kick} />
    <WeightSet box={b.box} base={b.base} on={rig.sc.on} live={rig.live} snap={rig.snap} />
  </>
}
/** 左盘上装置的位置（盘的内底） */
export const leftPan = (b: Bench) => panAt(b.base, -1)
/** 分度盘上方读数标签的位置 */
export const dialAt = (b: Bench): V3 => [b.base[0] + 0.25, b.base[1] + 1.36, b.base[2]]
/** 指针的说法 */
export const PTR = { mid: '指针指在分度盘正中', left: '指针偏左：左盘重了', right: '指针偏右：左盘轻了' } as const
export { g1 }
