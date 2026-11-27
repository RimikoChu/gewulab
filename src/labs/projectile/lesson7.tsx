// 抛体运动 · 第 7 课 打中山坡上的火点（初速度、仰角和目标的高度一起决定落点）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene7, { type Shot7 } from './scene7'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { fmt, G, heightAt, HILL, judge, landOn } from './physics'

const TASKS: Task[] = [
  { id: '14-45', text: '水压 14 m/s、仰角 45°，喷一次', note: '14 m/s 时 45° 已经最远，水只落到坡脚：水平 16.2 m、高 3.1 m' },
  { id: '14-30', text: '水压不变，仰角换成 30° 再喷', note: '更近了：水压不够，怎么调仰角都够不着' },
  { id: '21-30', text: '加压到 21 m/s，仰角还是 30°', note: '够远了，可是打低了：到火点那儿水柱只有 4 m 高' },
  { id: '21-45', text: '21 m/s，仰角换回 45°', note: '到水平 30 m 处，水柱正好 10 m 高：打中了' },
]
type AK = '30' | '45' | '60'
const F = HILL.fire

export default function Lesson7() {
  const [ak, setAk] = useState<AK>('45')
  const [si, setSi] = useState(0)
  const [on, setOn] = useState(false)
  const [landed, setLanded] = useState(false)
  const [shots, setShots] = useState<Shot7[]>([])
  const [out, setOut] = useState(false)
  const T = useTasks('gewu:projectile:7', TASKS)
  const angle = +ak, v0 = HILL.speeds[si]
  const barrel = useSlide(angle, 40), turning = barrel !== angle
  const hit = landOn(v0, angle), verdict = judge(v0, angle)
  useEffect(() => { setOn(false); setLanded(false) }, [ak, si])
  useEffect(() => { if (!on) { setLanded(false); return } const t = setTimeout(() => setLanded(true), (hit.t + 0.5) * 1000); return () => clearTimeout(t) }, [on])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!landed) return
    setShots(s => s.some(q => q.v0 === v0 && q.angle === angle) ? s : [...s, { v0, angle }])
    if (verdict === 'hit') setOut(true)
    T.check(id => id === `${v0}-${angle}`)
  }, [landed])   // eslint-disable-line react-hooks/exhaustive-deps
  const press = () => setSi(i => (i + 1) % HILL.speeds.length)
  const resetAll = () => { setAk('45'); setSi(0); setOn(false); setShots([]); setOut(false); T.reset() }
  const nextV = HILL.speeds[(si + 1) % HILL.speeds.length], label = nextV > v0 ? `加压到 ${nextV} m/s` : `降回 ${nextV} m/s`
  const task = T.current
  const [wv, wa] = task ? task.id.split('-').map(Number) : [v0, angle]
  const { hint, next }: { hint: string; next: 'ang' | 'press' | 'on' | null } = !task ? { hint: '落点由出口速度和仰角一起决定；目标在高处，还要把高度算进去。', next: null }
    : v0 !== wv ? { hint: `把出口速度调到 ${wv} m/s：按“${label}”`, next: 'press' }
    : angle !== wa ? { hint: `把仰角换成 ${wa}°`, next: 'ang' }
    : turning ? { hint: '炮管正在转…', next: null }
    : !on ? { hint: '按“喷水”：看水柱落在山坡的哪儿', next: 'on' }
    : { hint: '水柱飞向山坡…', next: null }
  const at30 = heightAt(v0, angle, F.x)
  const say = { hit: '打中火点', short: '够不着', low: '打低了', over: '从火点上方越过去了' }[verdict]

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="水炮"
      stage={<Scene7 v0={v0} angle={angle} barrel={barrel} on={on && !turning} landed={landed} shots={shots} out={out} />}
      lesson={<LessonBlock no="7" title="打中山坡上的火点" concept="速度、仰角、高度一起决定落点" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>以炮口为原点，斜抛的水柱在水平 x 处的高度是</p>
          <p className="mt-2 font-formula italic">y = x tan θ − g x² ÷ (2 v₀² cos² θ)</p>
          <p className="mt-3">火点在水平 30 m、高 10 m 处。把 x = 30 m 代进去，y 等于 10 m 才打得中：v₀ = 21 m/s、θ = 45° 时，y = 30 − {G} × 900 ÷ 441 = 10 m。</p>
          <p className="mt-3">出口速度太小，怎么调仰角都够不着（14 m/s 时在平地上最远也只有 20 m）；速度够了，仰角不对，水柱到火点那儿不是低了就是高了。目标越高，需要的速度越大。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">火灭了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">出口速度和仰角一起决定落点：21 m/s、45° 时水柱正好经过水平 30 m、高 10 m 的火点</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">到火点那儿（水平 {F.x} m 处）水柱的高度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{landed ? (at30 > -HILL.muzzle && hit.x >= F.x - 0.05 ? fmt(at30, 1) : '落地了') : '—'}{landed && hit.x >= F.x - 0.05 && <span className="ml-1 text-[15px] font-medium text-white/55">m</span>}</div>
            <div className="mt-1 text-[13px] text-white/60">火点高 {F.y} m{landed ? ` · ${say}` : ''}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol={<span style={{ color: '#ffd25a' }}>v₀</span>} value={String(v0)} unit="m/s · 出口速度" />
            <ParamTile symbol="θ" value={`${angle}°`} unit="仰角" />
            <ParamTile symbol="落点 x" value={landed ? fmt(hit.x, 1) : '—'} unit="m · 离炮口水平" />
            <ParamTile symbol="落点 y" value={landed ? fmt(hit.y, 1) : '—'} unit="m · 比炮口高" />
          </div>
          {shots.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">v₀</th><th className="font-normal">θ</th><th className="text-right font-normal">落点（水平，高）</th></tr></thead>
            <tbody>{shots.map(s => { const l = landOn(s.v0, s.angle), ok = judge(s.v0, s.angle) === 'hit'; return <tr key={`${s.v0}-${s.angle}`} className={`border-t border-white/12 ${ok ? 'font-semibold text-[#7fe3d4]' : ''}`}><td className="py-1.5 tabular-nums">{s.v0} m/s</td><td className="tabular-nums">{s.angle}°</td><td className="text-right tabular-nums">{fmt(l.x, 1)} m，{fmt(l.y, 1)} m</td></tr> })}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={() => setOn(o => !o)} disabled={turning}>{on ? '停水' : '喷水'}</LabButton>
        <LabButton primary={next === 'press'} pulse={next === 'press'} onClick={press}>{label}</LabButton>
      </>}
      extras={
        <Control label="仰角">
          <Segmented label="仰角" pulse={next === 'ang'} want={next === 'ang' ? String(wa) as AK : null} value={ak} onChange={setAk} options={[{ value: '30', label: '30°' }, { value: '45', label: '45°' }, { value: '60', label: '60°' }]} />
        </Control>
      }
    />
  )
}
