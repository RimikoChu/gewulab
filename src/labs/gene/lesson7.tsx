// 遗传和变异 · 第 7 课 生物的变异：从两个品种的花生里各随机取 20 粒，用游标卡尺一粒粒量长度，比一比平均值；
// 再判断“大花生种在贫瘠的土里结的果实小”这种变异能不能遗传。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { PEANUT, SAMPLE, VARIATION, mean, peanuts, type PeanutKind } from './physics'
import { Desk7, GAUGE, TRAY } from './scene7'
import { Finale, H } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const DATA = { big: peanuts('big'), small: peanuts('small') }
const MEAN = { big: mean(DATA.big), small: mean(DATA.small) }
const TASKS: Task[] = [
  { id: 'big', text: `量大花生：随机取 ${SAMPLE} 粒，一粒粒量长度`, note: `大花生平均 ${MEAN.big.toFixed(1)} cm` },
  { id: 'small', text: `换成小花生，也量 ${SAMPLE} 粒`, note: `小花生平均 ${MEAN.small.toFixed(1)} cm` },
  { id: 'cmp', text: '比一比两个品种的平均长度', note: '同一品种的花生长短也不一样，两个品种差得更多' },
  { id: 'judge', text: '判断：大花生种在贫瘠的土里结的果实小，能不能遗传', note: '不能：只由环境引起，遗传物质没有改变' },
]
const BINS = Array.from({ length: 13 }, (_, i) => 1.6 + i * 0.2)
const binOf = (x: number) => Math.min(BINS.length - 1, Math.max(0, Math.floor((x - 1.6 + 1e-6) / 0.2)))
export default function Lesson7() {
  const [kind, setKind] = useState<PeanutKind>('big')
  const [go, setGo] = useState<Record<PeanutKind, boolean>>({ big: false, small: false })
  const [cmp, setCmp] = useState(false), [judged, setJudged] = useState(false)
  const T = useTasks('gewu:gene:7', TASKS)
  const nb = Math.floor(useRun(go.big ? SAMPLE : 0, 0.22) + 1e-6), ns = Math.floor(useRun(go.small ? SAMPLE : 0, 0.22) + 1e-6)
  const n = { big: nb, small: ns }
  const measuring = (go.big && nb < SAMPLE) || (go.small && ns < SAMPLE)
  useEffect(() => { T.check(id => id === 'big' ? nb >= SAMPLE : id === 'small' ? ns >= SAMPLE : id === 'cmp' ? cmp : judged) }, [nb >= SAMPLE, ns >= SAMPLE, cmp, judged])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setKind('big'); setGo({ big: false, small: false }); setCmp(false); setJudged(false); T.reset() }
  const task = T.current
  const want: PeanutKind | null = task?.id === 'big' || task?.id === 'small' ? task.id as PeanutKind : null
  const { hint, next }: { hint: string; next: 'kind' | 'measure' | 'cmp' | 'judge' | null } = (() => {
    if (!task) return { hint: '遗传物质改变引起的变异，才能遗传给后代。', next: null }
    if (measuring) return { hint: '用游标卡尺一粒一粒量…', next: null }
    if (want && kind !== want) return { hint: `在“品种”里选“${PEANUT[want].name}”`, next: 'kind' }
    if (want) return { hint: `从${PEANUT[want].name}里随机取 ${SAMPLE} 粒。按“量 ${SAMPLE} 粒”`, next: 'measure' }
    if (!cmp) return { hint: '两个品种都量完了。按“比一比”', next: 'cmp' }
    return { hint: '大花生种在贫瘠的土里，结的果实小。这能遗传吗？按“判断”', next: 'judge' }
  })()
  const curKind: PeanutKind | null = go.big && nb < SAMPLE ? 'big' : go.small && ns < SAMPLE ? 'small' : null
  const cur = curKind ? { kind: curKind, i: n[curKind], len: DATA[curKind][n[curKind]] } : null
  const lens = { big: DATA.big.slice(0, nb), small: DATA.small.slice(0, ns) }
  const labels: Label[] = [
    { id: 'tb', at: [TRAY.big[0], TRAY.big[1] + 0.7, TRAY.big[2] - 1.5], ax: 0.5, className: 'scene-tag -translate-y-full', children: PEANUT.big.name },
    { id: 'ts', at: [TRAY.small[0], TRAY.small[1] + 0.7, TRAY.small[2] - 1.5], ax: 0.5, className: 'scene-tag -translate-y-full', children: PEANUT.small.name },
    ...(cur ? [{ id: 'g', at: [GAUGE[0], GAUGE[1] + 0.3, GAUGE[2] - 0.4] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>第 {cur.i + 1} 粒</small>{cur.len.toFixed(1)} cm</> }] : []),
  ]
  const avg = (k: PeanutKind) => n[k] >= SAMPLE ? MEAN[k].toFixed(1) : '—'
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="花生"
      stage={<Room at="desk" labels={labels}><Desk7 lens={lens} cur={cur} /></Room>}
      lesson={<LessonBlock no="7" title="生物的变异" concept="遗传物质改变的变异才能遗传" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>亲代与子代之间、子代个体之间的差异，叫<b className="text-white">变异</b>。同一品种的花生，果实也有长有短。</p>
          <p className="mt-2">由遗传物质发生改变而引起的变异，是<b className="text-white">可遗传的变异</b>；单纯由环境引起、遗传物质没有改变的变异，是<b className="text-white">不可遗传的变异</b>。</p>
          <p className="mt-2">大花生和小花生是不同的品种，差异主要由遗传物质决定；大花生种在贫瘠的土里结的果实小，是环境引起的，它的种子种在肥沃的土里，结的果实还是大的。</p>
        </>} />}
      finale={T.finale && <Finale kicker="量过、比过、判断过" title="遗传物质改变的变异才能遗传" text={`大花生平均 ${MEAN.big.toFixed(1)} cm，小花生平均 ${MEAN.small.toFixed(1)} cm。两个品种的差异由遗传物质决定，能遗传；${VARIATION.soil.text}，${VARIATION.soil.why}，不能遗传。`} notes="两个品种的长度是示意的抽样，不是某个具体品种的实测数据。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">果实长度（cm）</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="大花生" value={avg('big')} unit={`cm · 平均 · ${nb}/${SAMPLE} 粒`} />
            <ParamTile symbol="小花生" value={avg('small')} unit={`cm · 平均 · ${ns}/${SAMPLE} 粒`} />
          </div>
          <H>每 0.2 cm 一格，各有几粒</H>
          <div className="flex h-24 items-end gap-1 border-b border-white/25 px-1">
            {BINS.map((x, i) => { const cb = lens.big.filter(v => binOf(v) === i).length, cs = lens.small.filter(v => binOf(v) === i).length
              return <div key={x} className="flex flex-1 flex-col-reverse items-stretch">
                <div className="rounded-t-sm" style={{ height: cs * 11, background: '#ffb84a' }} /><div className="rounded-t-sm bg-[#35c7b3]" style={{ height: cb * 11 }} />
              </div> })}
          </div>
          <div className="mt-1 flex justify-between text-[11.5px] text-white/55 tabular-nums"><span>1.6</span><span>2.4</span><span>3.2</span><span>4.0</span></div>
          <div className="mt-2 flex justify-center gap-4 text-[12.5px] text-white/70"><span><span className="mr-1 inline-block size-2.5 rounded-sm bg-[#35c7b3]" />大花生</span><span><span className="mr-1 inline-block size-2.5 rounded-sm" style={{ background: '#ffb84a' }} />小花生</span></div>
          {cmp && <p className="hint-in mt-3 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">大花生平均长 {(MEAN.big - MEAN.small).toFixed(1)} cm。同一品种里也有长有短，这也是变异。</p>}
          {judged && <p className="hint-in mt-2 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">{VARIATION.soil.text}：{VARIATION.soil.heritable ? '能' : '不能'}遗传。{VARIATION.soil.why}。</p>}
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'measure'} onClick={() => setGo(g => ({ ...g, [kind]: true }))} disabled={measuring || go[kind]}>量 {SAMPLE} 粒</LabButton>
        <LabButton pulse={next === 'cmp'} onClick={() => setCmp(true)} disabled={nb < SAMPLE || ns < SAMPLE || cmp}>比一比</LabButton>
        <LabButton pulse={next === 'judge'} onClick={() => setJudged(true)} disabled={!cmp || judged}>判断</LabButton>
      </>}
      extras={<Control label="品种"><Segmented label="品种" pulse={next === 'kind'} want={next === 'kind' ? want : null} value={kind} onChange={v => { if (!measuring) setKind(v) }} options={[{ value: 'big', label: PEANUT.big.name }, { value: 'small', label: PEANUT.small.name }]} /></Control>}
    />
  )
}
