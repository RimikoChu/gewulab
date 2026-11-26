// 溶液 · 第 3 课 饱和溶液和不饱和溶液：化验台第 3 格。左边一只烧杯盛 20 mL 水，用来溶氯化钠；右边一只架在三脚架上，下面是酒精灯，用来溶硝酸钾。
// 一次加 5 g：氯化钠加第二次就溶不完了（饱和），加 10 mL 水又溶了；硝酸钾加第二次也剩下，加热到 60 ℃ 又溶了。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, BEAKER, Beaker, GlassRod, Glove, JarBottle, LAMP_TOP, Spoon, SqueezeBottle, TRIPOD, Thermometer, Tripod } from './gear'
import { Crystals, Flame, Grains } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { L3, ROOM, SALT_NAME, dissolve, g1 } from './physics'
import { BZ, M, ST, TOP, Place } from './world'

type K = 'NaCl' | 'KNO3'
const X0 = ST.l3, Y = TOP, Z = BZ + 0.15
const R = BEAKER[100].r * M, H = BEAKER[100].h * M, AREA = Math.PI * (BEAKER[100].r - 0.002) ** 2
const lv = (mL: number) => mL * 1e-6 / AREA
const AT: Record<K, P3> = { NaCl: [X0 - 0.1 * M, Y, Z], KNO3: [X0 + 0.12 * M, Y + (TRIPOD.h + 0.002) * M, Z] }
const LAMP: P3 = [X0 + 0.12 * M, Y, Z]
const JAR: Record<K, P3> = { NaCl: [X0 - 0.2 * M, Y, Z - 0.14 * M], KNO3: [X0 + 0.0 * M, Y, Z - 0.16 * M] }
const WASH: P3 = [X0 - 0.21 * M, Y, Z - 0.1 * M]
const SPOON0: P3 = [X0 - 0.05 * M, Y + 0.004 * M, Z + 0.08 * M], ROD0: P3 = [X0 - 0.16 * M, Y + 0.004 * M, Z + 0.08 * M]
const ADD = 1.8, STIR = 2.6, POUR = 3.2, HEAT = 6
const TASKS: Task[] = [
  { id: 'n1', text: '往 20 mL 水里加 5 g 氯化钠，搅拌', note: '全溶了：还能继续溶解，是不饱和溶液' },
  { id: 'n2', text: '再加 5 g 氯化钠，搅拌', note: `剩下约 ${g1(dissolve('NaCl', L3.water, 10, ROOM).left)} g 溶不了：这时是氯化钠的饱和溶液` },
  { id: 'w', text: '加 10 mL 水，搅拌', note: '剩下的又溶了：加水能使饱和溶液变成不饱和溶液' },
  { id: 'k', text: '换硝酸钾：加到溶不了，再加热', note: '升高温度，硝酸钾又能继续溶解' },
]

