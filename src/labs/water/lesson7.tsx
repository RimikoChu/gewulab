// 水的净化和组成 · 第 7 课 水的组成：化验台第 5 格，一台霍夫曼水电解器接着学生电源。管里是加了少量硫酸钠的水（增强导电性）。
// 接通电源，两个电极上冒出气泡，气体聚在两根刻度管的上部，液面一格一格往下降，中间储液球里的液面升高；负极的气体是正极的两倍。
// 再分别检验：正极的气体使带火星的木条复燃（氧气）；负极的气体能燃烧，产生淡蓝色火焰（氢气）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, useTasks, type Label } from '@/lab-kit'
import { Clamp, Glass, Glove, Hose, Liquid, Splint } from './gear'
import { Bubbles, Flame } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { CURRENT, FAST, H2_GOAL, fmtMl, gas, timeFor } from './physics'
import { scaleTex } from './mats'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l7, Y = TOP, Z = BZ + 0.1
/** 电解器的尺寸（m）：两根刻度管在 x = ∓SX，管顶（刻度 0）在 TUBE_TOP，每 mL 长 PER_ML；底下的连通管在 BOT */
const SX = 0.075, R_T = 0.014, TUBE_TOP = 0.43, PER_ML = 0.009, BOT = 0.085, ELEC = 0.12
const RUN_SEC = timeFor(CURRENT, H2_GOAL) / FAST
/** 正极接左管（氧气），负极接右管（氢气） */
const O2X = X0 - SX * M, H2X = X0 + SX * M
const TASKS: Task[] = [
  { id: 'run', text: '接通电源，收集气体', note: '两极都冒气泡；负极的气体体积约是正极的 2 倍' },
  { id: 'o2', text: '检验正极的气体', note: '带火星的木条复燃：正极产生的是氧气' },
  { id: 'h2', text: '检验负极的气体', note: '气体燃烧，产生淡蓝色火焰：负极产生的是氢气' },
]

