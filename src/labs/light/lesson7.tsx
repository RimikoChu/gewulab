// 光的波动性和光电效应 · 第 7 课 光电子最多带走多少能量（遏止电压和爱因斯坦光电效应方程）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Dark, useSpace } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { P, PhotoRig } from './photo'
import { H, LIGHTS, W0, ekMax, freq14, photoCurrent, photonEV, planckFrom, stopU, toEV, type LightKey } from './physics'
import { StopChart } from './views'
import { VOICE } from './voice'

type C = 'green' | 'blue' | 'violet'
const KEYS: C[] = ['green', 'blue', 'violet']
const U = (c: LightKey) => stopU(LIGHTS[c].nm)
const TASKS: Task[] = [
  { id: 'blue:1', text: '蓝光：加反向电压，直到电流刚好为零，记下遏止电压', note: `${U('blue').toFixed(2)} V：最快的光电子也刚好到不了阳极` },
  { id: 'blue:2', text: '电压不动，把蓝光调强一倍，看电流变不变，再记一次', note: `电流还是零，遏止电压还是 ${U('blue').toFixed(2)} V：遏止电压和光强无关` },
  { id: 'violet:1', text: '换成紫光（弱光），再测一次', note: `${U('violet').toFixed(2)} V：频率高了，遏止电压变大` },
  { id: 'green:1', text: '换成绿光，再测一次', note: `${U('green').toFixed(2)} V：三个点落在一条直线上` },
]

