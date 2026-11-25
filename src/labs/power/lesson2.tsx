// 电功率和生活用电 · 第 2 课 电功率：厨房台面上的电水壶和电饭煲。家里别的电器都关着，只开一个，
// 数 1 分钟里电能表的指示灯闪了几次（3200 imp/(kW·h)），算出它用的电和功率，再和铭牌比一比。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { APPLIANCES, L2_T, METER, flashes, kwhOfFlashes, powerFromFlashes, type ApplianceKey } from './physics'
import { useRun, f0 } from './parts'
import { Big, Table } from './views'
import { Place } from './world'
import { BACK, COUNTER, Cm, KIT_SOCKETS, type V3 } from './layout'
import { Cord, Kettle, Plug, RiceCooker } from './home'

const TASKS: Task[] = [
  { id: 'kettle', text: '只开电水壶，数 1 分钟电能表闪了几次', note: '闪 96 次：1800 W' },
  { id: 'cooker', text: '换成电饭煲，再测一次', note: '闪 48 次：900 W' },
  { id: 'cmp', text: '把测出的功率和铭牌比一比', note: '和铭牌上的额定功率一样' },
]
/** 台面上两样电器的位置（场景坐标） */
const POS: Record<ApplianceKey, V3> = { kettle: [-22.2, COUNTER.y, -42.2], cooker: [-15.6, COUNTER.y, -42.4] }

/** 电能表指示灯的小图：每闪一次亮一下 */
function Blink({ n }: { n: number }) {
  return <span className={n % 2 ? 'inline-block size-3 rounded-full bg-[#ff4a3a] shadow-[0_0_10px_#ff4a3a]' : 'inline-block size-3 rounded-full bg-[#5a1a14]'} />
}

/** 两样电器、插头和电线 */
function Kitchen2({ on }: { on: ApplianceKey | null }) {
  return <>
    <Cm p={POS.kettle} yaw={1.2}><Kettle on={on === 'kettle'} /></Cm>
    <Cm p={POS.cooker} yaw={-0.15}><RiceCooker on={on === 'cooker'} /></Cm>
    {KIT_SOCKETS.map((s, i) => <Cm key={i} p={[s[0], s[1] - 0.2, BACK + 0.1]}><Plug three={i === 1} /></Cm>)}
    <Cm p={[0, 0, 0]}>
      {(['kettle', 'cooker'] as ApplianceKey[]).map((k, i) => { const s = KIT_SOCKETS[i], a = POS[k]; return <Cord key={k} pts={[[s[0] * 10, 107, -447], [s[0] * 10, 96, -447.5], [s[0] * 10 + 3, 87.2, -446], [(s[0] + a[0]) * 5, 87.2, -441], [a[0] * 10 + (i ? -2 : 4), 88, a[2] * 10 - (i ? 13 : 9)]]} /> })}
    </Cm>
  </>
}

