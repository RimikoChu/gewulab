// 天气和气候 · 第 5 课 降水的分布：先在大山的南边看海风翻山——湿润的空气沿迎风坡上升，成云下雨，翻过山顶后变干；
// 比较两坡的年降水量。再回到地球仪上看世界的降水分布：赤道、回归线附近的大陆两岸、沿海和内陆。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { globeFacing, globePoint, spinFor } from './globe'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, nameTag, valTag } from './parts'
import { PLACES, RAIN_SPOTS, SLOPE_RAIN, SLOPE_RATIO } from './physics'
import { VOICE } from './voice'
import { FAR, MT, NEAR, SPOT, type Want } from './world'

type Part = 'oro' | 'world'
const TASKS: Task[] = [
  { id: 'wind', text: '让海风吹向大山', note: '湿润的空气沿迎风坡上升，越往上越冷，水汽凝结成云，下起雨来' },
  { id: 'cmp', text: '比较两坡的年降水量', note: '迎风坡约 1450 mm，背风坡只有约 200 mm' },
  { id: 'eq', text: '地球仪上：看赤道附近', note: '赤道附近终年多雨' },
  { id: 'west', text: '看回归线附近大陆的两岸', note: '回归线附近，大陆西岸少雨，东岸多雨' },
  { id: 'inland', text: '比较沿海和内陆', note: '' },
]

