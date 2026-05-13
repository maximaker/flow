import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  // Use unusual ports so Flow doesn't collide with other local Vite projects
  // (e.g. the user's Max Landing Page 13 also runs at 5173 by default).
  // strictPort: true makes the server fail loudly if the port is taken, instead
  // of silently picking a different one and confusing where the app lives.
  server: { port: 5371, strictPort: true, host: '127.0.0.1' },
  preview: { port: 4371, strictPort: true, host: '127.0.0.1' },

  build: {
    // Split vendor libraries (change rarely) from app code (changes often).
    // This way users only re-download the app chunk on each deploy.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['pocketbase', 'pinia', 'vue'],
        },
      },
    },
    // Warn if any chunk exceeds 400 KB before gzip.
    chunkSizeWarningLimit: 400,
  },

  // esbuild options apply to both dev and prod transforms.
  // We strip noisy log/debug calls in prod but keep console.warn / console.error
  // so the unhandled-rejection logger in App.vu