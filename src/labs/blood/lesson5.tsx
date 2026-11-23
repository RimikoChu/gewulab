// 血液循环 · 第 5 课 体循环：看着整个人，从左心室送出一团血，跟着它走到下肢、在毛细血管里变成静脉血、沿静脉回到右心房；
// 换去头部再送一次；最后让全身的血一起流起来。
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Bolus, oxyAt, routes, stationAt } from './body'
import { beat } from './heart'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { BODY_KG, ORGANS, SYSTEMIC, bloodMass, type OrganKey } from './physics'
import { BODY_Y, onBody } from './world'

const [M0, M1] = bloodMass(BODY_KG)
const TASKS: Task[] = [
  { id: 'start', text: '从左心室送出一团血，看它走到哪里', note: '血从左心室进主动脉，再沿着动脉分到全身' },
  { id: 'change', text: '看它在哪里由动脉血变成静脉血', note: '在全身各处的毛细血管里，动脉血变成了静脉血' },
  { id: 'back', text: '看它从哪里回到心脏', note: '从下肢回来的血经下腔静脉流回右心房' },
  { id: 'head', text: '换成去头部，再送一次', note: '从头部回来的血经上腔静脉流回右心房' },
  { id: 'flow', text: '让全身的血流起来', note: `全身的血都在体循环里流着：体重 ${BODY_KG} kg 的人约有 ${M0}–${M1} kg 血` },
]
const DEST: OrganKey[] = ['leg', 'head', 'arm', 'gut']

