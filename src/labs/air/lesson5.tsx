// 空气和氧气 · 第 5 课 实验室里制氧气：制氧车间的长台上，左边是铁架台夹着的大试管（高锰酸钾，管口略向下、塞一团棉花）和酒精灯，
// 中间一只玻璃水槽，里面倒扣着盛满水的集气瓶，右边是锥形瓶和长颈漏斗（过氧化氢加二氧化锰）。两种办法各用排水法收一瓶氧气。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Clamp, FLASK, Flask, GasJar, GlassPlate, GlassTube, Glove, IronStand, JAR, JarBottle, LAMP_TOP, LiquidBody, LongFunnel, NarrowBottle, Stopper } from './gear'
import { BIG, BigTube, Powder, TROUGH_R, Trough } from './kit'
import { Bubbles, Flame } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, liftPath, seg, useClock, useRun } from './parts'
import { COLLECT_SEC, DRUGS, JAR_L, RHO, bottleMass, collect, gathered, type Drug } from './physics'
import { BZ, M, Place, ST, TOP, type V3 } from './world'

const u = (v: number) => v * M
const X0 = ST.l5, Z0 = BZ - 0.3
const at = (x: number, y: number, z = 0): V3 => [X0 + u(x), TOP + u(y), Z0 + u(z)]
/** 试管：管底的位置、朝管口的方向（略向下）；水槽的中心；两根导管在水里的出口；集气瓶平时扣在水槽后半边 */
const TB: V3 = [-0.37, 0.262, 0.04], AX: [number, number] = [0.993, -0.118], TILT = -(Math.PI / 2 + 0.118)
const along = (d: number): V3 => [TB[0] + AX[0] * d, TB[1] + AX[1] * d, TB[2]]
const TRO: V3 = [0.06, 0, 0.04], FLOOR = 0.006, WATER = 0.085
const TIP: Record<Drug, V3> = { k: [-0.005, 0.052, 0.07], h: [0.13, 0.052, 0.07] }
const IDLE: V3 = [0.065, 0.014, -0.06], OUT: Record<Drug, V3> = { k: [-0.2, 0, 0.26], h: [0.3, 0, 0.26] }
const FL: V3 = [0.34, 0, 0.02], PLUG = FLASK.top - 0.016, FUN = 0.21
const TASKS: Task[] = [
  { id: 'heat', text: '装好高锰酸钾，试管口略向下，点燃酒精灯', note: '试管口略向下倾斜，防止冷凝水流回去炸裂试管' },
  { id: 'jar', text: '用排水法收满一瓶 250 mL 的氧气', note: '收了 250 mL 氧气，从瓶里排出 250 mL 水' },
  { id: 'h', text: '换成过氧化氢加二氧化锰，不加热也收一瓶', note: '过氧化氢在二氧化锰的作用下，常温就能放出氧气' },
]
type St = 'idle' | 'gen' | 'collect' | 'full' | 'done'

