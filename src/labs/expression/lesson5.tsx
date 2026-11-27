// 基因的表达 · 第 5 课 遗传密码：在 mRNA 上找到起始密码子，三个碱基一组，在密码表上一个个查下去，直到终止密码子；再看一种氨基酸有几种密码子。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { MRNA, aaName, codons, startAt, synonyms } from './physics'
import { useTween, type V3 } from './kit'
import { Scene5, codonAt5 } from './scene5'
import { Finale, H, Seq } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const TASKS: Task[] = [
  { id: 'start', text: '找到起始密码子', note: 'AUG 是起始密码子，也决定甲硫氨酸' },
  { id: 'all', text: '一个个查下去，直到终止密码子', note: 'UGA 是终止密码子，不决定氨基酸' },
  { id: 'syn', text: '看一看：丙氨酸有几种密码子', note: 'GCU、GCC、GCA、GCG 都决定丙氨酸' },
]
const CS = codons(MRNA, startAt(MRNA))
const LAST = CS.length - 1
const ALA = synonyms('A')

export default function Lesson5() {
  const [found, setFound] = useState(false)
  const [k, setK] = useState(0)
  const [syn, setSyn] = useState(false)
  const [jump, setJump] = useState(false)
  const f = useTween(found ? k : -1.2, 1.6, jump)
  const T = useTasks('gewu:expression:5', TASKS)
  const at = found && f.done ? k : -1
  useEffect(() => { T.check(id => id === 'start' ? at >= 0 : id === 'all' ? at === LAST : syn) }, [at, syn])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setFound(false); setK(0); setSyn(false); T.reset(); setTimeout(() => setJump(false), 50) }
  const task = T.current, cur = at >= 0 ? CS[at] : undefined
  const { hint, next }: { hint: string; next: 'start' | 'next' | 'syn' | null } = (() => {
    if (!task) return { hint: 'mRNA 上三个相邻的碱基决定一个氨基酸：这就是密码子。', next: null }
    if (found && !f.done) return { hint: '往后挪三个碱基…', next: null }
    if (!found) return { hint: '从 mRNA 的 5′ 端往后找。按“找起始密码子”', next: 'start' }
    if (at === 0) return { hint: 'AUG：第一个碱基 A 在左边找行，第二个 U 在上边找列，第三个 G 在右边找小行。按“查下一个”', next: 'next' }
    if (at < LAST) return { hint: `查到了：${cur} 是${aaName(cur!)}。按“查下一个”`, next: 'next' }
    return { hint: 'UGA 是终止密码子，读到这里就停。按“看丙氨酸的密码子”', next: 'syn' }
  })()
  const labels: Label[] = [
    { id: 'm5', at: [codonAt5(0)[0] - 1.4, codonAt5(0)[1] + 0.2, codonAt5(0)[2]] as V3, ax: 1, className: 'scene-tag key -translate-x-2 -translate-y-1/2', children: <><small>5′</small>mRNA</> },
    ...CS.slice(0, at + 1).map((c, i) => ({ id: `a${i}`, at: [codonAt5(i)[0], codonAt5(i)[1] + 1.75, codonAt5(i)[2]] as V3, ax: 0.5, className: `scene-tag -translate-y-full ${i === at ? 'key' : ''}`, children: aaName(c) })),
  ]
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="查密码表"
      stage={<Room at="five" labels={labels}><Scene5 frame={f.ref} show={found} hl={syn ? ALA : []} cur={syn ? undefined : cur} /></Room>}
      lesson={<LessonBlock no="5" title="遗传密码" concept="mRNA 上三个碱基决定一个氨基酸" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>mRNA 上决定 1 个氨基酸的 3 个相邻碱基，叫作 1 个<b className="text-white">密码子</b>。4 种碱基三个一组，一共 64 种密码子。</p>
          <p className="mt-2">翻译从<b className="text-white">起始密码子</b> AUG 开始（它同时决定甲硫氨酸），到<b className="text-white">终止密码子</b>（UAA、UAG、UGA）结束，终止密码子不决定氨基酸。</p>
          <p className="mt-2">除少数氨基酸外，一种氨基酸可以由几种密码子决定，这叫密码的<b className="text-white">简并</b>。几乎所有生物都共用这一套密码。</p>
        </>} />}
      finale={T.finale && <Finale kicker="整条 mRNA 查完了" title="三个碱基一组，从起始密码子读到终止密码子" text={`这条 mRNA 有 ${MRNA.length} 个碱基、${CS.length} 个密码子，决定了 ${LAST} 个氨基酸：${CS.slice(0, LAST).map(aaName).join('、')}。丙氨酸有 ${ALA.length} 种密码子。`} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">正在查的密码子</div>
            <div className="mt-1 font-mono text-[44px] leading-none font-bold tracking-[0.12em]">{cur ?? '—'}</div>
            <div className="mt-2 text-[17px] font-semibold text-[#7fe3d4]">{cur ? aaName(cur) : ' '}</div>
          </div>
          <H>mRNA（三个一组）</H>
          <Seq s={MRNA} group={3} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="密码子" value={String(CS.length)} unit="个 · 含终止" />
            <ParamTile symbol="氨基酸" value={at >= 0 ? String(Math.min(at + 1, LAST)) : '—'} unit="个 · 已查到" />
          </div>
          {syn && <><H>决定丙氨酸的密码子</H><p className="font-mono text-[16px] font-bold tracking-wider">{ALA.join('  ')}</p></>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'start'} onClick={() => setFound(true)} disabled={found}>找起始密码子</LabButton>
        <LabButton pulse={next === 'next'} onClick={() => setK(x => Math.min(LAST, x + 1))} disabled={!found || !f.done || k >= LAST}>查下一个</LabButton>
        <LabButton pulse={next === 'syn'} onClick={() => setSyn(true)} disabled={at !== LAST || syn}>看丙氨酸的密码子</LabButton>
      </>}
      extras={null}
    />
  )
}
