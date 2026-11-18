// 浮力 · 第 6 课 钢铁变成船（排水量、满载线、从江里开到海里）
import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import Scene6 from './scene6'
import { LESSONS, goLesson } from './lessons'
import { BARGE, FULL6, G, PLATE_V, WATERS, kN, solve6, ton, type WaterKey } from './physics'

type Mode = 'plate' | 'barge'
interface Now { mode: Mode; boxes: number; water: WaterKey; sunk: boolean }
const TASKS: (Task & { ok: (s: Now) => boolean })[] = [
  { id: 'plate', text: '把 60 吨钢板放进水里', note: '钢比水密得多：钢板排开的水太少，沉了', ok: s => s.mode === 'plate' && s.sunk },
  { id: 'barge', text: '换成同样 60 吨的空驳船', note: '做成空心的：能排开 60 m³ 的水，浮住了', ok: s => s.mode === 'barge' },
  { id: 'full', text: '装货，装到满载线', note: '满载排水量 240 吨：船 60 吨，货 180 吨', ok: s => s.mode === 'barge' && s.water === 'river' && s.boxes === FULL6 },
  { id: 'sea', text: '满载的船从江里开到海里', note: '浮力没变，海水更密，排开的水少了：船浮起来一点', ok: s => s.mode === 'barge' && s.water === 'sea' && s.boxes === FULL6 },
]
const KEY = 'gewu:float:6'

