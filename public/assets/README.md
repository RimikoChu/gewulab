# 外部素材

## Poly Haven

来自 Poly Haven（https://polyhaven.com），CC0 许可，可商用、无需署名。

| 文件 | 来源 | 用途 |
| --- | --- | --- |
| env/sky_1k.hdr | HDRI「qwantani_late_afternoon_puresky」1k | 各实验室共用的天空、环境光和反射 |
| tex/concrete_diff.jpg、tex/concrete_nor.jpg、tex/concrete_rough.jpg | 贴图「concrete_floor_worn_001」1k（颜色、法线、粗糙度） | 各实验室的混凝土：地面、墙面、坝体、混凝土块 |

## NASA

NASA 的地球影像，公有领域（美国政府作品，不受版权限制，可自由使用和再分发；不是 CC0，但效果相同）。原图取自维基共享资源上的副本，缩到 4096×2048 后重新打包。

| 文件 | 来源 | 用途 |
| --- | --- | --- |
| tex/earth_day.jpg | NASA Blue Marble（2002）无云的陆地、海洋、海冰合成图，共享资源文件 `Nasa_land_ocean_ice_8192.jpg` | 地球的运动：地球白天的样子 |
| tex/earth_aux.jpg | 三个通道各放一样东西。红：云，由 Blue Marble 带云的那张（`Land_ocean_ice_cloud_hires.jpg`）减去无云的那张得到；绿：海面范围，从无云图按颜色分出来；蓝：夜晚灯光，取自 NASA/NOAA DMSP 1994–1995 城市灯光图（`Earth's City Lights by DMSP, 1994-1995 (large).jpg`） | 地球的运动：云、海面反光、夜晚的城市灯光 |

新增素材时，每个文件都要在这张表里写明文件名、来源和许可。`npm run check:labs` 会逐个核对。

## site/

| 文件 | 来源 | 许可 |
|---|---|---|
| `site/wechat.png` | 项目维护者自己的微信二维码，首页底部的联系方式用 | 维护者本人提供；不是可以再分发的素材，别的站点不要用 |
