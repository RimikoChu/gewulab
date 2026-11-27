// 洋流和厄尔尼诺 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。
// 背景是日本以东的海面：日本暖流和千岛寒流在北海道外海交汇，渔船在那里作业，科考船停在暖流上。
import { useState } from 'react'
import * as THREE from 'three'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LabStage } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { R, azFor, sph } from './ocean'
import { OnSea } from './parts'
import { FishingBoat, ResearchShip, Wake } from './ships'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '形成洋流最主要的动力是：', options: ['海水的密度差异', '盛行风', '地转偏向力', '陆地的阻挡'], answer: 1, why: '盛行风吹拂海面，推动海水随风漂流，形成风海流，这是最主要的洋流。密度差异形成的是密度流。' },
  { lesson: '1', q: '直布罗陀海峡表层海水的流向是：', options: ['从地中海流向大西洋', '从大西洋流向地中海', '表层不流动', '随季节来回变化'], answer: 1, why: '地中海蒸发旺盛、盐度高、密度大，海水从底层流出；大西洋密度小的海水从表层流入地中海。' },
  { lesson: '2', q: '北半球中低纬海区的大洋环流：', options: ['顺时针，大洋东岸是暖流', '顺时针，大洋东岸是寒流', '逆时针，大洋东岸是寒流', '逆时针，大洋西岸是寒流'], answer: 1, why: '北半球中低纬的大洋环流顺时针流动：大洋西岸（大陆东岸）是暖流，东岸（大陆西岸）是寒流，例如加利福尼亚寒流。' },
  { lesson: '3', q: '北印度洋夏季的季风洋流：', options: ['吹东北季风，逆时针', '吹东北季风，顺时针', '吹西南季风，顺时针', '吹西南季风，逆时针'], answer: 2, why: '北印度洋夏季吹西南季风，洋流顺时针流动；冬季吹东北季风，逆时针流动。夏顺冬逆。' },
  { lesson: '3', q: '南半球中高纬海区的洋流是：', options: ['以副极地为中心的逆时针环流', '以副极地为中心的顺时针环流', '自西向东环绕南极的西风漂流', '自东向西环绕南极的洋流'], answer: 2, why: '南半球中高纬海区几乎没有陆地阻挡，盛行西风吹出自西向东环绕南极的西风漂流，不形成环流。' },
  { lesson: '4', q: '秘鲁沿岸形成狭长荒漠，和洋流有关的原因是：', options: ['暖流增温增湿', '寒流降温减湿', '寒暖流交汇', '洋流带来大量降水'], answer: 1, why: '秘鲁寒流使近海面的空气降温，上冷下暖，空气不易上升成云致雨，沿岸干燥少雨。' },
  { lesson: '5', q: '北海道渔场形成的主要原因是：', options: ['上升流把营养盐带到表层', '日本暖流和千岛寒流交汇', '北大西洋暖流和东格陵兰寒流交汇', '河流带来大量泥沙'], answer: 1, why: '日本暖流和千岛寒流在北海道附近交汇，海水受扰动，营养盐上泛，浮游生物多，鱼类集中。秘鲁渔场才是上升流形成的。' },
  { lesson: '6', q: '关于洋流对海洋污染的影响，说法正确的是：', options: ['洋流使污染范围缩小', '洋流能把污染物带走，海洋就不会被污染', '洋流加快污染物扩散和净化，但扩大了污染范围', '洋流对污染没有影响'], answer: 2, why: '洋流把污染物带到其他海域，扩散快、净化也快；但污染的范围扩大了。' },
  { lesson: '7', q: '厄尔尼诺发生时，下列现象可能出现的是：', options: ['东南信风增强', '秘鲁沿岸上升流增强，渔获增加', '秘鲁沿岸降水增多，印度尼西亚干旱', '赤道东太平洋表层水温降低'], answer: 2, why: '厄尔尼诺时信风减弱，暖水东移，赤道中东太平洋变暖，秘鲁沿岸上升流减弱、渔获减少、降水增多；西太平洋沿岸干旱。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:ocean:q'
const RAD = Math.PI / 180
const LON = 146, LAT = 39
const TARGET = new THREE.Vector3(...sph(LON, LAT, R * 0.96)), VIEW: [number, number] = [azFor(LON) - 0.25, LAT * RAD + 0.2], SPAN: [number, number] = [6.6, 4.4]
const WANT: Want = { sun: { az: azFor(LON) / RAD + 35, lat: 40 }, night: 0.55, cloud: 0.25, grid: 0.05, flows: { keys: ['kuroshio', 'oyashio', 'npc'], on: 0.85, speed: 0.6, size: 0.26 }, blooms: [[145, 41.5, 3.6, 0.8]] }

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
  return (
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="洋流和厄尔尼诺" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={WANT}>
        {([[144.2, 41.6, 60], [146.4, 42.4, 200], [145.6, 40.6, 120], [143.6, 40.3, 300]] as [number, number, number][]).map(([lo, la, h], i) => <OnSea key={i} lon={lo} lat={la} heading={h} scale={0.0095}><FishingBoat hull={i % 2 ? '#3a78a8' : '#e9e6dc'} /></OnSea>)}
        <OnSea lon={142.6} lat={36.2} heading={60} scale={0.0048}><ResearchShip /><Wake len={70} w={16} /></OnSea>
      </LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。洋流和厄尔尼诺你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
