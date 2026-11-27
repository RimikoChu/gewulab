// 减数分裂和遗传规律 · 第 2 课 减数第二次分裂：接着第 1 课的两个次级精母细胞往下走。前期Ⅱ核膜消失，中期Ⅱ着丝粒排在赤道板上，
// 后期Ⅱ着丝粒分裂、姐妹染色单体分开，末期Ⅱ各自缢裂，得到四个精细胞。面板上对照一个细胞里染色体数和核 DNA 数的变化曲线。
import { useEffect, useState } from 'react'
import { Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { CELL2, CHROMATIDS, MeiosisModel, geneLabels, pose } from './cell'
import { PAIRS } from './chromo'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { CHROMOSOMES, PHASES, count, curve } from './physics'
import { Curve, CurveKey, Finale, H, Legend } from './ui'
import { VOICE } from './voice'
import { MODEL, Room } from './world'

const N = CHROMOSOMES.model
const AT: [number, number, number] = [MODEL.a[0], MODEL.y, MODEL.a[2]]
const FLIP = [false, false]
const START = 5, LAST = 9
const CURVE = curve(N)
/** 减半发生在哪个时期：染色体数从上一时期到这一时期少了一半 */
const HALVED = CURVE.map((d, i) => (i > 0 && d.chr * 2 === CURVE[i - 1].chr ? i : -1)).filter(i => i >= 0)
/** 末期Ⅱ四个精细胞各自的基因组成（按画面里染色单体最后落在哪个细胞） */
const SPERM = [-1, 1].flatMap(sx => [1, -1].map(sy => {
  const g = CHROMATIDS.filter(([p, w, s]) => { const c = pose(LAST, 1, p, w, s, FLIP).c; return Math.sign(c[0]) === sx && Math.sign(c[1]) === sy })
    .sort((a, b) => a[0] - b[0]).map(([p, w, s]) => PAIRS[p].letters[p === 0 && s === 0 ? 1 - w : w]).join('')
  return { sx, sy, g }
}))
const TASKS: Task[] = [
  { id: 'meta2', text: '走到中期Ⅱ，看着丝粒排在赤道板上', note: `每个细胞 ${count('meta2', N).chr} 条染色体，没有同源染色体` },
  { id: 'ana2', text: '走到后期Ⅱ，看着丝粒分裂', note: `姐妹染色单体分开，染色体数暂时是 ${count('ana2', N).chr} 条` },
  { id: 'four', text: '走到末期Ⅱ，看四个精细胞的基因组成', note: `每个精细胞 ${count('telo2', N).chr} 条染色体：${SPERM.map(s => s.g).join('、')}` },
  { id: 'curve', text: '在曲线上找出染色体数目减半发生在哪一次分裂', note: '减半发生在减数第一次分裂' },
]

export default function Lesson2() {
  const [ph, setPh] = useState(START)
  const [mark, setMark] = useState(false)
  const T = useTasks('gewu:meiosis:2', TASKS)
  const run = useRun(ph, 2.4), e = ph === START ? 1 : Math.min(1, Math.max(0, run - (ph - 1)))
  const moving = ph > START && e < 1
  useEffect(() => {
    if (moving) return
    T.check(id => (id === 'meta2' && ph >= 7) || (id === 'ana2' && ph >= 8) || (id === 'four' && ph >= 9) || (id === 'curve' && mark))
  }, [ph, moving, mark])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setPh(START); setMark(false); T.reset() }
  const P = PHASES[ph], c = count(P.id, N)
  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'mark' | null } = (() => {
    if (!task) return { hint: '一个精原细胞，经过减数分裂，形成四个精细胞。', next: null }
    if (moving) return { hint: '细胞正在进入下一个时期…', next: null }
    if (task.id === 'curve') return { hint: '四个精细胞形成了。按“对照曲线”，找染色体数目减半的地方', next: 'mark' }
    if (ph === 5) return { hint: '两个次级精母细胞里都没有同源染色体。按“下一时期”，进入前期Ⅱ', next: 'go' }
    if (ph === 6) return { hint: '核膜又消失了，纺锤体出现。按“下一时期”', next: 'go' }
    if (ph === 7) return { hint: '着丝粒排在赤道板上。按“下一时期”，看着丝粒分裂', next: 'go' }
    return { hint: '姐妹染色单体分开，移向两极。按“下一时期”，让细胞再一分为二', next: 'go' }
  })()

  const labels: Label[] = [
    { id: 'ph', at: [AT[0], AT[1] + 28, AT[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{ph === LAST && e >= 1 ? '四个精细胞' : '两个次级精母细胞'}</small>{P.name}</> },
    ...(ph < LAST || e < 1 ? geneLabels(AT, ph, e, FLIP, true) : SPERM.map(s => ({ id: `sp${s.sx}${s.sy}`, at: [AT[0] + s.sx * (CELL2 + 17), AT[1] + s.sy * 16, AT[2]] as [number, number, number], ax: s.sx < 0 ? 1 : 0, className: 'scene-tag -translate-y-1/2', children: <><small>精细胞</small>{s.g}</> }))),
  ]
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="细胞分裂"
      stage={<Room at="modelA2" labels={labels}>
        <MeiosisModel at={AT} ph={ph} e={e} flip={FLIP} cross={0} crossed />
      </Room>}
      lesson={<LessonBlock no="2" title="减数第二次分裂" concept="着丝粒分裂，一个细胞变成四个" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>减数第一次分裂结束后，次级精母细胞不再复制，很快进入<b className="text-white">减数第二次分裂</b>。中期Ⅱ着丝粒排列在赤道板上；后期Ⅱ每条染色体的<b className="text-white">着丝粒分裂</b>，两条姐妹染色单体分开，成为两条染色体，分别移向两极。</p>
          <p className="mt-2">结果：一个精原细胞形成四个精细胞，每个精细胞的染色体数目是精原细胞的一半。</p>
          <p className="mt-2">减数分裂过程中染色体数目的减半发生在<b className="text-white">减数第一次分裂</b>，原因是同源染色体分离并进入两个子细胞。</p>
        </>} />}
      finale={T.finale && <Finale kicker="减数第二次分裂" title="染色体复制一次，细胞分裂两次" text={`一个精原细胞（${N} 条染色体）形成四个精细胞，每个只有 ${count('telo2', N).chr} 条。染色体数目减半发生在减数第一次分裂；减数第二次分裂着丝粒分裂，数目不再减少。因为交叉互换，四个精细胞的基因组成各不相同：${SPERM.map(s => s.g).join('、')}。`} notes="细胞和染色体放大了很多倍；为了看得清，只画了两对同源染色体，减数第二次分裂的纺锤体画成上下方向。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在的时期</div>
            <div className="mt-1 text-[21px] font-bold">{P.name}</div>
          </div>
          <H>一个细胞里</H>
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="染色体" value={String(c.chr)} unit="条" />
            <ParamTile symbol="核 DNA" value={String(c.dna)} unit="个" />
            <ParamTile symbol="单体" value={String(c.chromatid)} unit="条" />
          </div>
          <H>减数分裂中的数目变化</H>
          <Curve data={CURVE} at={ph} mark={mark ? HALVED : undefined} />
          <CurveKey />
          <Legend />
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => setPh(k => Math.min(LAST, k + 1))} disabled={moving || ph >= LAST}>下一时期</LabButton>
        <LabButton pulse={next === 'mark'} onClick={() => setMark(true)} disabled={ph < LAST || moving || mark}>对照曲线</LabButton>
      </>}
      extras={null}
    />
  )
}