export default function Lesson5() {
  const [dest, setDest] = useState<OrganKey>('leg')
  const [sent, setSent] = useState<OrganKey | null>(null)
  const [flow, setFlow] = useState(false)
  const T = useTasks('gewu:blood:5', TASKS)
  const R = routes()
  const r = R[sent ?? dest]
  const go = useRun(6 + r.len / 9, () => { if (sent === 'head') T.check(id => id === 'head'); else T.check(id => id === 'back') })
  useEffect(() => { beat.mode = 'auto'; beat.slow = 1 }, [])
  const s = go.k
  // 一团血走到哪里，就把那一步打勾
  const seen = useRef({ cap: false, out: false })
  useEffect(() => {
    if (!go.busy || sent !== 'leg') return
    if (!seen.current.cap && s >= r.cap[0]) { seen.current.cap = true; T.check(id => id === 'start') }
    if (!seen.current.out && s >= r.cap[1]) { seen.current.out = true; T.check(id => id === 'change') }
  }, [s, go.busy, sent, r, T])
  const send = () => { if (go.busy || flow) return; seen.current = { cap: false, out: false }; setSent(dest); go.run() }
  const pick = (k: OrganKey) => { if (go.busy) return; setDest(k); setSent(null); go.snap(0) }
  const resetAll = () => { go.snap(0); setSent(null); setDest('leg'); setFlow(false); seen.current = { cap: false, out: false }; T.reset() }
  const task = T.current
  const want: OrganKey | null = task?.id === 'head' && dest !== 'head' ? 'head' : task && ['start', 'change', 'back'].includes(task.id) && dest !== 'leg' ? 'leg' : null
  const { hint, next }: { hint: string; next: 'send' | 'dest' | 'flow' | null } = !task ? { hint: '体循环：左心室 → 主动脉 → 各级动脉 → 全身毛细血管 → 各级静脉 → 上、下腔静脉 → 右心房。', next: null }
    : go.busy ? { hint: `这团血到了：${stationAt(r, s)}`, next: null }
    : want ? { hint: `把“去哪里”换成“${ORGANS[want].name}”`, next: 'dest' }
    : task.id === 'flow' ? { hint: '按“全身流动”，让全身的血都流起来', next: 'flow' }
    : { hint: `按“送出一团血”，从左心室送到${ORGANS[dest].name}`, next: 'send' }
  const oxy = sent ? oxyAt(r, s) : 1
  const station = sent && s > 0 ? stationAt(r, s) : '左心室'
  const p = r.table[Math.min(900, Math.max(0, Math.round((Number.isFinite(s) ? s : 0) * 900)))]
  const labels: Label[] = [
    ...(sent && go.busy ? [{ id: 'b', at: [p.x + 0.7, p.y + BODY_Y, p.z] as [number, number, number], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>{oxy > 0.5 ? '动脉血' : '静脉血'}</small>{station}</> }] : []),
    { id: 'lv', at: onBody([1.3, 12.0, 0.6]), ax: 0, name: true, className: 'scene-name', children: '左心室' },
    { id: 'ra', at: onBody([-1.2, 12.5, 0.6]), ax: 1, name: true, className: 'scene-name', children: '右心房' },
  ]
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="一团血"
      stage={<Place at="body" labels={labels} want={{ look: { shell: 0.75, lungs: 0.35, tree: 1 }, stream: flow ? 'all' : 'none' }}>
        {sent && <group position-y={BODY_Y}><Bolus route={sent} s={s} size={0.2} /></group>}
      </Place>}
      lesson={<LessonBlock no="5" title="体循环" concept="体循环把动脉血送到全身，换回静脉血" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>血液由<b className="text-white">左心室</b>进入主动脉，再流经全身的各级动脉、毛细血管网、各级静脉，最后汇集到上、下腔静脉，流回到<b className="text-white">右心房</b>。这一循环途径叫做体循环。</p>
          <p className="mt-3">在全身各处的毛细血管里，血液把氧和养料交给组织细胞，带走细胞产生的二氧化碳等废物，由含氧多、颜色鲜红的<b className="text-white">动脉血</b>变成含氧少、颜色暗红的<b className="text-white">静脉血</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">画面里只画了几根主要的血管和几片毛细血管网；静脉血用暗蓝色表示。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">跟着血走完了体循环</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">体循环起于左心室，止于右心房；在全身的毛细血管里，动脉血变成静脉血</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">下肢、腹部回来的血经下腔静脉，头部、上肢回来的血经上腔静脉，都流回右心房。</p>
          <p className="mt-2 text-[12.5px] text-white/50">红细胞画得比真的大得多；真实的静脉血是暗红色的。</p>
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
          <h2 className="mt-4 text-[12.5px] text-white/55">体循环的途径</h2>
          <ol className="mt-2 flex flex-col gap-1 text-[13.5px]">
            {SYSTEMIC.stops.map((n, i) => { const on = (station === '左心室' && i === 0) || (station.includes('主动脉') && i === 1) || (station.includes('的动脉') && i === 2) || (station.includes('毛细血管') && i === 3) || (station.includes('的静脉') && i === 4) || (station.includes('腔静脉') && i === 5) || (station === '右心房' && i === 6)
              return <li key={n} className={`rounded-lg px-2.5 py-1 ${on && sent ? 'bg-white/14 font-semibold text-white' : 'text-white/60'}`}>{n}</li> })}
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="回到" value={ORGANS[sent ?? dest].back} unit={`从${ORGANS[sent ?? dest].name}回右心房`} />
            <ParamTile symbol="血量" value={T.done.flow ? `${M0}–${M1} kg` : '—'} unit={`体重 ${BODY_KG} kg 的 7%–8%`} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'send'} pulse={next === 'send'} onClick={send} disabled={go.busy || flow}>送出一团血</LabButton>
        <LabButton primary={next === 'flow'} pulse={next === 'flow'} onClick={() => { setFlow(true); setSent(null); T.check(id => id === 'flow') }} disabled={go.busy || flow || !T.done.head}>全身流动</LabButton>
      </>}
      extras={
        <Control label="去哪里">
          <Segmented label="去哪里" pulse={next === 'dest'} want={want} disabled={go.busy || flow} value={dest} onChange={k => pick(k as OrganKey)} options={DEST.map(k => ({ value: k, label: `去${ORGANS[k].name}` }))} />
        </Control>
      }
    />
  )
}
