// 电与磁 · 第 2 课 磁场和磁感线：实验台第 2 格。玻璃板下放条形磁体，撒铁屑、轻敲；放八枚小磁针；画出磁感线。
// 换成蹄形磁体再做一遍；最后转到旁边的地球仪，看地磁场。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { bearing, needleAngle } from './physics'
import { L2, SPOTS, Scene2 } from './scene2'
import { GLOBE } from './magnets'
import { Bench, Place, toWorld } from './world'
import { useSeq } from './anim'

const TASKS: Task[] = [
  { id: 'filings', text: '撒上铁屑，轻敲玻璃板', note: '铁屑排成一条条曲线，两极附近最密' },
  { id: 'needles', text: '在磁体周围放上小磁针', note: '小磁针 N 极所指的方向，就是那一点的磁场方向' },
  { id: 'lines', text: '画出磁感线', note: '磁感线从 N 极出来，回到 S 极' },
  { id: 'horse', text: '换成蹄形磁体，再撒铁屑、画磁感线', note: '两极之间的磁感线几乎是平行的' },
  { id: 'earth', text: '换成地球仪，看地磁场', note: '地磁的 N 极在地理南极附近，S 极在地理北极附近' },
]
type Kind = 'bar' | 'horse' | 'earth'
const NAME: Record<Kind, string> = { bar: '条形磁体', horse: '蹄形磁体', earth: '地球仪' }

