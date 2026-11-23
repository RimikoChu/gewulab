// 电路 · 拓展课：这套房子里真的电路。楼梯灯的双控开关（楼下、楼上各一个单刀双掷开关，扳任意一个都能开灯、关灯）；
// 前墙的插座（家里的插座都并联在 220 V 上，插上的用电器各自工作，拔掉一个别的照常）。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { MAINS, sockets, twoWay } from './physics'
import { OUTLET, STAIR_SW, type V3 } from './world'

type Sub = 'stair' | 'plug'
const SUBS: Record<Sub, string> = { stair: '楼梯灯的双控开关', plug: '插座是并联的' }
const TASKS: Task[] = [
  { id: 'down', text: '楼梯灯：在楼下扳一下开关，把灯打开', note: '两个开关扳到同一根联络线上，电路接通，灯亮' },
  { id: 'up', text: '走到楼上，扳一下楼上的开关，把灯关掉', note: '扳任意一个开关都能改变灯的亮灭：上楼开灯、到了楼上关灯' },
  { id: 'both', text: '插座：插上台灯，再插上电水壶', note: `两个插座并联在 ${MAINS} V 上，台灯和电水壶各自工作` },
  { id: 'pull', text: '拔掉台灯，看电水壶', note: '电水壶照常工作：家里的插座和用电器是并联的，互不影响' },
]
const tag = (p: V3, d: V3): V3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]

