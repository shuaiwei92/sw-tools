import { writeFileSync } from 'node:fs';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { JSONPath } from 'jsonpath-plus';

const lines = [];
try {
  const y = yamlStringify({ a: 1, b: { c: 'x' } });
  lines.push('YAML ok: ' + (JSON.parse(JSON.stringify(yamlParse(y))).a === 1));

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: '__cdata', trimValues: false, parseTagValue: false });
  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true, indentBy: '  ', suppressEmptyNode: false });
  const xml = builder.build({ note: { '@id': '1', to: 'Tove' } });
  const back = parser.parse(xml);
  lines.push('XML ok: ' + (back.note['@id'] === '1' && back.note.to === 'Tove'));

  const data = { store: { book: [ { title: 'A', price: 5 }, { title: 'B', price: 15 } ] } };
  const r = JSONPath({ path: '$.store.book[?(@.price < 10)].title', json: data, wrap: true });
  lines.push('JSONPath ok: ' + (Array.isArray(r) && r[0] === 'A'));
} catch (e) {
  lines.push('ERROR: ' + (e && e.stack || e));
}
writeFileSync('D:/Myproject/sw-tools/_smoke.out', lines.join('\n') + '\n');
