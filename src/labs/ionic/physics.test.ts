// 水溶液里的离子平衡：计算核心的核对。数字和规格卡 docs/specs/ionic.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { JUMP, KSP, alphaOf, cellAlpha, cellH, convK, dilPH, glow, hacPH, ions, kaFromPH, purePH, qAgCl, qAgI, saltPH, sci, sodaPH, titrationPH, waterPH, willPrecipitate } from './physics'

describe('第 1 课 强电解质和弱电解质', () => {
  it('0.10 mol/L 盐酸完全电离，醋酸只电离约 1.3%', () => {
    expect(cellH('hcl')).toBeCloseTo(0.1, 6)
    expect(cellAlpha('hac') * 100).toBeCloseTo(1.31, 2)
    expect(glow('hac')).toBeLessThan(0.02)
  })
})

describe('第 2 课 醋酸的电离平衡', () => {
  it('0.10 mol/L 醋酸 pH 2.88；稀释十倍 pH 3.39，电离度变大、Ka 不变', () => {
    expect(hacPH(0.1)).toBeCloseTo(2.88, 2)
    expect(hacPH(0.01)).toBeCloseTo(3.39, 2)
    expect(alphaOf(0.01)).toBeGreaterThan(alphaOf(0.1))
    expect(kaFromPH(0.1, hacPH(0.1))).toBeCloseTo(1.75e-5, 9)
    expect(kaFromPH(0.01, hacPH(0.01))).toBeCloseTo(1.75e-5, 9)
  })
})

describe('第 3 课 水的电离和水的离子积', () => {
  it('25 °C 纯水 pH 7.00，50 °C 6.64 仍是中性；0.010 mol/L 盐酸和 NaOH 溶液 pH 2.00、12.00，Kw 不变', () => {
    expect(purePH(25)).toBeCloseTo(7, 6)
    expect(purePH(50)).toBeCloseTo(6.64, 2)
    expect(ions('water', 50).h).toBeCloseTo(ions('water', 50).oh, 12)
    expect(waterPH('hcl')).toBeCloseTo(2, 6)
    expect(waterPH('naoh')).toBeCloseTo(12, 6)
    const a = ions('hcl'); expect(a.h * a.oh).toBeCloseTo(1e-14, 20)
  })
})

describe('第 4 课 溶液 pH 的计算', () => {
  it('盐酸每稀释十倍 pH 加 1；醋酸只加约 0.5', () => {
    expect([0, 1, 2, 3].map(n => +dilPH('hcl', n).toFixed(2))).toEqual([1, 2, 3, 4])
    expect([0, 1, 2, 3].map(n => +dilPH('hac', n).toFixed(2))).toEqual([2.88, 3.39, 3.91, 4.47])
  })
})

describe('第 5 课 酸碱中和滴定', () => {
  it('滴定曲线：起点 pH 1.00，19.90 mL 3.60，20.00 mL 7.00，突跃 4.30 → 9.70，25.00 mL 12.05', () => {
    expect(titrationPH(0)).toBeCloseTo(1, 6)
    expect(titrationPH(19.9)).toBeCloseTo(3.6, 2)
    expect(titrationPH(20)).toBe(7)
    expect(JUMP.lo).toBeCloseTo(4.3, 2)
    expect(JUMP.hi).toBeCloseTo(9.7, 2)
    expect(titrationPH(25)).toBeCloseTo(12.05, 2)
  })
})

describe('第 6 课 盐类的水解', () => {
  it('0.10 mol/L NaCl 7.00，CH₃COONa 8.88，NH₄Cl 5.13', () => {
    expect(saltPH('nacl')).toBe(7)
    expect(saltPH('hac')).toBeCloseTo(8.88, 2)
    expect(saltPH('nh4')).toBeCloseTo(5.13, 2)
  })
})

describe('第 7 课 沉淀溶解平衡', () => {
  it('Q(AgCl) ≈ 4.5×10⁻⁴ 远大于 Ksp；再滴 KI，Q(AgI) 也大于 Ksp(AgI)，K ≈ 2.1×10⁶', () => {
    expect(sci(qAgCl())).toBe("4.5×10⁻⁴")
    expect(willPrecipitate(qAgCl(), KSP.AgCl)).toBe(true)
    expect(willPrecipitate(qAgI(), KSP.AgI)).toBe(true)
    expect(sci(convK())).toBe('2.1×10⁶')
  })
})

describe('拓展 纯碱去油污', () => {
  it('0.10 mol/L Na₂CO₃ 溶液 pH 约 11.65', () => {
    expect(sodaPH()).toBeCloseTo(11.65, 2)
  })
})
