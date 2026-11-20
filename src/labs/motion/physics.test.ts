// 机械运动实验室的计算核对：这里的数字要和规格卡 docs/specs/motion.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { REPEATS, bridgeTime, bridgeTimeWrong, distance, gaps, mean, moving, part, rulerReading, speed, stopwatch, toKmh, toMs, tripSpeed } from './physics'

describe('机械运动', () => {
  it('第 1 课：做对了读 8.64 cm；没对齐零刻度读成 9.14 cm；斜着看读成 8.76 cm', () => { expect(rulerReading('good')).toBe(8.64); expect(rulerReading('shifted')).toBe(9.14); expect(rulerReading('slanted')).toBe(8.76) })
  it('第 2 课：96.5 秒在停表上是 1 分 36.5 秒', () => { expect(stopwatch(96.5)).toEqual({ min: 1, sec: 36.5 }); expect(stopwatch(6)).toEqual({ min: 0, sec: 6 }) })
  it('第 3 课：以站台为参照物我是静止的，以旁边开走的车为参照物我是运动的', () => { expect(moving('me', 'platform')).toBe(false); expect(moving('me', 'other')).toBe(true); expect(moving('other', 'mine')).toBe(true); expect(moving('platform', 'other')).toBe(true) })
  it('第 4 课：300 km/h 约 83.3 m/s，10 秒走约 833 m；72 km/h 是 20 m/s', () => { expect(toMs(300)).toBeCloseTo(83.33, 2); expect(distance('hsr', 10)).toBeCloseTo(833.3, 1); expect(toMs(72)).toBe(20); expect(toKmh(20)).toBe(72); expect(speed(200, 10)).toBe(20) })
  it('第 5 课：匀速时每秒都走 10 m；出站加速时每秒走 0.25、0.75、1.25、1.75 m', () => { expect(gaps('uniform', 4)).toEqual([10, 10, 10, 10]); expect(gaps('speeding', 4)).toEqual([0.25, 0.75, 1.25, 1.75]) })
  it('第 6 课：全程 0.30 m/s，上半段约 0.21 m/s，下半段约 0.51 m/s', () => { expect(part('whole').v).toBeCloseTo(0.3, 6); expect(part('upper').t).toBeCloseTo(2.12, 2); expect(part('upper').v).toBeCloseTo(0.212, 3); expect(part('lower').v).toBeCloseTo(0.512, 3) })
  it('第 7 课：300 km 走 1.5 小时是 200 km/h；过桥要 40 秒，只算桥长会错成约 33 秒', () => { expect(tripSpeed()).toBe(200); expect(bridgeTime()).toBe(40); expect(bridgeTimeWrong()).toBeCloseTo(33.3, 1) })
  it('拓展：四次测量 8.64、8.63、8.65、8.64 的平均值是 8.64 cm', () => { expect(mean(REPEATS)).toBe(8.64) })
})
