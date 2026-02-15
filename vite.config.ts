import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Debug logging
    console.log('[Vite Config] mode:', mode);
    console.log('[Vite Config] process.env.CI:', process.env.CI);
    console.log('[Vite Config] process.env.GITHUB_ACTIONS:', process.env.GITHUB_ACTIONS);
    console.log('[Vite Config] process.env.NODE_ENV:', process.env.NODE_ENV);

    // In CI/CD, environment variables are already in process.env from GitHub Secrets
    // We need to explicitly pass them to Vite's define to embed them in the build
    const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS);

    console.log('[Vite Config] isCI:', isCI);
    console.log('[Vite Config] VITE_FIREBASE_PROJECT_ID from process.env:', process.env.VITE_FIREBASE_PROJECT_ID);

    return {
      envPrefix: 'VITE_',
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
      define: isCI ? {
        // Explicitly inject GitHub Secrets into the build
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
        'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(process.env.VITE_FIREBASE_DATABASE_URL),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
      } : {},
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
