// 内能和热机实验室的计算核对：这里的数字要和规格卡 docs/specs/heat.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  C_WATER, COOL, ENGINE, FLOW, HOOKS, INK, Q_PETROL, RUN, absorbed, bathEnd, diffuse, efficiency, evenAt, fuelQ, gasMix, heatQ, heaterQ, heaterT,
  molSpeed, oilFromRun, pistonY, released, sci, strokeOf, syringe, travel, valves, volumeOf, working,
} from './physics'

describe('第 1 课 分子热运动', () => {
  it('热水里的红墨水先散匀', () => { expect(evenAt(true)).toBeLessThan(evenAt(false)); expect(diffuse(5, true)).toBeGreaterThan(diffuse(5, false)) })
  it('两杯水 20 ℃ 和 80 ℃，热水里分子更快', () => { expect(INK.hot).toBe(80); expect(molSpeed(80)).toBeGreaterThan(molSpeed(20)); expect(molSpeed(20)).toBeCloseTo(1, 9) })
  it('最后上下两瓶各一半', () => { expect(gasMix(1e6)).toBeCloseTo(0.5, 6) })
})
describe('第 2 课 分子间的作用力', () => {
  it('挂 4 个钩码', () => { expect(HOOKS.n).toBe(4) })
  it('空气好压缩，水几乎压不动', () => { expect(syringe('air')).toBeGreaterThan(syringe('water') * 10) })
})
describe('第 3 课 内能', () => {
  it('80 ℃ 的 0.2 kg 热水和 20 ℃ 的 0.1 kg 铝，最后约 74.3 ℃', () => { expect(bathEnd()).toBeCloseTo(74.31, 1) })
})
describe('第 4 课 比热容', () => {
  it('4 分钟：水 30 ℃、油 40 ℃', () => { expect(heaterT('water', 4)).toBeCloseTo(30, 9); expect(heaterT('oil', 4)).toBeCloseTo(40, 9) })
  it('水要 8 分钟才到 40 ℃', () => { expect(heaterT('water', 8)).toBeCloseTo(40, 9) })
  it('4 分钟给的热 8.4×10³ J，算出油的比热容 2.1×10³', () => { expect(heaterQ(4)).toBeCloseTo(8400, 6); expect(oilFromRun()).toBeCloseTo(2100, 6) })
  it('质量相同，油的体积大', () => { expect(volumeOf('oil')).toBeGreaterThan(volumeOf('water')) })
})
describe('第 5 课 热量的计算', () => {
  it('5 kg 冷却液 20 → 90 ℃ 吸热 1.47×10⁶ J', () => { expect(absorbed(5, COOL.start, COOL.hot)).toBeCloseTo(1.47e6, 3) })
  it('90 → 40 ℃ 放热 1.05×10⁶ J', () => { expect(released(5, COOL.hot, COOL.cold)).toBeCloseTo(1.05e6, 3) })
  it('10 kg 吸热 2.94×10⁶ J', () => { expect(absorbed(10, COOL.start, COOL.hot)).toBeCloseTo(2.94e6, 3) })
  it('随堂检测第 6 题：5 kg 水升高了 20 ℃ 吸热 4.2×10⁵ J', () => { expect(heatQ(C_WATER, 5, 20)).toBeCloseTo(4.2e5, 3) })
  it('科学计数法的写法', () => { expect(sci(1.47e6)).toBe('1.47×10⁶'); expect(sci(8400)).toBe('8.4×10³') })
})
describe('第 6 课 四冲程', () => {
  it('四个冲程的顺序', () => { expect([90, 270, 450, 630].map(strokeOf)).toEqual(['吸气', '压缩', '做功', '排气']) })
  it('上止点和下止点相差一个行程', () => { expect(pistonY(0) - pistonY(180)).toBeCloseTo(2 * ENGINE.r, 9); expect(travel(180)).toBeCloseTo(1, 9) })
  it('压缩和做功时两个气门都关着', () => { for (const a of [270, 450]) { const v = valves(a); expect(v.intake).toBe(0); expect(v.exhaust).toBe(0) } })
  it('吸气时进气门开，排气时排气门开', () => { expect(valves(90).intake).toBeGreaterThan(0.9); expect(valves(630).exhaust).toBeGreaterThan(0.9) })
})
describe('第 7 课 热值和效率', () => {
  it('0.1 kg 汽油放热 4.6×10⁶ J', () => { expect(fuelQ(RUN.fuel, Q_PETROL)).toBeCloseTo(4.6e6, 3) })
  it('效率 25%', () => { expect(efficiency(RUN.work, fuelQ(RUN.fuel, Q_PETROL))).toBeCloseTo(0.25, 9) })
  it('四份能量加起来是 100%，有用功那份和效率一致', () => { expect(FLOW.reduce((s, f) => s + f.share, 0)).toBeCloseTo(1, 9); expect(FLOW.find(f => f.key === 'work')!.share).toBeCloseTo(0.25, 9) })
})
describe('拓展 四缸机', () => {
  it('点火顺序 1-3-4-2', () => { expect([360, 540, 720, 900].map(a => working(a + 10))).toEqual([1, 3, 4, 2]) })
})
describe('第 6 课 曲轴转几圈做功几次', () => {
  it('转满两圈做功一次，四圈两次', async () => { const { cycles } = await import('./physics'); expect(cycles(720)).toEqual({ turns: 2, works: 1 }); expect(cycles(1440)).toEqual({ turns: 4, works: 2 }); expect(cycles(500).works).toBe(0) })
})
