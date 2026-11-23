// 血液循环 · 第 6 课 肺循环：看着胸腔和两肺，从右心室送出一团血，经肺动脉到肺里的毛细血管变成动脉血，经肺静脉回到左心房；
// 认一认肺动脉、肺静脉里各流着什么血；最后让两条循环一起流。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Bolus, oxyAt, routes, stationAt } from './body'
import { beat } from './heart'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { BLOOD, PULMONARY, SYSTEMIC } from './physics'
import { BODY_Y, onBody, onHeart } from './world'

const TASKS: Task[] = [
  { id: 'start', text: '从右心室送出一团血，看它走到哪里', note: '血从右心室进肺动脉，分到左右两肺' },
  { id: 'change', text: '看它在哪里由静脉血变成动脉血', note: '在肺部的毛细血管里，静脉血变成了动脉血' },
  { id: 'back', text: '看它回到心脏的哪个腔', note: '血经肺静脉流回左心房' },
  { id: 'pair', text: '看肺动脉和肺静脉里各流着什么血', note: '肺动脉里流的是静脉血，肺静脉里流的是动脉血' },
  { id: 'both', text: '让两条循环一起流', note: '体循环和肺循环同时进行，在心脏处连成一条完整的途径' },
]
type Pick = 'pa' | 'pv'
const PICK: Record<Pick, { name: string; blood: 'artery' | 'vein'; at: [number, number, number] }> = {
  pa: { name: '肺动脉', blood: 'vein', at: onHeart([-0.4, 4.6, 0.4]) },
  pv: { name: '肺静脉', blood: 'artery', at: onHeart([5.6, 2.3, -0.8]) },
}

