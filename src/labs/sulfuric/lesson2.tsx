// 接触法制硫酸 · 第 2 课 炉气的净化。镜头斜着俯看净化工段：旋风除尘器、电除尘器、洗涤塔、干燥塔一字排开。
// 在出炉、除尘后、洗涤后、干燥后四个取样口各化验一次，看矿尘、砷和硒的化合物、水蒸气一样样被除掉。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow, GAS } from './flow'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { TAPS, TAP_NAME, dirtAt, poisons, type Tap } from './physics'
import { CYC, DRY, ESP, SCRUB, ride } from './plant'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'out', text: '在沸腾炉出口取样化验', note: '出炉的气体里除了 SO₂、O₂、N₂，还有矿尘、砷和硒的化合物、水蒸气' },
  { id: 'dust', text: '在除尘以后取样化验', note: '旋风除尘器和电除尘器把矿尘除掉了' },
  { id: 'wash', text: '在洗涤以后取样化验', note: '洗涤塔把砷和硒的化合物洗掉了，气体里的水蒸气还在' },
  { id: 'dry', text: '在干燥以后取样化验', note: '干燥塔里的浓硫酸把水蒸气吸掉了：净化完成' },
]
/** 四个取样口的位置（在管道朝镜头的一面） */
const AT: Record<Tap, V3> = { out: [-11.2, 14.6, 0.62], dust: [7.2, 8, 0.57], wash: [14.6, 16.4, 0.52], dry: [22.8, 17.4, 0.52] }
const KIND = ['矿尘', '砷、硒的化合物', '水蒸气'] as const
const KCOL = [GAS.dust, '#b08adf', GAS.water]

