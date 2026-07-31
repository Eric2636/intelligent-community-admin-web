import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { normalizeAppBase } from './src/config/app-base';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: normalizeAppBase(env.VITE_APP_BASE),
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
