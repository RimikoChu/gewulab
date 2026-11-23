// 原电池 · 第 6 课 剖开一节干电池（锌锰干电池的构造）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import * as THREE from 'three'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DRY, DRY_VOLT, type DryKey } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

const KEYS = Object.keys(DRY) as DryKey[]
const TASKS: Task[] = [
  { id: 'poles', text: '找到负极和正极：锌筒和石墨棒', note: '外壳锌筒是负极，中间的石墨棒是正极' },
  { id: 'rest', text: '再看里面的糊状物和封口', note: '二氧化锰在正极得电子，氯化铵糊是电解质；封口防漏' },
]
const X = ST.three, AT: Record<DryKey, [number, number]> = { zinc: [0.3, 0.45], carbon: [0.06, 1.05], paste: [-0.3, 0.6], seal: [0.25, 1.12] }

export default function Lesson6() {
  const [n, setN] = useState(0)
  const T = useTasks('gewu:battery:6', TASKS)
  const go = () => { if (n >= KEYS.length) return; const k = n + 1; setN(k); T.check(id => id === 'poles' ? k >= 2 : k >= KEYS.length) }
  const resetAll = () => { setN(0); T.reset() }
  const now = n ? KEYS[n - 1] : null, todo = KEYS[n]
  const hint = todo ? `${now ? `${DRY[now].name}：${DRY[now].say}。` : ''}按“看下一个部分”` : '四个部分都看过了。'
  const m = (k: DryKey, color: string, metal = 0.2) => <meshStandardMaterial color={color} metalness={metal} roughness={0.5} side={THREE.DoubleSide} emissive={now === k ? '#35c7b3' : '#000000'} emissiveIntensity={now === k ? 0.5 : 0} />
  const labels: Label[] = KEYS.slice(0, n).map(k => ({ id: k, at: [X + AT[k][0], TOP + AT[k][1], 0.2], ax: AT[k][0] < 0 ? 1 : 0, className: `scene-tag -translate-y-1/2${now === k ? ' key' : ''}`, children: <><small>{DRY[k].role}</small>{DRY[k].name}</> }))

  return (
    <LabShell title="原电池" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="干电池模型"
      stage={<LabStage labels={labels} target={SPOT.three} span={SPAN}>
        {/* 一节放大的干电池，朝镜头的一半切掉了 */}
        <group position={[X, TOP + 0.08, 0]} rotation-y={-0.42 + Math.PI / 2}>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.26, 0.26, 1.0, 40, 1, true, 0, Math.PI]} />{m('zinc', '#aab4bd', 0.8)}</mesh>
          <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.26, 0.26, 0.02, 40]} />{m('zinc', '#aab4bd', 0.8)}</mesh>
          <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.235, 0.235, 0.94, 40, 1, false, 0, Math.PI]} />{m('paste', '#2a2523', 0)}</mesh>
          <mesh position={[0, 0.58, 0]}><cylinderGeometry args={[0.035, 0.035, 1.02, 16]} />{m('carbon', '#111315', 0.1)}</mesh>
          <mesh position={[0, 1.02, 0]}><cylinderGeometry args={[0.26, 0.26, 0.05, 40, 1, false, 0, Math.PI]} />{m('seal', '#b23b34', 0)}</mesh>
          <mesh position={[0, 1.11, 0]}><cylinderGeometry args={[0.06, 0.07, 0.06, 20]} />{m('seal', '#d9b25a', 0.9)}</mesh>
        </group>
        <mesh position={[X, TOP + 0.04, 0]} castShadow><cylinderGeometry args={[0.4, 0.46, 0.08, 32]} /><meshStandardMaterial color="#20262b" roughness={0.6} /></mesh>
      </LabStage>}
      lesson={<LessonBlock no="6" title="剖开一节干电池" concept="外壳是负极，中间是正极" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">{KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{DRY[k].name}（{DRY[k].role}）：</b>{DRY[k].say}</li>)}</ul>
          <p className="mt-3">这是最普通的锌锰干电池，一节新的电压约 {DRY_VOLT} V。它是一次电池：反应物用完就不能再用，也不能充电。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">一节干电池看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">它和烧杯里的原电池是一回事</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">锌筒是负极，石墨棒是正极，糊状的电解质代替了那杯稀硫酸。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在亮着的是</div>
            <div className="mt-1 text-[28px] leading-none font-bold tracking-tight text-[#7fe3d4]">{now ? DRY[now].name : '一节干电池'}</div>
            <div className="mt-2 text-[13px] text-white/55">{now ? DRY[now].role : '朝你的一半切掉了'}</div>
          </div>
          {now && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{DRY[now].say}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="电压" value={`${DRY_VOLT} V`} unit="一节新电池，约" />
            <ParamTile symbol="种类" value="一次电池" unit="不能充电" />
          </div>
        </Glass>
      }
      actions={<><LabButton primary pulse={!!todo} onClick={go} disabled={!todo}>{todo ? '看下一个部分' : '都看过了'}</LabButton></>}
      extras={null}
    />
  )
}
