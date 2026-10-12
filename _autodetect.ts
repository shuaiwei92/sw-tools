import { writeFileSync } from 'node:fs';

async function main() {
  const { looksLikeBase64, encodeBase64, decodeBase64 } = await import('./src/lib/codec/base64.ts');
  const out: string[] = [];
  const ok = (c: boolean, m: string) => out.push((c ? 'PASS ' : 'FAIL ') + m);

  ok(looksLikeBase64('SGVsbG8sIHN3LXRvb2xz') === true, 'b64 std true');
  ok(looksLikeBase64('SGVsbG8=') === true, 'b64 pad true');
  ok(looksLikeBase64('a+b/cQ==') === true, 'b64 special true');
  ok(looksLikeBase64('Hello, sw-tools! ni hao') === false, 'b64 cn false');
  ok(looksLikeBase64('Hello World') === false, 'b64 space false');
  ok(looksLikeBase64('abcd') === false, 'b64 short false');
  ok(looksLikeBase64('thequickbrownfoxjump') === true, 'b64 long true');

  const txt = 'Hello, sw-tools! ni hao shi jie';
  const b64 = encodeBase64(txt);
  ok(decodeBase64(b64) === txt, 'b64 roundtrip');
  ok(looksLikeBase64(b64) === true, 'b64 encoded detect');

  const detectYaml = (i: string): string => { const t = i.trim(); if (!t) return 'json2yaml'; if (/^[\[{]/.test(t)) { try { JSON.parse(t); return 'json2yaml'; } catch {} } return 'yaml2json'; };
  const detectXml = (i: string): string => { const t = i.trim(); if (!t) return 'json2xml'; if (/^\s*</.test(t)) return 'xml2json'; return 'json2xml'; };
  const detectCsv = (i: string): string => { const t = i.trim(); if (!t) return 'json2csv'; if (/^\[/.test(t)) { try { const v = JSON.parse(t); if (Array.isArray(v)) return 'json2csv'; } catch {} } return 'csv2json'; };
  const detectTs = (i: string): string => { const t = i.trim(); if (!t) return 'ts2date'; if (/^\d{9,13}$/.test(t)) return 'ts2date'; return 'date2ts'; };

  ok(detectYaml('{"a":1}') === 'json2yaml', 'yaml obj');
  ok(detectYaml('a: 1\nb: 2') === 'yaml2json', 'yaml text');
  ok(detectYaml('["x","y"]') === 'json2yaml', 'yaml arr');
  ok(detectXml('<note>hi</note>') === 'xml2json', 'xml tag');
  ok(detectXml('{"note":"hi"}') === 'json2xml', 'xml obj');
  ok(detectCsv('[{"id":1},{"id":2}]') === 'json2csv', 'csv arr');
  ok(detectCsv('id,name\n1,Alice') === 'csv2json', 'csv head');
  ok(detectCsv('{"id":1}') === 'csv2json', 'csv obj');
  ok(detectTs('1634567890') === 'ts2date', 'ts 10');
  ok(detectTs('1634567890123') === 'ts2date', 'ts 13');
  ok(detectTs('2021-10-18 11:18:10') === 'date2ts', 'ts date');

  const summary = out.some((l) => l.startsWith('FAIL')) ? 'SOME_FAIL' : 'ALL_PASS';
  writeFileSync('_autodetect.out', out.join('\n') + '\n' + summary);
}

main().catch((e) => {
  writeFileSync('_autodetect.out', 'ERR: ' + (e && (e as Error).message ? (e as Error).message : String(e)));
});
