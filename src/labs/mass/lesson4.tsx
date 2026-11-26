// 质量守恒定律 · 第 4 课 原子的重新组合：化验室第 4 格。左边是水电解器和学生电源，右边一张黑色展台上摆分子的球棍模型（示意）。
// 接通电源，两极冒出气泡，负极的气体是正极的两倍；把两个水分子拆成原子，原子再组合成两个氢分子和一个氧分子；
// 换成氢气燃烧：打开负极的活塞点燃氢气，再看两个氢分子和一个氧分子怎样组合成两个水分子。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Electrolyzer, HOF, Hose, PowerSupply, Plinth } from './gear'
import { Flame } from './fx'
import { Reaction } from './molecules'
import { LESSONS, goLesson } from './lessons'
import { seg, useRun, type V3 } from './parts'
import { EL_NAME, ELECTRO, eqText, l4, pretty, type El, type L4Key } from './physics'
import { BZ, M, ST, TOP, Place } from './world'

const X0 = ST.l4
const u = (v: number) => v * M, h = (v: number) => v * M * HS
const HOFAT: V3 = [X0 - 0.75, TOP, BZ - 0.1], PSU: V3 = [X0 - 1.75, TOP, BZ + 0.25], SHOWAT: V3 = [X0 + 0.95, TOP, BZ + 0.15]
const HS = 0.8                            // 水电解器画小一点（约 40 cm 高）
const MOD = 0.36                          // 分子模型：1 个模型单位画多大
const TASKS: Task[] = [
  { id: 'power', text: '接通电源，电解水', note: '负极产生的气体（氢气）体积约是正极（氧气）的 2 倍' },
  { id: 'split', text: '把两个水分子拆成原子', note: '水分子分成氢原子和氧原子' },
  { id: 'join', text: '让原子重新组合', note: '氢原子两两结合成氢分子，氧原子结合成氧分子：原子的种类、数目都没变' },
  { id: 'h2', text: '换成氢气燃烧，再拆、再组一次', note: '氢分子和氧分子拆成原子，重新组合成水分子：原子还是 4 个氢、2 个氧' },
]
const GAS = 0.12                          // 电解结束时负极管里的气柱高（m）
const NAME: Record<L4Key, string> = { water: '水通电分解', h2: '氢气燃烧' }

