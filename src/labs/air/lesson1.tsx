// 空气和氧气 · 第 1 课 空气里有什么：厂门口质检站的钢台上，一只玻璃钟罩扣在水槽里。燃烧匙上的红磷在酒精灯上点燃，
// 伸进钟罩、塞紧；火焰熄灭、钟罩冷却以后，罩里的水面上升到五分之一处。换成木炭再做一次，水面几乎不动。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Glove, JarBottle, LAMP_TOP, LiquidBody, Stopper } from './gear'
import { BELL_H, BELL_R, BELL_TOP, BellJar, BellMark, Powder, Spoon, TROUGH_R, Trough, WaterRing } from './kit'
import { Flame, Haze, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, seg, useRun } from './parts'
import { AIR, BELL, FUELS, gasLoss, o2Used, outsideDropMM, riseMM, type Fuel } from './physics'
import { KIOSK, M, Place, TOP, type V3 } from './world'

const u = (v: number) => v * M
const at = (x: number, y: number, z = 0): V3 => [KIOSK.x + u(x), TOP + u(y), KIOSK.z + u(z)]
/** 水槽里原来的水深、槽底的厚度；燃烧匙的勺在钟罩里的高度；酒精灯的位置（m） */
const W0 = 0.09, FLOOR = 0.006, CUP_Y = 0.36, LAMP_X = 0.31, ROD = BELL_TOP - 0.012 - CUP_Y - 0.024
const TASKS: Task[] = [
  { id: 'burn', text: '把红磷放进燃烧匙，点燃后伸进钟罩', note: '红磷燃烧，产生大量白烟，放出热量' },
  { id: 'read', text: '等熄灭、冷却，量出水面比原来高了多少', note: '水面上升 105 mm，约占钟罩里空气体积的五分之一' },
  { id: 'c', text: '换木炭再做一次：水面几乎不动，说出为什么', note: '木炭燃烧生成二氧化碳气体，占了氧气的位置' },
]
type Phase = 'idle' | 'burnt' | 'read'

