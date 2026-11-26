// 地震 · 第 6 课 看穿地球：把地球切掉四分之一，从顶上的震源发出纵波、横波射线；
// 看两个界面上波速怎么变，横波到古登堡面就没了；地面上 104°–143° 是收不到直达波的影区。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { D_CMB, D_ICB, R_CMB, R_E, R_ICB, R_MOHO, SHADOW, velAtDepth } from './physics'
import { sectionPoint } from './globe'
import { VelChart } from './charts'
import { useClock, useLater } from './clock'

type Hi = 'moho' | 'cmb'
const END = 1300
const TASKS: Task[] = [
  { id: 'rays', text: '发生地震，看两种波穿过地球', note: `横波到地下约 ${Math.round(D_CMB / 100) * 100} km 就消失了` },
  { id: 'moho', text: '看莫霍面', note: '往下穿过莫霍面，纵波、横波都突然变快' },
  { id: 'cmb', text: '看古登堡面', note: '纵波突然变慢，横波消失：外核是液态' },
  { id: 'shadow', text: '标出影区', note: `离震中 ${SHADOW[0]}°–${SHADOW[1]}° 的地方收不到直达的纵波和横波` },
]
const across = (d0: number, d1: number) => ({ a: velAtDepth(d0), b: velAtDepth(d1) })
const MOHO = across(R_E - R_MOHO - 2, R_E - R_MOHO + 2), CMB = across(D_CMB - 5, D_CMB + 5)

