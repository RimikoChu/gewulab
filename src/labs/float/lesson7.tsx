// 浮力 · 第 7 课 飘在空中（热气球：气体也有浮力；密度计：漂浮时浮力等于重力）
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flame, Wind } from 'lucide-react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import Scene7 from './scene7'
import { LESSONS, goLesson } from './lessons'
import { BALLOON, BASKET, G, LIQUIDS3, METER, RIDERS, flight7, kN, solve7, stemIn, step7, type Flight, type Liquid3Key } from './physics'

type Mode = 'balloon' | 'meter'
const FLIGHT: Record<Flight, { name: string; color: string }> = {
  ground: { name: '停在地面', color: '#ffffff' }, rising: { name: '上升', color: '#7fe3d4' }, hover: { name: '悬停', color: '#ffe9a8' },
  falling: { name: '下降', color: '#ffb394' }, tether: { name: '绳子拉住了', color: '#7fe3d4' },
}
interface Now { mode: Mode; riders: boolean; f: Flight; alt: number; seen: number }
const TASKS: (Task & { ok: (s: Now) => boolean })[] = [
  { id: 'lift', text: '点火加热，让气球离开地面', note: '球里的空气热了变稀，整个气球比同体积的冷空气轻', ok: s => s.mode === 'balloon' && s.alt > 1 },
  { id: 'hover', text: '调到悬停：不升也不降', note: '浮力正好等于总重力', ok: s => s.mode === 'balloon' && !s.riders && s.f === 'hover' && s.alt > 1 },
  { id: 'riders', text: '再上两位乘客，重新悬停', note: '更重了，要烧得更热才托得住', ok: s => s.mode === 'balloon' && s.riders && s.f === 'hover' && s.alt > 1 },
  { id: 'meter', text: '换成密度计，三种液体各放一次', note: '液体越密，密度计浮得越高', ok: s => s.mode === 'meter' && s.seen >= 3 },
]
const KEY = 'gewu:float:7'

