import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}); 