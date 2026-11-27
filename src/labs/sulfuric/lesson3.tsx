// 接触法制硫酸 · 第 3 课 接触室里的催化氧化。接触室朝镜头剖开：四层黄褐色的钒催化剂，每层下面是篦子板和托梁，层间一排换热管。
// 先不装催化剂通一次气，再装上催化剂通一次：有催化剂时转化率很快升上去，但停在 97.5% 不再变，反应是可逆的。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow, GAS, mix } from './flow'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { P3, T3, T_RUN, conv3, fmt1, left3, rates3, xTable, type Cat } from './physics'
import { CONV, ride } from './plant'
import { COL, MiniChart, type ChartSpec } from './screen'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'none', text: '不装催化剂，通入原料气', note: `没有催化剂，反应极慢：同样的时间只转化了约 ${fmt1(conv3('none', T_RUN))}%` },
  { id: 'cat', text: '装上 V₂O₅ 催化剂，再通一次', note: '有了催化剂，转化率很快升上去，然后停住不再变：达到了平衡' },
  { id: 'rec', text: '记下平衡时的转化率', note: `平衡转化率 ${fmt1(xTable(T3, P3))}%，还有 ${fmt1(left3())}% 的 SO₂ 没有转化：反应是可逆的` },
]
const SEC = 7, N = 120
const XS = Array.from({ length: N + 1 }, (_, i) => i / N * T_RUN)
const C = CONV, NAMES = ['一段', '二段', '三段', '四段']

