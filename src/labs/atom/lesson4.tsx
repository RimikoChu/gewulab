// 分子和原子 · 第 4 课 分子间有间隔：中间一支 100 mL 具塞量筒，左边一只烧杯盛 50 mL 水（滴了红墨水，便于看清），
// 右边一只烧杯盛 50 mL 酒精。先倒水，再沿筒壁慢慢倒酒精（酒精浮在上面），读数 100 mL；塞紧、上下颠倒几次，混匀以后读数约 96 mL。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import * as THREE from 'three'
import { BEAKER, Beaker, CYL, GradCylinder, Hand, NarrowBottle, TiltLiquid, beakerFill, cylLevelY } from './gear'
import { Stream } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { mixVolume } from './physics'
import { Callout, MolField } from './mol'
import { BZ, Place, ST, TOP, u, type V3 } from './world'

const X0 = ST.l4, Z0 = BZ + u(0.03)
const RED = '#d8344a', ALC = '#eef3f2'
type Liq = 'water' | 'alcohol'
const HOME: Record<Liq, V3> = { water: [X0 - u(0.09), TOP, Z0 + u(0.02)], alcohol: [X0 + u(0.09), TOP, Z0 + u(0.02)] }
const BK = BEAKER[100]
const V_MIX = mixVolume(50, 50)
const TASKS: Task[] = [
  { id: 'water', text: '往量筒里倒入 50 mL 水', note: '读数 50 mL' },
  { id: 'alcohol', text: '沿筒壁慢慢倒入 50 mL 酒精', note: '酒精浮在水上面，读数 100 mL' },
  { id: 'mix', text: '塞紧，上下颠倒几次，混匀后再读数', note: `只剩约 ${Math.round(V_MIX)} mL，比 100 mL 少` },
]

