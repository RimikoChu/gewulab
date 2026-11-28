// 接触法制硫酸 · 第 6 课 吸收和尾气。吸收塔朝镜头剖开：耐酸砖内衬、瓷环填料、塔顶的分酸管和除沫层、塔底的酸池。
// 先用水吸收（塔里起一片酸雾），再换 98.3% 的浓硫酸；最后开尾气吸收塔，用氨水把尾气里剩下的 SO₂ 吸掉。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow, GAS, Mist, mix } from './flow'
import { Pool, Spray } from './fx'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { ABSORB, T3, fmt2, tailAfter, tailSO2, xTable, type Liquid } from './physics'
import { ABS, TAIL, ride } from './plant'
import { Place } from './world'

const X = xTable(T3, 0.1)
const TASKS: Task[] = [
  { id: 'water', text: '用水吸收 SO₃，看塔里的现象', note: 'SO₃ 遇水放出大量的热，形成酸雾，吸收得又慢又不完全' },
  { id: 'acid', text: '换成 98.3% 的浓硫酸再吸收', note: '浓硫酸吸收 SO₃ 不起酸雾，吸收得快而完全' },
  { id: 'tail', text: '开尾气吸收塔', note: `尾气里的 SO₂ 被氨水吸收，从约 ${fmt2(tailSO2(X))}% 降到约 ${fmt2(tailAfter(X))}%` },
]
const SEC = 6, A = ABS