/** 霍夫曼水电解器的玻璃部分和管里的水。o2、h2：两管里的气体（mL）；res：储液球里的液面升高了多少（0–1） */
function Hofmann({ o2, h2, res, open }: { o2: number; h2: number; res: number; open: [number, number] }) {
  const scale = scaleTex(30)
  const len = TUBE_TOP - BOT
  const water = '#8fc9dc'
  const col = (x: number, v: number, i: number) => {
    const g = v * PER_ML, top = TUBE_TOP - g
    return <group key={x} position={[x, 0, 0]}>
      {/* 刻度管：玻璃管、管里的水柱、上面的刻度；顶上一只玻璃活塞和尖嘴 */}
      <mesh position-y={(BOT + TUBE_TOP) / 2 * M} renderOrder={7}><cylinderGeometry args={[R_T * M, R_T * M, len * M, 28, 1, true]} /><Glass opacity={0.2} /></mesh>
      <mesh position-y={(BOT + top) / 2 * M} renderOrder={5}><cylinderGeometry args={[(R_T - 0.0013) * M, (R_T - 0.0013) * M, (top - BOT) * M, 24]} /><Liquid color={water} opacity={0.6} /></mesh>
      <mesh position-y={top * M} rotation-x={-Math.PI / 2} renderOrder={6}><circleGeometry args={[(R_T - 0.0013) * M, 24]} /><meshPhysicalMaterial color="#eef8fb" transparent opacity={0.6} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
      <mesh position={[0, (TUBE_TOP - 0.135) * M, R_T * M + 0.002]}><planeGeometry args={[0.018 * M, 0.27 * M + 0.016 * M]} /><meshBasicMaterial map={scale} transparent depthWrite={false} toneMapped={false} /></mesh>
      <mesh position-y={(TUBE_TOP + 0.012) * M} renderOrder={7}><sphereGeometry args={[R_T * M, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><Glass opacity={0.2} /></mesh>
      <mesh position-y={(TUBE_TOP + 0.03) * M} renderOrder={7}><cylinderGeometry args={[0.004 * M, 0.005 * M, 0.03 * M, 16]} /><Glass opacity={0.3} /></mesh>
      <group position-y={(TUBE_TOP + 0.035) * M} rotation-y={open[i] * Math.PI / 2}>
        <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.024 * M, 18]} /><meshPhysicalMaterial color="#f2f6f6" transparent opacity={0.55} roughness={0.25} clearcoat={1} /></mesh>
        <mesh position-x={0.017 * M}><boxGeometry args={[0.012 * M, 0.016 * M, 0.004 * M]} /><meshPhysicalMaterial color="#f2f6f6" transparent opacity={0.6} roughness={0.25} /></mesh>
      </group>
      <mesh position-y={(TUBE_TOP + 0.065) * M} renderOrder={7}><cylinderGeometry args={[0.0018 * M, 0.0035 * M, 0.03 * M, 12]} /><Glass opacity={0.35} /></mesh>
      {/* 底部：橡胶塞和穿过它的电极，管里一片铂片 */}
      <mesh position-y={(BOT - 0.03) * M}><cylinderGeometry args={[R_T * 1.05 * M, R_T * 0.9 * M, 0.03 * M, 20]} /><meshStandardMaterial color="#2b2b2d" roughness={0.75} /></mesh>
      <mesh position-y={(BOT + 0.01) * M}><cylinderGeometry args={[0.0008 * M, 0.0008 * M, 0.08 * M, 8]} /><Metal kind="stainless" /></mesh>
      <mesh position-y={ELEC * M}><boxGeometry args={[0.009 * M, 0.02 * M, 0.0006 * M]} /><Metal kind="chrome" rough={0.2} /></mesh>
    </group>
  }
  return <group>
    {col(-SX * M, o2, 0)}
    {col(SX * M, h2, 1)}
    {/* 底下横着的连通管 */}
    <mesh position-y={BOT * M} rotation-z={Math.PI / 2} renderOrder={7}><cylinderGeometry args={[R_T * M, R_T * M, SX * 2 * M + R_T * 2 * M, 24, 1, true]} /><Glass opacity={0.2} /></mesh>
    <mesh position-y={BOT * M} rotation-z={Math.PI / 2} renderOrder={5}><cylinderGeometry args={[(R_T - 0.0013) * M, (R_T - 0.0013) * M, SX * 2 * M + R_T * 2 * M, 20]} /><Liquid color={water} opacity={0.6} /></mesh>
    {/* 中间的长管和顶上的储液球 */}
    <mesh position-y={(BOT + 0.5) / 2 * M} renderOrder={7}><cylinderGeometry args={[0.009 * M, 0.009 * M, (0.5 - BOT) * M, 20, 1, true]} /><Glass opacity={0.2} /></mesh>
    <mesh position-y={(BOT + 0.5) / 2 * M} renderOrder={5}><cylinderGeometry args={[0.0075 * M, 0.0075 * M, (0.5 - BOT) * M, 16]} /><Liquid color={water} opacity={0.6} /></mesh>
    <mesh position-y={0.535 * M} renderOrder={7}><sphereGeometry args={[0.036 * M, 32, 20]} /><Glass opacity={0.2} /></mesh>
    <mesh position-y={(0.5 + 0.015 + 0.02 * res) / 2 * M + 0.0 * M} renderOrder={5}><cylinderGeometry args={[0.025 * M, 0.012 * M, (0.015 + 0.02 * res) * M, 28]} /><Liquid color={water} opacity={0.6} /></mesh>
    <mesh position-y={0.58 * M} renderOrder={7}><cylinderGeometry args={[0.012 * M, 0.014 * M, 0.025 * M, 24, 1, true]} /><Glass opacity={0.25} /></mesh>
  </group>
}

/** 学生电源：浅灰的机壳，前面板上一块读数屏、一只旋钮、红黑两个接线柱。原点在底面正中，面板朝 +z */
function PowerBox({ on }: { on: boolean }) {
  const W = 0.22 * M, H = 0.11 * M, D = 0.16 * M
  return <group>
    <RoundedBox args={[W, H, D]} radius={0.008 * M} smoothness={3} position-y={H / 2} castShadow receiveShadow><meshPhysicalMaterial color="#d9dcdc" roughness={0.45} clearcoat={0.3} /></RoundedBox>
    <mesh position={[0, H / 2, D / 2 + 0.002]}><planeGeometry args={[W * 0.92, H * 0.84]} /><meshStandardMaterial color="#2b3238" roughness={0.6} /></mesh>
    <Led text={on ? `${CURRENT.toFixed(2)}A` : '0.00A'} w={W * 0.42} h={0.032 * M} position={[-W * 0.2, H * 0.62, D / 2 + 0.004]} />
    <mesh position={[W * 0.25, H * 0.62, D / 2 + 0.01 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.014 * M, 0.016 * M, 0.014 * M, 28]} /><meshStandardMaterial color="#1c1e20" roughness={0.5} /></mesh>
    {[[-0.05, '#c0281e'], [0.0, '#1b1b1b']].map(([x, c]) => <group key={String(x)} position={[(x as number) * M, H * 0.25, D / 2 + 0.008 * M]}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.007 * M, 0.008 * M, 0.014 * M, 20]} /><meshStandardMaterial color={c as string} roughness={0.4} /></mesh>
    </group>)}
    <mesh position={[W * 0.3, H * 0.25, D / 2 + 0.004]}><circleGeometry args={[0.005 * M, 16]} /><meshBasicMaterial color={on ? '#5dff9c' : '#2f3a33'} toneMapped={false} /></mesh>
  </group>
}

