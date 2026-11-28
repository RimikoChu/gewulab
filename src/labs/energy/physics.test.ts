// 功和机械能实验室的计算核对：这里的数字要和规格卡 docs/specs/energy.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BUNGEE, COASTER, bungeeAt, bungeeFastest, bungeeK, caseWork, coasterAt, hoist, liftWork, pushWork, shipAt, sink, slide, springRise, swingAngle, swingEnergy, swingHeight, wheelAt, wheelTrip } from './physics'

describe('功和机械能', () => {
  it('第 1 课：举高 2 m 做功 3920 J，另外三种情形都不做功', () => {
    expect(caseWork('lift')).toBeCloseTo(3920, 6)
    expect(caseWork('wall')).toBe(0); expect(caseWork('carry')).toBe(0); expect(caseWork('coast')).toBe(0)
  })
  it('第 2 课：100 N 推 2 m 是 200 J，推 4 m 是 400 J；200 N 推 4 m 是 800 J', () => {
    expect(pushWork('small', 2)).toBe(200); expect(pushWork('small', 4)).toBe(400); expect(pushWork('big', 4)).toBe(800)
  })
  it('第 3 课：快机 4 s、2940 W；慢机 12 s、980 W；做的功都是 11760 J', () => {
    const a = hoist('fast', 'heavy'), b = hoist('slow', 'heavy')
    expect(a.W).toBeCloseTo(11760, 6); expect(b.W).toBeCloseTo(11760, 6)
    expect(a.t).toBeCloseTo(4, 6); expect(a.P).toBeCloseTo(2940, 6); expect(b.t).toBeCloseTo(12, 6); expect(b.P).toBeCloseTo(980, 6)
  })
  it('第 3 课：快机升 100 kg，做功 5880 J，功率 1470 W，仍比慢机大', () => {
    const c = hoist('fast', 'light'); expect(c.W).toBeCloseTo(5880, 6); expect(c.P).toBeCloseTo(1470, 6); expect(c.P).toBeGreaterThan(hoist('slow', 'heavy').P)
  })
  it('第 4 课：木块滑行 10 cm、20 cm、20 cm', () => {
    expect(slide('small', 'low')).toBeCloseTo(0.1, 6); expect(slide('small', 'high')).toBeCloseTo(0.2, 6); expect(slide('big', 'low')).toBeCloseTo(0.2, 6)
  })
  it('第 5 课：木桩砸进 5 cm、10 cm、20 cm；弹射器把小球弹到 0.5 m、2 m', () => {
    expect(sink('light', 'low')).toBeCloseTo(0.05, 6); expect(sink('light', 'high')).toBeCloseTo(0.1, 6); expect(sink('heavy', 'high')).toBeCloseTo(0.2, 6)
    expect(springRise('low')).toBeCloseTo(0.5, 6); expect(springRise('high')).toBeCloseTo(2, 6)
  })
  it('第 6 课：坡顶势能 98 kJ；谷底动能 98 kJ、速度约 19.8 m/s；第二个坡顶势能 58.8 kJ、动能 39.2 kJ', () => {
    expect(coasterAt(COASTER.top).Ep).toBeCloseTo(98000, 6); expect(coasterAt(COASTER.top).Ek).toBeCloseTo(0, 6)
    expect(coasterAt(0).Ek).toBeCloseTo(98000, 6); expect(coasterAt(0).v).toBeCloseTo(19.8, 1)
    expect(coasterAt(COASTER.hill).Ep).toBeCloseTo(58800, 6); expect(coasterAt(COASTER.hill).Ek).toBeCloseTo(39200, 6)
    expect(liftWork()).toBeCloseTo(88200, 6)
  })
  it('第 7 课：不计阻力每次都回到 4 m；有阻力依次是 4、3.6、3.24、2.92 m', () => {
    expect(swingHeight('none', 3)).toBe(4)
    expect(swingHeight('drag', 1)).toBeCloseTo(3.6, 6); expect(swingHeight('drag', 2)).toBeCloseTo(3.24, 6); expect(swingHeight('drag', 3)).toBeCloseTo(2.916, 6)
    expect(swingEnergy('none', 0)).toBeCloseTo(78400, 6); expect(swingEnergy('drag', 3)).toBeCloseTo(57153.6, 3)
    expect(shipAt('none', 0).angle).toBeCloseTo(swingAngle(4), 6); expect(shipAt('none', 1.5).angle).toBeCloseTo(0, 6); expect(shipAt('none', 3).angle).toBeCloseTo(-swingAngle(4), 6)
  })
  it('拓展 · 蹦极：绳刚拉直时动能 5880 J；最低点动能 0、弹性势能 14700 J；落下 14.5 m 时最快', () => {
    expect(bungeeAt(BUNGEE.rope).Ek).toBeCloseTo(5880, 6); expect(bungeeAt(BUNGEE.rope).Es).toBe(0)
    expect(bungeeAt(BUNGEE.fall).Ek).toBeCloseTo(0, 6); expect(bungeeAt(BUNGEE.fall).Es).toBeCloseTo(14700, 6)
    expect(bungeeK()).toBeCloseTo(130.67, 2); expect(bungeeFastest()).toBeCloseTo(14.5, 6)
  })
  it('拓展 · 滚摆：一趟 2 s，到最低点时势能全部变成动能，再回到 0.4 m', () => {
    expect(wheelTrip()).toBeCloseTo(2, 6); expect(wheelAt(2).h).toBeCloseTo(0, 6); expect(wheelAt(2).kinetic).toBeCloseTo(1, 6); expect(wheelAt(4).h).toBeCloseTo(0.4, 6)
  })
})
