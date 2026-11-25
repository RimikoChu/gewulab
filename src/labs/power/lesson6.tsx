// 电功率和生活用电 · 第 6 课 安全用电：阳台墙上的五孔插座和插在三孔插座上的洗衣机。
// 戴手套的手拿试电笔：手按住笔尾，笔尖插进右孔（火线）氖管发光，插进左孔（零线）不亮；手不碰笔尾时插火线也不亮。
// 最后洗衣机的外壳漏电：漏电电流沿地线流走，配电箱里的漏电保护器跳闸，切断电路。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { HOLES, U_HOME, penGlows, type Hole } from './physics'
import { useLater, useTween } from './parts'
import { Big } from './views'
import { Place } from './world'
import { BACK, BAL_SOCKET, BAL_SOCKET3, WASHER, type V3 } from './layout'
import { Glove, HouseWire, TestPen } from './home'
import { BOX_ON, HOLE5 } from './panel'

const TASKS: Task[] = [
  { id: 'right', text: '手按住笔尾，把笔尖插进右孔', note: '氖管发光：右孔接的是火线' },
  { id: 'left', text: '再插进左孔', note: '氖管不亮：左孔接的是零线' },
  { id: 'free', text: '手不碰笔尾，再插右孔', note: '不亮：用试电笔时手要接触笔尾金属体' },
  { id: 'leak', text: '让洗衣机的外壳漏电，看漏电保护器', note: '外壳接了地线，漏电保护器立刻切断电路' },
]
type Grip = 'tail' | 'free'
/** 插座上某个孔（cm）的场景坐标 */
const hole = (h: Hole): V3 => { const [x, y] = HOLE5[h]; return [BAL_SOCKET[0] + x * 0.1, BAL_SOCKET[1] + y * 0.1, BACK + 0.1] }
const REST: V3 = [BAL_SOCKET[0] + 0.9, BAL_SOCKET[1] - 0.2, BACK + 1.6]

