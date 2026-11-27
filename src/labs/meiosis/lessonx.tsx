// 减数分裂和遗传规律 · 拓展 遗传咨询中的概率：大屏上一张白化病（常染色体隐性遗传）的系谱图。一对表现正常的夫妇生了一个患病的儿子，
// 一问一问地算：再生一个患病孩子的概率；表现正常的女儿是携带者的概率；她和一个携带者结婚，孩子患病的概率（乘法原理）。
import { useEffect, useState } from 'react'
import { Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { SCR, ScreenInk, type Pen } from './board'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { fstr, pAffected, pCarrierGivenNormal, pChildOf } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const P1 = pAffected('Aa', 'Aa'), P2 = pCarrierGivenNormal('Aa', 'Aa'), P3 = pChildOf(P2)
const QS = [
  { id: 'q1', q: 'Ⅰ-1 和 Ⅰ-2 再生一个孩子，患白化病的概率是多少？', steps: ['两人都正常，却生出了患病的 Ⅱ-1（aa）', '所以 Ⅰ-1、Ⅰ-2 都是 Aa', `Aa × Aa → AA∶Aa∶aa = 1∶2∶1，aa 占 ${fstr(P1)}`], ans: P1 },
  { id: 'q2', q: 'Ⅱ-2 表现正常，她是携带者（Aa）的概率是多少？', steps: ['她表现正常，不可能是 aa', '正常的孩子里 AA∶Aa = 1∶2', `所以她是 Aa 的概率是 ${fstr(P2)}，不是 1/2`], ans: P2 },
  { id: 'q3', q: 'Ⅱ-2 和携带者 Ⅱ-3 结婚，孩子 Ⅲ-1 患病的概率是多少？', steps: [`Ⅱ-2 是 Aa 的概率 ${fstr(P2)}`, `两个 Aa 的孩子患病的概率 ${fstr(P1)}`, `两件事都要发生：${fstr(P2)} × ${fstr(P1)} = ${fstr(P3)}`], ans: P3 },
]
const TASKS: Task[] = QS.map((q, i) => ({ id: q.id, text: ['算 Ⅰ-1、Ⅰ-2 再生一个患病孩子的概率', '算正常的 Ⅱ-2 是携带者的概率', '算 Ⅱ-2 和携带者结婚，孩子患病的概率'][i], note: `${fstr(q.ans)}` }))

/** 系谱图：□ 男、○ 女，涂黑的是患者；Ⅰ、Ⅱ、Ⅲ 是世代 */
function drawScreen(p: Pen, i: number, shown: number) {
  p.text('白化病的系谱图', -88, 45, 6.2, SCR.fg, 'left', 700)
  p.text('□ 男　○ 女　■● 患者', -88, 36, 4.2, SCR.dim, 'left')
  const sq = (x: number, y: number, fill: boolean, hi: boolean) => { p.rect(x - 4, y - 4, 8, 8, hi ? SCR.key : SCR.fg, 0.55, fill ? SCR.fg : SCR.bg) }
  const ci = (x: number, y: number, fill: boolean, hi: boolean) => p.circle(x, y, 4.2, hi ? SCR.key : SCR.fg, 0.55, fill ? SCR.fg : SCR.bg)
  const G = [['Ⅰ', 20], ['Ⅱ', -2], ['Ⅲ', -26]] as const
  G.forEach(([t, y]) => p.text(t, -90, y, 5, SCR.dim, 'left'))
  // Ⅰ 代：一对夫妇
  p.line([[-66, 20], [-46, 20]], SCR.fg, 0.4); p.line([[-56, 20], [-56, 9], [-70, 9], [-70, 2]], SCR.fg, 0.4); p.line([[-56, 9], [-46, 9], [-46, 2]], SCR.fg, 0.4)
  sq(-70, 20, false, i === 0); ci(-42, 20, false, i === 0)
  p.text('1', -70, 13, 3.4, SCR.dim); p.text('2', -42, 13, 3.4, SCR.dim)
  // Ⅱ 代：患病的儿子、正常的女儿（和她的丈夫）
  sq(-70, -2, true, false); ci(-46, -2, false, i >= 1); p.line([[-41.8, -2], [-24, -2]], SCR.fg, 0.4); sq(-20, -2, false, i === 2)
  p.text('1', -70, -9.5, 3.4, SCR.dim); p.text('2', -46, -9.5, 3.4, SCR.dim); p.text('3', -20, -9.5, 3.4, SCR.dim); p.text('携带者', -20, 6, 3.4, SCR.dim)
  p.line([[-33, -2], [-33, -20]], SCR.fg, 0.4)
  p.circle(-33, -26, 4.2, SCR.warm, 0.55); p.text('?', -33, -26, 4.4, SCR.warm, 'center', 700); p.text('1', -33, -33.5, 3.4, SCR.dim)
  // 右边：这一问和推理
  const q = QS[i]
  p.text(`第 ${i + 1} 问`, -2, 45, 4.6, SCR.key, 'left', 700)
  wrap(p, q.q, -2, 36, 5.2, 88)
  q.steps.forEach((s, k) => { if (k < shown) wrap(p, `${k + 1}. ${s}`, -2, 16 - k * 13, 4.4, 88, k === q.steps.length - 1 ? SCR.warm : SCR.fg) })
}
/** 按宽度折行（中文按字符） */
function wrap(p: Pen, s: string, x: number, y: number, size: number, width: number, color = SCR.fg) {
  // 中文按字折行，英文字母和数字连在一起的不拆开（西文按半个字宽算）
  const lines: string[] = []; let cur = '', w = 0
  const cw = (c: string) => (/[\x00-\x7f]/.test(c) ? 0.55 : 1) * size
  for (const c of s) {
    if (w + cw(c) > width) {
      const m = /[A-Za-z0-9/]+$/.exec(cur)
      if (m && /[A-Za-z0-9/]/.test(c) && m[0].length < cur.length) { lines.push(cur.slice(0, -m[0].length)); cur = m[0]; w = [...cur].reduce((a, x) => a + cw(x), 0) } else { lines.push(cur); cur = ''; w = 0 }
    }
    cur += c; w += cw(c)
  }
  if (cur) lines.push(cur)
  lines.forEach((l, j) => p.text(l, x, y - j * size * 1.35, size, color, 'left', 600))
}

export default function LessonX() {
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(0)
  const T = useTasks('gewu:meiosis:x', TASKS)
  const q = QS[i], solved = shown >= q.steps.length
  useEffect(() => { if (solved) T.check(id => QS.findIndex(x => x.id === id) <= i) }, [i, solved])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setI(0); setShown(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'calc' | 'next' | null } = (() => {
    if (!task) return { hint: '遗传咨询：先判断亲代的基因型，再一步步算概率。', next: null }
    if (!solved) return { hint: shown === 0 ? `第 ${i + 1} 问。先想一想，再按“算一算”` : `第 ${i + 1} 问。按“算一算”，看下一步（${shown + 1}/${q.steps.length}）`, next: 'calc' }
    return { hint: `答案是 ${fstr(q.ans)}。按“下一问”`, next: 'next' }
  })()
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="一问一问地算"
      stage={<Room at="screen2" labels={[]}><ScreenInk draw={p => drawScreen(p, i, shown)} deps={[i, shown]} /></Room>}
      lesson={<LessonBlock no="拓展" title="遗传咨询中的概率" concept="先定基因型，再用乘法原理" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>白化病是常染色体隐性遗传病：只有 aa 才患病。表现正常的双亲生出患病的孩子，双亲一定都是携带者 Aa。</p>
          <p className="mt-2">已知一个人表现正常，算他是携带者的概率时，要把 aa 去掉，只在正常的里面算：AA∶Aa = 1∶2，所以是 2/3。</p>
          <p className="mt-2">几件相互独立的事同时发生，概率相乘（<b className="text-white">乘法原理</b>）。遗传咨询可以帮助预防遗传病，禁止近亲结婚也是这个道理。</p>
        </>} />}
      finale={T.finale && <Finale kicker="遗传咨询中的概率" title={`${fstr(P1)}、${fstr(P2)}、${fstr(P3)}`} text={`双亲正常、孩子患病，双亲都是 Aa。再生一个患病孩子的概率 ${fstr(P1)}；正常的女儿是携带者的概率 ${fstr(P2)}（只在正常的孩子里算）；她和携带者结婚，孩子患病的概率 ${fstr(P2)} × ${fstr(P1)} = ${fstr(P3)}。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <ParamTile symbol={`第 ${i + 1} 问的答案`} value={solved ? fstr(q.ans) : '—'} unit="概率" />
          <H>三问</H>
          <div className="flex flex-col gap-1.5">{QS.map((x, k) => <Row key={x.id} name={`第 ${k + 1} 问`} text={T.done[x.id] ? fstr(x.ans) : k === i ? '正在算' : '—'} seen={!!T.done[x.id]} on={k === i} />)}</div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">A：正常（显性），a：白化（隐性），在常染色体上。</p>
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'calc'} onClick={() => setShown(s => s + 1)} disabled={solved}>算一算</LabButton>
        <LabButton pulse={next === 'next'} onClick={() => { setI(k => k + 1); setShown(0) }} disabled={!solved || i >= QS.length - 1}>下一问</LabButton>
      </>}
      extras={null}
    />
  )
}
