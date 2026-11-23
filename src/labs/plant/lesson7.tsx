// 植物的一生 · 第 7 课 受精和结果：柱头上已经落了花粉。看花粉管穿过花柱进入子房，精子和卵细胞结合；再看花瓣、雄蕊、柱头和花柱凋落，子房长成果实，胚珠长成种子。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { F, FRUIT, Flower, OV, PollenTube } from './flower'
import { POSE_A, POSE_B, worldA } from './lesson6'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { DEVELOP, FALLS, FERTILIZE, developsInto, seedsIn } from './physics'
import { Finale, H, Row } from './ui'
import { FLOWER_A, FLOWER_B, Room } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'tube', text: '让柱头上的花粉萌发，看花粉管长到哪里', note: '花粉管穿过花柱，进入子房，一直到达胚珠' },
  { id: 'fert', text: '让花粉管里的精子进入胚珠', note: '精子和卵细胞结合，形成受精卵：这就是受精' },
  { id: 'grow', text: '继续发育，看哪些凋落、哪个长大', note: `${FALLS.join('、')}凋落，子房继续发育` },
  { id: 'open', text: '把长成的桃剖开，看果皮和种子', note: `子房发育成${developsInto('子房')}，胚珠发育成${developsInto('胚珠')}` },
]
/** 果实长成以后，子房里原来的一点现在在哪（模型自己的坐标） */
const fruitPt = (p: V3): V3 => [p[0] * FRUIT * 1.1, OV.base + (p[1] - OV.base) * FRUIT * 0.86, p[2] * FRUIT * 1.1]

