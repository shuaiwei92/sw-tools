// JSON ↔ YAML 纯函数（无 DOM 依赖，可单测）。
// 浏览器端由 Astro/Vite 打包 yaml 库，无需服务端。

import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

/** JSON 文本 → YAML 文本。输入非法 JSON 时抛错。 */
export function jsonToYaml(input: string): string {
  const obj = JSON.parse(input);
  return yamlStringify(obj);
}

/** YAML 文本 → 美化 JSON 文本。输入非法 YAML 时抛错。 */
export function yamlToJson(input: string): string {
  const obj = yamlParse(input);
  return JSON.stringify(obj, null, 2);
}
