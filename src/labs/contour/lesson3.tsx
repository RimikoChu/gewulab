// 等高线地形图 · 第 3 课 等高线疏密和坡度：从同样的海拔出发，沿西坡和东坡各爬一次 A 峰，再压平成地图比一比两边的线。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { AtPoint, OnLand, Trail } from './marks'
import { ROUTES, START, TOP_A, Y, altitude, climb, height, levels, routeAt, type RouteKey } from './physics'

const KEYS = Object.keys(ROUTES) as RouteKey[]
const TASKS: Task[] = [
  { id: 'west', text: `从海拔 ${START} m 处沿西坡爬到山顶`, note: `西坡走了 ${climb('west').km} km，升高 ${climb('west').rise} m` },
  { id: 'east', text: '换到东坡，从同样的海拔再爬一次', note: `东坡只走了 ${climb('east').km} km，就升高了同样的 ${climb('east').rise} m` },
  { id: 'map', text: '压平成地图，比一比两边等高线的疏密', note: '西坡的线稀，东坡的线密' },
]
const COLOR: Record<RouteKey, string> = { west: '#0fa392', east: '#f0662a' }
const LINES = levels(100, altitude(TOP_A))

export default function Lesson3() {
  const [route, setRoute] = useState<RouteKey>('west')
  const [done, setDone] = useState<RouteKey[]>([])
  const [going, setGoing] = useState(false)
  const [flat, setFlat] = useState(false)
  const T = useTasks('gewu:contour:3', TASKS)
  // 爬山：东西两边都用 3 秒走完（快慢不代表真实用时）
  const t = useSlide(going || done.includes(route) ? 1 : 0, 0.34)
  useEffect(() => { if (going && t >= 1) { setGoing(false); setDone(d => d.includes(route) ? d : [...d, route]); T.check(id => id === route) } }, [t, going])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!flat) return; const k = setTimeout(() => T.check(id => id === 'map'), 1900); return () => clearTimeout(k) }, [flat])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = () => { if (going || done.includes(route)) return; setGoing(true) }
  const resetAll = () => { setRoute('west'); setDone([]); setGoing(false); setFlat(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'route' | 'go' | 'map' | null } = (() => {
    if (!task) return { hint: '都做完了。等高线密集的地方坡陡，稀疏的地方坡缓。', next: null }
    if (going) return { hint: '正在往上爬…', next: null }
    if (task.id === 'map') return flat ? { hint: '正在压平…', next: null } : { hint: '两条路都爬过了：压平成地图，比一比两边的线', next: 'map' }
    if (route !== task.id) return { hint: `换到“${ROUTES[task.id as RouteKey].name}”`, next: 'route' }
    return { hint: '沿这条路爬到山顶', next: 'go' }
  })()

  const c = climb(route), [hx, hz] = routeAt(route, t)
  const labels: Label[] = [
    ...KEYS.map((k): Label => { const [x, z] = ROUTES[k].from; return { id: `s${k}`, at: [x, Y(START) * (flat ? 0.006 : 1) + 0.4, z], ax: 0.5, className: `scene-tag -translate-y-full${route === k ? ' key' : ''}`, children: `${ROUTES[k].name} · 从 ${START} m 出发` } }),
    { id: 'top', at: [TOP_A[0], Y(altitude(TOP_A)) * (flat ? 0.006 : 1) + 0.8, TOP_A[1]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `A 峰山顶 ${altitude(TOP_A)} m` },
  ]
  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="登山"
      stage={<Spot at={flat ? 'slopeMap' : 'slope'} labels={labels} want={{ flat, lines: LINES }}>
        <OnLand>{KEYS.map(k => <Trail key={k} pts={[ROUTES[k].from, TOP_A]} color={COLOR[k]} width={route === k ? 6 : 4} dash={!done.includes(k)} opacity={route === k ? 1 : 0.75} drape={0.15} />)}</OnLand>
        {(going || done.includes(route)) && <AtPoint x={hx} z={hz} h={height(hx, hz)} up={0.3}><mesh renderOrder={12}><sphereGeometry args={[0.35, 18, 14]} /><meshBasicMaterial color={COLOR[route]} toneMapped={false} depthTest={false} transparent /></mesh></AtPoint>}
      </Spot>}
      lesson={<LessonBlock no="3" title="疏密和坡度" concept="等高线密集坡陡，稀疏坡缓" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在同一幅等高线地形图上，等高距是一样的。升高同样的高度，水平距离越短，坡越陡。</p>
          <p className="mt-2">所以<b className="text-white">等高线越密集，坡越陡</b>；<b className="text-white">等高线越稀疏，坡越缓</b>。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">同样升高 {c.rise} m：西坡走 {climb('west').km} km，东坡只走 {climb('east').km} km</p>
        <p className="mt-1 text-[14px] text-white/70">东坡陡，地图上那一边的等高线挤在一起；西坡缓，线隔得开。等高线密集坡陡，稀疏坡缓。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{ROUTES[route].name} · 每走 100 m 升高</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{done.includes(route) ? c.per100 : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="水平距离" value={done.includes(route) ? c.km.toFixed(1) : '—'} unit="km" />
            <ParamTile symbol="升高" value={String(c.rise)} unit="m" />
            <ParamTile symbol="穿过等高线" value={String(c.lines)} unit="条 · 等高距 100 m" />
            <ParamTile symbol="平均间隔" value={done.includes(route) ? String(c.gap) : '—'} unit="m · 相邻两条" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {done.length === 0 ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">爬完一条路，数据记在这里。</p>
            : <table className="mt-1 w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">路线</th><th className="text-right font-normal">水平距离</th><th className="text-right font-normal">线的间隔</th></tr></thead>
              <tbody>{done.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{ROUTES[k].name}</td><td className="text-right tabular-nums">{climb(k).km.toFixed(1)} km</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{climb(k).gap} m</td></tr>)}</tbody>
            </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={go} disabled={going || done.includes(route)}>沿这条路爬</LabButton>
        <LabButton primary pulse={next === 'map'} onClick={() => setFlat(f => !f)} disabled={going || done.length < 2}>{flat ? '把山立起来' : '压平成地图'}</LabButton>
      </>}
      extras={<Control label="走哪条路"><Segmented label="走哪条路" pulse={next === 'route'} want={next === 'route' ? task!.id as RouteKey : null} value={route} disabled={going} onChange={setRoute} options={KEYS.map(k => ({ value: k, label: ROUTES[k].name }))} /></Control>}
    />
  )
}
