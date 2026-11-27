// 酸、碱和中和 · 第 1 课 酸碱指示剂：化验台第 1 格。中间一块白瓷点滴板，两排三个凹穴里预先滴好了三种溶液
// （从左到右：稀盐酸、食盐水、石灰水）；左后方是这三种溶液的细口瓶，右边两只滴瓶装着紫色石蕊溶液和无色酚酞溶液。
// 选一种溶液，往它上排的凹穴滴石蕊、下排的凹穴滴酚酞，看颜色。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { DropBottle, Dropper, Glove, LOOK, NarrowBottle, SpotPlate, Tile, u, wellAt, type Look } from './gear'
import { Drop } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { HUE_NAME, SAMPLES, litmus, phenol, type Hue, type SampleKey } from './physics'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l1, Y = TOP, Z = BZ + 0.1
const KEYS: SampleKey[] = ['acid', 'salt', 'lime']
const PLATE_AT: V3 = [X0, Y, Z + u(0.07)]
const BOT: Record<SampleKey, V3> = { acid: [X0 - u(0.13), Y, Z - u(0.06)], salt: [X0 - u(0.06), Y, Z - u(0.075)], lime: [X0 + u(0.01), Y, Z - u(0.08)] }
const IND = { litmus: [X0 + u(0.085), Y, Z - u(0.07)] as V3, phenol: [X0 + u(0.15), Y, Z - u(0.05)] as V3 }
type Ind = keyof typeof IND
const TASKS: Task[] = [
  { id: 'acid', text: '给稀盐酸滴石蕊和酚酞', note: '石蕊变红，酚酞不变色：酸使紫色石蕊溶液变红' },
  { id: 'lime', text: '给石灰水滴石蕊和酚酞', note: '石蕊变蓝，酚酞变红：碱使石蕊变蓝、使酚酞变红' },
  { id: 'salt', text: '给食盐水滴石蕊和酚酞', note: '石蕊仍是紫色，酚酞不变色：食盐水是中性的' },
]
const lookOf = (h: Hue): Look => h === 'red' ? LOOK.red : h === 'blue' ? LOOK.blue : h === 'purple' ? LOOK.purple : h === 'pink' ? LOOK.pink : LOOK.clear
const IND_NAME: Record<Ind, string> = { litmus: '紫色石蕊溶液', phenol: '无色酚酞溶液' }
const hueOf = (ind: Ind, k: SampleKey) => ind === 'litmus' ? litmus(SAMPLES[k].pH) : phenol(SAMPLES[k].pH)