export default function Lesson7() {
  const [c, setC] = useState<C>('blue')
  const [strong, setStrong] = useState(false)
  const [applied, setApplied] = useState(false)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:light:7', TASKS)
  const { nm, hex, name } = LIGHTS[c], uc = stopU(nm), level = strong ? 2 : 1
  const goal = applied ? uc : 0, u = useSlide(goal, 0.2), lv = useSlide(level, 1.6), steady = u === goal && lv === level
  const key = `${c}:${level}`, dup = rows.includes(key), cur = photoCurrent(nm, lv, u), atStop = applied && u === uc
  const record = () => { if (!atStop || !steady || dup) return; const next = [...rows, key]; setRows(next); T.check(k => next.includes(k)) }
  const pick = (k: C) => { setC(k); setApplied(false) }
  useSpace(record)
  const resetAll = () => { setC('blue'); setStrong(false); setApplied(false); setRows([]); T.reset() }
  const task = T.current, [tc, tl] = (task?.id ?? ':').split(':')
  const { hint, next }: { hint: string; next: 'c' | 'lv' | 'u' | 'record' | null } = !task ? { hint: '都测完了。遏止电压只跟频率有关：Ek = hν − W0。', next: null }
    : c !== tc ? { hint: `把光换成${LIGHTS[tc as C].name}`, next: 'c' }
    : String(level) !== tl ? { hint: tl === '2' ? '按“把光调强”' : '按“把光调弱”', next: 'lv' }
    : !applied ? (u === 0 && steady ? { hint: '按“加反向电压”，一直加到电流刚好为零', next: 'u' } : { hint: '电压在往回调…', next: null })
    : !atStop ? { hint: '电压在升，电流在变小…', next: null }
    : !steady ? { hint: '光在变…', next: null }
    : { hint: '电流刚好为零。读出电压表的示数，按“记录”', next: 'record' }
  const pts = [...new Set(rows.map(k => k.split(':')[0] as C))].map(k => ({ nm: LIGHTS[k].nm, u: U(k), hex: LIGHTS[k].hex }))
  const two = pts.length >= 2 ? [...pts].sort((a, b) => b.nm - a.nm) : null
  const labels: Label[] = [
    { id: 'src', at: [P.src[0], P.beamY + 0.4, P.src[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{name}</small>{freq14(nm).toFixed(2)}×10¹⁴ Hz</> },
    { id: 'k', at: [P.tube[0] + 0.3, 2.28, P.tube[2]], name: true, className: 'scene-name -translate-y-full', children: '阴极 K' },
    { id: 'a', at: [P.tube[0] - 0.1, 2.28, P.tube[2]], ax: 1, name: true, className: 'scene-name -translate-y-full', children: '阳极 A' },
    { id: 'amp', at: [P.amp[0], 1.98, P.amp[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>微安表</small>{cur.toFixed(1)} μA</> },
    { id: 'volt', at: [P.volt[0], 1.98, P.volt[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>反向电压</small>{u.toFixed(2)} V</> },
    { id: 'sup', at: [P.supply[0], 1.42, P.supply[2] + 0.3], ax: 0.5, name: true, className: 'scene-name', children: '直流电源（反接）' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title={TITLE} lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电源和光源"
      stage={<Dark at="photo" dx={0.05} dy={0.32} span={[4.85, 1.9]} view={[0.14, 0.3]} lamp={110} labels={labels}>
        <PhotoRig hex={hex} level={lv} emit={lv / 2} stop={uc > 0 ? u / uc : 0} amp={cur / 30} volt={u / 1.5} reverse />
      </Dark>}
      lesson={<LessonBlock no="7" title="遏止电压和光子" concept="Ek = hν − W₀：最大初动能只由频率决定" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>给光电管加<b className="text-white">反向电压</b>，光电子飞向阳极时被减速。电压加到 <i>U</i><sub>c</sub> 时，连最快的光电子也到不了阳极，光电流为零。<i>U</i><sub>c</sub> 叫<b className="text-white">遏止电压</b>：<i>eU</i><sub>c</sub> = <i>E</i><sub>k</sub>。</p>
          <p className="mt-3">爱因斯坦的解释：光的能量是一份一份的，每一份叫一个<b className="text-white">光子</b>，能量 ε = <i>h</i>ν。一个电子吸收一个光子，克服金属的束缚（至少要做<b className="text-white">逸出功</b> <i>W</i>₀）之后逸出：</p>
          <p className="font-formula my-2 text-center text-[19px] text-white"><i>E</i><sub>k</sub> = <i>h</i>ν − <i>W</i>₀</p>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><i>h</i>ν 小于 <i>W</i>₀ 就没有光电子：截止频率 ν<sub>c</sub> = <i>W</i>₀/<i>h</i></li>
            <li>光强只决定每秒来多少个光子，不改变每个光子的能量，所以遏止电压和光强无关</li>
            <li><i>U</i><sub>c</sub>–ν 图线是一条直线，斜率是 <i>h</i>/<i>e</i></li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">干涉、衍射、偏振说明光是波；光电效应说明光又是一份一份的粒子。光既有波动性又有粒子性，叫<b className="text-white">波粒二象性</b>。钾的逸出功取 {toEV(W0).toFixed(2)} eV。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四次都测完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">Ek = hν − W₀：遏止电压只跟频率有关，和光强无关</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">绿光 {U('green').toFixed(2)} V、蓝光 {U('blue').toFixed(2)} V、紫光 {U('violet').toFixed(2)} V，在图上连成一条直线；由斜率算出 h ≈ {(planckFrom(450, U('blue'), 405, U('violet')) / 1e-34).toFixed(2)}×10⁻³⁴ J·s。光的能量是一份一份的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div><div className="text-[12.5px] text-white/60">反向电压</div><div className="mt-1 text-[36px] leading-none font-bold tracking-tight tabular-nums">{u.toFixed(2)}<span className="ml-1 text-[14px] font-medium text-white/55">V</span></div></div>
            <div><div className="text-[12.5px] text-white/60">光电流</div><div className="mt-1 text-[36px] leading-none font-bold tracking-tight tabular-nums">{cur.toFixed(1)}<span className="ml-1 text-[14px] font-medium text-white/55">μA</span></div></div>
          </div>
          <StopChart pts={pts} line={pts.length >= 2} />
          {two && <p className="mt-2 text-[13px] leading-relaxed text-white/75">由图线的斜率：h = e·ΔU<sub>c</sub>/Δν ≈ <b className="text-[#7fe3d4]">{(planckFrom(two[0].nm, two[0].u, two[two.length - 1].nm, two[two.length - 1].u) / 1e-34).toFixed(2)}×10⁻³⁴ J·s</b></p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="hν" value={`${photonEV(nm).toFixed(2)} eV`} unit={`一个${name}光子的能量`} />
            <ParamTile symbol={<>W<sub>0</sub></>} value={`${toEV(W0).toFixed(2)} eV`} unit="钾的逸出功" />
            <ParamTile symbol={<>E<sub>k</sub></>} value={`${ekMax(nm).toFixed(2)} eV`} unit="最大初动能 hν − W₀" />
            <ParamTile symbol={<>U<sub>c</sub></>} value={`${uc.toFixed(2)} V`} unit={rows.some(k => k.startsWith(c)) ? '遏止电压（已测）' : '遏止电压（算出来的）'} />
          </div>
          <p className="mt-3 text-[12px] text-white/45">h = {(H / 1e-34).toFixed(2)}×10⁻³⁴ J·s</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'u'} onClick={() => setApplied(a => !a)} disabled={!steady}>{applied ? '把电压调回零' : '加反向电压'}</LabButton>
        <LabButton pulse={next === 'lv'} onClick={() => setStrong(s => !s)} disabled={!steady}>{strong ? '把光调弱' : '把光调强'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!atStop || !steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="照射的光"><Segmented label="照射的光" pulse={next === 'c'} want={next === 'c' ? tc as C : null} value={c} onChange={pick} options={KEYS.map(k => ({ value: k, label: LIGHTS[k].name }))} /></Control>}
    />
  )
}
