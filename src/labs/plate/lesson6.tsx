// 板块运动 · 第 6 课 大洋和大陆相撞：南美洲西岸。太平洋板块朝大陆推过来，又重又低的洋板块俯冲到大陆下面，形成海沟；
// 俯冲的板块一路往下，沿途发生地震，离海沟越远震源越深；插到深处的板块让岩浆涌上来，安第斯山的火山喷发。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Eruption, Quake } from './fx'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { ACONCAGUA, FOCI, SLAB_DIP, TRENCH_DEPTH, quakeDepth } from './physics'
import { NOW, X, deep, heightAt, slabTop } from './shape'
import { VOICE } from './voice'
import { DAYLIGHT, SPOT, type Want } from './world'

type F = `${typeof FOCI[number]}`
const FS = FOCI.map(String) as F[]
const TASKS: Task[] = [
  { id: 'push', text: '推动太平洋板块', note: '大洋板块又重又低，俯冲到大陆板块下面，形成很深的海沟' },
  { id: '60', text: '在离海沟 60 km 处来一次地震', note: '俯冲的板块和上面的板块互相挤压、摩擦，发生地震' },
  { id: '300', text: '在离海沟 300 km 处再来一次', note: '离海沟越远，震源越深：地震沿着俯冲的板块分布' },
  { id: 'erupt', text: '看安第斯山的火山喷发', note: '俯冲到深处的板块让岩浆生成、上涌，在大陆边缘喷出火山' },
]
/** 离海沟 km → 画面上的 x（俯冲带里 1 个画面单位约画 8 km） */
const focusAt = (km: number): [number, number] => { const dx = km / 8; return [X.trench + dx, deep(slabTop(dx)) - 0.3] }

