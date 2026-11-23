// 原电池 · 第 4 课 换一对电极（较活泼的金属做负极；活泼性差得越多，电压越高）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { METALS, emf, negativeOf, type MetalKey } from './physics'
import Rig, { X } from './rig'
import { TOP } from './world'

const PAIRS = { ZnCu: ['Zn', 'Cu'], FeCu: ['Fe', 'Cu'], ZnFe: ['Zn', 'Fe'] } as const satisfies Record<string, [MetalKey, MetalKey]>
type PairKey = keyof typeof PAIRS
const KEYS = Object.keys(PAIRS) as PairKey[]
const label = (k: PairKey) => `${METALS[PAIRS[k][0]].name}–${METALS[PAIRS[k][1]].name}`
const neg = (k: PairKey) => negativeOf(PAIRS[k][0], PAIRS[k][1])!
const volt = (k: PairKey) => emf(PAIRS[k][0], PAIRS[k][1])
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `换成${label(k)}，记下谁是负极`, note: `${METALS[neg(k)].name}更活泼，做负极；理论电压 ${volt(k).toFixed(2)} V` }))

export default function Lesson4() {
  const [pair, setPair] = useState<PairKey>('ZnCu')
  const [rows, setRows] = useState<PairKey[]>([])
  const T = useTasks('gewu:battery:4', TASKS)
  const [a, b] = PAIRS[pair], n = neg(pair), dup = rows.includes(pair)
  const record = () => { if (dup) return; const next = [...rows, pair]; setRows(next); T.check(id => next.includes(id as PairKey)) }
  const resetAll = () => { setPair('ZnCu'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'pair' | 'record' | null } = !task ? { hint: '三对都记完了。铁在锌面前是正极，在铜面前是负极。', next: null }
    : pair !== task.id ? { hint: `把电极换成${label(task.id as PairKey)}`, next: 'pair' } : { hint: '看电子从哪片流向哪片，按“记录”', next: 'record' }
  const tag = (m: MetalKey) => <><small>{m === n ? '负极' : '正极'}</small>{METALS[m].name}片</>
  const labels: Label[] = [
    { id: 'a', at: [X - 0.3, TOP + 0.62, 0], ax: 1, className: `scene-tag -translate-y-1/2${a === n ? ' key' : ''}`, children: tag(a) },
    { id: 'b', at: [X + 0.3, TOP + 0.62, 0], className: `scene-tag -translate-y-1/2${b === n ? ' key' : ''}`, children: tag(b) },
    { id: 'v', at: [X - 0.2, TOP + 0.3, -0.5], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>理论电压</small>{volt(pair).toFixed(2)} V</> },
  ]

  return (
    <LabShell title="原电池" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电极"
      stage={<Rig left={a} right={b} joined flow={(a === n ? 1 : -1) * Math.min(1, volt(pair) / 1.1)} gasR={0.8} labels={labels} />}
      lesson={<LessonBlock no="4" title="换一对电极" concept="较活泼的金属做负极" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两种金属做电极时，<b className="text-white">较活泼的那一种更容易失去电子，做负极</b>。活泼不活泼是比出来的：铁和铜在一起，铁是负极；铁和锌在一起，铁就成了正极。</p>
          <p className="mt-3">两种金属的活泼性差得越多，电池的电压越高。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的电压是用标准电极电势算的理论值（锌 {METALS.Zn.e} V、铁 {METALS.Fe.e} V、铜 +{METALS.Cu.e} V，两者相减），指两种金属各自浸在自己的盐溶液里的情形。直接插在稀硫酸里实测到的会低一些。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三对电极都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">谁更活泼，谁就是负极</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">锌和铜差得最多，电压最高（{volt('ZnCu').toFixed(2)} V）；锌和铁差得最少（{volt('ZnFe').toFixed(2)} V）。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{label(pair)} · 理论电压</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{volt(pair).toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">V</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="负极" value={METALS[n].name} unit="较活泼，失电子" />
            <ParamTile symbol="正极" value={METALS[a === n ? b : a].name} unit="较不活泼" />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">电极</th><th className="font-normal">负极</th><th className="text-right font-normal">理论电压</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{label(k)}</td><td className="font-semibold text-[#7fe3d4]">{METALS[neg(k)].name}</td><td className="text-right tabular-nums">{volt(k).toFixed(2)} V</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录</LabButton></>}
      extras={<Control label="电极"><Segmented label="电极" pulse={next === 'pair'} want={next === 'pair' ? task!.id as PairKey : null} value={pair} onChange={setPair} options={KEYS.map(k => ({ value: k, label: label(k) }))} /></Control>}
    />
  )
}
