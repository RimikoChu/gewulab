// 分子的形状和晶体实验室的计算核对：这里的数字要和规格卡 docs/specs/crystal.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { CELLS, angleText, bondAngle, breaksUp, classify, conducts, count, density, dipoleSum, dirs, drawn, heatTemp, hybrid, idealAngle, lonePairs, pairs, sites, spareElectrons, tempText, type MolKey } from './physics'

describe('分子的形状和晶体', () => {
  it('第 1 课：CO₂、BF₃、CH₄ 的价层电子对数是 2、3、4', () => { expect((['CO2', 'BF3', 'CH4'] as MolKey[]).map(pairs)).toEqual([2, 3, 4]) })
  it('第 1 课：电子对离得最远时夹角是 180°、120°、109°28′', () => { expect([2, 3, 4].map(n => angleText(idealAngle(n)))).toEqual(['180°', '120°', '109°28′']) })
  it('第 1 课：摆出来的键角和教材一致', () => { expect(bondAngle('CO2')).toBeCloseTo(180, 4); expect(bondAngle('BF3')).toBeCloseTo(120, 4); expect(angleText(bondAngle('CH4'))).toBe('109°28′') })
  it('第 2 课：NH₃ 有 1 对孤电子对，H₂O 有 2 对，CH₄ 没有', () => { expect([lonePairs('CH4'), lonePairs('NH3'), lonePairs('H2O')]).toEqual([0, 1, 2]) })
  it('第 2 课：三个分子都是 4 对价层电子对，键角 109°28′ > 107° > 105°', () => {
    expect([pairs('CH4'), pairs('NH3'), pairs('H2O')]).toEqual([4, 4, 4])
    expect(bondAngle('NH3')).toBeCloseTo(107, 4); expect(bondAngle('H2O')).toBeCloseTo(105, 4)
  })
  it('第 2 课：方向都是单位向量', () => { for (const m of ['CO2', 'BF3', 'CH4', 'NH3', 'H2O'] as MolKey[]) for (const v of [...dirs(m).bonds, ...dirs(m).lone]) expect(Math.hypot(...v)).toBeCloseTo(1, 9) })
  it('第 3 课：CH₄ sp³、BF₃ sp²（剩 1 个 p）、CO₂ sp（剩 2 个 p）', () => {
    expect(hybrid('CH4')).toMatchObject({ type: 'sp³', n: 4, rest: 0 }); expect(hybrid('BF3')).toMatchObject({ type: 'sp²', n: 3, rest: 1 }); expect(hybrid('CO2')).toMatchObject({ type: 'sp', n: 2, rest: 2 })
    expect(hybrid('H2O').type).toBe('sp³'); expect(hybrid('NH3').type).toBe('sp³')
  })
  it('第 4 课：CO₂、BF₃、CH₄ 的向量和是 0，H₂O 1.22，NH₃ 1.12', () => {
    for (const m of ['CO2', 'BF3', 'CH4'] as MolKey[]) expect(dipoleSum(m).polar).toBe(false)
    expect(dipoleSum('H2O').size).toBeCloseTo(1.22, 2); expect(dipoleSum('NH3').size).toBeCloseTo(1.12, 2)
    expect(dipoleSum('H2O').vec[1]).toBeGreaterThan(0)   // 指向氧原子这一头（孤电子对那一侧）
  })
  it('第 5 课：NaCl 晶胞画了 8 个顶点、12 条棱、6 个面、1 个体内的粒子', () => { expect([drawn('NaCl', 'corner'), drawn('NaCl', 'edge'), drawn('NaCl', 'face'), drawn('NaCl', 'body')]).toEqual([8, 12, 6, 1]) })
  it('第 5 课：一个 NaCl 晶胞里 4 个 Na⁺、4 个 Cl⁻', () => { expect(count('NaCl', 'Na')).toBe(4); expect(count('NaCl', 'Cl')).toBe(4) })
  it('第 5 课：由 a = 564 pm 算出氯化钠的密度 2.17 g/cm³', () => { expect(CELLS.NaCl.a).toBe(564); expect(density('NaCl')).toBeCloseTo(2.17, 2) })
  it('第 5 课：位置的判断', () => { expect(classify([0, 1, 1])).toBe('corner'); expect(classify([0.5, 0, 1])).toBe('edge'); expect(classify([0.5, 0.5, 0])).toBe('face'); expect(classify([0.25, 0.25, 0.25])).toBe('body') })
  it('第 6 课：CsCl 1 : 1，金刚石 8，干冰 4，铜 4', () => {
    expect([count('CsCl', 'Cs'), count('CsCl', 'Cl')]).toEqual([1, 1]); expect(count('diamond')).toBe(8); expect(count('dryice')).toBe(4); expect(count('Cu')).toBe(4)
    expect(sites('diamond').length).toBe(18)
  })
  it('第 6 课：铜和金刚石算出的密度和实测相符', () => { expect(density('Cu')).toBeCloseTo(8.96, 1); expect(density('diamond')).toBeCloseTo(3.51, 1) })
  it('第 7 课：只有铜固态导电；氯化钠熔化后导电；干冰、金刚石都不导电', () => {
    expect(conducts('Cu', false)).toBe(true); expect(conducts('NaCl', false)).toBe(false); expect(conducts('NaCl', true)).toBe(true)
    expect(conducts('dryice', true)).toBe(false); expect(conducts('diamond', true)).toBe(false)
  })
  it('第 7 课：加热到头的温度：铜 1083、氯化钠 801、干冰 −78.5、金刚石 3500 还没熔化', () => {
    expect(heatTemp('Cu', 1)).toBe(1083); expect(heatTemp('NaCl', 1)).toBe(801); expect(tempText(heatTemp('dryice', 1))).toBe('−78.5 °C'); expect(heatTemp('dryice', 0)).toBe(-100)
    expect(heatTemp('diamond', 1)).toBe(3500); expect(breaksUp('diamond')).toBe(false)
  })
  it('拓展：石墨每个碳原子剩 1 个电子，金刚石不剩', () => { expect(spareElectrons('graphite')).toBe(1); expect(spareElectrons('diamond')).toBe(0) })
})
