// 减数分裂和遗传规律 · 第 1 课 减数第一次分裂：一个 2n = 4 的精原细胞（示意），间期复制，前期Ⅰ同源染色体联会成四分体、
// 非姐妹染色单体交叉互换，中期Ⅰ成对排在赤道板两侧，后期Ⅰ同源染色体分离，末期Ⅰ缢裂成两个子细胞，染色体数目减半。
import { useEffect, useState } from 'react'
import { Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { MeiosisModel, geneLabels } from './cell'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { CHROMOSOMES, PHASES, count } from './physics'
import { Finale, H, Legend } from './ui'
import { VOICE } from './voice'
import { MODEL, Room } from './world'

const N = CHROMOSOMES.model
const AT: [number, number, number] = [MODEL.a[0], MODEL.y, MODEL.a[2]]
const FLIP = [false, false]
const TASKS: Task[] = [
  { id: 'copy', text: '让细胞完成间期的复制，数一数染色单体', note: `${count('s', N).chr} 条染色体，${count('s', N).chromatid} 条染色单体` },
  { id: 'tetrad', text: '进入前期Ⅰ，看同源染色体两两配对', note: `联会：${count('pro1', N).tetrad} 对同源染色体形成 ${count('pro1', N).tetrad} 个四分体` },
  { id: 'cross', text: '让一个四分体里的非姐妹染色单体交叉互换', note: '交换了一段：A 和 a 到了同一条染色体的两条单体上' },
  { id: 'split', text: '走到后期Ⅰ，看同源染色体分离', note: '同源染色体分开，着丝粒没有分裂' },
  { id: 'two', text: '走到末期Ⅰ，数一个子细胞里的染色体', note: `染色体数目减半：${count('pro1', N).chr} → ${count('telo1', N).chr}` },
]
const LAST = 5   // 本课走到末期Ⅰ

export default function Lesson1() {
  const [ph, setPh] = useState(0)
  const [crossing, setCrossing] = useState(false)
  const [crossed, setCrossed] = useState(false)
  const T = useTasks('gewu:meiosis:1', TASKS)
  const e = useRun(ph, 2.4) - (ph - 1)          // 从上一时期走到这一时期的进度
  const moving = ph > 0 && e < 1
  const cm = useRun(crossing ? 1 : 0, 1.6)
  useEffect(() => { if (crossing && cm >= 1) { setCrossed(true); setCrossing(false) } }, [crossing, cm])
  const cross = crossed ? 0 : cm
  useEffect(() => {
    if (moving) return
    T.check(id => (id === 'copy' && ph >= 1) || (id === 'tetrad' && ph >= 2) || (id === 'cross' && crossed) || (id === 'split' && ph >= 4) || (id === 'two' && ph >= 5))
  }, [ph, moving, crossed])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setPh(0); setCrossing(false); setCrossed(false); T.reset() }
  const P = PHASES[ph], c = count(P.id, N)
  const busy = moving || crossing || (cm > 0 && cm < 1 && !crossed)
  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'cross' | null } = (() => {
    if (!task) return { hint: '减数第一次分裂：同源染色体分离，染色体数目减半。', next: null }
    if (busy) return { hint: crossing ? '两条非姐妹染色单体交叉，交换一段…' : '细胞正在进入下一个时期…', next: null }
    if (ph === 0) return { hint: '细胞核里有两对同源染色体。按“下一时期”，让它们复制', next: 'go' }
    if (ph === 1) return { hint: '每条染色体都有了两条姐妹染色单体。按“下一时期”，进入前期Ⅰ', next: 'go' }
    if (ph === 2 && !crossed) return { hint: '同源染色体配对，成了两个四分体。按“交叉互换”', next: 'cross' }
    if (ph === 2) return { hint: '交换以后，按“下一时期”，进入中期Ⅰ', next: 'go' }
    if (ph === 3) return { hint: '四分体排在赤道板两侧。按“下一时期”，看同源染色体怎样分开', next: 'go' }
    return { hint: '同源染色体移向两极。按“下一时期”，让细胞一分为二', next: 'go' }
  })()

  // 标签：时期名；每根单体的基因字母（四分体形成以后才标）
  const labels: Label[] = [
    { id: 'ph', at: [AT[0], AT[1] + 31, AT[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{ph === LAST && e >= 1 ? '两个次级精母细胞' : P.division ? '初级精母细胞' : '精原细胞'}</small>{P.name}</> },
  ]
  if (ph >= 2) labels.push(...geneLabels(AT, ph, Math.min(1, Math.max(0, e)), FLIP, crossed))
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="细胞分裂"
      stage={<Room at="modelA" labels={labels} span={ph >= 4 ? [100, 62] : undefined}>
        <MeiosisModel at={AT} ph={ph} e={ph === 0 ? 1 : Math.min(1, Math.max(0, e))} flip={FLIP} cross={cross} crossed={crossed} />
      </Room>}
      lesson={<LessonBlock no="1" title="减数第一次分裂" concept="同源染色体分离，染色体数目减半" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>减数分裂是进行有性生殖的生物，在产生成熟生殖细胞时进行的染色体数目<b className="text-white">减半</b>的细胞分裂：染色体只复制一次，细胞连续分裂两次。</p>
          <p className="mt-2">形状和大小一般都相同、一条来自父方、一条来自母方的一对染色体叫<b className="text-white">同源染色体</b>。前期Ⅰ同源染色体两两配对叫<b className="text-white">联会</b>；联会后的每对同源染色体含有四条染色单体，叫<b className="text-white">四分体</b>。</p>
          <p className="mt-2">四分体中的非姐妹染色单体之间经常发生缠绕，并交换相应的片段（<b className="text-white">交叉互换</b>）。后期Ⅰ同源染色体分离，分别移向细胞两极。</p>
        </>} />}
      finale={T.finale && <Finale kicker="减数第一次分裂" title="同源染色体分离，染色体数目减半" text={`一个初级精母细胞分裂成两个次级精母细胞。每个子细胞里只剩 ${count('telo1', N).chr} 条染色体，而且没有同源染色体；每条染色体仍然含有两条姐妹染色单体。`} notes="细胞、染色体都放大了很多倍，大小不按比例；为了看得清，只画了两对同源染色体（2n = 4），基因画成一道色带。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在的时期</div>
            <div className="mt-1 text-[22px] font-bold">{P.name}</div>
          </div>
          <H>一个细胞里</H>
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="染色体" value={String(c.chr)} unit="条" />
            <ParamTile symbol="核 DNA" value={String(c.dna)} unit="个" />
            <ParamTile symbol="染色单体" value={String(c.chromatid)} unit="条" />
            <ParamTile symbol="四分体" value={String(c.tetrad)} unit="个" />
          </div>
          <Legend />
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => setPh(k => Math.min(LAST, k + 1))} disabled={busy || ph >= LAST || (ph === 2 && !crossed)}>下一时期</LabButton>
        <LabButton pulse={next === 'cross'} onClick={() => setCrossing(true)} disabled={ph !== 2 || busy || crossed}>交叉互换</LabButton>
      </>}
      extras={null}
    />
  )
}
