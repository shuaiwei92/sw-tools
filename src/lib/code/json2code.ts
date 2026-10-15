// JSON → 各语言实体/接口定义生成器（纯函数，零依赖）。

export type TargetLang = 'typescript' | 'go' | 'java' | 'csharp' | 'python';

export interface Json2CodeOptions {
  lang: TargetLang;
  /** 根类型名，默认 Root */
  rootName?: string;
}

export interface Json2CodeResult {
  code: string;
  error?: string;
}

/* ---------- 类型模型 ---------- */

type TypeRef =
  | { kind: 'primitive'; name: string }
  | { kind: 'array'; of: TypeRef }
  | { kind: 'object'; name: string }
  | { kind: 'union'; of: TypeRef[] }
  | { kind: 'any' };

interface ObjectDef {
  name: string;
  fields: { key: string; type: TypeRef; optional: boolean }[];
}

const defs: ObjectDef[] = [];
const defsByName = new Map<string, ObjectDef>();

function reset() {
  defs.length = 0;
  defsByName.clear();
}

/** 把任意字符串转 PascalCase（保留数字，去掉分隔符）。 */
export function pascalCase(s: string): string {
  const parts = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (!parts.length) return 'Item';
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join('');
}

function camelCase(s: string): string {
  const p = pascalCase(s);
  return p[0].toLowerCase() + p.slice(1);
}

function snakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function singularize(s: string): string {
  if (/ies$/i.test(s)) return s.replace(/ies$/i, 'y');
  if (/(ses|xes|zes|ches|shes)$/i.test(s)) return s.replace(/es$/i, '');
  if (/s$/i.test(s) && !/ss$/i.test(s)) return s.replace(/s$/i, '');
  return s;
}

/** 分配不重名的类型名。 */
function uniqueName(base: string): string {
  let name = base || 'Item';
  let i = 2;
  while (defsByName.has(name)) {
    name = `${base}${i++}`;
  }
  return name;
}

function sameType(a: TypeRef, b: TypeRef): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'primitive':
      return a.name === (b as { name: string }).name;
    case 'object':
      return a.name === (b as { name: string }).name;
    case 'array':
      return sameType(a.of, (b as { of: TypeRef }).of);
    case 'union':
      return a.of.length === (b as { of: TypeRef[] }).of.length;
    default:
      return true;
  }
}

function dedupeUnion(of: TypeRef[]): TypeRef[] {
  const out: TypeRef[] = [];
  for (const t of of) {
    if (t.kind === 'union') {
      for (const inner of dedupeUnion(t.of)) {
        if (!out.some((x) => sameType(x, inner))) out.push(inner);
      }
    } else if (!out.some((x) => sameType(x, t))) {
      out.push(t);
    }
  }
  return out;
}

function typeOf(value: unknown, hint: string): TypeRef {
  if (value === null || value === undefined) return { kind: 'any' };
  if (Array.isArray(value)) {
    const elemTypes = dedupeUnion(value.map((v) => typeOf(v, singularize(hint))));
    const of: TypeRef =
      elemTypes.length === 0
        ? { kind: 'any' }
        : elemTypes.length === 1
          ? elemTypes[0]
          : { kind: 'union', of: elemTypes };
    return { kind: 'array', of };
  }
  if (typeof value === 'object') {
    const name = uniqueName(pascalCase(hint));
    const def: ObjectDef = { name, fields: [] };
    defs.push(def);
    defsByName.set(name, def);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      def.fields.push({ key: k, type: typeOf(v, k), optional: v === null || v === undefined });
    }
    return { kind: 'object', name };
  }
  if (typeof value === 'number') {
    return { kind: 'primitive', name: Number.isInteger(value) ? 'int' : 'float' };
  }
  if (typeof value === 'boolean') return { kind: 'primitive', name: 'bool' };
  return { kind: 'primitive', name: 'string' };
}

/* ---------- 各语言渲染 ---------- */

function tsType(t: TypeRef): string {
  switch (t.kind) {
    case 'primitive':
      return t.name === 'int' || t.name === 'float' ? 'number' : t.name === 'bool' ? 'boolean' : 'string';
    case 'array':
      return `${tsType(t.of)}[]`;
    case 'object':
      return t.name;
    case 'union':
      return t.of.map(tsType).join(' | ');
    default:
      return 'unknown';
  }
}

