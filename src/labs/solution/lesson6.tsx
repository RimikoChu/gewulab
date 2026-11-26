// 溶液 · 第 6 课 结晶：化验台第 5 格。左边铁三脚架上架着瓷蒸发皿，盛着氯化钠溶液，下面是酒精灯；右边一只冷水槽，旁边一杯 60 ℃ 的硝酸钾饱和溶液。
// 先加热蒸发：水越来越少，晶体在皿里析出（蒸发结晶）；再把热的硝酸钾溶液放进冷水里，针状晶体一根根长出来（降温结晶）；最后出门到结晶池，看卤水晒出盐。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, BEAKER, Basin, Beaker, ClayTriangle, DISH, EvapDish, GlassRod, Glove, LAMP_TOP, TRIPOD, Thermometer, Tripod } from './gear'
import { Crystals, Flame, Steam } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { L6, cooled, evapStart, g1, solubility } from './physics'
import { BZ, M, POND, ST, TOP, Place } from './world'

const X0 = ST.l6, Y = TOP, Z = BZ + 0.15
const STAND: P3 = [X0 - 0.17 * M, Y, Z], DISH_Y = Y + (TRIPOD.h - 0.004) * M
const BAS: P3 = [X0 + 0.2 * M, Y, Z - 0.02 * M], CUP0: P3 = [X0 + 0.07 * M, Y, Z + 0.02 * M], CUP1: P3 = [BAS[0], Y + 0.004 * M, BAS[2]]
const RB = BEAKER[250].r * M, KLV = 0.042                                    // 硝酸钾溶液的液面高度（m）
const RS = (DISH.R ** 2 + DISH.h ** 2) / (2 * DISH.h)                         // 蒸发皿内壁那个球的半径（m）
/** 皿里 v mL 液体的深度（m）：球冠体积 πd²(3R − d)/3，二分法求 d */
function depth(v: number) { let lo = 0, hi = DISH.h; for (let i = 0; i < 30; i++) { const d = (lo + hi) / 2; if (Math.PI * d * d * (3 * RS - d) / 3 < v * 1e-6) lo = d; else hi = d } return lo }
const EVAP = 9, END_WATER = 3, COOL = 8, SUN = 10, FLY = 2.4
const START = evapStart(L6.salt, L6.boil), OUT = cooled('KNO3', L6.kWater, L6.hi, L6.lo)
const TASKS: Task[] = [
  { id: 'evap', text: '加热蒸发皿里的氯化钠溶液', note: `水剩约 ${g1(START)} g 时开始有晶体析出：这是蒸发结晶` },
  { id: 'cool', text: '把 60 ℃ 的硝酸钾饱和溶液放进冷水里', note: `降到 20 ℃，析出约 ${g1(OUT)} g 硝酸钾晶体：这是降温结晶` },
  { id: 'pond', text: '到结晶池看看卤水晒盐', note: '风吹日晒，水分蒸发，氯化钠从饱和的卤水里析出来' },
]