/** 双控开关的电路图：火线进楼下开关的刀，两根联络线接到楼上开关的两个触点，楼上开关的刀接灯，灯接零线 */
function TwoWayView({ down, up, lit }: { down: 0 | 1; up: 0 | 1; lit: boolean }) {
  const c = lit ? '#ffe27a' : '#7d8a93', y = [44, 84]
  return (
    <svg viewBox="0 0 260 130" className="mt-2 w-full rounded-lg" role="img" aria-label="双控开关的电路图">
      <rect width={260} height={130} fill="#182026" />
      <text x={14} y={68} fontSize={11} fill="#e7ecef">火线</text>
      <path d={`M40 64 L66 64`} stroke={c} strokeWidth={1.8} />
      {y.map((yy, i) => <path key={i} d={`M92 ${yy} L168 ${yy}`} stroke={lit && down === i ? '#ffe27a' : '#7d8a93'} strokeWidth={1.8} fill="none" />)}
      {[0, 1].map(i => <g key={i}><circle cx={92} cy={y[i]} r={2.4} fill="#e7ecef" /><circle cx={168} cy={y[i]} r={2.4} fill="#e7ecef" /></g>)}
      <circle cx={66} cy={64} r={2.4} fill="#e7ecef" /><line x1={66} y1={64} x2={90} y2={y[down]} stroke="#e7ecef" strokeWidth={1.8} />
      <circle cx={194} cy={64} r={2.4} fill="#e7ecef" /><line x1={194} y1={64} x2={170} y2={y[up]} stroke="#e7ecef" strokeWidth={1.8} />
      <path d="M194 64 L214 64 L214 40" stroke={c} strokeWidth={1.8} fill="none" />
      <circle cx={214} cy={30} r={9} fill={lit ? '#ffd27a33' : '#182026'} stroke={lit ? '#ffe27a' : '#e7ecef'} strokeWidth={1.6} />
      <path d="M207.6 23.6 L220.4 36.4 M220.4 23.6 L207.6 36.4" stroke={lit ? '#ffe27a' : '#e7ecef'} strokeWidth={1.6} />
      <path d="M223 30 L244 30 L244 112 L40 112" stroke="#7d8a93" strokeWidth={1.8} fill="none" /><text x={14} y={116} fontSize={11} fill="#e7ecef">零线</text>
      <text x={78} y={124} fontSize={11} textAnchor="middle" fill="#e7ecef">楼下</text><text x={182} y={124} fontSize={11} textAnchor="middle" fill="#e7ecef">楼上</text>
    </svg>
  )
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('stair')
  const [sw, setSw] = useState<[0 | 1, 0 | 1]>([0, 1])
  const [plugs, setPlugs] = useState({ lamp: false, kettle: false })
  const T = useTasks('gewu:circuit:x', TASKS)
  const lit = twoWay(sw[0], sw[1]), S = sockets(plugs)
  const upstairs = !!T.done.down          // 楼下开了灯，人就上楼了：镜头跟着到楼上的开关
  const flip = (i: 0 | 1) => {
    const n: [0 | 1, 0 | 1] = i === 0 ? [sw[0] ? 0 : 1, sw[1]] : [sw[0], sw[1] ? 0 : 1]; setSw(n)
    const on = twoWay(n[0], n[1])
    if (i === 0 && on) T.check(id => id === 'down')
    if (i === 1 && !on && T.done.down) T.check(id => id === 'up')
  }
  const plug = (k: 'lamp' | 'kettle') => {
    const n = { ...plugs, [k]: !plugs[k] }; setPlugs(n)
    if (n.lamp && n.kettle) T.check(id => id === 'both')
    if (!n.lamp && n.kettle && T.done.both) T.check(id => id === 'pull')
  }
  const resetAll = () => { setSub('stair'); setSw([0, 1]); setPlugs({ lamp: false, kettle: false }); T.reset() }
  const task = T.current
  const goal: Sub | null = !task ? null : task.id === 'down' || task.id === 'up' ? 'stair' : 'plug'
  const want = goal && goal !== sub ? goal : null
  const { hint, next }: { hint: string; next: 'down' | 'up' | 'lamp' | 'kettle' | 'sub' | null } = !task ? { hint: '扳任意一个双控开关都能改变灯的亮灭；家里的插座和用电器是并联的。', next: null }
    : want ? { hint: want === 'plug' ? '楼梯灯试过了。换到“插座是并联的”' : '换到“楼梯灯的双控开关”', next: 'sub' }
    : task.id === 'down' ? { hint: lit ? '先在楼上把灯关掉' : '你在楼下，楼梯黑着。按“扳楼下的开关”', next: lit ? 'up' : 'down' }
    : task.id === 'up' ? { hint: '灯亮了，你上了楼。按“扳楼上的开关”把灯关掉', next: 'up' }
    : task.id === 'both' ? (!plugs.lamp ? { hint: '按“插上台灯”', next: 'lamp' } : { hint: '台灯亮了。再按“插上电水壶”', next: 'kettle' })
    : { hint: '两样都在工作。按“拔掉台灯”，看电水壶', next: 'lamp' }
  const labels: Label[] = sub === 'stair' ? [
    upstairs ? { id: 'u', at: tag(STAIR_SW.up, [-1, 1.4, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>楼上</small>开关</> }
      : { id: 'd', at: tag(STAIR_SW.down, [-1, 1.4, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>楼下</small>开关</> },
    { id: 'w', at: [79.4, 53.5, upstairs ? 4 : 30], ax: 0.5, className: 'scene-name -translate-y-full', children: '墙槽里的两根联络线' },
    { id: 'l', at: tag(STAIR_SW.lamp, [-1, 2.4, 0]), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>楼梯灯</small>{lit ? '亮' : '灭'}</> },
  ] : [
    { id: 'o', at: [OUTLET.x, OUTLET.y + 1.4, OUTLET.z - 0.5], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>插座</small>{MAINS} V</> },
    { id: 'a', at: [OUTLET.x - 8.7, 6.6, OUTLET.z - 3.2], ax: 0.5, className: 'scene-name -translate-y-full', children: `台灯 · ${S.lamp.on ? '工作' : '不工作'}` },
    { id: 'k', at: [OUTLET.x - 4.3, 5.2, OUTLET.z - 3.2], ax: 0.5, className: 'scene-name -translate-y-full', children: `电水壶 · ${S.kettle.on ? '工作' : '不工作'}` },
  ]
  return (
    <LabShell title="电路" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub]}
      stage={<Place at={sub === 'plug' ? 'outlet' : upstairs ? 'stairUp' : 'stairDown'} labels={labels} want={{ stairLamp: lit, sw, plugs }} />}
      lesson={<LessonBlock no="拓展" title="房子里的电路" concept="家里的用电器都是并联的" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">双控开关</b>：楼下、楼上各装一个单刀双掷开关，两个开关之间用两根导线（联络线）连起来。两个开关扳到同一根联络线上时电路接通，扳到不同的线上时断开，所以扳动任意一个都能改变灯的状态。</p>
          <p className="mt-3"><b className="text-white">家庭电路</b>：电压是 {MAINS} V。电灯、插座、各种用电器都并联在火线和零线之间，每个用电器两端都是 {MAINS} V，各自工作、互不影响；控制电灯的开关和电灯串联，接在火线上。</p>
          <p className="mt-3 text-[13.5px] text-white/65">家庭电路的电压远高于安全电压，不要自己拆接墙里的线。装修时的水电改造由持证电工来做。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">房子里的电路看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">两个双控开关都能控制楼梯灯；家里的插座和用电器都是并联的</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'stair' ? <>
            <div className="text-center"><div className="text-[13px] text-white/60">楼梯灯</div><div className="mt-1 text-[44px] leading-none font-bold" style={{ color: lit ? '#ffe27a' : undefined }}>{lit ? '亮' : '灭'}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="楼下" value={`扳到 ${sw[0] + 1}`} unit="单刀双掷开关" />
              <ParamTile symbol="楼上" value={`扳到 ${sw[1] + 1}`} unit="单刀双掷开关" />
            </div>
            <h2 className="mt-4 text-[12.5px] text-white/55">电路图</h2>
            <TwoWayView down={sw[0]} up={sw[1]} lit={lit} />
          </> : <>
            <div className="text-center"><div className="text-[13px] text-white/60">插座的电压</div><div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{MAINS}<span className="ml-1 text-[15px] font-medium text-white/55">V</span></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="台灯" value={S.lamp.on ? `${S.lamp.u} V` : '—'} unit={S.lamp.on ? '工作' : '没插'} />
              <ParamTile symbol="电水壶" value={S.kettle.on ? `${S.kettle.u} V` : '—'} unit={S.kettle.on ? '工作' : '没插'} />
            </div>
            <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">插座的两个孔一个接火线、一个接零线。插上的用电器两端都是 {MAINS} V，拔掉一个，别的照常工作。</p>
          </>}
        </Glass>
      }
      actions={sub === 'stair' ? <>
        <LabButton primary={next === 'down'} pulse={next === 'down'} onClick={() => flip(0)}>扳楼下的开关</LabButton>
        <LabButton primary={next === 'up'} pulse={next === 'up'} onClick={() => flip(1)}>扳楼上的开关</LabButton>
      </> : <>
        <LabButton primary={next === 'lamp'} pulse={next === 'lamp'} onClick={() => plug('lamp')}>{plugs.lamp ? '拔掉台灯' : '插上台灯'}</LabButton>
        <LabButton primary={next === 'kettle'} pulse={next === 'kettle'} onClick={() => plug('kettle')}>{plugs.kettle ? '拔掉电水壶' : '插上电水壶'}</LabButton>
      </>}
      extras={
        <Control label="专题">
          <Segmented label="专题" pulse={next === 'sub'} want={want} value={sub} onChange={setSub} options={(['stair', 'plug'] as Sub[]).map(k => ({ value: k, label: SUBS[k] }))} />
        </Control>
      }
    />
  )
}
