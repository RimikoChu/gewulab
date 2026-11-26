// 天气和气候实验室的计算核对：这里的数字要和规格卡 docs/specs/climate.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  FORECAST, MOUNT, OBS_HOURS, RAIN_DAYS, SLOPE_RAIN, STATION_ALT, TEMP, annual, annualMeanTemp, bottleMl, coldest, cupsFor, dailyMean, dailyRange,
  dayTemp, hottest, lapse, rainGrade, rainModel, rainySeason, readAt, snowLine, stopTemp, tempModel, yearRange, T_MAX, T_MIN,
} from './physics'

describe('天气和气候', () => {
  it('第 1 课：三天的预报和多年平均', () => {
    expect([FORECAST.today.text, FORECAST.tomorrow.text, FORECAST.after.text]).toEqual(['晴', '小雨', '多云'])
    expect(Math.round(annualMeanTemp())).toBe(12)
    expect(annual()).toBe(562)
  })
  it('第 2 课：四次读数 19.1、21.0、30.0、25.9 ℃，日平均 24.0 ℃', () => {
    const xs = OBS_HOURS.map(readAt)
    expect(xs).toEqual([19.1, 21.0, 30.0, 25.9])
    expect(dailyMean(xs)).toBe(24.0)
  })
  it('第 2 课：最高 30 ℃ 在 14 时，最低 18 ℃ 在 5 时，日较差 12 ℃', () => {
    let hi = -99, hiH = 0, lo = 99
    for (let h = 0; h < 24; h += 0.25) { const t = dayTemp(h); if (t > hi) { hi = t; hiH = h } lo = Math.min(lo, t) }
    expect(hiH).toBe(14); expect(hi).toBeCloseTo(30, 6); expect(lo).toBeCloseTo(18, 6)
    expect(dailyRange(T_MAX, T_MIN)).toBe(12)
  })
  it('第 3 课：7 月山脚 27 ℃，山腰 2700 m 12 ℃，山顶 4700 m 0 ℃', () => {
    expect(TEMP[6]).toBe(27)
    expect(lapse(27, STATION_ALT, MOUNT.mid)).toBe(12)
    expect(lapse(27, STATION_ALT, MOUNT.peak)).toBe(0)
  })
  it('第 3 课：7 月同纬度陆地比海洋热，1 月陆地比海洋冷；低纬比高纬热', () => {
    expect(tempModel(45, 1, 7)).toBeGreaterThan(tempModel(45, 0, 7))
    expect(tempModel(45, 1, 1)).toBeLessThan(tempModel(45, 0, 1))
    expect(tempModel(0, 0.5, 7)).toBeGreaterThan(tempModel(60, 0.5, 7))
  })
  it('第 4 课：6.4 mm 小雨，储水瓶约 201 mL；18.0 mm 中雨；52.0 mm 暴雨分 6 杯', () => {
    expect(rainGrade(RAIN_DAYS.d3.mm)).toBe('小雨'); expect(bottleMl(6.4)).toBe(201)
    expect(rainGrade(RAIN_DAYS.d9.mm)).toBe('中雨')
    expect(rainGrade(RAIN_DAYS.d21.mm)).toBe('暴雨')
    expect(cupsFor(52)).toEqual([10, 10, 10, 10, 10, 2])
    expect(rainGrade(30)).toBe('大雨')
  })
  it('第 5 课：迎风坡山腰 1450 mm，背风坡山脚 200 mm；赤道多雨、回归线西岸少雨、内陆少雨', () => {
    expect(SLOPE_RAIN.mid).toBe(1450); expect(SLOPE_RAIN.lee).toBe(200)
    expect(rainModel(0, 0.2, 0, 0)).toBeGreaterThan(0.6)
    expect(rainModel(24, 0.2, 1, 0)).toBeLessThan(rainModel(24, 0.2, 0, 1))
    expect(rainModel(40, 0.9, 0, 0)).toBeLessThan(rainModel(40, 0, 0, 0))
  })
  it('第 6 课：最热 7 月 27 ℃，最冷 1 月 −4 ℃，年较差 31 ℃，雨季 6–8 月', () => {
    expect(hottest()).toEqual({ i: 6, t: 27 }); expect(coldest()).toEqual({ i: 0, t: -4 })
    expect(yearRange()).toBe(31)
    expect(rainySeason()).toEqual([5, 7])
  })
  it('拓展：山口 4370 m 2 ℃，背风坡山脚 600 m 24.6 ℃；雪线 7 月 4700 m，4 月约 2530 m', () => {
    expect(stopTemp('pass')).toBe(2); expect(stopTemp('lee')).toBe(24.6)
    expect(snowLine(27)).toBe(4700); expect(snowLine(TEMP[3])).toBe(2533)
  })
})
