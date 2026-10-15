// 科学计算器：表达式求值（调度场算法 + 逆波兰求值）
// 支持：+ - * / % ^ 括号、一元负号、函数（sin/cos/tan/ln/log/sqrt/abs/exp…）、常量 PI/E

type Tok = { t: 'num' | 'name' | 'func' | 'op'; v: string };

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  rad: (x) => (x * Math.PI) / 180,
  deg: (x) => (x * 180) / Math.PI,
};

const CONSTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
  TAU: 2 * Math.PI,
};

export function evaluate(expr: string): number {
  const tokens = tokenize(expr);
  const rpn = toRPN(tokens);
  return evalRPN(rpn);
}

function tokenize(expr: string): Tok[] {
  const out: Tok[] = [];
  const s = expr.replace(/\s+/g, '');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === undefined) break;
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^\d+(\.\d+)?([eE][+-]?\d+)?/);
      if (!m) throw new Error('无法解析数字：' + s.slice(i, i + 6));
      out.push({ t: 'num', v: m[0] });
      i += m[0].length;
    } else if (/[a-zA-Z]/.test(c)) {
      const m = s.slice(i).match(/^[a-zA-Z]+/)!;
      const name = m[0];
      i += name.length;
      if (name in FUNCS) out.push({ t: 'func', v: name });
      else if (name in CONSTS) out.push({ t: 'name', v: name });
      else throw new Error('未知函数或常量：' + name);
    } else if ('+-*/%^(),'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else {
      throw new Error('非法字符：' + c);
    }
  }
  return out;
}

function toRPN(tokens: Tok[]): Tok[] {
  const out: Tok[] = [];
  const ops: Tok[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3, 'u-': 4 };
  const rightAssoc = new Set(['^', 'u-']);
  let prev: 'start' | 'num' | 'name' | 'rparen' | 'lparen' | 'op' | 'comma' | 'func' = 'start';
  for (const tk of tokens) {
    if (tk.t === 'num') {
      out.push(tk);
      prev = 'num';
    } else if (tk.t === 'name') {
      out.push(tk);
      prev = 'name';
    } else if (tk.t === 'func') {
      ops.push(tk);
      prev = 'func';
    } else if (tk.t === 'op') {
      const v = tk.v;
      if (v === '(') {
        ops.push(tk);
        prev = 'lparen';
      } else if (v === ')') {
        while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop()!);
        if (!ops.length) throw new Error('括号不匹配');
        ops.pop();
        if (ops.length && ops[ops.length - 1].t === 'func') out.push(ops.pop()!);
        prev = 'rparen';
      } else if (v === ',') {
        while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop()!);
        prev = 'comma';
      } else {
        let opv = v;
        if (v === '-' && (prev === 'start' || prev === 'lparen' || prev === 'comma' || prev === 'op')) {
          opv = 'u-';
        }
        const p = prec[opv];
        while (ops.length) {
          const top = ops[ops.length - 1];
          if (top.v === '(') break;
          const tp = prec[top.v] ?? 0;
          if ((!rightAssoc.has(opv) && tp >= p) || (rightAssoc.has(opv) && tp > p)) out.push(ops.pop()!);
          else break;
        }
        ops.push({ t: 'op', v: opv });
        prev = 'op';
      }
    }
  }
  while (ops.length) {
    const top = ops.pop()!;
    if (top.v === '(') throw new Error('括号不匹配');
    out.push(top);
  }
  return out;
}

function evalRPN(rpn: Tok[]): number {
  const st: number[] = [];
  for (const tk of rpn) {
    if (tk.t === 'num') st.push(parseFloat(tk.v));
    else if (tk.t === 'name') st.push(CONSTS[tk.v]);
    else if (tk.t === 'func') {
      if (st.length < 1) throw new Error('函数 ' + tk.v + ' 缺少参数');
      st.push(FUNCS[tk.v](st.pop()!));
    } else if (tk.t === 'op') {
      if (tk.v === 'u-') {
        if (st.length < 1) throw new Error('表达式不完整');
        st.push(-st.pop()!);
        continue;
      }
      if (st.length < 2) throw new Error('表达式不完整');
      const b = st.pop()!;
      const a = st.pop()!;
      switch (tk.v) {
        case '+':
          st.push(a + b);
          break;
        case '-':
          st.push(a - b);
          break;
        case '*':
          st.push(a * b);
          break;
        case '/':
          if (b === 0) throw new Error('除数不能为 0');
          st.push(a / b);
          break;
        case '%':
          if (b === 0) throw new Error('除数不能为 0');
          st.push(a % b);
          break;
        case '^':
          st.push(Math.pow(a, b));
          break;
        default:
          throw new Error('未知运算符：' + tk.v);
      }
    }
  }
  if (st.length !== 1) throw new Error('表达式不完整');
  return st[0];
}
