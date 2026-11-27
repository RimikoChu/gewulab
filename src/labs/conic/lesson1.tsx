// 圆锥曲线 · 第 1 课 用平面切圆锥（平面和轴的夹角不同，截口依次是圆、椭圆、抛物线、双曲线）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { CONE, CUTS, CUT_KEYS, sectionType, type CutKey } from './physics'

const TASKS: Task[] = [
  { id: 'circle', text: '光幕垂直于轴，切下去', note: '垂直于轴切：截口是圆' },
  { id: 'ellipse', text: '把光幕斜一点（β = 60°），再切', note: 'β 比 α 大：只切到一个圆锥，截口是一圈闭合的椭圆' },
  { id: 'parabola', text: '光幕平行于一条母线（β = 30°）', note: 'β 等于 α：截口不再闭合，是抛物线' },
  { id: 'hyperbola', text: '光幕平行于轴（β = 0°）', note: 'β 比 α 小：上下两个圆锥都切到，截口是两支的双曲线' },
]
const OUT = 1.0
const REL: Record<CutKey, string> = { circle: 'β = 90°', ellipse: 'α < β < 90°', parabola: 'β = α', hyperbola: 'β < α' }

export default function Lesson1() {
  const [sel, setSel] = useState<CutKey>('circle')      // 想要的方向
  const [cur, setCur] = useState<CutKey>('circle')      // 光幕现在的方向（退出来以后才转）
  const [inside, setInside] = useState(false)
  const [seen, setSeen] = useState<CutKey[]>([])
  const T = useTasks('gewu:conic:1', TASKS)
  const off = useSlide(inside ? 0 : OUT, 0.55)
  const beta = useSlide(CUTS[cur].beta, 50), y0 = useSlide(CUTS[cur].y0, 0.6), z0 = useSlide(CUTS[cur].z0, 0.6)
  const turned = beta === CUTS[cur].beta && y0 === CUTS[cur].y0 && z0 === CUTS[cur].z0
  const arrived = inside && off === 0 && cur === sel && turned
  useEffect(() => { if (sel !== cur) { if (inside) setInside(false); else if (off === OUT) setCur(sel) } }, [sel, cur, inside, off])
  useEffect(() => { if (!arrived) return; const next = seen.includes(cur) ? seen : [...seen, cur]; if (next !== seen) setSeen(next); T.check(id => next.includes(id as CutKey)) }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  const ready = cur === sel && turned && !inside && off === OUT
  const resetAll = () => { setSel('circle'); setCur('circle'); setInside(false); setSeen([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'seg' | 'cut' | null } = !task ? { hint: '四种截口都切出来了。换个方向再切一次看看。', next: null }
    : sel !== task.id ? { hint: `把光幕转到“${CUTS[task.id as CutKey].plane}”`, next: 'seg' }
    : ready ? { hint: '按“切下去”：把光幕推进圆锥', next: 'cut' } : { hint: inside ? '光幕在往里走…' : '光幕在转…', next: null }
  const kind = sectionType(CUTS[cur].beta)

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光幕"
      stage={<Scene1 beta={beta} y0={y0} z0={z0} off={off} shown={arrived ? cur : null} />}
      lesson={<LessonBlock no="1" title="用平面切圆锥" concept="平面的方向不同，截口不同" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用一个不过顶点的平面去截两个对顶的圆锥，平面和圆锥的轴的夹角不同，截口曲线也不同：圆、椭圆、抛物线、双曲线。它们统称<b className="text-white">圆锥曲线</b>。</p>
          <p className="mt-3">设母线和轴的夹角是 α，平面和轴的夹角是 β。β = 90° 时截口是圆；α &lt; β &lt; 90° 时是椭圆；β = α 时是抛物线；β &lt; α 时平面和上下两个圆锥都相交，是双曲线。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种截口都切出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同一个圆锥，平面越来越陡：圆 → 椭圆 → 抛物线 → 双曲线</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再切一切</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在的截口</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight">{arrived ? CUTS[kind].name : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="α" value={`${CONE.alpha}°`} unit="母线和轴的夹角" />
            <ParamTile symbol="β" value={`${Math.round(beta)}°`} unit="光幕和轴的夹角" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">切过的</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">β</th><th className="font-normal">和 α 比</th><th className="text-right font-normal">截口</th></tr></thead>
            <tbody>{CUT_KEYS.filter(k => seen.includes(k)).map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{CUTS[k].beta}°</td><td>{REL[k]}</td><td className="text-right font-semibold">{CUTS[k].name}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'cut'} onClick={() => setInside(true)} disabled={!ready}>切下去</LabButton></>}
      extras={<Control label="光幕的方向"><Segmented label="光幕的方向" pulse={next === 'seg'} want={next === 'seg' ? task!.id as CutKey : null} value={sel} onChange={setSel} options={CUT_KEYS.map(k => ({ value: k, label: CUTS[k].plane }))} /></Control>}
    />
  )
}
