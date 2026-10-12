import { encodeBase64, decodeBase64, looksLikeBase64 } from './src/lib/codec/base64.ts';
import { writeFileSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(cond: boolean, name: string) { if (cond) { pass++; } else { fail++; writeFileSync('_smoke_result.txt', `FAIL: ${name}\n`, { flag: 'a', encoding: 'utf8' }); } }

// ---- 本次新增的「自动识别方向」判定逻辑（与页面内 detectDir 保持一致）----
function yamlDetect(t: string): string { t = t.trim(); if (/^[\{\[]/.test(t)) { try { JSON.parse(t); return 'json2yaml'; } catch {} } return 'yaml2json'; }
ok(yamlDetect('{"a":1}') === 'json2yaml', 'yaml auto json->yaml');
ok(yamlDetect('a: 1') === 'yaml2json', 'yaml auto yaml->json');

function xmlDetect(t: string): string { t = t.trim(); if (/^\s*</.test(t)) return 'xml2json'; return 'json2xml'; }
ok(xmlDetect('<a/>') === 'xml2json', 'xml auto xml->json');
ok(xmlDetect('{"a":1}') === 'json2xml', 'xml auto json->xml');

function csvDetect(t: string): string { t = t.trim(); if (/^\[/.test(t)) { try { const v = JSON.parse(t); if (Array.isArray(v)) return 'json2csv'; } catch {} } return 'csv2json'; }
ok(csvDetect('[{"a":1}]') === 'json2csv', 'csv auto json->csv');
ok(csvDetect('a,b\n1,2') === 'csv2json', 'csv auto csv->json');

function b64Detect(t: string): string { return looksLikeBase64(t) ? 'decode' : 'encode'; }
ok(b64Detect('SGVsbG8=') === 'decode', 'b64 auto decode');
ok(b64Detect('Hello') === 'encode', 'b64 auto encode');

function tsDetect(t: string): string { t = t.trim(); if (/^\d{9,13}$/.test(t)) return 'ts2date'; return 'date2ts'; }
ok(tsDetect('1634567890') === 'ts2date', 'ts auto ts->date');
ok(tsDetect('2021-10-18 11:18:10') === 'date2ts', 'ts auto date->ts');

// ---- looksLikeBase64 边界（避免把普通英文词误判）----
ok(looksLikeBase64('Hello, sw-tools') === false, 'b64 not false-positive');
ok(looksLikeBase64('SGVsbG8=') === true, 'b64 pad true');
ok(looksLikeBase64('YWJjMTIzNDU2') === true, 'b64 no-pad true');

// ---- Base64 UTF-8 往返（Phase 1 已验证，这里复测一次保底）----
const b = 'Hello, sw-tools! 你好，世界';
ok(decodeBase64(encodeBase64(b)) === b, 'base64 roundtrip utf8');

writeFileSync('_smoke_result.txt', `PASS=${pass} FAIL=${fail}\n`, { flag: 'a', encoding: 'utf8' });
