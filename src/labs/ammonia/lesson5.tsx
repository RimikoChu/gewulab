// 合成氨工厂 · 第 5 课 影响化学平衡的因素。化验台另一格做课本上的两个实验：
// 一对连通的 NO₂ 平衡球，一个泡放进电热板上的热水、一个泡放进冰水；一支装着 NO₂ 的注射器，推、拉活塞。2NO₂（红棕色）⇌ N₂O₄（无色），正反应放热。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, FL, FL_TOP, Flasks, Glove, HotPlate, SYR, Stand, Syringe } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, seg, useRun } from './parts'
import { T5, no2Jump, no2Ratio } from './physics'
import { BZ, Place, ST, TOP, spot } from './world'

const TASKS: Task[] = [
  { id: 'hc', text: '把两个球泡分别放进热水和冰水', note: '热水里颜色变深，冰水里变浅：升温，平衡向吸热的方向（生成 NO₂）移动' },
  { id: 'push', text: '推活塞，把体积压到一半', note: '先变深（浓度变大），又变浅一些：加压，平衡向气体分子数减小的方向移动' },
  { id: 'pull', text: '拉活塞，体积恢复', note: '先变浅，又变深一些：减压，平衡向气体分子数增大的方向移动' },
]
const X5 = ST.l5, Z5 = BZ + 0.06
const BUL = { x: X5 - 0.33, gap: FL.gap, up: TOP + 0.2, down: TOP + 0.07 }
const SY = { x: X5 - 0.07, y: TOP + 0.1 }
/** 平衡球放下去要 1.4 s，到温要再过约 4 s；注射器推、拉 0.8 s，平衡移动约 2.5 s */
const DIP = 1.4, HEAT = 4.5, MOVE = 0.8, RELAX = 5
/** 三个机位：先推近两只烧瓶，做完冷热对比推到注射器，全部做完拉远看全 */
const VIEW = {
  flask: spot(BUL.x, TOP + 0.24, Z5, 0.6, 0.44, [0.04, 0.16], true),
  syr: spot(SY.x + 0.15, TOP + 0.08, Z5, 0.46, 0.28, [0.12, 0.3], true),
  all: spot(X5 - 0.13, TOP + 0.2, Z5, 0.86, 0.46, [0.08, 0.26], true),
}
const HOT = no2Ratio(T5.hot), COLD = no2Ratio(T5.cold), PUSHED = no2Ratio(T5.room, 0.5)
const fmtK = (k: number) => k.toFixed(2)

