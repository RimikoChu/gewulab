// 减数分裂和遗传规律 · 第 3 课 精子和卵细胞的形成：同样是减数分裂，精子的形成两次都是均等分裂，得到 4 个精细胞，再变形成精子；
// 卵细胞的形成细胞质不均等分裂，最后只有 1 个卵细胞，另外 3 个是极体。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { G3, Gametogenesis, type Kind } from './gamete'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { GAMETOGENESIS, gametesFrom } from './physics'
import { Finale, H, Legend, Row } from './ui'
import { VOICE } from './voice'
import { MODEL, Room } from './world'

const AT: [number, number, number] = [MODEL.b[0], MODEL.y, MODEL.b[2]]
const S = GAMETOGENESIS.sperm, E = GAMETOGENESIS.egg
const TASKS: Task[] = [
  { id: 'sperm', text: '让一个初级精母细胞完成减数分裂，再变形成精子', note: `${S.end.length} 个精细胞变形成 ${gametesFrom('sperm')} 个精子` },
  { id: 'egg1', text: '换成卵细胞的形成，做减数第一次分裂', note: '细胞质不均等分裂：一个大的次级卵母细胞、一个小的极体' },
  { id: 'egg2', text: '再做减数第二次分裂，数卵细胞和极体', note: `${gametesFrom('egg')} 个卵细胞和 ${E.polar} 个极体` },
]
const LAST: Record<Kind, number> = { sperm: 3, egg: 2 }

