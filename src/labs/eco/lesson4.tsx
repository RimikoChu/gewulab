// 生态系统 · 第 4 课 食物网：开阔地上草、兔、鼠、狐、蛇、鹰六种生物，八根淡淡的箭头织成一张网。
// 一条一条点亮食物链数一数（共 5 条）；看鹰占哪几个营养级；看鹰和蛇之间既有捕食又有竞争。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Eagle, Fox, Mouse, Rabbit, Snake } from './animals'
import { GlowArrow, Halo } from './fx'
import { Rock, Stump } from './lesson3'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { WEB, chainText, chainsOf, levelsOf, relation, sharedFood } from './physics'
import { useRun, type V3 } from './parts'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room, ST, onGround } from './world'

const X = ST.web.x, Z = ST.web.z, STUMP = 0.42
const POS: Record<string, V3> = {
  草: onGround(X - 0.05, Z + 0.75), 兔: onGround(X - 0.8, Z + 0.45), 鼠: onGround(X + 0.55, Z + 0.85), 狐: onGround(X - 1.2, Z - 0.3), 蛇: onGround(X + 0.98, Z + 0.72), 鹰: onGround(X + 0.05, Z - 0.55),
}
const ROCK = onGround(X + 1.55, Z + 0.2)
/** 箭头连到每种生物身上的哪一点 */
const TIP: Record<string, V3> = Object.fromEntries(Object.entries(POS).map(([k, p]) => [k, [p[0], p[1] + ({ 草: 0.16, 兔: 0.36, 鼠: 0.16, 狐: 0.6, 蛇: 0.14, 鹰: STUMP + 0.8 } as Record<string, number>)[k], p[2]]]))
const CH = chainsOf()
const edgeIn = (c: string[], a: string, b: string) => c.some((x, i) => i > 0 && c[i - 1] === a && x === b)
const EAGLE = levelsOf('鹰'), REL = relation('鹰', '蛇'), FOOD = sharedFood('鹰', '蛇')

const TASKS: Task[] = [
  { id: 'count', text: '一条一条点亮食物链，数一数有几条', note: `这张食物网里有 ${CH.length} 条食物链` },
  { id: 'eagle', text: '看鹰在哪几条链上、是第几营养级', note: `鹰在不同的链上是第${EAGLE.map(n => '一二三四五'[n - 1]).join('、第')}营养级` },
  { id: 'rel', text: '看鹰和蛇是什么关系', note: `鹰吃蛇是捕食，二者都吃${FOOD.join('、')}是竞争` },
]

