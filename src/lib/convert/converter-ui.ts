// 通用转换器 UI 控制器（客户端）。
// 与 Converter.astro 配套：绑定 示例/清空/复制/下载/失焦转换，可选只读树视图与 JSONPath 查询输入。
// 每个工具页只需传入 convert 函数 + 示例，无需重复工具栏逻辑。
// 方向型工具可额外提供 getDirection / detectDirection，并在下拉中放置「自动」选项实现自动识别方向。

import { renderReadOnlyTree } from './tree';

export interface ConverterOptions {
  /** 输入文本 -> 输出文本；抛错即视为失败（用于状态栏报错）。 */
  convert: (input: string, extra?: string) => string;
  /** 载入示例时填入输入框的文本。 */
  sample: string;
  /** 输出为 JSON 时启用只读树视图（默认 false）。 */
  outputJsonTree?: boolean;
  /** 是否提供 JSONPath 查询输入（默认 false）。若为 true，convert 的第二参为查询表达式。 */
  query?: boolean;
  /** 载入示例时填入查询框的文本（query 为 true 时生效）。 */
  querySample?: string;
  /** 输入失焦自动转换（默认 true）。 */
  autoConvert?: boolean;
  /** 下载文件名（不含扩展名，默认 result）。 */
  downloadName?: string;
  /** 下载文件扩展名（默认 txt）。 */
  downloadExt?: string;
  /** 存在方向切换时提供：返回当前方向标识（如 'json2yaml'）。 */
  getDirection?: () => string;
  /** 自动识别方向：给定输入文本返回应使用的方向标识（如 'json2yaml'）。需配合方向下拉中的「自动」选项（value="auto"）。 */
  detectDirection?: (input: string) => string;
  /** 方向相关示例：根据当前方向返回应载入输入框的示例文本（'auto' 或空串时返回默认示例）。 */
  sampleFor?: (dir: string) => string;
  /** 下载扩展名随状态变化（如双向转换时输出格式不同）时提供。 */
  getDownloadExt?: () => string;
  /** 方向标签映射，用于状态栏展示（如 { json2yaml: 'JSON → YAML' }）。 */
  directionLabels?: Record<string, string>;
}