export default function Lesson2() {
  const T = useTasks('gewu:sulfuric:2', TASKS)
  const [tap, setTap] = useState<Tap>('out')
  const [seen, setSeen] = useState<Tap[]>([])
  const take = useRun(1.6, () => { setSeen(s => (s.includes(tap) ? s : [...s, tap])); T.check(id => id === tap) })
  const resetAll = () => { setTap('out'); setSeen([]); take.snap(0); T.reset() }
  const task = T.current?.id as Tap | undefined
  const next: 'seg' | 'take' | null = !task || take.busy ? null : tap !== task ? 'seg' : 'take'
  const hint = !task ? '炉气要先除尘、洗涤、干燥，才能送进接触室。'
    : take.busy ? '正在取样化验…'
    : tap !== task ? `把取样点换到“${TAP_NAME[task]}”`
    : `在“${TAP_NAME[tap]}”的取样口取样化验`

  // 气流的光点贴着管道和设备朝镜头的一面走，一段一段变干净
  const paths = useMemo<V3[][]>(() => [
    ride('r2c'), [[CYC.x - 0.9, 11.6, 1.4], [CYC.x, 9, 1.4], [CYC.x, 13.2, 0.75]], ride('c2e'),
    [[ESP.x - ESP.w / 2, 8, ESP.d / 2 + 0.25], [ESP.x + ESP.w / 2, 8, ESP.d / 2 + 0.25]], ride('e2s'),
    [[SCRUB.x, 3.4, SCRUB.r + 0.15], [SCRUB.x, 14.2, SCRUB.r + 0.15]], ride('s2d'),
    [[DRY.x, 3.4, DRY.r + 0.15], [DRY.x, 15.2, DRY.r + 0.15]], ride('d2b'),
  ], [])
  // 每四颗光点里：两颗是炉气本身（黄），一颗是矿尘（过了电除尘器就没有了），一颗是砷硒化合物或水蒸气（过了洗涤塔、干燥塔就没有了）
  const color = (_u: number, p: number, i: number) => {
    const k = i % 4
    if (k < 2) return GAS.so2
    if (k === 2) return p <= 2 ? GAS.dust : GAS.air
    return i % 8 === 3 ? (p <= 5 ? KCOL[1] : GAS.air) : (p <= 7 ? GAS.water : GAS.air)
  }
  const d = dirtAt(tap), has = seen.includes(tap)
  const vals = [d.dust, d.arsenic, d.water]
  const labels: Label[] = [
    { id: 'n1', at: [CYC.x, 6.6, 1.5], ax: 0.5, name: true, className: 'scene-name', children: '旋风除尘器' },
    { id: 'n2', at: [ESP.x, 4.6, ESP.d / 2], ax: 0.5, name: true, className: 'scene-name', children: '电除尘器' },
    { id: 'n3', at: [SCRUB.x, 8.4, SCRUB.r + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '洗涤塔' },
    { id: 'n4', at: [DRY.x, 8.8, DRY.r + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '干燥塔（淋浓硫酸）' },
    ...TAPS.map(k => ({ id: `t${k}`, at: [AT[k][0], AT[k][1] + 0.5, AT[k][2]] as V3, ax: 0.5, className: `scene-tag ${k === tap ? 'key' : ''} -translate-y-full`, style: { opacity: k === tap || seen.includes(k) ? 1 : 0.7 }, children: <><small>取样口</small>{TAP_NAME[k]}</> })),
    { id: 'to', at: [27.6, 4.0, 3.6], ax: 0, className: 'scene-tag', children: <><small>去</small>接触室</> },
  ]
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="取样化验"
      stage={<Place at="l2" labels={labels}>
        <Flow paths={paths} density={1.5} speed={3.4} size={0.13} color={color} />
        {/* 取样口：管道上一只小阀门；正在用的那一只亮着 */}
        {TAPS.map(k => <group key={k} position={AT[k]}>
          <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.07, 0.07, 0.36, 14]} /><meshStandardMaterial color="#8d9296" metalness={0.8} roughness={0.35} /></mesh>
          <mesh position={[0, 0.16, 0.14]} castShadow><boxGeometry args={[0.3, 0.05, 0.05]} /><meshStandardMaterial color="#c0392b" roughness={0.5} /></mesh>
          <mesh position={[0, 0, 0.24]}><sphereGeometry args={[0.12, 16, 12]} /><meshBasicMaterial color={k === tap ? '#35c7b3' : '#3a4046'} toneMapped={false} /></mesh>
        </group>)}
      </Place>}
      lesson={<LessonBlock no="2" title="炉气的净化" concept="炉气先净化，催化剂才不中毒" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>从沸腾炉出来的炉气，除了 SO₂、O₂、N₂ 以外，还含有<b className="text-white">矿尘</b>、<b className="text-white">砷和硒的化合物</b>、<b className="text-white">水蒸气</b>等杂质。</p>
          <p className="mt-3">矿尘和砷、硒的化合物会使接触室里的催化剂<b className="text-white">中毒</b>（失去活性）；水蒸气对设备和生产也有不良影响。所以炉气在进接触室之前，必须经过<b className="text-white">除尘、洗涤、干燥</b>。</p>
          <p className="mt-3">干燥塔里从塔顶淋下来的是浓硫酸，利用的是浓硫酸的吸水性。面板上的含量是以出炉时为 100 的相对值，是示意。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">除尘、洗涤、干燥：除去使催化剂中毒的杂质</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">除尘器除去矿尘，洗涤塔除去砷和硒的化合物，干燥塔用浓硫酸吸去水蒸气。干净、干燥的炉气才能送进接触室。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-[13px] text-white/60">取样点：{TAP_NAME[tap]} · 相对含量（出炉时为 100，示意）</div>
        <div className="mt-3 flex flex-col gap-2.5">
          {KIND.map((name, i) => <div key={name}>
            <div className="flex items-baseline justify-between text-[13.5px]"><span><span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: KCOL[i] }} />{name}</span><span className="text-[17px] font-semibold tabular-nums">{has ? vals[i] : '—'}</span></div>
            <div className="mt-1 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full transition-all duration-700" style={{ width: `${has ? vals[i] : 0}%`, background: KCOL[i] }} /></div>
          </div>)}
        </div>
        <div className="mt-4 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[14px]">送进接触室：<b className={has ? (poisons(tap) ? 'text-[#ff8f7a]' : 'text-[#7fe3d4]') : 'text-white/50'}>{!has ? '还没有化验' : poisons(tap) ? '会使催化剂中毒' : '可以，催化剂不会中毒'}</b></div>
        <h2 className="mt-4 text-[12.5px] text-white/55">四个取样点</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">取样点</th><th className="text-right font-normal">矿尘</th><th className="text-right font-normal">砷、硒</th><th className="pr-2 text-right font-normal">水蒸气</th></tr></thead>
          <tbody>{TAPS.map(k => { const v = dirtAt(k), ok = seen.includes(k); return <tr key={k} className={k === tap ? 'bg-[#35c7b3]/20' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2.5 py-1.5">{TAP_NAME[k]}</td><td className="text-right tabular-nums">{ok ? v.dust : '—'}</td><td className="text-right tabular-nums">{ok ? v.arsenic : '—'}</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{ok ? v.water : '—'}</td></tr> })}</tbody>
        </table>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'take'} disabled={take.busy || has} onClick={() => take.run()}>取样化验</LabButton>
      </>}
      extras={
        <Control label="取样点">
          <Segmented label="取样点" pulse={next === 'seg'} want={task ?? null} disabled={take.busy} value={tap} onChange={k => setTap(k as Tap)} options={TAPS.map(k => ({ value: k, label: TAP_NAME[k] }))} />
        </Control>
      }
    />
  )
}
