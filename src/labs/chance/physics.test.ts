// 概率实验室的计算核对：这里的数字要和规格卡 docs/specs/chance.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BATCH, batchDefects, both5, bowls, cardProb, count, diceProb, dieProb, draws1, flips, fracText, kind1, needles, piEstimate, rateEstimate, rng, running, tacks, tree5, wheelProb } from './physics'

describe('概率', () => {
  it('固定种子：同一个种子两次给出同一串数', () => {
    const a = rng(7), b = rng(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(fracText(6, 36)).toBe('6/36 = 1/6'); expect(fracText(0, 6)).toBe('0/6 = 0'); expect(fracText(11, 36)).toBe('11/36')
  })
  it('第 1 课：甲箱摸到红球是必然事件，乙箱不可能，丙箱随机；丙箱两轮结果不一样', () => {
    expect(kind1('jia')).toBe('必然事件'); expect(kind1('yi')).toBe('不可能事件'); expect(kind1('bing')).toBe('随机事件')
    expect(draws1('jia').every(b => b === 'red')).toBe(true); expect(draws1('yi').every(b => b === 'white')).toBe(true)
    const r0 = draws1('bing', 0), r1 = draws1('bing', 1)
    expect(r0).not.toEqual(r1); expect(r0).toContain('white'); expect(r0).toContain('red'); expect(r1).toContain('white')
  })
  it('第 2 课：点数为 6 是 1/6，偶数 1/2，小于 7 是 1，点数为 7 是 0', () => {
    expect(dieProb('six').text).toBe('1/6'); expect(dieProb('even').p).toBeCloseTo(0.5, 9)
    expect(dieProb('lt7').p).toBe(1); expect(dieProb('seven').p).toBe(0)
  })
  it('第 3 课：8 格里 3 格红，P(红) = 3/8，P(不是红) = 5/8；13 张里抽到 J、Q、K 是 3/13', () => {
    expect(wheelProb('red')).toMatchObject({ m: 3, n: 8 }); expect(wheelProb('notRed')).toMatchObject({ m: 5, n: 8 })
    expect(wheelProb('red').p + wheelProb('notRed').p).toBeCloseTo(1, 9)
    expect(cardProb()).toMatchObject({ m: 3, n: 13 })
  })
  it('第 4 课：两枚骰子 36 种结果；点数相同 6/36，和是 9 有 4/36，至少一枚是 2 有 11/36', () => {
    expect(diceProb('same')).toMatchObject({ m: 6, n: 36 }); expect(diceProb('sum9')).toMatchObject({ m: 4, n: 36 }); expect(diceProb('has2')).toMatchObject({ m: 11, n: 36 })
  })
  it('第 5 课：放回 9 种结果、两次都白 4/9；不放回 6 种、两次都白 2/6 = 1/3', () => {
    expect(tree5('back')).toHaveLength(9); expect(both5('back')).toMatchObject({ m: 4, n: 9 })
    expect(tree5('keep')).toHaveLength(6); expect(both5('keep')).toMatchObject({ m: 2, n: 6 })
  })
  it('第 6 课：第一组 10 次 0.7、1000 次 0.506；第二组 10 次 0.3、1000 次 0.504，都在 0.5 附近', () => {
    const a = running(flips('a')), b = running(flips('b'))
    expect(a[9]).toBeCloseTo(0.7, 9); expect(a[999]).toBeCloseTo(0.506, 9)
    expect(b[9]).toBeCloseTo(0.3, 9); expect(b[999]).toBeCloseTo(0.504, 9)
    expect(Math.abs(a[999] - 0.5)).toBeLessThan(Math.abs(a[9] - 0.5))
  })
  it('第 7 课：抽检 50、200、1000 只，次品 3、9、39 只；次品率约 0.04，10000 只里约 400 只次品', () => {
    const b = bowls()
    expect([50, 200, 1000].map(n => count(b, n))).toEqual([3, 9, 39])
    expect(rateEstimate(39, 1000)).toBe(0.04); expect(batchDefects(0.04)).toBe(400); expect(BATCH).toBe(10000)
  })
  it('拓展：投 1000 根针相交 320 根，π ≈ 3.125；图钉 1000 次钉尖朝上 600 次', () => {
    const d = needles(), m = d.filter(x => x.hit).length
    expect(m).toBe(320); expect(piEstimate(1000, m)).toBeCloseTo(3.125, 9)
    expect(count(tacks(), 1000)).toBe(600)
  })
})
