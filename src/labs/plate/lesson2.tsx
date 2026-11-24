// 板块运动 · 第 2 课 海底扩张：大西洋中脊。岩浆从中脊涌上来，冷却成新的洋底，往两侧推开；
// 开钻探船到中脊两侧取岩芯，读岩石的年龄：离中脊越远越老，两侧对称。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { DrillShip } from './fx'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { DRILL, HALF_RATE, ageText, rockAge, spreadKm, type DrillKey } from './physics'
import { X, heightAt, NOW } from './shape'
import { VOICE } from './voice'
import { DAYLIGHT, SPOT, type Want } from './world'

const TASKS: Task[] = [
  { id: 'spread', text: '让洋中脊扩张 800 万年', note: '岩浆从中脊涌出，冷却成新的洋底，往两侧推开' },
  { id: 'w60', text: '在中脊西边 60 km 钻取岩芯', note: '这里的岩石约 400 万年' },
  { id: 'e60', text: '到东边 60 km 再钻一次', note: '和西边同样远，年龄也一样：两侧对称' },
  { id: 'e120', text: '到东边 120 km 再钻一次', note: '远一倍，老一倍：离中脊越远，岩石越老' },
]
const SITES = Object.keys(DRILL) as DrillKey[]
/** 中脊附近，1 个画面单位画 3 km */
const KM = 3
const SPREAD_MYR = 8
const siteX = (k: DrillKey) => X.ridge + DRILL[k].d / KM
interface Row { k: DrillKey; age: number }

