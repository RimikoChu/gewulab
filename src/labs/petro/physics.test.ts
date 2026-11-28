// 从石油到塑料实验室的计算核对：这里的数字要和规格卡 docs/specs/petro.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { ADDITION, ALKANE_BP, BOND, CRACK, ROUTE, alkane, balanced, esterFromEthene, fades, fractionOf, mass, polymerMass, probe, substituted, text, RESINS, PLASTICS } from './physics'

describe('从石油到塑料', () => {
  it('第 1 课：四种烷烃的去向', () => {
    expect(probe('c3').fraction.name).toBe('石油气')
    expect(probe('c8').fraction.name).toBe('汽油')
    expect(probe('c16').fraction.name).toBe('柴油')
    expect(probe('c25').fraction.name).toBe('重油')
    expect(probe('c25').vapor).toBe(false)
    expect(probe('c8').bp).toBeCloseTo(125.7, 6)
  })
  it('第 1 课：碳链越长沸点越高', () => {
    for (let n = 2; n <= 20; n++) expect(ALKANE_BP[n]).toBeGreaterThan(ALKANE_BP[n - 1])
    expect(fractionOf(230).name).toBe('煤油')
  })
  it('第 2 课：每一步碳、氢原子数守恒，质量也守恒', () => {
    for (const s of CRACK) { expect(balanced(s)).toBe(true); expect(mass(s.from)).toBe(mass(s.a) + mass(s.b)) }
    expect(mass(alkane(16))).toBe(226); expect(mass(CRACK[0].a)).toBe(114); expect(mass(CRACK[0].b)).toBe(112)
    expect(text(CRACK[2].b)).toBe('C₂H₄'); expect(text(CRACK[3].a)).toBe('CH₄')
  })
  it('第 3 课：取代几个氢就消耗几个氯分子、生成几个氯化氢', () => {
    expect(substituted(4)).toMatchObject({ cl2: 4, hcl: 4 }); expect(substituted(4).product.formula).toBe('CCl₄'); expect(substituted(4).mass).toBe(154)
    expect(substituted(1).product.state).toBe('气体'); expect(substituted(1).mass).toBeCloseTo(50.5, 6)
  })
  it('第 4 课：乙烯使两种溶液都褪色，甲烷都不褪色；加成产物 188', () => {
    expect(fades('ethene', 'br2').fade).toBe(true); expect(fades('ethene', 'kmno4').fade).toBe(true)
    expect(fades('methane', 'br2').fade).toBe(false); expect(fades('methane', 'kmno4').fade).toBe(false)
    expect(ADDITION.ethene + ADDITION.br2).toBe(188); expect(ADDITION.product).toBe(188)
  })
  it('第 5 课：苯不褪色，键长介于单键和双键之间', () => {
    expect(fades('benzene', 'br2').fade).toBe(false); expect(fades('benzene', 'kmno4').fade).toBe(false)
    expect(BOND.benzene).toBe(140); expect(BOND.benzene).toBeGreaterThan(BOND.double); expect(BOND.benzene).toBeLessThan(BOND.single)
  })
  it('第 6 课：相对分子质量 28、46、44、60、88；56 t 乙烯最多得 88 t 乙酸乙酯', () => {
    expect(ROUTE.map(r => mass(r.formula))).toEqual([28, 46, 44, 60, 88])
    expect(esterFromEthene(56)).toBeCloseTo(88, 6)
  })
  it('第 7 课：聚合度 5000 的聚乙烯相对分子质量 140000', () => { expect(polymerMass(5000)).toBe(140000); expect(polymerMass(1000)).toBe(28000) })
  it('拓展课：回收标志和热塑性', () => { expect(RESINS[0].abbr).toBe('PET'); expect(RESINS[3].abbr).toBe('LDPE'); expect(PLASTICS.pe.melts).toBe(true); expect(PLASTICS.pf.melts).toBe(false) })
})
