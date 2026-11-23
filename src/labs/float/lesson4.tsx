// 浮力 · 第 4 课 阿基米德原理（造船厂：吊车、试验水池、计量槽）
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react'
import { Control, Glass, HoldButton, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LESSONS, goLesson } from './lessons'
import { cn } from '@/lib/utils'
import Scene4 from './scene4'
import { BLOCKS, G, LIQUIDS, START_GAP, STEP, advance, kN, maxDrop, solve, type BlockKey, type Lesson4Result, type Lesson4State, type LiquidKey } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'


// 任务在按“记录数据”的那一刻判定。顺序按吊车往下放的顺序排：先一半，再全部，最后换海水
type Goal = 'half' | 'full'
const TASKS: (Task & { goal: Goal; liquid?: LiquidKey; ok: (s: Lesson4State, r: Lesson4Result) => boolean })[] = [
  { id: 'half', goal: 'half', text: '把物块放进水里一半，记录数据', note: '排开多少水，就得到多大的浮力', ok: (_, r) => r.frac > 0.45 && r.frac < 0.55 },
  { id: 'full', goal: 'full', liquid: 'fresh', text: '完全放进淡水，再记录一组', note: '排开的水多一倍，浮力也多一倍', ok: (s, r) => s.liquid === 'fresh' && r.frac > 0.999 },
  { id: 'sea', goal: 'full', liquid: 'sea', text: '换成海水，完全放进去再记录', note: '海水更密，同样体积排开的水更重', ok: (s, r) => s.liquid === 'sea' && r.frac > 0.999 },
]
const INITIAL: Lesson4State = { drop: 0, block: 'steel1', liquid: 'fresh', spilled: 0 }
const KEY = 'gewu:float:4:dock'
const SPEED = 0.55            // 吊车升降速度（m/s）
const DRAIN = 1.6             // 重新注水时，计量槽放空的速度（m³/s）
const halfDrop = (b: BlockKey) => START_GAP + BLOCKS[b].h / 2
const fullDrop = (b: BlockKey) => START_GAP + BLOCKS[b].h + 0.2
interface Row { id: number; block: BlockKey; liquid: LiquidKey; v: number; f: number; g: number }
type Next = 'lower' | 'record' | 'refill' | 'liquid' | null