export function setupConverter(opts: ConverterOptions): void {
  const input = document.getElementById('input') as HTMLTextAreaElement | null;
  const output = document.getElementById('output') as HTMLTextAreaElement | null;
  const statusEl = document.getElementById('status') as HTMLDivElement | null;
  const treePanel = document.getElementById('tree-panel') as HTMLDivElement | null;
  const queryInput = document.getElementById('query') as HTMLInputElement | null;
  const dirEl = document.getElementById('direction') as HTMLSelectElement | null;
  if (!input || !output || !statusEl) return;

  const useTree = !!opts.outputJsonTree && !!treePanel;
  let treeVisible = false;
  // 用户是否手动在下拉框选过方向：一旦手动选择，就停止自动识别，尊重用户意图
  let userPickedDirection = false;

  function describeDir(dir: string): string {
    return opts.directionLabels?.[dir] ?? dir;
  }

  function setStatus(msg: string, ok = true) {
    statusEl.textContent = msg;
    statusEl.className = `mt-1.5 h-5 shrink-0 text-sm lg:mb-1 ${
      ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
    }`;
  }

  function showOutputView() {
    if (!useTree) return;
    treePanel!.classList.add('hidden');
    output.classList.remove('hidden');
    treeVisible = false;
  }

  function showTreeView() {
    if (!useTree) return;
    output.classList.add('hidden');
    treePanel!.classList.remove('hidden');
    treeVisible = true;
  }

  function renderTreeFromOutput() {
    if (!useTree || !treeVisible) return;
    try {
      const data = JSON.parse(output.value);
      renderReadOnlyTree(treePanel!, data);
    } catch {
      // 输出非 JSON：退回原文视图
      showOutputView();
    }
  }

  function convertNow() {
    const text = input.value;
    const extra = opts.query && queryInput ? queryInput.value : undefined;
    if (!text.trim()) {
      output.value = '';
      if (treePanel) treePanel.innerHTML = '';
      setStatus('');
      return;
    }
    if (opts.query && !extra?.trim()) {
      setStatus('请输入 JSONPath 表达式', false);
      return;
    }
    // 自动识别方向：只要用户尚未手动选择方向，就每次按输入内容重新推断。
    // 关键点：旧逻辑会把推断结果写回下拉框导致 autoActive() 变 false，
    // 于是首次识别后下拉被锁定，后续换格式（如 JSON 换 XML）不再识别、反而用旧方向去 JSON.parse，报错“不是合法 JSON”。
    let usedAuto = false;
    let effectiveDir: string | undefined;
    if (dirEl && opts.detectDirection && (dirEl.value === 'auto' || !userPickedDirection)) {
      usedAuto = true;
      effectiveDir = opts.detectDirection(text);
      if (dirEl) dirEl.value = effectiveDir; // 仅用于回显推断结果，用户仍可手动覆盖
    } else {
      effectiveDir = dirEl?.value;
    }
    const okStatus = () =>
      usedAuto ? `✓ 转换成功 · 自动识别：${describeDir(effectiveDir!)}` : '✓ 转换成功';
    try {
      const result = opts.convert(text, extra);
      if (result && typeof (result as { then?: unknown }).then === 'function') {
        setStatus('计算中…');
        (result as Promise<string>).then(
          (r) => {
            output.value = r;
            if (useTree && treeVisible) renderTreeFromOutput();
            setStatus(okStatus());
          },
          (e) => setStatus('✗ ' + (e as Error).message, false)
        );
        return;
      }
      output.value = result;
      if (useTree && treeVisible) renderTreeFromOutput();
      setStatus(okStatus());
    } catch (e) {
      setStatus('✗ ' + (e as Error).message, false);
    }
  }

  function toggleTree() {
    if (!useTree) return;
    if (treeVisible) {
      if (!output.value) {
        setStatus('暂无输出内容', false);
        return;
      }
      showOutputView();
      setStatus('已切换到原文视图');
    } else {
      showTreeView();
      renderTreeFromOutput();
      setStatus('已切换到树视图');
    }
  }

  function download() {
    if (!output.value) {
      setStatus('暂无内容可下载', false);
      return;
    }
    const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${opts.downloadName ?? 'result'}.${opts.getDownloadExt?.() ?? opts.downloadExt ?? 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('已下载 ' + a.download);
  }

  function setAllNodes(open: boolean) {
    if (!useTree || !treePanel) return;
    if (!treeVisible) {
      setStatus('请先切换到树视图再展开 / 折叠', false);
      return;
    }
    treePanel.querySelectorAll('.tree-children').forEach((el) => {
      (el as HTMLElement).style.display = open ? '' : 'none';
    });
    setStatus(open ? '已展开全部节点' : '已折叠全部节点');
  }

  // 工具栏按钮（data-act）
  document.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = (btn as HTMLElement).dataset.act;
      switch (act) {
        case 'sample': {
          let s = opts.sample;
          if (opts.sampleFor) {
            const dir = dirEl && dirEl.value !== 'auto' ? (opts.getDirection?.() ?? '') : '';
            s = opts.sampleFor(dir);
          }
          input.value = s;
          if (opts.query && queryInput && opts.querySample) queryInput.value = opts.querySample;
          convertNow();
          setStatus('已载入示例');
          break;
        }
        case 'clear':
          input.value = '';
          output.value = '';
          if (treePanel) treePanel.innerHTML = '';
          if (queryInput) queryInput.value = '';
          setStatus('');
          input.focus();
          break;
        case 'copy':
          if (!output.value) {
            setStatus('暂无内容可复制', false);
            return;
          }
          navigator.clipboard.writeText(output.value).then(() => setStatus('已复制到剪贴板'));
          break;
        case 'download':
          download();
          break;
        case 'tree':
          toggleTree();
          break;
        case 'expand':
          setAllNodes(true);
          break;
        case 'collapse':
          setAllNodes(false);
          break;
      }
    });
  });

  // 输入失焦自动转换
  input.addEventListener('blur', () => {
    if (opts.autoConvert !== false) convertNow();
  });
  if (queryInput) {
    queryInput.addEventListener('input', () => {
      if (opts.autoConvert !== false) convertNow();
    });
  }
  // 方向切换：用户手动选择方向后，停止自动识别，尊重其选择
  if (dirEl) {
    dirEl.addEventListener('change', () => {
      userPickedDirection = true;
      if (input.value.trim()) convertNow();
    });
  }

  // Ctrl/Cmd + Enter 立即转换
  input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      convertNow();
    }
  });
}
