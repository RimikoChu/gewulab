// 几处机位和舞台设置：船头看海、地球仪大厅、驾驶台、海图桌、夜里的罗经甲板。各课从这里取，换课时镜头飞过去。
import * as THREE from 'three'
import { GH } from './globe'
import { ST } from './world'

const G = ST.globe
/** 地球仪大厅：自己打光，摄影棚式的环境光，舷窗外还看得见天 */
export const INDOOR = { studio: true, env: 0.55, sun: 0, fog: [60, 900] as [number, number] }
/** 地球仪的几个机位：target、span、view */
export const GLOBE_VIEWS = {
  whole: { target: new THREE.Vector3(G.x, G.y + 1.1, G.z), span: [2.7, 2.5] as [number, number], view: [0.2, 0.17] as [number, number] },
  lat: { target: new THREE.Vector3(G.x, G.y + GH, G.z), span: [1.6, 1.6] as [number, number], view: [-0.12, 0.34] as [number, number] },
  lon: { target: new THREE.Vector3(G.x, G.y + GH, G.z), span: [1.55, 1.55] as [number, number], view: [0.0, 0.06] as [number, number] },
  hemi: { target: new THREE.Vector3(G.x, G.y + GH - 0.05, G.z), span: [1.9, 1.75] as [number, number], view: [0.42, 0.16] as [number, number] },
  close: { target: new THREE.Vector3(G.x, G.y + GH + 0.2, G.z), span: [1.25, 1.2] as [number, number], view: [-0.3, 0.5] as [number, number] },
}
