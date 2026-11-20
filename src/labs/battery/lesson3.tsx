// 原电池 · 第 3 课 少一样行不行（构成原电池的条件）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { LIQUID } from './parts'
import { METALS, SETUPS, checks, negativeOf, works, type SetupKey } from './physics'
import Rig, { X } from './rig'
import { TOP } from './world'

const KEYS = Object.keys(SETUPS) as SetupKey[]
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `${SETUPS[k].name}：接通看看，记下结果`, note: works(SETUPS[k]) ? '指针偏转：四个条件都满足' : `指针不动：${SETUPS[k].miss}` }))
const SHORT: Record<SetupKey, string> = { ok: '锌–铜–稀硫酸', same: '铜–铜', alcohol: '换成酒精', apart: '分开两杯' }
const NEED = { electrodes: '两个活泼性不同的电极', electrolyte: '电解质溶液', closed: '闭合回路', reaction: '能自发进行的氧化还原反应' } as const

export default function Lesson3() {
  const [setup, setSetup] = useState<SetupKey>('ok')
  const [tried, setTried] = useState<SetupKey[]>([])
  const [rows, setRows] = useState<SetupKey[]>([])
  const T = useTasks('gewu:battery:3', TASKS)
  const s = SETUPS[setup], ok = works(s), on = tried.includes(setup), dup = rows.includes(setup)
  const tryIt = () => { if (!on) setTried(t => [...t, setup]) }
  const record = () => { if (!on || dup) return; const next = [...rows, setup]; setRows(next); T.check(id => next.includes(id as SetupKey)) }
  const resetAll = () => { setSetup('ok'); setTried([]); setRows([]); T.reset() }
  const task = T.current, c = checks(s)
  const { hint, next }: { hint: string; next: 'setup' | 'try' | 'record' | null } = !task ? { hint: '四种都试过了。四个条件缺一个都不行。', next: null }
    : setup !== task.id ? { hint: `把装置换成“${SETUPS[task.id as SetupKey].name}”`, next: 'setup' }
    : !on ? { hint: '按“接通看看”', next: 'try' } : { hint: ok ? '指针偏转了：按“记录”' : `指针不动，${s.miss}：按“记录”`, next: 'record' }
  const neg = negativeOf(s.a, s.b)
  const labels: Label[] = [
    { id: 'a', at: [X - (setup === 'apart' ? 0.55 : 0.3), TOP + 0.62, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: `${METALS[s.a].name}片` },
    { id: 'b', at: [X + (setup === 'apart' ? 0.55 : 0.3), TOP + 0.62, 0], className: 'scene-tag -translate-y-1/2', children: `${METALS[s.b].name}片` },
    { id: 'liq', at: [X, TOP + 0.02, 0.36], ax: 0.5, name: true, className: 'scene-name', children: s.electrolyte ? '稀硫酸' : '酒精' },
    { id: 'm', at: [X - 0.2, TOP + 0.3, -0.5], ax: 1, className: `scene-tag -translate-y-1/2 transition-opacity${ok ? ' key' : ''}`, style: { opacity: on ? 1 : 0 }, children: ok ? '指针偏转' : '指针不动' },
  ]

  return (
    <LabShell title="原电池" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="装置"
      stage={<Rig left={s.a} right={s.b} liquid={s.electrolyte ? LIQUID.acid : LIQUID.alcohol} joined apart={setup === 'apart'} flow={on && ok ? (neg === s.a ? 1 : -1) : 0} gasR={on && ok ? 0.9 : 0} gasL={on && !ok && s.electrolyte && setup === 'apart' ? 0.7 : 0} labels={labels} />}
      lesson={<LessonBlock no="3" title="少一样行不行" concept="四个条件，缺一个都不行" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>要形成原电池，得同时满足：</p>
          <ol className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">1.</b> 有两个活泼性不同的电极（两种金属，或一种金属和石墨）</li>
            <li><b className="text-[#7fe3d4]">2.</b> 电极插在电解质溶液里</li>
            <li><b className="text-[#7fe3d4]">3.</b> 形成闭合回路</li>
            <li><b className="text-[#7fe3d4]">4.</b> 有一个能自发进行的氧化还原反应</li>
          </ol>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种装置都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">只有四个条件都满足，电流表才偏转</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">电极一样、溶液不导电、回路不闭合，各缺了一样，都发不出电。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{s.name}</div>
            <div className="mt-1 text-[32px] leading-none font-bold tracking-tight text-[#7fe3d4]">{on ? (ok ? '指针偏转' : '指针不动') : '还没接通'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">四个条件</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px]">{(Object.keys(NEED) as (keyof typeof NEED)[]).map(k => <li key={k} className={`flex items-center justify-between rounded-xl px-3 py-2 ${on ? (c[k] ? 'bg-[#35c7b3]/20' : 'bg-[#ff6b6b]/20') : 'bg-white/6'}`}><span className="text-white/85">{NEED[k]}</span><b>{on ? (c[k] ? '有' : '没有') : '—'}</b></li>)}</ul>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">装置</th><th className="text-right font-normal">电流表</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{SETUPS[k].name}</td><td className="text-right font-semibold text-[#7fe3d4]">{works(SETUPS[k]) ? '偏转' : '不动'}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'try'} onClick={tryIt} disabled={on}>接通看看</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!on || dup}>记录</LabButton>
      </>}
      extras={<Control label="装置"><Segmented label="装置" pulse={next === 'setup'} want={next === 'setup' ? task!.id as SetupKey : null} value={setup} onChange={setSetup} options={KEYS.map(k => ({ value: k, label: SHORT[k] }))} /></Control>}
    />
  )
}
