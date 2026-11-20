// 细胞实验室的计算核对：这里的数字要和规格卡 docs/specs/cells.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { PART_KEYS, brightness, cellsInRow, chromosomes, dollyLooksLike, has, imageMoves, magnify, onlyPlant, seenAs, slideToCenter, surfaceToVolume } from './physics'

describe('细胞', () => {
  it('第 2 课：目镜 10 倍配 4、10、40 倍物镜，放大 40、100、400 倍', () => { expect([4, 10, 40].map(o => magnify(o))).toEqual([40, 100, 400]) })
  it('第 2 课：一行能看到 20、8、2 个细胞；倍数越大视野越暗', () => {
    expect([40, 100, 400].map(cellsInRow)).toEqual([20, 8, 2]); expect(brightness(400)).toBeLessThan(brightness(100)); expect(brightness(100)).toBeLessThan(brightness(40))
  })
  it('第 3 课：玻片上的 p 看到的是 d；玻片往左下移，物像往右上移；物像偏左下，就把玻片往左下移', () => {
    expect(seenAs('p')).toBe('d'); expect(seenAs('b')).toBe('q'); expect(imageMoves('ld')).toBe('ru'); expect(slideToCenter('ld')).toBe('ld')
  })
  it('第 5、6 课：植物细胞七种结构都有；动物细胞没有细胞壁、液泡、叶绿体', () => {
    expect(PART_KEYS.every(k => has('plant', k))).toBe(true); expect(onlyPlant()).toEqual(['wall', 'vacuole', 'chloroplast']); expect(has('animal', 'mito')).toBe(true)
  })
  it('第 7 课：4 条染色体先复制成 8 条，再平均分成 4 条和 4 条', () => { expect(chromosomes(0)).toEqual([4]); expect(chromosomes(1)).toEqual([8]); expect(chromosomes(2)).toEqual([4, 4]); expect(chromosomes(4)).toEqual([4, 4]) })
  it('拓展：边长 1、2、4 的立方体，表面积和体积的比是 6、3、1.5', () => { expect([1, 2, 4].map(surfaceToVolume)).toEqual([6, 3, 1.5]) })
  it('拓展：多莉像提供细胞核的那只羊', () => { expect(dollyLooksLike()).toBe('nucleus') })
})
