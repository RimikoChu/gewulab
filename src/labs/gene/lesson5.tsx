// 遗传和变异 · 第 5 课 显性和隐性：子一代自花传粉，收下的种子种进子二代畦。一株株数高茎和矮茎，和孟德尔当年数的比一比，再用 D 和 d 解释为什么约是 3∶1。
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { F2_N, MENDEL, cross, isTall, ratio, tally } from './physics'
import { Finale, H, Punnett } from './ui'
import { VOICE } from './voice'
import { BED, F2_GENES, Room, SPOTS } from './world'

const TALL = F2_GENES.filter(isTall).length, SHORT = F2_N - TALL
const T4 = tally(cross('Dd', 'Dd'))
const TASKS: Task[] = [
  { id: 'sow', text: '子一代自花传粉收的种子已经种下，让它们长大', note: '子二代里又出现了矮茎' },
  { id: 'count', text: '数一数子二代里的高茎和矮茎', note: `这一畦高茎 ${TALL} 株、矮茎 ${SHORT} 株，约 ${ratio(TALL, SHORT)}∶1` },
  { id: 'mendel', text: '和孟德尔数的比一比', note: `孟德尔数的是 ${MENDEL.stem.a}∶${MENDEL.stem.b}，约 ${ratio(MENDEL.stem.a, MENDEL.stem.b)}∶1` },
  { id: 'explain', text: '用 D 和 d 解释为什么约是 3∶1', note: `DD∶Dd∶dd = ${T4.DD}∶${T4.Dd}∶${T4.dd}，高茎∶矮茎 = 3∶1` },
]
/** 数到的那几株头顶上一颗小圆点：高茎青绿、矮茎琥珀 */
function Marks({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return
    const M = new THREE.Matrix4(), c = new THREE.Color()
    SPOTS.f2.forEach((s, i) => { M.makeTranslation(s.x, s.tall ? 22.2 : 7.2, s.z); m.setMatrixAt(i, M); m.setColorAt(i, c.set(s.tall ? '#35c7b3' : '#ffb84a')) })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])
  useEffect(() => { if (ref.current) ref.current.count = n }, [n])
  return <instancedMesh ref={ref} args={[undefined, undefined, SPOTS.f2.length]} frustumCulled={false}><sphereGeometry args={[0.32, 14, 10]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
}
export default function Lesson5() {
  const [sow, setSow] = useState(false), [counting, setCounting] = useState(false), [cmp, setCmp] = useState(false), [explain, setExplain] = useState(false)
  const T = useTasks('gewu:gene:5', TASKS)
  const grow = useRun(sow ? 1 : 0, 3.6), n = Math.round(useRun(counting ? 1 : 0, counting ? 6 : 0.01) * F2_N)
  const counted = SPOTS.f2.slice(0, n), nT = counted.filter(s => s.tall).length, nS = n - nT
  useEffect(() => { T.check(id => id === 'sow' ? grow >= 1 : id === 'count' ? n >= F2_N : id === 'mendel' ? cmp : explain) }, [grow >= 1, n >= F2_N, cmp, explain])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSow(false); setCounting(false); setCmp(false); setExplain(false); T.reset() }
  const task = T.current, busy = (sow && grow < 1) || (counting && n < F2_N)
  const { hint, next }: { hint: string; next: 'sow' | 'count' | 'cmp' | 'explain' | null } = (() => {
    if (!task) return { hint: '子一代里藏着的矮茎，在子二代又出现了。', next: null }
    if (busy) return { hint: sow && grow < 1 ? '子二代长出来了…' : '一株一株数…', next: null }
    if (!sow) return { hint: '子一代自花传粉收的种子，已经种进这一畦，刚出土。按“让它们长大”', next: 'sow' }
    if (n < F2_N) return { hint: '子二代有高有矮。按“数一数”', next: 'count' }
    if (!cmp) return { hint: '数完了。按“和孟德尔比”，看他当年数的', next: 'cmp' }
    return { hint: '为什么约是 3∶1？按“用基因解释”', next: 'explain' }
  })()
  const labels: Label[] = [
    ...(sow ? [] : [{ id: 'sd', at: [(BED.f2.x0 + BED.f2.x1) / 2, 4.5, BED.f2.z + 7] as [number, number, number], ax: 0.5, className: 'scene-tag translate-y-2', children: <><small>子二代</small>刚出土的幼苗 {F2_N} 株</> }]),
    ...(n > 0 ? [{ id: 'c', at: [(BED.f2.x0 + BED.f2.x1) / 2, 25, BED.f2.z - 4] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>高茎</small>{nT} 株 · <small>矮茎</small>{nS} 株</> }] : []),
  ]
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="子二代"
      stage={<Room at="f2" labels={labels} world={{ f2: 0.16 + 0.84 * grow }}><Marks n={n} /></Room>}
      lesson={<LessonBlock no="5" title="显性和隐性" concept="隐性性状在子二代又出现了" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>纯种高茎和纯种矮茎杂交，子一代只表现高茎。子一代表现出来的叫<b className="text-white">显性性状</b>（高茎），没有表现出来的叫<b className="text-white">隐性性状</b>（矮茎）。</p>
          <p className="mt-2">控制相对性状的基因有显性和隐性之分：用大写的 D 表示显性基因，小写的 d 表示隐性基因。DD 和 Dd 都表现高茎，只有 dd 才表现矮茎。</p>
          <p className="mt-2">子一代是 Dd，产生含 D 和含 d 的两种生殖细胞，数量相等。两种精子和两种卵细胞随机结合，得到 DD、Dd、dd 的比是 1∶2∶1，高茎和矮茎约 3∶1。</p>
        </>} />}
      finale={T.finale && <Finale kicker="数过、比过、解释过" title="隐性性状在子二代又出现了，约占四分之一" text={`子一代是 Dd，矮茎的基因 d 没有表现出来，但没有消失。子一代自花传粉，子二代 DD∶Dd∶dd = 1∶2∶1，高茎∶矮茎约 3∶1。这一畦数出 ${TALL}∶${SHORT}，孟德尔数出 ${MENDEL.stem.a}∶${MENDEL.stem.b}。`} notes="子二代畦的株数是示意，每株的基因组成按随机组合生成；株数越多，比例越接近 3∶1。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">子二代这一畦 · {F2_N} 株</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="高茎" value={n > 0 ? String(nT) : '—'} unit="株" />
            <ParamTile symbol="矮茎" value={n > 0 ? String(nS) : '—'} unit="株" />
          </div>
          <div className="mt-2 text-center text-[15px] text-white/80 tabular-nums">高茎 ∶ 矮茎 = {n >= F2_N ? `${ratio(TALL, SHORT)} ∶ 1` : '—'}</div>
          <H>孟德尔数的子二代</H>
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="高茎" value={cmp ? String(MENDEL.stem.a) : '—'} unit="株" />
            <ParamTile symbol="矮茎" value={cmp ? String(MENDEL.stem.b) : '—'} unit="株" />
          </div>
          <div className="mt-2 text-center text-[15px] text-white/80 tabular-nums">高茎 ∶ 矮茎 = {cmp ? `${ratio(MENDEL.stem.a, MENDEL.stem.b)} ∶ 1` : '—'}</div>
          <H>子一代 Dd 自花传粉</H>
          <Punnett top={['D', 'd']} left={['D', 'd']} cells={cross('Dd', 'Dd')} show={explain} />
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'sow'} onClick={() => setSow(true)} disabled={sow}>让它们长大</LabButton>
        <LabButton primary pulse={next === 'count' || next === 'cmp'} onClick={() => (n >= F2_N ? setCmp(true) : setCounting(true))} disabled={!sow || busy || cmp}>{n >= F2_N ? '和孟德尔比' : '数一数'}</LabButton>
        <LabButton pulse={next === 'explain'} onClick={() => setExplain(true)} disabled={!cmp || explain}>用基因解释</LabButton>
      </>}
      extras={null}
    />
  )
}
