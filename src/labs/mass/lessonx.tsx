// 质量守恒定律 · 拓展课 化工厂里的质量守恒：两个小实验。
// 钢丝棉：化验室第 5 格，一团钢丝棉放在陶土网上，和陶土网一起在天平上调平；用 9 V 电池的两极碰一下，钢丝棉烧起来，天平慢慢往左倒。
// 石灰窑：镜头拉到整个窑区，开窑一班，对一对进窑的碳酸钙、出窑的生石灰、送去碳化塔的二氧化碳。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Battery, ClayNet, Glove, SteelWool } from './gear'
import { Glow, Sparks } from './fx'
import { LESSONS, goLesson } from './lessons'
import { Carry, ease, liftPath, seg, useRun, type V3 } from './parts'
import { LX, g1, kiln, lxGain } from './physics'
import { BenchKit, PTR, bench, dialAt, leftPan, useRig } from './rig'
import { BIN, BZ, KILN, M, ST, TOP, Place } from './world'

const X0 = ST.lx, B = bench(X0, TOP, BZ)
const u = (v: number) => v * M
type XKey = 'wool' | 'kiln'
const NAME: Record<XKey, string> = { wool: '钢丝棉燃烧', kiln: '石灰窑' }
const TASKS: Task[] = [
  { id: 'wool', text: '钢丝棉在天平上调平后点燃，看天平', note: '左盘下沉：铁和空气里的氧气结合，生成物比钢丝棉重' },
  { id: 'kiln', text: '石灰窑开一班，对进料和出料', note: '进窑的碳酸钙 = 出窑的生石灰 + 送走的二氧化碳' },
]
const K = kiln(LX.kilnIn), t1 = (v: number) => `${v.toFixed(1)} t`
const BAT_HOME: V3 = [X0 - 1.4, TOP, BZ + 0.55]

