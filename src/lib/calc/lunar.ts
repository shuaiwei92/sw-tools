// 纯本地农历（老黄历基础信息）转换：公历 1900-01-31 ~ 2100-12-31，无任何网络请求。
// 数据采用经典农历信息表（1900-2100，201 项，与主流开源实现一致）：
//   每年一个整数编码 —— 低 4 位（& 0xf）为闰月月份（0 表示无闰月）；
//   bit4 ~ bit15 依次为正月 ~ 腊月大小月（1 = 30 天，0 = 29 天）；
//   bit16（& 0x10000）为闰月大小（1 = 30 天，0 = 29 天）。
// 解码规则与 vsme/chinese-days 等开源实现保持一致，已用春节 / 中秋 / 端午等已知节日基准验证。

const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520, // 2100
];

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '腊'];

/** 农历年 y 的闰月月份（1-12），无闰月返回 0。 */
function leapMonth(year: number): number {
  return LUNAR_INFO[year - MIN_YEAR] & 0xf;
}

/** 农历年 y 第 m 个月（1-12）的天数。 */
function monthDays(year: number, month: number): number {
  return LUNAR_INFO[year - MIN_YEAR] & (0x10000 >> month) ? 30 : 29;
}

/** 农历年 y 闰月的天数（无闰月返回 0）；大小由 bit16 单独编码。 */
function leapDays(year: number): number {
  return leapMonth(year) ? (LUNAR_INFO[year - MIN_YEAR] & 0x10000 ? 30 : 29) : 0;
}

/** 农历年 y 的总天数。 */
function lunarYearDays(year: number): number {
  let sum = 0;
  for (let m = 1; m <= 12; m++) sum += monthDays(year, m);
  return sum + leapDays(year);
}

/** 农历日名称：初一…初十 / 十一…十九 / 二十 / 廿一…廿九 / 三十 */
export function lunarDayName(day: number): string {
  const tens = ['初', '十', '廿', '卅'];
  const ones = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (day === 10) return '初十';
  if (day === 20) return '二十';
  if (day === 30) return '三十';
  return tens[Math.floor((day - 1) / 10)] + ones[day % 10];
}

export interface LunarDate {
  /** 农历年（春节起算） */
  year: number;
  /** 农历月 1-12 */
  month: number;
  /** 农历日 1-30 */
  day: number;
  /** 是否闰月 */
  isLeap: boolean;
  /** 月名称，如「九月」「闰五月」 */
  monthName: string;
  /** 日名称，如「初四」 */
  dayName: string;
  /** 干支年，如「丙午」 */
  ganzhiYear: string;
  /** 生肖，如「马」 */
  zodiac: string;
  /** 完整短文本，如「丙午年 九月初四」 */
  text: string;
}

/** 公历转农历；超出 1900-2100 范围或早于 1900-01-31 返回 null。 */
export function solarToLunar(y: number, m: number, d: number): LunarDate | null {
  if (y < MIN_YEAR || y > MAX_YEAR || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const base = Date.UTC(1900, 0, 31); // 农历 1900 年正月初一
  let offset = Math.round((Date.UTC(y, m - 1, d) - base) / 86400000);
  if (offset < 0) return null;

  let year = MIN_YEAR;
  for (; year <= MAX_YEAR; year++) {
    const yd = lunarYearDays(year);
    if (offset < yd) break;
    offset -= yd;
  }
  if (year > MAX_YEAR) return null;

  const lm = leapMonth(year);
  let month = 0;
  let isLeap = false;
  for (let i = 1; i <= 12 && offset >= 0; i++) {
    const md = monthDays(year, i);
    if (offset < md) {
      month = i;
      isLeap = false;
      break;
    }
    offset -= md;
    if (lm === i) {
      const ld = leapDays(year);
      if (offset < ld) {
        month = i;
        isLeap = true;
        break;
      }
      offset -= ld;
    }
  }
  if (month === 0) return null;
  const day = offset + 1;

  const zi = (year - 4) % 12;
  const ganzhiYear = TIANGAN[((year - 4) % 10 + 10) % 10] + DIZHI[zi];
  const monthName = (isLeap ? '闰' : '') + LUNAR_MONTHS[month - 1] + '月';
  const dayName = lunarDayName(day);
  return {
    year,
    month,
    day,
    isLeap,
    monthName,
    dayName,
    ganzhiYear,
    zodiac: ZODIAC[zi],
    text: `${ganzhiYear}年 ${monthName}${dayName}`,
  };
}

/** 该农历年是否含闰月（含闰月时返回闰月月份名，否则返回空串）。 */
export function leapMonthLabel(year: number): string {
  if (year < MIN_YEAR || year > MAX_YEAR) return '';
  const lm = leapMonth(year);
  return lm > 0 ? `闰${LUNAR_MONTHS[lm - 1]}月` : '';
}

/** 公历星座（仅按月日）。 */
export function zodiacSign(m: number, d: number): string {
  const signs = ['水瓶', '双鱼', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯'];
  const cut = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22]; // 每月切换日
  const idx = d < cut[m - 1] ? (m + 10) % 12 : m - 1;
  return signs[idx] + '座';
}
