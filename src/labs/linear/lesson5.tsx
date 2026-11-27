// 一次函数 · 第 5 课 k 和 b（一次函数 y = kx + b 的图像：b 定与 y 轴的交点，k 定增减和倾斜）
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { formula, parallel, trend, xCross, yCross } from './physics'

const BS = [0, 2, -3]
const TASKS: Task[] = [
  { id: 'b2', text: '把 b 换成 2，看直线怎么动', note: '直线向上平移了 2：和 y 轴交于 (0, 2)' },
  { id: 'b-3', text: '把 b 换成 −3，再看', note: '又平移到 (0, −3)；k 都是 2，三条线互相平行' },
  { id: 'k', text: '把 k 换成 −1，看直线怎么动', note: '直线绕 (0, −3) 转成下降：k 定方向' },
]
const n = (v: number) => String(v).replace('-', '−')

export default function Lesson5() {
  const [k, setK] = useState(2)
  const [b, setB] = useState(0)
  const [trail, setTrail] = useState<[number, number][]>([])
  const T = useTasks('gewu:linear:5', TASKS)
  const kv = useSlide(k, 1.6), bv = useSlide(b, 2.6)
  const moving = Math.abs(kv - k) > 1e-3 || Math.abs(bv - b) > 1e-3
  const prev = useRef<[number, number]>([2, 0])
  // 停稳了：打勾，并把上一条线留在屏上
  useEffect(() => {
    if (moving) return
    const [pk, pb] = prev.current
    if (pk !== k || pb !== b) { setTrail(t => [...t.filter(([a, c]) => a !== pk || c !== pb), [pk, pb]]); prev.current = [k, b] }
    T.check(id => (id === 'b2' && k === 2 && b === 2) || (id === 'b-3' && k === 2 && b === -3 && !!T.done.b2) || (id === 'k' && k === -1 && b === -3 && !!T.done['b-3']))
  }, [moving, k, b])   // eslint-disable-line react-hooks/exhaustive-deps
  const setKk = (v: number) => { if (!moving) setK(v) }
  const resetAll = () => { setK(2); setB(0); setTrail([]); prev.current = [2, 0]; T.reset() }
  const cur = T.current?.id
  const { hint, next }: { hint: string; next: 'b' | 'k' | null } = !T.current ? { hint: 'b 定直线和 y 轴的交点，k 定它的方向和陡缓。', next: null }
    : moving ? { hint: '直线在动：看它是平移还是转动…', next: null }
    : cur === 'b2' ? { hint: '把 b 换成 2：看直线和 y 轴的交点', next: 'b' }
    : cur === 'b-3' ? (k !== 2 ? { hint: '先把 k 换回 2', next: 'k' } : { hint: '把 b 换成 −3，再看', next: 'b' })
    : b !== -3 ? { hint: '把 b 换回 −3', next: 'b' } : { hint: '按“k = −1”：看直线怎样转', next: 'k' }
  const wantB = cur === 'b2' ? '2' : '-3'
  const kNext = cur === 'b-3' ? 2 : -1
  const xc = xCross(k, b)
  return (
    <LabShell title="一次函数" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="比例系数 k"
      stage={<Scene5 k={kv} b={bv} kk={k} bb={b} trail={trail} />}
      lesson={<LessonBlock no="5" title="k 和 b" concept="b 定直线和 y 轴的交点，k 定它的方向" tasks={TASKS} done={T.done} current={cur}
        theory={<>
          <p>形如 y = kx + b（k、b 是常数，k ≠ 0）的函数叫<b className="text-[#7fe3d4]">一次函数</b>。b = 0 时就是正比例函数。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>图像是一条直线，和 y 轴交于 (0, b)</li>
            <li>y = kx + b 可以看成 y = kx 向上（b &gt; 0）或向下（b &lt; 0）平移 |b| 个单位</li>
            <li>k 相同、b 不同的两条直线互相平行</li>
            <li>k &gt; 0 时 y 随 x 增大而增大；k &lt; 0 时 y 随 x 增大而减小</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">换了两次 b、一次 k</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">b 让直线上下平移，k 让直线绕 (0, b) 转</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">y = 2x、y = 2x + 2、y = 2x − 3 互相平行；y = −x − 3 和 y = 2x − 3 都过 (0, −3)，一个下降一个上升。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">一次函数</div>
            <div className="mt-1 font-formula text-[34px] leading-none italic text-[#ffd25a]">{formula(k, b)}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="k" value={n(k)} unit={`从左往右${trend(k)}`} />
            <ParamTile symbol="b" value={n(b)} unit="与 y 轴交点的纵坐标" />
          </div>
          <table className="mt-4 w-full text-[13.5px]"><tbody>
            <tr className="border-t border-white/12"><td className="py-1.5 text-white/60">与 y 轴交于</td><td className="text-right tabular-nums">({yCross(k, b).map(n).join(', ')})</td></tr>
            <tr className="border-t border-white/12"><td className="py-1.5 text-white/60">与 x 轴交于</td><td className="text-right tabular-nums">{xc ? `(${xc.map(n).join(', ')})` : '—'}</td></tr>
            {trail.some(([tk, tb]) => parallel(tk, tb, k, b)) && <tr className="row-in border-t border-white/12"><td className="py-1.5 text-white/60">和留下的线</td><td className="text-right">k 相同，平行</td></tr>}
          </tbody></table>
        </Glass>
      }
      actions={<>
        {[2, -1].map(v => <LabButton key={v} primary={next === 'k' && v === kNext} pulse={next === 'k' && v === kNext} onClick={() => setKk(v)} disabled={moving || k === v}>k = {n(v)}</LabButton>)}
      </>}
      extras={<Control label="截距 b"><Segmented label="截距 b" pulse={next === 'b'} want={next === 'b' ? wantB : null} value={String(b)} disabled={moving} onChange={v => setB(+v)} options={BS.map(v => ({ value: String(v), label: `b = ${n(v)}` }))} /></Control>}
    />
  )
}