export default function Lesson1() {
  const [pick, setPick] = useState<SampleKey>('acid')
  const [done, setDone] = useState<Record<string, boolean>>({})     // `${ind}:${sample}` 滴过了
  const [act, setAct] = useState<Ind>('litmus')
  const T = useTasks('gewu:acid:1', TASKS)
  const drip = useRun(2.8, () => {
    const d = { ...done, [`${act}:${pick}`]: true }; setDone(d)
    T.check(id => !!d[`litmus:${id}`] && !!d[`phenol:${id}`])
  })
  const busy = drip.busy
  const go = (ind: Ind) => { if (busy || done[`${ind}:${pick}`]) return; setAct(ind); drip.run() }
  const resetAll = () => { drip.snap(0); setPick('acid'); setDone({}); setAct('litmus'); T.reset() }

  const task = T.current
  const want = (task?.id as SampleKey) ?? pick
  const name = SAMPLES[pick].name
  const { hint, next }: { hint: string; next: 'litmus' | 'phenol' | 'pick' | null } = !task ? { hint: '石蕊遇酸变红、遇碱变蓝；酚酞遇碱变红，遇酸和中性溶液不变色。', next: null }
    : busy ? { hint: act === 'litmus' ? '用胶头滴管滴两滴紫色石蕊溶液…' : '用胶头滴管滴两滴无色酚酞溶液…', next: null }
    : pick !== want ? { hint: `选“${SAMPLES[want].name}”`, next: 'pick' }
    : !done[`litmus:${pick}`] ? { hint: `往${name}里滴紫色石蕊溶液`, next: 'litmus' }
    : { hint: `再往${name}里滴无色酚酞溶液`, next: 'phenol' }

  // 滴管：从滴瓶里拿出来，移到凹穴上方，挤一下，再放回去
  const t = drip.t, k = busy ? ease(seg(t, 0, 1.0)) - ease(seg(t, 1.8, 2.8)) : 0
  const col = KEYS.indexOf(pick), row = act === 'litmus' ? 0 : 1
  const w = wellAt(row, col), wellTop: V3 = [PLATE_AT[0] + u(w[0]), Y + u(0.05), PLATE_AT[2] + u(w[2])]
  const home = (ind: Ind): V3 => [IND[ind][0], Y + u(0.03), IND[ind][2]]
  const dropperAt = (ind: Ind): V3 => busy && act === ind ? liftPath(home(ind), wellTop, Y + u(0.17), k) : home(ind)
  const fillK = (r: number, c: number) => { const ind: Ind = r === 0 ? 'litmus' : 'phenol', key = `${ind}:${KEYS[c]}`; return done[key] ? 1 : busy && act === ind && c === col ? seg(t, 1.45, 2.1) : 0 }
  const fill = [0, 1].map(r => KEYS.map((s, c) => { const ind: Ind = r === 0 ? 'litmus' : 'phenol', f = fillK(r, c); const to = lookOf(hueOf(ind, s)); return { look: f > 0.5 ? to : LOOK.clear, k: 0.55 + 0.35 * f } }))

  const res = (ind: Ind, s: SampleKey) => done[`${ind}:${s}`] ? HUE_NAME[hueOf(ind, s)] : '—'
  const labels: Label[] = [
    ...KEYS.map((s, c) => ({ id: `c${s}`, at: [PLATE_AT[0] + u(wellAt(1, c)[0]), Y, PLATE_AT[2] + u(0.07)] as V3, ax: 0.5, className: pick === s ? 'scene-tag key' : 'scene-name', children: SAMPLES[s].name })),
    { id: 'rL', at: [PLATE_AT[0] - u(0.08), Y + u(0.016), PLATE_AT[2] + u(wellAt(0, 0)[2])], ax: 1, className: 'scene-name -translate-y-1/2', children: '滴石蕊' },
    { id: 'rP', at: [PLATE_AT[0] - u(0.08), Y + u(0.016), PLATE_AT[2] + u(wellAt(1, 0)[2])], ax: 1, className: 'scene-name -translate-y-1/2', children: '滴酚酞' },
    { id: 'n1', at: [IND.litmus[0] + u(0.03), Y + u(0.08), IND.litmus[2]], ax: 0, name: true, className: 'scene-name -translate-y-full', children: '石蕊' },
    { id: 'n2', at: [IND.phenol[0] + u(0.03), Y + u(0.08), IND.phenol[2]], ax: 0, name: true, className: 'scene-name -translate-y-full', children: '酚酞' },
  ]
  const handAt = busy ? dropperAt(act) : null
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="滴指示剂"
      stage={<Place at="l1" labels={labels}>
        <group position={PLATE_AT}><Tile w={0.19} d={0.135} /><group position-y={u(0.006)}><SpotPlate fill={fill} /></group></group>
        {KEYS.map(s => <group key={s} position={BOT[s]} rotation-y={0.2} scale={0.78}><NarrowBottle label={SAMPLES[s].name} band={s === 'acid' ? '#c23a2a' : s === 'lime' ? '#2f6fb3' : '#6a7a84'} look={s === 'lime' ? { ...LOOK.clear, color: '#e6eceb' } : LOOK.clear} /></group>)}
        <group position={IND.litmus} rotation-y={-0.3}><DropBottle label="石蕊" band="#7a3e96" look={LOOK.purple} brown={false} dropper={!(busy && act === 'litmus')} /></group>
        <group position={IND.phenol} rotation-y={-0.3}><DropBottle label="酚酞" band="#c23a6a" look={LOOK.clear} brown dropper={!(busy && act === 'phenol')} /></group>
        {busy && handAt && <group position={handAt}>
          <Dropper fill={t < 1.5 ? 0.4 : 0.15} look={act === 'litmus' ? LOOK.purple : LOOK.clear} />
          <group position={[0, u(0.1), 0]} rotation={[0.25, 0.3, 0.1]}><Glove s={u(0.0055)} /></group>
        </group>}
        {busy && <Drop at={[wellTop[0], wellTop[1], wellTop[2]]} drop={u(0.032)} t={seg(t, 1.0, 1.5)} r={u(0.0022)} color={act === 'litmus' ? '#8a4aa8' : '#e8eef0'} />}
      </Place>}
      lesson={<LessonBlock no="1" title="酸碱指示剂" concept="指示剂遇酸、遇碱显示不同的颜色" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>能跟酸或碱的溶液起作用而显示不同颜色的物质，叫做酸碱指示剂，通常也简称指示剂。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">紫色石蕊溶液</b>：遇酸变红，遇碱变蓝，遇中性溶液仍是紫色</li>
            <li><b className="text-white">无色酚酞溶液</b>：遇碱变红，遇酸和中性溶液不变色</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">只用酚酞分不出酸性溶液和中性溶液：两者都不让它变色。污水厂化验室拿到水样，先用指示剂粗判一下酸碱性，再用 pH 试纸或 pH 计测准。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种溶液都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">指示剂遇酸、遇碱显示不同的颜色</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">石蕊遇酸变红、遇碱变蓝；酚酞遇碱变红，遇酸和中性溶液不变色。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{name}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold">{done[`litmus:${pick}`] || done[`phenol:${pick}`] ? SAMPLES[pick].kind === '中性' ? '中性' : `显${SAMPLES[pick].kind}性` : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">颜色记录</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium"></th>{KEYS.map(s => <th key={s} className="pb-1 font-medium">{SAMPLES[s].name}</th>)}</tr></thead>
            <tbody>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">石蕊</td>{KEYS.map((s, i) => <td key={s} className={i === 2 ? 'rounded-r-lg' : ''}>{res('litmus', s)}</td>)}</tr>
              <tr><td className="px-2 py-1.5 text-left text-white/60">酚酞</td>{KEYS.map(s => <td key={s}>{res('phenol', s)}</td>)}</tr>
            </tbody>
          </table>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'litmus'} pulse={next === 'litmus'} onClick={() => go('litmus')} disabled={busy || !!done[`litmus:${pick}`]}>滴石蕊</LabButton>
        <LabButton primary={next === 'phenol'} pulse={next === 'phenol'} onClick={() => go('phenol')} disabled={busy || !!done[`phenol:${pick}`]}>滴酚酞</LabButton>
      </>}
      extras={
        <Control label="溶液">
          <Segmented label="溶液" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={k => setPick(k as SampleKey)} options={KEYS.map(k => ({ value: k, label: SAMPLES[k].name }))} />
        </Control>
      }
    />
  )
}
