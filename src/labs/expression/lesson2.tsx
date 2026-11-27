// 基因的表达 · 第 2 课 DNA 的复制：解旋酶解开双链，DNA 聚合酶以两条链为模板接上子链；复制完的两个 DNA 各有一条母链。再复制两代，数含母链的 DNA。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { L2_SEQ, replicate } from './physics'
import { useTween, type V3 } from './kit'
import { N2, Q_END, Q_START, Scene2, generation } from './scene2'
import { STRAND } from './mol'
import { Finale, H, Legend } from './ui'
import { VOICE } from './voice'
import { AT, Room } from './world'

const TASKS: Task[] = [
  { id: 'run', text: '让复制叉从头走到尾', note: '得到两个 DNA，每个都是一条母链配一条子链' },
  { id: 'g2', text: '再复制一代', note: '4 个 DNA，含母链的还是 2 个' },
  { id: 'g3', text: '再复制一代，数一数含母链的', note: '8 个 DNA，含母链的 2 个，占 1/4' },
]
const BP = L2_SEQ.length

/** 面板上的示意：每个 DNA 画成两道线，蓝的是母链，橙的是子链 */
function GenMap({ n }: { n: number }) {
  const list = generation(Math.max(1, n)).slice(0, 2 ** n)
  const mols = n === 0 ? [{ oldTop: true, oldBot: true }] : list
  return <div className="flex flex-wrap justify-center gap-2 py-1">
    {mols.map((m, i) => <div key={i} className="flex flex-col gap-[3px] rounded-md bg-white/6 px-2 py-1.5" style={{ width: 62 }}>
      <span className="block rounded-full" style={{ height: 4, width: '100%', background: m.oldTop ? STRAND.old : STRAND.new }} />
      <span className="block rounded-full" style={{ height: 4, width: '100%', background: m.oldBot ? STRAND.old : STRAND.new }} />
    </div>)}
  </div>
}

export default function Lesson2() {
  const [run, setRun] = useState(false)
  const [gen, setGen] = useState(1)
  const [jump, setJump] = useState(false)
  const q = useTween(run ? Q_END : Q_START, 1.6, jump)
  const twist = useTween(q.done && run ? 1 : 0, 0.6, jump)
  const g = useTween(gen, 0.7, jump)
  const T = useTasks('gewu:expression:2', TASKS)
  const replicated = run && q.done, n = !replicated ? 0 : g.done ? gen : gen - 1
  const R = replicate(n, BP)
  useEffect(() => { T.check(id => id === 'run' ? replicated && twist.done : id === 'g2' ? n >= 2 : n >= 3) }, [replicated, twist.done, n])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setRun(false); setGen(1); T.reset(); setTimeout(() => setJump(false), 50) }
  const task = T.current, busy = (run && !q.done) || !g.done || (replicated && !twist.done)
  const { hint, next }: { hint: string; next: 'run' | 'gen' | null } = (() => {
    if (!task) return { hint: '不管复制几代，含母链的 DNA 总是 2 个：复制是半保留的。', next: null }
    if (run && !q.done) return { hint: '解旋酶往前推，聚合酶跟着接…', next: null }
    if (busy) return { hint: '分开…', next: null }
    if (!run) return { hint: '这是一个 DNA，两条链都是母链。按“开始复制”', next: 'run' }
    if (gen === 1) return { hint: '两个子代 DNA 都是一蓝一橙。按“再复制一代”', next: 'gen' }
    return { hint: '4 个 DNA 里，只有 2 个带着蓝色的母链。按“再复制一代”', next: 'gen' }
  })()
  const labels: Label[] = [
    ...(!run ? [{ id: 'm', at: [AT.two[0], AT.two[1] + 1.9, AT.two[2]] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '亲代 DNA' }] : []),
    ...(run && !q.done ? [
      { id: 'h', at: [AT.two[0] + 5.6, AT.two[1] - 2.5, AT.two[2]] as V3, ax: 0.5, className: 'scene-name translate-y-1', children: '解旋酶' },
      { id: 'p', at: [AT.two[0] - 4.6, AT.two[1] + 3.2, AT.two[2]] as V3, ax: 0.5, className: 'scene-name -translate-y-full', children: 'DNA 聚合酶' },
    ] : []),
    ...(replicated && gen === 1 && g.done && twist.done ? [
      { id: 'd1', at: [AT.two[0] + 5.8, AT.two[1] + 1.45, AT.two[2]] as V3, ax: 0, className: 'scene-tag translate-x-2 -translate-y-1/2', children: <><small>子代</small>母链 + 子链</> },
      { id: 'd2', at: [AT.two[0] + 5.8, AT.two[1] - 1.45, AT.two[2]] as V3, ax: 0, className: 'scene-tag translate-x-2 -translate-y-1/2', children: <><small>子代</small>母链 + 子链</> },
    ] : []),
  ]
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="复制"
      stage={<Room at={gen > 1 ? 'twoGen' : 'two'} labels={labels}><Scene2 q={q.ref} gen={g.ref} twist={twist.ref} /></Room>}
      lesson={<LessonBlock no="2" title="DNA 的复制" concept="复制是半保留的：每个子代 DNA 留一条母链" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>复制开始时，<b className="text-white">解旋酶</b>把两条螺旋的双链解开。然后以解开的每一条母链为<b className="text-white">模板</b>，以细胞中游离的 4 种脱氧核苷酸为原料，在 <b className="text-white">DNA 聚合酶</b>等的作用下，按碱基互补配对原则合成子链。</p>
          <p className="mt-2">子链只能从 5′ 端向 3′ 端延伸，两条模板方向相反，所以一条子链跟着解旋连续合成，另一条一段一段地合成。复制是<b className="text-white">边解旋边复制</b>的。</p>
          <p className="mt-2">新的 DNA 都保留了原来 DNA 的一条链，这种方式叫<b className="text-white">半保留复制</b>。一个 DNA 复制 n 次，得到 2ⁿ 个 DNA，其中含母链的始终是 2 个。</p>
        </>} />}
      finale={T.finale && <Finale kicker="复制了三代" title="复制是半保留的：含母链的 DNA 总是 2 个" text={`复制 3 代得到 ${replicate(3, BP).dna} 个 DNA，16 条链里母链只有 2 条，含母链的 DNA 占 2/8 = 1/4。这一段 ${BP} 对碱基，三代一共用掉 ${replicate(3, BP).used} 个游离的脱氧核苷酸。`} notes="模型放大了很多倍；后随链的片段长短、酶的形状都是示意。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>第 {n} 代 · 蓝是母链，橙是子链</H>
          <GenMap n={n} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="DNA" value={String(R.dna)} unit="个 · 2ⁿ" />
            <ParamTile symbol="含母链" value={String(R.withParent)} unit="个" />
            <ParamTile symbol="母链占" value={n === 0 ? '全部' : `1/${R.strands / 2}`} unit="全部链中" />
            <ParamTile symbol="用掉" value={String(R.used)} unit={`个脱氧核苷酸 · ${N2} 对碱基`} />
          </div>
          <Legend />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'run'} onClick={() => setRun(true)} disabled={run}>开始复制</LabButton>
        <LabButton pulse={next === 'gen'} onClick={() => setGen(x => Math.min(3, x + 1))} disabled={!replicated || busy || gen >= 3}>再复制一代</LabButton>
      </>}
      extras={null}
    />
  )
}
