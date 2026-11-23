// 细胞 · 第 3 课 对光和调焦（使用显微镜的步骤；物像是倒的）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Microscope } from './models'
import { DIRS, FOCUS, imageMoves, seenAs, slideToCenter, type Dir } from './physics'
import View from './view'
import { SPAN, SPOT, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'light', text: '转到低倍物镜，对好光', note: '看到一个白亮的圆形视野，光就对好了' },
  { id: 'sharp', text: '放片、降镜筒、升镜筒，把物像调清楚', note: '降镜筒时眼睛看物镜；找到物像后用细准焦螺旋调清' },
  { id: 'center', text: '物像偏在左下方：把它移到视野中央', note: '物像偏哪边，玻片就往哪边移：因为看到的是倒像' },
]
const IMAGE_AT: Dir = 'ld'

export default function Lesson3() {
  const [step, setStep] = useState(0)
  const [moved, setMoved] = useState<Dir | null>(null)
  const T = useTasks('gewu:cells:3', TASKS)
  const go = () => { if (step >= FOCUS.length) return; const s = step + 1; setStep(s); T.check(id => id === 'light' ? s >= 2 : id === 'sharp' ? s >= FOCUS.length : false) }
  const right = slideToCenter(IMAGE_AT), centered = moved === right
  const move = (d: Dir) => { if (step < FOCUS.length || centered) return; setMoved(d); if (d === right) T.check(() => true) }
  const resetAll = () => { setStep(0); setMoved(null); T.reset() }
  const todo = FOCUS[step], last = step ? FOCUS[step - 1] : null
  const mode = step === 0 ? 'dark' : last!.view
  const { hint, next }: { hint: string; next: 'go' | Dir | null } = todo ? { hint: `${last ? `${last.why}。` : ''}按“下一步”：${todo.does}`, next: 'go' }
    : centered ? { hint: '物像回到中央了。', next: null }
    : moved ? { hint: `玻片往${DIRS[moved]}移，物像却往${DIRS[imageMoves(moved)]}跑，更偏了：看到的是倒像。换个方向`, next: right }
    : { hint: `物像清楚了，但偏在${DIRS[IMAGE_AT]}。玻片该往哪边移？`, next: right }

  return (
    <LabShell title="细胞" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="显微镜"
      stage={<LabStage labels={last ? [{ id: 's', at: [ST.scope + 0.3, TOP + 0.75, 0.1], className: 'scene-tag key -translate-y-1/2', children: <><small>第 {step} 步</small>{last.name}</> }] : []} target={SPOT.scope} span={SPAN.scope}><Microscope position={[ST.scope, TOP, 0]} glow={step === 2 ? 'light' : step === 3 || step === 4 || step === 5 ? 'focus' : step === 1 ? 'lens' : null} /></LabStage>}
      lesson={<LessonBlock no="3" title="对光和调焦" concept="先对光，再调焦；看到的是倒像" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <ol className="flex flex-col gap-1.5 text-[14px] text-white/80">{FOCUS.map((s, i) => <li key={s.key}><b className="text-[#7fe3d4]">{i + 1}. {s.name}：</b>{s.does}。{s.why}</li>)}</ol>
          <p className="mt-3">显微镜下看到的是<b className="text-white">倒像</b>：上下、左右都颠倒。玻片上写的“p”，看到的是“{seenAs('p')}”。所以物像偏在哪一边，就把玻片往哪一边移。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">物像又清楚又居中</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">物像偏哪边，玻片就往哪边移</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">因为显微镜成的是倒像：玻片往左下移，物像往右上走，正好回到中央。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">从目镜里看到的</div>
            <div className="mt-1 text-[24px] leading-none font-bold tracking-tight text-[#7fe3d4]">{mode === 'dark' ? '一片漆黑' : mode === 'bright' ? '白亮的视野' : mode === 'blur' ? '模糊的物像' : centered ? '清楚，在中央' : step >= FOCUS.length ? `清楚，偏在${DIRS[IMAGE_AT]}` : '清楚的物像'}</div>
          </div>
          <View mode={mode} row={8} at={step >= FOCUS.length && !centered ? IMAGE_AT : null} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="做到" value={`第 ${step} 步`} unit={`一共 ${FOCUS.length} 步`} />
            <ParamTile symbol="玻片上的 p" value={seenAs('p')} unit="在显微镜下看到的" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={!!todo} pulse={next === 'go'} onClick={go} disabled={!todo}>{todo ? '下一步' : '五步做完了'}</LabButton>
        <LabButton primary={next === 'ld'} pulse={next === 'ld'} onClick={() => move('ld')} disabled={!!todo || centered}>玻片往左下移</LabButton>
        <LabButton primary={next === 'ru'} pulse={next === 'ru'} onClick={() => move('ru')} disabled={!!todo || centered}>玻片往右上移</LabButton>
      </>}
      extras={null}
    />
  )
}