export default function Lesson6() {
  const [mode, setMode] = useState<Mode>('plate')
  const [boxes, setBoxes] = useState(0)
  const [water, setWater] = useState<WaterKey>('river')
  const [sink, setSink] = useState(0)                 // 钢板下沉的进度：0 还在水面上方，1 沉到看不见
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  const r = useMemo(() => solve6(boxes, water), [boxes, water])

  // 钢板：按下按钮后落进水里，三秒左右沉到看不见
  const raf = useRef(0)
  const dropPlate = () => {
    cancelAnimationFrame(raf.current); let p = 0, last = performance.now()
    const frame = (now: number) => { p = Math.min(1, p + (now - last) / 3200); last = now; setSink(p); if (p < 1) raf.current = requestAnimationFrame(frame) }
    raf.current = requestAnimationFrame(frame)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const pick = (m: Mode) => { cancelAnimationFrame(raf.current); setSink(0); setMode(m) }
  const load = (d: number) => setBoxes(n => Math.min(BARGE.maxBoxes, Math.max(0, n + d)))

  const now: Now = { mode, boxes, water, sunk: sink >= 1 }
  const sig = `${mode}|${boxes}|${water}|${now.sunk}`
  useEffect(() => {
    const hit = TASKS.find(t => !done[t.id] && t.ok(now)); if (!hit) return
    const t = setTimeout(() => {
      const d = { ...done, [hit.id]: true }
      setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
      if (TASKS.every(x => d[x.id])) setFinale(true); else setBanner(hit.note)
    }, 900)
    return () => clearTimeout(t)
  }, [sig, done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3800); return () => clearTimeout(t) }, [banner])
  const resetAll = () => { pick('plate'); setBoxes(0); setWater('river'); setDone({}); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }

  // ---------- 下一步该做什么 ----------
  const task = TASKS.find(t => !done[t.id])
  const { hint, next }: { hint: string; next: 'drop' | 'mode' | 'plus' | 'minus' | 'water' | null } = (() => {
    if (!task) return { hint: '都做完了。再多装几箱，看满载线没进水里会怎样。', next: null }
    if (task.id === 'plate') return mode !== 'plate' ? { hint: '先换回钢板', next: 'mode' } : sink > 0 ? { hint: '看它沉下去…', next: null } : { hint: '按“放进水里”，看 60 吨的钢板会怎样', next: 'drop' }
    if (mode !== 'barge') return { hint: '同样 60 吨的钢，换成一艘空驳船', next: 'mode' }
    if (task.id === 'full' && water !== 'river') return { hint: '先回到江水里', next: 'water' }
    if (boxes !== FULL6) return boxes > FULL6 ? { hint: '超载了：卸掉几箱，让白色的满载线露出水面', next: 'minus' } : { hint: `装集装箱，装到白色的满载线刚好贴着水面（已装 ${boxes} 箱）`, next: 'plus' }
    return task.id === 'sea' && water !== 'sea' ? { hint: '把船开到海里：水域换成海水', next: 'water' } : { hint: '看吃水怎么变…', next: null }
  })()

  const plateBuoy = WATERS[water].rho * G * PLATE_V
  const barge = mode === 'barge'
  return (
    <LabShell title="浮力" lessons={LESSONS} current="6" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      actionsLabel={barge ? '装货（每箱 20 吨）' : '钢板'}
      stage={<Scene6 mode={mode} r={r} boxes={boxes} water={water} sink={sink} />}
      lesson={
        <LessonBlock no="6" title="钢铁变成船" concept="做成空心的，就能排开更多的水" tasks={TASKS} done={done} current={task?.id}
          theory={<>
            <p>钢的密度是水的将近 8 倍，实心的钢一定会沉。把它做成<b className="text-white">空心的船</b>，能排开的水多了很多，浮力就够托住它。</p>
            <p className="my-3 rounded-xl bg-white/8 py-3 text-center font-formula text-[19px] text-white italic">漂浮：F<sub>浮</sub> = G<sub>总</sub></p>
            <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">排水量：</b>船满载时排开的水的质量，等于船和货的总质量</li>
              <li><b className="text-[#ffd27a]">从江到海：</b>浮力不变，海水更密，船会浮起来一些</li>
              <li><b className="text-white">潜水艇：</b>体积不变、浮力不变，靠水舱进水和排水改变自己的重力来下潜和上浮（第 5 课的压载箱就是这个道理）</li>
            </ul>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">钢板沉了，钢船浮着</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">做成空心，排开更多的水</p>
          <p className="mt-2 font-formula text-[19px] italic text-white/85">漂浮：F<sub>浮</sub> = G<sub>总</sub></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">货装得越多，船吃水越深；装到满载线，排开的水正好和船加货一样重。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再装几箱试试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {barge ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">排开的水有多重</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{ton(r.mass)}<span className="ml-1 text-[16px] font-medium text-white/55">吨</span></div>
              <div className="mt-2 text-[13px] text-white/55">= 船 60 吨 + 货 {ton(r.cargo)} 吨</div>
            </div>
            <div className={cn('mt-4 rounded-xl px-3 py-2.5 text-center text-[14px] font-semibold', r.over ? 'bg-[#d6332b]/25 text-[#ff9c95]' : boxes === FULL6 && water === 'river' ? 'bg-[#35c7b3]/20 text-[#7fe3d4]' : 'bg-white/8 text-white/80')}>
              {r.over ? `超载：吃水 ${r.draft.toFixed(2)} m，超过满载线 ${BARGE.line} m` : `吃水 ${r.draft.toFixed(2)} m，离满载线还有 ${(BARGE.line - r.draft).toFixed(2)} m`}
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol={<>ρ<sub>液</sub></>} value={(r.rho / 1000).toFixed(2)} unit="×10³ kg/m³" />
              <ParamTile symbol={<>V<sub>排</sub></>} value={r.vDisp.toFixed(1)} unit="m³" />
              <ParamTile symbol={<>F<sub>浮</sub></>} value={kN(r.fBuoy).replace(/\.\d+$/, '')} unit="kN · 等于 G总" />
            </div>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">
              <i>V<sub>排</sub></i> = <i>m<sub>总</sub></i> ÷ <i>ρ<sub>液</sub></i> = {ton(r.mass)}×10³ ÷ {(r.rho / 1000).toFixed(2)}×10³ = <b className="text-white">{r.vDisp.toFixed(1)} m³</b>
            </p>
            <p className="mt-2 font-formula text-[15px] leading-relaxed text-white/70">吃水 = <i>V<sub>排</sub></i> ÷ (长 × 宽) = {r.vDisp.toFixed(1)} ÷ ({BARGE.L} × {BARGE.B}) = <b className="text-white">{r.draft.toFixed(2)} m</b></p>
          </> : <>
            <div className="pop text-center text-[34px] leading-none font-bold" style={{ color: sink > 0 ? '#ffb394' : '#ffffff' }}>{sink >= 1 ? '沉了' : sink > 0 ? '下沉中' : '60 吨钢板'}</div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <div><div className="font-formula text-[18px] italic text-white/65">F<sub>浮</sub></div><div className="text-[30px] leading-none font-bold tabular-nums">{Math.round(plateBuoy / 1000)}<span className="ml-1 text-[13px] font-medium text-white/55">kN</span></div><div className="mt-1 text-[12px] text-white/45">完全浸没时</div></div>
              <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xl font-bold">&lt;</span>
              <div><div className="font-formula text-[18px] italic text-white/65">G</div><div className="text-[30px] leading-none font-bold tabular-nums">{Math.round(BARGE.empty * G / 1000)}<span className="ml-1 text-[13px] font-medium text-white/55">kN</span></div><div className="mt-1 text-[12px] text-white/45">60 吨</div></div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol={<>ρ<sub>钢</sub></>} value="7.85" unit="×10³ kg/m³" />
              <ParamTile symbol={<>ρ<sub>液</sub></>} value={(WATERS[water].rho / 1000).toFixed(2)} unit="×10³ kg/m³" />
              <ParamTile symbol={<>V<sub>排</sub></>} value={PLATE_V.toFixed(2)} unit="m³ · 最多" />
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/65">60 吨钢轧成钢板，体积只有 {PLATE_V.toFixed(2)} m³，最多排开这么多水，托不住自己。</p>
          </>}
        </Glass>
      }
      actions={barge ? <>
        <LabButton onClick={() => load(-1)} disabled={boxes <= 0} pulse={next === 'minus'}><Minus className="size-4" />卸一箱</LabButton>
        <LabButton onClick={() => load(1)} disabled={boxes >= BARGE.maxBoxes} pulse={next === 'plus'}><Plus className="size-4" />装一箱</LabButton>
        <LabButton primary onClick={() => setBoxes(FULL6)} disabled={boxes === FULL6}>装到满载</LabButton>
      </> : <>
        <LabButton primary pulse={next === 'drop'} onClick={dropPlate} disabled={sink > 0}>放进水里</LabButton>
        <LabButton onClick={() => { cancelAnimationFrame(raf.current); setSink(0) }} disabled={sink === 0}>再来一次</LabButton>
      </>}
      extras={<>
        <Control label="同样是 60 吨钢">
          <Segmented label="形状" pulse={next === 'mode'} value={mode} onChange={pick} options={[{ value: 'plate', label: '钢板' }, { value: 'barge', label: '驳船' }]} />
        </Control>
        <Control label="水域">
          <Segmented label="水域" pulse={next === 'water'} value={water} onChange={setWater} options={(Object.keys(WATERS) as WaterKey[]).map(k => ({ value: k, label: WATERS[k].name }))} />
        </Control>
      </>}
    />
  )
}
