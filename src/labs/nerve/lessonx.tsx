// 神经调节 · 拓展 接球 · 反应和刹车：两个小实验。
// 接球：展馆正中的人看见一个飞来的球，一步一步：看见、判断、伸手、接住，看每一步冲动走在哪里；
// 反应和刹车：右后方沙盘里一辆小车以 54 km/h 行驶，比较反应时间 0.5 s 和 1.0 s 时，踩下刹车之前车走了多远。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CORD, EYE_AT, SHOULDER, armDown, armRoot, cordAt, inHead } from './body'
import type { TagKey } from './brain'
import { LESSONS, goLesson } from './lessons'
import { Place, ease, useRun } from './parts'
import { CAR_RT, CAR_V, CATCH_STEPS, reactDist } from './physics'
import type { V3 } from './sdf'
import { Flash, Impulse, route } from './signal'
import { Big, Chain } from './ui'
import { BENCH_X, ROAD_AT, ROAD_K, onBody } from './world'

const TASKS: Task[] = [
  { id: 'catch', text: '一步一步接住飞来的球', note: '看见、判断、伸手、接住：眼、大脑、小脑、脊髓和肌肉一起完成' },
  { id: 'a', text: `反应 ${CAR_RT.a.toFixed(1)} s 时踩刹车`, note: `54 km/h 时，${CAR_RT.a.toFixed(1)} s 里车走了 ${reactDist(CAR_V, CAR_RT.a).toFixed(1)} m` },
  { id: 'b', text: `反应变慢到 ${CAR_RT.b.toFixed(1)} s，再踩一次`, note: `${CAR_RT.b.toFixed(1)} s 里车走了 ${reactDist(CAR_V, CAR_RT.b).toFixed(1)} m，多走了一倍` },
]
const RAISE = 1.25
/** 左臂抬起来以后，手臂上一点（身体坐标）在哪 */
const raised = (p: V3, a = RAISE): V3 => { const v = new THREE.Vector3(p[0] - SHOULDER[0], p[1] - SHOULDER[1], p[2] - SHOULDER[2]).applyAxisAngle(new THREE.Vector3(1, 0, 0), -a); return [SHOULDER[0] + v.x, SHOULDER[1] + v.y, SHOULDER[2] + v.z] }
const HAND = onBody(raised([3.12, 8.0, 0.32]))
const BALL0: V3 = [2.6, 13.5, 17]
const B = (pts: V3[]) => pts.map(onBody)
const MOTOR = inHead([3.5, 3.9, 1.2]), VISION = inHead([2.2, 0.8, -6.8]), FRONT = inHead([2.4, 2.2, 4.4]), SENSE = inHead([3.6, 3.7, -0.8])
const cordDown = [...CORD].filter(p => p[1] > 14.75)
const PATHS = {
  see: route(B([EYE_AT(1), [0.22, 16.6, 0.5], inHead([0.8, -1.4, 3.6]), inHead([1.6, -0.8, -2.5]), VISION])),
  judge: route(B([VISION, inHead([3.0, 3.0, -3.5]), FRONT])),
  reach: route(B([FRONT, MOTOR, inHead([1.4, 0.2, 0.2]), inHead([0.3, -5.0, -2.0]), ...cordDown, cordAt(14.75)]), B(armRoot(1)), B(armDown(1).map(p => raised(p)))),
  grab: route(B([...armDown(1)].reverse().map(p => raised(p))), B([...armRoot(1)].reverse()), B([cordAt(14.75), ...[...cordDown].reverse(), inHead([0.3, -5.0, -2.0]), inHead([1.4, 0.2, 0.2]), SENSE])),
}
const AREAS: TagKey[][] = [['vision'], ['cortex', 'vision'], ['motor', 'cerebellum'], ['sense']]

