// 只读结构树渲染（供 Converter 的 JSON 输出使用，无编辑/历史，轻量）。
// 视觉与 formatter 的可编辑树保持一致：key #1d4ed8、值 #059669、容器数量黄色。

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}

function valueClass(value: unknown): string {
  if (value === null) return 'font-medium text-slate-500 dark:text-slate-400';
  switch (typeof value) {
    case 'string':
      return 'font-medium text-[#059669] dark:text-emerald-400';
    case 'number':
      return 'font-medium text-[#059669] dark:text-emerald-400';
    case 'boolean':
      return 'font-medium text-purple-600 dark:text-purple-400';
    default:
      return 'font-medium text-slate-600 dark:text-slate-300';
  }
}

function valueText(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value); // 字符串显示引号，类型更明确
  return String(value);
}

const ROW_CLS =
  'group flex flex-wrap items-center gap-1 rounded px-0.5 hover:bg-slate-100 dark:hover:bg-slate-800';

function buildNode(value: unknown, key: string, path: (string | number)[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'my-0.5';
  const isRoot = path.length === 0;

  if (value !== null && typeof value === 'object') {
    const isArr = Array.isArray(value);
    const entries: [string, unknown][] = isArr
      ? (value as unknown[]).map((v, i) => [String(i), v])
      : Object.entries(value as Record<string, unknown>);

    const row = document.createElement('div');
    row.className = ROW_CLS;
    if (!isRoot) {
      const k = document.createElement('span');
      k.className = 'font-semibold text-[#1d4ed8] dark:text-blue-400';
      k.textContent = key;
      row.appendChild(k);
      const colon = document.createElement('span');
      colon.className = 'text-slate-400';
      colon.textContent = ':';
      row.appendChild(colon);
    }
    const toggle = document.createElement('span');
    toggle.className = 'cursor-pointer select-none text-xs text-slate-500 dark:text-slate-400';
    toggle.textContent = '▼';
    const bracket = document.createElement('span');
    bracket.className = 'cursor-pointer select-none';
    bracket.innerHTML = `<span class="font-semibold text-slate-600 dark:text-slate-300">${
      isArr ? '[' : '{'
    }</span> <span class="font-semibold text-yellow-700 dark:text-yellow-500">${
      entries.length
    }</span> <span class="text-[10px] text-slate-400">+</span> <span class="font-semibold text-slate-600 dark:text-slate-300">${
      isArr ? ']' : '}'
    }</span>`;

    const children = document.createElement('div');
    children.className = 'tree-children ml-4 border-l border-slate-200 pl-2 dark:border-slate-700';
    for (const [k, v] of entries) children.appendChild(buildNode(v, k, [...path, isArr ? Number(k) : k]));

    const doToggle = () => {
      const open = children.style.display !== 'none';
      children.style.display = open ? 'none' : '';
      toggle.textContent = open ? '▸' : '▼';
    };
    toggle.addEventListener('click', doToggle);
    bracket.addEventListener('click', doToggle);

    row.appendChild(toggle);
    row.appendChild(bracket);
    wrap.appendChild(row);
    wrap.appendChild(children);
  } else {
    const row = document.createElement('div');
    row.className = ROW_CLS;
    if (!isRoot) {
      const k = document.createElement('span');
      k.className = 'font-semibold text-[#1d4ed8] dark:text-blue-400';
      k.textContent = key;
      row.appendChild(k);
      const colon = document.createElement('span');
      colon.className = 'text-slate-400';
      colon.textContent = ':';
      row.appendChild(colon);
    }
    const val = document.createElement('span');
    val.className = valueClass(value);
    val.textContent = valueText(value);
    row.appendChild(val);
    wrap.appendChild(row);
  }
  return wrap;
}

/** 将任意 JSON 值渲染为只读折叠树到 container。 */
export function renderReadOnlyTree(container: HTMLElement, data: unknown): void {
  container.innerHTML = '';
  if (data === undefined) return;
  try {
    container.appendChild(buildNode(data, 'root', []));
  } catch {
    container.innerHTML = '<div class="text-slate-400">无法渲染树（数据结构异常）</div>';
  }
}
