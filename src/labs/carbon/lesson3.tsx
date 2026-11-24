// 碳和二氧化碳 · 第 3 课 二氧化碳的性质：化验台第 3 格。左边一只大烧杯，里面一道铁皮阶梯，高低两级上各点着一支蜡烛；
// 把一瓶二氧化碳沿烧杯壁慢慢倒进去，二氧化碳先积在杯底，下层的蜡烛先熄灭，上层的后熄灭。
// 右边一只装满二氧化碳的软塑料瓶，倒进约三分之一瓶水，拧紧瓶盖振荡，瓶子变瘪。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, Candle, GasJar, GlassPlate, Glove, JAR, SoftBottle } from './gear'
import { Flame, GasStream, Haze, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, liftPath, seg, useRun } from './parts'
import { BOTTLE, CANDLE_AT, DENSITY, POUR_SEC, beakerCO2, candleOut, squeeze } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l3, Y = TOP, Z = BZ + 0.1
const u = (v: number) => v * M
const BK = BEAKER[1000], BX = X0 + u(-0.13)                // 大烧杯
const JHOME: V3 = [X0 + u(0.005), Y, Z + u(0.02)]           // 集气瓶
const PX = X0 + u(0.13), WX = X0 + u(0.225)                  // 软塑料瓶、一杯水
/** 两级台阶的高度（m）、蜡烛的高、各自火焰的底部 */
const STEP = [0.004, 0.05] as const
const CH = [CANDLE_AT[0] * BK.h - STEP[0] - 0.008, CANDLE_AT[1] * BK.h - STEP[1] - 0.008]
const POUR_RUN = 1.7 + POUR_SEC + 1.6
const TASKS: Task[] = [
  { id: 'pour', text: '把二氧化碳沿烧杯壁倒进去', note: '下层的蜡烛先熄灭，上层的后熄灭：密度比空气大，不能燃烧，也不支持燃烧' },
  { id: 'water', text: '往软塑料瓶里倒约三分之一瓶水，拧紧瓶盖', note: '瓶里装满了二氧化碳，现在加了 170 mL 水' },
  { id: 'shake', text: '振荡塑料瓶', note: '瓶子变瘪了：二氧化碳能溶于水，瓶里的气体变少' },
]

/** 铁皮阶梯：一条折成两级台阶的铁皮，立在烧杯底。原点在杯底正中 */
function Steps() {
  const g = useMemo(() => {
    const s = new THREE.Shape(), w = u(0.036)
    s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, u(STEP[1])); s.lineTo(0, u(STEP[1])); s.lineTo(0, u(STEP[0])); s.lineTo(-w, u(STEP[0])); s.closePath()
    const e = new THREE.ExtrudeGeometry(s, { depth: u(0.03), bevelEnabled: true, bevelSize: u(0.0006), bevelThickness: u(0.0006), bevelSegments: 1 }); e.translate(0, 0, -u(0.015))
    return e
  }, [])
  return <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial color="#8f9396" metalness={0.75} roughness={0.38} /></mesh>
}