export default function Lesson1() {
  const [fuel, setFuel] = useState<Fuel>('p')
  const [phase, setPhase] = useState<Phase>('idle')
  const T = useTasks('gewu:air:1', TASKS)
  const cool = useRun(5.5, () => { setPhase('read'); T.check(id => (fuel === 'p' ? id === 'read' : id === 'c')) })
  const burn = useRun(6.5, () => setPhase('burnt'))
  const ignite = useRun(6.4, () => { burn.run(); if (fuel === 'p') T.check(id => id === 'burn') })
  const busy = ignite.busy || burn.busy || cool.busy
  const fresh = () => { ignite.snap(0); burn.snap(0); cool.snap(0); setPhase('idle') }
  const swap = () => { if (busy) return; fresh(); setFuel(f => (f === 'p' ? 'c' : 'p')) }
  const resetAll = () => { fresh(); setFuel('p'); T.reset() }
  const F = FUELS[fuel], loss = gasLoss(fuel)

  const task = T.current
  const { hint, next }: { hint: string; next: 'fire' | 'cool' | 'swap' | null } = !task ? { hint: '红磷烧掉了钟罩里的氧气，水面上升约五分之一；木炭生成气体，水面几乎不动。', next: null }
    : ignite.busy ? { hint: `取出燃烧匙，在酒精灯上点燃${F.name}，立刻伸进钟罩、塞紧塞子…`, next: null }
    : burn.busy ? { hint: fuel === 'p' ? '红磷燃烧，冒出大量白烟…' : '木炭在钟罩里烧得发红，慢慢熄灭…', next: null }
    : cool.busy ? { hint: '钟罩慢慢冷却，看罩里的水面…', next: null }
    : phase === 'burnt' ? { hint: '火焰熄灭了。等钟罩冷却，读水面上升了多少', next: 'cool' }
    : phase === 'read' ? (task.id === 'c' && fuel === 'p' ? { hint: '换成木炭，再做一次', next: 'swap' } : { hint: '换成红磷，再做一次', next: 'swap' })
    : (task.id === 'c') !== (fuel === 'c') ? { hint: task.id === 'c' ? '换成木炭，再做一次' : '换成红磷，再做一次', next: 'swap' }
    : { hint: `点燃${F.name}，伸进钟罩`, next: 'fire' }

  // 燃烧匙连着塞子：提出钟罩 → 移到酒精灯上方 → 降到火焰上点燃 → 原路回到钟罩里
  const k = ignite.busy ? ignite.t : 0
  const up = ease(seg(k, 0, 0.9)) - ease(seg(k, 5.4, 6.4)), side = ease(seg(k, 0.9, 1.8)) - ease(seg(k, 4.4, 5.4)), down = ease(seg(k, 1.8, 2.6)) - ease(seg(k, 3.6, 4.4))
  const cupX = LAMP_X * side, cupY = CUP_Y + up * 0.36 - down * (CUP_Y + 0.36 - LAMP_TOP - 0.045)
  const lit = ignite.busy && k > 2.9
  // 火焰：点着以后旺，伸进钟罩烧一阵，氧气耗尽就熄灭；红磷的白烟先浓后淡，冷却时沉降
  const flame = lit ? 0.75 : burn.busy ? (fuel === 'p' ? 1 - ease(seg(burn.t, 3.2, 6)) : 0.5 * (1 - ease(seg(burn.t, 2.2, 5.6)))) : 0
  const smoke = fuel !== 'p' ? 0 : burn.busy ? ease(seg(burn.t, 0.3, 3)) : phase === 'burnt' && !cool.busy ? 1 : cool.busy ? 1 - ease(seg(cool.t, 0, 4)) : 0
  const glow = fuel === 'c' ? (lit ? 1 : burn.busy ? 1 - ease(seg(burn.t, 3, 6.4)) : 0) : 0
  const spent = phase !== 'idle' || burn.busy
  // 水面：冷却时慢慢上升；换药品时落回去
  const target = phase === 'read' ? riseMM(loss) : 0
  const settled = useSlide(target, 400)
  const rise = cool.busy ? riseMM(loss) * ease(seg(cool.t, 0.6, 5.2)) : settled
  const inner = W0 - FLOOR + rise / 1000, outer = W0 - FLOOR - outsideDropMM(rise) / 1000
  const shown = phase === 'read' && !cool.busy

  const labels: Label[] = [
    { id: 'lv', at: at(BELL_R + 0.012, W0 + rise / 1000, 0.02), ax: 0, className: `scene-tag ${shown ? 'key' : ''} -translate-y-1/2`, children: <><small>水面上升</small>{rise.toFixed(0)} mm</> },
    { id: 'm1', at: at(-BELL_R - 0.012, W0 + 0.1, 0.02), ax: 1, className: 'scene-name -translate-y-1/2', children: '1/5' },
    ...(burn.busy && fuel === 'p' ? [{ id: 'sm', at: at(-BELL_R - 0.012, 0.47, 0.02), ax: 1, className: 'scene-name -translate-y-1/2', children: '白烟：五氧化二磷的固体小颗粒' } as Label] : []),
    ...(shown && fuel === 'c' ? [{ id: 'co2', at: at(-BELL_R - 0.012, 0.4, 0.02), ax: 1, className: 'scene-name -translate-y-1/2', children: '氧气变成了二氧化碳，还是气体' } as Label] : []),
    { id: 'n1', at: at(0, BELL_TOP + 0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '钟罩 · 罩里 10.0 L 空气' },
    { id: 'n2', at: at(TROUGH_R + 0.02, 0.05, 0.05), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '水槽' },
    { id: 'n3', at: at(LAMP_X, -0.012, 0.06), ax: 0.5, name: true, className: 'scene-name', children: '酒精灯' },
    { id: 'n4', at: at(-0.3, 0.125, 0.02), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '红磷 · 木炭' },
  ]
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="测定空气里氧气的含量"
      stage={<Place at="l1" labels={labels}>
        {/* 水槽、钟罩和两处的水 */}
        <group position={at(0, 0)}>
          <Trough><group position-y={u(FLOOR)}><WaterRing r0={u(BELL_R + 0.0046)} r1={u(TROUGH_R - 0.001)} h={u(outer)} color="#7fc3de" /></group></Trough>
          <group position-y={u(FLOOR)} onClick={e => { e.stopPropagation(); swap() }}>
            <BellJar>
              {[1, 2, 3, 4].map(i => <BellMark key={i} y={W0 - FLOOR + 0.1 * i} long={i === 1} />)}
              <BellMark y={W0 - FLOOR} />
              <LiquidBody r={u(BELL_R - 0.0008)} h={u(inner)} color="#6fbbdc" opacity={0.66} />
              {/* 罩里的白烟（红磷） */}
              <group position-y={u(inner + 0.004)}><Haze r={u(BELL_R - 0.003)} h={u(BELL_H - FLOOR - inner - 0.01)} opacity={0.5 * smoke} /></group>
            </BellJar>
          </group>
        </group>
        {/* 塞子、燃烧匙和勺里的药品 */}
        <group position={at(cupX, cupY)}>
          <group position={[-u(0.02), 0, 0]}>
            <Spoon len={ROD + 0.05}>
              {fuel === 'p'
                ? <group position-y={-u(0.004)}><Powder r={0.012} k={spent ? 0.5 : 2.2} color={spent ? '#d9d6cc' : '#b3261a'} /></group>
                : <mesh position-y={u(0.004)} rotation={[0.4, 0.6, 0.2]}><dodecahedronGeometry args={[u(0.0095), 0]} /><meshStandardMaterial color="#1a1817" roughness={0.9} emissive="#ff4a12" emissiveIntensity={glow * 2.4} flatShading /></mesh>}
            </Spoon>
          </group>
          <group position-y={u(0.024 + ROD - 0.006)}>
            <Stopper r0={0.0185} r1={0.0225} h={0.03} />
            {ignite.busy && <group position={[u(0.005), u(0.05), 0]} rotation={[0.45, 0.4, -0.75]}><Glove /></group>}
          </group>
        </group>
        <Flame at={at(cupX - 0.02, cupY + 0.002)} w={u(fuel === 'p' ? 0.05 : 0.028)} h={u(fuel === 'p' ? 0.085 : 0.04)} kind={fuel === 'p' ? 'phos' : 'wood'} level={flame} seed={2} light={fuel === 'p' ? 2.2 : 0.8} lightColor={fuel === 'p' ? '#fff0c8' : '#ff8a3a'} />
        <Puffs at={at(cupX - 0.02, cupY + 0.06)} on={fuel === 'p' && flame > 0.25} opt={{ ...SMOKE.white(u(0.045)), rate: 12, life: 2.2 }} seed={7} />
        {/* 酒精灯 */}
        <group position={at(LAMP_X, 0)}><AlcoholLamp /></group>
        <Flame at={at(LAMP_X, LAMP_TOP)} w={u(0.03)} h={u(0.06)} kind="alcohol" level={ignite.busy ? ease(seg(k, 0.2, 0.9)) - ease(seg(k, 5.2, 6.2)) : 0} seed={1} light={0.6} />
        {/* 药品瓶 */}
        <group position={at(-0.34, 0, -0.02)}><JarBottle label="红磷" band="#b3402f" amount={0.5} solid={<Powder r={0.026} color="#7a2018" />} /></group>
        <group position={at(-0.25, 0, 0.05)}><JarBottle label="木炭" band="#3a3a3a" amount={0.7} solid={<Powder r={0.026} color="#1a1817" />} /></group>
      </Place>}
      lesson={<LessonBlock no="1" title="空气里有什么" concept="空气里约五分之一是氧气" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>空气是混合物。按<b className="text-white">体积</b>计算，氮气约占 78%，氧气约占 21%，稀有气体 0.94%，二氧化碳 0.03%，其他气体和杂质 0.03%。</p>
          <p className="mt-2">红磷在密闭的钟罩里燃烧，消耗氧气，生成五氧化二磷固体。冷却以后罩里气体变少、压强减小，水被压进来，进来的水的体积约等于被消耗的氧气的体积。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>红磷要足量，装置不能漏气，要等冷却到室温再读数，否则水面上升不到五分之一</li>
            <li>不能用木炭代替红磷：木炭燃烧生成二氧化碳气体，罩里的气体几乎没有变少</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">红磷和木炭都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">空气里约五分之一是氧气</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">红磷烧掉了钟罩里 2.1 L 氧气，水面上升 105 mm，占 21%。木炭燃烧生成的二氧化碳也是气体，所以水面几乎不动。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">钟罩里水面上升</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{phase === 'idle' && !busy ? '—' : rise.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
            <div className="mt-1.5 text-[13px] text-white/60">{shown ? `占钟罩高度 ${BELL.height} mm 的 ${(rise / BELL.height * 100).toFixed(0)}%` : `燃烧匙里：${F.name}`}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="V(空气)" value={BELL.volume.toFixed(1)} unit="L · 钟罩里的空气" />
            <ParamTile symbol="V(减少)" value={shown ? o2Used(loss).toFixed(1) : '—'} unit="L · 气体减少的体积" />
            <ParamTile symbol="S" value={String(BELL.area)} unit="cm² · 钟罩截面积" />
            <ParamTile symbol="h" value={shown ? rise.toFixed(0) : '—'} unit="mm · 水面上升" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">空气的成分（体积分数）</h2>
          <div className="mt-2 flex h-7 overflow-hidden rounded-lg text-[12px] font-medium text-[#10151a]">
            <div className="grid place-items-center bg-[#9db7d6]" style={{ width: `${AIR.n2}%` }}>氮气 {AIR.n2}%</div>
            <div className="grid place-items-center bg-[#7fe3d4]" style={{ width: `${AIR.o2}%` }}>氧气 {AIR.o2}%</div>
            <div className="bg-[#ffcf5c]" style={{ width: `${100 - AIR.n2 - AIR.o2}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-white/50">其余约 1%：稀有气体、二氧化碳等</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'fire'} pulse={next === 'fire'} onClick={() => ignite.run()} disabled={busy || phase !== 'idle'}>点燃{F.name}</LabButton>
        <LabButton primary={next === 'cool'} pulse={next === 'cool'} onClick={() => cool.run()} disabled={busy || phase !== 'burnt'}>冷却，读水面</LabButton>
        <LabButton pulse={next === 'swap'} onClick={swap} disabled={busy}>{fuel === 'p' ? '换木炭' : '换红磷'}</LabButton>
      </>}
      extras={<Control label="提示"><span className="max-w-[230px] text-[12.5px] leading-snug text-white/55">点一下钟罩，也可以换燃烧匙里的药品</span></Control>}
    />
  )
}
