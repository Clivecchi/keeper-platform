import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// Simple plugin to display dev server URL
const devServerUrlPlugin = () => {
  return {
    name: 'dev-server-url',
    configureServer(server: any) {
      // Display URL when server is ready
      setTimeout(() => {
        const protocol = server.config.server.https ? 'https' : 'http';
        const host = server.config.server.host || 'localhost';
        const port = server.config.server.port || 5173;
        const url = `${protocol}://${host}:${port}`;
        
        console.log('\n🚀 Keeper Platform Dev Server');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📍 Local:   ${url}`);
        console.log(`📍 Network: ${url.replace('localhost', '0.0.0.0')}`);
        console.log('═══════════════════════════════════════════════════════════════\n');
      }, 1000);
    },
  };
};

const buildTime = process.env.VITE_BUILD_TIME ?? new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    devServerUrlPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'icons/keeper-app-icon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Keeper',
        short_name: 'Keeper',
        description: 'A calm place to keep what matters — moments, journeys, and memory.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#241f1c',
        background_color: '#f7f4ef',
        categories: ['productivity', 'lifestyle'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'keeper-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  publicDir: '../../public',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
}); 