export default function Lesson6() {
  const [evapd, setEvapd] = useState(false)
  const [cool, setCool] = useState(false)
  const [sun, setSun] = useState(false)
  const T = useTasks('gewu:solution:6', TASKS)
  const ev = useRun(EVAP, () => { setEvapd(true); T.check(id => id === 'evap') })
  const co = useRun(COOL, () => { setCool(true); T.check(id => id === 'cool') })
  const so = useRun(SUN, () => { setSun(true); T.check(id => id === 'pond') })
  const busy = ev.busy || co.busy || so.busy
  const resetAll = () => { ev.snap(0); co.snap(0); so.snap(0); setEvapd(false); setCool(false); setSun(false); T.reset() }

  // 蒸发：水从 25 g 蒸到 3 g；容得下的盐 = 水 × S ÷ 100，多出来的析出
  const ek = ev.busy ? ease(seg(ev.t, 0.8, EVAP - 0.6)) : evapd ? 1 : 0
  const water = L6.water - (L6.water - END_WATER) * ek
  const salt = Math.max(0, L6.salt - water * solubility('NaCl', L6.boil) / 100)
  const flame = ev.busy ? ease(seg(ev.t, 0, 0.5)) * (1 - ease(seg(ev.t, EVAP - 0.5, EVAP))) : 0
  const d = depth(water + L6.salt * 0.4), r = Math.sqrt(Math.max(0, 2 * RS * d - d * d))
  // 降温：先把烧杯提进冷水槽，再慢慢降温；析出的 = 100 g 水 × (S高 − S现在) ÷ 100
  const move = co.busy ? seg(co.t, 0, 1.6) : cool ? 1 : 0
  const cup: P3 = co.busy || cool ? liftPath(CUP0, CUP1, Y + 0.14 * M, move) : CUP0
  const temp = co.busy ? L6.hi - (L6.hi - L6.lo) * ease(seg(co.t, 1.6, COOL - 0.4)) : cool ? L6.lo : L6.hi
  const out = cooled('KNO3', L6.kWater, L6.hi, temp)
  // 晒盐：镜头飞到结晶池，再晒几天
  const atPond = so.busy || sun
  const crust = so.busy ? ease(seg(so.t, FLY, SUN - 0.3)) : sun ? 1 : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'evap' | 'cool' | 'sun' | null } = !task ? { hint: '蒸发溶剂或降低温度，溶质就以晶体的形式析出来。', next: null }
    : ev.busy ? { hint: water > START ? '加热，用玻璃棒不断搅拌，水越来越少…' : '有晶体析出来了。出现较多固体时停止加热…', next: null }
    : co.busy ? { hint: move < 1 ? '把烧杯放进冷水槽…' : '温度慢慢降下来，看杯里…', next: null }
    : so.busy ? { hint: crust <= 0 ? '去盐场的结晶池…' : '风吹日晒，卤水里的水分不断蒸发…', next: null }
    : task.id === 'evap' ? { hint: '点燃酒精灯，加热蒸发皿里的氯化钠溶液', next: 'evap' }
    : task.id === 'cool' ? { hint: '把 60 ℃ 的硝酸钾饱和溶液放进冷水里', next: 'cool' }
    : { hint: '到盐场的结晶池，看看卤水怎样晒出盐', next: 'sun' }

  const ang = performance.now() / 1000 * 8
  const rodAt: P3 = ev.busy && flame > 0.5 ? [STAND[0] + Math.cos(ang) * r * M * 0.4, DISH_Y + 0.006 * M, STAND[2] + Math.sin(ang) * r * M * 0.3] : [X0 - 0.03 * M, Y + 0.004 * M, Z + 0.1 * M]
  const PX = (POND.x0 + POND.x1) / 2, PZ = POND.z1
  const labels: Label[] = atPond ? [
    { id: 'p1', at: [PX - 6, POND.brine + 0.3, PZ], ax: 1, className: 'scene-tag -translate-y-full', children: <><small>结晶池</small>{crust > 0.5 ? '盐析出来了' : '饱和卤水'}</> },
    { id: 'p2', at: [PX - 1, POND.floor + 0.05 + crust * 0.25, PZ + 0.2], ax: 1, className: `scene-tag ${crust > 0.3 ? 'key' : ''} -translate-y-1/2`, children: <><small>析出的盐</small>{crust > 0.05 ? '越来越厚' : '—'}</> },
    
  ] : [
    { id: 'e', at: [STAND[0] + 0.065 * M, DISH_Y + 0.02 * M, STAND[2]], ax: 0, className: `scene-tag ${evapd ? 'key' : ''} -translate-y-1/2`, children: <><small>蒸发皿 · 水</small>{`${g1(water)} g`}{salt > 0.02 ? ` · 析出 ${g1(salt)} g` : ''}</> },
    { id: 'c', at: [BAS[0], Y + 0.2 * M, BAS[2]], ax: 0.5, className: `scene-tag ${cool ? 'key' : ''} -translate-y-full`, children: <><small>硝酸钾溶液</small>{`${Math.round(temp)} ℃`}{out > 0.05 ? ` · 析出 ${g1(out)} g` : ''}</> },
    { id: 'n1', at: [BAS[0] + 0.1 * M, Y + 0.03 * M, BAS[2] + 0.11 * M], ax: 0.5, name: true, className: 'scene-name', children: '冷水槽' },
  ]
  const dishLiquid = '#d4e9ee'
  return (
    <LabShell title="溶液" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="结晶"
      stage={<Place at={atPond ? 'l6p' : ev.busy || !evapd ? 'l6a' : 'l6b'} labels={labels} crust={crust}>
        {/* 蒸发：三脚架、泥三角、蒸发皿、酒精灯 */}
        <group position={STAND}><Tripod net={false} /></group>
        <group position={[STAND[0], Y + TRIPOD.h * M - 0.004 * M, STAND[2]]}><ClayTriangle /></group>
        <group position={[STAND[0], DISH_Y, STAND[2]]}>
          <EvapDish>
            {d > 0.0004 && <>
              <mesh position-y={RS * M} renderOrder={5}><sphereGeometry args={[RS * M * 0.985, 40, 16, 0, Math.PI * 2, Math.PI - Math.acos((RS - d) / RS), Math.acos((RS - d) / RS)]} /><meshPhysicalMaterial color={dishLiquid} transparent opacity={0.45} roughness={0.05} clearcoat={0.8} depthWrite={false} side={2} /></mesh>
              <mesh position-y={d * M} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r * M * 0.985, 40]} /><meshPhysicalMaterial color={dishLiquid} transparent opacity={0.6} roughness={0.04} clearcoat={1} depthWrite={false} /></mesh>
            </>}
            <Crystals at={[0, 0.002 * M, 0]} R={Math.max(r, 0.022) * M * 0.85} amount={salt / L6.salt} size={0.0024 * M} n={110} seed={12} heap={0.35} />
          </EvapDish>
        </group>
        <group position={STAND}><AlcoholLamp /></group>
        <Flame at={[STAND[0], Y + LAMP_TOP * M, STAND[2]]} w={0.026 * M} h={0.05 * M} level={flame} />
        <Steam at={[STAND[0], DISH_Y + d * M + 0.004 * M, STAND[2]]} on={ev.busy && flame > 0.6} s={0.05 * M} rate={9} jitter={0.015 * M} opacity={0.4} />
        <group position={rodAt} rotation={ev.busy && flame > 0.5 ? [Math.sin(ang) * 0.3, 0, -Math.cos(ang) * 0.3 - 0.3] : [0, 0.3, Math.PI / 2 - 0.02]}><GlassRod len={0.18} />
          {ev.busy && flame > 0.5 && <group position={[0, 0.14 * M, 0]} rotation={[-0.45, 0, 0]}><Glove /></group>}
        </group>
        {/* 降温：冷水槽、60 ℃ 的硝酸钾饱和溶液 */}
        <group position={BAS}><Basin /></group>
        <group position={cup}>
          <Beaker vol={250} level={KLV} color="#cfe6ec" opacity={0.3}>
            <Crystals at={[0, 0, 0]} R={RB * 0.8} amount={out / OUT} size={0.0028 * M} shape="needle" n={150} seed={21} wall={KLV * M * 0.5} heap={0.8} />
            <group position={[0.01 * M, 0.002 * M, -0.008 * M]} rotation={[0.14, 0, -0.14]}><Thermometer temp={temp} /></group>
          </Beaker>
          {co.busy && move < 1 && <group position={[0.05 * M, 0.06 * M, -0.02 * M]} rotation={[-0.5, 0, -0.9]}><Glove /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="6" title="结晶" concept="蒸发水或降低温度，晶体就析出来" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>溶质从溶液中以晶体的形式析出，叫做<b className="text-white">结晶</b>。</p>
          <p className="mt-3"><b className="text-white">蒸发结晶</b>：蒸发溶剂，适用于溶解度受温度影响较小的物质，如氯化钠。蒸发时用玻璃棒不断搅拌，防止局部温度过高造成液滴飞溅；出现较多固体时停止加热，用余热蒸干。</p>
          <p className="mt-3"><b className="text-white">降温结晶</b>：冷却热的饱和溶液，适用于溶解度受温度影响较大的物质，如硝酸钾。</p>
          <p className="mt-3">海水、盐湖卤水晒盐，靠的就是风吹日晒蒸发水分，使氯化钠结晶析出。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种结晶都看到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">氯化钠用蒸发结晶，硝酸钾用降温结晶</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">60 ℃ 的硝酸钾饱和溶液（100 g 水）降到 20 ℃，析出约 {g1(OUT)} g；盐场晒盐是蒸发结晶。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">蒸发结晶 · 5 g 氯化钠</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="水" value={g1(water)} unit={`g · 剩约 ${g1(START)} g 时开始析出`} />
            <ParamTile symbol="析出" value={g1(salt)} unit="g · 氯化钠" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">降温结晶 · 100 g 水的硝酸钾饱和溶液</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={`${Math.round(temp)}`} unit="℃ · 从 60 ℃ 降到 20 ℃" />
            <ParamTile symbol="析出" value={g1(out)} unit="g · 硝酸钾" />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55 tabular-nums">析出 = {solubility('KNO3', 60).toFixed(0)} g − {g1(solubility('KNO3', 20))} g = {g1(OUT)} g</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'evap'} pulse={next === 'evap'} onClick={() => { if (busy || evapd) return; ev.run() }} disabled={busy || evapd}>加热蒸发</LabButton>
        <LabButton primary={next === 'cool'} pulse={next === 'cool'} onClick={() => { if (busy || cool) return; co.run() }} disabled={busy || cool}>放进冷水</LabButton>
        <LabButton primary={next === 'sun'} pulse={next === 'sun'} onClick={() => { if (busy || sun) return; so.run() }} disabled={busy || sun}>去盐田晒盐</LabButton>
      </>}
      extras={null}
    />
  )
}
