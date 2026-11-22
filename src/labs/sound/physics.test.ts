// 声现象实验室的计算核对：这里的数字要和规格卡 docs/specs/sound.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { AIR, AMPS, FAR, FORK_HZ, NEAR, SONAR_T, band, canTell, echoDistance, echoTime, frontAt, heard, heardWord, level, noiseAfter, period, pitchWord, rate, resonates, seaDepth, sounding, sweep, verdict, wave } from './physics'

describe('声现象', () => {
  it('第 1 课：音叉每秒振动 440 次，振动一次约 2.27 毫秒；不振动就不发声', () => { expect(period(FORK_HZ) * 1000).toBeCloseTo(2.27, 2); expect(sounding(true)).toBe(true); expect(sounding(false)).toBe(false) })
  it('第 2 课：罩里的空气从 100% 抽到 50%、5%，听到的铃声越来越轻；没有空气就听不到', () => {
    expect(AIR.map(a => heard(a))).toEqual([1, 0.5, 0.05]); expect(heard(0)).toBe(0)
    expect(AIR.map(a => heardWord(a))).toEqual(['清楚', '变轻了', '几乎听不到']); expect(heardWord(0)).toBe('听不到')
  })
  it('第 3 课：声速 340 m/s，墙在 17、34、68 m 处，回声晚到 0.1、0.2、0.4 s', () => { expect(echoTime(17)).toBeCloseTo(0.1, 9); expect(echoTime(34)).toBeCloseTo(0.2, 9); expect(echoTime(68)).toBeCloseTo(0.4, 9) })
  it('第 3 课：0.1 s 正好能分辨，对应 17 m；再近就和原声混在一起', () => { expect(echoDistance(0.1)).toBeCloseTo(17, 9); expect(canTell(echoTime(17))).toBe(true); expect(canTell(echoTime(10))).toBe(false) })
  it('第 3 课：波前先走到墙再折回来', () => { expect(frontAt(0.05, 34)).toBeCloseTo(17, 9); expect(frontAt(0.1, 34)).toBeCloseTo(34, 9); expect(frontAt(0.15, 34)).toBeCloseTo(17, 9); expect(frontAt(0.3, 34)).toBe(0) })
  it('第 4 课：钢尺伸出 20、15、10 cm，振动的快慢是 1 倍、约 1.8 倍、4 倍', () => { expect(rate(20)).toBe(1); expect(rate(15)).toBeCloseTo(1.78, 2); expect(rate(10)).toBe(4); expect(pitchWord(20)).toBe('低'); expect(pitchWord(10)).toBe('高') })
  it('第 5 课：轻敲近处 74 dB，重敲近处约 80 dB，重敲远处约 74 dB，轻敲远处约 68 dB', () => {
    expect(level(AMPS.soft, NEAR)).toBe(74); expect(level(AMPS.hard, NEAR)).toBeCloseTo(80.02, 2); expect(level(AMPS.hard, FAR)).toBeCloseTo(74, 6); expect(level(AMPS.soft, FAR)).toBeCloseTo(67.98, 2)
  })
  it('第 6 课：三种乐器的波形周期相同、最大值相同，形状不同；音叉是正弦波', () => {
    for (const k of ['fork', 'guitar', 'flute'] as const) {
      expect(wave(k, 1.3 + Math.PI * 2)).toBeCloseTo(wave(k, 1.3), 9)
      let m = 0; for (let i = 0; i < 720; i++) m = Math.max(m, Math.abs(wave(k, i / 720 * Math.PI * 2))); expect(m).toBeCloseTo(1, 6)
    }
    expect(wave('fork', 0.7)).toBeCloseTo(Math.sin(0.7), 9); expect(Math.abs(wave('guitar', 0.7) - wave('fork', 0.7))).toBeGreaterThan(0.05); expect(Math.abs(wave('flute', 0.7) - wave('guitar', 0.7))).toBeGreaterThan(0.02)
  })
  it('第 7 课：90 dB 的噪声，每用一种办法降 15 dB：75、60、45 dB', () => {
    expect([0, 1, 2, 3].map(noiseAfter)).toEqual([90, 75, 60, 45])
    expect(verdict(90)).toBe('长期听会损害听力'); expect(verdict(75)).toBe('干扰谈话，影响工作'); expect(verdict(60)).toBe('影响休息和睡眠'); expect(verdict(45)).toBe('比较安静')
  })
  it('拓展：人能听到 20 到 20000 Hz；低于的是次声波，高于的是超声波', () => { expect(band(10)).toBe('次声波'); expect(band(20)).toBe('听得见'); expect(band(440)).toBe('听得见'); expect(band(20000)).toBe('听得见'); expect(band(40000)).toBe('超声波'); expect(sweep(0)).toBe(2); expect(sweep(1)).toBeCloseTo(200000, 3) })
  it('拓展：超声波在海水里来回用了 4 s，海深 3000 m；频率相同的两支音叉才共鸣', () => { expect(seaDepth(SONAR_T)).toBe(3000); expect(resonates(440, 440)).toBe(true); expect(resonates(440, 256)).toBe(false) })
})
