// 质量守恒定律 · 第 3 课 天平不平衡了？：化验室第 3 格。三个实验用分段选择切换：
// 敞口烧杯——碳酸钠粉末和盐酸，二氧化碳跑掉，放回天平右盘下沉；镁条——在陶土网上方点燃，生成的氧化镁比镁条重，左盘下沉；
// 密闭锥形瓶——同样的碳酸钠和盐酸，塞子上套气球，放回天平仍平衡。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, BEAKER, Balloon, Beaker, ClayNet, CrucibleTongs, FLASK, Flask, GlassTube, Glove, LAMP_TOP, MgOPile, MgStrip, Powder, Stopper, TestTube } from './gear'
import { Bubbles, Flame, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { Carry, ease, liftPath, seg, useRun, type V3 } from './parts'
import { EQ, L3, eqText, g1, l3After, l3Delta, type L3Key } from './physics'
import { BenchKit, PTR, bench, dialAt, leftPan, useRig } from './rig'
import { BZ, M, ST, TOP, Place } from './world'

const X0 = ST.l3, B = bench(X0, TOP, BZ)
const u = (v: number) => v * M
const LAMP: V3 = [X0 - 1.2, TOP, BZ + 0.62]
const KEYS: L3Key[] = ['open', 'mg', 'sealed']
const TASKS: Task[] = [
  { id: 'open', text: '敞口烧杯里让碳酸钠和盐酸反应，再称', note: '右盘下沉：生成的二氧化碳跑到空气里去了' },
  { id: 'mg', text: '镁条燃烧前后各称一次', note: '左盘下沉：氧化镁里多了参加反应的氧气' },
  { id: 'sealed', text: '改用密闭的锥形瓶，再做一次', note: '天平平衡：密闭容器里，反应前后总质量不变' },
]
const ACT: Record<L3Key, string> = { open: '倒入盐酸', mg: '点燃镁条', sealed: '倒入盐酸' }
const PUT: Record<L3Key, string> = { open: '把烧杯放到左盘上，称一称', mg: '把镁条和陶土网放到左盘上，称一称', sealed: '把密闭的锥形瓶放到左盘上，称一称' }
const GO: Record<L3Key, string> = { open: '取下烧杯，让小试管里的盐酸流进烧杯', mg: '取下陶土网，点燃镁条', sealed: '取下锥形瓶，让小试管里的盐酸流出来' }
const SEC: Record<L3Key, number> = { open: 8, mg: 12.5, sealed: 9 }

/** 盛盐酸的小试管：斜靠在容器里；tip 倾倒的程度（0 立着，1 倒完） */
function AcidTube({ tip }: { tip: number }) {
  return <group position={[u(0.008), u(0.003), 0]} rotation-z={0.18 + tip * 0.45}>
    <group scale={[0.65, 0.5, 0.65]}><TestTube fill={0.42 * (1 - Math.min(1, tip * 1.4))} color="#e8eef0" opacity={0.42} /></group>
  </group>
}

export default function Lesson3() {
  const [exp, setExp] = useState<L3Key>('open')
  const [weighed, setWeighed] = useState(false)
  const [reacted, setReacted] = useState(false)
  const T = useTasks('gewu:mass:3', TASKS)
  const rig = useRig(reacted ? l3After(exp) : L3[exp].total)
  const run = useRun(SEC[exp], () => setReacted(true))
  useEffect(() => { if (rig.steady && rig.target != null && !weighed) setWeighed(true) }, [rig.steady])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (rig.steady && reacted) T.check(id => id === exp) }, [rig.steady, reacted])   // eslint-disable-line react-hooks/exhaustive-deps
  const fresh = () => { rig.clear(); run.snap(0); setWeighed(false); setReacted(false) }
  const pick = (k: L3Key) => { if (run.busy || k === exp) return; fresh(); setExp(k) }
  const resetAll = () => { fresh(); setExp('open'); T.reset() }
  const t = run.t, busy = run.busy

  const task = T.current
  const after = reacted && rig.on && rig.steady
  const { hint, next }: { hint: string; next: 'weigh' | 'react' | 'back' | 'pick' | null } = !task ? { hint: '有气体参加或生成的反应，要在密闭容器里称，才能验证质量守恒。', next: null }
    : task.id !== exp && (after || !weighed) ? { hint: `换成“${L3[task.id as L3Key].name}”`, next: 'pick' }
    : !weighed ? (!rig.on ? { hint: PUT[exp], next: 'weigh' } : { hint: '用镊子往右盘夹砝码，再拨游码，直到指针指在正中…', next: null })
    : !reacted ? (!busy ? { hint: GO[exp], next: 'react' }
      : exp === 'mg' ? (t < 4.4 ? { hint: '用坩埚钳夹住镁条，在酒精灯上点燃…', next: null } : { hint: '镁条剧烈燃烧，发出耀眼的白光，生成白色粉末…', next: null })
      : exp === 'open' ? { hint: '烧杯里冒出大量气泡…', next: null } : { hint: '锥形瓶里冒出大量气泡，气球鼓了起来…', next: null })
    : !rig.on ? { hint: '反应完了，放回天平', next: 'back' } : { hint: '看指针停在哪…', next: null }

  // 搬到台面上反应：敞口烧杯、锥形瓶里的小试管倒下；镁条用坩埚钳夹到酒精灯上点燃，再挪到陶土网上方烧
  const tip = reacted ? 1 : busy && exp !== 'mg' ? ease(seg(t, 1.8, 3.2)) : 0
  const fizz = exp !== 'mg' && busy && t > 2.8 && t < SEC[exp] - 1
  const powder = reacted && exp !== 'mg' ? 0 : busy && exp !== 'mg' ? 1 - seg(t, 3, SEC[exp] - 1.5) : 1
  const balloon = exp === 'sealed' ? (reacted ? 0.8 : busy ? 0.12 + 0.68 * ease(seg(t, 3, 7.5)) : 0.12) : 0
  const lamp = exp === 'mg' && busy ? seg(t, 1.2, 1.8) * (1 - seg(t, 5.2, 5.8)) : 0
  const NET_Y = u(0.08)
  const stripHome: V3 = [u(-0.045), u(0.004), 0]
  const overLamp: V3 = [LAMP[0] - B.rest[0] - u(0.11), u(LAMP_TOP + 0.03), LAMP[2] - B.rest[2]]
  const overNet: V3 = [u(-0.06), NET_Y, 0]
  const stripAt: V3 = exp !== 'mg' || !busy ? stripHome : t < 1.8 ? stripHome : t < 3.2 ? liftPath(stripHome, overLamp, u(0.12), seg(t, 1.8, 3.2)) : t < 4.4 ? overLamp : t < 5.4 ? liftPath(overLamp, overNet, u(0.12), seg(t, 4.4, 5.4)) : overNet
  const burn = exp === 'mg' ? (reacted ? 1 : busy ? seg(t, 4.2, 10.5) : 0) : 0
  const glare = exp === 'mg' && busy ? seg(t, 3.9, 4.3) * (1 - seg(t, 10.2, 10.8)) : 0
  const held = exp === 'mg' && busy && t > 1.8 && t < 11.2
  const at: V3 = rig.on ? leftPan(B) : B.rest
  // 倒盐酸时把容器整个倾斜一下，小试管里的盐酸流出来
  const lean = exp !== 'mg' && busy ? Math.sin(Math.PI * seg(t, 1.6, 3.4)) * 0.45 : 0
  const tipAt: V3 = [at[0] + stripAt[0] + u(0.1) * (1 - burn), at[1] + stripAt[1], at[2] + stripAt[2]]

  const dial = dialAt(B), d = l3Delta(exp)
  const labels: Label[] = [
    ...(weighed ? [{ id: 'm', at: dial, ax: 0, className: `scene-tag ${after ? 'key' : ''} -translate-y-1/2`, children: after ? <><small>反应后约</small>{g1(l3After(exp))} g<span className={`delta ${Math.abs(d) < 1e-9 ? 'eq' : ''}`}>{Math.abs(d) < 1e-9 ? '不变' : d < 0 ? `轻了 ${(-d).toFixed(2)} g` : `重了 ${d.toFixed(2)} g`}</span></> : <><small>反应前</small>{g1(L3[exp].total)} g</> }] : []),
    ...(after ? [{ id: 'p', at: [dial[0], dial[1] - 0.3, dial[2]] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: PTR[rig.ptr] }] : []),
    { id: 'n1', at: [B.base[0], TOP + 0.02, B.base[2] + 0.45], ax: 0.5, name: true, className: 'scene-name', children: '托盘天平' },
    { id: 'n3', at: [at[0] - u(0.045), at[1] + u(exp === 'mg' ? 0.03 : 0.08), at[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: exp === 'open' ? '碳酸钠粉末、盛盐酸的小试管' : exp === 'mg' ? '陶土网和镁条' : '密闭的锥形瓶' },
    ...(exp === 'mg' ? [{ id: 'n5', at: [LAMP[0], TOP - 0.02, LAMP[2] + 0.3] as V3, ax: 0.5, name: true, className: 'scene-name', children: '酒精灯' }] : []),
  ]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel={L3[exp].name}
      stage={<Place at="l3" labels={labels}>
        <BenchKit b={B} rig={rig} />
        <Carry at={at} ride={rig.on ? 'L' : null} live={rig.live} lift={0.3} speed={1.6} snap={exp} extra={<group position={[u(0.03), u(exp === 'mg' ? 0.03 : exp === 'open' ? 0.06 : 0.12), u(0.02)]} rotation={[0.4, 0, 0.9]}><Glove s={u(0.006)} /></group>}>
          {exp === 'open' && <group rotation-z={lean}>
            <Beaker vol={100} fill={tip * 0.2} color="#e7eef0" opacity={0.36}><Powder r={BEAKER[100].r} k={powder} /><AcidTube tip={tip} /></Beaker>
            <Bubbles at={[0, u(0.004), 0]} top={u(0.012)} on={fizz} rate={90} r={u(0.0012)} spread={u(0.018)} speed={u(0.03)} seed={6} />
          </group>}
          {exp === 'sealed' && <group rotation-z={lean}>
            <Flask level={tip * 0.02} color="#e7eef0" opacity={0.36}><Powder r={FLASK.r * 0.8} k={powder} /><AcidTube tip={tip} /></Flask>
            <group position-y={u(FLASK.top - 0.016)}><Stopper holes={[0]} /></group>
            <GlassTube pts={[[0, u(0.12), 0], [0, u(0.17), 0]]} r={0.0028} />
            <group position-y={u(0.17)}><Balloon k={balloon} /></group>
            <Bubbles at={[0, u(0.004), 0]} top={u(0.016)} on={fizz} rate={90} r={u(0.0012)} spread={u(0.025)} speed={u(0.03)} seed={6} />
          </group>}
          {exp === 'mg' && <>
            <ClayNet s={0.095} />
            <MgOPile k={burn} />
            {!held && burn < 1 && <group position={stripHome}><MgStrip burnt={burn} /></group>}
          </>}
        </Carry>
        {/* 镁条：坩埚钳夹着；烧的那一头发出耀眼的白光 */}
        {exp === 'mg' && held && <group position={[at[0] + stripAt[0], at[1] + stripAt[1], at[2] + stripAt[2]]}>
          <MgStrip burnt={burn} />
          <group rotation-y={0.3}><group position={[u(-0.002), 0, 0]} rotation-y={Math.PI}><CrucibleTongs /></group></group>
          <group position={[u(-0.2), u(0.02), u(0.06)]} rotation={[0.3, 0, -0.6]}><Glove s={u(0.0056)} /></group>
        </group>}
        {exp === 'mg' && <>
          <group position={LAMP}><AlcoholLamp /></group>
          <Flame at={[LAMP[0], LAMP[1] + u(LAMP_TOP), LAMP[2]]} w={u(0.012)} h={u(0.034)} kind="alcohol" level={lamp} seed={5} light={0.6} />
          <Flame at={[tipAt[0], tipAt[1] - u(0.006), tipAt[2]]} w={u(0.026)} h={u(0.03)} kind="mg" level={glare} seed={7} light={6} lightColor="#f4f6ff" />
          <Puffs at={[tipAt[0], tipAt[1] + u(0.01), tipAt[2]]} on={glare > 0.3} opt={SMOKE.white(u(0.04))} seed={8} />
        </>}
      </Place>}
      lesson={<LessonBlock no="3" title="天平不平衡了？" concept="有气体进出，要在密闭容器里称" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p className="text-center font-formula text-[15px]">{eqText(EQ.soda)}</p>
          <p className="mt-1 text-center font-formula text-[15px]">{eqText(EQ.mg).replace('=', '=点燃=')}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>敞口烧杯：生成的二氧化碳逸散到空气里，没有称进去，所以称得的质量变小</li>
            <li>镁条：参加反应的氧气来自空气，反应前没有称进去，生成的氧化镁里包含它，所以称得的质量变大（实际做时一部分白烟跑掉，可能反而变小）</li>
            <li>这些反应都遵守质量守恒定律。有气体参加或生成的反应，要在<b className="text-white">密闭容器</b>里进行，才能用称量来验证</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个实验都称过了</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">称得质量变了，是有气体跑出去或参加了反应；密闭容器里质量不变</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">一切化学反应都遵守质量守恒定律。验证时，有气体参加或生成的反应要在密闭容器中进行。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{L3[exp].name} · 反应{after ? '后约' : '前'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{weighed ? g1(after ? l3After(exp) : L3[exp].total) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-[12.5px] text-white/50"><td className="pb-1">实验</td><td className="pb-1 text-right">反应前</td><td className="pb-1 text-right">反应后约</td></tr></thead>
            <tbody>{KEYS.map(k => <tr key={k} className={`border-t border-white/10 ${k === exp ? 'text-white' : 'text-white/60'}`}>
              <td className="py-1.5">{L3[k].name}</td><td className="py-1.5 text-right">{T.done[k] || (k === exp && weighed) ? g1(L3[k].total) : '—'}</td>
              <td className={`py-1.5 text-right font-semibold ${T.done[k] ? 'text-[#7fe3d4]' : ''}`}>{T.done[k] ? g1(l3After(k)) : '—'}</td></tr>)}</tbody>
          </table>
          <h2 className="mt-5 text-[12.5px] text-white/55">质量的变化（示意）</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol={exp === 'mg' ? 'Mg' : 'Na₂CO₃'} value={L3[exp].solid.toFixed(2)} unit={`g · ${exp === 'mg' ? '镁条' : '碳酸钠'}`} />
            <ParamTile symbol={exp === 'mg' ? '+ O₂' : exp === 'open' ? '− CO₂' : 'Δm'} value={Math.abs(d).toFixed(2)} unit={exp === 'mg' ? 'g · 结合的氧气' : exp === 'open' ? 'g · 跑掉的二氧化碳' : 'g · 没有物质进出'} />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'weigh'} pulse={next === 'weigh'} onClick={() => { rig.put(true); rig.weigh() }} disabled={rig.on || weighed}>称量</LabButton>
        <LabButton primary={next === 'react'} pulse={next === 'react'} onClick={() => { rig.put(false); run.run() }} disabled={!weighed || busy || reacted}>{ACT[exp]}</LabButton>
        <LabButton primary={next === 'back'} pulse={next === 'back'} onClick={() => rig.put(true)} disabled={!reacted || rig.on}>放回天平</LabButton>
      </>}
      extras={
        <Control label="实验">
          <Segmented label="实验" pulse={next === 'pick'} want={(task?.id as L3Key) ?? null} value={exp} disabled={busy} onChange={k => pick(k as L3Key)} options={KEYS.map(k => ({ value: k, label: L3[k].name }))} />
        </Control>
      }
    />
  )
}
