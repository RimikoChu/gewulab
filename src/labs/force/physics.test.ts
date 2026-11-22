// 力和运动实验室的计算核对：这里的数字要和规格卡 docs/specs/force.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { CASES, CONDS, G, SPRING_K, balanced, cardAccel, cartAt, cartDist, cartEnd, comboShove, crashSlide, crashSpeed, dragAt, friction, hooks, jerkEnd, overRange, pressure, pull, rampSpeed, rampTime, ratio, resultant, rolling, runTime, sameShove, scaleReads, shoveAt, stoneEnd, stoneShove, stoneSpin, stretchCm, sweepDist, tipSquash, twistAt, type Case7 } from './physics'

describe('力和运动', () => {
  it('第 1 课：轻推 20 N，松手时 0.40 m/s，一共滑 0.51 m', () => { const s = stoneShove('light'); expect(s.v).toBeCloseTo(0.402, 3); expect(s.total).toBeCloseTo(0.513, 3) })
  it('第 1 课：重推 40 N，松手时 0.90 m/s，一共滑 2.30 m', () => { const s = stoneShove('heavy'); expect(s.v).toBeCloseTo(0.902, 3); expect(s.total).toBeCloseTo(2.301, 3) })
  it('第 1 课：反向推，冰壶向后滑同样远；推边上，滑得一样远还转了将近一圈', () => {
    expect(stoneEnd('back')).toBeCloseTo(-0.513, 3); expect(stoneEnd('side')).toBeCloseTo(0.513, 3)
    expect(stoneSpin('side', 99) * 180 / Math.PI).toBeGreaterThan(330); expect(stoneSpin('side', 99) * 180 / Math.PI).toBeLessThan(360); expect(stoneSpin('light', 99)).toBe(0)
  })
  it('第 1 课：停下的位置和逐时刻算出来的位置一致；海绵头 20 N 压扁 2 cm', () => { const s = stoneShove('heavy'); expect(shoveAt(s, s.tEnd).x).toBeCloseTo(s.total, 9); expect(shoveAt(s, s.tEnd + 5).v).toBeCloseTo(0, 9); expect(tipSquash(20)).toBeCloseTo(0.02, 9) })
  it('第 2 课：1、2、3、4 N 时弹簧伸长 3、6、9、12 cm', () => { expect([1, 2, 3, 4].map(stretchCm)).toEqual([3, 6, 9, 12]); expect(SPRING_K).toBeCloseTo(33.33, 2) })
  it('第 2 课：没调零时多读 0.2 N；超过 5 N 就超量程', () => { expect(scaleReads(1, 0.2)).toBe(1.2); expect(scaleReads(1)).toBe(1); expect(overRange(5)).toBe(false); expect(overRange(6)).toBe(true) })
  it('第 3 课：50、100、150、200 g 的钩码重 0.49、0.98、1.47、1.96 N', () => { expect([1, 2, 3, 4].map(n => hooks(n).G)).toEqual([0.49, 0.98, 1.47, 1.96]); expect(hooks(4).m).toBe(0.2) })
  it('第 3 课：重力和质量的比值都是 9.8 N/kg', () => { for (const n of [1, 2, 3, 4]) expect(ratio(hooks(n).G, hooks(n).m)).toBe(G) })
  it('第 4 课：到斜面底端 0.99 m/s，用时 0.61 s', () => { expect(rampSpeed()).toBeCloseTo(0.99, 2); expect(rampTime()).toBeCloseTo(0.606, 3) })
  it('第 4 课：毛巾 0.20 m、棉布 0.40 m、木板 0.80 m；没有阻力就不会停', () => {
    expect(cartDist('towel')).toBeCloseTo(0.2, 9); expect(cartDist('cotton')).toBeCloseTo(0.4, 9); expect(cartDist('wood')).toBeCloseTo(0.8, 9); expect(cartDist('none')).toBe(Infinity)
    expect(cartAt('wood', cartEnd('wood')).flat).toBeCloseTo(0.8, 9); expect(cartAt('none', 1.2).v).toBeCloseTo(rampSpeed(), 9)
  })
  it('第 5 课：猛拉雪橇走 0.50 m，木箱只走 0.19 m，在板面上向后落下 0.31 m', () => { const e = jerkEnd(); expect(e.sled).toBeCloseTo(0.5, 2); expect(e.box).toBeCloseTo(0.194, 2); expect(e.lag).toBeCloseTo(0.306, 2) })
  it('第 5 课：以 1.0 m/s 撞上挡板，木箱向前滑 0.51 m', () => { expect(crashSpeed()).toBeCloseTo(1, 9); expect(crashSlide()).toBeCloseTo(0.51, 2) })
  it('第 5 课：同样 60 N 推 0.5 s，20 kg 的到 1.26 m/s，60 kg 的只到 0.26 m/s', () => {
    expect(sameShove('light').v).toBeCloseTo(1.255, 3); expect(sameShove('heavy').v).toBeCloseTo(0.255, 3)
    expect(sameShove('light').total).toBeCloseTo(1.92, 2); expect(sameShove('heavy').total).toBeCloseTo(0.13, 2)
  })
  it('第 6 课：两边各两只钩码，拉力都是 0.98 N；四个条件缺一个就不平衡', () => {
    expect(pull(2)).toBe(0.98); expect(pull(1)).toBe(0.49)
    expect(balanced(CONDS.equal)).toEqual({ ok: true, lack: null }); expect(balanced(CONDS.unequal).lack).toBe('大小相等'); expect(balanced(CONDS.twist).lack).toBe('同一直线'); expect(balanced(CONDS.cut).lack).toBe('同一物体')
  })
  it('第 6 课：左 2 右 1 时加速度约 3.27 m/s²，0.25 s 滑完 10 cm；扭转后最终回到一条直线上', () => { expect(cardAccel(2, 1)).toBeCloseTo(3.267, 3); expect(runTime(0.1, cardAccel(2, 1))).toBeCloseTo(0.247, 3); expect(cardAccel(2, 2)).toBe(0); expect(twistAt(40, 0)).toBe(40); expect(twistAt(40, 9)).toBe(0) })
  it('第 7 课：四种情况的摩擦力是 0.59、1.18、0.98、0.59 N', () => {
    expect((Object.keys(CASES) as Case7[]).map(friction)).toEqual([0.588, 1.176, 0.98, 0.588]); expect(pressure('base')).toBe(1.96); expect(pressure('load')).toBe(3.92)
  })
  it('第 7 课：匀速拉动时示数等于摩擦力；弹簧先伸长，木块后动', () => { const f = friction('base'); expect(dragAt(f, 3).F).toBe(f); expect(dragAt(f, 0.1).block).toBe(0); expect(dragAt(f, 4).ring - dragAt(f, 4).block).toBeCloseTo(f / SPRING_K, 9) })
  it('拓展：30 N 和 20 N，同向合力 50 N，反向 10 N', () => { expect(resultant(30, 20, true)).toBe(50); expect(resultant(30, 20, false)).toBe(10); expect(comboShove(true).total).toBeCloseTo(1.32, 2); expect(comboShove(false).total).toBeCloseTo(0.035, 3) })
  it('拓展：0.9 m/s 出手，不擦冰滑 2.07 m，擦冰滑 3.44 m；垫上圆铅笔只要 0.06 N', () => { expect(sweepDist(false)).toBeCloseTo(2.07, 2); expect(sweepDist(true)).toBeCloseTo(3.44, 2); expect(rolling()).toBeCloseTo(0.059, 3) })
})
