// 概率 · 第 1 课 摸球箱：培训桌上三只摸球箱。甲箱 5 个红球，乙箱 5 个白球，丙箱 3 红 2 白。
// 每只箱子摸 5 次（每次看完放回），判断“摸到红球”在这只箱子里是必然事件、不可能事件，还是随机事件。丙箱再摸一轮，结果和上一轮不一样。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { BALL_COL, Ball, BallBox, Glove, Place, ease, useRun, type V3 } from './parts'
import { BOX1, DRAWS1, draws1, kind1, type Ball as BallT, type Box1 } from './physics'
import { ST, TABLE_H } from './world'

const KEYS = Object.keys(BOX1) as Box1[]
const DX: Record<Box1, number> = { jia: -0.46, yi: 0, bing: 0.46 }
const BOX_H = 0.28, PER = 1.0
const TASKS: Task[] = [
  { id: 'jia', text: '从甲箱摸 5 次，每次看完放回', note: '甲箱只有红球：摸到红球是必然事件' },
  { id: 'yi', text: '从乙箱摸 5 次', note: '乙箱没有红球：摸到红球是不可能事件' },
  { id: 'bing', text: '从丙箱摸 5 次', note: '丙箱有红有白：摸到红球是随机事件' },
  { id: 'bing2', text: '丙箱再摸 5 次，和上一轮比一比', note: '两轮不一样：随机事件事先不能确定会不会发生' },
]
const contents = (b: Box1) => [BOX1[b].red && `${BOX1[b].red} 个红球`, BOX1[b].white && `${BOX1[b].white} 个白球`].filter(Boolean).join('、')
const cn = (c: BallT) => (c === 'red' ? '红' : '白')

