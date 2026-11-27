// 万有引力与航天 · 第 4 课 称量地球（用 g 和 R、用月球的 r 和 T 求地球质量；用贴地卫星的周期求密度）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene4, { type Method } from './scene4'
import { LESSONS, goLesson } from './lessons'
import { MOON, R_E, densityFromNear, g, massFromG, massFromOrbit, nearPeriod, sci } from './physics'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'g', text: '用地面上的 g 和地球半径 R 称地球', note: 'M = gR²/G ≈ 5.96 × 10²⁴ kg：卡文迪什说他“称出了地球的重量”' },
  { id: 'moon', text: '用月球绕地球的 r 和 T 再称一次', note: 'M = 4π²r³/(GT²) ≈ 6.02 × 10²⁴ kg：两种方法得数相近' },
  { id: 'near', text: '用贴地飞的卫星算地球的密度', note: 'ρ = 3π/(GT²) ≈ 5.5 × 10³ kg/m³：比岩石还密，说明地心有重的东西' },
]
const SHOW_DELAY = 2600   // 镜头飞到位、量完再出数

export default function Lesson4() {
  const [method, setMethod] = useState<Method>('g')
  const [busy, setBusy] = useState<Method | null>(null)
  const [out, setOut] = useState<Partial<Record<Method, number>>>({})
  const T = useTasks('gewu:gravity:4', TASKS)
  useEffect(() => {
    if (!busy) return
    const t = setTimeout(() => {
      const v = busy === 'g' ? massFromG() : busy === 'moon' ? massFromOrbit(MOON.r, MOON.T) : densityFromNear(nearPeriod())
      setOut(o => ({ ...o, [busy]: v })); T.check(id => id === busy); setBusy(null)
    }, SHOW_DELAY)
    return () => clearTimeout(t)
  }, [busy])   // eslint-disable-line react-hooks/exhaustive-deps
  const run = (m: Method) => { if (busy) return; setMethod(m); setBusy(m) }
  const resetAll = () => { setMethod('g'); setBusy(null); setOut({}); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: Method | null } = (() => {
    if (!task) return { hint: '都做完了。知道 g 和 R，或者一颗卫星的 r 和 T，就能称出地球。', next: null }
    if (busy) return { hint: '量着…', next: null }
    if (task.id === 'g') return { hint: '用地面上的 g 和 R 称地球', next: 'g' }
    if (task.id === 'moon') return { hint: '换个办法：用月球称地球', next: 'moon' }
    return { hint: '再用贴地卫星算地球的密度', next: 'near' }
  })()
  const big = out[method]
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="称地球的办法"
      stage={<Scene4 method={method} />}
      lesson={<LessonBlock no="4" title="称量地球" concept="知道 g 和 R，或卫星的 r 和 T，就能称出地球" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">用 g 和 R：</b>不考虑地球自转，地面上物体的重力等于地球对它的引力，mg = GMm/R²，所以 M = gR²/G。</p>
          <p className="mt-2"><b className="text-white">用环绕天体：</b>月球绕地球做圆周运动，引力提供向心力，GMm/r² = m(2π/T)²r，所以 M = 4π²r³/(GT²)。这样求出的是<b className="text-white">中心天体</b>（地球）的质量，月球自己的质量约掉了。</p>
          <p className="mt-2"><b className="text-white">密度：</b>ρ = M/(4πR³/3)。卫星贴着地面飞时 r = R，代进去得 ρ = 3π/(GT²)，只要量一个周期。</p>
          <p className="mt-3 text-[13.5px] text-white/65">两种方法得数略有不同：取值有舍入，第一种还没算地球自转。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">地球称出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">地球质量约 6.0 × 10²⁴ kg，平均密度约 5.5 × 10³ kg/m³</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">环绕法求的是中心天体的质量：用地球绕太阳的 r 和 T，同样能称出太阳。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{method === 'near' ? '地球的平均密度' : '称出的地球质量'}</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight tabular-nums">{big ? sci(big) : '—'}<span className="ml-1 text-[14px] font-medium text-white/55">{method === 'near' ? 'kg/m³' : 'kg'}</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {method === 'g' && <><ParamTile symbol="g" value={String(g)} unit="m/s²" /><ParamTile symbol="R" value={sci(R_E)} unit="m · 地球半径" /></>}
            {method === 'moon' && <><ParamTile symbol="r" value={sci(MOON.r)} unit="m · 月地距离" /><ParamTile symbol="T" value={(MOON.T / 86400).toFixed(1)} unit="天 · 公转周期" /></>}
            {method === 'near' && <><ParamTile symbol="T" value={(nearPeriod() / 60).toFixed(1)} unit="分钟 · 贴地一圈" /><ParamTile symbol="r" value="≈ R" unit="贴着地面" /></>}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60 font-formula italic">{method === 'g' ? 'M = gR² / G' : method === 'moon' ? 'M = 4π²r³ / (GT²)' : 'ρ = 3π / (GT²)'}　<span className="not-italic">G = 6.67 × 10⁻¹¹ N·m²/kg²</span></p>
          <div className="mt-4 flex flex-col gap-1.5 text-[13.5px] tabular-nums">
            {(['g', 'moon', 'near'] as Method[]).map(k => <div key={k} className="flex justify-between rounded-lg bg-white/6 px-3 py-2"><span className="text-white/70">{k === 'g' ? '用 g 和 R' : k === 'moon' ? '用月球' : '密度（贴地卫星）'}</span><span className="font-semibold text-[#7fe3d4]">{out[k] ? `${sci(out[k]!)} ${k === 'near' ? 'kg/m³' : 'kg'}` : '—'}</span></div>)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'g'} onClick={() => run('g')} disabled={!!busy}>用 g 和 R</LabButton>
        <LabButton pulse={next === 'moon'} onClick={() => run('moon')} disabled={!!busy}>用月球</LabButton>
        <LabButton primary pulse={next === 'near'} onClick={() => run('near')} disabled={!!busy}>算密度</LabButton>
      </>}
      extras={null}
    />
  )
}