export default function Lesson5() {
  const [part, setPart] = useState<Part>('oro')
  const [wind, setWind] = useState(false)
  const [cmp, setCmp] = useState(false)
  const [spot, setSpot] = useState(-1)              // 地球仪上看到第几处
  const [busy, setBusy] = useState(false)
  const T = useTasks('gewu:climate:5', TASKS)
  const blow = () => { if (wind) return; setWind(true); setBusy(true); setTimeout(() => { setBusy(false); T.check(id => id === 'wind') }, 4500) }
  const compare = () => { if (!wind || busy) return; setCmp(true); T.check(id => id === 'cmp') }
  const nextSpot = () => { if (busy || spot >= 2) return; const n = spot + 1; setSpot(n); setBusy(true); setTimeout(() => { setBusy(false); T.check(id => id === RAIN_SPOTS[n].id) }, 2200) }
  const resetAll = () => { setPart('oro'); setWind(false); setCmp(false); setSpot(-1); setBusy(false); T.reset() }

  const task = T.current
  const world = task && ['eq', 'west', 'inland'].includes(task.id)
  const { hint, next }: { hint: string; next: 'wind' | 'cmp' | 'spot' | 'part' | null } = (() => {
    if (!task) return { hint: '都做完了。迎风坡多雨，背风坡少雨。', next: null }
    if (busy) return { hint: part === 'oro' ? '海风沿着迎风坡往上爬，云越积越厚…' : '地球仪转过来…', next: null }
    if (!world && part !== 'oro') return { hint: '换到“地形雨”', next: 'part' }
    if (task.id === 'wind') return { hint: '让海上湿润的风吹向大山', next: 'wind' }
    if (task.id === 'cmp') return { hint: '比较迎风坡和背风坡的年降水量', next: 'cmp' }
    if (part !== 'world') return { hint: '换到“世界分布”，到地球仪上看', next: 'part' }
    return { hint: `转到下一处：${{ eq: '赤道附近', west: '回归线附近大陆的两岸', inland: '沿海和内陆' }[task.id as 'eq']}`, next: 'spot' }
  })()

  const cur = RAIN_SPOTS[Math.max(0, spot)], spin = spinFor(cur.face)
  const labels: Label[] = part === 'oro' ? [
    nameTag('ns', [-560, 30, 120], '海洋'),
    nameTag('nw', [380, 160, 180], '迎风坡', 0.5), nameTag('nl', [960, 170, 180], '背风坡', 0.5),
    valTag('mid', [MT.mid[0] - 10, MT.mid[1] + 40, MT.mid[2]], '迎风坡 · 年降水', `约 ${SLOPE_RAIN.mid} mm`, true, cmp, 1),
    valTag('lee', [MT.lee[0], MT.lee[1] + 50, MT.lee[2]], '背风坡 · 年降水', `约 ${SLOPE_RAIN.lee} mm`, false, cmp, 0),
  ] : spot >= 0 ? cur.places.map((k, i) => valTag(k, globePoint(PLACES[k].at, spin, 1.03), PLACES[k].name, cur.words[i], cur.words[i] === '多雨', !busy && globeFacing(PLACES[k].at, spin), i ? 0 : 1)) : []
  const s = part === 'oro' ? SPOT.profile : SPOT.globe
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title="天气和气候" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={part === 'oro' ? '海风' : '地球仪'}
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...(part === 'oro' ? FAR : NEAR)}
        world={{ mtn: wind ? 1 : 0.12, flow: wind ? 1 : 0, globe: { layer: 'rain', spin } }}>{null}</LabStage>}
      lesson={<LessonBlock no="5" title="降水的分布" concept="迎风坡多雨，背风坡少雨" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>湿润的空气遇到山地，沿<b className="text-white">迎风坡</b>上升，气温降低，水汽凝结成云，形成降水，这就是<b className="text-white">地形雨</b>。空气翻过山顶到了<b className="text-white">背风坡</b>，水汽已经不多，又往下沉，降水就少。</p>
          <p className="mt-2">世界降水的分布：赤道附近降水多，两极地区降水少；南北回归线附近，大陆西岸降水少，东岸降水多；中纬度地区，沿海降水多，内陆降水少。</p>
          <p className="mt-2 text-[13.5px] text-white/65">大山两坡的年降水量是示意数据；地球仪上的降水图是简化的示意图，只画了陆地。</p>
        </>} />}
      finale={T.finale && <Fin kicker="两坡和全世界都看过了" big="迎风坡多雨，背风坡少雨" small="同一座山，迎风坡约 1450 mm，背风坡约 200 mm。世界上，赤道附近多雨；回归线附近大陆西岸少雨、东岸多雨；沿海多雨，内陆少雨。" />}
      panel={
        <Glass className="px-4 py-4">
          {part === 'oro' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">迎风坡 ÷ 背风坡 · 年降水量</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{cmp ? `约 ${SLOPE_RATIO}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">倍</span></div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ParamTile symbol="迎风坡" value={cmp ? `${SLOPE_RAIN.mid} mm` : '—'} unit="山腰，年降水（示意）" />
              <ParamTile symbol="背风坡" value={cmp ? `${SLOPE_RAIN.lee} mm` : '—'} unit="山脚，年降水（示意）" />
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">蓝色的气流是从海上来的湿润空气，翻过山顶后变成橙色：水汽在迎风坡落成了雨，到背风坡已经很干。</p>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">{spot >= 0 ? cur.places.map(k => PLACES[k].name).join(' · ') : '地球仪 · 年降水的多少（示意）'}</div>
              <div className="mt-1 text-[28px] leading-tight font-bold">{spot >= 0 && !busy ? cur.note : '—'}</div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[12.5px] text-white/60"><span>少雨</span><span className="h-2.5 flex-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(214 178 110), rgb(150 190 110), rgb(30 120 150))' }} /><span>多雨</span></div>
            <Rows head={['地方', '降水']} rows={RAIN_SPOTS.slice(0, spot + 1).flatMap(r => r.places.map((k, i) => [PLACES[k].name, r.words[i]]))} />
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'wind'} pulse={next === 'wind'} onClick={blow} disabled={part !== 'oro' || wind}>吹来海风</LabButton>
        <LabButton primary={next === 'cmp'} pulse={next === 'cmp'} onClick={compare} disabled={part !== 'oro' || !wind || busy || cmp}>比较两坡</LabButton>
        <LabButton primary={next === 'spot'} pulse={next === 'spot'} onClick={nextSpot} disabled={part !== 'world' || busy || spot >= 2}>看下一处</LabButton>
      </>}
      extras={
        <Control label="看哪里">
          <Segmented label="看哪里" pulse={next === 'part'} want={next === 'part' ? (world ? 'world' : 'oro') : null} value={part} onChange={v => { if (!busy) setPart(v as Part) }} disabled={busy} options={[{ value: 'oro', label: '地形雨' }, { value: 'world', label: '世界分布' }]} />
        </Control>
      }
    />
  )
}
