// 物态变化 · 拓展课：三个小专题。电冰箱怎样制冷；气压低了沸点也低（烧瓶里的水抽气后又沸腾）；水循环里的物态变化。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Bubbles, Puffs } from './fx'
import { FRIDGE_PART } from './fridge'
import { Clamp, Cradle, FLASK, Flask, GAUZE_T, Gauze, Lamp, Ring, Stand, Syringe, Thermo, thermoY } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Big, Done, H2, Room, useRun } from './parts'
import { BOIL, CHANGES, CYCLE, FLASK as WAIT, FRIDGE, boilsAgain, flaskT, readT } from './physics'
import { ThermoView } from './views'
import { FRIDGE_AT, LAKE, ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'fridge' | 'flask' | 'cycle'
const SUBS: Record<Sub, { name: string; title: string; button: string; say: string }> = {
  fridge: { name: '电冰箱', title: '制冷剂在里面汽化吸热，到外面液化放热', button: '接通电源', say: '电冰箱靠一种容易汽化、也容易液化的物质（制冷剂）搬运热量。液态的制冷剂流进冷冻室的管子里，迅速汽化，从冰箱里面吸热；压缩机把这些蒸气抽走，压进箱外的冷凝器，蒸气在那里液化，把热放到空气里。这样一圈一圈地循环，冰箱里面就越来越冷，所以冰箱的外壁和背面摸起来是热的。' },
  flask: { name: '沸点和气压', title: '气压降低，水的沸点也降低', button: '向外抽气', say: `烧瓶里的水停止加热 ${WAIT.wait} 分钟，已经降到 ${flaskT()} ℃，不沸腾了。用注射器往外抽气，瓶里的气压降低，水又沸腾起来：气压越低，沸点越低。高山上气压低，水不到 ${BOIL} ℃ 就沸腾，饭不容易煮熟；高压锅把气压加大，沸点升高，食物熟得快。` },
  cycle: { name: '水循环', title: '水在海洋、天空、陆地之间不停地变着状态', button: '让水转起来', say: CYCLE.map(c => `${c.name}：${c.say}`).join('。') + '。地球上的水就这样循环，总量不变，但能用的淡水很少，要节约。' },
}
const ORDER: Sub[] = ['fridge', 'flask', 'cycle']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))
const X = ST.sx, Z = 0.3, CX = X + 0.12, RING = 0.4, CUP = TOP + RING + GAUZE_T, BULB = CUP + 0.1, SX = X + 1.75, SY = TOP + 0.36
/** 从瓶塞接到注射器针嘴的橡皮管 */
const HOSE = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.05, 0.9, 0], [0.07, 1.25, 0], [0.4, 1.4, 0.05], [0.8, 0.9, 0.05], [0.95, 0.1, 0.02], [1.02, -0.06, 0]].map(p => new THREE.Vector3(...p))), 60, 0.022, 8)
const part = (k: keyof typeof FRIDGE_PART): [number, number, number] => [FRIDGE_AT.x + FRIDGE_PART[k][0], FRIDGE_PART[k][1], FRIDGE_AT.z + FRIDGE_PART[k][2]]

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('fridge')
  const [on, setOn] = useState<Record<Sub, boolean>>({ fridge: false, flask: false, cycle: false })
  const [t, setT] = useRun(on[sub], 1, 6)
  const T = useTasks('gewu:phase:x', TASKS)
  const door = useSlide(on.fridge && sub === 'fridge' ? 1 : 0, 0.7), V = useSlide(on.flask ? 18 : 2, 6)
  const again = boilsAgain(on.flask && V > 10)
  useEffect(() => { T.check(id => on[id as Sub] && id === sub && t >= (sub === 'flask' ? 3.5 : 5)) })
  const pick = (s: Sub) => { setSub(s); setT(0); setOn(o => ({ ...o, [s]: false })) }
  const resetAll = () => { setSub('fridge'); setOn({ fridge: false, flask: false, cycle: false }); setT(0); T.reset() }
  const task = T.current, S = SUBS[sub]
  const { hint, next }: { hint: string; next: 'sub' | 'go' | null } = !task ? { hint: '三个专题都看过了。', next: null }
    : sub !== task.id ? { hint: `换到“${SUBS[task.id as Sub].name}”`, next: 'sub' }
    : !on[sub] ? { hint: sub === 'fridge' ? '冰箱背后有一圈管子。按“接通电源”，打开门看制冷剂怎么流' : sub === 'flask' ? `瓶里的水是 ${flaskT()} ℃，没有沸腾。按“向外抽气”` : '按“让水转起来”，看一粒粒水从湖面出发走一圈', next: 'go' }
    : { hint: sub === 'fridge' ? '蓝色的一段在冰箱里面：汽化，吸热；橙色的一段在箱外：液化，放热' : sub === 'flask' ? '瓶里的气压降低了，水又沸腾起来…' : '蒸发、成云、降水、回流…', next: null }
  const labels: Label[] = sub === 'fridge' ? [
    { id: 'e', at: part('evap'), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: door > 0.8 ? 1 : 0 }, children: <><small>冷冻室里的管子</small>汽化 吸热</> },
    { id: 'c', at: part('cond'), ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>冷凝器</small>液化 放热</> },
    { id: 'p', at: part('pump'), className: 'scene-name translate-y-2', children: '压缩机' },
  ] : sub === 'flask' ? [
    { id: 't', at: [CX + 0.1, BULB + thermoY(flaskT()), Z], className: 'scene-tag key -translate-y-1/2', children: <><small>水温</small>{readT(flaskT())} ℃</> },
    { id: 's', at: [SX + 0.5, SY + 0.2, Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '注射器' },
    { id: 'l', at: [X - 0.95, TOP + 0.5, Z + 0.6], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '酒精灯已经撤掉' },
  ] : [
    { id: 'c0', at: [LAKE.x - 34, 62, LAKE.z - 20], ax: 1, className: 'scene-tag', children: <><small>蒸发</small>汽化 吸热</> },
    { id: 'c1', at: [LAKE.x + 30, 176, LAKE.z - 250], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>成云</small>液化、凝华 放热</> },
    { id: 'c2', at: [LAKE.x + 62, 96, LAKE.z - 280], className: 'scene-tag', children: <><small>降水</small>雨、雪</> },
    { id: 'c3', at: [LAKE.x + 34, 12, LAKE.z - 130], className: 'scene-name', children: '河水流回湖里' },
  ]
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={S.name}
      stage={<Room at={sub === 'fridge' ? 'fridge' : sub === 'flask' ? 'sx' : 'cycle'} labels={labels} fridge={door} power={on.fridge && sub === 'fridge'} cycle={on.cycle && sub === 'cycle'}>
        {/* 烧瓶：瓶塞上插着温度计，一根橡皮管接到注射器；酒精灯放在一边 */}
        <Stand at={[X, TOP, Z]}><Ring y={RING} /><Clamp y={RING + GAUZE_T + 0.72} grip={FLASK.neck} /></Stand>
        <Gauze at={[CX, TOP + RING, Z]} />
        <group position={[CX, CUP, Z]}>
          <Flask plug="rubber" level={0.3}><Bubbles r={0.24} h={0.3} kind={again ? 'boil' : 'none'} vigor={1} n={30} size={0.45} /></Flask>
          <mesh geometry={HOSE}><meshStandardMaterial color="#a8553a" roughness={0.7} /></mesh>
        </group>
        <Thermo at={[CX - 0.03, BULB, Z]} T={flaskT()} />
        <Cradle at={[SX + 0.05, TOP, Z]} w={0.8} /><Syringe at={[SX, SY, Z]} V={V} liquid={0} />
        <Lamp at={[X - 0.95, TOP, Z + 0.6]} lit={0} />
        {again && <Puffs at={[CX, CUP + 0.36, Z]} on={1} n={8} len={0.3} size={0.2} spread={0.1} dense={0.25} order={2} />}
      </Room>}
      lesson={<LessonBlock no="拓展" title={S.name} concept={S.title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{S.say}</p>} />}
      finale={T.finale && <Done head="拓展 · 三个专题都看过了" title="物态变化就在身边" onClose={() => T.setFinale(false)}>冰箱靠制冷剂的汽化和液化搬运热量；气压越低，水的沸点越低；地球上的水靠蒸发、液化、凝华、熔化不停地循环。</Done>}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'fridge' && <>
            <Big label="压缩机" value={on.fridge ? '在转' : '停着'} unit="" />
            <H2>制冷剂走一圈</H2>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px]">{FRIDGE.map(f => <li key={f.part} className="rounded-lg bg-white/6 px-3 py-2"><b className={f.is === 'vapor' ? 'text-[#7fb8ff]' : f.is === 'liquefy' ? 'text-[#ff9a6a]' : 'text-white'}>{f.part}{f.is ? ` · ${CHANGES[f.is].name}${CHANGES[f.is].heat}` : ''}</b><br /><span className="text-white/70">{f.say}</span></li>)}</ul>
          </>}
          {sub === 'flask' && <>
            <h2 className="text-[12.5px] text-white/55">温度计</h2>
            <ThermoView T={flaskT()} note={`低于 ${BOIL} ℃`} />
            <div className="mt-3 grid grid-cols-2 gap-2"><ParamTile symbol="瓶里的气压" value={on.flask && V > 10 ? '降低了' : '没有变'} unit="用注射器抽气" /><ParamTile symbol="水" value={again ? '又沸腾了' : '不沸腾'} unit={`${readT(flaskT())} ℃`} /></div>
          </>}
          {sub === 'cycle' && <>
            <Big label="水循环" value={on.cycle ? '在转' : '停着'} unit="" />
            <H2>一圈里的物态变化</H2>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px]">{CYCLE.map(c => <li key={c.name} className="rounded-lg bg-white/6 px-3 py-2"><b className="text-white">{c.name}</b><br /><span className="text-white/70">{c.say}</span></li>)}</ul>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => { setT(0); setOn(o => ({ ...o, [sub]: true })) }} disabled={on[sub]}>{S.button}</LabButton>
      </>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
