import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { musicLinkEditor } from './scripts/vite-music-links';

export default defineConfig({
  plugins: [vue(),musicLinkEditor()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
