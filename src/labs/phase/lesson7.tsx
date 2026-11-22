// 物态变化 · 第 7 课 六种物态变化（从山脚到雪线上的六处现象，各是哪一种变化、吸热还是放热）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Done, H2, Room } from './parts'
import { CHANGES, CHANGE_KEYS, NATURE, PAIRS, byHeat, type Change, type NatureKey } from './physics'
import { Triangle } from './views'
import { SITE } from './world'

type Pick = Change | 'none'
const ORDER = PAIRS.flatMap(p => p.keys), ITEM = Object.fromEntries(NATURE.map(n => [n.key, n])) as Record<NatureKey, typeof NATURE[number]>
const TASKS: Task[] = PAIRS.map(p => ({ id: p.id, text: `${p.name}：认出“${ITEM[p.keys[0]].name}”和“${ITEM[p.keys[1]].name}”`, note: p.keys.map(k => `${ITEM[k].name}是${CHANGES[ITEM[k].is].name}（${CHANGES[ITEM[k].is].heat}）`).join('，') }))
/** 每一处画面上的名字标在哪里（相对那块平地的中心） */
const TAGS: Record<NatureKey, { text: string; at: [number, number, number] }[]> = {
  thaw: [{ text: '冰凌在滴水', at: [1.6, 2.2, 0.8] }, { text: '残雪', at: [-2.6, 4.8, -1.2] }, { text: '雪水汇成的小溪', at: [1.8, 0.3, 4.4] }],
  pond: [{ text: '冰面', at: [-5.5, 0.4, 2] }, { text: '还没冻上的水', at: [1.5, 0.3, 0.6] }],
  dry: [{ text: '晾着的湿衣服', at: [0.1, 8.9, 0] }],
  dew: [{ text: '草叶上的露', at: [0.4, 1.1, 1.6] }, { text: '雾', at: [-4, 3.6, -8] }],
  stiff: [{ text: '冻硬的衣服', at: [0.1, 8.9, 0] }, { text: '气温一直在 0 ℃ 以下', at: [5.2, 2.2, 1] }],
  frost: [{ text: '百叶箱上的霜', at: [0.5, 10.4, 0.5] }, { text: '飘落的雪', at: [-4.2, 6.5, 2] }],
}

export default function Lesson7() {
  const [got, setGot] = useState<NatureKey[]>([])
  const [at, setAt] = useState(0)
  const [pick, setPick] = useState<Pick>('none')
  const [miss, setMiss] = useState(false)
  const T = useTasks('gewu:phase:7', TASKS)
  const key = ORDER[Math.min(at, ORDER.length - 1)], item = ITEM[key], ch = CHANGES[item.is], right = got.includes(key)
  const confirm = () => {
    if (pick === 'none' || right) return
    if (pick !== item.is) { setMiss(true); return }
    const next = [...got, key]; setGot(next); setMiss(false); T.check(id => PAIRS.find(p => p.id === id)!.keys.every(k => next.includes(k)))
  }
  const go = () => { if (right && at < ORDER.length - 1) { setAt(at + 1); setPick('none'); setMiss(false) } }
  const resetAll = () => { setGot([]); setAt(0); setPick('none'); setMiss(false); T.reset() }
  const { hint, next }: { hint: string; next: 'pick' | 'ok' | 'go' | null } = right
    ? (at < ORDER.length - 1 ? { hint: `对了：${item.why}，是${ch.name}，${ch.heat}。按“看下一处”`, next: 'go' } : { hint: '六处都认出来了：三种吸热，三种放热。', next: null })
    : miss ? { hint: `不是${pick === 'none' ? '' : CHANGES[pick].name}。想一想：变化之前是什么状态，变化之后是什么状态？`, next: 'pick' }
    : pick === 'none' ? { hint: `${item.where}：${item.name}。这是哪一种物态变化？`, next: 'pick' }
    : { hint: '选好了就按“确定”', next: 'ok' }
  const s = SITE[key]
  const labels: Label[] = TAGS[key].map((t, i): Label => ({ id: `${key}${i}`, at: [s.x + t.at[0], s.y + t.at[1], s.z + t.at[2]], ax: 0.5, className: i === 0 ? 'scene-tag -translate-y-full' : 'scene-name -translate-y-full', children: t.text }))
  const shown = got.map(k => ITEM[k].is)
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={`第 ${Math.min(at, ORDER.length - 1) + 1} / ${ORDER.length} 处 · ${item.where}`}
      stage={<Room at={key} labels={labels} />}
      lesson={<LessonBlock no="7" title="六种物态变化" concept="三种吸热，三种放热" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>物质常见的状态有固态、液态、气态三种，它们之间一共有六种变化。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>吸热的三种：{byHeat('吸热').map(k => `${CHANGES[k].name}（${CHANGES[k].from}→${CHANGES[k].to}）`).join('、')}</li>
            <li>放热的三种：{byHeat('放热').map(k => `${CHANGES[k].name}（${CHANGES[k].from}→${CHANGES[k].to}）`).join('、')}</li>
          </ul>
          <p className="mt-3">判断的办法：先看变化前后各是什么状态，再对名称。</p>
          <p className="mt-3 text-[13.5px] text-white/65">云是水蒸气上升到高空遇冷，液化成的小水滴和凝华成的小冰晶；小冰晶下落时熔化，就成了雨。雾和露都是水蒸气液化成的小水滴，雾浮在空中，露挂在草叶上。霜和雪是水蒸气凝华成的冰晶。</p>
        </>} />}
      finale={T.finale && <Done head="六处都认出来了" title="三种吸热，三种放热" onClose={() => T.setFinale(false)}>{byHeat('吸热').map(k => CHANGES[k].name).join('、')}吸热；{byHeat('放热').map(k => CHANGES[k].name).join('、')}放热。互为相反的两种变化，一个吸热，一个放热。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">固态、液态、气态之间</h2>
          <Triangle shown={shown} hot={right ? item.is : null} />
          <H2>山上的六处</H2>
          <table className="mt-1 w-full text-[13.5px]">
            <tbody>{ORDER.map((k, i) => { const n = ITEM[k], ok = got.includes(k); return <tr key={k} className="border-t border-white/12 first:border-0"><td className={`py-1.5 ${i === at ? 'font-semibold text-white' : 'text-white/70'}`}>{n.name}</td><td className="text-right text-white/55">{ok ? `${CHANGES[n.is].from}→${CHANGES[n.is].to}` : ''}</td><td className={`w-[74px] text-right font-semibold ${CHANGES[n.is].heat === '吸热' ? 'text-[#ff9a6a]' : 'text-[#7fb8ff]'}`}>{ok ? `${CHANGES[n.is].name} ${CHANGES[n.is].heat}` : ''}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'ok'} onClick={confirm} disabled={pick === 'none' || right}>确定</LabButton>
        <LabButton pulse={next === 'go'} onClick={go} disabled={!right || at >= ORDER.length - 1}>看下一处</LabButton>
      </>}
      extras={<Control label="这是哪一种变化"><Segmented<Pick> label="这是哪一种变化" pulse={next === 'pick'} want={next === 'pick' ? item.is : null} value={right ? item.is : pick} disabled={right} onChange={v => { setPick(v); setMiss(false) }} options={CHANGE_KEYS.map(k => ({ value: k, label: CHANGES[k].name }))} /></Control>}
    />
  )
}
