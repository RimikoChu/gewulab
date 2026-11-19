// 浮力 · 第 1 课 水里变轻了（称重法：空气中称一次，水里称一次）
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Control, Glass, HoldButton, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { ITEMS, STEP, kN, maxDrop1, solve1, type ItemKey } from './physics'

type Rec = Partial<Record<ItemKey, { g?: number; f?: number }>>
const both = (x?: { g?: number; f?: number }) => x?.g != null && x?.f != null
const TASKS: (Task & { ok: (rec: Rec) => boolean })[] = [
  { id: 'air', text: '物体悬在空中，记录吊秤读数', note: '在空气里，吊秤的读数就是物体的重力 G', ok: rec => Object.values(rec).some(x => x?.g != null) },
  { id: 'water', text: '完全放进水里，再记录一次', note: '读数变小了：水在往上托它', ok: rec => Object.values(rec).some(both) },
  { id: 'other', text: '换一个物体，再测一次它受的浮力', note: '不管什么形状，都能这样“称”出浮力', ok: rec => Object.values(rec).filter(both).length >= 2 },
]
const KEY = 'gewu:float:1'
const SPEED = 0.6
type Next = 'lower' | 'raise' | 'record' | 'item' | null

export default function Lesson1() {
  const [item, setItem] = useState<ItemKey>('anchor')
  const [drop, setDrop] = useState(0)
  const [rec, setRec] = useState<Rec>({})
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)             // 正在换物体：吊车先收回
  const [touched, setTouched] = useState(false)
  const [finale, setFinale] = useState(false)
  const r = useMemo(() => solve1(drop, item), [drop, item])

  // ---------- 吊车：朝目标位置匀速移动 ----------
  const dropRef = useRef(0); dropRef.current = drop
  const goal = useRef(0), raf = useRef(0), swap = useRef<ItemKey | null>(null)
  const tick = useCallback(() => {
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const d = goal.current - dropRef.current
      if (Math.abs(d) > 1e-4) { const n = Math.abs(d) <= SPEED * dt ? goal.current : dropRef.current + Math.sign(d) * SPEED * dt; dropRef.current = n; setDrop(n); raf.current = requestAnimationFrame(frame); return }
      raf.current = 0
      if (swap.current) { setItem(swap.current); swap.current = null; setBusy(false) }
    }
    if (!raf.current) raf.current = requestAnimationFrame(frame)
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const max = maxDrop1(item)
  const moveTo = (d: number) => { if (busy) return; setTouched(true); goal.current = Math.round(Math.min(max, Math.max(0, d)) * 100) / 100; tick() }
  const stepBy = (d: number) => moveTo(goal.current + d)
  const release = () => { goal.current = Math.round(dropRef.current * 20) / 20; tick() }
  const dragTo = (d: number) => { if (busy) return; setTouched(true); goal.current = d; dropRef.current = d; setDrop(d) }
  /** 换物体：吊车先收回到起点，再换 */
  const change = (k: ItemKey) => { if (busy || k === item) return; if (dropRef.current < 1e-4) { setItem(k); return } swap.current = k; goal.current = 0; setBusy(true); setTouched(true); tick() }

  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3200); return () => clearTimeout(t) }, [banner])
  const resetAll = () => { cancelAnimationFrame(raf.current); raf.current = 0; swap.current = null; goal.current = 0; dropRef.current = 0; setDrop(0); setItem('anchor'); setBusy(false); setRec({}); setDone({}); setFinale(false); setTouched(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }

  const mine = rec[item]
  const moving = Math.abs(goal.current - drop) > 1e-3
  const canRecord = !busy && !moving && (r.inAir || r.under)
  const record = () => {
    if (!canRecord) return
    const n: Rec = { ...rec, [item]: { ...mine, ...(r.inAir ? { g: r.g } : { f: r.fPull }) } }
    setRec(n)
    const d = { ...done }; let hit: Task | undefined
    for (const t of TASKS) if (!d[t.id] && t.ok(n)) { d[t.id] = true; hit = t }
    if (!hit) return
    setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
    if (TASKS.every(t => d[t.id])) setFinale(true); else setBanner(hit.note)
  }

  // ---------- 下一步该做什么 ----------
  const task = TASKS.find(t => !done[t.id])
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (busy) return { hint: '吊车收回，换上另一个物体…', next: null }
    if (!task) return { hint: '都测完了。三个物体的浮力各不相同，可以再比一比。', next: null }
    if (both(mine)) return { hint: '这个物体测完了，换一个物体再测', next: 'item' }
    if (mine?.g == null) return r.inAir ? { hint: '物体还在空中：按“记录读数”，记下它的重力', next: moving ? null : 'record' } : { hint: '先把物体提出水面，在空气里读一次', next: 'raise' }
    return r.under ? { hint: moving ? '放到位了…' : '完全浸没了：按“记录读数”，再记一次', next: moving ? null : 'record' } : { hint: '把物体完全放进水里', next: 'lower' }
  })()

  // 键盘：↑↓ 升降，空格记录
  const keys = useRef({ stepBy, record }); keys.current = { stepBy, record }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON' && e.key === ' ') return
      if (e.key === 'ArrowDown') { e.preventDefault(); keys.current.stepBy(STEP) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); keys.current.stepBy(-STEP) }
      else if (e.key === ' ') { e.preventDefault(); keys.current.record() }
    }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])

  const rows = (Object.keys(ITEMS) as ItemKey[]).filter(k => rec[k])
  const it = ITEMS[item]
  return (
    <LabShell autoStep={() => { if (moving || busy || (next !== 'lower' && next !== 'raise')) return false; moveTo(next === 'lower' ? max : 0); return true }} title="浮力" lessons={LESSONS} current="1" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      stage={<Scene1 r={r} item={item} drop={drop} onDrop={dragTo} dragHint={!touched} />}
      lesson={
        <LessonBlock no="1" title="水里变轻了" concept="读数变小了多少，浮力就是多少" tasks={TASKS} done={done} current={task?.id}
          theory={<>
            <p>浸在液体里的物体，会受到液体对它<b className="text-white">竖直向上</b>的托力，这个力叫浮力。</p>
            <p className="my-3 rounded-xl bg-white/8 py-3 text-center font-formula text-[21px] text-white italic">F<sub>浮</sub> = G − F<sub>拉</sub></p>
            <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#ff8a5c]">G：</b>在空气里称，吊秤的读数</li>
              <li><b className="text-white">F<sub>拉</sub>：</b>浸在水里称，吊秤的读数</li>
              <li><b className="text-[#7fe3d4]">方法：</b>两次读数相减，叫称重法</li>
            </ul>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个物体都测完了</p>
          <p className="mt-2 text-[22px] leading-snug font-bold">浸在水里的物体，都受到向上的浮力</p>
          <p className="mt-2 font-formula text-[19px] italic text-white/85">F<sub>浮</sub> = G − F<sub>拉</sub></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">形状再怪也不要紧：空气里称一次，水里称一次，相减就是浮力。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再测一个</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {/* 结论：现在这一刻的浮力 */}
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">F<sub>浮</sub> = G − F<sub>拉</sub></div>
            <div key={String(r.under)} className={cn('mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums', r.under && 'pop text-[#7fe3d4]')}>{kN(r.fBuoy)}<span className="ml-1 text-[15px] font-medium text-white/55">kN</span></div>
            <div className="mt-2 text-[13px] text-white/55 tabular-nums">{kN(r.g)} − {kN(r.fPull)}</div>
          </div>

          <h2 className="mt-5 text-[12.5px] text-white/55">{it.name}（{it.mat}，{(it.mass / 1000).toFixed(1)} 吨）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="G" value={kN(r.g)} unit="kN · 重力" />
            <ParamTile symbol={<>F<sub>拉</sub></>} value={kN(r.fPull)} unit="kN · 吊秤" />
            <ParamTile symbol={<>F<sub>浮</sub></>} value={kN(r.fBuoy)} unit="kN · 向上" />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{r.inAir ? '物体在空气里，吊秤的读数就是它的重力。' : r.under ? '完全浸没。再往下放，读数不再变化。' : '浸入得越多，吊秤读数越小。'}</p>

          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">空气里记一次，水里记一次，浮力会自动算出来。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">物体</th><th className="text-right font-normal">G/kN</th><th className="text-right font-normal">F拉/kN</th><th className="text-right font-normal">F浮/kN</th></tr></thead>
                <tbody>
                  {rows.map(k => { const x = rec[k]!; return (
                    <tr key={k} className="row-in border-t border-white/12">
                      <td className="py-1.5 text-white/80">{ITEMS[k].name}</td>
                      <td className="text-right">{x.g != null ? kN(x.g) : '—'}</td><td className="text-right">{x.f != null ? kN(x.f) : '—'}</td>
                      <td className="text-right font-semibold text-[#7fe3d4]">{both(x) ? kN(x.g! - x.f!) : '—'}</td>
                    </tr>
                  ) })}
                </tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <HoldButton onStep={() => stepBy(-STEP)} onHold={() => moveTo(0)} onRelease={release} disabled={busy || drop <= 0} pulse={next === 'raise' && !moving} aria-label="提起"><ArrowUp className="size-4" />提起</HoldButton>
        <HoldButton onStep={() => stepBy(STEP)} onHold={() => moveTo(max)} onRelease={release} disabled={busy || drop >= max - 1e-6} pulse={next === 'lower' && !moving} aria-label="放下"><ArrowDown className="size-4" />放下</HoldButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!canRecord}>记录读数</LabButton>
      </>}
      extras={<>
        <Control label="直接放到">
          <LabButton onClick={() => moveTo(0)} disabled={busy}>空中</LabButton>
          <LabButton onClick={() => moveTo(max)} disabled={busy}>完全浸没</LabButton>
        </Control>
        <Control label="物体">
          <Segmented label="物体" disabled={busy} pulse={next === 'item'} want={(Object.keys(ITEMS) as ItemKey[]).find(k => !both(rec[k])) ?? null} value={item} onChange={change} options={(Object.keys(ITEMS) as ItemKey[]).map(k => ({ value: k, label: ITEMS[k].name }))} />
        </Control>
      </>}
    />
  )
}
