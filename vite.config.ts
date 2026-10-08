import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { musicLinkEditor } from './scripts/vite-music-links';
import { playbackService } from './scripts/playback-service';

export default defineConfig({
  plugins: [vue(),musicLinkEditor(),playbackService()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
