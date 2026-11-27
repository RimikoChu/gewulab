// 兴奋的传导和传递 · 第 1 课 神经元的结构：依次看树突、细胞体、轴突、神经末梢，再发一次兴奋，看它在一个神经元里朝哪边走。
import { useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { lerp, smooth, useRun, type Run, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { setZones } from './wave'
import { DEN1, MYELIN, PRE, Room, type SpotKey } from './world'

const PARTS: { key: string; name: string; spot: SpotKey; text: string; at: V3[] }[] = [
  { key: 'den', name: '树突', spot: 'oneDen', text: '短而分枝多，接受信息并传给细胞体', at: [[-13.5, 2.5, 3], [-6.5, 12, -1], [-6, -12.5, 2.5]] },
  { key: 'soma', name: '细胞体', spot: 'oneSoma', text: '膨大的部分，里面有细胞核', at: [[0, 6.2, 0]] },
  { key: 'axon', name: '轴突', spot: 'oneAxon', text: '长而较细，把信息从细胞体传向别处；外面套着一节节髓鞘', at: [[38, 3.2, 0]] },
  { key: 'end', name: '神经末梢', spot: 'oneEnd', text: '轴突的末端，膨大成突触小体，贴着下一个神经元', at: [[PRE - 3.3, 5.2, 0]] },
]
const TASKS: Task[] = [
  { id: 'see', text: '把树突、细胞体、轴突、神经末梢都看一遍', note: '神经元由细胞体、树突和轴突等部分构成' },
  { id: 'count', text: '数一数：树突几条，轴突几条', note: `这个神经元有 ${DEN1.length} 条树突，轴突只有 1 条` },
  { id: 'fire', text: '发一次兴奋，看它朝哪边走', note: '兴奋从树突、细胞体传向轴突末梢' },
]
const T_RUN = 7

/** 兴奋区从树突一路扫到神经末梢 */
function Pulse({ run }: { run: Run }) {
  useFrame(() => { const t = run.ref.current; setZones(run.running ? [{ x: lerp(-15, PRE + 2, smooth(0, T_RUN, t) * 0.4 + 0.6 * t / T_RUN), w: 3.2, a: smooth(0, 0.3, t) * (1 - smooth(T_RUN - 0.4, T_RUN, t)) }] : []) })
  useEffect(() => () => setZones([]), [])
  return null
}

export default function Lesson1() {
  const [seen, setSeen] = useState<string[]>([])
  const run = useRun(T_RUN)
  const T = useTasks('gewu:neuron:1', TASKS)
  const cur = seen.length ? PARTS.find(p => p.key === seen[seen.length - 1])! : null
  const all = seen.length === PARTS.length
  useEffect(() => { T.check(id => id === 'see' ? all : id === 'count' ? seen.includes('axon') : run.done) }, [seen, run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const nextPart = PARTS.find(p => !seen.includes(p.key))
  const look = () => { if (run.running) return; if (nextPart) setSeen([...seen, nextPart.key]); else setSeen([PARTS[0].key]) }
  const resetAll = () => { setSeen([]); run.reset(); T.reset() }
  const firing = run.running || run.done
  const { hint, next }: { hint: string; next: 'look' | 'fire' | null } = (() => {
    if (run.running) return { hint: '亮的地方是兴奋，正从树突往轴突末梢走…', next: null }
    if (!T.current) return { hint: '树突接受信息，轴突把信息传出去。', next: null }
    if (!cur) return { hint: '这是一个放大的神经元。按“看下一处”，先看树突', next: 'look' }
    if (nextPart) return { hint: `这是${cur.name}。按“看下一处”，去看${nextPart.name}`, next: 'look' }
    return { hint: '四处都看过了。按“发一次兴奋”，看它朝哪边走', next: 'fire' }
  })()
  const at: SpotKey = firing || !cur ? 'one' : cur.spot
  const myelin: Label[] = [
    { id: 'my', at: [MYELIN.x0 + (MYELIN.len + MYELIN.gap) * 2 + MYELIN.len / 2, -2.9, 0.5], ax: 0.5, className: 'scene-name translate-y-1', children: '髓鞘' },
    { id: 'node', at: [MYELIN.x0 + (MYELIN.len + MYELIN.gap) * 4 - MYELIN.gap / 2, -2.4, 0.5], ax: 0.5, className: 'scene-name translate-y-1', children: '郎飞结' },
    { id: 'nuc', at: [-0.6, 0.2, 5.6], ax: 0.5, className: 'scene-name', children: '细胞核' },
  ]
  const labels0: Label[] = firing || !cur
    ? PARTS.map(p => ({ id: p.key, at: p.at[0], ax: 0.5, className: 'scene-tag -translate-y-full', children: p.name }))
    : cur.at.map((a, i) => ({ id: cur.key + i, at: a, ax: 0.5, className: 'scene-tag key -translate-y-full', children: cur.name }))
  const labels = [...labels0, ...(firing ? [] : myelin)]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="神经元"
      stage={<Room at={at} labels={labels}><Pulse run={run} /></Room>}
      lesson={<LessonBlock no="1" title="神经元的结构" concept="神经元：细胞体、树突和轴突" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>神经元是神经系统结构与功能的基本单位，由<b className="text-white">细胞体、树突和轴突</b>等部分构成。</p>
          <p className="mt-2">树突是细胞体向外伸出的树枝状突起，通常短而粗，用来<b className="text-white">接受信息并将其传导到细胞体</b>。轴突是神经元的长而较细的突起，能<b className="text-white">将信息从细胞体传向其他神经元、肌肉或腺体</b>。</p>
          <p className="mt-2">轴突呈纤维状，外表大都套有一层髓鞘，构成神经纤维。髓鞘一节一节的，节与节之间露出轴突的地方叫郎飞结。后面几课要看膜上的离子，把髓鞘拿掉了。</p>
        </>} />}
      finale={T.finale && <Finale kicker="兴奋到了轴突末梢" title="树突接受信息，轴突把信息传出去" text={`这个神经元有 ${DEN1.length} 条树突、1 条轴突。兴奋从树突、细胞体传向轴突末梢，再传给下一个神经元。`} notes="模型放大了很多倍，各部分的长短粗细是示意；真实的轴突比细胞体长得多、细得多。" />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="树突" value={seen.includes('den') ? String(DEN1.length) : '—'} unit="条" />
            <ParamTile symbol="轴突" value={seen.includes('axon') ? '1' : '—'} unit="条" />
          </div>
          <H>各部分</H>
          <div className="flex flex-col gap-1.5">{PARTS.map(p => <Row key={p.key} name={p.name} text={p.text} on={!firing && cur?.key === p.key} seen={seen.includes(p.key)} />)}</div>
          <H>兴奋的走向</H>
          <p className="rounded-xl bg-white/6 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/85">{run.done ? '树突 → 细胞体 → 轴突 → 神经末梢' : '发一次兴奋就知道了'}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={!all} pulse={next === 'look'} onClick={look} disabled={run.running}>看下一处</LabButton>
        <LabButton primary={all} pulse={next === 'fire'} onClick={() => run.start()} disabled={!all || run.running}>发一次兴奋</LabButton>
      </>}
      extras={null}
    />
  )
}
