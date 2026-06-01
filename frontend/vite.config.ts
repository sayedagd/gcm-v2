import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8085';

  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api/events': {
          target: proxyTarget,
          changeOrigin: true,
          // SSE requires no buffering and HTTP/1.1 keep-alive
          headers: { 'Connection': 'keep-alive' },
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/auth': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/system': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        }
      }
    },
    plugins: [react()],
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
          '.ts': 'tsx',
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    },
    build: {
      target: 'es2020',
      sourcemap: false, // [SECURITY] Disable source maps in production to hide source code
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion':  ['framer-motion'],
            'vendor-charts':  ['recharts'],
            'vendor-maps':    ['leaflet', 'react-leaflet'],
            'vendor-ui':      ['@mantine/core', '@mantine/hooks'],
          }
        }
      }
    }
  };
});
