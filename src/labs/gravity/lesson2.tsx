// 万有引力与航天 · 第 2 课 周期定律（开普勒第三定律 a³/T² = k）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene2 from './scene2'
import { LESSONS, goLesson } from './lessons'
import { PLANETS, chartPoint, keplerK, sci, type PlanetKey } from './physics'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'earth', text: '选地球，记下 a 和 T', note: '地球：a = 1 AU，T = 1 年' },
  { id: 'mars', text: '换成火星，再记一次', note: '火星远一些，一圈要 1.88 年；a³/T² 和地球一样' },
  { id: 'jupiter', text: '换成木星，再记一次', note: '木星的 a 是地球的 5.2 倍，周期是 11.9 年；a³/T² 还是一样' },
]
const KEYS = Object.keys(PLANETS) as PlanetKey[]

/** T²–a³ 图：横轴 a³（AU³），纵轴 T²（年²），都从 0 到 150；记下的行星画成点，过原点一条直线 */
function Chart({ rows, focus }: { rows: PlanetKey[]; focus: PlanetKey }) {
  const W = 290, H = 190, L = 34, B = 26, max = 150
  const x = (v: number) => L + v / max * (W - L - 10), y = (v: number) => H - B - v / max * (H - B - 10)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
      {[0, 50, 100, 150].map(v => <g key={v}><line x1={x(0)} x2={x(max)} y1={y(v)} y2={y(v)} stroke="rgb(255 255 255 / 0.1)" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="rgb(255 255 255 / 0.5)">{v}</text><text x={x(v)} y={H - 8} textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.5)">{v}</text></g>)}
      <line x1={x(0)} y1={y(0)} x2={x(max)} y2={y(max)} stroke="#35c7b3" strokeWidth="1.5" strokeDasharray={rows.length >= 2 ? undefined : '4 4'} opacity={rows.length >= 2 ? 0.9 : 0.35} />
      <text x={W - 8} y={H - B - 4} textAnchor="end" fontSize="11" fontStyle="italic" fill="rgb(255 255 255 / 0.6)">a³ / AU³</text>
      <text x={L + 4} y={12} fontSize="11" fontStyle="italic" fill="rgb(255 255 255 / 0.6)">T² / 年²</text>
      {rows.map(k => { const P = PLANETS[k], { a3, t2 } = chartPoint(k); return <g key={k}><circle cx={x(a3)} cy={y(t2)} r={k === focus ? 5.5 : 4.5} fill={k === focus ? '#ffe9a8' : '#ffffff'} /><text x={x(a3) + (a3 > 100 ? -8 : 8)} y={y(t2) + (a3 > 100 ? 14 : -6)} textAnchor={a3 > 100 ? 'end' : 'start'} fontSize="12" fill="rgb(255 255 255 / 0.85)">{P.name}</text></g> })}
    </svg>
  )
}

export default function Lesson2() {
  const [focus, setFocus] = useState<PlanetKey>('venus')
  const [rows, setRows] = useState<PlanetKey[]>([])
  const T = useTasks('gewu:gravity:2', TASKS)
  const dup = rows.includes(focus)
  const record = () => { if (dup) return; const n = [...rows, focus]; setRows(n); T.check(id => n.includes(id as PlanetKey)) }
  const resetAll = () => { setFocus('venus'); setRows([]); T.reset() }
  const task = T.current, P = PLANETS[focus]
  const { hint, next }: { hint: string; next: 'pick' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。再看看水星、金星：点也在这条直线上吗？', next: null }
    if (focus !== task.id) return { hint: `选${PLANETS[task.id as PlanetKey].name}`, next: 'pick' }
    return dup ? { hint: '这颗记过了', next: null } : { hint: '看它绕一圈要多久，记下 a 和 T', next: 'record' }
  })()
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="数据"
      stage={<Scene2 focus={focus} />}
      lesson={<LessonBlock no="2" title="周期定律" concept="离太阳越远，绕一圈越久，a³/T² 都一样" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">开普勒第三定律：</b>所有行星轨道的半长轴 a 的三次方跟它的公转周期 T 的二次方的比都相等：</p>
          <p className="my-2 text-center font-formula text-[19px] italic">a³ / T² = k</p>
          <p>k 只和中心天体（太阳）有关，和行星无关。绕地球转的卫星也有自己的 k，但和绕太阳的不一样。</p>
          <p className="mt-3 text-[13.5px] text-white/65">画面里轨道半径之比是真实的，行星和太阳是示意大小；行星转动的快慢之比也是真实的。选木星时镜头会拉远。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三颗行星都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">a³/T² 对每颗行星都一样，约 3.36 × 10¹⁸ m³/s²</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">图上三个点落在同一条过原点的直线上。离太阳越远，周期越长，而且比距离长得更快。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{P.name}的 a³/T²</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight tabular-nums">{sci(keplerK(focus))}<span className="ml-1 text-[14px] font-medium text-white/55">m³/s²</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="a" value={String(P.a)} unit="AU · 半长轴" />
            <ParamTile symbol="T" value={String(P.T)} unit="年 · 公转周期" />
          </div>
          <div className="mt-5 text-[12.5px] text-white/55">T² – a³ 图</div>
          <Chart rows={rows} focus={focus} />
          {rows.length > 0 && <table className="mt-2 w-full text-[13.5px] tabular-nums">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">行星</th><th className="font-normal">a/AU</th><th className="font-normal">T/年</th><th className="text-right font-normal">a³/T²</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{PLANETS[k].name}</td><td>{PLANETS[k].a}</td><td>{PLANETS[k].T}</td><td className="text-right font-semibold text-[#7fe3d4]">{sci(keplerK(k))}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="行星">
          <Segmented label="行星" pulse={next === 'pick'} want={(task?.id as PlanetKey) ?? null} value={focus} onChange={k => setFocus(k as PlanetKey)} options={KEYS.map(k => ({ value: k, label: PLANETS[k].name }))} />
        </Control>
      }
    />
  )
}