export default function Lesson1() {
  const [box, setBox] = useState<Box1>('jia')
  const [rounds, setRounds] = useState<Record<Box1, number>>({ jia: 0, yi: 0, bing: 0 })
  const T = useTasks('gewu:chance:1', TASKS)
  const draw = useRun(DRAWS1 * PER, () => {
    const n = { ...rounds, [box]: rounds[box] + 1 }; setRounds(n)
    T.check(id => (id === 'bing2' ? n.bing >= 2 : n[id as Box1] >= 1))
  })
  const busy = draw.busy
  const pick = (b: Box1) => { if (!busy) setBox(b) }
  const resetAll = () => { setBox('jia'); setRounds({ jia: 0, yi: 0, bing: 0 }); draw.snap(0); T.reset() }

  // 这一轮摸到哪儿了：第 i 次，这一次做到 sub
  const round = busy ? rounds[box] : Math.max(0, rounds[box] - 1)
  const seq = draws1(box, round)
  const pos = draw.k * DRAWS1, i = Math.min(DRAWS1 - 1, Math.floor(pos)), sub = busy ? pos - i : 0
  const shown = busy ? seq.slice(0, i + (sub > 0.45 ? 1 : 0)) : rounds[box] ? seq : []
  const prev = box === 'bing' && rounds.bing >= (busy ? 1 : 2) ? draws1('bing', round - 1) : null

  const task = T.current
  const { hint, next }: { hint: string; next: 'box' | 'draw' | null } = (() => {
    if (!task) return { hint: '三只箱子都摸过了：事先能确定的是必然事件或不可能事件，不能确定的是随机事件。', next: null }
    if (busy) return { hint: `摸第 ${i + 1} 次…`, next: null }
    const want: Box1 = task.id === 'bing2' ? 'bing' : (task.id as Box1)
    if (box !== want) return { hint: `换成${BOX1[want].name}（${contents(want)}）`, next: 'box' }
    if (task.id === 'bing2') return { hint: '丙箱再摸 5 次，看看和上一轮一样不一样', next: 'draw' }
    return { hint: `从${BOX1[box].name}里摸 5 次，每次看完颜色放回去`, next: 'draw' }
  })()

  // 手套：从箱口伸进去，捏住一个球拿出来给大家看，再放回去
  const bx = ST.l1.x + DX[box], top = TABLE_H + BOX_H, z = ST.l1.z + 0.1
  const dip = sub < 0.3 ? ease(sub / 0.3) : sub < 0.42 ? 1 : sub < 0.72 ? 1 - ease((sub - 0.42) / 0.3) : sub < 0.86 ? 0 : ease((sub - 0.86) / 0.14)
  const handY = top + 0.2 - dip * 0.24
  const holding = busy && sub > 0.38 && sub < 0.92
  const ballAt: V3 = [bx, handY - 0.068, z + 0.036]
  const kind = rounds[box] ? kind1(box) : null

  const labels: Label[] = [
    ...KEYS.map(b => ({ id: `n${b}`, at: [ST.l1.x + DX[b], TABLE_H + 0.02, z + 0.2] as V3, ax: 0.5, className: 'scene-tag -translate-y-1/2', style: { opacity: b === box ? 1 : 0.6 }, children: <><small>{BOX1[b].name}</small>{contents(b)}</> })),
    { id: 'res', at: [bx, top + 0.33, z], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: shown.length ? 1 : 0 }, children: <span className="flex items-center gap-1.5">{shown.map((c, k) => <span key={k} className="inline-block size-3.5 rounded-full" style={{ background: BALL_COL[c], boxShadow: 'inset 0 0 0 1.5px rgb(0 0 0 / 0.25)' }} />)}</span> },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="摸球"
      stage={<Place at="l1" labels={labels}>
        {KEYS.map(b => <BallBox key={b} at={[ST.l1.x + DX[b], TABLE_H, z]} />)}
        <group position={[bx, handY, z]} rotation-x={-Math.PI / 2 - 0.5}><Glove pinch={holding ? 0.8 : 0.1} arm={0.34} /></group>
        {holding && <Ball color={BALL_COL[seq[i]]} at={ballAt} />}
      </Place>}
      lesson={<LessonBlock no="1" title="摸球箱" concept="事先能不能确定结果，分三种事件" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在一定条件下，<b className="text-white">必然会发生</b>的事件叫必然事件；<b className="text-white">必然不会发生</b>的叫不可能事件。这两种事先就能确定。</p>
          <p className="mt-3">在一定条件下<b className="text-white">可能发生、也可能不发生</b>的事件叫随机事件，事先不能确定。</p>
          <p className="mt-3">同一个事件“摸到红球”，换一只箱子（条件变了），种类就可能变：甲箱里必然，乙箱里不可能，丙箱里随机。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">“摸到红球”：甲箱里是必然事件，乙箱里是不可能事件，丙箱里是随机事件</p>
        <p className="mt-1 text-[14px] text-white/70">随机事件事先不能确定会不会发生，丙箱两轮摸出来的就不一样。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{BOX1[box].name}里，“摸到红球”是</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight">{kind ?? '?'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">每只箱子摸 5 次</h2>
          <table className="mt-1.5 w-full text-[14px]">
            <tbody>{KEYS.map(b => {
              const n = rounds[b], last = n ? draws1(b, n - 1) : null
              return <tr key={b} className={n ? 'text-white' : 'text-white/35'}>
                <td className="py-1.5 pr-2 whitespace-nowrap">{BOX1[b].name}</td>
                <td className="py-1.5">{last ? last.map(cn).join(' ') : '—'}</td>
                <td className="py-1.5 text-right whitespace-nowrap">{n ? kind1(b) : ''}</td>
              </tr>
            })}</tbody>
          </table>
          {prev && <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[14px]">
            <div className="text-[12.5px] text-white/55">丙箱的两轮</div>
            <div className="mt-1 tabular-nums">第一轮　{prev.map(cn).join(' ')}</div>
            <div className="tabular-nums">第二轮　{rounds.bing >= 2 || busy ? (busy ? shown.map(cn).join(' ') : seq.map(cn).join(' ')) : '—'}</div>
          </div>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'draw'} onClick={() => { if (!busy) draw.run() }} disabled={busy}>摸 5 次</LabButton>
      </>}
      extras={<Control label="箱子"><Segmented label="箱子" pulse={next === 'box'} want={next === 'box' ? (task!.id === 'bing2' ? 'bing' : task!.id as Box1) : null} disabled={busy} value={box} onChange={pick} options={KEYS.map(b => ({ value: b, label: BOX1[b].name }))} /></Control>}
    />
  )
}
