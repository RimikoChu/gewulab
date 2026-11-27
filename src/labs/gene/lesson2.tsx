// 遗传和变异 · 第 2 课 染色体、DNA 和基因：在小实验室里用显微镜看豌豆根尖的细胞，再在旁边的模型座上一级一级放大：细胞 → 细胞核 → 染色体 → DNA → 基因，并数一数染色体。
import { useEffect, useState } from 'react'
import { Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun, type V3 } from './parts'
import { CHROMOSOMES, LEVELS, pairs } from './physics'
import { GENE_MID, MODEL, ModelStand, SCOPE_AT, ScopeView } from './scene2'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const TASKS: Task[] = [
  { id: 'look', text: '用显微镜看豌豆根尖的细胞', note: '分裂的细胞里，染色体被染成深色' },
  { id: 'count', text: '放大到细胞核，数一数染色体', note: `豌豆的体细胞里有 ${CHROMOSOMES.pea} 条染色体，${pairs(CHROMOSOMES.pea)} 对` },
  { id: 'dna', text: '放大到一条染色体，再到 DNA', note: '染色体主要由 DNA 和蛋白质组成' },
  { id: 'gene', text: '在 DNA 上找到一个基因', note: '基因是有遗传效应的 DNA 片段' },
]
export default function Lesson2() {
  const [look, setLook] = useState(false)
  const [level, setLevel] = useState(0)
  const [counting, setCounting] = useState(false)
  const T = useTasks('gewu:gene:2', TASKS)
  const k = useRun(level + 1, 1.1), counted = Math.round(useRun(counting ? 1 : 0, counting ? 4.2 : 0.01) * CHROMOSOMES.pea)
  const settled = Math.abs(k - (level + 1)) < 1e-3
  useEffect(() => { T.check(id => id === 'look' ? look : id === 'count' ? counted >= CHROMOSOMES.pea : id === 'dna' ? level >= 3 && settled : level >= 4 && settled) }, [look, counted, level, settled])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setLook(false); setLevel(0); setCounting(false); T.reset() }
  const task = T.current, busy = !settled || (counting && counted < CHROMOSOMES.pea)
  const L = level >= 0 ? LEVELS[level] : null
  const { hint, next }: { hint: string; next: 'look' | 'zoom' | 'count' | null } = (() => {
    if (!task) return { hint: '细胞核里有染色体，染色体里有 DNA，DNA 上有基因。', next: null }
    if (counting && counted < CHROMOSOMES.pea) return { hint: '一条一条数…', next: null }
    if (!settled) return { hint: '放大…', next: null }
    if (!look) return { hint: '载物台上是一片豌豆根尖的压片。按“看显微镜”', next: 'look' }
    if (level === 0) return { hint: '视野里有一个细胞正在分裂，模型座上就是放大的它。按“放大一级”，看细胞核', next: 'zoom' }
    if (level === 1 && counted < CHROMOSOMES.pea) return { hint: '细胞核里一条条的是染色体。按“数一数”', next: 'count' }
    if (level === 1) return { hint: '挑一条染色体，按“放大一级”', next: 'zoom' }
    if (level === 2) return { hint: '这是一条染色体。按“放大一级”，看它是由什么组成的', next: 'zoom' }
    return { hint: 'DNA 是一条长长的双螺旋。按“放大一级”，在上面找一个基因', next: 'zoom' }
  })()
  const labels: Label[] = [
    ...(level === 0 && !look ? [
      { id: 'sc', at: [SCOPE_AT[0], SCOPE_AT[1] + 3.6, SCOPE_AT[2]] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '显微镜' },
      { id: 'st', at: [MODEL[0], MODEL[1] - 1.2, MODEL[2]] as V3, ax: 0.5, name: true, className: 'scene-name', children: '放大模型' },
    ] : []),
    ...(settled && L && (look || level > 0) ? [{ id: 'lv', at: [MODEL[0], MODEL[1] + (level >= 3 ? 1.0 : 1.9), MODEL[2]] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>放大到</small>{L.name}</> }] : []),
    ...(settled && level === 1 && counted > 0 ? [{ id: 'n', at: [MODEL[0] + 1.6, MODEL[1] - 0.6, MODEL[2]] as V3, className: 'scene-tag translate-x-2', children: <><small>染色体</small>{counted} 条</> }] : []),
    ...(settled && level >= 3 ? [
      { id: 'p', at: [MODEL[0] - 1.3, MODEL[1] - 0.4, MODEL[2]] as V3, ax: 0.5, className: 'scene-tag translate-y-2', children: '蛋白质' },
      { id: 'd', at: [MODEL[0] + 2.5, MODEL[1] - 0.35, MODEL[2]] as V3, ax: 0.5, className: 'scene-tag translate-y-2', children: 'DNA' },
    ] : []),
    ...(settled && level === 4 ? [{ id: 'g', at: [GENE_MID[0], GENE_MID[1] - 0.75, GENE_MID[2]] as V3, ax: 0.5, className: 'scene-tag key translate-y-2', children: '基因' }] : []),
  ]
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="显微镜和模型"
      stage={<Room at={level < 1 ? 'scope' : 'scopeIn'} span={level >= 3 ? [6.8, 4] : undefined} labels={labels}>
        <ModelStand level={level} k={k - level} counted={counted} lamp={look} />
      </Room>}
      lesson={<LessonBlock no="2" title="染色体、DNA 和基因" concept="基因是有遗传效应的 DNA 片段" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>细胞核里有<b className="text-white">染色体</b>，细胞分裂时最容易看清。染色体主要由 <b className="text-white">DNA</b> 和蛋白质组成。</p>
          <p className="mt-2">DNA 是主要的遗传物质，由两条长链盘旋成规则的双螺旋。DNA 上有许多与遗传有关的片段，叫<b className="text-white">基因</b>。</p>
          <p className="mt-2">每种生物细胞内染色体的形态和数目都是一定的：豌豆的体细胞有 {CHROMOSOMES.pea} 条，人的体细胞有 {CHROMOSOMES.human} 条。</p>
        </>} />}
      finale={T.finale && <Finale kicker="从细胞放大到了基因" title="基因是有遗传效应的 DNA 片段" text={`细胞核里有染色体，豌豆的体细胞有 ${CHROMOSOMES.pea} 条。染色体主要由 DNA 和蛋白质组成，DNA 是双螺旋，上面一段段有遗传效应的片段就是基因。`} notes="模型是放大很多倍的示意：DNA 的粗细、螺距，一个基因有多长，都不按比例；染色体上的条纹只是为了分得清。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">显微镜的视野 · 根尖细胞</div>
          <ScopeView on={look} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="染色体" value={counted >= CHROMOSOMES.pea ? String(CHROMOSOMES.pea) : counted > 0 ? String(counted) : '—'} unit="条 · 一个体细胞" />
            <ParamTile symbol="成对" value={counted >= CHROMOSOMES.pea ? String(pairs(CHROMOSOMES.pea)) : '—'} unit="对" />
          </div>
          <H>一级一级放大</H>
          <div className="flex flex-col gap-1.5">{LEVELS.map((l, i) => <Row key={l.key} name={l.name} text={l.text} on={level === i} seen={level >= i} />)}</div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'look'} onClick={() => setLook(true)} disabled={look}>看显微镜</LabButton>
        <LabButton primary pulse={next === 'zoom'} onClick={() => setLevel(l => Math.min(4, l + 1))} disabled={!look || busy || level >= 4 || (level === 1 && counted < CHROMOSOMES.pea)}>放大一级</LabButton>
        <LabButton pulse={next === 'count'} onClick={() => setCounting(true)} disabled={level !== 1 || busy || counting}>数一数</LabButton>
      </>}
      extras={null}
    />
  )
}
