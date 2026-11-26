// 质量守恒定律 · 第 1 课 红磷燃烧前后（样板课）：化验室第 1 格。锥形瓶底铺一层细沙，沙上放红磷；橡胶塞上插一根玻璃管，管口套一只气球。
// 先把锥形瓶放上左盘，用镊子夹砝码、拨游码到平衡；再取下锥形瓶，玻璃管下端在酒精灯上烧红，迅速塞紧，红磷燃烧；冷却后放回天平，指针仍在正中。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Balloon, FLASK, Flask, GlassTube, Glove, LAMP_TOP, SandAndP, Stopper } from './gear'
import { Flame, Glow, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { Carry, ease, liftPath, seg, useRun, type V3 } from './parts'
import { EQ, L1, eqText, g1, l1Parts } from './physics'
import { BenchKit, PTR, bench, dialAt, leftPan, useRig } from './rig'
import { BZ, M, ST, TOP, Place } from './world'

const X0 = ST.l1, B = bench(X0, TOP, BZ)
const u = (v: number) => v * M
const LAMP: V3 = [X0 - 1.2, TOP, BZ + 0.62]
const PLUG = FLASK.top - 0.016
const TASKS: Task[] = [
  { id: 'before', text: '把锥形瓶放到左盘上，称出总质量', note: `反应前：${g1(L1.total)} g` },
  { id: 'burn', text: '取下锥形瓶，点燃红磷', note: '红磷燃烧，产生大量白烟；气球先胀大，冷却后变瘪' },
  { id: 'after', text: '冷却后放回天平，看指针', note: '指针仍指在正中：反应后总质量不变' },
]
const P = l1Parts()

/** 塞子、玻璃管、气球这一组：原点在锥形瓶底，balloon 是气球鼓起的程度，glow 是玻璃管下端烧红的程度 */
function Plug({ balloon, glow }: { balloon: number; glow: number }) {
  return <group>
    <group position-y={u(PLUG)}><Stopper holes={[0]} /></group>
    <GlassTube pts={[[0, u(0.014), 0], [0, u(0.2), 0]]} r={0.0028} />
    <group position-y={u(0.2)}><Balloon k={balloon} /></group>
    <Glow at={[0, u(0.016), 0]} r={u(0.0034)} level={glow} light={0.6} />
  </group>
}

export default function Lesson1() {
  const rig = useRig(L1.total)
  const [weighed, setWeighed] = useState(false)
  const [burnt, setBurnt] = useState(false)
  const T = useTasks('gewu:mass:1', TASKS)
  const fire = useRun(15, () => { setBurnt(true); T.check(id => id === 'burn') })
  useEffect(() => { if (rig.steady && rig.target != null && !weighed) { setWeighed(true); T.check(id => id === 'before') } }, [rig.steady])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (rig.steady && burnt) T.check(id => id === 'after') }, [rig.steady, burnt])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { rig.clear(); fire.snap(0); setWeighed(false); setBurnt(false); T.reset() }
  const t = fire.t, busy = fire.busy

  const task = T.current
  const { hint, next }: { hint: string; next: 'weigh' | 'fire' | 'back' | null } = !task ? { hint: '红磷在密闭的锥形瓶里燃烧，反应前后称得的总质量相等。', next: null }
    : task.id === 'before' ? (!rig.on ? { hint: '把锥形瓶放到左盘上，称一称', next: 'weigh' } : { hint: '用镊子往右盘夹砝码，再拨游码，直到指针指在正中…', next: null })
    : task.id === 'burn' ? (!busy ? { hint: '取下锥形瓶，点燃红磷', next: 'fire' }
      : t < 1.8 ? { hint: '把锥形瓶从天平上取下来…', next: null }
      : t < 5 ? { hint: '把玻璃管的下端放在酒精灯火焰上烧红…', next: null }
      : t < 6.6 ? { hint: '迅速把塞子塞紧，烧红的玻璃管碰到红磷…', next: null }
      : { hint: '红磷燃烧，产生大量白烟；气球先胀大，冷却后变瘪…', next: null })
    : !rig.on ? { hint: '锥形瓶冷却了，把它放回左盘', next: 'back' } : { hint: '看指针停在哪…', next: null }

  // 塞子那一组：从瓶口提起来，挪到酒精灯上方，玻璃管下端伸进火焰，烧红后再塞回去
  const to: V3 = [LAMP[0] - B.rest[0], u(LAMP_TOP + 0.03 - 0.014), LAMP[2] - B.rest[2]]
  const off: V3 = !busy ? [0, 0, 0] : t < 1.8 ? [0, 0, 0] : t < 3.2 ? liftPath([0, 0, 0], to, u(0.16), seg(t, 1.8, 3.2)) : t < 5 ? to : t < 6.4 ? liftPath(to, [0, 0, 0], u(0.16), seg(t, 5, 6.4)) : [0, 0, 0]
  const glow = busy ? seg(t, 3.4, 4.8) * (1 - seg(t, 6.4, 8)) : 0
  const lamp = busy ? seg(t, 1.2, 1.8) * (1 - seg(t, 6.2, 6.8)) : 0
  const pf = busy ? seg(t, 6.4, 6.9) * (1 - seg(t, 9.6, 10.6)) : 0              // 红磷的火
  const smoke = burnt ? 0.28 : busy ? ease(seg(t, 6.5, 9)) * (1 - 0.72 * seg(t, 10, 15)) : 0
  const balloon = burnt ? 0.06 : busy ? 0.14 + 0.86 * ease(seg(t, 6.6, 8.4)) - 0.94 * ease(seg(t, 9.5, 14.5)) : 0.14
  const pBurnt = burnt ? 1 : busy ? seg(t, 6.5, 10) : 0
  const flaskAt: V3 = rig.on ? leftPan(B) : B.rest

  const dial = dialAt(B)
  const shown = burnt && rig.on && rig.steady ? 'after' : weighed ? 'before' : null
  const labels: Label[] = [
    ...(shown ? [{ id: 'm', at: dial, ax: 0, className: `scene-tag ${shown === 'after' ? 'key' : ''} -translate-y-1/2`, children: <><small>{shown === 'after' ? '反应后' : '反应前'}</small>{g1(L1.total)} g{shown === 'after' && <span className="delta eq">不变</span>}</> }] : []),
    ...(burnt && rig.on && rig.steady ? [{ id: 'p', at: [dial[0], dial[1] - 0.3, dial[2]] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: PTR[rig.ptr] }] : []),
    { id: 'n1', at: [B.base[0], TOP + 0.02, B.base[2] + 0.45], ax: 0.5, name: true, className: 'scene-name', children: '托盘天平' },
    { id: 'n2', at: [B.box[0], TOP + 0.02, B.box[2] + 0.3], ax: 0.5, name: true, className: 'scene-name', children: '砝码盒' },
    { id: 'n3', at: [flaskAt[0] - u(0.05), flaskAt[1] + u(0.06), flaskAt[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '锥形瓶（细沙上放红磷）' },
    { id: 'n4', at: [flaskAt[0] + u(0.04), flaskAt[1] + u(0.24), flaskAt[2]], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '气球' },
    { id: 'n5', at: [LAMP[0], TOP - 0.02, LAMP[2] + 0.3], ax: 0.5, name: true, className: 'scene-name', children: '酒精灯' },
  ]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="红磷燃烧前后的质量"
      stage={<Place at="l1" labels={labels}>
        <BenchKit b={B} rig={rig} />
        {/* 锥形瓶：在天平和台面之间搬，搬的时候有手拿着 */}
        <Carry at={flaskAt} ride={rig.on ? 'L' : null} live={rig.live} lift={0.3} speed={1.6}
          extra={<group position={[u(0.03), u(0.125), u(0.02)]} rotation={[0.4, 0, 0.9]}><Glove /></group>}>
          <Flask level={smoke > 0.01 ? 0.138 : 0} color="#f5f5f1" opacity={0.6 * smoke}><SandAndP burnt={pBurnt} /></Flask>
          <group position={off}>
            <Plug balloon={balloon} glow={glow} />
            {busy && t > 1.8 && t < 6.4 && <group position={[u(0.022), u(0.17), u(0.01)]} rotation={[0.3, 0, 0.6]}><Glove s={u(0.0056)} /></group>}
          </group>
          <Flame at={[0, u(0.0105), 0]} w={u(0.016)} h={u(0.03)} kind="phos" level={pf} seed={2} light={1.2} lightColor="#ffd890" />
          <Puffs at={[0, u(0.02), 0]} on={pf > 0.2} opt={{ ...SMOKE.white(u(0.012)), life: 1.6, speed: u(0.025) }} seed={3} />
        </Carry>
        <group position={LAMP}><AlcoholLamp /></group>
        <Flame at={[LAMP[0], LAMP[1] + u(LAMP_TOP), LAMP[2]]} w={u(0.012)} h={u(0.034)} kind="alcohol" level={lamp} seed={5} light={0.6} />
      </Place>}
      lesson={<LessonBlock no="1" title="红磷燃烧前后" concept="密闭容器里，反应前后总质量不变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>红磷在空气中燃烧，和氧气反应生成五氧化二磷：</p>
          <p className="mt-2 text-center font-formula text-[16px]">{eqText(EQ.phos).replace('=', '=点燃=')}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>锥形瓶塞紧以后，瓶里的空气和红磷都出不去，生成的白烟也跑不掉，称的是全部参加反应的物质和生成物</li>
            <li>瓶底铺细沙：防止红磷燃烧时锥形瓶底部受热不均而炸裂</li>
            <li>气球：燃烧放热，瓶里的气体膨胀，气球鼓起来缓冲，防止塞子被冲开；冷却后瓶里的氧气被消耗，气球变瘪</li>
          </ul>
          <p className="mt-3"><b className="text-white">质量守恒定律</b>：参加化学反应的各物质的质量总和，等于反应后生成的各物质的质量总和。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">反应前后各称了一次</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">密闭容器里，反应前后总质量不变：{g1(L1.total)} g = {g1(L1.total)} g</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">参加反应的红磷和氧气的质量总和，等于生成的五氧化二磷的质量。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">锥形瓶装置的总质量</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{weighed ? g1(L1.total) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <tbody>
              <tr className="border-b border-white/10"><td className="py-1.5 text-white/60">反应前</td><td className="py-1.5 text-right font-semibold">{weighed ? `${g1(L1.total)} g` : '—'}</td></tr>
              <tr><td className="py-1.5 text-white/60">反应后</td><td className={`py-1.5 text-right font-semibold ${T.done.after ? 'text-[#7fe3d4]' : ''}`}>{T.done.after ? `${g1(L1.total)} g` : '—'}</td></tr>
            </tbody>
          </table>
          <h2 className="mt-5 text-[12.5px] text-white/55">参加反应的物质（示意）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="P" value={P.p.toFixed(2)} unit="g · 红磷" />
            <ParamTile symbol="O₂" value={P.o2.toFixed(2)} unit="g · 氧气" />
            <ParamTile symbol="P₂O₅" value={P.p2o5.toFixed(2)} unit="g · 生成" />
          </div>
          <p className="mt-2 text-center font-formula text-[15px] text-white/70">{P.p.toFixed(2)} + {P.o2.toFixed(2)} = {P.p2o5.toFixed(2)}</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'weigh'} pulse={next === 'weigh'} onClick={() => { rig.put(true); rig.weigh() }} disabled={rig.on || weighed}>称量</LabButton>
        <LabButton primary={next === 'fire'} pulse={next === 'fire'} onClick={() => { rig.put(false); fire.run() }} disabled={!weighed || busy || burnt}>点燃红磷</LabButton>
        <LabButton primary={next === 'back'} pulse={next === 'back'} onClick={() => rig.put(true)} disabled={!burnt || rig.on}>放回天平</LabButton>
      </>}
      extras={null}
    />
  )
}
