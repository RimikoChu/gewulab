// 光的折射和凸透镜成像 · 第 5 课 照相机、投影仪、放大镜（生活中的透镜）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Bench, { benchAt } from './bench'
import { LESSONS, goLesson } from './lessons'
import { DEVICES, imageDistance, nature, type DeviceKey } from './physics'

const KEYS = Object.keys(DEVICES) as DeviceKey[]
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `${DEVICES[k].name}：看它用的是哪一种成像，记下来`, note: `${DEVICES[k].where}：${nature(DEVICES[k].u)!.text}` }))

export default function Lesson5() {
  const [dev, setDev] = useState<DeviceKey>('camera')
  const [rows, setRows] = useState<DeviceKey[]>([])
  const T = useTasks('gewu:lens:5', TASKS)
  const d = DEVICES[dev], n = nature(d.u)!, v = imageDistance(d.u), dup = rows.includes(dev)
  const record = () => { if (dup) return; const next = [...rows, dev]; setRows(next); T.check(id => next.includes(id as DeviceKey)) }
  const resetAll = () => { setDev('camera'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'dev' | 'record' | null } = !task ? { hint: '三样都对上了：同一块凸透镜，物体放的远近不同，用处就不同。', next: null }
    : dev !== task.id ? { hint: `换成“${DEVICES[task.id as DeviceKey].name}”`, next: 'dev' } : { hint: `${d.where}，成${n.text}：按“记录”`, next: 'record' }
  const labels: Label[] = [
    { id: 'o', at: benchAt(-d.u, 9), ax: 0.5, className: 'scene-tag -translate-y-full', children: dev === 'camera' ? '被拍的景物' : dev === 'projector' ? '胶片（倒着放）' : '要看的小东西' },
    { id: 'i', at: benchAt(v, n.real ? 6 * v / d.u + 3 : 15), ax: 0.5, className: 'scene-tag key -translate-y-full', children: dev === 'camera' ? '感光元件上的像' : dev === 'projector' ? '屏幕上的像' : '透过透镜看到的像' },
  ]

  return (
    <LabShell title="折射和凸透镜" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={d.name}
      stage={<Bench u={d.u} image rays={2} screen={n.real ? v : undefined} labels={labels} />}
      lesson={<LessonBlock no="5" title="照相机、投影仪、放大镜" concept="同一块凸透镜，物体远近不同，用处就不同" tasks={TASKS} done={T.done} current={task?.id}
        theory={<ul className="flex flex-col gap-2 text-[14px] text-white/80">{KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{DEVICES[k].name}（{DEVICES[k].where}）：</b>{DEVICES[k].say}</li>)}</ul>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三样都对上了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">远了是照相机，近一点是投影仪，再近是放大镜</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">分界就是二倍焦距和一倍焦距这两个位置。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{d.name}</div>
            <div className="mt-1 text-[26px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{n.text}</div>
          </div>
          <p className="mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{d.say}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="物体放在" value={dev === 'camera' ? '2f 以外' : dev === 'projector' ? 'f 和 2f 之间' : 'f 以内'} unit={`这里是 ${d.u} cm`} />
            <ParamTile symbol="像" value={n.real ? '实像' : '虚像'} unit={n.real ? '能用屏接住' : '只能用眼睛看'} />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">仪器</th><th className="font-normal">物体的位置</th><th className="font-normal">像</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{DEVICES[k].name}</td><td>{DEVICES[k].where.replace('物体在', '')}</td><td className="font-semibold text-[#7fe3d4]">{nature(DEVICES[k].u)!.text}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录</LabButton></>}
      extras={<Control label="仪器"><Segmented label="仪器" pulse={next === 'dev'} want={next === 'dev' ? task!.id as DeviceKey : null} value={dev} onChange={setDev} options={KEYS.map(k => ({ value: k, label: DEVICES[k].name }))} /></Control>}
    />
  )
}
