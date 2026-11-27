// 静电场 · 第 6 课 粒子的加速：示波管里的电子枪。用 500 V 发射电子，读它穿出阳极时的速度；换成 2000 V，速度只变成 2 倍；
// 把电源反接，电子被推回阴极，出不来。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { E_CHARGE, GUN, M_E, gunSpeed, sci } from './physics'
import { R6, Rig6 } from './scene6'
import { useClock } from './anim'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

type Volt = '500' | '1000' | '2000'
const v = (U: number) => sci(gunSpeed(U), 2)
const TASKS: Task[] = [
  { id: 'a', text: '用 500 V 的加速电压发射电子', note: `电子穿出阳极时的速度是 ${v(500)} m/s` },
  { id: 'b', text: '换成 2000 V，再发射', note: `${v(2000)} m/s：电压变成 4 倍，速度只变成 2 倍` },
  { id: 'c', text: '把电源反接，再发射', note: '电场力反过来把电子推回阴极，电子出不来' },
]
const X = ST.l6

export default function Lesson6() {
  const [volt, setVolt] = useState<Volt>('500')
  const [rev, setRev] = useState(false)
  const T = useTasks('gewu:efield:6', TASKS)
  const clock = useClock(0.1)
  const U = Number(volt), firing = clock.tick > 0, arrived = clock.tick >= 2.6
  useEffect(() => { if (arrived) T.check(id => (id === 'a' && !rev && U === 500) || (id === 'b' && !rev && U === 2000 && !!T.done.a) || (id === 'c' && rev && !!T.done.b)) }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: Volt) => { clock.stop(); setVolt(k) }
  const flip = () => { clock.stop(); setRev(r => !r) }
  const resetAll = () => { clock.stop(); setVolt('500'); setRev(false); T.reset() }

  const task = T.current
  type Next = 'volt' | 'rev' | 'fire' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: 'qU = ½mv²：电场力做的功变成了粒子的动能。', next: null }
    const wantRev = task.id === 'c', wantU = task.id === 'a' ? '500' : '2000'
    if (rev !== wantRev) return { hint: wantRev ? '把电源反接' : '把电源接回原样', next: 'rev' }
    if (!wantRev && volt !== wantU) return { hint: `把加速电压调到 ${wantU} V`, next: 'volt' }
    if (firing) return { hint: rev ? '电子刚离开阴极就被推了回去…' : '电子被加速，穿过阳极的小孔飞向荧光屏…', next: null }
    return { hint: '发射电子', next: 'fire' }
  })()

  const out = !rev && firing
  const labels: Label[] = [
    { id: 'n1', at: [X + R6.k, TOP + R6.y - 0.035, 0.02], ax: 1, name: true, className: 'scene-name', children: '阴极' },
    { id: 'n2', at: [X + R6.a + 0.005, TOP + R6.y - 0.035, 0.02], ax: 0, name: true, className: 'scene-name', children: '阳极（中间有小孔）' },
    { id: 'n3', at: [X + R6.s, TOP + R6.y + 0.1, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '荧光屏' },
    { id: 'u', at: [X + (R6.k + R6.a) / 2, TOP + R6.y + 0.075, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>U</small>{rev ? '−' : ''}{U} V</> },
    { id: 'v', at: [X + 0.0, TOP + R6.y + 0.035, 0], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: out ? 1 : 0 }, children: <><small>v</small>{v(U)} m/s</> },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="电子枪"
      stage={<Place at="l6" cur="l6" labels={labels} bloom={0.9}><Rig6 U={U} reversed={rev} clock={clock.now} speed={0.2 * Math.sqrt(U / 500)} /></Place>}
      lesson={<LessonBlock no="6" title="粒子的加速" concept="加速电压越高，粒子越快：qU = ½mv²" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>带电粒子在电场中受电场力。电子带负电，受力方向与电场方向相反：从电势低的阴极被拉向电势高的阳极。</p>
          <p className="mt-3">电子从静止出发，经过电势差 U，电场力做功 qU，全部变成动能：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">qU = ½ m v²，v = √(2qU / m)</p>
          <p className="mt-3">速度只由电势差 U 和粒子的比荷 q/m 决定，与两极之间的距离、电场是不是匀强无关。速度与 U 的平方根成正比。</p>
          <p className="mt-3">电子经过 1 V 的电势差得到的动能叫 1 电子伏（eV），1 eV = 1.6×10⁻¹⁹ J。</p>
          <p className="mt-3 text-white/60">电子实际飞过这支管子只要几十纳秒，画面放慢了。</p>
        </>} />}
      finale={T.finale && <Final kicker="三次都发射过了" title="qU = ½mv²：电压变成 4 倍，速度变成 2 倍"
        body={<>500 V 时 {v(500)} m/s，2000 V 时 {v(2000)} m/s。电源反接，电场力做负功，电子出不来。</>} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="v = √(2qU / m)" value={rev ? '—' : v(U)} unit="m/s" note={rev ? '电源反接：电子到不了阳极' : '电子穿出阳极小孔时的速度'} />
          <Sub>关键参数</Sub>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={`${rev ? '−' : ''}${U}`} unit="V · 加速电压" />
            <ParamTile symbol={<>E<sub>k</sub></>} value={rev ? '—' : String(U)} unit="eV · 动能" />
            <ParamTile symbol="q" value={sci(E_CHARGE)} unit="C · 电子" />
            <ParamTile symbol="m" value={sci(M_E, 2)} unit="kg · 电子" />
          </div>
          <p className="mt-3 text-[12.5px] text-white/55">阴极和阳极相距 {GUN.gap * 100} cm。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fire'} onClick={clock.start} disabled={firing && !arrived}>发射电子</LabButton>
        <LabButton pulse={next === 'rev'} onClick={flip}>{rev ? '电源接回原样' : '电源反接'}</LabButton>
      </>}
      extras={<Control label="加速电压"><Segmented label="加速电压" pulse={next === 'volt'} want={next === 'volt' ? (task!.id === 'a' ? '500' : '2000') : null} value={volt} onChange={pick} options={GUN.U.map(u => ({ value: String(u) as Volt, label: `${u} V` }))} /></Control>}
    />
  )
}