export default function Lesson2() {
  const [kind, setKind] = useState<Kind>('bar')
  const [shown, setShown] = useState(false)
  const [tapped, setTapped] = useState(false)
  const [needles, setNeedles] = useState(false)
  const [lines, setLines] = useState(false)
  const T = useTasks('gewu:magnet:2', TASKS)
  const seq = useSeq()
  const draw = useSlide(lines ? 1 : 0, 0.55)
  const drawn = lines && draw > 0.999
  const resetAll = () => { seq.stop(); setKind('bar'); setShown(false); setTapped(false); setNeedles(false); setLines(false); T.reset() }
  const switchTo = (k: Kind) => { seq.stop(); setKind(k); setShown(false); setTapped(false); setNeedles(false); setLines(false) }
  const sprinkle = () => seq.run([[0, () => setShown(true)], [1500, () => setTapped(true)], [1600, () => {}]])
  useEffect(() => {
    if (kind === 'bar' && tapped && !seq.busy) T.check(id => id === 'filings')
    if (kind === 'bar' && needles) T.check(id => id === 'needles')
    if (kind === 'bar' && drawn) T.check(id => id === 'lines')
    if (kind === 'horse' && tapped && drawn) T.check(id => id === 'horse')
    if (kind === 'earth' && drawn) T.check(id => id === 'earth')
  }, [kind, tapped, needles, drawn, seq.busy])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  const want: Kind = !task ? kind : task.id === 'horse' ? 'horse' : task.id === 'earth' ? 'earth' : 'bar'
  type Next = 'kind' | 'sprinkle' | 'needles' | 'lines' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '磁感线从 N 极出来，回到 S 极。', next: null }
    if (seq.busy) return { hint: '撒铁屑，轻轻敲几下玻璃板…', next: null }
    if (lines && !drawn) return { hint: '画磁感线…', next: null }
    if (kind !== want) return { hint: `换成${NAME[want]}`, next: 'kind' }
    if (task.id === 'filings') return { hint: '在玻璃板上撒铁屑，再轻敲玻璃板', next: 'sprinkle' }
    if (task.id === 'needles') return { hint: '在磁体周围放上小磁针，看 N 极指向哪里', next: 'needles' }
    if (task.id === 'lines') return { hint: '顺着铁屑和小磁针，画出磁感线', next: 'lines' }
    if (task.id === 'horse') return !tapped ? { hint: '蹄形磁体：撒铁屑，轻敲玻璃板', next: 'sprinkle' } : { hint: '画出蹄形磁体的磁感线', next: 'lines' }
    return { hint: '画出地球周围的磁感线', next: 'lines' }
  })()

  const W = (p: [number, number, number]) => toWorld('l2', p)
  const G = L2.globe
  const labels: Label[] = kind === 'earth' ? [
    { id: 'gn', at: W([G[0] - Math.sin(GLOBE.tilt) * (GLOBE.R + 2.5), GLOBE.cy + Math.cos(GLOBE.tilt) * (GLOBE.R + 2.5), G[2]]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>地理北极附近</small>地磁 S 极</> },
    { id: 'gs', at: W([G[0] + Math.sin(GLOBE.tilt) * (GLOBE.R + 2), GLOBE.cy - Math.cos(GLOBE.tilt) * (GLOBE.R + 2), G[2] + 4]), ax: 0, className: 'scene-tag', children: <><small>地理南极附近</small>地磁 N 极</> },
  ] : [
    { id: 'n1', at: W([-17, 11, -15]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '铁屑' },
    { id: 'n2', at: W([0, 3, L2.d / 2]), ax: 0.5, name: true, className: 'scene-name', children: `玻璃板下面是${NAME[kind]}` },
  ]
  const arr = kind === 'earth' ? [] : SPOTS[kind].map(p => bearing(needleAngle(kind, p)))
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel={NAME[kind]}
      stage={<Place at={kind === 'earth' ? 'l2e' : 'l2'} labels={labels}><Bench at="l2">
        <Scene2 kind={kind} shown={shown} tapped={tapped} needles={needles} lines={draw} />
      </Bench></Place>}
      lesson={<LessonBlock no="2" title="磁场和磁感线" concept="磁感线从 N 极出来，回到 S 极" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>磁体周围存在一种看不见、摸不着的物质，叫<b className="text-white">磁场</b>。磁极间的相互作用就是通过磁场发生的。</p>
          <p className="mt-3">磁场有方向：在磁场中的某一点，小磁针静止时 <b className="text-white">N 极所指的方向</b>，就是那一点的磁场方向。</p>
          <p className="mt-3">铁屑在磁场中被磁化，像一个个小磁针，排出了磁场的分布。照着它画出的带箭头的曲线叫<b className="text-white">磁感线</b>：磁体外部的磁感线都从 N 极出来，回到 S 极。磁感线是为了描述磁场而假想的线，并不真实存在，任何两条都不相交。</p>
          <p className="mt-3 text-[13.5px] text-white/65">地球周围存在磁场，叫地磁场。地磁的北极在地理南极附近，地磁的南极在地理北极附近，两者并不重合，这就是磁偏角。我国宋代的沈括最早记述了这一现象。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">条形、蹄形、地球都看过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">磁体外部的磁感线从 N 极出来，回到 S 极</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">小磁针 N 极所指就是磁场方向；地球也是一个大磁体，地磁 S 极在地理北极附近。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">{kind === 'earth' ? '地磁场' : '八枚小磁针 · N 极所指'}</h2>
          {kind === 'earth' ? <div className="mt-2 text-[14px] leading-relaxed text-white/80">
            <p>地面上的小磁针 N 极指北，是因为地理北极附近是地磁的 <b className="text-white">S 极</b>。</p>
            <p className="mt-2 text-white/60">磁感线从地理南极附近出来，回到地理北极附近。</p>
          </div> : <div className="mt-2 grid grid-cols-4 gap-2">
            {arr.map((d, i) => <div key={i} className="flex flex-col items-center rounded-lg bg-white/[0.06] py-2">
              <svg viewBox="-12 -12 24 24" className="size-7" style={{ opacity: needles ? 1 : 0.25 }}><g transform={`rotate(${needles ? d : 0})`} style={{ transition: 'transform 0.8s' }}><path d="M0 -10 L3 0 L-3 0 Z" fill="#e5483d" /><path d="M0 10 L3 0 L-3 0 Z" fill="#e9e7e0" /></g></svg>
              <span className="mt-1 text-[13px] tabular-nums text-white/75">{needles ? `${d}°` : '—'}</span>
            </div>)}
          </div>}
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">{kind === 'earth' ? '' : '方位角：正北 0°，顺时针量；磁体的 N 极朝东（90°）。'}</p>
          <div className="mt-4 rounded-xl bg-white/[0.06] px-3 py-3 text-center">
            <div className="text-[12.5px] text-white/55">磁体外部的磁感线</div>
            <div className="mt-1 text-[24px] font-bold tracking-wide"><span className="text-[#ff7a6e]">N</span> <span className="text-[#62f0ff]">→</span> <span className="text-[#7fa6ff]">S</span></div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'sprinkle'} onClick={sprinkle} disabled={seq.busy || kind === 'earth' || tapped}>撒铁屑，轻敲玻璃板</LabButton>
        <LabButton pulse={next === 'needles'} onClick={() => setNeedles(true)} disabled={seq.busy || kind === 'earth' || needles}>放小磁针</LabButton>
        <LabButton primary={next === 'lines'} pulse={next === 'lines'} onClick={() => setLines(true)} disabled={seq.busy || lines}>画磁感线</LabButton>
      </>}
      extras={<Control label="磁体"><Segmented label="磁体" pulse={next === 'kind'} want={next === 'kind' ? want : null} value={kind} onChange={k => switchTo(k as Kind)} options={(['bar', 'horse', 'earth'] as Kind[]).map(k => ({ value: k, label: NAME[k] }))} /></Control>}
    />
  )
}
