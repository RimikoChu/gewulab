// 基因的表达 · 第 1 课 DNA 的双螺旋结构：给一条链配上互补链（A—T、G—C），标出两条链反向平行，再拧成双螺旋。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { L1_TOP, antiparallel, complement, counts, purineRatio } from './physics'
import { useTween, type V3 } from './kit'
import { N1, O1, Scene1, pos1 } from './scene1'
import { Finale, H, Legend, Seq } from './ui'
import { VOICE } from './voice'
import { Room } from './world'
import { RISE } from './mol'

const TASKS: Task[] = [
  { id: 'one', text: '给第一个碱基 A 配上对', note: 'A 只和 T 配对，中间两根氢键' },
  { id: 'all', text: '把剩下的 11 个都配上', note: 'G 只和 C 配对，中间三根氢键' },
  { id: 'dir', text: '标出两条链的方向', note: '两条链反向平行：一条 5′→3′，另一条 3′→5′' },
  { id: 'helix', text: '把梯子盘成双螺旋', note: '每转约 10 对碱基，直径约 2 nm' },
]
const C = counts(L1_TOP)

export default function Lesson1() {
  const [placed, setPlaced] = useState<number[]>([])
  const [queue, setQueue] = useState(0)          // 还要自动配几个
  const [dir, setDir] = useState(false)
  const [helix, setHelix] = useState(false)
  const [jump, setJump] = useState(false)
  const tw = useTween(helix ? 1 : 0, 0.45, jump)
  const T = useTasks('gewu:expression:1', TASKS)
  const n = placed.length, landed = n > 0 && performance.now() - placed[n - 1] > 1100
  const [, tick] = useState(0)
  // 配上去要 1.1 秒：到了以后刷新一下，好打勾
  useEffect(() => { if (!n) return; const t = setTimeout(() => tick(x => x + 1), 1150); return () => clearTimeout(t) }, [n])
  // 连着配：每隔 0.45 秒放一个
  useEffect(() => { if (queue <= 0 || n >= N1) return; const t = setTimeout(() => { setPlaced(p => [...p, performance.now()]); setQueue(q => q - 1) }, 450); return () => clearTimeout(t) }, [queue, n])
  const allIn = n === N1 && landed
  useEffect(() => { T.check(id => id === 'one' ? n >= 1 && (landed || n > 1) : id === 'all' ? allIn : id === 'dir' ? dir : helix && tw.done) }, [n, landed, allIn, dir, helix, tw.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setPlaced([]); setQueue(0); setDir(false); setHelix(false); T.reset(); setTimeout(() => setJump(false), 50) }
  const task = T.current, pairing = n > 0 && (!landed || queue > 0)
  const { hint, next }: { hint: string; next: 'pair' | 'dir' | 'helix' | null } = (() => {
    if (!task) return { hint: 'A—T、G—C 互补配对，两条链反向平行，盘成规则的双螺旋。', next: null }
    if (pairing) return { hint: '游离的脱氧核苷酸一个个配上去…', next: null }
    if (n === 0) return { hint: '上面这条链第一个碱基是 A。按“配一个碱基”，看什么能和它配对', next: 'pair' }
    if (n < N1) return { hint: 'A 配上了 T。按“配完剩下的”，注意 G 和 C', next: 'pair' }
    if (!dir) return { hint: '两条链配好了。按“标出方向”，看它们朝哪边走', next: 'dir' }
    if (!helix) return { hint: '一条从左往右是 5′→3′，另一条反过来。按“盘成双螺旋”', next: 'helix' }
    return { hint: '盘起来…', next: null }
  })()
  const ends = (i: number, top: boolean): V3 => { const p = pos1(i, tw.at); return top ? p.sT : p.sB }
  const showLabels = n === 0
  const labels: Label[] = [
    ...(showLabels ? [
      { id: 'sug', at: pos1(2, 0).sT, ax: 0.5, name: true, className: 'scene-name -translate-y-[150%]', children: '脱氧核糖' },
      { id: 'pho', at: [O1[0] + 3.5 * RISE, O1[1] + 1.35, O1[2]] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-[160%]', children: '磷酸' },
      { id: 'bas', at: pos1(0, 0).eT, ax: 1, name: true, className: 'scene-name -translate-x-3 -translate-y-1/2', children: '碱基' },
    ] : []),
    ...(n >= 1 && landed && n < N1 && !queue ? [{ id: 'hb', at: [O1[0], O1[1] - 0.12, O1[2]] as V3, ax: 1, className: 'scene-tag -translate-x-3 -translate-y-1/2', children: <><small>氢键</small>2 根</> }] : []),
    ...(dir ? [
      { id: 't5', at: ends(0, true), ax: 1, className: 'scene-tag key -translate-x-3 -translate-y-1/2', children: '5′' },
      { id: 't3', at: ends(N1 - 1, true), ax: 0, className: 'scene-tag key translate-x-3 -translate-y-1/2', children: '3′' },
      { id: 'b3', at: ends(0, false), ax: 1, className: 'scene-tag -translate-x-3 -translate-y-1/2', children: '3′' },
      { id: 'b5', at: ends(N1 - 1, false), ax: 0, className: 'scene-tag translate-x-3 -translate-y-1/2', children: '5′' },
    ] : []),
    ...(helix && tw.done ? [
      { id: 'd', at: [O1[0] + RISE * 5.5, O1[1] - 1.9, O1[2]] as V3, ax: 0.5, className: 'scene-tag translate-y-3', children: <><small>直径</small>约 2 nm<small className="ml-2">每转</small>约 10 对碱基</> },
    ] : []),
  ]
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="DNA 模型"
      stage={<Room at={helix ? 'oneHelix' : 'one'} labels={labels}><Scene1 placed={placed} twist={tw.ref} dir={dir && !helix} /></Room>}
      lesson={<LessonBlock no="1" title="DNA 的双螺旋结构" concept="碱基互补配对，两条链反向平行" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>DNA 由两条脱氧核苷酸链组成。每个脱氧核苷酸由一分子<b className="text-white">磷酸</b>、一分子<b className="text-white">脱氧核糖</b>和一分子含氮<b className="text-white">碱基</b>组成。</p>
          <p className="mt-2">脱氧核糖和磷酸交替连接，排在外侧，构成基本骨架；碱基排在内侧。两条链上的碱基通过氢键连成碱基对：A 和 T 配对，G 和 C 配对，这叫<b className="text-white">碱基互补配对原则</b>。</p>
          <p className="mt-2">两条链按<b className="text-white">反向平行</b>方式盘旋成双螺旋。所以双链 DNA 中 A = T，G = C，嘌呤数等于嘧啶数。</p>
        </>} />}
      finale={T.finale && <Finale kicker="配对、方向、螺旋都看过了" title="A 配 T、G 配 C，两条链反向平行盘成双螺旋" text={`这段双链里 A 和 T 各 ${C.A} 个，G 和 C 各 ${C.G} 个，(A+G)/(T+C) = ${purineRatio(L1_TOP)}。知道一条链的序列，另一条就定了。`} notes="模型放大了很多倍：碱基对之间的距离拉大了，螺旋画得松，方便看清每个碱基。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>两条链（从左往右）</H>
          <Seq label="上链" s={L1_TOP} />
          <Seq label="下链" s={complement(L1_TOP)} upto={n} />
          {dir && <p className="mt-2 text-[13px] leading-relaxed text-white/70">下链按 5′→3′ 写是 <span className="font-mono font-bold text-white">{antiparallel(L1_TOP)}</span></p>}
          <H>双链里的碱基</H>
          <div className="grid grid-cols-4 gap-2">
            {(['A', 'T', 'G', 'C'] as const).map(b => <ParamTile key={b} symbol={b} value={allIn ? String(C[b]) : '—'} unit="个" />)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="(A+G)/(T+C)" value={allIn ? String(purineRatio(L1_TOP)) : '—'} unit="嘌呤 ∶ 嘧啶" />
            <ParamTile symbol="碱基对" value={String(n)} unit={`对 · 共 ${N1} 对`} />
          </div>
          <Legend />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'pair'} onClick={() => { if (n === 0) setPlaced([performance.now()]); else setQueue(N1 - n) }} disabled={pairing || n >= N1}>{n === 0 ? '配一个碱基' : '配完剩下的'}</LabButton>
        <LabButton pulse={next === 'dir'} onClick={() => setDir(true)} disabled={!allIn || dir}>标出方向</LabButton>
        <LabButton pulse={next === 'helix'} onClick={() => setHelix(true)} disabled={!dir || helix}>盘成双螺旋</LabButton>
      </>}
      extras={null}
    />
  )
}
