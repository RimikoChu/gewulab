// 燃烧和灭火 · 第 7 课 易燃物和易爆物的安全：实验台第 4 格，一只剖开的铁皮罐，罐底中间的小漏斗里一撮面粉，罐里点着一支短蜡烛；一根胶管从罐底接到皮老虎。
// 面粉堆着时盖上罐盖，只是蜡烛在烧；用皮老虎一鼓气，面粉散开，“砰”的一声罐盖被掀开。最后给面粉厂的车间选一个安全标志（后墙上的四块牌子）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Bulb, CAN, Candle, DustCan, FlourHeap, Glove, Hose, SafetySign } from './gear'
import { Flame, Puffs, SMOKE } from './fx'
import { lerp, liftPath, seg, useRun } from './parts'
import { GRAIN, SIGNS, dustArea, type Sign } from './physics'
import { BZ, HALL, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l7, Y = TOP, Z = BZ + 0.15
const R = CAN.r * M, H = CAN.h * M
const BULB: V3 = [X0 + 0.3 * M, Y + 0.03 * M, Z + 0.06 * M]
const SIGN_ORDER: Sign[] = ['fire', 'smoke', 'boom', 'cracker']
const signAt = (k: Sign): V3 => [X0 - 0.75 * M + SIGN_ORDER.indexOf(k) * 0.5 * M, Y + 1.15 * M, HALL.z0 + 0.08]
const TASKS: Task[] = [
  { id: 'pile', text: '点燃蜡烛，盖上罐盖', note: '面粉堆在漏斗里：只有蜡烛在安静地燃烧' },
  { id: 'blow', text: '用皮老虎鼓气，让面粉散开', note: '面粉散开，和空气接触的面积大了，一下子烧起来，发生爆炸' },
  { id: 'sign', text: '面粉厂的车间门口，该贴哪一个标志？', note: '面粉厂要严禁一切明火：禁止烟火' },
]
const WHY: Record<Sign, string> = {
  fire: '对。面粉厂里飘着面粉的粉尘，遇到明火就可能爆炸，所以要严禁烟火。',
  smoke: '吸烟只是明火的一种。面粉厂里任何明火都不能有，选一个管得更全的标志。',
  boom: '“当心爆炸”是贴在爆炸物旁边提醒人的。面粉厂要做的是不让明火进车间。',
  cracker: '燃放鞭炮当然不行，但车间里还有别的明火。选一个管得更全的标志。',
}
const LIGHT = 3.0, BLOW = 4.2, BOOM = 1.0

export default function Lesson7() {
  const [lidOn, setLidOn] = useState(false)
  const [blown, setBlown] = useState(false)
  const [sign, setSign] = useState<Sign | null>(null)
  const T = useTasks('gewu:fire:7', TASKS)
  const light = useRun(LIGHT, () => { setLidOn(true); T.check(id => id === 'pile') })
  const blow = useRun(BLOW, () => { setBlown(true); T.check(id => id === 'blow') })
  const bt = blown ? BLOW : blow.t, blowing = blow.busy
  const lit = (light.busy && light.t > 0.4) || (lidOn && !(blowing && bt > BOOM) && !blown)
  // 罐盖：先放在罐子旁边，盖上去；爆炸时被掀起来，落在罐子左边，歪着
  const lidHome: V3 = [X0 - 0.2 * M, Y + 0.017 * M, Z + 0.02 * M], lidTop: V3 = [X0, Y + H, Z]
  const lk = lidOn ? 1 : light.busy ? seg(light.t, 1.0, 2.6) : 0
  const flyK = blowing || blown ? seg(bt, BOOM, BOOM + 1.3) : 0
  const flyP: V3 = [lerp(lidTop[0], X0 - 0.22 * M, flyK), lidTop[1] + Math.sin(Math.PI * flyK) * 0.45 * M + (Y + 0.02 * M - lidTop[1]) * flyK * flyK, Z + 0.04 * M * flyK]
  const lidP = flyK > 0 ? flyP : liftPath(lidHome, lidTop, lidTop[1] + 0.08 * M, lk)
  const squeeze = blowing ? Math.sin(Math.PI * seg(bt, 0, 0.6)) : 0
  const cloud = blowing && bt > 0.25 && bt < BOOM + 0.1
  const boom = blowing ? Math.max(0, 1 - Math.abs(bt - BOOM - 0.15) / 0.35) : 0
  const pickSign = (k: Sign) => { setSign(k); if (k === 'fire') T.check(id => id === 'sign') }
  const resetAll = () => { light.snap(0); blow.snap(0); setLidOn(false); setBlown(false); setSign(null); T.reset() }
  const task = T.current
  const atSigns = task?.id === 'sign' || (!task && sign !== null)
  const { hint, next }: { hint: string; next: 'light' | 'blow' | 'sign' | null } = !task ? { hint: '可燃物与空气接触面积越大，燃烧越剧烈。面粉厂、加油站、煤矿都要严禁烟火。', next: null }
    : light.busy ? { hint: '点燃蜡烛，盖上罐盖…', next: null }
    : blowing ? { hint: bt < BOOM ? '鼓气：面粉被吹起来，散满了罐子…' : '砰！', next: null }
    : task.id === 'pile' ? { hint: '按“点燃蜡烛，盖上罐盖”。这个实验要在老师指导下做', next: 'light' }
    : task.id === 'blow' ? { hint: '面粉堆着，没有烧起来。按“鼓气”，用皮老虎把面粉吹散', next: 'blow' }
    : sign && sign !== 'fire' ? { hint: '再想一想，换一个标志', next: 'sign' }
    : { hint: '看后墙上的四个标志：面粉厂的车间门口，最该贴哪一个？', next: 'sign' }
  const labels: Label[] = atSigns ? SIGN_ORDER.map(k => ({ id: `s${k}`, at: [signAt(k)[0], signAt(k)[1] - 0.42 * M, signAt(k)[2] + 0.1] as V3, ax: 0.5, className: `scene-tag ${sign === k ? 'key' : ''}`, children: SIGNS[k].name })) : [
    ...(lidOn || blown ? [{ id: 'a', at: [X0 + R + 0.25, Y + H * 0.35, Z] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>面粉和空气接触的面积</small>{dustArea(blown || (blowing && bt > 0.5))} cm²</> }] : []),
    ...(blown ? [{ id: 'b', at: [X0 - 0.22 * M, Y + 0.08 * M, Z] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: '罐盖被掀开了' }] : []),
    { id: 'n1', at: [BULB[0], BULB[1] + 0.06 * M, BULB[2] + 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '皮老虎' },
    { id: 'n2', at: [X0 + R + 0.2, Y + H * 0.85, Z], name: true, className: 'scene-name', children: '铁皮罐（剖开）' },
    { id: 'n3', at: [X0 + 0.02 * M, Y + 0.035 * M, Z + 0.55], ax: 0.5, name: true, className: 'scene-name', children: '面粉' },
  ]
  return (
    <LabShell title="燃烧和灭火" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="粉尘爆炸"
      stage={<Place at={atSigns ? 'signs' : 'l7'} labels={labels}>
        <group position={[X0, Y, Z]}>
          <DustCan />
          <group position={[0, 0.024 * M, 0]}><FlourHeap s={blowing && bt > 0.3 || blown ? 0.15 : 1} /></group>
          <group position={[-0.042 * M, 0.004 * M, -0.02 * M]}><Candle h={0.05} lit={lit} /></group>
          {/* 胶管：从罐底穿出去，沿着桌面接到皮老虎 */}
          <mesh position={[0, 0.004 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, 0.004 * M, 10]} /><meshStandardMaterial color="#9b3a2c" /></mesh>
        </group>
        <Hose pts={[[X0 + 0.004 * M, Y + 0.006 * M, Z], [X0 + R * 0.6, Y + 0.004 * M, Z], [X0 + R + 0.01 * M, Y + 0.004 * M, Z + 0.01 * M], [X0 + 0.17 * M, Y + 0.004 * M, Z + 0.06 * M], [BULB[0] - 0.045 * M, BULB[1], BULB[2]]]} />
        <group position={BULB}><Bulb squeeze={squeeze} /></group>
        {blowing && bt < 1.0 && <group position={[BULB[0] + 0.01 * M, BULB[1] + 0.03 * M, BULB[2] + 0.01 * M]} rotation={[0.3, 0, 0]}><Glove /></group>}
        <Flame at={[X0 - 0.042 * M, Y + 0.056 * M, Z - 0.02 * M]} w={0.014 * M} h={0.04 * M} kind="candle" level={lit ? 1 : 0} seed={2} light={0.6} />
        {/* 面粉被吹起来，散满罐子；遇到烛火一下子烧起来 */}
        <Puffs at={[X0, Y + 0.035 * M, Z]} on={cloud} opt={{ rate: 70, life: 0.9, size: [0.01 * M, 0.08 * M], speed: 0.55 * M, spread: 0.6, color: '#f6f1e6', opacity: 0.6, drag: 2.5, jitter: 0.01 * M }} seed={4} />
        <Flame at={[X0, Y + 0.01 * M, Z]} w={2.4 * R} h={H * 1.5} kind="wood" level={boom} seed={7} light={80} lightColor="#ffb060" />
        <Puffs at={[X0, Y + H, Z]} on={blowing && bt > BOOM + 0.1 && bt < BOOM + 1.2} opt={SMOKE.dark(0.45)} seed={5} />
        {/* 罐盖：手套拿着它盖上去；爆炸时飞起来 */}
        <group position={lidP} rotation-z={flyK * 2.6}>
          <group position={[0, -H, 0]}><DustCanLid /></group>
          {light.busy && lk > 0 && lk < 1 && <group position={[0, 0.03 * M, 0.02 * M]} rotation={[-0.9, 0, 0.2]}><Glove s={0.006 * M} /></group>}
        </group>
        {/* 后墙上的四块安全标志 */}
        {SIGN_ORDER.map(k => <group key={k} position={signAt(k)}><SafetySign k={k} hi={sign === k} /></group>)}
      </Place>}
      lesson={<LessonBlock no="7" title="易燃物和易爆物的安全" concept="与空气接触面积越大，燃烧越剧烈" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>可燃物在有限的空间里急剧地燃烧，短时间内聚积大量的热，使气体的体积迅速膨胀，就会引起<b className="text-white">爆炸</b>。</p>
          <p className="mt-3">面粉堆着，只有表面和空气接触；吹散成粉尘，每一粒都和空气接触，接触面积大了很多倍，遇到明火一下子全部燃烧。面粉厂、纺织厂、煤矿的空气里常混有可燃性的粉尘，要严禁烟火。</p>
          <p className="mt-3 text-[13.5px] text-white/65">接触面积按面粉颗粒是边长 {GRAIN * 10000} μm 的小方块算，是示意。这个实验要在老师指导下做。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">粉尘爆炸看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">可燃物与空气接触面积越大，燃烧越剧烈</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">1 cm³ 面粉堆着，和空气接触 {dustArea(false)} cm²；散开以后约 {dustArea(true)} cm²。有可燃性粉尘的地方，要严禁烟火。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">1 cm³ 面粉和空气接触的面积</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{dustArea(blown)}<span className="ml-1 text-[15px] font-medium text-white/55">cm²</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="堆着" value={`${dustArea(false)} cm²`} unit="一个 1 cm 的小方块" />
            <ParamTile symbol="散开" value={`${dustArea(true)} cm²`} unit={`${GRAIN * 10000} μm 的颗粒（示意）`} />
          </div>
          {sign && <p className={`hint-in mt-4 rounded-xl px-3 py-3 text-[14px] leading-relaxed ${sign === 'fire' ? 'bg-[#35c7b3]/15' : 'bg-[#ff6b6b]/15'} text-white/90`}>{WHY[sign]}</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'light'} pulse={next === 'light'} onClick={() => light.run()} disabled={light.busy || lidOn}>点燃蜡烛，盖上罐盖</LabButton>
        <LabButton primary={next === 'blow'} pulse={next === 'blow'} onClick={() => blow.run()} disabled={!lidOn || blown || blowing}>鼓气</LabButton>
      </>}
      extras={
        <Control label="安全标志">
          <Segmented label="安全标志" pulse={next === 'sign'} want={next === 'sign' ? 'fire' : null} disabled={!blown} value={sign ?? ('' as Sign)} onChange={k => pickSign(k as Sign)} options={SIGN_ORDER.map(k => ({ value: k, label: SIGNS[k].name }))} />
        </Control>
      }
    />
  )
}

/** 罐盖单独画（DustCan 里也有一份，那份不动；这里画会飞的那一只） */
function DustCanLid() {
  return <group position={[0, H, 0]}>
    {/* 塑料罐盖：顶面中间微微鼓起，一圈压出来的凸棱，四周一道往下包住罐口的裙边，边上一个小提耳 */}
    <mesh position={[0, 0.006 * M, 0]} castShadow><cylinderGeometry args={[R + 0.002 * M, R + 0.004 * M, 0.004 * M, 48]} /><meshPhysicalMaterial color="#e9e5da" roughness={0.45} clearcoat={0.3} /></mesh>
    <mesh position={[0, 0.0075 * M, 0]} scale={[1, 0.08, 1]}><sphereGeometry args={[R * 0.82, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#efebe1" roughness={0.4} clearcoat={0.3} /></mesh>
    <mesh position={[0, 0.0085 * M, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[R * 0.86, 0.0016 * M, 6, 48]} /><meshPhysicalMaterial color="#d9d4c7" roughness={0.5} /></mesh>
    <mesh position={[0, -0.006 * M, 0]} castShadow><cylinderGeometry args={[R + 0.004 * M, R + 0.004 * M, 0.02 * M, 48, 1, true]} /><meshPhysicalMaterial color="#e1dccf" roughness={0.45} side={2} /></mesh>
    <mesh position={[R + 0.012 * M, -0.006 * M, 0]}><boxGeometry args={[0.018 * M, 0.004 * M, 0.02 * M]} /><meshPhysicalMaterial color="#e1dccf" roughness={0.45} /></mesh>
  </group>
}