export default function Lesson6() {
  const T = useTasks('gewu:sulfuric:6', TASKS)
  const [liq, setLiq] = useState<Liquid>('water')
  const [seen, setSeen] = useState<Partial<Record<Liquid, boolean>>>({})
  const [tail, setTail] = useState(false)
  const go = useRun(SEC, () => { setSeen(s => ({ ...s, [liq]: true })); T.check(id => id === liq) })
  const resetAll = () => { setLiq('water'); setSeen({}); setTail(false); go.snap(0); T.reset() }
  const choose = (k: Liquid) => { if (go.busy) return; setLiq(k); go.snap(0) }
  const openTail = () => { if (tail || go.busy) return; setTail(true); T.check(id => id === 'tail') }
  const task = T.current?.id
  const want: Liquid | null = task === 'water' ? 'water' : task ? 'acid' : null
  const next: 'seg' | 'go' | 'tail' | null = !task || go.busy ? null : task === 'tail' ? 'tail' : liq !== want ? 'seg' : 'go'
  const hint = !task ? '用浓硫酸吸收三氧化硫，尾气处理后再排放。'
    : go.busy ? (liq === 'water' ? '塔里起了一片白茫茫的酸雾，不少 SO₃ 没被吸收就跑了…' : '气体往上、酸往下，在填料表面相遇：没有酸雾…')
    : task === 'tail' ? '尾气里还有少量 SO₂。开尾气吸收塔'
    : liq !== want ? `把吸收剂换成“${ABSORB[want!].name}”`
    : liq === 'water' ? '塔顶淋的是水。通入 SO₃' : '塔顶淋的是 98.3% 的浓硫酸。通入 SO₃'

  const on = go.busy || go.k >= 1, mist = on && liq === 'water'
  const rate = on ? ABSORB[liq].rate : null
  // 气体：从塔底侧面进来，穿过填料往上，从塔顶出去，再到尾气吸收塔、烟囱
  const gasIn = useMemo<V3[][]>(() => [ride('h2a').slice(4), ...[-1.3, -0.4, 0.5, 1.4].map(dx => [[A.x - A.r + 0.4, 3.9, 0.15], [A.x + dx, 4.4, 0.15], [A.x + dx, A.demist, 0.15], [A.x + dx * 0.3, A.y1 + 0.3, 0.15]] as V3[])], [])
  const gasOut = useMemo<V3[][]>(() => [ride('a2t'), [[TAIL.x, 3.2, TAIL.r + 0.15], [TAIL.x, 12.8, TAIL.r + 0.15]], ride('t2s')], [])
  const lost = liq === 'water' ? 0.4 : 0.001
  const inColor = (u: number, p: number, i: number) => {
    if (i % 2 === 0) return GAS.air
    if (p === 0) return GAS.so3
    // 往上走，SO₃ 一颗颗被吸收掉
    const k = Math.min(1, Math.max(0, (u - 0.2) / 0.5))
    return ((i * 7) % 20) / 20 < 1 - (1 - lost) * k ? GAS.so3 : GAS.air
  }
  const outColor = (_u: number, p: number, i: number) => (i % 9 === 0 && !(tail && p > 0) ? GAS.so2 : i % 5 === 0 && liq === 'water' ? GAS.water : mix(GAS.air, '#ffffff', 0.2))
  const tailNow = tail ? tailAfter(X) : tailSO2(X)
  const labels: Label[] = [
    { id: 'n', at: [A.x, A.y1 + 3.0, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '吸收塔' },
    { id: 'n1', at: [A.x - A.r - 0.2, (A.pack[0] + A.pack[1]) / 2, 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '瓷环填料' },
    { id: 'n2', at: [A.x - A.r - 0.2, A.spray, 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '分酸管' },
    { id: 'n3', at: [A.x - A.r - 0.2, A.demist + 0.15, 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '除沫层' },
    { id: 'n4', at: [TAIL.x, 7.4, TAIL.r + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '尾气吸收塔（氨水）' },
    { id: 'so3', at: [A.x - A.r - 1.6, 4.8, 0.7], ax: 1, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${GAS.so3}` }, children: <><small>进</small>SO₃（从塔底）</> },
    { id: 'liq', at: [A.x + A.r + 0.6, A.spray + 0.5, 0.3], ax: 0, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${liq === 'water' ? GAS.cold : GAS.acid}` }, children: <><small>从塔顶淋下</small>{ABSORB[liq].name}</> },
    { id: 'pool', at: [A.x + 0.2, 2.5, 0.2], ax: 0.5, className: 'scene-tag', children: <><small>塔底</small>{liq === 'water' ? '稀硫酸' : '更浓的硫酸'}</> },
    ...(rate !== null ? [{ id: 'rate', at: [A.x + 0.2, 9.2, 0.3] as V3, ax: 0.5, className: `scene-tag ${liq === 'acid' ? 'key' : ''} -translate-y-1/2`, children: <><small>SO₃ 吸收率（示意）</small>{rate}%{mist && <span className="delta">有酸雾</span>}</> }] : []),
    { id: 'tail', at: [TAIL.x + 2.0, 9.6, 1.2], ax: 0, className: `scene-tag ${tail ? 'key' : ''} -translate-y-1/2`, children: <><small>去烟囱的尾气 · SO₂</small>约 {fmt2(tailNow)}%</> },
  ]
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="吸收塔"
      stage={<Place at="l6" labels={labels} cut="abs">
        <Pool at={[A.x, A.pool, 0]} r={A.r - 0.52} color={liq === 'water' ? '#b9c9c9' : '#d8c98a'} />
        <Spray on color={liq === 'water' ? '#bfe0ff' : GAS.acid} />
        <Flow paths={gasIn} density={1.4} speed={2.4} size={0.11} jitter={0.12} color={inColor} on={on ? 1 : 0} />
        <Flow paths={gasOut} density={1.3} speed={3} size={0.12} color={outColor} on={on ? 1 : 0} />
        <Mist at={[A.x, 13.6, -0.9]} size={[3.2, 6.4, 1.4]} n={22} r={0.75} on={mist && go.busy ? 1 : mist ? 0.55 : 0} opacity={0.2} rise={0.5} />
        <pointLight position={[A.x - 2, 10, 9]} intensity={2.2} distance={26} decay={0} color="#fff4e6" />
      </Place>}
      lesson={<LessonBlock no="6" title="吸收和尾气" concept="用浓硫酸吸收 SO₃，尾气要处理" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>第三步在<b className="text-white">吸收塔</b>里进行：<span className="font-formula">SO₃ + H₂O ＝ H₂SO₄</span>。</p>
          <p className="mt-3">如果直接用水吸收，SO₃ 和水反应放出大量的热，容易形成<b className="text-white">酸雾</b>，吸收速率慢、不完全。所以工业上用 <b className="text-white">98.3% 的浓硫酸</b>来吸收，再稀释成各种浓度的产品。</p>
          <p className="mt-3">塔里装着瓷环填料。气体从塔底进，浓硫酸从塔顶淋下，两者<b className="text-white">逆流</b>，在填料表面充分接触。</p>
          <p className="mt-3">从吸收塔出来的<b className="text-white">尾气</b>里还有少量 SO₂，直接排放会污染大气。可以用氨水吸收：<span className="font-formula">SO₂ + 2NH₃·H₂O ＝ (NH₄)₂SO₃ + H₂O</span>。尾气里 SO₂ 的含量是按转化率 {X}% 做物料衡算得到的；吸收率和氨水吸收后的含量是示意。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">用 98.3% 的浓硫酸吸收 SO₃；尾气处理后再排放</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">用水吸收会形成酸雾，吸收慢而不完全。气体和酸在填料里逆流接触。尾气中约 {fmt2(tailSO2(X))}% 的 SO₂ 用氨水吸收，既防止污染，又回收了硫。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">SO₃ 的吸收率（示意）· {ABSORB[liq].name}</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{rate ?? '—'}<span className="ml-1 text-[18px] font-medium text-white/55">%</span></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="酸雾" value={!on ? '—' : mist ? '有' : '没有'} unit="塔里的现象" />
          <ParamTile symbol="SO₂" value={`约 ${fmt2(tailNow)}%`} unit={tail ? '尾气 · 氨水吸收后' : '尾气 · 未处理'} />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">两种吸收剂</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">吸收剂</th><th className="font-normal">酸雾</th><th className="pr-2 text-right font-normal">吸收率（示意）</th></tr></thead>
          <tbody>{(Object.keys(ABSORB) as Liquid[]).map(k => <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5">{ABSORB[k].name}</td><td>{seen[k] ? (ABSORB[k].mist ? '有' : '没有') : '—'}</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{seen[k] ? `${ABSORB[k].rate}%` : '—'}</td></tr>)}</tbody>
        </table>
        <p className="mt-4 font-formula text-[14.5px] text-white/85">SO₃ + H₂O ＝ H₂SO₄</p>
        <p className="mt-1.5 font-formula text-[13px] text-white/65">SO₂ + 2NH₃·H₂O ＝ (NH₄)₂SO₃ + H₂O</p>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} disabled={go.busy} onClick={() => go.run()}>通入 SO₃</LabButton>
        <LabButton primary={next === 'tail'} pulse={next === 'tail'} disabled={go.busy || tail} onClick={openTail}>开尾气吸收</LabButton>
      </>}
      extras={
        <Control label="吸收剂">
          <Segmented label="吸收剂" pulse={next === 'seg'} want={want} disabled={go.busy} value={liq} onChange={k => choose(k as Liquid)} options={(Object.keys(ABSORB) as Liquid[]).map(k => ({ value: k, label: ABSORB[k].name }))} />
        </Control>
      }
    />
  )
}
