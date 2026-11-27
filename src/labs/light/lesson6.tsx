// 光的波动性和光电效应 · 第 6 课 光打出了电子（光电效应：截止频率、光电流和光强）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Dark, useSpace } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { P, PhotoRig } from './photo'
import { LIGHTS, NU_C, U_FWD, emits, freq14, photoCurrent, type LightKey } from './physics'
import { VOICE } from './voice'

const KEYS: LightKey[] = ['red', 'green', 'blue', 'violet']
const I = (c: LightKey, lv: number) => photoCurrent(LIGHTS[c].nm, lv)
const TASKS: Task[] = [
  { id: 'red:1', text: '用弱的红光照阴极，记下微安表的示数', note: `0 μA：红光 ${freq14(650).toFixed(2)}×10¹⁴ Hz，低于截止频率` },
  { id: 'red:2', text: '把红光调强一倍，再记一次', note: '还是 0 μA：频率不够，光再强也打不出电子' },
  { id: 'green:1', text: '换成弱的绿光，记一次', note: `${I('green', 1).toFixed(0)} μA：频率超过截止频率，马上就有电流` },
  { id: 'green:2', text: '把绿光调强一倍，再记一次', note: `${I('green', 2).toFixed(0)} μA：光强加倍，光电流也加倍` },
]

export default function Lesson6() {
  const [c, setC] = useState<LightKey>('red')
  const [strong, setStrong] = useState(false)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:light:6', TASKS)
  const level = strong ? 2 : 1, lv = useSlide(level, 1.6), steady = lv === level, key = `${c}:${level}`, dup = rows.includes(key)
  const record = () => { if (!steady || dup) return; const next = [...rows, key]; setRows(next); T.check(k => next.includes(k)) }
  useSpace(record)
  const resetAll = () => { setC('red'); setStrong(false); setRows([]); T.reset() }
  const task = T.current, [tc, tl] = (task?.id ?? ':').split(':')
  const { hint, next }: { hint: string; next: 'c' | 'lv' | 'record' | null } = !task ? { hint: '都记完了。有没有电流看频率，电流多大看光强。', next: null }
    : c !== tc ? { hint: `把光换成${LIGHTS[tc as LightKey].name}`, next: 'c' }
    : String(level) !== tl ? { hint: tl === '2' ? '按“把光调强”' : '按“把光调弱”', next: 'lv' }
    : steady ? { hint: '读出微安表的示数，按“记录”', next: 'record' } : { hint: '光在变…', next: null }
  const { nm, hex, name } = LIGHTS[c], cur = photoCurrent(nm, lv), ok = emits(nm)
  const labels: Label[] = [
    { id: 'src', at: [P.src[0], P.beamY + 0.4, P.src[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{name}</small>{freq14(nm).toFixed(2)}×10¹⁴ Hz</> },
    { id: 'tube', at: [P.tube[0], 1.0, P.tube[2] + 0.5], ax: 0.5, name: true, className: 'scene-name', children: '光电管' },
    { id: 'k', at: [P.tube[0] + 0.3, 2.28, P.tube[2]], name: true, className: 'scene-name -translate-y-full', children: '阴极 K（钾）' },
    { id: 'a', at: [P.tube[0] - 0.1, 2.28, P.tube[2]], ax: 1, name: true, className: 'scene-name -translate-y-full', children: '阳极 A' },
    { id: 'amp', at: [P.amp[0], 1.98, P.amp[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>微安表</small>{cur.toFixed(0)} μA</> },
    { id: 'volt', at: [P.volt[0], 1.98, P.volt[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>电压表</small>{U_FWD.toFixed(1)} V</> },
    { id: 'sup', at: [P.supply[0], 1.42, P.supply[2] + 0.3], ax: 0.5, name: true, className: 'scene-name', children: '直流电源（正向）' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title={TITLE} lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光源"
      stage={<Dark at="photo" dx={-0.03} dy={0.42} span={[4.75, 1.85]} view={[-0.2, 0.2]} lamp={110} labels={labels}>
        <PhotoRig hex={hex} level={lv} emit={ok ? lv / 2 : 0} stop={0} amp={cur / 30} volt={U_FWD / 1.5} reverse={false} />
      </Dark>}
      lesson={<LessonBlock no="6" title="光打出了电子" concept="频率够高才有光电子，光越强电流越大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光照到金属表面，金属里的电子吸收光的能量逸出来，这就是<b className="text-white">光电效应</b>，逸出的电子叫光电子。光电管的阴极 K 涂着钾，光电子飞向阳极 A，电路里就有了光电流。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>每种金属有一个<b className="text-white">截止频率</b> ν<sub>c</sub>。入射光的频率低于它，无论光多强、照多久，都没有光电子。钾的截止频率是 {(NU_C / 1e14).toFixed(2)}×10¹⁴ Hz</li>
            <li>频率高于截止频率，光一照上去几乎立刻就有光电流</li>
            <li>频率不变时，光越强，饱和光电流越大</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这里加的是正向电压，光电子全部被阳极收走，读到的是饱和电流。电流的大小是这台实验仪上设定的值；管里的小亮点是示意的光电子。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">有没有光电子看频率，光电流多大看光强</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">红光再强也是 0；绿光一照就有 {I('green', 1).toFixed(0)} μA，光强加倍变成 {I('green', 2).toFixed(0)} μA。钾的截止频率 {(NU_C / 1e14).toFixed(2)}×10¹⁴ Hz 夹在红光和绿光之间。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">微安表 · 光电流</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{cur.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">μA</span></div>
            <div className={`mt-2 text-[13.5px] font-medium ${ok ? 'text-[#7fe3d4]' : 'text-[#ffb3a8]'}`}>{ok ? '频率高于截止频率：有光电子' : '频率低于截止频率：没有光电子'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="ν" value={freq14(nm).toFixed(2)} unit={`×10¹⁴ Hz · ${name}的频率`} />
            <ParamTile symbol={<>ν<sub>c</sub></>} value={(NU_C / 1e14).toFixed(2)} unit="×10¹⁴ Hz · 钾的截止频率" />
            <ParamTile symbol="光强" value={strong ? '强' : '弱'} unit={strong ? '是弱光的 2 倍' : '拿它当 1 倍'} />
            <ParamTile symbol="U" value={`${U_FWD.toFixed(1)} V`} unit="正向电压" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每换一种光、每调一次光强，记一次电流。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">光</th><th className="text-right font-normal">ν / 10¹⁴ Hz</th><th className="text-right font-normal">光强</th><th className="text-right font-normal">I / μA</th></tr></thead>
                <tbody>{rows.map(k => { const [rc, rl] = k.split(':') as [LightKey, string]; return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{LIGHTS[rc].name}</td><td className="text-right tabular-nums">{freq14(LIGHTS[rc].nm).toFixed(2)}</td><td className="text-right">{rl === '2' ? '强' : '弱'}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{I(rc, Number(rl)).toFixed(0)}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'lv'} onClick={() => setStrong(s => !s)} disabled={!steady}>{strong ? '把光调弱' : '把光调强'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="照射的光"><Segmented label="照射的光" pulse={next === 'c'} want={next === 'c' ? tc as LightKey : null} value={c} onChange={setC} options={KEYS.map(k => ({ value: k, label: LIGHTS[k].name }))} /></Control>}
    />
  )
}
