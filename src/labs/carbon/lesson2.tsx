// 碳和二氧化碳 · 第 2 课 二氧化碳的制取（样板课）：化验台第 2 格。锥形瓶上塞着双孔橡胶塞，一孔插长颈漏斗（下端伸到瓶底），一孔接导管，
// 导管伸到正放的集气瓶底部（向上排空气法）。先装大理石，再从长颈漏斗加稀盐酸；燃着的木条放在瓶口验满，盖好玻璃片正放。
// 最后换稀硫酸再做一遍：气泡很快变少、停下。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { FLASK, Flask, GasJar, GlassPlate, GlassTube, Glove, JAR, JarBottle, LongFunnel, NarrowBottle, Splint, Stopper } from './gear'
import { Bubbles, Flame, Haze, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useClock, useRun } from './parts'
import { ACIDS, MARBLE, co2FromCaCO3, collected, genRate, type Acid } from './physics'
import { rng } from './mats'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l2, Y = TOP, Z = BZ + 0.1
const u = (v: number) => v * M
/** 锥形瓶、集气瓶、试剂瓶的位置（相对 X0，m） */
const FXm = -0.08, JXm = 0.13, JZm = 0.01
const FX = X0 + u(FXm), JX = X0 + u(JXm), JZ = Z + u(JZm)
const BOT: Record<string, [number, number]> = { marble: [-0.22, -0.03], hcl: [-0.3, -0.01], h2so4: [-0.38, -0.04] }
const PLUG = FLASK.top - 0.016            // 塞子底面的高度（m）
const FUN_LEN = 0.21                      // 长颈漏斗的颈长（m），下端离瓶底 0.008
const CUP = 0.008 + FUN_LEN + 0.045       // 漏斗口的高度
/** 加酸以后锥形瓶里的液面（m）：没过漏斗下端 */
const LEVEL = 0.032
const TASKS: Task[] = [
  { id: 'make', text: '装大理石，从长颈漏斗加稀盐酸', note: '大理石表面冒出大量气泡，生成的二氧化碳沿导管进入集气瓶' },
  { id: 'full', text: '把燃着的木条放在瓶口验满', note: '木条熄灭，说明集气瓶里已经集满二氧化碳' },
  { id: 'cover', text: '盖好玻璃片，正放在桌上', note: '二氧化碳的密度比空气大，集气瓶要正放' },
  { id: 'h2so4', text: '换成稀硫酸再做一次', note: '气泡很快变少、停下：生成的硫酸钙微溶，盖住了大理石' },
]

/** 锥形瓶底的一堆大理石块：几颗不规则的灰白石块 */
function Marble({ drop = 1 }: { drop?: number }) {
  const g = useMemo(() => {
    const r = rng(11), gs: THREE.BufferGeometry[] = []
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.026, s = 0.0065 + r() * 0.004; const q = new THREE.IcosahedronGeometry(u(s), 0); q.scale(1, 0.75 + r() * 0.3, 0.9); q.rotateY(r() * 3); q.translate(Math.cos(a) * u(rr), u(0.006 + (i % 3) * 0.004), Math.sin(a) * u(rr)); gs.push(q) }
    return mergeGeometries(gs)
  }, [])
  return <mesh geometry={g} position-y={u(0.12) * (1 - drop)} castShadow><meshStandardMaterial color="#e6e3dc" roughness={0.85} flatShading /></mesh>
}

