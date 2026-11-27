// 二次函数 · 第 2 课 喷泉的水柱（y = ax² 的图像；a 决定开口方向和大小）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene2 from './scene2'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { A2, coef, fmt, JET_TOP, landX } from './physics'

type AKey = '-0.5' | '-1' | '-2' | '1'
const AV: Record<AKey, number> = { '-0.5': -0.5, '-1': -1, '-2': -2, '1': 1 }
const ALABEL: Record<AKey, string> = { '-0.5': 'a = −½', '-1': 'a = −1', '-2': 'a = −2', '1': 'a = 1' }
const TASKS: Task[] = [
  { id: 'dots', text: '在 a = −1 的水柱上描三个点', note: '描的点都落在水柱上：水柱就是 y = −x² 的图像' },
  { id: '-0.5', text: '把 a 换成 −½', note: '|a| 变小，开口变大，水柱落得更远' },
  { id: '-2', text: '把 a 换成 −2', note: '|a| 变大，开口变小，水柱又高又窄' },
  { id: '1', text: '把 a 换成 1', note: 'a > 0，开口向上；它和 y = −x² 关于 x 轴对称' },
]
const DOTS: [number, number][] = [-1, 0, 1].map(x => [x, -x * x])
const KEYS = A2.map(String) as AKey[]

export default function Lesson2() {
  const [k, setK] = useState<AKey>('-1')
  const [dots, setDots] = useState(false)
  const [seen, setSeen] = useState<AKey[]>([])
  const T = useTasks('gewu:quadratic:2', TASKS)
  const target = AV[k]
  const a = useSlide(target, 1.1), jet = useSlide(target < 0 ? target : -1, 0.9)
  const settled = Math.abs(a - target) < 1e-6
  useEffect(() => { if (!settled || !dots) return; const next = seen.includes(k) ? seen : [...seen, k]; if (next !== seen) setSeen(next); T.check(id => id === 'dots' || next.includes(id as AKey)) }, [settled, k, dots])   // eslint-disable-line react-hooks/exhaustive-deps
  const plot = () => { if (k !== '-1') return; setDots(true); T.check(id => id === 'dots') }
  const resetAll = () => { setK('-1'); setDots(false); setSeen([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'dots' | 'a' | null } = !task ? { hint: '四种 a 都看过了。a 的正负管开口朝哪，a 的大小管开口宽窄。', next: null }
    : task.id === 'dots' ? (k !== '-1' ? { hint: '先把 a 换回 −1', next: 'a' } : { hint: '按“描点”：在 x = −1、0、1 处描出 y = −x² 的点', next: 'dots' })
    : k !== task.id ? { hint: `把 a 换成 ${ALABEL[task.id as AKey].slice(4)}`, next: 'a' } : { hint: '水柱在变…', next: null }
  const L = landX(jet, 0, 0, -JET_TOP)
  const wantA = (task?.id === 'dots' ? '-1' : task?.id) as AKey | undefined

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="坐标平面"
      stage={<Scene2 a={a} jet={jet} dots={dots && k === '-1' ? DOTS : []} ghost={k === '1'} />}
      lesson={<LessonBlock no="2" title="喷泉的水柱" concept="a 决定开口的方向和大小" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把原点放在水柱的最高点，水柱就是函数 <span className="font-formula italic">y = ax²</span> 的图像。这样的曲线叫<b className="text-white">抛物线</b>：它关于 <span className="font-formula italic">y</span> 轴对称，对称轴和抛物线的交点叫<b className="text-white">顶点</b>，这里是原点。</p>
          <p className="mt-3"><span className="font-formula italic">a</span> &gt; 0 时开口向上，顶点是最低点；<span className="font-formula italic">a</span> &lt; 0 时开口向下，顶点是最高点。|<span className="font-formula italic">a</span>| 越大，开口越小。</p>
          <p className="mt-3"><span className="font-formula italic">y = x²</span> 和 <span className="font-formula italic">y = −x²</span> 的图像关于 <span className="font-formula italic">x</span> 轴对称。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种 a 都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">a &lt; 0 开口向下，a &gt; 0 开口向上；|a| 越大，抛物线越窄</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">y = ax²</div>
            <div className="mt-1 font-formula text-[38px] leading-none font-bold italic tabular-nums">y = {coef(target)}x²</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="a" value={fmt(target)} unit={target < 0 ? '开口向下' : '开口向上'} />
            <ParamTile symbol="落点" value={target < 0 && L ? `±${fmt(L[1])}` : '—'} unit="m · 水面 y = −3" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">看过的水柱</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">a</th><th className="font-normal">开口</th><th className="text-right font-normal">落点 x</th></tr></thead>
            <tbody>{KEYS.filter(q => seen.includes(q)).map(q => { const l = landX(AV[q], 0, 0, -JET_TOP); return <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{fmt(AV[q])}</td><td>{AV[q] < 0 ? '向下' : '向上'}</td><td className="text-right tabular-nums">{AV[q] < 0 && l ? `±${fmt(l[1])} m` : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'dots'} onClick={plot} disabled={dots || k !== '-1'}>描点</LabButton></>}
      extras={<Control label="a 的值"><Segmented label="a 的值" pulse={next === 'a'} want={next === 'a' ? wantA ?? null : null} value={k} onChange={setK} options={KEYS.map(q => ({ value: q, label: ALABEL[q] }))} /></Control>}
    />
  )
}
