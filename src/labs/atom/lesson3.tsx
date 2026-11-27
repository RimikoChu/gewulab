// 分子和原子 · 第 3 课 冷水和热水：两只 250 mL 烧杯，左边 20 °C 的冷水，右边 80 °C 的热水（冒着白汽），各插一支温度计；
// 前面一只表面皿里盛着几粒品红。用镊子往两杯里各放一粒品红，等一会儿：热水里的品红散得快得多。再放大看两杯里的水分子谁动得快。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, Hand, Thermometer, WatchGlass, beakerFill } from './gear'
import { DyeCloud, Steam } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { COLD, HOT, meanSpeed, spread } from './physics'
import { Callout, MolField } from './mol'
import { BZ, Place, ST, TOP, u, type V3 } from './world'

const X0 = ST.l3, Z0 = BZ + u(0.03)
type Cup = 'cold' | 'hot'
type Look = 'off' | Cup
const CUP: Record<Cup, V3> = { cold: [X0 - u(0.075), TOP, Z0], hot: [X0 + u(0.075), TOP, Z0] }
const TEMP: Record<Cup, number> = { cold: COLD, hot: HOT }
const NAME: Record<Cup, string> = { cold: '冷水', hot: '热水' }
const DISH: V3 = [X0, TOP, Z0 + u(0.07)]
const FILL = beakerFill(250, 200), BK = BEAKER[250]
const TASKS: Task[] = [
  { id: 'drop', text: '用镊子往冷水、热水里各放一粒品红', note: '品红一放进水里，就开始向四周散开' },
  { id: 'wait', text: '等一会儿，比一比哪杯散得快', note: '热水里的品红散得快得多' },
  { id: 'cold', text: '放大看冷水里的水分子', note: '冷水里，水分子也在不停地运动' },
  { id: 'hot', text: '放大看热水里的水分子', note: '热水里，水分子运动得更快' },
]

