// 光合作用和呼吸作用实验室的计算核对：这里的数字要和规格卡 docs/specs/leaf.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { balanceTimes, breathes, bubbles, candleKeeps, co2At, flaskTemp, makesStarch, stomaOpen, stored, willowGain, yieldIndex } from './physics'

describe('光合作用和呼吸作用', () => {
  it('第 1 课：见光的部分制造淀粉，遮光的部分不能', () => {
    expect(makesStarch({ light: true, co2: true, chloroplast: true })).toBe(true)
    expect(makesStarch({ light: false, co2: true, chloroplast: true })).toBe(false)
  })
  it('第 2 课：灯距 10、20、30 cm 时每分钟 60、15、7 个气泡', () => { expect([10, 20, 30].map(bubbles)).toEqual([60, 15, 7]) })
  it('第 3 课：没有二氧化碳，不能制造淀粉', () => { expect(makesStarch({ light: true, co2: false, chloroplast: true })).toBe(false) })
  it('第 4 课：保卫细胞吸水，气孔张开；失水，气孔关闭', () => { expect(stomaOpen('swollen')).toBe(true); expect(stomaOpen('shrunk')).toBe(false) })
  it('第 5 课：6 小时后萌发的种子 25 ℃，煮熟的 22 ℃；只有活的种子在呼吸', () => {
    expect(flaskTemp('alive', 6)).toBe(25); expect(flaskTemp('boiled', 6)).toBe(22); expect(flaskTemp('alive', 10)).toBe(25)
    expect(breathes('alive')).toBe(true); expect(breathes('boiled')).toBe(false)
  })
  it('第 6 课：0、6、12、18、24 时的二氧化碳是 100、112、85.8、59.6、71.6', () => {
    const got = [0, 6, 12, 18, 24].map(t => co2At(t)), want = [100, 112, 85.8, 59.6, 71.6]
    got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 1))
  })
  it('第 6 课：二氧化碳约 6 时 46 分最高、17 时 14 分最低；白天积累、夜里消耗', () => {
    const [a, b] = balanceTimes(); expect(a).toBeCloseTo(6.769, 2); expect(b).toBeCloseTo(17.231, 2)
    expect(co2At(a)).toBeGreaterThan(co2At(6)); expect(co2At(b)).toBeLessThan(co2At(18)); expect(stored(6)).toBeLessThan(0); expect(stored(24)).toBeLessThan(stored(18))
  })
  it('第 7 课：不处理 100，延长光照 167，增施二氧化碳 181，夜间降温 134', () => {
    expect((['none', 'light', 'co2', 'cool'] as const).map(yieldIndex)).toEqual([100, 167, 181, 134])
  })
  it('拓展：蜡烛只有在有植物又有光的钟罩里才能一直烧；柳树重了约 74.4 kg', () => {
    expect(candleKeeps({ plant: true, light: true })).toBe(true); expect(candleKeeps({ plant: true, light: false })).toBe(false); expect(candleKeeps({ plant: false, light: true })).toBe(false)
    expect(willowGain()).toBeCloseTo(74.4, 1)
  })
  it('拓展：银边没有叶绿体，不制造淀粉', () => { expect(makesStarch({ light: true, co2: true, chloroplast: false })).toBe(false) })
})
