// 大气环流 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整颗地球，画着气压带和流动的风。
import { useState } from 'react'
import * as THREE from 'three'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LabStage } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import type { Air } from './physics'
import { VOICE } from './voice'
import { SPACE, azFor, type Want } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '假设地球不自转、地表均匀，北半球近地面吹：', options: ['南风', '北风', '东风', '西风'], answer: 1, why: '不自转时只有单圈环流：近地面空气从极地的高压流向赤道的低压，北半球是北风。' },
  { lesson: '2', q: '副热带高气压带形成的主要原因是：', options: ['那里地面受热多，空气上升', '那里地面冷却，空气下沉', '高空气流受地转偏向力偏成西风，在那里堆积下沉', '冷暖空气相遇，暖空气被抬升'], answer: 2, why: '副热带高气压带是动力原因形成的：赤道上空流向极地的气流偏转成西风，在 30° 附近堆积下沉。' },
  { lesson: '3', q: '南半球西风带的风向是：', options: ['西南风', '西北风', '东南风', '东北风'], answer: 1, why: '风从副热带高压吹向副极地低压，南半球向左偏，成了西北风。北半球向右偏才是西南风。' },
  { lesson: '4', q: '北半球夏季，气压带和风带的位置大致：', options: ['向北移动', '向南移动', '不动', '向东移动'], answer: 0, why: '气压带和风带随太阳直射点移动：就北半球来说，夏季北移，冬季南移。' },
  { lesson: '5', q: '地中海气候夏季炎热干燥，主要因为夏季受：', options: ['赤道低气压带控制', '西风带控制', '副热带高气压带控制', '东北信风带控制'], answer: 2, why: '夏季气压带北移，副热带高气压带控制那里，空气下沉，少雨；冬季受西风带控制，温和多雨。' },
  { lesson: '6', q: '1 月，切断北半球副极地低气压带的是：', options: ['夏威夷高压', '亚洲高压', '亚速尔高压', '印度低压'], answer: 1, why: '1 月亚欧大陆比海洋冷，形成亚洲高压，把副极地低气压带切断，只剩海洋上的阿留申低压和冰岛低压。' },
  { lesson: '7', q: '东亚夏季风的风向和主要成因是：', options: ['西北风，海陆热力性质差异', '东南风，海陆热力性质差异', '西南风，气压带风带季节移动', '东北风，气压带风带季节移动'], answer: 1, why: '夏季亚欧大陆热，形成亚洲低压，太平洋上是高压，风从海洋吹向大陆，东亚吹东南风。' },
  { lesson: '7', q: '南亚夏季吹西南风，主要因为：', options: ['东北信风越过赤道向左偏', '东南信风越过赤道向右偏', '西风带南移', '极地东风南下'], answer: 1, why: '夏季气压带风带北移，南半球的东南信风越过赤道，在北半球受地转偏向力向右偏，成了西南风。' },
  { lesson: '5', q: '雅典（约 38°N）7 月少雨、1 月多雨，下列解释最完整的是：', options: ['7 月受西风带、1 月受副热带高压控制', '7 月受副热带高压、1 月受西风带控制，因为气压带随直射点南北移动', '全年受副热带高压控制', '全年受西风带控制'], answer: 1, why: '直射点北移时副热带高压北移到雅典，少雨；直射点南移时副热带高压南撤，雅典落进西风带，多雨。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:circulation:q'
const AIR: Air = { k: 1, sunLat: 0 }
const LON = 5, AZ = azFor(LON), TARGET = new THREE.Vector3(0, 0, 0), VIEW: [number, number] = [AZ, 0.22], SPAN: [number, number] = [23, 22]

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
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到${q.lesson === 'x' ? '拓展课' : `第 ${q.lesson} 课`}再做一遍`
  const want: Want = { sun: { az: AZ / (Math.PI / 180) + 30, lat: 8 }, night: 0.3, cloud: 0.5, grid: 0.3, press: { air: AIR, key: 'three', on: 0.6 }, winds: { air: AIR, on: 1, n: 1500 } }
  return (
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="大气环流" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。大气环流你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
