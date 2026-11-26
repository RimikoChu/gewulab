// 质量守恒定律实验室的计算核对：这里的数字要和规格卡 docs/specs/mass.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BAL, EQ, atomCount, eqText, kiln, l1Parts, l2Parts, l3After, l5Feed, lxGain, massParts, mr, solveLime, tilt, weigh } from './physics'

describe('质量守恒定律', () => {
  it('相对分子质量', () => { expect(mr('P2O5')).toBe(142); expect(mr('CuSO4')).toBe(160); expect(mr('Na2CO3')).toBe(106); expect(mr('CaCO3')).toBe(100) })
  it('每个方程式两边原子个数相等、质量相等', () => {
    for (const e of Object.values(EQ)) {
      expect(atomCount(e).ok).toBe(true)
      const p = massParts(e), l = p.slice(0, e.left.length).reduce((a, b) => a + b, 0), r = p.slice(e.left.length).reduce((a, b) => a + b, 0)
      expect(l).toBeCloseTo(r, 6)
    }
  })
  it('天平：118.6 g 用 100、10、5 g 砝码，游码 3.6 g', () => { const w = weigh(118.6); expect(w.on).toEqual([0, 4, 5]); expect(w.rider).toBeCloseTo(3.6, 6); expect(w.sum).toBeCloseTo(118.6, 6) })
  it('天平：差 0.5 g 以上偏到头', () => { expect(tilt(10.6, 10)).toBe(1); expect(tilt(10, 10)).toBe(0); expect(tilt(72.16, 72.6)).toBeCloseTo(-0.88, 6) })
  it('第 1 课：0.31 g 红磷和 0.40 g 氧气生成 0.71 g 五氧化二磷', () => { const p = l1Parts(); expect(p.o2).toBeCloseTo(0.4, 6); expect(p.p2o5).toBeCloseTo(0.71, 6) })
  it('第 2 课：0.56 g 铁置换出 0.64 g 铜', () => { const p = l2Parts(); expect(p.cuso4).toBeCloseTo(1.6, 6); expect(p.cu).toBeCloseTo(0.64, 6); expect(p.feso4).toBeCloseTo(1.52, 6) })
  it('第 3 课：敞口少 0.44 g，镁条多 0.16 g，密闭不变', () => { expect(l3After('open')).toBeCloseTo(72.16, 6); expect(l3After('mg')).toBeCloseTo(28.56, 6); expect(l3After('sealed')).toBeCloseTo(96.2, 6) })
  it('第 4 课：电解水 36 份水生成 4 份氢气和 32 份氧气', () => { expect(massParts(EQ.water)).toEqual([36, 4, 32]); expect(atomCount(EQ.water).left).toEqual({ H: 4, O: 2 }) })
  it('第 5 课：碳燃烧 12 : 32 : 44，氢气燃烧 4 : 32 : 36', () => { expect(l5Feed('carbon')).toEqual([12, 32, 44]); expect(l5Feed('h2')).toEqual([4, 32, 36]) })
  it('第 6 课：配平的最后一步就是配平好的方程式', () => {
    expect(BAL.phos.steps.at(-1)!.coef).toEqual(EQ.phos.coef); expect(BAL.iron.steps.at(-1)!.coef).toEqual(EQ.iron.coef)
    expect(atomCount(EQ.phos, BAL.phos.start).ok).toBe(false)
    expect(eqText(EQ.phos)).toBe('4P + 5O₂ = 2P₂O₅')
  })
  it('第 7 课：制取 5.6 t 氧化钙需要 10 t 碳酸钙；随堂检测：20 t 碳酸钙得 11.2 t 氧化钙', () => { expect(solveLime(5.6).x).toBeCloseTo(10, 6); expect(kiln(10).cao).toBeCloseTo(5.6, 6); expect(kiln(20).cao).toBeCloseTo(11.2, 6) })
  it('拓展：100 t 碳酸钙得 56 t 氧化钙、44 t 二氧化碳；0.84 g 铁结合 0.32 g 氧气', () => { expect(kiln(100).co2).toBeCloseTo(44, 6); expect(lxGain()).toBeCloseTo(0.32, 6) })
})
