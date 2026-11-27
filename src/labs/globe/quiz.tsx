// 地球和经纬网 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是海上的整艘科考船。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { LabStage } from '@/lab-kit'
import * as THREE from 'three'
import type { Want } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '站在海边看一艘远处驶来的船，最先看到的是什么？', options: ['整条船，只是很小', '船身', '桅杆', '船底'], answer: 2, why: '海面是弯的，远处的船下半截被海面挡住，所以先看到高高的桅杆，开近了才看到船身。' },
  { lesson: '2', q: '地球仪上，地轴和地面的夹角是多少？', options: ['23.5°', '66.5°', '90°', '0°'], answer: 1, why: '地球仪的地轴斜着装，和地面成 66.5°。23.5° 是地轴偏离竖直方向的角度，别弄混。' },
  { lesson: '3', q: '下面哪一条纬线最长？', options: ['北纬 60°', '南纬 30°', '赤道', '北纬 30°'], answer: 2, why: '赤道是最长的纬线，往两极逐渐变短，到极点缩成一个点。' },
  { lesson: '4', q: '关于经线，说法正确的是哪一个？', options: ['经线是圆圈，越往两极越短', '经线是半圆，长度都相等', '本初子午线最长', '经线指示东西方向'], answer: 1, why: '经线连接南北两极，是半个圆圈，长度都相等，指示南北方向。' },
  { lesson: '5', q: '东经的度数朝哪个方向增大？', options: ['向东', '向西', '向北', '向南'], answer: 0, why: '东经度数向东增大，西经度数向西增大；北纬度数向北增大，南纬度数向南增大。' },
  { lesson: '6', q: '一个地方在西经 10°，它属于东半球还是西半球？', options: ['西半球，因为是西经', '东半球，因为在 20°W 以东', '不属于任何半球', '东西半球各占一半'], answer: 1, why: '东西半球用 20°W 和 160°E 分。西经 10° 在 20°W 以东，属于东半球。' },
  { lesson: '7', q: '甲、乙两地在同一条经线上，乙的纬度比甲大（都在北半球）。乙在甲的什么方向？', options: ['正东', '正西', '正北', '正南'], answer: 2, why: '经线指示南北方向。北半球纬度越大越靠北，所以乙在甲的正北。' },
  { lesson: '5', q: '一艘船在东经 170°，向东航行了 20 个经度，它到了哪里？', options: ['东经 190°', '西经 170°', '东经 150°', '西经 10°'], answer: 1, why: '经度最大到 180°。过了 180° 经线，东经变成西经：170°E 再往东 20° 是 170°W。' },
  { lesson: '6', q: '一个地方在 30°S、30°E，它在哪两个半球？', options: ['北半球、东半球', '南半球、东半球', '南半球、西半球', '北半球、西半球'], answer: 1, why: '南纬在赤道以南，是南半球；30°E 在 20°W 以东、160°E 以西，是东半球。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:globe:q'
const TARGET = new THREE.Vector3(2, 9, 0)

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
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="地球和经纬网" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={TARGET} span={[92, 40]} view={[0.75, 0.16]} fog={[300, 2400]} world={{}}>{null}</LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。经纬网你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
