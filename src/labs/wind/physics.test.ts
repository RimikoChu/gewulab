// 热力环流和风实验室的计算核对：这里的数字要和规格卡 docs/specs/wind.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  breeze, columns, dayMax, dayRange, houseMin, isoHeights, ISO_LOW, ISO_UP, layerAt, nightMin, parcelPath, pAt,
  smokeToCity, steadyWind, tempAt, tropoT, windName, coriolisF, islandWind,
} from './physics'

describe('第 1 课 大气的垂直分层', () => {
  it('中纬度对流层顶 12 km，气温 15 − 6 × 12 = −57 ℃', () => { expect(tropoT('mid')).toBeCloseTo(-57, 6) })
  it('低纬度对流层顶 17 km，−76 ℃；高纬度 9 km，−54 ℃', () => { expect(tropoT('low')).toBeCloseTo(-76, 6); expect(tropoT('high')).toBeCloseTo(-54, 6) })
  it('平流层里 20 km 以上气温随高度升高，50 km 约 −2 ℃', () => { expect(tempAt('mid', 30)).toBeGreaterThan(tempAt('mid', 20)); expect(tempAt('mid', 50)).toBeCloseTo(-2, 6) })
  it('同是 14 km：中纬度在平流层，低纬度还在对流层', () => { expect(layerAt('mid', 14)).toBe('strato'); expect(layerAt('low', 14)).toBe('tropo') })
})

describe('第 2 课 削弱作用', () => {
  it('晴天地面吸收 65 份，最高气温 31 ℃；阴天 20 份，22 ℃', () => { expect(dayMax('clear')).toBeCloseTo(31, 6); expect(dayMax('cloudy')).toBeCloseTo(22, 6) })
})

describe('第 3 课 保温作用', () => {
  it('晴夜最低 12 ℃，阴夜 17 ℃', () => { expect(nightMin('clear')).toBeCloseTo(12, 6); expect(nightMin('cloudy')).toBeCloseTo(17, 6) })
  it('昼夜温差：晴天 19 ℃，阴天 5 ℃', () => { expect(dayRange('clear')).toBeCloseTo(19, 6); expect(dayRange('cloudy')).toBeCloseTo(5, 6) })
  it('晴夜大棚里最低 16 ℃，比棚外高 4 ℃', () => { expect(houseMin()).toBeCloseTo(16, 6) })
})

describe('第 4 课 热力环流', () => {
  it('地面 1013 hPa、20 ℃，1500 m 高处约 850.6 hPa', () => { expect(pAt(1013, 20, 1500)).toBeCloseTo(850.6, 1) })
  it('加热以后，高空 A 处气压比 B 处高（A 约 851.9 hPa，B 约 850.4 hPa）', () => {
    const k = columns(true); expect(k.A.up).toBeCloseTo(851.9, 1); expect(k.B.up).toBeCloseTo(850.4, 1); expect(k.A.up).toBeGreaterThan(k.B.up)
  })
  it('等压面：近地面在 A 处下凹，高空在 A 处上凸', () => {
    const lo = isoHeights(true, ISO_LOW), up = isoHeights(true, ISO_UP)
    expect(lo.A).toBeLessThan(lo.B); expect(up.A).toBeGreaterThan(up.B)
  })
})

describe('第 5 课 高空的风', () => {
  it('北纬 30° 的地转偏向参数约 7.29 × 10⁻⁵ /s', () => { expect(coriolisF()).toBeCloseTo(7.292e-5, 8) })
  it('北半球高空：风向和等压线平行，西风，约 12.2 m/s', () => {
    const w = steadyWind('north'); expect(w.cross).toBeCloseTo(0, 6); expect(windName(w.theta)).toBe('西风'); expect(w.v!).toBeCloseTo(12.2, 1)
  })
  it('南半球往左偏：东风', () => { expect(windName(steadyWind('south').theta)).toBe('东风') })
  it('只有气压梯度力：垂直等压线吹，从高压吹向低压（南风）', () => { expect(steadyWind('pgfOnly').cross).toBe(90); expect(windName(0)).toBe('南风') })
  it('北半球的气块越走越往右偏', () => { const p = parcelPath('north'); expect(p[p.length - 1][0]).toBeGreaterThan(0) })
})

describe('第 6 课 近地面的风', () => {
  it('陆地上：和等压线夹角约 42°，西南风，约 6.8 m/s', () => {
    const w = steadyWind('land'); expect(w.cross).toBeCloseTo(42, 0); expect(windName(w.theta)).toBe('西南风'); expect(w.v!).toBeCloseTo(6.8, 1)
  })
  it('海面上：摩擦小，夹角约 22°，风更大（约 8.5 m/s）', () => {
    const s = steadyWind('sea'); expect(s.cross).toBeCloseTo(21.8, 1); expect(s.v!).toBeCloseTo(8.5, 1); expect(s.v!).toBeGreaterThan(steadyWind('land').v!)
  })
})

describe('第 7 课 生活中的热力环流', () => {
  it('白天吹海风，夜晚吹陆风', () => { expect(breeze('coast', true).name).toBe('海风'); expect(breeze('coast', false).name).toBe('陆风') })
  it('白天吹谷风，夜晚吹山风', () => { expect(breeze('valley', true).name).toBe('谷风'); expect(breeze('valley', false).name).toBe('山风') })
  it('城市热岛夜里更明显：温差 5 ℃，白天 3 ℃', () => { expect(breeze('city', false).diff).toBe(5); expect(breeze('city', true).diff).toBe(3) })
})

describe('拓展课 工厂建在哪', () => {
  it('建在近郊，烟被城市风带回城里；建在远郊不会', () => { expect(smokeToCity('near')).toBe(true); expect(smokeToCity('far')).toBe(false) })
})

describe('拓展课 城市风的风场', () => {
  it('近郊近地面的风吹向市中心，市中心上空上升', () => { expect(islandWind(27, 2)[0]).toBeLessThan(0); expect(islandWind(-27, 2)[0]).toBeGreaterThan(0); expect(islandWind(0, 10)[1]).toBeGreaterThan(0) })
  it('近郊上空的空气下沉，远郊只有背景风', () => { expect(islandWind(27, 18)[1]).toBeLessThan(0); expect(islandWind(58, 18)).toEqual([0.6, 0]) })
})
