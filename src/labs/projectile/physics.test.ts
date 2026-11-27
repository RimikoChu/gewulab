// 抛体运动实验室的计算核对：这里的数字要和规格卡 docs/specs/projectile.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { airdrop, apexOf, boatAt, CANNON, cross, DRONE, fallTime, flat, flightTime, fly, forceDirAt, HEADS, HELI, heightAt, HILL, hitX, judge, landOn, MARKS, overshoot, profile, RAMP, rangeOf, roadAt, slopeThrow, strobeTimes, tangentAt, v0From, windDrop } from './physics'

describe('抛体运动', () => {
  it('第 1 课：A、B、C 三点的速度方向和合力方向', () => {
    expect(roadAt(MARKS[0].s).heading).toBeCloseTo(45, 6); expect(roadAt(MARKS[1].s).heading).toBeCloseTo(90, 6); expect(roadAt(MARKS[2].s).heading).toBeCloseTo(45, 6)
    const [tx, tz] = tangentAt(MARKS[0].s), f = forceDirAt(MARKS[0].s)!
    expect(tx * f[0] + tz * f[1]).toBeCloseTo(0, 9)            // 弯道上合力垂直于速度
    expect(forceDirAt(MARKS[1].s)).toBeNull()                    // 直道上合力为零
    expect(forceDirAt(MARKS[2].s)![1]).toBeLessThan(0)           // 右弯：合力指向右边
    expect(f[1]).toBeGreaterThan(0)
  })
  it('第 2 课：船头正对对岸 6 s 到、下漂 18 m；偏向上游 37° 时 7.5 s、正对岸靠岸', () => {
    const a = cross(HEADS.straight.angle), b = cross(HEADS.up.angle)
    expect(a.time).toBeCloseTo(6, 9); expect(a.drift).toBeCloseTo(18, 9); expect(a.v).toBeCloseTo(5.83, 2); expect(a.path).toBeCloseTo(34.99, 2)
    expect(HEADS.up.angle).toBeCloseTo(36.87, 2); expect(b.v).toBeCloseTo(4, 9); expect(b.time).toBeCloseTo(7.5, 9); expect(b.drift).toBeCloseTo(0, 9); expect(b.path).toBeCloseTo(30, 9)
    expect(boatAt(0, 3)).toEqual([9, 15])
  })
  it('第 3 课：19.6 m 高处落下用 2 s，和水平速度无关；每 0.5 s 的位置', () => {
    expect(fallTime(DRONE.h)).toBeCloseTo(2, 9)
    expect(strobeTimes(DRONE.h, DRONE.strobe)).toEqual([0, 0.5, 1, 1.5, 2])
    expect([0.5, 1, 1.5, 2].map(t => flat(10, t).x)).toEqual([5, 10, 15, 20])
    expect([0.5, 1, 1.5, 2].map(t => +flat(10, t).drop.toFixed(3))).toEqual([1.225, 4.9, 11.025, 19.6])
    expect(flat(5, 2).x).toBeCloseTo(10, 9)
  })
  it('第 4 课：三个点 (12, 4.9)、(24, 19.6)、(36, 44.1) cm，求得 v0 = 1.2 m/s', () => {
    expect(RAMP.drops.map(d => +hitX(d).toFixed(4))).toEqual([0.12, 0.24, 0.36])
    expect(v0From(0.24, 0.196)).toBeCloseTo(1.2, 9)
  })
  it('第 5 课：19.6 m 高提前 40 m，44.1 m 高提前 60 m；落地速度', () => {
    expect(airdrop(HELI.heights.low).x).toBeCloseTo(40, 9); expect(airdrop(HELI.heights.high).t).toBeCloseTo(3, 9); expect(airdrop(HELI.heights.high).x).toBeCloseTo(60, 9)
    expect(overshoot(HELI.heights.high, 40)).toBeCloseTo(20, 9); expect(overshoot(HELI.heights.high, 60)).toBeCloseTo(0, 9)
    const d = airdrop(HELI.heights.high); expect(d.vy).toBeCloseTo(29.4, 9); expect(d.v).toBeCloseTo(35.56, 2); expect(d.dip).toBeCloseTo(55.8, 1)
  })
  it('第 6 课：14 m/s 时 30°、45°、60° 的射程和射高', () => {
    expect(CANNON.angles.map(a => +rangeOf(CANNON.v0, a).toFixed(2))).toEqual([17.32, 20, 17.32])
    expect(CANNON.angles.map(a => +apexOf(CANNON.v0, a).toFixed(2))).toEqual([2.5, 5, 7.5])
    expect(flightTime(14, 45)).toBeCloseTo(2.02, 2)
    expect(fly(14, 45, flightTime(14, 45)).y).toBeCloseTo(0, 9)
  })
  it('第 7 课：21 m/s、45° 正中火点；别的组合打不中', () => {
    expect(heightAt(21, 45, HILL.fire.x)).toBeCloseTo(10, 9); expect(profile(HILL.fire.x)).toBeCloseTo(10, 9)
    expect(judge(21, 45)).toBe('hit'); expect(judge(14, 45)).toBe('short'); expect(judge(21, 30)).toBe('low'); expect(judge(21, 60)).toBe('over'); expect(judge(28, 45)).toBe('over')
    expect(landOn(14, 45).x).toBeCloseTo(16.18, 2); expect(landOn(21, 45).x).toBeCloseTo(30, 2)
    expect(heightAt(21, 30, 30)).toBeCloseTo(3.99, 2); expect(heightAt(21, 60, 30)).toBeCloseTo(11.96, 2)
  })
  it('拓展：斜面上的平抛落地方向都一样；逆风时落点近 4 m', () => {
    const a = slopeThrow(9.8), b = slopeThrow(19.6)
    expect(a.t).toBeCloseTo(1, 9); expect(b.t).toBeCloseTo(2, 9); expect(a.x).toBeCloseTo(9.8, 9); expect(b.x).toBeCloseTo(39.2, 9); expect(b.drop).toBeCloseTo(19.6, 9)
    expect(a.dip).toBeCloseTo(45, 9); expect(b.dip).toBeCloseTo(45, 9)
    expect(windDrop(0).x).toBeCloseTo(40, 9); expect(windDrop(-2).x).toBeCloseTo(36, 9); expect(windDrop(-2).t).toBeCloseTo(2, 9)
  })
})
