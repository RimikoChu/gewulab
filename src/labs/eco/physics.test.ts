// 生态系统实验室的计算核对：这里的数字要和规格卡 docs/specs/eco.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { DARK, WOODLICE, average, brightAt, chainsOf, checkChain, energyAt, levelsOf, relation, roleOf, simulate, summary, toxinAt, RATES, CARBON, lastsLonger, STRONGEST } from './physics'

describe('生态系统', () => {
  it('第 1 课：10 次统计，阴暗一侧平均 8.2 只', () => {
    expect(DARK.length).toBe(10)
    expect(average(DARK)).toBeCloseTo(8.2, 6)
    expect(brightAt(0)).toBe(WOODLICE - 6)
  })
  it('第 2 课：蘑菇是分解者，草是生产者，阳光是非生物部分', () => {
    expect(roleOf('蘑菇')).toBe('decomposer'); expect(roleOf('草')).toBe('producer'); expect(roleOf('阳光')).toBe('abiotic'); expect(roleOf('蝗虫')).toBe('consumer')
  })
  it('第 3 课：食物链的写法', () => {
    expect(checkChain(['草', '兔', '狐']).ok).toBe(true)
    expect(checkChain(['草', '鼠', '蛇', '鹰']).ok).toBe(true)
    expect(checkChain(['草', '兔', '狐', '蘑菇']).ok).toBe(false)
    expect(checkChain(['阳光', '草', '兔']).ok).toBe(false)
    expect(checkChain(['狐', '兔', '草']).ok).toBe(false)
  })
  it('第 4 课：食物网里有 5 条食物链，鹰是第三、第四营养级，鹰和蛇既捕食又竞争', () => {
    expect(chainsOf().length).toBe(5)
    expect(levelsOf('鹰')).toEqual([3, 4])
    expect(relation('鹰', '蛇')).toEqual(['捕食', '竞争'])
  })
  it('第 5 课：10% 时鹰得到 10 kJ，20% 时 80 kJ', () => {
    expect(energyAt(2, RATES.low)).toBeCloseTo(1000, 6)
    expect(energyAt(4, RATES.low)).toBeCloseTo(10, 6)
    expect(energyAt(3, RATES.high)).toBeCloseTo(400, 6)
    expect(energyAt(4, RATES.high)).toBeCloseTo(80, 6)
  })
  it('第 6 课：碳走一圈回到空气；鹰体内有毒物质是草的 1000 倍', () => {
    expect(CARBON[0].at).toBe('空气'); expect(CARBON[CARBON.length - 1].at).toBe('空气')
    expect(toxinAt(4)).toBe(1000)
  })
  it('第 7 课：不捕杀基本不变', () => {
    const e = summary(simulate('none')).end
    expect(e.grass).toBeGreaterThan(78); expect(e.grass).toBeLessThan(82); expect(e.rabbit).toBeGreaterThan(190); expect(e.rabbit).toBeLessThan(210)
  })
  it('第 7 课：少量捕杀，兔先增到约 285 只又回落，草回到约 80%', () => {
    const s = summary(simulate('some'))
    expect(s.maxRabbit).toBeGreaterThan(270); expect(s.maxRabbit).toBeLessThan(300)
    expect(s.end.grass).toBeGreaterThan(76); expect(s.end.rabbit).toBeLessThan(220)
  })
  it('第 7 课：大量捕杀，兔第 3 年前后多到约 630 只，草跌到约 6%，兔随后锐减', () => {
    const p = simulate('many'), s = summary(p)
    expect(s.maxRabbit).toBeGreaterThan(600); expect(s.maxRabbit).toBeLessThan(660)
    expect(s.maxYear).toBeGreaterThan(2.5); expect(s.maxYear).toBeLessThan(4)
    expect(s.minGrass).toBeLessThan(8)
    expect(Math.min(...p.filter(x => x.year > 6).map(x => x.rabbit))).toBeLessThan(180)
    expect(s.end.grass).toBeLessThan(30)
  })
  it('拓展：光下的生态瓶活得久，森林的调节能力最强', () => { expect(lastsLonger()).toBe('light'); expect(STRONGEST).toBe('forest') })
})
