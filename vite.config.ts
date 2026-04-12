import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'SEGURIDAD TABSAR',
          short_name: 'SEGURIDAD TABSAR',
          description: 'Sistema integral de gestión de rondas de vigilancia y seguridad',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          orientation: 'portrait',
          categories: ['productivity', 'security'],
          icons: [
            {
              src: 'https://api.dicebear.com/7.x/shapes/svg?seed=Tabs&backgroundColor=0a0a0a&shape1Color=8b5cf6&shape2Color=c084fc',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'https://api.dicebear.com/7.x/shapes/svg?seed=Tabs&backgroundColor=0a0a0a&shape1Color=8b5cf6&shape2Color=c084fc',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'https://api.dicebear.com/7.x/shapes/svg?seed=Tabs&backgroundColor=0a0a0a&shape1Color=8b5cf6&shape2Color=c084fc',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('html5-qrcode') || id.includes('leaflet')) {
                return 'vendor-heavy';
              }
              if (id.includes('react') || id.includes('lucide')) {
                return 'vendor-core';
              }
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
