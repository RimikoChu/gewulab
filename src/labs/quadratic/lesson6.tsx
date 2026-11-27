// 二次函数 · 第 6 课 桥下的水面（建立坐标系、求解析式、由函数值求自变量）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene6 from './scene6'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { archA, ARCH, canPass, clearance, depthOf, fmt, waterWidth, type WaterKey } from './physics'

const TASKS: Task[] = [
  { id: 'fit', text: '以拱顶为原点，求桥拱的解析式', note: '设 y = ax²，代入 (6, −4)：a = −1/9' },
  { id: 'low', text: '水位下降 1 m，水面有多宽', note: '令 y = −5：x = ±√45，水面宽约 13.42 m' },
  { id: 'flood', text: '水位上涨 1 m，水面有多宽', note: '令 y = −3：x = ±√27，水面宽约 10.39 m' },
  { id: 'boat', text: '汛期让游船试着过桥', note: '船边上方只剩 2 m，2.5 m 高的船过不去' },
  { id: 'boat2', text: '常水位再让游船过一次', note: '船边上方有 3 m，比 2.5 m 高，能过' },
]
const WKEYS: WaterKey[] = ['normal', 'low', 'flood']
const WNAME: Record<WaterKey, string> = { normal: '常水位', low: '下降 1 m', flood: '上涨 1 m' }
const a = archA(ARCH.width, ARCH.rise)
const PARK: [number, number] = [0, -22], GATE: [number, number] = [0, -9.6], AWAY: [number, number] = [0, 34]   // 船从桥后（上游）开过来，过了桥朝镜头这边开走

export default function Lesson6() {
  const [fit, setFit] = useState(false)
  const [w, setW] = useState<WaterKey>('normal')
  const [go, setGo] = useState(false)
  const [seen, setSeen] = useState<WaterKey[]>([])
  const T = useTasks('gewu:quadratic:6', TASKS)
  const target = depthOf(w), depth = useSlide(target, 0.5), settled = depth === target
  // 船：先横着挪到桥洞正中，再往前开；过不去就停在桥前
  const pass = canPass(w)
  const s = useSlide(go ? (pass ? 2 : 1) : 0, go ? 0.2 : 1000)
  const boat: [number, number] = s <= 1 ? [PARK[0] + (GATE[0] - PARK[0]) * s, PARK[1] + (GATE[1] - PARK[1]) * s] : [0, GATE[1] + (AWAY[1] - GATE[1]) * (s - 1)]
  const arrived = go && s === (pass ? 2 : 1)
  useEffect(() => { if (!settled || !fit) return; const next = seen.includes(w) ? seen : [...seen, w]; if (next !== seen) setSeen(next); T.check(id => (id === 'low' && w === 'low') || (id === 'flood' && w === 'flood')) }, [settled, w, fit])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (arrived) T.check(id => (id === 'boat' && w === 'flood') || (id === 'boat2' && w === 'normal' && !!T.done.boat)) }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  const pickW = (k: WaterKey) => { setW(k); setGo(false) }
  const solve = () => { setFit(true); T.check(id => id === 'fit') }
  const resetAll = () => { setFit(false); setW('normal'); setGo(false); setSeen([]); T.reset() }
  const task = T.current
  const wantW: WaterKey | null = task?.id === 'low' ? 'low' : task?.id === 'flood' || task?.id === 'boat' ? 'flood' : task?.id === 'boat2' ? 'normal' : null
  const { hint, next }: { hint: string; next: 'fit' | 'w' | 'go' | null } = !task ? { hint: '算完了。先建坐标系求解析式，再把水面的高度代进去求宽度。', next: null }
    : task.id === 'fit' ? { hint: '按“求解析式”：拱顶是原点，水面两端是 (−6, −4) 和 (6, −4)', next: 'fit' }
    : wantW && w !== wantW ? { hint: `把水位换成“${WNAME[wantW]}”`, next: 'w' }
    : !settled ? { hint: '江水在涨落…', next: null }
    : task.id === 'boat' || task.id === 'boat2' ? (go ? { hint: '游船开过来了…', next: null } : { hint: `按“让游船过桥”：${task.id === 'boat' ? '汛期' : '常水位'}试一试`, next: 'go' })
    : { hint: '江水在涨落…', next: null }

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="拱桥"
      stage={<Scene6 depth={depth} fit={fit} boat={boat} blocked={!pass && arrived} showBoat={go && boat[1] < 24} />}
      lesson={<LessonBlock no="6" title="桥下的水面" concept="先建坐标系求解析式，再代入求宽度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>拱桥的桥拱是抛物线。以拱顶为原点、水平方向为 x 轴建立坐标系，桥拱就是 <span className="font-formula italic">y = ax²</span>。常水位时拱顶离水面 4 m、水面宽 12 m，点 (6, −4) 在抛物线上：−4 = 36a，<span className="font-formula italic">a = −1/9</span>。</p>
          <p className="mt-3">水位下降 1 m，水面在 y = −5：解 <span className="font-formula italic">−x²/9 = −5</span>，x = ±√45 ≈ ±6.71，水面宽约 13.42 m，比原来宽了约 1.42 m。</p>
          <p className="mt-3">游船宽 6 m、露出水面 2.5 m。船靠中间走，船边在 x = ±3 处，那里的拱高 y = −1：常水位时离水面还有 3 m，能过；水位上涨 1 m 只剩 2 m，过不去。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">桥下的水面都算过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">y = −x²/9：水位降 1 m 水面宽约 13.42 m，涨 1 m 约 10.39 m</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">y = ax²</div>
            <div className="mt-1 font-formula text-[34px] leading-none font-bold italic">{fit ? 'y = −x²/9' : 'a = ?'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="水面" value={`y = ${fmt(-target)}`} unit={`m · ${WNAME[w]}`} />
            <ParamTile symbol="水面宽" value={fit ? fmt(waterWidth(a, target)) : '—'} unit="m" />
            <ParamTile symbol="船边上方" value={fit ? fmt(clearance(w)) : '—'} unit="m · 船高 2.5 m" />
            <ParamTile symbol="a" value={fit ? '−1/9' : '?'} unit="过 (6, −4)" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">水位</th><th className="text-right font-normal">水面</th><th className="text-right font-normal">水面宽</th></tr></thead>
            <tbody>{WKEYS.filter(q => seen.includes(q)).map(q => <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5">{WNAME[q]}</td><td className="text-right tabular-nums">y = {fmt(-depthOf(q))}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{fmt(waterWidth(a, depthOf(q)))} m</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'fit'} pulse={next === 'fit'} onClick={solve} disabled={fit}>求解析式</LabButton>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={() => setGo(true)} disabled={go || !fit || !settled}>让游船过桥</LabButton>
      </>}
      extras={<Control label="水位"><Segmented label="水位" pulse={next === 'w'} want={next === 'w' ? wantW : null} value={w} onChange={pickW} disabled={!fit} options={WKEYS.map(q => ({ value: q, label: WNAME[q] }))} /></Control>}
    />
  )
}
