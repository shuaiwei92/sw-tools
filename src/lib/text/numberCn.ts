// 数字转中文：人民币金额大写 + 普通中文读法（纯函数，零依赖）。

const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CN_UNITS = ['', '拾', '佰', '仟'];
const CN_BIG_UNITS = ['', '万', '亿', '万亿'];

const NUM_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const NUM_UNITS = ['', '十', '百', '千'];
const NUM_BIG_UNITS = ['', '万', '亿', '万亿'];

interface Rule {
  digits: string[];
  units: string[];
  bigUnits: string[];
  /** 普通读法中，最高位的「一十」省略为「十」（人民币大写不省略） */
  omitOneInTen?: boolean;
}

const UPPER: Rule = { digits: CN_DIGITS, units: CN_UNITS, bigUnits: CN_BIG_UNITS };
const PLAIN: Rule = {
  digits: NUM_DIGITS,
  units: NUM_UNITS,
  bigUnits: NUM_BIG_UNITS,
  omitOneInTen: true,
};

/** 把整数部分的数字串转成中文（支持 0 ~ 16 位，按 4 位分节）。 */
function integerToCn(intStr: string, rule: Rule): string {
  const n = intStr.replace(/^0+/, '') || '0';
  if (n === '0') return rule.digits[0];

  // 从右往左按 4 位分节
  const sections: string[] = [];
  for (let i = n.length; i > 0; i -= 4) {
    sections.unshift(n.slice(Math.max(0, i - 4), i));
  }

  let out = '';
  sections.forEach((sec, si) => {
    const big = rule.bigUnits[sections.length - 1 - si];
    let secStr = '';
    let zeroPending = false;
    for (let j = 0; j < sec.length; j++) {
      const d = Number(sec[j]);
      const unit = rule.units[sec.length - 1 - j];
      if (d === 0) {
        zeroPending = true;
        continue;
      }
      // 补零：前面有未输出的零，且（节内已有内容 或 整个数字已有更高位）
      if (zeroPending && (secStr || out)) secStr += rule.digits[0];
      zeroPending = false;
      // 「一十 / 一十五」在普通读法中省略为首的「一」
      const omitOne = rule.omitOneInTen && d === 1 && unit === rule.units[1] && j === 0 && !secStr && !out;
      secStr += omitOne ? unit : rule.digits[d] + unit;
    }
    // 整节为零：不输出任何内容（包括大单位与零）
    if (secStr) out += secStr + big;
  });
  return out;
}

/** 解析数字输入（支持千分位逗号），失败返回 null。 */
function parseAmount(input: string): number | null {
  const s = input.replace(/[,，\s]/g, '');
  if (!/^-?\d*(\.\d*)?$/.test(s) || s === '' || s === '.' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 普通中文读法，如 1234.5 → 一千二百三十四点五。 */
export function toChineseNumber(input: string): string {
  const n = parseAmount(input);
  if (n === null) return '';
  const neg = n < 0;
  const abs = Math.abs(n).toString();
  const [intPart, decPart] = abs.split('.');
  let out = integerToCn(intPart, PLAIN);
  if (decPart) {
    out += '点' + [...decPart].map((d) => NUM_DIGITS[Number(d)]).join('');
  }
  return neg ? '负' + out : out;
}

/** 人民币金额大写，如 1234.56 → 壹仟贰佰叁拾肆元伍角陆分。 */
export function toChineseUpper(input: string): string {
  const n = parseAmount(input);
  if (n === null) return '';
  const neg = n < 0;
  const abs = Math.abs(n);
  const [intPart] = abs.toString().split('.');
  const fen = Math.floor(abs * 100 + 0.5); // 分（四舍五入到分）
  const jiao = Math.floor(fen / 10) % 10;
  const fenDigit = fen % 10;

  const intCn = integerToCn(intPart, UPPER);
  const hasInt = intPart.replace(/^0+/, '') !== '';

  let out: string;
  if (jiao === 0 && fenDigit === 0) {
    // 无零头：X 元整（含 0 元）
    out = `${intCn}元整`;
  } else {
    out = hasInt ? intCn + '元' : '零元';
    // 角位为零但有分时补「零」
    if (jiao === 0) out += '零';
    if (jiao) out += CN_DIGITS[jiao] + '角';
    if (fenDigit) out += CN_DIGITS[fenDigit] + '分';
  }
  return neg ? '负' + out : out;
}
