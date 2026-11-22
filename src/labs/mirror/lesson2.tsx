// 光的反射和平面镜 · 第 2 课 反射定律（探究光反射时的规律）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Board, { boardAt } from './board'
import { LESSONS, TITLE, goLesson } from './lessons'
import { useEase } from './optics'
import { ANGLES, bounce } from './physics'
import { DataTable, Finale, Readout } from './ui'

type A = '30' | '45' | '60'
const TASKS: Task[] = [
  ...ANGLES.map((a, n) => ({ id: String(a), text: n ? `把入射角换成 ${a}°，再量一次` : `让光以 ${a}° 的入射角射到镜面上，量出反射角`, note: `反射角 ${bounce(a).r.toFixed(0)}°：${n === 0 ? '和入射角相等' : n === 1 ? '还是相等' : '入射角增大，反射角跟着增大，始终相等'}` })),
  { id: 'fold', text: '把右半边光屏向后折，看上面还有没有反射光线', note: '没有了：反射光线、入射光线和法线在同一平面内' },
  { id: 'rev', text: '让光逆着原来的反射光线射向镜面', note: '它逆着原来的入射光线射出：反射时光路是可逆的' },
]
const BACK = 0.9      // 右半边光屏向后折多少（弧度）

export default function Lesson2() {
  const [ang, setAng] = useState<A>('30')
  const [fold, setFold] = useState(false)
  const [rev, setRev] = useState(false)
  const [rows, setRows] = useState<A[]>([])
  const [shot, setShot] = useState(0)        // 每换一次方向加一：光路重新画一遍
  const T = useTasks('gewu:mirror:2', TASKS)
  const i = useEase(Number(ang), 0.8), steady = Math.abs(i - Number(ang)) < 0.05, f = useEase(fold ? BACK : 0, 0.9), sk = useEase(shot, 1.2), k = shot === 0 ? 1 : Math.max(0, Math.min(1, sk - (shot - 1)))
  const b = bounce(i), dup = rows.includes(ang), moving = (fold ? BACK - f : f) > 0.01
  const record = () => { if (!steady || dup || fold || rev) return; const next = [...rows, ang]; setRows(next); T.check(id => next.includes(id as A)) }
  const doFold = () => { if (rev) return; const on = !fold; setFold(on); if (on) T.check(id => id === 'fold') }
  const doRev = () => { if (fold) return; const on = !rev; setRev(on); setShot(n => n + 1); if (on) T.check(id => id === 'rev') }
  const resetAll = () => { setAng('30'); setFold(false); setRev(false); setRows([]); setShot(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'ang' | 'fold' | 'rev' | 'record' | null } = !task ? { hint: '都做完了。反射角等于入射角；三条线在同一平面内；光路可逆。', next: null }
    : task.id === 'fold' ? (rev ? { hint: '先按“恢复原来的方向”', next: 'rev' } : { hint: '按“右半边向后折”', next: 'fold' })
    : fold ? { hint: '光屏上接不到反射光线了。按“折回来”', next: 'fold' }
    : task.id === 'rev' ? { hint: '按“让光逆着射回去”', next: 'rev' }
    : rev ? { hint: '按“恢复原来的方向”', next: 'rev' }
    : ang !== task.id ? { hint: `把入射角换成 ${task.id}°`, next: 'ang' }
    : !steady ? { hint: '激光笔在转…', next: null } : { hint: '读出反射角，按“记录”', next: 'record' }
  const s = rev ? -1 : 1, shown = !fold && !moving
  const labels: Label[] = [
    { id: 'i', at: boardAt(-s * (i / 2 + 4), 0.46), ax: rev ? 0 : 1, className: 'scene-tag -translate-y-1/2', children: <><small>入射角</small>{i.toFixed(0)}°</> },
    { id: 'r', at: boardAt(s * (i / 2 + 4), 0.52), ax: rev ? 1 : 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: shown ? 1 : 0 }, children: <><small>反射角</small>{b.r.toFixed(0)}°</> },
    ...(fold && !moving && !rev ? [{ id: 'f', at: boardAt(38, 0.9), ax: 0.5, className: 'scene-tag', children: '这半边接不到反射光线' } as Label] : []),
    { id: 'n', at: boardAt(0, 1.34), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '法线 ON' },
    { id: 'm', at: [boardAt(0, 0)[0] + 1.1, boardAt(0, 0)[1] - 0.02, 0.42], ax: 0.5, name: true, className: 'scene-name', children: '平面镜' },
    { id: 'l', at: boardAt(-s * (i + 7), 1.25), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '激光笔' },
  ]

  return (
    <LabShell title={TITLE} lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光屏和激光笔"
      stage={<Board i={i} fold={f} rev={rev} k={k} labels={labels} />}
      lesson={<LessonBlock no="2" title="反射定律" concept="反射角等于入射角" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光射到物体表面被反射回去，叫<b className="text-white">光的反射</b>。过入射点 O 垂直于镜面的直线 ON 叫<b className="text-white">法线</b>；入射光线和法线的夹角叫入射角，反射光线和法线的夹角叫反射角。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>反射光线、入射光线和法线在<b className="text-white">同一平面内</b></li>
            <li>反射光线和入射光线<b className="text-white">分居法线两侧</b></li>
            <li><b className="text-white">反射角等于入射角</b>（先有入射才有反射，所以不说“入射角等于反射角”）</li>
            <li>反射时<b className="text-white">光路是可逆的</b></li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">入射角和反射角都是光线和法线的夹角，不是和镜面的夹角。光垂直射到镜面上时，入射角是 0°，反射光线沿原路返回。</p>
        </>} />}
      finale={T.finale && <Finale kicker="五件事都做完了" title="反射角等于入射角" onClose={() => T.setFinale(false)}>三条线在同一平面内，反射光线和入射光线分居法线两侧；逆着射回去，光沿原路返回。</Finale>}
      panel={
        <Glass className="px-4 py-4">
          <Readout label={rev ? '光逆着原来的反射光线射入' : fold ? '右半边光屏折到后面去了' : '反射角'} value={rev ? '沿原路射出' : fold ? '接不到反射光' : b.r.toFixed(0)} unit="°" text={rev || fold} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="入射角" value={`${i.toFixed(0)}°`} unit="入射光线和法线的夹角" />
            <ParamTile symbol="反射角" value={shown ? `${b.r.toFixed(0)}°` : '—'} unit="反射光线和法线的夹角" />
          </div>
          <DataTable head={['次数', '入射角', '反射角']} empty="每换一个入射角，量一次、记一次。" rows={rows.map((r, n) => [`第 ${n + 1} 次`, `${r}°`, `${bounce(Number(r)).r.toFixed(0)}°`])} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'fold'} onClick={doFold} disabled={moving || rev}>{fold ? '折回来' : '右半边向后折'}</LabButton>
        <LabButton pulse={next === 'rev'} onClick={doRev} disabled={fold}>{rev ? '恢复原来的方向' : '让光逆着射回去'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup || fold || rev}>记录</LabButton>
      </>}
      extras={<Control label="入射角"><Segmented label="入射角" pulse={next === 'ang'} want={next === 'ang' ? task!.id as A : null} value={ang} onChange={setAng} options={ANGLES.map(a => ({ value: String(a) as A, label: `${a}°` }))} /></Control>}
    />
  )
}