export default function Lesson4() {
  const [st, setSt] = useState<Lesson4State>(INITIAL)
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [rows, setRows] = useState<Row[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [flowing, setFlowing] = useState(false)
  const [busy, setBusy] = useState(false)             // 正在重新注水：吊车收回、计量槽放空
  const [touched, setTouched] = useState(false)       // 动过一次以后，不再显示“可以拖动”的提示
  const [finale, setFinale] = useState(false)
  const [more, setMore] = useState(false)
  const r = useMemo(() => solve(st), [st])

  // ---------- 吊车：朝目标位置匀速移动 ----------
  const stRef = useRef(st); stRef.current = st
  const goal = useRef(0), raf = useRef(0), after = useRef<Partial<Lesson4State> | null>(null), refill = useRef(false)
  const tick = useCallback(() => {
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const s = stRef.current, d = goal.current - s.drop
      let next: Lesson4State | null = null
      if (Math.abs(d) > 1e-4) next = advance({ ...s, drop: Math.abs(d) <= SPEED * dt ? goal.current : s.drop + Math.sign(d) * SPEED * dt })
      else if (refill.current && s.spilled > 0) next = { ...s, spilled: Math.max(0, s.spilled - DRAIN * dt) }
      else if (refill.current) { refill.current = false; setBusy(false); if (after.current) { next = { ...s, ...after.current }; after.current = null } }
      if (next) { stRef.current = next; setSt(next); raf.current = requestAnimationFrame(frame) } else raf.current = 0
    }
    if (!raf.current) raf.current = requestAnimationFrame(frame)
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const moveTo = (d: number) => { if (busy) return; setTouched(true); goal.current = Math.round(Math.min(maxDrop(st.block), Math.max(0, d)) * 100) / 100; tick() }
  const stepBy = (d: number) => moveTo(goal.current + d)
  const hold = (dir: number) => moveTo(dir > 0 ? maxDrop(st.block) : 0)
  const release = () => { goal.current = Math.round(stRef.current.drop * 20) / 20; tick() }
  const dragTo = (d: number) => { if (busy) return; setTouched(true); goal.current = d; const n = advance({ ...stRef.current, drop: d }); stRef.current = n; setSt(n) }
  /** 重新注水：吊车收回 → 计量槽放空、水池回到满水位 →（如果有）换上新的物块或液体 */
  const startRefill = (then?: Partial<Lesson4State>) => {
    if (busy) return
    const s = stRef.current
    if (s.drop < 1e-4 && s.spilled < 1e-6) { if (then) { const n = { ...s, ...then }; stRef.current = n; setSt(n) } return }
    after.current = then ?? null; refill.current = true; goal.current = 0; setBusy(true); setTouched(true); tick()
  }

  // 水在流：流进计量槽的水量刚刚增加过
  const lastOut = useRef(0)
  useEffect(() => {
    if (r.vOut > lastOut.current + 1e-9) { setFlowing(true); const t = setTimeout(() => setFlowing(false), 380); lastOut.current = r.vOut; return () => clearTimeout(t) }
    lastOut.current = r.vOut
  }, [r.vOut])
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3200); return () => clearTimeout(t) }, [banner])

  const resetAll = () => { cancelAnimationFrame(raf.current); raf.current = 0; refill.current = false; after.current = null; goal.current = 0; stRef.current = INITIAL; setSt(INITIAL); setBusy(false); setDone({}); setRows([]); setFinale(false); setTouched(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const started = r.vImm > 1e-6 || r.vOut > 1e-6
  const canRecord = !busy && r.vImm > 1e-6 && !r.lifted

  const record = () => {
    if (!canRecord) return
    setRows(rs => [...rs.slice(-4), { id: Date.now(), block: st.block, liquid: st.liquid, v: r.vImm, f: r.fBuoy, g: r.gOut }])
    const hit = TASKS.find(t => !done[t.id] && t.ok(st, r)); if (!hit) return
    const n = { ...done, [hit.id]: true }
    setDone(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (TASKS.every(t => n[t.id])) setFinale(true); else setBanner(hit.note)
  }

  // ---------- 下一步该做什么：一句提示 + 该按的那个按钮 ----------
  const task = TASKS.find(t => !done[t.id])
  const moving = Math.abs(goal.current - st.drop) > 1e-3
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (busy) return { hint: '吊车收回，计量槽放空，水池重新注满…', next: null }
    if (!task) return { hint: '三组都记完了。换个物块或液体，再验证一次。', next: null }
    if (task.liquid && task.liquid !== st.liquid) return { hint: `把液体换成${LIQUIDS[task.liquid].name}`, next: 'liquid' }
    if (task.ok(st, r) && !r.lifted) return { hint: moving ? '放到位了…' : '按“记录数据”，把这一组记下来', next: moving ? null : 'record' }
    const want = (task.goal === 'half' ? 0.5 : 1) * BLOCKS[st.block].h          // 这一步该排开多少水（m³）
    if (r.vOut > want + 1e-3) return { hint: '计量槽里的水已经比这一步要的多了，先重新注水', next: 'refill' }
    return { hint: task.goal === 'half' ? '用吊车把物块放下去，放到一半停住' : '把物块完全放进水里', next: 'lower' }
  })()

  // 键盘：↑↓ 升降，空格记录
  const keys = useRef({ stepBy, record }); keys.current = { stepBy, record }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) && e.key === ' ') return
      if (e.key === 'ArrowDown') { e.preventDefault(); keys.current.stepBy(STEP) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); keys.current.stepBy(-STEP) }
      else if (e.key === ' ') { e.preventDefault(); keys.current.record() }
    }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])

  const allDone = TASKS.every(t => done[t.id])
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} autoStep={() => { if (moving || busy || next !== 'lower' || !task) return false; moveTo(task.goal === 'half' ? halfDrop(st.block) : fullDrop(st.block)); return true }} title="浮力" lessons={LESSONS} current="4" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      stage={<Scene4 r={r} block={st.block} liquid={st.liquid} flowing={flowing} drop={st.drop} onDrop={dragTo} dragHint={!touched} />}
      lesson={
        <LessonBlock no="4" title="阿基米德原理" concept="排开多少水，就得到多大的浮力" tasks={TASKS} done={done} current={task?.id}
          theory={<>
            <p>浸在液体里的物体受到向上的浮力，大小等于它<b className="text-white">排开的液体所受的重力</b>。</p>
            <p className="my-3 rounded-xl bg-white/8 py-3 text-center font-formula text-[21px] text-white italic">F<sub>浮</sub> = G<sub>排</sub> = ρ<sub>液</sub> g V<sub>排</sub></p>
            <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">有关：</b>排开液体的体积、液体的密度</li>
              <li><b className="text-[#ffd27a]">无关：</b>物体的材料、浸没后的深度</li>
            </ul>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[22px] leading-snug font-bold">每一组，F<sub>浮</sub> 都等于 G<sub>排</sub></p>
          <p className="mt-2 font-formula text-[19px] italic text-white/85">F<sub>浮</sub> = G<sub>排</sub> = ρ<sub>液</sub> g V<sub>排</sub></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">排开的水多一倍，浮力多一倍；液体更密，浮力更大。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>换个物块再验证</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {/* 结论：两个数并排比较 */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Verdict symbol={<>F<sub>浮</sub></>} hint="吊秤少了多少" value={kN(r.fBuoy)} />
            <span key={String(r.equal && !r.lifted)} className={cn('grid size-9 place-items-center rounded-full text-xl font-bold transition-colors',
              !started || r.lifted ? 'bg-white/10 text-white/50' : r.equal ? 'pop bg-[#35c7b3] text-[#06231f]' : 'bg-[#ff6b6b]/20 text-[#ff8f8f]')}>{!started || r.lifted ? '·' : r.equal ? '=' : '≠'}</span>
            <Verdict symbol={<>G<sub>排</sub></>} hint="地磅多了多少" value={kN(r.gOut)} />
          </div>
          {r.lifted && !busy && <p className="mt-3 text-[13px] leading-snug text-[#ffd27a]">物块提起来了，流进计量槽的水还在槽里。想再比一次，先重新注水。</p>}

          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol={<>ρ<sub>液</sub></>} value={(r.rho / 1000).toFixed(2)} unit="×10³ kg/m³" />
            <ParamTile symbol={<>V<sub>排</sub></>} value={r.vImm.toFixed(2)} unit="m³" />
            <ParamTile symbol="g" value={String(G)} unit="N/kg" />
          </div>
          <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">
            <i>ρ<sub>液</sub> g V<sub>排</sub></i> = {(r.rho / 1000).toFixed(2)}×10³ × {G} × {r.vImm.toFixed(2)} = <b className="text-white">{kN(r.rho * G * r.vImm)} kN</b>
          </p>

          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">物块进水后按“记录数据”，把这一组记下来。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">物块 · 液体</th><th className="text-right font-normal">V排/m³</th><th className="text-right font-normal">F浮/kN</th><th className="text-right font-normal">G排/kN</th></tr></thead>
                <tbody>
                  {rows.map(x => (
                    <tr key={x.id} className="row-in border-t border-white/12">
                      <td className="py-1.5 text-white/80">{BLOCKS[x.block].short} · {LIQUIDS[x.liquid].name}</td>
                      <td className="text-right">{x.v.toFixed(2)}</td>
                      <td className={cn('text-right font-semibold', allDone && 'text-[#7fe3d4]')}>{kN(x.f)}</td><td className={cn('text-right font-semibold', allDone && 'text-[#7fe3d4]')}>{kN(x.g)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}

          {/* 四个原始读数：场景里的吊秤和地磅上已经有，默认收起 */}
          <button onClick={() => setMore(m => !m)} aria-expanded={more} className="mt-4 flex h-9 w-full items-center justify-between rounded-lg px-2 text-[12.5px] text-white/55 hover:bg-white/10">
            四个测量值<ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} />
          </button>
          {more && <dl className="mt-1 grid grid-cols-2 gap-x-5 gap-y-1 px-2 text-[14.5px]">
            {([['G物', r.gBlock], ['F拉', r.fPull], ['G槽', r.gTank], ['G总', r.gTotal]] as const).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-white/12 py-1">
                <dt className="text-white/60">{k}</dt><dd className="font-semibold tabular-nums">{kN(v)} <span className="text-[12.5px] font-normal text-white/55">kN</span></dd>
              </div>
            ))}
          </dl>}
        </Glass>
      }
      actions={<>
        <HoldButton onStep={() => stepBy(-STEP)} onHold={() => hold(-1)} onRelease={release} disabled={busy || st.drop <= 0} aria-label="提起"><ArrowUp className="size-4" />提起</HoldButton>
        <HoldButton onStep={() => stepBy(STEP)} onHold={() => hold(1)} onRelease={release} disabled={busy || st.drop >= maxDrop(st.block) - 1e-6} pulse={next === 'lower' && !moving} aria-label="放下"><ArrowDown className="size-4" />放下</HoldButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!canRecord}>记录数据</LabButton>
      </>}
      extras={<>
        <Control label="直接放到">
          <LabButton onClick={() => moveTo(halfDrop(st.block))} disabled={busy}>一半</LabButton>
          <LabButton onClick={() => moveTo(fullDrop(st.block))} disabled={busy}>完全浸没</LabButton>
          <LabButton primary={next === 'refill'} pulse={next === 'refill'} onClick={() => startRefill()} disabled={busy || (!started && st.drop === 0)}>重新注水</LabButton>
        </Control>
        <Control label="物块">
          <Segmented label="物块" disabled={busy} value={st.block} onChange={v => v !== st.block && startRefill({ block: v })} options={(Object.keys(BLOCKS) as BlockKey[]).map(k => ({ value: k, label: BLOCKS[k].short }))} />
        </Control>
        <Control label="液体">
          <Segmented label="液体" disabled={busy} pulse={next === 'liquid'} want={task?.liquid ?? null} value={st.liquid} onChange={v => v !== st.liquid && startRefill({ liquid: v })} options={(Object.keys(LIQUIDS) as LiquidKey[]).map(k => ({ value: k, label: LIQUIDS[k].name }))} />
        </Control>
      </>}
    />
  )
}

function Verdict({ symbol, hint, value }: { symbol: React.ReactNode; hint: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-formula text-[18px] italic text-white/65">{symbol}</div>
      <div className="text-[36px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[14px] font-medium text-white/55">kN</span></div>
      <div className="mt-1 text-[12px] text-white/45">{hint}</div>
    </div>
  )
}
