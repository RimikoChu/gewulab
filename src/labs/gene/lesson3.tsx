// 遗传和变异 · 第 3 课 基因经生殖细胞传递：父本（矮茎）和母本（高茎）的体细胞各有 7 对染色体。形成生殖细胞时每对分开，精子、卵细胞里只有 7 条；
// 受精卵里又成对，每对一条来自父方、一条来自母方；第 1 对上控制茎高矮的基因，一个 D 来自母本，一个 d 来自父本。
import { useEffect, useState } from 'react'
import { Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { CHROMOSOMES, gamete, norm, phenotype, zygote } from './physics'
import { Cells, where } from './scene3'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const N = CHROMOSOMES.pea, G = gamete(N), Z = zygote(G, G)
const TASKS: Task[] = [
  { id: 'gamete', text: '让两个体细胞各形成生殖细胞，数一数条数', note: `体细胞 ${N} 条，生殖细胞只有 ${G} 条：每对只剩一条` },
  { id: 'fert', text: '让精子和卵细胞结合，数一数受精卵', note: `受精卵 ${Z} 条，每对一条来自父方、一条来自母方` },
  { id: 'gene', text: '看第 1 对染色体上控制茎高矮的基因', note: `受精卵的这对基因是 ${norm('D', 'd')}` },
]
export default function Lesson3() {
  const [stage, setStage] = useState(0)
  const [gene, setGene] = useState(false)
  const T = useTasks('gewu:gene:3', TASKS)
  const g = useRun(stage >= 1 ? 1 : 0, 2.6), f = useRun(stage >= 2 ? 1 : 0, 2.4)
  const busy = (stage >= 1 && g < 1) || (stage >= 2 && f < 1)
  useEffect(() => { T.check(id => id === 'gamete' ? g >= 1 : id === 'fert' ? f >= 1 : gene) }, [g >= 1, f >= 1, gene])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStage(0); setGene(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'g' | 'f' | 'gene' | null } = (() => {
    if (!task) return { hint: '生殖细胞是基因在亲子代间传递的桥梁。', next: null }
    if (busy) return { hint: stage === 1 ? '每对染色体分开，分到两个生殖细胞里…' : '精子和卵细胞结合…', next: null }
    if (stage === 0) return { hint: '两个体细胞里，染色体都是成对的。按“形成生殖细胞”', next: 'g' }
    if (stage === 1) return { hint: `精子和卵细胞里各有 ${G} 条。按“受精”`, next: 'f' }
    return { hint: '受精卵里又成对了。按“看基因”，看第 1 对上的一对基因', next: 'gene' }
  })()
  const count = (who: 'body' | 'g' | 'z') => who === 'body' ? N : who === 'g' ? G : Z
  const labels: Label[] = [
    { id: 'dad', at: where.dad, ax: 0.5, className: 'scene-tag translate-y-2', children: g < 1 ? <><small>父本 · 矮茎 · 体细胞</small>{N} 条</> : <><small>父本</small>生殖细胞</> },
    { id: 'mom', at: where.mom, ax: 0.5, className: 'scene-tag translate-y-2', children: g < 1 ? <><small>母本 · 高茎 · 体细胞</small>{N} 条</> : <><small>母本</small>生殖细胞</> },
    ...(g >= 1 && f <= 0 ? [
      { id: 's', at: where.sperm, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>精子</small>{G} 条</> },
      { id: 'e', at: where.egg, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>卵细胞</small>{G} 条</> },
    ] : []),
    ...(f >= 1 ? [{ id: 'z', at: where.mid, ax: 0.5, className: 'scene-tag key translate-y-2', children: <><small>受精卵</small>{Z} 条</> }] : []),
    ...(gene ? [
      { id: 'd1', at: where.geneD(-1), ax: 1, className: 'scene-tag -translate-x-1 -translate-y-full', children: <><small>来自父本</small>d</> },
      { id: 'd2', at: where.geneD(1), ax: 0, className: 'scene-tag translate-x-1 -translate-y-full', children: <><small>来自母本</small>D</> },
    ] : []),
  ]
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="细胞"
      stage={<Room at="cells" labels={labels}><Cells g={g} f={f} gene={gene} /></Room>}
      lesson={<LessonBlock no="3" title="基因经生殖细胞传递" concept="生殖细胞是基因传给后代的桥梁" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在生物的体细胞中，染色体是<b className="text-white">成对</b>存在的，基因也是成对的，分别位于成对的染色体上。</p>
          <p className="mt-2">形成精子和卵细胞时，每对染色体中各有一条进入一个生殖细胞，生殖细胞中的染色体数比体细胞<b className="text-white">减少一半</b>。</p>
          <p className="mt-2">精子和卵细胞结合成受精卵，染色体又恢复成对：一条来自父方，一条来自母方。后代就这样从父母那里各得到一半的基因。</p>
        </>} />}
      finale={T.finale && <Finale kicker="从体细胞到受精卵" title="染色体成对 → 减半 → 又成对" text={`豌豆体细胞 ${N} 条染色体，精子、卵细胞各 ${G} 条，受精卵又是 ${Z} 条。每对一条来自父方、一条来自母方，基因随着染色体传给后代。`} notes="豌豆的精子在花粉里、卵细胞在胚珠里，这里只画了细胞和染色体；染色体画成没有复制的单条，颜色只是为了分清来自哪一方。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">一个细胞里的染色体</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="体细胞" value={String(count('body'))} unit="条" />
            <ParamTile symbol="生殖细胞" value={g >= 1 ? String(count('g')) : '—'} unit="条" />
            <ParamTile symbol="受精卵" value={f >= 1 ? String(count('z')) : '—'} unit="条" />
          </div>
          <H>第 1 对染色体上的基因</H>
          <div className="flex flex-col gap-1.5">
            <Row name="母本" text={`DD · ${phenotype('DD')}`} seen={gene} on={gene} />
            <Row name="父本" text={`dd · ${phenotype('dd')}`} seen={gene} />
            <Row name="受精卵" text={gene ? `${norm('D', 'd')} · 一个 D 来自母本，一个 d 来自父本` : '受精以后再看'} seen={gene} on={gene} />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">蓝色的染色体来自父本，橙色的来自母本。</p>
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'g'} onClick={() => setStage(1)} disabled={stage !== 0}>形成生殖细胞</LabButton>
        <LabButton pulse={next === 'f'} onClick={() => setStage(2)} disabled={stage !== 1 || busy}>受精</LabButton>
        <LabButton pulse={next === 'gene'} onClick={() => setGene(true)} disabled={f < 1 || gene}>看基因</LabButton>
      </>}
      extras={null}
    />
  )
}
