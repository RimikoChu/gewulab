// 接触法制硫酸 · 拓展课 热和料的两笔账。
// 热的账：接触室西侧的热交换器朝镜头剖开，反应后的热气走管外往下，还没反应的冷气走管里往上，隔着管壁把热传过去。
// 料的账：最东头的成品酸罐和装车台，按关系式 FeS₂ ~ 2H₂SO₄ 算 100 t 矿石能出多少酸，装一车运走。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow, GAS, mix } from './flow'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useRun, type V3 } from './parts'
import { HX, acidFromOre, exchange } from './physics'
import { HXV, ride } from './plant'
import { LOAD, TANKS } from './site'
import { Place } from './world'

type Site = 'hx' | 'tank'
const FULL = exchange(HX.hot, HX.cold, HX.eff)
const ORE_T = 100, ORE_W = 0.6
const TASKS: Task[] = [
  { id: 'hx', text: '开热交换器，看两股气体的温度', note: `反应放出的热把冷的原料气预热到约 ${FULL.coldOut.toFixed(0)} °C，热气自己降到约 ${FULL.hotOut.toFixed(0)} °C（示意）` },
  { id: 'tank', text: '到成品酸罐，装一车酸', note: `FeS₂ ~ 2H₂SO₄：${ORE_T} t 含 FeS₂ ${ORE_W * 100}% 的矿石，理论上制 ${acidFromOre(ORE_T, ORE_W).toFixed(0)} t 98% 的硫酸` },
]
const H = HXV

