import type { CSSProperties } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BorderBeam } from '@/components/ui/border-beam'
import { ART, PLACEHOLDER, SUBJECTS, issueUrl, type Lab } from '@/labs'
import { cn } from '@/lib/utils'

const subjectVars = (s: Lab['s']) => ({
  '--s-bg': `var(--${s}-bg)`, '--s-fg': `var(--${s}-fg)`, '--s-mid': `var(--${s}-mid)`, '--s-tile': `var(--${s}-tile)`,
}) as CSSProperties

function Cover({ lab, featured }: { lab: Lab; featured?: boolean }) {
  return (
    <svg
      viewBox={lab.wide ? '0 0 640 360' : ART[lab.id] ? lab.vb ?? '0 0 320 200' : '0 14 320 172'}
      preserveAspectRatio={featured ? 'xMidYMid slice' : undefined}
      className={cn('ill block w-full', lab.wide && 'wide', featured ? 'big absolute inset-0 h-full' : 'h-auto')}
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

/** 普通卡片：封面 + 标题 + 说明 + 知识点 + 一行属性。做好的点开进实验室；还没做的点开是它的认领议题 */
export function LabCard({ lab }: { lab: Lab }) {
  const live = !!lab.href
  const to = lab.href ?? (lab.issue != null ? issueUrl(lab.issue) : undefined)
  const Wrapper = to ? 'a' : 'div'
  return (
    <Wrapper href={to} {...(!live && to ? { target: '_blank', rel: 'noreferrer' } : null)} className="lab-card group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2" style={subjectVars(lab.s)}>
      <Card className={cn('gap-0 overflow-hidden rounded-xl py-0 shadow-none transition-[background,box-shadow] duration-150',
        'group-hover:bg-[#fbfbfa] group-hover:shadow-[0_3px_10px_rgb(15_15_15/0.07)]')}>
        <div className={cn('border-b bg-(--s-tile)', !live && 'opacity-75 transition-opacity group-hover:opacity-100')}><Cover lab={lab} /></div>
        <div className="px-4 pt-3.5 pb-4">
          <h2 className={cn('text-[17px] leading-snug font-semibold', !live && 'text-muted-foreground')}>{lab.name}</h2>
          <p className="mt-1.5 text-sm leading-[1.65] text-muted-foreground">{lab.desc}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {lab.pts.map(p => <Badge key={p} variant="secondary" className="rounded-sm px-1.5 font-normal text-muted-foreground">{p}</Badge>)}
          </div>
          <div className="mt-3 flex items-center gap-2 overflow-hidden text-[13px] whitespace-nowrap text-muted-foreground">
            <Props lab={lab} />
            {!live && <span className="ml-auto text-faint group-hover:text-primary">{lab.issue != null ? '还没做，欢迎参与' : '即将上线'}</span>}
          </div>
        </div>
      </Card>
    </Wrapper>
  )
}

/** 主推卡：横向通栏，只用于可以进入的实验 */
export function FeaturedLabCard({ lab }: { lab: Lab }) {
  return (
    <a href={lab.href} data-featured className="lab-card group block rounded-xl" style={subjectVars(lab.s)}>
      <Card className="relative grid gap-0 overflow-hidden rounded-xl py-0 shadow-none transition-shadow duration-150 group-hover:shadow-[0_6px_20px_rgb(15_15_15/0.08)] md:grid-cols-[1.15fr_1fr]">
        <div className="relative min-h-56 border-b bg-(--s-tile) md:min-h-80 md:border-r md:border-b-0"><Cover lab={lab} featured /></div>
        <div className="flex flex-col px-5 py-5 md:px-8 md:py-7">
          <h2 className="text-[28px] leading-tight font-bold tracking-tight">{lab.name}</h2>
          <p className="mt-2 text-[15.5px] leading-[1.65] text-muted-foreground">{lab.desc}</p>
          <p className="mt-6 text-[13.5px] text-muted-foreground">{lab.lessons!.length} 节课，跟着一次地震从头走到尾</p>
          <ol className="relative mt-3 flex before:absolute before:inset-x-0 before:top-[3px] before:h-px before:bg-border">
            {lab.lessons!.map(l => (
              <li key={l} className="relative flex-1 pt-4 pr-2 text-[13.5px] leading-snug before:absolute before:top-0 before:left-0 before:size-[7px] before:rounded-full before:bg-background before:shadow-[inset_0_0_0_1.5px_var(--faint)] first:before:bg-primary first:before:shadow-none">
                {l}
              </li>
            ))}
          </ol>
          <div className="mt-auto flex items-center gap-2 pt-6 text-[13px] text-muted-foreground">
            <Props lab={lab} />
            <Button asChild size="sm" className="ml-auto"><span>进入实验</span></Button>
          </div>
        </div>
        <BorderBeam size={120} duration={9} colorFrom="var(--s-mid)" colorTo="transparent" borderWidth={1.5} />
      </Card>
    </a>
  )
}
