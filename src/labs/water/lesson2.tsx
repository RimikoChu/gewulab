// 水的净化和组成 · 第 2 课 沉淀：化验台第 1 格，两只 1000 mL 烧杯盛着同样的河水。往右边那杯加一勺明矾，用玻璃棒搅拌；
// 两杯一起静置：左杯只沉下一点泥，还是浑的；右杯里细小的颗粒聚成一团团矾花，往下沉，上面变清。最后用浊度仪测两杯。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, GlassRod, Glove, JarBottle, Spoon, Turbidimeter } from './gear'
import { Flocs } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { RIVER_NTU, SETTLE, fmtNtu, murk, settle, sunk } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l2, Y = TOP, Z = BZ + 0.1
const R = BEAKER[1000].r * M, H = BEAKER[1000].h * M, FILL = 0.78
const L: V3 = [X0 - 0.11 * M, Y, Z], RB: V3 = [X0 + 0.11 * M, Y, Z]       // 左杯（不加明矾）、右杯（加明矾）
const JAR: V3 = [X0 + 0.32 * M, Y, Z - 0.06 * M], METER: V3 = [X0 - 0.38 * M, Y, Z - 0.02 * M]
const T_ALUM = { spoon: [0, 1.4], tip: [1.4, 2.2], back: [2.2, 3.0], stir: [3.0, 6.0], end: 6.2 } as const
const SETTLE_SEC = 10, KT = 4     // 画面上静置 10 秒，相当于模型里的 40 秒（过程加快）
const TASKS: Task[] = [
  { id: 'alum', text: '往右杯里加明矾，搅拌', note: '明矾溶于水，生成的胶状物能吸附水里的悬浮杂质' },
  { id: 'settle', text: '两杯一起静置', note: '右杯里的杂质聚成矾花沉下去；左杯只沉下较粗的泥沙' },
  { id: 'read', text: '测两杯上层水的浊度', note: `左杯约 ${fmtNtu(SETTLE.plain.floor)} NTU，右杯约 ${fmtNtu(SETTLE.alum.floor)} NTU` },
]

