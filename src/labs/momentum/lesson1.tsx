// 动量和碰撞 · 第 1 课 动量：冰面上用球杆击出冰球、推出冰壶。速度箭头（白）和动量箭头（黄）跟着物体走，长度按大小画；
// 冰球快而动量小，冰壶慢而动量大；撞板墙弹回来，动量掉了头。位置由计算核心给的分段运动算出来。
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'
import { Cone, HockeyStick, Mark, Puck, PuckPile, Stone, Stopper, Vec, useRun, type VecHandle } from './gear'
import { COL, RINK, WALL_LANE, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { PUCK, SHOT, SHOTS, STONE, momentum, pathAt, shotM, shotP, shotPlan, wallDp, type ShotKey } from './physics'
import { useSpace, useTrial } from './trial'
import { num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: ShotKey[] = ['slow', 'fast', 'stone', 'wall']
const TASKS: Task[] = [
  { id: 'slow', text: '把冰球以 5 m/s 击出去', note: `0.16 kg × 5 m/s，动量是 ${num(shotP('slow'))} kg·m/s，方向和速度相同` },
  { id: 'fast', text: '换成 10 m/s，再击一次', note: `速度加倍，动量也加倍：${num(shotP('fast'))} kg·m/s` },
  { id: 'stone', text: '换成冰壶，以 0.5 m/s 推出去', note: `冰壶很慢，可它有 20 kg：动量 ${num(shotP('stone'), 1)} kg·m/s，比冰球大得多` },
  { id: 'wall', text: '让冰球以 10 m/s 撞板墙', note: `弹回来的动量是 ${num(momentum(PUCK.m, -SHOTS.wall.back))}，变化量 Δp = ${num(wallDp())} kg·m/s` },
]
const O = RINK.shot
/** 箭头的比例：速度每 1 m/s、动量每 1 kg·m/s 各画多长（m） */
const KV = 0.09, KP = 0.2
/** 冰球太快，画面放慢到几分之一（数字不放慢） */
const SLOW = 0.4
/** 冰球只有 7.6 cm，放大到几倍画才看得清（界面上写明） */
const BIG = 2.2

function Rig({ mode, run, onMark, tag }: { mode: ShotKey; run: number; onMark: (i: number, last: number) => void; tag: V3 }) {
  const plan = useMemo(() => shotPlan(mode), [mode]), s = SHOTS[mode], puck = s.body === 'puck'
  const lane = mode === 'wall' ? WALL_LANE : O.z, r = puck ? PUCK.r * BIG : STONE.r, m = shotM(mode), top = puck ? PUCK.h * BIG : STONE.h + 0.07
  const body = useRef<THREE.Group>(null), stick = useRef<THREE.Group>(null), vv = useRef<VecHandle>(null), pv = useRef<VecHandle>(null)
  const marks = useMemo(() => plan.tHit == null ? [plan.tRec] : [plan.tHit, plan.tRec], [plan])
  useRun(run, t => {
    const q = pathAt(plan.segs, t), x = O.x + q.x
    body.current?.position.set(x, 0, lane)
    stick.current?.position.set(O.x + (plan.tHit != null && t > plan.tHit ? 0.2 : Math.min(q.x, 0.2)) - r, 0, lane)
    vv.current?.set([x, top + 0.08, lane], [q.v * KV, 0, 0]); pv.current?.set([x, top + 0.2, lane], [momentum(m, q.v) * KP, 0, 0])
    tag[0] = x; tag[1] = top + 0.42; tag[2] = lane
  }, marks, i => onMark(i, marks.length - 1), puck ? SLOW : 1)
  return <>
    <group ref={body}>{puck ? <Puck color={COL.A} size={BIG} /> : <Stone />}</group>
    <group ref={stick}><HockeyStick /></group>
    <Vec ref={vv} color={COL.v} thick={0.012} /><Vec ref={pv} color={COL.p} thick={0.016} />
    <group position={[O.x, 0, lane]} rotation-y={Math.PI / 2}><Mark len={1.2} /></group>
    {mode === 'stone' && <group position={[O.x + SHOT.pad + STONE.r, 0, lane]}><Stopper /></group>}
    {/* 场边的杂物：两只标志桶、一小堆备用的冰球 */}
    <group position={[O.x + 2.7, 0, O.z + 2.1]}><Cone /></group>
    <group position={[O.x + 1.2, 0, O.z + 0.75]}><PuckPile /></group>
  </>
}

export default function Lesson1() {
  const L = useTrial<ShotKey>('gewu:momentum:1', TASKS, 'slow')
  const { mode, stage, rows, task, next, busy } = L, s = SHOTS[mode], m = shotM(mode)
  const bounced = mode === 'wall' && stage >= 1, vNow = bounced ? -s.back : s.v, pNow = momentum(m, vNow)
  const tag = useRef<V3>([O.x, 1, O.z]).current
  useSpace(L.go)
  const hint = !task ? '动量 p = mv：质量乘速度，方向和速度相同。四种击法可以换着再看。'
    : busy ? (mode === 'wall' ? '看冰球撞上板墙以后，两个箭头朝哪边…' : '看白色的速度箭头和黄色的动量箭头…')
    : next === 'mode' ? `把击法换成“${SHOTS[task.id as ShotKey].name}”`
    : next === 'home' ? '按“放回原处”，把球杆收回来'
    : mode === 'stone' ? '按“击出”：用球杆把冰壶以 0.5 m/s 推出去' : mode === 'wall' ? '按“击出”：让冰球以 10 m/s 撞向板墙' : `按“击出”：把冰球以 ${s.v} m/s 击出去`
  const labels: Label[] = [
    { id: 'p', at: tag, ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: L.run ? 1 : 0 }, children: <><small>动量 p</small>{num(pNow)} kg·m/s</> },
    { id: 'body', at: [O.x - s.v * SHOT.T / 2 + 0.2, 0.42, mode === 'wall' ? WALL_LANE : O.z], ax: 0, name: true, className: 'scene-name -translate-y-full', children: s.body === 'puck' ? `冰球 · ${PUCK.m} kg（放大了画，示意大小）` : `冰壶 · ${STONE.m} kg` },
    { id: 'slow', at: [O.x + 1.1, 1.25, O.z], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: busy && s.body === 'puck' ? 1 : 0 }, children: '画面放慢到 0.4 倍' },
    { id: 'goal', at: [O.x + SHOT.goal + 0.5, 1.5, O.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '球门' },
    { id: 'wall', at: [O.x + SHOT.wall + 0.2, 1.4, WALL_LANE + 1.5], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '板墙' },
  ]
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={L.T.banner} onReset={L.resetAll} hint={hint} actionsLabel="球杆"
      stage={<Place at="l1" labels={labels}><Rig key={mode} mode={mode} run={L.run} onMark={L.mark} tag={tag} /></Place>}
      lesson={<LessonBlock no="1" title="动量" concept="动量等于质量乘速度，有方向" tasks={TASKS} done={L.T.done} current={task?.id}
        theory={<>
          <p>物体的质量和速度的乘积叫<b className="text-white">动量</b>：p = mv，单位是千克米每秒（kg·m/s）。</p>
          <p className="mt-3">动量是<b className="text-white">矢量</b>，方向和速度的方向相同。在一条直线上运动时，先选一个正方向，动量就可以用带正负号的数表示。</p>
          <p className="mt-3">动量的变化量 Δp = p′ − p 也是矢量。冰球撞板墙以后往回走，p′ 是负的，所以 Δp 的大小比两个动量的大小都大。</p>
          <p className="mt-3 text-[13.5px] text-white/65">画面上白色箭头是速度，黄色箭头是动量，长度都按大小画。这里取向右为正；冰面的摩擦忽略不计。</p>
        </>} />}
      finale={L.T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种击法都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">动量 p = mv，是有方向的量</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">冰球 10 m/s 的动量只有 {num(shotP('fast'))} kg·m/s，冰壶才 0.5 m/s 却有 {num(shotP('stone'), 1)} kg·m/s。撞板墙弹回来，动量从 {num(shotP('wall'))} 变成 {num(momentum(PUCK.m, -SHOTS.wall.back))}，变化了 {num(wallDp())} kg·m/s。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => L.T.setFinale(false)}>再击几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">p = m v</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums" style={{ color: COL.p }}>{num(pNow)}<span className="ml-1 text-[15px] font-medium text-white/55">kg·m/s</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数（向右为正）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="m" value={String(m)} unit="kg" />
            <ParamTile symbol="v" value={num(vNow, 1)} unit="m/s" />
            <ParamTile symbol={mode === 'wall' ? 'Δp' : 'p'} value={mode === 'wall' ? (bounced ? num(wallDp()) : '—') : num(pNow)} unit="kg·m/s" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每击一次自动记一行。白色箭头是速度，黄色箭头是动量。</p>
            : <table className="mt-1 w-full text-[13px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">击法</th><th className="text-right font-normal">m / kg</th><th className="text-right font-normal">v / (m/s)</th><th className="text-right font-normal">p / (kg·m/s)</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{SHOTS[k].body === 'puck' ? '冰球' : '冰壶'}{k === 'wall' ? '（撞墙）' : ''}</td><td className="text-right tabular-nums">{shotM(k)}</td><td className="text-right tabular-nums">{k === 'wall' ? `${SHOTS[k].v} → −${SHOTS[k].back}` : SHOTS[k].v}</td><td className="text-right font-semibold tabular-nums" style={{ color: COL.p }}>{k === 'wall' ? `${num(shotP(k))} → ${num(momentum(PUCK.m, -SHOTS.wall.back))}` : num(shotP(k))}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={L.go} disabled={busy || L.run !== 0}>击出</LabButton>
        <LabButton pulse={next === 'home'} onClick={L.home} disabled={busy || L.run === 0}>放回原处</LabButton>
      </>}
      extras={<Control label="击法"><Segmented label="击法" pulse={next === 'mode'} want={next === 'mode' ? L.want : null} value={mode} disabled={busy} onChange={L.pick} options={KEYS.map(k => ({ value: k, label: SHOTS[k].name }))} /></Control>}
    />
  )
}
