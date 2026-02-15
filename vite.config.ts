import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // In production (CI/CD), use process.env (from GitHub Secrets)
    // In development, load from .env files
    // GitHub Actions sets GITHUB_ACTIONS=true, CI=true, and NODE_ENV=production
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const env = mode === 'production' && isCI
      ? process.env
      : loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Firebase environment variables for build-time replacement
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
        'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(env.VITE_FIREBASE_DATABASE_URL),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            feedback: path.resolve(__dirname, 'src/feedback-tool/index.tsx')
          },
          output: {
            entryFileNames: assetInfo => {
              return assetInfo.name === 'feedback' ? 'feedback.js' : 'assets/[name]-[hash].js'
            },
            chunkFileNames: `assets/[name]-[hash].js`,
            assetFileNames: (assetInfo) => {
              if (assetInfo.name && (assetInfo.name === 'feedback.css' || assetInfo.name === 'index.css')) {
                 return 'feedback.css'; 
              }
              return `assets/[name]-[hash].[ext]`;
            }
          }
        }
      }
    };
});
