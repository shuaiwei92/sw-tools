import { describe, it, expect } from 'vitest';
import { parseUrl, urlSections } from './urlParse';

describe('parseUrl 基础拆解', () => {
  it('标准 https URL 各部件', () => {
    const p = parseUrl('https://example.com:8443/a/b/c?x=1&y=2#top')!;
    expect(p.protocol).toBe('https:');
    expect(p.host).toBe('example.com:8443');
    expect(p.hostname).toBe('example.com');
    expect(p.port).toBe('8443');
    expect(p.pathname).toBe('/a/b/c');
    expect(p.pathSegments).toEqual(['a', 'b', 'c']);
    expect(p.search).toBe('?x=1&y=2');
    expect(p.params).toEqual([
      { key: 'x', value: '1', wasEncoded: false },
      { key: 'y', value: '2', wasEncoded: false },
    ]);
    expect(p.hash).toBe('#top');
    expect(p.isHttps).toBe(true);
    expect(p.defaultPort).toBe('443');
  });
  it('无协议输入按 https 补全', () => {
    const p = parseUrl('example.com/path')!;
    expect(p.protocol).toBe('https:');
    expect(p.hostname).toBe('example.com');
    expect(p.pathname).toBe('/path');
  });
  it('尾斜杠与根路径', () => {
    expect(parseUrl('https://a.com/x/')!.pathSegments).toEqual(['x']);
    expect(parseUrl('https://a.com/')!.pathSegments).toEqual([]);
  });
  it('默认端口标注', () => {
    expect(parseUrl('http://a.com:80/')!.defaultPort).toBe('80');
    expect(parseUrl('https://a.com/')!.defaultPort).toBe('443');
    expect(parseUrl('redis://a.com:6379/')!.defaultPort).toBeNull();
  });
  it('用户名密码', () => {
    const p = parseUrl('ftp://user:pass@ftp.example.com/dir')!;
    expect(p.username).toBe('user');
    expect(p.password).toBe('pass');
    const sec = urlSections(p);
    expect(sec.find((s) => s.label.startsWith('认证'))!.value).toContain('user');
    expect(sec.find((s) => s.label.startsWith('认证'))!.value).not.toContain('pass');
  });
});

describe('parseUrl query 处理', () => {
  it('百分号解码与 + 号', () => {
    const p = parseUrl('https://a.com/?q=%E4%B8%AD%E6%96%87&space=a+b')!;
    expect(p.params[0]).toEqual({ key: 'q', value: '中文', wasEncoded: true });
    expect(p.params[1]).toEqual({ key: 'space', value: 'a b', wasEncoded: true });
  });
  it('重复键保留', () => {
    const p = parseUrl('https://a.com/?tag=js&tag=ts')!;
    expect(p.params).toHaveLength(2);
    expect(p.params.map((x) => x.value)).toEqual(['js', 'ts']);
  });
  it('非法编码不崩溃', () => {
    const p = parseUrl('https://a.com/?bad=%E4%B8')!;
    expect(p.params[0].key).toBe('bad');
  });
});

describe('parseUrl 主机识别', () => {
  it('localhost / 127.0.0.1 / ::1', () => {
    expect(parseUrl('http://localhost:3000/')!.isLocalhost).toBe(true);
    expect(parseUrl('http://127.0.0.1/')!.isLocalhost).toBe(true);
    expect(parseUrl('http://[::1]:8080/')!.isLocalhost).toBe(true);
    expect(parseUrl('http://[::1]:8080/')!.isIPv6).toBe(true);
  });
  it('IPv4 与内网地址', () => {
    const p = parseUrl('https://192.168.1.1/admin')!;
    expect(p.isIPv4).toBe(true);
    expect(p.isPrivateIPv4).toBe(true);
    expect(parseUrl('https://8.8.8.8/')!.isPrivateIPv4).toBe(false);
    expect(parseUrl('https://10.0.0.1/')!.isPrivateIPv4).toBe(true);
    expect(parseUrl('https://172.16.5.4/')!.isPrivateIPv4).toBe(true);
    expect(parseUrl('https://172.32.5.4/')!.isPrivateIPv4).toBe(false);
    expect(parseUrl('https://169.254.1.1/')!.isPrivateIPv4).toBe(true);
    // 段值越界（999）整体不是合法 URL，返回 null；1.2.3 会被 WHATWG 展开为 1.2.0.3（IPv4 简写）；五段数字是普通域名
    expect(parseUrl('https://999.1.1.1/')).toBeNull();
    expect(parseUrl('https://1.2.3/')!.isIPv4).toBe(true);
    expect(parseUrl('https://1.2.3/')!.hostname).toBe('1.2.0.3');
    expect(parseUrl('https://abc.def/')!.isIPv4).toBe(false);
  });
  it('非常见协议标记', () => {
    expect(parseUrl('mailto:a@b.com')!.knownProtocol).toBe(true);
    expect(parseUrl('foo://bar/')!.knownProtocol).toBe(false);
  });
});

describe('parseUrl 异常与边界', () => {
  it('空与非法输入返回 null', () => {
    expect(parseUrl('')).toBeNull();
    expect(parseUrl('   ')).toBeNull();
    expect(parseUrl('http://')).toBeNull();
    expect(parseUrl('https://空间 站')).toBeNull();
  });
  it('urlSections 含端口默认提示与标签', () => {
    const p = parseUrl('https://example.com:443/x?a=1#h')!;
    const sec = urlSections(p);
    // WHATWG URL 会抹掉显式默认端口，Port 行展示默认值并注明已省略
    expect(sec.find((s) => s.label === '端口 Port')!.note).toBe('默认端口，URL 中已省略');
    const tags = sec.find((s) => s.label === '识别标签');
    expect(tags!.value).toContain('HTTPS 加密');
    expect(sec.find((s) => s.label === '主机 Host')!.value).toBe('example.com');
  });
  it('data: 等无 origin 协议不崩', () => {
    const p = parseUrl('data:text/plain,hello')!;
    expect(p.protocol).toBe('data:');
    expect(p.pathname).toBe('text/plain,hello');
  });
});
