// 质量与密度 · 第 7 课 密度的应用（鉴别物质；算不便直接称的质量；判断空心还是实心）。地点在料场的检验台和大铝锭旁。
import { useRef, useState, type RefObject } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Balance, WeightSet, panAt, useWeigh } from './balance'
import { CYL_IN, Cylinder, RIM, levelY } from './glass'
import { LESSONS, goLesson } from './lessons'
import { Ball, Block, Carry, Line, Room, newLive, useLag, useSettled, type Live, type V3 } from './parts'
import { BALL, RHO, SLAB as BIG, UNKNOWN, ballR, density, hollowV, identify, sci, slabM, slabV, solidV, toSI, type Stuff } from './physics'
import { CM, SLAB, TOP, YARD } from './world'

type Mode = 'id' | 'slab' | 'ball'
const MODES: Mode[] = ['id', 'slab', 'ball']
const SEG: Record<Mode, string> = { id: '这是什么金属', slab: '大铝锭有多重', ball: '铁球是空心的吗' }
const STEPS: Record<Mode, string[]> = { id: ['称质量', '浸没在量筒里', '算密度、查表'], slab: ['量长、宽、高', '算质量'], ball: ['称质量', '浸没在量筒里', '算一算'] }
const WAIT: Record<Mode, number[]> = { id: [300, 4600, 3600, 500], slab: [300, 1200, 500], ball: [300, 4600, 3600, 500] }
const rhoU = density(UNKNOWN.m, UNKNOWN.v), what = identify(rhoU), rhoB = density(BALL.m, BALL.v), fe = RHO[BALL.stuff]
const TASKS: Task[] = [
  { id: 'id', text: '一块没有标记的金属：测出密度，对着密度表认出它', note: `ρ = ${UNKNOWN.m} g ÷ ${UNKNOWN.v} cm³ = ${rhoU.toFixed(1)} g/cm³，和${what ? RHO[what].name : ''}对得上` },
  { id: 'slab', text: '料场上的大铝锭天平称不了：量出体积，算它的质量', note: `m = ρV = ${sci(toSI(RHO[BIG.stuff].rho))} kg/m³ × ${slabV()} m³ = ${sci(slabM())} kg` },
  { id: 'ball', text: '一只铁球：判断它是空心的还是实心的', note: `${BALL.m} g 的铁只有 ${solidV()} cm³，球却有 ${BALL.v} cm³：空心，空心部分 ${hollowV()} cm³` },
]
const X = YARD.x, Z = YARD.z, BASE: V3 = [X - 0.7, TOP, Z + 0.3], BOX: V3 = [X + 0.88, TOP, Z + 1.15], CYL_AT: V3 = [X + 2.1, TOP, Z + 0.4], HOME: V3 = [X - 1.75, TOP, Z + 1.15]
const BALL_R = ballR() * CM
const TABLE: Stuff[] = ['al', 'fe', 'cu']

/** 检验台上的器材：样品做到第 k 步时在哪（0 台面上，1 左盘里，2 以后量筒里） */
function Bench({ mode, k, live }: { mode: Mode; k: number; live: RefObject<Live> }) {
  const item = mode === 'ball' ? BALL : UNKNOWN, on = mode !== 'slab'
  const wet = useLag(on && k >= 2, 1500), V = useSlide(item.v1 + (wet ? item.v : 0), 16)
  const Wg = useWeigh(on && k === 1 ? item.m : null, 1500)
  const at: V3 = !on || k === 0 ? HOME : k === 1 ? panAt(BASE, -1) : [CYL_AT[0], TOP + CYL_IN + 0.003, CYL_AT[2]]
  return <>
    <Balance at={BASE} left={Wg.left} right={Wg.right} rider={Wg.rider} live={live} />
    <WeightSet box={BOX} base={BASE} on={Wg.on} live={live} />
    <Cylinder at={CYL_AT} V={V} />
    <Carry at={at} ride={on && k === 1 ? 'L' : null} live={live} lift={0.52} speed={2.4} grip={mode === 'ball' ? [BALL_R * 2, BALL_R] : [UNKNOWN.v / 4 * CM, 1.3 * CM, UNKNOWN.v / 8 * CM]}>
      {mode === 'ball' ? <Ball r={BALL_R} /> : on && k >= 2 ? <Block kind="fe" size={[2, UNKNOWN.v / 4, 2]} /> : <group position={[UNKNOWN.v / 8 * CM, CM, 0]} rotation-z={Math.PI / 2}><Block kind="fe" size={[2, UNKNOWN.v / 4, 2]} /></group>}
    </Carry>
  </>
}

