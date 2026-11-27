// 分子和原子 · 拓展 压缩和受热：实验台东头。左边一只木座上立着两支堵住针头的 20 mL 注射器，一支吸满空气、一支吸满水；
// 右边一只烧杯盛着 80 °C 的热水，旁边一只瘪了的乒乓球。推注射器：空气能被压缩，水几乎推不动；把瘪乒乓球放进热水，它慢慢鼓起来。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, Hand, PingPong, SYR, Syringe, Thermometer, beakerFill } from './gear'
import { Steam } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { HOT, SYRINGE_V, airVolume, ballGrow, waterVolume } from './physics'
import { Callout, MolField } from './mol'
import { BZ, Place, ST, TOP, u, type V3 } from './world'

const X0 = ST.x, Z0 = BZ + u(0.04)
type Syr = 'air' | 'water'
const SYX: Record<Syr, number> = { air: X0 - u(0.13), water: X0 - u(0.065) }
const BASE = TOP + u(0.04)                                  // 注射器针座离台面的高度（插在木座里）
const CUP: V3 = [X0 + u(0.06), TOP, Z0], BALL_HOME: V3 = [X0 + u(0.14), TOP + u(0.02), Z0 + u(0.05)]
const FILL = beakerFill(500, 380), BK = BEAKER[500]
const TASKS: Task[] = [
  { id: 'air', text: '用力推装空气的注射器', note: '空气被压缩了：气体分子间的间隔大，容易压缩' },
  { id: 'water', text: '用同样的力推装水的注射器', note: '水几乎推不动：液体分子间的间隔小' },
  { id: 'ball', text: '把瘪了的乒乓球放进热水里', note: '球鼓起来了：受热时，球里空气的分子间隔变大' },
]