export default function Lesson6() {
  const [run, setRun] = useState(false)
  const [hi, setHi] = useState<Hi | null>(null)
  const [shadow, setShadow] = useState(false)
  const T = useTasks('gewu:quake:6', TASKS)
  const t = useClock(run, 95, END)
  const over = run && t >= END
  useLater(over, 300, () => T.check(id => id === 'rays'), [over])
  useLater(hi !== null, 1500, () => T.check(id => id === hi), [hi])
  useLater(shadow, 1500, () => T.check(id => id === 'shadow'), [shadow])
  const resetAll = () => { setRun(false); setHi(null); setShadow(false); T.reset() }

  const task = T.current, going = run && !over
  const { hint, next }: { hint: string; next: 'fire' | 'hi' | 'shadow' | null } = (() => {
    if (!task) return { hint: '都做完了。横波到古登堡面就消失了：外核是液态。', next: null }
    if (going) return { hint: '纵波、横波从震源出发，一边走一边拐弯…', next: null }
    if (task.id === 'rays' && over) return { hint: '纵波、横波从震源出发，一边走一边拐弯…', next: null }
    if (task.id === 'rays') return { hint: '发生地震，看纵波、横波怎样穿过地球', next: 'fire' }
    if (task.id === 'moho' || task.id === 'cmb') return hi !== task.id ? { hint: task.id === 'moho' ? '看看地壳下面的莫霍面' : '再看地下约 2900 km 的古登堡面', next: 'hi' } : { hint: '看面板上界面两侧的波速', next: null }
    return { hint: '地面上有一段收不到射线：标出影区', next: 'shadow' }
  })()

  const L = (id: string, deg: number, r: number, text: string, side = 1, op = 1): Label => ({ id, at: sectionPoint(deg, r, side), ax: side > 0 ? 0 : 1, className: 'scene-name -translate-y-1/2', style: { opacity: op }, children: text })
  const labels: Label[] = [
    L('crust', 22, R_E + 350, '地壳', 1),
    L('mantle', 150, (R_MOHO + R_CMB) / 2, '地幔', 1),
    L('outer', 120, (R_CMB + R_ICB) / 2, '外核（液态）', 1),
    L('inner', 140, 650, '内核', 1),
    { id: 'src', at: sectionPoint(0, R_E + 500), ax: 0.5, className: 'scene-tag key -translate-y-full', children: '震源' },
    { id: 'moho', at: sectionPoint(40, R_MOHO, 1), ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: hi === 'moho' ? 1 : 0 }, children: '莫霍面' },
    { id: 'cmb', at: sectionPoint(62, R_CMB, 1), ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: hi === 'cmb' ? 1 : 0 }, children: <><small>古登堡面</small>约 {Math.round(D_CMB / 100) * 100} km</> },
    L('sh1', (SHADOW[0] + SHADOW[1]) / 2, R_E * 1.12, `影区 ${SHADOW[0]}°–${SHADOW[1]}°`, 1, shadow ? 1 : 0),
  ]
  const B = hi === 'cmb' ? CMB : MOHO
  return (
    <LabShell title="地震" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地震"
      stage={<Spot at="section" labels={labels} want={{ globe: { cut: true, rayT: run ? t : null, hi: hi === 'moho' ? 1 : hi === 'cmb' ? 2 : 0, shadow: shadow ? 1 : 0 } }} />}
      lesson={<LessonBlock no="6" title="看穿地球" concept="横波到古登堡面消失，外核是液态" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地震波在不同的物质里传播速度不同，遇到物质突然变化的地方，速度会突变。科学家据此把地球内部分成三层。</p>
          <p className="mt-2"><b className="text-white">莫霍面</b>：地下几十千米（大陆部分），往下纵波、横波都明显加快。上面是<b className="text-white">地壳</b>，下面是<b className="text-white">地幔</b>。</p>
          <p className="mt-2"><b className="text-white">古登堡面</b>：地下约 2900 km，纵波突然变慢，横波完全消失。横波只能在固体里传播，说明下面的<b className="text-white">外核</b>是液态。约 5150 km 以下是<b className="text-white">内核</b>。</p>
          <p className="mt-2">射线在地幔里一边走一边拐弯；进外核时纵波变慢、折一下，所以离震中 {SHADOW[0]}°–{SHADOW[1]}° 的地方收不到直达的纵波和横波，叫影区。</p>
          <p className="mt-3 text-[13.5px] text-white/65">剖面上地壳的厚度放大了。波速按一个简化的地球模型取整。时钟快放约 95 倍。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">地球内部看清楚了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">横波到古登堡面消失，外核是液态</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">莫霍面以上是地壳，莫霍面到古登堡面（约 2900 km）是地幔，再往下是外核和内核（约 5150 km 以下）。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-baseline justify-between"><span className="text-[13px] text-white/60">地震后</span><span className="text-[13px] text-white/50">快放</span></div>
          <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{run ? (t / 60).toFixed(1) : '0.0'}<span className="ml-1 text-[15px] font-medium text-white/55">分钟</span></div>
          <h2 className="mt-4 text-[12.5px] text-white/55">波速随深度的变化</h2>
          <div className="mt-1"><VelChart hi={hi === 'moho' ? 1 : hi === 'cmb' ? 2 : 0} /></div>
          {hi ? <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="纵波" value={`${B.a.vp.toFixed(1)} → ${B.b.vp.toFixed(1)}`} unit="km/s · 往下穿过" />
            <ParamTile symbol="横波" value={`${B.a.vs.toFixed(1)} → ${B.b.vs.toFixed(1)}`} unit="km/s · 往下穿过" />
          </div> : <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="古登堡面" value={`约 ${Math.round(D_CMB / 100) * 100}`} unit="km 深" />
            <ParamTile symbol="内核" value={`约 ${D_ICB}`} unit="km 以下" />
          </div>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fire'} onClick={() => { setRun(false); requestAnimationFrame(() => setRun(true)) }} disabled={going}>发生地震</LabButton>
        <LabButton pulse={next === 'shadow'} onClick={() => setShadow(true)} disabled={!T.done.rays || shadow}>标出影区</LabButton>
      </>}
      extras={<Control label="看哪个界面"><Segmented label="看哪个界面" pulse={next === 'hi'} want={next === 'hi' ? (task!.id as Hi) : null} value={hi ?? ('' as Hi)} disabled={going} onChange={v => setHi(v as Hi)} options={[{ value: 'moho', label: '莫霍面' }, { value: 'cmb', label: '古登堡面' }]} /></Control>}
    />
  )
}