function goType(t: TypeRef): string {
  switch (t.kind) {
    case 'primitive':
      return t.name === 'int' ? 'int64' : t.name === 'float' ? 'float64' : t.name === 'bool' ? 'bool' : 'string';
    case 'array':
      return `[]${goType(t.of)}`;
    case 'object':
      return `*${t.name}`;
    case 'union':
      return 'interface{}';
    default:
      return 'interface{}';
  }
}

function javaType(t: TypeRef): string {
  switch (t.kind) {
    case 'primitive':
      return t.name === 'int' ? 'Long' : t.name === 'float' ? 'Double' : t.name === 'bool' ? 'Boolean' : 'String';
    case 'array':
      return `List<${javaType(t.of)}>`;
    case 'object':
      return t.name;
    case 'union':
      return 'Object';
    default:
      return 'Object';
  }
}

function csType(t: TypeRef): string {
  switch (t.kind) {
    case 'primitive':
      return t.name === 'int' ? 'long' : t.name === 'float' ? 'double' : t.name === 'bool' ? 'bool' : 'string';
    case 'array':
      return `List<${csType(t.of)}>`;
    case 'object':
      return t.name;
    case 'union':
      return 'object';
    default:
      return 'object';
  }
}

function pyType(t: TypeRef): string {
  switch (t.kind) {
    case 'primitive':
      return t.name === 'int' ? 'int' : t.name === 'float' ? 'float' : t.name === 'bool' ? 'bool' : 'str';
    case 'array':
      return `List[${pyType(t.of)}]`;
    case 'object':
      return t.name;
    case 'union':
      return t.of.map(pyType).join(' | ');
    default:
      return 'Any';
  }
}

function render(lang: TargetLang): string {
  const out: string[] = [];
  const ordered = defs; // 生成顺序即依赖顺序（子类型先出现）
  if (lang === 'typescript') {
    for (const d of ordered) {
      out.push(`export interface ${d.name} {`);
      for (const f of d.fields) {
        const opt = f.optional ? '?' : '';
        out.push(`  ${f.key}${opt}: ${tsType(f.type)};`);
      }
      out.push('}');
    }
  } else if (lang === 'go') {
    for (const d of ordered) {
      out.push(`type ${d.name} struct {`);
      for (const f of d.fields) {
        const fieldName = pascalCase(f.key);
        const omit = f.optional ? ',omitempty' : '';
        out.push(`\t${fieldName} ${goType(f.type)} \`json:"${f.key}${omit}"\``);
      }
      out.push('}');
    }
  } else if (lang === 'java') {
    out.push('import java.util.List;', '');
    for (const d of ordered) {
      out.push(`public class ${d.name} {`);
      for (const f of d.fields) {
        out.push(`  private ${javaType(f.type)} ${camelCase(f.key)};`);
      }
      out.push('}');
    }
  } else if (lang === 'csharp') {
    out.push('using System.Collections.Generic;', '');
    for (const d of ordered) {
      out.push(`public class ${d.name} {`);
      for (const f of d.fields) {
        out.push(`  public ${csType(f.type)} ${pascalCase(f.key)} { get; set; }`);
      }
      out.push('}');
    }
  } else {
    out.push('from dataclasses import dataclass, field', 'from typing import Any, List, Optional, Union', '');
    for (const d of ordered) {
      const hasOptional = d.fields.some((f) => f.optional);
      out.push(`@dataclass${hasOptional ? '' : ''}`);
      out.push(`class ${d.name}:`);
      if (!d.fields.length) {
        out.push('  pass');
      }
      for (const f of d.fields) {
        const opt = f.optional ? ' = None' : '';
        out.push(`  ${snakeCase(f.key)}: ${pyType(f.type)}${opt}`);
      }
      out.push('');
    }
    // 去掉末尾空行
    while (out.length && out[out.length - 1] === '') out.pop();
  }
  return out.join('\n');
}

/** JSON 文本 → 目标语言代码。解析失败时返回 { error }。 */
export function jsonToCode(input: string, opts: Json2CodeOptions): Json2CodeResult {
  reset();
  const rootName = opts.rootName?.trim() || 'Root';
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (e) {
    return { code: '', error: `JSON 解析失败：${(e as Error).message}` };
  }
  typeOf(value, rootName);
  return { code: render(opts.lang) };
}
