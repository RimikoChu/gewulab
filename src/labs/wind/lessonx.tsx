// 热力环流和风 · 拓展课 工厂建在哪：入夜的城市比郊区暖，城市热岛环流在城区上空转圈。
// 先看清城市风，再把有烟囱的工厂建在近郊、远郊各点一次火：近郊的烟下沉后被城市风吹回城里，远郊的不会。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Slab, Streams, loop } from './air'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, noteTag } from './parts'
import { ISLAND_R, PLACES, SITES, islandWind, smokeToCity, type SiteKey } from './physics'
import { VOICE } from './voice'
import { CHIMNEY_H, P, SPOT, ZH, ground, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'loop', text: '入夜，看城市的热岛环流', note: '近地面的风从郊区吹向城区，在郊区上空下沉' },
  { id: 'near', text: '把工厂建在近郊，点火', note: '烟在近郊下沉，又被城市风吹回了城里' },
  { id: 'far', text: '把工厂搬到远郊，再点火', note: '远郊在城市风的范围以外，烟不进城' },
]
const XC = -23, Z = ZH + 0.35, DAY = 0.06
const wind = (x: number, y: number) => { const [vx, vy] = islandWind(x - XC, y); return [vx, vy, 0] as [number, number, number] }

export default function LessonX() {
  const [shown, setShown] = useState(false)
  const [site, setSite] = useState<SiteKey>('near')
  const [fire, setFire] = useState(false)
  const T = useTasks('gewu:wind:x', TASKS)
  useEffect(() => { if (!shown) return; const t = setTimeout(() => T.check(id => id === 'loop'), 2600); return () => clearTimeout(t) }, [shown])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!fire) return; const t = setTimeout(() => T.check(id => id === site), 9000); return () => clearTimeout(t) }, [fire, site])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: SiteKey) => { setSite(k); setFire(false) }
  const resetAll = () => { setShown(false); pick('near'); T.reset() }

  const task = T.current
  const want: SiteKey | null = task?.id === 'far' ? 'far' : task?.id === 'near' ? 'near' : null
  const { hint, next }: { hint: string; next: 'show' | 'site' | 'fire' | null } = (() => {
    if (!task) return { hint: '都做完了。工厂要建在城市风的范围以外。', next: null }
    if (!shown) return { hint: '夜里的城市比郊区暖。看看城市上空的空气怎样转', next: 'show' }
    if (task.id === 'loop') return { hint: '城区的空气在上升…', next: null }
    if (want && site !== want) return { hint: `把工厂搬到${SITES[want].name}`, next: 'site' }
    if (!fire) return { hint: `工厂在${SITES[site].name}。点火，看烟往哪里飘`, next: 'fire' }
    return { hint: `烟从${SITES[site].name}的烟囱冒出来…`, next: null }
  })()

  const plant = SITES[site].d - SITES.near.d, cx = P.chimney[0] + plant
  const field = (u: number, v: number) => { const x = -66 + u * 84, y = v * 26; return (Math.exp(-(((x - XC) / 14) ** 2)) * 1.1 - 0.35) * Math.exp(-y / 14) - 0.1 * v }
  const labels: Label[] = [
    noteTag('city', [XC, ground(XC, ZH) + 2.2, Z], `城区 ${PLACES.city.night[0]} ℃`),
    noteTag('sub', [XC - ISLAND_R + 6, 2.2, Z], `郊区 ${PLACES.city.night[1]} ℃`),
    noteTag('r1', [XC + ISLAND_R, 25, Z], '城市风的范围', shown, 0.5),
    { id: 'ch', at: [cx + 1.2, ground(cx, P.chimney[2]) + CHIMNEY_H + 1, P.chimney[2]], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: 1 }, children: <><small>工厂</small>{SITES[site].name}</> },
    noteTag('res', [XC + 10, 12, Z], smokeToCity(site) ? '烟被吹回城里' : '烟不进城', fire && T.done[site] === true, 0.5),
  ]
  const s = SPOT.wide
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="热力环流和风" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="工厂"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(DAY)}
        world={{ day: DAY, plant, smoke: { on: fire ? 1 : 0, wind }, heat: [{ x0: -41, x1: -5, v: 0.85 }, { x0: -64, x1: -42, v: -0.3 }, { x0: -4, x1: 18, v: -0.3 }] }}>
        <Slab x0={-66} x1={18} y0={1} y1={27} z={ZH + 0.25} field={field} fieldKey="island" amount={shown ? 1 : 0.3} tint={0.06} />
        <Streams streams={[loop(XC - ISLAND_R, XC, 1.8, 22, Z, false, 'right'), loop(XC, XC + ISLAND_R, 1.8, 22, Z, true, 'left')]} on={shown ? 1 : 0} speed={3} per={0.7} size={2.1} />
      </LabStage>}
      lesson={<LessonBlock no="拓展" title="工厂建在哪" concept="工厂要建在城市风的范围以外" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>城区比郊区暖，城区空气上升，近地面形成低压；郊区空气在城市风的外缘下沉，近地面的风从郊区吹向城区，这就是城市热岛环流，夜里更明显。</p>
          <p className="mt-2">把有污染的工厂建在近郊下沉气流的地方，烟尘会被近地面的城市风带回城里。所以这类工厂应建在城市风的范围以外；绿化带则适合布置在城市风下沉的地方，帮城区净化空气。</p>
          <p className="mt-2 text-[13.5px] text-white/65">城市风的范围和风的快慢是示意的。</p>
        </>} />}
      finale={T.finale && <Fin kicker="近郊、远郊都试过了" big="工厂要建在城市风的范围以外" small="建在近郊，烟在下沉气流里落到近地面，又被城市风吹回城里；搬到城市风的范围以外，烟就不会进城。" />}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="城区" value={`${PLACES.city.night[0]} ℃`} unit="夜里" />
            <ParamTile symbol="郊区" value={`${PLACES.city.night[1]} ℃`} unit="夜里" />
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-white/80">{fire ? (smokeToCity(site) ? `工厂在${SITES[site].name}，在城市风的范围以内：烟下沉以后被吹进城区。` : `工厂在${SITES[site].name}，在城市风的范围以外：烟顺着背景风飘走了。`) : '工厂还没点火。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'show'} pulse={next === 'show'} onClick={() => setShown(true)} disabled={shown}>看城市风</LabButton>
        <LabButton primary={next === 'fire'} pulse={next === 'fire'} onClick={() => setFire(true)} disabled={!T.done.loop || fire}>点火</LabButton>
      </>}
      extras={
        <Control label="工厂建在">
          <Segmented label="工厂建在" pulse={next === 'site'} want={want} value={site} onChange={k => pick(k as SiteKey)} disabled={!T.done.loop} options={(Object.keys(SITES) as SiteKey[]).map(k => ({ value: k, label: SITES[k].name }))} />
        </Control>
      }
    />
  )
}
