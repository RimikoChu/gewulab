// 接触法制硫酸 · 第 1 课 沸腾炉造气。沸腾炉朝镜头剖开：钢壳里砌着耐火砖，底下是风室，分布板上一排排风帽。
// 先用块矿鼓风 10 s，再换矿粉：矿粉被气流托起来翻滚，像沸腾的液体，烧得又快又透。最后按方程式算 1 t FeS₂ 的产气量。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow, GAS } from './flow'
import { RoastBed } from './fx'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { ORE, T_ROAST, areaTimes, burned, fmt2, slagFromFeS2, so2FromFeS2, type OreKey } from './physics'
import { PIPES, ROAST, ride } from './plant'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'lump', text: '用块矿，鼓入空气 10 s，看烧掉多少', note: `块矿只有表面接触空气，10 s 只烧掉约 ${(burned('lump', T_ROAST) * 100).toFixed(0)}%` },
  { id: 'fine', text: '换成矿粉，再鼓入空气 10 s', note: `矿粉被气流托起来翻滚，和空气充分接触，10 s 烧掉约 ${(burned('fine', T_ROAST) * 100).toFixed(0)}%` },
  { id: 'calc', text: '算出 1 t FeS₂ 能得到多少 SO₂', note: `1 t FeS₂ 完全焙烧，得 SO₂ ${fmt2(so2FromFeS2(1))} t` },
]
const SEC = 6
const R = ROAST

