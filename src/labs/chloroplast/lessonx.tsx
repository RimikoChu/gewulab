// 光反应和暗反应 · 拓展：三个身边的例子。秋天的黄叶里还剩什么色素；植物工厂的补光灯为什么是红蓝光；大棚里为什么要施“气肥”。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { STRIP } from './gear'
import { useTween, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { GREEN_LEAF, PIGMENTS, YELLOW_LEAF, bandVisible, co2Boost, netColor } from './physics'
import { CUP, LEAN, STRIP_IN, Scene2 } from './scene2'
import { CHAMBER, RateRig } from './scene7'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { BZ, M, Place, ST, TOP } from './world'

type Case = 'leaf' | 'lamp' | 'gas'
const TASKS: Task[] = [
  { id: 'leaf', text: '把绿叶和黄叶的滤液一起层析', note: '黄叶的滤纸条上，两条叶绿素的色素带几乎看不见了' },
  { id: 'lamp', text: '同样强度，比一比绿光和红蓝光', note: '红光和蓝紫光被色素吸收得多，光合速率高' },
  { id: 'gas', text: '把叶室里的 CO₂ 浓度提高一倍', note: 'CO₂ 是暗反应的原料，浓度提高，光合速率跟着提高' },
]
const NAME: Record<Case, string> = { leaf: '秋天的黄叶', lamp: '补光灯的颜色', gas: '大棚里的气肥' }
const OA: V3 = [ST.x - 3.4 - CUP[0], TOP, BZ - CUP[2]], OB: V3 = [ST.x + 2.3, TOP, BZ]
const B = co2Boost(), NG = netColor('green'), NR = netColor('redblue')

export default function LessonX() {
  const [kind, setKind] = useState<Case>('leaf')
  const [go, setGo] = useState<Record<Case, boolean>>({ leaf: false, lamp: false, gas: false })
  const [jump, setJump] = useState(false)
  const run = useTween(go.leaf ? 1 : 0, 0.11, jump), lamp = useTween(go.lamp ? 2 : 0, 0.36, jump), gas = useTween(go.gas ? 2 : 0, 0.36, jump)
  const [, tick] = useState(0)
  const moving = !run.done || !lamp.done || !gas.done
  useEffect(() => { if (!moving) return; const t = setInterval(() => tick(n => n + 1), 60); return () => clearInterval(t) }, [moving])
  const T = useTasks('gewu:chloroplast:x', TASKS)
  const ok: Record<Case, boolean> = { leaf: go.leaf && run.done, lamp: go.lamp && lamp.done, gas: go.gas && gas.done }
  useEffect(() => { T.check(id => ok[id as Case]) }, [ok.leaf, ok.lamp, ok.gas])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setKind('leaf'); setGo({ leaf: false, lamp: false, gas: false }); T.reset(); setTimeout(() => setJump(false), 60) }
  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'pick' | null } = (() => {
    if (!task) return { hint: '色素、光的颜色、CO₂ 浓度：课上学的道理，生活和生产里都用得上。', next: null }
    if (moving) return { hint: kind === 'leaf' ? '层析液往上爬，两张滤纸条一起分离…' : kind === 'lamp' ? '先照绿光，再换红蓝光…' : '先测现在的浓度，再把 CO₂ 提高一倍…', next: null }
    if (task.id !== kind) return { hint: `换到“${NAME[task.id as Case]}”`, next: 'pick' }
    return { hint: kind === 'leaf' ? '烧杯里立着两张滤纸条：左边点的是黄叶的滤液，右边是绿叶的。按“开始比较”' : kind === 'lamp' ? '植物工厂里的灯常常是红蓝两色的。按“开始比较”，先照绿光' : '大棚里常常增施二氧化碳，叫“气肥”。按“开始比较”', next: 'go' }
  })()
  // 补光灯：先绿光后红蓝光；气肥：先 400 后 800
  const lp = lamp.ref.current, gp = gas.ref.current
  const lampColor = kind === 'lamp' && lp > 1 ? '#ff5ad8' : kind === 'lamp' && lp > 0 ? '#4dff6a' : '#fff3cf'
  const a = kind === 'lamp' ? (lp > 1 ? '红蓝' : lp > 0 ? '绿' : '--') : kind === 'gas' ? (gp > 1 ? '800' : gp > 0 ? '400' : '--') : '--'
  const val = kind === 'lamp' ? (lp > 1 ? NR : lp > 0 ? NG : null) : kind === 'gas' ? (gp > 1 ? B.after : gp > 0 ? B.before : null) : null
  const bandY = (rf: number) => (STRIP.line + STRIP.travel * rf * run.ref.current) * M
  const labels: Label[] = kind === 'leaf' ? [
    { id: 'g', at: [OA[0] + STRIP_IN[0] - 0.02 * M, OA[1] + 0.1 * M, OA[2] + STRIP_IN[2] - 0.12], ax: 1, className: 'scene-tag -translate-x-1 -translate-y-full', children: '黄叶' },
    { id: 'y', at: [OA[0] + STRIP_IN[0] + 0.02 * M, OA[1] + 0.1 * M, OA[2] + STRIP_IN[2] - 0.12], ax: 0, className: 'scene-tag translate-x-1 -translate-y-full', children: '绿叶' },
    ...(run.ref.current > 0.6 ? PIGMENTS.map(p => ({ id: p.key, at: [OA[0] + STRIP_IN[0] + 0.013 * M + STRIP.w * M * 0.5, OA[1] + STRIP_IN[1] + bandY(p.rf) * Math.cos(LEAN), OA[2] + STRIP_IN[2] - Math.sin(-LEAN) * bandY(p.rf)] as V3, className: 'scene-name translate-x-3 -translate-y-1/2', children: p.name })) : []),
  ] : [
    { id: 'an', at: [OB[0] + 0.2 * M, OB[1] + 0.135 * M, OB[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{kind === 'lamp' ? '光的颜色' : 'CO₂ 浓度'}</small>{a}<small className="ml-3">净光合速率</small>{val === null ? '—' : val.toFixed(1)}</> },
    { id: 'ch', at: [OB[0] + CHAMBER[0] - 0.05 * M, OB[1] + CHAMBER[1], OB[2] + CHAMBER[2] + 0.04 * M], ax: 1, name: true, className: 'scene-name -translate-x-1 -translate-y-1/2', children: '叶室' },
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={NAME[kind]}
      stage={<Place at={kind === 'leaf' ? 'xStrip' : 'xRate'} labels={labels}>
        <group position={[OA[0] - ST.l2, 0, OA[2] - BZ]}><Scene2 grind={1} pour={1} line={1} dip={1} t={run.ref.current} leaf={GREEN_LEAF} strip2={YELLOW_LEAF} bare /></group>
        <group position={OB}><RateRig light={kind === 'lamp' && lp > 0 ? 0.7 : 0.6} color={lampColor} a={a} b={val === null ? '--' : val.toFixed(1)} /></group>
      </Place>}
      lesson={<LessonBlock no="拓展" title="黄叶 · 补光 · 气肥" concept="用光合作用的原理解释身边的事" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">秋天的黄叶</b>：气温下降，叶绿素分解得多、合成得少，原来被绿色盖住的类胡萝卜素的颜色就显出来了。</p>
          <p className="mt-2"><b className="text-white">红蓝光的补光灯</b>：叶绿体中的色素主要吸收红光和蓝紫光，对绿光吸收得最少。同样的电，做成红蓝光，被叶片利用得更多。</p>
          <p className="mt-2"><b className="text-white">气肥</b>：密闭的大棚里，白天 CO₂ 被植物吸收，浓度会降低。适当增施 CO₂，可以提高光合作用的强度，增加产量。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三个例子都做完了" title="叶子变黄、灯用红蓝光、大棚施气肥，都能用光合作用解释" text="黄叶里叶绿素少了，类胡萝卜素还在；红光和蓝紫光被色素吸收得多；CO₂ 是暗反应的原料。" notes="光合速率是用简化模型算的相对值；真实的叶片对绿光的利用没有这里画的这么低。" />}
      panel={
        <Glass className="px-4 py-4">
          {kind === 'leaf' ? <>
            <H>两张滤纸条上各有哪些色素带</H>
            <div className="flex flex-col gap-1.5">{PIGMENTS.map(p => <Row key={p.key} wide dot={p.color} name={p.name} text={ok.leaf ? `绿叶：有　黄叶：${bandVisible(YELLOW_LEAF, p.key) ? '有' : '几乎看不见'}` : '—'} seen={ok.leaf} />)}</div>
          </> : <>
            <H>{kind === 'lamp' ? '同样强度的光，换一种颜色' : '同样的光照，换一种 CO₂ 浓度'}</H>
            <div className="grid grid-cols-2 gap-2">
              <ParamTile symbol={kind === 'lamp' ? '绿光' : '浓度 400'} value={(kind === 'lamp' ? lp : gp) > 0.9 ? (kind === 'lamp' ? NG : B.before).toFixed(1) : '—'} unit="净光合速率 · 相对值" />
              <ParamTile symbol={kind === 'lamp' ? '红蓝光' : '浓度 800'} value={ok[kind] ? (kind === 'lamp' ? NR : B.after).toFixed(1) : '—'} unit="净光合速率 · 相对值" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/65">{kind === 'lamp' ? '两次的光照强度一样（都没到光饱和点），CO₂ 浓度和温度不变，只换光的颜色。' : '光照强度和温度不变，只把叶室里的 CO₂ 浓度从 400 提到 800（相对值）。'}</p>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => setGo(g => ({ ...g, [kind]: true }))} disabled={go[kind] || moving}>开始比较</LabButton>
      </>}
      extras={
        <Control label="例子">
          <Segmented label="例子" pulse={next === 'pick'} want={next === 'pick' ? (task!.id as Case) : null} value={kind} disabled={moving} onChange={v => setKind(v as Case)} options={(['leaf', 'lamp', 'gas'] as Case[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
