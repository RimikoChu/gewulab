// 物态变化实验室的计算核对：这里的数字要和规格卡 docs/specs/phase.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BATH, BOIL, CHANGES, CHANGE_KEYS, COOL, CUPS, NATURE, PAIRS, ROOM, SYRINGE, afterOff, boilAt, boilT, boilTotal, boilsAgain, bubbles, byHeat, celsiusStep, changeOf, coolT, dryIceLeft, dryTime, etherLiquid, flaskT, follow, frostOn, heatT, hypoReach, iodineBack, iodineGas, liquidLeft, meltFrac, readT, reverseOf, samples, stateName, steady, waterLeft, wetT } from './physics'

describe('物态变化', () => {
  it('第 1 课：三只杯子是 0 ℃、35 ℃、68 ℃；0 到 100 ℃ 分成 100 份，每份 1 ℃', () => {
    expect([CUPS.ice.T, CUPS.warm.T, CUPS.hot.T]).toEqual([0, 35, 68]); expect(celsiusStep()).toBe(1)
  })
  it('第 1 课：示数向液体的温度靠拢，够久以后稳定在那里；拿出来以后往室温掉', () => {
    let T = ROOM; for (let i = 0; i < 100; i++) T = follow(T, CUPS.hot.T, 0.1, 1)
    expect(steady(T, CUPS.hot.T)).toBe(true); expect(readT(T)).toBe(68)
    expect(follow(68, ROOM, 2, 2)).toBeLessThan(68); expect(follow(68, ROOM, 2, 2)).toBeGreaterThan(ROOM)
  })
  it('第 2 课：海波从 40 ℃ 起每分钟升 2 ℃，第 4 分钟到 48 ℃，停 4 分钟，第 12 分钟到 56 ℃', () => {
    expect(hypoReach()).toBe(4)
    expect([0, 2, 4, 6, 8, 10, 12].map(t => heatT('hypo', t))).toEqual([40, 44, 48, 48, 48, 52, 56])
    expect([meltFrac('hypo', 4), meltFrac('hypo', 6), meltFrac('hypo', 8)]).toEqual([0, 0.5, 1])
    expect(stateName('hypo', meltFrac('hypo', 6))).toBe('固液共存')
  })
  it('第 2 课：石蜡从 40 ℃ 一直升到 56 ℃，每一分钟都比上一分钟高，没有停住的一段', () => {
    expect(heatT('wax', 0)).toBeCloseTo(40, 6); expect(heatT('wax', BATH.total)).toBeCloseTo(56, 6)
    for (let t = 1; t <= BATH.total; t++) expect(heatT('wax', t) - heatT('wax', t - 1)).toBeGreaterThan(0.5)
  })
  it('第 2 课：海波冷却时在 48 ℃ 凝固，凝固点和熔点相同；每分钟记一个点', () => {
    expect([0, 4, 6, 8, 12].map(coolT)).toEqual([56, 48, 48, 48, 40]); expect(liquidLeft(6)).toBe(0.5)
    expect(samples(t => heatT('hypo', t), 5.4)).toEqual([[0, 40], [1, 42], [2, 44], [3, 46], [4, 48], [5, 48]])
  })
  it('第 3 课：对照的水滴 12 秒蒸发完；加热的 4 秒，摊开的 6 秒，吹风的 4.8 秒', () => {
    expect(dryTime()).toBe(12); expect(dryTime('temp')).toBe(4); expect(dryTime('area')).toBe(6); expect(dryTime('wind')).toBeCloseTo(4.8, 6)
    expect(waterLeft(4, 'temp')).toBe(0); expect(waterLeft(4)).toBeCloseTo(2 / 3, 6)
  })
  it('第 3 课：蘸了酒精的温度计从 20 ℃ 最低降到 14 ℃，然后回升', () => {
    expect(wetT(0)).toBe(20); expect(wetT(COOL.at)).toBeCloseTo(14, 6); expect(wetT(COOL.end)).toBeGreaterThan(17)
  })
  it('第 4 课：水从 90 ℃ 起每分钟升 2 ℃，第 5 分钟到 100 ℃，以后不再升；共记 9 分钟', () => {
    expect(boilAt()).toBe(5); expect(boilTotal()).toBe(9)
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(boilT)).toEqual([90, 92, 94, 96, 98, 100, 100, 100])
    expect(afterOff(BOIL, 2)).toBe(98)
  })
  it('第 4 课：沸腾前气泡越升越小，沸腾时越升越大，不加热就没有', () => {
    expect(bubbles(90, true).kind).toBe('none'); expect(bubbles(96, true)).toEqual({ kind: 'before', vigor: 0.5 })
    expect(bubbles(100, true).kind).toBe('boil'); expect(bubbles(100, false).kind).toBe('none')
  })
  it('第 5 课：注射器从 20 mL 推到 12 mL 开始出现液态乙醚，推到 5 mL 全部液化', () => {
    expect(etherLiquid(SYRINGE.open)).toBe(0); expect(etherLiquid(12)).toBe(0); expect(etherLiquid(8.5)).toBe(0.5); expect(etherLiquid(SYRINGE.shut)).toBe(1)
  })
  it('第 6 课：碘受热变成蒸气，遇冷又全部变回固体；干冰 12 秒升华完，罐壁的霜越长越多', () => {
    expect(iodineGas(0)).toBe(0); expect(iodineGas(7)).toBeCloseTo(0.7, 6); expect(iodineBack(0.7, 7)).toBeCloseTo(0, 6)
    expect(dryIceLeft(6)).toBe(0.5); expect(dryIceLeft(12)).toBe(0); expect(frostOn(9)).toBe(1); expect(frostOn(1)).toBe(0)
  })
  it('第 7 课：六种物态变化，三种吸热、三种放热，互为逆过程的一吸一放', () => {
    expect(CHANGE_KEYS.length).toBe(6)
    expect(byHeat('吸热').map(k => CHANGES[k].name)).toEqual(['熔化', '汽化', '升华'])
    expect(byHeat('放热').map(k => CHANGES[k].name)).toEqual(['凝固', '液化', '凝华'])
    expect(changeOf('固态', '气态')).toBe('sublime'); expect(reverseOf('sublime')).toBe('deposit')
    for (const k of CHANGE_KEYS) expect(CHANGES[reverseOf(k)].heat).not.toBe(CHANGES[k].heat)
  })
  it('第 7 课：山上的六处现象各对一种变化，一种都不重复；露和雾是液化，霜和雪是凝华', () => {
    expect(new Set(NATURE.map(n => n.is)).size).toBe(6)
    expect(NATURE.find(n => n.key === 'dew')!.is).toBe('liquefy'); expect(NATURE.find(n => n.key === 'frost')!.is).toBe('deposit')
    expect(PAIRS.flatMap(p => p.keys).length).toBe(6)
  })
  it('拓展：烧瓶里的水停止加热 4 分钟后是 96 ℃，不抽气不沸腾，抽气后又沸腾', () => {
    expect(flaskT()).toBe(96); expect(boilsAgain(false)).toBe(false); expect(boilsAgain(true)).toBe(true)
  })
})
