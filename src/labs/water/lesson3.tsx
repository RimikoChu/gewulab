// 水的净化和组成 · 第 3 课 过滤（样板课）：化验台第 2 格，一只铁架台，铁圈上架着漏斗，下面接一只烧杯。
// 先把一张圆滤纸对折两次、打开成锥放进漏斗；再沿玻璃棒把静置过的河水倒进去，滤液顺着烧杯内壁流下来；测滤液的浊度。
// 最后换一张破了的滤纸再滤一次，滤液是浑的。“一贴二低三靠”标在器材上。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { FUNNEL, Glove, PaperSheet, Turbidimeter } from './gear'
import { FilterRig, POUR, RIG } from './rig'
import { ease, liftPath, seg, useRun } from './parts'
import { FEED_NTU, PAPER, filtered, fmtNtu, murk, type PaperKey } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l3, Y = TOP, Z = BZ + 0.15
const FX = X0, FY = Y + RIG.stemY * M, FZ = Z                  // 漏斗颈口
const SRC = { x: X0 + RIG.src * M, z: Z + 0.02 * M }            // 盛河水的烧杯原来放的地方
const SHEET = { x: X0 - 0.17 * M, z: Z + 0.03 * M }             // 滤纸原来摊在台上的地方
/** 动作的时间（s） */
const T_FOLD = { k1: [0.2, 1.3], k2: [1.5, 2.6], lift: [2.9, 4.2], wet: [4.2, 5.0], end: 5.2 } as const
const TASKS: Task[] = [
  { id: 'fold', text: '把滤纸折好，放进漏斗', note: '对折两次，打开成锥形，用水润湿，紧贴漏斗内壁' },
  { id: 'pour', text: '沿玻璃棒倒入静置过的河水', note: '泥沙留在滤纸上，滤液顺着烧杯内壁流下来' },
  { id: 'ok', text: '测滤液的浊度', note: `滤液约 ${fmtNtu(filtered(FEED_NTU, 'ok'))} NTU：过滤除去了不溶性杂质` },
  { id: 'torn', text: '换一张破了的滤纸，再滤一次，测浊度', note: '滤纸破了，浑水直接漏下去，滤液仍然浑浊' },
]
const KEYS: PaperKey[] = ['ok', 'torn']