export default function Lesson3() {
  const [kind, setKind] = useState<Kind>('sperm')
  const [stage, setStage] = useState(0)
  const T = useTasks('gewu:meiosis:3', TASKS)
  const run = useRun(stage, 2.6), e = stage === 0 ? 1 : Math.min(1, Math.max(0, run - (stage - 1)))
  const moving = stage > 0 && e < 1
  useEffect(() => {
    if (moving) return
    T.check(id => (id === 'sperm' && kind === 'sperm' && stage === 3) || (id === 'egg1' && kind === 'egg' && stage >= 1) || (id === 'egg2' && kind === 'egg' && stage >= 2))
  }, [kind, stage, moving])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setKind('sperm'); setStage(0); T.reset() }
  const pick = (k: Kind) => { setKind(k); setStage(0) }
  const task = T.current
  const want: Kind | null = task ? (task.id === 'sperm' ? 'sperm' : 'egg') : null
  const { hint, next }: { hint: string; next: 'm1' | 'm2' | 'shape' | 'kind' | null } = (() => {
    if (!task) return { hint: '精子：4 个，变形；卵细胞：1 个，细胞质不均等分裂。', next: null }
    if (moving) return { hint: stage === 3 ? '精细胞变形：细胞核浓缩成头部，长出尾巴…' : '细胞正在分裂…', next: null }
    if (want && kind !== want) return { hint: '在“看哪一种”里选“卵细胞的形成”', next: 'kind' }
    if (kind === 'sperm') {
      if (stage === 0) return { hint: '这是一个初级精母细胞。按“减数第一次分裂”', next: 'm1' }
      if (stage === 1) return { hint: '两个次级精母细胞，一样大。按“减数第二次分裂”', next: 'm2' }
      return { hint: '四个精细胞。按“变形”，让它们变成精子', next: 'shape' }
    }
    if (stage === 0) return { hint: '这是一个初级卵母细胞，比精母细胞大得多。按“减数第一次分裂”', next: 'm1' }
    return { hint: '一大一小：次级卵母细胞和极体。按“减数第二次分裂”', next: 'm2' }
  })()

  const at = (x: number, y: number, dy = 0): [number, number, number] => [AT[0] + x, AT[1] + y + dy, AT[2]]
  const done = !moving
  const labels: Label[] = []
  if (kind === 'sperm' && done) {
    if (stage === 0) labels.push({ id: 's0', at: at(0, 24), ax: 0.5, className: 'scene-tag key -translate-y-full', children: S.primary })
    if (stage === 1) G3.sperm.cells1.forEach((c, i) => labels.push({ id: `s1${i}`, at: at(c[0], c[1], 20), ax: 0.5, className: 'scene-tag -translate-y-full', children: S.secondary[i] }))
    if (stage >= 2) G3.sperm.cells2.forEach((c, i) => labels.push({ id: `s2${i}`, at: at(c[0], c[1] + (c[1] > 0 ? 14.5 : -14.5)), ax: 0.5, className: c[1] > 0 ? 'scene-tag -translate-y-full' : 'scene-tag translate-y-1', children: stage === 3 ? '精子' : S.end[i] }))
  }
  if (kind === 'egg' && done) {
    if (stage === 0) labels.push({ id: 'e0', at: at(0, 32), ax: 0.5, className: 'scene-tag key -translate-y-full', children: E.primary })
    if (stage === 1) { labels.push({ id: 'e1', at: at(G3.egg.big[0] - 22, G3.egg.big[1] - 20), ax: 1, className: 'scene-tag -translate-y-1/2', children: E.secondary[0] }); labels.push({ id: 'e2', at: at(G3.egg.pb1[0] + 9, G3.egg.pb1[1]), ax: 0, className: 'scene-tag -translate-y-1/2', children: E.secondary[1] }) }
    if (stage === 2) {
      labels.push({ id: 'e3', at: at(G3.egg.big[0] - 22, G3.egg.big[1] - 20), ax: 1, className: 'scene-tag key -translate-y-1/2', children: E.end[0] })
      labels.push({ id: 'e4', at: at(G3.egg.pb2[0] - 8, G3.egg.pb2[1] + 4), ax: 1, className: 'scene-tag -translate-y-1/2', children: '极体' })
      labels.push({ id: 'e5', at: at(G3.egg.pb1[0] + 14, G3.egg.pb1[1]), ax: 0, className: 'scene-tag -translate-y-1/2', children: '极体 ×2' })
    }
  }
  const rows = kind === 'sperm'
    ? [[S.origin, '1 个'], [S.primary, '1 个'], [S.secondary[0], stage >= 1 ? '2 个，一样大' : '—'], [S.end[0], stage >= 2 ? '4 个' : '—'], ['精子', stage >= 3 ? `${gametesFrom('sperm')} 个` : '—']]
    : [[E.origin, '1 个'], [E.primary, '1 个'], [E.secondary[0], stage >= 1 ? '1 个，很大' : '—'], ['极体', stage >= 2 ? `${E.polar} 个，很小` : stage >= 1 ? '1 个，很小' : '—'], [E.end[0], stage >= 2 ? `${gametesFrom('egg')} 个` : '—']]
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="分裂"
      stage={<Room at="modelB" labels={labels} span={kind === 'egg' ? [104, 76] : stage === 0 ? [62, 42] : [94, 62]} aim={kind === 'egg' ? [AT[0] + 8, AT[1] + 8, AT[2]] : undefined}>
        <Gametogenesis key={kind} at={AT} kind={kind} stage={stage} e={e} />
      </Room>}
      lesson={<LessonBlock no="3" title="精子和卵细胞的形成" concept="一个精原细胞得 4 个精子，一个卵原细胞得 1 个卵细胞" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>精子在睾丸中形成。精原细胞长大成为初级精母细胞，经减数第一次分裂成为两个次级精母细胞，再经减数第二次分裂形成四个精细胞；精细胞经过<b className="text-white">变形</b>成为精子。</p>
          <p className="mt-2">卵细胞在卵巢中形成。初级卵母细胞经减数第一次分裂，形成大小不同的两个细胞：大的叫次级卵母细胞，小的叫极体。次级卵母细胞经减数第二次分裂，形成一个大的卵细胞和一个小的极体；第一次分裂形成的极体也分裂成两个极体。三个极体都退化消失。</p>
          <p className="mt-2">卵细胞的形成，细胞质是<b className="text-white">不均等分裂</b>的，卵细胞得到了大部分细胞质；卵细胞的形成也不经过变形。</p>
        </>} />}
      finale={T.finale && <Finale kicker="精子和卵细胞的形成" title={`1 个精原细胞 → ${gametesFrom('sperm')} 个精子；1 个卵原细胞 → ${gametesFrom('egg')} 个卵细胞`} text="两者都经过减数分裂，染色体数目都减半。不同的是：精子的形成细胞质均等分裂，要经过变形；卵细胞的形成细胞质不均等分裂，不经过变形，另外三个极体退化消失。" notes="细胞放大了很多倍；卵母细胞画得比精母细胞大，但没有按真实比例；只画了两对同源染色体，省略了交叉互换。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol={kind === 'sperm' ? '精子' : '卵细胞'} value={stage === LAST[kind] && done ? String(gametesFrom(kind)) : '—'} unit="个 · 一个原始生殖细胞形成" />
            <ParamTile symbol="极体" value={kind === 'egg' && stage === 2 && done ? String(E.polar) : kind === 'sperm' ? '0' : '—'} unit="个" />
          </div>
          <H>{kind === 'sperm' ? '精子的形成（睾丸）' : '卵细胞的形成（卵巢）'}</H>
          <div className="flex flex-col gap-1.5">{rows.map(([a, b]) => <Row key={a} name={a} text={b} seen={b !== '—'} />)}</div>
          <Legend />
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'm1'} onClick={() => setStage(1)} disabled={stage !== 0 || moving}>减数第一次分裂</LabButton>
        <LabButton pulse={next === 'm2'} onClick={() => setStage(2)} disabled={stage !== 1 || moving}>减数第二次分裂</LabButton>
        <LabButton pulse={next === 'shape'} onClick={() => setStage(3)} disabled={kind !== 'sperm' || stage !== 2 || moving}>变形</LabButton>
      </>}
      extras={
        <Control label="看哪一种">
          <Segmented label="看哪一种" pulse={next === 'kind'} want={want} value={kind} onChange={k => pick(k as Kind)} options={[{ value: 'sperm', label: '精子的形成' }, { value: 'egg', label: '卵细胞的形成' }]} />
        </Control>
      }
    />
  )
}