export default function Lesson2() {
  const [alum, setAlum] = useState(false)
  const [settled, setSettled] = useState(false)
  const [read, setRead] = useState(false)
  const T = useTasks('gewu:water:2', TASKS)
  const add = useRun(T_ALUM.end, () => { setAlum(true); T.check(id => id === 'alum') })
  const rest = useRun(SETTLE_SEC, () => { setSettled(true); T.check(id => id === 'settle') })
  const busy = add.busy || rest.busy
  const measure = () => { if (!settled || read) return; setRead(true); T.check(id => id === 'read') }
  const resetAll = () => { add.snap(0); rest.snap(0); setAlum(false); setSettled(false); setRead(false); T.reset() }

  const st = settled ? SETTLE_SEC * KT : rest.busy ? rest.t * KT : 0
  const nL = settle(false, st), nR = settle(alum, st)
  const kL = murk(nL), kR = murk(nR)
  const prog = settled ? 1 : rest.busy ? rest.t / SETTLE_SEC : 0
  // 加明矾：药匙从瓶里舀一勺，送到右杯上方，翻过来倒进去；再用玻璃棒搅一会儿
  const a = add.t
  const spoonHome: V3 = [JAR[0] - 0.02 * M, Y + 0.1 * M, JAR[2]], spoonOver: V3 = [RB[0] + 0.02 * M, Y + H + 0.04 * M, RB[2]]
  const sp = a < T_ALUM.tip[0] ? liftPath(spoonHome, spoonOver, Y + H + 0.08 * M, seg(a, ...T_ALUM.spoon)) : a < T_ALUM.back[0] ? spoonOver : liftPath(spoonOver, spoonHome, Y + H + 0.08 * M, seg(a, ...T_ALUM.back))
  const flip = ease(seg(a, T_ALUM.tip[0], T_ALUM.tip[0] + 0.4)) * (1 - ease(seg(a, T_ALUM.tip[1] - 0.2, T_ALUM.tip[1])))
  const stir = add.busy && a > T_ALUM.stir[0] && a < T_ALUM.stir[1]
  const ang = (a - T_ALUM.stir[0]) * 9
  const rodAt: V3 = stir ? [RB[0] + Math.cos(ang) * R * 0.45, Y + 0.01 * M, RB[2] + Math.sin(ang) * R * 0.45] : [RB[0] + R * 0.9, Y + 0.004 * M, RB[2] + R * 1.6]
  const crystals = add.busy && a > T_ALUM.tip[0] + 0.2 && a < T_ALUM.stir[0] + 1
  const crystalPts = useMemo(() => Array.from({ length: 14 }, (_, i) => [Math.cos(i * 2.4) * 0.006 * M, Math.sin(i * 1.7) * 0.006 * M] as [number, number]), [])

  const task = T.current
  const { hint, next }: { hint: string; next: 'alum' | 'rest' | 'read' | null } = !task ? { hint: '加明矾以后，细小的悬浮杂质聚成矾花沉下去，水比只静置的清得多。', next: null }
    : add.busy ? { hint: a < T_ALUM.stir[0] ? '舀一勺明矾，加进右杯…' : '用玻璃棒搅拌，让明矾溶解…', next: null }
    : rest.busy ? { hint: '静置，看两杯有什么不同…', next: null }
    : !alum ? { hint: '两杯是同样的河水。往右杯里加明矾，搅拌', next: 'alum' }
    : !settled ? { hint: '把两杯一起静置', next: 'rest' }
    : !read ? { hint: '取两杯上层的水，用浊度仪测一测', next: 'read' }
    : { hint: '', next: null }

  const labels: Label[] = [
    { id: 'a', at: [L[0], Y + H + 0.02 * M, L[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>不加明矾</small>{read ? `约 ${fmtNtu(nL)} NTU` : rest.busy || settled ? '静置中' : '河水'}</> },
    { id: 'b', at: [RB[0], Y + H + 0.02 * M, RB[2]], ax: 0.5, className: `scene-tag ${read ? 'key' : ''} -translate-y-full`, children: <><small>加明矾</small>{read ? `约 ${fmtNtu(nR)} NTU` : alum ? (rest.busy || settled ? '静置中' : '加好了') : '河水'}</> },
    ...(alum && prog > 0.3 ? [{ id: 'f', at: [RB[0] + R + 0.06, Y + H * 0.4, RB[2]] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: '矾花' }] : []),
    { id: 'n1', at: [JAR[0], Y + 0.11 * M, JAR[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '明矾' },
    { id: 'n2', at: [METER[0], Y + 0.02 * M, METER[2] + 0.5], ax: 0.5, name: true, className: 'scene-name', children: '浊度仪' },
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="沉淀"
      stage={<Place at="l2" labels={labels}>
        <group position={L}><Beaker vol={1000} fill={FILL} k={kL} mud={0.01 * sunk(false, st)} /></group>
        <group position={RB}><Beaker vol={1000} fill={FILL} k={kR} mud={0.014 * sunk(alum, st)} mudColor={alum ? '#7d6644' : undefined} /></group>
        {/* 水里悬浮的颗粒：左杯只有一部分沉下去，右杯聚成矾花再沉 */}
        <Flocs at={[L[0], Y + 0.004 * M, L[2]]} R={R * 0.9} H={H * FILL * 0.95} k={prog * 0.55} clump={false} n={130} size={0.003 * M} seed={2} />
        <Flocs at={[RB[0], Y + 0.004 * M, RB[2]]} R={R * 0.9} H={H * FILL * 0.95} k={alum ? (add.busy ? 0 : Math.max(0.12, prog)) : 0} clump={alum} n={170} size={0.003 * M} color={alum ? '#9b8457' : '#8a6a3e'} seed={5} />
        <group position={JAR}><JarBottle label="明矾" solid="alum" amount={0.6} /></group>
        <group position={sp} rotation-z={Math.PI * 0.85 * flip}><Spoon load={a < T_ALUM.tip[0] + 0.3 && add.busy && a > 0.3 ? 1 - flip : 0} />
          {add.busy && a < T_ALUM.back[1] && <group position={[0.15 * M, 0.02 * M, 0.02 * M]} rotation={[0.4, 0, -1.2]}><Glove s={0.0058 * M} /></group>}
        </group>
        {crystals && crystalPts.map(([dx, dz], i) => { const f = ((a - T_ALUM.tip[0] - 0.2) * 2 + i * 0.13) % 1; return <mesh key={i} position={[spoonOver[0] + dx, spoonOver[1] - f * (H * (1 - FILL) + 0.04 * M), spoonOver[2] + dz]}><boxGeometry args={[0.0018 * M, 0.0018 * M, 0.0018 * M]} /><meshStandardMaterial color="#f4f5f2" roughness={0.4} /></mesh> })}
        <group position={rodAt} rotation={stir ? [Math.sin(ang) * 0.18, 0, -Math.cos(ang) * 0.18] : [0, 0, Math.PI / 2 - 0.05]}><GlassRod len={0.22} />
          {stir && <group position={[0, 0.17 * M, 0]} rotation={[0.3, 0, 0]}><Glove s={0.0058 * M} /></group>}
        </group>
        <group position={METER} rotation-y={0.45}><Turbidimeter text={read ? fmtNtu(nR) : '----'} vial={read} k={kR} /></group>
      </Place>}
      lesson={<LessonBlock no="2" title="沉淀" concept="加明矾，细小的杂质聚成矾花沉下去" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把浑水静置，较重的泥沙会沉到下面，叫<b className="text-white">静置沉淀</b>。但更细小的颗粒悬浮在水里，很久也沉不下去。</p>
          <p className="mt-3">明矾溶于水后生成胶状物，能把水里悬浮的细小杂质<b className="text-white">吸附</b>在一起，聚成较大的“矾花”，沉到水底。这叫吸附沉降。自来水厂用的絮凝剂也是这个道理。</p>
          <p className="mt-3 text-[13.5px] text-white/65">明矾只能让悬浮的杂质沉下去，不能除去溶在水里的物质，也不能杀死细菌。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两杯水都测过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">明矾使悬浮杂质聚集沉降，水变清</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">同样静置，不加明矾约 {fmtNtu(SETTLE.plain.floor)} NTU，加明矾约 {fmtNtu(SETTLE.alum.floor)} NTU。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">加明矾那杯的浊度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{read ? fmtNtu(nR) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">NTU</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="河水" value={`约 ${fmtNtu(RIVER_NTU)}`} unit="NTU · 静置前" />
            <ParamTile symbol="静置" value={settled ? '够久了' : rest.busy ? `${Math.round(prog * 100)}%` : '—'} unit="过程加快" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两杯的对比</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 font-medium">浊度</th><th className="pb-1 font-medium">看起来</th></tr></thead>
            <tbody>{([['不加明矾', nL], ['加明矾', nR]] as [string, number][]).map(([n, v], i) => <tr key={n} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{n}</td><td className="tabular-nums">{read ? `约 ${fmtNtu(v)} NTU` : '—'}</td><td className={`rounded-r-lg font-semibold ${read && i === 1 ? 'text-[#7fe3d4]' : ''}`}>{read ? (i ? '较清' : '仍浑浊') : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'alum'} pulse={next === 'alum'} onClick={() => add.run()} disabled={busy || alum}>往右杯加明矾</LabButton>
        <LabButton primary={next === 'rest'} pulse={next === 'rest'} onClick={() => rest.run()} disabled={busy || !alum || settled}>静置</LabButton>
        <LabButton primary={next === 'read'} pulse={next === 'read'} onClick={measure} disabled={!settled || read}>测浊度</LabButton>
      </>}
      extras={null}
    />
  )
}
