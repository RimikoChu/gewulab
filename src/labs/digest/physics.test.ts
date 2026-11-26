// 消化和吸收实验室的计算核对：这里的结论要和规格卡 docs/specs/digest.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { FOOD_ORDER, GLANDS, PAGODA, PRODUCTS, ROUTE, TRACT, WARM_MIN, areaGain, balanced, dropletR, energyKinds, iodineColor, leftAfter, mealGroups, outsideGlands, proteinInStomach, starchLeft, startSite } from './physics'

describe('消化和吸收', () => {
  it('第 1 课：六类营养物质里三类能供能', () => { expect(energyKinds()).toBe(3) })
  it('第 2 课：消化道七段，消化腺五种，三种在消化道外', () => {
    expect(TRACT.map(t => t.name)).toEqual(['口腔', '咽', '食道', '胃', '小肠', '大肠', '肛门'])
    expect(GLANDS).toHaveLength(5); expect(outsideGlands()).toBe(3)
  })
  it('第 3 课：37 ℃ 保温 10 分钟，1 号不变蓝、2 号变蓝、3 号部分变蓝', () => {
    expect(iodineColor(starchLeft(1, 37, WARM_MIN))).toBe('none')
    expect(iodineColor(starchLeft(2, 37, WARM_MIN))).toBe('blue')
    expect(iodineColor(starchLeft(3, 37, WARM_MIN))).toBe('part')
  })
  it('第 3 课：0 ℃ 冰水里三支都变蓝', () => { for (const t of [1, 2, 3] as const) expect(iodineColor(starchLeft(t, 0, WARM_MIN))).toBe('blue') })
  it('第 4 课：胃里只初步分解蛋白质，淀粉和脂肪不变', () => {
    expect(proteinInStomach(1)).toBeCloseTo(leftAfter('protein', 'C'), 6)
    expect(leftAfter('protein', 'C')).toBeLessThan(1); expect(leftAfter('protein', 'C')).toBeGreaterThan(0)
    expect(leftAfter('fat', 'C')).toBe(1); expect(leftAfter('starch', 'C')).toBe(leftAfter('starch', 'B'))
  })
  it('第 5 课：淀粉从口腔、蛋白质从胃、脂肪从小肠开始消化，在小肠全部分解', () => {
    expect(startSite('starch')).toBe('A'); expect(startSite('protein')).toBe('C'); expect(startSite('fat')).toBe('D')
    for (const m of ['starch', 'protein', 'fat'] as const) expect(leftAfter(m, 'D')).toBe(0)
    expect(PRODUCTS.protein).toBe('氨基酸')
  })
  it('第 5 课：乳化成 8 个微粒，每个半径减半，总表面积变成 2 倍', () => { expect(dropletR(1, 8)).toBeCloseTo(0.5, 6); expect(areaGain(8)).toBeCloseTo(2, 6) })
  it('第 6 课：葡萄糖、氨基酸进毛细血管，脂肪成分进毛细淋巴管', () => { expect(ROUTE.glucose).toBe('blood'); expect(ROUTE.amino).toBe('blood'); expect(ROUTE.fatty).toBe('lymph') })
  it('第 7 课：五类都有才算搭配齐；宝塔五层，最底层是谷薯类', () => {
    expect(balanced(FOOD_ORDER)).toBe(true); expect(mealGroups(['grain', 'grain', 'veg'])).toBe(2); expect(balanced(['grain', 'meat'])).toBe(false)
    expect(PAGODA).toHaveLength(5); expect(PAGODA[0].name).toBe('谷薯类')
  })
})
