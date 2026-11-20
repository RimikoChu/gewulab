// 光合作用和呼吸作用 · 第 1 课 叶片见光才有淀粉（绿叶在光下制造有机物）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { STEPS, makesStarch } from './physics'

const TASKS: Task[] = [
  { id: 'prep', text: '暗处理，再遮住叶片的一半', note: '先耗尽原有的淀粉；同一片叶子上一半见光、一半遮光，做对照' },
  { id: 'bleach', text: '照光几小时，摘下叶片脱色', note: '酒精把叶绿素溶掉，叶片变成黄白色' },
  { id: 'test', text: '滴碘液，比较两半的颜色', note: '见光的一半变蓝，遮光的一半不变蓝' },
]
const SIDES = [{ name: '见光的一半', light: true }, { name: '遮光的一半', light: false }]

export default function Lesson1() {
  const [step, setStep] = useState(0)
  const [iodine, setIodine] = useState(false)
  const [busy, setBusy] = useState(false)
  const T = useTasks('gewu:leaf:1', TASKS)
  useEffect(() => { T.check(id => id === 'prep' ? step >= 2 : id === 'bleach' ? step >= 4 : iodine) }, [step, iodine])   // eslint-disable-line react-hooks/exhaustive-deps
  const wait = () => { setBusy(true); setTimeout(() => setBusy(false), 1500) }
  const go = () => { if (busy || step >= 4) return; setStep(s => s + 1); wait() }
  const drop = () => { if (busy || step < 4 || iodine) return; setIodine(true); wait() }
  const resetAll = () => { setStep(0); setIodine(false); setBusy(false); T.reset() }

  const todo = STEPS[step]
  const { hint, next }: { hint: string; next: 'go' | 'drop' | null } = (() => {
    if (busy) return { hint: step > 0 && !iodine ? `${STEPS[step - 1].name}：${STEPS[step - 1].why}` : '看两半的颜色…', next: null }
    if (todo) return { hint: `按“${todo.name}”：${todo.does}`, next: 'go' }
    if (!iodine) return { hint: '叶片已经脱成黄白色：按“滴碘液”', next: 'drop' }
    return { hint: '都做完了。只有见光的那一半变蓝了。', next: null }
  })()

  return (
    <LabShell title="光合作用和呼吸作用" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="实验步骤"
      stage={<Scene1 step={step} iodine={iodine} />}
      lesson={<LessonBlock no="1" title="叶片见光才有淀粉" concept="绿叶在光下制造有机物" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>淀粉遇到碘液会变蓝。用这个办法可以检验叶片里有没有淀粉。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {STEPS.map(s => <li key={s.key}><b className="text-[#7fe3d4]">{s.name}：</b>{s.why}</li>)}
          </ul>
          <p className="mt-3">见光的部分变蓝，遮光的部分不变蓝：<b className="text-white">光是绿叶制造有机物不可缺少的条件，淀粉是光合作用的产物。</b></p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两半的颜色不一样</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">绿叶只有在光下才能制造淀粉</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">同一片叶子，见光的一半滴碘液变蓝，遮光的一半不变。差别只有光。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">滴碘液以后</div>
            <div className="mt-1 text-[32px] leading-none font-bold tracking-tight text-[#7fe3d4]">{iodine ? '只有见光的变蓝' : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">做过的步骤</h2>
          {step === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">一共四步，再加最后的检验。每做一步，这里会记下为什么要这样做。</p>
            : <ol className="mt-2 flex flex-col gap-1.5 text-[13.5px]">{STEPS.slice(0, step).map((s, i) => <li key={s.key} className="row-in rounded-xl bg-white/6 px-3 py-2"><b className="text-white">{i + 1}. {s.name}</b><span className="ml-2 text-white/65">{s.why}</span></li>)}</ol>}
          {iodine && <>
            <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
            <table className="mt-1 w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">叶片的部分</th><th className="font-normal">滴碘液</th><th className="font-normal">有没有淀粉</th></tr></thead>
              <tbody>{SIDES.map(s => { const ok = makesStarch({ light: s.light, co2: true, chloroplast: true }); return <tr key={s.name} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{s.name}</td><td className="font-semibold text-[#7fe3d4]">{ok ? '变蓝' : '不变蓝'}</td><td>{ok ? '有' : '没有'}</td></tr> })}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={go} disabled={busy || step >= 4}>{todo ? todo.name : '四步做完了'}</LabButton>
        <LabButton primary pulse={next === 'drop'} onClick={drop} disabled={busy || step < 4 || iodine}>滴碘液</LabButton>
      </>}
      extras={null}
    />
  )
}
