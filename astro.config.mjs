import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// 静态输出：产物为 dist/，可直接部署到任意静态主机（Cloudflare Pages / Netlify / Vercel / GitHub Pages 等）。
// 若未来需要 SSR / 边缘渲染 / 绑定 KV·D1，再启用 @astrojs/cloudflare adapter 即可，业务代码无需改动。
export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
