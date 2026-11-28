// 光的波动性和光电效应 · 第 4 课 肥皂膜上的条纹（薄膜干涉）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { FilmLamp, LAMP, LampGlow, RING, SoapDish, SoapFilm } from './film'
import { Dark, useSpace } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { N_SOAP, NA, filmFringes, filmStep, filmThickness } from './physics'
import { VOICE } from './voice'
import { ST, TOP } from './world'

type Src = 'na' | 'white'
const SRC: Record<Src, { name: string; hex: string }> = { na: { name: '钠灯（黄光）', hex: '#ffb81f' }, white: { name: '白光灯', hex: '#fff4e2' } }
const TASKS: Task[] = [
  { id: 'na:0', text: '用钠灯的黄光照肥皂膜，记下看到的', note: `一条条水平的明暗条纹，共 ${filmFringes(0, NA)} 条亮纹` },
  { id: 'na:1', text: '等肥皂水往下流一阵，再记一次', note: `顶上薄得发黑，下面越来越密：${filmFringes(1, NA)} 条亮纹` },
  { id: 'rot', text: '把铁丝圈转 90°，看条纹跟不跟着转', note: '条纹还是水平的：膜厚只跟高度有关' },
  { id: 'white:1', text: '换成白光灯照，记下看到的', note: '变成一道道彩色条纹' },
]
const SEEN: Record<string, string> = { 'na:0': '水平的明暗条纹', 'na:1': '上疏下密，顶上发黑', 'white:0': '彩色条纹', 'white:1': '彩色条纹，上疏下密' }

