// 溶液实验室的计算核对：这里的数字要和规格卡 docs/specs/solution.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { cooled, crossing, dilute, dissolve, evapStart, fraction, mixKind, recipe, settles, solubility, tempAfter } from './physics'

describe('溶液', () => {
  it('第 1 课：蔗糖成溶液，泥沙成悬浊液，植物油成乳浊液，加洗涤剂乳化', () => {
    expect(mixKind('sugar')).toBe('溶液'); expect(mixKind('soil')).toBe('悬浊液'); expect(mixKind('oil')).toBe('乳浊液'); expect(mixKind('oil', true)).toBe('乳化')
    expect(settles('sugar')).toBe(false); expect(settles('oil')).toBe(true); expect(settles('oil', true)).toBe(false)
  })
  it('第 2 课：5 g 溶于 50 g 水，硝酸铵约 13 ℃，氢氧化钠约 44 ℃，氯化钠约 19 ℃', () => {
    expect(Math.round(tempAfter('NH4NO3', 5, 50))).toBe(13)
    expect(Math.round(tempAfter('NaOH', 5, 50))).toBe(44)
    expect(Math.round(tempAfter('NaCl', 5, 50))).toBe(19)
  })
  it('第 3 课：20 g 水加 10 g 氯化钠剩 2.8 g；加到 30 g 水全溶；硝酸钾剩 3.7 g，60 ℃ 全溶', () => {
    expect(dissolve('NaCl', 20, 5, 20).saturated).toBe(false)
    expect(dissolve('NaCl', 20, 10, 20).left).toBeCloseTo(2.8, 6)
    expect(dissolve('NaCl', 30, 10, 20).left).toBe(0)
    expect(dissolve('KNO3', 20, 10, 20).left).toBeCloseTo(3.68, 6)
    expect(dissolve('KNO3', 20, 10, 60).left).toBe(0)
  })
  it('第 4 课：20 ℃ 氯化钠 36.0 g、硝酸钾 31.6 g；60 ℃ 硝酸钾 110 g', () => {
    expect(solubility('NaCl', 20)).toBeCloseTo(36.0, 6); expect(solubility('KNO3', 20)).toBeCloseTo(31.6, 6); expect(solubility('KNO3', 60)).toBeCloseTo(110, 6)
    expect(solubility('KNO3', 25)).toBeCloseTo(38.7, 6)
  })
  it('第 5 课：两条曲线交于约 23 ℃、约 36 g；氢氧化钙随温度升高而减小', () => {
    const c = crossing(); expect(Math.round(c.t)).toBe(23); expect(Math.round(c.s)).toBe(36)
    expect(solubility('CaOH2', 80)).toBeLessThan(solubility('CaOH2', 20))
  })
  it('第 6 课：60 ℃ 降到 20 ℃ 析出 78.4 g 硝酸钾；5 g 氯化钠在 100 ℃ 水剩约 12.6 g 时开始析出', () => {
    expect(cooled('KNO3', 100, 60, 20)).toBeCloseTo(78.4, 6)
    expect(evapStart(5, 100)).toBeCloseTo(12.56, 2)
  })
  it('第 7 课：50 g 6% 要 3 g 氯化钠、47 mL 水；稀释成 3% 要 25 g 浓溶液加 25 g 水', () => {
    const r = recipe(50, 6); expect(r.solute).toBeCloseTo(3, 6); expect(r.mL).toBeCloseTo(47, 6)
    expect(fraction(3, 50)).toBeCloseTo(6, 6)
    const d = dilute(50, 6, 3); expect(d.conc).toBeCloseTo(25, 6); expect(d.water).toBeCloseTo(25, 6)
    expect(fraction(10, 200)).toBeCloseTo(5, 6)
  })
})