export default function Lesson4() {
  const [lit, setLit] = useState(0), [eagle, setEagle] = useState(false), [rel, setRel] = useState(false)
  const T = useTasks('gewu:eco:4', TASKS)
  const k = useRun(lit, 0.9)
  useEffect(() => { T.check(id => id === 'count' ? k >= CH.length : id === 'eagle' ? eagle : id === 'rel' ? rel : false) }, [k >= CH.length, eagle, rel])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setLit(0); setEagle(false); setRel(false); T.reset() }
  const busy = Math.abs(k - lit) > 0.001
  const task = T.current
  const cur = lit > 0 && !eagle ? CH[lit - 1] : null
  const { hint, nx }: { hint: string; nx: 'lit' | 'eagle' | 'rel' | null } = (() => {
    if (!task) return { hint: '数完了。多条食物链交织在一起，就是食物网。', nx: null }
    if (busy) return { hint: '…', nx: null }
    if (task.id === 'count') return lit === 0 ? { hint: '网里交织着好几条食物链。按“点亮下一条”，一条一条数', nx: 'lit' } : { hint: `第 ${lit} 条：${chainText(CH[lit - 1])}。按“点亮下一条”`, nx: 'lit' }
    if (task.id === 'eagle') return { hint: `一共 ${CH.length} 条。鹰在哪几条链上？按“看鹰的位置”`, nx: 'eagle' }
    return { hint: '鹰和蛇是什么关系？按“看鹰和蛇”', nx: 'rel' }
  })()
  const eagleChains = CH.filter(c => c.includes('鹰'))
  // 每根箭头现在多亮：正在看的链最亮，数过的链中等，其余淡
  const state = (a: string, b: string): 'hi' | 'mid' | 'dim' | 'red' => {
    if (rel) { if (a === '蛇' && b === '鹰') return 'hi'; if (a === '鼠' && (b === '蛇' || b === '鹰')) return 'red'; return 'dim' }
    if (eagle) return eagleChains.some(c => edgeIn(c, a, b)) ? 'hi' : 'dim'
    if (cur && edgeIn(cur, a, b)) return 'hi'
    if (CH.slice(0, lit).some(c => edgeIn(c, a, b))) return 'mid'
    return 'dim'
  }
  const levelTag = (s: string) => (eagle && s === '鹰' ? `第 ${EAGLE.join('、')} 营养级` : cur && cur.includes(s) ? `第 ${cur.indexOf(s) + 1} 营养级` : null)
  const labels: Label[] = Object.keys(POS).map(s => {
    const t = levelTag(s), on = !!t || (rel && (s === '鹰' || s === '蛇' || s === '鼠'))
    return { id: s, at: [TIP[s][0], TIP[s][1] + (s === '草' ? 0.06 : 0.22), TIP[s][2]] as V3, ax: 0.5, className: `scene-tag ${on ? 'key' : ''} -translate-y-full`, children: t ? <><small>{t}</small>{s}</> : s }
  })
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="食物网"
      stage={<Room at="s4" labels={labels} span={[3.1, 1.45]} shift={[0, -0.12, 0.15]} view={[0.2, 0.2]}>
        <Rabbit position={POS.兔} rotation-y={-0.9} seed={4} />
        <Mouse position={POS.鼠} rotation-y={-2.4} scale={1.7} />
        <Fox position={POS.狐} rotation-y={-0.45} />
        <Snake position={POS.蛇} rotation-y={Math.PI - 0.15} len={0.55} scale={1.8} />
        <Rock at={ROCK} />
        <Stump at={POS.鹰} h={STUMP} />
        <Eagle position={[POS.鹰[0], POS.鹰[1] + STUMP, POS.鹰[2]]} rotation-y={-0.75} />
        <Halo at={POS.草} r={0.22} />
        {WEB.map(([a, b]) => { const s = state(a, b); return <GlowArrow key={a + b} from={TIP[a]} to={TIP[b]} lift={0.32} dim={s === 'dim'} color={s === 'red' ? '#ff8a6a' : s === 'mid' ? '#e8d6a0' : '#ffd36a'} flow={s === 'hi' ? 0.6 : 0} width={s === 'hi' ? 0.024 : 0.016} /> })}
      </Room>}
      lesson={<LessonBlock no="4" title="食物网" concept="多条食物链交织成食物网" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一个生态系统里往往有很多条食物链，它们彼此交错连接，形成<b className="text-white">食物网</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>数食物链：从每一个生产者出发，沿箭头一直走到最高级的消费者，走通一条算一条。</li>
            <li>一种生物在不同的食物链里，可以处在不同的营养级。</li>
            <li>两种生物之间可能既有捕食关系，又有竞争关系（吃同一种食物）。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="这张网数清楚了" title={`${CH.length} 条食物链交织成一张食物网`} text={`鹰是第${EAGLE.map(n => '一二三四五'[n - 1]).join('、第')}营养级；鹰吃蛇是捕食，鹰和蛇都吃${FOOD.join('、')}是竞争。食物网越复杂，生态系统越稳定。`} notes="鼠和蛇画得比真的大一些，好看清；发光的箭头是为了看清画的。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="食物链" value={`${Math.round(k)} / ${CH.length} 条`} unit="已点亮" />
            <ParamTile symbol="鹰" value={eagle ? `第 ${EAGLE.join('、')} 级` : '—'} unit="营养级" />
          </div>
          <H>点亮的食物链</H>
          <div className="flex flex-col gap-1.5">{CH.map((c, i) => <Row key={i} name={`第 ${i + 1} 条`} text={i < lit ? chainText(c) : '…'} on={cur === c || (eagle && c.includes('鹰'))} seen={i < lit} tag={i < lit ? `${c.length} 级` : undefined} />)}</div>
          {rel && <><H>鹰和蛇</H><p className="rounded-xl bg-white/6 px-3 py-2 text-[13.5px] leading-snug text-white/85">{REL.join('和')}：鹰吃蛇；鹰和蛇都吃{FOOD.join('、')}。</p></>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'lit'} onClick={() => setLit(l => Math.min(CH.length, l + 1))} disabled={busy || lit >= CH.length}>点亮下一条</LabButton>
        <LabButton pulse={nx === 'eagle'} onClick={() => setEagle(true)} disabled={busy || lit < CH.length || eagle}>看鹰的位置</LabButton>
        <LabButton pulse={nx === 'rel'} onClick={() => setRel(true)} disabled={busy || !eagle || rel}>看鹰和蛇</LabButton>
      </>}
      extras={null}
    />
  )
}
