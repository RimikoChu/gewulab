// 天气和气候 · 第 7 课 影响气候的因素：地球仪依次转到几座城市，学生给每座城市选出影响它气候的主要因素：
// 海口和哈尔滨（纬度位置）、乌鲁木齐（海陆位置）、拉萨（地形地势）、伦敦（洋流）。人类活动在原理和结论里讲。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { globeFacing, globePoint, spinFor } from './globe'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, valTag } from './parts'
import { FACTORS, FACTOR_NAMES, PLACES, type Factor } from './physics'
import { VOICE } from './voice'
import { NEAR, SPOT, type Want } from './world'

const TASKS: Task[] = FACTORS.map(f => ({ id: f.id, text: `${f.places.map(k => PLACES[k].name).join('和')}：选出主要因素`, note: '' }))
TASKS.forEach((t, i) => { t.note = `${FACTOR_NAMES[FACTORS[i].factor]}：${FACTORS[i].why}` })
const FACES = [118, 88, 91, -5]

export default function Lesson7() {
  const [at, setAt] = useState(0)
  const [pick, setPick] = useState<Factor | null>(null)
  const [wrong, setWrong] = useState<Factor | null>(null)
  const T = useTasks('gewu:climate:7', TASKS)
  const f = FACTORS[at], ok = pick === f.factor
  const choose = (v: Factor) => {
    if (ok) return
    if (v === f.factor) { setPick(v); setWrong(null); T.check(id => id === f.id) } else { setPick(null); setWrong(v) }
  }
  const nextCity = () => { if (!ok || at >= FACTORS.length - 1) return; setAt(at + 1); setPick(null); setWrong(null) }
  const resetAll = () => { setAt(0); setPick(null); setWrong(null); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'pick' | 'next' | null } = (() => {
    if (!task) return { hint: '都做完了。纬度、海陆、地形、洋流共同塑造气候。', next: null }
    if (wrong) return { hint: `${FACTOR_NAMES[wrong]}不是主要原因。再看看它在哪里`, next: 'pick' }
    if (!ok) return { hint: `${f.fact}。主要受什么影响？`, next: 'pick' }
    return { hint: '对了。转到下一座城市', next: 'next' }
  })()

  const spin = spinFor(FACES[at])
  const labels: Label[] = f.places.map((k, i) => valTag(k, globePoint(PLACES[k].at, spin, 1.03), PLACES[k].name, f.tags[i], true, globeFacing(PLACES[k].at, spin), i ? 0 : 1))
  const s = SPOT.globe
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="天气和气候" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球仪"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...NEAR} world={{ globe: { layer: 'none', spin } }}>
        {f.places.map(k => <mesh key={k} position={globePoint(PLACES[k].at, spin, 1.008)}><sphereGeometry args={[0.03, 16, 12]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>)}
      </LabStage>}
      lesson={<LessonBlock no="7" title="影响气候的因素" concept="纬度、海陆、地形、洋流共同塑造气候" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>影响气候的主要因素有：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">纬度位置：</b>纬度不同，得到的太阳光热不同。</li>
            <li><b className="text-[#7fe3d4]">海陆位置：</b>离海近的地方降水多、冬夏温差小；深居内陆的地方降水少、温差大。</li>
            <li><b className="text-[#7fe3d4]">地形地势：</b>海拔越高气温越低；山地的迎风坡多雨。</li>
            <li><b className="text-[#7fe3d4]">洋流：</b>暖流使沿岸地区增温增湿，寒流使沿岸地区降温减湿。</li>
            <li><b className="text-[#7fe3d4]">人类活动：</b>城市里建筑密集、排放大量热量，比郊区热；大量排放二氧化碳等，使全球变暖。</li>
          </ul>
        </>} />}
      finale={T.finale && <Fin kicker="四座城市都判断完了" big="纬度、海陆、地形、洋流共同塑造气候" small="海口和哈尔滨看纬度，乌鲁木齐看海陆，拉萨看地形，伦敦看洋流。人类活动也在改变气候：城市比郊区热，全球在变暖。" />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">第 {at + 1} / {FACTORS.length} 座 · {f.places.map(k => PLACES[k].name).join('、')}</div>
            <div className="mt-1 text-[22px] leading-snug font-bold">{f.fact}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">为什么</h2>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/85">{ok ? <><b className="text-[#7fe3d4]">{FACTOR_NAMES[f.factor]}：</b>{f.why}。</> : wrong ? '不是这一个。想想这座城市在哪里：纬度高低、离海远近、地势高低、旁边有没有洋流。' : '先选一个因素。'}</p>
          <h2 className="mt-5 text-[12.5px] text-white/55">判断过的</h2>
          {at > 0 || ok ? <Rows head={['城市', '主要因素']} rows={FACTORS.slice(0, ok ? at + 1 : at).map(x => [x.places.map(k => PLACES[k].name).join('、'), FACTOR_NAMES[x.factor]])} /> : <p className="mt-2 text-[13.5px] text-white/50">还没有</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'next'} onClick={nextCity} disabled={!ok || at >= FACTORS.length - 1}>下一座城市</LabButton>
      </>}
      extras={
        <Control label="主要因素">
          <Segmented label="主要因素" pulse={next === 'pick'} want={next === 'pick' ? f.factor : null} value={(pick ?? wrong ?? '') as Factor} onChange={v => choose(v as Factor)} options={(Object.keys(FACTOR_NAMES) as Factor[]).map(k => ({ value: k, label: FACTOR_NAMES[k] }))} />
        </Control>
      }
    />
  )
}
