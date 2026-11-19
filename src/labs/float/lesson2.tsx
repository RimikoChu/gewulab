// 浮力 · 第 2 课 浮力从哪来（上下表面的压力差）
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Control, Glass, HoldButton, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import Scene2 from './scene2'
import { LESSONS, goLesson } from './lessons'
import { BOXES, G, STEP, dropForTop, kN, maxDrop2, solve2, type BoxKey } from './physics'
import { useCrane } from '@/lab-kit'

interface Row { id: number; box: BoxKey; dTop: number; down: number; up: number }
const DEEPER = 1       // “更深”至少要比上一次深这么多（m）
const TASKS: (Task & { ok: (rows: Row[]) => boolean })[] = [
  { id: 'in', text: '把钢箱完全放进水里，记录数据', note: '底面受到的压力比顶面大，差值就是浮力', ok: rows => rows.some(x => x.box === 'b1') },
  { id: 'deep', text: '放到更深的地方，再记录一次', note: '两个压力都变大了，差值没有变', ok: rows => { const a = rows.filter(x => x.box === 'b1').map(x => x.dTop); return a.length > 1 && Math.max(...a) - Math.min(...a) >= DEEPER - 1e-6 } },
  { id: 'tall', text: '换成 2 m 高的钢箱，浸没后记录', note: '上下表面的深度差大一倍，浮力也大一倍', ok: rows => rows.some(x => x.box === 'b2') },
]
const KEY = 'gewu:float:2'
type Next = 'lower' | 'record' | 'box' | null