export default function Lesson2() {
  const [acid, setAcid] = useState<Acid>('hcl')
  const [marble, setMarble] = useState(false)
  const [added, setAdded] = useState(false)
  const [full, setFull] = useState(false)          // 验满了
  const [covered, setCovered] = useState(false)
  const [tried, setTried] = useState(false)        // 验满时木条照常燃烧（没集满）
  const T = useTasks('gewu:carbon:2', TASKS)
  const clock = useClock()                          // 加酸以后反应了几秒
  const load = useRun(3.2, () => setMarble(true))
  const pour = useRun(5, () => { setAdded(true); clock.start(); if (acid === 'hcl') T.check(id => id === 'make') })
  const test = useRun(4.4, () => { const ok = collected(acid, clock.t) >= 1; if (ok) { setFull(true); T.check(id => id === 'full') } else setTried(true) })
  const cover = useRun(1.6, () => { setCovered(true); T.check(id => id === 'cover') })
  const busy = load.busy || pour.busy || test.busy || cover.busy
  const t = added ? clock.t : 0
  const frac = collected(acid, t), rate = added ? genRate(acid, t) : 0
  const stalled = acid === 'h2so4' && added && rate < 0.06
  useEffect(() => { if (stalled) T.check(id => id === 'h2so4') }, [stalled])   // eslint-disable-line react-hooks/exhaustive-deps
  const fresh = () => { load.snap(0); pour.snap(0); test.snap(0); cover.snap(0); clock.stop(); setMarble(false); setAdded(false); setFull(false); setCovered(false); setTried(false) }
  const pick = (a: Acid) => { if (busy || a === acid) return; fresh(); setAcid(a) }
  const resetAll = () => { fresh(); setAcid('hcl'); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'main' | 'test' | 'cover' | 'acid' | null } = !task ? { hint: '实验室用大理石和稀盐酸制取二氧化碳，用向上排空气法收集，燃着的木条放在瓶口验满。', next: null }
    : load.busy ? { hint: '拔下塞子，把大理石放进锥形瓶，再塞紧…', next: null }
    : pour.busy ? { hint: `从长颈漏斗倒入${ACIDS[acid]}，液面没过漏斗下端…`, next: null }
    : test.busy ? { hint: '把燃着的木条放在集气瓶口…', next: null }
    : cover.busy ? { hint: '用玻璃片盖好集气瓶…', next: null }
    : task.id === 'h2so4' && acid !== 'h2so4' ? { hint: '换成稀硫酸，再做一次', next: 'acid' }
    : !marble ? { hint: '先往锥形瓶里装大理石', next: 'main' }
    : !added ? { hint: `从长颈漏斗加入${ACIDS[acid]}`, next: 'main' }
    : acid === 'h2so4' ? { hint: stalled ? '气泡越来越少，反应停下来了' : '看大理石表面的气泡…', next: null }
    : covered ? { hint: '', next: null }
    : full ? { hint: '木条熄灭，集满了。盖好玻璃片，正放在桌上', next: 'cover' }
    : tried ? { hint: '木条照常燃烧，还没集满。等一会儿再验', next: frac >= 1 ? 'test' : null }
    : frac < 1 ? { hint: '大理石表面冒出大量气泡，二氧化碳沿导管进入集气瓶…', next: null }
    : { hint: '把燃着的木条放在集气瓶口，检验是否集满', next: 'test' }

  // 装大理石：塞子连着长颈漏斗和导管一起提起来，石块落进瓶里，再塞回去
  const lift = load.busy ? u(0.07) * ease(seg(load.t, 0, 0.8)) * (1 - ease(seg(load.t, 2.3, 3.1))) : 0
  const drop = marble ? 1 : load.busy ? ease(seg(load.t, 1.0, 2.0)) : 0
  // 加酸：手拿着细口瓶到漏斗口上方，倾斜，倒，放回
  const home: V3 = [X0 + u(BOT[acid][0]), Y, Z + u(BOT[acid][1])]
  const pk = pour.busy ? seg(pour.t, 0, 1.2) - seg(pour.t, 3.9, 5) : 0
  const tilt = pour.busy ? ease(seg(pour.t, 1.1, 1.7)) * (1 - ease(seg(pour.t, 3.5, 4.0))) : 0
  const mouthAt: V3 = pour.busy ? liftPath([home[0], Y + u(0.124), home[2]], [FX - u(0.018), Y + u(CUP + 0.012), Z], Y + u(CUP + 0.06), Math.max(0, pk)) : [home[0], Y + u(0.124), home[2]]
  const level = added ? LEVEL : pour.busy ? LEVEL * seg(pour.t, 1.9, 3.6) : 0
  const stream = pour.busy && pour.t > 1.65 && pour.t < 3.7
  // 验满：手拿木条凑到瓶口
  const sHome: V3 = [JX + u(0.16), Y + u(0.004), JZ + u(0.06)]
  const sk = test.busy ? seg(test.t, 0, 1.3) - seg(test.t, 3.3, 4.4) : 0
  const sAt: V3 = test.busy ? liftPath(sHome, [JX + u(0.012), Y + u(JAR.h + 0.01), JZ], Y + u(JAR.h + 0.06), Math.max(0, sk)) : sHome
  const atMouth = test.busy && test.t > 1.3 && test.t < 3.3
  const willOut = collected(acid, clock.t) >= 1
  const flameLv = !test.busy ? 0 : willOut ? (test.t < 1.6 ? 1 : 1 - seg(test.t, 1.6, 2.2)) : 1
  // 玻璃片：收集时斜搭在瓶口一边，盖好时推到正中
  const plateX = covered ? 0 : cover.busy ? u(0.045) * (1 - ease(seg(cover.t, 0.2, 1.4))) : u(0.045)

  const tube: V3[] = useMemo(() => [
    [FX + u(0.006), Y + u(PLUG + 0.006), Z], [FX + u(0.006), Y + u(0.19), Z], [FX + u(0.02), Y + u(0.205), Z], [JX - u(0.02), Y + u(0.205), JZ], [JX, Y + u(0.19), JZ], [JX, Y + u(0.016), JZ],
  ], [])
  const labels: Label[] = [
    { id: 'jar', at: [JX + u(JAR.r + 0.01), Y + u(JAR.h * 0.55), JZ], ax: 0, className: `scene-tag ${frac >= 1 ? 'key' : ''} -translate-y-1/2`, children: <><small>集气瓶 · 示意</small>{Math.round(frac * 100)}%</> },
    ...(added && acid === 'hcl' ? [{ id: 'seal', at: [FX - u(0.03), Y + u(0.02), Z] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '漏斗下端浸在液面下' }] : []),
    ...(atMouth ? [{ id: 'f', at: [JX - u(0.03), Y + u(JAR.h + 0.06), JZ] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: willOut ? '木条熄灭' : '木条照常燃烧' }] : []),
    { id: 'n1', at: [FX, Y + u(CUP + 0.02), Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '长颈漏斗' },
    { id: 'n2', at: [FX - u(0.05), Y + u(0.07), Z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '锥形瓶' },
    { id: 'n3', at: [JX, Y - u(0.01), JZ + u(0.03)], ax: 0.5, name: true, className: 'scene-name', children: '集气瓶' },
    { id: 'n4', at: [X0 + u(BOT.marble[0]), Y + u(0.1), Z + u(BOT.marble[1])], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '大理石' },
    { id: 'n5', at: [X0 + u(BOT.hcl[0]), Y - u(0.008), Z + u(BOT.hcl[1])], ax: 0.5, name: true, className: 'scene-name', children: '稀盐酸' },
    { id: 'n6', at: [X0 + u(BOT.h2so4[0]), Y + u(0.15), Z + u(BOT.h2so4[1])], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '稀硫酸' },
  ]
  const bottle = (key: Acid) => <NarrowBottle label={ACIDS[key]} band={key === 'hcl' ? '#2f6fb3' : '#b3402f'} />
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="制取二氧化碳"
      stage={<Place at="l2" labels={labels}>
        {/* 锥形瓶、塞子上的长颈漏斗和导管（装大理石时一起提起） */}
        <group position={[FX, Y, Z]}>
          <Flask level={level} color="#dde8e9" opacity={0.36}>{(marble || load.busy) && <Marble drop={drop} />}</Flask>
        </group>
        <group position-y={lift}>
          <group position={[FX, Y + u(PLUG), Z]}><Stopper holes={[-0.005, 0.006]} /></group>
          <group position={[FX - u(0.005), Y + u(0.008), Z]}><LongFunnel len={FUN_LEN} /></group>
          <GlassTube pts={tube} />
        </group>
        {/* 反应：大理石表面冒气泡，升到液面；稀硫酸的气泡很快变少 */}
        <Bubbles at={[FX, Y + u(0.008), Z]} top={u(LEVEL - 0.008)} on={added && rate > 0.06} rate={70 * rate} r={u(0.0016)} spread={u(0.024)} speed={u(0.05)} seed={4} />
        {/* 集气瓶和积在瓶底的二氧化碳（示意） */}
        <group position={[JX, Y, JZ]}>
          <GasJar gas={frac}><group position-y={u(0.003)}><Haze r={u(JAR.r - 0.0025)} h={u(JAR.h - 0.014) * frac} opacity={0.42} /></group></GasJar>
          <group position={[plateX, u(JAR.h), 0]}><GlassPlate /></group>
        </group>
        {/* 试剂瓶：大理石、稀盐酸、稀硫酸；正在用的那瓶拿走 */}
        <group position={[X0 + u(BOT.marble[0]), Y, Z + u(BOT.marble[1])]}><JarBottle label="大理石" band="#6b6b6b" amount={0.6} solid={<Marble />} /></group>
        {(['hcl', 'h2so4'] as Acid[]).map(k => k === acid && pour.busy ? null : <group key={k} position={[X0 + u(BOT[k][0]), Y, Z + u(BOT[k][1])]}>{bottle(k)}</group>)}
        {pour.busy && <group position={mouthAt}>
          <group rotation-z={-tilt * 1.95}>
            <group position-y={-u(0.124)}>{bottle(acid)}</group>
          </group>
          {/* 手握着瓶身，手臂从左后方伸过来，不跟着瓶子转 */}
          <group position={[u(0.07) * Math.sin(-tilt * 1.95), -u(0.07) * Math.cos(-tilt * 1.95), -u(0.03)]} rotation={[0.5, 0, 0.75]}><Glove /></group>
        </group>}
        {stream && <mesh position={[mouthAt[0] + u(0.006), (mouthAt[1] + Y + u(CUP - 0.01)) / 2, Z]} renderOrder={8}><cylinderGeometry args={[u(0.0018), u(0.0024), Math.max(0.01, mouthAt[1] - Y - u(CUP - 0.01)), 8]} /><meshPhysicalMaterial color="#e8f2f3" transparent opacity={0.6} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>}
        {/* 燃着的木条 */}
        <group position={sAt} rotation-z={test.busy ? -1.15 : Math.PI / 2 - 0.08}>
          <Splint char={test.busy ? 0.8 : 0} />
          {test.busy && <group position={[0, u(0.11), 0]} rotation={[0.3, 0, 0.2]}><Glove s={u(0.0058)} /></group>}
        </group>
        <Flame at={[sAt[0] - u(0.003), sAt[1], sAt[2]]} w={u(0.014)} h={u(0.034)} kind="wood" level={flameLv} seed={3} light={0.8} />
        <Puffs at={[JX + u(0.012), Y + u(JAR.h + 0.02), JZ]} on={test.busy && willOut && test.t > 1.9 && test.t < 3.2} opt={SMOKE.wisp(u(0.03))} seed={5} />
      </Place>}
      lesson={<LessonBlock no="2" title="二氧化碳的制取" concept="大理石加稀盐酸，向上排空气法收集" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>实验室里用大理石（或石灰石，主要成分是碳酸钙）和稀盐酸反应制取二氧化碳：</p>
          <p className="mt-2 text-center font-formula text-[16px]">CaCO<sub>3</sub> + 2HCl = CaCl<sub>2</sub> + H<sub>2</sub>O + CO<sub>2</sub>↑</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>固体和液体在常温下反应，用锥形瓶和长颈漏斗；长颈漏斗的下端要伸到液面以下，防止气体从漏斗逸出</li>
            <li>二氧化碳能溶于水、密度比空气大，用<b className="text-white">向上排空气法</b>收集，导管伸到集气瓶底部</li>
            <li>验满：把燃着的木条放在<b className="text-white">集气瓶口</b>，木条熄灭，说明已集满</li>
            <li>检验：通入澄清石灰水，石灰水变浑浊，说明是二氧化碳（见第 4 课）</li>
          </ul>
          <p className="mt-3">不用稀硫酸：生成的硫酸钙微溶于水，覆盖在大理石表面，阻止反应继续进行。也不用碳酸钠粉末：反应太快，不便收集。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种酸都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">大理石加稀盐酸制二氧化碳，向上排空气法收集</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">燃着的木条放在瓶口熄灭，说明已集满。稀硫酸和大理石的反应很快就停下了，不能用来制取二氧化碳。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">集气瓶里的二氧化碳（示意）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{added ? Math.round(frac * 100) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[12.5px] text-white/55"><span>冒气泡的快慢</span><span>{ACIDS[acid]}</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7fe3d4] transition-[width] duration-300" style={{ width: `${Math.round(rate * 100)}%` }} /></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="m(CaCO₃)" value={MARBLE.toFixed(1)} unit="g · 大理石里的碳酸钙" />
            <ParamTile symbol="m(CO₂)" value={co2FromCaCO3(MARBLE).toFixed(1)} unit="g · 完全反应生成" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'main'} pulse={next === 'main'} onClick={() => (!marble ? load.run() : pour.run())} disabled={busy || added}>{!marble ? '装入大理石' : `加入${ACIDS[acid]}`}</LabButton>
        <LabButton primary={next === 'test'} pulse={next === 'test'} onClick={() => test.run()} disabled={busy || !added || acid !== 'hcl' || full}>验满</LabButton>
        <LabButton primary={next === 'cover'} pulse={next === 'cover'} onClick={() => cover.run()} disabled={busy || !full || covered}>盖好玻璃片</LabButton>
      </>}
      extras={
        <Control label="酸">
          <Segmented label="酸" pulse={next === 'acid'} want={task?.id === 'h2so4' ? 'h2so4' : 'hcl'} value={acid} disabled={busy} onChange={k => pick(k as Acid)} options={(['hcl', 'h2so4'] as Acid[]).map(k => ({ value: k, label: ACIDS[k] }))} />
        </Control>
      }
    />
  )
}
