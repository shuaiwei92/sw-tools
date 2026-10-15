// 几何计算器：常见平面图形 / 立体的面积、周长、体积

export type GeoShape =
  | 'circle'
  | 'rectangle'
  | 'square'
  | 'triangle'
  | 'rightTriangle'
  | 'trapezoid'
  | 'ellipse'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'cube'
  | 'cuboid'
  | 'pyramid'
  | 'torus';

export interface GeoRow {
  k: string;
  v: string;
}
export interface GeoResult {
  title: string;
  rows: GeoRow[];
}

const f = (n: number): string =>
  isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—';

export function geometrySolve(shape: GeoShape, d: Record<string, number>): GeoResult {
  switch (shape) {
    case 'circle': {
      const r = d.r;
      return {
        title: '圆',
        rows: [
          { k: '半径 r', v: f(r) },
          { k: '直径 d = 2r', v: f(2 * r) },
          { k: '面积 A = πr²', v: f(Math.PI * r * r) },
          { k: '周长 C = 2πr', v: f(2 * Math.PI * r) },
        ],
      };
    }
    case 'rectangle': {
      const w = d.w;
      const h = d.h;
      return {
        title: '矩形',
        rows: [
          { k: '面积 A = w·h', v: f(w * h) },
          { k: '周长 P = 2(w+h)', v: f(2 * (w + h)) },
          { k: '对角线', v: f(Math.hypot(w, h)) },
        ],
      };
    }
    case 'square': {
      const a = d.a;
      return {
        title: '正方形',
        rows: [
          { k: '面积 A = a²', v: f(a * a) },
          { k: '周长 P = 4a', v: f(4 * a) },
          { k: '对角线 = a√2', v: f(a * Math.SQRT2) },
        ],
      };
    }
    case 'triangle': {
      const a = d.a;
      const b = d.b;
      const c = d.c;
      const p = (a + b + c) / 2;
      const area = Math.sqrt(Math.max(0, p * (p - a) * (p - b) * (p - c)));
      return {
        title: '三角形（三边）',
        rows: [
          { k: '周长 P = a+b+c', v: f(a + b + c) },
          { k: '面积 A（海伦公式）', v: f(area) },
        ],
      };
    }
    case 'rightTriangle': {
      const a = d.a;
      const b = d.b;
      const hyp = Math.hypot(a, b);
      return {
        title: '直角三角形',
        rows: [
          { k: '直角边 a', v: f(a) },
          { k: '直角边 b', v: f(b) },
          { k: '斜边 c', v: f(hyp) },
          { k: '面积 A = ½ab', v: f(0.5 * a * b) },
          { k: '周长', v: f(a + b + hyp) },
        ],
      };
    }
    case 'trapezoid': {
      const a = d.a;
      const b = d.b;
      const h = d.h;
      return {
        title: '梯形',
        rows: [
          { k: '面积 A = (a+b)h/2', v: f(((a + b) * h) / 2) },
          { k: '中位线 = (a+b)/2', v: f((a + b) / 2) },
        ],
      };
    }
    case 'ellipse': {
      const a = d.a;
      const b = d.b;
      const area = Math.PI * a * b;
      const h = Math.pow((a - b) / (a + b), 2);
      const circ = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
      return {
        title: '椭圆',
        rows: [
          { k: '面积 A = πab', v: f(area) },
          { k: '周长 C（近似）', v: f(circ) },
        ],
      };
    }
    case 'sphere': {
      const r = d.r;
      return {
        title: '球',
        rows: [
          { k: '表面积 S = 4πr²', v: f(4 * Math.PI * r * r) },
          { k: '体积 V = 4/3πr³', v: f((4 / 3) * Math.PI * r ** 3) },
        ],
      };
    }
    case 'cylinder': {
      const r = d.r;
      const h = d.h;
      const lateral = 2 * Math.PI * r * h;
      const base = Math.PI * r * r;
      return {
        title: '圆柱',
        rows: [
          { k: '底面积', v: f(base) },
          { k: '侧面积', v: f(lateral) },
          { k: '表面积 S = 2πr(h+r)', v: f(2 * Math.PI * r * (h + r)) },
          { k: '体积 V = πr²h', v: f(base * h) },
        ],
      };
    }
    case 'cone': {
      const r = d.r;
      const h = d.h;
      const l = Math.sqrt(r * r + h * h);
      return {
        title: '圆锥',
        rows: [
          { k: '母线长 l', v: f(l) },
          { k: '底面积', v: f(Math.PI * r * r) },
          { k: '侧面积', v: f(Math.PI * r * l) },
          { k: '表面积 S = πr(l+r)', v: f(Math.PI * r * (l + r)) },
          { k: '体积 V = ⅓πr²h', v: f((1 / 3) * Math.PI * r * r * h) },
        ],
      };
    }
    case 'cube': {
      const a = d.a;
      return {
        title: '正方体',
        rows: [
          { k: '表面积 S = 6a²', v: f(6 * a * a) },
          { k: '体积 V = a³', v: f(a ** 3) },
          { k: '体对角线 = a√3', v: f(a * Math.sqrt(3)) },
        ],
      };
    }
    case 'cuboid': {
      const l = d.l;
      const w = d.w;
      const h = d.h;
      return {
        title: '长方体',
        rows: [
          { k: '表面积 S = 2(lw+lh+wh)', v: f(2 * (l * w + l * h + w * h)) },
          { k: '体积 V = lwh', v: f(l * w * h) },
          { k: '体对角线', v: f(Math.hypot(l, w, h)) },
        ],
      };
    }
    case 'pyramid': {
      const a = d.a;
      const h = d.h;
      const slant = Math.sqrt((a / 2) ** 2 + h * h);
      const base = a * a;
      const lateral = 2 * a * slant;
      return {
        title: '正四棱锥',
        rows: [
          { k: '底面积', v: f(base) },
          { k: '侧面积', v: f(lateral) },
          { k: '表面积 S = a² + 2a·l', v: f(base + lateral) },
          { k: '体积 V = ⅓a²h', v: f((1 / 3) * base * h) },
        ],
      };
    }
    case 'torus': {
      const R = d.R;
      const r = d.r;
      return {
        title: '圆环（环面）',
        rows: [
          { k: '表面积 S = 4π²Rr', v: f(4 * Math.PI * Math.PI * R * r) },
          { k: '体积 V = 2π²Rr²', v: f(2 * Math.PI * Math.PI * R * r * r) },
        ],
      };
    }
  }
}
