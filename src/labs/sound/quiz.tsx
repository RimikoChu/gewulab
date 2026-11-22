// 声现象 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是那支音叉和乒乓球。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { BallStand, FORK, Fork, Hall, Rings } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ECHO_GAP, V_AIR, echoDistance, echoTime } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '敲响的音叉接触悬挂着的乒乓球，乒乓球被弹开。这说明什么？', options: ['声音能在空气中传播', '发声的音叉在振动', '乒乓球能发声', '音叉的音调很高'], answer: 1, why: '声音是由物体的振动产生的。音叉的振动太小看不清，乒乓球把它“放大”成了看得见的跳动。' },
  { lesson: '1', q: '正在响的鼓，用手一按鼓面，鼓声立刻停了。原因是什么？', options: ['手把声音吸走了', '手挡住了声音的传播', '鼓面停止了振动', '鼓面的音调变低了'], answer: 2, why: '振动停止，发声也停止。手按住鼓面，鼓面不再振动，就不再发声。' },
  { lesson: '2', q: '把正在响的闹钟放进玻璃罩，逐渐抽出罩里的空气，听到的铃声怎样变化？由此能推出什么？', options: ['越来越响；空气会妨碍传声', '不变；玻璃能传声', '越来越轻；真空不能传声', '越来越轻；闹钟慢慢停了'], answer: 2, why: '闹钟一直在响，空气越少听到的越轻。由此推理：如果罩里是真空，就听不到声音了。声音的传播需要介质。' },
  { lesson: '3', q: `对着远处的一面墙喊一声，${echoTime(34).toFixed(1)} s 后听到回声。空气中的声速取 ${V_AIR} m/s，墙离人多远？`, options: [`${echoDistance(echoTime(34)) * 2} m`, `${echoDistance(echoTime(34))} m`, `${echoDistance(echoTime(34)) / 2} m`, `${V_AIR} m`], answer: 1, why: `声音走的是一个来回：${V_AIR} m/s × ${echoTime(34).toFixed(1)} s = ${(V_AIR * echoTime(34)).toFixed(0)} m，再除以 2，墙在 ${echoDistance(echoTime(34))} m 处。忘了除以 2 是最常见的错。` },
  { lesson: '3', q: `人要把回声和原声分开，回声至少要晚到 ${ECHO_GAP} s。这时障碍物至少离人多远？`, options: ['34 m', '340 m', '17 m', '1.7 m'], answer: 2, why: `${V_AIR} m/s × ${ECHO_GAP} s ÷ 2 = ${echoDistance(ECHO_GAP).toFixed(0)} m。比这更近，回声和原声混在一起，只觉得声音更响。` },
  { lesson: '4', q: '把钢尺压在桌边拨动。伸出桌边的部分越短，会怎样？', options: ['振动越慢，音调越低', '振动越快，音调越高', '振幅越大，响度越大', '音色变了，音调不变'], answer: 1, why: '伸出越短，振动越快，频率越高，音调就越高。音调由频率决定。' },
  { lesson: '5', q: '用更大的力敲同一面鼓，鼓声发生的变化主要是什么？', options: ['音调变高', '音色改变', '响度变大', '传播得更快'], answer: 2, why: '用力大，鼓面的振幅大，响度就大。音调由频率决定，同一面鼓的音调基本不变；声速和敲得轻重无关。' },
  { lesson: '6', q: '音叉、吉他、长笛奏同一个音，闭着眼也能分清是哪一种乐器。依据的是声音的什么？', options: ['音调', '响度', '音色', '传播速度'], answer: 2, why: '不同的发声体，材料、结构不同，音色不同。它们的音调、响度可以相同，但波形的形状不一样。' },
  { lesson: '7', q: '下面哪一种做法，是在传播途中减弱噪声？', options: ['给摩托车装上消声器', '在公路两旁建隔音屏', '工人戴上防噪声耳罩', '禁止在医院附近鸣笛'], answer: 1, why: '隔音屏是在传播途中阻断噪声。消声器、禁止鸣笛是在声源处，耳罩是在人耳处。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:sound:q'

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const q = QS[i], mine = picked[i]
  const answered = picked.filter(x => x !== null).length, right = picked.filter((x, k) => x === QS[k].answer).length
  const choose = (k: number) => {
    if (mine !== null) return
    const n = picked.map((x, j) => j === i ? k : x); setPicked(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (n.every(x => x !== null)) setTimeout(() => setFinale(true), 1400)
  }
  const resetAll = () => { setPicked(QS.map(() => null)); setI(0); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const done = { all: answered === QS.length, pass: right >= 7 }
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到第 ${q.lesson} 课再做一遍`
  return (
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="声现象" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Hall at="fork" labels={[]}>
        <Fork x={-0.6} level={() => 0.45} />
        <BallStand x={-2.35} to={[-0.6 - FORK.dx - FORK.half - 0.1, FORK.top + 0.85]} len={1.05} dir={-1} level={() => 0.45} />
        <Rings at={[-0.6, FORK.top - 0.4, 0]} level={() => 0.6} r1={2.6} />
      </Hall>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。声音的产生、传播和三个特性你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>看每题的讲解</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-center justify-between text-[12.5px] text-white/55"><span>第 {i + 1} / {QS.length} 题 · 对应第 {q.lesson} 课</span><span className="tabular-nums">答对 {right} / {answered}</span></div>
          <div className="mt-2 flex gap-1">{QS.map((x, k) => <button key={k} onClick={() => setI(k)} aria-label={`第 ${k + 1} 题`} className={cn('h-1.5 flex-1 rounded-full', picked[k] === null ? 'bg-white/15' : picked[k] === x.answer ? 'bg-[#35c7b3]' : 'bg-[#ff6b6b]', k === i && 'ring-2 ring-white/60')} />)}</div>
          <p className="mt-4 text-[16px] leading-relaxed font-medium">{q.q}</p>
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((o, k) => {
              const isRight = mine !== null && k === q.answer, isWrong = mine === k && k !== q.answer
              return (
                <button key={k} onClick={() => choose(k)} disabled={mine !== null}
                  className={cn('flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors', isRight ? 'bg-[#35c7b3]/25 text-white' : isWrong ? 'bg-[#ff6b6b]/25 text-white' : mine !== null ? 'bg-white/6 text-white/50' : 'bg-white/10 hover:bg-white/18')}>
                  <span className={cn('grid size-6 flex-none place-items-center rounded-full text-[13px] font-semibold', isRight ? 'bg-[#35c7b3] text-[#06231f]' : isWrong ? 'bg-[#ff6b6b] text-white' : 'bg-white/12')}>{isRight ? <Check className="size-3.5" strokeWidth={3.5} /> : isWrong ? <X className="size-3.5" strokeWidth={3.5} /> : 'ABCD'[k]}</span>{o}
                </button>
              )
            })}
          </div>
          {mine !== null && <p className="hint-in mt-4 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">{q.why}</p>}
        </Glass>
      }
      actions={<>
        <LabButton onClick={() => setI(k => Math.max(0, k - 1))} disabled={i === 0}><ArrowLeft className="size-4" />上一题</LabButton>
        <LabButton primary={mine !== null} pulse={mine !== null && i < QS.length - 1} onClick={() => setI(k => Math.min(QS.length - 1, k + 1))} disabled={i === QS.length - 1}>下一题<ArrowRight className="size-4" /></LabButton>
        {mine !== null && mine !== q.answer && <LabButton onClick={() => goLesson(q.lesson)}>回第 {q.lesson} 课</LabButton>}
      </>}
      extras={null}
    />
  )
}
