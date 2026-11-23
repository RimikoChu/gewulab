// 声现象 · 第 1 课 声音是怎样产生的（声音由物体的振动产生；振动停止，发声也停止）
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { BallStand, DRUM_TOP, Drum, FORK, Fork, Glove, Hall, Mallet, P, Rings, SWING, ringing, type Hit, type Pose } from './gear'
import { LESSONS, goLesson } from './lessons'
import { FORK_HZ, period, sounding } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Dev = 'fork' | 'drum'
const NAME: Record<Dev, string> = { fork: '音叉', drum: '鼓' }
const TASKS: Task[] = [
  { id: 'fork:ring', text: '敲响音叉，看贴着叉臂的乒乓球', note: '乒乓球被一下下弹开：发声的音叉在振动' },
  { id: 'fork:hold', text: '趁音叉还在响，用手按住叉臂', note: '振动停了，声音也没有了' },
  { id: 'drum:ring', text: '换成鼓，敲一下，看鼓面上的碎纸屑', note: '纸屑跳个不停：发声的鼓面在振动' },
  { id: 'drum:hold', text: '趁鼓还在响，用手按住鼓面', note: '鼓面不振动了，鼓声立刻停了' },
]
const FX = -1.2, DX = 1.95
const REST: Pose = { p: [-0.3, 0.11, 1.05], a: Math.PI - 0.06 }
const STRIKE: Record<Dev, Pose> = { fork: { p: [FX + FORK.dx + FORK.half + 0.11, FORK.top - 0.3, 0], a: Math.PI - 0.75 }, drum: { p: [DX - 0.1, DRUM_TOP + 0.11, 0], a: Math.PI + 0.55 } }
const HAND: Pose = { p: [0.45, 0.1, 0.1], a: -1.3, rx: -Math.PI / 2 }
const HOLD: Record<Dev, Pose> = { fork: { p: [FX, FORK.top + 0.1, 0.17], a: 0, rx: 0 }, drum: { p: [DX + 0.1, DRUM_TOP + 0.1, 0.1], a: 0.2, rx: -Math.PI / 2 } }