export default function Lesson6() {
  const [pick, setPick] = useState<Pick | null>(null)
  const [seen, setSeen] = useState<Record<Pick, boolean>>({ pa: false, pv: false })
  const [sent, setSent] = useState(false)
  const [both, setBoth] = useState(false)
  const T = useTasks('gewu:blood:6', TASKS)
  const r = routes().lungL
  const go = useRun(7, () => T.check(id => id === 'back'))
  useEffect(() => { beat.mode = 'auto'; beat.slow = 1 }, [])
  const s = go.k
  const hit = useRef({ cap: false, out: false })
  useEffect(() => {
    if (!go.busy) return
    if (!hit.current.cap && s >= r.cap[0]) { hit.current.cap = true; T.check(id => id === 'start') }
    if (!hit.current.out && s >= r.cap[1]) { hit.current.out = true; T.check(id => id === 'change') }
  }, [s, go.busy, r, T])
  const send = () => { if (go.busy || both) return; hit.current = { cap: false, out: false }; setSent(true); go.run() }
  const choose = (k: Pick) => { if (go.busy) return; setPick(k); const n = { ...seen, [k]: true }; setSeen(n); if (n.pa && n.pv) T.check(id => id === 'pair') }
  const resetAll = () => { go.snap(0); setSent(false); setPick(null); setSeen({ pa: false, pv: false }); setBoth(false); hit.current = { cap: false, out: false }; T.reset() }
  const task = T.current
  const want: Pick | null = task?.id === 'pair' ? (!seen.pa ? 'pa' : 'pv') : null
  const { hint, next }: { hint: string; next: 'send' | 'pick' | 'both' | null } = !task ? { hint: '肺循环：右心室 → 肺动脉 → 肺部毛细血管 → 肺静脉 → 左心房。', next: null }
    : go.busy ? { hint: `这团血到了：${stationAt(r, s)}`, next: null }
    : task.id === 'pair' ? { hint: `选“看${PICK[want!].name}”，看里面流着什么血`, next: 'pick' }
    : task.id === 'both' ? { hint: '按“两条循环一起”，看全身和两肺的血一起流', next: 'both' }
    : { hint: '按“送出一团血”，从右心室送到肺', next: 'send' }
  const oxy = sent ? oxyAt(r, s) : 0
  const station = sent && s > 0 ? stationAt(r, s) : '右心室'
  const p = r.table[Math.min(900, Math.max(0, Math.round((Number.isFinite(s) ? s : 0) * 900)))]
  const labels: Label[] = [
    ...(sent && go.busy ? [{ id: 'b', at: [p.x + 0.18, p.y + BODY_Y + 0.12, p.z] as [number, number, number], ax: 0, className: 'scene-tag key -translate-y-full', children: <><small>{oxy > 0.5 ? '动脉血' : '静脉血'}</small>{station}</> }] : []),
    ...(pick ? [{ id: 'pk', at: PICK[pick].at, ax: pick === 'pa' ? 1 : 0, className: 'scene-tag key -translate-y-full', children: <><small>{PICK[pick].name}里是</small>{BLOOD[PICK[pick].blood].name}</> }] : []),
    { id: 'l', at: onBody([-1.9, 14.0, 0.2]), ax: 1, name: true, className: 'scene-name', children: '右肺' },
    { id: 'r', at: onBody([1.95, 14.0, 0.2]), ax: 0, name: true, className: 'scene-name', children: '左肺' },
    { id: 'rv', at: onHeart([-2.6, -2.6, 2]), ax: 1, name: true, className: 'scene-name', children: '右心室' },
    { id: 'la', at: onHeart([3.4, 3.2, 0]), ax: 0, name: true, className: 'scene-name', children: '左心房' },
  ]
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="一团血"
      stage={<Place at="chest" labels={labels} want={{ look: { shell: 0.35, lungs: 0.8, tree: 1 }, stream: both ? 'all' : 'none' }}>
        {sent && <group position-y={BODY_Y}><Bolus route="lungL" s={s} size={0.1} /></group>}
      </Place>}
      lesson={<LessonBlock no="6" title="肺循环" concept="肺循环把静脉血送到肺，换成动脉血" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>血液由<b className="text-white">右心室</b>进入肺动脉，流经肺部的毛细血管网，再由肺静脉流回<b className="text-white">左心房</b>。这一循环途径叫做肺循环。</p>
          <p className="mt-3">肺泡外面缠绕着丰富的毛细血管。血液流经这里时，肺泡里的氧进入血液，血液里的二氧化碳进入肺泡，<b className="text-white">静脉血变成了动脉血</b>。</p>
          <p className="mt-3">所以肺动脉里流的是静脉血，肺静脉里流的是动脉血。“动脉里流动脉血”这句话不对：动脉、静脉是按血流的方向分的（离开心脏、回到心脏），不是按里面的血分的。</p>
          <p className="mt-3 text-[13.5px] text-white/65">体循环和肺循环同时进行，在心脏处连在一起，组成一条完整的循环途径。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两条循环都走过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">肺循环起于右心室，止于左心房；在肺部的毛细血管里，静脉血变成动脉血</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">肺动脉里流静脉血，肺静脉里流动脉血。体循环和肺循环同时进行，在心脏处连在一起。</p>
          <p className="mt-2 text-[12.5px] text-white/50">每片肺里的毛细血管只画了一小片；红细胞画得比真的大得多。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">这团血现在</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight">{station}</div>
            <div className={`mt-2 text-[15px] font-semibold ${oxy > 0.5 ? 'text-[#ff8a8f]' : 'text-[#8fb0ff]'}`}>{oxy > 0.5 ? '动脉血 · 含氧多' : '静脉血 · 含氧少'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两条循环</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12.5px]">
            {[PULMONARY, SYSTEMIC].map(c => <div key={c.name} className="rounded-xl bg-white/8 px-2.5 py-2"><div className="text-[14px] font-semibold">{c.name}</div><div className="mt-1 leading-relaxed text-white/65">{c.stops.join(' → ')}</div><div className="mt-1 text-[#7fe3d4]">{c.change}</div></div>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="肺动脉" value={seen.pa ? '静脉血' : '?'} unit="离开心脏" />
            <ParamTile symbol="肺静脉" value={seen.pv ? '动脉血' : '?'} unit="回到心脏" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'send'} pulse={next === 'send'} onClick={send} disabled={go.busy || both}>送出一团血</LabButton>
        <LabButton primary={next === 'both'} pulse={next === 'both'} onClick={() => { setBoth(true); setSent(false); T.check(id => id === 'both') }} disabled={go.busy || both || !T.done.pair}>两条循环一起</LabButton>
      </>}
      extras={
        <Control label="看哪根血管">
          <Segmented label="看哪根血管" pulse={next === 'pick'} want={want} disabled={go.busy} value={pick ?? ('' as Pick)} onChange={k => choose(k as Pick)} options={[{ value: 'pa' as Pick, label: '看肺动脉' }, { value: 'pv' as Pick, label: '看肺静脉' }]} />
        </Control>
      }
    />
  )
}
