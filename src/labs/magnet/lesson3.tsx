// 电与磁 · 第 3 课 电生磁：实验台第 3 格。先做奥斯特实验：闭合开关，看南北方向的导线下面的小磁针；改变电流方向再做一次。
// 再换成螺线管，看两端的小磁针；改变电流方向，用安培定则判断哪端是 N 极。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { l3Current, solenoidN, wireDeflect, L3 as Q } from './physics'
import { L3, Scene3 } from './scene3'
import { Bench, Place, toWorld } from './world'
import { useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'oersted', text: '闭合开关，看导线下面的小磁针', note: '小磁针转了：通电导线周围存在磁场' },
  { id: 'reverse', text: '改变电流方向，再闭合开关', note: '小磁针反方向偏转：磁场方向跟电流方向有关' },
  { id: 'coil', text: '换成螺线管，闭合开关', note: '通电螺线管外部的磁场和条形磁体的一样' },
  { id: 'ampere', text: '改变电流方向，用安培定则判断 N 极', note: '电流方向一反，螺线管的 N 极就换到另一头' },
]

export default function Lesson3() {
  const [on, setOn] = useState(false)
  const [dir, setDir] = useState<1 | -1>(1)
  const [coil, setCoil] = useState(false)
  const [coilDir, setCoilDir] = useState<1 | -1 | 0>(0)
  const T = useTasks('gewu:magnet:3', TASKS)
  const knife = useSlide(on ? 1 : 0, 2.4), live = knife > 0.99
  const lineK = useSlide(coil && on && knife > 0.99 ? 1 : 0, 0.8)
  const settled = useSettled(`${on}${dir}${coil}`, 2200) && live
  const resetAll = () => { setOn(false); setDir(1); setCoil(false); setCoilDir(0); T.reset() }
  useEffect(() => {
    if (!settled) return
    if (!coil && dir === 1) T.check(id => id === 'oersted')
    if (!coil && dir === -1 && T.done.oersted) T.check(id => id === 'reverse')
    if (coil && T.done.reverse && !T.done.coil) { setCoilDir(dir); T.check(id => id === 'coil') }
    if (coil && T.done.coil && coilDir !== 0 && dir !== coilDir) T.check(id => id === 'ampere')
  }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps
  const flip = () => { setOn(false); setDir(d => (d > 0 ? -1 : 1)) }
  const toCoil = () => { setOn(false); setCoil(true) }

  const task = T.current
  type Next = 'switch' | 'dir' | 'coil' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '电流的周围存在磁场。', next: null }
    if (knife > 0.01 && knife < 0.99) return { hint: on ? '闭合开关…' : '断开开关…', next: null }
    if (on && !settled) return { hint: '看小磁针…', next: null }
    if (task.id === 'oersted') return { hint: '导线沿南北方向放在小磁针正上方。闭合开关', next: 'switch' }
    if (task.id === 'reverse') return dir === 1 ? { hint: '断开开关，改变电流方向', next: 'dir' } : { hint: '电流反过来了。再闭合开关', next: 'switch' }
    if (task.id === 'coil') return !coil ? { hint: '换成螺线管', next: 'coil' } : { hint: '闭合开关，看螺线管两端的小磁针', next: 'switch' }
    return dir === coilDir ? { hint: '断开开关，改变螺线管里的电流方向', next: 'dir' } : { hint: '闭合开关，用安培定则判断哪端是 N 极', next: 'switch' }
  })()

  const W = (p: [number, number, number]) => toWorld('l3', p)
  const deflect = !coil && live ? wireDeflect(dir) : 0
  const nEnd = coil && live ? solenoidN(dir) : null
  const labels: Label[] = [
    { id: 'n1', at: W([L3.needle[0], 6.6, L3.wN - 1]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '南北方向的导线' },
    { id: 'n2', at: W([L3.bat[0], 3.6, L3.bat[2] - 3]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电池盒' },
    { id: 'n3', at: W([L3.coil[0], 6.8, L3.coil[2]]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '螺线管' },
    { id: 'nN', at: W([L3.coil[0] + (nEnd === 'east' ? 11.5 : -11.5), 6.2, 0]), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: nEnd && settled ? 1 : 0 }, children: <><small>这一端是</small>N 极</> },
  ]
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="电路"
      stage={<Place at={coil ? 'l3b' : 'l3'} labels={labels}><Bench at="l3"><Scene3 on={on} dir={dir} coil={coil} swing={knife} show={lineK} /></Bench></Place>}
      lesson={<LessonBlock no="3" title="电生磁" concept="电流的周围存在磁场" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>1820 年，丹麦物理学家<b className="text-white">奥斯特</b>发现：导线通电时，旁边的小磁针会转动。这说明通电导线周围存在磁场，磁场的方向跟电流的方向有关。这种现象叫电流的磁效应。</p>
          <p className="mt-3">把导线绕成螺线管，通电后外部的磁场和条形磁体的磁场一样，两端相当于两个磁极。</p>
          <p className="mt-3"><b className="text-white">安培定则</b>：用右手握住螺线管，让四指指向螺线管中电流的方向，大拇指所指的那端就是螺线管的 N 极。</p>
          <p className="mt-3 text-[13.5px] text-white/65">做奥斯特实验时，导线要沿南北方向放：小磁针本来就指南北，导线下方的磁场是东西方向的，偏转才最明显。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">直导线和螺线管都做过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电流的周围存在磁场，磁场方向跟电流方向有关</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">通电螺线管像一根条形磁体；右手握住它，四指指向电流方向，大拇指指的那端是 N 极。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">电流表</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{live ? l3Current().toFixed(1) : '0.0'}<span className="ml-1 text-[15px] font-medium text-white/55">A</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={Q.U.toFixed(1)} unit="V · 两节干电池" />
            <ParamTile symbol="电流" value={coil ? (dir > 0 ? '西头进' : '东头进') : dir > 0 ? '南 → 北' : '北 → 南'} unit={coil ? '螺线管里' : '导线里的方向'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">{coil ? '螺线管的磁极' : '导线下面的小磁针'}</h2>
          <div className="mt-2 rounded-xl bg-white/[0.06] px-3 py-3 text-[20px] font-bold">
            {coil ? (nEnd && settled ? `${nEnd === 'east' ? '东' : '西'}端是 N 极` : '—') : (live && settled ? `N 极偏向${deflect < 0 ? '西' : '东'}` : live ? '…' : '指北，不偏')}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={knife > 0.01 && knife < 0.99}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton pulse={next === 'dir'} onClick={flip} disabled={knife > 0.01 && knife < 0.99}>改变电流方向</LabButton>
        <LabButton pulse={next === 'coil'} onClick={toCoil} disabled={coil || !T.done.reverse}>换成螺线管</LabButton>
      </>}
      extras={null}
    />
  )
}
