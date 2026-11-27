// 合成氨工厂 · 拓展课 从氨到化肥。合成回路东边是罐区和尿素装置：
// 液氨从分离器沿管廊送进带保温层的常压冷冻储罐（氨在常压下约 −33 °C 沸腾）；氨和二氧化碳合成尿素，熔融的尿素从造粒塔顶喷下，落下途中冷却成颗粒。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow } from './flow'
import { LESSONS, goLesson } from './lessons'
import { rng, useRun, type V3 } from './parts'
import { LOOP_PIPES, PRILL, TANK } from './plant'
import { NH3_BP, ureaFromNH3 } from './physics'
import { Place } from './world'

type Site = 'tank' | 'prill'
const TASKS: Task[] = [
  { id: 'tank', text: '把液氨装进储罐', note: `氨在常压下约 ${NH3_BP} °C 沸腾：储罐保持低温，氨就是液体` },
  { id: 'prill', text: '开造粒塔', note: `2NH₃ + CO₂ = CO(NH₂)₂ + H₂O：1 t 氨约制 ${ureaFromNH3(1).toFixed(2)} t 尿素` },
]
const SEC = 6

export default function LessonX() {
  const T = useTasks('gewu:ammonia:x', TASKS)
  const [site, setSite] = useState<Site>('tank')
  const fill = useRun(SEC, () => T.check(id => id === 'tank'))
  const prill = useRun(SEC, () => T.check(id => id === 'prill'))
  const resetAll = () => { setSite('tank'); fill.snap(0); prill.snap(0); T.reset() }
  const busy = fill.busy || prill.busy
  const task = T.current?.id as Site | undefined
  const next: 'seg' | 'go' | null = !task || busy ? null : site !== task ? 'seg' : 'go'
  const hint = !task ? '合成氨大部分用来制化肥。'
    : fill.busy ? '液氨沿管廊流进储罐…' : prill.busy ? '熔融的尿素从塔顶喷下，落下途中冷却成颗粒…'
    : site !== task ? `换到“${task === 'tank' ? '液氨储罐' : '尿素造粒塔'}”`
    : site === 'tank' ? '把分离器里的液氨送进储罐' : '开造粒塔'

  const liq = useMemo(() => [LOOP_PIPES.find(p => p.id === 'liq')!.pts], [])
  // 造粒塔：塔内的一串串下落的颗粒（画在塔前面敞开的检修窗里），塔底出料的皮带
  const drops = useMemo<V3[][]>(() => { const r = rng(5), out: V3[][] = []; for (let i = 0; i < 9; i++) { const x = PRILL.x - 3.6 + r() * 7.2, z = PRILL.z + PRILL.w / 2 + 0.4 + r() * 0.6; out.push([[x, PRILL.h - 1, z], [x, 2, z]]) } return out }, [])
  const belt = useMemo<V3[][]>(() => [[[PRILL.x + PRILL.w / 2 - 1, 1.2, PRILL.z], [PRILL.x + PRILL.w / 2 + 1, 4.2, PRILL.z], [PRILL.x + PRILL.w / 2 + 14, 12.2, PRILL.z]]], [])
  const level = Math.min(1, 0.35 + 0.4 * fill.k)
  const labels: Label[] = [
    { id: 't', at: [TANK.x, TANK.h + 3.2, TANK.z], ax: 0.5, className: `scene-tag ${fill.busy ? 'key' : ''} -translate-y-full`, children: <><small>液氨储罐</small>约 {NH3_BP} °C · 常压</> },
    { id: 'p', at: [PRILL.x, PRILL.h + 9.5, PRILL.z], ax: 0.5, className: `scene-tag ${prill.busy ? 'key' : ''} -translate-y-full`, children: <><small>尿素造粒塔</small>CO(NH₂)₂ 颗粒</> },
  ]
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={site === 'tank' ? '液氨储罐' : '尿素造粒塔'}
      stage={<Place at={site === 'tank' ? 'xt' : 'xp'} labels={labels}>
        <Flow paths={liq} density={1.2} speed={6} size={0.3} color={() => '#9ad8ff'} on={fill.busy ? 1 : 0} />
        {/* 储罐侧面的液位计：一根竖管，液面随装入升高 */}
        <mesh position={[TANK.x + TANK.r * 0.71 + 0.35, 0.6 + (TANK.h - 1.2) / 2, TANK.z + TANK.r * 0.71 + 0.35]}><cylinderGeometry args={[0.12, 0.12, TANK.h - 1.2, 12]} /><meshStandardMaterial color="#5d6366" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[TANK.x + TANK.r * 0.71 + 0.5, 0.6 + (TANK.h - 1.2) * level / 2, TANK.z + TANK.r * 0.71 + 0.5]}><boxGeometry args={[0.08, (TANK.h - 1.2) * level, 0.08]} /><meshBasicMaterial color="#9ad8ff" toneMapped={false} /></mesh>
        <Flow paths={drops} density={1.4} speed={9} size={0.16} color={() => '#f4f2ea'} on={prill.busy || prill.k >= 1 ? 1 : 0} />
        <Flow paths={belt} density={3} speed={2} size={0.18} color={() => '#f4f2ea'} on={prill.busy || prill.k >= 1 ? 1 : 0} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="从氨到化肥" concept="氨是制化肥的原料" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>合成的氨大部分用来生产化肥，如尿素、碳酸氢铵、硝酸铵，也用来制硝酸。</p>
          <p className="mt-3"><b className="text-white">储存</b>：氨容易液化，常压下约 {NH3_BP} °C 沸腾。大型储罐把液氨冷到沸点以下、在常压下储存，外面包着厚厚的保温层。氨有毒、有刺激性气味，罐区要防泄漏。</p>
          <p className="mt-3"><b className="text-white">尿素</b>：氨和二氧化碳在高压下反应生成尿素：<span className="font-formula">2NH₃ + CO₂ = CO(NH₂)₂ + H₂O</span>。熔融的尿素从造粒塔顶喷成小液滴，在下落途中被塔里的空气冷却，凝固成颗粒。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">液氨冷冻储存；氨和二氧化碳制成尿素</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">按方程式，1 t 氨理论上能制约 {ureaFromNH3(1).toFixed(2)} t 尿素。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <ParamTile symbol="沸点" value={`约 ${NH3_BP}`} unit="°C · 氨（常压）" />
          <ParamTile symbol="尿素" value={ureaFromNH3(1).toFixed(2)} unit="t · 每吨氨" />
        </div>
        <p className="mt-4 font-formula text-[15px] text-white/85">2NH₃ + CO₂ = CO(NH₂)₂ + H₂O</p>
        <p className="mt-2 text-[13px] text-white/55">相对分子质量：NH₃ 17，CO(NH₂)₂ 60</p>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={busy || (site === 'tank' ? fill.k > 0 : prill.k > 0)} onClick={() => (site === 'tank' ? fill.run() : prill.run())}>{site === 'tank' ? '装进储罐' : '开造粒塔'}</LabButton>
      </>}
      extras={
        <Control label="去哪里">
          <Segmented label="去哪里" pulse={next === 'seg'} want={task ?? null} disabled={busy} value={site} onChange={k => setSite(k as Site)} options={[{ value: 'tank', label: '液氨储罐' }, { value: 'prill', label: '尿素造粒塔' }]} />
        </Control>
      }
    />
  )
}
