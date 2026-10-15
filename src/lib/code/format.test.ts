import { describe, it, expect } from 'vitest';
import { formatCode, minifyCode, codeStats, minifyJs, minifyCss, minifyHtml } from './format';

describe('formatCode 美化', () => {
  it('JS：分号补空格与换行', () => {
    const out = formatCode('function f(a,b){return a+b}', 'js');
    expect(out).toContain('function f(a, b) {');
    expect(out).toContain('return a + b');
  });
  it('CSS：规则换行与声明缩进', () => {
    const out = formatCode('a{color:red;background:blue}', 'css', 2);
    expect(out).toBe('a {\n  color: red;\n  background: blue\n}');
  });
  it('HTML：标签缩进', () => {
    const out = formatCode('<div><p>hi</p></div>', 'html', 2);
    expect(out).toBe('<div>\n  <p>hi</p>\n</div>');
  });
  it('缩进宽度可调', () => {
    const out = formatCode('a{color:red}', 'css', 4);
    expect(out).toContain('    color: red');
  });
  it("Tab 缩进（传 '\\t'）", () => {
    const out = formatCode('a{color:red}', 'css', '\t');
    expect(out).toBe('a {\n\tcolor: red\n}');
  });
  it('空输入返回空', () => {
    expect(formatCode('   ', 'js')).toBe('');
  });
});

describe('minifyJs', () => {
  it('去注释与多余空白，保留字符串内容', () => {
    const src = `// 注释\nconst s = 'a // b  c'; /* 块注释 */ function  f ( ) { return  s ; }`;
    const out = minifyJs(src);
    expect(out).toBe("const s = 'a // b  c'; function f(){return s;}");
  });
  it('模板字符串与正则不被破坏', () => {
    expect(minifyJs('const t = `a  b` // c')).toBe('const t = `a  b`');
    expect(minifyJs('const r = /a\\/b/ ; // x')).toBe('const r = /a\\/b/;');
    expect(minifyJs('const x = a / b / c ;')).toBe('const x = a / b / c;');
    // 字符类内的 / 不结束正则
    expect(minifyJs('const r = /[/]+/g ;')).toBe('const r = /[/]+/g;');
  });
  it('保留 ASI 换行', () => {
    const out = minifyJs('const a = 1\nconst b = 2');
    expect(out).toBe('const a = 1\nconst b = 2');
  });
  it('压缩率明显（真实片段）', () => {
    const src = `// 工具函数\nfunction  calc ( a , b ) {\n  // 两数相加\n  return  a  +  b ;\n}\n\nconst  x  =  calc ( 1 ,  2 ) ;`;
    const out = minifyJs(src);
    expect(out).toBe('function calc(a, b){\nreturn a + b;\n}\nconst x = calc(1, 2);');
    expect(out.length).toBeLessThan(src.length * 0.7);
  });
});

describe('minifyCss', () => {
  it('去注释与多余空白，保留字符串', () => {
    expect(minifyCss('/* c */ a { color : red ; }')).toBe('a{color:red}');
    expect(minifyCss('a::after { content : "b ; c" ; }')).toBe('a::after{content:"b ; c"}');
  });
  it('选择器组合符两侧保留单空格（calc 等值内 +/- 也必须留空格）', () => {
    expect(minifyCss('a  >  b { color: red }')).toBe('a > b{color:red}');
    expect(minifyCss('a + b { width: calc(1px + 2px) }')).toBe('a + b{width:calc(1px + 2px)}');
  });
});

describe('minifyHtml', () => {
  it('去注释（保留条件注释）与标签间空白', () => {
    expect(minifyHtml('<div>\n  <!-- x -->\n  <p>hi</p>\n</div>')).toBe('<div><p>hi</p></div>');
    expect(minifyHtml('<!--[if IE]><p>x</p><![endif]-->')).toBe('<!--[if IE]><p>x</p><![endif]-->');
  });
  it('pre/textarea 内容原样', () => {
    expect(minifyHtml('<pre>  a\n  b  </pre>')).toBe('<pre>  a\n  b  </pre>');
    expect(minifyHtml('<textarea> a  b </textarea>')).toBe('<textarea> a  b </textarea>');
  });
  it('属性间空白收敛', () => {
    expect(minifyHtml('<a   href="x"   class="y">t</a>')).toBe('<a href="x" class="y">t</a>');
  });
});

describe('codeStats', () => {
  it('行数/字符/字节', () => {
    const s = codeStats('a\nb');
    expect(s.lines).toBe(2);
    expect(s.chars).toBe(3);
    expect(s.bytes).toBe(3);
    expect(codeStats('中').bytes).toBe(3); // UTF-8 3 字节
    expect(codeStats('').lines).toBe(0);
  });
});
