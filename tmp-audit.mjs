// 临时审计脚本：lib 导出函数在 src 其他文件中的使用情况
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, filter, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, filter, out);
    else if (filter(f)) out.push(p);
  }
  return out;
}

const srcFiles = walk('src', (f) => /\.(astro|ts|tsx)$/.test(f));
const texts = srcFiles.map((f) => ({ f, s: readFileSync(f, 'utf8') }));
const libs = walk('src/lib', (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

console.log('=== 1. 完全未被任何页面/组件 import 的 lib（潜在死代码或缺口） ===');
for (const f of libs) {
  const base = f.replace(/^src\/lib\//, '').replace(/\.ts$/, '');
  const usedBy = texts.filter((t) => t.f !== f && new RegExp(`from\\s+['\"][^'\"]*${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['\"]`).test(t.s));
  if (usedBy.length === 0) console.log(`  ★ ${base} —— 无任何 import`);
}

console.log('\n=== 2. lib 导出函数未被使用的（页面未暴露的能力） ===');
for (const f of libs) {
  const s = readFileSync(f, 'utf8');
  const names = [...s.matchAll(/^export (?:function|const|class) (\w+)/gm)].map((m) => m[1]);
  if (!names.length) continue;
  const others = texts.filter((t) => t.f !== f).map((t) => t.s).join('\n');
  const unused = names.filter((n) => !new RegExp(`[\\s,;{(\\[]${n}[\\s,;}) \\]]`).test(others));
  if (unused.length) console.log(`  ${f.replace('src/lib/', '')} → ${unused.join(', ')}`);
}

console.log('\n=== 3. tools.ts 已注册但页面缺失 / 有页面未注册 ===');
const toolsTs = readFileSync('src/lib/tools.ts', 'utf8');
const paths = [...toolsTs.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
const pageFiles = walk('src/pages', (f) => f.endsWith('.astro') && !f.endsWith('index.astro')).map((f) =>
  '/' + f.replace(/^src\/pages\//, '').replace(/\.astro$/, ''),
);
for (const p of paths) {
  if (!pageFiles.includes(p)) console.log(`  ★ 注册但缺页面: ${p}`);
}
for (const p of pageFiles) {
  if (!paths.includes(p)) console.log(`  ★ 有页面未注册: ${p}`);
}
console.log(`  注册 ${paths.length} 个，页面 ${pageFiles.length} 个`);