export default function Lesson4() {
  const [src, setSrc] = useState<Src>('na')
  const [old, setOld] = useState(false)
  const [turned, setTurned] = useState(false)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:light:4', TASKS)
  const age = useSlide(old ? 1 : 0, 0.22), rot = useSlide(turned ? 90 : 0, 45), white = useSlide(src === 'white' ? 1 : 0, 2.5)
  const steady = age === (old ? 1 : 0) && rot === (turned ? 90 : 0), key = `${src}:${old ? 1 : 0}`, dup = rows.includes(key)
  const record = () => { if (!steady || dup) return; const next = [...rows, key]; setRows(next); T.check(k => next.includes(k)) }
  useEffect(() => { if (rot === 90 && T.current?.id === 'rot') T.check(k => k === 'rot') }, [rot, T.current?.id])   // eslint-disable-line react-hooks/exhaustive-deps
  useSpace(record)
  const resetAll = () => { setSrc('na'); setOld(false); setTurned(false); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'src' | 'age' | 'rot' | 'record' | null } = (() => {
    if (!task) return { hint: '都看过了。膜的前后两个表面反射的光叠加，出现了条纹。', next: null }
    if (task.id === 'rot') return turned ? { hint: '铁丝圈在转…', next: null } : steady ? { hint: '按“把铁丝圈转 90°”', next: 'rot' } : { hint: '等一等…', next: null }
    const [ts, ta] = task.id.split(':')
    if (src !== ts) return { hint: `把光源换成${SRC[ts as Src].name}`, next: 'src' }
    if ((old ? '1' : '0') !== ta) return { hint: ta === '1' ? '按“等肥皂水往下流”' : '按“重新拉一张膜”', next: 'age' }
    return steady ? { hint: '看膜上的条纹，按“记录”', next: 'record' } : { hint: '肥皂水在往下流…', next: null }
  })()
  const n = filmFringes(old ? 1 : 0, NA)
  const labels: Label[] = [
    { id: 'lamp', at: [LAMP.x, LAMP.y + 0.42, LAMP.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: SRC[src].name },
    { id: 'ring', at: [RING.x, RING.y + 1.0, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '铁丝圈上的肥皂膜' },
    { id: 'dish', at: [ST.film + 1.5, TOP + 0.22, 0.9], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '肥皂水' },
    { id: 'top', at: [RING.x - 0.92, RING.y + 0.62, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>上沿膜厚</small>约 {filmThickness(0, age).toFixed(0)} nm</> },
    { id: 'bot', at: [RING.x - 0.92, RING.y - 0.62, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>下沿膜厚</small>约 {filmThickness(1, age).toFixed(0)} nm</> },
  ]
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title={TITLE} lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="肥皂膜"
      stage={<Dark at="film" dx={-0.5} dy={0.5} span={[3.9, 2.25]} view={[-0.3, 0.1]} lamp={50} labels={labels}>
        <SoapFilm age={age} rot={rot} white={white} />
        <LampGlow color={SRC[src].hex} />
        <FilmLamp color={SRC[src].hex} />
        <SoapDish x={ST.film + 1.5} z={0.9} />
      </Dark>}
      lesson={<LessonBlock no="4" title="肥皂膜上的条纹" concept="薄膜前后两个表面的反射光发生干涉" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>竖着的肥皂膜受重力作用，上面薄、下面厚。光照上去，膜的前表面和后表面各反射回一束光，这两束光叠加，发生<b className="text-white">薄膜干涉</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>某一厚度处两束反射光互相加强，是亮纹；互相削弱，是暗纹</li>
            <li>同一高度膜厚相同，所以条纹是水平的；转动铁丝圈，条纹不跟着转</li>
            <li>相邻两条亮纹处，膜厚相差 λ/(2<i>n</i>)：钠黄光约 {filmStep(NA).toFixed(0)} nm</li>
            <li>白光里各色光的波长不同，亮纹位置错开，看到彩色条纹</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">肥皂泡、水面油膜上的彩色花纹，都是薄膜干涉。膜厚按上薄下厚的简化形状画，数值是示意的。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">膜的两个表面反射的光叠加，厚度不同处明暗不同</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">同一高度膜一样厚，所以条纹水平；相邻亮纹处膜厚相差约 {filmStep(NA).toFixed(0)} nm；白光照出彩色。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{src === 'na' ? '膜上的亮纹' : '膜上的条纹'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{src === 'na' ? (steady ? n : '…') : '彩色'}{src === 'na' && <span className="ml-1 text-[15px] font-medium text-white/55">条</span>}</div>
            <div className="mt-2 text-[13px] text-white/60">条纹方向：水平{turned && rot === 90 ? '（铁丝圈已转 90°）' : ''}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="λ" value={src === 'na' ? `${NA} nm` : '各色都有'} unit={src === 'na' ? '钠黄光的波长' : '白光'} />
            <ParamTile symbol="n" value={N_SOAP.toFixed(2)} unit="肥皂水的折射率" />
            <ParamTile symbol="λ / 2n" value={`${filmStep(NA).toFixed(0)} nm`} unit="相邻亮纹的膜厚差（黄光）" />
            <ParamTile symbol="膜厚" value={`${filmThickness(0, age).toFixed(0)}–${filmThickness(1, age).toFixed(0)}`} unit="nm · 上沿到下沿（约）" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">观察记录</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每换一次条件，看清条纹再记。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">光源</th><th className="font-normal">膜</th><th className="text-right font-normal">看到的</th></tr></thead>
                <tbody>{rows.map(k => { const [s, a] = k.split(':'); return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{s === 'na' ? '黄光' : '白光'}</td><td className="text-white/80">{a === '1' ? '流了一阵' : '刚拉出来'}</td><td className="text-right font-semibold text-[#7fe3d4]">{SEEN[k]}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'age'} onClick={() => setOld(o => !o)} disabled={!steady}>{old ? '重新拉一张膜' : '等肥皂水往下流'}</LabButton>
        <LabButton pulse={next === 'rot'} onClick={() => setTurned(t => !t)} disabled={!steady}>{turned ? '把铁丝圈转回去' : '把铁丝圈转 90°'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="光源"><Segmented label="光源" pulse={next === 'src'} want={next === 'src' ? task!.id.split(':')[0] as Src : null} value={src} onChange={setSrc} options={[{ value: 'na', label: '钠灯' }, { value: 'white', label: '白光灯' }]} /></Control>}
    />
  )
}
