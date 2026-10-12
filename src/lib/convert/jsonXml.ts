// JSON ↔ XML 纯函数（无 DOM 依赖，可单测）。
// 使用 fast-xml-parser：保持属性（@_ 前缀）、解析 CDATA、处理数组。

import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  trimValues: false,
  parseTagValue: false,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: false,
});

/** JSON 文本 → XML 文本（尽力转换：对象→元素，数组→重复元素，@_ 前缀键→属性）。 */
export function jsonToXml(input: string): string {
  const obj = JSON.parse(input);
  const xml = builder.build(obj);
  return xml.trim();
}

/** XML 文本 → 美化 JSON 文本。 */
export function xmlToJson(input: string): string {
  const obj = parser.parse(input);
  return JSON.stringify(obj, null, 2);
}
