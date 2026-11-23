// 首页的全景表：一个学科一栏，全部实验室一屏看全。已上线的是带封面的格子，规划中的是同样宽、矮一些的灰格，排在同一张网格里；点一格，在这一栏下面展开它的详情。
import { useState, type CSSProperties } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ART, PLACEHOLDER, SUBJECTS, hasOffline, issueUrl, offlineUrl, type Lab, type SubjectKey } from '@/labs'
import { cn } from '@/lib/utils'

// 每间实验室有哪几课：直接从它自己的课次表里取，新做一间不用另外登记
const TABLES = import.meta.glob<{ LESSONS: { no: string; name: string }[] }>('/src/labs/*/lessons.ts', { eager: true })
const COURSES: Record<string, string[]> = Object.fromEntries(Object.entries(TABLES).map(([path, m]) => [path.split('/')[3], m.LESSONS.filter(l => /^\d+$/.test(l.no)).map(l => l.name)]))

const subjectVars = (s: Lab['s']) => ({
  '--s-bg': `var(--${s}-bg)`, '--s-fg': `var(--${s}-fg)`, '--s-mid': `var(--${s}-mid)`, '--s-tile': `var(--${s}-tile)`,
}) as CSSProperties

function Cover({ lab }: { lab: Lab }) {
  return (
    <svg
      viewBox={lab.wide ? '0 0 640 360' : ART[lab.id] ? lab.vb ?? '0 0 320 200' : '0 14 320 172'}
      className={cn('ill block h-auto w-full', lab.wide && 'wide')}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ART[lab.id] ?? PLACEHOLDER }}
    />
  )
}

function Props({ lab }: { lab: Lab }) {
  return (
    <>
      <Badge className="rounded-sm border-0 bg-(--s-bg) px-1.5 font-normal text-(--s-fg)">{SUBJECTS[lab.s]}</Badge>
      <span>{lab.grade === '高中' ? '高中' : ''}{lab.book}</span>
      {lab.n != null && <span>{lab.n} 课</span>}
    </>
  )
}


