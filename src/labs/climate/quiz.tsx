// 天气和气候 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是从西边高处看过去的气象站全景：观测场、站房、科普广场和远处的大山。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LabStage } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { NEAR, SPOT, type Want } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '下面哪一句说的是气候？', options: ['今天阴转小雨', '明天最高气温 26 ℃', '昆明四季如春', '夜里有雷阵雨'], answer: 2, why: '“四季如春”说的是昆明多年的天气平均状况，是气候；其余三句说的是短时间的天气。' },
  { lesson: '2', q: '百叶箱漆成白色，主要是为了：', options: ['好看，容易找到', '反射阳光，不让箱子被晒热', '吸收阳光，让箱里暖和', '防止生锈'], answer: 1, why: '白色反射阳光，箱子不会被晒热，测到的才是空气的温度。' },
  { lesson: '2', q: '某日 2 时、8 时、14 时、20 时的气温是 10 ℃、12 ℃、20 ℃、14 ℃，这天的日平均气温和一天中气温最高的时候是：', options: ['14 ℃，午后 2 时左右', '14 ℃，正午 12 时', '20 ℃，午后 2 时左右', '15 ℃，正午 12 时'], answer: 0, why: '(10 + 12 + 20 + 14) ÷ 4 = 14 ℃。地面被晒热后再把热传给空气，所以最高气温出现在午后 2 时左右，不在正午。' },
  { lesson: '3', q: '山脚气温 20 ℃，山顶比山脚高 3000 m，山顶的气温约是：', options: ['2 ℃', '17 ℃', '−10 ℃', '14 ℃'], answer: 0, why: '海拔每升高 100 m 约降 0.6 ℃：20 − 0.6 × 30 = 2 ℃。' },
  { lesson: '3', q: '北半球 7 月，同一纬度的陆地和海洋：', options: ['陆地比海洋热', '海洋比陆地热', '一样热', '没有规律'], answer: 0, why: '夏季陆地升温快，同纬度陆地比海洋热，所以 7 月等温线在大陆上向北凸。冬季正好相反。' },
  { lesson: '4', q: '某地 24 小时降水 30 mm，属于：', options: ['小雨', '中雨', '大雨', '暴雨'], answer: 2, why: '24 小时降水 25～49.9 mm 是大雨，50 mm 以上才是暴雨。' },
  { lesson: '5', q: '湿润的海风吹向一座大山，降水多的是：', options: ['迎风坡', '背风坡', '两坡一样多', '山顶以上'], answer: 0, why: '湿润空气沿迎风坡上升、冷却、成云致雨；翻到背风坡时水汽已少，又在下沉，降水少。' },
  { lesson: '6', q: '某地最热月 28 ℃，最冷月 −6 ℃，年平均气温 11 ℃，气温年较差是：', options: ['34 ℃', '17 ℃', '22 ℃', '39 ℃'], answer: 0, why: '年较差 = 最热月 − 最冷月 = 28 − (−6) = 34 ℃，和年平均气温无关。' },
  { lesson: '7', q: '拉萨和杭州纬度差不多，拉萨夏季却凉爽得多，主要原因是：', options: ['纬度位置', '海陆位置', '地形地势', '洋流'], answer: 2, why: '拉萨在青藏高原上，海拔很高，气温低。纬度差不多，所以不是纬度的原因。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:climate:q'

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
  const s = SPOT.overview
  return (
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="天气和气候" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={s.target} span={s.span} view={s.view} {...NEAR} world={{ wx: 'sun', mtn: 0 }}>{null}</LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。天气和气候你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
