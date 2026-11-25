// 电功率和生活用电实验室的计算核对：这里的数字要和规格卡 docs/specs/power.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { DAY, JOULE, KITCHEN, R0, R1, amps, breakerTrips, dayBill, flashes, kitchenP, kwhOfFlashes, kwhToJ, lampAt, lampI, meterShow, monthKwh, penGlows, pForLampU, powerFromFlashes, powerUI, readA02, rise, round, shortI } from './physics'

describe('电功率和生活用电', () => {
  it('第 1 课：月初 3268.4，月末 3427.5，用了 159.1 kW·h', () => {
    expect(R0).toBe(3268.4); expect(R1()).toBeCloseTo(3427.5, 6); expect(monthKwh()).toBeCloseTo(159.1, 6)
    expect(meterShow(0)).toBeCloseTo(3268.4, 6)
  })
  it('第 1 课：159.1 kW·h 约 5.73×10⁸ J', () => { expect(kwhToJ(159.1) / 1e8).toBeCloseTo(5.73, 2) })
  it('第 2 课：1800 W 的电水壶 1 分钟闪 96 次，算回来是 1800 W', () => {
    expect(flashes(1800, 60)).toBe(96); expect(kwhOfFlashes(96)).toBeCloseTo(0.03, 9); expect(powerFromFlashes(96, 60)).toBeCloseTo(1800, 6)
  })
  it('第 2 课：900 W 的电饭煲 1 分钟闪 48 次', () => { expect(flashes(900, 60)).toBe(48); expect(powerFromFlashes(48, 60)).toBeCloseTo(900, 6) })
  it('第 3 课：2.5 V 0.30 A 0.75 W；2.0 V 0.26 A；3.0 V 0.34 A', () => {
    expect(readA02(lampI(2.5))).toBeCloseTo(0.3, 6); expect(powerUI(2.5, 0.3)).toBeCloseTo(0.75, 6)
    expect(readA02(lampI(2.0))).toBeCloseTo(0.26, 6); expect(powerUI(2.0, 0.26)).toBeCloseTo(0.52, 6)
    expect(readA02(lampI(3.0))).toBeCloseTo(0.34, 6); expect(powerUI(3.0, 0.34)).toBeCloseTo(1.02, 6)
  })
  it('第 3 课：滑片放到算出的位置，灯上正好是想要的电压', () => {
    for (const u of [2.0, 2.5, 3.0]) expect(lampAt(pForLampU(u) * 20).u).toBeCloseTo(u, 4)
  })
  it('第 4 课：1.0 A 2 分钟，5 Ω 升 2.9 ℃、10 Ω 升 5.7 ℃', () => {
    expect(round(rise(1, JOULE.r1, 120), 1)).toBe(2.9); expect(round(rise(1, JOULE.r2, 120), 1)).toBe(5.7)
  })
  it('第 4 课：时间加倍升温加倍，电流加倍升温变 4 倍', () => {
    expect(round(rise(1, 10, 240), 1)).toBe(11.4); expect(round(rise(2, 10, 120), 1)).toBe(22.9); expect(round(rise(2, 5, 120), 1)).toBe(11.4)
  })
  it('第 5 课：吸顶灯 0.16 A，电视 0.68 A，干路 0.85 A', () => {
    expect(round(amps(36), 2)).toBe(0.16); expect(round(amps(150), 2)).toBe(0.68); expect(round(amps(186), 2)).toBe(0.85)
  })
  it('第 6 课：只有手接触笔尾、笔尖接火线时氖管才亮', () => {
    expect(penGlows('right', true)).toBe(true); expect(penGlows('left', true)).toBe(false); expect(penGlows('right', false)).toBe(false)
  })
  it('第 7 课：两样 2700 W 12.3 A 不跳闸，三样 4700 W 21.4 A 跳闸；短路 440 A', () => {
    expect(kitchenP(2)).toBe(2700); expect(round(amps(kitchenP(2)), 1)).toBe(12.3); expect(breakerTrips(amps(kitchenP(2)))).toBe(false)
    expect(kitchenP(3)).toBe(4700); expect(round(amps(kitchenP(3)), 1)).toBe(21.4); expect(breakerTrips(amps(kitchenP(3)))).toBe(true)
    expect(shortI()).toBe(440); expect(KITCHEN.breaker).toBe(16)
  })
  it('拓展：一天 4.88 kW·h', () => { expect(dayBill()).toBeCloseTo(4.88, 6); expect(DAY.length).toBe(7) })
})
