// 导数 · 第 4 课 导数怎么求（基本初等函数的导数；简单复合函数的导数）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene4 from './scene4'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { FN_KEYS, FUNCS, fmt, type FnKey } from './physics'

const TASKS: Task[] = [
  { id: 'pow', text: '描出 x³ 的导函数', note: '(x³)′ = 3x²：幂函数 (xⁿ)′ = nxⁿ⁻¹' },
  { id: 'sin', text: '换成 sin x，再描一次', note: '(sin x)′ = cos x：切线最陡的地方，cos x 最大' },
  { id: 'exp', text: '换成 eˣ', note: '(eˣ)′ = eˣ：每一处的切线斜率等于函数值本身' },
  { id: 'ln', text: '换成 ln x', note: '(ln x)′ = 1/x：x 越大，切线越平' },
  { id: 'sin2', text: '换成 sin 2x（复合函数）', note: '(sin 2x)′ = 2cos 2x：外层求导，再乘内层 2x 的导数 2' },
]
const SWEEP = 5.5

export default function Lesson4() {
  const [fn, setFn] = useState<FnKey>('pow')
  const [run, setRun] = useState(0)
  const T = useTasks('gewu:derivative:4', TASKS)
  const p = useRamp(run, SWEEP), c = FUNCS[fn]
  const xc = run ? c.xr[0] + (c.xr[1] - c.xr[0]) * Math.max(0.0005, p) : T.done[fn] ? c.xr[1] : null
  const sweeping = run > 0 && p < 1, traced = (run > 0 && p >= 1) || (!run && !!T.done[fn])
  useEffect(() => { if (run && p >= 1) T.check(id => id === fn) }, [p >= 1, run])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: FnKey) => { setFn(k); setRun(0) }
  const resetAll = () => { setFn('pow'); setRun(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'fn' | 'sweep' | null } = !task ? { hint: '每一处切线的斜率连起来，就是导函数。五个公式都对上了。', next: null }
    : sweeping ? { hint: '切点从左往右扫，下格同步描出切线的斜率…', next: null }
    : fn !== task.id ? { hint: `把函数换成 ${FUNCS[task.id as FnKey].name}`, next: 'fn' }
    : { hint: '按“描导函数”：切点从左扫到右，把每一处切线的斜率描在下格', next: 'sweep' }

  return (
    <LabShell title="导数" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="描导函数"
      stage={<Scene4 fn={fn} xc={xc} done={traced} />}
      lesson={<LessonBlock no="4" title="导数怎么求" concept="切线斜率连起来，就是导函数" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>每一个 <span className="font-formula italic">x</span> 都对应一个导数 <span className="font-formula italic">f′(x)</span>，它也是 <span className="font-formula italic">x</span> 的函数，叫<b className="text-white">导函数</b>。几个基本初等函数的导数：</p>
          <p className="mt-2 font-formula italic leading-loose">(c)′ = 0；(xⁿ)′ = nxⁿ⁻¹；(sin x)′ = cos x；(cos x)′ = −sin x；(eˣ)′ = eˣ；(aˣ)′ = aˣ ln a；(ln x)′ = 1/x</p>
          <p className="mt-3">运算法则：<span className="font-formula italic">[f ± g]′ = f′ ± g′</span>；<span className="font-formula italic">[fg]′ = f′g + fg′</span>；<span className="font-formula italic">[f/g]′ = (f′g − fg′)/g²</span>（g ≠ 0）；<span className="font-formula italic">[cf]′ = cf′</span>。</p>
          <p className="mt-3">复合函数 <span className="font-formula italic">y = f(g(x))</span> 的导数 <span className="font-formula italic">y′ = f′(u)·g′(x)</span>，<span className="font-formula italic">u = g(x)</span>。例如 <span className="font-formula italic">(sin 2x)′ = cos 2x · 2 = 2cos 2x</span>。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">五条导函数都描出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">(x³)′ = 3x²，(sin x)′ = cos x，(eˣ)′ = eˣ，(ln x)′ = 1/x，(sin 2x)′ = 2cos 2x</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">{c.fText}</div>
            <div className="mt-1 font-formula text-[34px] leading-tight font-bold italic">{traced ? c.dText : 'f′(x) = ?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="x" value={xc === null ? '—' : fmt(xc, 2)} unit="切点" />
            <ParamTile symbol="k" value={xc === null ? '—' : fmt(c.df(xc), 2)} unit="切线斜率 f′(x)" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">描过的导函数</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">f(x)</th><th className="font-normal">f′(x)</th><th className="text-right font-normal">一处的值</th></tr></thead>
            <tbody>{FN_KEYS.filter(k => T.done[k]).map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 font-formula italic">{FUNCS[k].name}</td><td className="font-formula italic">{FUNCS[k].dText.slice(8)}</td><td className="text-right tabular-nums">f′({FUNCS[k].at}) = {fmt(FUNCS[k].df(FUNCS[k].at))}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'sweep'} onClick={() => setRun(r => r + 1)} disabled={sweeping}>描导函数</LabButton>}
      extras={<Control label="函数"><Segmented label="函数" pulse={next === 'fn'} want={next === 'fn' ? (task?.id as FnKey) : null} value={fn} disabled={sweeping} onChange={k => pick(k as FnKey)} options={FN_KEYS.map(k => ({ value: k, label: FUNCS[k].name }))} /></Control>}
    />
  )
}
