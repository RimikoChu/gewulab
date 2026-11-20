# 实验室总规划

初期的目标：五个学科、大约 50 间实验室，把中学阶段最适合“动手做”的主要章节铺开。

这张表是总览。每一间只写了方向：对应哪一章、想让学生弄懂什么、建议放在什么真实场景里。具体有哪几课、每课做什么，由认领的人在规格卡里定。

- 一间实验室要做成什么样：[`lab-standard.md`](lab-standard.md)
- 怎么参与：[`../CONTRIBUTING.md`](../CONTRIBUTING.md)

## 怎么认领

每间实验室有一个议题，认领、进度、讨论都在那个议题里。**谁认领了、还能不能认领，以议题为准**：有负责人头像、贴着“已认领”标签的，就是有人在做。

- [还可以认领的](https://github.com/RimikoChu/gewulab/issues?q=is%3Aissue+is%3Aopen+label%3A可认领)
- [已经有人在做的](https://github.com/RimikoChu/gewulab/issues?q=is%3Aissue+is%3Aopen+label%3A已认领)
- [全部实验室的议题](https://github.com/RimikoChu/gewulab/issues?q=is%3Aissue+label%3A实验室)

规则：

1. 在想做的那一间的议题下回复 `/认领`。议题会自动把你设为负责人，标签换成“已认领”。**先回复的人得到这一间**，不需要等维护者确认。
2. 认领以后马上可以开始写规格卡。**14 天内要提交规格卡**，提交请求的说明里写上“关联 #议题编号”。
3. 14 天没有关联的提交请求，议题里会自动提醒一次；21 天还没有，这一间自动重新开放。
4. 做不下去了，回复 `/放弃`，让别人接手。
5. 一个人同时最多认领两间。

表里没有的题目也可以做：开一个“新实验室选题”议题。维护者看过觉得可以，会给它贴上“实验室”和“可认领”标签，之后和别的实验室一样回复 `/认领`。表里的方向、场景建议都可以改，在规格卡里说明理由就行。

用命令行或 AI 助手查还可以认领的：

```bash
gh issue list --repo RimikoChu/gewulab --label 可认领 --limit 100
```

## 教材位置的说明

教材位置按人教版写，只写到册和章的名称。**各版本、各年份的章节编号不一样，这张表里没有写章号。** 认领的人要对着现行教材核实，把准确的版本、册、章、节写进规格卡。高中的几间写的是必修或选择性必修的模块。

## 物理（16 间）

初中物理按教材顺序基本铺满。

| 目录名 | 实验室 | 学段 · 教材位置 | 想让学生弄懂什么 | 场景建议 | 议题 |
|---|---|---|---|---|---|
| `motion` | 机械运动 | 初中 · 八年级上册 机械运动 | 怎样量长度和时间；速度是什么；运动是相对的 | 高铁站和一段铁路 | [#1](https://github.com/RimikoChu/gewulab/issues/1) |
| `sound` | 声现象 | 初中 · 八年级上册 声现象 | 声音怎样产生和传播；音调、响度、音色各由什么决定 | 音乐厅和后台 | [#2](https://github.com/RimikoChu/gewulab/issues/2) |
| `phase` | 物态变化 | 初中 · 八年级上册 物态变化 | 熔化、凝固、汽化、液化、升华、凝华；温度怎样变 | 高山气象站：从山脚到雪线 | [#3](https://github.com/RimikoChu/gewulab/issues/3) |
| `mirror` | 光的反射和平面镜 | 初中 · 八年级上册 光现象 | 光沿直线传播；反射定律；平面镜成像的特点 | 湖边和一座灯塔 | [#4](https://github.com/RimikoChu/gewulab/issues/4) |
| `lens` | 光的折射和凸透镜成像 | 初中 · 八年级上册 光现象、透镜及其应用 | 折射；凸透镜成像的规律；照相机、投影仪、放大镜 | 天文台和摄影棚 | [#5](https://github.com/RimikoChu/gewulab/issues/5) |
| `density` | 质量与密度 | 初中 · 八年级上册 质量与密度 | 怎样测质量和体积；密度是物质的特性 | 金属冶炼厂的化验室和料场 | [#6](https://github.com/RimikoChu/gewulab/issues/6) |
| `force` | 力和运动 | 初中 · 八年级下册 力、运动和力 | 力的作用效果；牛顿第一定律；二力平衡；摩擦力 | 冰雪运动场：冰壶、雪橇 | [#7](https://github.com/RimikoChu/gewulab/issues/7) |
| `pressure` | 压强 | 初中 · 八年级下册 压强 | 压强、液体压强、大气压、流速与压强 | 水电站 | 已完成 |
| `float` | 浮力 | 初中 · 八年级下册 浮力 | 浮力、阿基米德原理、浮沉条件 | 造船厂 | 已完成 |
| `energy` | 功和机械能 | 初中 · 八年级下册 功和机械能 | 功、功率；动能和势能怎样转化 | 游乐园：过山车、蹦极 | [#8](https://github.com/RimikoChu/gewulab/issues/8) |
| `machine` | 简单机械 | 初中 · 八年级下册 简单机械 | 杠杆的平衡条件；滑轮；机械效率 | 建筑工地：塔吊、撬棍、滑轮组 | [#9](https://github.com/RimikoChu/gewulab/issues/9) |
| `heat` | 内能和热机 | 初中 · 九年级 内能、内能的利用 | 分子热运动；比热容；热机的四个冲程 | 汽车发动机厂 | [#10](https://github.com/RimikoChu/gewulab/issues/10) |
| `circuit` | 电路 | 初中 · 九年级 电流和电路、电压 电阻 | 串联和并联；电流、电压、电阻怎样测 | 一栋正在装修的房子 | [#11](https://github.com/RimikoChu/gewulab/issues/11) |
| `ohm` | 欧姆定律 | 初中 · 九年级 欧姆定律 | 电流与电压、电阻的关系；伏安法测电阻 | 电子元件检测车间 | [#12](https://github.com/RimikoChu/gewulab/issues/12) |
| `power` | 电功率和生活用电 | 初中 · 九年级 电功率、生活用电 | 电能、电功率；焦耳定律；家庭电路和安全用电 | 一户人家和小区配电房 | [#13](https://github.com/RimikoChu/gewulab/issues/13) |
| `magnet` | 电与磁 | 初中 · 九年级 电与磁 | 磁场；电生磁；电动机和发电机 | 风力发电场 | [#14](https://github.com/RimikoChu/gewulab/issues/14) |

## 化学（11 间）

初中九间，高中两间。

| 目录名 | 实验室 | 学段 · 教材位置 | 想让学生弄懂什么 | 场景建议 | 议题 |
|---|---|---|---|---|---|
| `air` | 空气和氧气 | 初中 · 九年级上册 我们周围的空气 | 空气里有什么；氧气的性质和制法 | 空气分离厂 | [#15](https://github.com/RimikoChu/gewulab/issues/15) |
| `atom` | 分子和原子 | 初中 · 九年级上册 物质构成的奥秘 | 分子在运动、有间隔；原子的结构；元素 | 从一滴水一路放大到原子 | [#16](https://github.com/RimikoChu/gewulab/issues/16) |
| `water` | 水的净化和组成 | 初中 · 九年级上册 自然界的水 | 沉淀、过滤、吸附、消毒；电解水说明水的组成 | 自来水厂 | [#17](https://github.com/RimikoChu/gewulab/issues/17) |
| `mass` | 质量守恒定律 | 初中 · 九年级上册 化学方程式 | 反应前后质量为什么不变；怎样写化学方程式 | 化工厂的称量和反应车间 | [#18](https://github.com/RimikoChu/gewulab/issues/18) |
| `carbon` | 碳和二氧化碳 | 初中 · 九年级上册 碳和碳的氧化物 | 二氧化碳的制取和性质；一氧化碳；碳循环 | 汽水厂和温室 | [#19](https://github.com/RimikoChu/gewulab/issues/19) |
| `fire` | 燃烧和灭火 | 初中 · 九年级上册 燃料及其利用 | 燃烧的三个条件；灭火的原理 | 消防训练基地 | [#20](https://github.com/RimikoChu/gewulab/issues/20) |
| `metal` | 金属和炼铁 | 初中 · 九年级下册 金属和金属材料 | 金属的活动性顺序；铁的冶炼；锈蚀和防护 | 钢铁厂：高炉和轧钢线 | [#21](https://github.com/RimikoChu/gewulab/issues/21) |
| `solution` | 溶液 | 初中 · 九年级下册 溶液 | 溶解和结晶；溶解度曲线；溶质的质量分数 | 盐湖和盐场 | [#22](https://github.com/RimikoChu/gewulab/issues/22) |
| `acid` | 酸、碱和中和 | 初中 · 九年级下册 酸和碱 | 酸和碱的性质；pH；中和反应 | 污水处理厂 | [#23](https://github.com/RimikoChu/gewulab/issues/23) |
| `battery` | 原电池 | 高中 · 必修第二册 化学反应与能量 | 化学能怎样变成电能；电子和离子各往哪走 | 电池工厂 | [#24](https://github.com/RimikoChu/gewulab/issues/24) |
| `ammonia` | 合成氨工厂 | 高中 · 选择性必修 1 化学反应速率与化学平衡 | 化学平衡怎样移动；工业上为什么这样选条件 | 化肥厂 | [#25](https://github.com/RimikoChu/gewulab/issues/25) |

## 生物（9 间）

| 目录名 | 实验室 | 学段 · 教材位置 | 想让学生弄懂什么 | 场景建议 | 议题 |
|---|---|---|---|---|---|
| `cells` | 细胞 | 初中 · 七年级上册 细胞是生命活动的基本单位 | 显微镜怎样用；植物细胞和动物细胞的结构；细胞分裂 | 走进一个放大的细胞 | [#26](https://github.com/RimikoChu/gewulab/issues/26) |
| `leaf` | 光合作用和呼吸作用 | 初中 · 七年级上册 绿色植物与生物圈 | 一片叶子怎样制造有机物；光合作用和呼吸作用的关系 | 一座蔬菜大棚 | [#27](https://github.com/RimikoChu/gewulab/issues/27) |
| `plant` | 植物的一生 | 初中 · 七年级上册 被子植物的一生 | 种子萌发的条件；根的生长；开花和结果 | 一块试验田，从播种到收获 | [#28](https://github.com/RimikoChu/gewulab/issues/28) |
| `digest` | 消化和吸收 | 初中 · 七年级下册 人体的营养 | 食物在消化道里经历了什么；营养在哪里吸收 | 人体内部：沿消化道走一遍 | [#29](https://github.com/RimikoChu/gewulab/issues/29) |
| `breath` | 呼吸 | 初中 · 七年级下册 人体的呼吸 | 胸廓怎样带动吸气呼气；肺泡里怎样换气 | 人体内部：胸腔和肺 | [#30](https://github.com/RimikoChu/gewulab/issues/30) |
| `blood` | 血液循环 | 初中 · 七年级下册 人体内物质的运输 | 心脏怎样泵血；体循环和肺循环；血液在哪里换了气 | 人体内部：心脏和血管 | [#31](https://github.com/RimikoChu/gewulab/issues/31) |
| `nerve` | 神经调节 | 初中 · 七年级下册 人体生命活动的调节 | 反射和反射弧；眼和耳怎样感受刺激 | 人体内部：从指尖到大脑 | [#32](https://github.com/RimikoChu/gewulab/issues/32) |
| `gene` | 遗传和变异 | 初中 · 八年级下册 生物的遗传与变异 | 基因在亲子代之间怎样传递；显性和隐性；性别决定 | 一座豌豆试验园 | [#33](https://github.com/RimikoChu/gewulab/issues/33) |
| `eco` | 生态系统 | 初中 · 七年级上册 生物与环境 | 食物链和食物网；物质和能量怎样流动；生态平衡 | 一片草原，或一个湖泊 | [#34](https://github.com/RimikoChu/gewulab/issues/34) |

## 地理（8 间）

| 目录名 | 实验室 | 学段 · 教材位置 | 想让学生弄懂什么 | 场景建议 | 议题 |
|---|---|---|---|---|---|
| `globe` | 地球和经纬网 | 初中 · 七年级上册 地球和地图 | 经线、纬线；用经纬度定位；半球的划分 | 一艘远洋科考船和一只大地球仪 | [#35](https://github.com/RimikoChu/gewulab/issues/35) |
| `orbit` | 地球的运动 | 初中 · 七年级上册 地球和地图 | 自转和公转；昼夜、时差、四季、五带 | 太阳和地球 | [#36](https://github.com/RimikoChu/gewulab/issues/36) |
| `contour` | 等高线地形图 | 初中 · 七年级上册 地球和地图 | 等高线怎样表示地形；山峰、山脊、山谷、鞍部、陡崖 | 一座可以切片的山 | [#37](https://github.com/RimikoChu/gewulab/issues/37) |
| `plate` | 板块运动 | 初中 · 七年级上册 陆地和海洋 | 大陆漂移；板块怎样运动；火山和地震带 | 海底到高原的一条大剖面 | [#38](https://github.com/RimikoChu/gewulab/issues/38) |
| `climate` | 天气和气候 | 初中 · 七年级上册 天气与气候 | 气温和降水怎样量、怎样分布；影响气候的因素 | 一座气象站和一条跨越山脉的路线 | [#39](https://github.com/RimikoChu/gewulab/issues/39) |
| `watercycle` | 水循环 | 高中 · 必修第一册 地球上的水 | 水循环的环节；人类活动影响了哪一环 | 从海洋到雪山的一个流域 | [#40](https://github.com/RimikoChu/gewulab/issues/40) |
| `wind` | 热力环流和风 | 高中 · 必修第一册 地球上的大气 | 大气怎样受热；热力环流；海陆风、山谷风 | 一座海滨城市 | [#41](https://github.com/RimikoChu/gewulab/issues/41) |
| `quake` | 地震 | 高中 · 必修第一册 自然灾害 | 震级和烈度；地震波；预警；用地震波看地球内部 | 一次真实的地震 | [#42](https://github.com/RimikoChu/gewulab/issues/42) |

## 数学（6 间）

数学实验室的“动手”是量、拼、拖、数。场景可以是抽象的空间，但每一课仍然要有动作、读数和结论。

| 目录名 | 实验室 | 学段 · 教材位置 | 想让学生弄懂什么 | 场景建议 | 议题 |
|---|---|---|---|---|---|
| `pyth` | 勾股定理 | 初中 · 八年级下册 勾股定理 | 亲手拼出 a² + b² = c²；赵爽弦图；用它量距离 | 一块铺着方砖的广场 | [#43](https://github.com/RimikoChu/gewulab/issues/43) |
| `linear` | 一次函数 | 初中 · 八年级下册 一次函数 | 变量之间的对应；k 和 b 怎样决定一条直线 | 一条公路和沿途的里程、油量 | [#44](https://github.com/RimikoChu/gewulab/issues/44) |
| `quadratic` | 二次函数 | 初中 · 九年级上册 二次函数 | 抛物线的开口、顶点、对称轴；用它求最值 | 喷泉、投篮和一座拱桥 | [#45](https://github.com/RimikoChu/gewulab/issues/45) |
| `transform` | 图形的变换 | 初中 · 七至九年级 平移、轴对称、旋转 | 三种变换各保持了什么；怎样用它们设计图案 | 一间瓷砖和窗花的工坊 | [#46](https://github.com/RimikoChu/gewulab/issues/46) |
| `similar` | 相似和测量 | 初中 · 九年级下册 相似、锐角三角函数 | 相似三角形的比例；不上去也能量出旗杆和楼的高度 | 校园操场和一座塔 | [#47](https://github.com/RimikoChu/gewulab/issues/47) |
| `chance` | 概率 | 初中 · 九年级上册 概率初步 | 随机事件；做足够多次，频率稳定在概率附近 | 一间做抽样检验的工厂 | [#48](https://github.com/RimikoChu/gewulab/issues/48) |

## 合计

| 学科 | 间数 |
|---|---|
| 物理 | 16 |
| 化学 | 11 |
| 生物 | 9 |
| 地理 | 8 |
| 数学 | 6 |
| 合计 | 50 |

压强、浮力、地球的运动、光合作用和呼吸作用、水循环、细胞六间已完成。其余的都可以认领。

## 做的先后

没有硬性的顺序，认领什么做什么。几点建议：

- 物理已经有两间参考实现，同一册的“力和运动”“功和机械能”“简单机械”最容易照着做。
- 地理已经有一间样板（地球的运动），生物有两间（光合作用和呼吸作用、细胞）。
- 化学、数学还没有样板，这两个学科第一个认领的人会和维护者一起把做法定下来。