export default function Lesson7() {
  const [mode, setMode] = useState<Mode>('id')
  const [ks, setKs] = useState<Record<Mode, number>>({ id: 0, slab: 0, ball: 0 })
  const [fresh, setFresh] = useState(true)
  const T = useTasks('gewu:density:7', TASKS)
  const live = useRef(newLive())
  const k = ks[mode], steps = STEPS[mode], full = k >= steps.length
  const settled = useSettled(`${mode}:${k}`, fresh ? 300 : WAIT[mode][k])
  const go = () => { if (!settled || full) return; const n = { ...ks, [mode]: k + 1 }; setKs(n); setFresh(false); if (k + 1 >= steps.length) T.check(id => n[id as Mode] >= STEPS[id as Mode].length) }
  const pick = (m: Mode) => { if (!settled) return; setMode(m); setFresh(true) }
  const resetAll = () => { setMode('id'); setKs({ id: 0, slab: 0, ball: 0 }); setFresh(true); T.reset() }
  const task = T.current, item = mode === 'ball' ? BALL : UNKNOWN
  const said: Record<Mode, string[]> = {
    id: ['一块灰白色的金属，看不出是什么。先称质量', `m = ${UNKNOWN.m} g。再用排水法测体积`, `V = ${UNKNOWN.v1 + UNKNOWN.v} mL − ${UNKNOWN.v1} mL = ${UNKNOWN.v} cm³`, `ρ = ${rhoU.toFixed(1)} g/cm³：对照密度表，是${what ? RHO[what].name : ''}`],
    slab: ['这块铝锭有两吨多，哪台天平都称不了。先量它的尺寸', `长 ${BIG.l} m、宽 ${BIG.w} m、高 ${BIG.h} m，体积 ${slabV()} m³。铝的密度查表`, `m = ρV = ${sci(slabM())} kg，也就是 ${slabM() / 1000} t`],
    ball: ['这只球是铁做的。先称质量', `m = ${BALL.m} g。再测体积`, `V = ${BALL.v} cm³。如果是实心的铁，${BALL.m} g 该有多大`, `${BALL.m} g ÷ ${fe.rho} g/cm³ = ${solidV()} cm³，比球的体积小：是空心的`],
  }
  const { hint, next }: { hint: string; next: 'mode' | 'go' | null } = !task ? { hint: '知道了密度，就能认物质、算质量、算体积。', next: null }
    : !settled ? { hint: '正在做这一步…', next: null }
    : mode !== task.id ? { hint: `接着看：${SEG[task.id as Mode]}`, next: 'mode' }
    : full ? { hint: said[mode][k], next: null } : { hint: `${said[mode][k]}：按“${steps[k]}”`, next: 'go' }
  const at = (ok: boolean) => ({ opacity: ok && settled ? 1 : 0 })
  const S = SLAB, dims = mode === 'slab' && k >= 1
  const labels: Label[] = mode === 'slab' ? [
    { id: 'l', at: [S.x, 0.3, S.z + 3.5], ax: 0.5, className: 'scene-tag transition-opacity', style: at(dims), children: <><small>长</small>{BIG.l} m</> },
    { id: 'w', at: [S.x - 6.5, 0.3, S.z], ax: 1, className: 'scene-tag transition-opacity', style: at(dims), children: <><small>宽</small>{BIG.w} m</> },
    { id: 'h', at: [S.x - 6.5, 2, S.z + 3.3], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: at(dims), children: <><small>高</small>{BIG.h} m</> },
    { id: 'm', at: [S.x, 4.2, S.z], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: at(full), children: <><small>铝锭的质量</small>{sci(slabM())} kg</> },
    { id: 'n', at: [S.x + 3, 3.8, S.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '轧制用的大铝锭' },
  ] : [
    { id: 'm', at: [BASE[0], TOP + 1.66, BASE[2]], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: at(k === 1), children: <><small>天平读数</small>{item.m.toFixed(1)} g</> },
    { id: 'v', at: [CYL_AT[0] - 0.2, TOP + levelY(item.v1 + item.v), CYL_AT[2]], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: at(k >= 2), children: <><small>读数</small>{item.v1 + item.v} mL</> },
    { id: 'r', at: [CYL_AT[0], TOP + RIM + 0.12, CYL_AT[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: at(full), children: mode === 'id' ? <><small>密度</small>{rhoU.toFixed(1)} g/cm³ · {what ? RHO[what].name : ''}</> : <><small>空心部分</small>{hollowV()} cm³</> },
    { id: 's', at: [HOME[0], TOP + 0.3, HOME[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', style: k === 0 ? undefined : { display: 'none' }, children: mode === 'id' ? '没有标记的金属块' : '铁球' },
  ]
  const row = (name: string, v: string | null, key = false) => <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">{name}</td><td className={`text-right tabular-nums${key ? ' font-semibold text-[#7fe3d4]' : ''}`}>{v ?? '—'}</td></tr>
  const got = (n: number, v: string) => k > n || (k === n && settled) ? v : null
  const big = mode === 'id' ? rhoU.toFixed(1) : mode === 'slab' ? sci(slabM()) : hollowV().toFixed(0)
  return (
    <LabShell title="质量与密度" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SEG[mode]}
      stage={<Room at={mode === 'slab' ? 'slab' : 'yard7'} labels={labels}>
        <Bench key={mode} mode={mode} k={k} live={live} />
        {dims && <>
          <Line a={[S.x - 6, 0.5, S.z + 3.3]} b={[S.x + 6, 0.5, S.z + 3.3]} r={0.04} /><Line a={[S.x - 6.3, 0.5, S.z - 3]} b={[S.x - 6.3, 0.5, S.z + 3]} r={0.04} /><Line a={[S.x - 6.3, 0.5, S.z + 3.3]} b={[S.x - 6.3, 3.5, S.z + 3.3]} r={0.04} />
          {([[S.x - 6, 0.5, S.z + 3.3], [S.x + 6, 0.5, S.z + 3.3], [S.x - 6.3, 0.5, S.z - 3], [S.x - 6.3, 0.5, S.z + 3.3], [S.x - 6.3, 3.5, S.z + 3.3]] as V3[]).map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.1, 12, 10]} /><meshBasicMaterial color="#ffd24a" toneMapped={false} /></mesh>)}
        </>}
      </Room>}
      lesson={<LessonBlock no="7" title="密度的应用" concept="知道密度，能认物质、算质量、算体积" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>由 <span className="font-formula italic">ρ = m / V</span> 可以得到 <span className="font-formula italic">m = ρV</span> 和 <span className="font-formula italic">V = m / ρ</span>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">鉴别物质</b>：测出密度，和密度表比一比。不同物质的密度一般不同</li>
            <li><b className="text-white">算质量</b>：不便直接称的大物体，量出体积，查出密度，m = ρV</li>
            <li><b className="text-white">算体积</b>：形状复杂的物体，称出质量，查出密度，V = m / ρ</li>
            <li><b className="text-white">空心还是实心</b>：用质量和这种物质的密度算出“实心该有的体积”，比实际体积小，就是空心的</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">只凭密度鉴别物质并不总是可靠：有的不同物质密度相同，还要看颜色、硬度等别的性质。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件事都办成了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">知道密度，能认物质、算质量、算体积</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">金属块是{what ? RHO[what].name : ''}；大铝锭 {sci(slabM())} kg；铁球里有 {hollowV()} cm³ 是空的。用的都是 ρ = m/V 这一个式子。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">{mode === 'id' ? 'ρ = m / V' : mode === 'slab' ? 'm = ρ V' : 'V = m / ρ'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{full && settled ? big : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">{mode === 'id' ? 'g/cm³' : mode === 'slab' ? 'kg' : 'cm³ 是空的'}</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表 · {SEG[mode]}</h2>
          <table className="mt-1 w-full text-[13.5px]"><tbody>
            {mode === 'id' && <>{row('质量 m', got(1, `${UNKNOWN.m} g`))}{row('体积 V', got(2, `${UNKNOWN.v} cm³`))}{row('密度 ρ', got(3, `${rhoU.toFixed(1)} g/cm³`))}{row('是什么', got(3, what ? RHO[what].name : '表里没有'), true)}</>}
            {mode === 'slab' && <>{row('长 × 宽 × 高', got(1, `${BIG.l} m × ${BIG.w} m × ${BIG.h} m`))}{row('体积 V', got(1, `${slabV()} m³`))}{row('铝的密度 ρ', `${sci(toSI(RHO[BIG.stuff].rho))} kg/m³`)}{row('质量 m = ρV', got(2, `${sci(slabM())} kg`), true)}</>}
            {mode === 'ball' && <>{row('质量 m', got(1, `${BALL.m} g`))}{row('球的体积 V', got(2, `${BALL.v} cm³`))}{row('铁的密度 ρ', `${fe.rho} g/cm³`)}{row('这些铁的体积 m ÷ ρ', got(3, `${solidV()} cm³`))}{row('空心部分', got(3, `${hollowV()} cm³`), true)}</>}
          </tbody></table>
          {mode === 'id' && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">密度表</h2>
            <table className="mt-1 w-full text-[13.5px]"><tbody>{TABLE.map(s => <tr key={s} className={`border-t border-white/12${full && settled && s === what ? ' text-[#7fe3d4]' : ' text-white/80'}`}><td className="py-1.5">{RHO[s].name}</td><td className="text-right tabular-nums">{RHO[s].rho.toFixed(1)} g/cm³</td><td className="text-right tabular-nums">{sci(toSI(RHO[s].rho))} kg/m³</td></tr>)}</tbody></table>
          </>}
          {mode === 'ball' && full && settled && <p className="row-in mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">也可以比密度：球的质量除以体积只有 {rhoB.toFixed(2)} g/cm³，比铁的 {fe.rho} g/cm³ 小，所以里面有空的地方。</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'go'} onClick={go} disabled={!settled || full}>{full ? '做完了' : steps[k]}</LabButton></>}
      extras={<Control label="解决什么问题"><Segmented label="解决什么问题" pulse={next === 'mode'} want={next === 'mode' ? task!.id as Mode : null} value={mode} disabled={!settled} onChange={pick} options={MODES.map(m => ({ value: m, label: SEG[m] }))} /></Control>}
    />
  )
}