export default function Lesson7() {
  const [mode, setMode] = useState<Mode>('balloon')
  const [t, setT] = useState(BALLOON.tMin)
  const [riders, setRiders] = useState(false)
  const [liquid, setLiquid] = useState<Liquid3Key>('fresh')
  const [seen, setSeen] = useState<Liquid3Key[]>([])
  const [fly, setFly] = useState({ alt: 0, v: 0 })
  const [burning, setBurning] = useState(false)
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  const r = useMemo(() => solve7(t, riders), [t, riders])

  // 气球自己的运动：每一帧往前算一小步
  const sim = useRef({ alt: 0, v: 0, net: r.net }); sim.current.net = r.net
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      let dt = Math.min(0.06, (now - last) / 1000); last = now
      const s = sim.current; let n = { alt: s.alt, v: s.v }
      for (; dt > 1e-6; dt -= 0.02) n = step7(n.alt, n.v, s.net, Math.min(0.02, dt))
      if (Math.abs(n.alt - s.alt) > 1e-4 || Math.abs(n.v - s.v) > 1e-4) { Object.assign(s, n); setFly(n) }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const heat = (d: number) => { setT(x => Math.min(BALLOON.tMax, Math.max(BALLOON.tMin, x + d))); if (d > 0) { setBurning(true); setTimeout(() => setBurning(false), 900) } }
  const dip = (k: Liquid3Key) => { setLiquid(k); setSeen(s => s.includes(k) ? s : [...s, k]) }
  const pick = (m: Mode) => { setMode(m); if (m === 'meter') setSeen(s => s.includes(liquid) ? s : [...s, liquid]) }

  const f = flight7(fly.alt, fly.v, r.net)
  const now: Now = { mode, riders, f, alt: fly.alt, seen: seen.length }
  const sig = `${mode}|${riders}|${f}|${fly.alt > 1}|${seen.length}`
  useEffect(() => {
    const hit = TASKS.find(x => !done[x.id] && x.ok(now)); if (!hit) return
    const timer = setTimeout(() => {
      const d = { ...done, [hit.id]: true }
      setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
      if (TASKS.every(x => d[x.id])) setFinale(true); else setBanner(hit.note)
    }, 900)
    return () => clearTimeout(timer)
  }, [sig, done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!banner) return; const x = setTimeout(() => setBanner(null), 3800); return () => clearTimeout(x) }, [banner])
  const resetAll = () => { setMode('balloon'); setT(BALLOON.tMin); setRiders(false); setLiquid('fresh'); setSeen([]); Object.assign(sim.current, { alt: 0, v: 0 }); setFly({ alt: 0, v: 0 }); setDone({}); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }

  // ---------- 下一步该做什么 ----------
  const task = TASKS.find(x => !done[x.id])
  const { hint, next }: { hint: string; next: 'hot' | 'cool' | 'riders' | 'mode' | 'liquid' | null } = (() => {
    if (!task) return { hint: '都做完了。', next: null }
    if (task.id === 'meter') return mode !== 'meter' ? { hint: '把器材换成密度计', next: 'mode' } : { hint: `换一种液体，看密度计浮到哪（已看 ${seen.length} / 3）`, next: 'liquid' }
    if (mode !== 'balloon') return { hint: '先换回热气球', next: 'mode' }
    if (task.id === 'lift') return { hint: fly.alt > 0.05 ? '离地了…' : '按“点火加热”，一直加热到它飘起来', next: fly.alt > 0.05 ? null : 'hot' }
    if (task.id === 'riders' && !riders) return { hint: '让两位乘客上吊篮', next: 'riders' }
    if (task.id === 'hover' && riders) return { hint: '先让乘客下来', next: 'riders' }
    if (Math.abs(r.net) < 40) return { hint: fly.alt > 1 ? '浮力等于重力：等它停稳…' : '力平衡了，但它还在地面：先多加热一点升起来，再降回这个温度', next: fly.alt > 1 ? null : 'hot' }
    return r.net > 0 ? { hint: '浮力比重力大，它还在往上：放掉一点热气', next: 'cool' } : { hint: '重力比浮力大：再加热', next: 'hot' }
  })()

  const balloon = mode === 'balloon', rho = LIQUIDS3[liquid].rho
  return (
    <LabShell title="浮力" lessons={LESSONS} current="7" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      actionsLabel={balloon ? '燃烧器（每次 10 °C）' : '把密度计放进'}
      stage={<Scene7 mode={mode} r={r} t={t} alt={fly.alt} burning={burning} liquid={liquid} />}
      lesson={
        <LessonBlock no="7" title="飘在空中" concept="气体也会托东西：比周围的空气轻，就往上飘" tasks={TASKS} done={done} current={task?.id}
          theory={<>
            <p>阿基米德原理对气体同样成立：浸在空气里的物体，受到的浮力等于它<b className="text-white">排开的空气</b>所受的重力。</p>
            <p className="my-3 rounded-xl bg-white/8 py-3 text-center font-formula text-[19px] text-white italic">F<sub>浮</sub> = ρ<sub>空气</sub> g V</p>
            <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">热气球：</b>体积不变，浮力不变；加热让球内空气变稀、变轻，总重力小于浮力就上升</li>
              <li><b className="text-[#ffd27a]">密度计：</b>总是漂浮，浮力总等于自己的重力；液体越密，需要排开的体积越小，浮得越高</li>
            </ul>
          </>} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">最后一课做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">液体和气体，都会把东西往上托</p>
          <p className="mt-2 font-formula text-[19px] italic text-white/85">F<sub>浮</sub> = ρ g V<sub>排</sub></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">想上升，就让自己比排开的那部分流体轻；漂浮或悬停时，浮力正好等于重力。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再飞一会儿</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {balloon ? <>
            <div key={f} className="pop text-center text-[32px] leading-none font-bold" style={{ color: FLIGHT[f].color }}>{FLIGHT[f].name}</div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <div><div className="font-formula text-[18px] italic text-white/65">F<sub>浮</sub></div><div className="text-[30px] leading-none font-bold tabular-nums">{kN(r.fBuoy)}<span className="ml-1 text-[13px] font-medium text-white/55">kN</span></div></div>
              <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xl font-bold">{Math.abs(r.net) < 40 ? '=' : r.net > 0 ? '>' : '<'}</span>
              <div><div className="font-formula text-[18px] italic text-white/65">G<sub>总</sub></div><div className="text-[30px] leading-none font-bold tabular-nums">{kN(r.g)}<span className="ml-1 text-[13px] font-medium text-white/55">kN</span></div></div>
            </div>
            <p className="mt-2 text-center text-[13px] text-white/55 tabular-nums">G总 = 球内热空气 {kN(r.gAir)} + 球囊吊篮和人 {kN(r.gLoad)}</p>

            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数（球内 {t} °C，球外 {BALLOON.tOut} °C）</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol={<>ρ<sub>外</sub></>} value={BALLOON.rhoOut.toFixed(2)} unit="kg/m³ · 冷空气" />
              <ParamTile symbol={<>ρ<sub>内</sub></>} value={r.rhoIn.toFixed(2)} unit="kg/m³ · 热空气" />
              <ParamTile symbol="V" value={String(BALLOON.V)} unit="m³ · 球囊" />
            </div>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">
              <i>F<sub>浮</sub></i> = <i>ρ<sub>外</sub> g V</i> = {BALLOON.rhoOut.toFixed(2)} × {G} × {BALLOON.V} = <b className="text-white">{kN(r.fBuoy)} kN</b>
            </p>
            <p className="mt-2 text-[13.5px] leading-snug text-white/65">加热不会改变浮力，只会让球里的空气变轻。{f === 'tether' && '现在浮力比重力大，多出来的力由系留绳拉着。'}</p>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">{LIQUIDS3[liquid].name}的密度</div>
              <div key={liquid} className="pop mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{(rho / 1000).toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">×10³ kg/m³</span></div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="G" value={(METER.mass * G).toFixed(2)} unit="N · 密度计" />
              <ParamTile symbol={<>F<sub>浮</sub></>} value={(METER.mass * G).toFixed(2)} unit="N · 总等于 G" />
              <ParamTile symbol={<>V<sub>排</sub></>} value={(METER.mass / rho * 1e6).toFixed(1)} unit="cm³" />
            </div>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70"><i>V<sub>排</sub></i> = <i>m</i> ÷ <i>ρ<sub>液</sub></i> = 60 g ÷ {(rho / 1000).toFixed(2)} g/cm³ = <b className="text-white">{(METER.mass / rho * 1e6).toFixed(1)} cm³</b></p>
            <h2 className="mt-5 text-[12.5px] text-white/55">细管浸在液面下的长度</h2>
            <table className="mt-1 w-full text-[13.5px] tabular-nums">
              <tbody>
                {(Object.keys(LIQUIDS3) as Liquid3Key[]).filter(k => seen.includes(k)).map(k => (
                  <tr key={k} className="row-in border-t border-white/12 first:border-0">
                    <td className="py-1.5 text-white/80">{LIQUIDS3[k].name}</td><td className="text-right text-white/60">{(LIQUIDS3[k].rho / 1000).toFixed(2)}</td>
                    <td className="text-right font-semibold">{(stemIn(LIQUIDS3[k].rho) * 100).toFixed(1)} <span className="text-[12px] font-normal text-white/50">cm</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">细管上的刻度，上面的数小，下面的数大。</p>
          </>}
        </Glass>
      }
      actions={balloon ? <>
        <LabButton onClick={() => heat(-BALLOON.tStep)} disabled={t <= BALLOON.tMin} pulse={next === 'cool'}><Wind className="size-4" />放气降温</LabButton>
        <LabButton primary onClick={() => heat(BALLOON.tStep)} disabled={t >= BALLOON.tMax} pulse={next === 'hot'}><Flame className="size-4" />点火加热</LabButton>
      </> : (Object.keys(LIQUIDS3) as Liquid3Key[]).map(k => <LabButton key={k} primary={k === liquid} pulse={next === 'liquid' && !seen.includes(k)} onClick={() => dip(k)}>{LIQUIDS3[k].name}</LabButton>)}
      extras={<>
        {balloon && <Control label={`吊篮里（空载 ${BASKET} kg，两位乘客 ${RIDERS} kg）`}>
          <Segmented label="乘客" pulse={next === 'riders'} want={task?.id === 'riders' ? 'yes' : 'no'} value={riders ? 'yes' : 'no'} onChange={v => setRiders(v === 'yes')} options={[{ value: 'no', label: '只有驾驶员' }, { value: 'yes', label: '再上两位乘客' }]} />
        </Control>}
        <Control label="器材">
          <Segmented label="器材" pulse={next === 'mode'} want={task?.id === 'meter' ? 'meter' : 'balloon'} value={mode} onChange={pick} options={[{ value: 'balloon', label: '热气球' }, { value: 'meter', label: '密度计' }]} />
        </Control>
      </>}
    />
  )
}