export default function Lesson1() {
  const T = useTasks('gewu:sulfuric:1', TASKS)
  const [ore, setOre] = useState<OreKey>('lump')
  const [seen, setSeen] = useState<Partial<Record<OreKey, boolean>>>({})
  const [calc, setCalc] = useState(false)
  const go = useRun(SEC, () => { setSeen(s => ({ ...s, [ore]: true })); T.check(id => id === ore) })
  const t = go.k * T_ROAST, burn = burned(ore, t)
  const resetAll = () => { setOre('lump'); setSeen({}); setCalc(false); go.snap(0); T.reset() }
  const choose = (k: OreKey) => { if (go.busy) return; setOre(k); go.snap(0) }
  const compute = () => { if (calc) return; setCalc(true); T.check(id => id === 'calc') }

  const task = T.current?.id
  const want: OreKey | null = task === 'lump' ? 'lump' : task === 'fine' ? 'fine' : null
  const next: 'seg' | 'go' | 'calc' | null = !task || go.busy ? null : task === 'calc' ? 'calc' : ore !== want ? 'seg' : 'go'
  const hint = !task ? '矿石粉碎、鼓入空气，都是为了烧得又快又透。'
    : go.busy ? (ore === 'fine' ? '矿粉像沸腾的液体一样翻滚，整层烧得通红…' : '块矿堆在分布板上，只有表面在烧…')
    : task === 'calc' ? '按化学方程式，算 1 t FeS₂ 能得到多少 SO₂'
    : ore !== want ? `把矿料换成“${ORE[want!].name}”`
    : ore === 'lump' ? '炉里装的是块矿。从炉底鼓入空气' : '炉里换成了矿粉。从炉底鼓入空气'

  // 空气从风室穿过分布板往上；炉气从沸腾层升到扩大段，由侧面的出口出去
  const air = useMemo<V3[][]>(() => [[...PIPES.air.pts, [R.x - 1.2, 2.6, -0.2], [R.x - 1.2, R.yg + 0.3, -0.2]], ...[-0.4, 0.5, 1.4].map(x => [[R.x - 1.6, 2.5, -0.3], [R.x + x, 2.5, -0.3], [R.x + x, R.yg + 0.3, -0.3]] as V3[])], [])
  const gas = useMemo<V3[][]>(() => [-1.3, -0.3, 0.8].map(x => [[R.x + x, R.yg + 3.6, -0.4], [R.x + x * 1.3, 12.5, -0.5], [R.x + 1.4 + x * 0.3, 14.5, -0.3], [R.x + R.R - 0.3, 14.8, 0.3], ...ride('r2c')] as V3[]), [])
  const strength = go.busy ? (ore === 'fine' ? 1 : 0.4) : 0
  const pct = (burn * 100).toFixed(0)
  const labels: Label[] = [
    { id: 'n', at: [R.x, R.y1 + 2.0, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '沸腾炉' },
    { id: 'n1', at: [R.x - R.R - 0.3, 14.4, 0], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '扩大段' },
    { id: 'n2', at: [R.x - R.r - 0.5, R.yg, 0], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '分布板和风帽' },
    { id: 'n3', at: [R.x - 0.2, 2.1, 0.1], ax: 0.5, name: true, className: 'scene-name', children: '风室' },
    { id: 'n4', at: [R.x + R.r + 0.2, 8.4, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '耐火砖内衬' },
    { id: 'air', at: [R.x - R.r - 2.6, 2.0, 0.4], ax: 1, className: 'scene-tag', style: { borderLeft: `4px solid ${GAS.air}` }, children: <><small>进</small>空气</> },
    { id: 'so2', at: [R.x + R.R + 1.0, 15.8, 0], ax: 0, className: `scene-tag ${go.busy ? 'key' : ''} -translate-y-full`, style: go.busy ? undefined : { borderLeft: `4px solid ${GAS.so2}` }, children: <><small>出</small>炉气（含 SO₂）</> },
    { id: 'slag', at: [R.x + R.r + 2.6, 2.0, 0.9], ax: 0, className: 'scene-tag', children: <><small>排</small>炉渣 Fe₂O₃</> },
    { id: 'bed', at: [R.x + 0.2, R.yg + (ore === 'fine' && go.busy ? 6.2 : 2.5), 0.1], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{ORE[ore].name} · 已烧掉（示意）</small>{pct}%</> },
  ]
  const row = (k: OreKey) => <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5">{ORE[k].name}</td><td className="tabular-nums">约 {ORE[k].d} mm</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{seen[k] ? `${(burned(k, T_ROAST) * 100).toFixed(0)}%` : '—'}</td></tr>
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="沸腾炉"
      stage={<Place at="l1" labels={labels} cut="roast">
        <RoastBed ore={ore} blow={go.busy} burn={burn} />
        <Flow paths={air} density={1.6} speed={3.2} size={0.085} color={() => GAS.air} on={go.busy ? 1 : 0} />
        <Flow paths={gas} density={1.5} speed={2.6} size={0.1} jitter={0.18} color={() => GAS.so2} on={strength} />
        <pointLight position={[R.x - 1, 9, 7]} intensity={2.0} distance={22} decay={0} color="#fff1e0" />
      </Place>}
      lesson={<LessonBlock no="1" title="沸腾炉造气" concept="矿石粉碎、鼓入空气，烧得又快又透" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>工业上制硫酸分三步：造气、催化氧化、吸收。第一步在<b className="text-white">沸腾炉</b>里进行，把硫铁矿（主要成分 FeS₂）焙烧成二氧化硫：</p>
          <p className="mt-2 font-formula text-[15px] text-white/90">4FeS₂ + 11O₂ <span className="text-[12px]">高温</span>＝ 2Fe₂O₃ + 8SO₂</p>
          <p className="mt-3">矿石先<b className="text-white">粉碎</b>：同样质量的矿石，粒径碎到原来的十分之一，表面积就变成原来的 {areaTimes(ORE.lump.d, ORE.fine.d)} 倍，和空气的接触面积大大增加。空气从炉底<b className="text-white">鼓入</b>，把矿粒托起来，像沸腾的液体一样翻滚，“沸腾炉”由此得名。</p>
          <p className="mt-3">这两条措施都是加快反应、让矿石烧得更充分。烧掉的比例是按简化的模型画的示意。也可以用硫黄作原料：S + O₂ ＝ SO₂（点燃）。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">粉碎矿石、鼓入空气：增大接触面积，烧得又快又透</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">同样鼓风 10 s，块矿烧掉约 {(burned('lump', T_ROAST) * 100).toFixed(0)}%，矿粉约 {(burned('fine', T_ROAST) * 100).toFixed(0)}%（示意）。4FeS₂ + 11O₂ ＝ 2Fe₂O₃ + 8SO₂：1 t FeS₂ 得 SO₂ {fmt2(so2FromFeS2(1))} t，留下炉渣 Fe₂O₃ {fmt2(slagFromFeS2(1))} t。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">{ORE[ore].name} · 已烧掉（示意）</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{pct}<span className="ml-1 text-[18px] font-medium text-white/55">%</span></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="t" value={t.toFixed(1)} unit="s · 鼓风时间" />
          <ParamTile symbol="d" value={`约 ${ORE[ore].d}`} unit="mm · 粒径（示意）" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">鼓风 10 s 烧掉的比例（示意）</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">矿料</th><th className="font-normal">粒径</th><th className="pr-2 text-right font-normal">烧掉</th></tr></thead>
          <tbody>{row('lump')}{row('fine')}</tbody>
        </table>
        <p className="mt-4 font-formula text-[14.5px] text-white/85">4FeS₂ + 11O₂ ＝ 2Fe₂O₃ + 8SO₂</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ParamTile symbol="SO₂" value={calc ? fmt2(so2FromFeS2(1)) : '—'} unit="t · 每吨 FeS₂" />
          <ParamTile symbol="Fe₂O₃" value={calc ? fmt2(slagFromFeS2(1)) : '—'} unit="t · 每吨 FeS₂" />
        </div>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} disabled={go.busy} onClick={() => go.run()}>鼓入空气</LabButton>
        <LabButton primary={next === 'calc'} pulse={next === 'calc'} disabled={go.busy || calc} onClick={compute}>算产气量</LabButton>
      </>}
      extras={
        <Control label="矿料">
          <Segmented label="矿料" pulse={next === 'seg'} want={want} disabled={go.busy} value={ore} onChange={k => choose(k as OreKey)} options={(Object.keys(ORE) as OreKey[]).map(k => ({ value: k, label: ORE[k].name }))} />
        </Control>
      }
    />
  )
}
