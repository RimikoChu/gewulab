// 首页底部：这个站点可以怎么用、怎么学着做、怎么请人做、怎么参与，以及去哪里关注。内容在 src/site.ts。
import { SITE } from '@/site'
import { offlineUrl } from '@/labs'

function Way({ title, lines, children }: { title: string; lines: string[]; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="text-[15.5px] font-semibold">{title}</h3>
      {lines.map(t => <p key={t} className="mt-1.5 text-[13.5px] leading-[1.65] text-muted-foreground">{t}</p>)}
      {children && <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">{children}</div>}
    </div>
  )
}
const link = 'text-foreground underline underline-offset-2 hover:text-primary'

export function SiteFooter() {
  const paid = !!(SITE.contact.text || SITE.contact.qr)
  const channels = SITE.channels.filter(c => c.id || c.url || c.qr)
  return (
    <footer className="mt-16 border-t pt-8">
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        <Way title="上课用" lines={['每一间都能下载成一个网页文件，拷到教室的电脑上双击就能打开，不用联网。']}>
          <a className={link} href={offlineUrl('all')}>下载全部离线包</a>
        </Way>
        {paid && <Way title="学着自己做" lines={['加入培训群，用 AI 辅助，3 到 7 天做出自己的第一节互动微课。', '299 元一年：分步教程、起手模板、群里答疑。']} />}
        {paid && <Way title="请我们定制" lines={['一节微课的互动课件，1000 元上下，按工作量报价。', '先说清做什么，再开工；做完在线预览，满意再交付。']} />}
        <Way title="一起来做" lines={['全部开源。还没做的实验室都可以认领，做出来就上线，写上你的名字。']}>
          <a className={link} href={SITE.repo} target="_blank" rel="noreferrer">源码和认领办法</a>
        </Way>
      </div>
      {(paid || channels.length > 0) && (
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-5 border-t pt-6">
          {paid && <div className="flex items-center gap-3">
            {SITE.contact.qr && <img src={SITE.contact.qr} alt="联系方式的二维码" className="size-24 rounded-md border" />}
            <div><p className="text-[13.5px] font-semibold">培训和定制</p>{SITE.contact.text && <p className="mt-1 text-[13.5px] text-muted-foreground">{SITE.contact.text}</p>}</div>
          </div>}
          {channels.map(c => (
            <div key={c.name} className="flex items-center gap-3">
              {c.qr && <img src={c.qr} alt={`${c.name}的二维码`} className="size-24 rounded-md border" />}
              <div>
                <p className="text-[13.5px] font-semibold">{c.name}</p>
                {c.url ? <a className={`mt-1 block text-[13.5px] ${link}`} href={c.url} target="_blank" rel="noreferrer">{c.id || '打开'}</a> : c.id && <p className="mt-1 text-[13.5px] text-muted-foreground">{c.id}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-8 text-[12.5px] text-faint">格物实验室 · 代码以 AGPL-3.0 许可开源</p>
    </footer>
  )
}
