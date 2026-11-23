// 首页底部“一起用、一起做”那一块的内容。联系方式和各平台的账号写在这里；哪一项留空，页面上就不出现哪一项。
export interface Channel { name: string; id?: string; url?: string; qr?: string }

export const SITE = {
  /** 源码仓库 */
  repo: 'https://github.com/RimikoChu/gewulab',
  /** 培训、定制、学校和机构合作找谁：写一句怎么联系（比如“加微信 xxx”），或者放一张二维码图片的地址（'/assets/site/xxx.png'）。两样都空着，这三栏就不显示 */
  contact: { text: '', qr: '' },
  /** 关注的地方：微信群、公众号、小红书、抖音、视频号。id 是账号名，url 是主页地址，qr 是二维码图片；三样都空着的不显示 */
  channels: [
    { name: '微信群' }, { name: '公众号' }, { name: '小红书' }, { name: '抖音' }, { name: '视频号' },
  ] as Channel[],
}
