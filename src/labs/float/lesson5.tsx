// 浮力 · 第 5 课 沉还是浮（浮沉条件：比较浮力和重力，或者比较密度）
import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, Minus, Plus } from 'lucide-react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { FLOATERS, G, LIQUIDS, SEA5, TANK5, kN, motion5, rest5, step5, wet5, type FloaterKey, type LiquidKey, type Motion5 } from './physics'

const STATE: Record<Motion5, { name: string; color: string }> = {
  float: { name: '漂浮', color: '#7fe3d4' }, hover: { name: '悬浮', color: '#ffe9a8' }, sunk: { name: '沉底', color: '#ffb394' },
  rising: { name: '上浮中', color: '#ffffff' }, sinking: { name: '下沉中', color: '#ffffff' }, air: { name: '在空中', color: '#ffffff' },
}
interface Now { obj: FloaterKey; tank: number; liquid: LiquidKey; m: Motion5 }
const TASKS: (Task & { ok: (s: Now) => boolean })[] = [
  { id: 'sink', text: '把钢锭放进水里，看它停在哪', note: '重力比浮力大得多：下沉，一直沉到水底', ok: s => s.obj === 'steel' && s.m === 'sunk' },
  { id: 'ballast', text: '往压载箱里加水，直到它沉下去', note: '加到比同体积的水还重，它就沉了', ok: s => s.obj === 'tank' && s.m === 'sunk' },
  { id: 'hover', text: '调到刚好悬浮：不上也不下', note: '和同体积的水一样重：浮力等于重力，停在哪都行', ok: s => s.obj === 'tank' && s.m === 'hover' },
  { id: 'sea', text: '悬浮的压载箱，换到海水里试试', note: '海水更密，浮力变大：它浮上来了', ok: s => s.obj === 'tank' && s.liquid === 'sea' && s.tank === 1000 && s.m === 'float' },
]
const KEY = 'gewu:float:5'
const DROP_FROM = 0.25           // 放进水里时，从水面上方这么高松手（底面相对满水位）
const ROWS: { m: Motion5[]; name: string; f: string; d: string }[] = [
  { m: ['rising'], name: '上浮', f: 'F浮 > G', d: 'ρ物 < ρ液' },
  { m: ['float'], name: '漂浮', f: 'F浮 = G', d: 'ρ物 < ρ液' },
  { m: ['hover'], name: '悬浮', f: 'F浮 = G', d: 'ρ物 = ρ液' },
  { m: ['sinking', 'sunk'], name: '下沉', f: 'F浮 < G', d: 'ρ物 > ρ液' },
]