export default function Lesson2() {
  const [sel, setSel] = useState<ApplianceKey>('kettle')
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<{ k: ApplianceKey; n: number }[]>([])
  const [measured, setMeasured] = useState<number | null>(null)
  const [cmp, setCmp] = useState(false)
  const T = useTasks('gewu:power:2', TASKS)
  const run = useRun(6, () => setMeasured(flashes(APPLIANCES[sel].p, L2_T)))
  const sec = run.k * L2_T, n = run.busy ? flashes(APPLIANCES[sel].p, sec) : measured ?? 0
  const has = (k: ApplianceKey) => rows.some(r => r.k === k)
  const record = () => { if (measured === null || has(sel)) return; const r = [...rows, { k: sel, n: measured }]; setRows(r); T.check(id => r.some(x => x.k === id)) }
  const compare = () => { if (rows.length < 2) return; setCmp(true); T.check(id => id === 'cmp') }
  const pick = (k: ApplianceKey) => { if (run.busy) return; setSel(k); setOn(false); setMeasured(null); run.snap(0) }
  const power = () => { if (run.busy) return; setOn(o => !o); setMeasured(null); run.snap(0) }
  const resetAll = () => { setSel('kettle'); setOn(false); setRows([]); setMeasured(null); setCmp(false); run.snap(0); T.reset() }
  const both = has('kettle') && has('cooker')

  const task = T.current
  const name = APPLIANCES[sel].name
  const { hint, next }: { hint: string; next: 'sel' | 'on' | 'time' | 'rec' | 'cmp' | null } = !task ? { hint: '电功率表示用电器消耗电能的快慢：P = W/t。', next: null }
    : both ? { hint: '两样都测好了。把测出的功率和铭牌比一比', next: 'cmp' }
    : sel !== task.id ? { hint: `把电器换成${APPLIANCES[task.id as ApplianceKey].name}`, next: 'sel' }
    : !on ? { hint: `家里别的电器都关着。给${name}通电`, next: 'on' }
    : run.busy ? { hint: '计时中，数电能表的指示灯闪了几次…', next: null }
    : measured === null ? { hint: '开始计时 1 分钟，数电能表的指示灯闪了几次', next: 'time' }
    : { hint: `1 分钟闪了 ${measured} 次。按“记录数据”`, next: 'rec' }

  const p = POS[sel]
  const labels: Label[] = [
    { id: 'n', at: [p[0], p[1] + (sel === 'kettle' ? 2.9 : 2.6), p[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: on ? 1 : 0 }, children: <><small>{run.busy ? `${f0(sec)} s` : measured !== null ? '1 分钟' : '电能表'}</small>闪了 {n} 次</> },
    { id: 'pk', at: [POS.kettle[0] - 1.4, POS.kettle[1] + 0.6, POS.kettle[2] + 1.2], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>铭牌</small>220 V 1800 W</> },
    { id: 'pc', at: [POS.cooker[0] + 1.6, POS.cooker[1] + 0.6, POS.cooker[2] + 1.4], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>铭牌</small>220 V 900 W</> },
    { id: 'nk', at: [POS.kettle[0], POS.kettle[1] + 0.1, POS.kettle[2] + 1.6], ax: 0.5, name: true, className: 'scene-name', children: '电水壶' },
    { id: 'nc', at: [POS.cooker[0], POS.cooker[1] + 0.1, POS.cooker[2] + 2.0], ax: 0.5, name: true, className: 'scene-name', children: '电饭煲' },
  ]
  const row = (k: ApplianceKey) => { const r = rows.find(x => x.k === k); return r ? [APPLIANCES[k].name, String(r.n), kwhOfFlashes(r.n).toFixed(3), f0(powerFromFlashes(r.n, L2_T)), cmp ? `${APPLIANCES[k].p}` : '—'] : [APPLIANCES[k].name, '—', '—', '—', '—'] }
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="测功率"
      stage={<Place at="l2" labels={labels}><Kitchen2 on={on ? sel : null} /></Place>}
      lesson={<LessonBlock no="2" title="电功率" concept="电功率是消耗电能的快慢" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电功率表示用电器消耗电能的快慢，等于电能与时间之比：<b className="text-white">P = W/t</b>。单位是瓦特（W），1 kW = 1000 W。</p>
          <p className="mt-3">用电能表测功率：只让这一个用电器工作，数出时间 t 内指示灯闪了 n 次，它消耗的电能 W = n/3200 kW·h，再用 P = W/t 算出功率。</p>
          <p className="mt-3 text-[13.5px] text-white/65">电水壶 1 分钟闪 96 次：W = 96/3200 kW·h = 0.03 kW·h，t = 1/60 h，P = 0.03 kW·h ÷ (1/60 h) = 1.8 kW。功率大的用电器，同样的时间里用的电多，指示灯闪得快。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">测出的功率和铭牌一致</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电水壶 1800 W，电饭煲 900 W：电水壶用电快一倍</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">P = W/t。同样 1 分钟，电水壶闪 96 次，电饭煲闪 48 次。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Big label="计时" value={run.busy || measured !== null ? f0(run.busy ? sec : L2_T) : '—'} unit="s" />
            <Big label={<span className="inline-flex items-center gap-1.5">指示灯闪 {on && (run.busy || measured === null) ? <Blink n={n} /> : null}</span>} value={on ? String(n) : '—'} unit="次" />
          </div>
          {run.busy && <p className="mt-2 text-center text-[12.5px] text-white/50">时间加快 10 倍</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="N" value={String(METER.imp)} unit="imp/(kW·h)" />
            <ParamTile symbol="t" value={String(L2_T)} unit="s · 计时" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据</h2>
          <div className="mt-1.5"><Table head={['电器', '次数', 'W / kW·h', 'P / W', '铭牌 / W']} rows={[row('kettle'), row('cooker')]} hl={rows.length - 1} /></div>
          <p className="mt-2 text-center font-formula text-[15px] italic text-white/65">P = W / t</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'on'} onClick={power} disabled={run.busy}>{on ? '断电' : '通电'}</LabButton>
        <LabButton pulse={next === 'time'} onClick={() => run.run()} disabled={!on || run.busy || measured !== null}>计时 1 分钟</LabButton>
        <LabButton primary={next === 'rec' || next === 'cmp'} pulse={next === 'rec' || next === 'cmp'} onClick={both ? compare : record} disabled={both ? cmp : measured === null || has(sel)}>{both ? '对照铭牌' : '记录数据'}</LabButton>
      </>}
      extras={
        <Control label="电器">
          <Segmented label="电器" pulse={next === 'sel'} want={next === 'sel' ? (task?.id as ApplianceKey) : null} disabled={run.busy} value={sel} onChange={k => pick(k as ApplianceKey)} options={(Object.keys(APPLIANCES) as ApplianceKey[]).map(k => ({ value: k, label: APPLIANCES[k].name }))} />
        </Control>
      }
    />
  )
}
