// 二次函数 · 第 3 课 把水柱挪一挪（y = a(x − h)² + k 的平移、顶点、对称轴）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { fmt, SHIFT, vformText } from './physics'

type AKey = '-1' | '-2'
const TASKS: Task[] = [
  { id: 'up', text: '把水柱向上移 1 m', note: 'y = −x² + 1：顶点 (0, 1)，上加下减' },
  { id: 'right', text: '再向右移 2 m', note: 'y = −(x − 2)² + 1：顶点 (2, 1)，对称轴 x = 2，左加右减' },
  { id: 'a', text: '把 a 换成 −2', note: '水柱变窄了，顶点还是 (2, 1)：a 只管形状' },
]

export default function Lesson3() {
  const [up, setUp] = useState(false)
  const [right, setRight] = useState(false)
  const [ak, setAk] = useState<AKey>('-1')
  const T = useTasks('gewu:quadratic:3', TASKS)
  const tk = up ? SHIFT.up : 0, th = right ? SHIFT.right : 0, ta = +ak
  const k = useSlide(tk, 0.45), h = useSlide(th, 0.7), a = useSlide(ta, 0.7)
  const settled = k === tk && h === th && a === ta
  useEffect(() => { if (!settled) return; T.check(id => (id === 'up' && up) || (id === 'right' && right && up) || (id === 'a' && ak === '-2' && right && up)) }, [settled, up, right, ak])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setUp(false); setRight(false); setAk('-1'); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'up' | 'right' | 'a' | null } = !task ? { hint: '水柱挪好了。h、k 管顶点在哪，a 管开口的形状。', next: null }
    : !settled ? { hint: '水柱在移动…', next: null }
    : task.id === 'up' ? { hint: '按“向上移 1”：加大水压，水柱整体升高 1 m', next: 'up' }
    : task.id === 'right' ? { hint: '按“向右移 2”：喷头小车沿导轨往右走 2 m', next: 'right' }
    : { hint: '把 a 换成 −2，看顶点变不变', next: 'a' }

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="音乐喷泉"
      stage={<Scene3 a={a} h={h} k={k} axis={right} />}
      lesson={<LessonBlock no="3" title="把水柱挪一挪" concept="h、k 定位置，a 定形状" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把 <span className="font-formula italic">y = ax²</span> 的图像向上平移 <span className="font-formula italic">k</span>（k &lt; 0 时向下），得到 <span className="font-formula italic">y = ax² + k</span>；再向右平移 <span className="font-formula italic">h</span>（h &lt; 0 时向左），得到 <span className="font-formula italic">y = a(x − h)² + k</span>。</p>
          <p className="mt-3">它的顶点是 <span className="font-formula italic">(h, k)</span>，对称轴是直线 <span className="font-formula italic">x = h</span>。平移只改变位置，不改变形状，所以 <span className="font-formula italic">a</span> 不变。</p>
          <p className="mt-3">记法：括号里“左加右减”，括号外“上加下减”。向右移 2，括号里是 <span className="font-formula italic">x − 2</span>。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">水柱挪好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">y = a(x − h)² + k 的顶点是 (h, k)，对称轴是 x = h</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">y = a(x − h)² + k</div>
            <div className="mt-1 font-formula text-[30px] leading-tight font-bold italic">{vformText(ta, th, tk)}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="a" value={fmt(ta)} unit="形状" />
            <ParamTile symbol="h" value={fmt(th)} unit="m · 左右" />
            <ParamTile symbol="k" value={fmt(tk)} unit="m · 上下" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="顶点" value={`(${fmt(th)}, ${fmt(tk)})`} unit="(h, k)" />
            <ParamTile symbol="对称轴" value={`x = ${fmt(th)}`} unit="x = h" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'up'} pulse={next === 'up'} onClick={() => setUp(true)} disabled={up}>向上移 1</LabButton>
        <LabButton primary={next === 'right'} pulse={next === 'right'} onClick={() => setRight(true)} disabled={right || !up}>向右移 2</LabButton>
      </>}
      extras={<Control label="a 的值"><Segmented label="a 的值" pulse={next === 'a'} want={next === 'a' ? '-2' : null} value={ak} onChange={setAk} options={[{ value: '-1', label: 'a = −1' }, { value: '-2', label: 'a = −2' }]} /></Control>}
    />
  )
}
