// 光的折射和凸透镜成像 · 第 6 课 眼睛和眼镜（眼睛的成像；近视和远视的成因与矫正）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Dark, Lens, Ray } from './optics'
import { EYE, EYES, focusAt, where, type EyeKey } from './physics'
import { AXIS, ST } from './world'

const KEYS = Object.keys(EYES) as EyeKey[], K = 0.42      // 模型放大：1 cm 画成 0.42 个单位
const LX = ST.eye - 0.3, RX = LX + EYE * K, HS = [-0.22, 0, 0.22]
const RE = (EYE * K + 0.12) / 2, CX = RX - RE        // 眼球的半径和球心
const TASKS: Task[] = [
  { id: 'normal', text: '先看正常的眼睛：光会聚在哪里', note: '正好落在视网膜上，看得清楚' },
  { id: 'near', text: '换成近视眼，再给它戴上眼镜', note: '光会聚在视网膜前面；戴凹透镜，先把光发散一些，就落回视网膜上了' },
  { id: 'far', text: '换成远视眼，也戴上眼镜', note: '光要到视网膜后面才会聚；戴凸透镜，先把光会聚一些' },
]

export default function Lesson6() {
  const [eye, setEye] = useState<EyeKey>('normal')
  const [on, setOn] = useState(false)
  const [seen, setSeen] = useState<string[]>(['normal'])
  const T = useTasks('gewu:lens:6', TASKS)
  const e = EYES[eye], fx = LX + useSlide(focusAt(eye, on), 1.2) * K
  // 第一个任务只要看一眼：正常的眼睛，光落在视网膜上
  const first = () => window.setTimeout(() => T.check(id => id === 'normal'), 1600)
  useEffect(() => { const t = first(); return () => clearTimeout(t) }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const mark = (k: string) => { const next = seen.includes(k) ? seen : [...seen, k]; setSeen(next); T.check(id => id === 'normal' ? true : next.includes(`${id}+`)) }
  const pick = (k: EyeKey) => { setEye(k); setOn(false); mark(k) }
  const wear = () => { if (!e.glasses || on) return; setOn(true); mark(`${eye}+`) }
  const resetAll = () => { setEye('normal'); setOn(false); setSeen(['normal']); T.reset(); first() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'eye' | 'wear' | null } = !task ? { hint: '三种眼睛都看过了。近视戴凹透镜，远视戴凸透镜。', next: null }
    : task.id === 'normal' ? { hint: '正常的眼睛：看三条光线交在哪里', next: null }
    : eye !== task.id ? { hint: `换成“${EYES[task.id as EyeKey].name}”`, next: 'eye' } : { hint: `光会聚在${where(eye, false)}：按“戴上眼镜”`, next: 'wear' }
  const labels: Label[] = [
    { id: 'f', at: [fx, AXIS - 0.12, 0.3], ax: 0.5, className: 'scene-tag key', children: <><small>光会聚在</small>{where(eye, on)}</> },
    { id: 'r', at: [RX - 0.02, AXIS + 0.5, 0.3], name: true, className: 'scene-name -translate-y-1/2', children: '视网膜' },
    { id: 'l', at: [LX + 0.04, AXIS + 0.36, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '晶状体' },
    { id: 'c', at: [CX - RE - 0.1, AXIS - 0.26, 0.3], ax: 1, name: true, className: 'scene-name', children: '角膜' },
    { id: 'nv', at: [RX + 0.28, AXIS - 0.2, 0.3], name: true, className: 'scene-name', children: '视神经' },
    ...(on ? [{ id: 'g', at: [LX - 0.55, AXIS + 0.5, 0.3] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: e.glasses === 'concave' ? '凹透镜' : '凸透镜' }] : []),
  ]

  return (
    <LabShell title="折射和凸透镜" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="眼镜"
      stage={<Dark at="eye" labels={labels}>
        {/* 眼球：一个半透明的球，后壁是视网膜；前面的晶状体是一块凸透镜 */}
        <mesh position={[CX, AXIS, -0.04]}><circleGeometry args={[RE, 56]} /><meshBasicMaterial color="#f6dccd" transparent opacity={0.1} toneMapped={false} /></mesh>
        <mesh position={[CX, AXIS, 0]}><torusGeometry args={[RE, 0.014, 10, 72]} /><meshBasicMaterial color="#ecd9cc" toneMapped={false} /></mesh>
        {/* 视网膜：眼球后壁内侧的一段；后面连着视神经 */}
        <mesh position={[CX, AXIS, 0.005]} rotation-z={-Math.PI * 0.36}><torusGeometry args={[RE - 0.03, 0.022, 10, 48, Math.PI * 0.72]} /><meshBasicMaterial color="#ff8a6a" toneMapped={false} /></mesh>
        <mesh position={[RX + 0.13, AXIS - 0.1, 0]} rotation-z={1.15}><cylinderGeometry args={[0.045, 0.06, 0.3, 12]} /><meshStandardMaterial color="#e3c2a8" roughness={0.7} /></mesh>
        {/* 角膜：眼球最前面鼓出来的一小段 */}
        <mesh position={[CX - RE + 0.12, AXIS, 0]} rotation-z={Math.PI * 0.62}><torusGeometry args={[0.2, 0.012, 8, 32, Math.PI * 0.76]} /><meshBasicMaterial color="#bfe3ff" toneMapped={false} /></mesh>
        <Lens x={LX} y={AXIS} h={eye === 'near' ? 0.3 : eye === 'far' ? 0.3 : 0.3} tint="#ffe9a8" stand={false} />
        {on && e.glasses && <Lens x={LX - 0.55} y={AXIS} h={0.4} kind={e.glasses} />}
        {HS.map(h => { const t = (RX - LX) / (fx - LX); return <group key={h}>
          <Ray a={[LX - 1.25, AXIS + h]} b={[LX, AXIS + h]} />
          <Ray a={[LX, AXIS + h]} b={[fx > RX ? RX : fx, AXIS + (fx > RX ? h * (1 - t) : 0)]} />
          {fx < RX - 0.005 && <Ray a={[fx, AXIS]} b={[RX, AXIS - h * (RX - fx) / (fx - LX)]} />}
        </group> })}
      </Dark>}
      lesson={<LessonBlock no="6" title="眼睛和眼镜" concept="眼睛像一架照相机；看不清就用透镜帮它对焦" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>眼球好比一架照相机：<b className="text-white">晶状体</b>和角膜相当于凸透镜，<b className="text-white">视网膜</b>相当于胶片，上面成的是倒立、缩小的实像。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">{KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{EYES[k].name}：</b>{EYES[k].say}{EYES[k].glasses ? `。矫正用${EYES[k].glasses === 'concave' ? '凹透镜' : '凸透镜'}` : ''}</li>)}</ul>
          <p className="mt-3 text-[13.5px] text-white/65">模型里的尺寸是示意，眼球画大了很多。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种眼睛都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">近视戴凹透镜，远视戴凸透镜</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">眼镜做的事，就是让光重新正好会聚在视网膜上。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{e.name}{on ? ' · 戴着眼镜' : ''}</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight text-[#7fe3d4]">{where(eye, on)}</div>
            <div className="mt-2 text-[13px] text-white/55">{where(eye, on) === '视网膜上' ? '看得清楚' : '看到的是模糊的'}</div>
          </div>
          <p className="mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{e.say}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="晶状体" value={eye === 'near' ? '太厚' : eye === 'far' ? '太薄' : '正合适'} unit={eye === 'near' ? '折光太强' : eye === 'far' ? '折光太弱' : '折光正好'} />
            <ParamTile symbol="矫正" value={e.glasses === 'concave' ? '凹透镜' : e.glasses === 'convex' ? '凸透镜' : '不需要'} unit={e.glasses === 'concave' ? '先把光发散一些' : e.glasses === 'convex' ? '先把光会聚一些' : ''} />
          </div>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'wear'} onClick={wear} disabled={!e.glasses || on}>戴上眼镜</LabButton></>}
      extras={<Control label="眼睛"><Segmented label="眼睛" pulse={next === 'eye'} want={next === 'eye' ? task!.id as EyeKey : null} value={eye} onChange={pick} options={KEYS.map(k => ({ value: k, label: k === 'normal' ? '正常' : k === 'near' ? '近视' : '远视' }))} /></Control>}
    />
  )
}
