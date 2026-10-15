import { describe, it, expect } from 'vitest';
import { parseCurl, tokenize, toCode, type CurlRequest } from './curl';

function parse(s: string): CurlRequest {
  const r = parseCurl(s);
  expect(r).not.toBeNull();
  return r!;
}

describe('tokenize', () => {
  it('处理引号与转义', () => {
    expect(tokenize(`curl -H 'Content-Type: application/json' -d "{\\"a\\": 1}" https://x.com`)).toEqual([
      'curl',
      '-H',
      'Content-Type: application/json',
      '-d',
      '{"a": 1}',
      'https://x.com',
    ]);
  });

  it('合并续行', () => {
    expect(tokenize('curl \\\n  https://x.com \\\n  -sL')).toEqual(['curl', 'https://x.com', '-sL']);
  });

  it('未闭合引号返回 null', () => {
    expect(tokenize(`curl -d "abc`)).toBeNull();
    expect(tokenize(`curl -d 'abc`)).toBeNull();
  });
});

describe('parseCurl 基础', () => {
  it('最简单 GET', () => {
    const r = parse('curl https://api.example.com/users');
    expect(r.method).toBe('GET');
    expect(r.url).toBe('https://api.example.com/users');
    expect(r.headers).toEqual([]);
    expect(r.body).toBeUndefined();
    expect(r.warnings).toEqual([]);
  });

  it('POST + 请求头 + JSON body', () => {
    const r = parse(`curl -X POST -H 'Content-Type: application/json' -d '{"name":"sw","age":3}' https://api.example.com/users`);
    expect(r.method).toBe('POST');
    expect(r.headers).toEqual([['Content-Type', 'application/json']]);
    expect(r.body).toBe('{"name":"sw","age":3}');
  });

  it('多个 -d 用 & 连接', () => {
    const r = parse('curl -d a=1 -d b=2 https://x.com/api');
    expect(r.body).toBe('a=1&b=2');
    expect(r.method).toBe('POST');
  });

  it('无 URL 返回 null', () => {
    expect(parseCurl('curl -X POST')).toBeNull();
    expect(parseCurl('')).toBeNull();
    expect(parseCurl('   ')).toBeNull();
  });

  it('省略 curl 前缀也能解析', () => {
    const r = parse('https://x.com/a');
    expect(r.url).toBe('https://x.com/a');
  });
});

describe('parseCurl 进阶', () => {
  it('-G 把数据拼到查询串', () => {
    const r = parse('curl -G -d "q=go lang" -d "page=2" https://x.com/search');
    expect(r.method).toBe('GET');
    expect(r.url).toBe('https://x.com/search?q=go lang&page=2');
    expect(r.body).toBeUndefined();
  });

  it('-G 拼到已有查询串', () => {
    const r = parse('curl -G -d "b=2" "https://x.com/s?a=1"');
    expect(r.url).toBe('https://x.com/s?a=1&b=2');
  });

  it('--data-urlencode 两种形式', () => {
    expect(parse('curl --data-urlencode "hello world" https://x.com').body).toBe('hello%20world');
    expect(parse('curl --data-urlencode "name=你好" https://x.com').body).toBe('name=%E4%BD%A0%E5%A5%BD');
  });

  it('--json 自动补 Content-Type 与 POST', () => {
    const r = parse(`curl --json '{"ok":true}' https://x.com/api`);
    expect(r.method).toBe('POST');
    expect(r.headers).toContainEqual(['Content-Type', 'application/json']);
    expect(r.body).toBe('{"ok":true}');
  });

  it('认证 / UA / Referer / Cookie', () => {
    const r = parse('curl -u admin:123456 -A "MyApp/1.0" -e https://ref.com -b "sid=abc" https://x.com');
    expect(r.user).toBe('admin:123456');
    expect(r.userAgent).toBe('MyApp/1.0');
    expect(r.referer).toBe('https://ref.com');
    expect(r.cookie).toBe('sid=abc');
  });

  it('-I 为 HEAD；-k / -L / --compressed 标记', () => {
    const r = parse('curl -I -k -L --compressed https://x.com');
    expect(r.method).toBe('HEAD');
    expect(r.insecure).toBe(true);
    expect(r.followRedirects).toBe(true);
    expect(r.compressed).toBe(true);
  });

  it('合并短 flag -sL 与 -sXPOST', () => {
    expect(parse('curl -sL https://x.com').followRedirects).toBe(true);
    const r = parse('curl -sXPUT https://x.com');
    expect(r.method).toBe('PUT');
    expect(r.warnings).toEqual([]);
  });

  it('空值请求头表示删除该头', () => {
    const r = parse(`curl -H 'Accept: */*' -H 'Accept;' https://x.com`);
    expect(r.headers).toEqual([]);
  });

  it('不支持的能力进 warnings', () => {
    const r = parse('curl -o out.json --max-time 30 -F "file=@a.png" https://x.com/upload');
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
    expect(r.warnings.join(' ')).toContain('已忽略');
    expect(r.warnings.join(' ')).toContain('暂不支持');
  });

  it('--url 指定地址', () => {
    expect(parse('curl --url https://x.com/deep').url).toBe('https://x.com/deep');
  });

  it('-F 表单字段', () => {
    const r = parse(`curl -F 'name=sw' -F 'title=工具' https://x.com`);
    expect(r.form).toEqual([
      ['name', 'sw'],
      ['title', '工具'],
    ]);
  });
});

