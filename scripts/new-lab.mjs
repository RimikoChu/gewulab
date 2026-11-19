// 新建一间实验室的骨架：能直接跑起来的一课，带常驻舞台、计算、测试和规格卡。
// 用法：npm run new-lab -- <目录名> <中文名>      例：npm run new-lab -- lever 杠杆
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const [id, name] = process.argv.slice(2)
if (!id || !name || !/^[a-z][a-z0-9-]*$/.test(id)) { console.log('用法：npm run new-lab -- <目录名：小写字母、数字、连字符> <中文名>'); process.exit(1) }
if (existsSync(join(root, 'src/labs', id))) { console.log(`src/labs/${id} 已经存在`); process.exit(1) }
const put = (p, s) => { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), s); console.log('新建 ' + p) }

put(`labs/${id}/index.html`, readFileSync(join(root, 'labs/pressure/index.html'), 'utf8').replace('压强 · 格物实验室', `${name} · 格物实验室`).replace('/src/labs/pressure/main.tsx', `/src/labs/${id}/main.tsx`))

put(`src/labs/${id}/lessons.ts`, `// ${name}实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1'])
const ALL: [string, string, string][] = [
  ['1', '1', '示例课'], ['x', '拓展', '拓展课'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
`)

put(`src/labs/${id}/physics.ts`, `// ${name}实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/${id}.md 里。
export const G = 9.8 // N/kg

// ---------- 第 1 课（示例）：称一称 ----------
export const BOXES = { small: { name: '小箱', mass: 10 }, big: { name: '大箱', mass: 25 } } as const
export type BoxKey = keyof typeof BOXES
/** 箱子的重力（N） */
export const weight = (box: BoxKey) => BOXES[box].mass * G
`)

put(`src/labs/${id}/physics.test.ts`, `// ${name}实验室的计算核对：这里的数字要和规格卡 docs/specs/${id}.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { weight } from './physics'

describe('${name}', () => {
  it('第 1 课：10 kg 的小箱重 98 N', () => { expect(weight('small')).toBeCloseTo(98, 6) })
  it('第 1 课：25 kg 的大箱重 245 N', () => { expect(weight('big')).toBeCloseTo(245, 6) })
  it('第 1 课：质量大的更重', () => { expect(weight('big')).toBeGreaterThan(weight('small')) })
})
`)

put(`src/labs/${id}/world.tsx`, `// ${name}实验室的大场景：整个实验室只有这一个世界，各课在里面各占一处。换课时画布不重建，镜头飞过去。
// 各课的位置写在 ST 里。
import { useConcrete } from '@/lab-kit'

/** 各课所在的位置（x 坐标） */
export const ST = { one: 0 }

export function World() {
  const [d, n, r] = useConcrete(40, 40)
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[400, 400]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#b9b7ad" /></mesh>
    </group>
  )
}
`)

put(`src/labs/${id}/scene1.tsx`, `// ${name} · 第 1 课（示例）的三维场景：只放这一课自己的器材。整个世界在 world.tsx。
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Led, useSlide, type Label } from '@/lab-kit'
import { BOXES, weight, type BoxKey } from './physics'
import { ST } from './world'

const X0 = ST.one
const TARGET = new THREE.Vector3(X0, 1, 0)
const SPAN: [number, number] = [5, 3.6]

export default function Scene1({ box, down }: { box: BoxKey; down: boolean }) {
  const y = useSlide(down ? 0.3 : 1.6, 1.4), on = down && y < 0.31
  const side = box === 'big' ? 0.8 : 0.55
  const labels: Label[] = [
    { id: 'w', at: [X0 + 0.9, 0.2, 0.5], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: on ? 1 : 0 }, children: <><small>读数</small>{weight(box).toFixed(0)} N</> },
    { id: 'nBox', at: [X0 + side / 2 + 0.1, y + side / 2, 0], name: true, className: 'scene-name -translate-y-1/2', children: \`\${BOXES[box].name} · \${BOXES[box].mass} kg\` },
  ]
  return (
    <LabStage labels={labels} target={TARGET} span={SPAN}>
      <group position={[X0, 0, 0]}>
        {/* 台秤 */}
        <RoundedBox args={[1.4, 0.3, 1.2]} radius={0.04} position={[0, 0.15, 0]} castShadow receiveShadow><meshStandardMaterial color="#4a5058" metalness={0.5} roughness={0.5} /></RoundedBox>
        <Led text={on ? weight(box).toFixed(0) : '0'} w={0.5} h={0.18} position={[0, 0.15, 0.605]} />
        {/* 箱子 */}
        <RoundedBox args={[side, side, side]} radius={0.03} position={[0, y + side / 2, 0]} castShadow><meshStandardMaterial color="#b98650" roughness={0.85} /></RoundedBox>
      </group>
    </LabStage>
  )
}
`)

