// 图片去水印：纯前端、零依赖的本地修复（谐波插值 / Laplace 修补）。
// 用户涂抹水印区域（mask），算法对 mask 像素用其邻域已知像素的迭代均值填充，
// 在相对均匀背景上可获得自然的内容感知修复效果。全部在浏览器本地完成，不上传任何服务器。

/**
 * 谐波插值修补（Jacobi 迭代求解 Laplace 方程，Dirichlet 边界）。
 * @param imgData 原始像素（不会被修改）
 * @param mask    长度 = w*h，1 表示需要修补的像素，0 表示保留
 * @param iterations 迭代次数（越多越平滑，默认 40）
 */
export function inpaint(imgData: ImageData, mask: Uint8Array, iterations = 40): ImageData {
  const w = imgData.width;
  const h = imgData.height;
  const src = imgData.data;
  const n = w * h;

  // 计算 mask 包围盒，仅在该区域迭代以提速
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    return new ImageData(new Uint8ClampedArray(src), w, h);
  }

  let cur = new Float32Array(n * 4);
  let nxt = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) {
    cur[i] = src[i];
    nxt[i] = src[i];
  }

  const NB = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const iters = Math.max(1, Math.min(iterations, 200));

  for (let it = 0; it < iters; it++) {
    // mask 像素 = 四邻域当前值均值
    for (let y = minY; y <= maxY; y++) {
      const row = y * w;
      for (let x = minX; x <= maxX; x++) {
        const idx = row + x;
        if (!mask[idx]) continue;
        let r = 0, g = 0, b = 0, a = 0, cnt = 0;
        for (let k = 0; k < 4; k++) {
          const nx = x + NB[k][0];
          const ny = y + NB[k][1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = (ny * w + nx) * 4;
          r += cur[ni];
          g += cur[ni + 1];
          b += cur[ni + 2];
          a += cur[ni + 3];
          cnt++;
        }
        const o = idx * 4;
        nxt[o] = r / cnt;
        nxt[o + 1] = g / cnt;
        nxt[o + 2] = b / cnt;
        nxt[o + 3] = a / cnt;
      }
    }
    // 已知像素保持不变
    for (let y = minY; y <= maxY; y++) {
      const row = y * w;
      for (let x = minX; x <= maxX; x++) {
        const idx = row + x;
        if (!mask[idx]) {
          const o = idx * 4;
          nxt[o] = cur[o];
          nxt[o + 1] = cur[o + 1];
          nxt[o + 2] = cur[o + 2];
          nxt[o + 3] = cur[o + 3];
        }
      }
    }
    const tmp = cur;
    cur = nxt;
    nxt = tmp;
  }

  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n * 4; i++) out[i] = cur[i];
  return new ImageData(out, w, h);
}