export default function Lesson7() {
  const [step, setStep] = useState(0)          // 0 刚传完粉；1 花粉管；2 受精；3 发育；4 剖开果实
  const T = useTasks('gewu:plant:7', TASKS)
  const tube = useRun(step >= 1 ? 1 : 0, 6), fert = useRun(step >= 2 ? 1 : 0, 2.4), grow = useRun(step >= 3 ? 1 : 0, 10), open = useRun(step >= 4 ? 1 : 0, 1.8)
  useEffect(() => { T.check(id => id === 'tube' ? tube >= 1 : id === 'fert' ? fert >= 1 : id === 'grow' ? grow >= 1 : open >= 1) }, [tube >= 1, fert >= 1, grow >= 1, open >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStep(0); T.reset() }
  const task = T.current, busy = (step === 1 && tube < 1) || (step === 2 && fert < 1) || (step === 3 && grow < 1) || (step === 4 && open < 1)
  const { hint, next }: { hint: string; next: 0 | 1 | 2 | 3 | null } = (() => {
    if (!task) return { hint: '一朵花经过传粉和受精，子房发育成果实，胚珠发育成种子。', next: null }
    if (busy) return { hint: step === 1 ? '花粉长出花粉管，穿过花柱往下伸…' : step === 2 ? '精子从花粉管里出来，和卵细胞结合…' : step === 3 ? (grow < 0.55 ? '花瓣、雄蕊、柱头和花柱完成了任务，纷纷凋落…' : '子房一天天长大，颜色也变了…') : '把朝外的一半拿开…', next: null }
    if (step === 0) return { hint: '花已经剖开，柱头上落着黄色的花粉。按“花粉萌发”', next: 0 }
    if (step === 1) return { hint: '花粉管到了胚珠。按“完成受精”', next: 1 }
    if (step === 2) return { hint: '受精完成了。按“继续发育”', next: 2 }
    return { hint: '子房长成了一个桃。按“剖开果实”', next: 3 }
  })()
  const fruit = grow >= 1
  const labels: Label[] = fruit ? [
    { id: 'fr', at: worldA(fruitPt([-0.15, OV.y + 0.12, 0.1])), ax: 1, className: 'scene-tag -translate-x-3 -translate-y-1/2', children: <><small>子房发育成</small>果实</> },
    ...(open >= 1 ? [
      { id: 'pe', at: worldA(fruitPt([0.18, OV.y + 0.06, 0])), className: 'scene-tag key translate-x-3 -translate-y-1/2', children: <><small>子房壁发育成</small>果皮</> },
      { id: 'se', at: worldA(fruitPt([0.02, OV.y - 0.06, 0.02])), className: 'scene-tag key translate-x-10 translate-y-1/2', children: <><small>胚珠发育成</small>种子</> },
    ] : []),
  ] : grow > 0.05 ? [] : [
    { id: 'po', at: worldA([F.stigma[0], F.stigma[1] + 0.08, 0]), ax: 1, className: 'scene-tag -translate-x-3 -translate-y-1/2', children: <><small>柱头上的</small>花粉</> },
    ...(tube > 0.25 && tube <= 0.8 ? [{ id: 'tu', at: worldA([0.05, 1.6, 0.04]), className: 'scene-tag key translate-x-3 -translate-y-1/2', children: '花粉管' }] : []),
    { id: 'wa', at: worldA([-OV.rx + 0.03, OV.y + 0.05, 0]), ax: 1, className: 'scene-tag -translate-x-3 -translate-y-1/2', children: '子房壁' },
    { id: 'ov', at: worldA([0.1, OV.y + 0.03, 0.02]), className: 'scene-tag translate-x-6 -translate-y-1/2', children: '胚珠' },
    { id: 'eg', at: worldA(F.egg), className: `scene-tag ${fert >= 1 ? 'key' : ''} translate-x-6 translate-y-1/2`, children: fert >= 1 ? '受精卵' : '卵细胞' },
  ]
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="一朵传过粉的桃花"
      stage={<Room at={step >= 3 ? 's7b' : tube > 0.8 ? 's7c' : 's7'} labels={labels}>
        <group position={FLOWER_A} rotation={POSE_A}>
          <Flower cut={1} grow={grow} fruitCut={open} fertilized={fert >= 1} />
          {grow < 0.12 && <PollenTube k={tube * 0.94 + fert * 0.06} />}
        </group>
        <group position={FLOWER_B} rotation={POSE_B} scale={0.86}><Flower /></group>
      </Room>}
      lesson={<LessonBlock no="7" title="受精和结果" concept="子房发育成果实，胚珠发育成种子" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[14px] text-white/85">{FERTILIZE.map(s => <li key={s}>{s}。</li>)}</ol>
          <p className="mt-3">受精完成后，{FALLS.join('、')}纷纷凋落，只有子房继续发育。子房壁发育成果皮，子房里的胚珠发育成种子，胚珠里的受精卵发育成胚。</p>
        </>} />}
      finale={T.finale && <Finale kicker="一朵花结成了一个桃" title="子房发育成果实，胚珠发育成种子" text="花粉管把精子送到胚珠，精子和卵细胞结合成受精卵。之后子房壁发育成果皮，胚珠发育成种子，受精卵发育成胚。" notes="花粉管、胚珠和卵细胞是放大了画的，花粉管实际上在花柱里面，这里画在外面好看清。桃核是果皮最里面硬的一层，种子在桃核里。从开花到果实成熟要几个月。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在</div>
            <div className="mt-1 text-[28px] leading-tight font-bold">{open >= 1 ? '果皮和种子' : fruit ? '果实' : step >= 3 ? '子房在长大' : fert >= 1 ? '受精完成' : tube >= 1 ? '花粉管到达胚珠' : step >= 1 ? '花粉管在伸长' : '花粉落在柱头上'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="完成受精的胚珠" value={fert >= 1 ? '1 个' : '—'} unit="桃花的子房里" />
            <ParamTile symbol="果实里的种子" value={fruit ? `${seedsIn(1)} 粒` : '—'} unit="一个胚珠长成一粒" />
          </div>
          <H>从传粉到受精</H>
          <div className="flex flex-col gap-1.5">{FERTILIZE.map((s, i) => { const seen = i === 0 || (i === 1 ? tube > 0.1 : i === 2 ? tube >= 1 : fert >= 1); return <Row key={s} name={`${i + 1}`} text={s} seen={seen} on={seen && !(i === 0 ? tube > 0.1 : i === 1 ? tube >= 1 : i === 2 ? fert >= 1 : step >= 3)} /> })}</div>
          <H>受精以后，各部分发育成什么</H>
          <div className="flex flex-col gap-1.5">{DEVELOP.map(d => <Row key={d.from} name={d.from} text={`→ ${d.to}`} seen={d.from === '子房' ? fruit : open >= 1} />)}</div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 0} onClick={() => setStep(1)} disabled={step !== 0}>花粉萌发</LabButton>
        <LabButton pulse={next === 1} onClick={() => setStep(2)} disabled={step !== 1 || busy}>完成受精</LabButton>
        <LabButton primary pulse={next === 2 || next === 3} onClick={() => setStep(s => s + 1)} disabled={step < 2 || step >= 4 || busy}>{step >= 3 ? '剖开果实' : '继续发育'}</LabButton>
      </>}
      extras={<Control label="凋落的部分"><div className="flex h-11 items-center rounded-xl bg-white/8 px-3 text-[14px] text-white/80">{grow > 0.6 ? FALLS.join('、') : '还没有'}</div></Control>}
    />
  )
}