export default function Lesson4() {
  const T = useTasks('gewu:atom:4', TASKS)
  const pourW = useRun(5.8, () => T.check(id => id === 'water'))
  const pourA = useRun(6.4, () => T.check(id => id === 'alcohol'))
  const mix = useRun(6.4, () => T.check(id => id === 'mix'))
  const busy = pourW.busy || pourA.busy || mix.busy
  const resetAll = () => { pourW.snap(0); pourA.snap(0); mix.snap(0); T.reset() }

  /** 倒液体：烧杯提起来移到量筒口，斜过来倒，倒完放回。返回杯口那一点的位置、倾斜角、杯里还剩多少、倒进去多少 */
  const pour = (liq: Liq, r: ReturnType<typeof useRun>, done: boolean) => {
    const dir = liq === 'water' ? 1 : -1, t = r.t, n = r.busy ? 1 : 0
    const home: V3 = [HOME[liq][0] + dir * u(BK.r), HOME[liq][1] + u(BK.h), HOME[liq][2]]
    const lip: V3 = [X0 - dir * u(CYL.r + 0.004), TOP + u(CYL.h + 0.018), Z0]
    const total = r === pourA ? 6.4 : 5.8, back = total - 1.4
    const pos: V3 = !r.busy ? home : t < 1.3 ? liftPath(home, lip, TOP + u(CYL.h + 0.03), seg(t, 0, 1.3)) : t < back ? lip : liftPath(lip, home, TOP + u(CYL.h + 0.03), seg(t, back, total))
    const tilt = n * (ease(seg(t, 1.3, 1.9)) * 1.25 + ease(seg(t, 1.9, back - 0.6)) * 0.55 - ease(seg(t, back - 0.6, back)) * 1.8)
    const k = done ? 1 : r.busy ? ease(seg(t, 1.9, back - 0.6)) : 0
    return { dir, pos, tilt: Math.max(0, tilt), k, flowing: r.busy && t > 1.9 && t < back - 0.6 }
  }
  const W = pour('water', pourW, !!T.done.water), Al = pour('alcohol', pourA, !!T.done.alcohol)
  const mixed = !!T.done.mix, mk = mixed ? 1 : mix.busy ? seg(mix.t, 1.6, 5.0) : 0
  const level = mixed ? V_MIX : 50 * W.k + 50 * Al.k - (mix.busy ? (100 - V_MIX) * ease(seg(mix.t, 3.2, 5.0)) : 0)
  // 颠倒混匀：手握住量筒、按住塞子，绕中间翻过去再翻回来，两次
  const flip = mix.busy ? Math.PI * (ease(seg(mix.t, 1.0, 2.0)) - ease(seg(mix.t, 2.1, 3.1)) + ease(seg(mix.t, 3.2, 4.2)) - ease(seg(mix.t, 4.3, 5.3))) : 0
  const lift = mix.busy ? ease(seg(mix.t, 0.5, 1.0)) * (1 - ease(seg(mix.t, 5.3, 5.9))) * u(0.05) : 0
  const stopper = mix.busy ? mix.t > 0.5 : mixed
  const mixColor = `#${new THREE.Color(RED).lerp(new THREE.Color(ALC), 0.42 * Math.max(mk, 0.4)).getHexString()}`

  const task = T.current
  const { hint, next }: { hint: string; next: Liq | 'mix' | null } = !task ? { hint: `50 mL 水和 50 mL 酒精混合，总体积约 ${Math.round(V_MIX)} mL：分子之间有间隔。`, next: null }
    : pourW.busy ? { hint: '把水倒进量筒…', next: null }
    : pourA.busy ? { hint: '沿着筒壁慢慢倒入酒精…', next: null }
    : mix.busy ? { hint: '塞紧塞子，按住，上下颠倒几次…', next: null }
    : task.id === 'water' ? { hint: '往量筒里倒入 50 mL 水', next: 'water' }
    : task.id === 'alcohol' ? { hint: '再沿筒壁慢慢倒入 50 mL 酒精，看看一共多少', next: 'alcohol' }
    : { hint: '一共 100 mL。塞紧塞子，上下颠倒几次混匀，再读数', next: 'mix' }

  const species = useMemo(() => [{ f: 'H2O', share: 0.76 }, { f: 'C2H5OH', share: 0.24 }], [])
  const lvY = TOP + cylLevelY(level)
  const labels: Label[] = [
    { id: 'v', at: [X0 + u(0.03), lvY, Z0 + u(0.01)], ax: 0, className: `scene-tag ${mixed ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: level > 1 && !mix.busy ? 1 : 0 }, children: <><small>读数</small>{mixed ? `约 ${Math.round(level)}` : Math.round(level)} mL</> },
    { id: 'n1', at: [HOME.water[0], TOP - u(0.006), HOME.water[2] + u(0.04)], ax: 0.5, name: true, className: 'scene-name', children: '水（滴了红墨水）' },
    { id: 'n2', at: [HOME.alcohol[0], TOP - u(0.006), HOME.alcohol[2] + u(0.04)], ax: 0.5, name: true, className: 'scene-name', children: '酒精' },
    { id: 'm', at: [X0 + u(0.085), TOP + u(0.282), Z0], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: mixed ? 1 : 0 }, children: '放大示意：酒精分子和水分子挤在一起' },
  ]
  // 倒水时烧杯斜着：杯里的液面按世界里的水平面切，始终是平的。液面先跟着杯身中轴上的那一点，到了杯口就停在杯口（开始往外流）
  const beakerPour = (liq: Liq, s: typeof W, color: string) => {
    const a = -s.dir * s.tilt, ca = Math.cos(a), sa = Math.sin(a), v = 50 * (1 - s.k)
    const bx = -s.dir * u(BK.r), by = -u(BK.h), h0 = u(BK.h) * beakerFill(100, v)
    const axisY = s.pos[1] + bx * sa + by * ca + h0 * ca
    const level = Math.min(axisY, s.pos[1] - 0.004)
    return <group key={liq} position={s.pos} rotation-z={a}>
      <group position={[bx, by, 0]} rotation-y={s.dir > 0 ? -Math.PI * 0.75 : Math.PI * 0.25}>
        <Beaker vol={100} color={color} />
        {v > 0.6 && <TiltLiquid r={u(BK.r - 0.0018) - 0.002} y0={u(0.0018)} y1={u(BK.h)} level={level} color={color} opacity={liq === 'water' ? 0.7 : 0.32} />}
      </group>
      {(liq === 'water' ? pourW : pourA).busy && <group position={[-s.dir * u(BK.r * 2 + 0.012), -u(BK.h * 0.45), u(0.004)]} rotation={[0, s.dir > 0 ? 0.6 : -0.6, s.dir * 1.45]}><Hand grip={0.8} /></group>}
    </group>
  }
  // 颠倒混匀时：量筒里的液体也按水平面切，倒过来时液体落到塞子那一头
  const CY = u(0.13), cf = Math.cos(flip)
  const worldY = (yl: number) => TOP + lift + CY + (yl - CY) * cf
  const colLen = cylLevelY(level) - cylLevelY(0)
  const flipLevel = (cf >= 0 ? worldY(cylLevelY(0)) : worldY(u(CYL.h - 0.004))) + colLen * Math.abs(cf)
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="操作"
      stage={<Place at="l4" labels={labels}>
        <group position={[X0, TOP + lift, Z0]}>
          <group position-y={u(0.13)} rotation-z={flip}><group position-y={-u(0.13)}>
            <GradCylinder level={mix.busy ? 0 : level} split={Math.min(50, level)} bottom={RED} top={ALC} mix={mk} stopper={stopper} />
            {mix.busy && <TiltLiquid r={u(CYL.r - CYL.wall) - 0.002} y0={cylLevelY(0)} y1={u(CYL.h - 0.004)} level={flipLevel} color={mixColor} opacity={0.6} />}
          </group></group>
          {mix.busy && mix.t > 0.3 && mix.t < 5.6 && <group position-y={u(0.13)} rotation-z={flip}>
            <group position={[u(0.032), u(0.01), u(0.004)]} rotation={[0, 0, -Math.PI / 2]}><Hand grip={0.85} /></group>
          </group>}
        </group>
        {beakerPour('water', W, RED)}
        {beakerPour('alcohol', Al, ALC)}
        {W.flowing && <Stream a={[W.pos[0] + u(0.002), W.pos[1] - u(0.002), Z0]} b={[X0 - u(0.006), TOP + cylLevelY(level), Z0]} r={u(0.0016)} color={RED} opacity={0.75} />}
        {Al.flowing && <Stream a={[Al.pos[0] - u(0.002), Al.pos[1] - u(0.002), Z0]} b={[X0 + u(CYL.r - 0.003), TOP + cylLevelY(level), Z0]} r={u(0.0012)} color="#e6f2f2" opacity={0.5} />}
        <group position={[X0 + u(0.15), TOP, Z0 - u(0.07)]}><NarrowBottle label="酒精" band="#2f8a5a" sub="C₂H₅OH" /></group>
        <Callout at={[X0 + u(0.085), TOP + u(0.235), Z0]} from={[X0 + u(0.008), TOP + cylLevelY(80), Z0 + u(0.012)]} r={u(0.042)} fieldR={26} show={mixed ? 1 : 0}>
          <MolField species={species} R={26} gap={3.6} seed={21} opacity={mixed ? 1 : 0} />
        </Callout>
      </Place>}
      lesson={<LessonBlock no="4" title="分子间有间隔" concept="50 mL 加 50 mL，不到 100 mL" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>酒精分子和水分子之间都有间隔。两种液体混在一起时，一部分分子挤进了另一种分子的间隔里，所以总体积比两者之和小。</p>
          <p className="mt-2">就像一杯黄豆和一杯芝麻混在一起，芝麻会钻进黄豆的空隙，总体积不到两杯。</p>
          <p className="mt-2">读量筒时，视线要和凹液面的最低处保持水平。混合前后总质量不变，只是体积变小了。</p>
          <p className="mt-2 text-[13.5px] text-white/65">约 {Math.round(V_MIX)} mL 是按 20 °C 时酒精、水和它们混合液的密度算的；实际读数和温度、酒精的浓度有关。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">50 mL + 50 mL ≈ {Math.round(V_MIX)} mL</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">分子之间有间隔</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">水和酒精混合后，体积比 100 mL 少了约 {Math.round(100 - V_MIX)} mL。分子没有变小，是一部分分子钻进了别的分子之间的间隔。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">量筒读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{mixed ? `约 ${Math.round(level)}` : Math.round(level)}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">混合前后</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="水" value={T.done.water ? '50' : '—'} unit="mL" />
            <ParamTile symbol="酒精" value={T.done.alcohol ? '50' : '—'} unit="mL" />
            <ParamTile symbol="混合后" value={mixed ? `约 ${Math.round(V_MIX)}` : '—'} unit="mL" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'water'} pulse={next === 'water'} onClick={() => pourW.run()} disabled={busy || !!T.done.water}>倒入水</LabButton>
        <LabButton primary={next === 'alcohol'} pulse={next === 'alcohol'} onClick={() => pourA.run()} disabled={busy || !T.done.water || !!T.done.alcohol}>倒入酒精</LabButton>
        <LabButton primary={next === 'mix'} pulse={next === 'mix'} onClick={() => mix.run()} disabled={busy || !T.done.alcohol || mixed}>颠倒混匀</LabButton>
      </>}
      extras={null}
    />
  )
}
