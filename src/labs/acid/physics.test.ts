// 酸、碱和中和实验室的计算核对：这里的数字要和规格卡 docs/specs/acid.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { SAMPLES, WATERS, canDischarge, cabbage, heatRise, limeNeed, litmus, paperRead, phenol, pondPH, titrationPH, titrationPink } from './physics'

describe('酸、碱和中和', () => {
  it('第 1 课：稀盐酸使石蕊变红、酚酞不变色', () => { expect(litmus(SAMPLES.acid.pH)).toBe('red'); expect(phenol(SAMPLES.acid.pH)).toBe('none') })
  it('第 1 课：石灰水使石蕊变蓝、酚酞变红；食盐水都不变', () => {
    expect(litmus(SAMPLES.lime.pH)).toBe('blue'); expect(phenol(SAMPLES.lime.pH)).toBe('pink')
    expect(litmus(SAMPLES.salt.pH)).toBe('purple'); expect(phenol(SAMPLES.salt.pH)).toBe('none')
  })
  it('第 5 课：起点 pH 13.0，19.50 mL 时 11.1', () => { expect(titrationPH(0)).toBeCloseTo(13, 6); expect(titrationPH(19.5).toFixed(1)).toBe('11.1') })
  it('第 5 课：20.00 mL 恰好中和 pH 7.0，多一滴 3.9', () => { expect(titrationPH(20)).toBe(7); expect(titrationPH(20.05).toFixed(1)).toBe('3.9') })
  it('第 5 课：19.95 mL 仍红，20.00 mL 褪色', () => { expect(titrationPink(19.95)).toBe(true); expect(titrationPink(20)).toBe(false) })
  it('第 6 课：进水 2、出水 7、碱液 12；只有出水能排放', () => {
    expect(paperRead(WATERS.inflow.pH)).toBe(2); expect(paperRead(WATERS.outflow.pH)).toBe(7); expect(paperRead(WATERS.alkali.pH)).toBe(12)
    expect(canDischarge(WATERS.outflow.pH)).toBe(true); expect(canDischarge(WATERS.inflow.pH)).toBe(false)
  })
  it('第 7 课：100 m³ 含硫酸 0.005 mol/L 的废水要 37.0 kg 熟石灰', () => { expect(limeNeed()).toBeCloseTo(37, 6) })
  it('第 7 课：投 0、20、37、50 kg 后 pH 2.0、2.3、7.0、11.5', () => {
    expect(pondPH(0).toFixed(1)).toBe('2.0'); expect(pondPH(20).toFixed(1)).toBe('2.3'); expect(pondPH(37)).toBe(7); expect(pondPH(50).toFixed(1)).toBe('11.5')
  })
  it('拓展：紫甘蓝汁遇酸红、遇碱绿；中和后约升高 3.4 °C', () => { expect(cabbage(1)).toBe('red'); expect(cabbage(12)).toBe('green'); expect(heatRise().toFixed(1)).toBe('3.4') })
})
