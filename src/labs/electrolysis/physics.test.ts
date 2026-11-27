// 电解和金属防护实验室的计算核对：这里的数字要和规格卡 docs/specs/electrolysis.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BRINE, PLATE_NE, SMELT_NE, cationTo, chlorAlkali, columnShift, corrosionKind, crudeFate, cucl2Yield, electrolyze, gasChange, guardFlow, membranePass, oxidationAt, paperBlue, plating, sacrificial, smeltMass, sodiumFromBrine, steelRate } from './physics'

describe('电解和金属防护', () => {
  it('第 1 课：电解 CuCl₂ 溶液，阴极析出铜，阳极放出氯气', () => {
    const r = electrolyze('cucl2')
    expect([r.cathode, r.anode]).toEqual(['Cu', 'Cl₂'])
    expect(r.total).toBe('CuCl₂ ═ Cu + Cl₂↑')
  })
  it('第 1 课：转移 0.2 mol 电子，得 6.4 g 铜和 2.24 L 氯气；氯气使湿润的淀粉碘化钾试纸变蓝', () => {
    expect(cucl2Yield(0.2)).toEqual({ cu: 6.4, cl2: 2.24 })
    expect(paperBlue('Cl₂')).toBe(true); expect(paperBlue('H₂')).toBe(false)
  })
  it('第 2 课：电解池里阳极氧化、阳离子移向阴极；原电池里负极氧化、阳离子移向正极', () => {
    expect([oxidationAt('electro'), cationTo('electro')]).toEqual(['阳极', '阴极'])
    expect([oxidationAt('galvanic'), cationTo('galvanic')]).toEqual(['负极', '正极'])
  })
  it('第 3 课：四种溶液两极的产物', () => {
    expect([electrolyze('nacl').cathode, electrolyze('nacl').anode]).toEqual(['H₂', 'Cl₂'])
    expect([electrolyze('cuso4').cathode, electrolyze('cuso4').anode]).toEqual(['Cu', 'O₂'])
    expect([electrolyze('na2so4').cathode, electrolyze('na2so4').anode]).toEqual(['H₂', 'O₂'])
  })
  it('第 3 课：电解 Na₂SO₄ 溶液，氢气和氧气体积比 2∶1；电解 NaCl 溶液 1∶1，阴极区显碱性', () => {
    expect(electrolyze('na2so4').ratio).toBe(2)
    expect(electrolyze('nacl').ratio).toBe(1)
    expect(electrolyze('nacl').cathodeBase).toBe(true)
    expect(electrolyze('cuso4').anodeAcid).toBe(true)
  })
  it('第 4 课：转移 2 mol 电子，得 1 mol H₂、1 mol Cl₂、2 mol NaOH（80 g）', () => {
    const r = chlorAlkali(2)
    expect([r.h2, r.cl2, r.naoh]).toEqual([1, 1, 2])
    expect([r.h2L, r.cl2L, r.naohG]).toEqual([22.4, 22.4, 80])
    expect(BRINE.total).toBe('2NaCl + 2H₂O ═ 2NaOH + H₂↑ + Cl₂↑')
  })
  it('第 4 课：阳离子交换膜让 Na⁺ 通过，挡住 Cl⁻ 和 OH⁻', () => {
    expect(membranePass('Na⁺')).toBe(true); expect(membranePass('Cl⁻')).toBe(false); expect(membranePass('OH⁻')).toBe(false)
  })
  it('第 5 课：电镀时转移 0.2 mol 电子，阴极增重 6.4 g，阳极减轻 6.4 g，Cu²⁺ 浓度不变', () => {
    expect(plating('plate', PLATE_NE)).toEqual({ gain: 6.4, anodeLoss: 6.4, cu: '不变' })
  })
  it('第 5 课：精炼时阴极同样增重 6.4 g，阳极减少的质量不相等；锌、铁进溶液，银、金成阳极泥', () => {
    const r = plating('refine', PLATE_NE)
    expect(r.gain).toBe(6.4); expect(r.anodeLoss).toBeNull()
    expect([crudeFate('Zn'), crudeFate('Fe'), crudeFate('Cu'), crudeFate('Ag'), crudeFate('Au')]).toEqual(['ion', 'ion', 'copper', 'mud', 'mud'])
  })
  it('第 6 课：食盐水里吸氧腐蚀，气体减少、水柱上升；酸里析氢腐蚀，水柱下降', () => {
    expect([corrosionKind('neutral'), gasChange('neutral')]).toEqual(['吸氧腐蚀', -1])
    expect([corrosionKind('acid'), gasChange('acid')]).toEqual(['析氢腐蚀', 1])
    expect(columnShift('neutral', 5)).toBeGreaterThan(0); expect(columnShift('acid', 5)).toBeLessThan(0)
    expect(columnShift('neutral', 5)).toBeCloseTo(2.4, 1)
  })
  it('第 7 课：锌能保护钢，铜不能；挂铜块时钢桩锈得更快；外加电流时电子从电源负极流向钢桩', () => {
    expect(sacrificial('Zn')).toBe(true); expect(sacrificial('Cu')).toBe(false)
    expect([steelRate('none'), steelRate('zinc'), steelRate('copper'), steelRate('power')]).toEqual([1, 0, 2, 0])
    expect(guardFlow('power')).toBe('电源负极 → 钢桩'); expect(guardFlow('zinc')).toBe('锌块 → 钢桩')
  })
  it('拓展课：转移 6 mol 电子，得钠 138 g、镁 72 g、铝 54 g；电解食盐水得不到钠', () => {
    expect([smeltMass('Na', SMELT_NE), smeltMass('Mg', SMELT_NE), smeltMass('Al', SMELT_NE)]).toEqual([138, 72, 54])
    expect(sodiumFromBrine()).toBe(false)
  })
})
