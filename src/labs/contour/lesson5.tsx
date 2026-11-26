// 等高线地形图 · 第 5 课 山脊和山谷：看等高线往哪边弯；在山脊和山谷上各下一场雨，看水往哪里流。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { OnLand, Rain, Trail } from './marks'
import { RIDGE_LINE, VALLEY_LINE, Y, crossOnLine, levels, rainOn, rainSummary } from './physics'

type Where = 'ridge' | 'valley'
const NAME: Record<Where, string> = { ridge: '山脊', valley: '山谷' }
const RS = rainSummary('ridge'), VS = rainSummary('valley')
const TASKS: Task[] = [
  { id: 'ridgeLine', text: '在山脊上画出脊线，看等高线往哪边弯', note: '等高线从高处向低处凸出：这是山脊' },
  { id: 'ridgeRain', text: '在山脊上下一场雨', note: `${RS.total} 滴雨分别流向东西两侧：山脊是分水岭` },
  { id: 'valleyLine', text: '换到山谷，画出谷线', note: '等高线从低处向高处凸出：这是山谷' },
  { id: 'valleyRain', text: '在山谷里下一场雨', note: `${VS.river} 滴雨都汇到谷底的河里` },
]
const LINES = levels(100, 1600)
/** 加亮的几条线：山脊处和山谷处各三条 */
const GLOW: Record<Where, number[]> = { ridge: [500, 700, 900], valley: [200, 300, 400] }
const LINE: Record<Where, [number, number][]> = { ridge: RIDGE_LINE, valley: VALLEY_LINE }
const COLOR: Record<Where, string> = { ridge: '#ff9f6b', valley: '#7fd6ff' }

export default function Lesson5() {
  const [where, setWhere] = useState<Where>('ridge')
  const [drawn, setDrawn] = useState<Where[]>([])
  const [rained, setRained] = useState<Where[]>([])
  const [raining, setRaining] = useState(false)
  const T = useTasks('gewu:contour:5', TASKS)
  const run = useSlide(raining || rained.includes(where) ? 1 : 0, 0.3)
  const paths = useMemo(() => ({ ridge: rainOn('ridge'), valley: rainOn('valley') }), [])
  useEffect(() => { if (raining && run >= 1) { setRaining(false); const n = [...rained, where]; setRained(n); T.check(id => id === `${where}Rain`) } }, [run, raining])   // eslint-disable-line react-hooks/exhaustive-deps
  const draw = () => { if (drawn.includes(where)) return; setDrawn(d => [...d, where]); T.check(id => id === `${where}Line`) }
  const rain = () => { if (raining || rained.includes(where)) return; setRaining(true) }
  const resetAll = () => { setWhere('ridge'); setDrawn([]); setRained([]); setRaining(false); T.reset() }

  const task = T.current
  const want = task ? (task.id.startsWith('ridge') ? 'ridge' : 'valley') as Where : where
  const { hint, next }: { hint: string; next: 'where' | 'draw' | 'rain' | null } = (() => {
    if (!task) return { hint: '都做完了。山脊的等高线凸向低处，山谷的凸向高处。', next: null }
    if (raining) return { hint: '下着雨：看雨水往哪边流', next: null }
    if (where !== want) return { hint: `换到“${NAME[want]}”`, next: 'where' }
    if (task.id.endsWith('Line')) return { hint: where === 'ridge' ? '画出脊线：沿着山脊最高处的那条线' : '画出谷线：沿着山谷最低处的那条线', next: 'draw' }
    return { hint: where === 'ridge' ? '在山脊上下一场雨' : '在山谷里下一场雨', next: 'rain' }
  })()

  const tips: Label[] = (['ridge', 'valley'] as Where[]).flatMap(w => drawn.includes(w) ? GLOW[w].flatMap((lv): Label[] => { const p = crossOnLine(LINE[w], lv); return p ? [{ id: `${w}${lv}`, at: [p[0], Y(lv) + 0.5, p[1]], ax: 0.5, className: `scene-tag -translate-y-full${w === where ? ' key' : ''}`, children: `${lv}` }] : [] }) : [])
  const mid = (w: Where) => LINE[w][Math.floor(LINE[w].length / 2)]
  const labels: Label[] = [
    ...tips,
    { id: 'nr', at: [mid('ridge')[0] - 1.5, Y(650), mid('ridge')[1]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '山脊' },
    { id: 'nv', at: [mid('valley')[0] + 1.5, Y(150), mid('valley')[1]], name: true, className: 'scene-name -translate-y-1/2', children: '山谷' },
  ]
  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={NAME[where]}
      stage={<Spot at={where} labels={labels} want={{ lines: LINES, glow: drawn.includes(where) ? GLOW[where] : [] }}>
        <OnLand lift={0}>{(['ridge', 'valley'] as Where[]).map(w => drawn.includes(w) && <Trail key={w} pts={LINE[w]} color={COLOR[w]} width={5} dash drape={0.25} />)}</OnLand>
        {(raining || rained.includes(where)) && <Rain key={where} paths={paths[where]} run={run} />}
      </Spot>}
      lesson={<LessonBlock no="5" title="山脊和山谷" concept="山脊的等高线凸向低处，山谷的凸向高处" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">山脊</b>：从山顶伸出的长条形高地，等高线<b className="text-white">从高处向低处凸出</b>。脊线两侧的雨水流向两边，山脊常常是<b className="text-white">分水岭</b>。</p>
          <p className="mt-2"><b className="text-white">山谷</b>：两条山脊之间的低洼部分，等高线<b className="text-white">从低处向高处凸出</b>。雨水汇到谷底，容易形成河流，谷线往往就是河道。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">山脊上的雨流向两侧，山谷里的雨 {VS.river} 滴都汇进了河里</p>
        <p className="mt-1 text-[14px] text-white/70">山脊的等高线凸向低处，是分水岭；山谷的等高线凸向高处，常有河流。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{where === 'ridge' ? '山脊上的雨 · 流向两侧的' : '山谷里的雨 · 汇进河里的'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{rained.includes(where) ? (where === 'ridge' ? RS.east + RS.west : VS.river) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">/ {where === 'ridge' ? RS.total : VS.total} 滴</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="弯曲处" value={drawn.includes(where) ? (where === 'ridge' ? '凸向低处' : '凸向高处') : '—'} unit={where === 'ridge' ? '沿脊线看' : '沿谷线看'} />
            <ParamTile symbol="等高距" value="100" unit="m" />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/55">加亮的几条线：看它们弯尖指向的那一侧，数值是更高还是更低。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'draw'} onClick={draw} disabled={drawn.includes(where)}>{where === 'ridge' ? '画出脊线' : '画出谷线'}</LabButton>
        <LabButton primary pulse={next === 'rain'} onClick={rain} disabled={raining || rained.includes(where) || !drawn.includes(where)}>下一场雨</LabButton>
      </>}
      extras={<Control label="看哪里"><Segmented label="看哪里" pulse={next === 'where'} want={next === 'where' ? want : null} value={where} disabled={raining} onChange={setWhere} options={(['ridge', 'valley'] as Where[]).map(w => ({ value: w, label: NAME[w] }))} /></Control>}
    />
  )
}
