// 基因的表达 · 拓展课：两个小实验。中心法则：一条条点亮遗传信息的流向；DNA 指纹：电泳，比一比哪个人的条带和现场样本一样。随堂检测不考。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { PRINTS, samePrint } from './physics'
import { useTween, type V3 } from './kit'
import { Dogma, FLOWS, GEL, GEL_TOP, Gel, LANES, NODE, flowMid, laneX } from './scenex'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

type Exp = 'dogma' | 'print'
const TASKS: Task[] = [
  { id: 'main', text: '点亮复制、转录、翻译', note: '遗传信息从 DNA 流向 RNA，再流向蛋白质' },
  { id: 'virus', text: '再点亮另外两条', note: '某些病毒的 RNA 能逆转录成 DNA，或者自我复制' },
  { id: 'run', text: '换到 DNA 指纹，通电电泳', note: '片段越短，跑得越远' },
  { id: 'match', text: '比一比：谁的条带和现场的一样', note: '乙的条带和现场样本完全一样' },
]
const NAMES: Record<string, string> = { scene: '现场', p1: '甲', p2: '乙', p3: '丙' }
const MATCH = LANES.find(k => k !== 'scene' && samePrint('scene', k))!

export default function LessonX() {
  const [exp, setExp] = useState<Exp>('dogma')
  const [lit, setLit] = useState(0)
  const [run, setRun] = useState(false)
  const [match, setMatch] = useState(false)
  const [jump, setJump] = useState(false)
  const e = useTween(run ? 1 : 0, 0.3, jump)
  const T = useTasks('gewu:expression:x', TASKS)
  useEffect(() => { T.check(id => id === 'main' ? lit >= 3 : id === 'virus' ? lit >= 5 : id === 'run' ? run && e.done : match) }, [lit, run, e.done, match])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setExp('dogma'); setLit(0); setRun(false); setMatch(false); T.reset(); setTimeout(() => setJump(false), 50) }
  const task = T.current
  const { hint, next, want }: { hint: string; next: 'a' | 'b' | 'exp' | null; want?: Exp } = (() => {
    if (!task) return { hint: '遗传信息可以从 DNA 流向 DNA、RNA、蛋白质；每个人的 DNA 都不一样。', next: null }
    if (task.id === 'main' || task.id === 'virus') {
      if (exp !== 'dogma') return { hint: '在“实验”里选中心法则', next: 'exp', want: 'dogma' }
      return { hint: lit < 3 ? '按“点亮下一条”，看遗传信息往哪里流' : '这三条是细胞里都有的。再按“点亮下一条”', next: 'a' }
    }
    if (exp !== 'print') return { hint: '在“实验”里选 DNA 指纹', next: 'exp', want: 'print' }
    if (run && !e.done) return { hint: '条带往正极跑…', next: null }
    if (!run) return { hint: '胶上点了现场样本和甲、乙、丙三个人的 DNA 片段。按“开始电泳”', next: 'a' }
    return { hint: '条带跑开了。按“比对条带”', next: 'b' }
  })()
  const labels: Label[] = exp === 'dogma' ? [
    { id: 'n1', at: [NODE.dna[0], NODE.dna[1] + 2.0, NODE.dna[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: 'DNA' },
    { id: 'n2', at: [NODE.rna[0], NODE.rna[1] + 1.6, NODE.rna[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: 'RNA' },
    { id: 'n3', at: [NODE.pro[0], NODE.pro[1] + 2.2, NODE.pro[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: '蛋白质' },
    ...FLOWS.slice(0, lit).map((f, i) => ({ id: f.id, at: flowMid(i), ax: 0.5, className: `scene-tag ${i >= 3 ? '' : 'key'} -translate-y-1/2`, style: i >= 3 ? { background: '#ffb86b', color: '#3a1d00' } : undefined, children: f.name })),
  ] : [
    ...LANES.map((k, i) => ({ id: k, at: [laneX(i), GEL_TOP + 0.9, GEL[2]] as V3, ax: 0.5, className: `scene-tag -translate-y-full ${match && (k === 'scene' || k === MATCH) ? 'key' : ''}`, children: NAMES[k] })),
    { id: 'neg', at: [GEL[0] + 4.6, GEL[1] + 3.3, GEL[2]] as V3, ax: 0, className: 'scene-name translate-x-1 -translate-y-1/2', children: '负极' },
    { id: 'pos', at: [GEL[0] + 4.6, GEL[1] - 3.3, GEL[2]] as V3, ax: 0, className: 'scene-name translate-x-1 -translate-y-1/2', children: '正极' },
  ]
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={exp === 'dogma' ? '中心法则' : 'DNA 指纹'}
      stage={<Room at={exp === 'dogma' ? 'ext' : 'extGel'} labels={labels}><Dogma lit={lit} /><Gel run={e.ref} match={match} /></Room>}
      lesson={<LessonBlock no="拓展" title="中心法则 · DNA 指纹" concept="遗传信息的流向；每个人的 DNA 都不一样" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">中心法则</b>：遗传信息可以从 DNA 流向 DNA（复制），也可以从 DNA 流向 RNA（转录），进而流向蛋白质（翻译）。后来发现，某些病毒的 RNA 能自我复制，有的能以 RNA 为模板逆转录成 DNA，这是对中心法则的补充。</p>
          <p className="mt-2"><b className="text-white">DNA 指纹</b>：每个人（同卵双胞胎除外）的 DNA 碱基序列都有差异。把 DNA 切成片段，放进胶里通电，片段带负电，往正极跑，短的跑得远。比较条带，就能判断两个样本是不是来自同一个人。</p>
        </>} />}
      finale={T.finale && <Finale kicker="拓展" title="信息从 DNA 流向 RNA、蛋白质；每个人的 DNA 指纹不同" text={`中心法则有五条流向，细胞里常见的是复制、转录、翻译。电泳以后，${NAMES[MATCH]}的 ${PRINTS[MATCH].length} 条条带和现场样本一条不差。`} notes="电泳的条带是示意图案，不是真实位点。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>遗传信息的流向</H>
          <div className="flex flex-col gap-1.5">{FLOWS.map((f, i) => <Row key={f.id} name={f.name} text={`${f.from === 'dna' ? 'DNA' : 'RNA'} → ${f.to === 'dna' ? 'DNA' : f.to === 'rna' ? 'RNA' : '蛋白质'}`} on={i === lit - 1} seen={i < lit} />)}</div>
          <H>DNA 指纹 · 条带数</H>
          <div className="grid grid-cols-4 gap-1.5 text-center text-[13px]">{LANES.map(k => <div key={k} className="rounded-lg bg-white/8 py-1.5"><div className="text-white/55">{NAMES[k]}</div><div className="text-[18px] font-bold tabular-nums">{run && e.done ? PRINTS[k].length : '—'}</div></div>)}</div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'a'} onClick={() => exp === 'dogma' ? setLit(l => Math.min(5, l + 1)) : setRun(true)} disabled={exp === 'dogma' ? lit >= 5 : run}>{exp === 'dogma' ? '点亮下一条' : '开始电泳'}</LabButton>
        <LabButton pulse={next === 'b'} onClick={() => setMatch(true)} disabled={exp !== 'print' || !run || !e.done || match}>比对条带</LabButton>
      </>}
      extras={
        <Control label="实验">
          <Segmented label="实验" pulse={next === 'exp'} want={want ?? null} value={exp} onChange={v => setExp(v as Exp)} options={[{ value: 'dogma', label: '中心法则' }, { value: 'print', label: 'DNA 指纹' }]} />
        </Control>
      }
    />
  )
}
