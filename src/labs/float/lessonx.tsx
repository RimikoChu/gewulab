// 浮力 · 拓展课：冰山、沉船打捞、太空里的浮力、王冠是不是纯金。四个小实验共用一页。
import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, Minus, Plus } from 'lucide-react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import SceneX, { type Sub } from './scenex'
import { LESSONS, goLesson } from './lessons'
import { BASE5, CROWN, CYL, G, GOLD, LIQUIDS, POOL, WRECK, iceBerg, kN, salvage, stepG, type CrownKey, type LiquidKey } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const SUBS: Record<Sub, { name: string; title: string; concept: string }> = {
  ice: { name: '冰山', title: '冰山的九成在水下', concept: '冰化了，水面会升高吗' },
  salvage: { name: '沉船', title: '把沉船捞上来', concept: '浮力不够，就多排开一些水' },
  space: { name: '太空', title: '太空里浮力消失了', concept: '没有重力，水就不往上托了' },
  crown: { name: '王冠', title: '王冠是不是纯金', concept: '一样重的东西，谁排开的水多' },
}
const ORDER: Sub[] = ['ice', 'salvage', 'space', 'crown']
const FLOOR = POOL.floor - POOL.brim, LIFTED = -1.95, CRATE = 600
const TASKS: Task[] = [
  { id: 'ice', text: '冰山：让冰融化，看水面变不变', note: '冰化成的水，正好填满它原来排开的那部分' },
  { id: 'salvage', text: '沉船：加浮筒，把它从海底捞起来', note: '浮筒排开的水够多，总浮力就超过了重力' },
  { id: 'space', text: '太空：关掉重力，把木箱按到水下', note: '水没有了重力，也就没有压力差：木箱留在原地' },
  { id: 'crown', text: '王冠：把金块和王冠各放进溢水杯一次', note: '一样重，王冠排开的水更多：它不是纯金' },
]
const KEY = 'gewu:float:x'

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('ice')
  const [liquid, setLiquid] = useState<LiquidKey>('fresh')
  const [bags, setBags] = useState(0)
  const [zeroG, setZeroG] = useState(false)
  const [got, setGot] = useState<Partial<Record<CrownKey, number>>>({})
  const [, redraw] = useState(0)
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  const rho = LIQUIDS[liquid].rho

  // ---------- 会动的量都放在这里，每一帧往前算一小步 ----------
  const S = useRef({ melt: 0, melting: false, wb: FLOOR, sb: BASE5 - CRATE / 1000, sv: 0, held: false, item: null as CrownKey | null, p: 0 })
  const live = useRef({ sub, rho, bags, g: zeroG ? 0 : G }); live.current = { sub, rho, bags, g: zeroG ? 0 : G }
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.06, (now - last) / 1000); last = now
      const s = S.current, L = live.current; let dirty = false
      if (s.melting && s.melt < 1) { s.melt = Math.min(1, s.melt + dt / 5); dirty = true }
      const goal = salvage(L.bags, L.rho).up ? LIFTED : FLOOR
      if (Math.abs(goal - s.wb) > 1e-4) { const sp = (goal > s.wb ? 0.45 : 0.9) * dt; s.wb = Math.abs(goal - s.wb) <= sp ? goal : s.wb + Math.sign(goal - s.wb) * sp; dirty = true }
      if (L.sub === 'space' && !s.held) {
        let b = s.sb, v = s.sv
        for (let t = dt; t > 1e-6; t -= 0.01) { const n = stepG(b, v, CRATE, L.rho, L.g, Math.min(0.01, t)); b = n.b; v = n.v }
        if (Math.abs(b - s.sb) > 1e-5 || Math.abs(v - s.sv) > 1e-4) { s.sb = b; s.sv = v; dirty = true }
      }
      if (s.item && s.p < 1) { s.p = Math.min(1, s.p + dt / 1.7); dirty = true }
      if (dirty) redraw(n => n + 1)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const s = S.current
  const ice = iceBerg(s.melt, rho), start = iceBerg(0, rho).level
  const sv = salvage(bags, rho)
  const sp = stepG(s.sb, s.sv, CRATE, rho, zeroG ? 0 : G, 0)
  const inWater = Math.min(1, Math.max(0, (s.p - 0.55) / 0.22))
  const ml = CYL.start + (s.item ? CROWN[s.item].V * inWater : 0)

  const freeze = () => { s.melt = 0; s.melting = false; redraw(n => n + 1) }
  const dropping = !!s.item && s.p < 1
  const drop = (k: CrownKey) => { if (dropping) return; s.item = k; s.p = 0; redraw(n => n + 1) }
  // 物体到了筒底，把这次的读数记下来
  useEffect(() => { if (s.item && s.p >= 1 && got[s.item] == null) setGot(g => ({ ...g, [s.item!]: CYL.start + CROWN[s.item!].V })) })
  const pick = (k: Sub) => { setSub(k); if (k === 'space') { s.sb = BASE5 - CRATE / rho; s.sv = 0 } }
  const swapLiquid = (k: LiquidKey) => { setLiquid(k); if (sub === 'ice') freeze() }

  // ---------- 任务 ----------
  const lifted = s.wb > FLOOR + 0.5
  const stuck = zeroG && sp.wet > 0.99 && Math.abs(s.sv) < 0.01 && s.sb > FLOOR + 0.3
  const ok: Record<Sub, boolean> = { ice: s.melt >= 1, salvage: lifted, space: stuck, crown: got.gold != null && got.crown != null }
  const sig = ORDER.map(k => ok[k]).join()
  useEffect(() => {
    const hit = TASKS.find(t => !done[t.id] && ok[t.id as Sub]); if (!hit) return
    const timer = setTimeout(() => {
      const d = { ...done, [hit.id]: true }
      setDone(d); try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 忽略 */ }
      if (TASKS.every(x => d[x.id])) setFinale(true)
      else setBanner(hit.id === 'ice' && liquid === 'sea' ? '在海水里：化成的淡水比排开的海水多一点，水面略微升高' : hit.note)
    }, 900)
    return () => clearTimeout(timer)
  }, [sig, done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 4200); return () => clearTimeout(t) }, [banner])
  const resetAll = () => { Object.assign(s, { melt: 0, melting: false, wb: FLOOR, sb: BASE5 - CRATE / 1000, sv: 0, item: null, p: 0 }); setSub('ice'); setLiquid('fresh'); setBags(0); setZeroG(false); setGot({}); setDone({}); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }

  // ---------- 下一步该做什么 ----------
  const nextSub = ORDER.find(k => !done[k])
  const { hint, next }: { hint: string; next: string | null } = (() => {
    if (done[sub]) return nextSub ? { hint: `这个做完了。接着做：${SUBS[nextSub].name}`, next: 'sub' } : { hint: '四个拓展实验都做完了。', next: null }
    if (sub === 'ice') return s.melting ? { hint: '看水面和黄线…', next: null } : { hint: '按“让冰融化”，盯住槽壁上那道黄线', next: 'melt' }
    if (sub === 'salvage') return sv.up ? { hint: '浮力超过重力了：它正在离开海底', next: null } : { hint: `浮力还不够（差 ${kN(-sv.net)} kN）：再加一只浮筒`, next: 'plus' }
    if (sub === 'space') return !zeroG ? { hint: '先试一次：把木箱按到水下，它会浮回来。然后把重力关掉', next: 'g' } : { hint: sp.wet > 0.99 ? '松手了，它一动不动…' : '把木箱按到水下再松手', next: sp.wet > 0.99 ? null : 'push' }
    return got.gold == null ? { hint: '先把金块放进装满水的溢水杯', next: 'gold' } : got.crown == null ? { hint: '再把一样重的王冠放进去', next: 'crown' } : { hint: '', next: null }
  })()

  const info = SUBS[sub]
  const dens = (k: CrownKey) => got[k] != null ? (GOLD.mass / (got[k]! - CYL.start)).toFixed(1) : '—'
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="浮力" lessons={LESSONS} current="x" onLesson={goLesson} banner={banner} onReset={resetAll} hint={hint}
      actionsLabel={{ ice: '冰', salvage: '浮筒（每只排开 0.5 m³ 的水）', space: '木箱（也可以直接拖）', crown: '溢水杯' }[sub]}
      stage={<SceneX sub={sub} liquid={liquid}
        ice={{ side: ice.side, level: ice.level, bottom: ice.bottom, under: ice.under, start }}
        wreck={{ b: s.wb, bags, level: sv.level, g: sv.g, fBuoy: sv.fBuoy }}
        space={{ b: s.sb, level: sp.level, wet: sp.wet, g: zeroG ? 0 : G, fBuoy: sp.fBuoy, mass: CRATE, onMove: b => { s.held = true; s.sb = b; s.sv = 0; redraw(n => n + 1) }, onEnd: () => { s.held = false } }}
        crown={{ item: s.item, p: s.p, ml }} />}
      lesson={
        <LessonBlock no="拓展" title={info.title} concept={info.concept} tasks={TASKS} done={done} current={sub}
          theory={{
            ice: <><p>冰浮在水面上，受到的浮力等于它的重力，所以它排开的水<b className="text-white">和它自己一样重</b>。冰化成水，质量不变，体积正好等于原来排开的那部分水。</p><p className="mt-2 text-white/80">在淡水里，水面不变。在海水里，化成的淡水体积比排开的海水略大，水面会升高一点。</p></>,
            salvage: <><p>沉船受的浮力比重力小得多。在它上面系上充满空气的浮筒，<b className="text-white">总的排开体积</b>变大，总浮力变大；浮筒自己很轻，总重力几乎不变。</p><p className="mt-2 text-white/80">浮力超过重力，沉船就离开水底。</p></>,
            space: <><p>浮力来自液体上下的压强差，而压强差来自<b className="text-white">液体自己的重力</b>。在空间站里一切都处于失重状态，水不再产生压强差，浮力就消失了。</p><p className="mt-2 text-white/80">2021 年“天宫课堂”上，乒乓球被按进水里后停在原地，没有浮起来。</p></>,
            crown: <><p>传说国王怀疑金匠在王冠里掺了银。阿基米德把王冠和一块<b className="text-white">一样重</b>的纯金分别放进水里：银比金轻，掺了银的王冠体积更大，排开的水更多。</p><p className="mt-2 font-formula text-[17px] italic text-white">ρ = m ÷ V</p></>,
          }[sub]} />
      }
      finale={finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四个拓展实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">课本外面，还是同一个道理</p>
          <p className="mt-3 text-left text-[14px] leading-relaxed text-white/75">冰山：漂浮时，排开的水和自己一样重。<br />沉船：多排开一些水，浮力就够了。<br />太空：没有重力，就没有浮力。<br />王冠：一样重，体积大的密度小。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'ice' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">水面比融化前</div>
              <div className="mt-1 text-[40px] leading-none font-bold tabular-nums">{ice.rise * 1000 < 0.05 ? '不变' : `+${(ice.rise * 1000).toFixed(1)}`}{ice.rise * 1000 >= 0.05 && <span className="ml-1 text-[15px] font-medium text-white/55">mm</span>}</div></div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="m冰" value={ice.left.toFixed(0)} unit="kg · 还没化的" />
              <ParamTile symbol={<>V<sub>排</sub></>} value={ice.vDisp.toFixed(2)} unit="m³ · 冰排开的" />
              <ParamTile symbol={<>V<sub>水</sub></>} value={ice.vMelt.toFixed(2)} unit="m³ · 化成的" />
            </div>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70"><i>V<sub>排</sub></i> + <i>V<sub>水</sub></i> = {ice.vDisp.toFixed(3)} + {ice.vMelt.toFixed(3)} = <b className="text-white">{(ice.vDisp + ice.vMelt).toFixed(3)} m³</b></p>
            <p className="mt-2 text-[13.5px] leading-snug text-white/65">冰露在水面上的部分占 {Math.round((1 - 900 / rho) * 100)}%，水下占 {Math.round(900 / rho * 100)}%。</p>
          </>}
          {sub === 'salvage' && <>
            <div className="pop text-center text-[32px] leading-none font-bold" key={String(lifted)} style={{ color: lifted ? '#7fe3d4' : '#ffb394' }}>{lifted ? '捞起来了' : sv.up ? '上浮中' : '沉在海底'}</div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <div><div className="font-formula text-[18px] italic text-white/65">F<sub>浮</sub></div><div className="text-[30px] leading-none font-bold tabular-nums">{kN(sv.fBuoy)}<span className="ml-1 text-[13px] font-medium text-white/55">kN</span></div></div>
              <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xl font-bold">{sv.up ? '>' : '<'}</span>
              <div><div className="font-formula text-[18px] italic text-white/65">G<sub>总</sub></div><div className="text-[30px] leading-none font-bold tabular-nums">{kN(sv.g)}<span className="ml-1 text-[13px] font-medium text-white/55">kN</span></div></div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="n" value={String(bags)} unit="只浮筒" />
              <ParamTile symbol={<>V<sub>排</sub></>} value={sv.V.toFixed(2)} unit="m³ · 船 + 浮筒" />
              <ParamTile symbol={<>ρ<sub>液</sub></>} value={(rho / 1000).toFixed(2)} unit="×10³ kg/m³" />
            </div>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70"><i>V<sub>排</sub></i> = {WRECK.V.toFixed(2)} + {bags} × {WRECK.bagV} = <b className="text-white">{sv.V.toFixed(2)} m³</b></p>
          </>}
          {sub === 'space' && <>
            <div className="text-center"><div className="font-formula text-[18px] italic text-white/65">F<sub>浮</sub> = ρ<sub>液</sub> g V<sub>排</sub></div>
              <div key={String(zeroG)} className="pop mt-1 text-[44px] leading-none font-bold tabular-nums" style={{ color: zeroG ? '#ffe9a8' : '#ffffff' }}>{kN(sp.fBuoy)}<span className="ml-1 text-[15px] font-medium text-white/55">kN</span></div></div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="g" value={zeroG ? '≈ 0' : '9.8'} unit={zeroG ? '空间站里' : 'N/kg · 地面'} />
              <ParamTile symbol={<>V<sub>排</sub></>} value={sp.wet.toFixed(2)} unit="m³" />
              <ParamTile symbol="G" value={kN(CRATE * (zeroG ? 0 : G))} unit="kN · 木箱" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">{zeroG ? '重力“关掉”以后，木箱和水都没有了重力：把它放在哪，它就停在哪。' : '在地面上，把木箱按到水下再松手，浮力比重力大，它会浮回来。'}</p>
          </>}
          {sub === 'crown' && <>
            <div key={String(ok.crown)} className="pop text-center text-[28px] leading-tight font-bold" style={{ color: ok.crown ? '#ffb394' : '#ffffff' }}>{ok.crown ? '王冠掺了别的金属' : '都是 1000 g'}</div>
            <table className="mt-4 w-full text-[14px] tabular-nums">
              <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal" /><th className="text-right font-normal">质量/g</th><th className="text-right font-normal">体积/cm³</th><th className="text-right font-normal">密度/g·cm⁻³</th></tr></thead>
              <tbody>
                {(['gold', 'crown'] as CrownKey[]).map(k => (
                  <tr key={k} className="border-t border-white/12"><td className="py-2 text-white/85">{CROWN[k].name}</td><td className="text-right">{GOLD.mass}</td>
                    <td className="text-right">{got[k] != null ? (got[k]! - CYL.start).toFixed(1) : '—'}</td><td className="text-right font-semibold text-[#7fe3d4]">{dens(k)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">体积 = 流进量杯的水（1 mL = 1 cm³）</p>
            <p className="mt-2 text-[13.5px] leading-snug text-white/65">纯金的密度是 19.3 g/cm³。{ok.crown && `王冠只有 ${dens('crown')}，说明里面掺了密度更小的金属。`}</p>
          </>}
        </Glass>
      }
      actions={{
        ice: <><LabButton onClick={freeze} disabled={s.melt === 0}>重新冻上</LabButton><LabButton primary pulse={next === 'melt'} onClick={() => { s.melting = true; redraw(n => n + 1) }} disabled={s.melting}>让冰融化</LabButton></>,
        salvage: <><LabButton onClick={() => setBags(n => Math.max(0, n - 1))} disabled={bags <= 0}><Minus className="size-4" />减一只</LabButton><LabButton primary pulse={next === 'plus'} onClick={() => setBags(n => Math.min(WRECK.maxBags, n + 1))} disabled={bags >= WRECK.maxBags}><Plus className="size-4" />加一只浮筒</LabButton></>,
        space: <LabButton primary pulse={next === 'push'} onClick={() => { s.sb = -1.7; s.sv = 0; redraw(n => n + 1) }}><ArrowDownToLine className="size-4" />按到水下</LabButton>,
        crown: <><LabButton primary={next === 'gold'} pulse={next === 'gold' && !dropping} disabled={dropping} onClick={() => drop('gold')}>放进金块</LabButton><LabButton primary={next === 'crown'} pulse={next === 'crown' && !dropping} disabled={dropping} onClick={() => drop('crown')}>放进王冠</LabButton><LabButton onClick={() => { s.item = null; s.p = 0; redraw(n => n + 1) }} disabled={!s.item}>取出来</LabButton></>,
      }[sub]}
      extras={<>
        {sub === 'space' && <Control label="重力"><Segmented label="重力" pulse={next === 'g'} want={'zero'} value={zeroG ? 'zero' : 'earth'} onChange={v => setZeroG(v === 'zero')} options={[{ value: 'earth', label: '地面' }, { value: 'zero', label: '空间站（失重）' }]} /></Control>}
        {sub !== 'crown' && <Control label="液体"><Segmented label="液体" value={liquid} onChange={swapLiquid} options={(Object.keys(LIQUIDS) as LiquidKey[]).map(k => ({ value: k, label: LIQUIDS[k].name }))} /></Control>}
        <Control label="拓展实验"><Segmented label="拓展实验" pulse={next === 'sub'} want={nextSub ?? null} value={sub} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>
      </>}
    />
  )
}