put(`src/labs/${id}/lesson1.tsx`, `// ${name} · 第 1 课（示例）：照这个样子写每一课。主操作区最多三个一步到位的按钮；提示语永远告诉学生下一步做什么。
// 顶栏的“自动演示”会替学生点现在在闪的那个控件：所以该按的按钮要给 pulse，该选的分段选择还要给 want。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { BOXES, G, weight, type BoxKey } from './physics'

const TASKS: Task[] = [
  { id: 'small', text: '把小箱放到秤上，记下读数', note: '10 kg 的箱子重 98 N' },
  { id: 'big', text: '换成大箱，再记一次', note: '质量越大，重力越大' },
]

export default function Lesson1() {
  const [box, setBox] = useState<BoxKey>('small')
  const [down, setDown] = useState(false)
  const [settled, setSettled] = useState(false)
  const [rows, setRows] = useState<BoxKey[]>([])
  const T = useTasks('gewu:${id}:1', TASKS)
  useEffect(() => { setSettled(false); if (!down) return; const t = setTimeout(() => setSettled(true), 1100); return () => clearTimeout(t) }, [down, box])
  const dup = rows.includes(box)
  const record = () => { if (!settled || dup) return; const next = [...rows, box]; setRows(next); T.check(id => next.includes(id as BoxKey)) }
  const resetAll = () => { setBox('small'); setDown(false); setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'down' | 'record' | 'box' | null } = (() => {
    if (!task) return { hint: '都做完了。', next: null }
    if (box !== task.id) return { hint: \`把箱子换成\${BOXES[task.id as BoxKey].name}\`, next: 'box' }
    if (!down) return { hint: '把箱子放到秤上', next: 'down' }
    return settled && !dup ? { hint: '按“记录数据”', next: 'record' } : { hint: '放稳了…', next: null }
  })()

  return (
    <LabShell title="${name}" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="箱子"
      stage={<Scene1 box={box} down={down} />}
      lesson={<LessonBlock no="1" title="示例课" concept="一句话的核心概念" tasks={TASKS} done={T.done} current={task?.id}
        theory={<p>原理讲解默认收起，点“看原理”才显示。这里写教材上的说法，用词和教材一致。</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">全部任务完成后的一句结论</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">G = m g</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled ? weight(box).toFixed(0) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={String(BOXES[box].mass)} unit="kg · 质量" />
            <ParamTile symbol="g" value={String(G)} unit="N/kg" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'down'} onClick={() => setDown(d => !d)}>{down ? '拿起来' : '放到秤上'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!settled || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="箱子">
          <Segmented label="箱子" pulse={next === 'box'} want={(task?.id as BoxKey) ?? null} value={box} onChange={k => { setBox(k as BoxKey); setDown(false) }} options={(Object.keys(BOXES) as BoxKey[]).map(k => ({ value: k, label: BOXES[k].name }))} />
        </Control>
      }
    />
  )
}
`)

put(`src/labs/${id}/main.tsx`, `import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { StageHost } from '@/lab-kit'
import Lesson1 from './lesson1'
import { isReady } from './lessons'
import { World } from './world'

// 地址栏 # 后面是课号；没有或写错就从第 1 课开始
const current = () => { const k = location.hash.slice(1); return isReady(k) ? k : '1' }
function Lab() {
  const [key, setKey] = useState(current)
  useEffect(() => { const on = () => setKey(current()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  return (
    <>
      {/* 整个大场景只建一次：换课时画布不重建，镜头飞到另一处 */}
      <StageHost world={() => <World />} />
      {/* 做好一课，在这里加一个分支 */}
      <Lesson1 key={key} />
    </>
  )
}
createRoot(document.getElementById('root')!).render(<Lab />)
`)

put(`docs/specs/${id}.md`, readFileSync(join(root, 'docs/spec-template.md'), 'utf8').replace('# 规格卡模板', `# ${name}实验室 · 规格卡 v0.1`).replace(/复制到 `docs\/specs\/<实验室>\.md` 后填写。\n/, '状态：待审。\n'))

console.log(`
接下来：
1. 先填规格卡 docs/specs/${id}.md，提一个 PR 请人审（只有规格卡也可以提）。
2. npm run dev，打开 /labs/${id}/index.html 看示例课。
3. 照规范 docs/lab-standard.md 一课一课做；做完在 src/labs.ts 里加首页卡片。
4. 提交前跑 npm run check。`)
