// 词频统计：中英文混合分词（英文按单词、中文按单字），停用词过滤，TOP N + 占比。

export interface FreqItem {
  word: string;
  count: number;
  /** 占比（0~100，保留 1 位小数） */
  percent: number;
}

export interface FreqResult {
  items: FreqItem[];
  /** 参与统计的词次总数（不含停用词） */
  total: number;
  /** 去重后的词数 */
  unique: number;
}

/** 中文停用词（单字高频虚词，统计时意义不大）。 */
const CN_STOP = new Set(
  '的了是在我和就不有都人一上也很到说要去你会着没有看好自己这那它们吧呢啊吗与以及被把对于让从向其中或者还是但是这个如果因为所以虽然但是而且并又也很太更最将将会了着过地得所为于以其之'.split('')
);

/** 英文停用词。 */
const EN_STOP = new Set(
  `the a an and or of to in on at is are was were be been being for with as by it its this that these those
   i you he she we they me him her us them my your his their our not no yes do does did done have has had will would can could shall should may might must`
    .split(/\s+/)
    .filter(Boolean)
);

/** 中英文混合分词（按原文顺序）：英文单词（含数字与内部连字符）/ 中文单字。 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = /[A-Za-z][A-Za-z'-]*|\d+(?:\.\d+)?|[\u4e00-\u9fff]/g;
  for (const m of text.matchAll(re)) {
    tokens.push(m[0].toLowerCase());
  }
  return tokens;
}

export function isStopWord(word: string): boolean {
  if (/[\u4e00-\u9fff]/.test(word)) return CN_STOP.has(word);
  return EN_STOP.has(word);
}

export function wordFrequency(text: string, topN = 50, filterStop = true): FreqResult {
  const tokens = tokenize(text).filter((t) => (filterStop ? !isStopWord(t) : true));
  const counter = new Map<string, number>();
  for (const t of tokens) counter.set(t, (counter.get(t) ?? 0) + 1);
  const total = tokens.length;
  const sorted = [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN);
  return {
    items: sorted.map(([word, count]) => ({
      word,
      count,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0,
    })),
    total,
    unique: counter.size,
  };
}
