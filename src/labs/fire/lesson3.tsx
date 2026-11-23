// 燃烧和灭火 · 第 3 课 温度要达到着火点（样板课）：实验台第 3 格的通风橱里，一只 500 mL 的烧杯，杯底用纸圈圈着一小块白磷；
// 往杯里倒水，盖上一片铜片，铜片一头放白磷、一头放红磷。冷水时都不燃烧；热水时铜片上的白磷燃烧、红磷不燃烧、水里的白磷也不燃烧；
// 再向水里的白磷通入氧气，它燃烧了。白磷有毒，燃烧生成的白烟被通风橱抽走。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { BEAKER, Beaker, CopperPlate, FumeHood, Glove, Hose, PLATE, RedP, Thermometer, WhiteP } from './gear'
import { Flame, Puffs, SMOKE } from './fx'
import { ease, lerp, liftPath, seg, useClock, useRun } from './parts'
import { IGNITE, ROOM, WATER, plate, plateTemp, round, type WaterKey } from './physics'
import { BENCH, BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l3, Y = TOP, Z = BZ + 0.2
const R = BEAKER[500].r * M, H = BEAKER[500].h * M, FILL = 0.78
/** 铜片放上去以后，铜片上的两样东西（相对铜片中心，m） */
const WP_X = -0.05, RP_X = 0.05, UNDER: V3 = [0.014 * M, 0, 0.008 * M]
/** 动作的时间（s）：倒水的烧杯拿过来、倒、放回；铜片盖上去 */
const T_POUR = [0, 1.2, 3.0, 4.0] as const, T_PLATE = [4.0, 5.4] as const, TOTAL = 5.6
const TASKS: Task[] = [
  { id: 'cold', text: '倒入冷水（20 °C），盖上铜片', note: '铜片约 20 °C，没到白磷的着火点 40 °C：白磷、红磷都不燃烧' },
  { id: 'hot', text: '换成热水（80 °C），再做一次', note: '铜片上的白磷燃烧，红磷不燃烧；水里的白磷也不燃烧' },
  { id: 'o2', text: '向水里的白磷通入氧气', note: '水里的白磷燃烧了：温度达到着火点，又有了氧气' },
]
const KEYS: WaterKey[] = ['cold', 'hot']

export default function Lesson3() {
  const [water, setWater] = useState<WaterKey>('cold')
  const [ready, setReady] = useState(false)        // 水倒好、铜片盖上了
  const [o2, setO2] = useState(false)
  const T = useTasks('gewu:fire:3', TASKS)
  const setup = useRun(TOTAL, () => { setReady(true); since.start() })
  const since = useClock()                          // 铜片盖上以后过了多久
  const tube = useRun(1.6, () => { setO2(true); bub.start() })
  const bub = useClock()                            // 开始通氧以后过了多久
  const wt = WATER[water].temp
  const pt = ready ? plateTemp(wt, since.t) : ROOM
  const s = plate(pt, ready ? wt : ROOM, o2)
  // 白磷着了以后烧大约 9 秒就烧完了
  const [litAt, setLitAt] = useState<number | null>(null), [underAt, setUnderAt] = useState<number | null>(null)
  useEffect(() => { if (ready && s.white.burn && litAt === null) setLitAt(since.t) }, [ready, s.white.burn, since.t, litAt])
  useEffect(() => { if (o2 && s.under.burn && underAt === null && bub.t > 0.8) setUnderAt(bub.t) }, [o2, s.under.burn, bub.t, underAt])
  const burnLeft = (t0: number | null, now: number) => t0 === null ? 0 : 1 - seg(now - t0, 8, 10)
  const wLevel = burnLeft(litAt, since.t), uLevel = burnLeft(underAt, bub.t)
  // 任务判定：铜片盖上 3 秒以后看结果
  useEffect(() => {
    if (!ready || since.t < 3) return
    if (water === 'cold') T.check(id => id === 'cold'); else T.check(id => id === 'hot')
  }, [ready, since.t > 3])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (underAt !== null && bub.t - underAt > 1.5) T.check(id => id === 'o2') }, [bub.t > (underAt ?? 1e9) + 1.5])   // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => { setup.snap(0); tube.snap(0); since.stop(); bub.stop(); setReady(false); setO2(false); setLitAt(null); setUnderAt(null) }
  const pick = (k: WaterKey) => { if (setup.busy || tube.busy) return; clear(); setWater(k) }
  const resetAll = () => { clear(); setWater('cold'); T.reset() }

  // 倒水：一只盛水的大烧杯被拿过来、倾斜着倒、再放回去；杯里的水慢慢升高
  const t = setup.t
  const fill = ready ? FILL : FILL * ease(seg(t, T_POUR[1] + 0.2, T_POUR[2]))
  const jugHome: V3 = [X0 + 0.16 * M, Y, Z + 0.1 * M], jugAt: V3 = [X0 + 0.13 * M, Y + 0.07 * M, Z]
  const goK = seg(t, T_POUR[0], T_POUR[1]) - seg(t, T_POUR[2], T_POUR[3])
  const jug = liftPath(jugHome, jugAt, jugAt[1], Math.max(0, goK))
  const tilt = ease(seg(t, T_POUR[1] - 0.2, T_POUR[1] + 0.4)) * (1 - ease(seg(t, T_POUR[2] - 0.3, T_POUR[2] + 0.1))) * 1.95
  const pouring = t > T_POUR[1] + 0.2 && t < T_POUR[2] - 0.1
  // 铜片：先在左边的白瓷板上，盖到杯口
  const plateHome: V3 = [X0 - 0.2 * M, Y + 0.012 * M, Z], plateOn: V3 = [X0, Y + H + PLATE.t * M / 2 + 0.006, Z]
  const pk = ready ? 1 : seg(t, T_PLATE[0], T_PLATE[1])
  const pp = liftPath(plateHome, plateOn, plateOn[1] + 0.05 * M, pk)
  const carrying = setup.busy && pk > 0 && pk < 1, jugMoving = setup.busy && t < T_POUR[3]
  // 通氧气的导管：从右后方的氧气袋接过来，伸进水里，管口对着白磷
  const tk = o2 ? 1 : tube.k
  const tubeEnd: V3 = [X0 + UNDER[0] + 0.012 * M, Y + lerp(0.1, 0.02, ease(tk)) * M, Z + UNDER[2]]

  const task = T.current
  const { hint, next }: { hint: string; next: 'setup' | 'o2' | 'water' | null } = !task ? { hint: '可燃物燃烧，温度要达到着火点。白磷的着火点低（40 °C），红磷的高（240 °C）。', next: null }
    : setup.busy ? { hint: t < T_POUR[3] ? `往烧杯里倒${WATER[water].name}…` : '把铜片盖在杯口上…', next: null }
    : tube.busy ? { hint: '把导管伸到水里的白磷旁边…', next: null }
    : task.id === 'cold' && water !== 'cold' ? { hint: '先选“冷水 20 °C”', next: 'water' }
    : task.id !== 'cold' && water !== 'hot' ? { hint: '把水换成“热水 80 °C”', next: 'water' }
    : !ready ? { hint: `按“倒水，盖上铜片”：倒入${WATER[water].name}`, next: 'setup' }
    : since.t < 3 ? { hint: '看铜片上的白磷、红磷，还有水里的白磷…', next: null }
    : task.id === 'o2' ? (o2 ? { hint: '氧气从导管里冒出来，围着水里的白磷…', next: null } : { hint: '水里的白磷温度够了，却不燃烧。按“通入氧气”', next: 'o2' })
    : { hint: '', next: null }

  const tag = (b: { burn: boolean }, on: boolean) => on ? (b.burn ? '燃烧' : '不燃烧') : '—'
  const labels: Label[] = [
    ...(ready ? [
      { id: 'w', at: [X0 + WP_X * M - 0.05, plateOn[1] + 0.04 * M, Z] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>白磷 · 着火点 {IGNITE.whiteP} °C</small>{s.white.burn ? '燃烧' : '不燃烧'}</> },
      { id: 'r', at: [X0 + RP_X * M + 0.08, plateOn[1] + 0.035 * M, Z] as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>红磷 · 着火点 {IGNITE.redP} °C</small>{s.red.burn ? '燃烧' : '不燃烧'}</> },
      { id: 'u', at: [X0 - R - 0.08, Y + 0.02 * M, Z] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>水里的白磷</small>{underAt !== null ? '燃烧' : '不燃烧'}</> },
      { id: 't', at: [X0 + R + 0.16, Y + H * 0.55, Z] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>铜片</small>{round(pt)} °C</> },
    ] : []),
    { id: 'n1', at: [X0 - 0.2 * M, Y + 0.03 * M, Z + 0.45], ax: 0.5, name: true, className: 'scene-name', children: '铜片 · 白磷 · 红磷' },
    { id: 'n2', at: [X0 + 0.16 * M, Y + 0.16 * M, Z + 0.1 * M], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: WATER[water].name },
    { id: 'n3', at: [X0 + 0.27 * M, Y + 0.12 * M, Z - 0.3 * M], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '氧气袋' },
  ]
  return (
    <LabShell title="燃烧和灭火" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="铜片实验"
      stage={<Place at="l3" labels={labels}>
        <group position={[X0, Y, BENCH.z1]}><FumeHood /></group>
        {/* 烧杯、杯底纸圈里的白磷、温度计 */}
        <group position={[X0, Y, Z]}>
          <Beaker vol={500} fill={fill} liquid="#d9ecf2" />
          <mesh position={[UNDER[0], 0.008 * M, UNDER[2]]}><torusGeometry args={[0.009 * M, 0.0015 * M, 6, 24]} /><meshStandardMaterial color="#efece4" roughness={1} /></mesh>
          {(underAt === null || uLevel > 0.02) && <group position={[UNDER[0], 0.006 * M, UNDER[2]]} scale={0.4 + 0.6 * (underAt === null ? 1 : uLevel)}><WhiteP /></group>}
          <group position={[0.026 * M, 0.006 * M, -0.022 * M]} rotation={[0.18, 0, -0.16]}><Thermometer temp={fill > 0.3 ? lerp(ROOM, wt, seg(t, T_POUR[1] + 0.5, T_POUR[2] + 1.5) || (ready ? 1 : 0)) : ROOM} /></group>
        </group>
        {/* 白瓷板（铜片原来放在这里） */}
        <mesh position={[X0 - 0.2 * M, Y + 0.004 * M, Z]} receiveShadow castShadow><boxGeometry args={[0.17 * M, 0.008 * M, 0.06 * M]} /><meshPhysicalMaterial color="#f4f4f0" roughness={0.2} clearcoat={0.8} /></mesh>
        {/* 铜片和上面的白磷、红磷 */}
        <group position={pp}>
          <CopperPlate heat={seg(pt, ROOM, 80)} />
          {(litAt === null || wLevel > 0.02) && <group position={[WP_X * M, PLATE.t * M / 2, 0]} scale={litAt === null ? 1 : 0.3 + 0.7 * wLevel}><WhiteP s={0.9} /></group>}
          {litAt !== null && wLevel < 0.5 && <mesh position={[WP_X * M, PLATE.t * M / 2 + 0.001, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.008 * M, 20]} /><meshStandardMaterial color="#efeee8" roughness={1} /></mesh>}
          <group position={[RP_X * M, PLATE.t * M / 2, 0]}><RedP /></group>
          {carrying && <group position={[0, 0.012 * M, 0.02 * M]} rotation={[-0.9, 0, 0.1]}><Glove s={0.006 * M} /></group>}
        </group>
        <Flame at={[pp[0] + WP_X * M, pp[1] + 0.004 * M, pp[2]]} w={0.03 * M} h={0.07 * M} kind="phos" level={litAt === null ? 0 : Math.min(1, (since.t - litAt) / 0.4) * wLevel} seed={5} light={1.6} lightColor="#fff1c8" />
        <Puffs at={[pp[0] + WP_X * M, pp[1] + 0.04 * M, pp[2]]} on={litAt !== null && wLevel > 0.1} opt={SMOKE.white(0.32)} seed={2} />
        <Puffs at={[pp[0] + RP_X * M, pp[1] + 0.005 * M, pp[2]]} on={false} opt={SMOKE.white(0.2)} seed={3} />
        {/* 热水冒的白汽 */}
        <Puffs at={[X0 + R * 0.6, Y + H + 0.01, Z + R * 0.5]} on={(ready || fill > 0.3) && water === 'hot'} opt={{ ...SMOKE.wisp(0.5), color: '#f2f4f5', opacity: 0.1, rate: 10 }} seed={9} />
        {/* 倒水用的大烧杯：一只手套握着它 */}
        <group position={jug}>
          <group position={[-0.06 * M, 0.12 * M, 0]} rotation-z={tilt}>
            <group position={[0.06 * M, -0.12 * M, 0]}><Beaker vol={1000} fill={ready ? 0.2 : 0.74 - 0.5 * ease(seg(t, T_POUR[1] + 0.2, T_POUR[2]))} liquid="#d9ecf2" /></group>
            {jugMoving && <group position={[0.06 * M + R + 0.025 * M, 0.06 * M, 0.01 * M]} rotation={[0.5, 0, -Math.PI / 2 - 0.35]}><Glove /></group>}
          </group>
        </group>
        {pouring && <mesh position={[X0 + 0.02 * M, Y + (H * 0.5 + 0.11 * M) / 2 + H * 0.3, Z]}><cylinderGeometry args={[0.003 * M, 0.0045 * M, 0.11 * M + H * 0.2, 10]} /><meshPhysicalMaterial color="#e2f1f6" transparent opacity={0.55} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>}
        {/* 氧气袋和导管 */}
        <mesh position={[X0 + 0.27 * M, Y + 0.055 * M, Z - 0.3 * M]} scale={[1, 0.6, 0.55]} castShadow><sphereGeometry args={[0.09 * M, 28, 18]} /><meshPhysicalMaterial color="#2f6fb3" roughness={0.45} clearcoat={0.4} /></mesh>
        <mesh position={[X0 + 0.17 * M, Y + 0.055 * M, Z - 0.3 * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.04 * M, 12]} /><meshStandardMaterial color="#d8d8d0" /></mesh>
        <Hose pts={[[X0 + 0.15 * M, Y + 0.055 * M, Z - 0.3 * M], [X0 + 0.12 * M, Y + 0.02 * M, Z - 0.2 * M], [X0 + 0.07 * M, Y + 0.02 * M, Z - 0.08 * M], [X0 + 0.05 * M, tubeEnd[1] + 0.12 * M, Z - 0.02 * M], [tubeEnd[0] + 0.004 * M, tubeEnd[1] + 0.17 * M, tubeEnd[2]]]} />
        <mesh position={[tubeEnd[0], tubeEnd[1] + 0.08 * M, tubeEnd[2]]} renderOrder={7}><cylinderGeometry args={[0.0035 * M, 0.0035 * M, 0.17 * M, 12]} /><meshPhysicalMaterial color="#e8f4f6" transparent opacity={0.35} roughness={0.03} clearcoat={1} depthWrite={false} /></mesh>
        <Puffs at={[tubeEnd[0], tubeEnd[1], tubeEnd[2]]} on={o2} opt={{ rate: 18, life: 0.7, size: [0.004 * M, 0.008 * M], speed: 0.09 * M, spread: 0.25, color: '#ffffff', opacity: 0.7 }} seed={6} />
        <Flame at={[X0 + UNDER[0], Y + 0.008 * M, Z + UNDER[2]]} w={0.022 * M} h={0.045 * M} kind="phos" level={underAt === null ? 0 : Math.min(1, (bub.t - underAt) / 0.4) * uLevel * 0.8} seed={8} light={1.2} lightColor="#fff1c8" />
        <Puffs at={[X0 + UNDER[0], Y + H * FILL, Z + UNDER[2]]} on={underAt !== null && uLevel > 0.1} opt={SMOKE.white(0.22)} seed={11} />
      </Place>}
      lesson={<LessonBlock no="3" title="温度要达到着火点" concept="温度要达到着火点，可燃物才会燃烧" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>可燃物燃烧所需要的最低温度，叫作这种物质的<b className="text-white">着火点</b>。白磷的着火点是 40 °C，红磷的是 240 °C。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>铜片上的白磷：有氧气，热水让它的温度达到了着火点，<b className="text-white">燃烧</b></li>
            <li>铜片上的红磷：有氧气，但温度达不到 240 °C，不燃烧</li>
            <li>水里的白磷：温度够了，但水把它和氧气隔开了，不燃烧；通入氧气后燃烧</li>
          </ul>
          <p className="mt-3">铜片上的白磷和红磷对比，说明燃烧需要温度达到着火点；铜片上的白磷和水里的白磷对比，说明燃烧需要氧气。</p>
          <p className="mt-3 text-[13.5px] text-white/65">白磷燃烧生成大量白烟（五氧化二磷）。白磷有毒，这个实验要在老师指导下、在通风橱里做。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组对照都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">燃烧的第三个条件：温度要达到着火点</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">80 °C 时，铜片上的白磷（着火点 40 °C）燃烧，红磷（240 °C）不燃烧；水里的白磷要通入氧气才燃烧。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">铜片的温度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{ready ? round(pt) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">°C</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="白磷" value={`${IGNITE.whiteP} °C`} unit="着火点" />
            <ParamTile symbol="红磷" value={`${IGNITE.redP} °C`} unit="着火点" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">现象</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 font-medium">氧气</th><th className="pb-1 font-medium">到着火点</th><th className="pb-1 font-medium">现象</th></tr></thead>
            <tbody>{([['铜片上的白磷', true, ready && pt >= IGNITE.whiteP, s.white, ready], ['铜片上的红磷', true, false, s.red, ready], ['水里的白磷', o2, ready && wt >= IGNITE.whiteP, s.under, ready]] as [string, boolean, boolean, { burn: boolean }, boolean][]).map(([n, ox, hot, b, on]) =>
              <tr key={n} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{n}</td><td>{on ? (ox ? '有' : '没有') : '—'}</td><td>{on ? (hot ? '是' : '否') : '—'}</td><td className={`rounded-r-lg font-semibold ${on && b.burn ? 'text-[#ffb547]' : ''}`}>{n === '水里的白磷' ? (on ? (underAt !== null ? '燃烧' : '不燃烧') : '—') : tag(b, on)}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'setup'} pulse={next === 'setup'} onClick={() => setup.run()} disabled={setup.busy || ready}>倒水，盖上铜片</LabButton>
        <LabButton primary={next === 'o2'} pulse={next === 'o2'} onClick={() => tube.run()} disabled={!ready || water !== 'hot' || o2 || tube.busy || since.t < 3}>通入氧气</LabButton>
      </>}
      extras={
        <Control label="水温">
          <Segmented label="水温" pulse={next === 'water'} want={next === 'water' ? (task?.id === 'cold' ? 'cold' : 'hot') : null} disabled={setup.busy || tube.busy} value={water} onChange={k => pick(k as WaterKey)} options={KEYS.map(k => ({ value: k, label: WATER[k].name }))} />
        </Control>
      }
    />
  )
}
