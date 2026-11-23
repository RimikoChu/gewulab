// 压强 · 第 3 课 水里的压强（液体内部压强的四条规律）
// 主操作区只有三个一步到位的按钮；微调全靠直接拖探头，换朝向靠点一下探头。
import { useEffect, useMemo, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { DIRS, PLACES, SITE3, dropFor, kPa, maxDrop3, solve3, type DirKey, type PlaceKey } from './physics'
import { useCrane } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Row { id: number; place: PlaceKey; h: number; dir: DirKey; p: number }
const near = (a: number, b: number) => Math.abs(a - b) < 0.055
const TASKS: (Task & { ok: (rows: Row[]) => boolean })[] = [
  { id: 'dir', text: '同一深度，三个朝向各记一次', note: '朝上、朝下、朝侧面，读数一样：各个方向都有压强，而且相等',
    ok: rows => rows.some(a => a.place === 'water' && new Set(rows.filter(b => b.place === 'water' && near(a.h, b.h)).map(b => b.dir)).size === 3) },
  { id: 'deep', text: '放到更深的地方，再记一次', note: '越深，压强越大',
    ok: rows => { const hs = rows.filter(x => x.place === 'water').map(x => x.h); return hs.length > 1 && Math.max(...hs) - Math.min(...hs) >= 1 } },
  { id: 'mud', text: '换到泥浆井，放到同样的深度', note: '深度一样，泥浆的密度大，压强也大',
    ok: rows => rows.some(a => a.place === 'mud' && rows.some(b => b.place === 'water' && near(a.h, b.h))) },
]
const KEY = 'gewu:pressure:3'
const ORDER: DirKey[] = ['up', 'side', 'down']
type Next = 'shallow' | 'deep' | 'record' | 'turn' | 'place' | null

export default function Lesson3() {
  const [place, setPlace] = useState<PlaceKey>('water')
  const [dir, setDir] = useState<DirKey>('side')
  const crane = useCrane(maxDrop3, 1.3)
  const [rows, setRows] = useState<Row[]>([])
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  const [turned, setTurned] = useState(false)
  const { drop, busy, moving } = crane
  const r = useMemo(() => solve3(drop, place), [drop, place])

  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3600); return () => clearTimeout(t) }, [banner])
  const resetAll = () => { crane.reset(); setPlace('water'); setDir('side'); setRows([]); setDone({}); setFinale(false); setTurned(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const turn = () => { if (busy) return; setTurned(true); setDir(d => ORDER[(ORDER.indexOf(d) + 1) % 3]) }
  /** 换地方：先把探头收上来，吊臂再转过去 */
  const go = (k: PlaceKey) => { if (k !== place) crane.retract(() => setPlace(k)) }

  const under = r.h > 0.3
  const canRecord = !busy && !moving && under
  const dup = rows.some(x => x.place === place && x.dir === dir && near(x.h, r.h))
  const record = () => {
    if (!canRecord || dup) return
    const n = [...rows, { id: Date.now(), place, h: Math.round(r.h * 100) / 100, dir, p: r.p }]
    setRows(n)
    const d = { ...done }; let hit: Task | undefined
    for (const t of TASKS) if (!d[t.id] && t.ok(n)) { d[t.id] = true; hit = t }
    if (!hit) return
    setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
    if (TASKS.every(t => d[t.id])) setFinale(true); else setBanner(hit.note)
  }

  // ---------- 下一步该做什么 ----------
  const task = TASKS.find(t => !done[t.id])
  const here = rows.filter(x => x.place === place && near(x.h, r.h))
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (busy) return { hint: '探头收上来，吊臂转过去…', next: null }
    if (!task) return { hint: '都做完了。再拖一拖探头，看读数怎么跟着深度变。', next: null }
    if (moving) return { hint: '放到位了…', next: null }
    if (task.id === 'dir') {
      if (place !== 'water') return { hint: '先回到水库', next: 'place' }
      if (!under) return { hint: '把探头放进水里：点“放到 2.5 m”，或者直接抓住往下拖', next: 'shallow' }
      if (!dup) return { hint: `橡皮膜${DIRS[dir]}：按“记录数据”`, next: 'record' }
      return { hint: `还差 ${3 - new Set(here.map(x => x.dir)).size} 个朝向：点一下探头，把橡皮膜转个方向`, next: 'turn' }
    }
    if (task.id === 'deep') {
      if (place !== 'water') return { hint: '先回到水库', next: 'place' }
      const hs = rows.filter(x => x.place === 'water').map(x => x.h)
      if (!hs.length || Math.abs(r.h - hs[0]) < 1 || !under) return { hint: '把探头放到更深的地方', next: 'deep' }
      return { hint: '按“记录数据”', next: 'record' }
    }
    if (place !== 'mud') return { hint: '把探头换到泥浆井', next: 'place' }
    const want = rows.filter(x => x.place === 'water').map(x => x.h)
    if (!want.some(h => near(h, r.h))) return { hint: `放到和水库里一样的深度（${[...new Set(want)].map(h => h.toFixed(1)).join(' 或 ')} m）`, next: want.some(h => near(h, SITE3.shallow)) ? 'shallow' : 'deep' }
    return { hint: '按“记录数据”', next: 'record' }
  })()

  // 键盘：↑↓ 升降，←→ 转朝向，空格记录
  const keys = useRef({ step: crane.stepBy, record, turn }); keys.current = { step: crane.stepBy, record, turn }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON' && e.key === ' ') return
      if (e.key === 'ArrowDown') { e.preventDefault(); keys.current.step(0.1) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); keys.current.step(-0.1) }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); keys.current.turn() }
      else if (e.key === ' ') { e.preventDefault(); keys.current.record() }
    }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])

  const lq = PLACES[place]
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} autoStep={() => { if (next !== 'turn') return false; turn(); return true }} title="压强" lessons={LESSONS} current="3" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint} actionsLabel="探头（也可以直接抓住上下拖）"
      stage={<Scene3 r={r} place={place} dir={dir} drop={drop} moving={moving} onDrop={crane.dragTo} onTurn={turn} dragHint={!crane.touched} turnHint={next === 'turn' && !turned} />}
      lesson={
        <LessonBlock no="3" title="水里的压强" concept="越深，压得越厉害" tasks={TASKS} done={done} current={task?.id}
          theory={<>
            <p>液体有重力，又能流动，所以液体<b className="text-white">内部向各个方向</b>都有压强。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">方向：</b>同一深度，向各个方向的压强相等</li>
              <li><b className="text-[#7fe3d4]">深度：</b>深度越大，压强越大</li>
              <li><b className="text-[#7fe3d4]">密度：</b>深度相同时，液体密度越大，压强越大</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">探头上的橡皮膜被压得越凹，说明那里的压强越大。</p>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">液体内部的压强，看深度和密度</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-left text-[14px] text-white/80">
            <li className="rounded-lg bg-white/8 px-3 py-2">同一深度，各个方向的压强相等</li>
            <li className="rounded-lg bg-white/8 px-3 py-2">越深，压强越大</li>
            <li className="rounded-lg bg-white/8 px-3 py-2">深度相同，液体密度越大，压强越大</li>
          </ul>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再拖一拖看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">探头处的压强</div>
            <div key={String(under)} className={cn('mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums', under && 'pop text-[#7fe3d4]')}>{kPa(r.p)}<span className="ml-1 text-[15px] font-medium text-white/55">kPa</span></div>
          </div>

          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="h" value={r.h.toFixed(2)} unit="m · 深度" />
            <ParamTile symbol={<>ρ<sub>液</sub></>} value={(lq.rho / 1000).toFixed(1)} unit={`×10³ · ${lq.liquid}`} />
            <ParamTile symbol="朝向" value={DIRS[dir].replace('朝', '')} unit="橡皮膜" />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{r.inAir ? '探头还在空气里，橡皮膜是平的。' : !under ? '刚进水，再往下放一些。' : '橡皮膜被压凹了。换个朝向试试，读数变不变？'}</p>

          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">探头放进液体里以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">液体</th><th className="text-right font-normal">深度/m</th><th className="text-right font-normal">朝向</th><th className="text-right font-normal">压强/kPa</th></tr></thead>
                <tbody>
                  {rows.map(x => (
                    <tr key={x.id} className="row-in border-t border-white/12">
                      <td className="py-1.5 text-white/80">{PLACES[x.place].liquid}</td><td className="text-right">{x.h.toFixed(2)}</td>
                      <td className="text-right text-white/80">{DIRS[x.dir].replace('朝', '')}</td><td className="text-right font-semibold text-[#7fe3d4]">{kPa(x.p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'shallow'} onClick={() => crane.moveTo(dropFor(SITE3.shallow))} disabled={busy}>放到 {SITE3.shallow} m</LabButton>
        <LabButton pulse={next === 'deep'} onClick={() => crane.moveTo(dropFor(SITE3.deep))} disabled={busy}>放到 {SITE3.deep} m</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!canRecord || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="探头放在哪">
          <Segmented label="探头放在哪" disabled={busy} pulse={next === 'place'} want={task?.id === 'mud' ? 'mud' : 'water'} value={place} onChange={k => go(k as PlaceKey)} options={(Object.keys(PLACES) as PlaceKey[]).map(k => ({ value: k, label: PLACES[k].name }))} />
        </Control>
      }
    />
  )
}