export default function Lesson3() {
  const [paper, setPaper] = useState<PaperKey>('ok')
  const [inFunnel, setIn] = useState(false)          // 滤纸已经在漏斗里
  const [poured, setPoured] = useState(false)        // 这一张滤纸已经滤过一次
  const [read, setRead] = useState<number | null>(null)
  const [rows, setRows] = useState<{ paper: PaperKey; ntu: number }[]>([])
  const T = useTasks('gewu:water:3', TASKS)
  const fold = useRun(T_FOLD.end, () => { setIn(true); T.check(id => id === 'fold') })
  const pour = useRun(POUR.end, () => { setPoured(true); T.check(id => id === 'pour') })
  const out = filtered(FEED_NTU, paper)
  const measure = () => { if (!poured || read !== null) return; setRead(out); const next = [...rows, { paper, ntu: out }]; setRows(next); T.check(id => (id === 'ok' && paper === 'ok') || (id === 'torn' && paper === 'torn')) }
  const clear = () => { fold.snap(0); pour.snap(0); setPoured(false); setRead(null) }
  const pick = (k: PaperKey) => { if (fold.busy || pour.busy || k === paper) return; clear(); setPaper(k); setIn(k === 'torn' || inFunnel) }
  const resetAll = () => { clear(); setPaper('ok'); setIn(false); setRows([]); T.reset() }
  useEffect(() => { if (!inFunnel && paper === 'torn') setIn(true) }, [paper, inFunnel])

  // 折滤纸：两次对折，提起来送到漏斗上方，打开成锥放进去
  const ft = fold.t, folded = inFunnel && !fold.busy
  const k1 = folded ? 1 : ease(seg(ft, ...T_FOLD.k1)), k2 = folded ? 1 : ease(seg(ft, ...T_FOLD.k2))
  const lift = seg(ft, ...T_FOLD.lift), coneOn = folded || ft > T_FOLD.lift[0] + (T_FOLD.lift[1] - T_FOLD.lift[0]) * 0.7
  const sheetAt = liftPath([SHEET.x, Y, SHEET.z], [FX, Y + (RIG.stemY + 0.08) * M, FZ], Y + 0.32 * M, lift)
  const wet = folded ? 1 : seg(ft, ...T_FOLD.wet)
  const pt = pour.t, showRod = pour.busy || poured
  const kIn = murk(FEED_NTU), kOut = murk(out)

  const task = T.current
  const { hint, next }: { hint: string; next: 'fold' | 'pour' | 'read' | 'paper' | null } = !task ? { hint: '过滤能把不溶于水的固体和水分开。操作要做到“一贴二低三靠”。', next: null }
    : fold.busy ? { hint: ft < T_FOLD.lift[0] ? '把滤纸对折，再对折…' : '打开成锥形，放进漏斗，用水润湿…', next: null }
    : pour.busy ? { hint: '沿着玻璃棒慢慢倒，液面不要超过滤纸边缘…', next: null }
    : task.id === 'torn' && paper !== 'torn' ? { hint: '把滤纸换成“破了的滤纸”', next: 'paper' }
    : !inFunnel ? { hint: '先把滤纸折好，放进漏斗', next: 'fold' }
    : !poured ? { hint: `沿玻璃棒倒入静置过的河水（约 ${fmtNtu(FEED_NTU)} NTU）`, next: 'pour' }
    : read === null ? { hint: '取一点滤液，放进浊度仪测一测', next: 'read' }
    : { hint: '', next: null }

  // 标签：一贴二低三靠，倒水时和倒完都显示
  const rim = FY + FUNNEL.top * M
  const rule = showRod ? 1 : 0
  const labels: Label[] = [
    { id: 'r1', at: [FX - 0.03 * M, FY + 0.08 * M, FZ], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: rule }, children: '一贴：滤纸紧贴漏斗内壁' },
    { id: 'r2', at: [FX - FUNNEL.rTop * M - 0.01, rim, FZ], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: rule }, children: '二低：滤纸边缘低于漏斗口，液面低于滤纸边缘' },
    { id: 'r3', at: [FX - 0.05 * M, Y + 0.27 * M, FZ], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: rule }, children: '三靠：烧杯口靠玻璃棒，玻璃棒靠三层滤纸一边' },
    { id: 'r4', at: [FX - 0.04 * M, FY - 0.01 * M, FZ], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: rule }, children: '漏斗下端靠烧杯内壁' },
    ...(read !== null ? [{ id: 'v', at: [X0 - 0.22 * M, Y + 0.1 * M, Z] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>滤液</small>{fmtNtu(read)} NTU</> }] : []),
    { id: 'n1', at: [SRC.x, Y + 0.12 * M, SRC.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '静置过的河水' },
    { id: 'n2', at: [X0 - 0.22 * M, Y + 0.02 * M, Z + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '浊度仪' },
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="过滤"
      stage={<Place at="l3" labels={labels}>
        <FilterRig x={X0} y={Y} z={Z} t={pt} busy={pour.busy} done={poured} feed={{ k: kIn }} out={{ k: kOut }} cone={coneOn} wet={wet} torn={paper === 'torn'} />
        {/* 台上的滤纸：对折两次，再被拿起来 */}
        {!coneOn && <group position={sheetAt} rotation-y={0.3}><PaperSheet k1={k1} k2={k2} /></group>}
        {fold.busy && lift > 0 && lift < 1 && <group position={[sheetAt[0] + 0.03 * M, sheetAt[1] + 0.02 * M, sheetAt[2] + 0.03 * M]} rotation={[-0.4, 0, 0.3]}><Glove s={0.0056 * M} /></group>}
        {/* 浊度仪：测的时候样品瓶放进去 */}
        <group position={[X0 - 0.22 * M, Y, Z - 0.02 * M]} rotation-y={0.35}><Turbidimeter text={read === null ? '----' : fmtNtu(read)} vial={read !== null} k={kOut} /></group>
      </Place>}
      lesson={<LessonBlock no="3" title="过滤" concept="过滤能除去水里的不溶性杂质" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>过滤是把不溶于液体的固体和液体分离的一种方法。滤纸上的小孔只让水和溶在水里的物质通过，泥沙留在滤纸上。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">一贴</b>：滤纸紧贴漏斗内壁，中间不留气泡</li>
            <li><b className="text-white">二低</b>：滤纸边缘低于漏斗口；漏斗里的液面低于滤纸边缘</li>
            <li><b className="text-white">三靠</b>：烧杯口紧靠玻璃棒；玻璃棒下端靠在三层滤纸一边；漏斗下端紧靠烧杯内壁</li>
          </ul>
          <p className="mt-3">滤纸破损、液面高于滤纸边缘、仪器不干净，滤液都会浑浊，要再过滤一次。过滤除不掉溶在水里的物质。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两张滤纸都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">过滤能除去水里的不溶性杂质</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">完好的滤纸把浊度从约 {fmtNtu(FEED_NTU)} NTU 降到约 {fmtNtu(filtered(FEED_NTU, 'ok'))} NTU；滤纸破了，滤液约 {fmtNtu(filtered(FEED_NTU, 'torn'))} NTU，仍然浑浊。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">滤液的浊度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{read === null ? '—' : fmtNtu(read)}<span className="ml-1 text-[15px] font-medium text-white/55">NTU</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="倒入" value={`约 ${fmtNtu(FEED_NTU)}`} unit="NTU · 静置过的河水" />
            <ParamTile symbol="滤纸" value={paper === 'ok' ? '完好' : '破了'} unit={PAPER[paper].name} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">滤纸</th><th className="pb-1 font-medium">滤液浊度</th><th className="pb-1 font-medium">看起来</th></tr></thead>
            <tbody>{KEYS.map(k => { const r = rows.find(x => x.paper === k); return <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{PAPER[k].name}</td><td className="tabular-nums">{r ? `约 ${fmtNtu(r.ntu)} NTU` : '—'}</td><td className={`rounded-r-lg font-semibold ${r && k === 'ok' ? 'text-[#7fe3d4]' : ''}`}>{r ? (k === 'ok' ? '澄清' : '浑浊') : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'fold'} pulse={next === 'fold'} onClick={() => fold.run()} disabled={inFunnel || fold.busy}>折好滤纸，放进漏斗</LabButton>
        <LabButton primary={next === 'pour'} pulse={next === 'pour'} onClick={() => pour.run()} disabled={!inFunnel || fold.busy || pour.busy || poured}>沿玻璃棒倒入</LabButton>
        <LabButton primary={next === 'read'} pulse={next === 'read'} onClick={measure} disabled={!poured || read !== null}>测浊度</LabButton>
      </>}
      extras={
        <Control label="滤纸">
          <Segmented label="滤纸" pulse={next === 'paper'} want={next === 'paper' ? 'torn' : null} disabled={fold.busy || pour.busy} value={paper} onChange={k => pick(k as PaperKey)} options={KEYS.map(k => ({ value: k, label: PAPER[k].name }))} />
        </Control>
      }
    />
  )
}
