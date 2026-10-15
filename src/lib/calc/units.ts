// 单位换算：常见物理量，温度单独处理

export interface UnitDef {
  id: string;
  name: string;
  factor: number; // 相对基准单位的换算系数
}
export interface UnitCategory {
  id: string;
  name: string;
  baseName: string;
  special?: 'temperature';
  units: UnitDef[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: '长度',
    baseName: '米 (m)',
    units: [
      { id: 'km', name: '千米 km', factor: 1000 },
      { id: 'm', name: '米 m', factor: 1 },
      { id: 'dm', name: '分米 dm', factor: 0.1 },
      { id: 'cm', name: '厘米 cm', factor: 0.01 },
      { id: 'mm', name: '毫米 mm', factor: 0.001 },
      { id: 'um', name: '微米 µm', factor: 1e-6 },
      { id: 'nmi', name: '海里 nmi', factor: 1852 },
      { id: 'mi', name: '英里 mi', factor: 1609.344 },
      { id: 'yd', name: '码 yd', factor: 0.9144 },
      { id: 'ft', name: '英尺 ft', factor: 0.3048 },
      { id: 'in', name: '英寸 in', factor: 0.0254 },
    ],
  },
  {
    id: 'mass',
    name: '质量',
    baseName: '千克 (kg)',
    units: [
      { id: 't', name: '吨 t', factor: 1000 },
      { id: 'kg', name: '千克 kg', factor: 1 },
      { id: 'g', name: '克 g', factor: 0.001 },
      { id: 'mg', name: '毫克 mg', factor: 1e-6 },
      { id: 'jin', name: '斤', factor: 0.5 },
      { id: 'liang', name: '两', factor: 0.05 },
      { id: 'lb', name: '磅 lb', factor: 0.45359237 },
      { id: 'oz', name: '盎司 oz', factor: 0.028349523125 },
    ],
  },
  {
    id: 'temperature',
    name: '温度',
    baseName: '摄氏度 (°C)',
    special: 'temperature',
    units: [
      { id: 'c', name: '摄氏度 °C', factor: 1 },
      { id: 'f', name: '华氏度 °F', factor: 1 },
      { id: 'k', name: '开尔文 K', factor: 1 },
    ],
  },
  {
    id: 'area',
    name: '面积',
    baseName: '平方米 (m²)',
    units: [
      { id: 'km2', name: '平方千米 km²', factor: 1e6 },
      { id: 'm2', name: '平方米 m²', factor: 1 },
      { id: 'dm2', name: '平方分米 dm²', factor: 0.01 },
      { id: 'cm2', name: '平方厘米 cm²', factor: 1e-4 },
      { id: 'mm2', name: '平方毫米 mm²', factor: 1e-6 },
      { id: 'ha', name: '公顷 ha', factor: 10000 },
      { id: 'mu', name: '亩', factor: 2000 / 3 },
      { id: 'ft2', name: '平方英尺 ft²', factor: 0.09290304 },
      { id: 'acre', name: '英亩 acre', factor: 4046.8564224 },
    ],
  },
  {
    id: 'volume',
    name: '体积',
    baseName: '升 (L)',
    units: [
      { id: 'm3', name: '立方米 m³', factor: 1000 },
      { id: 'L', name: '升 L', factor: 1 },
      { id: 'dL', name: '分升 dL', factor: 0.1 },
      { id: 'mL', name: '毫升 mL', factor: 0.001 },
      { id: 'cm3', name: '立方厘米 cm³', factor: 0.001 },
      { id: 'gal', name: '加仑(美) gal', factor: 3.785411784 },
      { id: 'galuk', name: '加仑(英) gal', factor: 4.54609 },
      { id: 'barrel', name: '桶(原油)', factor: 158.987294928 },
    ],
  },
  {
    id: 'speed',
    name: '速度',
    baseName: '米/秒 (m/s)',
    units: [
      { id: 'mps', name: '米/秒 m/s', factor: 1 },
      { id: 'kmh', name: '千米/时 km/h', factor: 1 / 3.6 },
      { id: 'mph', name: '英里/时 mph', factor: 0.44704 },
      { id: 'fps', name: '英尺/秒 ft/s', factor: 0.3048 },
      { id: 'knot', name: '节 knot', factor: 0.514444444 },
    ],
  },
  {
    id: 'time',
    name: '时间',
    baseName: '秒 (s)',
    units: [
      { id: 'ms', name: '毫秒 ms', factor: 0.001 },
      { id: 's', name: '秒 s', factor: 1 },
      { id: 'min', name: '分 min', factor: 60 },
      { id: 'h', name: '时 h', factor: 3600 },
      { id: 'day', name: '天 d', factor: 86400 },
      { id: 'week', name: '周', factor: 604800 },
      { id: 'year', name: '年(365d)', factor: 31536000 },
    ],
  },
  {
    id: 'data',
    name: '数据存储',
    baseName: '字节 (B)',
    units: [
      { id: 'bit', name: '比特 bit', factor: 0.125 },
      { id: 'B', name: '字节 B', factor: 1 },
      { id: 'KB', name: '千字节 KB', factor: 1024 },
      { id: 'MB', name: '兆字节 MB', factor: 1024 ** 2 },
      { id: 'GB', name: '吉字节 GB', factor: 1024 ** 3 },
      { id: 'TB', name: '太字节 TB', factor: 1024 ** 4 },
      { id: 'PB', name: '拍字节 PB', factor: 1024 ** 5 },
    ],
  },
  {
    id: 'pressure',
    name: '压力',
    baseName: '帕斯卡 (Pa)',
    units: [
      { id: 'Pa', name: '帕 Pa', factor: 1 },
      { id: 'kPa', name: '千帕 kPa', factor: 1000 },
      { id: 'MPa', name: '兆帕 MPa', factor: 1e6 },
      { id: 'bar', name: '巴 bar', factor: 1e5 },
      { id: 'atm', name: '标准大气压 atm', factor: 101325 },
      { id: 'psi', name: '磅力/英寸² psi', factor: 6894.757293168 },
      { id: 'mmHg', name: '毫米汞柱 mmHg', factor: 133.322387415 },
    ],
  },
  {
    id: 'energy',
    name: '能量',
    baseName: '焦耳 (J)',
    units: [
      { id: 'J', name: '焦耳 J', factor: 1 },
      { id: 'kJ', name: '千焦 kJ', factor: 1000 },
      { id: 'cal', name: '卡路里 cal', factor: 4.184 },
      { id: 'kcal', name: '千卡 kcal', factor: 4184 },
      { id: 'Wh', name: '瓦时 Wh', factor: 3600 },
      { id: 'kWh', name: '千瓦时 kWh', factor: 3.6e6 },
      { id: 'eV', name: '电子伏 eV', factor: 1.602176634e-19 },
    ],
  },
  {
    id: 'angle',
    name: '角度',
    baseName: '度 (°)',
    units: [
      { id: 'deg', name: '度 °', factor: 1 },
      { id: 'rad', name: '弧度 rad', factor: 180 / Math.PI },
      { id: 'grad', name: '梯度 grad', factor: 0.9 },
      { id: 'arcmin', name: '角分 ′', factor: 1 / 60 },
      { id: 'arcsec', name: '角秒 ″', factor: 1 / 3600 },
    ],
  },
  {
    id: 'power',
    name: '功率',
    baseName: '瓦特 (W)',
    units: [
      { id: 'W', name: '瓦 W', factor: 1 },
      { id: 'kW', name: '千瓦 kW', factor: 1000 },
      { id: 'MW', name: '兆瓦 MW', factor: 1e6 },
      { id: 'hp', name: '马力(英) hp', factor: 745.6998715823 },
      { id: 'ps', name: '公制马力 PS', factor: 735.49875 },
    ],
  },
  {
    id: 'fuel',
    name: '油耗',
    baseName: '升/100千米',
    units: [
      { id: 'l100', name: '升/100千米 L/100km', factor: 1 },
      { id: 'mpgus', name: '英里/加仑(美) mpg', factor: 235.214583333 },
      { id: 'mpguk', name: '英里/加仑(英) mpg', factor: 282.480936331 },
    ],
  },
];

export function convertUnit(catId: string, fromId: string, toId: string, value: number): number {
  const cat = UNIT_CATEGORIES.find((c) => c.id === catId);
  if (!cat) throw new Error('未知类别');
  if (cat.special === 'temperature') return convertTemperature(fromId, toId, value);
  const from = cat.units.find((u) => u.id === fromId);
  const to = cat.units.find((u) => u.id === toId);
  if (!from || !to) throw new Error('未知单位');
  const baseVal = value * from.factor;
  return baseVal / to.factor;
}

function convertTemperature(from: string, to: string, v: number): number {
  let c: number;
  if (from === 'c') c = v;
  else if (from === 'f') c = ((v - 32) * 5) / 9;
  else if (from === 'k') c = v - 273.15;
  else throw new Error('未知温度单位');
  if (to === 'c') return c;
  if (to === 'f') return (c * 9) / 5 + 32;
  if (to === 'k') return c + 273.15;
  throw new Error('未知温度单位');
}
