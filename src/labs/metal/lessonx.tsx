// 金属和炼铁 · 拓展课 轧钢车间：高炉炼出的生铁含碳多，炼成钢、铸成钢坯以后送到这里。
// 红热的钢坯（厚 230 mm、长 10 m）从加热炉里出来，在一架可逆轧机里来回轧五道，每道变薄、变长；最后比一比生铁和钢的含碳量。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Glow, Puffs, useMolten } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, seg, useRun } from './parts'
import { MILL } from './mill'
import { CARBON, PASSES, SLAB, rolled } from './physics'
import { M, Place, spot, type V3 } from './world'

const S = MILL.stand, TY = MILL.table + 0.1
const w = (x: number, y: number, z: number): V3 => [MILL.x + x * M, y * M, MILL.z + z * M]
const VIEW = spot(MILL.x + (S + 1) * M, 2.6 * M, MILL.z - 1 * M, 24 * M, 11 * M, [-0.3, 0.34], false, [900, 6000])
const SEC = { out: 4.5, pass: 3.2 }
const WIDTH = 2.4
type Kind = 'pig' | 'steel'
const TASKS: Task[] = [
  { id: 'out', text: '从加热炉里送出钢坯', note: '钢坯加热到红热，变软，才容易轧' },
  { id: 'roll', text: '轧五道，看厚度和长度', note: `厚 ${SLAB.thick} mm 轧到 ${PASSES[PASSES.length - 1]} mm，长度从 ${SLAB.len} m 变成约 ${rolled(SLAB.len, SLAB.thick, PASSES[PASSES.length - 1]).toFixed(0)} m` },
  { id: 'carbon', text: '比较生铁和钢的含碳量', note: '生铁含碳 2%–4.3%，钢含碳 0.03%–2%' },
]

