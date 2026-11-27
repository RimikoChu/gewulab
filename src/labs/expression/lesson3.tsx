// 基因的表达 · 第 3 课 基因是有遗传效应的 DNA 片段：从染色质一级级放大到 DNA，在 DNA 上找到基因；再算一算碱基对的排列方式有多少种。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { L3_PAIRS, variety } from './physics'
import { type V3 } from './kit'
import { GENES, GENE_MID, NAKED_X, Scene3, nakedAt } from './scene3'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { AT, Room } from './world'

const TASKS: Task[] = [
  { id: 'nuc', text: '放大染色质，看 DNA 缠在什么上', note: '染色质主要由 DNA 和蛋白质组成' },
  { id: 'gene', text: '再放大，在 DNA 上找到基因', note: '一个 DNA 上有许多基因，基因之间还有别的片段' },
  { id: 'n3', text: '算一算：3 对碱基有几种排列', note: '4 × 4 × 4 = 64 种' },
  { id: 'n10', text: '10 对碱基呢', note: '4¹⁰ = 1 048 576 种：DNA 的多样性' },
]
const LEVELS = [
  { name: '染色质丝', text: '核小体一个挨一个，盘成粗丝' },
  { name: '核小体', text: 'DNA 缠在组蛋白上，像一串珠子' },
  { name: 'DNA', text: '双螺旋，上面一段段是基因' },
]
type N = '1' | '3' | '10'

export default function Lesson3() {
  const [level, setLevel] = useState(0)
  const [n, setN] = useState<N>('1')
  const [seen, setSeen] = useState<N[]>([])
  const T = useTasks('gewu:expression:3', TASKS)
  useEffect(() => { T.check(id => id === 'nuc' ? level >= 1 : id === 'gene' ? level >= 2 : id === 'n3' ? seen.includes('3') : seen.includes('10')) }, [level, seen])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setLevel(0); setN('1'); setSeen([]); T.reset() }
  const pick = (v: N) => { setN(v); if (level >= 2) setSeen(s => s.includes(v) ? s : [...s, v]) }
  const task = T.current
  const { hint, next, want }: { hint: string; next: 'zoom' | 'n' | null; want?: N } = (() => {
    if (!task) return { hint: '基因通常是有遗传效应的 DNA 片段；碱基对的排列顺序千变万化。', next: null }
    if (level === 0) return { hint: '细胞核里一团团的是染色质。按“放大一级”', next: 'zoom' }
    if (level === 1) return { hint: 'DNA 一圈圈缠在组蛋白上。按“放大一级”，看 DNA', next: 'zoom' }
    if (task.id === 'n3') return { hint: '亮的两段是基因。在“碱基对数”里选 3 对，算一算', next: 'n', want: '3' }
    return { hint: '3 对碱基就有 64 种排法。再选 10 对', next: 'n', want: '10' }
  })()
  const p = AT.three
  const labels: Label[] = [
    ...(level === 0 ? [
      { id: 'f', at: [p[0] - 30, p[1] + 12, p[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: '染色质丝' },
      { id: 'b', at: [p[0] - 4, p[1] + 6, p[2]] as V3, ax: 0.5, className: 'scene-name -translate-y-full', children: '松开的一段' },
    ] : []),
    ...(level === 1 ? [
      { id: 'h', at: [p[0] - 1.4, p[1] - 4, p[2] + 2] as V3, ax: 0.5, className: 'scene-tag translate-y-2', children: '组蛋白' },
      { id: 'd', at: [p[0] + NAKED_X - 4, p[1] + 2.2, p[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: 'DNA' },
    ] : []),
    ...(level >= 2 ? [
      ...GENES.map((g, k) => ({ id: `g${k}`, at: [GENE_MID(k)[0], GENE_MID(k)[1] + 2.0, GENE_MID(k)[2]] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <>{g.name}<small className="ml-2">{g.to - g.from + 1} 对碱基</small></> })),
      { id: 's', at: [nakedAt(16)[0], nakedAt(16)[1] - 2.0, nakedAt(16)[2]] as V3, ax: 0.5, className: 'scene-name translate-y-1', children: '基因之间的片段' },
    ] : []),
  ]
  const k = level >= 2 && seen.includes(n) ? Number(n) : 0
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="放大"
      stage={<Room at={level === 0 ? 'three0' : level === 1 ? 'three1' : 'three2'} labels={labels}><Scene3 level={level} glow={k} /></Room>}
      lesson={<LessonBlock no="3" title="基因与 DNA" concept="基因通常是有遗传效应的 DNA 片段" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>染色质（染色体）主要由 DNA 和蛋白质组成。DNA 缠绕在组蛋白上形成核小体，核小体再进一步盘绕、折叠。</p>
          <p className="mt-2">一个 DNA 分子上有许多基因。<b className="text-white">基因通常是有遗传效应的 DNA 片段</b>，基因之间还有不属于基因的片段。</p>
          <p className="mt-2">DNA 只有 4 种碱基，但碱基对的排列顺序千变万化：n 对碱基就有 4ⁿ 种排列，这构成了 DNA 的<b className="text-white">多样性</b>；每个 DNA 又有特定的碱基排列顺序，这构成了 DNA 的<b className="text-white">特异性</b>。遗传信息就蕴藏在碱基的排列顺序之中。</p>
        </>} />}
      finale={T.finale && <Finale kicker="从染色质放大到了基因" title="基因通常是有遗传效应的 DNA 片段" text={`遗传信息就藏在碱基的排列顺序里：3 对碱基有 ${variety(3)} 种排法，10 对就有 ${variety(10).toLocaleString('en-US')} 种。一个基因往往有成百上千对碱基。`} notes="各级放大的大小是示意：核小体、染色质丝的粗细和 DNA 的比例只是大致相当，DNA 上的基因画得很短。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>一级一级放大</H>
          <div className="flex flex-col gap-1.5">{LEVELS.map((l, i) => <Row key={i} name={l.name} text={l.text} on={level === i} seen={level >= i} />)}</div>
          <H>碱基对的排列方式</H>
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="n" value={k ? String(k) : '—'} unit="对碱基" />
            <ParamTile symbol="4ⁿ" value={k ? variety(k).toLocaleString('en-US') : '—'} unit="种排列" />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">每一对碱基都有 A—T、T—A、G—C、C—G 四种可能。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'zoom'} onClick={() => setLevel(l => Math.min(2, l + 1))} disabled={level >= 2}>放大一级</LabButton>
      </>}
      extras={
        <Control label="碱基对数">
          <Segmented label="碱基对数" pulse={next === 'n'} want={want ?? null} value={n} disabled={level < 2} onChange={v => pick(v as N)} options={L3_PAIRS.map(x => ({ value: String(x) as N, label: `${x} 对` }))} />
        </Control>
      }
    />
  )
}
