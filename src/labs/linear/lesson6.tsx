// 一次函数 · 第 6 课 两组读数定直线（待定系数法；用解析式预测）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene6 from './scene6'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { POSTS6, STATION, formula, lin, solve2, truckFuel } from './physics'

const TASKS: Task[] = [
  { id: 'p1', text: '开到 100 km 的里程碑，记下油量', note: '(100, 270)' },
  { id: 'p2', text: '开到 300 km 的里程碑，再记一次', note: '(300, 210)' },
  { id: 'solve', text: '用这两组数求出解析式', note: 'k = −0.3，b = 300：y = −0.3x + 300' },
  { id: 'pred', text: '算出开到 800 km 的加油站还剩多少油', note: '剩 60 L，开得到' },
]
const n = (v: number) => String(v).replace('-', '−')

export default function Lesson6() {
  const [leg, setLeg] = useState(0)
  const [pts, setPts] = useState<number[]>([])
  const [run, setRun] = useState(0)
  const [pred, setPred] = useState(false)
  const T = useTasks('gewu:linear:6', TASKS)
  const goal = leg === 0 ? 0 : POSTS6[leg - 1]
  const x = useSlide(goal, 90), moving = Math.abs(x - goal) > 0.01
  const line = useRamp(run, 1.6), drawing = run > 0 && line < 1
  const kb = pts.length === 2 ? solve2([pts[0], truckFuel(pts[0])], [pts[1], truckFuel(pts[1])]) : null
  useEffect(() => { if (moving || !leg || pts.includes(goal)) return; const p = [...pts, goal]; setPts(p); T.check(id => (id === 'p1' && p.length >= 1) || (id === 'p2' && p.length >= 2)) }, [moving, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (run && line >= 1) T.check(id => id === 'solve') }, [line])   // eslint-disable-line react-hooks/exhaustive-deps
  const drive = () => { if (moving || leg >= 2) return; setLeg(leg + 1) }
  const solve = () => { if (!kb || run) return; setRun(1) }
  const predict = () => { if (!kb || drawing || !run) return; setPred(true); T.check(id => id === 'pred') }
  const resetAll = () => { setLeg(0); setPts([]); setRun(0); setPred(false); T.reset() }
  const solved = run > 0 && !drawing
  const { hint, next }: { hint: string; next: 'drive' | 'solve' | 'pred' | null } = !T.current ? { hint: '两个点定一条直线：两组读数就能求出 k 和 b。', next: null }
    : moving ? { hint: '货车在开，油量在往下走…', next: null }
    : leg < 2 ? { hint: leg === 0 ? '按“开到下一块里程碑”：先开到 100 km' : '记下了 (100, 270)。再开到 300 km 的里程碑', next: 'drive' }
    : !run ? { hint: '有了两组读数。按“求解析式”', next: 'solve' }
    : drawing ? { hint: '把两组数代进 y = kx + b，解出 k 和 b…', next: null }
    : { hint: '按“算 800 千米”：用解析式预测到加油站还剩多少', next: 'pred' }
  return (
    <LabShell title="一次函数" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="货车、计算"
      stage={<Scene6 x={x} pts={pts} line={line} kb={run ? kb : null} pred={pred} />}
      lesson={<LessonBlock no="6" title="两组读数定直线" concept="两个点定一条直线" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>一次函数 y = kx + b 里有两个待定的系数 k 和 b。知道两组对应的 x、y，代进去得到一个二元一次方程组，解出 k 和 b，就得到解析式。这种办法叫<b className="text-[#7fe3d4]">待定系数法</b>。</p>
          <p className="mt-3 font-formula text-[15px] italic text-white/85">270 = 100k + b<br />210 = 300k + b</p>
          <p className="mt-3">两式相减：−60 = 200k，k = −0.3；代回去 b = 300。</p>
          <p className="mt-3 text-[13.5px] text-white/65">b = 300 就是出发时满箱的 300 L；k = −0.3 表示每开 1 km 少 0.3 L。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">解析式求出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">y = −0.3x + 300，开到 800 km 还剩 60 L</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">两组读数定出 k 和 b，就能算出路上任何一处的油量：表格里没有的，解析式也能算。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">y = kx + b</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{truckFuel(x).toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">L 剩油</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="k" value={solved && kb ? n(kb.k) : '?'} unit="每千米油量的变化" />
            <ParamTile symbol="b" value={solved && kb ? n(kb.b) : '?'} unit="L · x = 0 时的油量" />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">里程 x / km</th><th className="text-right font-normal">油量 y / L</th></tr></thead>
            <tbody>{pts.map(p => <tr key={p} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{p}</td><td className="text-right font-semibold text-[#ffd25a] tabular-nums">{truckFuel(p)}</td></tr>)}
              {pred && kb && <tr className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums text-white/70">{STATION}（算出来的）</td><td className="text-right font-semibold text-[#ff8a5c] tabular-nums">{lin(kb.k, kb.b, STATION)}</td></tr>}</tbody>
          </table>
          {solved && kb && <p className="row-in mt-3 rounded-xl bg-white/8 px-3 py-2.5 font-formula text-[15px] leading-relaxed italic">k = (210 − 270) ÷ (300 − 100) = −0.3<br />b = 270 − (−0.3) × 100 = 300<br /><span className="font-semibold not-italic text-[#5fd8ff]">{formula(kb.k, kb.b)}</span></p>}
          <p className="mt-3 text-[12.5px] text-white/50">图中路程按比例缩短。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'drive'} onClick={drive} disabled={moving || leg >= 2}>开到下一块里程碑</LabButton>
        <LabButton pulse={next === 'solve'} onClick={solve} disabled={!kb || run > 0}>求解析式</LabButton>
        <LabButton primary pulse={next === 'pred'} onClick={predict} disabled={!solved || pred}>算 800 千米</LabButton>
      </>}
      extras={null}
    />
  )
}