export default function LessonX() {
  const T = useTasks('gewu:metal:x', TASKS)
  const [n, setN] = useState(0)                       // 已经轧了几道
  const [kind, setKind] = useState<Kind>('steel')
  const [seen, setSeen] = useState<Partial<Record<Kind, boolean>>>({})
  const out = useRun(SEC.out, () => T.check(id => id === 'out'))
  const pass = useRun(SEC.pass, () => { const k = n + 1; setN(k); if (k === PASSES.length) T.check(id => id === 'roll') })
  const resetAll = () => { out.snap(0); pass.snap(0); setN(0); setKind('steel'); setSeen({}); T.reset() }
  const pick = (k: Kind) => { setKind(k); const s = { ...seen, [k]: true }; setSeen(s); if (s.pig && s.steel) T.check(id => id === 'carbon') }
  const task = T.current?.id

  // 钢坯：轧之前的厚度、长度；正在轧的这一道已经轧过去的比例 q
  const t0 = n === 0 ? SLAB.thick : PASSES[n - 1], L0 = rolled(SLAB.len, SLAB.thick, t0)
  const t1 = PASSES[Math.min(n, PASSES.length - 1)], L1 = rolled(SLAB.len, SLAB.thick, t1)
  const q = pass.busy ? ease(seg(pass.t, 0.2, SEC.pass - 0.2)) : 0
  const dir = n % 2 === 0 ? 1 : -1                     // 第 1、3、5 道往东（+x）轧，第 2、4 道往西
  const outK = T.done.out ? 1 : out.busy ? ease(out.t / SEC.out) : 0
  const visible = outK > 0
  // 没轧的那段贴着轧机的入口一侧，轧过的那段从出口一侧伸出去
  const inLen = L0 * (1 - q), outLen = L1 * q
  const gap = 1.2
  const inCenter = S - dir * (gap + inLen / 2)
  const startX = lerp(MILL.furnaceDoor - SLAB.len / 2 - 1, S - gap - SLAB.len / 2, outK)
  const heat = Math.max(0.55, 1 - n * 0.07)
  const thick = (t: number) => t / 1000 * 1.6         // 画面上把厚度画大 1.6 倍，薄板也看得见
  const nowThick = n === 0 ? SLAB.thick : PASSES[n - 1], nowLen = rolled(SLAB.len, SLAB.thick, nowThick)

  const next = out.busy || pass.busy ? null : !T.done.out ? 'out' : n < PASSES.length ? 'pass' : !T.done.carbon ? 'kind' : null
  const want: Kind = seen.pig ? 'steel' : 'pig'
  const hint = !task ? '生铁含碳多、硬而脆；钢含碳少、韧性好，能轧、能锻。'
    : out.busy ? '炉门升起，红热的钢坯被辊道送出来…'
    : pass.busy ? `第 ${n + 1} 道：轧辊把钢坯压薄…`
    : !T.done.out ? '加热炉里是加热到红热的钢坯。把它送出来'
    : n < PASSES.length ? `轧第 ${n + 1} 道`
    : `比一比生铁和钢：看${CARBON[want].name}`

  const labels: Label[] = [
    { id: 'n1', at: w(-8, 9, 4), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '加热炉' },
    { id: 'n2', at: w(S, 12, 2), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '轧机' },
    ...(visible ? [{ id: 'k1', at: w(pass.busy ? S + dir * (gap + outLen / 2 + 2) : n === 0 ? startX : S + (n % 2 ? 1 : -1) * (gap + nowLen / 2), TY + 1.4, 1.6), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>钢坯</small>{pass.busy ? `轧第 ${n + 1} 道…` : `厚 ${nowThick} mm · 长 ${nowLen.toFixed(1)} m`}</> }] : []),
    ...(T.done.roll ? [{ id: 'k2', at: w(20, 1.2, 9), ax: 0.5, className: `scene-tag ${kind === 'pig' ? 'key' : ''} -translate-y-full`, children: <><small>生铁锭</small>含碳 {CARBON.pig.lo}%–{CARBON.pig.hi}%</> }] : []),
  ]
  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="轧钢"
      stage={<Place at={VIEW} labels={labels}>
        {visible && <Slabs heat={heat} parts={pass.busy ? [[inCenter, inLen, thick(t0)], [S + dir * (gap + outLen / 2), outLen, thick(t1)]] : [[n === 0 ? startX : S + (n % 2 ? 1 : -1) * (gap + nowLen / 2), nowLen, thick(nowThick)]]} />}
        {visible && <Glow at={w(pass.busy ? S : n === 0 ? startX : S + (n % 2 ? 1 : -1) * (gap + 3), TY + 0.4, 0)} size={9 * M} color="#ff8a3a" level={0.5 * heat} flicker={0.04} light={500} distance={90} />}
        {/* 轧的时候，高压水打掉氧化铁皮，冒起一团白汽 */}
        <Puffs at={w(S, TY + 0.6, 0)} on={pass.busy} opt={{ rate: 10, life: 3, size: [1.2 * M, 4 * M], speed: 1.4 * M, dir: [0, 1, 0.2], spread: 0.8, color: '#eeeeea', opacity: 0.45, jitter: 0.8 * M }} seed={8} />
        {/* 生铁锭：一摞铸出来的锭块 */}
        {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={w(18 + (i % 3) * 1.1, 0.18 + Math.floor(i / 3) * 0.32, 9 + (i % 2) * 0.2)} rotation-y={0.1}><boxGeometry args={[0.9, 0.3, 0.45].map(v => v * M) as [number, number, number]} /><meshStandardMaterial color="#3a3836" roughness={0.85} metalness={0.5} /></mesh>)}
      </Place>}
      lesson={<LessonBlock no="拓展" title="轧钢车间" concept="生铁炼成钢，红热的钢坯轧成钢板" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p><b className="text-white">生铁和钢</b>都是铁的合金，主要区别是含碳量不同：生铁含碳 {CARBON.pig.lo}%–{CARBON.pig.hi}%，钢含碳 {CARBON.steel.lo}%–{CARBON.steel.hi}%。生铁硬而脆，钢的韧性好，能轧、能锻。</p>
          <p className="mt-3">高炉炼出的生铁送去炼钢，降低含碳量、除去杂质，再铸成钢坯。钢坯在加热炉里加热到红热，送进轧机，一道道压薄、拉长，轧成钢板。</p>
          <p className="mt-3 text-[13.5px] text-white/65">画面上每道的厚度是示意；轧的时候宽度不变，按体积不变算出长度。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">钢的含碳量比生铁低，能轧成钢板</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{SLAB.thick} mm 厚、{SLAB.len} m 长的钢坯轧五道成 {PASSES[PASSES.length - 1]} mm 厚的钢板，长约 {rolled(SLAB.len, SLAB.thick, PASSES[PASSES.length - 1]).toFixed(0)} m。生铁含碳 {CARBON.pig.lo}%–{CARBON.pig.hi}%，钢含碳 {CARBON.steel.lo}%–{CARBON.steel.hi}%。</p>
      </>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">钢坯的厚度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{nowThick}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="L" value={nowLen.toFixed(1)} unit="m · 长度" />
            <ParamTile symbol="道次" value={`${n} / ${PASSES.length}`} unit="每道厚度示意" />
          </div>
          <div className="mt-3 flex gap-1">{[SLAB.thick, ...PASSES].map((t, i) => <div key={i} className={`flex-1 rounded-md py-1 text-center text-[12px] tabular-nums ${i === n ? 'bg-white/20 font-semibold' : i < n ? 'bg-white/8 text-white/55' : 'bg-white/[0.04] text-white/40'}`}>{t}</div>)}</div>
          <h2 className="mt-4 text-[12.5px] text-white/55">生铁和钢</h2>
          <table className="mt-2 w-full text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 text-left font-medium">含碳量</th><th className="pb-1 text-left font-medium">性能</th></tr></thead>
            <tbody>{(['pig', 'steel'] as Kind[]).map(k => <tr key={k} className={k === kind && seen[k] ? 'bg-white/10' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2.5 py-1.5">{CARBON[k].name}</td><td className="py-1.5 tabular-nums">{seen[k] ? `${CARBON[k].lo}%–${CARBON[k].hi}%` : '—'}</td><td className="rounded-r-lg py-1.5 pr-2">{seen[k] ? (k === 'pig' ? '硬而脆' : '韧性好，能轧能锻') : '—'}</td></tr>)}</tbody>
          </table>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'out'} pulse={next === 'out'} disabled={next !== 'out'} onClick={() => out.run()}>出钢坯</LabButton>
        <LabButton primary={next === 'pass'} pulse={next === 'pass'} disabled={next !== 'pass'} onClick={() => pass.run()}>轧一道</LabButton>
      </>}
      extras={T.done.roll ? <Control label="比一比">
        <Segmented label="比一比" pulse={next === 'kind'} want={want} value={seen[kind] ? kind : ('' as Kind)} onChange={k => pick(k as Kind)} options={[{ value: 'pig', label: '生铁' }, { value: 'steel', label: '钢' }]} />
      </Control> : null}
    />
  )
}

/** 红热的钢坯：一段或两段（正在轧的时候，没轧的一段厚、轧过的一段薄）。parts：[中心 x、长、厚]（米）。发光材质要在画布里建，所以单独成一个组件 */
function Slabs({ heat, parts }: { heat: number; parts: [number, number, number][] }) {
  const a = useMolten(heat, 0.15, 0.55), b = useMolten(heat * 0.97, 0.15, 0.5)
  return <>{parts.map(([x, len, t], i) => len > 0.05 && <mesh key={i} position={w(x, TY + t / 2, 0)}><boxGeometry args={[len * M, t * M, WIDTH * M]} /><primitive object={i ? b : a} attach="material" /></mesh>)}</>
}
