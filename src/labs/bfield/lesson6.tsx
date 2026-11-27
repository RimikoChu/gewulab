// 带电粒子在磁场中 · 第 6 课 质谱仪：氖离子经加速电压加速，从狭缝进入匀强磁场，转半圈打在底片上。
// 两种同位素比荷不同，分成两条谱线；量出谱线到狭缝的距离，算出比荷；再把电压加倍，谱线外移，算出的比荷不变。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { NEON, SPEC, sci, specLine, specRatio, type IsoKey } from './physics'
import { R6, Rig6 } from './scene6'
import { Place } from './world'
import { ST } from './layout'
import { useClock, useSettled } from './anim'

const ISO: IsoKey[] = ['ne20', 'ne22']
const cm = (k: IsoKey, U: number) => (specLine(k, U) * 100).toFixed(1)
const TASKS: Task[] = [
  { id: 'run', text: '打开离子源，看离子打在哪里', note: '离子束分成两束，在底片上留下两条谱线' },
  { id: 'read', text: '量出两条谱线到狭缝的距离', note: `氖 20：${cm('ne20', SPEC.U)} cm，氖 22：${cm('ne22', SPEC.U)} cm；质量大的半径大，在外侧` },
  { id: 'u2', text: '把加速电压加倍，再量一次', note: '谱线往外移了，算出的比荷却和刚才一样' },
]
const X = ST.l6

export default function Lesson6() {
  const [on, setOn] = useState(false)
  const [U, setU] = useState(SPEC.U)
  const [meas, setMeas] = useState<number | null>(null)   // 量的时候的电压
  const T = useTasks('gewu:bfield:6', TASKS)
  const clock = useClock(0.5)
  useEffect(() => { if (on) clock.start(); else clock.stop() }, [on])   // eslint-disable-line react-hooks/exhaustive-deps
  const arrived = useSettled(`${on}${U}`, 2600) && on
  const measured = meas === U
  const resetAll = () => { setOn(false); setU(SPEC.U); setMeas(null); T.reset() }
  useEffect(() => { if (arrived) T.check(id => id === 'run') }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  const measure = () => {
    if (!arrived) return
    setMeas(U)
    T.check(id => (id === 'read' && U === SPEC.U) || (id === 'u2' && U === 2 * SPEC.U && !!T.done.read))
  }

  const task = T.current
  type Next = 'on' | 'measure' | 'u' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '比荷不同，半径不同，同位素就分开了。', next: null }
    if (!on) return { hint: '打开离子源，看离子打在哪里', next: 'on' }
    if (!arrived) return { hint: '离子在加速，进入磁场…', next: null }
    if (task.id === 'read') return { hint: '量出两条谱线到狭缝的距离', next: 'measure' }
    if (task.id === 'u2') return U !== 2 * SPEC.U ? { hint: '把加速电压加倍', next: 'u' } : { hint: '再量一次', next: 'measure' }
    return { hint: '看离子打在哪里…', next: null }
  })()

  const labels: Label[] = [
    { id: 'n1', at: [X, R6.y + 0.05, R6.src], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '离子源' },
    { id: 'n2', at: [X + 0.02, R6.y + 0.04, R6.accel[0]], ax: 0, name: true, className: 'scene-name -translate-y-full', children: '加速电极' },
    { id: 'n3', at: [X + R6.D.cx, R6.y + 0.13, -R6.D.r * 0.6], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '磁场区' },
    { id: 'n4', at: [X - 0.02, R6.y + 0.03, 0], ax: 1, name: true, className: 'scene-name -translate-y-full', children: '狭缝 S' },
    ...ISO.map((k, i): Label => ({ id: k, at: [X + specLine(k, U), R6.y + 0.03 + i * 0.035, 0.006], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: measured ? 1 : 0 }, children: <><small>{NEON[k].name}</small>{cm(k, U)} cm</> })),
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="质谱仪"
      stage={<Place at="l6" cur="l6" labels={labels}>
        <Rig6 on={on} U={U} clock={clock.now} />
      </Place>}
      lesson={<LessonBlock no="6" title="质谱仪" concept="比荷不同，半径不同，同位素就分开了" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>离子从离子源出来，经电压 U 加速：<span className="font-formula italic">qU = ½mv²</span>。从狭缝 S 垂直进入匀强磁场后做半个圆周运动，打在底片上，到狭缝的距离 x = 2r：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">r = (1/B)√(2mU/q)，q/m = 8U / (B²x²)</p>
          <p className="mt-3">电荷量相同时，质量大的半径大。同一种元素的几种同位素质量不同，就在底片上分成几条谱线。量出 x，就能算出比荷。</p>
          <p className="mt-3 text-white/60">这里离子的质量按质量数乘原子质量单位算；离子在加速电场和磁场里运动的时间都极短，画面放慢了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">q/m = 8U/(B²x²)：比荷不同的离子打在底片上不同的位置</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">氖 20 的比荷 {sci(specRatio(specLine('ne20')), 2)} C/kg，氖 22 的 {sci(specRatio(specLine('ne22')), 2)} C/kg；电压加倍，谱线外移到 √2 倍，比荷不变。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="font-formula text-center text-[18px] italic text-white/65">q/m = 8U / (B² x²)</div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两条谱线</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ISO.map(k => <ParamTile key={k} symbol={NEON[k].name} value={measured ? `${cm(k, U)} cm` : '—'} unit={measured ? `q/m = ${sci(specRatio(specLine(k, U), U), 2)} C/kg` : '还没量'} />)}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={String(U)} unit="V · 加速电压" />
            <ParamTile symbol="B" value={SPEC.B.toFixed(2)} unit="T · 竖直向上" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={() => setOn(o => !o)}>{on ? '关闭离子源' : '打开离子源'}</LabButton>
        <LabButton primary={next === 'measure'} pulse={next === 'measure'} onClick={measure} disabled={!arrived || measured}>测量谱线</LabButton>
        <LabButton pulse={next === 'u'} onClick={() => setU(u => (u === SPEC.U ? 2 * SPEC.U : SPEC.U))} disabled={!T.done.read}>{U === SPEC.U ? '电压加倍' : '电压还原'}</LabButton>
      </>}
      extras={null}
    />
  )
}