export default function Lesson1() {
  const [dev, setDev] = useState<Dev>('fork')
  const [hit, setHit] = useState<Hit | null>(null)
  const [live, setLive] = useState(false)          // 现在是不是还在响
  const [held, setHeld] = useState(false)
  const [did, setDid] = useState<string[]>([])
  const T = useTasks('gewu:sound:1', TASKS)
  const k = useSlide(held ? 1 : 0, 2.2), pressed = k > 0.9
  const mark = (id: string) => setDid(d => { const n = d.includes(id) ? d : [...d, id]; T.check(x => n.includes(x)); return n })
  // 槌碰上的那一刻开始响；过几秒余音散尽
  useEffect(() => {
    if (!hit) { setLive(false); return }
    const a = setTimeout(() => setLive(true), Math.max(0, hit.t - performance.now())), b = setTimeout(() => mark(`${dev}:ring`), hit.t - performance.now() + 350), c = setTimeout(() => setLive(false), hit.t - performance.now() + 7000)
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c) }
  }, [hit])   // eslint-disable-line react-hooks/exhaustive-deps
  const wasLive = useRef(false)
  useEffect(() => { if (pressed && wasLive.current) { mark(`${dev}:hold`); wasLive.current = false } if (pressed) { setLive(false); setHit(null) } }, [pressed])   // eslint-disable-line react-hooks/exhaustive-deps
  const [tip, setTip] = useState<string | null>(null)
  const strike = () => { if (held) { setTip('手还按着呢：先把手拿开，再敲'); return } setTip(null); setHit({ t: performance.now() + SWING, amp: 1 }) }
  const hold = () => { setTip(null); if (!held) wasLive.current = live; setHeld(h => !h) }
  const pick = (d: Dev) => { setDev(d); setHit(null); setHeld(false); setTip(null) }
  const resetAll = () => { setDev('fork'); setHit(null); setHeld(false); setDid([]); setTip(null); T.reset() }
  const level = () => pressed ? 0 : ringing(hit) * (1 - k)
  const on = sounding(live && !pressed)

  const task = T.current, [td, ta] = (task?.id ?? ':').split(':') as [Dev, 'ring' | 'hold']
  const { hint, next }: { hint: string; next: 'dev' | 'strike' | 'hold' | null } = !task ? { hint: '都做完了。发声的物体都在振动；振动一停，声音就停。', next: null }
    : dev !== td ? { hint: `把器材换成${NAME[td]}`, next: 'dev' }
    : held && k < 1 ? { hint: '手按上去了…', next: null }
    : held ? { hint: '按“把手拿开”，再接着做', next: 'hold' }
    : ta === 'ring' ? { hint: `按“敲一下”，盯住${dev === 'fork' ? '乒乓球' : '鼓面上的纸屑'}`, next: 'strike' }
    : live ? { hint: `还在响：按“用手按住”，看${dev === 'fork' ? '乒乓球' : '纸屑'}还动不动`, next: 'hold' } : { hint: '声音已经散了：再敲一下，趁它还在响的时候按住', next: 'strike' }
  const labels: Label[] = [
    { id: 's', at: dev === 'fork' ? P('fork', FX + 0.5, FORK.top + 0.45) : P('fork', DX, DRUM_TOP + 1.3), ax: dev === 'fork' ? 0 : 0.5, className: `scene-tag -translate-y-full${on ? ' key' : ''}`, children: on ? '在振动 · 在发声' : '不振动 · 没有声音' },
    { id: 'f', at: P('fork', FX + 0.85, 0.3, 0.4), name: true, className: 'scene-name', children: `音叉和共鸣箱 · ${FORK_HZ} Hz` },
    { id: 'b', at: P('fork', FX - 0.5, FORK.top - 0.2), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '乒乓球' },
    { id: 'd', at: P('fork', DX, 0.1, 0.9), ax: 0.5, name: true, className: 'scene-name', children: '鼓 · 鼓面上撒了碎纸屑' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="声现象" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={tip ?? hint} actionsLabel={NAME[dev]}
      stage={<Hall at="fork" labels={labels}>
        <Fork x={FX} level={dev === 'fork' ? level : () => 0} />
        <BallStand x={FX - 1.75} to={[FX - FORK.dx - FORK.half - 0.1, FORK.top + 0.85]} len={1.05} dir={-1} level={dev === 'fork' ? level : () => 0} />
        <Drum x={DX} level={dev === 'drum' ? level : () => 0} />
        <Mallet rest={REST} hit={STRIKE[dev]} t0={hit ? hit.t - SWING : null} />
        <Glove rest={HAND} hold={HOLD[dev]} k={k} />
        <Rings at={dev === 'fork' ? [FX, FORK.top - 0.4, 0] : [DX, DRUM_TOP + 0.1, 0]} level={level} r1={2.3} />
      </Hall>}
      lesson={<LessonBlock no="1" title="声音是怎样产生的" concept="声音是由物体的振动产生的" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>声音是由物体的<b className="text-white">振动</b>产生的。正在发声的物体叫声源。<b className="text-white">振动停止，发声也停止。</b></p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>音叉的振动又快又小，眼睛看不清：让它碰一下乒乓球，球被弹开，振动就“放大”成看得见的了</li>
            <li>鼓面的振动也看不清：撒上碎纸屑，纸屑跳起来，就知道鼓面在动</li>
            <li>人说话靠声带振动，笛子靠管里的空气柱振动，琴靠弦振动</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这支音叉每秒振动 {FORK_HZ} 次，振动一次只要约 {(period(FORK_HZ) * 1000).toFixed(2)} 毫秒。画面里叉臂的摆动是放慢、放大了画的。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">音叉和鼓都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">声音是由物体的振动产生的</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">敲响时乒乓球被弹开、纸屑在跳；手一按住，振动停了，声音也跟着停了。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[dev]}</div>
            <div className="mt-1 text-[30px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{on ? '正在发声' : '没有声音'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="振动" value={on ? '在振动' : '不振动'} unit={dev === 'fork' ? '看乒乓球' : '看纸屑'} />
            <ParamTile symbol="手" value={held ? '按着' : '没按'} unit={held ? '振动被止住了' : '可以自由振动'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">做过的</h2>
          {did.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">先敲响，再按住。音叉和鼓各做一遍。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">器材</th><th className="font-normal">做了什么</th><th className="font-normal">有声音吗</th></tr></thead>
                <tbody>{did.map(id => { const [d, a] = id.split(':') as [Dev, string]; return <tr key={id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{NAME[d]}</td><td>{a === 'ring' ? '敲响，在振动' : '按住，不振动'}</td><td className="font-semibold text-[#7fe3d4]">{a === 'ring' ? '有' : '没有'}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'strike'} onClick={strike}>敲一下</LabButton>
        <LabButton pulse={next === 'hold'} onClick={hold} disabled={held && k < 1}>{held ? '把手拿开' : '用手按住'}</LabButton>
      </>}
      extras={<Control label="器材"><Segmented label="器材" pulse={next === 'dev'} want={next === 'dev' ? td : null} value={dev} onChange={pick} options={(['fork', 'drum'] as Dev[]).map(d => ({ value: d, label: NAME[d] }))} /></Control>}
    />
  )
}
