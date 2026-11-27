// 动量和碰撞 · 第 6 课 反冲：冰面上的喷水滑车。瓶里的水向后喷出去，滑车向前走；穿过光电门时测出速度。
// 原来整个系统静止，总动量是 0：水向后的动量和滑车向前的动量大小相等。水装得多、车轻，滑车就快。
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'
import { BucketAndPump, Cone, Foam, Mark, Vec, useRun, type VecHandle } from './gear'
import { COL, RINK, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { JET, JETS, jetPlan, momentum, pathAt, type JetKey } from './physics'
import { IceGate, JetSled, SLED } from './props'
import { useSpace, useTrial } from './trial'
import { Ledger, num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: JetKey[] = ['half', 'full', 'loaded']
const TASKS: Task[] = [
  { id: 'half', text: '装 0.25 kg 水，打开阀门', note: `水向后喷，滑车向前走：${num(jetPlan('half').v, 1)} m/s。两个动量大小相等、方向相反` },
  { id: 'full', text: '把水加到 0.5 kg，再喷一次', note: `喷出去的质量加倍，滑车的速度也加倍：${num(jetPlan('full').v, 1)} m/s` },
  { id: 'loaded', text: '水还是 0.5 kg，给滑车加 2 kg 配重', note: `滑车重了一倍，速度降到 ${num(jetPlan('loaded').v, 1)} m/s：动量一样，质量大的速度小` },
]
const O = RINK.jet
/** 箭头的比例：速度每 1 m/s、动量每 1 kg·m/s 各画多长（m） */
const KV = 0.2, KP = 0.17

function Rig({ mode, run, onMark, tag }: { mode: JetKey; run: number; onMark: (i: number, last: number) => void; tag: V3 }) {
  const p = useMemo(() => jetPlan(mode), [mode]), j = JETS[mode]
  const sled = useRef<THREE.Group>(null), wet = useRef<THREE.Mesh>(null)
  const vv = useRef<VecHandle>(null), ps = useRef<VecHandle>(null), pw = useRef<VecHandle>(null)
  const level = useRef(1), jet = useRef(0)
  useRun(run, (t, dt) => {
    const q = pathAt(p.segs, t), k = run === 0 ? 0 : Math.min(1, t / JET.T), x = O.x + q.x
    sled.current?.position.set(x, 0, O.z)
    level.current = (j.water / 0.5) * 0.62 * (1 - k)
    jet.current += ((run !== 0 && t < JET.T ? 1 : 0) - jet.current) * (1 - Math.exp(-dt / 0.05))
    // 喷到冰面上的一道水迹，从起点一直拖到喷完的地方
    if (wet.current) { const len = 0.8 * k + (pathAt(p.segs, Math.min(t, JET.T)).x); wet.current.visible = k > 0.02; wet.current.scale.x = Math.max(0.01, len); wet.current.position.x = O.x + SLED.nozzle - 0.8 * k + len / 2 }
    vv.current?.set([x, 0.4, O.z], [q.v * KV, 0, 0]); ps.current?.set([x, 0.5, O.z], [momentum(p.M, q.v) * KP, 0, 0])
    pw.current?.set([O.x + SLED.nozzle - 0.1, 0.5, O.z], [p.pWater * k * KP, 0, 0])
    tag[0] = x
  }, [p.tGate, p.tRec], i => onMark(i, 1))
  return <>
    <group ref={sled}><JetSled level={level} jet={jet} load={j.load} /></group>
    <mesh ref={wet} rotation-x={-Math.PI / 2} position={[O.x, 0.005, O.z]} visible={false}><planeGeometry args={[1, 0.24]} /><meshPhysicalMaterial color="#8fb6d2" transparent opacity={0.5} roughness={0.05} clearcoat={1} polygonOffset polygonOffsetFactor={-3} /></mesh>
    <Vec ref={vv} color={COL.v} thick={0.01} /><Vec ref={ps} color={COL.p} thick={0.013} /><Vec ref={pw} color={COL.p} thick={0.013} />
  </>
}

export default function Lesson6() {
  const L = useTrial<JetKey>('gewu:momentum:6', TASKS, 'half')
  const { mode, stage, rows, task, next, busy } = L, j = JETS[mode], p = useMemo(() => jetPlan(mode), [mode]), gated = stage >= 1
  const tag = useRef<V3>([O.x, 0.72, O.z]).current
  useSpace(L.go)
  const hint = !task ? '反冲：原来静止的系统向后喷出一部分，剩下的部分就向前运动，两部分的动量大小相等。'
    : busy ? (gated ? '过了光电门：读遮光时间，算滑车的速度…' : '水向后喷，看滑车往哪边走…')
    : next === 'mode' ? `把条件换成“${JETS[task.id as JetKey].name}”`
    : next === 'home' ? '按“放回原处”，把滑车拉回来，重新装水打气'
    : '按“打开阀门”：让瓶里的水向后喷出去'
  const labels: Label[] = [
    { id: 'v', at: tag, ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: gated ? 1 : 0 }, children: <><small>滑车的速度 v</small>{num(p.v, 1)} m/s</> },
    { id: 'pw', at: [O.x + SLED.nozzle - 0.2, 0.62, O.z], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: L.run ? 1 : 0 }, children: <><small>水的动量</small>{num(p.pWater, 1)} kg·m/s</> },
    { id: 'sled', at: [O.x + 0.1, 0.36, O.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `喷水滑车 · ${p.M} kg（不算水）` },
    { id: 'gate', at: [O.x + JET.gate + 0.3, 0.75, O.z], name: true, className: 'scene-name -translate-y-1/2', children: '光电门' },
  ]
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={L.T.banner} onReset={L.resetAll} hint={hint} actionsLabel="滑车"
      stage={<Place at="l6" labels={labels}>
        <Rig key={mode} mode={mode} run={L.run} onMark={L.mark} tag={tag} />
        <group position={[O.x + JET.gate, 0, O.z]}><IceGate text={gated ? p.ms.toFixed(1) : '0.0'} /></group>
        <group position={[O.x + JET.pad + 0.42, 0, O.z]} rotation-y={Math.PI / 2}><Foam len={1.1} /></group>
        <group position={[O.x + 0.27, 0, O.z]} rotation-y={Math.PI / 2}><Mark len={0.9} /></group>
        {/* 场边：装水的桶和打气筒、一只标志桶 */}
        <group position={[O.x - 0.75, 0, O.z - 0.8]}><BucketAndPump /></group>
        <group position={[O.x + 1.35, 0, O.z + 0.7]}><Cone /></group>
      </Place>}
      lesson={<LessonBlock no="6" title="反冲" concept="向后喷出物质，自己向前运动" tasks={TASKS} done={L.T.done} current={task?.id}
        theory={<>
          <p>一个静止的物体在内力的作用下分成两部分，一部分向某个方向运动，另一部分必然向相反的方向运动，这个现象叫<b className="text-white">反冲</b>。</p>
          <p className="mt-3">滑车和水组成的系统原来静止，总动量是 0。水平方向没有外力，喷水以后总动量还是 0：0 = Mv − mu，所以 v = mu / M。m 是喷出的水的质量，u 是水相对冰面的速度，M 是剩下的滑车的质量。</p>
          <p className="mt-3">喷气式飞机、火箭、章鱼喷水都靠反冲前进；开枪时枪身后坐、水管喷水时往后甩，也是反冲。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里把喷水当成一次喷完，水相对冰面的速度取平均值 {JET.u} m/s；瓶里压缩空气的质量忽略不计。</p>
        </>} />}
      finale={L.T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次都喷完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">向后喷出物质，自己就向前运动：这是反冲</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">原来静止，总动量是 0，所以水的动量和滑车的动量大小相等、方向相反：Mv = mu。喷 0.25 kg 水，滑车 {num(jetPlan('half').v, 1)} m/s；喷 0.5 kg，{num(jetPlan('full').v, 1)} m/s；滑车加重一倍，又回到 {num(jetPlan('loaded').v, 1)} m/s。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => L.T.setFinale(false)}>再喷几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">0 = M v − m u</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{gated ? num(p.v, 1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m/s</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="m" value={String(j.water)} unit="kg · 喷出的水" />
            <ParamTile symbol="u" value={String(JET.u)} unit="m/s · 水的速度" />
            <ParamTile symbol="M" value={String(p.M)} unit="kg · 滑车" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={gated ? p.ms.toFixed(1) : '—'} unit={`ms · 遮光片宽 ${JET.flag * 100} cm`} />
            <ParamTile symbol="v" value={gated ? num(p.v, 1) : '—'} unit="m/s · 滑车" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">喷水前后的动量（向右为正）</h2>
          <Ledger d={1} md={2} ek={false} heads={['喷前', '喷后']} bodies={[{ name: '水', color: '#6fb4ee', m: j.water, v0: 0, v1: gated ? -JET.u : null }, { name: '滑车', color: COL.A, m: p.M, v0: 0, v1: gated ? p.v : null }]} />
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录：滑车的速度</h2>
            <table className="mt-1 w-full text-[13px]"><tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{JETS[k].name}</td><td className="text-right font-semibold tabular-nums text-[#7fe3d4]">{num(jetPlan(k).v, 1)} m/s</td></tr>)}</tbody></table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={L.go} disabled={busy || L.run !== 0}>打开阀门</LabButton>
        <LabButton pulse={next === 'home'} onClick={L.home} disabled={busy || L.run === 0}>放回原处</LabButton>
      </>}
      extras={<Control label="条件"><Segmented label="条件" pulse={next === 'mode'} want={next === 'mode' ? L.want : null} value={mode} disabled={busy} onChange={L.pick} options={KEYS.map(k => ({ value: k, label: JETS[k].name }))} /></Control>}
    />
  )
}