export default function Lesson6() {
  const [pushGoal, setPushGoal] = useState(0)
  const slab = useSlide(pushGoal, 3), pushing = Math.abs(slab - pushGoal) > 1e-3
  const [f, setF] = useState<F>('60')
  const [qt, setQt] = useState(-1)
  const [erupt, setErupt] = useState(false)
  const [rows, setRows] = useState<F[]>([])
  const T = useTasks('gewu:plate:6', TASKS)
  useEffect(() => { if (pushGoal > 0 && !pushing) T.check(id => id === 'push') }, [pushing, pushGoal])   // eslint-disable-line react-hooks/exhaustive-deps
  // 地震：从 0 秒开始数，5 秒后结束
  useEffect(() => {
    if (qt < 0) return
    if (qt > 4.5) { setQt(-1); return }
    const t = setTimeout(() => setQt(q => (q < 0 ? q : q + 0.05)), 50)
    return () => clearTimeout(t)
  }, [qt])
  useEffect(() => { if (!erupt) return; const t = setTimeout(() => { setErupt(false); T.check(id => id === 'erupt') }, 6500); return () => clearTimeout(t) }, [erupt])   // eslint-disable-line react-hooks/exhaustive-deps
  const shake = () => { if (qt >= 0) return; setQt(0); const n = rows.includes(f) ? rows : [...rows, f]; setRows(n); setTimeout(() => T.check(id => id === f), 1500) }
  const resetAll = () => { setPushGoal(0); setF('60'); setQt(-1); setErupt(false); setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'push' | 'f' | 'quake' | 'erupt' | null } = (() => {
    if (!task) return { hint: '都做完了。大洋板块俯冲到大陆板块下面，形成海沟和火山。', next: null }
    if (pushing) return { hint: '太平洋板块往大陆下面钻…', next: null }
    if (qt >= 0) return { hint: '地震了：地震波从震源往四面传开…', next: null }
    if (erupt) return { hint: '火山喷发了…', next: null }
    if (task.id === 'push') return { hint: '推动太平洋板块，看它往哪里去', next: 'push' }
    if (task.id === 'erupt') return { hint: '看安第斯山的火山喷发', next: 'erupt' }
    if (f !== task.id) return { hint: `把震源换到离海沟 ${task.id} km 处`, next: 'f' }
    return { hint: `在离海沟 ${task.id} km 处来一次地震`, next: 'quake' }
  })()

  const km = Number(f), focus = focusAt(km), epi: [number, number] = [focus[0], heightAt(focus[0], 0, NOW, 8848.86)]
  const top = heightAt(X.andes, 0, NOW, 8848.86)
  const labels: Label[] = [
    { id: 'd', at: [focus[0] + 1.4, focus[1], 0.3], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: rows.includes(f) ? 1 : 0 }, children: <><small>震源深</small>约 {Math.round(quakeDepth(km))} km</> },
    { id: 'tr', at: [X.trench, -9.6, 0], ax: 0.5, name: true, className: 'scene-name', children: '海沟' },
    { id: 'pa', at: [X.trench - 28, 1.2, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: '太平洋板块（大洋）' },
    { id: 'sa', at: [X.andes + 26, 6.5, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: '美洲板块（大陆）' },
    { id: 'an', at: [X.andes, top + 1.2, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '安第斯山' },
    { id: 'mg', at: [X.trench + 25, -10, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '岩浆' },
  ]
  const s = SPOT.andes
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="板块运动" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="俯冲带"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...DAYLIGHT} world={{ slabT: slab, glow: erupt ? 0.5 : 0 }}>
        {pushing && <ForceArrow tip={[X.trench - 8, 1.2, 0.5]} dir={[1, 0, 0]} len={14} color="#ffe9a8" thick={1.8} />}
        {pushing && <ForceArrow tip={[X.trench + 12, deep(slabTop(12)) + 2.2, 0.5]} dir={[1, -0.5, 0]} len={9} color="#ffe9a8" thick={1.6} />}
        <Quake focus={focus} epi={epi} t={qt} />
        <Eruption at={[X.andes, top - 0.1, 0]} on={erupt ? 1 : 0} />
      </LabStage>}
      lesson={<LessonBlock no="6" title="大洋和大陆相撞" concept="大洋板块俯冲，形成海沟和火山" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>大洋板块和大陆板块相撞时，大洋板块的岩石密度大、位置低，<b className="text-white">俯冲</b>到大陆板块下面。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">海沟：</b>俯冲的地方形成很深的海沟，智利—秘鲁海沟最深处约 {TRENCH_DEPTH} 米</li>
            <li><b className="text-[#7fe3d4]">山脉和火山：</b>大陆边缘被挤压抬升，岩浆上涌形成火山，如安第斯山（最高峰阿空加瓜山 {ACONCAGUA} 米）</li>
            <li><b className="text-[#7fe3d4]">地震：</b>沿着俯冲的板块分布，离海沟越远震源越深</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">画面里俯冲板块按约 {SLAB_DIP}° 往下插，震源深度按这个角度估算，示意。太平洋西岸的日本、印度尼西亚也是这样（拓展课）。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">海沟、地震、火山都看到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">大洋板块俯冲，形成海沟和火山</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">大洋板块俯冲到大陆板块下面：海边是深深的海沟，大陆边上是高大的火山山脉，地震沿着俯冲的板块越来越深。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">离海沟 {km} km 的震源深度</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{rows.includes(f) ? `约 ${Math.round(quakeDepth(km))}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">km</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="海沟" value={`约 ${TRENCH_DEPTH}`} unit="m 深 · 智利—秘鲁海沟" />
            <ParamTile symbol="山峰" value={String(ACONCAGUA)} unit="m · 阿空加瓜山" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">地震记录</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">来一次地震就记下震源的深度。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">离海沟</th><th className="text-right font-normal">震源深度</th></tr></thead>
                <tbody>{[...rows].sort((a, b) => Number(a) - Number(b)).map(r => <tr key={r} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{r} km</td><td className="text-right font-semibold">约 {Math.round(quakeDepth(Number(r)))} km</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'push'} pulse={next === 'push'} onClick={() => setPushGoal(g => g + 14)} disabled={pushing}>推动洋板块</LabButton>
        <LabButton primary={next === 'quake'} pulse={next === 'quake'} onClick={shake} disabled={pushing || qt >= 0 || !T.done.push}>来一次地震</LabButton>
        <LabButton primary={next === 'erupt'} pulse={next === 'erupt'} onClick={() => setErupt(true)} disabled={erupt || pushing || !T.done.push}>火山喷发</LabButton>
      </>}
      extras={
        <Control label="震源离海沟">
          <Segmented label="震源离海沟" pulse={next === 'f'} want={next === 'f' ? (task?.id as F) : null} value={f} onChange={v => setF(v as F)} disabled={qt >= 0} options={FS.map(v => ({ value: v, label: `${v} km` }))} />
        </Control>
      }
    />
  )
}