export default function LessonX() {
  const [part, setPart] = useState<'catch' | 'car'>('catch')
  const [step, setStep] = useState(0)                  // 接球做到第几步（0–4）
  const [rt, setRt] = useState<keyof typeof CAR_RT | null>(null)
  const T = useTasks('gewu:nerve:x', TASKS)
  const stepRef = useRef(step); stepRef.current = step
  const go = useRun(3.2, () => { const n = stepRef.current + 1; setStep(n); if (n >= 4) T.check(id => id === 'catch') })
  const rtRef = useRef(rt); rtRef.current = rt
  const drive = useRun(3.2, () => T.check(id => id === rtRef.current))
  const busy = go.busy || drive.busy
  const doStep = () => { if (busy || step >= 4) return; go.run() }
  const doDrive = (k: keyof typeof CAR_RT) => { if (busy) return; setRt(k); drive.run() }
  const resetAll = () => { go.snap(0); drive.snap(0); setStep(0); setRt(null); setPart('catch'); T.reset() }
  const task = T.current
  const wantPart = !task ? null : task.id === 'catch' ? 'catch' : 'car'
  const { hint, next }: { hint: string; next: 'part' | 'step' | 'a' | 'b' | null } = !task ? { hint: '接球要靠眼、大脑、小脑、脊髓和肌肉配合；反应越慢，踩下刹车前车走得越远。', next: null }
    : go.busy ? { hint: `${CATCH_STEPS[step].name}：${CATCH_STEPS[step].who}`, next: null }
    : drive.busy ? { hint: '司机看见前方有危险，脚正从油门移向刹车…', next: null }
    : wantPart && part !== wantPart ? { hint: wantPart === 'catch' ? '选“接球”' : '球接住了。选“反应和刹车”', next: 'part' }
    : task.id === 'catch' ? { hint: `按“${CATCH_STEPS[step].name}”`, next: 'step' }
    : task.id === 'a' ? { hint: `按“反应 ${CAR_RT.a.toFixed(1)} s”`, next: 'a' }
    : { hint: `按“反应 ${CAR_RT.b.toFixed(1)} s”，比一比`, next: 'b' }
  // 接球的画面
  const cur = go.busy ? step : -1
  const raise = step >= 3 || (cur === 2 && go.k > 0.7) ? RAISE * (cur === 2 ? ease(Math.min(1, (go.k - 0.7) / 0.3)) : 1) : 0
  const ballS = Math.min(1, (step + (go.busy ? go.k : 0)) / 4)
  const ball: V3 = [BALL0[0] + (HAND[0] - BALL0[0]) * ballS, BALL0[1] + (HAND[1] + 0.25 - BALL0[1]) * ballS + Math.sin(Math.PI * ballS) * 1.2, BALL0[2] + (HAND[2] + 0.3 - BALL0[2]) * ballS]
  const key = (['see', 'judge', 'reach', 'grab'] as const)[Math.max(0, cur)]
  const brainHi: Partial<Record<TagKey, number>> = cur >= 0 ? Object.fromEntries(AREAS[cur].map(t => [t, 1])) : {}
  // 刹车的画面
  const dist = rt ? reactDist(CAR_V, CAR_RT[rt]) : 0
  const carX = rt ? dist * (drive.busy ? drive.k : 1) : 0
  const braking = !!rt && !drive.busy && drive.k >= 1
  const labels: Label[] = part === 'catch' ? [
    ...(cur >= 0 ? [{ id: 's', at: onBody([2.2, 18.2, 0.5]), ax: 0.5, className: 'scene-tag key -translate-y-full', children: CATCH_STEPS[cur].name }] : []),
    ...(cur === 2 ? [{ id: 'cb', at: onBody(inHead([3.5, -3.5, -5.5])), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>协调动作</small>小脑</> }] : []),
  ] : [
    ...(rt ? [{ id: 'd', at: [ROAD_AT[0] + 0.4 + carX * ROAD_K / 2, BENCH_X.top + 0.9, ROAD_AT[2] - 0.4] as V3, ax: 0.5, className: `scene-tag ${braking ? 'key' : ''} -translate-y-full`, children: <><small>反应 {CAR_RT[rt].toFixed(1)} s 里走了</small>{carX.toFixed(1)} m</> }] : []),
  ]
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={part === 'catch' ? '接球' : '刹车'}
      stage={<Place at={part === 'catch' ? 'catch' : 'car'} labels={labels} want={{ body: { raise, brainHi, nerves: cur >= 0 ? 0.5 : 1, chatter: cur < 0 }, ball: part === 'catch' ? ball : null, car: { x: carX, brake: braking } }}>
        {part === 'catch' && cur >= 0 && <Impulse path={PATHS[key]} s={Math.min(1, go.k / 0.85)} size={0.07} color={cur === 2 ? '#ffd27a' : '#9ff6ff'} />}
        {part === 'catch' && <Flash at={HAND} on={cur === 3 && go.k < 0.3} r={0.5} color="#ffb36b" />}
        {part === 'car' && rt && <mesh position={[ROAD_AT[0] + 0.4 + carX * ROAD_K / 2, BENCH_X.top + 0.05, ROAD_AT[2] - 0.38]} rotation-x={-Math.PI / 2}><planeGeometry args={[Math.max(0.01, carX * ROAD_K), 0.7]} /><meshBasicMaterial color={braking ? '#ff8a8f' : '#ffd27a'} transparent opacity={0.28} depthWrite={false} toneMapped={false} /></mesh>}
      </Place>}
      lesson={<LessonBlock no="拓展" title="接球 · 反应和刹车" concept="反应要经过完整的反射弧，需要时间" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>接住飞来的球：眼的视网膜产生冲动，经视神经传到大脑皮层的视觉中枢；大脑判断球的方向和快慢；躯体运动中枢发出指令，经脊髓、传出神经传到手臂的肌肉；小脑让动作协调、准确。</p>
          <p className="mt-3">从看见危险到踩下刹车要一段反应时间，这段时间里车仍以原来的速度行驶：走过的路 = 车速 × 反应时间。54 km/h 就是每秒 15 m。</p>
          <p className="mt-3">酒精会麻醉人的神经系统，使人反应变慢、动作不协调，所以严禁酒后驾车。</p>
          <p className="mt-3 text-[13.5px] text-white/65">0.5 s 和 1.0 s 只是拿来比较的两个假设值，不是测出来的；踩下刹车以后车还要滑行一段，这里没有算。车的动作放慢了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个小实验都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">反应慢一倍，踩下刹车前车就多走一倍的路</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">54 km/h 时：反应 {CAR_RT.a.toFixed(1)} s 走 {reactDist(CAR_V, CAR_RT.a).toFixed(1)} m，反应 {CAR_RT.b.toFixed(1)} s 走 {reactDist(CAR_V, CAR_RT.b).toFixed(1)} m。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {part === 'catch' ? <>
            <h2 className="text-[12.5px] text-white/55">接住一个球</h2>
            <div className="mt-2"><Chain items={CATCH_STEPS.map((s, i) => ({ name: s.name, sub: i === cur ? undefined : undefined, state: i === cur ? 'now' : i < step ? 'on' : 'off' }))} /></div>
            {cur >= 0 && <p className="mt-2 text-[13px] leading-relaxed text-white/75">{CATCH_STEPS[cur].who}。</p>}
          </> : <>
            <div className="grid grid-cols-2 gap-2">
              <Big label="车速" value="54" unit="km/h" />
              <Big label="反应时间" value={rt ? CAR_RT[rt].toFixed(1) : '—'} unit={rt ? 's' : undefined} />
            </div>
            <div className="mt-2"><Big label="踩下刹车前走了" value={rt ? carX.toFixed(1) : '—'} unit={rt ? 'm' : undefined} tone={braking ? 'bad' : undefined} /></div>
            <p className="mt-2 text-center font-formula text-[15px] italic text-white/60">s = v t</p>
          </>}
        </Glass>
      }
      actions={part === 'catch'
        ? <LabButton primary pulse={next === 'step'} onClick={doStep} disabled={busy || step >= 4}>{step < 4 ? CATCH_STEPS[step].name : '接住了'}</LabButton>
        : <>
          <LabButton primary={next === 'a'} pulse={next === 'a'} onClick={() => doDrive('a')} disabled={busy}>反应 {CAR_RT.a.toFixed(1)} s</LabButton>
          <LabButton primary={next === 'b'} pulse={next === 'b'} onClick={() => doDrive('b')} disabled={busy || !T.done.a}>反应 {CAR_RT.b.toFixed(1)} s</LabButton>
        </>}
      extras={
        <Control label="实验">
          <Segmented label="实验" pulse={next === 'part'} want={next === 'part' ? wantPart : null} value={part} onChange={v => setPart(v as 'catch' | 'car')} disabled={busy} options={[{ value: 'catch', label: '接球' }, { value: 'car', label: '反应和刹车' }]} />
        </Control>
      }
    />
  )
}
