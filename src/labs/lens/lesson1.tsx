// 光的折射和凸透镜成像 · 第 1 课 光在水面拐了弯（光的折射）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Dark, Ray } from './optics'
import { ANGLES, N_WATER, refract } from './physics'
import { AXIS, ST } from './world'

type A = '0' | '30' | '60'
const TASKS: Task[] = [
  { id: '30', text: '让光以 30° 的入射角斜射进水里，量出折射角', note: `约 ${refract(30).toFixed(1)}°：折射光线向法线偏折，折射角小于入射角` },
  { id: '60', text: '把入射角加大到 60°，再量一次', note: `约 ${refract(60).toFixed(1)}°：入射角增大，折射角也增大，但总是小一些` },
  { id: '0', text: '让光垂直射进水里', note: '传播方向不变：入射角和折射角都是 0°' },
]
const RAD = Math.PI / 180, PX = ST.tank, PY = AXIS - 0.05, L = 0.85

export default function Lesson1() {
  const [ang, setAng] = useState<A>('30')
  const [rows, setRows] = useState<A[]>([])
  const T = useTasks('gewu:lens:1', TASKS)
  const i = useSlide(Number(ang), 60), r = refract(i), steady = Math.abs(i - Number(ang)) < 0.1, dup = rows.includes(ang)
  const record = () => { if (!steady || dup) return; const next = [...rows, ang]; setRows(next); T.check(id => next.includes(id as A)) }
  const resetAll = () => { setAng('30'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'ang' | 'record' | null } = !task ? { hint: '三次都量完了。光从空气斜射进水里，折射角总比入射角小。', next: null }
    : ang !== task.id ? { hint: `把入射角换成 ${task.id}°`, next: 'ang' } : { hint: '看水里的光线偏向哪边，按“记录”', next: 'record' }
  const labels: Label[] = [
    { id: 'i', at: [PX - Math.sin(i * RAD / 2) * 0.5 - 0.02, PY + 0.52, 0.3], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>入射角</small>{i.toFixed(0)}°</> },
    { id: 'r', at: [PX + Math.sin(r * RAD / 2) * 0.5 + 0.02, PY - 0.52, 0.3], className: 'scene-tag key -translate-y-1/2', children: <><small>折射角</small>{r.toFixed(1)}°</> },
    { id: 'n', at: [PX, PY + 0.98, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '法线' },
    { id: 'a', at: [PX - 1.2, PY + 0.2, 0.3], name: true, className: 'scene-name', children: '空气' }, { id: 'w', at: [PX - 1.2, PY - 0.3, 0.3], name: true, className: 'scene-name', children: '水' },
  ]

  return (
    <LabShell title="折射和凸透镜" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="激光笔"
      stage={<Dark at="tank" labels={labels}>
        <mesh position={[PX, PY - 0.42, 0]}><boxGeometry args={[2.8, 0.84, 0.5]} /><meshStandardMaterial color="#2f7fb8" transparent opacity={0.4} roughness={0.1} depthWrite={false} /></mesh>
        <mesh position={[PX, PY - 0.3, 0]}><boxGeometry args={[2.86, 1.3, 0.56]} /><meshStandardMaterial color="#cfe6ee" transparent opacity={0.1} roughness={0.05} depthWrite={false} /></mesh>
        <Ray a={[PX, PY - 0.95]} b={[PX, PY + 0.95]} color="#7f8b96" r={0.004} dash z={-0.02} />
        <Ray a={[PX - Math.sin(i * RAD) * L, PY + Math.cos(i * RAD) * L]} b={[PX, PY]} color="#ff5a4a" />
        <Ray a={[PX, PY]} b={[PX + Math.sin(r * RAD) * L, PY - Math.cos(r * RAD) * L]} color="#ff5a4a" />
        <Ray a={[PX, PY]} b={[PX + Math.sin(i * RAD) * L * 0.6, PY + Math.cos(i * RAD) * L * 0.6]} color="#ff5a4a" r={0.004} />
      </Dark>}
      lesson={<LessonBlock no="1" title="光在水面拐了弯" concept="光斜着从一种介质进入另一种，方向会偏折" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光从一种介质斜射入另一种介质时，传播方向发生偏折，叫<b className="text-white">光的折射</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>折射光线、入射光线和法线在同一平面内，分居法线两侧</li>
            <li>光从空气斜射入水中，折射光线向法线偏折，<b className="text-white">折射角小于入射角</b></li>
            <li>入射角增大，折射角也增大；垂直入射时方向不变</li>
            <li>折射时光路是可逆的</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">折射角是用水的折射率 {N_WATER} 算出来的，这个算法初中不要求。水面上那条细的光线是同时发生的反射。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个入射角都量过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">30° 进去变成约 {refract(30).toFixed(0)}°，60° 进去变成约 {refract(60).toFixed(0)}°</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">斜着进水，光向法线靠拢。垂直进水，光不拐弯。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">折射角</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{r.toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">°</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="入射角" value={`${i.toFixed(0)}°`} unit="入射光线和法线的夹角" />
            <ParamTile symbol="比一比" value={i < 0.5 ? '相等' : '折射角小'} unit={i < 0.5 ? '垂直入射，不偏折' : '向法线偏折'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">三个入射角各记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">入射角</th><th className="text-right font-normal">折射角</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{k}°</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{refract(Number(k)).toFixed(1)}°</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton></>}
      extras={<Control label="入射角"><Segmented label="入射角" pulse={next === 'ang'} want={next === 'ang' ? task!.id as A : null} value={ang} onChange={setAng} options={ANGLES.map(a => ({ value: String(a) as A, label: `${a}°` }))} /></Control>}
    />
  )
}