export default function Lesson2() {
  const [goal, setGoal] = useState(0)                       // 扩张了多少百万年（目标）
  const myr = useSlide(goal, SPREAD_MYR / 6), spreading = Math.abs(myr - goal) > 1e-3
  const [site, setSite] = useState<DrillKey>('w60')
  const [drill, setDrill] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:plate:2', TASKS)
  const floor = heightAt(siteX(site), -3.2, NOW, 8848.86)
  const pipe = useSlide(drill ? -floor + 0.8 : 0, 3.2)
  const [shipGoal, setShipGoal] = useState(siteX('w60'))
  useEffect(() => { if (!drill && pipe < 0.02) setShipGoal(siteX(site)) }, [site, drill, pipe])
  const shipX = useSlide(shipGoal, 14), sailing = Math.abs(shipX - siteX(site)) > 0.02
  const cored = drill && pipe >= -floor + 0.79
  const dup = rows.some(r => r.k === site)
  useEffect(() => { if (!spreading && goal === SPREAD_MYR) T.check(id => id === 'spread') }, [spreading, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cored || dup) return
    const next = [...rows, { k: site, age: rockAge(DRILL[site].d) }]; setRows(next)
    T.check(id => next.some(r => r.k === id))
  }, [cored])   // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k: DrillKey) => { setDrill(false); setSite(k) }
  const resetAll = () => { setGoal(0); setSite('w60'); setDrill(false); setRows([]); setShipGoal(siteX('w60')); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'spread' | 'site' | 'drill' | null } = (() => {
    if (!task) return { hint: '都做完了。离中脊越远，岩石越老，两侧对称。', next: null }
    if (task.id === 'spread') return spreading ? { hint: '岩浆不断涌出，新的洋底往两侧推开…', next: null } : { hint: '让洋中脊扩张 800 万年', next: 'spread' }
    if (site !== task.id) return { hint: `把钻探船开到${DRILL[task.id as DrillKey].name}`, next: 'site' }
    if (sailing || (!drill && pipe > 0.02)) return { hint: '钻探船开过去…', next: null }
    if (!drill) return { hint: '放下钻杆，钻取洋底的岩芯', next: 'drill' }
    return { hint: '钻杆往下放，钻进洋壳…', next: null }
  })()

  const age = rockAge(DRILL[site].d), sx = siteX(site), newKm = spreadKm(myr)
  const labels: Label[] = [
    { id: 'core', at: [sx, floor - 1.2, 0.5], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: cored ? 1 : 0 }, children: <><small>岩芯</small>约 {ageText(age)}</> },
    { id: 'ridge', at: [X.ridge, -1.2, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '大西洋中脊' },
    { id: 'mag', at: [X.ridge + 3, -8.5, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '岩浆从地幔涌上来' },
    { id: 'oc', at: [X.ridge - 44, -5.9, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '洋壳' },
    { id: 'lm', at: [X.ridge - 44, -9, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '岩石圈' },
    { id: 'as', at: [X.ridge - 30, -15.5, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '软流层' },
    { id: 'ship', at: [shipX, 5.4, -3.2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '大洋钻探船' },
  ]
  const s = SPOT.ridge
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="板块运动" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="洋中脊和钻探船"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...DAYLIGHT} world={{ ridgeT: myr * HALF_RATE * 10 / KM, stripes: goal > 0 || myr > 0 ? 1 : 0 }}>
        <DrillShip x={shipX} pipe={pipe} />
        {spreading && [-1, 1].map(d => <ForceArrow key={d} tip={[X.ridge + d * 22, -1.4, 0.4]} dir={[d, 0, 0]} len={8} color="#ffe9a8" thick={1.6} />)}
      </LabStage>}
      lesson={<LessonBlock no="2" title="海底扩张" concept="洋中脊处不断长出新的洋底" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>大洋中间有一条绵延的海底山脉，叫<b className="text-white">洋中脊</b>。地幔里的岩浆从这里涌上来，冷却后变成新的洋底，把两侧较老的洋底往外推。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">越远越老：</b>离洋中脊越远的岩石，形成得越早</li>
            <li><b className="text-[#7fe3d4]">两侧对称：</b>离中脊一样远的地方，岩石年龄一样</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这就是海底扩张。大洋中脊附近的岩石年轻，靠近大陆的洋底最老，也只有约 2 亿年。画面里的条带表示同一时期形成的岩石，示意，不按比例。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三处岩芯都取到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">离洋中脊越远，岩石越老，两侧对称</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">新的洋底在洋中脊生成，再往两侧推开：海底在扩张。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{DRILL[site].name} 的岩芯年龄</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{cored ? Math.round(age * 100) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">万年</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="d" value={String(Math.abs(DRILL[site].d))} unit="km · 离中脊" />
            <ParamTile symbol="v" value={String(HALF_RATE)} unit="cm/年 · 每侧推开" />
          </div>
          <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">年龄 = d ÷ v = {Math.abs(DRILL[site].d)} km ÷ {HALF_RATE} cm/年 ≈ <b className="text-white">{ageText(age)}</b></p>
          <p className="mt-2 text-[13px] text-white/55">已扩张 {Math.round(myr * 100)} 万年，每侧新长出约 {Math.round(newKm)} km</p>
          <h2 className="mt-5 text-[12.5px] text-white/55">岩芯记录</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">钻到洋壳就记下一个岩芯。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">地点</th><th className="text-right font-normal">离中脊</th><th className="text-right font-normal">年龄</th></tr></thead>
                <tbody>{rows.map(r => <tr key={r.k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{DRILL[r.k].name}</td><td className="text-right">{Math.abs(DRILL[r.k].d)} km</td><td className={`text-right font-semibold ${T.finale ? 'text-[#7fe3d4]' : ''}`}>{ageText(r.age)}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'spread'} pulse={next === 'spread'} onClick={() => setGoal(SPREAD_MYR)} disabled={spreading || goal === SPREAD_MYR}>扩张 800 万年</LabButton>
        <LabButton primary={next === 'drill'} pulse={next === 'drill'} onClick={() => setDrill(true)} disabled={drill || sailing || goal < SPREAD_MYR || spreading || pipe > 0.02}>钻取岩芯</LabButton>
      </>}
      extras={
        <Control label="钻探地点">
          <Segmented label="钻探地点" pulse={next === 'site'} want={next === 'site' ? (task?.id as DrillKey) : null} value={site} onChange={k => choose(k as DrillKey)} disabled={spreading} options={SITES.map(k => ({ value: k, label: DRILL[k].name }))} />
        </Control>
      }
    />
  )
}
