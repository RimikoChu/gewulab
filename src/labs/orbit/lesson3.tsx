// 地球的运动 · 第 3 课 斜着身子绕太阳（公转的方向和周期；地轴倾斜、指向不变）
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { TERMS, TILT, YEAR, axisToOrbit, dateText, nearTerm, type TermKey } from './physics'

const LEAN: Record<TermKey, string> = { spring: '侧对太阳', summer: '北极偏向太阳', autumn: '侧对太阳', winter: '北极背向太阳' }
const TASKS: Task[] = [
  { id: 'planes', text: '凑近地球，认一认赤道面和黄道面', note: `公转轨道所在的平面叫黄道面，过赤道的平面叫赤道面。两个面夹着 ${TILT}°，叫黄赤交角` },
  { id: 'year', text: '让地球绕太阳走一整年', note: '绕太阳转一圈就是一年：这叫公转，方向也是自西向东' },
  { id: 'summer', text: '停在夏至，记下地轴的朝向', note: '夏至：北极那一头偏向太阳' },
  { id: 'winter', text: '停在冬至，再记一次', note: '冬至：北极那一头背向太阳。地轴没有转，是地球到了太阳的另一边' },
]

export default function Lesson3() {
  const [goal, setGoal] = useState(30)
  const [rows, setRows] = useState<TermKey[]>([])
  const [near, setNear] = useState(false)
  const T = useTasks('gewu:orbit:3', TASKS)
  const pos = useSlide(goal, 70), day = ((pos % YEAR) + YEAR) % YEAR, moving = Math.abs(pos - goal) > 0.01
  const start = useRef(30)
  useEffect(() => { if (pos - start.current >= YEAR - 0.01) T.check(id => id === 'year') }, [pos])   // eslint-disable-line react-hooks/exhaustive-deps
  const term = nearTerm(day)
  const look = (v: 'orbit' | 'planes') => { if (moving) return; setNear(v === 'planes'); if (v === 'planes') T.check(id => id === 'planes') }
  const nextTerm = () => setGoal(g => (Math.floor(g / (YEAR / 4) + 1e-6) + 1) * YEAR / 4)
  const dup = !!term && rows.includes(term.key)
  const record = () => { if (moving || !term || dup) return; const next = [...rows, term.key]; setRows(next); T.check(id => next.includes(id as TermKey)) }
  const resetAll = () => { setNear(false); setGoal(30); start.current = 30; setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'planes' | 'year' | 'term' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。四根地轴的影子，是不是都朝着同一个方向？', next: null }
    if (moving) return { hint: '地球在走：盯住地轴和蓝色的赤道面，它们的朝向变了吗？', next: null }
    if (task.id === 'planes') return { hint: '选“两个面”，凑近看：金色的是黄道面，蓝色的是赤道面', next: 'planes' }
    if (task.id === 'year') return { hint: '按“走一年”，看地球绕太阳一圈', next: 'year' }
    if (term?.key === task.id) return dup ? { hint: '这里记过了', next: null } : { hint: `到${term.name}了：按“记录”`, next: 'record' }
    return { hint: `让地球走到${TERMS.find(t => t.key === task.id)!.name}`, next: 'term' }
  })()

  return (
    <LabShell title="地球的运动" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球"
      stage={<Scene3 day={day} near={near} ghosts={rows.map(k => TERMS.find(t => t.key === k)!.day)} />}
      lesson={
        <LessonBlock no="3" title="斜着身子绕太阳" concept="地轴斜着，而且一直指着同一个方向" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>地球在自转的同时，还绕着太阳不停地旋转，叫<b className="text-white">公转</b>。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#ffd27a]">黄道面：</b>地球公转轨道所在的平面</li>
              <li><b className="text-[#6db8ff]">赤道面：</b>过地心、和地轴垂直的平面，赤道就在这个面上</li>
              <li><b className="text-white">黄赤交角：</b>这两个面的夹角，现在是 {TILT}°（更精确是 23°26′）</li>
            </ul>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">方向：</b>自西向东，和自转一样</li>
              <li><b className="text-[#7fe3d4]">周期：</b>一年</li>
              <li><b className="text-[#7fe3d4]">姿势：</b>地轴是斜的，和黄道面成 {axisToOrbit(TILT)}° 的夹角，而且北极始终指向北极星附近</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">图上的太阳、地球和轨道没有按真实的大小和远近来画。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">走完一年了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">地球斜着身子绕太阳，一年一圈</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">地轴和赤道面的朝向始终不变，和黄道面一直夹着同样的角度。所以转到太阳这一边时北极偏向太阳，转到另一边时北极背向太阳。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再走一年看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在是</div>
            <div className="mt-1 text-[36px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{dateText(day)}</div>
            <div className="mt-2 text-[13px] text-white/55">{term ? `${term.name} · ${LEAN[term.key]}` : '在两个节气之间'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="周期" value="1" unit="年 · 转一圈" />
            <ParamTile symbol="方向" value="自西向东" unit="和自转相同" />
            <ParamTile symbol="黄赤交角" value={`${TILT}°`} unit="赤道面和黄道面" />
            <ParamTile symbol="地轴" value={`${axisToOrbit(TILT)}°`} unit="和黄道面的夹角" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">地球停在节气的位置时按“记录”，那里会留下一根地轴的影子。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">节气</th><th className="font-normal">地轴的朝向</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{TERMS.find(t => t.key === k)!.name}</td><td className="font-semibold text-[#7fe3d4]">{LEAN[k]}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'year'} onClick={() => { setNear(false); setGoal(g => g + YEAR) }} disabled={moving}>走一年</LabButton>
        <LabButton pulse={next === 'term'} onClick={() => { setNear(false); nextTerm() }} disabled={moving}>下一个节气</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || !term || dup}>记录</LabButton>
      </>}
      extras={<Control label="看什么"><Segmented label="看什么" pulse={next === 'planes'} want={next === 'planes' ? 'planes' : null} value={near ? 'planes' : 'orbit'} onChange={look} options={[{ value: 'orbit', label: '整条轨道' }, { value: 'planes', label: '两个面' }]} /></Control>}
    />
  )
}
