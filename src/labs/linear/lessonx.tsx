// 一次函数 · 拓展课 生活里的一次函数：出租车计价（分段的一次函数）、摄氏度换华氏度
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import SceneX from './scenex'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { TAXI, TAXI_TRIP, TEMPS, taxi, toF } from './physics'

type Topic = 'taxi' | 'temp'
const TASKS: Task[] = [
  { id: 'taxi', text: '出租车打表开 8 km，看车费怎样变', note: '3 km 以内 10 元不变，之后每千米加 2 元：8 km 20 元' },
  { id: 'temp', text: '把 0、20、−10 °C 换成华氏度', note: '32、68、14 °F：都在直线 y = 1.8x + 32 上' },
]
const n = (v: number) => String(v).replace('-', '−')

export default function LessonX() {
  const [topic, setTopic] = useState<Topic>('taxi')
  const [go, setGo] = useState(false)
  const [run, setRun] = useState(0)
  const T = useTasks('gewu:linear:x', TASKS)
  const km = useSlide(go ? TAXI_TRIP : 0, 1.8), driving = go && km < TAXI_TRIP
  const temp = useRamp(run, 3.4), converting = run > 0 && temp < 1
  useEffect(() => { if (go && km >= TAXI_TRIP) T.check(id => id === 'taxi') }, [km])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (run && temp >= 1) T.check(id => id === 'temp') }, [temp])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (t: Topic) => { if (driving || converting) return; setTopic(t) }
  const resetAll = () => { setTopic('taxi'); setGo(false); setRun(0); T.reset() }
  const cur = T.current?.id as Topic | undefined
  const { hint, next }: { hint: string; next: 'go' | 'conv' | 'topic' | null } = !cur ? { hint: '分段计价、温度换算，生活里到处是一次函数。', next: null }
    : driving ? { hint: '出租车在走，计价器在跳…', next: null }
    : converting ? { hint: '一个个温度描到图上…', next: null }
    : topic !== cur ? { hint: cur === 'temp' ? '接着看：摄氏度换华氏度' : '接着看：出租车计价', next: 'topic' }
    : cur === 'taxi' ? { hint: '按“打表出发”，看车费怎样随路程变', next: 'go' }
    : { hint: '按“换算三个温度”', next: 'conv' }
  return (
    <LabShell title="一次函数" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={topic === 'taxi' ? '出租车' : '温度'}
      stage={<SceneX topic={topic} km={go ? km : 0} temp={run ? temp : 0} />}
      lesson={<LessonBlock no="拓展" title="生活里的一次函数" concept="分段计价、温度换算，都是一次函数" tasks={TASKS} done={T.done} current={cur}
        theory={<>
          <p><b className="text-[#7fe3d4]">出租车计价：</b>起步价 10 元含 3 km；超过 3 km 的部分每千米 2 元。x ≤ 3 时 y = 10；x &gt; 3 时 y = 10 + 2(x − 3) = 2x + 4。图像是一段水平线接一段斜线，叫分段函数。</p>
          <p className="mt-3"><b className="text-[#7fe3d4]">温度换算：</b>华氏度 = 1.8 × 摄氏度 + 32。水结冰是 0 °C，也就是 32 °F。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的出租车计价是为了好算取的数，各地的起步价和单价不一样。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">打车、换算温度，背后都是一次函数</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">出租车 3 km 以后 y = 2x + 4，每多 1 km 多 2 元；华氏度 y = 1.8x + 32，每升高 1 °C 多 1.8 °F。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {topic === 'taxi' ? <>
            <div className="text-center">
              <div className="font-formula text-[18px] italic text-white/65">{km > TAXI.within ? 'y = 2x + 4' : 'y = 10'}</div>
              <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{taxi(go ? km : 0).toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">元</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="x" value={(go ? km : 0).toFixed(1)} unit="km · 路程" />
              <ParamTile symbol="起步" value={`${TAXI.start} 元`} unit={`含 ${TAXI.within} km`} />
            </div>
          </> : <>
            <div className="text-center"><div className="font-formula text-[26px] italic">y = 1.8x + 32</div><div className="mt-1 text-[13px] text-white/60">x：摄氏度　y：华氏度</div></div>
            <table className="mt-4 w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">摄氏度 / °C</th><th className="text-right font-normal">华氏度 / °F</th></tr></thead>
              <tbody>{TEMPS.filter((_, i) => temp > i / 3.4).map(c => <tr key={c} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{n(c)}</td><td className="text-right font-semibold text-[#ffd25a] tabular-nums">{toF(c)}</td></tr>)}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        {topic === 'taxi'
          ? <LabButton primary pulse={next === 'go'} onClick={() => setGo(true)} disabled={go}>打表出发</LabButton>
          : <LabButton primary pulse={next === 'conv'} onClick={() => setRun(1)} disabled={run > 0}>换算三个温度</LabButton>}
      </>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'topic'} want={next === 'topic' ? cur : null} value={topic} disabled={driving || converting} onChange={v => pick(v as Topic)} options={[{ value: 'taxi', label: '出租车计价' }, { value: 'temp', label: '温度换算' }]} /></Control>}
    />
  )
}