export default function Lesson7() {
  const [ran, setRan] = useState(false)
  const [tested, setTested] = useState<{ o2?: boolean; h2?: boolean }>({})
  const T = useTasks('gewu:water:7', TASKS)
  const run = useRun(RUN_SEC, () => { setRan(true); T.check(id => id === 'run') })
  const tO = useRun(5, () => { setTested(s => ({ ...s, o2: true })); T.check(id => id === 'o2') })
  const tH = useRun(5, () => { setTested(s => ({ ...s, h2: true })); T.check(id => id === 'h2') })
  const busy = run.busy || tO.busy || tH.busy
  const resetAll = () => { run.snap(0); tO.snap(0); tH.snap(0); setRan(false); setTested({}); T.reset() }

  const realT = ran ? timeFor(CURRENT, H2_GOAL) : run.t * FAST
  const v = gas(CURRENT, realT)
  // 检验时打开活塞，气体放出来，水柱回升
  const let0 = (r: typeof tO, done?: boolean) => done ? 1 : r.busy ? seg(r.t, 1.8, 3.6) : 0
  const o2Now = v.o2 * (1 - let0(tO, tested.o2)), h2Now = v.h2 * (1 - let0(tH, tested.h2))
  const res = (o2Now + h2Now) / (H2_GOAL * 1.5)
  const on = run.busy
  // 木条：从台上拿起来，凑到尖嘴上方
  const nozzle = (x: number): V3 => [x, Y + (TUBE_TOP + 0.085) * M, Z]
  const home: V3 = [X0 - 0.3 * M, Y + 0.004 * M, Z + 0.06 * M]
  const splintAt = (r: typeof tO, x: number): V3 => { if (!r.busy) return home; const go = seg(r.t, 0, 1.4) - seg(r.t, 4.0, 5); return liftPath(home, [x + 0.004 * M, nozzle(x)[1] + 0.004 * M, Z], nozzle(x)[1] + 0.03 * M, Math.max(0, go)) }
  const active = tO.busy ? tO : tH.busy ? tH : null
  const sAt = active ? splintAt(active, active === tO ? O2X : H2X) : home
  const relit = tO.busy && tO.t > 2.1 && tO.t < 4.2, emberO = tO.busy && tO.t < 2.1 ? 1 : 0
  const h2Flame = tH.busy && tH.t > 1.9 && tH.t < 3.8
  const splintFlame = tH.busy && tH.t < 4.2
  const turnO = tO.busy ? ease(seg(tO.t, 1.4, 1.8)) * (1 - ease(seg(tO.t, 3.8, 4.2))) : 0
  const turnH = tH.busy ? ease(seg(tH.t, 1.4, 1.8)) * (1 - ease(seg(tH.t, 3.8, 4.2))) : 0
  const wirePts = useMemo(() => ({
    red: [[O2X, Y + (BOT - 0.045) * M, Z], [O2X, Y + 0.01 * M, Z + 0.02 * M], [X0 + 0.1 * M, Y + 0.008 * M, Z + 0.08 * M], [X0 + 0.25 * M, Y + 0.03 * M, Z + 0.09 * M]] as V3[],
    black: [[H2X, Y + (BOT - 0.045) * M, Z], [H2X, Y + 0.01 * M, Z + 0.03 * M], [X0 + 0.22 * M, Y + 0.008 * M, Z + 0.1 * M], [X0 + 0.3 * M, Y + 0.03 * M, Z + 0.09 * M]] as V3[],
  }), [])

  const task = T.current
  const { hint, next }: { hint: string; next: 'run' | 'o2' | 'h2' | null } = !task ? { hint: '正极产生氧气，负极产生氢气，体积比约 1∶2。水由氢、氧两种元素组成。', next: null }
    : run.busy ? { hint: '两个电极上冒出气泡，看两管里的气体…', next: null }
    : tO.busy ? { hint: '打开正极管的活塞，把带火星的木条放到尖嘴上方…', next: null }
    : tH.busy ? { hint: '打开负极管的活塞，用燃着的木条去点…', next: null }
    : !ran ? { hint: '管里是水（加了少量硫酸钠增强导电性）。接通电源', next: 'run' }
    : !tested.o2 ? { hint: '负极的气体约是正极的 2 倍。先检验正极的气体', next: 'o2' }
    : { hint: '再检验负极的气体', next: 'h2' }

  const tag = (x: number, side: string, name: string, vol: number, done?: boolean, what?: string) => ({ id: name, at: [x + (x < X0 ? -1 : 1) * (R_T + 0.012) * M, Y + (TUBE_TOP - Math.max(vol, 3) * PER_ML / 2) * M, Z] as V3, ax: x < X0 ? 1 : 0, className: `scene-tag ${name === 'h2' && ran ? 'key' : ''} -translate-y-1/2`, children: <><small>{side}{done ? ` · ${what}` : ''}</small>{fmtMl(vol)} mL</> })
  const labels: Label[] = [
    tag(O2X, '正极', 'o2', ran ? v.o2 : o2Now, tested.o2, '氧气'),
    tag(H2X, '负极', 'h2', ran ? v.h2 : h2Now, tested.h2, '氢气'),
    ...(relit ? [{ id: 'f1', at: [O2X - 0.03 * M, Y + (TUBE_TOP + 0.13) * M, Z] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '木条复燃' }] : []),
    ...(h2Flame ? [{ id: 'f2', at: [H2X + 0.03 * M, Y + (TUBE_TOP + 0.13) * M, Z] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: '淡蓝色火焰' }] : []),
    { id: 'n1', at: [X0 + 0.27 * M, Y + 0.13 * M, Z + 0.02 * M], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '学生电源' },
    { id: 'n2', at: [X0, Y + 0.6 * M, Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '霍夫曼水电解器' },
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="电解水"
      stage={<Place at="l7" labels={labels}>
        {/* 支架：铸铁底座、立杆、两只夹住中间长管的夹子 */}
        <RoundedBox args={[0.26 * M, 0.016 * M, 0.14 * M]} radius={0.006 * M} position={[X0, Y + 0.008 * M, Z - 0.02 * M]} castShadow receiveShadow><meshStandardMaterial color="#25292d" roughness={0.45} metalness={0.4} /></RoundedBox>
        <mesh position={[X0, Y + 0.33 * M, Z - 0.075 * M]} castShadow><cylinderGeometry args={[0.0055 * M, 0.0055 * M, 0.64 * M, 20]} /><Metal kind="chrome" rough={0.12} /></mesh>
        {[0.2, 0.42].map(h => <group key={h} position={[X0, Y + h * M, Z]}><Clamp len={0.075} open={0.0068} /></group>)}
        {/* 两只橡胶塞下的支脚 */}
        {[O2X, H2X].map(x => <mesh key={x} position={[x, Y + 0.03 * M, Z]}><cylinderGeometry args={[0.004 * M, 0.006 * M, 0.04 * M, 12]} /><Metal kind="steel" /></mesh>)}
        <group position={[X0, Y, Z]}><Hofmann o2={o2Now} h2={h2Now} res={res} open={[turnO, turnH]} /></group>
        {/* 电极上冒的气泡：负极的多一倍 */}
        <Bubbles at={[O2X, Y + ELEC * M, Z]} top={(TUBE_TOP - v.o2 * PER_ML - ELEC) * M} on={on} rate={22} r={0.0017 * M} spread={0.006 * M} speed={0.08 * M} seed={2} />
        <Bubbles at={[H2X, Y + ELEC * M, Z]} top={(TUBE_TOP - v.h2 * PER_ML - ELEC) * M} on={on} rate={44} r={0.0017 * M} spread={0.006 * M} speed={0.08 * M} seed={3} />
        <group position={[X0 + 0.24 * M, Y, Z - 0.04 * M]} rotation-y={-0.25}><PowerBox on={on || ran} /></group>
        <Hose pts={wirePts.red} r={0.0018 * M} color="#c0281e" />
        <Hose pts={wirePts.black} r={0.0018 * M} color="#1b1b1b" />
        {/* 木条 */}
        <group position={sAt} rotation-z={active ? -0.35 : Math.PI / 2 - 0.08}>
          <Splint ember={emberO || (tO.busy && !relit && tO.t > 4.2) ? 1 : 0} />
          {active && <group position={[0, 0.12 * M, 0]} rotation={[0.3, 0, 0.2]}><Glove s={0.0058 * M} /></group>}
        </group>
        <Flame at={[sAt[0], sAt[1], sAt[2]]} w={0.012 * M} h={0.03 * M} kind="candle" level={relit ? 1 : splintFlame ? 0.6 : 0} seed={1} light={relit ? 1.4 : 0.6} />
        <Flame at={[H2X, Y + (TUBE_TOP + 0.082) * M, Z]} w={0.01 * M} h={0.035 * M} kind="h2" level={h2Flame ? 1 : 0} seed={7} light={0.8} lightColor="#9ec2ff" />
      </Place>}
      lesson={<LessonBlock no="7" title="水的组成" concept="水由氢、氧两种元素组成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>通电后，水分解生成氢气和氧气：</p>
          <p className="mt-2 text-center font-formula text-[17px]">2H<sub>2</sub>O <span className="text-[13px]">通电</span>→ 2H<sub>2</sub>↑ + O<sub>2</sub>↑</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>正极产生<b className="text-white">氧气</b>，能使带火星的木条复燃</li>
            <li>负极产生<b className="text-white">氢气</b>，能燃烧，产生淡蓝色火焰</li>
            <li>氢气和氧气的体积比约为 2∶1（“正氧负氢，氢二氧一”）</li>
          </ul>
          <p className="mt-3">氢气由氢元素组成，氧气由氧元素组成，化学反应前后元素的种类不变，所以水是由氢元素和氧元素组成的。水由两种元素组成，是化合物。</p>
          <p className="mt-3 text-[13.5px] text-white/65">实际测得氢气和氧气的体积比常略大于 2∶1，一个原因是氧气在水中的溶解能力比氢气稍大。点燃氢气前要先检验纯度。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种气体都检验过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">水由氢、氧两种元素组成</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">正极得到 {fmtMl(gas(CURRENT, timeFor(CURRENT, H2_GOAL)).o2)} mL 氧气，负极得到 {fmtMl(H2_GOAL)} mL 氢气，体积比约 1∶2。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">氧气 ∶ 氢气（体积）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{v.h2 > 0.5 ? '1 : 2' : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="I" value={CURRENT.toFixed(1)} unit="A · 电流" />
            <ParamTile symbol="t" value={`${Math.floor(realT / 60)}:${String(Math.floor(realT % 60)).padStart(2, '0')}`} unit={`通电时间 · 过程加快 ${FAST} 倍`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两极的气体</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">电极</th><th className="pb-1 font-medium">体积</th><th className="pb-1 font-medium">检验</th><th className="pb-1 font-medium">气体</th></tr></thead>
            <tbody>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">正极</td><td className="tabular-nums">{fmtMl(v.o2)} mL</td><td className="text-[12.5px]">{tested.o2 ? '木条复燃' : '—'}</td><td className={`rounded-r-lg font-semibold ${tested.o2 ? 'text-[#7fe3d4]' : ''}`}>{tested.o2 ? '氧气' : '—'}</td></tr>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">负极</td><td className="tabular-nums">{fmtMl(v.h2)} mL</td><td className="text-[12.5px]">{tested.h2 ? '淡蓝色火焰' : '—'}</td><td className={`rounded-r-lg font-semibold ${tested.h2 ? 'text-[#7fe3d4]' : ''}`}>{tested.h2 ? '氢气' : '—'}</td></tr>
            </tbody>
          </table>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'run'} pulse={next === 'run'} onClick={() => run.run()} disabled={busy || ran}>接通电源</LabButton>
        <LabButton primary={next === 'o2'} pulse={next === 'o2'} onClick={() => tO.run()} disabled={busy || !ran || !!tested.o2}>检验正极气体</LabButton>
        <LabButton primary={next === 'h2'} pulse={next === 'h2'} onClick={() => tH.run()} disabled={busy || !tested.o2 || !!tested.h2}>检验负极气体</LabButton>
      </>}
      extras={null}
    />
  )
}
