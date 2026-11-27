// 带电粒子在磁场中实验室的计算核对：这里的数字要和规格卡 docs/specs/bfield.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  AMP, BULB, CYC, CYCLO, MEV, SEL, ampForce, ampereSide, arc, bulbPeriod, bulbRadius, crtBend, crtRadius, crtSpeed, cycloEk, cycloFreq, cycloTurns,
  lorentzDir, mhdVoltage, orbitPeriod, orbitRadius, selSpeed, selectorPath, specLine, specRatio, swingAngle, turnSign, sci, ionMass,
} from './physics'

describe('第 1 课 安培力', () => {
  it('B = 0.20 T、L = 0.10 m、I = 3 A 时 F = BIL = 0.060 N', () => { expect(ampForce(3)).toBeCloseTo(0.06, 9) })
  it('电流加倍，安培力加倍', () => { expect(ampForce(2) / ampForce(1)).toBeCloseTo(2, 9) })
  it('10 g 的导体棒、1 A 时偏开约 11.5°', () => { expect(swingAngle(ampForce(1)) * 180 / Math.PI).toBeCloseTo(11.5, 1) })
  it('电流反向或磁场反向，力反向；都反向，力不变', () => {
    expect(ampereSide(-1, 1)).toBe(-ampereSide(1, 1)); expect(ampereSide(1, -1)).toBe(-ampereSide(1, 1)); expect(ampereSide(-1, -1)).toBe(ampereSide(1, 1))
  })
  it('导体棒的质量和长度取规格卡的值', () => { expect(AMP.m).toBe(0.01); expect(AMP.L).toBe(0.1) })
})

describe('第 2 课 洛伦兹力', () => {
  it('2000 V 加速后的电子速度约 2.65×10⁷ m/s', () => { expect(crtSpeed() / 1e7).toBeCloseTo(2.65, 2) })
  it('2.0 mT 中的轨道半径约 7.5 cm', () => { expect(crtRadius() * 100).toBeCloseTo(7.54, 1) })
  it('N 极从前面靠近，电子束向下弯；S 极向上', () => { expect(crtBend('N')).toBe(-1); expect(crtBend('S')).toBe(1) })
  it('洛伦兹力和速度垂直，所以不做功', () => {
    const v: [number, number, number] = [0.6, 0.8, 0], f = lorentzDir(-1, v, [0, 0, 1])
    expect(f[0] * v[0] + f[1] * v[1] + f[2] * v[2]).toBeCloseTo(0, 12)
  })
})

describe('第 3 课 匀速圆周运动的半径', () => {
  it('B = 0.60 mT、U = 75 V 时 r ≈ 4.9 cm', () => { expect(bulbRadius(BULB.B0, BULB.U0) * 100).toBeCloseTo(4.87, 1) })
  it('B 加倍，半径减半；再把速度加倍（U 变 4 倍），半径回到原来', () => {
    expect(bulbRadius(2 * BULB.B0, BULB.U0)).toBeCloseTo(bulbRadius(BULB.B0, BULB.U0) / 2, 9)
    expect(bulbRadius(2 * BULB.B0, 4 * BULB.U0)).toBeCloseTo(bulbRadius(BULB.B0, BULB.U0), 9)
  })
  it('电子的周期约 59.5 ns，和加速电压无关', () => { expect(bulbPeriod(BULB.B0) * 1e9).toBeCloseTo(59.5, 0) })
  it('圆弧走一整圈回到出发点', () => { const e = arc([0, 0], 0, 0.05, 1, 2 * Math.PI * 0.05); expect(e.p[0]).toBeCloseTo(0, 9); expect(e.p[1]).toBeCloseTo(0, 9) })
  it('正电荷在指向纸外的磁场里顺时针转，负电荷逆时针', () => { expect(turnSign(1, 1)).toBe(-1); expect(turnSign(-1, 1)).toBe(1) })
})