export default function Lesson6() {
  const [grip, setGrip] = useState<Grip>('tail')
  const [at, setAt] = useState<Hole | null>(null)
  const [leak, setLeak] = useState(false)
  const [trip, setTrip] = useState(false)
  const [seen, setSeen] = useState<Record<string, boolean>>({})
  const T = useTasks('gewu:power:6', TASKS)
  const later = useLater()
  const k = useTween(0, 1.4)                      // 0 拿在外面，1 插进孔里
  const target = at ? hole(at) : REST
  const pos: V3 = [REST[0] + (target[0] - REST[0]) * k.x, REST[1] + (target[1] - REST[1]) * k.x, REST[2] + (target[2] - REST[2]) * k.x]
  const inserted = at !== null && k.x > 0.999
  const lit = inserted && !trip && penGlows(at!, grip === 'tail')
  const insert = (h: Hole) => { if (k.moving || leak) return; setAt(h); k.snap(0); k.go(1) }
  // 笔尖插到底的那一刻看氖管：手按着笔尾时，插右孔、左孔各是一条任务；手不碰笔尾时插右孔是另一条
  useEffect(() => {
    if (!inserted || !at) return
    const id = grip === 'tail' ? at : (at === 'right' ? 'free' : null)
    if (!id) return
    setSeen(s => ({ ...s, [id]: true })); T.check(t => t === id)
  }, [inserted, at, grip])   // eslint-disable-line react-hooks/exhaustive-deps
  const pickGrip = (g: Grip) => { if (k.moving) return; setGrip(g); setAt(null); k.snap(0) }
  const doLeak = () => { if (leak) return; setAt(null); k.snap(0); setLeak(true); later.after(1600, () => { setTrip(true); T.check(t => t === 'leak') }) }
  const resetAll = () => { later.clear(); setGrip('tail'); setAt(null); k.snap(0); setLeak(false); setTrip(false); setSeen({}); T.reset() }

  const task = T.current
  const { hint, next, want }: { hint: string; next: 'right' | 'left' | 'grip' | 'leak' | null; want?: Grip } = !task ? { hint: '试电笔接触火线时，氖管才会发光。', next: null }
    : k.moving ? { hint: '把笔尖插进插孔…', next: null }
    : task.id === 'right' ? (grip !== 'tail' ? { hint: '手指按住笔尾的金属体', next: 'grip', want: 'tail' } : { hint: '手按住笔尾，把笔尖插进右孔', next: 'right' })
    : task.id === 'left' ? { hint: '再把笔尖插进左孔', next: 'left' }
    : task.id === 'free' ? (grip !== 'free' ? { hint: '这一次，手不碰笔尾', next: 'grip', want: 'free' } : { hint: '手不碰笔尾，再把笔尖插进右孔', next: 'right' })
    : leak ? { hint: '洗衣机的外壳漏电了…', next: null }
    : { hint: '洗衣机插在三孔插座上。让它的外壳漏电，看会怎样', next: 'leak' }

  const plugTop: V3 = [BAL_SOCKET3[0], BAL_SOCKET3[1] - 0.3, BACK + 0.25]
  const labels: Label[] = [
    { id: 'neon', at: [pos[0], pos[1] + 0.5, pos[2] + 0.7], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: inserted && !leak ? 1 : 0 }, children: <><small>氖管</small>{lit ? '发光' : '不亮'}</> },
    { id: 'L', at: [...hole('right')].map((v, i) => i === 0 ? v + 0.35 : i === 1 ? v + 0.35 : v) as V3, ax: 0, className: 'scene-name -translate-y-full', name: true, children: '右孔' },
    { id: 'N', at: [...hole('left')].map((v, i) => i === 0 ? v - 0.35 : i === 1 ? v + 0.35 : v) as V3, ax: 1, className: 'scene-name -translate-y-full', name: true, children: '左孔' },
    { id: 'E', at: [BAL_SOCKET[0], BAL_SOCKET[1] - 0.6, BACK + 0.1], ax: 1, className: 'scene-name -translate-y-1/2', name: true, children: '接地孔 ' },
    { id: 'leak', at: [WASHER[0], WASHER[1] + 10, WASHER[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: leak ? 1 : 0 }, children: trip ? <><small>漏电保护器</small>跳闸，电路断开</> : <><small>外壳漏电</small>电流沿地线流走</> },
  ]
  // 漏电时电流的路：洗衣机外壳 → 插头 → 三孔插座上面的接地孔 → 墙里的地线
  const pe: V3[] = [[WASHER[0] - 2.8, 7.5, WASHER[2] - 2.6], [plugTop[0] + 0.3, 7.5, BACK + 0.3], [plugTop[0] + 0.3, plugTop[1] + 0.3, BACK + 0.3], [plugTop[0] + 0.3, 26, BACK + 0.2], [10.5, 26, BACK + 0.2]]
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="试电笔"
      stage={<Place at={leak || task?.id === 'leak' ? 'l6b' : 'l6'} labels={labels} world={{ washer: !trip, box: { ...BOX_ON, rcd: !trip, main: true } }}>
        {!leak && <group position={pos}>
          <group scale={0.1} rotation-y={1.25}><group rotation-x={0.2}>
            <TestPen glow={lit} />
            {grip === 'tail' ? <group position={[0, 1.0, 11.6]} scale={0.85}><Glove arm={4} /></group> : <group position={[0, 1.2, 3.0]} rotation-x={-0.55} scale={0.85}><Glove pinch={false} arm={4} /></group>}
          </group></group>
        </group>}
        {leak && <HouseWire pts={pe} color="#c9b81e" flow={trip ? 0 : 0.6} r={0.12} />}
      </Place>}
      lesson={<LessonBlock no="6" title="安全用电" concept="试电笔接触火线时氖管发光" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>试电笔用来辨别火线和零线。使用时，<b className="text-white">手要接触笔尾的金属体，不能碰笔尖</b>。笔尖接触火线时，电流经笔尖、电阻、氖管、人体流到大地，氖管发光；笔里的电阻很大，电流很小，人没有危险。接触零线时氖管不亮。</p>
          <p className="mt-3">有金属外壳的用电器（洗衣机、电冰箱、电热水器）要用三孔插座：<b className="text-white">上面那个孔接地线</b>，外壳万一带电，电流会沿地线流入大地；漏电保护器发现火线和零线的电流不相等，就迅速切断电路。</p>
          <p className="mt-3 text-[13.5px] text-white/65">触电的两种情况：人站在地上，一只手碰到火线（单线触电）；两只手分别碰到火线和零线（双线触电）。不接触低压带电体，不靠近高压带电体；发现有人触电，先切断电源。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">试电笔和地线</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">手按笔尾，笔尖接火线，氖管才发光</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">有金属外壳的用电器要接地线；外壳漏电时，漏电保护器切断电路。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Big label="氖管" value={inserted && !leak ? (lit ? '发光' : '不亮') : '—'} unit="" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="右孔" value={seen.right ? `${HOLES.right.u} V` : '?'} unit={seen.right ? '对地 · 火线' : '对地电压'} />
            <ParamTile symbol="左孔" value={seen.left ? `${HOLES.left.u} V` : '?'} unit={seen.left ? '对地 · 零线' : '对地电压'} />
          </div>
          <div className="mt-2"><ParamTile symbol="U" value={String(U_HOME)} unit="V · 火线和零线之间" /></div>
          <h2 className="mt-4 text-[12.5px] text-white/55">漏电保护器</h2>
          <p className="mt-1 text-[14.5px] font-semibold">{trip ? '已跳闸，电路断开' : leak ? '火线和零线的电流不相等…' : '合着'}</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'right'} onClick={() => insert('right')} disabled={k.moving || leak}>插进右孔</LabButton>
        <LabButton pulse={next === 'left'} onClick={() => insert('left')} disabled={k.moving || leak}>插进左孔</LabButton>
        <LabButton primary={next === 'leak'} pulse={next === 'leak'} onClick={doLeak} disabled={leak || task?.id !== 'leak'}>外壳漏电</LabButton>
      </>}
      extras={
        <Control label="手">
          <Segmented label="手" pulse={next === 'grip'} want={want ?? null} disabled={k.moving || leak} value={grip} onChange={g => pickGrip(g as Grip)} options={[{ value: 'tail', label: '按住笔尾' }, { value: 'free', label: '不碰笔尾' }]} />
        </Control>
      }
    />
  )
}