export default function LessonX() {
  const T = useTasks('gewu:atom:x', TASKS)
  const [last, setLast] = useState<Syr | null>(null)
  const pushA = useRun(3.4, () => T.check(id => id === 'air'))
  const pushW = useRun(3.4, () => T.check(id => id === 'water'))
  const ball = useRun(6.5, () => T.check(id => id === 'ball'))
  const busy = pushA.busy || pushW.busy || ball.busy
  const resetAll = () => { pushA.snap(0); pushW.snap(0); ball.snap(0); setLast(null); T.reset() }

  // 推活塞：空气推到一半（压强约 2 倍），松手后弹回一些；水几乎不动
  const press = (r: ReturnType<typeof useRun>) => r.busy ? ease(seg(r.t, 0.6, 1.8)) * (1 - ease(seg(r.t, 2.5, 3.2))) : 0
  const vA = SYRINGE_V - (SYRINGE_V - airVolume(2)) * press(pushA), vW = waterVolume(press(pushW))
  // 乒乓球：手拿着放进热水，球浮在水面，瘪的地方慢慢鼓起来
  const bt = ball.t, water: V3 = [CUP[0], TOP + u(BK.h * FILL) - u(0.006), CUP[2]]
  const bpos: V3 = T.done.ball ? water : ball.busy ? (bt < 1.6 ? liftPath(BALL_HOME, [water[0], water[1] + u(0.01), water[2]], TOP + u(0.2), seg(bt, 0, 1.6)) : water) : BALL_HOME
  const dent = T.done.ball ? 0 : ball.busy ? 1 - ease(seg(bt, 2.2, 6)) : 1

  const task = T.current
  const { hint, next }: { hint: string; next: Syr | 'ball' | null } = !task ? { hint: '气体分子间隔大，容易压缩；物体受热时，分子间的间隔变大。', next: null }
    : pushA.busy ? { hint: '用力往下推活塞…', next: null }
    : pushW.busy ? { hint: '用同样的力往下推…', next: null }
    : ball.busy ? { hint: '把乒乓球放进热水里，看着它…', next: null }
    : task.id === 'air' ? { hint: '用力推装空气的注射器', next: 'air' }
    : task.id === 'water' ? { hint: '空气被压缩了。再用同样的力推装水的注射器', next: 'water' }
    : { hint: '水几乎推不动。再把瘪了的乒乓球放进热水里', next: 'ball' }

  const gas = useMemo(() => [{ f: 'N2', share: 0.78 }, { f: 'O2', share: 0.22 }], []), liq = useMemo(() => [{ f: 'H2O', share: 1 }], [])
  const shownSyr: Syr | null = pushA.busy ? 'air' : pushW.busy ? 'water' : last
  const calloutAt: V3 = [X0 - u(0.005), TOP + u(0.17), Z0 - u(0.06)]
  const syrTop = (s: Syr, v: number) => BASE + u(0.007 + v * SYR.per)
  const labels: Label[] = [
    { id: 'a', at: [SYX.air - u(0.02), syrTop('air', vA) - u(0.02), Z0], ax: 1, className: `scene-tag ${T.done.air ? 'key' : ''} -translate-y-1/2`, children: <><small>空气</small>{vA.toFixed(0)} mL</> },
    { id: 'w', at: [SYX.water + u(0.02), syrTop('water', vW) - u(0.02), Z0], ax: 0, className: `scene-tag ${T.done.water ? 'key' : ''} -translate-y-1/2`, children: <><small>水</small>{vW.toFixed(0)} mL</> },
    { id: 'h', at: [CUP[0] + u(0.045), TOP + u(BK.h - 0.01), Z0 + u(0.03)], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>热水</small>{HOT} °C</> },
    { id: 'b', at: [bpos[0], bpos[1] + u(0.04), bpos[2]], ax: 0.5, className: `scene-name -translate-y-full`, children: dent > 0.5 ? '瘪了的乒乓球' : '鼓起来了' },
    { id: 'm', at: [calloutAt[0], calloutAt[1] + u(0.05), calloutAt[2]], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: shownSyr ? 1 : 0 }, children: shownSyr === 'water' ? '放大示意：水分子挨得很紧' : '放大示意：空气里分子间隔很大' },
  ]
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION.x, VOICE)} actionsLabel="操作"
      stage={<Place at="x" labels={labels}>
        {/* 木座：一块带两个孔的木块，注射器针头朝下插在里面 */}
        <RoundedBox args={[u(0.16), u(0.04), u(0.06)]} radius={u(0.005)} position={[(SYX.air + SYX.water) / 2, TOP + u(0.02), Z0]} castShadow receiveShadow><meshStandardMaterial color="#b98a58" roughness={0.7} /></RoundedBox>
        {(['air', 'water'] as Syr[]).map(s => {
          const v = s === 'air' ? vA : vW, r = s === 'air' ? pushA : pushW
          return <group key={s}>
            <group position={[SYX[s], BASE, Z0]}><Syringe v={v} water={s === 'water'} /></group>
            {r.busy && <group position={[SYX[s], syrTop(s, v) + u(0.11), Z0 + u(0.004)]} rotation={[0.2, 0, 0]}><group><Hand grip={0.25} /></group></group>}
          </group>
        })}
        <group position={CUP}>
          <Beaker vol={500} fill={FILL} color="#d6eaf0" opacity={0.35} />
          <group position={[-u(0.025), u(0.012), -u(0.02)]} rotation={[-0.12, 0, 0.18]}><Thermometer t={HOT} /></group>
        </group>
        <Steam at={[CUP[0], TOP + u(BK.h * FILL), Z0]} r={u(0.035)} h={u(0.14)} />
        <group position={bpos} rotation={[-0.9, 0.3, 0.2]}><PingPong dent={dent} /></group>
        {ball.busy && bt < 1.9 && <group position={[bpos[0] + u(0.005), bpos[1] + u(0.075), bpos[2]]} rotation={[0.1, 0.2, 0]}><group><Hand grip={0.9} /></group></group>}
        <Callout at={calloutAt} from={[shownSyr ? SYX[shownSyr] : SYX.air, BASE + u(0.03), Z0 + u(0.012)]} r={u(0.042)} fieldR={24} show={shownSyr ? 1 : 0}>
          {shownSyr === 'water' ? <MolField species={liq} R={24} gap={3.1} seed={2} /> : <MolField species={gas} R={24} gap={press(pushA) > 0.5 ? 6.2 : 8.4} seed={6} speed={1.6} />}
        </Callout>
      </Place>}
      lesson={<LessonBlock no="拓展" title="压缩和受热" concept="分子间隔有大有小，受热会变大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>气体分子之间的间隔很大，容易被压缩；液体、固体分子之间的间隔小，很难被压缩。</p>
          <p className="mt-2">物体受热时分子间的间隔变大，遇冷时变小，这就是热胀冷缩。瘪乒乓球里的空气受热，分子间隔变大，把球撑了起来。</p>
          <p className="mt-2 text-[13.5px] text-white/65">温度不变时，把空气压到原来的一半，它的压强约变为原来的 2 倍；压强不变时，空气从 20 °C 加热到 {HOT} °C，体积约变为原来的 {ballGrow(HOT).toFixed(1)} 倍。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个小实验都做过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">分子间隔有大有小，受热会变大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">空气能压缩，水几乎压不动：气体分子间隔大。瘪乒乓球在热水里鼓起来：受热时分子间的间隔变大。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">注射器里的空气</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{vA.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">两支注射器，原来都是 {SYRINGE_V} mL</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="空气" value={T.done.air ? `${airVolume(2)}` : '—'} unit="mL · 用力推时最小" />
            <ParamTile symbol="水" value={T.done.water ? `${waterVolume(1).toFixed(0)}` : '—'} unit="mL · 几乎不变" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'air'} pulse={next === 'air'} onClick={() => { setLast('air'); pushA.run() }} disabled={busy}>推空气</LabButton>
        <LabButton primary={next === 'water'} pulse={next === 'water'} onClick={() => { setLast('water'); pushW.run() }} disabled={busy}>推水</LabButton>
        <LabButton primary={next === 'ball'} pulse={next === 'ball'} onClick={() => ball.run()} disabled={busy || !!T.done.ball}>放进热水</LabButton>
      </>}
      extras={null}
    />
  )
}