describe('toCode', () => {
  const req = parse(
    `curl -X POST -H 'Content-Type: application/json' -H 'X-Token: abc' -u admin:123456 --compressed -d '{"name":"sw","list":[1,2]}' https://api.example.com/v1/users`,
  );

  it('fetch', () => {
    const code = toCode(req, 'fetch');
    expect(code).toContain('method: "POST"');
    expect(code).toContain('"Content-Type": "application/json"');
    expect(code).toContain('"X-Token": "abc"');
    expect(code).toContain('"Accept-Encoding": "gzip, deflate"');
    expect(code).toContain('body: JSON.stringify({');
    expect(code).toContain('"name": "sw"');
    expect(code).toContain('fetch(url, options)');
  });

  it('axios', () => {
    const code = toCode(req, 'axios');
    expect(code).toContain('method: "post"');
    expect(code).toContain('username:');
    expect(code).toContain('password:');
    expect(code).toContain('data: {');
  });

  it('node', () => {
    const code = toCode(req, 'node');
    expect(code).toContain('(async () => {');
    expect(code).toContain('await fetch(url, {');
    expect(code).toContain('await res.text()');
  });

  it('python', () => {
    const code = toCode(req, 'python');
    expect(code).toContain('import requests');
    expect(code).toContain("requests.request('POST', url, headers=headers, data=data");
    expect(code).toContain("auth=('admin', '123456')");
    expect(code).toContain("data = '{\"name\":\"sw\",\"list\":[1,2]}'");
  });

  it('go', () => {
    const code = toCode(req, 'go');
    expect(code).toContain('package main');
    expect(code).toContain('http.NewRequest("POST", url, payload)');
    expect(code).toContain('req.Header.Set("Content-Type", "application/json")');
    expect(code).toContain('req.SetBasicAuth("admin", "123456")');
  });

  it('php', () => {
    const code = toCode(req, 'php');
    expect(code).toContain('<?php');
    expect(code).toContain("curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');");
    expect(code).toContain("curl_setopt($ch, CURLOPT_USERPWD, 'admin:123456');");
    expect(code).toContain("curl_setopt($ch, CURLOPT_ENCODING, '');");
  });

  it('GET 无 body 时不输出 body 行', () => {
    const get = parse('curl https://x.com/a');
    expect(toCode(get, 'fetch')).not.toContain('body:');
    expect(toCode(get, 'php')).not.toContain('CURLOPT_POSTFIELDS');
  });

  it('-k 生成关闭证书校验的代码', () => {
    const k = parse('curl -k https://x.com');
    expect(toCode(k, 'go')).toContain('InsecureSkipVerify: true');
    expect(toCode(k, 'php')).toContain('CURLOPT_SSL_VERIFYPEER, false');
    expect(toCode(k, 'python')).not.toContain('verify');
  });

  it('body 含引号时正确转义', () => {
    const q = parse(`curl -d "name=o'brien&x=\\"y\\"" https://x.com`);
    expect(q.body).toBe(`name=o'brien&x="y"`);
    const code = toCode(q, 'fetch');
    expect(code).toContain('body: ');
    expect(() => JSON.parse('[' + code.match(/body: (".*"),?\n/)![1] + ']')).not.toThrow();
  });

  it('表单字段走 FormData', () => {
    const f = parse('curl -F "name=sw" https://x.com');
    expect(toCode(f, 'fetch')).toContain('new FormData()');
    expect(toCode(f, 'fetch')).toContain('form.append("name", "sw")');
  });
});
