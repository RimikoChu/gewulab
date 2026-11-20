// 原电池实验室的计算核对：这里的数字要和规格卡 docs/specs/battery.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { RUN_MIN, SETUPS, currentAt, emf, fuelRuns, negativeOf, perElectrons, reactsWithAcid, works } from './physics'

describe('原电池', () => {
  it('第 1 课：锌能和稀硫酸反应，铜不能；锌和铜组成电池时锌是负极', () => { expect(reactsWithAcid('Zn')).toBe(true); expect(reactsWithAcid('Cu')).toBe(false); expect(negativeOf('Zn', 'Cu')).toBe('Zn') })
  it('第 2 课：转移 2 摩尔电子，溶解 65 克锌，生成 2 克（标准状况 22.4 升）氢气', () => { expect(perElectrons(2)).toEqual({ zn: 65, h2: 2, liters: 22.4 }) })
  it('第 3 课：四种装置里只有第一种能形成原电池', () => { expect((['ok', 'same', 'alcohol', 'apart'] as const).map(k => works(SETUPS[k]))).toEqual([true, false, false, false]) })
  it('第 4 课：锌铜 1.10 伏、铁铜 0.78 伏、锌铁 0.32 伏、镁铜 2.71 伏；更活泼的做负极', () => {
    expect(emf('Zn', 'Cu')).toBe(1.1); expect(emf('Fe', 'Cu')).toBe(0.78); expect(emf('Zn', 'Fe')).toBe(0.32); expect(emf('Mg', 'Cu')).toBe(2.71)
    expect(negativeOf('Fe', 'Cu')).toBe('Fe'); expect(negativeOf('Zn', 'Fe')).toBe('Zn'); expect(negativeOf('Cu', 'Cu')).toBe(null)
  })
  it('第 5 课：10 分钟后，单液电池的电流掉到约 32，用盐桥的还有 96', () => { expect(currentAt(false, RUN_MIN)).toBeCloseTo(32.5, 1); expect(currentAt(true, RUN_MIN)).toBe(96); expect(currentAt(false, 0)).toBe(100) })
  it('第 7 课：氢气和氧气都通进去才有电', () => { expect(fuelRuns(true, true)).toBe(true); expect(fuelRuns(true, false)).toBe(false); expect(fuelRuns(false, true)).toBe(false) })
})
