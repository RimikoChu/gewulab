// 水循环 · 第 6 课 城市为什么会内涝（地面硬化使下渗减少、地表径流增加；海绵城市）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { CITIES, floodAt, floodPeak, type CityKey } from './physics'
import { ground, riverZ } from './world'

const KEYS = Object.keys(CITIES) as CityKey[]
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `${CITIES[k].name}：下一场暴雨，记下洪峰`, note: `洪峰 ${floodPeak(k).q}，雨后 ${floodPeak(k).t} 小时就到：${CITIES[k].say}` }))
const CW = 264, CH = 92, HOURS = 14, px = (t: number) => t / HOURS * CW, py = (q: number) => CH - q / 100 * CH
const curve = (c: CityKey) => Array.from({ length: 57 }, (_, i) => `${i ? 'L' : 'M'}${px(i / 4).toFixed(1)},${py(floodAt(c, i / 4)).toFixed(1)}`).join(' ')
const TINT: Record<CityKey, string> = { before: '#9fd68a', hard: '#ff8c7a', sponge: '#7fe3d4' }

export default function Lesson6() {
  const [city, setCity] = useState<CityKey>('before')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<CityKey[]>([])
  const T = useTasks('gewu:watercycle:6', TASKS)
  const t = useSlide(goal, 3.5), moving = Math.abs(t - goal) > 0.01, done = goal === HOURS && !moving
  const q = floodAt(city, t), dup = rows.includes(city)
  const pick = (c: CityKey) => { if (moving) return; setCity(c); setGoal(0) }
  const record = () => { if (!done || dup) return; const next = [...rows, city]; setRows(next); T.check(id => next.includes(id as CityKey)) }
  const resetAll = () => { setCity('before'); setGoal(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'city' | 'run' | 'record' | null } = !task ? { hint: '三种城市都记完了。地面越硬，洪峰越高、来得越快。', next: null }
    : moving ? { hint: goal ? (t < 3 ? '暴雨下着…' : '雨停了：看河里的水什么时候涨到最高') : '等水退下去…', next: null }
    : city !== task.id ? { hint: `把城市换成“${CITIES[task.id as CityKey].name}”`, next: 'city' }
    : done && !dup ? { hint: `洪峰 ${floodPeak(city).q}：按“记录”`, next: 'record' } : { hint: '按“下一场暴雨”', next: 'run' }
  const labels: Label[] = [{ id: 'q', at: [-19.5, ground(-19.5, riverZ(-19.5)) + 1.6, riverZ(-19.5)], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>雨后 {t.toFixed(0)} 小时 · 河里的流量</small>{q.toFixed(0)}</> }]

  return (
    <LabShell title="水循环" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="暴雨"
      stage={<Basin at="city" labels={labels} want={{ city, rain: goal > 0 && t < 3 ? ['city'] : [], flow: 1 + q / 35, flood: city === 'hard' ? Math.max(0, (q - 45) / 45) : 0 }} />}
      lesson={<LessonBlock no="6" title="城市为什么会内涝" concept="地面硬了，雨水渗不下去，一下子全涌进河里" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>城市把田地和树林换成了屋顶、水泥和沥青。雨水<b className="text-white">下渗</b>少了，<b className="text-white">地表径流</b>多了，而且汇到河里的速度快了，所以洪峰又高又早，排不及就成了内涝。</p>
          <p className="mt-3"><b className="text-white">海绵城市</b>的办法是把水留住：多留绿地，路面用透水的材料，修下沉的雨水花园和蓄水池，让雨水慢慢渗下去、存起来。</p>
          <p className="mt-3 text-[13.5px] text-white/65">洪水过程是按简化的规律算的相对值：洪峰和径流系数成正比，地面越硬来得越早。只用来比较大小。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三场暴雨比完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">硬化后的洪峰是开发前的 {floodPeak('hard').q / floodPeak('before').q} 倍，还早到了 {floodPeak('before').t - floodPeak('hard').t} 小时</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">海绵改造把洪峰压回到 {floodPeak('sponge').q}：留住雨水，就是把下渗这个环节补回来。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{CITIES[city].name} · 雨后 {t.toFixed(1)} 小时</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{q.toFixed(0)}</div>
            <div className="mt-1 text-[12.5px] text-white/50">河里的流量，相对值</div>
          </div>
          <svg viewBox={`-2 -4 ${CW + 4} ${CH + 20}`} className="mt-3 w-full" role="img" aria-label="暴雨后河里流量的变化">
            <rect x={0} y={0} width={px(3)} height={CH} fill="#bfe3ff" opacity={0.1} />
            {rows.filter(c => c !== city).map(c => <path key={c} d={curve(c)} fill="none" stroke={TINT[c]} strokeOpacity={0.55} strokeWidth={1.5} />)}
            <path d={curve(city)} fill="none" stroke={TINT[city]} strokeWidth={2.2} />
            <circle cx={px(t)} cy={py(q)} r={4.5} fill="#ffffff" />
            {[0, 2, 4, 6, 8, 10, 12].map(h => <text key={h} x={px(h)} y={CH + 13} textAnchor="middle" fontSize={10} fill="#ffffff" fillOpacity={0.5}>{h} 时</text>)}
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="径流系数" value={String(CITIES[city].k)} unit="雨水流走的比例" />
            <ParamTile symbol="洪峰" value={done || dup ? String(floodPeak(city).q) : '—'} unit={done || dup ? `雨后 ${floodPeak(city).t} 小时` : '下完雨才知道'} />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">城市</th><th className="text-right font-normal">洪峰</th><th className="text-right font-normal">出现在</th></tr></thead>
            <tbody>{rows.map(c => <tr key={c} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{CITIES[c].name}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{floodPeak(c).q}</td><td className="text-right tabular-nums">雨后 {floodPeak(c).t} 小时</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'run'} onClick={() => setGoal(HOURS)} disabled={moving || goal > 0}>下一场暴雨</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!done || dup}>记录</LabButton>
      </>}
      extras={<Control label="城市"><Segmented label="城市" pulse={next === 'city'} want={next === 'city' ? task!.id as CityKey : null} value={city} disabled={moving} onChange={pick} options={KEYS.map(k => ({ value: k, label: CITIES[k].name }))} /></Control>}
    />
  )
}