export default function Lesson3() {
  const T = useTasks('gewu:sulfuric:3', TASKS)
  const [cat, setCat] = useState<Cat>('none')
  const [seen, setSeen] = useState<Partial<Record<Cat, boolean>>>({})
  const [rec, setRec] = useState(false)
  const go = useRun(SEC, () => { setSeen(s => ({ ...s, [cat]: true })); T.check(id => id === cat) })
  const t = go.k * T_RUN, x = conv3(cat, t), r = rates3(cat, t)
  const resetAll = () => { setCat('none'); setSeen({}); setRec(false); go.snap(0); T.reset() }
  const choose = (k: Cat) => { if (go.busy) return; setCat(k); go.snap(0) }
  const record = () => { if (rec || !(cat === 'cat' && go.k >= 1)) return; setRec(true); T.check(id => id === 'rec') }

  const task = T.current?.id
  const want: Cat | null = task === 'none' ? 'none' : task ? 'cat' : null
  const next: 'seg' | 'go' | 'rec' | null = !task || go.busy ? null : cat !== want ? 'seg' : task === 'rec' ? (go.k >= 1 ? 'rec' : 'go') : 'go'
  const hint = !task ? '催化剂只改变反应的快慢，不改变平衡。'
    : go.busy ? (cat === 'cat' ? '气体穿过催化剂层，黄色的 SO₂ 一层层变成青绿色的 SO₃…' : '没有催化剂，气体穿过去几乎没有变化…')
    : cat !== want ? `换成“${want === 'cat' ? '装 V₂O₅' : '不装催化剂'}”`
    : task === 'rec' && go.k >= 1 ? '转化率不再上升了。记下平衡时的转化率'
    : cat === 'none' ? '接触室里没有装催化剂。通入原料气' : '四层催化剂装好了。通入原料气'

  // 气流：从顶上进来，往下一层层穿过催化剂，从底部侧面出去。贴着剖面走
  const paths = useMemo<V3[][]>(() => [
    [...ride('h2c'), [C.x, C.y1 + 1.0, 0.2]],
    ...[-3, -1.6, -0.3, 1.0, 2.3, 3.3].map(dx => [[C.x + dx * 0.15, C.y1 + 1.2, 0.15], [C.x + dx, C.y1 - 0.5, 0.15], [C.x + dx, 4.2, 0.15], [C.x + dx * 0.6 - 0.8, 3.7, 0.15], [C.x - C.r + 0.3, 3.9, 0.15]] as V3[]),
    [[C.x - C.r - 0.6, 3.9, 0.7], ...ride('c2h').slice(1)],
  ], [])
  const kx = x / 100
  const color = (u: number, p: number, i: number) => {
    if (i % 3 === 0) return GAS.air                                    // 三颗里一颗是氧气和氮气
    if (p === 0) return GAS.so2
    if (p === 7) return mix(GAS.so2, GAS.so3, kx > (i % 10) / 10 ? 1 : 0)
    // 穿过四层催化剂：越往下，变成 SO₃ 的越多
    const depth = Math.min(1, Math.max(0, (u - 0.12) / 0.68))
    return mix(GAS.so2, GAS.so3, kx * depth > ((i * 7) % 10) / 10 ? 1 : 0)
  }
  const n = Math.round(go.k * N)
  const line = (k: Cat, upto: number) => ({ color: k === 'cat' ? COL.cat : COL.none, xs: XS.slice(0, upto + 1), ys: XS.slice(0, upto + 1).map(v => conv3(k, v)) })
  const spec: ChartSpec = {
    x: { max: T_RUN, label: '时间', ticks: [] }, y: { max: 100, label: 'SO₂ 的转化率 / %', ticks: [0, 25, 50, 75, 100] },
    lines: (['none', 'cat'] as Cat[]).map(k => line(k, k === cat ? n : seen[k] ? N : 0)),
    hline: seen.cat || (cat === 'cat' && go.k > 0.5) ? xTable(T3, P3) : undefined,
    dots: go.k > 0 ? [{ x: t, y: x, color: cat === 'cat' ? COL.cat : COL.none }] : [],
  }
  const labels: Label[] = [
    { id: 'n', at: [C.x + C.r + 0.3, 6.6, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '接触室（保温层）' },
    ...C.beds.map(([ya, yb], i) => ({ id: `b${i}`, at: [C.x - C.r - 0.2, (ya + yb) / 2, 0.1] as V3, ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: cat === 'cat' ? `${NAMES[i]}催化剂层（V₂O₅）` : `${NAMES[i]}篦子板（没装催化剂）` })),
    { id: 'hx', at: [C.x + C.r + 0.2, 12.4, 0.1], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '层间换热管' },
    { id: 'in', at: [C.x + 1.4, C.y1 + 1.3, 0.6], ax: 0, className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${GAS.so2}` }, children: <><small>进</small>SO₂、O₂（{T3} °C）</> },
    { id: 'out', at: [C.x - C.r - 1.6, 4.7, 0.6], ax: 1, className: `scene-tag ${go.k > 0 ? 'key' : ''} -translate-y-full`, children: <><small>出口转化率</small>{fmt1(x)}%</> },
  ]
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="接触室"
      stage={<Place at="l3" labels={labels} cut="conv" beds={cat === 'cat'} hot={cat === 'cat' && go.k > 0 ? 0.5 : 0}>
        <Flow paths={paths} density={1.5} speed={2.8} size={0.12} jitter={0.1} color={color} on={go.busy || go.k >= 1 ? 1 : 0} />
        <pointLight position={[C.x - 2, 10, 9]} intensity={2.4} distance={26} decay={0} color="#fff4e6" />
      </Place>}
      lesson={<LessonBlock no="3" title="接触室里的催化氧化" concept="催化剂让反应变快，但转化不到 100%" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>第二步在<b className="text-white">接触室</b>里进行：净化后的 SO₂ 和空气里的 O₂ 在催化剂表面接触，生成 SO₃。“接触法”由此得名。</p>
          <p className="mt-2 font-formula text-[15px] text-white/90">2SO₂ + O₂ ⇌ 2SO₃（催化剂 V₂O₅，加热）</p>
          <p className="mt-3">这是一个<b className="text-white">放热的可逆反应</b>：SO₂ 不能全部变成 SO₃，反应进行到正、逆反应速率相等时，转化率就不再改变。{T3} °C、常压下，SO₂ 的平衡转化率是 {fmt1(xTable(T3, P3))}%。</p>
          <p className="mt-3"><b className="text-white">催化剂</b>（五氧化二钒）大大加快反应，但不能使平衡移动，不改变平衡转化率。曲线的快慢和速率的相对大小是按简化的模型画的示意；平衡转化率取自教材的数据表（原料气中 SO₂ 7%、O₂ 11%、N₂ 82%）。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">2SO₂ + O₂ ⇌ 2SO₃：催化剂加快反应，不改变平衡</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{T3} °C、常压下，装了 V₂O₅ 转化率很快到 {fmt1(xTable(T3, P3))}% 就不再上升，还有 {fmt1(left3())}% 的 SO₂ 没有转化；不装催化剂，同样的时间只有约 {fmt1(conv3('none', T_RUN))}%（示意）。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">SO₂ 的转化率</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmt1(x)}<span className="ml-1 text-[18px] font-medium text-white/55">%</span></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol={<span style={{ color: COL.fwd }}>v正</span>} value={go.k > 0 ? r.fwd.toFixed(3) : '—'} unit="相对值 · 示意" />
          <ParamTile symbol={<span style={{ color: COL.rev }}>v逆</span>} value={go.k > 0 ? r.rev.toFixed(3) : '—'} unit="相对值 · 示意" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">转化率-时间 <span style={{ color: COL.none }}>— 不装催化剂</span> <span style={{ color: COL.cat }}>— 装 V₂O₅</span></h2>
        <MiniChart spec={spec} height={160} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ParamTile symbol="平衡" value={rec ? `${fmt1(xTable(T3, P3))}%` : '—'} unit="转化率" />
          <ParamTile symbol="剩余" value={rec ? `${fmt1(left3())}%` : '—'} unit="没有转化的 SO₂" />
        </div>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} disabled={go.busy} onClick={() => go.run()}>通入原料气</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} disabled={go.busy || rec || !(cat === 'cat' && go.k >= 1)} onClick={record}>记录平衡转化率</LabButton>
      </>}
      extras={
        <Control label="催化剂">
          <Segmented label="催化剂" pulse={next === 'seg'} want={want} disabled={go.busy} value={cat} onChange={k => choose(k as Cat)} options={[{ value: 'none', label: '不装催化剂' }, { value: 'cat', label: '装 V₂O₅' }]} />
        </Control>
      }
    />
  )
}