export default function Lesson3() {
  const [pick, setPick] = useState<K>('NaCl')
  const [m, setM] = useState<Record<K, number>>({ NaCl: 0, KNO3: 0 })        // 加进去多少 g
  const [water, setWater] = useState(L3.water)                              // 氯化钠那杯的水
  const [hot, setHot] = useState(false)
  const [act, setAct] = useState<{ what: 'add' | 'water' | 'heat'; k: K }>({ what: 'add', k: 'NaCl' })
  const T = useTasks('gewu:solution:3', TASKS)
  const done = (mm: Record<K, number>, w: number, h: boolean) => T.check(id => id === 'n1' ? mm.NaCl >= 5 : id === 'n2' ? mm.NaCl >= 10 : id === 'w' ? w > L3.water : mm.KNO3 >= 10 && h)
  const add = useRun(ADD + STIR, () => { const n = { ...m, [act.k]: m[act.k] + L3.scoop }; setM(n); done(n, water, hot) })
  const pour = useRun(POUR, () => { const w = water + L3.addWater; setWater(w); done(m, w, hot) })
  const heat = useRun(HEAT, () => { setHot(true); done(m, water, true) })
  const busy = add.busy || pour.busy || heat.busy
  const tK = act.what === 'heat' && heat.busy ? ROOM + (L3.hot - ROOM) * ease(seg(heat.t, 0.6, HEAT - 0.6)) : hot ? L3.hot : ROOM
  const st = (k: K) => k === 'NaCl' ? dissolve('NaCl', water, m.NaCl, ROOM) : dissolve('KNO3', L3.water, m.KNO3, tK)
  const resetAll = () => { add.snap(0); pour.snap(0); heat.snap(0); setPick('NaCl'); setM({ NaCl: 0, KNO3: 0 }); setWater(L3.water); setHot(false); T.reset() }

  const task = T.current, want: K = task?.id === 'k' ? 'KNO3' : 'NaCl'
  const { hint, next }: { hint: string; next: 'pick' | 'add' | 'water' | 'heat' | null } = !task ? { hint: '溶不了的时候就饱和了；加水或者升温，又能继续溶解。', next: null }
    : add.busy ? { hint: add.t < ADD ? `加 5 g ${SALT_NAME[act.k]}…` : '搅拌，看溶不溶得完…', next: null }
    : pour.busy ? { hint: '加 10 mL 水，搅拌…', next: null }
    : heat.busy ? { hint: '加热，一边搅拌…', next: null }
    : pick !== want ? { hint: `换成${SALT_NAME[want]}那一杯`, next: 'pick' }
    : task.id === 'n1' ? { hint: '往 20 mL 水里加 5 g 氯化钠，搅拌', next: 'add' }
    : task.id === 'n2' ? { hint: '全溶了。再加 5 g，看还能不能溶完', next: 'add' }
    : task.id === 'w' ? { hint: '杯底有溶不了的氯化钠。加 10 mL 水，搅拌', next: 'water' }
    : m.KNO3 < 5 ? { hint: '往 20 mL 水里加 5 g 硝酸钾，搅拌', next: 'add' }
    : m.KNO3 < 10 ? { hint: '再加 5 g 硝酸钾', next: 'add' }
    : { hint: '硝酸钾也溶不完了。加热到 60 ℃', next: 'heat' }

  // 动作：药匙；洗瓶倒水；酒精灯
  const a = add.t, c0 = act.k
  const moving = add.busy && a < ADD
  const jarTop: P3 = [JAR[c0][0] + 0.03 * M, Y + 0.03 * M, JAR[c0][2] + 0.06 * M], over: P3 = [AT[c0][0] - 0.015 * M, AT[c0][1] + H + 0.03 * M, AT[c0][2]]
  const top = AT[c0][1] + H + 0.06 * M
  const sp: P3 = !moving ? SPOON0 : a < 0.5 ? liftPath(SPOON0, jarTop, Y + 0.12 * M, seg(a, 0, 0.5)) : a < 1.1 ? liftPath(jarTop, over, top, seg(a, 0.5, 1.1)) : liftPath(over, SPOON0, top, seg(a, 1.4, ADD))
  const flip = moving ? ease(seg(a, 1.05, 1.25)) * (1 - ease(seg(a, 1.35, 1.45))) : 0
  const stirring = (add.busy && a > ADD) || (pour.busy && pour.t > 1.8) || (heat.busy && heat.t > 1)
  const sk = add.busy ? c0 : pour.busy ? 'NaCl' : 'KNO3', ang = performance.now() / 1000 * 9
  const rodAt: P3 = stirring ? [AT[sk][0] + Math.cos(ang) * R * 0.4, AT[sk][1] + 0.008 * M, AT[sk][2] + Math.sin(ang) * R * 0.3] : ROD0
  const wk = pour.busy ? ease(seg(pour.t, 0, 0.7)) * (1 - ease(seg(pour.t, 1.6, 2.2))) : 0
  const washAt: P3 = [WASH[0] + (AT.NaCl[0] - 0.05 * M - WASH[0]) * wk, Y + wk * (H + 0.03 * M), WASH[2] + (AT.NaCl[2] - WASH[2]) * wk]
  const pourK = pour.busy ? seg(pour.t, 0.7, 1.6) : 0
  const flame = heat.busy ? ease(seg(heat.t, 0, 0.5)) * (1 - ease(seg(heat.t, HEAT - 0.4, HEAT))) : 0

  // 杯底剩下的晶体：加进去还没搅完时按刚加的算，搅拌、加水、加热时慢慢溶掉
  const shown = (k: K) => {
    const s = st(k)
    if (add.busy && act.k === k) { const before = dissolve(k, k === 'NaCl' ? water : L3.water, m[k], k === 'KNO3' ? tK : ROOM).left, after = dissolve(k, k === 'NaCl' ? water : L3.water, m[k] + 5, k === 'KNO3' ? tK : ROOM).left; return a < ADD ? before : before + (after - before) * ease(seg(a, ADD, ADD + STIR)) }
    if (pour.busy && k === 'NaCl') return s.left * (1 - ease(seg(pour.t, 1.4, POUR)))
    return s.left
  }
  const wNaCl = water + (pour.busy ? L3.addWater * pourK : 0)
  const cur = st(pick), left = shown(pick)
  const labels: Label[] = [
    ...(['NaCl', 'KNO3'] as K[]).map(k => ({ id: k, at: [AT[k][0], AT[k][1] + H + 0.03 * M, AT[k][2]] as P3, ax: 0.5, className: `scene-tag ${pick === k ? 'key' : ''} -translate-y-full`, children: <><small>{SALT_NAME[k]} · {k === 'NaCl' ? Math.round(wNaCl) : L3.water} mL 水</small>{m[k] === 0 ? '还没加' : shown(k) > 0.05 ? `剩 ${g1(shown(k))} g` : '全溶了'}</> })),
    { id: 'j1', at: [JAR.NaCl[0], Y + 0.1 * M, JAR.NaCl[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '氯化钠' },
    { id: 'j2', at: [JAR.KNO3[0], Y + 0.1 * M, JAR.KNO3[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '硝酸钾' },
    { id: 'j3', at: [WASH[0], Y + 0.15 * M, WASH[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蒸馏水' },
  ]
  return (
    <LabShell title="溶液" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="溶解"
      stage={<Place at="l3" labels={labels}>
        {(['NaCl', 'KNO3'] as K[]).map(k => <group key={k} position={AT[k]}>
          <Beaker vol={100} level={lv(k === 'NaCl' ? wNaCl : L3.water)} color={k === 'KNO3' ? '#c9e2e9' : '#c3e0e8'}>
            <Crystals at={[0, 0, 0]} R={R * 0.55} amount={Math.min(1, shown(k) / 5)} size={k === 'NaCl' ? 0.0028 * M : 0.0024 * M} shape={k === 'NaCl' ? 'cube' : 'needle'} n={90} seed={k === 'NaCl' ? 3 : 8} heap={0.6} />
            {k === 'KNO3' && <group position={[0.008 * M, 0.002 * M, -0.006 * M]} rotation={[0.14, 0, -0.12]}><Thermometer temp={tK} /></group>}
          </Beaker>
        </group>)}
        {(['NaCl', 'KNO3'] as K[]).map(k => <Grains key={k} at={AT[k]} R={R * 0.7} H={lv(k === 'NaCl' ? wNaCl : L3.water) * M} fall={add.busy && act.k === k ? seg(a, 1.15, 2.0) : 0} left={add.busy && act.k === k ? 1 - seg(a, 1.6, ADD + 1) : 0} size={0.0024 * M} n={36} seed={k === 'NaCl' ? 4 : 6} />)}
        <group position={[AT.KNO3[0], Y, AT.KNO3[2]]}><Tripod /></group>
        <group position={LAMP}><AlcoholLamp /></group>
        <Flame at={[LAMP[0], Y + LAMP_TOP * M, LAMP[2]]} w={0.026 * M} h={0.05 * M} level={flame} />
        {(['NaCl', 'KNO3'] as K[]).map(k => <group key={k} position={JAR[k]}><JarBottle label={SALT_NAME[k]} amount={0.55} stopper={false} /></group>)}
        <group position={washAt} rotation-z={Math.PI * 0.6 * wk}><SqueezeBottle label="蒸馏水" />
          {pour.busy && pourK > 0 && pourK < 1 && <mesh position={[0.008 * M, 0.15 * M, 0]} rotation-z={-Math.PI * 0.6}><cylinderGeometry args={[0.001 * M, 0.001 * M, 0.06 * M, 8]} /><meshPhysicalMaterial color="#d6eef4" transparent opacity={0.6} roughness={0.02} /></mesh>}
          {pour.busy && <group position={[0, 0.05 * M, -0.03 * M]} rotation={[-0.5, 0, 0]}><Glove /></group>}
        </group>
        <group position={sp} rotation={[0, moving ? 0 : 0.6, Math.PI * 0.85 * flip]}><Spoon load={moving && a > 0.45 && a < 1.3 ? 1 - flip : 0} />
          {moving && <group position={[0.15 * M, 0.02 * M, -0.01 * M]} rotation={[-1.0, 0.3, -0.9]}><Glove /></group>}
        </group>
        <group position={rodAt} rotation={stirring ? [Math.sin(ang) * 0.15, 0, -Math.cos(ang) * 0.15] : [0, 0, Math.PI / 2 - 0.02]}><GlassRod len={0.18} />
          {stirring && <group position={[0, 0.14 * M, 0]} rotation={[-0.45, 0, 0]}><Glove /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="3" title="饱和溶液和不饱和溶液" concept="溶不了的那一刻，溶液就饱和了" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在<b className="text-white">一定温度</b>下，向<b className="text-white">一定量溶剂</b>里加入某种溶质，当溶质不能继续溶解时，所得到的溶液叫做这种溶质的<b className="text-white">饱和溶液</b>；还能继续溶解的，叫做不饱和溶液。</p>
          <p className="mt-3">饱和溶液加溶剂，能变成不饱和溶液。对硝酸钾这样溶解能力随温度升高而增大的物质，升高温度也能使它的饱和溶液变成不饱和溶液。</p>
          <p className="mt-3 text-[13.5px] text-white/65">说饱和、不饱和，一定要指明温度、溶剂的量和是哪种溶质。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两杯都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">一定温度、一定量溶剂里溶不了，就是饱和溶液</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">20 mL 水溶不完 10 g 氯化钠，加 10 mL 水就溶完了；硝酸钾升温到 60 ℃ 也能继续溶解。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SALT_NAME[pick]}那杯</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight">{m[pick] === 0 ? '—' : cur.saturated && left > 0.05 ? '饱和' : '不饱和'}</div>
            <div className="mt-2 text-[13.5px] text-white/60 tabular-nums">{m[pick] === 0 ? '还没加' : left > 0.05 ? `杯底剩 ${g1(left)} g 溶不了` : '加进去的全溶了'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="水" value={`${pick === 'NaCl' ? Math.round(wNaCl) : L3.water}`} unit="mL" />
            <ParamTile symbol="加入" value={`${m[pick]}`} unit="g" />
            <ParamTile symbol="t" value={`${pick === 'KNO3' ? Math.round(tK) : ROOM}`} unit="℃" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'add'} pulse={next === 'add'} onClick={() => { if (busy || m[pick] >= 10) return; setAct({ what: 'add', k: pick }); add.run() }} disabled={busy || m[pick] >= 10}>加 5 g，搅拌</LabButton>
        <LabButton primary={next === 'water'} pulse={next === 'water'} onClick={() => { if (busy || pick !== 'NaCl' || water > L3.water || m.NaCl < 10) return; setAct({ what: 'water', k: 'NaCl' }); pour.run() }} disabled={busy || pick !== 'NaCl' || water > L3.water || m.NaCl < 10}>加 10 mL 水</LabButton>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} onClick={() => { if (busy || pick !== 'KNO3' || hot || m.KNO3 < 10) return; setAct({ what: 'heat', k: 'KNO3' }); heat.run() }} disabled={busy || pick !== 'KNO3' || hot || m.KNO3 < 10}>加热到 60 ℃</LabButton>
      </>}
      extras={
        <Control label="哪一杯">
          <Segmented label="哪一杯" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={k => setPick(k as K)} options={[{ value: 'NaCl', label: '氯化钠' }, { value: 'KNO3', label: '硝酸钾' }]} />
        </Control>
      }
    />
  )
}
