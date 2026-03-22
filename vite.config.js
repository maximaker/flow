import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

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

  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.js'],
    reporters: ['verbose'],
  },
})