export default function Lesson4() {
  const [mode, setMode] = useState<L4Key>('water')
  const [phase, setPhase] = useState(0)            // 0 反应物，1 拆成原子，2 生成物
  const [moving, setMoving] = useState(false)
  const [powered, setPowered] = useState(false)    // 电解做完了
  const [lit, setLit] = useState(false)            // 氢气点着了
  const T = useTasks('gewu:mass:4', TASKS)
  const elec = useRun(7, () => { setPowered(true); T.check(id => id === 'power') })
  const fire = useRun(4, () => setLit(true))
  useEffect(() => { if (!moving) return; const t = setTimeout(() => setMoving(false), 2200); return () => clearTimeout(t) }, [moving, phase])
  useEffect(() => {
    if (moving) return
    if (mode === 'water' && phase === 1) T.check(id => id === 'split')
    if (mode === 'water' && phase === 2) T.check(id => id === 'join')
    if (mode === 'h2' && phase === 2) T.check(id => id === 'h2')
  }, [moving, phase, mode])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = (p: number) => { setPhase(p); setMoving(true) }
  const pick = (k: L4Key) => { if (k === mode || elec.busy || fire.busy || moving) return; setMode(k); setPhase(0); setLit(false); fire.snap(0) }
  const resetAll = () => { setMode('water'); setPhase(0); setMoving(false); setPowered(false); setLit(false); elec.snap(0); fire.snap(0); T.reset() }
  const busy = elec.busy || fire.busy || moving
  const R = l4(mode)

  const gasL = powered ? GAS : elec.busy ? GAS * seg(elec.t, 0.6, 6.8) : 0
  const gasR = gasL * ELECTRO.o2 / ELECTRO.h2
  const flame = mode === 'h2' ? (lit ? 1 : fire.busy ? seg(fire.t, 1.2, 1.8) : 0) : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'a' | 'split' | 'join' | 'mode' | null } = !task ? { hint: '化学反应中，分子分成原子，原子重新组合成新的分子；原子的种类、数目、质量都不变。', next: null }
    : task.id === 'h2' && mode !== 'h2' ? { hint: '换成“氢气燃烧”', next: 'mode' }
    : mode === 'water' && !powered ? (elec.busy ? { hint: '两极都冒出气泡，负极那边的气体多…', next: null } : { hint: '接通电源，电解水', next: 'a' })
    : mode === 'h2' && !lit ? (fire.busy ? { hint: '打开负极管的活塞，用燃着的木条点燃放出的氢气…', next: null } : { hint: '点燃负极管里放出的氢气', next: 'a' })
    : moving ? { hint: phase === 1 ? (mode === 'water' ? '水分子分成氢原子和氧原子…' : '氢分子、氧分子分成一个个原子…') : (mode === 'water' ? '氢原子两两结合成氢分子，氧原子结合成氧分子…' : '两个氢原子和一个氧原子结合成一个水分子…'), next: null }
    : phase === 0 ? { hint: mode === 'water' ? '把两个水分子拆成原子' : '把两个氢分子和一个氧分子拆成原子', next: 'split' }
    : phase === 1 ? { hint: '让原子重新组合', next: 'join' }
    : { hint: '数一数：原子的种类、数目都没变', next: null }

  const cnt = R.count
  const tally = (side: 'left' | 'right') => cnt.els.map(e => `${EL_NAME[e as El]}原子 ${cnt[side][e as El]} 个`).join(' · ')
  const top: V3 = [SHOWAT[0], SHOWAT[1] + 0.75, SHOWAT[2]]
  const labels: Label[] = [
    { id: 'eq', at: [top[0], top[1] + 0.75, top[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{phase < 1.5 ? '反应物' : '生成物'}</small>{(phase < 1.5 ? R.eq.left : R.eq.right).map((s, i) => `${R.eq.coef[(phase < 1.5 ? 0 : R.eq.left.length) + i]} 个${s.name}分子`).join(' + ')}</> },
    { id: 'n', at: [top[0], TOP + 0.2, top[2] + 0.5], ax: 0.5, className: `scene-tag ${phase === 2 && !moving ? 'key' : ''}`, children: <>{tally(phase < 1.5 ? 'left' : 'right')}{phase === 2 && !moving && <span className="delta eq">没变</span>}</> },
    ...(powered && mode === 'water' ? [
      { id: 'h', at: [HOFAT[0] - h(HOF.gap) - h(0.02), HOFAT[1] + h(HOF.h - 0.02), HOFAT[2]] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>负极</small>氢气</> },
      { id: 'o', at: [HOFAT[0] + h(HOF.gap) + h(0.02), HOFAT[1] + h(HOF.h - 0.02), HOFAT[2]] as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>正极</small>氧气</> },
    ] : []),
    { id: 'n1', at: [HOFAT[0], TOP - 0.02, HOFAT[2] + 0.5], ax: 0.5, name: true, className: 'scene-name', children: '水电解器' },
    { id: 'n2', at: [PSU[0], TOP - 0.02, PSU[2] + 0.55], ax: 0.5, name: true, className: 'scene-name', children: '学生电源' },
    { id: 'n3', at: [SHOWAT[0], TOP - 0.02, SHOWAT[2] + 0.45], ax: 0.5, name: true, className: 'scene-name', children: '分子模型（示意）' },
  ]
  const nozzle: V3 = [HOFAT[0] - h(HOF.gap), HOFAT[1] + h(HOF.base + 0.03 + HOF.h + 0.014), HOFAT[2]]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel={NAME[mode]}
      stage={<Place at="l4" labels={labels}>
        <group position={HOFAT} scale={HS}><Electrolyzer gasL={gasL} gasR={gasR} on={elec.busy} /></group>
        <group position={PSU} rotation-y={0.35}><PowerSupply on={elec.busy} /></group>
        <Flame at={nozzle} w={u(0.01)} h={u(0.03)} kind="h2" level={flame} seed={4} light={0.5} lightColor="#9fb8ff" />
        {/* 导线：电源的两个接线柱接到电解器底下的两个电极 */}
        <Wire from={[PSU[0] + u(0.06), PSU[1] + u(0.03), PSU[2] + u(0.1)]} to={[HOFAT[0] + h(HOF.gap), HOFAT[1] + h(HOF.base + 0.017), HOFAT[2]]} color="#b8291f" />
        <Wire from={[PSU[0] + u(0.08), PSU[1] + u(0.03), PSU[2] + u(0.1)]} to={[HOFAT[0] - h(HOF.gap), HOFAT[1] + h(HOF.base + 0.017), HOFAT[2]]} color="#222427" />
        <group position={SHOWAT}><group scale={[2.2, 1, 1.6]}><Plinth r={0.07} h={0.025} /></group></group>
        <group position={top} scale={MOD}><Reaction key={mode} eq={R.eq} phase={phase} /></group>
      </Place>}
      lesson={<LessonBlock no="4" title="原子的重新组合" concept="原子重新组合，种类、数目、质量都不变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p className="text-center font-formula text-[15px]">{eqText(l4('water').eq).replace('=', '=通电=')}</p>
          <p className="mt-1 text-center font-formula text-[15px]">{eqText(l4('h2').eq).replace('=', '=点燃=')}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>电解水：正极产生氧气，负极产生氢气，体积比约为 1 : 2（正氧负氢，氢二氧一）</li>
            <li>化学反应的过程，就是参加反应的各物质（反应物）的原子重新组合而生成其他物质（生成物）的过程</li>
            <li>反应前后，原子的<b className="text-white">种类没有改变、数目没有增减、质量也没有改变</b>，所以反应前后各物质的质量总和必然相等</li>
            <li>分子的种类一定改变；分子的数目可能改变（电解水：2 个分子变成 3 个）</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个反应都拆开、重组过了</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">原子重新组合成新分子，种类、数目、质量都不变</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">反应前后都是 4 个氢原子、2 个氧原子，所以总质量不变：36 份水分解成 4 份氢气和 32 份氧气。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[mode]}</div>
            <div className="mt-1 font-formula text-[22px] leading-snug">{eqText(R.eq)}</div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-[12.5px] text-white/50"><td className="pb-1">原子</td><td className="pb-1 text-right">反应前</td><td className="pb-1 text-right">反应后</td></tr></thead>
            <tbody>{cnt.els.map(e => <tr key={e} className="border-t border-white/10"><td className="py-1.5">{EL_NAME[e as El]}原子 {e}</td><td className="py-1.5 text-right font-semibold">{cnt.left[e as El]}</td><td className={`py-1.5 text-right font-semibold ${phase === 2 && !moving ? 'text-[#7fe3d4]' : 'text-white/40'}`}>{phase === 2 && !moving ? cnt.right[e as El] : '—'}</td></tr>)}</tbody>
          </table>
          <h2 className="mt-5 text-[12.5px] text-white/55">质量（按相对分子质量）</h2>
          <p className="mt-1.5 font-formula text-[15px] text-white/80">{R.eq.left.map((s, i) => `${R.parts[i]} (${R.eq.coef[i]}${pretty(s.f)})`).join(' + ')} = {R.eq.right.map((s, i) => `${R.parts[R.eq.left.length + i]} (${R.eq.coef[R.eq.left.length + i]}${pretty(s.f)})`).join(' + ')}</p>
          {mode === 'water' && <p className="mt-3 text-[13px] text-white/60">气体体积 负极 : 正极 = {ELECTRO.h2} : {ELECTRO.o2}</p>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'a'} pulse={next === 'a'} onClick={() => (mode === 'water' ? elec.run() : fire.run())} disabled={busy || (mode === 'water' ? powered : lit)}>{mode === 'water' ? '接通电源' : '点燃氢气'}</LabButton>
        <LabButton primary={next === 'split'} pulse={next === 'split'} onClick={() => go(1)} disabled={busy || phase !== 0 || (mode === 'water' ? !powered : !lit)}>拆开分子</LabButton>
        <LabButton primary={next === 'join'} pulse={next === 'join'} onClick={() => go(2)} disabled={busy || phase !== 1}>重新组合</LabButton>
      </>}
      extras={
        <Control label="反应">
          <Segmented label="反应" pulse={next === 'mode'} want={task?.id === 'h2' ? 'h2' : 'water'} value={mode} disabled={busy || !T.done.join} onChange={k => pick(k as L4Key)} options={(['water', 'h2'] as L4Key[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}

/** 一根导线：两头之间往下垂一点 */
function Wire({ from, to, color }: { from: V3; to: V3; color: string }) {
  return <Hose pts={[from, [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 0.04, (from[2] + to[2]) / 2 + 0.15], to]} r={0.018} color={color} />
}
