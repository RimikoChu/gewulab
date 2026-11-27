// 地球和经纬网 · 第 1 课 地球是个球体：站在船头用双筒望远镜看远处驶来的货轮，下半截先被海面挡住，开近了才整条露出
import { useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { EYE, SHIP_STOPS, SHIP_TOP, hiddenHeight, horizon, seaDrop, visiblePct } from './physics'
import { Freighter } from './ship'
import { LESSONS, goLesson } from './lessons'
import { Zoom, aim } from './lens'
import type { Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sea = 'curved' | 'flat'
interface Row { id: number; d: number; sea: Sea; pct: number }
const TASKS: Task[] = [
  { id: 'd0', text: `货轮在 ${SHIP_STOPS[0]} m：记下露出海面的部分`, note: '看得见生活楼和集装箱，船身的下半截藏在海面后面' },
  { id: 'd1', text: `让货轮开近到 ${SHIP_STOPS[1]} m，再记一次`, note: '露出得更多了，船底那一截还藏着' },
  { id: 'd2', text: `开到 ${SHIP_STOPS[2]} m，再记一次`, note: '整条船都露出来了' },
  { id: 'flat', text: `把海面换成平的，看 ${SHIP_STOPS[0]} m 外的货轮`, note: '海面要是平的，远处的船整条都看得见，只是小' },
]
/** 观察者站在船头左舷高处，朝北（−z）看；货轮的距离从这里量 */
const EYE_X = 40, EYE_Z = 10
const EYE_AT = new THREE.Vector3(EYE_X, EYE, EYE_Z)
/** 货轮离船中心的水平距离（海面从船中心开始弯下去） */
const far = (d: number) => Math.hypot(EYE_X, -EYE_Z + d)

export default function Lesson1() {
  const [stop, setStop] = useState(0)
  const [sea, setSea] = useState<Sea>('curved')
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:globe:1', TASKS)
  const d = useSlide(SHIP_STOPS[stop], 60), moving = Math.abs(d - SHIP_STOPS[stop]) > 0.5
  const flat = sea === 'flat', pct = visiblePct(d, flat)
  const taskOf = (r: { d: number; sea: Sea }) => r.sea === 'flat' ? (r.d === SHIP_STOPS[0] ? 'flat' : '') : `d${(SHIP_STOPS as readonly number[]).indexOf(r.d)}`
  const dup = rows.some(r => r.d === SHIP_STOPS[stop] && r.sea === sea)
  const record = () => {
    if (moving || dup) return
    const next = [...rows, { id: Date.now(), d: SHIP_STOPS[stop], sea, pct }]
    setRows(next); T.check(id => next.some(r => taskOf(r) === id))
  }
  const changeSea = (s: Sea) => { setSea(s); if (s === 'flat') setStop(0) }
  const resetAll = () => { setStop(0); setSea('curved'); setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'near' | 'record' | 'sea' | null } = (() => {
    if (!task) return { hint: '都做完了。换回弯的海面，再让货轮开一遍看看。', next: null }
    if (moving) return { hint: '货轮在往这边开…', next: null }
    if (task.id === 'flat') {
      if (!flat) return { hint: '假如海面是平的呢？把海面换成平的', next: 'sea' }
      return dup ? { hint: '记过了', next: null } : { hint: '海面是平的：货轮整条都看得见。记下来', next: 'record' }
    }
    if (flat) return { hint: '先把海面换回弯的', next: 'sea' }
    const want = +task.id.slice(1)
    if (stop < want) return { hint: '让货轮再开近一段', next: 'near' }
    return dup ? { hint: '记过了', next: null } : { hint: stop === 0 ? '远处来了一艘货轮：记下它露出海面的部分' : `货轮开到 ${SHIP_STOPS[stop]} m：再记一次`, next: 'record' }
  })()

  const top = SHIP_TOP - hiddenHeight(d, flat), drop = flat ? 0 : -seaDrop(far(d)).dy
  // 双筒望远镜对着货轮：镜头跟着货轮停的位置走，视角收窄放大；船近了视角放宽一些，整条船都在画面里
  const D = SHIP_STOPS[stop], cam = aim(EYE_AT, new THREE.Vector3(EYE_X, (flat ? 0 : -seaDrop(far(D)).dy) + 8, EYE_Z - D))
  const labels: Label[] = [
    { id: 'ship', at: [EYE_X, drop + Math.max(top, 2) + 8, EYE_Z - d], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>露出海面</small>{pct.toFixed(0)}%</> },
    { id: 'dist', at: [EYE_X - 55, -seaDrop(far(horizon())).dy, EYE_Z - horizon()], ax: 0, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: flat ? 0 : 1 }, children: '海平线' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="远处的货轮"
      stage={
        <LabStage<Want> labels={labels} {...cam} fog={[500, 3200]} world={{ sea }}>
          <Zoom fov={(16 * SHIP_STOPS[0]) / D} />
          <group position={[EYE_X, drop, EYE_Z - d]} rotation-x={flat ? 0 : -seaDrop(far(d)).tilt}><group rotation-y={-Math.PI / 2 - 1.05} scale={1.3}><Freighter /></group></group>
        </LabStage>
      }
      lesson={<LessonBlock no="1" title="地球是个球体" concept="海面是弯的，地球是个球体" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>站在海边看远处驶来的船，总是先看到桅杆，再看到船身；船开走时，船身先消失，桅杆最后消失。</p>
          <p className="mt-2">要是海面是平的，远处的船只会变小，不会一截一截地“沉”下去。所以海面是弯的。后来麦哲伦船队环球航行，从卫星上拍到的地球照片，都证明<b className="text-white">地球是一个球体</b>。</p>
          <p className="mt-2 text-[13.5px] text-white/65">画面里把海面的弯曲放大了很多倍：真实的地球太大，要几十千米外的船才看得出“沉”下去。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">弯的、平的都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">远处的船下半截被海面挡住：地球是个球体</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">海面是弯的，远处的船被弯起来的海面挡住了下半截。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一遍</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">露出海面的部分（示意）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{pct.toFixed(0)}<span className="ml-1 text-[18px] font-medium text-white/55">%</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="d" value={`${d.toFixed(0)} m`} unit="货轮离我们" />
            <ParamTile symbol="h" value={`${hiddenHeight(d, flat).toFixed(1)} m`} unit="被海面挡住的高度" />
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-white/50">站在离海面 {EYE} m 高的船头，用双筒望远镜看。货轮最高处离水面 {SHIP_TOP} m。海面的弯曲画大了。</p>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">还没有记录。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">海面</th><th className="text-right font-normal">距离</th><th className="text-right font-normal">露出</th></tr></thead>
                <tbody>{rows.map(r => <tr key={r.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{r.sea === 'flat' ? '平的' : '弯的'}</td><td className="text-right">{r.d} m</td><td className="text-right font-semibold text-[#7fe3d4]">{r.pct.toFixed(0)}%</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'near'} onClick={() => setStop(s => Math.min(SHIP_STOPS.length - 1, s + 1))} disabled={moving || stop === SHIP_STOPS.length - 1 || flat}>开近一段</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="海面">
          <Segmented label="海面" pulse={next === 'sea'} want={task?.id === 'flat' ? 'flat' : 'curved'} value={sea} onChange={k => changeSea(k as Sea)} options={[{ value: 'curved', label: '弯的' }, { value: 'flat', label: '平的' }]} />
        </Control>
      }
    />
  )
}
