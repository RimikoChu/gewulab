// 空气和氧气 · 第 2 课 一瓶氧气：化验室长台上一台电子天平，两只 250 mL 集气瓶（氧气、空气）盖着玻璃片，一根带火星的木条，
// 旁边一只盛着液氧的玻璃杜瓦瓶。先后称两瓶气体，再把带火星的木条伸进两瓶。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { GasJar, GlassPlate, Glove, JAR, Splint } from './gear'
import { Balance, DEWAR_TOP, Dewar, DewarLid, PAN_Y, PAN_Z } from './kit'
import { Flame, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { bottleLabel } from './mats'
import { ease, liftPath, seg, useRun } from './parts'
import { BOIL, GAS_NAME, JAR_L, RHO, jarMass, relights, type Gas } from './physics'
import { BZ, M, Place, ST, TOP, type V3 } from './world'

const u = (v: number) => v * M
const X0 = ST.l2, Z0 = BZ + 0.2
const at = (x: number, y: number, z = 0): V3 => [X0 + u(x), TOP + u(y), Z0 + u(z)]
/** 两只瓶子平时放的位置、秤盘上的位置、木条和杜瓦瓶的位置（m） */
const HOME: Record<Gas, [number, number]> = { o2: [-0.21, 0.05], air: [-0.33, 0.0] }
const PAN: V3 = [0, PAN_Y, PAN_Z], LIFT = 0.36, SPL: V3 = [0.16, 0.006, 0.14], DEW: [number, number] = [0.27, -0.03]
const TASKS: Task[] = [
  { id: 'o2', text: '把氧气瓶放上天平，记下质量', note: '250 mL 氧气的质量是 0.357 g' },
  { id: 'air', text: '换成空气瓶，再记一次，比一比', note: '同样大的一瓶，空气 0.323 g，比氧气轻 0.034 g' },
  { id: 'splint', text: '把带火星的木条伸进氧气瓶，看它复燃', note: '木条在氧气里复燃，在空气里没有变化' },
]

/** 一只集气瓶：瓶身贴着标签，瓶口盖着玻璃片（slide 把玻璃片推开多少） */
function Jar({ gas, slide = 0 }: { gas: Gas; slide?: number }) {
  return <group>
    <GasJar />
    <mesh position-y={u(0.058)} rotation-y={0.25}><cylinderGeometry args={[u(JAR.r + 0.0006), u(JAR.r + 0.0006), u(0.034), 32, 1, true, -0.8, 1.6]} /><meshStandardMaterial map={bottleLabel(GAS_NAME[gas], gas === 'o2' ? '#2f6fb3' : '#7b8085')} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <group position={[u(0.05) * slide, u(JAR.h), -u(0.02) * slide]}><GlassPlate s={0.075} /></group>
  </group>
}

export default function Lesson2() {
  const [on, setOn] = useState<Gas | null>(null)          // 秤盘上现在是哪一瓶
  const [move, setMove] = useState<{ from: Gas | null; to: Gas } | null>(null)
  const [seen, setSeen] = useState<Gas[]>([])
  const T = useTasks('gewu:air:2', TASKS)
  const put = useRun(4, () => { if (!move) return; setOn(move.to); const s = seen.includes(move.to) ? seen : [...seen, move.to]; setSeen(s); setMove(null); T.check(id => s.includes(id as Gas)) })
  const test = useRun(9, () => T.check(id => id === 'splint'))
  const busy = put.busy || test.busy
  const place = (g: Gas) => { if (busy || on === g) return; setMove({ from: on, to: g }); put.run() }
  const resetAll = () => { put.snap(0); test.snap(0); setOn(null); setMove(null); setSeen([]); T.reset() }

  // 换瓶：秤盘上原来那瓶先拿回去，再把新的一瓶放上来
  const t0 = move?.from ? 1.7 : 0
  const prog = (g: Gas) => !move ? (on === g ? 1 : 0) : g === move.from ? 1 - seg(put.t, 0, 1.6) : g === move.to ? seg(put.t, t0, t0 + 2.1) : 0
  const pos = (g: Gas): V3 => liftPath([HOME[g][0], 0, HOME[g][1]], PAN, LIFT, prog(g))
  const held = (g: Gas) => { const k = prog(g); return put.busy && k > 0.001 && k < 0.999 }
  const settled = !busy && on !== null
  const reading = settled ? jarMass(on).toFixed(3) : '0.000'

  // 木条：先伸进空气瓶，停一会儿；再伸进氧气瓶，复燃
  const tt = test.busy ? test.t : 0
  const mouth = (g: Gas): V3 => { const p = pos(g); return [p[0], p[1] + JAR.h - 0.035, p[2]] }
  const a = mouth('air'), o = mouth('o2'), top = Math.max(a[1], o[1]) + 0.13
  const sp: V3 = !test.busy ? SPL : tt < 3.6 ? liftPath(SPL, a, top, seg(tt, 0, 1.4)) : tt < 7.4 ? liftPath(a, o, top, seg(tt, 3.6, 4.8)) : liftPath(o, SPL, top, seg(tt, 7.4, 8.8))
  const inAir = test.busy && tt > 1.4 && tt < 3.6, inO2 = test.busy && tt > 4.8 && tt < 7.4
  const fire = inO2 && relights('o2') ? ease(seg(tt, 4.9, 5.4)) : test.busy && tt >= 7.4 ? 1 - ease(seg(tt, 7.4, 8.2)) : 0
  const slide = (g: Gas) => !test.busy ? 0 : g === 'air' ? ease(seg(tt, 0.4, 1.1)) - ease(seg(tt, 3.6, 4.2)) : ease(seg(tt, 3.6, 4.4)) - ease(seg(tt, 7.6, 8.4))
  const tilt = test.busy ? -0.45 : -Math.PI / 2 + 0.05

  const task = T.current
  const { hint, next }: { hint: string; next: Gas | 'splint' | null } = !task ? { hint: '氧气是无色无味的气体，密度比空气略大；它能使带火星的木条复燃。', next: null }
    : put.busy ? { hint: `把${GAS_NAME[move?.to ?? 'o2']}瓶放到秤盘上，等读数稳定…`, next: null }
    : test.busy ? { hint: tt < 3.6 ? '木条伸进空气瓶：没有变化…' : '木条伸进氧气瓶：复燃了…', next: null }
    : task.id === 'o2' ? { hint: '把氧气瓶放上天平', next: 'o2' }
    : task.id === 'air' ? { hint: '换成空气瓶，再称一次', next: 'air' }
    : { hint: '把带火星的木条先伸进空气瓶，再伸进氧气瓶', next: 'splint' }

  const both = seen.length === 2
  const labels: Label[] = [
    { id: 'm', at: at(0.13, 0.2, PAN_Z), ax: 0, className: `scene-tag ${settled ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: settled ? 1 : 0 }, children: <><small>{on ? GAS_NAME[on] : ''} 250 mL</small>{reading} g</> },
    ...(inAir || inO2 ? [{ id: 'f', at: [X0 + u(sp[0] + 0.05), TOP + u(sp[1] + 0.09), Z0 + u(sp[2])] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: inO2 ? '木条复燃' : '没有变化' } as Label] : []),
    { id: 'lox', at: at(DEW[0], 0.34, DEW[1]), ax: 0.5, className: 'scene-name -translate-y-full', children: <>液氧 · 淡蓝色 · −183 ℃</> },
    { id: 'n1', at: at(0, 0.34, PAN_Z), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电子天平 · 分度值 0.001 g' },
    { id: 'n2', at: at(HOME.air[0] - 0.02, JAR.h + 0.03, HOME.air[1]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '集气瓶 250 mL' },
    { id: 'n3', at: at(SPL[0] + 0.08, -0.012, SPL[2] + 0.03), ax: 0.5, name: true, className: 'scene-name', children: '带火星的木条' },
  ]
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="称一称，验一验"
      stage={<Place at="l2" labels={labels}>
        <group position={at(0, 0)}><Balance text={reading} /></group>
        {(['o2', 'air'] as Gas[]).map(g => { const p = pos(g); return <group key={g} position={at(p[0], p[1], p[2])} onClick={e => { e.stopPropagation(); place(g) }}>
          <Jar gas={g} slide={slide(g)} />
          {held(g) && <group position={[u(0.012), u(0.075), -u(0.03)]} rotation={[0.2, 0.3, -1.25]}><Glove /></group>}
        </group> })}
        {/* 带火星的木条：平时搁在一块小瓷片上，头上一点红 */}
        <group position={at(sp[0], sp[1], sp[2])} rotation-z={tilt}>
          <Splint char={0.9} />
          <mesh position-y={u(0.002)}><sphereGeometry args={[u(0.0028), 10, 8]} /><meshBasicMaterial color={new THREE.Color(3.2, 0.9, 0.25)} toneMapped={false} /></mesh>
        </group>
        <Flame at={at(sp[0], sp[1] + 0.002, sp[2])} w={u(0.022)} h={u(0.05)} kind="wood" level={fire} seed={3} light={1.2} />
        <Puffs at={at(sp[0], sp[1] + 0.01, sp[2])} on={!inO2} opt={{ ...SMOKE.wisp(u(0.03)), rate: 5 }} seed={5} />
        {/* 液氧：玻璃杜瓦瓶，盖子放在旁边，瓶口往外漫着白雾 */}
        <group position={at(DEW[0], 0, DEW[1])}>
          <Dewar fill={0.55} />
          <Puffs at={[0, u(DEWAR_TOP - 0.01), 0]} on opt={{ ...SMOKE.fog(u(0.05)), rate: 7, life: 2.6, opacity: 0.2 }} seed={9} />
        </group>
        <group position={at(DEW[0] + 0.02, 0, DEW[1] + 0.13)}><DewarLid /></group>
      </Place>}
      lesson={<LessonBlock no="2" title="一瓶氧气" concept="同样大的一瓶，氧气比空气重一点" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在通常状况下，氧气是一种<b className="text-white">无色、无味</b>的气体，<b className="text-white">不易溶于水</b>，密度比空气略大。在标准状况下，氧气的密度是 1.429 g/L，空气是 1.293 g/L。</p>
          <p className="mt-2">所以氧气可以用排水法收集，也可以用向上排空气法收集；盛氧气的集气瓶要盖好玻璃片，正放在桌上。</p>
          <p className="mt-2">氧气能支持燃烧。把带火星的木条伸进集气瓶，木条复燃，说明瓶里是氧气。</p>
          <p className="mt-2">降温加压，氧气会变成<b className="text-white">淡蓝色</b>的液体。常压下液氧在 −183 ℃ 沸腾。</p>
          <p className="mt-2 text-[13px] text-white/60">天平的读数已经去掉了瓶子和玻璃片，只算瓶里气体的质量。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">称过了，也验过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">氧气的密度比空气略大，能使带火星的木条复燃</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">同样 250 mL，氧气 0.357 g，空气 0.323 g，相差 0.034 g。带火星的木条伸进氧气瓶里复燃，这是检验氧气的方法。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">m = ρ V</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled ? reading : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
            <div className="mt-1.5 text-[13px] text-white/60">{settled ? `秤盘上：一瓶${GAS_NAME[on]}` : '秤盘上还没有瓶子'}</div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5 text-[14px]">
            {(['o2', 'air'] as Gas[]).map(g => <div key={g} className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2"><span className="text-white/70">250 mL {GAS_NAME[g]}</span><span className="font-semibold tabular-nums">{seen.includes(g) ? `${jarMass(g).toFixed(3)} g` : '—'}</span></div>)}
            <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2"><span className="text-white/70">两瓶相差</span><span className="font-semibold tabular-nums text-[#7fe3d4]">{both ? `${(jarMass('o2') - jarMass('air')).toFixed(3)} g` : '—'}</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="ρ(氧气)" value={RHO.o2.toFixed(3)} unit="g/L" />
            <ParamTile symbol="ρ(空气)" value={RHO.air.toFixed(3)} unit="g/L" />
            <ParamTile symbol="V" value={String(JAR_L * 1000)} unit="mL · 集气瓶容积" />
            <ParamTile symbol="t(沸)" value={String(BOIL.o2).replace('-', '−')} unit="℃ · 液氧的沸点" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'o2'} pulse={next === 'o2'} onClick={() => place('o2')} disabled={busy || on === 'o2'}>放上氧气瓶</LabButton>
        <LabButton primary={next === 'air'} pulse={next === 'air'} onClick={() => place('air')} disabled={busy || on === 'air'}>放上空气瓶</LabButton>
        <LabButton primary={next === 'splint'} pulse={next === 'splint'} onClick={() => test.run()} disabled={busy}>伸入木条</LabButton>
      </>}
      extras={null}
    />
  )
}