describe('第 4 课 周期与速度无关', () => {
  it('质子在 0.50 T 中，v = 2.0×10⁶ m/s 时 r ≈ 4.18 cm，3 倍速度半径 3 倍', () => {
    expect(orbitRadius('proton', CYC.B0, CYC.v0) * 100).toBeCloseTo(4.18, 2)
    expect(orbitRadius('proton', CYC.B0, 3 * CYC.v0) / orbitRadius('proton', CYC.B0, CYC.v0)).toBeCloseTo(3, 9)
  })
  it('质子的周期约 131 ns；磁场加倍周期减半', () => {
    expect(orbitPeriod('proton', 0.5) * 1e9).toBeCloseTo(131.2, 0)
    expect(orbitPeriod('proton', 1) / orbitPeriod('proton', 0.5)).toBeCloseTo(0.5, 9)
  })
  it('α 粒子比荷约为质子的一半，同一磁场中周期约为两倍', () => { expect(orbitPeriod('alpha', 1) / orbitPeriod('proton', 1)).toBeCloseTo(1.986, 2) })
})

describe('第 5 课 速度选择器', () => {
  it('E = 200 V ÷ 0.020 m = 1.0×10⁴ V/m，B = 0.10 T，v = E/B = 1.0×10⁵ m/s', () => { expect(selSpeed()).toBeCloseTo(1e5, 3); expect(SEL.B).toBe(0.1) })
  it('只加电场：质子打在下板（负极板）', () => { expect(selectorPath('mid', true, false).hit).toBe('bottom') })
  it('电场、磁场都加：速度正好的质子直线通过，快的往上偏，慢的往下偏', () => {
    expect(selectorPath('mid', true, true).hit).toBeNull(); expect(selectorPath('fast', true, true).hit).toBe('top'); expect(selectorPath('slow', true, true).hit).toBe('bottom')
  })
  it('速度选择器不挑电性：速度为 E/B 的电子也直线通过', () => { expect(selectorPath('electron', true, true).hit).toBeNull() })
})

describe('第 6 课 质谱仪', () => {
  it('U = 1000 V、B = 0.20 T：氖 20 的谱线距狭缝约 20.4 cm，氖 22 约 21.4 cm', () => {
    expect(specLine('ne20') * 100).toBeCloseTo(20.36, 1); expect(specLine('ne22') * 100).toBeCloseTo(21.35, 1)
  })
  it('由谱线位置算出的比荷等于 e/m', () => { expect(specRatio(specLine('ne20'))).toBeCloseTo(1.602176634e-19 / ionMass('ne20'), -2) })
  it('电压加倍，谱线外移到 √2 倍，算出的比荷不变', () => {
    expect(specLine('ne20', 2000) / specLine('ne20')).toBeCloseTo(Math.SQRT2, 9)
    expect(specRatio(specLine('ne20', 2000), 2000)).toBeCloseTo(specRatio(specLine('ne20')), -2)
  })
})

describe('第 7 课 回旋加速器', () => {
  it('B = 1.0 T 时交变电压的频率约 15.2 MHz（等于回旋频率）', () => { expect(cycloFreq() / 1e6).toBeCloseTo(15.25, 1) })
  it('D 形盒半径 0.50 m：最大动能约 12.0 MeV；0.30 m：约 4.3 MeV', () => {
    expect(cycloEk(0.5) / MEV).toBeCloseTo(11.97, 1); expect(cycloEk(0.3) / MEV).toBeCloseTo(4.31, 1)
  })
  it('电压 100 kV 时转 60 圈；电压加倍，圈数减半，最大动能不变', () => {
    expect(cycloTurns(0.5)).toBe(60); expect(cycloTurns(0.5, 2 * CYCLO.U)).toBe(30)
  })
})

describe('拓展 磁流体发电机', () => {
  it('B = 1.0 T、d = 0.20 m、v = 1000 m/s：U = Bdv = 200 V', () => { expect(mhdVoltage()).toBeCloseTo(200, 9) })
  it('科学记数法的写法', () => { expect(sci(1.312e-7)).toBe('1.3×10⁻⁷'); expect(sci(9.96e6)).toBe('1.0×10⁷') })
})