export default function Lesson5() {
  const [drug, setDrug] = useState<Drug>('k')
  const [st, setSt] = useState<St>('idle')
  const [made, setMade] = useState<Drug[]>([])           // 已经收好、正放在桌上的瓶
  const T = useTasks('gewu:air:5', TASKS)
  const gen = useClock(), col = useClock()
  const pour = useRun(4, () => { setSt('gen'); gen.start() })
  const move = useRun(1.4, () => { setSt('collect'); col.start() })
  const finish = useRun(7.2, () => { setSt('done'); gen.stop(); const m = made.includes(drug) ? made : [...made, drug]; setMade(m); T.check(id => (id === 'jar' ? m.length > 0 : id === 'h' && m.includes('h'))) })
  const busy = pour.busy || move.busy || finish.busy
  const V = st === 'collect' ? gathered(col.t) : st === 'full' || finish.busy ? JAR_L : st === 'done' ? JAR_L : 0
  useEffect(() => { if (st === 'collect' && V >= JAR_L) { setSt('full'); col.stop() } }, [st, V])   // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { if (busy || st !== 'idle') return; if (drug === 'k') { setSt('gen'); gen.start(); T.check(id => id === 'heat') } else pour.run() }
  const fresh = () => { pour.snap(0); move.snap(0); finish.snap(0); gen.stop(); col.stop(); setSt('idle') }
  const pick = (d: Drug) => { if (busy || d === drug || st === 'gen' || st === 'collect' || st === 'full') return; fresh(); setDrug(d) }
  const resetAll = () => { fresh(); setDrug('k'); setMade([]); T.reset() }

  const steady = st === 'gen' && gen.t > (drug === 'k' ? 4 : 1.5)
  const ft = finish.busy ? finish.t : 0
  const task = T.current
  const { hint, next }: { hint: string; next: 'start' | 'col' | 'full' | 'drug' | null } = !task ? { hint: '加热高锰酸钾、分解过氧化氢都能制得氧气；氧气不易溶于水，可以用排水法收集。', next: null }
    : pour.busy ? { hint: '过氧化氢溶液流到二氧化锰上，立刻冒出大量气泡…', next: null }
    : move.busy ? { hint: '把盛满水的集气瓶移到导管口上方…', next: null }
    : finish.busy ? { hint: ft < 4.4 || drug === 'h' ? '在水面下盖好玻璃片，取出集气瓶，正放在桌上…' : '先把导管移出水面，再熄灭酒精灯…', next: null }
    : st === 'done' || (st === 'idle' && made.includes(drug)) ? (drug === 'h' ? { hint: '药品换回高锰酸钾，加热再收一瓶', next: 'drug' } : { hint: '药品换成过氧化氢和二氧化锰，不用加热再收一瓶', next: 'drug' })
    : task.id === 'h' && drug === 'k' && st === 'idle' ? { hint: '药品换成过氧化氢和二氧化锰，不用加热再收一瓶', next: 'drug' }
    : st === 'idle' ? { hint: drug === 'k' ? '点燃酒精灯，给试管里的高锰酸钾加热' : '从长颈漏斗加入过氧化氢溶液', next: 'start' }
    : st === 'gen' ? (steady ? { hint: '气泡连续、均匀地冒出来了，开始收集', next: 'col' } : { hint: '导管口刚冒出的气泡是装置里的空气，先不收…', next: null })
    : st === 'collect' ? { hint: '氧气进到瓶里，把水一点点排出去…', next: null }
    : { hint: '瓶口有大气泡往外冒，收满了。在水面下盖好玻璃片，取出来', next: 'full' }

  // 集气瓶（位置按瓶子的中心算）：倒扣在水槽后半边 → 移到导管口上方 → 收满后盖玻璃片、提出水面、翻过来正放在桌上
  const tip = TIP[drug], HALF = JAR.h / 2, idle: V3 = [IDLE[0], IDLE[1] + HALF, IDLE[2]], over: V3 = [tip[0], 0.02 + HALF, tip[2]], out: V3 = [OUT[drug][0], HALF, OUT[drug][2]]
  const jp: V3 = move.busy ? [lerp(idle[0], over[0], ease(move.k)), lerp(idle[1], over[1], ease(move.k)) + 0.03 * Math.sin(move.k * Math.PI), lerp(idle[2], over[2], ease(move.k))]
    : finish.busy ? liftPath(over, out, 0.36, seg(ft, 1.6, 4.2))
    : st === 'idle' ? idle : st === 'done' ? out : over
  const flip = finish.busy ? Math.PI * (1 - ease(seg(ft, 2.3, 3.4))) : st === 'done' ? 0 : Math.PI
  const plate = finish.busy ? ease(seg(ft, 0.6, 1.5)) : st === 'done' ? 1 : 0
  const gasH = (V / JAR_L) * (JAR.h - 0.03)                    // 瓶里气体占的高度（m）
  // 撤导管（只有加热高锰酸钾时要）：导管的后半截抬出水面；然后盖灭酒精灯
  const pull = drug === 'k' ? (finish.busy ? ease(seg(ft, 4.5, 5.5)) : st === 'done' ? 1 : 0) : 0
  const lampOn = drug === 'k' && (st === 'gen' || st === 'collect' || st === 'full' || (finish.busy && ft < 6))
  const flame = lampOn ? (finish.busy ? 1 - ease(seg(ft, 5.7, 6)) : Math.min(1, gen.t * 2)) : 0
  const level = drug === 'h' ? (pour.busy ? 0.03 * seg(pour.t, 1.6, 3.4) : st === 'idle' ? 0 : 0.03) : 0
  const bub = st === 'gen' ? (steady ? 1 : drug === 'k' ? 0.25 * seg(gen.t, 1, 2) : 0.6) : st === 'collect' || st === 'full' ? 1 : 0
  const kTube = useMemo(() => {
    const m = along(BIG.h + 0.012), up = (y: number) => y + pull * 0.13
    return ([m, [m[0] + 0.06, m[1] - 0.006, m[2]], [m[0] + 0.1, m[1] - 0.025, m[2] + 0.005], [m[0] + 0.07, up(0.18), 0.05], [-0.095 - pull * 0.02, up(0.12), 0.065], [-0.07 - pull * 0.02, up(0.045), 0.07], [-0.04 - pull * 0.02, up(0.03), 0.07], [TIP.k[0] - 0.006 - pull * 0.02, up(0.036), 0.07], [TIP.k[0] - pull * 0.02, up(TIP.k[1]), 0.07]] as V3[]).map(p => at(p[0], p[1], p[2]))
  }, [Math.round(pull * 40)])   // eslint-disable-line react-hooks/exhaustive-deps
  const hTube = useMemo(() => ([[FL[0] + 0.006, PLUG + 0.006, FL[2]], [FL[0] + 0.006, 0.2, FL[2]], [FL[0] - 0.01, 0.215, FL[2] + 0.005], [0.245, 0.2, 0.05], [0.22, 0.13, 0.065], [0.2, 0.045, 0.07], [0.175, 0.03, 0.07], [TIP.h[0] + 0.006, 0.036, 0.07], [TIP.h[0], TIP.h[1], 0.07]] as V3[]).map(p => at(p[0], p[1], p[2])), [])

  const jarAt = at(jp[0], jp[1], jp[2])
  const labels: Label[] = [
    { id: 'v', at: at(tip[0] + JAR.r + 0.02, 0.19, tip[2]), ax: 0, className: `scene-tag ${V >= JAR_L ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: st === 'collect' || st === 'full' ? 1 : 0 }, children: <><small>收集到氧气</small>{collect(V).toFixed(0)} mL</> },
    ...(drug === 'k' && st !== 'idle' && st !== 'done' ? [{ id: 'tilt', at: at(along(0.1)[0], TB[1] + 0.055, TB[2]), ax: 0.5, className: 'scene-name -translate-y-full', children: '试管口略向下倾斜' } as Label] : []),
    ...(finish.busy && drug === 'k' && ft > 4.4 ? [{ id: 'ord', at: at(-0.02, 0.24, 0.07), ax: 0.5, className: 'scene-tag key -translate-y-full', children: ft < 5.7 ? '先撤导管' : '再熄灭酒精灯' } as Label] : []),
    { id: 'n1', at: at(along(0.05)[0], TB[1] + 0.05, TB[2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '大试管 · 高锰酸钾' },
    { id: 'n2', at: at(TRO[0], -0.012, TRO[2] + TROUGH_R + 0.02), ax: 0.5, name: true, className: 'scene-name', children: '水槽' },
    { id: 'n3', at: at(FL[0], FUN + 0.075, FL[2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '过氧化氢 + 二氧化锰' },
    { id: 'n4', at: at(IDLE[0], 0.19, IDLE[2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '集气瓶（盛满水，倒扣）' },
  ]
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="制取和收集"
      stage={<Place at="l5" labels={labels}>
        {/* 铁架台、夹子、大试管、塞子 */}
        <group position={at(along(0.14)[0], 0, 0)}>
          <IronStand rodH={0.46} />
          <group position={[0, u(along(0.14)[1]), u(TB[2])]} rotation-z={Math.PI / 2}><Clamp len={0.08} open={0.0135} /></group>
        </group>
        <group position={at(TB[0], TB[1], TB[2])} rotation-z={TILT}>
          <BigTube spent={made.includes('k') ? 0.7 : st !== 'idle' && drug === 'k' ? Math.min(0.7, gen.t / 20) : 0} />
          <group position-y={u(BIG.h - 0.012)}><Stopper r0={0.0105} r1={0.0135} h={0.02} holes={[0]} /></group>
        </group>
        <GlassTube pts={kTube} r={0.0032} />
        {/* 酒精灯垫在木块上 */}
        <group position={at(TB[0] + 0.05, 0, TB[2])}>
          <RoundedBox args={[u(0.11), u(0.055), u(0.11)]} radius={u(0.004)} position-y={u(0.0275)} castShadow receiveShadow><meshStandardMaterial color="#b98a55" roughness={0.8} /></RoundedBox>
          <group position-y={u(0.055)}><AlcoholLamp /></group>
        </group>
        <Flame at={at(TB[0] + 0.05, 0.055 + LAMP_TOP, TB[2])} w={u(0.036)} h={u(0.105)} kind="alcohol" level={flame} seed={1} light={0.9} />
        {/* 水槽和里面的水 */}
        <group position={at(TRO[0], 0, TRO[2])}><Trough><group position-y={u(FLOOR)}><LiquidBody r={u(TROUGH_R - 0.001)} h={u(WATER - FLOOR)} color="#a9d3e2" opacity={0.42} /></group></Trough></group>
        {/* 导管口的气泡 */}
        <Bubbles at={at(tip[0], tip[1], tip[2])} top={u(st === 'collect' || st === 'full' ? Math.max(0.01, 0.016 + JAR.h - gasH - tip[1]) : WATER - tip[1])} on={bub > 0 && pull < 0.1} rate={bub * 26} r={u(0.0032)} spread={u(0.004)} speed={u(0.16)} seed={drug === 'k' ? 3 : 5} />
        {/* 正在用的集气瓶：瓶里的水随着氧气进来往下退 */}
        <group position={jarAt}>
          <group rotation-z={flip} position-y={0}>
            <group position-y={-u(HALF)}>
              <GasJar />
              <group position-y={u(0.004 + gasH)}><LiquidBody r={u(JAR.r - 0.003)} h={u(JAR.h - 0.03 - gasH)} color="#a9d3e2" opacity={0.5} top={false} /></group>
              {plate > 0.01 && <group position={[u(0.06) * (1 - plate), u(JAR.h), 0]}><GlassPlate s={0.078} /></group>}
            </group>
          </group>
          {(move.busy || (finish.busy && ft > 0.4 && ft < 4.4)) && <group position={[u(0.015), u(0.01), -u(0.03)]} rotation={[0.25, 0.3, -1.3]}><Glove /></group>}
        </group>
        {/* 已经收好的瓶：正放，盖着玻璃片 */}
        {made.filter(d => !(d === drug && (st === 'done' || finish.busy))).map(d => <group key={d} position={at(OUT[d][0], 0, OUT[d][2])}><GasJar /><group position-y={u(JAR.h)}><GlassPlate s={0.078} /></group></group>)}
        {/* 右边：锥形瓶、双孔塞、长颈漏斗、导管 */}
        <group position={at(FL[0], 0, FL[2])}>
          <Flask level={level} color="#dfe9ea" opacity={0.4}><group position-y={u(0.004)}><Powder r={0.03} k={0.5} /></group></Flask>
          <group position-y={u(PLUG)}><Stopper holes={[-0.005, 0.006]} /></group>
          <group position={[-u(0.005), u(0.008), 0]}><LongFunnel len={FUN} /></group>
        </group>
        <GlassTube pts={hTube} r={0.0032} />
        <Bubbles at={at(FL[0], 0.008, FL[2])} top={u(Math.max(0.004, level - 0.006))} on={drug === 'h' && level > 0.01 && st !== 'done'} rate={60} r={u(0.0018)} spread={u(0.026)} speed={u(0.06)} seed={4} />
        {/* 药品瓶；加过氧化氢时手拿着瓶子往漏斗里倒 */}
        <group position={at(-0.14, 0, -0.25)}><JarBottle label="高锰酸钾" band="#6a2d7a" amount={0.5} solid={<Powder r={0.026} color="#3a1740" />} /></group>
        {pour.busy
          ? <group position={at(...liftPath([0.2, 0.124, -0.25], [FL[0] - 0.02, FUN + 0.075, FL[2]], FUN + 0.11, seg(pour.t, 0, 1.2) - seg(pour.t, 3.2, 4)))}>
            <group rotation-z={1.9 * (ease(seg(pour.t, 1.1, 1.6)) - ease(seg(pour.t, 3.0, 3.4)))}><group position-y={-u(0.124)}><NarrowBottle label="过氧化氢" band="#2f6fb3" brown /></group></group>
            <group position={[u(0.07), -u(0.04), -u(0.03)]} rotation={[0.5, 0, -0.75]}><Glove /></group>
          </group>
          : <group position={at(0.2, 0, -0.25)}><NarrowBottle label="过氧化氢" band="#2f6fb3" brown /></group>}
      </Place>}
      lesson={<LessonBlock no="5" title="实验室里制氧气" concept="把氧气从药品里赶出来，再用排水法接住" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>实验室里常用加热高锰酸钾或分解过氧化氢的方法制取氧气：</p>
          <p className="mt-2 text-center text-[14px]">高锰酸钾 <span className="text-white/60">—加热→</span> 锰酸钾 + 二氧化锰 + 氧气</p>
          <p className="mt-1 text-center text-[14px]">过氧化氢 <span className="text-white/60">—二氧化锰→</span> 水 + 氧气</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>加热高锰酸钾：试管口略向下倾斜；试管口放一团棉花，防止加热时粉末进入导管</li>
            <li>导管口的气泡<b className="text-white">连续、均匀</b>冒出时再开始收集，刚冒出的是装置里的空气</li>
            <li>集气瓶口有大气泡往外冒，说明已经收满；在水面下盖好玻璃片，取出后<b className="text-white">正放</b>在桌上</li>
            <li>收集完毕，<b className="text-white">先把导管移出水面，再熄灭酒精灯</b>，防止水槽里的水倒流进热的试管</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种办法各收了一瓶</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">加热高锰酸钾、分解过氧化氢都能制氧气，用排水法收集</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">气泡连续均匀时才开始收；收满后在水下盖好玻璃片，正放在桌上。加热的装置，结束时先撤导管、再熄灭酒精灯。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">集气瓶里收到的氧气</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{st === 'idle' || st === 'gen' ? '—' : collect(V).toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
            <div className="mt-1.5 text-[13px] text-white/60">药品：{DRUGS[drug].name}{drug === 'h' ? '、二氧化锰' : ''} · {DRUGS[drug].heat ? '要加热' : '不用加热'}</div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[12.5px] text-white/55"><span>导管口的气泡</span><span>{bub === 0 ? '没有' : bub < 1 ? '断断续续' : '连续、均匀'}</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7fe3d4] transition-[width] duration-300" style={{ width: `${Math.round(bub * 100)}%` }} /></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="V(氧气)" value={collect(V).toFixed(0)} unit="mL · 收集到的氧气" />
            <ParamTile symbol="V(水)" value={collect(V).toFixed(0)} unit="mL · 从瓶里排出的水" />
            <ParamTile symbol="V(瓶)" value={String(JAR_L * 1000)} unit="mL · 集气瓶容积" />
            <ParamTile symbol="m(氧气)" value={V >= JAR_L ? bottleMass(RHO.o2, JAR_L).toFixed(3) : '—'} unit="g · 一瓶氧气的质量" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'start'} pulse={next === 'start'} onClick={start} disabled={busy || st !== 'idle' || made.includes(drug)}>{drug === 'k' ? '点燃酒精灯' : '加入过氧化氢'}</LabButton>
        <LabButton primary={next === 'col'} pulse={next === 'col'} onClick={() => move.run()} disabled={busy || !steady}>开始收集</LabButton>
        <LabButton primary={next === 'full'} pulse={next === 'full'} onClick={() => finish.run()} disabled={busy || st !== 'full'}>验满</LabButton>
      </>}
      extras={
        <Control label="药品">
          <Segmented label="药品" pulse={next === 'drug'} want={drug === 'k' && (task?.id === 'h' || made.includes('k')) ? 'h' : 'k'} value={drug} disabled={busy || st === 'gen' || st === 'collect' || st === 'full'} onChange={d => pick(d as Drug)} options={[{ value: 'k' as Drug, label: '高锰酸钾' }, { value: 'h' as Drug, label: '过氧化氢 + 二氧化锰' }]} />
        </Control>
      }
    />
  )
}
