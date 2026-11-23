// 首页底部：课堂使用、课件制作培训、课件定制、学校与机构合作、成为贡献者，以及联系方式和关注的地方。内容在 src/site.ts。
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
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        <Way title="课堂使用" lines={['每间实验室都可下载为单个网页文件，拷到教室电脑上双击即可打开，无需联网。']}>
          <a className={link} href={offlineUrl('all')}>下载全部离线包</a>
        </Way>
        {paid && <Way title="课件制作培训" lines={['面向想自己制作互动课件的老师。借助 AI 工具，3 到 7 天完成第一节互动微课。', '年费 299 元，含分步教程、起手模板和一年答疑。']} />}
        {paid && <Way title="课件定制" lines={['根据你的教学内容，定制一节互动微课。', '先确认需求与范围，在线预览满意后交付。']} />}
        {paid && <Way title="学校与机构合作" lines={['校内离线部署、按教材与进度定制成套课件、教师使用与制作培训。']} />}
        <Way title="成为贡献者" lines={['本项目开源。你可以认领尚未完成的实验室，作品上线后署名展示。']}>
          <a className={link} href={SITE.repo} target="_blank" rel="noreferrer">查看认领方式</a>
        </Way>
      </div>
      {(paid || channels.length > 0) && (
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-5 border-t pt-6">
          {paid && <div className="flex items-center gap-3">
            {SITE.contact.qr && <img src={SITE.contact.qr} alt="联系方式的二维码" className="size-32 rounded-md border" />}
            <div><p className="text-[13.5px] font-semibold">培训、定制与合作</p>{SITE.contact.text && <p className="mt-1 text-[13.5px] text-muted-foreground">{SITE.contact.text}</p>}</div>
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
