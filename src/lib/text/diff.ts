// 文本对比：行级 LCS diff，输出统一视图行与统计。无 DOM 依赖，可单测。

export type DiffRowType = 'same' | 'add' | 'del';

export interface DiffRow {
  type: DiffRowType;
  text: string;
  /** 在原文中的行号（add 行为空） */
  oldNo?: number;
  /** 在新文中的行号（del 行为空） */
  newNo?: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  same: number;
}

/** 行数安全上限：超过则退化为整体替换，避免 DP 表过大。 */
const MAX_LINES = 2000;

/**
 * 对比两段文本（按行）。ignoreWs 为 true 时忽略行首尾空白再比较。
 */
export function diffLines(a: string, b: string, ignoreWs = false): DiffRow[] {
  const norm = (s: string) => (ignoreWs ? s.trim() : s);
  const oldLines = a.split(/\r?\n/);
  const newLines = b.split(/\r?\n/);

  if (oldLines.length > MAX_LINES || newLines.length > MAX_LINES) {
    return [
      ...oldLines.map((text, i) => ({ type: 'del' as const, text, oldNo: i + 1 })),
      ...newLines.map((text, i) => ({ type: 'add' as const, text, newNo: i + 1 })),
    ];
  }

  const n = oldLines.length;
  const m = newLines.length;
  // LCS 长度表（滚动二维，Uint16 足够：行数上限 2000 < 65535）
  const dp = new Uint16Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[at(i, j)] =
        norm(oldLines[i]) === norm(newLines[j])
          ? dp[at(i + 1, j + 1)] + 1
          : Math.max(dp[at(i + 1, j)], dp[at(i, j + 1)]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(oldLines[i]) === norm(newLines[j])) {
      rows.push({ type: 'same', text: oldLines[i], oldNo: i + 1, newNo: j + 1 });
      i++;
      j++;
    } else if (dp[at(i + 1, j)] >= dp[at(i, j + 1)]) {
      rows.push({ type: 'del', text: oldLines[i], oldNo: i + 1 });
      i++;
    } else {
      rows.push({ type: 'add', text: newLines[j], newNo: j + 1 });
      j++;
    }
  }
  while (i < n) {
    rows.push({ type: 'del', text: oldLines[i], oldNo: i + 1 });
    i++;
  }
  while (j < m) {
    rows.push({ type: 'add', text: newLines[j], newNo: j + 1 });
    j++;
  }
  return rows;
}

export function diffStats(rows: DiffRow[]): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, same: 0 };
  for (const r of rows) {
    if (r.type === 'add') stats.added++;
    else if (r.type === 'del') stats.removed++;
    else stats.same++;
  }
  return stats;
}

/** 把 diff 行合并为「上下文 + 变更块」的片段，便于只展示差异附近。 */
export interface DiffHunk {
  rows: DiffRow[];
}

export function toHunks(rows: DiffRow[], context = 3): DiffHunk[] {
  const changeIdx: number[] = [];
  rows.forEach((r, idx) => {
    if (r.type !== 'same') changeIdx.push(idx);
  });
  if (!changeIdx.length) return [{ rows }];

  const ranges: [number, number][] = [];
  for (const idx of changeIdx) {
    const start = Math.max(0, idx - context);
    const end = Math.min(rows.length - 1, idx + context);
    if (ranges.length && start <= ranges[ranges.length - 1][1] + 1) {
      ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], end);
    } else {
      ranges.push([start, end]);
    }
  }
  return ranges.map(([s, e]) => ({ rows: rows.slice(s, e + 1) }));
}