export default function LessonX() {
  const [part, setPart] = useState<XKey>('wool')
  const [weighed, setWeighed] = useState(false)
  const [burnt, setBurnt] = useState(false)
  const [ran, setRan] = useState(false)
  const T = useTasks('gewu:mass:x', TASKS)
  const fire = useRun(10, () => setBurnt(true))
  const shift = useRun(8, () => { setRan(true); T.check(id => id === 'kiln') })
  const burn = burnt ? 1 : fire.busy ? ease(seg(fire.t, 1.6, 9)) : 0
  const rig = useRig(LX.total + lxGain() * burn)
  useEffect(() => { if (rig.steady && rig.target != null && !weighed) setWeighed(true) }, [rig.steady])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (rig.steady && burnt) T.check(id => id === 'wool') }, [rig.steady, burnt])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: XKey) => { if (fire.busy || shift.busy || k === part) return; setPart(k) }
  const resetAll = () => { rig.clear(); fire.snap(0); shift.snap(0); setWeighed(false); setBurnt(false); setRan(false); setPart('wool'); T.reset() }
  const busy = fire.busy || shift.busy

  const task = T.current
  const { hint, next }: { hint: string; next: 'weigh' | 'go' | 'pick' | null } = !task ? { hint: '工厂里算物料也靠质量守恒：进来的总质量等于出去的总质量。', next: null }
    : task.id !== part && !busy ? { hint: `换成“${NAME[task.id as XKey]}”`, next: 'pick' }
    : part === 'wool' ? (!weighed ? (!rig.on ? { hint: '把钢丝棉和陶土网放到左盘上，称一称', next: 'weigh' } : { hint: '用镊子往右盘夹砝码，再拨游码，直到指针指在正中…', next: null })
      : !burnt ? (fire.busy ? { hint: '钢丝棉烧得通红，火星四溅，天平慢慢往左倒…', next: null } : { hint: '用电池的两极碰一下钢丝棉', next: 'go' })
      : { hint: '看指针停在哪…', next: null })
    : shift.busy ? { hint: '石灰石不断进窑，生石灰从窑底出来，二氧化碳从窑顶送走…', next: null }
    : { hint: '开窑一班，看三块表', next: 'go' }

  // 电池：手拿着从台面上过来，两极碰一下钢丝棉
  const pan = leftPan(B)
  const touch: V3 = [pan[0] + u(0.02), pan[1] + u(0.075), pan[2]]
  const bk = fire.busy ? seg(fire.t, 0, 1.4) - seg(fire.t, 2.2, 3.4) : 0
  const batAt: V3 = fire.busy ? liftPath(BAT_HOME, touch, touch[1] + u(0.06), Math.max(0, bk)) : BAT_HOME
  const glowing = fire.busy ? seg(fire.t, 1.5, 2.2) * (1 - seg(fire.t, 8.6, 9.8)) : 0
  const k = shift.busy ? ease(seg(shift.t, 0.5, 7.5)) : ran ? 1 : 0

  const dial = dialAt(B)
  const after = burnt && rig.steady
  const labels: Label[] = part === 'wool' ? [
    ...(weighed ? [{ id: 'm', at: dial, ax: 0, className: `scene-tag ${after ? 'key' : ''} -translate-y-1/2`, children: after ? <><small>燃烧后约</small>{g1(LX.total + lxGain())} g<span className="delta">重了 {lxGain().toFixed(2)} g</span></> : <><small>燃烧前</small>{g1(LX.total)} g</> }] : []),
    ...(after ? [{ id: 'p', at: [dial[0], dial[1] - 0.3, dial[2]] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: PTR[rig.ptr] }] : []),
    { id: 'n1', at: [B.base[0], TOP + 0.02, B.base[2] + 0.45], ax: 0.5, name: true, className: 'scene-name', children: '托盘天平' },
    { id: 'n2', at: [pan[0] - u(0.07), pan[1] + u(0.03), pan[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '钢丝棉' },
    { id: 'n3', at: [BAT_HOME[0], TOP - 0.02, BAT_HOME[2] + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '9 V 电池' },
  ] : [
    { id: 'in', at: [KILN.x - 46, 12, KILN.z + 4], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>进窑 碳酸钙</small>{t1(LX.kilnIn * k)}</> },
    { id: 'co2', at: [KILN.x + KILN.gap + 26, KILN.base + KILN.h + 12, KILN.z], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>送去碳化塔 二氧化碳</small>{t1(K.co2 * k)}</> },
    { id: 'out', at: [BIN.x + 8, 12, BIN.z + 6], ax: 0, className: `scene-tag ${ran ? 'key' : ''}`, children: <><small>出窑 生石灰</small>{t1(K.cao * k)}</> },
  ]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={NAME[part]}
      stage={<Place at={part === 'wool' ? 'x1' : 'x2'} labels={labels}>
        <BenchKit b={B} rig={rig} />
        <Carry at={rig.on ? pan : B.rest} ride={rig.on ? 'L' : null} live={rig.live} lift={0.3} speed={1.6} extra={<group position={[u(0.06), u(0.02), u(0.02)]} rotation={[0.4, 0, 0.9]}><Glove s={u(0.0056)} /></group>}>
          <ClayNet s={0.095} />
          <group position-y={u(0.002)}><SteelWool burnt={burn} /></group>
          <Glow at={[0, u(0.014), 0]} r={u(0.02) * (0.5 + 0.5 * glowing)} level={glowing * 0.8} light={2} />
        </Carry>
        <Sparks at={[pan[0], pan[1] + u(0.015), pan[2]]} on={glowing > 0.3} rate={45} r={u(0.0012)} spread={u(0.018)} speed={u(0.05)} seed={3} />
        <group position={batAt} rotation-z={fire.busy && bk > 0.5 ? Math.PI : 0}>
          <group position-y={fire.busy && bk > 0.5 ? u(-0.052) : 0}><Battery /></group>
          {fire.busy && bk > 0 && <group position={[u(0.01), u(0.06), u(0.02)]} rotation={[0.3, 0, 0.5]}><Glove s={u(0.0052)} /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="拓展" title="化工厂里的质量守恒" concept="进来的总质量，等于出去的总质量" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">钢丝棉</b>：很细的铁丝和空气接触面大，用电池一碰就燃烧。铁和空气里的氧气结合，生成的氧化物比原来的钢丝棉重，所以左盘下沉</li>
            <li><b className="text-white">物料衡算</b>：工厂按质量守恒定律核对每一道工序：进料的总质量等于产品、副产品和排出物的质量总和。对不上，说明有泄漏或计量不准</li>
            <li>石灰窑：CaCO₃ =高温= CaO + CO₂↑，100 t 碳酸钙得到 56 t 氧化钙和 44 t 二氧化碳（按纯碳酸钙算）</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个小实验都做完了</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">进来的总质量等于出去的总质量：100.0 t = 56.0 t + 44.0 t</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">钢丝棉燃烧变重，是结合了空气里的氧气；算上氧气，质量照样守恒。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          {part === 'wool' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">钢丝棉和陶土网{after ? ' · 燃烧后约' : ''}</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{weighed ? g1(after ? LX.total + lxGain() : LX.total) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-white/65">燃烧时结合的氧气约 {lxGain().toFixed(2)} g（示意，按 {LX.fe.toFixed(2)} g 铁全部反应算）。</p>
          </> : <>
            <div className="text-[13px] text-white/60">一班的物料（按纯碳酸钙算，示意）</div>
            <table className="mt-3 w-full text-[15px] tabular-nums">
              <tbody>
                <tr className="border-b border-white/10"><td className="py-2 text-white/70">进窑 碳酸钙</td><td className="py-2 text-right font-semibold">{t1(LX.kilnIn * k)}</td></tr>
                <tr className="border-b border-white/10"><td className="py-2 text-white/70">出窑 生石灰</td><td className="py-2 text-right font-semibold">{t1(K.cao * k)}</td></tr>
                <tr><td className="py-2 text-white/70">送走 二氧化碳</td><td className="py-2 text-right font-semibold">{t1(K.co2 * k)}</td></tr>
              </tbody>
            </table>
            <p className={`mt-3 text-center font-formula text-[17px] ${ran ? 'text-[#7fe3d4]' : 'text-white/40'}`}>{t1(LX.kilnIn * k)} = {t1(K.cao * k)} + {t1(K.co2 * k)}</p>
          </>}
        </Panel>
      }
      actions={<>
        {part === 'wool' && <LabButton primary={next === 'weigh'} pulse={next === 'weigh'} onClick={() => { rig.put(true); rig.weigh() }} disabled={rig.on || weighed}>称量</LabButton>}
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={() => (part === 'wool' ? fire.run() : shift.run())} disabled={busy || (part === 'wool' ? !weighed || burnt : ran)}>{part === 'wool' ? '点燃钢丝棉' : '开窑一班'}</LabButton>
      </>}
      extras={
        <Control label="小实验">
          <Segmented label="小实验" pulse={next === 'pick'} want={(task?.id as XKey) ?? null} value={part} disabled={busy} onChange={k => pick(k as XKey)} options={(['wool', 'kiln'] as XKey[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