export default function Lesson5() {
  const [obj, setObj] = useState<FloaterKey>('wood')
  const [tank, setTank] = useState(TANK5.empty)
  const [liquid, setLiquid] = useState<LiquidKey>('fresh')
  const [pos, setPos] = useState(() => ({ b: rest5(FLOATERS.wood.mass, LIQUIDS.fresh.rho)!, v: 0, support: 0 }))
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  const [touched, setTouched] = useState(false)
  const mass = obj === 'tank' ? tank : FLOATERS[obj].mass, rho = LIQUIDS[liquid].rho

  // ---------- 物体自己的运动：每一帧往前算一小步；手拖着的时候不算 ----------
  const sim = useRef({ ...pos, mass, rho, held: false }); sim.current.mass = mass; sim.current.rho = rho
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      let dt = Math.min(0.06, (now - last) / 1000); last = now
      const s = sim.current
      if (!s.held) {
        let n = { b: s.b, v: s.v, support: 0 }
        for (; dt > 1e-6; dt -= 0.01) n = step5(n.b, n.v, s.mass, s.rho, Math.min(0.01, dt))
        if (Math.abs(n.b - s.b) > 1e-5 || Math.abs(n.v - s.v) > 1e-4 || Math.abs(n.support - s.support) > 1) { Object.assign(s, n); setPos(n) }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const place = (b: number) => { Object.assign(sim.current, { b, v: 0, support: 0 }); setPos({ b, v: 0, support: 0 }) }
  const dragTo = (b: number) => { setTouched(true); sim.current.held = true; place(b) }
  const pushDown = () => { setTouched(true); place(-2.1) }
  const change = (k: FloaterKey) => { if (k === obj) return; setObj(k); place(DROP_FROM) }
  const addWater = (d: number) => setTank(t => Math.min(TANK5.max, Math.max(TANK5.min, t + d)))
  // 沉在水底的压载箱调到和水一样重时，它不会自己离开水底：把它托到水中间，才看得出“停在哪都行”
  useEffect(() => { const x = sim.current; if (obj === 'tank' && x.b < -SEA5.depth + 0.1 && Math.abs(wet5(x.b, rho).fBuoy - tank * G) < 30) place(-2) }, [tank, rho, obj])   // eslint-disable-line react-hooks/exhaustive-deps

  const w = wet5(pos.b, rho), g = mass * G
  const m = motion5(pos.b, pos.v, mass, rho)
  const moving = m === 'rising' || m === 'sinking' || m === 'air'

  // 任务：状态稳定保持 0.8 秒才算
  const now: Now = { obj, tank, liquid, m }
  const sig = `${obj}|${tank}|${liquid}|${m}`
  useEffect(() => {
    const hit = TASKS.find(t => !done[t.id] && t.ok(now)); if (!hit) return
    const t = setTimeout(() => {
      const d = { ...done, [hit.id]: true }
      setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
      if (TASKS.every(x => d[x.id])) setFinale(true); else setBanner(hit.note)
    }, 800)
    return () => clearTimeout(t)
  }, [sig, done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3600); return () => clearTimeout(t) }, [banner])
  const resetAll = () => { setObj('wood'); setTank(TANK5.empty); setLiquid('fresh'); place(rest5(FLOATERS.wood.mass, LIQUIDS.fresh.rho)!); setDone({}); setFinale(false); setTouched(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }

  // ---------- 下一步该做什么 ----------
  const task = TASKS.find(t => !done[t.id])
  const { hint, next }: { hint: string; next: 'obj' | 'plus' | 'minus' | 'liquid' | null } = (() => {
    if (!task) return { hint: '四种情况都见过了。把物体按到水下再松手，看它怎么动。', next: null }
    if (task.id === 'sink') return obj === 'steel' ? { hint: '看它沉到哪里…', next: null } : { hint: '把物体换成钢锭', next: 'obj' }
    if (obj !== 'tank') return { hint: '把物体换成压载箱', next: 'obj' }
    if (task.id === 'ballast') return m === 'sunk' ? { hint: '沉到底了', next: null } : { hint: `往压载箱里加水（现在 ${tank} kg，同体积的水重 ${rho} kg）`, next: tank > rho ? null : 'plus' }
    if (task.id === 'hover') {
      if (liquid !== 'fresh') return { hint: '先换回淡水', next: 'liquid' }
      return tank > 1000 ? { hint: '太重了：抽掉一些水，让它和同体积的水一样重', next: 'minus' } : tank < 1000 ? { hint: '太轻了：再加一些水', next: 'plus' } : { hint: '正好 1000 kg：等它停稳…', next: null }
    }
    if (tank !== 1000) return { hint: '先把压载箱调回 1000 kg（刚好悬浮）', next: tank > 1000 ? 'minus' : 'plus' }
    return liquid === 'sea' ? { hint: '看它怎么动…', next: null } : { hint: '把液体换成海水', next: 'liquid' }
  })()

  const cmp = (a: number, b: number, tol: number) => Math.abs(a - b) < tol ? '=' : a > b ? '>' : '<'
  const fSym = m === 'sunk' ? '<' : cmp(w.fBuoy, g, 30), dSym = cmp(mass, rho, 0.5)
  return (
    <LabShell title="浮力" lessons={LESSONS} current="5" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      stage={<Scene5 obj={obj} mass={mass} liquid={liquid} b={pos.b} moving={moving} onMove={dragTo} onEnd={() => { sim.current.held = false }} dragHint={!touched} />}
      lesson={
        <LessonBlock no="5" title="沉还是浮" concept="比一比：浮力和重力谁大" tasks={TASKS} done={done} current={task?.id}
          theory={<>
            <p>浸没在液体里的物体，是上浮还是下沉，看<b className="text-white">浮力和重力谁大</b>。体积相同时，也可以直接比密度。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">上浮：</b>F浮 &gt; G，最后漂在液面上</li>
              <li><b className="text-[#ffe9a8]">悬浮：</b>F浮 = G，停在液体里任何位置</li>
              <li><b className="text-[#ffb394]">下沉：</b>F浮 &lt; G，一直沉到底</li>
            </ul>
            <p className="mt-3 text-[14px] text-white/80">漂浮时物体只有一部分浸在液体里，这时也是 F浮 = G。</p>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">沉、浮、悬浮都见过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">沉还是浮，看浮力和重力谁大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">比同体积的液体轻，就浮；一样重，就悬浮；更重，就沉。<br />同一个物体，换一种液体，结果可能不一样。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再玩一会儿</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {/* 结论：现在是哪种状态，浮力和重力谁大 */}
          <div key={m} className="pop text-center text-[34px] leading-none font-bold" style={{ color: STATE[m].color }}>{STATE[m].name}</div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Side symbol={<>F<sub>浮</sub></>} value={kN(w.fBuoy)} unit="kN" />
            <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xl font-bold">{m === 'air' ? '·' : fSym}</span>
            <Side symbol="G" value={kN(g)} unit="kN" />
          </div>
          {m === 'sunk' && <p className="mt-2 text-center text-[13px] text-white/60">水底还托着它：支持力 {kN(pos.support)} kN</p>}

          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数（{FLOATERS[obj].name}，{mass} kg）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol={<>ρ<sub>物</sub></>} value={(mass / 1000).toFixed(2)} unit="×10³ kg/m³" />
            <ParamTile symbol={<>ρ<sub>液</sub></>} value={(rho / 1000).toFixed(2)} unit="×10³ kg/m³" />
            <ParamTile symbol={<>V<sub>排</sub></>} value={w.wet.toFixed(2)} unit={`m³ · 浸入 ${Math.round(w.wet * 100)}%`} />
          </div>
          <p className="mt-3 text-center font-formula text-[17px] text-white/80"><i>ρ<sub>物</sub></i> <b className="mx-1.5 text-white">{dSym}</b> <i>ρ<sub>液</sub></i></p>

          <h2 className="mt-5 text-[12.5px] text-white/55">浮沉条件</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <tbody>
              {ROWS.map(x => { const on = x.m.includes(m); return (
                <tr key={x.name} className={cn('border-t border-white/12 first:border-0', on ? 'text-white' : 'text-white/45')}>
                  <td className={cn('py-1.5 pl-2 font-semibold', on && 'rounded-l-lg bg-white/10')}>{x.name}</td>
                  <td className={cn('font-formula italic', on && 'bg-white/10')}>{x.f}</td><td className={cn('pr-2 text-right font-formula italic', on && 'rounded-r-lg bg-white/10')}>{x.d}</td>
                </tr>
              ) })}
            </tbody>
          </table>
        </Glass>
      }
      actionsLabel="压载箱里的水（也可以直接把物体按下去再松手）"
      actions={<>
        <LabButton onClick={() => addWater(-TANK5.step)} disabled={obj !== 'tank' || tank <= TANK5.min} pulse={next === 'minus'}><Minus className="size-4" />抽水</LabButton>
        <LabButton onClick={() => addWater(TANK5.step)} disabled={obj !== 'tank' || tank >= TANK5.max} pulse={next === 'plus'}><Plus className="size-4" />加水</LabButton>
        <LabButton primary onClick={pushDown} disabled={m === 'sunk'}><ArrowDownToLine className="size-4" />按到水下</LabButton>
      </>}
      extras={<>
        <Control label="物体（都是 1 m³）">
          <Segmented label="物体" pulse={next === 'obj'} want={task?.id === 'sink' ? 'steel' : 'tank'} value={obj} onChange={change} options={(Object.keys(FLOATERS) as FloaterKey[]).map(k => ({ value: k, label: FLOATERS[k].name }))} />
        </Control>
        <Control label="液体">
          <Segmented label="液体" pulse={next === 'liquid'} want={task?.id === 'hover' ? 'fresh' : 'sea'} value={liquid} onChange={setLiquid} options={(Object.keys(LIQUIDS) as LiquidKey[]).map(k => ({ value: k, label: LIQUIDS[k].name }))} />
        </Control>
      </>}
    />
  )
}

function Side({ symbol, value, unit }: { symbol: React.ReactNode; value: string; unit: string }) {
  return (
    <div className="text-center">
      <div className="font-formula text-[18px] italic text-white/65">{symbol}</div>
      <div className="text-[30px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[13px] font-medium text-white/55">{unit}</span></div>
    </div>
  )
}