export default function Lesson5() {
  const T = useTasks('gewu:ammonia:5', TASKS)
  const dip = useRun(DIP + HEAT, () => T.check(id => id === 'hc'))
  const [vol, setVol] = useState<{ from: number; to: number; k0: number }>({ from: 1, to: 1, k0: 1 })
  const sy = useRun(MOVE + RELAX, () => T.check(id => (vol.to < 1 ? id === 'push' : id === 'pull')))
  const resetAll = () => { dip.snap(0); sy.snap(0); setVol({ from: 1, to: 1, k0: 1 }); T.reset() }

  // 平衡球：放下去，再慢慢到温
  const down = ease(seg(dip.t, 0, DIP)), th = 1 - Math.exp(-Math.max(0, dip.t - DIP) / 1.3)
  const kL = lerp(1, HOT, th), kR = lerp(1, COLD, th)
  // 注射器：活塞匀速走到位，同时浓度按体积变；到位以后平衡移动，浓度慢慢回到新平衡
  const mv = ease(seg(sy.t, 0, MOVE)), v = lerp(vol.from, vol.to, mv)
  const eqTo = no2Ratio(T5.room, vol.to)
  const instant = no2Jump(vol.k0, vol.from, v)
  const relax = 1 - Math.exp(-Math.max(0, sy.t - MOVE) / 1.1)
  const kS = sy.t <= MOVE ? instant : lerp(no2Jump(vol.k0, vol.from, vol.to), eqTo, relax)
  const press = (to: number) => { if (sy.busy) return; const k0 = no2Ratio(T5.room, vol.to); setVol({ from: vol.to, to, k0 }); sy.run() }

  const task = T.current?.id
  const next = !task || dip.busy || sy.busy ? null : task
  const hint = !task ? '平衡朝着减弱这种改变的方向移动。'
    : dip.busy ? (dip.t < DIP ? '把球泡放进水里…' : '看两个球泡的颜色…')
    : sy.busy ? (sy.t < MOVE ? (vol.to < vol.from ? '推活塞…' : '拉活塞…') : '活塞停住了，盯着注射器里的颜色…')
    : task === 'hc' ? '把平衡球的两个泡分别放进热水和冰水'
    : task === 'push' ? '推活塞，把注射器里的气体压到一半体积'
    : '拉活塞，让体积恢复'

  const fill = 0.5 * v
  const glove = SY.x + (SYR.len * fill + 0.012 + (SYR.len + 0.03 - SYR.len * fill) + 0.006) + 0.012
  const by = lerp(BUL.up, BUL.down, down)
  const phase = T.finale ? 'all' : T.done.hc && !dip.busy ? 'syr' : 'flask'
  const all: Label[] = [
    { id: 'h', at: [BUL.x - BUL.gap / 2 - 0.075, TOP + 0.15, Z5], ax: 1, className: `scene-tag ${dip.t > DIP + 1 ? 'key' : ''} -translate-y-1/2`, children: <><small>热水 {T5.hot} °C</small>{fmtK(kL)} 倍</> },
    { id: 'c', at: [BUL.x + BUL.gap / 2 + 0.075, TOP + 0.15, Z5], ax: 0, className: `scene-tag ${dip.t > DIP + 1 ? 'key' : ''} -translate-y-1/2`, children: <><small>冰水 {T5.cold} °C</small>{fmtK(kR)} 倍</> },
    { id: 's', at: [SY.x + 0.1, SY.y + 0.06, Z5], ax: 0.5, className: `scene-tag ${sy.busy ? 'key' : ''} -translate-y-full`, children: <><small>注射器 · 体积 {(v * 50).toFixed(0)} mL</small>{fmtK(kS)} 倍</> },
    { id: 'n', at: [BUL.x, by + FL_TOP + 0.03, Z5], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'NO₂ 平衡球（两只连通的烧瓶）' },
  ]
  const labels = all.filter(l => phase === 'all' || (phase === 'syr' ? l.id === 's' : l.id !== 's'))
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="2NO₂（红棕色）⇌ N₂O₄（无色）"
      stage={<Place at={VIEW[phase]} labels={labels}>
        {/* 冷热对比：电热板上一杯热水，一块木垫上一杯冰水；铁架台夹着平衡球 */}
        <group position={[BUL.x - BUL.gap / 2, TOP, Z5]}><HotPlate on /><group position-y={0.065}><Beaker water={0.1} tint="#c9dde6" /></group></group>
        <RoundedBox args={[0.15, 0.065, 0.15]} radius={0.004} position={[BUL.x + BUL.gap / 2, TOP + 0.0325, Z5]} castShadow receiveShadow><meshStandardMaterial color="#b98a58" roughness={0.75} /></RoundedBox>
        <group position={[BUL.x + BUL.gap / 2, TOP + 0.065, Z5]}><Beaker water={0.1} tint="#d8ecf4" ice={6} /></group>
        <group position={[BUL.x, TOP, Z5 - 0.06]}><Stand h={0.5} clampY={by - TOP + FL_TOP} reach={0.06} front /></group>
        <group position={[BUL.x, by, Z5]}><Flasks kL={kL} kR={kR} /></group>
        {/* 注射器：横放在一个小支架上，戴手套的手推、拉活塞 */}
        <group position={[SY.x, SY.y, Z5]}><Syringe fill={fill} k={kS} /></group>
        {[0.04, SYR.len - 0.03].map(dx => <group key={dx} position={[SY.x + dx, TOP, Z5]}><mesh position-y={(SY.y - TOP - 0.02) / 2}><boxGeometry args={[0.012, SY.y - TOP - 0.02, 0.05]} /><meshStandardMaterial color="#2f3337" roughness={0.5} metalness={0.4} /></mesh><mesh position-y={SY.y - TOP - 0.014}><boxGeometry args={[0.02, 0.012, 0.05]} /><meshStandardMaterial color="#2f3337" /></mesh></group>)}
        <group position={[glove + 0.012, SY.y, Z5]} scale={0.85}><Glove /></group>
      </Place>}
      lesson={<LessonBlock no="5" title="影响平衡的因素" concept="平衡朝着减弱这种改变的方向移动" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>2NO₂（红棕色）⇌ N₂O₄（无色），正反应放热。颜色越深，NO₂ 的浓度越大。</p>
          <p className="mt-3"><b className="text-white">温度</b>：升高温度，平衡向吸热反应的方向移动；降低温度，向放热反应的方向移动。所以热水里 NO₂ 变多、颜色变深，冰水里颜色变浅。</p>
          <p className="mt-3"><b className="text-white">压强</b>：对有气体参加、反应前后气体分子数不同的反应，增大压强，平衡向气体分子数减小的方向移动。推活塞时体积变小，各物质浓度同时变大，颜色先变深；接着平衡向生成 N₂O₄ 的方向移动，颜色又变浅一些，但比原来深。</p>
          <p className="mt-3"><b className="text-white">勒夏特列原理</b>：如果改变影响平衡的一个因素（如温度、压强及参加反应的物质的浓度），平衡就向着能够减弱这种改变的方向移动。</p>
          <p className="mt-3">图上的倍数是 NO₂ 浓度和室温、原体积时相比，按 N₂O₄ ⇌ 2NO₂ 的平衡常数估算，是约数。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">平衡总是朝着减弱这种改变的方向移动</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">升温，平衡向吸热方向移动，NO₂ 约变成原来的 {HOT.toFixed(1)} 倍；体积压到一半，NO₂ 浓度先变成 2 倍，最后约 {PUSHED.toFixed(2)} 倍——减弱了这种改变，但没有抵消。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">NO₂ 浓度和原来相比</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmtK(sy.t > 0 || vol.to !== 1 ? kS : kL)}<span className="ml-1 text-[15px] font-medium text-white/55">倍</span></div>
          <div className="mt-2 font-formula text-[15px] text-white/80">2NO₂ ⇌ N₂O₄　ΔH &lt; 0</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="热水" value={`${fmtK(kL)} 倍`} unit={`${T5.hot} °C · 约`} />
          <ParamTile symbol="冰水" value={`${fmtK(kR)} 倍`} unit={`${T5.cold} °C · 约`} />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">注射器（室温）</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">体积</th><th className="font-normal">刚改变</th><th className="pr-2 text-right font-normal">新平衡</th></tr></thead>
          <tbody>
            <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5">压到一半</td><td className="tabular-nums">2.00 倍</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{fmtK(PUSHED)} 倍</td></tr>
            <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5">恢复原体积</td><td className="tabular-nums">{fmtK(no2Jump(PUSHED, 0.5, 1))} 倍</td><td className="rounded-r-lg pr-2 text-right tabular-nums">1.00 倍</td></tr>
          </tbody>
        </table>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'hc'} pulse={next === 'hc'} disabled={dip.busy || dip.t > 0} onClick={() => dip.run()}>放进热水和冰水</LabButton>
        <LabButton primary={next === 'push'} pulse={next === 'push'} disabled={sy.busy || vol.to < 1} onClick={() => press(0.5)}>推活塞</LabButton>
        <LabButton primary={next === 'pull'} pulse={next === 'pull'} disabled={sy.busy || vol.to >= 1} onClick={() => press(1)}>拉活塞</LabButton>
      </>}
      extras={null}
    />
  )
}
