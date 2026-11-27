// 一次函数 · 第 7 课 选哪种运费（两种方案比较；交点的意义；一次函数和方程、不等式）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene7, { COL } from './scene7'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DISTS, PLAN, cheaper, formula, meet, planA, planB } from './physics'

const TASKS: Task[] = [
  { id: 'line', text: '画出两种方案的图像', note: '甲 y = 5x + 200，乙 y = 7x' },
  { id: '60', text: '运 60 km，比一比哪家便宜', note: '甲 500 元，乙 420 元：乙便宜' },
  { id: '200', text: '运 200 km，再比一比', note: '甲 1200 元，乙 1400 元：甲便宜' },
  { id: '100', text: '找到两家一样贵的运距', note: '100 km 时都是 700 元：两条线在这里相交' },
]
const WHO = { a: '甲', b: '乙', same: '一样' } as const

export default function Lesson7() {
  const [run, setRun] = useState(0)
  const [d, setD] = useState<number | null>(null)
  const T = useTasks('gewu:linear:7', TASKS)
  const line = useRamp(run, 1.8), drawing = run > 0 && line < 1
  const x = useSlide(d ?? 0, 70), moving = Math.abs(x - (d ?? 0)) > 0.01
  useEffect(() => { if (run && line >= 1) T.check(id => id === 'line') }, [line])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!moving && d !== null && line >= 1) T.check(id => id === String(d)) }, [moving, d])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (v: number) => { if (moving || !run) return; setD(v) }
  const resetAll = () => { setRun(0); setD(null); T.reset() }
  const cur = T.current?.id
  const want = cur && cur !== 'line' ? cur : null
  const [mx, my] = meet(PLAN.a.k, PLAN.a.b, PLAN.b.k, PLAN.b.b)!
  const { hint, next }: { hint: string; next: 'line' | 'd' | null } = !T.current ? { hint: '交点左边乙便宜，右边甲便宜，交点处一样贵。', next: null }
    : drawing ? { hint: '两条直线从 0 km 画起…', next: null }
    : moving ? { hint: '货车开到那块里程碑…', next: null }
    : !run ? { hint: '按“画出两条直线”：甲每千米 5 元另收 200 元，乙每千米 7 元', next: 'line' }
    : cur === '100' ? { hint: '两条线在哪儿相交？把运距换成 100 km', next: 'd' }
    : { hint: `把运距换成 ${want} km，看哪条线在下面`, next: 'd' }
  const at = d !== null && !moving ? d : null
  return (
    <LabShell title="一次函数" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="画图"
      stage={<Scene7 x={x} line={line} at={line >= 1 ? at : null} />}
      lesson={<LessonBlock no="7" title="选哪种运费" concept="交点左右，便宜的方案换了" tasks={TASKS} done={T.done} current={cur}
        theory={<>
          <p>两家报价都是运距 x 的一次函数：甲 y = 5x + 200，乙 y = 7x。同一个 x，哪条线在下面，哪家便宜。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">交点：</b>解方程 5x + 200 = 7x，得 x = 100，这时都是 700 元</li>
            <li><b className="text-[#7fe3d4]">x &lt; 100：</b>7x &lt; 5x + 200，乙便宜</li>
            <li><b className="text-[#7fe3d4]">x &gt; 100：</b>7x &gt; 5x + 200，甲便宜</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">两条直线交点的横坐标，就是两个函数值相等时的那个 x，也就是方程的解。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个运距都比过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">不到 100 km 选乙，超过 100 km 选甲，100 km 一样贵</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">交点 (100, 700) 的横坐标是方程 5x + 200 = 7x 的解。看图选方案：同一个 x，哪条线在下面哪家便宜。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12.5px]" style={{ color: COL.a }}>甲</div><div className="font-formula text-[17px] italic">{formula(PLAN.a.k, PLAN.a.b)}</div><div className="mt-1 text-[24px] font-bold tabular-nums">{at !== null ? planA(at) : '—'}<span className="ml-1 text-[13px] font-medium text-white/55">元</span></div></div>
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12.5px]" style={{ color: COL.b }}>乙</div><div className="font-formula text-[17px] italic">{formula(PLAN.b.k, PLAN.b.b)}</div><div className="mt-1 text-[24px] font-bold tabular-nums">{at !== null ? planB(at) : '—'}<span className="ml-1 text-[13px] font-medium text-white/55">元</span></div></div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="x" value={at !== null ? String(at) : '—'} unit="km · 运距" />
            <ParamTile symbol="便宜" value={at !== null ? WHO[cheaper(at)] : '—'} unit="哪家便宜" />
          </div>
          {DISTS.some(v => T.done[String(v)]) && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">运距 / km</th><th className="text-right font-normal">甲 / 元</th><th className="text-right font-normal">乙 / 元</th><th className="text-right font-normal">便宜</th></tr></thead>
            <tbody>{DISTS.filter(v => T.done[String(v)]).map(v => <tr key={v} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{v}</td><td className="text-right tabular-nums">{planA(v)}</td><td className="text-right tabular-nums">{planB(v)}</td><td className="text-right font-semibold text-[#7fe3d4]">{WHO[cheaper(v)]}</td></tr>)}</tbody>
          </table>}
          {T.done['100'] && <p className="row-in mt-3 rounded-xl bg-white/8 px-3 py-2.5 font-formula text-[15px] italic">5x + 200 = 7x → x = {mx}，y = {my}</p>}
          <p className="mt-3 text-[12.5px] text-white/50">图中路程按比例缩短。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'line'} onClick={() => setRun(1)} disabled={run > 0}>画出两条直线</LabButton>
      </>}
      extras={<Control label="运距"><Segmented label="运距" pulse={next === 'd'} want={next === 'd' ? want : null} value={d === null ? '' : String(d)} disabled={!run || drawing || moving} onChange={v => pick(+v)} options={DISTS.map(v => ({ value: String(v), label: `${v} km` }))} /></Control>}
    />
  )
}