export default function Lesson2() {
  const [box, setBox] = useState<BoxKey>('b1')
  const crane = useCrane(maxDrop2(), 1.2)
  const [rows, setRows] = useState<Row[]>([])
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  const { drop, busy, moving } = crane
  const r = useMemo(() => solve2(drop, box), [drop, box])
  const b = BOXES[box]

  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3200); return () => clearTimeout(t) }, [banner])
  const resetAll = () => { crane.reset(); setBox('b1'); setRows([]); setDone({}); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const change = (k: BoxKey) => { if (k !== box) crane.retract(() => setBox(k)) }

  const canRecord = !busy && !moving && r.under
  const record = () => {
    if (!canRecord) return
    const n = [...rows.slice(-4), { id: Date.now(), box, dTop: r.dTop, down: r.fDown, up: r.fUp }]
    setRows(n)
    const d = { ...done }; let hit: Task | undefined
    for (const t of TASKS) if (!d[t.id] && t.ok(n)) { d[t.id] = true; hit = t }
    if (!hit) return
    setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
    if (TASKS.every(t => d[t.id])) setFinale(true); else setBanner(hit.note)
  }

  // ---------- 下一步该做什么 ----------
  const task = TASKS.find(t => !done[t.id])
  const first = rows.find(x => x.box === 'b1')
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (busy) return { hint: '吊车收回，换上另一只钢箱…', next: null }
    if (!task) return { hint: '都做完了。再上下拖一拖钢箱，看上下两个箭头怎么变。', next: null }
    if (task.id === 'tall' && box !== 'b2') return { hint: '把钢箱换成 2 m 高的', next: 'box' }
    if (!r.under) return { hint: '把钢箱完全放进水里', next: 'lower' }
    if (task.id === 'deep' && first && Math.abs(r.dTop - first.dTop) < DEEPER) return { hint: '再往深处放一些', next: 'lower' }
    return { hint: moving ? '放到位了…' : '按“记录数据”，把上下两个压力记下来', next: moving ? null : 'record' }
  })()

  // 键盘：↑↓ 升降，空格记录
  const keys = useRef({ step: crane.stepBy, record }); keys.current = { step: crane.stepBy, record }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON' && e.key === ' ') return
      if (e.key === 'ArrowDown') { e.preventDefault(); keys.current.step(STEP) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); keys.current.step(-STEP) }
      else if (e.key === ' ') { e.preventDefault(); keys.current.record() }
    }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])

  const max = maxDrop2()
  return (
    <LabShell autoStep={() => { if (moving || busy || next !== 'lower') return false; crane.moveTo(dropForTop(box, task?.id === 'deep' ? b.deep : b.shallow)); return true }} title="浮力" lessons={LESSONS} current="2" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      stage={<Scene2 r={r} box={box} drop={drop} onDrop={crane.dragTo} dragHint={!crane.touched} />}
      lesson={
        <LessonBlock no="2" title="浮力从哪来" concept="下面的水往上推得更用力" tasks={TASKS} done={done} current={task?.id}
          theory={<>
            <p>水越深，压强越大。物体的底面比顶面深，所以水向上推底面的力，比向下压顶面的力大。<b className="text-white">这个差就是浮力。</b></p>
            <p className="my-3 rounded-xl bg-white/8 py-3 text-center font-formula text-[21px] text-white italic">F<sub>浮</sub> = F<sub>向上</sub> − F<sub>向下</sub></p>
            <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">每个面：</b>压力 F = pS，压强 p = ρgh</li>
              <li><b className="text-white">四周：</b>左右、前后一样大，互相抵消</li>
              <li><b className="text-[#ffd27a]">浸没后：</b>放得再深，上下的差也不变</li>
            </ul>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[22px] leading-snug font-bold">浮力是水对物体上下表面的压力差</p>
          <p className="mt-2 font-formula text-[19px] italic text-white/85">F<sub>浮</sub> = F<sub>向上</sub> − F<sub>向下</sub></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">浸没以后放得再深，浮力也不变；物体越高，上下的差越大。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再拖一拖看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {/* 结论：向上的压力减去向下的压力 */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Big symbol={<>F<sub>向上</sub></>} hint="水推底面" value={kN(r.fUp)} color="#7fe3d4" />
            <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xl font-bold text-white/70">−</span>
            <Big symbol={<>F<sub>向下</sub></>} hint="水压顶面" value={kN(r.fDown)} color="#ffb394" />
          </div>
          <div key={String(r.under)} className={cn('mt-3 rounded-xl bg-white/8 py-2.5 text-center', r.under && 'pop')}>
            <span className="font-formula text-[17px] italic text-white/70">F<sub>浮</sub> = </span>
            <span className="text-[26px] font-bold tabular-nums">{kN(r.fBuoy)}</span><span className="ml-1 text-[13px] text-white/55">kN</span>
          </div>

          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数（{b.name}）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol={<>h<sub>顶</sub></>} value={Math.max(0, r.dTop).toFixed(2)} unit="m · 顶面深" />
            <ParamTile symbol={<>h<sub>底</sub></>} value={r.dBot.toFixed(2)} unit="m · 底面深" />
            <ParamTile symbol="S" value="1.00" unit="m² · 面积" />
          </div>
          <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">
            <i>F<sub>向上</sub></i> = <i>ρ g h<sub>底</sub> S</i> = 1.00×10³ × {G} × {r.dBot.toFixed(2)} × 1 = <b className="text-white">{kN(r.fUp)} kN</b>
          </p>
          <p className="mt-2 text-[13.5px] leading-snug text-white/65">{r.inAir ? '钢箱还在空中，水没有碰到它。' : !r.under ? '顶面还露在水面上：只有底面受到水向上的压力。' : `四个侧面各受 ${kN(r.fSide)} kN，两两抵消。`}</p>

          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">钢箱完全浸没后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">钢箱</th><th className="text-right font-normal">顶面深/m</th><th className="text-right font-normal">F向上</th><th className="text-right font-normal">F向下</th><th className="text-right font-normal">差/kN</th></tr></thead>
                <tbody>
                  {rows.map(x => (
                    <tr key={x.id} className="row-in border-t border-white/12">
                      <td className="py-1.5 text-white/80">{BOXES[x.box].short}</td><td className="text-right">{x.dTop.toFixed(2)}</td>
                      <td className="text-right">{kN(x.up)}</td><td className="text-right">{kN(x.down)}</td><td className="text-right font-semibold text-[#7fe3d4]">{kN(x.up - x.down)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <HoldButton onStep={() => crane.stepBy(-STEP)} onHold={() => crane.hold(-1)} onRelease={crane.release} disabled={busy || drop <= 0} aria-label="提起"><ArrowUp className="size-4" />提起</HoldButton>
        <HoldButton onStep={() => crane.stepBy(STEP)} onHold={() => crane.hold(1)} onRelease={crane.release} disabled={busy || drop >= max - 1e-6} pulse={next === 'lower' && !moving} aria-label="放下"><ArrowDown className="size-4" />放下</HoldButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!canRecord}>记录数据</LabButton>
      </>}
      extras={<>
        <Control label="直接放到：顶面在水下">
          <LabButton onClick={() => crane.moveTo(dropForTop(box, b.shallow))} disabled={busy}>{b.shallow} m</LabButton>
          <LabButton onClick={() => crane.moveTo(dropForTop(box, b.deep))} disabled={busy}>{b.deep} m</LabButton>
        </Control>
        <Control label="钢箱">
          <Segmented label="钢箱" disabled={busy} pulse={next === 'box'} want={'b2'} value={box} onChange={change} options={(Object.keys(BOXES) as BoxKey[]).map(k => ({ value: k, label: BOXES[k].short }))} />
        </Control>
      </>}
    />
  )
}

function Big({ symbol, hint, value, color }: { symbol: React.ReactNode; hint: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="font-formula text-[18px] italic" style={{ color }}>{symbol}</div>
      <div className="text-[34px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[14px] font-medium text-white/55">kN</span></div>
      <div className="mt-1 text-[12px] text-white/45">{hint}</div>
    </div>
  )
}
