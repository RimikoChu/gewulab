// 一次函数 · 第 4 课 过原点的直线（正比例函数 y = kx 的图像和性质）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene4, { KCOL } from './scene4'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { formula, prop, quadrants, trend } from './physics'

const KS = [1, 2, -1]
const TASKS: Task[] = [
  { id: '1', text: 'k = 1，画出图像', note: 'y = x 过原点和 (1, 1)，从左往右上升' },
  { id: '2', text: '换成 k = 2，再画一条', note: 'y = 2x 也过原点，比 y = x 更陡' },
  { id: '-1', text: '换成 k = −1，再画一条', note: 'y = −x 过原点，从左往右下降' },
]
const QN = ['', '一', '二', '三', '四']

export default function Lesson4() {
  const [k, setK] = useState(1)
  const [run, setRun] = useState(0)
  const [done, setDone] = useState<number[]>([])
  const T = useTasks('gewu:linear:4', TASKS)
  const p = useRamp(run, 2.2), drawing = run > 0 && p < 1
  useEffect(() => { if (run && p >= 1 && !done.includes(k)) { const n = [...done, k]; setDone(n); T.check(id => n.includes(+id)) } }, [p])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (v: number) => { if (drawing) return; setK(v); setRun(0) }
  const draw = () => { if (drawing) return; setRun(r => r + 1) }
  const resetAll = () => { setK(1); setRun(0); setDone([]); T.reset() }
  const want = T.current ? +T.current.id : null
  const has = done.includes(k) && (run === 0 || p >= 1)
  const { hint, next }: { hint: string; next: 'k' | 'draw' | null } = !T.current ? { hint: '三条直线都过原点：k 的正负定方向，k 越大越陡。', next: null }
    : drawing ? { hint: '先描 (0, 0) 和 (1, k) 两个点，再连成直线…', next: null }
    : want !== null && k !== want ? { hint: `把 k 换成 ${String(want).replace('-', '−')}`, next: 'k' }
    : { hint: `按“画图像”：画出 ${formula(k, 0)}`, next: 'draw' }
  return (
    <LabShell title="一次函数" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="画图"
      stage={<Scene4 k={k} p={run ? p : 0} done={done} />}
      lesson={<LessonBlock no="4" title="过原点的直线" concept="y = kx 的图像是一条过原点的直线" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>形如 y = kx（k 是常数，k ≠ 0）的函数，叫做<b className="text-[#7fe3d4]">正比例函数</b>，k 叫做比例系数。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>图像是经过原点的一条直线，画它只要描 (0, 0) 和 (1, k) 两点</li>
            <li><b className="text-[#7fe3d4]">k &gt; 0：</b>经过第一、三象限，y 随 x 的增大而增大</li>
            <li><b className="text-[#7fe3d4]">k &lt; 0：</b>经过第二、四象限，y 随 x 的增大而减小</li>
            <li>|k| 越大，直线越陡</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三条直线都画好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">y = kx 的图像都过原点；k &gt; 0 上升，k &lt; 0 下降</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">y = x、y = 2x 在第一、三象限，y = 2x 更陡；y = −x 在第二、四象限。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">正比例函数</div>
            <div className="mt-1 font-formula text-[34px] leading-none italic" style={{ color: KCOL[String(k)] }}>{formula(k, 0)}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="k" value={String(k).replace('-', '−')} unit="比例系数" />
            <ParamTile symbol="(1, k)" value={`(1, ${String(prop(k, 1)).replace('-', '−')})`} unit="第二个点" />
          </div>
          {done.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">函数</th><th className="font-normal">经过的象限</th><th className="text-right font-normal">从左往右</th></tr></thead>
            <tbody>{done.map(d => <tr key={d} className="row-in border-t border-white/12"><td className="py-1.5 font-semibold" style={{ color: KCOL[String(d)] }}>{formula(d, 0)}</td><td>{quadrants(d, 0).map(q => QN[q]).join('、')}</td><td className="text-right">{trend(d)}</td></tr>)}</tbody>
          </table>}
          {has && <p className="mt-3 text-[13px] text-white/60">x 增大 1，y 就变化 {String(k).replace('-', '−')}。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'draw'} onClick={draw} disabled={drawing}>画图像</LabButton>
      </>}
      extras={<Control label="比例系数 k"><Segmented label="比例系数 k" pulse={next === 'k'} want={next === 'k' ? String(want) : null} value={String(k)} disabled={drawing} onChange={v => pick(+v)} options={KS.map(v => ({ value: String(v), label: `k = ${String(v).replace('-', '−')}` }))} /></Control>}
    />
  )
}