export default function Lesson3() {
  const [poured, setPoured] = useState(false)
  const [filled, setFilled] = useState(false)
  const [shook, setShook] = useState(false)
  const T = useTasks('gewu:carbon:3', TASKS)
  const pour = useRun(POUR_RUN, () => { setPoured(true); T.check(id => id === 'pour') })
  const water = useRun(5.2, () => { setFilled(true); T.check(id => id === 'water') })
  const shake = useRun(4.2, () => { setShook(true); T.check(id => id === 'shake') })
  const busy = pour.busy || water.busy || shake.busy
  const resetAll = () => { pour.snap(0); water.snap(0); shake.snap(0); setPoured(false); setFilled(false); setShook(false); T.reset() }

  // 倒二氧化碳：拿起集气瓶，凑到烧杯口，慢慢倾斜
  const ct = poured ? 99 : pour.busy ? pour.t - 1.7 : -1          // 二氧化碳开始流进烧杯后的秒数
  const level = beakerCO2(ct)
  const out = [candleOut(0, ct), candleOut(1, ct)]
  const fade = (i: 0 | 1) => { if (!out[i]) return 1; const t0 = [0, 0.2, 0.4, 0.6, 0.8, 1].map(k => k * POUR_SEC * 1.2).find(x => candleOut(i, x)) ?? 0; return Math.max(0, 1 - (ct - t0) / 0.5) }
  const pk = pour.busy ? seg(pour.t, 0, 1.2) - seg(pour.t, POUR_RUN - 1.2, POUR_RUN) : 0
  const tilt = pour.busy ? ease(seg(pour.t, 1.0, 1.8)) * (1 - ease(seg(pour.t, POUR_RUN - 1.6, POUR_RUN - 1.0))) : 0
  const lip: V3 = [BX + u(BK.r + 0.012), Y + u(BK.h + 0.012), Z]
  const jarMouth: V3 = pour.busy ? liftPath([JHOME[0], Y + u(JAR.h), JHOME[2]], lip, Y + u(BK.h + 0.08), Math.max(0, pk)) : [JHOME[0], Y + u(JAR.h), JHOME[2]]
  const flowing = pour.busy && ct > 0 && ct < POUR_SEC
  const jarGas = poured ? 0.1 : pour.busy ? 1 - 0.9 * seg(ct, 0, POUR_SEC) : 1

  // 加水：拿起烧杯，往瓶里倒，放回；再拧上瓶盖
  const wt = water.t, wk = water.busy ? seg(wt, 0, 1.0) - seg(wt, 3.0, 4.0) : 0
  const wTilt = water.busy ? ease(seg(wt, 0.9, 1.4)) * (1 - ease(seg(wt, 2.6, 3.0))) : 0
  const beakerAt: V3 = water.busy ? liftPath([WX, Y, Z], [PX + u(0.045), Y + u(0.19), Z], Y + u(0.22), Math.max(0, wk)) : [WX, Y, Z]
  const wFill = filled ? 1 : water.busy ? seg(wt, 1.3, 2.8) : 0
  const capOn = filled || (water.busy && wt > 4.6)
  const capAt: V3 = capOn ? [PX, Y + u(0.188), Z] : water.busy && wt > 4.0 ? liftPath([PX + u(0.08), Y + u(0.008), Z + u(0.05)], [PX, Y + u(0.188), Z], Y + u(0.25), seg(wt, 4.0, 4.6)) : [PX + u(0.08), Y + u(0.008), Z + u(0.05)]
  // 振荡：左右晃，晃着晃着瘪下去
  const sq = squeeze(BOTTLE.V, BOTTLE.water)
  const k = shook ? sq.k : shake.busy ? lerp(1, sq.k, ease(seg(shake.t, 0.8, 3.6))) : 1
  const wob = shake.busy ? Math.sin(shake.t * 18) * 0.28 * (1 - seg(shake.t, 3.0, 4.0)) : 0
  const gasNow = Math.round(lerp(sq.gas, sq.left, (1 - k) / (1 - sq.k)))

  const task = T.current
  const { hint, next }: { hint: string; next: 'pour' | 'water' | 'shake' | null } = !task ? { hint: '二氧化碳密度比空气大，不能燃烧，也不支持燃烧，能溶于水。', next: null }
    : pour.busy ? { hint: '沿烧杯壁慢慢倒，看两支蜡烛…', next: null }
    : water.busy ? { hint: '倒进约三分之一瓶水，拧紧瓶盖…', next: null }
    : shake.busy ? { hint: '用力振荡，看塑料瓶…', next: null }
    : !poured ? { hint: '集气瓶里是二氧化碳。把它沿烧杯壁慢慢倒进去', next: 'pour' }
    : !filled ? { hint: '软塑料瓶里装满了二氧化碳。往瓶里倒约三分之一瓶水，拧紧瓶盖', next: 'water' }
    : { hint: '振荡塑料瓶', next: 'shake' }

  const labels: Label[] = [
    { id: 'c0', at: [BX - u(0.07), Y + u(CANDLE_AT[0] * BK.h), Z], ax: 1, className: `scene-tag ${out[0] ? 'key' : ''} -translate-y-1/2`, children: <><small>下层</small>{out[0] ? '熄灭' : '燃烧'}</> },
    { id: 'c1', at: [BX - u(0.07), Y + u(CANDLE_AT[1] * BK.h), Z], ax: 1, className: `scene-tag ${out[1] ? 'key' : ''} -translate-y-1/2`, children: <><small>上层</small>{out[1] ? '熄灭' : '燃烧'}</> },
    { id: 'b', at: [PX, Y + u(0.23), Z], ax: 0.5, className: `scene-tag ${shook ? 'key' : ''} -translate-y-full`, children: <><small>瓶里的气体 · 示意</small>{filled || shake.busy ? gasNow : BOTTLE.V} mL</> },
    ...(flowing ? [{ id: 'g', at: [BX + u(0.02), Y + u(BK.h * 0.5), Z + u(0.06)] as V3, ax: 0.5, className: 'scene-name -translate-y-1/2', children: '二氧化碳（示意）' }] : []),
    { id: 'n1', at: [JHOME[0], Y - u(0.006), JHOME[2] + u(0.03)], ax: 0.5, name: true, className: 'scene-name', children: '一瓶二氧化碳' },
    { id: 'n2', at: [PX, Y - u(0.006), Z + u(0.04)], ax: 0.5, name: true, className: 'scene-name', children: '软塑料瓶' },
    { id: 'n3', at: [BX, Y - u(0.006), Z + u(0.06)], ax: 0.5, name: true, className: 'scene-name', children: '阶梯蜡烛' },
  ]
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="二氧化碳的性质"
      stage={<Place at="l3" labels={labels}>
        {/* 大烧杯、阶梯、两支蜡烛；杯底积起来的二氧化碳 */}
        <group position={[BX, Y, Z]}>
          <Beaker vol={1000} marks={false} />
          <group position-y={u(0.002)}><Steps /></group>
          <group position={[-u(0.018), u(0.002 + STEP[0]), 0]}><Candle h={CH[0]} lit={!out[0]} /></group>
          <group position={[u(0.018), u(0.002 + STEP[1]), 0]}><Candle h={CH[1]} lit={!out[1]} /></group>
          <group position-y={u(0.002)}><Haze r={u(BK.r - 0.003)} h={u(BK.h - 0.006) * level} opacity={0.4} /></group>
        </group>
        <Flame at={[BX - u(0.018), Y + u(0.002 + STEP[0] + CH[0] + 0.006), Z]} w={u(0.01)} h={u(0.03)} kind="candle" level={fade(0)} seed={1} light={0.7} />
        <Flame at={[BX + u(0.018), Y + u(0.002 + STEP[1] + CH[1] + 0.006), Z]} w={u(0.01)} h={u(0.03)} kind="candle" level={fade(1)} seed={2} light={0.7} />
        <Puffs at={[BX - u(0.018), Y + u(CANDLE_AT[0] * BK.h + 0.01), Z]} on={out[0] && fade(0) > 0 && fade(0) < 1} opt={SMOKE.wisp(u(0.02))} seed={3} />
        <Puffs at={[BX + u(0.018), Y + u(CANDLE_AT[1] * BK.h + 0.01), Z]} on={out[1] && fade(1) > 0 && fade(1) < 1} opt={SMOKE.wisp(u(0.02))} seed={4} />
        {/* 集气瓶：拿起来，凑到烧杯口，倾斜；玻璃片推开一道缝 */}
        <group position={jarMouth}>
          <group rotation-z={tilt * 1.85}>
            <group position-y={-u(JAR.h)}>
              <GasJar gas={jarGas}><group position-y={u(0.003)}><Haze r={u(JAR.r - 0.0025)} h={u(JAR.h - 0.014) * jarGas} opacity={0.4} /></group></GasJar>
            </group>
            <group position-x={pour.busy ? -u(0.03) * ease(seg(pour.t, 1.0, 1.6)) : 0}><GlassPlate /></group>
          </group>
          {pour.busy && pk > 0 && <group position={[u(0.06) * Math.sin(tilt * 1.85), -u(0.07) * Math.cos(tilt * 1.85), -u(0.03)]} rotation={[0.5, 0, -0.6]}><Glove /></group>}
        </group>
        <GasStream top={[lip[0] - u(0.006), lip[1] - u(0.004), Z]} bottom={[BX + u(BK.r - 0.016), Y + u(Math.max(0.01, BK.h * level)), Z]} r={u(0.012)} on={flowing} />
        <Puffs at={[lip[0] - u(0.012), lip[1] - u(0.01), Z]} on={flowing} opt={{ rate: 16, life: 1.4, size: [u(0.012), u(0.03)], speed: u(0.05), dir: [-0.3, -1, 0], spread: 0.15, color: '#f2f6f7', opacity: 0.32, accel: [0, -u(0.06), 0], drag: 0.6 }} seed={6} />
        {/* 软塑料瓶、瓶盖、一杯水 */}
        <group position={[PX, Y, Z]} rotation-z={wob}>
          <SoftBottle k={k} cap={capOn} fill={wFill * BOTTLE.water / BOTTLE.V} color="#dbe9ec" />
        </group>
        {!capOn && <group position={capAt}>
          <mesh castShadow><cylinderGeometry args={[u(0.0148), u(0.0148), u(0.016), 32]} /><meshPhysicalMaterial color="#2f7fc6" roughness={0.4} clearcoat={0.4} /></mesh>
        </group>}
        <group position={beakerAt}>
          <group position={[-u(BEAKER[250].r), u(BEAKER[250].h), 0]} rotation-z={wTilt * 1.7}>
            <group position={[u(BEAKER[250].r), -u(BEAKER[250].h), 0]}><Beaker vol={250} fill={filled ? 0.08 : lerp(0.75, 0.08, wFill)} color="#cfe4ea" opacity={0.42} /></group>
          </group>
          {water.busy && wk > 0 && <group position={[u(0.06), u(0.05), -u(0.02)]} rotation={[0.4, 0, -0.5]}><Glove /></group>}
        </group>
        {water.busy && wt > 1.35 && wt < 2.8 && <mesh position={[PX + u(0.005), Y + u(0.2), Z]} renderOrder={8}><cylinderGeometry args={[u(0.0025), u(0.003), u(0.06), 8]} /><meshPhysicalMaterial color="#d6eaf0" transparent opacity={0.6} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>}
        {shake.busy && shake.t < 3.2 && <group position={[PX + u(0.03), Y + u(0.12), Z + u(0.02)]} rotation={[0.3, 0, -0.4 + wob]}><Glove /></group>}
      </Place>}
      lesson={<LessonBlock no="3" title="二氧化碳的性质" concept="比空气重、不助燃、能溶于水" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>二氧化碳的<b className="text-white">密度比空气大</b>：倒进烧杯，先积在杯底，下层的蜡烛先熄灭</li>
            <li>二氧化碳<b className="text-white">不能燃烧，也不支持燃烧</b>：蜡烛被它“淹没”就熄灭了，所以二氧化碳可以用来灭火</li>
            <li>二氧化碳<b className="text-white">能溶于水</b>：通常状况下，1 体积水约能溶解 1 体积二氧化碳。振荡后瓶里的气体变少，外面的大气把瓶子压瘪</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">二氧化碳本来是无色的，画面里把它画成一层淡淡的灰白，只是为了看清它积到多高。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">二氧化碳比空气重、不助燃、能溶于水</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">下层的蜡烛先熄灭，上层的后熄灭；软塑料瓶里的气体从 {sq.gas} mL 减到约 {sq.left} mL，瓶子被压瘪。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">密度（标准状况）</h2>
          {([['二氧化碳', DENSITY.co2], ['空气', DENSITY.air]] as [string, number][]).map(([n, d]) => <div key={n} className="mt-2">
            <div className="flex justify-between text-[13.5px]"><span>{n}</span><span className="tabular-nums">{d.toFixed(3)} g/L</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7fe3d4]" style={{ width: `${d / 2.2 * 100}%` }} /></div>
          </div>)}
          <h2 className="mt-5 text-[12.5px] text-white/55">软塑料瓶</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="V" value={String(BOTTLE.V)} unit="mL · 瓶的容积" />
            <ParamTile symbol="V(水)" value={filled || water.busy ? String(BOTTLE.water) : '0'} unit="mL · 加进去的水" />
          </div>
          <div className="mt-3 text-center">
            <div className="text-[13px] text-white/60">瓶里的二氧化碳气体（示意）</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{filled || shake.busy ? gasNow : BOTTLE.V}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'pour'} pulse={next === 'pour'} onClick={() => pour.run()} disabled={busy || poured}>倾倒二氧化碳</LabButton>
        <LabButton primary={next === 'water'} pulse={next === 'water'} onClick={() => water.run()} disabled={busy || filled}>加水、拧紧</LabButton>
        <LabButton primary={next === 'shake'} pulse={next === 'shake'} onClick={() => shake.run()} disabled={busy || !filled || shook}>振荡</LabButton>
      </>}
      extras={null}
    />
  )
}
