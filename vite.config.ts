import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Actions では GITHUB_REPOSITORY = "owner/repo-name" が自動セットされる
// それ以外（ローカル）はルート '/' を使う
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repoName ? `/${repoName}/` : '/';

export default defineConfig({
  base,
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    strictPort: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ポケモンライフログ',
        short_name: 'PokeLog',
        description: '日々の活動でポケモンを育てる',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // API・スプライト等の外部リクエストはキャッシュしない
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^https?:\/\//],
      },
    }),
  ],
});
