// 浮力 · 第 3 课 和什么有关（控制变量：每次只改一个条件）
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Minus } from 'lucide-react'
import { Control, Glass, HoldButton, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { G, LIQUIDS3, MATS, STEP, dropForTop3, kN, maxDrop3, solve3, type Lesson3Result, type Liquid3Key, type MatKey } from './physics'
import { useCrane } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Factor = 'vol' | 'liq' | 'mat' | 'depth'
const FACTORS: Record<Factor, { name: string; ask: string; yes: string; no: string }> = {
  vol: { name: '浸入体积', ask: '浸入的体积', yes: '浸入的体积越大，浮力越大', no: '' },
  liq: { name: '液体密度', ask: '液体的密度', yes: '液体密度越大，浮力越大', no: '' },
  mat: { name: '物体材料', ask: '物体的材料', yes: '', no: '材料换了、重力变了，浮力没变' },
  depth: { name: '浸没深度', ask: '浸没的深度', yes: '', no: '浸没以后放得再深，浮力也不变' },
}
const ORDER: Factor[] = ['vol', 'liq', 'mat', 'depth']
const SUBMERGE = dropForTop3(0.4)            // “完全浸没”的标准位置：顶面在液面下 0.4 m
const POS: Record<'vol' | 'depth', { key: string; label: string; drop: number }[]> = {
  vol: [{ key: 'half', label: '浸入一半', drop: dropForTop3(-0.5) }, { key: 'full', label: '完全浸没', drop: SUBMERGE }],
  depth: [{ key: 'shallow', label: '浅：顶面 0.3 m', drop: dropForTop3(0.3) }, { key: 'deep', label: '深：顶面 1.3 m', drop: dropForTop3(1.3) }],
}
interface Row { id: number; factor: Factor; key: string; label: string; f: number }
const TASKS: (Task & { factor: Factor })[] = ORDER.map(f => ({ id: f, factor: f, text: `浮力和${FACTORS[f].ask}有关吗`, note: FACTORS[f].yes || FACTORS[f].no }))
const KEY = 'gewu:float:3'

/** 现在这个状态，在当前探究的因素下算哪一个“取值”；不满足记录条件时返回 null */
function valueOf(f: Factor, r: Lesson3Result, mat: MatKey, liquid: Liquid3Key): { key: string; label: string } | null {
  if (f === 'vol') return r.frac > 0.05 ? { key: `v${Math.round(r.frac * 10)}`, label: r.under ? '完全浸没' : `浸入 ${Math.round(r.frac * 100)}%` } : null
  if (!r.under) return null
  if (f === 'depth') return { key: `d${Math.round(r.dTop * 5)}`, label: `顶面深 ${r.dTop.toFixed(1)} m` }
  return f === 'liq' ? { key: liquid, label: LIQUIDS3[liquid].name } : { key: mat, label: `${MATS[mat].name}块` }
}
/** 这个因素记了至少两个不同取值以后，就能下结论：有关（true）/ 无关（false）；还不够则 null */
function verdict(rows: Row[], f: Factor): boolean | null {
  const mine = rows.filter(x => x.factor === f), keys = new Set(mine.map(x => x.key))
  if (keys.size < 2) return null
  const fs = mine.map(x => x.f); return Math.max(...fs) - Math.min(...fs) > 50
}

export default function Lesson3() {
  const [factor, setFactor] = useState<Factor>('vol')
  const [mat, setMat] = useState<MatKey>('steel')
  const [liquid, setLiquid] = useState<Liquid3Key>('fresh')
  const crane = useCrane(maxDrop3())
  const [rows, setRows] = useState<Row[]>([])
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  const { drop, busy, moving } = crane
  const r = useMemo(() => solve3(drop, mat, liquid), [drop, mat, liquid])

  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3400); return () => clearTimeout(t) }, [banner])
  const resetAll = () => { crane.reset(); setFactor('vol'); setMat('steel'); setLiquid('fresh'); setRows([]); setDone({}); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  /** 换探究的因素：其余条件都回到标准状态（钢块、淡水） */
  const pick = (f: Factor) => { if (f !== factor) crane.retract(() => { setFactor(f); setMat('steel'); setLiquid('fresh') }) }
  /** 换液体或材料：吊车先收回，换好（行车平移到另一只液槽上方）以后自动放到完全浸没 */
  const swap = (f: () => void) => crane.retract(() => { f(); setTimeout(() => crane.moveTo(SUBMERGE), 1500) })

  const now = valueOf(factor, r, mat, liquid)
  const canRecord = !busy && !moving && !!now
  const record = () => {
    if (!canRecord || !now) return
    const n = [...rows.filter(x => !(x.factor === factor && x.key === now.key)), { id: Date.now(), factor, ...now, f: r.fBuoy }]
    setRows(n)
    const v = verdict(n, factor)
    if (v === null || done[factor]) return
    const d = { ...done, [factor]: true }
    setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
    if (ORDER.every(f => d[f])) setFinale(true); else setBanner(`${v ? '有关' : '无关'}：${FACTORS[factor][v ? 'yes' : 'no'] || (v ? '浮力变了' : '浮力没变')}`)
  }

  // ---------- 下一步该做什么 ----------
  const mine = rows.filter(x => x.factor === factor)
  const v = verdict(rows, factor)
  const nextFactor = ORDER.find(f => !done[f])
  const { hint, next }: { hint: string; next: 'record' | 'cond' | 'factor' | null } = (() => {
    if (busy) return { hint: '吊车收回，换好条件再放下去…', next: null }
    if (v !== null) return nextFactor ? { hint: `这个因素有结论了。接着探究：${FACTORS[nextFactor].name}`, next: 'factor' } : { hint: '四个因素都探究完了。', next: null }
    if (moving) return { hint: '放到位了…', next: null }
    if (now && !mine.some(x => x.key === now.key)) return { hint: mine.length ? '条件变了：再按“记录数据”' : '按“记录数据”，先记下这一组', next: 'record' }
    return { hint: mine.length ? `只改“${FACTORS[factor].name}”这一个条件，其余不动` : factor === 'vol' ? '把物块放进水里一部分' : '先选一个条件，物块会自动放到完全浸没', next: 'cond' }
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

  const max = maxDrop3()
  const posNow = factor === 'vol' || factor === 'depth' ? POS[factor].find(p => Math.abs(p.drop - drop) < 0.02)?.key ?? '' : ''
  const fixed = [factor !== 'mat' && '钢块 1 m³', factor !== 'liq' && '淡水', factor !== 'vol' && '完全浸没'].filter(Boolean).join(' · ')
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="浮力" lessons={LESSONS} current="3" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      stage={<Scene3 r={r} mat={mat} liquid={liquid} drop={drop} onDrop={crane.dragTo} dragHint={!crane.touched} />}
      lesson={
        <LessonBlock no="3" title="和什么有关" concept="每次只改一个条件，看浮力变不变" tasks={TASKS} done={done} current={factor}
          theory={<>
            <p>想知道浮力和哪个因素有关，就<b className="text-white">只改这一个因素</b>，其余都保持不变，再比较浮力。这种方法叫控制变量法。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">有关：</b>物体浸在液体中的体积、液体的密度</li>
              <li><b className="text-[#ffd27a]">无关：</b>物体的材料和重力、浸没后的深度</li>
            </ul>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四个因素都探究完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">浮力只和两件事有关</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-left text-[14px]">
            <div className="rounded-xl bg-[#35c7b3]/15 px-3 py-2.5"><b className="text-[#7fe3d4]">有关</b><br />浸入的体积<br />液体的密度</div>
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><b className="text-[#ffd27a]">无关</b><br />物体的材料<br />浸没的深度</div>
          </div>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">F<sub>浮</sub> = G − F<sub>拉</sub></div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{kN(r.fBuoy)}<span className="ml-1 text-[15px] font-medium text-white/55">kN</span></div>
            <div className="mt-2 text-[13px] text-white/55 tabular-nums">{kN(r.g)} − {kN(r.fPull)}</div>
          </div>

          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol={<>ρ<sub>液</sub></>} value={(r.rho / 1000).toFixed(2)} unit="×10³ kg/m³" />
            <ParamTile symbol={<>V<sub>排</sub></>} value={r.vImm.toFixed(2)} unit="m³" />
            <ParamTile symbol="G" value={kN(r.g)} unit="kN · 物重" />
          </div>
          <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">
            <i>ρ<sub>液</sub> g V<sub>排</sub></i> = {(r.rho / 1000).toFixed(2)}×10³ × {G} × {r.vImm.toFixed(2)} = <b className="text-white">{kN(r.rho * G * r.vImm)} kN</b>
          </p>

          <h2 className="mt-5 text-[12.5px] text-white/55">正在探究：{FACTORS[factor].name}</h2>
          <p className="mt-1 text-[12.5px] text-white/45">保持不变：{fixed}</p>
          {mine.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">记两组不同的{FACTORS[factor].ask}，就能下结论。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <tbody>
                  {mine.map(x => (
                    <tr key={x.id} className="row-in border-t border-white/12 first:border-0">
                      <td className="py-1.5 text-white/80">{x.label}</td><td className="text-right font-semibold">{kN(x.f)} <span className="text-[12px] font-normal text-white/50">kN</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>}

          <h2 className="mt-5 text-[12.5px] text-white/55">结论</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {ORDER.map(f => { const x = verdict(rows, f); return (
              <li key={f} className={cn('flex items-center justify-between rounded-lg px-3 py-2 text-[14px]', x === true ? 'bg-[#35c7b3]/15' : 'bg-white/6')}>
                <span className={x === null ? 'text-white/50' : 'text-white'}>{FACTORS[f].name}</span>
                {x === null ? <span className="text-[12.5px] text-white/35">还没探究</span>
                  : x ? <span className="flex items-center gap-1 font-semibold text-[#7fe3d4]"><Check className="size-4" strokeWidth={3} />有关</span>
                  : <span className="flex items-center gap-1 font-semibold text-[#ffd27a]"><Minus className="size-4" strokeWidth={3} />无关</span>}
              </li>
            ) })}
          </ul>
        </Glass>
      }
      actions={<>
        <HoldButton onStep={() => crane.stepBy(-STEP)} onHold={() => crane.hold(-1)} onRelease={crane.release} disabled={busy || drop <= 0} aria-label="提起"><ArrowUp className="size-4" />提起</HoldButton>
        <HoldButton onStep={() => crane.stepBy(STEP)} onHold={() => crane.hold(1)} onRelease={crane.release} disabled={busy || drop >= max - 1e-6} aria-label="放下"><ArrowDown className="size-4" />放下</HoldButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!canRecord}>记录数据</LabButton>
      </>}
      extras={<>
        <Control label="探究哪个因素">
          <Segmented label="探究哪个因素" disabled={busy} pulse={next === 'factor'} want={nextFactor ?? null} value={factor} onChange={pick} options={ORDER.map(f => ({ value: f, label: FACTORS[f].name }))} />
        </Control>
        <Control label="只改这一个条件">
          {(factor === 'vol' || factor === 'depth') && <Segmented label="位置" disabled={busy} pulse={next === 'cond'} want={POS[factor][mine.length ? 1 : 0].key} value={posNow} onChange={k => crane.moveTo(POS[factor].find(p => p.key === k)!.drop)} options={POS[factor].map(p => ({ value: p.key, label: p.label }))} />}
          {factor === 'liq' && <Segmented label="液体" disabled={busy} pulse={next === 'cond'} want={(['fresh', 'diesel'] as Liquid3Key[]).find(k => !mine.some(x => x.key === k)) ?? null} value={r.under ? liquid : ''} onChange={k => swap(() => setLiquid(k as Liquid3Key))} options={(Object.keys(LIQUIDS3) as Liquid3Key[]).map(k => ({ value: k, label: LIQUIDS3[k].name }))} />}
          {factor === 'mat' && <Segmented label="材料" disabled={busy} pulse={next === 'cond'} want={(['steel', 'alu'] as MatKey[]).find(k => !mine.some(x => x.key === k)) ?? null} value={r.under ? mat : ''} onChange={k => swap(() => setMat(k as MatKey))} options={(Object.keys(MATS) as MatKey[]).map(k => ({ value: k, label: `${MATS[k].name}块` }))} />}
        </Control>
      </>}
    />
  )
}
