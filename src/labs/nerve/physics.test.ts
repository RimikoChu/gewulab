// 神经调节实验室的计算核对：这里的数字要和规格卡 docs/specs/nerve.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  CAR_RT, CAR_V, DEMO_RT, EYE, IMPULSE_PATH, NERVE_PAIRS, SOUND_PATH, arcResult, catchAt, degree, drumPush, fallDist, fallTime, farPoint,
  focusGap, glassesFor, groupOf, inborn, kindOf, mean, pupil, reachFrom, reactDist, sharp,
} from './physics'

describe('神经调节', () => {
  it('第 1 课：脑和脊髓是中枢，神经是周围；脑神经 12 对、脊神经 31 对', () => {
    expect(groupOf('brain')).toBe('中枢神经系统'); expect(groupOf('cord')).toBe('中枢神经系统'); expect(groupOf('nerves')).toBe('周围神经系统')
    expect(NERVE_PAIRS.cranial).toBe(12); expect(NERVE_PAIRS.spinal).toBe(31)
  })
  it('第 2 课：冲动从树突走到神经末梢，只能朝前走', () => {
    expect(IMPULSE_PATH).toEqual(['dendrite', 'body', 'axon', 'terminal'])
    expect(reachFrom('axon')).toEqual(['axon', 'terminal'])
  })
  it('第 3 课：剪断传入神经，不缩手也不觉得烫；剪断传出神经，不缩手但觉得烫', () => {
    expect(arcResult(null)).toMatchObject({ move: true, feel: true })
    expect(arcResult('afferent')).toMatchObject({ move: false, feel: false })
    expect(arcResult('efferent')).toMatchObject({ move: false, feel: true })
    expect(arcResult(null).reached).toHaveLength(5)
  })
  it('第 4 课：膝跳反射、吃梅分泌唾液是简单反射；望梅止渴、谈梅生津是复杂反射', () => {
    expect(kindOf('knee')).toBe('简单反射'); expect(kindOf('eat')).toBe('简单反射')
    expect(kindOf('see')).toBe('复杂反射'); expect(kindOf('talk')).toBe('复杂反射')
    expect(inborn('see')).toBe(false)
  })
  it('第 5 课：正常眼远处的像落在视网膜上；近视眼落在前面 1 mm，远点 0.6 m，戴 −1.67 D（约 175 度）的凹透镜就好', () => {
    expect(sharp(focusGap('normal'))).toBe(true)
    expect(focusGap('myopic')).toBeCloseTo(0.001, 6)
    expect(farPoint('myopic')).toBeCloseTo(0.6, 6)
    expect(glassesFor('myopic')).toBeCloseTo(-5 / 3, 6)
    expect(degree(glassesFor('myopic'))).toBe(175)
    expect(sharp(focusGap('myopic', glassesFor('myopic')))).toBe(true)
    expect(EYE.len.myopic).toBeGreaterThan(EYE.len.normal)
    expect(pupil(true)).toBeLessThan(pupil(false))
  })
  it('第 6 课：声音的路线有六站；巨响时张开口，鼓膜两侧压力差变小', () => {
    expect(SOUND_PATH).toHaveLength(6); expect(SOUND_PATH[0]).toBe('canal'); expect(SOUND_PATH.at(-1)).toBe('cortex')
    expect(drumPush(true, true)).toBeLessThan(drumPush(true, false))
  })
  it('第 7 课：尺子落下 19.6 cm 用 0.2 s；反应 0.2 s 在 19.6 cm 处接住；超过 50 cm 没接住', () => {
    expect(fallTime(0.196)).toBeCloseTo(0.2, 6)
    expect(fallDist(0.2)).toBeCloseTo(0.196, 6)
    expect(catchAt(0.2)).toBeCloseTo(0.196, 6)
    expect(catchAt(0.33)).toBeNull()
    expect(mean([...DEMO_RT])).toBeCloseTo(0.2, 6)
  })
  it('拓展：54 km/h 时反应 0.5 s 走 7.5 m，1.0 s 走 15 m', () => {
    expect(reactDist(CAR_V, CAR_RT.a)).toBeCloseTo(7.5, 6)
    expect(reactDist(CAR_V, CAR_RT.b)).toBeCloseTo(15, 6)
  })
})