export default function LessonX() {
  const T = useTasks('gewu:sulfuric:x', TASKS)
  const [site, setSite] = useState<Site>('hx')
  const heat = useRun(6, () => T.check(id => id === 'hx'))
  const load = useRun(7, () => T.check(id => id === 'tank'))
  const resetAll = () => { setSite('hx'); heat.snap(0); load.snap(0); T.reset() }
  const busy = heat.busy || load.busy
  const task = T.current?.id as Site | undefined
  const next: 'seg' | 'go' | null = !task || busy ? null : site !== task ? 'seg' : 'go'
  const hint = !task ? '反应热拿来预热原料气；硫元素守恒，矿石里的硫都去了硫酸里。'
    : heat.busy ? '热气走管外往下，冷气走管里往上，隔着管壁换热…'
    : load.busy ? '鹤管放下来，浓硫酸流进槽车…'
    : site !== task ? `换到“${task === 'hx' ? '热交换器' : '成品酸罐'}”`
    : site === 'hx' ? '热交换器还没有投用。开热交换器' : '成品酸存在罐里。装一车酸'

  const eff = HX.eff * ease(seg(heat.k, 0.1, 0.9)), tmp = exchange(HX.hot, HX.cold, eff), kk = eff / HX.eff
  // 冷气：从底下的管箱进来，沿一根根管子往上，从顶上出去到接触室；热气：从侧面上部进来，绕着折流板一层层往下，从背面下部出去
  const cold = useMemo<V3[][]>(() => [[...ride('b2h').slice(2)], ...[-1.0, -0.4, 0.2, 0.8].map(dx => [[H.x - H.r + 0.3, 3.0, 0.14], [H.x + dx, 3.3, 0.14], [H.x + dx, H.s1 + 0.3, 0.14], [H.x, H.y1 + 0.2, 0.14]] as V3[]), [[H.x, H.y1 + 0.9, 0.62], [H.x, 19.6, 0.62]]], [])
  const hot = useMemo<V3[][]>(() => [ride('c2h'), [[H.x + 1.35, 10.6, 0.14], [H.x + 1.1, 9.6, 0.14], [H.x - 1.1, 9.5, 0.14], [H.x - 1.1, 8.3, 0.14], [H.x + 1.1, 8.2, 0.14], [H.x + 1.1, 7.0, 0.14], [H.x - 1.1, 6.9, 0.14], [H.x - 1.1, 5.7, 0.14], [H.x + 1.1, 5.6, 0.14], [H.x + 1.1, 4.5, 0.14], [H.x, 4.3, 0.14]]], [])
  const acid = useMemo<V3[][]>(() => [[[TANKS.x, 0.9, TANKS.z + TANKS.r + 0.2], [TANKS.x, 0.9, LOAD.z - 3.2], [LOAD.x + 0.2, 0.9, LOAD.z - 3.2], [LOAD.x + 0.2, 6.4, LOAD.z - 2.9], [LOAD.x + 0.2, 6.4, LOAD.z], [LOAD.x + 0.2, 3.7, LOAD.z]]], [])
  const made = acidFromOre(ORE_T, ORE_W)
  const temp = (v: number) => `${v.toFixed(0)} °C`
  const labels: Label[] = site === 'hx' ? [
    { id: 'n', at: [H.x + 2.2, H.y1 + 1.2, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '热交换器' },
    { id: 'n1', at: [H.x - H.r - 0.2, 7.8, 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '换热管（冷气走管里）' },
    { id: 'n2', at: [H.x - H.r - 0.2, 6.3, 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '折流板' },
    { id: 'hi', at: [H.x + H.r + 1.6, 11.4, 0.6], ax: 0, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${GAS.hot}` }, children: <><small>热气进（来自接触室）</small>{temp(HX.hot)}</> },
    { id: 'ho', at: [H.x + H.r + 0.3, 4.3, 0.4], ax: 0, className: `scene-tag ${heat.k >= 1 ? 'key' : ''} -translate-y-1/2`, children: <><small>热气出（示意）</small>{temp(tmp.hotOut)}</> },
    { id: 'ci', at: [H.x - H.r - 1.2, 2.2, 0.6], ax: 1, className: 'scene-tag', style: { borderLeft: `4px solid ${GAS.cold}` }, children: <><small>冷气进（来自鼓风机）</small>{temp(HX.cold)}</> },
    { id: 'co', at: [H.x - 0.7, H.y1 + 2.4, 0.6], ax: 1, className: `scene-tag ${heat.k >= 1 ? 'key' : ''} -translate-y-1/2`, children: <><small>冷气出，去接触室（示意）</small>{temp(tmp.coldOut)}</> },
  ] : [
    { id: 't', at: [TANKS.x + TANKS.gap / 2, TANKS.h + 3.6, TANKS.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '成品酸储罐' },
    { id: 'c', at: [LOAD.x + 0.8, 4.4, LOAD.z + 1.3], ax: 0.5, className: `scene-tag ${load.k >= 1 ? 'key' : ''} -translate-y-full`, children: <><small>槽车 · 98% 的浓硫酸</small>{load.k >= 1 ? '装满了' : load.busy ? '正在装' : '空车'}</> },
    { id: 'l', at: [LOAD.x - 3.6, 7.6, LOAD.z - 3.2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '装车台和鹤管' },
  ]
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={site === 'hx' ? '热交换器' : '成品酸罐'}
      stage={<Place at={site === 'hx' ? 'xh' : 'xt'} labels={labels} cut={site === 'hx' ? 'hx' : ''} arm={ease(seg(load.k, 0, 0.15)) - ease(seg(load.k, 0.88, 1))} hot={0.4}>
        {site === 'hx' && <>
          <Flow paths={cold} density={1.7} speed={2.4} size={0.085} on={heat.k > 0 ? 1 : 0} color={(u, p) => (p === 0 ? GAS.cold : p === 5 ? mix(GAS.cold, GAS.hot, kk) : mix(GAS.cold, GAS.hot, kk * u))} />
          <Flow paths={hot} density={2.0} speed={2.4} size={0.095} jitter={0.06} on={heat.k > 0 ? 1 : 0} color={(u, p) => (p === 0 ? GAS.hot : mix(GAS.hot, GAS.cold, kk * u * 0.9))} />
          <pointLight position={[H.x - 1.5, 8, 7]} intensity={2.2} distance={20} decay={0} color="#fff4e6" />
        </>}
        <Flow paths={acid} density={1.6} speed={5} size={0.13} color={() => GAS.acid} on={load.busy && load.k > 0.15 && load.k < 0.88 ? 1 : 0} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="热和料的两笔账" concept="热要回收利用，硫要算清去向" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p><b className="text-white">热的账</b>：SO₂ 的催化氧化是放热反应。从催化剂层出来的气体很热，而进接触室的原料气是冷的、需要预热。让两股气体在<b className="text-white">热交换器</b>里隔着管壁逆向流过，热气把热传给冷气：原料气得到预热，反应后的气体得到冷却，不用另外烧燃料。温度是按“两股气体流量和比热相同、换热效率 {HX.eff}”算的示意。</p>
          <p className="mt-3"><b className="text-white">料的账</b>：三步反应里硫元素守恒，一个 FeS₂ 里的两个硫原子最后进了两个 H₂SO₄，所以有关系式 <span className="font-formula">FeS₂ ~ 2SO₂ ~ 2SO₃ ~ 2H₂SO₄</span>。用它可以一步算出产量，不必一个方程式一个方程式地算。实际生产中每一步都有损失，产量比理论值低。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">反应热预热原料气；FeS₂ ~ 2H₂SO₄</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">热交换器让热气和冷气逆向换热，节约了能源。按关系式，{ORE_T} t 含 FeS₂ {ORE_W * 100}% 的矿石，理论上制 {made.toFixed(0)} t 质量分数为 98% 的硫酸。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        {site === 'hx' ? <>
          <div className="text-[13px] text-white/60">热交换器 · 两股气体的温度（示意）</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol={<span style={{ color: GAS.hot }}>热气进</span>} value={`${HX.hot}`} unit="°C" />
            <ParamTile symbol={<span style={{ color: GAS.hot }}>热气出</span>} value={tmp.hotOut.toFixed(0)} unit="°C" />
            <ParamTile symbol={<span style={{ color: GAS.cold }}>冷气进</span>} value={`${HX.cold}`} unit="°C" />
            <ParamTile symbol={<span style={{ color: GAS.cold }}>冷气出</span>} value={tmp.coldOut.toFixed(0)} unit="°C" />
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">冷气升高的温度和热气降低的温度一样多：热从热气传给了冷气。</p>
        </> : <>
          <div className="text-[13px] text-white/60">关系式</div>
          <p className="mt-1 font-formula text-[16px] text-white/90">FeS₂ ~ 2H₂SO₄</p>
          <p className="mt-1 text-[13px] text-white/55">120 ~ 2 × 98</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="矿石" value={`${ORE_T}`} unit={`t · 含 FeS₂ ${ORE_W * 100}%`} />
            <ParamTile symbol="硫酸" value={load.k >= 1 ? made.toFixed(0) : '—'} unit="t · 质量分数 98%" />
          </div>
        </>}
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={busy || (site === 'hx' ? heat.k > 0 : load.k > 0)} onClick={() => (site === 'hx' ? heat.run() : load.run())}>{site === 'hx' ? '开热交换器' : '装一车酸'}</LabButton>
      </>}
      extras={
        <Control label="去哪里">
          <Segmented label="去哪里" pulse={next === 'seg'} want={task ?? null} disabled={busy} value={site} onChange={k => setSite(k as Site)} options={[{ value: 'hx', label: '热交换器' }, { value: 'tank', label: '成品酸罐' }]} />
        </Control>
      }
    />
  )
}