/** 不锈钢镊子：两片细长的钢片，尖头并拢。原点在尖头，朝 +y */
function Tweezers({ open = 0 }: { open?: number }) {
  return <group>{[-1, 1].map(s => <group key={s} rotation-z={s * (0.025 + open * 0.04)}>
    <RoundedBox args={[u(0.004), u(0.12), u(0.0012)]} radius={u(0.0005)} position={[s * u(0.002), u(0.06), 0]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
  </group>)}</group>
}

export default function Lesson3() {
  const T = useTasks('gewu:atom:3', TASKS)
  const [look, setLook] = useState<Look>('off')
  const drop = useRun(5.2, () => T.check(id => id === 'drop'))
  const wait = useRun(9, () => T.check(id => id === 'wait'))
  const busy = drop.busy || wait.busy
  const resetAll = () => { drop.snap(0); wait.snap(0); setLook('off'); T.reset() }
  const pick = (k: Look) => { setLook(k); if (k !== 'off') T.check(id => id === k && !!T.done.wait) }

  // 放品红：镊子从表面皿里夹起一粒，先放进冷水，再夹一粒放进热水
  const dt = drop.t, over = (c: Cup): V3 => [CUP[c][0], TOP + u(BK.h + 0.03), CUP[c][2]], dish: V3 = [DISH[0], TOP + u(0.012), DISH[2]]
  const tw: V3 = !drop.busy ? dish : dt < 1.2 ? liftPath(dish, over('cold'), TOP + u(0.16), seg(dt, 0, 1.2)) : dt < 1.8 ? over('cold') : dt < 3.2 ? liftPath(over('cold'), over('hot'), TOP + u(0.16), seg(dt, 1.8, 3.2)) : dt < 3.8 ? over('hot') : liftPath(over('hot'), dish, TOP + u(0.16), seg(dt, 3.8, 5.2))
  const inCold = T.done.drop || (drop.busy && dt > 1.5), inHot = T.done.drop || (drop.busy && dt > 3.5)
  // 散开的程度：放进去以后按时间走；“等一会儿”把时间快进
  const sec = T.done.wait ? 60 : wait.busy ? 2 + ease(seg(wait.t, 0.5, 8.5)) * 58 : T.done.drop ? 2 : drop.busy ? 0 : 0
  const kOf = (c: Cup) => (c === 'cold' ? inCold : inHot) ? Math.max(0.04, spread(TEMP[c], sec + (c === 'cold' && drop.busy ? (dt - 1.5) * 0.4 : 0))) : 0
  const tint = (c: Cup) => `#${new THREE.Color('#eef5f6').lerp(new THREE.Color('#d0207e'), Math.pow(kOf(c), 1.6) * 0.55).getHexString()}`

  const task = T.current
  const wantLook: Look = task?.id === 'cold' ? 'cold' : task?.id === 'hot' ? 'hot' : 'off'
  const { hint, next }: { hint: string; next: 'drop' | 'wait' | 'look' | null } = !task ? { hint: '温度越高，分子运动越快，品红散开得也越快。', next: null }
    : drop.busy ? { hint: '用镊子夹一粒品红，轻轻放进水里…', next: null }
    : wait.busy ? { hint: '过了一会儿…（画面快进）', next: null }
    : task.id === 'drop' ? { hint: '往冷水、热水里各放一粒品红', next: 'drop' }
    : task.id === 'wait' ? { hint: '品红开始散开了。等一会儿，比一比哪杯散得快', next: 'wait' }
    : task.id === 'cold' ? { hint: '热水里的品红散得快。放大看看冷水里的水分子', next: 'look' }
    : { hint: '再放大看看热水里的水分子，比一比', next: 'look' }

  const molSpeed = look === 'hot' ? 2.6 : 1
  const calloutAt: V3 = [X0, TOP + u(0.155), Z0 - u(0.05)]
  const fromAt: V3 = look === 'hot' ? [CUP.hot[0] - u(0.01), TOP + u(0.06), Z0 + u(0.02)] : [CUP.cold[0] + u(0.01), TOP + u(0.06), Z0 + u(0.02)]
  const species = useMemo(() => [{ f: 'H2O', share: 0.94 }, { f: 'DYE', share: 0.06 }], [])
  const labels: Label[] = [
    ...(['cold', 'hot'] as Cup[]).map(c => ({ id: c, at: [CUP[c][0] - u(0.03), TOP + u(BK.h + 0.01), Z0 + u(0.03)] as V3, ax: 1, className: `scene-tag ${look === c ? 'key' : ''} -translate-y-full`, children: <><small>{NAME[c]}</small>{TEMP[c]} °C</> })),
    { id: 'n1', at: [DISH[0], TOP - u(0.004), DISH[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '品红' },
    { id: 'm', at: [calloutAt[0], calloutAt[1] + u(0.052), calloutAt[2]], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: look !== 'off' ? 1 : 0 }, children: '放大示意：水分子和品红分子' },
  ]
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="品红"
      stage={<Place at="l3" labels={labels}>
        {(['cold', 'hot'] as Cup[]).map(c => <group key={c}>
          <group position={CUP[c]}>
            <Beaker vol={250} fill={FILL} color={tint(c)} opacity={0.4} />
            <group position={[u(0.015), u(0.012), -u(0.012)]} rotation={[-0.1, 0, -0.16]}><Thermometer t={TEMP[c]} /></group>
          </group>
          <DyeCloud at={[CUP[c][0] - u(0.005), TOP + u(0.003), CUP[c][2] + u(0.004)]} R={u(BK.r - 0.004)} H={u(BK.h * FILL - 0.004)} k={kOf(c)} seed={c === 'cold' ? 3 : 8} />
        </group>)}
        <Steam at={[CUP.hot[0], TOP + u(BK.h * FILL), Z0]} r={u(0.03)} h={u(0.12)} />
        <group position={DISH}><WatchGlass /></group>
        {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[DISH[0] + u(0.006 * Math.cos(i * 2.3)), TOP + u(0.004), DISH[2] + u(0.005 * Math.sin(i * 2.3))]} rotation={[i, i * 2, 0]}><icosahedronGeometry args={[u(0.0018), 0]} /><meshStandardMaterial color="#5c0a3a" roughness={0.35} metalness={0.2} /></mesh>)}
        <group position={drop.busy ? tw : [DISH[0] + u(0.07), TOP + u(0.0015), DISH[2] + u(0.01)]} rotation={drop.busy ? [0.1, 0, -0.15] : [0, 0.5, Math.PI / 2]}>
          <Tweezers open={drop.busy && ((dt > 1.4 && dt < 1.8) || (dt > 3.4 && dt < 3.8)) ? 1 : 0} />
          {drop.busy && ((dt > 0.15 && dt < 1.5) || (dt > 2.0 && dt < 3.5)) && <mesh position-y={u(0.001)}><icosahedronGeometry args={[u(0.0018), 0]} /><meshStandardMaterial color="#5c0a3a" roughness={0.35} /></mesh>}
          {drop.busy && <group position={[0, u(0.1), 0]} rotation={[0.2, 0.3, 0.1]}><group><Hand grip={0.65} /></group></group>}
        </group>
        <Callout at={calloutAt} from={fromAt} r={u(0.045)} fieldR={26} show={look !== 'off' ? 1 : 0}>
          <MolField species={species} R={26} gap={3.1} speed={molSpeed} seed={look === 'hot' ? 12 : 4} opacity={look !== 'off' ? 1 : 0} />
        </Callout>
      </Place>}
      lesson={<LessonBlock no="3" title="冷水和热水" concept="温度越高，分子运动越快" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>品红放进水里，品红分子不断运动，向水里扩散开来。热水里的品红扩散得快，说明温度越高，分子运动的速率越大。</p>
          <p className="mt-2">水分子的平均速率：{COLD} °C 时约 {Math.round(meanSpeed(18, COLD))} m/s，{HOT} °C 时约 {Math.round(meanSpeed(18, HOT))} m/s。</p>
          <p className="mt-2 text-[13.5px] text-white/65">放大示意圈里画的是比例模型，品红分子用洋红色的一团代表；分子运动的快慢是放慢、夸大了画的。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">热水里散得快</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">温度越高，分子运动越快</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">品红分子在水里不断运动、扩散开来。热水里的水分子和品红分子运动得更快，品红散开得也更快。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{look === 'off' ? '两杯水的温度' : `${NAME[look]}里水分子的平均速率`}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{look === 'off' ? <>{COLD}<span className="text-[22px] text-white/55"> / </span>{HOT}</> : `约 ${Math.round(meanSpeed(18, TEMP[look]))}`}<span className="ml-1 text-[15px] font-medium text-white/55">{look === 'off' ? '°C' : 'm/s'}</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">水分子的平均速率</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol={`${COLD} °C`} value={`约 ${Math.round(meanSpeed(18, COLD))}`} unit="m/s · 冷水" />
            <ParamTile symbol={`${HOT} °C`} value={`约 ${Math.round(meanSpeed(18, HOT))}`} unit="m/s · 热水" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'drop'} pulse={next === 'drop'} onClick={() => drop.run()} disabled={busy || !!T.done.drop}>放入品红</LabButton>
        <LabButton primary={next === 'wait'} pulse={next === 'wait'} onClick={() => wait.run()} disabled={busy || !T.done.drop || !!T.done.wait}>等一会儿</LabButton>
      </>}
      extras={
        <Control label="放大看分子">
          <Segmented label="放大看分子" pulse={next === 'look'} want={wantLook} value={look} disabled={busy} onChange={k => pick(k as Look)} options={[{ value: 'off', label: '不看' }, { value: 'cold', label: '冷水' }, { value: 'hot', label: '热水' }]} />
        </Control>
      }
    />
  )
}