/** 选中的那一间：封面、说明、各课、入口 */
function Detail({ lab, onClose }: { lab: Lab; onClose: () => void }) {
  const live = !!lab.href
  return (
    <div className="mt-3 grid overflow-hidden rounded-xl border bg-card md:grid-cols-[minmax(0,300px)_1fr]" style={subjectVars(lab.s)}>
      <div className={cn('flex items-center border-b bg-(--s-tile) md:border-r md:border-b-0', !live && 'opacity-75')}><Cover lab={lab} /></div>
      <div className="flex min-w-0 flex-col px-5 py-4">
        <div className="flex items-start gap-3">
          <h3 className="text-[21px] leading-tight font-bold tracking-tight">{lab.name}</h3>
          <button type="button" onClick={onClose} className="ml-auto flex-none rounded-md px-2 py-0.5 text-[13px] text-muted-foreground hover:bg-accent">收起</button>
        </div>
        <p className="mt-1.5 text-sm leading-[1.65] text-muted-foreground">{lab.desc}</p>
        {live && COURSES[lab.id]
          ? <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-[5px] border-t pt-3 text-[13px] leading-snug text-muted-foreground sm:grid-cols-4">
              {COURSES[lab.id].map((name, i) => <li key={name} className="flex gap-1.5"><span className="flex-none text-faint tabular-nums">{i + 1}</span><span className="min-w-0">{name}</span></li>)}
              <li className="flex gap-1.5 text-faint"><span className="flex-none">+</span>拓展和随堂检测</li>
            </ol>
          : <div className="mt-2.5 flex flex-wrap gap-1.5">{lab.pts.map(p => <Badge key={p} variant="secondary" className="rounded-sm px-1.5 font-normal text-muted-foreground">{p}</Badge>)}</div>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-[13px] text-muted-foreground">
          <Props lab={lab} />
          <span className="ml-auto flex items-center gap-3">
            {hasOffline(lab) && <a href={offlineUrl(lab.id)} className="underline-offset-2 hover:text-primary hover:underline">离线包</a>}
            {live
              ? <Button asChild size="sm"><a href={lab.href}>进入实验</a></Button>
              : lab.issue != null ? <Button asChild size="sm" variant="outline"><a href={issueUrl(lab.issue)} target="_blank" rel="noreferrer">还没做，来认领</a></Button> : <span className="text-faint">即将上线</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

/** 已上线的格子：电脑上一行五个 */
const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'

/** labs：已经按学段和搜索筛过的清单；subject：只看哪个学科（all 是全部） */
export function LabMap({ labs, subject }: { labs: Lab[]; subject: 'all' | SubjectKey }) {
  const [open, setOpen] = useState<string | null>(null)
  const keys = (Object.keys(SUBJECTS) as SubjectKey[]).filter(k => subject === 'all' || k === subject)
  const pick = (id: string) => setOpen(o => (o === id ? null : id))
  return (
    <div className="mt-5 flex flex-col divide-y [&>section]:py-7 [&>section:first-child]:pt-1">
      {keys.map(k => {
        const all = labs.filter(l => l.s === k), live = all.filter(l => l.href), todo = all.filter(l => !l.href), sel = all.find(l => l.id === open)
        if (all.length === 0) return null
        return (
          <section key={k} style={subjectVars(k)} className="grid gap-x-6 gap-y-2 md:grid-cols-[104px_minmax(0,1fr)]">
            <div className="flex items-baseline gap-2 md:block md:pt-1">
              <h2 className="text-[19px] font-bold tracking-tight text-(--s-fg)">{SUBJECTS[k]}</h2>
              <p className="text-[13px] text-muted-foreground md:mt-0.5">{live.length} 间已上线</p>
              <p className="text-[13px] text-faint">共 {all.length} 间</p>
            </div>
            <div className="min-w-0">
              {live.length > 0 && <div className={GRID}>
                {live.map(l => (
                  <button key={l.id} type="button" onClick={() => pick(l.id)} aria-expanded={open === l.id}
                    className={cn('group overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-[0_3px_10px_rgb(15_15_15/0.07)]', open === l.id && 'shadow-[0_0_0_2px_var(--s-mid)]')}>
                    <div className="flex aspect-[16/10] items-center overflow-hidden border-b bg-(--s-tile)"><Cover lab={l} /></div>
                    <div className="flex items-baseline gap-1.5 px-3 py-2.5">
                      <span className="min-w-0 text-[15px] leading-snug font-semibold">{l.name}</span>
                      {l.n != null && <span className="ml-auto flex-none text-[12px] text-faint">{l.n} 课</span>}
                    </div>
                  </button>
                ))}
              </div>}
              {/* 规划中的：不画格子，一段对齐成几列的小字，前面一个空心圆点 */}
              {todo.length > 0 && <div className={cn('grid grid-cols-[76px_minmax(0,1fr)] gap-x-3', live.length > 0 && 'mt-4 border-t pt-3')}>
                <p className="pt-[3px] text-[12.5px] text-faint">规划中 {todo.length} 间</p>
                <ul className="grid grid-cols-2 gap-x-5 gap-y-0.5 sm:grid-cols-3 lg:grid-cols-4">
                  {todo.map(l => (
                    <li key={l.id}>
                      <button type="button" onClick={() => pick(l.id)} aria-expanded={open === l.id}
                        className={cn('flex w-full items-baseline gap-2 rounded-md py-[3px] text-left text-[13.5px] leading-snug text-muted-foreground hover:text-foreground', open === l.id && 'font-semibold text-(--s-fg)')}>
                        <span className={cn('mt-[1px] size-[7px] flex-none translate-y-[-1px] rounded-full border border-[#c9c7c1]', open === l.id && 'border-(--s-mid) bg-(--s-mid)')} />
                        <span className="min-w-0">{l.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>}
              {sel && <Detail lab={sel} onClose={() => setOpen(null)} />}
            </div>
          </section>
        )
      })}
    </div>
  )
}
